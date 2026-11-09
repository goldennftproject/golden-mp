# Reactivación de parcelas desde el mapa — 09/11/2026

El propietario aprobó la vista previa y pidió publicar, comprobar el guardado y hacer una noticia. Se conservan las reglas productivas, partidas, costes y capacidad actuales.

## Comportamiento

Tocar una parcela pausada abre una confirmación con su número, los cupos ocupados y las producciones activas que realmente pueden liberar un cupo. No hay selección predeterminada. El jugador elige qué pausar, revisa el resumen y confirma. Si sobra cupo, puede reactivar sin pausar otra producción. Se conserva el cultivo; plantar o cosechar requiere un nuevo gesto después de cerrar la ventana.

Abrir, elegir o cancelar no cambia la producción. La confirmación revalida la cuenta, partida, escena, guardado, capacidad y selección. El intercambio aplica un estado completo y realiza un único intento de guardado. Los errores durante la mutación revierten los campos afectados; los fallos posteriores de red conservan el cambio local y avisan que el guardado aún no está confirmado. No se anuncia un guardado inexistente.

## Validación y límites

66 casos en memoria: 27 del estado, 29 del DOM, 8 de interacción de FarmScene y 2 del handler HTTP real de guardar con Auth y almacenamiento sintéticos. Los dos intercambios aceptan HTTP 200 a 9/9, una sola escritura y cero repetición. Cubren cultivos secos, creciendo y listos, relojes de nodos, cupo libre/completo, cancelar, doble clic, datos desactualizados y errores inyectados. Las fuentes y evidencias están vinculadas por SHA en el manifiesto del caso plot-reactivation-20261109.

Las pruebas no entran en cuentas de jugadores ni ejecutan acciones reales en Nico. Una lectura posterior de un guardado ordinario podrá confirmar el uso real cuando ocurra; las pruebas aisladas no se atribuyen a ese jugador. La inspección completa de píxeles en navegador no estuvo disponible; la vista aprobada era una maqueta estática y se respetó el bloqueo de la vista local.

La entrega verifica commit y bytes transformados del servidor, feed e imagen de noticia. No modifica Supabase, Auth, Render, el cliente de guardado, sistemas desactivados ni el estudio de USDT. No repite ninguna recuperación anterior ni publica datos privados en las noticias.
