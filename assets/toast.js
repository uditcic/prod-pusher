(function () {
  'use strict';

  var DURATION = 4000;
  var MAX      = 5;

  var style = document.createElement('style');
  style.textContent = [
    '#pp-toast-container {',
    '  position: fixed; top: 16px; right: 16px; z-index: 99999;',
    '  width: 340px;',
    '  pointer-events: none;',
    '}',
    '.pp-toast {',
    '  pointer-events: auto;',
    '  display: flex; flex-direction: row; align-items: flex-start; gap: 10px;',
    '  padding: 12px 16px; border-radius: 8px;',
    '  width: 100%; box-sizing: border-box;',
    '  margin-bottom: 8px;',
    '  font-family: "Segoe UI", Tahoma, sans-serif; font-size: 14px;',
    '  line-height: 1.4; color: #f8fafc;',
    '  box-shadow: 0 8px 24px rgba(0,0,0,.35);',
    '  animation: pp-toast-in .3s ease forwards;',
    '  transition: opacity .3s ease, transform .3s ease;',
    '}',
    '.pp-toast.pp-toast--out {',
    '  animation: pp-toast-out .3s ease forwards;',
    '}',
    '.pp-toast-icon { font-size: 18px; flex-shrink: 0; line-height: 1; margin-top: 1px; }',
    '.pp-toast-msg  { flex: 1; word-break: break-word; }',
    '.pp-toast-close {',
    '  background: none; border: none; color: inherit; opacity: .6;',
    '  cursor: pointer; font-size: 16px; padding: 0 2px; flex-shrink: 0;',
    '  line-height: 1; width: auto !important;',
    '}',
    '.pp-toast-close:hover { opacity: 1; }',
    '',
    '.pp-toast--success { background: #065f46; border-left: 4px solid #34d399; }',
    '.pp-toast--error   { background: #7f1d1d; border-left: 4px solid #f87171; }',
    '.pp-toast--warning { background: #78350f; border-left: 4px solid #fbbf24; }',
    '.pp-toast--info    { background: #164e63; border-left: 4px solid #22d3ee; }',
    '',
    '@keyframes pp-toast-in {',
    '  from { opacity: 0; transform: translateX(40px); }',
    '  to   { opacity: 1; transform: translateX(0); }',
    '}',
    '@keyframes pp-toast-out {',
    '  from { opacity: 1; transform: translateX(0); }',
    '  to   { opacity: 0; transform: translateX(40px); }',
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .pp-toast, .pp-toast.pp-toast--out {',
    '    animation: none !important; transition: none !important;',
    '  }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  var container = document.createElement('div');
  container.id = 'pp-toast-container';
  document.body.appendChild(container);

  var icons = {
    success: '\u2705',
    error:   '\u274C',
    warning: '\u26A0\uFE0F',
    info:    '\u2139\uFE0F',
  };

  window.ppToast = function (message, type, duration) {
    type = type || 'info';
    duration = duration !== undefined ? duration : DURATION;

    var toast = document.createElement('div');
    toast.className = 'pp-toast pp-toast--' + type;
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<span class="pp-toast-icon">' + (icons[type] || icons.info) + '</span>' +
      '<span class="pp-toast-msg">' + escHtml(message) + '</span>' +
      '<button class="pp-toast-close" aria-label="Dismiss">\u2715</button>';

    function dismiss() {
      if (toast._dismissed) return;
      toast._dismissed = true;
      toast.classList.add('pp-toast--out');
      setTimeout(function () { toast.remove(); }, 300);
    }

    toast.querySelector('.pp-toast-close').addEventListener('click', dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    container.appendChild(toast);

    while (container.children.length > MAX) {
      var oldest = container.firstElementChild;
      if (oldest) oldest.remove();
    }
  };

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
