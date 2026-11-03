# Iluminación suave — 03/11/2026

Cambio visual reversible aprobado por dirección. La lámina previa era generada y no constituía una prueba del motor; esta implementación utiliza normales reales aproximadas y el pipeline WebGL de Phaser 3.80.1.

- Normal técnica derivada de distancia a la silueta y luminancia suavizada. Se crea por textura utilizada y se conserva en memoria; nunca se modifica el PNG ni la textura difusa.
- Pipeline derivado de LightPipeline con sol direccional fijo. Evita variación al desplazar cámara o hacer zoom. Conserva alpha, tintes y rotación; corrige el signo de normales al voltear un sprite.
- Los fotogramas nuevos de animación se preparan fuera del render, inicialmente con normal plana, para no alterar bindings de un batch WebGL.
- Aplicación automática a Image/Sprite de Granja y Bosque. UI, texto, Graphics, TileSprite, RenderTexture, césped, portales y marcadores quedan fuera. El bosque de fondo compuesto en RenderTexture conserva su iluminación pintada.
- Visitas: mismo cálculo por CPU sobre copias de sus imágenes públicas, con CORS anónimo y recuperación al original si no se puede sombrear. Sigue aislado el iframe y sin acceso a la partida del dueño.
- Configuración → Aspecto → Iluminación: Suave / Original. Preferencia local gf_relief_v1. No entra en G ni provoca guardados. Canvas o fallo de inicialización mantiene original.
- Sin ciclo temporal, sombras proyectadas, luces puntuales, cambios de tamaño/colisiones ni modificación de reglas, cuentas o economía.

## Verificación

`node tools/test-lighting.js`: normales opuestas, origen RGBA intacto, exclusiones, cambio de modo, limpieza al salir y Canvas.

También pasan test-carga-una-pasada.js, test-visita-visual.js, test-alfa-bloqueos-visuales.js y test-celdas-vs-sprites.js.

Prueba local en Chrome con Phaser WebGL real: comparación de sprites y mapa de granja completo, sin errores de aplicación registrados. Granja de prueba: 39 normales, 1,30 MiB de píxeles RGBA y 249 ms de generación acumulada una sola vez en esa ejecución. No es un benchmark universal de GPU o memoria total. Chrome en segundo plano baja a 1 FPS; no se usa ese valor como medida de rendimiento del cambio.

El control de Chrome se detuvo por no poder verificar con confianza la dirección de la ventana. Pendiente: revisión visual del bosque después de la transición, visita completa en navegador y medición comparativa de FPS en primer plano. No se afirma haber terminado esas tres verificaciones. Las pruebas locales no escribieron en Supabase y no se crean rutas de test públicas.

Fuentes técnicas: https://github.com/phaserjs/phaser/blob/v3.80.1/src/renderer/webgl/pipelines/LightPipeline.js y https://docs.phaser.io/phaser/concepts/gameobjects/light
