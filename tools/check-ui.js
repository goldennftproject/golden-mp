// Chequeo rápido antes de deployar: que cada ventana tenga su función y su div,
// que no haya funciones referenciadas inexistentes y que los ids del código existan en el HTML.
// Uso:  node tools/check-ui.js
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "public");   // node tools/check-ui.js
const ui = fs.readFileSync(dir + "/game/ui.js", "utf8");
const html = fs.readFileSync(dir + "/index.html", "utf8");
const state = fs.readFileSync(dir + "/game/state.js", "utf8");
const save = fs.readFileSync(dir + "/game/save.js", "utf8");
const todo = ui + state + save + ["farm.js", "forest.js", "plaza.js", "boot.js", "main.js", "config.js"]
  .map(f => fs.readFileSync(dir + "/game/" + f, "utf8")).join("\n");

// 1) cada ventana registrada tiene su función y su div
const refs = [...ui.matchAll(/"(ov-[a-z0-9]+)":\s*\(\)\s*=>\s*(\w+)\(/g)];
let mal = 0;
refs.forEach(m => {
  const ov = m[1], fn = m[2];
  if (!new RegExp("function\\s+" + fn + "\\s*\\(").test(ui)) { console.log("FALTA la función", fn, "de", ov); mal++; }
  if (!html.includes('id="' + ov + '"')) { console.log("FALTA la ventana", ov); mal++; }
});
console.log(refs.length + " ventanas revisadas → " + (mal ? mal + " problemas" : "todas OK"));

// 2) funciones llamadas desde el juego que no existen en ningún archivo
const llamadas = new Set([...todo.matchAll(/typeof\s+(\w+)\s*===\s*"function"/g)].map(m => m[1]));
/* 20/8 — Y TAMBIÉN CUENTAN LOS PARÁMETROS. `puedeAccion(tipo, o, rotulo)` recibe una función y la
   comprueba con `typeof rotulo === "function"`: es correcto y este chequeo lo daba por inexistente
   porque solo buscaba declaraciones globales. Un aviso permanente por algo que está bien es un
   aviso que se deja de leer, y hoy ya nos costó caro dos veces. */
const params = new Set();
[...todo.matchAll(/function\s+\w*\s*\(([^)]*)\)/g)].forEach(m =>
  m[1].split(",").forEach(x => { const n = x.trim().split(/[=\s]/)[0]; if (/^\w+$/.test(n)) params.add(n); }));
const faltan = [...llamadas].filter(f => !params.has(f) &&
  !new RegExp("function\\s+" + f + "\\s*\\(|var\\s+" + f + "\\s*=|window\\." + f + "\\s*=").test(todo));
console.log("funciones referenciadas que no existen:", faltan.length ? faltan.join(", ") : "ninguna");

// 3) ids usados con $("...") en ui.js que no están en el html
const ids = new Set([...ui.matchAll(/\$\("([a-z0-9-]+)"\)/g)].map(m => m[1]));
const sinDiv = [...ids].filter(id => !html.includes('id="' + id + '"'));
console.log("ids del código que no están en el HTML:", sinDiv.length ? sinDiv.join(", ") : "ninguno");
