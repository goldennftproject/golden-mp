/* main: puerta de apodo -> arranca Phaser con las escenas Boot -> Farm <-> Plaza */

/* ---- PANTALLA DE CARGA ÚNICA ------------------------------------------------
   Antes se iba en cuanto terminaba el login, y el juego seguía cargando sus
   imágenes por detrás con su propia barra. Resultado: el cofre diario se abría
   sobre una granja a medio armar. Ahora hay UNA sola pantalla, con una barra que
   avanza por etapas, y no se va hasta que la granja está dibujada de verdad. */
const LOAD_ETAPAS = { cuenta: 0.15, ajustes: 0.25, partida: 0.40, arte: 0.90, granja: 1 };
function loadPaso(pct, texto) {
  const f = document.getElementById("ldfill"), m = document.getElementById("ldmsg");
  if (f) f.style.width = Math.round(Math.max(4, Math.min(100, pct * 100))) + "%";
  if (m && texto) m.textContent = texto;
}
// cosas que quieren abrirse "al entrar" (cofre diario, avisos): esperan a que la granja esté lista
window.alEntrar = [];
function correrAlEntrar() {
  const cola = window.alEntrar || [];
  window.alEntrar = null;   // de acá en más, lo que se agregue se ejecuta al toque
  cola.forEach(fn => { try { fn(); } catch (e) { console.warn(e); } });
}
function cuandoListo(fn) { if (window.alEntrar) window.alEntrar.push(fn); else fn(); }

// la llama FarmScene al terminar de crear la granja: recién ahí se levanta el telón
function juegoListo() {
  if (window._juegoListo) return;
  window._juegoListo = true;
  loadPaso(1, "¡Listo!");
  setTimeout(() => {
    const l = document.getElementById("loading");
    if (l) { l.style.transition = "opacity .35s"; l.style.opacity = "0"; setTimeout(() => { l.style.display = "none"; }, 360); }
    correrAlEntrar();   // ahora sí: cofre diario y demás, con el juego ya a la vista
  }, 120);
}

function startGame() {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    // 31/7: suavizado activado — casi todos los sprites se muestran REDUCIDOS y con nearest quedaban serruchados
    // 12/8: roundPixels APAGADO — con zoom fraccionario y cámara con suavizado, el redondeo
    // a píxel entero hacía saltar TODO ±1px a cada rato (el "temblor leve" reportado).
    // Con antialias activo y el atlas desempaquetado en texturas sueltas, no hace falta.
    pixelArt: false,
    render: { antialias: true, roundPixels: false },
    backgroundColor: "#243318",
    loader: { maxParallelDownloads: 6, maxRetries: 4 },   // suave con el server free de Render (evita REFUSED_STREAM)
    scale: {
      mode: Phaser.Scale.RESIZE,          // el canvas llena la ventana (sin bandas)
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, FarmScene, PlazaScene, ForestScene],
  });
}

let entered = false;   /* 25/8: window.entered lo mira update.js para NO recargar una partida en curso */
function hideEl(id) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
function enterGame() {
  if (entered) return; entered = true; window.entered = true;
  if (typeof initChat === "function") initChat(renderChatMsg);
  if (typeof startAutosave === "function") startAutosave();
  try { if (typeof refreshHud === "function") refreshHud(); } catch (e) { console.error("HUD:", e); }   // pase lo que pase, el juego tiene que arrancar
  hideEl("gate");
  loadPaso(LOAD_ETAPAS.partida, "Cargando el arte de la granja…");
  startGame();   // la pantalla de carga SIGUE puesta hasta que FarmScene avise que está lista
  setTimeout(juegoListo, 25000);   // red de seguridad: si algo se traba, nunca queda la pantalla pegada
  // cofre diario: se abre junto con el juego, no antes
  // 15/8 (buzón): el cofre diario ya NO se abre solo al entrar — la banderita del buzón lo anuncia
  // si quedó entrenando de la sesión anterior, la ventana vuelve sola: no se puede jugar
  // mientras el granjero entrena, ni recargando la página (9/8)
  cuandoListo(() => { try { if (typeof dummyEntrenando === "function" && dummyEntrenando()) openOv("ov-entrenando"); } catch (e) {} });
}

/* LA PANTALLA DE "NO SE PUDO", en un solo lugar (24/8). Comparte cartel con la puerta del
   apodo, así que apaga lo que era de la otra y explica el paso que falló. No escribe NADA:
   con CARGA_FALLO el guardado queda bloqueado y la granja de la nube no se toca. */
function pantallaNoSePudo() {
  hideEl("loading");
  const g = document.getElementById("gate"); if (!g) return;
  g.style.display = "flex";
  const t = g.querySelector("h1, h2, .tit") || g.firstElementChild;
  if (t) t.textContent = "No se pudo cargar tu granja";
  const vieja = g.querySelector("p"); if (vieja) vieja.style.display = "none";
  if (!g.querySelector(".gf-motivo")) {
    const sub = document.createElement("div");
    sub.className = "gf-motivo";
    sub.style.cssText = "font-size:13px;color:#cbbf9f;margin:6px 0 10px;max-width:340px;text-align:center;line-height:1.4";
    sub.textContent = "Tu granja está a salvo: no se tocó nada, y sigue guardada en tu cuenta. " +
      (window.CARGA_MOTIVO ? "Se colgó en « " + window.CARGA_MOTIVO + " ». " : "El servidor no contestó a tiempo. ") +
      "Probá de nuevo en un minuto. NO empieces una partida nueva: tu avance no se perdió.";
    if (t && t.parentNode) t.parentNode.insertBefore(sub, t.nextSibling);
  }
  const b = document.getElementById("enter");
  if (b) { b.textContent = "Reintentar"; b.onclick = () => location.reload(); }
  const n = document.getElementById("nick"); if (n) n.style.display = "none";
}

// al cargar: si ya tenés cuenta + granja guardada, entrás directo (sin pedir apodo otra vez)
(async function boot() {
  let returning = false;
  loadPaso(LOAD_ETAPAS.cuenta, "Buscando tu cuenta…");
  // 16/8 (dirección): el panel de balanceo se ELIMINÓ. Guardaba valores en la nube que
  // pisaban al código y nos costó tres problemas seguidos (timers fantasma, la respuesta
  // al clic "que volvía sola" y un arranque trabado). Ahora manda el código y punto:
  // los números viven en state.js y config.js, y lo que se ve es lo que está escrito.
  // MODO TESTEO: comprime tiempos en memoria, solo cuando se activa a mano.
  try { if (typeof aplicarTesteo === "function") aplicarTesteo(); } catch (e) { console.warn(e); }
  loadPaso(LOAD_ETAPAS.ajustes, "Aplicando ajustes…");
  /* 24/8 (dirección: « se queda ahí », con la barra clavada en 25 %). Este paso espera dos cosas
     de RED —el login y la lectura de la granja— y ninguna tenía reloj. Una promesa que nunca se
     resuelve deja el arranque colgado PARA SIEMPRE: no falla, no avanza, no dice nada. Es la
     regla 9 aplicada a la puerta de entrada, y es la peor versión de todas, porque el jugador ni
     siquiera llegó a entrar para poder diagnosticarlo.
     Ahora la espera tiene reloj y voz: mientras espera, la pantalla cuenta los segundos (el
     servidor gratis tarda en despertar y eso hay que decirlo, no disimularlo), y si se pasa del
     tope, el arranque NO sigue de largo —seguir sería jugar sobre una granja vacía y guardarla
     encima de la buena—: cae en la pantalla de "no se pudo cargar", que ya existe y no escribe
     nada. Reintentar es del jugador. */
  /* 24/8 v2 — el reloj se estrenó y saltó de verdad, así que hay que apurar dos cosas más.
     La primera: 30 segundos era corto. La LECTURA de la granja ya reintenta tres veces por su
     cuenta, con esperas de 1,2 + 2,4 + 3,6 s entre medio, y encima cada intento tiene que ir y
     volver — o sea que el paso entero puede tardar bastante sin estar roto. 45 s deja pasar el
     parpadeo de red y sigue cortando el cuelgue de verdad.
     La segunda: el cartel tiene que decir CUÁL de los dos pasos se colgó. "Login" y "lectura de
     la granja" son problemas distintos y se arreglan en lados distintos; sin esa palabra, el
     reporte del jugador no sirve para nada. */
  const ESPERA_MAX_S = 45;
  let esperando = 0;
  const reloj = setInterval(() => {
    esperando++;
    if (esperando >= 4) loadPaso(LOAD_ETAPAS.ajustes, "Despertando el servidor… " + esperando + " s");
  }, 1000);
  const conReloj = (p, etiqueta) => Promise.race([
    Promise.resolve(p),
    new Promise((_, rej) => setTimeout(() => rej(new Error("sin respuesta: " + etiqueta)), ESPERA_MAX_S * 1000)),
  ]);
  try {
    await conReloj(window.SAVE_READY, "login");
    returning = await conReloj(loadFarm(), "lectura de la granja");
  } catch (e) {
    console.warn(e);
    const m = /sin respuesta: (.+)$/.exec(e && e.message || "");
    if (m) { window.CARGA_MOTIVO = m[1]; try { CARGA_FALLO = true; } catch (_) { window.CARGA_FALLO = true; } }
  } finally { clearInterval(reloj); }
  try { if (typeof godHandSembrar === "function") godHandSembrar(G._ausenteMs || 0); } catch (e) { console.warn(e); }   // GOD HAND: siembra lo que quedó vacío
  try { if (typeof testeoDestapar === "function") testeoDestapar(); } catch (e) { console.warn(e); }   // repara bolsas desbordadas por el regalo viejo de testeo
  if (returning && window.NICK) enterGame();
  else if (typeof CARGA_FALLO !== "undefined" && CARGA_FALLO) {
    // 18/8: no se pudo LEER la granja. Antes esto caía en la puerta del apodo y el jugador
    // terminaba pisando su propia partida con una nueva. Ahora se lo decimos y no se toca nada.
    pantallaNoSePudo();
  } else {
    /* 24/8 — ÚLTIMA REJA ANTES DE LA PUERTA DEL APODO. Pedir un apodo significa "sos nuevo", y
       eso termina creando una cuenta anónima nueva: si el navegador ya tenía granja, queda
       huérfana bajo el UID viejo y el jugador arranca de cero (pasó, y costó tres horas de
       juego). Que la reja esté DOS veces —acá y en loadFarm— es a propósito: es el único fallo
       de la sesión que no tiene vuelta atrás, así que no depende de una sola comprobación. */
    if (typeof CUENTA_PREVIA !== "undefined" && CUENTA_PREVIA) {
      console.warn("hay cuenta en este navegador: NO se pide apodo (crearía una granja nueva)");
      window.CARGA_MOTIVO = window.CARGA_MOTIVO || "login";
      try { CARGA_FALLO = true; } catch (_) { window.CARGA_FALLO = true; }
      return pantallaNoSePudo();
    }
    hideEl("loading");                                            // jugador nuevo: primero el apodo
    document.getElementById("gate").style.display = "flex";
  }
})();

// jugador nuevo: elige apodo y entra
document.getElementById("enter").addEventListener("click", async () => {
  /* 24/8 — TERCERA Y ÚLTIMA REJA. Este botón es el que consuma la pérdida: crea la cuenta y
     escribe la granja nueva. Si el navegador ya tenía una, acá se corta, pase lo que pase más
     arriba. Tres comprobaciones para el mismo fallo puede parecer mucho; es el único de toda
     la sesión que no se puede deshacer. */
  if (typeof CUENTA_PREVIA !== "undefined" && CUENTA_PREVIA && !UID) {
    console.warn("Entrar bloqueado: este navegador ya tiene granja y no se pudo abrir la sesión");
    return pantallaNoSePudo();
  }
  window.NICK = document.getElementById("nick").value.trim() || "Granjero";
  try { await window.SAVE_READY; } catch (e) {}
  if (typeof saveFarm === "function") saveFarm();   // persiste el apodo enseguida
  const l = document.getElementById("loading");
  if (l) { l.style.display = "flex"; l.style.opacity = "1"; }     // vuelve la pantalla de carga mientras se arma la granja
  enterGame();
});
document.getElementById("nick").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("enter").click();
});
