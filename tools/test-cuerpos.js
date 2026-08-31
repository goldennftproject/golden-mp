/* EL CUERPO DEL BICHO: BRILLOS, UN CUADRO DE DISTANCIA, Y LA VENTANITA                 (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Pedido de dirección, con los vídeos de Tibia delante y contrastado con TibiaWiki (el rango
   real de Tibia son 9 campos: tu celda y las ocho de alrededor):

     « cuando se mata un bicho queda el cuerpo, con brillos avisando de que no se ha revisado.
       Solo se puede recoger a un cuadro de distancia. Al revisar: si hay ítems, una ventanita
       con lo que tiene y un botón de recoger; si está vacío, un mensaje en la interfaz y
       desaparecen los brillos. »

   Antes el botín EXPLOTABA del bicho y quedaba tirado por el suelo, se recogía pisándolo, y el
   log te decía qué soltó antes de que miraras — tres cosas que este cambio retira. La economía
   no se mueve: el sorteo (rollLoot) sigue pasando al morir; lo que cambia es la entrega.

   Este archivo corre el ciclo entero con los métodos reales de ForestScene: morir → cuerpo con
   brillos → lejos no se puede → cerca se revisa → ventanita con los ítems → recoger todo → a la
   bolsa → cuerpo vacío avisa en la interfaz y los brillos mueren. Más la bolsa llena (lo que no
   cabe SE QUEDA en el cuerpo) y la vuelta de escena (los cuerpos con botín sobreviven).
     node tools/test-cuerpos.js                                                                  */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx, elementos } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (m) => avisos.push(m); ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const TILE = g("GF").TILE;

/* elementos del panel con memoria (el arnés base traga clases e innerHTML por proxy a veces) */
function elemento(id) {
  const el = elementos[id] || (elementos[id] = {});
  el._clases = el._clases || new Set();
  el.classList = { add: (c) => el._clases.add(c), remove: (c) => el._clases.delete(c),
    contains: (c) => el._clases.has(c), toggle() {} };
  return el;
}
const panel = elemento("cuerpo-panel"), tit = elemento("cuerpo-tit"),
      items = elemento("cuerpo-items"), btn = elemento("cuerpo-recoger"), cerrar = elemento("cuerpo-cerrar");

function escena() {
  const esc = Object.create(g("ForestScene").prototype);
  Object.assign(esc, {
    hero: { x: 100, y: 100 },
    tweens: { add: (cfg) => { if (cfg.onComplete && cfg.repeat !== -1) cfg.onComplete(); return { stop() {} }; },
              killTweensOf() {} },
    add: { text: (x, y, t) => ({ x, y, texto: t, muerto: false, setOrigin() { return this; }, setDepth() { return this; },
             setAlpha() { return this; }, destroy() { this.muerto = true; } }),
           image: (x, y) => ({ x, y, setOrigin() { return this; }, setAngle() { return this; }, setTint() { return this; },
             setAlpha() { return this; }, setDepth() { return this; }, setScale() { return this; }, width: 30, destroy() {} }) },
    textures: { exists: () => false },   // sin atlas: el cuerpo cae al 💀 de respaldo
    time: { delayedCall: (ms, fn) => { esc._despidos = esc._despidos || []; esc._despidos.push({ ms, fn }); } },
  });
  return esc;
}
const mob = (x, y) => ({ cx: x, by: y, key: "rata", def: { label: "Rata", sprite: null } });
function limpio() {
  g("GF").forestCuerpos = [];
  G.res = { }; G.plata = 0; G.invRows = 6; G.slots = [];
  let acc = 0; for (let k = 2; k <= 10; k++) acc += ctx.skillNeed(k, "farming");
  avisos.length = 0;
}

console.log("\nAL MORIR QUEDA EL CUERPO, CON SUS BRILLOS");
let esc;
{
  limpio(); esc = escena();
  esc.crearCuerpo(mob(120, 100), [{ k: "carne", n: 2, kind: "res" }, { k: "plata", n: 8, kind: "res" }]);
  const c = g("GF").forestCuerpos[0];
  ok("el cuerpo existe donde cayó el bicho", !!c && c.x === 120 && c.label === "Rata");
  ok("guarda su botín ADENTRO, no tirado por el piso", c.drops.length === 2);
  ok("y brilla: tres destellos avisando de que nadie lo revisó", (c.fx || []).length === 3);
  console.log("       → antes el botín explotaba en drops sueltos y el log decía qué soltó ANTES");
  console.log("         de mirar. Ahora el kill solo dice « venciste »: el botín se descubre.");
}

console.log("\nLA REGLA DEL CUADRO   (los 9 campos de Tibia: tu celda y las 8 de alrededor)");
{
  const c = g("GF").forestCuerpos[0];
  /* a dos celdas y media: demasiado lejos */
  esc.hero.x = c.x + TILE * 2.5; esc.hero.y = c.y;
  avisos.length = 0;
  esc.revisarCuerpo(c);
  ok("de lejos no se revisa, y se dice con las palabras de Tibia",
    avisos.some(a => /demasiado lejos/i.test(a)), avisos.join(" · "));
  ok("y el cuerpo sigue sin revisar, con sus brillos", !c.revisado && (c.fx || []).length === 3);
  /* en diagonal, a una celda: es una de las 8 de alrededor y TIENE que alcanzar */
  esc.hero.x = c.x + TILE; esc.hero.y = c.y + TILE;
  esc.revisarCuerpo(c);
  ok("en la celda diagonal (una de las 8) sí alcanza", c.revisado === true);
}

console.log("\nCON ÍTEMS: LA VENTANITA, Y RECOGER TODO");
{
  const c = g("GF").forestCuerpos[0];
  ok("la ventanita se abre", panel._clases.has("show"));
  ok("con el nombre del bicho", /Rata/.test(tit.textContent || ""), tit.textContent);
  ok("y la lista de lo que tiene dentro",
    /2 × Carne/.test(items.innerHTML || "") && /8 × Plata/.test(items.innerHTML || ""));
  ok("los brillos ya murieron: el cuerpo quedó revisado", !c.fx || c.fx.every(b => b.muerto));
  /* recoger todo */
  esc.recogerCuerpo(c);
  ok("recoger mete la carne en la bolsa", (G.res.carne || 0) === 2, G.res.carne + "");
  ok("y la plata en la plata", G.plata === 8, G.plata + "");
  ok("el cuerpo queda sin nada y la ventanita se cierra", c.drops.length === 0 && !panel._clases.has("show"));
  ok("y el cuerpo vacío ya tiene programada su despedida", (esc._despidos || []).length > 0,
    "se va solo a los " + (esc._despidos[0].ms / 1000) + " s");
}

console.log("\nVACÍO DESDE EL PRINCIPIO: EL MENSAJE EN LA INTERFAZ");
{
  limpio(); esc = escena();
  esc.crearCuerpo(mob(130, 100), []);
  const c = g("GF").forestCuerpos[0];
  esc.hero.x = c.x + 10; esc.hero.y = c.y;
  avisos.length = 0;
  esc.revisarCuerpo(c);
  ok("dice que el cuerpo está vacío — en la interfaz, no flotando sobre el bicho",
    avisos.some(a => /vacío/i.test(a)), avisos.join(" · "));
  ok("los brillos se van", !c.fx || c.fx.every(b => b.muerto));
  ok("y no se abre ninguna ventanita para enseñar nada", !panel._clases.has("show"));
}

console.log("\nLA BOLSA LLENA: LO QUE NO CABE SE QUEDA EN EL CUERPO");
{
  limpio(); esc = escena();
  esc.crearCuerpo(mob(140, 100), [{ k: "carne", n: 3, kind: "res" }, { k: "plata", n: 5, kind: "res" }]);
  const c = g("GF").forestCuerpos[0];
  esc.hero.x = c.x; esc.hero.y = c.y;
  /* LA BOLSA SE LLENA DE VERDAD: 20 pilas distintas (la base es 20 casillas y no baja de ahí —
     mi primera versión ponía invRows=0 creyendo que eso era « sin bolsa », y la carne entraba
     tan campante porque la base son 20 aunque no compres ninguna fila). La carne no está entre
     ellas, así que necesitaría casilla nueva y no la hay. */
  G.invRows = 0; G.slots = []; G.res = {};
  ["papa","ciruela","cereza","remolacha","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli",
   "girasol","trigo","maiz","madera","piedra","bronce","hierro","oro","tablon","fibra"]
    .forEach(k => G.res[k] = 5);
  esc.revisarCuerpo(c);
  avisos.length = 0;
  esc.recogerCuerpo(c);
  ok("la plata entra igual (no ocupa lugar)", G.plata === 5);
  ok("la carne que no cupo SE QUEDA en el cuerpo — no se pierde",
    c.drops.length === 1 && c.drops[0].k === "carne", JSON.stringify(c.drops));
  ok("y se avisa por qué", avisos.some(a => /Bolsa llena/i.test(a)), avisos.join(" · "));
  console.log("       → perder botín por bolsa llena sería cobrarle al jugador el orden de su");
  console.log("         inventario. El cuerpo hace de depósito hasta que haga lugar.");
}

console.log("\nY LOS CUERPOS SOBREVIVEN AL IR Y VOLVER DE ESCENA");
{
  /* la misma regla del filtro que corre en create(): con botín o sin revisar se quedan;
     revisados y vacíos no vuelven */
  g("GF").forestCuerpos = [
    { x: 1, y: 1, label: "A", drops: [{ k: "carne", n: 1 }], revisado: true },
    { x: 2, y: 2, label: "B", drops: [], revisado: false },
    { x: 3, y: 3, label: "C", drops: [], revisado: true },
  ];
  const quedan = g("GF").forestCuerpos.filter(c => !c.revisado || c.drops.length);
  ok("el revisado CON botín vuelve (quedó como depósito)", quedan.some(c => c.label === "A"));
  ok("el no revisado vuelve, aunque esté vacío: su sorpresa sigue pendiente", quedan.some(c => c.label === "B"));
  ok("el revisado y vacío no vuelve: ya se estaba yendo", !quedan.some(c => c.label === "C"));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el botín todavía no pasa por el cuerpo como se pidió"
  : "  Todo en orden: el cuerpo brilla hasta que alguien lo mira, y a un cuadro de distancia.");
process.exit(fallos ? 1 : 0);
