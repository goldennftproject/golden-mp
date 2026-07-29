/* FarmScene: la granja privada. Fase 1 (mundo) + Fase 3 (interacciones). */
const CD = { tree: 8, rock: 10 };            // cooldown en segundos
const WITHER_MS = 120000;                    // 2 min listo sin cosechar → se marchita (valor de testeo)
const ACT_DUR = { chop: 1.2, mine: 1.2, plant: 0.6, harvest: 0.6, water: 0.6, fish: 1.5 };
function oreCdSec(tier) { return 10 + tier * 4; }

class FarmScene extends Phaser.Scene {
  constructor() { super("farm"); }

  create() {
    const W = GF.WORLD_W, H = GF.WORLD_H, T = GF.TILE;
    window.FARM = this;   // para restaurar la granja desde la config
    this.dragObj = null;
    this.queue = [];      // cola de acciones: clickeá varios objetivos y se hacen en orden
    this.cameras.main.setBackgroundColor("#6ba043");

    this.dragPlot = null; this.dragPond = false;
    // posiciones editadas de laguna y parcelas: primero base, después lo guardado
    if (GF.PLOTS_BASE) GF.PLOTS.forEach((b, i) => { b.col = GF.PLOTS_BASE[i].col; b.row = GF.PLOTS_BASE[i].row; });
    if (GF.POND_BASE) { GF.POND.col = GF.POND_BASE.col; GF.POND.row = GF.POND_BASE.row; }
    if (G.layoutPond && typeof G.layoutPond.col === "number") { GF.POND.col = G.layoutPond.col; GF.POND.row = G.layoutPond.row; }
    if (G.layoutPlots) for (const k in G.layoutPlots) { const b = GF.PLOTS[k]; if (b) { b.col = G.layoutPlots[k].col; b.row = G.layoutPlots[k].row; } }

    // fondo + estanque + lotes-tierra + grilla
    const g = this.add.graphics().setDepth(-1000);
    g.fillStyle(0x6ba043, 1).fillRect(0, 0, W, H);
    const p = GF.POND, pcx = (p.col + p.cols / 2) * T, pcy = (p.row + p.rows / 2) * T, pw = p.cols * T, ph = p.rows * T;
    if (this.textures.exists("pond")) {
      this.pondImg = this.add.image(pcx, pcy, "pond").setDisplaySize(pw + 10, ph + 10).setDepth(-999);
    } else {   // fallback: laguna dibujada (no movible sin sprite)
      g.fillStyle(0x2f5f8c, 1).fillEllipse(pcx, pcy, pw, ph);
      g.fillStyle(0x66a9dc, 1).fillEllipse(pcx, pcy - 6, pw - 26, ph - 26);
    }
    this.plotGrounds = [];
    if (this.textures.exists("plot")) {   // sprite de parcela de PixelLab; si falta, cae al dibujo
      GF.PLOTS.forEach(pl => this.plotGrounds.push(this.add.image((pl.col + 0.5) * T, (pl.row + 0.5) * T, "plot").setDisplaySize(T, T).setDepth(-998)));
    } else {
      GF.PLOTS.forEach(pl => { const x = pl.col * T, y = pl.row * T; g.fillStyle(0x8a5a33, 1); g.fillRoundedRect(x + 3, y + 3, T - 6, T - 6, 6); g.fillStyle(0x724829, 1); g.fillRoundedRect(x + 6, y + 6, T - 12, T - 12, 5); });
    }

    // pececitos nadando en la laguna
    this.pondFish = [];
    ["🐟", "🐠", "🐟"].forEach(em => {
      const p0 = this.pondPoint();
      const s = this.add.text(p0.x, p0.y, em, { fontSize: "13px" }).setOrigin(0.5).setDepth(-990).setAlpha(0.85);
      this.pondFish.push({ s, tgt: this.pondPoint(), sp: 10 + Math.random() * 12 });
    });
    g.lineStyle(1, 0x18300f, 0.13);
    for (let x = 0; x <= W; x += T) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath(); }
    for (let y = 0; y <= H; y += T) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath(); }
    g.lineStyle(4, 0x3c4d31, 0.9).strokeRect(0, 0, W, H);

    // cerca de madera cozy alrededor de la granja (horizontal de frente, vertical de canto)
    if (this.textures.exists("fence_top")) {
      const FH = T * 0.55, p2 = GF.POND;   // alto del tramo horizontal (de frente)
      const pondCell = (c, r) => c >= p2.col && c < p2.col + p2.cols && r >= p2.row && r < p2.row + p2.rows;
      for (let c = 1; c < GF.COLS - 1; c++) {
        if (!pondCell(c, 0)) this.add.image(c * T + T / 2, T * 0.58, "fence_top").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(2);
        if (!pondCell(c, GF.ROWS - 1)) this.add.image(c * T + T / 2, H + 6, "fence_bottom").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(H + 6);
      }
      for (let r = 1; r < GF.ROWS - 1; r++) {   // tira finita vista desde arriba
        if (!pondCell(0, r)) this.add.image(7, r * T + T, "fence_left").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(2);
        if (!pondCell(GF.COLS - 1, r)) this.add.image(W - 7, r * T + T, "fence_right").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(2);
      }
      const corner = (x, y, flip, hide) => { const c2 = this.add.image(x, y, "fence_corner").setDisplaySize(T * 0.7, T * 1.05).setOrigin(0.5, 1).setDepth(y > H / 2 ? y : 3); c2.flipX = !!flip; if (hide) c2.setVisible(false); };
      corner(9, T * 0.66, false, false);
      corner(W - 9, T * 0.66, true, false);
      corner(9, H + 6, false, pondCell(0, GF.ROWS - 1));
      corner(W - 9, H + 6, true, false);
    }

    // objetos del mundo (con estado para interacción)
    this.objs = GF.WORLD_OBJECTS.map((o, i) => {
      const lp = (G.layout && G.layout[i]) || null;                            // posición editada por el jugador
      const cx = lp ? lp.cx : o.cx, by = lp ? lp.by : o.by;
      const s = this.add.image(cx, by, o.key).setOrigin(0.5, 1);
      const rw = (o.type === "ore" || o.type === "rock") ? o.w * 0.84 : o.w;   // nodos algo más chicos, dentro de la celda
      s.setScale(rw / s.width); s.setDepth(by);
      return { i, type: o.type, ore: o.ore, cx, by, w: o.w, rw, baseKey: o.key, sprite: s, readyAt: 0 };
    });

    // (los rótulos flotantes se quitaron: los edificios nuevos se distinguen solos
    //  y el aviso de interacción ya los nombra al acercarse)

    // portal al Bosque (Fase D) — desactivado para la prueba sin bestiario
    if (window.ForestScene !== undefined || typeof ForestScene !== "undefined") {
      const px = GF.WORLD_W - 34, py = GF.WORLD_H - 46;
      this.add.text(px, py, "🌲", { fontSize: "26px" }).setOrigin(0.5, 1).setDepth(py);
      this.add.text(px, py + 14, "Bosque", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 0.5).setDepth(py);
      this.portal = { type: "portal", cx: px, by: py };
    }

    // (la pesca ya no usa un objeto en el piso; se pesca al acercarse al borde de la laguna)

    // timers de enfriamiento flotantes sobre árboles/rocas/nodos
    this.objs.forEach(o => {
      if (o.type === "tree" || o.type === "rock" || o.type === "ore") {
        o.timer = this.add.text(o.cx, o.by - T * 0.85, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(o.by + 3).setVisible(false);
      }
    });
    this.rebuildCollisions();

    // parcelas (ciclo arcade: seco → plantar semilla elegida → creciendo (con timer) → listo → cosechar)
    const savedPlots = Array.isArray(G.plots) ? G.plots : [];
    this.plots = GF.PLOTS.map((pl, i) => {
      const cx = (pl.col + 0.5) * T, cy = (pl.row + 0.5) * T;
      const spr = this.add.image(cx, cy + 6, "sprout").setOrigin(0.5, 0.95).setDepth(cy).setVisible(false);
      spr.setScale((T * 0.75) / spr.width);
      const emo = this.add.text(cx, cy + 8, "", { fontSize: Math.round(T * 0.72) + "px" }).setOrigin(0.5, 0.95).setDepth(cy).setVisible(false);
      const timer = this.add.text(cx, cy - T * 0.55, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(cy + 1).setVisible(false);
      const obj = { type: "plot", i, cx, by: cy, state: "dry", readyAt: 0, cropKey: null, spr, emo, timer, ground: this.plotGrounds[i] || null };
      const owned = Math.max(6, Math.min(GF.PLOTS.length, G.plotsOwned || 6));
      if (i >= owned) {   // parcela bloqueada: se compra con plata
        obj.state = "locked";
        if (obj.ground) { if (this.textures.exists("plot_blocked")) obj.ground.setTexture("plot_blocked").setDisplaySize(T, T); else obj.ground.setAlpha(0.45); }
        return obj;
      }
      const sv = savedPlots[i];   // restaura lo plantado antes del refresh (ignora estados viejos como "wet")
      if (sv && (sv.state === "growing" || sv.state === "ready")) {
        obj.state = sv.state; obj.readyAt = sv.readyAt || 0; obj.cropKey = sv.cropKey || null;
        obj.witherAt = sv.witherAt || 0;
        this.applyPlotVisual(obj);
        if (obj.state === "ready" && obj.witherAt && nowMs() >= obj.witherAt) this.setWithered(obj);
      } else if (sv && sv.state === "withered") { obj.state = "withered"; obj.cropKey = sv.cropKey || null; this.applyPlotVisual(obj); this.setWithered(obj); }
      return obj;
    });
    this.syncPlots();

    // amenazas (jabalíes)
    this.threats = [];
    this.nextThreatAt = nowMs() + 45000;

    // personaje
    const hero = this.add.sprite(470, 320, "idle_0").setOrigin(0.5, 1);
    this.idleScale = GF.SIZE.hero / hero.height;
    this.actScale = GF.SIZE.hero / 47;
    hero.setScale(this.idleScale);
    hero.play("idle");
    this.hero = hero; this.facing = "east"; this.moveTarget = null; this.action = null; this.pendingObj = null;

    // clic derecho sobre una parcela seca: rueda de sembrado rápido
    this.input.mouse.disableContextMenu();

    // clic: si pegás a un objeto, caminá hacia él e interactuá; si no, movete al punto
    this.input.on("pointerdown", (pt) => {
      if (pt.rightButtonDown()) {
        if (GF.uiOpen || GF.editMode) return;
        const wx = pt.worldX, wy = pt.worldY;
        for (const pl of this.plots) {
          if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) {
            if (pl.state === "dry" && typeof showSeedWheel === "function") showSeedWheel(pt.event.clientX, pt.event.clientY, pl);
            return;
          }
        }
        return;
      }
      if (GF.editMode) {   // modo edición: agarrar objeto, parcela o laguna bajo el cursor
        const wx = pt.worldX, wy = pt.worldY; let hit = null, bd = 1e9;
        for (const o of this.objs) { if (o.type === "fish") continue; const b = o.sprite.getBounds(); if (Phaser.Geom.Rectangle.Contains(b, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } } }
        if (hit) { hit.origCx = hit.cx; hit.origBy = hit.by; this.dragObj = hit; return; }
        for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { this.dragPlot = pl; return; } }
        if (this.pondImg && this.pondDist(wx, wy) < 1) { this.dragPond = true; return; }
        return;
      }
      if (GF.uiOpen) return;
      const wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const o of this.objs.concat(this.threats)) {
        const b = o.sprite.getBounds();
        if (Phaser.Geom.Rectangle.Contains(b, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } }
      }
      if (!hit) { for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { hit = pl; break; } } }
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;   // clic en el portal 🌲: caminar y teletransportarse
      if (this.action) {   // acción en curso: encolar el próximo objetivo (hasta 7) sin esperar la animación
        if (hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("📋 En cola (" + this.queue.length + ")"); }
        }
        return;
      }
      if (hit) {
        if (this.pendingObj && this.pendingObj !== hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("📋 En cola (" + this.queue.length + ")"); }
        } else { this.pendingObj = hit; this.moveTarget = { x: hit.cx, y: hit.by + 18 }; }
      }
      else if (this.nearPond() && this.pondDist(wx, wy) < 1.05) { this.pendingObj = null; this.moveTarget = null; this.tryFish(wx, wy); }
      else { this.pendingObj = null; this.moveTarget = { x: wx, y: wy }; }
    });
    // arrastre en modo edición: mueve el sprite y resalta la celda destino (verde libre / rojo ocupada)
    this.input.on("pointermove", (pt) => {
      if (!GF.editMode) return;
      if (!this.editHl) this.editHl = this.add.rectangle(0, 0, T, T, 0x7ec95a, 0.35).setOrigin(0, 1).setDepth(99998);
      if (this.dragObj) {
        const o = this.dragObj;
        o.sprite.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        const wCells = Math.max(1, Math.round(o.w / T));
        const leftCol = Phaser.Math.Clamp(Math.round((pt.worldX - wCells * T / 2) / T), 0, GF.COLS - wCells);
        const baseRow = Phaser.Math.Clamp(Math.round(pt.worldY / T), 1, GF.ROWS);
        const blocked = this.placeBlocked(o, leftCol, baseRow, wCells);
        this.editHl.setPosition(leftCol * T, baseRow * T).setSize(wCells * T, T)
          .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.4).setVisible(true);
      } else if (this.dragPlot) {
        const pl = this.dragPlot;
        if (pl.ground) pl.ground.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), 0, GF.COLS - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), 0, GF.ROWS - 1);
        const blocked = this.plotSpotBlocked(pl, col, row);
        this.editHl.setPosition(col * T, (row + 1) * T).setSize(T, T)
          .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.4).setVisible(true);
      } else if (this.dragPond) {
        const p2 = GF.POND;
        this.pondImg.setPosition(pt.worldX, pt.worldY);
        const col = Phaser.Math.Clamp(Math.round(pt.worldX / T - p2.cols / 2), 0, GF.COLS - p2.cols);
        const row = Phaser.Math.Clamp(Math.round(pt.worldY / T - p2.rows / 2), 0, GF.ROWS - p2.rows);
        const blocked = this.pondSpotBlocked(col, row);
        this.editHl.setPosition(col * T, (row + p2.rows) * T).setSize(p2.cols * T, p2.rows * T)
          .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.3).setVisible(true);
      }
    });
    this.input.on("pointerup", (pt) => {
      if (this.editHl) this.editHl.setVisible(false);
      if (!GF.editMode) { this.dragObj = this.dragPlot = null; this.dragPond = false; return; }
      // soltar una PARCELA
      if (this.dragPlot) {
        const pl = this.dragPlot; this.dragPlot = null;
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), 0, GF.COLS - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), 0, GF.ROWS - 1);
        if (this.plotSpotBlocked(pl, col, row)) {
          if (pl.ground) pl.ground.setPosition(pl.cx, pl.by).setDepth(-998);
          toast("🚫 Ahí ya hay algo — elegí otra celda"); return;
        }
        GF.PLOTS[pl.i].col = col; GF.PLOTS[pl.i].row = row;
        pl.cx = (col + 0.5) * T; pl.by = (row + 0.5) * T;
        if (pl.ground) pl.ground.setPosition(pl.cx, pl.by).setDepth(-998);
        pl.spr.setPosition(pl.cx, pl.by + 6).setDepth(pl.by);
        pl.emo.setPosition(pl.cx, pl.by + 8).setDepth(pl.by);
        pl.timer.setPosition(pl.cx, pl.by - T * 0.55).setDepth(pl.by + 1);
        if (pl.glowTxt) pl.glowTxt.setPosition(pl.cx + T * 0.3, pl.by - T * 0.55);
        if (!G.layoutPlots) G.layoutPlots = {};
        G.layoutPlots[pl.i] = { col, row };
        if (typeof saveFarm === "function") saveFarm(true);
        return;
      }
      // soltar la LAGUNA
      if (this.dragPond) {
        this.dragPond = false;
        const p2 = GF.POND;
        const col = Phaser.Math.Clamp(Math.round(pt.worldX / T - p2.cols / 2), 0, GF.COLS - p2.cols);
        const row = Phaser.Math.Clamp(Math.round(pt.worldY / T - p2.rows / 2), 0, GF.ROWS - p2.rows);
        const pcx0 = (p2.col + p2.cols / 2) * T, pcy0 = (p2.row + p2.rows / 2) * T;
        if (this.pondSpotBlocked(col, row)) {
          this.pondImg.setPosition(pcx0, pcy0);
          toast("🚫 La laguna no entra ahí"); return;
        }
        p2.col = col; p2.row = row;
        this.pondImg.setPosition((col + p2.cols / 2) * T, (row + p2.rows / 2) * T);
        this.pondFish.forEach(f => { const np = this.pondPoint(); f.s.setPosition(np.x, np.y); f.tgt = this.pondPoint(); });
        G.layoutPond = { col, row };
        if (typeof saveFarm === "function") saveFarm(true);
        return;
      }
      if (!this.dragObj) return;
      const o = this.dragObj, wCells = Math.max(1, Math.round(o.w / T));
      const leftCol = Phaser.Math.Clamp(Math.round((pt.worldX - wCells * T / 2) / T), 0, GF.COLS - wCells);
      const baseRow = Phaser.Math.Clamp(Math.round(pt.worldY / T), 1, GF.ROWS);
      if (this.placeBlocked(o, leftCol, baseRow, wCells)) {   // ocupado: devolver a su lugar
        o.sprite.setPosition(o.origCx, o.origBy).setDepth(o.origBy);
        if (o.timer) o.timer.setPosition(o.origCx, o.origBy - T * 0.85);
        toast("🚫 Ahí ya hay algo — elegí otra celda");
        this.dragObj = null; return;
      }
      o.cx = leftCol * T + wCells * T / 2; o.by = baseRow * T;
      o.sprite.setPosition(o.cx, o.by).setDepth(o.by);
      if (o.timer) o.timer.setPosition(o.cx, o.by - T * 0.85);
      if (!G.layout) G.layout = {}; G.layout[o.i] = { cx: o.cx, by: o.by };
      this.rebuildCollisions();
      if (typeof saveFarm === "function") saveFarm(true);
      this.dragObj = null;
    });

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.startFollow(hero, true, 0.15, 0.15);
    this.zoomUser = 1;
    this.fitCamera();
    this.scale.on("resize", this.fitCamera, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.fitCamera, this));
    // rueda del mouse: acercar/alejar la cámara de la granja
    this.input.on("wheel", (ptr, over, dx, dy) => {
      this.zoomUser = Phaser.Math.Clamp(this.zoomUser * (dy > 0 ? 0.9 : 1.1), 0.4, 2.4);
      this.fitCamera();
    });

    this.keys = this.input.keyboard.addKeys({
      up:"W", down:"S", left:"A", right:"D",
      aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT",
      plaza:"M", act:"E", act2:"SPACE",
    }, false);   // enableCapture=false: no bloquea el tipeo en el chat
    this.keys.plaza.on("down", () => { if (!GF.uiOpen && !this.action) this.scene.start("plaza"); });
    this.keys.act.on("down", () => this.doInteract());
    this.keys.act2.on("down", () => this.doInteract());
  }

  fitCamera() {
    const cw = this.scale.width, ch = this.scale.height;
    const fill = Math.max(GF.ZOOM, cw / GF.WORLD_W, ch / GF.WORLD_H);
    const seeAll = Math.min(cw / GF.WORLD_W, ch / GF.WORLD_H);   // alejar hasta ver todo el mundo
    this.cameras.main.setZoom(Phaser.Math.Clamp(fill * (this.zoomUser || 1), seeAll * 0.9, fill * 2.4));
  }

  spawnThreat() {
    const targets = this.plots.filter(p => p.state === "growing" || p.state === "ready");
    if (!targets.length) return;
    const tgt = targets[Math.floor(Math.random() * targets.length)];
    const s = this.add.sprite(24, 40, "boar").setOrigin(0.5, 1);
    const baseScale = (GF.TILE * 1.25) / s.width;
    s.setScale(baseScale).setDepth(40);
    this.threats.push({ type: "boar", sprite: s, cx: 24, by: 40, baseScale, tgt, damageAt: nowMs() + 15000 });
    G.week++; refreshHud();
    log("🐗 ¡Un jabalí apareció! Espantalo (clic/E) antes de que arruine un cultivo.", "bad");
    toast("🐗 ¡Jabalí! Espantalo");
  }

  // ---- interacción ----
  nearestInteract() {
    let best = null, bd = 1e9;
    const all = this.objs.concat(this.plots).concat(this.threats); if (this.portal) all.push(this.portal);
    for (const o of all) {
      const rad = (o.type === "barn" || o.type === "market" || o.type === "store") ? 72 : (o.type === "plot" ? 42 : (o.type === "boar" ? 55 : (o.type === "portal" ? 50 : 58)));
      const d = Math.hypot(o.cx - this.hero.x, o.by - this.hero.y);
      if (d < rad && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  promptText(o) {
    const cd = nowMs() < o.readyAt;
    if (o.type === "boar") return "🥍 Espantar jabalí";
    if (o.type === "plot") {
      if (o.state === "locked") return "🔒 Desbloquear parcela (" + plotUnlockCost() + " 🪙)";
      if (o.state === "withered") return "🥀 Limpiar cultivo marchito";
      if (o.state === "dry") { const cd = CROP_DEF[G.selSeed]; return "🌱 Plantar " + (cd ? cd.label : "cultivo"); }
      if (o.state === "ready") { const cd = CROP_DEF[o.cropKey]; return "🌾 Cosechar " + (cd ? cd.label : ""); }
      return "🌱 Creciendo…";
    }
    if (o.type === "portal") return "🌲 Teletransportarte al Bosque" + (G.swordOwned ? "" : " ⚠️ sin espada");
    const secs = cd ? Math.ceil((o.readyAt - nowMs()) / 1000) : 0;
    if (o.type === "tree") return cd ? "🪵 Vuelve en " + secs + "s" : "🪓 Talar madera";
    if (o.type === "rock") return cd ? "🪨 Vuelve en " + secs + "s" : "⛏️ Picar piedra";
    if (o.type === "ore") { const od = ORE_DEF[o.ore]; if (!od) return "⛏️ Minar"; if (cd) return od.emoji + " Vuelve en " + secs + "s"; return "⛏️ Minar " + od.label; }
    if (o.type === "barn") return "🏡 Granja";
    if (o.type === "market") return "🏪 Mercado";
    if (o.type === "store") return "🛠️ Herrería";
    if (o.type === "fish") return "🎣 Pescar (" + FISH_COST + " ✨ · tenés " + G.golden + ")";
    return "";
  }

  doInteract() { if (GF.uiOpen || this.action || GF.editMode) return; const o = this.nearestInteract(); if (o) this.interactWith(o); else if (this.nearPond()) this.tryFish(); }

  interactWith(o) {
    if (o.type === "portal") { if (typeof saveFarm === "function") saveFarm(); return this.scene.start("forest"); }
    if (o.type === "barn") return openOv("ov-barn");
    if (o.type === "market") return openOv("ov-market");
    if (o.type === "store") return openOv("ov-forge");
    if (o.type === "boar") { o.sprite.destroy(); const i = this.threats.indexOf(o); if (i >= 0) this.threats.splice(i, 1); log("🥍 Espantaste al jabalí.", "good"); toast("🥍 ¡Espantado!"); return; }   // XP de espada llega con el combate (necesita espada equipada)
    if (o.type === "plot") {
      if (o.state === "locked") {   // desbloquear con plata (doble clic para confirmar)
        const cost = plotUnlockCost();
        if (this.unlockPend === o && nowMs() < this.unlockPendUntil) {
          if (G.plata < cost) { toast("Te falta plata (" + cost + " 🪙)"); return; }
          G.plata -= cost; G.plotsOwned = (G.plotsOwned || 6) + 1; o.state = "dry"; this.unlockPend = null;
          if (o.ground && this.textures.exists("plot")) { o.ground.setTexture("plot").setDisplaySize(GF.TILE, GF.TILE); o.ground.setAlpha(1); }
          addXp("farming", 5); this.syncPlots();
          log("🔓 Desbloqueaste una parcela por " + cost + " 🪙.", "good"); toast("🔓 ¡Parcela desbloqueada!");
          refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
        } else {
          this.unlockPend = o; this.unlockPendUntil = nowMs() + 6000;
          toast("🔒 Desbloquear esta parcela: " + cost + " 🪙 — interactuá de nuevo para confirmar");
        }
        return;
      }
      if (o.state === "withered") {   // limpiar el cultivo perdido: la parcela vuelve a estar libre
        o.state = "dry"; o.cropKey = null; o.witherAt = 0;
        o.spr.clearTint().setAlpha(1).setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false);
        this.syncPlots(); log("🥀 Limpiaste el cultivo marchito.", "info"); toast("🧹 Parcela limpia");
        return;
      }
      // la azada/semilla se usan solas desde la bolsa (la hotbar sigue sirviendo para ELEGIR semilla)
      if (o.state === "dry") {
        const ck = G.selSeed, cd = CROP_DEF[ck];
        if (!cd) { toast("Elegí una semilla en la bolsa (I)"); return; }
        if (!cropUnlocked(ck)) { toast("Necesitás Cultivo nivel " + cd.lvl + " para " + cd.label); return; }
        if ((G.seeds[ck] || 0) <= 0) { toast("Sin semillas de " + cd.label + " — comprá en la Tienda"); return; }
        return this.startAction("plant", o);
      }
      if (o.state === "ready") return this.startAction("harvest", o);
      toast("🌱 Todavía está creciendo"); return;
    }
    if (o.type === "fish") { if (toolDur("rod") <= 0) { toast("🎣 Caña rota — reparala en la Herrería"); return; } if (G.golden < FISH_COST) { toast("Necesitás 5 ✨ para pescar"); return; } return this.startAction("fish", o); }
    if (nowMs() < o.readyAt) { toast(this.promptText(o)); return; }
    if (o.type === "ore") {
      const pk = equippedPick();   // el pico sale solo de la bolsa (el equipado define el tier)
      if (!pk) { toast("⛏️ Necesitás un pico — craftealo en la Herrería"); return; }
      const pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      if (od.tier > pd.mineTier) { toast("⛏️ Tu " + pd.label + " no puede con " + od.label); log("Necesitás un pico mejor para " + od.label + " (Herrería).", "bad"); return; }
      if ((G.picks.dur[pk] || 0) <= 0) { toast("🛠️ Pico roto — reparalo en la Herrería"); return; }
      this.startAction("mine", o);
    } else if (o.type === "tree") {
      if (toolDur("axe") <= 0) { toast("🪓 Hacha rota — reparala en la Herrería"); return; }
      this.startAction("chop", o);
    } else if (o.type === "rock") {
      const pk = equippedPick();
      if (!pk) { toast("⛏️ Necesitás un pico — craftealo en la Herrería"); return; }
      if ((G.picks.dur[pk] || 0) <= 0) { toast("🛠️ Pico roto — reparalo en la Herrería"); return; }
      this.startAction("mine", o);
    }
  }

  startAction(kind, o) {
    this.moveTarget = null;
    this.facing = (o.cx < this.hero.x) ? "west" : "east";
    this.action = { kind, o, t: 0, dur: ACT_DUR[kind] || 1.2 };
  }

  finishAction() {
    const a = this.action, o = a.o;
    if (a.kind === "chop") {
      const gr = Math.max(1, Math.round(3 * yieldMult()));
      if (tryAddRes("madera", gr)) { useTool("axe"); addXp("crafting", 4); o.readyAt = nowMs() + CD.tree * 1000 * cdMult(); this.setObjTex(o, "tree_stump", GF.TILE); log(`🪵 +${gr} Madera. 🪓 ${toolDur("axe")}/${TOOL_DEF.axe.max}`, "good"); toast("+" + gr + " 🪵"); refreshHud(); if (toolDur("axe") <= 0) { log("🪓 ¡El hacha se rompió! Reparala en la Herrería.", "bad"); toast("🪓 ¡Hacha rota!"); } }
      else toast("🎒 Inventario lleno");
    } else if (a.kind === "mine" && o.type === "rock") {
      const gr = Math.max(1, Math.round(2 * yieldMult()));
      if (tryAddRes("piedra", gr)) {
        const pk = equippedPick();   // picar piedra también gasta el pico (bug reportado)
        if (pk) { G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1); if (G.picks.dur[pk] <= 0) { log(`🛠️ ¡${PICK_DEF[pk].label} se rompió! Reparalo en la Herrería.`, "bad"); toast("🛠️ ¡Pico roto!"); } }
        addXp("mining", 5); o.readyAt = nowMs() + CD.rock * 1000 * cdMult(); this.setObjTex(o, "node_stone_mined", o.rw || GF.TILE); log(`🪨 +${gr} Piedra.` + (pk ? ` ⛏️ ${G.picks.dur[pk]}/${PICK_DEF[pk].dur}` : ""), "good"); toast("+" + gr + " 🪨"); refreshHud();
      }
      else toast("🎒 Inventario lleno");
    } else if (a.kind === "mine" && o.type === "ore") {
      const pk = equippedPick(), pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      let gr = Math.max(1, Math.round(od.yield * yieldMult())); if (pd.fast) gr *= 2;
      if (tryAddRes(o.ore, gr)) {
        G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1);
        addXp("mining", 5 + od.tier * 3);
        o.readyAt = nowMs() + oreCdSec(od.tier) * 1000 * cdMult();
        if (this.textures.exists(o.baseKey + "_mined")) this.setObjTex(o, o.baseKey + "_mined", o.rw || GF.TILE); else o.sprite.setAlpha(0.4);
        log(`${od.emoji} +${gr} ${od.label}. ⛏️ ${G.picks.dur[pk]}/${pd.dur}`, "good"); toast("+" + gr + " " + od.emoji); refreshHud();
        if (G.picks.dur[pk] <= 0) { log(`🛠️ ¡${pd.label} se rompió! Reparalo en la Herrería.`, "bad"); toast("🛠️ ¡Pico roto!"); }
      } else toast("🎒 Inventario lleno");
    } else if (a.kind === "plant") {
      const ck = G.selSeed, cd = CROP_DEF[ck];
      if (cd && (G.seeds[ck] || 0) > 0) {
        G.seeds[ck]--; o.cropKey = ck; o.state = "growing"; o.witherAt = 0; o.readyAt = nowMs() + cd.grow * 1000 * cdMult();
        o.growTotal = o.readyAt - nowMs();
        this.showGrowing(o);
        this.syncPlots(); addXp("farming", 5); log(`🌱 Plantaste ${cd.label}.`, "good"); toast("🌱 " + cd.label);
        if (isOpen("ov-inv")) refreshInv();
      }
    } else if (a.kind === "harvest") {
      const ck = o.cropKey || "papa", cd = CROP_DEF[ck] || CROP_DEF.papa;
      const gr = Math.max(1, Math.round(cd.yield * yieldMult()));
      if (tryAddRes(ck, gr)) { o.state = "dry"; o.cropKey = null; o.readyAt = 0; o.witherAt = 0; this.setPlotGlow(o, "off"); this.coinBurst(o.cx, o.by); o.spr.setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false); this.syncPlots(); addXp("farming", 10); log(`${cd.emoji} +${gr} ${cd.label}.`, "good"); toast("+" + gr + " " + cd.emoji); refreshHud(); }
      else toast("🎒 Inventario lleno");
    } else if (a.kind === "fish") {
      goFishing();
    }
    this.action = null;
  }

  setObjTex(o, key, targetW) { o.sprite.setTexture(key); o.sprite.setScale(targetW / o.sprite.width); }

  // distancia normalizada a la laguna (0 centro, 1 borde, >1 afuera)
  pondDist(x, y) {
    const p = GF.POND, T = GF.TILE;
    const ex = (p.col + p.cols / 2) * T, ey = (p.row + p.rows / 2) * T, rx = p.cols * T / 2, ry = p.rows * T / 2;
    const dx = (x - ex) / rx, dy = (y - ey) / ry;
    return Math.sqrt(dx * dx + dy * dy);
  }
  nearPond() { const d = this.pondDist(this.hero.x, this.hero.y); return d > 0.85 && d < 1.5; }
  // punto al azar bien adentro de la laguna (para los peces)
  pondPoint() {
    const p = GF.POND, T = GF.TILE;
    const ex = (p.col + p.cols / 2) * T, ey = (p.row + p.rows / 2) * T;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.62;
    return { x: ex + Math.cos(a) * r * (p.cols * T / 2), y: ey + Math.sin(a) * r * (p.rows * T / 2) };
  }
  tryFish(clickX, clickY) {
    if (this.action) return;
    if (toolDur("rod") <= 0) { toast("🎣 Caña rota — reparala en la Herrería"); return; }
    if (G.golden < FISH_COST) { toast("Necesitás " + FISH_COST + " ✨ para pescar (tenés " + G.golden + ")"); return; }
    const p = GF.POND, T = GF.TILE;
    this.splashAt(clickX != null ? clickX : (p.col + p.cols / 2) * T, clickY != null ? clickY : (p.row + p.rows / 2) * T);
    this.startAction("fish", { cx: (p.col + p.cols / 2) * T });
  }

  // marca visual breve sobre un objetivo encolado
  markQueued(o) {
    const m = this.add.text(o.cx, o.by - 30, "📋", { fontSize: "13px" }).setOrigin(0.5, 1).setDepth(99998);
    this.tweens.add({ targets: m, y: o.by - 42, alpha: { from: 1, to: 0 }, duration: 900, onComplete: () => m.destroy() });
  }

  // efecto de pesca: ondas expandiéndose + gotita en el punto clickeado del lago
  splashAt(x, y) {
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(x, y, 4, 0xbfe6ff, 0).setStrokeStyle(2, 0xdff2ff, 0.9).setDepth(-990);
      this.tweens.add({ targets: c, radius: 14 + i * 8, alpha: { from: 0.9, to: 0 }, delay: i * 140, duration: 600, onComplete: () => c.destroy() });
    }
    const d = this.add.text(x, y - 4, "💦", { fontSize: "14px" }).setOrigin(0.5, 1).setDepth(-989);
    this.tweens.add({ targets: d, y: y - 16, alpha: { from: 1, to: 0 }, duration: 700, onComplete: () => d.destroy() });
  }

  // ¿la celda destino de una PARCELA pisa un objeto, otra parcela o la laguna?
  plotSpotBlocked(pl, col, row) {
    const T = GF.TILE;
    for (const q of this.objs) {
      const qw = Math.max(1, Math.round(q.w / T));
      const qc = Math.round((q.cx - qw * T / 2) / T), qr = Math.round(q.by / T);
      if (row === qr - 1 && col >= qc && col < qc + qw) return true;
    }
    for (let j = 0; j < GF.PLOTS.length; j++) { if (j !== pl.i && GF.PLOTS[j].col === col && GF.PLOTS[j].row === row) return true; }
    const p = GF.POND;
    if (col >= p.col && col < p.col + p.cols && row >= p.row && row < p.row + p.rows) return true;
    return false;
  }

  // ¿el rectángulo destino de la LAGUNA pisa objetos o parcelas?
  pondSpotBlocked(col, row) {
    const T = GF.TILE, p = GF.POND;
    for (const q of this.objs) {
      const qw = Math.max(1, Math.round(q.w / T));
      const qc = Math.round((q.cx - qw * T / 2) / T), qr = Math.round(q.by / T);
      if (qr - 1 >= row && qr - 1 < row + p.rows && col < qc + qw && qc < col + p.cols) return true;
    }
    for (const b of GF.PLOTS) { if (b.col >= col && b.col < col + p.cols && b.row >= row && b.row < row + p.rows) return true; }
    return false;
  }

  // ¿la celda destino pisa otro objeto, una parcela o la laguna? (modo edición)
  placeBlocked(o, leftCol, baseRow, wCells) {
    const T = GF.TILE;
    for (const q of this.objs) {
      if (q === o || q.type === "fish") continue;
      const qw = Math.max(1, Math.round(q.w / T));
      const qc = Math.round((q.cx - qw * T / 2) / T), qr = Math.round(q.by / T);
      if (baseRow === qr && leftCol < qc + qw && qc < leftCol + wCells) return true;
    }
    for (const pl of GF.PLOTS) { if (pl.row + 1 === baseRow && pl.col >= leftCol && pl.col < leftCol + wCells) return true; }
    const p = GF.POND;
    if (baseRow > p.row && baseRow <= p.row + p.rows && leftCol < p.col + p.cols && p.col < leftCol + wCells) return true;
    return false;
  }

  // recalcula las colisiones a partir de las posiciones actuales de los objetos (tras editar)
  rebuildCollisions() {
    const T = GF.TILE;
    GF.COLLISIONS = this.objs.filter(o => o.type !== "fish").map(o => ({ cx: o.cx, cy: o.by - T * 0.5, rx: o.w * 0.44, ry: T * 0.5 }));
  }

  // brillo/efecto del cultivo: "half" (media cosecha) o "ready" (aura legendaria); cualquier otro valor lo apaga
  setPlotGlow(pl, mode) {
    if (pl.glowTw) { pl.glowTw.stop(); pl.glowTw = null; }
    if (pl.glowTxt) { pl.glowTxt.destroy(); pl.glowTxt = null; }
    if (pl.glowAura) { pl.glowAura.destroy(); pl.glowAura = null; }
    if (pl.glowSp) { pl.glowSp.forEach(s => s.destroy()); pl.glowSp = null; }
    pl.spr.setAlpha(1);
    if (mode === "half") {
      pl.glowTw = this.tweens.add({ targets: pl.spr, alpha: { from: 1, to: 0.72 }, yoyo: true, repeat: -1, duration: 700 });
    } else if (mode === "ready") {
      const T = GF.TILE;
      // aura dorada pulsante detrás del cultivo ("tócame ya")
      pl.glowAura = this.add.circle(pl.cx, pl.by - 4, T * 0.52, 0xffd76a, 0.28).setDepth(pl.by - 1);
      this.tweens.add({ targets: pl.glowAura, scale: { from: 0.9, to: 1.18 }, alpha: { from: 0.32, to: 0.12 }, yoyo: true, repeat: -1, duration: 650 });
      // chispas alrededor, con destellos alternados
      pl.glowSp = [];
      [[-0.38, -0.6], [0.36, -0.35], [0, -0.85]].forEach(([ox, oy], i) => {
        const s = this.add.text(pl.cx + ox * T, pl.by + oy * T, i === 2 ? "✨" : "✦", { fontSize: i === 2 ? "12px" : "9px", color: "#ffe9a8" }).setOrigin(0.5).setDepth(pl.by + 2);
        this.tweens.add({ targets: s, alpha: { from: 1, to: 0.1 }, scale: { from: 1, to: 1.35 }, yoyo: true, repeat: -1, duration: 420 + i * 160, delay: i * 180 });
        pl.glowSp.push(s);
      });
      pl.glowTw = this.tweens.add({ targets: pl.spr, scale: { from: pl.spr.scale, to: pl.spr.scale * 1.06 }, yoyo: true, repeat: -1, duration: 650 });
    }
  }

  // al cosechar: el brillo explota y caen monedas (feedback del diseñador)
  coinBurst(x, y) {
    const flash = this.add.circle(x, y - 8, 6, 0xffe9a8, 0.85).setDepth(99998);
    this.tweens.add({ targets: flash, scale: 4, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    for (let i = 0; i < 5; i++) {
      const c = this.add.text(x, y - 12, "🪙", { fontSize: "12px" }).setOrigin(0.5).setDepth(99999);
      this.tweens.add({
        targets: c, x: x + (Math.random() - 0.5) * 52, y: y - 26 - Math.random() * 26,
        alpha: { from: 1, to: 0 }, duration: 520 + Math.random() * 240, delay: i * 40,
        onComplete: () => c.destroy(),
      });
    }
  }

  // brote mientras crece
  showGrowing(pl) {
    pl.half = false; this.setPlotGlow(pl, "off");
    pl.spr.clearTint().setAlpha(1);
    pl.spr.setTexture("sprout").setVisible(true);
    pl.spr.setScale((GF.TILE * 0.75) / pl.spr.width);
    pl.emo.setVisible(false);
  }
  // cultivo (conjunto) cuando está listo; si falta el sprite, cae al emoji
  showReadyCrop(pl) {
    const key = "cropg_" + pl.cropKey;
    if (pl.cropKey && this.textures.exists(key)) {
      pl.spr.setTexture(key).setVisible(true);
      pl.spr.setScale((GF.TILE * 0.95) / pl.spr.width);
      pl.emo.setVisible(false);
    } else {
      pl.spr.setVisible(false);
      const cd = CROP_DEF[pl.cropKey];
      pl.emo.setText(cd ? cd.emoji : "🌾").setVisible(true);
    }
    pl.timer.setVisible(false);
    this.setPlotGlow(pl, "ready");
  }
  // pinta la parcela según su estado (para restaurar tras un refresh)
  applyPlotVisual(pl) {
    if (pl.state === "growing") { this.showGrowing(pl); pl.growTotal = (CROP_DEF[pl.cropKey] ? CROP_DEF[pl.cropKey].grow * 1000 : 0); }
    else if (pl.state === "ready") this.showReadyCrop(pl);
    else { this.setPlotGlow(pl, "off"); pl.spr.setVisible(false); pl.emo.setVisible(false); pl.timer.setVisible(false); }
  }

  // vuelca el estado de las parcelas a G.plots para que el autoguardado lo persista
  syncPlots() { if (this.plots) G.plots = this.plots.map(pl => ({ state: pl.state, readyAt: pl.readyAt, cropKey: pl.cropKey, witherAt: pl.witherAt || 0 })); }

  // el cultivo listo que nadie cosechó se marchita (se pierde)
  setWithered(pl) {
    pl.state = "withered"; pl.witherAt = 0; pl.readyAt = 0;
    this.setPlotGlow(pl, "off");
    if (pl.spr.visible) { pl.spr.setTint(0x7a6f52).setAlpha(0.75); }
    else { pl.emo.setText("🥀").setVisible(true); }
    pl.timer.setVisible(false);
  }

  update(time, deltaMs) {
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero;

    // restaurar objetos que salieron de cooldown
    const t = nowMs();
    for (const o of this.objs) {
      if (o.readyAt && t >= o.readyAt) {
        o.readyAt = 0;
        if (o.type === "tree" || o.type === "rock") this.setObjTex(o, o.baseKey, o.rw || o.w);
        else if (o.type === "ore") { this.setObjTex(o, o.baseKey, o.rw || o.w); o.sprite.setAlpha(1); }
        if (o.timer) o.timer.setVisible(false);
      } else if (o.readyAt && o.timer) {
        // cuarta.docx: el timer del recurso solo aparece con el cursor encima (al clickear ya sale el aviso)
        const p = this.input.activePointer;
        const over = o.sprite.visible && Phaser.Geom.Rectangle.Contains(o.sprite.getBounds(), p.worldX, p.worldY);
        if (over) o.timer.setText(Math.ceil((o.readyAt - t) / 1000) + "s").setVisible(true);
        else o.timer.setVisible(false);
      }
    }
    // lotes: pasar de "creciendo" a "listo"
    for (const pl of this.plots) {
      // listo sin cosechar: cuenta regresiva al marchitado
      if (pl.state === "ready" && pl.witherAt) {
        const left = pl.witherAt - t;
        if (left <= 0) { this.setWithered(pl); this.syncPlots(); log("🥀 Un cultivo se marchitó sin cosechar.", "bad"); toast("🥀 Cultivo marchito"); continue; }
        if (left < 30000) pl.timer.setText("🥀 " + Math.ceil(left / 1000) + "s").setVisible(true);
      }
      if (pl.state !== "growing") continue;
      if (t >= pl.readyAt) { pl.state = "ready"; pl.readyAt = 0; pl.witherAt = t + WITHER_MS; this.showReadyCrop(pl); this.syncPlots(); }
      else {
        pl.timer.setText(Math.max(0, Math.ceil((pl.readyAt - t) / 1000)) + "s").setVisible(true);
        // a media cosecha: el brote crece y titila suave
        if (!pl.half && pl.growTotal && (pl.readyAt - t) <= pl.growTotal / 2) {
          pl.half = true;
          pl.spr.setScale((GF.TILE * 0.92) / pl.spr.width);
          this.setPlotGlow(pl, "half");
        }
      }
    }
    // peces de la laguna: nadan de un punto a otro
    if (this.pondFish) for (const f of this.pondFish) {
      const dx = f.tgt.x - f.s.x, dy = f.tgt.y - f.s.y, d = Math.hypot(dx, dy);
      if (d < 3) { f.tgt = this.pondPoint(); f.sp = 10 + Math.random() * 12; }
      else { const sp = Math.min(f.sp * dt, d); f.s.x += dx / d * sp; f.s.y += dy / d * sp; f.s.setScale(dx < 0 ? -1 : 1, 1); }
    }
    // amenazas (jabalíes)
    if (t >= this.nextThreatAt && this.threats.length === 0) { this.nextThreatAt = t + 60000; this.spawnThreat(); }
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const b = this.threats[i];
      const dx = b.tgt.cx - b.cx, dy = b.tgt.by - b.by, d = Math.hypot(dx, dy);
      if (d > 2) { const sp = Math.min(70 * dt, d); b.cx += dx / d * sp; b.by += dy / d * sp; }
      b.sprite.setPosition(b.cx, b.by).setDepth(b.by).setScale((dx < 0 ? -1 : 1) * b.baseScale, b.baseScale);
      if (t >= b.damageAt) {
        if (b.tgt.state === "growing" || b.tgt.state === "ready") { b.tgt.state = "dry"; b.tgt.cropKey = null; b.tgt.readyAt = 0; this.setPlotGlow(b.tgt, "off"); b.tgt.spr.setVisible(false); b.tgt.emo.setVisible(false); b.tgt.timer.setVisible(false); this.syncPlots(); log("🐗 Un jabalí arruinó un cultivo.", "bad"); toast("🐗 Cultivo arruinado"); }
        b.sprite.destroy(); this.threats.splice(i, 1);
      }
    }

    // acción en curso: bloquea movimiento
    if (this.action) {
      this.action.t += dt;
      if (this.action.t >= this.action.dur) this.finishAction();
      const sign = this.facing === "west" ? -1 : 1;
      if (this.action) {
        hero.setScale(sign * this.actScale, this.actScale);
        const key = "act_" + this.action.kind;
        if (hero.anims.currentAnim?.key !== key) hero.play(key);
      }
      hero.setDepth(hero.y);
      this.updatePrompt();
      return;
    }

    // movimiento
    let vx = 0, vy = 0;
    if (GF.uiOpen || GF.editMode) { this.moveTarget = null; this.pendingObj = null; this.queue.length = 0; }
    else {
      if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
      if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
      if (vx || vy) { this.moveTarget = null; this.pendingObj = null; }
      else if (this.moveTarget) { const dx = this.moveTarget.x - hero.x, dy = this.moveTarget.y - hero.y, d = Math.hypot(dx, dy); if (d < 4) this.moveTarget = null; else { vx = dx / d; vy = dy / d; } }
    }
    const moving = !!(vx || vy);
    if (moving) {
      const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      const step = GF.SPEED * dt, nx = hero.x + vx * step, ny = hero.y + vy * step;
      let moved = false;
      if (!GF.blockedAt(nx, ny, 6)) { hero.x = nx; hero.y = ny; moved = true; }
      else { if (vx && !GF.blockedAt(nx, hero.y, 6)) { hero.x = nx; moved = true; } if (vy && !GF.blockedAt(hero.x, ny, 6)) { hero.y = ny; moved = true; } }
      if (!moved && this.moveTarget) this.moveTarget = null;
      if (vx < 0) this.facing = "west"; else if (vx > 0) this.facing = "east";
    }

    // clic-para-interactuar: al llegar cerca del objeto pedido, actuar
    if (this.pendingObj) {
      const po = this.pendingObj;
      const rad = (po.type === "barn" || po.type === "market" || po.type === "store") ? 72 : 58;
      const d = Math.hypot(po.cx - hero.x, po.by - hero.y);
      if (d < rad) { this.moveTarget = null; this.pendingObj = null; this.interactWith(po); if (this.action) { hero.setDepth(hero.y); return; } }
      else if (!this.moveTarget) this.pendingObj = null;
    }
    // cola: al quedar libre, ir al siguiente objetivo clickeado
    if (!this.action && !this.pendingObj && !this.moveTarget && this.queue.length) {
      const nxt = this.queue.shift();
      this.pendingObj = nxt; this.moveTarget = { x: nxt.cx, y: nxt.by + 18 };
    }

    const sign = this.facing === "west" ? -1 : 1;
    hero.setScale(sign * this.idleScale, this.idleScale);
    if (moving) { if (hero.anims.currentAnim?.key !== "walk") hero.play("walk"); }
    else { if (hero.anims.currentAnim?.key !== "idle") hero.play("idle"); }
    hero.setDepth(hero.y);

    this.updatePrompt();
  }

  updatePrompt() {
    const el = $("prompt"); if (!el) return;
    if (GF.uiOpen || this.action || GF.editMode) { el.classList.remove("show"); return; }
    const o = this.nearestInteract();
    if (o) { el.textContent = this.promptText(o) + "  ·  [E]"; el.classList.add("show"); }
    else if (this.nearPond()) { el.textContent = "🎣 Pescar (" + FISH_COST + " ✨ · tenés " + G.golden + ") · [E]"; el.classList.add("show"); }
    else el.classList.remove("show");
  }
}
