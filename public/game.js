/* Golden Farm · POC de zona compartida
   Cliente Phaser + Colyseus. El movimiento es libre (con diagonal normalizada),
   igual que Sunflower Land. Cada cliente controla su jugador y el servidor
   refleja las posiciones a todos. La economía NO está acá todavía (a propósito). */

const WORLD_W = 1280, WORLD_H = 800;   // tamaño de la plaza compartida
const TILE = 42;                        // misma grilla de diseño que Golden Farm
const SPEED = 170;                      // px/segundo
const SPRITE_SCALE = 1.5;

let room = null;
let myId = null;
const remote = new Map();  // sessionId -> {sprite, label}
let me = null;             // {sprite, label, x, y, dir, moving}
let sendAcc = 0;

const statusEl = document.getElementById("status");

/* ---------------- Escena Phaser ---------------- */
class Plaza extends Phaser.Scene {
  constructor() { super("plaza"); }

  preload() {
    this.load.image("farmer_idle", "assets/farmer_idle.png");
    for (let i = 0; i < 4; i++) this.load.image("farmer_walk_" + i, "assets/farmer_walk_" + i + ".png");
  }

  create() {
    // Fondo verde + grilla sutil de 42px + borde de la plaza
    this.cameras.main.setBackgroundColor("#6ba043");
    const g = this.add.graphics();
    g.fillStyle(0x6ba043, 1).fillRect(0, 0, WORLD_W, WORLD_H);
    g.lineStyle(1, 0x18300f, 0.13);
    for (let x = 0; x <= WORLD_W; x += TILE) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WORLD_H); g.strokePath(); }
    for (let y = 0; y <= WORLD_H; y += TILE) { g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD_W, y); g.strokePath(); }
    g.lineStyle(4, 0x3c4d31, 0.9).strokeRect(0, 0, WORLD_W, WORLD_H);

    // Animación de caminar a partir de los 4 frames
    this.anims.create({
      key: "walk",
      frames: [0, 1, 2, 3].map(i => ({ key: "farmer_walk_" + i })),
      frameRate: 9, repeat: -1,
    });

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(1.4);

    // Teclado
    this.keys = this.input.keyboard.addKeys({
      up: "W", down: "S", left: "A", right: "D",
      aup: "UP", adown: "DOWN", aleft: "LEFT", aright: "RIGHT",
    });

    connect(this);
  }

  spawnFarmer(x, y, name, isMe) {
    const spr = this.add.sprite(x, y, "farmer_idle").setOrigin(0.5, 0.95).setScale(SPRITE_SCALE);
    spr.setDepth(10);
    const label = this.add.text(x, y - 58, name || "Granjero", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", fontStyle: "bold",
      color: isMe ? "#ffe08a" : "#ffffff", stroke: "#20301a", strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(11);
    return { sprite: spr, label };
  }

  update(time, deltaMs) {
    const dt = deltaMs / 1000;
    if (!me) return;

    // --- movimiento local libre + diagonal normalizada ---
    let vx = 0, vy = 0;
    const k = this.keys;
    if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
    if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
    const moving = !!(vx || vy);
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }

    if (moving) {
      me.x = Phaser.Math.Clamp(me.x + vx * SPEED * dt, 16, WORLD_W - 16);
      me.y = Phaser.Math.Clamp(me.y + vy * SPEED * dt, 24, WORLD_H - 8);
      if (vx < 0) me.dir = "west"; else if (vx > 0) me.dir = "east";
    }
    me.moving = moving;
    drawFarmer(me, this);

    // depth por Y para que se tapen bien
    me.sprite.setDepth(me.y);
    me.label.setDepth(me.y + 1);

    // --- interpolar jugadores remotos hacia la posición del servidor ---
    if (room) {
      const seen = new Set();
      room.state.players.forEach((p, id) => {
        seen.add(id);
        if (id === myId) return;
        let r = remote.get(id);
        if (!r) { r = this.spawnFarmer(p.x, p.y, p.name, false); r.x = p.x; r.y = p.y; remote.set(id, r); }
        r.x = Phaser.Math.Linear(r.x, p.x, 0.2);
        r.y = Phaser.Math.Linear(r.y, p.y, 0.2);
        r.dir = p.dir; r.moving = p.moving;
        r.sprite.setDepth(r.y); r.label.setDepth(r.y + 1);
        drawFarmer(r, this);
      });
      for (const id of [...remote.keys()]) {
        if (!seen.has(id)) { const r = remote.get(id); r.sprite.destroy(); r.label.destroy(); remote.delete(id); }
      }
    }

    // --- mandar mi posición al servidor (throttle ~15/s) ---
    sendAcc += dt;
    if (room && sendAcc >= 0.066) {
      sendAcc = 0;
      room.send("move", { x: Math.round(me.x), y: Math.round(me.y), dir: me.dir, moving: me.moving });
    }
  }
}

/* dibuja/actualiza un granjero (sprite + label + animación + flip) */
function drawFarmer(f, scene) {
  f.sprite.x = f.x; f.sprite.y = f.y;
  f.label.x = f.x; f.label.y = f.y - 58;
  f.sprite.setFlipX(f.dir === "west");
  if (f.moving) {
    if (f.sprite.anims.currentAnim?.key !== "walk" || !f.sprite.anims.isPlaying) f.sprite.play("walk");
  } else {
    f.sprite.anims.stop();
    if (f.sprite.texture.key !== "farmer_idle") f.sprite.setTexture("farmer_idle");
  }
}

/* ---------------- Conexión Colyseus ---------------- */
async function connect(scene) {
  const nick = (window.__nick || "Granjero");
  // Endpoint: usa window.GOLDEN_SERVER si está definido (cliente en Vercel → server en Render),
  // si no, mismo origen (deploy todo-en-uno en Render, o local).
  const endpoint = (window.GOLDEN_SERVER && window.GOLDEN_SERVER.trim())
    || ((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
  // Esperar a que colyseus.js (módulo esm.sh) termine de cargar
  if (typeof Colyseus === "undefined" && !window.__colyseusReady) {
    statusEl.textContent = "Cargando librería de red…";
    await new Promise((res) => {
      window.addEventListener("colyseus-ready", res, { once: true });
      setTimeout(res, 9000);
    });
  }
  if (typeof Colyseus === "undefined" || !Colyseus.Client) {
    statusEl.textContent = "🔴 No cargó colyseus.js. Recargá la página (Ctrl+F5).";
    return;
  }
  const client = new Colyseus.Client(endpoint);
  try {
    room = await client.joinOrCreate("world", { name: nick });
    myId = room.sessionId;
    statusEl.textContent = "🟢 Conectado a la plaza";

    // crear mi jugador cuando aparezca en el estado
    const tryInitMe = () => {
      const p = room.state.players.get(myId);
      if (p && !me) {
        me = scene.spawnFarmer(p.x, p.y, nick, true);
        me.x = p.x; me.y = p.y; me.dir = p.dir || "east"; me.moving = false;
      }
    };
    tryInitMe();
    const iv = setInterval(() => { tryInitMe(); if (me) clearInterval(iv); }, 80);

    room.onLeave(() => { statusEl.textContent = "🔴 Desconectado"; });
  } catch (e) {
    console.error(e);
    statusEl.textContent = "🔴 No se pudo conectar al servidor. ¿Está corriendo 'npm start'?";
  }
}

/* ---------------- Arranque Phaser + puerta de apodo ---------------- */
function boot() {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: window.innerWidth,
    height: window.innerHeight,
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Plaza],
  });
}

document.getElementById("enter").addEventListener("click", () => {
  const v = document.getElementById("nick").value.trim();
  window.__nick = v || "Granjero";
  document.getElementById("gate").style.display = "none";
  boot();
});
document.getElementById("nick").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("enter").click();
});
