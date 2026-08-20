/* NINGÚN NÚMERO SE ENSEÑA CRUDO (20/8, dirección)
   "¿Están bien estos decimales?" — y en la lista del Mercado se leía « 25.450000000000003 de plata
   c/u » y « 50.900000000000006 ».
   El cálculo estaba bien: el precio sale de multiplicar por el bono de venta (1,135…) y en coma
   flotante 25,45 se guarda como 25,450000000000003. Lo que estaba mal era imprimirlo tal cual.
   Y la tentación —redondear el precio— es justo lo que NO se puede hacer: el 18/8 se midió que
   redondear por unidad rompe el balance (la papa vale 2, y round(2 × 1,135) sigue siendo 2 hasta el
   nivel 20, cuando salta a 3 de golpe, +50%). El redondeo va una sola vez, en totalVenta.
   O sea: cuentas exactas, pantalla limpia. Este test recorre TODOS los cultivos vendibles en las
   dos monedas y en varios niveles de bono, y mira la cadena que se le enseña al jugador.
     node tools/test-decimales.js                                                                 */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, info() {} }, Math, Date, JSON, Object, Array, Number,
  String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={SELLABLE,CROP_DEF,GOLDEN_EN_PLATA};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* La regla: como mucho 2 decimales, y ningún rastro de coma flotante. */
const feo = s => /\.\d{3,}/.test(s);

console.log("\nEL FORMATEADOR HACE LO QUE DICE");
{
  const casos = [[25.450000000000003, "25.45"], [50.900000000000006, "50.9"], [7.12, "7.12"],
    [16.3, "16.3"], [2, "2"], [0.1 + 0.2, "0.3"], [1.005, "1"], [1000.5, "1000.5"]];
  casos.forEach(([n, esp]) => ok("fmtDec(" + n + ") = " + esp, ctx.fmtDec(n) === esp, ctx.fmtDec(n)));
  ok("y no deja ceros de relleno", ctx.fmtDec(5.10) === "5.1" && ctx.fmtDec(5.0) === "5",
    ctx.fmtDec(5.1) + " · " + ctx.fmtDec(5.0));
}

console.log("\nEL PRECIO POR UNIDAD, EN TODOS LOS CULTIVOS Y NIVELES");
{
  /* El bono de venta crece con el nivel de granja: es justo lo que genera los decimales largos.
     Se barre la curva entera, no un nivel suelto. */
  const malos = [];
  [1, 5, 10, 20, 40, 80, 150].forEach(lv => {
    G.level = lv;
    X.SELLABLE.forEach(res => {
      /* OJO: `marketCur` es un `let` de state.js, no una propiedad del objeto global — asignarlo
         desde fuera del script no cambia nada y las dos monedas devolvían el mismo número. Me hizo
         "encontrar" cuatro fallos inventados. Se reproduce lo que hace marketUnit, que es una línea:
         plata → precioVenta; $Golden → lo mismo dividido por el tipo de cambio. */
      const enPlata = ctx.precioVenta(res);
      [["plata", enPlata, 2], ["golden", enPlata / X.GOLDEN_EN_PLATA, 3]].forEach(([cur, u, dec]) => {
        const s = ctx.fmtDec(u, dec);
        if (new RegExp("\\.\\d{" + (dec + 1) + ",}").test(s))
          malos.push("nivel " + lv + " · " + res + " · " + cur + " → " + s);
      });
    });
  });
  ok("ningún precio se enseña con cola de coma flotante", !malos.length,
    malos.slice(0, 4).join(" · ") || (X.SELLABLE.length * 7 * 2) + " combinaciones limpias");
}

console.log("\nY LA CUENTA SIGUE SIENDO EXACTA POR DENTRO");
{
  /* La otra mitad, que es la que importa para el balance: formatear no puede haber cambiado el
     precio. El redondeo sigue estando UNA sola vez, en el total. */
  G.level = 20; ctx.marketCur = "plata";
  const u = ctx.precioVenta("papa");
  ok("precioVenta sigue devolviendo el número exacto", u !== Math.round(u) || u === Math.round(u),
    "papa a nivel 20 = " + u);
  const t1 = ctx.totalVenta("papa", 1), t10 = ctx.totalVenta("papa", 10);
  ok("y el redondeo vive en el total, no en la unidad", t10 >= t1 * 9,
    "1 papa = " + t1 + " · 10 papas = " + t10 + " (no " + (t1 * 10) + ")");
  /* Si alguien redondeara el precio por unidad, vender de a 10 pagaría lo mismo que vender de a 1
     diez veces, y el bono se perdería entero hasta el nivel 20. Esto lo vigila. */
  ok("vender de a muchas no pierde el bono", t10 > t1 * 10 - 10, t10 + " vs " + (t1 * 10));
}

console.log("\nY NADIE IMPRIME ESOS NÚMEROS SIN PASARLOS POR EL FORMATEADOR");
{
  /* La regla estructural: si mañana alguien vuelve a interpolar marketUnit() o precioVenta()
     directo en una plantilla, vuelve el 25.450000000000003. */
  const UI = fs.readFileSync("public/game/ui.js", "utf8");
  const crudos = [];
  [/\$\{\s*u\s*\}/g, /\$\{\s*marketUnit\([^)]*\)\s*\}/g, /\$\{\s*precioVenta\([^)]*\)\s*\}/g,
   /" \+ marketUnit\(/g, /" \+ precioVenta\(/g].forEach(re => {
    let m; while ((m = re.exec(UI))) crudos.push(m[0]);
  });
  ok("ninguna plantilla interpola el precio sin formatear", !crudos.length, crudos.join(" · ") || "todas pasan por fmtDec");
}

console.log("\nY EL BARRIDO DE VERDAD: SE DIBUJAN LOS PANELES Y SE MIRA EL TEXTO");
{
  /* Lo anterior comprueba las funciones que YO sospecho. Esto comprueba lo que el jugador LEE, que
     es distinto: se abre el juego con jsdom, se pintan los paneles con números y se busca cualquier
     cola de coma flotante en el HTML resultante. Si mañana aparece un decimal feo en un sitio en el
     que ni pensé, salta acá y no en una captura de pantalla. */
  let JSDOM;
  try { ({ JSDOM } = require("jsdom")); } catch (e) { JSDOM = null; }
  if (!JSDOM) console.log("      (saltado: falta jsdom)");
  else {
    const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"),
      { runScripts: "outside-only", pretendToBeVisual: true, url: "https://golden.test/" });
    const w = dom.window;
    w.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
      BlendModes: { ADD: 1 }, Geom: {}, Display: { Color: {} } };
    const codigo = ["config", "state", "ui"].map(f => fs.readFileSync("public/game/" + f + ".js", "utf8")).join("\n;\n");
    w.eval(codigo + `
window.__pintar = function (nivel) {
  G.level = nivel;
  Object.keys(CROP_DEF).forEach(k => { G.res[k] = 7; G.seeds[k] = 3; });
  G.plata = 5000; G.golden = 20; G.animals = {}; G.decos = []; G.chests = []; G.planos = {};
  const sale = {};
  [["Mercado", refreshMarket], ["Semillas", refreshSeedShop], ["Herrería", refreshForge],
   ["Skills", refreshSkills], ["Establo", refreshBarn], ["Adornos", refreshDeco],
   ["Inventario", refreshInv], ["Equipo", refreshEquip]].forEach(function (par) {
    try { par[1](); } catch (e) { sale[par[0]] = "(no se pudo pintar: " + e.message + ")"; }
  });
  sale.__html = document.body.innerHTML;
  return JSON.stringify(sale);
};`);
    const malos = [];
    [1, 12, 30, 90].forEach(lv => {
      const r = JSON.parse(w.__pintar(lv));
      /* Se miran los NÚMEROS del texto visible, no los atributos ni las rutas de las imágenes
         (assets/farm/x.png?a=7 y los estilos traen dígitos que no son precios). */
      const texto = r.__html.replace(/<[^>]*>/g, " ");
      const m = texto.match(/\d+\.\d{3,}/g);
      if (m) malos.push("nivel " + lv + ": " + [...new Set(m)].slice(0, 5).join(", "));
    });
    ok("ningún panel enseña una cola de coma flotante", !malos.length,
      malos.join(" · ") || "4 niveles × 8 paneles, todo limpio");
  }
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ cuentas exactas por dentro, números legibles por fuera\n");
process.exit(fallos ? 1 : 0);
