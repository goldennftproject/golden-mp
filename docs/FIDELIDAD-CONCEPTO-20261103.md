# Ajuste a los recortes del concepto — 03/11/2026

Dirección señala diferencias entre el árbol del juego y el concepto, y aporta comparativas de Mercado, HUD, Tienda y parcelas. Se revisan esos elementos sobre el mismo aspecto Renovado reversible.

## Cambios

- Árbol: copa de hojas más claras, masas redondeadas y tronco más cercano al recorte del concepto. Los ocho estados de tala y crecimiento comparten esa familia. Los tres maduros mantienen el registro de la hoja; todos conservan el pie anterior. No aumenta la escala del objeto ni su ocupación. El mismo arte se usa en bosque y visitas.
- Parcelas: la tierra con surcos se sustituye por un cuadrado de terrones y pequeñas piedras con borde irregular. Se cambia únicamente `plot`; los cultivos tienen transparencia y no llevan suelo incorporado. Las parcelas no poseídas siguen ocultas.
- HUD: franja de 74/66/56 px en las anchuras 1672/1346/900. Se conserva el logo; Golden pasa a una moneda ilustrada con estrella. Vida usa corazón y cifra; energía usa cifra y el temporizador existente; granja conserva su barra de XP y combate sus cifras. Los nodos, controles, valores y tooltips originales permanecen.
- Tienda: corona, bolsa con pala, granero con flecha, caja de productos y pergamino de Misiones, siguiendo los identificadores del concepto. Se conserva la función de cada botón.
- Mercado: toldo separado, señal de título pequeña, Semillas y Vender como pestañas principales, Adornos y Mejoras en un pie siempre accesible. Tarjetas compactas con ilustraciones nuevas para los trece cultivos. Cantidades y precios siguen el input y cálculo originales. Los detalles secundarios permanecen en DOM, tooltip y lectura accesible. Packs, Kit y Bolsas se muestran como filas pequeñas que conservan su contenido al abrirse.
- Madera y pergamino: texturas más sencillas y cálidas, sin los marcos oscuros anidados de la revisión anterior. Se guardan como archivos hermanos `*-concept.png`; se conservan las imágenes anteriores.

## Límites y preservación

El terreno inicial sigue siendo 9×9 con sus tres parcelas reales. El número de productos visibles y sus desbloqueos deriva de las reglas actuales, no del número ilustrado en la maqueta. No se modifican costes, semillas, tiempos, energía, acciones, guardado, progreso, cuentas ni permisos. No se habilitan sistemas pausados ni se modifica el estudio económico.

Clásico restaura exactamente los nodos e imágenes originales. Móvil mantiene su presentación anterior. Las nuevas imágenes de producto tienen fallback a los recursos existentes si falla su carga.

El atlas opcional v5 conserva 89 marcos y todas sus coordenadas y dimensiones. Frente al atlas anterior al lote sólo cambian ocho estados de árbol y `plot`: los otros 80 marcos son RGBA idénticos. Los diez edificios aprobados permanecen intactos. Atlas y cargadores usan v5; las nuevas ilustraciones usan su versión de concepto v5, y las reliquias e imágenes anteriores mantienen v4.

## Fuentes reproducibles

Se utilizó el generador integrado de imágenes con los recortes aportados como referencia. No se utilizó la API mediante CLI. Fuentes, prompts exactos, variantes descartadas, manifiestos, scripts de empaquetado y pruebas se conservan en:

`C:/Users/pauli/Documents/Codex/2026-09-17/en-mi-escritorio-de-la-pc/work/tree-concept/`

- `tree-prompts.json`, `ui-prompts.json`, `mission-prompt.json`, `plot-prompt.json`.
- `sources/`: originales seleccionados y ensayos.
- `integrate-tree-concept.py`, `integrate-plot-concept.py`, `prepare-ui.py`.
- `baseline-before-tree/`, `baseline-before-plot/`, `batch-preservation.json`, `proof.json` y `plot-proof.json`.
- `plot-overlay-comparison.png`: seco, brote, intermedio y maduro sobre el suelo anterior y nuevo.

Los archivos de ejecución se encuentran en `public/assets/visual-v2/`: atlas, `skin/*-concept.png`, `ui/*-concept.png` y `ui/crops/`.

## Validación

Pasan las pruebas de atlas, suelo, estados de nodos, cultivos en visitas, caché visual, bosque, iluminación, ocupación, HUD, Mercado e ilustraciones reversibles. La revisión independiente ejercitó los trece cultivos, errores de carga por separado, nuevos nodos del renderer y restauración de fuentes originales, sin cambio de G. Los veinte PNG nuevos son no vacíos y usan alpha.

Prueba nativa con la extensión de Chrome en una partida local aislada, sin Auth ni escrituras en Supabase: alternar Clásico/Renovado restaura el logo y los accesos; aumentar la cantidad de Papa de 1 a 3 actualiza el precio a 3 Plata y permite volver a 1; Adornos y Mejoras mantienen su contenido y acceso. Se comprueban las anchuras 1672, 1346 y 900 sin desbordamiento horizontal, con botones dentro del viewport. El Mercado inicial mide 499 px a 1672×948, 428 px a 1346×618 y 465 px a 900×700.

Las capturas `concept-final-1672.png`, `concept-final-1346.png`, `concept-final-900.png` y `plots-in-game.png` documentan el render local real. No son nuevas maquetas.
