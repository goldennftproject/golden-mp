# Cierre automático del sorteo de referidos — 08/11/2026

Dirección pide que el evento termine automáticamente a la hora anunciada. La última franja incluida sigue siendo el 8 de noviembre a las 23:59 de Uruguay y Argentina; el corte exclusivo es `2026-11-09T03:00:00Z`. No se cambian correo confirmado, granja nivel 3, máximo cinco boletos, inclusión de registros anteriores al anuncio, exclusiones ni premios.

## Corte y conservación de evidencia

La migración aplicada `20261108194504_cierre_automatico_referidos.sql` crea dos tablas privadas con RLS y sin permisos directos para roles de la API. Los hechos relevantes de Auth, granja, invitador, equipo y nombre público se capturan antes del límite. No hay claves foráneas hacia cuentas que puedan borrar esa evidencia por cascada después del cierre. Los guardados ordinarios sin cambio de nivel o nombre no vuelven a capturar datos.

La base de datos utiliza su reloj real, comprueba el plazo después de los bloqueos y después de leer las fuentes, y deja de admitir cambios de elegibilidad al alcanzar el corte. El job `gf-referral-20261108-close` sella la copia final y se elimina solo; su ejecución cada minuto permite reintentar si hay una transacción en curso. El corte de participación no depende de cuándo se selle, del bot, del navegador ni de Render. `closed_at` representa el plazo efectivo y `sealed_at` el momento real del sellado.

El job quedó activo y sus primeras ejecuciones reales terminaron correctamente. El recuento inicial conserva los 14 boletos provisionales de la consulta anterior: 4, 4, 3 y 3. La revisión de multicuentas y la publicación de boletos siguen siendo necesarias antes del sorteo; no se eligen ganadores ni se pagan premios automáticamente.

## Interfaz e invitaciones permanentes

`my_referral()` conserva sus campos y permisos anteriores y añade únicamente estado y recuentos del propio participante. `set_my_referrer()` no cambia. Configuración → Invitar amigos muestra el plazo en la hora local, los boletos propios y el estado del evento tras la consulta habitual. Un temporizador único cambia la vista a cerrado sin sondeos. Datos inválidos o errores no se presentan como cierre; se cancelan respuestas y temporizadores de cuentas o vistas anteriores. Las invitaciones permanentes, Ver, Copiar y Asignar siguen funcionando después del evento.

## Validación

- `tools/test-referidos-cierre.js`: normalización, límite exacto, cierre con reloj corregido, temporizador, errores, cambio de cuenta e invitaciones permanentes.
- `tools/test-referidos.js` y `tools/test-alfa-pausa.js`: regresiones de invitaciones y registro.
- `tools/test-cierre-referidos-sql.cjs`: 21 comprobaciones ejecutando la migración y los RPC anteriores sobre PGlite. Incluye correo, nivel y atribución tardíos, máximo cinco boletos, exclusiones, conservación de filas originales, cierre idempotente y permisos. Requiere `PGLITE_MODULE` apuntando a la instalación local de PGlite 0.5.8 o el paquete disponible en Node.
- Otra prueba aislada del caso ejecuta 20 comprobaciones adicionales. Reloj y Cron se sustituyen sólo en los procesos locales; la concurrencia entre conexiones se revisó por estructura de bloqueos, no se simuló con varias conexiones en PGlite.
- En producción se verificaron los permisos, la programación activa, el historial de ejecuciones y la conservación de la función de asignación y sus permisos.

Las tablas del módulo Cron son administradas por Supabase. Sus políticas predeterminadas generan dos avisos genéricos adicionales del asesor; se comprobó que `cron` no concede USAGE a `anon`, `authenticated` ni `service_role`. Un intento adicional de restringir sus políticas fue rechazado por el propietario administrado y no dejó migración aplicada; no se cambia de rol ni de propietario para sortear ese límite. Las tablas y funciones nuevas del evento sí quedan cerradas a esos roles.

La evidencia y la consulta pública sanitizada están en `work/referral-auto-close-20261108` del espacio de trabajo. Los criterios operativos apuntan a la copia del evento, sin volver a calcular los boletos desde el nivel actual después del cierre. No se modificaron partidas, saldos, compras, sistemas pausados ni la automatización de Discord eliminada.
