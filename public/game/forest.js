/* ForestScene: el Bosque (Fase D — combate). Entrás desde el borde derecho de la granja.
   Cuanto más a la derecha te metés, más fuertes los monstruos. Si te matan, despertás en la granja. */
class ForestScene extends Phaser.Scene {
  constructor() { super("forest"); }

  create() {
    const T = GF.TILE;
    this.W = 32 * T; this.H = GF.WORLD_H;   // bosque más ancho que la granja
    GF.uiOpen = false;

    // 10/8: la Zona Negra dejó de ser un solo bosque. El mapa que se arma sale de ZONA_DEF:
    // piso, densidad de árboles y qué bichos viven acá. Ver state.js.
    const Z = (typeof ZONA_DEF !== "undefined" && ZONA_DEF[GF.zona]) ? ZONA_DEF[GF.zona] : null;
    this.Z = Z; this.zonaKey = Z ? GF.zona : "pantano";
    if (typeof zonaMarcarVisitada === "function") zonaMarcarVisitada(this.zonaKey);
    const PISO = Z ? Z.piso : [0x2f4a20, 0x2a431c];

    // piso del mapa: damero de dos tonos + decoraciones
    const g = this.add.graphics().setDepth(-1000);
    const cols = Math.ceil(this.W / T), rows = Math.ceil(this.H / T);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      g.fillStyle((cx + cy) % 2 === 0 ? PISO[0] : PISO[1], 1);
      g.fillRect(cx * T, cy * T, T, T);
    }
    // matas y piedritas deterministas (LCG) para que no se vea plano
    let seed = 20260731;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 260; i++) {
      const x = rnd() * this.W, y = rnd() * this.H, t = rnd();
      if (t < 0.5) { g.fillStyle(Z ? Z.mata : 0x223a16, 0.8); g.fillRect(x, y, 2, 4); g.fillRect(x + 3, y + 1, 2, 3); }   // mata
      else if (t < 0.8) { g.fillStyle(Z ? Z.hierba : 0x3a5527, 0.7); g.fillRect(x, y, 3, 2); }                    // hierba
      else { g.fillStyle(0x4a4438, 0.6); g.fillRect(x, y, 3, 3); }                                                // piedrita
    }
    g.lineStyle(4, 0x22331a, 0.95).strokeRect(0, 0, this.W, this.H);

    // árboles decorativos (más densos a la derecha)
    this.treeCols = [];
    this.vientoArb = [];   // los mismos árboles, para mecerlos con el viento (se rearma en cada create)
    // El doc pedía −40% de árboles: pasaron de 46 fijos a la densidad de cada mapa (el pantano
    // tiene 28, y va bajando hasta 4 en la guarida, que es roca y fuego).
    const NARB = Z ? Z.arboles : 28;
    for (let i = 0; i < NARB; i++) {
      const x = 60 + Math.random() * (this.W - 120), y = 60 + Math.random() * (this.H - 90);
      if (x < 150 && y > this.H / 2 - 80 && y < this.H / 2 + 80) continue;   // entrada despejada
      const s = this.add.image(x, y, "tree").setOrigin(0.5, 1);
      s.setScale((T * 2) / s.width).setDepth(y).setAlpha(0.96);
      this.treeCols.push({ cx: x, by: y, hw: T * 2 * 0.17, dep: T * 0.32 });   // solo el tronco estorba
      this.vientoArb.push({ spr: s, fase: (x * 0.017 + y * 0.029) % (Math.PI * 2) });   // se mecen con el viento
    }

    // nombre del mapa, arriba a la izquierda
    this.add.text(this.W / 2, 16, (Z ? Z.label : "Zona Negra"), { fontFamily: "system-ui", fontSize: "15px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 4 })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(9000);

    // SALIDA IZQUIERDA: al mapa anterior, o a la granja si estás en el primero (10/8)
    const ant = (typeof zonaAnt === "function") ? zonaAnt(this.zonaKey) : null;
    this.salidaIzq = ant;   // null = a la granja
    { const g2 = this.add.graphics().setDepth(5);
      g2.fillStyle(0x241505, 1).fillEllipse(26, this.H / 2 - 16, 34, 44);
      g2.fillStyle(ant ? 0x6b4a86 : 0x3fa3cc, 0.9).fillEllipse(26, this.H / 2 - 16, 24, 34); }
    this.add.text(26, this.H / 2 + 16, ant ? ZONA_DEF[ant].label : "Granja",
      { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5).setDepth(5);

    // TELEPORT DERECHO: al mapa siguiente, si existe y si tenés el nivel de Combate
    const sig = (typeof zonaSig === "function") ? zonaSig(this.zonaKey) : null;
    this.salidaDer = sig;
    if (sig) {
      const zs = ZONA_DEF[sig], ok = zonaPuedeEntrar(sig);
      const gx = this.W - 30;
      const g3 = this.add.graphics().setDepth(5);
      g3.fillStyle(0x241505, 1).fillEllipse(gx, this.H / 2 - 16, 36, 46);
      g3.fillStyle(ok ? 0xb45ad8 : 0x555046, 0.9).fillEllipse(gx, this.H / 2 - 16, 26, 36);
      this.add.text(gx, this.H / 2 + 16, ok ? zs.label : zs.label + " · Combate " + zs.lvl,
        { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: ok ? "#ffe08a" : "#c9bfa8", stroke: "#20301a", strokeThickness: 3 })
        .setOrigin(0.5).setDepth(5);
    }

    // monstruos: los del mapa en el que estás, en su franja de profundidad
    this.monsters = [];
    const zones = Z ? Z.mobs : [["rata", 0.08, 0.40, 4], ["murcielago", 0.20, 0.62, 4], ["larva", 0.35, 0.90, 4]];
    zones.forEach(([key, x0, x1, n]) => { for (let i = 0; i < n; i++) this.spawnMonster(key, x0, x1); });
    // Guarida: la vida del Dragón es la del asalto del clan, así que se trae de Supabase
    if (this.zonaKey === "guarida" && typeof raidActivo === "function") {
      raidActivo().then(r => {
        if (!r || !r.raid) return;
        this._jefeHp = Number(r.raid.hp); this._jefeMax = Number(r.raid.hp_max);
        if (r.raid.estado === "vencido") {
          const jefe = this.monsters.find(m => m.def && m.def.boss);
          if (jefe) { jefe.dead = true; jefe.spr.setVisible(false); jefe.bar.clear(); }
          toast("El Dragón ya está vencido — cobrá tu parte en Clan");
        }
      });
    }

    // héroe
    const hero = this.add.sprite(90, this.H / 2, "hero_idle_0").setOrigin(0.5, 1);
    this.idleScale = GF.SIZE.hero / hero.height;
    this.actScale = this.idleScale;   // granjero definitivo: misma escala de cuerpo en quieto y acciones
    hero.setScale(this.idleScale); hero.play("idle");
    GF.scene = "forest";   // la vida NO se regenera sola acá (solo en la granja)
    this.hero = hero; this.facing = "east"; this.moveTarget = null; this.action = null; this.hurtFx = 0;
    // igual que en la granja: al reiniciar la escena hay que soltar lo cacheado
    // (Phaser destruye los objetos al salir, pero la instancia de escena se reusa: si no se limpian,
    //  la barra de vida y el aura quedan apuntando a objetos muertos y no se vuelven a dibujar)
    this.heroBar = null; this.auraFx = null; this.auraTw = null; this._avisoStam = 0;
    this.tgGlow = null; this.tgGlowTw = null; this.tgTxt = null; this.destMk = null;
    this.updateAura();   // aura cosmética, si la tenés encendida (después de limpiar el cacheado)
    this._nav = null; this.holdLast = null; this.holdPend = null; this.pathStuck = 0; this.leaving = false;
    this.target = null; this.nextAuto = 0; this.path = null; this.hold = null; this.autoOn = false;
    // el botín tirado sobrevive mientras dure la sesión: si volvés al Bosque, sigue ahí
    GF.forestDrops = GF.forestDrops || [];
    GF.forestDrops.forEach(g => { g.spr = this.dropSprite(g); });
    this.input.mouse.disableContextMenu();

    // clic izquierdo: ir hacia el monstruo (y fijarlo) o moverse · clic DERECHO: atacar (detalles 338)
    this.input.on("pointerdown", (pt) => {
      if (GF.uiOpen) return;
      const wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const m of this.monsters) { if (m.dead) continue; const b = m.spr.getBounds(); if (Phaser.Geom.Rectangle.Contains(b, wx, wy)) { const d = Math.hypot(m.cx - wx, m.by - wy); if (d < bd) { bd = d; hit = m; } } }
      if (pt.rightButtonDown()) { if (hit) { if (!this.hasWeapon()) { toast("Necesitás un arma equipada para atacar"); return; } this.setTarget(hit); this.autoOn = true; } return; }   // clic DERECHO: fijar y AUTO-atacar (detalles viernes)
      if (this.action) return;
      this.hold = { sx: pt.x, sy: pt.y, active: false };
      // clic izquierdo (Discord 1/8): si cliqueás un bicho que tenés CERCA, un espadazo suelto —
      // sin fijarlo, sin recuadro rojo y sin auto-ataque — y se puede seguir caminando mientras
      // (animación caminar+espadazo). Si está lejos o no hay arma, el clic solo camina.
      if (hit && swordDmg() > 0) {   // con arco (o sin arma) el clic izquierdo solo camina: el arco dispara con clic derecho
        const now = nowMs();   // MISMO reloj que update() — mezclar time.now rompía la cadencia
        const d = Math.hypot(hit.cx - this.hero.x, hit.by - this.hero.y);
        if (d <= MELEE_RANGE && !this.action && now >= this.nextAuto) {
          this.facing = (hit.cx < this.hero.x) ? "west" : "east";
          this.action = { kind: "attack", m: hit, t: 0, dur: 0.45 };
          this.nextAuto = now + ATTACK_MS / atkSpdMult();   // misma cadencia que el auto-ataque (sin spam de clics)
          return;                            // no toca el destino actual: sigue caminando si venía caminando
        }
      }
      this.clearTarget(); this.goTo(wx, wy); this.tryPickup(wx, wy, 20);
    });
    // clic sostenido: el granjero sigue el cursor (igual que en la granja)
    this.input.on("pointermove", (pt) => {
      if (GF.uiOpen || !this.hold || !pt.isDown || pt.rightButtonDown()) return;
      if (!this.hold.active && Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) < 16) return;
      if (!this.hold.active) { if (this.action) return; this.hold.active = true; }
      this.holdSeek(pt.worldX, pt.worldY);
    });
    this.input.on("pointerup", () => {
      if (this.hold && this.hold.active && this.holdPend) { const p = this.holdPend; this.holdPend = null; this.holdSeek(p.x, p.y); }
      this.hold = null;
    });

    this.cameras.main.setBounds(0, 0, this.W, this.H);
    this.cameras.main.startFollow(hero, true, 0.15, 0.15);
    this.cameras.main.setZoom(GF.ZOOM);
    this.cameras.main.setBackgroundColor("#2c4a20");

    this.keys = this.input.keyboard.addKeys({ up:"W", down:"S", left:"A", right:"D", aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT", act:"E", act2:"SPACE" }, false);
    this.keys.act.on("down", () => this.tryAttack());
    this.keys.act2.on("down", () => this.tryAttack());
    toast("La Zona Negra — cuanto más profundo, más peligro");
    log("Entraste a la Zona Negra. Los monstruos fuertes viven a la derecha.", "info");
    refreshHud();
  }

  // pathfinding A* (módulo compartido con la Granja — nav.js)
  navOf() { if (!this._nav) this._nav = new GF.Nav((x, y, p) => this.blockedAt(x, y, p), this.W, this.H); return this._nav; }
  goTo(x, y, silent) {
    const p = this.navOf().find(this.hero.x, this.hero.y, x, y);
    if (!p) { this.path = null; this.moveTarget = null; if (!silent) toast("No hay camino hasta ahí"); return false; }
    this.path = p.slice(); this.moveTarget = this.path.shift();
    return true;
  }
  holdSeek(wx, wy) {
    if (this.action) return;
    const t = nowMs();
    if (this.holdLast && Math.hypot(wx - this.holdLast.x, wy - this.holdLast.y) < 10 && t - (this.holdAt || 0) < 130) { this.holdPend = { x: wx, y: wy }; return; }
    this.holdLast = { x: wx, y: wy }; this.holdAt = t; this.holdPend = null;
    if (this.navOf().lineFree(this.hero.x, this.hero.y, wx, wy)) { this.path = null; this.moveTarget = { x: wx, y: wy }; }
    else this.goTo(wx, wy, true);
    this.showDest(wx, wy);
  }
  showDest(x, y) {
    if (!this.destMk) {
      this.destMk = this.add.circle(x, y, 5, 0xffe9a8, 0.5).setStrokeStyle(2, 0xfff3cf, 0.95).setDepth(99997);
      this.tweens.add({ targets: this.destMk, scale: { from: 0.7, to: 1.25 }, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 480 });
    }
    this.destMk.setPosition(x, y).setVisible(true);
  }
  hideDest() { if (this.destMk) this.destMk.setVisible(false); }

  blockedAt(x, y, pad) {
    pad = pad || 0;
    if (x < 12 || y < 12 || x > this.W - 12 || y > this.H - 12) return true;
    for (const c of this.treeCols) {
      if (x > c.cx - c.hw - pad && x < c.cx + c.hw + pad && y > c.by - c.dep - pad && y < c.by + pad) return true;
    }
    return false;
  }

  spawnMonster(key, x0, x1) {
    const def = MONSTER_DEF[key];
    const cx = this.W * (x0 + Math.random() * (x1 - x0));
    const by = 70 + Math.random() * (this.H - 120);
    let spr, baseScale = 1;
    if (def.sprite && this.textures.exists(def.sprite + "_idle_0")) {   // sprite real con animaciones
      spr = this.add.sprite(cx, by, def.sprite + "_idle_0").setOrigin(0.5, 1).setDepth(by);
      baseScale = (def.size || 52) / spr.height;
      spr.setScale(baseScale);
      if (this.anims.exists(def.sprite + "_idle")) spr.play(def.sprite + "_idle");
    } else {
      spr = this.add.text(cx, by, def.emoji, { fontSize: Math.round(20 + def.hp / 12) + "px" }).setOrigin(0.5, 1).setDepth(by);
    }
    const bar = this.add.graphics().setDepth(by + 1);
    const m = { key, def, cx, by, hp: def.hp, spr, bar, baseScale, anim: "idle", dead: false, home: { x: cx, y: by }, tgt: null, nextHit: 0, wanderAt: 0 };
    this.drawBar(m);
    this.monsters.push(m);
    return m;
  }

  // cambia la animación del monstruo solo cuando hace falta (evita reiniciarla cada frame)
  playMob(m, kind, force) {
    if (!m.def.sprite || !m.spr.play) return;
    if (!force && m.anim === kind) return;
    const key = m.def.sprite + "_" + kind;
    if (!this.anims.exists(key)) return;
    m.anim = kind; m.spr.play(key, !force);
  }

  drawBar(m) {
    // Solo se redibuja si CAMBIÓ. Antes update() llamaba a drawBar de los 25 mobs en cada
    // frame y cada uno hacía clear() + 2 fillRect aunque no hubiera pasado nada (10/8).
    const firma = m.dead ? "x" : (Math.round(m.hp) + "/" + m.def.hp);
    if (m._barFirma === firma) return;
    m._barFirma = firma;
    m.bar.clear();
    if (m.dead || m.hp >= m.def.hp) return;
    const w = 30, x = m.cx - w / 2, y = m.by - (m.spr.displayHeight || m.spr.height) - 8;
    m.bar.fillStyle(0x000000, 0.55).fillRect(x - 1, y - 1, w + 2, 5);
    m.bar.fillStyle(m.hp / m.def.hp > 0.4 ? 0x7ec95a : 0xd9534f, 1).fillRect(x, y, w * (m.hp / m.def.hp), 3);
  }

  /* ---- objetivo fijado: el monstruo se ACLARA (igual que los recursos de la granja)
         + nombre y vida encima (detalles 338) ---- */
  setTarget(m) {
    const mismo = this.target === m;
    this.target = m;
    if (!mismo) this.nextAuto = 0;   // objetivo NUEVO: golpea ya. El mismo: respeta la cadencia (no se spamea con clic derecho)
    if (!this.tgTxt) this.tgTxt = this.add.text(0, 0, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe9c8", stroke: "#241408", strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(99991).setVisible(false);
    this.makeGlow(m);
    this.updateTargetFx();
  }
  // recuadro ROJO alrededor del mob fijado (detalles213: reemplaza al brillo aditivo)
  makeGlow(m) {
    if (this.tgGlowTw) { this.tgGlowTw.stop(); this.tgGlowTw = null; }
    if (this.tgGlow) { this.tgGlow.destroy(); this.tgGlow = null; }
    if (!m || m.dead || !m.spr) return;
    const b = m.spr.getBounds();
    const g = this.add.rectangle(b.centerX, b.centerY, b.width + 6, b.height + 6)
      .setStrokeStyle(2, 0xe23a2a, 0.95).setFillStyle(0, 0).setDepth(99990);
    this.tgGlow = g;
    this.tgGlowTw = this.tweens.add({ targets: g, alpha: { from: 1, to: 0.55 }, yoyo: true, repeat: -1, duration: 520 });
  }
  clearTarget() {
    this.target = null; this.autoOn = false;
    if (this.tgGlowTw) { this.tgGlowTw.stop(); this.tgGlowTw = null; }
    if (this.tgGlow) { this.tgGlow.destroy(); this.tgGlow = null; }
    if (this.tgTxt) this.tgTxt.setVisible(false);
  }
  updateTargetFx() {
    const m = this.target;
    if (!m || m.dead) { if (this.tgGlow || this.tgTxt) this.clearTarget(); return; }
    const s = m.spr, b = s.getBounds();
    if (this.tgGlow) {
      // el recuadro rojo acompaña al mob (posición y tamaño del sprite animado)
      this.tgGlow.setPosition(b.centerX, b.centerY).setSize(b.width + 6, b.height + 6);
    }
    if (this.tgTxt) this.tgTxt.setPosition(m.cx, b.top - 7).setText(m.def.label + "  " + Math.max(0, Math.ceil(m.hp)) + "/" + m.def.hp).setVisible(true);
  }

  /* ---- loot en el piso: se recoge pisándolo o con un clic (detalles 338) ---- */
  dropSprite(g) {
    const sk = g.kind === "gear" ? (GEAR_DEF[g.k] && GEAR_DEF[g.k].sprite)
      : (g.k === "plata" ? "coin_plata" : (typeof resSprite === "function" ? resSprite(g.k) : null));
    const emo = g.kind === "gear" ? ((GEAR_DEF[g.k] && GEAR_DEF[g.k].emoji) || "") : (g.k === "plata" ? "" : (RES_EMOJI[g.k] || ""));
    let s;
    if (sk && this.textures.exists(sk)) { s = this.add.image(g.x, g.y, sk).setOrigin(0.5, 1); s.setScale(19 / s.width); }
    else s = this.add.text(g.x, g.y, emo, { fontSize: "15px" }).setOrigin(0.5, 1);
    s.setDepth(g.y).setAlpha(0);
    this.tweens.add({ targets: s, alpha: 1, duration: 220 });
    this.tweens.add({ targets: s, y: g.y - 3, yoyo: true, repeat: -1, duration: 760, ease: "Sine.easeInOut" });
    if (g.kind === "gear") s.setTint ? s.setTint(0xfff0c0) : null;   // las armaduras destacan
    return s;
  }
  dropLoot(m, entries) {
    entries.forEach((e, i) => {
      const ang = (i / Math.max(1, entries.length)) * Math.PI * 2 + Math.random();
      const g = {
        x: Phaser.Math.Clamp(m.cx + Math.cos(ang) * (10 + Math.random() * 14), 20, this.W - 20),
        y: Phaser.Math.Clamp(m.by + Math.sin(ang) * (7 + Math.random() * 10), 30, this.H - 20),
        k: e.k, n: e.n, kind: e.kind || "res",
      };
      g.spr = this.dropSprite(g);
      GF.forestDrops.push(g);
    });
  }
  tryPickup(x, y, rad) {
    const gd = GF.forestDrops;
    if (!gd || !gd.length) return;
    for (let i = gd.length - 1; i >= 0; i--) {
      const g = gd[i];
      if (Math.hypot(g.x - x, g.y - y) > rad) continue;
      let ok = false, label = "";
      if (g.kind === "gear") { gainGear(g.k); ok = true; label = (GEAR_DEF[g.k] && GEAR_DEF[g.k].label) || "equipo"; }
      else if (g.k === "plata") { G.plata += g.n; ok = true; label = g.n + " "; }
      else { ok = tryAddRes(g.k, g.n); label = g.n + " " + (RES_EMOJI[g.k] || ""); }
      if (!ok) {
        // tryPickup corre en CADA frame: sin este freno, pararse encima de un drop con la
        // bolsa llena disparaba el toast 60 veces por segundo, el cartel quedaba clavado
        // para siempre y tapaba cualquier otro aviso (10/8).
        if (nowMs() - (this._avisoLleno || 0) > 2500) { this._avisoLleno = nowMs(); toast("Bolsa llena — liberá espacio para recoger"); }
        continue;
      }
      if (window.sfx) sfx("coin");
      if (g.kind !== "gear") toast("+" + label);
      const s = g.spr;
      if (s) { this.tweens.killTweensOf(s); this.tweens.add({ targets: s, y: s.y - 16, alpha: 0, duration: 260, onComplete: () => s.destroy() }); }
      gd.splice(i, 1);
      refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    }
  }

  nearestMonster(rad) {
    let best = null, bd = 1e9;
    for (const m of this.monsters) { if (m.dead) continue; const d = Math.hypot(m.cx - this.hero.x, m.by - this.hero.y); if (d < rad && d < bd) { bd = d; best = m; } }
    return best;
  }

  // E / espacio: fija el monstruo más cercano (el auto-ataque hace el resto)
  hasWeapon() { return swordDmg() > 0 || canShoot(); }   // viernes (2): solo se ataca CON arma equipada
  tryAttack() {
    if (!this.hasWeapon()) { toast("Necesitás un arma equipada para atacar"); return; }
    const near = this.nearestMonster(MELEE_RANGE) || (canShoot() ? this.nearestMonster(BOW_RANGE) : null);
    if (near) { this.setTarget(near); this.autoOn = true; }   // E/espacio ataca, como el clic derecho
  }
  // auto-ataque: un golpe cada 2s mientras el objetivo esté vivo y a distancia (detalles 338)
  autoAttack(t) {
    if (!this.autoOn) return;   // detalles viernes: el auto-ataque es SOLO con clic derecho
    const m = this.target;
    if (!m || m.dead || this.action || t < this.nextAuto) return;
    const d = Math.hypot(m.cx - this.hero.x, m.by - this.hero.y);
    if (d <= MELEE_RANGE && swordDmg() > 0) {   // viernes (2): melee SOLO con espada equipada (sin puños)
      this.facing = (m.cx < this.hero.x) ? "west" : "east";
      this.action = { kind: "attack", m, t: 0, dur: 0.45 }; this.nextAuto = t + ATTACK_MS / atkSpdMult();   // Runa Veloz
    } else if (canShoot() && d <= BOW_RANGE) {
      this.facing = (m.cx < this.hero.x) ? "west" : "east";
      this.action = { kind: "shoot", m, t: 0, dur: 0.35 }; this.nextAuto = t + ATTACK_MS / atkSpdMult();
    }
  }

  // disparo: proyectil que viaja hasta el monstruo y pega al llegar
  shootArrow(m) {
    if (!canShoot()) { toast("Sin flechas — crafteá en la Herrería"); return; }
    if (!this.cobrarEstamina(m)) return;   // la estamina se cobra ANTES: sin ella no se gasta ni la flecha ni la durabilidad
    const aid = armaEq();
    G.res.flecha--;
    if (aid) { useWeapon(aid); if (G.weapons[aid].dur <= 0) { log("¡" + ARM_DEF[aid].label + " roto! Reparalo en la Herrería.", "bad"); toast("¡Arco roto!"); } }
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    const a = this.add.text(this.hero.x, this.hero.y - 22, "", { fontSize: "16px", color: "#e8d3a8" }).setOrigin(0.5).setDepth(99999);
    a.setScale(m.cx < this.hero.x ? -1 : 1, 1);
    const d = Math.hypot(m.cx - this.hero.x, m.by - this.hero.y);
    this.tweens.add({
      targets: a, x: m.cx, y: m.by - (m.spr.displayHeight || m.spr.height) * 0.5, duration: Math.max(120, d * 1.6),
      onComplete: () => { a.destroy(); if (!m.dead) this.hitMonster(m); },
    });
  }

  mobDef(m) { return Math.round((m.def.def || 0) * (m.shellUntil && nowMs() < m.shellUntil ? 1.6 : 1)); }   // Caparazón del Golem

  // la primera vez que golpeás a una criatura se paga su estamina (doc "2das mejoras")
  cobrarEstamina(m) {
    if (m.pagado) return true;
    const costo = (typeof stamCosto === "function") ? stamCosto(m.key) : 0;
    if (!stamGastar(costo)) {
      if (!this._avisoStam || nowMs() > this._avisoStam) {
        this._avisoStam = nowMs() + 4000;
        toast("Sin estamina — comé un guiso o esperá a que se recargue");
        log("Te quedaste sin estamina de combate. Se recupera sola (1 cada 3 min), comiendo guisos o con una recarga.", "bad");
      }
      return false;
    }
    m.pagado = true;
    this.floatHero("-" + costo + " estamina", "#a8d8ff");
    return true;
  }

  hitMonster(m, dmg, skill) {
    const tn = nowMs();   // MISMO reloj con el que se escriben phaseUntil/blinkUntil/stunUntil (update usa nowMs)
    if ((m.phaseUntil && tn < m.phaseUntil) || (m.blinkUntil && tn < m.blinkUntil)) { this.floatTxt(m, "Intangible", "#bfa8ff"); return; }   // Fase espectral / Parpadeo
    if (!this.cobrarEstamina(m)) return;   // se cobra DESPUÉS de intangible: un golpe que no puede pegar no gasta estamina
    if (window.sfx) sfx("hit");
    let crit = false, vamp = 0, tipoFx = null;
    if (dmg == null) {   // doc 2/8: Daño = máx(1; tirada del arma + nivel/2 − defensa efectiva) + buff del tipo
      const roll = rollWeaponHit(this.mobDef(m));
      if (!roll) return;
      if (m.def.evade && ARM_DEF[roll.id].tipo !== "arco" && Math.random() < m.def.evade) { this.floatTxt(m, "Esquivó", "#a8d8ff"); return; }   // Vuelo evasivo (solo cuerpo a cuerpo)
      dmg = roll.dmg; crit = roll.crit; vamp = roll.vamp || 0;
      tipoFx = ARM_DEF[roll.id].tipo;   // efecto visual propio de cada tipo de arma (pendiente del 10/8)
      skill = armSkillKey(tipoFx);
      if (roll.stun) { m.stunUntil = tn + 2100; this.floatTxt(m, "Aturdido", "#ffd24a"); this.stunStarsFx(m); }   // pierde su próximo golpe
      if (roll.bleed) m.bleed = { dps: roll.bleed, until: tn + 3000, next: tn + 1000 };   // sangrado 3 s
      if (ARM_DEF[roll.id].tipo !== "arco") {   // el arco gasta en shootArrow
        useWeapon(roll.id);
        if (G.weapons[roll.id].dur <= 0) { log("¡" + ARM_DEF[roll.id].label + " rota! Reparala en la Herrería.", "bad"); toast("¡Arma rota!"); }
      }
    }
    if (crit) this.floatTxt(m, "¡CRÍTICO!", "#ff9a3a");
    // EL DRAGÓN NO ES UN MOB CUALQUIERA (10/8): su vida es del CLAN y vive en Supabase.
    // Lo que le pegás acá se manda allá y se descuenta de la barra compartida; el sprite
    // local nunca muere solo. Si no hay clan o no hay asalto abierto, no le entra nada.
    if (m.def.boss) { this.pegarleAlJefe(m, dmg); return; }
    m.hp -= dmg;
    if (vamp > 0 && G.hp < G.hpMax) { G.hp = Math.min(G.hpMax, G.hp + Math.max(1, Math.round(dmg * vamp / 100))); refreshHud(); }   // Runa Vampírica
    // efecto de golpe: cada TIPO de arma pega distinto (10/8). Sin arma/skills: la chispa de siempre.
    this.weaponFx(m, tipoFx, crit);
    const bs = m.baseScale || 1, sgn = m.spr.scaleX < 0 ? -1 : 1;
    m.spr.setScale(sgn * bs * 1.18, bs * 1.18);
    this.tweens.add({ targets: m.spr, scaleX: sgn * bs, scaleY: bs, duration: 160 });
    // texto de daño flotante
    const t = this.add.text(m.cx, m.by - (m.spr.displayHeight || m.spr.height), "-" + dmg, { fontFamily: "system-ui", fontSize: "13px", fontStyle: "bold", color: skill === "range" ? "#a8d8ff" : "#ffd24a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(99999);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 550, onComplete: () => t.destroy() });
    if (m.hp <= 0) this.killMonster(m, skill || "sword"); else { this.drawBar(m); m.tgt = "hero"; this.updateTargetFx(); }
  }

  /* ---- EFECTOS POR ARMA (pendiente del 10/8) ---------------------------------
     Todo dibujado por código, sin arte nuevo. Cada tipo se lee de un vistazo:
       espada -> estela de tajo (naranja y más grande si fue crítico)
       hacha  -> cuña de hachazo + astillas que saltan
       mazo   -> onda de impacto en el piso, polvo y una mini sacudida de cámara
       arco   -> salpicadura roja (el sangrado gotea aparte, en el tic)
     Sin tipo (a puños, o daño de una habilidad): la chispa blanca de siempre. */
  weaponFx(m, tipo, crit) {
    const hy = m.by - (m.spr.displayHeight || m.spr.height) * 0.5;
    const sgn = this.hero && this.hero.x > m.cx ? -1 : 1;   // el tajo entra desde el lado del héroe
    if (tipo === "espada") {
      const col = crit ? 0xff9a3a : 0xf4f7ff, esc = crit ? 1.45 : 1;
      const g = this.add.graphics().setDepth(99999);
      g.lineStyle(crit ? 5 : 3, col, 0.95).beginPath();
      g.arc(0, 0, 20 * esc, Math.PI * 0.75, Math.PI * 1.55); g.strokePath();
      g.setPosition(m.cx, hy).setScale(sgn * 1, 1).setAngle(-15 + Math.random() * 30);
      this.tweens.add({ targets: g, angle: g.angle + sgn * 55, alpha: 0, scaleX: sgn * 1.35, scaleY: 1.35, duration: crit ? 260 : 190, onComplete: () => g.destroy() });
    } else if (tipo === "hacha") {
      const g = this.add.graphics().setDepth(99999);   // la cuña del hachazo: triángulo que baja en diagonal
      g.fillStyle(0xf4e7c8, 0.9).fillTriangle(0, 0, -6 * sgn, -24, 8 * sgn, -20);
      g.setPosition(m.cx - sgn * 8, hy - 8);
      this.tweens.add({ targets: g, y: hy + 8, x: m.cx + sgn * 6, alpha: 0, duration: 180, ease: "Quad.easeIn", onComplete: () => g.destroy() });
      for (let i = 0; i < 5; i++) {   // astillas de madera/hueso
        const sp = this.add.rectangle(m.cx, hy, 3, 2, i % 2 ? 0xb98a4e : 0x8a5a33).setDepth(99999).setAngle(Math.random() * 360);
        this.tweens.add({ targets: sp, x: m.cx + (Math.random() - 0.5) * 34, y: hy + 6 + Math.random() * 16, angle: sp.angle + 180, alpha: 0, duration: 260 + Math.random() * 140, ease: "Quad.easeIn", onComplete: () => sp.destroy() });
      }
    } else if (tipo === "mazo") {
      const ring = this.add.circle(m.cx, m.by - 2, 6).setStrokeStyle(3, 0xe8d3a8, 0.85).setDepth(99998);   // onda en el piso
      ring.scaleY = 0.45;   // aplastada: es una onda EN el suelo, no una burbuja
      this.tweens.add({ targets: ring, scaleX: 3.2, scaleY: 3.2 * 0.45, alpha: 0, duration: 300, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
      for (let i = 0; i < 6; i++) {   // polvo que levanta el mazazo
        const a = Math.PI + Math.random() * Math.PI, d = 10 + Math.random() * 14;
        const p = this.add.circle(m.cx + (Math.random() - 0.5) * 16, m.by - 2, 2 + Math.random() * 2, 0xcbb894, 0.7).setDepth(99998);
        this.tweens.add({ targets: p, x: p.x + Math.cos(a) * d * 0.4, y: p.y - 8 - Math.random() * 10, alpha: 0, duration: 320 + Math.random() * 160, onComplete: () => p.destroy() });
      }
      this.cameras.main.shake(90, 0.004);   // se SIENTE pesado
    } else if (tipo === "arco") {
      for (let i = 0; i < 5; i++) {   // salpicadura al clavarse la flecha
        const a = -Math.PI * 0.75 + Math.random() * Math.PI * 0.5, len = 8 + Math.random() * 12;
        const p = this.add.circle(m.cx, hy, 1.5 + Math.random() * 1.5, i % 2 ? 0xe05a5a : 0xb43a3a, 0.9).setDepth(99999);
        this.tweens.add({ targets: p, x: m.cx + Math.cos(a) * len, y: hy + Math.abs(Math.sin(a)) * len + 6, alpha: 0, duration: 280 + Math.random() * 140, ease: "Quad.easeIn", onComplete: () => p.destroy() });
      }
    } else {
      // chispa de golpe de siempre (detalles 338): puños o daño que no viene de un arma
      const flash = this.add.circle(m.cx, hy, 7, 0xffffff, 0.7).setDepth(99998);
      this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 190, onComplete: () => flash.destroy() });
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, len = 12 + Math.random() * 12;
        const sp = this.add.rectangle(m.cx, hy, 2, 2, i % 2 ? 0xfff3cf : 0xffc23a).setDepth(99999);
        this.tweens.add({ targets: sp, x: m.cx + Math.cos(a) * len, y: hy + Math.sin(a) * len, alpha: 0, duration: 240 + Math.random() * 120, onComplete: () => sp.destroy() });
      }
    }
  }
  // estrellitas que orbitan la cabeza del mob mientras dura el aturdido del mazo
  stunStarsFx(m) {
    const top = m.by - (m.spr.displayHeight || m.spr.height) - 4;
    for (let i = 0; i < 3; i++) {
      const s = this.add.text(m.cx, top, "★", { fontSize: "10px", color: "#ffd24a", stroke: "#20301a", strokeThickness: 2 }).setOrigin(0.5).setDepth(99999).setAlpha(0.95);
      const fase = (i / 3) * Math.PI * 2, giro = { t: 0 };
      this.tweens.add({ targets: giro, t: Math.PI * 4, duration: 2100, onUpdate: () => {
        if (!s.active) return;
        const topNow = m.by - (m.spr.displayHeight || m.spr.height) - 4;
        s.setPosition(m.cx + Math.cos(giro.t + fase) * 12, topNow + Math.sin(giro.t + fase) * 3);
      }, onComplete: () => s.destroy() });
      this.tweens.add({ targets: s, alpha: 0, delay: 1800, duration: 300 });
    }
  }


  /* ---- el Dragón del asalto: el daño va a la barra compartida del clan (10/8) ----
     Se acumula y se manda de a tandas cada 2 s: mandar una llamada por golpe sería un
     pedido de red cada 2 segundos por jugador, y el server es el plan gratis. */
  pegarleAlJefe(m, dmg) {
    this.floatTxt(m, "-" + dmg, "#ffd24a");
    this._jefeAcum = (this._jefeAcum || 0) + dmg;
    if (nowMs() - (this._jefeEnvio || 0) < 2000) return;
    this._jefeEnvio = nowMs();
    const paquete = this._jefeAcum; this._jefeAcum = 0;
    if (typeof raidPegar !== "function") return;
    raidPegar(paquete).then(r => {
      if (r && r.error) {
        if (nowMs() - (this._jefeAviso || 0) > 4000) {
          this._jefeAviso = nowMs();
          toast(/clan/i.test(r.error) ? "Necesitás un clan con un asalto abierto" : "El Dragón no está en asalto");
        }
        return;
      }
      const q = r && r.ok; if (!q) return;
      this._jefeHp = Number(q.hp); this._jefeMax = Number(q.hp_max);
      if (q.estado === "vencido") {
        this.floatTxt(m, "¡VENCIDO!", "#ffd75e");
        log("¡El clan venció al Dragón! Cobrá tu parte en la ventana de Clan.", "gold");
        toast("¡Dragón vencido! Cobrá en Clan");
        m.dead = true; m.spr.setVisible(false);
      }
    });
  }
  // barra del jefe: la del clan, no la del sprite
  dibujarBarraJefe(m) {
    if (!this._jefeMax) return;
    const pct = Math.max(0, Math.min(1, this._jefeHp / this._jefeMax));
    m._barFirma = null;
    m.bar.clear();
    const w = 60, x = m.cx - w / 2, y = m.by - (m.spr.displayHeight || m.spr.height) - 10;
    m.bar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 7);
    m.bar.fillStyle(0xb44aff, 1).fillRect(x, y, w * pct, 5);
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
  // VIENTO: mismos valores que la granja (config.js). Los árboles tienen el origen abajo,
  // así que girarlos un grado inclina la copa y deja el tronco quieto.
  tickViento() {
    if (!this.vientoArb || !this.vientoArb.length) return;
    if (!VIENTO_ON) { this.vientoArb.forEach(a => { if (a.spr.angle) a.spr.setAngle(0); }); return; }
    const seg = this.time.now / 1000;
    const w = Math.PI * 2 / Math.max(0.2, VIENTO_SEG);
    const p = Math.max(1, VIENTO_RAFAGA_CADA);
    const raf = 1 + (VIENTO_RAFAGA_MULT - 1) * Math.pow(Math.abs(Math.sin(seg * Math.PI / p)), 12);
    for (const a of this.vientoArb) a.spr.setAngle(Math.sin(seg * w + a.fase) * VIENTO_GRADOS * raf);
  }

  // barra de vida del jugador, encima del granjero (solo en la Zona Negra)
  drawHeroBar(forzar) {
    if (!this.hero) return;
    if (!this.heroBar) this.heroBar = this.add.graphics().setDepth(99993);
    // la barra SIGUE al granjero, así que se mueve cada frame; pero el relleno solo se
    // reconstruye si cambió la vida (antes eran 4 fillRect por frame para nada) — 10/8
    const firma = Math.round(G.hp) + "/" + (G.hpMax || 100) + "|" + Math.round(this.hero.x) + "," + Math.round(this.hero.y);
    if (!forzar && this._heroBarFirma === firma) return;
    this._heroBarFirma = firma;
    const w = 42, h = 5, x = this.hero.x - w / 2, y = this.hero.y - (this.hero.displayHeight || 46) - 12;
    const pct = Math.max(0, Math.min(1, G.hp / (G.hpMax || 100)));
    this.heroBar.clear();
    this.heroBar.fillStyle(0x241505, 0.85).fillRect(x - 1, y - 1, w + 2, h + 2);
    this.heroBar.fillStyle(0x3b2a12, 1).fillRect(x, y, w, h);
    this.heroBar.fillStyle(pct > 0.5 ? 0x8fd14f : (pct > 0.25 ? 0xffd24a : 0xe05a5a), 1).fillRect(x, y, w * pct, h);
  }

  // círculo de aviso en el piso (telegrafía: el jugador pierde por no reaccionar, no por azar — doc)
  telegraph(x, y, r, ms, color) {
    const c = this.add.circle(x, y, r, color || 0xff5544, 0.18).setStrokeStyle(2, color || 0xff5544, 0.85).setDepth(40);
    this.tweens.add({ targets: c, alpha: 0.4, yoyo: true, repeat: Math.max(0, Math.floor(ms / 260) - 1), duration: 260 });
    this.time.delayedCall(ms + 60, () => c.destroy());
  }

  floatHero(txt, color) {
    const t = this.add.text(this.hero.x, this.hero.y - 58, txt, { fontFamily: "system-ui", fontSize: "12px", fontStyle: "bold", color, stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(99999);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 750, onComplete: () => t.destroy() });
  }

  applyState(type, val, durS, label) {
    if (addPlayerState(type, val, durS, label)) { this.floatHero(label, type === "quemadura" ? "#ff8a4a" : (type === "veneno" ? "#8fd14f" : (type === "flaqueza" || type === "fragilidad" ? "#bfa8ff" : "#e05a5a"))); refreshHud(); }
  }

  // daño por segundo de sangrado/veneno/quemadura sobre el jugador
  tickStates() {
    if (!G.states || !G.states.length) return;
    const now = Date.now();
    for (const st of G.states) {
      if (st.until < now) continue;
      if ((st.type === "sangrado" || st.type === "veneno" || st.type === "quemadura") && now >= st.next) {
        st.next = now + 1000;
        G.hp = Math.max(0, G.hp - st.val);
        this.floatHero("-" + st.val, st.type === "quemadura" ? "#ff8a4a" : (st.type === "veneno" ? "#8fd14f" : "#e05a5a"));
        refreshHud();
        if (G.hp <= 0) { this.hurtHero(0); return; }   // dispara la derrota estándar
      }
    }
    G.states = G.states.filter(st => st.until > now);
  }

  // habilidades del bestiario (doc 2/8) — una por criatura, con telegrafía en las peligrosas
  mobAbility(m, d, t, hero) {
    switch (m.def.hab) {
      case "web":   // Araña: telaraña venenosa (ralentiza + veneno acumulable)
        if (d < 130 && t > (m.abAt || 0)) { m.abAt = t + 8000; this.applyState("ralen", 40, 3, "Telaraña"); this.applyState("veneno", 2, 4, "Veneno"); this.floatTxt(m, "Telaraña venenosa", "#8fd14f"); }
        break;
      case "enrage":   // Orco: bajo 40% de vida, +30% de daño (1 vez)
        if (!m.enraged && m.hp < m.def.hp * 0.4) { m.enraged = true; m.dmgMult = 1.3; if (m.spr.setTint) m.spr.setTint(0xffb0a0); this.floatTxt(m, "¡Enfurecido!", "#ff5544"); }
        break;
      case "regen":   // Trol: +2% de su vida por segundo
        if (!m.dead && m.hp < m.def.hp && t > (m.abAt || 0)) { m.abAt = t + 1000; m.hp = Math.min(m.def.hp, m.hp + m.def.hp * 0.02); this.drawBar(m); }
        break;
      case "howl":   // Hombre Lobo: aullido (-25% daño del jugador)
        if (d < 170 && t > (m.abAt || 0)) { m.abAt = t + 12000; this.applyState("flaqueza", 25, 5, "Maldición de Flaqueza"); this.floatTxt(m, "Aullido aterrador", "#bfa8ff"); }
        break;
      case "golem":   // Golem: Caparazón (+60% def propia) y Pisotón en área
        if (t > (m.shellAt || 0)) { m.shellAt = t + 12000; m.shellUntil = t + 5000; this.floatTxt(m, "Caparazón", "#a8d8ff"); if (m.spr.setTint) { m.spr.setTint(0xb8ccd8); this.time.delayedCall(5000, () => { if (m.spr.clearTint && !m.enraged) m.spr.clearTint(); }); } }
        if (d < 80 && t > (m.stompAt || 0)) {
          m.stompAt = t + 9000; this.telegraph(m.cx, m.by, 85, 500, 0xd8b04a);
          this.time.delayedCall(500, () => { if (!m.dead && !this.leaving && Math.hypot(this.hero.x - m.cx, this.hero.y - m.by) < 85) { this.hurtHero(8); this.floatTxt(m, "Pisotón", "#d8b04a"); } });
        }
        break;
      case "charge":   // Ogro: embestida telegrafiada (x2 daño + sangrado fuerte)
        if (m.chargeAt && t >= m.chargeAt) {
          m.chargeAt = 0; if (m.spr.clearTint) m.spr.clearTint();
          if (d < 95) { this.hurtHero(m.def.dmg * 2); this.applyState("sangrado", 5, 4, "Sangrado"); this.floatTxt(m, "¡Embestida!", "#ff5544"); }
        } else if (!m.chargeAt && d > 60 && d < 220 && t > (m.abAt || 0)) {
          m.abAt = t + 10000; m.chargeAt = t + 600;
          if (m.spr.setTint) m.spr.setTint(0xffaa66);
          this.telegraph(hero.x, hero.y, 48, 600, 0xff5544);
        }
        break;
      case "phase":   // Espectro: fase espectral (intangible 1,5 s)
        if (d < 120 && t > (m.abAt || 0)) { m.abAt = t + 9000; m.phaseUntil = t + 1500; m.spr.setAlpha(0.35); this.time.delayedCall(1500, () => { if (!m.dead) m.spr.setAlpha(1); }); this.floatTxt(m, "Fase espectral", "#bfa8ff"); }
        break;
      case "demon": {   // Demonio Menor: llamarada (área + quemadura) y maldición (-def)
        if (d < 120 && t > (m.flameAt || 0)) {
          m.flameAt = t + 8000; this.telegraph(hero.x, hero.y, 55, 450, 0xff8a4a);
          this.time.delayedCall(450, () => { if (!m.dead && !this.leaving && Math.hypot(this.hero.x - m.cx, this.hero.y - m.by) < 150) { this.hurtHero(20); this.applyState("quemadura", 4, 4, "Quemadura"); this.floatTxt(m, "Llamarada", "#ff8a4a"); } });
        }
        if (d < 200 && t > (m.curseAt || 0)) { m.curseAt = t + 12000; this.applyState("fragilidad", 20, 5, "Maldición de Fragilidad"); }
        break;
      }
      case "dragon": {   // JEFE: kit por fases (doc)
        const cdm = m.enraged ? 0.7 : 1;
        if (!m.enraged && m.hp < m.def.hp * 0.25) { m.enraged = true; m.dmgMult = 1.25; if (m.spr.setTint) m.spr.setTint(0xff9a7a); this.floatTxt(m, "¡ENFURECIDO!", "#ff5544"); }
        if (m.blinkUntil && t < m.blinkUntil) return;   // ausente
        if (d < 320 && t > (m.blinkAt || 0)) {   // Parpadeo Sombrío: desaparece 1 s y cae en área
          m.blinkAt = t + 14000 * cdm;
          const zx = hero.x, zy = hero.y;
          m.blinkUntil = t + 1000; m.spr.setVisible(false); m.bar.clear();
          this.telegraph(zx, zy, 75, 1000, 0xb44aff);
          this.time.delayedCall(1000, () => {
            if (m.dead || this.leaving) return;
            m.cx = zx; m.by = zy; m.spr.setPosition(zx, zy).setVisible(true).setDepth(zy);
            if (Math.hypot(this.hero.x - zx, this.hero.y - zy) < 75) this.hurtHero(45);
            this.floatTxt(m, "Parpadeo Sombrío", "#b44aff"); this.drawBar(m);
          });
          return;
        }
        if (d < 140 && t > (m.breathAt || 0)) {   // Aliento de Fuego
          m.breathAt = t + 8000 * cdm; this.telegraph(hero.x, hero.y, 60, 450, 0xff8a4a);
          this.time.delayedCall(450, () => { if (!m.dead && !this.leaving && Math.hypot(this.hero.x - m.cx, this.hero.y - m.by) < 170) { this.hurtHero(30); this.applyState("quemadura", 6, 5, "Quemadura"); this.floatTxt(m, "Aliento de Fuego", "#ff8a4a"); } });
          return;
        }
        if (d < 420 && t > (m.roarAt || 0)) { m.roarAt = t + 18000 * cdm; this.applyState("flaqueza", 20, 6, "Maldición de Flaqueza"); this.floatTxt(m, "Rugido del Núcleo", "#ffd24a"); return; }
        if (d < 70 && t > (m.tailAt || 0)) {   // Cola barredora con empuje
          m.tailAt = t + 10000 * cdm; this.hurtHero(28);
          const dx = this.hero.x - m.cx, dy = this.hero.y - m.by, dd = Math.hypot(dx, dy) || 1;
          this.hero.x += dx / dd * 60; this.hero.y += dy / dd * 60;
          this.floatTxt(m, "Cola barredora", "#ffd24a");
        }
        break;
      }
    }
  }

  floatTxt(m, txt, color) {
    const t = this.add.text(m.cx, m.by - (m.spr.displayHeight || m.spr.height) - 6, txt,
      { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color, stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(99999);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  killMonster(m, skill) {
    m.dead = true; m.bar.clear();
    if (m.def.hab === "split") {   // División: al morir se parte en 2 (doc)
      for (let i = 0; i < 2; i++) {
        const b = this.spawnMonster("babita", 0, 0);
        b.cx = m.cx + (i ? 26 : -26); b.by = m.by + 6; b.home = { x: b.cx, y: b.by };
        b.spr.setPosition(b.cx, b.by).setDepth(b.by); b.tgt = "hero"; this.drawBar(b);
      }
      this.floatTxt(m, "¡Se divide!", "#8fd14f");
    }
    addXp(skill || "sword", Math.round(m.def.xp * combatXpMult()));
    addCombatXp(m.def.xp);                                   // barra de Combate global (doc maestro)
    if (typeof tutoEvent === "function") { tutoEvent("kill"); tutoEvent("kill5"); }
    if (typeof statAdd === "function") statAdd("matar", m.key);
    this.floatTxt(m, "+" + m.def.xp + " XP", "#ffd75e");     // feedback por kill hacia la barra
    // armaduras: chance de drop (se autoequipan si mejoran)
    const drops = [];
    if (m.def.gearLoot) for (const [gk, ch] of m.def.gearLoot) { if (Math.random() < ch) drops.push({ k: gk, n: 1, kind: "gear" }); }
    if (this.target === m) this.clearTarget();
    const loot = rollLoot(m.def);
    Object.keys(loot).forEach(k => drops.push({ k, n: loot[k], kind: "res" }));
    if ((m.def.lvl || 0) >= 8 && Math.random() < 0.30) drops.push({ k: "esencia_runica", n: 1, kind: "res" });   // Altar: drop de mobs Nv 8+
    // ESENCIA OSCURA (10/8): el recurso que SOLO sale acá abajo. Cae más cuanto más hondo, y
    // el jefe suelta un puñado. No se compra, no se cultiva y no lo dan los animales.
    if (typeof rollEsencia === "function") {
      const eo = rollEsencia(this.zonaKey, !!m.def.boss);
      if (eo > 0) drops.push({ k: "esencia_oscura", n: eo, kind: "res" });
    }
    { const dg = eqRunaVal("dorada"); if (dg && Math.random() * 100 < dg) { G.golden += 1; this.floatTxt(m, "+1 $Golden", "#ffe08a"); } }   // Runa Dorada
    const parts = drops.map(d => d.kind === "gear" ? ((GEAR_DEF[d.k] && GEAR_DEF[d.k].label) || d.k)
      : "+" + d.n + " " + (d.k === "plata" ? "plata" : (RES_LABEL[d.k] || d.k)));
    this.dropLoot(m, drops);   // todo el botín cae al piso, armaduras incluidas (detalles 338)
    log("Venciste a " + m.def.label + (parts.length ? ". Soltó: " + parts.join(" · ") : ". No soltó nada."), "gold");
    toast(m.def.label + " derrotado" + (parts.length ? ": " + parts.join(" · ") : ""));
    refreshHud();
    this.tweens.add({ targets: m.spr, alpha: 0, y: m.by - 12, duration: 400, onComplete: () => m.spr.setVisible(false) });
    // las que no reaparecen (babitas) se sacan de la lista y se destruyen: si no, se acumulan sin techo
    if (m.def.noRespawn) {
      this.time.delayedCall(450, () => {
        const i = this.monsters.indexOf(m);
        if (i >= 0) this.monsters.splice(i, 1);
        if (m.spr) m.spr.destroy();
        if (m.bar) m.bar.destroy();
      });
      return;
    }
    // reaparece en su zona tras 25-40s (el jefe tarda 3 min)
    this.time.delayedCall((m.def.boss ? 180000 : 25000) + Math.random() * 15000, () => {
      if (!this.scene || !this.scene.isActive()) return;
      m.hp = m.def.hp; m.dead = false; m.pagado = false; m.cx = m.home.x; m.by = m.home.y;
      m.spr.setPosition(m.cx, m.by).setAlpha(1).setVisible(true).setDepth(m.by); m.tgt = null;
      // reaparece LIMPIO: si no, el Orco/Dragón volvía con la furia puesta para siempre y el Espectro intangible
      m.enraged = false; m.dmgMult = 1; m.bleed = null;
      m.shellUntil = 0; m.phaseUntil = 0; m.blinkUntil = 0; m.stunUntil = 0;
      m.abAt = 0; m.shellAt = 0; m.stompAt = 0; m.chargeAt = 0; m.flameAt = 0; m.curseAt = 0;
      m.blinkAt = 0; m.breathAt = 0; m.roarAt = 0; m.tailAt = 0; m.nextHit = 0;
      if (m.spr.clearTint) m.spr.clearTint();
      m.spr.setAlpha(1);
      if (m.baseScale) m.spr.setScale(m.baseScale);
      if (m.def.sprite) { m.anim = null; m.atkUntil = 0; this.playMob(m, "idle"); }
      m._barFirma = null;   // el mob revivió: la barra se rehace
      this.drawBar(m);
    });
  }

  hurtHero(dmg) {
    // set de Fibra completo: % de evasión (el golpe pasa de largo)
    if (typeof evadeChance === "function" && Math.random() < evadeChance()) { this.floatHero("Esquivaste", "#a8d8ff"); return; }
    dmg = Math.max(1, Math.round((dmg - gearDefTotal() * (1 - playerDefLossMult())) * dmgTakenMult()));   // armadura (menos Fragilidad) + buff de comida
    G.hp = Math.max(0, G.hp - dmg);
    this.hurtFx = 0.18;
    if (dmg > 0) this.floatHero("-" + dmg, "#ff5544");   // el golpe del mob se ve (pedido del diseñador)
    this.drawHeroBar();
    refreshHud();
    if (G.hp <= 0) {
      log("Te derrotaron en la Zona Negra. Despertás en la granja.", "bad");
      toast("Te llevaron de vuelta a la granja");
      G.hp = Math.ceil(G.hpMax / 2);
      if (typeof zonaSalir === "function" && typeof mostrarResumenZona === "function") mostrarResumenZona(zonaSalir(true));
      if (typeof saveFarm === "function") saveFarm(true);
      this.leaving = true;
      irAEscena(this, "farm");
    }
  }

  update(time, deltaMs) {
    if (this.leaving || !this.hero) return;   // cambiando de escena: no tocar nada más
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero, t = nowMs();

    // detalles viernes (1): la vida SOLO se regenera con comida (sin regeneración pasiva)

    // tinte de daño
    if (this.hurtFx > 0) { this.hurtFx -= dt; hero.setTint(0xff6b5a); } else hero.clearTint();
    this.drawHeroBar();   // la barra de vida sigue al granjero
    if (this.zonaKey === "guarida" && this._jefeMax) {
      const jefe = this.monsters.find(m => m.def && m.def.boss && !m.dead);
      if (jefe) this.dibujarBarraJefe(jefe);
    }
    this.seguirAura();
    this.tickViento();    // mismo viento que en la granja

    // objetivo fijado: recuadro + nombre/vida, y auto-ataque cada 2s
    if (this.target && this.target.dead) this.clearTarget();
    this.updateTargetFx();
    this.autoAttack(t);
    if (t > (this._stAt || 0)) { this._stAt = t + 300; this.tickStates(); }
    this.tryPickup(hero.x, hero.y, 24);   // recoger el loot del piso al pasar por encima
    if (this.hold && this.hold.active && this.holdPend && t - (this.holdAt || 0) > 130) { const hp = this.holdPend; this.holdPend = null; this.holdSeek(hp.x, hp.y); }
    if (!this.moveTarget && this.destMk && this.destMk.visible) this.hideDest();

    // acción de ataque (cuerpo a cuerpo o disparo)
    if (this.action) {
      this.action.t += dt;
      const sign = this.facing === "west" ? -1 : 1;
      hero.setScale(sign * this.actScale, this.actScale);
      // el golpe usa la ANIMACIÓN del arma equipada: espadazo con estela o disparo de arco (PixelLab 30/7)
      if (!this.action.fx) {
        // si está caminando al momento del golpe, usa el espadazo CAMINANDO (piernas en marcha, 31/7)
        const movingNow = !!(this.moveTarget || k.left.isDown || k.right.isDown || k.up.isDown || k.down.isDown || k.aleft.isDown || k.aright.isDown || k.aup.isDown || k.adown.isDown);
        const swordKey = (movingNow && this.anims.exists("act_sword_walk")) ? "act_sword_walk" : "act_sword";
        const aid0 = armaEq(); const akey = this.action.kind === "shoot" ? "act_bow" : ((aid0 && ARM_DEF[aid0].tipo !== "arco") ? swordKey : null);   // espada/hacha/mazo usan el espadazo
        if (akey && this.anims.exists(akey)) { hero.play(akey); this.action.fx = true; }
        else {
          // respaldo (a puños o sin animación): el arma dibujada a mano como antes
          if (hero.anims.currentAnim?.key !== "idle") hero.play("idle");
          const wkey = aid0 ? (ARM_DEF[aid0].sprite || ARM_TIPO_DEF[ARM_DEF[aid0].tipo].sprite) : (this.action.kind === "shoot" ? "bow" : null);
          if (wkey && this.textures.exists(wkey)) {
            const fx = this.add.image(hero.x + sign * 18, hero.y - 26, wkey).setDisplaySize(26, 26).setOrigin(0.5, 0.85).setDepth(hero.y + 1);
            this.action.fx = fx;
            if (this.action.kind === "shoot") { fx.setFlipX(sign < 0); this.time.delayedCall(this.action.dur * 1000, () => fx.destroy()); }
            else { fx.setAngle(sign * -70); this.tweens.add({ targets: fx, angle: sign * 75, duration: Math.min(280, this.action.dur * 1000), onComplete: () => fx.destroy() }); }
          } else this.action.fx = true;
        }
      }
      if (this.action.t >= this.action.dur) {
        const a = this.action; this.action = null;
        if (a.kind === "shoot") { if (a.m && !a.m.dead) this.shootArrow(a.m); }
        else if (a.m && !a.m.dead && Math.hypot(a.m.cx - hero.x, a.m.by - hero.y) <= MELEE_RANGE + 8) this.hitMonster(a.m);
      }
      // detalles viernes: el ataque NO bloquea el movimiento — se puede caminar mientras (sigue abajo)
    }

    // movimiento
    let vx = 0, vy = 0;
    if (!GF.uiOpen) {
      if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
      if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
      if (vx || vy) { this.moveTarget = null; this.path = null; }
      else if (this.moveTarget) {
        const dx = this.moveTarget.x - hero.x, dy = this.moveTarget.y - hero.y, d = Math.hypot(dx, dy);
        if (d < 5) {
          this.moveTarget = (this.path && this.path.length) ? this.path.shift() : null;
          if (this.moveTarget) { const dx2 = this.moveTarget.x - hero.x, dy2 = this.moveTarget.y - hero.y, d2 = Math.hypot(dx2, dy2) || 1; vx = dx2 / d2; vy = dy2 / d2; }
        } else { vx = dx / d; vy = dy / d; }
      }
    }
    const moving = !!(vx || vy);
    if (moving) {
      const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      const step = GF.SPEED * ZONA_NEGRA_VEL * speedMult() * playerSlowMult() * dt, nx = hero.x + vx * step, ny = hero.y + vy * step;   // detallitos: más lento en la Zona Negra
      let moved = false;
      if (!this.blockedAt(nx, ny, 6)) { hero.x = nx; hero.y = ny; moved = true; }
      else { if (vx && !this.blockedAt(nx, hero.y, 6)) { hero.x = nx; moved = true; } if (vy && !this.blockedAt(hero.x, ny, 6)) { hero.y = ny; moved = true; } }
      if (!moved) {
        const base = Math.atan2(vy, vx);
        for (const off of [0.5, -0.5, 1.0, -1.0, 1.571, -1.571, 2.1, -2.1]) {
          const a = base + off, sx = hero.x + Math.cos(a) * step, sy = hero.y + Math.sin(a) * step;
          if (!this.blockedAt(sx, sy, 6)) { hero.x = sx; hero.y = sy; moved = true; break; }
        }
      }
      if (moved) this.pathStuck = 0;
      else if (this.moveTarget) {
        this.pathStuck = (this.pathStuck || 0) + 1;
        const dest = (this.path && this.path.length) ? this.path[this.path.length - 1] : this.moveTarget;
        this.navOf().invalidate();
        if (this.pathStuck > 2 || !this.goTo(dest.x, dest.y, true)) { this.moveTarget = null; this.path = null; this.pathStuck = 0; }
      }
      if (vx < 0) this.facing = "west"; else if (vx > 0) this.facing = "east";
    }

    // entrar al mapa siguiente por la derecha (10/8)
    if (this.salidaDer && hero.x > this.W - 44) {
      if (!zonaPuedeEntrar(this.salidaDer)) {
        if (nowMs() - (this._avisoNivel || 0) > 2500) {
          this._avisoNivel = nowMs();
          toast("Necesitás Combate nivel " + ZONA_DEF[this.salidaDer].lvl + " para entrar a " + ZONA_DEF[this.salidaDer].label);
        }
        hero.x = this.W - 46;
      } else {
        GF.zona = this.salidaDer;
        if (typeof saveFarm === "function") saveFarm();
        this.leaving = true;
        irAEscena(this, "forest"); return;
      }
    }

    // salir por la izquierda: al mapa anterior, o a la granja si estás en el primero
    if (hero.x < 40 && this.salidaIzq) {
      GF.zona = this.salidaIzq;
      if (typeof saveFarm === "function") saveFarm();
      this.leaving = true;
      irAEscena(this, "forest"); return;
    }
    if (hero.x < 40) {
      const left = (GF.forestDrops || []).length;
      if (left) { log("Dejaste " + left + " objeto(s) en el suelo de la Zona Negra — siguen ahí si volvés.", "bad"); toast("Dejaste " + left + " objeto(s) en el suelo"); }
      if (typeof zonaSalir === "function" && typeof mostrarResumenZona === "function") mostrarResumenZona(zonaSalir(false));
      if (typeof saveFarm === "function") saveFarm();
      this.leaving = true;
      irAEscena(this, "farm"); return;
    }

    // detalles viernes (1): el clic izquierdo SOLO acerca y fija — el ataque es únicamente con clic derecho (auto cada 2s)

    const sign = this.facing === "west" ? -1 : 1;
    if (!this.action) {   // durante un golpe manda la animación de ataque (se combina con el desplazamiento)
      hero.setScale(sign * this.idleScale, this.idleScale);
      if (moving) { if (hero.anims.currentAnim?.key !== "walk") hero.play("walk"); }
      else { if (hero.anims.currentAnim?.key !== "idle") hero.play("idle"); }
    }
    hero.setDepth(hero.y);

    this.updateMonsters(dt, t);
    this.updatePrompt();
  }

  updateMonsters(dt, t) {
    const hero = this.hero;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const px0 = m.cx;   // para saber hacia dónde se movió este frame
      const dHero = Math.hypot(hero.x - m.cx, hero.y - m.by);
      const aggro = m.hp < m.def.hp || dHero < 110;   // te vio o lo golpeaste
      let moved = false;
      const stopD = m.def.range ? Math.max(36, m.def.range - 40) : 36;   // el arquero pelea a distancia
      if (aggro && dHero > stopD) {
        const dx = hero.x - m.cx, dy = hero.y - m.by, d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(m.def.spd * dt, d - stopD);   // viernes (2): frena al borde de tu celda, nunca la pisa
        m.cx += dx / d * sp; m.by += dy / d * sp; moved = true;
      } else if (aggro && dHero < 28) {
        // quedó encima (spawn/empuje): se corre hacia atrás hasta dejar tu celda
        const dx = m.cx - hero.x, dy = m.by - hero.y, d = Math.hypot(dx, dy) || 1;
        const sp = m.def.spd * 0.8 * dt;
        m.cx += dx / d * sp; m.by += dy / d * sp; moved = true;
      } else if (!aggro) {
        // deambular cerca de casa
        if (t > (m.wanderAt || 0)) { m.wanderAt = t + 2500 + Math.random() * 3000; m.wtgt = { x: m.home.x + (Math.random() - 0.5) * 120, y: m.home.y + (Math.random() - 0.5) * 90 }; }
        if (m.wtgt) { const dx = m.wtgt.x - m.cx, dy = m.wtgt.y - m.by, d = Math.hypot(dx, dy); if (d > 3) { const sp = m.def.spd * 0.35 * dt; m.cx += dx / d * sp; m.by += dy / d * sp; moved = true; } }
      }
      // sangrado del arco (doc 2/8): tic por segundo mientras dure
      if (m.bleed && t < m.bleed.until) {
        if (t >= m.bleed.next) {
          m.bleed.next = t + 1000; m.hp -= m.bleed.dps; this.floatTxt(m, "-" + m.bleed.dps, "#e05a5a"); this.drawBar(m);
          // gotitas del sangrado (efectos por arma 10/8): caen del cuerpo en cada tic
          for (let gi = 0; gi < 3; gi++) {
            const gx = m.cx + (Math.random() - 0.5) * 14, gy = m.by - (m.spr.displayHeight || m.spr.height) * (0.3 + Math.random() * 0.4);
            const gota = this.add.circle(gx, gy, 1.5, 0xb43a3a, 0.9).setDepth(99999);
            this.tweens.add({ targets: gota, y: gy + 10 + Math.random() * 8, alpha: 0, duration: 380 + Math.random() * 160, ease: "Quad.easeIn", onComplete: () => gota.destroy() });
          }
          if (m.hp <= 0) { this.killMonster(m, "range"); continue; }
        }
      } else if (m.bleed) m.bleed = null;
      // ataque al héroe (aturdido por el mazo = pierde el golpe) + habilidades del bestiario
      if (m.stunUntil && t < m.stunUntil) { /* aturdido */ }
      else {
        this.mobAbility(m, dHero, t, hero);
        if (this.leaving) return;
        const atkRange = (m.def.range || 40);
        if (dHero < atkRange && t > m.nextHit && !(m.blinkUntil && t < m.blinkUntil)) {
          m.nextHit = t + 2000; m.face = hero.x < m.cx ? -1 : 1;   // detalles viernes (1): los mobs atacan cada 2 segundos
          this.hurtHero(Math.round(m.def.dmg * (m.dmgMult || 1)));
          if (m.def.hab === "bleedhit" && Math.random() < 0.4) this.applyState("sangrado", 3, 3, "Sangrado");   // Corte sucio
          if (m.def.hab === "phase") this.applyState("ralen", 30, 3, "Ralentización");                          // toque espectral
          if (m.def.hab === "curseArrow" && t > (m.abAt || 0)) { m.abAt = t + 10000; this.applyState("fragilidad", 25, 6, "Maldición de Fragilidad"); this.floatTxt(m, "Flecha maldita", "#bfa8ff"); }
          if (m.def.sprite) { this.playMob(m, "atk", true); m.atkUntil = t + 600; }
          if (this.leaving) return;
        }
      }
      m.spr.setPosition(m.cx, m.by).setDepth(m.by);
      // MISMA lógica que el granjero: mira según hacia dónde CAMINA, no según dónde estés vos.
      // El arte va al sureste; si se mueve hacia la izquierda (o arriba/abajo-izquierda) se espeja.
      const mdx = m.cx - px0;
      if (Math.abs(mdx) > 0.05) m.face = mdx < 0 ? -1 : 1;
      if (!m.face) m.face = 1;
      const bs = m.baseScale || 1;
      m.spr.setScale(m.face * bs, bs);
      if (m.def.sprite && t > (m.atkUntil || 0)) this.playMob(m, moved ? "walk" : "idle");
      this.drawBar(m);
    }
    // barra de Combate "viva": pulso del relleno mientras algún mob te está peleando (doc)
    if (t > (this._cbarAt || 0)) {
      this._cbarAt = t + 400;
      const cb = document.getElementById("cbar");
      if (cb) cb.classList.toggle("fight", this.monsters.some(mm => !mm.dead && mm.tgt === "hero"));
    }
  }

  updatePrompt() {
    const el = $("prompt"); if (!el) return;
    if (GF.uiOpen || this.action) { el.classList.remove("show"); return; }
    const m = this.nearestMonster(60);
    const far = !m && canShoot() ? this.nearestMonster(190) : null;
    if (m) { el.textContent = "Atacar " + m.def.label + " (" + Math.ceil(m.hp) + " de vida) · [E]"; el.classList.add("show"); }
    else if (far) { el.textContent = "Disparar a " + far.def.label + " (" + (G.res.flecha || 0) + ") · [E]"; el.classList.add("show"); }
    else if (this.hero.x < 90) { el.textContent = "Volver a la granja"; el.classList.add("show"); }
    else el.classList.remove("show");
  }
}
