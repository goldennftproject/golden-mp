# Identidad visual de cultivos y semillas — 05/11/2026

El usuario pide que un cultivo se reconozca por la misma ilustración en Mercado e Inventario, y que la etiqueta de su bolsita de semillas repita ese dibujo.

Renovado de PC reutiliza las trece ilustraciones existentes de `assets/visual-v2/ui/crops/` en todos los iconos HTML de cosecha: bolsa, barra rápida, cofres, costes, comercio y listados. Las semillas se diferencian mediante un saco SVG común, que incrusta exactamente el mismo PNG de producto. El catálogo del Mercado conserva su ilustración grande del producto.

El decorador compartido de `visual-v2.js` atiende inserciones y cambios de fuente, sin reconstruir los controles. Conserva los nodos, las cantidades, sus eventos y los mensajes accesibles. Sólo reconoce las trece claves conocidas del mismo origen. Si falla el arte opcional, recupera la imagen clásica y después su política de error original. Los fallos de producto y saco se registran por separado. Clásico y móvil restauran las fuentes y manejadores anteriores.

No se modifican claves de objetos, semillas, compras, precios, cantidades, guardado, partidas, texturas del mundo ni sistemas pausados. No hay nuevas llamadas a Supabase.

## Reproducción y pruebas

- `node tools/build-seed-icons.cjs`: construye los trece SVG a partir del catálogo actual; admite una ruta opcional de manifiesto SHA-256.
- `node tools/test-crop-icons.js`: familias, pantallas, inserciones, reutilización de imágenes, cambio de contexto, Clásico/móvil, error inline y por propiedad, recursos ajenos y conservación de G. Verifica además que los PNG incrustados son idénticos a los del Mercado y que los SVG carecen de contenido activo o imágenes externas.
- Pruebas de integración existentes: `test-visual-v2.js`, `test-reference-market.js`, `test-reference-ui.js`, `test-hotbar-teclado.js` y `test-hotbar-movil.js`.

La galería de recursos renderizados, manifiesto, revisión independiente y recibo de publicación se conservan en el workspace `work/crop-icons-20261105/`. La vista del menú preparada con los renderizadores reales no pudo abrirse mediante la herramienta del navegador por su política de URL local; se inspeccionó la galería con el renderizador SVG de Sharp del entorno incluido. No se presenta esa galería como captura de una partida publicada.
