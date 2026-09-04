/* EL RELOJITO DE CARGAS VIVE SOBRE EL SPRITE                              (2/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « El número con el relojito por encima del sprite que vas a talar o tocar — que sea parte
   del juego ». La primera versión puso el ⏱ en el cartel de abajo y dirección no lo encontró:
   el dato del nodo vive sobre el nodo. Este archivo custodia la letra: existe cargasBadge(),
   los DOS caminos del cartel la llaman (granja de un clic y modo caminado), se apaga cuando
   no aplica, y el cartel de abajo volvió a describir la acción completa.
     node tools/test-cargas-sobre-el-sprite.js                                              */
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
const SIN = FARM.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

console.log("\nLA CHAPITA EN EL MUNDO");
{
  ok("existe cargasBadge() y pinta ⏱ + número sobre el nodo", /cargasBadge\(o\) \{/.test(SIN) && /setText\("⏱ " \+ n\)\.setPosition\(o\.cx, this\.topY\(o, 4\)\)/.test(SIN));
  ok("la llama la granja de un clic (el nodo bajo el cursor)", /this\.previaSiembra\(hit\);\s*\n\s*this\.cargasBadge\(hit\);/.test(SIN));
  ok("y el modo caminado (el nodo más cercano)", /this\.cargasBadge\(o\);\s*\n\s*const t2 = o \? this\.promptText\(o\)/.test(SIN));
  ok("se apaga con la interfaz abierta, en acción o en edición", /el\.classList\.remove\("show"\); this\.cargasBadge\(null\); return;/.test(SIN));
  ok("y colocando un objeto", /this\.cargasBadge\(null\);\s*\n\s*const pt = this\.input\.activePointer;/.test(SIN));
  ok("el nodo agotado o bloqueado no muestra chapita (n = 0 la esconde)", /o\.readyAt && o\.readyAt > nowMs\(\)/.test(SIN) && /if \(!n\) \{ if \(this\._cargasTxt\) this\._cargasTxt\.setVisible\(false\); return; \}/.test(SIN));
}

console.log("\nY EL CARTEL DE ABAJO VOLVIÓ A DESCRIBIR");
{
  ok("el árbol dice acción, golpes, cargas y rinde", /"Talar madera" \+ gp\(GOLPES_TALAR\) \+ " · ⏱ " \+ nC/.test(SIN));
  ok("la roca también", /"Picar piedra" \+ gp\(GOLPES_MINAR\) \+ " · ⏱ " \+ nC/.test(SIN));
  ok("y la veta con su mineral", /"Minar " \+ od\.label \+ gp\(GOLPES_MINAR\) \+ " · ⏱ " \+ nC/.test(SIN));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el relojito vive donde vive el árbol.\n");
process.exit(fallos ? 1 : 0);
