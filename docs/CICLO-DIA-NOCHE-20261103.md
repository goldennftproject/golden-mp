# Ciclo visual — 03/11/2026

Autorización: «Ahora sí el ciclo».

## Comportamiento

Ciclo de 30 minutos, derivado de Date.now() módulo 1.800.000 ms. No se reinicia al recargar ni acumula retraso en pestañas suspendidas. Es puramente visual y no una hora autoritativa del servidor: dos dispositivos con relojes diferentes pueden mostrar distinta fase.

Puntos de color interpolados con smoothstep: día (0–40%), tarde cálida (52–60%), noche azulada clara (72–86%), amanecer (94%) y regreso continuo a día (100%). Los porcentajes intermedios son transiciones, no cambios bruscos. La noche multiplica los canales por 0,62 / 0,70 / 0,86 para mantener visibilidad.

La capa de ambiente multiply vive únicamente dentro de #game, con isolation:isolate y pointer-events:none. Cubre todo el canvas por igual (granja, bosque cercano, mosaico lejano y combate), sin recalcular normales o fondos. HUD, menús HTML y controles permanecen fuera. Se actualizan variables CSS una vez por segundo con transición de 1,1 s, y al volver visible la pestaña.

Configuración → Aspecto → Ciclo permite alternar Activado y Día fijo. Persiste sólo gf_day_cycle_v1 localmente. La opción Original anula además la atmósfera. En Canvas o fallo de la iluminación se conserva el aspecto original. Ningún dato entra en G y no se provocan guardados ni consultas de red.

Visitas: se transmiten sólo las dos preferencias booleanas visuales; el iframe aislado aplica la misma capa sobre su canvas, manteniendo el botón de semilla encima y el resto de controles sin teñir. Sin nuevos accesos a cuentas o guardados.

No incluye luces en ventanas, sombras proyectadas, bonificaciones horarias o cambios de tiempos de juego.

## Pruebas

- test-day-cycle.js: periodicidad, continuidad a ambos lados de cada punto y del cierre, fases, límites de luz, Día fijo, preferencias, Original, regreso tras inactividad y HUD intacto.
- test-lighting.js: se conserva la exclusión del fondo horneado y el cambio reversible de relieve.
- test-visita-visual.js y test-carga-una-pasada.js: aislamiento y carga existentes.
- Granja local en Chrome con datos aislados y sin cliente Supabase inicializado: fases día/tarde/noche revisadas, sin errores de aplicación; botón Día fijo cambia y devuelve a la fase del ciclo. Controles de fase sólo en el servidor temporal de QA, no se publican.
- No se usa el FPS de Chrome en segundo plano como benchmark.

También se verificó la transición a ForestScene en la prueba local: bosque nocturno visible, sin errores de aplicación y 64 normales / 1,76 MiB de datos de mapa en esa ejecución. No es una prueba de FPS en primer plano.
