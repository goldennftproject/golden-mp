"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const vm = require("node:vm");

const root = process.env.GF_ACCESO_TEST_ROOT || path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, "public", name), "utf8");
const main = read("game/main.js");
const save = fs.readFileSync(process.env.GF_ACCESO_SAVE || path.join(root, "public/game/save.js"), "utf8");

async function probar() {
  const dom = new JSDOM(read("index.html"), { url: "https://granja.example.invalid/" });
  try {
    const { document } = dom.window;
    const byId = id => document.getElementById(id);
    const llamadas = [];
    const context = vm.createContext({
      document,
      window: {},
      GF: { SOLO_EMAIL: true },
      setTimeout: (fn, delay) => setTimeout(fn, Math.min(delay, 30)),
      clearTimeout,
      entrarConEmail: async email => {
        llamadas.push({ modo: "entrar", email });
        return { ok: true };
      },
      crearCuentaConEmail: async (email, nick) => {
        llamadas.push({ modo: "crear", email, nick });
        return { ok: true };
      },
    });
    vm.runInContext(save.slice(save.indexOf("const conTope = "), save.indexOf("// La librería fijada en el cliente")), context);
    vm.runInContext(main.slice(main.indexOf('var MODO_PUERTA = "apodo"'), main.indexOf("// jugador nuevo: elige apodo y entra")), context);
    context.pintarPuerta("apodo");

    byId("gmail").value = "jugador@example.invalid";
    byId("nick").value = "GranjeroQA";
    const inicio = Promise.withResolvers();
    context.window.SAVE_READY = inicio.promise;
    const primera = context.mandarElEnlace();
    byId("gate-ya").click();
    const repetida = context.mandarElEnlace();
    const bloqueos = [byId("gmail").readOnly, byId("nick").readOnly, byId("gate-ya").disabled];
    inicio.resolve(true);
    await Promise.all([primera, repetida]);
    assert.deepEqual(llamadas, [{ modo: "crear", email: "jugador@example.invalid", nick: "GranjeroQA" }]);
    assert.deepEqual(bloqueos, [true, true, true]);
    assert.equal(byId("gate-msg").getAttribute("role"), "status");
    assert.match(byId("gate-msg").textContent, /te mandamos un enlace/);
    assert.equal(byId("gate-ya").disabled, false);
    assert.equal(byId("gmail").readOnly, false);

    byId("gate-ya").click();
    await context.mandarElEnlace();
    assert.deepEqual(llamadas.at(-1), { modo: "entrar", email: "jugador@example.invalid" });
    assert.equal(byId("enter").textContent, "Enviar enlace");

    context.window.SAVE_READY = new Promise(() => {});
    await context.mandarElEnlace();
    assert.equal(llamadas.length, 2, "la petición no se envía si el inicio nunca termina");
    assert.equal(byId("enter").disabled, false);
    assert.match(byId("gate-msg").textContent, /Revisa tu bandeja/);

    context.window.SAVE_READY = Promise.resolve(true);
    context.entrarConEmail = async () => { throw new Error("Failed to fetch"); };
    await context.mandarElEnlace();
    assert.equal(byId("gate-ya").disabled, false);
    assert.match(byId("gate-msg").textContent, /Revisa tu bandeja/);

    for (const [error, esperado] of [
      ["Invalid email", /Revisa la dirección de correo/],
      ["Signups not allowed for otp", /No hay ninguna granja vinculada/],
      ["Email rate limit exceeded", /muchos correos seguidos/],
      ["Invalid response from network", /Revisa tu bandeja/],
    ]) {
      context.entrarConEmail = async () => ({ error });
      await context.mandarElEnlace();
      assert.match(byId("gate-msg").textContent, esperado);
      assert.equal(byId("enter").disabled, false);
    }
  } finally {
    dom.window.close();
  }
  console.log("OK: registro e inicio, formulario estable, envío único, recuperación de conexión y avisos de correo.");
}

probar().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
