/* FarmScene: la granja privada. Fase 1 (mundo) + Fase 3 (interacciones). */
// CD (enfriamiento árbol/piedra) ahora vive en state.js para el panel de balanceo
function witherMs(ck) { const cd = CROP_DEF[ck]; return cd ? cd.grow * 1000 * 0.5 : 120000; }   // marchitado proporcional: mitad del tiempo de cultivo
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
    this.dummyObj = null; this.dummyTimer = null; this.fishBar = null; this.adornos = null;   // si no se suelta, al volver del bosque la barra de pesca no vuelve a aparecer (10/8)
    this.editHl = null; this._nav = null; this.storeObj = null; this.forgeGlow = null;
    this.bobber = null; this.bobberTween = null; this.fishLine = null;
    this.hold = null; this.path = null; this.holdLast = null; this.holdPend = null;
    this.pathStuck = 0; this.lastDD = null; this.noProg = 0;
    this.unlockPend = null; this.leaving = false;
    this.dragObj = null; this.dragPlot = null; this.dragPond = false;
    this.dummyBroken = false;
    this.auraFx = null; this.auraTw = null;
    this.clickHit = null; this.clickPond = false; this.buffer = null;
    this.corral = null; this.animales = null; this.corralCerca = null;
    this.nubes = null; this.maripos = null; this._part = 0; this._rafActiva = false; this._vaporAt = 0;   // efectos de ambiente
    this.queue = [];      // cola de acciones: clickeá varios objetivos y se hacen en orden
    this.cameras.main.setBackgroundColor(GF.ISLA ? "#2e7fa8" : "#328032");   // isla: agua alrededor · 12/8: verde al tono del pasto nuevo

    this.dragPlot = null; this.dragPond = false;
    // posiciones editadas de laguna y parcelas: primero base, después lo guardado
    if (GF.PLOTS_BASE) GF.PLOTS.forEach((b, i) => { if (GF.PLOTS_BASE[i]) { b.col = GF.PLOTS_BASE[i].col; b.row = GF.PLOTS_BASE[i].row; } });   // las extra (13+) no tienen base: conservan la suya
    if (GF.POND_BASE) { GF.POND.col = GF.POND_BASE.col; GF.POND.row = GF.POND_BASE.row; }
    if (G.layoutPond && typeof G.layoutPond.col === "number") { GF.POND.col = G.layoutPond.col; GF.POND.row = G.layoutPond.row; }
    // PARCELAS EXTRA (13-60, pedido del diseñador 10/8, fix #17 11/8): GF.PLOTS nace con la
    // grilla de 12; las compradas de más entran SOLO cuando el jugador las colocó con clic
    // (parcelaColocar les guarda la celda en layoutPlots). Las no colocadas quedan pendientes
    // en la zona de edición.
    while (GF.PLOTS.length < (typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60) && G.layoutPlots && G.layoutPlots[GF.PLOTS.length]) {
      const sv = G.layoutPlots[GF.PLOTS.length];
      GF.PLOTS.push({ col: sv.col, row: sv.row });
    }
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
        g.fillStyle((r + c) % 2 === 0 ? 0x6c8c53 : 0x64834c, 1);
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
        const col = drnd() < 0.6 ? 0x455c35 : 0x688451;
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
    this.fenceSprites = [];   // referencias para la valla dorada de la Granja Legendaria (10/8)
    if (this.textures.exists("fence_top")) {
      const FH = T * 0.55, p2 = GF.POND;   // alto del tramo horizontal (de frente)
      const pondCell = (c, r) => c >= p2.col && c < p2.col + p2.cols && r >= p2.row && r < p2.row + p2.rows;
      // horizontales de punta a punta (incluyen las celdas de esquina)
      for (let c = 0; c < GF.COLS; c++) {
        if (!pondCell(c, 0)) this.fenceSprites.push(this.add.image(c * T + T / 2, T * 0.58, "fence_top").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(2));
        if (!pondCell(c, GF.ROWS - 1)) this.fenceSprites.push(this.add.image(c * T + T / 2, H + 6, "fence_bottom").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(H + 6));
      }
      // verticales de arriba a abajo: al cruzarse con las horizontales en las esquinas, la unión
      // es perfecta por construcción (son las mismas piezas, sin sprite de esquina aparte)
      for (let r = 0; r < GF.ROWS; r++) {
        if (!pondCell(0, r)) this.fenceSprites.push(this.add.image(7, r * T + T, "fence_left").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(3));
        if (!pondCell(GF.COLS - 1, r)) this.fenceSprites.push(this.add.image(W - 7, r * T + T, "fence_right").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(3));
      }
    }

    // objetos del mundo (con estado para interacción)
    let __treeN = 0, __rockN = 0;   // viernes (2): orden de desbloqueo de árboles y piedras
    if (typeof planosSync === "function") planosSync(true);   // blueprints (12/8): guardados viejos reciben sus planos
    this.objs = GF.WORLD_OBJECTS.map((o, i) => {
      const lp = (G.layout && G.layout[i]) || null;                            // posición editada por el jugador
      // blueprints (12/8): si el edificio se colocó con su plano, ESA es su posición
      // (el arrastre en edición, si lo mueven después, sigue ganando)
      const op = (!lp && typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && typeof obraDe === "function") ? obraDe(o.type) : null;
      const cx = lp ? lp.cx : (op ? (op.col + 0.5) * T : o.cx), by = lp ? lp.by : (op ? (op.row + 1) * T : o.by);
      // el portal es sprite para poder animar el espiral girando; el resto sigue como imagen
      const texKey = this.textures.exists(o.key) ? o.key : "store";   // respaldo si falta el arte (p.ej. horno.png aún no bajado)
      const s = (o.key === "portal" ? this.add.sprite(cx, by, texKey) : this.add.image(cx, by, texKey)).setOrigin(0.5, 1);
      if (o.key === "portal" && this.anims.exists("portal_spin")) s.play("portal_spin");
      // edificios sin construir (blueprints 12/8): si NO colocaste el plano, el edificio
      // directamente NO EXISTE en el mapa. Si lo colocaste, se ve su OBRA (build_*) a la
      // espera de materiales. El gris viejo queda de respaldo si faltara el arte de obra.
      let oculto = false;
      if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
        if (!op && !lp) { s.setVisible(false); oculto = true; }   // sin plano colocado: invisible
        else if (this.textures.exists("build_" + o.type)) s.setTexture("build_" + o.type);
        else s.setAlpha(0.5).setTint(0x555555);
      }
      // viernes (2): árboles y piedras bloqueados (1 activo + resto difuminado, se desbloquean en orden)
      let lockIdx = -1;
      if (o.type === "tree") lockIdx = __treeN++;
      if (o.type === "rock") lockIdx = __rockN++;
      // 12/8 (noche): SOLO los árboles conservan el bloqueo visual — el bloqueado es un
      // RETOÑO que crece al pagarlo. Las vetas/piedras van todas a la vista y a todo
      // color: su freno es por NIVEL y avisa al intentar picarlas (nodoBloqueado).
      const locked = o.type === "tree" && !(G.treesOpen || [0]).includes(lockIdx);
      if (locked) {
        if (this.textures.exists("tree_sapling")) s.setTexture("tree_sapling");
        else s.setAlpha(0.5).setTint(0x555555);
      }
      const rw = (o.type === "ore" || o.type === "rock") ? o.w * (typeof NODO_ESCALA === "number" ? NODO_ESCALA : 0.67)   // 9/8: 0.90 — al 0.67 las pepitas no se leían
        : (o.type === "tree") ? o.w * 0.8                                   // árboles −20%
        : (o.type === "market" || o.type === "store") ? o.w * 0.8           // tiendas −20%
        : (o.type === "dummy" ? o.w * 1.25 : o.w);                          // dummy +25%
      s.setScale(rw / s.width); s.setDepth(by);
      if (locked && s.texture && s.texture.key === "tree_sapling") s.setScale((rw * 0.55) / s.width);   // el retoño es chico, como corresponde
      // sombra bajo árboles y edificios (detalles 29/7)
      let shadow = null;
      // los árboles NO llevan sombra: su sprite ya trae la base de tierra dibujada y la elipse quedaba abajo de la tierra
      // 12/8: los edificios YA NO llevan elipse de sombra — con el set mercadillo no quedaba
      // bien de ningún tamaño (el arte nuevo apoya directo sobre el pasto). Solo el dummy la conserva.
      if (o.type === "dummy") {   // sombra chiquita bajo el dummy
        shadow = this.add.ellipse(cx, by - 2, rw * 0.55, T * 0.2, 0x1c2a12, 0.2).setDepth(by - 0.5);
      }
      return { i, type: o.type, ore: o.ore, cx, by, w: o.w, rw, baseKey: o.key, sprite: s, shadow, readyAt: 0, lockIdx, locked, oculto };
    });
    this.objs.forEach(o => this.tintarNodo(o));   // cada veta con el color de su mineral (9/8)
    this.objs.forEach(o => this.letreroObra(o));  // blueprints (12/8): el cartel de materiales sobre cada obra

    // (los rótulos flotantes se quitaron: los edificios nuevos se distinguen solos
    //  y el aviso de interacción ya los nombra al acercarse)

    // portal al Bosque — ahora con su sprite cozy (arco de piedra con vórtice)
    if (window.ForestScene !== undefined || typeof ForestScene !== "undefined") {
      const px = GF.WORLD_W - 90, py = GF.WORLD_H - 52;   // 12/8: DENTRO de la cerca (antes nacía sobre la esquina)
      let pspr = null;
      if (this.textures.exists("portal")) {
        // sprite (no imagen) para que el espiral gire 360° en loop; el latido sutil se mantiene
        pspr = this.add.sprite(px, py, "portal").setOrigin(0.5, 1).setDepth(py);
        pspr.setScale((T * 1.4) / pspr.width);
        if (this.anims.exists("portal_spin")) pspr.play("portal_spin");
        this.tweens.add({ targets: pspr, scaleY: pspr.scaleY * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });   // latido sutil del vórtice
      } else {   // respaldo si falta el arte del portal: un arco oscuro dibujado (era un Text vacío)
        const g = this.add.graphics().setDepth(py);
        g.fillStyle(0x6b6357, 1).fillEllipse(0, -18, 44, 52);
        g.fillStyle(0x140f1c, 1).fillEllipse(0, -16, 30, 38);
        g.setPosition(px, py);
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
      // OJO con la profundidad: este dibujo va DEBAJO del pasto (-1000). Estaba en -1000
      // igual que los tiles y, al crearse después, los tapaba: el suelo de la granja se
      // veía como un verde plano y la textura del pasto nunca llegaba a verse (9/8).
      const g = this.add.graphics().setDepth(-1003);
      g.fillStyle(0x2e7fa8, 1).fillRect(-MAR, -MAR, GF.WORLD_W + MAR * 2, GF.WORLD_H + MAR * 2);   // mar profundo
      // COSTA (9/8): la orilla es una imagen con las transiciones terminadas (pasto → arena
      // mojada → espuma → bajío → mar), con dithering y el contorno irregular. Antes eran tres
      // rectángulos redondeados de color plano, uno arriba del otro, y el borde quedaba duro.
      // La genera tools/build-isla.py; su origen es (-GF.ISLA_ORIGEN, -GF.ISLA_ORIGEN).
      if (this.textures.exists("isla")) {
        const o = GF.ISLA_ORIGEN || 112;
        this.add.image(-o, -o, "isla").setOrigin(0, 0).setDepth(-1002);
      } else {   // respaldo: si el PNG no llegó, los rectángulos de siempre
        const r = this.add.graphics().setDepth(-1002);
        r.fillStyle(0x3fa3cc, 1).fillRoundedRect(-70, -70, GF.WORLD_W + 140, GF.WORLD_H + 140, 90);
        r.fillStyle(0xe8d9a6, 1).fillRoundedRect(-34, -34, GF.WORLD_W + 68, GF.WORLD_H + 68, 60);
        r.fillStyle(0x75975a, 1).fillRoundedRect(-8, -8, GF.WORLD_W + 16, GF.WORLD_H + 16, 34);
      }
      // espuma: líneas claras que van y vienen sobre la orilla
      this.olas = this.add.graphics().setDepth(-999);
      this.olasT = 0;
    }
    this.rebuildCollisions();
    GF.scene = "farm";
    window.farmScene = this;   // para refrescar la flecha del tutorial desde la UI
    if (window.syncPlacingUI) syncPlacingUI(false);   // 13/8: la escena arranca sin nada "en la mano"
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
        // 13/8: la parcela bloqueada usa el parche clásico (ramas, piedritas y yuyos)
        // pero A TODO COLOR — chau tinte gris y transparencia (el plot_wild tupido no gustó)
        if (obj.ground) {
          if (this.textures.exists("plot_blocked")) obj.ground.setTexture("plot_blocked").setDisplaySize(T, T).clearTint().setAlpha(1);
          else obj.ground.setAlpha(0.45);
        }
        return obj;
      }
      const sv = savedPlots[i];   // restaura lo plantado antes del refresh (ignora estados viejos como "wet")
      if (sv && (sv.state === "growing" || sv.state === "ready")) {
        obj.state = sv.state; obj.readyAt = sv.readyAt || 0; obj.cropKey = sv.cropKey || null;
        obj.witherAt = 0;   // 2/8: sin marchitado
        obj.growTotal = sv.growTotal || 0;
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
    this.updateSkins();   // sombrero / pétalos / granja legendaria, si los tenías puestos
    if (GF.NO_WALK) hero.setVisible(false);   // el granjero solo se ve en la Zona Negra
    this.updateAura();

    // clic derecho sobre una parcela seca: rueda de sembrado rápido
    this.input.mouse.disableContextMenu();

    // clic: si pegás a un objeto, caminá hacia él e interactuá; si no, movete al punto
    this.input.on("pointerdown", (pt) => {
      if (pt.rightButtonDown()) {
        if (GF.editMode) {
          if (this.placing) { this.cancelarColocar(); return; }   // clic derecho cancela el "colocar con clic"
          // en edición el clic derecho levanta el adorno que haya abajo (vuelve a la bolsa)
          const ad = this.adornoEnPunto(pt.worldX, pt.worldY);
          if (ad) this.levantarAdorno(ad);
          return;
        }
        if (GF.uiOpen) return;
        const wx = pt.worldX, wy = pt.worldY;
        // fixs.docx #12 (11/8): clic derecho sobre un animal lo ALIMENTA ahí mismo (la función
        // existía pero solo dentro de la ventana del Establo y nadie la encontraba)
        { const an = this.animalEnPunto && this.animalEnPunto(wx, wy);
          if (an && typeof alimentarAnimal === "function") { alimentarAnimal(an.k); return; } }
        for (const pl of this.plots) {
          if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) {
            if (pl.state === "dry" && typeof showSeedWheel === "function") showSeedWheel(pt.event.clientX, pt.event.clientY, pl);
            return;
          }
        }
        return;
      }
      if (GF.editMode && this.placing) {   // 13/8: colocar se resuelve al SOLTAR — así el arrastre panea la cámara
        this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false };
        return;
      }
      if (GF.editMode) {   // modo edición: agarrar adorno, objeto, parcela o laguna bajo el cursor
        const wx = pt.worldX, wy = pt.worldY; let hit = null, bd = 1e9;
        // los adornos van PRIMERO: son chicos y suelen quedar encima de una parcela o pegados
        // a un edificio, así que si no se miran antes nunca se los podría agarrar.
        const ad = this.adornoEnPunto(wx, wy);
        if (ad) { this.dragDeco = ad; return; }
        for (const o of this.objs) { if (o.type === "fish") continue; if (this.hitsSprite(o.sprite, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } } }
        if (hit) { hit.origCx = hit.cx; hit.origBy = hit.by; this.dragObj = hit; return; }
        for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { this.dragPlot = pl; return; } }
        if (this.pondImg && this.pondDist(wx, wy) < 1) { this.dragPond = true; return; }
        this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false };   // 13/8: nada agarrado → el arrastre panea también en edición
        return;
      }
      if (GF.uiOpen) return;
      const wx = pt.worldX, wy = pt.worldY;
      this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false, t0: nowMs() };   // por si esto se convierte en un arrastre
      let hit = null, bd = 1e9;
      for (const o of this.objs.concat(this.threats)) {
        if (this.hitsSprite(o.sprite, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } }
      }
      if (!hit) { for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { hit = pl; break; } } }
      if (!hit) { const an = this.animalEnPunto(wx, wy); if (an) hit = { type: "animal", k: an.k, cx: an.spr.x, by: an.spr.y }; }   // animal del corral
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;   // clic en el portal : caminar y teletransportarse
      if (this.action && !GF.NO_WALK) {   // acción en curso: encolar el próximo objetivo (hasta 7) sin esperar la animación
        if (hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("En cola (" + this.queue.length + ")"); }
        }
        return;
      }
      if (GF.NO_WALK) {
        // granja de un clic: la acción se resuelve al SOLTAR, no al apretar. Si no fuese así,
        // arrastrar la vista empezando encima de un árbol lo talaba antes de poder mover la cámara.
        this.clickHit = hit || null;
        this.clickPond = (!hit && this.pondDist(wx, wy) < 1.05);
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
      // 13/8: modo COLOCAR — arrastrar panea la cámara y el cursor muestra la celda (verde/rojo)
      if (this.placing) {
        if (this.hold && pt.isDown && !pt.rightButtonDown() &&
            (this.hold.active || Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) >= 8)) {
          this.hold.active = true;
          const c = this.cameras.main, z = c.zoom || 1;
          const dx = this.hold.px - pt.x, dy = this.hold.py - pt.y;
          this.hold.px = pt.x; this.hold.py = pt.y;
          const L = this.camLim || { x1: 0, y1: 0, x2: GF.WORLD_W, y2: GF.WORLD_H };
          c.scrollX = Phaser.Math.Clamp(c.scrollX + dx / z, L.x1, Math.max(L.x1, L.x2 - c.width / z));
          c.scrollY = Phaser.Math.Clamp(c.scrollY + dy / z, L.y1, Math.max(L.y1, L.y2 - c.height / z));
        }
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), 0, GF.COLS - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), 0, GF.ROWS - 1);
        const esObra = this.placing.tipo === "obra";
        const libre = this.celdaLibreAdorno(col, row, -1) &&
          (!esObra || (this.celdaLibreAdorno(col - 1, row, -1) && this.celdaLibreAdorno(col + 1, row, -1)));
        const w = esObra ? 3 : 1, c0 = esObra ? col - 1 : col;
        this.editHl.setPosition(c0 * T, (row + 1) * T).setSize(w * T, T)
          .setFillStyle(libre ? 0x7ec95a : 0xd9534f, 0.4).setVisible(true);
        return;
      }
      if (this.dragDeco) {
        const a = this.dragDeco;
        a.g.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), 0, GF.COLS - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), 0, GF.ROWS - 1);
        this.editHl.setPosition(col * T, (row + 1) * T).setSize(T, T)
          .setFillStyle(this.celdaLibreAdorno(col, row, a.i) ? 0x7ec95a : 0xd9534f, 0.4).setVisible(true);
      } else if (this.dragObj) {
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
      } else if (this.hold && pt.isDown && !pt.rightButtonDown()) {
        // 13/8: en edición, con nada agarrado, el arrastre panea la cámara igual que en modo normal
        if (this.hold.active || Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) >= 8) {
          this.hold.active = true;
          const c = this.cameras.main, z = c.zoom || 1;
          const dx = this.hold.px - pt.x, dy = this.hold.py - pt.y;
          this.hold.px = pt.x; this.hold.py = pt.y;
          const L = this.camLim || { x1: 0, y1: 0, x2: GF.WORLD_W, y2: GF.WORLD_H };
          c.scrollX = Phaser.Math.Clamp(c.scrollX + dx / z, L.x1, Math.max(L.x1, L.x2 - c.width / z));
          c.scrollY = Phaser.Math.Clamp(c.scrollY + dy / z, L.y1, Math.max(L.y1, L.y2 - c.height / z));
        }
      }
    });
    this.input.on("pointerup", (pt) => {
      if (this.editHl) this.editHl.setVisible(false);
      // 13/8: modo COLOCAR — si el clic no fue un paneo, se coloca en la celda al SOLTAR
      if (GF.editMode && this.placing) {
        const fuePan = !!(this.hold && this.hold.active);
        this.hold = null;
        if (!fuePan && !pt.rightButtonReleased()) this.colocarEn(pt.worldX, pt.worldY);
        return;
      }
      // granja de un clic: acá se resuelve la acción, solo si NO fue un arrastre de cámara
      if (GF.NO_WALK && !GF.editMode && !GF.uiOpen && (this.clickHit || this.clickPond)) {
        const arrastro = !!(this.hold && (this.hold.active || this.hold.disparo));   // ya paneó, o el golpe ya salió sin esperar a soltar
        const hit = this.clickHit, pond = this.clickPond;
        this.clickHit = null; this.clickPond = false;
        // SIN COLA (4/8): un clic = un golpe, y se actúa directo sobre lo que tocás.
        // PERO el clic que cae mientras dura el candado NO se tira: se guarda y sale enseguida.
        // Sin esto, tocando rápido (que es como se juega) se perdían golpes y se sentía trabado.
        if (!arrastro && !pt.rightButtonReleased()) {
          if (this.action) {
            // el clic que cae durante el candado no se tira: se guarda UNO y sale enseguida.
            // Vale para nodos y para parcelas (cosechar una fila seguida es lo más común).
            const n = hit && (hit.type === "tree" || hit.type === "rock" || hit.type === "ore" || hit.type === "plot");
            if (n) this.buffer = { o: hit, t: nowMs() };
          } else if (hit) { this.pendingObj = null; this.interactWith(hit); }
          else if (pond) this.tryFish(pt.worldX, pt.worldY);
        }
      }
      this.clickHit = null; this.clickPond = false;
      // al soltar el clic sostenido, el granjero sigue caminando hasta el último punto señalado
      if (this.hold) { if (!GF.CAM_PAN && this.hold.active && this.holdPend) { const p = this.holdPend; this.holdPend = null; this.holdSeek(p.x, p.y); } this.hold = null; }
      if (!GF.editMode) { this.dragObj = this.dragPlot = this.dragDeco = null; this.dragPond = false; return; }
      // soltar un ADORNO
      if (this.dragDeco) {
        const a = this.dragDeco; this.dragDeco = null;
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), 0, GF.COLS - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), 0, GF.ROWS - 1);
        if (!this.celdaLibreAdorno(col, row, a.i)) {
          a.g.setPosition(a.cx, a.by).setDepth(a.by);
          toast("Ahí ya hay algo — elegí otra celda"); return;
        }
        const d = (G.decos || [])[a.i];
        if (d) { d.col = col; d.row = row; }
        this.syncAdornos();
        if (typeof saveFarm === "function") saveFarm(true);
        return;
      }
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
        // la grilla del pathfinding está cacheada hasta un invalidate() explícito: sin esto el
        // A* seguía creyendo que el agua estaba en el lugar viejo y armaba rutas que cruzaban
        // la laguna nueva y rodeaban un charco que ya no existe (10/8)
        this.rebuildCollisions();
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
      if (o.shadow) o.shadow.setPosition(o.cx, o.by - 1).setDepth(o.by - 0.5);   // 12/8: la sombra pegada al borde inferior
      if (o.timer) o.timer.setPosition(o.cx, o.by - T * 0.85);
      if (o.type === "cofre") { const c = G.chests && G.chests[o.chestIdx]; if (c) { c.col = leftCol; c.row = baseRow - 1; } }
      else { if (!G.layout) G.layout = {}; G.layout[o.i] = { cx: o.cx, by: o.by }; }
      this.rebuildCollisions();
      if (typeof saveFarm === "function") saveFarm(true);
      this.dragObj = null;
      this.updateTutoArrow();   // fixs.docx #15 (11/8): la flecha del tutorial sigue al edificio movido (antes hacía falta F5)
      this.letreroObra(o);      // blueprints (12/8): el cartel de materiales acompaña a la obra movida
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
    // HUMO DE LAS CHIMENEAS (9/8, reescrito). Antes cada edificio tenía su corrimiento a ojo
    // y el arte nuevo movió las chimeneas de lugar: el humo salía del techo o del aire. Ahora
    // sale de GF.CHIMENEA, que está medido sobre el PNG, y se inclina con el viento como los árboles.
    const smokeFrom = (obj, tint, cond, cada) => {
      const ch = (GF.CHIMENEA && GF.CHIMENEA[obj.type]) || { dx: 0, dy: 0.01 };
      this.time.addEvent({ delay: cada || 850, loop: true, callback: () => {
        if (!cond()) return;
        const sp = obj.sprite; if (!sp || !sp.visible) return;
        const alto = sp.displayHeight || (obj.rw || obj.w);
        const px = obj.cx + (obj.rw || obj.w) * ch.dx + (Math.random() * 5 - 2.5);
        const py = obj.by - alto + alto * ch.dy - 2;
        const s = this.add.image(px, py, "puff" + ((Math.random() * 3) | 0))
          .setTint(tint).setAlpha(0.55)
          .setScale(0.6 + Math.random() * 0.5).setAngle(Math.random() * 360)
          .setDepth(obj.by + 1);
        // la misma onda que mece los árboles empuja la bocanada: el humo no sube recto
        const viento = VIENTO_ON ? Math.sin(this.time.now / 1000 * Math.PI * 2 / Math.max(0.2, VIENTO_SEG)) * 16 : 0;
        this.tweens.add({ targets: s, y: py - 26 - Math.random() * 14, x: px + (Math.random() * 12 - 6) + viento,
          scale: s.scale * 2.2, angle: s.angle + (Math.random() * 70 - 35), alpha: 0,
          duration: 2300 + Math.random() * 700, onComplete: () => s.destroy() });
      }});
    };
    const storeObj = this.objs.find(o => o.type === "store");
    if (storeObj) smokeFrom(storeObj, 0xd8d2c4, () => !!(G.built && G.built.store));     // 13/8: humo solo con la herrería CONSTRUIDA
    // fragua: media por defecto, encendida mientras se trabaja en la Herrería (detalles jueves)
    this.storeObj = storeObj;
    this.updateForge();
    this.crearCorral();       // patio de los animales del Establo
    this.syncAdornos();       // adornos comprados en la Tienda (10/8)
    this.syncAnimales();      // aparecen los que ya tenés
    this.syncMascota();       // y la mascota, si tenés una puesta
    this.crearNubes();        // nubes que cruzan y proyectan sombra
    this.crearMariposas();    // mariposas que se posan sobre los cultivos listos
    this.arrancarBrilloVetas();   // chispitas sobre las vetas caras que están listas (9/8)
    const cocinaObj = this.objs.find(o => o.type === "cocina");
    if (cocinaObj) smokeFrom(cocinaObj, 0xefe9db, () => !!(G.built && G.built.cocina));   // 13/8: humo solo con la cocina CONSTRUIDA (antes humeaba sobre la obra o el pasto)
    if (cocinaObj) smokeFrom(cocinaObj, 0xffffff, () => !!(G.built && G.built.cocina) && (typeof cookList === "function" ? cookList().length > 0 : !!G.cooking));   // …y el doble mientras se cocina
    // HORNO DE PIEDRA: mismo humo que los demás (antes tenía el suyo propio, hecho con
    // elipses dibujadas, mucho más flojo y difícil de ver). Solo humea si está construido.
    const hornoObj = this.objs.find(o => o.type === "horno");
    if (hornoObj) smokeFrom(hornoObj, 0xcfcabb, () => !!(G.built && G.built.horno), 900);

    // cofres depósito colocados por el jugador (los que están en la bolsa NO se colocan solos)
    (G.chests = G.chests || []).forEach((c, idx) => { if (c.col != null) this.spawnChest(idx); });

    { const m = GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0;   // con isla, la cámara puede salir sobre el mar
      this.camLim = { x1: -m, y1: -m, x2: W + m, y2: H + m };
      this.cameras.main.setBounds(this.camLim.x1, this.camLim.y1, this.camLim.x2 - this.camLim.x1, this.camLim.y2 - this.camLim.y1); }
    if (!GF.CAM_PAN) this.cameras.main.startFollow(hero, false, 0.15, 0.15);
    else { this.cameras.main.stopFollow(); this.cameras.main.centerOn(W / 2, H * 0.42); }
    this.zoomUser = 1;
    this.fitCamera();
    this.scale.on("resize", this.fitCamera, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.fitCamera, this);
      if (this.brilloEv) { this.brilloEv.remove(); this.brilloEv = null; }   // al irse a la plaza o al bosque, se apaga
    });
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

    // La granja YA está dibujada: recién ahora se saca la pantalla de carga y se abren las
    // ventanas que esperaban (cofre diario). Todo aparece junto, no una cosa antes que la otra.
    if (typeof juegoListo === "function") this.time.delayedCall(60, juegoListo);
  }

  drawOlas(dt) {
    if (!this.olas) return;
    // Se redibujaba en cada frame: dos strokeRoundedRect de 1300x740 con esquinas redondeadas,
    // o sea reteselar y volver a subir la geometría 60 veces por segundo. El movimiento real
    // es un seno de ~1 Hz, así que a 10 fps se ve exactamente igual (10/8).
    this._olasAcc = (this._olasAcc || 0) + dt;
    if (this._olasAcc < 0.1) return;
    dt = this._olasAcc; this._olasAcc = 0;
    this.olasT = (this.olasT || 0) + dt;
    const t = this.olasT, W2 = GF.WORLD_W, H2 = GF.WORLD_H, g = this.olas;
    g.clear(); g.lineStyle(2, 0xdff3ff, 0.30);
    for (let i = 0; i < 2; i++) {
      const o = 62 + i * 16 + Math.sin(t * 0.9 + i) * 5;
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
    refreshHud();
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
    if (o.type === "animal") {
      const d = ANIMAL_DEF[o.k];
      if (typeof animalListo === "function" && animalListo(o.k)) return "Recoger " + RES_LABEL[d.mat] + " de " + d.label;
      return d.label + " — vuelve en " + fmtCorto(animalFalta(o.k) / 1000) + " (clic: Establo)";
    }
    if (o.type === "plot") {
      if (o.state === "locked") return "Desbloquear parcela (" + plotUnlockCost() + " de plata)";
      if (o.state === "withered") return "Limpiar cultivo marchito";
      if (o.state === "dry") { const cd = CROP_DEF[G.selSeed]; return "Plantar " + (cd ? cd.label : "cultivo"); }
      if (o.state === "ready") { const cd = CROP_DEF[o.cropKey]; return "Cosechar " + (cd ? cd.label : ""); }
      return "Creciendo…";
    }
    if (o.type === "portal") return "Teletransportarte a la Zona Negra" + (Object.keys(G.weapons || {}).length ? "" : " sin arma");
    const secs = cd ? Math.ceil((o.readyAt - nowMs()) / 1000) : 0;
    // cuántos clics faltan: un clic = un golpe, y si parás 5 s los golpes dados se pierden
    const gp = (tot) => " (" + ((o.golpes || 0) + 1) + "/" + tot + ")";
    if (o.type === "tree") { if (o.locked) return "Cultivar árbol (" + treeUnlockCost() + " madera)"; return cd ? "Vuelve en " + fmtSecs(secs) : "Talar madera" + gp(GOLPES_TALAR); }
    if (o.type === "rock") { if (typeof nodoBloqueado === "function" && nodoBloqueado(o)) return "🔒 Veta — se habilita a granja nivel " + nodoNivelReq(o); return cd ? "Vuelve en " + fmtSecs(secs) : "Picar piedra" + gp(GOLPES_MINAR); }
    if (o.type === "ore") { const od = ORE_DEF[o.ore]; if (!od) return "Minar"; if (cd) return od.emoji + " Vuelve en " + fmtSecs(secs); return "Minar " + od.label + gp(GOLPES_MINAR); }
    if (o.type === "barn") return "Granja";
    if (o.type === "market") return "Mercado";
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
      const falta = (typeof obraFalta === "function") ? obraFalta(o.type) : [];
      return "Obra de " + BUILD_DEF[o.type].label + " — clic para depositar (" + falta.map(x => x[1] + " " + (x[0] === "golden" ? "$G" : (RES_LABEL[x[0]] || x[0]))).join(" · ") + ")";
    }
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
      if (!hit) for (const q of this.threats) { if (this.hitsSprite(q.sprite, wx, wy)) { hit = q; break; } }
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;   // mismo alcance que el clic
      if (hit) this.interactWith(hit); else if (this.pondDist(wx, wy) < 1.05) this.tryFish(wx, wy);
      return;
    }
    const o = this.nearestInteract(); if (o) this.interactWith(o); else if (this.nearPond()) this.tryFish();
  }

  interactWith(o) {
    // EMBUDO ESTRICTO (13/8): en los primeros pasos del tutorial, solo la acción que el
    // objetivo pide. Cosechar lo plantado y trabajar obras se permiten siempre.
    if (typeof tutoPermite === "function") {
      let tag = null;
      if (o.type === "plot") tag = o.state === "dry" ? "plant" : (o.state === "locked" ? "plotunlock" : null);
      else if (o.type === "tree") tag = o.locked ? "cultivar" : "chop";
      else if (o.type === "rock" || o.type === "ore") tag = "mine";
      else if (o.type === "portal") tag = "portal";
      else if (o.type === "fish") tag = "fish";
      else if (o.type === "dummy") tag = "dummy";
      if (tag && !tutoPermite(tag)) { if (typeof tutoAviso === "function") tutoAviso(); return; }
    }
    if (o.type === "portal") {
      // 10/8: descanso entre viajes, y se abre el "viaje" para poder resumirlo al volver
      const espera = (typeof zonaCdLeft === "function") ? zonaCdLeft() : 0;
      if (espera > 0) { toast("El granjero está descansando — podés volver en " + fmtDur(espera)); return; }
      const entrar = () => {
        if (typeof tutoEvent === "function") tutoEvent("portal");
        GF.zona = "pantano";   // desde la granja siempre se entra por el primer mapa (10/8)
        if (typeof zonaEntrar === "function") zonaEntrar();
        if (typeof saveFarm === "function") saveFarm();
        this.leaving = true; irAEscena(this, "forest");
      };
      askConfirm("¿Entrás vos a pelear a la Zona Negra o mandás una incursión de un clic?", entrar,
        { title: "Zona Negra", yes: "Entrar a pelear", yesClass: "green", no: "Incursión (un clic)", noClass: "gold",
          onNo: () => { if (typeof refreshIncursion === "function") refreshIncursion(); openOv("ov-incursion"); } });
      return;
    }
    if (o.type === "animal") {   // clic sobre un animal del corral
      if (typeof animalListo === "function" && animalListo(o.k)) {
        const antes = G.res[ANIMAL_DEF[o.k].mat] || 0;
        recogerAnimal(o.k);
        const gan = (G.res[ANIMAL_DEF[o.k].mat] || 0) - antes;
        if (gan > 0) { this.premioFx(o.cx, o.by, resSprite(ANIMAL_DEF[o.k].mat), "+" + gan); this.estrellasFx(o.cx, o.by - 14); }   // fixs #11: celebración
      } else { if (typeof refreshEstablo === "function") refreshEstablo(); openOv("ov-establo"); }
      return;
    }
    if (o.type === "barn") return openOv("ov-barn");
    if (o.type === "market") return openOv("ov-market");
    // OBRA de blueprint (12/8): cada clic DEPOSITA los materiales que tengas; al
    // completar, estrellitas y el edificio queda construido. Sin ventanas de confirmación.
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
      if (o.oculto) return;
      const completo = (typeof obraDepositar === "function") && obraDepositar(o.type);
      this.letreroObra(o);   // el cartel refleja lo depositado
      if (completo) {
        obraConstruir(o.type);
        if (o.sprite) {
          if (this.textures.exists(o.baseKey) && o.sprite.texture.key !== o.baseKey) { o.sprite.setTexture(o.baseKey); o.sprite.setScale(o.rw / o.sprite.width); }
          o.sprite.setAlpha(1); o.sprite.clearTint();
          if (this.estrellasFx) this.estrellasFx(o.cx, o.by - (o.sprite.displayHeight || 60) * 0.5);
        }
        if (o.letrero) { o.letrero.destroy(); o.letrero = null; }
        this.tintarNodo(o);
        this.rebuildCollisions();
      }
      return;
    }
    // VETAS/PIEDRAS (12/8 noche): freno por NIVEL, sin compra — el aviso salta al intentar
    if (o.type === "rock" && typeof nodoBloqueado === "function" && nodoBloqueado(o)) {
      const req = nodoNivelReq(o);
      toast("🔒 Para picar esta veta necesitás granja nivel " + req + " (tenés " + G.level + ")");
      log("Esa veta se habilita a granja nivel " + req + ". Seguí subiendo de nivel para ampliarte.", "info");
      return;
    }
    // el tutorial "ampliá la granja" también se cumple al USAR una segunda veta habilitada
    if (o.type === "rock" && (o.lockIdx || 0) > 0 && typeof tutoEvent === "function") tutoEvent("unlocknode");
    // ÁRBOLES: el bloqueado es un retoño — se desbloquea pagando madera y CRECE
    if (o.type === "tree" && o.locked) {
      const cost = treeUnlockCost();
      askConfirm("Cuesta " + cost + " de " + RES_LABEL.madera + ". ¿Cultivar este árbol?", () => {
        if ((G.res.madera || 0) < cost) { toast("Te falta " + RES_LABEL.madera + " (" + cost + ")"); return; }
        if (typeof tutoGuardia === "function" && !tutoGuardia("madera", cost, "cultivar árboles")) return;   // guardia del tutorial (12/8)
        G.res.madera -= cost;
        G.treesOpen = G.treesOpen || [0]; G.treesOpen.push(o.lockIdx);
        o.locked = false;
        if (o.sprite) {   // el retoño CRECE hasta el árbol adulto, con hojitas volando
          if (this.textures.exists(o.baseKey)) { o.sprite.setTexture(o.baseKey); }
          o.sprite.setAlpha(1); o.sprite.clearTint();
          o.sprite.setScale((o.rw * 0.3) / o.sprite.width);
          this.tweens.add({ targets: o.sprite, scaleX: o.rw / o.sprite.width, scaleY: o.rw / o.sprite.width, duration: 700, ease: "Back.easeOut" });
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 22;
            const p = this.add.ellipse(o.cx, o.by - 30, 4, 3, i % 2 ? 0x3f9b3f : 0x2f7a2f, 0.9).setDepth(o.by + 1).setAngle(Math.random() * 360);
            this.tweens.add({ targets: p, x: o.cx + Math.cos(a) * d, y: o.by - 30 + Math.sin(a) * d, angle: p.angle + 160, alpha: 0, duration: 550 + Math.random() * 250, onComplete: () => p.destroy() });
          }
        }
        this.tintarNodo(o);
        addXp("crafting", 5); if (typeof syncSlots === "function") syncSlots();
        log("Cultivaste un árbol nuevo por " + cost + " de madera.", "good");
        if (typeof tutoEvent === "function") tutoEvent("unlocknode"); toast("¡Árbol nuevo creciendo!");
        refreshHud(); if (isOpen("ov-inv")) refreshInv(); if (typeof saveFarm === "function") saveFarm(true);
      }, { title: "Cultivar árbol", yes: "Cultivar", yesClass: "green", no: "Cancelar", noClass: "red" });
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
          G.plata -= cost; G.plotsOwned = (G.plotsOwned || 2) + 1;
          this.refreshPlotLocks();   // un solo camino para abrir parcelas (comprada o regalada)
          addXp("farming", 5);
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
    if (kind === "plant") this.action.seed = G.selSeed;   // queda fijada la semilla ya validada
    // RESPUESTA INMEDIATA: como el granjero no se ve, si el golpe no se nota AL INSTANTE el juego
    // se siente lento. Las astillas y la sacudida salen ya, en el mismo frame del clic.
    // RESPUESTA INMEDIATA para las CUATRO acciones. Antes solo talar y picar tenían el destello;
    // plantar y cosechar no mostraban nada hasta terminar, y por eso se sentían lentas.
    if (ACT_IMPACTO <= 0) {
      if (kind === "chop" || kind === "mine") { this.destelloFx(o); this.golpeFx(o, kind); this.action.golpeYa = true; }
      else if (kind === "harvest") { this.destelloFx(o); this.puffFx(o.cx, o.by + 2, 0xc0dd97, 5); }
      else if (kind === "plant") { this.puffFx(o.cx, o.by + 2, 0xb4b2a9, 4); }
    }
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
    // (la sacudida y las astillas ya salieron en el momento del impacto, no acá al final)
    if (a.kind === "chop") {
      o.golpes = (o.golpes || 0) + 1;
      if (o.golpes < GOLPES_TALAR) {   // golpes intermedios: el árbol se va cortando (el hacha NO se gasta todavía)
        const tex = o.golpes === 1 ? "tree_cut1" : "tree_cut2";
        if (this.textures.exists(tex)) this.setObjTex(o, tex, o.rw || o.w);
        o.golpesAt = nowMs();   // si no seguís, a los 5 s el árbol se recupera solo
        this.barraGolpes(o);       // barrita de progreso bajo el nodo (como Sunflower Land)
        this.action = null; return;   // sin cartelito: el destello y la barra ya lo dicen
      }
      o.golpesAt = 0;
      o.golpes = 0; this.barraGolpes(o);
      const gr = 1;   // viernes (2): todos los recursos dan 1
      if (tryAddRes("madera", gr)) {
        useTool("axe"); addXp("crafting", 4); nodoSumar(o); o.cdIni = nowMs(); o.readyAt = nowMs() + nodoCd(o, "tree", CD.tree) * 1000 * cdMult() * (typeof tutoBoost === "function" ? tutoBoost("tree") : 1);
        o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2;   // a mitad del enfriamiento asoma el árbol a medio crecer (doc 4/8)
        // tocón nuevo con base de tierra y hojas caídas (encuadre del árbol, va a tamaño completo); respaldo: tocón viejo chico
        if (this.textures.exists("tree_stump_leaves")) this.setObjTex(o, "tree_stump_leaves", (o.rw || o.w) * 0.85);   // −15%: el tocón venía más grueso que el tronco del árbol
        else this.setObjTex(o, "tree_stump", (o.rw || o.w) * 0.42);
        statAdd("talar", null, gr);
        this.premioFx(o.cx, o.by, resSprite("madera"), "+" + gr);
        log(`+${gr} Madera. ${toolDur("axe")}/${TOOL_DEF.axe.max}`, "good"); refreshHud();
        if (typeof tutoEvent === "function") tutoEvent("gather");
        if (toolDur("axe") <= 0) { log("¡El hacha se rompió en pedazos! Crafteá otra en la Herrería.", "bad"); toast("¡Hacha rota!"); }
      } else {
        this.setObjTex(o, o.baseKey, o.rw || o.w);   // bolsa llena: el árbol vuelve entero (deshace los cortes intermedios)
        toast("Bolsa llena — no podés talar"); log("Bolsa llena: liberá espacio para seguir talando.", "bad");
      }
    } else if (a.kind === "mine" && o.type === "rock") {
      o.golpes = (o.golpes || 0) + 1;
      if (o.golpes < GOLPES_MINAR) {   // golpes intermedios: el pico NO se gasta todavía
        if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
        o.golpesAt = nowMs();   // si no seguís, a los 5 s la piedra vuelve a estar entera
        this.barraGolpes(o);
        this.action = null; return;
      }
      o.golpes = 0; o.golpesAt = 0; this.barraGolpes(o);
      const gr = 1;   // viernes (2): todos los recursos dan 1
      if (tryAddRes("piedra", gr)) {
        const pk = equippedPick();   // picar piedra también gasta el pico (bug reportado)
        if (pk) { G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1); if (G.picks.dur[pk] <= 0) { log(`¡${PICK_DEF[pk].label} se rompió en pedazos! Crafteá otro en la Herrería.`, "bad"); toast("¡Pico destruido!"); destroyPick(pk); } }
        addXp("mining", 5); statAdd("minar", "piedra", gr); nodoSumar(o); o.cdIni = nowMs(); o.readyAt = nowMs() + nodoCd(o, "piedra", CD.rock) * 1000 * cdMult() * (typeof tutoBoost === "function" ? tutoBoost("rock") : 1); o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2; this.setObjTex(o, "node_stone_mined", o.rw || GF.TILE); this.premioFx(o.cx, o.by, resSprite("piedra"), "+" + gr); log(`+${gr} Piedra.` + (pk ? ` ${G.picks.dur[pk]}/${PICK_DEF[pk].dur}` : ""), "good"); refreshHud();
        if (typeof tutoEvent === "function") tutoEvent("gather");
      }
      else { this.setObjTex(o, o.baseKey, o.rw || o.w); toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad"); }   // vuelve entera: los golpes se perdieron
    } else if (a.kind === "mine" && o.type === "ore") {
      o.golpes = (o.golpes || 0) + 1;
      if (o.golpes < GOLPES_MINAR) {   // golpes intermedios: el pico NO se gasta todavía
        if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
        o.golpesAt = nowMs();   // si no seguís, a los 5 s la veta vuelve a estar entera
        this.barraGolpes(o);
        this.action = null; return;
      }
      o.golpes = 0; o.golpesAt = 0; this.barraGolpes(o);
      const pk = equippedPick(), pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      const gr = 1;   // viernes (2): todos los recursos dan 1
      if (tryAddRes(o.ore, gr)) {
        G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1);
        addXp("mining", 5 + od.tier * 3); statAdd("minar", o.ore, gr);
        nodoSumar(o); o.cdIni = nowMs(); o.readyAt = nowMs() + nodoCd(o, o.ore, od.cd) * 1000 * cdMult();
        o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2;
        if (this.textures.exists(o.baseKey + "_mined")) this.setObjTex(o, o.baseKey + "_mined", o.rw || GF.TILE); else o.sprite.setAlpha(0.4);
        this.premioFx(o.cx, o.by, resSprite(o.ore), "+" + gr); log(`${od.emoji} +${gr} ${od.label}. ${G.picks.dur[pk]}/${pd.dur}`, "good"); refreshHud();
        if (typeof tutoEvent === "function") { tutoEvent("gather"); tutoEvent("mineore"); }
        if (G.picks.dur[pk] <= 0) { log(`¡${pd.label} se rompió en pedazos! Crafteá otro en la Herrería.`, "bad"); toast("¡Pico destruido!"); destroyPick(pk); }
      } else { this.setObjTex(o, o.baseKey, o.rw || o.w); toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad"); }
    } else if (a.kind === "plant") {
      const ck = a.seed || G.selSeed, cd = CROP_DEF[ck];   // la semilla que se validó al hacer clic (cambiarla a mitad de la animación no la cuela)
      if (cd && (G.seeds[ck] || 0) > 0) {
        G.seeds[ck]--; o.cropKey = ck; o.state = "growing"; o.witherAt = 0;
        // acelerador del tutorial (12/8): la papa crece rápido SOLO mientras el objetivo activo la pide
        const boost = (ck === "papa" && typeof tutoBoost === "function") ? tutoBoost("papa") : 1;
        const real = cd.grow * 1000 * cdMult() * boost;
        const starter = (G.firstSeeds || 0) > 0 && FIRST_GROW_MS > 0;   // solo las semillas del starter pack
        if (starter) G.firstSeeds--;
        o.readyAt = nowMs() + (starter ? Math.min(FIRST_GROW_MS, real) : real);   // nunca más lento que el tiempo real del cultivo
        o.growTotal = o.readyAt - nowMs();
        this.showGrowing(o, true);   // recién plantado: el brote asoma con un saltito
        this.syncPlots(); addXp("farming", 5); statAdd("plantar", ck); log(`Plantaste ${cd.label}.`, "good"); toast("" + cd.label);
        if (typeof tutoEvent === "function") tutoEvent("plant");
        if (isOpen("ov-inv")) refreshInv();
      }
    } else if (a.kind === "harvest") {
      const ck = o.cropKey || "papa", cd = CROP_DEF[ck] || CROP_DEF.papa;
      const gr = Math.max(1, Math.round(cd.yield * yieldMult()));
      if (tryAddRes(ck, gr)) { o.state = "dry"; o.cropKey = null; o.readyAt = 0; o.witherAt = 0; this.setPlotGlow(o, "off"); this.coinBurst(o.cx, o.by); o.spr.setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false); this.syncPlots(); addXp("farming", (cd && cd.xp) || 2); if (!G.firstCropDone) G.firstCropDone = true; if (typeof tutoEvent === "function") tutoEvent("harvest"); this.premioFx(o.cx, o.by, resSprite(ck), "+" + gr); log(`${cd.emoji} +${gr} ${cd.label}.`, "good"); refreshHud(); }
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

  /* ---- SKINS DEL COFRE Y DEL NIVEL 50 (10/8) ---------------------------------
     Eran los últimos cosméticos que existían solo como texto:
       sombrero  -> Sombrero de paja brillante sobre la cabeza del granjero (sprite
                    PixelLab "skin_sombrero" si está; si no, dibujado por código)
       petalos   -> Camino de pétalos: caminando vas dejando pétalos que se apagan
       granjaOro -> Granja legendaria: valla dorada + chispas de oro que flotan */
  updateSkins() {
    const c = (typeof cosElegido === "function") ? cosElegido() : {};
    // sombrero
    const sombOn = c.sombrero && (typeof cosSombreroDisponible !== "function" || cosSombreroDisponible());
    if (!sombOn && this.hatFx) { this.hatFx.destroy(); this.hatFx = null; }
    if (sombOn && !this.hatFx && this.hero) {
      if (this.textures.exists("skin_sombrero")) {
        this.hatFx = this.add.image(0, 0, "skin_sombrero").setOrigin(0.5, 0.9);
        this.hatFx.setDisplaySize(Math.round(this.hatFx.width * 20 / this.hatFx.height), 20);
      } else {   // respaldo por código hasta que llegue el arte: paja + cinta roja + brillo
        const g = this.add.graphics();
        g.fillStyle(0xe8c25a, 1).fillEllipse(0, 2, 26, 9);           // ala
        g.fillStyle(0xf2d06b, 1).fillEllipse(0, -3, 14, 10);         // copa
        g.fillStyle(0xc23a3a, 1).fillRect(-7, -2, 14, 3);            // cinta
        g.fillStyle(0xfff3cf, 0.9).fillCircle(6, -6, 1.5);           // destello
        this.hatFx = g;
      }
      this.tweens.add({ targets: this.hatFx, alpha: 0.88, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });   // el "brillante" late suave
    }
    // granja legendaria: valla dorada + chispas
    const oroOn = c.granjaOro && (typeof cosGranjaOroDisponible !== "function" || cosGranjaOroDisponible());
    (this.fenceSprites || []).forEach(f => { if (f.active) { if (oroOn) f.setTint(0xe8c25a); else f.clearTint(); } });
    if (oroOn && !this.oroTimer) {
      this.oroTimer = this.time.addEvent({ delay: 700, loop: true, callback: () => {
        const W = GF.COLS * GF.TILE, H = GF.ROWS * GF.TILE;   // una chispa dorada al azar que sube y se apaga
        const x = 20 + Math.random() * (W - 40), y = 30 + Math.random() * (H - 40);
        const p = this.add.circle(x, y, 1.5 + Math.random() * 1.5, 0xffd75e, 0.9).setDepth(y).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, y: y - 14 - Math.random() * 10, alpha: 0, duration: 1400 + Math.random() * 600, onComplete: () => p.destroy() });
      } });
    } else if (!oroOn && this.oroTimer) { this.oroTimer.remove(); this.oroTimer = null; }
  }
  // por cuadro: el sombrero acompaña la cabeza y los pétalos caen al caminar
  seguirSkins() {
    const h = this.hero; if (!h) return;
    const c = (typeof cosElegido === "function") ? cosElegido() : {};
    if (this.hatFx) {
      const sign = this.facing === "west" ? -1 : 1;
      this.hatFx.setPosition(h.x + sign * 1, h.y - h.displayHeight + 4).setDepth(h.y + 1).setVisible(h.visible);
      if (this.hatFx.setFlipX) this.hatFx.setFlipX(sign < 0); else this.hatFx.scaleX = Math.abs(this.hatFx.scaleX) * sign;
    }
    const petOn = c.petalos && (typeof cosPetalosDisponible !== "function" || cosPetalosDisponible());
    if (petOn && h.visible) {
      const lp = this.lastPetal || { x: h.x, y: h.y };
      if (Math.hypot(h.x - lp.x, h.y - lp.y) > 14) {   // un pétalo cada ~14 px caminados
        this.lastPetal = { x: h.x, y: h.y };
        const cols = [0xe8a8c8, 0xf6cadd, 0xd98ad4];
        const p = this.add.ellipse(h.x + (Math.random() - 0.5) * 12, h.y - 1 + (Math.random() - 0.5) * 5,
          4, 2.5, cols[(Math.random() * cols.length) | 0], 0.85).setDepth(h.y - 2).setAngle(Math.random() * 360);
        this.tweens.add({ targets: p, alpha: 0, angle: p.angle + 40, duration: 3200 + Math.random() * 800, ease: "Quad.easeIn", onComplete: () => p.destroy() });
      }
    }
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
    else { const o = (this.objs || []).find(o => o.type === st.target && !o.oculto); if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; } }   // sin plano colocado no hay a qué apuntar (12/8)
    if (x == null) return;
    const tri = this.add.triangle(x, y, 0, 0, 16, 0, 8, 12, 0xffd75e).setStrokeStyle(2, 0x241505, 1).setDepth(99990);
    this.tutoArrow = tri;
    this.tutoTw = this.tweens.add({ targets: tri, y: y - 10, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  // TINTE DE LA VETA (9/8): el color va sobre la roca ENTERA, no solo sobre las pepitas.
  // Es lo único que se lee a 38 px. Convive con el gris de "bloqueado / sin construir",
  // que siempre gana. Hay que llamarlo cada vez que algo hace clearTint() sobre el nodo.
  tintarNodo(o) {
    const s = o && o.sprite; if (!s || !s.setTint) return;
    if (o.locked || (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type]))) {
      const k = s.texture ? String(s.texture.key) : "";
      // la OBRA (build_*) y el RETOÑO se ven a todo color; el gris es solo respaldo (12/8)
      if (k !== "tree_sapling" && k.indexOf("build_") !== 0) s.setTint(0x555555);
      return;
    }
    const t = (NODO_TINTE && (o.type === "ore" || o.type === "rock") && GF.ORE_TINTE) ? GF.ORE_TINTE[o.ore || "piedra"] : null;
    if (t && t !== 0xffffff) s.setTint(t); else s.clearTint();
  }

  setObjTex(o, key, targetW) {
    if (o.sprite._popTw) { o.sprite._popTw.stop(); o.sprite._popTw = null; }   // un pop a medias no debe pelear con la escala nueva
    this.copaSacar(o);   // cambia la imagen: se rehace el recorte copa/tronco desde cero
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

  // PRESUPUESTO DE PARTÍCULAS: en el server gratis y en móvil no conviene pasarse. Cada efecto
  // pide cuántas quiere y se le da lo que quede libre (si no queda, no dibuja nada y listo).
  pidoPart(n) {
    this._part = this._part || 0;
    const libre = Math.max(0, (FX_PART_MAX || 40) - this._part);
    const dar = Math.min(n, libre);
    this._part += dar;
    return dar;
  }
  sueltoPart(n) { this._part = Math.max(0, (this._part || 0) - n); }

  // DESTELLO BLANCO (medido de Sunflower Land): al recibir el golpe el nodo se pone blanco un
  // instante y vuelve. Es el efecto que más "pega" de todos y no cuesta nada: en SFL el cactus
  // NUNCA cambia de dibujo mientras lo talás, solo late en blanco cada ~117 ms.
  destelloFx(o) {
    const ms = Math.max(30, FX_DESTELLO_MS || 90);
    // sirve para nodos (sprite + copa) y para parcelas (spr del cultivo)
    [o.sprite, o.copa, o.spr].forEach(s => {
      if (!s || !s.setTintFill || !s.visible) return;
      s.setTintFill(0xffffff);
      this.time.delayedCall(ms, () => { if (s && s.clearTint && s.active) { s.clearTint(); this.tintarNodo(o); } });   // y vuelve el color del mineral
    });
  }

  // ESTILO ÚNICO DE BARRITA (4/8): contorno oscuro + marco claro + relleno verde, como las de
  // Sunflower Land. La usan tanto el crecimiento de las parcelas como los golpes a árboles y vetas,
  // así todas las barras del mundo se ven iguales.
  dibujarBarra(g, cx, y, w, h, pct) {
    const x = Math.round(cx - w / 2);
    g.clear();
    g.fillStyle(0x241505, 1).fillRect(x - 3, y - 3, w + 6, h + 6);   // contorno oscuro (estándar del juego)
    g.fillStyle(0xe8e0c8, 1).fillRect(x - 1.5, y - 1.5, w + 3, h + 3);   // marco claro
    g.fillStyle(0x2a3a1c, 1).fillRect(x, y, w, h);                       // lo que falta
    g.fillStyle(0x8fd14f, 1).fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);   // lo hecho
  }

  // BARRITA DE PROGRESO bajo el nodo mientras lo golpeás (SFL la muestra desde el primer clic).
  // Aparece con el primer golpe y se va sola cuando el nodo cae o cuando se pierden los golpes.
  barraGolpes(o) {
    if (!FX_BARRA_GOLPES) { if (o.barra) { o.barra.destroy(); o.barra = null; } return; }
    const total = o.type === "tree" ? GOLPES_TALAR : GOLPES_MINAR;
    const n = o.golpes || 0;
    if (n <= 0 || n >= total) { if (o.barra) { o.barra.destroy(); o.barra = null; } return; }
    if (!o.barra) o.barra = this.add.graphics().setDepth(o.by + 3);
    this.dibujarBarra(o.barra, o.cx, o.by + 5, 28, 6, n / total);   // mismo estilo que la de crecimiento
  }

  // BARRITA DE CRECIMIENTO sobre la parcela (copiada de Sunflower Land, videos del diseñador).
  // Mientras el cultivo crece se ve SIEMPRE —sin pasar el cursor— con el tiempo que falta arriba.
  // Cuando está listo desaparece: ahí lo que habla es la planta entera. De un vistazo se sabe qué
  // parcela cosechar y cuánto le falta a cada una de las demás.
  barraCultivo(pl, t) {
    const crece = FX_BARRA_CULTIVO && pl.state === "growing" && pl.readyAt > t;
    if (!crece) {
      if (pl.barraG) { pl.barraG.destroy(); pl.barraG = null; pl.barraPct = null; }
      if (pl.timer) pl.timer.setVisible(false);
      return;
    }
    const total = pl.growTotal || (pl.readyAt - t);
    const pct = Math.max(0, Math.min(1, 1 - (pl.readyAt - t) / Math.max(1, total)));
    // Se ancla al SPRITE REAL de la tierra, no a las coordenadas teóricas: así queda centrada
    // aunque la parcela se haya movido en el modo edición o el dibujo no ocupe la celda entera.
    // Va ABAJO de la planta, apoyada sobre el borde inferior de la tierra pero POR DENTRO
    // (pedido del diseñador): así no tapa el cultivo ni se mete en la parcela de al lado.
    const suelo = pl.ground;
    const cx = Math.round(suelo ? suelo.x : pl.cx);
    const abajo = suelo ? (suelo.y + suelo.displayHeight / 2) : (pl.by + GF.TILE / 2);
    const h = 6;
    const y = Math.round(abajo - 4 - h) + (FX_BARRA_DY || 0);   // apoyada por dentro del borde de abajo
    // el texto va justo ARRIBA de la barra (en SFL se lee "18m", "20h", "7d 13h")
    if (pl.timer) pl.timer.setText(fmtCorto((pl.readyAt - t) / 1000)).setPosition(cx, y - 2).setDepth(pl.by + 3).setVisible(true);
    if (!pl.barraG) pl.barraG = this.add.graphics().setDepth(pl.by + 2);
    if (pl.barraPct != null && Math.abs(pl.barraPct - pct) < 0.004) return;   // sin cambio visible: no redibujar
    pl.barraPct = pct;
    this.dibujarBarra(pl.barraG, cx, y, 28, h, pct);
  }

  // PREMIO VOLANDO: el recurso sale en arco desde el nodo con su "+N", como el tronco de SFL.
  premioFx(x, y, spriteKey, texto) {
    if (!FX_PREMIO) return;
    const dx = 26 + Math.random() * 14, dy = -30 - Math.random() * 10;
    const px = Math.max(6, FX_PREMIO_PX || 22);
    let ic = null;
    if (spriteKey && this.textures.exists(spriteKey)) {
      ic = this.add.image(x, y - 10, spriteKey).setDepth(99997);
      ic.setDisplaySize(px, px * (ic.height / Math.max(1, ic.width)));   // tamaño fijo: los PNG vienen a ~106 px
    }
    const t = this.add.text(x + (ic ? px * 0.75 : 0), y - 10, texto, {
      fontFamily: "system-ui", fontSize: Math.max(9, FX_PREMIO_TXT || 15) + "px", fontStyle: "bold",
      color: "#fff8e0", stroke: "#241505", strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(99998);
    [ic, t].forEach((el, i) => {
      if (!el) return;
      this.tweens.add({ targets: el, x: el.x + dx, duration: 900, ease: "Sine.easeOut" });
      this.tweens.add({ targets: el, y: el.y + dy, duration: 420, ease: "Quad.easeOut", yoyo: false });
      this.tweens.add({ targets: el, alpha: 0, delay: 520, duration: 380, onComplete: () => el.destroy() });
    });
  }

  // IMPACTO DEL GOLPE (4/8): el nodo se sacude hacia el lado contrario al hachazo y suelta
  // astillas (madera) o esquirlas (piedra). Antes el árbol solo cambiaba de imagen y los
  // 3 clics no se sentían como 3 golpes.
  golpeFx(o, tipo) {
    if (!FX_IMPACTO || !o || !o.sprite || !o.sprite.visible) return;
    const spr = o.copa || o.sprite;   // si el árbol está partido en copa/tronco, se sacude la copa
    // el granjero (invisible) trabaja al costado del nodo: el golpe empuja hacia el lado opuesto
    const desde = (this.hero && this.hero.x > o.cx) ? -1 : 1;
    const g = FX_IMPACTO_GRADOS * desde;
    if (spr._golpeTw) spr._golpeTw.stop();
    const base = spr.angle;
    spr.setAngle(base + g);
    spr._golpeTw = this.tweens.add({
      targets: spr, angle: base, duration: 190, ease: "Back.easeOut",
      onComplete: () => { spr._golpeTw = null; },
    });
    // astillas: salen del punto de impacto hacia el lado del golpe
    const madera = tipo === "chop";
    const n = this.pidoPart(madera ? 7 : 6);
    const ix = o.cx - desde * 6, iy = o.by - (spr.displayHeight || GF.TILE) * (madera ? 0.42 : 0.35);
    for (let i = 0; i < n; i++) {
      const a = (desde < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
      const r = 14 + Math.random() * 20;
      const col = madera ? (i % 2 ? 0x996633 : 0xc79a5a) : (i % 2 ? 0xb4b2a9 : 0xe8e4d8);
      const p = madera
        ? this.add.rectangle(ix, iy, 3, 1.6, col).setAngle(Math.random() * 180).setDepth(99995)
        : this.add.circle(ix, iy, 1.4 + Math.random(), col, 1).setDepth(99995);
      this.tweens.add({
        targets: p, x: ix + Math.cos(a) * r, y: iy + Math.sin(a) * r * 0.55 + 10 + Math.random() * 8,
        angle: p.angle + (Math.random() - 0.5) * 260, alpha: 0,
        duration: 300 + Math.random() * 220, ease: "Quad.easeIn",
        onComplete: () => { p.destroy(); this.sueltoPart(1); },
      });
    }
  }

  // "POP" DE CRECIMIENTO (4/8): el sprite se aplasta un instante y vuelve a su tamaño con rebote
  // elástico, como un resorte, hasta quedar quieto. Los sprites tienen el origen abajo, así que
  // el rebote se lee como si la planta saltara desde la tierra.
  popFx(spr, fuerza, alTerminar) {
    if (!spr || !spr.visible) { if (alTerminar) alTerminar(); return; }
    const f = Math.max(0, (fuerza == null ? 1 : fuerza) * POP_FUERZA);
    if (!POP_ON || f <= 0) { if (alTerminar) alTerminar(); return; }
    if (spr._popTw) { spr._popTw.stop(); spr._popTw = null; }
    const bx = spr.scaleX, by = spr.scaleY;
    spr.setScale(bx * (1 + 0.28 * f), by * (1 - 0.24 * f));   // achatado y ancho: el "impulso"
    spr._popTw = this.tweens.add({
      targets: spr, scaleX: bx, scaleY: by,
      duration: Math.max(120, POP_MS), ease: "Elastic.easeOut", easeParams: [1, 0.42],
      onComplete: () => { spr._popTw = null; spr.setScale(bx, by); if (alTerminar) alTerminar(); },
    });
  }
  // chispita de polvo/hojas que acompaña al pop (partículas por código, sin arte)
  puffFx(x, y, color, n) {
    const cuantas = this.pidoPart(n || 6);
    for (let i = 0; i < cuantas; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, r = 12 + Math.random() * 16;
      const p = this.add.circle(x, y, 1.5 + Math.random() * 1.5, color, 0.9).setDepth(99995);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.8,
        alpha: 0, scale: 0.4, duration: 380 + Math.random() * 260,
        onComplete: () => { p.destroy(); this.sueltoPart(1); },
      });
    }
  }

  // ================= CORRAL Y ANIMALES (4/8) =================================
  // Los animales del Establo ya no viven solo dentro de una ventana: caminan por un corral
  // en la granja. Los sprites son PROVISORIOS (dibujados por código en
  // tools/animales-provisorios.py); cuando llegue el arte definitivo se reemplazan los PNG
  // y este código no cambia, porque usa las mismas claves "animal_<nombre>".
  crearCorral() {
    this.animales = [];
    const T = GF.TILE;
    // 9/8: los animales andan SUELTOS por la granja. No se dibuja patio ni cerca; la zona
    // por donde pueden caminar es la granja entera y lo que esquivan se decide en puntoAnimal().
    if (!GF.CORRAL_ON) {
      this.corral = { x1: 26, y1: T * 1.2, x2: GF.WORLD_W - 26, y2: GF.WORLD_H - 26 };
      this.corralCerca = null;
      return;
    }
    const C = GF.CORRAL; if (!C) return;
    const x1 = C.col * T, y1 = C.row * T, w = C.cols * T, h = C.rows * T;
    this.corral = { x1, y1, x2: x1 + w, y2: y1 + h };
    // piso: un parche de tierra pisoteada, más claro que el pasto
    const g = this.add.graphics().setDepth(-997);
    g.fillStyle(0xa88a52, 0.55).fillRoundedRect(x1 + 3, y1 + 3, w - 6, h - 6, 10);
    g.fillStyle(0x8a6a3a, 0.35).fillRoundedRect(x1 + 9, y1 + 9, w - 18, h - 18, 8);
    // cerca de madera: postes con dos travesaños, dibujada por código (sin arte nuevo)
    const cerca = this.add.graphics().setDepth(y1 + h + 1);
    const poste = (px, py) => {
      cerca.fillStyle(0x241505, 1).fillRect(px - 3, py - 16, 6, 18);
      cerca.fillStyle(0x8a5a33, 1).fillRect(px - 2, py - 15, 4, 16);
    };
    cerca.fillStyle(0x241505, 1);
    [y1, y1 + h].forEach(py => { cerca.fillRect(x1, py - 11, w, 3); cerca.fillRect(x1, py - 5, w, 3); });
    [x1, x1 + w].forEach(px => { cerca.fillRect(px - 1, y1 - 11, 3, h + 11); });
    cerca.fillStyle(0xa8712f, 1);
    [y1, y1 + h].forEach(py => { cerca.fillRect(x1, py - 10, w, 1); cerca.fillRect(x1, py - 4, w, 1); });
    for (let c = 0; c <= C.cols; c++) { poste(x1 + c * T, y1); poste(x1 + c * T, y1 + h); }
    this.corralCerca = cerca;
  }
  // ¿este punto sirve para que camine un animal? (9/8)
  // Con el corral encendido alcanza con estar adentro. Sueltos, hay que esquivar edificios,
  // vetas, la laguna, la cerca del borde y las parcelas: un animal parado sobre los cultivos
  // los tapa y encima confunde, porque parece que hay algo para cosechar ahí.
  animalPuedeEstar(x, y) {
    const C = this.corral; if (!C) return false;
    if (x < C.x1 || x > C.x2 || y < C.y1 || y > C.y2) return false;
    if (!GF.CORRAL_ON) {
      if (GF.blockedAt(x, y, 10)) return false;
      const T = GF.TILE, col = Math.floor(x / T), row = Math.floor(y / T);
      if (GF.PLOTS.some(p => p.col === col && p.row === row)) return false;
      if ((G.decos || []).some(d => d.id === "valla" && d.col === col && d.row === row)) return false;   // fixs #13: la valla puesta FRENA a los animales
    }
    return true;
  }
  // fixs.docx #11 (11/8): lluvia de estrellitas al recoger materiales de un animal
  estrellasFx(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 18;
      const s = this.add.text(x, y, i % 3 ? "★" : "✨", { fontSize: (9 + Math.random() * 5) + "px", color: i % 2 ? "#ffd75e" : "#fff3cf", stroke: "#20301a", strokeThickness: 2 })
        .setOrigin(0.5).setDepth(99999).setAlpha(0.95);
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 10, angle: (Math.random() - 0.5) * 180,
        alpha: 0, duration: 520 + Math.random() * 260, ease: "Quad.easeOut", onComplete: () => s.destroy() });
    }
  }
  // un destino nuevo cerca de donde está el animal (o en cualquier lado si no se le pasa origen)
  puntoAnimal(desdeX, desdeY) {
    const C = this.corral; if (!C) return null;
    const R = GF.ANIMAL_RADIO || GF.TILE * 2.6;
    for (let i = 0; i < 30; i++) {
      let x, y;
      if (desdeX == null) { x = C.x1 + 20 + Math.random() * (C.x2 - C.x1 - 40); y = C.y1 + 22 + Math.random() * (C.y2 - C.y1 - 34); }
      else { const ang = Math.random() * 6.283, dist = R * (0.35 + Math.random() * 0.65); x = desdeX + Math.cos(ang) * dist; y = desdeY + Math.sin(ang) * dist; }
      if (!this.animalPuedeEstar(x, y)) continue;
      // el camino es en línea recta: si el punto medio está tapado, el animal cruzaría un edificio
      if (desdeX != null && !this.animalPuedeEstar((x + desdeX) / 2, (y + desdeY) / 2)) continue;
      return { x, y };
    }
    return null;
  }

  /* ---- ADORNOS DE LA GRANJA (10/8) -------------------------------------------
     Ya tienen arte propio de PixelLab (deco_<id> en el atlas). Si por lo que sea falta
     el sprite, cae al dibujo por código de más abajo, que es el que se usó mientras se
     probaba el sistema (comprar, colocar, guardar, levantar). */
  dibujarAdorno(id, x, y) {
    // sprite definitivo: se apoya en el suelo (origen abajo-centro) y se ordena por Y como todo lo demás
    if (this.textures.exists("deco_" + id)) {
      const alto = DECO_ALTO[id] || 30;
      const im = this.add.image(x, y, "deco_" + id).setOrigin(0.5, 1).setDepth(y);
      im.setDisplaySize(Math.round(im.width * alto / im.height), alto);
      if (id !== "farolito") return im;
      // el farolito es el único adorno ANIMADO: las luciérnagas del frasco laten.
      // Va en un contenedor para que al levantarlo se borre también el resplandor.
      const c = this.add.container(x, y).setDepth(y);
      const luz = this.add.circle(0, -alto * 0.62, alto * 0.42, 0xffe08a, 0.30);
      im.setPosition(0, 0);
      c.add([luz, im]);
      c.setSize(im.displayWidth, alto);
      this.tweens.add({ targets: luz, alpha: 0.12, scale: 0.78, duration: 1100 + Math.random() * 500,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      return c;
    }
    const g = this.add.graphics().setDepth(y);
    const MAD = 0x8a5a33, MAD2 = 0xa8712f, OSC = 0x241505, PIE = 0x8b8f8c, VER = 0x55733f;
    if (id === "valla") {
      g.fillStyle(OSC, 1).fillRect(-20, -16, 40, 3).fillRect(-20, -8, 40, 3);
      g.fillStyle(MAD2, 1).fillRect(-20, -15, 40, 1).fillRect(-20, -7, 40, 1);
      [-18, 0, 18].forEach(px => { g.fillStyle(OSC, 1).fillRect(px - 2, -20, 5, 20); g.fillStyle(MAD, 1).fillRect(px - 1, -19, 3, 18); });
    } else if (id === "flores") {
      g.fillStyle(0x6b4a2a, 1).fillRoundedRect(-16, -10, 32, 10, 3);
      g.fillStyle(VER, 1).fillRect(-14, -13, 28, 4);
      [[-9, -15, 0xe86a6a], [0, -17, 0xf2d06b], [9, -15, 0xd98ad4]].forEach(([px, py, c]) => {
        g.fillStyle(c, 1).fillCircle(px, py, 3).fillStyle(0xfff0b8, 1).fillCircle(px, py, 1.2);
      });
    } else if (id === "farol") {
      g.fillStyle(OSC, 1).fillRect(-2, -26, 5, 26);
      g.fillStyle(0x4a4038, 1).fillRoundedRect(-7, -38, 15, 13, 3);
      g.fillStyle(0xffd88a, 0.95).fillRoundedRect(-5, -36, 11, 9, 2);
    } else if (id === "banco") {
      g.fillStyle(OSC, 1).fillRect(-16, -10, 32, 4).fillRect(-14, -20, 28, 3);
      g.fillStyle(MAD, 1).fillRect(-16, -9, 32, 2).fillRect(-14, -19, 28, 1);
      [-13, 13].forEach(px => g.fillStyle(0x4a4038, 1).fillRect(px - 1, -10, 3, 10));
    } else if (id === "espantapajaros") {
      g.fillStyle(OSC, 1).fillRect(-1, -30, 3, 30).fillRect(-12, -22, 25, 3);
      g.fillStyle(0xd9b871, 1).fillCircle(0, -33, 6);
      g.fillStyle(OSC, 1).fillCircle(-2, -34, 1).fillCircle(2, -34, 1);
      g.fillStyle(0x9c5a3c, 1).fillTriangle(-8, -38, 8, -38, 0, -45);
    } else if (id === "fuente") {
      g.fillStyle(PIE, 1).fillEllipse(0, -6, 44, 20);
      g.fillStyle(0x5cb4d8, 1).fillEllipse(0, -7, 34, 13);
      g.fillStyle(PIE, 1).fillRect(-3, -22, 7, 15).fillEllipse(0, -24, 16, 7);
      g.fillStyle(0xdff2ff, 0.85).fillEllipse(0, -25, 10, 4);
    } else if (id === "estatua") {
      g.fillStyle(PIE, 1).fillRect(-11, -8, 23, 8);
      g.fillStyle(0xd9a521, 1).fillRect(-5, -28, 11, 20);
      g.fillStyle(0xffe08a, 1).fillCircle(0, -32, 6).fillRect(-4, -27, 8, 4);
    } else if (id === "arbolito") {
      g.fillStyle(0x6b4a2a, 1).fillRect(-3, -16, 7, 16);
      [[0, -30, 14], [-10, -24, 10], [10, -24, 10]].forEach(([px, py, r]) => {
        g.fillStyle(0xe8a8c8, 1).fillCircle(px, py, r);
        g.fillStyle(0xf6cadd, 1).fillCircle(px - r * 0.25, py - r * 0.25, r * 0.55);
      });
    } else {
      g.fillStyle(MAD, 1).fillRoundedRect(-10, -20, 21, 20, 4);
    }
    g.setPosition(x, y);
    return g;
  }
  // arranca el "colocar con clic" (#14/#17): el próximo clic en edición coloca esto en esa celda
  iniciarColocar(tipo, id) {
    this.placingAuto = !GF.editMode;   // 13/8: vino de la bolsa/hotbar → al terminar o cancelar vuelve al modo normal
    if (!GF.editMode && window.setEditMode) setEditMode(true);   // por si vino de la Tienda o la bolsa
    this.placing = { tipo, id };
    if (window.syncPlacingUI) syncPlacingUI(true);   // muestra el botón Cancelar de la barra de edición
    toast(tipo === "plot" ? "Clic en la celda donde va la parcela (clic derecho cancela)"
        : tipo === "obra" ? "Clic donde querés levantar la obra (clic derecho cancela)"
                          : "Clic en la celda donde va el adorno (clic derecho cancela)");
  }
  // 13/8: colocar en la celda elegida (lo llama pointerup si el clic no fue paneo)
  colocarEn(wx, wy) {
    const T = GF.TILE;
    const col = Math.floor(wx / T), row = Math.floor(wy / T);
    const pl = this.placing; if (!pl) return;
    if (!this.celdaLibreAdorno(col, row, -1)) { toast("Ahí no entra — probá otra celda"); return; }
    if (pl.tipo === "deco") {
      if (decoColocar(pl.id, col, row)) { this.syncAdornos(); if (typeof syncEditDeco === "function") syncEditDeco(); toast(DECO_DEF[pl.id].label + " colocado"); }
      this.finColocar();
    } else if (pl.tipo === "plot") {
      this.finColocar();
      if (typeof parcelaColocar === "function" && parcelaColocar(col, row)) toast("Parcela colocada");   // reinicia la escena para dibujarla
    } else if (pl.tipo === "obra") {   // blueprint (12/8): la obra ocupa ~2-3 celdas, chequear las vecinas
      if (!this.celdaLibreAdorno(col - 1, row, -1) || !this.celdaLibreAdorno(col + 1, row, -1)) { toast("Ahí no entra la obra — buscá un lugar más despejado"); return; }
      this.finColocar();
      // 13/8: la obra aparece EN VIVO (el edificio ya estaba en la escena, invisible) — sin
      // reiniciar la escena ni pantalla oscura; el reinicio con telón queda de respaldo
      if (typeof obraColocar === "function" && obraColocar(pl.id, col, row, true)) {
        if (!this.colocarObraEnVivo(pl.id) && typeof reiniciarGranjaSuave === "function") reiniciarGranjaSuave();
        toast("¡Obra colocada! Llevale materiales");
      }
    }
  }
  // 13/8: cierre común — y si el colocado vino de la bolsa/hotbar, se sale del modo edición solo
  finColocar() {
    this.placing = null;
    if (this.editHl) this.editHl.setVisible(false);
    if (window.syncPlacingUI) syncPlacingUI(false);
    if (this.placingAuto && window.setEditMode) setEditMode(false);
    this.placingAuto = false;
  }
  // 13/8: "encender" el edificio oculto como OBRA sin reiniciar la escena (chau pantalla oscura)
  colocarObraEnVivo(t) {
    const o = this.objs && this.objs.find(x => x.type === t);
    const op = (typeof obraDe === "function") ? obraDe(t) : null;
    if (!o || !op || !o.sprite || !this.textures.exists("build_" + t)) return false;
    const T = GF.TILE;
    o.cx = (op.col + 0.5) * T; o.by = (op.row + 1) * T;
    o.oculto = false;
    o.sprite.setTexture("build_" + t).setVisible(true).setPosition(o.cx, o.by).setOrigin(0.5, 1);
    o.sprite.setScale(o.rw / o.sprite.width).setDepth(o.by);
    this.letreroObra(o);
    if (this.rebuildCollisions) this.rebuildCollisions();
    if (typeof this.estrellasFx === "function") this.estrellasFx(o.cx, o.by - 20);   // mini festejo al apoyarla
    if (typeof tutoSync === "function") tutoSync(true); else if (this.updateTutoArrow) this.updateTutoArrow();
    return true;
  }
  // 13/8: botón Cancelar (o clic derecho): el plano/adorno queda en la bolsa, todo vuelve a como estaba
  cancelarColocar() {
    if (!this.placing) return;
    this.finColocar();
    toast("Colocación cancelada — sigue en tu bolsa");
  }
  // celda libre para una PARCELA nueva (13-60): mismas reglas que un adorno, más lejos de la
  // laguna. Barre desde el centro hacia afuera para que las nuevas queden cerca de las demás.
  celdaLibreParcela() {
    const cc = Math.floor(GF.COLS / 2), cr = Math.floor(GF.ROWS / 2), p = GF.POND;
    const celdas = [];
    for (let r = 2; r < GF.ROWS - 1; r++) for (let c = 1; c < GF.COLS - 1; c++) celdas.push({ c, r, d: Math.abs(c - cc) + Math.abs(r - cr) });
    celdas.sort((a, b) => a.d - b.d);
    for (const q of celdas) {
      if (q.c >= p.col - 1 && q.c < p.col + p.cols + 1 && q.r >= p.row - 1 && q.r < p.row + p.rows + 1) continue;   // la laguna y su borde
      if (this.celdaLibreAdorno(q.c, q.r, -1)) return { col: q.c, row: q.r };
    }
    return null;
  }
  // ¿el adorno entra en esa celda? (ignora es el índice del que se está moviendo, que no se pisa a sí mismo)
  celdaLibreAdorno(col, row, ignora) {
    const T = GF.TILE;
    if (GF.enCerca && GF.enCerca(col, row)) return false;   // 12/8: la CERCA perimetral es intocable
    const x = (col + 0.5) * T, y = (row + 0.9) * T;
    if (GF.blockedAt(x, y, 6)) return false;
    if (GF.PLOTS.some(p => p.col === col && p.row === row)) return false;
    if ((G.decos || []).some((d, j) => j !== ignora && d.col === col && d.row === row)) return false;
    if ((G.chests || []).some(c => c.col === col && c.row === row)) return false;
    return true;
  }
  // el adorno que esté bajo el cursor, si hay alguno (para agarrarlo en modo edición)
  adornoEnPunto(wx, wy) {
    const T = GF.TILE;
    let best = null, bd = 1e9;
    (this.adornos || []).forEach(a => {
      const alto = (typeof DECO_ALTO !== "undefined" && DECO_ALTO[a.id]) || 30;
      const hw = (a.g.displayWidth > 0 ? a.g.displayWidth / 2 : T * 0.5) + 3;
      if (wx < a.cx - hw || wx > a.cx + hw) return;
      if (wy > a.by + 5 || wy < a.by - alto - 5) return;
      const d = Math.hypot(a.cx - wx, a.by - wy);
      if (d < bd) { bd = d; best = a; }
    });
    return best;
  }
  // clic derecho en modo edición: el adorno vuelve a la bolsa (así se puede volver a colocar)
  levantarAdorno(a) {
    if (typeof decoSacar !== "function" || !decoSacar(a.i)) return;
    this.dragDeco = null;
    this.syncAdornos();
    if (typeof syncEditDeco === "function") syncEditDeco();   // el selector de la barra de edición vuelve a contarlo
    toast(((typeof DECO_DEF !== "undefined" && DECO_DEF[a.id]) ? DECO_DEF[a.id].label : "Adorno") + " guardado en la bolsa");
    if (typeof saveFarm === "function") saveFarm(true);
  }
  // busca una celda libre para dejar un adorno recién comprado (no pisa nada de lo que ya hay)
  huecoParaAdorno() {
    const ocupada = (col, row) => !this.celdaLibreAdorno(col, row, -1);
    const c0 = Math.floor(GF.COLS / 2), r0 = Math.floor(GF.ROWS / 2);
    for (let rad = 0; rad < Math.max(GF.COLS, GF.ROWS); rad++) {
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const col = c0 + dc, row = r0 + dr;
        if (col < 1 || row < 2 || col >= GF.COLS - 1 || row >= GF.ROWS - 1) continue;
        if (!ocupada(col, row)) return { col, row };
      }
    }
    return null;
  }
  // vuelve a dibujar todos los adornos colocados (al entrar y cada vez que se pone o saca uno)
  syncAdornos() {
    (this.adornos || []).forEach(a => a.g.destroy());
    this.adornos = [];
    const T = GF.TILE;
    (G.decos || []).forEach((d, i) => {
      if (!DECO_DEF[d.id]) return;
      const x = (d.col + 0.5) * T, y = (d.row + 1) * T;
      this.adornos.push({ i, id: d.id, col: d.col, row: d.row, cx: x, by: y, g: this.dibujarAdorno(d.id, x, y) });
    });
  }

  // crea o saca los animales según los que tenga el jugador (se llama al entrar y al comprar)
  syncAnimales() {
    if (!this.corral) return;
    this.animales = this.animales || [];
    // 10/8: ahora se puede tener MÁS DE UNO de cada tipo, así que hay que crear tantos
    // sprites como bichos haya, no uno por tipo.
    ANIMAL_ORDER.forEach(k => {
      const quiero = (typeof animalCant === "function") ? animalCant(k) : ((typeof animalDe === "function" && animalDe(k)) ? 1 : 0);
      const hay = this.animales.filter(a => a.k === k);
      for (let i = hay.length - 1; i >= quiero; i--) {   // sobran: se sacan de la granja
        const v = hay[i];
        v.spr.destroy(); if (v.marca) v.marca.destroy();
        this.animales.splice(this.animales.indexOf(v), 1);
      }
      for (let n = hay.length; n < quiero; n++) {
        const key = "animal_" + k;
        if (!this.textures.exists(key)) return;
        // sueltos: aparecen cerca del Establo, que es de donde salen
        const est = this.objs && this.objs.find(o => o.type === "establo");
        let pt = null;
        if (!GF.CORRAL_ON && est) for (let i = 0; i < 40 && !pt; i++) {
          const px = est.cx + (Math.random() - 0.5) * GF.TILE * 5, py = est.by + GF.TILE * (0.6 + Math.random() * 2.2);
          if (this.animalPuedeEstar(px, py)) pt = { x: px, y: py };
        }
        if (!pt) pt = this.puntoAnimal();
        if (!pt) pt = { x: (this.corral.x1 + this.corral.x2) / 2, y: (this.corral.y1 + this.corral.y2) / 2 };
        const x = pt.x, y = pt.y;
        const spr = this.add.image(x, y, key).setOrigin(0.5, 1);
        spr.setScale((GF.TILE * 0.78) / spr.width);
        const marca = this.add.image(x, y - 30, resSprite(ANIMAL_DEF[k].mat) || key).setDepth(99991).setVisible(false);
        marca.setDisplaySize(16, 16);
        this.animales.push({ k, spr, marca, tx: x, ty: y, esperaHasta: 0, bob: Math.random() * 6.28 });
      }
    });
  }
  /* ---- MASCOTA (10/8) ---------------------------------------------------------
     La gallina "Pinta" del cofre de login. No produce ni come nada: pasea por la granja
     como los animales del Establo, solo para que se note que la tenés. */
  syncMascota() {
    const quiero = (typeof cosElegido === "function") ? (cosElegido().mascota || "ninguna") : "ninguna";
    const def = (typeof COS_MASCOTAS !== "undefined") ? COS_MASCOTAS[quiero] : null;
    if (this.mascota && (!def || this.mascota.k !== quiero)) { this.mascota.spr.destroy(); this.mascota = null; }
    if (!def || this.mascota) return;
    if (!this.textures.exists(def.sprite)) return;   // todavía no cargó el arte: no pasa nada
    const pt = this.puntoAnimal() || { x: GF.WORLD_W / 2, y: GF.WORLD_H / 2 };
    const spr = this.add.image(pt.x, pt.y, def.sprite).setOrigin(0.5, 1);
    spr.setScale((GF.TILE * 0.52) / spr.width);       // más chica que los animales del Establo
    this.mascota = { k: quiero, spr, tx: pt.x, ty: pt.y, esperaHasta: 0, bob: Math.random() * 6.28 };
  }
  tickMascota(dt, t) {
    const m = this.mascota; if (!m) return;
    if (t >= m.esperaHasta) {   // picotea un rato y se va a otro lado (más inquieta que una vaca)
      m.esperaHasta = t + 1200 + Math.random() * 2600;
      const pt = this.puntoAnimal(m.spr.x, m.spr.y);
      if (pt) { m.tx = pt.x; m.ty = pt.y; } else { m.esperaHasta = t + 600; }
    }
    const dx = m.tx - m.spr.x, dy = m.ty - m.spr.y, d = Math.hypot(dx, dy);
    if (d > 3) {
      const v = Math.min(d, 24 * dt);
      m.spr.x += dx / d * v; m.spr.y += dy / d * v;
      if (Math.abs(dx) > 1) m.spr.setFlipX(dx < 0);
      m.bob += dt * 9;
      const s = Math.abs(m.spr.scaleX);
      m.spr.setScale(m.spr.scaleX, s * (1 + Math.sin(m.bob) * 0.06));
    }
    m.spr.setDepth(m.spr.y);
  }
  tickAnimales(dt, t) {
    if (!this.animales || !this.animales.length || !this.corral) return;
    const C = this.corral;
    for (const a of this.animales) {
      if (t >= a.esperaHasta) {   // elige un lugar nuevo cerca y camina hasta ahí
        a.esperaHasta = t + 2000 + Math.random() * 4000;
        const pt = GF.CORRAL_ON
          ? { x: C.x1 + 20 + Math.random() * (C.x2 - C.x1 - 40), y: C.y1 + 22 + Math.random() * (C.y2 - C.y1 - 34) }
          : this.puntoAnimal(a.spr.x, a.spr.y);
        if (pt) { a.tx = pt.x; a.ty = pt.y; }
        else { a.esperaHasta = t + 700; }   // rincón sin salida: espera un toque y prueba de nuevo
      }
      const dx = a.tx - a.spr.x, dy = a.ty - a.spr.y, d = Math.hypot(dx, dy);
      const anda = d > 3;
      if (anda) {
        const v = Math.min(d, 16 * dt);
        a.spr.x += dx / d * v; a.spr.y += dy / d * v;
        if (Math.abs(dx) > 1) a.spr.setFlipX(dx < 0);           // mira hacia donde camina
        a.bob += dt * 7;
        a.spr.y -= 0;                                            // el "trote" es un cabeceo de escala
        a.spr.setScale(a.spr.scaleX < 0 ? -Math.abs(a.spr.scaleX) : Math.abs(a.spr.scaleX),
          Math.abs(a.spr.scaleX) * (1 + Math.sin(a.bob) * 0.05));
      }
      a.spr.setDepth(a.spr.y);
      // listo para cobrar: se le ve el material flotando encima
      const listo = typeof animalListo === "function" && animalListo(a.k);
      if (a.marca) {
        a.marca.setVisible(listo);
        if (listo) a.marca.setPosition(a.spr.x, a.spr.y - a.spr.displayHeight - 8 + Math.sin(t / 350) * 3).setDepth(a.spr.y + 2);
      }
    }
  }
  // clic sobre un animal: si produjo, se cobra ahí mismo; si no, abre el Establo
  animalEnPunto(wx, wy) {
    if (!this.animales) return null;
    for (const a of this.animales) {
      const b = a.spr.getBounds();
      if (wx > b.left - 2 && wx < b.right + 2 && wy > b.top - 2 && wy < b.bottom + 2) return a;
    }
    return null;
  }

  // NUBES (4/8): pasan lento de izquierda a derecha y proyectan una sombra suave sobre la granja.
  // Es lo que más "respira" por lo poco que cuesta: son elipses blancas y una sombra oscura debajo.
  crearNubes() {
    this.nubes = [];
    const W = GF.WORLD_W, H = GF.WORLD_H, m = GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0;
    for (let i = 0; i < (FX_NUBES || 0); i++) {
      const esc = 0.7 + Math.random() * 0.9;
      const g = this.add.graphics().setDepth(99000).setAlpha(typeof FX_NUBES_ALFA === "number" ? FX_NUBES_ALFA : 0.22);
      g.fillStyle(0xffffff, 1);
      [[0, 0, 46, 20], [-30, 5, 30, 14], [32, 6, 26, 12], [6, -9, 28, 14]].forEach(([x, y, rx, ry]) => g.fillEllipse(x, y, rx * 2, ry * 2));
      const sh = this.add.graphics().setDepth(6).setAlpha(typeof FX_NUBES_SOMBRA === "number" ? FX_NUBES_SOMBRA : 0.06);
      sh.fillStyle(0x241505, 1);
      [[0, 0, 46, 20], [-30, 5, 30, 14], [32, 6, 26, 12], [6, -9, 28, 14]].forEach(([x, y, rx, ry]) => sh.fillEllipse(x, y, rx * 2, ry * 2));
      g.setScale(esc); sh.setScale(esc * 1.06);
      const n = { g, sh, x: -m - 140 - Math.random() * (W + m * 2), y: -m + 40 + Math.random() * (H + m - 80), vel: 5 + Math.random() * 9 };
      this.nubes.push(n);
    }
  }
  tickNubes(dt) {
    if (!this.nubes || !this.nubes.length) return;
    const W = GF.WORLD_W, H = GF.WORLD_H, m = GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0;
    for (const n of this.nubes) {
      n.x += n.vel * dt;
      if (n.x > W + m + 160) { n.x = -m - 160; n.y = -m + 40 + Math.random() * (H + m - 80); }
      n.g.setPosition(n.x, n.y);
      n.sh.setPosition(n.x + 16, n.y + 26);   // la sombra cae desplazada, como si el sol pegara de arriba
    }
  }

  // HOJAS AL VIENTO (4/8): cuando pasa una ráfaga, salen unas hojitas de las copas y cruzan
  // la pantalla. Sirve para que la ráfaga se ENTIENDA y no solo se vea en el meneo de los árboles.
  tickHojas(raf) {
    if (!FX_HOJAS || !VIENTO_ON) return;
    const fuerte = raf > 1.35;
    if (!fuerte) { this._rafActiva = false; return; }
    if (this._rafActiva) return;   // una sola tanda por ráfaga
    this._rafActiva = true;
    const arb = this.objs.filter(o => o.type === "tree" && !o.locked && o.sprite && o.sprite.visible && nowMs() >= (o.readyAt || 0));
    if (!arb.length) return;
    const n = this.pidoPart(Math.min(6, arb.length * 2));
    for (let i = 0; i < n; i++) {
      const a = arb[Math.floor(Math.random() * arb.length)];
      const x = a.cx + (Math.random() - 0.5) * 26, y = a.by - (a.sprite.displayHeight || 60) * (0.5 + Math.random() * 0.4);
      const h = this.add.rectangle(x, y, 4, 2.5, Math.random() < 0.5 ? 0x97c459 : 0x639922).setDepth(99994).setAngle(Math.random() * 360);
      this.tweens.add({
        targets: h, x: x + 90 + Math.random() * 130, y: y + 30 + Math.random() * 60,
        angle: h.angle + 480, alpha: { from: 0.95, to: 0 },
        duration: 2200 + Math.random() * 1400, ease: "Sine.easeInOut",
        onComplete: () => { h.destroy(); this.sueltoPart(1); },
      });
    }
  }

  // MARIPOSAS (4/8): revolotean y se posan sobre los cultivos LISTOS; si cosechás, salen volando.
  // DESTELLO DE LAS VETAS CARAS (9/8): diamante y netherita sueltan una chispita de vez en
  // cuando, con el color de su mineral. Sirve para dos cosas: se distinguen de lejos y avisa
  // que están listas (durante el enfriamiento no brillan).
  arrancarBrilloVetas() {
    if (!NODO_BRILLO || this.brilloEv) return;
    const caras = { diamante: 0xbfeeff, netherita: 0xff8a3c, oro: 0xffe08f };
    // Cada veta lleva su PROPIO reloj: si no, todas destellaban en el mismo instante y se
    // notaba el pulso. El evento es solo un despertador que corre seguido y pregunta.
    this.brilloEv = this.time.addEvent({ delay: 220, loop: true, callback: () => {
      if (!NODO_BRILLO) return;   // se puede apagar en caliente desde el panel de balanceo
      const t = nowMs();
      const cada = Math.max(400, NODO_BRILLO_CADA || 2200);
      this.objs.forEach(o => {
        if (o.type !== "ore" || o.locked) return;
        const col = caras[o.ore]; if (!col) return;
        if (o.readyAt && t < o.readyAt) return;                 // en enfriamiento no brilla
        if (!o.sprite || !o.sprite.visible) return;
        // primera vez: se reparte al azar dentro del ciclo para que no arranquen todas juntas
        if (!o.brilloEn) { o.brilloEn = t + Math.random() * cada; return; }
        if (t < o.brilloEn) return;
        o.brilloEn = t + cada * (0.55 + Math.random() * 0.9);    // el próximo, entre el 55% y el 145%
        const w = o.rw || o.w, alto = o.sprite.displayHeight || w;
        const x = o.cx + (Math.random() - 0.5) * w * 0.6;
        const y = o.by - alto * (0.35 + Math.random() * 0.4);
        const g = this.add.graphics().setDepth(o.by + 2).setBlendMode(Phaser.BlendModes.ADD);
        g.fillStyle(col, 1);
        g.fillTriangle(0, -5, 1.4, 0, -1.4, 0).fillTriangle(0, 5, 1.4, 0, -1.4, 0)     // chispa de 4 puntas
         .fillTriangle(-5, 0, 0, 1.4, 0, -1.4).fillTriangle(5, 0, 0, 1.4, 0, -1.4);
        g.setPosition(x, y).setScale(0.3).setAlpha(0);
        this.tweens.add({ targets: g, alpha: { from: 0, to: 0.9 }, scale: { from: 0.3, to: 1 },
          duration: 260, yoyo: true, hold: 90, ease: "Sine.easeOut", onComplete: () => g.destroy() });
      });
    } });
  }

  crearMariposas() {
    this.maripos = [];
    for (let i = 0; i < (FX_MARIPOSAS || 0); i++) {
      const g = this.add.graphics().setDepth(99993);
      const col = [0xffd75e, 0xf4c0d1, 0xb5d4f4][i % 3];
      g.fillStyle(col, 1).fillEllipse(-2.6, 0, 5, 7).fillEllipse(2.6, 0, 5, 7);
      g.fillStyle(0x241505, 0.8).fillRect(-0.6, -3, 1.2, 6);
      g.setPosition(GF.WORLD_W * Math.random(), GF.WORLD_H * Math.random());
      this.maripos.push({ g, tx: g.x, ty: g.y, esperaHasta: 0, posada: null, fase: Math.random() * 6.28 });
    }
  }
  tickMariposas(dt, t) {
    if (!this.maripos || !this.maripos.length) return;
    const listos = this.plots.filter(p => p.state === "ready");
    for (const m of this.maripos) {
      if (m.posada && m.posada.state !== "ready") { m.posada = null; m.esperaHasta = 0; }   // la cosecharon: a volar
      if (t >= m.esperaHasta) {
        m.esperaHasta = t + 2600 + Math.random() * 3200;
        if (listos.length && Math.random() < 0.75) { m.posada = listos[Math.floor(Math.random() * listos.length)]; m.tx = m.posada.cx + (Math.random() - 0.5) * 14; m.ty = m.posada.by - 16 - Math.random() * 8; }
        else { m.posada = null; m.tx = 40 + Math.random() * (GF.WORLD_W - 80); m.ty = 40 + Math.random() * (GF.WORLD_H - 80); }
      }
      const dx = m.tx - m.g.x, dy = m.ty - m.g.y, d = Math.hypot(dx, dy);
      if (d > 2) { const v = Math.min(d, 34 * dt); m.g.x += dx / d * v; m.g.y += dy / d * v; }
      m.fase += dt * 9;
      m.g.setScale(0.75 + Math.abs(Math.sin(m.fase)) * 0.45, 1);   // aleteo: se angosta y se ensancha
      m.g.setDepth(m.g.y + 4);
    }
  }

  // VAPOR DE LA COCINA y CHISPAS DEL ALTAR: los edificios cuentan su estado sin abrir la ventana.
  tickVapor(t) {
    if (!FX_VAPOR) return;
    if (t < (this._vaporAt || 0)) return;
    this._vaporAt = t + 900;
    const ollas = (typeof cookList === "function") ? cookList().length : 0;
    if (ollas > 0) {
      const c = this.objs.find(o => o.type === "cocina");
      if (c && c.sprite && this.pidoPart(1)) {
        const p = this.add.ellipse(c.cx + (Math.random() - 0.5) * 10, c.by - (c.sprite.displayHeight || 60) * 0.75, 6, 4, 0xffffff, 0.5).setDepth(c.by + 2);
        this.tweens.add({ targets: p, y: p.y - 30, x: p.x + 6 + Math.random() * 8, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 1900, onComplete: () => { p.destroy(); this.sueltoPart(1); } });
      }
    }
    if (G.edif2 && G.edif2.altar) {
      const al = this.objs.find(o => o.type === "altar");
      if (al && al.sprite && this.pidoPart(1)) {
        const s = this.add.circle(al.cx + (Math.random() - 0.5) * 22, al.by - 8, 1.6, 0xbfa8ff, 0.9).setDepth(al.by + 2).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: s, y: s.y - 34 - Math.random() * 14, alpha: 0, duration: 1500 + Math.random() * 500, onComplete: () => { s.destroy(); this.sueltoPart(1); } });
      }
    }
  }

  // COPA APARTE (4/8): el árbol se parte en dos dibujos del MISMO sprite recortado —
  // el tronco (abajo) y la copa (arriba). Solo la copa gira, y gira sobre la unión con el tronco,
  // así la base y la tierra quedan totalmente quietas. Antes giraba el sprite entero y se veía
  // que el tronco se doblaba, que era lo que no convencía.
  copaArmar(o) {
    const spr = o.sprite, fr = spr.frame;
    const W = fr.width, H = fr.height;
    const f = Math.max(0.15, Math.min(0.95, VIENTO_CORTE));
    const clave = spr.texture.key + "|" + (fr.name || "") + "|" + f.toFixed(3) + "|" + spr.scaleY.toFixed(4);
    if (o.copa && o.copaClave === clave) return;
    if (o.copa) o.copa.destroy();
    const unionY = spr.y - H * Math.abs(spr.scaleY) * (1 - f);   // dónde se juntan copa y tronco
    o.copa = this.add.image(spr.x, unionY, spr.texture.key, fr.name)
      .setOrigin(0.5, f)                        // el pivote cae justo en la unión
      .setScale(spr.scaleX, spr.scaleY)
      .setDepth(spr.depth + 0.1)
      .setAlpha(spr.alpha);
    o.copa.setCrop(0, 0, W, H * f);             // solo la parte de arriba
    spr.setCrop(0, H * f, W, H * (1 - f));      // el tronco: la parte de abajo
    spr.setAngle(0);
    o.copaClave = clave;
  }
  copaSacar(o) {
    if (!o) return;
    if (o.copa) { o.copa.destroy(); o.copa = null; }
    o.copaClave = null;
    if (o.sprite && o.sprite.isCropped) o.sprite.setCrop();
  }

  // VIENTO (4/8): los árboles crecidos se mecen apenas, como si soplara viento.
  // Cada árbol arranca en un punto distinto de la onda (desfase sacado de su posición) para que
  // no se muevan todos al mismo tiempo, y cada tanto pasa una ráfaga que los inclina más a todos.
  tickViento() {
    if (!VIENTO_ON) {
      if (this._vientoLimpio) return;                       // ya quedó todo derecho
      this.objs.forEach(o => { if (o.type === "tree") { this.copaSacar(o); if (o.sprite) o.sprite.setAngle(0); } });
      this.plots.forEach(p => { if (p.spr) p.spr.setAngle(0); });
      this._vientoLimpio = true; return;
    }
    this._vientoLimpio = false;
    const seg = this.time.now / 1000;
    const w = Math.PI * 2 / Math.max(0.2, VIENTO_SEG);
    // ráfaga: un pico angosto y suave cada VIENTO_RAFAGA_CADA segundos
    const p = Math.max(1, VIENTO_RAFAGA_CADA);
    const raf = 1 + (VIENTO_RAFAGA_MULT - 1) * Math.pow(Math.abs(Math.sin(seg * Math.PI / p)), 12);
    this.tickHojas(raf);   // en el pico de la ráfaga vuelan unas hojas
    for (const o of this.objs) {
      if (o.type !== "tree" || !o.sprite || !o.sprite.visible) continue;
      // tocón, retoño, árbol bloqueado o en pleno saltito de crecimiento: entero y quieto
      if (o.locked || nowMs() < (o.readyAt || 0) || o.sprite._popTw) { this.copaSacar(o); if (o.sprite.angle) o.sprite.setAngle(0); continue; }
      this.copaArmar(o);
      if (o.sprite._golpeTw || (o.copa && o.copa._golpeTw)) continue;   // se está sacudiendo por un hachazo: el viento no manda
      if (o.vFase == null) o.vFase = (o.cx * 0.017 + o.by * 0.029) % (Math.PI * 2);
      o.copa.setAngle(Math.sin(seg * w + o.vFase) * VIENTO_GRADOS * raf);
    }
    if (VIENTO_CULTIVOS > 0) for (const pl of this.plots) {   // los cultivos listos también se mecen, más suave
      if (!pl.spr || !pl.spr.visible || pl.state !== "ready") continue;
      if (pl.vFase == null) pl.vFase = (pl.cx * 0.023 + pl.by * 0.031) % (Math.PI * 2);
      pl.spr.setAngle(Math.sin(seg * w * 1.35 + pl.vFase) * VIENTO_GRADOS * VIENTO_CULTIVOS * raf);
    }
  }

  // Un árbol/piedra a medio golpear se RECUPERA SOLO si dejás de pegarle (doc 4/8).
  // El hacha o el pico solo se gastan cuando el nodo cae del todo: los golpes sueltos son gratis.
  tickGolpes() {
    const t = nowMs();
    for (const o of this.objs) {
      if (!o.golpes || !o.golpesAt) continue;
      if (t - o.golpesAt < GOLPES_RESET_MS) continue;
      if (this.action && this.action.o === o) continue;   // le está pegando ahora mismo
      o.golpes = 0; o.golpesAt = 0; this.barraGolpes(o);
      if (nowMs() < o.readyAt) continue;                  // está en enfriamiento: la textura la maneja el tick de nodos
      this.setObjTex(o, o.baseKey, o.rw || o.w);          // vuelve a estar entero
    }
  }

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
    const d = this.add.graphics().setDepth(-989);   // era un Text con emoji que quedó vacío (10/8)
    d.fillStyle(0xdff2ff, 0.95).fillEllipse(0, 0, 5, 7);
    d.setPosition(x, y - 8);
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
    if (GF.enCerca && GF.enCerca(col, row)) return true;   // 12/8: la CERCA perimetral es intocable
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
    if (GF.enCerca) for (let c = col; c < col + p.cols; c++) for (let r = row; r < row + p.rows; r++) if (GF.enCerca(c, r)) return true;   // 12/8: la cerca perimetral es intocable
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
    // 12/8: la CERCA perimetral es intocable — ni edificios, ni árboles, ni piedras encima
    if (GF.enCerca) for (let c = leftCol; c < leftCol + wCells; c++) if (GF.enCerca(c, baseRow - 1) || GF.enCerca(c, baseRow)) return true;
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
    // 13/8: la herrería EN OBRA no se toca — este método pisaba build_store con "store"
    // terminado en cada tick (el bug del playtest: "coloqué el plano y salió construida")
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF.store && !(G.built && G.built.store)) return;
    const lit = (G.forgeLitUntil || 0) > nowMs();
    const key = lit && this.textures.exists("store_lit") ? "store_lit" : "store";
    if (o.sprite.texture.key !== key && this.textures.exists(key)) this.setObjTex(o, key, o.rw || o.w);
    // fuego "vivo" por código: resplandor rojizo que aparece y palpita sobre la boca del horno.
    // La posición se saca del alto REAL del sprite, no de un número fijo: así el arte se puede
    // cambiar (herrería nueva del 9/8) sin que el resplandor quede flotando en cualquier lado.
    const alto = o.sprite.displayHeight || (o.rw || o.w);
    const k = alto / 99;                                  // escala respecto de la textura actual
    const fx = o.cx - 0.027 * (o.rw || o.w);              // la fragua está apenas a la izquierda del centro
    const fy = o.by - 0.299 * alto;                       // boca de la fragua, medida sobre el sprite
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
      fx.setFlipX(!!s.flipX); fx.setAngle(0); fx.setDepth(s.depth + 0.5); fx.setVisible(true);
      if (fx.isCropped) fx.setCrop();   // el árbol se dibuja recortado (copa/tronco), pero el brillo va entero
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
    if (GF.NO_WALK) { this.nearFx.setVisible(false); return; }   // el granjero queda estacionado donde trabajó: su "cercanía" no vale
    const near = this.nearestInteract();
    const nearOk = near && !(near.type === "plot" && near.state === "locked");
    const ns = nearOk ? (near.sprite || near.ground) : null;
    apply(this.nearFx, (ns && ns !== hov) ? ns : null);
  }

  // recalcula las colisiones a partir de las posiciones actuales de los objetos (tras editar)
  rebuildCollisions() {
    const T = GF.TILE;
    GF.COLLISIONS = this.objs.filter(o => o.type !== "fish" && !o.oculto).map(o => GF.solidRect(o));   // los edificios sin plano colocado no estorban (12/8)
    this.navOf().invalidate();   // la rejilla de pathfinding se rearma sola en el próximo clic
  }
  // blueprints (12/8): el cartel de materiales que flota sobre una OBRA colocada
  letreroObra(o) {
    if (o.letrero) { o.letrero.destroy(); o.letrero = null; }
    if (!o || o.oculto || !o.sprite) return;
    if (typeof BUILD_DEF === "undefined" || !BUILD_DEF[o.type] || (G.built && G.built[o.type])) return;
    if (typeof obraFalta !== "function" || !(typeof obraDe === "function" && obraDe(o.type))) return;
    const falta = obraFalta(o.type);
    if (!falta.length) return;
    const partes = falta.map(([r, f, tot, dep]) => (r === "golden" ? "$G" : (RES_LABEL[r] || r)) + " " + dep + "/" + tot);
    o.letrero = this.add.text(o.cx, o.by - (o.sprite.displayHeight || 60) - 6, "🔨 " + partes.join("  ·  "),
      { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff3cf", stroke: "#241505", strokeThickness: 4, align: "center" })
      .setOrigin(0.5, 1).setDepth(99990);
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
    if (GF.NO_WALK) return false;   // sin granjero que camine, la cercanía no significa nada: solo cuenta el cursor
    const rad = (o.type === "plot") ? 52 : 66;
    return Math.hypot(o.cx - this.hero.x, o.by - this.hero.y) < rad;
  }

  // ¿el clic cae sobre un píxel OPACO del sprite? Evita seleccionar un árbol clickeando
  // el hueco transparente que rodea la copa (el rectángulo del sprite es mucho más grande).
  // RENDIMIENTO (10/8). Esto se llamaba ~85 veces por frame desde tres lugares distintos
  // (timers, brillo del hover y el cartel de acción), y cada llamada alocaba un Rectangle
  // nuevo y, si el cursor caía dentro, leía un píxel real del canvas con getPixelAlpha.
  // Ahora: el Rectangle se reusa y el resultado se cachea por frame y por sprite, así que
  // el trabajo real pasa a ser una vez por sprite en vez de tres.
  hitsSprite(s, wx, wy) {
    if (!s || !s.visible) return false;
    if (this._hitT !== this._frameT || this._hitX !== wx || this._hitY !== wy) {
      this._hitT = this._frameT; this._hitX = wx; this._hitY = wy;
      this._hitCache = new Map();
    }
    const yaEsta = this._hitCache.get(s);
    if (yaEsta !== undefined) return yaEsta;
    const r = this.hitsSpriteReal(s, wx, wy);
    this._hitCache.set(s, r);
    return r;
  }
  hitsSpriteReal(s, wx, wy) {
    const b = s.getBounds(this._hitRect || (this._hitRect = new Phaser.Geom.Rectangle()));
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
    if (pl.spr && pl.spr._popTw && mode === "ready") { pl.spr._popTw.stop(); pl.spr._popTw = null; }   // el pulso de escala reemplaza al pop
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
      // Antes eran tres Text con emoji; los emojis se perdieron del archivo y quedaron TRES
      // TEXTOS VACÍOS por parcela, cada uno con su tween infinito: con las 12 parcelas listas
      // eran 36 objetos y ~60 tweens actualizándose por frame sin dibujar un solo píxel.
      // Ahora son chispitas dibujadas por código, que además no dependen de la fuente (10/8).
      [[-0.38, -0.6], [0.36, -0.35], [0, -0.85]].forEach(([ox, oy], i) => {
        const r = i === 2 ? 3.4 : 2.4;
        const s = this.add.graphics().setDepth(pl.by + 2).setBlendMode(Phaser.BlendModes.ADD);
        s.fillStyle(0xffe9a8, 1)
         .fillTriangle(0, -r * 2, r * 0.55, 0, -r * 0.55, 0).fillTriangle(0, r * 2, r * 0.55, 0, -r * 0.55, 0)
         .fillTriangle(-r * 2, 0, 0, r * 0.55, 0, -r * 0.55).fillTriangle(r * 2, 0, 0, r * 0.55, 0, -r * 0.55);
        s.setPosition(pl.cx + ox * T, pl.by + oy * T);
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
      // idem: eran Text con emoji de moneda, quedaron vacíos. Ahora es una monedita dibujada.
      const c = this.add.graphics().setDepth(99999);
      c.fillStyle(0xd9a521, 1).fillCircle(0, 0, 4).fillStyle(0xffe08a, 1).fillCircle(-1, -1, 2.6);
      c.setPosition(x, y - 12);
      this.tweens.add({
        targets: c, x: x + (Math.random() - 0.5) * 52, y: y - 26 - Math.random() * 26,
        alpha: { from: 1, to: 0 }, duration: 520 + Math.random() * 240, delay: i * 40,
        onComplete: () => c.destroy(),
      });
    }
  }

  // brote mientras crece
  showGrowing(pl, pop) {
    pl.half = false; this.setPlotGlow(pl, "off");
    pl.spr.clearTint().setAlpha(1);
    pl.spr.setTexture("sprout").setVisible(true);
    pl.spr.setScale((GF.TILE * 0.73) / pl.spr.width);   // ~20px visibles, centrado en la tierra
    pl.emo.setVisible(false);
    if (pop) { this.popFx(pl.spr, POP_INTERMEDIO); this.puffFx(pl.cx, pl.by + 2, 0xb4b2a9, 5); }   // el brote asoma de la tierra
  }
  // cultivo (conjunto) cuando está listo; si falta el sprite, cae al emoji
  // `pop` = true solo cuando el cultivo TERMINA de crecer ahora mismo (no al restaurar la partida)
  showReadyCrop(pl, pop) {
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
    if (pop) {
      // primero el saltito de resorte y RECIÉN DESPUÉS el brillo, porque el brillo también
      // anima la escala y los dos tweens se pelearían por la misma propiedad
      this.puffFx(pl.cx, pl.by + 2, 0xc0dd97, 7);
      this.popFx(pl.spr, 1, () => { if (pl.state === "ready") this.setPlotGlow(pl, "ready"); });
    } else this.setPlotGlow(pl, "ready");
  }
  // pinta la parcela según su estado (para restaurar tras un refresh)
  applyPlotVisual(pl) {
    if (pl.state === "growing") {
      this.showGrowing(pl);
      // el guardado manda; si es una partida vieja sin el dato, se calcula con el multiplicador real
      if (!pl.growTotal) pl.growTotal = CROP_DEF[pl.cropKey] ? CROP_DEF[pl.cropKey].grow * 1000 * (typeof cdMult === "function" ? cdMult() : 1) : 0;
      if (pl.readyAt && pl.growTotal < pl.readyAt - nowMs()) pl.growTotal = pl.readyAt - nowMs();   // nunca menos que lo que falta
    }
    else if (pl.state === "ready") this.showReadyCrop(pl);
    else { this.setPlotGlow(pl, "off"); pl.spr.setVisible(false); pl.emo.setVisible(false); pl.timer.setVisible(false); }
  }

  // vuelca el estado de las parcelas a G.plots para que el autoguardado lo persista
  syncPlots() { if (this.plots) G.plots = this.plots.map(pl => ({ state: pl.state, readyAt: pl.readyAt, cropKey: pl.cropKey, witherAt: pl.witherAt || 0, growTotal: pl.growTotal || 0 })); }   // growTotal: sin él, tras un F5 la barrita de crecimiento arrancaba desde donde no era

  // Cuando el juego REGALA una parcela (nivel de granja, ficha del pase), hay que abrirla en el acto:
  // antes se sumaba al guardado pero el dibujo seguía en gris hasta apretar F5 (reporte del diseñador).
  refreshPlotLocks() {
    if (!this.plots) return;
    const owned = Math.max(2, Math.min(GF.PLOTS.length, G.plotsOwned || 2));
    this.plots.forEach((pl, i) => {
      if (i < owned && pl.state === "locked") {
        pl.state = "dry";
        if (pl.ground) {
          if (this.textures.exists("plot")) pl.ground.setTexture("plot").setDisplaySize(GF.TILE, GF.TILE);
          pl.ground.clearTint().setAlpha(1);
        }
        this.plotUnlockFx(pl);   // se nota que se abrió
      } else if (i >= owned && pl.state !== "locked") {
        pl.state = "locked";
        if (pl.ground) {
          if (this.textures.exists("plot_blocked")) pl.ground.setTexture("plot_blocked").setDisplaySize(GF.TILE, GF.TILE).clearTint().setAlpha(1);
          else pl.ground.setAlpha(0.45);
        }
      }
    });
    this.syncPlots();
  }

  // chispas y un destello sobre la parcela recién regalada
  plotUnlockFx(pl) {
    const fx = this.add.circle(pl.cx, pl.by, GF.TILE * 0.55, 0xffd75e, 0.5).setDepth(99990).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: fx, scale: 1.8, alpha: 0, duration: 620, onComplete: () => fx.destroy() });
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 26;
      const sp = this.add.rectangle(pl.cx, pl.by, 3, 3, i % 2 ? 0xfff3cf : 0xffd75e).setDepth(99991);
      this.tweens.add({ targets: sp, x: pl.cx + Math.cos(a) * r, y: pl.by + Math.sin(a) * r, alpha: 0, duration: 520 + Math.random() * 260, onComplete: () => sp.destroy() });
    }
    // DESBROCE (13/8): los yuyos y ramitas del terreno silvestre salen volando al abrirla
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 24;
      const esYuyo = i % 3 !== 2;
      const p = esYuyo
        ? this.add.ellipse(pl.cx + (Math.random() - 0.5) * 20, pl.by + (Math.random() - 0.5) * 20, 5, 3, i % 2 ? 0x3f9b3f : 0x2f7a2f, 0.95)
        : this.add.rectangle(pl.cx + (Math.random() - 0.5) * 20, pl.by + (Math.random() - 0.5) * 20, 6, 2, 0x8a5a33, 0.95);
      p.setDepth(99992).setAngle(Math.random() * 360);
      this.tweens.add({ targets: p, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r - 14, angle: p.angle + 200, alpha: 0, duration: 480 + Math.random() * 240, ease: "Quad.easeOut", onComplete: () => p.destroy() });
    }
  }

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
    this._frameT = time;   // marca del frame: la usa la caché de hitsSprite (10/8)
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero;
    this.drawOlas(dt);   // olas de la isla
    this.seguirAura();
    this.seguirSkins();

    // restaurar objetos que salieron de cooldown
    const t = nowMs();
    for (const o of this.objs) {
      // regeneración directa: de los restos vuelve al nodo entero (sin pasar por el dañado)
      if (o.readyAt && t >= o.readyAt) {
        o.readyAt = 0; o.halfAt = 0;
        if (o.type === "tree" || o.type === "rock") this.setObjTex(o, o.baseKey, o.rw || o.w);
        else if (o.type === "ore") { this.setObjTex(o, o.baseKey, o.rw || o.w); o.sprite.setAlpha(1); }
        if (o.timer) o.timer.setVisible(false);
        // TERMINÓ DE CRECER: saltito con resorte + polvillo (se nota que ya se puede volver a usar)
        this.popFx(o.sprite, 1);
        this.puffFx(o.cx, o.by - 3, o.type === "tree" ? 0x97c459 : 0xb4b2a9, o.type === "tree" ? 8 : 6);
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
        this.popFx(o.sprite, POP_INTERMEDIO);   // el retoño también asoma con un saltito, más chico
      } else if (o.readyAt && o.timer) {
        // cuarta.docx: el timer del recurso solo aparece con el cursor encima (al clickear ya sale el aviso)
        const p = this.input.activePointer;
        const over = this.timerOn(o);
        if (over) o.timer.setText(fmtCorto((o.readyAt - t) / 1000)).setPosition(o.cx, this.topY(o, (o.type === "ore" || o.type === "rock") ? -6 : 7)).setVisible(true);   // detalles213: el timer del mineral pegado al nodo (antes flotaba alto y se mezclaba)
        else o.timer.setVisible(false);
      }
    }
    // CLIC GUARDADO: tocaste otra vez mientras el golpe anterior todavía tenía el candado puesto.
    // Apenas se libera, sale. Así tocando rápido no se pierde ni un golpe (que es como se tala en
    // Sunflower Land: a clics, no manteniendo).
    if (this.buffer && !this.action) {
      const b = this.buffer; this.buffer = null;
      const listo = b.o.type === "plot" ? b.o.state !== "locked" : (!b.o.locked && t >= (b.o.readyAt || 0));
      if (t - b.t < CLIC_BUFFER_MS && listo) this.interactWith(b.o);
    }

    // UN CLIC = UN GOLPE, siempre. No hay "mantener apretado para seguir golpeando": eso sería una
    // mecánica que el diseñador no pidió. Lo único que se hace acá es no obligar a SOLTAR: pasados
    // unos milisegundos sin arrastrar ya está claro que es un clic y no un paneo, así que el golpe
    // sale. Sale UNA sola vez por pulsación; para el siguiente golpe hay que volver a clickear.
    if (GF.NO_WALK && !this.action && this.hold && !this.hold.active && !this.hold.disparo && !GF.uiOpen
        && (this.clickHit || this.clickPond) && t - (this.hold.t0 || t) > CLIC_SUELTO_MS) {
      const hit = this.clickHit, pond = this.clickPond;
      this.clickHit = null; this.clickPond = false;
      this.hold.disparo = true;   // ya actuó: al soltar no se dispara de nuevo
      if (hit) this.interactWith(hit);
      else if (pond) this.tryFish(this.input.activePointer.worldX, this.input.activePointer.worldY);
    }
    this.tickGolpes();      // los golpes sueltos se pierden a los 5 s (el nodo vuelve a estar entero)
    this.tickViento();      // los árboles crecidos y los cultivos listos se mecen con el viento
    this.tickAnimales(dt, t);   // los animales del corral pastan y caminan
    this.tickMascota(dt, t);    // la mascota pasea por la granja
    this.tickNubes(dt);     // nubes cruzando con su sombra
    this.tickMariposas(dt, t);
    this.tickVapor(t);      // vapor de la Cocina y chispas del Altar mejorado
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
      // 2/8: MARCHITADO DESACTIVADO (pedido del diseñador) — el cultivo listo ya no se pudre
      if (pl.state === "ready" && pl.witherAt) { pl.witherAt = 0; this.syncPlots(); }
      this.barraCultivo(pl, t);   // barrita + tiempo restante, SIEMPRE visible mientras crece (como SFL)
      if (pl.state !== "growing") continue;
      if (t >= pl.readyAt) { pl.state = "ready"; pl.readyAt = 0; pl.witherAt = 0; this.showReadyCrop(pl, true); this.syncPlots(); this.barraCultivo(pl, t); }   // 2/8: sin marchitado — la cosecha espera (con pop de crecimiento)
      else {
        // a media cosecha: la planta intermedia (se asoma la verdura) o el brote más grande
        if (!pl.half && pl.growTotal && (pl.readyAt - t) <= pl.growTotal / 2) {
          pl.half = true;
          const mk = "cropm_" + pl.cropKey;
          if (pl.cropKey && this.textures.exists(mk)) pl.spr.setTexture(mk);
          pl.spr.setScale((GF.TILE * 0.96) / pl.spr.width);   // ~25px visibles
          this.setPlotGlow(pl, "half");
          this.popFx(pl.spr, POP_INTERMEDIO);   // se estiró: saltito chico (el brillo de "half" es de alpha, no pelea)
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
      if (this.action.kind === "fish" && !GF.NO_WALK && (k.left.isDown || k.right.isDown || k.up.isDown || k.down.isDown || k.aleft.isDown || k.aright.isDown || k.aup.isDown || k.adown.isDown)) {
        this.cancelFishing();
      }
      if (!this.action) { hero.setDepth(hero.y); this.updatePrompt(); return; }
      this.action.t += dt;
      // al picar/talar: a mitad de la acción el nodo pasa al estado dañado (entero → dañado → restos)
      const ao = this.action.o;
      // MOMENTO DEL IMPACTO: con ACT_IMPACTO = 0 el nodo se agrieta en el mismo frame del clic.
      // OJO: el estado dañado depende del GOLPE que se está dando, no del avance de la animación.
      // Si no, en el primer clic el nodo saltaba a "casi roto" y después retrocedía.
      const tImpacto = this.action.dur * Math.max(0, Math.min(1, ACT_IMPACTO));
      if (!this.action.golpeYa && ao && (ao.type === "tree" || ao.type === "rock" || ao.type === "ore") && this.action.t >= tImpacto) {
        this.action.golpeYa = true;
        this.destelloFx(ao);
        this.golpeFx(ao, this.action.kind);
      }
      if (!this.action.halfDone && ao && (ao.type === "rock" || ao.type === "ore") && this.action.t >= tImpacto) {
        this.action.halfDone = true;
        if ((ao.golpes || 0) + 1 >= GOLPES_MINAR - 1 && this.textures.exists(ao.baseKey + "_half")) this.setObjTex(ao, ao.baseKey + "_half", ao.rw || ao.w);
      }
      // talar: el árbol pasa por dos cortes intermedios (tajo leve → tajo profundo con hojas caídas)
      if (ao && ao.type === "tree" && !this.action.cutDone && this.action.t >= tImpacto) {
        this.action.cutDone = true;
        const g = (ao.golpes || 0) + 1;   // golpe que se está por completar
        const tex = g === 1 ? "tree_cut1" : (g < GOLPES_TALAR ? "tree_cut2" : null);
        if (tex && this.textures.exists(tex)) this.setObjTex(ao, tex, ao.rw || ao.w);
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
    // cola: solo en el modo viejo con granjero que camina (en la granja de un clic no existe)
    if (!GF.NO_WALK && !this.action && !this.pendingObj && !this.moveTarget && this.queue.length) {
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
      if (!hit) { const an = this.animalEnPunto(wx, wy); if (an) hit = { type: "animal", k: an.k }; }
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
