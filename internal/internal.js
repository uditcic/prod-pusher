<script>
document.addEventListener('DOMContentLoaded', () => {
  // Elements (supports both older and newer IDs)
  const urlsEl    = document.getElementById('urls') || document.getElementById('stagingUrls');
  const btn       = document.getElementById('goLiveBtnInt') || document.getElementById('goLiveBtn');
  const statusEl  = document.getElementById('statusMessageInt') || document.getElementById('statusMessage');
  const statusBox = document.getElementById('statusSectionInt')  || document.getElementById('statusSection');

  // Optional converter widgets
  const convertBtn  = document.getElementById('convertBtn');
  const convertedEl = document.getElementById('convertedUrls');

  const lines = () => ((urlsEl?.value)||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

  // Summarize server outcome (handles HTTP errors and host-level errors)
  function summarize(res, data){
    if (!res.ok) return data?.error || `HTTP ${res.status}`;
    const host = data?.results; // internal returns single host summary
    if (host && (host.err > 0 || host.error)) return host.error || 'Upload reported errors';
    return null;
  }

  async function publishInternal(force = false){
    const urls = lines();
    if (!urls.length) { alert('Paste at least one URL.'); return; }

    statusBox && (statusBox.style.display = 'block');
    statusEl  && (statusEl.textContent   = force ? 'Publishing (forced)…' : 'Publishing…');

    let res, data = {};
    try {
      res = await fetch('/api/go-live/internal', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ urls, username:'', password:'__USE_DEFAULT__', force })
      });
      try { data = await res.json(); } catch {}
    } catch (err) {
      statusEl && (statusEl.textContent = 'Request failed: ' + err.message);
      return;
    }

    // 409 (locked) -> prompt -> optional force retry
    if (res.status === 409 && data?.locks?.length && !force) {
      const y = window.scrollY;
      const list = data.locks.map(l => `• ${l.rel} — ${l.coder || 'unknown'}`).join('\n');
      const ok = confirm(`Locked on staging (Connexion):\n\n${list}\n\nForce publish anyway?`);
      window.scrollTo({ top: y });
      if (!ok) { statusEl && (statusEl.textContent = 'Publish cancelled (locked pages).'); return; }
      return publishInternal(true);
    }

    const err = summarize(res, data);
    if (err) { statusEl && (statusEl.textContent = 'Failed: ' + err); return; }

    statusEl && (statusEl.textContent = data?.message || 'Done.');
  }

  async function preflightThenPublish(){
    const urls = lines();
    if (!urls.length) { alert('Paste at least one URL.'); return; }

    // Preflight locks without opening status box (avoids layout shift)
    try {
      const ck = await fetch('/api/check/locks-internal', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ urls })
      }).then(r=>r.json());

      if (ck.locked?.length) {
        const y = window.scrollY;
        const list = ck.locked.map(l => `• ${l.rel} — ${l.coder || 'unknown'}`).join('\n');
        const ok = confirm(`Locked on staging (Connexion):\n\n${list}\n\nForce publish anyway?`);
        window.scrollTo({ top: y });
        if (!ok) {
          statusBox && (statusBox.style.display = 'block');
          statusEl  && (statusEl.textContent   = 'Publish cancelled (locked pages).');
          return;
        }
        return publishInternal(true);
      }
    } catch { /* ignore preflight failure and continue */ }

    publishInternal(false);
  }

  // Wire up button (or form submit if you have one)
  if (btn) btn.addEventListener('click', preflightThenPublish);
  const form = document.getElementById('internalPublishForm');
  if (form) form.addEventListener('submit', (e)=>{ e.preventDefault(); preflightThenPublish(); });

  // Optional: Stage → Live converter (keeps your old behavior)
  if (convertBtn && convertedEl) {
    convertBtn.addEventListener('click', () => {
      const src = lines();
      const converted = src.map(url =>
        url.replace(/^https?:\/\/cicintranet-stage\.ci\.gc\.ca\/?/i, 'https://cicintranet.ci.gc.ca/')
      );
      convertedEl.value = converted.join('\n');
    });
  }
});
</script>
