# Regreso pendiente de Tecnopartes — 08/11/2026

Dirección pide revisar y desbloquear el regreso tras combatir, pausando el trabajo visual. Se identificaron dos causas: la comprobación de calaveras omitía familias que el portal ya permite transportar, y pausar Forest no detenía los intervalos globales de la interfaz.

La lista se alinea con el contrato real de viaje: res, seed, fish, dish, arm, armor, armorset, gear, cont, pick, tool y cana. Se conservan cantidades, metadatos y unidades: los picos y herramientas transportados representan usos, sin multiplicarlos por durabilidad ni convertirlos en nuevos objetos. No cambia la probabilidad de caída ni el desgaste.

Los tres intervalos de initUI (presentación de bolsa/equipo, relojes pasivos y chips de flujo) se difieren sólo mientras la cuenta confirma una operación de calavera, conserva un recibo o tiene abierto su modal de recuperación. Los relojes absolutos se ponen al día al liberar la barrera. Las operaciones nuevas guardan también su snapshot previo, sin usarlo para sustituir progreso posterior.

Un recibo correlacionado y sellado como cancelado puede liberarse si su base coincide exactamente con las versiones local y remota y no hay guardado ordinario pendiente. Se conserva copia si hubo cambios, no se hidrata, no se cambia G, la base, lastSavedKey ni la marca de estado pendiente. Un recibo confirmado o una versión distinta conserva las protecciones previas.

Verificación: reproducción con los callbacks reales de UI y reloj que avanza, cancelaciones con estamina llena/gastada y progreso local, confirmaciones divergentes, cuentas/versiones distintas y reanudación de relojes. PostgreSQL local y planificadores comprueban todas las familias transportables, conservación de usos y equipo, tipos desconocidos y ACL. El dry-run de la cuenta real pasó tras reemplazar únicamente el validador; el hash y la fecha de su partida permanecieron idénticos. No se ejecutó su muerte desde administración, no se borraron recibos ni se compensaron materiales.

La corrección de navegador requiere cargar la versión nueva. En el recibo cancelado existente: Comprobar regreso verifica el UUID original; si ofrece Confirmar regreso, esa acción usa otro UUID y un nuevo guardado previo. No borrar los datos del navegador. La comprobación posterior del regreso efectivo depende de la acción del jugador; no confundir publicación con esa confirmación.

## Seguimiento: carga desde cero y botón sin respuesta

El jugador confirmó que seguía bloqueado después de la primera publicación. La reproducción anterior no incluía `initSave` y `loadFarm` antes de usar ambos botones. El guardado canónico tenía vida cero y un viaje válido, pero `derivarEstado` lo convertía en vida uno al recargar; una nueva muerte se rechazaba antes de enviar su petición. Ahora conserva cero sólo si los propios datos cargados contienen esa vida y una zona de viaje válida. Un recibo local no puede convertir una partida viva en una derrota. Fuera de ese caso se mantiene el mínimo histórico.

Además, Forest solicita el estado de calaveras y abre el modal que pausa la escena. Una respuesta posterior se descartaba porque una escena pausada no es activa. La lectura ahora admite esa pausa vigente, manteniendo cuenta, generación y ciclo de vida. Confirmar verifica de nuevo el estado cuando falta y muestra un error si no puede continuar, en vez de terminar sin respuesta. No se relajan las versiones, los recibos ni las guardas de inventario.

Las pruebas nuevas cargan la sesión y la fila sintética desde cero, pulsan los dos controles reales, exigen un UUID nuevo sólo después de comprobar la cancelación y llegan a la granja con la confirmación del servidor. También cubren estado retrasado por la pausa, personajes vivos con un recibo antiguo y vida cero fuera de un viaje válido. Se añade comprobación con Phaser y DOM de navegador. Estas pruebas no sustituyen la confirmación de Tecnopartes; el regreso real se registra por separado.

Si se recarga después de comprobar la cancelación y ya no queda un recibo, Forest también pausa la derrota pendiente y presenta Confirmar. No depende de que la lectura asíncrona de estado termine antes de crear la escena. Se cubre esa recarga intermedia con los mismos controles, sin provocar una muerte privada ni liberar un personaje con vida cero.

## Informe local del rechazo después de recargar

Un video posterior muestra la comprobación seguida por el rechazo de versión local. El propietario confirma que hubo recarga previa. El servidor sigue conservando la misma partida y sólo el recibo cancelado original. Una diferencia de formato de fecha reproduce ese mensaje, pero todavía no está demostrada en el cliente real; no se cambia la comparación ni se relajan las guardas a partir de esa hipótesis.

El modal incorpora Descargar informe para Suren. Genera un JSON local con la versión cargada, operación, bases exactas y resultado de las comprobaciones del último ACK. Sólo exporta campos permitidos, sin datos de inventario, snapshots, huellas completas de la partida, credenciales ni identificador de cuenta. No envía el archivo ni inicia solicitudes; el jugador decide compartirlo. Se respeta el aislamiento por cuenta y se retiran los metadatos al reiniciar la sesión del módulo.

El informe no invoca snapshot ni snapKey: esas funciones pueden normalizar cosméticos antiguos. Reutiliza los booleanos capturados a partir de la única clave que el ACK ya calculaba. Descargar conserva la partida, la base, el journal, la pausa y las guardas. No constituye una corrección del rechazo ni una confirmación del regreso real.
