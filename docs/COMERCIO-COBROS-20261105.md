# Comercio: ventas por cobrar — 5 de noviembre de 2026

Dirección aprobó mostrar las ventas pendientes al abrir Comercio, ofrecer un acceso directo, renombrar Mis anuncios a Mis anuncios y cobros y añadir Actualizar. La lista distingue errores de consulta de un resultado vacío confirmado.

## Comportamiento

El aviso muestra el número de ventas sin cobrar y la suma de `marketNet(price, marketFee(fila))`. La comisión y el redondeo de cada anuncio siguen siendo los existentes. Ver cobros abre la pestaña correspondiente; cada venta conserva su botón Cobrar y el servidor conserva su operación autenticada e idempotente.

Al abrir se consultan anuncios propios pendientes y, si corresponde, la lista pública. Navegar reutiliza esas respuestas; Actualizar y reabrir consultan de nuevo. Tras una operación manual se renuevan las lecturas. No se añaden intervalos, Realtime ni sondeos. El tooltip explica cuándo se consulta; no se presenta como un seguimiento en vivo.

La caché se asocia al UID y a una generación. Una respuesta anterior no pisa un refresco nuevo o una cuenta distinta, y un controlador de una lista anterior no ejecuta una operación en la cuenta nueva. Carga, error propio, error público y resultado vacío se muestran por separado. Un fallo público no impide acceder al cobro propio cuya consulta sí terminó correctamente.

## Lecturas

`mkList(null, {estricto:true})` y `mkMine({estricto:true, pendientes:true})` propagan fallos en lugar de devolver una lista vacía. Los callers anteriores conservan su comportamiento compatible.

Los anuncios propios filtran `paid=false` antes de paginar, con orden determinista por fecha e ID. Así los anuncios ya cobrados no ocultan ventas antiguas bajo el límite histórico de sesenta. Las páginas son de cien; veinte páginas completas se rechazan explícitamente para no presentar un corte incompleto como total. Una lectura estricta comparte un único plazo de quince segundos, cancelación y limpieza del temporizador; no reintenta automáticamente. Las páginas no son una fotografía atómica si otra sesión modifica la colección entre consultas: Actualizar permite renovar el corte.

No se cambia el esquema, RLS, Auth, operaciones de escritura ni función del servidor. No se activan retiros ni se modifica la economía.

Documentación oficial contrastada: [range](https://supabase.com/docs/reference/javascript/range), [order](https://supabase.com/docs/reference/javascript/order), [abortSignal](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal).

## Validación

- `tools/test-p2p-cobros-ui.js`: renderer y DOM reales con lecturas simuladas. Apertura/Actualizar, totales netos, navegación sin cobro, cobro manual, errores separados, caché sin sondeo, cambios de pestaña y descarte de respuestas/handlers antiguos.
- `tools/test-p2p-lecturas.js`: helpers reales contra query builder simulado. Vacío frente a error, compatibilidad, cobros antiguos tras más de cien filas, orden, cambio de cuenta entre páginas, plazo, cancelación y cero escrituras.
- Regresión: `tools/test-p2p-atomico.js`, `tools/test-redondeo-p2p.js`, `tools/test-alfa-bloqueos-visuales.js`.
- Revisión independiente de código y pruebas sin bloqueos.
- Chrome nativo con respuestas ficticias: aviso visible desde Comprar, acceso a Mis anuncios y cobros, cero confirmado, fallo de cobros y fallo público. Marco sin desbordamiento horizontal y Actualizar accesible en los estados revisados.

La galería local no carga Auth ni se conecta a Supabase; no se publica con el juego. Las pruebas no compran, cobran ni alteran anuncios o partidas reales.
