/* Compara el coste de las recetas y la probabilidad de domar cada especie.
   Las tareas aprovechan los recursos y cultivos que ya están en la granja.
   Ejecutar con node tools/auditar-doma.js desde la raíz del juego. */
const fs = require("fs"), vm = require("vm");

const ctx = {
  location: { hash: "", search: "" },
  console: { log() {}, warn() {}, error() {}, info() {} },
};
ctx.window = ctx;
vm.createContext(ctx);
for (const archivo of ["config", "nav", "state"]) {
  vm.runInContext(fs.readFileSync("public/game/" + archivo + ".js", "utf8"), ctx);
}
const leer = expresion => vm.runInContext(expresion, ctx);
const recetas = leer("RECIPE_DEF"), cultivos = leer("CROP_DEF"), precios = leer("PRICE");
const platos = leer("DOMA_PLATO"), roles = leer("DOMA_ROL"), especies = leer("DOMA_ESPECIES");
const costo = res => Object.entries(res).reduce((total, [id, n]) => total + (cultivos[id]?.price || precios[id] || 0) * n, 0);
const costoPorRol = Object.fromEntries(Object.entries(platos).map(([rol, id]) => [rol, costo(recetas[id].res)]));

console.log("\nCOSTE ESPERADO DE DOMA A PRECIO DE INGREDIENTES");
for (const especie of especies) {
  const rol = roles[especie], receta = recetas[platos[rol]], probabilidad = ctx.domaChance(especie);
  const esperado = Math.round(costoPorRol[rol] / probabilidad);
  console.log("  " + especie.padEnd(10) + receta.label.padEnd(23) + "Cocina " + receta.lvl +
    " · " + costoPorRol[rol] + " Plata por intento · 1 de " + Math.round(1 / probabilidad) + " · " + esperado + " Plata de coste esperado");
}

const azarExcavacion = ctx.excavAzar;
leer("G.seeds.papa = 1");
ctx.excavAzar = () => 0;
const minLombrices = ctx.excavBotin(0).n;
ctx.excavAzar = () => 0.99;
const maxLombrices = ctx.excavBotin(0).n;
ctx.excavAzar = azarExcavacion;
const monticulos = ctx.excavPorDia();
const cargas = leer("NODO_CARGAS_MAX") - 1;
const comision = Math.round(leer("DOMA_COMISION") * 100);
const reduccion = Math.round(leer("DOMA_LARVA_PCT") * 100);

console.log("\nTRABAJO SOBRE LOS RECURSOS DE LA GRANJA");
console.log("  Rata · " + minLombrices + "–" + maxLombrices + " lombrices por montículo, " + monticulos + " montículos diarios de base");
console.log("  Brazos · hasta " + cargas + " cargas acumuladas por nodo lleno, dejando una, comisión " + comision + " %");
console.log("  Larva · recorta el " + reduccion + " % de lo que falta una vez por cultivo");
console.log("  Cada carne mantiene al ayudante alimentado durante " + leer("DOMA_COMIDA_H") + " h");
console.log("  Con la granja abierta se ve el recorrido. Al volver se recoge el trabajo sobre los recursos disponibles mientras tenía comida.");

let fallos = 0;
function comprobar(texto, pasa) {
  if (!pasa) fallos++;
  console.log((pasa ? "  ok     " : "  FALLA  ") + texto);
}
console.log("\nESCALERA DE RECETAS Y PROBABILIDADES");
comprobar("la galletita cuesta menos que la papilla y el costillar", costoPorRol.rata > 0 &&
  costoPorRol.rata < costoPorRol.larva && costoPorRol.larva < costoPorRol.brazos);
comprobar("los ayudantes de árboles y rocas son más difíciles de domar", ctx.domaChance("orco") < ctx.domaChance("rata"));
comprobar("todos los ayudantes de árboles y rocas tienen la misma probabilidad", especies
  .filter(especie => roles[especie] === "brazos").every(especie => ctx.domaChance(especie) === ctx.domaChance("orco")));
process.exitCode = fallos ? 1 : 0;
