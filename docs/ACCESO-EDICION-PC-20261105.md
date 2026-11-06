# Edición de granja visible — 05/11/2026

El propietario pide hacer visible la posibilidad de mover objetos, mediante un martillo en el lateral derecho que permita entrar y salir del modo edición.

Se añade el botón `Editar` encima del disquete, con icono SVG de martillo y etiqueta breve. Al activarlo pasa a verde, muestra `Listo` y su ayuda dice Finalizar edición. `aria-pressed`, nombre accesible y `aria-controls` describen su estado. Los 44 px del botón y su posición a 74 px del borde inferior dejan espacio al disquete y a los controles de cámara.

El clic llama al `setEditMode` existente. Configuración y Finalizar edición conservan sus acciones y sincronizan el acceso nuevo; salir con un objeto en colocación lo devuelve al estado anterior mediante la misma operación existente. No se añade un atajo de teclado ni un controlador de distribución paralelo. La entrada conserva la marca `editVisto`, el progreso del tutorial y el guardado que ya realizaba el modo edición.

El acceso se muestra a partir de 900 px, exclusivamente en la granja propia y con el controlador preparado. Se oculta y deshabilita en otras escenas, durante visitas o modalidades bloqueantes. La ruta de Configuración y la presentación móvil permanecen. Las visitas sólo notifican al sincronizador visual cuando se abre o cierra su marco; se preservan el aislamiento y los datos públicos del visitante.

El menú y el aviso de guardado consideran el rectángulo del acceso para evitar solapamientos. El sello de carga sigue derivándose del código en el servidor; se conserva el literal GF_BUILD del HTML.

## Verificación

Se comprueban el arranque real de la UI con DOM sintético, entrar/salir por el martillo, coherencia con Configuración/Finalizar, cancelación de colocación, estado accesible, escena, visita, anchura y modalidad. Las pruebas existentes de barra de edición, menú, disquete, cámara, visitas y colocación de nodos Golden preservan sus contratos.

El lote no consulta ni modifica cuentas reales, economía o servidor de guardado. No cambia el movimiento de edificios, ocupación o validaciones, ni activa sistemas pausados. Evidencias y recibo de publicación: `work/edit-shortcut-20261105/` en el workspace de Codex.
