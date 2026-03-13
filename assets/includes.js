(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var nodes = document.querySelectorAll('[data-include]');
    nodes.forEach(function (el) {
      var raw = el.getAttribute('data-include');
      if (!raw) return;

      // Build list of URLs to try (as-given, then absolute-from-root)
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
      }

      function attempt(i) {
        if (i >= tryList.length) {
          // All fetches failed — inject a static fallback so the footer still renders
          inject('<footer style="opacity:.6">Prod-Pusher Tool</footer>');
          return;
        }
        var u = tryList[i] + (tryList[i].includes('?') ? '&' : '?') + 'v=' + Date.now();

        // Race the fetch against a 3-second timeout
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = setTimeout(function () {
          if (ctrl) ctrl.abort();
          attempt(i + 1);
        }, 3000);

        fetch(u, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
          .then(function (html) { clearTimeout(timer); inject(html); })
          .catch(function () { clearTimeout(timer); attempt(i + 1); });
      }

      attempt(0);
    });
  });
})();
