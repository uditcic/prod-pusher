(function () {
  'use strict';

  var STORAGE_KEY = 'pp.theme';
  var LIGHT       = 'light';
  var DARK        = 'dark';

  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === LIGHT) document.documentElement.setAttribute('data-theme', LIGHT);

  var css = document.createElement('style');
  css.textContent = [
    'html[data-theme="light"] body {',
    '  background: linear-gradient(135deg, #e2e8f0, #cbd5e1, #f1f5f9);',
    '  color: #1e293b;',
    '}',
    'html[data-theme="light"] .container {',
    '  background: #ffffff;',
    '  box-shadow: 0 0 25px rgba(0,0,0,.1);',
    '}',
    'html[data-theme="light"] h1 { color: #0369a1; }',
    'html[data-theme="light"] h2 { color: #0369a1; }',
    'html[data-theme="light"] p  { color: #475569; }',
    'html[data-theme="light"] label { color: #475569; }',
    '',
    'html[data-theme="light"] textarea,',
    'html[data-theme="light"] input:not([type="checkbox"]):not([type="date"]) {',
    '  background: #f8fafc; color: #1e293b; border-color: #cbd5e1;',
    '}',
    'html[data-theme="light"] textarea:focus,',
    'html[data-theme="light"] input:focus { border-color: #0ea5e9; }',
    '',
    'html[data-theme="light"] .upload-buttons button {',
    '  background-color: #0284c7; color: #fff;',
    '}',
    'html[data-theme="light"] .upload-buttons button:hover {',
    '  background-color: #0369a1;',
    '}',
    '',
    'html[data-theme="light"] footer { color: #94a3b8; }',
    '',
    'html[data-theme="light"] .output-section li {',
    '  background: #f1f5f9; color: #1e293b;',
    '}',
    '',
    'html[data-theme="light"] .home-features { color: #475569; }',
    'html[data-theme="light"] .home-contact a { color: #0369a1; }',
    '',
    'html[data-theme="light"] #update-banner {',
    '  background: #fef3c7; color: #78350f;',
    '}',
    'html[data-theme="light"] #update-banner a { color: #b45309; }',
    'html[data-theme="light"] #update-banner button { color: #78350f; }',
    '',
    'html[data-theme="light"] .hist-filters input,',
    'html[data-theme="light"] .hist-filters select {',
    '  background: #f8fafc; color: #1e293b; border-color: #cbd5e1;',
    '}',
    'html[data-theme="light"] .hist-table th { color: #0369a1; border-color: #cbd5e1; }',
    'html[data-theme="light"] .hist-table td { color: #334155; border-color: #e2e8f0; }',
    'html[data-theme="light"] .hist-table tr:hover td { background: #f1f5f9; }',
    'html[data-theme="light"] .hist-detail { background: #f8fafc; }',
    'html[data-theme="light"] .hist-detail .evt-ts { color: #94a3b8; }',
    'html[data-theme="light"] .hist-detail .evt-name { color: #1e293b; }',
    'html[data-theme="light"] .hist-detail .evt-data { color: #64748b; }',
    'html[data-theme="light"] .hist-empty { color: #94a3b8; }',
    'html[data-theme="light"] .hist-pager button { background: #e2e8f0; color: #334155; }',
    'html[data-theme="light"] .hist-pager span { color: #64748b; }',
    '',
    'html[data-theme="light"] #pp-log-drawer { background: #f8fafc; border-color: #cbd5e1; }',
    'html[data-theme="light"] .pp-drawer-header { background: #e2e8f0; }',
    'html[data-theme="light"] .pp-drawer-title { color: #0369a1; }',
    'html[data-theme="light"] .pp-drawer-row { border-color: #e2e8f0; }',
    'html[data-theme="light"] .pp-drawer-row:nth-child(odd) { background: #f8fafc; }',
    'html[data-theme="light"] .pp-drawer-row:nth-child(even) { background: #f1f5f9; }',
    'html[data-theme="light"] .pp-ts { color: #94a3b8; }',
    'html[data-theme="light"] .pp-label { color: #1e293b; }',
    'html[data-theme="light"] .pp-detail { color: #64748b; }',
    '',
    'html[data-theme="light"] .pp-toast { box-shadow: 0 8px 24px rgba(0,0,0,.15); }',
    '',
    'html[data-theme="light"] .app-bar {',
    '  background: #f8fafc; border-bottom-color: #e2e8f0;',
    '}',
    'html[data-theme="light"] .app-bar__title { color: #475569; }',
    'html[data-theme="light"] .app-bar__version { color: #94a3b8; }',
    '',
    '#pp-theme-toggle {',
    '  position: fixed; top: 54px; right: 12px; z-index: 99998;',
    '  background: #334155; border: 1px solid #475569; color: #e2e8f0;',
    '  width: 36px; height: 36px; border-radius: 50%;',
    '  font-size: 18px; line-height: 1; cursor: pointer;',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: background .2s, color .2s;',
    '  box-shadow: 0 2px 8px rgba(0,0,0,.3);',
    '}',
    '#pp-theme-toggle:hover { background: #475569; }',
    'html[data-theme="light"] #pp-theme-toggle {',
    '  background: #ffffff; border-color: #cbd5e1; color: #334155;',
    '  box-shadow: 0 2px 8px rgba(0,0,0,.1);',
    '}',
    'html[data-theme="light"] #pp-theme-toggle:hover { background: #f1f5f9; }',
  ].join('\n');
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.createElement('button');
    btn.id = 'pp-theme-toggle';
    btn.setAttribute('aria-label', 'Toggle light/dark theme');
    btn.title = 'Toggle theme';
    updateIcon(btn);
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === LIGHT ? DARK : LIGHT;

      if (next === LIGHT) {
        document.documentElement.setAttribute('data-theme', LIGHT);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      localStorage.setItem(STORAGE_KEY, next);
      updateIcon(btn);
    });
  });

  function updateIcon(btn) {
    var isLight = document.documentElement.getAttribute('data-theme') === LIGHT;
    btn.textContent = isLight ? '\u2600' : '\u263D';
    btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
  }
})();
