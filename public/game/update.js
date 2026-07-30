/* Golden Farm · aviso de nueva versión + auto-refresh con cuenta regresiva
   Canal principal: SSE (/events) — el server le avisa la versión a CADA ventana abierta.
   Al deployar, el navegador se reconecta solo al server nuevo y recibe la versión nueva
   al instante: push exacto. El sondeo queda de respaldo por si el stream no anda. */
(function () {
  let current = null, shown = false, burstUntil = 0, timer = null;

  // --- push del server (SSE): detección instantánea tras cada deploy ---
  function listen() {
    if (!window.EventSource) return;   // navegador viejísimo: queda el sondeo
    try {
      const es = new EventSource("/events");
      es.onmessage = (ev) => {
        try {
          const { v } = JSON.parse(ev.data);
          if (!v) return;
          if (current === null) { current = v; return; }   // versión con la que cargaste
          if (v !== current) { current = v; showUpdate(); } // ¡deploy nuevo, avisado por el server!
        } catch (e) {}
      };
      // si el stream muere, EventSource se reconecta solo (retry: 3s); no hay que hacer nada
    } catch (e) {}
  }

  async function check() {
    try {
      const r = await fetch("/version", { cache: "no-store" });
      if (!r.ok) { enterBurst(); return; }
      const { v } = await r.json();
      if (!v) return;
      if (current === null) { current = v; return; }      // versión con la que cargaste
      if (v !== current) { current = v; showUpdate(); }    // ¡hay deploy nuevo!
    } catch (e) { enterBurst(); }                          // server caído: probablemente deployando
  }

  // el server no contesta: chequear cada 4s durante 3 minutos (hasta que vuelva con la versión nueva)
  function enterBurst() { burstUntil = Date.now() + 180000; schedule(); }

  function schedule() {
    if (timer) clearTimeout(timer);
    const wait = Date.now() < burstUntil ? 4000 : 15000;
    timer = setTimeout(() => { check().then(schedule); }, wait);
  }

  function showUpdate() {
    if (shown) return; shown = true;
    const el = document.getElementById("updbanner");
    if (!el) { doReload(); return; }
    el.style.display = "flex";
    let n = 5;
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

  // al volver a la pestaña o recuperar conexión, chequear al instante
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  window.addEventListener("focus", () => check());
  window.addEventListener("online", () => check());

  // push en vivo desde el arranque + sondeo de respaldo (cada 15s; ráfaga si el server no contesta)
  listen();
  setTimeout(() => { check().then(schedule); }, 3000);
})();
