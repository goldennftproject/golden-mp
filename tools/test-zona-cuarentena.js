/* LA ZONA EN CUARENTENA: ALLÁ SOLO EXISTE LO QUE LLEVÁS   (8/9 tarde, dirección, tanda 3)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Una vez en zona negra, lo único que se puede ver es lo que tenemos en esa bag o backpack. No
   se puede trasladar nada de la bag o backpack al inventario de granja — porque si cogemos algo
   valioso que no queremos perder, sin morir, pues lo pasamos y ya. Pero nop. Es más, no se puede
   ni ver lo que teníamos: eso solo es para granja. »

   La auditoría encontró OCHO caminos por los que la Zona metía o sacaba mano de la granja. Este
   archivo los prueba de a uno, y sobre todo prueba la decisión de fondo: que no se taparon con
   ocho candados sueltos sino con UNA puerta (llevoTengo/llevoGastar/llevoMeter), porque ocho
   candados envejecen y el noveno camino que aparezca mañana nacería abierto. Es literalmente el
   bug de las cañas del 25/8 y el del Estofado: dos inventarios que se separan.

   El test se para DENTRO de la Zona (GF.scene = "forest") y desde ahí intenta hacer trampa.
     node tools/test-zona-cuarentena.js                                                        */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t)); ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const GF = g("GF");
/* la granja llena de cosas, y un contenedor con MUY poco: así cualquier fuga se ve enseguida */
const enLaZona = (carga) => {
  G.conts = { bag: 1, backpack: 1 }; G.cont = null;
  G.res = { carne: 50, flecha: 99, madera: 30 }; G.dishes = { papa_asada: 9 }; G.seeds = { papa: 9 };
  G.plata = 500; G.golden = 40; G.invRows = 6; G.slots = []; G.hp = 50; G.hpMax = 100;
  GF.scene = "farm";
  ctx.viajeElegir("bag");
  (carga || []).forEach(c => ctx.viajeCargar(c[0], c[1], c[2]));
  GF.scene = "forest";
  avisos.length = 0;
};
const volver = () => { GF.scene = "farm"; };

console.log("\nLA PUERTA ÚNICA SABE SOLA DE QUÉ LADO DEL PORTAL ESTÁS");
{
  enLaZona([["res", "flecha", 5]]);
  ok("estamos dentro de la Zona", ctx.enZona() === true);
  ok("acá, « lo que tengo » es el contenedor", ctx.llevoTengo("res", "flecha") === 5, "flechas a mano: " + ctx.llevoTengo("res", "flecha"));
  ok("y NO lo que quedó en la granja", Math.floor(G.res.flecha) === 94, "en la granja quedan " + G.res.flecha);
  volver();
  ok("del otro lado del portal, « lo que tengo » vuelve a ser la bolsa", ctx.llevoTengo("res", "flecha") === 94);
}

console.log("\nFUGA 1 y 2 · LAS FLECHAS SALEN DEL CONTENEDOR, NO DE LA GRANJA");
{
  enLaZona([["res", "flecha", 3]]);
  const raiz = ctx.contLlevado();
  ok("con flechas cargadas se puede disparar", ctx.llevoTengo("res", "flecha") === 3);
  ctx.llevoGastar("res", "flecha", 3);
  ok("gastarlas vacía el contenedor", ctx.contContar(raiz, "res", "flecha") === 0);
  ok("y NO toca las 96 que quedaron en la granja", Math.floor(G.res.flecha) === 96, "granja: " + G.res.flecha);
  /* el arco tiene que quedarse mudo aunque la granja esté llena de flechas: ese es el punto */
  G.gear.arma = "arco_madera"; G.gear.municion = true; G.weapons = { arco_madera: { dur: 40 } };
  ok("sin flechas EN EL CONTENEDOR no se dispara, aunque sobren en la granja", ctx.canShoot() === false);
  ctx.contMeter(raiz, "res", "flecha", 1);
  ok("y con una sola cargada, sí", ctx.canShoot() === true);
}

console.log("\nFUGA 3 · CURARSE CON LA DESPENSA DE LA GRANJA — la más cómoda de todas");
{
  enLaZona([]);
  G.comerHasta = 0;
  const vidaAntes = G.hp;
  ctx.eatDish("papa_asada");
  ok("sin platos en el contenedor NO te curás, aunque tengas nueve en la cocina",
    G.hp === vidaAntes && G.dishes.papa_asada === 9, "vida " + G.hp + " · platos en la granja " + G.dishes.papa_asada);
  volver();
  ctx.viajeCargar("dish", "papa_asada", 2);
  GF.scene = "forest"; G.comerHasta = 0;
  ctx.eatDish("papa_asada");
  ok("con el plato cargado sí, y sale del contenedor",
    G.hp > vidaAntes && ctx.contContar(ctx.contLlevado(), "dish", "papa_asada") === 1,
    "vida " + G.hp + " · quedan " + ctx.contContar(ctx.contLlevado(), "dish", "papa_asada"));
  ok("y la despensa de la granja sigue intacta", G.dishes.papa_asada === 7, "granja: " + G.dishes.papa_asada);
}

console.log("\nFUGA 4 y 5 · LO QUE SE LEVANTA DEL SUELO Y LA RUNA DORADA");
{
  enLaZona([]);
  const raiz = ctx.contLlevado();
  const plataAntes = G.plata, goldenAntes = G.golden, carneAntes = Math.floor(G.res.carne);
  ok("el botín del suelo entra al contenedor", ctx.llevoMeter("res", "colmillo", 4) === true && ctx.contContar(raiz, "res", "colmillo") === 4);
  ctx.llevoMeter("res", "plata", 80);
  ok("la plata también — no se acredita a la billetera", G.plata === plataAntes && ctx.contContar(raiz, "res", "plata") === 80,
    "billetera " + G.plata);
  /* dirección: « sí, entran al contenedor ». Era la última grieta: la moneda premium era lo
     único que la muerte no podía tocar, y encima es lo más valioso del juego. */
  ctx.llevoMeter("res", "golden", 1);
  ok("y el $Golden de la Runa Dorada, que era la última grieta",
    G.golden === goldenAntes && ctx.contContar(raiz, "res", "golden") === 1, "cuenta " + G.golden);
  ok("nada de eso tocó la bolsa de la granja", Math.floor(G.res.carne) === carneAntes && !(G.res.colmillo > 0));
  /* y cuando no entra, NO entra: el contenedor lleno es media mecánica */
  while (ctx.contLibres(raiz)) ctx.contMeter(raiz, "res", "relleno" + ctx.contPilas(raiz), 1);
  ok("con el contenedor lleno el botín rebota, no se cuela a la granja",
    ctx.llevoMeter("res", "esencia_oscura", 1) === false && !(G.res.esencia_oscura > 0));
}

console.log("\nFUGA 6 · LA BOLSA DE LA GRANJA NO SE VE DESDE ALLÁ");
{
  enLaZona([["res", "carne", 2]]);
  ctx.refreshInv();
  const html = ctx.document.getElementById("inv-slots").innerHTML || "";
  ok("el panel pinta el contenedor", /data-czona="res\|carne"/.test(html), html.slice(0, 90));
  ok("y NO la bolsa de la granja: ni la madera ni las semillas están",
    !/res_madera/.test(html) && !/seed_papa/.test(html));
  const cap = ctx.document.getElementById("inv-cap");
  ok("y el pie lo dice con todas las letras", /no se ve ni se toca/.test(cap.textContent || ""), cap.textContent);
  volver();
  ctx.refreshInv();
  const html2 = ctx.document.getElementById("inv-slots").innerHTML || "";
  ok("en la granja vuelve a ser la bolsa de siempre", /data-slot="0"/.test(html2) && !/data-czona/.test(html2));
}

console.log("\nFUGA 7 · LA BARRA RÁPIDA ERA LA PUERTA DE ATRÁS (las teclas 1-0 van global)");
{
  enLaZona([]);
  G.hotbar = [{ kind: "seed", key: "papa" }, { kind: "pick", key: "stone" }, { kind: "dish", key: "papa_asada" }];
  G.picks.owned = { stone: true }; G.picks.dur = { stone: 20 };
  const semAntes = G.selSeed;
  ctx.hotSelect(0);
  ok("sembrar desde la barra no funciona allá — y se dice por qué",
    G.selSeed === semAntes && avisos.some(a => /solo ten[eé]s lo que cargaste/i.test(a)), avisos.join(" · "));
  avisos.length = 0;
  ctx.hotSelect(1);
  ok("equipar un pico, tampoco", avisos.some(a => /granja/i.test(a)));
  /* comer SÍ, porque eatDish ya pasa por la puerta única y saca del contenedor */
  const platosGranja = G.dishes.papa_asada, vidaAntes = G.hp;
  G.comerHasta = 0; avisos.length = 0;
  ctx.hotSelect(2);
  ok("y comer se deja pasar, pero sin platos cargados no cura nada",
    G.hp === vidaAntes && G.dishes.papa_asada === platosGranja, "vida " + G.hp + " · granja " + G.dishes.papa_asada);
}

console.log("\nFUGA 8 · EL FLUJO DEL MARGEN SIGUE AL CONTENEDOR");
{
  enLaZona([["res", "flecha", 4]]);
  const foto = ctx.bolsaFoto();
  ok("la foto es la del contenedor", foto["res:flecha"] === 4, JSON.stringify(foto));
  ok("y NO incluye la bolsa de la granja ni la billetera",
    foto["res:madera"] === undefined && foto["moneda:plata"] === undefined);
  ctx.flujoOlvidar(); ctx.flujoCambios();
  ctx.llevoGastar("res", "flecha", 1);
  const cambios = ctx.flujoCambios();
  ok("y el margen canta lo que se gastó cazando",
    cambios.some(c => c.key === "flecha" && c.d === -1), JSON.stringify(cambios));
  /* cruzar el portal cambia QUÉ se mide: restar las dos fotos escupiría el inventario entero */
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  const iA = UI.indexOf("function irAEscena");
  ok("por eso cambiar de escena olvida la foto", /flujoOlvidar\(\)/.test(UI.slice(iA, iA + 500)));
}

console.log("\nY NO SE TAPÓ CON OCHO CANDADOS SUELTOS, SINO CON UNA PUERTA");
{
  /* lo que se protege acá es la FORMA de la solución. Ocho `if (enZona())` repartidos envejecen:
     el noveno camino que aparezca mañana nace abierto y nadie se acuerda. */
  const ST = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("las tres funciones de la puerta existen",
    /function llevoTengo/.test(ST) && /function llevoGastar/.test(ST) && /function llevoMeter/.test(ST));
  ok("y son las que miran la escena, no cada sitio por su cuenta",
    /function llevoTengo\(kind, key\) \{\s*\n\s*if \(enZona\(\)\)/.test(ST));
  ok("el disparo ya no escribe G.res.flecha a mano", !/G\.res\.flecha--/.test(FOREST));
  ok("comer ya no escribe G.dishes a mano en eatDish",
    !/G\.comerHasta = nowMs\(\) \+ COMER_CD_MS;\s*\n\s*G\.dishes\[id\]--/.test(ST));
  ok("y el suelo de la Zona ya no llama a tryAddRes ni suma plata a la billetera",
    !/ok = tryAddRes\(g\.k, g\.n\)/.test(FOREST) && !/G\.plata \+= g\.n/.test(FOREST));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: allá dentro solo existe lo que cargaste, y la granja no se alcanza.\n");
process.exit(fallos ? 1 : 0);
