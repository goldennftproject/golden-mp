/* EL PORTERO DEL GUARDADO: LAS REGLAS, PROBADAS CON GUARDADOS DE VERDAD (21/8)
   La Edge Function es UN solo archivo (el editor del dashboard no empaqueta dos), así que
   este test extrae el bloque === REGLAS === de supabase/functions/guardar/index.ts y lo
   EJECUTA tal cual: lo que se prueba es exactamente lo que se deploya, sin copia aparte
   que pueda desviarse. Guardados de jugadores honestos y de tramposos de consola.
   El contrato del modo sombra: al honesto, CERO sospechas (un falso positivo en modo rechazo
   le rompería la partida); al de G.res.madera = 999999, cantarlo con nombre y apellido.
     node tools/test-portero-reglas.js                                                          */
const fs = require("fs"), vm = require("vm");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

(async () => {
  const fuente = fs.readFileSync("supabase/functions/guardar/index.ts", "utf8");
  const m = fuente.match(/\/\* === REGLAS ===[\s\S]*?\*\/([\s\S]*?)\/\* === FIN REGLAS === \*\//);
  ok("(arnés) el bloque === REGLAS === existe en index.ts", !!m);
  if (!m) { console.log("\n1 fallo(s)\n"); process.exit(1); }
  const ctx = { Math, isFinite, String, Object, Set, JSON };
  vm.createContext(ctx);
  vm.runInContext(m[1] + "\nthis.evaluarGuardado = evaluarGuardado; this.MODO = MODO; this.VERSION = VERSION; this.mercadoPermiso = mercadoPermiso; this.protegerDoma = protegerDoma; this.premiumReloj = premiumReloj; this.protegerEconomia = protegerEconomia;", ctx);
  const { evaluarGuardado, MODO, VERSION, mercadoPermiso, protegerDoma, premiumReloj, protegerEconomia } = ctx;
  const HORA = 3600;

  console.log("\nEL CONTRATO DEL ESCALÓN 1: MODO SOMBRA, VERSIONADO");
  ok("las reglas están en modo RECHAZO desde el 14/9 (proyecto nuevo, P2P abierto)", MODO === "rechazo", MODO);
  ok("y llevan versión (la bitácora anota cuál evaluó)", VERSION >= 2, "v" + VERSION);

  console.log("\nDOMA, MORRAL Y RESERVA DE ALIMENTO");
  {
    const ahora = Date.now(), dia = 86400000;
    const plato = { kind: "dish", k: "galletita_cereza", n: 1 };
    const cont = { c: "backpack", items: [{ c: "bag", items: [plato] }] };
    const antes = { level: 10, cont, zonaViaje: { t: ahora - 60000 }, stats: { matar: { rata: 2 } } };
    const doma = { bicho: "rata", desde: ahora - 1000, comidaHasta: ahora - 1000 + dia, cont: 0, ultimo: null };
    const domada = { ...antes, cont: { c: "backpack", items: [{ c: "bag", items: [] }] }, stats: { matar: { rata: 3 } }, visto: ahora, doma };
    const validar = (a, b) => {
      const errores = [];
      protegerDoma(a, b, ahora, errores);
      return errores;
    };
    ok("admite domar con el plato gastado en una bolsa dentro de la mochila", validar(antes, domada).length === 0);
    ok("rechaza la adopción si el plato sigue en la mochila", validar(antes, { ...domada, cont }).length === 1);
    ok("rechaza la adopción si no consta una derrota nueva de esa especie", validar(antes, { ...domada, stats: antes.stats }).length === 1);
    const granja = { level: 10, dishes: { galletita_cereza: 1 }, stats: antes.stats };
    const regreso = { ...domada, cont: null, zonaViaje: null, zonaCdHasta: ahora, res: { carne: 1 } };
    ok("viajar, domar y volver caben en un único guardado", validar(granja, regreso).length === 0);
    const alimentada = { ...regreso, res: { carne: 0 }, doma: { ...doma, comidaHasta: doma.comidaHasta + dia } };
    ok("alimentar una vez consume una carne y suma un día", validar(regreso, alimentada).length === 0);
    ok("rechaza alimentar en la granja sin gastar la carne", validar(regreso, { ...alimentada, res: regreso.res }).length === 1);
  }
  {
    const ahora = Date.now(), ciclo = 1800000, key = "tree:0,1#86";
    const visto = ahora - 1.5 * ciclo;
    const antes = { visto, doma: { bicho: "orco", cont: 6, comidaHasta: ahora + ciclo }, nodos: { [key]: { readyAt: ahora - 2 * ciclo, cdIni: ahora - 3 * ciclo } } };
    const despues = { doma: { bicho: "orco", cont: 7, ultimo: { at: ahora, madera: 0, piedra: 0, fee: 1 } }, nodos: { [key]: { readyAt: ahora - ciclo, cdIni: ahora - 2 * ciclo } } };
    const errores = [];
    premiumReloj(antes, despues, 86, { key, type: "tree" }, ahora, errores, visto);
    ok("acepta el reloj Golden cuando el ayudante se llevó una sola carga de comisión", errores.length === 0);
    const pausada = { ...despues, doma: null, domaColeccion: { v: 1, activa: null, activaDesde: 0, criaturas: { orco: despues.doma } } };
    premiumReloj(antes, pausada, 86, { key, type: "tree" }, ahora, errores, visto);
    ok("el reloj Golden conserva el turno del ayudante que ahora descansa", errores.length === 0);
  }
  {
    const dia = 86400000;
    let reloj = Date.UTC(2026, 10, 22, 12);
    class Fecha extends Date { static now() { return reloj; } }
    const silencio = () => {};
    const cliente = vm.createContext({
      Date: Fecha, console: { log: silencio, warn: silencio, error: silencio, info: silencio },
      performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval: silencio,
      location: { hash: "", search: "" }, localStorage: { getItem: () => null, setItem: silencio, removeItem: silencio },
      document: { getElementById: () => null, addEventListener: silencio, querySelectorAll: () => [] },
    });
    cliente.window = cliente;
    for (const f of ["config", "nav", "state", "save"]) vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), cliente);
    for (const f of ["toast", "log", "refreshHud", "saveFarm", "syncSlots", "refreshBarn", "recalcFarmLevel"]) cliente[f] = silencio;
    cliente.isOpen = () => false;
    const copiar = valor => JSON.parse(JSON.stringify(valor));
    const capturar = () => copiar(cliente.snapshot());
    const validar = (a, b) => {
      const errores = [];
      protegerDoma(a, b, reloj, errores);
      return errores;
    };
    const confirmar = (a, b, base = reloj - 1000) => {
      const aceptado = copiar(b);
      const errores = protegerEconomia(copiar(a), aceptado, reloj, base);
      return errores.length === 0 && cliente.guardadoMismoContenido(
        { body: { data: b, base: new Date(base).toISOString() } },
        { data: aceptado, updated_at: new Date(reloj).toISOString() }
      );
    };
    const G = cliente.G;
    cliente.domaCargar({ doma: { bicho: "larva", desde: reloj - dia, comidaHasta: reloj + dia, cont: 0, ultimo: null } });
    G.level = 10;
    G.res.carne = 3;
    cliente.GF.scene = "forest";
    G.cont = cliente.contCrear("backpack");
    const bolsa = cliente.contCrear("bag");
    cliente.contMeter(bolsa, "dish", "bocado_domador", 2);
    cliente.contMeterBolsa(G.cont, bolsa);
    cliente.zonaEntrar();
    const anterior = capturar();
    delete anterior.domaColeccion;
    reloj += 60000;
    for (const bicho of ["orco", "troll"]) {
      cliente.statAdd("matar", bicho);
      ok("el cliente doma " + bicho + " sin reemplazar la larva", cliente.domaIntentar(bicho, () => 0) === true);
    }
    const domadas = capturar();
    ok("confirma la migración y dos adopciones reales con dos platos de la mochila", confirmar(anterior, domadas) && domadas.doma.bicho === "larva");
    const unPlato = copiar(anterior);
    unPlato.cont.items.find(pila => pila.c === "bag").items[0].n = 1;
    ok("dos especies del mismo plato exigen pagar ambos en el mismo guardado", validar(unPlato, domadas).some(s => /plato/.test(s)));
    const desaparecida = copiar(domadas);
    delete desaparecida.domaColeccion.criaturas.troll;
    ok("impide perder una criatura ya confirmada", validar(domadas, desaparecida).some(s => /conservan/.test(s)));
    const aliasViejo = { ...domadas, doma: null };
    ok("rechaza un alias que contradice a la colección", validar(domadas, aliasViejo).some(s => /activo/.test(s)));
    const sinDomar = copiar(domadas);
    sinDomar.domaColeccion.activa = "rata";
    ok("sólo se puede activar una criatura de la colección", validar(domadas, sinDomar).some(s => /colección/.test(s)));
    const hijaDeOtro = copiar(domadas);
    hijaDeOtro.domaColeccion.criaturas.orco.desde -= 1;
    ok("conserva la identidad de la criatura confirmada", validar(domadas, hijaDeOtro).some(s => /conservan/.test(s)));
    reloj += 1000;
    cliente.zonaSalir(false);
    cliente.GF.scene = "farm";
    const granja = capturar();
    ok("la partida real vuelve a la granja y confirma la colección intacta", confirmar(domadas, granja));
    reloj += 1000;
    cliente.domaAlimentar();
    cliente.domaElegir("orco");
    cliente.domaAlimentar();
    const alimentadas = capturar();
    ok("dos raciones y un cambio de ayudante confirman en un guardado", confirmar(granja, alimentadas) &&
      alimentadas.res.carne === 1 && alimentadas.doma.bicho === "orco");
    const unaCarne = { ...alimentadas, res: { ...alimentadas.res, carne: 2 } };
    ok("dos criaturas no pueden usar la misma carne", validar(granja, unaCarne).some(s => /carne/.test(s)));
    const pestañaAnterior = copiar(alimentadas);
    delete pestañaAnterior.domaColeccion;
    pestañaAnterior.doma.comidaHasta += dia;
    pestañaAnterior.res.carne = 0;
    ok("la pestaña anterior puede alimentar al activo y conserva las otras criaturas",
      validar(alimentadas, pestañaAnterior).length === 0 && pestañaAnterior.domaColeccion?.criaturas.troll?.bicho === "troll" &&
      pestañaAnterior.domaColeccion.criaturas.orco.comidaHasta === pestañaAnterior.doma.comidaHasta);
    cliente.domaElegir(null);
    const descanso = capturar();
    ok("guardar el descanso conserva las especies y sus reservas", confirmar(alimentadas, descanso) &&
      descanso.doma === null && descanso.domaColeccion.activa === null && Object.keys(descanso.domaColeccion.criaturas).length === 3);

    const baseNodo = copiar(descanso);
    const indexNodo = 86, ciclo = 1800000;
    const nodo = ctx.premiumMundo(baseNodo).objects[indexNodo];
    baseNodo.nodos = { [nodo.key]: { readyAt: reloj - 2 * ciclo, cdIni: reloj - 3 * ciclo, halfAt: 0 } };
    // El mismo soporte comprado y colocado que recibe un jugador real.
    baseNodo.produccion.premium = { v: 1, compras: [{
      id: "11111111-1111-4111-8111-111111111111", tipo: "tree", coste: 1, desde: reloj - dia, nodo: indexNodo,
    }] };
    baseNodo.produccion.nodos[indexNodo] = true;
    const celdas = Array.from({ length: 49 }, (_, i) => ({
      cx: (i % 7 + nodo.width / 2) * 42, by: (Math.floor(i / 7) + 1) * 42,
    }));
    baseNodo.layout[indexNodo] = celdas.find(pos => ctx.premiumSitio(baseNodo, nodo, pos));
    reloj += 1000;
    const tarea = copiar(baseNodo);
    tarea.visto = reloj;
    tarea.energiaGranja.actual -= 1;
    tarea.domaColeccion.activa = "orco";
    tarea.domaColeccion.activaDesde = reloj - 250;
    tarea.doma = tarea.domaColeccion.criaturas.orco;
    tarea.doma.trabajos = { [indexNodo]: { n: 1, at: reloj - 100 } };
    tarea.res.madera = 1;
    tarea.nodos[nodo.key] = { readyAt: reloj - 100 - ciclo, cdIni: reloj - 100 - 2 * ciclo, halfAt: 0 };
    ok("el primer trabajo Golden y la elección del ayudante confirman juntos con carga real", confirmar(baseNodo, tarea));
    const entreCambios = copiar(tarea);
    entreCambios.domaColeccion.criaturas.orco.trabajos[indexNodo].activaDesde = reloj - 250;
    entreCambios.domaColeccion.activa = "larva";
    entreCambios.domaColeccion.activaDesde = reloj - 10;
    entreCambios.doma = entreCambios.domaColeccion.criaturas.larva;
    ok("el trabajo del ayudante intermedio se conserva al cambiar en el mismo guardado", confirmar(baseNodo, entreCambios));
    ok("una lectura idéntica del trabajo no consume otra carga", confirmar(tarea, tarea));
    const estadoInvalido = (mutar, anterior=baseNodo) => {
      const mod = copiar(tarea);
      mutar(mod);
      if (mod.doma) mod.doma = mod.domaColeccion.criaturas[mod.doma.bicho];
      return protegerEconomia(copiar(anterior), mod, reloj, reloj - 1000).some(e => e.includes("ayudante") || e.includes("reloj"));
    };
    ok("el trabajo necesita retirar realmente una carga", estadoInvalido(n => {
      n.nodos[nodo.key] = copiar(baseNodo.nodos[nodo.key]);
    }));
    ok("un solo reloj drenado no acredita más de una carga", estadoInvalido(n => {
      n.domaColeccion.criaturas.orco.trabajos[indexNodo].n = 2;
    }));
    const hambriento = copiar(baseNodo);
    hambriento.domaColeccion.criaturas.orco.comidaHasta = reloj - 101;
    ok("un ayudante actuando con comida vencida no acredita carga", estadoInvalido(n => {
      n.domaColeccion.criaturas.orco.comidaHasta = reloj - 101;
    }, hambriento));
    ok("el ayudante reserva una carga para el jugador", estadoInvalido(n => {
      n.nodos[nodo.key] = { readyAt: reloj + ciclo, cdIni: reloj, halfAt: 0 };
    }));
    const eliminado = copiar(tarea);
    delete eliminado.domaColeccion.criaturas.orco.trabajos;
    eliminado.doma = eliminado.domaColeccion.criaturas.orco;
    ok("el guardado conserva el contador de trabajos que ya está aceptado",
      protegerEconomia(copiar(tarea), eliminado, reloj, reloj).some(s => /ayudante/.test(s)));

    const desdeAusencia = reloj;
    const noche = copiar(tarea);
    const panza = desdeAusencia + 6 * ciclo;
    noche.domaColeccion.criaturas.orco.comidaHasta = panza;
    noche.doma = noche.domaColeccion.criaturas.orco;
    const vuelta = copiar(noche);
    const recuperado = vuelta.nodos[nodo.key];
    const orco = vuelta.domaColeccion.criaturas.orco;
    vuelta.doma = orco;
    let cargas = 0;
    for (reloj = desdeAusencia; reloj < panza; reloj += ciclo) {
      if (cliente.nodoCargas(recuperado, ciclo / 1000) <= 1) continue;
      cliente.nodoGastarCarga(recuperado, ciclo / 1000);
      orco.trabajos[indexNodo] = { n: orco.trabajos[indexNodo].n + 1, at: reloj, activaDesde: vuelta.domaColeccion.activaDesde };
      cargas++;
    }
    reloj += 4 * ciclo;
    vuelta.visto = reloj;
    vuelta.res.madera += cargas;
    vuelta.energiaGranja.actual -= cargas;
    ok("se aceptan cargas de varios ciclos hechos durante la ausencia antes de quedar con hambre",
      cargas > 4 && confirmar(noche, vuelta, desdeAusencia));

    const fecha = () => new Date(reloj).toISOString().slice(0, 10);
    cliente.domaCargar({ doma: { bicho: "rata", comidaHasta: reloj + 2 * dia, desde: reloj - dia } });
    G.excav = { dia: fecha(), hechos: [0] };
    const ratAntes = capturar(), sello = reloj;
    reloj += dia;
    G.excav = { dia: fecha(), hechos: [0, 1] };
    G.res.lombriz = 4;
    G.doma.ultimo = { at: reloj, lombriz: 4 };
    const ratDespues = capturar(), reciboRata = {};
    ctx.actividadActualizar(copiar(ratAntes), copiar(ratDespues), reloj, reciboRata, false, sello);
    ok("la bolsa y el consumo de montículos pueden confirmarse al volver en otro día",
      confirmar(ratAntes, ratDespues, sello) && evaluarGuardado(ratAntes, ratDespues, dia / 1000).sospechas.length === 0);
    ok("las lombrices del ayudante no acreditan una acción manual de minería", reciboRata.mine === 0);
    cliente.estadoDeCero();
    G.reinicio = reloj + 1;
    ok("un reinicio conforme al guardado existente borra la colección", validar(descanso, capturar()).length === 0);
  }

  /* ═══ EL MERCADO, QUE EL PORTERO NO CONOCÍA HASTA EL 15/9 ════════════════════════════
     El P2P se abrió el 14/9 y el portero pasó a "rechazo" el MISMO día: nunca habían
     corrido juntos. Un maíz del mercado vale 1.200 de plata y el techo de un guardado
     rápido es ~2.084, así que cobrar DOS ventas rechazaba el guardado y porteroRechazo()
     devolvía la granja al estado anterior — con el ítem ya entregado al comprador. Ley 1.
     Estos casos son la partida de verdad, no el caso feliz. */
  console.log("\nEL MERCADO NO LE HACE PERDER LA PARTIDA A NADIE");
  const YO = "uid-yo", OTRO = "uid-otro";
  const permisoDe = (filas, ack, prev, next) => mercadoPermiso(YO, filas, ack, prev, next).permiso;
  {
    /* vendió un maíz y un cuero, y los cobra los dos seguidos: +2.360 en un minuto */
    const filas = [
      { seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 1, price: 1200, paid: true },
      { seller: YO, sold_to: OTRO, kind: "res", item: "cuero", qty: 1, price: 1160, paid: true },
    ];
    const antes = { plata: 300, res: {} }, despues = { plata: 2660, res: {} };
    const sinMercado = evaluarGuardado(antes, despues, 60);
    ok("(el agujero) sin mirar el mercado, cobrar dos ventas se rechazaba",
      sinMercado.sospechas.some(s => /plata imposible/.test(s)), sinMercado.sospechas.join(" · "));
    const r = evaluarGuardado(antes, despues, 60, permisoDe(filas, null, antes, despues));
    ok("mirando el mercado, el vendedor cobra tranquilo", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* el MISMO permiso no se gasta dos veces: cobró ayer, hoy inventa la misma plata */
    const filas = [{ seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 9, price: 9000, paid: true }];
    const ack = mercadoPermiso(YO, filas, null, null, {}).ack;
    const r = evaluarGuardado({ plata: 1500, res: {} }, { plata: 10500, res: {} }, 60, permisoDe(filas, ack, null, null));
    ok("y la venta ya contada NO vuelve a dar permiso", r.sospechas.some(s => /plata imposible/.test(s)),
      r.sospechas.join(" · "));
  }
  {
    /* comprar 300 de madera: el techo de madera de un guardado rápido es ~102 */
    const filas = [{ seller: OTRO, sold_to: YO, kind: "res", item: "madera", qty: 300, price: 900, paid: false }];
    const antes = { plata: 2000, res: { madera: 20 } }, despues = { plata: 1100, res: { madera: 320 } };
    ok("(el agujero) comprar 300 de madera se rechazaba",
      evaluarGuardado(antes, despues, 60).sospechas.some(s => /madera imposible/.test(s)));
    const r = evaluarGuardado(antes, despues, 60, permisoDe(filas, null, antes, despues));
    ok("el comprador recibe su madera sin sospecha", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* RETIRAR lo publicado: la fila se BORRA, así que el permiso sale de comparar con lo
       que el portero tenía anotado como « en venta » en el guardado anterior */
    const antes = [{ seller: YO, sold_to: null, kind: "res", item: "piedra", qty: 400, price: 800, paid: false }];
    const ack = mercadoPermiso(YO, antes, null, null, {}).ack;
    const a = { plata: 10, res: { piedra: 5 } }, d = { plata: 10, res: { piedra: 405 } };
    ok("(el agujero) retirar tu propia publicación se rechazaba",
      evaluarGuardado(a, d, 60).sospechas.some(s => /piedra imposible/.test(s)));
    const r = evaluarGuardado(a, d, 60, permisoDe([], ack, a, d));
    ok("retirar lo tuyo te lo devuelve sin sospecha", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* la compra que no entró en la bolsa y quedó en pendientes: entra días después */
    const a = { plata: 10, res: { madera: 0 }, mkPend: [{ kind: "res", item: "madera", qty: 250 }] };
    const d = { plata: 10, res: { madera: 250 }, mkPend: [] };
    const r = evaluarGuardado(a, d, 60, permisoDe([], { ventas: 0, compras: { madera: 250 }, abiertas: {} }, a, d));
    ok("y reclamar una entrega pendiente tampoco dispara nada", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* el tramposo sigue cantando: sin filas en el mercado no hay permiso que valga */
    const r = evaluarGuardado({ plata: 500, res: {} }, { plata: 5000000, res: {} }, 600, permisoDe([], null, null, null));
    ok("sin ventas de verdad, la plata inventada sigue cantando", r.sospechas.some(s => /plata imposible/.test(s)));
    const r2 = evaluarGuardado({ res: { madera: 10 }, plata: 0 }, { res: { madera: 999999 }, plata: 0 }, 60,
      permisoDe([{ seller: OTRO, sold_to: YO, kind: "res", item: "madera", qty: 20, price: 50, paid: false }], null, null, null));
    ok("y una compra chica no tapa un 999.999 de madera", r2.sospechas.some(s => /madera imposible/.test(s)));
  }
  {
    /* el permiso mira DE QUIÉN es cada fila: las ventas ajenas no acreditan nada */
    const filas = [{ seller: OTRO, sold_to: "uid-tercero", kind: "res", item: "maiz", qty: 1, price: 9000, paid: true }];
    ok("las ventas de otro no me dan permiso a mí", permisoDe(filas, null, null, null).plata === 0);
    const soloVendida = [{ seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 1, price: 1200, paid: false }];
    ok("y una venta vendida pero SIN cobrar tampoco (la plata entra al cobrar)",
      permisoDe(soloVendida, null, null, null).plata === 0);
  }
  {
    /* el arnés de la migración: si falta correr el SQL, el portero es MÁS permisivo, no menos */
    const filas = [{ seller: YO, sold_to: OTRO, kind: "res", item: "maiz", qty: 1, price: 1200, paid: true }];
    ok("sin cuaderno (ack null) el permiso existe igual: estrenar el sistema no rechaza a nadie",
      permisoDe(filas, null, null, null).plata === 1200);
  }

  console.log("\nEL JUGADOR HONESTO PASA LIMPIO");
  {
    const antes = { plata: 500, golden: 2, level: 8, expansiones: 2, res: { madera: 30, piedra: 22, bronce: 4 } };
    /* 3 horas después: cosechó, vendió, taló sus 5 árboles con cargas llenas */
    const despues = { plata: 1400, golden: 2, level: 9, expansiones: 3, res: { madera: 70, piedra: 50, bronce: 6 } };
    const r = evaluarGuardado(antes, despues, 3 * HORA);
    ok("una tarde de juego real: CERO sospechas", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
    ok("y el delta queda anotado para la bitácora", r.delta.plata === 900 && r.delta["res.madera"] === 40,
      JSON.stringify(r.delta));
  }
  {
    const r = evaluarGuardado(null, { plata: 25, level: 1, res: { madera: 5 } }, 0);
    ok("el jugador nuevo (sin guardado anterior) pasa limpio", r.sospechas.length === 0);
  }
  {
    /* dos guardados PEGADOS (autosave + cierre de pestaña): el piso de 30 s evita el falso positivo */
    const antes = { plata: 100, res: { madera: 10 } };
    const r = evaluarGuardado(antes, { plata: 130, res: { madera: 12 } }, 2);
    ok("dos guardados con 2 s de diferencia no disparan nada", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }
  {
    /* una semana sin entrar y volvió con TODO acumulado (cargas + venta del stock) */
    const antes = { plata: 2000, res: { madera: 100, piedra: 80 } };
    const r = evaluarGuardado(antes, { plata: 9000, res: { madera: 240, piedra: 200 } }, 7 * 24 * HORA);
    ok("volver tras una semana con las cargas llenas: limpio", r.sospechas.length === 0, r.sospechas.join(" · ") || "limpio");
  }

  console.log("\nEL TRAMPOSO DE CONSOLA CANTA");
  {
    const antes = { plata: 500, res: { madera: 30 } };
    const r = evaluarGuardado(antes, { plata: 500, res: { madera: 999999 } }, 60);
    ok("G.res.madera = 999999 y guardar al minuto: sospecha con nombre",
      r.sospechas.some(s => /madera imposible/.test(s)), r.sospechas.join(" · "));
  }
  {
    const antes = { plata: 500, res: {} };
    const r = evaluarGuardado(antes, { plata: 5000000, res: {} }, 10 * 60);
    ok("plata imposible en 10 minutos: sospecha", r.sospechas.some(s => /plata imposible/.test(s)), r.sospechas.join(" · "));
  }
  {
    const antes = { level: 3, plata: 0, res: {} };
    const r = evaluarGuardado(antes, { level: 50, plata: 0, res: {} }, 20 * 60);
    ok("del nivel 3 al 50 en 20 minutos: sospecha", r.sospechas.some(s => /nivel/.test(s)), r.sospechas.join(" · "));
  }
  {
    const antes = { res: { oro: 2 }, plata: 0 };
    const r = evaluarGuardado(antes, { res: { oro: 400 }, plata: 0 }, 2 * HORA);
    ok("+398 de oro con UNA veta de 14 h: sospecha", r.sospechas.some(s => /oro imposible/.test(s)), r.sospechas.join(" · "));
  }
  {
    const r = evaluarGuardado({ plata: 10, res: {} }, { plata: NaN, res: { madera: -5 } }, 60);
    ok("NaN y recursos negativos: sospecha doble",
      r.sospechas.some(s => /inválido en plata/.test(s)) && r.sospechas.some(s => /recurso inválido madera/.test(s)),
      r.sospechas.join(" · "));
  }
  {
    const r = evaluarGuardado({ plata: 10, res: {} }, { plata: 10, res: {} }, -300);
    ok("el reloj hacia atrás: sospecha", r.sospechas.some(s => /reloj/.test(s)), r.sospechas.join(" · "));
  }
  {
    const r = evaluarGuardado({ plata: 1, res: {} }, null, 60);
    ok("un snapshot nulo no revienta: sospecha y a otra cosa", r.sospechas.length === 1, r.sospechas.join(" · "));
  }

  console.log("\nY EL BOTÓN DE PRUEBAS DEL EQUIPO — AVISO PARA EL LANZAMIENTO");
  {
    /* el 🧪 regala 1000+1000 al instante: en modo sombra queda ANOTADO (bien, somos nosotros);
       el día que MODO pase a "rechazo", este botón muere o se protege por cuenta — ya está
       apuntado en ui.js. Este test lo deja escrito también acá. */
    const antes = { plata: 0, res: { madera: 10, piedra: 10 } };
    const r = evaluarGuardado(antes, { plata: 0, res: { madera: 1010, piedra: 1010 } }, 60);
    ok("el kit del equipo dispara sospechas (como debe: es la demo del agujero)",
      r.sospechas.length >= 2, r.sospechas.join(" · "));
  }

  console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el honesto ni se entera, el tramposo queda anotado.\n");
  process.exit(fallos ? 1 : 0);
})();
