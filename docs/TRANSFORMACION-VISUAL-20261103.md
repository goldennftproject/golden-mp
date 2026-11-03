# Transformación visual de la granja · 03/11/2026

Dirección: «Y bueno, siguen na transformación de to». Se continúa la dirección visual aprobada sobre el juego real y su opción Renovado/Clásico. No se cambian cuentas, reglas, saldos, compras, producción, tiempos, progreso, terreno ni huellas.

## Arte y conservación

- Familias de árboles con estados de corte, tocón y regeneración; la copa y el tronco conservan sus registros de animación. El follaje final usa verdes naturales, corregidos tras revisar la repetición dentro del bosque.
- Seis minerales con estados entero, fracturado y agotado. La piedra cálida y el hierro frío siguen siendo distinguibles.
- Parcelas, terreno por despejar, brote, marchitado y los trece cultivos activos en sus dos etapas existentes. Se conservan nombres, botánica y crecimiento.
- Césped, cercas, buzón, tablón, baúl, cofre, paquete diario y excavación. Los estados de disponibilidad mantienen su lectura.
- Ilustraciones para VIP, Objetos, Mejoras, Packs y Misiones, también presentes en catálogo y presentación VIP. El botón y sus eventos se conservan; Clásico restaura sus nodos originales. El estado VIP activo mantiene el verde.
- Los diez edificios aprobados previamente permanecen exactamente iguales píxel a píxel. Los PNG y el atlas clásicos se mantienen intactos.
- Se renuevan las cinco obras activas, con estructuras incompletas inequívocas: Herrería, Horno, Cocina, Establo y Curtiduría. No se generan obras inertes ni de sistemas pausados.
- Las siete fichas de Objetos de Granja tienen su propia ilustración. El mapeo conserva los IDs históricos y los ejemplares adicionales; las imágenes no alteran los botones, precios ni cobros. Clásico restaura el marcado anterior exacto y los errores de imagen conservan un respaldo.

Resultado del atlas v3: 89 lienzos (79 variantes añadidas y los 10 edificios conservados), 1994 × 608 px, 1.283.308 bytes. Interfaz: cinco accesos y siete ilustraciones de producto, separadas del atlas. Esto renueva el conjunto principal; no implica reemplazar cada icono o animación compatible del proyecto.

El atlas opcional conserva las dimensiones de cada lienzo original. El empaquetador admite estados con registro común, contiene y estira únicamente cuando corresponde a un tile. Se limita a 2048 px de ancho, comprueba límites y no permite sustituir edificios aprobados desde el manifiesto de extensión.

## Integración

- Renovado invalida normales y rehace césped, copas y bosque cercano/lejano. Al cambiar desde Bosque, la invalidación del mosaico queda pendiente hasta el siguiente Farm.create, evitando destruir una textura en uso.
- Las visitas leen el mismo manifiesto genérico, incluyendo parcelas y césped, y conservan un respaldo clásico si falta una textura.
- Una ventana iniciada por debajo de 900 px puede descargar el atlas al ensancharse, sin recargar ni escribir progreso. Por debajo de ese umbral se conserva el aspecto Clásico.
- Se preservan héroe, animales animados, portales, herramientas y monedas que encajan con el conjunto. No se sustituyen animaciones aprobadas para aumentar el número de archivos nuevos. Pesca, altares y plaza siguen pausados.
- Los adornos de visitas usan sus sprites reales, con símbolo sólo si falla la carga. Los cultivos growing/ready/withered usan planta intermedia/madura/marchita y las escalas de Farm; no se inventan relojes no incluidos en la proyección pública ni se cambia el progreso del propietario.
- ForestScene usa textura de luminancia con la paleta propia de cada uno de los cuatro biomas; mantiene geometría, densidad y decoraciones. Clásico restaura el damero anterior. Las texturas derivadas se liberan al alternar y al salir de la escena.

## Fuentes y reproducción

Se utilizó image_gen integrado, con la cocina renovada como referencia de estilo y los PNG clásicos como referencia funcional. Las fuentes de alta resolución, recortes de estados y prompts se archivan en el workspace de Golden, fuera del repositorio, en work/visual-v2/v3. Allí permanecen generated-sources.json, prompts.json, crop-prompts.json, crop-manifest.json, manifest.json y prepare-assets.py. La primera versión amarilla del árbol se conserva separada de la final verde.

Empaquetar desde el checkout real:

```text
python tools/build-visual-v2.py --sources <workspace>/work/visual-v2/v3/sources --manifest <workspace>/work/visual-v2/v3/manifest.json
```

## Verificación

- test-visual-atlas.py: dimensiones originales, límites, solapamientos, transparencia, encuadre de estados, idempotencia, entradas inválidas y RGBA exacto de los diez edificios previos.
- test-visual-v2.js: reversión RGBA, UI, visitas, carga al ensanchar, estado G intacto e invalidación al volver del Bosque en ambos aspectos.
- test-visual-theme-cache.js: orden de invalidación, liberación de copas, ausencia de escrituras al terreno/progreso y fallo gráfico aislado.
- test-reliquias-visuales.js, test-forest-visual-theme.js, test-visita-adornos.js y test-visita-cultivos.js: controles/IDs, paletas, geometría, liberación de recursos y representación pública sin escrituras de progreso.
- test-visual-effects.js, test-visual-windows.js (18 casos), test-lighting.js, test-day-cycle.js, test-visita-visual.js, test-celdas-vs-sprites.js y test-carga-una-pasada.js.
- Chrome con cliente local aislado de Auth/guardado: granja y panel Phaser de todos los estados empaquetados, cinco ilustraciones cargadas, regreso a Clásico, alternancia desde Bosque y nueva creación de la granja sin errores gráficos. No se usaron cuentas ni pagos reales.
- Chrome: las siete ilustraciones de producto cargan a 256 px y sus fichas se desplazan correctamente. El panel de los cuatro biomas usa métodos reales de ForestScene, atlas real y paletas extraídas de ZONA_DEF con huella SHA; se revisaron Renovado/Clásico y no hubo errores de consola propios de la aplicación.

La captura granja-renovada-real.png del workspace corresponde a ese cliente local renderizado, no a una maqueta generada. Los controles de diagnóstico se ocultan sólo en la captura local; no forman parte de los archivos públicos.
