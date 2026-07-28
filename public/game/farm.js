/* FarmScene: la granja privada. Fase 1 (mundo) + Fase 3 (interacciones). */
const CD = { tree: 8, rock: 10 };            // cooldown en segundos
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

    // fondo + estanque + lotes-tierra + grilla
    const g = this.add.graphics().setDepth(-1000);
    g.fillStyle(0x6ba043, 1).fillRect(0, 0, W, H);
    const p = GF.POND, pcx = (p.col + p.cols / 2) * T, pcy = (p.row + p.rows / 2) * T, pw = p.cols * T, ph = p.rows * T;
    if (this.textures.exists("pond")) {
      this.add.image(pcx, pcy, "pond").setDisplaySize(pw + 10, ph + 10).setDepth(-999);
    } else {   // fallback: laguna dibujada
      g.fillStyle(0x2f5f8c, 1).fillEllipse(pcx, pcy, pw, ph);
      g.fillStyle(0x66a9dc, 1).fillEllipse(pcx, pcy - 6, pw - 26, ph - 26);
    }
    GF.PLOTS.forEach(pl => { const x = pl.col * T, y = pl.row * T; g.fillStyle(0x8a5a33, 1); g.fillRoundedRect(x + 3, y + 3, T - 6, T - 6, 6); g.fillStyle(0x724829, 1); g.fillRoundedRect(x + 6, y + 6, T - 12, T - 12, 5); });

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

    // objetos del mundo (con estado para interacción)
    this.objs = GF.WORLD_OBJECTS.map((o, i) => {
      const lp = (G.layout && G.layout[i]) || null;                            // posición editada por el jugador
      const cx = lp ? lp.cx : o.cx, by = lp ? lp.by : o.by;
      const s = this.add.image(cx, by, o.key).setOrigin(0.5, 1);
      const rw = (o.type === "ore" || o.type === "rock") ? o.w * 0.84 : o.w;   // nodos algo más chicos, dentro de la celda
      s.setScale(rw / s.width); s.setDepth(by);
      return { i, type: o.type, ore: o.ore, cx, by, w: o.w, rw, baseKey: o.key, sprite: s, readyAt: 0 };
    });

    // rótulos flotantes sobre los edificios
    const BLD = { barn: "🏡 Granja", market: "🏪 Tienda", store: "🛠️ Herrería" };
    this.objs.forEach(o => {
      const nm = BLD[o.type]; if (!nm) return;
      this.add.text(o.cx, o.by - o.w * 0.9, nm, {
        fontFamily: "system-ui", fontSize: "12px", fontStyle: "bold", color: "#f4ecd6",
        stroke: "#20301a", strokeThickness: 4, backgroundColor: "rgba(20,28,15,0.5)", padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(o.by + 2);
    });

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
      const obj = { type: "plot", i, cx, by: cy, state: "dry", readyAt: 0, cropKey: null, spr, emo, timer };
      const sv = savedPlots[i];   // restaura lo plantado antes del refresh (ignora estados viejos como "wet")
      if (sv && (sv.state === "growing" || sv.state === "ready")) { obj.state = sv.state; obj.readyAt = sv.readyAt || 0; obj.cropKey = sv.cropKey || null; this.applyPlotVisual(obj); }
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
      if (GF.editMode) {   // modo edición: agarrar el objeto bajo el cursor
        const wx = pt.worldX, wy = pt.worldY; let hit = null, bd = 1e9;
        for (const o of this.objs) { if (o.type === "fish") continue; const b = o.sprite.getBounds(); if (Phaser.Geom.Rectangle.Contains(b, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } } }
        if (hit) { hit.origCx = hit.cx; hit.origBy = hit.by; }   // por si hay que devolverlo
        this.dragObj = hit; return;
      }
      if (GF.uiOpen) return;
      const wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const o of this.objs.concat(this.threats)) {
        const b = o.sprite.getBounds();
        if (Phaser.Geom.Rectangle.Contains(b, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } }
      }
      if (!hit) { for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { hit = pl; break; } } }
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
      if (!GF.editMode || !this.dragObj) return;
      const o = this.dragObj;
      o.sprite.setPosition(pt.worldX, pt.worldY).setDepth(99999);
      const wCells = Math.max(1, Math.round(o.w / T));
      const leftCol = Phaser.Math.Clamp(Math.round((pt.worldX - wCells * T / 2) / T), 0, GF.COLS - wCells);
      const baseRow = Phaser.Math.Clamp(Math.round(pt.worldY / T), 1, GF.ROWS);
      const blocked = this.placeBlocked(o, leftCol, baseRow, wCells);
      if (!this.editHl) this.editHl = this.add.rectangle(0, 0, T, T, 0x7ec95a, 0.35).setOrigin(0, 1).setDepth(99998);
      this.editHl.setPosition(leftCol * T, baseRow * T).setSize(wCells * T, T)
        .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.4).setVisible(true);
    });
    this.input.on("pointerup", (pt) => {
      if (this.editHl) this.editHl.setVisible(false);
      if (!GF.editMode || !this.dragObj) return;
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
    for (const o of this.objs.concat(this.plots).concat(this.threats)) {
      const rad = (o.type === "barn" || o.type === "market" || o.type === "store") ? 72 : (o.type === "plot" ? 42 : (o.type === "boar" ? 55 : 58));
      const d = Math.hypot(o.cx - this.hero.x, o.by - this.hero.y);
      if (d < rad && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  promptText(o) {
    const cd = nowMs() < o.readyAt;
    if (o.type === "boar") return "🥍 Espantar jabalí";
    if (o.type === "plot") {
      if (o.state === "dry") { const cd = CROP_DEF[G.selSeed]; return "🌱 Plantar " + (cd ? cd.label : "cultivo"); }
      if (o.state === "ready") { const cd = CROP_DEF[o.cropKey]; return "🌾 Cosechar " + (cd ? cd.label : ""); }
      return "🌱 Creciendo…";
    }
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
    if (o.type === "barn") return openOv("ov-barn");
    if (o.type === "market") return openOv("ov-market");
    if (o.type === "store") return openOv("ov-forge");
    if (o.type === "boar") { o.sprite.destroy(); const i = this.threats.indexOf(o); if (i >= 0) this.threats.splice(i, 1); log("🥍 Espantaste al jabalí.", "good"); toast("🥍 ¡Espantado!"); return; }   // XP de espada llega con el combate (necesita espada equipada)
    if (o.type === "plot") {
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
        G.seeds[ck]--; o.cropKey = ck; o.state = "growing"; o.readyAt = nowMs() + cd.grow * 1000 * cdMult();
        o.growTotal = o.readyAt - nowMs();
        this.showGrowing(o);
        this.syncPlots(); addXp("farming", 5); log(`🌱 Plantaste ${cd.label}.`, "good"); toast("🌱 " + cd.label);
        if (isOpen("ov-inv")) refreshInv();
      }
    } else if (a.kind === "harvest") {
      const ck = o.cropKey || "papa", cd = CROP_DEF[ck] || CROP_DEF.papa;
      const gr = Math.max(1, Math.round(cd.yield * yieldMult()));
      if (tryAddRes(ck, gr)) { o.state = "dry"; o.cropKey = null; o.readyAt = 0; this.setPlotGlow(o, "off"); o.spr.setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false); this.syncPlots(); addXp("farming", 10); log(`${cd.emoji} +${gr} ${cd.label}.`, "good"); toast("+" + gr + " " + cd.emoji); refreshHud(); }
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

  // brillo/efecto del cultivo: "half" (media cosecha) o "ready" (listo); cualquier otro valor lo apaga
  setPlotGlow(pl, mode) {
    if (pl.glowTw) { pl.glowTw.stop(); pl.glowTw = null; }
    if (pl.glowTxt) { pl.glowTxt.destroy(); pl.glowTxt = null; }
    pl.spr.setAlpha(1);
    if (mode === "half") {
      pl.glowTw = this.tweens.add({ targets: pl.spr, alpha: { from: 1, to: 0.72 }, yoyo: true, repeat: -1, duration: 700 });
    } else if (mode === "ready") {
      pl.glowTxt = this.add.text(pl.cx + GF.TILE * 0.3, pl.by - GF.TILE * 0.55, "✨", { fontSize: "13px" }).setOrigin(0.5).setDepth(pl.by + 2);
      pl.glowTw = this.tweens.add({ targets: pl.glowTxt, alpha: { from: 1, to: 0.25 }, scale: { from: 1, to: 1.3 }, yoyo: true, repeat: -1, duration: 550 });
    }
  }

  // brote mientras crece
  showGrowing(pl) {
    pl.half = false; this.setPlotGlow(pl, "off");
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
  syncPlots() { if (this.plots) G.plots = this.plots.map(pl => ({ state: pl.state, readyAt: pl.readyAt, cropKey: pl.cropKey })); }

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
        o.timer.setText(Math.ceil((o.readyAt - t) / 1000) + "s").setVisible(true);
      }
    }
    // lotes: pasar de "creciendo" a "listo"
    for (const pl of this.plots) {
      if (pl.state !== "growing") continue;
      if (t >= pl.readyAt) { pl.state = "ready"; pl.readyAt = 0; this.showReadyCrop(pl); this.syncPlots(); }
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
