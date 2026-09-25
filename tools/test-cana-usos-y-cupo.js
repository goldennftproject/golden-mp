/* LA CAÑA SE GASTA, SE REPARA, Y EL DÍA TIENE CUPO DE LANCES                  (23/9, diseñador)
   Discord 05:08: « durabilidad a la caña: 50 usos, y para reparar… no puede ser eterna ».
   Discord 10:32: « 15 intentos diarios y si quieren más, que cada intento cueste 5, 10… y
   subiendo. La pesca es una imprenta: hay que controlar eso ».
   Dirección eligió (23/9) « 50 usos, reparar al 10 % » cuando vio que el 50 % dejaba a las cañas
   de Hierro y Oro pescando a pérdida.
     node tools/test-cana-usos-y-cupo.js                                                      */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
let toasts = [];
ctx.toast = (m) => toasts.push(m); ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);
ctx.window.farmScene = { pescaTirar() {}, pescaLimpiar() {}, action: null };

function partida(canas) {
  G.res = { lombriz: 500 }; G.plata = 100000; G.fish = {}; G.pescaStats = {}; G.torneo = null;
  G.canas = canas || { junco: 1 }; G.canasDur = undefined; G.pescaDia = undefined; G.pescaV4 = null;
  G.amarres = []; G.nasas = []; G.tuto = { done: true };
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };
  ctx.pescaEstado().cebo = "lombriz";
  toasts = [];
}
const tirar = () => { const r = ctx.pescaV4Abrir(); ctx.pescaV4Cerrar(); return r; };
const USOS = g("CANA_USOS"), DIA = g("PESCA_LANCES_DIA"), EXTRA = g("PESCA_LANCE_EXTRA_PLATA");

console.log("\n1 · CADA LANCE GASTA UN USO; A CERO LA CAÑA ESTÁ ROTA\n");
{
  partida({ junco: 1 });
  ok("una caña nueva (o de un guardado viejo, sin canasDur) nace entera", ctx.canaAguante("junco") === USOS, ctx.canaAguante("junco"));
  ok("la puerta del agua deja tirar", ctx.puedeAccion("fish").ok === true);
  tirar();
  ok("un lance, un uso menos", ctx.canaAguante("junco") === USOS - 1, ctx.canaAguante("junco"));
  G.pescaDia = { dia: ctx.hoyClave(), n: 0 };   // el cupo del día se prueba aparte
  for (let i = 0; i < USOS - 1; i++) { tirar(); G.pescaDia.n = 0; }
  ok("tras " + USOS + " lances está rota", ctx.canaRota("junco") && ctx.canaAguante("junco") === 0);
  ok("y el juego avisó al romperse", toasts.some(t => /rompió/.test(t)), toasts.filter(t => /rompió/.test(t))[0]);
  ok("con la única caña rota no se elige ninguna", ctx.pescaV4Cana() === null);
  const p = ctx.puedeAccion("fish");
  ok("la puerta del agua dice que está rota y dónde se repara", !p.ok && /rota/.test(p.toast) && /Aparejos/.test(p.toast), p.toast);
  const lomb = G.res.lombriz;
  ok("tirar con la caña rota no sale y NO cobra lombriz", tirar() === false && G.res.lombriz === lomb);
}

console.log("\n2 · SE ELIGE LA MEJOR CAÑA SANA, Y SE REPARA CON PLATA\n");
{
  partida({ junco: 1, bambu: 1 });
  G.canasDur = { bambu: 0 };
  ok("con la de bambú rota se pesca con la de junco", ctx.pescaV4Cana() === "junco");
  ok("pero la mejor que TIENE sigue siendo la de bambú", ctx.pescaV4CanaMejor() === "bambu");
  const precio = ctx.canaReparaPlata("bambu");
  const esperado = Math.ceil(ctx.canaValorPlata("bambu") * g("CANA_REPARA_PCT"));
  ok("reparar la de bambú rota cuesta el " + Math.round(g("CANA_REPARA_PCT") * 100) + " % de su valor en plata", precio === esperado, precio + " (valor " + Math.round(ctx.canaValorPlata("bambu")) + ")");
  G.plata = precio - 1;
  ok("sin plata no se repara y se dice cuánto falta", ctx.canaReparar("bambu") === false && /falta/.test(toasts[toasts.length - 1]), toasts[toasts.length - 1]);
  G.plata = precio;
  ok("con la plata justa se repara y queda entera", ctx.canaReparar("bambu") === true && G.plata === 0 && ctx.canaAguante("bambu") === USOS);
  ok("y vuelve a ser la que se usa", ctx.pescaV4Cana() === "bambu");
  G.canasDur.bambu = USOS / 2; G.plata = 100000;
  ok("a mitad de usos cuesta la mitad (proporcional a lo que falta)", ctx.canaReparaPlata("bambu") === Math.ceil(esperado / 2), ctx.canaReparaPlata("bambu"));
  ok("entera no hay nada que reparar", (G.canasDur.bambu = USOS, ctx.canaReparaPlata("bambu") === 0 && ctx.canaReparar("bambu") === false));
  ok("la del Abuelo no se gasta", !ctx.canaSeGasta("abuelo") && ctx.canaAguante("abuelo") === Infinity);
}

console.log("\n3 · EL ANCLA, CON LA REPARACIÓN ADENTRO: NINGUNA CAÑA PESCA A PÉRDIDA\n");
{
  const orden = g("CANA_V4_ORDER");
  for (const k of orden) {
    if (!ctx.canaSeGasta(k)) continue;
    const neto = ctx.lanceNeto(k), repara = ctx.canaValorPlata(k) * g("CANA_REPARA_PCT") / USOS;
    const queda = neto - repara;
    ok(k.padEnd(7) + " neto " + neto.toFixed(2) + " − reparación " + repara.toFixed(2) + " por lance = " + queda.toFixed(2) + (queda < 9 ? "  (por debajo del piso 9 de la banda: queda dicho)" : ""), queda > 0);
  }
}

console.log("\n4 · " + DIA + " LANCES GRATIS AL DÍA; DESPUÉS " + EXTRA + ", " + EXTRA * 2 + ", " + EXTRA * 3 + "…\n");
{
  partida({ oro: 1 });
  ok("arranca en cero y el próximo es gratis", ctx.lancesHoy() === 0 && ctx.lanceExtraPrecio() === 0);
  for (let i = 0; i < DIA; i++) tirar();
  ok("los " + DIA + " primeros no cobran cupo", ctx.lancesHoy() === DIA && ctx.lanceExtraPrecio() === EXTRA, "lances " + ctx.lancesHoy() + " · próximo " + ctx.lanceExtraPrecio());
  ok("y al gastar el último gratis avisa lo que cuesta el siguiente (25/9)", toasts.some(t => new RegExp(DIA + " lances gratis").test(t) && /cuesta/.test(t)), toasts.filter(t => /gratis/.test(t))[0]);
  const farm = require("fs").readFileSync(RAIZ + "/public/game/farm.js", "utf8");
  ok("el cartel del agua muestra el contador « lances N/15 » (25/9, diseñador: « ¿dónde lo pone? »)", /lances " \+ lancesHoy\(\) \+ "\/" \+ PESCA_LANCES_DIA/.test(farm));
  G.peajeCana = 0; const plata = G.plata;
  tirar();
  ok("el " + (DIA + 1) + ".º cobra " + EXTRA + " de plata (más el peaje de la caña)", plata - G.plata === EXTRA + Math.floor(g("CANA_V4_DEF.oro.mant")), plata - G.plata);
  ok("y avisa", toasts.some(t => /Lance extra/.test(t)));
  ok("el siguiente cuesta " + EXTRA * 2, ctx.lanceExtraPrecio() === EXTRA * 2);
  G.peajeCana = 0; const p2 = G.plata; tirar();
  ok("y se cobra " + EXTRA * 2, p2 - G.plata === EXTRA * 2 + Math.floor(g("CANA_V4_DEF.oro.mant")), p2 - G.plata);
  G.plata = ctx.lanceExtraPrecio() - 1;
  const p = ctx.puedeAccion("fish");
  ok("sin plata para el extra, la puerta lo dice con el precio", !p.ok && /cuesta/.test(p.toast), p.toast);
  const lomb = G.res.lombriz;
  ok("y no sale ni cobra lombriz", tirar() === false && G.res.lombriz === lomb);
  G.pescaDia = { dia: "1999-1-1", n: 40 };
  ok("al cambiar el día el cupo se renueva solo", ctx.lancesHoy() === 0 && ctx.lanceExtraPrecio() === 0);
}

console.log("\n5 · SE GUARDA Y VUELVE\n");
{
  partida({ junco: 1 }); G.canasDur = { junco: 7 }; G.pescaDia = { dia: ctx.hoyClave(), n: 9 };
  const snap = ctx.snapshot();
  ok("el guardado lleva los usos y los lances del día", snap.canasDur && snap.canasDur.junco === 7 && snap.pescaDia && snap.pescaDia.n === 9);
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ la caña se gasta y se repara, y la imprenta tiene cupo\n");
process.exit(fallos ? 1 : 0);
