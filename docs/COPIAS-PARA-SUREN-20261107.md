# Copias para Suren en un clic

Dirección pide un flujo breve: pulsar un botón, descargar todas las copias necesarias y entregar el archivo a Suren. `/revisar-copias.html` muestra «Descargar todo para Suren». La lista individual y sus controles anteriores quedan dentro de «Ver copias por separado».

El botón recorre las familias conocidas de respaldos del proyecto y descarga un JSON con todas las copias válidas de una misma cuenta, sus fechas y procedencia, una referencia actual si está disponible y la comparación de cada copia. No reduce la descarga a las dos prioridades que sugiere el informe. Incluye copias de etapas anteriores como evidencia advertida; no autoriza restaurarlas.

## Referencia de la partida

Sólo al pulsar el botón se consulta la clave exacta de sesión de este proyecto. Si contiene un acceso utilizable, dos GET verifican el usuario en Auth y leen su granja mediante RLS. El ID verificado por el servidor determina la cuenta; los metadatos editables del usuario no conceden acceso. La política existente de `farms` exige `auth.uid() = user_id` y no se modifica.

No se refresca la sesión, no se inicia otra, no se guardan credenciales ni se ejecutan escrituras. Los únicos destinos de red son los endpoints HTTPS fijos del proyecto. Tokens, correos, respuestas crudas de Auth y cuerpos privados de operaciones pendientes no se exportan. Si la sesión cambia durante la preparación se aborta, sin cambiar a la cuenta nueva ni reutilizar un fallback de la anterior.

Si no puede leerse la nube, la copia local actual sirve de referencia y se marca como no confirmada actualmente en el servidor. Si falta esa referencia y hay varias cuentas, se pide elegir una cuenta una sola vez. Las copias ajenas y las que carecen de dueño no se mezclan automáticamente.

## Comparación y archivo

El motor puro `game/backup-compare.js` compara cuenta, inicio, reinicio y prestigio antes de ordenar prioridades. Da más peso a experiencia y avances durables que a dinero o consumibles. Tiene en cuenta producciones en cola que pasan a la bolsa y semillas compatibles con plantaciones posteriores. Una diferencia sigue siendo evidencia, no prueba de pérdida ni autorización para sumar inventarios. La firma semántica sólo evita prioridades repetidas; no elimina snapshots descargados ni acredita autenticidad.

El formato es `schema: 2`, `kind: "goldenfarm-backup-review-bundle"`:

- `account`: cuenta y alias del paquete.
- `currentReference`: snapshot de referencia, procedencia y versión; `confirmedNow` sólo es verdadero para la lectura validada del servidor.
- `copies[]`: todas las copias válidas de esa cuenta con `source`, `warnings`, `comparison` y `snapshot`.
- `comparisonSummary`: prioridades para empezar la revisión, sin filtrar `copies[]`.
- `scope`: cantidades, omisiones y completitud. Si hay registros que no pudieron incluirse, `completeForAccount` es falso y `completeValidCopies` identifica el alcance de las copias válidas. Las omisiones sólo llevan metadatos seguros.

Los snapshots exportados son los leídos durante la preparación; una clave local que cambia después no sustituye silenciosamente la copia elegida para el archivo. El recorrido se limita a 4096 claves locales, 1 MB por respaldo, profundidad 40 y 60000 nodos por árbol, 64 MiB de lectura y 32 MiB de paquete. Superar un límite aborta la descarga; no produce un paquete truncado presentado como completo. Los datos originales no se borran ni se modifican.

Para una recuperación posterior hay que validar identidad, época, procedencia, diferencias, operaciones registradas y estado actual. Un archivo no firmado puede haber sido editado y su hash de procedencia no equivale a una firma. La página no fusiona máximos, compensa, restaura ni acredita premios; cualquier recuperación real conserva una preimagen y usa control de versión.

## Validación

20 escenarios del motor, 23 del paquete y las 12 regresiones de exportación individual. Cubren más de 40 copias, cuentas distintas, cambios de sesión, credenciales fuera del archivo, snapshots congelados, límites, omisiones, XSS, etapas, consumos y colas, sin datos de jugadores ni llamadas reales de red en los fixtures. La comprobación visual de navegador se interrumpió por el control automático al no poder identificar con confianza la URL de Chrome; no se declara validación visual completada.
