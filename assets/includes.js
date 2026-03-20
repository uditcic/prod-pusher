(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var versionPromise = fetch('/api/health')
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.version || ''; })
      .catch(function () { return ''; });

    var nodes = document.querySelectorAll('[data-include]');
    nodes.forEach(function (el) {
      var raw = el.getAttribute('data-include');
      if (!raw) return;

      var tryList = [];
      if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) {
        tryList.push(raw);
      } else {
        tryList.push(raw);
        tryList.push('/' + raw.replace(/^\.?\//, ''));
      }

      function inject(html) {
        el.insertAdjacentHTML('afterend', html);
        el.remove();
        versionPromise.then(function (ver) { fillFooterData(ver); });
      }

      function attempt(i) {
        if (i >= tryList.length) {
          versionPromise.then(function (ver) {
            var now = new Date();
            var y = now.getFullYear();
            var fallback = '<footer style="opacity:.6">'
              + (ver ? 'v' + ver + ' - ' : '')
              + 'Prod Pusher Tool | &copy; ' + y + ' Web Operations</footer>';
            el.insertAdjacentHTML('afterend', fallback);
            el.remove();
          });
          return;
        }
        var u = tryList[i] + (tryList[i].includes('?') ? '&' : '?') + 'v=' + Date.now();

        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = setTimeout(function () {
          if (ctrl) ctrl.abort();
          attempt(i + 1);
        }, 8000);

        fetch(u, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
          .then(function (html) { clearTimeout(timer); inject(html); })
          .catch(function () { clearTimeout(timer); attempt(i + 1); });
      }

      attempt(0);
    });

    function fillFooterData(ver) {
      var now = new Date();
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();

      document.querySelectorAll('.pp-year').forEach(function (el) {
        el.textContent = now.getFullYear();
      });
      document.querySelectorAll('.pp-date').forEach(function (el) {
        el.textContent = dateStr;
      });
      document.querySelectorAll('footer').forEach(function (f) {
        if (ver) {
          f.innerHTML = f.innerHTML.replace('{{VERSION}}', ver);
        } else {
          f.innerHTML = f.innerHTML.replace('v{{VERSION}} - ', '');
        }
      });
    }
  });
})();
