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
    setPosition() { return this; }, setSize() { return this; }, setVisible(v) { this.visible = v; return this; }, destroy() { this.muerto = true; } };
  const texto = { setOrigin() { return this; }, setDepth() { return this; }, setVisible(v) { this.visible = v; return this; },
    setPosition() { return this; }, setText(v) { this.texto = v; return this; } };
  Object.assign(esc, {
    hero: { x: 0, y: 0 },
    facing: "east", action: null, target: null, autoOn: false, nextAuto: 0,
    monsters: [],
    add: { rectangle: () => Object.create(rect), text: () => Object.create(texto) },
    tweens: { add: () => ({ stop() {} }) },
  });
  return esc;
}
function mob(x, y) {
  return { cx: x, by: y, dead: false, hp: 30, pagado: true,
    def: { label: "Rata", hp: 30 },
    spr: { visible: true, displayHeight: 20, getBounds: () => ({ centerX: x, centerY: y, width: 20, height: 20, top: y - 20 }) } };
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

console.log("\nEL PARPADEO OCULTA EL OBJETIVO ENTERO\n");
{
  const esc = escena(), m = mob(42, 60);
  esc.setTarget(m); esc.autoOn = true; esc.updateTargetFx();
  ok("con el mob visible, marco y nombre se muestran", esc.tgGlow.visible === true && esc.tgTxt.visible === true);

  m.spr.visible = false;
  esc.updateTargetFx();
  ok("si el sprite desaparece, no filtra su posición con marco, nombre ni vida", esc.tgGlow.visible === false && esc.tgTxt.visible === false);
  ok("la selección se conserva durante la ausencia", esc.target === m && esc.autoOn);

  m.spr.visible = true;
  esc.updateTargetFx();
  ok("cuando reaparece, el objetivo vuelve a dibujarse", esc.tgGlow.visible === true && esc.tgTxt.visible === true);
}

console.log("\nLA BARRA DEL DRAGÓN ES LA DEL ASALTO Y SIGUE AL JEFE\n");
{
  /* El HP local del Dragón se conserva lleno: su barra sale del asalto compartido. Si se deja
     pasar por drawBar() normal, ésta la limpia por verlo «sano» justo antes de renderizar. */
  const esc = escena(), trazos = [];
  const jefe = {
    cx: 180, by: 220, hp: 999, def: { label: "Dragón de las Cavernas", boss: true, hp: 999, hab: "dragon" },
    spr: { displayHeight: 52, height: 52 },
    bar: {
      clear() { trazos.push(["clear"]); return this; },
      fillStyle(color, alpha) { trazos.push(["style", color, alpha]); return this; },
      fillRect(x, y, w, h) { trazos.push(["rect", x, y, w, h]); return this; },
    },
  };
  esc._jefeHp = 60; esc._jefeMax = 100;
  esc.drawBar(jefe);
  ok("la barra compartida no se limpia por la vida local llena", trazos.some(t => t[0] === "style" && t[1] === 0xb44aff));
  const primerRelleno = trazos.filter(t => t[0] === "rect").at(-1);
  ok("la vida mostrada usa el porcentaje del asalto", !!primerRelleno && primerRelleno[3] === 36, JSON.stringify(primerRelleno));
  trazos.length = 0; jefe.by += 40; esc.drawBar(jefe);
  const rellenoMovido = trazos.filter(t => t[0] === "rect").at(-1);
  ok("al moverse el Dragón, la barra se redibuja en su nueva altura", !!rellenoMovido && rellenoMovido[2] > primerRelleno[2], JSON.stringify(rellenoMovido));

  /* La placa del objetivo es otra lectura de esa misma vida. Si dejara usar jefe.hp (900),
     el recuadro diría «900/900» mientras la barra violeta estuviera a 60/100. */
  jefe.spr.visible = true;
  jefe.spr.getBounds = () => ({ centerX: jefe.cx, centerY: jefe.by, width: 40, height: 52, top: jefe.by - 52 });
  jefe.dead = false;
  esc.setTarget(jefe); esc.updateTargetFx();
  ok("el objetivo del Dragón muestra la vida compartida, no su vida local llena", /60\/100/.test(esc.tgTxt.texto || ""), esc.tgTxt.texto || "");

  jefe.enraged = false; jefe.dmgMult = 1; esc._jefeHp = 20;
  esc.floatTxt = () => {};
  esc.mobAbility(jefe, 500, 1000, esc.hero);
  ok("la fase visual de furia usa el 25% del asalto aunque la vida local siga llena", jefe.enraged && jefe.dmgMult === 1.25);
}

console.log("\nLA PERSECUCIÓN   (Chase Opponent: el granjero camina solo hasta su distancia de arma)");
{
  const esc = escena(), m = mob(MELEE * 4, 0);
  esc.keys = { left: {}, right: {}, up: {}, down: {}, aleft: {}, aright: {}, aup: {}, adown: {} };
  esc.navOf = () => ({ lineFree: () => true, find: () => null });
  esc.setTarget(m); esc.autoOn = true;

  /* lejos y sin tocar nada: el granjero sale solo hacia el bicho */
  esc.autoChase(1000);
  ok("con el objetivo lejos, camina solo hacia él", !!esc.moveTarget,
    esc.moveTarget && "(" + esc.moveTarget.x + ", " + esc.moveTarget.y + ")");
  console.log("       → era la pieza de Tibia que faltaba: fijar un bicho lejano era mirar cómo");
  console.log("         no pasaba nada. El auto-ataque esperaba a que TE acercaras vos.");

  /* el bicho se corre un poco: no re-planifica cada cuadro */
  m.cx += 5;
  esc.autoChase(1100);
  ok("un pasito del bicho no re-planifica la ruta (A* con reloj, no por cuadro)",
    esc.moveTarget && esc.moveTarget.x === MELEE * 4, "el destino viejo sigue valiendo");

  /* llega a distancia: frena — no se encima con el bicho */
  esc.hero.x = m.cx - MELEE * 0.5;
  esc.autoChase(1500);
  ok("al llegar a distancia de espada, FRENA", !esc.moveTarget,
    "sin esto seguiría hasta encimarse con el bicho");

  /* el jugador toca una tecla: su movimiento manda */
  esc.hero.x = 0; esc.keys.left.isDown = true;
  esc.autoChase(2000);
  ok("si el jugador se mueve, su movimiento MANDA: la persecución no toca nada", !esc.moveTarget);
  esc.keys.left.isDown = false;
  esc.autoChase(2400);
  ok("y al soltar la tecla, retoma sola", !!esc.moveTarget, "el Auto Chase de Tibia");

  /* sin arma útil no se persigue: no habría golpe al llegar */
  const armaAntes = G.gear.arma; G.gear.arma = null;
  esc.moveTarget = null; esc._chaseTo = null; esc._chaseAt = 0;
  esc.autoChase(3000);
  ok("sin arma no persigue: no habría golpe al llegar", !esc.moveTarget);
  G.gear.arma = armaAntes;
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
    /if \(clicDerecho\)[\s\S]{0,220}setTarget\(hit\);\s*this\.autoOn = true/.test(codigo));
  ok("el derecho sigue llegando aunque Phaser tenga buttons atrasado",
    /const clicDerecho = pt\.rightButtonDown\(\) \|\| \(pt\.event &&[\s\S]{0,100}pt\.event\.button === 2/.test(codigo),
    "el evento nativo respalda rightButtonDown() en pointerdown");
  ok("y el derecho al VACÍO es la forma de soltar",
    /else if \(this\.target\) this\.clearTarget\(\)/.test(codigo),
    "antes no había ninguna: solo se podía cambiar de objetivo, nunca quedarse sin él");
  ok("el recuadro del objetivo es ROJO", /0xe23a2a/.test(src), "0xe23a2a, pulsando");
  ok("un sprite invisible oculta el marco y nombre sin soltar el objetivo",
    /if \(!s \|\| s\.visible === false\) \{[\s\S]{0,180}tgGlow\.setVisible\(false\)[\s\S]{0,180}tgTxt\.setVisible\(false\)/.test(src));
  ok("el Parpadeo no vuelve a mover ni a dibujar al dragón ausente",
    (src.match(/if \(m\.blinkUntil && t < m\.blinkUntil\) \{ if \(m\.bar\) m\.bar\.clear\(\); continue; \}/g) || []).length >= 2);
  ok("el arco muestra una flecha real durante el vuelo, no un texto vacío",
    /this\.add\.image\(sx, sy, "res_flecha"\)\.setDisplaySize\(20, 20\)\.setOrigin\(0\.5\)\.setDepth\(99999\)/.test(src) &&
    !/this\.add\.text\(this\.hero\.x, this\.hero\.y - 22, ""/.test(src));
  ok("la flecha se orienta hacia el blanco en vez de viajar de costado",
    /a\.setRotation\(Math\.atan2\(ty - sy, tx - sx\) \+ Math\.PI \/ 4\)/.test(src));
  ok("al vencer al Dragón se retira también su barra y objetivo flotantes",
    /m\.dead = true; m\.spr\.setVisible\(false\); if \(m\.bar\) m\.bar\.clear\(\);\s*if \(this\.target === m\) this\.clearTarget\(\);/.test(src));
  ok("el Dragón también recibe el impacto visual del arma que lo golpeó",
    /if \(m\.def\.boss\) \{ this\.weaponFx\(m, tipoFx, crit\); this\.pegarleAlJefe\(m, dmg\); return; \}/.test(src),
    "la vida compartida no convierte el golpe local en magia");
  /* 8/9 (Suren, en vivo) — el cartel « Necesitás un arma equipada » MENTÍA cuando llevabas el
     arco puesto y las flechas en la granja, así que se partió en dos preguntas: hasWeapon dice si
     llevás arma y porQueNoAtaca contesta por qué no podés atacar AHORA, con el remedio. Lo que
     este test cuida sigue siendo lo mismo —que sin poder atacar no se fije objetivo— pero ahora
     se comprueba contra la puerta, no contra una frase que ya no siempre es cierta. */
  ok("y si no podés atacar no se fija nada, con el motivo exacto",
    /porQueNoAtaca\(\)/.test(src) && /const no = this\.porQueNoAtaca\(\); if \(no\) \{ toast\(no\); return; \}/.test(src));
}

console.log("\nEL CARTEL DE COMBATE NO PROMETE UNA TECLA QUE NO SIRVE");
{
  const esc = escena(), rata = mob(30, 0);
  esc.monsters = [rata]; ctx.GF.uiOpen = false; ctx.GF.scene = "forest";
  const prompt = {
    textContent: "", clases: new Set(),
    classList: { add(c) { prompt.clases.add(c); }, remove(c) { prompt.clases.delete(c); } }
  };
  const cuerpo = { abierto: false, classList: { contains: c => c === "show" && cuerpo.abierto } };
  const getAntes = ctx.document.getElementById;
  ctx.document.getElementById = id => id === "prompt" ? prompt : (id === "cuerpo-panel" ? cuerpo : getAntes(id));

  const puertaAntes = esc.porQueNoAtaca;
  esc.porQueNoAtaca = () => "Sin flechas en el contenedor — las que dejaste en la granja no cuentan acá";
  esc.updatePrompt();
  ok("si atacar está bloqueado, el cartel muestra el motivo exacto", prompt.textContent === "Sin flechas en el contenedor — las que dejaste en la granja no cuentan acá" && prompt.clases.has("show"), prompt.textContent);
  ok("y no ofrece [E] para una acción que va a rechazar", !/\[E\]/.test(prompt.textContent), prompt.textContent);

  esc.porQueNoAtaca = () => null;
  esc.updatePrompt();
  ok("con un arma útil, el CTA de ataque se conserva", /Atacar Rata \(30 de vida\) · \[E\]/.test(prompt.textContent), prompt.textContent);

  const jefe = mob(30, 0);
  jefe.hp = 900; jefe.def = { label: "Dragón de las Cavernas", hp: 900, boss: true };
  esc.monsters = [jefe]; esc._jefeHp = 60; esc._jefeMax = 100;
  esc.updatePrompt();
  ok("el CTA del Dragón aclara que su vida visible es la del asalto", /Atacar Dragón de las Cavernas \(60 de vida del asalto\) · \[E\]/.test(prompt.textContent), prompt.textContent);

  /* Las ventanas normales de escritorio dejan el mundo vivo, pero el aviso contextual no debe
     quedar escrito debajo de ellas. En la granja esta puerta ya existía; la Zona necesitaba la
     misma regla para que el CTA no parezca una acción disponible a través de un panel. */
  const queryAntes = ctx.document.querySelector;
  ctx.document.querySelector = sel => sel === ".ov.show" ? {} : queryAntes(sel);
  esc.updatePrompt();
  ok("una ventana normal de PC oculta el CTA de combate que quedaría detrás", !prompt.clases.has("show"));
  ctx.document.querySelector = queryAntes;

  cuerpo.abierto = true;
  esc.updatePrompt();
  ok("el panel de cadáver del PC también oculta el CTA de la misma franja", !prompt.clases.has("show"));

  esc.porQueNoAtaca = puertaAntes;
  ctx.document.getElementById = getAntes;
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el objetivo todavía se pierde por el camino"
  : "  Todo en orden: el bicho marcado aguanta hasta que muera, o hasta que lo sueltes vos.");
process.exit(fallos ? 1 : 0);
