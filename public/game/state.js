/* Golden Farm · estado del juego + economía (sin DOM ni canvas) */
window.GF = window.GF || {};
GF.spr = (k) => "assets/farm/" + k + ".png";

// --- estado principal (con algunos recursos de arranque para probar los menús) ---
const G = {
  plata: 0, golden: 20, level: 1, prestige: 0, week: 1,
  res: { madera: 30, piedra: 30, bronce: 25, oro: 15, diamante: 5, netherita: 0,
    papa: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0 },
  seeds: { papa: 10, zanahoria: 5, cebolla: 2, calabacin: 1, repollo: 0, calabaza: 0, brocoli: 0 },  // starter pack
  selSeed: "papa",   // semilla elegida para plantar
  picks: { owned: { stone: true }, dur: { stone: 50 }, eq: "stone" },
  tools: { axe: 60, rod: 40 },   // durabilidad de hacha y caña
  invRows: 0,                    // filas extra de inventario compradas
  slots: [],                     // inventario por casillas: [{kind,key}|null]
  hotbar: [null, null, null, null, null, null, null, null, null, null],  // 10 accesos directos
  hotSel: 0,                     // hueco de la hotbar seleccionado (herramienta "en mano")
  hbInit: false,                 // si ya se cargaron los accesos directos por defecto
  fish: { comun: 0, raro: 0, epico: 0, legendario: 0 },
  plots: [],   // estado de las parcelas: [{state, readyAt, cropKey}] — lo llena la FarmScene
  buffs: [], secPerGameHour: 1, gameHours: 0,
  skills: { fishing: 0, farming: 0, cooking: 0, range: 0, sword: 0, mining: 0, crafting: 0 },
};
window.G = G;

// --- utilidades ---
function fmt(n) { n = Math.floor(n); return n >= 1000 ? (n / 1000).toFixed(n % 1000 < 100 ? 0 : 1).replace(".0", "") + "k" : "" + n; }
function nowMs() { return Date.now(); }
function cdMult() { const t = Date.now(); let m = 1; for (const b of G.buffs) if (b.type === "cd" && b.until > t) m *= b.mult; return m; }
function yieldMult() { const t = Date.now(); let m = 1 + 0.015 * (G.level - 1) + G.prestige * 0.015; for (const b of G.buffs) if (b.type === "yield" && b.until > t) m *= b.mult; return m; }
function addBuff(type, label, mult, durSec) { G.buffs.push({ type, label, mult, until: Date.now() + durSec * 1000 }); }
function hToMs(h) { return h * G.secPerGameHour * 1000 * cdMult(); }

// --- recursos ---
const RES_EMOJI = { madera:"🪵", piedra:"🪨", bronce:"🟫", oro:"🟡", diamante:"💎", netherita:"🔶",
  papa:"🥔", zanahoria:"🥕", cebolla:"🧅", calabacin:"🥒", repollo:"🥬", calabaza:"🎃", brocoli:"🥦" };
const RES_LABEL = { madera:"Madera", piedra:"Piedra", bronce:"Bronce", oro:"Oro", diamante:"Diamante", netherita:"Netherita",
  papa:"Papa", zanahoria:"Zanahoria", cebolla:"Cebolla", calabacin:"Calabacín", repollo:"Repollo", calabaza:"Calabaza", brocoli:"Brócoli" };

// --- cultivos (semillas compradas en la Tienda; se desbloquean por nivel de Cultivo) ---
const CROP_ORDER = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli"];
const CROP_DEF = {
  papa:      { label:"Papa",      emoji:"🥔", lvl:1,  seedCost:1,   grow:6,  yield:2, price:3 },
  zanahoria: { label:"Zanahoria", emoji:"🥕", lvl:2,  seedCost:4,   grow:8,  yield:2, price:5 },
  cebolla:   { label:"Cebolla",   emoji:"🧅", lvl:3,  seedCost:8,   grow:10, yield:2, price:8 },
  calabacin: { label:"Calabacín", emoji:"🥒", lvl:5,  seedCost:16,  grow:12, yield:2, price:14 },
  repollo:   { label:"Repollo",   emoji:"🥬", lvl:7,  seedCost:30,  grow:15, yield:2, price:24 },
  calabaza:  { label:"Calabaza",  emoji:"🎃", lvl:10, seedCost:60,  grow:18, yield:1, price:45 },
  brocoli:   { label:"Brócoli",   emoji:"🥦", lvl:13, seedCost:120, grow:22, yield:1, price:70 },
};
function farmLevel() { return skillInfo(G.skills.farming).lvl; }
function cropUnlocked(k) { const cd = CROP_DEF[k]; return !!cd && farmLevel() >= cd.lvl; }
function selectSeed(k) { if (!CROP_DEF[k]) return; G.selSeed = k; if (isOpen("ov-inv")) refreshInv(); }
function buySeed(k) {
  const cd = CROP_DEF[k]; if (!cd) return;
  if (!cropUnlocked(k)) { toast("Necesitás Cultivo nivel " + cd.lvl); return; }
  if (G.plata < cd.seedCost) { toast("Te falta plata"); return; }
  G.plata -= cd.seedCost; G.seeds[k] = (G.seeds[k] || 0) + 1;
  log(`🛒 Compraste 1 semilla de ${cd.label}.`); toast("🌱 +1 " + cd.label);
  refreshHud(); if (typeof refreshSeedShop === "function") refreshSeedShop(); if (isOpen("ov-inv")) refreshInv();
}

// --- skills ---
const SKILL_DEFS = [["farming","🌾","Cultivo"],["fishing","🎣","Pesca"],["mining","⛏️","Minería"],
  ["sword","⚔️","Espada"],["range","🏹","Arco"],["cooking","🍳","Cocina"],["crafting","🔨","Artesanía"]];
const SKILL_NAME = {}; SKILL_DEFS.forEach(([k,,nm]) => SKILL_NAME[k] = nm);
function skillInfo(xp) { let lvl=1, need=50, acc=0; while (xp >= acc+need && lvl<99){ acc+=need; lvl++; need=Math.round(need*1.35);} return { lvl, into: xp-acc, need }; }
function avgSkillLevel() { let s=0,n=0; for (const k in G.skills){ s+=skillInfo(G.skills[k]).lvl; n++; } return n ? s/n : 1; }
function addXp(sk, amt) {
  if (!(sk in G.skills)) return;
  const before = skillInfo(G.skills[sk]).lvl;
  G.skills[sk] += amt;
  const after = skillInfo(G.skills[sk]).lvl;
  if (after > before) { log(`📈 ${SKILL_NAME[sk]} subió a nivel ${after}.`, "good"); toast("📈 " + SKILL_NAME[sk] + " nivel " + after); }
  if (isOpen("ov-skills")) refreshSkills();
}

// --- niveles de granja ---
const LEVELS = { 2:{papa:20,madera:10}, 3:{papa:35,madera:20,piedra:5}, 4:{zanahoria:35,madera:35,piedra:12},
  5:{zanahoria:60,madera:55,piedra:22}, 6:{cebolla:60,madera:80,piedra:36}, 7:{cebolla:100,madera:115,piedra:55},
  8:{calabaza:30,oro:3}, 9:{calabaza:60,oro:6}, 10:{brocoli:50,oro:10} };
function canLevel() { if (G.level >= 10) return false; const n = LEVELS[G.level+1]; for (const k in n) if ((G.res[k]||0) < n[k]) return false; return true; }
function levelUp() { if (!canLevel()) { toast("Te faltan recursos"); return; } const n = LEVELS[G.level+1]; for (const k in n) G.res[k]-=n[k]; G.level++; log(`⭐ ¡Granja nivel ${G.level}! Yield +${((yieldMult()-1)*100).toFixed(1)}%.`, "gold"); toast("¡Nivel " + G.level + "!"); refreshBarn(); refreshHud(); }
function prestige() { if (G.level < 10) { toast("Llegá a nivel 10"); return; } G.prestige++; G.level=1; for (const k in G.res) G.res[k]=0; log(`♻️ Reinicio. Prestigio ${G.prestige}.`, "gold"); toast("Prestigio " + G.prestige + "!"); refreshBarn(); refreshHud(); }

// --- minerales y picos ---
const ORE_ORDER = ["piedra","bronce","oro","diamante","netherita"];
const ORE_DEF = {
  piedra:   { tier:0, label:"Piedra",    emoji:"🪨", sprite:"node_stone",     cd:60,  yield:2, price:6 },
  bronce:   { tier:1, label:"Bronce",    emoji:"🟫", sprite:"node_bronze",    cd:75,  yield:2, price:12 },
  oro:      { tier:2, label:"Oro",       emoji:"🟡", sprite:"node_gold",      cd:90,  yield:1, price:30 },
  diamante: { tier:3, label:"Diamante",  emoji:"💎", sprite:"node_diamond",   cd:110, yield:1, price:80 },
  netherita:{ tier:4, label:"Netherita", emoji:"🔶", sprite:"node_netherite", cd:150, yield:1, price:200 },
};
const PICK_ORDER = ["stone","bronze","gold","diamond","netherite"];
const PICK_DEF = {
  stone:    { tier:0, label:"Pico de Piedra",    mineTier:1, dur:50,   cost:{piedra:10,madera:5},    sprite:"pick_stone" },
  bronze:   { tier:1, label:"Pico de Bronce",    mineTier:2, dur:150,  cost:{bronce:20,madera:10},   sprite:"pick_bronze" },
  gold:     { tier:2, label:"Pico de Oro",       mineTier:3, dur:80,   cost:{oro:15,bronce:10},      sprite:"pick_gold", fast:true },
  diamond:  { tier:3, label:"Pico de Diamante",  mineTier:4, dur:500,  cost:{diamante:10,oro:20},    sprite:"pick_diamond" },
  netherite:{ tier:4, label:"Pico de Netherita", mineTier:4, dur:2000, cost:{netherita:5,diamante:10},sprite:"pick_netherite" },
};
function equippedPick() { return (G.picks.eq && G.picks.owned[G.picks.eq]) ? G.picks.eq : null; }
function canAfford(c) { for (const k in c) if ((G.res[k]||0) < c[k]) return false; return true; }
function payCost(c) { for (const k in c) G.res[k]-=c[k]; }
function craftPick(id) { const pd=PICK_DEF[id]; if (G.picks.owned[id]) { equipPick(id); return; } if (!canAfford(pd.cost)) { toast("Te faltan materiales"); return; } payCost(pd.cost); G.picks.owned[id]=true; G.picks.dur[id]=pd.dur; G.picks.eq=id; addXp("crafting",10+pd.tier*4); log("🛠️ Crafteaste "+pd.label+" y lo equipaste.","gold"); toast("🛠️ "+pd.label); refreshForge(); refreshInv(); }
function repairCostOf(id) { const pd=PICK_DEF[id]; const c={}; for (const k in pd.cost) c[k]=Math.max(1,Math.ceil(pd.cost[k]*0.3)); return c; }
function repairPick(id) { const pd=PICK_DEF[id]; if (!G.picks.owned[id]) return; if ((G.picks.dur[id]||0)>=pd.dur){ toast("Ya está al 100%"); return; } const c=repairCostOf(id); if (!canAfford(c)){ toast("Te faltan materiales para reparar"); return; } payCost(c); G.picks.dur[id]=pd.dur; log("🔧 Reparaste "+pd.label+" (100%).","good"); toast("🔧 Reparado"); refreshForge(); }
function equipPick(id) { if (!G.picks.owned[id]){ toast("No lo tenés"); return; } G.picks.eq=id; log("⛏️ Equipaste "+PICK_DEF[id].label+".");  toast("Equipado"); refreshForge(); refreshInv(); }

// --- herramientas (hacha + caña con durabilidad; el pico se maneja aparte) ---
const TOOL_DEF = {
  axe: { label:"Hacha", emoji:"🪓", sprite:"axe",         max:60, repair:{madera:6} },
  rod: { label:"Caña",  emoji:"🎣", sprite:"fishing_rod", max:40, repair:{madera:4} },
};
function toolDur(id) { return (G.tools && G.tools[id] != null) ? G.tools[id] : (TOOL_DEF[id] ? TOOL_DEF[id].max : 0); }
function useTool(id) { const d = toolDur(id); if (d <= 0) return false; G.tools[id] = d - 1; return true; }
function repairTool(id) { const td = TOOL_DEF[id]; if (!td) return; if (toolDur(id) >= td.max) { toast("Ya está al 100%"); return; } if (!canAfford(td.repair)) { toast("Te faltan materiales para reparar"); return; } payCost(td.repair); G.tools[id] = td.max; log("🔧 Reparaste " + td.label + " (100%).", "good"); toast("🔧 Reparado"); refreshForge(); if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-inv")) refreshInv(); }

// --- inventario (base + filas extra) ---
const INV_BASE = 18, INV_MAX_ROWS = 5;   // 18 base, hasta +5 filas de 6 = 48
function invSlots() { return INV_BASE + (G.invRows || 0) * 6; }
function nextInvCost() {
  const r = G.invRows || 0;
  if (r >= INV_MAX_ROWS) return null;
  if (r === 0) return { type: "res", cost: { piedra: 20, bronce: 10 } };   // primera fila: minerales
  return { type: "plata", cost: 100 * Math.pow(2, r - 1) };                 // siguientes: plata (100,200,400,800)
}
function expandInv() {
  const nc = nextInvCost();
  if (!nc) { toast("Bolsa al máximo"); return; }
  if (nc.type === "res") { if (!canAfford(nc.cost)) { toast("Te faltan minerales"); return; } payCost(nc.cost); }
  else { if (G.plata < nc.cost) { toast("Te falta plata"); return; } G.plata -= nc.cost; }
  G.invRows = (G.invRows || 0) + 1;
  log("🎒 Ampliaste la bolsa (+6 espacios).", "good"); toast("🎒 +6 espacios");
  refreshInv(); refreshHud();
}
function invStacks() {
  const st = [];
  st.push({ sprite:"hoe", em:"🪝", nm:"Azada" });
  st.push({ sprite:"axe", em:"🪓", nm:"Hacha ("+toolDur("axe")+"/"+TOOL_DEF.axe.max+")" });
  { const eqp = equippedPick();
    if (eqp) st.push({ sprite:PICK_DEF[eqp].sprite, em:"⛏️", nm:PICK_DEF[eqp].label+" ("+(G.picks.dur[eqp]||0)+"/"+PICK_DEF[eqp].dur+")" });
    else st.push({ sprite:"pick_stone", em:"⛏️", nm:"Sin pico" }); }
  st.push({ sprite:"fishing_rod", em:"🎣", nm:"Caña ("+toolDur("rod")+"/"+TOOL_DEF.rod.max+")" });
  for (const r of ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","madera","piedra","bronce","oro","diamante","netherita"]) {
    let n = Math.floor(G.res[r] || 0);
    while (n > 0) { const c = Math.min(99, n); st.push({ em:RES_EMOJI[r], nm:RES_LABEL[r], count:c }); n -= 99; }
  }
  return st;
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
const ITEM_RES_ORDER = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","madera","piedra","bronce","oro","diamante","netherita"];
function descKey(d) { return d ? d.kind + ":" + d.key : ""; }
function canonicalStacks() {
  const list = [];
  ["hoe", "axe", "rod"].forEach(k => list.push({ kind: "tool", key: k }));
  PICK_ORDER.forEach(id => { if (G.picks.owned[id]) list.push({ kind: "pick", key: id }); });
  ITEM_RES_ORDER.forEach(r => { let n = Math.floor(G.res[r] || 0); while (n > 0) { list.push({ kind: "res", key: r }); n -= 99; } });
  CROP_ORDER.forEach(s => { let n = Math.floor(G.seeds[s] || 0); while (n > 0) { list.push({ kind: "seed", key: s }); n -= 99; } });
  return list;
}
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
  if (d.kind === "tool") return d.key;   // "hoe" | "axe" | "rod"
  if (d.kind === "pick") return "pick";
  if (d.kind === "seed") return "seed";
  return null;                            // recurso u otro
}
// la primera vez, precarga la hotbar con las herramientas básicas
function ensureHotbarDefaults() {
  if (G.hbInit) return;
  if (!Array.isArray(G.hotbar)) G.hotbar = [];
  while (G.hotbar.length < 10) G.hotbar.push(null);
  if (!G.hotbar.some(Boolean)) {
    G.hotbar[0] = { kind: "tool", key: "hoe" };
    G.hotbar[1] = { kind: "tool", key: "axe" };
    G.hotbar[2] = { kind: "pick", key: (G.picks && G.picks.eq) || "stone" };
    G.hotbar[3] = { kind: "tool", key: "rod" };
    G.hotbar[4] = { kind: "seed", key: G.selSeed || "papa" };
  }
  G.hbInit = true;
}

// --- mercado ---
const PRICE = { madera:3, piedra:6, bronce:12, oro:30, diamante:80, netherita:200,
  papa:3, zanahoria:5, cebolla:8, calabacin:14, repollo:24, calabaza:45, brocoli:70 };
const SELLABLE = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","madera","piedra","bronce","oro","diamante","netherita"];
let marketCur = "plata";
function marketUnit(res) { return marketCur === "plata" ? PRICE[res] : PRICE[res]/10; }
function sellItem(res) {
  const inp = $("mq-"+res); let q = Math.floor(parseFloat(inp && inp.value) || 0);
  q = Math.max(0, Math.min(q, G.res[res]));
  if (q <= 0) { toast("Poné una cantidad"); return; }
  if (marketCur === "plata") { const t=q*PRICE[res]; G.plata+=t; G.res[res]-=q; log(`🪙 Vendiste ${q} ${RES_LABEL[res]} por ${t} de plata.`); toast("+"+t+" plata"); }
  else { const g=Math.floor(q*PRICE[res]/10); if (g<1){ toast("Muy poca cantidad para $Golden"); return; } G.res[res]-=q; G.golden+=g; log(`✨ Vendiste ${q} ${RES_LABEL[res]} por ${g} $Golden.`,"gold"); toast("+"+g+" $Golden"); }
  refreshMarket(); refreshHud();
}

// --- pesca ---
const FISH_COST = 5;
function goFishing() {
  if (toolDur("rod") <= 0) { toast("🎣 Caña rota — reparala en la Herrería"); return; }
  if (G.golden < FISH_COST) { toast("Necesitás 5 ✨ para pescar"); return; }
  G.golden -= FISH_COST; useTool("rod");
  if (toolDur("rod") <= 0) { log("🎣 ¡La caña se rompió! Reparala en la Herrería.", "bad"); toast("🎣 ¡Caña rota!"); }
  const r = Math.random();
  let rar; if (r < 0.60) rar = "comun"; else if (r < 0.85) rar = "raro"; else if (r < 0.97) rar = "epico"; else rar = "legendario";
  G.fish[rar]++; addXp("fishing", 8); addXp("cooking", 3);
  if (rar === "comun") { const p = 8 + Math.floor(Math.random() * 8); G.plata += p; log(`🐟 Pez común: +${p} plata.`); toast("🐟 +" + p + " 🪙"); }
  else if (rar === "raro") { addBuff("yield", "Yield +10%", 1.10, 90); log("🐠 Pez raro: buff Yield +10% (90s).", "good"); toast("🐠 ¡Buff de yield!"); }
  else if (rar === "epico") { addBuff("cd", "Cooldowns -25%", 0.75, 90); log("🐡 Pez épico: cooldowns -25% (90s).", "good"); toast("🐡 ¡Cooldowns -25%!"); }
  else { G.golden += 15; tryAddRes("oro", 1); log("🐋 ¡Legendario! +15 ✨ y +1 Oro.", "gold"); toast("🐋 ¡LEGENDARIO!"); }
  refreshHud();
}
