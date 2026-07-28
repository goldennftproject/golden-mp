/* BootScene: carga los sprites y crea las animaciones, después arranca la granja */
class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload() {
    const P = "assets/farm/";
    // personaje
    for (let i = 0; i < 4; i++) this.load.image("walk_" + i, P + "walk_se_" + i + ".png");
    for (let i = 0; i < 4; i++) this.load.image("idle_" + i, P + "breathe_se_" + i + ".png");
    // animaciones de acción (7 frames cada una)
    ["chop","mine","fish","water","plant","harvest"].forEach(a => {
      for (let i = 0; i < 7; i++) this.load.image("act_" + a + "_" + i, P + "act_" + a + "_" + i + ".png");
    });
    // mundo
    ["tree","tree_stump","rock","rock_mined","node_stone","node_bronze","node_gold",
     "node_diamond","node_netherite","barn","market","store","wheat","sprout","duck","fishing_rod","boar",
     "pond","plot"]
      .forEach(k => this.load.image(k, P + k + ".png"));
    // sprites de cultivo (conjunto) para la parcela lista
    if (typeof CROP_ORDER !== "undefined") CROP_ORDER.forEach(k => this.load.image("cropg_" + k, P + "cropg_" + k + ".png"));
    // versiones picadas de los nodos (se muestran mientras están en enfriamiento)
    ["node_stone_mined","node_bronze_mined","node_gold_mined","node_diamond_mined","node_netherite_mined"]
      .forEach(k => this.load.image(k, P + k + ".png"));

    // barra de carga simple
    const w = this.scale.width, h = this.scale.height;
    const bar = this.add.rectangle(w/2, h/2, 240, 16, 0x2a3a1c).setStrokeStyle(2, 0x8fc46a);
    const fill = this.add.rectangle(w/2 - 118, h/2, 4, 10, 0x8fc46a).setOrigin(0, 0.5);
    this.add.text(w/2, h/2 - 32, "Cargando Golden Farm…", { fontFamily:"system-ui", fontSize:"16px", color:"#ffe08a" }).setOrigin(0.5);
    this.load.on("progress", v => { fill.width = 4 + 232 * v; });
  }

  create() {
    // caminar (4 frames) e idle (4 frames, respiración)
    this.anims.create({ key: "walk", frames: [0,1,2,3].map(i => ({ key: "walk_" + i })), frameRate: 9, repeat: -1 });
    this.anims.create({ key: "idle", frames: [0,1,2,3].map(i => ({ key: "idle_" + i })), frameRate: 4, repeat: -1 });
    ["chop","mine","fish","water","plant","harvest"].forEach(a => {
      this.anims.create({ key: "act_" + a, frames: [0,1,2,3,4,5,6].map(i => ({ key: "act_" + a + "_" + i })), frameRate: 10, repeat: -1 });
    });
    this.scene.start("farm");
  }
}
