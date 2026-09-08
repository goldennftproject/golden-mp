/* SIMULADOR DE PROGRESIÓN de Golden Farm (14/8)
   Juega 30 días como 3 perfiles de jugador con los NÚMEROS REALES del código y reporta
   el día/hora en que cada uno alcanza cada hito. Para calibrar el ritmo del juego:
   ni terminarse en un rato, ni hacerse pantano. Correr con:  node tools/sim-progresion.js

   MODELO (simplificaciones asumidas):
   - El jugador riega/cosecha TODO lo listo en cada sesión y replanta el mejor cultivo
     que puede pagar (limitado por cupo diario de semillas y parcelas del nivel).
   - Tala/pica hasta agotar nodos disponibles en la sesión (CD corto las primeras 10 por
     nodo, largo después; compra herramientas si la plata alcanza).
   - Construye cada edificio apenas puede (plano por nivel + materiales + depósito).
   - Cultivo (skill) se aproxima con la MISMA XP de farmeo sobre la curva de skills.
   - No modela: combate, pesca, animales, pase, cofre diario (suman por encima de esto).
*/

/* ═══ LOS NÚMEROS SALEN DEL JUEGO, NO DE UNA COPIA ═══ (8/9)
   Acá arriba decía « números del código (copiar de state.js si cambian) ». Ese comentario ERA el
   fallo: una herramienta que le pide a un humano mantenerla al día se desincroniza, y lo hace en
   silencio. Cuando la miré hoy tenía los relojes de 90 y 120 minutos —los de ANTES del 18/8—, un
   cupo de semillas de « 18 + 2×nivel » cuando el juego usa 40 por parcela, y otra curva de XP de
   oficios. O sea que llevaba tres semanas simulando un juego que ya no existe.
   Y no era inofensivo: de acá salió « casual, medio y hardcore terminan los 30 días los tres en
   nivel 12 », que reporté a dirección como el hallazgo más grave de la auditoría. Era falso.
   Ahora lee state.js. Si mañana cambia un reloj, este simulador cambia con él. */
const path = require("path"), vm = require("vm"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};

const CROP_DEF = g("CROP_DEF"), CROP_ORDER = g("CROP_ORDER");
const CROPS = CROP_ORDER.map(k => {
  const c = CROP_DEF[k];
  return { k, lvl: c.lvl, seed: c.seedCost, price: c.price * (c.yield || 1),
           growH: c.growH != null ? c.growH : (c.grow / 3600),
           xp: vm.runInContext("xpDeCultivo(" + JSON.stringify(k) + ")", ctx) };
});
const FARM_XP_LVLS = g("FARM_XP_LVLS");
const FARM_PARCELA = g("FARM_PARCELA");
/* el cupo REAL: 40 por parcela (SEED_POR_PARCELA), no una recta inventada */
const SEED_POR_PARCELA = g("SEED_POR_PARCELA");
const SEED_DAILY = (lvl) => SEED_POR_PARCELA * Math.max(3, plots(lvl));
const CD = g("CD");
/* el arranque rápido de los nodos se ELIMINÓ el 15/8 (dirección: « el tutorial no es otro
   juego »), así que el reloj es UNO desde el primer golpe. Se deja la forma por si vuelve. */
const CD_FAST = { tree: CD.tree, rock: CD.rock }, FAST_USES = 0;
const POR_CARGA = g("NODO_POR_CARGA") || 1;
const TOOL_CRAFT = g("TOOL_CRAFT"), PICK_DEF = g("PICK_DEF");
const AXE = (TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 2;
const PICK = { madera: 0, plata: (PICK_DEF.stone && PICK_DEF.stone.plata) || 2 };
const BUILD_DEF = g("BUILD_DEF");
const BUILDS = Object.keys(BUILD_DEF).map(k => Object.assign(
  { k, lvl: BUILD_DEF[k].lvl || 1 }, BUILD_DEF[k].cost || {}))
  .sort((a, b) => a.lvl - b.lvl);
const ARMAS_PLATA = 1000;
/* la XP de un oficio sale de skillNeed, que es la curva del juego (XP_BASE 21, exp 1,70 y el
   ritmo por oficio). Antes acá había un XP_BASE 100 con exponente 2,7: otra curva entera. */
function skillLvl(xp) {
  let l = 1, acc = 0;
  while (l < 150) { const need = vm.runInContext("skillNeed(" + l + ', "farming")', ctx);
    if (xp < acc + need) break; acc += need; l++; }
  return l;
}
function granjaLvl(xp) { let l = 1; while (FARM_XP_LVLS[l + 1] != null && xp >= FARM_XP_LVLS[l + 1]) l++; return l; }
function plots(lvl) { let p = 2; for (const n in FARM_PARCELA) if (lvl >= +n) p = Math.max(p, FARM_PARCELA[n]); return p; }

function simular(nombre, sesiones, minutos, dias) {
  // estado
  let plata = 3, xp = 0, madera = 0, piedra = 0, seeds = 0, axes = 15, picks = 15;
  let plantado = [];            // [{listaEn}] hora absoluta
  let arboles = [{ usos: 0, listo: 0 }], rocas = [{ usos: 0, listo: 0 }];
  let built = {}, compradasHoy = 0, diaActual = 0;
  const hitos = {}, marca = (h, t) => { if (!(h in hitos)) hitos[h] = t; };
  const H = 24;

  for (let dia = 0; dia < dias; dia++) {
    compradasHoy = 0;
    for (let s = 0; s < sesiones; s++) {
      const t = dia * H + (s + 0.5) * (H / (sesiones + 1));   // hora absoluta de la sesión
      let presupuestoAcciones = minutos * 6;                   // ~1 acción cada 10 s
      const lvl = granjaLvl(xp), cultivoLvl = skillLvl(xp);

      // 1) cosechar lo listo y vender
      const listos = plantado.filter(p => p.listaEn <= t);
      plantado = plantado.filter(p => p.listaEn > t);
      for (const c of listos) { plata += c.price; xp += c.xp; }

      // 2) replantar el mejor cultivo pagable (parcelas libres + cupo)
      const libres = plots(lvl) - plantado.length;
      const cupo = SEED_DAILY(lvl) - compradasHoy;
      const mejores = CROPS.filter(c => c.lvl <= cultivoLvl && plata >= c.seed).sort((a, b) => (b.price - b.seed) - (a.price - a.seed));
      if (mejores.length && libres > 0 && cupo > 0) {
        const c = mejores[0];
        const n = Math.min(libres, cupo, Math.floor(plata / c.seed));
        for (let i = 0; i < n; i++) { plata -= c.seed; plantado.push({ listaEn: t + c.growH, price: c.price, xp: c.xp }); }
        compradasHoy += n;
      }

      // 3) talar / picar lo disponible (comprando herramientas si alcanza)
      // el jugador con guía RESERVA la madera de su próxima obra: no la quema en picos
      const prox = BUILDS.find(b => !built[b.k] && !(b.oro || b.golden));
      const reservaMadera = prox && lvl >= prox.lvl - 1 ? prox.madera : 0;
      const cosecharNodo = (nodos, cd, cdFast, herr) => {
        let hechas = 0;
        for (const nodo of nodos) {
          while (nodo.listo <= t + (hechas * 15) / 3600 && presupuestoAcciones > 0) {
            if (herr === "axe") { if (axes <= 0) { if (plata >= AXE && built.store) { plata -= AXE; axes++; } else break; } axes--; madera++; }
            else { if (picks <= 0) { if (plata >= PICK.plata && madera - PICK.madera >= reservaMadera && built.store) { plata -= PICK.plata; madera -= PICK.madera; picks++; } else break; } picks--; piedra++; }
            nodo.usos++; presupuestoAcciones -= 4; hechas++;
            nodo.listo = t + ((nodo.usos <= FAST_USES ? cdFast : cd) / 3600);
          }
        }
      };
      cosecharNodo(arboles, CD.tree, CD_FAST.tree, "axe");
      cosecharNodo(rocas, CD.rock, CD_FAST.rock, "pick");

      // más nodos según nivel (aprox de NIVEL_ROCAS y cultivar árboles)
      if (lvl >= 3 && arboles.length < 2) arboles.push({ usos: 0, listo: 0 });
      if (lvl >= 5 && arboles.length < 3) arboles.push({ usos: 0, listo: 0 });
      if (lvl >= 3 && rocas.length < 2) rocas.push({ usos: 0, listo: 0 });
      if (lvl >= 8 && rocas.length < 3) rocas.push({ usos: 0, listo: 0 });

      // 4) construir lo que se pueda
      for (const b of BUILDS) {
        if (built[b.k] || lvl < b.lvl) continue;
        if (madera >= b.madera && piedra >= b.piedra && !(b.oro || b.golden)) {   // el altar (oro/$G) queda fuera del modelo simple
          madera -= b.madera; piedra -= b.piedra; built[b.k] = 1;
          marca("🏠 " + b.k, t);
        }
      }
      // hitos de nivel y plata
      for (const n of [2, 3, 5, 7, 10]) if (granjaLvl(xp) >= n) marca("nivel " + n, t);
      if (plata >= ARMAS_PLATA) marca("💰 1000 (Armas)", t);
    }
  }
  // informe
  const fmt = (t) => "día " + (Math.floor(t / 24) + 1) + " ~" + Math.round(t % 24) + "h";
  console.log("\n=== " + nombre + " (" + sesiones + " sesiones/día × " + minutos + " min) ===");
  const orden = Object.entries(hitos).sort((a, b) => a[1] - b[1]);
  for (const [h, t] of orden) console.log("  " + h.padEnd(18) + fmt(t));
  const lvl = granjaLvl(xp);
  console.log("  → tras 30 días: nivel " + lvl + " · " + Math.round(plata) + " de plata · edificios: " + Object.keys(built).join(", "));
}

simular("CASUAL", 2, 10, 30);
simular("MEDIO", 4, 15, 30);
simular("HARDCORE", 8, 30, 30);
