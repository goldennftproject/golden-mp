/* EL CARRETE, DE VUELTA — Y EL PEZ QUE SE ESCAPA NO CUESTA NADA            (31/8, today.docx)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Suren pidió « agregar el mini juego de la pesca », y la dirección precisó CUÁL: no la
   pulseada del 28/8 (esa me la inventé yo y sigue enterrada) sino el carrete que el juego ya
   tuvo con la Pesca v2 del 22/8 — la barra vertical, el pez que sube y baja, la zona de
   captura que se mantiene apretando.

   Lo delicado no es la barra: es que el carrete PUEDE PERDERSE, y la economía de la v4 se
   auditó con un pez por lombriz. La salida es la regla de dirección de la propia v2 — « un
   lance fallado cuesta el tiempo y la vergüenza, no plata » — hecha estado: el pez escapado
   queda PENDIENTE y el próximo tiro lo reusa sin cobrar lombriz. Como es el mismo pez, no hay
   re-sorteo, no hay scumming, y el invariante del bolsillo queda EXACTO. Este archivo mide
   las dos mitades: la física de la barra y esa contabilidad.
     node tools/test-carrete.js                                                              */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* un azar de mentira, para que la física sea la misma en cada corrida */
const rndFijo = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

console.log("\nLA FÍSICA DE LA BARRA");
{
  const l = ctx.carreteNuevo("comun", 1, rndFijo([0.5]));
  ok("el pez y la zona nacen al medio", l.pez === 0.5 && l.zona === 0.5);
  ok("y el progreso arranca con margen, no en cero", l.prog === 0.4);
  /* con el pez adentro, apretando, el progreso llena */
  const l2 = ctx.carreteNuevo("comun", 1, rndFijo([0.5]));
  l2.rumbo = 0.5;   // el pez se queda quieto: la zona lo tapa
  let rez = "sigue", vueltas = 0;
  while (rez === "sigue" && vueltas++ < 300) {
    /* la zona cae sola y sube apretando: alternar la mantiene al medio, sobre el pez */
    rez = ctx.carreteTick(l2, 0.05, l2.zonaV < 0, rndFijo([0.99]));
  }
  ok("con el pez adentro, la barra llena y el carrete se GANA", rez === "gana",
    rez + " en " + (vueltas * 0.05).toFixed(1) + " s");
  /* sin tocar nada, la zona cae y el progreso drena */
  const l3 = ctx.carreteNuevo("comun", 20, rndFijo([0.99]));
  l3.pez = 0.95; l3.rumbo = 0.95;   // el pez arriba, la zona abandonada abajo
  rez = "sigue"; vueltas = 0;
  while (rez === "sigue" && vueltas++ < 300) rez = ctx.carreteTick(l3, 0.05, false, rndFijo([0.99]));
  ok("con el pez afuera, drena y el pez se ESCAPA", rez === "perdido" && l3.motivo === "escapo",
    rez + " · " + l3.motivo);
  ok("y todo final tiene su aviso (regla 9)",
    !!g("CARRETE_AVISO").escapo && !!g("CARRETE_AVISO").tiempo);
}

console.log("\nEL OFICIO EN LAS MANOS, LA BANDA EN EL PEZ");
{
  const chica = ctx.pescaZonaAlto(1), grande = ctx.pescaZonaAlto(20);
  ok("la zona crece con el nivel de Pesca", grande > chica,
    (chica * 100).toFixed(0) + " % → " + (grande * 100).toFixed(0) + " %");
  ok("y se topa en el 40 % — nunca media barra gratis", ctx.pescaZonaAlto(99) === 0.40);
  /* la dificultad cubre TODAS las bandas del catálogo: un pez sin dificultad pelearía como
     común aunque valga 700 — el fallback existe, pero no puede ser el camino normal */
  const DIF = g("CARRETE_DIF"), PEZ = g("PEZ_DEF");
  const bandas = [...new Set(Object.keys(PEZ).map(k => PEZ[k].banda))].filter(b => b !== "mitico");
  const sinDif = bandas.filter(b => !DIF[b]);
  ok("las " + bandas.length + " bandas de caña tienen su dificultad", !sinDif.length, sinDif.join(", "));
  console.log("       → los míticos no pelean en el carrete: salen de la nasa, que es pasiva.");
  ok("y los raros nadan más rápido y más nervioso que los comunes",
    DIF.legendario.vel > DIF.comun.vel && DIF.legendario.nervio > DIF.comun.nervio,
    DIF.comun.vel + " → " + DIF.legendario.vel);
}

console.log("\nEL PEZ ESCAPADO QUEDA EN EL ANZUELO   (cuesta tiempo, no plata)");
{
  G.canas = { junco: 1 }; G.plata = 1000; G.res = { lombriz: 10 }; G.fish = {};
  G.pescaV4 = null; ctx.pescaEstado().cebo = "lombriz";
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };

  ok("arranca sin nada pendiente", !ctx.pescaEstado().pendiente);
  ctx.pescaV4Abrir();
  ok("el tiro cobra su lombriz", G.res.lombriz === 9);
  const pezSorteado = g("P4").r.id;
  /* correr la espera hasta que arranque el carrete, y dejarlo drenar sin tocar nada */
  let vueltas = 0;
  while (g("P4") && !g("P4").carrete && vueltas++ < 200) ctx.pescaV4Paso(0.05, false);
  ok("al hundirse el corcho arranca el carrete", !!(g("P4") && g("P4").carrete));
  vueltas = 0;
  while (g("P4") && vueltas++ < 400) ctx.pescaV4Paso(0.05, false);
  ok("abandonado, el pez se escapa y el lance se cierra", !g("P4"));
  ok("no entró nada a la bolsa", Object.keys(G.fish).every(k => !G.fish[k]));
  const pend = ctx.pescaEstado().pendiente;
  ok("pero el pez quedó EN EL ANZUELO", !!pend && pend.id === pezSorteado,
    pend && g("PEZ_DEF")[pend.id].label);

  /* el segundo tiro: mismo pez, lombriz gratis */
  ctx.pescaV4Abrir();
  ok("el segundo tiro NO cobra lombriz", G.res.lombriz === 9, "sigue en " + G.res.lombriz);
  ok("y pelea EXACTAMENTE el mismo pez — sin re-sorteo, sin scumming",
    g("P4").r.id === pezSorteado && !ctx.pescaEstado().pendiente);
  /* esta vez se gana: el carrete decide CUÁNDO se cobra, nunca QUÉ sale */
  vueltas = 0;
  while (g("P4") && !g("P4").carrete && vueltas++ < 200) ctx.pescaV4Paso(0.05, false);
  vm.runInContext("P4.carrete.prog = 0.999", ctx);   // la pelea en sí ya se midió arriba
  ctx.pescaV4Paso(0.05, true);
  ok("ganado el carrete, el pez entra a la bolsa", (G.fish[pezSorteado] || 0) === 1);
  ok("y el anzuelo queda limpio para el próximo", !ctx.pescaEstado().pendiente);

  /* la tercera salida: irse a MITAD de la pelea tampoco pierde el pez */
  ctx.pescaV4Abrir();
  ok("(este tiro sí cobra: no había nada pendiente)", G.res.lombriz === 8);
  const otro = g("P4").r.id;
  vueltas = 0;
  while (g("P4") && !g("P4").carrete && vueltas++ < 200) ctx.pescaV4Paso(0.05, false);
  ctx.pescaV4Cerrar();   // Escape, o moverse
  ok("cerrar a mitad del carrete guarda el pez, no lo mata",
    ctx.pescaEstado().pendiente && ctx.pescaEstado().pendiente.id === otro);
  console.log("       → cerrar la laguna es una salida, no un castigo. Y como el pendiente vive");
  console.log("         en el estado que se guarda, ni el F5 re-sortea: es el MISMO pez.");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la barra pelea, y perder cuesta tiempo, no plata.\n");
process.exit(fallos ? 1 : 0);
