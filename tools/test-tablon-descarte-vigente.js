"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { JSDOM } = require("jsdom");

const root = resolve(__dirname, "..");
const ui = readFileSync(resolve(root, "public/game/ui.js"), "utf8");
const state = readFileSync(resolve(root, "public/game/state.js"), "utf8");
const panel = ui.slice(ui.indexOf('var _pdVista = "pedidos";'), ui.indexOf("/* (pdSeccionPesca"));
const descarte = state.slice(state.indexOf("function pedidoDescartar("), state.indexOf("// --- la tienda de canje:"));
const pedido = (key = "papa") => ({ tipo: "res", key, n: 3, plata: 6, vales: 2, xp: 5, de: "Doña Rosa", nota: "Para la mesa", hecho: false });
const hoja = (dia = "2026-11-26") => ({ dia, lista: [pedido()], reroll: 0, descarteAt: 0 });
const syncTime = Date.UTC(2026, 10, 26, 23, 59);

function fixture(t) {
  const dom = new JSDOM('<div id="ov-pedidos" class="show"><div id="pd-lista"></div></div>' +
    '<div id="ov-confirm"><button id="cf-yes"></button><button id="cf-no"></button></div>');
  const document = dom.window.document;
  const $ = id => document.getElementById(id);
  t.after(() => dom.window.close());
  const avisos = [];
  let estado = hoja(), pregunta = null, saves = 0;
  const ctx = {
    document, $, UID: "cuenta-a", G: { vales: 0, plata: 9, res: { papa: 3 } },
    nowMs: () => syncTime, PED_DESCARTE_MIN: 30,
    pedidosEstado: () => estado,
    pedidosTodos: () => estado.lista.map((p, i) => ({ p, i, escalon: "diaria" })),
    pedidoGenerar: () => pedido("piedra"), pedidoStock: () => 3, pedidoLabel: p => p.key,
    pedidoSprite: () => null, pedidoVales: p => p.vales, CROP_DEF: {}, RES_EMOJI: {},
    JORNADA_BALANCE_DESDE: "2026-11-23", fmtSecs: s => String(s), escapeHtml: s => s,
    tablonAbierto: () => true,
    isOpen: id => $(id)?.classList.contains("show"),
    activarAccionConTeclado() {}, log() {},
    toast: mensaje => avisos.push(mensaje),
    saveFarm: () => { saves++; },
    askConfirm: (mensaje, aceptar, opts) => {
      $("ov-confirm").classList.add("show");
      pregunta = { mensaje, aceptar, opts };
    },
    GF: { scene: "farm" }, innerWidth: 900
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(panel + "\n" + descarte, ctx);
  ctx.refreshPedidos();
  const confirmar = () => {
    assert.ok(pregunta, "Debe haber una confirmación visible");
    $("ov-confirm").classList.remove("show");
    const actual = pregunta;
    pregunta = null;
    actual.opts?.onClose?.();
    actual.aceptar();
  };
  const clickDescarte = () => {
    const boton = document.querySelector("[data-pd-desc]");
    boton.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
  };
  return { ctx, document, avisos, confirmar, clickDescarte,
    get estado() { return estado; }, set estado(nuevo) { estado = nuevo; },
    get pregunta() { return pregunta; }, get saves() { return saves; } };
}

function descartaNada(f) {
  assert.equal(f.estado.reroll, 0);
  assert.equal(f.estado.descarteAt, 0);
  assert.equal(f.saves, 0);
  assert.equal(f.ctx.G.plata, 9);
  assert.equal(f.ctx.G.res.papa, 3);
  assert.match(f.avisos.at(-1), /pedido.*cambi/i);
}

test("la confirmación del pedido original descarta una sola vez y conserva el foco", t => {
  const f = fixture(t);
  f.document.querySelector("[data-pd-entregar]").focus();
  f.clickDescarte();
  assert.match(f.pregunta.mensaje, /3 × papa/);
  f.confirmar();
  assert.equal(f.estado.lista[0].key, "piedra");
  assert.equal(f.estado.reroll, 1);
  assert.equal(f.estado.descarteAt, syncTime + 30 * 60_000);
  assert.equal(f.saves, 1);
  assert.equal(f.document.activeElement.dataset.pdEntregar, "0");
});

test("la confirmación abierta antes de medianoche no descarta el nuevo pedido idéntico", t => {
  const f = fixture(t);
  f.clickDescarte();
  const anterior = f.estado.lista[0];
  f.estado = hoja("2026-11-27");
  assert.deepEqual(f.estado.lista[0], anterior);
  f.confirmar();
  descartaNada(f);
});

test("un reemplazo idéntico de la misma casilla tampoco hereda la confirmación", t => {
  const f = fixture(t);
  f.clickDescarte();
  f.estado.lista[0] = pedido();
  f.confirmar();
  descartaNada(f);
});

test("repintar el mismo pedido conserva la confirmación ya abierta", t => {
  const f = fixture(t);
  f.clickDescarte();
  const tarjeta = f.document.querySelector("[data-pd-desc]");
  f.ctx.refreshPedidos();
  assert.equal(tarjeta.isConnected, false);
  f.confirmar();
  assert.equal(f.estado.lista[0].key, "piedra");
  assert.equal(f.estado.reroll, 1);
  assert.equal(f.saves, 1);
});

test("el cambio de cuenta o escena cancela el descarte pendiente", t => {
  const cuenta = fixture(t);
  cuenta.clickDescarte();
  cuenta.ctx.UID = "cuenta-b";
  cuenta.confirmar();
  descartaNada(cuenta);

  const escena = fixture(t);
  escena.clickDescarte();
  escena.ctx.GF.scene = "forest";
  escena.confirmar();
  descartaNada(escena);
});

test("la nota visible de ayer se actualiza antes de abrir una confirmación", t => {
  const f = fixture(t);
  f.estado = hoja("2026-11-27");
  f.estado.lista[0] = pedido("calabaza");
  f.clickDescarte();
  assert.equal(f.pregunta, null);
  assert.match(f.document.querySelector(".pd-nom").textContent, /calabaza/);
  descartaNada(f);
});

test("cerrar el tablón antes de confirmar cancela el descarte", t => {
  const f = fixture(t);
  f.clickDescarte();
  f.document.getElementById("ov-pedidos").classList.remove("show");
  f.confirmar();
  descartaNada(f);
});
