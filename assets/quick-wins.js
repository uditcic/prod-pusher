/**
 * quick-wins.js — shared enhancements for internal + external publish pages
 * 1. Live URL counter below textarea
 * 2. Whitespace / blank-line stripper (auto-clean on paste)
 * 3. Copy-to-clipboard button for converted URLs
 * 4. Styled confirmation modal (replaces browser confirm())
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {

    // ── 1. URL counter ──────────────────────────────────────────────
    var textarea = document.getElementById('stagingUrls') || document.getElementById('stagingUrlsExt');
    if (textarea) {
      var counter = document.createElement('div');
      counter.className = 'pp-url-counter';
      counter.textContent = '0 URLs';
      textarea.parentElement.insertBefore(counter, textarea.nextSibling);

      function updateCount() {
        var count = (textarea.value || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).length;
        counter.textContent = count + ' URL' + (count !== 1 ? 's' : '');
        counter.style.color = count > 0 ? '#38bdf8' : '#64748b';
      }
      textarea.addEventListener('input', updateCount);
      updateCount();
    }

    // ── 2. Whitespace stripper (auto-clean on paste) ────────────────
    if (textarea) {
      textarea.addEventListener('paste', function () {
        // Defer so the pasted content is in the textarea
        setTimeout(function () {
          var cleaned = textarea.value
            .split(/\r?\n/)
            .map(function (s) { return s.trim(); })
            .filter(Boolean)
            .join('\n');
          if (cleaned !== textarea.value) {
            textarea.value = cleaned;
            textarea.dispatchEvent(new Event('input')); // re-trigger counter
          }
        }, 0);
      });
    }

    // ── 3. Copy-to-clipboard for converted URLs ─────────────────────
    var convertedExt = document.getElementById('convertedUrlsExt');
    var convertedInt = document.getElementById('convertedUrls');
    var converted = convertedExt || convertedInt;
    if (converted) {
      var copyBtn = document.createElement('button');
      copyBtn.textContent = '📋 Copy URLs';
      copyBtn.className = 'pp-copy-btn';
      copyBtn.style.display = 'none';
      converted.parentElement.appendChild(copyBtn);

      // Show copy button when converted textarea gets content
      var observer = new MutationObserver(function () { checkShow(); });
      observer.observe(converted, { attributes: true, childList: true });
      converted.addEventListener('input', checkShow);
      // Also poll briefly after convert button is clicked
      var convertBtn = document.getElementById('convertBtnExt') || document.getElementById('convertBtn');
      if (convertBtn) {
        convertBtn.addEventListener('click', function () {
          setTimeout(checkShow, 100);
        });
      }

      function checkShow() {
        copyBtn.style.display = converted.value.trim() ? 'block' : 'none';
      }

      copyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        navigator.clipboard.writeText(converted.value).then(function () {
          var orig = copyBtn.textContent;
          copyBtn.textContent = '✅ Copied!';
          setTimeout(function () { copyBtn.textContent = orig; }, 1500);
        });
      });
    }

    // ── 4. Styled confirmation modal ────────────────────────────────
    // Inject modal HTML + CSS once
    var style = document.createElement('style');
    style.textContent = [
      '.pp-url-counter { font-size:13px; color:#64748b; text-align:right; margin-top:4px; margin-bottom:8px; }',
      '.pp-copy-btn { margin-top:8px; padding:8px 16px; font-size:14px; border:1px solid #334155; border-radius:6px; background:#1e293b; color:#38bdf8; cursor:pointer; }',
      '.pp-copy-btn:hover { background:#334155; }',
      '.pp-confirm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:10000; display:flex; align-items:center; justify-content:center; }',
      '.pp-confirm-dialog { background:#1e293b; border:1px solid #334155; border-radius:12px; padding:24px; max-width:480px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,.4); }',
      '.pp-confirm-dialog h3 { margin:0 0 12px; color:#38bdf8; font-size:18px; }',
      '.pp-confirm-dialog .pp-file-list { max-height:200px; overflow-y:auto; background:#0f172a; border-radius:6px; padding:10px; margin:12px 0; font-family:Consolas,monospace; font-size:13px; color:#94a3b8; line-height:1.6; }',
      '.pp-confirm-dialog .pp-summary { font-size:14px; color:#cbd5e1; margin:8px 0 16px; }',
      '.pp-confirm-btns { display:flex; gap:10px; justify-content:flex-end; }',
      '.pp-confirm-btns button { padding:10px 20px; border-radius:6px; font-size:14px; font-weight:600; border:none; cursor:pointer; }',
      '.pp-confirm-cancel { background:#334155; color:#cbd5e1; }',
      '.pp-confirm-cancel:hover { background:#475569; }',
      '.pp-confirm-go { background:#0ea5e9; color:white; }',
      '.pp-confirm-go:hover { background:#0284c7; }'
    ].join('\n');
    document.head.appendChild(style);

    /**
     * Show a styled confirmation dialog before publishing.
     * Returns a Promise that resolves to true (confirmed) or false (cancelled).
     */
    window.ppConfirmPublish = function (urls, serverLabel) {
      return new Promise(function (resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'pp-confirm-overlay';
        overlay.innerHTML =
          '<div class="pp-confirm-dialog">' +
            '<h3>Confirm Publish to ' + (serverLabel || 'Live') + '</h3>' +
            '<div class="pp-summary">' + urls.length + ' file' + (urls.length !== 1 ? 's' : '') + ' will be uploaded:</div>' +
            '<div class="pp-file-list">' + urls.map(function (u) {
              // Show just the path portion for readability
              try { return new URL(u).pathname; } catch (e) { return u; }
            }).join('<br>') + '</div>' +
            '<div class="pp-confirm-btns">' +
              '<button class="pp-confirm-cancel">Cancel</button>' +
              '<button class="pp-confirm-go">Publish</button>' +
            '</div>' +
          '</div>';

        document.body.appendChild(overlay);

        function cleanup(result) {
          overlay.remove();
          resolve(result);
        }

        overlay.querySelector('.pp-confirm-cancel').addEventListener('click', function () { cleanup(false); });
        overlay.querySelector('.pp-confirm-go').addEventListener('click', function () { cleanup(true); });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) cleanup(false); });
        // Focus the Publish button for keyboard accessibility
        overlay.querySelector('.pp-confirm-go').focus();
        // Escape key cancels
        overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') cleanup(false); });
      });
    };

  });
})();
