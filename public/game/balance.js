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
    add("Cultivos — General", "seedDailyMax", "Cupo diario de compra de semillas", "semillas por día · entero", () => SEED_DAILY_MAX, v => { SEED_DAILY_MAX = v; });
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
    add("Minerales", "cd.tree", "Árbol · enfriamiento tras talar", "", () => CD.tree, v => { CD.tree = v; }, 1, "tiempo");
    add("Minerales", "cd.rock", "Piedra · enfriamiento tras picar", "", () => CD.rock, v => { CD.rock = v; }, 1, "tiempo");

    // MATERIALES (HORNO DE PIEDRA)
    MAT_ORDER.forEach(id => {
      const m = MAT_DEF[id];
      costos("Materiales (Horno de Piedra)", "mat." + id + ".cost", m.cost, m.label + " · costo");
    });
    add("Materiales (Horno de Piedra)", "matCdSeg", "Enfriamiento al fundir cada barra", "", () => MAT_CD_MS / 1000, v => { MAT_CD_MS = v * 1000; }, 1, "tiempo");

    // COCINA
    for (const id in RECIPE_DEF) {
      const r = RECIPE_DEF[id], cat = "Cocina — " + r.label;
      if (r.res) costos(cat, "recipe." + id + ".res", r.res, "Ingredientes");
      if (r.fish) costos(cat, "recipe." + id + ".fish", r.fish, "Peces");
      obj(cat, "recipe." + id, r, "heal", "Vida que cura al comerlo", U.vida);
      obj(cat, "recipe." + id, r, "xp", "XP de Cocina al cocinarlo", U.xp);
    }

    // EDIFICIOS
    ["horno", "cocina"].forEach(k => costos("Edificios", "build." + k + ".cost", BUILD_DEF[k].cost, BUILD_DEF[k].label + " · construcción"));

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
