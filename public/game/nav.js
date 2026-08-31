/* Golden Farm · pathfinding A* compartido (Granja y Bosque usan el mismo código).
   Se le pasa la función blocked(x,y,pad) de cada escena y el tamaño del mundo. */
window.GF = window.GF || {};
GF.Nav = class {
  /* 18/8: la grilla arrancaba SIEMPRE en (0,0). Con las expansiones el mundo de la granja puede
     empezar en coordenadas negativas, y ahí cualquier x<0 daba índice negativo → "no hay camino"
     en medio mapa, más una franja de grilla sobrante por el otro lado. Ahora se le puede pasar el
     ORIGEN; sin él vale 0 y el Bosque sigue funcionando igual. */
  constructor(blocked, W, H, ox, oy, cell) {
    this.blocked = blocked; this.W = W; this.H = H;
    this.OX = ox || 0; this.OY = oy || 0;
    this.S = cell || (GF.TILE / 2);   // nodo = media celda (21px)
    this.grid = null;
  }
  invalidate() { this.grid = null; }
  build() {
    const S = this.S;
    this.cols = Math.ceil(this.W / S); this.rows = Math.ceil(this.H / S);
    const g = new Uint8Array(this.cols * this.rows);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++)
      g[j * this.cols + i] = this.blocked(this.OX + i * S + S / 2, this.OY + j * S + S / 2, 8) ? 0 : 1;
    this.grid = g;
  }
  free(i, j) { return i >= 0 && j >= 0 && i < this.cols && j < this.rows && this.grid[j * this.cols + i] === 1; }
  pt(i, j) { return { x: this.OX + i * this.S + this.S / 2, y: this.OY + j * this.S + this.S / 2 }; }
  // nodo libre más cercano (destinos sobre un edificio, arranques en un rincón)
  nearestFree(x, y) {
    const i0 = Math.floor((x - this.OX) / this.S), j0 = Math.floor((y - this.OY) / this.S);
    if (this.free(i0, j0)) return { i: i0, j: j0 };
    for (let r = 1; r <= 8; r++) {
      let bd = 1e9, bi = -1, bj = -1;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !this.free(i0 + di, j0 + dj)) continue;
        const p = this.pt(i0 + di, j0 + dj), d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; bi = i0 + di; bj = j0 + dj; }
      }
      if (bi >= 0) return { i: bi, j: bj };
    }
    return null;
  }
  // ¿se puede ir en línea recta? (así las rutas cortas no salen escalonadas)
  lineFree(x0, y0, x1, y1) {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 7));
    for (let k = 1; k <= n; k++) { const t = k / n; if (this.blocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 6)) return false; }
    return true;
  }
  /* devuelve una lista de waypoints hasta el destino, o null si no hay camino.

     31/8 — EL CAMINO ES EN CUATRO DIRECCIONES (dirección, con los vídeos de referencia): « las
     esquinas deberían estar bloqueadas; para cruzar por un lugar te movés con esas cuatro
     direcciones ». Tres cosas cambiaron acá, y las tres eran fuentes de diagonales:
       · los OCHO vecinos del A* pasan a ser CUATRO — antes el camino salía en diagonal de fábrica;
       · el atajo « ¿hay línea recta al destino? » solo vale si esa recta es horizontal o
         vertical — antes cualquier destino a la vista se iba en diagonal pura sin pisar el A*;
       · el suavizado ya no se salta waypoints por línea libre (esa línea era diagonal): ahora
         solo COMPRIME tramos colineales, así el camino queda hecho de eles.
     Quien recorre el camino (eje4 en cada escena) hace la parte que falta: el tramo del héroe al
     primer nodo y del último al destino exacto también se caminan eje por eje. */
  find(sx, sy, tx, ty) {
    if (!this.grid) this.build();
    const recta = (Math.abs(tx - sx) < 6 || Math.abs(ty - sy) < 6);
    if (recta && this.lineFree(sx, sy, tx, ty)) return [{ x: tx, y: ty }];
    const W = this.cols, N = this.cols * this.rows;
    const a0 = this.nearestFree(sx, sy), b0 = this.nearestFree(tx, ty);
    if (!a0 || !b0) return null;
    const tgtFree = !this.blocked(tx, ty, 6);   // destino sólido: se llega al borde
    const start = a0.j * W + a0.i, end = b0.j * W + b0.i;
    const gsc = new Float32Array(N).fill(Infinity), fsc = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const open = [start], inOpen = new Uint8Array(N), done = new Uint8Array(N);
    /* la heurística acompaña: Manhattan, que es la distancia real cuando solo hay cuatro rumbos */
    const h = (n) => { const i = n % W, j = (n - i) / W; return Math.abs(i - b0.i) + Math.abs(j - b0.j); };
    gsc[start] = 0; fsc[start] = h(start); inOpen[start] = 1;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (open.length) {
      let b = 0; for (let a = 1; a < open.length; a++) if (fsc[open[a]] < fsc[open[b]]) b = a;
      const cur = open.splice(b, 1)[0]; inOpen[cur] = 0; done[cur] = 1;
      if (cur === end) break;
      const ci = cur % W, cj = (cur - ci) / W;
      for (const [di, dj] of DIRS) {
        const ni = ci + di, nj = cj + dj;
        if (!this.free(ni, nj)) continue;
        const nn = nj * W + ni; if (done[nn]) continue;
        const ng = gsc[cur] + 1;
        if (ng < gsc[nn]) { gsc[nn] = ng; fsc[nn] = ng + h(nn); prev[nn] = cur; if (!inOpen[nn]) { open.push(nn); inOpen[nn] = 1; } }
      }
    }
    if (prev[end] < 0 && end !== start) return null;
    const nodes = []; for (let n = end; n >= 0; n = prev[n]) { nodes.unshift(n); if (n === start) break; }
    const pts = nodes.map(n => this.pt(n % W, (n - n % W) / W));
    if (tgtFree) pts.push({ x: tx, y: ty });
    /* LOS MUÑONES TAMBIÉN VAN EN ELES. Los nodos de la grilla ya son axiales entre sí, pero el
       tramo del héroe al PRIMER nodo y el del último nodo al DESTINO exacto salían oblicuos —
       cortos (media celda), pero diagonales al fin. Se les mete su esquina, eligiendo de los dos
       codos posibles el que no esté bloqueado. */
    const linea = [];
    let ant = { x: sx, y: sy };
    for (const p of pts) {
      if (Math.abs(p.x - ant.x) > 1 && Math.abs(p.y - ant.y) > 1) {
        const c1 = { x: p.x, y: ant.y }, c2 = { x: ant.x, y: p.y };
        if (!this.blocked(c1.x, c1.y, 6)) linea.push(c1);
        else if (!this.blocked(c2.x, c2.y, 6)) linea.push(c2);
      }
      linea.push(p); ant = p;
    }
    /* compresión colineal: de una fila de veinte nodos hacia el este queda solo el último. El
       camino resultante son las ESQUINAS de las eles, que es lo único que hace falta seguir. */
    const out = [];
    for (let i = 0; i < linea.length; i++) {
      if (out.length >= 2) {
        const a = out[out.length - 2], b = out[out.length - 1], c = linea[i];
        const mismaX = Math.abs(a.x - b.x) < 1 && Math.abs(b.x - c.x) < 1;
        const mismaY = Math.abs(a.y - b.y) < 1 && Math.abs(b.y - c.y) < 1;
        if (mismaX || mismaY) { out[out.length - 1] = c; continue; }
      }
      out.push(linea[i]);
    }
    return out.length ? out : null;
  }
};
