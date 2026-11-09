# Expansiones con guardado confirmado — 09/11/2026

El propietario autoriza publicar la corrección para todos los jugadores, preservando las partidas. Esta entrega sólo cambia la secuencia del cliente para comenzar una expansión; no modifica las reglas de la base, precios, materiales, tiempos ni recompensas.

## Fallo reproducido

Se reprodujo con el cliente y el handler de guardado reales, sobre una cuenta sintética con los contadores sanitizados del incidente: tres expansiones, tres bronces y ningún pico de bronce. Fabricar un pico, gastarlo al minar un bronce y pagar inmediatamente la expansión 4 produce el rechazo «Faltan materiales de la expansión: bronce». La obra sólo existe en el navegador; la fila aceptada conserva tres expansiones y tres bronces.

La validación estima acciones mediante testigos netos. El pico fabricado y consumido termina en cero, y el bronce ganado y gastado tampoco deja un aumento neto. Guardar después de fabricar o de minar, antes de pagar, conserva la evidencia intermedia y permite aceptar la compra sin relajar las reglas.

La reproducción demuestra un fallo que coincide con el rechazo observado. No certifica los clics históricos exactos del jugador ni atribuye a esta causa todos los incidentes de guardado anteriores.

## Comportamiento de la corrección

El botón confirma primero el progreso actual. Exige una nueva confirmación, la misma cuenta, base y huella actual y ausencia de peticiones inciertas o conflictos. Después revalida precio, requisitos, recursos y estado de la escena, aplica el coste una vez e inicia la obra local. Sólo anuncia el éxito y cierra el panel cuando el guardado de esa obra queda confirmado.

Los dos botones esperan el resultado asíncrono. Se bloquea el doble clic y se difieren los tres latidos de interfaz durante la operación. Sólo se pausa y reanuda la escena que esta operación adquirió; un cambio de cuenta, reinicio o pausa previa no autoriza reanudar otra escena. Los relojes absolutos siguen transcurriendo.

Una respuesta incierta conserva la petición existente y muestra el inicio sin confirmar. No devuelve recursos automáticamente ni vuelve a cobrarlos. El disquete comprueba el mismo intento; la entrega del terreno permanece bloqueada mientras falte la confirmación. También se protegen las obras de pestañas anteriores aunque no exista el marcador nuevo en memoria. Una obra vencida cargada de la fila aceptada puede entregarse normalmente.

La identidad de la obra compara i, n, desde y hasta con un orden fijo; el orden de propiedades que devuelve JSONB no se confunde con otra obra.

## Validación

- Reproducción de referencia con rechazo 409 exacto y dos controles aceptados con guardado intermedio.
- Tres rutas del candidato con el handler real aceptan inventario y obra sin alterar reglas.
- Auditoría independiente de 25 escenarios: doble clic, cuenta y escena, ACK antiguo o perdido, rechazo, pausa, tres latidos reales, ambos botones, obra antigua sin marcador y carga de obra canónica vencida. Incluye reordenado de propiedades y rechazo de cambios en los cuatro campos de identidad.
- Regresión de las 16 recetas y materiales y sintaxis de los tres archivos.

Las evidencias están en el caso de trabajo nico-expansion-save-20261109. El manifiesto registra preimágenes y candidatos para comprobar cambios concurrentes. La comprobación de publicación debe verificar el commit de Render y las tres respuestas JavaScript después de la transformación real de pelarComentarios; el sello GF_BUILD lo calcula el servidor y no se edita index.html.

Esta entrega no restaura ni compensa cuentas. La recuperación del intento local que ya estaba bloqueado se revisa por separado, conservando evidencia y avance posterior. No incluye cambios visuales, Supabase, sistemas pausados ni el estudio de sostenibilidad de USDT.
