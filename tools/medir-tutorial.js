/* ¿CUÁNTO SE TARDA EN HACER EL TUTORIAL Y CUÁNTO DE ESO ES TIEMPO MUERTO? (18/8, dirección)
   Con los relojes NUEVOS (árbol 30 min, roca 40 min). Todo se lee del juego: si mañana cambia un
   coste o un reloj, este número cambia solo.
     node tools/medir-tutorial.js                                                                  */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON };
ctx.window = ctx; ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={TUTO_STEPS,BUILD_DEF,CROP_DEF,RECIPE_DEF,CD,GOLPES_TALAR,GOLPES_MINAR," +
  "NIVEL_ARBOLES,NIVEL_ROCAS,NODE_UNLOCK_COSTS,G,skillNeed,nodoXpMin,TOOL_CRAFT,FARM_XP_LVLS,PRICE,FARM_PARCELA,ARM_DEF,ARMA_ENTRADA};",
  ctx, { filename: "state.js" });
const X = ctx.__X, CD = X.CD;

/* Lo que cuesta EN MANO cada gesto. Las acciones del juego duran 0 s (ACT_DUR), o sea que el
   tiempo activo es puro tocar: reacción + apuntar. 0,8 s por clic y 2 s para cambiar de nodo. */
const S_CLIC = 0.8, S_VIAJE = 2, S_PANEL = 4;

const NIV_ARB = X.NIVEL_ARBOLES, NIV_ROC = X.NIVEL_ROCAS, UNLOCK = X.NODE_UNLOCK_COSTS;

/* OJO CON EL NIVEL (18/8): talar da XP de ARTESANÍA y picar de MINERÍA, pero el NIVEL DE GRANJA
   —el que habilita el 3er árbol, el 4º…— solo sube con XP de CULTIVO (FARM_XP_LVLS contra
   G.skills.farming). O sea: por mucha madera que juntes, no abrís un árbol nuevo talando. El único
   camino es plantar. Por eso hay dos jugadores muy distintos que medir. */
function nivelGranja(xpCultivo) {
  const L = X.FARM_XP_LVLS; let n = 1;
  while (L[n + 1] != null && xpCultivo >= L[n + 1]) n++;
  return n;
}
function simular(rellena) {
  let t = 0, activo = 0, muerto = 0;
  let madera = 0, piedra = 0, plata = X.G.plata, xpCult = 0, nivel = 1;
  // se leen del juego: si mañana cambia el arranque, este número cambia solo
  let arboles = (X.G.treesOpen || [0]).length, rocas = (X.G.rocksOpen || [0]).length;
  let parcelas = X.G.plotsOwned || 3, papasEnMano = 0;
  const libreArb = Array(arboles).fill(0), libreRoc = Array(rocas).fill(0);
  const bitacora = [];
  const papa = X.CROP_DEF.papa;

  const abrirNodos = () => {
    while (arboles < NIV_ARB.length && NIV_ARB[arboles] <= nivel) {
      libreArb.push(t); arboles++;   // los del NIVEL son regalo al baúl (regalosSync): no cuestan madera
      bitacora.push(["nodo", t, "árbol nº" + arboles + " (regalo de nivel)"]);
    }
    while (rocas < NIV_ROC.length && NIV_ROC[rocas] <= nivel) {
      libreRoc.push(t); rocas++;
      bitacora.push(["nodo", t, "roca nº" + rocas + " (regalo de nivel)"]);
    }
  };
  // una vuelta de papas: plantar todas las parcelas, esperar, cosechar. Devuelve los segundos.
  const vueltaDePapas = (esperando) => {
    plata -= parcelas * papa.seedCost;
    const cl = parcelas * S_CLIC + (parcelas - 1) * S_VIAJE;
    activo += S_PANEL + cl; t += S_PANEL + cl;                 // comprar + plantar
    if (esperando) { muerto += papa.grow; } else { muerto += papa.grow; }
    t += papa.grow;
    activo += cl; t += cl;                                      // cosechar
    papasEnMano += parcelas;
    xpCult += parcelas * (5 + papa.xp);
    const antes = nivel; nivel = nivelGranja(xpCult);
    if (nivel > antes) {
      bitacora.push(["nivel", t, "granja nivel " + nivel]);
      let p = X.G.plotsOwned || 3; for (const k in X.FARM_PARCELA) if (nivel >= +k) p = X.FARM_PARCELA[k];
      if (p > parcelas) { bitacora.push(["parcela", t, "el nivel regala parcelas: " + parcelas + " → " + p]); parcelas = p; }
    }
    abrirNodos();
  };
  const vender = () => { if (!papasEnMano) return; activo += S_PANEL + S_CLIC; t += S_PANEL + S_CLIC;
                         plata += papasEnMano * papa.price; papasEnMano = 0; };
  // junta n unidades; si `rellena`, mientras espera el nodo hace vueltas de papa (el hueco se llena)
  const juntar = (clase, n) => {
    const libres = clase === "tree" ? libreArb : libreRoc;
    const golpes = clase === "tree" ? X.GOLPES_TALAR : X.GOLPES_MINAR;
    const cd = clase === "tree" ? CD.tree : CD.rock;
    let tengo = 0;
    while (tengo < n) {
      libres.sort((a, b) => a - b);
      while (libres[0] > t) {
        const hueco = libres[0] - t;
        if (rellena && hueco > papa.grow + 20) { vueltaDePapas(true); if (papasEnMano >= 12) vender(); }
        else { muerto += hueco; t = libres[0]; }
      }
      let hechos = 0;
      for (let k = 0; k < libres.length && tengo < n; k++) {
        if (libres[k] > t) continue;
        const g = golpes * S_CLIC + (hechos ? S_VIAJE : 0);
        activo += g; t += g;
        libres[k] = t + cd; tengo++; hechos++;
      }
      abrirNodos();
    }
    if (clase === "tree") madera += tengo; else piedra += tengo;
  };
  const gesto = (s, etq) => { activo += s; t += s; if (etq) bitacora.push(["hacer", t, etq]); };
  const esperar = (s, etq) => { muerto += s; t += s; if (etq) bitacora.push(["esperar", t, etq]); };

  gesto(S_VIAJE + S_CLIC, "abrir el baúl (kit)");
  gesto(S_PANEL + 3 * S_CLIC, "comprar 3 semillas de papa"); plata -= 3;
  gesto(3 * S_CLIC + 2 * S_VIAJE, "plantar 3 papas");
  esperar(papa.grow, "que crezcan las papas");
  gesto(3 * S_CLIC + 2 * S_VIAJE, "cosechar 3 papas"); papasEnMano += 3;
  xpCult += 3 * (5 + papa.xp); nivel = nivelGranja(xpCult); abrirNodos();
  vender();

  const obras = [["store", "Herrería"], ["horno", "Horno"], ["cocina", "Cocina"]];
  for (const [id, nombre] of obras) {
    gesto(S_VIAJE + 2 * S_CLIC, "colocar el plano de la " + nombre);
    const cm = X.BUILD_DEF[id].cost.madera || 0, cp = X.BUILD_DEF[id].cost.piedra || 0;
    let t0 = t; if (madera < cm) juntar("tree", cm - madera);
    bitacora.push(["juntar", t, cm + " madera para la " + nombre + " → " + Math.round((t - t0) / 60) + " min"]);
    t0 = t; if (piedra < cp) juntar("rock", cp - piedra);
    bitacora.push(["juntar", t, cp + " piedra para la " + nombre + " → " + Math.round((t - t0) / 60) + " min"]);
    madera -= cm; piedra -= cp;
    gesto(S_VIAJE + 2 * S_CLIC, "depositar en la obra de la " + nombre);
    if (id === "horno") { gesto(S_PANEL + S_CLIC, "craftear el Hacha"); plata -= X.TOOL_CRAFT.axe.plata; }
  }
  if (!papasEnMano) { gesto(S_PANEL + S_CLIC, "comprar 1 semilla"); gesto(S_CLIC + S_VIAJE, "plantarla");
                      esperar(papa.grow, "que crezca la papa del plato"); gesto(S_CLIC, "cosecharla"); }
  gesto(S_PANEL + S_CLIC, "poner a cocinar la Papa Asada");
  esperar(X.RECIPE_DEF.papa_asada.cookS, "que se cocine la Papa Asada");
  gesto(S_PANEL + 2 * S_CLIC, "comerla");
  return { t, activo, muerto, nivel, arboles, rocas, bitacora, plata };
}

const hm = s => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return (h ? h + " h " : "") + m + " min"; };

console.log("TUTORIAL COMPLETO — con los relojes nuevos (árbol " + CD.tree / 60 + " min · roca " + CD.rock / 60 + " min)\n");
/* 19/8: la cadena ya no son solo los tres edificios — desde que el tutorial enseña a forjar y
   equipar la Espada de Madera, sus 5 de madera también hay que juntarlos. Se suma acá o el número
   de arriba se queda corto y la medición miente por lo bajo. */
const espada = (X.ARM_DEF && X.ARMA_ENTRADA && X.ARM_DEF[X.ARMA_ENTRADA]) ? X.ARM_DEF[X.ARMA_ENTRADA].cost : {};
console.log("materiales que pide la cadena: " +
  (X.BUILD_DEF.store.cost.madera + X.BUILD_DEF.horno.cost.madera + X.BUILD_DEF.cocina.cost.madera + (espada.madera || 0)) + " madera y " +
  (X.BUILD_DEF.store.cost.piedra + X.BUILD_DEF.horno.cost.piedra + X.BUILD_DEF.cocina.cost.piedra + (espada.piedra || 0)) + " piedra" +
  (espada.madera ? "  (incluye la Espada de Madera: " + espada.madera + ")" : ""));
console.log("de arranque: " + (X.G.treesOpen||[0]).length + " árboles (1 madera / " + CD.tree/60 + " min), " + (X.G.rocksOpen||[0]).length + " rocas (1 piedra / " + CD.rock/60 + " min) y " + (X.G.plotsOwned||3) + " parcelas\n");

for (const [nombre, rel] of [["EL QUE SOLO HACE LO QUE PIDE EL TUTORIAL", false],
                             ["EL QUE LLENA LA ESPERA PLANTANDO PAPAS", true]]) {
  const r = simular(rel);
  console.log("── " + nombre + " ──");
  console.log("   duración total .......... " + hm(r.t));
  console.log("   con las manos en el juego " + hm(r.activo) + "   (" + (100 * r.activo / r.t).toFixed(1) + "%)");
  console.log("   TIEMPO MUERTO ........... " + hm(r.muerto) + "   (" + (100 * r.muerto / r.t).toFixed(1) + "%)");
  console.log("   termina en granja nivel " + r.nivel + ", con " + r.arboles + " árboles y " + r.rocas + " rocas\n");
}

console.log("DÓNDE SE VA EL TIEMPO (el que llena la espera plantando)\n");
simular(true).bitacora.filter(b => b[0] !== "hacer")
  .forEach(b => console.log("   " + String(Math.round(b[1] / 60)).padStart(4) + " min   " + b[2]));


/* ============ LO MISMO, CONTRA EL ANCLA ============================================
   El ancla dice: una celda productiva rinde 20 plata por hora. La granja de arranque tiene
   2 árboles + 2 rocas = 4 celdas productivas. La duración del tutorial no es una opinión: es
   el valor de lo que pide, dividido por lo que la granja de arranque produce. */
{
  const B = X.BUILD_DEF, P = X.PRICE;
  const mad = B.store.cost.madera + B.horno.cost.madera + B.cocina.cost.madera;
  const pie = B.store.cost.piedra + B.horno.cost.piedra + B.cocina.cost.piedra;
  const valor = mad * P.madera + pie * P.piedra;
  const celdas = (X.G.treesOpen||[0]).length + (X.G.rocksOpen||[0]).length, porHora = celdas * 20;
  console.log("\n\nCONTRA EL ANCLA (20 plata por celda productiva y por hora)\n");
  console.log("   lo que pide la cadena ... " + mad + " madera (" + mad * P.madera + ") + " + pie + " piedra (" + pie * P.piedra + ") = " + valor + " plata de valor");
  console.log("   lo que produce la granja  " + celdas + " celdas × 20 = " + porHora + " plata/hora");
  console.log("   suelo teórico ........... " + (valor / porHora).toFixed(1) + " h  ← la duración del tutorial NO es un fallo: es esta división");
  console.log("\n   para bajarlo sin tocar el ancla solo hay dos palancas:");
  console.log("     a) más celdas productivas al arrancar");
  [4, 6, 8].forEach(c => console.log("        con " + c + " nodos (" + (c / 2) + " árboles + " + (c / 2) + " rocas): " + (valor / (c * 20)).toFixed(1) + " h"));
  console.log("     b) menos material en la cadena del tutorial");
  [0.75, 0.5, 0.33].forEach(f => console.log("        al " + Math.round(f * 100) + "% del coste actual: " + (valor * f / porHora).toFixed(1) + " h"));
  console.log("     (bajar los relojes NO sirve: el ancla es plata/hora, así que un árbol de 15 min");
  console.log("      tendría que valer la mitad y harían falta el doble de talas.)");
}
