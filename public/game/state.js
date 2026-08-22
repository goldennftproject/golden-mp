/* Golden Farm · estado del juego + economía (sin DOM ni canvas) */
window.GF = window.GF || {};
GF.spr = (k) => "assets/farm/" + k + ".png?a=7";   // ?a=N rompe el caché de los íconos (a=7: lombriz oficial PixelLab)

// --- estado principal (con algunos recursos de arranque para probar los menús) ---
const G = {
  plata: 3, golden: 20, level: 1, prestige: 0, week: 1, iniciado: 0,   // 18/8: cuándo empezó la partida — de ahí sale la semana del HUD   // 14/8: nacés con 3 de plata (el 1er objetivo es COMPRAR tus semillas)
  hp: 100, hpMax: 100, swordOwned: false, bowOwned: false, swordWoodOwned: false, firstCropDone: false,   // combate (Fase D)
  armasUnlocked: false,          // viernes (2): la pestana Armas de la Herreria se paga (20 madera + 20 piedra + 1000 plata)
  treesOpen: [0, 1, 2], rocksOpen: [0, 1, 2],  // 18/8: TRES de cada uno al arrancar. Con 2 el tutorial pedía 33 madera a 1 cada 30 min: 8 h de reloj para 3 min de juego.
  gear: { casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false },
  weapons: {},                   // doc 2/8: armas nuevas — id ("espada_madera") -> { dur }
  stam: null, stamAcc: 0, stamRec: null,   // estamina de la Zona Negra ("2das mejoras")
  stats: {}, statsBase: {}, chestCap: 0, edif2: {}, cosmeticos: [],
  animals: {},                   // Establo: animal → { desde, feliz, comidoAt, prodAt }
  armor: {}, armorEq: null,      // Curtiduría: piezas crafteadas y set equipado
  ofrendaPts: 0, ofrendaLog: 0,  // Altar de Ofrendas: puntos acumulados y recursos quemados
  nodoUsos: {},                  // cuántas veces se recogió de cada nodo (para el arranque rápido)
  cosEq: null,                   // cosmético lucido: título, color de nombre, marco y aura
  incursion: null, incDia: null, dummyTrain: null,   // incursiones de un clic y entrenamiento offline   // tareas de nivel 11-50, mejoras y cosméticos
  vales: 0, pedidos: null,   // 16/8: TABLÓN DE PEDIDOS — vales (moneda del tablón) + estado diario
  /* DOS BOLSAS, NO UNA (18/8) — el fallo que reportó dirección: "aparece que me dan un nodo de
     árbol y uno de cultivo, al reclamarlos suena el ruidito, pero no son entregados".
     Causa: regaloReclamar no descontaba nada, y el baúl y el Cobertizo leían LA MISMA lista. El
     premio ya estaba en el Cobertizo desde que lo daba el nivel, así que el clic del baúl no
     movía nada: solo sonaba. Ahora son dos sitios de verdad y el premio VIAJA de uno al otro.
       · regalos   = esperando en el BAÚL, sin recoger
       · cobertizo = recogido, esperando a que elijas dónde va */
  regalos: { tree: 0, rock: 0, plot: 0 },
  cobertizo: { tree: 0, rock: 0, plot: 0 },   // 16/8: nodos y parcelas que el nivel regaló y esperan en el BAÚL
  combatXp: 0,                   // doc 2/8: barra de Combate GLOBAL — suma la XP de todos los kills
  states: [],                    // doc 2/8: estados/debuffs del bestiario sobre el jugador (no se guardan)
  tuto: { step: 0, n: 0, done: false, v: 2 },   // doc 2/8: tutorial guiado de micro-objetivos (v = versión de la cadena)
  firstSeeds: 3,                 // semillas del starter pack que crecen en 45 s (se descuentan al plantarlas)
  armCd: {}, mkPend: [], testeoDado: false,   // enfriamiento de crafteo por arma · entregas pendientes · (testeoDado quedó del regalo viejo, ya no se usa)   // equipo (armas se equipan en el panel de Equipo — detalles jueves)
  res: { madera: 0, piedra: 0, bronce: 0, hierro: 0, oro: 0, diamante: 0, netherita: 0, carne: 0, flecha: 0, lombriz: 0,
    tablon: 0, barra_piedra: 0, barra_bronce: 0, barra_hierro: 0, barra_oro: 0,
    papa: 0, ciruela: 0, cereza: 0, remolacha: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0, girasol: 0, trigo: 0, maiz: 0,
    fibra: 0, pelaje: 0, cuero: 0, colmillo: 0, esencia_runica: 0, esencia_oscura: 0 },
  seeds: { papa: 0, ciruela: 0, cereza: 0, remolacha: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0, girasol: 0, trigo: 0, maiz: 0 },  // 14/8: la bolsa nace VACÍA — las 3 semillas se compran con la plata inicial (1er objetivo)
  selSeed: "papa",   // semilla elegida para plantar
  // 15/8 v2 (dirección): se nace con las MANOS VACÍAS — el KIT DE BIENVENIDA espera en
  // el BAÚL junto al granero (35 hachas + 20 picos + 15 cañas, medido por sim-tuto-v2:
  // cubre los materiales del tutorial). Primera acción del juego: abrir el baúl.
  /* 18/8: el pico de piedra ya NO figura como poseído de arranque. Con 0 usos no servía para
     nada y hacía que la bolsa y la barra enseñaran un pico que el jugador no tiene. Llega con el
     kit del baúl, igual que el hacha y la caña. */
  picks: { owned: {}, dur: {}, eq: null },
  tools: { axe: 0, rod: 0 },
  kitReclamado: false,
  toolsLost: {},                 // herramientas tiradas a la papelera (31/7: el diseñador pidió que se puedan tirar)
  invRows: 0,                    // filas extra de inventario compradas
  slots: [],                     // inventario por casillas: [{kind,key}|null]
  hotbar: [null, null, null, null, null, null, null, null, null, null],  // 10 accesos directos
  hotSel: 0,                     // hueco de la hotbar seleccionado (herramienta "en mano")
  hbInit: false,                 // si ya se cargaron los accesos directos por defecto
  layout: {},                    // posiciones editadas de objetos de la granja: {index:{cx,by}}
  layoutPlots: {},               // parcelas movidas: {index:{col,row}}
  layoutPond: null,              // laguna movida: {col,row}
  fish: { comun: 0, raro: 0, epico: 0, legendario: 0 },
  plots: [],   // estado de las parcelas: [{state, readyAt, cropKey}] — lo llena la FarmScene
  nodos: {},   // enfriamiento de árboles/rocas/vetas por índice de objeto — lo llena syncNodos()
  // 18/8 (auditoría): los buffs SÍ se guardan. No estaban ni en snapshot ni en la carga, así que
  // el buff del plato que te comiste (5 min) y sobre todo el del cofre diario (60 min) se perdían
  // en cada F5: el jugador pagaba materiales y cocinaba para nada. G.states (sangrado, veneno) se
  // sigue sin guardar, pero eso sí está decidido y documentado.
  pescaHasta: 0,
  runaOro: null,   // tope diario de la Runa Dorada   // enfriamiento de la laguna
  expansiones: 0,   // cuántos de los 16 bloques compró el jugador (el orden es fijo: basta el número)
  plotsOwned: 3,   // 14/8 (dirección): se nace con 3 parcelas — la primera misión planta 3 semillas y tiene que haber 3 celdas donde apuntar
  plotsCompradas: 0,   // 20/8 (dirección): SOLO las compradas en tienda — el precio sube con éstas; las regaladas por expansión no lo tocan
  plotsFicha: 0,       // 20/8: las canjeadas con Ficha de parcela (pase/capítulos) — también cuentan en el libro mayor
  expParcelasDadas: 0, // 20/8 (dirección): "las expansiones deberían tener guardado lo que entregan" — cuántas ya entregaron SU parcela; la entrega es secuencial, así que basta el número
  decos: [], decoBolsa: {}, godHand: false, zonasVistas: ["pantano"],   // adornos puestos · adornos sin colocar · NFT de siembra automática (10/8)
  daily: { day: 0, last: "" },   // cofre diario: día de racha reclamado (1..7) y fecha del último reclamo
  seedBuys: { date: "", count: 0 },   // cupo diario de semillas (compras + cofre)
  dishes: {},      // platos cocinados (van a la bolsa; clic para comer)
  cooking: [],   // { id, endAt, total } — barra de enfriamiento al cocinar
  chests: [],      // cofres depósito: [{col,row,items:[{kind,key,n}|null × 10]}] — +1% materiales c/u
  dummyUsedAt: 0,  // último entrenamiento con el dummy (cooldown 4h)
  built: { store: false, horno: false, cocina: false, altar: false, establo: false, curtiduria: false, ofrendas: false },   // viernes (2): la Herreria es el unico edificio gratis; el resto se construye
  buffs: [], secPerGameHour: 1, gameHours: 0,
  // 18/8: Tala y Ganadería salen de Artesanía y de Cultivo — cada oficio, su barra
  skills: { fishing: 0, farming: 0, tala: 0, ganaderia: 0, cooking: 0, range: 0, sword: 0, hacha: 0, mazo: 0, mining: 0, crafting: 0 },   // doc 2/8: cada arma es su propia skill (espada=sword, arco=range)
};
window.G = G;

// --- utilidades ---
function fmt(n) { n = Math.floor(n); return n >= 1000 ? (n / 1000).toFixed(n % 1000 < 100 ? 0 : 1).replace(".0", "") + "k" : "" + n; }
/* 20/8 (dirección: "¿están bien estos decimales?" — 25.450000000000003 en la lista del Mercado).
   No estaban, y no es un error de cálculo sino de IMPRESIÓN. Los precios salen de multiplicar por
   el bono de venta (1,135…) y en coma flotante 25,45 se guarda como 25,450000000000003. El número
   es correcto; lo que está mal es enseñarlo crudo.
   Y NO se puede arreglar redondeando el precio: el 18/8 ya aprendimos que redondear por unidad
   rompe el balance —la papa vale 2, y round(2 × 1,135) sigue siendo 2 hasta el nivel 20, cuando
   salta a 3 de golpe (+50%)—. El redondeo va UNA sola vez, al total de la venta (totalVenta).
   Así que el cálculo se queda exacto y esto es solo para los ojos: dos decimales como mucho, y sin
   ceros de relleno (7,12 · 16,3 · 50,9 · 2). */
function fmtDec(n, dec) {
  if (!isFinite(n)) return "0";
  const s = Number(n).toFixed(dec == null ? 2 : dec);
  return s.indexOf(".") < 0 ? s : s.replace(/0+$/, "").replace(/\.$/, "");
}
function nowMs() { return Date.now(); }
/* 18/8 (auditoría): G.week se DIBUJA en el HUD y no la incrementaba nadie — el jugador veía
   "semana 1" para siempre. Ahora se deriva de los días jugados: es un dato, no un contador que
   alguien se tiene que acordar de subir. */
function semanaActual() {
  const ini = G.iniciado || (G.iniciado = Date.now());
  return 1 + Math.floor((Date.now() - ini) / (7 * 86400000));
}
/* 20/8 (auditoría de dupes) — LOS BUFFS MULTIPLICATIVOS NO SE APILAN. cdMult y ventaMult
   multiplicaban CADA buff activo del tipo: 10 estofados dejaban los enfriamientos en 0,85^10 = 20%
   y 30 platos de venta ponían el mercado a ×41,7 — una impresora de plata con costo lineal y
   ganancia exponencial. Ahora vale EL MEJOR buff activo: comer otro plato del mismo tipo renueva
   la ventana, no compone. Los buffs aditivos (farm/speed/dmg) ya tenían sus topes y quedan igual. */
function cdMult() { const t = Date.now(); let m = 1; for (const b of G.buffs) if (b.type === "cd" && b.until > t) m = Math.min(m, b.mult); return m; }
/* ============ EL BONO DEL GRANERO SE PAGA EN PLATA (18/8, dirección) ===============
   El +1,5% por nivel de granja multiplicaba la CANTIDAD cosechada… y después redondeaba. Como
   todos los cultivos dan 1 unidad, `round(1 × 1,435)` seguía siendo 1: el jugador subía TREINTA Y
   TRES NIVELES sin notar absolutamente nada, y al llegar a ×1,5 el redondeo saltaba a 2 y la
   parcela pasaba de 20 a 40 plata/hora de golpe. Un bono invisible durante 33 niveles y roto en
   el 34. No estaba en ninguna auditoría: lo encontró dirección preguntando por él.
   Ahora el bono es de PRECIO, no de cantidad: cosechás 1 y lo vendés un 1,5% más caro por nivel.
   Sin redondeos, sin saltos, y se nota desde el primer nivel.
   OJO CON EL ANCLA: esto la mueve A PROPÓSITO. Deja de ser "20 plata/hora" y pasa a ser
   "20 plata/hora al nivel 1, creciendo un 1,5% por nivel de granja". Al 50 son 34,7. Está escrito
   así para que ninguna auditoría futura lo marque en rojo creyendo que es un fallo. */
function ventaMult() { const t = Date.now(); let m = 1 + 0.015 * ((G.level || 1) - 1) + (G.prestige || 0) * 0.015; let mejor = 1; for (const b of G.buffs) if (b.type === "yield" && b.until > t) mejor = Math.max(mejor, b.mult); return m * mejor; }
function yieldMult() { return 1; }   // legado: la cantidad cosechada ya no se multiplica
function addBuff(type, label, mult, durSec) { G.buffs.push({ type, label, mult, until: Date.now() + durSec * 1000 }); }
// buffs de comida (doc maestro 2/8): suma de valores activos por tipo
function buffTotal(type) { const t = Date.now(); let s = 0; for (const b of G.buffs) if (b.type === type && b.until > t) s += b.mult; return s; }
function dmgMult() { return 1 + (buffTotal("dmg") + buffTotal("feast") + (typeof armorBonoVal === "function" ? armorBonoVal("dmgPct") : 0)) / 100; }
function dmgTakenMult() { return Math.max(0.2, 1 - (buffTotal("def") + buffTotal("feast") + (typeof armorBonoVal === "function" ? armorBonoVal("defPct") : 0)) / 100); }
function speedMult() { return 1 + (buffTotal("speed") + buffTotal("feast") + (typeof armorBonoVal === "function" ? armorBonoVal("spd") : 0)) / 100; }
function farmSpeedMult() { return Math.max(0.4, 1 - (buffTotal("farm") + (typeof armorBonoVal === "function" ? armorBonoVal("farm") : 0)) / 100); }   // acorta las acciones de cultivo
function luckMult() { return 1 + buffTotal("luck") / 100 + (typeof eqRunaVal === "function" && typeof armaEq === "function" ? eqRunaVal("fortuna") / 100 : 0); }
function combatXpMult() { return 1 + buffTotal("combatxp") / 100; }
/* --- ESTADOS sobre el jugador (bestiario doc 2/8): sangrado/veneno/quemadura (daño por s),
       maldiciones de Flaqueza (-daño) y Fragilidad (-defensa), ralentización. Tope: 2 maldiciones,
       veneno acumulable x3, el resto se renueva. Viven solo en la sesión (no se guardan). --- */
function addPlayerState(type, val, durS, label) {
  const t = Date.now();
  G.states = (G.states || []).filter(s => s.until > t);
  if (type === "veneno") {
    if (G.states.filter(s => s.type === "veneno").length >= 3) return false;   // acumulable hasta x3
  } else {
    const prev = G.states.find(s => s.type === type);
    if (prev) { prev.until = t + durS * 1000; prev.val = Math.max(prev.val, val); return true; }   // se renueva
    if ((type === "flaqueza" || type === "fragilidad") &&
        G.states.filter(s => s.type === "flaqueza" || s.type === "fragilidad").length >= 2) return false;   // tope maldiciones
  }
  G.states.push({ type, val, until: t + durS * 1000, next: t + 1000, label: label || type });
  log("Sufrís " + (label || type) + ".", "bad");
  return true;
}
function stateTotal(type) { const t = Date.now(); let s = 0; for (const st of (G.states || [])) if (st.type === type && st.until > t) s += st.val; return s; }
function playerDmgOutMult() { return Math.max(0.2, 1 - stateTotal("flaqueza") / 100); }   // Maldición de Flaqueza
function playerDefLossMult() { return Math.min(0.9, stateTotal("fragilidad") / 100); }    // Maldición de Fragilidad
function playerSlowMult() { return Math.max(0.4, 1 - stateTotal("ralen") / 100); }        // Ralentización
function cleanseStates(tipos) {
  const antes = (G.states || []).length;
  G.states = (G.states || []).filter(s => !tipos.includes(s.type));
  return antes - G.states.length;
}

var GRANJA_REGEN = 1;   // "detallitos (1)" punto 3: en la granja la vida se recupera sola (puntos por segundo)
function granjaRegen() {   // solo fuera de la Zona Negra
  if (!GRANJA_REGEN || G.hp >= G.hpMax) return;
  if (window.GF && GF.scene === "forest") return;
  G.hp = Math.min(G.hpMax, G.hp + GRANJA_REGEN);
}
function buffTick() {   // 1 vez por segundo desde el HUD: regeneración y vida máxima temporal
  const t = Date.now(); let dirty = false;
  // set de Piel completo: +N HP/s (el bono estaba en la tabla pero no lo leía nadie)
  { const rg = (typeof armorBonoVal === "function") ? armorBonoVal("regen") : 0;
    if (rg > 0 && G.hp < G.hpMax) { G.hp = Math.min(G.hpMax, G.hp + rg); dirty = true; } }
  for (const b of G.buffs) {
    if (b.type === "regen" && b.until > t && G.hp < G.hpMax) { G.hp = Math.min(G.hpMax, G.hp + b.mult); dirty = true; }
    if (b.type === "hpmax") {
      if (b.until > t && !b.on) { b.on = true; G.hpMax += b.mult; G.hp = Math.min(G.hpMax, G.hp + b.mult); dirty = true; }
      if (b.until <= t && b.on) { b.on = false; G.hpMax -= b.mult; G.hp = Math.min(G.hp, G.hpMax); dirty = true; }
    }
  }
  G.buffs = G.buffs.filter(b => b.until > t || b.on);
  if (dirty) { const el = document.getElementById("s-hp"); if (el) el.textContent = Math.ceil(G.hp) + "/" + G.hpMax; }
}

// --- recursos ---
const RES_EMOJI = { madera:"", piedra:"", bronce:"", oro:"", diamante:"", netherita:"", carne:"", flecha:"", lombriz:"",
  papa:"", ciruela:"", cereza:"", remolacha:"", zanahoria:"", cebolla:"", calabacin:"", repollo:"", calabaza:"", brocoli:"" };
const RES_LABEL = { madera:"Madera", piedra:"Piedra", bronce:"Bronce", hierro:"Hierro", oro:"Oro", diamante:"Diamante", netherita:"Netherita", carne:"Carne", flecha:"Flecha", lombriz:"Lombriz",
  tablon:"Tablón de madera", barra_piedra:"Bloques de piedra", barra_bronce:"Barra de bronce", barra_hierro:"Barra de hierro", barra_oro:"Barra de oro",
  papa:"Papa", ciruela:"Ciruela", cereza:"Cereza", remolacha:"Remolacha", zanahoria:"Zanahoria", cebolla:"Cebolla", calabacin:"Calabacín", repollo:"Repollo", calabaza:"Calabaza", brocoli:"Brócoli",
  girasol:"Girasol", trigo:"Trigo", maiz:"Maíz",
  fibra:"Fibra", pelaje:"Pelaje", cuero:"Cuero", colmillo:"Colmillo", esencia_runica:"Esencia rúnica" };
// íconos cozy de recursos (los cultivos usan crop_<key>)
const RES_SPRITE = { madera:"res_madera", piedra:"res_piedra", bronce:"res_bronce", hierro:"res_hierro", oro:"res_oro", diamante:"res_diamante", netherita:"res_netherita", carne:"res_carne", flecha:"res_flecha", lombriz:"res_lombriz",
  tablon:"res_tablon", barra_piedra:"res_barra_piedra", barra_bronce:"res_barra_bronce", barra_hierro:"res_barra_hierro", barra_oro:"res_barra_oro",
  // 10/8: materiales del Establo, la Curtiduría, el Altar y las incursiones. Eran los últimos
  // ítems de la bolsa que salían con emoji en vez de ícono.
  fibra:"res_fibra", pelaje:"res_pelaje", cuero:"res_cuero", colmillo:"res_colmillo",
  esencia_runica:"res_esencia_runica", esencia_oscura:"res_esencia_oscura" };
function resSprite(k) { return CROP_DEF[k] ? "crop_" + k : (RES_SPRITE[k] || null); }

// --- cultivos (semillas compradas en la Tienda; se desbloquean por nivel de Cultivo) ---
const CROP_ORDER = ["papa","ciruela","cereza","remolacha","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz"];
// TABLA DE PRECIOS del diseñador (31/7): Ganancia = Tiempo × Riesgo × Nivel. Papa base: compra 1 / venta 3 / 1h.
// growH = horas reales de la tabla. En TESTEO corre comprimido: 1h → 1min (GROW_SCALE). Para pasar a real: GROW_SCALE = 1.
var GROW_SCALE = 1;   // 2/8: FUERA la compresión de testeo — el tiempo que se escribe acá es el tiempo real del juego
// Tabla oficial de "2das mejoras" (4/8/2026): compra/venta con ganancia que dobla por tier y
// ratio ~2,33; tiempos de 9 min (Papa) a 24 h (Maíz). XP por cosecha = minutos de crecimiento.
const CROP_DEF = {
  // 15/8 (dirección): TIEMPOS DE LA TABLA v3 DEL DISEÑADOR (1/8) puestos en juego para
  // que los pruebe en vivo y vea los detalles — papa 9 min … maíz 24 h. Los PRECIOS y la
  // XP siguen siendo los nuestros (semilla papa 1 / venta 3): con los precios v3 (semilla
  // 20) el arranque con 3 de plata no funciona. El cupo diario sigue de ancla.
  /* 16/8 v2 — ESCALERA DE ENTRADA DERIVADA DEL ANCLA (pedido del diseñador: cultivos más
     cortos y más interacción al principio; nombres suyos: plum, cherry, beetroot).
     El ancla dice 20 plata/hora por parcela. Con precios ENTEROS, la ganancia mínima es 1,
     así que el cultivo MÁS RÁPIDO posible sin romper el ancla es de 3 minutos (1 ÷ 0,05 h
     = 20). Nada por debajo de 3 min es balanceable: a 1 minuto ese mismo 1 de ganancia son
     60 plata/hora, el triple que todo el resto.
     Extendiendo hacia abajo el patrón que la tabla del diseñador YA tenía (la zanahoria son
     15 min, ganancia 5 y 25 XP = 20 plata/h y 100 XP/h), la escalera sale sola en progresión
     aritmética: 3-6-9-12-15 min · ganancia 1-2-3-4-5 · XP 5-10-15-20-25. Todos a 20 plata/h
     y 100 XP/h: lo que crece no es el ritmo, es el tamaño de la transacción. */
  // 16/8 v3 (dirección: "papa y ciruela tienen el mismo precio"): la GANANCIA es lo que fija
  // el ancla (20 plata/h), pero el costo de la SEMILLA es libre — solo hay que subir la venta
  // en la misma cantidad. Así la semilla también escala (1 → 2 → 2 → 3 → 3) y cada escalón se
  // siente como una inversión mayor, sin mover ni un punto el rendimiento por hora.
  papa:      { label:"Papa",      emoji:"🥔", lvl:1,  seedCost:1,   growH:0.05, yield:1, price:2,    xp:10 },    // 3 min · gana 1 — piso del ancla; el cultivo del tutorial
  ciruela:   { label:"Ciruela",   emoji:"🫐", lvl:2,  seedCost:2,   growH:0.10, yield:1, price:4,    xp:20 },   // 6 min · gana 2  (plum)
  cereza:    { label:"Cereza",    emoji:"🍒", lvl:3,  seedCost:2,   growH:0.15, yield:1, price:5,    xp:30 },   // 9 min · gana 3  (cherry)
  remolacha: { label:"Remolacha", emoji:"🟣", lvl:4,  seedCost:3,   growH:0.20, yield:1, price:7,    xp:40 },   // 12 min · gana 4 (beetroot)
  zanahoria: { label:"Zanahoria", emoji:"🥕", lvl:5,  seedCost:3,   growH:0.25, yield:1, price:8,    xp:50 },  // 15 min (v3 diseñador)
  cebolla:   { label:"Cebolla",   emoji:"🧅", lvl:6,  seedCost:6,   growH:0.5, yield:1, price:16,   xp:60 },  // 30 min (v3 diseñador)
  // 16/8: el calabacín era el único de la tabla fuera del ancla — rendía 26,7 plata/h y 120 XP/h
  // contra los 20 y 100 de sus vecinos. Reanclado: ganancia 15 (20/h) y 75 XP (100/h), con la
  // relación venta/semilla en 2,5 como el resto. Era 12 → 32 → 90.
  calabacin: { label:"Calabacín", emoji:"🥒", lvl:7,  seedCost:10,  growH:0.75, yield:1, price:25,   xp:70 },   // 45 min (v3 diseñador, reanclado 16/8)
  repollo:   { label:"Repollo",   emoji:"🥬", lvl:9,  seedCost:20,  growH:1.5,  yield:1, price:50,   xp:80 },  // 1 h 30 (v3 diseñador)
  calabaza:  { label:"Calabaza",  emoji:"🎃", lvl:10,  seedCost:40,  growH:3,    yield:1, price:100,  xp:90 },  // 3 h · 18/8: XP re-anclada (era 270 = 90 XP/h)
  // 16/8 (auditoría C): los cuatro de arriba se corren a la banda 11-50 del nivel de granja
  // (la que además pide TAREAS). Con el gate por nivel, quedarse en 7-10 los volvía casi
  // inmediatos; así el early game no cambia y las anclas largas siguen siendo una meta.
  brocoli:   { label:"Brócoli",   emoji:"🥦", lvl:12,  seedCost:90,  growH:6,    yield:1, price:210,  xp:100 },  // 6 h · 18/8: XP re-anclada (era 480 = 80 XP/h)
  girasol:   { label:"Girasol",   emoji:"🌻", lvl:15, seedCost:180, growH:10,    yield:1, price:380,  xp:110 },  // 10 h · 18/8: rendía 24 plata/h y 72 XP/h
  trigo:     { label:"Trigo",     emoji:"🌾", lvl:17, seedCost:360, growH:16,    yield:1, price:680,  xp:120 }, // 16 h · 18/8: rendía 30 plata/h y 67 XP/h
  /* 18/8 (auditoría del ancla) — LOS CINCO CULTIVOS LARGOS ESTABAN FUERA DE LA FÓRMULA, y en las
     DOS direcciones: rendían de más en plata y de menos en XP. El maíz era el caso extremo:
     40 plata/hora contra los 20 de todos los demás (el DOBLE) y 60 XP/hora contra 100.
     O sea que quien llegaba al maíz duplicaba su plata por hora y frenaba su progresión — el
     cultivo del final del juego rompía el ancla por arriba y por abajo a la vez.
     Re-anclados: la ganancia por hora vuelve a 20 bajando la VENTA (no subiendo la semilla, que
     dejaría una relación venta/semilla absurda), y la XP vuelve a 100 por hora. */
  maiz:      { label:"Maíz",      emoji:"🌽", lvl:20, seedCost:720, growH:24,   yield:1, price:1200, xp:130 },  // 24 h — el ancla nocturna
};
function recomputeCropGrow() { for (const k in CROP_DEF) CROP_DEF[k].grow = Math.round(CROP_DEF[k].growH * 3600 * GROW_SCALE); }
recomputeCropGrow();   // en segundos, como siempre
// --- peces (ítems del inventario) ---
const FISH_ORDER = ["comun", "raro", "epico", "legendario"];
const FISH_DEF = { comun: { label: "Pez común", emoji: "🐟", sprite: "fish_comun" }, raro: { label: "Pez raro", emoji: "🐠", sprite: "fish_raro" }, epico: { label: "Pez épico", emoji: "🐡", sprite: "fish_epico" }, legendario: { label: "Pez legendario", emoji: "🐋", sprite: "fish_legendario" } };

// 16/8 (auditoría C): los cultivos se desbloquean por NIVEL DE GRANJA, no por el skill de
// Farmeo. Las dos curvas se alimentan de la MISMA XP con varas incompatibles: la granja
// llegaba a 10 con 14.000 XP y con esa misma XP el skill estaba en 5 — el jugador tenía
// todas las parcelas mucho antes que cultivos para plantar en ellas, y el maíz (111.525 XP)
// quedaba a meses. Una sola vara para toda la granja; el skill queda para bonos y prestigio.
function farmLevel() { return G.level || 1; }
function farmSkillLevel() { return skillInfo(G.skills.farming, "farming").lvl; }   // el skill sigue existiendo (bonos, panel de skills)
/* 18/8 (dirección): la puerta de las semillas es la SKILL DE CULTIVO. El `lvl` de cada cultivo
   pasa a ser un nivel de skill, no de granja — y la etiqueta del Mercado, que siempre dijo
   "Cultivo nv N", por fin dice la verdad. El nivel de GRANJA sigue mandando en lo suyo: parcelas,
   nodos y expansiones. */
function cropUnlocked(k) { const cd = CROP_DEF[k]; return !!cd && farmSkillLevel() >= cd.lvl; }

/* ============ CADA OFICIO ABRE SU ESCALÓN (18/8, dirección) ========================
   "La skill de cultivo te desbloquea las semillas; la de minería, poder minar diferentes
   minerales. Está bien que la tala no desbloquee nada."
   Esto es lo mismo para los cinco oficios que tienen escalera. El nivel se deriva de la posición
   del material en SU escalera: el escalón N pide nivel N del oficio, sin tablas a mano.
   La TALA no está: la madera es plana y se decidió que su oficio sea una medida, no una puerta. */
function nivelOficio(sk) {
  if (sk === "cooking" && typeof cookLevel === "function") return cookLevel();   // la Cocina tiene su propia tabla
  return skillInfo((G.skills && G.skills[sk]) || 0, sk).lvl;
}
/* TODO LO QUE ABRE UN OFICIO, EN UNA SOLA LISTA (19/8).
   Sirve para dos cosas a la vez: pintar en el panel de Oficios qué te espera en el próximo nivel
   —que es lo que hacía falta para que subir de oficio se SIENTA—, y para que las auditorías lean
   las puertas del juego en vez de una copia a mano que se queda vieja. */
function oficioAbre(sk) {
  const l = [];
  if (sk === "farming") for (const k in CROP_DEF) l.push([CROP_DEF[k].lvl, CROP_DEF[k].label]);
  if (sk === "mining")  for (const k in ORE_DEF)  l.push([oreNivelReq(k), ORE_DEF[k].label]);
  if (sk === "ganaderia") {
    ANIMAL_ORDER.forEach(k => l.push([animalNivelReq(k), ANIMAL_DEF[k].label]));
    /* 22/8: cada nivel suma un lugar en el establo — así NINGÚN nivel del oficio queda mudo */
    for (let n = 2; n < ESTABLO_CUPO_MAX; n++) l.push([n, "un lugar más en el establo (" + (n + 1) + ")"]);
  }
  if (sk === "cooking") for (const k in RECIPE_DEF) l.push([RECIPE_DEF[k].lvl || 1, RECIPE_DEF[k].label]);
  for (const t in PLANO_OFICIO) if (PLANO_OFICIO[t][0] === sk && BUILD_DEF[t])
    l.push([PLANO_OFICIO[t][1], "plano de " + BUILD_DEF[t].label]);
  for (const t in EDIF2_OFICIO) if (EDIF2_OFICIO[t][0] === sk && BUILD_DEF[t])
    l.push([EDIF2_OFICIO[t][1], BUILD_DEF[t].label + " nivel 2"]);
  return l.sort((a, b) => a[0] - b[0]);
}
function oficioProximo(sk) {
  const nv = nivelOficio(sk), l = oficioAbre(sk).filter(e => e[0] > nv);
  if (!l.length) return "";
  const n = l[0][0];
  return "Nv. " + n + ": " + l.filter(e => e[0] === n).map(e => e[1]).join(" · ");
}
function oreNivelReq(k) { const o = ORE_DEF[k]; return o ? (o.tier + 1) * 2 - 1 : 1; }   // piedra 1, bronce 3, hierro 5, oro 7, diamante 9, netherita 11
function oreUnlocked(k) { return nivelOficio("mining") >= oreNivelReq(k); }
/* LA PESCA NO RECORTA RAREZAS (19/8, medido) — corrección de lo que puse ayer.
   Ayer la skill de Pesca cerraba las rarezas: si no llegabas al nivel, el pez bajaba al mejor que
   supieras sacar. Al medirlo, el recorte deja la laguna EN NEGATIVO: un tiro cuesta 15 (3 de
   lombriz + 12 de caña) y el común vale 5 cocinado, así que a Pesca 1 la laguna daba −40 plata/h
   y no llegaba al ancla hasta Pesca 10. Un bucle imposible: el oficio que hay que subir para que
   la laguna sea rentable solo subía pescando a pérdida.
   El motivo de fondo NO es un número mal puesto: el 55% del valor de la laguna está en el épico y
   el legendario, así que CUALQUIER recorte por arriba deja el nodo por debajo de su coste. El
   recorte es el mecanismo equivocado para una tirada con cola gorda.
   Así que la Pesca queda como la Tala: mide la práctica y no cierra ninguna puerta. Si algún día
   se quiere que abra algo, el camino es que la rareza mande en el BUFF del plato y no en la plata
   (aplanar FISH_VALOR), que es como funciona el resto del juego: la papa y el maíz rinden lo
   mismo, la escalera cambia lo que hacés, no cuánto ganás. */
function animalNivelReq(k) { const i = ANIMAL_ORDER.indexOf(k); return i <= 0 ? 1 : i * 4; }   // 1, 4, 8, 12
function animalUnlocked(k) { return nivelOficio("ganaderia") >= animalNivelReq(k); }
function selectSeed(k) { if (!CROP_DEF[k]) return; G.selSeed = k; if (isOpen("ov-inv")) refreshInv(); }
// cupo diario de semillas (anti-inflación): compras + las del cofre suman al mismo límite
var SEED_DAILY_BASE = 18, SEED_DAILY_POR_NIVEL = 2;   // (legado: la fórmula vieja, la sigue usando el MODO TESTEO)
// 16/8 (auditoría A): el cupo viejo (18+2×nivel) alcanzaba para UNA HORA de juego y era la
// pieza que apagaba el día entero: sin semillas no hay plata, sin plata no hay herramientas,
// sin herramientas los nodos quedan parados. Ahora el cupo se ata a las PARCELAS —
// SEED_POR_PARCELA siembras por parcela y día — así crece solo con la progresión y solo
// muerde al jugador hiperactivo de cultivos cortos, que es donde estaba el exploit real.
// 16/8 v2: subido de 15 a 40. Al espaciar los cultivos (uno por nivel), el jugador pasa
// mucho más tiempo con los CORTOS, y esos queman el cupo a otra velocidad: con papa de 3
// minutos, 15 por parcela se agotan en menos de una hora de juego y el día se apaga igual
// que antes (medido: con 15 el jugador activo termina en nivel 5 con 0 de plata y los nodos
// parados; con 40 llega a nivel 9 con ~1.000). El cupo tiene que frenar bots, no jugadores:
// 40 por parcela son 240 siembras diarias con 6 parcelas, el 8% de lo que automatizaría un bot.
var SEED_POR_PARCELA = 40;
function seedDailyMax() {
  if (SEED_DAILY_BASE >= 999) return SEED_DAILY_BASE;   // modo testeo: sin cupo
  return SEED_POR_PARCELA * Math.max(3, G.plotsOwned || 3);
}
// Doc "Enfriamiento de Árboles y Minerales" (4/8): farmeo chill. Las primeras recolecciones de cada
// nodo salen en minutos (enganche) y después el nodo pasa a su enfriamiento largo real.
var GOLPES_TALAR = 3, GOLPES_MINAR = 3;   // clics para tumbar un árbol o romper una roca (lo usa también el panel de balanceo)
/* CARGAS DE LOS NODOS (21/8, dirección): "para los que no pueden hacer guardia: si el árbol se
   pasa crecido 30 minutos más, da 2 maderas; si se pasa 2 horas, da 4".
   El nodo crecido no se desperdicia: acumula 1 carga por cada reloj PROPIO extra que pase, hasta
   llenarse con 4 (árbol: lleno a las 2 h de pasado; roca y veta de piedra: a las 2 h 40). El que
   hace guardia sigue exactamente igual; el de tres visitas cobra lo que el nodo le guardó.
   Las vetas de MINERAL quedan APARTADAS de la mecánica (dirección, 21/8, decisión final): se
   probaron con cargas y dirección las quitó el mismo día — reloj simple, una picada y a dormir.
   Y LA ESCALERA DE SPRITES SE ESTIRA CON LAS CARGAS (21/8, dirección, forma final): "con una
   carga, el ciclo es el que ya está; con N cargas, el primer corte se repite N veces — cada
   repetición da su madera — y el cierre es el de siempre". O sea: entero → primer corte →
   (repetición del primer corte × cargas extra, cobrando 1 madera + 1 hacha + su XP en cada una)
   → corte profundo → tocón con la madera final. Árbol lleno = 6 golpes, 4 maderas, 4 hachas, en
   una sola secuencia continua. Tiene que VERSE que das cuatro hachazos y que cada madera paga su
   hacha — nada cae de golpe. */
var NODO_CARGAS_MAX = 4;
function nodoCargas(o, cdBaseSeg) {
  if (!o || !o.readyAt || nowMs() < o.readyAt) return 1;
  /* el reloj del nodo es EL SUYO: el último ciclo que corrió (readyAt - cdIni trae los buffs de
     enfriamiento con los que se cortó); si no hay historia, el reloj base de su especie */
  const cdMs = (o.cdIni && o.readyAt > o.cdIni) ? (o.readyAt - o.cdIni) : cdBaseSeg * 1000;
  const extra = Math.floor((nowMs() - o.readyAt) / Math.max(1000, cdMs));
  return Math.min(NODO_CARGAS_MAX, 1 + Math.max(0, extra));
}
/* Consume UNA carga de un nodo que tenía 2 o más: mueve readyAt un reloj hacia AHORA, de modo
   que queden exactamente (cargas − 1) — el backlog por encima del tope se descarta al cobrar.
   No hay contador nuevo que guardar: las cargas viven en readyAt, que ya viaja al guardado, así
   que un F5 a mitad de vaciado no puede ni regalar ni comerse cargas. Con la última carga esta
   función NO se llama: el que tala pone el enfriamiento normal, como siempre. */
function nodoGastarCarga(o, cdBaseSeg) {
  const cdMs = Math.max(1000, (o.cdIni && o.readyAt > o.cdIni) ? (o.readyAt - o.cdIni) : cdBaseSeg * 1000);
  const quedan = nodoCargas(o, cdBaseSeg) - 1;
  o.readyAt = nowMs() - (quedan - 1) * cdMs;   // quedan≥1 ⇒ readyAt ≤ ahora: sigue talable ya
  o.cdIni = o.readyAt - cdMs;                  // conserva el largo del reloj para las siguientes
  return quedan;
}
// si dejás un árbol o una piedra a medio golpear y no volvés en este tiempo, se recupera sola
// y NO se gasta la herramienta: la herramienta solo se descuenta cuando el nodo cae del todo.
var GOLPES_RESET_MS = 5000;
/* 18/8 (dirección) — LOS RELOJES DEL ÁRBOL Y LA ROCA SE ACORTAN. Medido: en la PRIMERA HORA de
   juego el 100% de las acciones eran plantar papa, porque el árbol tardaba 90 min y la roca 120 y
   ninguno llegaba a completarse. La relación entre el reloj más rápido (papa, 3 min) y el más
   lento era de 1 a 40; Stardew y Sunflower se mueven entre 1:4 y 1:12.
   Con 30 y 40 minutos queda en 1:10 y la primera hora pasa de 0 acciones de nodo a 5.
   EL ANCLA NO SE ROMPE: el árbol tarda un tercio y la madera vale un tercio, así que sigue
   rindiendo 20 la hora. Lo que cambia es el tamaño de los números de las recetas, y eso se
   re-derivó entero (precios, herramientas, picos, edificios, expansiones, botín y armas).
   Las VETAS de mineral NO se tocan: 8 a 24 h es el ritmo diario, no el momento a momento, y
   dividirlas aplastaba la escalera de la minería. */
var CD = { tree: 1800, rock: 2400 };            // 30 min árbol · 40 min piedra
var CD_RAPIDO = {};   // 15/8 (dirección, FINAL): SIN arranque rápido — el timer es UNO desde el primer golpe ("el tutorial no es otro juego")
// cuántas veces se recogió YA de ese nodo (por nodo, no global)
function nodoUsos(o) { G.nodoUsos = G.nodoUsos || {}; return G.nodoUsos[o.i] || 0; }
function nodoSumar(o) { G.nodoUsos = G.nodoUsos || {}; G.nodoUsos[o.i] = nodoUsos(o) + 1; }
// enfriamiento que corresponde a este nodo AHORA (en segundos)
// 14/8 FINAL (dirección): la ACELERACIÓN del tutorial se ELIMINÓ — el ritmo del
// tutorial ES el ritmo del juego: escalera de cultivos rápida en tier 1 (papa 90 s) y
// timers de nodo FIJOS (árbol 90 s / roca 120 s). Una sola física; las esperas se SOLAPAN.
/* 14/8 (proyección como GUÍA — la aceleración se eliminó; la contabilidad queda) —
   una siembra corre a 3 s solo si la PROYECCIÓN (plata + cosecha en bolsa + lo que está
   creciendo) todavía no cubre la meta del sub. Cubierta la meta: siembras a tiempo real
   y AVISO de "ya te alcanza". Atesorar cuenta en la proyección → no hay imprenta. */
function plataProyectada() {
  let p = Math.floor(G.plata || 0);
  for (const k in CROP_DEF) {
    p += Math.floor(G.res[k] || 0) * (CROP_DEF[k].price || 0);      // cosecha en bolsa
    p += Math.floor(G.seeds[k] || 0) * (CROP_DEF[k].price || 0);    // 14/8 v5: las SEMILLAS también son cosecha futura — comprar baja plata y sube semillas, o sea la proyección crece por la ganancia NETA: la cuenta cierra sola
  }
  if (Array.isArray(G.plots)) for (const pl of G.plots) {
    if (pl && pl.state === "growing" && pl.cropKey && CROP_DEF[pl.cropKey]) p += CROP_DEF[pl.cropKey].price || 0;
  }
  return p;
}
function subPlataMeta() {   // meta del sub de plata activo (0 si no hay)
  const sub = (typeof tutoSub === "function") ? tutoSub() : null;
  return (sub && sub.plata && sub.meta) ? sub.meta : 0;
}
// (la aceleración "del plan" se eliminó con la física única; la PROYECCIÓN y el
//  aviso de "ya cubrís la meta" quedan como guía — útiles también a tiempo real)
// aviso ÚNICO por meta: "con lo plantado ya cubrís los X" (lo llama tutoSync cada segundo)
function tutoAvisoCubierto() {
  const meta = subPlataMeta();
  if (!meta) { G._cubAviso = 0; return; }
  if (G._cubAviso === meta) return;
  if (plataProyectada() >= meta) {
    G._cubAviso = meta;
    toast("🎯 Con lo plantado y tu bolsa ya cubrís los " + meta + " de plata — cosechá y vendé");
    log("Con lo que está creciendo y lo que tenés en la bolsa ya llegás a los " + meta + " de plata del objetivo.", "good");
  }
}
function nodoCd(o, clave, cdLargo) { return cdLargo; }   // 15/8 (dirección): un solo timer, sin etapas — largos del diseñador desde el comienzo
function seedBuysToday() {
  const sb = G.seedBuys || (G.seedBuys = { date: "", count: 0 });
  if (sb.date !== dayStamp(0)) { sb.date = dayStamp(0); sb.count = 0; sb.caridad = 0; }   // 15/8: también la semilla fiada del día
  return sb;
}
function buySeed(k, qty) {
  const cd = CROP_DEF[k]; if (!cd) return;
  if (!cropUnlocked(k)) { toast("Necesitás Cultivo nivel " + cd.lvl); return; }
  qty = Math.max(1, Math.floor(qty || 1));
  const sb = seedBuysToday();
  // 15/8 (dirección, regla final): el CUPO DE SIEMPRE manda para todos los cultivos,
  // tutorial incluido — el kit inicial ya cubre los insumos del recorrido, así que
  // ninguna misión depende de comprar de más. Sin excepciones = sin exploit.
  const left = seedDailyMax() - sb.count;
  if (left <= 0) { toast("Cupo diario de semillas alcanzado (" + seedDailyMax() + ") — volvé mañana"); return; }
  if (qty > left) { qty = left; toast("Cupo diario: solo podés comprar " + left + " más hoy"); }
  // 15/8: RED ANTI-SOFTLOCK — jugador en cero absoluto (sin plata, semillas, cultivos,
  // platos ni nada creciendo): el Mercado le FÍA una semilla de papa por día. Sin esto,
  // como los materiales no se venden, el cero era un callejón sin salida matemático.
  let fiada = false;
  if (k === "papa" && G.plata < cd.seedCost && !sb.caridad) {
    const tieneSem = Object.keys(G.seeds || {}).some(s => (G.seeds[s] || 0) > 0);
    const tieneCult = Object.keys(CROP_DEF).some(c => Math.floor(G.res[c] || 0) > 0);
    const tienePlato = Object.keys(G.dishes || {}).some(d => (G.dishes[d] || 0) > 0);
    const tieneSembrado = (G.plots || []).some(p => p && (p.state === "growing" || p.state === "ready"));
    if (!tieneSem && !tieneCult && !tienePlato && !tieneSembrado) { fiada = true; qty = 1; sb.caridad = 1; }
  }
  const cost = fiada ? 0 : cd.seedCost * qty;
  if (G.plata < cost) { toast("Te falta plata"); return; }
  if (fiada) toast("El Mercado te fía tu primera semilla del día 🌱");
  if (typeof tutoPermite === "function" && !tutoPermite("buyseed")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardia === "function" && !tutoGuardia("plata", cost, "comprar " + cd.label, { semilla: k })) return;   // guardia del tutorial (12/8)
  G.plata -= cost; G.seeds[k] = (G.seeds[k] || 0) + qty;
  sb.count += qty;
  // 13/8: la semilla comprada vuelve a la barra rápida si no estaba (la agotada sale sola)
  if (Array.isArray(G.hotbar) && !G.hotbar.some(h => h && h.kind === "seed" && h.key === k)) {
    const li = G.hotbar.findIndex(h => !h);
    if (li >= 0) { G.hotbar[li] = { kind: "seed", key: k }; if (typeof refreshHotbar === "function") refreshHotbar(true); }
  }
  // 14/8 v4 (dirección: "que se asegure de que cumpla lo que pide"): el evento se dispara
  // POR SEMILLA, no por compra — comprar 1 de 3 deja al capataz diciendo "te faltan 2".
  // Solo cuentan las de PAPA: el paso pide esas.
  if (k === "papa" && typeof tutoEvent === "function") for (let i = 0; i < qty; i++) tutoEvent("buyseed");
  log(`Compraste ${qty} semilla(s) de ${cd.label} por ${cost} plata. (cupo: ${sb.count}/${seedDailyMax()})`); toast("+" + qty + " " + cd.label);
  refreshHud(); if (typeof refreshSeedShop === "function") refreshSeedShop(); if (isOpen("ov-inv")) refreshInv();
}

/* ---- KIT DE EMERGENCIA en $Golden (14/8, pedido del diseñador): "por si se quedan
   atascados" — 5 hachas, 5 usos de pico y 5 semillas de papa POR DÍA, pagando con
   $Golden. Le da utilidad diaria al $Golden y reemplaza a los kits del tutorial como
   válvula anti-atasco después de la guía temprana. Las semillas de acá NO consumen el
   cupo diario (son el rescate, no el mercado). Precios tuneables — validar con diseñador. */
// 16/8 (auditoría F): el kit vendía 1 hacha (6 plata) por 2 $Golden — valoraba el $Golden a
// 3 plata, mientras comprar parcelas lo valora a cientos. Como es una válvula ANTI-ATASCO,
// ahora entrega LOTES: 1 $Golden = 10 hachas / 10 picos / 5 semillas. Rescata de verdad y
// deja de ser el peor canje del juego. (Tipo de cambio de referencia: GOLDEN_EN_PLATA.)
var EMERG_GOLDEN = { axe: 1, pick: 1, seed: 1 };   // $G por LOTE
var EMERG_LOTE   = { axe: 10, pick: 10, seed: 5 }; // unidades por lote
var EMERG_MAX = 5;                                  // tope diario por tipo
function emergBuysToday() {
  const e = G.emergBuys || (G.emergBuys = { date: "", axe: 0, pick: 0, seed: 0 });
  if (e.date !== dayStamp(0)) { e.date = dayStamp(0); e.axe = 0; e.pick = 0; e.seed = 0; }
  return e;
}
function comprarEmergencia(tipo) {
  const precio = EMERG_GOLDEN[tipo]; if (precio == null) return;
  const e = emergBuysToday();
  if ((e[tipo] || 0) >= EMERG_MAX) { toast("Tope diario del kit de emergencia (" + EMERG_MAX + ") — volvé mañana"); return; }
  if (G.golden < precio) { toast("Te faltan $Golden"); return; }
  G.golden -= precio; e[tipo] = (e[tipo] || 0) + 1;
  const n = (EMERG_LOTE && EMERG_LOTE[tipo]) || 1;   // 16/8: se entrega por lotes
  if (tipo === "axe") { G.tools = G.tools || {}; G.tools.axe = (G.tools.axe || 0) + n; toast("🆘 +" + n + " hachas"); }
  else if (tipo === "pick") {
    G.picks = G.picks || { owned: {}, dur: {}, eq: null };
    if (!G.picks.eq || !G.picks.owned[G.picks.eq]) { G.picks.owned.stone = true; G.picks.eq = "stone"; G.picks.dur.stone = 0; }
    G.picks.dur[G.picks.eq] = (G.picks.dur[G.picks.eq] || 0) + n; toast("🆘 +" + n + " picos");   // los picos son apilables como las hachas: 1 pico = 1 picada
  }
  else if (tipo === "seed") { G.seeds.papa = (G.seeds.papa || 0) + n; toast("🆘 +" + n + " semillas de papa"); }
  log("Kit de emergencia: compraste " + n + " " + (tipo === "axe" ? "hachas" : tipo === "pick" ? "picos" : "semillas de papa") + " por " + precio + " $Golden (" + e[tipo] + "/" + EMERG_MAX + " hoy).", "warn");
  refreshHud(); if (typeof refreshHotbar === "function") refreshHotbar(true);
  if (typeof refreshSeedShop === "function" && isOpen("ov-market")) refreshSeedShop();
  if (typeof saveFarm === "function") saveFarm();
}

// --- construcción de edificios (detalles viernes 1): recetas para levantar cada edificio ---
/* 18/8 — LOS EDIFICIOS PASAN A COLGAR DEL ANCLA (tools/costear-edificios.js)
   Antes eran números a ojo. Medido contra la granja que tenés cuando cada uno se abre, había un
   FACTOR 25 entre el más barato y el más caro — y el más caro del juego (Altar de Runas, 9,8 días
   de granja) estaba disponible desde el nivel 1. No hay lectura de diseño donde eso sea a propósito.

   Regla nueva, la misma que las expansiones: un edificio cuesta N DÍAS DE LA GRANJA QUE TENÉS
   CUANDO SE ABRE. N sube de 0,4 (los tres del tutorial) a 3,0 (el último). Es el único número de
   diseño; las cantidades las deriva el script.

   Dos cosas más, que no son de gusto:
   · FUERA EL ORO. Era más de la mitad del coste de los cuatro caros, y ataba el Establo (nivel 6)
     a un mineral que a ese nivel no rinde. Sobre todo: impedía que el oro llegara por expansión,
     porque dejaba el Establo inconstruible catorce niveles.
   · Los edificios de segundo nivel se pagan en TABLONES y BLOQUES. Sunflower llama a esto su
     trampa nº2 — "recursos para hacer más recursos, ¿pero para qué sirve el resultado?" — y
     nosotros caíamos de lleno: tablón, bloques de piedra y barra de hierro NO LOS GASTABA NADIE.
     Eran madera y piedra convertidas en un ítem sin salida. Ahora son el material de obra.
   · El Altar de Runas gana nivel 7, entre el Establo y la Curtiduría. */
const BUILD_DEF = {
  /* El VALOR de los tres del tutorial lo fija el ancla (0,4-0,5 días de granja), pero el reparto
     entre madera y piedra es libre — y no da igual. Con 2 árboles de 1 h 30 y 2 rocas de 2 h, el
     tutorial dura lo que dure el recurso más lento. Cargando hacia la madera se iba a 20,6 h;
     repartiendo 1,33 de madera por cada piedra los dos relojes terminan a la vez y baja a 17,4 h. */
  store:  { label: "Herrería",        cost: { piedra: 2, madera: 8 } },   // 10/8: ya no es gratis (pedido del diseñador)
  horno:  { label: "Horno de Piedra", cost: { piedra: 4, madera: 11 },  lvl: 3 },
  cocina: { label: "Cocina",          cost: { piedra: 6, madera: 14 }, lvl: 5 },
  /* 21/8 (dirección, auditoría de días reales): los cuatro tardíos cobraban 3,6-5,5 días del
     jugador de tres visitas SOLO en tablones (la madera es el cuello de todo el juego; la piedra
     sobra). El tablón va ÷2 y la barra de piedra queda: ahora rondan 1,8-2,8 días al abrirse. */
  altar:  { label: "Altar de Runas",  cost: { barra_piedra: 10, tablon: 13 }, lvl: 7 },
  establo:    { label: "Establo",     cost: { barra_piedra: 7, tablon: 9 }, lvl: 6 },
  curtiduria: { label: "Curtiduría",  cost: { barra_piedra: 14, tablon: 17 }, lvl: 8 },
  ofrendas:   { label: "Altar de Ofrendas", cost: { barra_hierro: 1, barra_piedra: 14, tablon: 14 }, lvl: 10 },
};
function buildCostStr(key) { const b = BUILD_DEF[key]; return Object.keys(b.cost).map(k => (b.cost[k]) + " " + (RES_LABEL[k] || k)).join(" + ") + (b.golden ? " + " + b.golden + " $Golden" : ""); }

/* ============ PLANOS Y OBRAS (12/8): construcción al estilo blueprint ============
   Al llegar al nivel ganás el PLANO del edificio (ítem de la bolsa, arte pergamino).
   Lo colocás donde quieras con el "colocar con clic": aparece la OBRA (build_*) con
   los materiales pedidos flotando encima. Cada clic en la obra deposita lo que
   tengas; al completar, estrellitas y pasa al edificio construido.
   El edificio ya NO aparece gris en una posición fija: no existe hasta que colocás
   su plano, y queda donde VOS lo pusiste. */
/* ============ QUIÉN ABRE CADA PLANO (19/8, dirección) ==============================
   El Granero quedó con dos trabajos —permitir expandir y subir el bono— pero seguía repartiendo
   los siete planos. La regla que los coloca sin discutir:

     · un edificio que ABRE un oficio no puede pedir ese oficio (sería circular: la Cocina
       pidiendo Cocina, el Establo pidiendo Ganadería);
     · un edificio que PROCESA lo de otro oficio se le pide AL OFICIO QUE LO ALIMENTA.

   Con eso, cuatro planos se mudan a su oficio y tres se quedan en el Granero:
     Herrería ......... granero 2 — es la puerta de entrada, no la alimenta nadie (y el tutorial
                        la necesita antes de que exista ningún oficio)
     Altar de Runas ... granero 7  \ no procesan nada: son progresión, no oficio
     Altar de Ofrendas  granero 10 /
   Los cuatro que se mudan están en PLANO_OFICIO. */
var PLANO_NIVEL = { store: 2, altar: 7, ofrendas: 10 };
var PLANO_OFICIO = {
  horno:      ["mining",    3],   // funde lo que picás → Minería (≈7 rocas: cae dentro del tutorial)
  cocina:     ["farming",   3],   // cocina lo que cosechás → Cultivo (~1,5 h)
  establo:    ["farming",   5],   // los animales COMEN cultivos → Cultivo (~7,4 h). No circular:
                                  // pedir Ganadería sería pedir el establo para abrir el establo
  curtiduria: ["ganaderia", 4]    // curte el cuero de TUS animales → Ganadería (el escalón del conejo)
};
function planoOficioListo(t) {
  const g = PLANO_OFICIO[t]; if (!g) return false;
  return nivelOficio(g[0]) >= g[1];
}
function planoPuertaTxt(t) {
  const g = PLANO_OFICIO[t];
  return g ? SKILL_NAME[g[0]] + " nivel " + g[1] : (PLANO_NIVEL[t] ? "Granja nivel " + PLANO_NIVEL[t] : "");
}   // nivel en que cae cada plano (números del diseñador · store 1→2 el 14/8: a nivel 1 caía en el SEGUNDO CERO de la partida, antes de aprender nada — el nivel 2 llega cosechando la primera tanda)
function planoTengo(t) { return !!(G.planos && G.planos[t]); }
// 13/8: el plano también vive en la HOTBAR (primer hueco libre) — colocarlo sin abrir la bolsa
// 18/8: los planos también se mudaron al Cobertizo — ya no ocupan un hueco de la barra rápida
function planoAHotbar() {}
function darPlano(t, silencioso) {
  const b = BUILD_DEF[t]; if (!b) return;
  if (G.built && G.built[t]) return;                  // ya construido
  if (G.obras && G.obras[t]) return;                  // la obra ya está colocada
  G.planos = G.planos || {};
  if (G.planos[t]) { planoAHotbar(t); return; }   // 13/8: guardados viejos — asegurar que esté en la barra
  G.planos[t] = 1;
  if (!silencioso) {
    /* 19/8: y el aviso de la entrega repetía el error — "está en tu bolsa", "desde tu barra
       rápida". Los planos viven en el COBERTIZO desde el 18/8. */
    /* 20/8: el aviso también nombra el camino. "Está en el Cobertizo" no sirve de nada si el
       jugador no sabe que el Cobertizo se abre desde el Menú. */
    log("¡Ganaste el PLANO de " + b.label + "! Te espera en el Cobertizo (Menú ☰ → Cobertizo): abrilo y elegí dónde va.", "gold");
    toast("📜 ¡Plano de " + b.label + "! → Menú ☰ → Cobertizo");
    if (window.celebrate) celebrate({ title: "¡PLANO NUEVO!", sub: b.label, big: false, reward: "Te espera en el Cobertizo 🏚" });
  }
  planoAHotbar(t);
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
// al subir de nivel, al avanzar el tutorial y al cargar. Durante el TUTORIAL (13/8):
// cada plano cae recién cuando SU paso llega — playtest: con TESTEO el nivel corre tan
// rápido que el del Horno caía junto al de la Herrería y el jugador no sabía cuál era cuál.
var PLANO_PASO = { store: "place_store", horno: "place_horno", cocina: "place_cocina", altar: "place_altar" };   // 13/8 v2: el plano cae JUSTO en su paso de colocación
function tutoIdx(id) { return TUTO_STEPS.findIndex(s => s.id === id); }
function planosSync(silencioso) {
  // 14/8 v2 (playtest: "el plano de la Herrería me llegó ANTES de vender las papas"):
  // DURANTE el tutorial, los planos cuyo paso está en la cadena llegan SOLO cuando su
  // misión "colocá el plano" aparece — el momento narrativo correcto. Los planos sin
  // paso en la cadena (Altar, Establo…) y todo el post-tutorial van por NIVEL puro.
  const tutoOn = G.tuto && !G.tuto.done;
  const paso = tutoOn ? (G.tuto.step || 0) : -1;
  const todos = {}; for (const t in PLANO_NIVEL) todos[t] = 1; for (const t in PLANO_OFICIO) todos[t] = 1;
  for (const t in todos) {
    const gate = PLANO_PASO[t];
    const gi = gate ? tutoIdx(gate) : -1;
    if (tutoOn && gi >= 0) { if (paso >= gi) darPlano(t, silencioso); continue; }   // en la cadena: manda el paso
    // 19/8: fuera de la cadena manda SU puerta — el oficio si lo tiene, y si no el nivel de granja
    if (PLANO_OFICIO[t] ? planoOficioListo(t) : (G.level >= PLANO_NIVEL[t])) darPlano(t, silencioso);
  }
}
// ¿esta acción ya fue presentada por el tutorial? (embudo 13/8: hasta que el paso de una
// acción llega, la acción está cerrada — y una vez llegado, queda abierta para siempre)
function tutoDesbloqueado(stepId) {
  if (!G.tuto || G.tuto.done) return true;
  return (G.tuto.step || 0) >= tutoIdx(stepId);
}

/* ============ EMBUDO ESTRICTO (13/8): en el arranque, SOLO lo que el objetivo pide ==
   Playtest: durante "colocá el plano" se podía plantar, cosechar acelerado, vender,
   talar y picar — puro grindeo fuera de guion. Lista blanca POR PASO para las acciones
   del loop económico (plantar, vender, comprar semillas, talar, picar). Reglas fijas:
   COSECHAR lo ya plantado y trabajar OBRAS se permiten siempre (no generan plata por
   sí solos). Los pasos que no figuran en la tabla (combate en adelante) van libres:
   ahí el juego ya es el juego. */
// TODOS los pasos tienen su lista (13/8, pedido del usuario: estricto total). Cada
// paso permite SU acción + las estrictamente necesarias para cumplirla (craftear
// hachas cuando hay que talar porque se gastan; el loop entero cuando hay que juntar
// plata; cocinar cuando el paso lo pide). Al terminar el tutorial, todo libre.
var TUTO_PERMISOS = {
  // 14/8 v2 (playtest: compró 1 semilla, la plantó, cosechó y quedó BLOQUEADO en "cosechá
  // tus 3"): el cuarteto inicial permite el loop ENTERO — es la fase de enseñanza y las
  // flechas guían el orden; los permisos no pueden exigir 3 papas y a la vez impedir
  // producirlas. Además "harvest" pasó a estar SIEMPRE permitido (ver tutoPermite).
  buyseed:     ["buyseed", "plant", "harvest"],
  plant:       ["plant", "buyseed", "harvest"],
  harvest:     ["harvest", "plant", "buyseed"],
  sell:        ["sell", "harvest", "plant", "buyseed"],
  place_store: ["obra"],
  /* 20/8 (la jugada completa encontró la TRAMPA): los cuatro pasos de "juntá material" permitían
     solo talar/picar/craftear — pero el hacha cuesta 2 DE PLATA y el pico también, y la plata del
     jugador temprano sale de VENDER papas. Las 35 hachas del kit dan 35 maderas justas y el
     tutorial pide ~40 entre obras y espada: quien llegaba corto quedaba encerrado (sin hacha, sin
     plata y sin permiso para vender), con el kit de emergencia en $Golden como única salida.
     Es EXACTAMENTE el rincón que craftarm arregló el 19/8; se le da la misma red: el bucle
     completo de la plata (plantar, cosechar, comprar semilla, vender). */
  wood_st:     ["chop", "crafttool", "cultivar", "plant", "harvest", "buyseed", "sell"],   // 14/8: cultivar más árboles = juntar en paralelo (anti-tedio)
  stone_st:    ["mine", "crafttool", "plant", "harvest", "buyseed", "sell"],
  build_store: ["obra"],
  wood:        ["chop", "crafttool", "cultivar", "plant", "harvest", "buyseed", "sell"],
  stone:       ["mine", "crafttool", "plant", "harvest", "buyseed", "sell"],
  place_horno: ["obra"],
  build_horno: ["obra"],
  crafttool:   ["crafttool"],
  woodc:       ["chop", "crafttool", "cultivar", "plant", "harvest", "buyseed", "sell"],
  stonec:      ["mine", "crafttool", "plant", "harvest", "buyseed", "sell"],
  place_cocina: ["obra"],
  build_cocina: ["obra"],
  cook:        ["cook", "plant", "harvest", "buyseed", "chop", "crafttool"],   // 14/8: red por si malgasta el kit de ingredientes
  /* 19/8: le faltaba el bucle del cultivo. El razonamiento del 14/8 —"si vendió su único plato,
     puede recocinar"— solo vale si le QUEDAN ingredientes: quien vendió el plato Y las papas se
     quedaba sin nada que hacer, con dos gestos permitidos y ninguna forma de conseguir una papa.
     Es un rincón raro, pero es exactamente el tipo de rincón que se lleva a un jugador nuevo. */
  eat:         ["eat", "cook", "buyseed", "plant", "harvest", "sell", "chop", "mine", "cultivar"],
  unlockarm:   ["unlockarm", "chop", "mine", "crafttool", "repair"],   // 14/8: el desbloqueo pide 20 madera + 20 piedra — se juntan acá (la plata llega de adelanto)
  /* 19/8: estos dos pasos llegan justo después de construir el Horno, y forjar pide 5 de madera que
     puede que el jugador no tenga. Si el permiso fuera solo "craftarm", quedaría encerrado sin
     poder talar para conseguirla. Se abren los gestos de juntar y el bucle de la plata. */
  craftarm:    ["craftarm", "chop", "mine", "crafttool", "cultivar", "plant", "harvest", "buyseed", "sell"],
  equiparm:    ["equiparm", "craftarm", "chop", "plant", "harvest", "buyseed", "sell"],
  /* 19/8: el portal es ahora el ÚLTIMO paso del tutorial, así que su permiso no puede ser una
     jaula. Con ["portal","cook","eat"] el jugador terminaba el tutorial sin poder plantar ni talar
     hasta entrar a pelear — justo al revés de lo que queremos: entrar tiene que ser una invitación,
     no un peaje. Se abre el juego entero. */
  portal:      ["portal", "cook", "eat", "chop", "mine", "cultivar", "plant", "harvest", "buyseed", "sell", "crafttool", "craftarm", "equiparm", "fish", "obra"],
  /* 19/8: "cazá 3 bichos" es el último paso del tutorial. Si su permiso fuera solo pelear, el
     jugador que muere o se queda sin estamina no podría ni plantar mientras se repone. */
  kill:        ["portal", "cook", "eat", "crafttool", "craftarm", "equiparm", "chop", "mine", "cultivar", "plant", "harvest", "buyseed", "sell", "fish", "obra"],
  /* Los dos pasos que cierran el tutorial dejan el juego entero abierto: cazar depende del azar del
     botín y de la estamina, así que el jugador tiene que poder seguir con su granja mientras. */
  hunt:        ["portal", "cook", "eat", "chop", "mine", "cultivar", "plant", "harvest", "buyseed", "sell", "fish", "obra", "crafttool", "craftarm", "equiparm"],
  estofado:    ["cook", "eat", "portal", "chop", "mine", "cultivar", "plant", "harvest", "buyseed", "sell", "fish", "obra"],
  /* La expansión pide madera y piedra, así que el paso TIENE que dejar talar y picar; y los dos
     siguientes son gestos de un clic que no deben cerrar nada. */
  expandir:    ["expandir", "chop", "mine", "cultivar", "plant", "harvest", "buyseed", "sell", "cook", "eat", "fish", "portal", "obra", "crafttool"],
  editar:      ["editar", "regalo", "chop", "mine", "cultivar", "plant", "harvest", "buyseed", "sell", "cook", "eat", "fish", "portal", "obra"],
  kill5:       ["portal", "cook", "eat", "crafttool", "craftarm"],
  /* 19/8: pescar necesita comprar carnada, así que el paso TIENE que dejar comprar y vender; y el
     tablón pide entregar algo que quizá haya que cultivar o talar primero. Los dos son los últimos
     pasos del tutorial: encerrar la granja acá no tendría ningún sentido. */
  excavar:     ["excavar", "fish", "buyseed", "sell", "plant", "harvest", "chop", "mine", "cultivar", "cook", "eat", "obra", "portal"],
  fish:        ["fish", "excavar", "crafttool", "eat", "buyseed", "sell", "plant", "harvest", "chop", "mine", "cultivar", "cook", "obra", "portal"],
  pedido:      ["pedido", "sell", "buyseed", "plant", "harvest", "chop", "mine", "cultivar", "cook", "eat", "fish", "obra", "portal"],
  // Fixes.docx 14/8 #2: la cadena del Altar cruza media economía (oro → Pico de Oro →
  // bronce → barras → Horno…), así que sus 4 pasos dejan el loop ENTERO abierto
  place_altar: ["obra", "chop", "mine", "sell", "plant", "harvest", "buyseed", "crafttool", "craftpick", "mat", "plotunlock"],
  stone_al:    ["mine", "crafttool", "craftpick", "mat", "sell", "plant", "harvest", "buyseed", "cultivar"],
  wood_al:     ["chop", "crafttool", "craftpick", "mat", "sell", "plant", "harvest", "buyseed", "cultivar"],
  build_altar: ["obra", "chop", "mine", "sell", "plant", "harvest", "buyseed", "crafttool", "craftpick", "mat", "plotunlock"],
  upgrade:     ["altar", "eat"],
  mat:         ["mat", "chop", "mine", "crafttool"],
  craftpick:   ["craftpick", "mat", "chop", "mine", "crafttool"],   // el pico pide barras del horno
  mineore:     ["mine", "craftpick", "crafttool"],
  dummy:       ["dummy", "eat"],
  unlocknode:  ["chop", "mine", "cultivar", "crafttool"],
  chest:       ["chest", "chop", "crafttool"],   // el cofre pide madera
  invexp:      ["invexp", "sell", "plant", "harvest", "buyseed", "chop", "mine", "crafttool"],   // ampliar pide plata/minerales
  passclaim:   ["passclaim"],
  socket:      ["altar", "eat"],
};
/* 14/8 (dirección, decisión final): los objetivos son una GUÍA OPCIONAL — no restringen
   NADA. El jugador los sigue cuando quiere o los ignora y juega como quiera. tutoPermite
   queda como función (hay ~13 llamadas repartidas) pero siempre dice que sí; la tabla
   TUTO_PERMISOS se conserva como documentación de qué acción enseña cada paso. */
function tutoPermite(tag) { return true; }
function tutoAviso() {
  const sub = (typeof tutoSub === "function") ? tutoSub() : null;
  const st = tutoActivo();
  toast("🎯 Ahora toca: " + (sub ? sub.txt : (st ? tutoTxt(st) : "el objetivo")));
}
/* 13/8 v3 (playtest cocina): "juntá 20 de madera" con CERO hachas no llevaba a ningún lado.
   El tutorial ahora detecta si podés cumplir el paso activo y, si no, antepone un
   SUB-OBJETIVO con su propia guía (cartel + flechas + permisos):
   sin hachas → craftearla en la Herrería → y si falta la plata, vender/plantar papa.
   pico roto → repararlo en la Herrería. Se recalcula solo: al resolverse, vuelve el paso. */
// la CADENA de la plata, eslabón por eslabón: vender lo cosechado → cosechar lo listo →
// esperar lo que crece → plantar lo que hay → comprar semillas → vender materiales.
// Se usa tanto en los pasos "juntá plata" como cuando falta la plata del hacha (13/8 v4).
// v5 (playtest): CON NÚMEROS — el plan calcula la TANDA entera ("comprá 4 semillas") en
// vez de dejar caer al jugador en el ciclo de a una semilla, que era un suplicio.
function tutoSubPlata(prefijo, meta) {
  // todos los eslabones llevan plata:true — el boost de DESVÍO se prende con esa marca.
  // 14/8 (playtest): TODOS los eslabones permiten el loop agrícola COMPLETO — con el boost
  // la papa está lista en ~22 s, el sub saltaba a "cosechá" (que solo permitía cosechar) y
  // te frenaba la tanda a mitad de plantada: bucle de a 1 otra vez. El texto y la flecha
  // GUÍAN el foco; los permisos no estrangulan la mano.
  const falta = Math.max(0, (meta || 0) - Math.floor(G.plata));
  // vender lo cosechado: el de MAYOR precio primero
  const conStock = Object.keys(CROP_DEF || {}).filter(k => (G.res[k] || 0) > 0)
    .sort((a, b) => (CROP_DEF[b].price || 0) - (CROP_DEF[a].price || 0))[0];
  if (conStock) {
    const n = Math.floor(G.res[conStock]), cd = CROP_DEF[conStock];
    const alcanza = meta && (G.plata + n * (cd.price || 0)) >= meta;
    return { plata: true, meta: meta || 0, txt: prefijo + "vendé tus " + n + " " + (cd.label || conStock).toLowerCase() + (n > 1 ? "s" : "") + (alcanza ? " — con eso alcanza" : ""),
      target: "market", panel: "ov-market", ui: "#vb-" + conStock, permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  }
  const plots = Array.isArray(G.plots) ? G.plots : [];
  const listos = plots.filter(p => p && p.state === "ready").length;
  if (listos) return { plata: true, meta: meta || 0, txt: prefijo + "cosechá tus " + listos + " cultivo" + (listos > 1 ? "s" : "") + " listo" + (listos > 1 ? "s" : ""),
    target: "plot", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  // Fixes.docx 14/8 #3: comprar más semillas sigue permitido en estos eslabones — antes,
  // al comprar UNA el sub saltaba a "plantá" y bloqueaba el resto de la tanda (de a 1, feo)
  if (plots.some(p => p && p.state === "growing")) return { plata: true, meta: meta || 0, txt: prefijo + "tus cultivos están creciendo — cosechalos apenas estén",
    target: "plot", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  const semillas = Object.keys(G.seeds || {}).reduce((a, k) => a + Math.floor(G.seeds[k] || 0), 0);
  if (semillas) return { plata: true, meta: meta || 0, txt: prefijo + "plantá tus " + semillas + " semilla" + (semillas > 1 ? "s" : ""),
    target: "plot", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  // 14/8 (dirección): el plan elige el MEJOR cultivo desbloqueado (mayor ganancia neta por
  // semilla) — cebolla rinde 10 netos contra 2 de la papa: 4-5 tandas en vez de 20. Con el
  // boost de desvío todos crecen acelerados, no solo la papa.
  let mejor = "papa";
  for (const k in CROP_DEF) {
    const cd = CROP_DEF[k];
    const abierta = (typeof cropUnlocked === "function") ? cropUnlocked(k) : k === "papa";
    if (!abierta || G.plata < (cd.seedCost || 1)) continue;
    if (((cd.price || 0) - (cd.seedCost || 0)) > ((CROP_DEF[mejor].price || 0) - (CROP_DEF[mejor].seedCost || 0))) mejor = k;
  }
  const cd = CROP_DEF[mejor] || {};
  const precio = cd.seedCost || 1, gana = Math.max(1, (cd.price || 3) - precio);
  if (G.plata >= precio) {
    // la tanda ÚTIL: las que hagan falta para llegar a la meta, tope en lo que alcanza la plata
    const utiles = falta ? Math.ceil(falta / gana) : 3;
    const n = Math.max(1, Math.min(Math.floor(G.plata / precio), utiles));
    const deUna = falta && (G.plata - n * precio + n * (cd.price || 3)) >= meta;
    const nom = (cd.label || mejor).toLowerCase();
    const accion = n > 1 ? "comprá " + n + " semillas de " + nom + " de UNA y plantalas todas" : "comprá 1 semilla de " + nom + " y plantala";
    return { plata: true, meta: meta || 0, txt: prefijo + accion + (deUna ? " — una tanda y alcanza" : ""),
      target: "market", panel: "ov-market", ui: "[data-buy='" + mejor + "']", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  }
  return { plata: true, meta: meta || 0, txt: prefijo + "vendé lo que tengas suelto en el Mercado (el guardia protege lo del objetivo)",
    target: "market", panel: "ov-market", ui: "#shop-sell", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock", "chop", "mine"] };
}
/* ============ QUÉ HACER MIENTRAS SE ESPERA (19/8, dirección) =======================
   Hubo dos intentos por CARTEL —una segunda línea, y una línea que rotaba con cuenta atrás— y los
   dos se descartaron por lo mismo: poner la espera en palabras la vuelve el protagonista.
   La respuesta estaba ya en el juego y es del mundo, no de la interfaz: las MARIPOSAS. Cualquier
   recurso disponible y desatendido atrae una, y lo del objetivo actual va primero. El jugador mira
   su granja, ve algo revolotear, y va. Ver mariposaAccionables() en farm.js. */
function tutoSub() {
  const st = tutoActivo(); if (!st) return null;
  // paso "juntá plata": si no hay NADA cosechado para vender, guiar al eslabón anterior
  // (playtest: "vendé tus papas" apuntando al Mercado con cero papas en la bolsa)
  if (st.res === "plata") {
    const hayCosecha = Object.keys(CROP_DEF || {}).some(k => (G.res[k] || 0) > 0);
    return hayCosecha ? null : tutoSubPlata("Para esa plata: ", tutoNeed(st));   // con cosecha, el paso ya te manda a vender
  }
  // 14/8 (dirección): en los pasos "juntá madera" el plan cubre el paso ENTERO — se
  // calculan las hachas que faltan para TODA la meta (1 tala = 1 uso) y se junta la plata
  // COMPLETA de una tanda, en vez de rebotar de a 10 en 10 (talar → rota → papa → craftear)
  if (st.res === "madera" && typeof toolCount === "function") {
    if (!(G.built && G.built.store)) return null;   // fase pre-Herrería: con las hachas de arranque alcanza
    const falta = Math.max(0, tutoNeed(st) - tutoTiene(st));
    const hachas = Math.max(0, falta - toolCount("axe"));
    if (hachas > 0) {
      const costo = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
      const plataNec = hachas * costo;
      if (G.plata >= plataNec) return { txt: "Crafteá tus " + hachas + " hacha" + (hachas > 1 ? "s" : "") + " de UNA (" + plataNec + " de plata" + (hachas >= 5 ? ", usá el botón ×5" : "") + ")",
        target: "store", panel: "ov-forge", ui: hachas >= 5 ? "[data-ctool5='axe']" : "[data-ctool='axe']", permite: ["crafttool"] };
      return tutoSubPlata("Te faltan " + hachas + " hachas (" + plataNec + " de plata): ", plataNec);
    }
    return null;   // hachas alcanzan para toda la meta: a talar
  }
  // 14/8 v2: planificador de PIEDRA como red de seguridad (el kit del adelanto ya entrega
  // los usos de pico al entrar al paso — esto solo salta si se drenaron, p.ej. picando
  // vetas de mineral). OJO: el pico NO se repara — a 0 usos se DESTRUYE (destroyPick); un
  // Pico de Piedra nuevo sale 3 madera + 10 plata por UN uso. La cadena: craftear picos →
  // sin plata, su plan → sin madera libre (la de la obra no se toca), talar.
  if (st.res === "piedra") {
    if (!(G.built && G.built.store)) return null;   // fase pre-Herrería: el pico de arranque alcanza
    const falta = Math.max(0, tutoNeed(st) - tutoTiene(st));
    const eq = (G.picks && G.picks.eq) || null;
    const usos = eq ? Math.floor((G.picks.dur && G.picks.dur[eq]) || 0) : 0;
    const picos = Math.max(0, falta - usos);   // picos de piedra a craftear (1 uso cada uno)
    if (picos <= 0) return null;               // el pico aguanta toda la meta: a picar
    const pd = (typeof PICK_DEF !== "undefined" && PICK_DEF.stone) || { cost: { madera: 3 }, plata: 10 };
    const plataNec = picos * (pd.plata || 10);
    const madNecT = picos * ((pd.cost && pd.cost.madera) || 3);
    let reservada = 0;
    if (st.dep && typeof obraDe === "function" && obraDe(st.dep) && typeof obraFalta === "function") {
      const f = obraFalta(st.dep).find(x => x[0] === "madera"); if (f) reservada = f[1];
    }
    const libre = Math.max(0, Math.floor(G.res.madera || 0) - reservada);
    if (libre >= madNecT && G.plata >= plataNec) return { txt: "Crafteá " + picos + " Pico" + (picos > 1 ? "s" : "") + " de Piedra (" + madNecT + " madera + " + plataNec + " de plata" + (picos >= 5 ? ", botón ×5" : "") + ")",
      target: "store", panel: "ov-forge", ui: picos >= 5 ? "[data-craft5='stone']" : "[data-craft='stone']", permite: ["craftpick", "mine", "chop", "crafttool"] };
    if (G.plata < plataNec) return tutoSubPlata("Para " + picos + " picos (" + plataNec + " de plata): ", plataNec);
    // plata alcanza pero falta madera LIBRE: talar (con hachas o su plan)
    const madFalta = madNecT - libre;
    const hachas = Math.max(0, madFalta - toolCount("axe"));
    if (hachas > 0) {
      const costoHacha = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
      const plataHachas = hachas * costoHacha;
      if (G.plata >= plataNec + plataHachas) return { txt: "Para los picos falta madera: crafteá " + hachas + " hacha" + (hachas > 1 ? "s" : "") + " (" + plataHachas + " de plata" + (hachas >= 5 ? ", botón ×5" : "") + ")",
        target: "store", panel: "ov-forge", ui: hachas >= 5 ? "[data-ctool5='axe']" : "[data-ctool='axe']", permite: ["crafttool", "chop", "craftpick", "mine"] };
      return tutoSubPlata("Para los picos y sus hachas (" + (plataNec + plataHachas) + " de plata): ", plataNec + plataHachas);
    }
    return { txt: "Talá " + madFalta + " árbol" + (madFalta > 1 ? "es" : "") + " — madera para los picos (lo de la obra no se toca)",
      target: "tree", permite: ["chop", "crafttool", "craftpick", "mine"] };
  }
  // 14/8 (sim escrita, traba 1): el paso del Hacha con 9 de plata era un muro de 9 min —
  // ahora tiene su sub de plata (meta 10) y la siembra del plan corre acelerada
  if (st.id === "crafttool") {
    const costo = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
    if (G.plata < costo) return tutoSubPlata("Para el Hacha (" + costo + " de plata): ", costo);
    return null;
  }
  const quiereTalar = st.id === "unlocknode" || st.id === "chest";
  if (quiereTalar && typeof toolCount === "function" && toolCount("axe") <= 0) {
    if (!(G.built && G.built.store)) return null;
    const plata = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
    if (G.plata < plata) return tutoSubPlata("Sin hachas (cuesta " + plata + " de plata): ", plata);
    return { txt: "Te quedaste sin hachas: crafteá una en la Herrería (" + plata + " de plata)",
      target: "store", panel: "ov-forge", ui: "[data-ctool='axe']", permite: ["crafttool"] };
  }
  return null;
}
function obraDe(t) { return G.obras && G.obras[t]; }
function obraColocar(t, col, row, vivo) {   // la llama la escena con la celda elegida
  if (!planoTengo(t)) return false;
  delete G.planos[t];
  // 13/8: el plano usado sale de la hotbar (entró solo al ganarlo)
  if (Array.isArray(G.hotbar)) G.hotbar = G.hotbar.map(h => (h && h.kind === "plano" && h.key === t) ? null : h);
  G.obras = G.obras || {}; G.obras[t] = { col, row };   // la posición queda para SIEMPRE (también construido)
  G.obraDep = G.obraDep || {}; G.obraDep[t] = G.obraDep[t] || {};
  if (typeof syncSlots === "function") syncSlots();
  if (typeof tutoEvent === "function") tutoEvent("place_" + t);   // 13/8: paso "colocá el plano" desglosado
  if (typeof saveFarm === "function") saveFarm(true);
  if (typeof refreshHotbar === "function") refreshHotbar(true);
  // 13/8: si la escena puede dibujar la obra EN VIVO ya no se reinicia (chau telón oscuro);
  // el reinicio con fundido queda solo de respaldo
  if (!vivo) reiniciarGranjaSuave();
  return true;
}
// el reinicio de escena reconstruye ~570 sprites y se sentía como un CONGELAMIENTO (13/8).
// Con el telón de 160 ms del fundido que ya existe, el mismo parpadeo se lee como transición.
/* 18/8 (dirección): "el movimiento de cámara que te lo resetea también".
   El reinicio con telón queda solo para lo que cambia la FORMA del mundo (comprar terreno):
   césped, cerca, bosque y límites de cámara se rehacen enteros y eso no se puede hacer en vivo
   sin destripar create(). Pero lo que de verdad desorienta no es el corte: es que al volver la
   cámara está en otro sitio y con otro zoom. Eso sí tiene arreglo.
     · sin argumento  → vuelve EXACTAMENTE a donde estabas
     · con {x,y}      → vuelve mirando ahí (la expansión lo usa para enseñarte el terreno nuevo)
   Lo lee create() al final, después de fitCamera. */
function reiniciarGranjaSuave(mirarA) {
  try {
    /* Ojo: acá también hacía falta LA ESCENA (para leer su cámara y su zoom), no el ScenePlugin.
       `cam` salía undefined, así que la travesía de cámara entre reinicios nunca se guardaba y el
       jugador volvía siempre al encuadre por defecto. Mismo error, dos líneas más arriba. */
    const sc = window.FARM;
    const cam = sc && sc.cameras && sc.cameras.main;
    // se guarda zoomUser (el que eligió el jugador con la rueda), NO el zoom absoluto: el zoom
    // base se recalcula con el tamaño de pantalla y del mundo, que acaba de cambiar.
    GF._camTras = cam ? { mirar: mirarA || null, zoomUser: sc.zoomUser || 1,
                          scrollX: cam.scrollX, scrollY: cam.scrollY } : null;
  } catch (e) { GF._camTras = null; }
  const fade = document.getElementById("fadeblk");
  const reiniciar = () => { if (window.FARM && window.FARM.scene) { try { window.FARM.scene.restart(); } catch (e) {} } };
  if (!fade) { reiniciar(); return; }
  fade.style.transitionDuration = "160ms";
  fade.classList.add("on");
  setTimeout(() => { reiniciar(); setTimeout(() => fade.classList.remove("on"), 120); }, 170);
}
// qué falta depositar: [recurso, falta, total, puesto] — el $Golden cuenta como recurso más
function obraFalta(t) {
  const b = BUILD_DEF[t], dep = (G.obraDep && G.obraDep[t]) || {}, out = [];
  for (const r in b.cost) { const f = b.cost[r] - (dep[r] || 0); if (f > 0) out.push([r, f, b.cost[r], dep[r] || 0]); }
  if (b.golden) { const f = b.golden - (dep.golden || 0); if (f > 0) out.push(["golden", f, b.golden, dep.golden || 0]); }
  return out;
}
function obraDepositar(t) {   // devuelve true si con este depósito quedó COMPLETA
  const b = BUILD_DEF[t]; if (!b || !obraDe(t)) return false;
  // 14/8: durante el tutorial manda el PASO, no el nivel — misma regla que la entrega del
  // plano (planosSync): con el embudo estricto no hay forma de subir de nivel para destrabar
  const tutoOn = G.tuto && !G.tuto.done;
  if (!tutoOn && b.lvl && G.level < b.lvl) { toast(b.label + " pide granja nivel " + b.lvl); return false; }
  G.obraDep = G.obraDep || {}; const dep = G.obraDep[t] = G.obraDep[t] || {};
  const puso = [];
  for (const [r, falta] of obraFalta(t)) {
    const tengo = r === "golden" ? G.golden : Math.floor(G.res[r] || 0);
    const n = Math.min(falta, tengo);
    if (n <= 0) continue;
    if (r === "golden") G.golden -= n; else G.res[r] -= n;
    dep[r] = (dep[r] || 0) + n;
    puso.push("+" + n + " " + (r === "golden" ? "$Golden" : (RES_LABEL[r] || r)));
  }
  if (!puso.length) {
    toast("Te falta: " + obraFalta(t).map(x => x[1] + " " + (x[0] === "golden" ? "$Golden" : (RES_LABEL[x[0]] || x[0]))).join(" · "));
    return false;
  }
  toast("Depositaste " + puso.join(" · "));
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm(true);
  return obraFalta(t).length === 0;
}
function obraConstruir(t) {   // la llama la escena cuando el depósito se completó
  const b = BUILD_DEF[t];
  G.built[t] = true;
  if (G.obraDep) delete G.obraDep[t];
  if (typeof tutoEvent === "function") tutoEvent("build_" + t);
  addXp("crafting", 20);
  log("¡Construiste " + b.label + "!", "gold"); toast("¡" + b.label + " construida!");
  if (window.celebrate) celebrate({ title: "¡CONSTRUIDA!", sub: b.label, big: false, reward: "Ya está funcionando" });
  refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
}

// --- materiales intermedios (detalles213: "tablones / stone bar / iron bar / iron gold" mapeados a nuestros recursos) ---
const MAT_ORDER = ["tablon","barra_piedra","barra_bronce","barra_hierro","barra_oro"];
const MAT_DEF = {
  tablon:       { label:"Tablón de madera", sprite:"res_tablon",       cost:{ madera:3 } },
  barra_piedra: { label:"Bloques de piedra",  sprite:"res_barra_piedra", cost:{ piedra:3 } },
  barra_bronce: { label:"Barra de bronce",  sprite:"res_barra_bronce", cost:{ bronce:3 } },
  barra_hierro: { label:"Barra de hierro",  sprite:"res_barra_hierro", cost:{ hierro:3 } },
  barra_oro:    { label:"Barra de oro",     sprite:"res_barra_oro",    cost:{ oro:3 } },
};
var MAT_CD_MS = 6000;   // detalles viernes: craftear barras tiene enfriamiento
// ---- EDIFICIOS NIVEL 2 (recompensas de granja 17 / 21 / 27) ----
var EDIF2_HORNO = 40;    // % que se acorta el enfriamiento del Horno
var EDIF2_COCINA = 30;   // % que se acortan las cocciones
var EDIF2_COCINA_OLLA = 1;   // ollas extra de la Cocina
var EDIF2_ALTAR = 5;     // puntos de éxito extra en cada intento del Altar
function edif2(k) { return !!(G.edif2 && G.edif2[k]); }
function hornoCdMs() { return MAT_CD_MS * (edif2("horno") ? 1 - EDIF2_HORNO / 100 : 1); }
function cocinaFactor() { return edif2("cocina") ? 1 - EDIF2_COCINA / 100 : 1; }
function altarBonoExito() { return edif2("altar") ? EDIF2_ALTAR : 0; }
function matCdLeft(id) { G.matCd = G.matCd || {}; return Math.max(0, (G.matCd[id] || 0) - nowMs()); }
// crafteo en LOTE genérico: repite la acción hasta N veces y corta si ya no se puede (doc 2/8)
function craftLote(fn, id, n) {
  n = Math.max(1, n || 1);
  for (let i = 0; i < n; i++) {
    const antes = JSON.stringify([G.res, G.plata, G.golden, G.picks && G.picks.dur, G.weapons]);
    fn(id);
    if (JSON.stringify([G.res, G.plata, G.golden, G.picks && G.picks.dur, G.weapons]) === antes) break;   // no cambió nada: faltan materiales o hay enfriamiento
  }
}
function craftMat(id) {
  const md = MAT_DEF[id]; if (!md) return;
  const left = matCdLeft(id);
  if (left > 0) { toast(md.label + " en enfriamiento (" + Math.ceil(left / 1000) + "s)"); return; }
  if (!canAfford(md.cost)) { toast("Te faltan materiales"); return; }
  if (!roomForRes(id, 1)) { bagFull("craftear " + md.label); return; }
  if (typeof tutoPermite === "function" && !tutoPermite("mat")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(md.cost, 0, "fundir " + md.label)) return;   // guardia del tutorial (12/8)
  payCost(md.cost); G.res[id] = (G.res[id] || 0) + 1;
  G.matCd[id] = nowMs() + hornoCdMs();   // 14/8 v3: el horno ya no está en la cadena del tutorial — tiempo real siempre
  addXp("crafting", 3); log("Fundiste 1 " + md.label + " en el Horno.", "good"); toast("+1 " + md.label);
  if (typeof tutoEvent === "function") tutoEvent("mat");
  if (typeof refreshHorno === "function" && isOpen("ov-horno")) refreshHorno();
  if (isOpen("ov-inv")) refreshInv(); refreshHud();
}

// --- lombrices (detalles213): carnada de pesca, se compran en la Tienda ---
var WORM_PRICE = 3;
function buyWorm(qty) {
  qty = Math.max(1, Math.floor(qty || 1));
  const cost = WORM_PRICE * qty;
  if (G.plata < cost) { toast("Te falta plata"); return; }
  if (!roomForRes("lombriz", qty)) { bagFull("comprar lombrices"); return; }
  G.plata -= cost; G.res.lombriz = (G.res.lombriz || 0) + qty;
  log("Compraste " + qty + " lombriz(ces) por " + cost + " plata.", "good"); toast("+" + qty + " Lombriz");
  refreshHud(); if (typeof refreshSeedShop === "function") refreshSeedShop(); if (isOpen("ov-inv")) refreshInv();
}

// --- skills ---
/* ============ LOS OFICIOS (18/8, dirección) ========================================
   "Artesanía debería ser artesanía, el arte de crear algo, de craftear, no de talar. Talar es un
   oficio como lo es picar en minería o cultivar."
   REGLA, en una frase: un oficio tiene RECURSO propio, RELOJ propio y ACCIÓN repetida. Con esa
   vara, talar y cuidar animales son oficios y estaban escondidos dentro de otras skills — la tala
   dentro de Artesanía (que no extrae nada: transforma) y los animales dentro de Cultivo.
   La consecuencia práctica era que la barra de "Artesanía" era en realidad una barra de leñador
   con otro nombre: subía sobre todo talando, que es la acción más repetida del juego. */
const SKILL_DEFS = [["farming","","Cultivo"],["tala","","Tala"],["mining","","Minería"],
  ["fishing","","Pesca"],["ganaderia","","Ganadería"],["cooking","","Cocina"],["crafting","","Artesanía"],
  ["sword","","Espada"],["hacha","","Hacha (combate)"],["mazo","","Mazo"],["range","","Arco"]];
const SKILL_NAME = {}; SKILL_DEFS.forEach(([k,,nm]) => SKILL_NAME[k] = nm);
/* ============ LA CURVA DE HABILIDAD (18/8, dirección) ==============================
   "Las semillas se bloquean con la skill de Cultivo, no con el nivel de granja."
   Para que eso sea jugable la curva tenía que cambiar. Con 100/2,7 la skill no servía de puerta:
   los trece cultivos se apelotonaban en los niveles 1-9 (cuatro choques) y, según midió la
   auditoría de hoy, el nivel 40 pedía 3 AÑOS de juego sin parar y el 150, 408.
   10/2,46 sale de resolver las dos cosas a la vez: que los trece cultivos caigan en niveles
   distintos (1…20, uno por cultivo) y que la curva llegue a algún sitio. Ahora el 40 son 48 días
   y el 150, 13 años — sigue siendo un techo enorme, pero es una meta y no un muro. */
/* ============ LA XP MIDE LA PRÁCTICA, NO LA ESPERA (18/8, dirección) ===============
   "Que la experiencia esté ligada al tiempo que tarda algo en crecer es una inconsistencia muy
   abrupta." Y lo era: tres clics en netherita pagaban 1.440 XP y tres clics en una roca, 40 — el
   mismo gesto, 36 veces más, solo porque el reloj era más largo. La XP se había copiado del ancla
   económica, donde el tiempo SÍ es lo que se paga. Pero la XP no es dinero: es oficio. Un leñador
   no mejora esperando a que crezca el árbol; mejora talando.
   REGLA NUEVA: la XP se paga POR ACCIÓN COMPLETADA, escalada por el ESCALÓN del material (su
   posición en la escalera), no por su reloj. La plata sigue midiendo tiempo; la XP mide gestos.

   CONSECUENCIA, y hay que asumirla: los oficios de ciclo corto acumulan más XP por hora que los
   de ciclo largo. Con parcelas de 3 minutos se hacen 60 gestos por hora; talando, 6. Eso es
   correcto —quien hace 60 gestos ha practicado 60 veces— pero obliga a que CADA OFICIO TENGA SU
   CURVA. La garantía que se le da al jugador ya no es "el mismo número de XP" sino algo mejor:
       Minería 6 y Cultivo 6 significan lo mismo: unas 10 horas DE ESE OFICIO.
   RITMO es cuántas veces más rápido acumula cada oficio que el más lento (la Tala), medido con
   los nodos de arranque. La curva de cada uno se estira por ese factor. */
var XP_ACCION = 10;                    // una extracción del primer escalón
var XP_ESCALON = { piedra:1, bronce:2, hierro:3, oro:4, diamante:5, netherita:6 };
var XP_PEZ = 15, XP_ANIMAL = 20;
function xpDeNodo(tipo, key) {
  if (tipo === "tree") return XP_ACCION;
  return XP_ACCION * (XP_ESCALON[key] || 1);
}
function xpDeCultivo(k) {              // escalón 1..13 en la escalera de cultivos
  const i = (typeof CROP_ORDER !== "undefined") ? CROP_ORDER.indexOf(k) : -1;
  return XP_ACCION * (i >= 0 ? i + 1 : 1);
}
/* EL RITMO DE CADA OFICIO — cuánta XP paga por hora, comparado con la Tala (19/8, derivado).
   La regla aprobada es "el nivel N son las mismas horas en cualquier oficio". Para que eso sea
   verdad, la curva de cada oficio va multiplicada por LO QUE ESE OFICIO PAGA POR HORA.
   Estos números estaban escritos a mano y uno era falso: GANADERÍA valía 1 cuando lo real es
   0,083 — doce veces menos. Medido: la Curtiduría pedía 1,9 días en vez de 3,8 h, el toro 14,9
   días y el jabalí 47,3. Se coló porque el test de paridad comparaba cuatro oficios de once.
   Ahora salen de una cuenta contra el propio juego, así que no se pueden quedar viejos.
   Se calcula la PRIMERA VEZ que se pide, no acá: las tablas que necesita (ANIMAL_DEF, FISH_CD)
   se declaran más abajo en este mismo archivo. */
var SKILL_RITMO = null;
function skillRitmo(sk) {
  if (!SKILL_RITMO) {
    const REF = 3 * 3600 / CD.tree * XP_ACCION;                     // la vara: 3 árboles, 10 XP cada uno
    const xpH = {
      tala:      REF,
      mining:    3 * 3600 / CD.rock * XP_ACCION,                    // 3 rocas
      farming:   3 * 3600 / CROP_DEF.papa.grow * XP_ACCION,         // 3 parcelas de papa
      fishing:   3600 / FISH_CD * XP_PEZ,                           // 1 laguna
      ganaderia: 3 * XP_ANIMAL / ANIMAL_DEF.alpaca.cicloH           // 3 alpacas, 1 recogida por ciclo
    };
    SKILL_RITMO = {};
    for (const k in xpH) SKILL_RITMO[k] = Math.round(xpH[k] / REF * 1000) / 1000;
    /* Los que no tienen escalera van a 1: la Cocina lleva su tabla aparte (COOK_LVLS), y Artesanía
       y las cuatro de combate no abren material, así que su ritmo no calibra nada. */
    ["cooking", "crafting", "sword", "hacha", "mazo", "range"].forEach(k => SKILL_RITMO[k] = 1);
  }
  return SKILL_RITMO[sk] || 1;
}
var XP_BASE = 21, XP_EXP = 1.70;
function skillNeed(lvl, sk) {
  const r = sk ? skillRitmo(sk) : 1;
  const v = XP_BASE * r * Math.pow(lvl, XP_EXP);
  /* 19/8: los primeros escalones de un oficio LENTO piden menos de 10 de XP, y ahí redondear a
     entero deforma la curva —el nivel 2 de Ganadería pedía 2 en vez de 1,74: un 14% de más—.
     Por debajo de 10 se guardan dos decimales; de ahí para arriba el redondeo no se nota y los
     números quedan limpios. La XP se sigue ganando en enteros: esto solo afecta al listón. */
  return v < 10 ? Math.round(v * 100) / 100 : Math.round(v);
}
function skillInfo(xp, sk) { let lvl = 1, acc = 0, need = skillNeed(1, sk); while (xp >= acc + need && lvl < 150) { acc += need; lvl++; need = skillNeed(lvl, sk); } return { lvl, into: xp - acc, need }; }
// --- Barra de Combate GLOBAL (doc maestro 2/8): un solo nivel que suma la XP de TODOS los kills.
//     Convive con las skills por arma (esas siguen dando el +Nivel/2 al daño). Misma curva 1-150.
var COMBAT_HP5 = 20, COMBAT_HP10 = 40;   // vida máxima extra en los hitos (editables en el panel)
function combatInfo() { return skillInfo(G.combatXp || 0); }
function combatHpBonus(lvl) { return (lvl >= 5 ? COMBAT_HP5 : 0) + (lvl >= 10 ? COMBAT_HP10 : 0); }
// CURAR NO ES GRATIS (10/8). Antes, cada vez que la vida MÁXIMA subía se regalaba la
// diferencia como vida actual. Como se llama al equipar, alcanzaba con desequipar y volver a
// equipar un arma con Runa Guardiana (+120 de vida máx.) para curarse 120 de golpe, cuantas
// veces quisieras: la comida y el riesgo de la Zona Negra dejaban de existir.
// Ahora la vida máxima se recalcula igual, pero NO se regala vida. La única que cura sola es
// la subida de nivel de Combate, y eso lo hace addCombatXp a mano con curarPorNivel().
function applyCombatHp() {   // vida máxima = 100 + hitos de Combate (nivel 5 y 10)
  const want = 100 + combatHpBonus(combatInfo().lvl) + G.buffs.reduce((s, b) => s + (b.type === "hpmax" && b.on ? b.mult : 0), 0) + (typeof eqRunaVal === "function" && typeof armaEq === "function" ? eqRunaVal("guardiana") : 0) + (typeof armorBonoVal === "function" ? armorBonoVal("hpmax") : 0);
  if (G.hpMax !== want) { G.hpMax = want; G.hp = Math.min(G.hpMax, G.hp); }
}
// subir de nivel de Combate sí cura lo que sumó de vida máxima (es una recompensa, no un bucle)
function curarPorNivel(cuanto) { if (cuanto > 0) G.hp = Math.min(G.hpMax, (G.hp || 0) + cuanto); }
function addCombatXp(xp) {
  xp = Math.round(xp * combatXpMult());   // Guiso Campestre: +% XP de combate
  const before = combatInfo().lvl;
  G.combatXp = (G.combatXp || 0) + xp;
  const after = combatInfo().lvl;
  if (after > before) {
    const gano = combatHpBonus(after) - combatHpBonus(before);
    applyCombatHp();
    curarPorNivel(gano);   // el hito de nivel sí regala la vida que sumó
    const salto = after - before;   // un Trol puede subir varios niveles: UN solo cartel (doc)
    const hito = after === 5 || after % 10 === 0;
    const vida = combatHpBonus(after) > combatHpBonus(before) ? "+" + (combatHpBonus(after) - combatHpBonus(before)) + " de vida máxima" : "";
    log("Tu nivel de Combate subió a " + after + "." + (vida ? " " + vida + "." : ""), "good");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + after + "!" + (salto > 1 ? " (+" + salto + ")" : ""), sub: "Combate", big: hito, reward: vida });
    else { toast("¡Combate nivel " + after + "!"); if (window.sfx) sfx("level"); }
    if (window.onCombatLevelUp) window.onCombatLevelUp(after, salto);   // gancho para la celebración (Fase 5)
  }
  refreshHud();
}
function avgSkillLevel() { let s=0,n=0; for (const k in G.skills){ s+=skillInfo(G.skills[k], k).lvl; n++; } return n ? s/n : 1; }
function addXp(sk, amt) {
  if (!(sk in G.skills)) return;
  if (sk === "cooking") return addCookXp(amt);   // la cocina tiene SU tabla 1-10 (doc maestro 2/8)
  const before = skillInfo(G.skills[sk], sk).lvl;
  G.skills[sk] += amt;
  const after = skillInfo(G.skills[sk], sk).lvl;
  if (after > before) {
    log(`${SKILL_NAME[sk]} subió a nivel ${after}.`, "good");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + after + "!" + (after - before > 1 ? " (+" + (after - before) + ")" : ""), sub: SKILL_NAME[sk] });
    else { toast("" + SKILL_NAME[sk] + " nivel " + after); if (window.sfx) sfx("level"); }
  }
  if (sk === "farming" || sk === "mining" || sk === "fishing") recalcFarmLevel();   // la XP de granja y las tareas pueden habilitar el nivel
  if (after > before && typeof oficiosSync === "function") oficiosSync(false);   // 19/8: el oficio abre planos y mejoras
  if (typeof passEvent === "function") passEvent(sk);   // misiones del Pase de Batalla
  if (isOpen("ov-skills")) refreshSkills();
}
function addCookXp(amt) {
  amt = Math.round(amt * (1 + buffTotal("cookxp") / 100));   // Pan de Trigo: +% XP de cocina
  const before = cookLevel();
  G.skills.cooking = (G.skills.cooking || 0) + amt;
  const after = cookLevel();
  if (typeof passEvent === "function") passEvent("cooking");   // misión "cociná" del Pase
  if (after > before) {
    const rec = RECIPE_ORDER.filter(id => RECIPE_DEF[id].lvl === after && !RECIPE_DEF[id].desc).map(id => RECIPE_DEF[id].label);
    log("Cocina subió a nivel " + after + (rec.length ? ". Nueva receta: " + rec.join(" · ") : "") + (after === 8 ? ". ¡Ya podés vender platos por $Golden!" : "") + ".", "good");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + after + "!", sub: "Cocina" + (after >= 10 ? " maestra" : ""), big: after >= 10,
      reward: (rec.length ? "Nueva receta: " + rec.join(" · ") : "") + (after === 8 ? (rec.length ? " · " : "") + "Venta en $Golden" : "") });
    else { toast("Cocina nivel " + after); if (window.sfx) sfx("level"); }
    if (window.onCookLevelUp) window.onCookLevelUp(after);   // celebración (Fase 5)
    if (typeof oficiosSync === "function") oficiosSync(false);   // 19/8: la Cocina abre su nivel 2
  }
  if (isOpen("ov-skills")) refreshSkills();
}

// --- niveles de granja ---
// DOC MAESTRO 2/8: el nivel de granja sube SOLO con XP de Farmeo (curva front-loaded 1-10) y regala desbloqueos
// DOC "2das mejoras" (4/8): la granja llega a NIVEL 50. Del 1 al 10 se sube solo con XP de cosecha;
// del 11 al 50 hace falta la XP Y cumplir TAREAS (plantar, talar, minar, matar, pescar, cocinar).
// 14/8 (dirección): los primeros 10 niveles ~2.5× más lentos — con la curva vieja el nivel
// 3 eran 4 papas y el 5 eran 24: los PLANOS llovían a la barra en los primeros 5 minutos.
// Ahora nivel 2 = 3 papas, nivel 3 = 10, nivel 5 = ~60 (o menos con cultivos mejores).
// Del 11 en adelante la tabla original del diseñador sigue igual.
var FARM_XP_LVLS = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000,
  17600, 25100, 33600, 43300, 54200, 66500, 80400, 96000, 114000, 134000,
  156000, 180000, 207000, 237000, 270000, 307000, 348000, 393000, 442000, 496000,
  555000, 619000, 689000, 765000, 848000, 938000, 1030000, 1130000, 1240000, 1360000,
  1490000, 1630000, 1780000, 1940000, 2110000, 2290000, 2480000, 2680000, 2890000, 3110000];
const FARM_NIVEL_MAX = 50;
// tareas por nivel: [tipo, clave, cantidad] · tipos: plantar/talar/minar/matar/pescar/cocinar
const FARM_TAREAS = {
  11: [["plantar","repollo",20],["talar",null,30]],
  12: [["minar","bronce",25],["matar","rata",25]],
  13: [["plantar","calabaza",25],["matar","larva",20]],
  14: [["talar",null,40],["matar","murcielago",20]],
  15: [["plantar","brocoli",30],["minar","hierro",30]],
  16: [["matar","baba",30],["pescar",null,20]],
  17: [["plantar","calabaza",35],["minar","bronce",35]],
  18: [["matar","arana",25],["matar","goblin",25],["talar",null,50]],
  19: [["cocinar",null,20],["minar","hierro",40]],
  20: [["plantar","calabaza",40],["matar","orco",30],["matar","rata",20]],
  21: [["plantar","girasol",30],["minar","oro",40]],
  22: [["matar","lancero",30],["talar",null,60]],
  23: [["matar","esqueleto",25],["pescar",null,30]],
  24: [["plantar","girasol",35],["minar","oro",30]],
  25: [["matar","golem",20],["cocinar",null,25]],
  26: [["plantar","trigo",25],["minar","oro",45]],
  27: [["matar","hombre_lobo",25],["talar",null,80]],
  28: [["minar","diamante",30],["matar","guerrero",30]],
  29: [["plantar","trigo",30],["pescar",null,40]],
  30: [["matar","troll",30],["matar","ogro",20],["minar","diamante",35]],
  31: [["plantar","trigo",35],["minar","diamante",40]],
  32: [["matar","ogro",30],["talar",null,100]],
  33: [["cocinar",null,40],["minar","diamante",45]],
  34: [["matar","espectro",25],["plantar","trigo",30]],
  35: [["minar","diamante",50],["matar","ogro",30]],
  36: [["plantar","maiz",30],["matar","espectro",30]],
  37: [["minar","netherita",20],["talar",null,120]],
  38: [["matar","demonio",25],["cocinar",null,50]],
  39: [["plantar","maiz",35],["minar","netherita",25]],
  40: [["matar","demonio",30],["minar","netherita",30]],
  41: [["plantar","maiz",40],["pescar",null,60]],
  42: [["matar","espectro",40],["matar","demonio",20],["minar","netherita",35]],
  43: [["minar","netherita",40],["talar",null,150]],
  44: [["matar","dragon",1],["plantar","maiz",40]],
  45: [["minar","netherita",45],["matar","demonio",30]],
  46: [["plantar","maiz",50],["matar","dragon",2]],
  47: [["minar","netherita",50],["cocinar",null,80]],
  48: [["matar","dragon",3],["minar","netherita",55]],
  49: [["plantar","maiz",60],["matar","demonio",50],["matar","dragon",5]],
  50: [["matar","dragon",5],["minar","netherita",70],["plantar","maiz",80]],
};
// recompensas: parcela (nº), cofre (+capacidad), edificio nivel 2, y cosméticos (título/decoración/emote/marco/skin/aura)
const FARM_UNLOCK = {
  2: "4ª parcela GRATIS", 3: "Horno básico disponible", 4: "5ª parcela GRATIS", 5: "Cocina disponible",
  6: "6ª parcela GRATIS", 7: "7ª parcela GRATIS", 8: "Cultivo Girasol", 9: "Cultivo Trigo", 10: "Cultivo Maíz",
  11: "Decoración de granja", 12: "8ª parcela", 13: "+10 de capacidad de cofre", 14: "Marco de perfil",
  15: "Título 'Granjero Experto'", 16: "Decoración", 17: "Horno nivel 2 (más rápido)", 18: "9ª parcela",
  19: "Emote", 20: "Título 'Maestro de Cultivos' + decoración exclusiva", 21: "Cocina nivel 2 (más rápida)",
  22: "Decoración", 23: "+10 de capacidad de cofre", 24: "Marco de perfil", 25: "10ª parcela + Título 'Veterano'",
  26: "Decoración", 27: "Altar de Runas nivel 2", 28: "Emote", 29: "Decoración",
  30: "Título 'Leyenda Naciente' + aura menor", 31: "Decoración", 32: "Marco de perfil", 33: "+15 de capacidad de cofre",
  34: "Decoración", 35: "11ª parcela + Título 'Amo de la Granja'", 36: "Decoración", 37: "Skin de herramienta",
  38: "Emote", 39: "Decoración", 40: "Título 'Señor de la Cosecha' + aura", 41: "Decoración", 42: "Marco de perfil",
  43: "Skin de granjero", 44: "Decoración", 45: "12ª parcela + Título 'Élite'", 46: "Decoración",
  47: "Skin de arma", 48: "Emote", 49: "Decoración",
  50: "13ª parcela + Título 'Leyenda de la Granja Dorada' + AURA DORADA + skin de granja legendaria",
};
/* 18/8 (reporte del diseñador: "la parcela gratis no la da la granja; dice que te la da pero no
   aparece"). No es que no apareciera: es que no se regalaba ninguna. El 14/8 se pasó a NACER CON
   3 PARCELAS ("la primera misión planta 3 semillas y tiene que haber 3 celdas donde apuntar"),
   pero esta tabla y sus textos siguieron escritos para cuando se nacía con 2. Al nivel 2 el cartel
   anunciaba "3ª parcela GRATIS", regalosSync hacía la resta 3 − 3 = 0 y no encolaba nada. El
   jugador leía la promesa en el cartel de nivel y no encontraba la parcela por ningún lado.
   Corregido: la escalera empieza en la 4ª, que es la que de verdad toca. */
/* ============ LA CURVA DE CELDAS PRODUCTIVAS (18/8, dirección) ======================
   "El diseñador dice que las parcelas son muy pocas. La idea no es agregar al tuntún."
   MEDIDO (tools/costear-parcelas.js): el ancla se cumple — parcela, árbol y roca dan las TRES
   20 plata/hora netas. O sea que el número de parcelas no desequilibra nada por sí solo; lo que
   hay que decidir a conciencia es (a) la curva TOTAL de celdas y (b) el reparto entre las tres.
   DIAGNÓSTICO: las parcelas eran el 40% del total por nivel y, contando lo que traen las 16
   expansiones (1 árbol + 1 roca cada una), solo el 23% del final. En un juego de granja eso está
   del revés: la parcela es lo que el jugador toca, el nodo es lo que trabaja solo mientras no está.
   DECISIÓN: se ADELANTA la curva sin subir el techo. Las 13 parcelas por nivel siguen siendo 13,
   pero se llega en el nivel 22 y no en el 50, y el tramo 1-10 va mucho más rápido. Y cada
   expansión pasa a traer 1 PARCELA + 1 nodo en vez de 1 árbol + 1 roca: mismas 2 celdas por
   expansión, mismo total de 57 celdas al final, pero las parcelas pasan del 23% al 51%.
   De regalo, arregla el tutorial: más árboles y rocas antes = menos horas mirando el reloj. */
/* 18/8: LAS PARCELAS TAMPOCO LAS DA EL NIVEL. Vienen con la expansión, igual que el árbol y la
   roca. La tabla se queda vacía a propósito: nodosQueTocan ya no la usa, pero varios sitios la
   leen y romper eso hoy sería buscarse un fallo tonto. */
const FARM_PARCELA = {};
/* ============ EL CARTEL DEL NIVEL SE DERIVA, NO SE ESCRIBE (18/8) ==================
   Al generar la tabla para el diseñador saltó que SIETE textos de FARM_UNLOCK mentían: en el
   nivel 25 le prometía al jugador "10ª parcela" cuando con la tabla nueva ya tiene 13, y en el
   7, el 12, el 18, el 35, el 45 y el 50 anunciaba parcelas que no llegan.
   Es la MISMA clase de fallo que el cartel que prometía la 3ª parcela y no llegaba ninguna: dos
   sitios que dicen lo mismo y solo uno se actualizó. La cuenta de parcelas sale ahora de
   FARM_PARCELA —la única que la sabe— y el texto a mano se queda solo con lo suyo (cosméticos,
   títulos, cultivos). Así no pueden volver a separarse. */
function parcelasDelNivel(n) {
  const en = (l) => { let p = 3; for (const k in FARM_PARCELA) if (l >= +k) p = FARM_PARCELA[k]; return p; };
  const d = en(n) - en(n - 1);
  return d > 0 ? (en(n) + "ª parcela") : "";
}
function farmUnlockTxt(n) {
  /* 18/8 (dirección): "el Granero lo dejaría con las dos cosas: que te desbloquee expansiones en
     ciertos niveles y el bono, y punto."
     Así que el cartel anuncia eso y lo que sigue colgando del nivel por el tutorial (los planos)
     o por comodidad (cofre, edificios de nivel 2). Ni parcelas, ni árboles, ni rocas: eso lo dan
     las expansiones. Ni cultivos: eso lo da la skill de Cultivo. */
  const partes = [];
  const ex = FARM_EXPANSION.indexOf(n); if (ex >= 0) partes.push("expansión " + (ex + 1));
  if (typeof PLANO_NIVEL !== "undefined") for (const t in PLANO_NIVEL)
    if (PLANO_NIVEL[t] === n && BUILD_DEF[t]) partes.push("plano de " + BUILD_DEF[t].label);
  if (typeof FARM_EDIF2 !== "undefined" && FARM_EDIF2[n] && BUILD_DEF[FARM_EDIF2[n]])
    partes.push(BUILD_DEF[FARM_EDIF2[n]].label + " nivel 2");
  if (typeof FARM_COFRE !== "undefined" && FARM_COFRE[n]) partes.push("+" + FARM_COFRE[n] + " de capacidad de cofre");
  /* 19/8 (dirección): el bono también en PLATA/HORA, entre paréntesis, detrás de lo que ya sabe.
     "+1,5% al precio de venta" no le dice nada a nadie; "+14 plata por hora" sí. Y es lo que hace
     que el tramo del 20 al 50 se lea como lo que es: entre expansión y expansión el bono aporta
     cerca de la mitad de lo que crece la granja, pero era invisible. */
  const bph = typeof fmt === "function" ? fmt(bonoPlataH()) : String(bonoPlataH());
  partes.push("+1,5% al precio de venta (≈ +" + bph + " de plata por hora)");
  return partes.join(" + ");
}
/* 17/8 — EN QUÉ NIVEL CAE CADA UNA DE LAS 16 EXPANSIONES (bloques de 5x5, ver GF.EXPANSIONES).
   El hueco se abre solo: 2 niveles entre las cinco primeras, 3 entre las cinco siguientes y 4
   entre las seis últimas. Arranca rápido para enseñar la mecánica y se espacia cuando cada
   nivel ya cuesta días.
   El bloque 16 cae en el 50, que es el techo de FARM_UNLOCK ("Leyenda de la Granja Dorada"):
   el mapa se termina de armar exactamente cuando se termina el arco de premios.
   PAQUETE: cada expansión trae el TERRENO (25 celdas) + 1 árbol + 1 roca. Siempre el mismo,
   así no hay tabla que memorizar y las 16 valen lo mismo.
   Las PARCELAS no vienen acá: siguen su propia escalera (FARM_PARCELA) y la tienda. El terreno
   es justamente lo que hace que valga la pena comprarlas — hoy el tope es 60 y no hay dónde
   ponerlas. */
/* ============ LAS EXPANSIONES SE DERIVAN (18/8, dirección) =========================
   "Ten en cuenta que quizás mañana pongamos más expansiones de las que tenemos hoy."
   Los niveles estaban escritos a mano y los costes pegados de una derivación vieja: añadir la 17ª
   obligaba a rehacer las dos tablas con los dedos. Ahora salen de EXPANSION_MAX.
   NIVELES: la primera en el 3 —cuando ya vendiste tu primera cosecha— y la última en el tope.
   En medio una curva suave: seguidas al principio, espaciadas al final.
   COSTES: no se eligen unidades. Se elige cuántas HORAS de la granja que YA TENÉS debe costar
   cada una (de 2 a 30) y se traduce a material con la producción real de ese momento. Así el
   precio sube solo cuando la granja crece y ninguna expansión es un muro. */
var EXPANSION_MAX = 16;                        // ← cambiar SOLO esto para tener más
const FARM_EXPANSION = (function () {
  const a = [], min = 3, max = 50;
  for (let i = 0; i < EXPANSION_MAX; i++) {
    let n = Math.round(min + (max - min) * Math.pow(i / (EXPANSION_MAX - 1), 1.25));
    if (i && n <= a[i - 1]) n = a[i - 1] + 1;
    a.push(Math.min(n, max));
  }
  return a;
})();
function expansionesQueTocan(lvl) { return FARM_EXPANSION.filter(n => n <= (lvl || 1)).length; }
/* COSTE DE CADA EXPANSIÓN. No son números a ojo: se elige cuántos DÍAS DE GRANJA debe costar cada
   una —de 1,5 la primera a 6 la última— y se traducen a unidades con la producción REAL que tenés
   en ese nivel, con los nodos que el nivel y las expansiones anteriores ya te dieron.

   18/8 — RE-DERIVADOS. La primera tanda salió con forma de U: 6,0 días la primera, 1,8 las del
   medio y 6,3 la última. O sea que la PRIMERA era de las más caras en tiempo real, justo cuando
   el jugador está aprendiendo y tiene 2 árboles y 2 rocas. Dos motivos: la producción que usé de
   referencia suponía más granja de la que hay al nivel 3, y después las vetas pasaron a dar 2 por
   picada, lo que abarató a la mitad todo lo que se paga en mineral.
   Ahora se mide contra la producción de cada nivel y la curva sube siempre: 1,5 → 6,0 días.

   Cada recurso pide los días que le tocan DE SU PROPIA producción. Como se juntan en paralelo
   (talás y picás a la vez), el total es esa misma cifra y ningún recurso es el cuello de botella.

   El nivel abre la puerta; el material marca el ritmo. Y como cobra MATERIAL y no plata, es además
   el sumidero que faltaba: la plata se farmea rápido con cultivos, la madera y los minerales están
   atados a los relojes de los nodos.
   Se re-mide con  node tools/auditar-costo-expansiones.js  */
/* Se calcula PEREZOSAMENTE: PRICE se define 2.000 líneas más abajo y una IIFE aquí arriba
   petaría al cargar. `EXPANSION_COSTO` sigue siendo un array para quien ya lo usaba; se rellena
   la primera vez que alguien lo lee. */
const EXPANSION_COSTO = [];
function expansionCostos() {
  if (EXPANSION_COSTO.length) return EXPANSION_COSTO;
  (function () {
  const ANCLA = 20, CELDAS_POR_EXP = 3;        // cada expansión trae 1 parcela + 1 árbol + 1 roca
  const H0 = 2, HN = 30;                        // horas de granja que cuesta la 1ª y la última
  const tramo = t => t < 0.20 ? [] : t < 0.40 ? ["bronce"] : t < 0.60 ? ["bronce", "hierro"]
    : t < 0.75 ? ["hierro", "oro"] : t < 0.90 ? ["oro", "diamante"] : ["diamante", "netherita"];
  /* ============ LAS DOS PRIMERAS SE MIDEN CONTRA OTRO RELOJ (20/8, dirección) =========
     "¿El coste de las expansiones es el correcto, o había que abaratarlo?"
     Medido con el jugador de tres sesiones al día, comparando el día en que se ABRE cada expansión
     con el día en que se puede PAGAR:

       #1 (nivel 3):  se abre el día 0,0 · se paga el 1,4  →  1,4 días mirando el lote
       #2 (nivel 5):  se abre el día 1,0 · se paga el 3,1  →  2,1 días
       #3 (nivel 7):  se abre el día 4,0 · se paga el 4,5  →  medio día
       #4 en adelante: el material está listo mucho antes que el nivel — manda el nivel, y bien.

     O sea que el coste global NO estaba mal: de la cuarta en adelante ni se nota, porque subir de
     nivel tarda entre 9 y 53 días y acopiar tarda entre 3 y 6. El problema era solo del arranque,
     y ahí era grave: el nivel 3 llega a los DOCE MINUTOS y el juego anuncia "recompensa del nivel
     3: expansión 1" — le prometía al jugador nuevo algo que no podía tomar hasta el día siguiente.

     Y hay una razón matemática por la que esto no se arregla tocando la curva: si se hace la cuenta,
     los días de acopio salen ≈ 0,71 × horas y NO dependen del número de expansión (el coste sube
     con las celdas y la producción también, y se cancelan). Bajar la curva entera abarataría las
     dieciséis por igual para arreglar dos.

     Así que estas dos llevan su hora escrita a mano. Es la única excepción a "todo se deriva" del
     modelo, y va con su motivo: las dos primeras no se miden contra el ancla —contra la granja que
     tenés— sino contra el reloj de alguien que empezó hace un rato y a quien el juego ya le
     prometió terreno. El resto de la tabla no se toca.

     21/8 (dirección, tras la auditoría de días reales) — LA TERCERA ES EL PUENTE. Con las dos
     primeras abaratadas, la curva derivada saltaba de 2 h a 6,6 h de golpe: la expansión 3 le
     costaba al jugador de tres visitas SEIS días reales — más que la 4 (4,3) y que la 5. Un muro
     invertido justo al salir del arranque. La 3 lleva 4,4 h a mano (90→61 maderas) para que la
     escalera suba pareja: 0,7 → 1,8 → 4 → 4,3 días reales. De la 4 en adelante, la fórmula. */
  const HORAS_ARRANQUE = [0.7, 2.0, 4.4];
  let celdas = 9;                               // 3 parcelas + 3 árboles + 3 rocas de arranque
  for (let i = 0; i < EXPANSION_MAX; i++) {
    const t = i / (EXPANSION_MAX - 1);
    const horas = (HORAS_ARRANQUE[i] != null) ? HORAS_ARRANQUE[i] : H0 + (HN - H0) * Math.pow(t, 0.9);
    const plata = horas * celdas * ANCLA;
    const mins = tramo(t);
    const partes = [["madera", mins.length ? 0.30 : 0.55], ["piedra", mins.length ? 0.30 : 0.45]]
      .concat(mins.map(m => [m, 0.40 / mins.length]));
    const c = {};
    partes.forEach(([k, f]) => { const pr = PRICE[k] || 1; c[k] = Math.max(1, Math.round(plata * f / pr)); });
    EXPANSION_COSTO.push(c);
    celdas += CELDAS_POR_EXP;
  }
  })();
  return EXPANSION_COSTO;
}
var EXPANSION_MAX = 16;
// La expansión que toca ahora: qué número es, en qué nivel se abre y qué cuesta.
function expansionSiguiente() {
  const hechas = G.expansiones || 0;
  if (hechas >= EXPANSION_MAX) return null;
  return { i: hechas, n: hechas + 1, nivel: FARM_EXPANSION[hechas], costo: expansionCostos()[hechas],
    bloque: (GF.EXPANSIONES || [])[hechas] || null };
}
function expansionComprar() {
  const e = expansionSiguiente();
  if (!e) { toast("Ya tenés las " + EXPANSION_MAX + " expansiones"); return false; }
  if ((G.level || 1) < e.nivel) { toast("La expansión " + e.n + " se abre en el nivel " + e.nivel); return false; }
  if (!canAfford(e.costo)) { toast("Te faltan materiales para expandir"); return false; }
  payCost(e.costo);
  G.expansiones = e.i + 1;
  log("¡Expansión " + e.n + " de " + EXPANSION_MAX + "! La granja creció " + (GF.BLOQUE * GF.BLOQUE) + " celdas.", "gold");
  if (window.sfx) sfx("level");
  /* 20/8 (dirección): "lo que daría al momento de expandir es la transición y el movimiento de
     cámara". El viaje YA existía —expandirEnVivo hace un pan de 760 ms hasta el bloque— pero era
     invisible, y por dos motivos a la vez:
       · el Mercado se quedaba ABIERTO encima del mundo (comprás desde su pestaña de Adornos);
       · y justo después salía la celebración a pantalla completa, 2,6 segundos de fogonazo y
         confeti. Para cuando se apagaba, la cámara ya había llegado.
     O sea que el jugador pagaba su expansión y veía… un cartel. El momento en que la cerca se abre
     y el terreno aparece —que es POR LO QUE pagó— pasaba detrás del telón.
     Ahora el orden es el que tiene sentido: se cierra el panel, la cámara viaja con el mundo a la
     vista, y la celebración salta CUANDO LLEGA. El cartel deja de tapar la noticia y pasa a
     rematarla. */
  if (typeof closeOv === "function") { closeOv("ov-market"); closeOv("ov-deco"); }
  const festejar = () => {
    toast("¡La granja creció!");
    if (window.celebrate) celebrate({ title: "¡GRANJA MÁS GRANDE!", sub: "Expansión " + e.n + " de " + EXPANSION_MAX,
      big: true, reward: (GF.BLOQUE * GF.BLOQUE) + " celdas nuevas" });
  };
  /* 19/8 (dirección): LA PARCELA APARECE DENTRO DEL BLOQUE, no en el baúl. Las tres celdas que
     trae una expansión —árbol, roca y parcela— ahora llegan igual: puestas y a la vista. Antes la
     parcela era la excepción y había que ir a reclamarla al Cobertizo, un rodeo que además nadie
     descubría. Si el jugador la quiere en otro sitio, la arrastra en modo edición.
     El índice es plotsOwned ANTES de sumar (las usables son 0..owned−1), el mismo cuidado que hubo
     que tener en regaloColocar cuando la parcela se plantaba sola en el centro de la granja. */
  /* 20/8 (dirección): "una vez que se entrega, una FLAG que diga que ya se entregó, y no vuelve
     a entregarse por más F5 que hagas". La bandera es expParcelasDadas: la entrega es secuencial
     (bloque 1, 2, 3…), así que con contar hasta dónde se llegó alcanza. */
  if (e.bloque && e.bloque.parcela && (G.expParcelasDadas || 0) <= e.i) {
    const tope = typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60;
    if ((G.plotsOwned || 3) < tope) {
      const idx = G.plotsOwned || 3;
      G.layoutPlots = G.layoutPlots || {};
      G.layoutPlots[idx] = { col: e.bloque.parcela.col, row: e.bloque.parcela.row };
      G.plotsOwned = idx + 1;
      if (typeof GF !== "undefined" && GF.ocupCambio) GF.ocupCambio();
      log("La expansión trae una parcela ya arada. Si la querés en otro lado, movela en modo edición.", "gold");
    }
    G.expParcelasDadas = e.i + 1;   // entregada: quede donde quede la parcela, esto no se repite
  }
  const nuevos = (typeof regalosSync === "function") ? regalosSync() : 0;   // por si quedaba algo atrasado
  if (nuevos) log("La expansión trajo " + nuevos + " premio" + (nuevos > 1 ? "s" : "") + " al baúl.", "gold");
  if (typeof saveFarm === "function") saveFarm(true);
  /* 18/8 (dirección): SIN TELÓN. La granja crece delante del jugador y la cámara viaja hasta el
     terreno nuevo. Comprar terreno cambia seis cosas —césped, florcitas, grilla, cerca, anillo de
     bosque y límites de cámara— y desde hoy cada una es un método que se rehace solo.
     El reinicio con pantalla negra queda de RESPALDO: si expandirEnVivo falla por lo que sea, la
     escena se rehace entera y el jugador ve su expansión igual. */
  const b = e.bloque, T = GF.TILE;
  /* 20/8 (dirección): "cuando le doy a expandir la pantalla se vuelve oscura y la cámara se mueve.
     Creo que el juego dibuja toda la pantalla de cero. No debería."
     Tenía razón en las dos cosas, y la causa era una línea:

         const sc = window.FARM && window.FARM.scene;   ← MAL

     `window.FARM` YA ES LA ESCENA (farm.js hace `window.FARM = this`). Así que `window.FARM.scene`
     no es la escena: es el ScenePlugin de Phaser. Y el ScenePlugin sí tiene `.restart()` —por eso
     reiniciarGranjaSuave funcionaba perfecto y nadie sospechó— pero NO tiene `expandirEnVivo`.
     Resultado: `vivo` salía false SIEMPRE y toda expansión caía al respaldo con telón negro. El
     dibujado en caliente que escribimos el 18/8 no se ejecutó ni una sola vez.
     Lo peor es cómo se me escapó: mi propio banco de pruebas montaba `FARM = { scene: esc }`,
     copiando la suposición equivocada en vez de lo que hace el juego. El test confirmaba mi error
     en lugar de delatarlo. Ahora el arnés hace `FARM = esc`, como farm.js.
     Las otras dos llamadas —las de restart()— sí quieren el ScenePlugin y se quedan como están. */
  const sc = window.FARM;
  const vivo = sc && typeof sc.expandirEnVivo === "function" && sc.expandirEnVivo(b, festejar);
  if (!vivo) {
    /* Sin escena viva no hay viaje que mostrar: se festeja al momento y se cae al reinicio con
       telón, que sigue de respaldo. */
    festejar();
    if (typeof reiniciarGranjaSuave === "function")
      reiniciarGranjaSuave(b ? { x: (b.c0 + b.c1) / 2 * T, y: (b.r0 + b.r1) / 2 * T } : null);
  }
  return true;
}
const FARM_COFRE   = { 13:10, 23:10, 33:15 };                                          // nivel → capacidad extra de cofre
/* 19/8: misma regla para las mejoras. El Horno lo mejora quien más lo usa (Minería) y la Cocina,
   la Cocina misma —ahí NO es circular: cocinar ya lo sabés, la mejora es al que ya practica—.
   El Altar no cuelga de ningún oficio y se queda en el Granero. */
const FARM_EDIF2   = { 27:"altar" };                          // nivel de granja → edificio que sube a nivel 2
const EDIF2_OFICIO = { horno: ["mining", 6], cocina: ["cooking", 5] };
function edif2Sync(silencioso) {
  for (const t in EDIF2_OFICIO) {
    const g = EDIF2_OFICIO[t];
    if (nivelOficio(g[0]) < g[1]) continue;
    G.edif2 = G.edif2 || {};
    if (G.edif2[t]) continue;
    G.edif2[t] = true;
    if (!silencioso && BUILD_DEF[t]) {
      log("¡" + BUILD_DEF[t].label + " nivel 2! Lo abrió " + SKILL_NAME[g[0]] + " nivel " + g[1] + ".", "gold");
      toast("⬆ " + BUILD_DEF[t].label + " nivel 2");
    }
  }
}
/* Una sola puerta para "subí de oficio: ¿te toca algo?" — la llaman addXp y addCookXp. */
function oficiosSync(silencioso) {
  try { planosSync(silencioso); } catch (e) {}
  try { edif2Sync(silencioso); } catch (e) {}
}

// ---- contadores de tareas (se guardan) ----
function statAdd(tipo, key, n) {
  G.stats = G.stats || {};
  const t = G.stats[tipo] = G.stats[tipo] || {};
  const k = key || "_";
  t[k] = (t[k] || 0) + (n || 1);
  // las tareas de nivel 11-50 se cumplen ACÁ (matar, cocinar, talar…), así que el nivel se revisa acá:
  // antes solo se revisaba con XP de cultivo/minería/pesca y los niveles de solo-combate quedaban trabados.
  if (typeof recalcFarmLevel === "function") recalcFarmLevel();
  if (typeof refreshBarn === "function" && isOpen("ov-barn")) refreshBarn();
}
function statGet(tipo, key) { return ((G.stats && G.stats[tipo] && G.stats[tipo][key || "_"]) || 0); }
function statBase(tipo, key) { return ((G.statsBase && G.statsBase[tipo] && G.statsBase[tipo][key || "_"]) || 0); }
function tareaProgreso(t) { return Math.max(0, statGet(t[0], t[1]) - statBase(t[0], t[1])); }   // cuenta desde que llegaste al nivel actual
function tareasDelNivel(nv) { return FARM_TAREAS[nv] || []; }
function tareasCumplidas(nv) { return tareasDelNivel(nv).every(t => tareaProgreso(t) >= t[2]); }
function snapshotTareas() { G.statsBase = JSON.parse(JSON.stringify(G.stats || {})); }
const TAREA_TXT = { plantar: "Plantar", talar: "Talar madera", minar: "Minar", matar: "Vencer", pescar: "Pescar", cocinar: "Cocinar platos" };
function tareaLabel(t) {
  const [tipo, key, n] = t;
  if (tipo === "plantar") return "Plantar " + n + " " + ((CROP_DEF[key] && CROP_DEF[key].label) || key);
  if (tipo === "minar")   return "Minar " + n + " de " + (RES_LABEL[key] || key);
  if (tipo === "matar")   return "Vencer " + n + " " + ((MONSTER_DEF[key] && MONSTER_DEF[key].label) || key);
  if (tipo === "talar")   return "Talar " + n + " de madera";
  if (tipo === "pescar")  return "Pescar " + n + " peces";
  if (tipo === "cocinar") return "Cocinar " + n + " platos";
  return tipo + " " + n;
}
function farmPuedeSubir() {   // ¿se puede pasar al nivel siguiente ahora mismo?
  const nv = G.level + 1;
  if (nv > FARM_NIVEL_MAX) return false;
  if ((G.skills.farming || 0) < (FARM_XP_LVLS[nv] || Infinity)) return false;
  return tareasCumplidas(nv);   // del 11 en adelante hay tareas; del 1 al 10 la lista está vacía
}
var _recalcFarm = false;
function recalcFarmLevel() {
  if (_recalcFarm) return;   // candado: subir de nivel refresca el HUD, y el HUD vuelve a llamar acá
  _recalcFarm = true;
  try { recalcFarmLevelInterno(); } finally { _recalcFarm = false; }
}
function recalcFarmLevelInterno() {
  let subio = false;
  while (farmPuedeSubir()) {
    G.level++; subio = true;
    const gift = farmUnlockTxt(G.level);   // 18/8: derivado, para que no prometa parcelas que no llegan
    // 16/8: la parcela ya NO se abre sola — igual que el árbol y la roca, llega al BAÚL
    // como premio y el jugador la coloca. regalosSync() calcula lo que corresponde.
    const regalos = (typeof regalosSync === "function") ? regalosSync() : 0;
    if (regalos) { log("Te llegaron " + regalos + " premio" + (regalos > 1 ? "s" : "") + " al baúl.", "gold"); }
    if (FARM_COFRE[G.level]) G.chestCap = (G.chestCap || 0) + FARM_COFRE[G.level];
    if (FARM_EDIF2[G.level]) { G.edif2 = G.edif2 || {}; G.edif2[FARM_EDIF2[G.level]] = true; }
    if (gift && /Título|aura|AURA|Skin|Marco|Emote|Decoración/.test(gift)) { G.cosmeticos = G.cosmeticos || []; G.cosmeticos.push("Nivel " + G.level + ": " + gift); }
    snapshotTareas();   // las tareas del próximo nivel se cuentan desde cero
    log(`¡GRANJA NIVEL ${G.level}!` + (gift ? " Desbloqueaste: " + gift + "." : ""), "gold");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + G.level + "!", sub: "Granja", big: true, reward: gift || "" });
    else { toast("¡Granja nivel " + G.level + "!" + (gift ? " " + gift : "")); if (window.sfx) sfx("level"); }
    if (typeof window.onFarmLevelUp === "function") window.onFarmLevelUp(G.level, gift);
    if (window.farmScene && window.farmScene.refreshPlotLocks) { try { window.farmScene.refreshPlotLocks(); } catch (e) {} }   // la parcela regalada se abre en el acto
    if (typeof planosSync === "function") planosSync(false);   // 12/8: el nivel te regala el PLANO del edificio que toca
  }
  if (typeof refreshBarn === "function" && isOpen("ov-barn")) refreshBarn();
  // 18/8: al subir de nivel puede haberse abierto una expansión — el cartel del mapa lo dice solo
  if (window.FARM && window.FARM.dibujarExpansion) { try { window.FARM.dibujarExpansion(); } catch (e) {} }
  refreshHud();
  if (subio && typeof saveFarm === "function") saveFarm(true);
}
/* ============ LOS NODOS SON UN REGALO DEL NIVEL (16/8, dirección) ==================
   Antes: los árboles se COMPRABAN con madera (2-4-8-16-32) y las rocas y parcelas se
   abrían solas al subir de nivel, mostrándose de antemano como retoños / piedras
   bloqueadas / terreno silvestre. Dos problemas: (1) dos reglas distintas para cosas
   iguales, y (2) el círculo vicioso de la madera — necesitabas madera para tener más
   árboles, pero la madera sale de los árboles, y ahogaba justo cuando menos tenías
   (los desbloqueos costaban 60 maderas = 90 h de nodo, MÁS que los tres edificios del
   tutorial juntos).
   Ahora: al subir de nivel te llega el nodo AL BAÚL como premio y lo reclamás desde ahí.
   Nada se muestra en el mapa hasta que es tuyo. Las tablas de siempre (NIVEL_ARBOLES,
   NIVEL_ROCAS, FARM_PARCELA) pasan a ser el CALENDARIO de entrega. */
/* CUÁNTO VALE EL BONO DE VENTA, EN PLATA POR HORA (19/8).
   El bono sube un 1,5% por nivel sobre el MARGEN de lo que vendés, y el margen por celda es
   justamente el ancla: 20 plata/hora. Así que el bono de un nivel vale el 1,5% de lo que produce
   tu granja entera — y por eso crece solo a medida que la granja crece.
   Se mide sobre las celdas que el jugador TIENE (9 de arranque + 3 por expansión comprada), no
   sobre las que podría tener: el cartel promete lo que va a cobrar, no lo que cobraría otro. */
function celdasProductivas() { return 9 + 3 * (G.expansiones || 0); }
function bonoPlataH() { return Math.round(celdasProductivas() * 20 * 0.015); }

function nodosQueTocan(lvl) {
  /* 18/8: tres de cada al arrancar, y una parcela más por cada expansión comprada. Los árboles y
     las rocas de expansión NO pasan por acá: son objetos físicos dentro de su bloque y aparecen
     al comprarlo (GF.objetoPresente). La parcela sí, porque el jugador elige dónde la pone. */
  const arb = NIVEL_ARBOLES.length;
  const roc = NIVEL_ROCAS.length;
  let par = 3;
  /* 18/8: cada expansión comprada suma UNA parcela ENCIMA de las que da el nivel. Se cuenta acá
     y no en expansionComprar a propósito: así regalosSync sigue siendo idempotente y las partidas
     que ya tenían expansiones reciben sus parcelas atrasadas la primera vez que entren. Los
     árboles y rocas de expansión NO van por acá: son nodos físicos dentro del bloque. */
  par += (G.expansiones || 0);
  return { tree: arb, rock: roc, plot: Math.min(typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60, par) };
}
// pone al día la cola de regalos: idempotente, así que sirve igual para un level-up,
// para un salto de varios niveles o para migrar un guardado viejo.
function regalosSync() {
  const q = G.regalos || (G.regalos = { tree: 0, rock: 0, plot: 0 });
  const meta = nodosQueTocan(G.level || 1);
  /* 18/8: cuenta las DOS bolsas. Si solo mirara el baúl, en cuanto el jugador recogiera un premio
     regalosSync creería que le falta y se lo volvería a dar: premios infinitos con solo abrir el baúl. */
  const cb = cobertizoBolsa();
  const tiene = {
    tree: (G.treesOpen || [0]).length + q.tree + (cb.tree || 0),
    rock: (G.rocksOpen || [0]).length + q.rock + (cb.rock || 0),
    plot: (G.plotsOwned || 3) + q.plot + (cb.plot || 0),
  };
  let nuevos = 0;
  for (const k of ["tree", "rock", "plot"]) {
    const falta = meta[k] - tiene[k];
    if (falta > 0) { q[k] += falta; nuevos += falta; }
  }
  return nuevos;
}
var REGALO_LABEL = { tree: "Retoño", rock: "Roca", plot: "Parcela" };
// el género importa: "ninguna retoño" quedaba mal en el aviso
function REGALO_NADA(t) { return { tree: "ningún retoño", rock: "ninguna roca", plot: "ninguna parcela" }[t] || "ninguno"; }
function regalosPendientes() { const q = G.regalos || {}; return (q.tree || 0) + (q.rock || 0) + (q.plot || 0); }
function cobertizoBolsa() { return G.cobertizo || (G.cobertizo = { tree: 0, rock: 0, plot: 0 }); }
// reclamar UNO: lo saca de la cola y lo activa en la granja
/* ============ LOS REGALOS SE COLOCAN A MANO (18/8, dirección) =======================
   "Cuando te llegan al baúl, en vez de plantarse automáticamente en el terreno, que vayan al
   inventario y a la barra de acceso rápido, y que el jugador pueda seleccionarlas, pasar a modo
   colocación y plantarlas. Lo mismo con los árboles y las piedras. Excepto cuando expande el
   terreno, que los nodos ya aparecen puestos, pero uno los puede mover en modo edición."
   Antes, reclamar en el baúl activaba el siguiente nodo de la lista EN SU POSICIÓN DE FÁBRICA:
   el jugador no elegía nada. Ahora el baúl solo te da el objeto; la granja la dibujás vos.
   Es el mismo camino que ya hacían los planos de los edificios, reutilizado entero. */
/* 18/8 (2ª pasada): los regalos ya NO van a la barra rápida. Van al Cobertizo, que es donde
   vive todo lo colocable. Esta función se queda vacía a propósito y no se borra porque la
   llamaban desde el baúl; así el cambio es de UNA pieza y no de tres. */
function regaloAHotbar() {}
// del baúl a la bolsa: NO se coloca nada todavía
function regaloReclamar(tipo) {
  const q = G.regalos || (G.regalos = { tree: 0, rock: 0, plot: 0 });
  if (!q[tipo]) return false;
  q[tipo]--;                                   // sale del baúl…
  cobertizoBolsa()[tipo] = (cobertizoBolsa()[tipo] || 0) + 1;   // …y entra en el cobertizo
  log((REGALO_LABEL[tipo] || tipo) + " al Cobertizo — desde ahí elegís dónde va.", "gold");
  toast((REGALO_LABEL[tipo] || tipo) + " al Cobertizo 🏚");
  if (window.sfx) sfx("level");
  refreshHud(); if (typeof syncCobertizo === "function") syncCobertizo();
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}
// ¿cuál es el índice en WORLD_OBJECTS del nodo nº lockIdx del corral? (los de expansión no cuentan)
function nodoIndicePorLock(tipo, lockIdx) {
  let n = 0;
  for (let i = 0; i < GF.WORLD_OBJECTS.length; i++) {
    const o = GF.WORLD_OBJECTS[i];
    if (o.type !== tipo || o.exp != null) continue;
    if (n === lockIdx) return i;
    n++;
  }
  return -1;
}
/* colocar de verdad: acá es donde el regalo pasa a ser parte de la granja, en la celda que
   eligió el jugador. La escena llama a esto desde colocarEn(). */
function regaloColocar(tipo, col, row) {
  const q = cobertizoBolsa();   // 18/8: se coloca lo que está EN EL COBERTIZO, no lo que sigue en el baúl
  if (!q[tipo]) { toast("No te queda " + REGALO_NADA(tipo)); return false; }
  const T = GF.TILE;
  if (tipo === "plot") {
    const tope = typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60;
    if ((G.plotsOwned || 3) >= tope) { toast("Ya tenés todas las parcelas"); return false; }
    /* 18/8 — ERROR DE ÍNDICE (reporte: "se ha plantado en el centro de la granja, como si fuera
       una posición por defecto"). Se guardaba la celda elegida en layoutPlots[GF.PLOTS.length],
       o sea en el hueco 12 — el de la primera parcela EXTRA. Pero las 12 primeras ya existen en
       la rejilla de fábrica, así que la parcela que se desbloqueaba (la 5ª, índice 4) se dibujaba
       en SU sitio de siempre y la celda del jugador quedaba anotada para una parcela futura.
       El índice de la que se desbloquea es plotsOwned ANTES de sumar: las usables son 0..owned−1,
       así que la nueva es justo la número `owned`. */
    const idx = G.plotsOwned || 3;
    G.layoutPlots = G.layoutPlots || {};
    G.layoutPlots[idx] = { col, row };
    G.plotsOwned = idx + 1;
    GF.ocupCambio();
  } else if (tipo === "tree" || tipo === "rock") {
    const tabla = tipo === "tree" ? NIVEL_ARBOLES : NIVEL_ROCAS;
    const abiertos = tipo === "tree" ? (G.treesOpen = G.treesOpen || [0]) : (G.rocksOpen = G.rocksOpen || [0]);
    const libre = tabla.map((_, i) => i).find(i => !abiertos.includes(i));
    if (libre == null) { toast(tipo === "tree" ? "Ya tenés todos los árboles" : "Ya tenés todas las rocas"); return false; }
    const idx = nodoIndicePorLock(tipo, libre);
    if (idx < 0) { toast("No encuentro dónde ponerlo"); return false; }
    const o = GF.WORLD_OBJECTS[idx];
    const ancho = Math.max(1, o.wCells || 1);            // el árbol mide 2 celdas
    G.layout = G.layout || {};
    G.layout[idx] = { cx: (col + ancho / 2) * T, by: (row + 1) * T };
    abiertos.push(libre);
    GF.ocupCambio();
  } else return false;
  q[tipo]--;
  if (typeof syncCobertizo === "function") syncCobertizo();
  log("Colocaste " + (REGALO_LABEL[tipo] || tipo) + " en la granja.", "gold");
  toast("¡" + (REGALO_LABEL[tipo] || tipo) + " en la granja!");
  if (window.sfx) sfx("level");
  if (typeof saveFarm === "function") saveFarm(true);
  /* 18/8: acá NO se reinicia la escena. Quien llama (colocarEn) lo pone en vivo con
     colocarRegaloEnVivo y solo cae al reinicio con telón si eso falla. Reiniciar entero para
     aparecer un nodo daba pantalla negra y te reseteaba la cámara. */
  return true;
}
function levelUp() { toast("El nivel sube cosechando (XP de Farmeo)"); }
function prestige() {
  if (G.level < FARM_NIVEL_MAX) { toast("Llegá a nivel " + FARM_NIVEL_MAX); return; }
  G.prestige++; G.level = 1;
  G.skills.farming = 0;            // si no se resetea, el próximo addXp volvía a nivel 10 de golpe
  G.stats = {}; G.statsBase = {};  // las tareas de nivel arrancan de cero otra vez
  for (const k in G.res) G.res[k] = 0;
  log(`Reinicio. Prestigio ${G.prestige}.`, "gold"); toast("Prestigio " + G.prestige + "!");
  if (typeof refreshBarn === "function") refreshBarn();
  refreshHud();
  if (typeof saveFarm === "function") saveFarm(true);
}

// --- minerales y picos ---
const ORE_ORDER = ["piedra","bronce","hierro","oro","diamante","netherita"];
/* 18/8 — LA PICADA DE MINERAL RINDE 2, NO 1.
   Es lo que devuelve la minería al ancla sin tocar ninguna mecánica: el pico sigue siendo de un
   uso, las cantidades siguen enteras y la escalera sigue intacta (cada pico pide el mineral de
   abajo). Con yield 1 picar daba PÉRDIDA en los cinco tiers, porque el coste del pico se compone
   hacia arriba y supera lo que saca. Con yield 2 y los picos re-costeados,
   (2 x precio − costo del pico) / horas = 20 exacto. Los precios no se tocan. */
const ORE_DEF = {   // 15/8 EN PRUEBA: enfriamientos largos del doc 4/8 del diseñador
  /* 18/8 (dirección): "la veta de piedra tiene que tener el mismo enfriamiento que las piedras
     normales — no tiene que hacer la excepción. De hecho no sé por qué se llama veta de piedra
     si las otras son rocas y dan el mismo recurso."
     Tenía razón y el ancla lo confirma: este nodo daba 1 piedra cada 2 HORAS (las rocas la dan
     cada 40 min) y encima con un precio propio de 6 cuando la piedra vale 15. Salía a 7,5
     plata/hora, un tercio del ancla — estrictamente peor que una roca en las tres cosas.
     Era una anomalía heredada, no una decisión. Ahora es una roca más: mismo reloj, mismo precio.
     No se borra el objeto porque G.layout indexa WORLD_OBJECTS por posición (ver el aviso de
     config.js); se iguala su definición, que es lo que se veía roto. */
  piedra:   { tier:0, label:"Piedra",    emoji:"🪨", sprite:"node_stone",     cd:2400,  yield:1, price:15 },   // = CD.rock y PRICE.piedra; se re-atan más abajo para que no puedan separarse
  bronce:   { tier:1, label:"Bronce",    emoji:"🟫", sprite:"node_bronze",    cd:28800, yield:2, price:12 },
  hierro:   { tier:2, label:"Hierro",    emoji:"⛓️", sprite:"node_iron",      cd:43200, yield:2, price:15 },   // viernes (2): lo mina el Pico de Hierro
  // 16/8 (auditoría G): oro, diamante y netherita compartían enfriamiento (14 h) pero valen
  // 30, 80 y 200. Con el ancla de tiempo, una hora de nodo es una hora de nodo: si el valor
  // sube, el reloj tiene que subir. Ahora la escalera se lee sola: 14 h → 18 h → 24 h.
  oro:      { tier:3, label:"Oro",       emoji:"🟡", sprite:"node_gold",      cd:50400, yield:2, price:30 },   // 14 h
  diamante: { tier:4, label:"Diamante",  emoji:"💎", sprite:"node_diamond",   cd:64800, yield:2, price:80 },   // 18 h (era 14)
  netherita:{ tier:5, label:"Netherita", emoji:"🔶", sprite:"node_netherite", cd:86400, yield:2, price:200 },  // 24 h (era 14) — el ancla diaria de la minería
};
const PICK_ORDER = ["stone","bronze","iron","gold","diamond","netherite"];
const PICK_DEF = {
  // modelo SFL puro (31/7): 1 uso por pico, costos baratos (material del tier anterior + madera + monedas)
  // costos "detalles viernes (2)"; el Pico de Bronce no figura en el doc y se interpola
  // 16/8 (auditoría G): el pico base ya no pide madera. Con 2 maderas encima, cada piedra
  // costaba 18 plata efectivas contra 6 de la madera (el triple) y una parcela financiaba
  // 2,2 rocas en vez de 6,7. La cadena madera→pico sigue viva en los picos de tier alto.
  stone:    { tier:0, label:"Pico de Piedra",    mineTier:0, dur:1, cost:{},                    plata:2,   sprite:"pick_stone" },   // 18/8: baja a 2 con la roca de 40 min (13% de lo que saca)
  /* 17-18/8 — LA ESCALERA DE PICOS, PENDIENTE DE ARREGLO.
     El problema medido (tools/auditar-precio-sombra.js) es REAL y sigue abierto: con un uso por
     pico, y como cada pico se craftea con el mineral de abajo, el coste se compone hacia arriba
     hasta que picar DA PÉRDIDA — bronce −90, oro −288, diamante −573 por picada. Toda la escalera
     de minería está por debajo del ancla y no se ve, porque los materiales no se venden.
     Se probó arreglarlo dando 5 usos al pico. REVERTIDO por dirección (18/8): "las herramientas
     tienen un uso, esa es una norma; la idea es balancear al ancla sin modificar cómo funcionan
     las cosas". Correcto: eso arreglaba el número cambiando la mecánica.
     Lo que sí se descubrió al revertir: con UN uso y cantidades enteras, la escalera NO puede
     mantenerse. El presupuesto del pico de oro es 190 y UNA unidad de bronce ya vale 210 — no
     entra ni pidiendo una. Igual el de netherita (760) contra un diamante (990). O sea que o se
     renuncia a que el pico pida el mineral de abajo, o hacen falta CANTIDADES DECIMALES
     (0,9 bronce · 1,34 oro · 0,77 diamante), que es la vía que pidió dirección.
     Hasta que eso esté, las recetas quedan COMO ESTABAN. */
  /* 18/8 — LA MINERÍA VUELVE AL ANCLA, SIN TOCAR NINGUNA MECÁNICA.
     El problema medido: picar CUALQUIER mineral daba pérdida — bronce −90, oro −288, diamante
     −573 por picada — porque el pico se craftea con el mineral de abajo y el coste se compone
     hacia arriba. Toda la escalera de minería estaba por debajo del ancla y no se veía, porque
     los materiales no se venden y no hay mercado que lo delate.
     Se probaron dos vías y las dos se descartaron: dar 5 usos al pico (dirección: "las
     herramientas tienen un uso, esa es una norma") y cantidades decimales (más profundo que el
     problema que arregla). La que cierra sin tocar nada:
        LA PICADA RINDE 2, y el pico cuesta lo que el ancla permite para esa picada.
     Un uso por pico, cantidades enteras, la escalera intacta (cada pico sigue pidiendo el mineral
     de abajo) y (2 x precio − costo del pico) / horas = 20 EXACTO en los cinco tiers.
     Los precios NO se tocan, así que nada de lo que lee priceOf() se mueve. */
  bronze:   { tier:1, label:"Pico de Bronce",    mineTier:1, dur:1, cost:{madera:7,piedra:5},   plata:1,  sprite:"pick_bronze" },
  iron:     { tier:2, label:"Pico de Hierro",    mineTier:2, dur:1, cost:{madera:8,piedra:8},   plata:24, sprite:"pick_iron" },
  gold:     { tier:3, label:"Pico de Oro",       mineTier:3, dur:1, cost:{bronce:1,piedra:8},   plata:0,  sprite:"pick_gold" },
  diamond:  { tier:4, label:"Pico de Diamante",  mineTier:4, dur:1, cost:{oro:1,madera:4,piedra:2}, plata:2, sprite:"pick_diamond" },
  netherite:{ tier:5, label:"Pico de Netherita", mineTier:5, dur:1, cost:{diamante:1,piedra:8}, plata:0,  sprite:"pick_netherite" },
};
function equippedPick() { return (G.picks.eq && G.picks.owned[G.picks.eq]) ? G.picks.eq : null; }
function canAfford(c) { for (const k in c) if ((G.res[k]||0) < c[k]) return false; return true; }
function payCost(c) { for (const k in c) G.res[k]-=c[k]; }
// la fragua se enciende un rato cada vez que trabajás en la Herrería (detalles jueves)
const FORGE_LIT_MS = 8000;
function forgeWork() { G.forgeLitUntil = nowMs() + FORGE_LIT_MS; if (window.FARM && FARM.updateForge) FARM.updateForge(); if (window.sfx) sfx("mine"); }
// picos APILABLES: G.picks.dur[id] es la CANTIDAD (1 uso cada uno); craftear suma al stock
function pickCount(id) { return G.picks.owned[id] ? Math.max(0, Math.floor(G.picks.dur[id] || 0)) : 0; }
function craftPick(id) {
  const pd = PICK_DEF[id]; if (!pd) return;
  if (pickCount(id) >= 99) { toast("Máximo 99 " + pd.label); return; }
  if (typeof tutoPermite === "function" && !tutoPermite("craftpick")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(pd.cost, pd.plata, "craftear " + pd.label)) return;   // guardia del tutorial (12/8)
  if (!canAfford(pd.cost)) { toast("Te faltan materiales"); return; }
  if (pd.plata && G.plata < pd.plata) { toast("Te falta plata"); return; }
  payCost(pd.cost); if (pd.plata) G.plata -= pd.plata;
  const first = !G.picks.owned[id];
  // 17/8: un crafteo rinde pd.dur PICADAS, no una. El campo `dur` existía en PICK_DEF desde
  // siempre pero NADIE lo leía: acá se sumaba un 1 fijo. O sea que subir `dur` no hacía nada
  // y el arreglo del ancla habría sido un no-op silencioso. Ahora la receta paga dur usos.
  G.picks.owned[id] = true; G.picks.dur[id] = pickCount(id) + (pd.dur || 1);
  if (first || !G.picks.eq) G.picks.eq = id;
  addXp("crafting", 10 + pd.tier * 4);
  if (typeof tutoEvent === "function") { tutoEvent("crafttool"); tutoEvent("craftpick"); }
  log("Crafteaste " + pd.label + ((pd.dur || 1) > 1 ? " ×" + pd.dur : "") + " (tenés " + G.picks.dur[id] + ").", "gold"); toast("+" + (pd.dur || 1) + " " + pd.label);
  forgeWork(); refreshForge(); refreshInv(); refreshHud(); syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
}
// modelo SFL (31/7): los picos NO se reparan — se rompen y se craftean de nuevo
function destroyPick(id) {
  delete G.picks.owned[id]; delete G.picks.dur[id];
  if (G.picks.eq === id) G.picks.eq = PICK_ORDER.find(p => G.picks.owned[p]) || null;
  G.hotbar = G.hotbar.map(h => (h && h.kind === "pick" && h.key === id) ? null : h);
  syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
  uiRefreshAfterBreak();   // ídem hacha/caña: refresco inmediato de los paneles abiertos
}
// re-renderiza los paneles que muestran herramientas, si están abiertos (la rotura puede pasar con UI visible)
function uiRefreshAfterBreak() {
  try {
    if (typeof isOpen !== "function") return;
    if (isOpen("ov-inv") && typeof refreshInv === "function") refreshInv();
    if (isOpen("ov-equip") && typeof refreshEquip === "function") refreshEquip();
    if (isOpen("ov-forge") && typeof refreshForge === "function") refreshForge();
  } catch (e) {}
}
function repairCostOf(id) { const pd=PICK_DEF[id]; const c={}; for (const k in pd.cost) c[k]=Math.max(1,Math.ceil(pd.cost[k]*0.3)); return c; }
// 14/8 (dirección): los picos NO se reparan — son apilables como las hachas (1 pico = 1
// picada, se craftean más). Reparar "el stock" ponía dur=1 y te DESTRUÍA la pila entera.
function repairPick(id) { toast("Los picos no se reparan — crafteá más en la Herrería"); }
function equipPick(id) { if (!G.picks.owned[id]){ toast("No lo tenés"); return; } G.picks.eq=id; log("Equipaste "+PICK_DEF[id].label+".");  toast("Equipado"); refreshForge(); refreshInv(); }

// --- herramientas (hacha + caña con durabilidad; el pico se maneja aparte) ---
const TOOL_DEF = {
  axe:   { label:"Hacha",            emoji:"🪓", sprite:"axe",         max:1, repair:{madera:6} },   // SFL puro: 1 uso = 1 talada
  rod:   { label:"Caña",             emoji:"🎣", sprite:"fishing_rod", max:1, repair:{madera:4} },   // SFL puro: 1 uso = 1 pesca
  sword: { label:"Espada de Hierro", emoji:"⚔️", sprite:"sword",       max:80, repair:{bronce:2} },
  sword_wood: { label:"Espada de Madera", emoji:"🗡️", sprite:"sword_wood", max:40, repair:{madera:2} },   // viernes (2): arma inicial
  bow:   { label:"Arco",             emoji:"🏹", sprite:"bow",         max:60, repair:{madera:5} },
};

// ================= TUTORIAL GUIADO (doc maestro 2/8 §3.2): micro-objetivos de los primeros minutos =================
// Cadena de metas cortas, cada una con tilde + sonido + celebración al final. "El cambio de mayor impacto del doc".
// CADENA de objetivos: cada paso deja al jugador con lo que necesita el siguiente.
//   txt   = meta ("#" se reemplaza por la cantidad real)
//   n     = repeticiones de la acción · res = paso de RECURSO (se cumple al TENER esa cantidad)
//   need  = cantidad exacta que pide el paso siguiente (sale de las recetas reales del juego)
//   target= a qué apunta la flecha en el mundo · panel/ui = qué botón se resalta dentro de la ventana
const TUTO_STEPS = [
  // 14/8 (dirección): el arranque enseña el ciclo COMPLETO en su orden natural — nacés con
  // 3 de plata (no con semillas): comprá → plantá → cosechá → vendé. Con eso el loop quedó
  // aprendido y no se vuelve a pedir: de acá en más la plata repetitiva llega de PREMIO.
  // 14/8 v4: los CUATRO pasos del arranque verifican CANTIDADES (3/3/3/3) — el capataz
  // no avanza hasta que compraste, plantaste, cosechaste y vendiste las TRES
  { id: "kit",       n: 1, txt: "Abrí el baúl junto al granero — tu kit de bienvenida te espera", target: "cofre_diario" },
  { id: "buyseed",   n: 3, txt: "Comprá 3 semillas de papa en el Mercado (tenés 3 de plata)", target: "market", panel: "ov-market", ui: "[data-buy='papa']" },
  { id: "plant",     n: 3, txt: "Plantá tus 3 papas en las parcelas",              target: "plot" },
  { id: "harvest",   n: 3, txt: "Cosechá tus 3 papas",                             target: "plot" },
  { id: "sell",      n: 3, txt: "Vendé tus 3 papas en el Mercado",                 target: "market", panel: "ov-market", ui: "#vb-papa" },
  // — la Herrería ya no viene hecha (10/8): es la primera construcción, y es barata a propósito —
  // 13/8 v2 (audio): el orden LÓGICO — primero se coloca el plano (la obra queda a la vista
  // con su cartel), DESPUÉS se juntan sus materiales, y al final se depositan. Lo depositado
  // cuenta para los pasos de "juntá" (campo dep), así depositar temprano no traba nada.
  /* 19/8 (dirección: "dice barra rápida y en realidad está en el cobertizo"). Cierto, y era un
     texto huérfano: el 18/8 los planos se mudaron al Cobertizo y planoAHotbar() quedó vacía, pero
     estos tres carteles siguieron mandando al jugador a mirar una barra donde no hay nada. Mandar
     a alguien al lugar equivocado en su primer edificio es de los errores más caros que hay: no
     sabe si el juego está roto o si es él el que no entiende.
     Ahora nombran el Cobertizo y la flecha lo señala en el menú. */
  /* 20/8 (dirección) — EL CARTEL TIENE QUE NOMBRAR EL CAMINO ENTERO, NO EL DESTINO.
     "Está bien que apuntes al botón del Cobertizo, pero también quiero que apuntes al del Menú,
      que sepa el jugador que tiene que entrar ahí primero."
     La flecha ya hacía la cadena bien —con el menú cerrado apunta a ☰ Menú, y al abrirlo baja al
     Cobertizo (verificado en tools/test-tuto-flecha.js, que carga el HTML de verdad)— pero el
     cartel decía solo "Abrí el Cobertizo". El jugador lee "Cobertizo", busca un botón que se llame
     así, no lo encuentra, y la flecha le está señalando algo que se llama "Menú": el cartel y la
     flecha discrepaban. Es el mismo fallo de ayer con la barra rápida, con otra ropa.
     Ahora el texto nombra las dos paradas, en orden, y coincide con lo que la flecha va haciendo. */
  { id: "place_store", n: 1, txt: "Abrí el Menú ☰ → Cobertizo y colocá el PLANO de la Herrería", panel: "ov-cobertizo", ui: ".slot.k-plano" },
  { id: "wood_st",  res: "madera", dep: "store", need: () => BUILD_DEF.store.cost.madera || 5,
    txt: "Juntá # de madera talando árboles (para la obra de la Herrería)",        target: "tree" },
  { id: "stone_st", res: "piedra", dep: "store", need: () => BUILD_DEF.store.cost.piedra || 2,
    txt: "Juntá # de piedra picando rocas (para la obra de la Herrería)",          target: "rock" },
  { id: "build_store", n: 1, txt: "Depositá los materiales en la obra de la Herrería (clic encima)", target: "store" },
  // — cadena del Horno: plano → materiales de SU receta → depósito —
  { id: "place_horno", n: 1, txt: "Colocá el plano del Horno de Piedra (Menú ☰ → Cobertizo)", panel: "ov-cobertizo", ui: ".slot.k-plano" },
  { id: "wood",  res: "madera", dep: "horno", need: () => BUILD_DEF.horno.cost.madera || 10,
    txt: "Juntá # de madera talando árboles (para la obra del Horno)",             target: "tree" },
  { id: "stone", res: "piedra", dep: "horno", need: () => BUILD_DEF.horno.cost.piedra || 8,
    txt: "Juntá # de piedra picando rocas (para la obra del Horno)",               target: "rock" },
  { id: "build_horno", n: 1, txt: "Depositá los materiales en la obra del Horno (clic encima)", target: "horno" },
  // — el Hacha: la plata llega de ADELANTO al entrar (ya sabés ganarla — dirección 14/8) —
  /* 19/8 (dirección): acá había un "Crafteá un Hacha" que no enseñaba NADA — el baúl de bienvenida
     ya entrega 35 hachas, así que el paso era una vuelta en falso. En su lugar van los dos gestos
     que hoy hay que adivinar y que abren el único sistema sin relojes que tiene el juego: forjar un
     arma y ponérsela. Sin ellos, el jugador llega al portal y se come un "equipate un arma" sin
     saber dónde se equipa. */
  // 20/8 (jugada completa): el texto decía "(5 de madera)" y la espada TAMBIÉN pide 10 de plata —
  // el jugador chocaba con « Te falta plata » sin que nadie se lo hubiera contado.
  { id: "craftarm", n: 1, txt: "Forjá una Espada de Madera en la Herrería (5 de madera + 10 de plata)", target: "store", panel: "ov-forge", ui: "[data-carm='espada_madera']" },
  { id: "equiparm", n: 1, txt: "Equipate la espada en el panel de Equipo (Menú ☰ → Equipo)", panel: "ov-equip", ui: "#eq-arma" },
  // ——— ETAPA 2: los sistemas nuevos (Cocina, Armas, Zona Negra, Pesca, Altar) ———
  { id: "place_cocina", n: 1, txt: "Colocá el plano de la Cocina (Menú ☰ → Cobertizo)", panel: "ov-cobertizo", ui: ".slot.k-plano" },
  { id: "woodc",  res: "madera", dep: "cocina", need: () => BUILD_DEF.cocina.cost.madera || 20,
    txt: "Juntá # de madera (para la obra de la Cocina)",                          target: "tree" },
  { id: "stonec", res: "piedra", dep: "cocina", need: () => BUILD_DEF.cocina.cost.piedra || 15,
    txt: "Juntá # de piedra (para la obra de la Cocina)",                          target: "rock" },
  { id: "build_cocina", n: 1, txt: "Depositá los materiales en la obra de la Cocina (clic encima)", target: "cocina" },
  { id: "cook",     n: 1, txt: "Cociná tu primer plato: Papa Asada",   target: "cocina", panel: "ov-cocina", ui: "[data-cook='papa_asada']" },
  { id: "eat",      n: 1, txt: "Comé un plato desde la bolsa (te da un buff)" },
  /* EL ÚLTIMO CAPÍTULO, Y EL MÁS IMPORTANTE PARA EL TIEMPO MUERTO (19/8). Medido: en una sesión de
     12 minutos al empezar hay 42 clics — 36 segundos de acción y el 95% mirando crecer una papa.
     Todo lo que la granja ofrece tiene reloj. La Zona Negra no: es lo único que se puede jugar
     seguido, y la estamina ya la regula sola (120 bichos al día, unos 30 minutos, el 1,7% de la
     economía). O sea que el que quiere jugar tiene dónde, y el que quiere estar tranquilo no
     pierde nada por no ir. Solo faltaba que alguien se lo dijera. */
  { id: "portal",   n: 1, txt: "Cruzá el portal del norte con la espada equipada",       target: "portal" },
  /* 19/8: el paso pide la CARNE, no un número de muertes. Así el botín deja de ser un adorno —
     es lo que cierra el tutorial— y de paso el jugador aprende que en la Zona el botín es azaroso:
     la rata la suelta el 18% de las veces, el murciélago el 24%. De media son cuatro o cinco
     bichos, unos 20 de estamina de los 100 que tiene. */
  { id: "hunt", res: "carne", need: () => (RECIPE_DEF.estofado && RECIPE_DEF.estofado.res.carne) || 1,
    txt: "Cazá en el Pantano hasta traer # de carne" },
  { id: "estofado", n: 1, txt: "Cociná un Estofado con lo que cazaste", target: "cocina", panel: "ov-cocina", ui: "[data-cook='estofado']" },
  /* ======= EL CAMINO DE CRECIMIENTO, QUE ERA EL ÚNICO QUE NO SE ENSEÑABA (19/8, dirección) =======
     Desde el rediseño, las EXPANSIONES son la única fuente de nodos: no hay otra forma de tener una
     parcela, un árbol o una roca más. Y la cadena tiene tres eslabones que el jugador tenía que
     adivinar enteros: comprás la expansión → la parcela llega al BAÚL → pasa al COBERTIZO → la
     colocás vos donde quieras. El tutorial no nombraba ninguno de los tres, así que quien no
     tropezara con el Cobertizo por casualidad se quedaba con nueve celdas para siempre.
     El orden de los pasos es el orden real, comprobado: el regalo NO existe hasta que la expansión
     está comprada (regalosSync cuenta 3 parcelas + 1 por expansión, y se nace con las 3). */
  /* 20/8 — ESTE PASO APUNTABA A UNA VENTANA QUE NO EXISTE. `ov-deco` no está en el HTML: la
     expansión se compra en el MERCADO, pestaña Adornos (#shop-deco), y ahí vive #exp-comprar.
     Con el panel inventado la flecha se quedaba clavada en el ☰ Menú para siempre —abrías el menú
     y seguía señalando el menú— y el cartel no decía dónde ir. Apareció al escribir el primer test
     que EJECUTA la interfaz en vez de leer la tabla (tools/test-tuto-flecha.js): la tabla se veía
     perfecta, el juego no.
     Con el panel correcto la flecha ya sabe sola bajar hasta la pestaña oculta (tutoHighlight
     detecta el .shoppane escondido y apunta primero a su .shoptab). */
  { id: "expandir", n: 1, txt: "Comprá tu primera expansión de terreno (Mercado → Adornos)", target: "market", panel: "ov-market", ui: "#exp-comprar" },
  /* Y como la parcela ya viene puesta, lo único que queda por enseñar es que SE PUEDE MOVER. El
     modo edición es de esas cosas que el jugador no descubre solo y que cambian por completo lo que
     cree que puede hacer con su granja. */
  { id: "editar",   n: 1, txt: "Probá el modo edición: todo lo de tu granja se puede mover (Menú ☰ → Configuración)", panel: "ov-config", ui: "#cfg-edit" },
  /* ======= LOS DOS QUE FALTABAN (19/8) =======
     LA PESCA: la caña viene en el kit de bienvenida con 15 usos y hasta hoy nadie decía para qué
     sirve — un icono muerto en la bolsa desde el minuto uno. Ojo: pescar pide UNA LOMBRIZ, que se
     compra en el Mercado a 3 de plata; por eso el paso se enuncia con la carnada por delante, o el
     jugador llega a la laguna y se come un "necesitás lombrices" sin saber dónde están.
     EL TABLÓN: es el regulador de la economía y la única fuente de VALES —la moneda que solo sale
     de ahí y solo se gasta ahí—. Está plantado en la granja como un objeto más, así que el jugador
     lo ve y le hace clic sin entender qué es. */
  /* 19/8 (dirección): "los montículos ya están desde que el jugador aparece, y de ahí salen
     lombrices". Cierto, y cambia el paso: mandarlo a COMPRAR carnada cuando la tiene gratis a diez
     metros era enseñarle el camino largo. Los montículos son tres por día, se cavan con un clic sin
     herramienta y siempre dan lombriz — y son otro sistema que nadie le explicaba. El Mercado sigue
     ahí para cuando se le acaben. */
  { id: "excavar",  n: 1, txt: "Cavá uno de los montículos de tierra: adentro hay carnada" },
  { id: "fish",     n: 1, txt: "Probá la caña en la laguna (la lombriz es el cebo)", target: "fish" },
  { id: "pedido",   n: 1, txt: "Entregá un encargo en el tablón de pedidos", target: "tablon_pedidos", panel: "ov-pedidos" },
  // (14/8, reversión del capataz: la cadena TERMINA acá — el tutorial enseña LO BÁSICO de
  //  la granja. Armas, Zona Negra, minería avanzada y Altar se aprenden jugando: sus
  //  planos caen por nivel y cada sistema se presenta solo.)
];
/* 14/8: los 40 pasos agrupados en CAPÍTULOS reclamables — la guía opcional con forma de
   diario de misiones. Cada capítulo junta pasos consecutivos y deja una recompensa que se
   RECLAMA en el panel Objetivos (no cae sola): el que ignora la guía cobra igual cuando
   le pasa por encima jugando libre. */
/* 14/8 v2 (filosofía web3, dirección): los premios son INSUMOS, no moneda — cada plata
   regalada es emisión que termina en el P2P. La plata sale de vender lo producido; los
   capítulos pagan cosas que se USAN. El último paga una FICHA DE PARCELA (tierra). */
const TUTO_CAPS = [
  // 14/8 (reversión): el tutorial NO premia — enseña. Capítulos = progreso visible, nada más.
  { id: "cosecha",  label: "Tu primera cosecha", pasos: ["kit", "buyseed", "plant", "harvest", "sell"] },
  { id: "herreria", label: "La Herrería",        pasos: ["place_store", "wood_st", "stone_st", "build_store"] },
  { id: "horno",    label: "El Horno de Piedra", pasos: ["place_horno", "wood", "stone", "build_horno"] },
  { id: "arma",     label: "Tu primera espada",  pasos: ["craftarm", "equiparm"] },
  { id: "cocina",   label: "La Cocina",          pasos: ["place_cocina", "woodc", "stonec", "build_cocina", "cook", "eat"] },
  { id: "zona",     label: "La Zona Negra",      pasos: ["portal", "hunt", "estofado"] },
  { id: "crecer",   label: "La granja crece",    pasos: ["expandir", "editar"] },
  { id: "pueblo",   label: "La laguna y el tablón", pasos: ["excavar", "fish", "pedido"] },
];

function capEstado(cap) {   // "hecho" | "activo" | "pendiente" (por el paso más avanzado de la cadena)
  const idxs = cap.pasos.map(id => tutoIdx(id)).filter(i => i >= 0);
  const fin = Math.max.apply(null, idxs);
  if (G.tuto && (G.tuto.done || (G.tuto.step || 0) > fin)) return "hecho";
  const ini = Math.min.apply(null, idxs);
  return (G.tuto && (G.tuto.step || 0) >= ini) ? "activo" : "pendiente";
}
function tutoNeed(st) { return st ? (typeof st.need === "function" ? st.need() : (st.n || 1)) : 0; }
function tutoTiene(st) {
  if (!st || !st.res) return 0;
  let n = Math.floor(st.res === "plata" ? G.plata : (G.res[st.res] || 0));
  // 13/8 v2: lo YA DEPOSITADO en la obra del paso cuenta — depositar temprano no traba el "juntá"
  if (st.dep && G.obraDep && G.obraDep[st.dep]) n += Math.floor(G.obraDep[st.dep][st.res] || 0);
  if (st.dep && G.built && G.built[st.dep]) n = Math.max(n, tutoNeed(st));   // construido = todo depositado
  return n;
}
function tutoTxt(st) { return st ? String(st.txt).replace("#", tutoNeed(st)) : ""; }

/* ============ GUARDIA DEL TUTORIAL (12/8): que nadie se rompa la cadena =============
   El jugador puede pasear tranquilo, pero NO fundirse lo que el objetivo ACTIVO
   necesita (pasó en pruebas: vender las papas y gastarse la plata en otra cosa dejaba
   la cadena trabada). No bloquea el juego entero: frena SOLO el gasto que haría
   imposible el objetivo de ahora, con un aviso 🎯 que devuelve al camino.
   Excepción clave: comprar SEMILLAS nunca se bloquea por plata — son el motor del
   loop que genera la plata que el objetivo pide. */
/* 14/8 (misma decisión): sin embudo, el guardia también se retira — reservar recursos era
   parte del tutor obligatorio. Queda el cuerpo por si dirección quiere reactivarlo. */
function tutoGuardia(res, n, motivo, extra) { return true; }
function _tutoGuardiaViejo(res, n, motivo, extra) {
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st || !n) return true;
  const nombre = r => r === "plata" ? "plata" : (RES_LABEL[r] || r);
  // 1) paso "juntá X de tal cosa": el gasto no puede bajarte de la meta
  if (st.res === res && !(res === "plata" && extra && extra.semilla)) {
    const need = tutoNeed(st);
    if (tutoTiene(st) - n < need) { toast("🎯 Objetivo: juntar " + need + " de " + nombre(res) + " — " + (motivo || "ese gasto") + " puede esperar"); return false; }
  }
  // 2) paso "comprá semillas de papa": esa plata está reservada (comprar papa SÍ vale)
  if (st.id === "buyseed" && res === "plata" && !(extra && extra.semilla === "papa")) {
    const precio = (CROP_DEF.papa && CROP_DEF.papa.seedCost) || 1;
    if (G.plata - n < precio) { toast("🎯 Guardá esa plata para las semillas de papa del objetivo"); return false; }
  }
  // 4) COLCHÓN anti-cero-absoluto (14/8): con nada plantado, sin semillas y sin cosecha,
  //    gastar la última plata te deja sin NINGUNA palanca económica (softlock detectado en
  //    simulación). La semilla en sí está exenta: comprarla ES la salida.
  if (res === "plata" && !(extra && extra.semilla)) {
    const min = (CROP_DEF.papa && CROP_DEF.papa.seedCost) || 1;
    const tieneAlgo = Object.keys(CROP_DEF).some(k => (G.res[k] || 0) > 0)
      || Object.keys(G.seeds || {}).some(k => (G.seeds[k] || 0) > 0)
      || (Array.isArray(G.plots) && G.plots.some(p => p && (p.state === "growing" || p.state === "ready")));
    if (!tieneAlgo && G.plata - n < min) { toast("🎯 Guardá al menos " + min + " de plata para semillas"); return false; }
  }
  // 3) pasos "colocá el plano", "construí X" y también los "juntá" de esa obra (st.dep):
  //    lo que la obra todavía espera queda reservado — ni reparaciones ni crafteos lo comen
  if (st.id && (st.id.indexOf("build_") === 0 || st.id.indexOf("place_") === 0 || st.dep)) {
    const t = st.dep || st.id.slice(6), b = BUILD_DEF[t];
    if (b && b.cost[res]) {
      const pend = (typeof obraDe === "function" && obraDe(t) && typeof obraFalta === "function")
        ? ((obraFalta(t).find(x => x[0] === res) || [0, 0])[1]) : b.cost[res];
      if (Math.floor(G.res[res] || 0) - n < pend) { toast("🎯 Esa " + nombre(res) + " está reservada para " + b.label + " — terminá esa obra primero"); return false; }
    }
  }
  return true;
}
// versión para recetas enteras: chequea cada material + la plata de una
function tutoGuardiaCosto(cost, plata, motivo) {
  if (typeof tutoGuardia !== "function") return true;
  for (const k in (cost || {})) if (!tutoGuardia(k, cost[k], motivo)) return false;
  if (plata && !tutoGuardia("plata", plata, motivo)) return false;
  return true;
}

/* ============ ACELERADOR DEL TUTORIAL (12/8): el objetivo no te hace esperar ========
   Mientras el objetivo ACTIVO necesita un timer, ESE timer corre acelerado — y solo
   ese. Si el paso pide madera, el árbol se recupera al toque pero las papas siguen a
   tiempo real (y al revés). Como los pasos de "juntá X" se completan SOLOS al llegar
   a la meta, la aceleración muere ahí: no hay ventana para farmear infinito. El
   candado anti-exploit que cierra el círculo: durante un "juntá X" tampoco se puede
   VENDER ese recurso por debajo de la meta (si no, vender para quedarse en 9/10
   mantenía el boost vivo para siempre). */
var TUTO_BOOST = 0.12;   // los timers del objetivo corren a ~1/8 del tiempo real
function tutoBoost(clase) {
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st) return 1;
  const mapa = {
    papa:  ["plant", "harvest", "sell", "buyseed"],   // el arranque entero fluye (silver/plant2 retirados)
    tree:  ["wood", "woodc", "wood_st", "wood_al", "unlockarm"],   // 14/8: los materiales de la forja de Armas también corren acelerados
    rock:  ["stone", "stonec", "stone_st", "stone_al", "unlockarm"],
    horno: ["mat"],
  };
  // 14/8 (dirección, decisión final): con la guía OPCIONAL los tiempos acelerados se
  // retiran — serían explotables jugando "con el objetivo puesto". Todos crecen igual.
  return 1;
  /* eslint-disable no-unreachable */
  if ((mapa[clase] || []).includes(st.id)) return TUTO_BOOST;
  return 1;
}
var TUTO_BOOST_DESVIO = 0.04;   // los cultivos del desvío corren a 1/25 (papa: ~22 s · cebolla: ~2 min)
var TUTO_REWARD_PLATA = 100;   // gran recompensa del cierre (editable)
// doc 2/8 §3.1: SOLO las semillas del starter pack crecen rápido (45 s). Las compradas o conseguidas
// después usan el tiempo normal del cultivo. 0 en el panel = sin excepción.
var FIRST_GROW_MS = 0;   // 14/8: APAGADO — la papa crece en 90 s de base (escalera nueva), sin trato especial
var FIRST_GROW_N = 3;        // cuántas semillas de arranque tienen ese trato (las 3 papas del inicio)
var TUTO_VER = 13;   // v13 (15/8): paso 0 nuevo — el kit de bienvenida se retira del BAÚL
function tutoActivo() { return G.tuto && !G.tuto.done ? TUTO_STEPS[G.tuto.step] : null; }
// migración: si el guardado trae una cadena vieja, los pasos ya no significan lo mismo → se recalcula
/* 18/8 (reporte del diseñador: "compré las 3 papas y el tuto no lo detecta").
   El fallo no estaba en la compra: el tutorial seguía parado en el PASO 0, el del baúl, y
   `tutoEvent` descarta en silencio cualquier evento que no sea el del paso activo. O sea que
   comprar, plantar y cosechar no contaban nada y no se avisaba de nada.

   Por qué se quedaba parado en el 0: `kitReclamar()` arranca con `if (G.kitReclamado) return false`
   y es el ÚNICO sitio que dispara el evento "kit". Y al cargar un guardado que no trae ese campo,
   save.js hace `G.kitReclamado = d.kitReclamado != null ? !!d.kitReclamado : true` — o sea, lo da
   por reclamado. Resultado: el baúl no tiene nada que entregar, el evento no se dispara nunca y el
   paso no se puede cumplir ni jugando bien.

   `tutoAutoSkip()` habría arreglado esto solo, porque `tutoHecho` ya sabe que el paso del kit está
   hecho si `G.kitReclamado` es true. Pero solo se llamaba al MIGRAR de versión, así que a quien ya
   tenía la versión actual no le corría nunca.

   Arreglo: se llama SIEMPRE al cargar. Cualquier paso ya cumplido se salta, venga de donde venga
   el desajuste. Es la clase de fallo entera, no solo este caso. */
function tutoMigrar() {
  if (!G.tuto) G.tuto = { step: 0, n: 0, done: false, v: TUTO_VER };
  if (G.tuto.v !== TUTO_VER) {
    G.tuto.v = TUTO_VER;
    /* 18/8 (dirección): "cuando haces deploy, si estás en una etapa del tutorial, el tutorial
       regresa como al principio. Debería mantener el progreso."
       Antes esto hacía step = 0 a secas y confiaba en que tutoAutoSkip volviera a subir. Pero
       autoskip solo puede saltar los pasos que dejan RASTRO en la partida (tener madera, haber
       construido). Los pasos de acción —moverte, abrir un menú, tocar un nodo— no dejan rastro,
       así que el recálculo se frenaba en el primero de esos y el jugador volvía atrás de verdad.
       Ahora se recalcula igual, pero el paso guardado hace de SUELO: la cadena nueva puede
       adelantarte, nunca devolverte. */
    if (!G.tuto.done) {
      const guardado = G.tuto.step || 0;
      G.tuto.step = 0; G.tuto.n = 0;
      tutoAutoSkip();
      if (!G.tuto.done && guardado > G.tuto.step) {
        G.tuto.step = Math.min(guardado, TUTO_STEPS.length - 1); G.tuto.n = 0;
      }
    }
  }
  if (!G.tuto.done) tutoAutoSkip();   // y SIEMPRE se saltan los pasos que ya estaban cumplidos
}
// salta los pasos que el jugador YA cumplió (evita pedir cosas hechas o mentir con "ya tenés los materiales")
// ¿este paso ya está cumplido? Se saca aparte porque ahora se consulta en dos momentos:
// al migrar un guardado viejo Y cada vez que un paso pasa a ser el activo (9/8). Antes solo
// se miraba al migrar, así que si construías la Cocina ANTES de que el tutorial la pidiera,
// después te la pedía igual y no había manera de cumplirla.
function tutoHecho(st) {
  {
    let hecho = false;
    if (st.res) hecho = tutoTiene(st) >= tutoNeed(st);
    // 13/8: pasos "colocá el plano" — hechos si la obra ya está en el piso (o el edificio construido)
    else if (st.id && st.id.indexOf("place_") === 0) { const t = st.id.slice(6); hecho = !!((G.obras && G.obras[t]) || (G.built && G.built[t])); }
    // 14/8 v4: el 1er paso ("comprá tus 3 semillas") solo está hecho con las 3 (o si ya cosechó alguna vez)
    else if (st.id === "kit") hecho = !!G.kitReclamado;
    else if (st.id === "buyseed") hecho = (G.seeds && (G.seeds.papa || 0) >= 3) || !!G.firstCropDone;
    else if (st.id === "build_store")  hecho = !!(G.built && G.built.store);
    else if (st.id === "build_horno")  hecho = !!(G.built && G.built.horno);
    else if (st.id === "build_cocina") hecho = !!(G.built && G.built.cocina);
    else if (st.id === "build_altar")  hecho = !!(G.built && G.built.altar);
    else if (st.id === "crafttool") hecho = !!(G.built && G.built.horno);   // si ya construyó, el hacha quedó atrás
    else if (st.id === "cook")      hecho = (G.skills && G.skills.cooking > 0);
    /* 19/8: el paso del Estofado no tiene evento propio —tutoEvent("cook") ya lo usa el paso de la
       Papa Asada— así que se detecta por el plato en la bolsa o por haberlo cocinado alguna vez. */
    else if (st.id === "estofado")  hecho = ((G.dishes && G.dishes.estofado) || 0) > 0 ||
                                            (typeof statGet === "function" && statGet("cocinar", "estofado") > 0);
    /* Los tres del crecimiento se detectan por el ESTADO, no por un evento: así el paso se salta
       solo si el jugador ya lo había hecho por su cuenta antes de que el tutorial se lo pidiera. */
    else if (st.id === "expandir")  hecho = (G.expansiones || 0) > 0;
    else if (st.id === "editar")    hecho = !!G.editVisto;
    else if (st.id === "pedido")    hecho = (typeof statGet === "function" && statGet("pedido") > 0) || (G.vales || 0) > 0;
    /* Los montículos se reinician cada día, así que "ya cavaste hoy" no sirve como prueba de que
       aprendiste: vale también tener la carnada en la bolsa o haber pescado alguna vez. */
    else if (st.id === "excavar")   hecho = ((G.excav && G.excav.hechos && G.excav.hechos.length) || 0) > 0 ||
                                            (G.res && (G.res.lombriz || 0) > 0) ||
                                            (G.skills && (G.skills.fishing || 0) > 0);
    else if (st.id === "eat")       hecho = (G.skills && G.skills.cooking > 0) && (G.buffs || []).length > 0;
    else if (st.id === "unlockarm") hecho = !!G.armasUnlocked;
    else if (st.id === "craftarm")  hecho = Object.keys(G.weapons || {}).length > 0;
    else if (st.id === "equiparm")  hecho = !!(G.gear && G.gear.arma);
    else if (st.id === "portal" || st.id === "kill" || st.id === "kill5") hecho = (G.combatXp || 0) > 0;
    else if (st.id === "fish")      hecho = (G.skills && G.skills.fishing > 0);
    else if (st.id === "upgrade")   hecho = Object.keys(G.weapons || {}).some(k => (G.weapons[k].plus || 0) > 0);
    else if (st.id === "mat")       hecho = MAT_ORDER.some(k => (G.res[k] || 0) > 0);
    else if (st.id === "craftpick") hecho = !!(G.picks && G.picks.owned && (G.picks.owned.bronze || G.picks.owned.iron || G.picks.owned.gold));
    else if (st.id === "mineore")   hecho = ["bronce","hierro","oro","diamante","netherita"].some(k => (G.res[k] || 0) > 0);
    else if (st.id === "dummy")     hecho = !!G.dummyUsedAt;
    else if (st.id === "unlocknode") hecho = ((G.treesOpen || [0]).length + (G.rocksOpen || [0]).length) > 2;
    else if (st.id === "chest")     hecho = (G.chests || []).length > 0;
    else if (st.id === "invexp")    hecho = (G.invExtra || 0) > 0;
    else if (st.id === "passclaim") hecho = !!(G.pass && (Object.keys(G.pass.claimF || {}).length || Object.keys(G.pass.claimV || {}).length));
    else if (st.id === "socket")    hecho = Object.keys(G.weapons || {}).some(k => Object.keys((G.weapons[k].sockets) || {}).some(sl => G.weapons[k].sockets[sl]));
    return hecho;
  }
}
/* 14/8 (dirección): el ADELANTO — ya aprendiste el loop de la plata (plantar → cosechar →
   vender), no hace falta repetirlo 20 veces por cada tanda de herramientas. Al ENTRAR a un
   paso de "juntá madera/piedra", el tutorial calcula las herramientas que faltan para la
   meta COMPLETA y acredita esa plata exacta:
   · madera → hachas faltantes × su precio (1 tala = 1 uso)
   · piedra → reparaciones faltantes × precio del hacha (reparar = 1 madera = 1 tala)
   En los pasos tempranos el kit de arranque alcanza → adelanto 0 (la primera vez se
   aprende, las repeticiones se pagan). Se otorga UNA vez por paso (G.tuto.adel). */
/* 14/8 v2 (dirección, tras el bloqueo de la cocina): el adelanto entrega las HERRAMIENTAS
   directamente, no la plata para comprarlas. El jugador ya aprendió a craftear — repetir
   la conversión plata→herramienta era otro bucle (y con los picos era un SOFTLOCK: el
   pico se DESTRUYE a 0 usos, no se repara; uno nuevo sale 3 madera + 10 plata por UN uso).
   · pasos de madera → hachas que falten para la meta completa
   · pasos de piedra → usos de pico (si el pico murió, revive el de piedra con esos usos)
   · crafttool → plata (esa ES la lección: craftear pagando)
   · unlockarm → la plata del desbloqueo + hachas/usos para sus materiales
   Marca nueva G.tuto.adelv (la vieja adel queda ignorada → los guardados trabados en un
   paso ya "cobrado" con la cuenta vieja RECIBEN el kit al entrar el fix). */
// (14/8, reversión: tutoAdelanto/kits eliminados — el tutorial no regala nada;
//  el set de arranque de herramientas volvió y el kit de emergencia en $G sigue en la Tienda)
function tutoAdelanto() {}
/* EL CIERRE DEL TUTORIAL, UNO SOLO PARA TODOS LOS CAMINOS (21/8, dirección vía Discord):
   "¿cómo sé que el tutorial ha terminado?" — "¿ya dejó de ponerte objetivos?" — "creo que sí".
   Eso pasaba porque el tutorial tenía DOS finales: el paso a paso (tutoDone) celebraba con
   « ¡GRANJA LISTA! », pero el autoskip —cuando los últimos pasos ya estaban cumplidos de antes:
   expandiste, editaste, pescaste, tenías vales— ponía done=true Y SE CALLABA. Los objetivos
   desaparecían sin explicación y el jugador se quedaba preguntándose si terminó o se rompió. */
function tutoTerminar() {
  log("¡Tutorial completo! Ya sabés lo básico — la granja es toda tuya.", "gold");
  if (window.celebrate) celebrate({ title: "¡GRANJA LISTA!", sub: "Tutorial completo", big: true });
  if (typeof refreshHud === "function") refreshHud();
}
function tutoAutoSkip() {
  for (let i = 0; i < TUTO_STEPS.length + 2; i++) {
    const st = tutoActivo(); if (!st) return;
    if (!tutoHecho(st)) return;
    G.tuto.step++; G.tuto.n = 0;
    if (G.tuto.step >= TUTO_STEPS.length) { G.tuto.done = true; tutoTerminar(); return; }
  }
}
// paso de RECURSO: se cumple solo cuando tenés la cantidad que pide la receta siguiente
function tutoCheckRes() {
  const st = tutoActivo();
  if (!st || !st.res) return;
  if (tutoTiene(st) >= tutoNeed(st)) tutoDone(st);
}
function tutoEvent(tipo) {
  const st = tutoActivo(); if (!st || st.res) return;
  const acepta = st.id === tipo;
  if (!acepta) return;
  G.tuto.n = (G.tuto.n || 0) + 1;
  if (G.tuto.n < st.n) {
    if (typeof tutoRefresh === "function") tutoRefresh();
    if (typeof saveFarm === "function") saveFarm(true);   // 18/8: también el "2 de 3", que si no se pierde al recargar
    return;
  }
  tutoDone(st);
}
function tutoDone(st) {
  // paso cumplido: tilde + sonido + avance automático (doc)
  if (st.pr) { G.plata += st.pr; log("Objetivo cumplido: +" + st.pr + " de plata.", "gold"); }
  if (typeof tutoCheck === "function") tutoCheck(tutoTxt(st) + (st.pr ? " (+" + st.pr + " plata)" : ""));
  if (window.sfx) sfx("level");
  G.tuto.step++; G.tuto.n = 0;
  if (G.tuto.step >= TUTO_STEPS.length) {
    G.tuto.done = true;
    tutoTerminar();   // el mismo cierre que el autoskip: un solo final, siempre visible
  } else {
    tutoAutoSkip();   // si el paso nuevo ya estaba cumplido, no lo pide (9/8)
    if (G.tuto.done) { if (typeof tutoRefresh === "function") tutoRefresh(); return; }
    log("Nuevo objetivo: " + tutoTxt(TUTO_STEPS[G.tuto.step]) + ".", "good");
    if (typeof planosSync === "function") planosSync(false);   // 13/8: si el paso nuevo trae plano, cae ACÁ (con su celebración)
  }
  if (typeof tutoRefresh === "function") tutoRefresh();
  /* 18/8: GUARDAR AL AVANZAR. Este era el motivo real de "el deploy me devuelve al principio":
     el paso del tutorial solo vivía en memoria. Se escribía si por casualidad otra acción
     disparaba un guardado (plantar, cobrar…), pero los pasos de pura acción no guardaban nada,
     así que al recargar la página volvías al último paso que sí se hubiera escrito. */
  if (typeof saveFarm === "function") saveFarm(true);
  if (window.farmScene && window.farmScene.updateTutoArrow) try { window.farmScene.updateTutoArrow(); } catch (e) {}
  if (typeof saveFarm === "function") saveFarm();
}

// ================= PASE DE BATALLA (doc maestro 2/8): 30 niveles Free/VIP, estrellas por misiones =================
var PASS_STARS_LVL = 40;      // estrellas por nivel (diarias completas ≈ 35/día → 30 niveles en ~5 semanas)
var PASS_VIP_PRICE = 250;     // $Golden (doc: ~250 o 4,99 USD)
var PASS_LVL_GOLD = 15;       // comprar 1 nivel suelto con $Golden (para quien va tarde)
var PASS_STAR_DAILY = 10, PASS_STAR_BONUS = 5, PASS_STAR_WEEKLY = 40;
var PASS_VIP_BOOST = 1.2;     // perk VIP: +20% de estrellas (conveniencia, no poder)
// 14/8 (web3): el track FREE paga INSUMOS, no plata — cada plata regalada es emisión.
// Los valores reemplazan cada fila de plata por insumos de valor equivalente.
const PASS_FREE = [   // índice = nivel-1 (tabla del doc, plata→insumos 14/8)
  { res:["madera",20] }, { seed:["papa",5] }, { res:["madera",20] }, { seed:["zanahoria",8] }, { seed:["zanahoria",5] },
  { res:["piedra",25] }, { dish:["pan_trigo",3] }, { res:["lombriz",15] }, { seed:["cebolla",5] }, { pick:"bronze" },
  { res:["barra_piedra",3] }, { res:["madera",30] }, { seed:["repollo",5] }, { dish:["papa_asada",5] }, { ficha:1 },
  { res:["piedra",30] }, { seed:["calabacin",5] }, { res:["flecha",40] }, { dish:["estofado",1] }, { pick:"gold" },
  { res:["carne",10] }, { res:["madera",40] }, { seed:["brocoli",5] }, { res:["bronce",8] }, { ficha:1 },
  { res:["piedra",40] }, { seed:["maiz",5] }, { res:["esencia_runica",2] }, { dish:["banquete",1] }, { ficha:1, cos:"Título de Cosecha" },
];
// 14/8 (web3): el VIP paga COSMÉTICO + conveniencia (insumos ricos y algo de $Golden —
// devolución parcial de lo quemado al comprarlo), jamás plata ni poder: con economía
// compartida y P2P, el pay-to-win destruye el mercado que es el producto.
/* 19/8 — NOTA PARA EL DÍA DEL TOKEN, no para hoy.
   De los doce cosméticos de este recorrido, CINCO son "Skin de…" y no hay una sola línea que
   cambie el sprite del granjero ni de las herramientas. El aura, la mascota, las decoraciones, el
   título, el marco y el color de nombre SÍ están enganchados y funcionan.
   Hoy eso no le cuesta un centavo a nadie: no hay pasarela de pago, ni wallet, ni forma de comprar
   $Golden con dinero — el pase se paga con moneda del juego. Por eso no bloquea nada, y por eso
   dirección decidió no priorizarlo: "los adornos son cosas que al jugador le gustará tener si le
   gusta el juego; si no, no tiene sentido".
   Lo que hay que mirar es OTRO momento: en cuanto se pueda comprar $Golden con dinero real, estas
   cinco líneas pasan a ser una promesa cobrada. Antes de ese día, o se implementan o se cambian
   por recompensas que sí existen. Queda escrito acá para que nadie lo descubra tarde. */
/* 18/8 (auditoría) — EL PASE VIP SE AUTOFINANCIABA AL 98%.
   Costaba 250 $Golden y devolvía 245 repartidos en 9 niveles: coste neto real 5 $G por 133.000 de
   plata en insumos y 13 cosméticos. El comentario de acá arriba lo llamaba "devolución parcial de
   lo quemado" — 98% no es parcial, es gratis. Peor: comprar un nivel suelto cuesta 15 $G y SIETE de
   los niveles devolvían más que eso, así que comprar niveles daba ganancia. Y si algún día se
   agrega el reinicio de temporada, eso es un bucle infinito de moneda premium.
   Arreglo: la devolución baja a 60 $G (24% — devolución parcial de verdad) y ningún nivel suelto
   devuelve más de lo que cuesta comprarlo. Lo que se saca de $Golden se repone en INSUMOS, que no
   son moneda: el pase sigue valiendo la pena, pero deja de imprimir. */
const PASS_VIP = [
  { seed:["cebolla",10], cos:"Marco Brote" }, { res:["madera",50] }, { golden:5 }, { cos:"Skin de Hacha Dorada" }, { dish:["papa_asada",8], cos:"Emote Saludo" },
  { res:["piedra",40] }, { golden:5 }, { cos:"Decoración: Farol Dorado" }, { seed:["repollo",8] }, { cos:"Skin de Granjero Cosechador Ámbar" },
  { res:["flecha",60] }, { golden:8 }, { cos:"Título Labrador" }, { res:["barra_piedra",5] }, { golden:8, cos:"Estatua de Trigo" },
  { seed:["calabaza",6] }, { cos:"Skin de Caña Reluciente" }, { golden:8 }, { res:["carne",20] }, { cos:"Mascota Pollito Dorado" },
  { res:["bronce",12] }, { golden:8 }, { cos:"Color de nombre Oro" }, { seed:["brocoli",6] }, { golden:8, cos:"Skin de Espada Filo Solar" },
  { res:["esencia_runica",3] }, { golden:10 }, { cos:"Decoración: Fuente Dorada" }, { ficha:1 }, { golden:0, cos:"Skin LEGENDARIA Monarca Dorado + Aura" },
];
const PASS_HITOS = { 1:"★", 5:"★", 10:"★★", 15:"★", 20:"★★", 25:"★", 30:"★★" };
const PASS_MISIONES = {   // una por pilar del juego (doc)
  cosechar: { label: "Cosechá # cultivos",        goals: [6, 10, 15] },
  minar:    { label: "Miná, talá o pescá # veces", goals: [8, 12, 18] },
  cocinar:  { label: "Cociná # platos",           goals: [2, 3, 5] },
  combatir: { label: "Pelea: # acciones de combate", goals: [5, 8, 12] },
  craftear: { label: "Crafteá # objetos",         goals: [2, 3, 5] },
};
const PASS_PILAR = { farming:"cosechar", mining:"minar", fishing:"minar", cooking:"cocinar", sword:"combatir", hacha:"combatir", mazo:"combatir", range:"combatir", crafting:"craftear" };
function passInit() {
  G.pass = G.pass || {};
  const p = G.pass;
  p.stars = p.stars || 0; p.vip = !!p.vip; p.claimF = p.claimF || {}; p.claimV = p.claimV || {}; p.cosmetics = p.cosmetics || [];
  const hoy = dayStamp(0);   // día LOCAL (antes era UTC: los contadores se reseteaban a las 21 h en Argentina)
  if (!p.daily || p.daily.date !== hoy) {   // 3 misiones diarias, una por pilar (rotan con la fecha)
    const pilares = Object.keys(PASS_MISIONES);
    const seed = Number(hoy.replace(/-/g, ""));
    const elegidos = [0, 1, 2].map(i => pilares[(seed + i * 7 + Math.floor(seed / 100) * i) % pilares.length]).filter((v, i, a) => a.indexOf(v) === i);
    for (const px of pilares) { if (elegidos.length >= 3) break; if (!elegidos.includes(px)) elegidos.push(px); }   // completa sin riesgo de bucle infinito
    p.daily = { date: hoy, bonus: false, mis: elegidos.map((k, i) => ({ k, goal: PASS_MISIONES[k].goals[i % 3], n: 0, ok: false })) };
  }
  const semana = (d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + 3 - (x.getDay() + 6) % 7); const w1 = new Date(x.getFullYear(), 0, 4); return x.getFullYear() + "-" + Math.round(((x - w1) / 86400000 + (w1.getDay() + 6) % 7 - 3) / 7 + 1); })(new Date());
  if (!p.weekly || p.weekly.week !== semana) {
    p.weekly = { week: semana, mis: [ { k: "cosechar", goal: 60, n: 0, ok: false }, { k: "combatir", goal: 40, n: 0, ok: false } ] };
  }
  return p;
}
function passLvl() { return Math.min(30, Math.floor(((G.pass && G.pass.stars) || 0) / PASS_STARS_LVL)); }
function passAddStars(n) {
  const p = passInit();
  const antes = passLvl();
  p.stars += Math.round(n * (p.vip ? PASS_VIP_BOOST : 1));
  const ahora = passLvl();
  if (ahora > antes) {
    log("¡Pase de Batalla nivel " + ahora + "! Reclamá tu recompensa en el Pase.", "gold");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + ahora + "!", sub: "Pase de Batalla", big: !!PASS_HITOS[ahora], reward: "Recompensa lista para reclamar" });
  }
  if (typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
}
function passEvent(sk) {   // se dispara con cada acción que da XP: alimenta las misiones
  const pilar = PASS_PILAR[sk]; if (!pilar) return;
  const p = passInit(); let dirty = false;
  [...p.daily.mis, ...p.weekly.mis].forEach(m => {
    if (m.k !== pilar || m.ok) return;
    m.n++; dirty = true;
    if (m.n >= m.goal) {
      m.ok = true;
      const stars = p.weekly.mis.includes(m) ? PASS_STAR_WEEKLY : PASS_STAR_DAILY;
      toast("Misión cumplida: +" + stars + " estrellas"); log("Misión del Pase cumplida (+" + stars + " estrellas).", "good");
      passAddStars(stars);
      if (!p.daily.bonus && p.daily.mis.every(x => x.ok)) { p.daily.bonus = true; toast("¡Las 3 diarias! +" + PASS_STAR_BONUS + " estrellas"); passAddStars(PASS_STAR_BONUS); }
    }
  });
  if (dirty && typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
}
function passRewardStr(r) {
  const parts = [];
  if (r.plata) parts.push(r.plata + " plata");
  if (r.golden) parts.push(r.golden + " $Golden");
  if (r.res) parts.push(r.res[1] + " " + (RES_LABEL[r.res[0]] || r.res[0]));
  if (r.seed) parts.push(r.seed[1] + " semillas de " + (CROP_DEF[r.seed[0]] ? CROP_DEF[r.seed[0]].label : r.seed[0]));
  if (r.dish) parts.push(r.dish[1] + "× " + (RECIPE_DEF[r.dish[0]] ? RECIPE_DEF[r.dish[0]].label : r.dish[0]));
  if (r.pick) parts.push("1 " + PICK_DEF[r.pick].label);
  if (r.ficha) parts.push("Ficha de parcela (parcela GRATIS)");
  if (r.cos) parts.push(r.cos);
  return parts.join(" + ");
}
function passClaim(nv, vipTrack) {
  const p = passInit();
  if (nv > passLvl()) { toast("Todavía no llegaste al nivel " + nv); return; }
  if (vipTrack && !p.vip) { toast("Ese carril es del Pase VIP"); return; }
  const store = vipTrack ? p.claimV : p.claimF;
  if (store[nv]) { toast("Ya reclamaste ese nivel"); return; }
  const r = (vipTrack ? PASS_VIP : PASS_FREE)[nv - 1]; if (!r) return;
  store[nv] = true;
  if (r.plata) G.plata += r.plata;
  if (r.golden) G.golden += r.golden;
  if (r.res) G.res[r.res[0]] = (G.res[r.res[0]] || 0) + r.res[1];
  if (r.seed) G.seeds[r.seed[0]] = (G.seeds[r.seed[0]] || 0) + r.seed[1];
  if (r.dish) { G.dishes = G.dishes || {}; G.dishes[r.dish[0]] = (G.dishes[r.dish[0]] || 0) + r.dish[1]; }
  if (r.pick) { G.picks.owned[r.pick] = true; G.picks.dur[r.pick] = (G.picks.dur[r.pick] || 0) + 1; }
  /* 20/8: G.plotsFicha — la contabilidad de parcelas necesita saber de dónde salió cada una */
  if (r.ficha) { G.plotsOwned = Math.min(PLOT_MAX, (G.plotsOwned || 2) + 1); G.plotsFicha = (G.plotsFicha || 0) + 1; if (window.farmScene && window.farmScene.refreshPlotLocks)   /* 18/8: la guardia "<= GF.PLOTS.length" era parte del fallo de las parcelas 13+ */ { try { window.farmScene.refreshPlotLocks(); } catch (e) {} } if (typeof syncEditDeco === "function") syncEditDeco(); }
  if (r.cos) { p.cosmetics.push(r.cos); }
  log("Pase nivel " + nv + (vipTrack ? " (VIP)" : "") + ": recibiste " + passRewardStr(r) + ".", "gold");
  if (typeof tutoEvent === "function") tutoEvent("passclaim");
  toast("¡" + passRewardStr(r) + "!");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
  if (typeof saveFarm === "function") saveFarm(true);
}
function passBuyVip() {
  const p = passInit();
  if (p.vip) { toast("Ya tenés el Pase VIP"); return; }
  if (G.golden < PASS_VIP_PRICE) { toast("Te falta $Golden (" + PASS_VIP_PRICE + ")"); return; }
  G.golden -= PASS_VIP_PRICE; p.vip = true;
  log("¡Pase VIP activado! Carril dorado desbloqueado + " + Math.round((PASS_VIP_BOOST - 1) * 100) + "% de estrellas.", "gold");
  if (window.celebrate) celebrate({ title: "¡PASE VIP!", sub: "Pase de Batalla", big: true, reward: "Carril dorado + " + Math.round((PASS_VIP_BOOST - 1) * 100) + "% de estrellas" });
  refreshHud(); if (typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
  if (typeof saveFarm === "function") saveFarm(true);
}
function passBuyLevel() {
  const p = passInit();
  if (passLvl() >= 30) { toast("El Pase ya está al máximo"); return; }
  if (G.golden < PASS_LVL_GOLD) { toast("Te falta $Golden (" + PASS_LVL_GOLD + ")"); return; }
  G.golden -= PASS_LVL_GOLD;
  passAddStars(PASS_STARS_LVL / (p.vip ? PASS_VIP_BOOST : 1));   // compensa el boost para dar exactamente 1 nivel
  refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
}








// ================= COSMÉTICOS VISIBLES (los que no necesitan arte) =================
// Título junto al nombre, color de nombre, marco de perfil y aura del granjero.
// Se ganan en los niveles de granja, el pase y el cofre; acá se elige cuál lucir.
const COS_TITULOS = {
  "Granjero Experto": 15, "Maestro de Cultivos": 20, "Veterano": 25, "Leyenda Naciente": 30,
  "Amo de la Granja": 35, "Señor de la Cosecha": 40, "Élite": 45, "Leyenda de la Granja Dorada": 50,
  "Labrador": 0, "Madrugador": 0, "Título de Cosecha": 0,
};
const COS_COLORES = { oro: "#e0a63c", verde: "#5aa832", violeta: "#8a5cd6", celeste: "#3d9fd6", blanco: "#f2ead5" };
const COS_MARCOS = { brote: "Marco Brote", hoja: "Marco de Hoja", dorado: "Marco Dorado" };
function cosTengo(txt) { return (G.cosmeticos || []).some(c => String(c).toLowerCase().includes(String(txt).toLowerCase())); }
// títulos disponibles: los que ganaste (por texto del cosmético) 
function cosTitulosDisponibles() { return Object.keys(COS_TITULOS).filter(t => cosTengo(t)); }
function cosColoresDisponibles() {
  const out = ["blanco"];
  if (cosTengo("color de nombre oro")) out.push("oro");     // el oro sale SOLO del pase VIP (antes cualquier "color de nombre" lo habilitaba)
  if (cosTengo("color de nombre verde") || cosTengo("Madrugador")) out.push("verde");
  if (G.level >= 30) out.push("violeta");
  if (G.level >= 20) out.push("celeste");
  return [...new Set(out)];
}
function cosMarcosDisponibles() {
  const out = ["ninguno"];
  if (cosTengo("Marco")) out.push("brote");
  if (G.level >= 24) out.push("hoja");
  if (G.level >= 42) out.push("dorado");
  return out;
}
function cosAuraDisponible() { return cosTengo("aura") || G.level >= 30; }
// MASCOTA (10/8): la gallina "Pinta" que entrega el cofre de login. Es puro adorno —
// no produce nada ni se le puede dar de comer: pasea por la granja y te acompaña.
const COS_MASCOTAS = { gallina: { label: 'Gallina "Pinta"', sprite: "pet_gallina" } };
function cosMascotasDisponibles() {
  const out = ["ninguna"];
  if (cosTengo("Pinta") || cosTengo("mascota")) out.push("gallina");
  return out;
}
// SKINS (10/8): las últimas piezas del cofre y del nivel 50 que eran solo texto.
//   sombrero  -> Sombrero de paja brillante: lo lleva puesto el granjero en la granja
//   petalos   -> Camino de pétalos: al caminar vas dejando pétalos que se desvanecen
//   granjaOro -> Granja legendaria: valla dorada + chispas de oro flotando (nivel 50)
function cosSombreroDisponible() { return cosTengo("sombrero de paja"); }
function cosPetalosDisponible() { return cosTengo("pétalos") || cosTengo("petalos"); }
function cosGranjaOroDisponible() { return cosTengo("granja legendaria") || G.level >= 50; }
function cosElegido() {
  G.cosEq = G.cosEq || { titulo: "", color: "blanco", marco: "ninguno", aura: false };
  if (!G.cosEq.mascota) G.cosEq.mascota = "ninguna";   // guardados viejos no la traen
  if (G.cosEq.sombrero == null) { G.cosEq.sombrero = false; G.cosEq.petalos = false; G.cosEq.granjaOro = false; }   // guardados viejos
  return G.cosEq;
}
function cosSet(campo, valor) {
  const c = cosElegido();
  c[campo] = valor;
  if (campo === "aura" && valor && window.farmScene && window.farmScene.updateAura) { try { window.farmScene.updateAura(); } catch (e) {} }
  if (window.farmScene && window.farmScene.updateAura) { try { window.farmScene.updateAura(); } catch (e) {} }
  if (campo === "mascota" && window.farmScene && window.farmScene.syncMascota) { try { window.farmScene.syncMascota(); } catch (e) {} }
  if (window.farmScene && window.farmScene.updateSkins) { try { window.farmScene.updateSkins(); } catch (e) {} }   // sombrero / pétalos / granja legendaria (10/8)
  if (typeof refreshCosmeticos === "function" && isOpen("ov-cos")) refreshCosmeticos();
  if (typeof saveFarm === "function") saveFarm();
}
// nombre para mostrar en ranking, chat y plaza
function nombreLucido(nick) {
  const c = cosElegido();
  return (c.titulo ? "[" + c.titulo + "] " : "") + (nick || window.NICK || "Granjero");
}
function colorNombre() { return COS_COLORES[cosElegido().color] || COS_COLORES.blanco; }

// ================= MERCADO ENTRE JUGADORES (P2P) =================
// Publicás algo tuyo con un precio; otro jugador lo compra y vos cobrás cuando volvés al mercado.
// Comisión que se QUEMA (sumidero sano): sale del precio que cobra el vendedor.
var MARKET_FEE = 5;             // % de comisión
var MARKET_MAX_PUB = 10;        // publicaciones activas por jugador
const MARKET_KINDS = { res: "Recurso", seed: "Semilla", dish: "Plato", fish: "Pez", arm: "Arma" };
function mkTengo(kind, key) {
  if (kind === "res") return Math.floor(G.res[key] || 0);
  if (kind === "seed") return Math.floor(G.seeds[key] || 0);
  if (kind === "dish") return Math.floor((G.dishes && G.dishes[key]) || 0);
  if (kind === "fish") return Math.floor((G.fish && G.fish[key]) || 0);
  if (kind === "arm") return (G.weapons && G.weapons[key]) ? 1 : 0;
  return 0;
}
function mkSacar(kind, key, n) {
  if (mkTengo(kind, key) < n) return false;
  if (kind === "res") G.res[key] -= n;
  else if (kind === "seed") G.seeds[key] -= n;
  else if (kind === "dish") G.dishes[key] -= n;
  else if (kind === "fish") G.fish[key] -= n;
  else if (kind === "arm") { if (G.gear.arma === key) G.gear.arma = null; delete G.weapons[key]; }
  return true;
}
function mkPoner(kind, key, n, payload) {
  if (kind === "res") { if (!tryAddRes(key, n)) return false; }
  else if (kind === "seed") G.seeds[key] = (G.seeds[key] || 0) + n;
  else if (kind === "dish") { G.dishes = G.dishes || {}; G.dishes[key] = (G.dishes[key] || 0) + n; }
  else if (kind === "fish") { G.fish = G.fish || {}; G.fish[key] = (G.fish[key] || 0) + n; }
  else if (kind === "arm") {
    G.weapons = G.weapons || {};
    if (G.weapons[key]) return false;   // ya tenés una igual: NO se pisa (se perdían el +N, la durabilidad y las runas)
    G.weapons[key] = payload || { dur: (ARM_DEF[key] ? ARM_DEF[key].dur : 40) };
  }
  return true;
}
// PENDIENTES del mercado: si algo no entra en la bolsa (o ya tenés esa arma) NO se pierde,
// queda guardado y se reclama desde la ventana del Mercado cuando hagas lugar.
function mkPendAdd(kind, key, n, payload) {
  G.mkPend = G.mkPend || [];
  G.mkPend.push({ kind, item: key, qty: n, payload: payload || null });
  toast("Sin lugar — quedó pendiente en el Mercado");
  log("No entró en la bolsa: " + n + " × " + mkNombre(kind, key) + ". Hacé lugar y reclamalo desde el Mercado.", "bad");
}
function mkPendCount() { return (G.mkPend || []).length; }
function mkPendCobrar() {
  if (!G.mkPend || !G.mkPend.length) { toast("No tenés nada pendiente"); return 0; }
  const quedan = []; let dados = 0;
  for (const p of G.mkPend) { if (mkPoner(p.kind, p.item, p.qty, p.payload)) dados++; else quedan.push(p); }
  G.mkPend = quedan;
  if (dados) { log("Reclamaste " + dados + " entrega(s) pendiente(s) del Mercado.", "good"); toast("+" + dados + " entrega(s)"); }
  else toast("Sigue sin entrar — liberá espacio en la bolsa");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function" && isOpen("ov-p2p")) refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
  return dados;
}
// entrega segura: si no entra, va a pendientes (nunca se destruye)
function mkEntregar(kind, key, n, payload) { if (!mkPoner(kind, key, n, payload)) mkPendAdd(kind, key, n, payload); }
function mkNombre(kind, key) {
  if (kind === "arm") return (ARM_DEF[key] && ARM_DEF[key].label) || key;
  if (kind === "dish") return (RECIPE_DEF[key] && RECIPE_DEF[key].label) || key;
  if (kind === "fish") return (FISH_DEF[key] && FISH_DEF[key].label) || key;
  if (kind === "seed") return "Semilla de " + ((CROP_DEF[key] && CROP_DEF[key].label) || key);
  return (CROP_DEF[key] && CROP_DEF[key].label) || RES_LABEL[key] || key;
}
async function marketPublicar(kind, key, n, precio) {
  n = Math.max(1, Math.floor(n || 1)); precio = Math.max(1, Math.floor(precio || 1));
  if (!MARKET_KINDS[kind]) return;
  if (mkTengo(kind, key) < n) { toast("No tenés " + n + " de eso"); return; }
  const mias = await mkMine();
  if (mias.filter(r => !r.sold_to).length >= MARKET_MAX_PUB) { toast("Ya tenés " + MARKET_MAX_PUB + " publicaciones activas"); return; }
  const payload = (kind === "arm" && G.weapons[key]) ? JSON.parse(JSON.stringify(G.weapons[key])) : null;
  if (!mkSacar(kind, key, n)) { toast("No se pudo publicar"); return; }
  const fila = await mkPublish({ kind, item: key, qty: n, price: precio, payload, name: mkNombre(kind, key) });
  if (!fila) { mkEntregar(kind, key, n, payload); toast("No se pudo publicar — revisá tus publicaciones antes de reintentar"); return; }   // falló: te devolvemos lo tuyo
  log("Publicaste " + n + " × " + mkNombre(kind, key) + " por " + fmt(precio) + " de plata.", "gold");
  toast("Publicado");
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}
let mkBusy = false;   // un solo movimiento de mercado a la vez (el doble clic duplicaba/dejaba la plata en negativo)
async function marketComprar(fila) {
  if (!fila || mkBusy) return;
  if (fila.seller === (typeof UID === "string" ? UID : "")) { toast("Eso lo publicaste vos"); return; }
  if (G.plata < fila.price) { toast("Te falta plata (" + fmt(fila.price) + ")"); return; }
  if (fila.kind === "arm" && G.weapons && G.weapons[fila.item]) { toast("Ya tenés esa arma — no se puede tener dos iguales"); return; }
  mkBusy = true;
  const ok = await mkBuy(fila.id).catch(() => false);
  mkBusy = false;
  if (!ok) { toast("Se lo llevaron primero"); if (typeof refreshP2P === "function") refreshP2P(); return; }
  G.plata -= fila.price;
  mkEntregar(fila.kind, fila.item, fila.qty, fila.payload);   // si no entra en la bolsa, queda pendiente (no se pierde)
  log("Compraste " + fila.qty + " × " + (fila.name || mkNombre(fila.kind, fila.item)) + " a " + (fila.seller_name || "otro granjero") + " por " + fmt(fila.price) + " de plata.", "gold");
  toast("¡Comprado!");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}
async function marketCancelar(fila) {
  if (!fila || mkBusy) return;
  if (fila.seller !== (typeof UID === "string" ? UID : "")) { toast("Esa publicación no es tuya"); return; }
  mkBusy = true;
  const ok = await mkCancel(fila.id).catch(() => false);
  mkBusy = false;
  if (!ok) { toast("No se pudo retirar (¿ya se vendió?)"); if (typeof refreshP2P === "function") refreshP2P(); return; }
  mkEntregar(fila.kind, fila.item, fila.qty, fila.payload);   // si no entra en la bolsa, queda pendiente (no se pierde)
  log("Retiraste tu publicación de " + (fila.name || fila.item) + ".", "good"); toast("Retirado");
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}
async function marketCobrar(fila) {
  if (!fila || mkBusy) return;
  if (fila.seller !== (typeof UID === "string" ? UID : "")) { toast("Esa venta no es tuya"); return; }
  if (fila.paid) { toast("Esa venta ya la cobraste"); return; }
  mkBusy = true;
  const ok = await mkCollect(fila.id).catch(() => false);
  mkBusy = false;
  if (!ok) { toast("No se pudo cobrar"); if (typeof refreshP2P === "function") refreshP2P(); return; }
  const neto = Math.max(1, Math.round(fila.price * (1 - MARKET_FEE / 100)));
  G.plata += neto;
  log("Cobraste " + fmt(neto) + " de plata por " + (fila.name || fila.item) + " (comisión " + MARKET_FEE + "%).", "gold");
  toast("+" + fmt(neto) + " de plata");
  refreshHud();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ================= INCURSIONES: COMBATE DE UN CLIC (doc "Combate un clic vs jugado", 3/8) =================
// Mandás al granjero a una zona, tarda tiempo REAL (como las ollas de la Cocina) y vuelve con botín y XP.
// Gasta durabilidad del arma y estamina. Rinde menos que pelear a mano: el que juega, gana más.
var INC_RENDIMIENTO = 0.7;    // 70% de lo que rendiría esa misma media hora peleando
var INC_CUPO_DIA = 3;         // incursiones por día (0 = sin tope)
const INCURSIONES = {
  zn1: { label:"Zona Negra I",   min:10, mobs:["rata","murcielago","larva","baba","arana"],           poderRec:8 },
  zn2: { label:"Zona Negra II",  min:20, mobs:["goblin","orco","esqueleto","lancero","golem"],        poderRec:20 },
  zn3: { label:"Zona Negra III", min:30, mobs:["hombre_lobo","guerrero","troll","ogro","espectro"],   poderRec:35 },
  guarida: { label:"Guarida",    min:45, mobs:["demonio"],                                             poderRec:55 },
};
const INC_ORDER = ["zn1", "zn2", "zn3", "guarida"];
function incPoder() {   // poder de combate del jugador con lo que tiene equipado
  const id = armaEq(); if (!id) return 0;
  const w = ARM_DEF[id], lvl = skillInfo(G.skills[armSkillKey(w.tipo)] || 0, armSkillKey(w.tipo)).lvl;
  let p = (w.min + w.max) / 2 + Math.floor(lvl / 2);
  p *= 1 + upgDmg(armPlus(id)) / 100;
  p *= dmgMult();
  return Math.round(p);
}
function incCupoHoy() {
  const hoy = dayStamp(0);   // día LOCAL (antes era UTC: los contadores se reseteaban a las 21 h en Argentina)
  if (!G.incDia || G.incDia.date !== hoy) G.incDia = { date: hoy, n: 0 };
  return G.incDia;
}
function incActiva() { return G.incursion || null; }
function incFalta() { const i = incActiva(); return i ? Math.max(0, i.endAt - nowMs()) : 0; }
function incSalir(zona) {
  const z = INCURSIONES[zona]; if (!z) return;
  if (incActiva()) { toast("Ya hay una incursión en curso"); return; }
  const cupo = incCupoHoy();
  if (INC_CUPO_DIA && cupo.n >= INC_CUPO_DIA) { toast("Ya hiciste las " + INC_CUPO_DIA + " incursiones de hoy"); return; }
  const id = armaEq();
  if (!id) { toast("Necesitás un arma equipada"); return; }
  if ((G.weapons[id].dur || 0) <= 5) { toast("El arma está muy gastada — reparala en la Herrería"); return; }
  const poder = incPoder();
  if (poder <= 0) { toast("Tu arma no sirve para pelear"); return; }
  const ms = z.min * 60000;
  G.incursion = { zona, endAt: nowMs() + ms, total: ms, poder, arma: id };
  cupo.n++;
  log("Saliste de incursión a " + z.label + " (" + fmtSecs(z.min * 60) + "). Volvés con el botín.", "gold");
  toast("Incursión: " + z.label);
  refreshHud(); if (typeof refreshIncursion === "function" && isOpen("ov-incursion")) refreshIncursion();
  if (typeof saveFarm === "function") saveFarm(true);
}
// resuelve la incursión con los stats reales del bestiario
function incResolver() {
  const inc = incActiva(); if (!inc || nowMs() < inc.endAt) return null;
  const z = INCURSIONES[inc.zona];
  const mobs = z.mobs.map(k => MONSTER_DEF[k]);
  const vidaMedia = mobs.reduce((a, m) => a + m.hp, 0) / mobs.length;
  const defMedia = mobs.reduce((a, m) => a + (m.def || 0), 0) / mobs.length;
  const golpes = (z.min * 60) / (ATTACK_MS / 1000);                      // golpes posibles en el tiempo
  const dmgReal = Math.max(1, inc.poder - defMedia);
  let kills = Math.floor(golpes / Math.max(1, Math.ceil(vidaMedia / dmgReal)) * INC_RENDIMIENTO);
  // riesgo: si vas flojo, volvés herido y con menos botín
  const ratio = inc.poder / z.poderRec;
  let herido = 0, aviso = "";
  if (ratio < 0.5) { kills = 0; herido = Math.round(G.hpMax * 0.35); aviso = "Te superaron: volviste sin botín."; }
  else if (ratio < 1) { kills = Math.floor(kills * ratio); herido = Math.round(G.hpMax * 0.2); aviso = "Ibas justo de poder: volviste herido y con menos botín."; }
  // estamina y durabilidad: lo mismo que costaría pelear
  const costoStam = z.mobs.reduce((a, k) => a + stamCosto(k), 0) / z.mobs.length * kills;
  const stamDisp = (G.stam == null ? stamMax() : G.stam);
  if (costoStam > stamDisp) { kills = Math.floor(kills * (stamDisp / Math.max(1, costoStam))); aviso = (aviso ? aviso + " " : "") + "Se te acabó la estamina a mitad de camino."; }
  G.stam = Math.max(0, stamDisp - Math.round(Math.min(costoStam, stamDisp)));
  /* 18/8 (auditoría) — ACÁ ESTABA LA INVERSIÓN DEL DISEÑO.
     `INC_RENDIMIENTO = 0.7` promete que jugar a mano rinde MÁS que mandar la incursión. Pero el
     arma se gastaba 1 punto POR MUERTE en la incursión y 1 punto POR GOLPE peleando (forest.js:411)
     — y un demonio son 12 golpes. Resultado medido: por punto de estamina el clic rendía 1,7 veces
     lo que rendía jugar, o sea justo al revés de lo que dice la constante. Con las 3 incursiones
     diarias eran ~19.700 de plata por tres clics.
     Ahora la incursión gasta los MISMOS golpes que habría costado pelear. El 0,7 vuelve a ser lo
     único que separa una cosa de la otra, que es lo que se quiso desde el principio. */
  const w = G.weapons[inc.arma];
  if (w) {
    const golpesPorMob = Math.max(1, Math.ceil(vidaMedia / dmgReal));
    w.dur = Math.max(0, w.dur - Math.min(kills * golpesPorMob, w.dur));
  }
  // botín y XP con las tablas del bestiario
  const botin = {}; let xp = 0;
  for (let i = 0; i < kills; i++) {
    const m = mobs[Math.floor(Math.random() * mobs.length)];
    xp += m.xp;
    const loot = rollLoot(m);
    for (const k in loot) botin[k] = (botin[k] || 0) + loot[k];
  }
  // la plata es MONEDA, no un recurso de la bolsa: si entraba por tryAddRes se perdía (bug)
  if (botin.plata) { G.plata += botin.plata; }
  for (const k in botin) { if (k === "plata") continue; if (!tryAddRes(k, botin[k])) { botin[k] = 0; } }
  if (kills) { addXp(armSkillKey(ARM_DEF[inc.arma].tipo), Math.round(xp)); addCombatXp(Math.round(xp)); }
  if (herido) { G.hp = Math.max(1, G.hp - herido); }
  z.mobs.forEach(() => {});
  const partes = Object.keys(botin).filter(k => botin[k] > 0).map(k => "+" + botin[k] + " " + (RES_LABEL[k] || (CROP_DEF[k] && CROP_DEF[k].label) || k));
  G.incursion = null;
  const resumen = "Incursión a " + z.label + ": venciste " + kills + " criatura(s)" + (partes.length ? " · " + partes.join(" · ") : " · sin botín") + (xp ? " · +" + fmt(Math.round(xp)) + " XP" : "");
  log(resumen + (aviso ? " " + aviso : ""), kills ? "gold" : "bad");
  toast(kills ? "¡Volviste con " + kills + " victorias!" : "Volviste sin nada");
  if (kills && window.celebrate) celebrate({ title: "¡" + kills + " victorias!", sub: "Incursión a " + z.label, reward: partes.join(" · ") });
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshIncursion === "function" && isOpen("ov-incursion")) refreshIncursion();
  if (typeof saveFarm === "function") saveFarm(true);
  return { kills, botin, xp, herido, aviso };
}
function incTick() { if (incActiva() && nowMs() >= G.incursion.endAt) incResolver(); }

// ---- ENTRENAMIENTO OFFLINE DEL DUMMY ("detallitos (1)" punto 9) ----
// Dejás al granjero entrenando y al volver se cuenta el tiempo que pasó: XP del arma equipada.
var DUMMY_OFF_XP_H = 60;      // XP por hora de entrenamiento
var DUMMY_OFF_MAX_H = 8;      // tope de horas que acumula
// El primer MINUTO no cuenta (9/8). Antes el entrenamiento arrancaba a contar en el instante
// del clic, así que se podía clic → salir → cobrar → repetir, y sacar XP a puñados sin esperar
// nada. Ahora hay que dejarlo entrenando de verdad: hasta el minuto, no paga.
var DUMMY_OFF_ESPERA_MS = 60000;
function dummyEntrenando() { return !!(G.dummyTrain && G.dummyTrain.desde); }
// cuánto tiempo lleva entrenando que SÍ cuenta (0 mientras no pasó el minuto de espera)
function dummyMsUtiles() {
  if (!dummyEntrenando()) return 0;
  return Math.max(0, nowMs() - G.dummyTrain.desde - DUMMY_OFF_ESPERA_MS);
}
function dummyIniciar() {
  const aid = armaEq();
  if (!aid || ARM_DEF[aid].tipo === "arco") { toast("Equipá un arma cuerpo a cuerpo para entrenar"); return; }
  G.dummyTrain = { desde: nowMs(), arma: aid };
  if (typeof openOv === "function") openOv("ov-entrenando");   // tapa el juego: entrenar no es gratis
  log("Dejaste al granjero entrenando en el dummy. El primer minuto no cuenta; de ahí en más cobrás la XP del tiempo que pase, hasta " + DUMMY_OFF_MAX_H + " h.", "good");
  toast("Entrenando…");
  if (typeof saveFarm === "function") saveFarm(true);
}
function dummyCobrar() {
  if (!dummyEntrenando()) return null;
  const t = G.dummyTrain, horas = Math.min(DUMMY_OFF_MAX_H, dummyMsUtiles() / 3600000);
  const aid = ARM_DEF[t.arma] ? t.arma : armaEq();
  G.dummyTrain = null;
  if (!aid || horas <= 0) { toast("Tiene que entrenar al menos un minuto"); return null; }
  const xp = Math.round(horas * DUMMY_OFF_XP_H);
  const sk = armSkillKey(ARM_DEF[aid].tipo);
  addXp(sk, xp);
  log("Entrenamiento terminado: " + fmtDur(horas * 3600000) + " → +" + fmt(xp) + " XP de " + SKILL_NAME[sk] + ".", "gold");
  toast("+" + fmt(xp) + " XP de " + SKILL_NAME[sk]);
  if (typeof saveFarm === "function") saveFarm(true);
  return xp;
}

// ============ ADORNOS DE LA GRANJA (10/8, doc del diseñador) =======================
// Cosas para decorar: no dan ninguna ventaja, son para que la granja se vea linda y después
// poder hacer eventos de "la más bonita". Se compran en la Tienda, quedan en la bolsa de
// adornos y se colocan en la granja. El arte va en la Fase 6: por ahora se dibujan por código.
const DECO_ORDER = ["valla", "flores", "farol", "banco", "espantapajaros", "fuente", "estatua", "arbolito",
                    "espantapajaros_oro", "farolito"];   // los dos últimos NO se compran: salen del cofre
const DECO_DEF = {
  valla:          { label: "Valla de madera",   plata: 120,   golden: 0,  ds: "Un tramo de cerca para separar zonas." },
  flores:         { label: "Cantero de flores", plata: 200,   golden: 0,  ds: "Un cantero con flores de temporada." },
  farol:          { label: "Farol",             plata: 450,   golden: 0,  ds: "Da un aire de pueblo al camino." },
  banco:          { label: "Banco de plaza",    plata: 700,   golden: 0,  ds: "Para sentarse a mirar los cultivos." },
  espantapajaros: { label: "Espantapájaros",    plata: 1200,  golden: 0,  ds: "Clásico de granja. No espanta nada, es decorativo." },
  fuente:         { label: "Fuente de piedra",  plata: 4000,  golden: 0,  ds: "El centro de una granja ordenada." },
  estatua:        { label: "Estatua dorada",    plata: 0,     golden: 60, ds: "Para presumir. Se paga en $Golden." },
  arbolito:       { label: "Cerezo en flor",    plata: 0,     golden: 90, ds: "Un árbol ornamental. No se puede talar." },
  // 10/8: los dos adornos del COFRE DE LOGIN. No se venden: caen del cofre de 7 días y por eso
  // no aparecen en la Tienda. Antes eran una línea de texto en la lista de cosméticos y nada más.
  espantapajaros_oro: { label: "Espantapájaros dorado", cofre: 1, plata: 0, golden: 0, ds: "Coleccionable del cofre de login. No se compra." },
  farolito:           { label: "Farolito de luciérnagas", cofre: 1, plata: 0, golden: 0, ds: "Coleccionable del cofre de login. De noche titila." },
};
// alto en pantalla de cada adorno, en píxeles (el tile mide 42). El ancho sale solo,
// respetando la proporción del sprite. Con esto un farol no queda del porte de un árbol.
var DECO_ALTO = {
  valla: 24, flores: 24, farol: 56, banco: 26,
  espantapajaros: 48, fuente: 42, estatua: 36, arbolito: 46,   // fixs.docx #4 (11/8): fuente 30→42 y farol 40→56 (+40%)
  espantapajaros_oro: 48, farolito: 40,
};
var DECO_MAX = 40;   // cuántos adornos se pueden tener colocados a la vez
function decoTengo(id) { G.decoBolsa = G.decoBolsa || {}; return G.decoBolsa[id] || 0; }
function decoPuestos() { return (G.decos || []).length; }
function comprarDeco(id) {
  const d = DECO_DEF[id]; if (!d) return;
  if (d.cofre) { toast("Ese solo sale del cofre de login"); return; }   // no tiene precio: no se puede comprar
  if (G.tuto && !G.tuto.done) { toast("🎯 Los adornos se abren al terminar el tutorial — seguí el objetivo de arriba"); return; }   // embudo (13/8)
  if (d.plata && G.plata < d.plata) { toast("Te falta plata (" + fmt(d.plata) + ")"); return; }
  if (d.golden && G.golden < d.golden) { toast("Te falta $Golden (" + d.golden + ")"); return; }
  if (d.plata && typeof tutoGuardia === "function" && !tutoGuardia("plata", d.plata, "comprar adornos")) return;   // guardia del tutorial (12/8)
  if (d.plata) G.plata -= d.plata;
  if (d.golden) G.golden -= d.golden;
  G.decoBolsa = G.decoBolsa || {};
  G.decoBolsa[id] = (G.decoBolsa[id] || 0) + 1;
  log("Compraste " + d.label + ". Está en tu bolsa: colocalo desde el modo edición de la granja.", "gold");
  toast("+1 " + d.label + " — en tu bolsa (✏️ modo edición para ponerlo)");
  refreshHud(); if (typeof refreshMarket === "function" && isOpen("ov-market")) refreshMarket();
  if (typeof saveFarm === "function") saveFarm(true);
}
// coloca uno en la granja (lo llama la escena, que sabe dónde hay lugar)
function decoColocar(id, col, row) {
  if (decoTengo(id) <= 0) { toast("No te queda ninguno"); return false; }
  if (decoPuestos() >= DECO_MAX) { toast("Ya tenés " + DECO_MAX + " adornos puestos (el tope)"); return false; }
  G.decoBolsa[id]--;
  G.decos = G.decos || [];
  G.decos.push({ id, col, row });
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}
function decoSacar(i) {   // lo levanta y vuelve a la bolsa de adornos
  const d = (G.decos || [])[i]; if (!d) return false;
  G.decos.splice(i, 1);
  G.decoBolsa = G.decoBolsa || {};
  G.decoBolsa[d.id] = (G.decoBolsa[d.id] || 0) + 1;
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}

// ============ PARCELAS: llegan con las expansiones Y se compran con plata ==========
// 20/8 (dirección): "las parcelas se den con las expansiones, y sumado a eso que se consigan
// con plata. Lo de $Golden lo dejamos para cuando tenga sentido venderlo así" — o sea, en plata.
// El botón de $Golden se quitó de la tienda; si el token cobra valor, el precio se derivaría
// de GOLDEN_EN_PLATA como todo lo que cobre $Golden.
// 16/8 (auditoría F): tipo de cambio ÚNICO del juego. Antes cada sistema tenía el suyo
// (900 para parcelas, 3 para el kit de emergencia): 300× de diferencia. Todo lo que cobre
// $Golden se expresa desde acá.
var GOLDEN_EN_PLATA = 500;
// TOPE 60 (Discord del diseñador 10/8): "12 es muy poco, que compre la gente a placer".
// Las primeras 12 son la grilla de siempre; de la 13 a la 60 cada una nace en una celda
// libre y se acomoda desde el modo edición, como cualquier objeto.
var PLOT_MAX = 60;
// fix #17 del diseñador (11/8): la parcela comprada NO se tira sola al suelo — queda
// "pendiente" (plotsOwned > GF.PLOTS.length) y se coloca con clic desde el modo edición.
function parcelasPendientes() { return Math.max(0, (G.plotsOwned || 2) - GF.PLOTS.length); }
function parcelaColocar(col, row) {   // la llama la escena con la celda que eligió el jugador
  if (parcelasPendientes() <= 0) return false;
  G.layoutPlots = G.layoutPlots || {};
  G.layoutPlots[GF.PLOTS.length] = { col, row };   // la escena la levanta de acá
  GF.ocupCambio();
  if (typeof saveFarm === "function") saveFarm(true);
  return true;   // 18/8: sin telón — la escena la dibuja en vivo (colocarRegaloEnVivo)
}
function comprarParcela() {
  if ((G.plotsOwned || 2) >= PLOT_MAX) { toast("Ya tenés las " + PLOT_MAX + " parcelas"); return; }
  if (G.tuto && !G.tuto.done) { toast("🎯 Durante el tutorial alcanzan las parcelas que tenés — seguí el objetivo"); return; }   // embudo (13/8)
  {
    const c = plotUnlockCost();
    if (G.plata < c) { toast("Te falta plata (" + fmt(c) + ")"); return; }
    if (typeof tutoGuardia === "function" && !tutoGuardia("plata", c, "comprar parcelas")) return;   // guardia del tutorial (12/8)
    G.plata -= c;
  }
  G.plotsCompradas = (G.plotsCompradas || 0) + 1;   // el precio de la próxima sube por ESTA compra, no por las expansiones
  G.plotsOwned = Math.min(PLOT_MAX, (G.plotsOwned || 2) + 1);
  log("Desbloqueaste una parcela nueva. Ahora tenés " + G.plotsOwned + ".", "gold");
  if (G.plotsOwned > GF.PLOTS.length) {   // la 13 en adelante: se coloca a mano (#17)
    toast("¡Parcela nueva! Está en tu zona de edición: ✏️ ponela donde quieras");
    if (typeof syncEditDeco === "function") syncEditDeco();   // refresca el botón "Poner parcela"
  } else {
    toast("¡Parcela nueva!");
    if (window.farmScene && window.farmScene.refreshPlotLocks) { try { window.farmScene.refreshPlotLocks(); } catch (e) {} }
  }
  refreshHud(); if (typeof refreshMarket === "function" && isOpen("ov-market")) refreshMarket();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ============ GOD HAND: el cropper que siembra solo (10/8) =========================
// Se compra una vez con $Golden y queda para siempre. Mientras lo tengas, al volver al juego
// las parcelas que quedaron VACÍAS aparecen ya sembradas con la semilla que tenías elegida,
// gastando esas semillas, y el crecimiento cuenta desde que te fuiste — no desde ahora.
// No cosecha: cosechar sigue siendo tuyo. Solo te ahorra el paso aburrido.
var GODHAND_GOLDEN = 500;
function tengoGodHand() { return !!G.godHand; }
function comprarGodHand() {
  if (tengoGodHand()) { toast("Ya tenés la GOD HAND"); return; }
  if (G.tuto && !G.tuto.done) { toast("🎯 La GOD HAND se abre al terminar el tutorial — seguí el objetivo de arriba"); return; }   // embudo (13/8)
  if (G.golden < GODHAND_GOLDEN) { toast("Te falta $Golden (" + GODHAND_GOLDEN + ")"); return; }
  G.golden -= GODHAND_GOLDEN;
  G.godHand = true;
  log("Compraste la GOD HAND. De ahora en más, las parcelas vacías se siembran solas mientras no estás.", "gold");
  if (window.celebrate) celebrate({ title: "GOD HAND", sub: "Siembra automática", big: true, reward: "Las parcelas vacías se siembran solas" });
  refreshHud(); if (typeof refreshMarket === "function" && isOpen("ov-market")) refreshMarket();
  if (typeof saveFarm === "function") saveFarm(true);
}
/* ---- GOD HAND 2.0 (fixs.docx #19, 11/8): el cropper NFT completo -----------------
   Ya no siembra "lo que tengas elegido" y listo: tiene SU PROPIO inventario de 6
   espacios (50 semillas cada uno, 300 en total) y mientras no estás hace el ciclo
   entero en tus parcelas vacías: SIEMBRA → COSECHA → RESIEMBRA, y al volver te
   entrega todo lo producido junto. Cobra en plata por hora trabajada: la primera
   sale GODHAND_PLATA_HORA y cada una que sigue un 10% más. Trabaja hasta 24 h. */
var GODHAND_SLOTS = 6, GODHAND_CAP_SLOT = 50;            // 6 × 50 = 300 semillas
var GODHAND_PLATA_HORA = 100;                            // la primera hora
var GODHAND_SUBA_HORA = 1.10;                            // cada hora sale 10% más que la anterior
var GODHAND_MAX_H = 24;                                  // tope de trabajo por ausencia
function godHandInv() { if (!Array.isArray(G.ghInv) || G.ghInv.length !== GODHAND_SLOTS) G.ghInv = Array.from({ length: GODHAND_SLOTS }, () => null); return G.ghInv; }
function godHandTotal() { return godHandInv().reduce((a, s) => a + (s ? s.n : 0), 0); }
function godHandCostoHoras(h) { let c = 0, p = GODHAND_PLATA_HORA; for (let i = 0; i < h; i++) { c += Math.round(p); p *= GODHAND_SUBA_HORA; } return c; }
function godHandCargar(slot, key) {   // pasa semillas de tu bolsa al puño (hasta llenar el espacio)
  const inv = godHandInv(); if (slot < 0 || slot >= GODHAND_SLOTS || !CROP_DEF[key]) return;
  const s = inv[slot];
  if (s && s.key !== key && s.n > 0) { toast("Ese espacio ya tiene " + CROP_DEF[s.key].label); return; }
  const cabe = GODHAND_CAP_SLOT - (s ? s.n : 0), hay = Math.floor(G.seeds[key] || 0);
  const n = Math.min(cabe, hay);
  if (n <= 0) { toast(hay <= 0 ? "No tenés semillas de " + CROP_DEF[key].label : "Ese espacio está lleno"); return; }
  G.seeds[key] -= n;
  inv[slot] = { key, n: (s ? s.n : 0) + n };
  toast("+" + n + " " + CROP_DEF[key].label + " al GOD HAND");
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshGodHand === "function" && isOpen("ov-godhand")) refreshGodHand();
  if (typeof saveFarm === "function") saveFarm(true);
}
function godHandVaciar(slot) {   // devuelve las semillas del espacio a tu bolsa
  const inv = godHandInv(), s = inv[slot]; if (!s || !s.n) return;
  G.seeds[s.key] = (G.seeds[s.key] || 0) + s.n;
  inv[slot] = null;
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshGodHand === "function" && isOpen("ov-godhand")) refreshGodHand();
  if (typeof saveFarm === "function") saveFarm(true);
}
// La corre main.js al entrar, con los milisegundos que estuviste afuera.
function godHandSembrar(msAusente) {
  if (!tengoGodHand() || !Array.isArray(G.plots)) return 0;
  const inv = godHandInv();
  if (!godHandTotal()) return 0;
  const owned = Math.max(2, Math.min(GF.PLOTS.length, G.plotsOwned || 2));
  const libres = [];
  for (let i = 0; i < owned; i++) { const p = G.plots[i]; if (!p || p.state === "dry") libres.push(i); }
  if (!libres.length) return 0;
  const horasFuera = Math.min(GODHAND_MAX_H, Math.max(0, msAusente || 0) / 3600000);
  if (horasFuera < 0.02) return 0;
  const desde = nowMs() - Math.max(0, msAusente || 0);
  const prod = {}, usado = {};
  let horasTrabajadas = 0, ciclos = 0;
  for (const i of libres) {
    let t = horasFuera;   // horas de ausencia disponibles en ESTA parcela
    while (true) {
      const slot = inv.find(s => s && s.n > 0 && CROP_DEF[s.key]);
      if (!slot) break;
      const ghoras = (CROP_DEF[slot.key].grow * (typeof cdMult === "function" ? cdMult() : 1)) / 3600;
      if (ghoras <= t) {   // le da el tiempo: cosecha completa y sigue
        t -= ghoras; slot.n--; usado[slot.key] = (usado[slot.key] || 0) + 1; ciclos++;
        const n = Math.max(1, CROP_DEF[slot.key].yield || 1);   // 18/8: la cantidad ya no se multiplica
        prod[slot.key] = (prod[slot.key] || 0) + n;
        horasTrabajadas = Math.max(horasTrabajadas, horasFuera - t);
      } else {   // no llega a otra cosecha: deja la parcela SEMBRADA creciendo desde ese momento
        slot.n--; usado[slot.key] = (usado[slot.key] || 0) + 1;
        const dur = CROP_DEF[slot.key].grow * 1000 * (typeof cdMult === "function" ? cdMult() : 1);
        const t0 = desde + (horasFuera - t) * 3600000;
        G.plots[i] = { state: "growing", cropKey: slot.key, readyAt: t0 + dur, growTotal: dur, witherAt: 0 };
        horasTrabajadas = horasFuera;
        break;
      }
    }
  }
  if (!ciclos && !Object.keys(usado).length) return 0;
  // lo cosechado entra directo (los buffs de yield del momento ya se aplicaron por cosecha)
  for (const k in prod) G.res[k] = (G.res[k] || 0) + prod[k];
  // el sueldo: por hora trabajada, cada una más cara que la anterior
  const horas = Math.max(1, Math.ceil(horasTrabajadas));
  const costo = Math.min(G.plata, godHandCostoHoras(horas));
  G.plata -= costo;
  const detalle = Object.keys(prod).map(k => "+" + prod[k] + " " + CROP_DEF[k].label).join(" · ");
  log("GOD HAND trabajó " + horas + " h mientras no estabas: " + ciclos + " cosecha(s)" + (detalle ? " — " + detalle : "") +
      ". Cobró " + fmt(costo) + " de plata. Semillas restantes: " + godHandTotal() + "/300.", "gold");
  if (window.celebrate && ciclos) celebrate({ title: "GOD HAND", sub: horas + " h de trabajo", big: false, reward: detalle || (ciclos + " cosechas") });
  if (typeof saveFarm === "function") saveFarm(true);
  if (typeof syncSlots === "function") syncSlots();
  return ciclos;
}

// ============ LA ZONA NEGRA, PARTIDA EN MAPAS (10/8, doc del diseñador) ============
// Antes era UN solo bosque con todos los monstruos repartidos por profundidad: la rata al
// lado del dragón. Ahora son cuatro mapas encadenados, cada uno con SU familia de bichos,
// su piso y su nivel de entrada. Se pasa de uno al otro por teleports, y para volver a la
// granja siempre se sale por la izquierda del primero.
//
//   pantano  →  piedra  →  fuego  →  guarida (el jefe)
//
// Cada mapa dice qué mobs viven ahí y con qué densidad. `x0` y `x1` son la franja del mapa
// (0 = entrada, 1 = fondo) donde puede aparecer ese bicho, y el número es cuántos hay.
const ZONA_ORDER = ["pantano", "piedra", "fuego", "guarida"];
const ZONA_DEF = {
  pantano: {
    label: "Pantano", lvl: 1,
    ds: "Agua estancada y bichos chicos. Por acá se empieza.",
    piso: [0x2f4a20, 0x2a431c], mata: 0x223a16, hierba: 0x3a5527,
    arboles: 28,
    mobs: [["rata", 0.08, 0.40, 4], ["murcielago", 0.20, 0.62, 4], ["larva", 0.35, 0.90, 4]],
  },
  piedra: {
    label: "Cañón de Piedra", lvl: 10,
    ds: "Roca pelada y cosas que sí pegan. Traé algo mejor que la espada de madera.",
    piso: [0x3b3a33, 0x35342e], mata: 0x2a2924, hierba: 0x4a4838,
    arboles: 14,
    mobs: [["baba", 0.08, 0.35, 3], ["arana", 0.20, 0.55, 3], ["goblin", 0.35, 0.70, 3],
           ["orco", 0.50, 0.85, 3], ["lancero", 0.65, 0.92, 2]],
  },
  fuego: {
    label: "Grietas de Fuego", lvl: 22,
    ds: "El suelo está caliente. Acá abajo se saca lo que vale de verdad.",
    piso: [0x4a2a20, 0x42251c], mata: 0x33170f, hierba: 0x6b3a22,
    arboles: 8,
    mobs: [["esqueleto", 0.08, 0.40, 3], ["golem", 0.25, 0.60, 3], ["hombre_lobo", 0.40, 0.75, 3],
           ["guerrero", 0.55, 0.88, 3], ["troll", 0.70, 0.94, 2]],
  },
  guarida: {
    label: "Guarida del Dragón", lvl: 35, clan: true,
    ds: "Antes del jefe hay una guardia de orcos. El dragón NO se hace solo.",
    piso: [0x2a2030, 0x241b2a], mata: 0x1a1420, hierba: 0x3d2f4a,
    arboles: 4,
    // guardia de orcos ADELANTE, el jefe al fondo
    mobs: [["guerrero", 0.10, 0.35, 4], ["lancero", 0.20, 0.45, 3], ["orco", 0.15, 0.50, 4],
           ["ogro", 0.45, 0.65, 2], ["espectro", 0.55, 0.72, 2], ["demonio", 0.62, 0.78, 2],
           ["dragon", 0.90, 0.96, 1]],
  },
};
function zonaActual() { return ZONA_DEF[GF.zona] ? GF.zona : "pantano"; }
function zonaSig(k) { const i = ZONA_ORDER.indexOf(k || zonaActual()); return i >= 0 ? ZONA_ORDER[i + 1] || null : null; }
function zonaAnt(k) { const i = ZONA_ORDER.indexOf(k || zonaActual()); return i > 0 ? ZONA_ORDER[i - 1] : null; }
// ¿tengo nivel de Combate para entrar? (el del doc: cada mapa pide más)
function zonaPuedeEntrar(k) {
  const z = ZONA_DEF[k]; if (!z) return false;
  const lvl = (typeof combatInfo === "function") ? combatInfo().lvl : 1;
  return lvl >= z.lvl;
}
// hasta dónde llegó el jugador: los teleports solo llevan a lo ya visitado o al siguiente
function zonaMarcarVisitada(k) {
  G.zonasVistas = G.zonasVistas || ["pantano"];
  if (k && G.zonasVistas.indexOf(k) < 0) { G.zonasVistas.push(k); if (typeof saveFarm === "function") saveFarm(true); }
}

// ---- ASALTO AL DRAGÓN: los números (10/8) ----
// El jefe del asalto NO es el dragón suelto del mapa: tiene su propia vida, compartida por
// todo el clan y guardada en Supabase. Estos números son los que ve la ventana de Clan.
var RAID_MIN_MIEMBROS = 3;    // cuántos hacen falta para abrir un asalto
var RAID_HP = 60000;          // vida compartida del Dragón (entre 3 son 20.000 cada uno)
var RAID_HORAS = 48;          // cuánto dura abierto
// botín COMPLETO del jefe: cada uno cobra su porción según el daño que aportó
var RAID_BOTIN = { plata: 12000, esencia_oscura: 40, diamante: 6, netherita: 2 };

// ---- ESENCIA OSCURA: el recurso que SOLO sale en la Zona Negra ----
// El doc pide "el nuevo recurso que se farmea solo en zona negra". No se compra, no se
// cultiva y no lo dan los animales: la única forma de tenerlo es bajar y pelear. Cada mapa
// suelta más que el anterior.
RES_LABEL.esencia_oscura = "Esencia oscura";
if (typeof RES_EMOJI !== "undefined") RES_EMOJI.esencia_oscura = "🌑";
var ESENCIA_POR_ZONA = { pantano: 0.10, piedra: 0.22, fuego: 0.40, guarida: 0.75 };
// se tira por cada monstruo vencido; devuelve cuánta cayó (0 casi siempre en el pantano)
// fixs.docx #1 (11/8): la esencia oscura la dan SOLO los mobs de nivel 10 a 12
// (araña y goblin hoy). Antes era por zona y caía de cualquier bicho de esa zona.
function rollEsencia(zona, esBoss, lvlMob) {
  if (!(lvlMob >= 10 && lvlMob <= 12)) return 0;
  const p = (ESENCIA_POR_ZONA[zona] || 0);
  let n = Math.floor(p);
  if (Math.random() < (p - n)) n++;
  return n;
}

// ============ VIAJE A LA ZONA NEGRA: enfriamiento + resumen (10/8) ==================
// Antes se entraba y salía de la Zona Negra sin ninguna fricción, y al volver no quedaba
// registro de qué habías sacado: el botín aparecía diluido en la bolsa. Ahora:
//   · al entrar se saca una FOTO del estado (recursos, plata, XP de combate, muertes)
//   · al volver se compara contra esa foto y sale un cuadro con lo que trajiste
//   · y arranca un enfriamiento antes de poder volver a entrar
var ZONA_CD_MIN = 3;          // minutos de descanso entre viaje y viaje
function zonaCdLeft() { return Math.max(0, (G.zonaCdHasta || 0) - nowMs()); }
function zonaMatados() {
  const m = (G.stats && G.stats.matar) || {};
  return Object.keys(m).reduce((s, k) => s + (m[k] || 0), 0);
}
/* 18/8 (auditoría) — el enfriamiento se fijaba SOLO en zonaSalir(), que se llama al salir
   caminando o al ser derrotado. Un F5 dentro de la Zona Negra siempre cae en la granja, así que
   el jugador farmeaba, recargaba en vez de salir, y volvía SIN enfriamiento y sin resumen del
   viaje — con el viaje además colgado en el guardado. Es el mismo patrón que el de los nodos:
   entrar y salir son dos cosas que tienen que ir juntas y no lo estaban.
   Ahora el enfriamiento se paga AL ENTRAR: recargar ya no lo puentea. */
function zonaEntrar() {
  G.zonaCdHasta = nowMs() + ZONA_CD_MIN * 60000;
  const res = {};
  for (const k in G.res) res[k] = G.res[k] || 0;
  G.zonaViaje = { t: nowMs(), res, plata: G.plata || 0, golden: G.golden || 0,
                  combatXp: G.combatXp || 0, matados: zonaMatados(), hp: G.hp };
}
// devuelve el resumen del viaje (y lo cierra). null si no había viaje abierto.
function zonaSalir(derrotado) {
  const v = G.zonaViaje; G.zonaViaje = null;
  G.zonaCdHasta = nowMs() + ZONA_CD_MIN * 60000;
  if (!v) return null;
  const gan = {};
  for (const k in G.res) { const d = (G.res[k] || 0) - (v.res[k] || 0); if (d > 0) gan[k] = d; }
  return {
    min: Math.max(0, (nowMs() - v.t) / 60000),
    res: gan,
    plata: Math.max(0, (G.plata || 0) - v.plata),
    golden: Math.max(0, (G.golden || 0) - v.golden),
    xp: Math.max(0, (G.combatXp || 0) - v.combatXp),
    matados: Math.max(0, zonaMatados() - v.matados),
    derrotado: !!derrotado,
  };
}

// ================= EL ALTAR DE OFRENDAS ("2das mejoras", 4/8) =================
// Entregás recursos → se QUEMAN (salen del juego) → ganás Puntos de Ofrenda.
// El pozo del airdrop es FIJO y se reparte PROPORCIONAL: entregar más no crea más token,
// solo cambia tu porción. Nunca "X recurso = Y tokens" a tasa fija (esa es la impresora que hunde el precio).
var OFRENDA_POZO = 1000000;   // pozo fijo de $Golden reservado para el airdrop (referencia, editable)
const OFRENDA_PTS = {
  madera: 1, piedra: 1,
  bronce: 3, hierro: 5, oro: 10, diamante: 30, netherita: 120,
  papa: 1, zanahoria: 2, cebolla: 4, calabacin: 6, repollo: 10,
  calabaza: 15, brocoli: 25, girasol: 35, trigo: 50, maiz: 80,
};
const OFRENDA_ORDER = ["madera","piedra","bronce","hierro","oro","diamante","netherita",
  "papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz"];
function ofrendaPuntos() { return Math.floor(G.ofrendaPts || 0); }
function ofrendaValor(k) { return OFRENDA_PTS[k] || 0; }
function ofrendar(k, n) {
  n = Math.max(1, Math.floor(n || 1));
  if (!(G.built && G.built.ofrendas)) { toast("Primero construí el Altar de Ofrendas"); return; }
  const pts = ofrendaValor(k); if (!pts) { toast("Ese recurso no se puede ofrendar"); return; }
  const tengo = Math.floor(G.res[k] || 0);
  if (tengo < n) { toast("No tenés " + n + " de " + (RES_LABEL[k] || k)); return; }
  G.res[k] -= n;                      // se QUEMAN: no vuelven al juego
  const gana = pts * n;
  G.ofrendaPts = ofrendaPuntos() + gana;
  G.ofrendaLog = (G.ofrendaLog || 0) + n;
  statAdd("ofrendar", k, n);
  log("Ofrendaste " + n + " de " + (RES_LABEL[k] || k) + " → +" + fmt(gana) + " Puntos de Ofrenda (total " + fmt(ofrendaPuntos()) + ").", "gold");
  toast("+" + fmt(gana) + " puntos");
  if (window.celebrate && gana >= 500) celebrate({ title: "+" + fmt(gana), sub: "Puntos de Ofrenda", reward: "Total: " + fmt(ofrendaPuntos()) });
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshOfrendas === "function" && isOpen("ov-ofrendas")) refreshOfrendas();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ================= LA CURTIDURÍA: LAS 20 PIEZAS DE ARMADURA ("2das mejoras", 4/8) =================
// 4 sets × 5 piezas. Se craftean con el material del animal + plata (la pesada además pide hierro).
// Piezas sueltas = defensa parcial · set completo = bono de identidad.
const ARMOR_SLOTS = ["yelmo", "pecho", "pantalones", "botas", "guantes"];
const ARMOR_SLOT_LABEL = { yelmo:"Yelmo", pecho:"Pecho", pantalones:"Pantalones", botas:"Botas", guantes:"Guantes" };
const ARMOR_SETS = {
  fibra:    { label:"Armadura de Fibra",    animal:"alpaca", mat:"fibra",    tipo:"ligera",
    bono:{ txt:"+15% vel. ataque + 12% evasión", atkSpd:15, evade:12 },
    piezas:{ yelmo:{mat:2,plata:30,def:3}, pecho:{mat:4,plata:60,def:5}, pantalones:{mat:3,plata:45,def:4}, botas:{mat:2,plata:25,def:2}, guantes:{mat:1,plata:20,def:1} } },
  piel:     { label:"Armadura de Piel",     animal:"conejo", mat:"pelaje",   tipo:"vitalidad",
    bono:{ txt:"+2 HP/s de regeneración + 12% vel. de farmeo", regen:2, farm:12 },
    piezas:{ yelmo:{mat:2,plata:35,def:3}, pecho:{mat:5,plata:70,def:6}, pantalones:{mat:4,plata:55,def:5}, botas:{mat:2,plata:30,def:2}, guantes:{mat:2,plata:25,def:2} } },
  cuero:    { label:"Armadura de Cuero",    animal:"toro",   mat:"cuero",    tipo:"equilibrada",
    bono:{ txt:"+40 de vida máxima + 8% de defensa", hpmax:40, defPct:8 },
    piezas:{ yelmo:{mat:3,plata:55,def:5}, pecho:{mat:5,plata:100,def:8}, pantalones:{mat:4,plata:80,def:6}, botas:{mat:2,plata:40,def:3}, guantes:{mat:2,plata:35,def:3} } },
  colmillo: { label:"Armadura de Colmillo", animal:"jabali", mat:"colmillo", tipo:"pesada",
    bono:{ txt:"+20% de defensa y +10% de daño (−5% de velocidad)", defPct:20, dmgPct:10, spd:-5 },
    piezas:{ yelmo:{mat:2,hierro:5,plata:120,def:8}, pecho:{mat:3,hierro:8,plata:200,def:12}, pantalones:{mat:2,hierro:6,plata:150,def:9}, botas:{mat:1,hierro:4,plata:80,def:5}, guantes:{mat:1,hierro:3,plata:70,def:4} } },
};
const ARMOR_ORDER = ["fibra", "piel", "cuero", "colmillo"];
function armorKey(set, pieza) { return "arm_" + set + "_" + pieza; }
function armorTiene(set, pieza) { return !!(G.armor && G.armor[armorKey(set, pieza)]); }
function armorPuestas(set) { return ARMOR_SLOTS.filter(pz => armorTiene(set, pz)).length; }
function armorSetCompleto(set) { return armorPuestas(set) === ARMOR_SLOTS.length; }
function armorEquipado(set) { return G.armorEq === set; }
// defensa: suma de las piezas del set EQUIPADO (más las piezas viejas de loot, que siguen valiendo)
function armorDefensa() {
  const set = G.armorEq; if (!set || !ARMOR_SETS[set]) return 0;
  let d = 0;
  ARMOR_SLOTS.forEach(pz => { if (armorTiene(set, pz)) d += ARMOR_SETS[set].piezas[pz].def; });
  return d;
}
function armorBono() { const set = G.armorEq; return (set && armorSetCompleto(set)) ? ARMOR_SETS[set].bono : null; }
function armorBonoVal(campo) { const b = armorBono(); return (b && b[campo]) || 0; }
// set de Fibra completo: velocidad de ataque y evasión (antes el set entero no hacía nada)
function atkSpdMult() { return 1 + ((typeof eqRunaVal === "function" ? eqRunaVal("veloz") : 0) + armorBonoVal("atkSpd")) / 100; }
function evadeChance() { return armorBonoVal("evade") / 100; }   // 0..1
function craftArmor(set, pieza) {
  const sd = ARMOR_SETS[set]; if (!sd) return;
  if (!(G.built && G.built.curtiduria)) { toast("Necesitás la Curtiduría"); return; }
  if (armorTiene(set, pieza)) { toast("Ya tenés esa pieza"); return; }
  const p = sd.piezas[pieza]; if (!p) return;
  const falta = [];
  if ((G.res[sd.mat] || 0) < p.mat) falta.push(p.mat + " " + RES_LABEL[sd.mat]);
  if (p.hierro && (G.res.hierro || 0) < p.hierro) falta.push(p.hierro + " Hierro");
  if (G.plata < p.plata) falta.push(p.plata + " de plata");
  if (falta.length) { toast("Te falta: " + falta.join(" · ")); return; }
  G.res[sd.mat] -= p.mat;
  if (p.hierro) G.res.hierro -= p.hierro;
  G.plata -= p.plata;
  G.armor = G.armor || {};
  G.armor[armorKey(set, pieza)] = true;
  if (!G.armorEq) G.armorEq = set;
  addXp("crafting", 12);
  const completo = armorSetCompleto(set);
  log("Crafteaste " + ARMOR_SLOT_LABEL[pieza] + " de " + sd.label + " (+" + p.def + " de defensa)." + (completo ? " ¡SET COMPLETO: " + sd.bono.txt + "!" : ""), "gold");
  if (completo && window.celebrate) celebrate({ title: "¡SET COMPLETO!", sub: sd.label, big: true, reward: sd.bono.txt });
  else toast(ARMOR_SLOT_LABEL[pieza] + " lista");
  applyCombatHp();
  refreshHud(); if (typeof refreshCurtiduria === "function" && isOpen("ov-curtiduria")) refreshCurtiduria();
  if (isOpen("ov-equip")) refreshEquip();
  if (typeof saveFarm === "function") saveFarm(true);
}
function equiparSet(set) {
  if (!ARMOR_SETS[set] || !armorPuestas(set)) { toast("Todavía no tenés piezas de ese set"); return; }
  G.armorEq = set;
  applyCombatHp(); refreshHud();
  log("Te pusiste la " + ARMOR_SETS[set].label + " (" + armorDefensa() + " de defensa" + (armorSetCompleto(set) ? " · " + ARMOR_SETS[set].bono.txt : "") + ").", "good");
  toast(ARMOR_SETS[set].label);
  if (typeof refreshCurtiduria === "function" && isOpen("ov-curtiduria")) refreshCurtiduria();
  if (isOpen("ov-equip")) refreshEquip();
  if (typeof saveFarm === "function") saveFarm();
}

// ================= EL ESTABLO: ANIMALES Y MATERIALES ("2das mejoras", 4/8) =================
// Comprás el animal con $Golden → lo alimentás con su cultivo preferido → sube la felicidad →
// produce material cada cierto tiempo (más y mejor si está feliz) → con eso se craftea la armadura.
RES_LABEL.fibra = "Fibra";       RES_EMOJI.fibra = "🧵";
RES_LABEL.pelaje = "Pelaje";     RES_EMOJI.pelaje = "🧶";
RES_LABEL.cuero = "Cuero";       RES_EMOJI.cuero = "🟫";
RES_LABEL.colmillo = "Colmillo"; RES_EMOJI.colmillo = "🦷";
const ANIMAL_ORDER = ["alpaca", "conejo", "toro", "jabali"];
const ANIMAL_DEF = {
  alpaca: { label:"Alpaca", emoji:"🦙", golden:40,  mat:"fibra",    come:["trigo"],              cicloH:12, porCiclo:2, armadura:"fibra" },
  conejo: { label:"Conejo", emoji:"🐰", golden:40,  mat:"pelaje",   come:["zanahoria","repollo"], cicloH:12, porCiclo:2, armadura:"piel" },
  toro:   { label:"Toro",   emoji:"🐂", golden:60,  mat:"cuero",    come:["trigo","maiz"],        cicloH:16, porCiclo:2, armadura:"cuero" },
  jabali: { label:"Jabalí", emoji:"🐗", golden:100, mat:"colmillo", come:["calabaza","maiz"],     cicloH:20, porCiclo:1, armadura:"colmillo" },
};
var ESTABLO_COST = { madera: 50, piedra: 30, oro: 10 };   // edificio (doc)
var FELIZ_POR_COMIDA = 15;      // (legado) lo que daba una ración antes de que la comida se anclara
/* ============ EL ESTABLO, ANCLADO (19/8) ==========================================
   Al ponerle precio en PLATA a los animales salió a la luz que nunca estuvieron anclados, y que
   el precio en $Golden lo tapaba: pagabas 20.000 de plata por una alpaca y a partir de ahí
   imprimía. Medido, con la comida más barata (una papa vale 2, y CUALQUIER cultivo alimenta):

       alpaca  50,0 plata/h     toro  42,5 plata/h     conejo 20,3     jabalí 22,0
       (el ancla es 20 · o sea que la alpaca valía dos animales y medio)

   Y había un segundo problema encima: como con felicidad 0 igual producen la mitad, a la alpaca y
   al toro les convenía que los DESCUIDARAS si les dabas trigo (68 plata/h de comida contra 25 de
   producir a media máquina). El juego premiaba maltratar al animal.

   Las dos cosas se arreglan con la misma idea que el resto del juego: derivar en vez de escribir.
     · Lo que produce por ciclo sale del ancla, no de un número a mano.
     · La felicidad que da un cultivo es PROPORCIONAL A SU VALOR, así que da igual con qué lo
       alimentes: mantenerlo a tope cuesta lo mismo por hora — y ese coste es exactamente lo que
       sobra por encima del ancla. Alimentar siempre gana; descuidarlo, nunca. */
var ANIMAL_BRUTO_H = 25;        // plata/hora que produce un animal a felicidad plena (20 del ancla + la comida)
function animalValorMat(k) {
  const d = ANIMAL_DEF[k]; if (!d) return 0;
  return (typeof priceOf === "function" ? priceOf(d.mat) : (PRICE[d.mat] || 0)) || 0;
}
function animalPorCiclo(k) {
  const d = ANIMAL_DEF[k]; if (!d) return 1;
  const v = animalValorMat(k); if (!v) return d.porCiclo || 1;
  return Math.max(1, Math.round(ANIMAL_BRUTO_H * d.cicloH / v));
}
function animalBrutoH(k) {
  const d = ANIMAL_DEF[k]; if (!d) return 0;
  return animalValorMat(k) * animalPorCiclo(k) / d.cicloH;
}
// lo que cuesta por hora tenerlo a 100 de felicidad: justo lo que produce por encima del ancla
function animalRacionH(k) { return Math.max(0.2, animalBrutoH(k) - 20); }
// cuánta felicidad da UNA unidad de un cultivo: proporcional a lo que vale ese cultivo
function felizDeComida(k, crop, preferido) {
  const cd = CROP_DEF[crop]; if (!cd) return FELIZ_COMIDA_GENERICA;
  const f = FELIZ_BAJA_H * cd.price / animalRacionH(k);
  /* Sin redondear: si esto devolviera enteros, una papa daría "1" en vez de 0,6 y alimentar con lo
     más barato saldría un 40% más barato que con lo bueno — el hueco por el que se cuelan los
     exploits. La felicidad se guarda con decimales y se REDONDEA AL MOSTRARLA. */
  return Math.max(0.01, Math.min(100, f * (preferido ? 1 : 0.75)));
}
var FELIZ_COMIDA_GENERICA = 8;  // Fixes.docx 14/8 #1: cualquier otro cultivo también alimenta, pero rinde menos
var FELIZ_BAJA_H = 1.5;         // cuánta felicidad pierde por hora sin comer
var FELIZ_MIN_PROD = 0.5;       // rendimiento mínimo con felicidad 0 (produce la mitad)
// ANIMALES REPETIDOS (10/8, pedido del diseñador). Antes cada tipo era UNO solo:
// G.animals[k] era un objeto y comprarAnimal rebotaba con "Ya tenés alpaca". Ahora
// G.animals[k] es una LISTA de bichos de ese tipo, y cada uno lleva su propia felicidad y su
// propio ciclo. Alimentar y recoger actúan sobre TODOS los del tipo de una: con 5 alpacas,
// cinco botones separados sería un castigo.
// Los guardados viejos (objeto suelto) se migran solos en save.js.
var ANIMAL_MAX = 5;        // cuántos se pueden tener de cada tipo
/* EL ESTABLO CRECE CON EL OFICIO (22/8, dirección — el hueco de Ganadería 4→8)
   La escalera abría animales en 1 · 4 · 8 · 12 y los niveles del medio no entregaban NADA:
   cuatro niveles a ciegas entre el conejo y el toro. La cura es la misma que las expansiones:
   derivar en vez de regalar. El tope de 5 por especie estaba regalado desde el día uno; ahora
   el CUPO TOTAL del establo sale del nivel — arrancás con 2 lugares y cada nivel de Ganadería
   suma uno, hasta el techo de 20 que ya existía (4 especies × 5). Así CADA nivel del oficio
   paga algo tangible, los tres huecos (2-3, 5-7, 9-11) se curan de un golpe, y el ancla ni se
   entera: más animales es más renta comprada con plata, igual que comprar parcelas.
   Nadie pierde lo que ya tenía: si un guardado viejo trae más animales que su cupo, el cupo es
   esa cantidad (se congela la compra hasta que el nivel lo alcance, no se confisca nada). */
var ESTABLO_CUPO_MAX = 20;
function animalesTotal() { let n = 0; for (const k in ANIMAL_DEF) n += animalCant(k); return n; }
function establoCupo() {
  const porNivel = Math.min(ESTABLO_CUPO_MAX, (typeof nivelOficio === "function" ? nivelOficio("ganaderia") : 1) + 1);
  return Math.max(porNivel, animalesTotal());
}
var ANIMAL_SUBE = 0.5;     // cada uno extra cuesta un 50% más que el anterior

function animalLista(k) {
  G.animals = G.animals || {};
  const v = G.animals[k];
  if (Array.isArray(v)) return v;
  // OJO: hay que GUARDAR la lista, no devolver una suelta. Devolviendo [] a secas, el push de
  // comprarAnimal caía en un array de descarte y la compra se perdía en silencio.
  G.animals[k] = v ? [v] : [];   // (v = guardado viejo, un solo bicho suelto)
  return G.animals[k];
}
function animalCant(k) { return animalLista(k).length; }
function animalDe(k) { return animalLista(k)[0] || null; }   // "¿tengo de este tipo?" (arma la armadura, el tutorial, etc.)
/* LOS ANIMALES SE COMPRAN CON PLATA (19/8, dirección) ===============================
   "Todo lo que la persona adquiera tiene que funcionar con plata. El $Golden lo veremos más
   adelante, porque no podemos determinar qué valor tendrá."
   El precio en $Golden se queda escrito en ANIMAL_DEF pero YA NO SE COBRA: cuando salga el token
   se decidirá la equivalencia y volverá a servir. Mientras tanto el precio sale del ancla, que es
   lo único que no depende del mercado:

       precio = 20 plata/hora × las horas que tarda en pagarse solo

   y las horas suben un escalón por animal (24, 48, 72, 96), igual que sube la escalera de la
   Ganadería. Cada animal EXTRA del mismo tipo sigue costando un 50% más (ANIMAL_SUBE), así que
   llenar el establo hasta el tope sigue siendo caro. */
var ANIMAL_PAGO_H = 24;      // horas de ancla que cuesta el PRIMER animal; el resto, un múltiplo
function animalPrecioBase(k) {
  const i = ANIMAL_ORDER.indexOf(k);
  return Math.round(20 * ANIMAL_PAGO_H * (Math.max(0, i) + 1));
}
function animalPrecio(k) {
  const d = ANIMAL_DEF[k]; if (!d) return 0;
  return Math.round(animalPrecioBase(k) * Math.pow(1 + ANIMAL_SUBE, animalCant(k)));
}
function animalFelizDe(a) {   // la felicidad baja sola con el tiempo
  if (!a) return 0;
  const h = (nowMs() - (a.comidoAt || a.desde || nowMs())) / 3600000;
  return Math.max(0, Math.min(100, Math.round((a.feliz || 0) - h * FELIZ_BAJA_H)));
}
// felicidad del tipo = promedio de los que tenés (es lo que muestra la ventana)
function animalFelicidad(k) {
  const l = animalLista(k); if (!l.length) return 0;
  return Math.round(l.reduce((s, a) => s + animalFelizDe(a), 0) / l.length);
}
function comprarAnimal(k) {
  /* 18/8 (dirección): la skill de GANADERÍA abre los animales. La alpaca desde el principio; el
     conejo, el toro y el jabalí según vas cuidando el establo. */
  if (typeof animalUnlocked === "function" && !animalUnlocked(k)) {
    toast("Necesitás Ganadería nivel " + animalNivelReq(k) + " para " + (ANIMAL_DEF[k] ? ANIMAL_DEF[k].label : k));
    return;
  }
  const d = ANIMAL_DEF[k]; if (!d) return;
  if (!(G.built && G.built.establo)) { toast("Primero construí el Establo"); return; }
  const tengo = animalCant(k);
  if (tengo >= ANIMAL_MAX) { toast("Ya tenés " + ANIMAL_MAX + " " + d.label.toLowerCase() + " (el tope)"); return; }
  /* 22/8: el cupo TOTAL sale del nivel de Ganadería (2 al arrancar, +1 por nivel, techo 20) */
  if (animalesTotal() >= establoCupo()) { toast("El establo está lleno (" + establoCupo() + " lugares) — Ganadería " + (nivelOficio("ganaderia") + 1) + " suma uno más"); return; }
  const precio = animalPrecio(k);
  if (G.plata < precio) { toast("Te falta plata (" + precio + ")"); return; }
  G.plata -= precio;
  animalLista(k).push({ desde: nowMs(), feliz: 50, comidoAt: nowMs(), prodAt: nowMs() });
  log("Compraste " + d.label + " por " + precio + " de plata (ahora tenés " + animalCant(k) + "). Alimentalo con " + d.come.map(c => CROP_DEF[c].label).join(" o ") + ".", "gold");
  toast("¡" + d.label + " en el Establo!");
  if (!tengo && window.celebrate) celebrate({ title: "¡" + d.label.toUpperCase() + "!", sub: "Establo", reward: "Desbloquea la armadura de " + d.mat });
  refreshHud(); if (typeof refreshEstablo === "function" && isOpen("ov-establo")) refreshEstablo();
  if (window.farmScene && window.farmScene.syncAnimales) { try { window.farmScene.syncAnimales(); } catch (e) {} }   // aparece en la granja en el acto
  if (typeof saveFarm === "function") saveFarm(true);
}
// alimenta a TODOS los de ese tipo, uno por cultivo, hasta donde alcance
function alimentarAnimal(k) {
  const d = ANIMAL_DEF[k], l = animalLista(k); if (!d || !l.length) return;
  let dados = 0, gastado = {};
  for (const a of l) {
    // Fixes.docx 14/8 #1: siempre se puede alimentar — su cultivo PREFERIDO da la felicidad
    // entera; si no hay, aceptan CUALQUIER cultivo por un poco menos (antes la alpaca solo
    // comía trigo, que es de nivel alto, y los bichos se morían de hambre sin remedio)
    let cultivo = d.come.find(c => (G.res[c] || 0) > 0), preferido = true;
    if (!cultivo) { cultivo = Object.keys(CROP_DEF).find(c => (G.res[c] || 0) > 0); preferido = false; }
    if (!cultivo) break;
    G.res[cultivo] -= 1; gastado[cultivo] = (gastado[cultivo] || 0) + 1;
    a.feliz = Math.min(100, animalFelizDe(a) + felizDeComida(k, cultivo, preferido));
    a.comidoAt = nowMs();
    statAdd("alimentar", k); dados++;
  }
  if (!dados) { toast("Necesitás algún cultivo — lo preferido de " + d.label + ": " + d.come.map(c => CROP_DEF[c].label).join(" o ")); return; }
  const qué = Object.keys(gastado).map(c => gastado[c] + " " + CROP_DEF[c].label).join(" + ");
  log("Alimentaste " + dados + " " + d.label + " con " + qué + ". Felicidad media: " + animalFelicidad(k) + "/100.", "good");
  toast(d.label + " · felicidad " + animalFelicidad(k));
  refreshHud(); if (typeof refreshEstablo === "function" && isOpen("ov-establo")) refreshEstablo();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm();
}
function animalListo(k) {   // ¿hay AL MENOS uno listo de este tipo?
  const d = ANIMAL_DEF[k]; if (!d) return false;
  return animalLista(k).some(a => nowMs() - (a.prodAt || 0) >= d.cicloH * 3600000);
}
// cuánto falta para el PRÓXIMO que va a estar listo
function animalFalta(k) {
  const d = ANIMAL_DEF[k], l = animalLista(k); if (!d || !l.length) return 0;
  return Math.min.apply(null, l.map(a => Math.max(0, d.cicloH * 3600000 - (nowMs() - (a.prodAt || 0)))));
}
function animalListos(k) {   // cuántos hay listos para cobrar
  const d = ANIMAL_DEF[k]; if (!d) return 0;
  return animalLista(k).filter(a => nowMs() - (a.prodAt || 0) >= d.cicloH * 3600000).length;
}
// cobra TODOS los que estén listos de ese tipo
function recogerAnimal(k) {
  const d = ANIMAL_DEF[k], l = animalLista(k); if (!d || !l.length) return;
  const listos = l.filter(a => nowMs() - (a.prodAt || 0) >= d.cicloH * 3600000);
  if (!listos.length) { toast("Todavía no produjo — faltan " + fmtDur(animalFalta(k))); return; }
  let total = 0;
  for (const a of listos) {
    const f = animalFelizDe(a);
    const n = Math.max(1, Math.round(animalPorCiclo(k) * (FELIZ_MIN_PROD + (1 - FELIZ_MIN_PROD) * f / 100)));   // feliz = ciclo completo
    if (!roomForRes(d.mat, total + n)) break;   // lo que no entra queda para el próximo viaje
    total += n; a.prodAt = nowMs();
  }
  if (!total) { bagFull("recoger " + RES_LABEL[d.mat]); return; }
  G.res[d.mat] = (G.res[d.mat] || 0) + total;
  addXp("ganaderia", XP_ANIMAL * listos.length);   // 18/8: los animales son Ganadería, no Cultivo
  log(d.label + " ×" + listos.length + " produjo " + total + " de " + RES_LABEL[d.mat] + " (felicidad media " + animalFelicidad(k) + "/100).", "gold");
  toast("+" + total + " " + RES_LABEL[d.mat]);
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshEstablo === "function" && isOpen("ov-establo")) refreshEstablo();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ================= ESTAMINA DE LA ZONA NEGRA ("2das mejoras", 4/8) =================
// Barra aparte de la vida, SOLO se gasta peleando en la Zona Negra. Le pone ritmo al combate
// y protege la economía de drops/carne/XP. Se recupera con el tiempo, comiendo y (con tope) con $Golden.
var STAM_BASE = 100;          // máximo a nivel 1 de Combate
var STAM_POR_NIVEL = 2;       // +2 de máximo por nivel de Combate
var STAM_TOPE = 250;          // tope duro del máximo
var STAM_REGEN_SEG = 180;     // 1 punto cada 3 min → de 0 a 100 en ~5 h
var STAM_GOLDEN = 5;          // $Golden por recarga completa
var STAM_RECARGAS_DIA = 3;    // tope diario de recargas premium (anti pay-to-win)
const STAM_COSTO = {          // costo por criatura (tabla del doc)
  rata: 4, murcielago: 4, larva: 4,
  baba: 6, babita: 3, arana: 6, goblin: 6, orco: 6, lancero: 6,
  esqueleto: 8, golem: 8, hombre_lobo: 8, guerrero: 8,
  troll: 10, ogro: 10,
  espectro: 12, demonio: 12,
  dragon: 20,
};
function stamMax() { return Math.min(STAM_TOPE, STAM_BASE + STAM_POR_NIVEL * (combatInfo().lvl - 1)); }
function stamCosto(key) { return STAM_COSTO[key] || 5; }
function stamTick() {   // 1 vez por segundo desde el HUD
  const mx = stamMax();
  if (G.stam == null) G.stam = mx;
  if (G.stam >= mx) { G.stamAcc = 0; return; }
  G.stamAcc = (G.stamAcc || 0) + 1;
  if (G.stamAcc >= STAM_REGEN_SEG) { G.stamAcc = 0; G.stam = Math.min(mx, G.stam + 1); }
}
function stamAdd(n) { const mx = stamMax(); G.stam = Math.max(0, Math.min(mx, (G.stam == null ? mx : G.stam) + n)); refreshHud(); }
function stamGastar(n) {   // devuelve false si no alcanza
  const mx = stamMax();
  if (G.stam == null) G.stam = mx;
  if (G.stam < n) return false;
  G.stam -= n; refreshHud(); return true;
}
function stamRecargasHoy() {
  const hoy = dayStamp(0);   // día LOCAL (antes era UTC: los contadores se reseteaban a las 21 h en Argentina)
  if (!G.stamRec || G.stamRec.date !== hoy) G.stamRec = { date: hoy, n: 0 };
  return G.stamRec;
}
function stamRecargar() {   // recarga premium con $Golden, con tope diario
  const r = stamRecargasHoy();
  if (r.n >= STAM_RECARGAS_DIA) { toast("Ya usaste las " + STAM_RECARGAS_DIA + " recargas de hoy"); return; }
  if (G.golden < STAM_GOLDEN) { toast("Te falta $Golden (" + STAM_GOLDEN + ")"); return; }
  G.golden -= STAM_GOLDEN; r.n++; G.stam = stamMax(); G.stamAcc = 0;
  log("Recargaste la estamina por " + STAM_GOLDEN + " $Golden (" + r.n + "/" + STAM_RECARGAS_DIA + " hoy).", "gold");
  toast("¡Estamina al máximo!");
  refreshHud(); if (typeof saveFarm === "function") saveFarm();
}

// ================= ALTAR DE RUNAS (doc maestro 2/8, estilo Silkroad) =================
// Eje 1: mejora del arma +1..+15 (lotería con % claro). Eje 2: runas de atributo en sockets.
var ALTAR_BREAK = 30;   // % de ROTURA al fallar +11..+15 SIN Runa de Protección (editable)
var UPG = [null,   // índice = nivel al que se intenta subir
  { ex:100, exP:100, dmg:8,   rp:1,  plata:10 },   { ex:100, exP:100, dmg:16,  rp:1,  plata:25 },
  { ex:95,  exP:100, dmg:25,  rp:1,  plata:50 },   { ex:90,  exP:100, dmg:34,  rp:2,  plata:90 },
  { ex:85,  exP:95,  dmg:44,  rp:2,  plata:150 },  { ex:75,  exP:85,  dmg:54,  rp:2,  plata:250 },
  { ex:65,  exP:75,  dmg:66,  rp:3,  plata:400 },  { ex:55,  exP:65,  dmg:78,  rp:3,  plata:600 },
  { ex:45,  exP:55,  dmg:92,  rp:4,  plata:900 },  { ex:38,  exP:48,  dmg:107, rp:4,  plata:1300 },
  { ex:30,  exP:40,  dmg:124, rp:5,  plata:1900 }, { ex:22,  exP:32,  dmg:143, rp:6,  plata:2700 },
  { ex:15,  exP:25,  dmg:164, rp:7,  plata:3800 }, { ex:9,   exP:19,  dmg:188, rp:8,  plata:5200 },
  { ex:5,   exP:15,  dmg:215, rp:10, plata:8000 },
];
function upgDmg(plus) { return plus > 0 && UPG[plus] ? UPG[plus].dmg : 0; }
function socketsOpen(plus) { return plus >= 12 ? 3 : plus >= 7 ? 2 : plus >= 3 ? 1 : 0; }   // ranuras: +3 / +7 / +12
var RUNA_ORO_TOPE = 10;   // 18/8: cuántos $Golden por día puede dar la Runa Dorada como mucho
const RUNA_ORDER = ["furia", "vamp", "perfo", "veloz", "sangrante", "guardiana", "fortuna", "dorada"];
const RUNA_TIPOS = {
  furia:     { label:"Runa de Furia",       buff:"Prob. de crítico",          vals:[3,5,8,12,18],     uni:"%" },
  vamp:      { label:"Runa Vampírica",      buff:"Robo de vida",              vals:[2,3,5,7,10],      uni:"%" },
  perfo:     { label:"Runa de Perforación", buff:"Ignora defensa",            vals:[8,14,20,28,40],   uni:"%" },
  veloz:     { label:"Runa Veloz",          buff:"Vel. de ataque",            vals:[4,7,10,14,20],    uni:"%" },
  sangrante: { label:"Runa Sangrante",      buff:"Sangrado al golpear (3 s)", vals:[1,2,3,4,6],       uni:"/s" },
  guardiana: { label:"Runa Guardiana",      buff:"Vida máxima",               vals:[15,30,50,80,120], uni:"" },
  fortuna:   { label:"Runa de Fortuna",     buff:"Suerte en drops",           vals:[5,8,12,18,25],    uni:"%" },
  dorada:    { label:"Runa Dorada",         buff:"$Golden por kill",          vals:[3,5,8,12,18],     uni:"%" },
};
const RUNA_ROMAN = ["", "I", "II", "III", "IV", "V"];
function runaKey(t, r) { return "runa_" + t + "_" + r; }
function runaVal(t, r) { return (RUNA_TIPOS[t] && RUNA_TIPOS[t].vals[r - 1]) || 0; }
function runaLabel(t, r) { return ((RUNA_TIPOS[t] && RUNA_TIPOS[t].label) || "Runa") + " " + (RUNA_ROMAN[r] || r); }   // tipo desconocido: no rompe el Altar
RUNA_ORDER.forEach(t => { for (let r = 1; r <= 5; r++) { RES_LABEL[runaKey(t, r)] = runaLabel(t, r); RES_EMOJI[runaKey(t, r)] = "🔹"; } });
RES_LABEL.esencia_runica = "Esencia rúnica";      RES_EMOJI.esencia_runica = "🔮";
RES_LABEL.runa_poder = "Runa de Poder";           RES_EMOJI.runa_poder = "💠";
RES_LABEL.polvo_suerte = "Polvo de Suerte";       RES_EMOJI.polvo_suerte = "✨";
RES_LABEL.runa_proteccion = "Runa de Protección"; RES_EMOJI.runa_proteccion = "🛡️";
const ALTAR_CRAFT = {   // crafteo de materiales en el Altar
  runa_poder:      { cost:{ esencia_runica:3, piedra:5 }, plata:20 },
  polvo_suerte:    { cost:{ esencia_runica:2 },           plata:30 },
  runa_proteccion: { cost:{ esencia_runica:5, oro:3 },    golden:5 },
};
var RUNA_CRAFT = { cost:{ esencia_runica:4, bronce:2 }, plata:50 };   // runa de atributo (rareza I)
const FUSE_GOLD = [0, 0, 2, 8, 25];   // $Golden para fusionar 3 runas → rareza II/III/IV/V
function armPlus(id) { return (G.weapons[id] && G.weapons[id].plus) || 0; }
function armSockets(id) { const w = G.weapons[id]; if (!w) return {}; w.sockets = w.sockets || {}; return w.sockets; }
function eqRunaVal(tipo) {   // valor total de un tipo de runa en el arma EQUIPADA
  const id = armaEq(); if (!id) return 0;
  const sk = armSockets(id); let v = 0;
  for (const s in sk) if (sk[s] && sk[s].t === tipo) v += runaVal(sk[s].t, sk[s].r);
  return v;
}
function altarRefresh() { if (typeof refreshAltar === "function" && isOpen("ov-altar")) refreshAltar(); refreshHud(); if (isOpen("ov-inv")) refreshInv(); if (typeof syncSlots === "function") syncSlots(); }
function upgradeWeapon(id, usarPolvo, usarProt) {
  const w = G.weapons[id]; if (!w || !ARM_DEF[id]) return;
  const next = (w.plus || 0) + 1;
  if (next > 15) { toast("Ya está en +15: el tope de tope"); return; }
  const u = UPG[next];
  const need = { runa_poder: u.rp };
  if (usarPolvo) need.polvo_suerte = 1;
  if (usarProt) need.runa_proteccion = 1;
  for (const k in need) if ((G.res[k] || 0) < need[k]) { toast("Te falta " + RES_LABEL[k] + " (" + need[k] + ")"); return; }
  if (G.plata < u.plata) { toast("Te falta plata (" + u.plata + ")"); return; }
  for (const k in need) G.res[k] -= need[k];
  G.plata -= u.plata;
  const chance = Math.min(100, (usarPolvo ? u.exP : u.ex) + altarBonoExito());   // el Altar nivel 2 suma puntos de éxito
  if (Math.random() * 100 < chance) {
    w.plus = next;
    const abre = socketsOpen(next) > socketsOpen(next - 1) ? " ¡Se abrió una ranura de runa!" : "";
    log("¡" + ARM_DEF[id].label + " subió a +" + next + "! Daño acumulado +" + u.dmg + "%." + abre, "gold");
    if (window.celebrate && (next >= 10 || abre)) celebrate({ title: "¡+" + next + "!", sub: ARM_DEF[id].label, big: next >= 10, reward: "+" + u.dmg + "% de daño" + abre });
    else toast("¡+" + next + "! (" + chance + "% de éxito)");
    if (window.sfx) sfx("level");
    if (typeof tutoEvent === "function") tutoEvent("upgrade");
  } else {
    if (next >= 11 && !usarProt && Math.random() * 100 < ALTAR_BREAK) {   // rotura: solo sin protección (el jugador ELIGE el riesgo)
      delete G.weapons[id];
      if (G.gear.arma === id) G.gear.arma = null;
      log("El intento a +" + next + " falló y " + ARM_DEF[id].label + " se ROMPIÓ. (Sin Runa de Protección)", "bad");
      toast("¡El arma se rompió!");
      applyCombatHp(); altarRefresh(); if (typeof saveFarm === "function") saveFarm(true);
      return;
    }
    if (next >= 6) { w.plus = Math.max(0, (w.plus || 0) - 1); log("Falló el intento a +" + next + " (" + chance + "%): el arma baja a +" + w.plus + ".", "bad"); toast("Falló: baja a +" + w.plus); }
    else { log("Falló el intento a +" + next + " (" + chance + "%). Solo se perdieron los materiales.", "bad"); toast("Falló el intento"); }
  }
  altarRefresh(); if (typeof saveFarm === "function") saveFarm(true);
}
function craftAltarItem(id) {
  const c = ALTAR_CRAFT[id]; if (!c) return;
  if (!canAfford(c.cost)) { toast("Te faltan materiales"); return; }
  if (c.plata && G.plata < c.plata) { toast("Te falta plata (" + c.plata + ")"); return; }
  if (c.golden && G.golden < c.golden) { toast("Te falta $Golden (" + c.golden + ")"); return; }
  payCost(c.cost); if (c.plata) G.plata -= c.plata; if (c.golden) G.golden -= c.golden;
  G.res[id] = (G.res[id] || 0) + 1;
  addXp("crafting", 6); log("Crafteaste 1 " + RES_LABEL[id] + ".", "good"); toast("+1 " + RES_LABEL[id]);
  altarRefresh();
}
function craftRunaI(tipo) {
  if (!RUNA_TIPOS[tipo]) return;
  if (!canAfford(RUNA_CRAFT.cost)) { toast("Te faltan materiales"); return; }
  if (G.plata < RUNA_CRAFT.plata) { toast("Te falta plata (" + RUNA_CRAFT.plata + ")"); return; }
  payCost(RUNA_CRAFT.cost); G.plata -= RUNA_CRAFT.plata;
  const k = runaKey(tipo, 1); G.res[k] = (G.res[k] || 0) + 1;
  addXp("crafting", 8); log("Crafteaste 1 " + runaLabel(tipo, 1) + ".", "good"); toast("+1 " + runaLabel(tipo, 1));
  altarRefresh();
}
function fuseRuna(tipo, r) {   // 3 runas de rareza r → 1 de rareza r+1 (muy Silkroad)
  if (r >= 5) return;
  const k = runaKey(tipo, r), gold = FUSE_GOLD[r];
  if ((G.res[k] || 0) < 3) { toast("Necesitás 3 " + runaLabel(tipo, r)); return; }
  if (gold && G.golden < gold) { toast("Te falta $Golden (" + gold + ")"); return; }
  G.res[k] -= 3; if (gold) G.golden -= gold;
  const k2 = runaKey(tipo, r + 1); G.res[k2] = (G.res[k2] || 0) + 1;
  addXp("crafting", 10); log("Fusionaste 3 " + runaLabel(tipo, r) + " en 1 " + runaLabel(tipo, r + 1) + ".", "gold"); toast("¡" + runaLabel(tipo, r + 1) + "!");
  altarRefresh();
}
function socketRuna(id, slot, tipo, r) {   // socketear DESTRUYE la runa anterior de esa ranura (doc)
  const w = G.weapons[id]; if (!w) return;
  if (slot > socketsOpen(w.plus || 0)) { toast("Esa ranura se abre a +" + (slot === 1 ? 3 : slot === 2 ? 7 : 12)); return; }
  const sk = armSockets(id);
  if (tipo === null) { sk[slot] = null; log("Vaciaste la ranura " + slot + " (la runa se destruyó).", "bad"); }
  else {
    const k = runaKey(tipo, r);
    if ((G.res[k] || 0) < 1) { toast("No tenés " + runaLabel(tipo, r)); return; }
    G.res[k] -= 1;
    if (sk[slot]) log("La " + runaLabel(sk[slot].t, sk[slot].r) + " anterior se destruyó al socketear encima.", "bad");
    sk[slot] = { t: tipo, r };
    log("Socketeaste " + runaLabel(tipo, r) + " (" + RUNA_TIPOS[tipo].buff + " +" + runaVal(tipo, r) + RUNA_TIPOS[tipo].uni + ").", "gold");
    toast("Runa socketeada");
    if (typeof tutoEvent === "function") tutoEvent("socket");
  }
  applyCombatHp();   // la Guardiana suma vida máxima
  altarRefresh(); if (typeof saveFarm === "function") saveFarm(true);
}

/* === ARMAS DOC MAESTRO 2/8: 4 tipos × 5 rarezas, daño aleatorio + buff por tipo ===
   Espada=Crítico (daño ×2) · Hacha=Perforación (ignora % def) · Mazo=Aturdir (el mob pierde su próximo golpe) · Arco=Sangrado (daño/s 3s, a distancia) */
const ARM_TIPOS = ["espada", "hacha", "mazo", "arco"];
const ARM_RAREZAS = ["madera", "piedra", "bronce", "oro", "diamante"];
const ARM_TIPO_DEF = {
  espada: { label: "Espada", buff: "crit",   buffLabel: "Crítico",     skill: "sword", sprite: "sword", primQ: 5, secQ: 3, repQ: 2, plata: [10, 25, 60, 140, 320] },
  hacha:  { label: "Hacha",  buff: "pierce", buffLabel: "Perforación", skill: "hacha", sprite: "axe",   primQ: 6, secQ: 3, repQ: 3, plata: [10, 30, 70, 170, 385] },
  mazo:   { label: "Mazo",   buff: "stun",   buffLabel: "Aturdir",     skill: "mazo",  sprite: "mazo", primQ: 8, secQ: 4, repQ: 4, plata: [15, 40, 90, 210, 480] },
  arco:   { label: "Arco",   buff: "bleed",  buffLabel: "Sangrado",    skill: "range", sprite: "bow",   primQ: 4, secQ: 2, repQ: 2, plata: [10, 20, 50, 110, 255] },
};
const ARM_MINMAX = {   // daño aleatorio min-max por tipo y rareza (tablas 15-18 del compendio)
  espada: [[3,5],[4,8],[7,11],[10,18],[16,26]],
  hacha:  [[4,6],[5,9],[8,12],[12,20],[18,30]],
  mazo:   [[4,6],[6,10],[9,15],[14,22],[20,34]],
  arco:   [[2,4],[3,5],[5,9],[8,12],[12,20]],
};
const ARM_BUFFVAL = { espada: [3,5,8,12,18], hacha: [20,30,40,55,70], mazo: [8,12,16,22,30], arco: [1,2,3,4,6] };
/* 18/8 — DURABILIDAD RE-DERIVADA con los relojes nuevos. Al acortar el árbol, la madera pasó a
   valer 12 y los minerales se quedaron en sus relojes de 8 a 24 h, así que el bronce pasó de valer
   6 veces una madera a valer 13. Con eso, reparar un arma de mineral se comía todo su margen.
   La palanca correcta acá es la DURABILIDAD (las armas sí la tienen; las herramientas siguen con
   un uso, que es la norma). Sale de igualar el costo por punto de daño en toda la escalera:
       dur = lo que repone x lo que vale / (0,15 x daño)
   Suavizada para que SUBA siempre — un arma mejor no puede durar menos. */
const ARM_DUR = [80, 100, 240, 270, 300];
const ARM_CDS = [3, 5, 8, 12, 18];   // enfriamiento de crafteo (s)
/* 18/8 (auditoría) — LA ESCALERA DE ARMAS ESTABA INVERTIDA, y este mapa era la causa.
   MEZCLABA materia prima (madera, piedra, diamante) con BARRAS, que valen 3 unidades del mineral
   (barra_bronce = 3 bronce, barra_oro = 3 oro). Consecuencia medida sobre el coste por punto de
   daño: 0,45 · 0,26 · 1,56 · 1,55 · 0,50. O sea que el bronce y el oro salían SEIS VECES más caros
   por punto de daño que la piedra, y la Espada de Piedra era el arma óptima en las cuatro zonas,
   incluida la Guarida a nivel 35. Todo el tramo medio de la progresión era un impuesto: subir de
   arma te empobrecía.
   Arreglo: todas las rarezas usan MATERIA PRIMA, la misma clase de cosa, y la cantidad a reparar
   sube por tier para que el coste por punto de daño quede plano. Las barras no se quedan sin uso:
   siguen siendo el material de FORJA (el arma nueva), que es donde tiene sentido pedir algo
   elaborado — reparar es reponer, no fabricar. */
const ARM_MAT = { madera: "madera", piedra: "piedra", bronce: "bronce", oro: "oro", diamante: "diamante" };
const ARM_MAT_FORJA = { madera: "madera", piedra: "piedra", bronce: "barra_bronce", oro: "barra_oro", diamante: "diamante" };
// cuánto se repone al reparar, por tier. Sale de igualar el coste por punto de daño (~0,45), que
// es el que tiene el arma de entrada: así subir de arma nunca es peor que quedarse.
const ARM_REP_MULT = [2, 3, 1, 1, 1];
const ARM_RAR_LABEL = { madera: "de Madera", piedra: "de Piedra", bronce: "de Bronce", oro: "de Oro", diamante: "de Diamante" };
const ARM_DEF = {};
ARM_TIPOS.forEach(tipo => ARM_RAREZAS.forEach((rar, i) => {
  const td = ARM_TIPO_DEF[tipo], cost = {};
  // FORJAR usa el material elaborado (barras donde las hay): fabricar pide algo trabajado
  cost[ARM_MAT_FORJA[rar]] = td.primQ;
  if (i > 0) cost[ARM_MAT_FORJA[ARM_RAREZAS[i - 1]]] = (cost[ARM_MAT_FORJA[ARM_RAREZAS[i - 1]]] || 0) + td.secQ;
  // REPARAR usa materia prima: reponer no es fabricar
  const repair = {}; repair[ARM_MAT[rar]] = td.repQ * (ARM_REP_MULT[i] || 1);
  ARM_DEF[tipo + "_" + rar] = { tipo, rareza: rar, ri: i, sprite: "arm_" + tipo + "_" + rar, label: td.label + " " + ARM_RAR_LABEL[rar],
    min: ARM_MINMAX[tipo][i][0], max: ARM_MINMAX[tipo][i][1], buffVal: ARM_BUFFVAL[tipo][i],
    dur: ARM_DUR[i], cost, plata: td.plata[i], cd: ARM_CDS[i], repair };
}));
const ARM_ORDER = [];
ARM_TIPOS.forEach(t => ARM_RAREZAS.forEach(r => ARM_ORDER.push(t + "_" + r)));

function armaEq() { const id = G.gear.arma; return (id && ARM_DEF[id] && G.weapons[id] && G.weapons[id].dur > 0) ? id : null; }
function armSkillKey(tipo) { return ARM_TIPO_DEF[tipo].skill; }
function armCdLeft(id) { return Math.max(0, ((G.armCd && G.armCd[id]) || 0) - nowMs()); }
/* EL PRIMER ESCALÓN DE UNA ESCALERA SIEMPRE ESTÁ ABIERTO (19/8, dirección).
   "La espada de madera es como la semilla de papa para el nivel 1 de Cultivo."
   La regla ya rige en todo el juego: la papa está en Cultivo 1, la piedra en Minería 1, el pez
   común en Pesca 1, la alpaca en Ganadería 1. La Espada de Madera es el primer escalón del
   combate y era la ÚNICA con una caja registradora delante: había que pagar la pestaña Armas
   (15 madera + 10 piedra + 300 de plata) para poder forjar un arma de 5 de madera. Medido, esas
   300 de plata son 5 horas de cultivo con tres parcelas — o sea que el sistema entero del combate,
   que es lo único del juego SIN enfriamiento y por tanto lo único que llena el tiempo muerto,
   quedaba cerrado el primer día.
   Ahora se forja en la Herrería desde el minuto uno. La pestaña Armas sigue costando lo mismo y
   sigue abriendo lo que de verdad justifica pagarla: los otros 19 modelos, de la Espada de Piedra
   para arriba, con sus cuatro tipos y sus buffs. */
var ARMA_ENTRADA = "espada_madera";
function craftWeapon(id) {
  const w = ARM_DEF[id]; if (!w) return;
  if (!G.armasUnlocked && id !== ARMA_ENTRADA) { toast("Desbloqueá la sección de Armas primero"); return; }
  if (typeof tutoPermite === "function" && !tutoPermite("craftarm")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(w.cost, w.plata, "forjar " + w.label)) return;   // guardia del tutorial (12/8)
  if (G.weapons[id]) { toast("Ya tenés " + w.label); return; }
  if (armCdLeft(id) > 0) { toast("La forja se enfría — " + fmtSecs(Math.ceil(armCdLeft(id) / 1000))); return; }
  if (!canAfford(w.cost)) { toast("Te faltan materiales"); return; }
  if (G.plata < w.plata) { toast("Te falta plata"); return; }
  payCost(w.cost); G.plata -= w.plata;
  G.weapons[id] = { dur: w.dur };
  G.armCd = G.armCd || {}; G.armCd[id] = nowMs() + w.cd * 1000;
  if (!G.gear.arma) G.gear.arma = id;
  addXp("crafting", 10 + w.ri * 4);
  log("Forjaste " + w.label + ".", "gold"); toast("¡" + w.label + "!"); forgeWork();
  if (typeof tutoEvent === "function") tutoEvent("craftarm");
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv(); refreshHud();
}
function repairWeapon(id) {
  const w = ARM_DEF[id]; if (!w || !G.weapons[id]) return;
  if (G.weapons[id].dur >= w.dur) { toast("Ya está al 100%"); return; }
  if (!canAfford(w.repair)) { toast("Te faltan materiales para reparar"); return; }
  payCost(w.repair); G.weapons[id].dur = w.dur;
  log("Reparaste " + w.label + " (100%).", "good"); toast("Reparada"); forgeWork(); refreshForge();
  if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-inv")) refreshInv();
}
function useWeapon(id) { if (G.weapons[id] && G.weapons[id].dur > 0) G.weapons[id].dur--; return G.weapons[id] ? G.weapons[id].dur : 0; }
// la tirada de un golpe (doc: Daño = máx(1; Ataque − Def efectiva); Ataque = tirada aleatoria + nivel de la skill del arma / 2)
function rollWeaponHit(defensa) {
  const id = armaEq(); if (!id) return null;
  const w = ARM_DEF[id], lvl = skillInfo(G.skills[armSkillKey(w.tipo)] || 0, armSkillKey(w.tipo)).lvl;
  let atk = w.min + Math.floor(Math.random() * (w.max - w.min + 1)) + Math.floor(lvl / 2);
  atk *= 1 + upgDmg(armPlus(id)) / 100;                       // Altar: mejora +1..+15 (daño acumulado)
  let defEf = defensa || 0;
  const out = { id, tipo: w.tipo, crit: false, stun: false, bleed: 0, vamp: eqRunaVal("vamp") };
  if (w.tipo === "hacha") defEf = defEf * (1 - w.buffVal / 100);
  defEf = defEf * (1 - eqRunaVal("perfo") / 100);             // Runa de Perforación
  const critCh = (w.tipo === "espada" ? w.buffVal : 0) + eqRunaVal("furia");   // Runa de Furia: crítico en cualquier arma
  if (critCh && Math.random() * 100 < critCh) { atk *= 2; out.crit = true; }
  if (w.tipo === "mazo" && Math.random() * 100 < w.buffVal) out.stun = true;
  if (w.tipo === "arco") out.bleed = w.buffVal;
  out.bleed = Math.max(out.bleed, eqRunaVal("sangrante"));    // Runa Sangrante: sangrado en cualquier arma
  out.dmg = Math.max(1, Math.round((atk - defEf) * dmgMult() * playerDmgOutMult()));   // buff de comida y maldición de Flaqueza
  return out;
}

// --- LEGADO (espada/arco viejos): queda para migración de guardados; ya no se craftea ---
const SWORD_COST = { bronce: 12 };   // 100% metal (feedback del diseñador: nada de madera)
const SWORD_WOOD_COST = { madera: 5 };
// daño del jugador — viernes (2): SOLO con arma equipada (sin arma no hay ataque, devuelve 0)
function swordDmg() {   // legado: >0 si hay un arma CUERPO A CUERPO equipada y sana (el daño real sale de rollWeaponHit)
  const id = armaEq(); if (!id) return 0;
  const w = ARM_DEF[id]; if (w.tipo === "arco") return 0;
  return Math.round((w.min + w.max) / 2) + Math.floor(skillInfo(G.skills[armSkillKey(w.tipo)] || 0, armSkillKey(w.tipo)).lvl / 2);
}

// --- arco y flechas (combate a distancia; usa la skill Arco) ---
const BOW_COST = { madera: 12, bronce: 2 };
const ARROW_COST = { madera: 2, piedra: 1 };   // craftea 10 flechas
function craftArrows() {
  if (!canAfford(ARROW_COST)) { toast("Te faltan materiales"); return; }
  payCost(ARROW_COST); G.res.flecha = (G.res.flecha || 0) + 10;   // van a la bolsa, NO se autoequipan (detalles jueves)
  addXp("crafting", 3);
  log("Crafteaste 10 flechas — están en tu bolsa; equipalas en el panel de Equipo.", "good"); toast("+10 flechas en la bolsa"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
// viernes (2): la pestaña Armas de la Herrería se desbloquea pagando
const ARMAS_UNLOCK_COST = { madera: 15, piedra: 10 }; var ARMAS_UNLOCK_PLATA = 300;   // 14/8 rebalance: era 20+20+1000 (~100 min de papa aún con 8 parcelas, medido)
function unlockArmas() {
  if (G.armasUnlocked) return;
  if (!canAfford(ARMAS_UNLOCK_COST)) { toast("Te faltan materiales"); return; }
  if (G.plata < ARMAS_UNLOCK_PLATA) { toast("Te falta plata"); return; }
  payCost(ARMAS_UNLOCK_COST); G.plata -= ARMAS_UNLOCK_PLATA; G.armasUnlocked = true;
  log("Desbloqueaste la pestaña Armas de la Herrería.", "gold"); toast("¡Armas desbloqueadas!");
  if (typeof tutoEvent === "function") tutoEvent("unlockarm");
  refreshForge(); refreshHud(); if (typeof saveFarm === "function") saveFarm();
}
// viernes (2): desbloqueo progresivo de árboles y piedras (3/9/27/81/100) — se paga por CANTIDAD ya abierta, el orden es libre
const NODE_UNLOCK_COSTS = [2, 4, 8, 16, 32];   // 15/8: con los relojes del diseñador, ampliar en paralelo ES el juego — desbloqueos al alcance
function treeUnlockCost() { return NODE_UNLOCK_COSTS[Math.min(NODE_UNLOCK_COSTS.length - 1, Math.max(0, (G.treesOpen || [0]).length - 1))]; }
function rockUnlockCost() { return NODE_UNLOCK_COSTS[Math.min(NODE_UNLOCK_COSTS.length - 1, Math.max(0, (G.rocksOpen || [0]).length - 1))]; }

// 12/8 (noche): las VETAS/PIEDRAS van sin fantasmas ni compra — todas a la vista y a
// todo color, y el freno es de NIVEL: al intentar picar una que todavía no corresponde,
// el juego te dice qué nivel de granja pide. Tabla por orden de aparición (números del
// diseñador; la 1ª siempre libre). Quien PAGÓ desbloqueos viejos los conserva.
// Los ÁRBOLES quedan con su sistema de siempre: retoño + desbloqueo pagando madera.
var NIVEL_ROCAS = [1, 1, 1]   // 15/8: la 2ª roca disponible desde el arranque;
function nodoNivelReq(o) { return NIVEL_ROCAS[Math.min(o.lockIdx || 0, NIVEL_ROCAS.length - 1)] || 1; }
// 16/8: los ÁRBOLES ganan su propia escalera de nivel, espejo de las rocas — con los
// relojes largos, cuántos nodos tenés activos ES la progresión. El pago en madera se
// mantiene (el retoño se "cultiva"), pero el retoño N recién se puede pagar al nivel N
// de la tabla. Anclada a los edificios: nivel 6 (Establo, 40 maderas) = hasta 5 árboles.
/* 18/8 (dirección): "las expansiones son lo único que añade nodos".
   La granja de arranque tiene TRES de cada, y a partir de ahí cada expansión trae 1 árbol y 1 roca
   EN SU PROPIO BLOQUE. El nivel de granja ya no reparte nodos: solo el bono de venta y el permiso
   para expandir. Estas tablas quedan con 3 entradas —los tres de arranque— y los otros tres
   objetos base del mapa simplemente no se abren nunca (objetoPresente los deja invisibles). */
var NIVEL_ARBOLES = [1, 1, 1];
function arbolNivelReq(o) { return NIVEL_ARBOLES[Math.min(o.lockIdx || 0, NIVEL_ARBOLES.length - 1)] || 1; }
function arbolBloqueado(o) {
  if (!o || o.type !== "tree" || !o.locked) return false;
  return G.level < arbolNivelReq(o);
}
// 16/8: regla ÚNICA de XP por recurso — XP = minutos del reloj del nodo (los cultivos ya
// la siguen: papa 9 min→9 XP … maíz 24 h→1440). Con los timers del diseñador cada golpe
// es escaso: la XP fija de la era de los 90 s (piedra 5 XP/2 h) dejaba Minería en ~80 días
// para nivel 5. Con esta regla, si el diseñador cambia un timer la XP se corrige sola.
function nodoXpMin(cdSeg) { return Math.max(1, Math.round(cdSeg / 60)); }
// 16/8: una roca está disponible SOLO si el jugador la reclamó del baúl. La tabla de niveles
// dejó de ser el candado y pasó a ser el CALENDARIO de entrega del regalo.
function nodoBloqueado(o) {
  if (!o || o.type !== "rock") return false;   // las vetas de mineral van por tier de pico
  /* 20/8 (dirección): "la expansión del nivel 3 me dio una piedra que al picarla dice que necesito
     granja nivel 1. Y soy nivel 3. Obviamente no va a funcionar."
     La roca que viene DENTRO de un bloque comprado no pertenece a la escalera de rocas: su peaje ya
     lo pagaste al comprar el terreno. Pero acá se la medía con la escalera igual, y salía mal por
     partida doble:
       · su número de orden es el 4º (farm.js cuenta todas las rocas), y rocksOpen solo tiene la 0
         → la daba por bloqueada;
       · y el nivel que anunciaba salía de NIVEL_ROCAS recortado al último índice, o sea 1 → «se
         habilita a granja nivel 1» siendo ya nivel 3. Un mensaje imposible de obedecer.
     Lo vi y lo deseché esta mañana, escribiendo en un test que las dos numeraciones «coinciden
     para las primeras N». Coinciden para las primeras; la expansión es la N+1.
     Un nodo que llegó con su terreno está abierto: ésa es la regla, y vive acá. */
  if (o.exp != null) return false;
  return !(G.rocksOpen || [0]).includes(o.lockIdx);
}
function canShoot() { const id = armaEq(); return !!(id && ARM_DEF[id].tipo === "arco" && G.gear.municion && (G.res.flecha || 0) > 0); }   // arco nuevo + flechas equipadas

// --- armaduras (dropean de los monstruos del Bosque; reducen el daño recibido) ---
const GEAR_DEF = {
  botas_cuero:    { slot:"botas",    label:"Botas de Cuero",    emoji:"🥾", def:1, sprite:"gear_botas_cuero" },
  casco_cuero:    { slot:"casco",    label:"Casco de Cuero",    emoji:"🪖", def:1, sprite:"gear_casco_cuero" },
  pechera_cuero:  { slot:"armadura", label:"Pechera de Cuero",  emoji:"🥋", def:2, sprite:"gear_pechera_cuero" },
  escudo_madera:  { slot:"escudo",   label:"Escudo de Madera",  emoji:"🛡️", def:1, sprite:"gear_escudo_madera" },
  casco_hierro:   { slot:"casco",    label:"Casco de Hierro",   emoji:"⛑️", def:2, sprite:"gear_casco_hierro" },
  escudo_hierro:  { slot:"escudo",   label:"Escudo de Hierro",  emoji:"🛡️", def:2, sprite:"gear_escudo_hierro" },
  pechera_hierro: { slot:"armadura", label:"Pechera de Hierro", emoji:"🛡️", def:3, sprite:"gear_pechera_hierro" },
};
function gearDefTotal() { let d = 0; for (const s in G.gear) { const g = G.gear[s]; if (g && GEAR_DEF[g]) d += GEAR_DEF[g].def; } return d + (typeof armorDefensa === "function" ? armorDefensa() : 0); }
// al lootear una pieza: se equipa si mejora el slot; si no, se vende sola
function gainGear(key) {
  const gd = GEAR_DEF[key]; if (!gd) return;
  const cur = G.gear[gd.slot];
  if (!cur || GEAR_DEF[cur].def < gd.def) {
    G.gear[gd.slot] = key;
    log("Equipaste " + gd.label + " (defensa +" + gd.def + ").", "gold"); toast("" + gd.label + " equipado");
  } else {
    const v = 5 + gd.def * 5; G.plata += v;
    log(gd.label + " repetido — vendido por " + v + " plata.", "good"); toast("+" + v + " (" + gd.label + ")");
  }
  if (isOpen("ov-equip")) refreshEquip(); refreshHud();
}

// --- cocina (en la Granja: platos que curan y dan buffs; usa carne/pescado) ---
// --- COCINA (doc maestro 2/8): 14 recetas de cultivos + las 3 clásicas de pescado/carne ---
// buff nuevo: { type, val } — val en % (o HP/s en regen, vida plana en hpmax); duración = DISH_BUFF_DUR
var DISH_BUFF_DUR = 300;   // 5 min (editable en el panel)
const RECIPE_ORDER = [
  "papa_asada", "pure_papa", "sopa_zanahoria", "ensalada_repollo", "calabacin_salteado",
  "pan_trigo", "salteado_brocoli", "crema_calabaza", "tortilla_maiz", "aceite_girasol",
  "guiso_campestre", "pan_maiz_trigo", "estofado_cosecha", "banquete_bosque",
  "pescado_asado", "estofado", "banquete"];
const RECIPE_DEF = {
  // 16/8 (auditoría E): las recetas simples ya no piden MADERA. La madera cuesta 6 plata de
  // producir (más un reloj de 1 h 30) y el plato se vendía a 5: cocinar destruía valor, y el
  // tutorial enseñaba a cocinar con la operación que más plata pierde. Las recetas grandes
  // (nivel 4+) la conservan: ahí el jugador ya tiene excedente y la madera es sumidero sano.
  papa_asada:         { label:"Papa Asada",             emoji:"🥔", sprite:"dish_papa_asada", res:{papa:1},                                                  lvl:1,  heal:10, buff:{type:"farm",    val:5},  cookS:180,  xp:8,  plata:5 },
  pure_papa:          { label:"Puré de Papa",           emoji:"🥣", sprite:"dish_pure_papa", res:{papa:2, cebolla:1},                                       lvl:2,  heal:13, buff:{type:"regen",   val:2},  cookS:240,  xp:10, plata:12 },
  sopa_zanahoria:     { label:"Sopa de Zanahoria",      emoji:"🍜", sprite:"dish_sopa_zanahoria", res:{zanahoria:2, cebolla:1},                                  lvl:2,  heal:15, buff:{type:"speed",   val:8},  cookS:240,  xp:10, plata:14 },
  ensalada_repollo:   { label:"Ensalada de Repollo",    emoji:"🥗", sprite:"dish_ensalada_repollo", res:{repollo:2, zanahoria:1},                                  lvl:3,  heal:17, buff:{type:"def",     val:6},  cookS:300, xp:14, plata:18 },
  calabacin_salteado: { label:"Calabacín Salteado",     emoji:"🥒", sprite:"dish_calabacin_salteado", res:{calabacin:2, cebolla:1},                                  lvl:3,  heal:18, buff:{type:"dmg",     val:6},  cookS:300, xp:14, plata:20 },
  pan_trigo:          { label:"Pan de Trigo",           emoji:"🍞", sprite:"dish_pan_trigo", res:{trigo:3, madera:2},                                       lvl:4,  heal:20, buff:{type:"cookxp",  val:10}, cookS:360, xp:18, plata:22 },
  salteado_brocoli:   { label:"Salteado de Brócoli",    emoji:"🥦", sprite:"dish_salteado_brocoli", res:{brocoli:2, calabacin:1, madera:2},                        lvl:5,  heal:23, buff:{type:"farm",    val:10}, cookS:360, xp:22, plata:28 },
  crema_calabaza:     { label:"Crema de Calabaza",      emoji:"🎃", sprite:"dish_crema_calabaza", res:{calabaza:2, cebolla:1, madera:2},                         lvl:5,  heal:25, buff:{type:"def",     val:10}, cookS:420, xp:24, plata:32 },
  tortilla_maiz:      { label:"Tortilla de Maíz",       emoji:"🌽", sprite:"dish_tortilla_maiz", res:{maiz:2, cebolla:1, madera:2},                             lvl:6,  heal:27, buff:{type:"dmg",     val:10}, cookS:420, xp:28, plata:38 },
  aceite_girasol:     { label:"Aceite de Girasol",      emoji:"🌻", sprite:"dish_aceite_girasol", res:{girasol:3, madera:2},                                     lvl:6,  heal:18, buff:{type:"luck",    val:10}, cookS:420, xp:26, plata:40 },
  guiso_campestre:    { label:"Guiso Campestre",        emoji:"🍲", sprite:"dish_guiso_campestre", res:{papa:1, zanahoria:1, repollo:1, cebolla:1, madera:3},     lvl:7,  heal:31, buff:{type:"combatxp",val:12}, cookS:480, xp:34, plata:55 },
  pan_maiz_trigo:     { label:"Pan de Maíz y Trigo",    emoji:"🥖", sprite:"dish_pan_maiz_trigo", res:{trigo:2, maiz:2, madera:3},                               lvl:8,  heal:34, buff:{type:"hpmax",   val:20}, cookS:480, xp:42, plata:80,  goldenP:1 },
  estofado_cosecha:   { label:"Estofado de la Cosecha", emoji:"🥘", sprite:"dish_estofado_cosecha", res:{calabaza:2, maiz:1, papa:1, zanahoria:1, madera:3},       lvl:9,  heal:37, buff:{type:"dmg",     val:15}, cookS:540, xp:52, plata:110, goldenP:2 },
  banquete_bosque:    { label:"Banquete del Bosque",    emoji:"🍱", sprite:"dish_banquete_bosque", res:{papa:1, zanahoria:1, repollo:1, brocoli:1, calabaza:1, madera:3}, lvl:10, heal:40, buff:{type:"feast", val:20}, cookS:600, xp:70, plata:180, goldenP:4 },
  // clásicas (siguen dándole uso al pescado y la carne)
  pescado_asado: { label:"Pescado asado", emoji:"🐟", sprite:"dish_pescado_asado", fish:{comun:1}, res:{}, lvl:1,   // 16/8: sin madera (auditoría E)
    /* 20/8 (dirección: "¿habías especificado que el yield era también al cosechar?"). No, y estos
       dos platos eran los únicos que seguían diciendo que sí. El 18/8 el bono dejó de multiplicar
       la CANTIDAD cosechada —con todos los cultivos dando 1 unidad, round(1 × 1,435) seguía siendo
       1 y el bono era invisible durante 33 niveles— y pasó a ser de PRECIO DE VENTA. La mecánica se
       cambió bien; las etiquetas de estos dos platos se quedaron en la versión vieja.
       El `type:"yield"` de dentro se queda como está: es la llave que lee ventaMult() y renombrarla
       obliga a tocar los guardados de quien tenga el buff activo. Lo que se corrige es lo que el
       jugador LEE, que es lo que estaba mintiendo. */
    heal:30, buff:{type:"yield",label:"Precio de venta +10%",mult:1.10,dur:90}, cookS:240, xp:8, plata:15,
    desc:"Cura 30 · Precio de venta +10% (1 min 30 s)" },
  /* CADA FUENTE DE COMIDA, SU RECETA DE NIVEL 1 (19/8, dirección: "el botín tiene que servir para
     algo"). La huerta tiene la Papa Asada y la laguna el Pescado asado, las dos en el nivel 1. La
     CAZA no tenía ninguna: su primera receta era este Estofado en Cocina 3, o sea a diez platos de
     distancia. Resultado medido: matabas bichos, traías carne y no podías hacer nada con ella
     durante días. Es la misma regla del primer escalón que puso la Espada de Madera fuera del
     peaje. Baja a nivel 1 y pide UNA carne — tres bichos del Pantano dan 0,72 de media, así que
     dos de carne era pedir nueve muertes para un plato. */
  estofado: { label:"Estofado de carne", emoji:"🍲", sprite:"dish_estofado", res:{carne:1, papa:1, madera:1}, lvl:1,
    heal:60, buff:{type:"cd",label:"Enfriamientos -15%",mult:0.85,dur:90}, cookS:300, xp:12, plata:30,
    desc:"Cura 60 · Enfriamientos -15% (1 min 30 s)" },
  banquete: { label:"Banquete del granjero", emoji:"🍗", sprite:"dish_banquete", fish:{raro:1}, res:{carne:2, calabaza:1, madera:1}, lvl:6,
    heal:9999, buff:{type:"yield",label:"Precio de venta +20%",mult:1.20,dur:180}, cookS:420, xp:25, plata:60,
    desc:"Cura TODA la vida · Precio de venta +20% (3 min)" },
};
// niveles de cocina 1-10 (tabla del doc, XP ACUMULADA por nivel) + maestría
var COOK_LVLS = [0, 0, 30, 80, 160, 300, 520, 850, 1300, 1900, 2700];
function cookLevelFromXp(xp) { let l = 1; for (let i = 2; i < COOK_LVLS.length; i++) if (xp >= COOK_LVLS[i]) l = i; return Math.min(10, l); }
function cookLevel() { return cookLevelFromXp(G.skills.cooking || 0); }
function cookPot(rlvl) { return Math.min(1.5, 1 + 0.02 * Math.max(0, cookLevel() - (rlvl || 1))); }   // Potencia = 1 + 2% por nivel sobre la receta, tope +50%
// ANTI "impresora de plata" (3/8): cocinar no puede valer más que sus ingredientes + un margen.
// Con COOK_PRICE_AUTO=1 el precio sale de lo que costó el plato, así el balance no se rompe
// aunque el diseñador cambie los precios de los cultivos. Con 0 manda la tabla del doc.
/* ============ LA PESCA, DERIVADA DEL ANCLA (18/8, dirección) =======================
   Medido: rendía 184 plata/h — el 921% del ancla. Un tiro medio pagaba 61 y cuesta 15 (una
   lombriz y una caña). Con la caña a 15 min, para rendir 20/h el tiro medio tiene que pagar 20.
   Los cuatro valores salen de ahí: escalera 1 : 4 : 12 : 40 entre rarezas, con el margen ×1,25
   de la cocina, y la esperanza cae clavada en 20,1.
   Y SE QUITAN LOS DOS CASOS ESPECIALES que eran la mitad del problema:
     · el común pagaba plata SUELTA además de dejarte el pez (cobraba dos veces)
     · el legendario imprimía 2 de ORO (560 de plata) — el 28% de todo lo que pagaba la pesca
   Ahora los cuatro son lo mismo: un ingrediente, con su valor. La rareza está en el valor, no en
   una regla aparte. */
var FISH_VALOR = { comun: 4, raro: 15, epico: 45, legendario: 151 };   // cuánto vale cada pez como ingrediente
var COOK_PRICE_AUTO = 1;     // 1 = precio calculado sobre ingredientes · 0 = precio fijo de la planilla
var COOK_MARGEN = 1.25;      // ganancia de cocinar sobre el valor de los ingredientes (+25%)
function dishValue(r) {      // cuánto valen los ingredientes de un plato
  let v = 0;
  if (r.res) for (const k in r.res) v += priceOf(k) * r.res[k];
  if (r.fish) for (const k in r.fish) v += (FISH_VALOR[k] || 25) * r.fish[k];
  return v;
}
function dishPrice(r) {      // precio base de venta (antes de la maestría)
  if (!COOK_PRICE_AUTO) return r.plata || 0;
  return Math.max(1, Math.round(dishValue(r) * COOK_MARGEN));
}
function dishBuffLabel(b, pot) {
  const v = Math.round((b.val || 0) * (pot || 1));
  switch (b.type) {
    case "farm": return "+" + v + "% vel. de farmeo";
    case "regen": return "regenera +" + v + " HP/s";
    case "speed": return "+" + v + "% vel. de movimiento";
    case "def": return "+" + v + "% defensa";
    case "dmg": return "+" + v + "% daño";
    case "cookxp": return "+" + v + "% XP de cocina";
    case "luck": return "+" + v + "% suerte en drops";
    case "combatxp": return "+" + v + "% XP de combate";
    case "hpmax": return "+" + v + " de vida máxima";
    case "stam": return "+" + v + " de estamina";
    case "feast": return "+" + v + "% daño, defensa y velocidad";
  }
  return b.label || "";
}
function dishDesc(r) { return r.desc || ("Cura " + r.heal + " HP · " + dishBuffLabel(r.buff, 1) + " (" + fmtSecs(DISH_BUFF_DUR) + ")"); }
function canCook(id) {
  const r = RECIPE_DEF[id]; if (!r) return false;
  if (r.lvl && cookLevel() < r.lvl) return false;   // receta bloqueada por nivel de cocina
  if (r.res) for (const k in r.res) if ((G.res[k] || 0) < r.res[k]) return false;
  if (r.fish) for (const k in r.fish) if ((G.fish[k] || 0) < r.fish[k]) return false;
  return true;
}
const COOK_MS = 180000;   // respaldo si una receta no trae tiempo propio (3 min)
// 3/8 (diseñador): los platos tardan MINUTOS y se pueden cocinar VARIOS a la vez (ollas en paralelo).
var COOK_SLOTS = 3;       // ollas simultáneas de la Cocina (editable en el panel)
function cookList() { if (!Array.isArray(G.cooking)) G.cooking = G.cooking ? [G.cooking] : []; return G.cooking; }
function cookSlots() { return COOK_SLOTS + (edif2("cocina") ? EDIF2_COCINA_OLLA : 0); }
function cookFree() { return Math.max(0, cookSlots() - cookList().length); }
function cook(id) {
  const r = RECIPE_DEF[id]; if (!r) return;
  if (typeof tutoPermite === "function" && !tutoPermite("cook")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (cookFree() <= 0) { toast("Las " + cookSlots() + " ollas están ocupadas"); return; }
  if (!canCook(id)) { toast("Te faltan ingredientes"); return; }
  if (!roomForDish(id)) { bagFull("cocinar " + r.label); return; }
  if (r.res) for (const k in r.res) G.res[k] -= r.res[k];
  if (r.fish) for (const k in r.fish) G.fish[k] -= r.fish[k];
  const ms = Math.max(1000, Math.round((r.cookS ? r.cookS * 1000 : COOK_MS) * cocinaFactor()));
  cookList().push({ id, endAt: nowMs() + ms, total: ms });
  log("Cocinando " + r.label + "… (" + fmtSecs(Math.round(ms / 1000)) + ")"); toast("Cocinando " + r.label);
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
  if (typeof saveFarm === "function") saveFarm();
}
// se llama cada segundo desde el HUD: cada olla que termina deja su plato en la bolsa
var _cocinando = false;   // candado anti-reentrada (ver abajo)
function checkCooking() {
  const lista = cookList();
  if (!lista.length) return;
  // CANDADO: dar el plato dispara XP y estadísticas, y eso vuelve a pasar por refreshHud(), que
  // llama de nuevo acá. Sin este candado se entraba en bucle infinito: la misma olla daba platos
  // una y otra vez hasta reventar la pila, y la partida quedaba con miles de platos y sin cargar.
  if (_cocinando) return;
  _cocinando = true;
  try {
    const t = nowMs(); let listos = 0;
    for (let i = lista.length - 1; i >= 0; i--) {
      if (t < lista[i].endAt) continue;
      const olla = lista[i];
      lista.splice(i, 1);          // PRIMERO se saca la olla, DESPUÉS se entrega: si algo vuelve
      listos++;                    // a entrar acá, esta olla ya no está y no se puede duplicar
      const r = RECIPE_DEF[olla.id];
      if (!r) continue;
      G.dishes = G.dishes || {};
      G.dishes[olla.id] = (G.dishes[olla.id] || 0) + 1;
      addXp("cooking", r.xp);
      log(r.emoji + " ¡" + r.label + " listo! Lo tenés en la bolsa.", "gold"); toast(r.emoji + " ¡" + r.label + " listo!");
      if (typeof tutoEvent === "function") tutoEvent("cook");
      statAdd("cocinar");
    }
    if (!listos) { if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking(); return; }
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
    if (typeof saveFarm === "function") saveFarm();
  } finally { _cocinando = false; }
}
// comer un plato de la bolsa (clic sobre el ítem)
function eatDish(id) {
  const r = RECIPE_DEF[id]; if (!r || !G.dishes || (G.dishes[id] || 0) <= 0) return;
  G.dishes[id]--;
  if (window.sfx) sfx("eat");
  G.hp = Math.min(G.hpMax, G.hp + r.heal);
  if (r.buff && r.buff.val != null) {   // recetas del doc: el buff escala con la maestría del cocinero
    const pot = cookPot(r.lvl), v = r.buff.type === "hpmax" ? Math.round(r.buff.val * pot) : Math.round(r.buff.val * pot * 10) / 10;   // vida máx. en enteros
    addBuff(r.buff.type, dishBuffLabel(r.buff, pot), v, DISH_BUFF_DUR);
    if (r.buff.type === "hpmax") buffTick();   // la vida extra entra ya mismo
  } else if (r.buff) addBuff(r.buff.type, r.buff.label, r.buff.mult, r.buff.dur);
  { const st = { guiso_campestre: 20, estofado_cosecha: 25, banquete_bosque: 40, estofado: 15, banquete: 30 }[id];
    if (st && typeof stamAdd === "function") { stamAdd(st); toast("+" + st + " de estamina"); } }
  if (id === "guiso_campestre" || id === "estofado_cosecha") { if (cleanseStates(["sangrado", "veneno", "quemadura"])) { log("El guiso limpió tus heridas (sangrado/veneno/quemadura).", "good"); toast("Heridas limpiadas"); } }
  if (id === "pan_trigo" || id === "pan_maiz_trigo") { if (cleanseStates(["flaqueza", "fragilidad"])) { log("El pan disipó las maldiciones.", "good"); toast("Maldiciones disipadas"); } }
  log(r.emoji + " Comiste " + r.label + ". " + dishDesc(r), "gold"); toast(r.emoji + " ¡Ñam!");
  if (typeof tutoEvent === "function") tutoEvent("eat");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// vender platos en la Cocina (doc: la maestría sube el precio; nivel 8+ desbloquea venta en $Golden)
function sellDish(id, gold) {
  const r = RECIPE_DEF[id]; if (!r || !G.dishes || (G.dishes[id] || 0) <= 0) return;
  // 14/8 (playtest: vendió la Papa Asada en pleno "comé un plato" y quedó trabado):
  // vender platos también pasa por el embudo — es una VENTA como cualquier otra
  if (typeof tutoPermite === "function" && !tutoPermite("sell")) { tutoAviso(); return; }
  if (gold && !(r.goldenP && cookLevel() >= 8)) { toast("La venta en $Golden se desbloquea con Cocina nivel 8"); return; }
  G.dishes[id]--;
  if (gold) {
    /* 18/8: `goldenP` era un número escrito a mano que NO pasaba por GOLDEN_EN_PLATA. El Banquete
       del Bosque pagaba 4 $G (2.000 de plata) por un plato que valía 598: x3,3. Con eso se compraban
       parcelas por un tercio de su precio. Ahora se deriva del MISMO valor que la venta en plata,
       igual que hace sellItem — el sitio que estaba bien. */
    const enPlata = Math.round(dishPrice(r) * cookPot(r.lvl));
    const g = Math.max(1, Math.floor(enPlata / GOLDEN_EN_PLATA));
    G.golden += g; log("Vendiste " + r.label + " por " + g + " $Golden.", "gold"); toast("+" + g + " $Golden");
  }
  else { const v = Math.round(dishPrice(r) * cookPot(r.lvl)); G.plata += v; log("Vendiste " + r.label + " por " + v + " de plata.", "gold"); toast("+" + v + " de plata"); }
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
}

// --- cofres depósito (detalles 29/7): 10 espacios, +1% de materiales por cofre, máx 50 ---
const CHEST_COST = { madera: 20, piedra: 10 };
const CHEST_PLATA = 200;
const CHEST_MAX = 50;
const CHEST_SLOTS = 10;
function chestBonus() { return 1 + 0.01 * ((G.chests || []).filter(c => c.col != null).length); }   // el bonus lo dan los cofres COLOCADOS
function chestsInBag() { return (G.chests || []).filter(c => c.col == null).length; }
function craftChest() {
  G.chests = G.chests || [];
  if (G.chests.length >= CHEST_MAX) { toast("Máximo de cofres (" + CHEST_MAX + ")"); return; }
  if (!canAfford(CHEST_COST)) { toast("Te faltan materiales"); return; }
  if (G.plata < CHEST_PLATA) { toast("Te falta plata (" + CHEST_PLATA + ")"); return; }
  payCost(CHEST_COST); G.plata -= CHEST_PLATA;
  G.chests.push({ col: null, row: null, items: Array(CHEST_SLOTS + (G.chestCap || 0)).fill(null) });   // capacidad base + la ganada por niveles de granja
  addXp("crafting", 8);
  log("Crafteaste un cofre depósito — está en tu bolsa. Colocalo con un clic desde la bolsa.", "gold");
  toast("Cofre en la bolsa (" + G.chests.length + "/" + CHEST_MAX + ")"); forgeWork();
  if (typeof tutoEvent === "function") tutoEvent("chest");
  refreshForge(); refreshHud();
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm(true);
}
// guardar una pila de la bolsa en el cofre (apila hasta 99 por espacio)
function chestDeposit(ci, kind, key) {
  const ch = G.chests && G.chests[ci]; if (!ch) return;
  const stores = { res: G.res, seed: G.seeds, fish: G.fish, dish: G.dishes };
  const st = stores[kind]; if (!st) { toast("Eso no se puede guardar"); return; }
  const avail = Math.floor(st[key] || 0); if (avail <= 0) return;
  let slot = ch.items.find(s => s && s.kind === kind && s.key === key && s.n < 99);
  if (!slot) { const i = ch.items.indexOf(null); if (i < 0) { toast("Cofre lleno"); return; } slot = ch.items[i] = { kind, key, n: 0 }; }
  const n = Math.min(avail, 99 - slot.n);
  slot.n += n; st[key] -= n;
  if (typeof syncSlots === "function") syncSlots();
  if (typeof refreshChest === "function") refreshChest();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm();
}
// sacar un espacio del cofre de vuelta a la bolsa
function chestWithdraw(ci, si) {
  const ch = G.chests && G.chests[ci]; if (!ch) return;
  const s = ch.items[si]; if (!s) return;
  const stores = { res: G.res, seed: G.seeds, fish: G.fish, dish: G.dishes };
  const st = stores[s.kind]; if (!st) return;
  const before = st[s.key] || 0;
  st[s.key] = before + s.n;
  if (canonicalStacks().length > invSlots()) { st[s.key] = before; toast("Bolsa llena"); return; }
  ch.items[si] = null;
  if (typeof syncSlots === "function") syncSlots();
  if (typeof refreshChest === "function") refreshChest();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm();
}

// --- dummy de práctica (detalless.docx): entrenar espada, cooldown 4 horas ---
var DUMMY_CD_MS = 4 * 3600 * 1000;
var DUMMY_XP = 30;
function fmtDur(ms) { return fmtSecs(ms / 1000); }   // 2/8: formato de tiempo ESTÁNDAR en todo el juego (delega en fmtSecs)
// 2/8: duración en formato humano desde SEGUNDOS ("9 min", "1 h 30 min", "45 s") — para la Tienda y tooltips
function fmtSecs(seg) {
  seg = Math.round(seg);
  if (seg < 60) return seg + " s";
  const d = Math.floor(seg / 86400), h = Math.floor(seg % 86400 / 3600), m = Math.floor(seg % 3600 / 60), sx = seg % 60;
  const p = [];
  if (d) p.push(d + " d"); if (h) p.push(h + " h"); if (m) p.push(m + " min"); if (sx && !d && !h) p.push(sx + " s");
  return p.join(" ");
}

// Formato CORTO para los carteles del mundo ("58m", "20h", "3d 5h", "45s"). El largo de fmtSecs
// ("58 min 52 s") no entra sobre una parcela de 42 px y los carteles de parcelas vecinas se pisaban.
// Sunflower Land usa exactamente esto: una unidad, o dos solo cuando hay días.
function fmtCorto(seg) {
  seg = Math.max(0, Math.round(seg));
  if (seg < 60) return seg + "s";
  const d = Math.floor(seg / 86400), h = Math.floor(seg % 86400 / 3600), m = Math.floor(seg % 3600 / 60);
  if (d) return d + "d" + (h ? " " + h + "h" : "");
  if (h) return h + "h";   // una sola unidad: el detalle fino ya lo cuenta la barrita
  return m + "m";
}

// --- bestiario (Fase D) — 6 tiers, de común a legendario ---
const MONSTER_ORDER = ["rata", "murcielago", "larva", "baba", "babita", "arana", "goblin", "orco", "lancero", "guerrero", "esqueleto", "golem", "hombre_lobo", "troll", "ogro", "espectro", "demonio", "dragon"];
/* 18/8 (auditoría) — EL PANTANO, LA PUERTA DE ENTRADA AL COMBATE, DABA PÉRDIDA.
   Medido con el arma de su propio tier (Espada de Madera, 4 de daño): 4 de los 5 bichos dejaban
   menos de lo que costaba el desgaste del arma. La Baba −56 y la Araña −71 por muerte. El primer
   contacto del jugador con la Zona Negra destruía valor, y encima sin avisar.
   Dos causas, no una:
     · DEFENSA. Con def 2 la espada de madera hacía 2 de daño: la Baba pasaba de 9 golpes a 18 y
       la Araña a 23. Un bicho de entrada no puede estar blindado contra el arma de entrada.
     · BOTÍN. La plata que dejaban no cubría ni el desgaste, mucho menos los 20/hora del ancla.
   Arreglados los dos: los bichos de entrada van sin defensa (el freno es su vida, que se ve) y el
   botín se derivó para que cada muerte cubra el arma MÁS 20 por hora del tiempo que lleva.
   Se comprueba con node tools/auditar-combate-entrada.js */
/* 18/8 (auditoría) — LA DEFENSA SE COMÍA TODA LA ESCALERA DE ARMAS.
   Medido con el arma del tramo de cada bicho, TODO el juego medio y alto hacía 1 DE DAÑO POR
   GOLPE: el Demonio tiene 24 de defensa y la espada de oro pega 14. La defensa había crecido por
   encima del daño de cualquier arma del juego (el tope es 21, el diamante), así que el daño caía
   siempre al mínimo de 1. Consecuencia: 250 golpes por demonio = 8 minutos de clic, y pérdidas de
   hasta −1.183 por muerte contando el desgaste del arma.
   (La auditoría anterior había medido 17,7x el ancla en la Guarida porque el jugador usaba la
   Espada de PIEDRA en todas partes — algo que solo tenía sentido por el fallo de ARM_MAT que se
   arregló hoy. Al enderezar las armas, salió a la luz lo que había debajo.)
   REGLA NUEVA: la defensa es el 30% del daño del arma de su tramo, así que nunca lo supera y el
   arma que te toca siempre sirve. Los golpes bajan de 250 a 25 como máximo. El botín se derivó
   para que cada muerte cubra el desgaste MÁS 20 por hora del tiempo que lleva.
   Se comprueba con node tools/auditar-combate.js */
/* 21/8 (dirección, vía Discord): "la exp está re subida, la rata da 100" — y el diseñador fijó
   el ancla nueva: LA RATA DA 5. La tabla del doc maestro (2/8) nunca se reconcilió con la curva
   21×N^1.7: con 100, UNA rata te ponía en Combate nivel 3 y cinco te daban el hito de vida del
   nivel 5. La forma del diseñador (xp ∝ vida, con premio extra en los jefes) era buena, así que
   se conserva ENTERA: todo el bestiario reescalado ÷20 desde su ancla. */
const MONSTER_DEF = {
  rata:     { label:"Rata",           emoji:"🐀", sprite:"rata", size:30, hp:12,  def:0,  dmg:2,  xp:5,  spd:55, lvl:1, loot:{ carne:[1,1,0.18], plata:[1,1,1] } },
  larva:    { label:"Larva Venenosa", emoji:"🐛", sprite:"larva", size:38, hp:22,  def:0,  dmg:3,  xp:9,  spd:35, lvl:5, loot:{ carne:[1,2,0.2], flecha:[1,3,0.14], plata:[1,1,1] }, gearLoot:[["botas_cuero",0.08]] },
  orco:     { label:"Orco",           emoji:"👹", sprite:"orc", size:52, hp:60,  def:2,  dmg:8,  xp:25,  spd:60, lvl:15, hab:"enrage", loot:{ carne:[1,2,0.07], bronce:[1,2,0.04], plata:[4,4,1] }, gearLoot:[["casco_cuero",0.10],["escudo_madera",0.08]] },
  lancero:  { label:"Orco Lancero",   emoji:"🔱", sprite:"lancero", size:58, hp:90,  def:2,  dmg:10, xp:40,  spd:70, lvl:16, loot:{ carne:[2,3,0.07], bronce:[1,3,0.05], flecha:[2,6,0.05], plata:[4,4,1] }, gearLoot:[["pechera_cuero",0.10]] },
  guerrero: { label:"Orco Guerrero",  emoji:"👺", sprite:"guerrero", size:70, hp:115, def:2,  dmg:12, xp:55, spd:65, lvl:20, loot:{ carne:[2,4,0.09], oro:[1,2,0.04], plata:[8,8,1] }, gearLoot:[["casco_hierro",0.10],["escudo_hierro",0.06]] },
  troll:    { label:"Trol",           emoji:"🧌", sprite:"troll", size:74, hp:140, def:3, dmg:14, xp:70, spd:45, lvl:30, hab:"regen", loot:{ carne:[3,5,0.05], oro:[1,3,0.04], diamante:[1,1,0.02], plata:[2,2,1] }, gearLoot:[["pechera_hierro",0.15]] },
  // --- Bestiario ampliado (doc maestro 2/8): 15 criaturas + jefe; hab = habilidad (Nv 8+ del doc) ---
  murcielago: { label:"Murciélago", emoji:"🦇", sprite:"murcielago", size:26, hp:16, def:0, dmg:3, xp:7, spd:85, lvl:3, hab:"evade", evade:0.25, loot:{ carne:[1,1,0.24], plata:[1,1,1] } },
  baba:       { label:"Baba", emoji:"🫧", sprite:"baba", size:36, hp:35, def:0, dmg:4, xp:13, spd:40, lvl:7, hab:"split", loot:{ plata:[6,6,1] } },
  babita:     { label:"Babita", emoji:"🫧", sprite:"baba", size:22, hp:12, def:0, dmg:2, xp:3, spd:55, lvl:7, noRespawn:true, loot:{ plata:[2,2,1] } },
  arana:      { label:"Araña", emoji:"🕷️", sprite:"arana", size:40, hp:45, def:0, dmg:6, xp:17, spd:75, lvl:10, hab:"web", loot:{ flecha:[1,3,0.3], plata:[7,7,1] } },
  goblin:     { label:"Goblin", emoji:"👾", sprite:"goblin", size:44, hp:52, def:2, dmg:7, xp:22, spd:70, lvl:12, hab:"bleedhit", loot:{ bronce:[1,1,0.06], plata:[3,3,1] } },
  esqueleto:  { label:"Esqueleto Arquero", emoji:"💀", sprite:"esqueleto", size:48, hp:55, def:2, dmg:12, xp:32, spd:60, lvl:18, hab:"curseArrow", range:150, loot:{ flecha:[2,6,0.5], plata:[9,9,1] } },
  golem:      { label:"Golem de Piedra", emoji:"🗿", sprite:"golem", size:56, hp:120, def:3, dmg:10, xp:45, spd:35, lvl:22, hab:"golem", loot:{ piedra:[2,4,0.19], oro:[1,1,0.05], plata:[5,5,1] } },
  hombre_lobo:{ label:"Hombre Lobo", emoji:"🐺", sprite:"hombre_lobo", size:52, hp:130, def:3, dmg:16, xp:65, spd:80, lvl:27, hab:"howl", loot:{ carne:[2,4,0.6], plata:[16,16,1] } },
  ogro:       { label:"Ogro", emoji:"🧟", sprite:"ogro", size:64, hp:190, def:4, dmg:19, xp:100, spd:50, lvl:35, hab:"charge", loot:{ oro:[1,2,0.08], plata:[7,7,1] } },
  espectro:   { label:"Espectro", emoji:"👻", sprite:"espectro", size:50, hp:150, def:4, dmg:23, xp:135, spd:70, lvl:40, hab:"phase", loot:{ diamante:[1,1,0.07], plata:[7,7,1] } },
  demonio:    { label:"Demonio Menor", emoji:"😈", sprite:"demonio", size:58, hp:250, def:4, dmg:27, xp:195, spd:65, lvl:45, hab:"demon", loot:{ oro:[1,3,0.06], diamante:[1,1,0.02], plata:[12,12,1] } },
  dragon:     { label:"Dragón de las Cavernas", emoji:"🐉", sprite:"dragon", size:96, hp:900, def:28, dmg:42, xp:700, spd:55, lvl:50, hab:"dragon", boss:true, loot:{ plata:[500,500,1], diamante:[1,3,0.8], netherita:[1,1,0.25] } },
};
/* "detallitos (1)" punto 2: los mobs pegan más. Multiplicador global editable.
   18/8 (auditoría): MOB_DEF_MULT pasa de 1,5 a 1. La DEFENSA ahora se deriva bicho por bicho
   (el 30% del daño del arma de su tramo, para que el arma que te toca siempre sirva), y un
   multiplicador global encima la vuelve indecidible: es lo que convertía un def 4 en 6 y hacía
   que la espada de oro, que pega 14, se quedara en 8 contra el Demonio.
   Me costó dos vueltas encontrarlo, porque multiplica DESPUÉS de la tabla y ninguna medición
   sobre MONSTER_DEF lo veía. MOB_DMG_MULT se queda: lo que ELLOS te pegan es otro eje. */
var MOB_DMG_MULT = 1.3, MOB_DEF_MULT = 1;
MONSTER_ORDER.forEach(k => { const m = MONSTER_DEF[k];
  m.dmg = Math.max(1, Math.round(m.dmg * MOB_DMG_MULT));
  m.def = Math.round((m.def || 0) * MOB_DEF_MULT);
});
// combate (detalles 338): auto-ataque cada 2s, alcance del arco 4 celdas
const ATTACK_MS = 2000;
const MELEE_RANGE = GF.TILE * 1.35;
const BOW_RANGE = GF.TILE * 4;
// fixs.docx #2 (11/8): "bajar el porcentaje de drops en todos los mobs". UN número para el
// diseñador: multiplica la chance de TODOS los materiales. La plata garantizada no se toca
// (chance 1), así matar siempre paga algo pero los materiales salen menos seguido.
var DROP_CHANCE_MULT = 0.6;
function rollLoot(def) {
  const out = {};
  for (const k in def.loot) {
    const e = def.loot[k], a = e[0], b = e[1];
    let chance = (e.length > 2 ? e[2] : 1);
    if (chance < 1) chance *= DROP_CHANCE_MULT;   // #2: los no-garantizados caen menos
    if (Math.random() >= Math.min(1, chance * luckMult())) continue;   // suerte de la comida mejora los drops (detalles 338)
    let n = a + Math.floor(Math.random() * (b - a + 1));
    n = Math.round(n * (typeof chestBonus === "function" ? chestBonus() : 1));   // +1% de materiales por cofre colocado (el bono existía pero no se aplicaba)
    if (n > 0) out[k] = n;
  }
  /* RED DE SEGURIDAD DEL TUTORIAL (19/8, dirección) — y SOLO del tutorial.
     "Al ser un tutorial, controlemos cuántos bichos va matando y que al último le caiga sí o sí lo
     que necesita. Pero solo en ese paso."
     El azar del botín está bien como lección —el jugador tiene que aprender que la Zona no es una
     máquina expendedora— pero no puede ser lo que decida si termina el tutorial o lo abandona: con
     un 24% de caída, uno de cada cuatro jugadores mata siete bichos sin ver nada y se queda sin
     estamina en el último paso, con el juego a medio explicar.
     Así que se lleva la cuenta y en la muerte número TUTO_PITY el drop es seguro. Fuera del paso
     activo del tutorial esto no existe: el contador ni se toca, y el que quiera cazar carne más
     adelante juega con las mismas probabilidades que todos. */
  tutoPity(def, out);
  return out;
}
var TUTO_PITY = 4;              // muertes hasta que el botín del paso cae garantizado
function tutoPity(def, out) {
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st || !st.res || !def || !def.loot || !def.loot[st.res]) return;   // solo en un paso de "traé X"
  if (typeof tutoTiene === "function" && tutoTiene(st) >= tutoNeed(st)) return;   // ya lo tiene: nada que compensar
  G.tuto = G.tuto || {};
  if (out[st.res]) { G.tuto.pity = 0; return; }                          // cayó solo: se reinicia la cuenta
  G.tuto.pity = (G.tuto.pity || 0) + 1;
  if (G.tuto.pity < TUTO_PITY) return;
  G.tuto.pity = 0;
  out[st.res] = Math.max(1, tutoNeed(st) - (typeof tutoTiene === "function" ? tutoTiene(st) : 0));
  if (typeof log === "function") log("El bicho suelta justo lo que te falta.", "gold");
}
// modelo SFL APILABLE (31/7): G.tools[axe/rod] es la CANTIDAD de herramientas (1 uso cada una).
// Craftear suma al stock; usar consume 1. La espada y el arco conservan durabilidad + reparación.
function toolCount(id) { return Math.max(0, Math.floor((G.tools && G.tools[id]) || 0)); }
function toolLost(id) { return toolCount(id) <= 0; }
function toolDur(id) {
  if (id === "axe" || id === "rod") return toolCount(id);   // apilables: el chequeo es tener stock
  return (G.tools && G.tools[id] != null) ? G.tools[id] : (TOOL_DEF[id] ? TOOL_DEF[id].max : 0);
}
function useTool(id) {
  const d = toolDur(id); if (d <= 0) return false;
  G.tools[id] = d - 1;
  if ((id === "axe" || id === "rod") && G.tools[id] <= 0) {
    G.hotbar = G.hotbar.map(h => (h && h.kind === "tool" && h.key === id) ? null : h);
    syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
    uiRefreshAfterBreak();   // 31/7: que el ícono desaparezca AL INSTANTE también en bolsa/equipo/herrería abiertas
  }
  return true;
}
// craftear herramientas consumibles — costos estilo SFL, apilan hasta 99
// 16/8 (auditoría B): la caña pedía 8 de ORO — 119 horas de un nodo de 14 h, o 2.692 plata
// efectivas POR PESCA. El kit regala 15 y el tutorial enseña a pescar: al gastarlas, la pesca
// se terminaba para siempre. Ahora cuesta 1 madera: quien limita la pesca es la CARNADA
// (las lombrices de los montículos diarios), que es el freno que el diseño ya tenía puesto.
const TOOL_CRAFT = { axe: { cost:{}, plata:2 }, rod: { cost:{ madera:1 }, plata:0 } };   // 18/8: el hacha baja a 2 con el árbol de 30 min (sigue siendo el 17% de lo que saca)
function craftTool(id, lote) {
  lote = Math.max(1, lote || 1);
  const tc = TOOL_CRAFT[id], td = TOOL_DEF[id]; if (!tc || !td) return;
  if (typeof tutoPermite === "function" && !tutoPermite("crafttool")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(tc.cost, tc.plata, "craftear " + td.label)) return;   // guardia del tutorial (12/8)
  if (lote > 1) {   // doc 2/8: crafteo en lote — la fricción es económica, no de clicks
    let hechas = 0;
    while (hechas < lote && toolCount(id) < 99 && canAfford(tc.cost) && G.plata >= tc.plata) { payCost(tc.cost); G.plata -= tc.plata; G.tools[id] = toolCount(id) + 1; hechas++; }
    if (!hechas) { toast("Te faltan materiales o plata"); return; }
    addXp("crafting", 5 * hechas); log("Crafteaste " + hechas + " × " + td.label + " (tenés " + G.tools[id] + ").", "good"); toast("+" + hechas + " " + td.label);
  if (typeof tutoEvent === "function") tutoEvent("crafttool");
    forgeWork(); refreshForge(); if (isOpen("ov-inv")) refreshInv(); refreshHud(); syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
    return;
  }
  if (toolCount(id) >= 99) { toast("Máximo 99 " + td.label); return; }
  if (!canAfford(tc.cost)) { toast("Te faltan materiales"); return; }
  if (G.plata < tc.plata) { toast("Te falta plata"); return; }
  payCost(tc.cost); G.plata -= tc.plata;
  G.tools[id] = toolCount(id) + 1;
  addXp("crafting", 5); log("Crafteaste " + td.label + " (tenés " + G.tools[id] + ").", "good"); toast("+1 " + td.label);
  forgeWork(); refreshForge(); if (isOpen("ov-inv")) refreshInv(); refreshHud(); syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
}
function repairTool(id) { const td = TOOL_DEF[id]; if (!td) return; if (toolLost(id)) { toast("No tenés esa herramienta — la tiraste"); return; } if (toolDur(id) >= td.max) { toast("Ya está al 100%"); return; } if (!canAfford(td.repair)) { toast("Te faltan materiales para reparar"); return; } payCost(td.repair); G.tools[id] = td.max; log("Reparaste " + td.label + " (100%).", "good"); toast("Reparado"); forgeWork(); refreshForge(); if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-inv")) refreshInv(); }

// --- inventario (base + filas extra) ---
var INV_BASE = 20, INV_MAX_ROWS = 6;   // 20 base (4 filas de 5, pedido del diseñador 30/7), ampliable +5 por fila hasta 50
// (es `var` y no `const` porque el MODO TESTEO la agranda: con la bolsa llena no se puede probar nada)
function invSlots() { return INV_BASE + (G.invRows || 0) * 5; }
function nextInvCost() {
  const r = G.invRows || 0;
  if (r >= INV_MAX_ROWS) return null;
  return { type: "plata", cost: 1000 * Math.pow(2, r) };   // 1000, 2000, 4000, 8000, 16000 (sumidero anti-inflación)
}
function expandInv() {
  const nc = nextInvCost();
  if (!nc) { toast("Bolsa al máximo"); return; }
  if (nc.type === "res") { if (!canAfford(nc.cost)) { toast("Te faltan minerales"); return; } if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(nc.cost, 0, "ampliar la bolsa")) return; payCost(nc.cost); }
  else { if (G.plata < nc.cost) { toast("Te falta plata"); return; } if (typeof tutoGuardia === "function" && !tutoGuardia("plata", nc.cost, "ampliar la bolsa")) return; G.plata -= nc.cost; }
  G.invRows = (G.invRows || 0) + 1;
  log("Ampliaste la bolsa (+5 espacios).", "good"); toast("+5 espacios");
  if (typeof tutoEvent === "function") tutoEvent("invexp");
  refreshInv(); refreshHud();
}
/* ¿hay sitio en la bolsa para lo que va a soltar la acción?
   Se comprueba ANTES de empezar (si no, gastás la animación para nada). */
function roomForRes(key, n) {
  const before = G.res[key] || 0;
  G.res[key] = before + (n || 1);
  const ok = canonicalStacks().length <= invSlots();
  G.res[key] = before;
  return ok;
}
function roomForFish() {   // la rareza es al azar: tiene que entrar CUALQUIERA de las cuatro
  return FISH_ORDER.every(f => {
    const before = (G.fish && G.fish[f]) || 0;
    G.fish[f] = before + 1;
    const ok = canonicalStacks().length <= invSlots();
    G.fish[f] = before;
    return ok;
  });
}
function roomForDish(id) {
  const before = (G.dishes && G.dishes[id]) || 0;
  G.dishes[id] = before + 1;
  const ok = canonicalStacks().length <= invSlots();
  if (before) G.dishes[id] = before; else delete G.dishes[id];
  return ok;
}
function bagFull(what) { toast("Bolsa llena — no podés " + what); log("No tenés espacio en la bolsa: liberá un hueco para " + what + ".", "bad"); }

/* ============ UNA SOLA PUERTA POR ACCIÓN (20/8) =====================================
   Dirección: "cada cosa que tocamos rompe otras. ¿El código está bien modulado?"
   Éste es el primero de los cuatro arreglos que salieron de esa pregunta, y es el que más daño
   estaba haciendo. Hasta hoy, las razones por las que una acción puede fallar —el enfriamiento, la
   herramienta, la carnada, el sitio en la bolsa— estaban escritas A MANO EN CADA SITIO DESDE DONDE
   SE ENTRA. Y a casi todas se entra por más de un sitio: a la pesca por el objeto pesquero y por el
   agua; a talar y picar por el clic, por el clic sostenido y por la tecla de acción.
   El resultado documentado: el 19/8 arreglé el aviso del reposo de la laguna en UNA de sus dos
   puertas, di el trabajo por bueno, y dirección se encontró el mismo fallo intacto después de
   desplegar. No fue mala suerte: con la regla copiada en N sitios, arreglar N-1 es lo normal.

   A partir de acá hay UNA función que contesta « ¿puedo? » y devuelve por qué no. La usan todas las
   entradas Y TAMBIÉN el rótulo del cursor, así que el aviso que leés antes de hacer clic y el
   rechazo que recibís al hacerlo son literalmente la misma frase: no pueden discrepar.

   Devuelve { ok:true } o { ok:false, toast, log, logTipo, bag }.
     · bag  — la acción no cabe en la bolsa; el llamador usa bagFull(bag), que ya tiene su formato.
     · log  — mensaje largo para el registro, opcional, cuando el toast se queda corto.           */
function sinKitTxt(m) { return !G.kitReclamado ? "Tu kit de bienvenida está en el baúl, junto al granero" : m; }
function puedeAccion(tipo, o, rotulo) {
  o = o || {};
  const OK = { ok: true };

  /* El enfriamiento del nodo, común a árbol, roca y veta. Se mira PRIMERO: es la razón más
     frecuente y la que peor sienta descubrir al final.
     El TEXTO sale del rótulo del cursor (promptText) cuando el llamador lo pasa, que es siempre
     que hay escena. No es un capricho: así el cartel que leés al pasar por encima y el aviso que
     recibís al hacer clic son la MISMA cadena, generada una vez. Cuando no hay escena —tests,
     cabecera sin interfaz— hay un texto de respaldo con el mismo formato. */
  if (tipo === "chop" || tipo === "mine") {
    const falta = (o.readyAt || 0) - nowMs();
    if (falta > 0) return { ok: false, toast: (typeof rotulo === "function" && rotulo(o)) || ("Vuelve en " + fmtDur(falta)) };
  }

  if (tipo === "fish") {
    const espera = pescaCdLeft();
    if (espera > 0) return { ok: false, toast: "La laguna está en reposo — vuelve en " + fmtDur(espera) };
    if (toolDur("rod") <= 0) return { ok: false, toast: sinKitTxt("No tenés caña — craftéala en la Herrería") };
    if ((G.res.lombriz || 0) < 1) return { ok: false, toast: "Necesitás lombrices — cavá un montículo o compralas en la Tienda" };
    if (!roomForFish()) return { ok: false, bag: "pescar" };
    return OK;
  }

  if (tipo === "chop") {
    if (toolDur("axe") <= 0) return { ok: false, toast: sinKitTxt("No tenés hacha — craftéala en la Herrería") };
    if (!roomForRes("madera")) return { ok: false, bag: "talar" };
    return OK;
  }

  if (tipo === "mine") {
    const pk = equippedPick();
    if (!pk || (!G.kitReclamado && (G.picks.dur[pk] || 0) <= 0))
      return { ok: false, toast: sinKitTxt("Necesitás un pico — craftealo en la Herrería") };
    if (o.type === "ore") {
      /* El PICO decide qué mineral podés tocar; la SKILL decide si ya sabés hacerlo. Las dos, y
         cada una dice lo suyo: así el pico no pierde su papel y la skill no es decorativa. */
      const pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      if (od.tier > pd.mineTier) return { ok: false, toast: "Tu " + pd.label + " no puede con " + od.label,
        log: "Necesitás un pico mejor para " + od.label + " (Herrería).", logTipo: "bad" };
      if (typeof oreUnlocked === "function" && !oreUnlocked(o.ore))
        return { ok: false, toast: "Necesitás Minería nivel " + oreNivelReq(o.ore) + " para " + od.label,
          log: "El " + od.label + " se aprende a picar con Minería nivel " + oreNivelReq(o.ore) + ".", logTipo: "info" };
    }
    if ((G.picks.dur[pk] || 0) <= 0) return { ok: false, toast: "No tenés pico útil — craftéalo en la Herrería" };
    const res = o.type === "ore" ? o.ore : "piedra";
    if (!roomForRes(res)) return { ok: false, bag: "picar " + (o.type === "ore" ? ORE_DEF[o.ore].label : "piedra") };
    return OK;
  }

  if (tipo === "plant") {
    const ck = o.seed || G.selSeed, cd = CROP_DEF[ck];
    if (!cd) return { ok: false, toast: "Elegí una semilla en la bolsa (I)" };
    if (!cropUnlocked(ck)) return { ok: false, toast: "Necesitás Cultivo nivel " + cd.lvl + " para " + cd.label };
    if ((G.seeds[ck] || 0) <= 0) return { ok: false, toast: "Sin semillas de " + cd.label + " — comprá en la Tienda" };
    return OK;
  }

  if (tipo === "harvest") {
    const ck = o.cropKey || "papa";
    if (!roomForRes(ck)) return { ok: false, bag: "cosechar " + ((CROP_DEF[ck] || {}).label || ck) };
    return OK;
  }

  return OK;   // acción sin guardias declaradas: no se inventa una negativa
}
/* El aviso, en un solo sitio: así ningún llamador se olvida del registro ni escribe su propia
   versión del mensaje. */
function avisoAccion(p) {
  if (!p || p.ok) return;
  if (p.bag) { bagFull(p.bag); return; }
  if (p.toast) toast(p.toast);
  if (p.log) log(p.log, p.logTipo || "info");
}

function tryAddRes(key, amt) {
  const b = G.res[key] || 0; G.res[key] = b + amt;
  if (canonicalStacks().length > invSlots()) { G.res[key] = b; return false; }
  syncSlots();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshHotbar === "function") refreshHotbar();
  return true;
}

// --- casillas: todo es ítem (recursos/semillas apilan 99; herramientas/picos 1 c/u con durabilidad) ---
// 16/8 BUG: los tres cultivos nuevos faltaban acá (el comentario decía que estaban, el array no).
// Lo cosechado entraba a G.res pero NO aparecía en la bolsa ni contaba para el espacio.
const ITEM_RES_ORDER = ["papa","ciruela","cereza","remolacha","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz",
  "madera","piedra","bronce","hierro","oro","diamante","netherita","carne","flecha","lombriz",
  "tablon","barra_piedra","barra_bronce","barra_hierro","barra_oro",
  "fibra","pelaje","cuero","colmillo","esencia_runica","esencia_oscura"];   // los 3 cultivos nuevos y los materiales de Establo/Curtiduría/Altar también ocupan casilla
function descKey(d) { return d ? d.kind + ":" + d.key : ""; }
function canonicalStacks() {
  const list = [];
  ["axe", "rod"].forEach(k => { let n = toolCount(k); while (n > 0) { list.push({ kind: "tool", key: k }); n -= 99; } });   // apilables ×99
  // fixs.docx #9 (11/8): el arma EQUIPADA ya no ocupa lugar en la bolsa — vive en el panel de Equipo
  for (const id of ARM_ORDER) if (G.weapons && G.weapons[id] && G.gear.arma !== id) list.push({ kind: "arm", key: id });
  /* 18/8 (dirección): "la bolsa se llena de recursos farmeables y termina todo mezclado con las
     herramientas". Los PLANOS, los COFRES sin colocar, los ADORNOS y los regalos del baúl ya no
     están acá: viven en el COBERTIZO (cobertizoItems), que es el sitio de lo que se COLOCA.
     La bolsa queda para lo que se GASTA: recursos, semillas, pescado, comida y herramientas. */
  PICK_ORDER.forEach(id => { let n = pickCount(id); while (n > 0) { list.push({ kind: "pick", key: id }); n -= 99; } });   // picos apilables ×99
  ITEM_RES_ORDER.forEach(r => { let n = Math.floor(G.res[r] || 0); while (n > 0) { list.push({ kind: "res", key: r }); n -= 99; } });
  CROP_ORDER.forEach(s => { let n = Math.floor(G.seeds[s] || 0); while (n > 0) { list.push({ kind: "seed", key: s }); n -= 99; } });
  FISH_ORDER.forEach(f => { let n = Math.floor((G.fish && G.fish[f]) || 0); while (n > 0) { list.push({ kind: "fish", key: f }); n -= 99; } });
  RECIPE_ORDER.forEach(d => { let n = Math.floor((G.dishes && G.dishes[d]) || 0); while (n > 0) { list.push({ kind: "dish", key: d }); n -= 99; } });
  // (los cofres sin colocar también se mudaron al Cobertizo)
  return list;
}
/* ============ EL COBERTIZO (18/8, dirección) =======================================
   "Todo lo que son como mueble, por así decirlo: los plots, los árboles, los minerales... debe
   tener su propio apartado, porque la bolsa se llena de recursos farmeables y termina todo
   mezclado con las herramientas."
   Regla de qué entra: SE COLOCA EN EL SUELO Y NO SE GASTA AL USARLO. O sea parcelas, retoños,
   rocas, adornos, cofres y planos de edificio. NO entran los recursos, las semillas, la comida,
   las herramientas ni los materiales intermedios: todo eso se consume y sigue en la bolsa.
   Los regalos del baúl vienen DIRECTOS acá; no pasan por la barra rápida ni por el inventario. */
function cobertizoItems() {
  const list = [];
  { const cb = cobertizoBolsa();
    for (const t of ["plot", "tree", "rock"]) for (let i = 0; i < (cb[t] || 0); i++) list.push({ kind: "regalo", key: t }); }
  if (typeof DECO_ORDER !== "undefined") DECO_ORDER.forEach(id => {
    for (let i = 0; i < decoTengo(id); i++) list.push({ kind: "deco", key: id });
  });
  { let n = chestsInBag(); while (n-- > 0) list.push({ kind: "chest", key: "cofre" }); }
  if (G.planos) for (const t in G.planos) if (G.planos[t]) list.push({ kind: "plano", key: t });
  return list;
}
function cobertizoCuenta() { return cobertizoItems().length; }

// reconcilia G.slots con lo que hay realmente, preservando el orden que armó el jugador
function syncSlots() {
  const cap = invSlots();
  if (!Array.isArray(G.slots)) G.slots = [];
  while (G.slots.length < cap) G.slots.push(null);
  if (G.slots.length > cap) { const extra = G.slots.splice(cap); extra.filter(Boolean).forEach(d => { const i = G.slots.indexOf(null); if (i >= 0) G.slots[i] = d; }); }
  const want = {}; canonicalStacks().forEach(d => { const k = descKey(d); want[k] = (want[k] || 0) + 1; });
  const have = {}; G.slots.forEach(d => { if (d) { const k = descKey(d); have[k] = (have[k] || 0) + 1; } });
  for (const k in have) { let surplus = have[k] - (want[k] || 0); for (let i = G.slots.length - 1; i >= 0 && surplus > 0; i--) { if (G.slots[i] && descKey(G.slots[i]) === k) { G.slots[i] = null; surplus--; } } }
  for (const k in want) {
    let cur = 0; G.slots.forEach(d => { if (d && descKey(d) === k) cur++; });
    const ix = k.indexOf(":"), kind = k.slice(0, ix), key = k.slice(ix + 1);
    for (let j = cur; j < want[k]; j++) { const i = G.slots.indexOf(null); if (i < 0) break; G.slots[i] = { kind, key }; }
  }
}
// herramienta "en mano" según el hueco seleccionado de la hotbar
function activeTool() {
  const d = G.hotbar[G.hotSel];
  if (!d) return null;
  if (d.kind === "tool") return d.key;   // "axe" | "rod"
  if (d.kind === "pick") return "pick";
  if (d.kind === "seed") return "seed";
  return null;                            // recurso u otro
}
// la primera vez, precarga la hotbar con las herramientas básicas
/* ============ LA BARRA ARRANCA VACÍA (18/8, dirección) =============================
   "En una cuenta que comienza, en la barra rápida aparece el hacha en opaco, la caña en opaco y
   el pico, como que tengo picos al principio. ¿Por qué mejor no aparecer con la barra sin nada,
   el inventario en nada, y que al darle al baúl recién ahí me den el kit inicial y se pongan en
   la barra las cosas que me dan?"
   Tiene razón: la barra se rellenaba con hacha, pico y caña ANTES de que el jugador tuviera
   ninguna de las tres. Como no las tiene, salían apagadas — enseñando huecos muertos y
   contradiciendo al primer objetivo del tutorial, que es justamente ir al baúl a por el kit.
   Ahora los accesos se ponen CUANDO el kit llega, y no antes. Ojo con hbInit: si se marcara
   igual, la barra quedaría vacía para siempre; por eso solo se marca cuando de verdad se llenó. */
function ensureHotbarDefaults() {
  if (G.hbInit) return;
  if (!Array.isArray(G.hotbar)) G.hotbar = [];
  while (G.hotbar.length < 10) G.hotbar.push(null);
  if (!G.kitReclamado) return;            // el baúl todavía no se abrió: barra vacía, y se vuelve a intentar
  if (!G.hotbar.some(Boolean)) {          // 14/8 (reversión): vuelven los accesos de arranque
    G.hotbar[0] = { kind: "tool", key: "axe" };
    G.hotbar[1] = { kind: "pick", key: (G.picks && G.picks.eq) || "stone" };
    G.hotbar[2] = { kind: "tool", key: "rod" };
    G.hotbar[3] = { kind: "seed", key: G.selSeed || "papa" };
  }
  G.hbInit = true;
}

// --- mercado ---
// 16/8 (auditoría D): PRICE era una tabla fantasma — precios para cosas que NO se venden y
// desconectados de lo que cuesta producirlas (decía 3 por una madera que cuesta 6 y ocupa
// 1 h 30 de reloj). Ahora cada material vale su PRECIO SOMBRA, derivado del ancla:
//     valor = horas del reloj del nodo × 20 (lo que rinde una parcela por hora) + costo de la herramienta
// Los materiales SIGUEN sin venderse (SELLABLE = solo cultivos): esto es la vara con la que
// cualquier sistema — recompensas, pedidos, proyecciones — debe valorarlos. Y si algún día
// se vendieran, estos son los precios que NO rompen la economía.
/* 18/8 (auditoría) — NUEVE MATERIALES NO TENÍAN PRECIO, y eso no es un hueco de contabilidad: es
   que NADA del juego puede valorarlos. Dos veces en un día me dieron un desbalance inventado
   (los animales, y de rebote las armaduras) porque valían 0 y las cuentas salían en pérdida
   brutal. Un material sin precio sombra convierte en mentira cualquier medición que lo toque.

   De dónde sale cada uno, con la misma regla de siempre — lo que cuesta OBTENERLO:

   · ANIMALES: un animal es una casilla que produce, así que rinde 20 la hora como todas.
     precio = (20 × horas del ciclo + la comida más barata que acepta) / lo que da por ciclo
       fibra   (Alpaca,  12 h, da 2, come trigo 360)      = 300
       pelaje  (Conejo,  12 h, da 2, come zanahoria 3)    = 122
       cuero   (Toro,    16 h, da 2, come trigo 360)      = 340
       colmillo(Jabalí,  20 h, da 1, come calabaza 40)    = 440

   · ESENCIAS: caen del combate. La rúnica cae al 30% de los bichos de nivel 8+, o sea 3,3 muertes
     por unidad. Con el coste de estamina de esos bichos (5 puntos) y la regeneración de 1 punto
     cada 3 minutos, cada muerte son 15 minutos de reloj: 3,3 × 15 min × 20/h = 165.
     La oscura cae solo de los de nivel 10-12 y más rara, así que va al doble: 330.
     Las runas y el polvo salen de fusionar esencias, con lo que su precio se deriva de ellas. */
const PRICE = { madera:12, piedra:15, bronce:160, hierro:240, oro:280, diamante:360, netherita:480, carne:8, flecha:2,
  fibra:300, pelaje:122, cuero:340, colmillo:440,
  esencia_runica:165, esencia_oscura:330, runa_poder:495, polvo_suerte:165, runa_proteccion:495 };

/* 18/8 — LA "VETA DE PIEDRA" ES UNA ROCA. PRICE se define acá abajo del todo y ORE_DEF 2400
   líneas más arriba, así que la definición de la piedra no puede referenciarlo directamente.
   Se re-ata acá: a partir de este punto es IMPOSIBLE que el nodo de piedra y las rocas tengan
   relojes o precios distintos, que es justo lo que estaba pasando (2 h contra 40 min, 6 contra 15). */
ORE_DEF.piedra.cd = CD.rock;
ORE_DEF.piedra.price = PRICE.piedra;

// 1/8: los CULTIVOS venden según CROP_DEF.price — PRICE quedó solo para lo demás.
//      Antes el mercado usaba una copia vieja acá y los cambios del panel no se veían (bug reportado por el diseñador).
function priceOf(res) { return CROP_DEF[res] ? CROP_DEF[res].price : (PRICE[res] || 0); }
// detalles viernes (1): los minerales, madera y flechas NO se venden — solo cultivos y lo farmeado en la Zona Negra (carne)
const SELLABLE = ["papa","ciruela","cereza","remolacha","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz"];   // 16/8: los tres cultivos nuevos también se venden   // viernes (2): la carne no se vende
let marketCur = "plata";
// 16/8 (caza de exploits): vender en $Golden usaba precio/10, o sea 10 plata de cultivo por
// 1 $Golden — mientras comprar parcelas valora el $Golden en GOLDEN_EN_PLATA (500). Eso era
// un arbitraje ×50: vendías cultivos por $Golden y comprabas con ellos parcelas que en plata
// costaban 25 veces más. Ahora las dos puntas usan EL MISMO número: sin arbitraje posible.
/* 18/8 — Y EL REDONDEO, UNA SOLA VEZ, AL FINAL. Redondear el precio POR UNIDAD reproduce el
   mismo fallo que teníamos con la cantidad: la papa vale 2, y `round(2 × 1,135)` sigue siendo 2
   hasta el nivel 20, cuando salta a 3 (+50% de golpe). El bono tiene que aplicarse al TOTAL de la
   venta y redondearse una sola vez: así vender 10 papas al nivel 10 da 23 en vez de 20, y la
   curva es continua de verdad. */
/* 18/8 — Y EL BONO VA SOBRE EL MARGEN, NO SOBRE EL PRECIO. Aplicándolo al precio, la semilla
   no subía con él y cada cultivo se beneficiaba distinto: al nivel 30 la papa rendía 33,9/h y el
   maíz 41,8. Se rompía la propiedad central del ancla —que los trece rindan lo mismo— justo en
   los niveles altos, que es donde nadie mira.
   Sobre el margen, los trece se mueven juntos y la fórmula cuadra exacta:
       venta = semilla + (precio − semilla) × bono
   Papa al 50: 1 + 1×1,735 = 2,735 → 34,7 plata/h.  Maíz: 720 + 480×1,735 → 34,7 plata/h. */
function precioVenta(res) {
  const c = CROP_DEF[res];
  if (!c) return priceOf(res) * ventaMult();
  return c.seedCost + (c.price - c.seedCost) * ventaMult();
}
function totalVenta(res, q) { return Math.max(1, Math.round(q * precioVenta(res))); }
function marketUnit(res) { const u = precioVenta(res); return marketCur === "plata" ? u : u / GOLDEN_EN_PLATA; }
function sellItem(res) {
  const inp = $("mq-"+res); let q = Math.floor(parseFloat(inp && inp.value) || 0);
  q = Math.max(0, Math.min(q, G.res[res]));
  if (q <= 0) { toast("Poné una cantidad"); return; }
  // candado anti-exploit (12/8): durante un "juntá X" no se puede VENDER ese recurso por
  // debajo de la meta — si no, vender para quedar en 9/10 mantenía el boost vivo infinito
  if (typeof tutoGuardia === "function" && !tutoGuardia(res, q, "vender " + (RES_LABEL[res] || res))) return;
  if (typeof tutoPermite === "function" && !tutoPermite("sell")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (marketCur === "plata") { const t=totalVenta(res,q); G.plata+=t; G.res[res]-=q; log(`Vendiste ${q} ${RES_LABEL[res]} por ${t} de plata.`); toast("+"+t+" plata"); }
  else { const g=Math.floor(totalVenta(res,q)/GOLDEN_EN_PLATA); if (g<1){ toast("Muy poca cantidad para $Golden"); return; } G.res[res]-=q; G.golden+=g; log(`Vendiste ${q} ${RES_LABEL[res]} por ${g} $Golden.`,"gold"); toast("+"+g+" $Golden"); }
  if (window.sfx) sfx("coin");
  if (CROP_DEF[res] && typeof tutoEvent === "function") for (let i = 0; i < q; i++) tutoEvent("sell");   // 14/8 v4: un evento POR UNIDAD vendida — el capataz verifica cantidades
  refreshMarket(); refreshHud();
}

// --- pesca ---
const FISH_COST = 5;
/* 18/8 (auditoría) — LA PESCA ERA LA GRIETA MÁS GRANDE DEL JUEGO.
   Sin enfriamiento, sin estamina y sin tope diario: un clic costaba 39 de plata (1 caña + 1
   lombriz) y su valor esperado era 246, con un 3% de pez legendario que pagaba 15 $Golden = 7.500
   de plata. Son ONCE HORAS DE GRANJA por clic, repetible sin límite.
   Tres frenos, ninguno inventado:
     · ENFRIAMIENTO como cualquier nodo: la laguna pasa a rendir por hora, no por clic.
     · El legendario paga en ORO, no en $Golden. Un pez no puede imprimir moneda premium.
     · El común paga lo que dice el ancla para el tiempo que ocupa, no un número al azar. */
var FISH_CD = 900;   // 15 min de laguna: al ancla son 5 de plata por pesca
function pescaCdLeft() { return Math.max(0, (G.pescaHasta || 0) - nowMs()); }
function goFishing() {
  /* 20/8 — LA RED, NO LA PUERTA, Y CON LA MISMA REGLA. Las comprobaciones viven en las entradas
     del clic (el objeto pesquero y el agua), así que a esta altura ya nadie debería llegar sin
     caña, sin cebo o con la laguna en reposo. Esto se queda por si mañana aparece una tercera
     entrada — pero preguntando a la MISMA función, no repitiendo la regla. Antes había aquí tres
     comprobaciones copiadas, y ese era exactamente el problema: cada copia envejece por su lado. */
  const p = puedeAccion("fish", { type: "fish" });
  if (!p.ok) { avisoAccion(p); return; }
  G.pescaHasta = nowMs() + FISH_CD * 1000 * (typeof cdMult === "function" ? cdMult() : 1);
  G.res.lombriz -= 1; useTool("rod");   // detalles viernes: pescar cuesta SOLO 1 lombriz (sin esencia)
  if (toolDur("rod") <= 0) { log("¡La caña se rompió en pedazos! Crafteá otra en la Herrería.", "bad"); toast("¡Caña rota!"); }
  const r = Math.random();
  let rar; if (r < 0.60) rar = "comun"; else if (r < 0.85) rar = "raro"; else if (r < 0.97) rar = "epico"; else rar = "legendario";
  /* 18/8 (dirección): "pescar tiene su propio skill, ¿por qué le da experiencia a cocinar?".
     Resto de cuando la pesca era "conseguir ingredientes". La Cocina se gana cocinando. */
  G.fish[rar]++; addXp("fishing", XP_PEZ);
  if (typeof statAdd === "function") statAdd("pescar");
  if (typeof tutoEvent === "function") tutoEvent("fish");
  // fixs.docx #16 (11/8): pescar ya NO regala buffs — el pez va a la bolsa y los buffs
  // salen de COCINARLO (los platos con pescado ya los daban). La plata del común y el
  // premio del legendario se conservan: son botín, no buff.
  /* 18/8: los cuatro peces se tratan igual — van a la bolsa y valen lo que valen al cocinarlos.
     Antes el común pagaba plata suelta ADEMÁS de dejarte el pez, y el legendario imprimía 2 de
     oro: entre los dos se llevaban la mitad de lo que pagaba la pesca. */
  const nomb = (typeof FISH_DEF !== "undefined" && FISH_DEF[rar]) ? FISH_DEF[rar].label : "Pez";
  if (rar === "comun") { log(nomb + " a la bolsa.", "good"); toast(nomb); }
  else if (rar === "raro") { log("Pez raro a la bolsa — cocinalo para sacarle un buff.", "good"); toast("¡Pez raro!"); }
  else if (rar === "epico") { log("Pez épico a la bolsa — cocinalo para sacarle un buff.", "good"); toast("¡Pez épico!"); }
  else { log("¡LEGENDARIO! El pez más valioso de la laguna — cocinalo.", "gold"); toast("¡LEGENDARIO!"); }
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// --- parcelas: costo de comprar la siguiente con plata ---
// 20/8 (dirección + diseñador): las parcelas llegan con las EXPANSIONES, y además se pueden
// comprar con plata "cada una un poco más cara que la anterior". La curva vieja (1,45× hasta la
// 12, 1,12× después) estaba calibrada contra un modelo que ya no existe — el nivel de granja
// regalando parcelas — y anclada en n=6 cuando hoy se nace con 3.
// La regla: base 200, +10% por parcela COMPRADA. 200 ≙ 10 horas del ancla (una celda
// productiva = 20 plata/hora): se paga sola en una tarde.
// 20/8, segunda vuelta (dirección): el precio mira SOLO las compradas en tienda. La primera
// versión miraba plotsOwned y entonces cada parcela regalada por una expansión encarecía la
// siguiente compra — con lo cual convenía comprar ANTES de expandir y el orden importaba
// (hasta 4,6× de diferencia con las 16 expansiones). Con el contador propio, tu compra n°k
// cuesta lo mismo la hagas cuando la hagas: 200 · 1,10^k. El orden deja de importar.
var PLOT_UNLOCK_BASE = 200;
var PLOT_UNLOCK_SUBA = 1.10;
function plotUnlockCost() {
  return Math.round(PLOT_UNLOCK_BASE * Math.pow(PLOT_UNLOCK_SUBA, Math.max(0, G.plotsCompradas || 0)));
}

// --- cofre diario de login (racha de 7 días · anti-inflación: 80% insumos / 20% plata) ---
// "2das mejoras" (4/8): el cofre reparte SOLO cosas laterales — cosméticos soulbound y consumibles
// de un uso. NUNCA plata, minerales, herramientas, semillas, XP, fichas, runas, $Golden ni estrellas del pase.
const DAILY_REWARDS = [
  { cos: "Decoración chica de granja",             label: "Decoración chica para la granja" },
  { buffFarm: 5, buffMin: 60,                       label: "Bendición del Granjero: +5% velocidad de farmeo por 1 hora" },
  { dish: 2,                                        label: "2 platos ya cocinados" },
  { cos: "Emote o marco de perfil",                 label: "Emote o marco de perfil" },
  { carnada: 5,                                     label: "Carnada de pesca ×5" },
  { cos: "Cosmético sorpresa (de un set)",          label: "Cosmético sorpresa" },
  { coleccionable: true,                            label: "Coleccionable de la semana (rotativo)" },
];
// el día 7 entrega un cosmético EXCLUSIVO que rota cada semana (el gancho, sin tocar el balance)
const COLECCIONABLES = [
  "Espantapájaros dorado (decoración)",
  "Sombrero de paja brillante (skin)",
  'Gallina mascota "Pinta" (compañera)',
  "Farolito de luciérnagas (decoración animada)",
  "Camino de pétalos (skin de suelo)",
  'Título "Madrugador" + color de nombre verde',
];
function semanaISO(d) { const x = new Date(d || Date.now()); x.setHours(0,0,0,0); x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); const w1 = new Date(x.getFullYear(), 0, 4); return Math.round(((x - w1) / 86400000 + ((w1.getDay() + 6) % 7) - 3) / 7 + 1); }
function coleccionableDeLaSemana() { return COLECCIONABLES[semanaISO() % COLECCIONABLES.length]; }
// qué coleccionable del cofre entrega, además del texto, un ADORNO de verdad para la granja (10/8)
const COS_ADORNO = { "Espantapájaros dorado": "espantapajaros_oro", "Farolito de luciérnagas": "farolito" };
function darCosmetico(nombre) {
  G.cosmeticos = G.cosmeticos || [];
  G.cosmeticos.push(nombre + " (no vendible)");
  // los que son decoración van derecho a la bolsa de adornos: si no, quedaban como una línea
  // de texto en la lista de cosméticos y nunca se veían en la granja.
  const id = Object.keys(COS_ADORNO).find(k => String(nombre).indexOf(k) >= 0);
  if (id) {
    G.decoBolsa = G.decoBolsa || {};
    G.decoBolsa[COS_ADORNO[id]] = (G.decoBolsa[COS_ADORNO[id]] || 0) + 1;
    if (typeof syncEditDeco === "function") syncEditDeco();
  }
}

function dayStamp(off) { const d = new Date(Date.now() + (off || 0) * 86400000); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
// estado del cofre: ¿se puede reclamar hoy? ¿qué día de la racha toca? ¿se perdió la racha?
/* ============ EXCAVACIONES DIARIAS (15/8, idea Stardew aprobada) ==============
   3 montículos de tierra removida por día, en lugares al azar pero FIJOS durante el
   día (semilla = fecha + apodo: recargar no los mueve). Se cavan con un clic, sin
   herramienta: sale un insumo chico. Insumos, nunca plata — cero riesgo económico. */
var EXCAV_POR_DIA = 3;
function excavEstado() {
  const e = G.excav || (G.excav = { dia: "", hechos: [] });
  if (e.dia !== dayStamp(0)) { e.dia = dayStamp(0); e.hechos = []; }
  return e;
}
function excavAzar(n) {   // 0..1 determinístico del día para este jugador (FNV-1a)
  let h = 2166136261;
  const str = dayStamp(0) + "|" + (window.NICK || "granjero") + "|" + n;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
/* 20/8 — EL SUELO DEL QUE NADIE PUEDE CAERSE (hallazgo de tools/test-herramientas.js)
   Buscando si alguna herramienta podía dejar al jugador encerrado apareció un agujero que no es de
   las herramientas sino de la ECONOMÍA entera, y es definitivo: la plata sale de vender cultivos
   (SELLABLE son solo cultivos, por diseño: ni madera ni minerales ni lombrices se venden), y las
   semillas se compran con plata. Un jugador con 0 de plata, 0 semillas y la tierra vacía no tiene
   ninguna manera de conseguir la primera moneda. No es lento: es imposible, para siempre.
   Hoy la única válvula anti-atasco es el kit de emergencia, y cobra $Golden — o sea que no existe,
   porque el token todavía no tiene precio y la orden es que todo funcione con plata.
   La salida se pone donde ya hay un sistema que el jugador conoce y que el tutorial le enseña: el
   montículo. Cavás la tierra y sale una papa en vez de una lombriz. No hace falta ninguna pantalla
   nueva, no se puede farmear (la condición exige estar a cero: con una sola semilla en la bolsa ya
   no salta) y son tres por día como máximo.
   Y no toca el ancla: una papa son 3 minutos y ~2 de plata. No es un regalo, es un suelo. */
function granjaAtascada() {
  if (typeof CROP_DEF === "undefined" || !G.seeds) return false;
  /* ¿Le queda alguna semilla, de la que sea? */
  if (Object.keys(G.seeds).some(k => (G.seeds[k] || 0) > 0)) return false;
  /* ¿Tiene algo creciendo o listo en la tierra? */
  if ((G.plots || []).some(p => p && p.state && p.state !== "dry")) return false;
  /* ¿Le queda algo vendible en la bolsa? */
  if (typeof SELLABLE !== "undefined" && SELLABLE.some(k => (G.res[k] || 0) > 0)) return false;
  if (G.fish && Object.keys(G.fish).some(k => (G.fish[k] || 0) > 0)) return false;
  /* ¿Y le alcanza la plata para la semilla más barata? */
  const min = Math.min.apply(Math, Object.keys(CROP_DEF).map(k => CROP_DEF[k].seedCost || 999));
  return (G.plata || 0) < min;
}
function excavBotin(i) {   // 15/8 v2 (dirección): tierra removida = LOMBRICES, siempre — la carnada de la pesca
  if (granjaAtascada()) return { seed: "papa", n: 1, txt: "+1 Semilla de papa" };
  const r = excavAzar(100 + i);
  const n = r < 0.7 ? 1 : 2;   // a veces la tierra viene generosa
  return { res: "lombriz", n, txt: "+" + n + (n > 1 ? " Lombrices" : " Lombriz") };
}
function excavCavar(i) {   // devuelve el botín si se pudo cavar
  const e = excavEstado();
  if (e.hechos.includes(i)) return null;
  const b = excavBotin(i);
  if (b.res) { if (!tryAddRes(b.res, b.n)) { toast("Bolsa llena — hacé lugar y volvé"); return null; } }
  else if (b.seed) G.seeds[b.seed] = (G.seeds[b.seed] || 0) + b.n;
  e.hechos.push(i);
  log("Excavaste un montículo: " + b.txt + ".", "good");
  if (typeof tutoEvent === "function") tutoEvent("excavar");   // 19/8: es un paso del tutorial
  refreshHud(); if (typeof syncSlots === "function") syncSlots();
  if (typeof saveFarm === "function") saveFarm(true);
  return b;
}

/* ================= BUZÓN (15/8, idea Stardew) ==================================
   Las noticias llegan como CARTAS a un buzón físico en la granja. La banderita se
   levanta cuando hay algo: reemplaza al popup del cofre diario al entrar. Las cartas
   se ARMAN al momento (no se guardan): solo persiste qué avisos únicos ya se leyeron. */
function passPendientes() {
  try {
    const pp = passInit(), lvl = passLvl(); let n = 0;
    for (let i = 1; i <= lvl; i++) { if (!pp.claimF[i]) n++; if (pp.vip && !pp.claimV[i]) n++; }
    return n;
  } catch (e) { return 0; }
}
function buzonCartas() {
  const cartas = [];
  G.buzonLeidas = G.buzonLeidas || {};
  if (!G.buzonLeidas.bienvenida) cartas.push({
    id: "bienvenida", de: "El Capataz", titulo: "¡Bienvenido a Golden Farm!",
    txt: "Esta tierra ya es tuya. Plantá, cosechá, vendé y construí a tu ritmo — nadie te apura. Cuando haya novedades, te las dejo acá, en el buzón: si ves la banderita levantada, pasá a leer.",
    leer: true });
  const hoy = dayStamp(0);
  try { if (typeof dailyState === "function" && dailyState().claimable && !G.buzonLeidas["cofre|" + hoy]) cartas.push({
    id: "cofre", de: "La Granja", titulo: "Te llegó tu paquete del día",
    txt: "Está al pie del buzón, atado con cordel. Levantalo y es tuyo — si venís todos los días, la racha crece.",
    panel: "ov-paquete", btn: "Ver la racha" }); } catch (e) {}
  // TABLÓN (16/8): el pueblo se presenta una sola vez, cuando el tutorial ya terminó
  try { if (G.tuto && G.tuto.done && !G.buzonLeidas.tablon) cartas.push({
    id: "tablon", de: "El pueblo", titulo: "Colgamos nuestros pedidos en el tablón",
    txt: "Cada mañana dejamos tres encargos en el tablón, junto al buzón. Pagamos en plata y en VALES — juntalos: en el mismo tablón se canjean por cosas que la plata no compra. El primer pedido que cumplas cada día paga doble.",
    leer: true, panel: "ov-pedidos", btn: "Ver el tablón" }); } catch (e) {}
  try { const n = passPendientes(); if (n > 0 && !G.buzonLeidas["pase|" + hoy]) cartas.push({
    id: "pase", de: "El Pase de Cosecha", titulo: n + (n > 1 ? " niveles" : " nivel") + " sin reclamar",
    txt: "Tus estrellas ya destrabaron premios en el Pase. Pasá a retirarlos cuando quieras.",
    panel: "ov-pass", btn: "Ver el Pase" }); } catch (e) {}
  try { buzonArchivar(cartas); } catch (e) {}
  return cartas;
}
function buzonBorrar(id, dia) {
  G.buzonArchivo = (G.buzonArchivo || []).filter(a => !(a.id === id && a.dia === dia));
  if (typeof saveFarm === "function") saveFarm();
  if (typeof refreshBuzon === "function") refreshBuzon();
}
function buzonLeer(id) { G.buzonLeidas = G.buzonLeidas || {}; G.buzonLeidas[id] = 1; if (typeof saveFarm === "function") saveFarm(); if (typeof refreshBuzon === "function") refreshBuzon(); }
// ARCHIVO (15/8): toda carta que pasó por el buzón queda guardada 7 días para releerla.
// Se archiva una vez por día por id (el aviso del cofre de hoy y el de mañana son cartas distintas).
var BUZON_ARCHIVO_DIAS = 7;
function buzonArchivar(cartas) {
  G.buzonArchivo = Array.isArray(G.buzonArchivo) ? G.buzonArchivo : [];
  const hoy = dayStamp(0), ahora = Date.now();
  for (const c of cartas) {
    if (!G.buzonArchivo.some(a => a.id === c.id && a.dia === hoy))
      G.buzonArchivo.push({ id: c.id, de: c.de, titulo: c.titulo, txt: c.txt, dia: hoy, ts: ahora });
  }
  const tope = ahora - BUZON_ARCHIVO_DIAS * 86400000;
  const antes = G.buzonArchivo.length;
  G.buzonArchivo = G.buzonArchivo.filter(a => (a.ts || 0) >= tope).slice(-40);   // 7 días y máx 40 cartas
  if (G.buzonArchivo.length !== antes && typeof saveFarm === "function") saveFarm(true);
}

/* ============ TABLÓN DE PEDIDOS v2 (16/8, investigación Hay Day/SFL/Stardew/AC) =======
   3 pedidos diarios DETERMINISTAS (fecha+apodo, mismo truco que las excavaciones), pidiendo
   SOLO lo que el jugador puede producir hoy (Hay Day: el tablón nunca frustra). Pagan
   plata (~1.5× mercado) + XP de farmeo + VALES: la moneda que SOLO sale del tablón.
   El 1º cumplido del día paga vales DOBLES (Nook Miles). Descartar: gratis el primero,
   después 30 min de espera (Hay Day). La tienda de canje NO vende madera/piedra —
   los relojes del diseñador no se puentean con vales. */
var PED_POR_DIA = 3, PED_DESCARTE_MIN = 30;
var PED_REMITENTES = [   // pedidos con cara y voz (Sunflower Land), no un menú
  ["Doña Rosa", "para la sopa del domingo"],
  ["Tomás el panadero", "el horno no espera"],
  ["Lupe la tejedora", "pago bien, como siempre"],
  ["Don Emilio", "mi despensa quedó vacía"],
  ["Ramón el pescador", "ando corto de provisiones"],
  ["La maestra Inés", "es para los chicos de la escuela"],
  ["Blas el herrero", "la fragua pide más"],
  ["Marta la posadera", "tengo la posada llena"]];
function pedAzar(n) {   // 0..1 determinístico del día para este jugador (FNV-1a)
  let h = 2166136261;
  const str = dayStamp(0) + "|PED|" + (window.NICK || "granjero") + "|" + n;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
// qué puede producir el jugador HOY — de acá salen los pedidos
function pedPool() {
  const pool = [];
  for (const k in CROP_DEF) {
    const cd = CROP_DEF[k];
    /* 18/8: el tablón pedía cultivos por NIVEL DE GRANJA, pero desde que las semillas se abren con
       la skill de Cultivo ese `cd.lvl` es un nivel de OFICIO. Con la vara vieja, el tablón te
       encargaba maíz porque el granero iba alto aunque no pudieras ni comprar la semilla. Se
       pregunta a la misma puerta que el mercado. */
    if (typeof cropUnlocked === "function" ? !cropUnlocked(k) : (farmLevel() < cd.lvl)) continue;
    const min = Math.round(cd.growH * 60);
    const n = min <= 30 ? 3 : min <= 90 ? 2 : 1;   // cultivos cortos piden tandas, anclas piden 1
    pool.push({ tipo: "res", key: k, n: n, val: (cd.price || 1) * n });
  }
  pool.push({ tipo: "res", key: "madera", n: 3, val: (priceOf("madera") || 2) * 3 });
  pool.push({ tipo: "res", key: "piedra", n: 3, val: (priceOf("piedra") || 3) * 3 });
  for (const k in ORE_DEF) {
    if (k === "piedra") continue;
    try { if (statGet("minar", k) > 0) pool.push({ tipo: "res", key: k, n: 1, val: (ORE_DEF[k].price || 6) * 2 }); } catch (e) {}
  }
  if (((G.fish && G.fish.comun) || 0) > 0 || toolCount("rod") > 0)
    pool.push({ tipo: "fish", key: "comun", n: 2, val: 12 });
  if (G.built && G.built.cocina) for (const id of ["papa_asada", "sopa_zanahoria", "pure_papa"]) {
    const r = RECIPE_DEF[id]; if (!r) continue;
    let hecho = false; try { hecho = statGet("cocinar", id) > 0; } catch (e) {}
    if (hecho || ((G.dishes && G.dishes[id]) || 0) > 0) pool.push({ tipo: "dish", key: id, n: 1, val: (r.plata || 8) * 2 });
  }
  return pool;
}
function pedidoGenerar(seed) {
  const pool = pedPool(); if (!pool.length) return null;
  const p = pool[Math.floor(pedAzar(seed) * pool.length) % pool.length];
  const extra = pedAzar(seed + 31);   // tanda chica / media / grande
  let n = Math.max(1, p.n + (extra < 0.35 ? 0 : extra < 0.8 ? Math.ceil(p.n * 0.5) : p.n));
  // 18/8: ningún pedido puede valer menos que UN VALE. Si el producto es barato se pide una tanda
  // mayor — que además suena mejor ("Doña Rosa necesita 20 papas", no 3). Sin esto el suelo de
  // "mínimo 1 vale" convertía un pedido de 6 de plata en un premio de 40, y por ahí se colaba x13.
  const unidad = p.val / p.n;
  if (unidad > 0 && n * unidad < VALE_EN_PLATA) n = Math.ceil(VALE_EN_PLATA / unidad);
  const val = Math.round(unidad * n);
  const rem = PED_REMITENTES[Math.floor(pedAzar(seed + 7) * PED_REMITENTES.length) % PED_REMITENTES.length];
  /* 18/8 — EL TABLÓN NO PUEDE PAGAR POR ENCIMA DEL ANCLA.
     Pagaba plata a 1,5× el valor de lo que pedía. Eso no es un sumidero: es un cambio con prima.
     Saca material y mete MÁS dinero del que valía, así que cuantos más pedidos cumplís, más rico
     te hacés — lo contrario de regular. Y encima el plan de la escalera semanal/mensual habría
     multiplicado el problema en vez de arreglarlo.
     Ahora paga el valor EXACTO (1,0×): el pedido es neutral en plata, y quien lo cumple gana lo
     mismo que si hubiera vendido. La recompensa de verdad está en lo que NO vuelve a la
     producción — vales y XP —, que es el modelo que Sunflower usa con la moneda de su capítulo.
     Los vales suben para compensar: la ganancia sigue existiendo, pero en una moneda que solo
     sale del tablón y solo se gasta en el tablón. */
  return { tipo: p.tipo, key: p.key, n: n, plata: Math.max(2, Math.round(val)), xp: Math.max(1, Math.round(val * 0.8)),
    vales: valesDe(val), de: rem[0], nota: rem[1], hecho: false };   // 18/8: MISMA vara que el canje
}
/* ============ LA ESCALERA DEL TABLÓN (18/8, dirección) =============================
   "podemos regularlo con las misiones del tablón, que sean misiones diarias, semanales, mensuales".

   Por qué hacía falta: los materiales no se venden, así que casi no tienen salida. Comprando UNA
   VEZ cada edificio, cada pico y cada arma del juego se gasta el 4% de todo lo que un jugador
   produce del 1 al 50. El resto se queda en el cofre para siempre. Las expansiones drenan ~20%,
   pero son 16 compras en 118 días: un sumidero de HITO, no un regulador. Lo que regula tiene que
   repetirse, y eso es el tablón.

   Cuánto pide cada escalón, medido contra lo que producís ESE día (no números fijos, así escala
   solo con la granja):
       diaria    3 pedidos     10% de la producción del día
       semanal   1 encargo     un día entero de producción
       mensual   1 encargo     tres días de producción
   En 30 días eso quema 10 días de producción: **el 33%**. Sumado a las expansiones (20%) y a los
   edificios y herramientas (4%), se queman ~57% y al jugador le queda el 43% para construir,
   craftear y guardar.

   Y la regla que hace que sea un sumidero de verdad: **el extra se paga en VALES**, que solo
   salen del tablón y solo se gastan en el tablón. Si pagara plata con prima sería un cambio con
   ganancia, no un sumidero — que es justo lo que estaba pasando antes (pagaba 1,5x). */
var PED_SEMANAL_DIAS = 1, PED_MENSUAL_DIAS = 3;   // cuántos días de producción pide cada encargo
function semanaStamp() { const d = new Date(); const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return "S" + Math.floor(t / (7 * 86400000)); }
function mesStamp() { const d = new Date(); return "M" + d.getUTCFullYear() + "-" + d.getUTCMonth(); }
// Un encargo grande: el mismo generador, pero pidiendo N veces lo de un pedido diario.
function pedidoGrande(seed, veces, etiqueta) {
  const p = pedidoGenerar(seed);
  if (!p) return null;
  const mult = Math.max(2, Math.round(veces * 10));   // la diaria es el 10% del día
  p.n = Math.max(2, Math.round(p.n * mult));
  p.plata = Math.max(2, Math.round(p.plata * mult));
  p.xp = Math.max(1, Math.round(p.xp * mult));
  p.vales = Math.max(3, Math.round(p.vales * mult * 0.6));   // el premio va en VALES, no en plata
  p.tipoEncargo = etiqueta;
  p.nota = etiqueta === "semanal" ? "el encargo de la semana" : "el gran encargo del mes";
  return p;
}
function pedidosEstado() {
  const e = G.pedidos || (G.pedidos = { dia: "", lista: [], reroll: 0, descarteAt: 0, dobles: 0 });
  if (e.dia !== dayStamp(0)) {
    e.dia = dayStamp(0); e.reroll = 0; e.descarteAt = 0; e.dobles = 0; e.lista = [];
    for (let i = 0; i < PED_POR_DIA; i++) {   // sin repetir producto entre los 3
      let p = null;
      for (let t = 0; t < 6 && !p; t++) { const c = pedidoGenerar(i * 100 + t * 13); if (c && !e.lista.some(x => x.key === c.key)) p = c; }
      if (!p) p = pedidoGenerar(i * 100);
      if (p) e.lista.push(p);
    }
  }
  // el encargo de la SEMANA y el del MES viven aparte de la lista diaria: no se descartan ni se
  // rerollean, y aguantan lo que dure su ventana aunque cambie el día.
  if (e.semana !== semanaStamp()) { e.semana = semanaStamp(); e.pedSemanal = pedidoGrande(7777, PED_SEMANAL_DIAS, "semanal"); }
  if (e.mes !== mesStamp()) { e.mes = mesStamp(); e.pedMensual = pedidoGrande(31313, PED_MENSUAL_DIAS, "mensual"); }
  return e;
}
// los tres escalones, en una sola lista, para la interfaz y para entregar
function pedidosTodos() {
  const e = pedidosEstado();
  const r = e.lista.map((p, i) => ({ p, i, escalon: "diaria" }));
  if (e.pedSemanal) r.push({ p: e.pedSemanal, i: "S", escalon: "semanal" });
  if (e.pedMensual) r.push({ p: e.pedMensual, i: "M", escalon: "mensual" });
  return r;
}
function pedidoStock(p) {
  if (p.tipo === "res") return Math.floor(G.res[p.key] || 0);
  if (p.tipo === "fish") return Math.floor((G.fish && G.fish[p.key]) || 0);
  if (p.tipo === "dish") return Math.floor((G.dishes && G.dishes[p.key]) || 0);
  return 0;
}
function pedidoLabel(p) {
  if (p.tipo === "fish") return (typeof FISH_DEF !== "undefined" && FISH_DEF[p.key]) ? FISH_DEF[p.key].label : "Pescado";
  if (p.tipo === "dish") return (RECIPE_DEF[p.key] && RECIPE_DEF[p.key].label) || p.key;
  return (CROP_DEF[p.key] && CROP_DEF[p.key].label) || RES_LABEL[p.key] || p.key;
}
function pedidoSprite(p) {
  if (p.tipo === "fish") return (typeof FISH_DEF !== "undefined" && FISH_DEF[p.key] && FISH_DEF[p.key].sprite) || null;
  if (p.tipo === "dish") return (RECIPE_DEF[p.key] && RECIPE_DEF[p.key].sprite) || null;
  return resSprite(p.key);
}
function pedidosCumplibles() { try { return pedidosEstado().lista.filter(p => !p.hecho && pedidoStock(p) >= p.n).length; } catch (e) { return 0; } }
/* 18/8: ¿a qué oficio le toca la XP de un pedido? Al que produjo lo que estás entregando. Es la
   misma regla de siempre: cada acción paga a su oficio. Se deriva del pedido, no se escribe a mano. */
function skillDeEntrega(p) {
  if (!p) return "farming";
  if (p.tipo === "fish") return "fishing";
  if (p.tipo === "dish") return "cooking";
  if (p.key === "madera") return "tala";
  if (typeof ORE_ORDER !== "undefined" && ORE_ORDER.includes(p.key)) return "mining";
  if (typeof ANIMAL_ORDER !== "undefined" &&
      ANIMAL_ORDER.some(a => ANIMAL_DEF[a] && ANIMAL_DEF[a].mat === p.key)) return "ganaderia";
  if (typeof MAT_ORDER !== "undefined" && MAT_ORDER.includes(p.key)) return "crafting";
  return "farming";                                    // los cultivos, que es el caso normal
}
/* 20/8 — EL CANDADO CIRCULAR DEL TABLÓN. Lo encontró la jugada completa (tools/jugada-completa):
   el ÚLTIMO paso del tutorial es « Entregá un encargo en el tablón », y el tablón contestaba
   « abre al terminar el tutorial ». El candado y la meta se apuntaban mutuamente: NINGÚN jugador
   nuevo podía terminar el tutorial, y se quedaba para siempre dentro del embudo de permisos.
   La regla correcta es una sola: el tablón abre cuando el tutorial terminó O cuando el paso
   activo es justamente el que te manda a usarlo. */
function tablonAbierto() {
  if (!G.tuto || G.tuto.done) return true;
  return (TUTO_STEPS[G.tuto.step] || {}).id === "pedido";
}
function pedidoEntregar(i) {
  const e = pedidosEstado();
  // 18/8: "S" y "M" son el encargo de la semana y el del mes; los números, los tres diarios
  const p = i === "S" ? e.pedSemanal : i === "M" ? e.pedMensual : e.lista[i];
  /* 18/8: NUNCA salir de aquí en silencio. El fallo que reportó el diseñador ("el papelito se
     mueve y no pasa nada") era exactamente esto: la UI mandaba NaN, `p` quedaba undefined y esta
     línea devolvía false sin decir una palabra. Un clic siempre tiene que contestar algo. */
  if (!p) { toast("Ese encargo ya no está en el tablón"); return false; }
  if (p.hecho) { toast("Ese encargo ya está entregado"); return false; }
  if (!tablonAbierto()) { toast("El tablón abre al terminar el tutorial"); return false; }
  if (pedidoStock(p) < p.n) { toast("Te falta " + pedidoLabel(p) + " (" + pedidoStock(p) + "/" + p.n + ")"); return false; }
  if (p.tipo === "res") G.res[p.key] -= p.n;
  else if (p.tipo === "fish") G.fish[p.key] -= p.n;
  else if (p.tipo === "dish") G.dishes[p.key] -= p.n;
  // el ×2 del primero del día es solo para los diarios: el semanal y el mensual ya pagan de más
  const doble = !(e.dobles > 0) && !p.tipoEncargo;
  const vales = p.vales * (doble ? 2 : 1);
  p.hecho = true; if (!p.tipoEncargo) e.dobles = (e.dobles || 0) + 1;
  G.plata += p.plata; G.vales = (G.vales || 0) + vales;
  /* 18/8 (dirección): el tablón pagaba XP de Cultivo aunque le llevaras PIEDRA. Ahora paga a la
     skill de lo que entregás — que es lo que el jugador ha trabajado de verdad. */
  addXp(skillDeEntrega(p), p.xp);
  log(p.de + " recibió " + p.n + " × " + pedidoLabel(p) + ": +" + p.plata + " plata y +" + vales + (vales > 1 ? " vales" : " vale") + (doble ? " (¡primer pedido del día ×2!)" : "") + ".", "gold");
  toast("🎟 +" + vales + " · 🪙 +" + p.plata);
  if (typeof statAdd === "function") statAdd("pedido");        // 19/8: contador propio — el detector
  if (typeof tutoEvent === "function") tutoEvent("pedido");   // del tutorial no puede depender de los
                                                              // vales, que se gastan y vuelven a cero
  if (window.sfx) sfx("coin");
  refreshHud(); if (typeof refreshPedidos === "function" && isOpen("ov-pedidos")) refreshPedidos();
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}
function pedidoDescartar(i) {
  const e = pedidosEstado(), p = e.lista[i];
  if (!p || p.hecho) return;
  if (nowMs() < (e.descarteAt || 0)) { toast("El próximo descarte llega en " + Math.ceil(((e.descarteAt || 0) - nowMs()) / 60000) + " min"); return; }
  e.descarteAt = nowMs() + PED_DESCARTE_MIN * 60000;   // el primero del día es gratis; el siguiente, a los 30 min
  e.reroll = (e.reroll || 0) + 1;
  let nuevo = null;
  for (let t = 0; t < 8 && !nuevo; t++) { const c = pedidoGenerar(1000 + e.reroll * 50 + t * 13); if (c && c.key !== p.key && !e.lista.some((x, xi) => xi !== i && x.key === c.key)) nuevo = c; }   // distinto del descartado y de los otros dos
  e.lista[i] = nuevo || p;
  log("Descartaste un pedido — otro vecino colgó el suyo.", "info");
  if (typeof refreshPedidos === "function" && isOpen("ov-pedidos")) refreshPedidos();
  if (typeof saveFarm === "function") saveFarm(true);
}
// --- la tienda de canje: lo que la plata no compra (y NUNCA madera/piedra) ---
/* ============ EL VALE TIENE UN VALOR (18/8) ========================================
   EXPLOIT MEDIDO: x800. Los vales se EMITÍAN por escalón del valor del pedido (val>=200 ? 5 : ...)
   pero se GASTABAN a precio fijo, y el sobre de semillas entregaba el cultivo de MAYOR NIVEL
   desbloqueado — cuyo `seedCost` escala x720 de la papa al maíz mientras su precio en vales no se
   movía. La ruta: entregás 3 papas (6 de plata) → 2 vales, 4 si es el primero del día → 3 vales
   son 5 semillas de maíz = 3.600 de plata. Y descartando pedidos se podía buscar el más barato.
   Dentro de la propia tienda el spread iba de 9 a 1.200 plata por vale: x133.

   ARREGLO: el vale deja de ser un número suelto y pasa a valer algo. Se emite y se cobra con la
   MISMA vara, así que la ruta se cierra sola y no hay que perseguir cada caso. */
var VALE_EN_PLATA = 40;   // cuánto vale un vale, en plata sombra
function valesDe(plata) { return Math.max(1, Math.round((plata || 0) / VALE_EN_PLATA)); }
// El precio de cada premio sale de lo que ENTREGA, no de una tabla escrita a mano.
function valeCosto(id) {
  const P = (k) => (typeof priceOf === "function" ? priceOf(k) : 0);
  if (id === "hachas") return valesDe(10 * ((TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 6));
  if (id === "picos") return valesDe(10 * ((PICK_DEF.stone && PICK_DEF.stone.plata) || 6));
  if (id === "lombrices") return valesDe(6 * (typeof WORM_PRICE === "number" ? WORM_PRICE : 3));
  // el sobre: se deriva primero CUÁNTAS semillas entra y después qué cuesta ESA cantidad. Las dos
  // puntas con la misma vara. Fijar una sola dejaba la fuga en el redondeo de la otra: con precio
  // fijo, 1 semilla de maíz (720) salía 2 vales (80) — x9.
  if (id === "semillas") { const k = valeMejorCultivo();
    return valesDe(valeSemillasN() * ((CROP_DEF[k] || CROP_DEF.papa).seedCost || 1)); }
  return 1;
}
var VALE_SOBRE = 2;   // el sobre APUNTA a costar esto; con cultivos caros sube, porque no se puede
                      // partir una semilla y el mínimo que se puede entregar es 1
function valeSemillasN() {
  const k = valeMejorCultivo();
  const c = (CROP_DEF[k] || CROP_DEF.papa).seedCost || 1;
  return Math.max(1, Math.round(VALE_SOBRE * VALE_EN_PLATA / c));
}
function valeMejorCultivo() {
  // 18/8: misma corrección que en el tablón — la semilla que canjeás tiene que ser una que el
  // MERCADO te venda, y el mercado mira la skill de Cultivo, no el granero.
  const desb = Object.keys(CROP_DEF).filter(k => (typeof cropUnlocked === "function" ? cropUnlocked(k) : farmLevel() >= CROP_DEF[k].lvl))
    .sort((a, b) => CROP_DEF[b].lvl - CROP_DEF[a].lvl);
  return desb[0] || "papa";
}
var VALES_SHOP = [
  { id: "hachas", label: "Fardo de 10 hachas", sprite: "axe", emoji: "🪓" },
  { id: "picos", label: "Fardo de 10 picos", sprite: "pick_stone", emoji: "⛏️" },
  { id: "lombrices", label: "Lata con 6 lombrices", sprite: "res_lombriz", emoji: "🪱" },
  { id: "semillas", label: "Sobre de semillas (tu mejor cultivo)", sprite: null, emoji: "🌱" }];
function valesCanjear(id) {
  const it = VALES_SHOP.find(s => s.id === id); if (!it) return;
  const cuesta = valeCosto(id);   // 18/8: sale de lo que entrega, no de una tabla
  if ((G.vales || 0) < cuesta) { toast("Te faltan vales (tenés " + (G.vales || 0) + ", pide " + cuesta + ")"); return; }
  if (id === "semillas") {
    const k = valeMejorCultivo(), nS = valeSemillasN();
    G.seeds[k] = (G.seeds[k] || 0) + nS; toast("+" + nS + " semillas de " + CROP_DEF[k].label);
  } else if (id === "hachas") { G.tools.axe = toolCount("axe") + 10; toast("+10 hachas"); }
  else if (id === "picos") {
    G.picks.owned.stone = true; if (!G.picks.eq) G.picks.eq = "stone";
    G.picks.dur[G.picks.eq] = (G.picks.dur[G.picks.eq] || 0) + 10; toast("+10 picos");
  } else if (id === "lombrices") { if (!tryAddRes("lombriz", 6)) { toast("Bolsa llena — hacé lugar"); return; } toast("+6 lombrices"); }
  G.vales -= cuesta;
  log("Canjeaste " + cuesta + " vales por " + it.label + ".", "good");
  if (window.sfx) sfx("coin");
  refreshHud(); if (typeof refreshPedidos === "function" && isOpen("ov-pedidos")) refreshPedidos();
  if (typeof syncSlots === "function") syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
  if (typeof saveFarm === "function") saveFarm(true);
}

function dailyState() {
  const dd = G.daily || (G.daily = { day: 0, last: "" });
  if (dd.last === dayStamp(0)) return { claimable: false, day: dd.day, lost: false };
  // racha GENTIL (doc): si faltás un día no perdés nada, seguís donde quedaste
  const dia = (dd.day >= 7 || dd.day < 1) ? 1 : dd.day + 1;
  return { claimable: true, day: dia, lost: false };
}
const STREAK_RECOVER_COST = 0;   // legado: ya no hay racha que perder ni que recuperar
// KIT DE BIENVENIDA (15/8): se entrega al abrir el BAÚL por primera vez
var KIT_INICIAL = { axe: 35, rod: 15, pico: 20 };
function kitReclamar() {
  if (G.kitReclamado) return false;
  G.kitReclamado = true;
  G.tools.axe = (G.tools.axe || 0) + KIT_INICIAL.axe;
  G.tools.rod = (G.tools.rod || 0) + KIT_INICIAL.rod;
  G.picks.owned.stone = true;
  G.picks.dur.stone = (G.picks.dur.stone || 0) + KIT_INICIAL.pico;
  if (!G.picks.eq) G.picks.eq = "stone";
  log("Kit de bienvenida: " + KIT_INICIAL.axe + " hachas, " + KIT_INICIAL.pico + " picos y " + KIT_INICIAL.rod + " cañas.", "gold");
  toast("¡Tu kit de bienvenida! 🪓⛏🎣");
  if (window.celebrate) celebrate({ title: "¡KIT DE BIENVENIDA!", sub: "Hachas, picos y cañas para arrancar", big: false, reward: "Ya podés talar, picar y pescar" });
  if (typeof tutoEvent === "function") tutoEvent("kit");
  ensureHotbarDefaults();   // 18/8: los accesos aparecen AHORA, con las herramientas ya en la mano
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar(true);
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}
function claimDaily() {
  const st = dailyState();
  if (!st.claimable) { toast("Ya reclamaste hoy — volvé mañana"); return; }
  const r = DAILY_REWARDS[st.day - 1];
  let detalle = r.label;
  if (r.cos) darCosmetico(r.cos);
  if (r.coleccionable) { const c = coleccionableDeLaSemana(); darCosmetico(c); detalle = "Coleccionable de la semana: " + c; }
  if (r.buffFarm) addBuff("farm", "+" + r.buffFarm + "% vel. de farmeo", r.buffFarm, (r.buffMin || 60) * 60);
  if (r.dish) { G.dishes = G.dishes || {}; G.dishes.papa_asada = (G.dishes.papa_asada || 0) + r.dish; }
  if (r.carnada) G.res.lombriz = (G.res.lombriz || 0) + r.carnada;
  G.daily = { day: st.day, last: dayStamp(0) };
  log("Cofre diario " + st.day + "/7: " + detalle, "gold");
  toast("¡Reclamado! Día " + st.day + "/7");
  if (st.day === 7 && window.celebrate) celebrate({ title: "¡DÍA 7!", sub: "Cofre de recompensas", big: true, reward: detalle });
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshDaily === "function") refreshDaily();
  if (typeof saveFarm === "function") saveFarm(true);
}


/* ================= MODO TESTEO (SOLO TIEMPOS) =====================================
   Comprime TODAS las esperas del juego a segundos y abre los cupos diarios, para que el
   diseñador pueda recorrer el juego entero (cultivos, cocina, animales, armaduras, pase,
   incursiones) sin esperar horas.

   10/8: ACÁ NO SE REGALA NADA. Antes también daba materiales, herramientas, picos, plata,
   $Golden, edificios, parcelas y nodos desbloqueados, y eso hacía imposible probar la
   progresión de verdad: no se sentía cuánto cuesta nada. Ahora el juego se juega igual que
   en la versión final y lo único distinto es que no hay que esperar.

   Importante: esto NO pisa la tabla del diseñador. Los valores reales siguen guardados en
   Supabase; acá solo se cambian los números EN MEMORIA, después de que el juego cargó los
   ajustes. Se apaga con GF.TESTEO = 0 en config.js y todo vuelve a los tiempos reales.

   Lo llama main.js, nunca balance.html: así el panel de balanceo sigue mostrando y guardando
   los valores REALES, y no hay forma de guardar sin querer los de testeo.                  */
function testSeg(seg) {
  const v = Math.round((seg || 0) / Math.max(1, TEST_DIV));
  return Math.max(TEST_MIN, Math.min(TEST_TOPE, v || TEST_MIN));
}
function aplicarTesteo() {
  if (!(window.GF && GF.TESTEO)) return false;

  // --- CULTIVOS: de 9 min / 24 h a unos segundos, respetando el orden entre ellos
  for (const k in CROP_DEF) CROP_DEF[k].growH = testSeg(CROP_DEF[k].growH * 3600) / 3600;
  if (typeof recomputeCropGrow === "function") recomputeCropGrow();
  FIRST_GROW_MS = 3000;                       // las 3 semillas del arranque, casi instantáneas
  SEED_DAILY_BASE = 999; SEED_DAILY_POR_NIVEL = 0;   // sin cupo diario de semillas

  // --- ÁRBOLES, PIEDRAS Y VETAS
  CD.tree = testSeg(CD.tree); CD.rock = testSeg(CD.rock);
  for (const k in ORE_DEF) ORE_DEF[k].cd = testSeg(ORE_DEF[k].cd);
  for (const k in CD_RAPIDO) CD_RAPIDO[k].seg = Math.max(2, Math.round(CD_RAPIDO[k].seg / TEST_DIV));

  // --- HERRERÍA, HORNO Y ALTAR
  MAT_CD_MS = 1000;
  for (let i = 0; i < ARM_CDS.length; i++) ARM_CDS[i] = 1;
  for (const id in ARM_DEF) ARM_DEF[id].cd = 1;
  DUMMY_CD_MS = 15000;

  // --- COCINA: las 14 recetas
  for (const k in RECIPE_DEF) RECIPE_DEF[k].cookS = testSeg(RECIPE_DEF[k].cookS);

  // --- ESTABLO: el ciclo de producción de cada animal
  for (const k in ANIMAL_DEF) ANIMAL_DEF[k].cicloH = testSeg(ANIMAL_DEF[k].cicloH * 3600) / 3600;
  FELIZ_BAJA_H = 0;   // no se ponen tristes mientras se prueba

  // --- COMBATE E INCURSIONES
  for (const k in INCURSIONES) INCURSIONES[k].min = 1;   // vuelven en 1 minuto
  INC_CUPO_DIA = 0;                                       // sin tope diario
  STAM_REGEN_SEG = 2;                                     // la estamina se llena sola enseguida
  STAM_RECARGAS_DIA = 99;

  // --- PASE DE BATALLA: para poder ver los 30 niveles
  PASS_STARS_LVL = 2;

  console.info("[Golden Farm] MODO TESTEO activo: SOLO tiempos comprimidos, no se regala nada. Poner GF.TESTEO = 0 para la versión final.");
  return true;
}
// DESTAPA-BOLSA: si una partida vieja quedó con más stacks de los que entran (le pasaba con el
// regalo de testeo, que ya no existe), lo que sobra queda ESCONDIDO: tirás algo y aparece el
// stack de atrás, como si el juego siguiera dando cosas. Esto lo recorta y solo actúa si de
// verdad no entra. Se deja para reparar los guardados que arrastran el problema.
function testeoDestapar() {
  if (!(window.GF && GF.TESTEO)) return false;
  if (typeof canonicalStacks !== "function" || canonicalStacks().length <= invSlots()) return false;
  let tocado = 0;
  for (const k in G.res) if (G.res[k] > 99) { G.res[k] = 99; tocado++; }
  CROP_ORDER.forEach(k => { if (G.seeds[k] > 50) { G.seeds[k] = 50; tocado++; } });
  if (typeof syncSlots === "function") syncSlots();
  if (tocado && typeof log === "function") log("MODO TESTEO: la bolsa estaba desbordada (" + tocado + " montones de más) y se recortó a 99 por recurso, para que puedas seguir juntando cosas.", "gold");
  return tocado > 0;
}
