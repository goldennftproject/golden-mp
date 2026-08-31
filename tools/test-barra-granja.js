/* LA BARRA DE LA GRANJA EN EL HUD                                                      (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   De los vídeos de referencia que mandó la dirección (el panel de Skills de Tibia): cada nivel
   con su barra a la vista. En Golden Farm ya lo tenían los oficios (ventana de Skills), la
   ventana de la Granja y el Combate en el HUD. El ÚNICO sin barra era el nivel de granja del
   HUD — el número más importante del juego, mudo justo donde más se mira.

   Y no era solo estética: del nivel 11 en adelante subir pide XP Y TAREAS. Un jugador con la XP
   completa y una tarea a medias veía « Granja 14/50 » quieto sin ninguna pista de por qué. La
   barra cuenta las dos mitades: verde mientras falta XP, ámbar y llena cuando lo que falta son
   tareas — con el texto « tareas 1/2 » al lado y el detalle en el tooltip.

   Este archivo mide la LÓGICA de los tres estados con los elementos de verdad del HUD (el arnés
   guarda lo que cada elemento recibió). Los colores en pantalla no se pueden medir desde acá;
   lo que sí se puede es que la clase correcta esté puesta, que es lo que los produce.
     node tools/test-barra-granja.js                                                             */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx, elementos } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const XPL = g("FARM_XP_LVLS");

/* los tres elementos del HUD, con memoria de clase (el arnés base no la tiene) */
function elemento(id) {
  const el = elementos[id] || (elementos[id] = {});
  if (!el._clases) {
    el._clases = new Set();
    el.classList = { add: (c) => el._clases.add(c), remove: (c) => el._clases.delete(c),
      toggle: (c, on) => { (on == null ? !el._clases.has(c) : on) ? el._clases.add(c) : el._clases.delete(c); },
      contains: (c) => el._clases.has(c) };
    /* el arnés base da un style-proxy que TRAGA las escrituras (devuelve "" a todo): sirve para
       que nada reviente, no para leer lo escrito. Acá hay que leerlo, así que objeto plano. */
    el.style = {};
  }
  return el;
}
const fill = elemento("lvl-fill"), txt = elemento("lvl-txt"), pill = elemento("lvlpill");

console.log("\nESTADO 1 · SUBIENDO CON LA COSECHA   (niveles 1-10: solo XP)");
{
  G.level = 4;
  /* a mitad de camino entre el nivel 4 y el 5, exacto */
  G.skills.farming = XPL[4] + (XPL[5] - XPL[4]) / 2;
  ctx.refreshFarmBar();
  /* 49,8 y no 50,0: la XP se enseña en enteros (162 de 325) y la barra sigue al número que se
     lee, no al real con decimales. Si barra y texto dijeran cosas distintas, uno de los dos
     mentiría. El test pide « alrededor de la mitad », que es lo que la barra promete. */
  const w = parseFloat(fill.style.width);
  ok("la barra marca alrededor del 50 %", w > 49 && w < 51, fill.style.width);
  ok("en verde: lo que falta es cosecha", !fill._clases.has("tareas"));
  ok("y el texto dice cuánta XP va de cuánta",
    txt.textContent === ctx.fmt((XPL[5] - XPL[4]) / 2) + "/" + ctx.fmt(XPL[5] - XPL[4]), txt.textContent);
  ok("el tooltip repite la cuenta y dice a dónde ir",
    /XP de cosecha/.test(pill.title) && /clic para ver la Granja/.test(pill.title), pill.title);
}

console.log("\nESTADO 2 · LA XP ESTÁ, FALTAN LAS TAREAS   (niveles 11+: el caso que engañaba)");
{
  /* nivel 11→12 pide « minar 25 de bronce » y « matar 25 ratas ». Se le da la XP entera y solo
     una tarea cumplida — el jugador que veía el número quieto sin saber por qué. */
  G.level = 11;
  G.skills.farming = XPL[12] + 500;
  G.stats = {};
  ctx.statAdd("minar", "bronce"); // 1 de 25: pendiente
  for (let i = 0; i < 30; i++) ctx.statAdd("matar", "rata"); // cumplida
  ctx.refreshFarmBar();
  ok("la barra está llena: la cosecha ya hizo su parte", fill.style.width === "100.0%", fill.style.width);
  ok("pero en ÁMBAR: lo que falta no es más cosecha", fill._clases.has("tareas"));
  ok("y el texto dice cuántas tareas van", /^tareas 1\/2$/.test(txt.textContent), txt.textContent);
  ok("el tooltip nombra la tarea pendiente con su progreso",
    /Minar 25 de/.test(pill.title) && /\(1\/25\)/.test(pill.title), pill.title);
  console.log("       → sin esto, « Granja 11/50 » con la XP completa era un número congelado sin");
  console.log("         ninguna pista. La ventana de la Granja SIEMPRE lo explicó — pero había que");
  console.log("         saber que existía. La barra es el cartel que avisa de que existe.");

  /* y al cumplir la tarea que faltaba, el juego sube de nivel él solo — la barra no inventa un
     estado « listo para subir » porque ese estado no existe: recalcFarmLevel sube en el acto */
  for (let i = 0; i < 25; i++) ctx.statAdd("minar", "bronce");
  ctx.recalcFarmLevel();
  ok("cumplida la tarea, el nivel sube solo — no hay botón de reclamar", G.level >= 12, "nivel " + G.level);
}

console.log("\nESTADO 3 · EL TECHO");
{
  G.level = g("FARM_NIVEL_MAX");
  ctx.refreshFarmBar();
  ok("al nivel máximo la barra queda llena y dice MAX",
    fill.style.width === "100%" && txt.textContent === "MAX", txt.textContent);
  ok("y sin el ámbar de tareas: no hay nada pendiente", !fill._clases.has("tareas"));
}

console.log("\nY LA VENTANA QUE LA BARRA ANUNCIA SIGUE COMPLETA");
{
  /* la barra remite a la ventana de la Granja; si alguien la vaciara, la barra apuntaría a un
     sitio sin respuesta. El arnés pinta la ventana y se lee lo que escribió. */
  G.level = 11; G.skills.farming = XPL[12] + 500; G.stats = {};
  ctx.refreshBarn();
  const html = (elementos["barn-body"] || {}).innerHTML || "";
  ok("la ventana pinta la barra de XP", /durbar/.test(html));
  ok("y las tareas del nivel siguiente, con su progreso", /Tareas para el nivel 12/.test(html));
  ok("y la recompensa que viene", /Recompensa del nivel/.test(html));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el nivel de granja sigue siendo un número mudo"
  : "  Todo en orden: el nivel de granja dice cuánto falta, de qué, y dónde mirarlo.");
process.exit(fallos ? 1 : 0);
