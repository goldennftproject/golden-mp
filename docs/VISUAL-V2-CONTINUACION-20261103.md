# Aspecto renovado: segundo lote — 03/11/2026

Usuario: «sigue con todo». Estado anterior bb3726750e5365bf7540a42b878456d720794933. Se amplía la prueba existente, sin reinicios de cuentas, migraciones, cambios de reglas o publicaciones en Discord.

## Arte

Se añaden store (Herrería, 110x118), horno (Horno de Piedra, 98x90), establo (111x94) y curtiduria (110x114). La Herrería no es un almacén. Las seis variantes anteriores se conservan píxel a píxel; los diez lienzos tienen dimensiones idénticas a los clásicos. Se mantienen identificadores, layout, huellas, sombras de ocupación y estados build_*. No se añaden variantes de altar/ofrendas, pesca o plaza.

Atlas opcional v2: 219.524 bytes. Los PNG clásicos no se modifican. Boot y visitas piden v2 para evitar cachés incompatibles. Herrería y horno contienen metadatos de puntos normalizados sobre el lienzo final para humo y resplandor; FarmScene los consulta al emitir y actualiza la fragua al cambiar de tema. Clásico y obras usan los anclajes históricos. Se validaron los puntos sobre las chimeneas y boca de fragua en una lámina local con Phaser y las texturas empaquetadas reales; no es una simulación generada del resultado.

Fuentes de alta resolución y prompts integrados image_gen preservados fuera del repo en work/visual-v2/sources/{store,horno,establo,curtiduria}.png, sources.json y continuation/prompts.json del workspace de Golden. Referencia de estilo: la cocina de la primera tanda; referencias funcionales: cada PNG clásico. Prompts: edificios aislados transparentes, estética pixel art cálida, ángulo frontal levemente desde arriba, sin suelo ni UI, chimenea izquierda en Herrería y central en Horno. Establo sin animal horneado, Curtiduría con piel curtida seca. El empaquetador reproducible es tools/build-visual-v2.py --sources <carpeta de fuentes>.

## Ventanas

Se corrige el texto blanco heredado por !important sobre pergamino: ghost, Configuración, nivel medio, notas del ranking/premio y moneda de venta. Los botones deshabilitados tienen fondo y tinta propios incluso si también son red/gold. Acciones destructivas rojas y Golden doradas; fila TU distinguida. El mercado lateral pasa de relative a fixed y sustituye la animación de entrada centrada. Las tarjetas movidas conservan sus coordenadas y se acotan al viewport al cambiar de aspecto, redimensionar o reabrir.

La preferencia Renovado/Clásico y la restauración instantánea permanecen. No hay recarga para alternar ni modificaciones a G, Auth o Supabase. La versión móvil conserva Clásico. Limitación previa: si se arranca bajo 900px no se precarga el atlas nuevo; ampliar esa ventana no lo descarga hasta una nueva carga. No se introducen nuevas páginas de prueba públicas.

## Verificación

- test-visual-v2.js: restauración RGBA, G intacto, preferencia y móvil.
- test-visual-windows.js: 17 casos de contraste/estados, TU, clamp y reapertura de ventanas. El test normaliza únicamente media queries y el bug de listas de selectores de JSDOM; no reemplaza la comprobación de Chrome.
- test-visual-effects.js: anclajes con origen, escala, flips, rotación y fallback.
- test-celdas-vs-sprites.js, test-carga-una-pasada.js, test-visita-visual.js, test-lighting.js y test-day-cycle.js: correctos.
- Chrome local, cliente Auth desactivado: Configuración, mercado y lámina de edificios. El mercado pasó de (606,80) a (266,100) al arrastrarlo 340px a la izquierda; al alternar Clásico el clamp movió top a 70 por su mayor altura, y Renovado conservó esa posición visible. Sin escrituras de partidas remotas.
- Comprobación de atlas: primeras seis regiones idénticas al commit previo; las diez regiones contienen alfa y respetan tamaños clásicos.
- No se interpreta el FPS de Chrome en segundo plano como benchmark. No se afirma auditoría exhaustiva de todas las ventanas ni sustitución de todos los sprites del juego.
