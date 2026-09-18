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
    contarElErrorDeAntes();   // si la vez pasada se detuvo, acá se dice por qué
    volverALaZonaSiHabiaViaje();
  }, 120);
}

/* ═══ RECARGAR DENTRO DE LA ZONA TE DEJA DENTRO   (16/9, diseñador · detall.docx punto 4) ════
   « Si estás en zona negra y das F5 aparece en la granja, debe aparecer justo donde quedó ».
   La partida siempre ARRANCA en la granja —ahí está el arte, el HUD y todo lo que el juego da
   por montado—, así que el camino honesto no es arrancar en el bosque sino cruzar el portal solo
   en cuanto la granja está lista. El jugador ve el fundido de siempre, el mismo que si hubiera
   caminado. save.js deja la bandera cuando encuentra un viaje abierto y comprueba que la zona
   exista; acá solo se cruza.
   Si la escena no arranca, NO se deja al jugador en el limbo: se cierra el viaje como antes y el
   botín se vuelca, que es lo que manda la ley 1. */
function volverALaZonaSiHabiaViaje() {
  const z = window.__volverALaZona; if (!z) return;
  window.__volverALaZona = null;
  const sc = window.farmScene;
  try {
    if (!sc || !sc.scene || typeof irAEscena !== "function") throw new Error("la granja no está montada");
    GF.zona = z;
    sc.leaving = true;
    irAEscena(sc, "forest");
    if (typeof toast === "function") toast("Seguías en la Zona Negra");
  } catch (e) {
    console.warn("no se pudo volver a la Zona:", e && e.message);
    try {
      if (typeof zonaSalir === "function" && typeof mostrarResumenZona === "function") mostrarResumenZona(zonaSalir(false));
      if (typeof log === "function") log("No se pudo volver a la Zona Negra: tu viaje se cerró y lo que llevabas está en la bolsa.", "bad");
      if (typeof saveFarm === "function") saveFarm(true);
    } catch (x) {}
  }
}

/* ═══ LA PANTALLA CONGELADA AL VOLVER DE OTRA PESTAÑA   (15/9, reportado jugando) ═══════════
   « Se queda pegado, freezz, tengo que darle F5 para poder volver… puedo hacer click, se
   realiza la acción con el sonido, pero no da vídeo… cuando duro mucho sin estar en la pantalla
   del juego se freezea ».

   Ese síntoma —los clics funcionan y suenan, la imagen no— dice exactamente qué pasó: el bucle
   del juego sigue vivo y lo que se murió es el CONTEXTO WEBGL. Chrome se lo lleva a las pestañas
   que llevan mucho rato en segundo plano para recuperar memoria, y sin nadie escuchando queda un
   canvas congelado para siempre. El F5 lo arregla porque crea un contexto nuevo.

   Lo que se hace acá es el F5, pero solo, y con la partida guardada antes — la ley 1 primero:
     1 · `preventDefault()` en `webglcontextlost`, que es lo ÚNICO que deja al navegador
         devolverlo después (sin eso, no hay restauración posible);
     2 · se guarda la granja y se avisa en pantalla, para que nadie crea que se colgó;
     3 · y se vuelve a entrar SOLO CUANDO EL JUGADOR ESTÁ MIRANDO. Rehacer a mano cada textura
         del atlas es mucho más frágil que volver a entrar —la partida está en el servidor—, y
         recargar una pestaña que sigue en segundo plano no arregla nada: el navegador le
         volvería a quitar el contexto al rato, y el jugador se encontraría lo mismo.
   Además, al volver a la pestaña se pregunta si el contexto está caído, por si el aviso se
   perdió mientras nadie miraba. */
/* ═══ Y EL MISMO SÍNTOMA POR OTRO CAMINO: EL BUCLE PARADO   (15/9, medido en el navegador) ═══
   Reproduciéndolo con la pestaña en segundo plano apareció un segundo caso, con el mismo aspecto
   para el jugador y otra causa: el bucle de Phaser se queda clavado —`loop.running` dice que sí,
   el contador de fotogramas no se mueve— porque el navegador deja de dar `requestAnimationFrame`
   a las pestañas que no se ven y no siempre lo devuelve al volver. El contexto WebGL está sano;
   lo que no vuelve es el reloj.
   Así que además del contexto se vigila EL PULSO: si la pestaña está a la vista y el contador de
   fotogramas no se movió en LOOP_MUERTO_MS, primero se intenta despertarlo (que es gratis y no
   interrumpe nada) y solo si sigue clavado se guarda y se vuelve a entrar. Nunca se hace nada
   con la pestaña escondida: ahí que el bucle esté parado es lo NORMAL. */
/* ═══ Y LA TERCERA CAUSA, QUE ES LA QUE FALTABA NOMBRAR   (15/9, tarde) ═══════════════════════
   « He regresado de zona negra y se quedó pegada ». El contexto WebGL estaba sano y la pestaña
   estaba a la vista, así que no era ninguno de los dos casos de arriba: lo que mata el bucle de
   Phaser es UNA EXCEPCIÓN dentro del paso. El error sale por `window.onerror`, el
   requestAnimationFrame no se vuelve a pedir y la pantalla queda congelada en el último
   fotograma — mientras el DOM, los clics y el sonido siguen vivos, que es exactamente el
   síntoma reportado las tres veces.
   Lo que no había era el NOMBRE del error: sin él, cada congelada es una adivinanza. Así que
   ahora se atrapa, se anota en la bitácora de sesión y se guarda para enseñarlo en el cartel si
   el bucle de verdad se muere. Un error suelto que no mata nada NO interrumpe la partida: se
   anota y ya. El que decide si hay que volver a entrar sigue siendo el pulso. */
var ERR_RECUERDA = 3;        // cuántos errores se recuerdan para el cartel
/* 16/9 (tarde) — « se quedó pegado PERO NO PUDE VER EL MENSAJE ». El cartel salía y el juego se
   recargaba 0,6 s después, así que el motivo duraba menos que un parpadeo. Un diagnóstico que no
   se puede leer no es un diagnóstico. Así que ahora el error:
     · se GUARDA en el navegador y sobrevive a la recarga, para contarlo del otro lado;
     · el cartel se queda ERR_CARTEL_MS en pantalla antes de recargar — tiempo de leerlo o de
       sacarle una foto, que es como nos llegan los reportes;
     · y al volver, el registro del juego lo dice con todas las letras, tranquilo, donde se puede
       copiar. La consola también, por si hace falta pegarlo.
   El guardado va primero igual: la ley 1 no cede por un cartel. */
var ERR_CARTEL_MS = 5000;          // lo que el cartel se queda antes de recargar
var ERR_LLAVE = "gf_ultimo_error";
function guardarElError(txt, porque) {
  try { localStorage.setItem(ERR_LLAVE, JSON.stringify({ txt: txt || "", porque: porque || "", t: Date.now() })); } catch (e) {}
}
function contarElErrorDeAntes() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(ERR_LLAVE) || "null"); localStorage.removeItem(ERR_LLAVE); } catch (e) {}
  if (!d || !d.t || Date.now() - d.t > 10 * 60 * 1000) return;   // viejo: ya no cuenta nada útil
  const det = (d.porque || "se detuvo") + (d.txt ? " · " + d.txt : "");
  console.warn("Golden Farm se reinició solo. Motivo:", det);
  try { if (typeof log === "function") log("⚠ La vez anterior el juego se detuvo y volvió a entrar solo. Motivo: " + det, "bad"); } catch (e) {}
  /* y se ABRE el panel: el registro arranca plegado, así que dejar el motivo ahí adentro sería
     repetir el error de esta mañana —« no pude ver el mensaje »— con otro disfraz. Se abre en la
     pestaña Registro, no en Chat, y no se vuelve a cerrar solo: que lo cierre quien lo lea. */
  try {
    const panel = document.getElementById("logpanel");
    if (panel) {
      panel.classList.remove("collapsed");
      const tab = panel.querySelector('[data-tab="log"]');
      if (tab) tab.click();
    }
  } catch (e) {}
  try { if (typeof sesionLog === "function") sesionLog("se reinició solo", det); } catch (e) {}
}
function atraparLosErrores() {
  window.__gfErr = [];
  const anota = (txt) => {
    if (!txt) return;
    window.__gfErr.push(txt);
    if (window.__gfErr.length > ERR_RECUERDA) window.__gfErr.shift();
    try { if (typeof sesionLog === "function") sesionLog("error suelto", txt); } catch (e) {}
    /* se guarda SIEMPRE, no solo cuando el bucle muere: si el juego se queda tonto sin morir del
       todo, el error igual queda escrito para la próxima carga */
    guardarElError(txt, "error durante la partida");
    /* 16/9 (segunda pasada) — acá había un atajo: si a los dos segundos el bucle no se había
       movido, se recargaba. Se quita. Un error de una extensión ajena, o un error inofensivo
       llegado justo mientras el bucle está entre dos fotogramas, bastaba para recargarle la
       partida a alguien que no tenía ningún problema — y una recarga de más es peor que un
       diagnóstico de menos. El que decide sigue siendo el pulso, con sus cuatro segundos y su
       intento de despertar; lo único que hace el error es DARLE NOMBRE a lo que el pulso
       encuentre. */
  };
  /* lo que NO es del juego no se cuenta: las extensiones del navegador (billeteras, traductores,
     bloqueadores) inyectan sus propios scripts y tiran sus propios errores dentro de la página.
     Anotarlos sería llenar el registro de ruido ajeno y, peor, culpar al juego de algo que no
     hizo — el 16/9 llegó un « Cannot read properties of undefined (reading 'M_ID') » que no
     existe ni en Phaser ni en Supabase ni en el juego. */
  const esAjeno = (f) => !!f && /^(chrome|moz|safari-web|webkit)-extension:/.test(String(f));
  window.addEventListener("error", (e) => {
    if (e && esAjeno(e.filename)) return;
    const d = (e && e.filename ? String(e.filename).split("/").pop() + ":" + e.lineno + " " : "");
    anota(d + ((e && e.message) || "error sin mensaje"));
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    anota("promesa: " + ((r && r.message) || String(r)));
  });
}
function ultimoError() { return (window.__gfErr && window.__gfErr.length) ? window.__gfErr[window.__gfErr.length - 1] : ""; }

var LOOP_MUERTO_MS = 4000;   // sin un solo fotograma, estando a la vista
var LOOP_MIRA_MS = 2000;     // cada cuánto se le toma el pulso
var CTX_RECARGA_MS = 600;   // lo que se le da al guardado para salir antes de recargar
function vigilarElContexto(game) {
  const lienzo = game && game.canvas; if (!lienzo) return;
  let cayendo = false;
  const volverAEntrar = () => {
    try { if (typeof saveFarm === "function") saveFarm(true); } catch (e) {}   // ley 1: primero se guarda
    const espera = document.getElementById("ctx-perdido") && document.getElementById("ctx-perdido").style.display === "flex"
      ? ERR_CARTEL_MS : CTX_RECARGA_MS;   // si hay cartel, que dé tiempo a leerlo
    const recargar = () => setTimeout(() => { try { location.reload(); } catch (e) {} }, espera);
    if (document.visibilityState === "visible") recargar();
    else document.addEventListener("visibilitychange", function alVolver() {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", alVolver); recargar();
    });
  };
  lienzo.addEventListener("webglcontextlost", (ev) => {
    ev.preventDefault();                       // sin esto el contexto no vuelve NUNCA
    if (cayendo) return; cayendo = true;
    console.warn("WebGL: el navegador se llevó el contexto (pestaña en segundo plano)");
    try { if (typeof sesionLog === "function") sesionLog("WebGL perdido", "pestaña en segundo plano"); } catch (e) {}
    const aviso = document.getElementById("ctx-perdido");
    if (aviso) aviso.style.display = "flex";
    volverAEntrar();
  }, false);
  lienzo.addEventListener("webglcontextrestored", () => { if (cayendo) volverAEntrar(); }, false);
  const rendirse = (porque) => {
    cayendo = true;
    const aviso = document.getElementById("ctx-perdido");
    if (aviso) aviso.style.display = "flex";
    /* el cartel dice POR QUÉ: sin el nombre del error, cada congelada vuelve a ser una adivinanza
       y el que la sufre no puede contarnos nada más que « se quedó pegada » */
    const det = document.getElementById("ctx-detalle"), e = (typeof ultimoError === "function") ? ultimoError() : "";
    if (det) det.textContent = e ? "(" + (porque || "se detuvo") + " · " + e + ")" : (porque ? "(" + porque + ")" : "");
    try { if (typeof sesionLog === "function") sesionLog("se volvió a entrar", (porque || "") + " " + e); } catch (x) {}
    guardarElError(e, porque);   // para poder contarlo del otro lado de la recarga
    volverAEntrar();
  };
  window.__gfFatal = (porque) => { if (!cayendo) rendirse(porque); };   // lo llama el atrapador de errores
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || cayendo) return;
    try {
      const gl = game.renderer && game.renderer.gl;
      if (gl && gl.isContextLost()) rendirse("contexto WebGL perdido");   // el aviso se perdió mientras nadie miraba
    } catch (e) {}
  });

  /* el pulso: el contador de fotogramas tiene que moverse mientras la pestaña se ve */
  let ultimoFrame = -1, quietoDesde = 0, despertado = 0;
  setInterval(() => {
    if (cayendo) return;
    if (document.visibilityState !== "visible") { ultimoFrame = -1; return; }   // escondida: parado es normal
    const loop = game.loop; if (!loop) return;
    if (loop.frame !== ultimoFrame) { ultimoFrame = loop.frame; quietoDesde = Date.now(); despertado = 0; return; }
    if (!quietoDesde) { quietoDesde = Date.now(); return; }
    if (Date.now() - quietoDesde < LOOP_MUERTO_MS) return;
    if (!despertado) {                       // primero, lo barato: pedirle al bucle que despierte
      despertado = Date.now();
      console.warn("El bucle del juego lleva " + Math.round((Date.now() - quietoDesde) / 1000) + " s sin fotogramas: despertando");
      try { if (typeof loop.wake === "function") loop.wake(); else if (typeof loop.resume === "function") loop.resume(); } catch (e) {}
      quietoDesde = Date.now();
      return;
    }
    rendirse("el bucle del juego se detuvo");                              // no despertó: se guarda y se vuelve a entrar
  }, LOOP_MIRA_MS);
}

function startGame() {
  window.GAME = new Phaser.Game({
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
  /* el canvas nace con el juego, así que la vigilancia se engancha en cuanto existe */
  atraparLosErrores();   // antes que nada: si la escena revienta al crearse, queremos el nombre
  window.GAME.events.once("ready", () => vigilarElContexto(window.GAME));
  return window.GAME;
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
  // 14/9: el MODO TESTEO se eliminó (dirección). Los tiempos son los reales, siempre.
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
  /* 18/9 — y la vida también corre mientras no estás. Va acá, junto a la siembra, porque es la
     misma idea: al volver se mira cuánto tiempo pasó y se pone el mundo al día. */
  try {
    if (typeof granjaRegenAusente === "function") {
      const curado = granjaRegenAusente(G._ausenteMs || 0);
      if (curado >= 1) cuandoListo(() => {
        try { if (typeof log === "function") log("Mientras no estabas recuperaste " + Math.floor(curado) + " de vida.", "gold"); } catch (e) {}
      });
    }
  } catch (e) { console.warn(e); }
  /* 25/8 — SI NO HAY NUBE, SE DICE ANTES DE JUGAR, NO DESPUÉS DE PERDER.
     La consola del diseñador mostró el caso: signInAnonymously cortado por la red, sin UID, y
     el juego arrancando igual. Se puede jugar sin nube —a veces es lo único que se puede—, pero
     el jugador tiene derecho a saberlo ANTES de invertir una tarde. */
  try {
    /* 18/9 — PUERTA_EMAIL no es un fallo de red: es « todavía no hay cuenta porque el jugador
       no dio su correo ». Decirle "sin conexión con el servidor" sería mentirle y mandarlo a
       revisar su internet por un problema que no tiene. */
    if (typeof UID !== "undefined" && !UID && typeof CUENTA_PREVIA !== "undefined" && !CUENTA_PREVIA &&
        !(typeof PUERTA_EMAIL !== "undefined" && PUERTA_EMAIL)) {
      cuandoListo(() => {
        /* 25/8 — el mismo texto que avisarSinNube, y salido de la MISMA función a propósito.
           Dos avisos que dicen lo mismo con palabras distintas son dos avisos que se
           contradicen en cuanto alguien toca uno; y acá además hace falta que digan la CAUSA
           (internet del jugador · librería bloqueada · base de datos caída), porque de eso
           depende si el jugador puede hacer algo o solo le toca esperar. */
        const m = (typeof motivoSinNube === "function") ? motivoSinNube()
          : { largo: "Sin conexión con el servidor de guardado. Tu granja se guarda en este navegador.", corto: "Sin servidor — se guarda acá" };
        if (typeof log === "function") log(m.largo, "warn");
        if (typeof toast === "function") toast(m.corto);
      });
    }
  } catch (e) {}
  /* 18/9 — VUELTA DEL ENLACE DEL CORREO. El jugador ya eligió su apodo en la puerta, tocó el
     enlace y volvió con la cuenta recién nacida: hay UID pero todavía no hay granja. Si lo
     mandáramos a la puerta otra vez, le pediríamos el apodo por segunda vez y, peor, le
     pediríamos el correo a alguien que acaba de dar el correo. Se entra derecho.
     La reja de siempre sigue valiendo: esto solo corre si NO había granja previa en este
     navegador, que es exactamente el caso del jugador nuevo. */
  if (!returning && typeof UID !== "undefined" && UID && !window.NICK &&
      typeof apodoElegido === "function" &&
      !(typeof CUENTA_PREVIA !== "undefined" && CUENTA_PREVIA)) {
    const n = apodoElegido(null);
    if (n) {
      window.NICK = n;
      try { localStorage.removeItem("gf_nick_pendiente"); } catch (e) {}
      console.warn("vuelta del enlace del correo: se entra con el apodo elegido (" + n + ")");
      if (typeof saveFarm === "function") { try { await window.SAVE_READY; } catch (e) {} saveFarm(); }
      return enterGame();
    }
  }
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
    /* 25/8 — la reja del apodo mira las DOS cosas: si hubo cuenta (no se puede pisar) o si hay
       una partida guardada acá (no se puede ignorar). Antes era una sola bandera para las dos
       preguntas y eso produjo un bloqueo: ver el comentario de hayGranjaLocal en save.js. */
    /* 18/9 (dirección: « yo solo permitiría partidas con login correo y ya ») — ESTE CAMINO SE
       CIERRA CON LA BANDERA PUESTA. Existía para que una caída de Supabase no dejara a nadie en
       la calle: con partida local y sin cuenta, se cargaba la partida en vez de pedir apodo.
       Lo que dirección decidió es que no haya partidas sin cuenta, y esto era el último sitio
       por donde entraba una. El precio, dicho sin maquillar: durante una caída de la base, un
       jugador sin cuenta no entra — y tampoco puede pedir el enlace, porque para eso hace falta
       la red. No empeora al jugador de verdad (el que YA tiene cuenta hoy también queda fuera
       en una caída: cae en pantallaNoSePudo tres líneas más abajo); iguala al que no la tenía.
       Su partida local NO se borra: queda en el navegador, intacta, por si algún día hay que
       rescatarla a mano. Apagar GF.SOLO_EMAIL devuelve este camino tal como estaba. */
    const soloCorreo = (typeof GF !== "undefined" && GF.SOLO_EMAIL);
    if (typeof hayGranjaLocal === "function" && hayGranjaLocal() &&
        !(typeof CUENTA_PREVIA !== "undefined" && CUENTA_PREVIA)) {
      if (!soloCorreo) {
        console.warn("no hay cuenta, pero SÍ hay partida en este navegador: se carga en vez de pedir apodo");
        if (typeof enterGame === "function") return enterGame();
      }
      console.warn("hay partida local sin cuenta, pero SOLO_EMAIL está puesto: se pide el correo (la partida local queda guardada, no se toca)");
    }
    if (typeof CUENTA_PREVIA !== "undefined" && CUENTA_PREVIA) {
      console.warn("hay cuenta en este navegador: NO se pide apodo (crearía una granja nueva)");
      window.CARGA_MOTIVO = window.CARGA_MOTIVO || "login";
      try { CARGA_FALLO = true; } catch (_) { window.CARGA_FALLO = true; }
      return pantallaNoSePudo();
    }
    hideEl("loading");                                            // jugador nuevo: primero el apodo
    document.getElementById("gate").style.display = "flex";
    puertaDelCorreo();   // 18/9: y el correo, si la bandera lo pide
  }
})();

/* ============ LA PUERTA DEL CORREO (18/9, dirección: « solo con correo ») =================
   Dirección lo encontró jugando: « pero si yo borro caché, ¿por qué no me sale para poner mi
   correo? ». No salía. El juego creaba una cuenta anónima, pedía un apodo y lo dejaba mirando
   una granja vacía; el campo del correo estaba en Configuración → Cuenta, tres clics adentro y
   media hora tarde. El login estaba escrito y bien, pero en el lugar donde nadie lo iba a ver.

   Lo que hay acá es SOLO la puerta. Las dos funciones que hablan con la nube ya existían
   (crearCuentaConEmail para el que llega nuevo, entrarConEmail para el que vuelve) y no se
   tocaron: esto decide qué se muestra y a cuál se llama.

   Lo que NO hace, a propósito: no toca ninguna de las tres rejas del 24/8. Ninguno de los dos
   caminos de acá escribe una granja — los dos terminan en « andá a tu correo ». La cuenta nace
   cuando el jugador toca el enlace, y para entonces vuelve por el arranque normal, con sus
   comprobaciones intactas.                                                                   */
var MODO_PUERTA = "apodo";   // "apodo" (jugador nuevo) | "volver" (ya tiene cuenta)

function gateMsg(txt, clase) {
  const m = document.getElementById("gate-msg"); if (!m) return;
  m.style.display = txt ? "block" : "none";
  m.className = "gate-msg" + (clase ? " " + clase : "");
  m.innerHTML = txt || "";
}

function puertaDelCorreo() {
  const solo = (typeof GF !== "undefined" && GF.SOLO_EMAIL);
  const alt = document.getElementById("gate-alt");
  /* el "ya tengo cuenta" se ofrece SIEMPRE, con bandera o sin ella: es la respuesta a « borré
     la caché y perdí la granja », y esa pregunta no depende de cómo entren los nuevos */
  if (alt) alt.style.display = "block";
  if (!solo) return;   // bandera apagada: la puerta de siempre, solo con el atajo de volver
  pintarPuerta("apodo");
}

function pintarPuerta(modo) {
  MODO_PUERTA = modo;
  const sub = document.getElementById("gate-sub");
  const nick = document.getElementById("nick");
  const mail = document.getElementById("gmail");
  const btn = document.getElementById("enter");
  const alt = document.getElementById("gate-alt");
  gateMsg("");
  if (modo === "volver") {
    if (sub) sub.textContent = "Entrá con el correo de tu granja. Te mandamos un enlace, sin contraseñas.";
    if (nick) nick.style.display = "none";
    if (mail) mail.style.display = "";
    if (btn) btn.textContent = "Mandame el enlace";
    if (alt) alt.innerHTML = '<button type="button" id="gate-ya">Soy nuevo — crear mi granja</button>';
  } else {
    if (sub) sub.textContent = "Elegí un apodo y dejá tu correo: con eso tu granja te sigue a cualquier dispositivo.";
    if (nick) nick.style.display = "";
    if (mail) mail.style.display = (typeof GF !== "undefined" && GF.SOLO_EMAIL) ? "" : "none";
    if (btn) btn.textContent = "Entrar";
    if (alt) alt.innerHTML = '<button type="button" id="gate-ya">Ya tengo cuenta — entrar con mi correo</button>';
  }
  const ya = document.getElementById("gate-ya");
  if (ya) ya.addEventListener("click", () => pintarPuerta(MODO_PUERTA === "volver" ? "apodo" : "volver"));
}

/* un correo mal escrito no se manda: el jugador se quedaría esperando un enlace que no existe
   y culparía al juego. La comprobación es floja a propósito — validar correos "bien" es un
   pozo sin fondo y el que decide de verdad es el servidor de correo. */
function correoPlausible(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim()); }

async function mandarElEnlace() {
  const mail = document.getElementById("gmail");
  const btn = document.getElementById("enter");
  const v = mail ? String(mail.value || "").trim() : "";
  if (!correoPlausible(v)) { gateMsg("Ese correo no parece completo. Revisalo y probá de nuevo.", "mal"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "Mandando…"; }
  gateMsg("Mandando el enlace…");
  try { await window.SAVE_READY; } catch (e) {}
  let r;
  if (MODO_PUERTA === "volver") {
    r = (typeof entrarConEmail === "function") ? await entrarConEmail(v) : { error: "no disponible" };
  } else {
    const n = (document.getElementById("nick") || {}).value;
    r = (typeof crearCuentaConEmail === "function") ? await crearCuentaConEmail(v, n) : { error: "no disponible" };
  }
  if (btn) { btn.disabled = false; btn.textContent = MODO_PUERTA === "volver" ? "Mandame el enlace" : "Entrar"; }
  if (r && r.ok) {
    gateMsg("Listo: te mandamos un enlace a <b>" + v.replace(/[<>&]/g, "") + "</b>.<br>" +
      "Abrilo y volvés directo a tu granja. Si no aparece en un minuto, mirá el correo no deseado.", "ok");
    return;
  }
  /* el error más probable del camino "volver" es un correo que nunca vinculó ninguna granja, y
     Supabase lo dice en inglés y en jerga. Se traduce, porque es EL caso en que el jugador
     necesita entender qué hacer: crear una granja nueva en vez de seguir intentando entrar. */
  const e = String((r && r.error) || "no se pudo");
  if (MODO_PUERTA === "volver" && /not found|no user|signups? not allowed|invalid/i.test(e)) {
    gateMsg("No hay ninguna granja atada a ese correo. Si sos nuevo, volvé y elegí « Soy nuevo — crear mi granja ».", "mal");
  } else if (/rate|limit|too many|seconds/i.test(e)) {
    gateMsg("Se mandaron muchos correos seguidos. Esperá un minuto y probá otra vez.", "mal");
  } else {
    gateMsg("No se pudo mandar el enlace: " + e.replace(/[<>]/g, ""), "mal");
  }
}

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
  /* 18/9 — el camino del correo va DESPUÉS de la reja, aunque no escriba nada.
     Lo puse antes en la primera versión y el test del 24/8 (test-no-perder-granja) lo cazó:
     « la comprobación va ANTES de tocar el apodo o guardar nada ». Tenía razón el test y no
     yo. Mi camino es inofensivo HOY —manda un correo y termina—, pero el día que alguien le
     agregue una línea, la reja tiene que haber corrido ya. El orden no se discute con
     argumentos sobre lo que la función hace ahora. */
  if (MODO_PUERTA === "volver" || (typeof GF !== "undefined" && GF.SOLO_EMAIL)) return mandarElEnlace();
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
/* el Enter desde el correo también entra: en el móvil el teclado muestra "ir" y nadie va a
   buscar el botón */
{
  const gm = document.getElementById("gmail");
  if (gm) gm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("enter").click();
  });
}
