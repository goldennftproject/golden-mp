/* Golden Farm · economía experimental. Sin acceso a saldos o guardados de la granja real.
   Cantidades monetarias en milésimas de plata; reloj explícito para reproducir escenarios.
   Este motor local NO autoriza premios, VIP comerciales ni retiros de valor real. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GoldenEconomyLab = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR, UNIT = 1000;
  const NODE = Object.freeze({
    plot: { label: "Parcela", sprite: "plot", price: 20000, level: 1 },
    tree: { label: "Árbol", sprite: "tree", price: 30000, level: 1, res: "madera", cycle: 30 * MIN, max: 4, tool: "axe" },
    rock: { label: "Roca", sprite: "node_stone", price: 30000, level: 1, res: "piedra", cycle: 40 * MIN, max: 4, tool: "pick" },
    bronze: { label: "Veta de bronce", sprite: "node_bronze", price: 180000, level: 3, res: "bronce", cycle: 4 * HOUR, max: 1, tool: "bronzePick" }
  });
  const CROP = Object.freeze({
    papa: { label: "Papa", sprite: "crop_papa", seed: 1000, sell: 2000, cycle: 3 * MIN, level: 1 },
    calabaza: { label: "Calabaza", sprite: "crop_calabaza", seed: 40000, sell: 100000, cycle: 3 * HOUR, level: 2 },
    girasol: { label: "Girasol", sprite: "crop_girasol", seed: 180000, sell: 380000, cycle: 10 * HOUR, level: 4 }
  });
  const RES = Object.freeze({
    papa: { label: "Papa", sprite: "crop_papa", base: 2000, floor: 1200, demand: 100, ask: 4000 },
    calabaza: { label: "Calabaza", sprite: "crop_calabaza", base: 100000, floor: 46000, demand: 25, ask: 140000 },
    girasol: { label: "Girasol", sprite: "crop_girasol", base: 380000, floor: 200000, demand: 15, ask: 520000 },
    madera: { label: "Madera", sprite: "res_madera", base: 12000, floor: 6000, demand: 100, ask: 18000 },
    piedra: { label: "Piedra", sprite: "res_piedra", base: 15000, floor: 7500, demand: 100, ask: 22500 },
    bronce: { label: "Bronce", sprite: "res_bronce", base: 160000, floor: 80000, demand: 30, ask: 240000 },
    tablon: { label: "Tablón", sprite: "res_tablon", base: 36000, floor: 18000, demand: 40, ask: 54000 },
    bloque: { label: "Bloque de piedra", sprite: "res_barra_piedra", base: 45000, floor: 22500, demand: 40, ask: 67500 }
  });
  const EXPORTS = Object.freeze({ papa: 1, madera: 1, piedra: 1, tablon: 3, bloque: 3 });
  const clone = x => JSON.parse(JSON.stringify(x));
  const num = (x, d) => Number.isFinite(x) ? x : d;
  const day = t => Math.floor(t / DAY);
  function fail(message) { throw new Error(message); }
  function integer(n, max) { if (!Number.isSafeInteger(n) || n < 1 || n > (max || 10000)) fail("Elegí una cantidad entera válida."); return n; }
  function newNode(id, kind, t) {
    const d = NODE[kind];
    return { id, kind, active: true, charges: d.max || 0, nextAt: d.cycle ? t + d.cycle : 0, remaining: d.cycle || 0, crop: null, readyAt: 0 };
  }
  function create(t) {
    if (!Number.isSafeInteger(t) || t < 0) fail("Reloj inválido.");
    return { version: 1, revision: 0, lastAt: t, offset: 0, silver: 3000, expansions: 0, expansion: null, voucher: 0,
      vipUntil: 0, vipApplied: false, trialUsed: false, nodes: [newNode(1, "plot", t), newNode(2, "plot", t), newNode(3, "tree", t), newNode(4, "rock", t)],
      nextNode: 5, tools: { axe: 6, pick: 6, bronzePick: 0 }, seeds: { papa: 0, calabaza: 0, girasol: 0 },
      res: Object.fromEntries(Object.keys(RES).map(k => [k, 0])), xp: 0, workshop: false, jobs: [],
      seedDay: day(t), seedBought: 0, market: { at: t, volume: {}, spent: 0, day: day(t), sold: {} },
      exportDay: day(t), exported: 0, points: 0, trialCredits: 0, settlementDay: -1,
      processed: {}, events: ["Partida económica de prueba creada. Tu granja habitual sigue intacta."] };
  }
  function level(s) { return Math.min(25, 1 + Math.floor(Math.sqrt(s.xp / 40))); }
  function vip(s, t) { return s.vipUntil > t; }
  function capacity(s, t) { return 4 + s.expansions + (vip(s, t) ? 2 : 0); }
  function used(s) { return s.nodes.filter(n => n.active).length; }
  function log(s, text) { s.events.push(text); if (s.events.length > 40) s.events.shift(); }
  function pause(n, t) {
    n.active = false;
    if (NODE[n.kind].cycle) n.remaining = Math.max(1, n.nextAt - t);
    if (n.crop) n.remaining = Math.max(0, n.readyAt - t);
    n.pausedAt = t;
  }
  function clockNodes(s, t) {
    for (const n of s.nodes) {
      const d = NODE[n.kind];
      if (!n.active || !d.cycle || n.nextAt > t) continue;
      const count = Math.floor((t - n.nextAt) / d.cycle) + 1;
      n.charges = Math.min(d.max, n.charges + count);
      n.nextAt += count * d.cycle;
    }
  }
  function tick(s, t) {
    t = Math.max(s.lastAt, num(t, s.lastAt));
    // Liquidar la producción hasta el instante de vencimiento antes de pausar los cupos VIP.
    if (s.vipApplied && s.vipUntil <= t) {
      clockNodes(s, s.vipUntil);
      const extra = used(s) - (4 + s.expansions);
      const active = s.nodes.filter(n => n.active).sort((a, b) => Number(b.vipSlot) - Number(a.vipSlot) || b.id - a.id);
      for (const n of active.slice(0, Math.max(0, extra))) pause(n, s.vipUntil);
      s.vipApplied = false;
      log(s, "Venció el VIP de prueba. Se conservaron tus nodos, cargas y cultivos; la capacidad vuelve a Free.");
    }
    clockNodes(s, t);
    if (s.expansion && s.expansion.until <= t) {
      s.expansions++; s.expansion = null;
      if (s.expansions === 1) s.voucher++;
      log(s, "Expansión terminada: +1 cupo permanente." + (s.expansions === 1 ? " Elegí tu primer nodo incluido." : ""));
    }
    if (s.seedDay !== day(t)) { s.seedDay = day(t); s.seedBought = 0; }
    if (s.exportDay !== day(t)) { s.exportDay = day(t); s.exported = 0; }
    if (s.market.day !== day(t)) { s.market.day = day(t); s.market.spent = 0; s.market.sold = {}; }
    const decay = Math.exp(-Math.max(0, t - s.market.at) / (6 * HOUR));
    for (const k of Object.keys(s.market.volume)) s.market.volume[k] *= decay;
    s.market.at = t;
    s.lastAt = t;
    return s;
  }
  function quote(s, key, qty) {
    const r = RES[key]; if (!r) fail("Ese recurso no se negocia.");
    integer(qty);
    const v = s.market.volume[key] || 0;
    let exact = 0;
    // Precio marginal por unidad: dividir un lote no recupera la prima anterior.
    for (let i = 0; i < qty; i++) exact += Math.floor(r.floor + (r.base - r.floor) * Math.exp(-(v + i) / r.demand));
    return { total: exact, next: Math.floor(r.floor + (r.base - r.floor) * Math.exp(-v / r.demand)),
      maxQty: Math.max(0, r.demand * 4 - (s.market.sold[key] || 0)), budget: Math.max(0, 5000000 - s.market.spent) };
  }
  function debit(s, cost) { if (s.silver < cost) fail("Te falta plata."); s.silver -= cost; }
  function consume(s, key, qty) { if ((s.res[key] || 0) < qty) fail("Te falta " + RES[key].label + "."); s.res[key] -= qty; }
  function node(s, id) { const n = s.nodes.find(n => n.id === id); if (!n) fail("No existe ese nodo."); return n; }
  function expansionCost(s) { const n = s.expansions + 1; return { silver: Math.round(20000 * Math.pow(1.65, n - 1)), madera: n === 1 ? 2 : 0, piedra: n === 1 ? 2 : 0 }; }
  function reduce(s, a, t) {
    if (!a || typeof a.type !== "string") fail("Acción inválida.");
    switch (a.type) {
      case "seed": {
        const c = CROP[a.key]; if (!c || level(s) < c.level) fail("Ese cultivo todavía no está abierto.");
        const n = integer(a.qty, 100);
        const plots = s.nodes.filter(x => x.kind === "plot" && x.active).length;
        if (s.seedBought + n > 40 * Math.max(1, plots)) fail("Alcanzaste el cupo diario de semillas.");
        debit(s, c.seed * n); s.seeds[a.key] += n; s.seedBought += n; return;
      }
      case "plant": {
        const n = node(s, a.id), c = CROP[a.key];
        if (!n.active || n.kind !== "plot" || n.crop) fail("Elegí una parcela activa vacía.");
        if (!c || level(s) < c.level || !(s.seeds[a.key] > 0)) fail("Comprá una semilla disponible primero.");
        s.seeds[a.key]--; n.crop = a.key; n.readyAt = t + c.cycle; s.xp += 5; return;
      }
      case "collect": {
        const n = node(s, a.id), d = NODE[n.kind]; if (!n.active) fail("Ese nodo está guardado.");
        if (n.kind === "plot") {
          if (!n.crop || n.readyAt > t) fail("El cultivo todavía no está listo.");
          s.res[n.crop]++; n.crop = null; n.readyAt = 0; s.xp += 10;
        } else {
          if (!n.charges) fail("El nodo está recuperando su siguiente carga.");
          if (!(s.tools[d.tool] > 0)) fail("Reponé la herramienta en el taller.");
          s.tools[d.tool]--; n.charges--; s.res[d.res]++;
          // Al primer cobro se descarta el tiempo previo a la creación/llenado del nodo.
          if (n.charges === d.max - 1) n.nextAt = t + d.cycle;
          s.xp += Math.max(5, Math.round(d.cycle / MIN / 3));
        }
        return;
      }
      case "store": {
        const n = node(s, a.id); if (!n.active) fail("Ya está guardado.");
        pause(n, t); log(s, dlabel(n) + " guardado. Producción pausada y cargas conservadas."); return;
      }
      case "activate": {
        const n = node(s, a.id); if (n.active) fail("Ya está activo.");
        if (used(s) >= capacity(s, t)) fail("No queda capacidad: guardá otro nodo o expandí.");
        n.active = true; n.vipSlot = used(s) > 4 + s.expansions;
        if (NODE[n.kind].cycle) n.nextAt = t + Math.max(1, n.remaining);
        if (n.crop) n.readyAt = t + n.remaining;
        delete n.pausedAt; return;
      }
      case "buyNode": {
        const d = NODE[a.key]; if (!d || level(s) < d.level) fail("Ese nodo todavía no está abierto.");
        if (s.nodes.length >= 80) fail("El cobertizo de prueba está lleno.");
        if (used(s) >= capacity(s, t)) fail("No queda capacidad: guardá otro nodo o expandí.");
        if (a.voucher === true && s.voucher > 0 && a.key !== "bronze") s.voucher--;
        else debit(s, d.price);
        const n = newNode(s.nextNode++, a.key, t);
        // Sólo el kit inicial trae cargas: comprar/reemplazar nodos no adelanta producción.
        n.charges = 0; n.vipSlot = used(s) >= 4 + s.expansions; s.nodes.push(n); return;
      }
      case "build":
        if (s.workshop) fail("La Herrería ya está construida.");
        consume(s, "madera", 2); consume(s, "piedra", 1); debit(s, 10000); s.workshop = true; log(s, "Herrería construida. Ya podés fabricar tablones y bloques."); return;
      case "tool": {
        const costs = { axe: 2000, pick: 2000, bronzePick: 80000 };
        if (!Object.hasOwn(costs, a.key) || (a.key === "bronzePick" && level(s) < 3)) fail("Herramienta no disponible.");
        const n = integer(a.qty, 20); debit(s, costs[a.key] * n); s.tools[a.key] += n; return;
      }
      case "craft": {
        if (!s.workshop) fail("Construí la Herrería primero.");
        if (!Object.hasOwn({ tablon: 1, bloque: 1 }, a.key)) fail("Receta no disponible.");
        if (s.jobs.length >= 3) fail("La fila está llena.");
        const input = a.key === "tablon" ? "madera" : "piedra";
        consume(s, input, 3);
        const duration = a.key === "tablon" ? 10 * MIN : 800000;
        const start = Math.max(t, ...s.jobs.map(x => x.until));
        s.jobs.push({ id: s.nextNode++, key: a.key, until: start + duration, duration }); return;
      }
      case "takeJob": {
        const i = s.jobs.findIndex(x => x.id === a.id); if (i < 0 || s.jobs[i].until > t) fail("La pieza todavía no está lista.");
        s.res[s.jobs[i].key]++; s.jobs.splice(i, 1); s.xp += 10; return;
      }
      case "expand": {
        if (s.expansion || s.expansions >= 16) fail("Ya hay una obra o alcanzaste el máximo.");
        const minLevel = [1, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14, 16, 18, 20, 22, 25][s.expansions];
        if (level(s) < minLevel) fail("Necesitás nivel " + minLevel + ".");
        const c = expansionCost(s); consume(s, "madera", c.madera); consume(s, "piedra", c.piedra); debit(s, c.silver);
        s.expansion = { until: t + (s.expansions + 1) * 10 * MIN }; log(s, "Obra iniciada. Al terminar ganás un cupo permanente."); return;
      }
      case "sell": {
        const n = integer(a.qty), q = quote(s, a.key, n);
        if (n > q.maxQty) fail("La demanda de este recurso se agotó por hoy.");
        if (q.total > q.budget) fail("El comprador agotó su presupuesto diario.");
        consume(s, a.key, n); s.silver += q.total; s.market.volume[a.key] = (s.market.volume[a.key] || 0) + n;
        s.market.sold[a.key] = (s.market.sold[a.key] || 0) + n; s.market.spent += q.total; return;
      }
      case "buyResource": {
        const r = RES[a.key], n = integer(a.qty); if (!r) fail("Recurso no disponible.");
        debit(s, r.ask * n); s.res[a.key] += n; return;
      }
      case "vipTrial":
        if (s.trialUsed) fail("La activación de prueba ya se utilizó en esta partida.");
        s.trialUsed = true; s.vipUntil = t + 30 * DAY; s.vipApplied = true;
        log(s, "VIP simulado por 30 días: +2 cupos y 30 unidades diarias de exportación. No hubo cobro."); return;
      case "expireVip":
        if (!vip(s, t)) fail("No hay VIP activo.");
        s.vipUntil = t; tick(s, t); return;
      case "export": {
        const w = EXPORTS[a.key], n = integer(a.qty); if (!w) fail("Ese recurso no tiene orden de exportación.");
        const quota = vip(s, t) ? 30 : 10;
        if (s.exported + w * n > quota) fail("No queda cupo personal de exportación hoy.");
        consume(s, a.key, n); s.exported += w * n; s.points += w * n * 10;
        log(s, "Entrega de prueba aceptada: +" + (w * n * 10) + " puntos sin valor real."); return;
      }
      case "settle": {
        if (!s.points) fail("Todavía no hay puntos para liquidar.");
        if (s.settlementDay === day(t)) fail("Ya liquidaste el fondo simulado de hoy.");
        // Fondo cerrado en créditos ficticios, con participación externa simulada fija y visible.
        const credit = Math.floor(40000 * s.points / (10000 + s.points));
        s.trialCredits += credit; s.points = 0; s.settlementDay = day(t);
        log(s, "Liquidación ficticia: +" + credit + " créditos de prueba. No son USDT ni pueden retirarse."); return;
      }
      case "advance": {
        if (![3 * MIN, 30 * MIN, 8 * HOUR, DAY, 30 * DAY].includes(a.ms)) fail("Salto de prueba no permitido.");
        s.offset += a.ms; tick(s, t + a.ms); log(s, "Reloj de prueba avanzado. Los tiempos por carga siguen siendo 30 y 40 minutos."); return;
      }
      default: fail("Acción desconocida.");
    }
  }
  function dlabel(n) { return NODE[n.kind].label + " #" + n.id; }
  function valid(s) {
    if (!s || s.version !== 1 || !Array.isArray(s.nodes) || s.nodes.length > 80 || !Array.isArray(s.jobs) || s.jobs.length > 3) return false;
    if (![s.revision, s.silver, s.xp, s.expansions, s.lastAt, s.offset, s.vipUntil, s.points, s.trialCredits, s.nextNode].every(x => Number.isSafeInteger(x) && x >= 0)) return false;
    if (s.expansions > 16 || !s.res || !s.tools || !s.seeds || !s.market || !s.processed || !Array.isArray(s.events)) return false;
    if (![s.voucher, s.seedDay, s.seedBought, s.exportDay, s.exported, s.market.at, s.market.day, s.market.spent].every(x => Number.isSafeInteger(x) && x >= 0)) return false;
    if (!s.market.volume || !s.market.sold || !Number.isSafeInteger(s.settlementDay) || s.settlementDay < -1) return false;
    if (![s.vipApplied, s.trialUsed, s.workshop].every(x => typeof x === "boolean")) return false;
    if (s.expansion && (!Number.isSafeInteger(s.expansion.until) || s.expansion.until < 0)) return false;
    if (!Object.keys(RES).every(k => Object.hasOwn(s.res, k)) || !Object.keys(CROP).every(k => Object.hasOwn(s.seeds, k)) || !["axe", "pick", "bronzePick"].every(k => Object.hasOwn(s.tools, k))) return false;
    if (!Object.values(s.market.volume).every(x => Number.isFinite(x) && x >= 0) || !Object.values(s.market.sold).every(x => Number.isSafeInteger(x) && x >= 0)) return false;
    if (!s.events.every(x => typeof x === "string")) return false;
    if (![...Object.values(s.res), ...Object.values(s.tools), ...Object.values(s.seeds)].every(x => Number.isSafeInteger(x) && x >= 0)) return false;
    const ids = new Set();
    for (const n of s.nodes) {
      if (!n || !Object.hasOwn(NODE, n.kind) || !Number.isSafeInteger(n.id) || ids.has(n.id) || typeof n.active !== "boolean") return false;
      ids.add(n.id);
      if (![n.nextAt, n.remaining, n.readyAt, n.charges].every(x => Number.isSafeInteger(x) && x >= 0) || n.charges > (NODE[n.kind].max || 0)) return false;
      if (n.crop && !Object.hasOwn(CROP, n.crop)) return false;
    }
    for (const j of s.jobs) {
      if (!j || !["tablon", "bloque"].includes(j.key) || ![j.id, j.until, j.duration].every(x => Number.isSafeInteger(x) && x > 0) || ids.has(j.id)) return false;
      ids.add(j.id);
    }
    if ([...ids].some(id => id <= 0 || id >= s.nextNode)) return false;
    return true;
  }
  function dispatch(original, action, wallTime) {
    try {
      if (!valid(original)) fail("El guardado de prueba no es válido. Conservá una copia antes de reiniciarlo.");
      if (action && action.op && Object.hasOwn(original.processed, action.op)) return { ok: true, duplicate: true, state: original };
      const s = clone(original), t = Math.max(s.lastAt, num(wallTime, s.lastAt) + s.offset);
      tick(s, t); reduce(s, action, t);
      s.revision++;
      if (action.op) s.processed[action.op] = s.revision;
      if (Object.keys(s.processed).length > 10000) fail("Se alcanzó el límite de operaciones de esta partida de prueba.");
      if (!valid(s) || used(s) > capacity(s, s.lastAt)) fail("La operación excede los límites de la granja.");
      return { ok: true, state: s };
    } catch (e) { return { ok: false, error: e.message, state: original }; }
  }
  return Object.freeze({ MIN, HOUR, DAY, UNIT, NODE, CROP, RES, EXPORTS, create, tick, quote, capacity, used, level, vip, expansionCost, dispatch, valid });
});
