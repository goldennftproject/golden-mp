/* Evento Bellotas del Bosque en el panel Misiones. */
(() => {
  "use strict";

  const inicio = Date.parse("2026-11-13T23:00:00Z");
  const fin = Date.parse("2026-11-15T23:00:00Z");
  const mostrarDesde = inicio - 24 * 60 * 60 * 1000;
  const extras = [
    ["papas", "Cosechá papa 15 veces", 15, 1],
    ["madera", "Recogé madera 5 veces", 5, 1],
    ["piedra", "Picá piedra 5 veces", 5, 1],
    ["papaAsada", "Cociná y recogé 3 Papas Asadas", 3, 1],
    ["pure", "Cociná y recogé 2 Purés de Papa", 2, 1],
    ["estofado", "Cociná y recogé 1 Estofado de carne", 1, 1],
    ["semillas", "Sembrá 40 semillas", 40, 2],
    ["energia", "Gastá 150 de energía de granja", 150, 2],
    ["cultivos", "Cosechá 40 cultivos", 40, 2],
    ["platos", "Cociná y recogé 15 platos", 15, 2],
  ];
  let panel = null;
  let cache = null;
  let peticion = null;
  let reclamo = null;
  let timer = null;

  function elemento(etiqueta, texto, clase) {
    const nodo = document.createElement(etiqueta);
    if (texto !== undefined) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
  }

  function detalle(titulo, id) {
    const contenedor = elemento("details");
    contenedor.dataset.bellotasDetalle = id;
    contenedor.append(elemento("summary", titulo));
    return contenedor;
  }

  function sesion() {
    return UID && sb && CARGA_OK && !SOLO_LOCAL ? UID : null;
  }

  function configurarTemporizador(estado) {
    clearTimeout(timer);
    timer = null;
    if (!isOpen("ov-objetivos")) return;
    const servidor = estado ? reloj(estado) : Date.now();
    const empieza = estado?.inicio ?? inicio;
    const termina = estado?.fin ?? fin;
    const siguiente = servidor < mostrarDesde ? mostrarDesde :
      servidor < empieza ? empieza : servidor < termina ? termina : null;
    if (siguiente !== null) timer = setTimeout(() => void consultar(), siguiente - servidor + 100);
  }

  function montar(contenedor) {
    if (!panel) {
      panel = elemento("section", undefined, "sub");
      panel.id = "bellotas-evento";
      panel.setAttribute("aria-label", "Bellotas del Bosque");
      panel.hidden = true;
    }
    if (panel.parentElement !== contenedor) contenedor.prepend(panel);
    if (cache && cache.cuenta !== sesion()) {
      cache = null;
      panel.replaceChildren();
      panel.hidden = true;
    }
  }

  function progreso(mision, meta) {
    const cantidad = Number.isFinite(mision?.progreso) ? Math.max(0, mision.progreso) : 0;
    return Math.min(meta, Math.floor(cantidad));
  }

  function reloj(estado) {
    return estado.ahora + Math.max(0, performance.now() - cache.recibido);
  }

  function filaExtra(definicion, mision, estado, activa) {
    const [id, titulo, meta, premio] = definicion;
    const cantidad = progreso(mision, meta);
    const completada = mision?.reclamada === true;
    const requiereVip = premio === 2 && !estado.vip;
    const fila = elemento("div", undefined, "forge-row");
    const info = elemento("div", undefined, "finfo");
    info.append(elemento("div", titulo, "fnm"));
    const barra = elemento("progress");
    barra.max = meta;
    barra.value = cantidad;
    barra.setAttribute("aria-label", titulo);
    info.append(barra, elemento("div", cantidad + " / " + meta + " · +" + premio + " " +
      (premio === 1 ? "bellota" : "bellotas"), "fds"));
    const boton = elemento("button", completada ? "Reclamada" : !activa ? "Abre a las 20:00" :
      requiereVip ? "Requiere VIP" : cantidad < meta ? "En progreso" : "Reclamar +" + premio, "green sm");
    boton.type = "button";
    boton.dataset.bellotasReclamar = id;
    boton.disabled = completada || !activa || requiereVip || cantidad < meta || Boolean(reclamo);
    boton.addEventListener("click", () => void reclamar(id));
    fila.append(info, boton);
    return fila;
  }

  function filasDiarias(estado) {
    const contenedor = detalle("Bellotas de las misiones diarias", "diarias");
    contenedor.append(elemento("p", "Cada diaria suma 1 bellota al alcanzar la meta con actividad del evento y reclamarla en Misiones diarias.", "fds"));
    const diarias = new Map(estado.diarias.map(mision => [mision.id, mision]));
    for (const {id, nombre, meta} of JORNADA_MISIONES) {
      const mision = diarias.get(id);
      const avance = mision?.reclamada ? "Bellota reclamada" : mision?.diariaCobrada ?
        "Diaria ya reclamada hoy" : progreso(mision, meta) + " / " + meta;
      contenedor.append(elemento("div", nombre + " · " + avance, "fds"));
    }
    return contenedor;
  }

  function filasRanking(estado, cerrado) {
    const contenedor = detalle(cerrado ? "Ranking final" : "Ranking público · provisional", "ranking");
    if (!estado.ranking.length) {
      contenedor.append(elemento("p", "Todavía no hay bellotas reclamadas.", "fds"));
      return contenedor;
    }
    const lista = elemento("div");
    lista.setAttribute("role", "list");
    for (const {puesto, nombre, bellotas} of estado.ranking) {
      if (!Number.isSafeInteger(puesto) || puesto < 1 || !Number.isSafeInteger(bellotas) || bellotas < 1 ||
          typeof nombre !== "string") continue;
      const fila = elemento("div", undefined, "forge-row");
      fila.setAttribute("role", "listitem");
      fila.append(elemento("span", puesto + ".º " + nombre, "finfo"),
        elemento("b", bellotas + (bellotas === 1 ? " bellota" : " bellotas")));
      lista.append(fila);
    }
    contenedor.append(lista);
    return contenedor;
  }

  function presentar(estado) {
    if (!panel) return;
    const abiertos = new Set([...panel.querySelectorAll("details[open]")].map(nodo => nodo.dataset.bellotasDetalle));
    const foco = document.activeElement;
    const identificadorFoco = panel.contains(foco) ? foco.dataset.bellotasReclamar : null;
    const actualizarTieneFoco = foco?.dataset.bellotasActualizar === "true";
    const ahora = reloj(estado);
    const activa = ahora >= estado.inicio && ahora < estado.fin;
    const cerrado = ahora >= estado.fin;
    const titulo = elemento("h4", "🌰 Bellotas del Bosque");
    const estadoEvento = elemento("p", activa ? "Evento activo" : cerrado ? "Evento cerrado" : "Próximo evento", "fnm");
    const horario = elemento("p", "Del viernes 13 a las 20:00 al domingo 15 a las 20:00 · Uruguay y Argentina", "fds");
    const saldo = elemento("p", estado.total + (estado.total === 1 ? " bellota" : " bellotas") +
      (estado.puesto ? " · Puesto " + estado.puesto + ".º" : ""), "fnm");
    const actualizar = elemento("button", "Actualizar ranking y progreso", "green sm");
    actualizar.type = "button";
    actualizar.dataset.bellotasActualizar = "true";
    actualizar.addEventListener("click", () => void consultar());
    panel.replaceChildren(titulo, estadoEvento, horario, saldo, actualizar);
    panel.append(elemento("p", "Premios por puesto · 1.º USD 10 · 2.º USD 5 · 3.º USD 5", "fds"));
    if (!cerrado) {
      panel.append(elemento("p", "Al empezar el evento, guardá tu granja y esperá la confirmación antes de hacer las misiones.", "fds"));
      panel.append(filasDiarias(estado));
      const confirmadas = new Map(estado.extras.map(mision => [mision.id, mision]));
      for (const [id, tituloGrupo, premio] of [["abiertas", "6 misiones extra abiertas", 1], ["vip", "4 misiones extra VIP", 2]]) {
        const grupo = detalle(tituloGrupo, id);
        for (const definicion of extras.filter(extra => extra[3] === premio)) {
          grupo.append(filaExtra(definicion, confirmadas.get(definicion[0]), estado, activa));
        }
        panel.append(grupo);
      }
      panel.append(elemento("p", "El tutorial otorga cero bellotas. Las diarias se reinician a las 21:00 de Uruguay y Argentina.", "fds"));
    }
    const ranking = filasRanking(estado, cerrado);
    ranking.open = cerrado || abiertos.has("ranking");
    panel.append(ranking);
    if (cerrado) panel.append(elemento("p", "Los puestos se revisarán antes de adjudicar los premios.", "fds"));
    for (const detalle of panel.querySelectorAll("details")) {
      if (abiertos.has(detalle.dataset.bellotasDetalle)) detalle.open = true;
    }
    panel.hidden = false;
    if (identificadorFoco) {
      const destino = [...panel.querySelectorAll("[data-bellotas-reclamar]")]
        .find(nodo => nodo.dataset.bellotasReclamar === identificadorFoco);
      (destino?.disabled ? destino.closest("details")?.querySelector("summary") : destino)?.focus();
    }
    if (actualizarTieneFoco) actualizar.focus();
  }

  function estadoValido(datos) {
    return datos && Number.isFinite(datos.ahora) && datos.inicio === inicio && datos.fin === fin &&
      typeof datos.vip === "boolean" && Number.isSafeInteger(datos.total) && datos.total >= 0 && Array.isArray(datos.extras) &&
      Array.isArray(datos.diarias) && Array.isArray(datos.ranking);
  }

  function consultar() {
    const cuenta = sesion();
    if (!panel || !isOpen("ov-objetivos")) return Promise.resolve();
    if (!cuenta) {
      panel.hidden = true;
      return Promise.resolve();
    }
    if (Date.now() < mostrarDesde && !cache) {
      configurarTemporizador();
      return Promise.resolve();
    }
    if (peticion?.cuenta === cuenta) return peticion.resultado;
    const intento = {cuenta};
    peticion = intento;
    intento.resultado = (async () => {
      try {
        const {data, error} = await conTope(sb.functions.invoke("guardar", {
          body: {cuenta, bellotas: {accion: "estado"}},
        }), 10000, "Bellotas del Bosque");
        if (sesion() !== cuenta || peticion !== intento || !isOpen("ov-objetivos")) return;
        if (data?.bellotas?.habilitado === false) {
          cache = null;
          panel.replaceChildren();
          panel.hidden = true;
          return;
        }
        if (error || !data?.ok || !estadoValido(data.bellotas)) {
          if (cache?.cuenta === cuenta) {
            presentar(cache.estado);
            toast("No se pudo actualizar Bellotas del Bosque");
          }
          return;
        }
        cache = {cuenta, estado: data.bellotas, recibido: performance.now()};
        presentar(cache.estado);
        configurarTemporizador(cache.estado);
      } catch {
        if (sesion() === cuenta && cache?.cuenta === cuenta && isOpen("ov-objetivos")) {
          presentar(cache.estado);
          toast("No se pudo actualizar Bellotas del Bosque");
        }
      } finally {
        if (peticion === intento) peticion = null;
      }
    })();
    return intento.resultado;
  }

  async function reclamar(id) {
    const cuenta = sesion();
    if (!cuenta || reclamo || cache?.cuenta !== cuenta) return;
    const ahora = reloj(cache.estado);
    if (ahora < cache.estado.inicio || ahora >= cache.estado.fin) return;
    const intento = {cuenta};
    reclamo = intento;
    for (const boton of panel.querySelectorAll("[data-bellotas-reclamar]")) boton.disabled = true;
    try {
      const resultado = await economiaSolicitar({bellotas: {accion: "reclamar", id}});
      if (resultado?.ok && cache?.cuenta === cuenta) {
        const objetivo = cache.estado.extras.find(mision => mision.id === id);
        if (objetivo) objetivo.reclamada = true;
      }
    } catch {
      if (sesion() === cuenta) toast("No se pudo comprobar el reclamo de Bellotas del Bosque");
    } finally {
      if (reclamo === intento) reclamo = null;
      if (sesion() === cuenta) {
        if (cache?.cuenta === cuenta) presentar(cache.estado);
        await despuesDeCobro();
      }
    }
  }

  async function despuesDeCobro() {
    if (peticion?.cuenta === sesion()) await peticion.resultado;
    return consultar();
  }

  function cerrar() {
    clearTimeout(timer);
    timer = null;
    peticion = null;
  }

  window.GoldenBellotas = {montar, consultar, cerrar, despuesDeCobro};
})();
