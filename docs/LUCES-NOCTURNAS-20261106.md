# Ventanas, fuego y halos — 06/11/2026

Dirección pide que las fuentes de luz de los edificios iluminen su entorno, se animen y se noten especialmente en la fase oscura del ciclo.

## Comportamiento

- Ventanas y faroles se encienden gradualmente al llegar la noche y apagan su resplandor durante el día. El fuego conserva un núcleo discreto de día y proyecta un halo cálido más amplio de noche.
- Fragua ligada a `forgeLitUntil`, como antes. Las llamas ya dibujadas del horno y la cocina renovada palpitan suavemente. No se añade una hoguera nueva ni se modifica el arte aprobado.
- Se revisaron las fuentes de ambos estilos: graneros renovados 1–3, herrería, horno, cocina, establo, curtiduría, farol y farolito. El granero inicial y el Mercado carecen de ventana/farol real; no reciben una luz flotante inventada.
- Las coordenadas se miden en la imagen original y se transforman por recorte, escala, origen, espejo y giro. Acompañan la edición, los cambios de nivel/estilo y la cámara. Obras, fuentes ocultas y elementos retirados no dejan luces detrás.
- Los halos son gradientes aditivos suaves, sin física ni luces puntuales del shader. Dos texturas pequeñas compartidas; no se crean partículas/tweens por fotograma. `prefers-reduced-motion` deja la luz estable.
- La misma capa de atmósfera recupera un tono cálido alrededor de cada emisor: evita que un núcleo aditivo saturado quede azulado por el filtro nocturno. Proyección con la matriz de cámara, escala del canvas y desplazamiento CSS; actualización limitada a 20 veces por segundo y limpieza al salir. No se añade una segunda capa de noche ni se tiñe el HUD.
- `GoldenLighting.atmosphere()` comparte el reloj visual de 30 minutos con los emisores. Se evita sumar el viejo velo por hora real. Día fijo y Original no conservan una segunda noche oculta. La hora de pesca y los reinicios UTC no cambian.
- Visitas usan la proyección pública existente, el arte que realmente se descargó y las mismas ventanas/faroles. No inventan trabajo de la fragua ni consultan actividad privada. Repintado a 10 fps, 1 fps con movimiento reducido, detenido en segundo plano y al cerrar. Los objetos posteriores por Y ocultan las luces anteriores.

No hay cambios de cuentas, inventarios, saldos, producción, energía, tiempos, terreno, guardado, Supabase o sistemas desactivados.

## Validación

- `test-world-lights.js`: anclajes/crops, día/noche/fuego, movimiento reducido, mil actualizaciones sin acumular objetos, tema, edición, cámara, obras/ocultación, farolitos y reinicio/limpieza. El acceso a G y la creación de temporizadores están prohibidos en el arnés.
- `test-world-light-cycle.js`: ejecuta el bloque real de ambiente con hora histórica opuesta; verifica ciclo, Día fijo, Original, continuidad, ausencia de doble velo y respaldo si falta el módulo.
- `test-light-atmosphere.js`: proyección de los halos cálidos con desplazamiento, zoom, giro, tamaño CSS, frecuencia acotada y limpieza al retirar fuentes, desactivar o cerrar.
- `test-visita-lights.js`: oclusión por Y, ausencia de fuego privado, frecuencia acotada, día, movimiento reducido, ocultación y cierre.
- Regresiones: `test-day-cycle.js`, `test-lighting.js`, `test-visual-effects.js`, `test-efectos-anclados.js`, `test-carga-una-pasada.js` y `test-visita-visual.js`.
- Los antiguos `test-dia-utc.js` y `test-noche.js` fallan antes de ejecutar sus casos por un `location` ausente en su entorno simulado de save.js. No se modifica ese código de guardado para este lote; el nuevo arnés ejecuta directamente el ambiente y su fallback.

Prueba gráfica mediante una granja sintética local con inicialización de Auth anulada y guardado remoto deshabilitado. Los controles de QA no forman parte del código publicado.

En Chrome se verificaron día/noche, ambos estilos, reinicio de escena, arrastre real del granero y zoom de cámara; once fuentes renovadas o siete clásicas, sin errores de aplicación en esa ejecución. Capturas y resultados completos en la carpeta de trabajo `night-lights-20261106`. No constituye una medición de FPS en equipos de jugadores.
