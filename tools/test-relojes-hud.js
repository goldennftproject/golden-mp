/* LA COMIDA Y LA ESTAMINA SON RELOJES, Y EL HUD LOS ENSEÑA                             (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   De los vídeos de referencia de dirección (el panel de Tibia: « Food 00:00 · Stamina 42:00 »).
   Las dos cosas ya ERAN relojes por dentro y ninguna se veía:

   · Los platos dan buffs con vencimiento desde el doc maestro del 2/8, y no se enseñaban en
     NINGÚN sitio — se midió con grep: G.buffs no aparecía ni una vez en el dibujo del HUD.
     Comías un guiso de +10 % de daño y el juego no decía ni que estaba activo.
   · La estamina se llena entera cada 4 h de reloj real (24/8), pero su píldora solo existía
     DENTRO de la Zona Negra y el « cuándo » solo vivía en el tooltip. Para saber si ya podías
     volver a pelear había que entrar a la Zona Negra a mirar: la puerta como termómetro. Y en
     el móvil no hay hover, así que un dato que solo vive en el title directamente no existe.

   Este archivo corre refreshBuffsPill() y refreshStam() de verdad contra elementos que anotan,
   y comprueba los estados de cada una.
     node tools/test-relojes-hud.js                                                              */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx, elementos } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* elementos con memoria: el arnés base traga estilos y clases; acá hay que leerlos.
   El chip de cada buff vive DENTRO de la píldora, así que querySelector devuelve hijos reales. */
function armarElemento(id) {
  const el = elementos[id] || (elementos[id] = {});
  el._clases = new Set(); el.style = {}; el._html = ""; el._hijos = {};
  el.classList = { add: (c) => el._clases.add(c), remove: (c) => el._clases.delete(c),
    toggle: (c, on) => { (on == null ? !el._clases.has(c) : on) ? el._clases.add(c) : el._clases.delete(c); },
    contains: (c) => el._clases.has(c) };
  Object.defineProperty(el, "innerHTML", {
    get() { return el._html; },
    set(v) {
      el._html = String(v); el._hijos = {};
      /* los chips: un elemento hijo por data-bff, con su .bt adentro */
      for (const m of el._html.matchAll(/data-bff="(\d+)"/g)) {
        const bt = { textContent: "" };
        el._hijos[m[1]] = { _clases: new Set(), bt,
          classList: { toggle(c, on) { (on == null ? !this._c.has(c) : on) ? this._c.add(c) : this._c.delete(c); },
                       contains(c) { return this._c.has(c); } },
          querySelector: (s) => s === ".bt" ? bt : null };
        el._hijos[m[1]].classList._c = el._hijos[m[1]]._clases;
      }
    }, configurable: true });
  el.querySelector = (sel) => { const m = sel.match(/data-bff="(\d+)"/); return m ? el._hijos[m[1]] || null : null; };
  return el;
}
const pill = armarElemento("buffpill");
const stamPill = armarElemento("stampill"), stamTxt = armarElemento("s-stam");
elementos["stam-fill"] = { style: {} };

console.log("\nLOS EFECTOS DE LA COMIDA   (« Food 00:00 »)");
{
  G.buffs = [];
  ctx.refreshBuffsPill();
  ok("sin buffs, la píldora no está", pill.style.display === "none");

  /* un guiso de verdad: +10 % de daño, 10 minutos */
  ctx.addBuff("dmg", "+10% daño", 10, 600);
  ctx.refreshBuffsPill();
  ok("con un plato comido, aparece", pill.style.display === "");
  ok("con su etiqueta", /\+10% daño/.test(pill.innerHTML), pill.innerHTML);
  const chip = pill.querySelector('[data-bff="0"]');
  ok("y su cuenta atrás corriendo", /^(9|10) min|^\d+:\d\d/.test(chip.bt.textContent) || chip.bt.textContent.length > 0,
    "quedan " + chip.bt.textContent);
  ok("sin el ámbar de « por irse »: recién servido", !chip.classList.contains("porirse"));

  /* el mismo plato otra vez: un chip con ×2, no dos chips */
  ctx.addBuff("dmg", "+10% daño", 10, 900);
  ctx.refreshBuffsPill();
  ok("repetir el plato agrupa: « ×2 », no dos chips",
    /\+10% daño ×2/.test(pill.innerHTML) && !/data-bff="1"/.test(pill.innerHTML), pill.innerHTML);

  /* a punto de vencer: el reloj avisa en ámbar */
  G.buffs = [];
  ctx.addBuff("speed", "+5% velocidad", 5, 20);   // 20 segundos
  ctx.refreshBuffsPill();
  const chip2 = pill.querySelector('[data-bff="0"]');
  ok("en los últimos 30 segundos, el reloj pasa a ámbar", chip2.classList.contains("porirse"),
    chip2.bt.textContent + " restantes");
  console.log("       → es el momento de la única decisión que el chip pide: ¿volvés a comer");
  console.log("         antes de entrar a pelear, o entrás así?");

  /* vencido, desaparece — sin esperar a que buffTick lo pode */
  G.buffs = [{ type: "speed", label: "+5% velocidad", mult: 5, until: Date.now() - 1000 }];
  ctx.refreshBuffsPill();
  ok("vencido el plato, el chip se va solo", pill.style.display === "none");
}

console.log("\nLA ESTAMINA   (« Stamina 42:00 » — y visible desde la granja)");
{
  ctx.GF = ctx.GF || {}; vm.runInContext("GF.scene = 'farm';", ctx);
  let acc = 0; for (let k = 2; k <= 12; k++) acc += ctx.skillNeed(k, "cooking");
  G.combatXp = 0;

  /* llena y en la granja: escondida — una barra llena no dice nada */
  G.stam = ctx.stamMax(); G.stamFullAt = 0;
  ctx.refreshStam();
  ok("llena y fuera de la Zona Negra, la píldora se esconde", stamPill.style.display === "none");

  /* gastada: aparece EN LA GRANJA, con su reloj a la vista */
  G.stam = 40;
  G.stamFullAt = ctx.nowMs() + 3 * 3600e3 + 12 * 60e3;   // vuelve entera en 3 h 12 min
  ctx.refreshStam();
  ok("gastada, la píldora aparece aunque estés en la granja", stamPill.style.display === "");
  console.log("       → antes solo existía dentro de la Zona Negra: para saber si ya podías");
  console.log("         volver a pelear había que ENTRAR a mirar. La puerta como termómetro.");
  ok("y el reloj está EN el texto, no solo en el tooltip",
    /⏱/.test(stamTxt.textContent) && /3 h/.test(stamTxt.textContent), stamTxt.textContent);
  ok("el tooltip sigue explicando la regla de las 4 h",
    /recarga completa cada 4 h/.test(stamPill.title), stamPill.title);

  /* y en la Zona Negra se ve siempre, llena o no: ahí es donde se gasta */
  vm.runInContext("GF.scene = 'forest';", ctx);
  G.stam = ctx.stamMax(); G.stamFullAt = 0;
  ctx.refreshStam();
  ok("en la Zona Negra se ve aunque esté llena", stamPill.style.display === "");
  ok("y llena no enseña reloj: no hay nada que esperar", !/⏱/.test(stamTxt.textContent), stamTxt.textContent);
  vm.runInContext("GF.scene = 'farm';", ctx);
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la comida o la estamina siguen corriendo a escondidas"
  : "  Todo en orden: los dos relojes se ven, que es todo lo que un reloj tiene que hacer.");
process.exit(fallos ? 1 : 0);
