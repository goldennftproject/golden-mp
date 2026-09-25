/* EL MENÚ DE ESCRITORIO NACE BAJO EL HUD REAL
   ============================================
   Si el HUD se envuelve o la repisa de buffs está visible, un top fijo de 52 px cubre datos y
   roba sus clics. El menú se ancla ocho píxeles debajo de la caja visible y su lista conserva
   sólo la altura útil para scrollear. Móvil no cambia.
     node tools/test-menu-hud-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function placeMenuPc() {");
const fin = UI.indexOf("/* ═══", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró placeMenuPc");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function estilo(previo) {
  const s = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  if (previo) Object.assign(s, previo);
  return s;
}
function caso({ ancho, alto, hud, flot, previo }) {
  const style = estilo(previo), menu = { style };
  const barra = hud && { getBoundingClientRect: () => hud };
  const repisa = flot && { getBoundingClientRect: () => flot };
  const ctx = { window: { innerWidth: ancho, innerHeight: alto }, Math,
    $: id => ({ gmenu: menu, hudbar: barra, "hud-flot": repisa })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext("placeMenuPc()", ctx);
  return style;
}

console.log("\nEL HUD NORMAL CONSERVA LA POSICIÓN CONOCIDA\n");
{
  const normal = caso({ ancho: 1280, alto: 720, hud: { width: 1280, height: 42, bottom: 42 }, flot: { width: 0, height: 0, bottom: 0 } });
  ok("una fila mantiene top 52", normal["--gmenu-top"] === "52px", normal["--gmenu-top"]);
  ok("la lista recibe el alto útil", normal["--gmenu-max-height"] === "658px", normal["--gmenu-max-height"]);
}

console.log("\nHUD ENVUELTO Y REPISA LIBERAN EL MENÚ\n");
{
  const envuelto = caso({ ancho: 760, alto: 720, hud: { width: 760, height: 131, bottom: 131 }, flot: { width: 322, height: 46, bottom: 180 } });
  ok("arranca ocho píxeles bajo la repisa visible", envuelto["--gmenu-top"] === "188px", envuelto["--gmenu-top"]);
  ok("el scroll se limita al hueco que queda", envuelto["--gmenu-max-height"] === "522px", envuelto["--gmenu-max-height"]);
}

console.log("\nMÓVIL LIMPIA LAS VARIABLES DE ESCRITORIO\n");
{
  const movil = caso({ ancho: 640, alto: 720, hud: { width: 640, height: 131, bottom: 131 }, flot: { width: 322, height: 46, bottom: 180 },
    previo: { "--gmenu-top": "188px", "--gmenu-max-height": "522px" } });
  ok("móvil conserva su CSS original", !("--gmenu-top" in movil) && !("--gmenu-max-height" in movil), JSON.stringify(movil));
}

console.log("\nEL CÁLCULO SE REEJECUTA CUANDO CAMBIA EL HUD\n");
{
  ok("CSS aplica las variables sólo en escritorio",
    /@media\(min-width:641px\)\{\.gmenu\{top:var\(--gmenu-top,52px\)\}\.gmenu \.gmitems\{max-height:var\(--gmenu-max-height,calc\(100vh - 70px\)\)\}\}/.test(HTML));
  const refresh = (UI.match(/function refreshHud\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("el refresco del HUD vuelve a ubicar el menú", /placeMenuPc\(\);/.test(refresh));
  ok("resize y abrir el menú también lo recalculan",
    /const syncLayouts = \(\) => \{[\s\S]*?placeMenuPc\(\);/.test(UI) &&
    /const toggleMenu = \(\) => \{[\s\S]*?placeMenuPc\(\);/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el menú deja el HUD usable en PC.\n");
process.exit(fallos ? 1 : 0);
