/* Golden Farm · Panel de balanceo (31/7)
   Módulo compartido entre el JUEGO y balance.html:
   - Define el ESQUEMA de variables editables (categorías + etiquetas en español), leyendo
     los objetos reales del juego (siempre sincronizado con el código).
   - Guarda/carga los ajustes ("overrides") en Supabase (tabla `balance`, fila id=1).
   - El juego los aplica al arrancar (main.js espera BAL_READY antes de crear Phaser). */

var BAL = (function () {
  const URL = "https://eusxpsmqczmczgyhndtd.supabase.co";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3hwc21xY3ptY3pneWhuZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzU2OTMsImV4cCI6MjEwMDc1MTY5M30.ko-XxFFjf_YnBsnBvrSCOsMLTQ285G51r-UPLYZIDJ8";
  const HDRS = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };

  const RES_NAME = k => (typeof RES_LABEL !== "undefined" && RES_LABEL[k]) || (typeof CROP_DEF !== "undefined" && CROP_DEF[k] && CROP_DEF[k].label) || k;

  /* ---- esquema: cada entrada = { id, cat, label, get, set, paso } ----
     El id es estable (se guarda en la base); get/set tocan el objeto real del juego. */
  function schema() {
    const E = [];
    const add = (cat, id, label, get, set, paso) => E.push({ cat, id, label, get, set, paso: paso || 1 });
    const obj = (cat, base, o, campo, label, paso) => add(cat, base + "." + campo, label, () => o[campo], v => { o[campo] = v; }, paso);
    const costos = (cat, base, o, label) => { for (const k in o) add(cat, base + "." + k, label + " — " + RES_NAME(k), () => o[k], v => { o[k] = v; }); };

    // CULTIVOS (tabla del diseñador)
    CROP_ORDER.forEach(k => {
      const c = CROP_DEF[k], cat = "Cultivos — " + c.label;
      obj(cat, "crop." + k, c, "growH", "Horas de crecimiento (tiempo real de la tabla)", 0.5);
      obj(cat, "crop." + k, c, "seedCost", "Compra de la semilla (plata)");
      obj(cat, "crop." + k, c, "price", "Venta de la cosecha (plata)");
      obj(cat, "crop." + k, c, "yield", "Unidades por cosecha");
      obj(cat, "crop." + k, c, "lvl", "Nivel de Cultivo requerido");
    });
    add("Cultivos — General", "growScale", "Escala de tiempo (1 = horas reales · 0.01667 = testeo, 1h→1min)",
      () => GROW_SCALE, v => { GROW_SCALE = v; }, 0.001);
    add("Cultivos — General", "seedDailyMax", "Cupo diario de semillas", () => SEED_DAILY_MAX, v => { SEED_DAILY_MAX = v; });
    add("Cultivos — General", "plotUnlockBase", "Costo base de desbloquear parcela (se duplica a partir de la 7ª)",
      () => PLOT_UNLOCK_BASE, v => { PLOT_UNLOCK_BASE = v; });

    // HERRAMIENTAS (SFL: 1 uso)
    ["axe", "rod"].forEach(id => {
      const t = TOOL_CRAFT[id], nom = TOOL_DEF[id].label, cat = "Herramientas";
      costos(cat, "tool." + id + ".cost", t.cost, nom + " · costo");
      add(cat, "tool." + id + ".plata", nom + " · costo — Plata", () => t.plata, v => { t.plata = v; });
    });
    add("Herramientas", "wormPrice", "Precio de la lombriz (Tienda)", () => WORM_PRICE, v => { WORM_PRICE = v; });

    // PICOS
    PICK_ORDER.forEach(id => {
      const p = PICK_DEF[id], cat = "Picos — " + p.label;
      costos(cat, "pick." + id + ".cost", p.cost, "Costo");
      add(cat, "pick." + id + ".plata", "Costo — Plata", () => p.plata, v => { p.plata = v; });
      obj(cat, "pick." + id, p, "mineTier", "Tier máximo que mina (0 piedra ·1 bronce ·2 hierro ·3 oro ·4 diamante ·5 netherita)");
    });

    // ARMAS Y COMBATE
    { const cat = "Armas y combate";
      costos(cat, "swordWood.cost", SWORD_WOOD_COST, "Espada de Madera · costo");
      add(cat, "dmg.swordWood", "Espada de Madera · daño base", () => DMG_SWORD_WOOD_BASE, v => { DMG_SWORD_WOOD_BASE = v; });
      add(cat, "dur.swordWood", "Espada de Madera · durabilidad", () => TOOL_DEF.sword_wood.max, v => { TOOL_DEF.sword_wood.max = v; });
      costos(cat, "swordWood.repair", TOOL_DEF.sword_wood.repair, "Espada de Madera · reparación");
      costos(cat, "sword.cost", SWORD_COST, "Espada de Hierro · costo");
      add(cat, "dmg.sword", "Espada de Hierro · daño base", () => DMG_SWORD_BASE, v => { DMG_SWORD_BASE = v; });
      add(cat, "dur.sword", "Espada de Hierro · durabilidad", () => TOOL_DEF.sword.max, v => { TOOL_DEF.sword.max = v; });
      costos(cat, "sword.repair", TOOL_DEF.sword.repair, "Espada de Hierro · reparación");
      costos(cat, "bow.cost", BOW_COST, "Arco · costo");
      add(cat, "dmg.bow", "Arco · daño base", () => DMG_BOW_BASE, v => { DMG_BOW_BASE = v; });
      add(cat, "dur.bow", "Arco · durabilidad", () => TOOL_DEF.bow.max, v => { TOOL_DEF.bow.max = v; });
      costos(cat, "bow.repair", TOOL_DEF.bow.repair, "Arco · reparación");
      costos(cat, "arrows.cost", ARROW_COST, "Flechas ×10 · costo");
      costos(cat, "armasUnlock.cost", ARMAS_UNLOCK_COST, "Desbloquear pestaña Armas");
      add(cat, "armasUnlock.plata", "Desbloquear pestaña Armas — Plata", () => ARMAS_UNLOCK_PLATA, v => { ARMAS_UNLOCK_PLATA = v; });
      add(cat, "dummy.cdHoras", "Dummy · enfriamiento (horas)", () => DUMMY_CD_MS / 3600000, v => { DUMMY_CD_MS = v * 3600000; }, 0.5);
      add(cat, "dummy.xp", "Dummy · XP de Espada por uso", () => DUMMY_XP, v => { DUMMY_XP = v; });
    }

    // MONSTRUOS
    MONSTER_ORDER.forEach(k => {
      const m = MONSTER_DEF[k], cat = "Monstruos — " + m.label;
      obj(cat, "mob." + k, m, "hp", "Vida");
      obj(cat, "mob." + k, m, "dmg", "Daño por golpe (cada 2s)");
      obj(cat, "mob." + k, m, "xp", "XP que da al morir");
      obj(cat, "mob." + k, m, "spd", "Velocidad");
    });

    // MINERALES Y RECURSOS
    ORE_ORDER.forEach(k => {
      const o = ORE_DEF[k], cat = "Minerales";
      obj(cat, "ore." + k, o, "cd", o.label + " · enfriamiento del nodo (s)");
    });
    add("Minerales", "cd.tree", "Árbol · enfriamiento (s)", () => CD.tree, v => { CD.tree = v; });
    add("Minerales", "cd.rock", "Piedra · enfriamiento (s)", () => CD.rock, v => { CD.rock = v; });

    // MATERIALES (HORNO)
    MAT_ORDER.forEach(id => {
      const m = MAT_DEF[id];
      costos("Materiales (Horno de Piedra)", "mat." + id + ".cost", m.cost, m.label + " · costo");
    });
    add("Materiales (Horno de Piedra)", "matCdSeg", "Enfriamiento al fundir (s)", () => MAT_CD_MS / 1000, v => { MAT_CD_MS = v * 1000; });

    // COCINA
    for (const id in RECIPE_DEF) {
      const r = RECIPE_DEF[id], cat = "Cocina — " + r.label;
      if (r.res) costos(cat, "recipe." + id + ".res", r.res, "Ingredientes");
      if (r.fish) costos(cat, "recipe." + id + ".fish", r.fish, "Peces");
      obj(cat, "recipe." + id, r, "heal", "Vida que cura");
      obj(cat, "recipe." + id, r, "xp", "XP de Cocina");
    }

    // EDIFICIOS
    ["horno", "cocina"].forEach(k => costos("Edificios", "build." + k + ".cost", BUILD_DEF[k].cost, BUILD_DEF[k].label + " · construcción"));

    // DESBLOQUEOS DE ÁRBOLES/PIEDRAS
    NODE_UNLOCK_COSTS.forEach((c, i) => add("Desbloqueos", "nodeUnlock." + i,
      (i + 2) + "º árbol o piedra (madera/piedra)", () => NODE_UNLOCK_COSTS[i], v => { NODE_UNLOCK_COSTS[i] = v; }));

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

  /* aplica los ajustes guardados sobre las definiciones reales del juego */
  function apply(data) {
    if (!data) return 0;
    const E = schema(); let n = 0;
    for (const e of E) if (data[e.id] != null && typeof data[e.id] === "number" && isFinite(data[e.id])) { e.set(data[e.id]); n++; }
    if (typeof recomputeCropGrow === "function") recomputeCropGrow();   // growH/escala cambiados → segundos derivados
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
      if (n) console.log("[balance] " + n + " ajustes del panel aplicados (" + (row.updated_at || "") + ")");
    } catch (e) { console.warn("[balance] sin ajustes remotos:", e.message); }
  })();
}
