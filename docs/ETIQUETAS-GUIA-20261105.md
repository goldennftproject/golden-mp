# Etiquetas de orientación — 5 de noviembre de 2026

Dirección aprobó hacer más específico el texto del botón Mostrar en los pasos de construcción y cocina. `guiaEtiquetaMostrar()` describe el resultado de `guiaDestinoActual()`, después de combinar el objetivo con sus subdestinos.

- Construcción o edificio correspondiente: Ver Herrería, Ver Horno y Ver Cocina.
- Control de receta: Ver receta. Cola de cocina: Ver olla. Control de recogida: Ver plato listo.
- Fuera de la granja: Ver mapa, coherente con la apertura de mapa ya existente.
- Otros destinos conservan sus etiquetas. Los desvíos a parcelas o Mercado no heredan el edificio del objetivo principal.

El texto accesible utiliza la misma etiqueta y conserva el objetivo completo. No cambia el controlador `mostrarObjetivo`, los destinos, selecciones, foco, permisos, recursos, producción o progreso. Mostrar no ejecuta la acción señalada.

La revisión nativa detectó que `reference-skin.css` ocultaba el texto real con tamaño cero y añadía siempre Mostrar mediante `::after`. Renovado PC ahora dibuja el texto real, con los tamaños de 18/15 px del diseño existente. Clásico y las reglas de móvil conservan su presentación.

## Validación

`node tools/test-etiquetas-guia.js` recorre el DOM y controlador reales con obras parciales, receta sin ingrediente, olla en curso, plato listo, foco del botón Recoger, desvíos a parcelas/Mercado y apertura del mapa. Comprueba que refrescar y mostrar no cocinan, construyen, cobran, guardan ni modifican la partida.

Regresión: `test-tuto-flecha.js`, `test-tutorial-despensa.js`, `test-tuto-nodos-en-espera.js` y `test-reference-ui.js`.

Revisión nativa en Chrome con seis estados ficticios y las hojas reales: etiquetas legibles, pseudo-elemento vacío, botón dentro del marco y sin desbordamiento en el tamaño de escritorio revisado. La vista local no carga Auth ni guardado y no forma parte del juego publicado. No se usaron cuentas reales para ejecutar acciones.
