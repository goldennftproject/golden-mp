/* La Herrería anuncia la puerta de Combate ANTES de intentar forjar.
   Ejecuta el render real sobre las tablas y la XP reales; sólo sustituye iconos y efectos de UI.
   No carga Auth, guardados, escenas ni servicios externos.
     node tools/test-forja-nivel-combate.js */
const fs = require("fs"), vm = require("vm"), assert = require("assert/strict");
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><div id="ov-forge"><button class="forgetab active" data-forge="armas">Armas</button><div id="forge-craft"></div><div id="forge-armas"></div><div id="forge-repair"></div></div>');
const ctx = { console, Math, Date, JSON, document: dom.window.document, innerWidth: 1280 };
ctx.window = ctx;
ctx.$ = id => ctx.document.getElementById(id);
vm.createContext(ctx);
for (const f of ["config.js", "state.js"])
  vm.runInContext(fs.readFileSync("public/game/" + f, "utf8"), ctx, { filename: f });
const X = vm.runInContext("({ARM_DEF, ARM_ORDER, ARM_RAREZAS, ARMA_ENTRADA})", ctx);
const G = ctx.G;
ctx.resIc = k => '<span class="test-res">' + k + '</span>';
ctx.coinIc = k => '<span class="test-coin">' + k + '</span>';
for (const name of ["toast", "log", "refreshHud", "syncSlots", "saveFarm", "tutoEvent", "applyCombatHp"])
  ctx[name] = () => {};
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const start = UI.indexOf("var FORGE_FOCO_PC"), end = UI.indexOf("function refreshTools()", start);
assert(start >= 0 && end > start, "Encuentra el render real y sus auxiliares de Herrería");
vm.runInContext(UI.slice(start, end), ctx, { filename: "ui-forge.js" });
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log("  ok   " + name); };
function level(n) {
  G.combatXp = 0;
  for (let i = 1; i < n; i++) G.combatXp += ctx.skillNeed(i);
  assert.equal(ctx.combatInfo().lvl, n);
}
function reset(n = 1) {
  G.armasUnlocked = true; G.weapons = {}; G.armCd = {}; G.gear.arma = null;
  G.plata = 1000000; G.res = {};
  for (const w of Object.values(X.ARM_DEF))
    for (const k of Object.keys(w.cost)) G.res[k] = 1000000;
  G.tuto = { done: true, step: 99 };
  level(n);
}
const button = id => ctx.document.querySelector('[data-carm="' + id + '"]');
function labelFor(el) { return el.closest(".forge-row").querySelector(".forge-combat-level"); }
function render() { ctx.refreshForge(); }

check("las veinte armas anuncian su nivel de Combate y se habilitan justo al alcanzarlo", () => {
  const required = { madera: 1, piedra: 4, bronce: 8, oro: 12, diamante: 16 };
  assert.equal(X.ARM_ORDER.length, 20);
  for (const id of X.ARM_ORDER) {
    const w = X.ARM_DEF[id], need = required[w.rareza];
    assert.equal(w.lvl, need, id + ": escala vigente");
    reset(need); render();
    const b = button(id), label = labelFor(b);
    assert(b, id + ": tiene Forjar");
    assert(label && label.textContent.includes("Para forjar: Combate Nv. " + need), id + ": nivel visible");
    assert.equal(b.disabled, false, id + ": disponible al nivel requerido");
    assert(!label.textContent.includes("Tienes"), id + ": no anuncia falta de nivel al alcanzarlo");
    if (need > 1) {
      level(need - 1); render();
      const low = button(id), why = labelFor(low);
      assert.equal(low.disabled, true, id + ": cerrado un nivel antes");
      assert(why.textContent.includes("Tienes Nv. " + (need - 1)), id + ": dice nivel actual");
      assert(new RegExp("Combate\\D+" + need + "\\b").test(low.title), id + ": motivo en el botón");
    }
  }
});

check("un botón bloqueado no ejecuta Forjar ni cobra al pulsarlo", () => {
  reset(3); render();
  const b = button("espada_piedra"), snapshot = JSON.stringify({ res: G.res, plata: G.plata, weapons: G.weapons });
  let clicks = 0; b.addEventListener("click", () => clicks++); b.click();
  assert.equal(clicks, 0);
  assert.equal(JSON.stringify({ res: G.res, plata: G.plata, weapons: G.weapons }), snapshot);
});

check("al subir Combate y refrescar, Forjar se habilita y desaparece el aviso de nivel insuficiente", () => {
  reset(7); render();
  assert.equal(button("arco_bronce").disabled, true);
  level(8); render();
  assert.equal(button("arco_bronce").disabled, false);
  assert(!labelFor(button("arco_bronce")).textContent.includes("Tienes"));
});

check("alcanzar Combate no elimina las puertas de materiales, Plata o enfriamiento", () => {
  const id = "mazo_oro", w = X.ARM_DEF[id];
  reset(w.lvl); render(); assert.equal(button(id).disabled, false);
  G.res[Object.keys(w.cost)[0]] = 0; render(); assert.equal(button(id).disabled, true, "faltan materiales");
  reset(w.lvl); G.plata = w.plata - 1; render(); assert.equal(button(id).disabled, true, "falta Plata");
  reset(w.lvl); G.armCd[id] = ctx.nowMs() + 60000; render();
  assert.equal(button(id), null, "el enfriamiento conserva su botón propio");
  const cooldown = [...ctx.document.querySelectorAll("#forge-armas .forge-row")].find(r => r.querySelector(".fnm").textContent.includes(w.label));
  assert.equal(cooldown.querySelector("button").disabled, true, "enfriamiento bloqueado");
  assert(cooldown.querySelector(".forge-combat-level"), "el enfriamiento también muestra nivel requerido");
});

check("la espada de entrada anuncia Combate 1 y se puede forjar con la sección cerrada", () => {
  reset(1); G.armasUnlocked = false; render();
  const b = button(X.ARMA_ENTRADA);
  assert.equal(b.disabled, false);
  assert(labelFor(b).textContent.includes("Combate Nv. 1"));
  assert(ctx.$("forge-unlock-armas"), "mantiene el desbloqueo separado de la sección");
  assert.equal(ctx.document.querySelectorAll("#forge-armas [data-carm]").length, 1);
});

check("un arma que ya pertenece al jugador se puede equipar y reparar aunque falte Combate para forjarla", () => {
  reset(1); const id = "espada_diamante", w = X.ARM_DEF[id];
  G.weapons[id] = { dur: w.dur - 1 }; render();
  const equip = ctx.document.querySelector('[data-eqarm="' + id + '"]');
  assert(equip && !equip.disabled);
  assert(labelFor(equip).textContent.includes("Combate Nv. 16"));
  assert.equal(button(id).disabled, true, "otra copia conserva el requisito de Combate");
  assert.equal(button(id).textContent, "Forjar otra");
  assert.equal(ctx.document.querySelector('[data-rarm="' + id + '"]').disabled, false);
  equip.click();
  assert.equal(G.gear.arma, id);
  assert.equal(ctx.document.querySelector('[data-eqarm="' + id + '"]'), null);
});

check("las veinte armas propias ofrecen otra copia con el mismo coste sin reemplazar la ficha", () => {
  for (const id of X.ARM_ORDER) {
    const w = X.ARM_DEF[id]; reset(w.lvl);
    G.weapons[id] = { dur: w.dur - 1, plus: 3, sockets: ['fuego'] };
    const before = JSON.stringify(G.weapons[id]); render();
    const forge = button(id), equip = ctx.document.querySelector('[data-eqarm="' + id + '"]');
    assert(forge && !forge.disabled, id + ': Forjar otra disponible');
    assert.equal(forge.textContent, 'Forjar otra'); assert(equip && !equip.disabled);
    assert(forge.closest('.forge-row').textContent.includes('Coste por arma:'), id + ': coste por copia visible');
    assert.equal(JSON.stringify(G.weapons[id]), before);
  }
});

check("la espada propia de entrada conserva el enfriamiento aunque la sección siga cerrada", () => {
  reset(1); G.armasUnlocked = false; G.weapons[X.ARMA_ENTRADA] = { dur: 9 }; render();
  assert.equal(button(X.ARMA_ENTRADA).textContent, 'Forjar otra');
  G.armCd[X.ARMA_ENTRADA] = ctx.nowMs() + 60000; render();
  assert.equal(button(X.ARMA_ENTRADA), null);
  const equip = ctx.document.querySelector('[data-eqarm="' + X.ARMA_ENTRADA + '"]');
  assert(equip && !equip.disabled); assert(equip.closest('.fbtns').querySelector('button').disabled);
});

dom.window.close();
console.log("\n✓ " + checks + " contratos de Herrería; 20 armas y umbrales de Combate verificados.\n");
