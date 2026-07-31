/* BootScene: carga los sprites (con reintentos hasta completar TODO) y crea las animaciones.
   El server free de Render a veces rechaza pedidos sueltos; acá los detectamos y repedimos. */
class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  // lista completa [clave, archivo] de todo lo que el juego necesita
  assetList() {
    const P = "assets/farm/", L = [];
    // granjero definitivo (PixelLab 30/7): mira al sureste, se espeja por código. Pescar venía al suroeste y se espejó a sureste.
    for (let i = 0; i < 4; i++) L.push(["hero_idle_" + i, P + "hero_idle_" + i + ".png?v=2"]);
    for (let i = 0; i < 6; i++) L.push(["hero_walk_" + i, P + "hero_walk_" + i + ".png?v=2"]);
    ["chop","mine","fish","plant","harvest"].forEach(a => {
      for (let i = 0; i < 9; i++) L.push(["hero_" + a + "_" + i, P + "hero_" + a + "_" + i + ".png?v=2"]);
    });
    for (let i = 0; i < 8; i++) L.push(["hero_sword_" + i, P + "hero_sword_" + i + ".png?v=2"]);   // espadazo horizontal con estela
    for (let i = 0; i < 8; i++) L.push(["hero_bow_" + i, P + "hero_bow_" + i + ".png?v=2"]);       // disparo de arco (arco ya en mano)
    for (let i = 0; i < 7; i++) L.push(["act_water_" + i, P + "act_water_" + i + ".png"]);     // regar sigue con el arte anterior
    L.push(["boar", P + "boar.png"]);
    // orco del Bosque: sprite animado (mira al sureste, se espeja para el otro lado)
    for (let i = 0; i < 3; i++) L.push(["orc_idle_" + i, P + "orc_idle_" + i + ".png"]);
    for (let i = 0; i < 6; i++) L.push(["orc_walk_" + i, P + "orc_walk_" + i + ".png"]);
    for (let i = 0; i < 6; i++) L.push(["orc_atk_" + i, P + "orc_atk_" + i + ".png"]);
    // troll del Bosque: mismo método que el orco (mira al sureste, se espeja por código). Idle de 4 frames.
    for (let i = 0; i < 4; i++) L.push(["troll_idle_" + i, P + "troll_idle_" + i + ".png"]);
    for (let i = 0; i < 6; i++) L.push(["troll_walk_" + i, P + "troll_walk_" + i + ".png"]);
    for (let i = 0; i < 6; i++) L.push(["troll_atk_" + i, P + "troll_atk_" + i + ".png"]);
    // rata del Bosque (cuadrúpeda): quieto 8f, caminar 6f, atacar 7f. Se espeja por código.
    for (let i = 0; i < 8; i++) L.push(["rata_idle_" + i, P + "rata_idle_" + i + ".png"]);
    for (let i = 0; i < 6; i++) L.push(["rata_walk_" + i, P + "rata_walk_" + i + ".png"]);
    for (let i = 0; i < 7; i++) L.push(["rata_atk_" + i, P + "rata_atk_" + i + ".png"]);
    // larva venenosa del Bosque: quieto/caminar/atacar 8f (custom, mira al sureste). Se espeja por código.
    // ?v=2: los frames se voltearon horizontalmente (miraban al revés); rompe el caché del navegador.
    for (let i = 0; i < 8; i++) L.push(["larva_idle_" + i, P + "larva_idle_" + i + ".png?v=2"]);
    for (let i = 0; i < 8; i++) L.push(["larva_walk_" + i, P + "larva_walk_" + i + ".png?v=2"]);
    for (let i = 0; i < 8; i++) L.push(["larva_atk_" + i, P + "larva_atk_" + i + ".png?v=2"]);
    // orco lancero del Bosque (variante del orco con lanza+túnica): quieto 4f, caminar 7f, atacar 7f. Se espeja por código.
    for (let i = 0; i < 4; i++) L.push(["lancero_idle_" + i, P + "lancero_idle_" + i + ".png"]);
    for (let i = 0; i < 7; i++) L.push(["lancero_walk_" + i, P + "lancero_walk_" + i + ".png"]);
    for (let i = 0; i < 7; i++) L.push(["lancero_atk_" + i, P + "lancero_atk_" + i + ".png"]);
    // orco guerrero del Bosque (variante blindada con espada): quieto 4f, caminar 7f, atacar 9f. Se espeja por código.
    for (let i = 0; i < 4; i++) L.push(["guerrero_idle_" + i, P + "guerrero_idle_" + i + ".png"]);
    for (let i = 0; i < 7; i++) L.push(["guerrero_walk_" + i, P + "guerrero_walk_" + i + ".png"]);
    for (let i = 0; i < 9; i++) L.push(["guerrero_atk_" + i, P + "guerrero_atk_" + i + ".png"]);
    ["fish_comun","fish_raro"].forEach(k => L.push([k, P + k + ".png"]));   // pececitos de la laguna
    ["sword","bow"].forEach(k => L.push([k, P + k + ".png"]));   // arma visible al atacar en el Bosque
    L.push(["cocina", P + "cocina.png"]);   // edificio de Cocina (detalles 29/7)
    // arte cozy nuevo (v2 rompe el caché del arte viejo)
    L.push(["tree_stump", P + "tree_stump.png?v=2"]);
    L.push(["sprout", P + "sprout.png?v=4"]);
    // v7: restos correctos sobre su parche de tierra (los v6 venían de una copia vieja)
    ["node_stone_mined","node_bronze_mined","node_gold_mined","node_diamond_mined","node_netherite_mined"]
      .forEach(k => L.push([k, P + k + ".png?v=7"]));
    L.push(["dummy", P + "dummy.png"]);   // muñeco de práctica de espada
    L.push(["dummy_broken", P + "dummy_broken.png"]);   // dummy desgastado con cortes: se muestra durante el cooldown
    L.push(["cofre", P + "cofre.png"]);   // cofre depósito
    L.push(["withered", P + "withered.png?v=2"]);      // cultivo marchito cozy
    // etapas intermedias (la verdura asomando al 50% del crecimiento)
    if (typeof CROP_ORDER !== "undefined") CROP_ORDER.forEach(k => L.push(["cropm_" + k, P + "cropm_" + k + ".png?v=3"]));
    L.push(["tree", P + "tree.png?v=3"]);   // v3: árbol con efecto de plantado (detalles jueves)
    // progresión de talado (PixelLab 30/7): corte leve → corte profundo → tocón con tierra y hojas
    L.push(["tree_cut1", P + "tree_cut1.png"]);
    L.push(["tree_cut2", P + "tree_cut2.png"]);
    L.push(["tree_stump_leaves", P + "tree_stump_leaves.png"]);
    L.push(["pond", P + "pond.png?v=2"]);
    L.push(["portal", P + "portal.png"]);   // portal al Bosque (frame quieto de respaldo)
    for (let i = 0; i < 8; i++) L.push(["portal_" + i, P + "portal_" + i + ".png?v=2"]);   // espiral girando 360° · v2: gira TODO el vórtice, no solo el círculo central
    // v3: nodos plantados en la tierra + estados dañados (intermedio del cooldown)
    ["node_stone","node_bronze","node_gold","node_diamond","node_netherite"]
      .forEach(k => { L.push([k, P + k + ".png?v=3"]); L.push([k + "_half", P + k + "_half.png"]); });
    // versionados: el arte cambió y el caché de 1 día serviría el viejo
    L.push(["plot", P + "plot.png?v=4"]);   // tierra suelta que combina con los montículos
    L.push(["plot_blocked", P + "plot_blocked.png?v=3"]);   // sin trabajar: ramas, piedras y yuyos
    L.push(["barn", P + "barn.png?v=3"]);
    L.push(["market", P + "market.png?v=3"]);
    L.push(["store", P + "store.png?v=4"]);          // v4: fragua a medio fuego (estado por defecto)
    L.push(["store_lit", P + "store_lit.png"]);      // fragua encendida (mientras crafteás/reparás)
    ["fence_top","fence_bottom","fence_left","fence_right"].forEach(k => L.push([k, P + k + ".png?v=2"]));
    L.push(["fishing_rod", P + "fishing_rod.png?v=2"]);   // caña cozy nueva
    L.push(["fence_corner", P + "fence_corner.png?v=3"]);
    if (typeof CROP_ORDER !== "undefined") CROP_ORDER.forEach(k => L.push(["cropg_" + k, P + "cropg_" + k + ".png?v=4"]));   // plantas completas cozy
    return L;
  }

  preload() {
    // ATLAS: todos los sprites del mundo en 2 archivos (mucho más liviano para el server free).
    // Si el atlas no llega, ensureAll() baja los archivos sueltos como respaldo.
    this.load.image("__atlas", "assets/atlas.png?v=18");
    this.load.json("__atlasmap", "assets/atlas.json?v=18");

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
    if (has([0,1,2,3,4,5].map(i => "hero_walk_" + i)))
      this.anims.create({ key: "walk", frames: [0,1,2,3,4,5].map(i => ({ key: "hero_walk_" + i })), frameRate: 10, repeat: -1 });
    if (has(["hero_idle_0","hero_idle_1","hero_idle_2","hero_idle_3"]))
      this.anims.create({ key: "idle", frames: [0,1,2,3].map(i => ({ key: "hero_idle_" + i })), frameRate: 4, repeat: -1 });
    // acciones del granjero definitivo (9 frames cada una)
    ["chop","mine","fish","plant","harvest"].forEach(a => {
      const ks = [0,1,2,3,4,5,6,7,8].map(i => "hero_" + a + "_" + i);
      if (has(ks)) this.anims.create({ key: "act_" + a, frames: ks.map(k => ({ key: k })), frameRate: 10, repeat: -1 });
    });
    // pesca con el tirón (30/7): lanzar = tirón revertido (8→3), esperar = quieto en el 3, picar = tirón (3→8) una vez
    { const cast = [8,7,6,5,4,3].map(i => "hero_fish_" + i), yank = [3,4,5,6,7,8].map(i => "hero_fish_" + i);
      if (has(cast)) this.anims.create({ key: "fish_cast", frames: cast.map(k => ({ key: k })), frameRate: 12, repeat: 0 });
      if (has(yank)) this.anims.create({ key: "fish_yank", frames: yank.map(k => ({ key: k })), frameRate: 12, repeat: 0 }); }
    // regar mantiene el arte anterior (7 frames)
    { const ks = [0,1,2,3,4,5,6].map(i => "act_water_" + i);
      if (has(ks)) this.anims.create({ key: "act_water", frames: ks.map(k => ({ key: k })), frameRate: 10, repeat: -1 }); }
    // portal: el espiral gira 360° en loop (el arco de piedra queda quieto)
    { const ks = [0,1,2,3,4,5,6,7].map(i => "portal_" + i);
      if (has(ks)) this.anims.create({ key: "portal_spin", frames: ks.map(k => ({ key: k })), frameRate: 9, repeat: -1 }); }
    // combate: espadazo y arco (una pasada por golpe)
    { const ks = [0,1,2,3,4,5,6,7].map(i => "hero_sword_" + i);
      if (has(ks)) this.anims.create({ key: "act_sword", frames: ks.map(k => ({ key: k })), frameRate: 18, repeat: 0 }); }
    { const ks = [0,1,2,3,4,5,6,7].map(i => "hero_bow_" + i);
      if (has(ks)) this.anims.create({ key: "act_bow", frames: ks.map(k => ({ key: k })), frameRate: 24, repeat: 0 }); }   // 8f/24fps ≈ 0.33s: entra en el disparo de 0.35s
    // animaciones del orco y del troll (troll con idle de 4 frames)
    const mobs = { orc: [["idle", 3, 5, -1], ["walk", 6, 9, -1], ["atk", 6, 11, 0]],
                   troll: [["idle", 4, 4, -1], ["walk", 6, 8, -1], ["atk", 6, 10, 0]],
                   rata: [["idle", 8, 6, -1], ["walk", 6, 11, -1], ["atk", 7, 12, 0]],
                   larva: [["idle", 8, 5, -1], ["walk", 8, 8, -1], ["atk", 8, 10, 0]],
                   lancero: [["idle", 4, 5, -1], ["walk", 7, 9, -1], ["atk", 7, 11, 0]],
                   guerrero: [["idle", 4, 5, -1], ["walk", 7, 9, -1], ["atk", 9, 12, 0]] };
    Object.entries(mobs).forEach(([pre, defs]) => {
      defs.forEach(([nm, n, fps, rep]) => {
        const ks = Array.from({ length: n }, (_, i) => pre + "_" + nm + "_" + i);
        if (has(ks)) this.anims.create({ key: pre + "_" + nm, frames: ks.map(k => ({ key: k })), frameRate: fps, repeat: rep });
      });
    });
  }
}
