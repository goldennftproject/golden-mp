/* EL BOTÓN 🧪 DE PRUEBAS MURIÓ (14/9) — y este archivo custodia que no vuelva
   Vivió del 21/8 al 14/9: con ?test en la URL regalaba recursos, plata y +5 niveles. El día que
   el portero salió de modo sombra (docs/PORTERO-GUARDADO.md lo anunciaba: « ese día el botón 🧪
   muere ») pasó a ser una trampa: regalarse recursos es exactamente lo que el portero rechaza, y
   quien lo tocaba se quedaba con un guardado rechazado para siempre. Medido en vivo el 14/9 en el
   proyecto nuevo: 422 tras 422, y el camino viejo cerrado (403).
   Lo que se custodia ahora:
     · no hay botón en el HTML ni código que lo destape, con o sin ?test;
     · el cliente entiende el 422 del portero: no cae al camino viejo, vuelve a la última granja
       aceptada y lo dice (porteroRechazo);
     · el index.ts versionado dice lo mismo que corre: MODO = "rechazo".
     node tools/test-boton-pruebas.js                                                             */
const fs = require("fs");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const HTML = fs.readFileSync("public/index.html", "utf8"), UI = fs.readFileSync("public/game/ui.js", "utf8");
const SAVE = fs.readFileSync("public/game/save.js", "utf8"), FN = fs.readFileSync("supabase/functions/guardar/index.ts", "utf8");

console.log("\nEL BOTÓN NO EXISTE");
ok("no hay btn-test-kit en el HTML", !/btn-test-kit/.test(HTML));
ok("ni código que lo destape con ?test", !/btn-test-kit|Kit de PRUEBAS/.test(UI));
ok("y el obituario está escrito donde estaba el botón", /EL BOTÓN 🧪 MURIÓ/.test(UI));

console.log("\nEL CLIENTE ENTIENDE QUE EL PORTERO DIJO QUE NO");
ok("un 422 del portero no cae al camino viejo: llama a porteroRechazo y sale", /if \(st === 422\) \{[\s\S]*?await porteroRechazo\(det\);\s*return;/.test(SAVE));
ok("porteroRechazo recarga la granja aceptada y pisa la copia local con ella",
  /async function porteroRechazo[\s\S]*?from\("farms"\)\.select\("data,name"\)[\s\S]*?hydrate\(data\.data\);[\s\S]{0,200}copiaGuardar\(snapshot\(\)\);[\s\S]{0,200}lastSavedKey = snapKey\(\);/.test(SAVE));
ok("y se lo dice al jugador con las sospechas por su nombre", /El servidor rechazó el guardado[\s\S]*?Se volvió a la última granja aceptada/.test(SAVE));
ok("el indicador de guardado tiene su estado « Rechazado »", /function showSaveError\(\)[\s\S]{0,400}?Rechazado/.test(UI));

console.log("\nLO VERSIONADO DICE LO QUE CORRE");
ok('index.ts: MODO = "rechazo"', /const MODO = "rechazo";/.test(FN));
ok("y la regla del 422 sigue ahí", /MODO === "rechazo" && sospechas\.length\) return json\(\{ error: "guardado rechazado", sospechas \}, 422\)/.test(FN));

console.log("\n" + (fallos ? fallos + " fallo(s)" : "Todo en orden: el botón murió y el portero manda.") + "\n");
process.exit(fallos ? 1 : 0);
