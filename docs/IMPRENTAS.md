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

## Dos hallazgos menores, para decisión de Suren

1. **El torneo paga el premio del podio a todos.** El documento asignaba 2 días de granja al
   ranking 1º–10º; sin backend de tabla comparativa, hoy se paga entero a TODO el que llegue a
   la barra de 1,00 — que es un pez común en su peso máximo. Son ~103 de plata/día promedio
   (28,6% del día), el escalón más generoso de la Lonja por lejos. Opciones: bajar a ~0,5 día
   hasta que exista la tabla, o escalar el pago con los puntos por encima de la barra.

2. **El tablón paga los platos al doble.** El pedido de platos usa `r.plata × 2` mientras los
   cultivos pagan 1×. Con el piso nuevo de pedidos, el mejor pedido de platos deja ~128 de
   margen sobre insumos (16 Papas Asadas). Acotado a un pedido diario si cae — es un premio,
   no un ciclo — pero el ×2 es una excepción sin porqué escrito. ¿Se queda o se iguala a 1×?

Ambos son decisiones de diseño, no bugs: los números están, la palanca es una constante.
