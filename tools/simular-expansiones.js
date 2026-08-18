/* SIMULADOR DE LA CURVA DE EXPANSIONES (17/8)
   Qué contesta: en qué nivel cae cada uno de los 16 bloques, cuántas casillas productivas
   tiene la granja en cada momento, y cuántos días de juego real lleva llegar ahí.
   Los relojes y la curva de XP salen del código, no se escriben acá a mano.
     node tools/simular-expansiones.js                                            */
const XP_BASE = 100, XP_EXP = 2.7;
const need = l => Math.round(XP_BASE * Math.pow(l, XP_EXP));
const CD = { tree: 5400, rock: 7200 };          // 1 h 30 y 2 h — timers del diseñador
const XPH_NODO = 60, XPH_PARC = 100, PLATA_H = 20;   // el ancla: las tres casillas rinden igual

// ASISTENCIA REALISTA: 3 sesiones al día en 14 h de vigilia. Un nodo solo se cosecha si pasó
// su reloj Y hay alguien mirando. Suponer 24 h perfectas infla los nodos 18x y es mentira.
const SES = 3;
function horasNodoDia(cd) {
  const h = cd / 3600, hueco = 14 / (SES - 1);
  let n = 0, ultimo = -99;
  for (let i = 0; i < SES; i++) { const t = i * hueco; if (t - ultimo >= h) { n++; ultimo = t; } }
  return (n + 1) * h;                            // +1 = la primera del día, cargada de noche
}
const horasParcDia = 2;   // el cupo de 40 semillas por parcela con papa de 3 min son 2 h de reloj

// --- LOS 16 NIVELES ---
// Arranca rápido para enseñar la mecánica, y se abre: 2 → 3 → 4 niveles de hueco.
// El bloque 16 cae en el 50, que es el techo de la tabla de premios ("Leyenda de la Granja
// Dorada"): el mapa se termina de armar exactamente cuando se termina el arco.
const NIVELES = [3, 5, 7, 9, 11, 14, 17, 20, 23, 26, 30, 34, 38, 42, 46, 50];
const FARM_PARCELA = { 2:3, 4:4, 6:5, 7:6, 12:7, 18:8, 25:9, 35:10, 45:11, 50:12 };

function correr(nombre, nodosPorBloque) {
  console.log("\n===== " + nombre + " =====");
  console.log("nivel  bloque  parc arb roc  casillas  XP/dia  plata/dia   dias  (acum)");
  let acum = 0;
  for (let l = 1; l <= 50; l++) {
    const b = NIVELES.filter(n => n <= l).length;
    let par = 3; for (const k in FARM_PARCELA) if (l >= +k) par = FARM_PARCELA[k];
    // los nodos se reparten alternando para que árboles y rocas queden parejos
    const arb = 2 + Math.ceil(b * nodosPorBloque / 2);
    const roc = 2 + Math.floor(b * nodosPorBloque / 2);
    const xd = par * XPH_PARC * horasParcDia + (arb * horasNodoDia(CD.tree) + roc * horasNodoDia(CD.rock)) * XPH_NODO;
    const pd = (par * horasParcDia + arb * horasNodoDia(CD.tree) + roc * horasNodoDia(CD.rock)) * PLATA_H;
    const dias = l < 50 ? (need(l + 1) - need(l)) / xd : 0;
    acum += dias;
    const esExp = NIVELES.includes(l);
    if (esExp || l === 1 || l % 10 === 0)
      console.log(String(l).padStart(5) + "  " + (esExp ? ("#" + b).padStart(6) : "     —") + "  " +
        String(par).padStart(4) + String(arb).padStart(4) + String(roc).padStart(4) +
        String(par + arb + roc).padStart(10) + String(Math.round(xd)).padStart(8) +
        String(Math.round(pd)).padStart(11) + "  " + dias.toFixed(1).padStart(5) + "  " + acum.toFixed(0).padStart(5));
  }
  console.log("  huecos entre expansiones:", NIVELES.map((n, i) => i ? n - NIVELES[i-1] : n - 1).join(" "));
}
correr("A · cada bloque trae 1 nodo", 1);
correr("B · cada bloque trae 2 nodos", 2);
