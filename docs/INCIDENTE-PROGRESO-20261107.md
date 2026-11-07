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

## Seguimiento: guardado habitual y capacidad

Dirección aclara que debe verificarse el guardado habitual de Nico, no sólo el botón Actualizar. Una reproducción con una única pestaña demuestra otro defecto: el servidor acepta una petición, se pierden ambas respuestas y el siguiente ciclo crea otro UUID con la versión anterior. El servidor devuelve 409 y el cliente deja de autoguardar aunque permite seguir jugando. Esto demuestra un defecto del cliente; no acredita por sí solo el origen de cada conflicto de Nico.

El cliente retiene en memoria la petición ordinaria exacta por cuenta hasta confirmar su escritura. Los reintentos repetidos y los CAS propios se contrastan con la fila completa, UUID, nombre, versión y contenido; el UUID solo no basta porque otras operaciones pueden conservarlo. Se reconocen las normalizaciones vacías y el transporte exacto de energía con el mismo modelo del servidor, sin tolerancias ni exclusión de saldos, inventario, entregas o recibos. Si el estado difiere, conserva copia y bloqueo en lugar de elevar la versión a ciegas. Después de reconocer una petición retenida, un guardado adicional pone al día el avance posterior; no se hidrata la nube encima de las acciones locales.

El guardado manual, las ruletas y las operaciones existentes exigen que no quede petición pendiente después del flush. El aviso de conflicto permanece visible hasta resolverlo; deja de atribuir cualquier 409 a otra pestaña. La memoria retenida es de esta sesión JS: una pestaña antigua no recibe la corrección en vivo ni puede reconstruir retroactivamente el UUID que perdió. La recuperación de las horas anteriores sigue necesitando evidencia de una copia, y no se ha realizado ninguna restauración de cuenta.

La comprobación de capacidad del 07/11 a las 19:07 UTC observó Goldenfarm ACTIVE_HEALTHY, base principal 34.204.819 bytes (33 MiB, aproximadamente 34 MB), suma de bases del clúster 49.478.453 bytes, WAL 134.218.098 bytes y tablas de granjas 548.864 bytes. El plan Free limita el tamaño de base a 500 MB y tiene 1 GB de disco según https://supabase.com/docs/guides/platform/database-size. La base no está en modo de sólo lectura. Había dos conexiones activas y diez inactivas, con máximo configurado de 60; no se observaron deadlocks ni conflictos de recuperación PostgreSQL. Estos conflictos de recuperación son distintos de los 409 de versión del juego.

Los registros PostgreSQL consultados entre 14:00 y 19:10 UTC no contienen SQLSTATE de memoria agotada, disco lleno o exceso de conexiones; hay dos errores de otras clases. No se midió RAM global ni se atribuye memoria libre a una cifra de tamaño de base. Las 30 granjas tenían una media de 12.866 bytes por JSON y máximo de 23.241 bytes, por debajo del límite de 700.000 bytes del portero. No se limpió, amplió ni migró infraestructura.

Nico volvió a guardar recursos entre 18:54 y 19:00 UTC, con respuestas 200 y nuevas versiones, pero reaparecen 409 a las 18:55, 19:00 y 19:02. No se da por validada su sesión sólo por un guardado aceptado. El cambio visual de expansión a Establo puede venir de la brújula y sus prioridades; no prueba por sí solo un retroceso del tutorial. No se le pide continuar la extracción de copias mientras no disponga de tiempo.

La lectura del tutorial indica que ya está terminado. La brújula posterior prioriza planos y obras y puede cambiar entre Establo y expansión; no se interpreta ese texto como prueba de una restauración de partida. Los registros nuevos de guardado consultados no contienen sospechas ni bloqueo económico registrado; las validaciones de versión ocurren antes de insertar esa bitácora y siguen siendo una explicación compatible, sin demostrar la causa individual. El estado detallado del jugador permanece fuera de este documento público.

La cola ordinaria queda ligada a la cuenta que la inició. Una solicitud explícita de otra cuenta espera a la cola anterior y vuelve a comprobar su identidad antes de guardar; una respuesta antigua no escribe por su cuenta en la sesión nueva. La falta de carga validada no reserva una cola que pueda tragarse el primer guardado válido. Esta carrera se comprobó con acciones reales de tala y el handler HTTP, sin modificar el arnés de esa prueba.

Validación integrada: 14 suites aprobadas. Incluyen 32 escenarios de petición pendiente, cinco del aviso y confirmación manual, 13 del puente de ruletas, 28 de tala mientras se guarda, 29 de actualización segura, 12 de copias y las regresiones de interrupciones, autoguardado, carga, recuperación, comida y menús. Los preguardados económicos y de ruletas de la cuenta nueva reservan su cola antes de esperar la anterior, evitando una espera circular con la propia operación. Se actualizan fixtures recortados para incluir los helpers reales nuevos y se reemplaza una comparación textual obsoleta del handler F5 por ejecución de eventos; no se eliminan sus casos de seguridad. También se comprueba sintaxis del JavaScript servido después de quitar comentarios.
