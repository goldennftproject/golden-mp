/* SI NO BORRÁS LA CACHÉ, NO PERDÉS LA GRANJA (25/8, dirección)
   « El único motivo por el que una partida se debe resetear es si el jugador borra la caché. Si
   no la borra, no tiene por qué resetearse. »
   Es la regla correcta, y hasta hoy el juego no la cumplía: la granja vive en la nube y la llave
   en el navegador, así que si la llave se perdía —por lo que fuera— la granja quedaba
   inalcanzable y el jugador veía una vacía. Cuidar la llave no alcanza; la GRANJA tiene que
   tener también una copia de este lado.
   Y como llevábamos tres reportes del mismo síntoma con tres explicaciones distintas, ninguna
   comprobada, se suma una BITÁCORA: el juego anota qué le pasa a la sesión, con hora, para que
   el próximo reporte sea una lista de hechos y no una teoría.
   Contratos:
     · cada guardado deja una copia local (no reemplaza a la nube: la nube sigue siendo la
       verdad y es la que sobrevive al cambio de máquina);
     · si la nube trae MENOS progreso que la copia, se restaura la copia y se avisa;
     · si la nube está al día, manda la nube — sin adivinar;
     · la copia de una cuenta NUNCA se mezcla con otra;
     · y la bitácora se limita sola: nunca crece sin control.
     node tools/test-respaldo-local.js                                                           */
const fs = require("fs"), vm = require("vm");

const store = {};
const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
ctx.location = { origin: "https://golden.test" };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
["isOpen", "refreshInv", "refreshHud", "syncSlots", "recalcFarmLevel", "tutoEvent", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t));
const G = ctx.G, SAVE = fs.readFileSync("public/game/save.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nCADA GUARDADO DEJA UNA COPIA DE ESTE LADO");
{
  vm.runInContext('UID = "el-de-siempre";', ctx);
  G.level = 9; G.plata = 4200;
  ctx.copiaGuardar(ctx.snapshot());
  const c = ctx.copiaLeer();
  ok("la copia existe", !!c);
  ok("y guarda con qué progreso se hizo", c.nivel === 9 && c.plata === 4200, "nivel " + c.nivel + " · " + c.plata);
  ok("atada a SU cuenta", c.uid === "el-de-siempre");
  ok("con la granja entera adentro", !!(c.data && c.data.res && c.data.skills));
  /* 25/8 (revisión) — ESTA COMPROBACIÓN ERA UN CARTEL, NO UNA REGLA. Buscaba el COMENTARIO
     « la copia local se deja SIEMPRE » y lo encontraba… tres líneas por debajo del `return` que
     hacía que no se dejara nunca cuando no había nube. El comentario decía la verdad que
     queríamos y el código hacía otra cosa, y el medidor le creyó al comentario.
     Ahora se comprueba el ORDEN REAL de las instrucciones, con los comentarios fuera. */
  const cuerpoSave = SAVE.slice(SAVE.indexOf("async function saveFarm"));
  const soloCodigo = cuerpoSave.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const iCopia = soloCodigo.indexOf("copiaGuardar(snapshot())");
  const iNube = soloCodigo.indexOf("if (!sb || !UID)");
  ok("y el guardado la deja siempre — copiaGuardar corre ANTES de mirar si hay nube",
    iCopia > 0 && iNube > 0 && iCopia < iNube,
    iCopia < iNube ? "copia primero" : "la nube se comprueba antes: sin servidor no se guarda nada");
}

console.log("\nSI LA NUBE TRAE MENOS QUE LA COPIA, MANDA LA COPIA");
{
  const c = ctx.copiaLeer();
  G.level = 1; G.plata = 0;   // lo que vería el jugador si algo salió mal
  ok("se detecta que la copia tiene más progreso", ctx.copiaEsMejor(c) === true);
  G.level = 9; G.plata = 4200;
  ok("con la nube al día, NO se toca nada", ctx.copiaEsMejor(c) === false);
  G.level = 9; G.plata = 4230;
  ok("una diferencia chica de plata tampoco la dispara (la nube manda)", ctx.copiaEsMejor(c) === false,
    "sin restaurar por 30 de plata");
  G.level = 8; G.plata = 4200;
  ok("pero un nivel MENOS sí", ctx.copiaEsMejor(c) === true);
}

console.log("\nLA COPIA DE UNA CUENTA NO SE MEZCLA CON OTRA");
{
  const c = ctx.copiaLeer();
  vm.runInContext('UID = "otra-cuenta";', ctx);
  G.level = 1; G.plata = 0;
  ok("con otro UID, la copia se ignora", ctx.copiaEsMejor(c) === false,
    "una granja ajena no se restaura encima");
  vm.runInContext('UID = "el-de-siempre";', ctx);
}

console.log("\nLA RESTAURACIÓN AVISA (no se hace a escondidas)");
{
  const bloque = SAVE.slice(SAVE.indexOf("const c = copiaLeer();"), SAVE.indexOf("CARGA_OK = true;   // recién ACÁ"));
  ok("se restaura dentro de loadFarm, con el hydrate ya hecho", /if \(copiaEsMejor\(c\)\) \{/.test(bloque));
  ok("y se lo dice al jugador en el registro", /Se recuperó la que este navegador tenía guardada/.test(bloque));
  ok("con un aviso a la vista", /toast\("Granja recuperada del respaldo local"\)/.test(bloque));
  ok("y queda anotado en la bitácora", /sesionLog\("la nube traía MENOS que la copia local/.test(bloque));
}

console.log("\nLA COPIA TAMBIÉN ES PRUEBA DE QUE HUBO GRANJA (25/8 v2)");
{
  /* Dirección: « cuando yo hago deploy es cuando le sucede ». El deploy reinicia el servidor, la
     pestaña recarga en ese hueco, y el arranque cae con la red a medio levantar. Si justo ahí no
     se encuentra la sesión, hasta hoy quedaban dos pruebas —supabase y nuestra marca— y las dos
     podían faltar en un navegador cuyo último login bueno fue ANTES de que la marca existiera.
     La copia de la granja es la tercera prueba, y la más fuerte: sobrevive a las otras dos. */
  const guardado = {};
  const ctx2 = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean };
  ctx2.window = ctx2; ctx2.globalThis = ctx2;
  ctx2.localStorage = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; } };
  ctx2.location = { origin: "https://golden.test" };
  vm.createContext(ctx2);
  const ini = SAVE.indexOf("/* ================= EL LOGIN SE COLGABA");
  const fin = SAVE.indexOf("// campos de progreso que guardamos");
  const copia = SAVE.slice(SAVE.indexOf("const GF_COPIA_KEY"), SAVE.indexOf("async function saveFarm"));
  vm.runInContext('var SB_URL = "https://ref.supabase.co"; var SB_KEY = "x"; var sb = null, UID = "yo"; var G = { level: 1, plata: 0 };\n'
    + copia + "\n" + SAVE.slice(ini, fin), ctx2);
  ok("sin nada guardado, este navegador es virgen", ctx2.huboGranja() === false);
  guardado["gf-granja-copia"] = JSON.stringify({ uid: "yo", nivel: 7, plata: 900, data: {} });
  ok("con una copia con progreso, HUBO granja", ctx2.huboGranja() === true,
    "aunque supabase y la marca falten las dos");
  guardado["gf-granja-copia"] = JSON.stringify({ uid: "yo", nivel: 1, plata: 0, data: {} });
  ok("pero una copia recién empezada no cuenta", ctx2.huboGranja() === false,
    "no bloquea a un jugador que de verdad es nuevo");
}

console.log("\nY NO SE RECARGA CONTRA UN SERVIDOR QUE SE ESTÁ LEVANTANDO");
{
  const UPD = fs.readFileSync("public/game/update.js", "utf8");
  ok("antes de recargar se espera a que el servidor conteste", /async function servidorListo\(/.test(UPD));
  ok("preguntando a /version", /fetch\("\/version", \{ cache: "no-store" \}\)/.test(UPD));
  ok("con un tope (no se queda esperando para siempre)", /servidorListo\(60000\)/.test(UPD));
  ok("y el cartel lo cuenta mientras espera", /Esperando al servidor…/.test(UPD));
}

console.log("\nLA BITÁCORA: EL PRÓXIMO REPORTE VA A SER UNA LISTA DE HECHOS");
{
  for (let i = 0; i < 60; i++) ctx.sesionLog("evento " + i);
  const l = JSON.parse(store["gf-sesion-log"]);
  ok("se limita sola (nunca crece sin control)", l.length === 40, l.length + " líneas");
  ok("cada línea lleva hora", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(l[0].t), l[0].t);
  ok("y desde qué dirección se jugaba", l[0].o === "https://golden.test", l[0].o);
  ok("hay una forma de leerla para pegarla en el chat", typeof ctx.gfSesion === "function");
  ok("anota el arranque", /sesionLog\("arranque"/.test(SAVE));
  ok("anota si supabase cierra la sesión sola", /sesionLog\("auth: " \+ ev\)/.test(SAVE));
  ok("anota si hubo que revivirla", /sesionLog\("sesión REVIVIDA/.test(SAVE));
  ok("y anota el caso grave: sin sesión pero con granja previa", /sesionLog\("SIN SESIÓN pero con granja previa/.test(SAVE));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: la granja tiene copia de los dos lados, y la sesión deja rastro.\n");
process.exit(fallos ? 1 : 0);
