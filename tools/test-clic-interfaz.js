/* EL CLIC DE UNA VENTANA NO ES DEL MUNDO (24/8, diseñador)
   « Tiene un bug, no me deja seleccionar · le doy clic y clickea en la grama o al edificio
   detrás. »
   Los dos síntomas eran UN bug. Phaser engancha el pointerdown en la ventana entera, no solo en
   el canvas (así no pierde los clics que empiezan o terminan fuera del lienzo), así que tocar un
   botón de HTML hacía dos cosas: lo suyo y un golpe en la granja de atrás. El golpe repinta la
   interfaz; si el repintado rehace la grilla ENTRE el apretar y el soltar, el navegador ya no
   tiene el mismo elemento en las dos puntas y NO dispara `click`. De ahí el "no me deja
   seleccionar".
   Contratos:
     · un evento nacido fuera del canvas es de la INTERFAZ, y el mundo no lo mira;
     · el soltar sigue al apretar (si el clic empezó en un panel, su final tampoco es del mundo);
     · un arrastre de cámara que TERMINA sobre el HUD sí se cierra (mira el apretar, no el soltar);
     · el Bosque tiene la misma puerta (si no, el granjero camina al tocar un panel);
     · y la grilla de la Cocina no se rehace si nada cambió, así ningún repintado se come un clic.
     node tools/test-clic-interfaz.js                                                            */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8").split("GF.TILE = 42;")[0] + "GF.TILE = 42;", ctx);
const clicDeInterfaz = ctx.clicDeInterfaz;
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const FOREST = fs.readFileSync("public/game/forest.js", "utf8");
const UI = fs.readFileSync("public/game/ui.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const clic = (nodo) => ({ event: { target: { nodeName: nodo } } });

console.log("\n¿DE QUIÉN ES ESTE CLIC?");
{
  ok("el que nace en el canvas es del MUNDO", clicDeInterfaz(clic("CANVAS")) === false);
  ok("un botón de un panel es de la INTERFAZ", clicDeInterfaz(clic("BUTTON")) === true);
  ok("un div de la grilla de recetas, también", clicDeInterfaz(clic("DIV")) === true);
  ok("una imagen dentro de un botón, también", clicDeInterfaz(clic("IMG")) === true);
  ok("sin evento nativo se lo toma como del mundo (clics sintéticos de las pruebas)",
    clicDeInterfaz({}) === false && clicDeInterfaz(null) === false);
}

console.log("\nLA GRANJA PREGUNTA ANTES DE PEGAR");
{
  const pd = FARM.slice(FARM.indexOf('this.input.on("pointerdown"'), FARM.indexOf('this.input.on("pointerdown"') + 2200);
  ok("el pointerdown corta si el clic es de la interfaz", /if \(clicDeInterfaz\(pt\)\) \{ this\.downEnUI = true; return; \}/.test(pd));
  ok("y corta ANTES de tocar nada del mundo",
    pd.indexOf("clicDeInterfaz") < pd.indexOf("this.ultimaAccion"), "primera línea del handler");
  const pu = FARM.slice(FARM.indexOf('this.input.on("pointerup"'), FARM.indexOf('this.input.on("pointerup"') + 900);
  ok("el soltar sigue al apretar", /if \(this\.downEnUI\) \{ this\.downEnUI = false; return; \}/.test(pu));
  ok("el soltar NO vuelve a preguntar por el target (un paneo puede terminar sobre el HUD)",
    !/clicDeInterfaz/.test(pu));
  ok("y el apretar del mundo limpia la marca", /this\.downEnUI = false;/.test(pd));
}

console.log("\nEL BOSQUE TIENE LA MISMA PUERTA");
{
  const pd = FOREST.slice(FOREST.indexOf('this.input.on("pointerdown"'), FOREST.indexOf('this.input.on("pointerdown"') + 400);
  ok("tocar un panel no manda al granjero a caminar", /if \(clicDeInterfaz\(pt\)\) return;/.test(pd));
  ok("y va antes que GF.uiOpen", pd.indexOf("clicDeInterfaz") < pd.indexOf("GF.uiOpen"));
}

console.log("\nLA GRILLA DE LA COCINA NO SE REHACE DEBAJO DEL CURSOR");
{
  const v2 = UI.slice(UI.indexOf("function refreshCookingV2"), UI.indexOf("function refreshCookingV2") + 6500);
  ok("tiene firma", /const firma = /.test(v2));
  ok("y solo repinta si cambió", /if \(grid\._firma !== firma\)/.test(v2));
  ok("la firma incluye el nivel, la selección y el stock de cada plato",
    /firma = lvl \+ "\|" \+ _ckSel \+ "\|" \+ orden\.map/.test(v2) && /G\.dishes && G\.dishes\[id\]/.test(v2));
  ok("los clics se atan dentro del repintado (no se pierden ni se duplican)",
    v2.indexOf("data-ckrec]\").forEach") > v2.indexOf("grid._firma = firma"));
}

console.log("\nY NINGUNA OTRA ESCENA SE QUEDÓ SIN LA PUERTA");
{
  const escenas = ["public/game/farm.js", "public/game/forest.js", "public/game/plaza.js"];
  let sin = [];
  escenas.forEach(a => {
    const src = fs.readFileSync(a, "utf8");
    if (/this\.input\.on\("pointerdown"/.test(src) && !/clicDeInterfaz/.test(src)) sin.push(a);
  });
  ok("todas las escenas con pointerdown preguntan", sin.length === 0, sin.join(", ") || "granja · bosque · plaza");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el clic de un panel se queda en el panel.\n");
process.exit(fallos ? 1 : 0);
