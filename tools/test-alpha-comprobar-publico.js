"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { comprobarSalud, leerArgumentos } = require("./alpha-comprobar-publico");

const commit = "a".repeat(40);
const anterior = "b".repeat(40);
const expectativas = { version: commit, registro_habilitado: true, correo_habilitado: true, anonimos_habilitados: false };
const auth = { disable_signup: false, external: { email: true, anonymous_users: false } };
const publicKey = "solo-clave-publica-de-prueba";
const health = { ok: true, version: commit };
const rutas = {
  salud: "https://goldenfarm.onrender.com/healthz",
  version: "https://goldenfarm.onrender.com/version",
  auth: "https://ulspkdaljeuleqqdokfk.supabase.co/auth/v1/settings",
};

function fuente(valores = {}) {
  const respuestas = { [rutas.salud]: health, [rutas.version]: { v: commit }, [rutas.auth]: auth, ...valores };
  const llamadas = [];
  const fetcher = async (url, opciones) => {
    llamadas.push({ url, ...opciones });
    assert.ok(Object.hasOwn(respuestas, url), "Destino inesperado " + url);
    const dato = respuestas[url];
    return typeof dato === "function" ? dato(opciones) : { status: 200, json: async () => dato };
  };
  return { fetcher, llamadas };
}

test("la verificación usa el dominio oficial, la versión exacta y la política explícita", async () => {
  const { fetcher, llamadas } = fuente();
  const informe = await comprobarSalud({ apikey: publicKey, expectativas, fetcher });
  assert.equal(informe.resultado, "verificado");
  assert.deepEqual(llamadas.map(llamada => llamada.url), Object.values(rutas));
  for (const llamada of llamadas) {
    assert.equal(llamada.method, "GET");
    assert.equal(llamada.redirect, "error");
    assert.deepEqual(llamada.headers, llamada.url === rutas.auth ? { apikey: publicKey } : {});
  }
  assert.ok(Object.values(informe.coincidencias).every(valor => valor === true));
  assert.ok(!JSON.stringify(informe).includes(publicKey));
});

test("sin expectativas sólo informa los valores vistos", async () => {
  const { fetcher } = fuente();
  const informe = await comprobarSalud({ apikey: publicKey, fetcher });
  assert.equal(informe.resultado, "observado");
  assert.equal(informe.coincidencias.version_esperada, null);
  assert.equal(informe.coincidencias.registro_habilitado, null);
  const ajustes = informe.comprobaciones.find(fila => fila.nombre === "auth_settings");
  assert.equal(ajustes.registro_habilitado, true);
  assert.equal(ajustes.correo_habilitado, true);
  assert.equal(ajustes.anonimos_habilitados, false);
});

test("respuestas 200 pueden fallar por despliegue anterior o versiones distintas", async () => {
  const vieja = fuente({ [rutas.salud]: { ok: true, version: anterior }, [rutas.version]: { v: anterior } });
  const a = await comprobarSalud({ apikey: publicKey, expectativas, fetcher: vieja.fetcher });
  assert.equal(a.resultado, "fallo");
  assert.equal(a.coincidencias.endpoints_misma_version, true);
  assert.equal(a.coincidencias.version_esperada, false);

  const dividida = fuente({ [rutas.version]: { v: anterior } });
  const b = await comprobarSalud({ apikey: publicKey, expectativas, fetcher: dividida.fetcher });
  assert.equal(b.resultado, "fallo");
  assert.equal(b.coincidencias.endpoints_misma_version, false);
  assert.equal(b.coincidencias.version_esperada, null);
});

test("una política diferente o un campo de Auth ausente no pasan", async () => {
  const distinto = fuente({ [rutas.auth]: { ...auth, disable_signup: true } });
  const a = await comprobarSalud({ apikey: publicKey, expectativas, fetcher: distinto.fetcher });
  assert.equal(a.resultado, "fallo");
  assert.equal(a.coincidencias.registro_habilitado, false);

  const incompleto = fuente({ [rutas.auth]: { ...auth, external: { email: true } } });
  const b = await comprobarSalud({ apikey: publicKey, expectativas, fetcher: incompleto.fetcher });
  assert.equal(b.resultado, "fallo");
  assert.equal(b.comprobaciones.at(-1).anonimos_habilitados, null);
  assert.equal(b.coincidencias.anonimos_habilitados, null);
});

test("la forma JSON se comprueba aunque HTTP responda 200", async () => {
  const mala = fuente({
    [rutas.salud]: { ok: true },
    [rutas.version]: () => ({ status: 200, json: async () => { throw Error("detalle no público"); } }),
    [rutas.auth]: () => ({ status: 503 }),
  });
  const informe = await comprobarSalud({ apikey: publicKey, fetcher: mala.fetcher });
  assert.equal(informe.resultado, "fallo");
  assert.deepEqual(informe.comprobaciones.map(fila => fila.status), [200, 200, 503]);
  assert.ok(informe.comprobaciones.every(fila => fila.valido === false));
  assert.ok(!JSON.stringify(informe).includes("detalle no público"));
});

test("el plazo cubre también los cuerpos que no terminan y aborta sólo esa consulta", async () => {
  const bloqueada = fuente({
    [rutas.salud]: () => new Promise(() => {}),
    [rutas.auth]: () => ({ status: 200, json: () => new Promise(() => {}) }),
  });
  const informe = await comprobarSalud({ apikey: publicKey, fetcher: bloqueada.fetcher, plazo: 20 });
  assert.equal(informe.resultado, "fallo");
  const [a, b, c] = informe.comprobaciones;
  assert.match(a.error, /plazo/);
  assert.equal(a.status, 0);
  assert.equal(b.valido, true);
  assert.equal(c.status, 200);
  assert.match(c.error, /plazo/);
  assert.deepEqual(bloqueada.llamadas.map(llamada => llamada.signal.aborted), [true, false, true]);
});

test("el modo exacto requiere las cuatro expectativas y no acepta argumentos ajenos", () => {
  const path = "informe.json";
  const args = ["--version=" + commit.toUpperCase(), "--registro=true", "--correo=true", "--anonimos=false"];
  assert.deepEqual(leerArgumentos([path]), { salida: path, expectativas: null });
  assert.deepEqual(leerArgumentos([path, ...args]), { salida: path, expectativas });
  for (const invalido of [args.slice(1), [...args, "--correo=false"],
    [...args.slice(0, 3), "--constructor=true"], ["--version=14c2711", ...args.slice(1)]]) {
    assert.throws(() => leerArgumentos([path, ...invalido]), /Uso/);
  }
});
