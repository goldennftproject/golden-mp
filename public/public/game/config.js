/* Golden Farm · configuración compartida (medidas y layout del mundo) */
window.GF = window.GF || {};

GF.TILE = 42;                 // celda de diseño (16px SFL x 2.625)
GF.WORLD_W = 960;             // tamaño de la granja
GF.WORLD_H = 600;
GF.SPEED = 175;              // px/seg del personaje
GF.ZOOM = 1.35;

// tamaños de dibujo (ancho objetivo en px), tomados de la granja canvas
const T = GF.TILE;
GF.SIZE = {
  hero: Math.round(T * 1.4),   // por ALTURA (para que no cambie con la herramienta)
  tree: Math.round(T * 2.1),
  tree_stump: T,
  rock: Math.round(T * 1.35),
  rock_mined: T,
  node: Math.round(T * 1.15),
  barn: Math.round(T * 2.7),
  market: Math.round(T * 2.1),
  store: Math.round(T * 2.1),
  duck: Math.round(T * 0.75),
  wheat: 38, sprout: 34,
};

// objetos estáticos del mundo: {sprite, x, y, size}
GF.TREES = [ [770,150], [865,250], [730,330] ];
GF.ROCKS = [ [865,390], [775,455] ];
GF.ORES = [
  { ore:'stone',     sprite:'node_stone',     x:700, y:500 },
  { ore:'bronze',    sprite:'node_bronze',    x:770, y:545 },
  { ore:'gold',      sprite:'node_gold',      x:850, y:555 },
  { ore:'diamond',   sprite:'node_diamond',   x:905, y:500 },
  { ore:'netherite', sprite:'node_netherite', x:915, y:430 },
];
GF.BUILDINGS = [
  { sprite:'barn',   x:540, y:130, size:GF.SIZE.barn },
  { sprite:'market', x:470, y:505, size:GF.SIZE.market },
  { sprite:'store',  x:620, y:470, size:GF.SIZE.store },
];
GF.POND = { x:60, y:400, w:250, h:170 };   // esquina sup-izq + tamaño
GF.FISH = { x:345, y:475 };
// lotes 3 filas x 4 columnas
GF.PLOTS = [];
(function(){ const gap=46; for(let r=0;r<3;r++) for(let c=0;c<4;c++) GF.PLOTS.push({ x:96+c*gap, y:135+r*gap }); })();

// colisiones (elipses) — para que no atravieses objetos
GF.COLLISIONS = [];
(function(){
  GF.TREES.forEach(t => GF.COLLISIONS.push({ cx:t[0], cy:t[1]-2, rx:18, ry:10 }));
  GF.ROCKS.forEach(r => GF.COLLISIONS.push({ cx:r[0], cy:r[1]-2, rx:22, ry:11 }));
  GF.ORES.forEach(n => GF.COLLISIONS.push({ cx:n.x, cy:n.y-2, rx:19, ry:10 }));
  GF.COLLISIONS.push({ cx:540, cy:130-6, rx:46, ry:18 });   // barn
  GF.COLLISIONS.push({ cx:470, cy:505-14, rx:40, ry:16 });  // market
  GF.COLLISIONS.push({ cx:620, cy:470-14, rx:40, ry:16 });  // store
})();

GF.blockedAt = function(x, y, pad){
  pad = pad || 0;
  if (x < 12 || y < 12 || x > GF.WORLD_W - 12 || y > GF.WORLD_H - 12) return true;
  // estanque
  const p = GF.POND, ex = p.x + p.w/2, ey = p.y + p.h/2, erx = p.w/2 + pad, ery = p.h/2 + pad;
  const dxp = (x-ex)/erx, dyp = (y-ey)/ery;
  if (dxp*dxp + dyp*dyp < 1) return true;
  for (const c of GF.COLLISIONS){
    const dx = (x-c.cx)/(c.rx+pad), dy = (y-c.cy)/(c.ry+pad);
    if (dx*dx + dy*dy < 1) return true;
  }
  return false;
};
