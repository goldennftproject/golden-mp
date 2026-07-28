/* FarmScene: la granja privada (instanciada). Fase 1: mundo caminable + objetos. */
class FarmScene extends Phaser.Scene {
  constructor() { super("farm"); }

  create() {
    const W = GF.WORLD_W, H = GF.WORLD_H, T = GF.TILE;
    this.cameras.main.setBackgroundColor("#6ba043");

    // fondo + grilla + borde (en un solo graphics de fondo)
    const g = this.add.graphics().setDepth(-1000);
    g.fillStyle(0x6ba043, 1).fillRect(0, 0, W, H);
    // estanque
    const p = GF.POND;
    g.fillStyle(0x3f79b0, 1).fillEllipse(p.x + p.w/2, p.y + p.h/2, p.w, p.h);
    g.fillStyle(0x5b93c4, 1).fillEllipse(p.x + p.w/2, p.y + p.h/2 - 6, p.w - 26, p.h - 26);
    // lotes (tierra simple, se detallan en otra fase)
    GF.PLOTS.forEach(pl => {
      g.fillStyle(0x8a5a33, 1); g.fillRoundedRect(pl.x - 19, pl.y - 19, 38, 38, 6);
      g.fillStyle(0x724829, 1); g.fillRoundedRect(pl.x - 16, pl.y - 16, 32, 32, 5);
    });
    // grilla sutil
    g.lineStyle(1, 0x18300f, 0.13);
    for (let x = 0; x <= W; x += T) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath(); }
    for (let y = 0; y <= H; y += T) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath(); }
    g.lineStyle(4, 0x3c4d31, 0.9).strokeRect(0, 0, W, H);

    // helper: sprite anclado abajo, escalado por ancho, con depth = y
    const addObj = (key, x, y, targetW) => {
      const s = this.add.image(x, y, key).setOrigin(0.5, 0.92);
      s.setScale(targetW / s.width);
      s.setDepth(y);
      return s;
    };

    // objetos del mundo
    GF.TREES.forEach(t => addObj("tree", t[0], t[1], GF.SIZE.tree));
    GF.ROCKS.forEach(r => addObj("rock", r[0], r[1], GF.SIZE.rock));
    GF.ORES.forEach(n => addObj(n.sprite, n.x, n.y, GF.SIZE.node));
    GF.BUILDINGS.forEach(b => addObj(b.sprite, b.x, b.y, b.size));

    // personaje (escala por ALTURA para tamaño constante)
    const hero = this.add.sprite(470, 320, "idle_0").setOrigin(0.5, 0.92);
    hero.setScale(GF.SIZE.hero / hero.height);
    hero.play("idle");
    this.hero = hero;
    this.heroBaseScaleX = hero.scaleX;   // para el flip
    this.facing = "east";

    // cámara
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setZoom(GF.ZOOM);
    this.cameras.main.startFollow(hero, true, 0.15, 0.15);

    // teclado
    this.keys = this.input.keyboard.addKeys({
      up:"W", down:"S", left:"A", right:"D",
      aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT",
      plaza:"M",
    });

    // HUD fijo a cámara
    this.add.text(10, 10,
      "TU GRANJA · WASD/flechas para moverte · diagonal permitida\nApretá  M  para ir a la PLAZA (multijugador)",
      { fontFamily:"system-ui", fontSize:"13px", color:"#f2ead5",
        backgroundColor:"rgba(20,28,15,0.7)", padding:{x:8,y:6}, lineSpacing:4 })
      .setScrollFactor(0).setDepth(10000);

    this.keys.plaza.on("down", () => this.scene.start("plaza"));
  }

  update(time, deltaMs) {
    const dt = deltaMs / 1000;
    const k = this.keys, hero = this.hero;
    let vx = 0, vy = 0;
    if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
    if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
    const moving = !!(vx || vy);
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }

    if (moving) {
      const step = GF.SPEED * dt;
      const nx = hero.x + vx * step, ny = hero.y + vy * step;
      // colisión por eje (deslizar contra paredes)
      if (!GF.blockedAt(nx, ny, 6)) { hero.x = nx; hero.y = ny; }
      else { if (vx && !GF.blockedAt(nx, hero.y, 6)) hero.x = nx; if (vy && !GF.blockedAt(hero.x, ny, 6)) hero.y = ny; }
      if (vx < 0) this.facing = "west"; else if (vx > 0) this.facing = "east";
    }

    // animación + flip
    hero.setScale((this.facing === "west" ? -1 : 1) * Math.abs(this.heroBaseScaleX), hero.scaleY);
    if (moving) { if (hero.anims.currentAnim?.key !== "walk") hero.play("walk"); }
    else { if (hero.anims.currentAnim?.key !== "idle") hero.play("idle"); }

    hero.setDepth(hero.y);
  }
}
