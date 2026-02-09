document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("promoteForm");
  const list = document.getElementById("statusList");
  const section = document.getElementById("statusSection");
  const msg = document.getElementById("statusMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    list.innerHTML = "";
    section.style.display = "block";
    msg.textContent = "Promoting...";
    const files = document.getElementById("fileList").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Failed");
      msg.textContent = `Done. Promoted ${data.promoted} file(s), ${data.errors} error(s).`;
      data.results.forEach(r => {
        const li = document.createElement("li");
        li.textContent = `${r.status === "ok" ? "✅" : r.status === "skipped" ? "⏭️" : "❌"} ${r.file}${r.dest ? " → " + r.dest : ""}${r.error ? " – " + r.error : ""}`;
        list.appendChild(li);
      });
    } catch (err) {
      msg.textContent = "Error: " + err.message;
    }
  });
});