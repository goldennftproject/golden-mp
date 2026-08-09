/* PlazaScene: la zona compartida en tiempo real (Colyseus). Volvés con M. */
class PlazaScene extends Phaser.Scene {
  constructor() { super("plaza"); }

  create() {
    const W = 1280, H = 800, T = GF.TILE;
    this.pW = W; this.pH = H;
    this.cameras.main.setBackgroundColor("#6ea84a");

    const g = this.add.graphics().setDepth(-1000);
    g.fillStyle(0x729755, 1).fillRect(0, 0, W, H);
    g.lineStyle(1, 0x18300f, 0.12);
    for (let x = 0; x <= W; x += T) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath(); }
    for (let y = 0; y <= H; y += T) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath(); }
    g.lineStyle(4, 0x3c4d31, 0.9).strokeRect(0, 0, W, H);

    this.remote = new Map();   // sessionId -> {sprite,label,x,y,dir,moving}
    this.me = null; this.room = null; this.myId = null; this.sendAcc = 0;

    this.keys = this.input.keyboard.addKeys({
      up:"W", down:"S", left:"A", right:"D",
      aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT", farm:"M",
    }, false);   // enableCapture=false: no bloquea el tipeo en el chat

    this.add.text(10, 10,
      "PLAZA (compartida) · te ves con otros jugadores en vivo\nApretá  M  para volver a tu GRANJA",
      { fontFamily:"system-ui", fontSize:"13px", color:"#f2ead5",
        backgroundColor:"rgba(20,28,15,0.7)", padding:{x:8,y:6}, lineSpacing:4 })
      .setScrollFactor(0).setDepth(10000);
    this.statusText = this.add.text(10, this.scale.height - 26, "Conectando…",
      { fontFamily:"system-ui", fontSize:"12px", color:"#a9d18b",
        backgroundColor:"rgba(20,28,15,0.7)", padding:{x:6,y:4} })
      .setScrollFactor(0).setDepth(10000);

    this.keys.farm.on("down", () => { if (!GF.uiOpen) irAEscena(this, "farm"); });
    this.events.once("shutdown", () => { if (this.room) { try { this.room.leave(); } catch(e){} this.room = null; } });

    this.connect();
  }

  makeFarmer(x, y, name, mine) {
    const s = this.add.sprite(x, y, "hero_idle_0").setOrigin(0.5, 0.92);
    s.setScale(GF.SIZE.hero / s.height);
    s.baseScaleX = Math.abs(s.scaleX);
    s.play("idle");
    const label = this.add.text(x, y - 58, name || "Granjero",
      { fontFamily:"system-ui", fontSize:"13px", fontStyle:"bold",
        color: mine ? "#ffe08a" : "#ffffff", stroke:"#20301a", strokeThickness:3 })
      .setOrigin(0.5, 1);
    return { sprite: s, label, x, y, dir:"east", moving:false };
  }

  drawFarmer(f) {
    f.sprite.x = f.x; f.sprite.y = f.y;
    f.label.x = f.x; f.label.y = f.y - 58;
    f.sprite.setScale((f.dir === "west" ? -1 : 1) * f.sprite.baseScaleX, f.sprite.scaleY);
    if (f.moving) { if (f.sprite.anims.currentAnim?.key !== "walk") f.sprite.play("walk"); }
    else { if (f.sprite.anims.currentAnim?.key !== "idle") f.sprite.play("idle"); }
    f.sprite.setDepth(f.y); f.label.setDepth(f.y + 1);
  }

  async connect() {
    const nick = (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero"));
    const endpoint = (window.GOLDEN_SERVER && window.GOLDEN_SERVER.trim())
      || ((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
    if (typeof Colyseus === "undefined" && !window.__colyseusReady) {
      await new Promise(res => { window.addEventListener("colyseus-ready", res, { once:true }); setTimeout(res, 9000); });
    }
    if (typeof Colyseus === "undefined" || !Colyseus.Client) { this.statusText.setText("No cargó colyseus.js"); return; }
    try {
      const client = new Colyseus.Client(endpoint);
      this.room = await client.joinOrCreate("world", { name: nick });
      this.myId = this.room.sessionId;
      this.statusText.setText("En la plaza");
      const initMe = () => {
        const p = this.room.state.players.get(this.myId);
        if (p && !this.me) {
          this.me = this.makeFarmer(p.x, p.y, nick, true);
          this.me.x = p.x; this.me.y = p.y;
          this.cameras.main.setBounds(0, 0, this.pW, this.pH);
          this.cameras.main.startFollow(this.me.sprite, true, 0.15, 0.15);
          this.fitCamera();
          this.scale.on("resize", this.fitCamera, this);
          this.events.once("shutdown", () => this.scale.off("resize", this.fitCamera, this));
        }
      };
      initMe();
      const iv = setInterval(() => { if (!this.scene.isActive()) { clearInterval(iv); return; } initMe(); if (this.me) clearInterval(iv); }, 80);
      this.room.onLeave(() => this.statusText.setText("Desconectado"));
    } catch (e) {
      console.error(e);
      this.statusText.setText("No se pudo conectar a la plaza");
    }
  }

  fitCamera() {
    const cw = this.scale.width, ch = this.scale.height;
    this.cameras.main.setZoom(Math.max(GF.ZOOM, cw / this.pW, ch / this.pH));
  }

  update(time, deltaMs) {
    const dt = deltaMs / 1000, k = this.keys;
    if (!this.me) return;
    let vx = 0, vy = 0;
    if (!GF.uiOpen) {
      if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
      if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
    }
    const moving = !!(vx || vy);
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
    if (moving) {
      const step = GF.SPEED * speedMult() * dt;
      this.me.x = Phaser.Math.Clamp(this.me.x + vx * step, 16, this.pW - 16);
      this.me.y = Phaser.Math.Clamp(this.me.y + vy * step, 24, this.pH - 8);
      if (vx < 0) this.me.dir = "west"; else if (vx > 0) this.me.dir = "east";
    }
    this.me.moving = moving;
    this.drawFarmer(this.me);

    if (this.room && this.room.state) {
      const seen = new Set();
      this.room.state.players.forEach((p, id) => {
        seen.add(id);
        if (id === this.myId) return;
        let r = this.remote.get(id);
        if (!r) { r = this.makeFarmer(p.x, p.y, p.name, false); this.remote.set(id, r); }
        r.x = Phaser.Math.Linear(r.x, p.x, 0.2);
        r.y = Phaser.Math.Linear(r.y, p.y, 0.2);
        r.dir = p.dir; r.moving = p.moving;
        this.drawFarmer(r);
      });
      for (const id of [...this.remote.keys()]) {
        if (!seen.has(id)) { const r = this.remote.get(id); r.sprite.destroy(); r.label.destroy(); this.remote.delete(id); }
      }
      this.sendAcc += dt;
      if (this.sendAcc >= 0.066) {
        this.sendAcc = 0;
        this.room.send("move", { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving: this.me.moving });
      }
    }
  }
}
