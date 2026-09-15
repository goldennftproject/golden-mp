/* El documento para el diseñador sobre la PARADA (15/9). node tools/doc-parada.js */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle } = require("docx");
const fs = require("fs");

const AZUL = "1F4E79", GRIS = "595959";
const P = (t, o = {}) => new Paragraph({ spacing: { after: o.after == null ? 120 : o.after },
  alignment: o.al, children: [new TextRun({ text: t, size: o.size || 22, bold: o.b, italics: o.i, color: o.color })] });
const H = (t, lvl) => new Paragraph({ heading: lvl, spacing: { before: 260, after: 120 },
  children: [new TextRun({ text: t, color: AZUL, bold: true, size: lvl === HeadingLevel.HEADING_1 ? 30 : 25 })] });
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 },
  children: [new TextRun({ text: t, size: 22 })] });

const ANCHOS = [2200, 1900, 1700, 3200];
const celda = (t, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA },
  shading: o.bg ? { type: ShadingType.CLEAR, fill: o.bg, color: "auto" } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [new Paragraph({ alignment: o.al, children: [new TextRun({ text: t, bold: o.b, size: 20, color: o.color })] })],
});
function tabla(cabecera, filas) {
  return new Table({
    width: { size: ANCHOS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: ANCHOS,
    rows: [
      new TableRow({ tableHeader: true, children: cabecera.map((t, i) =>
        celda(t, { w: ANCHOS[i], b: true, bg: AZUL, color: "FFFFFF", al: i ? AlignmentType.CENTER : undefined })) }),
      ...filas.map((f, n) => new TableRow({ children: f.map((t, i) =>
        celda(String(t), { w: ANCHOS[i], bg: n % 2 ? "F2F6FA" : undefined, al: i ? AlignmentType.CENTER : undefined })) })),
    ],
  });
}
const regla = () => new Paragraph({ spacing: { before: 80, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D0D7E2" } }, children: [] });

const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "GOLDEN FARM · COMBATE", size: 18, bold: true, color: GRIS })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "La « Parada » que aparece sobre el personaje", size: 38, bold: true, color: AZUL })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Qué es, por qué salta tan seguido con la rata, y la pregunta que te dejamos al final · 15/9", size: 19, italics: true, color: GRIS })] }),
      regla(),

      H("En una línea", HeadingLevel.HEADING_1),
      P("« Parada » es el bloqueo con el arma: el golpe del bicho existió, pero el personaje lo desvió y no entró nada de daño. Es una de las dos fórmulas del documento « Defensa de los mobs » que nos pasaste (§2 y §4), aplicada tal cual.", { after: 160 }),

      H("Qué pasa exactamente cuando la rata pega", HeadingLevel.HEADING_1),
      P("Cada golpe recorre tres pasos, en este orden:", { after: 120 }),
      bullet("1 · El bicho tira su daño con normal_random(0, máximo). Es una campana, así que casi siempre saca algo cercano a la mitad de su máximo, no el máximo."),
      bullet("2 · PARADA. Si al personaje le quedan cargas de bloqueo, se gasta una y al golpe se le resta un número al azar entre la mitad de tu defensa y tu defensa entera. Si con eso el golpe queda en cero → sale « Parada » y no entra nada."),
      bullet("3 · ARMADURA. Lo que sobrevivió a la parada todavía pasa por la armadura, que resta fijo. Eso no se escribe en pantalla: se ve en el número más chico."),
      P("La defensa del personaje sale del ARMA y del nivel de Espada, no de la armadura: (skill/4 + 2,23) × defensa del arma × 0,15. Mientras estás atacando se parte por la mitad, que es lo que dice el documento para el modo ofensivo.", { after: 160 }),

      H("Por qué sale tanto con la rata", HeadingLevel.HEADING_1),
      P("Porque son dos cosas que se suman: la rata es el bicho de nivel 1 (pega hasta 8) y el personaje de prueba lleva espada de bronce con Espada 20. Y además las cargas de bloqueo son 2 y se recuperan a 1 por segundo, mientras que la rata pega cada 2 segundos: nunca llega a quedarse sin parada contra ella.", { after: 140 }),
      P("Medido con 20.000 golpes de cada bicho sobre el perfil del día 7 (Combate 10 · Espada 20 · espada de bronce · armadura 1):", { after: 140 }),
      tabla(["Bicho", "Pega hasta", "Paradas", "Daño que entra de media"], [
        ["Rata", 8, "72 %", "0,27"],
        ["Murciélago", 11, "50 %", "0,99"],
        ["Larva venenosa", 11, "50 %", "0,99"],
        ["Araña", 21, "18 %", "5,04"],
        ["Goblin", 23, "16 %", "5,99"],
        ["Orco", 25, "14 %", "6,97"],
      ]),
      P("", { after: 100 }),
      P("Y el mismo personaje el día 1, con la espada de madera y Espada 10, contra esa misma rata: para solo el 17 % de las veces y le entran 2,6 de media. O sea: el sistema está haciendo lo que tiene que hacer — premia el arma y la práctica, y se nota sobre todo contra los bichos flojos.", { after: 160 }),

      H("Lo que sí nos preocupa", HeadingLevel.HEADING_1),
      P("La parada no envejece. Como depende del nivel de Espada y del arma, y las dos suben para siempre, el porcentaje sube para TODO el bestiario, no solo para la rata. Con espada de oro y Espada 30 el jugador para bastante más que esa tabla, también contra araña, goblin y orco.", { after: 120 }),
      P("Eso choca con algo que ya sabemos: la vida del héroe sube en el Combate 5 (+20) y en el Combate 10 (+40), y del 11 en adelante NO SUBE NUNCA MÁS. Queda en 160. Así que el jugador de largo plazo se defiende cada vez mejor mientras su vida se queda quieta: el riesgo lo tiene que poner el daño de los bichos, y ése es justo el que no puede escalar mucho sin volverse injusto.", { after: 160 }),

      H("La pregunta", HeadingLevel.HEADING_1),
      new Paragraph({ spacing: { before: 60, after: 140 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: AZUL, space: 12 } },
        children: [new TextRun({ text: "¿La parada tiene que seguir creciendo sin techo con el nivel de Espada, o le ponemos un límite?", size: 24, bold: true, color: AZUL })] }),
      P("Si te parece que hay que frenarla, tenemos tres perillas, de menos a más invasiva:", { after: 120 }),
      bullet("Las cargas de bloqueo (hoy 2, con 1 de recuperación por segundo). Bajarlas a 1 hace que contra un bicho rápido no siempre haya parada disponible. Es el cambio más chico y el más fácil de explicar al jugador."),
      bullet("El 0,15 de la fórmula de defensa. Es el multiplicador que traduce arma + skill en defensa. Tocarlo mueve la curva entera, arriba y abajo."),
      bullet("Un techo de parada (por ejemplo, que nunca pase del 50 % contra un bicho de tu nivel). Es lo que más se aleja del documento original, así que no lo tocamos sin que lo pidas."),
      P("No movimos nada: la fórmula está tal como vino en el documento y queremos que la decisión sea tuya.", { after: 100, i: true, color: GRIS }),
      P("Si nos decís por dónde, lo medimos otra vez con los mismos 20.000 golpes y te pasamos la tabla nueva antes de dejarlo puesto.", { after: 60 }),
    ],
  }],
});

Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || "parada.docx", b); console.log("ok"); });
