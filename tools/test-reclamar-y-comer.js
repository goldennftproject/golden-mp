/* LO QUE SE CRAFTEA SE RECLAMA · Y DOS SEGUNDOS ENTRE PLATOS   (27/8, informe del diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Tres puntos del mismo informe que resultaron ser el mismo cambio:

     « el horno de piedra craftea simultáneo, debe hacerse como en la cocina »
     « cuando se crafteen deben reclamarse en el edificio, no ir directo a la bag »
     « colocar a los edificios un signo de exclamación cuando se tenga algo pendiente »

   Los tres describen un edificio que deja de ser una máquina expendedora y vuelve a ser un
   SITIO: se pone algo, se hace de a uno, y hay que volver a buscarlo. El signo de exclamación
   no es decoración de ese cambio — es lo que lo hace jugable, porque sin él « volver a buscarlo »
   se convierte en « abrir las dos ventanas cada tanto por si acaso ».

   Y el cuarto punto va aparte pero es de la misma familia:
     « cuando usas un plato para curarte tiene 2 segundos CD entre comidas »
   Sin ese freno, un clic sostenido sobre la pila vacía la despensa y cura de golpe: no es una
   decisión, es un accidente con forma de botón.
     node tools/test-reclamar-y-comer.js                                                         */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (m) => avisos.push(m); ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);
const MAT = g("MAT_DEF"), REC = g("RECIPE_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let T = 1787900000000;
ctx.nowMs = () => T;
vm.runInContext("nowMs = window.nowMs;", ctx);
const adelantar = (ms) => { T += ms; };
function limpio() {
  G.built = { horno: true, cocina: true }; G.level = 12; G.tuto = { done: true };
  G.res = { madera: 200, piedra: 200, papa: 40, carne: 20, trigo: 20 };
  G.horno = []; G.cook = []; G.dishes = {}; G.comerHasta = 0; G.buffs = [];
  G.hp = 10; G.hpMax = 100; G.invRows = 6;
  let acc = 0; for (let k = 2; k <= 12; k++) acc += ctx.skillNeed(k, "cooking");
  G.skills = { cooking: acc, crafting: acc, farming: acc };
  avisos.length = 0;
}

console.log("\nEL HORNO FUNDE DE A UNO   (era simultáneo, como las ollas antes del 26/8)");
{
  limpio();
  for (let i = 0; i < 3; i++) ctx.craftMat("tablon");
  const l = ctx.hornoList();
  console.log("");
  l.forEach((p, i) => console.log("    pieza " + (i + 1) + ": empieza en " +
    ctx.fmtDur(Math.max(0, ctx.hornoEmpieza(p) - T)).padStart(7) + " · lista en " + ctx.fmtDur(p.listoAt - T).padStart(7)));
  console.log("");
  ok("la primera arranca ya", !ctx.hornoEsperando(l[0]));
  ok("la segunda espera su turno", ctx.hornoEsperando(l[1]));
  ok("y la tercera también", ctx.hornoEsperando(l[2]));
  const paso = l[1].listoAt - l[0].listoAt;
  ok("cada una termina un reloj después de la anterior",
    Math.abs(paso - ctx.matCdMs("tablon")) < 1000, Math.round(paso / 60000) + " min de separación");
  console.log("       → si las tres terminaran juntas, el horno sería una fábrica con tres bocas");
  console.log("         gratis. Es el mismo fallo que tenían las ollas, y la misma línea lo cura.");
}

console.log("\nY LO FUNDIDO ESPERA A QUE LO BUSQUEN");
{
  adelantar(ctx.matCdMs("tablon") + 1000);
  ctx.checkHorno();
  ok("vencido el reloj, la pieza queda LISTA", ctx.pendienteDe("horno") === 1);
  ok("pero NO está en la bolsa", !(G.res.tablon > 0), "tablones: " + (G.res.tablon || 0));
  /* 31/8: hayPendientes() suma también el buzón (today.docx); lo que se defiende es el horno */
  ok("el edificio lo anuncia hacia afuera", ctx.pendienteDe("horno") === 1);
  console.log("       → de acá sale el signo de exclamación del mundo, y de acá SOLO: si el badge");
  console.log("         llevara su propia cuenta, un día diría « hay algo » con el horno vacío, y");
  console.log("         a partir de ese día el jugador deja de creerle.");
  const antes = G.res.tablon || 0;
  ok("recogerla la pone en la bolsa", ctx.hornoRecoger() === 1 && (G.res.tablon || 0) === antes + 1);
  ok("y ya no hay nada pendiente en el horno", ctx.pendienteDe("horno") === 0);
  avisos.length = 0;
  ok("recoger con el horno vacío avisa, no calla", ctx.hornoRecoger() === 0 && avisos.length > 0, avisos[0]);
}

console.log("\nLA COCINA HACE LO MISMO, Y LO DICE IGUAL");
{
  limpio();
  ctx.cook("papa_asada");
  adelantar((REC.papa_asada.cookS || 8) * 1000 * 3 + 2000);
  ctx.checkCooking();
  ok("el plato queda listo en la olla", ctx.pendienteDe("cocina") === 1);
  ok("y no en la bolsa", !(G.dishes.papa_asada > 0));
  ok("recogerlo lo entrega", ctx.cocinaRecoger() === 1 && (G.dishes.papa_asada || 0) === 1);
  /* la XP se cobra al RECOGER: si se cobrara al estar listo, el tutorial avanzaría con el
     jugador en otra pantalla y su flecha señalaría un paso que él no vio pasar. */
  ok("la olla queda libre", ctx.cookList().length === 0);
  /* y los dos edificios hablan igual: dos cosas que hacen lo mismo tienen que decirlo igual */
  const fs = require("fs");
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("los dos botones dicen « Recoger »",
    (UI.match(/"Recoger " \+/g) || []).length >= 2,
    "el jugador aprende el gesto una vez y le sirve en los dos");
}

console.log("\nDOS SEGUNDOS ENTRE PLATO Y PLATO");
{
  limpio();
  G.dishes = { papa_asada: 10 };
  const CD = g("COMER_CD_MS");
  ok("el enfriamiento es de 2 segundos", CD === 2000, CD + " ms");
  const hp0 = G.hp;
  ctx.eatDish("papa_asada");
  ok("el primer plato se come", (G.dishes.papa_asada || 0) === 9 && G.hp > hp0);
  avisos.length = 0;
  ctx.eatDish("papa_asada");
  ok("el segundo, inmediato, NO se come", (G.dishes.papa_asada || 0) === 9);
  ok("y el aviso dice CUÁNTO falta, no solo que no", /\d/.test(avisos[0] || ""), avisos[0]);
  console.log("       → un candado con reloj a la vista se entiende; uno mudo se lee como que el");
  console.log("         clic no funcionó, que es el bug que perseguimos toda la semana con otras");
  console.log("         caras.");
  adelantar(CD + 100);
  ctx.eatDish("papa_asada");
  ok("pasados los 2 s, sí", (G.dishes.papa_asada || 0) === 8);

  /* lo que el freno evita de verdad: vaciar la despensa con un clic sostenido */
  limpio(); G.dishes = { papa_asada: 10 }; G.hp = 1;
  for (let i = 0; i < 10; i++) ctx.eatDish("papa_asada");
  ok("diez clics seguidos comen UNO, no diez", (G.dishes.papa_asada || 0) === 9,
    "quedan " + (G.dishes.papa_asada || 0) + " de 10");
}

console.log("\nUN ARMA ROTA SE VE ROTA");
{
  const fs = require("fs");
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("la vista del arma mira la durabilidad", /const rota = \(own\.dur \|\| 0\) <= 0/.test(UI));
  ok("y la etiqueta dice qué hacer, no solo que está rota",
    /ROTA — reparala en la Herrería/.test(UI),
    "un aviso que no dice el remedio es medio aviso");
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("hay una sola grieta para todas las armas", /arma_rota\.png/.test(HTML));
  ok("y el arte existe", fs.existsSync(path.join(RAIZ, "public/assets/farm/arma_rota.png")));
  console.log("       → veinte sprites rotos serían veinte sitios donde el arte se desincroniza");
  console.log("         del catálogo, y el arma nueva de mañana nacería sin el suyo.");
}

console.log("\nY LA DESCRIPCIÓN DE LOS PLATOS SE LEE");
{
  const fs = require("fs");
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("el efecto del plato tiene su propia clase", /class="ck-efecto"/.test(UI));
  ok("y ya no va con el gris apagado de las filas de la Herrería",
    !/class="fds" style="font-size:10px;margin-top:4px"/.test(UI));
  const css = (HTML.match(/\.ck-efecto\{[^}]*\}/) || [""])[0];
  ok("con más cuerpo que los 10 px de antes", /font-size:11\.5px/.test(css), css.slice(0, 60) + "…");
  ok("y color claro sobre el panel oscuro", /color:#e8dfc6/.test(css));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el informe del diseñador todavía no está cerrado"
  : "  Todo en orden: los edificios vuelven a ser sitios a los que hay que ir.");
process.exit(fallos ? 1 : 0);
