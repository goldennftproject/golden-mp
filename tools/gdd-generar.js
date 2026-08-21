/* EL GDD SE GENERA DESDE SU FUENTE (21/8)
   La fuente de verdad del documento del diseñador es docs/GDD.md — texto plano, versionado con
   el juego, editable con cualquier cosa. Este script lo convierte al Word que se le entrega:
     node tools/gdd-generar.js            →  ../Golden_Farm_GDD.docx (la carpeta golden)
   ¿Por qué no pandoc? Sus tablas .docx salen sin anchos de columna y LibreOffice (y algún Word)
   las colapsa a una sola columna. docx-js con anchos DXA explícitos rinde bien en todos lados —
   la lección ya estaba en la primera versión del documento. */
const fs = require("fs"), path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, LevelFormat, PageBreak,
} = require("docx");

const FUENTE = path.join(__dirname, "..", "docs", "GDD.md");
const SALIDA = path.join(__dirname, "..", "..", "Golden_Farm_GDD.docx");
const md = fs.readFileSync(FUENTE, "utf8").split("\n");

/* ---- inline: **negrita**, *cursiva*, `codigo` ---- */
function runs(txt, extra) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let i = 0, m;
  const push = (t, o) => { if (t) out.push(new TextRun(Object.assign({ text: t, size: 21, font: "Calibri" }, extra || {}, o || {}))); };
  while ((m = re.exec(txt))) {
    push(txt.slice(i, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith("`")) push(tok.slice(1, -1), { font: "Consolas", size: 19 });
    else push(tok.slice(1, -1), { italics: true });
    i = m.index + tok.length;
  }
  push(txt.slice(i));
  return out;
}
const limpio = (t) => t.replace(/\*\*/g, "").replace(/(^|[^*])\*([^*]+)\*/g, "$1$2");

const CREMA = "FBF7EF", MARRON = "7A5A32", LINEA = "D8CBB6";
const hijos = [];
const P = (opts) => hijos.push(new Paragraph(opts));

/* ---- portada ---- */
let i = 0;
P({ children: [new TextRun({ text: "GOLDEN FARM", bold: true, size: 56, font: "Calibri", color: MARRON })], spacing: { before: 1800, after: 200 }, alignment: AlignmentType.CENTER });

const esTabla = (l) => /^\|/.test(l.trim());
const esHeading = (l) => /^\*\*.+\*\*$/.test(l.trim()) && !esTabla(l);

for (; i < md.length; i++) {
  let L = md[i];
  const t = L.trim();
  if (!t) continue;
  if (t === "**GOLDEN FARM**") continue;   // ya está en la portada

  /* tabla: juntar el bloque */
  if (esTabla(t)) {
    const bloque = [];
    while (i < md.length && esTabla(md[i].trim())) { bloque.push(md[i].trim()); i++; }
    i--;
    const filas = bloque.filter(f => !/^\|[\s\-|]+\|$/.test(f))
      .map(f => f.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
    const nCols = Math.max(...filas.map(f => f.length));
    const total = 9360;   // ancho útil DXA
    const anchos = [];
    /* primera columna corta si sus celdas son cortas (números, nombres de archivo aparte) */
    for (let c = 0; c < nCols; c++) {
      const maxLen = Math.max(...filas.map(f => (f[c] || "").length));
      anchos.push(Math.max(700, Math.min(4200, maxLen * 105)));
    }
    const factor = total / anchos.reduce((a, b) => a + b, 0);
    for (let c = 0; c < nCols; c++) anchos[c] = Math.round(anchos[c] * factor);
    const filasDoc = filas.map((f, fi) => new TableRow({
      children: anchos.map((w, c) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        shading: fi === 0 ? { type: ShadingType.CLEAR, fill: CREMA } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: runs(fi === 0 ? "**" + limpio(f[c] || "") + "**" : (f[c] || ""), { size: 19 }) })],
      })),
    }));
    hijos.push(new Table({ columnWidths: anchos, width: { size: total, type: WidthType.DXA }, rows: filasDoc,
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: LINEA }, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINEA },
        left: { style: BorderStyle.SINGLE, size: 4, color: LINEA }, right: { style: BorderStyle.SINGLE, size: 4, color: LINEA },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LINEA }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LINEA } } }));
    P({ children: [], spacing: { after: 80 } });
    continue;
  }

  /* encabezados en negrita */
  if (esHeading(t)) {
    const texto = t.slice(2, -2);
    const esSeccion = /^\d+\.\s/.test(texto);
    if (esSeccion) P({ children: [new PageBreakSiToca(), new TextRun({ text: texto, bold: true, size: 30, font: "Calibri", color: MARRON })].filter(Boolean), spacing: { before: 260, after: 120 } });
    else P({ children: [new TextRun({ text: texto, bold: true, size: 23, font: "Calibri" })], spacing: { before: 200, after: 80 } });
    continue;
  }

  /* viñetas y numeradas */
  if (/^-\s+/.test(t)) { P({ children: runs(t.replace(/^-\s+/, "")), bullet: { level: 0 }, spacing: { after: 60 } }); continue; }
  const num = t.match(/^(\d+)\.\s+(.*)$/);
  if (num && !esHeading(t)) { P({ children: runs(num[1] + ".  " + num[2]) , spacing: { after: 60 }, indent: { left: 260 } }); continue; }

  /* cita del índice */
  if (/^>/.test(t)) { P({ children: runs(t.replace(/^>\s?/, "")), indent: { left: 400 }, spacing: { after: 30 } }); continue; }

  /* párrafo normal (los enteramente en cursiva son las notas del documento) */
  P({ children: runs(t), spacing: { after: 110 } });
}

/* PageBreak solo si la sección no es la primera: helper perezoso */
function PageBreakSiToca() { PageBreakSiToca.n = (PageBreakSiToca.n || 0) + 1; return PageBreakSiToca.n > 1 ? new PageBreak() : null; }

const doc = new Document({
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT }] }] },
  sections: [{ properties: { page: { margin: { top: 1100, bottom: 1100, left: 1250, right: 1250 } } }, children: hijos }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(SALIDA, buf); console.log("GDD escrito en " + SALIDA + " (" + buf.length + " bytes)"); });
