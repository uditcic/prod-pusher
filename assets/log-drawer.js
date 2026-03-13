/**
 * log-drawer.js — Self-contained bottom-drawer log viewer for Prod-Pusher.
 * Connects to /api/logs/stream (SSE) and renders real-time log entries.
 * Include on any page via <script src="/assets/log-drawer.js"></script>
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    injectStyles();
    var drawer = buildDOM();
    document.body.appendChild(drawer);
    document.body.style.paddingBottom = '36px';

    var entriesEl = drawer.querySelector('.pp-drawer-entries');
    var countEl   = drawer.querySelector('.pp-drawer-count');
    var toggleBtn = drawer.querySelector('.pp-drawer-toggle');
    var clearBtn  = drawer.querySelector('.pp-drawer-clear');
    var statusDot = drawer.querySelector('.pp-drawer-status');

    var count = 0;
    var userScrolled = false;

    // Track whether user scrolled up manually
    entriesEl.addEventListener('scroll', function () {
      var atBottom = entriesEl.scrollHeight - entriesEl.scrollTop - entriesEl.clientHeight < 40;
      userScrolled = !atBottom;
    });

    // Toggle expand/collapse
    toggleBtn.addEventListener('click', function () {
      var collapsed = drawer.classList.toggle('pp-drawer--collapsed');
      drawer.classList.toggle('pp-drawer--expanded', !collapsed);
      toggleBtn.textContent = collapsed ? '\u25B2' : '\u25BC';
      document.body.style.paddingBottom = collapsed ? '36px' : '280px';
    });

    // Clear entries
    clearBtn.addEventListener('click', function () {
      entriesEl.innerHTML = '';
      count = 0;
      countEl.textContent = '';
    });

    // SSE connection
    var es = new EventSource('/api/logs/stream');

    es.onopen = function () {
      statusDot.classList.remove('pp-dot--off');
      statusDot.classList.add('pp-dot--on');
      statusDot.title = 'Connected';
    };

    es.onerror = function () {
      statusDot.classList.remove('pp-dot--on');
      statusDot.classList.add('pp-dot--off');
      statusDot.title = 'Reconnecting\u2026';
    };

    es.onmessage = function (ev) {
      var entry;
      try { entry = JSON.parse(ev.data); } catch { return; }

      // Auto-open on publish start
      if (/\.start$/.test(entry.event) && drawer.classList.contains('pp-drawer--collapsed')) {
        toggleBtn.click();
      }

      var row = document.createElement('div');
      row.className = 'pp-drawer-row';

      // Timestamp (HH:MM:SS)
      var ts = '';
      try { ts = new Date(entry.ts).toLocaleTimeString('en-GB', { hour12: false }); } catch { ts = ''; }

      // Badge: [EXT] or [INT]
      var badge = '';
      var badgeClass = 'pp-badge-default';
      if (/^external\b/i.test(entry.event)) { badge = 'EXT'; badgeClass = 'pp-badge-ext'; }
      else if (/^internal\b/i.test(entry.event)) { badge = 'INT'; badgeClass = 'pp-badge-int'; }

      // Event label — strip prefix and humanize
      var label = entry.event.replace(/^(external|internal)\./i, '').replace(/\./g, ' ');

      // Severity color class
      var sevClass = '';
      if (/done|end/i.test(entry.event)) sevClass = 'pp-sev-ok';
      else if (/error|crash/i.test(entry.event)) sevClass = 'pp-sev-err';
      else if (/lock/i.test(entry.event)) sevClass = 'pp-sev-warn';

      // Detail snippet — pick the most useful fields
      var detail = '';
      var skip = { ts: 1, event: 1, password: 1 };
      var parts = [];
      for (var k in entry) {
        if (skip[k]) continue;
        var v = entry[k];
        if (typeof v === 'object') v = JSON.stringify(v);
        if (String(v).length > 80) v = String(v).slice(0, 77) + '\u2026';
        parts.push(k + '=' + v);
      }
      if (parts.length) detail = parts.join('  ');

      row.innerHTML =
        '<span class="pp-ts">' + ts + '</span>' +
        (badge ? '<span class="pp-badge ' + badgeClass + '">' + badge + '</span>' : '') +
        '<span class="pp-label ' + sevClass + '">' + escHtml(label) + '</span>' +
        (detail ? '<span class="pp-detail">' + escHtml(detail) + '</span>' : '');

      entriesEl.appendChild(row);
      count++;
      countEl.textContent = '(' + count + ')';

      // Cap at 500 entries
      while (entriesEl.children.length > 500) entriesEl.removeChild(entriesEl.firstChild);

      // Auto-scroll if user hasn't scrolled up
      if (!userScrolled) entriesEl.scrollTop = entriesEl.scrollHeight;
    };
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildDOM() {
    var d = document.createElement('div');
    d.id = 'pp-log-drawer';
    d.className = 'pp-drawer--collapsed';
    d.innerHTML =
      '<div class="pp-drawer-header">' +
        '<span class="pp-drawer-status pp-dot--on" title="Connected"></span>' +
        '<span class="pp-drawer-title">Activity Log</span>' +
        '<span class="pp-drawer-count"></span>' +
        '<button class="pp-drawer-clear" title="Clear log">Clear</button>' +
        '<button class="pp-drawer-toggle" aria-label="Toggle log drawer">\u25B2</button>' +
      '</div>' +
      '<div class="pp-drawer-body">' +
        '<div class="pp-drawer-entries"></div>' +
      '</div>';
    return d;
  }

  function injectStyles() {
    var css = document.createElement('style');
    css.textContent = [
      '#pp-log-drawer { position:fixed; bottom:0; left:0; right:0; z-index:9999;',
      '  background:#0f172a; border-top:1px solid #1e293b;',
      '  font-family:"Consolas","Courier New",monospace; font-size:13px;',
      '  transition:height .25s ease; overflow:hidden; }',

      '#pp-log-drawer.pp-drawer--collapsed { height:36px; }',
      '#pp-log-drawer.pp-drawer--expanded  { height:280px; }',

      '.pp-drawer-header { display:flex; align-items:center; gap:8px;',
      '  height:36px; padding:0 12px; background:#1e293b; cursor:pointer;',
      '  user-select:none; }',

      '.pp-drawer-title { color:#38bdf8; font-weight:600; font-size:13px;',
      '  font-family:"Segoe UI",Tahoma,sans-serif; }',
      '.pp-drawer-count { color:#64748b; font-size:12px; font-family:"Segoe UI",sans-serif; }',

      '.pp-drawer-toggle,.pp-drawer-clear {',
      '  background:none; border:none; color:#94a3b8; cursor:pointer;',
      '  font-size:12px; font-family:"Segoe UI",sans-serif; padding:2px 6px; }',
      '.pp-drawer-toggle:hover,.pp-drawer-clear:hover { color:#e2e8f0; }',
      '.pp-drawer-clear { margin-left:auto; }',

      '.pp-drawer-status { width:8px; height:8px; border-radius:50%; flex-shrink:0; }',
      '.pp-dot--on  { background:#22c55e; }',
      '.pp-dot--off { background:#ef4444; }',

      '.pp-drawer-body { height:calc(100% - 36px); overflow-y:auto;',
      '  scrollbar-width:thin; scrollbar-color:#334155 #0f172a; }',
      '.pp-drawer-entries { padding:4px 0; }',

      '.pp-drawer-row { display:flex; align-items:baseline; gap:8px;',
      '  padding:3px 12px; border-bottom:1px solid #1a2332; }',
      '.pp-drawer-row:nth-child(odd) { background:#0f172a; }',
      '.pp-drawer-row:nth-child(even) { background:#131d2e; }',

      '.pp-ts { color:#475569; flex-shrink:0; }',

      '.pp-badge { font-size:10px; font-weight:700; padding:1px 5px;',
      '  border-radius:3px; flex-shrink:0; text-transform:uppercase; }',
      '.pp-badge-ext { background:#1e3a5f; color:#38bdf8; }',
      '.pp-badge-int { background:#3b1f63; color:#c084fc; }',
      '.pp-badge-default { background:#1e293b; color:#94a3b8; }',

      '.pp-label { color:#e2e8f0; text-transform:capitalize; flex-shrink:0; }',
      '.pp-sev-ok   { color:#22c55e; }',
      '.pp-sev-err  { color:#ef4444; }',
      '.pp-sev-warn { color:#eab308; }',

      '.pp-detail { color:#64748b; overflow:hidden; text-overflow:ellipsis;',
      '  white-space:nowrap; min-width:0; }',
    ].join('\n');
    document.head.appendChild(css);
  }
})();
