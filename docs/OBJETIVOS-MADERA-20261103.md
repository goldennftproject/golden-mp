# Objetivos de madera — 03/11/2026

Dirección solicita corregir el reporte de Not y recuperar el progreso demostrable de todas las cuentas afectadas después del último reinicio global.

## Corrección

- `actividadGranjaRefrescar()` actualiza también Objetivos cuando permanece abierto tras un guardado confirmado. El contador deja de exigir cerrar y abrir el menú.
- Guardar V8 reconoce la tala cuando se fabrica el hacha y se consume la madera antes del mismo guardado. El saldo neto de materiales o herramientas ya no es el único testigo.
- El nuevo testigo contrasta árbol poseído, usos y cargas disponibles por reloj, XP de Tala, herramientas/fabricación, costes y energía. Usa el último `updated_at` del servidor. Un pedido previamente guardado e intacto puede justificar el ingreso que oculta el coste neto del hacha.
- Los relojes de árboles conocidos se conservan cuando un cliente los omite o envía un contenedor inválido; no se convierten en árboles vírgenes al recargar. Se mantiene la compatibilidad limitada del testigo previo para partidas antiguas sin esa historia.
- Animaciones, compras, fabricación aislada, transferencias y contadores sin evidencia no acreditan nuevas talas. CAS e idempotencia permanecen.

## Recuperación autorizada

El último reinicio se acredita contra su recibo persistente del 30/10/2026, además de Auth y la marca de campaña. El objetivo acumulativo se lleva al máximo entre su valor actual y el mínimo corroborado por estadísticas, usos de árboles y los dos registros de madera, con el tope existente de 500.

Se respalda primero una preimagen mínima cifrada con DPAPI fuera del repositorio. La operación sólo admite la versión, hash y valor previamente respaldados; omite partidas que hayan cambiado para volver a comprobarlas. Sólo cambia `logrosV2.progreso.madera` y avanza la versión de guardado. No modifica recompensas reclamadas, operaciones, recursos, saldos, XP, compras ni otras metas.

Los contadores acumulativos no permiten fechar todas las acciones perdidas. No se trasladan talas de días anteriores a la misión diaria actual ni se conceden premios automáticos.

## Verificación

Regresión funcional de UI antes/después del ACK; handler real con fabricación, tala y gasto entre guardados; árboles normales/Golden y vírgenes; relojes omitidos y serialización en dos guardados; propiedad, pausa, calendario, energía y pedidos; CAS y reintentos. La reparación SQL se contrasta también en PGlite aislado con concurrencia, idempotencia y rollback ante modificaciones imprevistas.

El test anterior de actividad se actualiza al cobro manual vigente: su expectativa de 25 Plata automáticas también fallaba contra V7, anterior a esta corrección.
