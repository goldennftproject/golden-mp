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
      this.treeCols.push({ cx: x, cy: y - T * 0.5, rx: T * 0.8, ry: T * 0.5 });
    }

    // salida (izquierda): volver a la granja
    this.add.text(26, this.H / 2, "⬅️", { fontSize: "26px" }).setOrigin(0.5).setDepth(5);
    this.add.text(26, this.H / 2 + 26, "Granja", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5).setDepth(5);

    // monstruos: tier según profundidad (x)
    this.monsters = [];
    const zones = [
      ["rata", 0.08, 0.30, 3], ["larva", 0.25, 0.45, 3], ["orco", 0.42, 0.62, 3],
      ["lancero", 0.58, 0.75, 2], ["guerrero", 0.72, 0.88, 2], ["troll", 0.86, 0.97, 1],
    ];
    zones.forEach(([key, x0, x1, n]) => { for (let i = 0; i < n; i++) this.spawnMonster(key, x0, x1); });

    // héroe
    const hero = this.add.sprite(90, this.H / 2, "idle_0").setOrigin(0.5, 1);
    this.idleScale = GF.SIZE.hero / hero.height;
    this.actScale = GF.SIZE.hero / 47;
    hero.setScale(this.idleScale); hero.play("idle");
    this.hero = hero; this.facing = "east"; this.moveTarget = null; this.action = null; this.hurtFx = 0;

    // clic: atacar monstruo cercano o moverse
    this.input.on("pointerdown", (pt) => {
      if (GF.uiOpen || this.action) return;
      const wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const m of this.monsters) { if (m.dead) continue; const b = m.spr.getBounds(); if (Phaser.Geom.Rectangle.Contains(b, wx, wy)) { const d = Math.hypot(m.cx - wx, m.by - wy); if (d < bd) { bd = d; hit = m; } } }
      if (hit) { this.target = hit; this.moveTarget = { x: hit.cx, y: hit.by + 14 }; }
      else { this.target = null; this.moveTarget = { x: wx, y: wy }; }
    });

    this.cameras.main.setBounds(0, 0, this.W, this.H);
    this.cameras.main.startFollow(hero, true, 0.15, 0.15);
    this.cameras.main.setZoom(GF.ZOOM);
    this.cameras.main.setBackgroundColor("#2c4a20");

    this.keys = this.input.keyboard.addKeys({ up:"W", down:"S", left:"A", right:"D", aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT", act:"E", act2:"SPACE" }, false);
    this.keys.act.on("down", () => this.tryAttack());
    this.keys.act2.on("down", () => this.tryAttack());
    toast("🌲 El Bosque — cuanto más profundo, más peligro");
    log("🌲 Entraste al Bosque. Los monstruos fuertes viven a la derecha.", "info");
    refreshHud();
  }

  blockedAt(x, y, pad) {
    pad = pad || 0;
    if (x < 12 || y < 12 || x > this.W - 12 || y > this.H - 12) return true;
    for (const c of this.treeCols) { const dx = (x - c.cx) / (c.rx + pad), dy = (y - c.cy) / (c.ry + pad); if (dx * dx + dy * dy < 1) return true; }
    return false;
  }

  spawnMonster(key, x0, x1) {
    const def = MONSTER_DEF[key];
    const cx = this.W * (x0 + Math.random() * (x1 - x0));
    const by = 70 + Math.random() * (this.H - 120);
    const spr = this.add.text(cx, by, def.emoji, { fontSize: Math.round(20 + def.hp / 12) + "px" }).setOrigin(0.5, 1).setDepth(by);
    const bar = this.add.graphics().setDepth(by + 1);
    const m = { key, def, cx, by, hp: def.hp, spr, bar, dead: false, home: { x: cx, y: by }, tgt: null, nextHit: 0, wanderAt: 0 };
    this.drawBar(m);
    this.monsters.push(m);
    return m;
  }

  drawBar(m) {
    m.bar.clear();
    if (m.dead || m.hp >= m.def.hp) return;
    const w = 30, x = m.cx - w / 2, y = m.by - m.spr.height - 8;
    m.bar.fillStyle(0x000000, 0.55).fillRect(x - 1, y - 1, w + 2, 5);
    m.bar.fillStyle(m.hp / m.def.hp > 0.4 ? 0x7ec95a : 0xd9534f, 1).fillRect(x, y, w * (m.hp / m.def.hp), 3);
  }

  nearestMonster(rad) {
    let best = null, bd = 1e9;
    for (const m of this.monsters) { if (m.dead) continue; const d = Math.hypot(m.cx - this.hero.x, m.by - this.hero.y); if (d < rad && d < bd) { bd = d; best = m; } }
    return best;
  }

  tryAttack() {
    if (this.action) return;
    const near = this.nearestMonster(56);
    if (near) {   // cuerpo a cuerpo
      this.facing = (near.cx < this.hero.x) ? "west" : "east";
      this.moveTarget = null;
      this.action = { kind: "attack", m: near, t: 0, dur: 0.45 };
      return;
    }
    if (canShoot()) {   // a distancia con el arco
      const far = this.nearestMonster(190);
      if (far) { this.facing = (far.cx < this.hero.x) ? "west" : "east"; this.moveTarget = null; this.action = { kind: "shoot", m: far, t: 0, dur: 0.35 }; }
    }
  }

  // disparo: proyectil ➳ que viaja hasta el monstruo y pega al llegar
  shootArrow(m) {
    if (!canShoot()) { toast("➳ Sin flechas — crafteá en la Herrería"); return; }
    G.res.flecha--; useTool("bow");
    if (toolDur("bow") <= 0) { log("🏹 ¡El arco se rompió! Reparalo en la Herrería.", "bad"); toast("🏹 ¡Arco roto!"); }
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    const a = this.add.text(this.hero.x, this.hero.y - 22, "➳", { fontSize: "16px", color: "#e8d3a8" }).setOrigin(0.5).setDepth(99999);
    a.setScale(m.cx < this.hero.x ? -1 : 1, 1);
    const d = Math.hypot(m.cx - this.hero.x, m.by - this.hero.y);
    this.tweens.add({
      targets: a, x: m.cx, y: m.by - m.spr.height * 0.5, duration: Math.max(120, d * 1.6),
      onComplete: () => { a.destroy(); if (!m.dead) this.hitMonster(m, bowDmg(), "range"); },
    });
  }

  hitMonster(m, dmg, skill) {
    if (window.sfx) sfx("hit");
    if (dmg == null) { dmg = swordDmg(); skill = "sword"; }
    if (skill === "sword" && G.gear.arma === "sword" && toolDur("sword") > 0) { useTool("sword"); if (toolDur("sword") <= 0) { log("⚔️ ¡La espada se rompió! Reparala en la Herrería.", "bad"); toast("⚔️ ¡Espada rota!"); } }
    m.hp -= dmg;
    // texto de daño flotante
    const t = this.add.text(m.cx, m.by - m.spr.height, "-" + dmg, { fontFamily: "system-ui", fontSize: "13px", fontStyle: "bold", color: skill === "range" ? "#a8d8ff" : "#ffd24a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(99999);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 550, onComplete: () => t.destroy() });
    if (m.hp <= 0) this.killMonster(m, skill || "sword"); else { this.drawBar(m); m.tgt = "hero"; }
  }

  killMonster(m, skill) {
    m.dead = true; m.bar.clear();
    addXp(skill || "sword", m.def.xp);
    // armaduras: chance de drop (se autoequipan si mejoran)
    if (m.def.gearLoot) for (const [gk, ch] of m.def.gearLoot) { if (Math.random() < ch) gainGear(gk); }
    const loot = rollLoot(m.def);
    const parts = [];
    for (const k in loot) {
      if (k === "plata") { G.plata += loot[k]; parts.push("+" + loot[k] + " 🪙"); }
      else if (tryAddRes(k, loot[k])) parts.push("+" + loot[k] + " " + RES_EMOJI[k]);
    }
    log("⚔️ Venciste a " + m.def.label + ". " + parts.join(" · "), "gold");
    toast("⚔️ " + m.def.label + " ✔ " + parts.join(" "));
    refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    this.tweens.add({ targets: m.spr, alpha: 0, y: m.by - 12, duration: 400, onComplete: () => m.spr.setVisible(false) });
    // reaparece en su zona tras 25-40s
    this.time.delayedCall(25000 + Math.random() * 15000, () => {
      if (!this.scene || !this.scene.isActive()) return;
      m.hp = m.def.hp; m.dead = false; m.cx = m.home.x; m.by = m.home.y;
      m.spr.setPosition(m.cx, m.by).setAlpha(1).setVisible(true).setDepth(m.by); m.tgt = null;
    });
  }

  hurtHero(dmg) {
    dmg = Math.max(1, dmg - gearDefTotal());   // las armaduras absorben daño
    G.hp = Math.max(0, G.hp - dmg);
    this.hurtFx = 0.18;
    refreshHud();
    if (G.hp <= 0) {
      log("💀 Te derrotaron en el Bosque. Despertás en la granja.", "bad");
      toast("💀 Te llevaron de vuelta a la granja");
      G.hp = Math.ceil(G.hpMax / 2);
      if (typeof saveFarm === "function") saveFarm(true);
      this.scene.start("farm");
    }
  }

  update(time, deltaMs) {
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero, t = nowMs();

    // regeneración lenta de vida
    if (G.hp < G.hpMax) { G.hp = Math.min(G.hpMax, G.hp + 0.8 * dt); if (Math.random() < 0.02) refreshHud(); }

    // tinte de daño
    if (this.hurtFx > 0) { this.hurtFx -= dt; hero.setTint(0xff6b5a); } else hero.clearTint();

    // acción de ataque (cuerpo a cuerpo o disparo)
    if (this.action) {
      this.action.t += dt;
      const sign = this.facing === "west" ? -1 : 1;
      hero.setScale(sign * this.actScale, this.actScale);
      // el golpe muestra el ARMA equipada (espada o arco), no el hacha (detalles 29/7)
      if (hero.anims.currentAnim?.key !== "idle") hero.play("idle");
      if (!this.action.fx) {
        const wkey = this.action.kind === "shoot" ? "bow" : (G.gear.arma === "sword" ? "sword" : null);   // sin espada equipada pelea a puños (sin fx)
        if (wkey && this.textures.exists(wkey)) {
          const fx = this.add.image(hero.x + sign * 18, hero.y - 26, wkey).setDisplaySize(26, 26).setOrigin(0.5, 0.85).setDepth(hero.y + 1);
          this.action.fx = fx;
          if (this.action.kind === "shoot") { fx.setFlipX(sign < 0); this.time.delayedCall(this.action.dur * 1000, () => fx.destroy()); }
          else { fx.setAngle(sign * -70); this.tweens.add({ targets: fx, angle: sign * 75, duration: Math.min(280, this.action.dur * 1000), onComplete: () => fx.destroy() }); }
        } else this.action.fx = true;
      }
      if (this.action.t >= this.action.dur) {
        const a = this.action; this.action = null;
        if (a.kind === "shoot") { if (a.m && !a.m.dead) this.shootArrow(a.m); }
        else if (a.m && !a.m.dead && Math.hypot(a.m.cx - hero.x, a.m.by - hero.y) < 62) this.hitMonster(a.m);
      }
      hero.setDepth(hero.y); this.updateMonsters(dt, t); this.updatePrompt(); return;
    }

    // movimiento
    let vx = 0, vy = 0;
    if (!GF.uiOpen) {
      if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
      if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
      if (vx || vy) this.moveTarget = null;
      else if (this.moveTarget) { const dx = this.moveTarget.x - hero.x, dy = this.moveTarget.y - hero.y, d = Math.hypot(dx, dy); if (d < 4) this.moveTarget = null; else { vx = dx / d; vy = dy / d; } }
    }
    const moving = !!(vx || vy);
    if (moving) {
      const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      const step = GF.SPEED * dt, nx = hero.x + vx * step, ny = hero.y + vy * step;
      if (!this.blockedAt(nx, ny, 6)) { hero.x = nx; hero.y = ny; }
      else { if (vx && !this.blockedAt(nx, hero.y, 6)) hero.x = nx; if (vy && !this.blockedAt(hero.x, ny, 6)) hero.y = ny; }
      if (vx < 0) this.facing = "west"; else if (vx > 0) this.facing = "east";
    }

    // salir por la izquierda
    if (hero.x < 40) { if (typeof saveFarm === "function") saveFarm(); this.scene.start("farm"); return; }

    // perseguir el objetivo clickeado: con arco dispara de lejos, si no ataca al llegar
    if (this.target && !this.target.dead) {
      const d = Math.hypot(this.target.cx - hero.x, this.target.by - hero.y);
      if (d < 52) { this.moveTarget = null; const m = this.target; this.target = null; this.facing = (m.cx < hero.x) ? "west" : "east"; this.action = { kind: "attack", m, t: 0, dur: 0.45 }; }
      else if (d < 190 && canShoot()) { this.moveTarget = null; const m = this.target; this.target = null; this.facing = (m.cx < hero.x) ? "west" : "east"; this.action = { kind: "shoot", m, t: 0, dur: 0.35 }; }
    }

    const sign = this.facing === "west" ? -1 : 1;
    hero.setScale(sign * this.idleScale, this.idleScale);
    if (moving) { if (hero.anims.currentAnim?.key !== "walk") hero.play("walk"); }
    else { if (hero.anims.currentAnim?.key !== "idle") hero.play("idle"); }
    hero.setDepth(hero.y);

    this.updateMonsters(dt, t);
    this.updatePrompt();
  }

  updateMonsters(dt, t) {
    const hero = this.hero;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const dHero = Math.hypot(hero.x - m.cx, hero.y - m.by);
      const aggro = m.hp < m.def.hp || dHero < 110;   // te vio o lo golpeaste
      if (aggro && dHero > 34) {
        const dx = hero.x - m.cx, dy = hero.y - m.by, d = Math.hypot(dx, dy) || 1;
        const sp = m.def.spd * dt;
        m.cx += dx / d * sp; m.by += dy / d * sp;
      } else if (!aggro) {
        // deambular cerca de casa
        if (t > (m.wanderAt || 0)) { m.wanderAt = t + 2500 + Math.random() * 3000; m.wtgt = { x: m.home.x + (Math.random() - 0.5) * 120, y: m.home.y + (Math.random() - 0.5) * 90 }; }
        if (m.wtgt) { const dx = m.wtgt.x - m.cx, dy = m.wtgt.y - m.by, d = Math.hypot(dx, dy); if (d > 3) { const sp = m.def.spd * 0.35 * dt; m.cx += dx / d * sp; m.by += dy / d * sp; } }
      }
      // ataque al héroe
      if (dHero < 40 && t > m.nextHit) { m.nextHit = t + 1200; this.hurtHero(m.def.dmg); }
      m.spr.setPosition(m.cx, m.by).setDepth(m.by);
      m.spr.setScale((hero.x < m.cx ? -1 : 1), 1);
      this.drawBar(m);
    }
  }

  updatePrompt() {
    const el = $("prompt"); if (!el) return;
    if (GF.uiOpen || this.action) { el.classList.remove("show"); return; }
    const m = this.nearestMonster(60);
    const far = !m && canShoot() ? this.nearestMonster(190) : null;
    if (m) { el.textContent = "⚔️ Atacar " + m.def.label + " (" + Math.ceil(m.hp) + " ❤) · [E]"; el.classList.add("show"); }
    else if (far) { el.textContent = "🏹 Disparar a " + far.def.label + " (➳ " + (G.res.flecha || 0) + ") · [E]"; el.classList.add("show"); }
    else if (this.hero.x < 90) { el.textContent = "⬅️ Volver a la granja"; el.classList.add("show"); }
    else el.classList.remove("show");
  }
}
