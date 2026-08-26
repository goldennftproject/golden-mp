/* EL PANEL DE OBJETIVOS CONTESTA LAS DOS PREGUNTAS (26/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección preguntó « ¿lo ves como un juego ya a lanzar? ». La respuesta honesta era que
   faltaba lo que convierte una lista de sistemas en un juego: que el jugador pueda contestar
   dos preguntas sin ayuda de nadie.

       ¿A QUÉ ESTOY JUGANDO?   → el camino a la Guarida (las 10 cartas + el asalto de clan)
       ¿QUÉ HAGO HOY?          → la meta de esta semana (el pedido semanal, que YA existía)

   La segunda es la que más enseña de este proyecto: `pedSemanal` estaba en el juego desde hace
   semanas, escondido como una línea entre seis dentro del tablón. No hizo falta un sistema
   nuevo — hizo falta darle una cara. Lo que ya funciona y nadie ve vale lo mismo que lo que no
   existe, y sale mucho más barato de arreglar.

   Este archivo clava las dos funciones que dan de comer al panel, y clava que el panel PINTA
   (que es distinto de que las funciones devuelvan bien: se puede tener el dato y no mostrarlo,
   que es exactamente el bug que estamos cerrando).
     node tools/test-el-camino.js                                                                */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const CARTAS = g("CARTAS_ABUELO");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function granja(nv, leidas) {
  G.level = nv;
  G.buzonLeidas = {}; (leidas || []).forEach(k => { G.buzonLeidas["abuelo" + k] = 1; });
  G.clan = null;
}

console.log("\n¿A QUÉ ESTOY JUGANDO?   — el camino tiene principio, medio y final");
{
  granja(1);
  const c = ctx.caminoGuarida();
  ok("son las diez cartas más la Guarida", c.total === CARTAS.length + 1, c.total + "");
  ok("el último hito es bajar a la Guarida", c.hitos[c.hitos.length - 1].clan === true);
  ok("a granja 1 no hay ninguno alcanzado", c.alcanzados === 0, c.alcanzados + "");
  ok("y el próximo es el primero", c.proximo && c.proximo.nivel === CARTAS[0].nivel);
  ok("el camino está en el ORDEN de la biblia",
    c.hitos.slice(0, 10).map(h => h.nivel).join(",") === CARTAS.map(x => x.nivel).join(","));
}

console.log("\nEL CAMINO AVANZA CON LA GRANJA, NO CON EL RELOJ");
{
  granja(9);
  const c = ctx.caminoGuarida();
  ok("a granja 9 hay cinco hitos alcanzados", c.alcanzados === 5, c.alcanzados + "");
  ok("y el próximo es « No todos son monstruos » (granja 10)",
    c.proximo && c.proximo.titulo === "No todos son monstruos", c.proximo && c.proximo.titulo);
  /* el hito se marca por NIVEL, no por leer la carta: el jugador que no abre el buzón igual
     avanzó. Marcarlo por lectura castigaría al que juega y no lee, que es la mayoría. */
  ok("un hito alcanzado cuenta aunque la carta esté sin abrir", c.hitos[0].hecho && !c.hitos[0].leida);
  granja(9, [1, 2]);
  ok("y el panel sabe cuáles ya leyó, para poder distinguirlas", ctx.caminoGuarida().hitos[0].leida === true);
}

console.log("\nEL FINAL NO SE ALCANZA SOLO   — hace falta un clan, y el panel lo dice");
{
  granja(20);
  const c = ctx.caminoGuarida();
  ok("a granja 20 las diez cartas están, pero el camino NO está completo",
    c.alcanzados === 10 && c.alcanzados < c.total, c.alcanzados + "/" + c.total);
  ok("el próximo (y único) pendiente es la Guarida", c.proximo && c.proximo.clan === true);
  ok("y sin clan, explica qué falta", /clan de \d/.test(c.proximo.nota), c.proximo.nota);
  G.clan = { codigo: "ABCDEF" };
  const c2 = ctx.caminoGuarida();
  ok("con clan, el mensaje cambia", c2.enClan === true && /asalto/.test(c2.proximo.nota), c2.proximo.nota);
}

console.log("\n¿QUÉ HAGO HOY?   — la meta de la semana, que ya existía y no se veía");
{
  granja(9); G.skills = { farming: 9000, fishing: 0 };
  const m = ctx.metaSemana();
  ok("hay una meta semanal", !!m);
  ok("pide algo concreto y con nombre", m && m.pide > 0 && !!m.label, m && (m.pide + " × " + m.label));
  ok("dice cuánto falta", m && m.falta === Math.max(0, m.pide - m.tengo), m && (m.tengo + "/" + m.pide));
  ok("el porcentaje va de 0 a 1", m && m.pct >= 0 && m.pct <= 1, m && m.pct.toFixed(2));
  ok("y dice cuánto queda de plazo", m && m.cierra > 0 && m.cierra <= 7 * 24 * 3600e3,
    m && (Math.round(m.cierra / 3600e3) + " h"));
  /* la semana cierra el mismo día para todos: el pedido semanal es un ritmo compartido, no un
     temporizador personal que arranca cuando cada uno entra. */
  ok("el plazo nunca pasa de una semana", m && m.cierra <= 7 * 24 * 3600e3);
}

console.log("\nLA META TERMINADA SE VE TERMINADA");
{
  granja(9);
  const e = ctx.pedidosEstado(); e.pedSemanal.hecho = true;
  const m = ctx.metaSemana();
  ok("una meta cumplida marca hecho", m && m.hecho === true);
  ok("y su barra llega al 100%", m && m.pct === 1, m && m.pct + "");
  e.pedSemanal.hecho = false;
}

console.log("\nY TODO ESO LLEGA A LA PANTALLA   (tener el dato no es mostrarlo)");
{
  granja(9, [1, 2, 3]); G.skills = { farming: 9000, fishing: 0 };
  const box = ctx.document.getElementById("objetivos-list");
  box.innerHTML = "";
  ctx.refreshObjetivos();
  const html = box.innerHTML || "";
  const txt = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  ok("el panel pinta algo", html.length > 500, html.length + " caracteres");
  ok("con la capa de ESTA SEMANA", /semana/i.test(txt));
  ok("con la capa del CAMINO", /Guarida/.test(txt));
  ok("y con la GUÍA de siempre, que no se perdió", /gu[íi]a/i.test(txt));
  ok("nombra el próximo hito, que es lo único accionable del camino",
    txt.indexOf("No todos son monstruos") >= 0);
  ok("y muestra el progreso de la semana como fracción", /\d+\s*\/\s*\d+/.test(txt));
  /* EL DEFECTO QUE TUVO ESTE MISMO BLOQUE EL 26/8, y cómo se comprueba de verdad.
     Escribí un ternario mal armado —`'<div…>' + marca + " " + donde.padEnd ? … : ""`— donde la
     precedencia de operadores se tragaba el `<div>` de apertura. Pasaba `node --check` porque es
     sintaxis válida, y los once hitos salían pegados en un chorizo: « …esto✅ granja 3 · La cerca ».

     Mi primera versión de esta comprobación contaba `<div>` contra `</div>` y daba VERDE con el
     bug puesto: la línea rota no emite NINGUNA de las dos, así que el recuento queda parejo —
     49 y 49 en vez de 60 y 60. Un balance no detecta lo que falta entero por los dos lados.
     Lo comprobé restaurando el bug, que es la única forma de saber si un test sirve.

     Lo que sí lo caza: cada hito tiene que ser SU PROPIA FILA. */
  const c = ctx.caminoGuarida();
  const sueltos = c.hitos.filter(h => html.indexOf(h.titulo + "</div>") < 0);
  ok("cada hito del camino es una fila propia, no texto pegado al anterior",
    !sueltos.length, sueltos.map(h => h.titulo).join(" · "));
  /* …y contar filas a secas tampoco vale, por partida doble: `fds` la usan las tres capas, y
     la GUÍA marca sus pasos con los mismos tres símbolos. Contar en todo el panel daba « 15 ≥ 11 »
     con el bug puesto y « 16 ≠ 11 » con el arreglo: verde cuando estaba roto y rojo cuando estaba
     bien, que es peor que no medir. Hay que contar DENTRO de la sección del camino. */
  const ini = html.indexOf("El camino a la Guarida");
  const fin = html.indexOf("shophead", ini);
  const secc = html.slice(ini, fin > 0 ? fin : html.length);
  const conMarca = (secc.match(/<div class="fds"[^>]*>\s*(✅|▶️|⬜)/g) || []).length;
  ok("y hay exactamente una fila con marca por hito",
    conMarca === c.hitos.length, conMarca + " filas · " + c.hitos.length + " hitos");
  ok("con una sola marcada como « la que sigue »",
    (secc.match(/▶️/g) || []).length === 1, (secc.match(/▶️/g) || []).length + "");
}

console.log("\nEL MENÚ LO ANUNCIA   — un panel que no se anuncia es un panel que nadie abre");
{
  granja(9); G.skills = { farming: 9000, fishing: 0 };
  ctx.syncCaminoBadge();
  const b = ctx.document.getElementById("gm-cam");
  ok("el botón del menú existe", !!b);
  ok("y lleva el contador de la semana", b && /^\d+\/\d+$|^✓$/.test(b.textContent), b && JSON.stringify(b.textContent));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el jugador todavía no puede contestar a qué juega ni qué hace hoy"
  : "  Todo en orden: el juego dice a dónde va, y qué toca esta semana.");
process.exit(fallos ? 1 : 0);
