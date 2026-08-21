/* EL BOTÓN DE PRUEBAS: REGALA MATERIAL AL EQUIPO, INVISIBLE PARA EL JUGADOR (21/8, dirección)
   "Necesitamos probar los demás sistemas — un botón cerca del contador de gente en línea que
    al presionarlo te regale 1k de piedra y 1k de madera."
   Reglas: SOLO aparece si la URL lleva ?test (el jugador normal jamás lo ve); regala 1000 madera
   + 1000 piedra al clic, guarda, y avisa si la bolsa queda desbordada. Cuando llegue el
   servidor-autoridad, este botón muere o se protege por cuenta — está anotado en el código.
     node tools/test-boton-pruebas.js                                                             */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

function armar(urlSearch) {
  const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"));
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
    Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
    performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
    document: dom.window.document, Image: dom.window.Image,
    location: { search: urlSearch, hash: "" } };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  vm.createContext(ctx);
  ["config", "nav", "state", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
  ctx.avisos = [];
  ctx.toast = t => ctx.avisos.push(String(t)); ctx.log = t => ctx.avisos.push(String(t));
  ["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
   "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
  let guardo = 0; ctx.saveFarm = () => { guardo++; };
  ctx.initUI();
  return { ctx, dom, boton: dom.window.document.getElementById("btn-test-kit"), guardadas: () => guardo };
}

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nSIN ?test EN LA URL: EL JUGADOR NO VE NADA");
{
  const { boton } = armar("");
  ok("el botón existe en el HTML pero sigue oculto", !!boton && boton.style.display === "none");
  ok("y no tiene clic enganchado", !boton.onclick);
}

console.log("\nCON ?test: APARECE JUNTO AL CONTADOR Y REGALA DE VERDAD");
{
  const { ctx, dom, boton, guardadas } = armar("?test");
  ok("el botón se destapa", boton.style.display !== "none");
  ok("está en la misma zona que el contador de jugadores",
    !!boton.closest && !!dom.window.document.getElementById("s-online") &&
    boton.parentElement === dom.window.document.getElementById("s-online").closest(".brand"));
  const G = ctx.G;
  const m0 = G.res.madera || 0, p0 = G.res.piedra || 0;
  boton.onclick();
  ok("+1000 madera", G.res.madera === m0 + 1000, m0 + " → " + G.res.madera);
  ok("+1000 piedra", G.res.piedra === p0 + 1000, p0 + " → " + G.res.piedra);
  ok("lo cuenta al equipo", ctx.avisos.some(a => /PRUEBAS/.test(a)) && ctx.avisos.some(a => /\+1000 madera/.test(a)));
  ok("y avisa que la bolsa queda desbordada", ctx.avisos.some(a => /desbordada/.test(a)),
    "1000+1000 son " + Math.ceil(2000 / 99) + " pilas contra " + ctx.invSlots() + " casillas");
  ok("guarda la partida tras el regalo", guardadas() >= 1);
  boton.onclick();
  ok("cada clic vuelve a regalar (es una herramienta de equipo, sin tope)", G.res.madera === m0 + 2000);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el equipo prueba, el jugador ni se entera.\n");
process.exit(fallos ? 1 : 0);
