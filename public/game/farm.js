/* FarmScene: la granja privada. Fase 1 (mundo) + Fase 3 (interacciones). */
// CD (enfriamiento árbol/piedra) ahora vive en state.js para el panel de balanceo
function witherMs(ck) { const cd = CROP_DEF[ck]; return cd ? cd.grow * 1000 * 0.5 : 120000; }   // marchitado proporcional: mitad del tiempo de cultivo
const ACT_DUR = { chop: 0.9, mine: 0.85, plant: 0.6, harvest: 0.6, water: 0.6, fish: 1.5 };   // "detallitos (1)" punto 11: 1 golpe por clic
var GOLPES_TALAR = 3, GOLPES_MINAR = 3;   // clics necesarios para tumbar un árbol o romper una roca (editable)
// (los enfriamientos ahora salen de ORE_DEF[x].cd y de nodoCd(), doc 4/8)

class FarmScene extends Phaser.Scene {
  constructor() { super("farm"); }

  create() {
    const W = GF.WORLD_W, H = GF.WORLD_H, T = GF.TILE;
    window.FARM = this;   // para restaurar la granja desde la config
    // Phaser REUTILIZA la instancia al reiniciar la escena: hay que soltar todo lo cacheado,
    // porque apunta a objetos ya destruidos (y usarlos rompía el juego al volver del Bosque).
    this.hoverFx = null; this.nearFx = null;
    this.destMk = null; this.destTw = null;
    this.dummyObj = null; this.dummyTimer = null;
    this.editHl = null; this._nav = null; this.storeObj = null; this.forgeGlow = null;
    this.bobber = null; this.bobberTween = null; this.fishLine = null;
    this.hold = null; this.path = null; this.holdLast = null; this.holdPend = null;
    this.pathStuck = 0; this.lastDD = null; this.noProg = 0;
    this.unlockPend = null; this.leaving = false;
    this.dragObj = null; this.dragPlot = null; this.dragPond = false;
    this.queue = [];      // cola de acciones: clickeá varios objetivos y se hacen en orden
    this.cameras.main.setBackgroundColor(GF.ISLA ? "#2e7fa8" : "#6ba043");   // isla: agua alrededor

    this.dragPlot = null; this.dragPond = false;
    // posiciones editadas de laguna y parcelas: primero base, después lo guardado
    if (GF.PLOTS_BASE) GF.PLOTS.forEach((b, i) => { b.col = GF.PLOTS_BASE[i].col; b.row = GF.PLOTS_BASE[i].row; });
    if (GF.POND_BASE) { GF.POND.col = GF.POND_BASE.col; GF.POND.row = GF.POND_BASE.row; }
    if (G.layoutPond && typeof G.layoutPond.col === "number") { GF.POND.col = G.layoutPond.col; GF.POND.row = G.layoutPond.row; }
    if (G.layoutPlots) for (const k in G.layoutPlots) { const b = GF.PLOTS[k]; if (b) { b.col = G.layoutPlots[k].col; b.row = G.layoutPlots[k].row; } }

    // fondo + estanque + lotes-tierra + grilla
    const g = this.add.graphics().setDepth(-1000);
    // SUELO NUEVO (31/7): tiles de pasto seamless con variantes esparcidas — chau damero
    if (this.textures.exists("grass_a")) {
      const rt = this.add.renderTexture(0, 0, GF.COLS * T, GF.ROWS * T).setOrigin(0).setDepth(-1000);
      let gseed = 20260731;
      const grnd = () => { gseed = (gseed * 1664525 + 1013904223) >>> 0; return gseed / 4294967296; };
      const hasB = this.textures.exists("grass_b"), hasC = this.textures.exists("grass_c");
      for (let r = 0; r < GF.ROWS; r++) for (let c = 0; c < GF.COLS; c++) {
        const x = grnd();
        const key = (x < 0.55 || (!hasB && !hasC)) ? "grass_a" : (x < 0.90 && hasB ? "grass_b" : (hasC ? "grass_c" : "grass_a"));
        rt.draw(key, c * T, r * T);
      }
    } else {   // respaldo: el damero de siempre
      for (let r = 0; r < GF.ROWS; r++) for (let c = 0; c < GF.COLS; c++) {
        g.fillStyle((r + c) % 2 === 0 ? 0x4c6e34 : 0x466730, 1);
        g.fillRect(c * T, r * T, T, T);
      }
    }
    // detalles del césped (semilla fija): sprites de PixelLab; si faltan, el dibujo por código de antes
    let dseed = 20260730;
    const drnd = () => { dseed = (dseed * 1664525 + 1013904223) >>> 0; return dseed / 4294967296; };
    const deco = this.add.graphics().setDepth(-999.5);
    const DKEYS = ["deco_pasto", "deco_flor_blanca", "deco_flor_amarilla", "deco_piedras"];
    const hasDecos = DKEYS.every(k => this.textures.exists(k));
    for (let i = 0; i < (hasDecos ? 110 : 210); i++) {
      const dx = 8 + drnd() * (W - 16), dy = 8 + drnd() * (H - 16), t = drnd();
      if (hasDecos) {
        // pasto pesa doble; tamaños chicos y variados para que respiren
        const key = t < 0.45 ? "deco_pasto" : (t < 0.67 ? "deco_flor_blanca" : (t < 0.89 ? "deco_flor_amarilla" : "deco_piedras"));
        const sz = key === "deco_pasto" ? 15 + drnd() * 6 : (key === "deco_piedras" ? 11 + drnd() * 4 : 13 + drnd() * 4);
        this.add.image(dx, dy, key).setDisplaySize(sz, sz).setDepth(-999.5).setFlipX(drnd() < 0.5);
        continue;
      }
      if (t < 0.72) {          // matita de pasto
        const col = drnd() < 0.6 ? 0x3a5c2a : 0x608442;
        deco.lineStyle(1, col, 1);
        for (let b = 0; b < 3; b++) { deco.beginPath(); deco.moveTo(dx + b * 2, dy + 3); deco.lineTo(dx + b * 2 + (drnd() * 3 - 1.5), dy - 2 - drnd() * 3); deco.strokePath(); }
      } else if (t < 0.92) {   // florcita
        const cols = [0xf0ebc8, 0xebbe5a, 0xdca0be];
        deco.fillStyle(cols[(drnd() * 3) | 0], 1).fillCircle(dx, dy, 2);
        deco.fillStyle(0x967832, 1).fillCircle(dx, dy, 0.8);
      } else {                 // piedrita
        deco.fillStyle(0x8c8778, 1).fillEllipse(dx, dy, 6, 4);
        deco.lineStyle(1, 0x5a564a, 1).strokeEllipse(dx, dy, 6, 4);
      }
    }
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

    // viernes (2): movimiento del agua — ondas elípticas que se expanden y destellos que titilan
    this.pondWaves = [];
    {
      const pd = GF.POND;
      const rx = () => (pd.col + 0.55 + Math.random() * (pd.cols - 1.1)) * T;
      const ry = () => (pd.row + 0.55 + Math.random() * (pd.rows - 1.1)) * T;
      for (let i = 0; i < 3; i++) {   // ondas: anillos que nacen, crecen y se disuelven
        const ring = this.add.ellipse(rx(), ry(), 10, 5).setStrokeStyle(1.5, 0xbfe3f2, 0.5).setFillStyle().setDepth(-997).setAlpha(0);
        const loop = () => {
          ring.setPosition(rx(), ry()).setScale(0.4).setAlpha(0.55);
          this.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 2600 + Math.random() * 900, ease: "Sine.easeOut", onComplete: loop });
        };
        this.time.delayedCall(i * 1100, loop);
        this.pondWaves.push(ring);
      }
      for (let i = 0; i < 4; i++) {   // destellos: chispitas de sol sobre el agua
        const sp = this.add.ellipse(rx(), ry(), 3.5, 1.6, 0xeaf7ff, 0.8).setDepth(-997).setAlpha(0);
        const tw = () => {
          sp.setPosition(rx(), ry());
          this.tweens.add({ targets: sp, alpha: { from: 0, to: 0.75 }, duration: 500 + Math.random() * 400, yoyo: true, hold: 300, ease: "Sine.easeInOut", onComplete: () => this.time.delayedCall(400 + Math.random() * 1200, tw) });
        };
        this.time.delayedCall(300 + i * 700, tw);
        this.pondWaves.push(sp);
      }
    }

    // pececitos nadando en la laguna (sprites cozy; si faltan, emoji)
    this.pondFish = [];
    const FISH_SIZES = [[15, 11], [20, 15], [12, 9]];   // cada pez de un tamaño distinto
    ["fish_comun", "fish_raro", "fish_comun"].forEach((fk, fi) => {
      const p0 = this.pondPoint(), sz = FISH_SIZES[fi];
      const s = this.textures.exists(fk)
        ? this.add.image(p0.x, p0.y, fk).setDisplaySize(sz[0], sz[1]).setOrigin(0.5).setDepth(-990).setAlpha(0.9)
        : this.add.text(p0.x, p0.y, fi === 1 ? "" : "", { fontSize: "13px" }).setOrigin(0.5).setDepth(-990).setAlpha(0.85);
      this.pondFish.push({ s, tgt: this.pondPoint(), sp: 10 + Math.random() * 12 });
    });
    // cuadriculado: solo visible en modo edición (detalles 29/7)
    this.gridG = this.add.graphics().setDepth(-999.4).setVisible(!!GF.editMode);
    this.gridG.lineStyle(1, 0x18300f, 0.25);
    for (let x = 0; x <= W; x += T) { this.gridG.beginPath(); this.gridG.moveTo(x, 0); this.gridG.lineTo(x, H); this.gridG.strokePath(); }
    for (let y = 0; y <= H; y += T) { this.gridG.beginPath(); this.gridG.moveTo(0, y); this.gridG.lineTo(W, y); this.gridG.strokePath(); }
    g.lineStyle(4, 0x3c4d31, 0.9).strokeRect(0, 0, W, H);

    // cerca de madera cozy alrededor de la granja (horizontal de frente, vertical de canto)
    if (this.textures.exists("fence_top")) {
      const FH = T * 0.55, p2 = GF.POND;   // alto del tramo horizontal (de frente)
      const pondCell = (c, r) => c >= p2.col && c < p2.col + p2.cols && r >= p2.row && r < p2.row + p2.rows;
      // horizontales de punta a punta (incluyen las celdas de esquina)
      for (let c = 0; c < GF.COLS; c++) {
        if (!pondCell(c, 0)) this.add.image(c * T + T / 2, T * 0.58, "fence_top").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(2);
        if (!pondCell(c, GF.ROWS - 1)) this.add.image(c * T + T / 2, H + 6, "fence_bottom").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(H + 6);
      }
      // verticales de arriba a abajo: al cruzarse con las horizontales en las esquinas, la unión
      // es perfecta por construcción (son las mismas piezas, sin sprite de esquina aparte)
      for (let r = 0; r < GF.ROWS; r++) {
        if (!pondCell(0, r)) this.add.image(7, r * T + T, "fence_left").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(3);
        if (!pondCell(GF.COLS - 1, r)) this.add.image(W - 7, r * T + T, "fence_right").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(3);
      }
    }

    // objetos del mundo (con estado para interacción)
    let __treeN = 0, __rockN = 0;   // viernes (2): orden de desbloqueo de árboles y piedras
    this.objs = GF.WORLD_OBJECTS.map((o, i) => {
      const lp = (G.layout && G.layout[i]) || null;                            // posición editada por el jugador
      const cx = lp ? lp.cx : o.cx, by = lp ? lp.by : o.by;
      // el portal es sprite para poder animar el espiral girando; el resto sigue como imagen
      const texKey = this.textures.exists(o.key) ? o.key : "store";   // respaldo si falta el arte (p.ej. horno.png aún no bajado)
      const s = (o.key === "portal" ? this.add.sprite(cx, by, texKey) : this.add.image(cx, by, texKey)).setOrigin(0.5, 1);
      if (o.key === "portal" && this.anims.exists("portal_spin")) s.play("portal_spin");
      // edificios sin construir (viernes 1): en sombra/difuminados hasta pagar la receta
      if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) s.setAlpha(0.5).setTint(0x555555);
      // viernes (2): árboles y piedras bloqueados (1 activo + resto difuminado, se desbloquean en orden)
      let lockIdx = -1;
      if (o.type === "tree") lockIdx = __treeN++;
      if (o.type === "rock") lockIdx = __rockN++;
      const locked = (o.type === "tree" && !(G.treesOpen || [0]).includes(lockIdx)) ||
                     (o.type === "rock" && !(G.rocksOpen || [0]).includes(lockIdx));
      if (locked) s.setAlpha(0.5).setTint(0x555555);
      const rw = (o.type === "ore" || o.type === "rock") ? o.w * 0.67       // minerales −20% (detalles jueves; antes 0.84)
        : (o.type === "tree") ? o.w * 0.8                                   // árboles −20%
        : (o.type === "market" || o.type === "store") ? o.w * 0.8           // tiendas −20%
        : (o.type === "dummy" ? o.w * 1.25 : o.w);                          // dummy +25%
      s.setScale(rw / s.width); s.setDepth(by);
      // sombra bajo árboles y edificios (detalles 29/7)
      let shadow = null;
      // los árboles NO llevan sombra: su sprite ya trae la base de tierra dibujada y la elipse quedaba abajo de la tierra
      if (o.type === "barn" || o.type === "market" || o.type === "store" || o.type === "cocina" || o.type === "horno" || o.type === "altar" || o.type === "establo" || o.type === "curtiduria" || o.type === "ofrendas") {
        shadow = this.add.ellipse(cx, by - 3, rw * 0.82, T * 0.3, 0x1c2a12, 0.22).setDepth(by - 0.5);
      } else if (o.type === "dummy") {   // sombra chiquita bajo el dummy
        shadow = this.add.ellipse(cx, by - 2, rw * 0.55, T * 0.2, 0x1c2a12, 0.2).setDepth(by - 0.5);
      }
      return { i, type: o.type, ore: o.ore, cx, by, w: o.w, rw, baseKey: o.key, sprite: s, shadow, readyAt: 0, lockIdx, locked };
    });

    // (los rótulos flotantes se quitaron: los edificios nuevos se distinguen solos
    //  y el aviso de interacción ya los nombra al acercarse)

    // portal al Bosque — ahora con su sprite cozy (arco de piedra con vórtice)
    if (window.ForestScene !== undefined || typeof ForestScene !== "undefined") {
      const px = GF.WORLD_W - 40, py = GF.WORLD_H - 40;
      let pspr = null;
      if (this.textures.exists("portal")) {
        // sprite (no imagen) para que el espiral gire 360° en loop; el latido sutil se mantiene
        pspr = this.add.sprite(px, py, "portal").setOrigin(0.5, 1).setDepth(py);
        pspr.setScale((T * 1.4) / pspr.width);
        if (this.anims.exists("portal_spin")) pspr.play("portal_spin");
        this.tweens.add({ targets: pspr, scaleY: pspr.scaleY * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });   // latido sutil del vórtice
      } else {
        this.add.text(px, py, "", { fontSize: "26px" }).setOrigin(0.5, 1).setDepth(py);
      }
      this.add.text(px, py + 12, "Zona Negra", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 0.5).setDepth(py);
      this.portal = { type: "portal", cx: px, by: py, sprite: pspr, w: T * 1.4 };
    }

    // (la pesca ya no usa un objeto en el piso; se pesca al acercarse al borde de la laguna)

    // timers de enfriamiento flotantes sobre árboles/rocas/nodos
    this.objs.forEach(o => {
      if (o.type === "tree" || o.type === "rock" || o.type === "ore") {
        o.timer = this.add.text(o.cx, o.by - T * 0.85, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(o.by + 3).setVisible(false);
      }
    });
    // ——— ISLA SOBRE EL MAR ("detallitos (1)" punto 6): agua alrededor de la granja, orilla y olas ———
    if (GF.ISLA) {
      const MAR = (GF.ISLA_MARGEN || 260) + 900;   // el mar tapa todo lo que la cámara pueda mostrar
      const g = this.add.graphics().setDepth(-1000);
      g.fillStyle(0x2e7fa8, 1).fillRect(-MAR, -MAR, GF.WORLD_W + MAR * 2, GF.WORLD_H + MAR * 2);   // mar profundo
      g.fillStyle(0x3fa3cc, 1).fillRoundedRect(-70, -70, GF.WORLD_W + 140, GF.WORLD_H + 140, 90);  // agua clara del bajío
      g.fillStyle(0xe8d9a6, 1).fillRoundedRect(-34, -34, GF.WORLD_W + 68, GF.WORLD_H + 68, 60);    // arena de la orilla
      g.fillStyle(0x7fbf5a, 1).fillRoundedRect(-8, -8, GF.WORLD_W + 16, GF.WORLD_H + 16, 34);      // borde de pasto
      // espuma: líneas claras que van y vienen sobre la orilla
      this.olas = this.add.graphics().setDepth(-999);
      this.olasT = 0;
    }
    this.rebuildCollisions();
    GF.scene = "farm";
    window.farmScene = this;   // para refrescar la flecha del tutorial desde la UI
    this.time.delayedCall(400, () => { if (typeof tutoSync === "function") tutoSync(true); else this.updateTutoArrow(); });   // cartel + flecha del tutorial

    // parcelas (ciclo arcade: seco → plantar semilla elegida → creciendo (con timer) → listo → cosechar)
    const savedPlots = Array.isArray(G.plots) ? G.plots : [];
    this.plots = GF.PLOTS.map((pl, i) => {
      const cx = (pl.col + 0.5) * T, cy = (pl.row + 0.5) * T;
      const spr = this.add.image(cx, cy + 6, "sprout").setOrigin(0.5, 0.95).setDepth(cy).setVisible(false);
      spr.setScale((T * 0.75) / spr.width);
      const emo = this.add.text(cx, cy + 8, "", { fontSize: Math.round(T * 0.72) + "px" }).setOrigin(0.5, 0.95).setDepth(cy).setVisible(false);
      const timer = this.add.text(cx, cy - T * 0.55, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(cy + 1).setVisible(false);
      const obj = { type: "plot", i, cx, by: cy, state: "dry", readyAt: 0, cropKey: null, spr, emo, timer, ground: this.plotGrounds[i] || null };
      const owned = Math.max(2, Math.min(GF.PLOTS.length, G.plotsOwned || 2));   // viernes (2): se nace con 2 parcelas
      if (i >= owned) {   // parcela bloqueada: se compra con plata
        obj.state = "locked";
        if (obj.ground) { if (this.textures.exists("plot_blocked")) obj.ground.setTexture("plot_blocked").setDisplaySize(T, T).setTint(0x8f8f8f).setAlpha(0.8); else obj.ground.setAlpha(0.45); }   // apagado: se nota que no se puede usar
        return obj;
      }
      const sv = savedPlots[i];   // restaura lo plantado antes del refresh (ignora estados viejos como "wet")
      if (sv && (sv.state === "growing" || sv.state === "ready")) {
        obj.state = sv.state; obj.readyAt = sv.readyAt || 0; obj.cropKey = sv.cropKey || null;
        obj.witherAt = 0;   // 2/8: sin marchitado
        this.applyPlotVisual(obj);
      } else if (sv && sv.state === "withered") {
        // 2/8: los cultivos que quedaron marchitos de antes se recuperan como LISTOS si se sabe qué eran; si no, parcela libre
        if (sv.cropKey) { obj.state = "ready"; obj.cropKey = sv.cropKey; obj.witherAt = 0; this.applyPlotVisual(obj); }
        else { obj.state = "dry"; obj.cropKey = null; this.applyPlotVisual(obj); }
      }
      return obj;
    });
    this.syncPlots();

    // amenazas (jabalíes)
    this.threats = [];
    this.nextThreatAt = nowMs() + 45000;

    // personaje
    const hero = this.add.sprite(470, 320, "hero_idle_0").setOrigin(0.5, 1);
    this.idleScale = GF.SIZE.hero / hero.height;
    // el granjero definitivo comparte escala de cuerpo entre quieto y acciones (mismo lienzo PixelLab)
    this.actScale = this.idleScale;
    hero.setScale(this.idleScale);
    hero.play("idle");
    this.hero = hero; this.facing = "east"; this.moveTarget = null; this.path = null; this.action = null; this.pendingObj = null;
    if (GF.NO_WALK) hero.setVisible(false);   // el granjero solo se ve en la Zona Negra
    this.updateAura();

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
        for (const o of this.objs) { if (o.type === "fish") continue; if (this.hitsSprite(o.sprite, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } } }
        if (hit) { hit.origCx = hit.cx; hit.origBy = hit.by; this.dragObj = hit; return; }
        for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { this.dragPlot = pl; return; } }
        if (this.pondImg && this.pondDist(wx, wy) < 1) { this.dragPond = true; return; }
        return;
      }
      if (GF.uiOpen) return;
      const wx = pt.worldX, wy = pt.worldY;
      this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false };   // por si esto se convierte en un arrastre
      let hit = null, bd = 1e9;
      for (const o of this.objs.concat(this.threats)) {
        if (this.hitsSprite(o.sprite, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } }
      }
      if (!hit) { for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { hit = pl; break; } } }
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;   // clic en el portal : caminar y teletransportarse
      if (this.action) {   // acción en curso: encolar el próximo objetivo (hasta 7) sin esperar la animación
        if (hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("En cola (" + this.queue.length + ")"); }
        }
        return;
      }
      if (GF.NO_WALK) {   // granja de un clic: se actúa directo, sin caminar hasta el objeto
        if (this.hold && this.hold.active) return;   // venía arrastrando la vista: no es un clic
        if (hit) { this.pendingObj = null; this.interactWith(hit); }
        else if (this.pondDist(wx, wy) < 1.05) this.tryFish(wx, wy);
        return;
      }
      if (hit) {
        if (this.pendingObj && this.pendingObj !== hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("En cola (" + this.queue.length + ")"); }
        } else { this.pendingObj = hit; this.goTo(hit.cx, hit.by + 18); }
      }
      else if (this.nearPond() && this.pondDist(wx, wy) < 1.05) { this.pendingObj = null; this.moveTarget = null; this.tryFish(wx, wy); }
      else { this.pendingObj = null; this.goTo(wx, wy); }
    });
    // arrastre en modo edición: mueve el sprite y resalta la celda destino (verde libre / rojo ocupada)
    this.input.on("pointermove", (pt) => {
      if (!GF.editMode) {
        if (GF.CAM_PAN) {   // ARRASTRAR la granja (como SFL): el mundo se mueve con el cursor
          if (!this.hold || GF.uiOpen || !pt.isDown || pt.rightButtonDown()) return;
          if (!this.hold.active && Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) < 10) return;
          this.hold.active = true;
          const c = this.cameras.main, z = c.zoom || 1;
          const dx = (this.hold.px == null ? pt.x : this.hold.px) - pt.x;
          const dy = (this.hold.py == null ? pt.y : this.hold.py) - pt.y;
          this.hold.px = pt.x; this.hold.py = pt.y;
          const L = this.camLim || { x1: 0, y1: 0, x2: GF.WORLD_W, y2: GF.WORLD_H };
          c.scrollX = Phaser.Math.Clamp(c.scrollX + dx / z, L.x1, Math.max(L.x1, L.x2 - c.width / z));
          c.scrollY = Phaser.Math.Clamp(c.scrollY + dy / z, L.y1, Math.max(L.y1, L.y2 - c.height / z));
          return;
        }
        // CLIC SOSTENIDO: si mantenés apretado y movés el cursor, el granjero te sigue
        // (rodeando árboles y edificios) hasta el punto que estés señalando
        if (!this.hold || GF.uiOpen || !pt.isDown || pt.rightButtonDown()) return;
        if (!this.hold.active && Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) < 16) return;   // clic corto ≠ arrastre
        if (!this.hold.active) {
          if (this.action) return;   // con una acción en curso el arrastre no manda (no borra la cola)
          this.hold.active = true; this.pendingObj = null; this.clearQueue();
        }
        this.holdSeek(pt.worldX, pt.worldY);
        return;
      }
      if (!this.editHl) this.editHl = this.add.rectangle(0, 0, T, T, 0x7ec95a, 0.35).setOrigin(0, 1).setDepth(99998);
      if (this.dragObj) {
        const o = this.dragObj;
        o.sprite.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        if (o.shadow) o.shadow.setPosition(pt.worldX, pt.worldY - 3);
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
      // al soltar el clic sostenido, el granjero sigue caminando hasta el último punto señalado
      if (this.hold) { if (!GF.CAM_PAN && this.hold.active && this.holdPend) { const p = this.holdPend; this.holdPend = null; this.holdSeek(p.x, p.y); } this.hold = null; }
      if (!GF.editMode) { this.dragObj = this.dragPlot = null; this.dragPond = false; return; }
      // soltar una PARCELA
      if (this.dragPlot) {
        const pl = this.dragPlot; this.dragPlot = null;
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), 0, GF.COLS - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), 0, GF.ROWS - 1);
        if (this.plotSpotBlocked(pl, col, row)) {
          if (pl.ground) pl.ground.setPosition(pl.cx, pl.by).setDepth(-998);
          toast("Ahí ya hay algo — elegí otra celda"); return;
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
          toast("La laguna no entra ahí"); return;
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
        if (o.shadow) o.shadow.setPosition(o.origCx, o.origBy - 3).setDepth(o.origBy - 0.5);
        if (o.timer) o.timer.setPosition(o.origCx, o.origBy - T * 0.85);
        toast("Ahí ya hay algo — elegí otra celda");
        this.dragObj = null; return;
      }
      o.cx = leftCol * T + wCells * T / 2; o.by = baseRow * T;
      o.sprite.setPosition(o.cx, o.by).setDepth(o.by);
      if (o.shadow) o.shadow.setPosition(o.cx, o.by - 3).setDepth(o.by - 0.5);
      if (o.timer) o.timer.setPosition(o.cx, o.by - T * 0.85);
      if (o.type === "cofre") { const c = G.chests && G.chests[o.chestIdx]; if (c) { c.col = leftCol; c.row = baseRow - 1; } }
      else { if (!G.layout) G.layout = {}; G.layout[o.i] = { cx: o.cx, by: o.by }; }
      this.rebuildCollisions();
      if (typeof saveFarm === "function") saveFarm(true);
      this.dragObj = null;
    });

    // bocanadas de humo IRREGULARES (blobs procedurales, no círculos)
    if (!this.textures.exists("puff0")) {
      for (let p = 0; p < 3; p++) {
        const gg = this.make.graphics({ add: false });
        gg.fillStyle(0xffffff, 1);
        gg.fillCircle(8, 8, 5);
        gg.fillCircle(11 + p, 6, 3.4);
        gg.fillCircle(5 - p, 9, 3);
        gg.fillCircle(9 - p * 2, 12, 2.6);
        gg.fillCircle(12, 10 + p, 2.2);
        gg.generateTexture("puff" + p, 18, 18);
        gg.destroy();
      }
    }
    // el humo nace un poco POR ENCIMA de la boca de la chimenea, no encima del ladrillo
    const smokeFrom = (obj, dx, tint, cond) => {
      this.time.addEvent({ delay: 850, loop: true, callback: () => {
        if (!cond()) return;
        const sp = obj.sprite; if (!sp || !sp.visible) return;
        const px = obj.cx + obj.rw * dx + (Math.random() * 6 - 3);
        const py = obj.by - sp.displayHeight - 4;
        const s = this.add.image(px, py, "puff" + ((Math.random() * 3) | 0))
          .setTint(tint).setAlpha(0.55)
          .setScale(0.6 + Math.random() * 0.5).setAngle(Math.random() * 360)
          .setDepth(obj.by + 1);
        this.tweens.add({ targets: s, y: py - 26 - Math.random() * 14, x: px + (Math.random() * 16 - 7),
          scale: s.scale * 2.2, angle: s.angle + (Math.random() * 70 - 35), alpha: 0,
          duration: 2300 + Math.random() * 700, onComplete: () => s.destroy() });
      }});
    };
    const storeObj = this.objs.find(o => o.type === "store");
    if (storeObj) smokeFrom(storeObj, 0.26, 0xd8d2c4, () => true);                       // herrería: siempre
    // fragua: media por defecto, encendida mientras se trabaja en la Herrería (detalles jueves)
    this.storeObj = storeObj;
    this.updateForge();
    this.startHornoSmoke();   // humo del Horno de Piedra si ya está construido (viernes 2)
    const cocinaObj = this.objs.find(o => o.type === "cocina");
    if (cocinaObj) smokeFrom(cocinaObj, 0.20, 0xefe9db, () => true);                     // cocina: humo SIEMPRE (detalles jueves)
    if (cocinaObj) smokeFrom(cocinaObj, 0.20, 0xffffff, () => (typeof cookList === "function" ? cookList().length > 0 : !!G.cooking));   // …y el doble de bocanadas mientras se cocina

    // cofres depósito colocados por el jugador (los que están en la bolsa NO se colocan solos)
    (G.chests = G.chests || []).forEach((c, idx) => { if (c.col != null) this.spawnChest(idx); });

    { const m = GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0;   // con isla, la cámara puede salir sobre el mar
      this.camLim = { x1: -m, y1: -m, x2: W + m, y2: H + m };
      this.cameras.main.setBounds(this.camLim.x1, this.camLim.y1, this.camLim.x2 - this.camLim.x1, this.camLim.y2 - this.camLim.y1); }
    if (!GF.CAM_PAN) this.cameras.main.startFollow(hero, true, 0.15, 0.15);
    else { this.cameras.main.stopFollow(); this.cameras.main.centerOn(W / 2, H * 0.42); }
    this.zoomUser = 1;
    this.fitCamera();
    this.scale.on("resize", this.fitCamera, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.fitCamera, this));
    // rueda del mouse: acercar/alejar la cámara de la granja
    this.input.on("wheel", (ptr, over, dx, dy) => {
      if (GF.CAM_PAN && (ptr.event.ctrlKey || ptr.event.shiftKey)) {   // Ctrl/Shift + rueda = acercar o alejar
        this.zoomUser = Phaser.Math.Clamp((this.zoomUser || 1) * (dy > 0 ? 0.92 : 1.08), 0.6, 2.2);
        this.fitCamera(); return;
      }
      if (GF.CAM_PAN) {   // SFL: la rueda DESPLAZA la granja
        const c = this.cameras.main, L = this.camLim || { y1: 0, y2: GF.WORLD_H };
        c.scrollY = Phaser.Math.Clamp(c.scrollY + dy * 0.6, L.y1, Math.max(L.y1, L.y2 - c.height / c.zoom));
        return;
      }
      this.zoomUser = Phaser.Math.Clamp(this.zoomUser * (dy > 0 ? 0.9 : 1.1), 0.4, 2.4);
      this.fitCamera();
    });

    this.keys = this.input.keyboard.addKeys({
      up:"W", down:"S", left:"A", right:"D",
      aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT",
      act:"E", act2:"SPACE",
    }, false);   // enableCapture=false: no bloquea el tipeo en el chat
    // (la M ya no teletransporta a la plaza — ahora abre/cierra el menú, detalles 29/7)
    this.keys.act.on("down", () => this.doInteract());
    this.keys.act2.on("down", () => this.doInteract());
  }

  drawOlas(dt) {
    if (!this.olas) return;
    this.olasT = (this.olasT || 0) + dt;
    const t = this.olasT, W2 = GF.WORLD_W, H2 = GF.WORLD_H, g = this.olas;
    g.clear(); g.lineStyle(3, 0xdff3ff, 0.55);
    for (let i = 0; i < 3; i++) {
      const o = 16 + i * 13 + Math.sin(t * 0.9 + i) * 5;
      g.strokeRoundedRect(-20 - o, -20 - o, W2 + 40 + o * 2, H2 + 40 + o * 2, 50 + o);
    }
  }

  fitCamera() {
    const cw = this.scale.width, ch = this.scale.height;
    if (GF.CAM_PAN) {
      // vista tipo SFL: se ve TODA la isla con su mar alrededor, y queda margen para arrastrar.
      // (antes el zoom obligaba a que la granja llenara la pantalla y no se podía mover nada)
      const m = GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0;
      const z = Math.max(cw / (GF.WORLD_W + m), ch / (GF.WORLD_H + m));   // que SIEMPRE quede margen para arrastrar en los dos ejes
      this.cameras.main.setZoom(Phaser.Math.Clamp(z * (this.zoomUser || 1), 0.35, 2.2));
      return;
    }
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
    if (this.anims.exists("boar_walk")) s.play("boar_walk");   // llega trotando (frames del sprite original, 31/7)
    this.threats.push({ type: "boar", sprite: s, cx: 24, by: 40, baseScale, tgt, damageAt: nowMs() + 15000 });
    G.week++; refreshHud();
    log("¡Un jabalí apareció! Espantalo (clic/E) antes de que arruine un cultivo.", "bad");
    toast("¡Jabalí! Espantalo");
  }

  // ---- interacción ----
  nearestInteract() {
    let best = null, bd = 1e9;
    const all = this.objs.concat(this.plots).concat(this.threats); if (this.portal) all.push(this.portal);
    for (const o of all) {
      const rad = (o.type === "barn" || o.type === "market" || o.type === "store" || o.type === "cocina" || o.type === "horno" || o.type === "altar" || o.type === "establo" || o.type === "curtiduria" || o.type === "ofrendas") ? 72 : (o.type === "plot" ? 26 : (o.type === "boar" ? 55 : (o.type === "portal" ? 50 : 58)));   // plot 26: hay que estar encima de la tierra para plantar/cosechar
      const d = Math.hypot(o.cx - this.hero.x, o.by - this.hero.y);
      if (d < rad && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  promptText(o) {
    const cd = nowMs() < o.readyAt;
    if (o.type === "boar") return "Espantar jabalí";
    if (o.type === "plot") {
      if (o.state === "locked") return "Desbloquear parcela (" + plotUnlockCost() + " )";
      if (o.state === "withered") return "Limpiar cultivo marchito";
      if (o.state === "dry") { const cd = CROP_DEF[G.selSeed]; return "Plantar " + (cd ? cd.label : "cultivo"); }
      if (o.state === "ready") { const cd = CROP_DEF[o.cropKey]; return "Cosechar " + (cd ? cd.label : ""); }
      return "Creciendo…";
    }
    if (o.type === "portal") return "Teletransportarte a la Zona Negra" + (Object.keys(G.weapons || {}).length ? "" : " sin arma");
    const secs = cd ? Math.ceil((o.readyAt - nowMs()) / 1000) : 0;
    if (o.type === "tree") { if (o.locked) return "Desbloquear árbol (" + treeUnlockCost() + " madera)"; return cd ? "Vuelve en " + fmtSecs(secs) : "Talar madera"; }
    if (o.type === "rock") { if (o.locked) return "Desbloquear piedra (" + rockUnlockCost() + " piedra)"; return cd ? "Vuelve en " + fmtSecs(secs) : "Picar piedra"; }
    if (o.type === "ore") { const od = ORE_DEF[o.ore]; if (!od) return "Minar"; if (cd) return od.emoji + " Vuelve en " + fmtSecs(secs); return "Minar " + od.label; }
    if (o.type === "barn") return "Granja";
    if (o.type === "market") return "Mercado";
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) return "Construir " + BUILD_DEF[o.type].label + " (" + buildCostStr(o.type) + ")";
    if (o.type === "store") return "Herrería";
    if (o.type === "cocina") return "Cocina";
    if (o.type === "horno") return "Horno de Piedra";
    if (o.type === "altar") return "Altar de Runas";
    if (o.type === "establo") return "Establo";
    if (o.type === "curtiduria") return "Curtiduría";
    if (o.type === "ofrendas") return "Altar de Ofrendas";
    if (o.type === "cofre") return "Cofre depósito";
    if (o.type === "dummy") {
      if (typeof dummyEntrenando === "function" && dummyEntrenando()) return "Entrenando… clic para cobrar la XP acumulada";
      { const aid = armaEq(); if (!aid || ARM_DEF[aid].tipo === "arco") return "Dummy de práctica — equipá un arma cuerpo a cuerpo"; }
      const dleft = (G.dummyUsedAt || 0) + DUMMY_CD_MS - nowMs();
      return dleft > 0 ? "El dummy descansa — vuelve en " + fmtDur(dleft) : "Entrenar espada (+" + DUMMY_XP + " XP)";
    }
    if (o.type === "fish") return "Pescar (1 lombriz · tenés " + fmt(G.res.lombriz || 0) + ")";
    return "";
  }

  doInteract() {
    if (GF.uiOpen || this.action || GF.editMode) return;
    if (GF.NO_WALK) {   // sin granjero: la tecla E actúa sobre lo que esté bajo el cursor
      const pt = this.input.activePointer, wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const q of this.objs) { if (this.hitsSprite(q.sprite, wx, wy)) { const d = Math.hypot(q.cx - wx, q.by - wy); if (d < bd) { bd = d; hit = q; } } }
      if (!hit) for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < GF.TILE / 2 && Math.abs(wy - pl.by) < GF.TILE / 2) { hit = pl; break; } }
      if (hit) this.interactWith(hit); else if (this.pondDist(wx, wy) < 1.05) this.tryFish(wx, wy);
      return;
    }
    const o = this.nearestInteract(); if (o) this.interactWith(o); else if (this.nearPond()) this.tryFish();
  }

  interactWith(o) {
    if (o.type === "portal") {
      const entrar = () => { if (typeof tutoEvent === "function") tutoEvent("portal"); if (typeof saveFarm === "function") saveFarm(); this.leaving = true; this.scene.start("forest"); };
      askConfirm("¿Entrás vos a pelear a la Zona Negra o mandás una incursión de un clic?", entrar,
        { title: "Zona Negra", yes: "Entrar a pelear", yesClass: "green", no: "Incursión (un clic)", noClass: "gold",
          onNo: () => { if (typeof refreshIncursion === "function") refreshIncursion(); openOv("ov-incursion"); } });
      return;
    }
    if (o.type === "barn") return openOv("ov-barn");
    if (o.type === "market") return openOv("ov-market");
    // edificios por construir (viernes 1): clic → receta de construcción con confirmación
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
      const b = BUILD_DEF[o.type];
      if (b.lvl && G.level < b.lvl) { toast(b.label + " se desbloquea a granja nivel " + b.lvl); return; }   // doc 2/8
      askConfirm("Construir " + b.label + " cuesta: " + buildCostStr(o.type) + ". ¿Construir?", () => {
        if (!canAfford(b.cost)) { toast("Te faltan materiales para construir"); return; }
        if (b.golden && G.golden < b.golden) { toast("Te falta $Golden (" + b.golden + ")"); return; }
        payCost(b.cost); if (b.golden) G.golden -= b.golden; G.built[o.type] = true;
        if (o.sprite) { o.sprite.setAlpha(1); o.sprite.clearTint(); }
        if (o.type === "horno") this.startHornoSmoke();   // arranca el humo (viernes 2)
        if (typeof tutoEvent === "function") tutoEvent("build_" + o.type);
        addXp("crafting", 20); log("¡Construiste " + b.label + "!", "gold"); toast("¡" + b.label + " construida!");
        refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
      }, { title: "Construir " + b.label, yes: "Construir", yesClass: "green", no: "Cancelar", noClass: "red" });
      return;
    }
    if ((o.type === "tree" || o.type === "rock") && o.locked) {   // viernes (2): se desbloquea CUALQUIERA (pedido Discord); el costo sube por cantidad
      const isTree = o.type === "tree";
      const cost = isTree ? treeUnlockCost() : rockUnlockCost(), res = isTree ? "madera" : "piedra";
      askConfirm("Cuesta " + cost + " de " + RES_LABEL[res] + ". ¿Desbloquear?", () => {
        if ((G.res[res] || 0) < cost) { toast("Te falta " + RES_LABEL[res] + " (" + cost + ")"); return; }
        G.res[res] -= cost;
        if (isTree) { G.treesOpen = G.treesOpen || [0]; G.treesOpen.push(o.lockIdx); }
        else { G.rocksOpen = G.rocksOpen || [0]; G.rocksOpen.push(o.lockIdx); }
        o.locked = false; if (o.sprite) { o.sprite.setAlpha(1); o.sprite.clearTint(); }
        addXp("crafting", 5); if (typeof syncSlots === "function") syncSlots();
        log("Desbloqueaste " + (isTree ? "un árbol" : "una piedra") + " por " + cost + " de " + RES_LABEL[res] + ".", "good");
        if (typeof tutoEvent === "function") tutoEvent("unlocknode"); toast("¡" + (isTree ? "Árbol" : "Piedra") + " desbloqueado!");
        refreshHud(); if (isOpen("ov-inv")) refreshInv(); if (typeof saveFarm === "function") saveFarm(true);
      }, { title: isTree ? "Desbloquear árbol" : "Desbloquear piedra", yes: "Desbloquear", yesClass: "green", no: "Cancelar", noClass: "red" });
      return;
    }
    if (o.type === "store") return openOv("ov-forge");
    if (o.type === "cocina") return openOv("ov-cocina");
    if (o.type === "horno") { if (typeof refreshHorno === "function") refreshHorno(); return openOv("ov-horno"); }
    if (o.type === "altar") { if (typeof refreshAltar === "function") refreshAltar(); return openOv("ov-altar"); }
    if (o.type === "establo") { if (typeof refreshEstablo === "function") refreshEstablo(); return openOv("ov-establo"); }
    if (o.type === "curtiduria") { if (typeof refreshCurtiduria === "function") refreshCurtiduria(); return openOv("ov-curtiduria"); }
    if (o.type === "ofrendas") { if (typeof refreshOfrendas === "function") refreshOfrendas(); return openOv("ov-ofrendas"); }
    if (o.type === "cofre") { window.chestOpen = o.chestIdx; return openOv("ov-cofre"); }
    if (o.type === "dummy") {
      if (typeof dummyEntrenando === "function" && dummyEntrenando()) { dummyCobrar(); return; }   // volviste: cobrás la XP acumulada
      const dleft = (G.dummyUsedAt || 0) + DUMMY_CD_MS - nowMs();
      askConfirm(dleft > 0
          ? "El dummy descansa (vuelve en " + fmtDur(dleft) + "), pero podés dejar al granjero entrenando: cobrás la XP del tiempo que pase, hasta " + DUMMY_OFF_MAX_H + " h."
          : "¿Entrenás ahora (+" + DUMMY_XP + " XP y 4 h de descanso) o dejás al granjero entrenando mientras no estás?",
        () => { if (dleft > 0) { toast("El dummy descansa — vuelve en " + fmtDur(dleft)); return; } this.trainDummy(o); },
        { title: "Dummy de práctica", yes: dleft > 0 ? "Cerrar" : "Entrenar ahora", yesClass: dleft > 0 ? "ghost" : "green",
          no: "Dejar entrenando", noClass: "gold", onNo: () => dummyIniciar() });
      return;
    }
    if (o.type === "boar") { o.sprite.destroy(); const i = this.threats.indexOf(o); if (i >= 0) this.threats.splice(i, 1); log("Espantaste al jabalí.", "good"); toast("¡Espantado!"); return; }   // XP de espada llega con el combate (necesita espada equipada)
    if (o.type === "plot") {
      if (o.state === "locked") {   // desbloquear con plata: recuadro de confirmación (detalles viernes)
        const cost = plotUnlockCost();
        askConfirm("¿Gastar " + cost + " de plata para desbloquear esta parcela?", () => {
          if (G.plata < cost) { toast("Te falta plata (" + cost + ")"); return; }
          G.plata -= cost; G.plotsOwned = (G.plotsOwned || 2) + 1; o.state = "dry";
          if (o.ground && this.textures.exists("plot")) { o.ground.setTexture("plot").setDisplaySize(GF.TILE, GF.TILE).clearTint(); o.ground.setAlpha(1); }
          addXp("farming", 5); this.syncPlots();
          log("Desbloqueaste una parcela por " + cost + " plata.", "good"); toast("¡Parcela desbloqueada!");
          refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
        }, { title: "Desbloquear parcela", yes: "Aceptar", yesClass: "green", no: "Cancelar", noClass: "red" });
        return;
      }
      if (o.state === "withered") {   // limpiar el cultivo perdido: la parcela vuelve a estar libre
        o.state = "dry"; o.cropKey = null; o.witherAt = 0;
        o.spr.clearTint().setAlpha(1).setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false);
        this.syncPlots(); log("Limpiaste el cultivo marchito.", "info"); toast("Parcela limpia");
        return;
      }
      // la azada/semilla se usan solas desde la bolsa (la hotbar sigue sirviendo para ELEGIR semilla)
      if (o.state === "dry") {
        let ck = G.selSeed;
        // si la semilla elegida no tiene stock, detectar sola la de la hotbar o la primera disponible
        if (!CROP_DEF[ck] || (G.seeds[ck] || 0) <= 0) {
          const hb = G.hotbar && G.hotbar[G.hotSel];
          if (hb && hb.kind === "seed" && cropUnlocked(hb.key) && (G.seeds[hb.key] || 0) > 0) ck = hb.key;
          else { const alt = CROP_ORDER.find(k => cropUnlocked(k) && (G.seeds[k] || 0) > 0); if (alt) ck = alt; }
          if (ck !== G.selSeed && CROP_DEF[ck]) { G.selSeed = ck; toast("Plantando: " + CROP_DEF[ck].label); if (typeof refreshHotbar === "function") refreshHotbar(); }
        }
        const cd = CROP_DEF[ck];
        if (!cd) { toast("Elegí una semilla en la bolsa (I)"); return; }
        if (!cropUnlocked(ck)) { toast("Necesitás Cultivo nivel " + cd.lvl + " para " + cd.label); return; }
        if ((G.seeds[ck] || 0) <= 0) { toast("Sin semillas de " + cd.label + " — comprá en la Tienda"); return; }
        return this.startAction("plant", o);
      }
      if (o.state === "ready") {
        const ck = o.cropKey || "papa";
        if (!roomForRes(ck)) { bagFull("cosechar " + ((CROP_DEF[ck] || {}).label || ck)); return; }
        return this.startAction("harvest", o);
      }
      toast("Todavía está creciendo"); return;
    }
    if (o.type === "fish") { if (toolDur("rod") <= 0) { toast("No tenés caña — craftéala en la Herrería"); return; } if ((G.res.lombriz || 0) < 1) { toast("Necesitás lombrices — compralas en la Tienda"); return; } if (!roomForFish()) { bagFull("pescar"); return; } return this.startAction("fish", o); }
    if (nowMs() < o.readyAt) { toast(this.promptText(o)); return; }
    if (o.type === "ore") {
      const pk = equippedPick();   // el pico sale solo de la bolsa (el equipado define el tier)
      if (!pk) { toast("Necesitás un pico — craftealo en la Herrería"); return; }
      const pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      if (od.tier > pd.mineTier) { toast("Tu " + pd.label + " no puede con " + od.label); log("Necesitás un pico mejor para " + od.label + " (Herrería).", "bad"); return; }
      if ((G.picks.dur[pk] || 0) <= 0) { toast("No tenés pico útil — craftéalo en la Herrería"); return; }
      if (!roomForRes(o.ore)) { bagFull("picar " + od.label); return; }
      this.startAction("mine", o);
    } else if (o.type === "tree") {
      if (toolDur("axe") <= 0) { toast("No tenés hacha — craftéala en la Herrería"); return; }
      if (!roomForRes("madera")) { bagFull("talar"); return; }
      this.startAction("chop", o);
    } else if (o.type === "rock") {
      const pk = equippedPick();
      if (!pk) { toast("Necesitás un pico — craftealo en la Herrería"); return; }
      if ((G.picks.dur[pk] || 0) <= 0) { toast("No tenés pico útil — craftéalo en la Herrería"); return; }
      if (!roomForRes("piedra")) { bagFull("picar piedra"); return; }
      this.startAction("mine", o);
    }
  }

  startAction(kind, o) {
    this.moveTarget = null;
    if (GF.NO_WALK && o && o.cx != null) {   // granja de un clic: el granjero (invisible) trabaja donde clickeaste
      this.hero.setPosition(o.cx + (kind === "fish" ? 0 : 22), (o.by != null ? o.by : o.by2) + 4);
    }
    this.facing = (o.cx < this.hero.x) ? "west" : "east";
    // pescar lleva 15–20s ININTERRUMPIDOS (detalles jueves); moverse cancela la pesca
    let dur = kind === "fish" ? 15 + Math.random() * 5 : (ACT_DUR[kind] || 1.2);
    if (kind === "plant" || kind === "harvest") dur *= farmSpeedMult();   // buff "+% vel. de farmeo" de la comida
    this.action = { kind, o, t: 0, dur };
    if (kind === "fish") this.castBobber(o.bx != null ? o.bx : o.cx, o.by2 != null ? o.by2 : (GF.POND.row + GF.POND.rows / 2) * GF.TILE);
  }

  // lanza la caña: el corcho vuela desde el granjero hasta el agua y flota ahí mientras dura la pesca
  castBobber(x, y) {
    if (!this.textures.exists("bobber")) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xd8452e, 1); g.fillCircle(4, 3, 3.4);       // corcho rojo arriba
      g.fillStyle(0xf5efe0, 1); g.fillCircle(4, 6, 3.2);       // blanco abajo
      g.fillStyle(0x2b2b2b, 1); g.fillRect(3, 0, 2, 2);        // puntita
      g.generateTexture("bobber", 9, 10); g.destroy();
    }
    if (this.bobber) { this.bobber.destroy(); this.bobber = null; }
    if (window.sfx) sfx("cast");
    const b = this.add.image(this.hero.x, this.hero.y - 26, "bobber").setDepth(-988).setScale(1.6);
    this.bobber = b;
    this.tweens.add({ targets: b, x, y, duration: 420, ease: "Quad.easeIn", onComplete: () => {
      if (!this.bobber) return;
      this.splashAt(x, y);
      this.bobberTween = this.tweens.add({ targets: b, y: y + 2.5, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }});
  }
  clearBobber() { if (this.bobberTween) { this.bobberTween.stop(); this.bobberTween = null; } if (this.bobber) { this.bobber.destroy(); this.bobber = null; } this.clearFishLine(); this.clearFishBar(); }

  // hilo de pesca: de la punta de la caña (pixel 98,8 del frame hero_fish_3, lienzo 119x86) hasta la boya, con panza
  drawFishLine(sign) {
    if (!this.bobber) return;
    if (!this.fishLine) this.fishLine = this.add.graphics().setDepth(-987);
    const k = this.actScale;
    const tx = this.hero.x + sign * (99 - 119 / 2) * k, ty = this.hero.y - (63 - 8) * k;
    const bx = this.bobber.x, by = this.bobber.y - 3;
    const g = this.fishLine; g.clear();
    g.lineStyle(1, 0xf2ead5, 0.75); g.beginPath(); g.moveTo(tx, ty);
    const mx = (tx + bx) / 2, my = Math.max(ty, by) + 7;   // panza del hilo
    for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; g.lineTo(u * u * tx + 2 * u * t * mx + t * t * bx, u * u * ty + 2 * u * t * my + t * t * by); }
    g.strokePath();
  }
  clearFishLine() { if (this.fishLine) { this.fishLine.destroy(); this.fishLine = null; } }

  // barra de enfriamiento de la pesca (detalles viernes): progreso sobre el granjero mientras pesca
  drawFishBar(a) {
    if (!this.fishBar) {
      const bg = this.add.rectangle(0, 0, 40, 7, 0x20301a, 0.85).setStrokeStyle(1, 0x8fc46a, 0.9).setDepth(99995);
      const fg = this.add.rectangle(0, 0, 36, 3, 0x8fc46a, 1).setOrigin(0, 0.5).setDepth(99996);
      this.fishBar = { bg, fg };
    }
    const x = this.hero.x, y = this.hero.y - GF.SIZE.hero - 12;
    this.fishBar.bg.setPosition(x, y);
    this.fishBar.fg.setPosition(x - 18, y);
    this.fishBar.fg.width = Math.max(1, 36 * Math.min(1, a.t / a.dur));
  }
  clearFishBar() { if (this.fishBar) { this.fishBar.bg.destroy(); this.fishBar.fg.destroy(); this.fishBar = null; } }

  // efecto de CATCH (detalles viernes 1): splash en la boya y el pez salta en arco hasta el granjero
  catchFx() {
    if (!this.bobber) return;
    const bx = this.bobber.x, by = this.bobber.y;
    this.splashAt(bx, by);
    const key = this.textures.exists("fish_comun") ? "fish_comun" : null;
    if (!key) return;
    const f = this.add.image(bx, by, key).setDepth(99996).setScale(1.1);
    const hx = this.hero.x, hy = this.hero.y - 30;
    // arco parabólico: sube y cae en la mano del granjero, girando
    this.tweens.add({ targets: f, x: hx, duration: 480, ease: "Sine.easeOut" });
    this.tweens.add({ targets: f, y: by - 46, duration: 240, ease: "Quad.easeOut", onComplete: () => {
      this.tweens.add({ targets: f, y: hy, duration: 240, ease: "Quad.easeIn", onComplete: () => {
        this.splashSparkle(hx, hy); f.destroy();
      } });
    } });
    this.tweens.add({ targets: f, angle: 360, duration: 480 });
  }
  splashSparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(x, y, 2, 0xbfe8ff, 1).setDepth(99996);
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 10;
      this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    }
  }
  cancelFishing() { this.clearBobber(); this.action = null; toast("Pesca interrumpida"); }

  finishAction() {
    const a = this.action, o = a.o;
    if (window.sfx) sfx({ chop: "chop", mine: "mine", plant: "plant", harvest: "harvest", fish: "splash", water: "splash" }[a.kind] || "click");
    if (a.kind === "chop") {
      o.golpes = (o.golpes || 0) + 1;
      if (o.golpes < GOLPES_TALAR) {   // golpes intermedios: el árbol se va cortando
        const tex = o.golpes === 1 ? "tree_cut1" : "tree_cut2";
        if (this.textures.exists(tex)) this.setObjTex(o, tex, o.rw || o.w);
        toast("¡Golpe " + o.golpes + "/" + GOLPES_TALAR + "!");
        this.action = null; return;
      }
      o.golpes = 0;
      const gr = 1;   // viernes (2): todos los recursos dan 1
      if (tryAddRes("madera", gr)) {
        useTool("axe"); addXp("crafting", 4); nodoSumar(o); o.readyAt = nowMs() + nodoCd(o, "tree", CD.tree) * 1000 * cdMult();
        o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2;   // a mitad del enfriamiento asoma el árbol a medio crecer (doc 4/8)
        // tocón nuevo con base de tierra y hojas caídas (encuadre del árbol, va a tamaño completo); respaldo: tocón viejo chico
        if (this.textures.exists("tree_stump_leaves")) this.setObjTex(o, "tree_stump_leaves", (o.rw || o.w) * 0.85);   // −15%: el tocón venía más grueso que el tronco del árbol
        else this.setObjTex(o, "tree_stump", (o.rw || o.w) * 0.42);
        statAdd("talar", null, gr);
        log(`+${gr} Madera. ${toolDur("axe")}/${TOOL_DEF.axe.max}`, "good"); toast("+" + gr + " "); refreshHud();
        if (typeof tutoEvent === "function") tutoEvent("gather");
        if (toolDur("axe") <= 0) { log("¡El hacha se rompió en pedazos! Crafteá otra en la Herrería.", "bad"); toast("¡Hacha rota!"); }
      } else {
        this.setObjTex(o, o.baseKey, o.rw || o.w);   // bolsa llena: el árbol vuelve entero (deshace los cortes intermedios)
        toast("Bolsa llena — no podés talar"); log("Bolsa llena: liberá espacio para seguir talando.", "bad");
      }
    } else if (a.kind === "mine" && o.type === "rock") {
      o.golpes = (o.golpes || 0) + 1;
      if (o.golpes < GOLPES_MINAR) {
        if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
        toast("¡Golpe " + o.golpes + "/" + GOLPES_MINAR + "!");
        this.action = null; return;
      }
      o.golpes = 0;
      const gr = 1;   // viernes (2): todos los recursos dan 1
      if (tryAddRes("piedra", gr)) {
        const pk = equippedPick();   // picar piedra también gasta el pico (bug reportado)
        if (pk) { G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1); if (G.picks.dur[pk] <= 0) { log(`¡${PICK_DEF[pk].label} se rompió en pedazos! Crafteá otro en la Herrería.`, "bad"); toast("¡Pico destruido!"); destroyPick(pk); } }
        addXp("mining", 5); statAdd("minar", "piedra", gr); nodoSumar(o); o.readyAt = nowMs() + nodoCd(o, "piedra", CD.rock) * 1000 * cdMult(); o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2; this.setObjTex(o, "node_stone_mined", o.rw || GF.TILE); log(`+${gr} Piedra.` + (pk ? ` ${G.picks.dur[pk]}/${PICK_DEF[pk].dur}` : ""), "good"); toast("+" + gr + " "); refreshHud();
        if (typeof tutoEvent === "function") tutoEvent("gather");
      }
      else { toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad"); }
    } else if (a.kind === "mine" && o.type === "ore") {
      o.golpes = (o.golpes || 0) + 1;
      if (o.golpes < GOLPES_MINAR) {
        if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
        toast("¡Golpe " + o.golpes + "/" + GOLPES_MINAR + "!");
        this.action = null; return;
      }
      o.golpes = 0;
      const pk = equippedPick(), pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      const gr = 1;   // viernes (2): todos los recursos dan 1
      if (tryAddRes(o.ore, gr)) {
        G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1);
        addXp("mining", 5 + od.tier * 3); statAdd("minar", o.ore, gr);
        nodoSumar(o); o.readyAt = nowMs() + nodoCd(o, o.ore, od.cd) * 1000 * cdMult();
        o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2;
        if (this.textures.exists(o.baseKey + "_mined")) this.setObjTex(o, o.baseKey + "_mined", o.rw || GF.TILE); else o.sprite.setAlpha(0.4);
        log(`${od.emoji} +${gr} ${od.label}. ${G.picks.dur[pk]}/${pd.dur}`, "good"); toast("+" + gr + " " + od.emoji); refreshHud();
        if (typeof tutoEvent === "function") { tutoEvent("gather"); tutoEvent("mineore"); }
        if (G.picks.dur[pk] <= 0) { log(`¡${pd.label} se rompió en pedazos! Crafteá otro en la Herrería.`, "bad"); toast("¡Pico destruido!"); destroyPick(pk); }
      } else { toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad"); }
    } else if (a.kind === "plant") {
      const ck = G.selSeed, cd = CROP_DEF[ck];
      if (cd && (G.seeds[ck] || 0) > 0) {
        G.seeds[ck]--; o.cropKey = ck; o.state = "growing"; o.witherAt = 0; const real = cd.grow * 1000 * cdMult();
        const starter = (G.firstSeeds || 0) > 0 && FIRST_GROW_MS > 0;   // solo las semillas del starter pack
        if (starter) G.firstSeeds--;
        o.readyAt = nowMs() + (starter ? Math.min(FIRST_GROW_MS, real) : real);   // nunca más lento que el tiempo real del cultivo
        o.growTotal = o.readyAt - nowMs();
        this.showGrowing(o);
        this.syncPlots(); addXp("farming", 5); statAdd("plantar", ck); log(`Plantaste ${cd.label}.`, "good"); toast("" + cd.label);
        if (typeof tutoEvent === "function") tutoEvent("plant");
        if (isOpen("ov-inv")) refreshInv();
      }
    } else if (a.kind === "harvest") {
      const ck = o.cropKey || "papa", cd = CROP_DEF[ck] || CROP_DEF.papa;
      const gr = Math.max(1, Math.round(cd.yield * yieldMult()));
      if (tryAddRes(ck, gr)) { o.state = "dry"; o.cropKey = null; o.readyAt = 0; o.witherAt = 0; this.setPlotGlow(o, "off"); this.coinBurst(o.cx, o.by); o.spr.setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false); this.syncPlots(); addXp("farming", (cd && cd.xp) || 2); if (!G.firstCropDone) G.firstCropDone = true; if (typeof tutoEvent === "function") tutoEvent("harvest"); log(`${cd.emoji} +${gr} ${cd.label}.`, "good"); toast("+" + gr + " " + cd.emoji); refreshHud(); }
      else { toast("Bolsa llena — no podés cosechar"); log("Bolsa llena: liberá espacio para cosechar.", "bad"); }
    } else if (a.kind === "fish") {
      this.clearBobber();
      goFishing();
    }
    this.action = null;
  }


  // AURA DORADA (cosmético de nivel 30+): resplandor aditivo que late a los pies del granjero
  updateAura() {
    const on = (typeof cosElegido === "function") && cosElegido().aura && (typeof cosAuraDisponible !== "function" || cosAuraDisponible());
    if (!on) { if (this.auraFx) { this.auraFx.destroy(); this.auraFx = null; } if (this.auraTw) { this.auraTw.stop(); this.auraTw = null; } return; }
    if (this.auraFx || !this.hero) return;
    const g = this.add.graphics();
    g.fillStyle(0xffd75e, 0.30).fillCircle(0, 0, 26);
    g.fillStyle(0xfff3cf, 0.22).fillCircle(0, 0, 16);
    g.setBlendMode(Phaser.BlendModes.ADD).setDepth(this.hero.y - 1);
    this.auraFx = g;
    this.auraTw = this.tweens.add({ targets: g, scaleX: 1.25, scaleY: 0.7, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
  seguirAura() {
    if (!this.auraFx || !this.hero) return;
    this.auraFx.setPosition(this.hero.x, this.hero.y - 3).setDepth(this.hero.y - 1).setVisible(this.hero.visible);
  }
  // flecha del tutorial: triángulo dorado que rebota sobre el objetivo del paso actual
  updateTutoArrow() {
    if (this.tutoArrow) { this.tutoArrow.destroy(); this.tutoArrow = null; if (this.tutoTw) { this.tutoTw.stop(); this.tutoTw = null; } }
    const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
    if (!st) return;
    let x = null, y = null;
    if (st.target === "plot") { const pl = (this.plots || []).find(o => o.state !== "locked"); if (pl) { x = pl.cx; y = pl.by - GF.TILE * 0.9; } }
    else if (st.target === "ore") { const o = (this.objs || []).find(o => o.type === "ore" && !o.locked); if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; } }
    else if (st.target === "portal") { const o = this.portal; if (o) { x = o.cx; y = o.by - 70; } }
    else if (st.target === "tree" || st.target === "rock") {
      const tipos = st.target === "rock" ? ["rock", "ore"] : ["tree"];
      const o = (this.objs || []).find(o => tipos.includes(o.type) && !o.locked);
      if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; }
    }
    else { const o = (this.objs || []).find(o => o.type === st.target); if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; } }
    if (x == null) return;
    const tri = this.add.triangle(x, y, 0, 0, 16, 0, 8, 12, 0xffd75e).setStrokeStyle(2, 0x241505, 1).setDepth(99990);
    this.tutoArrow = tri;
    this.tutoTw = this.tweens.add({ targets: tri, y: y - 10, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  setObjTex(o, key, targetW) {
    o.sprite.setTexture(key); o.sprite.setScale(targetW / o.sprite.width);
    if (o.shadow) o.shadow.setScale(targetW / (o.rw || o.w));   // la sombra acompaña (tocón chico → sombra chica)
  }

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
    if (toolDur("rod") <= 0) { toast("No tenés caña — craftéala en la Herrería"); return; }
    if ((G.res.lombriz || 0) < 1) { toast("Necesitás lombrices — compralas en la Tienda"); return; }
    if (!roomForFish()) { bagFull("pescar"); return; }
    const p = GF.POND, T = GF.TILE;
    const bx = clickX != null ? clickX : (p.col + p.cols / 2) * T, by2 = clickY != null ? clickY : (p.row + p.rows / 2) * T;
    this.startAction("fish", { cx: (p.col + p.cols / 2) * T, bx, by2 });
  }

  // marca visual breve sobre un objetivo encolado
  // borde de ARRIBA del sprite en coordenadas del mundo (el arte tiene alturas muy distintas)
  topY(o, gap) {
    gap = gap || 7;
    const s = (o.sprite && o.sprite.visible) ? o.sprite : ((o.spr && o.spr.visible) ? o.spr : null);
    if (s) { const b = s.getBounds(); if (b.height) return b.top - gap; }
    return o.by - GF.TILE * 0.75 - gap;
  }

  // punto fijo ARRIBA de lo encolado, para saber de un vistazo qué pusiste y qué no (detalles 338)
  markQueued(o) {
    if (o.qDot) return;
    const y = this.topY(o);
    const d = this.add.circle(o.cx, y, 4, 0xffd24a, 1).setStrokeStyle(2, 0x5a3c14, 0.9).setDepth(99998);
    this.tweens.add({ targets: d, scale: { from: 0.5, to: 1 }, duration: 180 });
    this.tweens.add({ targets: d, alpha: { from: 1, to: 0.55 }, yoyo: true, repeat: -1, duration: 620 });
    o.qDot = d;
  }
  unmarkQueued(o) { if (o && o.qDot) { this.tweens.killTweensOf(o.qDot); o.qDot.destroy(); o.qDot = null; } }
  clearQueue() { if (this.queue) { this.queue.forEach(o => this.unmarkQueued(o)); this.queue.length = 0; } }

  // efecto de pesca: ondas expandiéndose + gotita en el punto clickeado del lago
  splashAt(x, y) {
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(x, y, 4, 0xbfe6ff, 0).setStrokeStyle(2, 0xdff2ff, 0.9).setDepth(-990);
      this.tweens.add({ targets: c, radius: 14 + i * 8, alpha: { from: 0.9, to: 0 }, delay: i * 140, duration: 600, onComplete: () => c.destroy() });
    }
    const d = this.add.text(x, y - 4, "", { fontSize: "14px" }).setOrigin(0.5, 1).setDepth(-989);
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

  // entrenar con el dummy: 3 espadazos, XP de Espada y cooldown de 4 horas
  trainDummy(o) {
    const aid = armaEq();
    if (!aid || ARM_DEF[aid].tipo === "arco") { toast("Equipá un arma cuerpo a cuerpo (espada, hacha o mazo)"); return; }
    const left = (G.dummyUsedAt || 0) + DUMMY_CD_MS - nowMs();
    if (left > 0) { toast("El dummy descansa — vuelve en " + fmtDur(left)); return; }
    G.dummyUsedAt = nowMs();
    if (typeof tutoEvent === "function") tutoEvent("dummy");
    useWeapon(aid); useWeapon(aid);   // entrenar gasta 2 de durabilidad del arma
    let hits = 0;
    const sign = this.hero.x <= o.cx ? 1 : -1;
    const swing = () => {
      hits++;
      // espadazo del granjero definitivo (con estela); respaldo: la espada dibujada como antes
      if (this.anims.exists("act_sword")) {
        this.hero.setScale(sign * this.actScale, this.actScale);
        this.hero.play("act_sword");
      } else if (this.textures.exists("sword")) {
        const fx = this.add.image(o.cx - sign * 20, o.by - 30, "sword").setDisplaySize(24, 24).setOrigin(0.5, 0.85).setDepth(o.by + 1).setAngle(-65 * sign);
        this.tweens.add({ targets: fx, angle: 70 * sign, duration: 190, onComplete: () => fx.destroy() });
      }
      this.tweens.add({ targets: o.sprite, angle: 7 * sign, duration: 90, yoyo: true, onComplete: () => o.sprite.setAngle(0) });
      if (hits < 3) this.time.delayedCall(280, swing);
      else {
        const sk = armSkillKey(ARM_DEF[aid].tipo);
        addXp(sk, DUMMY_XP);
        log("Entrenaste con el dummy: +" + DUMMY_XP + " XP de " + SKILL_NAME[sk] + ". Vuelve en 4h. " + G.weapons[aid].dur + "/" + ARM_DEF[aid].dur, "gold");
        toast("+" + DUMMY_XP + " XP de " + SKILL_NAME[sk]);
        refreshHud(); if (typeof saveFarm === "function") saveFarm();
      }
    };
    swing();
  }

  // fragua encendida mientras se craftea/repara; si no, a medio fuego (detalles jueves)
  updateForge() {
    const o = this.storeObj; if (!o || !o.sprite) return;
    const lit = (G.forgeLitUntil || 0) > nowMs();
    const key = lit && this.textures.exists("store_lit") ? "store_lit" : "store";
    if (o.sprite.texture.key !== key && this.textures.exists(key)) this.setObjTex(o, key, o.rw || o.w);
    // fuego "vivo" por código: resplandor rojizo que aparece y palpita sobre la boca del horno
    const k = (o.rw || o.w) / 104;                       // escala del edificio (textura de 104px)
    const fx = o.cx - 13 * k, fy = o.by - 25 * k;        // boca del horno dentro de la herrería (ajustado un pelín a la derecha)
    if (lit && !this.forgeGlow) {
      // núcleo intenso en el horno + halo suave que baña el frente del edificio (blend aditivo)
      const core = this.add.ellipse(fx, fy, 14 * k, 12 * k, 0xff7a2a, 0.5).setDepth(o.by + 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const halo = this.add.ellipse(fx, fy - 2 * k, 46 * k, 34 * k, 0xff4a18, 0.22).setDepth(o.by + 0.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.forgeGlow = [core, halo];
      // va apareciendo (fade in) y después palpita como brasa, cada uno a su ritmo
      this.tweens.add({ targets: core, alpha: 0.55, duration: 700, onComplete: () =>
        this.tweens.add({ targets: core, alpha: { from: 0.55, to: 0.3 }, scaleX: { from: 1, to: 0.86 }, scaleY: { from: 1, to: 0.86 }, yoyo: true, repeat: -1, duration: 460, ease: "Sine.easeInOut" }) });
      this.tweens.add({ targets: halo, alpha: 0.3, duration: 900, onComplete: () =>
        this.tweens.add({ targets: halo, alpha: { from: 0.3, to: 0.14 }, scaleX: { from: 1, to: 1.12 }, scaleY: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 780, ease: "Sine.easeInOut" }) });
    } else if (!lit && this.forgeGlow) {
      this.forgeGlow.forEach(g => { this.tweens.killTweensOf(g); g.destroy(); });
      this.forgeGlow = null;
    }
  }

  // viernes (2): humo del Horno de Piedra por código (el sprite se dejó limpio a propósito)
  startHornoSmoke() {
    if (this.hornoSmokeEv) return;
    const o = this.objs && this.objs.find(x => x.type === "horno");
    if (!o || !o.sprite || !(G.built && G.built.horno)) return;
    const k = (o.rw || o.w) / 90;                                  // escala (textura de 90px)
    const sx = () => o.cx - 26 * k + (Math.random() - 0.5) * 4;    // boca de la chimenea (lado izquierdo del techo)
    const sy = () => o.by - (o.sprite.displayHeight || 60) + 6 * k;
    this.hornoSmokeEv = this.time.addEvent({ delay: 750, loop: true, callback: () => {
      if (!(G.built && G.built.horno)) return;
      const g = 150 + Math.floor(Math.random() * 40);
      const puff = this.add.ellipse(sx(), sy(), 5 + Math.random() * 3, 4 + Math.random() * 2, (g << 16) | (g << 8) | g, 0.5)
        .setDepth(o.by + 2).setAlpha(0);
      this.tweens.add({ targets: puff, alpha: { from: 0.45, to: 0 }, y: puff.y - 26 - Math.random() * 10, x: puff.x + 6 + Math.random() * 8,
        scaleX: 2.2, scaleY: 2.2, duration: 2400 + Math.random() * 600, ease: "Sine.easeOut", onComplete: () => puff.destroy() });
    } });
  }

  // crea (o ubica por primera vez) un cofre depósito en la granja
  spawnChest(idx) {
    const c = G.chests[idx]; if (!c) return;
    const T = GF.TILE;
    if (c.col == null) {   // primera vez: buscar una celda libre cerca del granjero
      const hc = Math.floor((this.hero ? this.hero.x : GF.WORLD_W / 2) / T);
      const hr = Math.floor((this.hero ? this.hero.y : GF.WORLD_H / 2) / T);
      outer: for (let r = 1; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const col = hc + dx, row = hr + dy;
        if (col < 1 || row < 2 || col >= GF.COLS - 1 || row >= GF.ROWS - 2) continue;
        const cx = (col + 0.5) * T, cy = (row + 0.6) * T;
        if (GF.blockedAt(cx, cy, 8)) continue;
        if (GF.PLOTS.some(p => p.col === col && p.row === row)) continue;
        c.col = col; c.row = row; break outer;
      }
      if (c.col == null) { c.col = 3; c.row = 8; }
    }
    const cx = (c.col + 0.5) * T, by = (c.row + 1) * T;
    const s = this.add.image(cx, by, "cofre").setOrigin(0.5, 1);
    s.setScale((T * 0.95) / s.width); s.setDepth(by);
    this.objs.push({ chestIdx: idx, type: "cofre", cx, by, w: T, rw: T * 0.95, baseKey: "cofre", sprite: s, readyAt: 0 });
    this.rebuildCollisions();
  }

  // colocar en la granja un cofre que está en la bolsa (clic en la bolsa — detalles jueves)
  placeChestFromBag() {
    const idx = (G.chests || []).findIndex(c => c && c.col == null);
    if (idx < 0) { toast("No tenés cofres en la bolsa"); return; }
    this.spawnChest(idx);
    toast("Cofre colocado — arrastralo en modo edición para moverlo");
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    if (typeof saveFarm === "function") saveFarm(true);
  }

  // recoger un cofre COLOCADO y devolverlo a la bolsa (debe estar vacío)
  pickupChest(idx) {
    const c = (G.chests || [])[idx]; if (!c || c.col == null) return;
    if (!c.items.every(s => !s)) { toast("Vaciá el cofre antes de recogerlo"); return; }
    const oi = this.objs.findIndex(o => o.type === "cofre" && o.chestIdx === idx);
    if (oi >= 0) { const o = this.objs[oi]; if (o.sprite) o.sprite.destroy(); if (o.timer) o.timer.destroy(); this.objs.splice(oi, 1); }
    c.col = null; c.row = null;
    this.rebuildCollisions();
    closeOv("ov-cofre");
    toast("Cofre guardado en tu bolsa");
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    if (typeof saveFarm === "function") saveFarm(true);
  }

  // brillo de interacción: hover del cursor + cercanía del granjero (capa aditiva sobre el sprite)
  updateHoverFx() {
    if (!this.hoverFx) {
      this.hoverFx = this.add.image(0, 0, "sprout").setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.28);
      this.nearFx = this.add.image(0, 0, "sprout").setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.16);
    }
    const apply = (fx, s) => {
      if (!s || !s.visible || !s.texture || !s.texture.key || s.texture.key.startsWith("__")) { fx.setVisible(false); return; }
      fx.setTexture(s.texture.key); fx.setOrigin(s.originX, s.originY);
      fx.setPosition(s.x, s.y); fx.setDisplaySize(s.displayWidth, s.displayHeight);
      fx.setFlipX(!!s.flipX); fx.setDepth(s.depth + 0.5); fx.setVisible(true);
    };
    if (GF.editMode || GF.uiOpen) { this.hoverFx.setVisible(false); this.nearFx.setVisible(false); return; }
    const T = GF.TILE, p = this.input.activePointer;
    let hov = null;
    for (const o of this.objs) {
      if (this.hitsSprite(o.sprite, p.worldX, p.worldY)) { hov = o.sprite; break; }   // el brillo coincide con lo que realmente se clickea
    }
    if (!hov) for (const pl of this.plots) {
      if (pl.state === "locked") continue;   // los plots bloqueados no se iluminan
      if (pl.ground && Math.abs(p.worldX - pl.cx) < T / 2 && Math.abs(p.worldY - pl.by) < T / 2) { hov = pl.ground; break; }
    }
    apply(this.hoverFx, hov);
    // cercanía: lo que el granjero puede interactuar ya mismo (mismo brillo, más suave)
    const near = this.nearestInteract();
    const nearOk = near && !(near.type === "plot" && near.state === "locked");
    const ns = nearOk ? (near.sprite || near.ground) : null;
    apply(this.nearFx, (ns && ns !== hov) ? ns : null);
  }

  // recalcula las colisiones a partir de las posiciones actuales de los objetos (tras editar)
  rebuildCollisions() {
    const T = GF.TILE;
    GF.COLLISIONS = this.objs.filter(o => o.type !== "fish").map(o => GF.solidRect(o));
    this.navOf().invalidate();   // la rejilla de pathfinding se rearma sola en el próximo clic
  }

  // pathfinding A* (módulo compartido con el Bosque — nav.js)
  navOf() { if (!this._nav) this._nav = new GF.Nav((x, y, p) => GF.blockedAt(x, y, p), GF.WORLD_W, GF.WORLD_H); return this._nav; }
  lineFree(x0, y0, x1, y1) { return this.navOf().lineFree(x0, y0, x1, y1); }
  findPath(sx, sy, tx, ty) { return this.navOf().find(sx, sy, tx, ty); }

  // caminar hacia un punto rodeando obstáculos
  goTo(x, y, silent) {
    const p = this.findPath(this.hero.x, this.hero.y, x, y);
    if (!p) { this.path = null; this.moveTarget = null; if (!silent) toast("No hay camino hasta ahí"); return false; }
    this.path = p.slice(); this.moveTarget = this.path.shift();
    this.lastDD = null; this.noProg = 0;   // destino nuevo: reinicia el control de progreso
    return true;
  }

  // destino del clic sostenido; con freno para no recalcular la ruta en cada píxel del arrastre
  holdSeek(wx, wy) {
    if (this.action) return;
    const t = nowMs();
    if (this.holdLast && Math.hypot(wx - this.holdLast.x, wy - this.holdLast.y) < 10 && t - (this.holdAt || 0) < 130) {
      this.holdPend = { x: wx, y: wy }; return;   // pendiente: se aplica en cuanto pase el freno
    }
    this.holdLast = { x: wx, y: wy }; this.holdAt = t; this.holdPend = null;
    if (this.lineFree(this.hero.x, this.hero.y, wx, wy)) { this.path = null; this.moveTarget = { x: wx, y: wy }; this.lastDD = null; this.noProg = 0; }   // camino libre: derecho, sin A*
    else this.goTo(wx, wy, true);
    this.showDest(wx, wy);
  }

  // marcador del punto de destino mientras arrastrás
  showDest(x, y) {
    if (!this.destMk) {
      this.destMk = this.add.circle(x, y, 5, 0xffe9a8, 0.5).setStrokeStyle(2, 0xfff3cf, 0.95).setDepth(99997);
      this.destTw = this.tweens.add({ targets: this.destMk, scale: { from: 0.7, to: 1.25 }, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 480 });
    }
    this.destMk.setPosition(x, y).setVisible(true);
  }
  hideDest() { if (this.destMk) this.destMk.setVisible(false); }

  // ESTÁNDAR de los contadores: se ven con el cursor encima o con el granjero cerca (nunca fijos)
  timerOn(o) {
    if (GF.editMode || GF.uiOpen) return false;
    const p = this.input.activePointer;
    if (o.sprite && this.hitsSprite(o.sprite, p.worldX, p.worldY)) return true;
    if (o.ground && Math.abs(p.worldX - o.cx) < GF.TILE / 2 && Math.abs(p.worldY - o.by) < GF.TILE / 2) return true;
    const rad = (o.type === "plot") ? 52 : 66;
    return Math.hypot(o.cx - this.hero.x, o.by - this.hero.y) < rad;
  }

  // ¿el clic cae sobre un píxel OPACO del sprite? Evita seleccionar un árbol clickeando
  // el hueco transparente que rodea la copa (el rectángulo del sprite es mucho más grande).
  hitsSprite(s, wx, wy) {
    if (!s || !s.visible) return false;
    const b = s.getBounds();
    if (!Phaser.Geom.Rectangle.Contains(b, wx, wy)) return false;
    const key = s.texture && s.texture.key;
    if (!key || key.startsWith("__") || !b.width || !b.height) return true;
    const tx = Math.floor((wx - b.x) / b.width * s.width);
    const ty = Math.floor((wy - b.y) / b.height * s.height);
    try {
      const a = this.textures.getPixelAlpha(tx, ty, key, s.frame ? s.frame.name : undefined);
      return a === null ? true : a > 12;
    } catch (e) { return true; }
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
        const s = this.add.text(pl.cx + ox * T, pl.by + oy * T, i === 2 ? "" : "", { fontSize: i === 2 ? "12px" : "9px", color: "#ffe9a8" }).setOrigin(0.5).setDepth(pl.by + 2);
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
      const c = this.add.text(x, y - 12, "", { fontSize: "12px" }).setOrigin(0.5).setDepth(99999);
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
    pl.spr.setScale((GF.TILE * 0.73) / pl.spr.width);   // ~20px visibles, centrado en la tierra
    pl.emo.setVisible(false);
  }
  // cultivo (conjunto) cuando está listo; si falta el sprite, cae al emoji
  showReadyCrop(pl) {
    const key = "cropg_" + pl.cropKey;
    if (pl.cropKey && this.textures.exists(key)) {
      pl.spr.setTexture(key).setVisible(true);
      pl.spr.setScale((GF.TILE * 1.02) / pl.spr.width);   // ~27px visibles
      pl.emo.setVisible(false);
    } else {
      pl.spr.setVisible(false);
      const cd = CROP_DEF[pl.cropKey];
      pl.emo.setText(cd ? cd.emoji : "").setVisible(true);
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
    if (this.textures.exists("withered")) {   // sprite cozy del cultivo marchito
      pl.spr.setTexture("withered").clearTint().setAlpha(1).setVisible(true);
      pl.spr.setScale((GF.TILE * 0.59) / pl.spr.width);   // ~24px visibles
      pl.emo.setVisible(false);
    } else if (pl.spr.visible) { pl.spr.setTint(0x7a6f52).setAlpha(0.75); }
    else { pl.emo.setText("").setVisible(true); }
    pl.timer.setVisible(false);
  }

  update(time, deltaMs) {
    if (this.leaving || !this.hero) return;   // cambiando de escena: no tocar nada más
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero;
    this.drawOlas(dt);   // olas de la isla
    this.seguirAura();

    // restaurar objetos que salieron de cooldown
    const t = nowMs();
    for (const o of this.objs) {
      // regeneración directa: de los restos vuelve al nodo entero (sin pasar por el dañado)
      if (o.readyAt && t >= o.readyAt) {
        o.readyAt = 0; o.halfAt = 0;
        if (o.type === "tree" || o.type === "rock") this.setObjTex(o, o.baseKey, o.rw || o.w);
        else if (o.type === "ore") { this.setObjTex(o, o.baseKey, o.rw || o.w); o.sprite.setAlpha(1); }
        if (o.timer) o.timer.setVisible(false);
      } else if (o.readyAt && o.halfAt && t >= o.halfAt) {
        // MITAD del enfriamiento: se ve que va regenerando (doc 4/8)
        o.halfAt = 0;
        if (o.type === "tree") {
          if (this.textures.exists("tree_half")) this.setObjTex(o, "tree_half", o.rw || o.w);
          else if (this.textures.exists("sprout")) this.setObjTex(o, "sprout", (o.rw || o.w) * 0.6);
        } else if (o.type === "rock" || o.type === "ore") {
          if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
          else o.sprite.setAlpha(0.75);
        }
      } else if (o.readyAt && o.timer) {
        // cuarta.docx: el timer del recurso solo aparece con el cursor encima (al clickear ya sale el aviso)
        const p = this.input.activePointer;
        const over = this.timerOn(o);
        if (over) o.timer.setText(fmtSecs(Math.ceil((o.readyAt - t) / 1000))).setPosition(o.cx, this.topY(o, (o.type === "ore" || o.type === "rock") ? -6 : 7)).setVisible(true);   // detalles213: el timer del mineral pegado al nodo (antes flotaba alto y se mezclaba)
        else o.timer.setVisible(false);
      }
    }
    this.updateHoverFx();   // brillo sobre lo interactuable (hover + cercanía)
    // clic sostenido: aplicar el destino que quedó pendiente por el freno del recálculo
    if (this.hold && this.hold.active && this.holdPend && t - (this.holdAt || 0) > 130) {
      const hp = this.holdPend; this.holdPend = null; this.holdSeek(hp.x, hp.y);
    }
    if (!this.moveTarget && this.destMk && this.destMk.visible) this.hideDest();   // llegó: fuera el marcador

    // timer del dummy: cuánto falta para poder entrenar otra vez (detalles 338)
    if (!this.dummyObj) this.dummyObj = this.objs.find(o => o.type === "dummy") || null;
    if (this.dummyObj) {
      const left = (G.dummyUsedAt || 0) + DUMMY_CD_MS - t;
      if (!this.dummyTimer) this.dummyTimer = this.add.text(this.dummyObj.cx, this.dummyObj.by - T * 1.15, "",
        { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(this.dummyObj.by + 3);
      this.dummyTimer.setPosition(this.dummyObj.cx, this.topY(this.dummyObj));
      if (this.timerOn(this.dummyObj)) this.dummyTimer.setText(left > 0 ? fmtDur(left) : "Listo").setVisible(true);
      else this.dummyTimer.setVisible(false);
      // dummy desgastado mientras descansa: cortes y paja afuera; al estar listo vuelve el sano
      const broken = left > 0;
      if (broken !== this.dummyBroken && this.textures.exists("dummy_broken")) {
        this.dummyBroken = broken;
        const s = this.dummyObj.sprite;
        s.setTexture(broken ? "dummy_broken" : this.dummyObj.baseKey);
        s.setScale(this.dummyObj.rw / s.width);   // reajustar por si el lienzo difiere
      }
    }
    if (G.forgeLitUntil && t >= G.forgeLitUntil) { G.forgeLitUntil = 0; this.updateForge(); }   // se apaga sola al terminar

    // lotes: pasar de "creciendo" a "listo"
    for (const pl of this.plots) {
      // listo sin cosechar: cuenta regresiva al marchitado
      // el contador del cultivo solo aparece con el cursor encima (igual que árboles y nodos)
      const plOver = this.timerOn(pl);
      // 2/8: MARCHITADO DESACTIVADO (pedido del diseñador) — el cultivo listo ya no se pudre
      if (pl.state === "ready" && pl.witherAt) { pl.witherAt = 0; this.syncPlots(); }
      if (pl.state !== "growing") continue;
      if (t >= pl.readyAt) { pl.state = "ready"; pl.readyAt = 0; pl.witherAt = 0; this.showReadyCrop(pl); this.syncPlots(); }   // 2/8: sin marchitado — la cosecha espera
      else {
        if (plOver) pl.timer.setText(fmtSecs(Math.max(0, Math.ceil((pl.readyAt - t) / 1000)))).setPosition(pl.cx, this.topY(pl)).setVisible(true);
        else pl.timer.setVisible(false);
        // a media cosecha: la planta intermedia (se asoma la verdura) o el brote más grande
        if (!pl.half && pl.growTotal && (pl.readyAt - t) <= pl.growTotal / 2) {
          pl.half = true;
          const mk = "cropm_" + pl.cropKey;
          if (pl.cropKey && this.textures.exists(mk)) pl.spr.setTexture(mk);
          pl.spr.setScale((GF.TILE * 0.96) / pl.spr.width);   // ~25px visibles
          this.setPlotGlow(pl, "half");
        }
      }
    }
    // peces de la laguna: nadan de un punto a otro
    if (this.pondFish) for (const f of this.pondFish) {
      const dx = f.tgt.x - f.s.x, dy = f.tgt.y - f.s.y, d = Math.hypot(dx, dy);
      if (d < 3) { f.tgt = this.pondPoint(); f.sp = 10 + Math.random() * 12; }
      else { const sp = Math.min(f.sp * dt, d); f.s.x += dx / d * sp; f.s.y += dy / d * sp; if (f.s.setFlipX) f.s.setFlipX(dx > 0); else f.s.setScale(dx < 0 ? -1 : 1, 1); }   // el arte mira a la izquierda
    }
    // amenazas (jabalíes)
    // JABALÍ DESACTIVADO (2/8, pedido del diseñador). Para reactivarlo, descomentar:
    // if (t >= this.nextThreatAt && this.threats.length === 0) { this.nextThreatAt = t + 60000; this.spawnThreat(); }
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const b = this.threats[i];
      const dx = b.tgt.cx - b.cx, dy = b.tgt.by - b.by, d = Math.hypot(dx, dy);
      if (d > 2) {
        const sp = Math.min(70 * dt, d); b.cx += dx / d * sp; b.by += dy / d * sp;
        if (this.anims.exists("boar_walk") && b.sprite.anims.currentAnim?.key !== "boar_walk") b.sprite.play("boar_walk");
      } else if (this.anims.exists("boar_atk") && b.sprite.anims.currentAnim?.key !== "boar_atk") {
        b.sprite.play("boar_atk");   // llegó al cultivo: embiste y hociquea hasta arruinarlo
      }
      b.sprite.setPosition(b.cx, b.by).setDepth(b.by).setScale((dx < 0 ? -1 : 1) * b.baseScale, b.baseScale);
      if (t >= b.damageAt) {
        if (b.tgt.state === "growing" || b.tgt.state === "ready") { b.tgt.state = "dry"; b.tgt.cropKey = null; b.tgt.readyAt = 0; this.setPlotGlow(b.tgt, "off"); b.tgt.spr.setVisible(false); b.tgt.emo.setVisible(false); b.tgt.timer.setVisible(false); this.syncPlots(); log("Un jabalí arruinó un cultivo.", "bad"); toast("Cultivo arruinado"); }
        b.sprite.destroy(); this.threats.splice(i, 1);
      }
    }

    // acción en curso: bloquea movimiento
    if (this.action) {
      // la pesca se interrumpe si el jugador intenta moverse (teclas)
      if (this.action.kind === "fish" && (k.left.isDown || k.right.isDown || k.up.isDown || k.down.isDown || k.aleft.isDown || k.aright.isDown || k.aup.isDown || k.adown.isDown)) {
        this.cancelFishing();
      }
      if (!this.action) { hero.setDepth(hero.y); this.updatePrompt(); return; }
      this.action.t += dt;
      // al picar/talar: a mitad de la acción el nodo pasa al estado dañado (entero → dañado → restos)
      const ao = this.action.o;
      if (!this.action.halfDone && ao && (ao.type === "rock" || ao.type === "ore") && this.action.t >= this.action.dur / 2) {
        this.action.halfDone = true;
        if (this.textures.exists(ao.baseKey + "_half")) this.setObjTex(ao, ao.baseKey + "_half", ao.rw || ao.w);
      }
      // talar: el árbol pasa por dos cortes intermedios (tajo leve → tajo profundo con hojas caídas)
      if (ao && ao.type === "tree") {
        if (!this.action.cut1Done && this.action.t >= this.action.dur / 3 && this.textures.exists("tree_cut1")) { this.action.cut1Done = true; this.setObjTex(ao, "tree_cut1", ao.rw || ao.w); }
        if (!this.action.cut2Done && this.action.t >= this.action.dur * 2 / 3 && this.textures.exists("tree_cut2")) { this.action.cut2Done = true; this.setObjTex(ao, "tree_cut2", ao.rw || ao.w); }
      }
      if (this.action.t >= this.action.dur) this.finishAction();
      const sign = this.facing === "west" ? -1 : 1;
      if (this.action) {
        hero.setScale(sign * this.actScale, this.actScale);
        if (this.action.kind === "fish" && this.anims.exists("fish_cast")) {
          // pesca en 3 fases con el tirón de caña: lanzar (revertido) → esperar (caña adelante) → picar (tirón)
          const a = this.action, cur = hero.anims.currentAnim?.key;
          if (!a.phase) { a.phase = "cast"; hero.play("fish_cast"); }
          else if (a.phase === "cast" && (cur !== "fish_cast" || !hero.anims.isPlaying)) { a.phase = "wait"; hero.anims.stop(); hero.setTexture("hero_fish_3"); }
          else if (a.phase === "wait" && a.t >= a.dur - 0.55) { a.phase = "yank"; this.clearFishLine(); hero.play("fish_yank"); this.catchFx(); }
          if (a.phase === "wait") this.drawFishLine(sign); else if (a.phase !== "yank") this.clearFishLine();
          this.drawFishBar(a);   // barra de enfriamiento de la pesca
        } else {
          const key = "act_" + this.action.kind;
          if (hero.anims.currentAnim?.key !== key) hero.play(key);
        }
      }
      hero.setDepth(hero.y);
      this.updatePrompt();
      return;
    }

    // movimiento
    let vx = 0, vy = 0;
    if (GF.NO_WALK || GF.uiOpen || GF.editMode) { this.moveTarget = null; this.path = null; this.pendingObj = null; if (!GF.NO_WALK) this.clearQueue(); }
    else {
      if (!GF.NO_WALK) {   // sin granjero en la granja, WASD/flechas no mueven nada
        if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
        if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
      }
      if (vx || vy) { this.moveTarget = null; this.path = null; this.pendingObj = null; }   // el teclado manda: cancela la ruta
      else if (this.moveTarget) {
        const dx = this.moveTarget.x - hero.x, dy = this.moveTarget.y - hero.y, d = Math.hypot(dx, dy);
        if (d < 5) {   // waypoint alcanzado: seguir con el próximo tramo de la ruta
          this.moveTarget = (this.path && this.path.length) ? this.path.shift() : null;
          if (this.moveTarget) { const dx2 = this.moveTarget.x - hero.x, dy2 = this.moveTarget.y - hero.y, d2 = Math.hypot(dx2, dy2) || 1; vx = dx2 / d2; vy = dy2 / d2; }
        } else { vx = dx / d; vy = dy / d; }
      }
    }
    const moving = !!(vx || vy);
    if (moving) {
      const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      const step = GF.SPEED * speedMult() * dt, nx = hero.x + vx * step, ny = hero.y + vy * step;
      let moved = false;
      if (!GF.blockedAt(nx, ny, 6)) { hero.x = nx; hero.y = ny; moved = true; }
      else { if (vx && !GF.blockedAt(nx, hero.y, 6)) { hero.x = nx; moved = true; } if (vy && !GF.blockedAt(hero.x, ny, 6)) { hero.y = ny; moved = true; } }
      // esquiva suave (teclado o roce contra una pared): probá ángulos a los lados del rumbo
      if (!moved) {
        const base = Math.atan2(vy, vx);
        for (const off of [0.5, -0.5, 1.0, -1.0, 1.571, -1.571, 2.1, -2.1]) {   // hasta perpendicular y algo hacia atrás: bordea la pared
          const a = base + off, sx = hero.x + Math.cos(a) * step, sy = hero.y + Math.sin(a) * step;
          if (!GF.blockedAt(sx, sy, 6)) { hero.x = sx; hero.y = sy; moved = true; break; }
        }
      }
      // sin acercarse al destino en ~2s: cortar (no hay forma de llegar más cerca)
      if (this.moveTarget) {
        const dst = (this.path && this.path.length) ? this.path[this.path.length - 1] : this.moveTarget;
        const dd = Math.hypot(dst.x - hero.x, dst.y - hero.y);
        if (this.lastDD == null || dd < this.lastDD - 1) { this.lastDD = dd; this.noProg = 0; }
        else if ((this.noProg = (this.noProg || 0) + 1) > 120) { this.moveTarget = null; this.path = null; this.pendingObj = null; this.noProg = 0; this.lastDD = null; }
      } else { this.lastDD = null; this.noProg = 0; }
      // seguía una ruta y quedó trabado (un jabalí, un cofre nuevo…): recalcular la ruta
      if (moved) this.pathStuck = 0;
      else if (this.moveTarget) {
        this.pathStuck = (this.pathStuck || 0) + 1;
        const dest = (this.path && this.path.length) ? this.path[this.path.length - 1] : this.moveTarget;
        this.navOf().invalidate();   // la rejilla puede haber cambiado
        if (this.pathStuck > 2 || !this.goTo(dest.x, dest.y)) { this.moveTarget = null; this.path = null; this.pendingObj = null; this.pathStuck = 0; }
      }
      if (vx < 0) this.facing = "west"; else if (vx > 0) this.facing = "east";
    }

    // clic-para-interactuar: al llegar cerca del objeto pedido, actuar
    if (this.pendingObj) {
      const po = this.pendingObj;
      const rad = (po.type === "barn" || po.type === "market" || po.type === "store" || po.type === "cocina" || po.type === "horno") ? 72 : (po.type === "plot" ? 26 : 58);   // al caminar hacia un plot, llegar bien encima antes de actuar
      const d = Math.hypot(po.cx - hero.x, po.by - hero.y);
      if (d < rad) { this.moveTarget = null; this.pendingObj = null; this.interactWith(po); if (this.action) { hero.setDepth(hero.y); return; } }
      else if (!this.moveTarget) this.pendingObj = null;
    }
    // cola: al quedar libre, ir al siguiente objetivo clickeado
    if (!this.action && !this.pendingObj && !this.moveTarget && this.queue.length) {
      const nxt = this.queue.shift();
      this.unmarkQueued(nxt);   // deja de estar en cola: fuera el punto
      this.pendingObj = nxt; this.goTo(nxt.cx, nxt.by + 18);
    }

    const sign = this.facing === "west" ? -1 : 1;
    hero.setScale(sign * this.idleScale, this.idleScale);
    if (moving) { if (hero.anims.currentAnim?.key !== "walk") hero.play("walk"); }
    else {
      const cur = hero.anims.currentAnim?.key;
      // dejar terminar el espadazo del dummy (una pasada) antes de volver a quieto
      if (cur !== "idle" && !(cur === "act_sword" && hero.anims.isPlaying)) hero.play("idle");
    }
    hero.setDepth(hero.y);

    this.updatePrompt();
  }

  updatePrompt() {
    const el = $("prompt"); if (!el) return;
    if (GF.uiOpen || this.action || GF.editMode) { el.classList.remove("show"); return; }
    if (GF.NO_WALK) {   // granja de un clic: el cartel describe lo que hay BAJO EL CURSOR
      const pt = this.input.activePointer, wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const q of this.objs) { if (this.hitsSprite(q.sprite, wx, wy)) { const d = Math.hypot(q.cx - wx, q.by - wy); if (d < bd) { bd = d; hit = q; } } }
      if (!hit) for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < GF.TILE / 2 && Math.abs(wy - pl.by) < GF.TILE / 2) { hit = pl; break; } }
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;
      if (hit) { el.textContent = this.promptText(hit); el.classList.add("show"); }
      else if (this.pondDist(wx, wy) < 1.05) { el.textContent = "Pescar (1 lombriz · tenés " + fmt(G.res.lombriz || 0) + ")"; el.classList.add("show"); }
      else el.classList.remove("show");
      return;
    }
    const o = this.nearestInteract();
    if (o) { el.textContent = this.promptText(o) + "  ·  [E]"; el.classList.add("show"); }
    else if (this.nearPond()) { el.textContent = "Pescar (1 lombriz · tenés " + fmt(G.res.lombriz || 0) + ") · [E]"; el.classList.add("show"); }
    else el.classList.remove("show");
  }
}
