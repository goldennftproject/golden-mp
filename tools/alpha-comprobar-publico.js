"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { OFFICIAL_ORIGIN } = require("../src/canonical-host");

const AUTH_ORIGIN = "https://ulspkdaljeuleqqdokfk.supabase.co";
const PLAZO_CONSULTA_MS = 12_000;
const VERSION_RENDER = /^[a-f0-9]{40}$/i;
const opciones = {
  version: "version",
  registro: "registro_habilitado",
  correo: "correo_habilitado",
  anonimos: "anonimos_habilitados",
};
const uso = "Uso: node tools/alpha-comprobar-publico.js resultado.json " +
  "[--version=SHA_COMPLETO --registro=true|false --correo=true|false --anonimos=true|false]";

function leerArgumentos(args) {
  const [salida, ...flags] = args;
  if (!salida || salida.startsWith("--")) throw Error(uso);
  if (flags.length === 0) return { salida, expectativas: null };

  const expectativas = {};
  for (const flag of flags) {
    const [, opcion, valor] = /^--([a-z]+)=(.+)$/.exec(flag) || [];
    if (!Object.hasOwn(opciones, opcion)) throw Error(uso);
    const campo = opciones[opcion];
    if (Object.hasOwn(expectativas, campo)) throw Error(uso);
    if (campo === "version" ? !VERSION_RENDER.test(valor) : valor !== "true" && valor !== "false") throw Error(uso);
    expectativas[campo] = campo === "version" ? valor.toLowerCase() : valor === "true";
  }
  if (Object.keys(expectativas).length !== Object.keys(opciones).length) throw Error(uso);
  return { salida, expectativas };
}

async function consultar(fetcher, nombre, url, headers, plazo, interpretar) {
  const inicio = Date.now();
  const abortador = new AbortController();
  let status = 0, agotado = false, temporizador;
  const consulta = async () => {
    const r = await fetcher(url, { method: "GET", headers, signal: abortador.signal, redirect: "error" });
    status = r.status;
    if (status !== 200) return { valido: false, error: "Respuesta HTTP inesperada" };
    return interpretar(await r.json());
  };
  const vencimiento = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => {
      agotado = true;
      abortador.abort();
      rechazar(Error("Plazo agotado"));
    }, plazo);
  });
  try {
    const resultado = await Promise.race([consulta(), vencimiento]);
    return { nombre, status, ms: Date.now() - inicio, ...resultado };
  } catch {
    const error = agotado ? "La consulta agotó su plazo" : "No se pudo leer la respuesta esperada";
    return { nombre, status, ms: Date.now() - inicio, valido: false, error };
  } finally {
    clearTimeout(temporizador);
  }
}

function renderVersion(value) {
  return typeof value === "string" && VERSION_RENDER.test(value) ? value.toLowerCase() : null;
}
function authAjustes(data) {
  return {
    registro_habilitado: typeof data?.disable_signup === "boolean" ? !data.disable_signup : null,
    correo_habilitado: typeof data?.external?.email === "boolean" ? data.external.email : null,
    anonimos_habilitados: typeof data?.external?.anonymous_users === "boolean" ? data.external.anonymous_users : null,
  };
}

async function comprobarSalud({ apikey, expectativas = null, fetcher = fetch, plazo = PLAZO_CONSULTA_MS }) {
  const fecha = new Date().toISOString();
  const [salud, version, auth] = await Promise.all([
    consultar(fetcher, "render", OFFICIAL_ORIGIN + "/healthz", {}, plazo, data => {
      const versionActual = renderVersion(data?.version);
      return { valido: data?.ok === true && versionActual !== null, version: versionActual };
    }),
    consultar(fetcher, "version", OFFICIAL_ORIGIN + "/version", {}, plazo, data => {
      const versionActual = renderVersion(data?.v);
      return { valido: versionActual !== null, version: versionActual };
    }),
    consultar(fetcher, "auth_settings", AUTH_ORIGIN + "/auth/v1/settings", { apikey }, plazo, data => {
      const ajustes = authAjustes(data);
      return { valido: Object.values(ajustes).every(valor => valor !== null), ...ajustes };
    }),
  ]);

  const mismasVersiones = salud.valido && version.valido ? salud.version === version.version : null;
  const coincide = (observado, esperado) => observado === null || esperado === undefined ? null : observado === esperado;
  const coincidencias = {
    endpoints_misma_version: mismasVersiones,
    version_esperada: coincide(mismasVersiones === true ? version.version : null, expectativas?.version),
    registro_habilitado: coincide(auth.registro_habilitado ?? null, expectativas?.registro_habilitado),
    correo_habilitado: coincide(auth.correo_habilitado ?? null, expectativas?.correo_habilitado),
    anonimos_habilitados: coincide(auth.anonimos_habilitados ?? null, expectativas?.anonimos_habilitados),
  };
  const comprobaciones = [salud, version, {
    registro_habilitado: null, correo_habilitado: null, anonimos_habilitados: null, ...auth,
  }];
  const legible = mismasVersiones === true && auth.valido;
  const verificado = legible && expectativas !== null && Object.values(coincidencias).every(valor => valor === true);
  return {
    fecha,
    alcance: "Lectura pública de Render y Auth. El envío y la recepción de correo quedan sin probar.",
    expectativas,
    comprobaciones,
    coincidencias,
    resultado: verificado ? "verificado" : legible && expectativas === null ? "observado" : "fallo",
  };
}

async function main() {
  const { salida, expectativas } = leerArgumentos(process.argv.slice(2));
  const save = fs.readFileSync(path.join(__dirname, "../public/game/save.js"), "utf8");
  const apikey = /const SB_KEY = "([^"]+)"/.exec(save)?.[1];
  if (!apikey) throw Error("Falta la clave pública de Auth en save.js");
  const informe = await comprobarSalud({ apikey, expectativas });
  const destino = path.resolve(salida);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(informe, null, 2) + "\n");
  console.log(JSON.stringify(informe));
  if (informe.resultado === "fallo") process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { comprobarSalud, leerArgumentos };
