/* EL HUD DEL MVP NO MUESTRA LO QUE NO DICE NADA        (19/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Quitemos las cosas que no tienen utilidad en la interfaz y listo ».

   Tres píldoras del HUD no le cuentan nada a nadie entre nivel 1 y 12, que es donde vive el
   MVP: Jugadores en línea (con dos personas probando dice 1 o 2, y a un jugador nuevo le avisa
   que está solo), Prestigio (solo sube al llegar a granja 25 y reiniciar: en el playtest no se
   mueve del 0) y Semana (cuenta semanas desde que empezaste y no afecta a nada).

   Se ESCONDEN con GF.MVP, igual que el Pase y el Clan — no se borran. Lo que custodia este
   archivo es exactamente eso: que sigan existiendo, que refreshHud las siga rellenando (para
   que al volver no aparezcan con datos viejos), y que con la bandera apagada vuelvan solas. Lo
   que dirección dijo que SE QUEDA (chat, logo, $Golden) también se custodia, porque « quitar lo
   inútil » es una frase que crece sola si nadie la frena.
     node tools/test-hud-mvp.js                                                                */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const CONF = fs.readFileSync(path.join(RAIZ, "public/game/config.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const pill = (id) => (HTML.match(new RegExp('<div class="pill[^>]*>(?:(?!</div>).)*id="' + id + '"', "s")) || [])[0] || "";

console.log("\n1 · LAS TRES QUE SE VAN ESTÁN MARCADAS, NO BORRADAS\n");
{
  for (const [id, nombre] of [["s-online", "Jugadores en línea"], ["s-prestige", "Prestigio"], ["s-week", "Semana"]]) {
    const p = pill(id);
    ok(nombre + " sigue en el HTML (se esconde, no se borra)", !!p);
    ok("  y lleva la marca data-mvp-hud", /data-mvp-hud/.test(p));
  }
  ok("son exactamente tres", (HTML.match(/data-mvp-hud/g) || []).length === 3, (HTML.match(/data-mvp-hud/g) || []).length);
}

console.log("\n2 · SE ESCONDEN SOLO CON LA BANDERA DEL MVP\n");
{
  ok("(arnés) GF.MVP existe y está puesta", /GF\.MVP = 1;/.test(CONF));
  ok("el escondite pregunta por GF.MVP", /if \(typeof GF !== "undefined" && GF\.MVP\)\s*\n?\s*document\.querySelectorAll\("\[data-mvp-hud\]"\)/.test(UI));
  ok("y lo hace por la marca, no por una lista escrita en ui.js (la lista vive al lado de la píldora)",
    /querySelectorAll\("\[data-mvp-hud\]"\)\.forEach\(el => \{ el\.style\.display = "none"; \}\)/.test(UI));
  /* refreshHud las sigue rellenando: si dejaran de actualizarse, al apagar la bandera volverían
     con datos viejos */
  ok("refreshHud las sigue rellenando aunque estén escondidas",
    /setTxt\("s-prestige"/.test(UI) && /setTxt\("s-week"/.test(UI));
}

console.log("\n3 · LO QUE DIRECCIÓN DIJO QUE SE QUEDA, SE QUEDA\n");
{
  ok("la pestaña Chat sigue (« sí funciona »)", /data-tab="chat"/.test(HTML) && !/data-tab="chat"[^>]*data-mvp-hud/.test(HTML));
  ok("el logo GOLDEN FARM del HUD sigue (« está bien que esté ahí »)",
    /<div class="brand"[^>]*><h1>GOLDEN FARM<\/h1>/.test(HTML) && !/class="brand"[^>]*data-mvp-hud/.test(HTML));
  ok("la píldora de $Golden sigue", !!pill("s-golden") && !/data-mvp-hud/.test(pill("s-golden")));
  ok("y las de plata, vida, granja y combate ni se tocaron",
    ["s-plata", "s-hp", "s-level", "c-lvl"].every(id => !!pill(id) && !/data-mvp-hud/.test(pill(id))));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
