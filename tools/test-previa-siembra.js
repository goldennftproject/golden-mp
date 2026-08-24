/* LA VISTA PREVIA DE SIEMBRA (24/8, dirección)
   « Agregar la función de señalar la parcela y que muestre que se quiere sembrar. »
   Al apuntar una parcela SECA aparece encima el cultivo seleccionado en fantasma — el mismo
   sprite que tendrá cuando esté listo. El cartel ya decía "Plantar Papa"; esto lo hace VER.
   Este test lee el código (la escena necesita Phaser) y comprueba el CONTRATO:
     · solo sale en parcelas SECAS — no sobre una que crece, una lista o una bloqueada;
     · usa el sprite REAL del cultivo (cropg_*), con el emoji como respaldo;
     · es un solo objeto reutilizado, no uno por frame;
     · y tiene caché: si el cursor no se mueve, no se toca nada;
     · se apaga al dejar de apuntar (no quedan fantasmas por la granja).
     node tools/test-previa-siembra.js                                                         */
const fs = require("fs");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const i = FARM.indexOf("previaSiembra(hit) {");
const cuerpo = i < 0 ? "" : FARM.slice(i, i + 2200);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA PREVIA EXISTE Y LA LLAMA EL HOVER");
{
  ok("previaSiembra está en la escena", i > 0);
  ok("y la llama el cartel del cursor (updatePrompt)", /this\.previaSiembra\(hit\)/.test(FARM));
}

console.log("\nSOLO EN PARCELAS SECAS, Y CON LA SEMILLA ELEGIDA");
{
  ok("exige que sea una parcela", /hit\.type === "plot"/.test(cuerpo));
  ok("y que esté SECA (ni creciendo, ni lista, ni bloqueada)", /hit\.state === "dry"/.test(cuerpo));
  ok("muestra la semilla seleccionada", /G\.selSeed/.test(cuerpo));
  ok("y sale sola si no hay cultivo válido", /CROP_DEF\[ck\]/.test(cuerpo));
}

console.log("\nEL SPRITE REAL DEL CULTIVO, CON EL EMOJI DE RESPALDO");
{
  ok("usa la textura del cultivo listo (cropg_*)", /"cropg_" \+ ck/.test(cuerpo));
  ok("comprueba que exista antes de usarla", /textures\.exists\(key\)/.test(cuerpo));
  ok("y si no hay arte, cae al emoji (como la parcela de verdad)", /cd\.emoji/.test(cuerpo));
  ok("se ve como fantasma, no como cultivo real", /setAlpha\(0\.\d/.test(cuerpo));
}

console.log("\nBARATA: UN SOLO OBJETO, Y CON CACHÉ");
{
  ok("reutiliza un único sprite", /if \(!this\.previaSpr\)/.test(cuerpo));
  ok("y un único texto de respaldo", /if \(!this\.previaEmo\)/.test(cuerpo));
  ok("con firma: si nada cambió, ni un draw call", /_previaFirma/.test(cuerpo) && /return;/.test(cuerpo));
  ok("la firma mira la parcela Y la semilla", /hit\.cx/.test(cuerpo) && /\+ ck/.test(cuerpo));
}

console.log("\nY SE APAGA AL DEJAR DE APUNTAR");
{
  ok("sin parcela debajo, el fantasma se esconde",
    /if \(!firma\)[\s\S]{0,200}setVisible\(false\)/.test(cuerpo));
  ok("los dos (sprite y emoji)", (cuerpo.match(/setVisible\(false\)/g) || []).length >= 3);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la parcela dice qué va a crecer antes de plantarlo.\n");
process.exit(fallos ? 1 : 0);
