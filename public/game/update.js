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
          const { v, online } = JSON.parse(ev.data);
          // contador de jugadores en línea del HUD (una ventana abierta = un jugador)
          if (typeof online === "number") { const el = document.getElementById("s-online"); if (el) el.textContent = online; }
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

  /* ========== LA RECARGA DEJA DE SER FORZOSA (25/8, dirección) ==========================
     « Estaba sembrando, lo dejé sembrando, salí de casa, y cuando llegué estaba en el login. »
     El culpable: esto. Cada deploy disparaba una cuenta de 5 segundos y RECARGABA la pestaña,
     mirara alguien o no. La cuenta atrás solo sirve si hay alguien delante; con la pestaña
     sola, es una recarga a traición. Y una recarga a traición es la que después se encuentra
     con el login, porque le toca reabrir la sesión sin nadie que pueda reintentar.
     Hoy deployamos muchas veces al día, así que esto no era un caso raro: era una lotería que
     el diseñador jugaba cada vez que dejaba el juego abierto.
     Reglas nuevas:
       · NUNCA se recarga sola una partida en curso. El cartel avisa y espera al jugador.
       · Con la pestaña escondida, ni siquiera se muestra: se guarda para cuando vuelva. Un
         cartel que nadie ve no tiene por qué gastar su cuenta atrás.
       · Lo único que se recarga solo es lo que no tiene nada que perder: la pantalla de carga
         o la puerta del apodo, donde el jugador todavía no entró. */
  let pendiente = false;
  function juegoEnCurso() {
    try { return !!(window.entered || (window.G && window.G.iniciado && window.NICK)); } catch (e) { return true; }
  }
  function showUpdate() {
    if (shown) return;
    if (document.hidden) { pendiente = true; return; }   // no está mirando: se lo decimos al volver
    shown = true;
    const el = document.getElementById("updbanner");
    if (!el) { if (!juegoEnCurso()) doReload(); return; }
    el.style.display = "flex";
    const c = el.querySelector(".updc");
    if (!juegoEnCurso()) {   // nadie está jugando: recarga sola, con su cuenta atrás de siempre
      let n = 5;
      const tick = () => { if (c) c.textContent = n; if (n <= 0) { doReload(); return; } n--; setTimeout(tick, 1000); };
      tick();
    } else if (c) {
      /* con la partida en curso el cartel se queda quieto hasta que el jugador quiera. Su
         progreso está guardado igual (el autosave corre), pero recargarle el juego en medio de
         una siembra es decidir por él algo que no es nuestro. */
      c.textContent = "";
      const t = el.querySelector(".updt");
      if (t) t.textContent = "Hay una versión nueva del juego.";
    }
    const btn = document.getElementById("updnow");
    if (btn) btn.onclick = doReload;
  }

  /* ====== NO SE RECARGA CONTRA UN SERVIDOR QUE TODAVÍA SE ESTÁ LEVANTANDO (25/8) ==========
     Dirección: « me he dado cuenta de que cuando yo hago deploy es cuando le sucede ». Ese dato
     cerró la cadena, y esta es la otra mitad.
     Un deploy MATA el servidor viejo y levanta el nuevo. El aviso de versión llega justo en ese
     hueco —por eso el canal /events muere con ERR_CONNECTION_CLOSED— y hasta hoy recargábamos
     de inmediato: en el peor segundo posible. La página vuelve a cargar con la red a medio
     levantar, el arranque no consigue abrir la sesión, y ahí empieza todo lo demás.
     Ahora, antes de recargar, se ESPERA a que el servidor conteste. Hasta un minuto, preguntando
     cada segundo y medio. Si no vuelve, se recarga igual —quedarse en un juego viejo tampoco es
     una respuesta— pero el caso normal, que es un deploy de veinte segundos, deja de caer en el
     hueco. Y el cartel lo cuenta mientras tanto, porque esperar sin saber por qué es peor. */
  async function servidorListo(maxMs) {
    const hasta = Date.now() + (maxMs || 60000);
    while (Date.now() < hasta) {
      try {
        const r = await fetch("/version", { cache: "no-store" });
        if (r.ok) return true;
      } catch (e) { /* todavía levantándose */ }
      await new Promise((res) => setTimeout(res, 1500));
    }
    return false;
  }
  async function doReload() {
    try { if (typeof saveFarm === "function") saveFarm(); } catch (e) {}
    const el = document.getElementById("updbanner"), t = el && el.querySelector(".updt");
    if (t) t.textContent = "Esperando al servidor…";
    const btn = document.getElementById("updnow"); if (btn) btn.disabled = true;
    await servidorListo(60000);
    setTimeout(() => location.reload(), 400);   // guarda el progreso antes de recargar
  }

  // al volver a la pestaña o recuperar conexión, chequear al instante
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (pendiente) { pendiente = false; showUpdate(); }   // volvió: ahora sí se le avisa
    check();
  });
  window.addEventListener("focus", () => check());
  window.addEventListener("online", () => check());

  // push en vivo desde el arranque + sondeo de respaldo (cada 15s; ráfaga si el server no contesta)
  listen();
  setTimeout(() => { check().then(schedule); }, 3000);
})();
