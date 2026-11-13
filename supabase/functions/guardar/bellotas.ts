const BELLOTAS_VERSION = "2026-11-13/v1";
const BELLOTAS_INICIO = Date.parse("2026-11-13T23:00:00Z");
const BELLOTAS_FIN = Date.parse("2026-11-15T23:00:00Z");

const bellotasDiarias = [
  ["siembra", "plant", 20],
  ["cocina", "platos", 30],
  ["madera", "chop", 10],
  ["mineria", "mine", 10],
  ["jornada", "energiaGranja", 200],
] as const;

const bellotasExtras = [
  ["papas", "papas", 15, false],
  ["madera", "chop", 5, false],
  ["piedra", "piedra", 5, false],
  ["papaAsada", "papa_asada", 3, false],
  ["pure", "pure_papa", 2, false],
  ["estofado", "estofado", 1, false],
  ["semillas", "plant", 40, true],
  ["energia", "energiaGranja", 150, true],
  ["cultivos", "harvest", 40, true],
  ["platos", "platos", 15, true],
] as const;

type BellotasCobro = {cantidad: number; op: string};
type BellotasLibro = {
  version: string;
  diario: {fecha: string; progreso: Record<string, number>};
  extras: Record<string, number>;
  cobros: Record<string, BellotasCobro>;
  total: number;
};
type BellotasAcciones = Record<string, unknown> & {recetas?: Record<string, unknown>};
type BellotasPartida = Record<string, any>;

function bellotasEnHorario(hora: number) {
  return hora >= BELLOTAS_INICIO && hora < BELLOTAS_FIN;
}

function bellotasDia(hora: number) {
  return new Date(hora).toISOString().slice(0, 10);
}

function bellotasGuardadas(data: BellotasPartida | null): BellotasLibro | undefined {
  const guardado = data?.bellotasEvento;
  if (guardado?.version === BELLOTAS_VERSION && guardado.diario?.progreso && guardado.extras && guardado.cobros) {
    return guardado;
  }
}

function bellotasLibro(data: BellotasPartida | null, hora: number): BellotasLibro {
  const guardado = bellotasGuardadas(data);
  const fecha = bellotasDia(hora);
  if (!guardado) {
    return {version: BELLOTAS_VERSION, diario: {fecha, progreso: {}}, extras: {}, cobros: {}, total: 0};
  }
  const diario = guardado.diario.fecha === fecha
    ? {fecha, progreso: {...guardado.diario.progreso}}
    : {fecha, progreso: {}};
  return {...guardado, diario, extras: {...guardado.extras}, cobros: {...guardado.cobros}};
}

function bellotasVip(data: BellotasPartida | null, hora: number) {
  return Number(data?.produccion?.vipHasta) > hora;
}

function bellotasSumar(actual: number | undefined, delta: unknown, meta: number) {
  const incremento = typeof delta === "number" && Number.isSafeInteger(delta) ? Math.max(0, delta) : 0;
  return Math.min(meta, (actual ?? 0) + incremento);
}

export function bellotasActualizar(
  prev: BellotasPartida | null, next: BellotasPartida, acciones: BellotasAcciones, hora: number, desdeServidor: number,
) {
  const guardado = bellotasGuardadas(prev);
  delete next.bellotasEvento;
  if (guardado) next.bellotasEvento = guardado;
  if (!bellotasEnHorario(hora)) return;

  const libro = bellotasLibro(desdeServidor < BELLOTAS_INICIO ? null : prev, hora);
  next.bellotasEvento = libro;
  // El primer guardado fija la referencia para el primer tramo que cae dentro del evento.
  if (!guardado || desdeServidor < BELLOTAS_INICIO) return;
  const valores = {
    ...acciones,
    papa_asada: acciones.recetas?.papa_asada,
    pure_papa: acciones.recetas?.pure_papa,
    estofado: acciones.recetas?.estofado,
  };
  const vip = bellotasVip(prev, hora);
  if (bellotasDia(desdeServidor) === libro.diario.fecha) {
    for (const [id, metrica, meta] of bellotasDiarias) {
      libro.diario.progreso[id] = bellotasSumar(libro.diario.progreso[id], acciones[metrica], meta);
    }
  }
  for (const [id, metrica, meta, requiereVip] of bellotasExtras) {
    if (!requiereVip || vip) {
      libro.extras[id] = bellotasSumar(libro.extras[id], (valores as BellotasAcciones)[metrica], meta);
    }
  }
}

export function bellotasRegistrarDiaria(
  prev: BellotasPartida, next: BellotasPartida, id: string, fecha: string, hora: number,
) {
  if (!bellotasEnHorario(hora) || fecha !== bellotasDia(hora)) return;
  const mision = bellotasDiarias.find(([clave]) => clave === id);
  if (!mision) return;
  const libro = bellotasLibro(prev, hora);
  const clave = `diaria:${fecha}:${id}`;
  if ((libro.diario.progreso[id] ?? 0) < mision[2] || libro.cobros[clave]) return;
  libro.cobros[clave] = {cantidad: 1, op: ""};
  libro.total += 1;
  next.bellotasEvento = libro;
}

export function bellotasReclamar(prev: BellotasPartida, id: string, hora: number, op: string) {
  const mision = bellotasExtras.find(([clave]) => clave === id);
  if (!mision) return {error: "Misión de Bellotas desconocida"};
  const libro = bellotasLibro(prev, hora);
  const clave = `extra:${id}`;
  const anterior = libro.cobros[clave];
  if (anterior) {
    return anterior.op === op
      ? {repetido: true, cobro: anterior.cantidad}
      : {error: "Ya reclamaste esta misión de Bellotas"};
  }
  if (!bellotasEnHorario(hora)) return {error: "El evento de Bellotas está fuera de horario"};
  const [, , meta, requiereVip] = mision;
  if (requiereVip && !bellotasVip(prev, hora)) return {error: "Esta misión requiere VIP activo"};
  if ((libro.extras[id] ?? 0) < meta) return {error: "Todavía no completaste esta misión de Bellotas"};
  const cobro = requiereVip ? 2 : 1;
  libro.cobros[clave] = {cantidad: cobro, op};
  libro.total += cobro;
  return {data: {...prev, bellotasEvento: libro}, cobro};
}

export function bellotasEstado(data: BellotasPartida | null, hora: number) {
  const libro = bellotasLibro(data, hora);
  return {
    ahora: hora, inicio: BELLOTAS_INICIO, fin: BELLOTAS_FIN,
    vip: bellotasVip(data, hora), total: libro.total,
    diarias: bellotasDiarias.map(([id]) => ({
      id, progreso: libro.diario.progreso[id] ?? 0,
      reclamada: Boolean(libro.cobros[`diaria:${libro.diario.fecha}:${id}`]),
      diariaCobrada: data?.actividadGranja?.jornada?.dia === libro.diario.fecha
        && Boolean(data.actividadGranja.jornada.cobradas?.[id]),
    })),
    extras: bellotasExtras.map(([id]) => ({
      id, progreso: libro.extras[id] ?? 0, reclamada: Boolean(libro.cobros[`extra:${id}`]),
    })),
  };
}

export function bellotasConRanking(data: BellotasPartida | null, hora: number, ranking: {
  ranking?: unknown[];
  puesto?: number | null;
  total?: number;
  misiones?: string[];
}) {
  const estado = bellotasEstado(data, hora);
  const cobradas = new Set(ranking.misiones ?? []);
  const fecha = bellotasDia(hora);
  return {
    ...estado,
    ranking: ranking.ranking ?? [],
    puesto: ranking.puesto ?? null,
    total: ranking.total ?? estado.total,
    diarias: estado.diarias.map(mision => ({
      ...mision, reclamada: cobradas.has(`diaria:${fecha}:${mision.id}`),
    })),
    extras: estado.extras.map(mision => ({
      ...mision, reclamada: cobradas.has(`extra:${mision.id}`),
    })),
  };
}
