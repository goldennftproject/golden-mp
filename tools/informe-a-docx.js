/* EL INFORME DEL 9/9, EN WORD                                          (9/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Golden pidió el informe de Suren en documento. La fuente sigue siendo docs/PARA-SUREN-9-9.md
   —eso es lo que se edita— y esto lo pasa a .docx para mandarlo.
     node tools/informe-a-docx.js                                                              */
const fs = require("fs"), path = require("path");
const d = require("docx");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat,
} = d;

const RAIZ = path.join(__dirname, "..");
const SALIDA = process.argv[2] || path.join(RAIZ, "docs", "PARA-SUREN-9-9.docx");

/* Letter, no A4 (el defecto de docx-js). 1440 DXA = 1 pulgada. */
const PAGINA = { width: 12240, height: 15840 };
const ANCHO = PAGINA.width - 1440 * 2;          // 9.360: lo que queda entre márgenes

const GRIS = "444444", VERDE = "1F6F43", ROJO = "9B2C2C", AZUL = "1F3A93";

const p = (txt, o) => new Paragraph(Object.assign({
  children: typeof txt === "string" ? [new TextRun(txt)] : txt,
  spacing: { after: 120 },
}, o || {}));

/* negritas con **…** sin pelearse con un parser: se corta por el separador y se alterna */
function rico(txt, base) {
  return txt.split("**").map((t, i) => new TextRun(Object.assign({ text: t, bold: i % 2 === 1 }, base || {})));
}
const parr = (txt, o) => new Paragraph(Object.assign({ children: rico(txt), spacing: { after: 140 } }, o || {}));
const punto = (txt) => new Paragraph({ children: rico(txt), numbering: { reference: "puntos", level: 0 }, spacing: { after: 100 } });

const h1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
const h2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 } });

/* una raya de verdad: borde inferior de párrafo, no una tabla de una fila */
const raya = () => new Paragraph({
  text: "", spacing: { before: 120, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
});

function celda(txt, ancho, o) {
  o = o || {};
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    shading: o.cab ? { type: ShadingType.CLEAR, fill: "EFEFEF", color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: rico(String(txt), { bold: !!o.cab, color: o.color, size: 20 }),
      alignment: o.der ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: 0 },
    })],
  });
}

/* columnWidths en la tabla Y width en cada celda, las dos en DXA: si falta una, Google Docs la
   pinta torcida. Y la suma tiene que dar el ancho de la tabla. */
function tabla(cols, filas, opts) {
  opts = opts || {};
  const rows = [new TableRow({
    tableHeader: true,
    children: cols.map((c, i) => celda(c.t, c.w, { cab: true, der: c.der })),
  })];
  for (const f of filas) {
    rows.push(new TableRow({
      children: f.map((v, i) => celda(v, cols[i].w, { der: cols[i].der, color: (opts.color || [])[i] })),
    }));
  }
  return new Table({ columnWidths: cols.map(c => c.w), width: { size: ANCHO, type: WidthType.DXA }, rows });
}

const hijos = [];

/* ── portada ───────────────────────────────────────────────────────────────────────────── */
hijos.push(new Paragraph({
  children: [new TextRun({ text: "Golden Farm", bold: true, size: 52, color: AZUL })],
  spacing: { after: 60 },
}));
hijos.push(new Paragraph({
  children: [new TextRun({ text: "Cómo quedó el juego después de la tanda del 9 de septiembre", size: 30, color: GRIS })],
  spacing: { after: 200 },
}));
hijos.push(parr("Para Suren. Lo de abajo está **medido ejecutando el juego**, no leído. Donde no, se dice."));
hijos.push(new Paragraph({
  children: [new TextRun({ text: "Commits: 796bc97 · 1a1a105 · eeea13d · d9c23ff · d34db6c  (más 9b9d0b9 y fbf41f6 de anoche, los del CD de la Zona)", size: 18, color: GRIS, italics: true })],
  spacing: { after: 120 },
}));
hijos.push(raya());

/* ── el CD de la Zona ──────────────────────────────────────────────────────────────────── */
hijos.push(h1("Lo primero: el CD de la Zona Negra ya está"));
hijos.push(parr("Tenías razón y el fallo era mío. Bajé la constante a 0 y di el trabajo por hecho, pero el enfriamiento **no vive solo en la constante**: zonaCdHasta es una **hora guardada**. Quien salió de la Zona antes del despliegue arrastraba un timestamp futuro y el juego lo seguía respetando aunque la regla que lo escribió ya no existiera. Por eso vos lo veías y yo no."));
hijos.push(parr("Arreglado recortando al cargar la partida, no poniéndolo a cero: si algún día el enfriamiento vuelve a subir, la línea sigue siendo correcta sola."));

/* ── el estado ─────────────────────────────────────────────────────────────────────────── */
hijos.push(h1("El estado de la partida, medido"));
hijos.push(parr("Simulador, jugador de 3 sesiones al día, del minuto 1 al nivel 50:"));
hijos.push(tabla(
  [{ t: "", w: 4360 }, { t: "antes", w: 2500, der: true }, { t: "ahora", w: 2500, der: true }],
  [["llegar al nivel 50", "29,7 días", "**29,7 días**"],
   ["minutos de juego al día", "15", "15"],
   ["lo que cobra contra el ancla", "22,7 %", "22,7 %"]]
));
hijos.push(new Paragraph({ text: "", spacing: { after: 120 } }));
hijos.push(parr("El mes sigue en pie. Todo lo de esta tanda **redistribuye**, no infla."));

/* ── lo que está bien ──────────────────────────────────────────────────────────────────── */
hijos.push(h1("Qué está bien"));

hijos.push(h2("El ritmo de niveles ya no se hunde en el 11"));
hijos.push(parr("Se pagaban 5.000 de XP por el nivel 10 y 700 por el 11 — el escalón más caro de la partida y, detrás, uno al 14 %. En tiempo real: 2,4 días contra 0,3. El juego se ponía ocho veces más fácil de golpe, una sola vez, justo ahí."));
hijos.push(parr("Ahora los cuarenta niveles de la cola cuestan **las mismas horas de granja** (50 a 52 XP por celda; antes iba de 33 a 84). No se escribe ninguno: se derivan de las celdas que tenés en ese nivel, igual que las expansiones."));

hijos.push(h2("El pase es una escalera"));
hijos.push(parr("El escalón 2 pagaba 10 de plata y el 7 pagaba 7.740 — más que los otros veintinueve juntos. Ahora cada escalón paga una hora de la granja que tenés a esa altura: 300 en el 1, 1.140 en el 30, subiendo siempre. El carril entero cuesta lo mismo que antes (17.800 contra 20.300): es el mismo dinero puesto en orden."));

hijos.push(h2("La Caña de Hierro vuelve a tener hierro"));
hijos.push(parr("Se había quedado en { cuero, tablón } — una caña de hierro sin una sola barra. No fue descuido: con los precios de hoy no entraba en su presupuesto, porque el cuero pasó a valer 742 cuando los animales se fueron a 24 h. Se movió el presupuesto a 1.500, que es lo que la mezcla honesta cuesta. Y el nivel cuadra solo: la Curtiduría se levanta al 8, que es el nivel de esta caña."));

hijos.push(h2("26 niveles mudos pasaron a 3"));
hijos.push(parr("El plan cosmético estaba escrito y **no se entregaba nunca**. La línea que lo repartía preguntaba « ¿el premio de este nivel nombra un Título, un Marco…? » sobre un texto que se genera solo y jamás nombra un cosmético: la condición era imposible de cumplir. Un if que nunca es cierto no da error, no deja log y no lo ve nadie."));

/* ── lo que está mal ───────────────────────────────────────────────────────────────────── */
hijos.push(h1("Qué está mal — y necesita que decidas vos"));

hijos.push(h2("1 · Los diez primeros niveles no dan ningún cosmético"));
hijos.push(parr("Los cosméticos empiezan en el 11. O sea que los primeros **ocho días** —el tramo donde se decide si alguien se queda— no tienen ni un título ni un marco. Es donde más falta hace y es donde no hay nada."));

hijos.push(h2("2 · Tres niveles siguen mudos, y los tres por promesas viejas"));
hijos.push(tabla(
  [{ t: "nivel", w: 900 }, { t: "lo que la tabla prometía", w: 3200 }, { t: "por qué ya no es suyo", w: 5260 }],
  [["6", "6ª parcela GRATIS", "las parcelas las trae la expansión desde el 18/8"],
   ["8", "Cultivo Girasol", "lo abre la skill de Cultivo, no el nivel de granja"],
   ["17", "Horno nivel 2", "lo abre Minería 6"]]
));
hijos.push(new Paragraph({ text: "", spacing: { after: 120 } }));

hijos.push(h2("3 · Seis oficios no abren nada"));
hijos.push(parr("Espada, Hacha, Mazo, Arco, Tala y Artesanía suben de nivel y no desbloquean absolutamente nada, así que su techo cae a 150 — un panel que promete ciento cincuenta niveles con ciento cuarenta y ocho vacíos."));
hijos.push(parr("Probé atarles las veinte armas (4 tipos × 5 rarezas, que ya existen) con la escalera de las cañas. **Lo medí y lo saqué**: Espada nivel 4 son 85 ratas, el 9 son 674 y el 14 son 2.120, mientras el material de esas mismas armas se junta en días. El nivel no acompañaba al material, lo tapaba. Y la XP de combate es opcional —la Zona no hay que pisarla—, así que un jugador de granja se quedaba con la espada de madera sin entender por qué."));
hijos.push(parr("No lo dejé con otra escalera inventada porque cualquier número ahí es una adivinanza sobre un ritmo que no sé medir. **La decisión es tuya:** o los cuatro de combate reciben algo que abrir (una técnica, un pasivo, una ranura), o se acepta que su nivel es un número de daño y se les da un techo honesto. Lo que no puede seguir es el 150."));

hijos.push(h2("4 · Cuatro escalones del pase dan un objeto que no llega a su altura"));
hijos.push(parr("La cantidad se recorta a lo que se lee de un vistazo (200 en pilas, 60 en semillas y platos) y cuando la unidad vale 2 o vale 2.580 no hay cantidad legible que dé el número. El arreglo es cambiar el **objeto**:"));
hijos.push(tabla(
  [{ t: "nivel", w: 800 }, { t: "da", w: 3000 }, { t: "paga", w: 1300, der: true },
   { t: "debería", w: 1400, der: true }, { t: "", w: 2860 }],
  [["2", "60 semillas de Papa", "120", "360", "se queda corto"],
   ["7", "1 Pan de Trigo", "2.580", "420", "se pasa ×6"],
   ["14", "60 Papas Asadas", "180", "600", "corto"],
   ["18", "200 Flechas", "400", "780", "corto"]]
));
hijos.push(new Paragraph({ text: "", spacing: { after: 120 } }));

hijos.push(h2("5 · La escalera de cañas se aplanó arriba"));
hijos.push(parr("Al subir la de Hierro a 1.500, la de Oro (2.000) queda a solo ×1,33. Al nivel 12 esos 500 no frenan a nadie. Lo que de verdad cobra la caña de oro es su barra (21 h de veta), no su plata — pero si querés que el último escalón se sienta, hay que subirlo. No lo toqué solo: subir el precio del premio final es algo que se **siente**."));

/* ── rojos heredados ───────────────────────────────────────────────────────────────────── */
hijos.push(h1("Dos medidores en rojo que no son bugs nuevos"));
hijos.push(parr("Los dos estaban rojos **antes** de esta tanda; lo verifiqué volviendo a los commits de ayer."));
hijos.push(punto("**test-pesca-v4-nasas** — « la laguna PICA cuando abre el Lombricario ». Espera un pico de ingreso que hoy da 12,3 %. Es un choque entre lo que dice el documento y lo que dan los números después del tope de 15 lombrices/día. Hay que decidir cuál manda."));
hijos.push(punto("**auditar-silencios-del-raton** — dice 6 silencios contra una base de 3. Los tres « nuevos » son falsos positivos: dos son el return de un pointerdown (la acción se resuelve al soltar, que es lo que permite arrastrar la cámara sin talar el árbol de abajo) y el tercero es Escape cerrando ventanas, que sí contesta. El medidor envejeció con el código. **No le subí la línea base** porque el propio auditor lo prohíbe y tiene razón: hay que mover esos filtros a la cabecera del manejador, y eso es tocar el manejo de punteros de la granja."));

/* ── pendientes ────────────────────────────────────────────────────────────────────────── */
hijos.push(h1("Lo que sigue sin arreglar y no es de esta tanda"));
hijos.push(punto("**Recargar dentro de la Zona sigue esquivando la muerte.** Cerrarlo pide una política de desconexión, y matar a alguien por una caída de red sería perder progreso sin borrar caché — justo lo que la ley de la casa prohíbe."));
hijos.push(punto("**El arte:** que el sprite del granjero, la herramienta o el arma cambien de verdad. Un cosmético coleccionable es más que nada, que es lo que había, pero no es la skin puesta."));
hijos.push(punto("**El portero de guardado** (PARTE 2 del SQL, salir de modo sombra)."));

/* ── nota de método ────────────────────────────────────────────────────────────────────── */
hijos.push(h1("Una nota sobre cómo se hizo esto"));
hijos.push(parr("Tres de las cinco cosas de esta tanda salieron de **medir una recomendación mía y descubrir que era mala**:"));
hijos.push(punto("« que la cola de niveles arranque en 5.000 y decaiga » → el nivel 50 habría costado el **5 %** del tiempo del 11. Cambiaba un precipicio al principio por un derrumbe al final."));
hijos.push(punto("« atar las armas a su oficio de combate » → un muro de 2.120 ratas."));
hijos.push(punto("y escribí un matValor() que ya existía 4.000 líneas más abajo — escribir en vez de derivar, mientras arreglaba exactamente ese fallo."));
hijos.push(parr("El patrón de toda la semana es siempre el mismo: **un número escrito a mano que envejece en silencio debajo de una economía que sí se deriva.** El tablón con los minerales, la caña con su presupuesto, el pase con sus cantidades, la tabla de cosméticos que nadie leía. Ninguno estaba en rojo. Por eso ahora casi todo se deriva y hay un test que lo custodia."));

const doc = new Document({
  creator: "Golden",
  title: "Golden Farm — informe del 9/9",
  description: "Cómo quedó el juego después de la tanda del 9 de septiembre",
  numbering: {
    config: [{
      reference: "puntos",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 240 } } },
      }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22, color: "1A1A1A" }, paragraph: { spacing: { line: 288 } } },
      heading1: { run: { font: "Calibri", size: 32, bold: true, color: AZUL } },
      heading2: { run: { font: "Calibri", size: 26, bold: true, color: "222222" } },
    },
  },
  sections: [{
    properties: { page: { size: PAGINA, margin: { top: 1200, right: 1440, bottom: 1200, left: 1440 } } },
    children: hijos,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(SALIDA, buf);
  console.log("escrito: " + SALIDA + "  (" + Math.round(buf.length / 1024) + " KB)");
});
