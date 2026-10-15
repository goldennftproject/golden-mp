"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const E = require("../public/game/economy-lab-core.js");
const T = Date.UTC(2026, 9, 15, 12), root = path.resolve(__dirname, "../public");
let checks = 0;
function test(name, run) { run(); checks++; console.log("OK " + name); }
function action(s, a, t = T) { const r = E.dispatch(s, a, t); assert.equal(r.ok, true, r.error); return r.state; }
function collect(s, id, n) { for (let i = 0; i < n; i++) s = action(s, { type: "collect", id }); return s; }
test("inicio gradual y capacidad compartida", () => {
  const s = E.create(T); assert.equal(E.used(s), 4); assert.equal(E.capacity(s, T), 4);
  assert.equal(s.tools.axe, 6); assert.equal(s.silver, 3000);
  const r = E.dispatch(s, { type: "buyNode", key: "tree" }, T);
  assert.equal(r.ok, false); assert.equal(r.state, s); assert.equal(s.nodes.length, 4);
});
test("cultivo completo sin adelantar sus tiempos", () => {
  let s = action(E.create(T), { type: "seed", key: "papa", qty: 1 });
  s = action(s, { type: "plant", key: "papa", id: 1 });
  assert.equal(E.dispatch(s, { type: "collect", id: 1 }, T + 3 * E.MIN - 1).ok, false);
  s = action(s, { type: "collect", id: 1 }, T + 3 * E.MIN);
  s = action(s, { type: "sell", key: "papa", qty: 1 }, T + 3 * E.MIN);
  assert.equal(s.silver, 4000); assert.equal(s.res.papa, 0);
});
test("30/40 minutos y máximo cuatro cargas", () => {
  let s = collect(collect(E.create(T), 3, 4), 4, 4);
  E.tick(s, T + 30 * E.MIN); assert.equal(s.nodes[2].charges, 1); assert.equal(s.nodes[3].charges, 0);
  E.tick(s, T + 40 * E.MIN); assert.equal(s.nodes[3].charges, 1);
  E.tick(s, T + 10 * E.DAY); assert.equal(s.nodes[2].charges, 4); assert.equal(s.nodes[3].charges, 4);
});
test("cobertizo conserva cargas y resto de reloj, no produce", () => {
  let s = collect(E.create(T), 3, 4);
  s = action(s, { type: "store", id: 3 }, T + 10 * E.MIN);
  s = action(s, { type: "activate", id: 3 }, T + E.DAY);
  assert.equal(s.nodes[2].charges, 0); assert.equal(s.nodes[2].nextAt, T + E.DAY + 20 * E.MIN);
});
test("cultivo guardado conserva tiempo pendiente", () => {
  let s = action(E.create(T), { type: "seed", key: "papa", qty: 1 });
  s = action(s, { type: "plant", key: "papa", id: 1 });
  s = action(s, { type: "store", id: 1 }, T + E.MIN);
  s = action(s, { type: "activate", id: 1 }, T + E.DAY);
  assert.equal(s.nodes[0].readyAt, T + E.DAY + 2 * E.MIN);
});
test("comprar nodos no regala cargas para revender", () => {
  let s = E.create(T); s.silver = 100000;
  s = action(s, { type: "store", id: 1 });
  s = action(s, { type: "buyNode", key: "tree" });
  assert.equal(s.nodes[4].charges, 0);
  assert.equal(E.dispatch(s, { type: "collect", id: 5 }, T).ok, false);
});
test("primera expansión da un cupo y un único nodo incluido", () => {
  let s = E.create(T); s.silver = 20000; s.res.madera = 2; s.res.piedra = 2;
  s = action(s, { type: "expand" }); E.tick(s, T + 10 * E.MIN);
  assert.equal(E.capacity(s, s.lastAt), 5); assert.equal(s.voucher, 1);
  s = action(s, { type: "buyNode", key: "rock", voucher: true }, s.lastAt);
  assert.equal(s.voucher, 0); assert.equal(s.silver, 0); assert.equal(E.used(s), 5);
});
test("VIP aumenta capacidad y vence incluso con ausencia larga", () => {
  let s = action(E.create(T), { type: "vipTrial" }); s.silver = 100000;
  assert.equal(E.capacity(s, T), 6);
  s = action(s, { type: "buyNode", key: "tree" });
  s = action(s, { type: "buyNode", key: "rock" });
  E.tick(s, T + 31 * E.DAY);
  assert.equal(E.used(s), 4); assert.equal(s.nodes.length, 6);
  assert.equal(s.nodes[4].active, false); assert.equal(s.nodes[4].pausedAt, T + 30 * E.DAY);
  assert.equal(s.nodes[4].charges, 4); assert.equal(E.dispatch(s, { type: "vipTrial" }, s.lastAt).ok, false);
});
test("lote y ventas divididas pagan lo mismo; otro recurso no se deprecia", () => {
  let s = E.create(T); s.res.madera = 100;
  const price = E.quote(s, "piedra", 1).total;
  const batch = action(s, { type: "sell", key: "madera", qty: 10 });
  for (let i = 0; i < 10; i++) s = action(s, { type: "sell", key: "madera", qty: 1 });
  assert.equal(batch.silver, s.silver); assert.equal(E.quote(s, "piedra", 1).total, price);
  assert.ok(E.quote(s, "madera", 1).total < E.RES.madera.base);
  const low = E.quote(s, "madera", 1).total; E.tick(s, T + 8 * E.HOUR);
  assert.ok(E.quote(s, "madera", 1).total > low);
});
test("presupuesto, demanda y cantidades invalidas son atómicos", () => {
  let s = E.create(T); s.res.madera = 1000; s.market.spent = 5000000;
  for (const qty of [-1, 0, 1.5, NaN, Infinity, 10001, 1]) {
    const before = JSON.stringify(s), r = E.dispatch(s, { type: "sell", key: "madera", qty }, T);
    assert.equal(r.ok, false); assert.equal(JSON.stringify(s), before);
  }
  s.market.spent = 0; s.market.sold.madera = 400;
  assert.equal(E.dispatch(s, { type: "sell", key: "madera", qty: 1 }, T).ok, false);
});
test("cupo de exportación ponderado Free/VIP y créditos separados", () => {
  let s = E.create(T); s.res.madera = 100;
  s = action(s, { type: "export", key: "madera", qty: 10 });
  assert.equal(E.dispatch(s, { type: "export", key: "madera", qty: 1 }, T).ok, false);
  s = action(s, { type: "vipTrial" }); s = action(s, { type: "export", key: "madera", qty: 20 });
  const money = s.silver; s = action(s, { type: "settle" });
  assert.ok(s.trialCredits > 0); assert.equal(s.silver, money); assert.equal(s.points, 0);
  s.points = 10; assert.equal(E.dispatch(s, { type: "settle" }, T).ok, false);
});
test("herrería secuencial y duraciones", () => {
  let s = E.create(T); s.workshop = true; s.res.madera = 3; s.res.piedra = 3;
  s = action(s, { type: "craft", key: "tablon" }); s = action(s, { type: "craft", key: "bloque" });
  assert.equal(s.jobs[0].until, T + 10 * E.MIN); assert.equal(s.jobs[1].until, T + 10 * E.MIN + 800000);
});
test("idempotencia y guardados dañados", () => {
  const s = action(E.create(T), { type: "seed", key: "papa", qty: 1, op: "same" });
  const r = E.dispatch(s, { type: "seed", key: "papa", qty: 1, op: "same" }, T);
  assert.equal(r.duplicate, true); assert.equal(r.state.silver, 2000);
  assert.equal(E.valid(JSON.parse(JSON.stringify(s))), true);
  const bad = structuredClone(s); delete bad.market.volume; assert.equal(E.valid(bad), false);
});
test("todos los sprites y hojas de estilo referenciados existen", () => {
  for (const d of [...Object.values(E.NODE), ...Object.values(E.RES)]) assert.ok(fs.existsSync(path.join(root, "assets/farm/" + d.sprite + ".png")), d.sprite);
  assert.ok(fs.existsSync(path.join(root, "economia.css")));
});
async function uiTests() {
  const html = fs.readFileSync(path.join(root, "economia.html"), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost/economia.html", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window, key = "golden-economy-lab-v1";
  w.localStorage.setItem("golden-real-sentinel", "NO TOCAR");
  w.eval(fs.readFileSync(path.join(root, "game/economy-lab-core.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "game/economy-lab-ui.js"), "utf8"));
  const click = selector => { const b = w.document.querySelector(selector); assert.ok(b); assert.equal(b.disabled, false, selector); b.click(); };
  click('[data-action="seed"][data-key="papa"]');
  click('[data-action="plant"][data-id="1"]');
  click('[data-tab="test"]'); click('[data-action="advance"][data-ms="180000"]');
  click('[data-action="collect"][data-id="1"]');
  click('[data-tab="market"]');
  const field = w.document.querySelector('[data-quantity="madera"]'); field.value = "7"; field.focus();
  field.dispatchEvent(new w.Event("change", { bubbles: true }));
  assert.equal(w.document.activeElement.dataset.quantity, "madera"); assert.equal(w.document.activeElement.value, "7");
  click('[data-action="sell"][data-key="papa"]');
  const saved = JSON.parse(w.localStorage.getItem(key)); assert.equal(saved.silver, 4000);
  assert.equal(w.localStorage.getItem("golden-real-sentinel"), "NO TOCAR");
  assert.equal(w.localStorage.length, 2);
  console.log("OK UI: sembrar, reloj, cosechar, vender, foco y aislamiento de guardado"); checks++;
  dom.window.close();
}
uiTests().then(() => console.log("\n" + checks + " comprobaciones aprobadas.")).catch(e => { console.error(e); process.exitCode = 1; });
