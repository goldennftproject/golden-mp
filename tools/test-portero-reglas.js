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
  vm.runInContext(m[1] + "\nthis.evaluarGuardado = evaluarGuardado; this.MODO = MODO; this.VERSION = VERSION;", ctx);
  const { evaluarGuardado, MODO, VERSION } = ctx;
  const HORA = 3600;

  console.log("\nEL CONTRATO DEL ESCALÓN 1: MODO SOMBRA, VERSIONADO");
  ok("las reglas arrancan en modo sombra (mirar sin rechazar)", MODO === "sombra", MODO);
  ok("y llevan versión (la bitácora anota cuál evaluó)", VERSION >= 1, "v" + VERSION);

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
