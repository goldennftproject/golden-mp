# Producciones pausadas visibles en el Cobertizo — 06/11/2026

Dirección autoriza «Sí, corregir, probar y publicar» tras reproducir que una piedra pausada remitía al Cobertizo pero Reactivar quedaba dentro de una sección cerrada y no explicaba la falta de cupo.

El Cobertizo muestra un aviso de pausas antes de las misiones diarias, con «Ver pausadas» para abrir la gestión, desplazarla a la vista y llevar el foco a su resumen. La gestión comienza abierta si existen pausas, conserva el cierre manual en refrescos posteriores y muestra primero las producciones pausadas. Cada Reactivar bloqueado por capacidad explica el motivo junto al nodo, en el título y mediante una descripción accesible. Los nodos Golden con cupo propio no reciben ese bloqueo por falta de cupos comunes.

El cambio sólo afecta la presentación de `refreshProduccionGranja` en `ui.js`. No reactiva nodos automáticamente ni modifica la capacidad, VIP, costes, cargas, tiempos, datos de jugadores o guardados. La captura inicial no permite conocer el origen de la pausa individual.

Validación: `test-produccion-pausada-ui.js` cubre diez contratos sobre el renderer y motor reales con estado sintético: aviso antes de misiones, ausencia de duplicados, navegación y foco, orden de pausadas, cupo libre/completo, motivo accesible, cierre manual, reactivación conservando el reloj, ausencia de cambios al renderizar y cupo propio Golden. Pasan también `test-capacidad-productiva.js`, `test-cobertizo.js`, `test-cobertizo-teclado.js`, `test-nodo-gratuito.js` y `test-produccion-premium-ui.js`.

Revisión visual en navegador con granja aislada: aviso visible al abrir, acceso a gestión y Reactivar funcionando con cupo libre; con cupo completo, la piedra figura primero y el bloqueo muestra el motivo. Auth y guardado remoto desactivados sólo en el servidor local de QA. El caso y su recibo de publicación se conservan en `work/discord-proactivo-20261105/casos/piedra-pausada-20261106/` del espacio de trabajo de Codex.
