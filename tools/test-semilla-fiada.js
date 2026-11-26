"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {test} = require("node:test");
const {JSDOM} = require("jsdom");
const {arrancar} = require("./arrancar-el-juego.contexto.js");
const repo = path.join(__dirname, "..");

function granja(t) {
  const {ctx:game} = arrancar(repo, {"game/main.js":""});
  const dom = new JSDOM(fs.readFileSync(path.join(repo,"public/index.html"),"utf8"));
  t.after(() => dom.window.close());
  game.estadoDeCero();
  game.document = dom.window.document;
  game.G.tuto = {done:true};
  Object.assign(game.G,{plata:0,seeds:{},res:{},dishes:{},plots:[{state:"dry"}],plotsOwned:3});
  const messages = [];
  game.toast = text => messages.push(text);
  for (const method of ["log","refreshHud","saveFarm","tutoHighlight"]) game[method] = ()=>{};
  game.isOpen = () => false;
  const shop = () => game.refreshSeedShop();
  const potato = () => game.document.querySelector('[data-buy="papa"]');
  return {game,shop,potato,messages};
}

test("la tienda muestra el cupo real según las parcelas y aclara las semillas del kit",t=>{
  const {game,shop} = granja(t);
  const used = game.seedBuysToday();
  used.count=18;
  shop();
  const quota = () => game.document.querySelector("#seed-shop .shophead").textContent;
  assert.match(quota(),/102 de 120.*parcelas.*00:00 UTC/);
  game.G.plotsOwned=5;
  shop();
  assert.match(quota(),/182 de 200/);
  assert.match(game.document.getElementById("seed-shop").textContent,/cuenta para el cupo diario de semillas/);
});

test("la granja en cero pide una semilla fiada por el botón y conserva el uso tras recargar",t=>{
  const {game,shop,potato} = granja(t);
  shop();
  const offer = potato();
  assert.ok(!offer.disabled);
  assert.match(offer.textContent,/1 semilla fiada/);
  assert.match(game.document.getElementById("st-papa").textContent,/0 Plata/);
  assert.equal(game.document.getElementById("sq-papa").disabled,true);
  offer.click();
  assert.equal(game.G.plata,0);
  assert.equal(game.G.seeds.papa,1);
  assert.equal(game.seedBuysToday().count,1);
  assert.equal(game.seedBuysToday().caridad,1);
  offer.click();
  assert.equal(game.G.seeds.papa,1);
  const saved = JSON.parse(JSON.stringify(game.snapshot()));
  game.estadoDeCero();
  game.hydrate(saved);
  game.G.seeds.papa=0;
  shop();
  assert.ok(potato().disabled);
  game.buySeed("papa",50);
  assert.equal(game.G.seeds.papa,0);
  assert.equal(game.seedBuysToday().count,1);
});

test("las condiciones existentes y el coste de una compra normal se respetan",t=>{
  const {game,shop,potato,messages} = granja(t);
  const ledger = game.seedBuysToday();
  for(const [field, sample, empty] of [
    ["seeds",{papa:1},{}],["res",{papa:1},{}],["dishes",{papa_asada:1},{}],
    ["plots",[{state:"growing"}],[{state:"dry"}]],
  ]) {
    game.G[field]=sample;
    shop();
    assert.ok(potato().disabled,field);
    game.G[field]=empty;
  }
  ledger.count=game.seedDailyMax();
  shop();
  assert.ok(potato().disabled);
  ledger.count=0;
  shop();
  const stale=potato();
  game.G.plata=10;
  stale.click();
  assert.equal(game.G.plata,10);
  assert.match(messages.at(-1),/Cambió la disponibilidad/);
  assert.match(potato().textContent,/Comprar/);
  potato().click();
  assert.equal(game.G.plata,9);
  assert.equal(game.G.seeds.papa,1);
  assert.equal(ledger.count,1);
  assert.ok(!ledger.caridad);
});
