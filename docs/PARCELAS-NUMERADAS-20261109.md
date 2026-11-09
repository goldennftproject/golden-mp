# Parcelas identificadas y pausa en su propio suelo — 09/11/2026

El propietario autoriza probar y publicar esta mejora. Sólo modifica la presentación de las parcelas en farm.js; conserva todas las partidas y las reglas productivas.

## Problema y comportamiento

El texto de pausa conservaba la posición inicial del temporizador o la de un cultivo previo. En parcelas contiguas podía verse dentro de la parcela de arriba; su aspecto dependía de la historia de crecimiento y de la recarga. La reproducción con el código original confirma esa confusión.

Cada parcela visible lleva su número estable i+1, el mismo que usa el Cobertizo. El texto al señalarla también comienza por «Parcela N». Mover o pausar una parcela no cambia esa identidad. El número es un objeto visual de escena reutilizado, sin interactividad, cambios de estado ni campos adicionales en los guardados. Se oculta en parcelas bloqueadas y cuando el zoom no deja espacio suficiente.

«Pausada» toma la posición del suelo de su propia parcela en cada actualización. Se limita su ancho al espacio disponible; reactivar restaura la escala normal del temporizador. No cambia la producción ni permite cosechar un cultivo que aún está creciendo.

## Comprobaciones

Las pruebas en memoria ejecutan los métodos reales de pausa, reactivación, interacción, cosecha y actualización. Cubren suelo seco, cultivo listo y en crecimiento; movimiento y recreación de escena; ancho de texto, zoom, números de dos cifras, parcelas bloqueadas y reutilización de etiquetas durante 1000 actualizaciones sin alterar el JSON del jugador. El manifiesto de entrega vincula las evidencias al SHA exacto del candidato. Se comprueban además sintaxis y transformación de comentarios utilizada por el servidor.

La apariencia completa en un navegador no se pudo validar: la conexión de prueba local falló y la política del navegador rechazó el archivo local. No se eludió ese bloqueo. La imagen de revisión es una ilustración estática, no una captura de Phaser. Las comprobaciones de geometría y comportamiento son automatizadas. La verificación posterior a publicar compara el commit servido por Render y los bytes del JavaScript transformado; no modifica cuentas ni simula una sesión de jugador real.

No se ejecutan migraciones, reparaciones, compensaciones ni cambios en cultivos, pausas, índices, inventario, costes o capacidad. La recuperación previa de Nico no forma parte de esta entrega y no debe repetirse.
