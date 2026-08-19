/* ¿CUÁNTO DURA UNA VISITA Y CUÁNTO HAY QUE ESPERAR? (18/8, dirección)
   Todas las simulaciones de la semana miden cuánto TARDA algo. Esta mide la otra cara: el jugador
   abre el juego, hace todo lo que hay, y ¿cuánto rato le duró? ¿Y cuánto tiene que esperar hasta
   que valga la pena volver?
   Eso no lo dice ninguna curva de XP: sale de cruzar todos los relojes a la vez.
     node tools/medir-tiempo-muerto.js                                                           */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={CROP_DEF,ORE_DEF,CD,NIVEL_ARBOLES,NIVEL_ROCAS,FARM_PARCELA,SEED_POR_PARCELA:typeof SEED_POR_PARCELA!=='undefined'?SEED_POR_PARCELA:40,FISH_CD};",
  ctx, { filename: "state.js" });
const X = ctx.__X;
const SEG_POR_CLIC = 3;   // lo que tarda de verdad tocar una cosa y ver el resultado

function granja(lvl, exp) {
  let par = 3; for (const k in X.FARM_PARCELA) if (lvl >= +k) par = X.FARM_PARCELA[k];
  return { par, arb: X.NIVEL_ARBOLES.filter(n => n <= lvl).length + exp,
                roc: X.NIVEL_ROCAS.filter(n => n <= lvl).length + exp };
}
// Devuelve: cuánto dura la visita (min de clics), y cuál es el reloj más corto que queda corriendo
function visita(lvl, exp, cultivo) {
  const g = granja(lvl, exp), cd = X.CROP_DEF[cultivo];
  const cupo = X.SEED_POR_PARCELA * Math.max(3, g.par);
  const relojes = [];
  // TODO listo al llegar (vuelve después de una noche)
  let clics = g.par + g.arb + g.roc + 5 /*vetas*/ + 1 /*pesca*/;
  relojes.push(cd.growH * 60);                      // el cultivo vuelve en esto
  relojes.push(X.CD.tree / 60, X.CD.rock / 60, (X.FISH_CD || 900) / 60);
  const corto = Math.min(...relojes);
  // mientras el cultivo siga dando y quede cupo, la visita se estira replantando
  const ciclosCupo = Math.floor(cupo / g.par);
  const seguidos = Math.min(ciclosCupo, 6);          // nadie se queda más de 6 vueltas seguidas
  const minutos = (clics * SEG_POR_CLIC) / 60 + seguidos * cd.growH * 60;
  return { g, cupo, clics, corto, minutos, cultivo: cd.label, ciclosCupo,
           soloClic: (clics * SEG_POR_CLIC) / 60 };
}
console.log("LA VISITA: llega con todo listo, atiende, y espera al reloj más corto\n");
console.log("nivel exp  cultivo      cosas que tocar   clic puro   con replantes   el reloj más corto   ciclos de cupo");
for (const [lvl, exp, cul] of [[1,0,"papa"],[3,1,"papa"],[7,3,"cereza"],[12,5,"cebolla"],[20,8,"repollo"],[30,11,"brocoli"],[50,16,"maiz"]]) {
  const v = visita(lvl, exp, cul);
  console.log(String(lvl).padStart(5) + String(exp).padStart(4) + "  " + v.cultivo.padEnd(12) +
    String(v.clics).padStart(15) + (v.soloClic.toFixed(1) + " min").padStart(12) +
    (v.minutos.toFixed(0) + " min").padStart(16) + (v.corto.toFixed(0) + " min").padStart(21) +
    String(v.ciclosCupo).padStart(15));
}
console.log("\nEL DÍA COMPLETO, con 3 visitas repartidas en 14 h de vigilia:");
console.log("   tiempo delante del juego   ~15-40 min");
console.log("   tiempo de reloj corriendo  ~13 h");
console.log("   o sea que el 95% del día el juego avanza SIN el jugador. Eso es un idle, y está bien.");
console.log("   La pregunta no es cómo llenar 13 h: es qué hacer con los HUECOS DENTRO de la visita.");
