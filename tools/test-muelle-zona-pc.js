/* EL MORRAL Y EL MUELLE NO SE TAPAN EN PC
   ========================================
   La Bolsa ocupa dos filas; la Mochila, cinco. El segundo panel no puede asumir la altura
   de la primera: tiene que nacer debajo de la caja que se dibujó, y en una ventana baja su
   propio contenido debe poder desplazarse. Esta prueba protege ese contrato sin tocar móvil.
     node tools/test-muelle-zona-pc.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const capacidad = vm.runInContext("CONT_DEF.backpack.huecos", ctx);

console.log("\nLA MOCHILA ES MÁS ALTA QUE LA POSICIÓN VIEJA DEL MUELLE\n");
{
  ok("la Mochila tiene 20 huecos (cinco filas de cuatro)", capacidad === 20, String(capacidad));
  /* 25/9: se busca el bloque que POSICIONA (el que lleva right:), no el primero que aparezca —
     ahora hay reglas de #morral/#combate dentro de media queries antes del bloque base. */
  const cssMorral = HTML.match(/#morral\{([^}]*right:[^}]*)\}/);
  const cssMuelle = HTML.match(/#combate\{([^}]*right:[^}]*)\}/);
  ok("los dos paneles siguen en el mismo borde derecho", !!(cssMorral && cssMuelle && /right:8px/.test(cssMorral[1]) && /right:8px/.test(cssMuelle[1])));
  ok("el muelle ya no depende solo de top:236px", /--muelle-zona-top/.test(HTML));
}

console.log("\nEL MORRAL LIBERA EL HUD ENVUELTO EN PC\n");
{
  const fn = (UI.match(/function ubicarMorralPc\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("existe el posicionador del morral", !!fn);
  ok("mide HUD y repisa en vez de asumir 96 px", /hud\.getBoundingClientRect\(\)/.test(fn) && /flot\.getBoundingClientRect\(\)/.test(fn));
  ok("el CSS usa la variable sólo en escritorio", /@media\(min-width:641px\)\{[\s\S]{0,100}#morral\{top:var\(--morral-zona-top,96px\)\}/.test(HTML));

  const getAntes = ctx.document.getElementById, escenaAntes = ctx.GF.scene, anchoAntes = ctx.innerWidth;
  const estilo = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  const morral = { style: estilo };
  const hud = { getBoundingClientRect: () => ({ width: 760, height: 131, bottom: 131 }) };
  const flot = { getBoundingClientRect: () => ({ width: 0, height: 0, bottom: 0 }) };
  ctx.document.getElementById = id => id === "morral" ? morral : (id === "hudbar" ? hud : (id === "hud-flot" ? flot : getAntes(id)));
  ctx.GF.scene = "forest"; ctx.innerWidth = 760;
  try {
    vm.runInContext("ubicarMorralPc()", ctx);
    ok("un HUD de tres filas deja ocho píxeles antes del morral", estilo["--morral-zona-top"] === "139px", estilo["--morral-zona-top"]);
    flot.getBoundingClientRect = () => ({ width: 144, height: 38, bottom: 177 });
    vm.runInContext("ubicarMorralPc()", ctx);
    ok("una repisa de buffs visible también queda libre", estilo["--morral-zona-top"] === "185px", estilo["--morral-zona-top"]);
    ctx.innerWidth = 640;
    vm.runInContext("ubicarMorralPc()", ctx);
    ok("al cruzar a móvil se limpia la variable", !("--morral-zona-top" in estilo));
  } finally {
    ctx.document.getElementById = getAntes; ctx.GF.scene = escenaAntes; ctx.innerWidth = anchoAntes;
  }
}

console.log("\nEN ESCRITORIO, EL MUELLE NACE DEBAJO DEL MORRAL REAL\n");
{
  const fn = (UI.match(/function ubicarMuelleCombatePC\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("existe el posicionador de escritorio", !!fn);
  ok("mide el borde inferior ya renderizado del morral", /morral\.getBoundingClientRect\(\)/.test(fn) && /r\.bottom \+ 8/.test(fn));
  ok("escribe la altura en la variable que usa el CSS", /setProperty\("--muelle-zona-top"/.test(fn));
  ok("móvil queda fuera de esta regla", /window\.innerWidth <= 640/.test(fn));
  ok("en una ventana baja el muelle se puede desplazar por dentro", /max-height:calc\(100vh - var\(--muelle-zona-top/.test(HTML) && /overflow-y:auto/.test(HTML));
}

console.log("\nEL CÁLCULO MIDE LA CAJA REAL, NO UNA ALTURA INVENTADA\n");
{
  const getAntes = ctx.document.getElementById, escenaAntes = ctx.GF.scene, anchoAntes = ctx.innerWidth;
  const estilo = {
    setProperty(k, v) { this[k] = v; },
    removeProperty(k) { delete this[k]; },
  };
  const muelle = { style: estilo };
  const estiloMorral = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  const morral = { style: estiloMorral, getBoundingClientRect: () => ({ height: 216, bottom: 312 }) };
  ctx.document.getElementById = id => id === "combate" ? muelle : (id === "morral" ? morral : getAntes(id));
  ctx.GF.scene = "forest"; ctx.innerWidth = 1280;
  try {
    vm.runInContext("ubicarMuelleCombatePC()", ctx);
    ok("una mochila alta deja ocho píxeles antes del muelle", estilo["--muelle-zona-top"] === "320px", estilo["--muelle-zona-top"]);
    ctx.innerWidth = 640;
    vm.runInContext("ubicarMuelleCombatePC()", ctx);
    ok("al cruzar a móvil se limpia la variable de escritorio", !("--muelle-zona-top" in estilo));
  } finally {
    ctx.document.getElementById = getAntes; ctx.GF.scene = escenaAntes; ctx.innerWidth = anchoAntes;
  }
}

console.log("\nEL ENCABEZADO CUENTA LOS HUECOS QUE REALMENTE QUEDAN\n");
{
  const getAntes = ctx.document.getElementById, contAntes = ctx.G.cont,
        escenaAntes = ctx.GF.scene, anchoAntes = ctx.innerWidth;
  const estiloMuelle = {
    setProperty(k, v) { this[k] = v; },
    removeProperty(k) { delete this[k]; },
  };
  const muelle = { style: estiloMuelle };
  const estiloMorral = { display: "", setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  const morral = {
    _firma: "", innerHTML: "", style: estiloMorral,
    getBoundingClientRect: () => ({ height: 216, bottom: 312 }),
  };
  ctx.document.getElementById = id => id === "combate" ? muelle : (id === "morral" ? morral : getAntes(id));
  ctx.GF.scene = "forest"; ctx.innerWidth = 1280;
  ctx.G.cont = { c: "backpack", items: [] };
  try {
    vm.runInContext("refreshMorral()", ctx);
    ok("una Mochila sola muestra sus 20 huecos", /Mochila 0\/20/.test(morral.innerHTML), morral.innerHTML.slice(0, 80));
    ctx.G.cont.items.push({ c: "bag", items: [] });
    vm.runInContext("refreshMorral()", ctx);
    ok("una Bolsa anidada actualiza a los 27 huecos útiles", /Mochila 0\/27/.test(morral.innerHTML), morral.innerHTML.slice(0, 80));
    ok("la Bolsa vacía también invalida la firma visual", /backpack:27:/.test(morral._firma), morral._firma);
  } finally {
    ctx.document.getElementById = getAntes; ctx.G.cont = contAntes;
    ctx.GF.scene = escenaAntes; ctx.innerWidth = anchoAntes;
  }
}

console.log("\nEL REACOMODO NO DEPENDE DE QUE CAMBIE EL CONTENIDO\n");
{
  const morral = (UI.match(/function refreshMorral\(\)[\s\S]*?\n\}/) || [""])[0];
  const combate = (UI.match(/function refreshCombate\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("el morral recoloca incluso con la misma firma", /if \(caja\._firma === firma\) \{ ubicarMuelleCombatePC\(\); return; \}/.test(morral));
  ok("y lo hace después de dibujar sus filas", /caja\.innerHTML = h;\s*ubicarMuelleCombatePC\(\);/.test(morral));
  ok("el muelle también se corrige cuando se redibuja solo", /ubicarMuelleCombatePC\(\);/.test(combate));
  ok("el muelle recalcula antes el morral", /function ubicarMuelleCombatePC\(\)[\s\S]{0,260}ubicarMorralPc\(\)/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cada contenedor conserva sus huecos visibles en PC.\n");
process.exit(fallos ? 1 : 0);
