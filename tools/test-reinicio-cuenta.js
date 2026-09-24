/* REINICIAR LA CUENTA: LA GRANJA A CERO, EL CORREO SE QUEDA                  (24/9, dirección)
   « agrega botón reset cuenta en configuración para resetear toda tu cuenta y empezar como
     nuevo ».
   Lo que se custodia:
     · estadoDeCero() deja EXACTAMENTE el estado de un jugador nuevo (la foto de state.js);
     · el guardado lleva la marca `reinicio` y el portero la entiende: un reinicio de verdad
       pasa aunque bajen las expansiones; uno falso (con plata o terreno) se mide como siempre;
     · resetearCuenta() pide permiso a la nube ANTES de pisar nada: si el portero dice que no,
       la granja vuelve a estar como estaba;
     · el botón existe en Configuración y pide confirmar dos veces.
     node tools/test-reinicio-cuenta.js                                                       */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

function arnes() {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, Promise,
    isNaN, isFinite, parseInt, parseFloat, performance: { now: () => 0 }, setTimeout: (f) => 0, setInterval: () => 0, clearInterval() {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  const store = {};
  ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } };
  ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
  vm.createContext(ctx);
  ["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync(path.join(RAIZ, "public/game/" + f + ".js"), "utf8"), ctx));
  ctx.toast = () => {}; ctx.log = () => {};
  ["isOpen", "refreshInv", "refreshHud", "saveFarm", "recalcFarmLevel", "syncSlots"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
  return { ctx, store };
}

console.log("\n1 · estadoDeCero() ES EL JUGADOR NUEVO\n");
{
  const { ctx } = arnes(), G = ctx.G;
  const fresco = JSON.stringify(ctx.G);
  G.plata = 99999; G.level = 20; G.expansiones = 7; G.res.madera = 500; G.nfts = { pico_viejo: true }; G.canasDur = { junco: 3 }; G.loQueSea = 1;
  ctx.estadoDeCero();
  ok("vuelve exactamente a la foto inicial (campos agregados incluidos)", JSON.stringify(G) === fresco);
  ok("y sigue siendo EL MISMO objeto (todo el juego lo tiene por referencia)", ctx.G === G && ctx.window.G === G);
  ok("3 de plata, 20 $Golden, nivel 1, sin terreno, tutorial en el paso 0", G.plata === 3 && G.golden === 20 && G.level === 1 && G.expansiones === 0 && G.tuto.step === 0 && !G.tuto.done);
}

console.log("\n2 · EL PORTERO ENTIENDE EL REINICIO\n");
{
  const fuente = fs.readFileSync(path.join(RAIZ, "supabase/functions/guardar/index.ts"), "utf8");
  const m = fuente.match(/\/\* === REGLAS ===[\s\S]*?\*\/([\s\S]*?)\/\* === FIN REGLAS === \*\//);
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(m[1] + "\nthis.evaluarGuardado = evaluarGuardado; this.esDeCero = esDeCero;", ctx);
  const antes = { plata: 40000, golden: 300, level: 18, expansiones: 6, res: { madera: 900, piedra: 400 } };
  const cero = { plata: 3, golden: 20, level: 1, expansiones: 0, prestige: 0, res: { madera: 0, piedra: 0 }, reinicio: 1790000000000 };
  const sinMarca = Object.assign({}, cero); delete sinMarca.reinicio;
  ok("sin la marca, bajar las expansiones sigue siendo sospecha", ctx.evaluarGuardado(antes, sinMarca, 60).sospechas.some(s => /expansiones no pueden bajar/.test(s)));
  ok("con la marca y de verdad en cero, pasa limpio", ctx.evaluarGuardado(antes, cero, 60).sospechas.length === 0);
  const falso = Object.assign({}, cero, { plata: 40000, expansiones: 2 });
  ok("un « reinicio » que se queda con plata y terreno no es un reinicio: se mide como siempre",
    !ctx.esDeCero(falso) && ctx.evaluarGuardado(antes, falso, 60).sospechas.some(s => /expansiones/.test(s)));
  const viejo = Object.assign({}, cero, { reinicio: 100 });
  ok("una marca vieja (ya contada en el guardado anterior) no reabre la puerta",
    ctx.evaluarGuardado(Object.assign({}, antes, { reinicio: 100 }), viejo, 60).sospechas.length > 0);
  ok("después del reinicio el jugador juega normal: su segundo guardado se mide contra el cero", ctx.evaluarGuardado(cero, Object.assign({}, cero, { plata: 50 }), 600).sospechas.length === 0);
}

console.log("\n3 · resetearCuenta() PREGUNTA A LA NUBE ANTES DE PISAR NADA\n");
{
  const { ctx, store } = arnes(), G = ctx.G;
  G.plata = 12345; G.level = 9; G.expansiones = 3; G.res.madera = 77;
  vm.runInContext("CARGA_OK = true; SOLO_LOCAL = false; UID = 'u1'; sb = { functions: { invoke: async (f, o) => window.__nube(f, o) } };", ctx);
  let enviado = null;
  ctx.__nube = async (f, o) => { enviado = o.body.data; return { data: null, error: { message: "guardado rechazado", context: { status: 422, json: async () => ({ sospechas: ["algo raro"] }) } } }; };
  const r1 = vm.runInContext("resetearCuenta()", ctx);
  return r1.then(r => {
    ok("mandó al portero un guardado en cero con la marca", enviado && enviado.plata === 3 && enviado.expansiones === 0 && typeof enviado.reinicio === "number");
    ok("el portero dijo que no → devuelve el motivo", r && /algo raro/.test(r.error), JSON.stringify(r));
    ok("y la granja quedó COMO ESTABA", G.plata === 12345 && G.level === 9 && G.expansiones === 3 && G.res.madera === 77, JSON.stringify([G.plata, G.level, G.expansiones, G.res.madera]));
    ctx.__nube = async () => ({ data: { ok: true }, error: null });
    return vm.runInContext("resetearCuenta()", ctx);
  }).then(r => {
    ok("con el OK de la nube, reinicia", r && r.ok === true, JSON.stringify(r));
    ok("la granja está en cero", G.plata === 3 && G.level === 1 && G.expansiones === 0 && G.res.madera === 0);
    const copia = Object.keys(store).find(k => /gf-granja-copia/.test(k));
    const guardada = copia && JSON.parse(store[copia]);
    ok("y la copia local también (para que la próxima carga no resucite la vieja)", guardada && (guardada.data || guardada).plata === 3, copia);
    return fin();
  });
}

function fin() {
  console.log("\n4 · EL BOTÓN EXISTE Y PIDE CONFIRMAR DOS VECES\n");
  const html = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("está en Configuración → Cuenta, en rojo y con la advertencia", /id="cfg-reiniciar"/.test(html) && /class="red sm" id="cfg-reiniciar"/.test(html) && /No se puede deshacer/.test(html));
  const cssDanger = html.slice(html.indexOf("/* Reiniciar una granja no es otro ajuste."), html.indexOf("/* ---- UI de madera", html.indexOf("/* Reiniciar una granja no es otro ajuste.")));
  ok("en PC se distingue como una zona irreversible, sin afectar móvil", /@media\(min-width:641px\)[\s\S]*#ov-config \.cfg-danger/.test(html) && /#ov-config \.cfg-danger::before\{content:"ACCIÓN IRREVERSIBLE"/.test(cssDanger) && /#ov-config \.cfg-danger #cfg-reiniciar\{width:100%\}/.test(cssDanger));
  const bloque = ui.slice(ui.indexOf('$("cfg-reiniciar")'), ui.indexOf('$("cfg-reiniciar")') + 1500);
  ok("dos askConfirm encadenados antes de resetearCuenta()", (bloque.match(/askConfirm\(/g) || []).length >= 2 && /await resetearCuenta\(\)/.test(bloque));
  ok("con el OK recarga la página; con el no, dice por qué", /location\.reload\(\)/.test(bloque) && /No se pudo reiniciar/.test(bloque));
  console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ reiniciar la cuenta deja al jugador como nuevo, y solo con el OK de la nube\n");
  process.exit(fallos ? 1 : 0);
}
