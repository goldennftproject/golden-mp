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

// ---- números del código (copiar de state.js si cambian) ----
const CROPS = [
  { k: "papa", lvl: 1, seed: 1, price: 3, growH: 0.15, xp: 9 },
  { k: "zanahoria", lvl: 2, seed: 3, price: 8, growH: 0.4167, xp: 25 },
  { k: "cebolla", lvl: 3, seed: 6, price: 16, growH: 0.8333, xp: 50 },
  { k: "calabacin", lvl: 4, seed: 12, price: 32, growH: 1.5, xp: 90 },
  { k: "repollo", lvl: 5, seed: 20, price: 50, growH: 2.5, xp: 150 },
  { k: "calabaza", lvl: 6, seed: 40, price: 100, growH: 4.5, xp: 270 },
  { k: "brocoli", lvl: 7, seed: 90, price: 210, growH: 8, xp: 480 },
  { k: "girasol", lvl: 8, seed: 180, price: 420, growH: 12, xp: 720 },
  { k: "trigo", lvl: 9, seed: 360, price: 840, growH: 18, xp: 1080 },
  { k: "maiz", lvl: 10, seed: 720, price: 1680, growH: 24, xp: 1440 },
];
const FARM_XP_LVLS = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000, 17600, 25100];
const FARM_PARCELA = { 1: 3, 2: 3, 4: 4, 6: 5, 7: 6, 12: 7 };   // 14/8: se nace con 3 parcelas
const SEED_DAILY = (lvl) => 18 + 2 * lvl;
const XP_BASE = 100, XP_EXP = 2.7;   // curva de skills (Cultivo)
const CD = { tree: 5400, rock: 7200 }, CD_FAST = { tree: 180, rock: 240 }, FAST_USES = 10;
const AXE = 10, PICK = { madera: 3, plata: 10 };           // hacha 10 plata · pico 3 madera + 10 plata (1 uso c/u)
const BUILDS = [
  { k: "store", lvl: 2, madera: 5, piedra: 2 },
  { k: "horno", lvl: 3, madera: 10, piedra: 8 },
  { k: "cocina", lvl: 5, madera: 20, piedra: 15 },
  { k: "altar", lvl: 7, madera: 40, piedra: 60, oro: 20, golden: 30 },
];
const ARMAS_PLATA = 1000;
const XPQ = [45, 45];  // las 3 primeras semillas crecen en 45 s (se ignora el detalle, ruido)

function skillLvl(xp) { let l = 1, acc = 0, need = Math.round(XP_BASE * Math.pow(1, XP_EXP)); while (xp >= acc + need && l < 150) { acc += need; l++; need = Math.round(XP_BASE * Math.pow(l, XP_EXP)); } return l; }
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
