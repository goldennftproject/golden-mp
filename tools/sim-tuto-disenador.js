/* SIMULADOR DEL TUTORIAL con la TABLA COMPLETA DEL DISEÑADOR (15/8):
   cultivos v3 (papa 9 min) + nodos doc 4/8 (árbol: 3 primeras a 3 min, después 1 h 30 ·
   piedra: 3 primeras a 4 min, después 2 h · por NODO). Kit 35 hachas + 20 picos.
   Jugador óptimo: desbloquea 2º y 3º árbol apenas puede (3/9 maderas), usa cantera + veta
   de piedra, y la 2ª roca cuando el nivel 3 de granja la abre. Correr: node tools/sim-tuto-disenador.js */

const PAPA = { grow: 540, seed: 1, price: 3, xp: 9 };
const T_FAST = 180, T_VECES = 3, T_LARGO = 5400;   // árbol (doc 4/8)
const R_FAST = 240, R_VECES = 3, R_LARGO = 7200;   // piedra (doc 4/8) — cantera y veta
const NEED = { store: { m: 5, p: 2 }, horno: { m: 10, p: 8 }, cocina: { m: 15, p: 8 } };
const UNLOCK_ARBOL = [3, 9];
const FARM_XP_3 = 90;   // nivel 3 de granja abre la 2ª roca de cantera

let t = 0, plata = 3, madera = 0, piedra = 0, axes = 35, picos = 20, seeds = 0, papas = 0, xp = 0;
let plots = [0, 0, 0];
let arboles = [{ r: 0, usos: 0 }], rocas = [{ r: 0, usos: 0 }, { r: 0, usos: 0 }];   // cantera + veta
let compras = 0, roca2 = false, talas = 0, picadas = 0, diaSig = 86400;
const CUPO = 20;
const fmt = s => s < 90 ? Math.round(s) + " s" : s < 5400 ? (s / 60).toFixed(1) + " min" : (s / 3600).toFixed(1) + " h";
const filas = [];

function tick(dt) {
  const fin = t + dt;
  while (t < fin) {
    t += 10;
    for (let i = 0; i < plots.length; i++) {
      if (plots[i] && plots[i] <= t) { papas++; xp += PAPA.xp; plots[i] = 0; }
      if (!plots[i]) {
        if (seeds <= 0 && plata >= PAPA.seed && compras < CUPO) { plata -= PAPA.seed; seeds++; compras++; }
        if (seeds > 0) { seeds--; plots[i] = t + PAPA.grow; }
      }
    }
    if (papas > 1) { plata += (papas - 1) * PAPA.price; papas = 1; }
    if (!roca2 && xp >= FARM_XP_3) { roca2 = true; rocas.push({ r: 0, usos: 0 }); }   // granja nv 3
    if (t >= diaSig) { compras = 0; diaSig += 86400; }   // medianoche: el cupo diario vuelve
  }
}
function talar(n) {
  while (madera < n) {
    // solo el 2º árbol (3 maderas): el 3º (9 maderas × 1,5 h) no se paga dentro del tuto
    if (arboles.length < 2 && madera >= UNLOCK_ARBOL[0] && (n - madera) >= 2) {
      madera -= UNLOCK_ARBOL[0]; arboles.push({ r: t + T_FAST, usos: 0 }); continue;
    }
    let m = null; for (const a of arboles) if (a.r <= t && (!m || a.r < m.r)) m = a;
    if (!m) { tick(Math.max(10, Math.min(...arboles.map(a => a.r)) - t)); continue; }
    if (axes <= 0) { /* con kit no pasa */ tick(60); continue; }
    axes--; madera++; talas++; m.usos++;
    m.r = t + (m.usos < T_VECES ? T_FAST : T_LARGO);
    tick(10);
  }
}
function picar(n) {
  while (piedra < n) {
    let m = null; for (const r of rocas) if (r.r <= t && (!m || r.r < m.r)) m = r;
    if (!m) { tick(Math.max(10, Math.min(...rocas.map(r => r.r)) - t)); continue; }
    if (picos <= 0) { tick(60); continue; }
    picos--; piedra++; picadas++; m.usos++;
    m.r = t + (m.usos < R_VECES ? R_FAST : R_LARGO);
    tick(10);
  }
}
const paso = (txt, fn) => { const ini = t; fn(); filas.push([txt, t - ini, t]); };

paso("1-4 Comprá/plantá/cosechá/vendé 3 papas", () => { plata -= 3; seeds = 3; tick(PAPA.grow + 60); plata += 9; seeds = 0; papas = 0; plots = [0, 0, 0]; tick(10); });
paso("5 Colocá plano Herrería", () => tick(30));
paso("6 Juntá 5 madera", () => talar(NEED.store.m));
paso("7 Juntá 2 piedra", () => picar(NEED.store.p));
paso("8 Depositá Herrería", () => { madera -= NEED.store.m; piedra -= NEED.store.p; tick(20); });
paso("9 Colocá plano Horno", () => tick(30));
paso("10 Juntá 10 madera", () => talar(NEED.horno.m));
paso("11 Juntá 8 piedra", () => picar(NEED.horno.p));
paso("12 Depositá Horno", () => { madera -= NEED.horno.m; piedra -= NEED.horno.p; tick(20); });
paso("13 Crafteá un Hacha (6 plata)", () => { while (plata < 6) tick(30); plata -= 6; axes++; tick(20); });
paso("14 Colocá plano Cocina", () => tick(30));
paso("15 Juntá 15 madera", () => talar(NEED.cocina.m));
paso("16 Juntá 8 piedra", () => picar(NEED.cocina.p));
paso("17 Depositá Cocina", () => { madera -= NEED.cocina.m; piedra -= NEED.cocina.p; tick(20); });
paso("18 Cociná Papa Asada", () => { talar(1); while (papas < 1) tick(30); papas--; madera--; tick(180 + 30); });
paso("19 Comé el plato", () => tick(15));

console.log("PASO".padEnd(44) + "TARDA".padEnd(10) + "ACUMULADO");
for (const [txt, dur, acc] of filas) console.log(txt.padEnd(44) + fmt(dur).padEnd(10) + fmt(acc));
console.log("\nTalas " + talas + " (árboles " + arboles.length + ") · picadas " + picadas + " (rocas " + rocas.length + ") · semillas " + compras + "/" + CUPO + " · plata " + plata.toFixed(0));
