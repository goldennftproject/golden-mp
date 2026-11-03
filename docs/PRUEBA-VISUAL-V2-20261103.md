# Prueba visual renovada — 03/11/2026

Autorizada por dirección tras ver la maqueta: probar el cambio conservando vuelta atrás. Estado previo: commit a297b170d670f5dd85a4a80ab9ca57a97bc01b9b. No se revierten ni sobrescriben cambios ajenos de CLAUDE.md/AGENTS.md.

## Qué incluye

- Interfaz PC (a partir de 900 px): HUD en una repisa compacta, menús en pergamino, controles verdes y madera, encabezados y contraste, inventario rápido y chat.
- Mercado lateral con los mismos cuatro destinos, cantidades, precios y acciones. Comprar se etiqueta Semillas. Cupo e instrucciones abreviados conservan el texto completo en title. Imágenes de cultivos en vez del pequeño saco de semilla en la lista. No se ocultan cultivos, límites, compras o controles por esta presentación.
- Iconos SVG propios para los cuatro accesos de Tienda.
- Cuatro siluetas nuevas para niveles 0–3 del granero; mercado y cocina. Los demás sprites y el terreno conservan su arte actual. No se añaden caminos que aparenten ocupar terreno ni decoraciones falsas.

## Reversibilidad

Configuración → Aspecto → Aspecto: Renovado / Clásico. Preferencia local gf_visual_v2, fuera de G. Cambio inmediato sin reload, reinicio de escena, Supabase ni petición de guardado. Las fuentes originales se copian antes de pintar cada variante en su CanvasTexture y se restauran exactamente. Claves y dimensiones de textura se conservan; el granero elige un frame visual independiente por estilo. Colisiones y distribución no se recalculan. Se descartan normales anteriores para que no sobreviva un relieve de otro dibujo.

Atlas opcional de 133.225 bytes, separado del atlas clásico v56, en assets/visual-v2/atlas.png y atlas.json. Viaja en la primera pasada del Boot. Fallo del atlas nuevo vuelve a Clásico sin bloquear el juego; un respaldo individual Image no se modifica. Visitantes comparten preferencia booleana, descargan el mismo atlas público y conservan el iframe aislado.

En móvil y ventanas de menos de 900 px se usa Clásico y no se muestra el botón. No se cambian economía, energía, tiempos, VIP, datos de usuario, ocupación ni condiciones de compra. El ciclo de día/noche sigue independiente.

## Arte y procedencia

Generación integrada image_gen, seis llamadas independientes; no se usa la maqueta como fondo funcional. Fuentes de alta resolución originales preservadas en el workspace: work/visual-v2/sources/*.png y su índice sources.json. Referencia artística: exec-59ab2fc2-e1a2-411a-90f6-fb0597f8bf77.png; niveles 2 y 3 usan también el nivel 1 generado como referencia. El empaquetado limita las variantes al tamaño de sus texturas de juego y no toca public/assets/farm.

Prompts: sprite aislado transparente de pixel art cálido, misma vista ortográfica levemente desde arriba, luz superior izquierda, contorno marrón, intención de rejilla lógica 128x128, sin suelo, UI o texto. Variantes: 0 cobertizo sólido con techo de paja y puerta arriostrada; 1 granero con gablete y altillo con heno y faroles; 2 altillo completo con tejado de tablas y almacenes laterales; 3 tejado abuhardillado, cúpula ventiladora y alas integradas; mercado con toldo rojo/crema, balanza y frutas; cocina con chimenea, horno, ventana y utensilios. Los PNG fuente están referenciados individualmente por sources.json.

## Validación

- test-visual-v2.js: RGBA original restaurado exactamente, iconos/etiquetas reversibles, normales invalidadas, G intacto y paso de PC a móvil.
- test-lighting.js, test-day-cycle.js, test-carga-una-pasada.js, test-visita-visual.js y test-celdas-vs-sprites.js: sin regresiones detectadas.
- Chrome local con Auth desactivado y sin escritura remota: revisión a 1033 y 1440 px; mercado lateral, HUD y granero; compra de 1 semilla de papa por 1 Plata (3→2); cambio a Clásico y regreso a Renovado conservando semilla y saldo. Sin errores de aplicación en ese recorrido.
- El navegador en segundo plano no proporciona un benchmark de FPS válido. No se afirma revisión exhaustiva de todas las ventanas ni equivalencia pixel a pixel con la maqueta.

Un test antiguo adicional, test-compras-visuales-pc.js, falla en su primera aserción: espera deshabilitar VIP sin Golden, mientras el flujo vigente ofrece Recargar Golden. Se reprodujo el mismo fallo con el HTML de HEAD anterior y sin modificar ui.js/state.js. No se cambia esa función ni se declara ese test como aprobado.
