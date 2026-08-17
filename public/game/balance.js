/* Golden Farm · Panel de balanceo (31/7)
   Módulo compartido entre el JUEGO y balance.html:
   - Define el ESQUEMA de variables editables (categorías + etiquetas + UNIDAD en español),
     leyendo los objetos reales del juego (siempre sincronizado con el código).
   - Guarda/carga los ajustes ("overrides") en Supabase (tabla `balance`, fila id=1).
   - El juego los aplica al arrancar (main.js espera BAL_READY antes de crear Phaser). */

var BAL = (function () {
  const URL = "https://eusxpsmqczmczgyhndtd.supabase.co";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3hwc21xY3ptY3pneWhuZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzU2OTMsImV4cCI6MjEwMDc1MTY5M30.ko-XxFFjf_YnBsnBvrSCOsMLTQ285G51r-UPLYZIDJ8";
  const HDRS = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };

  const RES_NAME = k => (typeof RES_LABEL !== "undefined" && RES_LABEL[k]) || (typeof CROP_DEF !== "undefined" && CROP_DEF[k] && CROP_DEF[k].label) || k;
  // unidades típicas (texto que se muestra al lado del recuadro)
  const U = {
    plata: "plata · entero", horas: "horas · decimal (0.5 = 30 min)", seg: "segundos · entero",
    cant: "unidades · entero", xp: "XP · entero", vida: "puntos de vida · entero",
    danio: "puntos de daño · entero", usos: "usos (durabilidad) · entero", nivel: "nivel · entero",
    factor: "factor · decimal", vel: "velocidad (px/seg) · entero",
  };

  /* ---- esquema: cada entrada = { id, cat, label, uni, get, set, paso } ---- */
  function schema() {
    const E = [];
    const add = (cat, id, label, uni, get, set, paso, tipo) => E.push({ cat, id, label, uni, get, set, paso: paso || 1, tipo: tipo || null });
    const obj = (cat, base, o, campo, label, uni, paso) => add(cat, base + "." + campo, label, uni, () => o[campo], v => { o[campo] = v; }, paso);
    const costos = (cat, base, o, label) => { for (const k in o) add(cat, base + "." + k, label + " — " + RES_NAME(k), RES_NAME(k) + " · entero", () => o[k], v => { o[k] = v; }); };

    // CULTIVOS (tabla del diseñador)
    CROP_ORDER.forEach(k => {
      const c = CROP_DEF[k], cat = "Cultivos — " + c.label;
      add(cat, "crop." + k + ".growH", "Tiempo de crecimiento (lo que se escribe acá es lo que dura en el juego)", "", () => c.growH * 3600, v => { c.growH = v / 3600; }, 1, "tiempo");
      obj(cat, "crop." + k, c, "seedCost", "Compra de la semilla", U.plata);
      obj(cat, "crop." + k, c, "price", "Venta de la cosecha (por unidad)", U.plata);
      obj(cat, "crop." + k, c, "yield", "Unidades por cosecha", U.cant);
      obj(cat, "crop." + k, c, "lvl", "Nivel de Cultivo requerido", U.nivel);
      obj(cat, "crop." + k, c, "xp", "XP de Farmeo por cosecha", U.xp);
    });
    add("Skills — Curva 1-150", "xpBase", "Base de la curva (puntos = Base × Nivel ^ Exponente)", "puntos · entero", () => XP_BASE, v => { XP_BASE = v; });
    add("Skills — Curva 1-150", "xpExp", "Exponente de la curva (2.7 = nivel 40 en 360 h)", "exponente · decimal", () => XP_EXP, v => { XP_EXP = v; }, 0.1);
    add("Cultivos — General", "seedDailyBase", "Cupo diario de semillas: base", "semillas · entero", () => SEED_DAILY_BASE, v => { SEED_DAILY_BASE = v; });
    add("Cultivos — General", "seedDailyNivel", "Cupo diario de semillas: extra por nivel de granja", "semillas por nivel · entero", () => SEED_DAILY_POR_NIVEL, v => { SEED_DAILY_POR_NIVEL = v; });
    add("Cultivos — General", "plotUnlockBase", "Desbloquear parcela: costo base (se duplica a partir de la 7ª)", U.plata,
      () => PLOT_UNLOCK_BASE, v => { PLOT_UNLOCK_BASE = v; });

    // HERRAMIENTAS (SFL: 1 uso cada una)
    ["axe", "rod"].forEach(id => {
      const t = TOOL_CRAFT[id], nom = TOOL_DEF[id].label, cat = "Herramientas";
      costos(cat, "tool." + id + ".cost", t.cost, nom + " · costo");
      add(cat, "tool." + id + ".plata", nom + " · costo — Plata", U.plata, () => t.plata, v => { t.plata = v; });
    });
    add("Herramientas", "wormPrice", "Lombriz · precio en la Tienda", U.plata, () => WORM_PRICE, v => { WORM_PRICE = v; });

    // PICOS
    PICK_ORDER.forEach(id => {
      const p = PICK_DEF[id], cat = "Picos — " + p.label;
      costos(cat, "pick." + id + ".cost", p.cost, "Costo");
      add(cat, "pick." + id + ".plata", "Costo — Plata", U.plata, () => p.plata, v => { p.plata = v; });
      obj(cat, "pick." + id, p, "mineTier", "Tier máximo que mina", "tier · entero 0-5 (0 piedra · 1 bronce · 2 hierro · 3 oro · 4 diamante · 5 netherita)");
    });

    // ARMAS (doc maestro 2/8): 4 tipos × 5 rarezas
    ARM_ORDER.forEach(id => {
      const w = ARM_DEF[id], cat = "Armas — " + ARM_TIPO_DEF[w.tipo].label;
      obj(cat, "arm." + id, w, "min", w.label + " · daño mínimo", U.danio);
      obj(cat, "arm." + id, w, "max", w.label + " · daño máximo", U.danio);
      obj(cat, "arm." + id, w, "buffVal", w.label + " · " + ARM_TIPO_DEF[w.tipo].buffLabel, w.tipo === "arco" ? "daño por segundo · entero" : "% · entero");
      obj(cat, "arm." + id, w, "dur", w.label + " · durabilidad", U.usos);
      obj(cat, "arm." + id, w, "plata", w.label + " · costo — Plata", U.plata);
    });
    { const cat = "Armas y combate";
      costos(cat, "arrows.cost", ARROW_COST, "Flechas ×10 · costo");
      costos(cat, "armasUnlock.cost", ARMAS_UNLOCK_COST, "Desbloquear pestaña Armas");
      add(cat, "armasUnlock.plata", "Desbloquear pestaña Armas — Plata", U.plata, () => ARMAS_UNLOCK_PLATA, v => { ARMAS_UNLOCK_PLATA = v; });
      add(cat, "dummy.cd", "Dummy de práctica · enfriamiento entre usos", "", () => DUMMY_CD_MS / 1000, v => { DUMMY_CD_MS = v * 1000; }, 1, "tiempo");
      add(cat, "dummy.xp", "Dummy de práctica · XP por uso (a la skill del arma equipada)", U.xp, () => DUMMY_XP, v => { DUMMY_XP = v; });
      add(cat, "combat.hp5", "Nivel de Combate 5 · vida máxima extra", U.vida, () => COMBAT_HP5, v => { COMBAT_HP5 = v; });
      add(cat, "combat.hp10", "Nivel de Combate 10 · vida máxima extra", U.vida, () => COMBAT_HP10, v => { COMBAT_HP10 = v; });
    }

    // MONSTRUOS
    add("Monstruos — General", "mobDmgMult", "Multiplicador global de daño de los mobs", U.factor, () => MOB_DMG_MULT, v => { MOB_DMG_MULT = v; }, 0.1);
    add("Monstruos — General", "mobDefMult", "Multiplicador global de defensa de los mobs", U.factor, () => MOB_DEF_MULT, v => { MOB_DEF_MULT = v; }, 0.1);
    add("Granja", "granjaRegen", "Vida que se recupera sola en la granja (por segundo)", U.vida, () => GRANJA_REGEN, v => { GRANJA_REGEN = v; });
    add("Granja", "zonaNegraVel", "Velocidad del granjero en la Zona Negra (1 = igual que en la granja)", U.factor, () => ZONA_NEGRA_VEL, v => { ZONA_NEGRA_VEL = v; }, 0.05);
    MONSTER_ORDER.forEach(k => {
      const m = MONSTER_DEF[k], cat = "Monstruos — " + m.label;
      obj(cat, "mob." + k, m, "hp", "Vida", U.vida);
      obj(cat, "mob." + k, m, "def", "Defensa (resta al daño recibido)", "puntos de defensa · entero");
      obj(cat, "mob." + k, m, "dmg", "Daño por golpe (pega cada 2 segundos)", U.danio);
      obj(cat, "mob." + k, m, "xp", "XP que da al morir", U.xp);
      obj(cat, "mob." + k, m, "spd", "Velocidad de movimiento", U.vel);
    });

    // MINERALES Y RECURSOS
    ORE_ORDER.forEach(k => {
      const o = ORE_DEF[k];
      add("Minerales", "ore." + k + ".cd", o.label + " · enfriamiento del nodo", "", () => o.cd, v => { o.cd = v; }, 1, "tiempo");
    });
    Object.keys(CD_RAPIDO).forEach(k => {
      add("Minerales — arranque rápido", "cdRap." + k + ".seg", k + " · enfriamiento de las primeras veces", "", () => CD_RAPIDO[k].seg, v => { CD_RAPIDO[k].seg = v; }, 1, "tiempo");
      add("Minerales — arranque rápido", "cdRap." + k + ".veces", k + " · cuántas veces dura el arranque rápido", "veces · entero", () => CD_RAPIDO[k].veces, v => { CD_RAPIDO[k].veces = v; });
    });
    add("Minerales", "golpesTalar", "Clics para tumbar un árbol", "golpes · entero", () => GOLPES_TALAR, v => { GOLPES_TALAR = v; });
    add("Minerales", "golpesMinar", "Clics para romper una roca o mineral", "golpes · entero", () => GOLPES_MINAR, v => { GOLPES_MINAR = v; });
    // VIENTO: efecto ambiental por código (sin arte). Para verlo, mirá un árbol crecido.
    add("Ambiente — viento", "viento.on", "Viento encendido (1 = sí · 0 = no)", "1 o 0", () => VIENTO_ON, v => { VIENTO_ON = v ? 1 : 0; });
    add("Ambiente — viento", "viento.grados", "Cuánto se inclina la copa", "grados · 1 a 2 se ve natural", () => VIENTO_GRADOS, v => { VIENTO_GRADOS = v; }, 0.1);
    add("Ambiente — viento", "viento.seg", "Cuánto tarda una oscilación completa", "", () => VIENTO_SEG, v => { VIENTO_SEG = v; }, 0.1, "tiempo");
    add("Ambiente — viento", "viento.rafagaCada", "Cada cuánto pasa una ráfaga", "", () => VIENTO_RAFAGA_CADA, v => { VIENTO_RAFAGA_CADA = v; }, 1, "tiempo");
    add("Ambiente — viento", "viento.rafagaMult", "Cuánto más se inclinan durante la ráfaga", "veces", () => VIENTO_RAFAGA_MULT, v => { VIENTO_RAFAGA_MULT = v; }, 0.1);
    // RESPUESTA AL CLIC. 16/8 (dirección): talar, picar, plantar y cosechar son INSTANTÁNEOS
    // y ya NO se editan desde acá. No son una palanca de balance sino la sensación del juego,
    // y un valor viejo guardado en la nube reintroducía el freno en cada arranque (nos costó
    // días). Solo queda la pesca, cuyo cast largo sí es una decisión de diseño.
    ["fish"].forEach(k => {
      const nom = { fish: "Pescar" }[k] || k;
      add("Respuesta al clic", "act." + k, nom + " · cuánto dura la acción", "", () => ACT_DUR[k], v => { ACT_DUR[k] = v; }, 0.05, "tiempo");
    });
    add("Respuesta al clic", "clicBuffer", "Ventana para guardar el clic que llega durante el candado (0 = se pierde)", "milisegundos", () => CLIC_BUFFER_MS, v => { CLIC_BUFFER_MS = v; }, 20);
    add("Respuesta al clic", "destelloMs", "Cuánto dura el destello blanco del nodo al golpearlo (Sunflower Land: ~100 ms)", "milisegundos", () => FX_DESTELLO_MS, v => { FX_DESTELLO_MS = v; }, 10);
    add("Respuesta al clic", "barraGolpes", "Barrita de progreso bajo el nodo mientras lo golpeás", "1 o 0", () => FX_BARRA_GOLPES, v => { FX_BARRA_GOLPES = v ? 1 : 0; });
    add("Respuesta al clic", "barraCultivo", "Barrita de crecimiento sobre la parcela, siempre visible mientras crece", "1 o 0", () => FX_BARRA_CULTIVO, v => { FX_BARRA_CULTIVO = v ? 1 : 0; });
    add("Respuesta al clic", "barraDy", "Altura de la barrita sobre la parcela (negativo = más arriba)", "píxeles", () => FX_BARRA_DY, v => { FX_BARRA_DY = v; });
    add("Respuesta al clic", "premio", "El recurso sale volando en arco con su +N", "1 o 0", () => FX_PREMIO, v => { FX_PREMIO = v ? 1 : 0; });
    add("Respuesta al clic", "premioPx", "Tamaño del recurso que sale volando (la celda del mundo mide 42)", "píxeles", () => FX_PREMIO_PX, v => { FX_PREMIO_PX = v; });
    add("Respuesta al clic", "premioTxt", "Tamaño del \"+N\" que lo acompaña", "píxeles", () => FX_PREMIO_TXT, v => { FX_PREMIO_TXT = v; });
    add("Respuesta al clic", "clicSuelto", "Con el clic apretado sin arrastrar, a partir de acá la acción sale sola", "milisegundos", () => CLIC_SUELTO_MS, v => { CLIC_SUELTO_MS = v; }, 10);
    // EFECTOS DE JUGO: cada uno se puede apagar por separado si molesta
    add("Ambiente — efectos", "fx.impacto", "Sacudida y astillas al golpear un nodo (1 = sí · 0 = no)", "1 o 0", () => FX_IMPACTO, v => { FX_IMPACTO = v ? 1 : 0; });
    add("Ambiente — efectos", "fx.impactoGrados", "Cuánto se sacude el nodo al recibir el golpe", "grados", () => FX_IMPACTO_GRADOS, v => { FX_IMPACTO_GRADOS = v; }, 0.5);
    add("Ambiente — efectos", "fx.hojas", "Hojas volando cuando pasa una ráfaga", "1 o 0", () => FX_HOJAS, v => { FX_HOJAS = v ? 1 : 0; });
    add("Ambiente — efectos", "fx.nubes", "Cuántas nubes cruzan la granja", "nubes · entero", () => FX_NUBES, v => { FX_NUBES = v; });
    add("Ambiente — efectos", "fx.nubesAlfa", "Qué tan opacas son las nubes (estaban en 0.55 y tapaban)", "0 a 1", () => FX_NUBES_ALFA, v => { FX_NUBES_ALFA = v; }, 0.02);
    add("Ambiente — efectos", "fx.nubesSombra", "Opacidad de la sombra que proyectan", "0 a 1", () => FX_NUBES_SOMBRA, v => { FX_NUBES_SOMBRA = v; }, 0.01);
    add("Ambiente — efectos", "fx.mariposas", "Cuántas mariposas revolotean sobre los cultivos", "mariposas · entero", () => FX_MARIPOSAS, v => { FX_MARIPOSAS = v; });
    add("Ambiente — efectos", "fx.vapor", "Vapor de la Cocina y chispas del Altar mejorado", "1 o 0", () => FX_VAPOR, v => { FX_VAPOR = v ? 1 : 0; });
    add("Ambiente — efectos", "fx.fadeMs", "Fundido a negro al cambiar de escena (0 = corte seco)", "milisegundos", () => FX_FADE_MS, v => { FX_FADE_MS = v; }, 20);
    add("Ambiente — efectos", "fx.partMax", "Tope de partículas vivas a la vez (cuida el rendimiento)", "partículas · entero", () => FX_PART_MAX, v => { FX_PART_MAX = v; }, 5);
    // 10/8: lo nuevo del documento del diseñador
    add("Clan — asalto al Dragón", "raidMin", "Cuántos miembros hacen falta para abrir un asalto", "jugadores · entero", () => RAID_MIN_MIEMBROS, v => { RAID_MIN_MIEMBROS = v; });
    add("Clan — asalto al Dragón", "raidHp", "Vida compartida del Dragón", U.vida, () => RAID_HP, v => { RAID_HP = v; }, 1000);
    add("Clan — asalto al Dragón", "raidHoras", "Cuántas horas queda abierto el asalto", "horas · entero", () => RAID_HORAS, v => { RAID_HORAS = v; });
    Object.keys(RAID_BOTIN).forEach(k => add("Clan — asalto al Dragón", "raidBotin." + k, "Botín total del Dragón — " + (RES_NAME(k) || k), "unidades · entero", () => RAID_BOTIN[k], v => { RAID_BOTIN[k] = v; }, 1));
    add("Zona Negra — esencia oscura", "esenciaGuarida", "Esencia oscura por monstruo en la Guarida", "probabilidad · decimal", () => ESENCIA_POR_ZONA.guarida, v => { ESENCIA_POR_ZONA.guarida = v; }, 0.05);
    ZONA_ORDER.forEach(k => add("Zona Negra — mapas", "zona." + k + ".lvl", ZONA_DEF[k].label + " · Combate para entrar", U.nivel, () => ZONA_DEF[k].lvl, v => { ZONA_DEF[k].lvl = v; }));
    add("Tienda — parcelas y GOD HAND", "plotGoldenCambio", "Cuánta plata vale 1 $Golden al comprar parcelas", "plata por $Golden", () => PLOT_GOLDEN_CAMBIO, v => { PLOT_GOLDEN_CAMBIO = v; }, 10);
    add("Tienda — parcelas y GOD HAND", "plotGoldenMin", "Precio mínimo de una parcela en $Golden", "$Golden · entero", () => PLOT_GOLDEN_MIN, v => { PLOT_GOLDEN_MIN = v; });
    add("Tienda — parcelas y GOD HAND", "godHandGolden", "GOD HAND · precio", "$Golden · entero", () => GODHAND_GOLDEN, v => { GODHAND_GOLDEN = v; }, 10);
    add("Tienda — adornos", "decoMax", "Cuántos adornos se pueden tener puestos a la vez", "adornos · entero", () => DECO_MAX, v => { DECO_MAX = v; });
    DECO_ORDER.forEach(id => {
      const d = DECO_DEF[id];
      if (d.plata) add("Tienda — adornos", "deco." + id + ".plata", d.label + " · precio", U.plata, () => d.plata, v => { d.plata = v; }, 10);
      if (d.golden) add("Tienda — adornos", "deco." + id + ".golden", d.label + " · precio", "$Golden · entero", () => d.golden, v => { d.golden = v; });
    });
    add("Establo", "animalMax", "Cuántos animales se pueden tener de cada tipo", "animales · entero", () => ANIMAL_MAX, v => { ANIMAL_MAX = v; });
    add("Establo", "animalSube", "Cuánto más caro sale cada animal extra del mismo tipo", "0.5 = +50% por cada uno", () => ANIMAL_SUBE, v => { ANIMAL_SUBE = v; }, 0.05);
    add("Zona Negra", "zonaCdMin", "Descanso del granjero entre viaje y viaje a la Zona Negra", "", () => ZONA_CD_MIN * 60, v => { ZONA_CD_MIN = v / 60; }, 1, "tiempo");
    add("Dummy", "dummyEspera", "Cuánto tarda el entrenamiento en empezar a contar", "", () => DUMMY_OFF_ESPERA_MS / 1000, v => { DUMMY_OFF_ESPERA_MS = v * 1000; }, 1, "tiempo");
    // MINERALES: que se distingan entre sí de un vistazo (9/8)
    add("Minerales — que se distingan", "nodo.escala", "Qué parte de la celda ocupa la veta (al 0.67 las pepitas no se leían)", "0 a 1", () => NODO_ESCALA, v => { NODO_ESCALA = v; }, 0.02);
    add("Minerales — que se distingan", "nodo.tinte", "Teñir la roca entera del color de su mineral (1 = sí · 0 = no)", "1 o 0", () => NODO_TINTE, v => { NODO_TINTE = v ? 1 : 0; });
    add("Minerales — que se distingan", "nodo.brillo", "Chispita sobre las vetas caras que están listas (1 = sí · 0 = no)", "1 o 0", () => NODO_BRILLO, v => { NODO_BRILLO = v ? 1 : 0; });
    add("Minerales — que se distingan", "nodo.brilloCada", "Cada cuánto aparece una chispita, por veta", "milisegundos", () => NODO_BRILLO_CADA, v => { NODO_BRILLO_CADA = v; }, 100);
    // POP: el saltito de resorte al terminar de crecer
    add("Ambiente — pop de crecimiento", "pop.on", "Pop encendido (1 = sí · 0 = no)", "1 o 0", () => POP_ON, v => { POP_ON = v ? 1 : 0; });
    add("Ambiente — pop de crecimiento", "pop.fuerza", "Qué tan exagerado es el rebote", "0.5 discreto · 1.5 caricaturesco", () => POP_FUERZA, v => { POP_FUERZA = v; }, 0.05);
    add("Ambiente — pop de crecimiento", "pop.ms", "Cuánto tarda en quedar quieto", "milisegundos", () => POP_MS, v => { POP_MS = v; }, 20);
    add("Ambiente — pop de crecimiento", "pop.intermedio", "Fuerza del pop en los pasos intermedios (brote, retoño)", "respecto del pop final", () => POP_INTERMEDIO, v => { POP_INTERMEDIO = v; }, 0.05);
    add("Ambiente — viento", "viento.corte", "Qué parte del árbol es copa (lo que se dobla); el resto es tronco quieto", "0 a 1", () => VIENTO_CORTE, v => { VIENTO_CORTE = v; }, 0.02);
    add("Ambiente — viento", "viento.cultivos", "Cuánto se mecen los cultivos listos respecto de un árbol", "0 a 1 (0 = quietos)", () => VIENTO_CULTIVOS, v => { VIENTO_CULTIVOS = v; }, 0.05);
    add("Minerales", "golpesReset", "Si dejás un nodo a medio golpear, en cuánto se recupera solo (la herramienta no se gasta)", "", () => GOLPES_RESET_MS / 1000, v => { GOLPES_RESET_MS = v * 1000; }, 1, "tiempo");
    add("Minerales", "cd.tree", "Árbol · enfriamiento tras talar", "", () => CD.tree, v => { CD.tree = v; }, 1, "tiempo");
    add("Minerales", "cd.rock", "Piedra · enfriamiento tras picar", "", () => CD.rock, v => { CD.rock = v; }, 1, "tiempo");

    // MATERIALES (HORNO DE PIEDRA)
    MAT_ORDER.forEach(id => {
      const m = MAT_DEF[id];
      costos("Materiales (Horno de Piedra)", "mat." + id + ".cost", m.cost, m.label + " · costo");
    });
    add("Materiales (Horno de Piedra)", "matCdSeg", "Enfriamiento al fundir cada barra", "", () => MAT_CD_MS / 1000, v => { MAT_CD_MS = v * 1000; }, 1, "tiempo");

    // COCINA (doc maestro 2/8: 14 recetas + clásicas, niveles y maestría)
    add("Cocina — General", "dishBuffDur", "Duración de los buffs de comida", "", () => DISH_BUFF_DUR, v => { DISH_BUFF_DUR = v; }, 1, "tiempo");
    add("Cocina — General", "cookPriceAuto", "Precio de venta de los platos: 1 = calculado sobre ingredientes (recomendado) · 0 = precio fijo de la planilla", "1 o 0", () => COOK_PRICE_AUTO, v => { COOK_PRICE_AUTO = v ? 1 : 0; });
    add("Cocina — General", "cookMargen", "Ganancia de cocinar sobre el valor de los ingredientes (1.25 = +25%)", U.factor, () => COOK_MARGEN, v => { COOK_MARGEN = v; }, 0.05);
    add("Cocina — General", "cookSlots", "Ollas: cuántos platos se cocinan a la vez", "ollas · entero", () => COOK_SLOTS, v => { COOK_SLOTS = v; });
    for (const id in RECIPE_DEF) {
      const r = RECIPE_DEF[id], cat = "Cocina — " + r.label;
      if (r.res) costos(cat, "recipe." + id + ".res", r.res, "Ingredientes");
      if (r.fish) costos(cat, "recipe." + id + ".fish", r.fish, "Peces");
      obj(cat, "recipe." + id, r, "heal", "Vida que cura al comerlo", U.vida);
      obj(cat, "recipe." + id, r, "xp", "XP de Cocina al cocinarlo", U.xp);
      if (r.lvl) obj(cat, "recipe." + id, r, "lvl", "Nivel de Cocina requerido", U.nivel);
      if (r.cookS != null) add(cat, "recipe." + id + ".cookS", "Tiempo de cocción", "", () => r.cookS, v => { r.cookS = v; }, 1, "tiempo");
      if (r.plata != null) obj(cat, "recipe." + id, r, "plata", "Venta base", U.plata);
      if (r.buff && r.buff.val != null) add(cat, "recipe." + id + ".buffVal", "Buff: " + dishBuffLabel(r.buff, 1), r.buff.type === "regen" ? "HP por segundo · entero" : (r.buff.type === "hpmax" ? U.vida : "% · entero"), () => r.buff.val, v => { r.buff.val = v; });
      if (r.goldenP != null) obj(cat, "recipe." + id, r, "goldenP", "Venta en $Golden (Cocina Nv 8+)", "$Golden · entero");
    }

    // TUTORIAL
    add("Tutorial guiado", "tuto.reward", "Recompensa final del tutorial", U.plata, () => TUTO_REWARD_PLATA, v => { TUTO_REWARD_PLATA = v; });
    add("Tutorial guiado", "tuto.firstGrow", "Semillas del starter pack: tope de crecimiento (0 = sin excepción)", "", () => FIRST_GROW_MS / 1000, v => { FIRST_GROW_MS = v * 1000; }, 1, "tiempo");
    add("Tutorial guiado", "tuto.firstN", "Cuántas semillas de arranque crecen rápido", "semillas · entero", () => FIRST_GROW_N, v => { FIRST_GROW_N = v; });

    // PASE DE BATALLA
    { const cat = "Pase de Batalla";
      add(cat, "pass.starsLvl", "Estrellas por nivel del pase", "estrellas · entero", () => PASS_STARS_LVL, v => { PASS_STARS_LVL = v; });
      add(cat, "pass.vipPrice", "Precio del Pase VIP", "$Golden · entero", () => PASS_VIP_PRICE, v => { PASS_VIP_PRICE = v; });
      add(cat, "pass.lvlGold", "Comprar 1 nivel suelto", "$Golden · entero", () => PASS_LVL_GOLD, v => { PASS_LVL_GOLD = v; });
      add(cat, "pass.starDaily", "Estrellas por misión diaria", "estrellas · entero", () => PASS_STAR_DAILY, v => { PASS_STAR_DAILY = v; });
      add(cat, "pass.starBonus", "Bono por las 3 diarias", "estrellas · entero", () => PASS_STAR_BONUS, v => { PASS_STAR_BONUS = v; });
      add(cat, "pass.starWeekly", "Estrellas por misión semanal", "estrellas · entero", () => PASS_STAR_WEEKLY, v => { PASS_STAR_WEEKLY = v; });
      add(cat, "pass.vipBoost", "Boost de estrellas del VIP (1.2 = +20%)", U.factor, () => PASS_VIP_BOOST, v => { PASS_VIP_BOOST = v; }, 0.1);
    }

    // INCURSIONES Y ENTRENAMIENTO OFFLINE
    { const cat = "Edificios nivel 2";
      add(cat, "edif2.horno", "Horno nivel 2 · cuánto acorta el enfriamiento", "% · entero", () => EDIF2_HORNO, v => { EDIF2_HORNO = v; });
      add(cat, "edif2.cocina", "Cocina nivel 2 · cuánto acorta la cocción", "% · entero", () => EDIF2_COCINA, v => { EDIF2_COCINA = v; });
      add(cat, "edif2.cocinaOlla", "Cocina nivel 2 · ollas extra", "ollas · entero", () => EDIF2_COCINA_OLLA, v => { EDIF2_COCINA_OLLA = v; });
      add(cat, "edif2.altar", "Altar nivel 2 · puntos de éxito extra", "puntos · entero", () => EDIF2_ALTAR, v => { EDIF2_ALTAR = v; });
    }

    add("Mercado de jugadores", "mk.fee", "Comisión de venta (se quema)", "% · entero", () => MARKET_FEE, v => { MARKET_FEE = v; });
    add("Mercado de jugadores", "mk.max", "Publicaciones activas por jugador", "publicaciones · entero", () => MARKET_MAX_PUB, v => { MARKET_MAX_PUB = v; });

    { const cat = "Incursiones";
      add(cat, "inc.rend", "Rendimiento vs pelear a mano (0.7 = 70%)", U.factor, () => INC_RENDIMIENTO, v => { INC_RENDIMIENTO = v; }, 0.05);
      add(cat, "inc.cupo", "Incursiones por día (0 = sin tope)", "incursiones · entero", () => INC_CUPO_DIA, v => { INC_CUPO_DIA = v; });
      INC_ORDER.forEach(k => { const z = INCURSIONES[k];
        add(cat, "inc." + k + ".min", z.label + " · duración", "", () => z.min * 60, v => { z.min = v / 60; }, 1, "tiempo");
        add(cat, "inc." + k + ".poder", z.label + " · poder recomendado", "poder · entero", () => z.poderRec, v => { z.poderRec = v; });
      });
      add(cat, "dummy.offXp", "Entrenamiento offline · XP por hora", U.xp, () => DUMMY_OFF_XP_H, v => { DUMMY_OFF_XP_H = v; });
      add(cat, "dummy.offMax", "Entrenamiento offline · tope de horas", "horas · entero", () => DUMMY_OFF_MAX_H, v => { DUMMY_OFF_MAX_H = v; });
    }

    // ALTAR DE OFRENDAS
    { const cat = "Altar de Ofrendas";
      add(cat, "ofr.pozo", "Pozo fijo del airdrop (referencia)", "$Golden · entero", () => OFRENDA_POZO, v => { OFRENDA_POZO = v; });
      OFRENDA_ORDER.forEach(k => add(cat, "ofr." + k, (RES_LABEL[k] || (CROP_DEF[k] && CROP_DEF[k].label) || k) + " · puntos por unidad", "puntos · entero", () => OFRENDA_PTS[k], v => { OFRENDA_PTS[k] = v; }));
      costos("Edificios", "build.ofrendas.cost", BUILD_DEF.ofrendas.cost, "Altar de Ofrendas · construcción");
    }

    // ARMADURAS (Curtiduría)
    ARMOR_ORDER.forEach(set => { const sd = ARMOR_SETS[set], cat = "Armaduras — " + sd.label;
      ARMOR_SLOTS.forEach(pz => { const p = sd.piezas[pz];
        add(cat, "armor." + set + "." + pz + ".def", ARMOR_SLOT_LABEL[pz] + " · defensa", "puntos · entero", () => p.def, v => { p.def = v; });
        add(cat, "armor." + set + "." + pz + ".mat", ARMOR_SLOT_LABEL[pz] + " · " + RES_LABEL[sd.mat], U.cant, () => p.mat, v => { p.mat = v; });
        add(cat, "armor." + set + "." + pz + ".plata", ARMOR_SLOT_LABEL[pz] + " · plata", U.plata, () => p.plata, v => { p.plata = v; });
        if (p.hierro != null) add(cat, "armor." + set + "." + pz + ".hierro", ARMOR_SLOT_LABEL[pz] + " · hierro", U.cant, () => p.hierro, v => { p.hierro = v; });
      });
    });

    // ESTABLO Y ANIMALES
    { const cat = "Establo — animales";
      add(cat, "feliz.comida", "Felicidad que da alimentarlo", "puntos · entero", () => FELIZ_POR_COMIDA, v => { FELIZ_POR_COMIDA = v; });
      add(cat, "feliz.baja", "Felicidad que pierde por hora sin comer", "puntos por hora · decimal", () => FELIZ_BAJA_H, v => { FELIZ_BAJA_H = v; }, 0.5);
      add(cat, "feliz.min", "Rendimiento con felicidad 0 (0.5 = la mitad)", U.factor, () => FELIZ_MIN_PROD, v => { FELIZ_MIN_PROD = v; }, 0.05);
      ANIMAL_ORDER.forEach(k => { const d = ANIMAL_DEF[k];
        add(cat, "ani." + k + ".golden", d.label + " · precio", "$Golden · entero", () => d.golden, v => { d.golden = v; });
        add(cat, "ani." + k + ".ciclo", d.label + " · cada cuánto produce", "", () => d.cicloH * 3600, v => { d.cicloH = v / 3600; }, 1, "tiempo");
        add(cat, "ani." + k + ".cant", d.label + " · cuánto produce por ciclo", U.cant, () => d.porCiclo, v => { d.porCiclo = v; });
      });
      costos("Edificios", "build.establo.cost", BUILD_DEF.establo.cost, "Establo · construcción");
      costos("Edificios", "build.curtiduria.cost", BUILD_DEF.curtiduria.cost, "Curtiduría · construcción");
    }

    // NIVELES DE GRANJA 1-50
    for (let n = 2; n <= FARM_NIVEL_MAX; n++) {
      add("Granja — niveles", "farmXp." + n, "Nivel " + n + " · XP de cosecha acumulada", U.xp, () => FARM_XP_LVLS[n], v => { FARM_XP_LVLS[n] = v; });
    }

    // ESTAMINA DE LA ZONA NEGRA
    { const cat = "Estamina de combate";
      add(cat, "stam.base", "Estamina máxima a nivel 1 de Combate", "puntos · entero", () => STAM_BASE, v => { STAM_BASE = v; });
      add(cat, "stam.nivel", "Estamina extra por nivel de Combate", "puntos por nivel · entero", () => STAM_POR_NIVEL, v => { STAM_POR_NIVEL = v; });
      add(cat, "stam.tope", "Tope de estamina máxima", "puntos · entero", () => STAM_TOPE, v => { STAM_TOPE = v; });
      add(cat, "stam.regen", "Cada cuánto se recupera 1 punto", "", () => STAM_REGEN_SEG, v => { STAM_REGEN_SEG = v; }, 1, "tiempo");
      add(cat, "stam.golden", "Recarga completa · costo", "$Golden · entero", () => STAM_GOLDEN, v => { STAM_GOLDEN = v; });
      add(cat, "stam.recargas", "Recargas premium por día (tope anti pay-to-win)", "recargas · entero", () => STAM_RECARGAS_DIA, v => { STAM_RECARGAS_DIA = v; });
      MONSTER_ORDER.forEach(k => add(cat, "stamCosto." + k, MONSTER_DEF[k].label + " · costo de estamina", "puntos · entero", () => STAM_COSTO[k], v => { STAM_COSTO[k] = v; }));
    }

    // ALTAR DE RUNAS
    { const cat = "Altar de Runas";
      add(cat, "altar.break", "Rotura al fallar +11..+15 sin protección", "% · entero", () => ALTAR_BREAK, v => { ALTAR_BREAK = v; });
      for (let n = 1; n <= 15; n++) {
        add(cat, "upg." + n + ".ex", "+" + n + " · éxito base", "% · entero", () => UPG[n].ex, v => { UPG[n].ex = v; });
        add(cat, "upg." + n + ".plata", "+" + n + " · costo en plata", U.plata, () => UPG[n].plata, v => { UPG[n].plata = v; });
        add(cat, "upg." + n + ".rp", "+" + n + " · Runas de Poder", U.cant, () => UPG[n].rp, v => { UPG[n].rp = v; });
      }
      costos(cat, "altarCraft.runa_poder", ALTAR_CRAFT.runa_poder.cost, "Runa de Poder · costo");
      costos(cat, "altarCraft.polvo", ALTAR_CRAFT.polvo_suerte.cost, "Polvo de Suerte · costo");
      costos(cat, "altarCraft.prot", ALTAR_CRAFT.runa_proteccion.cost, "Runa de Protección · costo");
      costos(cat, "runaCraft", RUNA_CRAFT.cost, "Runa de atributo I · costo");
      add(cat, "runaCraft.plata", "Runa de atributo I · plata", U.plata, () => RUNA_CRAFT.plata, v => { RUNA_CRAFT.plata = v; });
    }

    // EDIFICIOS
    ["horno", "cocina", "altar"].forEach(k => costos("Edificios", "build." + k + ".cost", BUILD_DEF[k].cost, BUILD_DEF[k].label + " · construcción"));

    // DESBLOQUEOS DE ÁRBOLES/PIEDRAS
    NODE_UNLOCK_COSTS.forEach((c, i) => add("Desbloqueos", "nodeUnlock." + i,
      (i + 2) + "º árbol o piedra", "madera (árboles) o piedra (piedras) · entero",
      () => NODE_UNLOCK_COSTS[i], v => { NODE_UNLOCK_COSTS[i] = v; }));

    return E;
  }

  /* ---- persistencia (Supabase REST, tabla balance fila id=1) ---- */
  async function fetchOverrides() {
    const r = await fetch(URL + "/rest/v1/balance?id=eq.1&select=data,updated_at", { headers: HDRS });
    if (!r.ok) throw new Error("balance fetch " + r.status);
    const rows = await r.json();
    return rows[0] || { data: {}, updated_at: null };
  }
  async function saveOverrides(data) {
    const r = await fetch(URL + "/rest/v1/balance?id=eq.1", {
      method: "PATCH", headers: HDRS,
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error("balance save " + r.status);
  }

  /* aplica los ajustes guardados sobre las definiciones reales del juego.
     16/8: además DELATA lo que pisó. Esta fila de la nube nos costó días tres veces
     (timers de árbol en 1 s, y la respuesta al clic "que volvió a como estaba antes"):
     el código decía una cosa, el juego hacía otra y no había forma de verlo. Ahora cada
     override queda registrado con su valor de código y su valor de la nube. */
  function apply(data) {
    if (!data) return 0;
    const E = schema(); let n = 0;
    const detalle = [];
    for (const e of E) if (data[e.id] != null && typeof data[e.id] === "number" && isFinite(data[e.id])) {
      const codigo = (typeof e.get === "function") ? e.get() : null;
      if (codigo !== data[e.id]) detalle.push({ id: e.id, etiqueta: e.label || e.id, codigo, nube: data[e.id] });
      e.set(data[e.id]); n++;
    }
    if (typeof recomputeCropGrow === "function") recomputeCropGrow();   // growH/escala cambiados → segundos derivados
    if (typeof window !== "undefined") window.BAL_PISADOS = detalle;    // inspeccionable desde la consola
    return n;
  }

  return { schema, fetchOverrides, saveOverrides, apply };
})();

/* En el JUEGO: promesa que main.js espera antes de arrancar Phaser (con timeout: si la
   tabla no existe o no hay red, el juego sale igual con los valores por defecto). */
if (typeof window !== "undefined") {
  window.BAL_READY = (async () => {
    try {
      const row = await Promise.race([BAL.fetchOverrides(), new Promise((_, rj) => setTimeout(rj, 4000, new Error("timeout")))]);
      const n = BAL.apply(row.data);
      const p = window.BAL_PISADOS || [];
      if (n) {
        console.log("[balance] " + n + " ajustes del panel aplicados (" + (row.updated_at || "") + ")");
        if (p.length) {
          console.warn("[balance] ⚠ " + p.length + " valor(es) del CÓDIGO están pisados por la nube (balance.html → \"Restaurar TODO\" los borra):");
          try { console.table(p); } catch (e) { p.forEach(x => console.warn("   " + x.id + ": código " + x.codigo + " → nube " + x.nube)); }
          // y que se vea SIN abrir la consola: aviso en el juego, una sola vez al arrancar
          setTimeout(() => {
            const txt = "⚙ " + p.length + " valor(es) del panel de balanceo están pisando al código";
            const det = p.slice(0, 6).map(x => x.id + " " + x.codigo + "→" + x.nube).join(" · ");
            if (typeof log === "function") log(txt + ": " + det + (p.length > 6 ? " …" : "") + ". Si algo no se comporta como dice el código, es esto (balance.html → \"Restaurar TODO\").", "warn");
            if (typeof toast === "function") toast(txt);
          }, 2500);
        }
      }
    } catch (e) { console.warn("[balance] sin ajustes remotos:", e.message); }
  })();
}
