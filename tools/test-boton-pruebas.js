/* EL BOTÓN DE PRUEBAS: KIT COMPLETO PARA EL EQUIPO, INVISIBLE PARA EL JUGADOR (21-22/8)
   Primera vuelta: "un botón que regale 1k de piedra y 1k de madera". Segunda vuelta de
   dirección: "solo recursos no alcanza — para probar expansiones hace falta NIVEL; y 1000 de
   cada llenaba la bolsa". El contrato de hoy:
     · SOLO aparece si la URL lleva ?test (el jugador normal jamás lo ve);
     · cada clic da recursos CON MEDIDA (200 madera · 150 piedra · 20 de cada mineral · 5000
       plata) y +5 NIVELES DE GRANJA por el camino real (XP acreditada + tareas cumplidas +
       recalcFarmLevel): los regalos y planos de cada nivel llegan solos;
     · clic tras clic escala hasta el techo de granja (50) y ahí lo dice sin subir más.
   Cuando llegue el servidor-autoridad, este botón muere o se protege — anotado en el código.
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

console.log("\nCON ?test: APARECE JUNTO AL CONTADOR Y DA EL KIT COMPLETO");
{
  const { ctx, dom, boton, guardadas } = armar("?test");
  ok("el botón se destapa", boton.style.display !== "none");
  ok("está en la misma zona que el contador de jugadores",
    !!boton.closest && !!dom.window.document.getElementById("s-online") &&
    boton.parentElement === dom.window.document.getElementById("s-online").closest(".brand"));
  const G = ctx.G;
  const m0 = G.res.madera || 0, p0 = G.res.piedra || 0, $0 = G.plata || 0, nv0 = G.level;
  boton.onclick();
  ok("+200 madera y +150 piedra (con medida, no desborda de entrada)",
    G.res.madera === m0 + 200 && G.res.piedra === p0 + 150, m0 + "→" + G.res.madera + " · " + p0 + "→" + G.res.piedra);
  ok("+20 de cada mineral", ["bronce", "hierro", "oro", "diamante", "netherita"].every(k => (G.res[k] || 0) >= 20));
  ok("+5000 de plata", G.plata === $0 + 5000, G.plata + "");
  ok("+5 niveles de granja POR EL CAMINO REAL", G.level === nv0 + 5, "granja " + nv0 + " → " + G.level);
  ok("con la XP acreditada de verdad (no un número pintado)",
    (G.skills.farming || 0) >= vm.runInContext("FARM_XP_LVLS[" + G.level + "]", ctx));
  ok("lo cuenta al equipo", ctx.avisos.some(a => /PRUEBAS/.test(a)) && ctx.avisos.some(a => /nivel/.test(a)));
  ok("guarda la partida tras el regalo", guardadas() >= 1);
  boton.onclick();
  ok("cada clic escala 5 niveles más", G.level === nv0 + 10, "granja " + G.level);
  for (let i = 0; i < 12; i++) boton.onclick();
  const MAX = vm.runInContext("FARM_NIVEL_MAX", ctx);
  ok("y se planta en el techo de granja (" + MAX + ") sin romperse", G.level === MAX, "granja " + G.level);
  ok("al techo lo dice, sin prometer más niveles", ctx.avisos.some(a => /techo/.test(a)));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el equipo prueba, el jugador ni se entera.\n");
process.exit(fallos ? 1 : 0);
