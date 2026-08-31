/* EL MOVIMIENTO ES EN CUATRO DIRECCIONES                                               (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Pedido de dirección, con los vídeos de referencia delante:
     « Las únicas direcciones a las que se debe mover es arriba, abajo, izquierda, derecha — las
       esquinas deberían estar bloqueadas: para cruzar por un lugar te movés con esas cuatro
       direcciones. Y los bichos igual. Y hacer bien el pathfinding para no colisionar. »

   Lo que había: el A* caminaba en OCHO direcciones, el suavizado convertía el camino en
   diagonales puras, el teclado permitía los dos ejes a la vez, la « esquiva suave » bordeaba
   paredes en ángulos de 0,5 radianes, y los bichos perseguían en línea recta ATRAVESANDO rocas.
   Cinco fuentes de diagonales distintas; este archivo mide que no quede ninguna.

   Se mide GEOMETRÍA, no código: al A* se le dan mundos de mentira y se examinan los caminos que
   devuelve, segmento por segmento. A eje4/sinDiagonal se les juegan sus casos. Solo el cableado
   de las escenas (que vive dentro de update y no se puede llamar suelto) se fija con fuente.
     node tools/test-cuatro-direcciones.js                                                       */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* ¿todos los segmentos de un camino son horizontales o verticales? */
function soloEjes(pts, desde) {
  let px = desde.x, py = desde.y;
  for (const p of pts) {
    const dx = Math.abs(p.x - px), dy = Math.abs(p.y - py);
    if (dx > 1 && dy > 1) return { x0: px, y0: py, x1: p.x, y1: p.y };   // el segmento diagonal delator
    px = p.x; py = p.y;
  }
  return null;
}
const Nav = g("GF").Nav;

console.log("\nEL A* CAMINA EN CUATRO DIRECCIONES");
{
  /* un mundo abierto de 400×400 sin obstáculos: la tentación diagonal máxima */
  const nav = new Nav(() => false, 400, 400);
  const p = nav.find(30, 30, 350, 300);
  ok("hay camino en el mundo abierto", !!p);
  const malo = p && soloEjes(p, { x: 30, y: 30 });
  ok("y hasta un destino en diagonal se va EN ELES: ni un segmento oblicuo", !malo,
    malo ? "diagonal de (" + Math.round(malo.x0) + "," + Math.round(malo.y0) + ") a (" + Math.round(malo.x1) + "," + Math.round(malo.y1) + ")" : p.length + " esquinas");
  console.log("       → antes esto devolvía UNA recta diagonal: el atajo « ¿hay línea libre? »");
  console.log("         cortocircuitaba el A* con cualquier destino a la vista.");
  /* destino alineado: sí puede ir directo, es una de las cuatro direcciones */
  const recto = nav.find(30, 30, 350, 32);
  ok("un destino alineado va directo — derecho ES una de las cuatro", recto && recto.length === 1);
}

console.log("\nY RODEA OBSTÁCULOS SIN CORTAR ESQUINAS");
{
  /* una pared vertical con una puerta abajo: para cruzar HAY que bajar, cruzar y subir */
  const pared = (x, y) => x > 190 && x < 210 && y < 300;
  const nav = new Nav(pared, 400, 400);
  const p = nav.find(60, 60, 340, 60);
  ok("encuentra la puerta", !!p);
  const malo = p && soloEjes(p, { x: 60, y: 60 });
  ok("y el rodeo entero es en eles", !malo, p && p.length + " esquinas");
  /* ningún punto del camino pisa la pared */
  let pisa = false;
  if (p) {
    let px = 60, py = 60;
    for (const q of p) {
      const n = Math.max(2, Math.ceil((Math.abs(q.x - px) + Math.abs(q.y - py)) / 5));
      for (let i = 1; i <= n; i++) { const t = i / n; if (pared(px + (q.x - px) * t, py + (q.y - py) * t)) pisa = true; }
      px = q.x; py = q.y;
    }
  }
  ok("y no COLISIONA: ni un punto del recorrido pisa la pared", !pisa);
  ok("un destino encerrado del todo sigue dando « no hay camino »",
    new Nav((x, y) => Math.abs(x - 200) < 40 && Math.abs(y - 200) < 40 ? false : (Math.hypot(x - 200, y - 200) < 90), 400, 400)
      .find(200, 200, 380, 380) === null);
}

console.log("\nEJE POR EJE, CON HISTÉRESIS   (eje4: el seguidor de rutas y los bichos)");
{
  const eje4 = g("eje4");
  const a = eje4(100, 80, null);
  ok("sin preferencia, arranca por el eje con más distancia", a.vx === 1 && a.vy === 0, "h primero (100 contra 80)");
  const b = eje4(50, 80, "h");
  ok("y se TERMINA un eje antes de empezar el otro", b.vx === 1 && b.vy === 0,
    "sigue en horizontal aunque ya quede menos que en vertical");
  console.log("       → sin esta histéresis, un destino en diagonal perfecta alternaría de eje en");
  console.log("         cada cuadro: una escalerita de 2 px — la diagonal de siempre, disfrazada.");
  const c = eje4(2, 80, "h");
  ok("agotado el eje (menos de 3 px), recién ahí dobla", c.vx === 0 && c.vy === 1);
  ok("y nunca devuelve los dos ejes a la vez",
    [[100, 80], [80, 100], [5, 5], [-40, 40]].every(([dx, dy]) => { const e = eje4(dx, dy, null); return !(e.vx && e.vy); }));
}

console.log("\nEL TECLADO   (sinDiagonal: con dos ejes apretados gana el último)");
{
  const sinD = g("sinDiagonal");
  const esc = {};
  let r = sinD(esc, -1, 0);
  ok("una tecla sola pasa tal cual", r.vx === -1 && r.vy === 0);
  r = sinD(esc, -1, -1);   // sin soltar izquierda, se apretó arriba
  ok("al sumar el segundo eje, gana el NUEVO", r.vx === 0 && r.vy === -1,
    "es lo que hace natural doblar la esquina sin soltar la tecla vieja");
  r = sinD(esc, -1, 0);    // soltó arriba
  ok("al soltarlo, vuelve el que quedó", r.vx === -1 && r.vy === 0);
  const esc2 = {};
  sinD(esc2, 0, 1);
  r = sinD(esc2, 1, 1);    // venía bajando, aprieta derecha
  ok("y simétrico del otro lado", r.vx === 1 && r.vy === 0);
}

console.log("\nEL CABLEADO DE LAS ESCENAS   (fijado con fuente: vive dentro de update)");
{
  const leer = (f) => fs.readFileSync(path.join(RAIZ, "public/game", f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const farm = leer("farm.js"), forest = leer("forest.js"), plaza = leer("plaza.js");
  ok("las tres escenas pasan el teclado por sinDiagonal",
    [farm, forest, plaza].every(s => /sinDiagonal\(this, vx, vy\)/.test(s)),
    "granja · Zona Negra · plaza — una sola regla para las tres");
  ok("la granja y la Zona Negra siguen rutas con eje4",
    /eje4\(dx, dy, this\._eje4\)/.test(farm) && /eje4\(dx, dy, this\._eje4\)/.test(forest));
  ok("la « esquiva suave » en ángulo ya no existe en ninguna",
    ![farm, forest].some(s => /Math\.cos\(a\) \* step/.test(s)),
    "bordear paredes a 0,5 radianes era una diagonal con permiso de trabajo");
  ok("la plaza ya no reparte 0,7071 entre los dos ejes",
    !/0\.7071/.test(plaza), "esa constante ERA la diagonal");
  ok("y los bichos caminan con la misma eje4 y consultan blockedAt",
    /eje4\(dx, dy, m\._eje4\)/.test(forest) && /pasoMob/.test(forest),
    "« y los bichos igual » — y de paso dejaron de atravesar rocas");
  /* la diagonal del A* no puede volver por la puerta de atrás */
  const nav = fs.readFileSync(path.join(RAIZ, "public/game/nav.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("nav.js no guarda vecinos diagonales", !/1,\s*1,\s*1\.414|1\.414/.test(nav));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — todavía se puede caminar en diagonal por algún lado"
  : "  Todo en orden: arriba, abajo, izquierda, derecha — y los bichos igual.");
process.exit(fallos ? 1 : 0);
