/* ForestScene: el Bosque (Fase D — combate). Entrás desde el borde derecho de la granja.
   Cuanto más a la derecha te metés, más fuertes los monstruos. Si te matan, despertás en la granja. */
class ForestScene extends Phaser.Scene {
  constructor() { super("forest"); }

  create() {
    const T = GF.TILE;
    this.W = 32 * T; this.H = GF.WORLD_H;   // bosque más ancho que la granja
    GF.uiOpen = false;

    // piso del bosque: damero de verdes OSCUROS (como la granja pero sombrío) + decoraciones
    const g = this.add.graphics().setDepth(-1000);
    const cols = Math.ceil(this.W / T), rows = Math.ceil(this.H / T);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      g.fillStyle((cx + cy) % 2 === 0 ? 0x2f4a20 : 0x2a431c, 1);
      g.fillRect(cx * T, cy * T, T, T);
    }
    // matas y piedritas deterministas (LCG) para que no se vea plano
    let seed = 20260731;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 260; i++) {
      const x = rnd() * this.W, y = rnd() * this.H, t = rnd();
      if (t < 0.5) { g.fillStyle(0x223a16, 0.8); g.fillRect(x, y, 2, 4); g.fillRect(x + 3, y + 1, 2, 3); }        // mata oscura
      else if (t < 0.8) { g.fillStyle(0x3a5527, 0.7); g.fillRect(x, y, 3, 2); }                                   // hierba
      else { g.fillStyle(0x4a4438, 0.6); g.fillRect(x, y, 3, 3); }                                                // piedrita
    }
    g.lineStyle(4, 0x22331a, 0.95).strokeRect(0, 0, this.W, this.H);

    // árboles decorativos (más densos a la derecha)
    this.treeCols = [];
    for (let i = 0; i < 46; i++) {
      const x = 60 + Math.random() * (this.W - 120), y = 60 + Math.random() * (this.H - 90);
      if (x < 150 && y > this.H / 2 - 80 && y < this.H / 2 + 80) continue;   // entrada despejada
      const s = this.add.image(x, y, "tree").setOrigin(0.5, 1);
      s.setScale((T * 2) / s.width).setDepth(y).setAlpha(0.96);
      this.treeCols.push({ cx: x, by: y, hw: T * 2 * 0.17, dep: T * 0.32 });   // solo el tronco estorba
    }

    // salida (izquierda): volver a la granja
    this.add.text(26, this.H / 2, "", { fontSize: "26px" }).setOrigin(0.5).setDepth(5);
    this.add.text(26, this.H / 2 + 26, "Granja", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5).setDepth(5);

    // monstruos: tier según profundidad (x)
    this.monsters = [];
    const zones = [
      ["rata", 0.08, 0.30, 3], ["larva", 0.25, 0.45, 3], ["orco", 0.42, 0.62, 3],
      ["lancero", 0.58, 0.75, 2], ["guerrero", 0.72, 0.88, 2], ["troll", 0.86, 0.97, 1],
    ];
    zones.forEach(([key, x0, x1, n]) => { for (let i = 0; i < n; i++) this.spawnMonster(key, x0, x1); });

    // héroe
    const hero = this.add.sprite(90, this.H / 2, "hero_idle_0").setOrigin(0.5, 1);
    this.idleScale = GF.SIZE.hero / hero.height;
    this.actScale = this.idleScale;   // granjero definitivo: misma escala de cuerpo en quieto y acciones
    hero.setScale(this.idleScale); hero.play("idle");
    this.hero = hero; this.facing = "east"; this.moveTarget = null; this.action = null; this.hurtFx = 0;
    // igual que en la granja: al reiniciar la escena hay que soltar lo cacheado
    this.tgGlow = null; this.tgGlowTw = null; this.tgTxt = null; this.destMk = null;
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
      if (hit) {
        if (swordDmg() <= 0) { toast("Necesitás un arma equipada para atacar"); return; }   // mismo aviso que el clic derecho (1/8)
        const now = this.time.now;
        const d = Math.hypot(hit.cx - this.hero.x, hit.by - this.hero.y);
        if (d <= MELEE_RANGE && !this.action && now >= this.nextAuto) {
          this.facing = (hit.cx < this.hero.x) ? "west" : "east";
          this.action = { kind: "attack", m: hit, t: 0, dur: 0.45 };
          this.nextAuto = now + ATTACK_MS;   // misma cadencia que el auto-ataque (sin spam de clics)
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
    m.bar.clear();
    if (m.dead || m.hp >= m.def.hp) return;
    const w = 30, x = m.cx - w / 2, y = m.by - (m.spr.displayHeight || m.spr.height) - 8;
    m.bar.fillStyle(0x000000, 0.55).fillRect(x - 1, y - 1, w + 2, 5);
    m.bar.fillStyle(m.hp / m.def.hp > 0.4 ? 0x7ec95a : 0xd9534f, 1).fillRect(x, y, w * (m.hp / m.def.hp), 3);
  }

  /* ---- objetivo fijado: el monstruo se ACLARA (igual que los recursos de la granja)
         + nombre y vida encima (detalles 338) ---- */
  setTarget(m) {
    this.target = m; this.nextAuto = 0;   // golpea en el próximo tick
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
      if (!ok) { toast("Bolsa llena"); continue; }
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
      this.action = { kind: "attack", m, t: 0, dur: 0.45 }; this.nextAuto = t + ATTACK_MS;
    } else if (canShoot() && d <= BOW_RANGE) {
      this.facing = (m.cx < this.hero.x) ? "west" : "east";
      this.action = { kind: "shoot", m, t: 0, dur: 0.35 }; this.nextAuto = t + ATTACK_MS;
    }
  }

  // disparo: proyectil que viaja hasta el monstruo y pega al llegar
  shootArrow(m) {
    if (!canShoot()) { toast("Sin flechas — crafteá en la Herrería"); return; }
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

  hitMonster(m, dmg, skill) {
    if (window.sfx) sfx("hit");
    let crit = false;
    if (dmg == null) {   // doc 2/8: Daño = máx(1; tirada del arma + nivel/2 − defensa efectiva) + buff del tipo
      const roll = rollWeaponHit(m.def.def || 0);
      if (!roll) return;
      dmg = roll.dmg; crit = roll.crit;
      skill = armSkillKey(ARM_DEF[roll.id].tipo);
      if (roll.stun) { m.stunUntil = this.time.now + 2100; this.floatTxt(m, "Aturdido", "#ffd24a"); }   // pierde su próximo golpe
      if (roll.bleed) m.bleed = { dps: roll.bleed, until: this.time.now + 3000, next: this.time.now + 1000 };   // sangrado 3 s
      if (ARM_DEF[roll.id].tipo !== "arco") {   // el arco gasta en shootArrow
        useWeapon(roll.id);
        if (G.weapons[roll.id].dur <= 0) { log("¡" + ARM_DEF[roll.id].label + " rota! Reparala en la Herrería.", "bad"); toast("¡Arma rota!"); }
      }
    }
    if (crit) this.floatTxt(m, "¡CRÍTICO!", "#ff9a3a");
    m.hp -= dmg;
    // chispa de golpe (detalles 338)
    const hy = m.by - (m.spr.displayHeight || m.spr.height) * 0.5;
    const flash = this.add.circle(m.cx, hy, 7, 0xffffff, 0.7).setDepth(99998);
    this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 190, onComplete: () => flash.destroy() });
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, len = 12 + Math.random() * 12;
      const sp = this.add.rectangle(m.cx, hy, 2, 2, i % 2 ? 0xfff3cf : 0xffc23a).setDepth(99999);
      this.tweens.add({ targets: sp, x: m.cx + Math.cos(a) * len, y: hy + Math.sin(a) * len, alpha: 0, duration: 240 + Math.random() * 120, onComplete: () => sp.destroy() });
    }
    const bs = m.baseScale || 1, sgn = m.spr.scaleX < 0 ? -1 : 1;
    m.spr.setScale(sgn * bs * 1.18, bs * 1.18);
    this.tweens.add({ targets: m.spr, scaleX: sgn * bs, scaleY: bs, duration: 160 });
    // texto de daño flotante
    const t = this.add.text(m.cx, m.by - (m.spr.displayHeight || m.spr.height), "-" + dmg, { fontFamily: "system-ui", fontSize: "13px", fontStyle: "bold", color: skill === "range" ? "#a8d8ff" : "#ffd24a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(99999);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 550, onComplete: () => t.destroy() });
    if (m.hp <= 0) this.killMonster(m, skill || "sword"); else { this.drawBar(m); m.tgt = "hero"; this.updateTargetFx(); }
  }

  floatTxt(m, txt, color) {
    const t = this.add.text(m.cx, m.by - (m.spr.displayHeight || m.spr.height) - 6, txt,
      { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color, stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(99999);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  killMonster(m, skill) {
    m.dead = true; m.bar.clear();
    addXp(skill || "sword", m.def.xp);
    addCombatXp(m.def.xp);                                   // barra de Combate global (doc maestro)
    this.floatTxt(m, "+" + m.def.xp + " XP", "#ffd75e");     // feedback por kill hacia la barra
    // armaduras: chance de drop (se autoequipan si mejoran)
    const drops = [];
    if (m.def.gearLoot) for (const [gk, ch] of m.def.gearLoot) { if (Math.random() < ch) drops.push({ k: gk, n: 1, kind: "gear" }); }
    if (this.target === m) this.clearTarget();
    const loot = rollLoot(m.def);
    Object.keys(loot).forEach(k => drops.push({ k, n: loot[k], kind: "res" }));
    const parts = drops.map(d => d.kind === "gear" ? "" + ((GEAR_DEF[d.k] && GEAR_DEF[d.k].label) || d.k) : "+" + d.n + " " + (d.k === "plata" ? "" : (RES_EMOJI[d.k] || "")));
    this.dropLoot(m, drops);   // todo el botín cae al piso, armaduras incluidas (detalles 338)
    log("Venciste a " + m.def.label + (parts.length ? ". Soltó: " + parts.join(" · ") : ". No soltó nada."), "gold");
    toast("" + m.def.label + " " + (parts.length ? " " + parts.join(" ") : ""));
    refreshHud();
    this.tweens.add({ targets: m.spr, alpha: 0, y: m.by - 12, duration: 400, onComplete: () => m.spr.setVisible(false) });
    // reaparece en su zona tras 25-40s
    this.time.delayedCall(25000 + Math.random() * 15000, () => {
      if (!this.scene || !this.scene.isActive()) return;
      m.hp = m.def.hp; m.dead = false; m.cx = m.home.x; m.by = m.home.y;
      m.spr.setPosition(m.cx, m.by).setAlpha(1).setVisible(true).setDepth(m.by); m.tgt = null;
      if (m.baseScale) m.spr.setScale(m.baseScale);
      if (m.def.sprite) { m.anim = null; m.atkUntil = 0; this.playMob(m, "idle"); }
    });
  }

  hurtHero(dmg) {
    dmg = Math.max(1, dmg - gearDefTotal());   // las armaduras absorben daño
    G.hp = Math.max(0, G.hp - dmg);
    this.hurtFx = 0.18;
    refreshHud();
    if (G.hp <= 0) {
      log("Te derrotaron en la Zona Negra. Despertás en la granja.", "bad");
      toast("Te llevaron de vuelta a la granja");
      G.hp = Math.ceil(G.hpMax / 2);
      if (typeof saveFarm === "function") saveFarm(true);
      this.leaving = true;
      this.scene.start("farm");
    }
  }

  update(time, deltaMs) {
    if (this.leaving || !this.hero) return;   // cambiando de escena: no tocar nada más
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero, t = nowMs();

    // detalles viernes (1): la vida SOLO se regenera con comida (sin regeneración pasiva)

    // tinte de daño
    if (this.hurtFx > 0) { this.hurtFx -= dt; hero.setTint(0xff6b5a); } else hero.clearTint();

    // objetivo fijado: recuadro + nombre/vida, y auto-ataque cada 2s
    if (this.target && this.target.dead) this.clearTarget();
    this.updateTargetFx();
    this.autoAttack(t);
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
          const wkey = this.action.kind === "shoot" ? "bow" : (aid0 ? ARM_TIPO_DEF[ARM_DEF[aid0].tipo].sprite : null);
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
      const step = GF.SPEED * dt, nx = hero.x + vx * step, ny = hero.y + vy * step;
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

    // salir por la izquierda
    if (hero.x < 40) {
      const left = (GF.forestDrops || []).length;
      if (left) { log("Dejaste " + left + " objeto(s) en el suelo de la Zona Negra — siguen ahí si volvés.", "bad"); toast("Dejaste " + left + " objeto(s) en el suelo"); }
      if (typeof saveFarm === "function") saveFarm();
      this.leaving = true;
      this.scene.start("farm"); return;
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
      if (aggro && dHero > 36) {
        const dx = hero.x - m.cx, dy = hero.y - m.by, d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(m.def.spd * dt, d - 36);   // viernes (2): frena al borde de tu celda, nunca la pisa
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
        if (t >= m.bleed.next) { m.bleed.next = t + 1000; m.hp -= m.bleed.dps; this.floatTxt(m, "-" + m.bleed.dps, "#e05a5a"); this.drawBar(m); if (m.hp <= 0) { this.killMonster(m, "range"); continue; } }
      } else if (m.bleed) m.bleed = null;
      // ataque al héroe (aturdido por el mazo = pierde el golpe)
      if (m.stunUntil && t < m.stunUntil) { /* aturdido */ }
      else if (dHero < 40 && t > m.nextHit) {
        m.nextHit = t + 2000; m.face = hero.x < m.cx ? -1 : 1;   // detalles viernes (1): los mobs atacan cada 2 segundos
        this.hurtHero(m.def.dmg);
        if (m.def.sprite) { this.playMob(m, "atk", true); m.atkUntil = t + 600; }
        if (this.leaving) return;
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
    if (m) { el.textContent = "Atacar " + m.def.label + " (" + Math.ceil(m.hp) + " ) · [E]"; el.classList.add("show"); }
    else if (far) { el.textContent = "Disparar a " + far.def.label + " (" + (G.res.flecha || 0) + ") · [E]"; el.classList.add("show"); }
    else if (this.hero.x < 90) { el.textContent = "Volver a la granja"; el.classList.add("show"); }
    else el.classList.remove("show");
  }
}
