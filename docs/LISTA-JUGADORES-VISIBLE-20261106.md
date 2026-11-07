# Lista de jugadores visible sobre la Tienda — 06/11/2026

Dirección autoriza «Sí, corregir y publicar la lista» al ver que la Tienda tapaba los nombres de jugadores conectados.

La lista existente pasa al cuerpo del documento para salir del contexto de capas del HUD. Su capa queda sobre la Tienda y debajo de las ventanas de juego. El ancho de 320 px incluye borde y relleno; se limita al espacio disponible y conserva un margen de 8 px. Al abrir, actualizar nombres o redimensionar, se recalculan posición y altura disponible. Mantiene desplazamiento interno, salto de línea, cierre por clic exterior/Escape y foco de vuelta al botón.

Sólo cambian `presencia-ui.js` y la regla CSS de la lista en `index.html`. Se conserva el literal `GF_BUILD`, los nombres mediante `textContent`, el contador, las cuentas únicas y el servicio SSE. No añade consultas, seguimiento, datos privados, reglas económicas ni guardados.

Validación: `test-presencia-ventana.js` comprueba ocho contratos con 101 nombres sintéticos, capas, ancho real, márgenes, cambios en 300/900/1200 px y poca altura, actualización de nombres, accesibilidad, cierre/foco y ausencia de red. Pasan `test-presencia-lista.js`, `test-presencia-jugadores.js`, `test-clic-interfaz.js` y `test-reference-hud.js`.

Navegador con granja aislada, Auth y guardado remoto desactivados sólo para QA: 80 nombres, panel comprobado por encima de la Tienda, desplazamiento hasta el último nombre, ajuste a 900×600, Escape y foco correctos, sin errores de aplicación. Caso y recibo de despliegue en `work/discord-proactivo-20261105/casos/lista-online-tapada-20261106/` del espacio de trabajo de Codex.
