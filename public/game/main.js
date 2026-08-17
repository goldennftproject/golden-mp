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

let entered = false;
function hideEl(id) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
function enterGame() {
  if (entered) return; entered = true;
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
  try { await window.SAVE_READY; returning = await loadFarm(); } catch (e) { console.warn(e); }
  try { if (typeof godHandSembrar === "function") godHandSembrar(G._ausenteMs || 0); } catch (e) { console.warn(e); }   // GOD HAND: siembra lo que quedó vacío
  try { if (typeof testeoDestapar === "function") testeoDestapar(); } catch (e) { console.warn(e); }   // repara bolsas desbordadas por el regalo viejo de testeo
  if (returning && window.NICK) enterGame();
  else {
    hideEl("loading");                                            // jugador nuevo: primero el apodo
    document.getElementById("gate").style.display = "flex";
  }
})();

// jugador nuevo: elige apodo y entra
document.getElementById("enter").addEventListener("click", async () => {
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
