/* Golden Farm · persistencia por cuenta (login anónimo de Supabase) */
const SB_URL = "https://eusxpsmqczmczgyhndtd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3hwc21xY3ptY3pneWhuZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzU2OTMsImV4cCI6MjEwMDc1MTY5M30.ko-XxFFjf_YnBsnBvrSCOsMLTQ285G51r-UPLYZIDJ8";

let sb = null, UID = null, saveTimer = null, lastSavedKey = null;

async function initSave() {
  try {
    if (!window.supabase || !window.supabase.createClient) return false;
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) { console.warn("Login anónimo falló (¿está habilitado en Supabase?):", error.message); return false; }
      session = data.session;
    }
    UID = session.user.id;
    return true;
  } catch (e) { console.warn("initSave error:", e); return false; }
}

// campos de progreso que guardamos (no world/cooldowns/buffs, que son de la sesión)
function snapshot() {
  return { plata: G.plata, golden: G.golden, level: G.level, prestige: G.prestige, iniciado: G.iniciado,
    res: G.res, picks: G.picks, skills: G.skills, fish: G.fish, plots: G.plots, nodos: G.nodos, expansiones: G.expansiones, pescaHasta: G.pescaHasta, runaOro: G.runaOro, buffs: G.buffs, seeds: G.seeds, selSeed: G.selSeed,
    tools: G.tools, sflStock: true, invRows: G.invRows, slots: G.slots, hotbar: G.hotbar, hotSel: G.hotSel, hbInit: G.hbInit, layout: G.layout,
    daily: G.daily, plotsOwned: G.plotsOwned, seedBuys: G.seedBuys, built: G.built,
    hp: G.hp, hpMax: G.hpMax, combatXp: G.combatXp, stam: G.stam, stamAcc: G.stamAcc, stamRec: G.stamRec, pass: G.pass, tuto: G.tuto, firstSeeds: G.firstSeeds,
    stats: G.stats, statsBase: G.statsBase, chestCap: G.chestCap, edif2: G.edif2, cosmeticos: G.cosmeticos, animals: G.animals, armor: G.armor, armorEq: G.armorEq, ofrendaPts: G.ofrendaPts, ofrendaLog: G.ofrendaLog, nodoUsos: G.nodoUsos, cosEq: G.cosEq, incursion: G.incursion, incDia: G.incDia, zonaCdHasta: G.zonaCdHasta, zonaViaje: G.zonaViaje, decos: G.decos, decoBolsa: G.decoBolsa, godHand: G.godHand, zonasVistas: G.zonasVistas, visto: nowMs(), dummyTrain: G.dummyTrain, swordOwned: G.swordOwned, bowOwned: G.bowOwned, swordWoodOwned: G.swordWoodOwned, gear: G.gear,
    armasUnlocked: G.armasUnlocked, treesOpen: G.treesOpen, rocksOpen: G.rocksOpen, firstCropDone: G.firstCropDone, weapons: G.weapons,
    dishes: G.dishes, cooking: G.cooking, chests: G.chests, dummyUsedAt: G.dummyUsedAt,
    armCd: G.armCd, mkPend: G.mkPend,
    layoutPlots: G.layoutPlots, layoutPond: G.layoutPond, ghInv: G.ghInv,
    planos: G.planos, obras: G.obras, obraDep: G.obraDep, emergBuys: G.emergBuys, buzonLeidas: G.buzonLeidas, buzonArchivo: G.buzonArchivo, kitReclamado: G.kitReclamado, excav: G.excav, vales: G.vales, pedidos: G.pedidos, regalos: G.regalos };   // buzón + kit + excavaciones (15/8) · tablón + vales (16/8)   // blueprints (12/8) · capítulos + emergencia (14/8)
}
// "huella" del estado guardable (incluye el apodo); si no cambia, no hay nada que guardar
function snapKey() { return JSON.stringify({ n: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), d: snapshot() }); }

function hydrate(d) {
  if (!d) return;
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
  // la azada se retiró del juego (pedido del diseñador 31/7): se limpia de hotbar y bolsa guardadas
  G.hotbar = (G.hotbar || []).map(h => (h && h.kind === "tool" && h.key === "hoe") ? null : h);
  if (Array.isArray(G.slots)) G.slots = G.slots.map(sl => (sl && sl.kind === "tool" && sl.key === "hoe") ? null : sl);
  if (typeof d.hotSel === "number") G.hotSel = Math.max(0, Math.min(9, d.hotSel));
  if (typeof d.hbInit === "boolean") G.hbInit = d.hbInit;
  if (d.layout && typeof d.layout === "object") G.layout = d.layout;
  if (d.daily && typeof d.daily === "object") G.daily = { day: d.daily.day || 0, last: d.daily.last || "" };
  if (typeof d.plotsOwned === "number") G.plotsOwned = Math.max(2, Math.min(typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60, d.plotsOwned));   // fix #18 (11/8): el tope acá seguía en 12 y el F5 te "devolvía" las parcelas compradas
  if (d.seedBuys && typeof d.seedBuys === "object") G.seedBuys = { date: d.seedBuys.date || "", count: d.seedBuys.count || 0 };
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
  G.armasUnlocked = d.armasUnlocked === true;   // viernes (2): la pestaña Armas se paga (también para veteranos)
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
  try { if (typeof regalosSync === "function") regalosSync(); } catch (e) {}   // guardados viejos: recalcula lo que le corresponde por su nivel
  if (d.obraDep && typeof d.obraDep === "object") G.obraDep = d.obraDep;
  if (d.layoutPond && typeof d.layoutPond === "object") G.layoutPond = { col: d.layoutPond.col, row: d.layoutPond.row };
  if (d.picks && d.picks.owned && d.picks.dur) G.picks = d.picks;
  // migración ÚNICA al modelo apilable (31/7): la durabilidad vieja pasa a ser "1 herramienta"
  if (!d.sflStock) {
    for (const k of ["axe", "rod"]) if ((G.tools[k] || 0) > 0) G.tools[k] = 1;
    for (const k in G.picks.dur) if ((G.picks.dur[k] || 0) > 0) G.picks.dur[k] = 1;
    if (d.toolsLost) for (const k in d.toolsLost) if (d.toolsLost[k]) G.tools[k] = 0;
  }

  /* ---- AL FINAL, CON EL ESTADO YA COMPLETO (18/8) ----
     Todo lo que sigue LEE el estado cargado, así que no puede correr a mitad de la carga. */
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
  if (!sb || !UID) { CARGA_OK = true; return false; }   // sin nube no hay nada que pisar
  // hasta 3 intentos con espera creciente: la red del jugador puede parpadear justo al entrar
  for (let intento = 0; intento < 3; intento++) {
    try {
      const { data, error } = await sb.from("farms").select("data,name").eq("user_id", UID).maybeSingle();
      if (error) { console.warn("loadFarm:", error.message); await sleepMs(1200 * (intento + 1)); continue; }
      if (data) {
        if (data.data) hydrate(data.data);
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
async function saveFarm(force) {
  if (!sb || !UID) return;
  // 18/8: si nunca se llegó a cargar, NO se escribe. Es preferible perder una sesión de juego
  // antes que pisar la granja buena con los valores por defecto.
  if (!CARGA_OK) { console.warn("saveFarm bloqueado: la granja no se llegó a cargar"); return; }
  const key = snapKey();
  if (!force && key === lastSavedKey) return;   // nada que guardar: ni siquiera muestra el indicador
  if (typeof showSaving === "function") showSaving();
  // hasta 2 intentos inmediatos; si fallan, lastSavedKey no se actualiza y el autosave reintenta al próximo ciclo
  for (let intento = 0; intento < 2; intento++) {
    try {
      const { error } = await sb.from("farms").upsert({ user_id: UID, name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), data: snapshot(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      lastSavedKey = key;   // recién ahora quedó persistido
      if (typeof showSaved === "function") showSaved();
      return;
    } catch (e) { if (intento === 0) await sleepMs(1500); else console.warn("saveFarm sin conexión (reintenta solo):", e && e.message); }
  }
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
