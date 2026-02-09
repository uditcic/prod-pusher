window.pp = window.pp || {};
pp.checkLocksExternal = async (urls) =>
  fetch('/api/check/locks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ urls }) }).then(r=>r.json());
pp.checkLocksInternal = async (urls) =>
  fetch('/api/check/locks-internal', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ urls }) }).then(r=>r.json());
