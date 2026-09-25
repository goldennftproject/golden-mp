/* EL ANIMAL QUE NO COME NO DA — LEY 4 (dirección, Discord 11/9 17:55)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Le da hambre cada 24h. Si tienes la comida se la das, sino triste. El animal no come y no
     da nada y sigue el CD de 24h. No come = *** »
   Lo que este archivo custodia:
     1 · comió este ciclo → su unidad entera; no comió → NADA;
     2 · una comida por ciclo: la segunda se rechaza, y la próxima vuelta vuelve a tener hambre;
     3 · el reloj de 24 h no se detiene ni se reinicia por no comer;
     4 · no quedan decimales: ni rinde fraccionario ni « guardado » en partidas nuevas;
     5 · la migración (ley 1): la fracción que un guardado viejo llevaba se redondea a 1, una vez;
     6 · el panel dice « comió ✓ / con hambre » y qué va a dar.
     node tools/test-establo-hambre.js                                                            */
const path = require("path"), vm = require("vm"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const H = 3600000; let reloj = 1_800_000_000_000;
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {}; ctx.nowMs = () => reloj;
vm.runInContext("nowMs = window.nowMs; toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);
["refreshHud", "refreshInv", "establoRepintar", "saveFarm", "statAdd", "bagFull"].forEach(f => { ctx[f] = () => {}; vm.runInContext(f + " = window." + f, ctx); });
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const D = g("ANIMAL_DEF.alpaca"), CICLO = D.cicloH * H;

function alpacaNueva() {
  G.animals = { alpaca: [{ feliz: 0, prodAt: reloj, comidoAt: 0, pend: 0, desde: reloj }] };
  G.res.trigo = 10; G.res.fibra = 0; G.establoV = 1;
}

console.log("\n1 · COMIÓ → SU UNIDAD; NO COMIÓ → NADA\n");
alpacaNueva();
ok("recién comprada tiene hambre", g("animalHambriento(G.animals.alpaca[0])"));
ok("y sin comer no va a dar nada", g("animalRinde('alpaca', 0)") === 0);
ok("le das de comer: gasta 1 trigo", g("alimentarUno('alpaca', 0, true)") === 1 && G.res.trigo === 9);
ok("ahora « comió este ciclo » y va a dar su unidad entera", g("animalComioEsteCiclo(G.animals.alpaca[0])") && g("animalRinde('alpaca', 0)") === D.porCiclo);
reloj += CICLO;
ok("al cumplir las 24 h, recoger da " + D.porCiclo + " de fibra", g("recogerUno('alpaca', 0, true)") === D.porCiclo && G.res.fibra === D.porCiclo);
ok("y vuelve a tener hambre", g("animalHambriento(G.animals.alpaca[0])"));
reloj += CICLO;
ok("sin comer, la vuelta siguiente da NADA", g("recogerUno('alpaca', 0, true)") === 0 && G.res.fibra === D.porCiclo);

console.log("\n2 · UNA COMIDA POR CICLO\n");
alpacaNueva();
g("alimentarUno('alpaca', 0, true)");
ok("la segunda comida del mismo ciclo se rechaza y no gasta trigo", g("alimentarUno('alpaca', 0, true)") === 0 && G.res.trigo === 9);
reloj += CICLO; g("recogerUno('alpaca', 0, true)");
ok("después de producir vuelve a aceptar comida", g("alimentarUno('alpaca', 0, true)") === 1 && G.res.trigo === 8);

console.log("\n3 · EL RELOJ ARRANCA AL COMER (25/9, diseñador)\n");
/* 11/9 decía « sigue el CD aunque no coma ». El 25/9 el diseñador lo cambió con el establo
   delante: « las 24 horas empiezan a correr justo después de alimentarlo; le acabo de dar
   comida y dice que en 6 h me da el material — no puede ser así ». Sin comer no hay reloj. */
alpacaNueva();
reloj += CICLO / 2;
ok("a las 12 h sin comer, el ciclo entero sigue por delante — sin comida no hay reloj", g("animalFaltaDe('alpaca', 0)") === CICLO);
reloj += CICLO / 2;
ok("a las 24 h sin comer NO está listo (no hay nada que cobrar)", g("animalFaltaDe('alpaca', 0)") === CICLO && g("animalListos('alpaca')") === 0);
g("alimentarUno('alpaca', 0, true)");
ok("comer ARRANCA el reloj: faltan 24 h justas", g("animalFaltaDe('alpaca', 0)") === CICLO);
reloj += CICLO - 60000;
ok("a un minuto del final todavía no", g("recogerUno('alpaca', 0, true)") === 0);
reloj += 60000;
ok("y 24 h después de la comida, da", g("recogerUno('alpaca', 0, true)") === D.porCiclo);

console.log("\n4 · SIN DECIMALES\n");
alpacaNueva();
ok("el rinde es entero: 0 o " + D.porCiclo, [0, D.porCiclo].includes(g("animalRinde('alpaca', 0)")));
g("alimentarUno('alpaca', 0, true)"); reloj += CICLO; g("recogerUno('alpaca', 0, true)");
ok("no queda nada « guardado » en el animal", g("animalGuardado('alpaca', 0)") === 0);
ok("FELIZ_MIN_PROD ya no entra en el rinde", !/FELIZ_MIN_PROD[^\n]*\n[^\n]*\n[^\n]*function animalRinde|function animalRinde[\s\S]{0,300}FELIZ_MIN_PROD/.test(fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")));

console.log("\n4b · EL COBRO SOLO SE OFRECE CUANDO ENTRA\n");
{
  alpacaNueva();
  g("alimentarUno('alpaca', 0, true)"); reloj += CICLO;   // lista y con +1 de fibra
  ctx.__roomAntes = g("roomForRes");
  vm.runInContext("roomForRes = () => false;", ctx);      // bolsa llena, sin fabricar 35 pilas en el arnés
  ok("si la fibra no entra, el animal listo no ofrece recoger", !g("animalPuedeRecoger('alpaca', 0)"));
  ok("y el atajo del Establo también se apaga", !g("establoPuedeRecogerAlgo()"));
  G.animals.alpaca[0].comidoAt = 0;                        // 25/9: sin comer no hay ciclo que cerrar
  ok("sin comer no hay nada que recoger: el ciclo arranca con la comida", !g("animalPuedeRecoger('alpaca', 0)"));
  G.animals.alpaca[0].prodAt = reloj;                       // vuelve a faltar un ciclo entero
  ok("antes de estar listo, tampoco se ofrece", !g("animalPuedeRecoger('alpaca', 0)"));
  vm.runInContext("roomForRes = window.__roomAntes;", ctx);
}

console.log("\n5 · LA MIGRACIÓN (ley 1): la fracción vieja se redondea a favor del jugador, una vez\n");
{
  const save = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8");
  ok("el guardado lleva la marca establoV", "establoV" in g("snapshot()"));
  ok("sin marca, todo pend entre 0 y 1 pasa a 1", /if \(!d\.establoV\)[\s\S]{0,400}a\.pend > 0 && a\.pend < 1\) a\.pend = 1;/.test(save));
  alpacaNueva(); G.animals.alpaca[0].pend = 1;   // lo que la migración deja
  g("alimentarUno('alpaca', 0, true)"); reloj += CICLO;
  ok("y esa unidad cae junto con la del ciclo: +2", g("recogerUno('alpaca', 0, true)") === 2);
}

console.log("\n6 · EL PANEL LO DICE\n");
{
  const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("« comió ✓ » o « con hambre » en la fila del animal", /'comió ✓' : 'con hambre'/.test(ui));
  ok("y sin comer dice que el reloj arranca con la comida (25/9)", /arrancan cuando coma/.test(ui));
  ok("el botón dice « Ya comió » cuando ya comió", /'Ya comió' : 'Alimentar'/.test(ui));
  ok("la fila y el atajo consultan si la producción cabe antes de habilitarse", /animalPuedeRecoger\(k, i\)/.test(ui) && /establoPuedeRecogerAlgo/.test(ui));
  ok("ya no hay « guardado de 1 » ni « rendirá 0,5 »", !/guardado de 1|rendirá/.test(ui));
  ok("la ley está escrita en docs/LEYES.md con la cita", /Ley 4 — El animal que no come no da[\s\S]*Le da hambre cada 24h/.test(fs.readFileSync(path.join(RAIZ, "docs/LEYES.md"), "utf8")));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
