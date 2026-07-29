/* BootScene: carga los sprites (con reintentos hasta completar TODO) y crea las animaciones.
   El server free de Render a veces rechaza pedidos sueltos; acá los detectamos y repedimos. */
class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  // lista completa [clave, archivo] de todo lo que el juego necesita
  assetList() {
    const P = "assets/farm/", L = [];
    for (let i = 0; i < 4; i++) L.push(["walk_" + i, P + "walk_se_" + i + ".png"]);
    for (let i = 0; i < 4; i++) L.push(["idle_" + i, P + "breathe_se_" + i + ".png"]);
    ["chop","mine","fish","water","plant","harvest"].forEach(a => {
      for (let i = 0; i < 7; i++) L.push(["act_" + a + "_" + i, P + "act_" + a + "_" + i + ".png"]);
    });
    ["rock","rock_mined","wheat","duck","boar"].forEach(k => L.push([k, P + k + ".png"]));
    // arte cozy nuevo (v2 rompe el caché del arte viejo)
    ["tree_stump","sprout","node_stone_mined","node_bronze_mined","node_gold_mined","node_diamond_mined","node_netherite_mined"]
      .forEach(k => L.push([k, P + k + ".png?v=2"]));
    L.push(["withered", P + "withered.png"]);   // cultivo marchito cozy
    ["tree","pond","node_stone","node_bronze","node_gold","node_diamond","node_netherite"]
      .forEach(k => L.push([k, P + k + ".png?v=2"]));   // arte cozy nuevo
    // versionados: el arte cambió y el caché de 1 día serviría el viejo
    L.push(["plot", P + "plot.png?v=3"]);
    L.push(["plot_blocked", P + "plot_blocked.png?v=2"]);
    L.push(["barn", P + "barn.png?v=3"]);
    L.push(["market", P + "market.png?v=3"]);
    L.push(["store", P + "store.png?v=3"]);
    ["fence_top","fence_bottom","fence_left","fence_right"].forEach(k => L.push([k, P + k + ".png?v=2"]));
    L.push(["fishing_rod", P + "fishing_rod.png?v=2"]);   // caña cozy nueva
    L.push(["fence_corner", P + "fence_corner.png?v=3"]);
    if (typeof CROP_ORDER !== "undefined") CROP_ORDER.forEach(k => L.push(["cropg_" + k, P + "cropg_" + k + ".png"]));
    return L;
  }

  preload() {
    // ATLAS: todos los sprites del mundo en 2 archivos (mucho más liviano para el server free).
    // Si el atlas no llega, ensureAll() baja los archivos sueltos como respaldo.
    this.load.image("__atlas", "assets/atlas.png?v=6");
    this.load.json("__atlasmap", "assets/atlas.json?v=6");

    // barra de carga simple
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, 240, 16, 0x2a3a1c).setStrokeStyle(2, 0x8fc46a);
    const fill = this.add.rectangle(w/2 - 118, h/2, 4, 10, 0x8fc46a).setOrigin(0, 0.5);
    this.msg = this.add.text(w/2, h/2 - 32, "Cargando Golden Farm…", { fontFamily:"system-ui", fontSize:"16px", color:"#ffe08a" }).setOrigin(0.5);
    this.load.on("progress", v => { fill.width = 4 + 232 * v; });
  }

  create() {
    // desempaquetar el atlas en texturas individuales (mismas claves de siempre)
    const map = this.cache.json.get("__atlasmap");
    if (map && map.frames && this.textures.exists("__atlas")) {
      const src = this.textures.get("__atlas").getSourceImage();
      for (const key in map.frames) {
        if (this.textures.exists(key)) continue;
        const fr = map.frames[key];
        const cv = document.createElement("canvas");
        cv.width = fr.w; cv.height = fr.h;
        cv.getContext("2d").drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
        this.textures.addCanvas(key, cv);
      }
    }
    this.tries = 0;
    this.ensureAll();   // lo que falte (o todo, si el atlas no llegó) se baja suelto con reintentos
  }

  // repide lo que falte (hasta 6 pasadas) antes de arrancar la granja
  ensureAll() {
    const missing = this.assetList().filter(([k]) => !this.textures.exists(k));
    if (missing.length === 0 || this.tries >= 6) {
      if (missing.length) console.warn("Sin cargar tras reintentos:", missing.map(m => m[0]).join(", "));
      this.buildAnims();
      this.scene.start("farm");
      return;
    }
    this.tries++;
    if (this.msg) this.msg.setText("Completando descarga… (" + missing.length + " restantes)");
    // espera breve creciente para dejar respirar al server, después repide solo lo faltante
    this.time.delayedCall(400 + this.tries * 500, () => {
      missing.forEach(([k, f]) => this.load.image(k, f + (f.includes("?") ? "&r=" : "?r=") + this.tries));
      this.load.once("complete", () => this.ensureAll());
      this.load.start();
    });
  }

  buildAnims() {
    const has = ks => ks.every(k => this.textures.exists(k));
    if (has(["walk_0","walk_1","walk_2","walk_3"]))
      this.anims.create({ key: "walk", frames: [0,1,2,3].map(i => ({ key: "walk_" + i })), frameRate: 9, repeat: -1 });
    if (has(["idle_0","idle_1","idle_2","idle_3"]))
      this.anims.create({ key: "idle", frames: [0,1,2,3].map(i => ({ key: "idle_" + i })), frameRate: 4, repeat: -1 });
    ["chop","mine","fish","water","plant","harvest"].forEach(a => {
      const ks = [0,1,2,3,4,5,6].map(i => "act_" + a + "_" + i);
      if (has(ks)) this.anims.create({ key: "act_" + a, frames: ks.map(k => ({ key: k })), frameRate: 10, repeat: -1 });
    });
  }
}
