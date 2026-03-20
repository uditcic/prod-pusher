(function () {
  'use strict';

  var currentPage = 1;
  var pageSize    = 20;
  var expandedIds = {};

  var lastSessions = [];

  document.addEventListener('DOMContentLoaded', function () {
    var now   = new Date();
    var from  = new Date(now.getTime() - 30 * 86400000);
    var fromEl = document.getElementById('histFrom');
    var toEl   = document.getElementById('histTo');
    fromEl.value = isoDate(from);
    toEl.value   = isoDate(now);

    document.getElementById('histSearch').addEventListener('click', function () {
      currentPage = 1;
      expandedIds = {};
      loadHistory();
    });

    document.getElementById('histPrev').addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; loadHistory(); }
    });

    document.getElementById('histNext').addEventListener('click', function () {
      currentPage++;
      loadHistory();
    });

    var csvBtn = document.getElementById('histExportCsv');
    if (csvBtn) {
      csvBtn.addEventListener('click', function () { exportCsv(); });
    }

    loadHistory();
  });

  function loadHistory() {
    var fromEl = document.getElementById('histFrom');
    var toEl   = document.getElementById('histTo');
    var envEl  = document.getElementById('histEnv');

    var params = new URLSearchParams({
      page:  currentPage,
      limit: pageSize,
      from:  fromEl.value,
      to:    toEl.value,
    });
    if (envEl.value) params.set('env', envEl.value);

    fetch('/api/logs/history?' + params.toString())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        lastSessions = data.sessions || [];
        renderTable(lastSessions);
        renderPager(data);
        var csvBtn = document.getElementById('histExportCsv');
        if (csvBtn) csvBtn.style.display = lastSessions.length ? 'inline-block' : 'none';
      })
      .catch(function (err) {
        console.error('History fetch error', err);
        document.getElementById('histBody').innerHTML =
          '<tr><td colspan="7" style="text-align:center;color:#f87171">Failed to load history.</td></tr>';
      });
  }

  function loadDetail(sessionId, detailCell) {
    detailCell.innerHTML = '<div class="hist-detail" style="color:#64748b">Loading…</div>';

    fetch('/api/logs/history/' + encodeURIComponent(sessionId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.session) { detailCell.innerHTML = '<div class="hist-detail">Session not found.</div>'; return; }
        renderDetail(data.session, detailCell);
      })
      .catch(function () {
        detailCell.innerHTML = '<div class="hist-detail" style="color:#f87171">Failed to load detail.</div>';
      });
  }

  function renderTable(sessions) {
    var tbody  = document.getElementById('histBody');
    var empty  = document.getElementById('histEmpty');
    tbody.innerHTML = '';

    if (!sessions.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    sessions.forEach(function (s) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><button class="hist-expand" data-id="' + esc(s.id) + '" title="Expand details">▶</button></td>' +
        '<td>' + formatTs(s.ts) + '</td>' +
        '<td>' + esc(s.username || '—') + '</td>' +
        '<td><span class="' + envClass(s.env) + '">' + esc(s.env) + '</span>' +
            (s.dryRun ? ' <span class="hist-badge badge-dryrun">dry</span>' : '') +
            (s.force ? ' <span style="color:#fbbf24;font-size:11px">⚡forced</span>' : '') +
        '</td>' +
        '<td>' + s.fileCount + '</td>' +
        '<td>' + outcomeBadge(s.outcome) + '</td>' +
        '<td>' + s.totalOk + ' / ' + s.totalErr + '</td>';
      tbody.appendChild(tr);

      var detailTr = document.createElement('tr');
      detailTr.className = 'hist-detail-row';
      detailTr.style.display = 'none';
      detailTr.id = 'detail-' + s.id;
      var td = document.createElement('td');
      td.colSpan = 7;
      detailTr.appendChild(td);
      tbody.appendChild(detailTr);

      tr.querySelector('.hist-expand').addEventListener('click', function () {
        var btn = this;
        var id  = btn.getAttribute('data-id');
        var dr  = document.getElementById('detail-' + id);
        if (!dr) return;

        if (dr.style.display === 'none') {
          dr.style.display = '';
          btn.textContent = '▼';
          expandedIds[id] = true;
          loadDetail(id, dr.querySelector('td'));
        } else {
          dr.style.display = 'none';
          btn.textContent = '▶';
          delete expandedIds[id];
        }
      });
    });
  }

  function renderDetail(session, cell) {
    var events = session.events || [];
    var html = '<div class="hist-detail">';

    if (!events.length) {
      html += '<em style="color:#64748b">No events recorded for this session.</em>';
    } else {
      events.forEach(function (evt) {
        var ts = '';
        try { ts = new Date(evt.ts).toLocaleTimeString('en-GB', { hour12: false }); } catch(e) {}

        var label = evt.event || '';
        var skip  = { ts: 1, event: 1, password: 1 };
        var parts = [];
        for (var k in evt) {
          if (skip[k]) continue;
          var v = evt[k];
          if (typeof v === 'object') v = JSON.stringify(v);
          if (String(v).length > 100) v = String(v).slice(0, 97) + '…';
          parts.push(k + '=' + v);
        }

        html += '<div class="evt-row">' +
          '<span class="evt-ts">' + esc(ts) + '</span>' +
          '<span class="evt-name">' + esc(label) + '</span>' +
          '<span class="evt-data">' + esc(parts.join('  ')) + '</span>' +
        '</div>';
      });
    }

    html += '</div>';
    cell.innerHTML = html;
  }

  function renderPager(data) {
    var pager = document.getElementById('histPager');
    var info  = document.getElementById('histPageInfo');
    var prev  = document.getElementById('histPrev');
    var next  = document.getElementById('histNext');

    if (!data.total) { pager.style.display = 'none'; return; }

    var totalPages = Math.ceil(data.total / data.limit);
    pager.style.display = 'flex';
    info.textContent = 'Page ' + data.page + ' of ' + totalPages + '  (' + data.total + ' sessions)';
    prev.disabled = data.page <= 1;
    next.disabled = !data.hasMore;
  }

  function exportCsv() {
    if (!lastSessions.length) return;

    var header = ['Date/Time', 'User', 'Environment', 'Files', 'Outcome', 'OK', 'Errors', 'Dry Run', 'Forced'];
    var rows = lastSessions.map(function (s) {
      return [
        formatTs(s.ts),
        s.username || '',
        s.env,
        s.fileCount,
        s.outcome,
        s.totalOk,
        s.totalErr,
        s.dryRun ? 'Yes' : '',
        s.force ? 'Yes' : '',
      ].map(csvCell).join(',');
    });

    var csv = header.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'publish-history-' + isoDate(new Date()) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (window.ppToast) ppToast('CSV exported (' + lastSessions.length + ' sessions)', 'success');
  }

  function csvCell(val) {
    var s = String(val == null ? '' : val);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatTs(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-CA') + ' ' +
             d.toLocaleTimeString('en-GB', { hour12: false });
    } catch(e) { return iso; }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function envClass(env) {
    return env === 'external' ? 'env-ext' : 'env-int';
  }

  function outcomeBadge(outcome) {
    var cls = {
      success:    'badge-success',
      partial:    'badge-partial',
      dryrun:     'badge-dryrun',
      crash:      'badge-crash',
      blocked:    'badge-blocked',
      missing:    'badge-missing',
      incomplete: 'badge-incomplete',
    };
    return '<span class="hist-badge ' + (cls[outcome] || 'badge-incomplete') + '">' +
           esc(outcome) + '</span>';
  }
})();
