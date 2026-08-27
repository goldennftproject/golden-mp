/* Golden Farm · configuración compartida (layout en TILES, alineado a la grilla) */
window.GF = window.GF || {};

/* ¿ESTE CLIC ES DE LA INTERFAZ O DEL MUNDO? (24/8)
   Phaser engancha el pointerdown en la VENTANA además del canvas, para no perder los clics que
   empiezan o terminan fuera del lienzo. Efecto colateral: tocar un botón de un panel de HTML
   también pega un golpe en la granja de atrás. La pregunta se contesta una sola vez y con el
   evento nativo, que nunca miente: si el clic no nació en el canvas, es de la interfaz.
   (Sin evento nativo —clics sintéticos de las pruebas— se lo toma como del mundo: es el que
   estaba antes y así ningún test viejo cambia de significado.) */
function clicDeInterfaz(pt) {
  const ev = pt && pt.event; if (!ev) return false;
  const t = ev.target;
  return !!(t && t.nodeName && t.nodeName !== "CANVAS");
}
window.clicDeInterfaz = clicDeInterfaz;

GF.TILE = 42;
// 17/8 (dirección): "todo el corral, todos los edificios y todos los nodos deben estar más
// comprimidos". Era 23x15 = 345 celdas para 73 de contenido: 21% de ocupación, con las filas
// 0,1,2,6 y 14 ENTERAS vacías y los nodos exiliados en la columna 16-22. Ahora 17x12 = 204,
// con el contenido metido entre las columnas 1-15 y las filas 2-10, sin ninguna fila muerta.
// 17/8 (dirección): LA GRANJA ES CUADRADA. "el ancho de la granja, incluyendo el corral, debe
// ser el mismo de largo que de ancho, y el rectángulo que forma el bosque también, y el conjunto
// entero también, que es 1600". 17x12 no cumplía nada de eso. 15x15 es el único cuadrado que
// además se parte en 3 partes iguales de 5, que es lo que pide el anillo de expansiones.
/* 26/8 — QUÉ EXPANSIONES TRAEN VETA, EN UN SOLO SITIO.
   Esta lista estaba escrita DOS VECES: acá, para poner las vetas en el mundo, y en state.js
   (EXP_CON_VETA) para cobrarlas más caras. Dos copias de la misma decisión, en dos archivos, sin
   nada que las ate — la forma exacta de fallo que nos costó las cañas invisibles y los fardos del
   tablón. Vive acá porque config.js carga primero; state.js la lee. */
GF.EXP_CON_VETA = [3, 6, 8, 10, 12, 14, 16];
GF.COLS_BASE = 15; GF.ROWS_BASE = 15;       // el claro con el que arranca la partida
GF.COLS = GF.COLS_BASE; GF.ROWS = GF.ROWS_BASE;   // mundo en celdas enteras (crece con las expansiones)
GF.WORLD_W = GF.COLS * GF.TILE;             // 630
GF.ORIG_X = 0; GF.ORIG_Y = 0;               // esquina del mundo: se vuelve NEGATIVA al expandir
GF.C0 = 0; GF.R0 = 0; GF.C1 = GF.COLS_BASE; GF.R1 = GF.ROWS_BASE;
GF.WORLD_H = GF.ROWS * GF.TILE;             // 504
GF.SPEED = 175;

/* ============ EL ANILLO DE 16 EXPANSIONES (17/8, dirección) =======================
   Idea de dirección, tomada de Sunflower Land: la granja no crece como un anillo que se
   ensancha entero, sino comprando PARCELAS DE TERRENO de a una alrededor del corral.

   Palabras suyas: "un lateral, sin contar las esquinas, sea tres expansiones... las
   cuatro esquinas son cuatro... entre todo serían dieciséis expansiones alrededor del
   corral". Y después: "cada expansión medirá cinco por cinco".

   Con la granja en 15x15 y la banda en 5, sale una figura que se explica sola:

        EL MAPA ENTERO ES UNA GRILLA DE 5x5 BLOQUES DE 5x5 CELDAS.
        El corral es el 3x3 del centro; las 16 expansiones son el marco.

   Los 16 bloques miden exactamente lo mismo (25 celdas), así que cada expansión vale lo
   mismo que las demás y no hay que explicarle a nadie por qué una esquina rinde menos.

      granja  15x15 = 225 celdas   →   final 25x25 = 625   (+400, casi el triple)
      bosque  6,55 celdas por los CUATRO lados al terminar (hoy 11,5)

   Por qué no entra una expansión 17: el bosque quedaría en 4,25 celdas de árboles puros
   descontando el anillo de césped, y por debajo de eso deja de leer como bosque.

   IMPORTANTE — el origen se corre. Al comprar por la izquierda o por arriba, el claro
   pasa a tener columnas y filas NEGATIVAS. Las coordenadas guardadas de los objetos NO
   se tocan (siguen contando desde la esquina del corral original), así que ningún layout
   guardado se rompe: lo que se mueve es el BORDE, no el contenido. */
GF.BLOQUE = 5;              // lado del bloque de expansión, en celdas
// Los 16 bloques, en coordenadas de BLOQUE respecto del corral: el corral es (0,0)-(2,2).
/* EL ORDEN ES UN RECORRIDO DEL PERÍMETRO (18/8, dirección): "cada expansión va a ir de forma
   consecutiva una tras la otra. La expansión uno sería, desde el lado izquierdo, la que está más
   arriba de todas, sin ser la esquina. Partiendo de la uno irá hacia abajo hasta la esquina
   inferior izquierda, luego hacia la derecha, luego para arriba y luego hacia la izquierda,
   cerrando todo el cuadrado."

   Se recorre el marco en ese sentido y el índice del array ES el orden de compra: la 1 es
   GF.EXPANSIONES[0]. Así la granja siempre queda de una pieza y creciendo por un lado, nunca con
   bloques sueltos colgando en diagonal.

        13 14 15 16          <- el cierre, por arriba, de derecha a izquierda
        12 ·  ·  ·  1
        11 ·  ·  ·  2        <- baja por la izquierda (1-3), esquina (4),
        10 ·  ·  ·  3           cruza abajo (5-7), esquina (8),
         9  8  7  6  5          sube por la derecha (9-11), esquina (12) */
GF.EXPANSIONES = [];
(function () {
  const B = GF.BLOQUE, paso = [];
  for (let br = 0; br <= 3; br++) paso.push([-1, br]);   // baja por la izquierda + esquina abajo-izq
  for (let bc = 0; bc <= 3; bc++) paso.push([bc, 3]);    // cruza abajo + esquina abajo-der
  for (let br = 2; br >= -1; br--) paso.push([3, br]);   // sube por la derecha + esquina arriba-der
  for (let bc = 2; bc >= -1; bc--) paso.push([bc, -1]);  // cierra por arriba + esquina arriba-izq
  paso.forEach(([bc, br], i) => {
    const esquina = (bc < 0 || bc > 2) && (br < 0 || br > 2);
    GF.EXPANSIONES.push({ n: i + 1, bc, br, esquina,
      c0: bc * B, r0: br * B, c1: bc * B + B, r1: br * B + B });
  });
})();
// El rectángulo que envuelve el corral + los bloques comprados. `compradas` es la lista de
// índices de GF.EXPANSIONES que el jugador ya tiene.
GF.mundoCon = function (compradas) {
  let c0 = 0, r0 = 0, c1 = GF.COLS_BASE, r1 = GF.ROWS_BASE;
  (compradas || []).forEach(i => {
    const e = GF.EXPANSIONES[i];
    if (!e) return;
    c0 = Math.min(c0, e.c0); r0 = Math.min(r0, e.r0);
    c1 = Math.max(c1, e.c1); r1 = Math.max(r1, e.r1);
  });
  return { c0, r0, c1, r1, cols: c1 - c0, rows: r1 - r0 };
};
/* ============ EL TERRENO: UNA SOLA FUENTE DE VERDAD (18/8) =========================
   Todo el mapa —césped, bosque, cerca, adornos, cámara, por dónde se puede caminar— dejaba de
   preguntar "¿qué forma tiene la granja?" y daba por sentado un rectángulo que empieza en (0,0).
   Con las expansiones eso deja de ser cierto: la granja es una forma que crece y que puede tener
   ángulos hacia dentro. Así que la pregunta se responde en UN solo sitio y el resto consulta.

   Como el orden de compra es fijo, "lo que tenés" es simplemente LAS N PRIMERAS del array — no
   hace falta guardar qué bloques, solo cuántos.

   Dos conjuntos, no uno:
     · MÍAS       — las celdas que poseés. Manda la cerca y dónde se puede construir.
     · DESPEJADAS — las mías MÁS un aire de 2,3 celdas. Manda hasta dónde llega el césped y desde
                    dónde empieza el bosque. Es lo que mantiene los troncos separados del cercado,
                    que es como se ve la granja hoy y tiene que seguir viéndose igual.
   Se cachea por cantidad de expansiones: se arma una vez y se reusa. */
GF.AIRE_BOSQUE = 2.3;      // celdas de césped entre la cerca y el primer tronco
GF.expOwned = 0;           // cuántas expansiones tiene el jugador AHORA (lo pone la escena desde G)
GF._terrenoCache = {};
GF.terreno = function (n) {
  n = Math.max(0, Math.min(GF.EXPANSIONES.length, (n == null) ? (GF.expOwned || 0) : n));
  if (GF._terrenoCache[n]) return GF._terrenoCache[n];
  const mias = new Set(), k = (c, r) => c + "," + r;
  for (let c = 0; c < GF.COLS_BASE; c++) for (let r = 0; r < GF.ROWS_BASE; r++) mias.add(k(c, r));
  for (let i = 0; i < n; i++) {
    const e = GF.EXPANSIONES[i];
    for (let c = e.c0; c < e.c1; c++) for (let r = e.r0; r < e.r1; r++) mias.add(k(c, r));
  }
  const A = GF.AIRE_BOSQUE, RA = Math.ceil(A), desp = new Set(mias);
  let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
  mias.forEach(s => {
    const p = s.split(","), c = +p[0], r = +p[1];
    for (let dc = -RA; dc <= RA; dc++) for (let dr = -RA; dr <= RA; dr++)
      if (dc * dc + dr * dr <= A * A) desp.add(k(c + dc, r + dr));
    if (c < c0) c0 = c; if (r < r0) r0 = r;
    if (c + 1 > c1) c1 = c + 1; if (r + 1 > r1) r1 = r + 1;
  });
  const t = { n, mias, desp, c0, r0, c1, r1, cols: c1 - c0, rows: r1 - r0,
    // el recuadro de lo DESPEJADO, que es lo que la cámara tiene que poder recorrer
    dc0: c0 - RA, dr0: r0 - RA, dc1: c1 + RA, dr1: r1 + RA };
  GF._terrenoCache[n] = t;
  return t;
};
/* Pone al día los valores derivados que TODO el juego ya usaba (COLS, ROWS, WORLD_W, WORLD_H).
   La clave para no reescribir medio farm.js: el origen del mundo deja de ser (0,0) y pasa a poder
   ser NEGATIVO —  GF.ORIG_X / GF.ORIG_Y —, porque al comprar por la izquierda o por arriba el
   claro se extiende hacia allá. Las coordenadas guardadas de los objetos no se tocan: siguen
   contando desde la esquina del corral original, que es lo que hace que ningún layout se rompa.
   Phaser trabaja sin problema con coordenadas negativas. */
GF.aplicarTerreno = function (n) {
  GF.expOwned = Math.max(0, Math.min(GF.EXPANSIONES.length, n || 0));
  const t = GF.terreno(GF.expOwned), T = GF.TILE;
  GF.C0 = t.c0; GF.R0 = t.r0; GF.C1 = t.c1; GF.R1 = t.r1;
  GF.COLS = t.cols; GF.ROWS = t.rows;
  GF.WORLD_W = t.cols * T; GF.WORLD_H = t.rows * T;
  GF.ORIG_X = t.c0 * T; GF.ORIG_Y = t.r0 * T;      // <= 0
  return t;
};
GF.tuyo      = function (col, row, n) { return GF.terreno(n).mias.has(col + "," + row); };
GF.despejado = function (col, row, n) { return GF.terreno(n).desp.has(col + "," + row); };
// El recuadro del terreno poseído, en PÍXELES (para cámara, fondos y límites).
GF.cajaTerreno = function (n) {
  const t = GF.terreno(n), T = GF.TILE;
  return { x1: t.c0 * T, y1: t.r0 * T, x2: t.c1 * T, y2: t.r1 * T, w: t.cols * T, h: t.rows * T };
};
// (compatibilidad) el rectángulo que envuelve el corral + lo comprado
GF.mundoCon = function (compradas) {
  const t = GF.terreno(Array.isArray(compradas) ? compradas.length : compradas);
  return { c0: t.c0, r0: t.r0, c1: t.c1, r1: t.r1, cols: t.cols, rows: t.rows };
};
GF.celdaComprada = function (col, row, compradas) {
  return GF.tuyo(col, row, Array.isArray(compradas) ? compradas.length : compradas);
};
// "detallitos (1)" 4-5-6: la granja se juega SIN caminar (todo con clic), la cámara se desplaza
// en vez de seguir al granjero, y la finca está sobre el mar. Cada cosa se puede apagar por separado.
GF.NO_WALK = true;    // el granjero no aparece en la granja: se interactúa con un clic desde donde sea
GF.CAM_PAN = true;    // cámara libre: se arrastra y la rueda desplaza (en vez de seguir al granjero)
GF.ISLA = true;       // fondo de mar alrededor de la granja
GF.ISLA_MARGEN = 260;   // cuánto mar se puede recorrer más allá de la cerca
/* ============ EL BOSQUE QUE RODEA AL CLARO (16/8, idea de dirección) ==============
   La granja deja de ser una isla en el mar y pasa a ser un CLARO dentro de un bosque
   cerrado. Se dibuja UNA sola vez en un renderTexture (como el suelo), así que no cuesta
   nada por frame aunque sean miles de árboles. Más adelante, cada porción se limpiará al
   subir de nivel y revelará lo que esconde. Todo tuneable desde acá. */
GF.BOSQUE = 1;              // 1 = anillo de bosque · 0 = la isla de siempre
// EL MAPA ES CUADRADO: 1600 x 1600, con la granja CENTRADA (17/8, dirección).
// La granja mide 714 x 504, así que los márgenes NO son iguales entre sí — lo que tiene que
// quedar igual es el total. Se calculan solos a partir de GF.MAPA para que nadie tenga que
// rehacer la cuenta si el mundo cambia de tamaño.
GF.MAPA = 1600;             // lado del mapa completo, en píxeles
GF.BOSQUE_MARGEN_X = Math.round((GF.MAPA - GF.WORLD_W) / 2);   // 443
GF.BOSQUE_MARGEN_Y = Math.round((GF.MAPA - GF.WORLD_H) / 2);   // 548
GF.BOSQUE_MARGEN = GF.BOSQUE_MARGEN_Y;   // respaldo, si alguien lee el valor viejo
// Cuántas celdas de bosque se DIBUJAN de verdad en el renderTexture. De ahí para afuera el
// mosaico repite el mismo patrón y se ve idéntico, pero sin costar memoria de textura.
// Con el bosque puesto la escena llegaba a 39 MB de textura y las texturas se corrompían:
// la laguna salía recortada, y con ?sinbosque=1 salía entera. Esto lo baja a la mitad.
GF.BOSQUE_RT_CELDAS = 7;
// TAMAÑO DEL ÁRBOL, EN CELDAS (17/8). Se pide en celdas y la escala se deriva del sprite, así
// que no puede volver a desincronizarse del resto del juego. Se descubrió midiendo que los
// árboles del BOSQUE eran de 2,3 a 3,2 celdas, o sea MÁS GRANDES que los que se talan dentro
// de la granja, que miden 2. El fondo era más grande que el primer plano.
GF.BOSQUE_TAM = 2;          // igual que los árboles de la granja
// A CERO: el export de la composición de dirección trae tamMin = tamMax = 2, todos idénticos.
// Con variación, dos árboles de la misma banda apoyan a alturas distintas y la franja de troncos
// se ensancha y se emborrona; con todos iguales queda alineada al pixel.
GF.BOSQUE_ESC_VAR = 0;
// LAS LEYES, dichas por dirección en una frase: "una fila de árboles cubriendo el centro inferior
// de cada celda, la siguiente fila ocupando la mitad de las líneas en vertical, y repetir".
//   "c" CELDA        x = (col+0,5)x42   base = (fila+1)x42
//   "v" MEDIA ARISTA x =  col x42       base = (fila+0,5)x42
// Alternan cada 21 px y cada banda queda corrida media celda: ese es el entrelazado. La tercera
// ley ("x", encrucijada) NO entra: comparte base con la de celda y juntas cerraban la línea.
GF.BOSQUE_LEYES = "cv";
// El RALEO solo se aplica MÁS ALLÁ de BOSQUE_FRENTE_SOLIDO, así que la primera línea —la que se
// ve de cerca y la que dirección compuso— queda intacta. Adentro sí conviene romper: con todos
// los árboles idénticos y en retícula perfecta, el fondo se lee como papel pintado al alejar.
GF.BOSQUE_DENSIDAD = { c: 0.86, v: 0.86 };
GF.BOSQUE_FRENTE_SOLIDO = 1.5;   // si algún día se ralea, la primera línea queda intacta
GF.BOSQUE_FILA_CADA = 1;         // se planta en todas las bandas
// El desorden queda en CERO en el FRENTE (el patrón de dirección es exacto), pero adentro se
// permite un poco para deshacer la retícula. Se aplica solo pasado BOSQUE_FRENTE_SOLIDO.
GF.BOSQUE_JITTER_X = 0;
GF.BOSQUE_JITTER_Y = 0;
GF.BOSQUE_JITTER_FONDO = 6;   // px de desorden en el interior del bosque, no en la primera línea
GF.BOSQUE_COLCHON = 1.5;    // radio del claro: agranda el rectángulo de referencia
// 17/8 (dirección): "la forma cuadrada queda mejor". El claro rectangular acompaña a la grilla
// de celdas, que también lo es. La irregularidad del borde la da el propio dibujo de los árboles.
GF.BOSQUE_REDONDEZ = 0;     // 0 = rectángulo · 1 = óvalo puro
GF.BOSQUE_ONDA = 0;         // cuánto se ondula el borde
// 17/8: el hueco entre la cerca y el primer tronco lo da ESTE número, no el colchón. Con 0,05
// el árbol de la derecha se metía 32 px dentro del mundo y el tronco de arriba colgaba 15 px
// por debajo del borde, encima de la cerca. 0,23 deja una celda entera de césped.
GF.BOSQUE_AIRE = 0.23;      // MUERTA desde el 18/8: el claro dejó de ser una elipse. El aire entre
                            // la cerca y los troncos lo manda GF.AIRE_BOSQUE (arriba), en CELDAS.
GF.BOSQUE_DEPTH = -999;     // encima del suelo, debajo de todo lo interactuable
/* INTERRUPTOR DE EMERGENCIA (16/8): si el juego no carga y sospechás del bosque, abrí la
   página con  ?sinbosque=1  al final de la URL y arranca sin él, sin tocar el código ni
   deployar. Con  ?bosque=1  se fuerza al revés. */
try {
  const _q = new URLSearchParams(location.search);
  if (_q.get("sinbosque") === "1") GF.BOSQUE = 0;
  if (_q.get("bosque") === "1") GF.BOSQUE = 1;
} catch (e) {}
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
// 16/8 (dirección): "la interacción y el cambio de sprites debe ser instantáneo en todo
// recurso, no debe haber delays". Las cuatro acciones de la granja pasan a 0: el golpe se
// resuelve y el sprite cambia EN EL MISMO FRAME del clic. Solo la pesca conserva su cast
// largo (es su mecánica). No son una palanca de balance sino la sensación del juego: se tocan
// acá y en ningún otro lado.
var ACT_DUR = { chop: 0, mine: 0, plant: 0, harvest: 0, water: 0, fish: 1.5 };
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
// 17/8 (dirección): de día mariposas, de noche LUCIÉRNAGAS con su halo. Es el MISMO bicho con
// otro traje: mismo movimiento, mismo revoloteo, misma guía. Solo cambia el aspecto, con un
// fundido de 6 s enganchado al mismo umbral que enciende los faroles.
var FX_LUCIERNAGAS = 1;    // 0 = de noche siguen siendo mariposas
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
  // 18/8: el Math.max(0, ...) que había acá se escribió cuando el mundo empezaba en la columna 0.
  // Con las expansiones hay columnas NEGATIVAS, y ese recorte mandaba a la columna 0 todo lo que
  // se colocara a la izquierda — los nodos de las expansiones del flanco izquierdo aterrizaban
  // todos apilados sobre el corral.
  const leftCol = Math.round((x - wCells * T / 2) / T);
  const baseRow = Math.round(y / T);
  const cx = leftCol * T + wCells * T / 2;   // centro X
  const by = baseRow * T;                    // base (abajo) sobre una línea
  return Object.assign({ key, cx, by, w: wCells * T, wCells, leftCol, baseRow }, meta || {});
}

// --- objetos del mundo (posiciones aprox. de la granja, ahora encajadas en celdas) ---
/* 17/8 — RE-MAQUETADO PARA LA GRANJA CUADRADA. El interior pasó de 15x9 (tumbado) a 13x12
   (casi cuadrado): sobran 3 filas y faltan 2 columnas. Todo el bloque natural que estaba
   apilado a la derecha (columnas 11-16) BAJA y se reordena en las columnas 10-13:
     · árboles  columnas 10-11 y 12-13, filas 2, 4 y 6  (el mismo ritmo de antes)
     · rocas    columnas 10 y 12, filas 8, 10 y 12
     · vetas    columnas 11 y 13, filas 9, 11 y 13, en orden de tier hacia abajo
   Y el correo (buzón + baúl) se corre una columna a la izquierda porque los árboles ahora
   empiezan en la 10. El ORDEN del array no se toca: los layouts guardados indexan acá. */
/* ============ AVISO: EL ORDEN DE ESTE ARRAY ES PARTE DEL GUARDADO ==================
   `G.layout` guarda las posiciones que el jugador movió en modo edición, INDEXADAS POR LA
   POSICIÓN EN ESTE ARRAY. Insertar un objeto en cualquier sitio que no sea EL FINAL corre todos
   los índices posteriores, y entonces el granero salta a donde había un árbol en la granja de
   todo el que ya movió algo. Por eso cada tanda histórica dice "al FINAL para preservar layouts".
   REGLA: los objetos nuevos SIEMPRE se agregan al final. Nunca se reordena ni se borra del medio.
   (Los enfriamientos de los nodos ya NO dependen de esto: desde el 18/8 usan la celda original
   como clave, precisamente para poder agregar los nodos de las expansiones sin miedo.) */
GF.WORLD_OBJECTS = [];
[[462,84],[546,84],[462,168]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));       // bosquecito NE, ahora en columnas 10-13
[[441,336],[525,336]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));             // cantera, debajo del bosquecito
[["piedra","node_stone",483,378],["bronce","node_bronze",567,378],["oro","node_gold",567,462],
 ["diamante","node_diamond",483,546],["netherita","node_netherite",567,546]]
  .forEach(o => GF.WORLD_OBJECTS.push(snap(o[1], {type:"ore", ore:o[0]}, o[2], o[3], T)));                                // 1 celda
GF.WORLD_OBJECTS.push(snap("barn",   {type:"barn"},   273, 84, T*2.5));                                                   // 3 celdas (5-7)
GF.WORLD_OBJECTS.push(snap("market", {type:"market"}, 252, 336, T*2.2));                                                  // 2 celdas (5-6)
GF.WORLD_OBJECTS.push(snap("store",  {type:"store"},  273, 420, T*2.8));                                                  // 3 celdas (5-7)
// quinta.docx: 5 árboles y 4 piedras en total — agregados AL FINAL para no romper layouts guardados
[[546,168],[462,252]].forEach(t => GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, t[0], t[1], T*2)));
[[441,420],[525,420]].forEach(r => GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, r[0], r[1], T)));   // cantera
// edificio de Cocina (detalles 29/7) — también al FINAL para preservar layouts guardados
GF.WORLD_OBJECTS.push(snap("cocina", {type:"cocina"}, 252, 252, T*2.2));   // 12/8: el sprite nuevo es alto, a 3 celdas quedaba gigante                                                     // 3 celdas
// dummy de práctica de espada (detalless.docx) — entrenar sube Espada, cooldown 4h
GF.WORLD_OBJECTS.push(snap("dummy", {type:"dummy"}, 189, 168, T));                                                         // 1 celda (se dibuja +25%) — columna 4
// nodo de HIERRO (detalles213) — al FINAL para preservar layouts guardados; se mina con el pico de bronce
GF.WORLD_OBJECTS.push(snap("node_iron", {type:"ore", ore:"hierro"}, 483, 462, T));   // veta, columna 11 fila 11
// BUZÓN (15/8, idea Stardew aprobada por dirección): las noticias de la granja llegan acá
GF.WORLD_OBJECTS.push(snap("buzon", {type:"buzon"}, 357, 84, T*0.4));   // 15/8: ~1/6 del granero — un buzón de verdad
GF.WORLD_OBJECTS.push(snap("baul_premios", {type:"cofre_diario"}, 399, 84, T*0.8));   // 15/8: ~1/3 del granero, como el shipping bin de Stardew
// TABLÓN DE PEDIDOS (16/8): a la IZQUIERDA del granero (dirección) — el rincón del correo
// (buzón + baúl) queda a la derecha, y los encargos del pueblo del otro lado.
// 17/8: los tres van en la MISMA fila que el granero. Al comprimir el mundo el buzón había
// quedado una fila más abajo, o sea DELANTE del baúl, y se lo tapaba. Con la granja cuadrada
// el rincón se corre una columna: tablón (4), granero (5-7), buzón (8), baúl (9).
GF.WORLD_OBJECTS.push(snap("tablon_pedidos", {type:"tablon_pedidos"}, 189, 84, T*0.9));
// HORNO DE PIEDRA (detalles viernes 1): acá se funden todos los lingotes/barras
GF.WORLD_OBJECTS.push(snap("horno", {type:"horno"}, 378, 252, T*2));
// viernes (2): 6 árboles y 6 piedras en total (1 activo + 5 por desbloquear) — al FINAL para preservar layouts
GF.WORLD_OBJECTS.push(snap("tree", {type:"tree"}, 546, 252, T*2));   // columnas 12-13, fila 6
GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, 441, 504, T));   // cantera, columna 10 fila 12
GF.WORLD_OBJECTS.push(snap("node_stone", {type:"rock"}, 525, 504, T));   // cantera, columna 12 fila 12

// ALTAR DE RUNAS (doc maestro 2/8) — al FINAL para preservar layouts guardados
GF.WORLD_OBJECTS.push(snap("altar", {type:"altar"}, 378, 336, T*2));
// "2das mejoras": Establo (animales) y Curtiduría (armaduras), juntos para que el bucle quede en la misma zona
GF.WORLD_OBJECTS.push(snap("establo", {type:"establo"}, 105, 378, T*2.5));   // 17/8: baja a la fila 9 — con la grilla de parcelas de pie (3x4) su tejado las pisaba, y mide 2,5 celdas de alto
GF.WORLD_OBJECTS.push(snap("curtiduria", {type:"curtiduria"}, 378, 420, T*2));   // al lado del Establo, como pide el doc
GF.WORLD_OBJECTS.push(snap("ofrendas", {type:"ofrendas"}, 294, 168, T*2));      // Altar de Ofrendas, columnas 6-7

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
/* 18/8: la definición era "el borde del rectángulo" (col<1 || row<2 || col>=COLS-1 || row>=ROWS-1)
   y con las expansiones el terreno deja de ser un rectángulo. La regla de verdad, la que siempre
   se quiso decir, es: una celda es CERCA si es tuya y tiene al lado algo que no lo es. Arriba son
   dos filas porque el arte es la cerca de frente más su sombra.
   En el corral 15x15 sin expansiones da exactamente lo mismo que la fórmula vieja — comprobado en
   tools/test-terreno.js — pero ahora también acierta en las esquinas hacia dentro. */
/* 20/8 (dirección) — UNA SOLA CELDA DE CERCA, EN LOS CUATRO LADOS.
   "El corral solo debe ocupar los extremos de la grilla. Si la grilla midiera 16×16, de 0,0 a 0,15
    sería la parte superior del corral, y de 1,1 a 1,15 ya sería DENTRO."
   Arriba se reservaban DOS filas ("la cerca de frente más su sombra") y eso se comía unas veinte
   celdas por granja, más las de arriba de cada bloque de expansión. Y el juego no se aplicaba su
   propia regla: el granero, el buzón, el baúl y el tablón están apoyados justo en esa segunda fila
   — o sea que sí cabe. Lo que el jugador veía era hierba vacía a la izquierda del granero, en su
   misma línea, y un « no » sin motivo aparente.
   Que se vea bien lo garantiza el orden de dibujo, que va por altura: lo que pongas en esa fila se
   dibuja POR DELANTE de la cerca, igual que ya hace el granero. */
GF.enCerca = function (col, row) {
  if (!GF.tuyo(col, row)) return true;                                    // fuera del terreno: intocable
  if (!GF.tuyo(col - 1, row) || !GF.tuyo(col + 1, row)) return true;      // pegado al borde izq/der
  if (!GF.tuyo(col, row + 1) || !GF.tuyo(col, row - 1)) return true;      // pegado al borde de arriba/abajo
  return false;
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
    // 18/8: se mide contra el ORIGEN del terreno, que puede ser negativo
    if (!natural && (r.x1 < GF.ORIG_X + M || r.x2 > GF.ORIG_X + W2 - M || r.y1 < GF.ORIG_Y + M || r.y2 > GF.ORIG_Y + H2 - M)) avisos.push(o.type + " se sale de la cerca");
    R.forEach(q => { if (q.n !== o.type && (q.n === "parcela" || q.n === "laguna") && cruza(r, q)) avisos.push(o.type + " pisa " + q.n); });
  });
  if (avisos.length) console.warn("[layout]", [...new Set(avisos)].join(" · "));
  return avisos;
};

// lotes de 1 celda. 17/8: con la granja cuadrada la grilla pasa de 4x3 (tumbada) a 3x4 (de pie)
// — son las mismas 12 parcelas, pero libera la columna 4 que el rincón del correo necesitaba.
GF.PLOTS = [];
(function(){ const c0=1, r0=2; for(let r=0;r<4;r++) for(let c=0;c<3;c++) GF.PLOTS.push({ col:c0+c, row:r0+r }); })();

/* ============ UNA PARCELA QUE NO ES TUYA NO RESERVA NADA (18/8) =====================
   REPORTE: "en esa celda no se puede colocar una parcela. En algunas celdas dentro del corral no
   se pueden poner cosas."
   CAUSA: GF.PLOTS nace con las 12 posiciones, pero el jugador arranca con 3. Las otras 9 son
   invisibles y aun así toda comprobación de "¿está libre esta celda?" las contaba, porque miraban
   GF.PLOTS ENTERO. Resultado: nueve celdas muertas repartidas por el corral, sin nada a la vista
   que lo explique, y un mensaje inútil ("Ahí no entra — probá otra celda").
   REGLA: una parcela ocupa su celda cuando es TUYA. Antes de eso es solo una reserva y el terreno
   está libre. Al desbloquearse, si su celda de siempre quedó ocupada, la parcela se muda a la más
   cercana que esté libre (que es justo lo que ya hacen las parcelas 13+).
   Esta es LA autoridad: cualquier sitio que pregunte "¿hay parcela acá?" pasa por acá. */
GF.parcelasTuyas = function () {
  const n = (typeof G !== "undefined" && G && G.plotsOwned) || 2;
  return Math.max(2, Math.min(GF.PLOTS.length, n));
};
GF.parcelaEn = function (col, row, ignora) {
  const n = GF.parcelasTuyas();
  for (let i = 0; i < n; i++) {
    if (i === ignora) continue;
    const p = GF.PLOTS[i];
    if (p && p.col === col && p.row === row) return true;
  }
  return false;
};

// estanque: rectángulo de celdas (4x3) — separado del borde para no cortar la cerca
GF.POND = { col:1, row:10, cols:4, rows:3 };   // 17/8: baja a las filas nuevas de la granja cuadrada
// copias base (para "Restaurar" después de mover parcelas/laguna en edición)
GF.PLOTS_BASE = GF.PLOTS.map(p => ({ col: p.col, row: p.row }));
GF.POND_BASE = { col: GF.POND.col, row: GF.POND.row };
GF.FISH = { col:5, row:12 };   // 17/8: al lado de la laguna, que bajó a las filas 10-12

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
  cofre_diario: { hw: 0.32, dep: 0.26 },
  tablon_pedidos: { hw: 0.38, dep: 0.20 },   // 16/8: el tablón — dos postes y poca panza
};
GF.solidRect = function (o) {
  const d = GF.SOLID[o.type] || { hw: 0.40, dep: 0.36 };
  const w = o.rw || o.w || T;
  return { cx: o.cx, by: o.by, hw: w * d.hw, dep: T * d.dep };
};
/* 18/8: se RECALCULA, no se calcula una vez. Aquí había un fallo de orden que costó caro:
   COLLISIONS se armaba en esta línea y los 32 nodos de expansión se añaden MÁS ABAJO, así que
   esos 32 árboles y rocas no tenían caja sólida. Se podía caminar a través de ellos, plantar
   encima y el buscador de caminos no los veía. Cualquier cosa que se sume a WORLD_OBJECTS
   después de este punto TIENE que llamar a GF.rehacerColisiones(). */
GF.rehacerColisiones = function () {
  let nArb = 0, nRoc = 0;
  GF.COLLISIONS = GF.WORLD_OBJECTS.map((o, i) => {
    const r = GF.solidRect(o);
    r.i = i; r.tipo = o.type; r.exp = o.exp;
    if (o.exp == null) {                 // el nº de orden que usa treesOpen / rocksOpen
      if (o.type === "tree") r.lock = nArb++;
      if (o.type === "rock") r.lock = nRoc++;
    }
    return r;
  });
};
/* ============ UN OBJETO QUE NO SE VE NO OCUPA CELDA (18/8) ==========================
   MEDIDO: 13 objetos del corral tenían caja sólida sin estar en la partida — los 7 edificios
   cuyo plano todavía no se colocó (ni siquiera se DIBUJAN: su posición de fábrica no se usa
   nunca, la elige el jugador con el plano) y los árboles y rocas todavía no entregados. Eran
   13 celdas muertas de 112, invisibles y sin explicación, y encima chocaban de frente con que
   ahora los nodos los coloca el jugador donde quiere: no podías poner tu árbol nuevo justo
   donde había un árbol futuro que no existe.
   Es la MISMA regla que ya vale para las parcelas: se ocupa la celda cuando la cosa es tuya.
   Ante la duda, presente — así un fallo acá deja una celda de más, nunca un objeto atravesable. */
GF.objetoPresente = function (c) {
  if (typeof G === "undefined" || !G) return true;
  if (c.exp != null) return (G.expansiones || 0) > c.exp;              // el bloque todavía no se compró
  if (typeof BUILD_DEF !== "undefined" && BUILD_DEF[c.tipo])           // edificio: existe al colocar su plano
    /* 18/8 — EL FANTASMA DE LOS EDIFICIOS. Acá se contaba `G.layout[c.i]` como prueba de que el
       edificio existe. Y G.layout NO dice si algo existe: dice DÓNDE ESTÁ. En la época en que los
       edificios venían puestos en el mapa se podían arrastrar en modo edición, y eso escribía su
       posición. Al cambiar a planos, esas entradas se quedaron en los guardados viejos: el Horno,
       la Cocina, el Establo y el Altar seguían ocupando sus celdas —invisibles— en partidas donde
       ni siquiera se ha colocado su plano. Es justo lo que reportó dirección.
       Un edificio existe si está CONSTRUIDO o si su obra está colocada. Punto. */
    return !!((G.built && G.built[c.tipo]) || (G.obras && G.obras[c.tipo]));
  if (c.tipo === "tree") return (G.treesOpen || [0]).includes(c.lock);
  if (c.tipo === "rock") return (G.rocksOpen || [0]).includes(c.lock);
  return true;
};
GF.rehacerColisiones();

/* ============ LOS NODOS QUE TRAE CADA EXPANSIÓN (18/8) =============================
   Cada bloque trae 1 ÁRBOL y 1 ROCA. Antes llegaba pelado: terreno para poner lo que compres,
   que ya sirve, pero la idea era que la expansión trajera algo vivo.

   Las 32 posiciones NO se escriben a mano: se DERIVAN de la geometría del bloque. Se piden las
   celdas del bloque que no son cerca en el momento en que se compra, y se eligen las dos más
   centradas. Ventaja: si mañana cambia el tamaño del bloque o el orden del recorrido, las
   posiciones se recalculan solas y no hay 32 números que revisar.

   Por qué es seguro: la cerca solo RETROCEDE. Una celda que es interior cuando comprás el bloque
   lo sigue siendo para siempre, porque comprar más terreno nunca convierte interior en borde.

   Van al FINAL de WORLD_OBJECTS, como manda el aviso de arriba, y llevan `exp` para que la escena
   sepa que no existen hasta que se compre esa expansión. */
(function () {
  const B = GF.BLOQUE, T = GF.TILE;
  GF.EXPANSIONES.forEach((e, i) => {
    const t = GF.terreno(i + 1);                 // el terreno JUSTO después de comprar este bloque
    const esCerca = (c, r) => {
      if (!t.mias.has(c + "," + r)) return true;
      return !t.mias.has((c - 1) + "," + r) || !t.mias.has((c + 1) + "," + r) ||
             !t.mias.has(c + "," + (r + 1)) || !t.mias.has(c + "," + (r - 1)) || !t.mias.has(c + "," + (r - 2));
    };
    const cx = e.c0 + (B - 1) / 2, cy = e.r0 + (B - 1) / 2;
    const libres = [];
    for (let c = e.c0; c < e.c1; c++) for (let r = e.r0; r < e.r1; r++)
      if (!esCerca(c, r)) libres.push({ c, r, d: Math.abs(c - cx) + Math.abs(r - cy) });
    libres.sort((a, b) => a.d - b.d || a.c - b.c || a.r - b.r);
    /* 18/8 (dirección): cada expansión sigue trayendo DOS celdas productivas —el total no se
       mueve— pero el reparto cambia: 1 PARCELA + 1 nodo, y el nodo alterna árbol y roca. Antes
       eran 1 árbol + 1 roca, y con eso las parcelas quedaban en el 23% de la granja terminada;
       ahora quedan en el 51%. La parcela no se dibuja acá: llega como regalo al baúl y el jugador
       la coloca donde quiera (expansionComprar la encola). Acá solo va el nodo. */
    /* 18/8 (dirección, 3ª pasada): las expansiones son la ÚNICA fuente de nodos, así que cada
       bloque trae UN ÁRBOL Y UNA ROCA. La parcela va aparte: llega al Cobertizo y la coloca el
       jugador donde quiera (nodosQueTocan la cuenta). Total por expansión: 3 celdas productivas. */
    const arb = libres.find(p => libres.some(q => q.c === p.c + 1 && q.r === p.r)) || libres[0];
    const roc = libres.find(p => p !== arb && !(p.c === arb.c + 1 && p.r === arb.r)) || libres[1] || libres[0];
    if (arb) GF.WORLD_OBJECTS.push(Object.assign(
      snap("tree", { type: "tree", exp: i }, (arb.c + 1) * T, (arb.r + 1) * T, T * 2)));
    if (roc) GF.WORLD_OBJECTS.push(Object.assign(
      snap("node_stone", { type: "rock", exp: i }, (roc.c + 0.5) * T, (roc.r + 1) * T, T)));
    /* 24/8 (dirección): « agregar 1 nodo de bronce y oro a la tercera parcela; repetir en la
       6-8-10-12-14-16 ». Esas siete traen DOS celdas productivas más, y por eso pagan más: la
       fórmula de costos las cuenta (EXP_CON_VETA en state.js) y la escalera se re-derivó sola.
       Las vetas se ponen en las libres siguientes, más lejos del centro que el árbol y la roca,
       para no romper la composición del bloque. */
    const ocupadas = [arb, roc];   // 24/8: lo que ya está puesto en el bloque — la parcela lo mira
    if (GF.EXP_CON_VETA.indexOf(i + 1) >= 0) {
      const libre = () => libres.find(p => ocupadas.indexOf(p) < 0 &&
        !(arb && p.c === arb.c + 1 && p.r === arb.r));   // la segunda celda del árbol no cuenta
      const vb = libre(); if (vb) ocupadas.push(vb);
      const vo = libre(); if (vo) ocupadas.push(vo);
      if (vb) GF.WORLD_OBJECTS.push(Object.assign(
        snap("node_bronze", { type: "ore", ore: "bronce", exp: i }, (vb.c + 0.5) * T, (vb.r + 1) * T, T)));
      if (vo) GF.WORLD_OBJECTS.push(Object.assign(
        snap("node_gold", { type: "ore", ore: "oro", exp: i }, (vo.c + 0.5) * T, (vo.r + 1) * T, T)));
    }
    /* 19/8 (dirección): "cuando uno hace la expansión, los nodos no tienen por qué llegar al baúl:
       tienen que aparecer dentro de la expansión hecha, y desde ahí el jugador decide si los mueve".
       El árbol y la roca ya aparecían colocados; la PARCELA era la excepción —se iba al baúl, había
       que reclamarla en el Cobertizo y colocarla a mano— y esa asimetría no tenía ninguna razón:
       tres celdas del mismo bloque, dos aparecen y una hay que ir a buscarla.
       Acá se reserva su celda, pegada a las otras dos, y expansionComprar la usa al comprar. Si el
       jugador la quiere en otro lado, la arrastra en modo edición como cualquier otra cosa. */
    /* 24/8: la parcela esquiva TODO lo que ya está puesto en el bloque — antes miraba solo el
       árbol y la roca, y con las vetas nuevas (bronce y oro) caía encima de una. Lo encontró
       test-expansion-retro, que es exactamente para lo que existe. */
    const par = libres.find(p => ocupadas.indexOf(p) < 0 &&
      !(p.c === (arb ? arb.c + 1 : -99) && p.r === (arb ? arb.r : -99)));
    e.parcela = par ? { col: par.c, row: par.r } : null;
  });
  GF.rehacerColisiones();   // 18/8: los nodos recién añadidos también son sólidos
})();

/* ============ OCUPACIÓN POR CELDA ≠ COLISIÓN POR PÍXELES (18/8) =====================
   blockedAt mide con CAJAS y está pensado para CAMINAR: la del árbol es solo el tronco
   (hw 0.17) para que el héroe pueda pasar bajo la copa. Pero se estaba usando también para
   "¿cabe algo en esta celda?", y ahí falla: el tronco queda centrado justo en la frontera
   entre las dos celdas del árbol y falla el centro de las DOS por 0,7 px. Resultado: las dos
   celdas de cada árbol se leían como suelo libre y se podía plantar una parcela encima.
   Para la rejilla hay que preguntar por la REJILLA. Esta es la autoridad de "¿hay un objeto
   del mundo en esta celda?", y usa leftCol/baseRow/wCells, que es como el juego coloca.
   OJO: un objeto con la base en la fila R ocupa la fila R−1 (así lo hace placeBlocked). */
GF.celdaObjeto = function (col, row) {   /* 18/8: envoltorio del mapa único, para no romper a quien ya lo llamaba */
  const o = GF.celdaOcupada(col, row);
  return (o && o.tipo !== "parcela" && o.tipo !== "laguna" && o.tipo !== "adorno" && o.tipo !== "cofre") ? o.tipo : null;
};
GF._celdaObjetoViejo = function (col, row, ignoraIdx) {
  const T2 = GF.TILE;
  for (let i = 0; i < GF.WORLD_OBJECTS.length; i++) {
    if (i === ignoraIdx) continue;
    const c = GF.COLLISIONS[i];
    if (c && !GF.objetoPresente(c)) continue;
    const o = GF.WORLD_OBJECTS[i];
    const an = Math.max(1, Math.ceil(o.wCells || 1));
    let lc = o.leftCol, br = o.baseRow;
    const lp = (typeof G !== "undefined" && G && G.layout) ? G.layout[i] : null;
    if (lp) { lc = Math.round((lp.cx - an * T2 / 2) / T2); br = Math.round(lp.by / T2); }
    else {
      const ob = (typeof G !== "undefined" && G && G.obras) ? G.obras[o.type] : null;   // obra colocada con su plano
      if (ob && typeof ob.col === "number") { lc = ob.col; br = ob.row + 1; }
    }
    if (row !== br - 1) continue;
    if (col >= lc && col < lc + an) return o.type;
  }
  return null;
};
/* 18/8 — QUIÉN ocupa la celda, no solo qué. Dirección: "el mensaje dice que hay un árbol, ¿pero
   vos ves un árbol?". Si el juego cree que hay algo donde no se ve nada, hay que poder SEÑALARLO
   sin abrir una consola. Devuelve el objeto entero y las celdas que ocupa, para poder dibujarle
   un recuadro encima y que se vea dónde está ese fantasma. */
GF.celdaOcupante = function (col, row) { const o = GF.celdaOcupada(col, row); return o && o.i != null ? o : null; };
GF._celdaOcupanteViejo = function (col, row) {
  const T2 = GF.TILE;
  for (let i = 0; i < GF.WORLD_OBJECTS.length; i++) {
    const c = GF.COLLISIONS[i];
    if (c && !GF.objetoPresente(c)) continue;
    const o = GF.WORLD_OBJECTS[i];
    const an = Math.max(1, Math.ceil(o.wCells || 1));
    let lc = o.leftCol, br = o.baseRow;
    const lp = (typeof G !== "undefined" && G && G.layout) ? G.layout[i] : null;
    if (lp) { lc = Math.round((lp.cx - an * T2 / 2) / T2); br = Math.round(lp.by / T2); }
    else {
      const ob = (typeof G !== "undefined" && G && G.obras) ? G.obras[o.type] : null;
      if (ob && typeof ob.col === "number") { lc = ob.col; br = ob.row + 1; }
    }
    if (row === br - 1 && col >= lc && col < lc + an)
      return { i, tipo: o.type, leftCol: lc, fila: br - 1, ancho: an, movido: !!lp };
  }
  return null;
};

/* ============ EL MAPA DE OCUPACIÓN — UNA SOLA VERDAD (18/8) ========================
   Dirección: "la forma en la que se tiene mapeado la granja no es lo más eficiente, porque da pie
   a estas situaciones. Tiene que ser un sistema por el cual ya tenga en su memoria qué ubicación
   está ocupando cada sprite, y saber de antemano cuántas celdas ocupa cada cosa."
   Tiene razón. Hasta hoy había CINCO fuentes opinando sobre si una celda estaba libre —la caja de
   píxeles de blockedAt, los objetos del mundo, las parcelas, los adornos y los cofres— y cada
   fallo de la jornada fue una de ellas desalineada con las otras. La peor era blockedAt: mide
   cajas CON UN MARGEN de 6 px para que el héroe no se pegue a los sprites, así que preguntándole
   por la rejilla cada objeto ensuciaba a sus celdas vecinas.
   A partir de acá hay UN mapa: celda → qué la ocupa. Se construye recorriendo cada cosa UNA vez,
   con su ancho en celdas declarado, y todo lo demás (colocar, el marcador, el sombreado, los
   mensajes) lo consulta. blockedAt se queda para lo suyo: CAMINAR.                              */
GF._ocupVer = 0;
GF.ocupCambio = function () { GF._ocupVer++; };   // lo llama quien mueva o coloque algo
GF.ocupFirma = function () {
  const g = (typeof G !== "undefined" && G) || {};
  /* 20/8: si la escena está viva es ELLA la que decide qué ocupa, así que la firma tiene que
     enterarse de cuándo aparece o desaparece. Sin esto, el mapa calculado durante el arranque
     —cuando todavía no había escena— se quedaba cacheado para toda la partida. */
  const hayEsc = (typeof window !== "undefined" && window.farmScene) ? 1 : 0;
  return [hayEsc, GF._ocupVer, GF.C0, GF.C1, GF.R0, GF.R1, g.expansiones || 0,
    (g.treesOpen || []).length, (g.rocksOpen || []).length, g.plotsOwned || 0,
    (g.decos || []).length, (g.chests || []).length,
    Object.keys(g.layout || {}).length, Object.keys(g.obras || {}).length,
    Object.keys(g.built || {}).length, GF.PLOTS.length].join("|");
};
GF.ocupacion = function () {
  const f = GF.ocupFirma();
  if (GF._ocupMapa && GF._ocupFirma === f) return GF._ocupMapa;
  const T2 = GF.TILE, m = new Map();
  const poner = (c, r, que) => { const k = c + "," + r; if (!m.has(k)) m.set(k, que); };
  /* 1) OBJETOS DEL MUNDO — Y LA REGLA SE INVIERTE (20/8, dirección, CUARTO aviso)
     "Son celdas oscuras que arriba de ellas no tienen ningún objeto."
     Llevo tres arreglos y sigue pasando, así que el problema no es cuál de las causas encontré:
     es que este mapa DEDUCÍA quién existe en vez de MIRARLO. Reconstruía la respuesta a partir de
     G.built, G.obras, G.layout, treesOpen, rocksOpen y las cajas de colisión — seis fuentes, cada
     una con su forma de estar desfasada— cuando a dos metros de aquí la escena ya tiene la lista
     de sprites y sabe cuáles están visibles. Cada vez que arreglé una de las seis, quedaban cinco.

     A partir de ahora, SI LA ESCENA ESTÁ VIVA, MANDA LA ESCENA: una celda se marca ocupada solo si
     el objeto que la ocupa tiene un sprite dibujado en pantalla. Lo que no se ve, no ocupa. No es
     una comprobación más: es la que hace imposibles a todas las demás, porque ya no hay forma de
     que el mapa y el dibujo discrepen — son la misma cosa preguntada una vez.
     `objetoPresente` se queda como respaldo para cuando no hay escena (el arranque, los tests, el
     Bosque), y ahí sigue valiendo la regla vieja: ante la duda, presente. */
  /* `window.farmScene` sobrevive al viaje al Bosque, así que además se exige estar EN la granja:
     una escena apagada tiene sprites destruidos cuya visibilidad ya no significa nada. */
  const esc = (typeof window !== "undefined" && window.farmScene && GF.scene === "farm") ? window.farmScene : null;
  let vivos = null;
  if (esc && Array.isArray(esc.objs)) {   // índice por posición en WORLD_OBJECTS, para no buscar en bucle
    vivos = new Map();
    esc.objs.forEach(o => { if (typeof o.i === "number") vivos.set(o.i, o); });
  }
  const seVe = (o) => !o.oculto && (!o.sprite || o.sprite.visible !== false);
  for (let i = 0; i < GF.WORLD_OBJECTS.length; i++) {
    const o = GF.WORLD_OBJECTS[i];
    let lc = o.leftCol, br = o.baseRow;
    if (vivos) {
      /* La escena manda: existe si tiene sprite a la vista, y está DONDE lo pintó la escena. */
      const v = vivos.get(i);
      if (!v || !seVe(v)) continue;
      const an0 = Math.max(1, Math.ceil(o.wCells || 1));
      lc = Math.round((v.cx - an0 * T2 / 2) / T2); br = Math.round(v.by / T2);
    } else {
      const col = GF.COLLISIONS[i];
      if (col && !GF.objetoPresente(col)) continue;
      const lp = (typeof G !== "undefined" && G && G.layout) ? G.layout[i] : null;
      const an0 = Math.max(1, Math.ceil(o.wCells || 1));
      if (lp) { lc = Math.round((lp.cx - an0 * T2 / 2) / T2); br = Math.round(lp.by / T2); }
      else {
        const ob = (typeof G !== "undefined" && G && G.obras) ? G.obras[o.type] : null;
        if (ob && typeof ob.col === "number") { lc = ob.col; br = ob.row + 1; }
      }
    }
    const an = Math.max(1, Math.ceil(o.wCells || 1));
    for (let k = 0; k < an; k++) poner(lc + k, br - 1, { tipo: o.type, i, ancho: an, leftCol: lc, fila: br - 1 });
  }
  // 2) las parcelas que YA son tuyas (una que no es tuya no ocupa nada)
  const nPar = GF.parcelasTuyas();
  for (let i = 0; i < nPar; i++) { const p = GF.PLOTS[i]; if (p) poner(p.col, p.row, { tipo: "parcela", i, ancho: 1, leftCol: p.col, fila: p.row }); }
  /* 3) LA LAGUNA — 20/8, dirección: "el sombreado no me deja colocar cosas donde no hay nada ahí".
     Acá había DOS verdades sobre la misma laguna, y es el mismo patrón que nos rompió la pesca:
       · para CAMINAR (blockedAt) la laguna es una ELIPSE — la forma del agua que se ve;
       · para CONSTRUIR (este mapa) era el RECTÁNGULO entero de 4×3.
     O sea que las cuatro celdas de las esquinas eran césped que se podía pisar y no se podía usar.
     Sombreadas en verde oscuro, sin nada encima que lo explicara. El jugador no está viendo un
     fantasma del guardado: está viendo una laguna cuadrada que nadie dibujó nunca.
     Una celda es agua si su CENTRO está dentro de la misma elipse que usa blockedAt. Un solo
     criterio para las dos preguntas, que es de lo que se trataba el mapa de ocupación. */
  { const p = GF.POND;
    const ex = (p.col + p.cols / 2) * T2, ey = (p.row + p.rows / 2) * T2;
    const rx = p.cols * T2 / 2, ry = p.rows * T2 / 2;
    for (let c = p.col; c < p.col + p.cols; c++) for (let r = p.row; r < p.row + p.rows; r++) {
      const dx = ((c + 0.5) * T2 - ex) / rx, dy = ((r + 0.5) * T2 - ey) / ry;
      if (dx * dx + dy * dy > 1) continue;   // esquina seca: se ve césped y se comporta como césped
      poner(c, r, { tipo: "laguna", ancho: p.cols, leftCol: p.col, fila: r });
    } }
  // 4) adornos y cofres colocados
  const g2 = (typeof G !== "undefined" && G) || {};
  (g2.decos || []).forEach((d, j) => poner(d.col, d.row, { tipo: "adorno", i: j, ancho: 1, leftCol: d.col, fila: d.row, id: d.id }));
  (g2.chests || []).forEach((c, j) => { if (c && c.col != null) poner(c.col, c.row, { tipo: "cofre", i: j, ancho: 1, leftCol: c.col, fila: c.row }); });
  GF._ocupMapa = m; GF._ocupFirma = f;
  return m;
};
GF.celdaOcupada = function (col, row) { return GF.ocupacion().get(col + "," + row) || null; };

GF.blockedAt = function(x, y, pad){
  pad = pad || 0;
  // 18/8: la cerca es sólida, pero "el borde" ya no es el del rectángulo — es el borde del
  // TERRENO que poseés, que puede tener entrantes. Se pregunta por la celda, con un recorte
  // pequeño para que no se pueda quedar montado justo encima del palo.
  {
    const c = Math.floor(x / T), r = Math.floor(y / T);
    if (!GF.tuyo(c, r)) return true;
    if (!GF.tuyo(c - 1, r) && (x - c * T) < 18) return true;
    if (!GF.tuyo(c + 1, r) && ((c + 1) * T - x) < 18) return true;
    if (!GF.tuyo(c, r - 1) && (y - r * T) < T * 0.72) return true;
    if (!GF.tuyo(c, r + 1) && ((r + 1) * T - y) < 16) return true;
  }
  const p = GF.POND, px = p.col*T, py = p.row*T, pw = p.cols*T, ph = p.rows*T;
  const ex = px + pw/2, ey = py + ph/2;
  const dxp = (x-ex)/(pw/2 + pad), dyp = (y-ey)/(ph/2 + pad);
  if (dxp*dxp + dyp*dyp < 1) return true;
  // rectángulos (no elipses): el borde es predecible y no se cuela por las esquinas
  for (const c of GF.COLLISIONS){
    if (x > c.cx - c.hw - pad && x < c.cx + c.hw + pad &&
        y > c.by - c.dep - pad && y < c.by + pad) { if (GF.objetoPresente(c)) return true; }
  }
  return false;
};

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   EL RELOJ DEL CIELO — UNA SOLA FUENTE PARA LA NOCHE                              (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   ESTO SE ESCRIBE PORQUE UNA AUDITORÍA ENCONTRÓ QUE `esDeNoche` NO EXISTÍA.
   Pesca v3 tiene dos especies que « solo pican de noche » (calamar y anguila) y las dos puertas
   que lo comprueban están escritas así:

       if (e.noche && typeof esDeNoche === "function" && !esDeNoche()) …

   El `typeof` era una precaución razonable — y fue exactamente lo que enterró el fallo. La
   función NUNCA existió: la guarda daba falso, la condición entera se saltaba, y el calamar se
   pescaba a las tres de la tarde. Un pilar del diseño llevaba días sin ejecutarse ni una vez, y
   ninguna de las 94 pruebas podía verlo porque todas comprobaban lo que pasa CUANDO es de noche.

   La lección, que es la de siempre en este proyecto: una guarda `typeof` sobre una función
   PROPIA no es defensa, es un silenciador. Se usa para lo que puede no estar (una escena de
   Phaser que todavía no cargó), nunca para código nuestro que tiene que existir siempre.

   Y el segundo motivo por el que vive ACÁ, en config.js: el cielo lo pintaba farm.js con su
   propia cuenta de minutos. Si esta función hubiera copiado esos números, tendríamos dos relojes
   —el que se ve y el que pesca— y el día que alguien corra el atardecer media hora, el jugador
   vería la granja oscura con el calamar todavía cerrado. Un solo lugar: farm.js pinta con
   `cieloDelMomento()` y la pesca pregunta a `esDeNoche()`, que lee lo mismo.

   HORA LOCAL, NO UTC — y a propósito. Todo lo DIARIO de este juego es UTC (el reset, el clima,
   el Mercader) porque tiene que ser igual para todos. La noche es lo contrario: es lo que el
   jugador VE en su pantalla. Si el calamar abriera en UTC, el que juega en Argentina vería la
   granja a oscuras con la laguna todavía diurna, y eso no es una regla: es un bug a los ojos. */
var CIELO_ALPHA_NOCHE = 0.38;          // cuánto oscurece el filtro en plena noche
var CIELO_NOCHE_MIN   = 0.12;          // por encima de este tinte, el juego lo considera « de noche »
var CIELO_TRAMOS = { nocheHasta: 330, amanecerHasta: 510, diaHasta: 1080, atardecerHasta: 1290 };
/* devuelve { alpha, col } — el tinte del cielo en un minuto del día (0-1439) */
function cieloDelMomento(min) {
  if (min == null) { const a = new Date(); min = a.getHours() * 60 + a.getMinutes(); }
  const T = CIELO_TRAMOS, A = CIELO_ALPHA_NOCHE;
  const lerp = (a, b, k) => a + (b - a) * k;
  if (min >= T.atardecerHasta || min < T.nocheHasta) return { alpha: A, col: 0x0a1030 };
  if (min < T.amanecerHasta) { const k = (min - T.nocheHasta) / (T.amanecerHasta - T.nocheHasta); return { alpha: lerp(A, 0, k), col: k > 0.5 ? 0x803010 : 0x0a1030 }; }
  if (min < T.diaHasta) return { alpha: 0, col: 0x0a1030 };
  const k = (min - T.diaHasta) / (T.atardecerHasta - T.diaHasta);
  return { alpha: lerp(0, A, k), col: k < 0.5 ? 0x803010 : 0x0a1030 };
}
/* LA función. El mismo umbral con el que se encienden los faroles y salen las luciérnagas: si la
   granja se ve de noche, es de noche para el calamar. Nada de dos criterios. */
function esDeNoche(min) { return cieloDelMomento(min).alpha > CIELO_NOCHE_MIN; }
window.cieloDelMomento = cieloDelMomento;
window.esDeNoche = esDeNoche;
