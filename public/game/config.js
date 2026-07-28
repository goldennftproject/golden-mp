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
GF.WORLD_OBJECTS.push(snap("market", {type:"market"}, 470, 505, T*2));                                                    // 2 celdas
GF.WORLD_OBJECTS.push(snap("store",  {type:"store"},  650, 480, T*2));                                                    // 2 celdas
// quinta.docx: 5 árboles y 4 piedras en total — agregados AL FINAL para no romper layouts guardados
[[695,115],[915,300]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));
[[705,420],[830,480]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));

// lotes 4x3, cada uno 1 celda, alineados a la grilla (col 2, fila 3)
GF.PLOTS = [];
(function(){ const c0=2, r0=3; for(let r=0;r<3;r++) for(let c=0;c<4;c++) GF.PLOTS.push({ col:c0+c, row:r0+r }); })();

// estanque: rectángulo de celdas (col 0-5, fila 10-13)
GF.POND = { col:0, row:10, cols:6, rows:4 };
GF.FISH = { col:7, row:11 };

// colisiones derivadas del footprint (celdas de la base)
GF.COLLISIONS = GF.WORLD_OBJECTS.map(o => ({
  cx: o.cx, cy: o.by - T*0.5,
  rx: o.wCells * T * 0.44, ry: T*0.5,
}));

GF.blockedAt = function(x, y, pad){
  pad = pad || 0;
  if (x < 12 || y < 12 || x > GF.WORLD_W - 12 || y > GF.WORLD_H - 12) return true;
  const p = GF.POND, px = p.col*T, py = p.row*T, pw = p.cols*T, ph = p.rows*T;
  const ex = px + pw/2, ey = py + ph/2;
  const dxp = (x-ex)/(pw/2 + pad), dyp = (y-ey)/(ph/2 + pad);
  if (dxp*dxp + dyp*dyp < 1) return true;
  for (const c of GF.COLLISIONS){
    const dx = (x-c.cx)/(c.rx+pad), dy = (y-c.cy)/(c.ry+pad);
    if (dx*dx + dy*dy < 1) return true;
  }
  return false;
};
