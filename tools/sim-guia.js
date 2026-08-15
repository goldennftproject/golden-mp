/* WALKTHROUGH DE LA GUÍA con TIEMPOS REALES (14/8) — recorre los 40 pasos en orden con
   el estado que el jugador tiene en cada momento y reporta cuánto tarda cada paso.
   Política del jugador simulado: siempre replanta el mejor cultivo pagable, tala/pica
   apenas el nodo está listo, cultiva árboles nuevos cuando la madera sobra, compra
   herramientas cuando hacen falta y la plata alcanza. Correr: node tools/sim-guia.js */

const CROPS = [   // 14/8: escalera nueva (papa 90 s)
  { k: "papa", lvl: 1, seed: 1, price: 3, grow: 45, xp: 9 },
  { k: "zanahoria", lvl: 2, seed: 3, price: 8, grow: 150, xp: 25 },
  { k: "cebolla", lvl: 3, seed: 6, price: 16, grow: 300, xp: 50 },
  { k: "calabacin", lvl: 4, seed: 12, price: 32, grow: 900, xp: 90 },
  { k: "repollo", lvl: 5, seed: 20, price: 50, grow: 1800, xp: 150 },
];
const FARM_XP = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000];
const XP_BASE = 100, XP_EXP = 2.7;   // curva del skill Cultivo (desbloquea cultivos)
const CDT = { fast: 90, long: 90, uses: 99 }, CDR = { fast: 120, long: 120, uses: 99 };   // 14/8: TIMER ÚNICO
let ensenanza = false;   // 14/8: FÍSICA ÚNICA — sin aceleración de tutorial
const NIVEL_ROCAS = [1, 3, 5, 8, 12, 16];
const UNLOCK_ARBOL = [3, 9, 27];   // madera que cuesta el 2º/3º/4º árbol
const AXE = 6, PICK = { madera: 2, plata: 6 };   // 14/8 rebalance
const FIRST_GROW = 45;   // papa base (−50%)

function skillLvl(xp) { let l = 1, acc = 0, need = XP_BASE; while (xp >= acc + need && l < 50) { acc += need; l++; need = Math.round(XP_BASE * Math.pow(l, XP_EXP)); } return l; }
function granja(xp) { let l = 1; while (FARM_XP[l + 1] != null && xp >= FARM_XP[l + 1]) l++; return l; }

// estado
let t = 0, plata = 3, xp = 0, madera = 0, piedra = 0, axes = 0, picoUsos = 0, seeds = 0, firstLeft = 3;   // 14/8: manos vacías — los kits del capataz dan las herramientas
let plots = [null, null, null];             // hora en que estará lista + datos, por parcela
let arboles = [0], rocas = [0];             // readyAt por nodo (rocas se abren por nivel)
let usosArbol = [0], usosRoca = [0];
let plantadas = 0;                           // semillas de arranque usadas (45 s)
const fmt = (s) => s < 90 ? Math.round(s) + " s" : s < 5400 ? (s / 60).toFixed(0) + " min" : (s / 3600).toFixed(1) + " h";

function tick(hasta) {   // avanza el mundo: cosecha y replanta, nada más (lo activo lo hace cada paso)
  while (t < hasta) {
    t += 15;
    const lvl = granja(xp), cLvl = skillLvl(xp);
    // cosechar lo listo y replantar el mejor cultivo pagable
    for (let i = 0; i < plots.length; i++) {
      const p = plots[i];
      if (p && p.listo <= t) { plata += p.price; xp += p.xp; plots[i] = null; }
      if (!plots[i]) {
        const c = CROPS.filter(c => c.lvl <= cLvl && plata >= c.seed).sort((a, b) => (b.price - b.seed) - (a.price - a.seed))[0];
        if (c) { plata -= c.seed; const g = firstLeft > 0 ? (firstLeft--, FIRST_GROW) : c.grow; plots[i] = { listo: t + g, price: c.price, xp: c.xp }; }
      }
    }
    // abrir parcelas y rocas por nivel (aprox de FARM_PARCELA / NIVEL_ROCAS)
    if (lvl >= 4 && plots.length < 4) plots.push(null);
    if (lvl >= 6 && plots.length < 5) plots.push(null);
    const rocasAbiertas = NIVEL_ROCAS.filter(n => lvl >= n).length;
    while (rocas.length < rocasAbiertas) { rocas.push(0); usosRoca.push(0); }
  }
}
function talar(n, conKit) {   // junta n maderas; devuelve el tiempo que llevó
  const ini = t;
  let hechas = 0;
  while (hechas < n) {
    // cultivar árbol nuevo si la madera sobra (por encima de lo que el paso pide)
    const costo = UNLOCK_ARBOL[arboles.length - 1];
    if (costo != null && madera - (n - hechas) >= costo && arboles.length < 3) { madera -= costo; arboles.push(0); usosArbol.push(0); }
    // ¿algún árbol listo?
    let mejor = -1;
    for (let i = 0; i < arboles.length; i++) if (arboles[i] <= t && (mejor < 0 || arboles[i] < arboles[mejor])) mejor = i;
    if (mejor < 0) { tick(Math.min.apply(null, arboles)); continue; }
    if (axes <= 0) { if (plata >= AXE) { plata -= AXE; axes++; } else { tick(t + 60); continue; } }
    axes--; madera++; hechas++; usosArbol[mejor]++;
    arboles[mejor] = t + (ensenanza ? 20 : (usosArbol[mejor] <= CDT.uses ? CDT.fast : CDT.long));
    tick(t + 15);
  }
  return t - ini;
}
function picar(n) {
  const ini = t;
  let hechas = 0;
  while (hechas < n) {
    let mejor = -1;
    for (let i = 0; i < rocas.length; i++) if (rocas[i] <= t && (mejor < 0 || rocas[i] < rocas[mejor])) mejor = i;
    if (mejor < 0) { tick(Math.min.apply(null, rocas)); continue; }
    if (picoUsos <= 0) {
      if (madera < PICK.madera) { talar(PICK.madera - madera); continue; }   // primero la madera del pico
      if (plata < PICK.plata) { tick(t + 120); continue; }                    // esperar la plata de los cultivos
      madera -= PICK.madera; plata -= PICK.plata; picoUsos++;
    }
    picoUsos--; piedra++; hechas++; usosRoca[mejor]++;
    rocas[mejor] = t + (ensenanza ? 25 : (usosRoca[mejor] <= CDR.uses ? CDR.fast : CDR.long));
    tick(t + 15);
  }
  return t - ini;
}
function juntarPlata(meta) { const ini = t; while (plata < meta) tick(t + 60); return t - ini; }

// ---- el recorrido, paso a paso ----
const filas = [];
const paso = (n, txt, fn) => { const ini = t; fn(); filas.push([n, txt, t - ini, t]); };

paso(1, "Comprá 3 semillas", () => { plata -= 3; seeds = 3; tick(t + 30); });
paso(2, "Plantá tus 3 papas", () => { for (let i = 0; i < 3; i++) { plots[i] = { listo: t + FIRST_GROW, price: 3, xp: 9 }; firstLeft--; } tick(t + 30); });
paso(3, "Cosechá tus 3 papas", () => { tick(t + FIRST_GROW + 30); plata += 9; xp += 27; plots = plots.map(() => null); });
paso(4, "Vendé tus papas", () => tick(t + 30));
paso(5, "Colocá el plano de la Herrería", () => tick(t + 40));
paso(6, "Juntá 5 de madera (Herrería)", () => { axes += 5; talar(5); });          // kit: 5 hachas
paso(7, "Juntá 2 de piedra (Herrería)", () => { picoUsos += 2; picar(2); });      // kit: 2 usos
paso(8, "Depositá (Herrería lista)", () => { madera -= 5; piedra -= 2; tick(t + 30); });
paso(9, "Colocá el plano del Horno", () => tick(t + 40));
paso(10, "Juntá 10 de madera (Horno)", () => { axes += 10; talar(10); });         // kit
paso(11, "Juntá 8 de piedra (Horno)", () => { picoUsos += 8; picar(8); });        // kit
paso(12, "Depositá (Horno listo)", () => { madera -= 10; piedra -= 8; tick(t + 30); });
paso(13, "Crafteá un Hacha (kit: 10 plata)", () => { plata += Math.max(0, 10 - plata); plata -= 10; axes++; tick(t + 40); });
paso(14, "Colocá el plano de la Cocina", () => tick(t + 40));
paso(15, "Juntá 15 de madera (Cocina)", () => talar(15));   // 14/8: cocina 15+8
paso(16, "Juntá 8 de piedra (Cocina)", () => picar(8));
paso(17, "Depositá (Cocina lista)", () => { madera -= 15; piedra -= 8; tick(t + 30); });
paso(18, "Cociná tu Papa Asada", () => { tick(t + 180 + 60); });
paso(19, "Comé un plato", () => tick(t + 30));
paso(20, "Desbloqueá Armas (300 plata + 15 madera + 10 piedra)", () => { juntarPlata(300 + 100); talar(15); picar(10); plata -= 300; madera -= 15; piedra -= 10; });
paso(21, "Forjá la Espada de Madera", () => tick(t + 60));
paso(22, "Equipá tu arma", () => tick(t + 30));
paso(23, "Cruzá el portal", () => tick(t + 60));
paso(24, "Vencé tu primera criatura", () => tick(t + 120));
paso(25, "Vencé 5 criaturas más", () => tick(t + 600));
paso(26, "Pescá un pez", () => tick(t + 180));
paso(27, "Fundí una barra", () => { if (piedra < 2) picar(2 - piedra); piedra -= 2; tick(t + 300); });
paso(28, "Crafteá un Pico de Bronce", () => { if (madera < 3) talar(3 - madera); if (piedra < 4) picar(4 - piedra); juntarPlata(8); madera -= 3; piedra -= 4; plata -= 8; tick(t + 60); });
paso(29, "Miná un mineral", () => tick(t + 400));
paso(30, "Colocá el plano del Altar", () => tick(t + 40));
paso(31, "Juntá 40 de piedra (Altar)", () => picar(40));
paso(32, "Juntá 30 de madera (Altar)", () => talar(30));
paso(33, "Depositá el Altar (20 oro + 30 $G — cadena de picos)", () => { tick(t + 6 * 3600); });   // estimación gruesa: ver TODO diseñador
paso(34, "Mejorá un arma a +1", () => tick(t + 300));

console.log("PASO".padEnd(4) + "OBJETIVO".padEnd(52) + "TARDA".padEnd(10) + "ACUMULADO");
let cap = 0;
const cortes = { 4: "Tu primera cosecha", 8: "La Herrería", 13: "El Horno + Hacha", 19: "La Cocina", 22: "Las Armas", 26: "La Zona Negra", 29: "Minería", 34: "El Altar" };
for (const [n, txt, dur, acc] of filas) {
  console.log(String(n).padEnd(4) + txt.padEnd(52) + fmt(dur).padEnd(10) + fmt(acc));
  if (cortes[n]) console.log("     — fin de «" + cortes[n] + "» —  total " + fmt(acc) + "\n");
}
console.log("(35-40 Maestría: acciones sueltas, ~15-30 min activos más lo que tarde la runa)");
