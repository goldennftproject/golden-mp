/* EL RANKING DEL TORNEO: EL SERVIDOR Y EL JUEGO CUENTAN IGUAL                          (1/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La Edge Function "torneo" calcula los puntos EN EL SERVIDOR con una copia congelada del
   catálogo (no puede leer el juego). Una copia congelada es una promesa de sincronía, y las
   promesas de sincronía las custodia un test o se rompen en silencio — es la misma técnica
   del portero del guardado: este archivo extrae el bloque === REGLAS === del index.ts y lo
   ejecuta TAL CUAL contra el juego real. Lo que se prueba es exactamente lo que se deploya.

   Se mide:
     · puntosDe(pez, kg) del servidor === torneoPuntos(pez, kg) del juego, especie por especie
       y en varios pesos — si el catálogo del juego cambia y la función no, esto se pone rojo;
     · el servidor RECHAZA lo imposible: especies inventadas, pesos fuera del rango físico;
     · semanaDe y torneoAbiertoEn cuentan igual que torneoSemana y torneoAbierto;
     · y del lado del cliente: la marca nueva se reporta, el podio se liquida una sola vez y
       el bono de plata sigue la MISMA escalera que las Escamas (25→3).
     node tools/test-torneo-ranking.js                                                        */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* extraer y ejecutar el bloque de reglas del index.ts — lo que se prueba es lo que se deploya */
const TS = fs.readFileSync(path.join(RAIZ, "supabase/functions/torneo/index.ts"), "utf8");
const m = TS.match(/\/\* === REGLAS ===[\s\S]*?\*\/([\s\S]*?)\/\* === FIN REGLAS === \*\//);
if (!m) { console.log("  FALLA  no encuentro el bloque === REGLAS === en index.ts"); process.exit(1); }
const srv = {};
vm.createContext(srv);
vm.runInContext(m[1] + "\nthis.puntosDe = puntosDe; this.semanaDe = semanaDe; this.torneoAbiertoEn = torneoAbiertoEn; this.PECES = PECES;", srv);

console.log("\nEL SERVIDOR Y EL JUEGO CUENTAN IGUAL, ESPECIE POR ESPECIE");
{
  const PEZ = g("PEZ_DEF"), ORDEN = g("PEZ_ORDER");
  let malas = [];
  for (const id of ORDEN) {
    const [min, max] = PEZ[id].peso;
    for (const kg of [min, (min + max) / 2, max]) {
      const kgR = Math.round(kg * 100) / 100;
      const s = srv.puntosDe(id, kgR);
      const j = ctx.torneoPuntos(id, kgR);
      if ("error" in s || Math.abs(s.pts - j) > 0.001) malas.push(id + "@" + kgR + ": srv " + (s.pts ?? s.error) + " vs juego " + j);
    }
  }
  ok("las " + ORDEN.length + " especies puntúan IGUAL en el servidor y en el juego (mín, medio y máx)",
    !malas.length, malas.slice(0, 3).join(" · "));
  ok("y el catálogo del servidor no tiene especies de más ni de menos",
    Object.keys(srv.PECES).sort().join(",") === ORDEN.slice().sort().join(","));
  /* la banda también, porque el multiplicador cuelga de ella */
  const bandasMal = ORDEN.filter(id => srv.PECES[id][2] !== PEZ[id].banda);
  ok("cada especie lleva su banda (el multiplicador cuelga de ahí)", !bandasMal.length, bandasMal.join(","));
}

console.log("\nEL SERVIDOR RECHAZA LO IMPOSIBLE");
{
  ok("una especie inventada", "error" in srv.puntosDe("megalodon", 500));
  const PEZ = g("PEZ_DEF");
  ok("un pez espada más liviano que su mínimo", "error" in srv.puntosDe("pez_espada", PEZ.pez_espada.peso[0] - 1));
  ok("una merluza más pesada que su máximo", "error" in srv.puntosDe("merluza", PEZ.merluza.peso[1] * 1.5));
  ok("un peso que no es número", "error" in srv.puntosDe("merluza", "muchos"));
  ok("y el redondeo a 2 decimales del cliente NO se rechaza (0,1 % de gracia)",
    !("error" in srv.puntosDe("merluza", PEZ.merluza.peso[1])));
  /* el techo del tramposo: lo PEOR que puede fabricar mintiendo kilos dentro del rango */
  const tope = Math.max(...Object.keys(srv.PECES).map(id => srv.puntosDe(id, srv.PECES[id][1]).pts || 0));
  ok("lo máximo fabricable son " + tope + " puntos — alcanzable legítimamente, no un exploit", tope <= 6.001);
}

console.log("\nLOS RELOJES CUENTAN IGUAL");
{
  const t = Date.UTC(2026, 8, 1, 12);
  ok("semanaDe === torneoSemana", srv.semanaDe(t) === ctx.torneoSemana(t));
  const vie = Date.UTC(2026, 8, 4, 12), mie = Date.UTC(2026, 8, 2, 12);
  ok("torneoAbiertoEn === torneoAbierto (viernes sí, miércoles no)",
    srv.torneoAbiertoEn(vie) === true && srv.torneoAbiertoEn(mie) === false &&
    ctx.torneoAbierto(vie) === true && ctx.torneoAbierto(mie) === false);
}

console.log("\nEL LADO DEL CLIENTE, POR SU LETRA");
{
  const st = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("la marca nueva dispara el reporte (torneoAnotar → torneoReportar)",
    /torneoReportar === "function"\) torneoReportar\(\)/.test(st));
  const sv = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("el podio se liquida UNA vez (marca torneoPodioCobrado antes de pagar)",
    /G\.torneoPodioCobrado === t\.sem\) return/.test(sv) && /G\.torneoPodioCobrado = t\.sem/.test(sv));
  ok("y el bono de plata sigue la escalera de las Escamas (esc / torneoPremio(1))",
    /diaDeGranja\(\) \* 2 \* esc \/ torneoPremio\(1\)/.test(sv));
  ok("la carga de la granja agenda la liquidación", /torneoPodioCheck\(\); \}, 4000\)/.test(sv));
  const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("la Lonja pinta el top 10 y tu puesto", /torneo-top/.test(ui) && /Vas ' \+ c\.puesto/.test(ui));
  /* la escalera del bono, con números: 1º cobra entero, 10º su proporción */
  const P = g("TORNEO_PREMIO");
  ok("la escalera 25→3 existe y decrece", P[0] === 25 && P[9] === 3 && P.every((v, i) => i === 0 || v < P[i - 1]));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el servidor y el juego pesan con la misma báscula.\n");
process.exit(fallos ? 1 : 0);
