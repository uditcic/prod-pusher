document.addEventListener("DOMContentLoaded", () => {
  const f = document.getElementById("f");
  const s = document.getElementById("s");
  const o = document.getElementById("o");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    s.style.display = "block";
    o.textContent = "Uploading…";
    const urls = f.urls.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const username = f.u.value.trim();
    const password = f.p.value;
    const targets = Array.from(f.querySelectorAll("input[name='t']:checked")).map(n=>n.value);
    try{
      const res = await fetch("/api/go-live/external-multi", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ urls, username, password, targets })
      });
      const data = await res.json();
      if(!res.ok || data.ok === false) throw new Error(data.error || "Failed");
      o.textContent = JSON.stringify(data, null, 2);
    }catch(err){
      o.textContent = "Error: " + err.message;
    }
  });
});