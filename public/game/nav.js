/* Golden Farm · pathfinding A* compartido (Granja y Bosque usan el mismo código).
   Se le pasa la función blocked(x,y,pad) de cada escena y el tamaño del mundo. */
window.GF = window.GF || {};
GF.Nav = class {
  constructor(blocked, W, H, cell) {
    this.blocked = blocked; this.W = W; this.H = H;
    this.S = cell || (GF.TILE / 2);   // nodo = media celda (21px)
    this.grid = null;
  }
  invalidate() { this.grid = null; }
  build() {
    const S = this.S;
    this.cols = Math.ceil(this.W / S); this.rows = Math.ceil(this.H / S);
    const g = new Uint8Array(this.cols * this.rows);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++)
      g[j * this.cols + i] = this.blocked(i * S + S / 2, j * S + S / 2, 8) ? 0 : 1;
    this.grid = g;
  }
  free(i, j) { return i >= 0 && j >= 0 && i < this.cols && j < this.rows && this.grid[j * this.cols + i] === 1; }
  pt(i, j) { return { x: i * this.S + this.S / 2, y: j * this.S + this.S / 2 }; }
  // nodo libre más cercano (destinos sobre un edificio, arranques en un rincón)
  nearestFree(x, y) {
    const i0 = Math.floor(x / this.S), j0 = Math.floor(y / this.S);
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
  // devuelve una lista de waypoints hasta el destino, o null si no hay camino
  find(sx, sy, tx, ty) {
    if (!this.grid) this.build();
    if (this.lineFree(sx, sy, tx, ty)) return [{ x: tx, y: ty }];
    const W = this.cols, N = this.cols * this.rows;
    const a0 = this.nearestFree(sx, sy), b0 = this.nearestFree(tx, ty);
    if (!a0 || !b0) return null;
    const tgtFree = !this.blocked(tx, ty, 6);   // destino sólido: se llega al borde
    const start = a0.j * W + a0.i, end = b0.j * W + b0.i;
    const gsc = new Float32Array(N).fill(Infinity), fsc = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const open = [start], inOpen = new Uint8Array(N), done = new Uint8Array(N);
    const h = (n) => { const i = n % W, j = (n - i) / W; return Math.hypot(i - b0.i, j - b0.j); };
    gsc[start] = 0; fsc[start] = h(start); inOpen[start] = 1;
    const DIRS = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
    while (open.length) {
      let b = 0; for (let a = 1; a < open.length; a++) if (fsc[open[a]] < fsc[open[b]]) b = a;
      const cur = open.splice(b, 1)[0]; inOpen[cur] = 0; done[cur] = 1;
      if (cur === end) break;
      const ci = cur % W, cj = (cur - ci) / W;
      for (const [di, dj, w] of DIRS) {
        const ni = ci + di, nj = cj + dj;
        if (!this.free(ni, nj)) continue;
        if (di && dj && (!this.free(ci + di, cj) || !this.free(ci, cj + dj))) continue;   // no cortar esquinas
        const nn = nj * W + ni; if (done[nn]) continue;
        const ng = gsc[cur] + w;
        if (ng < gsc[nn]) { gsc[nn] = ng; fsc[nn] = ng + h(nn); prev[nn] = cur; if (!inOpen[nn]) { open.push(nn); inOpen[nn] = 1; } }
      }
    }
    if (prev[end] < 0 && end !== start) return null;
    const nodes = []; for (let n = end; n >= 0; n = prev[n]) { nodes.unshift(n); if (n === start) break; }
    // suavizado: saltarse waypoints mientras haya línea recta libre
    const pts = nodes.map(n => this.pt(n % W, (n - n % W) / W));
    if (tgtFree) pts.push({ x: tx, y: ty });
    const out = []; let cx = sx, cy = sy, idx = 0;
    while (idx < pts.length) {
      let far = idx;
      for (let a = pts.length - 1; a >= idx; a--) if (this.lineFree(cx, cy, pts[a].x, pts[a].y)) { far = a; break; }
      out.push(pts[far]); cx = pts[far].x; cy = pts[far].y; idx = far + 1;
    }
    return out.length ? out : null;
  }
};
