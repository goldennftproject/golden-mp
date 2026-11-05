# Objetivos de madera — reparación del 5 de noviembre

Dirección autoriza corregir, probar y publicar la recaída del contador y recuperar el progreso demostrable de todas las cuentas afectadas. Las recompensas continúan siendo manuales; no se entregan materiales ni Plata por esta operación.

## Guardados y acciones en curso

El valor y el instante de la energía deben referirse al mismo momento. Mover únicamente la fecha a la recepción del guardado hacía que la siguiente tala pudiera parecer un gasto inferior a un punto y quedar sin crédito. La normalización conserva o transporta ambos valores juntos, dentro de las fechas aceptadas por el servidor y de la energía admisible.

La validación de tala utiliza el instante validado del snapshot anterior: una acción realizada mientras se procesa ese snapshot no ocurrió necesariamente después de su recepción. La comprobación de cargas finales admite el margen de reloj de un segundo ya existente; las cargas iniciales y la producción no se adelantan. Propiedad, herramientas, XP, usos, duración de los relojes, presupuesto compartido, CAS y recibos permanecen protegidos.

Los testigos de enfriamiento de comida se conservan hasta confirmar el snapshot que los incluye. El bono vence en su momento habitual. La confirmación elimina únicamente testigos vencidos de esa petición y conserva los consumos realizados mientras estaba en vuelo.

## Recuperación

Se comprueba el periodo posterior al reinicio del 30 de octubre contra la campaña y su recibo. El progreso acumulativo usa el mínimo corroborado por estadísticas, usos de árbol y registros de madera, conservando el tope vigente y cualquier progreso mayor ya reconocido.

Para las misiones del día no se supone que una diferencia histórica haya ocurrido hoy. Sólo se recupera actividad fechable: en este lote, cuentas creadas el 5 de noviembre con estadísticas, usos, XP y registros concordantes y un libro de misiones de ese mismo día. Se ajustan la tala diaria y su progreso de energía de jornada; la energía disponible de la granja no cambia.

Una preimagen mínima nueva se cifra con DPAPI CurrentUser fuera del repositorio y se verifica por descifrado/hash. La operación compara versión, campos y hash del resto; omite cambios concurrentes para volver a respaldarlos. Usa objetivos absolutos y conserva reclamaciones y recibos. Cualquier cambio imprevisto de un trigger revierte la transacción. No se restauran snapshots históricos ni se ejecuta un reinicio.

## Verificación

Cliente y handler HTTP/CAS reales en memoria: acciones durante guardado, respuestas demoradas, consumos en vuelo, cargas parciales/completas y recarga. Pruebas negativas de relojes, herramientas, XP, energía y reintentos. Recuperación SQL en PGlite con concurrencia, idempotencia, campañas, cambios de día y triggers.

Se conserva el límite existente para relojes del cliente adelantados más de un segundo respecto al servidor. Las pruebas con dos segundos de adelanto y respuesta muy rápida siguen rechazando esas evidencias; esta reparación no amplía ese límite ni atribuye ese caso al equipo de un jugador concreto.

Estudio económico, retiros y balance quedan fuera de esta reparación. La respuesta al reporte de Discord se envía sólo después de verificar publicación y recuperación, por autorización expresa de dirección.
