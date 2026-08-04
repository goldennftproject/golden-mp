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
const todo = ui + state + save + fs.readFileSync(dir + "/game/farm.js", "utf8") + fs.readFileSync(dir + "/game/forest.js", "utf8");

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
const faltan = [...llamadas].filter(f => !new RegExp("function\\s+" + f + "\\s*\\(|var\\s+" + f + "\\s*=|window\\." + f + "\\s*=").test(todo));
console.log("funciones referenciadas que no existen:", faltan.length ? faltan.join(", ") : "ninguna");

// 3) ids usados con $("...") en ui.js que no están en el html
const ids = new Set([...ui.matchAll(/\$\("([a-z0-9-]+)"\)/g)].map(m => m[1]));
const sinDiv = [...ids].filter(id => !html.includes('id="' + id + '"'));
console.log("ids del código que no están en el HTML:", sinDiv.length ? sinDiv.join(", ") : "ninguno");
