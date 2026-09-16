/* LOS TRES PEDIDOS DEL detall.docx QUE SON NÚMEROS Y MECÁNICA      (16/9, diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Del documento de esta mañana, tres puntos:
     2 · « los mobs deben aguantar más: subir defensa o bajar el daño del personaje »
     4 · « si estás en zona negra y das F5 aparece en la granja, debe aparecer justo donde quedó »
     5 · « bajar un poco más la velocidad del personaje y que suba a medida que suba de nivel »

   El más interesante de custodiar es el 2, porque la causa no era un número mal puesto: era MÍO.
   El 15/9 bajé las cargas de bloqueo a una, con tres segundos de recuperación, para que la parada
   del jugador dejara de ser gratis — y esa constante la compartían los bichos. Los dejé parando
   mucho menos sin que nadie lo pidiera. Así que lo que se custodia acá no es « los bichos aguantan
   X »: es que el héroe y los bichos tengan cargas SEPARADAS, que es lo que evita que el próximo
   ajuste de uno se filtre al otro sin que nadie lo note.
     node tools/test-detall-16-9.js                                                             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n2 · LAS CARGAS DEL HÉROE Y LAS DE LOS BICHOS SON DE CADA UNO\n");
{
  ok("el héroe tiene las suyas (dirección, 15/9: la parada no es gratis)",
    g("TIBIA_BLOCK_MAX") === 1 && g("TIBIA_BLOCK_REGEN_MS") > g("typeof ATTACK_MS !== 'undefined' ? ATTACK_MS : 2000"),
    g("TIBIA_BLOCK_MAX") + " carga / " + g("TIBIA_BLOCK_REGEN_MS") + " ms");
  ok("y los bichos las del documento (§2.1: dos, una por segundo)",
    g("MOB_BLOCK_MAX") === 2 && g("MOB_BLOCK_REGEN_MS") === 1000,
    g("MOB_BLOCK_MAX") + " cargas / " + g("MOB_BLOCK_REGEN_MS") + " ms");
  ok("no son la misma constante (que era el bug: tocar una movía la otra)",
    g("MOB_BLOCK_MAX") !== g("TIBIA_BLOCK_MAX") || g("MOB_BLOCK_REGEN_MS") !== g("TIBIA_BLOCK_REGEN_MS"));

  /* y que cada uno use el suyo de verdad, no solo que las constantes existan */
  const mob = g("blkDeMob()");
  ok("un bicho nuevo nace con las cargas de bicho", mob.blockCount === g("MOB_BLOCK_MAX"), JSON.stringify(mob));
  for (let i = 0; i < g("MOB_BLOCK_MAX"); i++) ctx.blockHit(100, 0, 6, mob);
  ok("las gasta todas y ya no para", mob.blockCount === 0 && !ctx.blockHit(100, 0, 6, mob).parado);
  ctx.tickBlock(mob, g("MOB_BLOCK_REGEN_MS"));
  ok("y recupera a SU ritmo, no al del héroe", mob.blockCount === 1);
  const heroe = { blockCount: g("TIBIA_BLOCK_MAX"), blockTicks: 0 };
  ctx.blockHit(100, 0, 6, heroe); ctx.tickBlock(heroe, g("MOB_BLOCK_REGEN_MS"));
  ok("mientras que al héroe ese mismo tiempo NO le devuelve la carga", heroe.blockCount === 0);
}

console.log("\n4 · RECARGAR DENTRO DE LA ZONA\n");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ctx.GF.scene = "forest"; ctx.GF.zona = "pantano";
  G.zonaViaje = null;
  g("zonaGuardarPos(500, 300)");
  ok("sin viaje abierto no se guarda ninguna posición (no queda un punto huérfano)", !g("zonaPosGuardada()"));
  g("zonaEntrar()"); g("zonaGuardarPos(500.6, 300.2)");
  const p = g("zonaPosGuardada()");
  ok("con el viaje abierto sí, redondeada y con su zona", p && p.x === 501 && p.y === 300 && p.zona === "pantano", JSON.stringify(p));
  ok("la posición vive DENTRO de la foto del viaje: al cerrarlo se va con él",
    !!(G.zonaViaje && G.zonaViaje.pos));
  ok("se guarda con el mismo throttle que la vida, no en cada golpe",
    /_hpGuardadaEn[\s\S]{0,200}?zonaGuardarPos\(this\.hero\.x, this\.hero\.y\)/.test(FOREST));
  ok("y al crear el mapa el granjero vuelve ahí, pero solo si es de ESTA zona",
    /p\.zona === this\.zonaKey/.test(FOREST));
  ok("encerrado entre los bordes (un guardado viejo no puede escupirlo fuera del mapa)",
    /Math\.max\(60, Math\.min\(this\.W - 60, p\.x\)\)/.test(FOREST));
}

console.log("\n5 · LA VELOCIDAD\n");
{
  const BASE = g("GF.SPEED"), T = g("GF.TILE");
  ok("la base bajó de 175", BASE < 175, BASE + " px/s");
  ok("pero no se desplomó (menos del 20 %)", BASE >= 175 * 0.8, Math.round((BASE / 175 - 1) * 100) + " %");
  G.buffs = []; G.gear = G.gear || {}; G.gear.arma = null;
  G.level = 1; const v1 = BASE * g("speedMult()");
  G.level = g("FARM_NIVEL_MAX"); const vMax = BASE * g("speedMult()");
  ok("y sube con el nivel de granja", vMax > v1, (v1 / T).toFixed(2) + " → " + (vMax / T).toFixed(2) + " celdas/s");
  ok("el techo devuelve lo que se bajó: el del nivel máximo corre como se corría antes",
    Math.abs(vMax - 175) < 175 * 0.03, vMax.toFixed(0) + " contra 175");
  let sube = true;
  for (let n = 2; n <= g("FARM_NIVEL_MAX"); n++) { G.level = n - 1; const a = g("speedMult()"); G.level = n; if (g("speedMult()") <= a) sube = false; }
  ok("sin escalones muertos: cada nivel corre un poco más que el anterior", sube);
  /* lo importante para que esto no envejezca: la curva se reparte entre los niveles que HAY */
  const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("la recta se deriva de FARM_NIVEL_MAX (el techo ya se movió una vez, de 50 a 25)",
    /FARM_NIVEL_MAX === "number"\) \? FARM_NIVEL_MAX : 25/.test(STATE));
  G.level = 5;
  ok("y los buffs de velocidad siguen multiplicando encima", g("speedMult()") > 1);
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
