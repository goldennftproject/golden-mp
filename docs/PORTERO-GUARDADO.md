# El portero del guardado — cómo encenderlo (paso a paso, sin herramientas)

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

## Lo que queda para después (los otros dos escalones)

- **Escalón 2:** con la bitácora calibrada, `MODO = "rechazo"` en `index.ts` y
  re-deploy — los guardados imposibles dejan de entrar. Ese día el botón 🧪 muere o se
  protege por cuenta.
- **Escalón 3 (antes del token):** todo lo que toque valor real ($Golden, retiros,
  mercado) se calcula y valida SIEMPRE del lado del servidor. La granja puede seguir
  laxa; el puente granja→token, jamás.
