# Guardado, actualizaciones y revisión de copias locales

El 07/11/2026 dirección traslada el reporte de NicoNFT: después de actualizar vuelve varias horas atrás. Pide investigar la causa, revisar otras cuentas y recuperar lo demostrable conservando avances posteriores.

## Evidencia y límites de la investigación

La auditoría usa sólo lecturas sanitizadas del proyecto Goldenfarm existente. Se revisaron 29 granjas y 17 cuentas con intentos de guardado desde las 12:00 UTC. Dos cuentas registraron conflictos HTTP409; sólo Nico tiene el reporte aportado de pérdida. No se observaron descensos de nivel/expansiones ni intentos de borrado en la bitácora de ese periodo. Esto no acredita que el progreso que nunca llegó al servidor esté a salvo ni que todos los jugadores estén libres del problema.

Nico tuvo un conflicto a las 15:02 UTC, anterior al despliegue de marcos de las 17:53 UTC, y otro a las 17:57 UTC. Su bitácora muestra casi 2h54 sin una nueva versión de granja antes del registro de las 17:55. Posteriormente hay guardados HTTP200 y nuevas versiones. La secuencia es compatible con progreso local pendiente y recarga desde una versión anterior; no identifica por sí sola el origen exacto del conflicto ni reconstruye las horas perdidas.

`farm_saves_log` conserva deltas y motivos de rechazo, no partidas enteras. Además se inserta antes del CAS de la granja: una fila sin sospechas no demuestra que la escritura terminara. Los recibos revisados de Nico no contienen una partida completa del periodo perdido. No se restauró ninguna cuenta ni se usaron los respaldos anteriores al reinicio autorizado.

## Corrección del cliente

El botón Actualizar iniciaba `saveFarm()` sin esperar su confirmación y recargaba 400ms después de comprobar el servidor. La reproducción local mantuvo ese guardado pendiente mientras se producía la recarga.

Ahora espera un guardado forzado con un ACK nuevo, misma cuenta, versión confirmada, colas vacías y huella del estado actual. Revalida inmediatamente antes de recargar. Ante fallo, conflicto, cambio de cuenta, acción en vuelo o espera agotada, mantiene la partida abierta y permite reintentar. Durante ese tramo sólo se difiere el latido pasivo del HUD; se libera siempre y los relojes absolutos recuperan el tiempo transcurrido. Las acciones reales no se ignoran. No cambia la cadencia de cinco segundos por inactividad ni añade guardados periódicos durante el juego activo.

Antes de hidratar la nube se conserva la copia propia pendiente que difiere; también una copia confirmada cuya versión sea posterior a la remota. La copia apartada anterior se archiva antes de reemplazarla. Los archivos se deduplican por huella y no se restauran automáticamente. Si no puede conservarse una copia pendiente relevante por falta de espacio, la carga se detiene antes de sobrescribirla. Los respaldos anteriores a un reinicio son sólo evidencia; no conceden derecho a recuperar esa partida.

## Herramienta de lectura local

`/revisar-copias.html` funciona en el mismo navegador y perfil donde se jugó. Busca cinco familias de copias del proyecto, únicamente tras pulsar Buscar. Permite recorrer lotes de 40, seleccionar una copia y confirmar su descarga. La exportación relee la copia elegida y exige que su hash no haya cambiado.

No lee Auth, cookies ni tokens, no consulta APIs, no escribe almacenamiento y no sube ni restaura archivos. Las copias sin marca de reinicio permanecen como evidencia advertida. El archivo contiene la partida y se comparte sólo por un canal privado elegido por el jugador. No se publica ninguna copia privada en el repositorio.

Para Nico hay que obtener primero esa copia. Después se comprobarán dueño, origen, fechas, reinicio, progreso y operaciones registradas frente a la versión actual. Cualquier recuperación necesitará preimagen cifrada, comparación de versión y conservación de los cambios posteriores. Los deltas de la bitácora no autorizan inventar una partida.

## Verificación

- 29 escenarios con funciones reales de guardado, carga y actualización: ACK lento, colas, errores, conflicto, cambio de cuenta, acciones en vuelo, esperas agotadas, doble clic, relojes reales, espacio y respaldos.
- 12 escenarios de la página: lectura opt-in, filtros, exportación única, hash, límites, paginación, XSS, formatos, otras cuentas y orígenes.
- Regresiones de autoguardado, interrupciones, carga del servidor, recuperación manual, testigos de comida y menús.

Las pruebas usan cuentas ficticias y ninguna escritura remota. Se preservan partidas, inventarios, herramientas, compras, economía, sistemas pausados, conexión a Supabase y el estudio de USDT apartado. La protección sólo estará en clientes que carguen la versión nueva; no convierte una actualización en una recuperación automática.
