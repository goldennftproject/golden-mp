/* LA CUARENTENA LLEGA TAMBIÉN AL PANEL DE EQUIPO       (8/9, auditoría general)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La regla de la Zona, dictada por dirección el 8/9: « una vez en zona negra lo único que se
   puede ver es lo que tenemos en esa bag o backpack ». La tanda 3 cerró ocho fugas. Quedaban
   dos, y las dos en el mismo sitio: el panel de Equipo, que es donde el jugador va cuando algo
   no funciona.

     · EL ARMA — el slot recorría G.weapons, o sea el arsenal de la GRANJA. Dentro de la Zona te
       dejaba equiparte la espada que dejaste en casa (fuga hacia adentro) y NO te dejaba equipar
       la de repuesto que sí habías cargado (fuga hacia afuera). Y cargar tu única arma la sacaba
       de G.weapons, así que la puerta contestaba « equipate un arma antes de entrar » con el arma
       a la vista dentro del contenedor, imposible de ponerse.
     · LAS FLECHAS — la ranura leía G.res.flecha. Con 200 en el contenedor y 0 en casa el panel
       decía « No tenés flechas » y no dejaba equiparlas… mientras porQueNoAtaca() mandaba al
       jugador justo a ese panel. La barra rápida ya preguntaba bien; esta ranura no.

   Y dos avisos que mentían, que es la otra cara de lo mismo:
     · EL ARMA ROTA — armaEq() exige dur > 0, así que al romperse devolvía null y el aviso decía
       « equipate un arma, la tenés en la bolsa »: con el arma equipada, y hablando de una bolsa
       que dentro de la Zona no existe.
     · EL SET DE LA CURTIDURÍA — equipoCaido solo hacía G.armorEq = null y no tocaba G.armor, así
       que el set « caía », el log te lo contaba como perdido, ocupaba un hueco del cuerpo… y
       bastaba pulsar « Equipar » para recuperar los 15 de defensa gratis.

   Regla que custodia este archivo: dentro de la Zona, TODAS las preguntas sobre lo que tenés se
   le hacen al contenedor. Y lo que el juego dice que perdiste, se pierde.
     node tools/test-cuarentena-equipo.js                                                       */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const ARMOR_SLOTS = g("ARMOR_SLOTS");
const enGranja = () => { ctx.GF.scene = "farm"; };
const enLaZona = () => { ctx.GF.scene = "forest"; };

console.log("\nEL ARMA: LA LISTA SALE DE DONDE ESTÉS");
{
  enGranja();
  G.conts = { backpack: 1 }; G.cont = null;
  G.weapons = { espada_bronce: { dur: 40 }, arco_madera: { dur: 30 } };
  G.gear.arma = "espada_bronce";
  ctx.viajeElegir("backpack");
  ok("en la granja, el arsenal de casa", ctx.armasAMano().length === 2, ctx.armasAMano().join(", "));

  ctx.viajeCargar("arm", "arco_madera", 1);   // el jugador carga el arco de repuesto
  enLaZona();
  const l = ctx.armasAMano();
  ok("en la Zona: la puesta más la que llevás", l.length === 2 && l.indexOf("arco_madera") >= 0, l.join(", "));
  G.weapons.mazo_hierro = { dur: 50 };        // un arma que se quedó EN LA GRANJA
  ok("y lo que dejaste en casa no aparece", ctx.armasAMano().indexOf("mazo_hierro") < 0, ctx.armasAMano().join(", "));
}

console.log("\nCAMBIAR DE ARMA DENTRO ES UN INTERCAMBIO, NO UN REGALO");
{
  const armasTotales = () => 1 + ctx.contAplanar(ctx.contLlevado()).filter(e => e.kind === "arm").length;
  const antes = armasTotales();
  ok("el cambio se hace", ctx.armaCambiarLlevada("arco_madera"));
  ok("llevás el arco puesto", G.gear.arma === "arco_madera");
  ok("el arco salió del contenedor", ctx.contContar(ctx.contLlevado(), "arm", "arco_madera") === 0);
  ok("y la espada bajó ahí CON su ficha",
    ctx.contContar(ctx.contLlevado(), "arm", "espada_bronce") === 1 &&
    ctx.contAplanar(ctx.contLlevado()).some(e => e.k === "espada_bronce" && e.w && e.w.dur === 40),
    JSON.stringify(ctx.contAplanar(ctx.contLlevado()).filter(e => e.kind === "arm")));
  /* lo que este test existe para impedir: que el intercambio invente o evapore un arma */
  ok("no se inventó ni se perdió ninguna", armasTotales() === antes, antes + " → " + armasTotales());
}

console.log("\nLAS FLECHAS SE CUENTAN DONDE ESTÁS");
{
  G.res = { flecha: 0 };
  ctx.contMeter(ctx.contLlevado(), "res", "flecha", 120, null, 1);
  enLaZona();
  ok("en la Zona, las del contenedor", ctx.llevoTengo("res", "flecha") === 120, String(ctx.llevoTengo("res", "flecha")));
  enGranja(); G.res = { flecha: 7 };
  ok("en la granja, las de la bolsa", ctx.llevoTengo("res", "flecha") === 7, String(ctx.llevoTengo("res", "flecha")));
  const UI = require("fs").readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  ok("y la ranura del panel pregunta por la puerta única, no por G.res",
    /const fl = llevoTengo\("res", "flecha"\)/.test(UI));
}

console.log("\nLOS AVISOS DICEN LA VERDAD");
{
  const esc = Object.create(g("ForestScene").prototype);
  G.gear.arma = "espada_bronce"; G.weapons = { espada_bronce: { dur: 0 } };
  ok("el arma rota se llama rota", /rota/i.test(esc.porQueNoAtaca() || ""), esc.porQueNoAtaca());
  G.weapons = { espada_bronce: { dur: 40 } };
  ok("y con ella entera, nadie se queja", !esc.porQueNoAtaca(), String(esc.porQueNoAtaca()));
  /* sin arma puesta pero con una en el contenedor, el aviso manda al sitio correcto */
  enLaZona();
  G.gear.arma = null; G.weapons = {};
  G.conts = { backpack: 1 }; G.cont = null; ctx.viajeElegir("backpack");
  ctx.contMeter(ctx.contLlevado(), "arm", "espada_bronce", 1, { w: { dur: 40 } }, 1);
  ok("con un arma en el contenedor, te manda al panel de Equipo",
    /contenedor/i.test(esc.porQueNoAtaca() || ""), esc.porQueNoAtaca());
  G.cont = null;
  ok("y sin nada, te manda a cargarla en la puerta",
    /puerta del portal/i.test(esc.porQueNoAtaca() || ""), esc.porQueNoAtaca());
}

console.log("\nEL SET DE LA CURTIDURÍA CAE DE VERDAD — Y VUELVE DE VERDAD");
{
  enGranja();
  G.armor = {}; ARMOR_SLOTS.forEach(pz => G.armor[ctx.armorKey("fibra", pz)] = true);
  G.armorEq = "fibra";
  G.conts = { backpack: 1 }; G.cont = null; G.tumba = null; ctx.viajeElegir("backpack");
  ok("(control) el set está completo y puesto", ctx.armorSetCompleto("fibra") && G.armorEq === "fibra");

  ctx.tumbaCaer("pantano", 5, 5, () => 0.0);   // azar 0: TODAS las piezas caen
  ok("tras la caída el set ya no está", !ctx.armorSetCompleto("fibra"), "piezas: " + ctx.armorPuestas("fibra"));
  ok("ni equipado", !G.armorEq, String(G.armorEq));
  ok("y está en el cuerpo, que es donde el log dijo que estaba",
    (G.tumba && G.tumba.items || []).some(e => e.kind === "armorset" && e.k === "fibra"));

  G.conts = { backpack: 1 }; G.cont = null; ctx.viajeElegir("backpack");
  ctx.contMeter(ctx.contLlevado(), "armorset", "fibra", 1, null, 1);
  ctx.contDescargar(ctx.contLlevado(), true);
  ok("recuperar el cuerpo devuelve las cinco piezas", ctx.armorSetCompleto("fibra"), "piezas: " + ctx.armorPuestas("fibra"));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: dentro de la Zona se le pregunta al contenedor, y lo perdido se pierde.\n");
process.exit(fallos ? 1 : 0);
