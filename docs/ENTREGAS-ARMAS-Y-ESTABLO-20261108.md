# Entregas de armas y requisitos del Establo — 08/11/2026

Dirección pide resolver el reporte de entrega rechazada con bolsa 15/35 y aporta otro de compra de Alpaca que no aparece. No se cambia ni restaura ninguna cuenta directamente.

## Entregas

Una entrega confirmada de arma repetida se recoge como una instancia independiente en `weaponSpares`. Cada copia conserva íntegra su ficha y ocupa una casilla. El arma actual no se sustituye al recoger. La copia se identifica en Inventario como repuesto y puede usarse con clic o teclado; la operación confirmada guarda la anterior como repuesto. Si ya no existe la anterior, sólo se retira la copia elegida. Las armas guardadas no viajan ni se pierden con el contenedor de Zona Negra.

El guardado sólo admite crear copias contra entregas retiradas del servidor, con multiplicidad y ficha exactas; no permite modificar o eliminar copias aceptadas ni fabricar recibos. El cambio de arma usa la fila del servidor, cuenta verificada, guardado previo, CAS y recibo de operación. Reintentar el mismo recibo devuelve el resultado sin intercambiar otra vez. Las pestañas antiguas conservan los campos omitidos; no se inyectan defaults en snapshots que nunca los tuvieron.

Ruletas y Comercio muestran objeto y motivo real de las entregas que quedan pendientes, distinguiendo espacio, límite de picos, armadura repetida y entrega inválida. No se alteran premios, probabilidades, precios, saldos, mejoras ni runas.

## Establo

La Alpaca requiere poder cultivar Trigo (Cultivo 6) o disponer de Trigo en bolsa, además del Establo, Ganadería, cupo y Plata que ya exigía el motor. La ficha y el botón consultan la misma función de requisitos que la compra, muestran el motivo junto al precio y evitan una confirmación que terminaría cancelada. El motor vuelve a comprobar al confirmar. Las reglas, precios y alimento permanecen iguales.

## Validación

- Motor, inventario real y handler HTTP de guardado con estados sintéticos: dos armas distintas, capacidad, guardado/recarga, intercambio, respuesta perdida, doble clic, teclado, hotbar y cambio de cuenta.
- Rechazo de copias inventadas, payload alterado, reutilización de una entrega y modificación de recibos; compatibilidad con clientes anteriores.
- Chrome local: recoger pasa de 15/35 a 16/35; usar el repuesto conserva la ficha anterior y una recarga confirmada conserva ambas.
- Compra de animal bloqueada sin cobrar, desbloqueo por alimento o Cultivo, cupo, precio y conservación al guardar.

No se modifica esquema, Auth, conexión, partidas, automatizaciones ni sistemas desactivados. Las lecturas de diagnóstico sólo proyectan los campos necesarios y no se publican copias de jugadores.
