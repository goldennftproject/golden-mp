/* Guía de consulta. Lee los catálogos que usa el juego y no escribe en la partida. */
(() => {
  "use strict";

  const dialogo = document.getElementById("ov-guia");
  if (!dialogo) return;
  const campo = document.getElementById("guia-busqueda");
  const resultado = document.getElementById("guia-resultados");
  const estado = document.getElementById("guia-estado");
  const botones = [...dialogo.querySelectorAll("[data-guia-seccion]")];
  let seccion = "progreso";
  let reloj = null;
  let firma = "";

  const etiqueta = clave => RES_LABEL[clave] || RECIPE_DEF[clave]?.label ||
    ({ plata: "Plata", golden: "Golden", fish: "pescado" })[clave] || clave.replace(/_/g, " ");
  const costos = cantidades => Object.entries(cantidades).filter(([, n]) => n > 0)
    .map(([clave, n]) => n + " " + etiqueta(clave)).join(" · ");
  const intervalo = (a, b) => a === b ? String(a) : a + "–" + b;
  const porcentaje = new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: 2 });
  const duracion = segundos => fmtDur(segundos * 1000);
  const normalizar = valor => valor.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  function progreso() {
    const filas = Object.entries(BUILD_DEF).filter(([id]) => !GF.esAltarOculto(id))
      .map(([id, d]) => ({
        titulo: d.label,
        subtitulo: "Edificio",
        nivelGranja: PLANO_NIVEL[id],
        datos: [
          ["Plano", planoPuertaTxt(id) || "Disponible al empezar"],
          ["Construcción", buildCostStr(id)],
        ],
        texto: "Coloca el plano en la granja y entrega los materiales en la obra.",
      }));
    const gastos = expansionCostos();
    const conCupos = G.produccion?.v === 1;
    FARM_EXPANSION.forEach((nivel, i) => {
      const costo = conCupos
        ? { plata: expansionPrecioCupo(i), ...(i === 0 ? { madera: 2, piedra: 2 } : gastos[i]) }
        : gastos[i];
      filas.push({
        titulo: "Expansión " + (i + 1),
        subtitulo: "Terreno",
        nivelGranja: nivel,
        datos: [
          ["Requisito", "Granja nivel " + nivel],
          ["Coste", costos(costo)],
          ["Tiempo de obra", expansionObraMinTxt(expansionObraMin(i + 1))],
          ["Recompensa", expansionTrae(i + 1).map(nodo => nodo.txt).join(" · ")],
        ],
      });
    });
    for (let nivel = 2; nivel <= FARM_NIVEL_MAX; nivel++) {
      const desbloqueos = filas.filter(ficha => ficha.nivelGranja === nivel).map(ficha => ficha.titulo);
      if (FARM_COFRE[nivel]) desbloqueos.push("+" + FARM_COFRE[nivel] + " de capacidad de cofre");
      if (FARM_VALES[nivel]) desbloqueos.push("+" + FARM_VALES[nivel] + " vales del tablón");
      filas.push({
        titulo: "Granja nivel " + nivel,
        subtitulo: "Progreso",
        datos: [
          ["XP productiva acumulada", FARM_XP_LVLS[nivel]],
          ...(desbloqueos.length ? [["Desbloqueas", desbloqueos.join(" · ")]] : []),
        ],
      });
    }
    return filas;
  }

  function materiales() {
    const filas = ORE_ORDER.map(id => {
      const d = ORE_DEF[id];
      const pico = PICK_DEF[picoQueHaceFalta({ type: "ore", ore: id })];
      return {
        titulo: d.label,
        subtitulo: "Minería",
        sprite: d.sprite,
        datos: [
          ["Requisito", "Minería nivel " + oreNivelReq(id)],
          ["Herramienta", pico.label],
          ["Fabricar el pico en Herrería", costos({ ...pico.cost, plata: pico.plata })],
          ["Reposición base de la veta", duracion(d.cd)],
        ],
        ...(id === "bronce" ? {
          texto: "Activa o compra una veta en el Cobertizo con un cupo productivo libre. Espera la primera carga y pícala en tu granja. Si te faltan cupos, puedes pausar otra producción.",
          accion: { texto: "Ver mi veta y requisitos", abrir: () => abrirAyudaBronce() },
        } : {}),
      };
    });
    for (const id of CROP_ORDER) {
      const d = CROP_DEF[id];
      filas.push({
        titulo: d.label,
        subtitulo: "Cultivo",
        sprite: "crop_" + id,
        datos: [["Requisito", "Cultivo nivel " + d.lvl]],
        texto: "Compra semillas en el Mercado y plántalas en una parcela.",
      });
    }
    for (const id of ANIMAL_ORDER) {
      const d = ANIMAL_DEF[id];
      filas.push({
        titulo: etiqueta(d.mat),
        subtitulo: "Establo",
        sprite: RES_SPRITE[d.mat],
        datos: [
          ["Animal", d.label + " · Ganadería nivel " + animalNivelReq(id)],
          ["Ración", d.racion + " × " + d.come.map(etiqueta).join(" o ")],
          ["Producción por ciclo", d.porCiclo + " · " + duracion(d.cicloH * 3600)],
        ],
      });
    }
    return filas;
  }

  function recetas() {
    const filas = MAT_ORDER.map(id => {
      const d = MAT_DEF[id];
      return {
        titulo: d.label, subtitulo: "Horno de Piedra", sprite: d.sprite,
        datos: [["Materiales", costos(d.cost)], ["Tiempo base", duracion(MAT_CD_S[id])]],
      };
    });
    for (const id of RECIPE_ORDER) {
      const d = RECIPE_DEF[id];
      if (!GF.PESCA_ACTIVA && d.fish) continue;
      filas.push({
        titulo: d.label, subtitulo: "Cocina", sprite: d.sprite,
        datos: [
          ["Requisito", "Cocina nivel " + (d.lvl || 1)],
          ["Ingredientes", [costos(d.res || {}), ...Object.entries(d.fish || {}).map(([tipo, n]) => n + " pescado " + etiqueta(tipo))].filter(Boolean).join(" · ")],
          ["Tiempo base", duracion(d.cookS)],
        ],
      });
    }
    for (const id of PICK_ORDER) {
      const d = PICK_DEF[id];
      filas.push({
        titulo: d.label, subtitulo: "Herrería", sprite: d.sprite,
        datos: [["Materiales", costos({ ...d.cost, plata: d.plata })], ["Usos", d.dur]],
      });
    }
    for (const id of ARM_ORDER) {
      const d = ARM_DEF[id];
      filas.push({
        titulo: d.label, subtitulo: "Herrería", sprite: d.sprite,
        datos: [["Requisito", "Combate nivel " + d.lvl], ["Materiales", costos({ ...d.cost, plata: d.plata })]],
      });
    }
    for (const id of ARMOR_ORDER) {
      const d = ARMOR_SETS[id];
      for (const [clave, pieza] of Object.entries(d.piezas)) {
        filas.push({
          titulo: Object.keys(d.piezas).length === 1 ? d.label : ARMOR_SLOT_LABEL[clave] + " · " + d.label,
          subtitulo: BUILD_DEF[d.taller || "curtiduria"].label,
          datos: [
            ["Materiales", costos({ [d.mat]: pieza.mat, hierro: pieza.hierro || 0, plata: pieza.plata })],
            ["Defensa", pieza.def],
          ],
        });
      }
    }
    return filas;
  }

  function eventoBotinActivo() {
    const ahora = window.__gfAhoraServidor?.();
    return Number.isFinite(ahora) && typeof energiaEventoActivo === "function" &&
      typeof BOTIN_EVENTO_ENERGIA !== "undefined" && energiaEventoActivo(ahora);
  }

  function botinNormal(def, zona, suerte, cofre) {
    const drops = Object.entries(def.loot || {}).map(([clave, [a, b, base = 1]]) => {
      const chance = Math.min(1, (base < 1 ? base * DROP_CHANCE_MULT : base) * suerte);
      return [etiqueta(clave), intervalo(Math.round(a * cofre), Math.round(b * cofre)) + " · " + porcentaje.format(chance)];
    });
    if ((def.lvl || 0) >= 8) drops.push([etiqueta("esencia_runica"), "1 · 30 %"]);
    const esencia = ESENCIA_POR_ZONA[zona] || 0;
    if (def.lvl >= 10 && def.lvl <= 12 && esencia > 0) drops.push([etiqueta("esencia_oscura"), "1 · " + porcentaje.format(esencia)]);
    return drops;
  }

  function bestiario(suerte, cofre, evento) {
    return ZONA_ORDER.flatMap(zona => {
      const mapa = ZONA_DEF[zona];
      const claves = [...new Set(mapa.mobs.map(([id]) => id))];
      if (claves.includes("baba") && MONSTER_DEF.babita) claves.push("babita");
      return claves.map(id => {
        const base = MONSTER_DEF[id];
        const d = typeof botinManualDef === "function" ? botinManualDef(zona, id, base) : base;
        const normal = botinNormal(d, zona, suerte, cofre);
        const extra = evento && zona === "pantano" && ["rata", "murcielago", "larva"].includes(id)
          ? BOTIN_EVENTO_ENERGIA.map(([clave, chance, max]) => [etiqueta(clave), intervalo(1, max) + " · " + porcentaje.format(chance)])
          : [];
        return {
          titulo: d.label,
          subtitulo: mapa.label + " · acceso en Combate " + mapa.lvl,
          sprite: d.sprite + "_idle_0",
          datos: [
            ["Nivel", d.lvl], ["Vida", d.hp], ["Daño", d.dmg], ["Armadura", mobArmor(d)],
            ["Estamina", stamCosto(id)], ["XP de Combate", d.xp],
          ],
          grupos: [["Botín habitual", normal], ...(extra.length ? [["Botín extra del evento", extra]] : [])],
          texto: id === "babita" ? "Aparece cuando se divide una Baba Grande." : "",
        };
      });
    });
  }

  function elemento(tag, clase, valor) {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (valor != null) el.textContent = valor;
    return el;
  }
  function listaDatos(datos) {
    const lista = elemento("dl", "guia-datos");
    for (const [nombre, valor] of datos) {
      const fila = elemento("div");
      fila.append(elemento("dt", "", nombre), elemento("dd", "", valor));
      lista.append(fila);
    }
    return lista;
  }
  function tarjeta(ficha) {
    const tarjeta = elemento("article", "guia-ficha");
    const cabecera = elemento("header");
    if (ficha.sprite) {
      const imagen = elemento("img");
      imagen.src = "assets/farm/" + ficha.sprite + ".png";
      imagen.alt = "";
      imagen.loading = "lazy";
      imagen.decoding = "async";
      imagen.addEventListener("error", () => imagen.remove(), { once: true });
      cabecera.append(imagen);
    }
    const titulo = elemento("div");
    titulo.append(elemento("h4", "", ficha.titulo), elemento("p", "guia-subtitulo", ficha.subtitulo));
    cabecera.append(titulo);
    tarjeta.append(cabecera, listaDatos(ficha.datos));
    if (ficha.texto) tarjeta.append(elemento("p", "guia-ayuda", ficha.texto));
    for (const [nombre, datos] of ficha.grupos || []) {
      if (datos.length) tarjeta.append(elemento("h5", "", nombre), listaDatos(datos));
    }
    if (ficha.accion) {
      const boton = elemento("button", "guia-boton", ficha.accion.texto);
      boton.type = "button";
      boton.addEventListener("click", () => {
        closeOv("ov-guia");
        ficha.accion.abrir();
      });
      tarjeta.append(boton);
    }
    return tarjeta;
  }

  function recalcular() {
    const suerte = luckMult(), cofre = chestBonus(), evento = eventoBotinActivo();
    const clave = [suerte, cofre, evento, vipVigente(), G.produccion?.v].join("|");
    return { suerte, cofre, evento, clave };
  }
  function render(actual, reiniciarScroll = true) {
    const terminos = normalizar(campo.value).trim().split(/\s+/).filter(Boolean);
    const fuentes = {
      progreso, materiales, recetas,
      bestiario: () => bestiario(actual.suerte, actual.cofre, actual.evento),
    };
    const candidatos = terminos.length ? Object.values(fuentes).flatMap(crear => crear()) : fuentes[seccion]();
    const fichas = candidatos.filter(ficha => {
      if (!terminos.length) return true;
      const palabras = normalizar([ficha.titulo, ficha.subtitulo, ficha.texto, ficha.datos.flat(), (ficha.grupos || []).flat(3)].join(" "));
      return terminos.every(termino => palabras.includes(termino));
    });
    firma = actual.clave;
    for (const boton of botones) {
      boton.setAttribute("aria-pressed", String(!terminos.length && boton.dataset.guiaSeccion === seccion));
    }
    const seVeBestiario = terminos.length ? fichas.some(ficha => ficha.grupos) : seccion === "bestiario";
    const panel = document.getElementById("guia-nota-botin");
    panel.hidden = !seVeBestiario;
    estado.textContent = fichas.length ? fichas.length + (fichas.length === 1 ? " resultado" : " resultados") : "Sin resultados";
    const pos = resultado.scrollTop;
    resultado.replaceChildren(...fichas.map(tarjeta));
    if (!fichas.length) resultado.append(elemento("p", "guia-ayuda", "Prueba con el nombre de un material, receta, edificio o criatura."));
    resultado.scrollTop = reiniciarScroll ? 0 : pos;
  }

  campo.addEventListener("input", () => render(recalcular()));
  for (const boton of botones) {
    boton.addEventListener("click", () => {
      seccion = boton.dataset.guiaSeccion;
      campo.value = "";
      render(recalcular());
    });
  }
  window.GoldenGuia = {
    abrir() {
      render(recalcular());
      if (reloj === null) reloj = window.setInterval(() => {
        const actual = recalcular();
        if (firma !== actual.clave) render(actual, false);
      }, 1000);
    },
    cerrar() {
      if (reloj !== null) window.clearInterval(reloj);
      reloj = null;
    },
  };
})();
