# El ranking del Torneo de Pesca — guía de despliegue (1/9)

La tabla comparativa 1º-10º del fin de semana. El cliente ya está listo y dormido: sin estos
dos pasos no pasa nada malo — la báscula de participación sigue andando — pero la tabla no
aparece y el podio no paga. Con ellos, todo se enciende solo.

## Paso 1 — La tabla (2 minutos)

1. Dashboard de Supabase → **SQL Editor** → New query.
2. Pegar TODO el contenido de `sql/torneo-ranking.sql` → **Run**.
3. Verificar: en Table Editor aparece `torneo_ranking` (vacía) y la view `torneo_top`.

Es inofensivo correrlo: no toca nada existente y se puede correr dos veces sin drama.

## Paso 2 — La función (5 minutos)

1. Dashboard → **Edge Functions** → Deploy new function → nombre exacto: `torneo`.
2. Borrar el contenido de ejemplo y pegar TODO `supabase/functions/torneo/index.ts`
   (es un solo archivo autocontenido, como el portero del guardado).
3. **Deploy**.
4. En la config de la función, verificar que "Verify JWT" esté ACTIVADO (es el default):
   solo jugadores con sesión pueden reportar.

## Paso 3 — Probar (1 minuto)

1. Entrar al juego un viernes-domingo (UTC), pescar algo.
2. En la consola del navegador debería verse el reporte sin errores; en el Table Editor,
   tu fila en `torneo_ranking`.
3. Abrir la Lonja → escalón del Torneo → aparece el top 10 con tu apodo.

## Qué hace cada pieza (para el que lea esto en tres meses)

- **El servidor calcula los puntos.** El cliente manda especie y kilos; la función valida el
  rango de la especie y aplica la MISMA fórmula que el juego (peso relativo al rango × el
  multiplicador de banda). Un tramposo puede mentir los kilos solo dentro del rango físico
  de la especie: lo peor que fabrica es un pez espada de 90 kg — 6 puntos, alcanzable
  legítimamente. `tools/test-torneo-ranking.js` custodia que la fórmula del servidor y la del
  juego sean idénticas, especie por especie.
- **La semana la pone el reloj del servidor**, y reportar fuera de viernes-domingo se rechaza.
- **El cobro del podio** es al cierre: el lunes (o cuando vuelva a entrar), el jugador con
  marca de la semana pasada consulta la tabla congelada y cobra su bono según puesto —
  la plata sigue la misma escalera que las Escamas (25→3): el 1º cobra los 2 días de granja
  del documento enteros, el 10º su proporción. Idempotente: nunca paga dos veces, y si la
  red falla, reintenta en la próxima carga.
- **La participación no cambió**: llegar a la barra de 1,00 sigue pagando medio día + 12
  Escamas al entregar en la Lonja, con o sin backend.
