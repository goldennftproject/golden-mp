/* Golden Farm · configuración compartida (layout en TILES, alineado a la grilla) */
window.GF = window.GF || {};

GF.TILE = 42;
GF.COLS = 23; GF.ROWS = 15;                 // mundo en celdas enteras
GF.WORLD_W = GF.COLS * GF.TILE;             // 966
GF.WORLD_H = GF.ROWS * GF.TILE;             // 630
GF.SPEED = 175;
GF.ZOOM = 1.35;
GF.editMode = false;   // modo edición de la granja (arrastrar objetos)

const T = GF.TILE;
GF.SIZE = { hero: Math.round(T * 1.4), wheat: 38, sprout: 34 };

// snap: recibe posición en píxeles + tamaño deseado en px; devuelve un objeto
// con ancho en CELDAS ENTERAS y anclado a la grilla (borde izq y base sobre líneas).
function snap(key, meta, x, y, sizePx) {
  const wCells = Math.max(1, Math.round(sizePx / T));
  const leftCol = Math.max(0, Math.round((x - wCells * T / 2) / T));
  const baseRow = Math.round(y / T);
  const cx = leftCol * T + wCells * T / 2;   // centro X
  const by = baseRow * T;                    // base (abajo) sobre una línea
  return Object.assign({ key, cx, by, w: wCells * T, wCells, leftCol, baseRow }, meta || {});
}

// --- objetos del mundo (posiciones aprox. de la granja, ahora encajadas en celdas) ---
GF.WORLD_OBJECTS = [];
[[770,150],[865,250],[730,330]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));       // 2 celdas
[[865,390],[775,455]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));             // 1 celda (mismo boulder nuevo)
[["piedra","node_stone",700,500],["bronce","node_bronze",770,545],["oro","node_gold",850,555],
 ["diamante","node_diamond",905,500],["netherita","node_netherite",915,430]]
  .forEach(o => GF.WORLD_OBJECTS.push(snap(o[1], {type:"ore", ore:o[0]}, o[2], o[3], T)));                                // 1 celda
GF.WORLD_OBJECTS.push(snap("barn",   {type:"barn"},   540, 150, T*3));                                                    // 3 celdas
GF.WORLD_OBJECTS.push(snap("market", {type:"market"}, 470, 505, T*2));                                                    // 2 celdas (más chico que la herrería)
GF.WORLD_OBJECTS.push(snap("store",  {type:"store"},  650, 480, T*3));                                                    // 3 celdas
// quinta.docx: 5 árboles y 4 piedras en total — agregados AL FINAL para no romper layouts guardados
[[695,115],[915,300]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));
[[705,420],[830,480]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));
// edificio de Cocina (detalles 29/7) — también al FINAL para preservar layouts guardados
GF.WORLD_OBJECTS.push(snap("cocina", {type:"cocina"}, 390, 296, T*3));                                                     // 3 celdas
// dummy de práctica de espada (detalless.docx) — entrenar sube Espada, cooldown 4h
GF.WORLD_OBJECTS.push(snap("dummy", {type:"dummy"}, 585, 350, T));                                                         // 1 celda (se dibuja +25%)
// nodo de HIERRO (detalles213) — al FINAL para preservar layouts guardados; se mina con el pico de bronce
GF.WORLD_OBJECTS.push(snap("node_iron", {type:"ore", ore:"hierro"}, 930, 555, T));
// HORNO DE PIEDRA (detalles viernes 1): acá se funden todos los lingotes/barras
GF.WORLD_OBJECTS.push(snap("horno", {type:"horno"}, 320, 470, T*2));
// viernes (2): 6 árboles y 6 piedras en total (1 activo + 5 por desbloquear) — al FINAL para preservar layouts
GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, 950, 205, T*2));
GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, 900, 470, T));
GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, 745, 515, T));

// lotes 4x3, cada uno 1 celda, alineados a la grilla (col 2, fila 3)
GF.PLOTS = [];
(function(){ const c0=2, r0=3; for(let r=0;r<3;r++) for(let c=0;c<4;c++) GF.PLOTS.push({ col:c0+c, row:r0+r }); })();

// estanque: rectángulo de celdas (4x3) — separado del borde para no cortar la cerca
GF.POND = { col:1, row:10, cols:4, rows:3 };
// copias base (para "Restaurar" después de mover parcelas/laguna en edición)
GF.PLOTS_BASE = GF.PLOTS.map(p => ({ col: p.col, row: p.row }));
GF.POND_BASE = { col: GF.POND.col, row: GF.POND.row };
GF.FISH = { col:7, row:11 };

// --- footprint SÓLIDO por tipo de objeto ---
// Solo estorba lo que de verdad pisa el suelo: el TRONCO del árbol (no la copa), la BASE del
// edificio (no el tejado). Así se puede pasar entre dos árboles y caminar por detrás de las casas.
//   hw = mitad del ancho, como fracción del ancho dibujado · dep = profundidad, en celdas
GF.SOLID = {
  tree:   { hw: 0.17, dep: 0.32 },   // solo el tronco
  rock:   { hw: 0.40, dep: 0.34 },
  ore:    { hw: 0.40, dep: 0.34 },
  barn:   { hw: 0.46, dep: 0.58 },   // base completa del edificio
  market: { hw: 0.46, dep: 0.58 },
  store:  { hw: 0.46, dep: 0.58 },
  cocina: { hw: 0.46, dep: 0.58 },
  dummy:  { hw: 0.24, dep: 0.26 },
  cofre:  { hw: 0.34, dep: 0.30 },
};
GF.solidRect = function (o) {
  const d = GF.SOLID[o.type] || { hw: 0.40, dep: 0.36 };
  const w = o.rw || o.w || T;
  return { cx: o.cx, by: o.by, hw: w * d.hw, dep: T * d.dep };
};
GF.COLLISIONS = GF.WORLD_OBJECTS.map(o => GF.solidRect(o));

GF.blockedAt = function(x, y, pad){
  pad = pad || 0;
  // la cerca del borde es sólida: no se puede pisar ni traspasar
  if (x < 18 || y < T * 0.72 || x > GF.WORLD_W - 18 || y > GF.WORLD_H - 16) return true;
  const p = GF.POND, px = p.col*T, py = p.row*T, pw = p.cols*T, ph = p.rows*T;
  const ex = px + pw/2, ey = py + ph/2;
  const dxp = (x-ex)/(pw/2 + pad), dyp = (y-ey)/(ph/2 + pad);
  if (dxp*dxp + dyp*dyp < 1) return true;
  // rectángulos (no elipses): el borde es predecible y no se cuela por las esquinas
  for (const c of GF.COLLISIONS){
    if (x > c.cx - c.hw - pad && x < c.cx + c.hw + pad &&
        y > c.by - c.dep - pad && y < c.by + pad) return true;
  }
  return false;
};
