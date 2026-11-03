# Composición visual de referencia — 03/11/2026

Dirección autoriza acercar el juego real a la maqueta aprobada: «Y bueno, hazlo. Hazlo entonces». Esta revisión continúa el aspecto Renovado reversible, sobre el juego existente.

## Resultado

- HUD de una línea con grupos, iconos, barras de experiencia y logo apilado. Conserva los valores, temporizadores, botones e identificadores existentes. El logo también aparece en la precarga.
- Marcos de madera, pergamino y verde generados para esta dirección artística; Tienda con toldo, cuatro accesos ilustrados y cartel de Misiones separado.
- Objetivo con ilustración contextual, conservando el texto y la acción del tutorial. Objetivo y barra de accesos se centran en el espacio libre real entre Tienda y Mercado.
- Mercado lateral ilustrado: cabecera, toldo, pestañas y tarjetas. Los botones −/+ utilizan el input y sus límites actuales; el precio se lee del cálculo original. Se preservan las cuatro pestañas, los artículos y las compras.
- Pradera más verde y bosque con variación de escala y posición. Los fondos cercano y distante comparten el muestreo periódico para conservar continuidad.
- Encuadre automático según los edificios, parcelas, nodos y paneles visibles. En pantallas bajas comienza más cerca; controles visibles permiten acercar, alejar y ver toda la granja. El paneo y zoom manual se respetan. Abrir un panel no desplaza la cámara que el jugador ya ha ajustado.
- Rueda del ratón sobre los paneles HTML no desplaza el mundo situado debajo.

## Preservación y reversión

Configuración → Aspecto → Clásico restaura las texturas, estructura de controles y composición anteriores sin recargar. Renovado conserva los mismos objetos y reglas. Las imágenes clásicas y los diez edificios renovados aprobados no se reemplazan.

No hay cambios de tamaño de terreno, capacidad, progresión, guardado, precios, compras, energía, tiempos o economía. El terreno inicial sigue siendo 9×9 y comienza con las tres parcelas reales. La escena usa su disposición actual; la maqueta ilustraba una granja más desarrollada. `GF.NO_WALK` mantiene oculto al personaje de la granja por la regla existente: no se añade un personaje decorativo ni edificios ficticios para la comparación.

La versión móvil mantiene su comportamiento anterior. Pesca, Plaza, Altar, retiros y Plata → Golden no se habilitan. El estudio de sostenibilidad queda apartado.

## Arte y reconstrucción

Se utilizaron seis generaciones del generador integrado: marco de madera, marco de pergamino, marco verde, toldo, logo y pradera, con la maqueta como referencia. No se utilizó una API de pago mediante CLI.

Originales y prompts exactos se conservan fuera del repositorio en:

`C:/Users/pauli/Documents/Codex/2026-09-17/en-mi-escritorio-de-la-pc/work/visual-reference/`

- `sources/`: seis PNG originales.
- `sources.json`: procedencia de las generaciones.
- `prompts.json`: los seis prompts exactos.

Los archivos de ejecución están en `public/assets/visual-v2/skin/`. Siete iconos de objetivos se extraen de las imágenes aprobadas del atlas, sin generación adicional. Las tres variantes de pradera se empaquetan en el atlas opcional v4; los otros 86 fotogramas permanecen intactos.

Después de reconstruir el atlas base renovado, ejecutar:

```powershell
python tools/build-reference-skin.py --sources C:/Users/pauli/Documents/Codex/2026-09-17/en-mi-escritorio-de-la-pc/work/visual-reference/sources
```

El script prepara las imágenes finales, aplica la pradera al atlas opcional y conserva los originales clásicos. El atlas opcional contiene 89 fotogramas y sus solicitudes usan `v=4`.

## Verificación

Pruebas de cámara, controles, mundo, HUD, Mercado y objetivos comprueban restauración Clásico/Renovado, límites de pantalla, estabilidad de observadores, controles y eventos originales, ausencia de escrituras en G/GF y comportamiento móvil. Se ejecutaron además las regresiones de carga, atlas, efectos, caché visual y celdas frente a sprites.

Prueba nativa en Chrome con tamaños de viewport verificados: 1672×948, 1346×618 y 900×700. Sin desbordamiento horizontal de página. El modo de prueba aislado ejecutó baúl → comprar tres semillas con −/+ → plantar las tres: total correcto, XP 15/25 y energía 47/50 con temporizador. No utilizó cuentas ni escribió en Supabase. Se alternó Clásico/Renovado desde Configuración y se conservaron los valores visibles.

Capturas reales conservadas en el mismo archivo de trabajo:

- `reference-1672-final.png`: comparación final con Mercado abierto, a la misma resolución que la maqueta.
- `reference-1346-close.png`: vista cercana y controles de cámara.
- `reference-900-market.png`: Mercado y HUD en escritorio estrecho.

La captura final es el juego real local, con sus reglas iniciales, no una nueva ilustración.

## Discord

Los reportes de destino desconocido y «la aplicación no ha respondido» se atendieron en paralelo. Se corrigen el enlace de invitación, la respuesta temprana del comando y el arranque del bot. Evidencia y limitaciones operativas en `DISCORD-VINCULACION-20261101.md`. No se enviaron mensajes ni se vincularon cuentas de jugadores durante las pruebas.
