/* EL OBJETIVO FIJADO SOBREVIVE AL MOVIMIENTO                                           (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La dirección repasó el combate contra los vídeos de referencia (Tibia: el mob atacado lleva un
   marco rojo) y preguntó si ya estaba: « que se seleccione un bicho con el clic derecho, que
   quede marcado en rojo, que cada X tiempo el personaje ataque al seleccionado, poderse mover
   con el bicho seleccionado, y si está a distancia correcta hacerle daño igual ».

   Cuatro de las cinco estaban desde « detalles viernes » (8/8). La quinta no: el clic de caminar
   llamaba a clearTarget(), así que el gesto de ACERCARTE al bicho marcado te lo desmarcaba. Con
   teclado el objetivo sobrevivía y con clic no — dos reglas para el mismo jugador, y la rota era
   la del móvil, donde el clic es la única forma de moverse.

   Este archivo corre autoAttack() y el ciclo del objetivo con los métodos reales de ForestScene,
   y deja fijado con fuente el cableado del clic (los handlers viven dentro de create() y no se
   pueden llamar sueltos; lo que sí se puede es exigir que el clearTarget de caminar no vuelva).
     node tools/test-objetivo-fijado.js                                                          */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* una escena de cartón con lo justo: los métodos reales de ForestScene sobre un esqueleto que
   anota. El mob es un objeto con la forma que autoAttack y setTarget esperan. */
function escena() {
  const esc = Object.create(g("ForestScene").prototype);
  const rect = { setStrokeStyle() { return this; }, setFillStyle() { return this; }, setDepth() { return this; },
    setPosition() { return this; }, setSize() { return this; }, destroy() { this.muerto = true; } };
  Object.assign(esc, {
    hero: { x: 0, y: 0 },
    facing: "east", action: null, target: null, autoOn: false, nextAuto: 0,
    monsters: [],
    add: { rectangle: () => Object.create(rect), text: () => ({ setOrigin() { return this; }, setDepth() { return this; },
      setVisible() { return this; }, setPosition() { return this; }, setText() { return this; } }) },
    tweens: { add: () => ({ stop() {} }) },
  });
  return esc;
}
function mob(x, y) {
  return { cx: x, by: y, dead: false, hp: 30, pagado: true,
    def: { label: "Rata", hp: 30 },
    spr: { getBounds: () => ({ centerX: x, centerY: y, width: 20, height: 20, top: y - 20 }) } };
}
/* espada equipada: swordDmg > 0. Se apoya en el estado real. */
G.weapons = { espada_madera: { dur: 50 } }; G.gear = G.gear || {}; G.gear.arma = "espada_madera";
const MELEE = g("MELEE_RANGE"), CADA = g("ATTACK_MS");

console.log("\nEL CICLO DEL OBJETIVO   (con los métodos reales de la escena)");
{
  const esc = escena(), m = mob(30, 0);
  esc.setTarget(m); esc.autoOn = true;
  ok("fijar el objetivo lo marca con el recuadro rojo", !!esc.tgGlow);
  ok("y golpea YA: el primer golpe no espera la cadencia", esc.nextAuto === 0);

  /* a distancia: pega y arma la cadencia */
  esc.autoAttack(1000);
  ok("a distancia de espada, ataca solo", !!esc.action && esc.action.kind === "attack");
  ok("y la cadencia queda armada (" + (CADA / 1000) + " s)", esc.nextAuto > 1000);
  const proxima = esc.nextAuto;

  /* el golpe en curso termina; ANTES de la cadencia no repite */
  esc.action = null;
  esc.autoAttack(proxima - 200);
  ok("antes de la cadencia no repite el golpe", !esc.action);

  /* EL JUGADOR SE ALEJA — el objetivo tiene que aguantar */
  esc.hero.x = MELEE * 3;
  esc.autoAttack(proxima + 100);
  ok("lejos, el ataque espera SIN soltar el objetivo", !esc.action && esc.target === m && esc.autoOn);
  console.log("       → « poderse mover con el bicho seleccionado ». La mitad de esto ya estaba:");
  console.log("         autoAttack siempre midió la distancia en cada tick. Lo roto era el clic.");

  /* Y VUELVE A ACERCARSE: retoma solo, sin volver a marcar */
  esc.hero.x = MELEE - 5;
  esc.autoAttack(proxima + 200);
  ok("de vuelta a distancia, retoma el ataque él solo", !!esc.action && esc.action.m === m);

  /* el bicho muere: todo se limpia */
  esc.action = null; m.dead = true;
  esc.updateTargetFx();
  ok("muerto el bicho, la marca y el auto-ataque se apagan", !esc.target && !esc.autoOn);
}

console.log("\nEL CABLEADO DEL CLIC   (fijado con fuente: los handlers viven dentro de create)");
{
  const src = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  const codigo = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  /* la línea que rompía la promesa: clearTarget pegado al goTo del clic de caminar */
  ok("caminar ya NO suelta el objetivo",
    !/clearTarget\(\);\s*this\.goTo\(/.test(codigo),
    "el clic de acercarte al bicho marcado te lo desmarcaba");
  ok("el clic derecho sobre un bicho fija y enciende el auto-ataque",
    /rightButtonDown\(\)[\s\S]{0,220}setTarget\(hit\);\s*this\.autoOn = true/.test(codigo));
  ok("y el derecho al VACÍO es la forma de soltar",
    /else if \(this\.target\) this\.clearTarget\(\)/.test(codigo),
    "antes no había ninguna: solo se podía cambiar de objetivo, nunca quedarse sin él");
  ok("el recuadro del objetivo es ROJO", /0xe23a2a/.test(src), "0xe23a2a, pulsando");
  ok("y sin arma no se fija nada — el aviso ya existía",
    /Necesitás un arma equipada/.test(src));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el objetivo todavía se pierde por el camino"
  : "  Todo en orden: el bicho marcado aguanta hasta que muera, o hasta que lo sueltes vos.");
process.exit(fallos ? 1 : 0);
