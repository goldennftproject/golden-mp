/* Golden Farm · configuración compartida (layout en TILES, alineado a la grilla) */
window.GF = window.GF || {};

GF.TILE = 42;
GF.COLS = 23; GF.ROWS = 15;                 // mundo en celdas enteras
GF.WORLD_W = GF.COLS * GF.TILE;             // 966
GF.WORLD_H = GF.ROWS * GF.TILE;             // 630
GF.SPEED = 175;
// "detallitos (1)" 4-5-6: la granja se juega SIN caminar (todo con clic), la cámara se desplaza
// en vez de seguir al granjero, y la finca está sobre el mar. Cada cosa se puede apagar por separado.
GF.NO_WALK = true;    // el granjero no aparece en la granja: se interactúa con un clic desde donde sea
GF.CAM_PAN = true;    // cámara libre: se arrastra y la rueda desplaza (en vez de seguir al granjero)
GF.ISLA = true;       // fondo de mar alrededor de la granja
GF.ISLA_MARGEN = 260;  // cuánto mar se puede recorrer más allá de la cerca
// La costa (arena, espuma y bajío) es una imagen: assets/farm/isla.png, hecha con
// tools/build-isla.py. Este número es cuánto sobra la imagen alrededor de la granja,
// y tiene que coincidir con el MARGEN de ese script.
GF.ISLA_ORIGEN = 112;
// En qué mapa de la Zona Negra estás. Lo setea el portal de la granja y los teleports (10/8).
GF.zona = "pantano";
var ZONA_NEGRA_VEL = 0.75;   // "detallitos (1)" punto 7: el granjero camina 25% más lento en la Zona Negra

// RESPUESTA AL CLIC (4/8). Cuánto dura cada acción en la granja. En el modo de un clic el granjero
// no se ve, así que esta duración NO es una animación: es solo el candado que separa un golpe del
// siguiente. Cuanto más corta, más "responde" el juego. (Estaba en 0,9 s y se sentía lento.)
// Medido cuadro por cuadro sobre un video de Sunflower Land (30 fps): destellos cada ~117 ms,
// que es cadencia de DEDO (unos 8 toques por segundo). O sea: allá se tala a CLICS, no manteniendo.
// Por eso lo que manda acá no es la duración, sino que ningún clic se pierda: el candado es corto
// y, si tocás más rápido que él, el toque queda guardado y sale apenas se libera.
// OJO: cada acción tiene SU propio número. Talar y picar estaban en 0,08 s pero plantar y
// cosechar habían quedado en 0,30 s — casi cuatro veces más lento — y encima sin el destello
// instantáneo que sí tenían los nodos. Por eso el diseñador seguía sintiendo retraso en la
// cosecha aunque el talado ya iba rápido. Ahora las cuatro son iguales.
var ACT_DUR = { chop: 0.08, mine: 0.08, plant: 0.08, harvest: 0.08, water: 0.2, fish: 1.5 };
// Los clics que llegan durante el candado NO se tiran: se guarda uno y sale en cuanto termina.
// Es lo que hace que tocando rápido no se pierda ni un golpe. Solo vale para el MISMO nodo,
// así que no es la cola vieja (aquella encolaba objetivos distintos y los marcaba con puntitos).
var CLIC_BUFFER_MS = 260;
var FX_DESTELLO_MS = 90;   // cuánto dura el destello blanco del nodo al recibir el golpe (SFL: ~100 ms)
var FX_BARRA_GOLPES = 1;   // barrita de progreso bajo el nodo mientras lo estás golpeando (como SFL)
// Barrita de CRECIMIENTO sobre la parcela, con el tiempo que falta escrito arriba. En Sunflower
// Land es SIEMPRE visible mientras el cultivo crece (no hace falta pasar el cursor), y desaparece
// cuando el cultivo está listo: ahí lo que se ve es la planta entera. Así, de un vistazo, se sabe
// qué parcela está lista y cuánto le falta a cada una de las demás.
var FX_BARRA_CULTIVO = 1;
// Ajuste fino de altura de la barrita de la parcela, en píxeles (negativo = más arriba).
// Sirve por si el arte de la tierra cambia y la barra queda muy pegada o muy despegada.
var FX_BARRA_DY = 0;
var FX_PREMIO = 1;         // el recurso sale volando en arco con su "+N" (como el tronco de SFL)
// Tamaño del ícono del recurso que sale volando. Venía en 18 px y no se leía; +25% = 22 px.
// (La celda del mundo mide 42 px, así que ocupa poco más de medio tile: se ve sin tapar nada.)
var FX_PREMIO_PX = 22;
var FX_PREMIO_TXT = 15;    // tamaño del "+N" que lo acompaña (también +25%)
// En qué momento de la acción "pega" la herramienta (0 = al instante del clic, 1 = al final).
// Acá es donde el nodo se agrieta y saltan las astillas. Con el granjero invisible conviene 0.
var ACT_IMPACTO = 0;
// Si mantenés apretado sin arrastrar más de este tiempo, la acción sale igual (sin esperar a soltar).
// Tiene que ser mayor que el umbral de arrastre para no talar cuando en realidad querías mover la vista.
var CLIC_SUELTO_MS = 110;

// VIENTO (4/8): los árboles crecidos y los cultivos listos se mecen apenas, como si soplara viento.
// Es puro código —sin arte nuevo—: el sprite gira poquísimo sobre su base (origen abajo), así que
// la copa se inclina y el tronco queda quieto. Cada planta tiene su desfase para que no vayan todos igual.
var VIENTO_ON = 1;         // 1 = encendido · 0 = apagado
var VIENTO_GRADOS = 1.3;   // cuánto se inclina la copa, en grados (1-2 se ve natural; más de 3 marea)
var VIENTO_SEG = 3.4;      // cuánto tarda una oscilación completa, en segundos
var VIENTO_RAFAGA_CADA = 11;   // cada cuántos segundos pasa una ráfaga
var VIENTO_RAFAGA_MULT = 2.3;  // cuánto se agranda la inclinación durante la ráfaga
// Solo se dobla la COPA: el tronco y la tierra quedan quietos. Esto dice qué parte de arriba
// del sprite es copa (0.62 = el 62% superior). El resto se dibuja aparte y no se mueve.
var VIENTO_CORTE = 0.62;
var VIENTO_CULTIVOS = 0.55;    // los cultivos listos se mecen a este % de lo que se mece un árbol (0 = quietos)

// "POP" DE CRECIMIENTO (4/8): cuando algo termina de crecer, da un saltito con resorte hasta
// quedar quieto. Es puro código: se aplasta un poco y vuelve a su tamaño con rebote elástico.
var POP_ON = 1;          // 1 = encendido · 0 = apagado
var POP_FUERZA = 1;      // qué tan exagerado es el rebote (0.5 = discreto · 1.5 = caricaturesco)
var POP_MS = 620;        // cuánto tarda en quedar estable, en milisegundos
var POP_INTERMEDIO = 0.55;   // fuerza del pop del paso intermedio (el retoño del árbol) respecto del final

// MINERALES QUE SE DIFERENCIEN (9/8). El arte de las vetas está bien, pero se dibujaban
// al 67% de la celda: las pepitas quedaban de 2 px y las seis vetas se veían como la misma
// piedra marrón. Tres cosas, todas por código y todas apagables:
var NODO_ESCALA = 0.90;    // qué parte de la celda ocupa la veta (antes 0.67)
var NODO_TINTE = 1;        // 1 = teñir la roca entera del color de su mineral · 0 = sin teñir
// El color lo tiene que cargar la MASA de la piedra, no las pepitas: la masa se lee de lejos.
// Son tintes multiplicativos y suaves; la piedra común y la netherita no se tocan (ya se distinguen).
GF.ORE_TINTE = {
  piedra:    0xffffff,
  bronce:    0xffbe86,   // parda cálida
  hierro:    0xbccfe4,   // gris azulada
  oro:       0xffe08f,   // arenosa dorada
  diamante:  0xbfeeff,   // gris pálido celeste
  netherita: 0xffffff,
};
var NODO_BRILLO = 1;       // destellito sobre las vetas CARAS que están listas (diamante y netherita)
var NODO_BRILLO_CADA = 2200;   // cada cuántos ms aparece un destello, por veta

// EFECTOS DE JUGO (4/8). Todo por código, sin arte nuevo. Cada uno se apaga por separado.
var FX_IMPACTO = 1;        // el nodo se sacude y suelta astillas/chispas en cada golpe
var FX_IMPACTO_GRADOS = 5; // cuánto se sacude el nodo al recibir el golpe
var FX_HOJAS = 1;          // hojas volando cuando pasa una ráfaga de viento
var FX_NUBES = 3;          // cuántas nubes cruzan la granja (0 = ninguna)
var FX_NUBES_ALFA = 0.22;  // qué tan opacas (estaban en 0.55 y tapaban medio edificio)
var FX_NUBES_SOMBRA = 0.06;// la sombra que proyectan sobre el suelo
var FX_MARIPOSAS = 3;      // 14/8: las 3 mariposas son la GUÍA VIVA — la 1ª sigue al objetivo, las otras 2 merodean lo accionable (0 = ninguna)
var FX_VAPOR = 1;          // vapor de la Cocina mientras hay ollas y chispas del Altar mejorado
var FX_FADE_MS = 260;      // fundido a negro al cambiar de escena (0 = corte seco)
var FX_PART_MAX = 40;      // tope de partículas vivas a la vez (cuida el rendimiento en móvil)
// ================= MODO TESTEO =====================================================
// Con esto en 1, TODAS las esperas largas del juego pasan a segundos, los cupos diarios se
// abren y la partida arranca con materiales, para poder probar el juego entero sin esperar
// horas ni farmear. NO toca la tabla del diseñador: los valores reales siguen guardados en
// Supabase y vuelven solos al poner 0 acá y deployar.
//
//   PARA LA VERSIÓN FINAL: poner GF.TESTEO = 0
//
GF.TESTEO = 0;   // 14/8: el diseñador pidió probar con TIEMPOS REALES y cupo de semillas real
var TEST_DIV = 60;       // los tiempos largos se dividen por esto (1 h → 1 min)
var TEST_TOPE = 40;      // …y además ninguna espera pasa de estos segundos
var TEST_MIN = 4;        // …ni baja de estos (si no, no se llega a ver el estado intermedio)

GF.ZOOM = 1.35;
GF.editMode = false;   // modo edición de la granja (arrastrar objetos)

const T = GF.TILE;
GF.SIZE = { hero: Math.round(T * 1.4), wheat: 38, sprout: 34 };

// snap: recibe posición en píxeles + tamaño deseado en px; devuelve un objeto
// con ancho en CELDAS ENTERAS y anclado a la grilla (borde izq y base sobre líneas).
function snap(key, meta, x, y, sizePx) {
  const wCells = Math.max(1, Math.round(sizePx / T));
  const leftCol = Math.max(0, Math.round((x - wCells * T / 2) / T));
  const baseRow = Math.round(y / T);
  const cx = leftCol * T + wCells * T / 2;   // centro X
  const by = baseRow * T;                    // base (abajo) sobre una línea
  return Object.assign({ key, cx, by, w: wCells * T, wCells, leftCol, baseRow }, meta || {});
}

// --- objetos del mundo (posiciones aprox. de la granja, ahora encajadas en celdas) ---
GF.WORLD_OBJECTS = [];
[[714,126],[840,126],[756,210]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));       // 12/8: bosquecito NE ordenado, DENTRO de la cerca
[[693,420],[777,420]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));             // 12/8: cantera en bloque, dentro de la cerca
[["piedra","node_stone",693,504],["bronce","node_bronze",777,504],["oro","node_gold",861,504],
 ["diamante","node_diamond",819,546],["netherita","node_netherite",903,504]]
  .forEach(o => GF.WORLD_OBJECTS.push(snap(o[1], {type:"ore", ore:o[0]}, o[2], o[3], T)));                                // 1 celda
GF.WORLD_OBJECTS.push(snap("barn",   {type:"barn"},   540, 150, T*2.5));   // 12/8: emparejado                                                    // 3 celdas
GF.WORLD_OBJECTS.push(snap("market", {type:"market"}, 470, 505, T*2.2));   // 12/8: emparejado                                                    // 2 celdas (más chico que la herrería)
GF.WORLD_OBJECTS.push(snap("store",  {type:"store"},  650, 480, T*2.8));   // 12/8: emparejado                                                    // 3 celdas
// quinta.docx: 5 árboles y 4 piedras en total — agregados AL FINAL para no romper layouts guardados
[[882,210],[714,294]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));   // 12/8: dentro de la cerca
[[861,420],[735,462]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));   // 12/8: cantera
// edificio de Cocina (detalles 29/7) — también al FINAL para preservar layouts guardados
GF.WORLD_OBJECTS.push(snap("cocina", {type:"cocina"}, 390, 296, T*2.2));   // 12/8: el sprite nuevo es alto, a 3 celdas quedaba gigante                                                     // 3 celdas
// dummy de práctica de espada (detalless.docx) — entrenar sube Espada, cooldown 4h
GF.WORLD_OBJECTS.push(snap("dummy", {type:"dummy"}, 585, 350, T));                                                         // 1 celda (se dibuja +25%)
// nodo de HIERRO (detalles213) — al FINAL para preservar layouts guardados; se mina con el pico de bronce
GF.WORLD_OBJECTS.push(snap("node_iron", {type:"ore", ore:"hierro"}, 735, 546, T));   // 12/8: dentro de la cerca (antes pisaba la cerca)
// BUZÓN (15/8, idea Stardew aprobada por dirección): las noticias de la granja llegan acá
GF.WORLD_OBJECTS.push(snap("buzon", {type:"buzon"}, 450, 420, T*0.9));
// HORNO DE PIEDRA (detalles viernes 1): acá se funden todos los lingotes/barras
GF.WORLD_OBJECTS.push(snap("horno", {type:"horno"}, 320, 470, T*2));
// viernes (2): 6 árboles y 6 piedras en total (1 activo + 5 por desbloquear) — al FINAL para preservar layouts
GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, 840, 294, T*2));   // 12/8: dentro de la cerca (antes pisaba la cerca derecha)
GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, 819, 462, T));   // 12/8: cantera
GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, 903, 462, T));   // 12/8: cantera

// ALTAR DE RUNAS (doc maestro 2/8) — al FINAL para preservar layouts guardados
GF.WORLD_OBJECTS.push(snap("altar", {type:"altar"}, 330, 165, T*2));
// "2das mejoras": Establo (animales) y Curtiduría (armaduras), juntos para que el bucle quede en la misma zona
GF.WORLD_OBJECTS.push(snap("establo", {type:"establo"}, 189, 378, T*2.5));   // 12/8: emparejado      // hueco libre verificado (no pisa parcelas, laguna ni cerca)
GF.WORLD_OBJECTS.push(snap("curtiduria", {type:"curtiduria"}, 315, 378, T*2));   // al lado del Establo, como pide el doc
GF.WORLD_OBJECTS.push(snap("ofrendas", {type:"ofrendas"}, 861, 168, T*2));      // Altar de Ofrendas, en el claro del noreste

// CHIMENEAS (9/8). Dónde sale el humo en cada edificio, medido sobre el arte nuevo y no
// a ojo: dx es el corrimiento respecto del CENTRO del sprite (en anchos de sprite) y dy es
// la altura de la boca contada desde el techo (en altos de sprite). Si el arte cambia, se
// vuelven a medir estos dos números y el humo sigue saliendo del caño.
// 14/8: offsets RE-MEDIDOS sobre los PNG del set mercadillo (script de silueta: la
// chimenea es el pico más alto del contorno alfa). El set nuevo cambió los lados:
// la cocina la tiene a la DERECHA (antes izquierda) y la herrería a la IZQUIERDA.
GF.CHIMENEA = {
  cocina: { dx:  0.312, dy: 0.01 },   // caño a la derecha del techo curvo
  store:  { dx: -0.249, dy: 0.01 },   // herrería mercadillo: chimenea a la izquierda
  horno:  { dx:  0.005, dy: 0.01 },   // horno: centrado (el arte no cambió)
};

// ANIMALES SUELTOS (9/8): andan por toda la granja, no encerrados en un patio.
// Esquivan edificios, vetas, la laguna y las parcelas (no pisan los cultivos), y eligen
// su próximo destino cerca de donde están, así deambulan en vez de cruzar el mapa entero.
GF.CORRAL_ON = 0;              // 1 = vuelve el corral cercado de antes (deprecado: los animales andan sueltos)
GF.ANIMAL_RADIO = T * 2.6;     // qué tan lejos se van de un tirón
// El patio de antes queda definido por si se quiere volver a encender (GF.CORRAL_ON = 1).
GF.CORRAL = { col: 5, row: 11, cols: 4, rows: 3 };
// LA CERCA PERIMETRAL es intocable (12/8): el anillo del borde de la granja no admite
// que se coloque ni se arrastre NADA encima — adornos, parcelas, obras, edificios,
// árboles, piedras o la laguna. (Arriba son 2 filas: la cerca de frente + su sombra.)
GF.enCerca = function (col, row) {
  return col < 1 || row < 2 || col >= GF.COLS - 1 || row >= GF.ROWS - 1;
};

// AVISO DE SUPERPOSICIÓN: al agregar un edificio nuevo, la consola avisa si pisa parcelas,
// la laguna, la cerca u otro objeto. Evita repetir el bug del Establo sobre los cultivos (4/8).
GF.checkLayout = function () {
  const T2 = GF.TILE, W2 = GF.WORLD_W, H2 = GF.WORLD_H, M = T2 * 0.9, R = [];
  GF.WORLD_OBJECTS.forEach(o => { const w = o.w, h = w * 0.9; R.push({ n: o.type, x1: o.cx - w / 2, x2: o.cx + w / 2, y1: o.by - h, y2: o.by }); });
  GF.PLOTS.forEach(p => R.push({ n: "parcela", x1: p.col * T2, x2: (p.col + 1) * T2, y1: p.row * T2, y2: (p.row + 1) * T2 }));
  R.push({ n: "laguna", x1: GF.POND.col * T2, x2: (GF.POND.col + GF.POND.cols) * T2, y1: GF.POND.row * T2, y2: (GF.POND.row + GF.POND.rows) * T2 });
  const cruza = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const avisos = [];
  GF.WORLD_OBJECTS.forEach(o => {
    const w = o.w, h = w * 0.9, r = { x1: o.cx - w / 2, x2: o.cx + w / 2, y1: o.by - h, y2: o.by };
    const natural = o.type === "tree" || o.type === "rock" || o.type === "ore";   // el arte de árboles/rocas tiene copa transparente: no molesta contra la cerca
    if (!natural && (r.x1 < M || r.x2 > W2 - M || r.y1 < M || r.y2 > H2 - M)) avisos.push(o.type + " se sale de la cerca");
    R.forEach(q => { if (q.n !== o.type && (q.n === "parcela" || q.n === "laguna") && cruza(r, q)) avisos.push(o.type + " pisa " + q.n); });
  });
  if (avisos.length) console.warn("[layout]", [...new Set(avisos)].join(" · "));
  return avisos;
};

// lotes 4x3, cada uno 1 celda, alineados a la grilla (col 2, fila 3)
GF.PLOTS = [];
(function(){ const c0=2, r0=3; for(let r=0;r<3;r++) for(let c=0;c<4;c++) GF.PLOTS.push({ col:c0+c, row:r0+r }); })();

// estanque: rectángulo de celdas (4x3) — separado del borde para no cortar la cerca
GF.POND = { col:1, row:10, cols:4, rows:3 };
// copias base (para "Restaurar" después de mover parcelas/laguna en edición)
GF.PLOTS_BASE = GF.PLOTS.map(p => ({ col: p.col, row: p.row }));
GF.POND_BASE = { col: GF.POND.col, row: GF.POND.row };
GF.FISH = { col:7, row:11 };

// --- footprint SÓLIDO por tipo de objeto ---
// Solo estorba lo que de verdad pisa el suelo: el TRONCO del árbol (no la copa), la BASE del
// edificio (no el tejado). Así se puede pasar entre dos árboles y caminar por detrás de las casas.
//   hw = mitad del ancho, como fracción del ancho dibujado · dep = profundidad, en celdas
GF.SOLID = {
  tree:   { hw: 0.17, dep: 0.32 },   // solo el tronco
  rock:   { hw: 0.40, dep: 0.34 },
  ore:    { hw: 0.40, dep: 0.34 },
  barn:   { hw: 0.46, dep: 0.58 },   // base completa del edificio
  market: { hw: 0.46, dep: 0.58 },
  store:  { hw: 0.46, dep: 0.58 },
  cocina: { hw: 0.46, dep: 0.58 },
  altar:  { hw: 0.42, dep: 0.5 },
  establo:    { hw: 0.46, dep: 0.58 },
  curtiduria: { hw: 0.44, dep: 0.54 },
  ofrendas:   { hw: 0.44, dep: 0.54 },
  dummy:  { hw: 0.24, dep: 0.26 },
  cofre:  { hw: 0.34, dep: 0.30 },
  buzon:  { hw: 0.22, dep: 0.22 },   // 15/8: el poste del buzón
};
GF.solidRect = function (o) {
  const d = GF.SOLID[o.type] || { hw: 0.40, dep: 0.36 };
  const w = o.rw || o.w || T;
  return { cx: o.cx, by: o.by, hw: w * d.hw, dep: T * d.dep };
};
GF.COLLISIONS = GF.WORLD_OBJECTS.map(o => GF.solidRect(o));

GF.blockedAt = function(x, y, pad){
  pad = pad || 0;
  // la cerca del borde es sólida: no se puede pisar ni traspasar
  if (x < 18 || y < T * 0.72 || x > GF.WORLD_W - 18 || y > GF.WORLD_H - 16) return true;
  const p = GF.POND, px = p.col*T, py = p.row*T, pw = p.cols*T, ph = p.rows*T;
  const ex = px + pw/2, ey = py + ph/2;
  const dxp = (x-ex)/(pw/2 + pad), dyp = (y-ey)/(ph/2 + pad);
  if (dxp*dxp + dyp*dyp < 1) return true;
  // rectángulos (no elipses): el borde es predecible y no se cuela por las esquinas
  for (const c of GF.COLLISIONS){
    if (x > c.cx - c.hw - pad && x < c.cx + c.hw + pad &&
        y > c.by - c.dep - pad && y < c.by + pad) return true;
  }
  return false;
};
