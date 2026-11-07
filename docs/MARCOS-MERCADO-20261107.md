# Marcos comunes de los menús

Dirección aprueba el diseño local y pide probar y publicar el 07/11/2026.

## Diseño aprobado

Renovado PC, desde 900 px, comparte las piezas extraídas del Mercado original: marco, placa escalonada del título, madera interior y cierre rojo. El larguero comienza a la misma altura que la tabla del título, también con dos líneas. El Mercado conserva su toldo; los demás menús no lo reciben. Se retira además el borde duplicado del cuerpo del Mercado y se oculta la barra de scroll nativa de la columna de accesos, conservando su desplazamiento.

La fuente original `public/assets/visual-v2/skin/ui-concept-reference.png` se conserva: SHA-256 `742fdeefe60b742fab466ed12ece3e59ed932892e551de6a12686bd89da81dda`. Los cuatro recursos nuevos suman 120.626 bytes y proceden de sus mismos píxeles. No requieren cambios del atlas Phaser.

## Integración

`game/market-window.css` se carga después de las hojas existentes. `game/market-window.js` se añade al cargador secuencial, con sus precargas, reintentos y sello de versión. La decoración sólo aparece cuando las cuatro imágenes se descargan; ante un fallo queda la presentación anterior. Clásico y móvil no solicitan estos recursos hasta activar Renovado PC.

Se conserva cada `h3`, botón, ID, referencia y evento. Los títulos largos ajustan su tipografía; las cabeceras y los cierres siguen visibles al recorrer ventanas largas. Los cierres prevalecen sobre la cabecera incluso en las ventanas que conservan `z-index:2` inline; la prueba con ratón detectó y corrigió esa superposición en Objetos de Granja.

## Validación

- Galería local de 48 vistas, con datos ficticios; cada captura contiene exactamente una ventana.
- Prueba funcional con los controladores reales de apertura, cierre, foco, arrastre, cantidades, confirmación y Ruletas: Renovado PC, Clásico PC y móvil. Las 38 ventanas estáticas activas abren y las 9 pausadas permanecen bloqueadas. Ruletas dinámica conserva sus pestañas y la devolución del foco. Los diálogos operativos mantienen su ruta propia de salida.
- 362 IDs y 115 controles originales conservados; sin compras, cobros, operaciones de cuenta ni llamadas remotas en las pruebas.
- Recorrido nativo de las 48 vistas y sus cierres disponibles. Cobertizo conserva cabecera y X al desplazarse; el cierre responde a teclado.
- Pruebas semánticas de precargas, fallos de arte, redibujados y capas del cierre; regresiones de menús, Mercado, adaptación, noticias y Ruletas. Dos fixtures anteriores se actualizan al contrato vigente: puerta del Altar y acceso Ruletas de la Tienda.

La galería, el servidor de pruebas y los datos de ejemplo sólo viven en el workspace de revisión. No se incluyen en el juego. No se modifican economía, tiempos, herramientas, inventarios, guardados, Auth, Supabase, USDT ni disponibilidad de sistemas pausados.
