/* Golden Farm · estado del juego + economía (sin DOM ni canvas) */
window.GF = window.GF || {};
GF.spr = (k) => "assets/farm/" + k + ".png";

// --- estado principal (con algunos recursos de arranque para probar los menús) ---
const G = {
  plata: 0, golden: 20, level: 1, prestige: 0, week: 1,
  res: { trigo: 12, madera: 30, piedra: 30, bronce: 25, oro: 15, diamante: 5, netherita: 0 },
  picks: { owned: { stone: true }, dur: { stone: 50 }, eq: "stone" },
  fish: { comun: 0, raro: 0, epico: 0, legendario: 0 },
  plots: [],   // estado de las parcelas: [{state, readyAt}] — lo llena la FarmScene
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
const RES_EMOJI = { trigo:"🌾", madera:"🪵", piedra:"🪨", bronce:"🟫", oro:"🟡", diamante:"💎", netherita:"🔶" };
const RES_LABEL = { trigo:"Trigo", madera:"Madera", piedra:"Piedra", bronce:"Bronce", oro:"Oro", diamante:"Diamante", netherita:"Netherita" };

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
const LEVELS = { 2:{trigo:20,madera:10}, 3:{trigo:40,madera:20,piedra:5}, 4:{trigo:70,madera:35,piedra:12},
  5:{trigo:110,madera:55,piedra:22}, 6:{trigo:160,madera:80,piedra:36}, 7:{trigo:230,madera:115,piedra:55},
  8:{trigo:300,oro:3}, 9:{trigo:380,oro:6}, 10:{trigo:480,oro:10} };
function canLevel() { if (G.level >= 10) return false; const n = LEVELS[G.level+1]; for (const k in n) if ((G.res[k]||0) < n[k]) return false; return true; }
function levelUp() { if (!canLevel()) { toast("Te faltan recursos"); return; } const n = LEVELS[G.level+1]; for (const k in n) G.res[k]-=n[k]; G.level++; log(`⭐ ¡Granja nivel ${G.level}! Yield +${((yieldMult()-1)*100).toFixed(1)}%.`, "gold"); toast("¡Nivel " + G.level + "!"); refreshBarn(); refreshHud(); }
function prestige() { if (G.level < 10) { toast("Llegá a nivel 10"); return; } G.prestige++; G.level=1; G.res={trigo:0,madera:0,piedra:0,bronce:0,oro:0,diamante:0,netherita:0}; log(`♻️ Reinicio. Prestigio ${G.prestige}.`, "gold"); toast("Prestigio " + G.prestige + "!"); refreshBarn(); refreshHud(); }

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

// --- inventario ---
const INV_SLOTS = 30;
function invStacks() {
  const st = [];
  st.push({ sprite:"hoe", em:"🪝", nm:"Azada" });
  st.push({ sprite:"axe", em:"🪓", nm:"Hacha" });
  { const eqp = equippedPick();
    if (eqp) st.push({ sprite:PICK_DEF[eqp].sprite, em:"⛏️", nm:PICK_DEF[eqp].label+" ("+(G.picks.dur[eqp]||0)+"/"+PICK_DEF[eqp].dur+")" });
    else st.push({ sprite:"pick_stone", em:"⛏️", nm:"Sin pico" }); }
  st.push({ sprite:"fishing_rod", em:"🎣", nm:"Caña" });
  for (const r of ["trigo","madera","piedra","bronce","oro","diamante","netherita"]) {
    let n = Math.floor(G.res[r]);
    while (n > 0) { const c = Math.min(99, n); st.push({ em:RES_EMOJI[r], nm:RES_LABEL[r], count:c }); n -= 99; }
  }
  return st;
}
function tryAddRes(key, amt) { const b = G.res[key]; G.res[key]=b+amt; if (invStacks().length > INV_SLOTS) { G.res[key]=b; return false; } if (isOpen("ov-inv")) refreshInv(); return true; }

// --- mercado ---
const PRICE = { trigo:2, madera:3, piedra:6, bronce:12, oro:30, diamante:80, netherita:200 };
const SELLABLE = ["trigo","madera","piedra","bronce","oro","diamante","netherita"];
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
  if (G.golden < FISH_COST) { toast("Necesitás 5 ✨ para pescar"); return; }
  G.golden -= FISH_COST;
  const r = Math.random();
  let rar; if (r < 0.60) rar = "comun"; else if (r < 0.85) rar = "raro"; else if (r < 0.97) rar = "epico"; else rar = "legendario";
  G.fish[rar]++; addXp("fishing", 8); addXp("cooking", 3);
  if (rar === "comun") { const p = 8 + Math.floor(Math.random() * 8); G.plata += p; log(`🐟 Pez común: +${p} plata.`); toast("🐟 +" + p + " 🪙"); }
  else if (rar === "raro") { addBuff("yield", "Yield +10%", 1.10, 90); log("🐠 Pez raro: buff Yield +10% (90s).", "good"); toast("🐠 ¡Buff de yield!"); }
  else if (rar === "epico") { addBuff("cd", "Cooldowns -25%", 0.75, 90); log("🐡 Pez épico: cooldowns -25% (90s).", "good"); toast("🐡 ¡Cooldowns -25%!"); }
  else { G.golden += 15; tryAddRes("oro", 1); log("🐋 ¡Legendario! +15 ✨ y +1 Oro.", "gold"); toast("🐋 ¡LEGENDARIO!"); }
  refreshHud();
}
