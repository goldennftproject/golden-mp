# El portero del guardado — cómo encenderlo (paso a paso, sin herramientas)

*14/9: ENCENDIDO y en modo RECHAZO en el proyecto nuevo (`ulspkdaljeuleqqdokfk`). Lo de abajo queda
como receta por si hay que volver a montarlo. Con el rechazo, el botón 🧪 murió (ver ui.js) y el
cliente, ante un 422, vuelve a la última granja aceptada (`porteroRechazo` en save.js).*

Todo se hace desde el navegador, en el dashboard de Supabase del proyecto
(`https://supabase.com/dashboard` → proyecto **eusxpsmqczmczgyhndtd**). Son tres pasos,
en este orden, y entre el 2 y el 3 hay una prueba. **El orden importa**: si cerrás la
puerta vieja (paso 3) antes de que la nueva funcione, nadie puede guardar.

## Qué es esto

Hoy el juego escribe su guardado directo en la tabla `farms`, y la base acepta lo que
llegue — desde la consola del navegador cualquiera puede regalarse recursos. El portero
es una Edge Function que pasa a ser **la única puerta**: recibe cada guardado, lo compara
con el anterior, anota en una bitácora lo que cambió y lo que parece imposible (los
techos salen del ancla del juego), y recién entonces escribe.

**Modo sombra:** por ahora el portero anota pero NUNCA rechaza. Nadie puede perder su
partida por esto. El rechazo se activa más adelante, cuando la bitácora confirme que
ningún jugador honesto dispara sospechas (se cambia `MODO` en el propio `index.ts` y se
re-deploya).

## Paso 1 — La bitácora (2 minutos, inofensivo)

1. Dashboard → **SQL Editor** → *New query*.
2. Pegar la **PARTE 1** de `sql/portero-guardado.sql` (hasta donde dice PARTE 2) → **Run**.
3. Debe decir `Success`. Ya existe la tabla `farm_saves_log`.

## Paso 2 — La función (5 minutos)

1. Dashboard → **Edge Functions** → **Deploy a new function** → *Via Editor*.
2. Nombre: `guardar` (exacto, en minúsculas — el juego la llama por ese nombre).
3. En el editor vas a ver un `index.ts` de ejemplo: borralo y pegá el contenido COMPLETO de
   `supabase/functions/guardar/index.ts` de este repo (es UN solo archivo autocontenido).
4. **Deploy** (no hace falta agregar ningún otro archivo: es autocontenido). Dejá "Verify JWT" como viene (activado).

### La prueba (no te la saltees)

1. Abrí el juego, jugá algo (cosechá una papa) y esperá el indicador de guardado.
2. Dashboard → **Table Editor** → `farm_saves_log`: tiene que haber una fila nueva con
   tu `user_id`, el `delta` de lo que hiciste y `sospechas: []`.
3. Probá también el botón 🧪 PRUEBAS (con `?test` en la URL): el siguiente guardado
   debe aparecer con sospechas de madera y piedra — esa es la demo de que el portero ve.

Si no aparecen filas, el juego está cayendo al camino viejo (mirá la consola del
navegador: dirá "portero no disponible aún"). No pasa nada — el guardado sigue
funcionando — pero **no sigas al paso 3** hasta resolverlo.

## Paso 3 — Cerrar la puerta vieja (1 minuto, SOLO tras la prueba)

1. SQL Editor → pegar la **PARTE 2** de `sql/portero-guardado.sql` → **Run**.
2. Desde ese momento el cliente ya no puede escribir `farms` directo: leer su granja sí,
   escribirla solo a través del portero. El tramposo de consola que intente el upsert
   directo recibe un error de permisos.

**Marcha atrás:** si algo sale mal, al final de `sql/portero-guardado.sql` hay dos
policies comentadas — descomentarlas y correrlas reabre la puerta vieja mientras se
arregla la función.

## Para revisar la bitácora cuando quieras

SQL Editor:

    select user_id, elapsed_s, sospechas, delta, created_at
    from farm_saves_log
    where jsonb_array_length(sospechas) > 0
    order by created_at desc limit 100;

Vacío = nadie hizo nada raro (o solo el equipo con el botón 🧪, que es esperable).

## El mercado (15/9 · reglas v2) — HAY QUE CORRER UN SQL

El P2P se abrió el 14/9 y el portero pasó a `rechazo` el mismo día: nunca habían corrido
juntos. El portero tiene un techo de plata por hora —con dos guardados pegados, ~2.084— y
en el mercado un maíz vale 1.200 y un cuero 1.160. Cobrar dos ventas seguidas disparaba
«plata imposible», el guardado se rechazaba y el juego volvía a la granja anterior **con el
ítem ya entregado al comprador**. Comprar 300 de madera o retirar tu propia publicación
rompían igual, por el techo de recursos. Eso es perder progreso por jugar bien: ley 1.

Desde las reglas v2 el portero **lee la tabla `market` con la llave de servicio** y levanta
el techo justo por lo que el mercado dice que pasó: lo cobrado (`paid = true`), lo comprado
(`sold_to = yo`) y lo retirado (las filas libres mías que desaparecieron). Lo ya contado
queda anotado en `farms.mercado_ack`, así que un permiso no se gasta dos veces. Nada de
esto se le cree al navegador.

**Pasos:** SQL Editor → pegar `sql/mercado-portero.sql` → **Run**. Después, Edge Functions
→ `guardar` → pegar `supabase/functions/guardar/index.ts` → **Deploy**.

Ese SQL además cierra el mercado con llave: hoy el vendedor puede editar su propia fila
(incluido el `price`), y con el portero leyendo precios eso sería imprimir plata. Después
de correrlo el cliente solo puede tocar `sold_to`, `sold_at` y `paid`, y nadie puede
venderse a sí mismo. Si el SQL no se corre, el portero sigue funcionando y siendo **más**
permisivo, nunca menos — pero el mercado se queda sin esa llave.

## Lo que queda para después (los otros dos escalones)

- **Escalón 2:** con la bitácora calibrada, `MODO = "rechazo"` en `index.ts` y
  re-deploy — los guardados imposibles dejan de entrar. Ese día el botón 🧪 muere o se
  protege por cuenta.
- **Escalón 3 (antes del token):** todo lo que toque valor real ($Golden, retiros,
  mercado) se calcula y valida SIEMPRE del lado del servidor. La granja puede seguir
  laxa; el puente granja→token, jamás.
