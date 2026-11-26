"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const { arrancar } = require("./arrancar-el-juego.contexto");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const config = fs.readFileSync(path.join(root, "public/game/config.js"), "utf8");
const declaracionFase = /GF\.FASE_JUEGO = '(?:alpha|release)';/;

function textoPorFase(window, elemento) {
  const textos = elemento.ownerDocument.createTreeWalker(elemento, window.NodeFilter.SHOW_TEXT);
  const partes = [];
  for (let nodo = textos.nextNode(); nodo; nodo = textos.nextNode()) {
    const aviso = nodo.parentElement.closest("[data-solo-alfa], [data-solo-lanzamiento]");
    if (!aviso || window.getComputedStyle(aviso).display !== "none") partes.push(nodo.textContent);
  }
  return partes.join("").replace(/\s+/g, " ").trim();
}

async function probarFase(fase) {
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  try {
    const { window } = dom;
    const doc = window.document;
    const codigo = config.replace(declaracionFase, "GF.FASE_JUEGO = '" + fase + "';");
    window.eval(codigo);
    assert.equal(doc.documentElement.dataset.faseJuego, fase);
    const { ctx } = arrancar(root, { "game/config.js": codigo, "game/main.js": "" });
    await ctx.SAVE_READY;
    ctx.document = doc;
    ctx.fixture = {
      banco: { uid: "qa", deposits: false, paid_remaining: 3, history: [] },
      ranking: {
        uid: "qa", total: 1, top: [], actualizado: "2026-11-26T20:00:00Z",
        yo: { user_id: "qa", nombre: "QA", nivel: 2, xp: 33, posicion: 1 },
      },
    };
    vm.runInContext("UID='qa'; USDT_ESTADO=fixture.banco; lbFarmData=fixture.ranking;", ctx);
    ctx.renderUsdt();
    ctx.renderRankingGranja();

    const acceso = textoPorFase(window, doc.querySelector("#gate .sub"));
    const ajustes = textoPorFase(window, doc.querySelector("#cfg-alfa-compras").parentElement);
    const banco = textoPorFase(window, doc.getElementById("ov-banco"));
    const ranking = textoPorFase(window, doc.querySelector("#ov-lb h3"));
    const reglas = textoPorFase(window, doc.getElementById("lb-alfa-reglas"));
    const nota = doc.getElementById("lb-note").textContent;

    assert.match(acceso, /Recargas USDT.*Retiros desactivados/);
    assert.match(banco, /Retiros desactivados/);
    assert.match(banco, /Golden comprado sin gastar:\s*3/);
    assert.match(banco, /Depósitos cerrados/);
    assert.equal(doc.getElementById("usdt-create"), null);
    assert.ok(doc.getElementById("cfg-alfa-compras"));
    assert.ok(doc.getElementById("cfg-alfa-copiar"));
    assert.match(reglas, /Los empates comparten posición/);
    assert.match(doc.getElementById("lb-personal").textContent, /Tu posición guardada/);

    if (fase === "alpha") {
      assert.match(acceso, /el progreso se reiniciará al finalizar/);
      assert.match(ajustes, /Al terminar la alfa se reinicia el progreso/);
      assert.match(banco, /Condiciones de la alfa/);
      assert.match(banco, /se conserva para el lanzamiento/);
      assert.match(ranking, /Clasificación de la alfa/);
      assert.match(reglas, /Premios y fecha de cierre pendientes/);
      assert.match(nota, /^Alfa ·/);
      assert.match(ctx.informeAlfa(), /^GOLDEN ALFA - INFORME TÉCNICO/);
    } else {
      assert.doesNotMatch(acceso, /alfa|reiniciar|lanzamiento/i);
      assert.doesNotMatch(ajustes, /alfa|reiniciar|lanzamiento/i);
      assert.match(ajustes, /Compras y soporte/);
      assert.match(banco, /Condiciones del Banco/);
      assert.doesNotMatch(banco, /alfa|lanzamiento/i);
      assert.match(ranking, /Clasificación de granjas/);
      assert.doesNotMatch(ranking, /alfa/i);
      assert.doesNotMatch(reglas, /premios|fecha de cierre/i);
      assert.doesNotMatch(nota, /Alfa/);
      assert.match(ctx.informeAlfa(), /^GOLDEN FARM - INFORME TÉCNICO/);
    }
  } finally {
    dom.window.close();
  }
}

(async () => {
  assert.match(config, declaracionFase);
  await probarFase("alpha");
  await probarFase("release");
  console.log("OK: acceso, Configuración, Banco y ranking muestran avisos coherentes con la fase.");
})().catch(error => { console.error(error); process.exitCode = 1; });
