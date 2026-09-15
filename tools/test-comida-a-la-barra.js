/* PONER LA COMIDA EN LA BARRA SIN ARRASTRAR            (15/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Aún no se puede poner la comida en la barra ».

   Se podía —arrastrando— desde el 8/9, y ahí estaba el problema: arrastrar era el ÚNICO gesto.
   El drag & drop de HTML5 no dispara con el dedo, así que en una pantalla táctil sencillamente
   no existía; y en la granja el clic en un plato lo COME, de modo que quien lo intentaba veía
   desaparecer la comida y concluía, con razón, que no se podía.

   Lo que se custodia acá no es el gesto (eso necesita un navegador de verdad) sino la parte que
   puede mentir en silencio: que el hueco se elija bien, que no se dupliquen accesos y que la
   barra siga guardando una REFERENCIA y no el objeto — si alguna vez moviera el objeto, apuntar
   a algo del contenedor lo sacaría de la bolsa y ésa es la clase de bug que se descubre tarde.
     node tools/test-comida-a-la-barra.js                                                       */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · EL SEGUNDO CAMINO EXISTE, Y NO PIDE ARRASTRAR\n");
{
  ok("hay una función que manda algo a la barra", /function aLaBarra\(kind, key\)/.test(UI));
  ok("se engancha al clic derecho", /addEventListener\("contextmenu"[\s\S]{0,120}?aLaBarra/.test(UI));
  ok("y al dedo apretado, que es el caso que no existía", /addEventListener\("touchstart"[\s\S]{0,260}?aLaBarra/.test(UI));
  ok("el dedo que se desliza NO cuenta (si no, arrastrar la pantalla llenaría la barra)",
    /touchmove[\s\S]{0,80}?movido = true/.test(UI));
  ok("está en la bolsa de la granja", /bindALaBarra\(c, \(\) => G\.slots/.test(UI));
  ok("y en el contenedor de la Zona", /data-czona[\s\S]{0,200}?bindALaBarra/.test(UI));
  ok("y el rótulo lo cuenta (un gesto que no se ve no existe)",
    /clic derecho \(o dedo apretado\) lo manda a la barra/.test(UI) && /clic derecho \(dedo apretado\) para mandarlo solo/.test(UI));
}

console.log("\n2 · ELIGE BIEN EL HUECO\n");
{
  /* se ejecuta la función de verdad, con la barra de G */
  vm.runInContext(UI.match(/function aLaBarra\(kind, key\) \{[\s\S]*?\n\}/)[0], ctx);
  ctx.toast = () => {}; ctx.refreshHotbar = () => {}; ctx.saveFarm = () => {};
  vm.runInContext("toast = window.toast; refreshHotbar = window.refreshHotbar; saveFarm = window.saveFarm;", ctx);

  G.hotbar = [null, null, null, null, null, null, null, null, null, null]; G.hotSel = 0;
  G.hotbar[0] = { kind: "tool", key: "axe" };
  ok("va al primer hueco LIBRE, no al primero a secas", g('aLaBarra("dish", "estofado")') === true && G.hotbar[1] &&
    G.hotbar[1].kind === "dish" && G.hotbar[1].key === "estofado", JSON.stringify(G.hotbar.slice(0, 3)));
  ok("y el hacha sigue donde estaba", G.hotbar[0].key === "axe");

  const antes = JSON.stringify(G.hotbar);
  ok("mandar lo mismo dos veces no duplica el acceso", g('aLaBarra("dish", "estofado")') === false);
  ok("y no toca la barra", JSON.stringify(G.hotbar) === antes);

  /* barra llena: tiene que hacer algo predecible, no fallar en silencio */
  for (let i = 0; i < 10; i++) G.hotbar[i] = { kind: "res", key: "madera" + i };
  G.hotSel = 4;
  ok("con la barra llena reemplaza el hueco SELECCIONADO (lo que el jugador está mirando)",
    g('aLaBarra("dish", "pan")') === true && G.hotbar[4].key === "pan", JSON.stringify(G.hotbar[4]));
  let otros = 0; for (let i = 0; i < 10; i++) if (i !== 4 && G.hotbar[i].key !== "madera" + i) otros++;
  ok("y no pisa ningún otro", otros === 0);
}

console.log("\n3 · LA BARRA SIGUE SIENDO UNA REFERENCIA, NO UN BOLSILLO\n");
{
  G.dishes = G.dishes || {}; G.dishes.estofado = 3;
  G.hotbar = [null, null, null, null, null, null, null, null, null, null]; G.hotSel = 0;
  const antes = G.dishes.estofado;
  g('aLaBarra("dish", "estofado")');
  ok("mandar un plato a la barra NO lo saca de la bolsa", G.dishes.estofado === antes, G.dishes.estofado + " platos");
  ok("el hueco guarda familia y clave, nada más",
    Object.keys(G.hotbar[0]).sort().join(",") === "key,kind", JSON.stringify(G.hotbar[0]));
  /* y el que la usa sale por la puerta única: dentro de la Zona come del contenedor */
  ok("apretar el número de un plato llama a eatDish (la puerta única)", /d\.kind === "dish"\) eatDish\(d\.key\)/.test(UI));
  ok("y comer es lo ÚNICO que la barra deja hacer dentro de la Zona",
    /enZona\(\) && d\.kind !== "dish" && d\.kind !== "arm"/.test(UI));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
