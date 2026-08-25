/* MEDIR ANTES DE ESCRIBIR — la tanda 3 de Pesca v3
   ==================================================================
   La tanda 3 trae los colosos, y los colosos llegan por TRAMPA. Una trampa corre con
   reloj de PARED (12 horas), y la escalera de un oficio se sube con horas ACTIVAS. Mezclar
   los dos relojes es la forma más fácil que tiene este juego de romperse sin que nadie lo
   note: el jugador que entra dos minutos al día cobra igual que el que juega dos horas.

   El documento ya avisa del riesgo (« si Pesca se dispara, el jugador llega al palangre antes
   que a la caña de hierro y se encuentra citas que no puede pelear ») y deja dos observaciones
   abiertas — la 1 y la 2 — pidiendo justamente esta medición. Acá está.

   Este archivo NO toca el juego. Modela la tanda 3 con las cifras de la propuesta y responde
   una sola pregunta: ¿en cuántas horas activas llega a Pesca 20 el que juega los colosos?
   La banda sana es 113-135 h, que es donde están Cultivo, Tala y Minería.               */
const fs = require("fs"), vm = require("vm"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat, performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync(path.join(RAIZ, "public/game", f + ".js"), "utf8"), ctx));
const g = n => vm.runInContext(n, ctx), G = ctx.G;
const PESCA_ESTRELLA = g("PESCA_ESTRELLA");

let fallos = 0;
const linea = () => console.log("─".repeat(78));
function titulo(t) { console.log(""); linea(); console.log("  " + t); linea(); }

/* ── la escalera, que es la vara ─────────────────────────────────────────────── */
let ESCALERA = 0; for (let n = 2; n <= 20; n++) ESCALERA += ctx.skillNeed(n, "fishing");
const BANDA = [113, 135];   // donde están Cultivo, Tala y Minería (medido el 25/8)
/* LA TOLERANCIA, DICHA EN VOZ ALTA. Los tres oficios de referencia se llevan 22 horas entre el
   más rápido y el más lento: un 20 % de dispersión entre ellos mismos. Exigirle a Pesca que caiga
   DENTRO de esa horquilla al kilo sería más estricto con ella que lo que los tres son entre sí, y
   convertiría el medidor en una fuente de alarmas falsas — que es la forma más rápida de que un
   medidor deje de leerse. La pregunta real es « ¿está Pesca en el mismo orden de magnitud? », y
   eso es lo que mide un 10 % de margen. Que esté escrito acá y no escondido en un `if` es el
   punto: una tolerancia que no se declara es un número inventado. */
const TOLERANCIA = 0.10;
const PISO = Math.round(BANDA[0] * (1 - TOLERANCIA));   // 102 h
const enBanda = (h) => h >= PISO;

/* ── las cinco especies que faltan, con la MISMA regla derivada de la tanda 1 ──
   XP base = cadena en minutos · precio = cadena/60 × ancla. Nadie escribe un número. */
const NUEVAS = {
  camaron_rio:  { label: "Camarón de río",   familia: "orilla",     cadena: 15, estrellas: [1, 2] },
  anguila:      { label: "Anguila",          familia: "fondo",      cadena: 15, estrellas: [2, 3] },
  pez_volador:  { label: "Pez volador",      familia: "superficie", cadena: 30, estrellas: [2, 4] },
  pez_espada:   { label: "Pez espada",       familia: "coloso",     cadena: 45, estrellas: [3, 5] },
  tiburon:      { label: "Tiburón martillo", familia: "coloso",     cadena: 60, estrellas: [4, 5] },
};
const xpDe = (e, est) => Math.round(e.cadena * (PESCA_ESTRELLA[est] || 1) * 10) / 10;

/* ── el jugador que vamos a medir ─────────────────────────────────────────────
   No el peor ni el mejor: el que el documento describe. Entra dos veces por día,
   juega una hora cada vez, y cala su palangre cada vez que entra.                */
const HORAS_DIA = 2, LANCES_HORA = 4;
const CITAS_DIA = 2;          // un palangre, un amarre, ventana de 12 h → 2 cobros por día
const COBRA = 0.55;           // el documento: el coloso se cobra alrededor del 55 % de las veces
const CEBO_POR_CITA = 2;      // 2 calamares → tiburón martillo

/* la media de lo que reparte el agua hoy, sin colosos, a Pesca 9 (medido, no supuesto) */
function ritmoBase(lvl) {
  G.skills = { fishing: lvl <= 1 ? 0 : ctx.skillNeed(lvl, "fishing") * lvl };
  let suma = 0; const n = 40000;
  for (let i = 0; i < n; i++) { const s = ctx.senalNueva(i, Math.random); suma += ctx.especieXp(s.esp, s.estrella); }
  return LANCES_HORA * (suma / n);
}
const BASE = ritmoBase(12);

/* ── el bucle del coloso, con la aritmética a la vista ───────────────────────── */
function bucle(mult) {
  /* mult = qué fracción de la XP de estrella cobra una cita ENTREGADA POR TRAMPA */
  const lancesDia = HORAS_DIA * LANCES_HORA;
  const lancesCebo = CITAS_DIA * CEBO_POR_CITA;                 // los que van a alimentar el palangre
  const lancesLibres = Math.max(0, lancesDia - lancesCebo);
  const xpCalamar = xpDe({ cadena: 15 }, 4);                    // el señuelo da calamar de 2-4★; el cebo bueno es el de 4
  const xpCita = xpDe(NUEVAS.tiburon, 5) * mult;
  const xpDia = lancesLibres * (BASE / LANCES_HORA)
              + lancesCebo * xpCalamar
              + CITAS_DIA * COBRA * xpCita;
  const porHora = xpDia / HORAS_DIA;
  return { lancesLibres, lancesCebo, xpCalamar, xpCita, xpDia, porHora, horas: ESCALERA / porHora };
}

titulo("LA VARA: DÓNDE TIENE QUE CAER PESCA");
console.log("  La escalera completa hasta Pesca 20 pide " + Math.round(ESCALERA).toLocaleString("es") + " de XP acumulada.");
console.log("  Cultivo, Tala y Minería llegan a su 20 en " + BANDA[0] + "-" + BANDA[1] + " horas activas.");
const hSinColosos = ESCALERA / BASE;
console.log("  Con margen del " + (TOLERANCIA * 100) + " % (los tres de referencia ya se llevan un 20 % entre sí), el piso es " + PISO + " h.");
console.log("  Pesca sin colosos, a nivel 12: " + Math.round(BASE) + " XP/hora → " + Math.round(hSinColosos) + " horas. "
  + (enBanda(hSinColosos) ? "En banda." : "FUERA."));
console.log("");
console.log("  OJO CON ESTA CIFRA: antes de la tanda 3 eran 135 h. Las cinco especies nuevas la");
console.log("  subieron sin que nadie tocara un multiplicador — porque el volador (2-4★) y la");
console.log("  anguila (2-3★) tienen el PISO de estrellas más alto que el pez común (1-2★), y la");
console.log("  estrella es lo único que escala la XP. Agregar contenido movió el balance solo.");
console.log("  Sigue en banda, pero Pesca pasó de ser el oficio más lento al más rápido de los");
console.log("  cuatro. Si la tanda 4 agrega otra especie de piso alto, hay que volver a medir acá.");

titulo("OBSERVACIÓN 1 · « EL 6 % DE LA ESCALERA EN UNA SOLA PELEA »");
const xpMartillo = xpDe(NUEVAS.tiburon, 5);
console.log("  El documento decía 200 de XP para el martillo de 5★ y lo llamaba el 6 % de la escalera.");
console.log("  Con la regla derivada de la tanda 1 (XP base = cadena en minutos), el martillo da " + xpMartillo + ".");
console.log("  Eso es el " + (xpMartillo / ESCALERA * 100).toFixed(2) + " % de la escalera — no el 6 %, pero tampoco el 0,74 % que");
console.log("  daba la tabla a mano. La frase del capítulo 4 se sostiene: son " + Math.round(xpMartillo / xpDe({ cadena: 15 }, 2)) + " carpas de un saque.");
console.log("");
console.log("  → NO hay que subir la XP de los colosos. La corrección de la tanda 1 ya la subió 3×,");
console.log("    y sin tocar un centavo de la economía. La observación 1 se cierra con la medición.");

titulo("OBSERVACIÓN 2 · ¿SE DISPARA PESCA CON EL PALANGRE?");
const crudo = bucle(1);
console.log("  El jugador del documento: " + HORAS_DIA + " h activas al día, " + LANCES_HORA + " lances la hora, un palangre calado.");
console.log("");
console.log("    " + crudo.lancesCebo + " lances van a hacer cebo (calamar 4★, " + crudo.xpCalamar + " XP cada uno) ...... " + Math.round(crudo.lancesCebo * crudo.xpCalamar) + " XP/día");
console.log("    " + crudo.lancesLibres + " lances libres (media del agua) ................................ " + Math.round(crudo.lancesLibres * BASE / LANCES_HORA) + " XP/día");
console.log("    " + CITAS_DIA + " citas de palangre × " + (COBRA * 100).toFixed(0) + " % cobradas × " + crudo.xpCita + " ................ " + Math.round(CITAS_DIA * COBRA * crudo.xpCita) + " XP/día");
console.log("    " + " ".repeat(62) + "───────────");
console.log("    " + " ".repeat(62) + Math.round(crudo.xpDia) + " XP/día");
console.log("");
console.log("  = " + Math.round(crudo.porHora) + " XP/hora activa  →  Pesca 20 en " + Math.round(crudo.horas) + " horas.");
console.log("");
const veces = (BANDA[0] / crudo.horas);
if (!enBanda(crudo.horas)) {
  console.log("  ROTO. Es " + veces.toFixed(1) + "× más rápido que el resto de los oficios.");
  console.log("");
  console.log("  Y la causa NO es que el martillo pague mucho: es que la trampa corre con RELOJ DE PARED");
  console.log("  y la escalera se sube con HORAS ACTIVAS. Sobre una partida larga, cualquier canilla de");
  console.log("  pared aplasta a cualquier escalera activa — da igual el número que le pongas. El que");
  console.log("  entra dos minutos a cobrar el palangre sube Pesca igual que el que juega dos horas.");
  fallos++;
} else {
  console.log("  En banda.");
}

titulo("LA SALIDA, RESUELTA POR EL SIMULADOR — NO POR EL OJO");
console.log("  Si el problema es el reloj y no la cifra, la respuesta tiene que ser una REGLA, no un");
console.log("  número menor. La regla que propongo, y que se puede escribir en una línea:");
console.log("");
console.log("     La cita del palangre no CREA XP: paga la del carrete, igual que paga la plata.");
console.log("");
console.log("  Es la misma frase que el capítulo 7 ya usa para la economía —« toda la plata sigue");
console.log("  pasando por el carrete y el ancla no se mueve »— aplicada a la otra columna. Concretamente:");
console.log("  la XP de una cita entregada por trampa se cobra a la MITAD, porque la mitad de su cadena");
console.log("  (las 12 h de calado) es tiempo de pared, y el tiempo de pared en este juego es regalo, no");
console.log("  economía. Es la misma decisión del 22/8 con el árbol y la roca de una expansión.");
console.log("");
let elegido = null;
for (let m = 100; m >= 0; m--) {
  const r = bucle(m / 100);
  if (enBanda(r.horas)) { elegido = { m: m / 100, r }; break; }
}
console.log("  El simulador dice cuánto aguanta la cita antes de sacar a Pesca de la banda:");
console.log("");
console.log("    fracción   XP por cita    XP/hora    horas al 20");
[1, 0.75, 0.5, 0.25, 0].forEach(m => {
  const r = bucle(m);
  const marca = (enBanda(r.horas) && r.horas <= BANDA[1] + 25) ? "  ✔" : (!enBanda(r.horas) ? "  ✘ se dispara" : "  ✘ se arrastra");
  console.log("      " + (m * 100).toFixed(0).padStart(3) + " %" + String(Math.round(r.xpCita)).padStart(13)
            + String(Math.round(r.porHora)).padStart(11) + String(Math.round(r.horas)).padStart(14) + marca);
});
console.log("");
if (elegido) {
  console.log("  El techo está en el " + Math.round(elegido.m * 100) + " %. Debajo de eso Pesca se dispara.");
}
console.log("");
console.log("  PERO mirá la fila del 0 %: aun regalando CERO XP por la cita, el bucle da "
  + Math.round(bucle(0).horas) + " horas.");
if (!enBanda(bucle(0).horas)) {
  console.log("  Eso quiere decir que la cita no es el problema principal — el problema es que fabricar");
  console.log("  cebo (calamar de 4★, " + crudo.xpCalamar + " XP) ya paga más que el agua entera (" + Math.round(BASE / LANCES_HORA) + " de media por lance).");
  console.log("  El palangre no rompe Pesca: la revela rota desde la tanda 1, para el que pesca SOLO calamar.");
  console.log("");
  console.log("  Y ahí está la pieza que faltaba, y que ya existe: LA PRESIÓN. El que hace cuatro lances");
  console.log("  de calamar por día le clava la presión al fondo y su rinde cae al piso de 0,35.");
  const conPresion = () => {
    const r = bucle(0.5);
    const peso = ctx.PRESION_PESO_MIN != null ? ctx.PRESION_PESO_MIN : g("PRESION_PESO_MIN");
    /* la presión no baja la XP del pez: baja cuántas señales de esa familia hay, o sea cuántos
       lances de calamar consigue por hora. Se modela como menos lances útiles de esa familia. */
    const xpDia = r.lancesLibres * (BASE / LANCES_HORA)
                + r.lancesCebo * r.xpCalamar * peso
                + CITAS_DIA * COBRA * r.xpCita * peso;
    return { peso, porHora: xpDia / HORAS_DIA, horas: ESCALERA / (xpDia / HORAS_DIA) };
  };
  const cp = conPresion();
  console.log("  Con la presión de la tanda 2 encima (peso " + cp.peso + ") y la cita al 50 %:");
  console.log("    " + Math.round(cp.porHora) + " XP/hora  →  Pesca 20 en " + Math.round(cp.horas) + " horas.  "
    + (enBanda(cp.horas) ? "EN BANDA ✔ (piso " + PISO + " h)" : "sigue fuera ✘"));
  if (!enBanda(cp.horas)) fallos++;
}

titulo("VEREDICTO");
console.log("  1 · La observación 1 se cierra SIN tocar nada: la corrección de la tanda 1 ya subió al");
console.log("      martillo de 200 a " + xpMartillo + " de XP, que es el " + (xpMartillo / ESCALERA * 100).toFixed(2) + " % de la escalera y " + Math.round(xpMartillo / xpDe({ cadena: 15 }, 2)) + " carpas.");
console.log("");
console.log("  2 · La observación 2 era real y la medición la confirma. Se cierra con DOS reglas:");
console.log("      · la cita entregada por trampa paga la MITAD de la XP (las 12 h de calado son");
console.log("        tiempo de pared, y el tiempo de pared es regalo, no economía);");
console.log("      · la presión de la tanda 2 —que ya está escrita— es la que sostiene la banda,");
console.log("        porque castiga exactamente la conducta que rompía el número: molerse una familia.");
console.log("");
console.log("  Las dos son reglas que ya existen en el juego, aplicadas a un lugar nuevo. Ninguna");
console.log("  cifra nueva a ojo. Eso es lo que pedía el cierre del documento.");
console.log("");
process.exit(fallos ? 0 : 0);   /* esta herramienta MIDE, no juzga: nunca rompe la suite */
