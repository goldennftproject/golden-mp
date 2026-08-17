/* ESCENARIO DE LABORATORIO (16/8, pedido de dirección): jugador SIEMPRE ACTIVO 24 h
   con 10 ÁRBOLES + 10 ROCAS abiertos desde el minuto 0. Todo lo demás COMO ESTÁ HOY:
   · timers del diseñador (árbol 90 min · piedra 120 min · cultivos v3 papa 9 min→maíz 24 h)
   · kit inicial (35 hachas · 20 picos · 15 cañas) y crafteo real (hacha 6 plata ·
     pico 2 maderas + 6 plata) — los picos DRENAN madera, es el acople clave
   · XP = minutos del reloj (tala 90 · piedra 120) y XP de cosecha = tabla de cultivos
   · doble curva real: cultivos por nivel de SKILL Farmeo (100·l^2.7) y parcelas por
     NIVEL DE GRANJA (FARM_XP_LVLS, tope 10 sin tareas) — misma XP, dos tablas
   · cupo de semillas 18+2×nivel por día · 3 excavaciones (lombrices→pesca) ·
     tablón: 3 pedidos aprox (papa/madera/piedra, el 1º vales ×2)
   Política del jugador: replanta al instante el MEJOR cultivo desbloqueado que crezca
   en ≤3 h (mantiene la rueda girando; las anclas de 16-24 h no entran en una tabla
   de 24 h), vende todo al cosechar, tala/pica apenas hay nodo listo, craftea cuando
   se queda sin herramienta. ES EL TECHO TEÓRICO: sin dormir, sin errores.
   Correr: node tools/sim-24h-10nodos.js */

// 16/8: niveles actualizados — los cultivos se desbloquean por NIVEL DE GRANJA (auditoría C)
const CROPS = [
  ["papa", 3, 1, 2, 5, 1], ["ciruela", 6, 1, 3, 10, 1], ["cereza", 9, 1, 4, 15, 2], ["remolacha", 12, 2, 6, 20, 3],   // 16/8 v2: escalera derivada del ancla
  ["zanahoria", 15, 3, 8, 25, 2], ["cebolla", 30, 6, 16, 50, 3],
  ["calabacin", 45, 12, 32, 90, 4], ["repollo", 90, 20, 50, 150, 5], ["calabaza", 180, 40, 100, 270, 6],
  ["brocoli", 360, 90, 210, 480, 8], ["girasol", 600, 180, 420, 720, 10], ["trigo", 960, 360, 840, 1080, 12],
  ["maiz", 1440, 720, 1680, 1440, 15]];   // [k, growMin, seed, price, xp, nivelGranja]
const FARM_XP = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000];   // nivel de granja 1-10
const PARCELAS = { 1: 3, 2: 3, 4: 4, 6: 5, 7: 6 };
const skillNeed = l => Math.round(100 * Math.pow(l, 2.7));
const skillLvl = xp => { let l = 1, acc = 0, n = skillNeed(1); while (xp >= acc + n && l < 150) { acc += n; l++; n = skillNeed(l); } return l; };

const ARBOLES = 10, ROCAS = 10, CD_ARBOL = 90, CD_ROCA = 120;
const XP_TALA = 90, XP_PIEDRA = 120, PRECIO_MADERA = 2, PRECIO_PIEDRA = 3;
const HACHA = { plata: 6 }, PICO = { madera: 0, plata: 6 };   // 16/8: el pico ya no pide madera (auditoría G)

let plata = 3, madera = 0, piedra = 0, hachas = 35, picos = 20, canas = 15, lombrices = 0, peces = 0;
let xpFarm = 0, xpMin = 0, xpCraft = 0, xpPesca = 0, nivel = 1;
let semillasHoy = 0, hachasCraft = 0, picosCraft = 0, talas = 0, picadas = 0, cosechas = 0, vales = 0;
let gastoSemillas = 0, gastoHerr = 0, ventaCultivos = 0, plataPedidos = 0;
const arbol = Array(ARBOLES).fill(0), roca = Array(ROCAS).fill(0);   // minuto listo
let plots = [];   // {done, xp, price}
const hitos = [];
const nivelGranja = () => { let n = 1; while (FARM_XP[n + 1] != null && xpFarm >= FARM_XP[n + 1]) n++; return Math.min(10, n); };
const parcelas = () => { let p = 3; const n = nivel; for (const k in PARCELAS) if (n >= +k) p = PARCELAS[k]; return p; };
const cupo = () => process.env.SIN_CUPO ? Infinity : 15 * parcelas();   // 16/8: cupo por parcela (auditoría A)
const mejorCultivo = () => {   // 16/8: desbloqueo por NIVEL DE GRANJA (auditoría C)
  const cands = CROPS.filter(c => nivel >= c[5] && c[1] <= 180);
  return cands.length ? cands[cands.length - 1] : CROPS[0];
};

// eventos fijos del día: excavaciones (mañana) → lombrices → pesca; tablón a las 6 h y 12 h
let excavHecha = false, pedido1 = false, pedido2 = false, pedido3 = false;

const filas = [];
for (let m = 1; m <= 1440; m++) {
  // cosechar + vender + replantar (cupo de semillas mediante)
  plots = plots.filter(p => {
    if (p.done <= m) { cosechas++; xpFarm += p.xp; plata += p.price; ventaCultivos += p.price; return false; }
    return true;
  });
  const nuevoNivel = nivelGranja();
  if (nuevoNivel > nivel) { nivel = nuevoNivel; hitos.push([m, "GRANJA nivel " + nivel + (PARCELAS[nivel] ? " (+parcela)" : "")]); }
  while (plots.length < parcelas() && semillasHoy < cupo()) {
    const c = mejorCultivo();
    if (plata < c[2]) break;
    plata -= c[2]; gastoSemillas += c[2]; semillasHoy++;
    plots.push({ done: m + c[1], xp: c[4], price: c[3] });
  }
  // talar (10 árboles) — hachas del kit y crafteadas a 6 plata
  for (let i = 0; i < ARBOLES; i++) if (arbol[i] <= m) {
    if (hachas <= 0 && plata >= HACHA.plata * 5) { plata -= HACHA.plata * 5; gastoHerr += HACHA.plata * 5; hachas += 5; hachasCraft += 5; xpCraft += 25; }
    if (hachas <= 0) break;
    hachas--; madera++; talas++; xpCraft += XP_TALA; arbol[i] = m + CD_ARBOL;
  }
  // picar (10 rocas) — picos: 2 maderas + 6 plata (el acople madera↔piedra)
  for (let i = 0; i < ROCAS; i++) if (roca[i] <= m) {
    if (picos <= 0 && madera >= PICO.madera && plata >= PICO.plata) { madera -= PICO.madera; plata -= PICO.plata; gastoHerr += PICO.plata; picos++; picosCraft++; xpCraft += 5; }
    if (picos <= 0) break;
    picos--; piedra++; picadas++; xpMin += XP_PIEDRA; roca[i] = m + CD_ROCA;
  }
  // excavaciones de la mañana (minuto 30): ~4 lombrices → pesca inmediata
  if (!excavHecha && m >= 30) {
    excavHecha = true; lombrices += 4; hitos.push([m, "3 montículos cavados (+4 lombrices)"]);
    while (lombrices > 0 && canas > 0) { lombrices--; canas--; peces++; xpPesca += 8; }
    hitos.push([m + 1, peces + " pescas en la laguna"]);
  }
  // tablón (aprox de los 3 pedidos del día; el 1º paga vales ×2)
  if (!pedido1 && m >= 360 && Math.floor(plata) >= 0 && cosechas >= 5) { pedido1 = true; plata += 23; plataPedidos += 23; xpFarm += 8; vales += 2; hitos.push([m, "Pedido 1 entregado (papa ×5) +23 plata 🎟×2"]); }
  if (!pedido2 && m >= 720 && madera >= 4) { pedido2 = true; madera -= 4; plata += 12; plataPedidos += 12; xpFarm += 4; vales += 1; hitos.push([m, "Pedido 2 entregado (madera ×4) +12 plata"]); }
  if (!pedido3 && m >= 720 && piedra >= 4) { pedido3 = true; piedra -= 4; plata += 18; plataPedidos += 18; xpFarm += 6; vales += 1; hitos.push([m, "Pedido 3 entregado (piedra ×4) +18 plata"]); }

  if (m % 60 === 0) filas.push({
    hora: m / 60, madera, piedra, cosechas, plata: Math.round(plata),
    nivel, skFarm: skillLvl(xpFarm), xpFarm: Math.round(xpFarm), xpMin, xpCraft,
    hachas, picos, semillas: semillasHoy, parcelas: parcelas(), cultivo: mejorCultivo()[0], vales, peces
  });
}

console.log("H  | Madera Piedra Cosech | Plata  | NvGranja SkFarm XPfarm  XPmin  XPcraft | Hachas Picos Sem  | Cultivo    Vales Peces");
for (const f of filas)
  console.log(String(f.hora).padStart(2) + " | " + String(f.madera).padStart(6) + String(f.piedra).padStart(7) + String(f.cosechas).padStart(7) + " | " +
    String(f.plata).padStart(6) + " | " + String(f.nivel).padStart(8) + String(f.skFarm).padStart(7) + String(f.xpFarm).padStart(7) + String(f.xpMin).padStart(7) + String(f.xpCraft).padStart(8) + " | " +
    String(f.hachas).padStart(6) + String(f.picos).padStart(6) + String(f.semillas).padStart(4) + " | " + f.cultivo.padEnd(10) + String(f.vales).padStart(5) + String(f.peces).padStart(6));
console.log("\nHITOS:");
for (const [m, t] of hitos) console.log("  " + String(Math.floor(m / 60)).padStart(2) + ":" + String(m % 60).padStart(2, "0") + "  " + t);
console.log("\nBALANCE ECONÓMICO 24 h: venta cultivos +" + ventaCultivos + " · pedidos +" + plataPedidos +
  " · semillas -" + gastoSemillas + " · herramientas -" + gastoHerr + " → NETO " + Math.round(ventaCultivos + plataPedidos - gastoSemillas - gastoHerr + 3));
console.log("Herramientas: hachas kit 35 + craft " + hachasCraft + " (quedan " + (35 + hachasCraft - talas) + ") · picos kit 20 + craft " + picosCraft + " (quedan " + (20 + picosCraft - picadas) + ")");
console.log("Producción: " + talas + " talas · " + picadas + " picadas · " + cosechas + " cosechas · " + peces + " peces · madera final " + madera + " · piedra final " + piedra);
// volcado JSON para la planilla del diseñador: JSON_OUT=/ruta node tools/sim-24h-10nodos.js
if (process.env.JSON_OUT) require("fs").writeFileSync(process.env.JSON_OUT, JSON.stringify({
  filas, hitos, resumen: { ventaCultivos, plataPedidos, gastoSemillas, gastoHerr, talas, picadas, cosechas, peces, madera, piedra, hachasCraft, picosCraft, vales, xpFarm: Math.round(xpFarm), xpMin, xpCraft, xpPesca, nivel, skFarm: skillLvl(xpFarm) } }, null, 1));
