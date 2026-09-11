/* LA MUERTE: CAE EL CONTENEDOR ENTERO Y UN 5% POR PIEZA   (8/9 tarde, dirección, tanda 4)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Al morir se cae la bag o backpack y no queda nada, solo el equipamiento —si es que no se
   cae—. Y vamos a poner un porcentaje del 5% donde se puede caer parte de lo que tenemos montado
   en armadura, y cuando eso se caiga estará fuera de la bag. »

   Son DOS castigos con dos formas distintas, y la diferencia es lo que hace que el jugador pueda
   aprender de la muerte en vez de solo sufrirla:
     · el contenedor cae SIEMPRE — es lo que decidiste arriesgar en la puerta, sin azar
     · cada pieza puesta tira su PROPIO 5% — azar, pero acotado y recuperable
   Y las piezas caen SUELTAS, fuera del contenedor: si fueran adentro, un contenedor lleno podría
   hacerlas desaparecer, y el equipo perdido tiene que poder recuperarse siempre.

   El azar se inyecta (tumbaCaer acepta una función) porque un test que depende de Math.random no
   es un test: es una moneda. Acá el 5% se comprueba con dados cargados, no con suerte.
     node tools/test-muerte-caida.js                                                           */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t)); ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const NUNCA = () => 0.99;   // 0.99*100 = 99 ≥ 5 → no cae nada
const SIEMPRE = () => 0;    // 0 < 5 → cae todo

const equipado = () => {
  /* las piezas tienen que existir en GEAR_DEF: equipoPuesto valida contra el catálogo, y en mi
     primera versión inventé "coraza_cuero" — el test medía dos piezas creyendo que eran tres, y
     el 5% salía 3,37% (que es 2/3 de 5%) haciéndome dudar del código en vez de del test. */
  G.gear = { casco: "casco_cuero", armadura: "pechera_cuero", botas: null, escudo: null, arma: "espada_bronce", municion: false };
  G.weapons = { espada_bronce: { dur: 33, plus: 2, sockets: ["dorada"] } };
  G.armor = {}; G.armorEq = null;
};
const conCarga = () => {
  G.conts = { bag: 3, backpack: 1 }; G.cont = null; G.tumba = null;
  G.res = { carne: 0 }; G.plata = 0; G.golden = 0; G.invRows = 6;
  ctx.viajeElegir("backpack");
  const raiz = ctx.contLlevado();
  ctx.contMeterBolsa(raiz, ctx.contCrear("bag"));
  ctx.contMeter(raiz, "res", "colmillo", 9);
  ctx.contMeter(raiz, "res", "plata", 240);
  ctx.contMeter(raiz, "res", "golden", 2);
  /* tres pilas más para que el cuerpo pase de los 8 huecos de una bolsa: sin esto el rescate
     entraba justo y no se probaba el desborde, que es donde vive « lo que no cabe no se pierde ». */
  ctx.contMeter(raiz, "res", "cuero", 4);
  ctx.contMeter(raiz, "res", "hueso", 6);
  ctx.contMeter(raiz, "res", "esencia_oscura", 3);
  avisos.length = 0;
  return raiz;
};

console.log("\nEL CONTENEDOR CAE ENTERO — sin azar, porque fue tu decisión");
{
  conCarga();
  const r = ctx.tumbaCaer("pantano", 100, 100, NUNCA);
  ok("no llevás nada puesto después de morir", ctx.contLlevado() === null);
  ok("el desglose dice cuántas pilas cayeron", r.pilas === 6, JSON.stringify(r));
  ok("y con qué contenedor te habían matado", r.cont === "backpack");
  ok("no cayó ninguna pieza de equipo con los dados en contra", r.piezas === 0);
  const t = ctx.tumba();
  ok("el cuerpo guarda el botín, la bolsa anidada Y la mochila",
    t.items.filter(e => e.kind === "cont").length === 2 && t.items.some(e => e.k === "colmillo"),
    JSON.stringify(t.items.map(e => e.kind + ":" + e.k)));
  /* la moneda es lo que más duele y por eso es lo que más se comprueba */
  ok("la plata y el $Golden cayeron con todo lo demás: no se salvaron en la billetera",
    t.items.some(e => e.k === "plata" && e.n === 240) && t.items.some(e => e.k === "golden") && G.plata === 0 && G.golden === 0,
    "billetera: " + G.plata + " plata · " + G.golden + " $G");
}

console.log("\nY CADA PIEZA PUESTA TIRA SU PROPIO 5%");
{
  conCarga(); equipado();
  ok("con tres piezas puestas, el catálogo las ve", ctx.equipoPuesto().length === 3,
    ctx.equipoPuesto().map(p => p.slot).join(" · "));
  const r = ctx.tumbaCaer("pantano", 10, 10, NUNCA);
  ok("con los dados en contra NO cae ninguna, y seguís equipado",
    r.piezas === 0 && G.gear.casco === "casco_cuero" && G.gear.arma === "espada_bronce");

  conCarga(); equipado();
  const r2 = ctx.tumbaCaer("pantano", 10, 10, SIEMPRE);
  ok("con los dados a favor caen las tres", r2.piezas === 3, JSON.stringify(r2.piezasLabel));
  ok("y quedás desequipado de verdad", !G.gear.casco && !G.gear.armadura && !G.gear.arma);
  const t = ctx.tumba();
  ok("las piezas están en el cuerpo, SUELTAS y no dentro del contenedor",
    t.items.filter(e => e.kind === "gear" || e.kind === "arm").length === 3);
  /* perder el objeto es una cosa; perder el +2 y la runa que le metiste, otra muy distinta */
  const arma = t.items.find(e => e.kind === "arm");
  ok("y el arma cayó CON su durabilidad, su +N y sus runas",
    arma && arma.w && arma.w.dur === 33 && arma.w.plus === 2 && (arma.w.sockets || []).length === 1,
    JSON.stringify(arma && arma.w));
  ok("el arma ya no está en tu inventario de armas", !(G.weapons && G.weapons.espada_bronce));
}

console.log("\nEL 5% ES POR PIEZA Y NO GLOBAL — la diferencia es la mecánica");
{
  /* con seis ranuras, 5% por pieza da ~26% de perder ALGO (una de cada cuatro muertes duele) y
     una entre catorce millones de perderlo todo. Un 5% global sería una moneda al aire que se
     lleva el equipo entero: eso no es un castigo, es una lotería, y las loterías no enseñan. */
  ok("el porcentaje está escrito una sola vez y es 5", g("EQUIPO_CAE_PCT") === 5);
  let sueltas = 0, veces = 4000;
  const dado = () => Math.random();
  for (let i = 0; i < veces; i++) {
    conCarga(); equipado();
    const r = ctx.tumbaCaer("pantano", 1, 1, dado);
    sueltas += r.piezas;
  }
  const pct = sueltas / (veces * 3) * 100;
  ok("y midiéndolo 4000 veces sobre 3 piezas, cae ~5% de las veces", pct > 3.5 && pct < 6.5, pct.toFixed(2) + "%");
}

console.log("\nRECUPERARLO: hay que VOLVER, y con otro contenedor");
{
  conCarga(); equipado();
  ctx.tumbaCaer("pantano", 10, 10, SIEMPRE);
  ok("sin contenedor nuevo no se puede recoger nada", ctx.tumbaRecoger() === 0);
  const enElCuerpo = ctx.tumba().items.length;
  ctx.viajeElegir("bag");   // 8 huecos, y en el cuerpo hay más que eso
  const n = ctx.tumbaRecoger();
  ok("con una bolsa nueva se recupera lo que entre", n > 0 && n <= 8, n + " de " + enElCuerpo + " rescatadas");
  ok("y lo que no entró SIGUE en el cuerpo, no se evapora",
    enElCuerpo > 8 && (ctx.tumba() ? ctx.tumba().items.length : 0) === enElCuerpo - n,
    "quedan " + JSON.stringify((ctx.tumba() || { items: [] }).items.map(e => e.k)));
}

console.log("\nAL VOLVER A LA GRANJA, LO RESCATADO SE DESHACE BIEN");
{
  G.conts = {}; G.cont = null; G.res = {}; G.plata = 0; G.golden = 0; G.invRows = 6;
  G.weapons = {}; G.gear = { casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false };
  const raiz = ctx.contCrear("bag"); G.cont = raiz;
  ctx.contMeter(raiz, "cont", "backpack", 1);
  ctx.contMeter(raiz, "arm", "espada_bronce", 1, { w: { dur: 33, plus: 2, sockets: ["dorada"] } });
  ctx.contMeter(raiz, "res", "plata", 240);
  ctx.contMeter(raiz, "res", "golden", 2);
  ctx.contDescargar(raiz, true);
  ok("la mochila rescatada vuelve a tus contenedores", ctx.contsTengo("backpack") === 1);
  ok("el arma vuelve entera, con el +2 y la runa",
    G.weapons.espada_bronce && G.weapons.espada_bronce.dur === 33 && G.weapons.espada_bronce.plus === 2,
    JSON.stringify(G.weapons.espada_bronce));
  ok("y las monedas a la billetera", G.plata === 240 && G.golden === 2, G.plata + " plata · " + G.golden + " $G");
}

console.log("\nEL AVISO DICE QUÉ SE PERDIÓ — un « perdiste cosas » no enseña nada");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("el aviso separa el contenedor del equipo: son dos castigos distintos",
    /pieza\(s\) de equipo que llevabas puesta/.test(FOREST) && /con " \+ c\.pilas \+ " cosa\(s\) dentro/.test(FOREST));
  ok("y dice que hay que volver CON OTRO contenedor", /volvé YA con otro contenedor a buscarlo/.test(FOREST));
  /* 8/9 (Suren, en vivo): « hay que quitar el CD de regresar porque acabo de morir y no puedo
     esperar, se pudre y no puedo recuperar ». El enfriamiento existe para pausar el farmeo, no
     para separarte de tu cuerpo — y si el aviso no lo dice, el jugador igual se queda esperando. */
  ok("y avisa que NO hay que esperar el descanso", /No hay que esperar el descanso/.test(FOREST));
  ok("y si el cuerpo se deshace, también se dice cuánto equipo se fue con él",
    /de ellas equipo que llevabas puesto/.test(FOREST));
  /* el orden es la mecánica: si zonaSalir corriera antes, la muerte sería la forma más cómoda de
     cobrar el botín — exactamente lo contrario de lo que esto quiere */
  const iH = FOREST.indexOf("hurtHero(dmg, fisico)");   // 11/9: el golpe físico pasa por la parada (doc de Tibia)
  const cuerpo = FOREST.slice(iH, iH + 5200);   // el bloque creció con los avisos de la tanda 4 y la parada del 11/9
  ok("y la tumba se llena ANTES de zonaSalir, que descarga a la bolsa",
    cuerpo.indexOf("tumbaCaer") < cuerpo.indexOf("zonaSalir(true)"));
}

console.log("\nEL ENFRIAMIENTO NO SE INTERPONE ENTRE VOS Y TU CUERPO   (Suren, en vivo, 8/9)");
{
  /* « hay que quitar el CD de regresar a zona negra porque acabo de morir y no puedo esperar
     porque se pudre y no puedo recuperar ». El enfriamiento se diseñó cuando morir no costaba
     nada; esta tarde le pusimos encima un cuerpo con diez minutos de reloj real, y sumados el
     castigo pasó a ser otro. No se borra el enfriamiento: se le pone su sitio. */
  conCarga();
  G.zonaCdHasta = ctx.nowMs() + 3 * 60000;
  ok("sin cuerpo esperando, el descanso manda como siempre", ctx.zonaCdLeft() > 0,
    Math.round(ctx.zonaCdLeft() / 1000) + " s");
  ctx.tumbaCaer("pantano", 5, 5, NUNCA);
  ok("pero con tu cuerpo allá, el portal queda abierto YA", ctx.zonaCdLeft() === 0);
  ctx.tumbaLimpiar();
  ok("y en cuanto lo recuperás (o se deshace), el ritmo vuelve solo", ctx.zonaCdLeft() > 0,
    Math.round(ctx.zonaCdLeft() / 1000) + " s");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cae lo que cargaste, el equipo solo a veces, y podés ir a buscarlo.\n");
process.exit(fallos ? 1 : 0);
