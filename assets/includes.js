(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const nodes = document.querySelectorAll('[data-include]');
    nodes.forEach(function (el) {
      const raw = el.getAttribute('data-include');
      if (!raw) return;

      // Try as-given, then as absolute-from-root
      const tryList = [];
      if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) {
        tryList.push(raw);
      } else {
        tryList.push(raw); // relative as provided (e.g., ../includes/footer.html)
        tryList.push('/' + raw.replace(/^\.?\//, '')); // absolute (/includes/footer.html)
      }

      function attempt(i) {
        if (i >= tryList.length) {
          // gentle fallback so layout stays stable
          el.outerHTML = '<footer style="opacity:.6">Footer unavailable</footer>';
          return;
        }
        const u = tryList[i] + (tryList[i].includes('?') ? '&' : '?') + 'v=' + Date.now();
        fetch(u, { cache: 'no-store' })
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
          .then(html => { el.insertAdjacentHTML('afterend', html); el.remove(); })
          .catch(() => attempt(i + 1));
      }

      attempt(0);
    });
  });
})();
