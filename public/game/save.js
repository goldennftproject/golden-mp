/* Golden Farm · persistencia por cuenta (login anónimo de Supabase) */
const SB_URL = "https://eusxpsmqczmczgyhndtd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3hwc21xY3ptY3pneWhuZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzU2OTMsImV4cCI6MjEwMDc1MTY5M30.ko-XxFFjf_YnBsnBvrSCOsMLTQ285G51r-UPLYZIDJ8";

let sb = null, UID = null, saveTimer = null, lastSavedKey = null;

/* ================= EL LOGIN SE COLGABA (24/8, dirección) =========================
   El cartel del arranque, ya con nombre: « se colgó en LOGIN y no contestó en 45 s ».
   O sea getSession(), que ni siquiera es una llamada de red: lee la sesión guardada.
   Por qué se cuelga: supabase-js v2 envuelve TODA operación de auth en un candado del
   navegador (navigator.locks) para que dos pestañas no refresquen el token a la vez. Si otra
   pestaña se quedó con el candado —dormida, colgada, o cerrada de mala manera—, la que abre
   después espera. Y espera. Para siempre: el candado no tiene vencimiento. Con una sola
   pestaña no pasa nunca; con el diseñador y yo abriendo diez para probar, pasa todo el rato.
   Se cambia el candado del navegador por uno de ESTA página: sigue serializando las
   operaciones de auth (que es para lo que sirve) pero no puede quedar tomado por nadie de
   afuera. Es el mismo enfoque que la propia librería ofrece como `processLock`. */
let _authCola = Promise.resolve();
function candadoDeEstaPagina(name, acquireTimeout, fn) {
  const corrida = _authCola.then(fn, fn);
  _authCola = corrida.then(() => {}, () => {});   // la cola nunca se rompe por un error de adentro
  return corrida;
}
/* la sesión guardada, leída A MANO: sin candado, sin red, sin librería. Es la red de seguridad
   para saber si este navegador YA tiene cuenta cuando getSession no contesta. */
function sesionGuardada() {
  try {
    const ref = (SB_URL.match(/https:\/\/([^.]+)\./) || [])[1];
    const raw = localStorage.getItem("sb-" + ref + "-auth-token");
    if (!raw) return null;
    const s = JSON.parse(raw);
    return (s && s.user && s.user.id) ? s : (s && s.currentSession && s.currentSession.user ? s.currentSession : null);
  } catch (e) { return null; }
}

/* ============ NUESTRA PROPIA COPIA DE LA LLAVE (24/8) ==================================
   Mirar solo la sesión de supabase no alcanza, y esto no es una sospecha: está en el código de
   la librería. Cuando getSession encuentra una sesión que considera inválida, llama a
   _removeSession() y BORRA lo guardado. Después de eso el navegador parece recién estrenado —
   sin cuenta, sin granja, sin rastro— y la puerta del apodo aparece con todo el derecho del
   mundo. O sea que la reja que pusimos no cubre el caso en que la llave se pierde sola, que es
   justo el que deja al jugador de cero.
   Así que guardamos NUESTRA copia, con nuestra llave, que la librería no toca nunca:
     · sirve de MARCA — este navegador tuvo una granja, aunque supabase ya no lo sepa;
     · y guarda el refresh token, que es lo único con lo que se puede REVIVIR la sesión.
   Es el mismo dato que la librería ya guarda en el mismo lugar: no se expone nada nuevo. */
/* ============ LA BITÁCORA DE LA SESIÓN (25/8, dirección) ==============================
   « El único motivo por el que una partida se debe resetear es si el jugador borra la caché.
   Si no la borra, no tiene por qué resetearse. »
   Tiene toda la razón, y por eso dejo de teorizar: llevamos tres reportes del mismo síntoma y
   tres explicaciones distintas mías, ninguna comprobada. El juego tiene que CONTARLO.
   Esta bitácora anota, en el propio navegador, cada cosa que le pasa a la sesión: cuándo se
   abrió, cuándo supabase la borró sola, si hubo que revivirla, y desde qué dirección. Cuando
   vuelva a pasar, el reporte deja de ser « me mandó al login » y pasa a ser una lista de hechos
   con hora. Es la regla 9 aplicada a lo que el jugador no puede ver.
   Vive aparte de todo lo demás y se limita sola a 40 líneas: nunca puede crecer sin control. */
const GF_LOG_KEY = "gf-sesion-log";
function sesionLog(que, extra) {
  try {
    const l = JSON.parse(localStorage.getItem(GF_LOG_KEY) || "[]");
    l.push({ t: new Date().toISOString().slice(0, 19).replace("T", " "), que: String(que),
      x: extra == null ? "" : String(extra).slice(0, 120), o: location.origin });
    while (l.length > 40) l.shift();
    localStorage.setItem(GF_LOG_KEY, JSON.stringify(l));
  } catch (e) {}
}
/* para pegar en el chat cuando pase: escribí gfSesion() en la consola */
window.gfSesion = function () {
  try {
    const l = JSON.parse(localStorage.getItem(GF_LOG_KEY) || "[]");
    const txt = l.map(e => e.t + "  " + e.que + (e.x ? "  · " + e.x : "") + "  [" + e.o + "]").join("\n");
    console.log("=== BITÁCORA DE LA SESIÓN ===\n" + txt + "\n=== fin ===");
    return txt;
  } catch (e) { return ""; }
};

const GF_CUENTA_KEY = "gf-cuenta";
function marcaCuenta() {
  try { return JSON.parse(localStorage.getItem(GF_CUENTA_KEY) || "null"); } catch (e) { return null; }
}
function marcarCuenta(session) {
  try {
    if (!session || !session.user) return;
    localStorage.setItem(GF_CUENTA_KEY, JSON.stringify({
      uid: session.user.id, refresh_token: session.refresh_token || null, at: Date.now(),
    }));
  } catch (e) {}
}
/* ¿este navegador tuvo granja alguna vez? (la sesión de supabase O nuestra marca) */
function huboGranja() { return !!(sesionGuardada() || (marcaCuenta() || {}).uid); }
const conTope = (p, ms, que) => Promise.race([
  Promise.resolve(p),
  new Promise((_, rej) => setTimeout(() => rej(new Error("tardó demasiado: " + que)), ms)),
]);

/* ¿ESTE NAVEGADOR YA TIENE GRANJA? (24/8 — el fallo más caro de la sesión)
   « Ahora me reinicia el avance… empecé de cero y ahora me manda de cero 3 h después. »
   La cadena era esta: initSave no podía entrar (candado, red, lo que sea) y devolvía false →
   loadFarm salía por su primera línea porque no había UID → el arranque no veía ningún fallo y
   abría LA PUERTA DEL APODO → el jugador escribía su nombre → se creaba una cuenta anónima
   NUEVA → granja vacía, y la vieja huérfana para siempre bajo el UID anterior.
   O sea: un problema de UN MINUTO se comía TRES HORAS de juego. Y lo empeoré yo, porque al
   ponerle topes al login agregué caminos nuevos por los que initSave devuelve false.
   La regla, de acá en más: LA PUERTA DEL APODO ES SOLO PARA NAVEGADORES VÍRGENES. Si hay una
   sesión guardada, este navegador YA tiene granja, y entonces no se pide un apodo: se dice que
   no se pudo entrar y no se toca nada. Perder una sesión de juego es feo; perder la granja
   entera es imperdonable. */
var CUENTA_PREVIA = false;

async function initSave() {
  try {
    CUENTA_PREVIA = huboGranja();   // se mira ANTES de tocar nada
    sesionLog("arranque", CUENTA_PREVIA ? "este navegador YA tenía granja" : "navegador virgen");
    if (!window.supabase || !window.supabase.createClient) return false;
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { lock: candadoDeEstaPagina } });
    let session = null;
    try {
      const r = await conTope(sb.auth.getSession(), 8000, "getSession");
      session = r && r.data ? r.data.session : null;
    } catch (e) {
      /* el candado o la red se colgaron. NO se inventa una cuenta nueva acá: si este navegador
         ya tenía uña, crear otra anónima lo dejaría mirando una granja vacía… y el primer
         guardado la escribiría encima de la buena. Se mira el guardado local y se decide. */
      console.warn("getSession:", e.message);
      sesionLog("getSession no contestó", e.message);
      const guardada = sesionGuardada() || (marcaCuenta() || {}).uid;
      if (guardada) {
        console.warn("hay sesión guardada: se reintenta una vez antes de rendirse");
        try {
          const r2 = await conTope(sb.auth.getSession(), 8000, "getSession (2)");
          session = r2 && r2.data ? r2.data.session : null;
        } catch (e2) { console.warn("getSession (2):", e2.message); }
        if (!session) return false;   // hay cuenta pero no se puede leer: que falle FUERTE y no toque nada
      }
      // sin sesión guardada: es un navegador virgen, se puede crear la cuenta con tranquilidad
    }
    /* ---- REVIVIR ANTES DE CREAR (24/8) --------------------------------------------------
       Acá es donde se perdían las granjas: sin sesión, el paso siguiente creaba una cuenta
       nueva. Pero "sin sesión" no quiere decir "sin cuenta" — la librería borra la suya sola
       cuando la considera inválida. Si tenemos NUESTRA copia de la llave, primero se intenta
       revivir la de siempre. Solo si eso falla se considera crear una nueva, y solo si el
       navegador nunca tuvo granja. */
    if (!session) {
      const marca = marcaCuenta();
      if (marca && marca.refresh_token) {
        console.warn("supabase no tiene sesión, pero este navegador SÍ tuvo granja: se intenta revivir");
        try {
          const r = await conTope(sb.auth.refreshSession({ refresh_token: marca.refresh_token }), 12000, "refreshSession");
          if (r && r.data && r.data.session) {
            session = r.data.session;
            console.warn("sesión revivida: la granja de siempre sigue siendo tuya");
            sesionLog("sesión REVIVIDA con nuestra copia de la llave");
          } else if (r && r.error) { console.warn("no se pudo revivir:", r.error.message); sesionLog("no se pudo revivir", r.error.message); }
        } catch (e) { console.warn("refreshSession:", e.message); }
      }
    }
    /* si hubo granja y no se pudo revivir, NO se crea otra: se falla y el jugador ve el cartel.
       Una granja inalcanzable se puede recuperar mañana; una granja huérfana, nunca. */
    if (!session && CUENTA_PREVIA) {
      console.warn("este navegador tuvo granja y no se pudo abrir la sesión: no se crea ninguna cuenta nueva");
      sesionLog("SIN SESIÓN pero con granja previa: no se crea cuenta nueva");
      return false;
    }
    if (!session) {
      const { data, error } = await conTope(sb.auth.signInAnonymously(), 15000, "signInAnonymously");
      if (error) { console.warn("Login anónimo falló (¿está habilitado en Supabase?):", error.message); sesionLog("login anónimo falló", error.message); return false; }
      sesionLog("cuenta anónima NUEVA creada");
      session = data.session;
    }
    if (!session || !session.user) return false;
    UID = session.user.id;
    marcarCuenta(session);   // nuestra copia de la llave, para la próxima vez
    /* y se mantiene fresca: cada vez que la librería renueva el token, guardamos el nuevo. Sin
       esto, nuestra copia envejece y el día que haga falta ya no sirve para revivir nada. */
    try {
      sb.auth.onAuthStateChange((ev, s) => {
        if (s && s.user) marcarCuenta(s);
        /* SIGNED_OUT sin que nadie apretara nada es EXACTAMENTE el momento que veníamos
           adivinando: supabase decidió que la sesión no servía. Queda anotado con hora. */
        if (ev === "SIGNED_OUT" || ev === "TOKEN_REFRESHED" || ev === "USER_UPDATED") sesionLog("auth: " + ev);
      });
    } catch (e) {}
    return true;
  } catch (e) { console.warn("initSave error:", e); return false; }
}

// campos de progreso que guardamos (no world/cooldowns/buffs, que son de la sesión)
function snapshot() {
  /* 25/8 Pesca v3: pescaDesde (el reloj de cargas), senales (las que te esperan), escamas,
     vistos y estrellaMax (el álbum con estrellas) y pescaTiene (el señuelo, que no se gasta).
     OJO con los comentarios AL FINAL de una línea de este objeto: se comen lo que sigue. */
  return { plata: G.plata, golden: G.golden, level: G.level, prestige: G.prestige, iniciado: G.iniciado,
    res: G.res, picks: G.picks, skills: G.skills, fish: G.fish, plots: G.plots, nodos: G.nodos, expansiones: G.expansiones, pescaHasta: G.pescaHasta, pescaDesde: G.pescaDesde, senales: G.senales, escamas: G.escamas, vistos: G.vistos, estrellaMax: G.estrellaMax, pescaTiene: G.pescaTiene, runaOro: G.runaOro, buffs: G.buffs, seeds: G.seeds, selSeed: G.selSeed,
    tools: G.tools, sflStock: true, invRows: G.invRows, slots: G.slots, hotbar: G.hotbar, hotSel: G.hotSel, hbInit: G.hbInit, layout: G.layout,
    daily: G.daily, plotsOwned: G.plotsOwned, plotsCompradas: G.plotsCompradas, plotsFicha: G.plotsFicha, expParcelasDadas: G.expParcelasDadas, seedBuys: G.seedBuys, built: G.built,
    hp: G.hp, hpMax: G.hpMax, combatXp: G.combatXp, stam: G.stam, stamAcc: G.stamAcc, stamFullAt: G.stamFullAt, stamRec: G.stamRec, pass: G.pass, tuto: G.tuto, firstSeeds: G.firstSeeds,   // 24/8: stamFullAt — la recarga de 4 h es de reloj real
    stats: G.stats, statsBase: G.statsBase, chestCap: G.chestCap, edif2: G.edif2, cosmeticos: G.cosmeticos, animals: G.animals, armor: G.armor, armorEq: G.armorEq, ofrendaPts: G.ofrendaPts, ofrendaLog: G.ofrendaLog, nodoUsos: G.nodoUsos, cosEq: G.cosEq, incursion: G.incursion, incDia: G.incDia, zonaCdHasta: G.zonaCdHasta, zonaViaje: G.zonaViaje, decos: G.decos, decoBolsa: G.decoBolsa, godHand: G.godHand, zonasVistas: G.zonasVistas, visto: nowMs(), dummyTrain: G.dummyTrain, swordOwned: G.swordOwned, bowOwned: G.bowOwned, swordWoodOwned: G.swordWoodOwned, gear: G.gear,
    armasUnlocked: G.armasUnlocked, editVisto: G.editVisto, treesOpen: G.treesOpen, rocksOpen: G.rocksOpen, firstCropDone: G.firstCropDone, weapons: G.weapons,
    dishes: G.dishes, cooking: G.cooking, horno: G.horno, chests: G.chests, dummyUsedAt: G.dummyUsedAt,   // 24/8: la cola del Horno
    armCd: G.armCd, mkPend: G.mkPend,
    layoutPlots: G.layoutPlots, layoutPond: G.layoutPond, ghInv: G.ghInv,
    planos: G.planos, obras: G.obras, obraDep: G.obraDep, emergBuys: G.emergBuys, buzonLeidas: G.buzonLeidas, buzonArchivo: G.buzonArchivo, kitReclamado: G.kitReclamado, excav: G.excav, vales: G.vales, pedidos: G.pedidos, regalos: G.regalos, cobertizo: G.cobertizo, goblin: G.goblin, logros: G.logros, doma: G.doma };   // 22/8: logros cobrados (🏆) + el bicho domado   // 22/8: el Mercader Goblin recuerda su trato del día   // buzón + kit + excavaciones (15/8) · tablón + vales (16/8)   // blueprints (12/8) · capítulos + emergencia (14/8)
}
// "huella" del estado guardable (incluye el apodo); si no cambia, no hay nada que guardar
function snapKey() { return JSON.stringify({ n: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), d: snapshot() }); }

/* ============ CARGAR UNA PARTIDA, EN TRES FASES (20/8) ==============================
   Dirección: "cada cosa que tocamos rompe otras".
   Esto eran 239 líneas seguidas en las que se mezclaban tres trabajos distintos —copiar el
   guardado, arreglar guardados viejos y calcular lo que se deduce— y en las que el ORDEN importaba
   sin estar escrito en ninguna parte. Ese orden implícito nos costó las celdas oscuras: una
   migración colocada antes de los datos que migra.
   Ahora son tres fases con nombre y un orden que se lee de un vistazo:
     1. APLICAR  — copiar el guardado al estado. Solo asignaciones, sin lógica.
     2. MIGRAR   — arreglar lo que traen las partidas viejas. Siempre después de la 1.
     3. DERIVAR  — calcular lo que no se guarda (vida máxima, paso del tutorial, regalos).
   Regla: si algo LEE otra parte del estado, no va en la fase 1.                                 */
function hydrate(d) {
  if (!d) return;
  /* ---- FASE 1 · APLICAR ---- */
  ["plata", "golden", "level", "prestige", "week"].forEach(k => { if (typeof d[k] === "number") G[k] = d[k]; });
  if (d.res) G.res = Object.assign({}, G.res, d.res);
  if (d.skills) G.skills = Object.assign({}, G.skills, d.skills);
  if (d.fish) G.fish = Object.assign({}, G.fish, d.fish);
  if (typeof d.iniciado === "number") G.iniciado = d.iniciado;
  else if (!G.iniciado) G.iniciado = Date.now() - ((d.week || 1) - 1) * 7 * 86400000;   // migración de G.week
  if (Array.isArray(d.plots)) G.plots = d.plots;
  // 18/8: enfriamientos de árboles, rocas y vetas. Antes no se guardaban y cualquier recarga —o
  // un viaje a la Zona Negra— los dejaba todos listos otra vez, que era barra libre de material.
  if (d.nodos && typeof d.nodos === "object") G.nodos = d.nodos;
  if (typeof d.pescaHasta === "number") G.pescaHasta = d.pescaHasta;
  /* 25/8 Pesca v3 — el reloj de cargas y lo que el agua te guardó. La migración es sola: quien
     no tenga pescaDesde arranca su reloj AHORA, sin cargas, que es lo honesto (no se regalan
     cuatro lances por actualizar, ni se le cobra al que ya venía esperando). */
  if (typeof d.pescaDesde === "number") G.pescaDesde = d.pescaDesde;
  if (Array.isArray(d.senales)) G.senales = d.senales;
  if (d.escamas && typeof d.escamas === "object") G.escamas = d.escamas;
  if (d.vistos && typeof d.vistos === "object") G.vistos = d.vistos;
  if (d.estrellaMax && typeof d.estrellaMax === "object") G.estrellaMax = d.estrellaMax;
  if (d.pescaTiene && typeof d.pescaTiene === "object") G.pescaTiene = d.pescaTiene;
  if (d.runaOro && typeof d.runaOro === "object") G.runaOro = d.runaOro;
  if (typeof d.expansiones === "number") G.expansiones = Math.max(0, Math.min(16, d.expansiones));
  // los buffs traen su propio vencimiento: se descartan los que ya caducaron mientras no estabas
  if (Array.isArray(d.buffs)) G.buffs = d.buffs.filter(b => b && b.until > Date.now());
  if (d.seeds) G.seeds = Object.assign({}, G.seeds, d.seeds);
  if (d.selSeed && CROP_DEF[d.selSeed]) G.selSeed = d.selSeed;
  if (d.tools) G.tools = Object.assign({}, G.tools, d.tools);
  if (d.toolsLost) G.toolsLost = d.toolsLost;   // legado (pre-apilables)
  // edificios construibles (viernes 1): las partidas viejas ya los tienen construidos
  // 10/8: la Herrería dejó de ser gratis (5 madera + 2 piedra). A las partidas que YA venían
  // jugando se les respeta construida: nadie pierde un edificio que ya tenía.
  const BUILT0 = { store: false, horno: false, cocina: false, altar: false, establo: false, curtiduria: false, ofrendas: false };
  if (d.built) G.built = Object.assign({}, BUILT0, d.built, { store: d.built.store !== false });
  else G.built = Object.assign({}, BUILT0, { store: true, horno: true, cocina: true });
  if (typeof d.invRows === "number") G.invRows = Math.max(0, Math.min(INV_MAX_ROWS, d.invRows));
  if (Array.isArray(d.slots)) G.slots = d.slots;
  if (Array.isArray(d.hotbar)) G.hotbar = d.hotbar.slice(0, 10);
  if (typeof d.hotSel === "number") G.hotSel = Math.max(0, Math.min(9, d.hotSel));
  if (typeof d.hbInit === "boolean") G.hbInit = d.hbInit;
  if (d.layout && typeof d.layout === "object") G.layout = d.layout;
  if (d.daily && typeof d.daily === "object") G.daily = { day: d.daily.day || 0, last: d.daily.last || "" };
  if (typeof d.plotsOwned === "number") G.plotsOwned = Math.max(2, Math.min(typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60, d.plotsOwned));   // fix #18 (11/8): el tope acá seguía en 12 y el F5 te "devolvía" las parcelas compradas
  if (typeof d.plotsCompradas === "number") G.plotsCompradas = Math.max(0, d.plotsCompradas);   // 20/8: el precio de tienda sube solo con éstas
  G.plotsFicha = Math.max(0, d.plotsFicha || 0);   // 20/8: las de Ficha de parcela (pase) — parte del libro mayor
  if (typeof d.expParcelasDadas === "number") G.expParcelasDadas = Math.max(0, Math.min(16, d.expParcelasDadas));   // 20/8: la FLAG de dirección — qué expansiones ya entregaron su parcela
  if (d.seedBuys && typeof d.seedBuys === "object") G.seedBuys = { date: d.seedBuys.date || "", count: d.seedBuys.count || 0 };
  if (d.goblin && typeof d.goblin === "object") G.goblin = { date: d.goblin.date || "" };   // 22/8: Mercader Goblin
  if (d.logros && typeof d.logros === "object") G.logros = d.logros;   // 22/8: logros cobrados (🏆) — solo llaves true
  if (d.doma && typeof d.doma === "object" && d.doma.bicho) G.doma = d.doma;   // 22/8: el bicho domado viaja entero
  if (typeof d.hpMax === "number") G.hpMax = d.hpMax;
  G.combatXp = (typeof d.combatXp === "number") ? d.combatXp : 0;
  G.stats = (d.stats && typeof d.stats === "object") ? d.stats : {};
  G.statsBase = (d.statsBase && typeof d.statsBase === "object") ? d.statsBase : {};
  // 18/8 (auditoría): si el campo faltaba, la capacidad extra de cofre se perdía PARA SIEMPRE —
  // no hay ningún regalosSync que la recalcule. Ahora se deriva de los niveles ya alcanzados.
  G.chestCap = Number(d.chestCap) || (typeof FARM_COFRE === "object"
    ? Object.keys(FARM_COFRE).reduce((a, k) => a + ((G.level || 1) >= +k ? FARM_COFRE[k] : 0), 0) : 0);
  G.edif2 = (d.edif2 && typeof d.edif2 === "object") ? d.edif2 : {};
  G.cosmeticos = Array.isArray(d.cosmeticos) ? d.cosmeticos : [];
  // Los animales pasaron de "uno por tipo" a una LISTA por tipo (10/8). Los guardados viejos
  // traen un objeto suelto por tipo: se envuelve en lista para que nada se pierda.
  // cuánto tiempo estuviste afuera: lo usa la GOD HAND para sembrar "desde que te fuiste"
  G._ausenteMs = (typeof d.visto === "number" && d.visto > 0) ? Math.max(0, nowMs() - d.visto) : 0;
  G.zonasVistas = Array.isArray(d.zonasVistas) && d.zonasVistas.length ? d.zonasVistas.slice(0, 8) : ["pantano"];
  G.decos = Array.isArray(d.decos) ? d.decos.slice(0, 200) : [];
  G.decoBolsa = (d.decoBolsa && typeof d.decoBolsa === "object") ? d.decoBolsa : {};
  G.godHand = d.godHand === true;
  G.zonaCdHasta = typeof d.zonaCdHasta === "number" ? d.zonaCdHasta : 0;
  G.zonaViaje = (d.zonaViaje && typeof d.zonaViaje === "object") ? d.zonaViaje : null;
  G.animals = {};
  if (d.animals && typeof d.animals === "object") {
    for (const k in d.animals) {
      const v = d.animals[k];
      if (Array.isArray(v)) G.animals[k] = v.slice(0, 20);
      else if (v && typeof v === "object") G.animals[k] = [v];
    }
  }
  G.armor = (d.armor && typeof d.armor === "object") ? d.armor : {};
  G.armorEq = d.armorEq || null;
  G.ofrendaPts = Number(d.ofrendaPts) || 0;
  G.ofrendaLog = Number(d.ofrendaLog) || 0;
  G.nodoUsos = (d.nodoUsos && typeof d.nodoUsos === "object") ? d.nodoUsos : {};
  G.cosEq = (d.cosEq && typeof d.cosEq === "object") ? d.cosEq : null;
  G.incursion = (d.incursion && d.incursion.endAt) ? d.incursion : null;
  G.incDia = (d.incDia && typeof d.incDia === "object") ? d.incDia : null;
  G.dummyTrain = (d.dummyTrain && d.dummyTrain.desde) ? d.dummyTrain : null;
  G.stam = (typeof d.stam === "number") ? d.stam : null;   // null = arranca llena
  G.stamAcc = (typeof d.stamAcc === "number") ? d.stamAcc : 0;
  G.stamFullAt = (typeof d.stamFullAt === "number") ? d.stamFullAt : 0;   // 24/8: cuándo se llena entera
  G.stamRec = (d.stamRec && typeof d.stamRec === "object") ? d.stamRec : null;
  G.pass = (d.pass && typeof d.pass === "object") ? d.pass : null;
  if (d.tuto && typeof d.tuto === "object") G.tuto = d.tuto;
  else G.tuto = { step: 0, n: 0, done: !!(d.firstCropDone || (d.level && d.level > 1) || (d.plata && d.plata > 50)) };   // veteranos: sin tutorial
  // 18/8: tutoMigrar, tutoSync, applyCombatHp y el recorte de vida SE MUDARON AL FINAL de hydrate.
  // Acá corrían antes de cargar la mitad del estado que necesitan leer, y eso los volvía mentirosos:
  //   · tutoMigrar/tutoAutoSkip leen kitReclamado, obras, obraDep, weapons, picks, treesOpen…
  //     que se cargan hasta 70 líneas más abajo. El arreglo del tutorial de hoy no llegaba a hacer
  //     nada acá: se autocuraba de rebote 400 ms después, desde FarmScene.
  //   · applyCombatHp suma la Runa Guardiana (hasta +120 de vida máxima) leyendo gear y weapons,
  //     que tampoco estaban. Y la línea siguiente RECORTABA la vida contra ese máximo mal
  //     calculado: cada F5 te comía vida máxima y vida de verdad.
  if (typeof d.swordOwned === "boolean") G.swordOwned = d.swordOwned;
  if (typeof d.bowOwned === "boolean") G.bowOwned = d.bowOwned;
  G.swordWoodOwned = d.swordWoodOwned === true;
  // ARMAS NUEVAS (doc 2/8) + migración de las viejas: madera→espada_madera, "de Hierro"(bronce)→espada_bronce, arco→arco_madera
  G.weapons = (d.weapons && typeof d.weapons === "object") ? d.weapons : {};
  if (!d.weapons) {
    if (d.swordWoodOwned) G.weapons.espada_madera = { dur: 40 };
    if (d.swordOwned) G.weapons.espada_bronce = { dur: 60 };
    if (d.bowOwned) G.weapons.arco_madera = { dur: 40 };
  }
  // (la migración del ARMA EQUIPADA va más abajo, DESPUÉS de cargar d.gear — si se hace acá
  //  opera sobre el gear por defecto y el jugador queda sin arma equipada para siempre)
  // limpiar armas viejas de hotbar/slots guardados
  const armaVieja = h => h && h.kind === "tool" && (h.key === "sword" || h.key === "sword_wood" || h.key === "bow");
  G.hotbar = (G.hotbar || []).map(h => armaVieja(h) ? null : h);
  if (Array.isArray(G.slots)) G.slots = G.slots.map(sl => armaVieja(sl) ? null : sl);
  G.firstCropDone = d.firstCropDone !== false;   // legado
  G.firstSeeds = (typeof d.firstSeeds === "number") ? d.firstSeeds
    : (d.firstCropDone === false ? FIRST_GROW_N : 0);   // veteranos: 0 (ya no les toca el arranque rápido)
  G.armasUnlocked = d.armasUnlocked === true;
  G.editVisto = d.editVisto === true;   // 19/8: "ya vio el modo edición" (cierra el último paso del tutorial)   // viernes (2): la pestaña Armas se paga (también para veteranos)
  // viernes (2): sets de árboles/piedras abiertos; compat con el guardado por contador de la primera versión
  G.treesOpen = Array.isArray(d.treesOpen) ? d.treesOpen.filter(n => typeof n === "number") : (typeof d.treesOwned === "number" ? Array.from({length: Math.max(1, Math.min(6, d.treesOwned))}, (_, i) => i) : [0]);
  G.rocksOpen = Array.isArray(d.rocksOpen) ? d.rocksOpen.filter(n => typeof n === "number") : (typeof d.rocksOwned === "number" ? Array.from({length: Math.max(1, Math.min(6, d.rocksOwned))}, (_, i) => i) : [0]);
  if (!G.treesOpen.length) G.treesOpen = [0]; if (!G.rocksOpen.length) G.rocksOpen = [0];
  if (d.gear && typeof d.gear === "object") G.gear = Object.assign({ casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false }, d.gear);
  // migración (detalles jueves): partidas viejas sin slot de arma/munición conservan su comportamiento
  const og = d.gear || {};
  if (!("arma" in og)) G.gear.arma = d.swordOwned ? "espada_bronce" : (d.bowOwned ? "arco_madera" : null);   // ids NUEVOS
  if (!("municion" in og)) G.gear.municion = ((d.res && d.res.flecha) || 0) > 0;
  // migración del arma equipada + validación (acá sí, con el gear guardado ya cargado)
  const mapArma = { sword_wood: "espada_madera", sword: "espada_bronce", bow: "arco_madera" };
  if (mapArma[G.gear.arma]) G.gear.arma = mapArma[G.gear.arma];
  if (G.gear.arma && !(typeof ARM_DEF !== "undefined" && ARM_DEF[G.gear.arma] && G.weapons[G.gear.arma])) G.gear.arma = null;
  if (d.dishes && typeof d.dishes === "object") G.dishes = Object.assign({}, d.dishes);
  // REPARACIÓN: un bucle de la Cocina (arreglado el 4/8) dejó partidas con miles de platos, y con
  // eso la bolsa no terminaba de armarse y el juego no cargaba. Se recorta a un tope sano.
  for (const k in G.dishes) {
    const n = Number(G.dishes[k]);
    G.dishes[k] = (!isFinite(n) || n < 0) ? 0 : Math.min(999, Math.floor(n));
  }
  // la Cocina pasó a tener varias ollas: los guardados viejos traían un solo objeto
  // 24/8: la cola del Horno viaja igual que las ollas (mismo tope de cordura)
  G.horno = Array.isArray(d.horno) ? d.horno.filter(p => p && p.id && p.listoAt).slice(0, 12) : [];
  if (Array.isArray(d.cooking)) G.cooking = d.cooking.filter(c => c && c.endAt).slice(0, 12);   // tope: ninguna partida tiene 12 ollas
  else if (d.cooking && typeof d.cooking === "object" && d.cooking.endAt) G.cooking = [d.cooking];
  else G.cooking = [];
  // OJO (10/8): NO recortar a 10. Un cofre crafteado con la granja alta tiene 10 + G.chestCap
  // espacios (hasta 45 en granja 33) y la ventana los llena. El slice(0,10) de antes borraba
  // en silencio todo lo guardado del espacio 11 en adelante en cada recarga.
  if (Array.isArray(d.chests)) {
    const tope = 10 + Math.max(0, G.chestCap || 0);
    G.chests = d.chests.slice(0, 50).map(c => {
      const its = Array.isArray(c.items) ? c.items.slice(0, Math.max(tope, c.items.length)) : [];
      while (its.length < tope) its.push(null);           // los espacios ganados por nivel aparecen solos
      return { col: (typeof c.col === "number" ? c.col : null), row: (typeof c.row === "number" ? c.row : null), items: its };
    });
  }
  if (typeof d.dummyUsedAt === "number") G.dummyUsedAt = d.dummyUsedAt;
  if (d.armCd && typeof d.armCd === "object") G.armCd = d.armCd;   // el enfriamiento de forja ya no se saltea con F5
  G.mkPend = Array.isArray(d.mkPend) ? d.mkPend : [];               // entregas pendientes del Mercado
  G.testeoDado = d.testeoDado === true;                             // el regalo del modo testeo se da una sola vez
  if (d.layoutPlots && typeof d.layoutPlots === "object") G.layoutPlots = d.layoutPlots;
  if (Array.isArray(d.ghInv)) G.ghInv = d.ghInv;   // GOD HAND 2.0 (11/8): su inventario de semillas
  if (d.planos && typeof d.planos === "object") G.planos = d.planos;     // blueprints (12/8)
  if (d.obras && typeof d.obras === "object") G.obras = d.obras;

  if (d.capsClaim && typeof d.capsClaim === "object") G.capsClaim = d.capsClaim;   // capítulos reclamados (14/8)
  if (d.emergBuys && typeof d.emergBuys === "object") G.emergBuys = d.emergBuys;   // kit de emergencia (14/8)
  if (d.buzonLeidas && typeof d.buzonLeidas === "object") G.buzonLeidas = d.buzonLeidas;   // cartas leídas del buzón (15/8)
  if (Array.isArray(d.buzonArchivo)) G.buzonArchivo = d.buzonArchivo;   // archivo de cartas (15/8)
  // kit de bienvenida (15/8): los guardados VIEJOS ya lo recibieron con el arranque de antes
  G.kitReclamado = d.kitReclamado != null ? !!d.kitReclamado : true;
  if (d.excav && typeof d.excav === "object") G.excav = d.excav;   // montículos del día (15/8)
  if (typeof d.vales === "number") G.vales = Math.max(0, d.vales);   // tablón de pedidos (16/8)
  if (d.pedidos && typeof d.pedidos === "object") G.pedidos = d.pedidos;
  if (d.regalos && typeof d.regalos === "object") G.regalos = { tree: d.regalos.tree || 0, rock: d.regalos.rock || 0, plot: d.regalos.plot || 0 };   // premios del nivel esperando en el baúl (16/8)
  // 18/8: la segunda bolsa — lo ya recogido del baúl y todavía sin colocar (el Cobertizo)
  if (d.cobertizo && typeof d.cobertizo === "object") G.cobertizo = { tree: d.cobertizo.tree || 0, rock: d.cobertizo.rock || 0, plot: d.cobertizo.plot || 0 };
  else G.cobertizo = { tree: 0, rock: 0, plot: 0 };
  if (d.obraDep && typeof d.obraDep === "object") G.obraDep = d.obraDep;
  if (d.layoutPond && typeof d.layoutPond === "object") G.layoutPond = { col: d.layoutPond.col, row: d.layoutPond.row };
  if (d.picks && d.picks.owned && d.picks.dur) G.picks = d.picks;

  /* ---- Y las tres fases siguientes, en ORDEN Y SIN EXCEPCIONES ---- */
  migrarGuardado(d);     // arregla lo que traen las partidas viejas
  derivarEstado(d);      // calcula lo que se deduce del estado ya completo
  /* LA DOMA (22/8): el turno del bicho corre acá, con el estado ENTERO delante (necesita
     G.nodos, la bolsa y d.visto). Solo recoge lo madurado en tu ausencia. */
  try { if (typeof domaTrabajar === "function" && typeof d.visto === "number") domaTrabajar(d.visto); } catch (e) {}
}

/* ============ FASE 2 · MIGRAR (20/8) ================================================
   Todo lo que arregla un guardado viejo vive aquí, y aquí corre SIEMPRE DESPUÉS de que la fase 1
   haya copiado el guardado al estado. No es una preferencia de estilo: es la lección más cara de
   esta semana. La limpieza de posiciones fantasma estaba escrita cien líneas por encima de donde
   se cargaba `d.layout`, así que recorría un objeto vacío, no borraba nada, y el guardado entraba
   entero con sus fantasmas dentro. Estuvo dos días "hecha" sin haberse ejecutado ni una vez, y
   dirección la vio en su partida antes que yo en el código.
   Con las migraciones en su propia función, llamada al final, ese error no se puede repetir: para
   cometerlo habría que mover la llamada, no una línea suelta en medio de doscientas.           */
function migrarGuardado(d) {
  // la azada se retiró del juego (pedido del diseñador 31/7): se limpia de hotbar y bolsa guardadas
  G.hotbar = (G.hotbar || []).map(h => (h && h.kind === "tool" && h.key === "hoe") ? null : h);
  if (Array.isArray(G.slots)) G.slots = G.slots.map(sl => (sl && sl.kind === "tool" && sl.key === "hoe") ? null : sl);

  /* 18/8 — MUDANZA AL COBERTIZO. Los planos, los cofres sin colocar, los adornos y los regalos
     del baúl dejaron de vivir en la barra rápida y en la bolsa: ahora están en el Cobertizo.
     A quien ya los tenía enganchados en la barra hay que soltárselos, o le quedan huecos muertos
     que no responden. La bolsa se limpia sola (syncSlots quita lo que canonicalStacks ya no lista);
     la barra no, porque el jugador la ordena a mano y nadie la reconcilia. */
  {
    const MUDADOS = ["plano", "chest", "regalo", "deco"];
    const antes = (G.hotbar || []).filter(h => h && MUDADOS.includes(h.kind)).length;
    if (antes) {
      G.hotbar = G.hotbar.map(h => (h && MUDADOS.includes(h.kind)) ? null : h);
      G._avisoCobertizo = antes;   // ui.js lo cuenta una vez y lo borra
    }
  }

  // migración ÚNICA al modelo apilable (31/7): la durabilidad vieja pasa a ser "1 herramienta"
  if (!d.sflStock) {
    for (const k of ["axe", "rod"]) if ((G.tools[k] || 0) > 0) G.tools[k] = 1;
    for (const k in G.picks.dur) if ((G.picks.dur[k] || 0) > 0) G.picks.dur[k] = 1;
    if (d.toolsLost) for (const k in d.toolsLost) if (d.toolsLost[k]) G.tools[k] = 0;
  }

  /* ============ LAS PARCELAS DE LAS EXPANSIONES YA COMPRADAS (20/8, dirección) ======
     "Si hay algún jugador que ya tiene expansiones, debes colocarle los nodos y las parcelas que
      toquen a cada expansión. El diseñador tiene la 1 y la 2 y no tiene ni los nodos ni las
      parcelas en esos lugares."
     Reproducido y medido con su guardado (nivel 5, dos expansiones):
       · los NODOS sí están — el árbol y la roca de cada bloque aparecen solos, porque su existencia
         se deduce de `exp < G.expansiones` y no hace falta guardar nada;
       · la PARCELA no, y la razón es el orden en que se hicieron las cosas: la entrega ocurre
         DENTRO de expansionComprar(), o sea que solo la recibe quien compra la expansión DESPUÉS
         de que ese código existiera. Quien ya había expandido se quedó sin ella para siempre.
     Y no vale dejar que regalosSync se la dé como premio al baúl: dirección fue explícito en que
     dentro del bloque nuevo la parcela tiene que estar YA PUESTA, igual que el árbol y la roca.
     Cuando comprás terreno despejado, lo que hay dentro es tuyo y está en su sitio.
     20/8, MÁS TARDE — LA IDEMPOTENCIA POSICIONAL ERA UNA FÁBRICA DE PARCELAS. La primera versión
     preguntaba "¿hay una parcela tuya DENTRO del bloque?". Pero mover la parcela regalada a otro
     lado es un gesto legítimo (y natural: "esta no la pedí acá") — y en cuanto el jugador la
     sacaba del bloque, CADA RECARGA regalaba otra. Dirección lo vio en vivo: "están apareciendo
     parcelas de la nada, cada F5 recibo una".
     20/8, TERCERA VUELTA — LA FLAG DE DIRECCIÓN. "Las expansiones deberían tener guardado lo que
     entregan: una flag que diga que ya se entregó, y no vuelve a entregarse por más F5 que hagas."
     Exacto. La bandera es G.expParcelasDadas (la entrega es secuencial: basta contar hasta dónde
     se llegó), se guarda con la partida y expansionComprar la marca al entregar. Desde acá:
       · guardado CON la flag → manda la flag: se entregan solo las pendientes (dadas < compradas
         de terreno) y NUNCA se recorta ni se vuelve a regalar. La posición no pinta nada.
       · guardado SIN la flag (de antes de hoy) → UNA sola vez se hace la contabilidad
         (esperadas = 3 + regalos + compradas + fichas): faltantes se entregan, fantasmas del bug
         del F5 se recortan — y la flag nace, para que esto no vuelva a decidirse nunca. */
  try {
    G.layoutPlots = G.layoutPlots || {};
    const n = G.expansiones || 0;
    const tope = (typeof PLOT_MAX !== "undefined") ? PLOT_MAX : 60;
    /* entregar la parcela del bloque i: en su celda reservada, o la primera libre del bloque */
    const entregarDe = (i) => {
      const b = GF.EXPANSIONES && GF.EXPANSIONES[i];
      if (!b || !b.parcela) return false;
      if ((G.plotsOwned || 3) >= tope) return false;
      let destino = b.parcela;
      if (GF.celdaOcupada && GF.celdaOcupada(destino.col, destino.row)) {
        destino = null;
        for (let r = b.r0; r < b.r1 && !destino; r++)
          for (let c = b.c0; c < b.c1 && !destino; c++)
            if (GF.tuyo(c, r) && !GF.enCerca(c, r) && !GF.celdaOcupada(c, r)) destino = { col: c, row: r };
      }
      const idx = G.plotsOwned || 3;
      if (destino) G.layoutPlots[idx] = { col: destino.col, row: destino.row };
      G.plotsOwned = idx + 1;   // sin celda libre en el bloque queda pendiente de colocar, pero es tuya
      return true;
    };
    if (typeof d.expParcelasDadas === "number") {
      /* ---- LA FLAG MANDA ---- */
      let dadas = 0;
      for (let i = G.expParcelasDadas; i < n; i++) { entregarDe(i); dadas++; }
      if (dadas) {
        G.expParcelasDadas = n;
        console.info("[migración] " + dadas + " parcela(s) de expansión pendientes, entregadas (flag)");
        if (GF.ocupCambio) GF.ocupCambio();
      }
      throw { salidaLimpia: true };   // el resto del bloque es solo para guardados sin flag
    }
    /* ---- GUARDADO SIN FLAG: la contabilidad, una única vez ---- */
    let regalos = 0;
    for (let i = 0; i < n; i++) if (GF.EXPANSIONES && GF.EXPANSIONES[i] && GF.EXPANSIONES[i].parcela) regalos++;
    /* el contador de compradas viene del guardado; los guardados de antes de hoy lo deducen UNA
       vez, ANTES de entregar nada (si se dedujera después, los regalos contarían como compras) */
    const fichas = Math.max(0, G.plotsFicha || 0);   // las canjeadas con Ficha de parcela (pase)
    const compradas = (typeof d.plotsCompradas === "number")
      ? Math.max(0, d.plotsCompradas)
      : Math.max(0, (G.plotsOwned || 3) - 3 - regalos - fichas);
    G.plotsCompradas = compradas;
    G.expParcelasDadas = n;   // la flag NACE: todo lo de los bloques ya comprados queda por entregado
    const esperadas = Math.min(tope, 3 + regalos + compradas + fichas);
    const tiene = G.plotsOwned || 3;
    if (tiene < esperadas) {
      /* faltan: se colocan dentro de los bloques que no tengan parcela propia (la celda que el
         bloque reservó; si está ocupada, la primera libre del bloque) */
      const puestas = Object.keys(G.layoutPlots).map(k => G.layoutPlots[k]);
      let porDar = esperadas - tiene, dadas = 0;
      for (let i = 0; i < n && porDar > 0; i++) {
        const b = GF.EXPANSIONES[i]; if (!b || !b.parcela) continue;
        const dentro = (c, r) => c >= b.c0 && c < b.c1 && r >= b.r0 && r < b.r1;
        if (puestas.some(p => p && dentro(p.col, p.row))) continue;   // este bloque ya tiene la suya
        let destino = b.parcela;
        if (GF.celdaOcupada && GF.celdaOcupada(destino.col, destino.row)) {
          destino = null;
          for (let r = b.r0; r < b.r1 && !destino; r++)
            for (let c = b.c0; c < b.c1 && !destino; c++)
              if (GF.tuyo(c, r) && !GF.enCerca(c, r) && !GF.celdaOcupada(c, r)) destino = { col: c, row: r };
        }
        if (!destino) continue;
        const idx = G.plotsOwned || 3;
        G.layoutPlots[idx] = { col: destino.col, row: destino.row };
        G.plotsOwned = idx + 1;
        puestas.push(destino);
        porDar--; dadas++;
      }
      /* si aún faltan (todos los bloques ya tienen la suya), se acreditan igual: quedan
         pendientes de colocar desde el modo edición, como una comprada */
      if (porDar > 0) { G.plotsOwned = (G.plotsOwned || 3) + porDar; dadas += porDar; }
      if (dadas) {
        console.info("[migración] " + dadas + " parcela(s) que faltaban por las expansiones, entregadas");
        if (GF.ocupCambio) GF.ocupCambio();
      }
    } else if (tiene > esperadas) {
      /* sobran: los fantasmas del bug del F5 — se recortan las últimas, que son las duplicadas */
      for (let k = esperadas; k < tiene; k++) delete G.layoutPlots[k];
      G.plotsOwned = esperadas;
      console.info("[migración] " + (tiene - esperadas) + " parcela(s) fantasma recortadas (bug del F5)");
      if (GF.ocupCambio) GF.ocupCambio();
    }
  } catch (e) {}

  /* ============ LIMPIEZA DE FANTASMAS DEL GUARDADO =================================
     18/8 — Los guardados de antes de los planos traen posiciones en G.layout para edificios que
     hoy no existen hasta colocar su plano. Esa entrada ya no implica existencia (se arregló en
     objetoPresente), pero además hay que BORRARLA: si no, el día que el jugador coloque el plano
     el edificio salta a la posición vieja en vez de a la que eligió, y mientras tanto esas celdas
     salen sombreadas al colocar — zonas oscuras donde no se ve nada y no dejan poner nada.

     20/8 — Y LA LIMPIEZA NUNCA CORRIÓ. Estaba escrita cien líneas más arriba, ANTES de que este
     mismo cargador copiara `d.layout` y `d.obras` del guardado al estado. O sea que recorría un
     G.layout vacío, no borraba nada, y acto seguido el guardado entraba entero con sus fantasmas
     dentro. El test la daba por buena porque la llamaba a mano, con los datos ya puestos — probaba
     la función, no el momento en que se usa. Dirección lo vio en su partida: "¿por qué no lo
     quitaste?". Estaba quitado en el código y no en el juego, que es lo mismo que no estarlo.
     Ahora corre acá, con layout, built y obras ya cargados, y de paso barre dos fantasmas más que
     el original no miraba:
       · índices que ya no existen — el mundo se reorganizó el 17/8 y WORLD_OBJECTS cambió de
         orden y de largo; una entrada vieja apunta hoy a otra cosa o a nada;
       · posiciones fuera del terreno que poseés, que no se pueden ni ver ni alcanzar.          */
  try {
    if (G.layout && GF.WORLD_OBJECTS) {
      const t = GF.terreno ? GF.terreno() : null;
      let sinPlano = 0, huerfanas = 0, fuera = 0;
      for (const k in G.layout) {
        const o = GF.WORLD_OBJECTS[k], lp = G.layout[k];
        if (!o) { delete G.layout[k]; huerfanas++; continue; }
        if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] &&
            !((G.built && G.built[o.type]) || (G.obras && G.obras[o.type]))) {
          delete G.layout[k]; sinPlano++; continue;
        }
        if (t && lp && GF.TILE) {
          const c = Math.round(lp.cx / GF.TILE), r = Math.round(lp.by / GF.TILE) - 1;
          if (c < t.c0 || c >= t.c1 || r < t.r0 || r >= t.r1) { delete G.layout[k]; fuera++; }
        }
      }
      const n = sinPlano + huerfanas + fuera;
      if (n) console.info("[migración] " + n + " posiciones fantasma borradas (" +
        sinPlano + " sin plano, " + huerfanas + " de objetos que ya no existen, " + fuera + " fuera del terreno)");
      if (n && GF.ocupCambio) GF.ocupCambio();   // el mapa de ocupación tiene que rehacerse
    }
  } catch (e) {}
}

/* ============ FASE 3 · DERIVAR (20/8) ===============================================
   Lo que no se guarda porque se CALCULA: la vida máxima sale del equipo, el paso del tutorial sale
   de lo que el jugador ya hizo, los regalos pendientes salen de su nivel. Corre al final por la
   misma razón que la fase 2 — necesita el estado entero delante — y se separa de ella porque son
   cosas distintas: migrar arregla el pasado, derivar calcula el presente.                      */
function derivarEstado(d) {
  try { if (typeof regalosSync === "function") regalosSync(); } catch (e) {}   // guardados viejos: recalcula lo que le corresponde por su nivel
  if (typeof applyCombatHp === "function") applyCombatHp();   // vida máxima: ahora sí ve gear y weapons
  if (typeof d.hp === "number") G.hp = Math.max(1, Math.min(G.hpMax, d.hp));
  if (typeof tutoMigrar === "function") tutoMigrar();   // salta los pasos ya cumplidos, con los datos delante
  if (typeof tutoSync === "function") tutoSync(true);   // el cartel y la flecha, con el paso definitivo
}

const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));

/* 18/8 — EL FALLO MÁS GRAVE DE TODA LA AUDITORÍA, y era anterior a las expansiones.
   loadFarm devolvía `false` en DOS casos que no son lo mismo: "este jugador es nuevo" y "no pude
   leer la nube". main.js trataba los dos igual: mostraba la puerta del apodo, el jugador escribía
   un nombre, y eso disparaba un saveFarm() con G EN LOS VALORES POR DEFECTO. La granja de la nube
   quedaba pisada por una partida de nivel 1. Un parpadeo de red al entrar borraba la partida.
   Ahora hay una bandera: hasta que un hydrate() no termine COMPLETO, saveFarm no escribe nada. */
var CARGA_OK = false;      // ¿se llegó a leer y aplicar el guardado de la nube?
var CARGA_FALLO = false;   // ¿falló la lectura? (distinto de "no hay fila")
async function loadFarm() {
  /* 24/8 — ACÁ ESTABA LA PUERTA POR LA QUE SE PERDÍA LA GRANJA. "Sin nube no hay nada que
     pisar" vale cuando el navegador es virgen. Pero si HAY una sesión guardada y aun así no
     tenemos UID, es exactamente lo contrario: hay una granja y no la pudimos alcanzar. Dar
     CARGA_OK ahí es autorizar a escribir encima de algo que ni siquiera leímos. */
  if (!sb || !UID) {
    if (CUENTA_PREVIA) {
      CARGA_FALLO = true;
      console.warn("loadFarm: este navegador tiene cuenta pero no se pudo entrar. Guardado BLOQUEADO.");
      return false;
    }
    CARGA_OK = true; return false;   // navegador virgen: no hay nada que pisar
  }
  // hasta 3 intentos con espera creciente: la red del jugador puede parpadear justo al entrar
  for (let intento = 0; intento < 3; intento++) {
    try {
      const { data, error } = await sb.from("farms").select("data,name").eq("user_id", UID).maybeSingle();
      if (error) { console.warn("loadFarm:", error.message); await sleepMs(1200 * (intento + 1)); continue; }
      if (data) {
        if (data.data) hydrate(data.data);
        /* 25/8 — LA RED, ACÁ. Si la nube trajo una granja con MENOS progreso que la copia que
           este navegador guardó (nivel más bajo, o mucha menos plata), algo salió mal en algún
           lado y escribir encima sería consumar la pérdida. Se restaura la copia y se avisa: es
           la diferencia entre « perdí tres horas » y « el juego las tenía guardadas ». */
        const c = copiaLeer();
        if (copiaEsMejor(c)) {
          sesionLog("la nube traía MENOS que la copia local: se restaura", "nube nv" + (G.level || 1) + " · copia nv" + c.nivel);
          hydrate(c.data);
          if (typeof log === "function") log("💾 La nube tenía una versión más vieja de tu granja. Se recuperó la que este navegador tenía guardada (nivel " + c.nivel + ").", "gold");
          if (typeof toast === "function") toast("Granja recuperada del respaldo local");
        }
        CARGA_OK = true;   // recién ACÁ, con el hydrate terminado, se puede volver a escribir
        // El guardado trae el nombre CON el título ("[Veterano] Juan"). Si lo metíamos tal cual
        // en NICK, el guardado siguiente escribía "[Veterano] [Veterano] Juan" y crecía un
        // prefijo por sesión en el ranking, el chat y el mercado (10/8).
        if (data.name && !window.NICK) window.NICK = String(data.name).replace(/^\s*(\[[^\]]*\]\s*)+/, "") || data.name;
        lastSavedKey = snapKey();   // referencia: lo que acabás de cargar ya está guardado
        return true;
      }
      // primera vez de verdad: no hay fila. Es seguro crearla.
      CARGA_OK = true;
      await saveFarm();
      return false;
    } catch (e) { console.warn("loadFarm error:", e); await sleepMs(1200 * (intento + 1)); }
  }
  // se agotaron los tres intentos: NO es un jugador nuevo, es que no se pudo leer.
  CARGA_FALLO = true;
  console.warn("loadFarm: no se pudo leer la granja. Guardado BLOQUEADO para no pisarla.");
  return false;
}

// force=true guarda siempre; sin force, solo si el progreso cambió desde el último guardado
/* ============ EL RESPALDO LOCAL (25/8, dirección) =====================================
   « Si el jugador no borra la caché, no tiene por qué resetearse la partida. »
   La granja vive en la nube y la llave en el navegador. Si la llave se pierde —por lo que sea—
   hoy la granja queda inalcanzable y el jugador ve una vacía. Eso es lo que hay que volver
   imposible, y no alcanza con cuidar la llave: hace falta que la GRANJA también tenga una copia
   de este lado.
   Cada guardado deja una copia local. No reemplaza a la nube (sigue siendo la verdad, y es la
   que sobrevive al cambio de máquina): es la red que hace que, si el juego alguna vez arranca
   con una granja vacía teniendo una copia con progreso, se pueda ver y recuperar en vez de
   escribir el vacío encima. Y sí: borrar la caché se la lleva. Eso es lo que dice el jugador que
   quiere, y es lo único que debería llevársela. */
const GF_COPIA_KEY = "gf-granja-copia";
function copiaGuardar(snap) {
  try {
    localStorage.setItem(GF_COPIA_KEY, JSON.stringify({
      uid: UID, at: Date.now(), nivel: G.level || 1, plata: Math.floor(G.plata || 0), data: snap,
    }));
  } catch (e) { /* sin espacio: la nube sigue siendo la verdad */ }
}
function copiaLeer() { try { return JSON.parse(localStorage.getItem(GF_COPIA_KEY) || "null"); } catch (e) { return null; } }
/* ¿la copia local tiene MÁS progreso que lo que acabamos de cargar? Se compara por lo que el
   jugador entendería como avanzar: nivel y plata. Sin adivinar: si empatan, manda la nube. */
function copiaEsMejor(c) {
  if (!c || !c.data || c.uid !== UID) return false;
  return (c.nivel || 1) > (G.level || 1) || (c.plata || 0) > Math.floor(G.plata || 0) + 50;
}

async function saveFarm(force) {
  if (!sb || !UID) return;
  // 18/8: si nunca se llegó a cargar, NO se escribe. Es preferible perder una sesión de juego
  // antes que pisar la granja buena con los valores por defecto.
  if (!CARGA_OK) { console.warn("saveFarm bloqueado: la granja no se llegó a cargar"); return; }
  const key = snapKey();
  if (!force && key === lastSavedKey) return;   // nada que guardar: ni siquiera muestra el indicador
  copiaGuardar(snapshot());   // 25/8: la copia local se deja SIEMPRE, aunque la nube después falle
  if (typeof showSaving === "function") showSaving();
  // hasta 2 intentos inmediatos; si fallan, lastSavedKey no se actualiza y el autosave reintenta al próximo ciclo
  for (let intento = 0; intento < 2; intento++) {
    try {
      /* 21/8 — EL PORTERO: el guardado entra por la Edge Function "guardar" (la única puerta,
         con bitácora de deltas — ver supabase/functions/guardar/). Mientras la función no esté
         deployada, cae al camino viejo (upsert directo) para que nadie se quede sin guardar
         durante la transición; cuando sql/portero-guardado.sql PARTE 2 cierre ese camino, el
         único que queda es el portero. */
      const cuerpo = { name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), data: snapshot() };
      let paso = false;
      try {
        const { data: r, error: fe } = await sb.functions.invoke("guardar", { body: cuerpo });
        if (!fe && r && r.ok) paso = true;
        else if (fe) console.warn("portero:", (fe && fe.message) || fe);
      } catch (e) { console.warn("portero no disponible aún (va por el camino viejo):", e && e.message); }
      if (!paso) {
        const { error } = await sb.from("farms").upsert({ user_id: UID, name: cuerpo.name, data: cuerpo.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (error) throw error;
      }
      lastSavedKey = key;   // recién ahora quedó persistido
      if (typeof showSaved === "function") showSaved();
      return;
    } catch (e) { if (intento === 0) await sleepMs(1500); else console.warn("saveFarm sin conexión (reintenta solo):", e && e.message); }
  }
}

/* ============ LA CUENTA SOBREVIVE AL NAVEGADOR (22/8, dirección) ==========================
   El login es anónimo por navegador: borrar datos, cambiar de máquina o abrir incógnito crea
   una granja nueva de la nada — la tabla farms acumuló 100+ "Granjero" solo en el testeo.
   La cura, con lo que ya hay: VINCULAR UN EMAIL a la cuenta anónima (enlace mágico, sin
   contraseñas). La granja queda atada al correo para siempre; en cualquier otro dispositivo
   se entra con el mismo email y aparece. El que no vincula sigue anónimo, como hoy.
   Requiere el proveedor Email activado en Supabase (docs/CUENTA-EMAIL.md, dos clics).       */

// ¿cómo está la cuenta de este navegador? → { modo: "sin-nube" | "anonima" | "email", email }
async function cuentaEstado() {
  if (!sb || !UID) return { modo: "sin-nube", email: "" };
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user && user.email) return { modo: "email", email: user.email };
  } catch (e) {}
  return { modo: "anonima", email: "" };
}

// ata el email a LA CUENTA ANÓNIMA ACTUAL (la granja de este navegador pasa a ser tuya para
// siempre). Supabase manda un correo de confirmación; al tocarlo, el vínculo queda hecho.
async function vincularEmail(email) {
  if (!sb) return { error: "sin conexión con la nube" };
  try {
    const { error } = await sb.auth.updateUser({ email: String(email || "").trim() });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) { return { error: String(e && e.message || e) }; }
}

// entra con un email YA vinculado (desde cualquier dispositivo): manda el enlace mágico.
// OJO: al entrar, la granja anónima de este navegador queda aparte (no se pierde: queda
// atada a su cuenta anónima, pero deja de ser la que se ve). La UI lo avisa antes.
async function entrarConEmail(email) {
  if (!sb) return { error: "sin conexión con la nube" };
  try {
    const { error } = await sb.auth.signInWithOtp({
      email: String(email || "").trim(),
      options: { emailRedirectTo: (typeof location !== "undefined" ? location.origin + location.pathname : undefined), shouldCreateUser: false },
    });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) { return { error: String(e && e.message || e) }; }
}

// ---- ranking real (lee la vista pública "leaderboard") ----
async function fetchLeaderboard() {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("leaderboard")
      .select("user_id,name,plata,skills,level,prestige")
      .limit(200);
    if (error) { console.warn("leaderboard:", error.message); return null; }
    return data || [];
  } catch (e) { console.warn("leaderboard err:", e); return null; }
}

// ---- ranking del ALTAR DE OFRENDAS (10/8) ----
// Lee la vista `ofrenda_rank`, que es APARTE de `leaderboard`. Se intentó agregarle la
// columna a `leaderboard` y Postgres lo rechazó: esa vista define `level` como integer y un
// "create or replace" no puede cambiarle el tipo a una columna que ya existe. Antes que
// arriesgar el ranking que ya funciona, va una vista propia con tres columnas.
// El SQL para crearla está en sql/ranking_ofrendas.sql. Mientras no exista, Supabase
// responde error y la ventana lo dice en vez de romperse.
async function fetchOfrendaRank() {
  if (!sb) return { error: "sin conexión" };
  try {
    const { data, error } = await sb.from("ofrenda_rank").select("user_id,name,ofrenda_pts").limit(200);
    if (error) return { error: error.message };
    return { rows: (data || []).filter(r => (r.ofrenda_pts || 0) > 0).sort((a, b) => (b.ofrenda_pts || 0) - (a.ofrenda_pts || 0)) };
  } catch (e) { return { error: String(e && e.message || e) }; }
}

// ---- CLANES Y ASALTO AL DRAGÓN (10/8) ----
// Todo pasa por funciones de Postgres (ver sql/clanes_y_asaltos.sql). Las tablas están
// cerradas: si el cliente pudiera escribir el daño a mano, cualquiera se anotaría el asalto
// entero desde la consola del navegador. Además el descuento de vida del jefe tiene que ser
// atómico, o dos golpes simultáneos se pisan y uno se pierde.
async function clanMio() {
  if (!sb || !UID) return null;
  try {
    const { data, error } = await sb.from("clan_members").select("clan_id,rol").eq("user_id", UID).maybeSingle();
    if (error || !data) return null;
    const { data: c } = await sb.from("clans").select("id,nombre,codigo,lider,tope").eq("id", data.clan_id).maybeSingle();
    const { data: ms } = await sb.from("clan_members").select("user_id,nombre,rol,desde").eq("clan_id", data.clan_id);
    return c ? { clan: c, rol: data.rol, miembros: ms || [] } : null;
  } catch (e) { return null; }
}
async function clanCrear(nombre) {
  if (!sb || !UID) return { error: "sin conexión" };
  const { data, error } = await sb.rpc("clan_crear", { p_uid: UID, p_nombre: nombre, p_jugador: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")) });
  return error ? { error: error.message } : { ok: Array.isArray(data) ? data[0] : data };
}
async function clanUnirse(codigo) {
  if (!sb || !UID) return { error: "sin conexión" };
  const { error } = await sb.rpc("clan_unirse", { p_uid: UID, p_codigo: codigo, p_jugador: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")) });
  return error ? { error: error.message } : { ok: true };
}
async function clanSalir() {
  if (!sb || !UID) return { error: "sin conexión" };
  const { error } = await sb.rpc("clan_salir", { p_uid: UID });
  return error ? { error: error.message } : { ok: true };
}
async function raidActivo() {
  if (!sb || !UID) return null;
  try {
    const { data: m } = await sb.from("clan_members").select("clan_id").eq("user_id", UID).maybeSingle();
    if (!m) return null;
    const { data: r } = await sb.from("raids").select("id,hp,hp_max,estado,cierra_at")
      .eq("clan_id", m.clan_id).in("estado", ["abierto", "vencido"]).order("abierto_at", { ascending: false }).limit(1).maybeSingle();
    if (!r) return null;
    const { data: d } = await sb.from("raid_damage").select("user_id,nombre,dmg,cobrado").eq("raid_id", r.id).order("dmg", { ascending: false });
    return { raid: r, dmg: d || [] };
  } catch (e) { return null; }
}
async function raidAbrir(hp) {
  if (!sb || !UID) return { error: "sin conexión" };
  const { error } = await sb.rpc("raid_abrir", { p_uid: UID, p_hp: hp });
  return error ? { error: error.message } : { ok: true };
}
async function raidPegar(dmg) {
  if (!sb || !UID) return { error: "sin conexión" };
  const { data, error } = await sb.rpc("raid_pegar", { p_uid: UID, p_nombre: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), p_dmg: dmg });
  return error ? { error: error.message } : { ok: Array.isArray(data) ? data[0] : data };
}
async function raidCobrar() {
  if (!sb || !UID) return { error: "sin conexión" };
  const { data, error } = await sb.rpc("raid_cobrar", { p_uid: UID });
  return error ? { error: error.message } : { parte: Number(data) || 0 };
}

// ---- chat global (Supabase Realtime broadcast) ----
let chatChannel = null;
function initChat(onMsg) {
  if (!sb || chatChannel) return;
  chatChannel = sb.channel("global-chat", { config: { broadcast: { self: true } } });
  chatChannel.on("broadcast", { event: "msg" }, ({ payload }) => { try { onMsg(payload); } catch (e) {} });
  chatChannel.subscribe();
}
function sendChat(text) {
  if (!chatChannel || !text) return;
  chatChannel.send({ type: "broadcast", event: "msg", payload: { name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), color: (typeof colorNombre === "function" ? colorNombre() : null), text: String(text).slice(0, 140), t: Date.now() } });
}

function startAutosave() {
  if (saveTimer) return;
  saveTimer = setInterval(() => { saveFarm(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveFarm(); });
  window.addEventListener("beforeunload", () => { saveFarm(); });
}

// arranca la sesión en segundo plano; main.js espera esta promesa
window.SAVE_READY = initSave();

// ================= MERCADO P2P ("detallitos (1)" punto 8) =================
// Tabla `market` en Supabase. El anon-key solo permite lo justo (ver policies en sql/market.sql):
// publicar lo tuyo, comprar publicaciones libres (update condicional = atómico) y cobrar tus ventas.
async function mkList(filtro) {
  if (!sb) return [];
  try {
    let q = sb.from("market").select("*").is("sold_to", null).order("created_at", { ascending: false }).limit(60);
    if (filtro && filtro.kind) q = q.eq("kind", filtro.kind);
    const { data, error } = await q;
    if (error) { console.warn("market list:", error.message); return []; }
    return data || [];
  } catch (e) { console.warn("market list err:", e); return []; }
}
async function mkMine() {
  if (!sb || !UID) return [];
  try {
    const { data, error } = await sb.from("market").select("*").eq("seller", UID).order("created_at", { ascending: false }).limit(60);
    if (error) { console.warn("market mine:", error.message); return []; }
    return data || [];
  } catch (e) { return []; }
}
async function mkPublish(row) {
  if (!sb || !UID) { toast("Necesitás conexión para publicar"); return null; }
  try {
    const { data, error } = await sb.from("market").insert(Object.assign({ seller: UID, seller_name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")) }, row)).select().single();
    if (error) { console.warn("market publish:", error.message); toast("No se pudo publicar"); return null; }
    return data;
  } catch (e) { toast("No se pudo publicar"); return null; }
}
// compra ATÓMICA: solo pega si la fila sigue libre (sold_to null)
async function mkBuy(id) {
  if (!sb || !UID) { toast("Necesitás conexión para comprar"); return null; }
  try {
    const { data, error } = await sb.from("market").update({ sold_to: UID, sold_at: new Date().toISOString() })
      .eq("id", id).is("sold_to", null).select();
    if (error) { console.warn("market buy:", error.message); return null; }
    return (data && data[0]) || null;   // null = alguien lo compró primero
  } catch (e) { return null; }
}
// retiro ATÓMICO: solo devuelve true si REALMENTE borró la fila.
// Antes bastaba con que no hubiera error: un DELETE que no matchea nada no da error, así que
// el doble clic (o retirar algo ya vendido) devolvía el ítem a la bolsa una y otra vez.
async function mkCancel(id) {
  if (!sb || !UID) return false;
  try {
    const { data, error } = await sb.from("market").delete().eq("id", id).eq("seller", UID).is("sold_to", null).select();
    if (error) { console.warn("market cancel:", error.message); return false; }
    return !!(data && data.length === 1);
  } catch (e) { return false; }
}
// cobro ATÓMICO: solo pega si la venta existe, es tuya, está vendida y NO estaba cobrada
async function mkCollect(id) {
  if (!sb || !UID) return false;
  try {
    const { data, error } = await sb.from("market").update({ paid: true })
      .eq("id", id).eq("seller", UID).eq("paid", false).not("sold_to", "is", null).select();
    if (error) { console.warn("market collect:", error.message); return false; }
    return !!(data && data.length === 1);
  } catch (e) { return false; }
}
