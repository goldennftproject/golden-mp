/* LA PESCA v4 SOBREVIVE AL F5                                          (1/9, reporte de dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « esto no dura las 8 horas y no da las lombrices » — con captura: las bocas del Lombricario,
   vacías. La causa no era el Lombricario: era que LA PESCA v4 ENTERA no estaba en snapshot().
   Las bocas, las Escamas, los récords, las nasas caladas, el torneo, la marea en curso — todo
   nacía el 27/8 y nadie agregó sus campos a la lista del guardado. Una lista a mano envejece
   en silencio, y la regla de la casa es clara: « el único motivo por el cual se debe resetear
   una partida es cuando se actualiza borrando caché ». Un F5 no es borrar caché.

   Este archivo custodia los catorce campos con la prueba que importa: el viaje completo
   snapshot → JSON → hydrate sobre un estado limpio, y el caso del reporte reproducido con
   reloj — echar al Lombricario, «F5», esperar las 8 horas, y cobrar lo prometido.
     node tools/test-pesca-sobrevive-f5.js                                                     */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let AHORA = Date.UTC(2026, 8, 1, 15);
ctx.nowMs = () => AHORA;
vm.runInContext("nowMs = window.nowMs;", ctx);

console.log("\nEL CASO DEL REPORTE: ECHAR, F5, ESPERAR, COBRAR");
{
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "farming");
  G.skills = { farming: acc, fishing: acc };
  G.lombricario = []; G.res.cebolla = 10; G.res.lombriz = 0;
  ok("se echa una tanda de cebollas", ctx.lombricarioEchar("cebolla") === true);
  const prometido = ctx.lombricario()[0].n, reloj = ctx.lombricario()[0].listaEn;

  /* EL F5: snapshot → JSON (como viaja a la nube) → estado limpio → hydrate */
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  G.lombricario = undefined;                       // la sesión nueva no sabe nada
  ctx.hydrate(snap);
  ok("tras el F5, la boca SIGUE ocupada", ctx.lombricario().length === 1);
  ok("con su reloj intacto — no se reinician las 8 horas", ctx.lombricario()[0].listaEn === reloj);
  ok("y con lo prometido al echar", ctx.lombricario()[0].n === prometido);

  AHORA += (g("LOMBRICARIO_HORAS") + 1) * 3600e3;
  ok("cumplidas las 8 h, hay lombrices LISTAS esperando", ctx.lombricarioListas() === 1);
  ok("y recoger paga lo del cartel", ctx.lombricarioReclamar() === prometido && G.res.lombriz === prometido,
    "+" + prometido + " 🪱");
}

console.log("\nLOS CATORCE CAMPOS DE LA PESCA, IDA Y VUELTA");
{
  /* se puebla TODO el oficio con datos reconocibles y se hace el viaje completo */
  G.pescaV4 = { records: { merluza: 1.5 }, cebo: "larva_luz", sinEpico: 33, primeroDelDia: "x" };
  G.pescaStats = { capturas: 41, gigantes: 2 };
  G.nasas = [{ tipo: "mimbre", desde: AHORA }];
  G.nasaPlanos = { reforzada: true };
  G.escamasLonja = 77;
  G.lonja = { sello: "s1", tipo: "peso", id: "salmon", kgMin: 4.3, n: 2, hechos: 1, cobrado: false };
  G.lonjaCap = { sem: 9, cobrado: false, a: { id: "pargo", n: 1 }, b: { id: "merluza", n: 5 } };
  G.lonjaMes = { mes: "2026-8", id: "pez_gota", n: 1, cobrado: false };
  G.lonjaEntregados = 12;
  G.torneo = { sem: 100, pts: 2.5, id: "pez_espada", kg: 60 };
  G.torneoCobrado = 99; G.torneoPodioCobrado = 98;
  G.tituloPesca = "capitan";
  G.lombricario = [{ cultivo: "papa", n: 1, listaEn: AHORA + 999 }];

  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  const CAMPOS = ["pescaV4", "pescaStats", "nasas", "nasaPlanos", "escamasLonja", "lonja", "lonjaCap",
                  "lonjaMes", "lonjaEntregados", "torneo", "torneoCobrado", "torneoPodioCobrado",
                  "tituloPesca", "lombricario"];
  ok("el snapshot lleva los catorce", CAMPOS.every(k => snap[k] !== undefined),
    CAMPOS.filter(k => snap[k] === undefined).join(", "));

  const antes = {}; CAMPOS.forEach(k => { antes[k] = JSON.stringify(G[k]); G[k] = undefined; });
  ctx.hydrate(snap);
  const rotos = CAMPOS.filter(k => JSON.stringify(G[k]) !== antes[k]);
  ok("y el hydrate los devuelve IDÉNTICOS", !rotos.length, rotos.join(", "));
  ok("la marea de peso conserva su progreso a medio hacer", G.lonja.hechos === 1 && G.lonja.kgMin === 4.3);
  ok("el récord del torneo sigue siendo el pez espada de 60 kg", G.torneo.kg === 60);
  ok("y las 77 Escamas no se evaporaron", ctx.escamasLonja() === 77);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: un F5 ya no le roba la laguna a nadie.\n");
process.exit(fallos ? 1 : 0);
