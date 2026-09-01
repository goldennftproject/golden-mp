# Barrido de imprentas — 31/8

Después del caso del tablón de vales (devolvía el 200% de lo entregado; lo encontró dirección
jugando), se midió TODO circuito de moneda o premio con la vara doble: cuánto cuesta ganarlo y
cuánto valor líquido devuelve. El auditor queda vivo en `tools/auditar-imprentas.js` — se corre
con un comando y grita si algo se tuerce a futuro.

## Veredicto: 0 imprentas activas

| circuito | veredicto |
|---|---|
| Vales (tablón del pueblo) | cerrado hoy: emisión 1/160, gasto 40 → prima 25% (test propio la custodia) |
| Escamas (tienda Lonja) | todo hito de una vez salvo la larva (+10 plata/lance, cara para farmear) |
| Plata de la Lonja | prima real ~57% de un día de granja para quien cumple TODAS las ventanas — es el premio del oficio pesca, pagado contra lombrices y relojes |
| Goblin | propina ~10-15/día, una vez al día |
| Reventa | nada comprable se revende con margen; herramientas y semillas no son líquidas |
| Platos | sin venta libre: se comen o van al tablón, 1 pedido/día como mucho |

## Los dos hallazgos menores, RESUELTOS (decisión delegada por dirección, 31/8)

1. **El torneo pagaba el premio del podio a todos.** Los 2 días de granja del documento eran
   para el ranking 1º–10º; sin backend de tabla se pagaban enteros a todo el que llegara a la
   barra de 1,00 (un pez común en su peso máximo): 28,6% del día, el escalón más generoso por
   lejos. → Ahora llegar a la barra paga PARTICIPACIÓN: medio día (7,1% diario, en línea con
   marea/Capitán/mes). Los 2 días vuelven cuando exista el ranking real.

2. **El tablón pagaba los platos al doble** (`r.plata × 2`), la única excepción a la regla del
   1,0× del 18/8, sin porqué escrito. → Igualado a 1×. El margen del cocinero no desaparece:
   r.plata ya paga por encima de los insumos — se fue la prima duplicada, no la ganancia.

El auditor ahora lee el pool del juego en vez de copiar la fórmula (su propia lección: un
auditor que copia la fórmula audita su copia).
