/* SIMULADOR DEL TUTORIAL v3 (15/8, reglas FINALES) — fiel al código actual:
   timer único (árbol 90 s · piedra 2 min, cantera y veta), papa 45 s (1→3),
   KIT 35 hachas + 20 picos (cubre el recorrido), hacha 6 plata,
   3 parcelas, CUPO REAL de 20 semillas/día también durante el tutorial.
   Jugador racional: mantiene las 3 parcelas plantadas, tala/pica apenas hay nodo listo,
   craftea herramientas cuando faltan (×5 si la plata alcanza), desbloquea el 2º árbol.
   Correr: node tools/sim-tuto-v2.js */

const CDT = 90, CDR = 120, PAPA = { grow: 540, seed: 1, price: 3, xp: 9 };   // 15/8: papa 9 min (tabla v3 del diseñador)
const AXE_PLATA = 6, PICK = { madera: 2, plata: 6 };
const NEED = { store: { m: 5, p: 2 }, horno: { m: 10, p: 8 }, cocina: { m: 15, p: 8 } };
const UNLOCK_ARBOL = [3, 9];   // 2º y 3º árbol

let t = 0, plata = 3, madera = 0, piedra = 0, axes = 35, picos = 20, seeds = 0, papas = 0;   // 15/8: kit nuevo
let plots = [0, 0, 0];              // hora en que está lista (0 = vacía)
let arboles = [0], rocas = [0, 0];  // readyAt: 1 árbol · cantera + VETA de piedra (ambas 2 min)
let comprasSemilla = 0, crafteosHacha = 0, crafteosPico = 0, xp = 0;
const CUPO_DIA = 20;   // 15/8: cupo de siempre, sin exención
const fmt = s => s < 90 ? Math.round(s) + " s" : s < 5400 ? (s / 60).toFixed(1) + " min" : (s / 3600).toFixed(2) + " h";
const filas = [];

function tick(dt) {   // avanza el mundo dt segundos, cosechando/replantando papas
  const fin = t + dt;
  while (t < fin) {
    t += 5;
    for (let i = 0; i < plots.length; i++) {
      if (plots[i] && plots[i] <= t) { papas++; xp += PAPA.xp; plots[i] = 0; }
      if (!plots[i]) {
        if (seeds <= 0 && plata >= PAPA.seed && comprasSemilla < CUPO_DIA) { plata -= PAPA.seed; seeds++; comprasSemilla++; }
        if (seeds > 0) { seeds--; plots[i] = t + PAPA.grow; }
      }
    }
    // política: vende papas dejando 1 para cocinar
    if (papas > 1) { plata += (papas - 1) * PAPA.price; papas = 1; }
  }
}
function esperarPlata(meta) { while (plata < meta) tick(15); }
let talas = 0;
function talar(n) {   // tala hasta que el STOCK llegue a n
  while (madera < n) {
    // jugador vivo: con 1 solo árbol y trabajo por delante, invierte 3 maderas en el 2º
    // árbol (retoño: tarda un ciclo en estar talable) — duplica el ritmo de ahí en más
    if (arboles.length === 1 && madera >= UNLOCK_ARBOL[0] && (n - madera) >= 4) {
      madera -= UNLOCK_ARBOL[0]; arboles.push(t + CDT);
    }
    let listo = arboles.findIndex(a => a <= t);
    if (listo < 0) { tick(Math.max(5, Math.min(...arboles) - t)); continue; }
    if (axes <= 0) {
      const lote = plata >= AXE_PLATA * 5 ? 5 : 1;
      esperarPlata(AXE_PLATA * lote); plata -= AXE_PLATA * lote; axes += lote; crafteosHacha += lote;
    }
    axes--; madera++; talas++; arboles[listo] = t + CDT; tick(5);
  }
}
let picadas = 0;
function picar(n) {   // pica hasta que el STOCK llegue a n
  while (piedra < n) {
    let listo = rocas.findIndex(r => r <= t);
    if (listo < 0) { tick(Math.max(5, Math.min(...rocas) - t)); continue; }
    if (picos <= 0) {
      if (madera < PICK.madera) talar(PICK.madera - madera);
      esperarPlata(PICK.plata); madera -= PICK.madera; plata -= PICK.plata; picos++; crafteosPico++;
    }
    picos--; piedra++; picadas++; rocas[listo] = t + CDR; tick(5);
  }
}
const paso = (txt, fn) => { const ini = t; fn(); filas.push([txt, t - ini, t]); };

paso("1-4 Comprá/plantá/cosechá/vendé 3 papas", () => { plata -= 3; seeds = 3; tick(540 + 60); plata += 9; seeds = 0; papas = 0; plots = [0, 0, 0]; tick(10); });
paso("5 Colocá plano Herrería", () => tick(30));
paso("6 Juntá 5 madera", () => talar(NEED.store.m));
paso("7 Juntá 2 piedra", () => picar(NEED.store.p));
paso("8 Depositá Herrería", () => { madera -= NEED.store.m; piedra -= NEED.store.p; tick(20); });
paso("9 Colocá plano Horno", () => tick(30));
paso("10 Juntá 10 madera", () => talar(NEED.horno.m));
paso("11 Juntá 8 piedra", () => picar(NEED.horno.p));
paso("12 Depositá Horno", () => { madera -= NEED.horno.m; piedra -= NEED.horno.p; tick(20); });
paso("13 Crafteá un Hacha (6 plata)", () => { esperarPlata(AXE_PLATA); plata -= AXE_PLATA; axes++; crafteosHacha++; tick(20); });
paso("14 Colocá plano Cocina", () => tick(30));
paso("15 Juntá 15 madera", () => talar(NEED.cocina.m));
paso("16 Juntá 8 piedra", () => picar(NEED.cocina.p));
paso("17 Depositá Cocina", () => { madera -= NEED.cocina.m; piedra -= NEED.cocina.p; tick(20); });
paso("18 Cociná Papa Asada (1 papa + 1 madera, 3 min)", () => {
  talar(1);
  while (papas < 1) tick(15);
  papas--; madera--; tick(180 + 30);
});
paso("19 Comé el plato", () => tick(15));

console.log("PASO".padEnd(46) + "TARDA".padEnd(10) + "ACUMULADO");
for (const [txt, dur, acc] of filas) console.log(txt.padEnd(46) + fmt(dur).padEnd(10) + fmt(acc));
console.log("\nBALANCE FINAL: plata " + plata.toFixed(0) + " · madera " + madera + " · piedra " + piedra +
  " · hachas " + axes + " · picos " + picos);
console.log("Consumo: semillas compradas " + comprasSemilla + " de " + CUPO_DIA + " del cupo" +
  " · hachas crafteadas " + crafteosHacha + " (" + crafteosHacha * AXE_PLATA + " plata)" +
  " · picos crafteados " + crafteosPico + " (" + crafteosPico * PICK.plata + " plata + " + crafteosPico * PICK.madera + " madera)");
console.log("Talas totales: " + talas + " · picadas: " + picadas + " · árboles activos: " + arboles.length);
