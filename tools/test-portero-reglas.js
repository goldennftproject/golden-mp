/* EL PORTERO DEL GUARDADO: LAS REGLAS, PROBADAS CON GUARDADOS DE VERDAD (21/8)
   La Edge Function es UN solo archivo (el editor del dashboard no empaqueta dos), así que
   este test extrae el bloque === REGLAS === de supabase/functions/guardar/index.ts y lo
   EJECUTA tal cual: lo que se prueba es exactamente lo que se deploya, sin copia aparte
   que pueda desviarse. Guardados de jugadores honestos y de tramposos de consola.
   El contrato del modo sombra: al honesto, CERO sospechas (un falso positivo en modo rechazo
   le rompería la partida); al de G.res.madera = 999999, cantarlo con nombre y apellido.
     node tools/test-portero-reglas.js                                                          */
const fs = require("fs"), vm = require("vm");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

(async () => {
  const fuente = fs.readFileSync("supabase/functions/guardar/index.ts", "utf8");
  const m = fuente.match(/\/\* === REGLAS ===[\s\S]*?\*\/([\s\S]*?)\/\* === FIN REGLAS === \*\//);
  ok("(arnés) el bloque === REGLAS === existe en index.ts", !!m);
  if (!m) { console.log("\n1 fallo(s)\n"); process.exit(1); }
  const ctx = { Math, isFinite, String, Object, Set, JSON };
  vm.createContext(ctx);
  vm.runInContext(m[1] + "\nthis.evaluarGuardado = evaluarGuardado; this.MODO = MODO; this.VERSION = VERSION; this.mercadoPermiso = mercadoPermiso;", ctx);
  const { evaluarGuardado, MODO, VERSION, mercadoPermiso } = ctx;
  const HORA = 3600;

  console.log("\nEL CONTRATO DEL ESCALÓN 1: MODO SOMBRA, VERSIONADO");
  ok("las reglas están en modo RECHAZO desde el 14/9 (proyecto nuevo, P2P abierto)", MODO === "rechazo", MODO);
  ok("y llevan versión (la bitácora anota cuál evaluó)", VERSION >= 2, "v" + VERSION);

  /* ═══ EL MERCADO, QUE EL PORTERO NO CONOCÍA HASTA EL 15/9 ════════════════════════════
     El P2P se abrió el 14/9 y el portero pasó a "rechazo" el MISMO día: nunca habían
     corrido juntos. Un maíz del mercado vale 1.200 de plata y el techo de un guardado
     rápido es ~2.084, así que cobrar DOS ventas rechazaba el guardado y porteroRechazo()
     devolvía la granja al estado anterior — con el ítem ya entregado al comprador. Ley 1.
     Estos casos son la partida de verdad, no el caso feliz. */
  console.log("\nEL MERCADO NO LE HACE PERDER LA PARTIDA A NADIE");
  const YO = "uid-yo", OTRO = "uid-otro";
  const permisoDe = (filas, ack, prev, next) => mercadoPermiso(YO, filas, ack, prev, next).permiso;
  {
    /* vendió un maíz y un cuero, y los cobra los dos seguidos: +2.360 en un minuto */
    const filas = [
      { seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 1, price: 1200, paid: true },
      { seller: YO, sold_to: OTRO, kind: "res", item: "cuero", qty: 1, price: 1160, paid: true },
    ];
    const antes = { plata: 300, res: {} }, despues = { plata: 2660, res: {} };
    const sinMercado = evaluarGuardado(antes, despues, 60);
    ok("(el agujero) sin mirar el mercado, cobrar dos ventas se rechazaba",
      sinMercado.sospechas.some(s => /plata imposible/.test(s)), sinMercado.sospechas.join(" · "));
    const r = evaluarGuardado(antes, despues, 60, permisoDe(filas, null, antes, despues));
    ok("mirando el mercado, el vendedor cobra tranquilo", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* el MISMO permiso no se gasta dos veces: cobró ayer, hoy inventa la misma plata */
    const filas = [{ seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 9, price: 9000, paid: true }];
    const ack = mercadoPermiso(YO, filas, null, null, {}).ack;
    const r = evaluarGuardado({ plata: 1500, res: {} }, { plata: 10500, res: {} }, 60, permisoDe(filas, ack, null, null));
    ok("y la venta ya contada NO vuelve a dar permiso", r.sospechas.some(s => /plata imposible/.test(s)),
      r.sospechas.join(" · "));
  }
  {
    /* comprar 300 de madera: el techo de madera de un guardado rápido es ~102 */
    const filas = [{ seller: OTRO, sold_to: YO, kind: "res", item: "madera", qty: 300, price: 900, paid: false }];
    const antes = { plata: 2000, res: { madera: 20 } }, despues = { plata: 1100, res: { madera: 320 } };
    ok("(el agujero) comprar 300 de madera se rechazaba",
      evaluarGuardado(antes, despues, 60).sospechas.some(s => /madera imposible/.test(s)));
    const r = evaluarGuardado(antes, despues, 60, permisoDe(filas, null, antes, despues));
    ok("el comprador recibe su madera sin sospecha", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* RETIRAR lo publicado: la fila se BORRA, así que el permiso sale de comparar con lo
       que el portero tenía anotado como « en venta » en el guardado anterior */
    const antes = [{ seller: YO, sold_to: null, kind: "res", item: "piedra", qty: 400, price: 800, paid: false }];
    const ack = mercadoPermiso(YO, antes, null, null, {}).ack;
    const a = { plata: 10, res: { piedra: 5 } }, d = { plata: 10, res: { piedra: 405 } };
    ok("(el agujero) retirar tu propia publicación se rechazaba",
      evaluarGuardado(a, d, 60).sospechas.some(s => /piedra imposible/.test(s)));
    const r = evaluarGuardado(a, d, 60, permisoDe([], ack, a, d));
    ok("retirar lo tuyo te lo devuelve sin sospecha", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* la compra que no entró en la bolsa y quedó en pendientes: entra días después */
    const a = { plata: 10, res: { madera: 0 }, mkPend: [{ kind: "res", item: "madera", qty: 250 }] };
    const d = { plata: 10, res: { madera: 250 }, mkPend: [] };
    const r = evaluarGuardado(a, d, 60, permisoDe([], { ventas: 0, compras: { madera: 250 }, abiertas: {} }, a, d));
    ok("y reclamar una entrega pendiente tampoco dispara nada", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* el tramposo sigue cantando: sin filas en el mercado no hay permiso que valga */
    const r = evaluarGuardado({ plata: 500, res: {} }, { plata: 5000000, res: {} }, 600, permisoDe([], null, null, null));
    ok("sin ventas de verdad, la plata inventada sigue cantando", r.sospechas.some(s => /plata imposible/.test(s)));
    const r2 = evaluarGuardado({ res: { madera: 10 }, plata: 0 }, { res: { madera: 999999 }, plata: 0 }, 60,
      permisoDe([{ seller: OTRO, sold_to: YO, kind: "res", item: "madera", qty: 20, price: 50, paid: false }], null, null, null));
    ok("y una compra chica no tapa un 999.999 de madera", r2.sospechas.some(s => /madera imposible/.test(s)));
  }
  {
    /* el permiso mira DE QUIÉN es cada fila: las ventas ajenas no acreditan nada */
    const filas = [{ seller: OTRO, sold_to: "uid-tercero", kind: "res", item: "maiz", qty: 1, price: 9000, paid: true }];
    ok("las ventas de otro no me dan permiso a mí", permisoDe(filas, null, null, null).plata === 0);
    const soloVendida = [{ seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 1, price: 1200, paid: false }];
    ok("y una venta vendida pero SIN cobrar tampoco (la plata entra al cobrar)",
      permisoDe(soloVendida, null, null, null).plata === 0);
  }
  {
    /* el arnés de la migración: si falta correr el SQL, el portero es MÁS permisivo, no menos */
    const filas = [{ seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 1, price: 1200, paid: true }];
    ok("sin cuaderno (ack null) el permiso existe igual: estrenar el sistema no rechaza a nadie",
      permisoDe(filas, null, null, null).plata === 1200);
  }

  console.log("\nEL JUGADOR HONESTO PASA LIMPIO");
  {
    const antes = { plata: 500, golden: 2, level: 8, expansiones: 2, res: { madera: 30, piedra: 22, bronce: 4 } };
    /* 3 horas después: cosechó, vendió, taló sus 5 árboles con cargas llenas */
    const despues = { plata: 1400, golden: 2, level: 9, expansiones: 3, res: { madera: 70, piedra: 50, bronce: 6 } };
    const r = evaluarGuardado(antes, despues, 3 * HORA);
    ok("una tarde de juego real: CERO sospechas", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
    ok("y el delta queda anotado para la bitácora", r.delta.plata === 900 && r.delta["res.madera"] === 40,
      JSON.stringify(r.delta));
  }
  {
    const r = evaluarGuardado(null, { plata: 25, level: 1, res: { madera: 5 } }, 0);
    ok("el jugador nuevo (sin guardado anterior) pasa limpio", r.sospechas.length === 0);
  }
  {
    /* dos guardados PEGADOS (autosave + cierre de pestaña): el piso de 30 s evita el falso positivo */
    const antes = { plata: 100, res: { madera: 10 } };
    const r = evaluarGuardado(antes, { plata: 130, res: { madera: 12 } }, 2);
    ok("dos guardados con 2 s de diferencia no disparan nada", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* una semana sin entrar y volvió con TODO acumulado (cargas + venta del stock) */
    const antes = { plata: 2000, res: { madera: 100, piedra: 80 } };
    const r = evaluarGuardado(antes, { plata: 9000, res: { madera: 240, piedra: 200 } }, 7 * 24 * HORA);
    ok("volver tras una semana con las cargas llenas: limpio", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }

  console.log("\nEL TRAMPOSO DE CONSOLA CANTA");
  {
    const antes = { plata: 500, res: { madera: 30 } };
    const r = evaluarGuardado(antes, { plata: 500, res: { madera: 999999 } }, 60);
    ok("G.res.madera = 999999 y guardar al minuto: sospecha con nombre",
      r.sospechas.some(s => /madera imposible/.test(s)), r.sospechas.join(" · "));
  }
  {
    const antes = { plata: 500, res: {} };
    const r = evaluarGuardado(antes, { plata: 5000000, res: {} }, 10 * 60);
    ok("plata imposible en 10 minutos: sospecha", r.sospechas.some(s => /plata imposible/.test(s)), r.sospechas.join(" · "));
  }
  {
    const antes = { level: 3, plata: 0, res: {} };
    const r = evaluarGuardado(antes, { level: 50, plata: 0, res: {} }, 20 * 60);
    ok("del nivel 3 al 50 en 20 minutos: sospecha", r.sospechas.some(s => /nivel/.test(s)), r.sospechas.join(" · "));
  }
  {
    const antes = { res: { oro: 2 }, plata: 0 };
    const r = evaluarGuardado(antes, { res: { oro: 400 }, plata: 0 }, 2 * HORA);
    ok("+398 de oro con UNA veta de 14 h: sospecha", r.sospechas.some(s => /oro imposible/.test(s)), r.sospechas.join(" · "));
  }
  {
    const r = evaluarGuardado({ plata: 10, res: {} }, { plata: NaN, res: { madera: -5 } }, 60);
    ok("NaN y recursos negativos: sospecha doble",
      r.sospechas.some(s => /inválido en plata/.test(s)) && r.sospechas.some(s => /recurso inválido madera/.test(s)),
      r.sospechas.join(" · "));
  }
  {
    const r = evaluarGuardado({ plata: 10, res: {} }, { plata: 10, res: {} }, -300);
    ok("el reloj hacia atrás: sospecha", r.sospechas.some(s => /reloj/.test(s)), r.sospechas.join(" · "));
  }
  {
    const r = evaluarGuardado({ plata: 1, res: {} }, null, 60);
    ok("un snapshot nulo no revienta: sospecha y a otra cosa", r.sospechas.length === 1, r.sospechas.join(" · "));
  }

  console.log("\nY EL BOTÓN DE PRUEBAS DEL EQUIPO — AVISO PARA EL LANZAMIENTO");
  {
    /* el 🧪 regala 1000+1000 al instante: en modo sombra queda ANOTADO (bien, somos nosotros);
       el día que MODO pase a "rechazo", este botón muere o se protege por cuenta — ya está
       apuntado en ui.js. Este test lo deja escrito también acá. */
    const antes = { plata: 0, res: { madera: 10, piedra: 10 } };
    const r = evaluarGuardado(antes, { plata: 0, res: { madera: 1010, piedra: 1010 } }, 60);
    ok("el kit del equipo dispara sospechas (como debe: es la demo del agujero)",
      r.sospechas.length >= 2, r.sospechas.join(" · "));
  }

  console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el honesto ni se entera, el tramposo queda anotado.\n");
  process.exit(fallos ? 1 : 0);
})();
