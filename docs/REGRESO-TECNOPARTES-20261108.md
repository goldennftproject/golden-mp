# Regreso pendiente de Tecnopartes — 08/11/2026

Dirección pide revisar y desbloquear el regreso tras combatir, pausando el trabajo visual. Se identificaron dos causas: la comprobación de calaveras omitía familias que el portal ya permite transportar, y pausar Forest no detenía los intervalos globales de la interfaz.

La lista se alinea con el contrato real de viaje: res, seed, fish, dish, arm, armor, armorset, gear, cont, pick, tool y cana. Se conservan cantidades, metadatos y unidades: los picos y herramientas transportados representan usos, sin multiplicarlos por durabilidad ni convertirlos en nuevos objetos. No cambia la probabilidad de caída ni el desgaste.

Los tres intervalos de initUI (presentación de bolsa/equipo, relojes pasivos y chips de flujo) se difieren sólo mientras la cuenta confirma una operación de calavera, conserva un recibo o tiene abierto su modal de recuperación. Los relojes absolutos se ponen al día al liberar la barrera. Las operaciones nuevas guardan también su snapshot previo, sin usarlo para sustituir progreso posterior.

Un recibo correlacionado y sellado como cancelado puede liberarse si su base coincide exactamente con las versiones local y remota y no hay guardado ordinario pendiente. Se conserva copia si hubo cambios, no se hidrata, no se cambia G, la base, lastSavedKey ni la marca de estado pendiente. Un recibo confirmado o una versión distinta conserva las protecciones previas.

Verificación: reproducción con los callbacks reales de UI y reloj que avanza, cancelaciones con estamina llena/gastada y progreso local, confirmaciones divergentes, cuentas/versiones distintas y reanudación de relojes. PostgreSQL local y planificadores comprueban todas las familias transportables, conservación de usos y equipo, tipos desconocidos y ACL. El dry-run de la cuenta real pasó tras reemplazar únicamente el validador; el hash y la fecha de su partida permanecieron idénticos. No se ejecutó su muerte desde administración, no se borraron recibos ni se compensaron materiales.

La corrección de navegador requiere cargar la versión nueva. En el recibo cancelado existente: Comprobar regreso verifica el UUID original; si ofrece Confirmar regreso, esa acción usa otro UUID y un nuevo guardado previo. No borrar los datos del navegador. La comprobación posterior del regreso efectivo depende de la acción del jugador; no confundir publicación con esa confirmación.
