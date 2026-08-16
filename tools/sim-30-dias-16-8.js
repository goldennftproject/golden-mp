/* SIM 30 DÍAS "JUGADOR CHILL" (16/8) — mide los cambios de hoy:
   · NIVEL_ARBOLES [1,1,3,4,6,8] (escalera espejo de rocas, pago en madera se mantiene)
   · XP = minutos del reloj: tala 90 · piedra 120 · bronce 480 · hierro 720 · oro+ 840
   · timers del diseñador intactos (árbol 1h30 · piedra 2h · cultivos v3)
   Modelo: 3 visitas/día (8:00, 14:00, 21:00). En cada visita cosecha todo, replanta el
   cultivo desbloqueado de MÁS XP que termine antes de la próxima visita (de noche
   planta el ancla más larga que tenga), tala/pica todo nodo listo, desbloquea
   árboles/rocas apenas nivel+madera lo permiten, construye cuando le alcanza.
   Correr: node tools/sim-30-dias-16-8.js */

const CROPS = [   // [nombre, growMin, seed, price, xp, lvl]
  ["papa", 9, 1, 3, 9, 1], ["zanahoria", 15, 3, 8, 25, 2], ["cebolla", 30, 6, 16, 50, 3],
  ["calabacin", 45, 12, 32, 90, 4], ["repollo", 90, 20, 50, 150, 5], ["calabaza", 180, 40, 100, 270, 6],
  ["brocoli", 360, 90, 210, 480, 7], ["girasol", 600, 180, 420, 720, 8], ["trigo", 960, 360, 840, 1080, 9],
  ["maiz", 1440, 720, 1680, 1440, 10]];
const FARM_XP = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000];
const PARCELAS = { 1: 3, 2: 3, 4: 4, 6: 5, 7: 6 };   // nivel→parcelas (FARM_PARCELA)
const NIVEL_ARBOLES = [1, 1, 3, 4, 6, 8], NIVEL_ROCAS = [1, 1, 4, 6, 9, 12];
const UNLOCK = [2, 4, 8, 16, 32];
const CD_ARBOL = 90, CD_ROCA = 120;   // minutos
const ORES = [["bronce", 480, 3], ["hierro", 720, 6], ["oro", 840, 9]];   // [nombre, cdMin, nivel granja aprox de acceso por pico]
const XP_TALA = 90, XP_PIEDRA = 120;
const BUILDS = [["store", 5, 2, 2], ["horno", 6, 4, 3], ["cocina", 8, 5, 5], ["establo", 40, 25, 6], ["curtiduria", 35, 28, 8]];   // [id, madera, piedra, lvl]
const skillNeed = l => Math.round(100 * Math.pow(l, 2.7));
const skillLvl = xp => { let l = 1, acc = 0, need = skillNeed(1); while (xp >= acc + need && l < 150) { acc += need; l++; need = skillNeed(l); } return l; };

let farmXp = 0, level = 1, plata = 3, madera = 0, piedra = 0;
let miningXp = 0, craftXp = 0;
let arbolesAbiertos = 2, rocasAbiertas = 2;
let arbolReady = [0, 0], rocaReady = [0, 0];        // minuto en que cada nodo está listo
let oreReady = ORES.map(() => 0), oreOn = ORES.map(() => false);
let plots = [];                                       // {done: minuto, xp}
const built = {};
let talas = 0, picadas = 0, oreMinadas = 0, cosechas = 0;
const eventos = [];
const nivelCheck = () => {
  let sube = true;
  while (sube) {
    sube = false;
    const next = FARM_XP[level + 1];
    if (next != null && farmXp >= next) { level++; sube = true; eventos.push([tMin, "GRANJA NIVEL " + level]); }
  }
};
const parcelas = () => { let p = 3; for (const k in PARCELAS) if (level >= +k) p = PARCELAS[k]; return p; };

const VISITAS = [8 * 60, 14 * 60, 21 * 60];
let tMin = 0;
for (let dia = 0; dia < 30; dia++) {
  for (let v = 0; v < VISITAS.length; v++) {
    tMin = dia * 1440 + VISITAS[v];
    const proxima = v < 2 ? dia * 1440 + VISITAS[v + 1] : (dia + 1) * 1440 + VISITAS[0];
    const ventana = proxima - tMin;
    // 1) cosechar lo listo
    plots = plots.filter(p => { if (p.done <= tMin) { farmXp += p.xp; plata += p.price; cosechas++; return false; } return true; });
    nivelCheck();
    // 2) replantar: el cultivo de más XP que entra en la ventana (si ninguno entra, el más largo desbloqueado — ancla)
    while (plots.length < parcelas()) {
      const desb = CROPS.filter(c => level >= c[5] && plata >= c[2]);
      if (!desb.length) break;
      const entra = desb.filter(c => c[1] <= ventana);
      const el = entra.length ? entra.reduce((a, b) => b[4] > a[4] ? b : a) : desb.reduce((a, b) => b[1] > a[1] ? b : a);
      plata -= el[2]; plots.push({ done: tMin + el[1], xp: el[4], price: el[3] });
    }
    // 3) desbloquear nodos si nivel y madera alcanzan (prioridad árboles: la madera manda)
    while (arbolesAbiertos < 6 && level >= NIVEL_ARBOLES[arbolesAbiertos] && madera >= UNLOCK[arbolesAbiertos - 1] + 2) {
      madera -= UNLOCK[arbolesAbiertos - 1]; arbolReady.push(tMin); arbolesAbiertos++;
      eventos.push([tMin, "árbol " + arbolesAbiertos + " cultivado"]);
    }
    while (rocasAbiertas < 6 && level >= NIVEL_ROCAS[rocasAbiertas]) { rocaReady.push(tMin); rocasAbiertas++; eventos.push([tMin, "roca " + rocasAbiertas + " habilitada"]); }
    for (let i = 0; i < ORES.length; i++) if (!oreOn[i] && level >= ORES[i][2]) { oreOn[i] = true; eventos.push([tMin, "veta de " + ORES[i][0] + " en uso"]); }
    // 4) golpear todo nodo listo (kit + crafteo cubren herramientas; costo ignorado: 6 plata/hacha es ruido vs precios de cultivos)
    for (let i = 0; i < arbolReady.length; i++) if (arbolReady[i] <= tMin) { madera++; talas++; craftXp += XP_TALA; arbolReady[i] = tMin + CD_ARBOL; }
    for (let i = 0; i < rocaReady.length; i++) if (rocaReady[i] <= tMin) { piedra++; picadas++; miningXp += XP_PIEDRA; rocaReady[i] = tMin + CD_ROCA; }
    for (let i = 0; i < ORES.length; i++) if (oreOn[i] && oreReady[i] <= tMin) { oreMinadas++; miningXp += ORES[i][1]; oreReady[i] = tMin + ORES[i][1]; }
    // 5) construir lo que alcanza
    for (const [id, m, p, lv] of BUILDS) if (!built[id] && level >= lv && madera >= m && piedra >= p) {
      madera -= m; piedra -= p; built[id] = true; craftXp += 20; eventos.push([tMin, "CONSTRUIDO: " + id]);
    }
  }
  if ([1, 3, 7, 14, 30].includes(dia + 1))
    console.log("Día " + String(dia + 1).padEnd(3) + " nivel " + String(level).padEnd(3) + " XPfarm " + String(farmXp).padEnd(7) +
      " Minería nv " + String(skillLvl(miningXp)).padEnd(3) + " Crafteo nv " + String(skillLvl(craftXp)).padEnd(3) +
      " árboles " + arbolesAbiertos + " rocas " + rocasAbiertas + " plata " + Math.round(plata));
}
console.log("\nHitos:");
const fmtT = m => "d" + (Math.floor(m / 1440) + 1) + " " + String(Math.floor((m % 1440) / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
for (const [m, txt] of eventos) console.log("  " + fmtT(m).padEnd(10) + txt);
console.log("\nTotales 30 días: cosechas " + cosechas + " · talas " + talas + " · picadas " + picadas + " · minerales " + oreMinadas);
console.log("XP: farm " + farmXp + " · minería " + miningXp + " (nv " + skillLvl(miningXp) + ") · crafteo " + craftXp + " (nv " + skillLvl(craftXp) + ")");
