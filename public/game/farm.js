/* FarmScene: la granja privada. Fase 1 (mundo) + Fase 3 (interacciones). */
// CD (enfriamiento árbol/piedra) vive en state.js
function witherMs(ck) { const cd = CROP_DEF[ck]; return cd ? cd.grow * 1000 * 0.5 : 120000; }   // marchitado proporcional: mitad del tiempo de cultivo
// (los enfriamientos ahora salen de ORE_DEF[x].cd y de nodoCd(), doc 4/8)

class FarmScene extends Phaser.Scene {
  constructor() { super("farm"); }

  create() {
    /* 18/8 — LO PRIMERO: fijar la FORMA de la granja para esta partida.
       Todo lo que viene después (césped, bosque, cerca, adornos, cámara, límites) cuelga de acá,
       así que tiene que resolverse antes de dibujar el primer píxel. `G.expansiones` es cuántos
       bloques compró el jugador; como el orden es fijo, con el número alcanza. */
    GF.aplicarTerreno((typeof G !== "undefined" && G.expansiones) || 0);
    const W = GF.WORLD_W, H = GF.WORLD_H, T = GF.TILE;
    window.FARM = this;   // para restaurar la granja desde la config
    // Phaser REUTILIZA la instancia al reiniciar la escena: hay que soltar todo lo cacheado,
    // porque apunta a objetos ya destruidos (y usarlos rompía el juego al volver del Bosque).
    this.hoverFx = null; this.nearFx = null;
    this.destMk = null; this.destTw = null;
    this.dummyObj = null; this.dummyTimer = null; this.fishBar = null; this.adornos = null;   // si no se suelta, al volver del bosque la barra de pesca no vuelve a aparecer (10/8)
    this.editHl = null; this._nav = null; this.storeObj = null; this.forgeGlow = null;
    this.bobber = null; this.bobberTween = null; this.fishLine = null;
    this.hold = null; this.path = null; this.holdLast = null; this.holdPend = null;
    this.pathStuck = 0; this.lastDD = null; this.noProg = 0;
    this.unlockPend = null; this.leaving = false;
    this.dragObj = null; this.dragPlot = null; this.dragPond = false;
    this.dummyBroken = false;
    this.auraFx = null; this.auraTw = null;
    this.clickHit = null; this.clickPond = false; this.buffer = null;
    this.corral = null; this.animales = null; this.corralCerca = null;
    this.nubes = null; this.maripos = null; this._part = 0; this._rafActiva = false; this._vaporAt = 0;   // efectos de ambiente
    this.queue = [];      // cola de acciones: clickeá varios objetivos y se hacen en orden
    // 16/8 (dirección): "el suelo será solo césped, no va a haber tierra de playa, arena ni
    // agua". Con BOSQUE el fondo de la cámara es verde: si algún borde quedara al aire,
    // se ve pasto y no mar.
    // 17/8: el fondo es el COLOR MEDIO DEL CÉSPED (rgb 50,128,50), medido de grass_a. Antes
    // era un verde de copa 18% más oscuro: 38 niveles por debajo del césped, o sea
    // perfectamente visible. Cualquier hueco —un claro del mosaico, un borde— cantaba como
    // una mancha apagada. Con el color del césped, un hueco se lee como suelo y no se nota.
    this.cameras.main.setBackgroundColor(GF.BOSQUE ? "#328032" : (GF.ISLA ? "#2e7fa8" : "#328032"));

    this.dragPlot = null; this.dragPond = false;
    // posiciones editadas de laguna y parcelas: primero base, después lo guardado
    if (GF.PLOTS_BASE) GF.PLOTS.forEach((b, i) => { if (GF.PLOTS_BASE[i]) { b.col = GF.PLOTS_BASE[i].col; b.row = GF.PLOTS_BASE[i].row; } });   // las extra (13+) no tienen base: conservan la suya
    if (GF.POND_BASE) { GF.POND.col = GF.POND_BASE.col; GF.POND.row = GF.POND_BASE.row; }
    if (G.layoutPond && typeof G.layoutPond.col === "number") { GF.POND.col = G.layoutPond.col; GF.POND.row = G.layoutPond.row; }
    // PARCELAS EXTRA (13-60, pedido del diseñador 10/8, fix #17 11/8): GF.PLOTS nace con la
    // grilla de 12; las compradas de más entran SOLO cuando el jugador las colocó con clic
    // (parcelaColocar les guarda la celda en layoutPlots). Las no colocadas quedan pendientes
    // en la zona de edición.
    while (GF.PLOTS.length < (typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60) && G.layoutPlots && G.layoutPlots[GF.PLOTS.length]) {
      const sv = G.layoutPlots[GF.PLOTS.length];
      GF.PLOTS.push({ col: sv.col, row: sv.row });
    }
    if (G.layoutPlots) for (const k in G.layoutPlots) { const b = GF.PLOTS[k]; if (b) { b.col = G.layoutPlots[k].col; b.row = G.layoutPlots[k].row; } }
    /* 18/8 — LAS PARCELAS 13+ NO EXISTÍAN. GF.PLOTS nace con 12 posiciones y solo crecía si el
       jugador ARRASTRABA una parcela en modo edición (que es lo único que escribe layoutPlots).
       Pero plotsOwned puede llegar a PLOT_MAX=60 por nivel, por compra o por expansión, y
       refreshPlotLocks recorta a GF.PLOTS.length: la parcela nº13 se cobraba y no aparecía nunca.
       Ahora la lista se estira sola hasta lo que el jugador tiene, buscando celda libre. */
    this._crecerPlots = () => {
      let guardia = 0;
      while (GF.PLOTS.length < Math.min((typeof PLOT_MAX !== "undefined" ? PLOT_MAX : 60), G.plotsOwned || 3) && guardia++ < 80) {
        // si el jugador ya eligió celda para ésta (la acaba de colocar), MANDA la suya
        const sv = G.layoutPlots && G.layoutPlots[GF.PLOTS.length];
        const h = sv ? { col: sv.col, row: sv.row } : this.celdaLibreParcela();
        if (!h) break;                                  // granja sin sitio: se queda esperando terreno
        GF.PLOTS.push({ col: h.col, row: h.row });
        if (!G.layoutPlots) G.layoutPlots = {};
        G.layoutPlots[GF.PLOTS.length - 1] = { col: h.col, row: h.row };
      }
    };
    this._crecerPlots();

    // fondo + estanque + lotes-tierra (el césped, las florcitas, la grilla y la cerca
    // viven en sus propios métodos desde el 18/8 para poder rehacerlos al expandir)
    const g = this.add.graphics().setDepth(-1000);
    this.dibujarCesped();      // 18/8: extraído a método para poder rehacerlo al expandir
    this.dibujarDecosCesped();
    const p = GF.POND, pcx = (p.col + p.cols / 2) * T, pcy = (p.row + p.rows / 2) * T, pw = p.cols * T, ph = p.rows * T;
    if (this.textures.exists("pond")) {
      // 17/8 (dirección: "el corte en la laguna"). Estaba estirada a la caja de celdas sin mirar
      // su proporción: el sprite es 107x93 (1,15) y la caja 178x136 (1,31), o sea un 14% de
      // deformación horizontal. La forma redonda salía aplastada y se leía como cortada.
      // Ahora se encaja DENTRO de la caja conservando su relación: se toca por el lado que
      // limite y sobra césped por el otro, que es lo correcto para un sprite con forma propia.
      const src = this.textures.get("pond").getSourceImage();
      const rel = (src && src.width && src.height) ? src.width / src.height : (pw + 10) / (ph + 10);
      const cajaW = pw + 10, cajaH = ph + 10;
      const anchoP = Math.min(cajaW, cajaH * rel), altoP = anchoP / rel;
      this.pondImg = this.add.image(pcx, pcy, "pond").setDisplaySize(anchoP, altoP).setDepth(-999);
      // ————— DIAGNÓSTICO DE LA LAGUNA (17/8) —————
      // Se abre con  ?laguna=1  al final de la URL. No se enciende solo nunca.
      // Existe porque la laguna se ve cortada por la izquierda y llevo cuatro hipótesis
      // erradas mirando capturas: sprite, proporción, atlas y profundidades, todas descartadas
      // con datos. Medido sobre la pantalla, el agua sale MÁS ALTA QUE ANCHA (126x147) cuando
      // el sprite es más ancho que alto: le falta un trozo por la izquierda, y la cuenta da
      // exactamente una celda. Esto dibuja DÓNDE cree el juego que está la laguna y CUÁNTO
      // mide de verdad, para distinguir de una vez entre "se dibuja entera y algo la tapa" y
      // "se dibuja ya recortada".
      try {
        if (new URLSearchParams(location.search).get("laguna") === "1") {
          const src2 = this.textures.get("pond").getSourceImage();
          const gd = this.add.graphics().setDepth(99998);
          gd.lineStyle(2, 0xff3b3b, 1).strokeRect(pcx - anchoP / 2, pcy - altoP / 2, anchoP, altoP);   // rojo: el sprite
          gd.lineStyle(2, 0x3bd0ff, 1).strokeRect(p.col * T, p.row * T, p.cols * T, p.rows * T);        // azul: sus celdas
          gd.lineStyle(1, 0xffe066, 0.9);                                                              // amarillo: la grilla
          for (let c = p.col - 2; c <= p.col + p.cols + 2; c++) {
            gd.beginPath(); gd.moveTo(c * T, (p.row - 2) * T); gd.lineTo(c * T, (p.row + p.rows + 2) * T); gd.strokePath();
          }
          this.add.text(pcx - anchoP / 2, pcy - altoP / 2 - 30,
            "textura " + (src2 ? src2.width + "x" + src2.height : "?") +
            "  ·  dibujada " + Math.round(this.pondImg.displayWidth) + "x" + Math.round(this.pondImg.displayHeight) +
            "  ·  rojo=sprite  azul=celdas  amarillo=grilla",
            { fontFamily: "system-ui", fontSize: "12px", fontStyle: "bold", color: "#fff",
              backgroundColor: "#000c", padding: { x: 5, y: 3 } }).setDepth(99999);
        }
      } catch (e) {}
    } else {   // fallback: laguna dibujada (no movible sin sprite)
      g.fillStyle(0x2f5f8c, 1).fillEllipse(pcx, pcy, pw, ph);
      g.fillStyle(0x66a9dc, 1).fillEllipse(pcx, pcy - 6, pw - 26, ph - 26);
    }
    this.plotGrounds = [];
    if (this.textures.exists("plot")) {   // sprite de parcela de PixelLab; si falta, cae al dibujo
      GF.PLOTS.forEach(pl => this.plotGrounds.push(this.add.image((pl.col + 0.5) * T, (pl.row + 0.5) * T, "plot").setDisplaySize(T, T).setDepth(-998)));
    } else {
      GF.PLOTS.forEach(pl => { const x = pl.col * T, y = pl.row * T; g.fillStyle(0x8a5a33, 1); g.fillRoundedRect(x + 3, y + 3, T - 6, T - 6, 6); g.fillStyle(0x724829, 1); g.fillRoundedRect(x + 6, y + 6, T - 12, T - 12, 5); });
    }

    // viernes (2): movimiento del agua — ondas elípticas que se expanden y destellos que titilan
    this.pondWaves = [];
    {
      const pd = GF.POND;
      const rx = () => (pd.col + 0.55 + Math.random() * (pd.cols - 1.1)) * T;
      const ry = () => (pd.row + 0.55 + Math.random() * (pd.rows - 1.1)) * T;
      for (let i = 0; i < 3; i++) {   // ondas: anillos que nacen, crecen y se disuelven
        const ring = this.add.ellipse(rx(), ry(), 10, 5).setStrokeStyle(1.5, 0xbfe3f2, 0.5).setFillStyle().setDepth(-997).setAlpha(0);
        const loop = () => {
          ring.setPosition(rx(), ry()).setScale(0.4).setAlpha(0.55);
          this.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 2600 + Math.random() * 900, ease: "Sine.easeOut", onComplete: loop });
        };
        this.time.delayedCall(i * 1100, loop);
        this.pondWaves.push(ring);
      }
      for (let i = 0; i < 4; i++) {   // destellos: chispitas de sol sobre el agua
        const sp = this.add.ellipse(rx(), ry(), 3.5, 1.6, 0xeaf7ff, 0.8).setDepth(-997).setAlpha(0);
        const tw = () => {
          sp.setPosition(rx(), ry());
          this.tweens.add({ targets: sp, alpha: { from: 0, to: 0.75 }, duration: 500 + Math.random() * 400, yoyo: true, hold: 300, ease: "Sine.easeInOut", onComplete: () => this.time.delayedCall(400 + Math.random() * 1200, tw) });
        };
        this.time.delayedCall(300 + i * 700, tw);
        this.pondWaves.push(sp);
      }
    }

    // pececitos nadando en la laguna (sprites cozy; si faltan, emoji)
    this.pondFish = [];
    const FISH_SIZES = [[15, 11], [20, 15], [12, 9]];   // cada pez de un tamaño distinto
    ["fish_comun", "fish_raro", "fish_comun"].forEach((fk, fi) => {
      const p0 = this.pondPoint(), sz = FISH_SIZES[fi];
      const s = this.textures.exists(fk)
        ? this.add.image(p0.x, p0.y, fk).setDisplaySize(sz[0], sz[1]).setOrigin(0.5).setDepth(-990).setAlpha(0.9)
        : this.add.text(p0.x, p0.y, fi === 1 ? "" : "", { fontSize: "13px" }).setOrigin(0.5).setDepth(-990).setAlpha(0.85);
      this.pondFish.push({ s, tgt: this.pondPoint(), sp: 10 + Math.random() * 12 });
    });
    this.dibujarGrilla();
    this.dibujarCerca();

    // objetos del mundo (con estado para interacción)
    let __treeN = 0, __rockN = 0;   // viernes (2): orden de desbloqueo de árboles y piedras
    if (typeof oficiosSync === "function") oficiosSync(true);   // blueprints y mejoras (12/8 · 19/8):
    else if (typeof planosSync === "function") planosSync(true);   // guardados viejos reciben lo que ya tenían ganado
    // BUZÓN (15/8): si el arte de PixelLab no está, se dibuja uno simple a código —
    // así el objeto existe igual y el juego nunca cae al respaldo feo de "store"
    if (!this.textures.exists("paquete_dia")) {   // PAQUETE del día (15/8): respaldo a código
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xc9a06a, 1).fillRoundedRect(1, 6, 20, 14, 3);    // caja kraft
      g.fillStyle(0xb08650, 1).fillRect(1, 6, 20, 3);               // tapa
      g.lineStyle(2, 0x7a5a33, 1);
      g.beginPath(); g.moveTo(11, 6); g.lineTo(11, 20); g.strokePath();   // cordel vertical
      g.beginPath(); g.moveTo(1, 13); g.lineTo(21, 13); g.strokePath();   // cordel horizontal
      g.fillStyle(0x7a5a33, 1).fillCircle(11, 13, 2);               // nudito
      g.generateTexture("paquete_dia", 22, 21); g.destroy();
    }
    ["buzon", "buzon_full"].forEach((k, esFull) => {
      if (this.textures.exists(k)) return;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x6b4a2b, 1).fillRect(10, 14, 4, 18);            // poste
      g.fillStyle(0x8a5a33, 1).fillRoundedRect(3, 4, 18, 12, 3);   // caja
      g.fillStyle(0x5e3d20, 1).fillRect(3, 8, 18, 2);              // tapa
      g.fillStyle(0xd94f3d, 1);                                     // banderita
      if (esFull) g.fillRect(20, 0, 2, 8).fillRect(20, 0, 6, 3);
      else g.fillRect(20, 10, 6, 2);
      if (esFull) g.fillStyle(0xf6efdd, 1).fillRect(6, 6, 10, 7);  // sobre asomando
      g.generateTexture(k, 27, 34); g.destroy();
    });
    // TABLÓN DE PEDIDOS (16/8): respaldo a código (dos postes + tabla de corcho); la
    // versión _full lleva papelitos clavados — arte de PixelLab pendiente, mismo patrón que el buzón
    ["tablon_pedidos", "tablon_pedidos_full"].forEach((k, esFull) => {
      if (this.textures.exists(k)) return;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x6d4f2a, 1).fillRect(3, 10, 3, 22).fillRect(30, 10, 3, 22);   // postes
      g.fillStyle(0x8a6a3c, 1).fillRoundedRect(0, 2, 36, 18, 2);                 // marco
      g.fillStyle(0xc9a06a, 1).fillRect(2, 4, 32, 14);                            // tabla
      if (esFull) {   // papelitos clavados
        g.fillStyle(0xf6efdd, 1).fillRect(5, 6, 8, 9).fillRect(15, 5, 8, 10).fillRect(25, 7, 7, 8);
        g.fillStyle(0xa03a2a, 1).fillCircle(9, 7, 1).fillCircle(19, 6, 1).fillCircle(28, 8, 1);   // chinches
      }
      g.generateTexture(k, 36, 32); g.destroy();
    });
    if (!this.textures.exists("monticulo")) {   // respaldo a código del montículo
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x6b4a2b, 1).fillEllipse(13, 16, 24, 10);
      g.fillStyle(0x543a20, 1).fillEllipse(13, 14, 18, 8);
      g.fillStyle(0x8a6a43, 1).fillCircle(8, 12, 2).fillCircle(17, 13, 2).fillCircle(12, 10, 2);
      g.fillStyle(0xd98a9a, 1).fillCircle(15, 9, 1.5);   // el gusanito
      g.generateTexture("monticulo", 26, 22); g.destroy();
    }
    this.objs = GF.WORLD_OBJECTS.map((o, i) => {
      const lp = (G.layout && G.layout[i]) || null;                            // posición editada por el jugador
      // blueprints (12/8): si el edificio se colocó con su plano, ESA es su posición
      // (el arrastre en edición, si lo mueven después, sigue ganando)
      const op = (!lp && typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && typeof obraDe === "function") ? obraDe(o.type) : null;
      const cx = lp ? lp.cx : (op ? (op.col + 0.5) * T : o.cx), by = lp ? lp.by : (op ? (op.row + 1) * T : o.by);
      // el portal es sprite para poder animar el espiral girando; el resto sigue como imagen
      const texKey = this.textures.exists(o.key) ? o.key : "store";   // respaldo si falta el arte (p.ej. horno.png aún no bajado)
      const s = (o.key === "portal" ? this.add.sprite(cx, by, texKey) : this.add.image(cx, by, texKey)).setOrigin(0.5, 1);
      if (o.key === "portal" && this.anims.exists("portal_spin")) s.play("portal_spin");
      // edificios sin construir (blueprints 12/8): si NO colocaste el plano, el edificio
      // directamente NO EXISTE en el mapa. Si lo colocaste, se ve su OBRA (build_*) a la
      // espera de materiales. El gris viejo queda de respaldo si faltara el arte de obra.
      let oculto = false;
      if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
        /* 18/8: quien decide si el edificio EXISTE es GF.objetoPresente, la misma función que usa
           el mapa de ocupación. Antes esto tenía su propia regla (que además contaba G.layout como
           prueba de existencia) y por eso el mapa y el dibujo podían discrepar: celdas ocupadas por
           edificios que no se ven. Una sola autoridad, y no pueden separarse. */
        if (!GF.objetoPresente(GF.COLLISIONS[i] || { tipo: o.type, i })) { s.setVisible(false); oculto = true; }   // sin plano colocado: invisible
        else if (this.textures.exists("build_" + o.type)) s.setTexture("build_" + o.type);
        else s.setAlpha(0.5).setTint(0x555555);
      }
      // viernes (2): árboles y piedras bloqueados (1 activo + resto difuminado, se desbloquean en orden)
      let lockIdx = -1;
      /* 20/8: el número de orden es SOLO para los nodos de la escalera. Los que vienen dentro de un
         bloque comprado no tienen puesto en esa fila —su peaje fue el terreno— y contarlos aquí los
         numeraba como el 4º, el 5º… mientras config.js los saltaba. Dos numeraciones para la misma
         cosa, y de ahí salía «se habilita a granja nivel 1» sobre una roca ya comprada. */
      if (o.exp == null && o.type === "tree") lockIdx = __treeN++;
      if (o.exp == null && o.type === "rock") lockIdx = __rockN++;
      // 12/8 (noche): SOLO los árboles conservan el bloqueo visual — el bloqueado es un
      // RETOÑO que crece al pagarlo. Las vetas/piedras van todas a la vista y a todo
      // color: su freno es por NIVEL y avisa al intentar picarlas (nodoBloqueado).
      // 16/8 (dirección): lo que todavía NO es tuyo NO SE VE. Antes el árbol bloqueado era
      // un retoño y la roca bloqueada estaba a la vista con un cartel de nivel; ahora los
      // nodos llegan como premio al baúl y aparecen recién al colocarlos.
      const locked = o.type === "tree" && o.exp == null && !(G.treesOpen || [0]).includes(lockIdx);
      const rocaBloq = o.type === "rock" && o.exp == null && typeof nodoBloqueado === "function" && nodoBloqueado({ type: "rock", lockIdx });
      // 18/8: los nodos que trae una expansión no existen hasta que esa expansión se compró. No
      // pasan por el baúl ni por la escalera de niveles: vienen CON el terreno, que es lo que hace
      // que la compra se sienta. Su freno es haber comprado el bloque, y nada más.
      const sinExpansion = o.exp != null && (G.expansiones || 0) <= o.exp;
      if (locked || rocaBloq || sinExpansion) { s.setVisible(false); oculto = true; }
      const rw = (o.type === "ore" || o.type === "rock") ? o.w * (typeof NODO_ESCALA === "number" ? NODO_ESCALA : 0.67)   // 9/8: 0.90 — al 0.67 las pepitas no se leían
        : (o.type === "tree") ? o.w * 0.8                                   // árboles −20%
        : (o.type === "market" || o.type === "store") ? o.w * 0.8           // tiendas −20%
        : (o.type === "dummy" ? o.w * 1.25 : o.w);                          // dummy +25%
      // 15/8: si está mostrando su OBRA (build_*), se escala con la densidad del edificio
      // TERMINADO — el arte de obra es el mismo edificio a medio hacer, dibujado al mismo
      // píxel; estirar cada lienzo a rw los dejaba desparejos (obra chica/corrida vs final)
      let escala = rw / s.width;
      if (s.texture && s.texture.key.indexOf("build_") === 0 && this.textures.exists(o.key)) {
        const bi = this.textures.get(o.key).getSourceImage();
        if (bi && bi.width) escala = rw / bi.width;
      }
      s.setScale(escala); s.setDepth(by);
      if (locked && s.texture && s.texture.key === "tree_sapling") s.setScale((rw * 0.55) / s.width);   // el retoño es chico, como corresponde
      // sombra bajo árboles y edificios (detalles 29/7)
      let shadow = null;
      // los árboles NO llevan sombra: su sprite ya trae la base de tierra dibujada y la elipse quedaba abajo de la tierra
      // 12/8: los edificios YA NO llevan elipse de sombra — con el set mercadillo no quedaba
      // bien de ningún tamaño (el arte nuevo apoya directo sobre el pasto). Solo el dummy la conserva.
      if (o.type === "dummy") {   // sombra chiquita bajo el dummy
        shadow = this.add.ellipse(cx, by - 2, rw * 0.55, T * 0.2, 0x1c2a12, 0.2).setDepth(by - 0.5);
      }
      /* 18/8 (reporte del diseñador: "al regresar se reinician los nodos"). El enfriamiento
         vivía SOLO acá, en el objeto de la escena, y nacía en 0. Los cultivos sí se guardaban
         (syncPlots), los nodos no. Así que cualquier cosa que reconstruyera la escena —entrar
         a la Zona Negra, y también un simple F5— dejaba todos los árboles, rocas y vetas listos
         otra vez. No era solo un reinicio: era barra libre. Talás todo, cruzás el portal, volvés
         y talás todo de nuevo, sin límite. Con eso el ancla de 20 plata/hora no significaba nada,
         porque las horas de reloj se podían saltar.
         Ahora el enfriamiento se guarda en G.nodos, indexado por el mismo índice del objeto. */
      /* 18/8 (auditoría) — la clave era el ÍNDICE en GF.WORLD_OBJECTS. Insertar un objeto en
         cualquier sitio que no fuera el final corría todos los índices posteriores y el
         enfriamiento de un árbol caía sobre una roca. Y lo siguiente en la lista es justamente
         agregar los nodos de cada expansión. Ahora la clave es la CELDA ORIGINAL del objeto, que
         no cambia aunque el array se reordene. */
      const svn = (G.nodos || {})[o.type + ":" + o.leftCol + "," + o.baseRow];
      /* 20/8 — `exp` TIENE QUE VIAJAR AL OBJETO DE LA ESCENA. No estaba, y eso rompía dos cosas
         que solo se notan cuando la expansión se dibuja en caliente (o sea, desde hoy, que es
         cuando expandirEnVivo empezó a ejecutarse de verdad):
           · expandirEnVivo recorre this.objs buscando `o.exp` para destapar los nodos del bloque
             recién comprado. Sin ese campo la condición salía siempre por el `continue` y el árbol
             y la roca se quedaban invisibles hasta recargar la página.
           · y nodoBloqueado(o) mira `o.exp` para saber que un nodo vino con su terreno. Sin él,
             volvía a medirlo con la escalera de rocas.
         El objeto de la escena es una COPIA del de WORLD_OBJECTS: si un campo decide algo, tiene
         que estar en la copia. */
      return { i, exp: o.exp, type: o.type, ore: o.ore, cx, by, w: o.w, rw, baseKey: o.key, sprite: s, shadow,
        readyAt: (svn && svn.readyAt) || 0, halfAt: (svn && svn.halfAt) || 0, cdIni: (svn && svn.cdIni) || 0,
        lockIdx, locked, oculto };
    });
    this.objs.forEach(o => this.tintarNodo(o));   // cada veta con el color de su mineral (9/8)
    // 18/8: y la textura QUE LE TOCA POR SU ENFRIAMIENTO. Sin esto el sprite nace entero aunque el
    // nodo esté a medio regenerar, que es el fallo que se veía al volver de la Zona Negra o tras
    // un F5: árboles y rocas enteros y sin poder usarse. Ahora el sprite dice la verdad desde el
    // primer frame, porque sale del reloj y no de haber presenciado el momento del cambio.
    { const t0 = nowMs(); this.objs.forEach(o => this.aplicarTexNodo(o, t0)); }
    this.objs.forEach(o => this.letreroObra(o));  // blueprints (12/8): el cartel de materiales sobre cada obra

    // (los rótulos flotantes se quitaron: los edificios nuevos se distinguen solos
    //  y el aviso de interacción ya los nombra al acercarse)

    // portal al Bosque — ahora con su sprite cozy (arco de piedra con vórtice)
    if (window.ForestScene !== undefined || typeof ForestScene !== "undefined") {
      const px = GF.ORIG_X + GF.WORLD_W - 90, py = GF.ORIG_Y + GF.WORLD_H - 52;   // 12/8: DENTRO de la cerca · 18/8: sigue al terreno
      let pspr = null;
      if (this.textures.exists("portal")) {
        // sprite (no imagen) para que el espiral gire 360° en loop; el latido sutil se mantiene
        pspr = this.add.sprite(px, py, "portal").setOrigin(0.5, 1).setDepth(py);
        pspr.setScale((T * 1.4) / pspr.width);
        if (this.anims.exists("portal_spin")) pspr.play("portal_spin");
        this.tweens.add({ targets: pspr, scaleY: pspr.scaleY * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });   // latido sutil del vórtice
      } else {   // respaldo si falta el arte del portal: un arco oscuro dibujado (era un Text vacío)
        const g = this.add.graphics().setDepth(py);
        g.fillStyle(0x6b6357, 1).fillEllipse(0, -18, 44, 52);
        g.fillStyle(0x140f1c, 1).fillEllipse(0, -16, 30, 38);
        g.setPosition(px, py);
      }
      this.add.text(px, py + 12, "Zona Negra", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#ffe08a", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 0.5).setDepth(py);
      this.portal = { type: "portal", cx: px, by: py, sprite: pspr, w: T * 1.4 };
    }

    // (la pesca ya no usa un objeto en el piso; se pesca al acercarse al borde de la laguna)

    // timers de enfriamiento flotantes sobre árboles/rocas/nodos
    this.objs.forEach(o => {
      if (o.type === "tree" || o.type === "rock" || o.type === "ore") {
        o.timer = this.add.text(o.cx, o.by - T * 0.85, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(o.by + 3).setVisible(false);
      }
    });
    // ——— QUÉ HAY ALREDEDOR DE LA GRANJA: bosque (ahora) o mar (el modo viejo) ———
    // 17/8: esto estaba todo mezclado dentro de un solo `if (GF.ISLA)`, con el bosque colgando
    // de que EXISTIERA la textura del mar — si "isla" no cargaba, no se dibujaba el bosque.
    // Y la espuma de las olas se creaba igual con el bosque puesto: era el borde blanco
    // redondeado que se veía en las esquinas, la orilla del mar sobreviviendo al cambio.
    // Ahora son dos caminos separados que no se pisan.
    {
      const MARGEN = (GF.BOSQUE ? Math.max(this.margenBosque("x"), this.margenBosque("y")) : (GF.ISLA_MARGEN || 260)) + 900;
      // OJO con la profundidad: va DEBAJO del pasto (-1000). Estaba en -1000 igual que los
      // tiles y, al crearse después, los tapaba: el suelo se veía verde plano (9/8).
      this.add.graphics().setDepth(-1003)
        .fillStyle(GF.BOSQUE ? 0x328032 : 0x2e7fa8, 1)   // 0x328032 = el color medio del césped
        .fillRect(GF.ORIG_X - MARGEN, GF.ORIG_Y - MARGEN, GF.WORLD_W + MARGEN * 2, GF.WORLD_H + MARGEN * 2);
    }
    if (GF.BOSQUE) {
      // BLINDADO: si el bosque falla por lo que sea, el juego arranca igual. Un error acá
      // antes se llevaba puesta la escena entera y la carga se quedaba colgada.
      try { this.dibujarBosque(); } catch (e) { console.error("[bosque] no se pudo dibujar:", e); }
    } else if (GF.ISLA) {
      // COSTA (9/8): la orilla es una imagen con las transiciones terminadas (pasto → arena
      // mojada → espuma → bajío → mar), con dithering y el contorno irregular. Antes eran tres
      // rectángulos redondeados de color plano y el borde quedaba duro.
      // La genera tools/build-isla.py; su origen es (-GF.ISLA_ORIGEN, -GF.ISLA_ORIGEN).
      if (this.textures.exists("isla")) {
        const o = GF.ISLA_ORIGEN || 112;
        this.add.image(-o, -o, "isla").setOrigin(0, 0).setDepth(-1002);
      } else {   // respaldo: si el PNG no llegó, los rectángulos de siempre
        this.add.graphics().setDepth(-1002)
          .fillStyle(0x3fa3cc, 1).fillRoundedRect(-70, -70, GF.WORLD_W + 140, GF.WORLD_H + 140, 90)
          .fillStyle(0xe8d9a6, 1).fillRoundedRect(-34, -34, GF.WORLD_W + 68, GF.WORLD_H + 68, 60)
          .fillStyle(0x75975a, 1).fillRoundedRect(-8, -8, GF.WORLD_W + 16, GF.WORLD_H + 16, 34);
      }
      // espuma: líneas claras que van y vienen sobre la orilla. SOLO con mar: con bosque
      // quedaban dibujadas encima del césped como un contorno blanco fantasma.
      this.olas = this.add.graphics().setDepth(-999);
      this.olasT = 0;
    }
    this.rebuildCollisions();
    GF.scene = "farm";
    window.farmScene = this;   // para refrescar la flecha del tutorial desde la UI
    this.ultimaAccion = nowMs();   // el reloj del "jugador perdido" arranca al entrar a la escena
    if (window.syncPlacingUI) syncPlacingUI(false);   // 13/8: la escena arranca sin nada "en la mano"
    this.time.delayedCall(400, () => { if (typeof tutoSync === "function") tutoSync(true); else this.updateTutoArrow(); });   // cartel + flecha del tutorial

    // parcelas (ciclo arcade: seco → plantar semilla elegida → creciendo (con timer) → listo → cosechar)
    const savedPlots = Array.isArray(G.plots) ? G.plots : [];
    this.crearParcela = (i, savedPlots) => {
      const pl = GF.PLOTS[i];
      const T = GF.TILE;
      if (!this.plotGrounds[i]) {   // el suelo de una parcela nacida después del arranque
        this.plotGrounds[i] = this.textures.exists("plot")
          ? this.add.image((pl.col + 0.5) * T, (pl.row + 0.5) * T, "plot").setDisplaySize(T, T).setDepth(-998)
          : null;
      }
      const cx = (pl.col + 0.5) * T, cy = (pl.row + 0.5) * T;
      const spr = this.add.image(cx, cy + 6, "sprout").setOrigin(0.5, 0.95).setDepth(cy).setVisible(false);
      spr.setScale((T * 0.75) / spr.width);
      const emo = this.add.text(cx, cy + 8, "", { fontSize: Math.round(T * 0.72) + "px" }).setOrigin(0.5, 0.95).setDepth(cy).setVisible(false);
      const timer = this.add.text(cx, cy - T * 0.55, "", { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(cy + 1).setVisible(false);
      const obj = { type: "plot", i, cx, by: cy, state: "dry", readyAt: 0, cropKey: null, spr, emo, timer, ground: this.plotGrounds[i] || null };
      const owned = Math.max(2, Math.min(GF.PLOTS.length, G.plotsOwned || 2));   // viernes (2): se nace con 2 parcelas
      if (i >= owned) {   // 16/8: parcela todavía no entregada → NO SE VE (llega como premio al baúl)
        obj.state = "locked";
        /* 18/8 (reporte del diseñador: un cuadrado de tierra clara asomando detrás de una parcela).
           Acá había DOS CAMBIOS DE DÍAS DISTINTOS QUE SE CONTRADECÍAN. El del 13/8 le ponía a la
           parcela bloqueada la textura del parche silvestre "a todo color"; el del 16/8 decidió que
           lo que todavía no es tuyo NO SE VE y le puso setVisible(false) delante. Quedaron los dos:
           el suelo se oculta y, acto seguido, se le asigna una textura que nadie va a ver — salvo
           que cualquier otra cosa lo vuelva a mostrar, y ahí aparece el parche de tierra.
           Es la misma clase de fallo que la parcela que no llegaba y que el baúl cerrado: dos
           decisiones correctas por separado que nadie volvió a cruzar.
           Se queda la del 16/8, que es la vigente, y el estado del suelo pasa a derivarse SIEMPRE
           de la verdad en pintarSueloParcela() en vez de depender del orden de las asignaciones. */
        if (spr) spr.setVisible(false); if (emo) emo.setVisible(false); if (timer) timer.setVisible(false);
        this.pintarSueloParcela(obj, true);
        return obj;
      }
      const sv = savedPlots[i];   // restaura lo plantado antes del refresh (ignora estados viejos como "wet")
      if (sv && (sv.state === "growing" || sv.state === "ready")) {
        obj.state = sv.state; obj.readyAt = sv.readyAt || 0; obj.cropKey = sv.cropKey || null;
        obj.witherAt = 0;   // 2/8: sin marchitado
        obj.growTotal = sv.growTotal || 0;
        this.applyPlotVisual(obj);
      } else if (sv && sv.state === "withered") {
        // 2/8: los cultivos que quedaron marchitos de antes se recuperan como LISTOS si se sabe qué eran; si no, parcela libre
        if (sv.cropKey) { obj.state = "ready"; obj.cropKey = sv.cropKey; obj.witherAt = 0; this.applyPlotVisual(obj); }
        else { obj.state = "dry"; obj.cropKey = null; this.applyPlotVisual(obj); }
      }
      return obj;
    };
    this.plots = GF.PLOTS.map((pl, i) => this.crearParcela(i, savedPlots));
    this.syncPlots();

    // amenazas (jabalíes)
    this.threats = [];
    this.nextThreatAt = nowMs() + 45000;

    // personaje
    const hero = this.add.sprite(470, 320, "hero_idle_0").setOrigin(0.5, 1);
    this.idleScale = GF.SIZE.hero / hero.height;
    // el granjero definitivo comparte escala de cuerpo entre quieto y acciones (mismo lienzo PixelLab)
    this.actScale = this.idleScale;
    hero.setScale(this.idleScale);
    hero.play("idle");
    this.hero = hero; this.facing = "east"; this.moveTarget = null; this.path = null; this.action = null; this.pendingObj = null;
    this.updateSkins();   // sombrero / pétalos / granja legendaria, si los tenías puestos
    if (GF.NO_WALK) hero.setVisible(false);   // el granjero solo se ve en la Zona Negra
    this.updateAura();

    // clic derecho sobre una parcela seca: rueda de sembrado rápido
    this.input.mouse.disableContextMenu();

    // clic: si pegás a un objeto, caminá hacia él e interactuá; si no, movete al punto
    this.input.on("pointerdown", (pt) => {
      this.ultimaAccion = nowMs();   // 14/8: cualquier clic = jugador activo (las mariposas señalan solo al "perdido")
      /* 21/8 (diseñador: "con doce semillas, el clic derecho planta la última en vez de abrir la
         rueda"). El culpable: pt.rightButtonDown() lee pointer.buttons, y según la versión de
         Phaser / el navegador ese estado puede llegar SIN ACTUALIZAR durante el propio pointerdown
         del botón derecho. Cuando pasa, el clic derecho cae en la rama IZQUIERDA, arma clickHit y
         hold, y el disparo del update ("un clic = un golpe, sin esperar a soltar") PLANTA la
         semilla seleccionada a los pocos milisegundos — sin rueda. El evento NATIVO del DOM sí es
         fiable: button === 2 siempre en el pointerdown del derecho. Se miran los dos. */
      const clicDerecho = pt.rightButtonDown() || (pt.event && (pt.event.button === 2 || ((pt.event.buttons || 0) & 2) === 2));
      if (clicDerecho) {
        if (GF.editMode) {
          if (this.placing) { this.cancelarColocar(); return; }   // clic derecho cancela el "colocar con clic"
          // en edición el clic derecho levanta el adorno que haya abajo (vuelve a la bolsa)
          const ad = this.adornoEnPunto(pt.worldX, pt.worldY);
          if (ad) this.levantarAdorno(ad);
          return;
        }
        if (GF.uiOpen) return;
        const wx = pt.worldX, wy = pt.worldY;
        // fixs.docx #12 (11/8): clic derecho sobre un animal lo ALIMENTA ahí mismo (la función
        // existía pero solo dentro de la ventana del Establo y nadie la encontraba)
        { const an = this.animalEnPunto && this.animalEnPunto(wx, wy);
          if (an && typeof alimentarAnimal === "function") { alimentarAnimal(an.k); return; } }
        for (const pl of this.plots) {
          if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) {
            if (pl.state === "dry" && typeof showSeedWheel === "function") showSeedWheel(pt.event.clientX, pt.event.clientY, pl);
            return;
          }
        }
        return;
      }
      if (GF.editMode && this.placing) {   // 13/8: colocar se resuelve al SOLTAR — así el arrastre panea la cámara
        this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false };
        return;
      }
      if (GF.editMode) {   // modo edición: agarrar adorno, objeto, parcela o laguna bajo el cursor
        const wx = pt.worldX, wy = pt.worldY; let hit = null, bd = 1e9;
        // los adornos van PRIMERO: son chicos y suelen quedar encima de una parcela o pegados
        // a un edificio, así que si no se miran antes nunca se los podría agarrar.
        const ad = this.adornoEnPunto(wx, wy);
        if (ad) { this.dragDeco = ad; return; }
        for (const o of this.objs) { if (o.type === "fish") continue; if (this.hitsSprite(o.sprite, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } } }
        // Un árbol crecido está partido en copa y tronco para que lo meza el viento. Mientras se
        // lo arrastra vuelve a ser UN solo dibujo: entero, quieto y sin viento, que es como uno
        // quiere ver algo que está colocando. Al soltarlo, el viento lo vuelve a partir.
        if (hit) { hit.origCx = hit.cx; hit.origBy = hit.by; this.dragObj = hit; this.copaSacar(hit); if (hit.sprite) hit.sprite.setAngle(0); return; }
        for (const pl of this.plots) { if (pl.state === "locked") continue; if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { this.dragPlot = pl; return; } }
        if (this.pondImg && this.pondDist(wx, wy) < 1) { this.dragPond = true; return; }
        this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false };   // 13/8: nada agarrado → el arrastre panea también en edición
        return;
      }
      if (GF.uiOpen) return;
      const wx = pt.worldX, wy = pt.worldY;
      this.hold = { sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, active: false, t0: nowMs() };   // por si esto se convierte en un arrastre
      let hit = null, bd = 1e9;
      for (const o of this.objs.concat(this.threats)) {
        if (this.hitsSprite(o.sprite, wx, wy)) { const d = Math.hypot(o.cx - wx, o.by - wy); if (d < bd) { bd = d; hit = o; } }
      }
      // 16/8: una parcela que todavía no es tuya es CÉSPED — ni se ve ni se puede clickear
      if (!hit) { for (const pl of this.plots) { if (pl.state === "locked") continue; if (Math.abs(wx - pl.cx) < T / 2 && Math.abs(wy - pl.by) < T / 2) { hit = pl; break; } } }
      if (!hit) { const an = this.animalEnPunto(wx, wy); if (an) hit = { type: "animal", k: an.k, cx: an.spr.x, by: an.spr.y }; }   // animal del corral
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;   // clic en el portal : caminar y teletransportarse
      if (this.action && !GF.NO_WALK) {   // acción en curso: encolar el próximo objetivo (hasta 7) sin esperar la animación
        if (hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("En cola (" + this.queue.length + ")"); }
        }
        return;
      }
      if (GF.NO_WALK) {
        // granja de un clic: la acción se resuelve al SOLTAR, no al apretar. Si no fuese así,
        // arrastrar la vista empezando encima de un árbol lo talaba antes de poder mover la cámara.
        this.clickHit = hit || null;
        this.clickPond = (!hit && this.pondDist(wx, wy) < 1.05);
        return;
      }
      if (hit) {
        if (this.pendingObj && this.pendingObj !== hit && (hit.type === "plot" || hit.type === "tree" || hit.type === "rock" || hit.type === "ore")) {
          if (!this.queue.includes(hit) && this.queue.length < 7) { this.queue.push(hit); this.markQueued(hit); toast("En cola (" + this.queue.length + ")"); }
        } else { this.pendingObj = hit; this.goTo(hit.cx, hit.by + 18); }
      }
      else if (this.nearPond() && this.pondDist(wx, wy) < 1.05) { this.pendingObj = null; this.moveTarget = null; this.tryFish(wx, wy); }
      else { this.pendingObj = null; this.goTo(wx, wy); }
    });
    // arrastre en modo edición: mueve el sprite y resalta la celda destino (verde libre / rojo ocupada)
    this.input.on("pointermove", (pt) => {
      if (!GF.editMode) {
        if (GF.CAM_PAN) {   // ARRASTRAR la granja (como SFL): el mundo se mueve con el cursor
          if (!this.hold || GF.uiOpen || !pt.isDown || pt.rightButtonDown()) return;
          if (!this.hold.active && Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) < 10) return;
          this.hold.active = true;
          const c = this.cameras.main, z = c.zoom || 1;
          const dx = (this.hold.px == null ? pt.x : this.hold.px) - pt.x;
          const dy = (this.hold.py == null ? pt.y : this.hold.py) - pt.y;
          this.hold.px = pt.x; this.hold.py = pt.y;
          // 17/8: NADA de recortar a mano. scrollX/scrollY NO son el borde visible: en Phaser el
          // área visible se CENTRA y mide alto/zoom, así que con zoom != 1 mi cuenta se separaba
          // de la suya. Con el navegador al 25% los dos rangos ni se solapaban: yo ponía un
          // valor, Phaser lo corregía a otro, y la cámara quedaba clavada sin poder arrastrar.
          // La cámara YA tiene setBounds(camLim): que recorte ella, que sabe hacerlo bien.
          c.scrollX += dx / z;
          c.scrollY += dy / z;
          return;
        }
        // CLIC SOSTENIDO: si mantenés apretado y movés el cursor, el granjero te sigue
        // (rodeando árboles y edificios) hasta el punto que estés señalando
        if (!this.hold || GF.uiOpen || !pt.isDown || pt.rightButtonDown()) return;
        if (!this.hold.active && Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) < 16) return;   // clic corto ≠ arrastre
        if (!this.hold.active) {
          if (this.action) return;   // con una acción en curso el arrastre no manda (no borra la cola)
          this.hold.active = true; this.pendingObj = null; this.clearQueue();
        }
        this.holdSeek(pt.worldX, pt.worldY);
        return;
      }
      if (!this.editHl) this.editHl = this.add.rectangle(0, 0, T, T, 0x7ec95a, 0.35).setOrigin(0, 1).setDepth(99998);
      // 13/8: modo COLOCAR — arrastrar panea la cámara y el cursor muestra la celda (verde/rojo)
      if (this.placing) {
        if (this.hold && pt.isDown && !pt.rightButtonDown() &&
            (this.hold.active || Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) >= 8)) {
          this.hold.active = true;
          const c = this.cameras.main, z = c.zoom || 1;
          const dx = this.hold.px - pt.x, dy = this.hold.py - pt.y;
          this.hold.px = pt.x; this.hold.py = pt.y;
          // 17/8: NADA de recortar a mano. scrollX/scrollY NO son el borde visible: en Phaser el
          // área visible se CENTRA y mide alto/zoom, así que con zoom != 1 mi cuenta se separaba
          // de la suya. Con el navegador al 25% los dos rangos ni se solapaban: yo ponía un
          // valor, Phaser lo corregía a otro, y la cámara quedaba clavada sin poder arrastrar.
          // La cámara YA tiene setBounds(camLim): que recorte ella, que sabe hacerlo bien.
          c.scrollX += dx / z;
          c.scrollY += dy / z;
        }
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), GF.C0, GF.C1 - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), GF.R0, GF.R1 - 1);
        /* 18/8: el marcador y la regla tienen que ser EL MISMO código. Antes el rectángulo solo
           se ensanchaba para las obras, así que un ÁRBOL —que mide dos celdas— se marcaba en verde
           sobre una celda y al soltarlo fallaba. huellaColocar() es ahora la única autoridad. */
        const hu = this.huellaColocar(col, row);
        this.editHl.setPosition(hu.c0 * T, (row + 1) * T).setSize(hu.ancho * T, T)
          .setFillStyle(hu.libre ? 0x7ec95a : 0xd9534f, 0.4).setVisible(true);
        this.dibujarOcupadas();   // 18/8: mientras colocás, se ve QUÉ celdas están tomadas
        return;
      }
      if (this.dragDeco) {
        const a = this.dragDeco;
        a.g.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), GF.C0, GF.C1 - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), GF.R0, GF.R1 - 1);
        this.editHl.setPosition(col * T, (row + 1) * T).setSize(T, T)
          .setFillStyle(this.celdaLibreAdorno(col, row, a.i) ? 0x7ec95a : 0xd9534f, 0.4).setVisible(true);
      } else if (this.dragObj) {
        const o = this.dragObj;
        o.sprite.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        if (o.shadow) o.shadow.setPosition(pt.worldX, pt.worldY - 3);
        const wCells = Math.max(1, Math.round(o.w / T));
        const leftCol = Phaser.Math.Clamp(Math.round((pt.worldX - wCells * T / 2) / T), GF.C0, GF.C1 - wCells);
        const baseRow = Phaser.Math.Clamp(Math.round(pt.worldY / T), GF.R0 + 1, GF.R1);
        const blocked = this.placeBlocked(o, leftCol, baseRow, wCells);
        this.editHl.setPosition(leftCol * T, baseRow * T).setSize(wCells * T, T)
          .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.4).setVisible(true);
      } else if (this.dragPlot) {
        const pl = this.dragPlot;
        if (pl.ground) pl.ground.setPosition(pt.worldX, pt.worldY).setDepth(99999);
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), GF.C0, GF.C1 - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), GF.R0, GF.R1 - 1);
        const blocked = this.plotSpotBlocked(pl, col, row);
        this.editHl.setPosition(col * T, (row + 1) * T).setSize(T, T)
          .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.4).setVisible(true);
      } else if (this.dragPond) {
        const p2 = GF.POND;
        this.pondImg.setPosition(pt.worldX, pt.worldY);
        const col = Phaser.Math.Clamp(Math.round(pt.worldX / T - p2.cols / 2), GF.C0, GF.C1 - p2.cols);
        const row = Phaser.Math.Clamp(Math.round(pt.worldY / T - p2.rows / 2), GF.R0, GF.R1 - p2.rows);
        const blocked = this.pondSpotBlocked(col, row);
        this.editHl.setPosition(col * T, (row + p2.rows) * T).setSize(p2.cols * T, p2.rows * T)
          .setFillStyle(blocked ? 0xd9534f : 0x7ec95a, 0.3).setVisible(true);
      } else if (this.hold && pt.isDown && !pt.rightButtonDown()) {
        // 13/8: en edición, con nada agarrado, el arrastre panea la cámara igual que en modo normal
        if (this.hold.active || Math.hypot(pt.x - this.hold.sx, pt.y - this.hold.sy) >= 8) {
          this.hold.active = true;
          const c = this.cameras.main, z = c.zoom || 1;
          const dx = this.hold.px - pt.x, dy = this.hold.py - pt.y;
          this.hold.px = pt.x; this.hold.py = pt.y;
          // 17/8: NADA de recortar a mano. scrollX/scrollY NO son el borde visible: en Phaser el
          // área visible se CENTRA y mide alto/zoom, así que con zoom != 1 mi cuenta se separaba
          // de la suya. Con el navegador al 25% los dos rangos ni se solapaban: yo ponía un
          // valor, Phaser lo corregía a otro, y la cámara quedaba clavada sin poder arrastrar.
          // La cámara YA tiene setBounds(camLim): que recorte ella, que sabe hacerlo bien.
          c.scrollX += dx / z;
          c.scrollY += dy / z;
        }
      }
    });
    this.input.on("pointerup", (pt) => {
      if (this.editHl) this.editHl.setVisible(false);
      // 13/8: modo COLOCAR — si el clic no fue un paneo, se coloca en la celda al SOLTAR
      if (GF.editMode && this.placing) {
        const fuePan = !!(this.hold && this.hold.active);
        this.hold = null;
        if (!fuePan && !pt.rightButtonReleased()) this.colocarEn(pt.worldX, pt.worldY);
        return;
      }
      // granja de un clic: acá se resuelve la acción, solo si NO fue un arrastre de cámara
      if (GF.NO_WALK && !GF.editMode && !GF.uiOpen && (this.clickHit || this.clickPond)) {
        const arrastro = !!(this.hold && (this.hold.active || this.hold.disparo));   // ya paneó, o el golpe ya salió sin esperar a soltar
        const hit = this.clickHit, pond = this.clickPond;
        this.clickHit = null; this.clickPond = false;
        // SIN COLA (4/8): un clic = un golpe, y se actúa directo sobre lo que tocás.
        // PERO el clic que cae mientras dura el candado NO se tira: se guarda y sale enseguida.
        // Sin esto, tocando rápido (que es como se juega) se perdían golpes y se sentía trabado.
        const soltoDerecho = pt.rightButtonReleased() || (pt.event && pt.event.button === 2);   // 21/8: misma armadura que en pointerdown
        if (!arrastro && !soltoDerecho) {
          if (this.action) {
            // 16/8 (dirección: "me frena para talar rápido"): con ACT_IMPACTO = 0 el golpe YA
            // pegó en el primer frame — lo que queda de la acción es SOLO animación. Si volvés
            // a tocar el MISMO objetivo, esa animación se corta y el golpe se cierra al
            // instante: el juego responde a la velocidad de tus clics, no a la del reloj de
            // la animación. Así ningún valor de ACT_DUR (ni local ni pisado desde la nube)
            // puede volver a sentirse pegajoso.
            const k = this.action.kind;
            const golpeDado = (k === "chop" || k === "mine") ? !!this.action.golpeYa : true;   // en talar/picar, solo después de que el hachazo pegó (si no, se perdería el destello)
            const rapida = k !== "fish";   // la pesca es un cast largo a propósito: no se corta
            // 16/8 v2 (dirección: "en los cultivos todavía se siente el delay"): el corte vale
            // para CUALQUIER objetivo rápido, no solo el mismo. Sembrar y cosechar se hace
            // saltando de parcela en parcela, así que el candado se sentía justo ahí: tocabas
            // la parcela de al lado y el clic quedaba esperando a que terminara la anterior.
            const destinoRapido = hit && (hit.type === "tree" || hit.type === "rock" || hit.type === "ore" || hit.type === "plot");
            if (rapida && golpeDado && destinoRapido) {
              this.finishAction();                        // cierra la acción en curso YA
              if (!this.action) { this.pendingObj = null; this.interactWith(hit); }   // y arranca la siguiente
              return;
            }
            // el clic que cae durante el candado no se tira: se guarda UNO y sale enseguida.
            // Vale para nodos y para parcelas (cosechar una fila seguida es lo más común).
            const n = hit && (hit.type === "tree" || hit.type === "rock" || hit.type === "ore" || hit.type === "plot");
            if (n) this.buffer = { o: hit, t: nowMs() };
          } else if (hit) { this.pendingObj = null; this.interactWith(hit); }
          else if (pond) this.tryFish(pt.worldX, pt.worldY);
        }
      }
      this.clickHit = null; this.clickPond = false;
      // al soltar el clic sostenido, el granjero sigue caminando hasta el último punto señalado
      if (this.hold) { if (!GF.CAM_PAN && this.hold.active && this.holdPend) { const p = this.holdPend; this.holdPend = null; this.holdSeek(p.x, p.y); } this.hold = null; }
      if (!GF.editMode) { this.dragObj = this.dragPlot = this.dragDeco = null; this.dragPond = false; return; }
      // soltar un ADORNO
      if (this.dragDeco) {
        const a = this.dragDeco; this.dragDeco = null;
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), GF.C0, GF.C1 - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), GF.R0, GF.R1 - 1);
        if (!this.celdaLibreAdorno(col, row, a.i)) {
          a.g.setPosition(a.cx, a.by).setDepth(a.by);
          toast(this.porQueNoEntra(col, row, -1) || "Ahí ya hay algo — elegí otra celda"); return;
        }
        const d = (G.decos || [])[a.i];
        if (d) { d.col = col; d.row = row; }
        this.syncAdornos();
        if (typeof saveFarm === "function") saveFarm(true);
        return;
      }
      // soltar una PARCELA
      if (this.dragPlot) {
        const pl = this.dragPlot; this.dragPlot = null;
        const col = Phaser.Math.Clamp(Math.floor(pt.worldX / T), GF.C0, GF.C1 - 1);
        const row = Phaser.Math.Clamp(Math.floor(pt.worldY / T), GF.R0, GF.R1 - 1);
        if (this.plotSpotBlocked(pl, col, row)) {
          if (pl.ground) pl.ground.setPosition(pl.cx, pl.by).setDepth(-998);
          toast("Ahí ya hay algo — elegí otra celda"); return;
        }
        this.moverParcela(pl, col, row);
        if (typeof saveFarm === "function") saveFarm(true);
        return;
      }
      // soltar la LAGUNA
      if (this.dragPond) {
        this.dragPond = false;
        const p2 = GF.POND;
        const col = Phaser.Math.Clamp(Math.round(pt.worldX / T - p2.cols / 2), GF.C0, GF.C1 - p2.cols);
        const row = Phaser.Math.Clamp(Math.round(pt.worldY / T - p2.rows / 2), GF.R0, GF.R1 - p2.rows);
        const pcx0 = (p2.col + p2.cols / 2) * T, pcy0 = (p2.row + p2.rows / 2) * T;
        if (this.pondSpotBlocked(col, row)) {
          this.pondImg.setPosition(pcx0, pcy0);
          toast("La laguna no entra ahí"); return;
        }
        p2.col = col; p2.row = row;
        this.pondImg.setPosition((col + p2.cols / 2) * T, (row + p2.rows / 2) * T);
        this.pondFish.forEach(f => { const np = this.pondPoint(); f.s.setPosition(np.x, np.y); f.tgt = this.pondPoint(); });
        G.layoutPond = { col, row };
        // la grilla del pathfinding está cacheada hasta un invalidate() explícito: sin esto el
        // A* seguía creyendo que el agua estaba en el lugar viejo y armaba rutas que cruzaban
        // la laguna nueva y rodeaban un charco que ya no existe (10/8)
        this.rebuildCollisions();
        if (typeof saveFarm === "function") saveFarm(true);
        return;
      }
      if (!this.dragObj) return;
      const o = this.dragObj, wCells = Math.max(1, Math.round(o.w / T));
      const leftCol = Phaser.Math.Clamp(Math.round((pt.worldX - wCells * T / 2) / T), GF.C0, GF.C1 - wCells);
      const baseRow = Phaser.Math.Clamp(Math.round(pt.worldY / T), GF.R0 + 1, GF.R1);
      if (this.placeBlocked(o, leftCol, baseRow, wCells)) {   // ocupado: devolver a su lugar
        o.sprite.setPosition(o.origCx, o.origBy).setDepth(o.origBy);
        if (o.shadow) o.shadow.setPosition(o.origCx, o.origBy - 3).setDepth(o.origBy - 0.5);
        if (o.timer) o.timer.setPosition(o.origCx, o.origBy - T * 0.85);
        toast("Ahí ya hay algo — elegí otra celda");
        this.dragObj = null; return;
      }
      o.cx = leftCol * T + wCells * T / 2; o.by = baseRow * T;
      o.sprite.setPosition(o.cx, o.by).setDepth(o.by);
      if (o.shadow) o.shadow.setPosition(o.cx, o.by - 1).setDepth(o.by - 0.5);   // 12/8: la sombra pegada al borde inferior
      if (o.timer) o.timer.setPosition(o.cx, o.by - T * 0.85);
      if (o.type === "cofre") { const c = G.chests && G.chests[o.chestIdx]; if (c) { c.col = leftCol; c.row = baseRow - 1; } }
      else { if (!G.layout) G.layout = {}; G.layout[o.i] = { cx: o.cx, by: o.by }; }
      GF.ocupCambio();   // 18/8: el mapa de ocupación tiene que enterarse
      this.rebuildCollisions();
      if (typeof saveFarm === "function") saveFarm(true);
      this.dragObj = null;
      this.updateTutoArrow();   // fixs.docx #15 (11/8): la flecha del tutorial sigue al edificio movido (antes hacía falta F5)
      this.letreroObra(o);      // blueprints (12/8): el cartel de materiales acompaña a la obra movida
    });

    // bocanadas de humo IRREGULARES (blobs procedurales, no círculos)
    if (!this.textures.exists("puff0")) {
      for (let p = 0; p < 3; p++) {
        const gg = this.make.graphics({ add: false });
        gg.fillStyle(0xffffff, 1);
        gg.fillCircle(8, 8, 5);
        gg.fillCircle(11 + p, 6, 3.4);
        gg.fillCircle(5 - p, 9, 3);
        gg.fillCircle(9 - p * 2, 12, 2.6);
        gg.fillCircle(12, 10 + p, 2.2);
        gg.generateTexture("puff" + p, 18, 18);
        gg.destroy();
      }
    }
    // el humo nace un poco POR ENCIMA de la boca de la chimenea, no encima del ladrillo
    // HUMO DE LAS CHIMENEAS (9/8, reescrito). Antes cada edificio tenía su corrimiento a ojo
    // y el arte nuevo movió las chimeneas de lugar: el humo salía del techo o del aire. Ahora
    // sale de GF.CHIMENEA, que está medido sobre el PNG, y se inclina con el viento como los árboles.
    const smokeFrom = (obj, tint, cond, cada) => {
      const ch = (GF.CHIMENEA && GF.CHIMENEA[obj.type]) || { dx: 0, dy: 0.01 };
      this.time.addEvent({ delay: cada || 850, loop: true, callback: () => {
        if (!cond()) return;
        const sp = obj.sprite; if (!sp || !sp.visible) return;
        const alto = sp.displayHeight || (obj.rw || obj.w);
        const px = obj.cx + (obj.rw || obj.w) * ch.dx + (Math.random() * 5 - 2.5);
        const py = obj.by - alto + alto * ch.dy - 2;
        const s = this.add.image(px, py, "puff" + ((Math.random() * 3) | 0))
          .setTint(tint).setAlpha(0.55)
          .setScale(0.6 + Math.random() * 0.5).setAngle(Math.random() * 360)
          .setDepth(obj.by + 1);
        // la misma onda que mece los árboles empuja la bocanada: el humo no sube recto
        const viento = VIENTO_ON ? Math.sin(this.time.now / 1000 * Math.PI * 2 / Math.max(0.2, VIENTO_SEG)) * 16 : 0;
        this.tweens.add({ targets: s, y: py - 26 - Math.random() * 14, x: px + (Math.random() * 12 - 6) + viento,
          scale: s.scale * 2.2, angle: s.angle + (Math.random() * 70 - 35), alpha: 0,
          duration: 2300 + Math.random() * 700, onComplete: () => s.destroy() });
      }});
    };
    const storeObj = this.objs.find(o => o.type === "store");
    if (storeObj) smokeFrom(storeObj, 0xd8d2c4, () => !!(G.built && G.built.store));     // 13/8: humo solo con la herrería CONSTRUIDA
    // fragua: media por defecto, encendida mientras se trabaja en la Herrería (detalles jueves)
    this.storeObj = storeObj;
    this.updateForge();
    this.crearCorral();       // patio de los animales del Establo
    this.syncAdornos();       // adornos comprados en la Tienda (10/8)
    this.syncAnimales();      // aparecen los que ya tenés
    this.syncMascota();       // y la mascota, si tenés una puesta
    this.crearNubes();        // nubes que cruzan y proyectan sombra
    this.crearMariposas();    // mariposas que se posan sobre los cultivos listos
    this.arrancarBrilloVetas();   // chispitas sobre las vetas caras que están listas (9/8)
    const cocinaObj = this.objs.find(o => o.type === "cocina");
    if (cocinaObj) smokeFrom(cocinaObj, 0xefe9db, () => !!(G.built && G.built.cocina));   // 13/8: humo solo con la cocina CONSTRUIDA (antes humeaba sobre la obra o el pasto)
    if (cocinaObj) smokeFrom(cocinaObj, 0xffffff, () => !!(G.built && G.built.cocina) && (typeof cookList === "function" ? cookList().length > 0 : !!G.cooking));   // …y el doble mientras se cocina
    // HORNO DE PIEDRA: mismo humo que los demás (antes tenía el suyo propio, hecho con
    // elipses dibujadas, mucho más flojo y difícil de ver). Solo humea si está construido.
    const hornoObj = this.objs.find(o => o.type === "horno");
    if (hornoObj) smokeFrom(hornoObj, 0xcfcabb, () => !!(G.built && G.built.horno), 900);

    // cofres depósito colocados por el jugador (los que están en la bolsa NO se colocan solos)
    (G.chests = G.chests || []).forEach((c, idx) => { if (c.col != null) this.spawnChest(idx); });
    this.crearExcavaciones();   // los 3 montículos del día (15/8)
    this.dibujarExpansion();     // 18/8: el lote que podés comprar, marcado en el bosque
    // 18/8: repintar TODOS los suelos de parcela al terminar de armar la escena. Es barato y cierra
    // la clase de fallo entera: da igual en qué orden se hayan tocado antes, acá quedan como dice
    // el estado. El parche de tierra colgado que reportó dirección salía justo de ese desorden.
    try { this.refreshPlotLocks(); } catch (e) {}

    { this.camLim = this.limiteVista();
      this.cameras.main.setBounds(this.camLim.x1, this.camLim.y1, this.camLim.x2 - this.camLim.x1, this.camLim.y2 - this.camLim.y1); }
    if (!GF.CAM_PAN) this.cameras.main.startFollow(hero, false, 0.15, 0.15);
    // 17/8 (dirección): la granja va CENTRADA en el bosque. El 0.42 de antes la subía un poco
    // para despejar la barra de abajo, pero con el anillo alrededor eso se lee como descentrado.
    // 18/8: el centro del mundo ya no es (W/2, H/2) — el origen puede ser negativo.
    else { this.cameras.main.stopFollow(); this.cameras.main.centerOn(GF.ORIG_X + W / 2, GF.ORIG_Y + H / 2); }
    /* 18/8: si venimos de un reinicio con telón, la vista vuelve a donde estaba — o mira el
       bloque que acabás de comprar. Sin esto, cada reinicio te devolvía al centro del mundo con
       el zoom por defecto, y ESO es lo que se sentía como "me resetea la vista", más que el corte.
       El zoom se restaura ANTES de fitCamera porque fitCamera lo deriva de zoomUser. */
    const _ct = GF._camTras; GF._camTras = null;
    this.zoomUser = (_ct && _ct.zoomUser) || 1;
    this.fitCamera();
    if (_ct) {
      try {
        if (_ct.mirar) this.cameras.main.centerOn(_ct.mirar.x, _ct.mirar.y);
        else if (_ct.scrollX != null) this.cameras.main.setScroll(_ct.scrollX, _ct.scrollY);
      } catch (e) {}
    }
    this.scale.on("resize", this.fitCamera, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.fitCamera, this);
      if (this.brilloEv) { this.brilloEv.remove(); this.brilloEv = null; }   // al irse a la plaza o al bosque, se apaga
    });
    // rueda del mouse: acercar/alejar la cámara de la granja
    this.input.on("wheel", (ptr, over, dx, dy) => {
      if (GF.CAM_PAN && (ptr.event.ctrlKey || ptr.event.shiftKey)) {   // Ctrl/Shift + rueda = acercar o alejar
        // el mínimo lo calcula fitCamera a partir de lo que mide el mapa y la ventana:
        // así el jugador SIEMPRE puede alejar hasta ver el mapa entero, con cualquier zoom
        // de navegador. El 0,6 fijo de antes se lo impedía.
        const uMin = this.zoomUserMin != null ? this.zoomUserMin : 0.6;
        this.zoomUser = Phaser.Math.Clamp((this.zoomUser || 1) * (dy > 0 ? 0.92 : 1.08), uMin, 2.4);
        this.fitCamera(); return;
      }
      if (GF.CAM_PAN) {   // SFL: la rueda DESPLAZA la granja
        this.cameras.main.scrollY += dy * 0.6;   // el recorte lo hace setBounds, no nosotros
        return;
      }
      this.zoomUser = Phaser.Math.Clamp(this.zoomUser * (dy > 0 ? 0.9 : 1.1), 0.4, 2.4);
      this.fitCamera();
    });

    this.keys = this.input.keyboard.addKeys({
      up:"W", down:"S", left:"A", right:"D",
      aup:"UP", adown:"DOWN", aleft:"LEFT", aright:"RIGHT",
      act:"E", act2:"SPACE",
    }, false);   // enableCapture=false: no bloquea el tipeo en el chat
    // (la M ya no teletransporta a la plaza — ahora abre/cierra el menú, detalles 29/7)
    this.keys.act.on("down", () => this.doInteract());
    this.keys.act2.on("down", () => this.doInteract());

    // La granja YA está dibujada: recién ahora se saca la pantalla de carga y se abren las
    // ventanas que esperaban (cofre diario). Todo aparece junto, no una cosa antes que la otra.
    if (typeof juegoListo === "function") this.time.delayedCall(60, juegoListo);
  }

  drawOlas(dt) {
    if (!this.olas) return;
    // Se redibujaba en cada frame: dos strokeRoundedRect de 1300x740 con esquinas redondeadas,
    // o sea reteselar y volver a subir la geometría 60 veces por segundo. El movimiento real
    // es un seno de ~1 Hz, así que a 10 fps se ve exactamente igual (10/8).
    this._olasAcc = (this._olasAcc || 0) + dt;
    if (this._olasAcc < 0.1) return;
    dt = this._olasAcc; this._olasAcc = 0;
    this.olasT = (this.olasT || 0) + dt;
    const t = this.olasT, W2 = GF.WORLD_W, H2 = GF.WORLD_H, g = this.olas;
    g.clear(); g.lineStyle(2, 0xdff3ff, 0.30);
    for (let i = 0; i < 2; i++) {
      const o = 62 + i * 16 + Math.sin(t * 0.9 + i) * 5;
      g.strokeRoundedRect(-20 - o, -20 - o, W2 + 40 + o * 2, H2 + 40 + o * 2, 50 + o);
    }
  }

  // ¿ESTE PUNTO SE VE, O LO TAPA EL BOSQUE? (17/8)
  // Misma métrica que dibujarBosque, en un solo sitio para que no se puedan desincronizar.
  // La usan los adornos del césped: sembrarlos por toda el área era tirarlos, porque van a
  // profundidad -999,5 y el bosque se dibuja a -999, o sea POR ENCIMA. Los que caían bajo los
  // árboles simplemente no existían para el jugador, y como el reparto era uniforme, casi todos
  // los de fuera de la cerca caían ahí: por eso la franja de césped salía pelada.
  dentroDelClaro(x, y) {
    if (!GF.BOSQUE) return true;
    // 18/8: una sola verdad con dibujarBosque — la celda está despejada o no lo está.
    const T = GF.TILE;
    return GF.despejado(Math.floor(x / T), Math.floor(y / T));
  }

  // MOSAICO DE BOSQUE PARA LO QUE QUEDA FUERA DEL MAPA (17/8).
  // Se arma UNA textura cuadrada de 8x8 celdas con las mismas leyes. Es SIN COSTURA porque el
  // patrón se repite cada 42 px y 336 es múltiplo de 42; además cada árbol se dibuja también
  // desplazado ±336, así que el que cruza un borde reaparece por el otro. Después se estira en
  // un tileSprite enorme por debajo de todo. Coste: una textura de 336x336, una sola vez.
  fondoBosque(anchoT, altoT, eMin, eMax) {
    const T = GF.TILE, P = T * 8, clave = "bosque_mosaico";
    if (!this.textures.exists(clave)) {
      const tex = this.textures.createCanvas(clave, P, P);
      const g = tex.getContext();
      // FONDO DEL MOSAICO: césped. Iba sobre lienzo transparente, así que por cada claro del
      // raleo (un 14%) asomaba el color de fondo de la cámara — más oscuro que el suelo — y se
      // veía moteado. Dentro del anillo esos mismos claros dejan ver el césped de verdad; acá
      // hay que imitarlo. Si existe la baldosa, se usa la baldosa; si no, su color medio.
      if (this.textures.exists("grass_a")) {
        const gsrc = this.textures.get("grass_a").getSourceImage();
        for (let y = 0; y < P; y += T) for (let x = 0; x < P; x += T) g.drawImage(gsrc, x, y, T, T);
      } else {
        g.fillStyle = "#328032"; g.fillRect(0, 0, P, P);
      }
      const src = this.textures.get("tree").getSourceImage();
      const LEYES = String(GF.BOSQUE_LEYES || "cv");
      const ANCLA = {
        c: (c, r) => [(c + 0.5) * T, (r + 1) * T],
        x: (c, r) => [c * T, r * T],
        v: (c, r) => [c * T, (r + 0.5) * T]
      };
      let sem = 987654321;   // semilla propia: el mosaico es siempre el mismo
      const az = () => { sem = (sem * 1664525 + 1013904223) % 4294967296; return sem / 4294967296; };
      const DENS = GF.BOSQUE_DENSIDAD || {}, JF = GF.BOSQUE_JITTER_FONDO || 0;
      const n = P / T, lista = [];
      for (let r = -2; r < n + 2; r++)
        for (let c = -2; c < n + 2; c++)
          for (const ley of LEYES) {
            const f = ANCLA[ley]; if (!f) continue;
            const a = f(c, r);
            const esc = eMin + az() * (eMax - eMin);
            const dx = Math.round((az() * 2 - 1) * JF), dy = Math.round((az() * 2 - 1) * JF);
            const flip = az() < 0.45;
            if (az() > (DENS[ley] != null ? DENS[ley] : 1)) continue;
            const w = anchoT * esc, h = altoT * esc;
            // ENVOLTURA: cada árbol entra también desplazado ±P, para que el que cruza un borde
            // reaparezca por el otro y el mosaico no tenga costura.
            // OJO — esto ya salió mal una vez: las copias desplazadas hay que meterlas en la
            // lista COMO ÁRBOLES PROPIOS, con SU base desplazada, y ordenar después. Ordenar
            // por la base del original y desplazar al dibujar rompe la profundidad: la copia
            // que envuelve desde abajo se pintaba tarde arriba y su tronco tapaba a los de
            // delante. El resultado eran bandas de troncos repetidas, nada que ver con el anillo.
            for (const ox of [-P, 0, P]) for (const oy of [-P, 0, P]) {
              const px2 = a[0] + dx - w / 2 + ox, base2 = a[1] + dy + oy;
              if (px2 > P || px2 + w < 0 || base2 - h > P || base2 < 0) continue;
              lista.push([base2, px2, w, h, flip]);
            }
          }
      lista.sort((p, q) => p[0] - q[0]);   // por la base YA desplazada, igual que el resto del juego
      for (const [base, px, w, h, flip] of lista) {
        const y = base - h;
        g.save();
        if (flip) { g.translate(px + w, y); g.scale(-1, 1); g.drawImage(src, 0, 0, w, h); }
        else g.drawImage(src, px, y, w, h);
        g.restore();
      }
      tex.refresh();
    }
    const L = this.limiteVista(), LADO = 8000;   // el tileSprite no reserva textura: solo repite
    const cx = (L.x1 + L.x2) / 2, cy = (L.y1 + L.y2) / 2;
    if (this.mosaicoTS) { try { this.mosaicoTS.destroy(); } catch (e) {} }
    const ts = this.mosaicoTS = this.add.tileSprite(cx, cy, LADO, LADO, clave)
      .setDepth((GF.BOSQUE_DEPTH || -999) - 2);   // debajo del pasto y del anillo
    // ALINEAR el mosaico con la retícula del mundo. Si no, el patrón arranca donde caiga el
    // borde del tileSprite y se ve una costura contra el anillo por mucho que el dibujo sea
    // correcto. Como el mosaico mide 8 celdas justas, cualquier múltiplo de 42 encaja: basta
    // con desplazar la textura por lo que valga la esquina del sprite en coordenadas de mundo.
    const izq = cx - LADO / 2, arr = cy - LADO / 2;
    ts.tilePositionX = ((izq % P) + P) % P;
    ts.tilePositionY = ((arr % P) + P) % P;
  }

  // HASTA DÓNDE HAY MUNDO DIBUJADO (17/8).
  // El bosque se pinta sobre mundo + BOSQUE_MARGEN. Todo lo que esté más afuera no existe:
  // es el color de fondo de la cámara, y se ve como una plancha verde lisa. Antes los límites
  // de la cámara usaban ISLA_MARGEN (260) mientras el bosque llegaba a 300, así que los dos
  // números decían cosas distintas. Ahora hay UNA sola fuente de verdad y todo se cuelga de acá.
  // El recorte de 16 px es para no llegar nunca al pixel del borde del lienzo.
  limiteVista() {
    const MX = this.margenBosque("x"), MY = this.margenBosque("y");
    const b = MX > 0 ? 16 : 0;
    // 18/8: el mundo puede empezar en negativo, así que el límite cuelga del ORIGEN del terreno
    return { x1: GF.ORIG_X - MX + b, y1: GF.ORIG_Y - MY + b,
             x2: GF.ORIG_X + GF.WORLD_W + MX - b, y2: GF.ORIG_Y + GF.WORLD_H + MY - b };
  }

  // Ancho del anillo por eje. Es más ancho que alto a propósito: la pantalla también lo es, y
  // así el bosque entero entra en el encuadre al alejar del todo (dirección, 17/8).
  margenBosque(eje) {
    if (!GF.BOSQUE) return GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0;
    // 18/8: el mapa mide siempre GF.MAPA; lo que cambia con las expansiones es la granja, así que
    // el anillo de bosque se calcula por diferencia y ENCOGE solo a medida que el claro crece.
    const mapa = GF.MAPA || 1600;
    const m = eje === "x" ? (mapa - GF.WORLD_W) / 2 : (mapa - GF.WORLD_H) / 2;
    return Math.max(GF.TILE * 3, Math.round(m));   // nunca menos de 3 celdas: si no, se ve el vacío
  }

  fitCamera() {
    const cw = this.scale.width, ch = this.scale.height;
    if (GF.CAM_PAN) {
      // vista tipo SFL: se ve TODA la granja con su bosque alrededor, y queda margen para arrastrar.
      const m = Math.round(this.margenBosque("y") * 0.6);
      const z = Math.max(cw / (GF.WORLD_W + m), ch / (GF.WORLD_H + m));   // vista de trabajo, cerca de la granja
      // TOPE DE ALEJADO (17/8, dirección: "los 4 lados del bosque deben ser visibles porque lo
      // que interesa es que la granja se pueda expandir").
      // Antes se calculaba para que NUNCA se viera el borde del dibujo, y el efecto secundario
      // era que el anillo no entraba: con pantalla de 1341x630 se veían 1522x715 de un anillo
      // de 1522x1312 — 597 px de bosque fuera de cuadro, alcanzables solo arrastrando.
      // Ahora al alejar del todo entra el anillo ENTERO. Que no asome el vacío se resuelve
      // donde corresponde: el anillo es más ancho que alto (BOSQUE_MARGEN_X > _Y) y el fondo
      // de la cámara es el verde de las copas, así que si en una pantalla muy panorámica
      // sobrara un poco, se lee como bosque lejano y no como un panel liso.
      const L = this.camLim || this.limiteVista();
      const zMin = Math.min(cw / (L.x2 - L.x1), ch / (L.y2 - L.y1));
      // TOPES DEL JUGADOR, DERIVADOS. Antes la rueda recortaba a [0,6 … 2,2] a secas, y ahí
      // estaba el otro fallo: con el navegador al 25% el zoom base sube a ~5, el 0,6 dejaba el
      // mínimo alcanzable en ~3 y el tope duro de 2,2 lo pisaba. Resultado: el jugador NUNCA
      // llegaba al zoom que hace entrar el mapa, y encima quedaba pegado a una esquina.
      // Ahora el rango del jugador SALE del zoom que hace falta, así que vale igual con el
      // navegador al 25%, al 100% o al 300%.
      this.zoomUserMin = zMin / z;
      const u = Phaser.Math.Clamp(this.zoomUser || 1, this.zoomUserMin, 2.4);
      this.zoomUser = u;
      this.cameras.main.setZoom(Math.max(zMin, z * u));
      return;
    }
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
    if (this.anims.exists("boar_walk")) s.play("boar_walk");   // llega trotando (frames del sprite original, 31/7)
    this.threats.push({ type: "boar", sprite: s, cx: 24, by: 40, baseScale, tgt, damageAt: nowMs() + 15000 });
    refreshHud();
    log("¡Un jabalí apareció! Espantalo (clic/E) antes de que arruine un cultivo.", "bad");
    toast("¡Jabalí! Espantalo");
  }

  // ---- interacción ----
  nearestInteract() {
    let best = null, bd = 1e9;
    const all = this.objs.concat(this.plots).concat(this.threats); if (this.portal) all.push(this.portal);
    for (const o of all) {
      if (o.type === "plot" && o.state === "locked") continue;   // 18/8: no es tuya, no es objetivo
      const rad = (o.type === "barn" || o.type === "market" || o.type === "store" || o.type === "cocina" || o.type === "horno" || o.type === "altar" || o.type === "establo" || o.type === "curtiduria" || o.type === "ofrendas") ? 72 : (o.type === "plot" ? 26 : (o.type === "boar" ? 55 : (o.type === "portal" ? 50 : 58)));   // plot 26: hay que estar encima de la tierra para plantar/cosechar
      const d = Math.hypot(o.cx - this.hero.x, o.by - this.hero.y);
      if (d < rad && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  promptText(o) {
    const cd = nowMs() < o.readyAt;
    if (o.type === "boar") return "Espantar jabalí";
    if (o.type === "animal") {
      const d = ANIMAL_DEF[o.k];
      if (typeof animalListo === "function" && animalListo(o.k)) return "Recoger " + RES_LABEL[d.mat] + " de " + d.label;
      return d.label + " — vuelve en " + fmtCorto(animalFalta(o.k) / 1000) + " (clic: Establo)";
    }
    if (o.type === "plot") {
      if (o.state === "locked") return "";   // 16/8: no es tuya todavía — llega al baúl por nivel
      if (o.state === "withered") return "Limpiar cultivo marchito";
      if (o.state === "dry") { const cd = CROP_DEF[G.selSeed]; return "Plantar " + (cd ? cd.label : "cultivo"); }
      if (o.state === "ready") { const cd = CROP_DEF[o.cropKey]; return "Cosechar " + (cd ? cd.label : ""); }
      return "Creciendo…";
    }
    if (o.type === "portal") return (typeof armaEq === "function" && !armaEq())
      ? "Zona Negra — hace falta un arma equipada"
      : "Teletransportarte a la Zona Negra";
    const secs = cd ? Math.ceil((o.readyAt - nowMs()) / 1000) : 0;
    // cuántos clics faltan: un clic = un golpe, y si parás 5 s los golpes dados se pierden
    const gp = (tot) => " (" + ((o.golpes || 0) + 1) + "/" + tot + ")";
    if (o.type === "tree") { if (o.locked) { if (typeof arbolBloqueado === "function" && arbolBloqueado(o)) return "🔒 Retoño — se habilita a granja nivel " + arbolNivelReq(o); return "Cultivar árbol (" + treeUnlockCost() + " madera)"; } return cd ? "Vuelve en " + fmtSecs(secs) : "Talar madera" + gp(GOLPES_TALAR); }
    // 18/8: "veta" se reserva para los minerales — esto da piedra, o sea que es una ROCA
    if (o.type === "rock") { if (typeof nodoBloqueado === "function" && nodoBloqueado(o)) return "🔒 Roca — se habilita a granja nivel " + nodoNivelReq(o); return cd ? "Vuelve en " + fmtSecs(secs) : "Picar piedra" + gp(GOLPES_MINAR); }
    if (o.type === "ore") { const od = ORE_DEF[o.ore]; if (!od) return "Minar"; if (cd) return od.emoji + " Vuelve en " + fmtSecs(secs); return "Minar " + od.label + gp(GOLPES_MINAR); }
    if (o.type === "buzon") { const n = (typeof buzonCartas === "function") ? buzonCartas().length : 0; return n ? ("Leer el correo (" + n + (n > 1 ? " cartas" : " carta") + ")") : "Buzón — sin cartas"; }
    if (o.type === "excav") return "Cavar el montículo";
    if (o.type === "tablon_pedidos") {
      if (G.tuto && !G.tuto.done) return "Tablón de pedidos — abre al terminar el tutorial";
      const n = (typeof pedidosCumplibles === "function") ? pedidosCumplibles() : 0;
      return n ? ("Tablón de pedidos — " + n + " para entregar") : "Tablón de pedidos del pueblo";
    }
    if (o.type === "paquete") return "Levantar tu paquete del día 📦";
    if (o.type === "cofre_diario") {
      if (!G.kitReclamado) return "¡Abrí tu kit de bienvenida!";
      return "Baúl de premios";
    }
    if (o.type === "barn") return "Granja";
    if (o.type === "market") return "Mercado";
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
      const falta = (typeof obraFalta === "function") ? obraFalta(o.type) : [];
      return "Obra de " + BUILD_DEF[o.type].label + " — clic para depositar (" + falta.map(x => x[1] + " " + (x[0] === "golden" ? "$G" : (RES_LABEL[x[0]] || x[0]))).join(" · ") + ")";
    }
    if (o.type === "store") return "Herrería";
    if (o.type === "cocina") return "Cocina";
    if (o.type === "horno") return "Horno de Piedra";
    if (o.type === "altar") return "Altar de Runas";
    if (o.type === "establo") return "Establo";
    if (o.type === "curtiduria") return "Curtiduría";
    if (o.type === "ofrendas") return "Altar de Ofrendas";
    if (o.type === "cofre") return "Cofre depósito";
    if (o.type === "dummy") {
      if (typeof dummyEntrenando === "function" && dummyEntrenando()) return "Entrenando… clic para cobrar la XP acumulada";
      { const aid = armaEq(); if (!aid || ARM_DEF[aid].tipo === "arco") return "Dummy de práctica — equipá un arma cuerpo a cuerpo"; }
      const dleft = (G.dummyUsedAt || 0) + DUMMY_CD_MS - nowMs();
      return dleft > 0 ? "El dummy descansa — vuelve en " + fmtDur(dleft) : "Entrenar espada (+" + DUMMY_XP + " XP)";
    }
    if (o.type === "fish") {
      /* Y que se vea SIN tener que hacer clic: el rótulo del cursor dice el descanso igual que lo
         dicen el árbol y la roca ("Vuelve en 4:12"). Un nodo que no anuncia su estado obliga al
         jugador a probar para enterarse. */
      const esp = (typeof pescaCdLeft === "function") ? pescaCdLeft() : 0;
      if (esp > 0) return "🌊 La laguna descansa — vuelve en " + fmtDur(esp);
      return "Pescar (1 lombriz · tenés " + fmt(G.res.lombriz || 0) + ")";
    }
    return "";
  }

  doInteract() {
    if (GF.uiOpen || this.action || GF.editMode) return;
    if (GF.NO_WALK) {   // sin granjero: la tecla E actúa sobre lo que esté bajo el cursor
      const pt = this.input.activePointer, wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const q of this.objs) { if (this.hitsSprite(q.sprite, wx, wy)) { const d = Math.hypot(q.cx - wx, q.by - wy); if (d < bd) { bd = d; hit = q; } } }
      /* 18/8 (reporte de dirección: "por debajo de las tres parcelas iniciales aparece el
         cuadradito con una leyenda vacía"). Las parcelas BLOQUEADAS —las de la fila de abajo, que
         todavía no son tuyas— seguían captando el cursor. No se ven, no se pueden usar y su texto
         es "", así que salía el cartel vacío. */
      if (!hit) for (const pl of this.plots) { if (pl.state === "locked") continue; if (Math.abs(wx - pl.cx) < GF.TILE / 2 && Math.abs(wy - pl.by) < GF.TILE / 2) { hit = pl; break; } }
      if (!hit) for (const q of this.threats) { if (this.hitsSprite(q.sprite, wx, wy)) { hit = q; break; } }
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;   // mismo alcance que el clic
      if (hit) this.interactWith(hit); else if (this.pondDist(wx, wy) < 1.05) this.tryFish(wx, wy);
      return;
    }
    const o = this.nearestInteract(); if (o) this.interactWith(o); else if (this.nearPond()) this.tryFish();
  }

  interactWith(o) {
    // EMBUDO ESTRICTO (13/8): en los primeros pasos del tutorial, solo la acción que el
    // objetivo pide. Cosechar lo plantado y trabajar obras se permiten siempre.
    if (typeof tutoPermite === "function") {
      let tag = null;
      if (o.type === "plot") tag = o.state === "dry" ? "plant" : (o.state === "locked" ? "plotunlock" : null);
      else if (o.type === "tree") tag = o.locked ? "cultivar" : "chop";
      else if (o.type === "rock" || o.type === "ore") tag = "mine";
      else if (o.type === "portal") tag = "portal";
      else if (o.type === "fish") tag = "fish";
      else if (o.type === "dummy") tag = "dummy";
      if (tag && !tutoPermite(tag)) { if (typeof tutoAviso === "function") tutoAviso(); return; }
    }
    if (o.type === "portal") {
      // 10/8: descanso entre viajes, y se abre el "viaje" para poder resumirlo al volver
      const espera = (typeof zonaCdLeft === "function") ? zonaCdLeft() : 0;
      if (espera > 0) { toast("El granjero está descansando — podés volver en " + fmtDur(espera)); return; }
      const entrar = () => {
        /* 18/8 (reporte del diseñador: "es posible entrar a la zona negra sin arma"). No había
           ninguna comprobación: el propio rótulo del portal decía "Teletransportarte a la Zona
           Negra SIN ARMA" — describía el problema y lo dejaba pasar igual. Entrar desarmado es
           entrar a que te maten.
           (19/8 — CORRECCIÓN: acá decía "y al morir se pierde lo que llevás encima". NO es cierto:
           zonaSalir(true) te devuelve a la granja con media vida y un enfriamiento antes de poder
           volver, y el botín se conserva entero. Lo dejo escrito porque un comentario falso sobre
           un castigo es de lo más caro que hay: alguien diseña encima creyendo que existe.)
           Se pide arma EQUIPADA, no solo tenerla en el cofre: llevarla puesta es la decisión. */
        if (typeof armaEq === "function" && !armaEq()) {
          toast(Object.keys(G.weapons || {}).length
            ? "Equipate un arma antes de entrar — está en tu inventario"
            : "Necesitás un arma para entrar. Se craftean en la Herrería");
          return;
        }
        if (typeof tutoEvent === "function") tutoEvent("portal");
        GF.zona = "pantano";   // desde la granja siempre se entra por el primer mapa (10/8)
        if (typeof zonaEntrar === "function") zonaEntrar();
        if (typeof saveFarm === "function") saveFarm();
        this.leaving = true; irAEscena(this, "forest");
      };
      askConfirm("¿Entrás vos a pelear a la Zona Negra o mandás una incursión de un clic?", entrar,
        { title: "Zona Negra", yes: "Entrar a pelear", yesClass: "green", no: "Incursión (un clic)", noClass: "gold",
          onNo: () => { if (typeof refreshIncursion === "function") refreshIncursion(); openOv("ov-incursion"); } });
      return;
    }
    if (o.type === "animal") {   // clic sobre un animal del corral
      if (typeof animalListo === "function" && animalListo(o.k)) {
        const antes = G.res[ANIMAL_DEF[o.k].mat] || 0;
        recogerAnimal(o.k);
        const gan = (G.res[ANIMAL_DEF[o.k].mat] || 0) - antes;
        if (gan > 0) { this.premioFx(o.cx, o.by, resSprite(ANIMAL_DEF[o.k].mat), "+" + gan); this.estrellasFx(o.cx, o.by - 14); }   // fixs #11: celebración
      } else { if (typeof refreshEstablo === "function") refreshEstablo(); openOv("ov-establo"); }
      return;
    }
    if (o.type === "paquete") {   // EL PAQUETE DE LA MAÑANA (15/8): su propia pantalla
      openOv("ov-paquete");
      return;
    }
    if (o.type === "excav") {   // EXCAVACIÓN (15/8): un clic, puff de tierra y el botín
      const b = (typeof excavCavar === "function") ? excavCavar(o.idx) : null;
      if (!b) return;
      if (this.puffFx) this.puffFx(o.cx, o.by - 4, 0x6b4a2b, 10);
      if (this.premioFx) this.premioFx(o.cx, o.by, b.res ? resSprite(b.res) : "seed_papa", b.txt);
      if (o.sprite) o.sprite.destroy();
      const ix = this.objs.indexOf(o); if (ix >= 0) this.objs.splice(ix, 1);
      const ex = (this.excavObjs || []).indexOf(o); if (ex >= 0) this.excavObjs.splice(ex, 1);
      return;
    }
    if (o.type === "tablon_pedidos") {   // TABLÓN (16/8): cerrado durante el tutorial…
      // …salvo cuando el paso activo ES el del tablón (20/8): el último paso manda a entregar un
      // encargo, y con el candado viejo el tutorial no podía terminar nunca (candado circular).
      if (typeof tablonAbierto === "function" ? !tablonAbierto() : (G.tuto && !G.tuto.done)) { toast("El tablón abre cuando termines el tutorial"); return; }
      return openOv("ov-pedidos");
    }
    if (o.type === "cofre_diario") return openOv("ov-baul");   // 15/8 v3: el baúl tiene su propia pantalla
    if (o.type === "buzon") return openOv("ov-buzon");   // buzón (15/8)
    if (o.type === "barn") return openOv("ov-barn");
    if (o.type === "market") return openOv("ov-market");
    // OBRA de blueprint (12/8): cada clic DEPOSITA los materiales que tengas; al
    // completar, estrellitas y el edificio queda construido. Sin ventanas de confirmación.
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type])) {
      if (o.oculto) return;
      const completo = (typeof obraDepositar === "function") && obraDepositar(o.type);
      this.letreroObra(o);   // el cartel refleja lo depositado
      if (completo) {
        obraConstruir(o.type);
        if (o.sprite) {
          if (this.textures.exists(o.baseKey) && o.sprite.texture.key !== o.baseKey) { o.sprite.setTexture(o.baseKey); o.sprite.setScale(o.rw / o.sprite.width); }
          o.sprite.setAlpha(1); o.sprite.clearTint();
          if (this.estrellasFx) this.estrellasFx(o.cx, o.by - (o.sprite.displayHeight || 60) * 0.5);
        }
        if (o.letrero) { o.letrero.destroy(); o.letrero = null; }
        this.tintarNodo(o);
        this.rebuildCollisions();
      }
      return;
    }
    // VETAS/PIEDRAS (12/8 noche): freno por NIVEL, sin compra — el aviso salta al intentar
    if (o.type === "rock" && typeof nodoBloqueado === "function" && nodoBloqueado(o)) {
      const req = nodoNivelReq(o);
      toast("🔒 Para picar esta roca necesitás granja nivel " + req + " (tenés " + G.level + ")");
      log("Esa roca se habilita a granja nivel " + req + ". Seguí subiendo de nivel para ampliarte.", "info");
      return;
    }
    // el tutorial "ampliá la granja" también se cumple al USAR una segunda veta habilitada
    if (o.type === "rock" && (o.lockIdx || 0) > 0 && typeof tutoEvent === "function") tutoEvent("unlocknode");
    // 16/8: los árboles ya NO se compran con madera — llegan como premio al baúl. Un árbol
    // bloqueado ni siquiera se ve, así que esto solo puede pasar por un clic fantasma.
    if (o.type === "tree" && o.locked) { toast("Los retoños llegan al baúl al subir de nivel"); return; }
    if (false) {
      // 16/8: escalera de nivel espejo de las rocas — el retoño N se paga recién al nivel N
      if (typeof arbolBloqueado === "function" && arbolBloqueado(o)) {
        const req = arbolNivelReq(o);
        toast("🔒 Este retoño se habilita a granja nivel " + req + " (tenés " + G.level + ")");
        log("Ese árbol se cultiva a granja nivel " + req + ". Seguí subiendo de nivel para ampliarte.", "info");
        return;
      }
      const cost = treeUnlockCost();
      askConfirm("Cuesta " + cost + " de " + RES_LABEL.madera + ". ¿Cultivar este árbol?", () => {
        if ((G.res.madera || 0) < cost) { toast("Te falta " + RES_LABEL.madera + " (" + cost + ")"); return; }
        if (typeof tutoGuardia === "function" && !tutoGuardia("madera", cost, "cultivar árboles")) return;   // guardia del tutorial (12/8)
        G.res.madera -= cost;
        G.treesOpen = G.treesOpen || [0]; G.treesOpen.push(o.lockIdx);
        o.locked = false;
        if (o.sprite) {   // el retoño CRECE hasta el árbol adulto, con hojitas volando
          if (this.textures.exists(o.baseKey)) { o.sprite.setTexture(o.baseKey); }
          o.sprite.setAlpha(1); o.sprite.clearTint();
          o.sprite.setScale((o.rw * 0.3) / o.sprite.width);
          this.tweens.add({ targets: o.sprite, scaleX: o.rw / o.sprite.width, scaleY: o.rw / o.sprite.width, duration: 700, ease: "Back.easeOut" });
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 22;
            const p = this.add.ellipse(o.cx, o.by - 30, 4, 3, i % 2 ? 0x3f9b3f : 0x2f7a2f, 0.9).setDepth(o.by + 1).setAngle(Math.random() * 360);
            this.tweens.add({ targets: p, x: o.cx + Math.cos(a) * d, y: o.by - 30 + Math.sin(a) * d, angle: p.angle + 160, alpha: 0, duration: 550 + Math.random() * 250, onComplete: () => p.destroy() });
          }
        }
        this.tintarNodo(o);
        addXp("crafting", 5); if (typeof syncSlots === "function") syncSlots();
        log("Cultivaste un árbol nuevo por " + cost + " de madera.", "good");
        if (typeof tutoEvent === "function") tutoEvent("unlocknode"); toast("¡Árbol nuevo creciendo!");
        refreshHud(); if (isOpen("ov-inv")) refreshInv(); if (typeof saveFarm === "function") saveFarm(true);
      }, { title: "Cultivar árbol", yes: "Cultivar", yesClass: "green", no: "Cancelar", noClass: "red" });
      return;
    }
    if (o.type === "store") return openOv("ov-forge");
    if (o.type === "cocina") return openOv("ov-cocina");
    if (o.type === "horno") { if (typeof refreshHorno === "function") refreshHorno(); return openOv("ov-horno"); }
    if (o.type === "altar") { if (typeof refreshAltar === "function") refreshAltar(); return openOv("ov-altar"); }
    if (o.type === "establo") { if (typeof refreshEstablo === "function") refreshEstablo(); return openOv("ov-establo"); }
    if (o.type === "curtiduria") { if (typeof refreshCurtiduria === "function") refreshCurtiduria(); return openOv("ov-curtiduria"); }
    if (o.type === "ofrendas") { if (typeof refreshOfrendas === "function") refreshOfrendas(); return openOv("ov-ofrendas"); }
    if (o.type === "cofre") { window.chestOpen = o.chestIdx; return openOv("ov-cofre"); }
    if (o.type === "dummy") {
      if (typeof dummyEntrenando === "function" && dummyEntrenando()) { dummyCobrar(); return; }   // volviste: cobrás la XP acumulada
      const dleft = (G.dummyUsedAt || 0) + DUMMY_CD_MS - nowMs();
      askConfirm(dleft > 0
          ? "El dummy descansa (vuelve en " + fmtDur(dleft) + "), pero podés dejar al granjero entrenando: cobrás la XP del tiempo que pase, hasta " + DUMMY_OFF_MAX_H + " h."
          : "¿Entrenás ahora (+" + DUMMY_XP + " XP y 4 h de descanso) o dejás al granjero entrenando mientras no estás?",
        () => { if (dleft > 0) { toast("El dummy descansa — vuelve en " + fmtDur(dleft)); return; } this.trainDummy(o); },
        { title: "Dummy de práctica", yes: dleft > 0 ? "Cerrar" : "Entrenar ahora", yesClass: dleft > 0 ? "ghost" : "green",
          no: "Dejar entrenando", noClass: "gold", onNo: () => dummyIniciar() });
      return;
    }
    if (o.type === "boar") { o.sprite.destroy(); const i = this.threats.indexOf(o); if (i >= 0) this.threats.splice(i, 1); log("Espantaste al jabalí.", "good"); toast("¡Espantado!"); return; }   // XP de espada llega con el combate (necesita espada equipada)
    if (o.type === "plot") {
      // 16/8: las parcelas ya NO se compran — llegan al baúl como premio del nivel.
      // Además, una bloqueada es invisible y el clic ni la encuentra: esto es red de seguridad.
      if (o.state === "locked") { toast("Las parcelas llegan al baúl al subir de nivel"); return; }
      if (o.state === "withered") {   // limpiar el cultivo perdido: la parcela vuelve a estar libre
        o.state = "dry"; o.cropKey = null; o.witherAt = 0;
        o.spr.clearTint().setAlpha(1).setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false);
        this.syncPlots(); log("Limpiaste el cultivo marchito.", "info"); toast("Parcela limpia");
        return;
      }
      // la azada/semilla se usan solas desde la bolsa (la hotbar sigue sirviendo para ELEGIR semilla)
      if (o.state === "dry") {
        /* 21/8: se sopesó abrir la rueda también con clic IZQUIERDO cuando hay varias semillas,
           pero dirección lo aclaró: el izquierdo planta directo COMO SIEMPRE (la selección de la
           hotbar/bolsa manda) y la rueda es del clic derecho — que era lo que estaba roto y ya
           tiene su armadura unas líneas más arriba. */
        let ck = G.selSeed;
        // si la semilla elegida no tiene stock, detectar sola la de la hotbar o la primera disponible
        if (!CROP_DEF[ck] || (G.seeds[ck] || 0) <= 0) {
          const hb = G.hotbar && G.hotbar[G.hotSel];
          if (hb && hb.kind === "seed" && cropUnlocked(hb.key) && (G.seeds[hb.key] || 0) > 0) ck = hb.key;
          else { const alt = CROP_ORDER.find(k => cropUnlocked(k) && (G.seeds[k] || 0) > 0); if (alt) ck = alt; }
          if (ck !== G.selSeed && CROP_DEF[ck]) { G.selSeed = ck; toast("Plantando: " + CROP_DEF[ck].label); if (typeof refreshHotbar === "function") refreshHotbar(); }
        }
        const pP = puedeAccion("plant", { seed: ck });
        if (!pP.ok) { avisoAccion(pP); return; }
        return this.startAction("plant", o);
      }
      if (o.state === "ready") {
        const pH = puedeAccion("harvest", o);
        if (!pH.ok) { avisoAccion(pH); return; }
        return this.startAction("harvest", o);
      }
      toast("Todavía está creciendo"); return;
    }
    if (o.type === "fish") {
      /* 19/8 (dirección) — EL AVISO LLEGABA TARDE. La comprobación del descanso de la laguna vivía
         dentro de goFishing(), que corre al TERMINAR el lanzamiento: el jugador tiraba la caña,
         miraba cargar la barra unos segundos y recién ahí le decían que la laguna estaba en reposo.
         Todos los demás nodos avisan antes de empezar; éste era el único que dejaba gastar el gesto
         para negárselo después. La comprobación sube acá, junto a las otras tres. */
      const pF = puedeAccion("fish", o);
      if (!pF.ok) { avisoAccion(pF); return; }
      return this.startAction("fish", o);
    }
    /* 20/8 — LAS TRES PUERTAS DEL MISMO SITIO, UNA SOLA REGLA.
       Aquí vivían veinte líneas de comprobaciones copiadas: el enfriamiento, el pico, su categoría,
       la skill, el desgaste y la bolsa, repetidas entre la veta, el árbol y la roca. Ahora todo eso
       está en puedeAccion() (state.js) y esto solo pregunta. El rótulo del cursor se le pasa como
       función para que el aviso del enfriamiento sea LA MISMA cadena que ves al pasar por encima. */
    const rot = (x) => this.promptText(x);
    if (o.type === "ore" || o.type === "rock") {
      const p = puedeAccion("mine", o, rot);
      if (!p.ok) { avisoAccion(p); return; }
      this.startAction("mine", o);
    } else if (o.type === "tree") {
      const p = puedeAccion("chop", o, rot);
      if (!p.ok) { avisoAccion(p); return; }
      this.startAction("chop", o);
    }
  }

  startAction(kind, o) {
    this.moveTarget = null;
    if (GF.NO_WALK && o && o.cx != null) {   // granja de un clic: el granjero (invisible) trabaja donde clickeaste
      this.hero.setPosition(o.cx + (kind === "fish" ? 0 : 22), (o.by != null ? o.by : o.by2) + 4);
    }
    this.facing = (o.cx < this.hero.x) ? "west" : "east";
    // pescar lleva 15–20s ININTERRUMPIDOS (detalles jueves); moverse cancela la pesca
    // OJO (16/8): con `|| 1.2` un ACT_DUR de 0 se convertía en 1,2 s — justo lo contrario de
    // lo pedido. El respaldo solo debe entrar si la acción NO está en la tabla.
    let dur = kind === "fish" ? 15 + Math.random() * 5 : (ACT_DUR[kind] != null ? ACT_DUR[kind] : 1.2);
    if (kind === "plant" || kind === "harvest") dur *= farmSpeedMult();   // buff "+% vel. de farmeo" de la comida
    this.action = { kind, o, t: 0, dur };
    if (kind === "plant") this.action.seed = G.selSeed;   // queda fijada la semilla ya validada
    // RESPUESTA INMEDIATA: como el granjero no se ve, si el golpe no se nota AL INSTANTE el juego
    // se siente lento. Las astillas y la sacudida salen ya, en el mismo frame del clic.
    // RESPUESTA INMEDIATA para las CUATRO acciones. Antes solo talar y picar tenían el destello;
    // plantar y cosechar no mostraban nada hasta terminar, y por eso se sentían lentas.
    if (ACT_IMPACTO <= 0) {
      if (kind === "chop" || kind === "mine") { this.destelloFx(o); this.golpeFx(o, kind); this.action.golpeYa = true; }
      else if (kind === "harvest") { this.destelloFx(o); this.puffFx(o.cx, o.by + 2, 0xc0dd97, 5); }
      else if (kind === "plant") { this.puffFx(o.cx, o.by + 2, 0xb4b2a9, 4); }
      // 16/8 (dirección): el SPRITE INTERMEDIO también cambia acá, en el frame del clic.
      // Antes esperaba al update siguiente y ese salto se veía como un tironcito.
      if (kind === "chop" && o.type === "tree") {
        this.action.cutDone = true;
        const g = (o.golpes || 0) + 1;
        const tex = g === 1 ? "tree_cut1" : (g < GOLPES_TALAR ? "tree_cut2" : null);
        if (tex && this.textures.exists(tex)) this.setObjTex(o, tex, o.rw || o.w);
      } else if (kind === "mine" && (o.type === "rock" || o.type === "ore")) {
        this.action.halfDone = true;
        if ((o.golpes || 0) + 1 >= GOLPES_MINAR - 1 && this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
      }
    }
    if (kind === "fish") this.castBobber(o.bx != null ? o.bx : o.cx, o.by2 != null ? o.by2 : (GF.POND.row + GF.POND.rows / 2) * GF.TILE);
    // 16/8 (dirección): duración 0 = se resuelve YA, en el mismo frame del clic. Si se dejaba
    // que lo cerrara el update siguiente, quedaba un frame de candado (~16 ms) que en clics
    // encadenados se notaba. Con esto, un clic es un golpe completo, sin ventana muerta.
    if (dur <= 0 && this.action) this.finishAction();
  }

  // lanza la caña: el corcho vuela desde el granjero hasta el agua y flota ahí mientras dura la pesca
  castBobber(x, y) {
    if (!this.textures.exists("bobber")) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xd8452e, 1); g.fillCircle(4, 3, 3.4);       // corcho rojo arriba
      g.fillStyle(0xf5efe0, 1); g.fillCircle(4, 6, 3.2);       // blanco abajo
      g.fillStyle(0x2b2b2b, 1); g.fillRect(3, 0, 2, 2);        // puntita
      g.generateTexture("bobber", 9, 10); g.destroy();
    }
    if (this.bobber) { this.bobber.destroy(); this.bobber = null; }
    if (window.sfx) sfx("cast");
    const b = this.add.image(this.hero.x, this.hero.y - 26, "bobber").setDepth(-988).setScale(1.6);
    this.bobber = b;
    this.tweens.add({ targets: b, x, y, duration: 420, ease: "Quad.easeIn", onComplete: () => {
      if (!this.bobber) return;
      this.splashAt(x, y);
      this.bobberTween = this.tweens.add({ targets: b, y: y + 2.5, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }});
  }
  clearBobber() { if (this.bobberTween) { this.bobberTween.stop(); this.bobberTween = null; } if (this.bobber) { this.bobber.destroy(); this.bobber = null; } this.clearFishLine(); this.clearFishBar(); }

  // hilo de pesca: de la punta de la caña (pixel 98,8 del frame hero_fish_3, lienzo 119x86) hasta la boya, con panza
  drawFishLine(sign) {
    if (!this.bobber) return;
    if (!this.fishLine) this.fishLine = this.add.graphics().setDepth(-987);
    const k = this.actScale;
    const tx = this.hero.x + sign * (99 - 119 / 2) * k, ty = this.hero.y - (63 - 8) * k;
    const bx = this.bobber.x, by = this.bobber.y - 3;
    const g = this.fishLine; g.clear();
    g.lineStyle(1, 0xf2ead5, 0.75); g.beginPath(); g.moveTo(tx, ty);
    const mx = (tx + bx) / 2, my = Math.max(ty, by) + 7;   // panza del hilo
    for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; g.lineTo(u * u * tx + 2 * u * t * mx + t * t * bx, u * u * ty + 2 * u * t * my + t * t * by); }
    g.strokePath();
  }
  clearFishLine() { if (this.fishLine) { this.fishLine.destroy(); this.fishLine = null; } }

  // barra de enfriamiento de la pesca (detalles viernes): progreso sobre el granjero mientras pesca
  drawFishBar(a) {
    if (!this.fishBar) {
      const bg = this.add.rectangle(0, 0, 40, 7, 0x20301a, 0.85).setStrokeStyle(1, 0x8fc46a, 0.9).setDepth(99995);
      const fg = this.add.rectangle(0, 0, 36, 3, 0x8fc46a, 1).setOrigin(0, 0.5).setDepth(99996);
      this.fishBar = { bg, fg };
    }
    const x = this.hero.x, y = this.hero.y - GF.SIZE.hero - 12;
    this.fishBar.bg.setPosition(x, y);
    this.fishBar.fg.setPosition(x - 18, y);
    this.fishBar.fg.width = Math.max(1, 36 * Math.min(1, a.t / a.dur));
  }
  clearFishBar() { if (this.fishBar) { this.fishBar.bg.destroy(); this.fishBar.fg.destroy(); this.fishBar = null; } }

  // efecto de CATCH (detalles viernes 1): splash en la boya y el pez salta en arco hasta el granjero
  catchFx() {
    if (!this.bobber) return;
    const bx = this.bobber.x, by = this.bobber.y;
    this.splashAt(bx, by);
    const key = this.textures.exists("fish_comun") ? "fish_comun" : null;
    if (!key) return;
    const f = this.add.image(bx, by, key).setDepth(99996).setScale(1.1);
    const hx = this.hero.x, hy = this.hero.y - 30;
    // arco parabólico: sube y cae en la mano del granjero, girando
    this.tweens.add({ targets: f, x: hx, duration: 480, ease: "Sine.easeOut" });
    this.tweens.add({ targets: f, y: by - 46, duration: 240, ease: "Quad.easeOut", onComplete: () => {
      this.tweens.add({ targets: f, y: hy, duration: 240, ease: "Quad.easeIn", onComplete: () => {
        this.splashSparkle(hx, hy); f.destroy();
      } });
    } });
    this.tweens.add({ targets: f, angle: 360, duration: 480 });
  }
  splashSparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(x, y, 2, 0xbfe8ff, 1).setDepth(99996);
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 10;
      this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    }
  }
  cancelFishing() { this.clearBobber(); this.action = null; toast("Pesca interrumpida"); }

  finishAction() {
    const a = this.action, o = a.o;
    if (window.sfx) sfx({ chop: "chop", mine: "mine", plant: "plant", harvest: "harvest", fish: "splash", water: "splash" }[a.kind] || "click");
    // (la sacudida y las astillas ya salieron en el momento del impacto, no acá al final)
    if (a.kind === "chop") {
      /* 21/8 (cargas, forma final de dirección): LA ESCALERA DE SPRITES SE ESTIRA CON LAS CARGAS.
         Con 1 carga el ciclo es el de siempre: entero → primer corte → corte profundo → tocón
         (+1 madera). Con N cargas, el PRIMER CORTE se repite N veces: cada repetición cobra una
         carga — su madera, su hacha, su XP — y el árbol sigue en pie en ese primer corte; cuando
         queda la última, el cierre es el clásico: corte profundo → tocón con la madera final.
         Árbol lleno = 6 golpes, 4 maderas, 4 hachas, una sola secuencia continua.
         El truco del contador: los golpes que cobran carga DEJAN o.golpes en 1 (el árbol se queda
         en la etapa de primer corte); recién con la última carga el contador avanza a 2 y 3. */
      o.golpes = (o.golpes || 0) + 1;
      const cargasArbol = nodoCargas(o, CD.tree);
      if (o.golpes >= 2 && cargasArbol > 1) {   // repetición del primer corte: este golpe COBRA una carga
        if (tryAddRes("madera", 1)) {
          useTool("axe"); addXp("tala", xpDeNodo("tree")); nodoSumar(o); statAdd("talar", null, 1);
          const quedan = nodoGastarCarga(o, CD.tree); this.syncNodos();
          if (this.textures.exists("tree_cut1")) this.setObjTex(o, "tree_cut1", o.rw || o.w);
          o.golpes = 1;                       // el árbol se queda en la etapa de primer corte
          o.golpesAt = nowMs(); this.barraGolpes(o);
          this.premioFx(o.cx, o.by, resSprite("madera"), "+1"); refreshHud();
          log(`+1 Madera — al árbol le quedan ${quedan} carga${quedan === 1 ? "" : "s"}. ${toolDur("axe")}/${TOOL_DEF.axe.max}`, "good");
          if (typeof tutoEvent === "function") tutoEvent("gather");
          if (toolDur("axe") <= 0) { log("¡El hacha se rompió en pedazos! Crafteá otra en la Herrería.", "bad"); toast("¡Hacha rota!"); }
        } else {
          o.golpes = 1;   // la madera de esta carga no cupo: la carga NO se cobra y el árbol espera
          toast("Bolsa llena — no podés talar"); log("Bolsa llena: liberá espacio para seguir talando.", "bad");
        }
        this.action = null; return;
      }
      if (o.golpes < GOLPES_TALAR) {   // golpes intermedios: el árbol se va cortando (el hacha NO se gasta todavía)
        const tex = o.golpes === 1 ? "tree_cut1" : "tree_cut2";
        if (this.textures.exists(tex)) this.setObjTex(o, tex, o.rw || o.w);
        o.golpesAt = nowMs();   // si no seguís, a los 5 s el árbol se recupera solo
        this.barraGolpes(o);       // barrita de progreso bajo el nodo (como Sunflower Land)
        this.action = null; return;   // sin cartelito: el destello y la barra ya lo dicen
      }
      o.golpesAt = 0;
      o.golpes = 0; this.barraGolpes(o);
      if (tryAddRes("madera", 1)) {   // la ÚLTIMA carga: el árbol cae de verdad
        useTool("axe"); addXp("tala", xpDeNodo("tree"));   /* 18/8: por acción, no por reloj */   /* 18/8: talar es TALA, no Artesanía */ /* 16/8: XP = minutos del reloj (1 h 30 → 90) */ nodoSumar(o);
        o.cdIni = nowMs(); o.readyAt = nowMs() + nodoCd(o, "tree", CD.tree) * 1000 * cdMult() * (typeof tutoBoost === "function" ? tutoBoost("tree") : 1);
        o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2; this.syncNodos();   // a mitad del enfriamiento asoma el árbol a medio crecer (doc 4/8)
        // tocón nuevo con base de tierra y hojas caídas (encuadre del árbol, va a tamaño completo); respaldo: tocón viejo chico
        // 15/8 (medido en los PNG): el disco del tocón es el 64% de su lienzo y el tronco
        // del árbol el 23-30% del suyo → a 0.42 del ancho del árbol el corte queda del
        // MISMO grosor que el tronco que había (antes 0.85: salía el doble de gordo).
        if (this.textures.exists("tree_stump_leaves")) this.setObjTex(o, "tree_stump_leaves", (o.rw || o.w) * 0.42);
        else this.setObjTex(o, "tree_stump", (o.rw || o.w) * 0.42);
        statAdd("talar", null, 1);
        this.premioFx(o.cx, o.by, resSprite("madera"), "+1");
        log(`+1 Madera. ${toolDur("axe")}/${TOOL_DEF.axe.max}`, "good"); refreshHud();
        if (typeof tutoEvent === "function") tutoEvent("gather");
        if (toolDur("axe") <= 0) { log("¡El hacha se rompió en pedazos! Crafteá otra en la Herrería.", "bad"); toast("¡Hacha rota!"); }
      } else {
        this.setObjTex(o, o.baseKey, o.rw || o.w);   // bolsa llena: el árbol vuelve entero (deshace los cortes intermedios)
        toast("Bolsa llena — no podés talar"); log("Bolsa llena: liberá espacio para seguir talando.", "bad");
      }
    } else if (a.kind === "mine" && o.type === "rock") {
      /* 21/8 (cargas, forma final): misma escalera estirada que el árbol — la media rota se
         repite una vez por carga (cada repetición cobra 1 piedra + 1 pico), y el cierre clásico
         llega con la última: media rota → picada del todo. Roca llena = 6 golpes, 4 piedras. */
      o.golpes = (o.golpes || 0) + 1;
      const cargasRoca = nodoCargas(o, CD.rock);
      if (o.golpes >= 2 && cargasRoca > 1) {   // repetición de la media rota: este golpe COBRA una carga
        if (tryAddRes("piedra", 1)) {
          const pk = equippedPick();
          if (pk) { G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1); if (G.picks.dur[pk] <= 0) { log("Usaste tu último " + PICK_DEF[pk].label + " — crafteá más en la Herrería.", "bad"); toast("Sin picos — crafteá más"); destroyPick(pk); } }
          addXp("mining", xpDeNodo("rock", "piedra")); statAdd("minar", "piedra", 1); nodoSumar(o);
          const quedan = nodoGastarCarga(o, CD.rock); this.syncNodos();
          if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
          o.golpes = 1; o.golpesAt = nowMs(); this.barraGolpes(o);
          this.premioFx(o.cx, o.by, resSprite("piedra"), "+1"); refreshHud();
          log(`+1 Piedra — a la roca le quedan ${quedan} carga${quedan === 1 ? "" : "s"}.` + (pk ? ` Quedan ${G.picks.dur[pk]} picos.` : ""), "good");
          if (typeof tutoEvent === "function") tutoEvent("gather");
        } else {
          o.golpes = 1;   // la piedra no cupo: la carga no se cobra
          toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad");
        }
        this.action = null; return;
      }
      if (o.golpes < GOLPES_MINAR) {   // golpes intermedios: el pico NO se gasta todavía
        if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
        o.golpesAt = nowMs();   // si no seguís, a los 5 s la piedra vuelve a estar entera
        this.barraGolpes(o);
        this.action = null; return;
      }
      o.golpes = 0; o.golpesAt = 0; this.barraGolpes(o);
      if (tryAddRes("piedra", 1)) {   // la ÚLTIMA carga: la roca se rompe de verdad
        const pk = equippedPick();   // picar piedra también gasta el pico (bug reportado)
        if (pk) { G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1); if (G.picks.dur[pk] <= 0) { log("Usaste tu último " + PICK_DEF[pk].label + " — crafteá más en la Herrería.", "bad"); toast("Sin picos — crafteá más"); destroyPick(pk); } }
        addXp("mining", xpDeNodo("rock", "piedra")); /* 16/8: XP = minutos del reloj (2 h → 120) */ statAdd("minar", "piedra", 1); nodoSumar(o);
        o.cdIni = nowMs(); o.readyAt = nowMs() + nodoCd(o, "piedra", CD.rock) * 1000 * cdMult() * (typeof tutoBoost === "function" ? tutoBoost("rock") : 1); o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2; this.syncNodos(); this.setObjTex(o, "node_stone_mined", o.rw || GF.TILE);
        log(`+1 Piedra.` + (pk ? ` Quedan ${G.picks.dur[pk]} picos.` : ""), "good");
        this.premioFx(o.cx, o.by, resSprite("piedra"), "+1"); refreshHud();
        if (typeof tutoEvent === "function") tutoEvent("gather");
      }
      else { this.setObjTex(o, o.baseKey, o.rw || o.w); toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad"); }   // vuelve entera: los golpes se perdieron
    } else if (a.kind === "mine" && o.type === "ore") {
      /* 21/8 (cargas, forma final): la veta de PIEDRA va con las rocas — misma escalera estirada.
         Las vetas de MINERAL quedan APARTADAS de la mecánica (dirección, 21/8, decisión final):
         reloj simple, una picada y a dormir; sus cargas son siempre 1.
         LA PICADA DE MINERAL SÍ RINDE od.yield (2) — la decisión del 18/8 que esta rama entregaba
         en 1 por error: con yield 1 picar daba pérdida en los cinco tiers (el pico cuesta más de
         lo que saca); el ancla exige (2 × precio − pico) / horas = 20. */
      o.golpes = (o.golpes || 0) + 1;
      const odC = ORE_DEF[o.ore], grVeta = Math.max(1, odC.yield || 1);
      const cargasVeta = o.ore === "piedra" ? nodoCargas(o, CD.rock) : 1;
      if (o.golpes >= 2 && cargasVeta > 1) {   // repetición de la media rota: este golpe COBRA una carga
        if (tryAddRes(o.ore, grVeta)) {
          const pk2 = equippedPick(), pd2 = PICK_DEF[pk2];
          G.picks.dur[pk2] = Math.max(0, (G.picks.dur[pk2] || 0) - 1);
          addXp("mining", xpDeNodo("ore", o.ore)); statAdd("minar", o.ore, grVeta); nodoSumar(o);
          const quedan = nodoGastarCarga(o, CD.rock); this.syncNodos();   // solo llega acá la veta de piedra
          if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
          o.golpes = 1; o.golpesAt = nowMs(); this.barraGolpes(o);
          this.premioFx(o.cx, o.by, resSprite(o.ore), "+" + grVeta); refreshHud();
          log(`${odC.emoji} +${grVeta} ${odC.label} — a la veta le quedan ${quedan} carga${quedan === 1 ? "" : "s"}. Quedan ${G.picks.dur[pk2]} picos.`, "good");
          if (typeof tutoEvent === "function") { tutoEvent("gather"); tutoEvent("mineore"); }
          if (G.picks.dur[pk2] <= 0) { log("Usaste tu último " + pd2.label + " — crafteá más en la Herrería.", "bad"); toast("Sin picos — crafteá más"); destroyPick(pk2); }
        } else {
          o.golpes = 1;   // no cupo: la carga no se cobra
          toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad");
        }
        this.action = null; return;
      }
      if (o.golpes < GOLPES_MINAR) {   // golpes intermedios: el pico NO se gasta todavía
        if (this.textures.exists(o.baseKey + "_half")) this.setObjTex(o, o.baseKey + "_half", o.rw || o.w);
        o.golpesAt = nowMs();   // si no seguís, a los 5 s la veta vuelve a estar entera
        this.barraGolpes(o);
        this.action = null; return;
      }
      o.golpes = 0; o.golpesAt = 0; this.barraGolpes(o);
      const pk = equippedPick(), pd = PICK_DEF[pk], od = ORE_DEF[o.ore];
      if (tryAddRes(o.ore, grVeta)) {   // la última carga: la veta se agota y arranca su reloj
        G.picks.dur[pk] = Math.max(0, (G.picks.dur[pk] || 0) - 1);
        addXp("mining", xpDeNodo("ore", o.ore)); statAdd("minar", o.ore, grVeta);   // 16/8: XP = minutos del reloj (bronce 8 h → 480 … oro 14 h → 840)
        nodoSumar(o);
        o.cdIni = nowMs(); o.readyAt = nowMs() + nodoCd(o, o.ore, od.cd) * 1000 * cdMult();
        o.halfAt = nowMs() + (o.readyAt - nowMs()) / 2; this.syncNodos();
        if (this.textures.exists(o.baseKey + "_mined")) this.setObjTex(o, o.baseKey + "_mined", o.rw || GF.TILE); else o.sprite.setAlpha(0.4);
        log(`${od.emoji} +${grVeta} ${od.label}. Quedan ${G.picks.dur[pk]} picos.`, "good");
        this.premioFx(o.cx, o.by, resSprite(o.ore), "+" + grVeta); refreshHud();
        if (typeof tutoEvent === "function") { tutoEvent("gather"); tutoEvent("mineore"); }
        if (G.picks.dur[pk] <= 0) { log("Usaste tu último " + pd.label + " — crafteá más en la Herrería.", "bad"); toast("Sin picos — crafteá más"); destroyPick(pk); }
      } else { this.setObjTex(o, o.baseKey, o.rw || o.w); toast("Bolsa llena — no podés picar"); log("Bolsa llena: liberá espacio para seguir picando.", "bad"); }
    } else if (a.kind === "plant") {
      const ck = a.seed || G.selSeed, cd = CROP_DEF[ck];   // la semilla que se validó al hacer clic (cambiarla a mitad de la animación no la cuela)
      if (cd && (G.seeds[ck] || 0) > 0) {
        G.seeds[ck]--; o.cropKey = ck; o.state = "growing"; o.witherAt = 0;
        // acelerador del tutorial (12/8): la papa crece rápido SOLO mientras el objetivo activo la pide
        // 14/8: el boost del tutorial aplica a CUALQUIER cultivo (antes solo papa) — el
        // sub-objetivo puede mandar a cebolla/zanahoria y tienen que crecer acelerados igual
        const boost = (typeof tutoBoost === "function") ? tutoBoost("papa") : 1;
        const real = cd.grow * 1000 * cdMult() * boost;
        // (14/8: la aceleración del plan se eliminó — física única; el aviso de meta cubierta vive en tutoAvisoCubierto)
        const starter = (G.firstSeeds || 0) > 0 && FIRST_GROW_MS > 0;   // solo las semillas del starter pack
        if (starter) G.firstSeeds--;
        o.readyAt = nowMs() + (starter ? Math.min(FIRST_GROW_MS, real) : real);   // nunca más lento que el tiempo real del cultivo
        o.growTotal = o.readyAt - nowMs();
        this.showGrowing(o, true);   // recién plantado: el brote asoma con un saltito
        this.syncPlots(); addXp("farming", 5); statAdd("plantar", ck); log(`Plantaste ${cd.label}.`, "good"); toast("" + cd.label);
        if (typeof tutoEvent === "function") tutoEvent("plant");
        if (isOpen("ov-inv")) refreshInv();
      }
    } else if (a.kind === "harvest") {
      const ck = o.cropKey || "papa", cd = CROP_DEF[ck] || CROP_DEF.papa;
      const gr = Math.max(1, cd.yield || 1);   // 18/8: el bono del Granero se cobra al VENDER, no al cosechar
      if (tryAddRes(ck, gr)) { o.state = "dry"; o.cropKey = null; o.readyAt = 0; o.witherAt = 0; this.setPlotGlow(o, "off"); this.coinBurst(o.cx, o.by); o.spr.setVisible(false); o.emo.setVisible(false); o.timer.setVisible(false); this.syncPlots(); addXp("farming", (cd && cd.xp) || 2); if (!G.firstCropDone) G.firstCropDone = true; if (typeof tutoEvent === "function") tutoEvent("harvest"); this.premioFx(o.cx, o.by, resSprite(ck), "+" + gr); log(`${cd.emoji} +${gr} ${cd.label}.`, "good"); refreshHud(); }
      else { toast("Bolsa llena — no podés cosechar"); log("Bolsa llena: liberá espacio para cosechar.", "bad"); }
    } else if (a.kind === "fish") {
      this.clearBobber();
      goFishing();
    }
    this.action = null;
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

  /* ---- SKINS DEL COFRE Y DEL NIVEL 50 (10/8) ---------------------------------
     Eran los últimos cosméticos que existían solo como texto:
       sombrero  -> Sombrero de paja brillante sobre la cabeza del granjero (sprite
                    PixelLab "skin_sombrero" si está; si no, dibujado por código)
       petalos   -> Camino de pétalos: caminando vas dejando pétalos que se apagan
       granjaOro -> Granja legendaria: valla dorada + chispas de oro que flotan */
  updateSkins() {
    const c = (typeof cosElegido === "function") ? cosElegido() : {};
    // sombrero
    const sombOn = c.sombrero && (typeof cosSombreroDisponible !== "function" || cosSombreroDisponible());
    if (!sombOn && this.hatFx) { this.hatFx.destroy(); this.hatFx = null; }
    if (sombOn && !this.hatFx && this.hero) {
      if (this.textures.exists("skin_sombrero")) {
        this.hatFx = this.add.image(0, 0, "skin_sombrero").setOrigin(0.5, 0.9);
        this.hatFx.setDisplaySize(Math.round(this.hatFx.width * 20 / this.hatFx.height), 20);
      } else {   // respaldo por código hasta que llegue el arte: paja + cinta roja + brillo
        const g = this.add.graphics();
        g.fillStyle(0xe8c25a, 1).fillEllipse(0, 2, 26, 9);           // ala
        g.fillStyle(0xf2d06b, 1).fillEllipse(0, -3, 14, 10);         // copa
        g.fillStyle(0xc23a3a, 1).fillRect(-7, -2, 14, 3);            // cinta
        g.fillStyle(0xfff3cf, 0.9).fillCircle(6, -6, 1.5);           // destello
        this.hatFx = g;
      }
      this.tweens.add({ targets: this.hatFx, alpha: 0.88, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });   // el "brillante" late suave
    }
    // granja legendaria: valla dorada + chispas
    const oroOn = c.granjaOro && (typeof cosGranjaOroDisponible !== "function" || cosGranjaOroDisponible());
    (this.fenceSprites || []).forEach(f => { if (f.active) { if (oroOn) f.setTint(0xe8c25a); else f.clearTint(); } });
    if (oroOn && !this.oroTimer) {
      this.oroTimer = this.time.addEvent({ delay: 700, loop: true, callback: () => {
        const W = GF.WORLD_W, H = GF.WORLD_H;   // una chispa dorada al azar que sube y se apaga
        const x = GF.ORIG_X + 20 + Math.random() * (W - 40), y = GF.ORIG_Y + 30 + Math.random() * (H - 40);
        const p = this.add.circle(x, y, 1.5 + Math.random() * 1.5, 0xffd75e, 0.9).setDepth(y).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, y: y - 14 - Math.random() * 10, alpha: 0, duration: 1400 + Math.random() * 600, onComplete: () => p.destroy() });
      } });
    } else if (!oroOn && this.oroTimer) { this.oroTimer.remove(); this.oroTimer = null; }
  }
  // por cuadro: el sombrero acompaña la cabeza y los pétalos caen al caminar
  seguirSkins() {
    const h = this.hero; if (!h) return;
    const c = (typeof cosElegido === "function") ? cosElegido() : {};
    if (this.hatFx) {
      const sign = this.facing === "west" ? -1 : 1;
      this.hatFx.setPosition(h.x + sign * 1, h.y - h.displayHeight + 4).setDepth(h.y + 1).setVisible(h.visible);
      if (this.hatFx.setFlipX) this.hatFx.setFlipX(sign < 0); else this.hatFx.scaleX = Math.abs(this.hatFx.scaleX) * sign;
    }
    const petOn = c.petalos && (typeof cosPetalosDisponible !== "function" || cosPetalosDisponible());
    if (petOn && h.visible) {
      const lp = this.lastPetal || { x: h.x, y: h.y };
      if (Math.hypot(h.x - lp.x, h.y - lp.y) > 14) {   // un pétalo cada ~14 px caminados
        this.lastPetal = { x: h.x, y: h.y };
        const cols = [0xe8a8c8, 0xf6cadd, 0xd98ad4];
        const p = this.add.ellipse(h.x + (Math.random() - 0.5) * 12, h.y - 1 + (Math.random() - 0.5) * 5,
          4, 2.5, cols[(Math.random() * cols.length) | 0], 0.85).setDepth(h.y - 2).setAngle(Math.random() * 360);
        this.tweens.add({ targets: p, alpha: 0, angle: p.angle + 40, duration: 3200 + Math.random() * 800, ease: "Quad.easeIn", onComplete: () => p.destroy() });
      }
    }
  }
  // flecha del tutorial: triángulo dorado que rebota sobre el objetivo del paso actual
  updateTutoArrow() {
    if (this.tutoArrow) { this.tutoArrow.destroy(); this.tutoArrow = null; if (this.tutoTw) { this.tutoTw.stop(); this.tutoTw = null; } }
    if (window.guiaOn && !guiaOn()) return;   // 14/8: guía opcional apagada — sin flecha en el mundo
    let st = (typeof tutoActivo === "function") ? tutoActivo() : null;
    if (!st) return;
    // 13/8 v3: el SUB-OBJETIVO dinámico (sin hachas, pico roto…) pisa el destino de la flecha
    const sub = (typeof tutoSub === "function") ? tutoSub() : null;
    if (sub) st = Object.assign({}, st, { target: null }, sub);
    let x = null, y = null;
    // 15/8 (playtest: la escolta revoloteaba sobre una veta EN ENFRIAMIENTO): un nodo solo
    // se señala si se puede usar YA — sin cooldown, sin freno de nivel y con pico del tier.
    // Si todo está enfriándose no se señala ninguno: la madurez avisa sola cuando vuelve.
    const ahora = nowMs(), eqPk = (typeof equippedPick === "function") ? equippedPick() : null;
    const usable = (o) => !(o.readyAt && o.readyAt > ahora)
      && !((o.golpes || 0) > 0)   // a medio talar/picar: tampoco (15/8)
      && !(typeof nodoBloqueado === "function" && nodoBloqueado(o))
      && (o.type !== "ore" || (eqPk && PICK_DEF[eqPk].mineTier >= (ORE_DEF[o.ore] ? ORE_DEF[o.ore].tier : 99)));
    if (st.target === "plot") { const pl = (this.plots || []).find(o => o.state !== "locked"); if (pl) { x = pl.cx; y = pl.by - GF.TILE * 0.9; } }
    else if (st.target === "ore") { const o = (this.objs || []).find(o => o.type === "ore" && !o.locked && usable(o)); if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; } }
    else if (st.target === "portal") { const o = this.portal; if (o) { x = o.cx; y = o.by - 70; } }
    else if (st.target === "tree" || st.target === "rock") {
      const tipos = st.target === "rock" ? ["rock", "ore"] : ["tree"];
      const o = (this.objs || []).find(o => tipos.includes(o.type) && !o.locked && usable(o));
      if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; }
    }
    else { const o = (this.objs || []).find(o => o.type === st.target && !o.oculto); if (o) { x = o.cx; y = o.by - (o.sprite ? o.sprite.displayHeight : 60) - 10; } }   // sin plano colocado no hay a qué apuntar (12/8)
    if (x == null) { this.guiaTarget = null; return; }
    // 14/8 v2 (dirección): en el MUNDO señala la MARIPOSA GUÍA, no una flecha — la 1ª
    // mariposa revolotea sobre el objetivo (tickMariposas). La flecha DOM sigue en interfaces.
    this.guiaTarget = { x, y };
    this._mariAt = 0;   // re-asignar destinos ya mismo
  }

  // TINTE DE LA VETA (9/8): el color va sobre la roca ENTERA, no solo sobre las pepitas.
  // Es lo único que se lee a 38 px. Convive con el gris de "bloqueado / sin construir",
  // que siempre gana. Hay que llamarlo cada vez que algo hace clearTint() sobre el nodo.
  tintarNodo(o) {
    const s = o && o.sprite; if (!s || !s.setTint) return;
    if (o.locked || (typeof BUILD_DEF !== "undefined" && BUILD_DEF[o.type] && !(G.built && G.built[o.type]))) {
      const k = s.texture ? String(s.texture.key) : "";
      // la OBRA (build_*) y el RETOÑO se ven a todo color; el gris es solo respaldo (12/8)
      if (k !== "tree_sapling" && k.indexOf("build_") !== 0) s.setTint(0x555555);
      return;
    }
    const t = (NODO_TINTE && (o.type === "ore" || o.type === "rock") && GF.ORE_TINTE) ? GF.ORE_TINTE[o.ore || "piedra"] : null;
    if (t && t !== 0xffffff) s.setTint(t); else s.clearTint();
  }

  setObjTex(o, key, targetW) {
    if (o.sprite._popTw) { o.sprite._popTw.stop(); o.sprite._popTw = null; }   // un pop a medias no debe pelear con la escala nueva
    this.copaSacar(o);   // cambia la imagen: se rehace el recorte copa/tronco desde cero
    o.sprite.setTexture(key); o.sprite.setScale(targetW / o.sprite.width);
    if (o.shadow) o.shadow.setScale(targetW / (o.rw || o.w));   // la sombra acompaña (tocón chico → sombra chica)
  }

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
    /* 19/8 (dirección, SEGUNDO reporte del mismo fallo) — ÉSTA era la puerta que faltaba.
       La primera corrección la puse en el clic sobre el OBJETO pesquero, pero al agua se le hace
       clic por otro camino: pondDist() → tryFish(), que tiene cinco llamadores (el clic, el clic
       sostenido, la tecla de acción, el clic del móvil…). Arreglar una de las dos puertas y dar el
       trabajo por bueno es exactamente el error que mi propio auditor no vio: comprobaba UN sitio
       donde se llama a startAction("fish") cuando hay DOS.
       Las cuatro comprobaciones tienen que estar en las dos puertas, y el descanso primero. */
    if (this.action) return;
    const pF = puedeAccion("fish", { type: "fish" });
    if (!pF.ok) { avisoAccion(pF); return; }
    const p = GF.POND, T = GF.TILE;
    const bx = clickX != null ? clickX : (p.col + p.cols / 2) * T, by2 = clickY != null ? clickY : (p.row + p.rows / 2) * T;
    this.startAction("fish", { cx: (p.col + p.cols / 2) * T, bx, by2 });
  }

  // marca visual breve sobre un objetivo encolado
  // borde de ARRIBA del sprite en coordenadas del mundo (el arte tiene alturas muy distintas)
  topY(o, gap) {
    gap = gap || 7;
    const s = (o.sprite && o.sprite.visible) ? o.sprite : ((o.spr && o.spr.visible) ? o.spr : null);
    if (s) { const b = s.getBounds(); if (b.height) return b.top - gap; }
    return o.by - GF.TILE * 0.75 - gap;
  }

  // PRESUPUESTO DE PARTÍCULAS: en el server gratis y en móvil no conviene pasarse. Cada efecto
  // pide cuántas quiere y se le da lo que quede libre (si no queda, no dibuja nada y listo).
  pidoPart(n) {
    this._part = this._part || 0;
    const libre = Math.max(0, (FX_PART_MAX || 40) - this._part);
    const dar = Math.min(n, libre);
    this._part += dar;
    return dar;
  }
  sueltoPart(n) { this._part = Math.max(0, (this._part || 0) - n); }

  // DESTELLO BLANCO (medido de Sunflower Land): al recibir el golpe el nodo se pone blanco un
  // instante y vuelve. Es el efecto que más "pega" de todos y no cuesta nada: en SFL el cactus
  // NUNCA cambia de dibujo mientras lo talás, solo late en blanco cada ~117 ms.
  destelloFx(o) {
    const ms = Math.max(30, FX_DESTELLO_MS || 90);
    // sirve para nodos (sprite + copa) y para parcelas (spr del cultivo)
    [o.sprite, o.copa, o.spr].forEach(s => {
      if (!s || !s.setTintFill || !s.visible) return;
      s.setTintFill(0xffffff);
      this.time.delayedCall(ms, () => { if (s && s.clearTint && s.active) { s.clearTint(); this.tintarNodo(o); } });   // y vuelve el color del mineral
    });
  }

  // ESTILO ÚNICO DE BARRITA (4/8): contorno oscuro + marco claro + relleno verde, como las de
  // Sunflower Land. La usan tanto el crecimiento de las parcelas como los golpes a árboles y vetas,
  // así todas las barras del mundo se ven iguales.
  dibujarBarra(g, cx, y, w, h, pct) {
    const x = Math.round(cx - w / 2);
    g.clear();
    g.fillStyle(0x241505, 1).fillRect(x - 3, y - 3, w + 6, h + 6);   // contorno oscuro (estándar del juego)
    g.fillStyle(0xe8e0c8, 1).fillRect(x - 1.5, y - 1.5, w + 3, h + 3);   // marco claro
    g.fillStyle(0x2a3a1c, 1).fillRect(x, y, w, h);                       // lo que falta
    g.fillStyle(0x8fd14f, 1).fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);   // lo hecho
  }

  // BARRITA DE PROGRESO bajo el nodo mientras lo golpeás (SFL la muestra desde el primer clic).
  // Aparece con el primer golpe y se va sola cuando el nodo cae o cuando se pierden los golpes.
  barraGolpes(o) {
    if (!FX_BARRA_GOLPES) { if (o.barra) { o.barra.destroy(); o.barra = null; } return; }
    const total = o.type === "tree" ? GOLPES_TALAR : GOLPES_MINAR;
    const n = o.golpes || 0;
    if (n <= 0 || n >= total) { if (o.barra) { o.barra.destroy(); o.barra = null; } return; }
    if (!o.barra) o.barra = this.add.graphics().setDepth(o.by + 3);
    this.dibujarBarra(o.barra, o.cx, o.by + 5, 28, 6, n / total);   // mismo estilo que la de crecimiento
  }

  // BARRITA DE CRECIMIENTO sobre la parcela (copiada de Sunflower Land, videos del diseñador).
  // Mientras el cultivo crece se ve SIEMPRE —sin pasar el cursor— con el tiempo que falta arriba.
  // Cuando está listo desaparece: ahí lo que habla es la planta entera. De un vistazo se sabe qué
  // parcela cosechar y cuánto le falta a cada una de las demás.
  barraCultivo(pl, t) {
    const crece = FX_BARRA_CULTIVO && pl.state === "growing" && pl.readyAt > t;
    if (!crece) {
      if (pl.barraG) { pl.barraG.destroy(); pl.barraG = null; pl.barraPct = null; }
      if (pl.timer) pl.timer.setVisible(false);
      return;
    }
    const total = pl.growTotal || (pl.readyAt - t);
    const pct = Math.max(0, Math.min(1, 1 - (pl.readyAt - t) / Math.max(1, total)));
    // Se ancla al SPRITE REAL de la tierra, no a las coordenadas teóricas: así queda centrada
    // aunque la parcela se haya movido en el modo edición o el dibujo no ocupe la celda entera.
    // Va ABAJO de la planta, apoyada sobre el borde inferior de la tierra pero POR DENTRO
    // (pedido del diseñador): así no tapa el cultivo ni se mete en la parcela de al lado.
    const suelo = pl.ground;
    const cx = Math.round(suelo ? suelo.x : pl.cx);
    const abajo = suelo ? (suelo.y + suelo.displayHeight / 2) : (pl.by + GF.TILE / 2);
    const h = 6;
    const y = Math.round(abajo - 4 - h) + (FX_BARRA_DY || 0);   // apoyada por dentro del borde de abajo
    // el texto va justo ARRIBA de la barra (en SFL se lee "18m", "20h", "7d 13h")
    // 13/8 (audio): el TEXTO solo con el cursor encima (la barrita de progreso queda siempre)
    if (pl.timer) pl.timer.setText(fmtCorto((pl.readyAt - t) / 1000)).setPosition(cx, y - 2).setDepth(pl.by + 3).setVisible(this.timerOn(pl));
    if (!pl.barraG) pl.barraG = this.add.graphics().setDepth(pl.by + 2);
    if (pl.barraPct != null && Math.abs(pl.barraPct - pct) < 0.004) return;   // sin cambio visible: no redibujar
    pl.barraPct = pct;
    this.dibujarBarra(pl.barraG, cx, y, 28, h, pct);
  }

  // PREMIO VOLANDO: el recurso sale en arco desde el nodo con su "+N", como el tronco de SFL.
  premioFx(x, y, spriteKey, texto) {
    if (!FX_PREMIO) return;
    const dx = 26 + Math.random() * 14, dy = -30 - Math.random() * 10;
    const px = Math.max(6, FX_PREMIO_PX || 22);
    let ic = null;
    if (spriteKey && this.textures.exists(spriteKey)) {
      ic = this.add.image(x, y - 10, spriteKey).setDepth(99997);
      ic.setDisplaySize(px, px * (ic.height / Math.max(1, ic.width)));   // tamaño fijo: los PNG vienen a ~106 px
    }
    const t = this.add.text(x + (ic ? px * 0.75 : 0), y - 10, texto, {
      fontFamily: "system-ui", fontSize: Math.max(9, FX_PREMIO_TXT || 15) + "px", fontStyle: "bold",
      color: "#fff8e0", stroke: "#241505", strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(99998);
    [ic, t].forEach((el, i) => {
      if (!el) return;
      this.tweens.add({ targets: el, x: el.x + dx, duration: 900, ease: "Sine.easeOut" });
      this.tweens.add({ targets: el, y: el.y + dy, duration: 420, ease: "Quad.easeOut", yoyo: false });
      this.tweens.add({ targets: el, alpha: 0, delay: 520, duration: 380, onComplete: () => el.destroy() });
    });
  }

  // IMPACTO DEL GOLPE (4/8): el nodo se sacude hacia el lado contrario al hachazo y suelta
  // astillas (madera) o esquirlas (piedra). Antes el árbol solo cambiaba de imagen y los
  // 3 clics no se sentían como 3 golpes.
  golpeFx(o, tipo) {
    if (!FX_IMPACTO || !o || !o.sprite || !o.sprite.visible) return;
    const spr = o.copa || o.sprite;   // si el árbol está partido en copa/tronco, se sacude la copa
    // el granjero (invisible) trabaja al costado del nodo: el golpe empuja hacia el lado opuesto
    const desde = (this.hero && this.hero.x > o.cx) ? -1 : 1;
    const g = FX_IMPACTO_GRADOS * desde;
    if (spr._golpeTw) spr._golpeTw.stop();
    const base = spr.angle;
    spr.setAngle(base + g);
    spr._golpeTw = this.tweens.add({
      targets: spr, angle: base, duration: 190, ease: "Back.easeOut",
      onComplete: () => { spr._golpeTw = null; },
    });
    // astillas: salen del punto de impacto hacia el lado del golpe
    const madera = tipo === "chop";
    const n = this.pidoPart(madera ? 7 : 6);
    const ix = o.cx - desde * 6, iy = o.by - (spr.displayHeight || GF.TILE) * (madera ? 0.42 : 0.35);
    for (let i = 0; i < n; i++) {
      const a = (desde < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
      const r = 14 + Math.random() * 20;
      const col = madera ? (i % 2 ? 0x996633 : 0xc79a5a) : (i % 2 ? 0xb4b2a9 : 0xe8e4d8);
      const p = madera
        ? this.add.rectangle(ix, iy, 3, 1.6, col).setAngle(Math.random() * 180).setDepth(99995)
        : this.add.circle(ix, iy, 1.4 + Math.random(), col, 1).setDepth(99995);
      this.tweens.add({
        targets: p, x: ix + Math.cos(a) * r, y: iy + Math.sin(a) * r * 0.55 + 10 + Math.random() * 8,
        angle: p.angle + (Math.random() - 0.5) * 260, alpha: 0,
        duration: 300 + Math.random() * 220, ease: "Quad.easeIn",
        onComplete: () => { p.destroy(); this.sueltoPart(1); },
      });
    }
  }

  // "POP" DE CRECIMIENTO (4/8): el sprite se aplasta un instante y vuelve a su tamaño con rebote
  // elástico, como un resorte, hasta quedar quieto. Los sprites tienen el origen abajo, así que
  // el rebote se lee como si la planta saltara desde la tierra.
  popFx(spr, fuerza, alTerminar) {
    if (!spr || !spr.visible) { if (alTerminar) alTerminar(); return; }
    const f = Math.max(0, (fuerza == null ? 1 : fuerza) * POP_FUERZA);
    if (!POP_ON || f <= 0) { if (alTerminar) alTerminar(); return; }
    if (spr._popTw) { spr._popTw.stop(); spr._popTw = null; }
    const bx = spr.scaleX, by = spr.scaleY;
    spr.setScale(bx * (1 + 0.28 * f), by * (1 - 0.24 * f));   // achatado y ancho: el "impulso"
    spr._popTw = this.tweens.add({
      targets: spr, scaleX: bx, scaleY: by,
      duration: Math.max(120, POP_MS), ease: "Elastic.easeOut", easeParams: [1, 0.42],
      onComplete: () => { spr._popTw = null; spr.setScale(bx, by); if (alTerminar) alTerminar(); },
    });
  }
  // chispita de polvo/hojas que acompaña al pop (partículas por código, sin arte)
  puffFx(x, y, color, n) {
    const cuantas = this.pidoPart(n || 6);
    for (let i = 0; i < cuantas; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, r = 12 + Math.random() * 16;
      const p = this.add.circle(x, y, 1.5 + Math.random() * 1.5, color, 0.9).setDepth(99995);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.8,
        alpha: 0, scale: 0.4, duration: 380 + Math.random() * 260,
        onComplete: () => { p.destroy(); this.sueltoPart(1); },
      });
    }
  }

  // ================= CORRAL Y ANIMALES (4/8) =================================
  // Los animales del Establo ya no viven solo dentro de una ventana: caminan por un corral
  // en la granja. Los sprites son PROVISORIOS (dibujados por código en
  // tools/animales-provisorios.py); cuando llegue el arte definitivo se reemplazan los PNG
  // y este código no cambia, porque usa las mismas claves "animal_<nombre>".
  crearCorral() {
    this.animales = [];
    const T = GF.TILE;
    // 9/8: los animales andan SUELTOS por la granja. No se dibuja patio ni cerca; la zona
    // por donde pueden caminar es la granja entera y lo que esquivan se decide en puntoAnimal().
    if (!GF.CORRAL_ON) {
      this.corral = { x1: GF.ORIG_X + 26, y1: GF.ORIG_Y + T * 1.2, x2: GF.ORIG_X + GF.WORLD_W - 26, y2: GF.ORIG_Y + GF.WORLD_H - 26 };
      this.corralCerca = null;
      return;
    }
    const C = GF.CORRAL; if (!C) return;
    const x1 = C.col * T, y1 = C.row * T, w = C.cols * T, h = C.rows * T;
    this.corral = { x1, y1, x2: x1 + w, y2: y1 + h };
    // piso: un parche de tierra pisoteada, más claro que el pasto
    const g = this.add.graphics().setDepth(-997);
    g.fillStyle(0xa88a52, 0.55).fillRoundedRect(x1 + 3, y1 + 3, w - 6, h - 6, 10);
    g.fillStyle(0x8a6a3a, 0.35).fillRoundedRect(x1 + 9, y1 + 9, w - 18, h - 18, 8);
    // cerca de madera: postes con dos travesaños, dibujada por código (sin arte nuevo)
    const cerca = this.add.graphics().setDepth(y1 + h + 1);
    const poste = (px, py) => {
      cerca.fillStyle(0x241505, 1).fillRect(px - 3, py - 16, 6, 18);
      cerca.fillStyle(0x8a5a33, 1).fillRect(px - 2, py - 15, 4, 16);
    };
    cerca.fillStyle(0x241505, 1);
    [y1, y1 + h].forEach(py => { cerca.fillRect(x1, py - 11, w, 3); cerca.fillRect(x1, py - 5, w, 3); });
    [x1, x1 + w].forEach(px => { cerca.fillRect(px - 1, y1 - 11, 3, h + 11); });
    cerca.fillStyle(0xa8712f, 1);
    [y1, y1 + h].forEach(py => { cerca.fillRect(x1, py - 10, w, 1); cerca.fillRect(x1, py - 4, w, 1); });
    for (let c = 0; c <= C.cols; c++) { poste(x1 + c * T, y1); poste(x1 + c * T, y1 + h); }
    this.corralCerca = cerca;
  }
  // ¿este punto sirve para que camine un animal? (9/8)
  // Con el corral encendido alcanza con estar adentro. Sueltos, hay que esquivar edificios,
  // vetas, la laguna, la cerca del borde y las parcelas: un animal parado sobre los cultivos
  // los tapa y encima confunde, porque parece que hay algo para cosechar ahí.
  animalPuedeEstar(x, y) {
    const C = this.corral; if (!C) return false;
    if (x < C.x1 || x > C.x2 || y < C.y1 || y > C.y2) return false;
    if (!GF.CORRAL_ON) {
      if (GF.blockedAt(x, y, 10)) return false;
      const T = GF.TILE, col = Math.floor(x / T), row = Math.floor(y / T);
      if (GF.parcelaEn(col, row)) return false;   // 18/8: solo las TUYAS ocupan celda
      if ((G.decos || []).some(d => d.id === "valla" && d.col === col && d.row === row)) return false;   // fixs #13: la valla puesta FRENA a los animales
    }
    return true;
  }
  // fixs.docx #11 (11/8): lluvia de estrellitas al recoger materiales de un animal
  estrellasFx(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 18;
      const s = this.add.text(x, y, i % 3 ? "★" : "✨", { fontSize: (9 + Math.random() * 5) + "px", color: i % 2 ? "#ffd75e" : "#fff3cf", stroke: "#20301a", strokeThickness: 2 })
        .setOrigin(0.5).setDepth(99999).setAlpha(0.95);
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 10, angle: (Math.random() - 0.5) * 180,
        alpha: 0, duration: 520 + Math.random() * 260, ease: "Quad.easeOut", onComplete: () => s.destroy() });
    }
  }
  // un destino nuevo cerca de donde está el animal (o en cualquier lado si no se le pasa origen)
  puntoAnimal(desdeX, desdeY) {
    const C = this.corral; if (!C) return null;
    const R = GF.ANIMAL_RADIO || GF.TILE * 2.6;
    for (let i = 0; i < 30; i++) {
      let x, y;
      if (desdeX == null) { x = C.x1 + 20 + Math.random() * (C.x2 - C.x1 - 40); y = C.y1 + 22 + Math.random() * (C.y2 - C.y1 - 34); }
      else { const ang = Math.random() * 6.283, dist = R * (0.35 + Math.random() * 0.65); x = desdeX + Math.cos(ang) * dist; y = desdeY + Math.sin(ang) * dist; }
      if (!this.animalPuedeEstar(x, y)) continue;
      // el camino es en línea recta: si el punto medio está tapado, el animal cruzaría un edificio
      if (desdeX != null && !this.animalPuedeEstar((x + desdeX) / 2, (y + desdeY) / 2)) continue;
      return { x, y };
    }
    return null;
  }

  /* ---- ADORNOS DE LA GRANJA (10/8) -------------------------------------------
     Ya tienen arte propio de PixelLab (deco_<id> en el atlas). Si por lo que sea falta
     el sprite, cae al dibujo por código de más abajo, que es el que se usó mientras se
     probaba el sistema (comprar, colocar, guardar, levantar). */
  dibujarAdorno(id, x, y) {
    // sprite definitivo: se apoya en el suelo (origen abajo-centro) y se ordena por Y como todo lo demás
    if (this.textures.exists("deco_" + id)) {
      const alto = DECO_ALTO[id] || 30;
      const im = this.add.image(x, y, "deco_" + id).setOrigin(0.5, 1).setDepth(y);
      im.setDisplaySize(Math.round(im.width * alto / im.height), alto);
      if (id !== "farolito") return im;
      // el farolito es el único adorno ANIMADO: las luciérnagas del frasco laten.
      // Va en un contenedor para que al levantarlo se borre también el resplandor.
      const c = this.add.container(x, y).setDepth(y);
      const luz = this.add.circle(0, -alto * 0.62, alto * 0.42, 0xffe08a, 0.30);
      im.setPosition(0, 0);
      c.add([luz, im]);
      c.setSize(im.displayWidth, alto);
      this.tweens.add({ targets: luz, alpha: 0.12, scale: 0.78, duration: 1100 + Math.random() * 500,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      return c;
    }
    const g = this.add.graphics().setDepth(y);
    const MAD = 0x8a5a33, MAD2 = 0xa8712f, OSC = 0x241505, PIE = 0x8b8f8c, VER = 0x55733f;
    if (id === "valla") {
      g.fillStyle(OSC, 1).fillRect(-20, -16, 40, 3).fillRect(-20, -8, 40, 3);
      g.fillStyle(MAD2, 1).fillRect(-20, -15, 40, 1).fillRect(-20, -7, 40, 1);
      [-18, 0, 18].forEach(px => { g.fillStyle(OSC, 1).fillRect(px - 2, -20, 5, 20); g.fillStyle(MAD, 1).fillRect(px - 1, -19, 3, 18); });
    } else if (id === "flores") {
      g.fillStyle(0x6b4a2a, 1).fillRoundedRect(-16, -10, 32, 10, 3);
      g.fillStyle(VER, 1).fillRect(-14, -13, 28, 4);
      [[-9, -15, 0xe86a6a], [0, -17, 0xf2d06b], [9, -15, 0xd98ad4]].forEach(([px, py, c]) => {
        g.fillStyle(c, 1).fillCircle(px, py, 3).fillStyle(0xfff0b8, 1).fillCircle(px, py, 1.2);
      });
    } else if (id === "farol") {
      g.fillStyle(OSC, 1).fillRect(-2, -26, 5, 26);
      g.fillStyle(0x4a4038, 1).fillRoundedRect(-7, -38, 15, 13, 3);
      g.fillStyle(0xffd88a, 0.95).fillRoundedRect(-5, -36, 11, 9, 2);
    } else if (id === "banco") {
      g.fillStyle(OSC, 1).fillRect(-16, -10, 32, 4).fillRect(-14, -20, 28, 3);
      g.fillStyle(MAD, 1).fillRect(-16, -9, 32, 2).fillRect(-14, -19, 28, 1);
      [-13, 13].forEach(px => g.fillStyle(0x4a4038, 1).fillRect(px - 1, -10, 3, 10));
    } else if (id === "espantapajaros") {
      g.fillStyle(OSC, 1).fillRect(-1, -30, 3, 30).fillRect(-12, -22, 25, 3);
      g.fillStyle(0xd9b871, 1).fillCircle(0, -33, 6);
      g.fillStyle(OSC, 1).fillCircle(-2, -34, 1).fillCircle(2, -34, 1);
      g.fillStyle(0x9c5a3c, 1).fillTriangle(-8, -38, 8, -38, 0, -45);
    } else if (id === "fuente") {
      g.fillStyle(PIE, 1).fillEllipse(0, -6, 44, 20);
      g.fillStyle(0x5cb4d8, 1).fillEllipse(0, -7, 34, 13);
      g.fillStyle(PIE, 1).fillRect(-3, -22, 7, 15).fillEllipse(0, -24, 16, 7);
      g.fillStyle(0xdff2ff, 0.85).fillEllipse(0, -25, 10, 4);
    } else if (id === "estatua") {
      g.fillStyle(PIE, 1).fillRect(-11, -8, 23, 8);
      g.fillStyle(0xd9a521, 1).fillRect(-5, -28, 11, 20);
      g.fillStyle(0xffe08a, 1).fillCircle(0, -32, 6).fillRect(-4, -27, 8, 4);
    } else if (id === "arbolito") {
      g.fillStyle(0x6b4a2a, 1).fillRect(-3, -16, 7, 16);
      [[0, -30, 14], [-10, -24, 10], [10, -24, 10]].forEach(([px, py, r]) => {
        g.fillStyle(0xe8a8c8, 1).fillCircle(px, py, r);
        g.fillStyle(0xf6cadd, 1).fillCircle(px - r * 0.25, py - r * 0.25, r * 0.55);
      });
    } else {
      g.fillStyle(MAD, 1).fillRoundedRect(-10, -20, 21, 20, 4);
    }
    g.setPosition(x, y);
    return g;
  }
  // arranca el "colocar con clic" (#14/#17): el próximo clic en edición coloca esto en esa celda
  iniciarColocar(tipo, id) {
    this.placingAuto = !GF.editMode;   // 13/8: vino de la bolsa/hotbar → al terminar o cancelar vuelve al modo normal
    if (!GF.editMode && window.setEditMode) setEditMode(true);   // por si vino de la Tienda o la bolsa
    this.placing = { tipo, id };
    if (window.syncPlacingUI) syncPlacingUI(true);   // muestra el botón Cancelar de la barra de edición
    toast(tipo === "plot" ? "Clic en la celda donde va la parcela (clic derecho cancela)"
        : tipo === "obra" ? "Clic donde querés levantar la obra (clic derecho cancela)"
        : tipo === "regalo" ? "Clic en la celda donde va " + ({ plot: "la parcela", tree: "el árbol", rock: "la roca" }[id] || "esto") + " (clic derecho cancela)"
                          : "Clic en la celda donde va el adorno (clic derecho cancela)");
  }
  /* ¿QUÉ CELDAS OCUPA LO QUE LLEVO EN LA MANO, Y CABEN? (18/8)
     Una sola función para el rectángulo verde/rojo y para la comprobación al soltar. Mientras
     fueron dos, el marcador mentía: decía que sí sobre una celda y el árbol pedía dos. */
  huellaColocar(col, row) {
    const pl = this.placing;
    let ancho = 1, c0 = col;
    if (pl) {
      if (pl.tipo === "obra") { ancho = 3; c0 = col - 1; }                 // la obra se centra en el cursor
      else if (pl.tipo === "regalo" && pl.id === "tree") ancho = 2;
    }
    const prueba = (desde) => {
      let ok = true, por = null;
      for (let c = desde; c < desde + ancho; c++)
        if (!this.celdaLibreAdorno(c, row, -1)) { ok = false; if (!por) por = this.porQueNoEntra(c, row, -1); }
      return { ok, por };
    };
    let r = prueba(c0);
    /* 18/8 (reporte de dirección: "hay dos celdas vacías y al árbol no lo he podido poner ahí").
       El árbol mide DOS celdas y crecía siempre HACIA LA DERECHA. Si señalabas la celda libre que
       toca la cerca por su derecha, la segunda caía sobre la cerca y salía rojo — aunque la celda
       que señalabas, y la de su izquierda, estuvieran las dos libres. Desde fuera se lee como una
       celda bloqueada sin nada dentro, que es exactamente lo que se reportó.
       Ahora, si no cabe hacia la derecha, se prueba hacia la IZQUIERDA. La pieza se acomoda al
       hueco en vez de exigirle al jugador que adivine por qué lado va a crecer. */
    if (!r.ok && ancho > 1 && !pl.tipoFijo) {
      const alt = prueba(c0 - (ancho - 1));
      if (alt.ok) return { c0: c0 - (ancho - 1), ancho, libre: true, motivo: null };
    }
    return { c0, ancho, libre: r.ok, motivo: r.por };
  }
  // 13/8: colocar en la celda elegida (lo llama pointerup si el clic no fue paneo)
  colocarEn(wx, wy) {
    const T = GF.TILE;
    const col = Math.floor(wx / T), row = Math.floor(wy / T);
    const pl = this.placing; if (!pl) return;
    const hu = this.huellaColocar(col, row);
    if (!hu.libre) {
      toast((hu.motivo || "Ahí no entra") + (hu.ancho > 1 ? " — esto ocupa " + hu.ancho + " celdas" : " — probá otra celda"));
      /* 18/8: y AL REGISTRO, el detalle exacto. La norma de la casa es no usar consola, así que
         cuando algo se rechaza queda escrito en el panel de Registro: qué celdas se pidieron y qué
         dice el mapa de cada una. Con eso, una captura del registro basta para saber qué pasa, en
         vez de deducirlo de una foto del pasto. */
      if (typeof log === "function") {
        const partes = [];
        for (let c = hu.c0; c < hu.c0 + hu.ancho; c++) {
          const o = GF.celdaOcupada(c, row);
          partes.push(c + "," + row + "=" + (!GF.tuyo(c, row) ? "fuera"
            : GF.enCerca(c, row) ? "cerca"
            : o ? (o.tipo + (o.ancho > 1 ? "×" + o.ancho + "@" + o.leftCol + "," + o.fila : "")) : "libre"));
        }
        log("No entra " + (pl.id || pl.tipo) + " → " + partes.join("  ·  "), "bad");
      }
      return;
    }
    if (pl.tipo === "deco") {
      if (decoColocar(pl.id, col, row)) { this.syncAdornos(); if (typeof syncEditDeco === "function") syncEditDeco(); toast(DECO_DEF[pl.id].label + " colocado"); }
      this.finColocar();
    } else if (pl.tipo === "plot") {
      this.finColocar();
      if (typeof parcelaColocar === "function" && parcelaColocar(col, row)) {
        if (!this.colocarRegaloEnVivo("plot") && typeof reiniciarGranjaSuave === "function") reiniciarGranjaSuave();
        toast("Parcela colocada");
      }
    } else if (pl.tipo === "regalo") {
      // el ancho (2 para el árbol) ya lo comprobó huellaColocar, y hu.c0 es la columna DEFINITIVA
      // (puede ser col−1 si el árbol tuvo que acomodarse hacia la izquierda)
      this.finColocar();
      if (typeof regaloColocar === "function" && regaloColocar(pl.id, hu.c0, row)) {
        // sin telón: el nodo aparece donde lo apoyaste y la cámara no se mueve
        if (!this.colocarRegaloEnVivo(pl.id) && typeof reiniciarGranjaSuave === "function") reiniciarGranjaSuave();
      }
    } else if (pl.tipo === "obra") {   // blueprint (12/8): las 3 celdas ya las comprobó huellaColocar
      this.finColocar();
      // 13/8: la obra aparece EN VIVO (el edificio ya estaba en la escena, invisible) — sin
      // reiniciar la escena ni pantalla oscura; el reinicio con telón queda de respaldo
      if (typeof obraColocar === "function" && obraColocar(pl.id, col, row, true)) {
        if (!this.colocarObraEnVivo(pl.id) && typeof reiniciarGranjaSuave === "function") reiniciarGranjaSuave();
        toast("¡Obra colocada! Llevale materiales");
      }
    }
  }
  /* ============ LA HUELLA DE LO QUE YA ESTÁ (18/8) ==================================
     Dirección: "el mensaje dice que hay un árbol, ¿pero vos ves un árbol?".
     Sí lo había: era un TOCÓN. Un árbol talado sigue ocupando sus DOS celdas, pero su dibujo es
     chico y va centrado en el tronco, así que la celda de al lado se lee como pasto vacío. El
     jugador no tenía forma de saber dónde acaba una cosa y empieza el suelo libre — y sin eso,
     cualquier rechazo parece arbitrario.
     Mientras llevás algo en la mano, se sombrean TODAS las celdas ocupadas. Es la información que
     faltaba, no hace falta arte nuevo, y desaparece en cuanto soltás. */
  dibujarOcupadas() {
    if (!this.placing) { if (this.ocupG) this.ocupG.setVisible(false); return; }
    /* 20/8 — LA FIRMA ERA SUYA Y ESTABA INCOMPLETA. Se armaba a mano con siete cosas y NO incluía
       G.built, G.obras, G.layout, los cofres ni el contador de cambios del mapa. O sea que el
       sombreado se dibujaba una vez y se quedaba: colocabas un edificio, movías algo en modo
       edición o se limpiaba un fantasma, y seguías viendo el sombreado viejo. Dos listas del mismo
       dato, otra vez, y la de aquí era la peor de las dos.
       Ahora se usa la firma DEL MAPA: si el mapa cambia, el dibujo se rehace, y no hay manera de
       que se separen. */
    const firma = GF.ocupFirma();
    if (this.ocupG && this.ocupFirma === firma) { this.ocupG.setVisible(true); return; }
    const T = GF.TILE;
    if (!this.ocupG) this.ocupG = this.add.graphics().setDepth(99997);
    this.ocupG.clear().setVisible(true);
    this.ocupFirma = firma;
    const t = GF.terreno();
    for (let r = t.r0; r < t.r1; r++) for (let c = t.c0; c < t.c1; c++) {
      if (!GF.tuyo(c, r) || GF.enCerca(c, r)) continue;         // la cerca ya se ve sola
      if (!GF.celdaOcupada(c, r)) continue;                     // libre: no se pinta
      this.ocupG.fillStyle(0x1a2410, 0.30).fillRect(c * T, r * T, T, T);
      this.ocupG.lineStyle(1, 0xffe9a8, 0.22).strokeRect(c * T + 0.5, r * T + 0.5, T - 1, T - 1);
    }
  }
  // 13/8: cierre común — y si el colocado vino de la bolsa/hotbar, se sale del modo edición solo
  finColocar() {
    this.placing = null;
    if (this.editHl) this.editHl.setVisible(false);
    if (this.ocupG) this.ocupG.setVisible(false);
    if (window.syncPlacingUI) syncPlacingUI(false);
    if (this.placingAuto && window.setEditMode) setEditMode(false);
    this.placingAuto = false;
  }
  // 13/8: "encender" el edificio oculto como OBRA sin reiniciar la escena (chau pantalla oscura)
  colocarObraEnVivo(t) {
    const o = this.objs && this.objs.find(x => x.type === t);
    const op = (typeof obraDe === "function") ? obraDe(t) : null;
    if (!o || !op || !o.sprite || !this.textures.exists("build_" + t)) return false;
    const T = GF.TILE;
    o.cx = (op.col + 0.5) * T; o.by = (op.row + 1) * T;
    o.oculto = false;
    o.sprite.setTexture("build_" + t).setVisible(true).setPosition(o.cx, o.by).setOrigin(0.5, 1);
    // el sprite oculto venía con el gris de respaldo puesto desde el create (tintarNodo lo
    // pinta ANTES del cambio de textura): acá se limpia — la obra se ve a todo color
    o.sprite.clearTint().setAlpha(1);
    // 15/8: misma densidad de píxel que el edificio terminado (ver create)
    const biV = this.textures.exists(o.baseKey) ? this.textures.get(o.baseKey).getSourceImage() : null;
    o.sprite.setScale(o.rw / ((biV && biV.width) || o.sprite.width)).setDepth(o.by);
    this.tintarNodo(o);   // respeta la regla general (build_* queda sin tinte)
    this.letreroObra(o);
    if (this.rebuildCollisions) this.rebuildCollisions();
    if (typeof this.estrellasFx === "function") this.estrellasFx(o.cx, o.by - 20);   // mini festejo al apoyarla
    if (typeof tutoSync === "function") tutoSync(true); else if (this.updateTutoArrow) this.updateTutoArrow();
    return true;
  }
  /* ============ COLOCAR UN REGALO EN VIVO (18/8, dirección) ==========================
     "En el momento en el que lo pongo en el suelo hace una transición de pantalla en negro...
     no es necesaria esa transición ni el movimiento de cámara que te lo resetea."
     Tiene razón: reiniciar la escena entera para aparecer UN nodo es desproporcionado, y encima
     te devuelve la cámara al centro. Los edificios ya se colocaban en vivo desde el 13/8
     (colocarObraEnVivo); esto es lo mismo para parcelas, árboles y rocas.
     El objeto YA está en la escena, oculto y en su posición de fábrica: solo hay que moverlo a
     la celda elegida y destaparlo. El reinicio con telón queda de respaldo por si algo falla. */
  colocarRegaloEnVivo(tipo) {
    const T = GF.TILE;
    if (tipo === "plot") {
      if (!this.refreshPlotLocks) return false;
      this.refreshPlotLocks();   // ya crea la parcela en su celda, con su destello de estreno
      return true;
    }
    if (tipo !== "tree" && tipo !== "rock") return false;
    const abiertos = (tipo === "tree" ? G.treesOpen : G.rocksOpen) || [];
    const lock = abiertos[abiertos.length - 1];
    const o = this.objs && this.objs.find(x => x.type === tipo && x.exp == null && x.lockIdx === lock);
    if (!o || !o.sprite) return false;
    const lp = G.layout && G.layout[o.i];
    if (lp) {
      o.cx = lp.cx; o.by = lp.by;
      o.sprite.setPosition(o.cx, o.by).setDepth(o.by);
      if (o.shadow) o.shadow.setPosition(o.cx, o.by - 1).setDepth(o.by - 0.5);
      if (o.timer) o.timer.setPosition(o.cx, o.by - T * 0.85);
      if (o.barra) o.barra.setPosition(o.cx, o.by + 4);
    }
    this.refreshNodeLocks();      // lo destapa con su saltito y sus chispas
    if (this.rebuildCollisions) this.rebuildCollisions();
    if (this.syncNodos) this.syncNodos();
    return true;
  }
  // 13/8: botón Cancelar (o clic derecho): el plano/adorno queda en la bolsa, todo vuelve a como estaba
  cancelarColocar() {
    if (!this.placing) return;
    this.finColocar();
    toast("Colocación cancelada — sigue en tu bolsa");
  }
  // celda libre para una PARCELA nueva (13-60): mismas reglas que un adorno, más lejos de la
  // laguna. Barre desde el centro hacia afuera para que las nuevas queden cerca de las demás.
  celdaLibreParcela() {
    const cc = GF.C0 + Math.floor(GF.COLS / 2), cr = GF.R0 + Math.floor(GF.ROWS / 2), p = GF.POND;
    const celdas = [];
    // 18/8: se recorre el terreno de verdad; enCerca ya sabe cuál es el borde de cualquier forma
    GF.terreno().mias.forEach(s2 => { const q = s2.split(","), c = +q[0], r = +q[1];
      if (!GF.enCerca(c, r)) celdas.push({ c, r, d: Math.abs(c - cc) + Math.abs(r - cr) }); });
    celdas.sort((a, b) => a.d - b.d);
    for (const q of celdas) {
      if (q.c >= p.col - 1 && q.c < p.col + p.cols + 1 && q.r >= p.row - 1 && q.r < p.row + p.rows + 1) continue;   // la laguna y su borde
      if (this.celdaLibreAdorno(q.c, q.r, -1)) return { col: q.c, row: q.r };
    }
    return null;
  }
  /* 18/8: POR QUÉ no entra. "Ahí no entra — probá otra celda" no dice nada, y con celdas muertas
     invisibles el jugador se queda mirando pasto vacío sin entender. Devuelve el motivo en
     castellano o null si la celda está libre. celdaLibreAdorno se apoya en esto, así que no puede
     haber un motivo que la comprobación no vea ni al revés. */
  porQueNoEntra(col, row, ignora) {
    const NOMBRE_OBJETO = (t) => ({ tree: "un árbol", rock: "una roca", ore: "una veta",
      barn: "el granero", market: "el mercado", dummy: "el muñeco de entrenamiento",
      buzon: "el buzón", cofre_diario: "el baúl", tablon_pedidos: "el tablón", portal: "el portal",
      excav: "un montículo", paquete: "tu paquete" }[t] ||
      ((typeof BUILD_DEF !== "undefined" && BUILD_DEF[t]) ? "la " + BUILD_DEF[t].label : null));
    // 18/8: el motivo sale del MISMO mapa que la decisión. No pueden separarse porque son uno.
    if (!GF.tuyo(col, row)) return "Ese terreno todavía no es tuyo";
    if (GF.enCerca && GF.enCerca(col, row)) return "La cerca se reserva esta franja — probá una celda más adentro";
    const oc = GF.celdaOcupada(col, row);
    if (!oc) return null;
    if (oc.tipo === "adorno" && oc.i === ignora) return null;
    if (oc.tipo === "laguna") return "Ahí está la laguna";
    if (oc.tipo === "parcela") return "Ahí ya tenés una parcela";
    if (oc.tipo === "adorno") return "Ahí ya hay un adorno";
    if (oc.tipo === "cofre") return "Ahí está el baúl";
    const nom = NOMBRE_OBJETO(oc.tipo) || "algo construido";
    /* ¿ese estorbo se VE? Si el juego cree que hay un árbol y su dibujo está apagado, eso no es un
       aviso: es un fallo, y el jugador tiene que poder leerlo tal cual. */
    const esc = (this.objs || []).find(x => x.i === oc.i);
    const invisible = esc && (esc.oculto || (esc.sprite && esc.sprite.visible === false));
    if (invisible) return "⚠ Hay " + nom + " sin dibujo acá — es un fallo, avisá";
    return "Ahí hay " + nom + (oc.ancho > 1 ? " (ocupa " + oc.ancho + " celdas)" : "");
  }
  // ¿el adorno entra en esa celda? (ignora es el índice del que se está moviendo, que no se pisa a sí mismo)
  celdaLibreAdorno(col, row, ignora) {
    if (!GF.tuyo(col, row)) return false;
    if (GF.enCerca && GF.enCerca(col, row)) return false;   // 12/8: la CERCA perimetral es intocable
    /* 18/8: UNA sola pregunta, al MAPA DE OCUPACIÓN. Antes eran cinco comprobaciones sueltas, y
       una de ellas —blockedAt— medía cajas de píxeles CON un margen de 6 px (el que evita que el
       héroe se pegue a los sprites), así que cada objeto ensuciaba a sus celdas vecinas. blockedAt
       ya no participa en decisiones de rejilla: sirve para CAMINAR y nada más. */
    const oc = GF.celdaOcupada(col, row);
    if (!oc) return true;
    if (oc.tipo === "adorno" && oc.i === ignora) return true;   // el adorno que se mueve no se pisa a sí mismo
    return false;
  }
  // el adorno que esté bajo el cursor, si hay alguno (para agarrarlo en modo edición)
  adornoEnPunto(wx, wy) {
    const T = GF.TILE;
    let best = null, bd = 1e9;
    (this.adornos || []).forEach(a => {
      const alto = (typeof DECO_ALTO !== "undefined" && DECO_ALTO[a.id]) || 30;
      const hw = (a.g.displayWidth > 0 ? a.g.displayWidth / 2 : T * 0.5) + 3;
      if (wx < a.cx - hw || wx > a.cx + hw) return;
      if (wy > a.by + 5 || wy < a.by - alto - 5) return;
      const d = Math.hypot(a.cx - wx, a.by - wy);
      if (d < bd) { bd = d; best = a; }
    });
    return best;
  }
  // clic derecho en modo edición: el adorno vuelve a la bolsa (así se puede volver a colocar)
  levantarAdorno(a) {
    if (typeof decoSacar !== "function" || !decoSacar(a.i)) return;
    this.dragDeco = null;
    this.syncAdornos();
    if (typeof syncEditDeco === "function") syncEditDeco();   // el selector de la barra de edición vuelve a contarlo
    toast(((typeof DECO_DEF !== "undefined" && DECO_DEF[a.id]) ? DECO_DEF[a.id].label : "Adorno") + " guardado en la bolsa");
    if (typeof saveFarm === "function") saveFarm(true);
  }
  // busca una celda libre para dejar un adorno recién comprado (no pisa nada de lo que ya hay)
  huecoParaAdorno() {
    const ocupada = (col, row) => !this.celdaLibreAdorno(col, row, -1);
    const c0 = GF.C0 + Math.floor(GF.COLS / 2), r0 = GF.R0 + Math.floor(GF.ROWS / 2);
    for (let rad = 0; rad < Math.max(GF.COLS, GF.ROWS); rad++) {
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const col = c0 + dc, row = r0 + dr;
        if (GF.enCerca(col, row)) continue;   // 18/8: vale para cualquier forma, no solo el rectángulo
        if (!ocupada(col, row)) return { col, row };
      }
    }
    return null;
  }
  // vuelve a dibujar todos los adornos colocados (al entrar y cada vez que se pone o saca uno)
  syncAdornos() {
    (this.adornos || []).forEach(a => a.g.destroy());
    this.adornos = [];
    const T = GF.TILE;
    (G.decos || []).forEach((d, i) => {
      if (!DECO_DEF[d.id]) return;
      const x = (d.col + 0.5) * T, y = (d.row + 1) * T;
      this.adornos.push({ i, id: d.id, col: d.col, row: d.row, cx: x, by: y, g: this.dibujarAdorno(d.id, x, y) });
    });
  }

  // crea o saca los animales según los que tenga el jugador (se llama al entrar y al comprar)
  syncAnimales() {
    if (!this.corral) return;
    this.animales = this.animales || [];
    // 10/8: ahora se puede tener MÁS DE UNO de cada tipo, así que hay que crear tantos
    // sprites como bichos haya, no uno por tipo.
    ANIMAL_ORDER.forEach(k => {
      const quiero = (typeof animalCant === "function") ? animalCant(k) : ((typeof animalDe === "function" && animalDe(k)) ? 1 : 0);
      const hay = this.animales.filter(a => a.k === k);
      for (let i = hay.length - 1; i >= quiero; i--) {   // sobran: se sacan de la granja
        const v = hay[i];
        v.spr.destroy(); if (v.marca) v.marca.destroy();
        this.animales.splice(this.animales.indexOf(v), 1);
      }
      for (let n = hay.length; n < quiero; n++) {
        const key = "animal_" + k;
        if (!this.textures.exists(key)) return;
        // sueltos: aparecen cerca del Establo, que es de donde salen
        const est = this.objs && this.objs.find(o => o.type === "establo");
        let pt = null;
        if (!GF.CORRAL_ON && est) for (let i = 0; i < 40 && !pt; i++) {
          const px = est.cx + (Math.random() - 0.5) * GF.TILE * 5, py = est.by + GF.TILE * (0.6 + Math.random() * 2.2);
          if (this.animalPuedeEstar(px, py)) pt = { x: px, y: py };
        }
        if (!pt) pt = this.puntoAnimal();
        if (!pt) pt = { x: (this.corral.x1 + this.corral.x2) / 2, y: (this.corral.y1 + this.corral.y2) / 2 };
        const x = pt.x, y = pt.y;
        const spr = this.add.image(x, y, key).setOrigin(0.5, 1);
        spr.setScale((GF.TILE * 0.78) / spr.width);
        const marca = this.add.image(x, y - 30, resSprite(ANIMAL_DEF[k].mat) || key).setDepth(99991).setVisible(false);
        marca.setDisplaySize(16, 16);
        this.animales.push({ k, spr, marca, tx: x, ty: y, esperaHasta: 0, bob: Math.random() * 6.28 });
      }
    });
  }
  /* ---- MASCOTA (10/8) ---------------------------------------------------------
     La gallina "Pinta" del cofre de login. No produce ni come nada: pasea por la granja
     como los animales del Establo, solo para que se note que la tenés. */
  syncMascota() {
    const quiero = (typeof cosElegido === "function") ? (cosElegido().mascota || "ninguna") : "ninguna";
    const def = (typeof COS_MASCOTAS !== "undefined") ? COS_MASCOTAS[quiero] : null;
    if (this.mascota && (!def || this.mascota.k !== quiero)) { this.mascota.spr.destroy(); this.mascota = null; }
    if (!def || this.mascota) return;
    if (!this.textures.exists(def.sprite)) return;   // todavía no cargó el arte: no pasa nada
    const pt = this.puntoAnimal() || { x: GF.ORIG_X + GF.WORLD_W / 2, y: GF.ORIG_Y + GF.WORLD_H / 2 };
    const spr = this.add.image(pt.x, pt.y, def.sprite).setOrigin(0.5, 1);
    spr.setScale((GF.TILE * 0.52) / spr.width);       // más chica que los animales del Establo
    this.mascota = { k: quiero, spr, tx: pt.x, ty: pt.y, esperaHasta: 0, bob: Math.random() * 6.28 };
  }
  tickMascota(dt, t) {
    const m = this.mascota; if (!m) return;
    if (t >= m.esperaHasta) {   // picotea un rato y se va a otro lado (más inquieta que una vaca)
      m.esperaHasta = t + 1200 + Math.random() * 2600;
      const pt = this.puntoAnimal(m.spr.x, m.spr.y);
      if (pt) { m.tx = pt.x; m.ty = pt.y; } else { m.esperaHasta = t + 600; }
    }
    const dx = m.tx - m.spr.x, dy = m.ty - m.spr.y, d = Math.hypot(dx, dy);
    if (d > 3) {
      const v = Math.min(d, 24 * dt);
      m.spr.x += dx / d * v; m.spr.y += dy / d * v;
      if (Math.abs(dx) > 1) m.spr.setFlipX(dx < 0);
      m.bob += dt * 9;
      const s = Math.abs(m.spr.scaleX);
      m.spr.setScale(m.spr.scaleX, s * (1 + Math.sin(m.bob) * 0.06));
    }
    m.spr.setDepth(m.spr.y);
  }
  tickAnimales(dt, t) {
    if (!this.animales || !this.animales.length || !this.corral) return;
    const C = this.corral;
    for (const a of this.animales) {
      if (t >= a.esperaHasta) {   // elige un lugar nuevo cerca y camina hasta ahí
        a.esperaHasta = t + 2000 + Math.random() * 4000;
        const pt = GF.CORRAL_ON
          ? { x: C.x1 + 20 + Math.random() * (C.x2 - C.x1 - 40), y: C.y1 + 22 + Math.random() * (C.y2 - C.y1 - 34) }
          : this.puntoAnimal(a.spr.x, a.spr.y);
        if (pt) { a.tx = pt.x; a.ty = pt.y; }
        else { a.esperaHasta = t + 700; }   // rincón sin salida: espera un toque y prueba de nuevo
      }
      const dx = a.tx - a.spr.x, dy = a.ty - a.spr.y, d = Math.hypot(dx, dy);
      const anda = d > 3;
      if (anda) {
        const v = Math.min(d, 16 * dt);
        a.spr.x += dx / d * v; a.spr.y += dy / d * v;
        if (Math.abs(dx) > 1) a.spr.setFlipX(dx < 0);           // mira hacia donde camina
        a.bob += dt * 7;
        a.spr.y -= 0;                                            // el "trote" es un cabeceo de escala
        a.spr.setScale(a.spr.scaleX < 0 ? -Math.abs(a.spr.scaleX) : Math.abs(a.spr.scaleX),
          Math.abs(a.spr.scaleX) * (1 + Math.sin(a.bob) * 0.05));
      }
      a.spr.setDepth(a.spr.y);
      // listo para cobrar: se le ve el material flotando encima
      const listo = typeof animalListo === "function" && animalListo(a.k);
      if (a.marca) {
        a.marca.setVisible(listo);
        if (listo) a.marca.setPosition(a.spr.x, a.spr.y - a.spr.displayHeight - 8 + Math.sin(t / 350) * 3).setDepth(a.spr.y + 2);
      }
    }
  }
  // clic sobre un animal: si produjo, se cobra ahí mismo; si no, abre el Establo
  animalEnPunto(wx, wy) {
    if (!this.animales) return null;
    for (const a of this.animales) {
      const b = a.spr.getBounds();
      if (wx > b.left - 2 && wx < b.right + 2 && wy > b.top - 2 && wy < b.bottom + 2) return a;
    }
    return null;
  }

  // NUBES (4/8): pasan lento de izquierda a derecha y proyectan una sombra suave sobre la granja.
  // Es lo que más "respira" por lo poco que cuesta: son elipses blancas y una sombra oscura debajo.
  crearNubes() {
    this.nubes = [];
    const W = GF.WORLD_W, H = GF.WORLD_H, m = GF.BOSQUE ? (GF.BOSQUE_MARGEN || 300) : (GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0);   // 17/8: las nubes cruzan TODO lo visible, también el bosque
    for (let i = 0; i < (FX_NUBES || 0); i++) {
      const esc = 0.7 + Math.random() * 0.9;
      const g = this.add.graphics().setDepth(99000).setAlpha(typeof FX_NUBES_ALFA === "number" ? FX_NUBES_ALFA : 0.22);
      g.fillStyle(0xffffff, 1);
      [[0, 0, 46, 20], [-30, 5, 30, 14], [32, 6, 26, 12], [6, -9, 28, 14]].forEach(([x, y, rx, ry]) => g.fillEllipse(x, y, rx * 2, ry * 2));
      const sh = this.add.graphics().setDepth(6).setAlpha(typeof FX_NUBES_SOMBRA === "number" ? FX_NUBES_SOMBRA : 0.06);
      sh.fillStyle(0x241505, 1);
      [[0, 0, 46, 20], [-30, 5, 30, 14], [32, 6, 26, 12], [6, -9, 28, 14]].forEach(([x, y, rx, ry]) => sh.fillEllipse(x, y, rx * 2, ry * 2));
      g.setScale(esc); sh.setScale(esc * 1.06);
      const n = { g, sh, x: -m - 140 - Math.random() * (W + m * 2), y: -m + 40 + Math.random() * (H + m - 80), vel: 5 + Math.random() * 9 };
      this.nubes.push(n);
    }
  }
  tickNubes(dt) {
    if (!this.nubes || !this.nubes.length) return;
    const W = GF.WORLD_W, H = GF.WORLD_H, m = GF.BOSQUE ? (GF.BOSQUE_MARGEN || 300) : (GF.ISLA ? (GF.ISLA_MARGEN || 260) : 0);   // 17/8: las nubes cruzan TODO lo visible, también el bosque
    for (const n of this.nubes) {
      n.x += n.vel * dt;
      if (n.x > W + m + 160) { n.x = -m - 160; n.y = -m + 40 + Math.random() * (H + m - 80); }
      n.g.setPosition(n.x, n.y);
      n.sh.setPosition(n.x + 16, n.y + 26);   // la sombra cae desplazada, como si el sol pegara de arriba
    }
  }

  // HOJAS AL VIENTO (4/8): cuando pasa una ráfaga, salen unas hojitas de las copas y cruzan
  // la pantalla. Sirve para que la ráfaga se ENTIENDA y no solo se vea en el meneo de los árboles.
  tickHojas(raf) {
    if (!FX_HOJAS || !VIENTO_ON) return;
    const fuerte = raf > 1.35;
    if (!fuerte) { this._rafActiva = false; return; }
    if (this._rafActiva) return;   // una sola tanda por ráfaga
    this._rafActiva = true;
    const arb = this.objs.filter(o => o.type === "tree" && !o.locked && o.sprite && o.sprite.visible && nowMs() >= (o.readyAt || 0));
    if (!arb.length) return;
    const n = this.pidoPart(Math.min(6, arb.length * 2));
    for (let i = 0; i < n; i++) {
      const a = arb[Math.floor(Math.random() * arb.length)];
      const x = a.cx + (Math.random() - 0.5) * 26, y = a.by - (a.sprite.displayHeight || 60) * (0.5 + Math.random() * 0.4);
      const h = this.add.rectangle(x, y, 4, 2.5, Math.random() < 0.5 ? 0x97c459 : 0x639922).setDepth(99994).setAngle(Math.random() * 360);
      this.tweens.add({
        targets: h, x: x + 90 + Math.random() * 130, y: y + 30 + Math.random() * 60,
        angle: h.angle + 480, alpha: { from: 0.95, to: 0 },
        duration: 2200 + Math.random() * 1400, ease: "Sine.easeInOut",
        onComplete: () => { h.destroy(); this.sueltoPart(1); },
      });
    }
  }

  // MARIPOSAS (4/8): revolotean y se posan sobre los cultivos LISTOS; si cosechás, salen volando.
  // DESTELLO DE LAS VETAS CARAS (9/8): diamante y netherita sueltan una chispita de vez en
  // cuando, con el color de su mineral. Sirve para dos cosas: se distinguen de lejos y avisa
  // que están listas (durante el enfriamiento no brillan).
  arrancarBrilloVetas() {
    if (!NODO_BRILLO || this.brilloEv) return;
    const caras = { diamante: 0xbfeeff, netherita: 0xff8a3c, oro: 0xffe08f };
    // Cada veta lleva su PROPIO reloj: si no, todas destellaban en el mismo instante y se
    // notaba el pulso. El evento es solo un despertador que corre seguido y pregunta.
    this.brilloEv = this.time.addEvent({ delay: 220, loop: true, callback: () => {
      if (!NODO_BRILLO) return;   // se puede apagar en caliente desde el panel de balanceo
      const t = nowMs();
      const cada = Math.max(400, NODO_BRILLO_CADA || 2200);
      this.objs.forEach(o => {
        if (o.type !== "ore" || o.locked) return;
        const col = caras[o.ore]; if (!col) return;
        if (o.readyAt && t < o.readyAt) return;                 // en enfriamiento no brilla
        if (!o.sprite || !o.sprite.visible) return;
        // primera vez: se reparte al azar dentro del ciclo para que no arranquen todas juntas
        if (!o.brilloEn) { o.brilloEn = t + Math.random() * cada; return; }
        if (t < o.brilloEn) return;
        o.brilloEn = t + cada * (0.55 + Math.random() * 0.9);    // el próximo, entre el 55% y el 145%
        const w = o.rw || o.w, alto = o.sprite.displayHeight || w;
        const x = o.cx + (Math.random() - 0.5) * w * 0.6;
        const y = o.by - alto * (0.35 + Math.random() * 0.4);
        const g = this.add.graphics().setDepth(o.by + 2).setBlendMode(Phaser.BlendModes.ADD);
        g.fillStyle(col, 1);
        g.fillTriangle(0, -5, 1.4, 0, -1.4, 0).fillTriangle(0, 5, 1.4, 0, -1.4, 0)     // chispa de 4 puntas
         .fillTriangle(-5, 0, 0, 1.4, 0, -1.4).fillTriangle(5, 0, 0, 1.4, 0, -1.4);
        g.setPosition(x, y).setScale(0.3).setAlpha(0);
        this.tweens.add({ targets: g, alpha: { from: 0, to: 0.9 }, scale: { from: 0.3, to: 1 },
          duration: 260, yoyo: true, hold: 90, ease: "Sine.easeOut", onComplete: () => g.destroy() });
      });
    } });
  }

  crearMariposas() {
    this.maripos = [];
    for (let i = 0; i < (FX_MARIPOSAS || 0); i++) {
      const g = this.add.graphics().setDepth(99993);
      const col = [0xffd75e, 0xf4c0d1, 0xb5d4f4][i % 3];
      g.fillStyle(col, 1).fillEllipse(-2.6, 0, 5, 7).fillEllipse(2.6, 0, 5, 7);
      g.fillStyle(0x241505, 0.8).fillRect(-0.6, -3, 1.2, 6);
      g.setPosition(GF.ORIG_X + GF.WORLD_W * Math.random(), GF.ORIG_Y + GF.WORLD_H * Math.random());
      // LUCIÉRNAGA (17/8, dirección): el mismo bicho con otro traje. De día vuela la mariposa;
      // de noche se apaga y se enciende la luciérnaga, EN EL MISMO SITIO y con el mismo
      // movimiento — no son dos bichos distintos, es uno que cambia de aspecto.
      // El halo son cuatro círculos concéntricos de alfa decreciente: Graphics no hace
      // degradados, pero apilados de fuera hacia dentro dan un resplandor convincente.
      let luz = null;
      if (FX_LUCIERNAGAS) {
        luz = this.add.graphics().setDepth(99993).setAlpha(0).setVisible(false);
        [[13, 0.055], [9, 0.09], [6, 0.16], [3.4, 0.30]].forEach(([r, a]) => luz.fillStyle(0xbff06a, a).fillCircle(0, 0, r));
        luz.fillStyle(0xf2ffd0, 0.95).fillCircle(0, 0, 1.7);   // el cuerpo, casi blanco
      }
      this.maripos.push({ g, luz, tx: g.x, ty: g.y, esperaHasta: 0, posada: null, fase: Math.random() * 6.28 });
    }
  }
  /* MARIPOSAS GUÍA (14/8, idea de dirección): las 3 mariposas dejan de ser adorno puro y
     SEÑALAN revoloteando — sin flechas, sin texto. La 1ª acompaña al OBJETIVO del
     tutorial; las otras dos merodean cosas que el jugador SÍ puede hacer ahora (y saben
     lo que no puede: sin hachas no van al árbol, sin semillas no van a la tierra seca,
     sin usos de pico no van a la roca). Cada una reclama un destino DISTINTO. Terminado
     el tutorial, las tres quedan como señaladoras de accionables. */
  /* 14/8 v3 (dirección): el imán de las mariposas es la MADUREZ — un recurso disponible
     hace MÁS DE 10 SEGUNDOS está desatendido y atrae una mariposa (revolotea/se posa),
     jugando o no. Y si ese recurso es del OBJETIVO actual, va primero en la fila.
     La tierra seca solo entra cuando el jugador parece perdido (no es un recurso maduro). */
  mariposaAccionables(t, perdido) {
    const MADURO = 10000;
    const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
    const objRes = st ? st.res : null;   // madera/piedra → árboles/rocas del objetivo
    const objPlots = st && (st.id === "plant" || st.id === "harvest");
    const lista = [];
    for (const p of (this.plots || [])) {
      if (p.state !== "ready" || t - (p.readyAt || 0) < MADURO) continue;
      lista.push({ x: p.cx, y: p.by - 14, k: "listo" + p.i, prio: objPlots ? 0 : 1, edad: t - (p.readyAt || 0), o: p });
    }
    const hayHacha = (typeof toolCount === "function") && toolCount("axe") > 0;
    const eq = (typeof equippedPick === "function") ? equippedPick() : null;
    const usosPico = eq ? Math.floor((G.picks.dur && G.picks.dur[eq]) || 0) : 0;
    for (const o of (this.objs || [])) {
      if (o.locked || o.oculto || (o.readyAt && o.readyAt > t)) continue;
      if ((o.golpes || 0) > 0) continue;   // 15/8: a medio talar/picar tampoco se señala (ni sus intermedios)
      if (typeof nodoBloqueado === "function" && nodoBloqueado(o)) continue;   // la veta que pide nivel no se señala
      const edad = t - (o.readyAt || 0);   // sin readyAt = disponible desde siempre
      if (edad < MADURO) continue;
      if (o.type === "tree" && hayHacha)
        lista.push({ x: o.cx, y: o.by - (o.sprite ? o.sprite.displayHeight * 0.6 : 40), k: "arbol" + o.i, prio: objRes === "madera" ? 0 : 1, edad, o });
      if ((o.type === "rock" || (o.type === "ore" && typeof ORE_DEF !== "undefined" && eq && PICK_DEF[eq].mineTier >= (ORE_DEF[o.ore] ? ORE_DEF[o.ore].tier : 99))) && usosPico > 0)
        lista.push({ x: o.cx, y: o.by - 18, k: "roca" + o.i, prio: objRes === "piedra" ? 0 : 1, edad, o });
      /* 19/8 (dirección) — LOS MONTÍCULOS ENTRAN AL IMÁN. Son lo único gratis, instantáneo y
         disponible desde el primer segundo de la partida: ni herramienta ni enfriamiento, tres por
         día y siempre dan lombriz. O sea, exactamente lo que llena la primera espera de todas — la
         de las papas, a los dos minutos de empezar. Estaban en la lista de objetos desde el 15/8
         pero este imán no tenía su caso, así que el jugador los veía sin que nada se los señalara.
         Van con prioridad 0 mientras el objetivo espera un reloj: es cuando más falta hacen. */
      if (o.type === "excav")
        lista.push({ x: o.cx, y: o.by - 12, k: "excav" + o.idx, prio: objPlots ? 0 : 1, edad, o });
    }
    if (perdido) {
      const haySemillas = Object.keys(G.seeds || {}).some(k => (G.seeds[k] || 0) > 0);
      if (haySemillas) for (const p of (this.plots || [])) {
        if (p.state === "dry") { lista.push({ x: p.cx, y: p.by - 14, k: "seco" + p.i, prio: st && st.id === "plant" ? 0 : 2, edad: 0, o: p }); break; }
      }
    }
    // lo del objetivo primero; a igual prioridad, lo más viejo (más desatendido) primero
    lista.sort((a, b) => a.prio - b.prio || b.edad - a.edad);
    return lista;
  }
  tickMariposas(dt, t) {
    if (!this.maripos || !this.maripos.length) return;
    // 14/8 v3: los recursos MADUROS (disponibles >10 s) atraen mariposas SIEMPRE — lo del
    // objetivo primero. El detector de "perdido" (~8 s quieto) suma la escolta del
    // objetivo de la guía (edificios/obras) y la tierra seca como último recurso.
    const perdido = (t - (this.ultimaAccion || 0)) > 8000;
    if (t >= (this._mariAt || 0)) {   // re-asignar destinos cada ~2,5 s
      this._mariAt = t + 2500;
      const accion = this.mariposaAccionables(t, perdido);
      const tomados = new Set();
      this.maripos.forEach((m, i) => {
        if (perdido && i === 0 && this.guiaTarget) { m.ancla = { x: this.guiaTarget.x, y: this.guiaTarget.y + 26 }; tomados.add("guia"); return; }
        const libre = accion.find(a => !tomados.has(a.k));
        if (libre) { tomados.add(libre.k); m.ancla = { x: libre.x, y: libre.y, o: libre.o }; return; }
        m.ancla = null;   // nada maduro que señalar: mariposa libre
      });
    }
    for (const m of this.maripos) {
      // 15/8: si el recurso que señalaba entró en enfriamiento, lo suelta YA (sin esperar
      // la reasignación de los 2,5 s) — nada de revolotear sobre un nodo que no se puede usar
      if (m.ancla && m.ancla.o && !m.posadaHasta &&
          ((m.ancla.o.readyAt && m.ancla.o.readyAt > t) || (m.ancla.o.golpes || 0) > 0)) { m.ancla = null; m.percha = null; }
      if (m.ancla) {   // merodear: órbita amplia y cambiante, con transiciones SUAVES
        if (t >= (m.orbCambio || 0)) {   // cada tanto la vuelta cambia de tamaño, ritmo y fase
          m.orbCambio = t + 1800 + Math.random() * 2600;
          m.orbRxMeta = 20 + Math.random() * 16; m.orbRyMeta = 12 + Math.random() * 12;
          m.orbVelMeta = 0.9 + Math.random() * 1.0; m.orbFase2 = Math.random() * 6.28;
        }
        // los radios y el ritmo se deslizan hacia su nuevo valor (nada salta de golpe)
        m.orbRx = (m.orbRx || 24) + ((m.orbRxMeta || 24) - (m.orbRx || 24)) * dt * 1.5;
        m.orbRy = (m.orbRy || 14) + ((m.orbRyMeta || 14) - (m.orbRy || 14)) * dt * 1.5;
        m.orbVel = (m.orbVel || 1.2) + ((m.orbVelMeta || 1.2) - (m.orbVel || 1.2)) * dt * 1.5;
        m.orbita = (m.orbita || Math.random() * 6.28) + dt * m.orbVel;
        m.tx = m.ancla.x + Math.cos(m.orbita) * m.orbRx + Math.cos(m.orbita * 0.37 + m.orbFase2) * 6;
        m.ty = m.ancla.y + Math.sin(m.orbita * 1.27 + m.orbFase2) * m.orbRy;
      } else if (t >= m.esperaHasta) {
        m.esperaHasta = t + 2600 + Math.random() * 3200;
        // 15/8: paseando sin recurso que señalar, la mitad de las veces va derecho a una FLOR
        const flores = this.floresDeco || [];
        if (flores.length && Math.random() < 0.5) {
          const f = flores[(Math.random() * flores.length) | 0];
          m.tx = f.x; m.ty = f.y - 1; m.enFlor = true;
        } else {
          m.tx = GF.ORIG_X + 40 + Math.random() * (GF.WORLD_W - 80); m.ty = GF.ORIG_Y + 40 + Math.random() * (GF.WORLD_H - 80);
          m.enFlor = false;
        }
      }
      // 15/8 (dirección): POSADA solo SOBRE el sprite del recurso — nunca quieta en el aire.
      // Y ESPANTO: si el jugador usa ese recurso (o se le para al lado), levanta vuelo ya.
      const firma = (o) => o ? ((o.state || "") + ":" + (o.readyAt || 0)) : "";
      if (m.posadaHasta && t < m.posadaHasta) {
        const susto = (m.ancla && m.ancla.o && firma(m.ancla.o) !== m.firmaPosada) ||
                      (this.hero && Math.hypot(this.hero.x - m.g.x, this.hero.y - m.g.y) < 26);
        if (!susto) {
          // 15/8 (dirección): posada las alas SIGUEN aleteando — mismo movimiento que en
          // vuelo (abre y cierra) pero mucho más lento y suave
          m.fase += dt * 3.2;
          m.g.setScale(0.84 + Math.abs(Math.sin(m.fase)) * 0.16, 1);
          m.g.setDepth(99993);
          continue;
        }
        // se ESPANTA: arranca rápido alejándose del jugador, después la curva la devuelve
        m.sustoHasta = t + 700;
        m.rumbo = this.hero ? Math.atan2(m.g.y - this.hero.y, m.g.x - this.hero.x) : (m.rumbo || 0);
        m.rumbo += (Math.random() - 0.5) * 0.6;
        m.posadaHasta = 0; m.percha = null;
      } else if (m.posadaHasta) { m.posadaHasta = 0; m.percha = null; m.rumbo = (m.rumbo || 0) + (Math.random() - 0.5) * 1.6; }   // fin natural: despega hacia otro lado
      if (m.percha) { m.tx = m.percha.x; m.ty = m.percha.y; }   // planeando hacia su punto de aterrizaje
      // 14/8 v2 (playtest: "curva ABIERTA, no doblar en seco"): vuelo por RUMBO — velocidad
      // casi constante y la dirección solo puede girar unos grados por frame (tope de
      // rad/s). Una vuelta en U le lleva ~1,5 s de arco: doblar en seco es físicamente
      // imposible, todas las correcciones salen como curvas amplias.
      const dx = m.tx - m.g.x, dy = m.ty - m.g.y, d = Math.hypot(dx, dy);
      const deseado = Math.atan2(dy, dx);
      if (m.rumbo == null) m.rumbo = deseado;
      let dif = deseado - m.rumbo;
      while (dif > Math.PI) dif -= Math.PI * 2;
      while (dif < -Math.PI) dif += Math.PI * 2;
      const giroMax = 2.1 * dt;   // radianes por segundo de tope: la curva siempre abierta
      m.rumbo += Math.max(-giroMax, Math.min(giroMax, dif));
      const vel = (m.ancla ? 44 : 32) * Math.min(1, d / 26 + 0.4) * (t < (m.sustoHasta || 0) ? 1.9 : 1);   // afloja al acercarse; espantada va más rápido
      m.g.x += Math.cos(m.rumbo) * vel * dt;
      m.g.y += Math.sin(m.rumbo) * vel * dt;
      m.g.setRotation(m.rumbo + Math.PI / 2);   // 14/8: el CUERPO apunta hacia donde vuela (el dibujo nace mirando arriba)
      // cerca del recurso, a veces decide posarse: elige un punto DEL SPRITE y planea hasta él
      if (!m.percha && m.ancla && m.ancla.o && d < 12 && Math.random() < dt * 0.8) {
        const o = m.ancla.o, spr = o.sprite || o.spr;
        const w = (spr && spr.visible && spr.displayWidth) || 18, h = (spr && spr.visible && spr.displayHeight) || 8;
        m.percha = { x: o.cx + (Math.random() - 0.5) * w * 0.45, y: o.by - h * (0.55 + Math.random() * 0.25) };
      }
      // 15/8: paseando (sin recurso asignado) también se posa — casi siempre si llegó a una
      // flor, cada tanto en cualquier lado, como mariposa que es
      if (!m.percha && !m.ancla && d < 6 && Math.random() < dt * (m.enFlor ? 1.4 : 0.25))
        m.percha = { x: m.tx, y: m.ty };
      if (m.percha && Math.hypot(m.percha.x - m.g.x, m.percha.y - m.g.y) < 3.5) {   // ATERRIZÓ
        m.g.x = m.percha.x; m.g.y = m.percha.y;
        m.posadaHasta = t + 2200 + Math.random() * 3200;
        m.firmaPosada = firma(m.ancla && m.ancla.o);   // recuerda el estado del recurso: si cambia, se espanta
      }
      m.fase += dt * 9;
      m.g.setScale(0.75 + Math.abs(Math.sin(m.fase)) * 0.45, 1);   // aleteo: se angosta y se ensancha
      m.g.setDepth(99993);   // SIEMPRE al frente (antes quedaba detrás del mercadillo)
    }
    // DÍA ↔ NOCHE: mariposa y luciérnaga se cruzan en un fundido, nunca aparecen ni
    // desaparecen de golpe. this.nocheMezcla va de 0 (día) a 1 (noche) con un tween de 6 s,
    // así que el relevo dura lo que tarda el cielo en cambiar y no se nota el corte.
    const n = this.nocheMezcla || 0;
    for (const m of this.maripos) {
      m.g.setVisible(n < 0.99).setAlpha(1 - n);
      if (!m.luz) continue;
      // la luciérnaga NO brilla parejo: late. Cada una con su fase, para que no parpadeen juntas.
      const late = 0.62 + 0.38 * Math.sin(t / 240 + m.fase * 0.7);
      m.luz.setPosition(m.g.x, m.g.y).setVisible(n > 0.01).setAlpha(n * late)
           .setScale(0.85 + 0.25 * late);
    }
  }

  // EXCAVACIONES DIARIAS (15/8): 3 montículos en celdas libres, fijos durante el día
  crearExcavaciones() {
    (this.excavObjs || []).forEach(o => { if (o.sprite) o.sprite.destroy(); const ix = this.objs.indexOf(o); if (ix >= 0) this.objs.splice(ix, 1); });
    this.excavObjs = [];
    const e = (typeof excavEstado === "function") ? excavEstado() : null; if (!e) return;
    this._excavDia = e.dia;
    const T = GF.TILE;
    for (let i = 0; i < (typeof EXCAV_POR_DIA !== "undefined" ? EXCAV_POR_DIA : 3); i++) {
      if (e.hechos.includes(i)) continue;   // ya cavado hoy
      // busca una celda libre determinística: arranca del azar del día y barre desde ahí
      let px = 0, py = 0, ok = false;
      for (let intento = 0; intento < 60 && !ok; intento++) {
        const r1 = excavAzar(i * 7 + intento * 2), r2 = excavAzar(i * 7 + intento * 2 + 1);
        px = GF.ORIG_X + 60 + r1 * (GF.WORLD_W - 120); py = GF.ORIG_Y + 70 + r2 * (GF.WORLD_H - 140);
        ok = !GF.blockedAt(px, py, 14) && !GF.PLOTS.some(pl => Math.abs((pl.col + 0.5) * T - px) < T && Math.abs((pl.row + 0.5) * T - py) < T);
      }
      if (!ok) continue;
      const w = T * 0.55;
      const spr = this.add.image(px, py, "monticulo").setOrigin(0.5, 1).setDepth(py);
      spr.setScale(w / spr.width);
      const o = { i: "excav" + i, type: "excav", idx: i, cx: px, by: py, w, rw: w, baseKey: "monticulo", sprite: spr, readyAt: 0 };
      this.objs.push(o); this.excavObjs.push(o);
    }
  }

  // BUZÓN (15/8): la banderita se levanta sola cuando hay cartas (y un sobre saltarín)
  tickBuzon(t) {
    if (t < (this._buzonAt || 0)) return;
    // día nuevo → montículos nuevos
    try { if (typeof excavEstado === "function" && this._excavDia !== excavEstado().dia) this.crearExcavaciones(); } catch (e) {}
    this._buzonAt = t + 1200;
    const o = (this.objs || []).find(x => x.type === "buzon");
    if (!o || !o.sprite) return;
    const n = (typeof buzonCartas === "function") ? buzonCartas().length : 0;
    const key = n > 0 ? "buzon_full" : "buzon";
    if (o.sprite.texture.key !== key) this.setObjTex(o, key, o.rw || o.w);
    if (o.emoBuzon) { o.emoBuzon.destroy(); o.emoBuzon = null; }   // 15/8: sin emoji — el sprite con la carta asomando ya lo dice
    /* BAÚL. 18/8 (dirección: "cuando se recompensa en el baúl debe mostrarse abierto").
       La tapa abierta era SOLO del kit de bienvenida, así que los premios de nivel —parcelas,
       árboles y rocas, que desde el 16/8 llegan justamente acá— caían en un baúl que se veía
       cerrado. El jugador leía "te llegaron premios al baúl" y no tenía ni un indicio en el mapa.
       Ahora la tapa se abre con CUALQUIER cosa esperando dentro. */
    const cf = (this.objs || []).find(x => x.type === "cofre_diario");
    if (cf && cf.sprite) {
      let pend = 0;
      try { pend = (typeof regalosPendientes === "function") ? regalosPendientes() : 0; } catch (e) {}
      const listo = !G.kitReclamado || pend > 0;
      const kc = listo ? "baul_premios_lleno" : "baul_premios";
      if (this.textures.exists(kc) && cf.sprite.texture.key !== kc) this.setObjTex(cf, kc, cf.rw || cf.w);
      if (cf.emoPremio) { cf.emoPremio.destroy(); cf.emoPremio = null; }   // 15/8: sin emoji — la tapa abierta ya lo dice
    }
    // TABLÓN (16/8): con pedidos pendientes se ven los papelitos clavados; sin nada, la tabla pelada
    const tb = (this.objs || []).find(x => x.type === "tablon_pedidos");
    if (tb && tb.sprite) {
      let pend = 0; try { pend = (G.tuto && !G.tuto.done) ? 0 : pedidosEstado().lista.filter(p => !p.hecho).length; } catch (e) {}
      const tk = pend > 0 ? "tablon_pedidos_full" : "tablon_pedidos";
      if (this.textures.exists(tk) && tb.sprite.texture.key !== tk) this.setObjTex(tb, tk, tb.rw || tb.w);
    }
    // EL PAQUETE DE LA MAÑANA (15/8, idea Stardew elegida por dirección): cada día con
    // premio pendiente aparece un paquete atado con cordel al pie del buzón. Se levanta
    // con un clic y se abre ahí mismo. Sin premio, no hay paquete: ayer no estaba, hoy sí.
    let hayPremio = false; try { hayPremio = !!dailyState().claimable; } catch (e) {}   // 15/8: independiente del kit — cada sistema con su vida
    if (hayPremio && !this.paqueteObj) {
      const bz = (this.objs || []).find(x => x.type === "buzon");
      const px = bz ? bz.cx + 10 : 635, py = bz ? bz.by + 12 : 164, w = GF.TILE * 0.5;   // apoyado en el pasto, al pie del poste
      const spr = this.add.image(px, py, "paquete_dia").setOrigin(0.5, 1).setDepth(py);
      spr.setScale(w / spr.width);
      this.tweens.add({ targets: spr, scaleY: spr.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });   // respira apenas, sin flotar
      this.paqueteObj = { i: "paquete", type: "paquete", cx: px, by: py, w, rw: w, baseKey: "paquete_dia", sprite: spr, readyAt: 0 };
      this.objs.push(this.paqueteObj);
    } else if (!hayPremio && this.paqueteObj) {
      const po = this.paqueteObj; this.paqueteObj = null;
      if (po.sprite) po.sprite.destroy();
      const ix = this.objs.indexOf(po); if (ix >= 0) this.objs.splice(ix, 1);
    }
  }

  /* ============ AMBIENTE VIVO (15/8, dirección: 1+2+3+5) ============
     VIENTO en oleadas (pasto/flores se inclinan en secuencia, árboles se mecen apenas),
     HOJAS que caen de a ratos, PECES que saltan en la laguna (más si podés pescar),
     y el CICLO DÍA/NOCHE con la hora real + FAROLES que se encienden solos. */
  tickAmbiente(dt, t) {
    // --- VIENTO: una onda que viaja por la granja, con ráfagas lentas
    const fase = t / 900, amp = 0.06 + 0.05 * Math.sin(t / 7000);
    if (this.vientoDecos) for (const d of this.vientoDecos) d.rotation = Math.sin(fase - d.x * 0.02) * amp;
    for (const o of this.objs) {
      if (o.type !== "tree" || !o.sprite || o.locked) continue;
      if (o.golpesAt && t - o.golpesAt < 1200) continue;   // recién golpeado: manda la sacudida
      o.sprite.rotation = Math.sin(fase * 0.8 - o.cx * 0.015) * 0.012;
    }
    // --- HOJAS: cada tanto una hojita se suelta y baja meciéndose
    if (t >= (this._hojaAt || 0)) {
      this._hojaAt = t + 6000 + Math.random() * 12000;
      const arboles = this.objs.filter(o => o.type === "tree" && o.sprite && o.sprite.visible && !o.locked && o.sprite.texture.key === "tree");
      if (arboles.length && this.pidoPart(1)) {
        const a = arboles[(Math.random() * arboles.length) | 0];
        const hx = a.cx + (Math.random() - 0.5) * a.sprite.displayWidth * 0.5;
        const hy = a.by - a.sprite.displayHeight * (0.55 + Math.random() * 0.25);
        const h = this.add.ellipse(hx, hy, 4, 2.6, 0x97c459, 0.9).setDepth(a.by + 1);
        const dur = 2600 + Math.random() * 1600, x0 = hx, vaiven = 6 + Math.random() * 6;
        this.tweens.add({ targets: h, y: hy + 34 + Math.random() * 22, alpha: 0, angle: (Math.random() < 0.5 ? 1 : -1) * 200, duration: dur, ease: "Sine.easeIn",
          onUpdate: (tw) => { h.x = x0 + Math.sin(tw.progress * 6.2 + 1) * vaiven; },
          onComplete: () => { h.destroy(); this.sueltoPart(1); } });
      }
    }
    // --- PECES: chapoteo con ondas — la laguna invita más cuando PODÉS pescar
    if (t >= (this._pezAt || 0)) {
      const invita = (typeof toolDur === "function" && toolDur("rod") > 0 && (G.res.lombriz || 0) > 0);
      this._pezAt = t + (invita ? 5000 + Math.random() * 6000 : 16000 + Math.random() * 14000);
      const p = this.pondPoint();
      if (this.pidoPart(2)) {
        const onda = this.add.ellipse(p.x, p.y, 6, 3).setStrokeStyle(1.5, 0xcfe8ff, 0.7).setDepth(p.y);
        this.tweens.add({ targets: onda, scaleX: 3.4, scaleY: 3.4, alpha: 0, duration: 900, onComplete: () => { onda.destroy(); this.sueltoPart(1); } });
        const pez = this.add.ellipse(p.x, p.y - 2, 7, 3.4, 0x9db9d6, 1).setDepth(p.y + 1);
        this.tweens.add({ targets: pez, x: p.x + 14, duration: 620, ease: "Linear",
          onUpdate: (tw) => { const pr = tw.progress; pez.y = p.y - 2 - Math.sin(pr * Math.PI) * 14; pez.rotation = (pr - 0.5) * 1.6; },
          onComplete: () => { pez.destroy(); this.sueltoPart(1); } });
      }
    }
    // --- CIELO: día/noche con la hora REAL del jugador + faroles de noche
    if (!this.cielo) {
      // 17/8 (dirección): "dentro del corral es de un día y fuera es otro horario".
      // Cierto: el velo medía SOLO el mundo jugable (714x504), así que el bosque, la franja de
      // césped y el mosaico se quedaban en mediodía perpetuo mientras la granja anochecía.
      // Ahora cubre todo lo que la cámara pueda mostrar, centrado en el mismo sitio que el
      // mosaico, así que la hora es una sola en toda la pantalla.
      const _c = { x: GF.ORIG_X + GF.WORLD_W / 2, y: GF.ORIG_Y + GF.WORLD_H / 2 }, _lado = 9000;
      this.cielo = this.add.rectangle(_c.x, _c.y, _lado, _lado, 0x0a1030, 0).setDepth(90000);
      this.faroles = [];
      this._cieloAt = 0;
    }
    if (t >= (this._cieloAt || 0)) {
      this._cieloAt = t + 20000;
      const ahora = new Date(), min = ahora.getHours() * 60 + ahora.getMinutes();
      const lerp = (a, b, k) => a + (b - a) * k;
      let col = 0x0a1030, alpha = 0;
      if (min >= 1290 || min < 330) { alpha = 0.38; }                                                        // noche (21:30-05:30)
      else if (min < 510) { const k = (min - 330) / 180; alpha = lerp(0.38, 0, k); col = k > 0.5 ? 0x803010 : 0x0a1030; }   // amanecer
      else if (min < 1080) { alpha = 0; }                                                                    // día pleno
      else { const k = (min - 1080) / 210; alpha = lerp(0, 0.38, k); col = k < 0.5 ? 0x803010 : 0x0a1030; }  // atardecer (18:00-21:30)
      this.cielo.fillColor = col;
      this.tweens.add({ targets: this.cielo, fillAlpha: alpha, duration: 3000 });
      const noche = alpha > 0.12;
      // el relevo mariposas ↔ luciérnagas se engancha al MISMO umbral que enciende los faroles,
      // así que todo lo nocturno pasa a la vez. La primera vez se aplica seco (si entrás de
      // noche, ya hay luciérnagas); después siempre con fundido.
      if (this._nocheAnt === undefined) { this._nocheAnt = noche; this.nocheMezcla = noche ? 1 : 0; }
      else if (this._nocheAnt !== noche) {
        this._nocheAnt = noche;
        this.tweens.add({ targets: this, nocheMezcla: noche ? 1 : 0, duration: 6000, ease: "Sine.easeInOut" });
      }
      if (noche && !this.faroles.length) {
        (this.adornos || []).forEach(a => {
          if (a.id !== "farol" && a.id !== "farolito") return;
          const g = this.add.circle(a.cx, a.by - 24, 20, 0xffd27a, 0.22).setDepth(90001);
          this.tweens.add({ targets: g, alpha: 0.32, scaleX: 1.12, scaleY: 1.12, duration: 900 + Math.random() * 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          this.faroles.push(g);
        });
      } else if (!noche && this.faroles.length) { this.faroles.forEach(g => g.destroy()); this.faroles = []; }
    }
  }

  // VAPOR DE LA COCINA y CHISPAS DEL ALTAR: los edificios cuentan su estado sin abrir la ventana.
  tickVapor(t) {
    if (!FX_VAPOR) return;
    if (t < (this._vaporAt || 0)) return;
    this._vaporAt = t + 900;
    const ollas = (typeof cookList === "function") ? cookList().length : 0;
    if (ollas > 0) {
      const c = this.objs.find(o => o.type === "cocina");
      if (c && c.sprite && this.pidoPart(1)) {
        const p = this.add.ellipse(c.cx + (Math.random() - 0.5) * 10, c.by - (c.sprite.displayHeight || 60) * 0.75, 6, 4, 0xffffff, 0.5).setDepth(c.by + 2);
        this.tweens.add({ targets: p, y: p.y - 30, x: p.x + 6 + Math.random() * 8, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 1900, onComplete: () => { p.destroy(); this.sueltoPart(1); } });
      }
    }
    if (G.edif2 && G.edif2.altar) {
      const al = this.objs.find(o => o.type === "altar");
      if (al && al.sprite && this.pidoPart(1)) {
        const s = this.add.circle(al.cx + (Math.random() - 0.5) * 22, al.by - 8, 1.6, 0xbfa8ff, 0.9).setDepth(al.by + 2).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: s, y: s.y - 34 - Math.random() * 14, alpha: 0, duration: 1500 + Math.random() * 500, onComplete: () => { s.destroy(); this.sueltoPart(1); } });
      }
    }
  }

  // COPA APARTE (4/8): el árbol se parte en dos dibujos del MISMO sprite recortado —
  // el tronco (abajo) y la copa (arriba). Solo la copa gira, y gira sobre la unión con el tronco,
  // así la base y la tierra quedan totalmente quietas. Antes giraba el sprite entero y se veía
  // que el tronco se doblaba, que era lo que no convencía.
  copaArmar(o) {
    const spr = o.sprite, fr = spr.frame;
    const W = fr.width, H = fr.height;
    const f = Math.max(0.15, Math.min(0.95, VIENTO_CORTE));
    const clave = spr.texture.key + "|" + (fr.name || "") + "|" + f.toFixed(3) + "|" + spr.scaleY.toFixed(4);
    const unionY = spr.y - H * Math.abs(spr.scaleY) * (1 - f);   // dónde se juntan copa y tronco
    // 20/8 (dirección): "arrastro un árbol crecido y la copa se queda en el lugar dibujado, como
    // si se partiera en dos". La copa se COLOCABA UNA SOLA VEZ, al armarla, y esta clave mira la
    // textura y la escala pero NO la posición: mientras el tronco seguía al cursor, la copa se
    // quedaba clavada donde se armó. Y no se recuperaba sola ni al soltar, porque la clave seguía
    // siendo la misma. Ahora, si el árbol se movió, la copa se vuelve a apoyar sobre su tronco.
    if (o.copa && o.copaClave === clave) {
      if (o.copa.x !== spr.x || o.copa.y !== unionY) o.copa.setPosition(spr.x, unionY);
      if (o.copa.depth !== spr.depth + 0.1) o.copa.setDepth(spr.depth + 0.1);
      return;
    }
    if (o.copa) o.copa.destroy();
    o.copa = this.add.image(spr.x, unionY, spr.texture.key, fr.name)
      .setOrigin(0.5, f)                        // el pivote cae justo en la unión
      .setScale(spr.scaleX, spr.scaleY)
      .setDepth(spr.depth + 0.1)
      .setAlpha(spr.alpha);
    o.copa.setCrop(0, 0, W, H * f);             // solo la parte de arriba
    spr.setCrop(0, H * f, W, H * (1 - f));      // el tronco: la parte de abajo
    spr.setAngle(0);
    o.copaClave = clave;
  }
  copaSacar(o) {
    if (!o) return;
    if (o.copa) { o.copa.destroy(); o.copa = null; }
    o.copaClave = null;
    if (o.sprite && o.sprite.isCropped) o.sprite.setCrop();
  }

  // VIENTO (4/8): los árboles crecidos se mecen apenas, como si soplara viento.
  // Cada árbol arranca en un punto distinto de la onda (desfase sacado de su posición) para que
  // no se muevan todos al mismo tiempo, y cada tanto pasa una ráfaga que los inclina más a todos.
  tickViento() {
    if (!VIENTO_ON) {
      if (this._vientoLimpio) return;                       // ya quedó todo derecho
      this.objs.forEach(o => { if (o.type === "tree") { this.copaSacar(o); if (o.sprite) o.sprite.setAngle(0); } });
      this.plots.forEach(p => { if (p.spr) p.spr.setAngle(0); });
      this._vientoLimpio = true; return;
    }
    this._vientoLimpio = false;
    const seg = this.time.now / 1000;
    const w = Math.PI * 2 / Math.max(0.2, VIENTO_SEG);
    // ráfaga: un pico angosto y suave cada VIENTO_RAFAGA_CADA segundos
    const p = Math.max(1, VIENTO_RAFAGA_CADA);
    const raf = 1 + (VIENTO_RAFAGA_MULT - 1) * Math.pow(Math.abs(Math.sin(seg * Math.PI / p)), 12);
    this.tickHojas(raf);   // en el pico de la ráfaga vuelan unas hojas
    for (const o of this.objs) {
      if (o.type !== "tree" || !o.sprite || !o.sprite.visible) continue;
      // tocón, retoño, árbol bloqueado, en pleno saltito de crecimiento O EN LA MANO: entero y quieto
      if (o === this.dragObj || o.locked || nowMs() < (o.readyAt || 0) || o.sprite._popTw) { this.copaSacar(o); if (o.sprite.angle) o.sprite.setAngle(0); continue; }
      this.copaArmar(o);
      if (o.sprite._golpeTw || (o.copa && o.copa._golpeTw)) continue;   // se está sacudiendo por un hachazo: el viento no manda
      if (o.vFase == null) o.vFase = (o.cx * 0.017 + o.by * 0.029) % (Math.PI * 2);
      o.copa.setAngle(Math.sin(seg * w + o.vFase) * VIENTO_GRADOS * raf);
    }
    if (VIENTO_CULTIVOS > 0) for (const pl of this.plots) {   // los cultivos listos también se mecen, más suave
      if (!pl.spr || !pl.spr.visible || pl.state !== "ready") continue;
      if (pl.vFase == null) pl.vFase = (pl.cx * 0.023 + pl.by * 0.031) % (Math.PI * 2);
      pl.spr.setAngle(Math.sin(seg * w * 1.35 + pl.vFase) * VIENTO_GRADOS * VIENTO_CULTIVOS * raf);
    }
  }

  // Un árbol/piedra a medio golpear se RECUPERA SOLO si dejás de pegarle (doc 4/8).
  // El hacha o el pico solo se gastan cuando el nodo cae del todo: los golpes sueltos son gratis.
  tickGolpes() {
    const t = nowMs();
    for (const o of this.objs) {
      if (!o.golpes || !o.golpesAt) continue;
      if (t - o.golpesAt < GOLPES_RESET_MS) continue;
      if (this.action && this.action.o === o) continue;   // le está pegando ahora mismo
      o.golpes = 0; o.golpesAt = 0; this.barraGolpes(o);
      if (nowMs() < o.readyAt) continue;                  // está en enfriamiento: la textura la maneja el tick de nodos
      this.setObjTex(o, o.baseKey, o.rw || o.w);          // vuelve a estar entero
    }
  }

  markQueued(o) {
    if (o.qDot) return;
    const y = this.topY(o);
    const d = this.add.circle(o.cx, y, 4, 0xffd24a, 1).setStrokeStyle(2, 0x5a3c14, 0.9).setDepth(99998);
    this.tweens.add({ targets: d, scale: { from: 0.5, to: 1 }, duration: 180 });
    this.tweens.add({ targets: d, alpha: { from: 1, to: 0.55 }, yoyo: true, repeat: -1, duration: 620 });
    o.qDot = d;
  }
  unmarkQueued(o) { if (o && o.qDot) { this.tweens.killTweensOf(o.qDot); o.qDot.destroy(); o.qDot = null; } }
  clearQueue() { if (this.queue) { this.queue.forEach(o => this.unmarkQueued(o)); this.queue.length = 0; } }

  // efecto de pesca: ondas expandiéndose + gotita en el punto clickeado del lago
  splashAt(x, y) {
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(x, y, 4, 0xbfe6ff, 0).setStrokeStyle(2, 0xdff2ff, 0.9).setDepth(-990);
      this.tweens.add({ targets: c, radius: 14 + i * 8, alpha: { from: 0.9, to: 0 }, delay: i * 140, duration: 600, onComplete: () => c.destroy() });
    }
    const d = this.add.graphics().setDepth(-989);   // era un Text con emoji que quedó vacío (10/8)
    d.fillStyle(0xdff2ff, 0.95).fillEllipse(0, 0, 5, 7);
    d.setPosition(x, y - 8);
    this.tweens.add({ targets: d, y: y - 16, alpha: { from: 1, to: 0 }, duration: 700, onComplete: () => d.destroy() });
  }

  // ¿la celda destino de una PARCELA pisa un objeto, otra parcela o la laguna?
  plotSpotBlocked(pl, col, row) {
    const T = GF.TILE;
    for (const q of this.objs) {
      const qw = Math.max(1, Math.round(q.w / T));
      const qc = Math.round((q.cx - qw * T / 2) / T), qr = Math.round(q.by / T);
      if (row === qr - 1 && col >= qc && col < qc + qw) return true;
    }
    if (GF.parcelaEn(col, row, pl.i)) return true;   // 18/8: ídem — solo estorban las parcelas que ya tenés
    const p = GF.POND;
    if (col >= p.col && col < p.col + p.cols && row >= p.row && row < p.row + p.rows) return true;
    if (GF.enCerca && GF.enCerca(col, row)) return true;   // 12/8: la CERCA perimetral es intocable
    return false;
  }

  // ¿el rectángulo destino de la LAGUNA pisa objetos o parcelas?
  pondSpotBlocked(col, row) {
    const T = GF.TILE, p = GF.POND;
    for (const q of this.objs) {
      const qw = Math.max(1, Math.round(q.w / T));
      const qc = Math.round((q.cx - qw * T / 2) / T), qr = Math.round(q.by / T);
      if (qr - 1 >= row && qr - 1 < row + p.rows && col < qc + qw && qc < col + p.cols) return true;
    }
    for (let c2 = col; c2 < col + p.cols; c2++) for (let r2 = row; r2 < row + p.rows; r2++) if (GF.parcelaEn(c2, r2)) return true;
    if (GF.enCerca) for (let c = col; c < col + p.cols; c++) for (let r = row; r < row + p.rows; r++) if (GF.enCerca(c, r)) return true;   // 12/8: la cerca perimetral es intocable
    return false;
  }

  // ¿la celda destino pisa otro objeto, una parcela o la laguna? (modo edición)
  /* ============ MOVER EN MODO EDICIÓN PREGUNTA AL MISMO MAPA (20/8, dirección) =======
     "Al expandir un bloque, no se puede poner nada en las celdas nuevas, en modo edición."
     Medido: tras comprar el bloque 1, el mapa de ocupación dice que hay 7 celdas libres y esta
     función rechazaba 6. Otra vez el mismo patrón — DOS reglas para la misma pregunta:

       · para COLOCAR desde el Cobertizo manda huellaColocar → GF.celdaOcupada (el mapa);
       · para MOVER en edición mandaba esta función, que se lo calculaba por su cuenta recorriendo
         this.objs con posiciones redondeadas, más la laguna y la cerca a mano.

     Y su cuenta propia tenía dos defectos que el mapa no tiene: contaba objetos OCULTOS (los nodos
     de las quince expansiones que aún no compraste siguen en la escena, invisibles, en sus
     posiciones de fábrica) y comparaba filas con `Math.round(q.by / T)` sin restar uno, así que
     desplazaba un renglón entero de estorbos.
     Ahora pregunta al mapa, que es quien sabe — el mismo que decide el sombreado y los mensajes.
     El objeto que se está arrastrando no se estorba a sí mismo: se reconoce por su índice. */
  placeBlocked(o, leftCol, baseRow, wCells) {
    const fila = baseRow - 1;   // la celda del objeto: su base se apoya en baseRow
    for (let c = leftCol; c < leftCol + wCells; c++) {
      if (!GF.tuyo(c, fila)) return true;                                   // fuera de tu terreno
      /* La cerca es intocable, pero solo LA CELDA DEL OBJETO. La versión vieja rechazaba también
         la fila de abajo (`baseRow`), que es donde se apoya el sprite — y eso descartaba el anillo
         entero de celdas pegadas a la cerca, que son tuyas y están libres. El dibujo no invade esa
         fila: con origen (0,5 · 1) el sprite crece hacia ARRIBA desde la línea. Colocar desde el
         Cobertizo nunca lo miró; solo lo miraba el arrastre, y por eso las dos vías discrepaban. */
      if (GF.enCerca && GF.enCerca(c, fila)) return true;
      const oc = GF.celdaOcupada(c, fila);
      if (!oc) continue;
      if (o && oc.i != null && o.i != null && oc.i === o.i) continue;       // es él mismo
      return true;
    }
    return false;
  }

  // entrenar con el dummy: 3 espadazos, XP de Espada y cooldown de 4 horas
  trainDummy(o) {
    const aid = armaEq();
    if (!aid || ARM_DEF[aid].tipo === "arco") { toast("Equipá un arma cuerpo a cuerpo (espada, hacha o mazo)"); return; }
    const left = (G.dummyUsedAt || 0) + DUMMY_CD_MS - nowMs();
    if (left > 0) { toast("El dummy descansa — vuelve en " + fmtDur(left)); return; }
    G.dummyUsedAt = nowMs();
    if (typeof tutoEvent === "function") tutoEvent("dummy");
    useWeapon(aid); useWeapon(aid);   // entrenar gasta 2 de durabilidad del arma
    let hits = 0;
    const sign = this.hero.x <= o.cx ? 1 : -1;
    const swing = () => {
      hits++;
      // espadazo del granjero definitivo (con estela); respaldo: la espada dibujada como antes
      if (this.anims.exists("act_sword")) {
        this.hero.setScale(sign * this.actScale, this.actScale);
        this.hero.play("act_sword");
      } else if (this.textures.exists("sword")) {
        const fx = this.add.image(o.cx - sign * 20, o.by - 30, "sword").setDisplaySize(24, 24).setOrigin(0.5, 0.85).setDepth(o.by + 1).setAngle(-65 * sign);
        this.tweens.add({ targets: fx, angle: 70 * sign, duration: 190, onComplete: () => fx.destroy() });
      }
      this.tweens.add({ targets: o.sprite, angle: 7 * sign, duration: 90, yoyo: true, onComplete: () => o.sprite.setAngle(0) });
      if (hits < 3) this.time.delayedCall(280, swing);
      else {
        const sk = armSkillKey(ARM_DEF[aid].tipo);
        addXp(sk, DUMMY_XP);
        log("Entrenaste con el dummy: +" + DUMMY_XP + " XP de " + SKILL_NAME[sk] + ". Vuelve en 4h. " + G.weapons[aid].dur + "/" + ARM_DEF[aid].dur, "gold");
        toast("+" + DUMMY_XP + " XP de " + SKILL_NAME[sk]);
        refreshHud(); if (typeof saveFarm === "function") saveFarm();
      }
    };
    swing();
  }

  // fragua encendida mientras se craftea/repara; si no, a medio fuego (detalles jueves)
  updateForge() {
    const o = this.storeObj; if (!o || !o.sprite) return;
    // 13/8: la herrería EN OBRA no se toca — este método pisaba build_store con "store"
    // terminado en cada tick (el bug del playtest: "coloqué el plano y salió construida")
    if (typeof BUILD_DEF !== "undefined" && BUILD_DEF.store && !(G.built && G.built.store)) return;
    const lit = (G.forgeLitUntil || 0) > nowMs();
    // 14/8: ya NO se cambia la textura al encenderse — store_lit era arte del set viejo
    // (97×99 del 9/8 vs el mercadillo de 110×118 del 12/8) y en pleno crafteo la Herrería
    // "viajaba en el tiempo" un segundo (visto en playtest). El fuego vivo por código de
    // acá abajo ya dice "encendida"; si algún día se genera el estado lit del set nuevo,
    // reactivar el swap.
    if (o.sprite.texture.key !== "store" && this.textures.exists("store")) this.setObjTex(o, "store", o.rw || o.w);
    // fuego "vivo" por código: resplandor rojizo que aparece y palpita sobre la boca del horno.
    // La posición se saca del alto REAL del sprite, no de un número fijo: así el arte se puede
    // cambiar (herrería nueva del 9/8) sin que el resplandor quede flotando en cualquier lado.
    const alto = o.sprite.displayHeight || (o.rw || o.w);
    const k = alto / 99;                                  // escala respecto de la textura actual
    const fx = o.cx - 0.027 * (o.rw || o.w);              // la fragua está apenas a la izquierda del centro
    const fy = o.by - 0.299 * alto;                       // boca de la fragua, medida sobre el sprite
    if (lit && !this.forgeGlow) {
      // núcleo intenso en el horno + halo suave que baña el frente del edificio (blend aditivo)
      const core = this.add.ellipse(fx, fy, 14 * k, 12 * k, 0xff7a2a, 0.5).setDepth(o.by + 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const halo = this.add.ellipse(fx, fy - 2 * k, 46 * k, 34 * k, 0xff4a18, 0.22).setDepth(o.by + 0.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.forgeGlow = [core, halo];
      // va apareciendo (fade in) y después palpita como brasa, cada uno a su ritmo
      this.tweens.add({ targets: core, alpha: 0.55, duration: 700, onComplete: () =>
        this.tweens.add({ targets: core, alpha: { from: 0.55, to: 0.3 }, scaleX: { from: 1, to: 0.86 }, scaleY: { from: 1, to: 0.86 }, yoyo: true, repeat: -1, duration: 460, ease: "Sine.easeInOut" }) });
      this.tweens.add({ targets: halo, alpha: 0.3, duration: 900, onComplete: () =>
        this.tweens.add({ targets: halo, alpha: { from: 0.3, to: 0.14 }, scaleX: { from: 1, to: 1.12 }, scaleY: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 780, ease: "Sine.easeInOut" }) });
    } else if (!lit && this.forgeGlow) {
      this.forgeGlow.forEach(g => { this.tweens.killTweensOf(g); g.destroy(); });
      this.forgeGlow = null;
    }
  }

  // crea (o ubica por primera vez) un cofre depósito en la granja
  spawnChest(idx) {
    const c = G.chests[idx]; if (!c) return;
    const T = GF.TILE;
    if (c.col == null) {   // primera vez: buscar una celda libre cerca del granjero
      const hc = Math.floor((this.hero ? this.hero.x : GF.ORIG_X + GF.WORLD_W / 2) / T);
      const hr = Math.floor((this.hero ? this.hero.y : GF.ORIG_Y + GF.WORLD_H / 2) / T);
      outer: for (let r = 1; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const col = hc + dx, row = hr + dy;
        if (GF.enCerca(col, row) || !GF.tuyo(col, row + 1)) continue;   // 18/8: ídem, y deja libre la fila de abajo
        const cx = (col + 0.5) * T, cy = (row + 0.6) * T;
        if (GF.blockedAt(cx, cy, 8)) continue;
        if (GF.PLOTS.some(p => p.col === col && p.row === row)) continue;
        c.col = col; c.row = row; break outer;
      }
      if (c.col == null) { c.col = 3; c.row = 8; }
    }
    const cx = (c.col + 0.5) * T, by = (c.row + 1) * T;
    const s = this.add.image(cx, by, "cofre").setOrigin(0.5, 1);
    s.setScale((T * 0.95) / s.width); s.setDepth(by);
    this.objs.push({ chestIdx: idx, type: "cofre", cx, by, w: T, rw: T * 0.95, baseKey: "cofre", sprite: s, readyAt: 0 });
    this.rebuildCollisions();
  }

  // colocar en la granja un cofre que está en la bolsa (clic en la bolsa — detalles jueves)
  placeChestFromBag() {
    const idx = (G.chests || []).findIndex(c => c && c.col == null);
    if (idx < 0) { toast("No tenés cofres en la bolsa"); return; }
    this.spawnChest(idx);
    toast("Cofre colocado — arrastralo en modo edición para moverlo");
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    if (typeof saveFarm === "function") saveFarm(true);
  }

  // recoger un cofre COLOCADO y devolverlo a la bolsa (debe estar vacío)
  pickupChest(idx) {
    const c = (G.chests || [])[idx]; if (!c || c.col == null) return;
    if (!c.items.every(s => !s)) { toast("Vaciá el cofre antes de recogerlo"); return; }
    const oi = this.objs.findIndex(o => o.type === "cofre" && o.chestIdx === idx);
    if (oi >= 0) { const o = this.objs[oi]; if (o.sprite) o.sprite.destroy(); if (o.timer) o.timer.destroy(); this.objs.splice(oi, 1); }
    c.col = null; c.row = null;
    this.rebuildCollisions();
    closeOv("ov-cofre");
    toast("Cofre guardado en tu bolsa");
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    if (typeof saveFarm === "function") saveFarm(true);
  }

  // brillo de interacción: hover del cursor + cercanía del granjero (capa aditiva sobre el sprite)
  updateHoverFx() {
    if (!this.hoverFx) {
      this.hoverFx = this.add.image(0, 0, "sprout").setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.28);
      this.nearFx = this.add.image(0, 0, "sprout").setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.16);
    }
    const apply = (fx, s) => {
      if (!s || !s.visible || !s.texture || !s.texture.key || s.texture.key.startsWith("__")) { fx.setVisible(false); return; }
      fx.setTexture(s.texture.key); fx.setOrigin(s.originX, s.originY);
      fx.setPosition(s.x, s.y); fx.setDisplaySize(s.displayWidth, s.displayHeight);
      fx.setFlipX(!!s.flipX); fx.setAngle(0); fx.setDepth(s.depth + 0.5); fx.setVisible(true);
      if (fx.isCropped) fx.setCrop();   // el árbol se dibuja recortado (copa/tronco), pero el brillo va entero
    };
    if (GF.editMode || GF.uiOpen) { this.hoverFx.setVisible(false); this.nearFx.setVisible(false); return; }
    const T = GF.TILE, p = this.input.activePointer;
    let hov = null;
    for (const o of this.objs) {
      if (this.hitsSprite(o.sprite, p.worldX, p.worldY)) { hov = o.sprite; break; }   // el brillo coincide con lo que realmente se clickea
    }
    if (!hov) for (const pl of this.plots) {
      if (pl.state === "locked") continue;   // los plots bloqueados no se iluminan
      if (pl.ground && Math.abs(p.worldX - pl.cx) < T / 2 && Math.abs(p.worldY - pl.by) < T / 2) { hov = pl.ground; break; }
    }
    apply(this.hoverFx, hov);
    // cercanía: lo que el granjero puede interactuar ya mismo (mismo brillo, más suave)
    if (GF.NO_WALK) { this.nearFx.setVisible(false); return; }   // el granjero queda estacionado donde trabajó: su "cercanía" no vale
    const near = this.nearestInteract();
    const nearOk = near && !(near.type === "plot" && near.state === "locked");
    const ns = nearOk ? (near.sprite || near.ground) : null;
    apply(this.nearFx, (ns && ns !== hov) ? ns : null);
  }

  // recalcula las colisiones a partir de las posiciones actuales de los objetos (tras editar)
  /* ============ AQUÍ ESTABA LA CAUSA DE LAS CELDAS OSCURAS (20/8, dirección, TERCER aviso) ======
     "Esas celdas oscuras no tienen que estar. Es como que ahí hay mapeado algo más de antes. Te lo
      pido cada vez y no lo estás arreglando."
     Lo tenía delante y lo arreglé dos veces al lado. Esta función hacía:

       GF.COLLISIONS = this.objs.filter(o => !o.oculto).map(o => GF.solidRect(o));

     y GF.solidRect devuelve SOLO geometría: {cx, by, hw, dep}. La identidad de cada objeto —su
     índice, su tipo, su bloque de expansión, su número de orden— la pone GF.rehacerColisiones() en
     config.js, y esta línea la borraba entera en cada arranque de escena (create la llama siempre).
     Con eso pasaban dos cosas, y las dos son lo que veía dirección:

       1. GF.ocupacion() pregunta `objetoPresente(GF.COLLISIONS[i])`, y esa función decide mirando
          `c.tipo`. Sin tipo no reconoce nada y devuelve SIEMPRE presente: los siete edificios sin
          plano, los árboles todavía no entregados y las rocas bloqueadas volvían a reservar sus
          celdas de fábrica. Treinta celdas sombreadas sin un solo sprite encima.
       2. Y como además FILTRABA, la lista quedaba más corta que WORLD_OBJECTS y los índices se
          corrían: COLLISIONS[i] pasaba a ser la caja de otro objeto. O sea que no era solo
          permisivo, estaba descolocado.

     Y explica por qué mis dos arreglos anteriores no sirvieron: las posiciones fantasma del
     guardado y la caja cuadrada de la laguna eran problemas REALES, pero se borraban en cuanto
     arrancaba la escena y esta línea reescribía el mapa entero.
     Ahora se rehace desde WORLD_OBJECTS —que es quien sabe qué es cada cosa— y encima se corrigen
     las posiciones de lo que el jugador movió en modo edición, que es para lo que existía esto.
     Filtrar lo oculto ya no hace falta: blockedAt pregunta objetoPresente antes de dar una caja
     por sólida, así que con la identidad puesta lo invisible sigue sin estorbar al caminar. */
  rebuildCollisions() {
    GF.rehacerColisiones();                 // identidad: i, tipo, exp y número de orden
    const extra = [];
    (this.objs || []).forEach(o => {
      if (o.type === "fish") return;
      const r = GF.solidRect(o);
      if (typeof o.i === "number" && GF.COLLISIONS[o.i]) {
        /* Objeto del mundo: se le corrige la posición (pudo moverse en modo edición o haberse
           colocado con su plano), pero NO se le toca la identidad. */
        const c = GF.COLLISIONS[o.i];
        c.cx = r.cx; c.by = r.by; c.hw = r.hw; c.dep = r.dep;
      } else {
        /* Lo que la escena crea aparte y no está en WORLD_OBJECTS: cofres colocados, montículos
           del día, el paquete. No tienen nada que ocultar, así que van tal cual y con su tipo. */
        r.tipo = o.type; extra.push(r);
      }
    });
    GF.COLLISIONS = GF.COLLISIONS.concat(extra);
    if (GF.ocupCambio) GF.ocupCambio();      // el mapa de ocupación tiene que rehacerse
    this.navOf().invalidate();               // la rejilla de pathfinding se rearma sola en el próximo clic
  }
  // blueprints (12/8): el cartel de materiales que flota sobre una OBRA colocada
  letreroObra(o) {
    if (o.letrero) { o.letrero.destroy(); o.letrero = null; }
    if (!o || o.oculto || !o.sprite) return;
    if (typeof BUILD_DEF === "undefined" || !BUILD_DEF[o.type] || (G.built && G.built[o.type])) return;
    if (typeof obraFalta !== "function" || !(typeof obraDe === "function" && obraDe(o.type))) return;
    const falta = obraFalta(o.type);
    if (!falta.length) return;
    const partes = falta.map(([r, f, tot, dep]) => (r === "golden" ? "$G" : (RES_LABEL[r] || r)) + " " + dep + "/" + tot);
    o.letrero = this.add.text(o.cx, o.by - (o.sprite.displayHeight || 60) - 6, "🔨 " + partes.join("  ·  "),
      { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff3cf", stroke: "#241505", strokeThickness: 4, align: "center" })
      .setOrigin(0.5, 1).setDepth(99990).setVisible(false);   // 13/8: aparece solo con el cursor encima (lo maneja update)
  }

  /* ============ EL CARTEL DE EXPANSIÓN, SOBRE EL MAPA (18/8) ========================
     Dirección, con captura de Sunflower: "cuando hay una zona que ya es expandible se pone esa
     delimitación, marcando que ese lugar ya puede ser expandido, y le das al botón entregando los
     recursos que pida".
     Antes esto vivía en la Tienda, pestaña Adornos — la compra más grande del juego escondida
     donde se venden macetas. Dirección, que sabía que existía, no la encontró; un jugador menos.
     Ahora el bloque que te toca se marca EN EL BOSQUE, con estacas en su perímetro y un cartel en
     el centro que dice qué cuesta. Se ve el terreno antes de pagarlo, que es de lo que se trata. */
  dibujarExpansion() {
    const ex = (typeof expansionSiguiente === "function") ? expansionSiguiente() : null;
    // FIRMA: el cartel se redibuja solo si cambió algo que se VE (el bloque, el nivel, o cuánto
    // material tenés de lo que pide). Sin esto habría que destruir y rehacer ~40 objetos en cada
    // refresco del HUD, o sea varias veces por segundo.
    const firma = !ex ? "-" : [ex.n, G.level, Object.keys(ex.costo)
      .map(k => k + Math.min(Math.floor((G.res && G.res[k]) || 0), ex.costo[k])).join("|")].join("/");
    if (this.expFx && this._expFirma === firma) return;
    this._expFirma = firma;
    if (this.expFx) { this.expFx.forEach(o => { try { o.destroy(); } catch (e) {} }); }
    this.expFx = [];
    if (!ex || !ex.bloque) return;
    const T = GF.TILE, b = ex.bloque;
    const x0 = b.c0 * T, y0 = b.r0 * T, w = (b.c1 - b.c0) * T, h = (b.r1 - b.r0) * T;
    const falta = (G.level || 1) < ex.nivel;
    /* 20/8 (dirección) — SIN NIVEL, EL LOTE NO EXISTE.
       "Lo de expandir a nivel tres sale antes de ser nivel tres. Que se pueda expandir se
        demuestre cuando sea el nivel que se pueda expandir. Antes no tiene por qué mostrar eso."
       Tiene razón y es la tercera vuelta de la misma idea: el 18/8 se quitó el lote marcado en
       reposo (las líneas de estacas grises sobre el bosque) y quedó solo al pasar el cursor. Pero
       al pasar el cursor seguía apareciendo un cartel gris —"Nivel 3 · terreno bloqueado"— sobre
       un terreno que no podés tocar. Eso no informa: frustra. Enseñar una puerta cerrada cada vez
       que rozás el bosque convierte el mapa en una lista de cosas que no podés hacer.
       A partir de acá el bloque siguiente NO se dibuja, NO es interactivo y NO tiene cartel hasta
       que tenés el nivel. El día que subís, la firma incluye G.level, así que se redibuja solo y
       el lote aparece con sus estacas y su chapa dorada — que es cuando la noticia es buena.
       Lo que se ve por adelantado sigue estando donde no molesta: la ficha del Mercado → Adornos
       lista la expansión y su nivel, para quien quiera planificar. */
    if (falta) return;
    /* De acá para abajo `falta` es siempre false: el nivel ya está. Se quitan las ramas que
       dependían de él en vez de dejarlas muertas — código que dice "si te falta nivel" en un sitio
       al que no se llega sin nivel es exactamente lo que hace que un fallo se lea como arreglado. */
    const puede = typeof canAfford === "function" && canAfford(ex.costo);
    const col = puede ? 0xffd54a : 0xd8b45a;

    /* 18/8 (dirección, 2ª pasada): "no quiero que haya líneas de puntos grises... lo de que se
       puede desbloquear el lugar solo debe aparecer cuando pasó el cursor encima".
       Estaba dejando el lote marcado en reposo: borde gris + estacas al 0,5 de alfa, que a una
       estaca por celda se leen justo como una línea de puntos sobre el bosque. Ahora EN REPOSO EL
       LOTE NO SE VE: ni relleno, ni borde, ni estacas. Todo eso aparece al pasar el cursor.
       Ojo: la zona NO puede ocultarse con setVisible(false) —Phaser deja de hacerle hit-test y no
       habría hover que encender—. Se apaga bajando el alfa a 0, que sigue siendo interactiva. */
    const zona = this.add.rectangle(x0 + w / 2, y0 + h / 2, w, h, col, 0)
      .setDepth(-998).setStrokeStyle(2, col, 0);
    this.expFx.push(zona);
    zona.setInteractive({ useHandCursor: true });
    const estacas = [];   // se encienden y apagan con el cursor, igual que el resaltado
    const resaltar = (on) => {
      zona.setFillStyle(col, on ? 0.34 : 0);
      zona.setStrokeStyle(on ? 3 : 2, col, on ? 1 : 0);
      estacas.forEach(o => { try { o.setVisible(on); } catch (e) {} });
      if (this.expCartel) this.expCartel.forEach(o => { try { o.setVisible(on || puede); } catch (e) {} });
    };
    zona.on("pointerover", () => resaltar(true));
    zona.on("pointerout", () => resaltar(false));
    // ESTACAS en el perímetro, como las de Sunflower: marcan el lote sin taparlo. Nacen ocultas.
    const paso = T;
    const estaca = (x, y) => {
      estacas.push(this.add.rectangle(x, y, 4, 11, col, 0.95).setDepth(y + 1));
      estacas.push(this.add.ellipse(x, y + 5, 7, 3, 0x2b2417, 0.35).setDepth(y));
    };
    for (let x = x0 + paso / 2; x < x0 + w; x += paso) for (const y of [y0, y0 + h]) estaca(x, y);
    for (let y = y0 + paso / 2; y < y0 + h; y += paso) for (const x of [x0, x0 + w]) estaca(x, y);
    estacas.forEach(o => { o.setVisible(false); this.expFx.push(o); });

    // el cartel del centro: qué cuesta, en verde lo que tenés y en rojo lo que falta
    const cx = x0 + w / 2, cy = y0 + h / 2;
    const D = 99980;
    this.expCartel = [];   // lo que solo se ve con el cursor encima (o siempre, si ya lo podés pagar)
    const chapa = this.add.rectangle(cx, cy, 148, 56, 0x1d2a14, 0.86)
      .setStrokeStyle(2, col, 0.9).setDepth(D).setInteractive({ useHandCursor: true });
    this.expFx.push(chapa); this.expCartel.push(chapa);
    { const t = this.add.text(cx, cy - 18, "EXPANDIR",
        { fontFamily: "system-ui", fontSize: "12px", fontStyle: "bold", color: "#ffe08a" })
        .setOrigin(0.5, 0.5).setDepth(D + 1);
      this.expFx.push(t); this.expCartel.push(t); }
    {
      const partes = Object.keys(ex.costo).map(k => {
        const tengo = Math.floor((G.res && G.res[k]) || 0);
        return { txt: (RES_LABEL[k] || k) + " " + tengo + "/" + ex.costo[k], ok: tengo >= ex.costo[k] };
      });
      partes.forEach((p, i) => {
        const t3 = this.add.text(cx, cy - 2 + i * 12, p.txt,
          { fontFamily: "system-ui", fontSize: "10px", fontStyle: "bold", color: p.ok ? "#9fe07a" : "#ff9a8a" })
          .setOrigin(0.5, 0.5).setDepth(D + 1);
        this.expFx.push(t3); this.expCartel.push(t3);
      });
      /* 20/8 (dirección): "en la chapa donde está el costo, abajo debería decir lo que te
         desbloquea". Y segunda pasada: "la información de las celdas no es importante, pero la
         de los nodos y la parcela sí" — las celdas se ven solas al expandir; el premio es esto: */
      const premio = this.add.text(cx, cy - 2 + partes.length * 12 + 3,
        "Trae árbol · roca · parcela",
        { fontFamily: "system-ui", fontSize: "9px", color: "#cfe0c0" })
        .setOrigin(0.5, 0.5).setDepth(D + 1);
      this.expFx.push(premio); this.expCartel.push(premio);
      chapa.setSize(148, 34 + partes.length * 12 + 14);
      if (puede) {   // late suave cuando ya lo podés pagar: el cartel pide que lo toques
        this.tweens.add({ targets: chapa, scaleX: 1.04, scaleY: 1.04, duration: 700,
          yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    }
    // arranca OCULTO: solo se ve con el cursor encima. La ÚNICA excepción es cuando ya lo podés
    // pagar: ahí el cartel dorado se queda a la vista porque es una llamada a la acción, no un
    // aviso gris. Si te falta nivel o material, el bosque se ve limpio.
    this.expCartel.forEach(o => o.setVisible(puede));
    // que el cartel también cuente como "encima del lote": si no, al mover el cursor del bloque a
    // la chapa el cartel se escondería justo cuando vas a tocarlo
    chapa.on("pointerover", () => { zona.emit("pointerover"); });
    chapa.on("pointerdown", () => {
      if (!canAfford(ex.costo)) {
        toast("Te falta material: " + Object.keys(ex.costo)
          .filter(k => Math.floor((G.res[k] || 0)) < ex.costo[k])
          .map(k => (ex.costo[k] - Math.floor(G.res[k] || 0)) + " " + (RES_LABEL[k] || k)).join(" · "));
        return;
      }
      const lista = Object.keys(ex.costo).map(k => ex.costo[k] + " " + (RES_LABEL[k] || k)).join(" + ");
      askConfirm("Expandir la granja " + (GF.BLOQUE * GF.BLOQUE) + " celdas por " + lista + "?",
        () => { if (typeof expansionComprar === "function") expansionComprar(); },
        { title: "Expansión " + ex.n + " de " + EXPANSION_MAX, yes: "Expandir", yesClass: "green", no: "Ahora no" });
    });
  }

  // pathfinding A* (módulo compartido con el Bosque — nav.js)
  navOf() { if (!this._nav) this._nav = new GF.Nav((x, y, p) => GF.blockedAt(x, y, p), GF.WORLD_W, GF.WORLD_H, GF.ORIG_X, GF.ORIG_Y); return this._nav; }
  lineFree(x0, y0, x1, y1) { return this.navOf().lineFree(x0, y0, x1, y1); }
  findPath(sx, sy, tx, ty) { return this.navOf().find(sx, sy, tx, ty); }

  // caminar hacia un punto rodeando obstáculos
  goTo(x, y, silent) {
    const p = this.findPath(this.hero.x, this.hero.y, x, y);
    if (!p) { this.path = null; this.moveTarget = null; if (!silent) toast("No hay camino hasta ahí"); return false; }
    this.path = p.slice(); this.moveTarget = this.path.shift();
    this.lastDD = null; this.noProg = 0;   // destino nuevo: reinicia el control de progreso
    return true;
  }

  // destino del clic sostenido; con freno para no recalcular la ruta en cada píxel del arrastre
  holdSeek(wx, wy) {
    if (this.action) return;
    const t = nowMs();
    if (this.holdLast && Math.hypot(wx - this.holdLast.x, wy - this.holdLast.y) < 10 && t - (this.holdAt || 0) < 130) {
      this.holdPend = { x: wx, y: wy }; return;   // pendiente: se aplica en cuanto pase el freno
    }
    this.holdLast = { x: wx, y: wy }; this.holdAt = t; this.holdPend = null;
    if (this.lineFree(this.hero.x, this.hero.y, wx, wy)) { this.path = null; this.moveTarget = { x: wx, y: wy }; this.lastDD = null; this.noProg = 0; }   // camino libre: derecho, sin A*
    else this.goTo(wx, wy, true);
    this.showDest(wx, wy);
  }

  // marcador del punto de destino mientras arrastrás
  showDest(x, y) {
    if (!this.destMk) {
      this.destMk = this.add.circle(x, y, 5, 0xffe9a8, 0.5).setStrokeStyle(2, 0xfff3cf, 0.95).setDepth(99997);
      this.destTw = this.tweens.add({ targets: this.destMk, scale: { from: 0.7, to: 1.25 }, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 480 });
    }
    this.destMk.setPosition(x, y).setVisible(true);
  }
  hideDest() { if (this.destMk) this.destMk.setVisible(false); }

  // ESTÁNDAR de los contadores: se ven con el cursor encima o con el granjero cerca (nunca fijos)
  timerOn(o) {
    if (GF.editMode || GF.uiOpen) return false;
    const p = this.input.activePointer;
    if (o.sprite && this.hitsSprite(o.sprite, p.worldX, p.worldY)) return true;
    if (o.ground && Math.abs(p.worldX - o.cx) < GF.TILE / 2 && Math.abs(p.worldY - o.by) < GF.TILE / 2) return true;
    if (GF.NO_WALK) return false;   // sin granjero que camine, la cercanía no significa nada: solo cuenta el cursor
    const rad = (o.type === "plot") ? 52 : 66;
    return Math.hypot(o.cx - this.hero.x, o.by - this.hero.y) < rad;
  }

  // ¿el clic cae sobre un píxel OPACO del sprite? Evita seleccionar un árbol clickeando
  // el hueco transparente que rodea la copa (el rectángulo del sprite es mucho más grande).
  // RENDIMIENTO (10/8). Esto se llamaba ~85 veces por frame desde tres lugares distintos
  // (timers, brillo del hover y el cartel de acción), y cada llamada alocaba un Rectangle
  // nuevo y, si el cursor caía dentro, leía un píxel real del canvas con getPixelAlpha.
  // Ahora: el Rectangle se reusa y el resultado se cachea por frame y por sprite, así que
  // el trabajo real pasa a ser una vez por sprite en vez de tres.
  hitsSprite(s, wx, wy) {
    if (!s || !s.visible) return false;
    if (this._hitT !== this._frameT || this._hitX !== wx || this._hitY !== wy) {
      this._hitT = this._frameT; this._hitX = wx; this._hitY = wy;
      this._hitCache = new Map();
    }
    const yaEsta = this._hitCache.get(s);
    if (yaEsta !== undefined) return yaEsta;
    const r = this.hitsSpriteReal(s, wx, wy);
    this._hitCache.set(s, r);
    return r;
  }
  hitsSpriteReal(s, wx, wy) {
    const b = s.getBounds(this._hitRect || (this._hitRect = new Phaser.Geom.Rectangle()));
    if (!Phaser.Geom.Rectangle.Contains(b, wx, wy)) return false;
    const key = s.texture && s.texture.key;
    if (!key || key.startsWith("__") || !b.width || !b.height) return true;
    const tx = Math.floor((wx - b.x) / b.width * s.width);
    const ty = Math.floor((wy - b.y) / b.height * s.height);
    try {
      const a = this.textures.getPixelAlpha(tx, ty, key, s.frame ? s.frame.name : undefined);
      return a === null ? true : a > 12;
    } catch (e) { return true; }
  }

  // brillo/efecto del cultivo: "half" (media cosecha) o "ready" (aura legendaria); cualquier otro valor lo apaga
  setPlotGlow(pl, mode) {
    if (pl.spr && pl.spr._popTw && mode === "ready") { pl.spr._popTw.stop(); pl.spr._popTw = null; }   // el pulso de escala reemplaza al pop
    if (pl.glowTw) { pl.glowTw.stop(); pl.glowTw = null; }
    if (pl.glowTxt) { pl.glowTxt.destroy(); pl.glowTxt = null; }
    if (pl.glowAura) { pl.glowAura.destroy(); pl.glowAura = null; }
    if (pl.glowSp) { pl.glowSp.forEach(s => s.destroy()); pl.glowSp = null; }
    pl.spr.setAlpha(1);
    if (mode === "half") {
      pl.glowTw = this.tweens.add({ targets: pl.spr, alpha: { from: 1, to: 0.72 }, yoyo: true, repeat: -1, duration: 700 });
    } else if (mode === "ready") {
      const T = GF.TILE;
      // aura dorada pulsante detrás del cultivo ("tócame ya")
      pl.glowAura = this.add.circle(pl.cx, pl.by - 4, T * 0.52, 0xffd76a, 0.28).setDepth(pl.by - 1);
      this.tweens.add({ targets: pl.glowAura, scale: { from: 0.9, to: 1.18 }, alpha: { from: 0.32, to: 0.12 }, yoyo: true, repeat: -1, duration: 650 });
      // chispas alrededor, con destellos alternados
      pl.glowSp = [];
      // Antes eran tres Text con emoji; los emojis se perdieron del archivo y quedaron TRES
      // TEXTOS VACÍOS por parcela, cada uno con su tween infinito: con las 12 parcelas listas
      // eran 36 objetos y ~60 tweens actualizándose por frame sin dibujar un solo píxel.
      // Ahora son chispitas dibujadas por código, que además no dependen de la fuente (10/8).
      [[-0.38, -0.6], [0.36, -0.35], [0, -0.85]].forEach(([ox, oy], i) => {
        const r = i === 2 ? 3.4 : 2.4;
        const s = this.add.graphics().setDepth(pl.by + 2).setBlendMode(Phaser.BlendModes.ADD);
        s.fillStyle(0xffe9a8, 1)
         .fillTriangle(0, -r * 2, r * 0.55, 0, -r * 0.55, 0).fillTriangle(0, r * 2, r * 0.55, 0, -r * 0.55, 0)
         .fillTriangle(-r * 2, 0, 0, r * 0.55, 0, -r * 0.55).fillTriangle(r * 2, 0, 0, r * 0.55, 0, -r * 0.55);
        s.setPosition(pl.cx + ox * T, pl.by + oy * T);
        this.tweens.add({ targets: s, alpha: { from: 1, to: 0.1 }, scale: { from: 1, to: 1.35 }, yoyo: true, repeat: -1, duration: 420 + i * 160, delay: i * 180 });
        pl.glowSp.push(s);
      });
      pl.glowTw = this.tweens.add({ targets: pl.spr, scale: { from: pl.spr.scale, to: pl.spr.scale * 1.06 }, yoyo: true, repeat: -1, duration: 650 });
    }
  }

  // al cosechar: el brillo explota y caen monedas (feedback del diseñador)
  coinBurst(x, y) {
    const flash = this.add.circle(x, y - 8, 6, 0xffe9a8, 0.85).setDepth(99998);
    this.tweens.add({ targets: flash, scale: 4, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    for (let i = 0; i < 5; i++) {
      // idem: eran Text con emoji de moneda, quedaron vacíos. Ahora es una monedita dibujada.
      const c = this.add.graphics().setDepth(99999);
      c.fillStyle(0xd9a521, 1).fillCircle(0, 0, 4).fillStyle(0xffe08a, 1).fillCircle(-1, -1, 2.6);
      c.setPosition(x, y - 12);
      this.tweens.add({
        targets: c, x: x + (Math.random() - 0.5) * 52, y: y - 26 - Math.random() * 26,
        alpha: { from: 1, to: 0 }, duration: 520 + Math.random() * 240, delay: i * 40,
        onComplete: () => c.destroy(),
      });
    }
  }

  // brote mientras crece
  showGrowing(pl, pop) {
    pl.half = false; this.setPlotGlow(pl, "off");
    pl.spr.clearTint().setAlpha(1);
    pl.spr.setTexture("sprout").setVisible(true);
    pl.spr.setScale((GF.TILE * 0.73) / pl.spr.width);   // ~20px visibles, centrado en la tierra
    pl.emo.setVisible(false);
    if (pop) { this.popFx(pl.spr, POP_INTERMEDIO); this.puffFx(pl.cx, pl.by + 2, 0xb4b2a9, 5); }   // el brote asoma de la tierra
  }
  // cultivo (conjunto) cuando está listo; si falta el sprite, cae al emoji
  // `pop` = true solo cuando el cultivo TERMINA de crecer ahora mismo (no al restaurar la partida)
  showReadyCrop(pl, pop) {
    const key = "cropg_" + pl.cropKey;
    if (pl.cropKey && this.textures.exists(key)) {
      pl.spr.setTexture(key).setVisible(true);
      pl.spr.setScale((GF.TILE * 1.02) / pl.spr.width);   // ~27px visibles
      pl.emo.setVisible(false);
    } else {
      pl.spr.setVisible(false);
      const cd = CROP_DEF[pl.cropKey];
      pl.emo.setText(cd ? cd.emoji : "").setVisible(true);
    }
    pl.timer.setVisible(false);
    if (pop) {
      // primero el saltito de resorte y RECIÉN DESPUÉS el brillo, porque el brillo también
      // anima la escala y los dos tweens se pelearían por la misma propiedad
      this.puffFx(pl.cx, pl.by + 2, 0xc0dd97, 7);
      this.popFx(pl.spr, 1, () => { if (pl.state === "ready") this.setPlotGlow(pl, "ready"); });
    } else this.setPlotGlow(pl, "ready");
  }
  // pinta la parcela según su estado (para restaurar tras un refresh)
  applyPlotVisual(pl) {
    if (pl.state === "growing") {
      this.showGrowing(pl);
      // el guardado manda; si es una partida vieja sin el dato, se calcula con el multiplicador real
      if (!pl.growTotal) pl.growTotal = CROP_DEF[pl.cropKey] ? CROP_DEF[pl.cropKey].grow * 1000 * (typeof cdMult === "function" ? cdMult() : 1) : 0;
      if (pl.readyAt && pl.growTotal < pl.readyAt - nowMs()) pl.growTotal = pl.readyAt - nowMs();   // nunca menos que lo que falta
    }
    else if (pl.state === "ready") this.showReadyCrop(pl);
    else { this.setPlotGlow(pl, "off"); pl.spr.setVisible(false); pl.emo.setVisible(false); pl.timer.setVisible(false); }
  }

  // vuelca el estado de las parcelas a G.plots para que el autoguardado lo persista
  syncPlots() { if (this.plots) G.plots = this.plots.map(pl => ({ state: pl.state, readyAt: pl.readyAt, cropKey: pl.cropKey, witherAt: pl.witherAt || 0, growTotal: pl.growTotal || 0 })); }   // growTotal: sin él, tras un F5 la barrita de crecimiento arrancaba desde donde no era
  /* 18/8: el equivalente de syncPlots para los NODOS. Solo se anotan los que están enfriándose,
     así el guardado no engorda con treinta entradas en cero. Se guarda por índice de objeto, que
     es estable porque WORLD_OBJECTS solo crece por el final. */
  /* QUÉ TEXTURA LE TOCA A UN NODO SEGÚN CUÁNTO LE FALTA (18/8).
     Una función del tiempo, no un evento. Vale igual en el tick, al construir la escena, al volver
     del Bosque o tras un F5, porque no depende de que nadie estuviera mirando en un instante.
       0 … 0,5 del enfriamiento → recién usado (tocón / roca picada)
       0,5 … 1                  → a medio crecer
       ya listo                 → entero                                                       */
  texNodo(o, t) {
    const ancho = o.rw || o.w;
    if (!o.readyAt || t >= o.readyAt) return { key: o.baseKey, ancho, alfa: 1 };
    const total = Math.max(1, o.readyAt - (o.cdIni || (o.readyAt - 1)));
    const p = 1 - (o.readyAt - t) / total;                 // 0 recién usado … 1 listo
    const hay = k => this.textures.exists(k);
    if (o.type === "tree") {
      if (p < 0.5) return hay("tree_stump_leaves") ? { key: "tree_stump_leaves", ancho: ancho * 0.42, alfa: 1 }
                                                   : { key: "tree_stump", ancho: ancho * 0.42, alfa: 1 };
      if (hay("tree_half")) return { key: "tree_half", ancho, alfa: 1 };
      if (hay("tree_sapling")) return { key: "tree_sapling", ancho: ancho * 0.6, alfa: 1 };
      return { key: o.baseKey, ancho, alfa: 0.7 };
    }
    if (o.type === "rock" || o.type === "ore") {
      if (p < 0.5) return hay(o.baseKey + "_mined") ? { key: o.baseKey + "_mined", ancho, alfa: 1 }
                 : hay("node_stone_mined") ? { key: "node_stone_mined", ancho, alfa: 1 }
                 : { key: o.baseKey, ancho, alfa: 0.5 };
      if (hay(o.baseKey + "_half")) return { key: o.baseKey + "_half", ancho, alfa: 1 };
      if (hay("node_stone_half")) return { key: "node_stone_half", ancho, alfa: 1 };
      return { key: o.baseKey, ancho, alfa: 0.75 };
    }
    return { key: o.baseKey, ancho, alfa: 1 };
  }
  // La aplica si cambió. Devuelve true SOLO cuando hubo cambio, para que los efectos se disparen
  // una vez y no en cada frame.
  aplicarTexNodo(o, t) {
    if (!o.sprite || (o.type !== "tree" && o.type !== "rock" && o.type !== "ore")) return false;
    if (o.locked || o.oculto || (o.golpes || 0) > 0) return false;   // a medio talar manda el golpe, no el reloj
    const d = this.texNodo(o, t == null ? nowMs() : t);
    const cambio = o.sprite.texture.key !== d.key || Math.abs((o.sprite.alpha || 1) - d.alfa) > 0.01;
    if (!cambio) return false;
    if (o.sprite.texture.key !== d.key) this.setObjTex(o, d.key, d.ancho);
    o.sprite.setAlpha(d.alfa);
    return true;
  }
  syncNodos() {
    if (!this.objs) return;
    const n = {}, t = nowMs();
    this.objs.forEach(o => {
      if (typeof o.i !== "number") return;                       // excavaciones, paquete, cofres: no son nodos
      if (o.type !== "tree" && o.type !== "rock" && o.type !== "ore") return;
      /* 22/8 — EL BUG DEL ÁRBOL INFINITO (reporte de dirección, en vivo): esta línea decía
         « readyAt <= t: ya está listo, nada que recordar », una regla de ANTES de las cargas.
         Con las cargas, el reloj vencido EN EL PASADO es el almacén: cuánto acumuló el nodo y
         cuánto se le drenó. Descartarlo hacía que cualquier F5 o viaje de zona recreara el nodo
         SIN reloj — y sin reloj es VIRGEN, o sea lleno de nuevo: madera infinita a fuerza de
         recargar. Ahora se recuerda todo reloj que exista, pasado o futuro. */
      if (!o.readyAt) return;                                    // virgen de verdad: nada que recordar
      const base = GF.WORLD_OBJECTS[o.i];
      if (!base) return;
      n[base.type + ":" + base.leftCol + "," + base.baseRow] = { readyAt: o.readyAt, halfAt: o.halfAt || 0, cdIni: o.cdIni || 0 };
    });
    G.nodos = n;
  }

  // Cuando el juego REGALA una parcela (nivel de granja, ficha del pase), hay que abrirla en el acto:
  // antes se sumaba al guardado pero el dibujo seguía en gris hasta apretar F5 (reporte del diseñador).
  /* EL BOSQUE QUE RODEA AL CLARO (16/8, idea de dirección). Todo el anillo se dibuja UNA
     vez dentro de un renderTexture, igual que el suelo: son miles de árboles pero para el
     motor es una sola imagen, así que el coste por frame es CERO. Se apoya en que la granja
     es NO_WALK — nadie camina, así que el bosque no necesita colisiones: encierra por
     composición y por los límites de cámara. Números en config.js (GF.BOSQUE_*).
     Próxima etapa: partir el anillo en claros que se limpian al subir de nivel. */

  /* ============ EL TERRENO, EN PIEZAS QUE SE PUEDEN REHACER SOLAS (18/8) =============
     Dirección: "¿por qué en expansión puede llegar a ser caro? No se puede dejar de renderizar
     los árboles que toca, quitar la parte del corral que hay que quitar y ya está?"
     Tenía razón y yo me pasé de prudente. Comprar terreno NO cambia "todo": cambia CUATRO cosas
     —el césped, sus florcitas, la grilla y la cerca— más el bosque (que ya era un método) y los
     límites de cámara. El problema era que esas cuatro estaban escritas dentro de create(), así
     que la única forma de rehacerlas era rehacer la escena entera.
     Ahora cada una es un método que se limpia a sí mismo y se puede volver a llamar en caliente.
     create() llama a las cuatro igual que antes; expandirEnVivo() las vuelve a llamar. */
  dibujarCesped() {
    if (this.cespedRT) { try { this.cespedRT.destroy(); } catch (e) {} this.cespedRT = null; }
    if (this.cespedG) { try { this.cespedG.destroy(); } catch (e) {} this.cespedG = null; }
    const T = GF.TILE, W = GF.WORLD_W, H = GF.WORLD_H;
    const g = this.cespedG = this.add.graphics().setDepth(-1000);
      // SUELO NUEVO (31/7): tiles de pasto seamless con variantes esparcidas — chau damero
      if (this.textures.exists("grass_a")) {
        // 17/8: el pasto ahora se extiende MÁS ALLÁ DE LA CERCA, hasta donde llega el bosque.
        // Antes cubría solo el mundo jugable, así que la franja entre la cerca y el primer árbol
        // —que existe a propósito, para que el bosque no se suba al corral— quedaba pintada con
        // el verde liso del fondo de la cámara. Se veía como un anillo plano alrededor de la
        // granja. Los tiles de más quedan tapados por el bosque y no cuestan nada: es un solo
        // renderTexture que se arma una vez.
        // 17/8: el pasto NO necesita cubrir el mapa entero. Solo se ve la franja entre la cerca y
        // el primer árbol (~1,5 celdas); de ahí para afuera lo tapa el bosque, y donde el bosque
        // tiene claros el fondo ya es del color del césped. Cubría 1638x1680 = 10,5 MB de textura
        // para enseñar 4 celdas de pasto. Con 4 celdas de sobra basta y sobra.
        // 18/8: el pasto ya no cubre "el rectángulo del mundo": cubre EL TERRENO QUE TENÉS más el
        // aire de bosque, que es la forma que puede tener ángulos hacia dentro. El renderTexture
        // sigue siendo un rectángulo (es una textura), pero solo se DIBUJAN los tiles despejados,
        // así que la memoria no crece con el hueco y el bosque tapa el resto.
        const ter = GF.terreno();
        const cExtra = GF.BOSQUE ? 4 : Math.ceil(this.margenBosque("x") / T);
        const rExtra = GF.BOSQUE ? 4 : Math.ceil(this.margenBosque("y") / T);
        const c0 = ter.c0 - cExtra, r0 = ter.r0 - rExtra;
        const c1 = ter.c1 + cExtra, r1 = ter.r1 + rExtra;
        const rt = this.add.renderTexture(c0 * T, r0 * T, (c1 - c0) * T, (r1 - r0) * T)
          .setOrigin(0).setDepth(-1000);
        let gseed = 20260731;
        const grnd = () => { gseed = (gseed * 1664525 + 1013904223) >>> 0; return gseed / 4294967296; };
        const hasB = this.textures.exists("grass_b"), hasC = this.textures.exists("grass_c");
        const lote = typeof rt.beginDraw === "function";   // en lote: son ~1.200 tiles, no 200
        if (lote) rt.beginDraw();
        for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
          const x = grnd();
          const key = (x < 0.55 || (!hasB && !hasC)) ? "grass_a" : (x < 0.90 && hasB ? "grass_b" : (hasC ? "grass_c" : "grass_a"));
          if (lote) rt.batchDraw(key, (c - c0) * T, (r - r0) * T); else rt.draw(key, (c - c0) * T, (r - r0) * T);
        }
        if (lote) rt.endDraw();
        this.cespedRT = rt;   // 18/8: se guarda para poder destruirlo y rehacerlo al expandir
      } else {   // respaldo: el damero de siempre
        const ter = GF.terreno();
        ter.mias.forEach(s => {
          const p = s.split(","), c = +p[0], r = +p[1];
          g.fillStyle((r + c) % 2 === 0 ? 0x6c8c53 : 0x64834c, 1);
          g.fillRect(c * T, r * T, T, T);
        });
      }
  }
  dibujarDecosCesped() {
    if (this.decoG) { try { this.decoG.destroy(); } catch (e) {} this.decoG = null; }
    this.floresDeco = [];
    const T = GF.TILE, W = GF.WORLD_W, H = GF.WORLD_H;
      // detalles del césped (semilla fija): sprites de PixelLab; si faltan, el dibujo por código de antes
      let dseed = 20260730;
      const drnd = () => { dseed = (dseed * 1664525 + 1013904223) >>> 0; return dseed / 4294967296; };
      const deco = this.add.graphics().setDepth(-999.5);
      const DKEYS = ["deco_pasto", "deco_flor_blanca", "deco_flor_amarilla", "deco_piedras"];
      const hasDecos = DKEYS.every(k => this.textures.exists(k));
      // 17/8 (dirección: "el corte en la decoración del césped"). Los adornos se sembraban SOLO
      // dentro del mundo (0..W, 0..H), pero el césped ahora llega hasta el bosque. Resultado: la
      // franja de pasto entre la cerca y los árboles quedaba PELADA, con un rectángulo perfecto
      // marcando dónde se acaban las matitas. Ahora se siembran también fuera, con 3 celdas de
      // desborde —lo que se ve— y la cantidad sube en proporción al área para que la densidad no
      // baje. Los que caen bajo el bosque no se ven (van a profundidad -999,5, debajo del anillo)
      // pero tampoco estorban.
      // 17/8 (dirección): "el césped debe tener florcitas también fuera del corral". El desborde
      // se sube a 4 celdas —lo mismo que ahora cubre el pasto— y la densidad se calcula por ÁREA,
      // así que la franja de fuera queda igual de poblada que la de dentro y no se nota la cerca.
      // 18/8: el área se ancla al ORIGEN del terreno, que puede ser negativo
      const RD = T * 4, AW = W + RD * 2, AH = H + RD * 2;
      const AX = GF.ORIG_X - RD, AY = GF.ORIG_Y - RD;
      // El área ÚTIL no es el rectángulo entero: es solo lo que queda dentro del claro, porque el
      // resto lo tapa el bosque. Se estima muestreando, y con eso se calcula cuántos hacen falta
      // para que la densidad sea la MISMA dentro y fuera de la cerca.
      let dentro = 0;
      for (let m = 0; m < 400; m++) if (this.dentroDelClaro(AX + (m % 20) / 19 * AW, AY + Math.floor(m / 20) / 19 * AH)) dentro++;
      const util = Math.max(0.2, dentro / 400) * AW * AH;
      const nDecos = Math.round((hasDecos ? 110 : 210) * util / (W * H));
      let intentos = 0;
      for (let i = 0; i < nDecos && intentos < nDecos * 12; i++) {
        let dx = 0, dy = 0;
        do { dx = AX + drnd() * AW; dy = AY + drnd() * AH; intentos++; }
        while (!this.dentroDelClaro(dx, dy) && intentos < nDecos * 12);
        const t = drnd();
        if (hasDecos) {
          // pasto pesa doble; tamaños chicos y variados para que respiren
          const key = t < 0.45 ? "deco_pasto" : (t < 0.67 ? "deco_flor_blanca" : (t < 0.89 ? "deco_flor_amarilla" : "deco_piedras"));
          const sz = key === "deco_pasto" ? 15 + drnd() * 6 : (key === "deco_piedras" ? 11 + drnd() * 4 : 13 + drnd() * 4);
          const im = this.add.image(dx, dy + sz / 2, key).setDisplaySize(sz, sz).setDepth(-999.5).setFlipX(drnd() < 0.5);
          im.setOrigin(0.5, 1);   // pivote en la base: el VIENTO la inclina desde el suelo (15/8)
          if (key !== "deco_piedras") (this.vientoDecos = this.vientoDecos || []).push(im);
          // 15/8: las mariposas conocen las flores del suelo (se posan en ellas cuando pasean)
          if (key === "deco_flor_blanca" || key === "deco_flor_amarilla") (this.floresDeco = this.floresDeco || []).push({ x: dx, y: dy });
          continue;
        }
        if (t < 0.72) {          // matita de pasto
          const col = drnd() < 0.6 ? 0x455c35 : 0x688451;
          deco.lineStyle(1, col, 1);
          for (let b = 0; b < 3; b++) { deco.beginPath(); deco.moveTo(dx + b * 2, dy + 3); deco.lineTo(dx + b * 2 + (drnd() * 3 - 1.5), dy - 2 - drnd() * 3); deco.strokePath(); }
        } else if (t < 0.92) {   // florcita
          const cols = [0xf0ebc8, 0xebbe5a, 0xdca0be];
          deco.fillStyle(cols[(drnd() * 3) | 0], 1).fillCircle(dx, dy, 2);
          deco.fillStyle(0x967832, 1).fillCircle(dx, dy, 0.8);
          (this.floresDeco = this.floresDeco || []).push({ x: dx, y: dy });   // 15/8: también son percha de mariposas
        } else {                 // piedrita
          deco.fillStyle(0x8c8778, 1).fillEllipse(dx, dy, 6, 4);
          deco.lineStyle(1, 0x5a564a, 1).strokeEllipse(dx, dy, 6, 4);
        }
      }
    this.decoG = deco;
  }
  dibujarGrilla() {
    if (this.gridG) { try { this.gridG.destroy(); } catch (e) {} this.gridG = null; }
    if (this.marcoG) { try { this.marcoG.destroy(); } catch (e) {} this.marcoG = null; }
    const T = GF.TILE, W = GF.WORLD_W, H = GF.WORLD_H;
    // 18/8: el marco del mundo sale del graphics compartido `g` y pasa al suyo, para poder
    // rehacerlo al expandir sin tocar la laguna, que se dibuja en el mismo `g` y no cambia.
    const g = this.marcoG = this.add.graphics().setDepth(-999.45);
      // cuadriculado: solo visible en modo edición (detalles 29/7)
      this.gridG = this.add.graphics().setDepth(-999.4).setVisible(!!GF.editMode);
      this.gridG.lineStyle(1, 0x18300f, 0.25);
      // 18/8: el mundo puede empezar en coordenadas NEGATIVAS (al comprar por la izquierda o por
      // arriba), así que la grilla y el marco arrancan en el origen del terreno, no en (0,0).
      const OX = GF.ORIG_X, OY = GF.ORIG_Y;
      for (let x = OX; x <= OX + W; x += T) { this.gridG.beginPath(); this.gridG.moveTo(x, OY); this.gridG.lineTo(x, OY + H); this.gridG.strokePath(); }
      for (let y = OY; y <= OY + H; y += T) { this.gridG.beginPath(); this.gridG.moveTo(OX, y); this.gridG.lineTo(OX + W, y); this.gridG.strokePath(); }
      g.lineStyle(4, 0x3c4d31, 0.9).strokeRect(OX, OY, W, H);
  }
  dibujarCerca() {
    if (this.fenceSprites) { this.fenceSprites.forEach(s => { try { s.destroy(); } catch (e) {} }); }
    const T = GF.TILE, W = GF.WORLD_W, H = GF.WORLD_H;
      // cerca de madera cozy alrededor de la granja (horizontal de frente, vertical de canto)
      this.fenceSprites = [];   // referencias para la valla dorada de la Granja Legendaria (10/8)
      if (this.textures.exists("fence_top")) {
        const FH = T * 0.55, p2 = GF.POND;   // alto del tramo horizontal (de frente)
        const pondCell = (c, r) => c >= p2.col && c < p2.col + p2.cols && r >= p2.row && r < p2.row + p2.rows;
        /* 18/8 — SE RECORRE EL PERÍMETRO, no lado por lado.
           Antes eran cuatro bucles (fila 0, fila ROWS-1, columna 0, columna COLS-1), que solo sabe
           describir un rectángulo. Con las expansiones el contorno tiene entrantes y esquinas hacia
           dentro. La regla nueva no enumera casos: para cada celda TUYA, si el vecino de arriba no
           es tuyo va cerca de arriba; si el de la izquierda no es tuyo, cerca izquierda; etc.
           Cualquier forma sale sola, con los cuatro sprites que ya existen — las uniones encajan por
           construcción, igual que encajaban en las esquinas del rectángulo. */
        const ter = GF.terreno(), esMia = (c, r) => ter.mias.has(c + "," + r);
        ter.mias.forEach(s => {
          const p = s.split(","), c = +p[0], r = +p[1];
          if (pondCell(c, r)) return;                       // la laguna se come su tramo, como siempre
          const x = c * T, y = r * T;
          if (!esMia(c, r - 1)) this.fenceSprites.push(this.add.image(x + T / 2, y + T * 0.58, "fence_top").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(2));
          if (!esMia(c, r + 1)) this.fenceSprites.push(this.add.image(x + T / 2, y + T + 6, "fence_bottom").setDisplaySize(T, FH).setOrigin(0.5, 1).setDepth(y + T + 6));
          if (!esMia(c - 1, r)) this.fenceSprites.push(this.add.image(x + 7, y + T, "fence_left").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(3));
          if (!esMia(c + 1, r)) this.fenceSprites.push(this.add.image(x + T - 7, y + T, "fence_right").setDisplaySize(T * 0.22, T).setOrigin(0.5, 1).setDepth(3));
        });
      }
  }
  /* ============ EXPANDIR SIN TELÓN (18/8, dirección) ================================
     "No se puede dejar de renderizar los árboles que toca, quitar la parte del corral que hay
     que quitar para extenderlo hacia ese terreno, y ya está, ¿un poco más?"
     Sí se puede. Comprar terreno cambia SEIS cosas, no "todo": el césped, sus florcitas, la
     grilla, la cerca, el anillo de bosque (que retrocede) y los límites de cámara. Más los nodos
     que trae el bloque, que ya estaban en la escena esperando. Todo eso son llamadas a métodos
     que se limpian solos; lo que faltaba era que existieran esos métodos.
     Devuelve false si algo sale mal, y ahí sí cae al reinicio con telón, que sigue de respaldo. */
  expandirEnVivo(bloque, alLlegar) {
    try {
      GF.aplicarTerreno((typeof G !== "undefined" && G.expansiones) || 0);   // la forma nueva del terreno
      this.dibujarCesped();          // el pasto llega hasta el bloque nuevo
      this.dibujarDecosCesped();     // y sus florcitas, para que no quede pelado
      this.dibujarGrilla();
      this.dibujarCerca();           // el perímetro se recorre de nuevo: la cerca abraza la forma nueva
      this.dibujarBosque();          // los árboles del bloque comprado dejan de dibujarse
      // los nodos que venían con el terreno aparecen (ya estaban en la escena, ocultos)
      (this.objs || []).forEach(o => {
        if (o.exp == null || (G.expansiones || 0) <= o.exp || !o.oculto) return;
        o.oculto = false; o.locked = false;
        if (o.sprite) { o.sprite.setVisible(true).setAlpha(1).clearTint(); this.popFx(o.sprite, 1); }
      });
      if (this.rebuildCollisions) this.rebuildCollisions();
      this._nav = null;                       // el buscador de caminos tenía cacheado el mapa viejo
      if (this.syncNodos) this.syncNodos();
      this.dibujarExpansion();                // el cartel salta al bloque siguiente
      try { this.refreshPlotLocks(); } catch (e) {}
      this.camLim = this.limiteVista();
      this.cameras.main.setBounds(this.camLim.x1, this.camLim.y1,
        this.camLim.x2 - this.camLim.x1, this.camLim.y2 - this.camLim.y1);
      this.fitCamera();
      /* ---- Y EL VIAJE, QUE AHORA SE VE (20/8, dirección) ----
         "Lo que daría al momento de expandir es la transición y el movimiento de cámara."
         El viaje ya estaba, pero ocurría detrás del Mercado abierto y de la celebración a pantalla
         completa: 760 ms de cámara tapados por 2.600 ms de confeti. Ahora el panel se cierra antes
         (lo hace expansionComprar) y la celebración espera a que la cámara LLEGUE — se avisa por
         `alLlegar`. El jugador ve abrirse la cerca y aparecer su terreno, y el cartel remata.
         El bloque además se enciende un momento al llegar: sin eso, después del viaje el jugador
         mira una zona nueva sin saber cuál de todo lo que ve es lo que acaba de comprar. */
      if (bloque) {
        const T = GF.TILE;
        const cx = (bloque.c0 + bloque.c1) / 2 * T, cy = (bloque.r0 + bloque.r1) / 2 * T;
        const DUR = 900;
        this.cameras.main.pan(cx, cy, DUR, "Sine.easeInOut", true);
        const destello = () => {
          try {
            const x0 = bloque.c0 * T, y0 = bloque.r0 * T;
            const w = (bloque.c1 - bloque.c0) * T, h = (bloque.r1 - bloque.r0) * T;
            const g = this.add.rectangle(x0 + w / 2, y0 + h / 2, w, h, 0xffe08a, 0.35)
              .setDepth(99996).setStrokeStyle(3, 0xffd54a, 0.9);
            this.tweens.add({ targets: g, alpha: 0, duration: 900, ease: "Quad.easeOut",
              onComplete: () => { try { g.destroy(); } catch (e) {} } });
          } catch (e) {}
        };
        /* `camerapancomplete` es lo correcto, pero si por lo que sea no llega (la cámara ya estaba
           ahí, o el pan se interrumpe) el festejo no puede perderse: hay un plazo de respaldo y
           una bandera para que no salga dos veces. Perder la celebración de algo que el jugador
           pagó es peor que verla un instante tarde. */
        let hecho = false;
        const llegada = () => { if (hecho) return; hecho = true; destello(); if (alLlegar) alLlegar(); };
        try { this.cameras.main.once("camerapancomplete", llegada); } catch (e) {}
        this.time.delayedCall(DUR + 120, llegada);
      } else if (alLlegar) alLlegar();
      return true;
    } catch (e) { console.warn("[expandir] en vivo falló, se rehace la escena:", e); return false; }
  }
  dibujarBosque() {
    if (!this.textures.exists("tree")) return;
    const t0 = performance.now();
    const T = GF.TILE, W = GF.WORLD_W, H = GF.WORLD_H;
    // 17/8: el anillo DIBUJADO se recorta a unas pocas celdas. Más allá no hace falta: el
    // mosaico usa las mismas leyes y se ve igual, pero no cuesta memoria porque se repite.
    // El renderTexture cubría el mapa entero (1600x1600 = 9,8 MB) para dibujar árboles que
    // el mosaico puede repetir gratis.
    const CEL = GF.BOSQUE_RT_CELDAS || 7;
    const MX = Math.min(this.margenBosque("x"), CEL * T);
    const MY = Math.min(this.margenBosque("y"), CEL * T);
    // 18/8: el anillo se ancla al ORIGEN del terreno. Estaba clavado en (0,0), así que en cuanto
    // el jugador compraba el primer bloque (que es por la izquierda) todo ese flanco se quedaba
    // sin bosque dibujado: césped pelado hasta el mosaico repetido, y del otro lado 200 px de
    // árboles fuera del límite de cámara. Y el "no pintar sobre el mundo" protegía el rectángulo
    // viejo, así que el suelo de bosque tapaba las florcitas del terreno recién comprado.
    const RX0 = GF.ORIG_X - MX, RY0 = GF.ORIG_Y - MY;
    const rt = this.add.renderTexture(RX0, RY0, W + 2 * MX, H + 2 * MY).setOrigin(0, 0).setDepth(GF.BOSQUE_DEPTH || -999);
    // suelo de bosque: pasto por debajo, para que no asome el mar entre los troncos
    const pastos = ["grass_a", "grass_b", "grass_c"].filter(k => this.textures.exists(k));
    if (pastos.length) {
      const g = this.add.image(0, 0, pastos[0]).setOrigin(0, 0).setVisible(false);
      g.setDisplaySize(T, T);
      // OJO (16/8, FIX de carga): esto iba con rt.draw por tesela. En Phaser CADA rt.draw
      // abre y cierra un pase de render completo, así que ~1.000 teselas eran ~1.000 pases
      // y el juego se quedaba clavado en la pantalla de carga. En lote es un solo pase.
      const lote = typeof rt.beginDraw === "function";
      if (lote) rt.beginDraw();
      for (let y = 0; y < H + 2 * MY; y += T)
        for (let x = 0; x < W + 2 * MX; x += T) {
          // el pasto del bosque NO se pinta sobre lo DESPEJADO (taparía adornos y parcelas)
          const wx = RX0 + x, wy = RY0 + y;
          if (GF.despejado(Math.floor(wx / T), Math.floor(wy / T))) continue;
          g.setTexture(pastos[(x * 7 + y * 13) % pastos.length]);
          if (lote) rt.batchDraw(g, x, y); else rt.draw(g, x, y);
        }
      if (lote) rt.endDraw();
      g.destroy();
    }
    // los árboles: se ordenan por dónde APOYAN, para que los de adelante tapen a los de atrás
    const paso = Math.max(8, T * (GF.BOSQUE_PASO || 0.6));
    const pasoY = Math.max(8, paso * (GF.BOSQUE_FILAS || 0.74));
    // DESORDEN separado por eje (17/8). El horizontal es el que abre rendijas entre troncos
    // —el tronco mide 25 px y con ±8 px dos vecinos podían quedar a 41 px— y por ahí asomaba
    // la fila de atrás. El vertical puede seguir alto sin romper nada, así que van por separado.
    const JX = GF.BOSQUE_JITTER_X != null ? GF.BOSQUE_JITTER_X : (GF.BOSQUE_JITTER || 8);
    const JY = GF.BOSQUE_JITTER_Y != null ? GF.BOSQUE_JITTER_Y : (GF.BOSQUE_JITTER || 8);
    // TRABA (17/8, dirección: "con dos a los costados del que está más adelantado ya cubrís").
    // Las filas alternas se corren media columna, así el árbol de atrás cae en el HUECO de los
    // dos de adelante en vez de justo detrás de uno. Cubrir a lo ancho en vez de apilar en fondo.
    const TRABA = GF.BOSQUE_TRABA != null ? GF.BOSQUE_TRABA : 0.5;
    let semilla = 20250816;                       // azar estable: el bosque es el MISMO cada partida
    const az = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
    /* 18/8 — LA MÉTRICA ELÍPTICA DEL CLARO SE FUE.
       Eran ~25 líneas (RX, RY, met, borde, AMP, ONDA, BASE, redondez) que calculaban una forma
       convexa alrededor de un centro. El claro dejó de ser eso: ahora la forma la decide el
       terreno que poseés, celda a celda, y esas líneas no las llamaba ya nadie. Se van porque
       eran una trampa: el próximo que quisiera "ajustar el aire entre la cerca y los árboles"
       habría tocado GF.BOSQUE_AIRE, que está muerta. El que manda es GF.AIRE_BOSQUE, en celdas.
       Queda solo lo que sigue vivo: el TAMAÑO del árbol, que se pide en CELDAS y se deriva del
       sprite para que el bosque no vuelva a tener árboles más grandes que los de la granja. */
    const tw = this.textures.get("tree").getSourceImage();
    const anchoT = (tw && tw.width) || T, altoT = (tw && tw.height) || T * 2;
    const escBase = (GF.BOSQUE_TAM || 2) * T / anchoT;
    const VAR = GF.BOSQUE_ESC_VAR != null ? GF.BOSQUE_ESC_VAR : 0.15;
    const eMin = escBase * (1 - VAR), eMax = escBase * (1 + VAR);
    const altoS = altoT * escBase;   // alto DIBUJADO: manda para decidir en qué celda apoya
    // ================= LAS TRES LEYES DE COLOCACIÓN (17/8, dirección) =================
    // Antes el bosque se generaba con cinco números a ojo: PASO, FILAS, TRABA, JITTER_X y
    // JITTER_Y. Nadie podía decir por qué valían lo que valían. Dirección lo reformuló como
    // reglas que se pueden DIBUJAR, y se compusieron a mano en tools/editor-bosque.html:
    //
    //   "c" CELDA         centrado en la celda, apoyado en su borde de abajo
    //                     x = (col + 0,5) x T        base = (fila + 1) x T
    //   "x" ENCRUCIJADA   en el cruce de cuatro celdas (un vértice de la cuadrícula)
    //                     x = col x T                base = fila x T
    //   "v" MEDIA ARISTA  a la mitad de la arista VERTICAL: sobre la línea, a media altura
    //                     x = col x T                base = (fila + 0,5) x T
    //
    // Combinadas, los anclajes caen en una rejilla de MEDIA CELDA (21 px) sin salirse nunca de
    // la cuadrícula del juego. Cada ley cubre los huecos que dejan las otras: eso es lo que
    // buscábamos con la traba y el jitter, pero ahora es exacto y no hay nada que adivinar.
    // Qué leyes se usan sale de GF.BOSQUE_LEYES (por ejemplo "cxv", "xv", "c").
    const LEYES = String(GF.BOSQUE_LEYES || "cxv");
    const ANCLA = {
      c: (col, row) => [(col + 0.5) * T, (row + 1) * T],
      x: (col, row) => [col * T, row * T],
      v: (col, row) => [col * T, (row + 0.5) * T]
    };
    // CADA CUÁNTAS FILAS se planta. Las leyes ponen un ancla en TODAS las filas, y con el árbol
    // midiendo 88 px de alto y las filas a 42, el de atrás asoma siempre por los huecos entre
    // troncos: la masa sale al 100% de tronco, una pared. Saltando filas se recupera el aire.
    const CADA = Math.max(1, GF.BOSQUE_FILA_CADA || 1);
    const DENS = GF.BOSQUE_DENSIDAD || { c: 1, x: 0.69, v: 0.84 };
    const FRENTE = GF.BOSQUE_FRENTE_SOLIDO != null ? GF.BOSQUE_FRENTE_SOLIDO : 1.5;
    const JFONDO = GF.BOSQUE_JITTER_FONDO || 0;   // desorden SOLO en el interior del bosque
    const cIni = Math.floor(RX0 / T) - 1, cFin = Math.ceil((GF.ORIG_X + W + MX) / T) + 1;
    const rIni = Math.floor(RY0 / T) - 1, rFin = Math.ceil((GF.ORIG_Y + H + MY) / T) + 1;
    const lista = [];
    for (let row = rIni; row <= rFin; row++) {
      if (((row % CADA) + CADA) % CADA !== 0) continue;
      for (let col = cIni; col <= cFin; col++)
        for (const ley of LEYES) {
          const f = ANCLA[ley];
          if (!f) continue;
          const a = f(col, row);
          // jitter opcional: con las leyes puestas suele ir en 0, pero se deja por si se
          // quiere ensuciar un poco el patrón sin cambiar de sistema.
          const esc = eMin + az() * (eMax - eMin);
          const flip = az() < 0.45;
          const rx = az(), ry = az(), rd = az();   // se sacan SIEMPRE, para que el azar no baile
          // Primero hay que saber si el anclaje cae en el frente o en el fondo, porque de eso
          // depende cuánto desorden se le permite. Se mide sobre el anclaje SIN mover.
          /* 18/8 — EL CLARO YA NO ES UNA ELIPSE, ES EL TERRENO QUE TENÉS.
             La métrica de antes (met/borde con redondez y oleaje) solo sabe describir una forma
             convexa alrededor de un centro. Con las expansiones el claro puede tener entrantes y
             esquinas hacia dentro, y ninguna elipse los describe. Ahora se pregunta por la CELDA:
             si está despejada no va árbol, y si no, sí. La forma sale sola, y el aire de 2,3
             celdas entre la cerca y el primer tronco lo garantiza el propio conjunto DESPEJADAS.
             "Estar en el frente" pasa a ser "tener el claro a menos de FRENTE celdas", medido
             sobre la misma cuadrícula. */
          const cA = Math.floor(a[0] / T), rA = Math.floor((a[1] - altoS * 0.28) / T);
          if (GF.despejado(cA, rA)) continue;                   // está en el claro
          let enFrente0 = false;
          const FR = Math.ceil(FRENTE);
          for (let dc = -FR; dc <= FR && !enFrente0; dc++)
            for (let dr = -FR; dr <= FR && !enFrente0; dr++)
              if (GF.despejado(cA + dc, rA + dr)) enFrente0 = true;
          const jx = enFrente0 ? JX : Math.max(JX, JFONDO);
          const jy = enFrente0 ? JY : Math.max(JY, JFONDO);
          const cxA = a[0] + Math.round((rx * 2 - 1) * jx);
          const baseA = a[1] + Math.round((ry * 2 - 1) * jy);
          const px = cxA - anchoT * esc / 2, py = baseA - altoT * esc;   // esquina del sprite
          if (GF.despejado(Math.floor(cxA / T), Math.floor((baseA - altoS * 0.28) / T))) continue;   // quedó dentro del claro al moverse
          // RALEO POR LEY, PERO SOLO HACIA ADENTRO (17/8).
          // Dirección compuso el bosque a mano y exportó 260/260 anclajes de CELDA (100%),
          // 187/270 de ENCRUCIJADA (69%) y 228/270 de MEDIA ARISTA (84%). Al mirar el export
          // fila por fila apareció lo importante: en las DOS BANDAS PEGADAS AL CLARO puso
          // TODOS los árboles (26 de 26 y 27 de 27). Los claros los abrió ATRÁS.
          // Aplicar el raleo parejo agujereaba justo la primera línea —la única que se ve
          // entera— y por eso el bosque del juego tenía el doble de hueco que el compuesto
          // (proporción de madera 0,33 contra 0,55, medida sobre las dos capturas).
          // Así que el frente va macizo y el raleo empieza a partir de FRENTE_SOLIDO celdas.
          const enFrente = enFrente0;
          // En el FRENTE, además, se calla la ley de ENCRUCIJADA. Motivo: comparte base con la
          // de celda (las dos apoyan en fila x 42), así que juntas dejan un árbol cada 21 px y
          // la línea cierra del todo. En el export de dirección la primera banda tiene SOLO
          // árboles de celda, cada 42 px: por eso su frente tiene hueco entre tronco y tronco
          // (proporción de madera 0,55) en vez de ser un muro corrido.
          if (enFrente && ley === "x") continue;
          if (!enFrente && rd > (DENS[ley] != null ? DENS[ley] : 1)) continue;
          lista.push([py, px, esc, flip]);
        }
    }
    // ORDEN DE DIBUJO (17/8, dirección: "hay árboles que deben estar por detrás de los que
    // están más cerca del corral, por proximidad"). Se ordenaba por py, que es el BORDE DE
    // ARRIBA del sprite. Pero cada árbol tiene SU escala (0,92 a 1,26), así que dos árboles
    // que arrancan a la misma altura apoyan hasta 37 px distinto: DOS FILAS enteras, porque
    // la fila mide 19 px. Resultado: un árbol grande del fondo se dibujaba antes que uno chico
    // de adelante, y su tronco asomaba por delante del que estaba más cerca del corral.
    // La profundidad la manda dónde APOYA el árbol (py + alto x escala), igual que el resto
    // del juego ordena por baseRow y no por el techo del sprite.
    lista.sort((a, b) => (a[0] + altoT * a[2]) - (b[0] + altoT * b[2]));
    const t = this.add.image(0, 0, "tree").setOrigin(0, 0).setVisible(false);
    const usarLote = typeof rt.beginDraw === "function";   // Phaser 3.50+: dibujar en lote es mucho más rápido
    if (usarLote) rt.beginDraw();
    // COPA y TRONCO se dibujan POR SEPARADO, cada uno con su tratamiento (16/8, dirección):
    //  · COPA: un tinte verde CONSTANTE apenas te alejás de la primera fila. Como el contorno
    //    de la copa ya es oscuro, al quedar todas del mismo verde los bordes se funden entre
    //    sí y el interior se lee como UNA MASA, no como muchos arbolitos pegados. Sin
    //    degradado: la masa es pareja.
    //  · TRONCO: acá SÍ va el degradado, y es corto a propósito — un tronco una fila más
    //    atrás ya está a media sombra, y dos filas atrás en penumbra. Eso es lo que da la
    //    sensación de fondo detrás de la primera línea de árboles.
    // Se logra con dos dibujos por árbol usando setCrop, sin arte nuevo.
    // 16/8 (dirección, final): HORNEADO LIMPIO — el árbol se dibuja tal cual es, sin tocarle
    // el color. Probamos teñir las copas para fundir los contornos y oscurecer los troncos del
    // fondo; ninguna de las dos convenció, así que el bosque es el sprite de siempre repetido
    // con variación de tamaño y volteo, ordenado de atrás hacia adelante.
    for (const [py, px, esc, flip] of lista) {
      t.setScale(esc); t.setFlipX(flip);
      // 18/8: las coordenadas del árbol son de MUNDO; hay que pasarlas a coordenadas del
      // renderTexture restando su esquina, que ahora cuelga del origen del terreno.
      if (usarLote) rt.batchDraw(t, px - RX0, py - RY0); else rt.draw(t, px - RX0, py - RY0);
    }
    if (usarLote) rt.endDraw();
    t.destroy();
    if (this.bosqueRT && this.bosqueRT !== rt) { try { this.bosqueRT.destroy(); } catch (e) {} }   // 18/8: al rehacerlo en caliente
    this.bosqueRT = rt;
    // BOSQUE QUE SIGUE MÁS ALLÁ DEL MAPA (17/8). El mapa es CUADRADO (1600x1600) pero las
    // pantallas son panorámicas: para ver el mapa entero hay que alejar tanto que sobran ~1.700
    // px a los lados, y ahí antes se veía el color de fondo liso. Se rellena con un MOSAICO
    // hecho con las mismas leyes, así que lo que sobra se lee como bosque que continúa y el
    // mapa cuadrado deja de tener un "afuera" visible.
    try { this.fondoBosque(anchoT, altoT, eMin, eMax); }
    catch (e) { console.warn("[bosque] sin mosaico de fondo:", e); }
    console.log("[bosque] " + lista.length + " árboles en una sola textura · " + Math.round(performance.now() - t0) + " ms");
  }

  // 16/8: al reclamar un Retoño o una Roca del baúl, el nodo aparece en la granja
  refreshNodeLocks() {
    if (!this.objs) return;
    for (const o of this.objs) {
      if (o.type !== "tree" && o.type !== "rock") continue;
      const abierto = o.type === "tree"
        ? (G.treesOpen || [0]).includes(o.lockIdx)
        : !(typeof nodoBloqueado === "function" && nodoBloqueado(o));
      if (abierto && o.oculto) {                       // recién colocado: aparece con un saltito
        o.oculto = false; o.locked = false;
        if (o.sprite) {
          o.sprite.setVisible(true);
          if (this.textures.exists(o.baseKey)) o.sprite.setTexture(o.baseKey);
          o.sprite.setAlpha(1).clearTint();
          this.setObjTex(o, o.baseKey, o.rw || o.w);
          this.popFx(o.sprite, 1);
          for (let i = 0; i < 8; i++) {                // chispitas de "acá está"
            const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 20;
            this.puffFx(o.cx + Math.cos(a) * d * 0.4, o.by - 8 + Math.sin(a) * d * 0.3, 0xd8f0a8, 1);
          }
        }
      } else if (!abierto && !o.oculto) {              // (prestigio / migración): vuelve a esconderse
        o.oculto = true; if (o.sprite) o.sprite.setVisible(false);
      }
    }
  }

  /* CÓMO SE VE EL SUELO DE UNA PARCELA — una sola función, y siempre desde la verdad (18/8).
     Antes esto estaba repartido entre la creación de la escena y refreshPlotLocks, cada una con su
     idea, y bastaba con que una corriera sin la otra para que quedara un parche de tierra colgado. */
  pintarSueloParcela(pl, bloqueada) {
    if (!pl || !pl.ground) return;
    const T = GF.TILE;
    if (bloqueada) { pl.ground.setVisible(false); return; }   // lo que no es tuyo, no se ve
    if (this.textures.exists("plot")) pl.ground.setTexture("plot").setDisplaySize(T, T);
    pl.ground.clearTint().setAlpha(1).setVisible(true);
  }

  /* 18/8: mover una parcela a otra celda, en UN solo sitio. Lo usan el arrastre en modo edición
     y el desbloqueo, que ahora puede necesitar reubicarla. */
  moverParcela(pl, col, row) {
    const T = GF.TILE;
    GF.PLOTS[pl.i].col = col; GF.PLOTS[pl.i].row = row;
    pl.cx = (col + 0.5) * T; pl.by = (row + 0.5) * T;
    if (pl.ground) pl.ground.setPosition(pl.cx, pl.by).setDepth(-998);
    if (pl.spr) pl.spr.setPosition(pl.cx, pl.by + 6).setDepth(pl.by);
    if (pl.emo) pl.emo.setPosition(pl.cx, pl.by + 8).setDepth(pl.by);
    if (pl.timer) pl.timer.setPosition(pl.cx, pl.by - T * 0.55).setDepth(pl.by + 1);
    if (pl.glowTxt) pl.glowTxt.setPosition(pl.cx + T * 0.3, pl.by - T * 0.55);
    if (!G.layoutPlots) G.layoutPlots = {};
    G.layoutPlots[pl.i] = { col, row };
    GF.ocupCambio();
  }

  refreshPlotLocks() {
    if (!this.plots) return;
    /* 18/8: si el jugador tiene MÁS parcelas que posiciones en el mapa (regalo de nivel, compra o
       expansión), acá se crean de verdad. Antes esto se recortaba en silencio y la parcela nº13 en
       adelante se cobraba sin aparecer nunca. */
    if ((G.plotsOwned || 3) > GF.PLOTS.length && this._crecerPlots) {
      const antes = GF.PLOTS.length;
      this._crecerPlots();
      for (let i = antes; i < GF.PLOTS.length; i++) {
        const nueva = this.crearParcela(i, {});
        this.plots.push(nueva);
        this.pintarSueloParcela(nueva, false);
        this.plotUnlockFx(nueva);
      }
      if (GF.PLOTS.length < (G.plotsOwned || 3)) toast("No queda sitio para más parcelas — expandí la granja");
    }
    const owned = Math.max(2, Math.min(GF.PLOTS.length, G.plotsOwned || 2));
    this.plots.forEach((pl, i) => {
      if (i < owned && pl.state === "locked") {
        /* 18/8: ahora que una parcela bloqueada NO reserva su celda, al llegarte de verdad el
           sitio de siempre puede estar ocupado (pusiste un adorno, un baúl, moviste la laguna).
           En ese caso se muda a la celda libre más cercana al resto, igual que las parcelas 13+.
           Si no hubiera ninguna —imposible en la práctica— se queda donde estaba antes que perderla. */
        /* 18/8: si el jugador eligió celda para ESTA parcela (la acaba de colocar desde el
           Cobertizo), manda la suya. Si no eligió ninguna y su sitio de fábrica está ocupado,
           se muda al hueco libre más cercano. Antes solo existía el segundo caso, así que la
           parcela recién colocada aparecía donde la rejilla decía y no donde tocaste. */
        const elegida = G.layoutPlots && G.layoutPlots[i];
        if (elegida && (GF.PLOTS[i].col !== elegida.col || GF.PLOTS[i].row !== elegida.row)) {
          this.moverParcela(pl, elegida.col, elegida.row);
        } else if (!elegida) {
          /* 18/8 — LA PARCELA SE PISABA A SÍ MISMA. Acá se preguntaba "¿está libre la celda de esta
             parcela?" con celdaLibreAdorno… y para entonces plotsOwned YA se había incrementado, así
             que el mapa de ocupación contestaba "sí, hay una parcela": ella misma. La respuesta era
             siempre "ocupado", saltaba al plan B —celdaLibreParcela(), que barre DESDE EL CENTRO— y
             la parcela aparecía en mitad de la granja. Eso es lo que reportó dirección.
             Ahora la comprobación IGNORA a la propia parcela, que es lo único que tenía sentido. */
          const oc = GF.celdaOcupada(GF.PLOTS[i].col, GF.PLOTS[i].row);
          const suyaOLibre = !oc || (oc.tipo === "parcela" && oc.i === i);
          if (!suyaOLibre) {
            const h = this.celdaLibreParcela();
            if (h) { this.moverParcela(pl, h.col, h.row);
                     toast("Tu parcela nueva no cabía en su sitio — la puse en un hueco libre"); }
          }
        }
        pl.state = "dry";
        this.pintarSueloParcela(pl, false);   // 16/8: aparece al colocarla
        this.plotUnlockFx(pl);   // se nota que se abrió
      } else if (i >= owned && pl.state !== "locked") {
        pl.state = "locked";
        this.pintarSueloParcela(pl, true);   // 16/8: si no es tuya, no se ve
      }
    });
    this.syncPlots();
  }

  // chispas y un destello sobre la parcela recién regalada
  plotUnlockFx(pl) {
    const fx = this.add.circle(pl.cx, pl.by, GF.TILE * 0.55, 0xffd75e, 0.5).setDepth(99990).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: fx, scale: 1.8, alpha: 0, duration: 620, onComplete: () => fx.destroy() });
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 26;
      const sp = this.add.rectangle(pl.cx, pl.by, 3, 3, i % 2 ? 0xfff3cf : 0xffd75e).setDepth(99991);
      this.tweens.add({ targets: sp, x: pl.cx + Math.cos(a) * r, y: pl.by + Math.sin(a) * r, alpha: 0, duration: 520 + Math.random() * 260, onComplete: () => sp.destroy() });
    }
    // DESBROCE (13/8): los yuyos y ramitas del terreno silvestre salen volando al abrirla
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 24;
      const esYuyo = i % 3 !== 2;
      const p = esYuyo
        ? this.add.ellipse(pl.cx + (Math.random() - 0.5) * 20, pl.by + (Math.random() - 0.5) * 20, 5, 3, i % 2 ? 0x3f9b3f : 0x2f7a2f, 0.95)
        : this.add.rectangle(pl.cx + (Math.random() - 0.5) * 20, pl.by + (Math.random() - 0.5) * 20, 6, 2, 0x8a5a33, 0.95);
      p.setDepth(99992).setAngle(Math.random() * 360);
      this.tweens.add({ targets: p, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r - 14, angle: p.angle + 200, alpha: 0, duration: 480 + Math.random() * 240, ease: "Quad.easeOut", onComplete: () => p.destroy() });
    }
  }

  // el cultivo listo que nadie cosechó se marchita (se pierde)
  setWithered(pl) {
    pl.state = "withered"; pl.witherAt = 0; pl.readyAt = 0;
    this.setPlotGlow(pl, "off");
    if (this.textures.exists("withered")) {   // sprite cozy del cultivo marchito
      pl.spr.setTexture("withered").clearTint().setAlpha(1).setVisible(true);
      pl.spr.setScale((GF.TILE * 0.59) / pl.spr.width);   // ~24px visibles
      pl.emo.setVisible(false);
    } else if (pl.spr.visible) { pl.spr.setTint(0x7a6f52).setAlpha(0.75); }
    else { pl.emo.setText("").setVisible(true); }
    pl.timer.setVisible(false);
  }

  // (14/8: el "empujoncito" fue reemplazado por las MARIPOSAS GUÍA — señalización viva)

  update(time, deltaMs) {
    if (this.leaving || !this.hero) return;   // cambiando de escena: no tocar nada más
    this._frameT = time;   // marca del frame: la usa la caché de hitsSprite (10/8)
    const dt = deltaMs / 1000, k = this.keys, hero = this.hero;
    this.drawOlas(dt);   // olas de la isla
    this.seguirAura();
    this.seguirSkins();

    // restaurar objetos que salieron de cooldown
    const t = nowMs();
    for (const o of this.objs) {
      /* 18/8 (reporte del diseñador: "crecen antes de la hora... tenés que cambiar la manera en la
         que los sprites van rotando, tiene que depender sí o sí del tiempo de enfriamiento").
         Tenía toda la razón. Antes el sprite cambiaba POR EVENTO: al cruzar la mitad del
         enfriamiento se ponía el retoño, al llegar al final el árbol entero. Un evento solo ocurre
         si la escena está viva en ese instante — y si se reconstruye (volver de la Zona Negra, un
         F5) el sprite NACE con la textura del nodo entero y ya no hay ningún umbral que cruzar.
         Resultado: árboles y rocas enteros, y sin poder usarse, hasta que venciera el reloj.
         Salió a la luz al guardar los enfriamientos: antes se reiniciaban y siempre estaban enteros.
         Ahora la textura es una FUNCIÓN de cuánto le falta (texNodo), se aplica también al construir
         la escena, y el tick solo la refresca si cambió. Los efectos se disparan con el cambio de
         textura, no con el paso del tiempo, así que siguen viéndose una sola vez. */
      if (o.readyAt && t >= o.readyAt) {
        o.readyAt = 0; o.halfAt = 0; this.syncNodos();
        if (this.aplicarTexNodo(o, t)) {
          this.popFx(o.sprite, 1);   // TERMINÓ DE CRECER: saltito con resorte + polvillo
          this.puffFx(o.cx, o.by - 3, o.type === "tree" ? 0x97c459 : 0xb4b2a9, o.type === "tree" ? 8 : 6);
        }
        if (o.timer) o.timer.setVisible(false);
      } else if (o.readyAt && this.aplicarTexNodo(o, t)) {
        this.popFx(o.sprite, POP_INTERMEDIO);   // el retoño asoma con un saltito, más chico
      } else if (o.readyAt && o.timer) {
        // cuarta.docx: el timer del recurso solo aparece con el cursor encima (al clickear ya sale el aviso)
        const p = this.input.activePointer;
        const over = this.timerOn(o);
        if (over) o.timer.setText(fmtCorto((o.readyAt - t) / 1000)).setPosition(o.cx, this.topY(o, (o.type === "ore" || o.type === "rock") ? -6 : 7)).setVisible(true);   // detalles213: el timer del mineral pegado al nodo (antes flotaba alto y se mezclaba)
        else o.timer.setVisible(false);
      }
      // 13/8 (audio): el letrero de materiales de la OBRA solo con el cursor encima —
      // siempre visible ensuciaba la granja (misma regla que los timers de los nodos)
      if (o.letrero) o.letrero.setVisible(this.timerOn(o));
    }
    // CLIC GUARDADO: tocaste otra vez mientras el golpe anterior todavía tenía el candado puesto.
    // Apenas se libera, sale. Así tocando rápido no se pierde ni un golpe (que es como se tala en
    // Sunflower Land: a clics, no manteniendo).
    if (this.buffer && !this.action) {
      const b = this.buffer; this.buffer = null;
      const listo = b.o.type === "plot" ? b.o.state !== "locked" : (!b.o.locked && t >= (b.o.readyAt || 0));
      if (t - b.t < CLIC_BUFFER_MS && listo) this.interactWith(b.o);
    }

    // UN CLIC = UN GOLPE, siempre. No hay "mantener apretado para seguir golpeando": eso sería una
    // mecánica que el diseñador no pidió. Lo único que se hace acá es no obligar a SOLTAR: pasados
    // unos milisegundos sin arrastrar ya está claro que es un clic y no un paneo, así que el golpe
    // sale. Sale UNA sola vez por pulsación; para el siguiente golpe hay que volver a clickear.
    if (GF.NO_WALK && !this.action && this.hold && !this.hold.active && !this.hold.disparo && !GF.uiOpen
        && (this.clickHit || this.clickPond) && t - (this.hold.t0 || t) > CLIC_SUELTO_MS) {
      const hit = this.clickHit, pond = this.clickPond;
      this.clickHit = null; this.clickPond = false;
      this.hold.disparo = true;   // ya actuó: al soltar no se dispara de nuevo
      if (hit) this.interactWith(hit);
      else if (pond) this.tryFish(this.input.activePointer.worldX, this.input.activePointer.worldY);
    }
    this.tickGolpes();      // los golpes sueltos se pierden a los 5 s (el nodo vuelve a estar entero)
    this.tickViento();      // los árboles crecidos y los cultivos listos se mecen con el viento
    this.tickAnimales(dt, t);   // los animales del corral pastan y caminan
    this.tickMascota(dt, t);    // la mascota pasea por la granja
    this.tickNubes(dt);     // nubes cruzando con su sombra
    this.tickMariposas(dt, t);
    this.tickBuzon(t);
    this.tickAmbiente(dt, t);
    this.tickVapor(t);      // vapor de la Cocina y chispas del Altar mejorado
    this.updateHoverFx();   // brillo sobre lo interactuable (hover + cercanía)
    // clic sostenido: aplicar el destino que quedó pendiente por el freno del recálculo
    if (this.hold && this.hold.active && this.holdPend && t - (this.holdAt || 0) > 130) {
      const hp = this.holdPend; this.holdPend = null; this.holdSeek(hp.x, hp.y);
    }
    if (!this.moveTarget && this.destMk && this.destMk.visible) this.hideDest();   // llegó: fuera el marcador

    // timer del dummy: cuánto falta para poder entrenar otra vez (detalles 338)
    if (!this.dummyObj) this.dummyObj = this.objs.find(o => o.type === "dummy") || null;
    if (this.dummyObj) {
      const left = (G.dummyUsedAt || 0) + DUMMY_CD_MS - t;
      if (!this.dummyTimer) this.dummyTimer = this.add.text(this.dummyObj.cx, this.dummyObj.by - T * 1.15, "",
        { fontFamily: "system-ui", fontSize: "11px", fontStyle: "bold", color: "#fff", stroke: "#20301a", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(this.dummyObj.by + 3);
      this.dummyTimer.setPosition(this.dummyObj.cx, this.topY(this.dummyObj));
      if (this.timerOn(this.dummyObj)) this.dummyTimer.setText(left > 0 ? fmtDur(left) : "Listo").setVisible(true);
      else this.dummyTimer.setVisible(false);
      // dummy desgastado mientras descansa: cortes y paja afuera; al estar listo vuelve el sano
      const broken = left > 0;
      if (broken !== this.dummyBroken && this.textures.exists("dummy_broken")) {
        this.dummyBroken = broken;
        const s = this.dummyObj.sprite;
        s.setTexture(broken ? "dummy_broken" : this.dummyObj.baseKey);
        s.setScale(this.dummyObj.rw / s.width);   // reajustar por si el lienzo difiere
      }
    }
    if (G.forgeLitUntil && t >= G.forgeLitUntil) { G.forgeLitUntil = 0; this.updateForge(); }   // se apaga sola al terminar

    // lotes: pasar de "creciendo" a "listo"
    for (const pl of this.plots) {
      // 2/8: MARCHITADO DESACTIVADO (pedido del diseñador) — el cultivo listo ya no se pudre
      if (pl.state === "ready" && pl.witherAt) { pl.witherAt = 0; this.syncPlots(); }
      this.barraCultivo(pl, t);   // barrita + tiempo restante, SIEMPRE visible mientras crece (como SFL)
      if (pl.state !== "growing") continue;
      if (t >= pl.readyAt) { pl.state = "ready"; pl.readyAt = 0; pl.witherAt = 0; this.showReadyCrop(pl, true); this.syncPlots(); this.barraCultivo(pl, t); }   // 2/8: sin marchitado — la cosecha espera (con pop de crecimiento)
      else {
        // a media cosecha: la planta intermedia (se asoma la verdura) o el brote más grande
        if (!pl.half && pl.growTotal && (pl.readyAt - t) <= pl.growTotal / 2) {
          pl.half = true;
          const mk = "cropm_" + pl.cropKey;
          if (pl.cropKey && this.textures.exists(mk)) pl.spr.setTexture(mk);
          pl.spr.setScale((GF.TILE * 0.96) / pl.spr.width);   // ~25px visibles
          this.setPlotGlow(pl, "half");
          this.popFx(pl.spr, POP_INTERMEDIO);   // se estiró: saltito chico (el brillo de "half" es de alpha, no pelea)
        }
      }
    }
    // peces de la laguna: nadan de un punto a otro
    if (this.pondFish) for (const f of this.pondFish) {
      const dx = f.tgt.x - f.s.x, dy = f.tgt.y - f.s.y, d = Math.hypot(dx, dy);
      if (d < 3) { f.tgt = this.pondPoint(); f.sp = 10 + Math.random() * 12; }
      else { const sp = Math.min(f.sp * dt, d); f.s.x += dx / d * sp; f.s.y += dy / d * sp; if (f.s.setFlipX) f.s.setFlipX(dx > 0); else f.s.setScale(dx < 0 ? -1 : 1, 1); }   // el arte mira a la izquierda
    }
    // amenazas (jabalíes)
    // JABALÍ DESACTIVADO (2/8, pedido del diseñador). Para reactivarlo, descomentar:
    // if (t >= this.nextThreatAt && this.threats.length === 0) { this.nextThreatAt = t + 60000; this.spawnThreat(); }
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const b = this.threats[i];
      const dx = b.tgt.cx - b.cx, dy = b.tgt.by - b.by, d = Math.hypot(dx, dy);
      if (d > 2) {
        const sp = Math.min(70 * dt, d); b.cx += dx / d * sp; b.by += dy / d * sp;
        if (this.anims.exists("boar_walk") && b.sprite.anims.currentAnim?.key !== "boar_walk") b.sprite.play("boar_walk");
      } else if (this.anims.exists("boar_atk") && b.sprite.anims.currentAnim?.key !== "boar_atk") {
        b.sprite.play("boar_atk");   // llegó al cultivo: embiste y hociquea hasta arruinarlo
      }
      b.sprite.setPosition(b.cx, b.by).setDepth(b.by).setScale((dx < 0 ? -1 : 1) * b.baseScale, b.baseScale);
      if (t >= b.damageAt) {
        if (b.tgt.state === "growing" || b.tgt.state === "ready") { b.tgt.state = "dry"; b.tgt.cropKey = null; b.tgt.readyAt = 0; this.setPlotGlow(b.tgt, "off"); b.tgt.spr.setVisible(false); b.tgt.emo.setVisible(false); b.tgt.timer.setVisible(false); this.syncPlots(); log("Un jabalí arruinó un cultivo.", "bad"); toast("Cultivo arruinado"); }
        b.sprite.destroy(); this.threats.splice(i, 1);
      }
    }

    // acción en curso: bloquea movimiento
    if (this.action) {
      // la pesca se interrumpe si el jugador intenta moverse (teclas)
      if (this.action.kind === "fish" && !GF.NO_WALK && (k.left.isDown || k.right.isDown || k.up.isDown || k.down.isDown || k.aleft.isDown || k.aright.isDown || k.aup.isDown || k.adown.isDown)) {
        this.cancelFishing();
      }
      if (!this.action) { hero.setDepth(hero.y); this.updatePrompt(); return; }
      this.action.t += dt;
      // al picar/talar: a mitad de la acción el nodo pasa al estado dañado (entero → dañado → restos)
      const ao = this.action.o;
      // MOMENTO DEL IMPACTO: con ACT_IMPACTO = 0 el nodo se agrieta en el mismo frame del clic.
      // OJO: el estado dañado depende del GOLPE que se está dando, no del avance de la animación.
      // Si no, en el primer clic el nodo saltaba a "casi roto" y después retrocedía.
      const tImpacto = this.action.dur * Math.max(0, Math.min(1, ACT_IMPACTO));
      if (!this.action.golpeYa && ao && (ao.type === "tree" || ao.type === "rock" || ao.type === "ore") && this.action.t >= tImpacto) {
        this.action.golpeYa = true;
        this.destelloFx(ao);
        this.golpeFx(ao, this.action.kind);
      }
      if (!this.action.halfDone && ao && (ao.type === "rock" || ao.type === "ore") && this.action.t >= tImpacto) {
        this.action.halfDone = true;
        if ((ao.golpes || 0) + 1 >= GOLPES_MINAR - 1 && this.textures.exists(ao.baseKey + "_half")) this.setObjTex(ao, ao.baseKey + "_half", ao.rw || ao.w);
      }
      // talar: el árbol pasa por dos cortes intermedios (tajo leve → tajo profundo con hojas caídas)
      if (ao && ao.type === "tree" && !this.action.cutDone && this.action.t >= tImpacto) {
        this.action.cutDone = true;
        const g = (ao.golpes || 0) + 1;   // golpe que se está por completar
        const tex = g === 1 ? "tree_cut1" : (g < GOLPES_TALAR ? "tree_cut2" : null);
        if (tex && this.textures.exists(tex)) this.setObjTex(ao, tex, ao.rw || ao.w);
      }
      if (this.action.t >= this.action.dur) this.finishAction();
      const sign = this.facing === "west" ? -1 : 1;
      if (this.action) {
        hero.setScale(sign * this.actScale, this.actScale);
        if (this.action.kind === "fish" && this.anims.exists("fish_cast")) {
          // pesca en 3 fases con el tirón de caña: lanzar (revertido) → esperar (caña adelante) → picar (tirón)
          const a = this.action, cur = hero.anims.currentAnim?.key;
          if (!a.phase) { a.phase = "cast"; hero.play("fish_cast"); }
          else if (a.phase === "cast" && (cur !== "fish_cast" || !hero.anims.isPlaying)) { a.phase = "wait"; hero.anims.stop(); hero.setTexture("hero_fish_3"); }
          else if (a.phase === "wait" && a.t >= a.dur - 0.55) { a.phase = "yank"; this.clearFishLine(); hero.play("fish_yank"); this.catchFx(); }
          if (a.phase === "wait") this.drawFishLine(sign); else if (a.phase !== "yank") this.clearFishLine();
          this.drawFishBar(a);   // barra de enfriamiento de la pesca
        } else {
          const key = "act_" + this.action.kind;
          if (hero.anims.currentAnim?.key !== key) hero.play(key);
        }
      }
      hero.setDepth(hero.y);
      this.updatePrompt();
      return;
    }

    // movimiento
    let vx = 0, vy = 0;
    if (GF.NO_WALK || GF.uiOpen || GF.editMode) { this.moveTarget = null; this.path = null; this.pendingObj = null; if (!GF.NO_WALK) this.clearQueue(); }
    else {
      if (!GF.NO_WALK) {   // sin granjero en la granja, WASD/flechas no mueven nada
        if (k.left.isDown || k.aleft.isDown) vx = -1; else if (k.right.isDown || k.aright.isDown) vx = 1;
        if (k.up.isDown || k.aup.isDown) vy = -1; else if (k.down.isDown || k.adown.isDown) vy = 1;
      }
      if (vx || vy) { this.moveTarget = null; this.path = null; this.pendingObj = null; }   // el teclado manda: cancela la ruta
      else if (this.moveTarget) {
        const dx = this.moveTarget.x - hero.x, dy = this.moveTarget.y - hero.y, d = Math.hypot(dx, dy);
        if (d < 5) {   // waypoint alcanzado: seguir con el próximo tramo de la ruta
          this.moveTarget = (this.path && this.path.length) ? this.path.shift() : null;
          if (this.moveTarget) { const dx2 = this.moveTarget.x - hero.x, dy2 = this.moveTarget.y - hero.y, d2 = Math.hypot(dx2, dy2) || 1; vx = dx2 / d2; vy = dy2 / d2; }
        } else { vx = dx / d; vy = dy / d; }
      }
    }
    const moving = !!(vx || vy);
    if (moving) {
      const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      const step = GF.SPEED * speedMult() * dt, nx = hero.x + vx * step, ny = hero.y + vy * step;
      let moved = false;
      if (!GF.blockedAt(nx, ny, 6)) { hero.x = nx; hero.y = ny; moved = true; }
      else { if (vx && !GF.blockedAt(nx, hero.y, 6)) { hero.x = nx; moved = true; } if (vy && !GF.blockedAt(hero.x, ny, 6)) { hero.y = ny; moved = true; } }
      // esquiva suave (teclado o roce contra una pared): probá ángulos a los lados del rumbo
      if (!moved) {
        const base = Math.atan2(vy, vx);
        for (const off of [0.5, -0.5, 1.0, -1.0, 1.571, -1.571, 2.1, -2.1]) {   // hasta perpendicular y algo hacia atrás: bordea la pared
          const a = base + off, sx = hero.x + Math.cos(a) * step, sy = hero.y + Math.sin(a) * step;
          if (!GF.blockedAt(sx, sy, 6)) { hero.x = sx; hero.y = sy; moved = true; break; }
        }
      }
      // sin acercarse al destino en ~2s: cortar (no hay forma de llegar más cerca)
      if (this.moveTarget) {
        const dst = (this.path && this.path.length) ? this.path[this.path.length - 1] : this.moveTarget;
        const dd = Math.hypot(dst.x - hero.x, dst.y - hero.y);
        if (this.lastDD == null || dd < this.lastDD - 1) { this.lastDD = dd; this.noProg = 0; }
        else if ((this.noProg = (this.noProg || 0) + 1) > 120) { this.moveTarget = null; this.path = null; this.pendingObj = null; this.noProg = 0; this.lastDD = null; }
      } else { this.lastDD = null; this.noProg = 0; }
      // seguía una ruta y quedó trabado (un jabalí, un cofre nuevo…): recalcular la ruta
      if (moved) this.pathStuck = 0;
      else if (this.moveTarget) {
        this.pathStuck = (this.pathStuck || 0) + 1;
        const dest = (this.path && this.path.length) ? this.path[this.path.length - 1] : this.moveTarget;
        this.navOf().invalidate();   // la rejilla puede haber cambiado
        if (this.pathStuck > 2 || !this.goTo(dest.x, dest.y)) { this.moveTarget = null; this.path = null; this.pendingObj = null; this.pathStuck = 0; }
      }
      if (vx < 0) this.facing = "west"; else if (vx > 0) this.facing = "east";
    }

    // clic-para-interactuar: al llegar cerca del objeto pedido, actuar
    if (this.pendingObj) {
      const po = this.pendingObj;
      const rad = (po.type === "barn" || po.type === "market" || po.type === "store" || po.type === "cocina" || po.type === "horno") ? 72 : (po.type === "plot" ? 26 : 58);   // al caminar hacia un plot, llegar bien encima antes de actuar
      const d = Math.hypot(po.cx - hero.x, po.by - hero.y);
      if (d < rad) { this.moveTarget = null; this.pendingObj = null; this.interactWith(po); if (this.action) { hero.setDepth(hero.y); return; } }
      else if (!this.moveTarget) this.pendingObj = null;
    }
    // cola: solo en el modo viejo con granjero que camina (en la granja de un clic no existe)
    if (!GF.NO_WALK && !this.action && !this.pendingObj && !this.moveTarget && this.queue.length) {
      const nxt = this.queue.shift();
      this.unmarkQueued(nxt);   // deja de estar en cola: fuera el punto
      this.pendingObj = nxt; this.goTo(nxt.cx, nxt.by + 18);
    }

    const sign = this.facing === "west" ? -1 : 1;
    hero.setScale(sign * this.idleScale, this.idleScale);
    if (moving) { if (hero.anims.currentAnim?.key !== "walk") hero.play("walk"); }
    else {
      const cur = hero.anims.currentAnim?.key;
      // dejar terminar el espadazo del dummy (una pasada) antes de volver a quieto
      if (cur !== "idle" && !(cur === "act_sword" && hero.anims.isPlaying)) hero.play("idle");
    }
    hero.setDepth(hero.y);

    this.updatePrompt();
  }

  updatePrompt() {
    /* 18/8: EL RECTÁNGULO DE COLOCAR SE APAGA SOLO. Se mostraba desde el movimiento del ratón y se
       ocultaba en un puñado de sitios (soltar, cancelar, salir de edición); bastaba con que un
       camino nuevo no pasara por ninguno para que quedara pegado en el suelo — un rectángulo rojo
       de 2x1 sobre el pasto, que es justo lo que se ve en la captura de dirección. En vez de
       añadir un sexto sitio donde ocultarlo, se DERIVA: si no llevás nada en la mano ni estás
       arrastrando, no hay marcador. Esto corre cada frame, así que no hay camino que se escape. */
    if (this.editHl && this.editHl.visible &&
        !this.placing && !this.dragDeco && !this.dragObj && !this.dragPlot && !this.dragPond) {
      this.editHl.setVisible(false);
      if (this.ocupG) this.ocupG.setVisible(false);
    }
    const el = $("prompt"); if (!el) return;
    /* 18/8 (reporte: "no pude ponerlo una celda más arriba porque me marca rojo, creo que aún
       quedan celdas bloqueadas fantasma"). No eran fantasma —era la franja que la cerca se reserva
       arriba— pero el jugador NO TENÍA CÓMO SABERLO: en modo edición el cartel se apagaba entero,
       así que veías rojo y ninguna explicación. Mientras llevás algo en la mano, el cartel dice si
       cabe o POR QUÉ no. Un rectángulo rojo mudo es un bug de información. */
    if (this.placing) {
      const pt = this.input.activePointer;
      const col = Math.floor(pt.worldX / GF.TILE), row = Math.floor(pt.worldY / GF.TILE);
      const hu = this.huellaColocar(col, row);
      el.textContent = hu.libre
        ? ("Clic para colocar acá" + (hu.ancho > 1 ? " (ocupa " + hu.ancho + " celdas)" : ""))
        : (hu.motivo || "Acá no entra");
      el.classList.add("show");
      return;
    }
    if (GF.uiOpen || this.action || GF.editMode) { el.classList.remove("show"); return; }
    if (GF.NO_WALK) {   // granja de un clic: el cartel describe lo que hay BAJO EL CURSOR
      const pt = this.input.activePointer, wx = pt.worldX, wy = pt.worldY;
      let hit = null, bd = 1e9;
      for (const q of this.objs) { if (this.hitsSprite(q.sprite, wx, wy)) { const d = Math.hypot(q.cx - wx, q.by - wy); if (d < bd) { bd = d; hit = q; } } }
      if (!hit) for (const pl of this.plots) { if (Math.abs(wx - pl.cx) < GF.TILE / 2 && Math.abs(wy - pl.by) < GF.TILE / 2) { hit = pl; break; } }
      if (!hit) { const an = this.animalEnPunto(wx, wy); if (an) hit = { type: "animal", k: an.k }; }
      if (!hit && this.portal && Math.abs(wx - this.portal.cx) < 26 && Math.abs(wy - (this.portal.by - 14)) < 30) hit = this.portal;
      // y por si algo más devolviera texto vacío alguna vez: sin texto, no hay cartel
      const txt = hit ? this.promptText(hit) : "";
      if (txt) { el.textContent = txt; el.classList.add("show"); }
      else if (!hit && this.pondDist(wx, wy) < 1.05) { el.textContent = "Pescar (1 lombriz · tenés " + fmt(G.res.lombriz || 0) + ")"; el.classList.add("show"); }
      else el.classList.remove("show");
      return;
    }
    const o = this.nearestInteract();
    const t2 = o ? this.promptText(o) : "";
    if (t2) { el.textContent = t2 + "  ·  [E]"; el.classList.add("show"); }
    else if (!o && this.nearPond()) { el.textContent = "Pescar (1 lombriz · tenés " + fmt(G.res.lombriz || 0) + ") · [E]"; el.classList.add("show"); }
    else el.classList.remove("show");
  }
}
