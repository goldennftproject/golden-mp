/* Golden Farm · aviso de nueva versión + auto-refresh con cuenta regresiva */
(function () {
  let current = null, shown = false;

  async function check() {
    try {
      const r = await fetch("/version", { cache: "no-store" });
      if (!r.ok) return;
      const { v } = await r.json();
      if (!v) return;
      if (current === null) { current = v; return; }      // versión con la que cargaste
      if (v !== current) { current = v; showUpdate(); }    // ¡hay deploy nuevo!
    } catch (e) { /* sin conexión: reintenta luego */ }
  }

  function showUpdate() {
    if (shown) return; shown = true;
    const el = document.getElementById("updbanner");
    if (!el) { doReload(); return; }
    el.style.display = "flex";
    let n = 15;
    const c = el.querySelector(".updc");
    const tick = () => {
      if (c) c.textContent = n;
      if (n <= 0) { doReload(); return; }
      n--; setTimeout(tick, 1000);
    };
    tick();
    const btn = document.getElementById("updnow");
    if (btn) btn.onclick = doReload;
  }

  function doReload() {
    try { if (typeof saveFarm === "function") saveFarm(); } catch (e) {}
    setTimeout(() => location.reload(), 400);   // guarda el progreso antes de recargar
  }

  // empieza a chequear tras unos segundos, luego cada 45s
  setTimeout(() => { check(); setInterval(check, 45000); }, 8000);
})();
