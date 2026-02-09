document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resolveForm");
  const out = document.getElementById("out");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    out.innerHTML = "Resolving…";

    const lines = document.getElementById("list").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: lines })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Failed");

      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(data, null, 2);
      out.innerHTML = "";
      out.appendChild(pre);
    } catch (err) {
      out.textContent = "Error: " + err.message;
    }
  });
});