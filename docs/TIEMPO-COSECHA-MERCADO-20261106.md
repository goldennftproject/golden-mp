# Tiempo de cosecha en Mercado — 06/11/2026

Dirección traslada la sugerencia de NicoNFT: mostrar el tiempo de cosecha al lado del coste de las semillas.

Renovado PC muestra un reloj pequeño y el tiempo base de cada cultivo en el bloque del precio. Cuando no caben ambos datos en una línea, el reloj pasa debajo del precio sin desplazar los controles de cantidad o Comprar. La ayuda indica «Tiempo base hasta la cosecha».

Se reutiliza `fmtSecs(CROP_DEF[k].grow)`, que ya mostraba la descripción clásica. No se recalcula el tiempo efectivo de una siembra futura: tutorial, bonificaciones y demás modificadores siguen sus reglas. Comprar varias semillas cambia el total del precio, no el tiempo por cultivo. Clásico y móvil conservan su descripción, controles e identidad de nodos.

Validación: `test-reference-market.js` comprueba renderer real, reloj, precio dinámico, cantidades, cupos, bloqueos, estilos de 900 a 1672 px, reversión e idempotencia. `test-crop-icons.js`: 13 casos correctos. Chrome con granja sintética local sin inicializar Auth ni guardado remoto: los trece cultivos a 900×572 no desbordan el precio ni se superponen con Comprar. Vista normal revisada y sin errores de aplicación.

Sólo presentación. Sin cambios de precios, tiempos, economía, partidas, Supabase o sistemas pausados. No se envían anuncios a Discord en este lote.
