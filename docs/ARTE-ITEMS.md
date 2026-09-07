# El arte de los ítems — receta de la casa y cola de trabajo

Preparado el 2/9, cuando dirección avisó que el diseñador vuelve a generar ítems con PixelLab
y pasó un documento con referencias. **Las referencias son de FORMA, no de estilo** (dirección,
textual: « no es para que saques el estilo, pero sí las formas »): son renders realistas sobre
fondo negro, y el juego es pixel art cozy. La forma se copia; el acabado, jamás.

---

## 1. El estilo de la casa, medido sobre los sprites que ya están

No es una opinión: es lo que se lee en `pick_stone`, `res_barra_oro`, `res_madera`, `res_tablon`,
`fishing_rod` y `arm_espada_diamante`, que son los que ya pasaron por la aprobación del diseñador.

| Rasgo | Lo que hace el juego hoy |
|---|---|
| Lienzo | **96×96** para herramientas y armas · **106×106** para recursos e íconos · fondo transparente |
| Contorno | línea oscura **cerrada** alrededor de todo el objeto, más oscura que su color base |
| Sombreado | **cel shading**: 3-4 tonos por material, sin degradés suaves ni ruido |
| Brillo | UN destello especular claro, en la cara superior izquierda |
| Vista | 3/4, el objeto **en diagonal** (los picos a ~45°, las barras en perspectiva de bloque) |
| Paleta | cálida y saturada — maderas marrón miel, metales con su color plenamente identificable |
| Ánimo | cozy, amable, legible a 32 px de alto: es un ícono de inventario antes que una ilustración |

**La regla de legibilidad manda sobre todo lo demás.** Estos sprites se ven a 40 px en la bolsa
y a menos en el mundo. Un detalle que no sobrevive a esa reducción no es detalle: es ruido que
ensucia la silueta.

### El prompt base (pegar SIEMPRE, y encima lo del ítem)

> `cozy farm game item icon, pixel art, clean dark outline, cel shading with 3 tones,
> single specular highlight, 3/4 view, diagonal composition, warm saturated palette,
> transparent background, readable at small size`

Ajustes: `no_background: true`, `outline: "single color black outline"`, `shading: "medium shading"`,
`view: "high top-down"` o `"side"` según el ítem, `detail: "medium detail"`.

**Y el atajo que vale más que el prompt:** para todo ítem que ya tenga hermano en el juego
(los picos son cinco de la misma familia), generar con **img2img** partiendo del sprite aprobado
—`init_image` con `init_image_strength` ~150-200— y pedir solo el cambio de material. Eso clava
el estilo sin discutirlo, que es exactamente el problema que este documento intenta resolver.

---

## 2. Lo que trajo el documento del diseñador

Trece referencias, todas de forma:

| Referencia | Para qué ítem del juego |
|---|---|
| Lingotes de oro apilados | `res_barra_oro` |
| Lingotes oscuros apilados | `res_barra_hierro` |
| Lingotes de bronce apilados | `res_barra_bronce` |
| Pico de piedra, bronce, hierro, oro y diamante (rotulados) | `pick_stone` · `pick_bronze` · `pick_iron` · `pick_gold` · `pick_diamond` |
| Caña con hilo y anzuelo | `fishing_rod` |
| Nasa de mimbre con aros de hierro | la nasa — **hoy no tiene sprite propio** |
| Fardo de troncos atado con hierro | `res_madera` |
| Pila de tablones | `res_tablon` |
| Cinco peces por rareza, en marcos | la escalera de rareza (ver §4) |

---

## 2b. LA DECISIÓN DE LA SILUETA (7/9) — se cambia el idioma de los picos

Trabajando el pico de oro salió el choque que este documento no había visto. Hay DOS idiomas
de silueta y no pueden convivir:

| | Cabeza | Mango | Lectura |
|---|---|---|---|
| **El del juego** (sprites actuales) | cruzada, puntas hacia ABAJO | grueso, en diagonal | cava — es un pico |
| **El de las referencias de Suren** | media luna, puntas hacia ARRIBA | fino, casi vertical | épico, de RPG |

Medido a 40 px —el tamaño real en la bolsa— el idioma del juego gana con claridad: sigue
leyéndose como un pico cuando el de la referencia ya es una mancha. Eso no es opinión, está
en `docs/…/comparar-oro.png` y `siluetas.png`.

**Dirección eligió igualmente el idioma de Suren, y se rehacen los SEIS picos.** Queda escrito
que el coste aceptado es la legibilidad a tamaño chico, y que el juego gana un aire más épico
y menos cozy. La única enmienda que se aplica sin discutir: **el mango va más grueso que en la
referencia** — engrosarlo no toca el estilo y es lo primero que se pierde al reducir.

Nota de método, para que no se repita: los primeros prompts los escribí desde una escalera
propia sin estudiar las siluetas de las referencias, y cuando el resultado salió « raro » lo
atribuí al prompt. Estaba mal: PixelLab había reproducido la referencia con fidelidad. Mirar
la referencia ANTES de escribir el prompt, y a su tamaño final, no al tamaño del render.

## 3. La cola, en orden de lo que más se ve

1. **Los cinco picos.** Es la escalera más visible del juego y la referencia viene rotulada.
   Prioridad dentro de la prioridad: **`pick_iron`**, que hoy es el patito feo — mide 60 px
   contra los 96 de sus hermanos y se derivó recoloreando el de piedra, así que rompe la fila
   en la Herrería y en la bolsa. Con el recuadro de rareza nuevo se nota más todavía.
2. **Las tres barras** (bronce, hierro, oro). `res_barra_piedra` ya está bien.
3. **Madera y tablones.** El fardo atado con hierro de la referencia es mejor forma que el
   montón suelto de hoy.
4. **Caña y nasa.** La nasa es la única que nace de cero: hoy la Pesca v4 la muestra sin sprite.

---

## 4. Lo que NO hace falta generar

**La rareza ya no es trabajo de arte.** Dirección lo dijo el mismo día — « esto se puede hacer
mediante el código, no hace falta hacerlo en el sprite » — y quedó hecho: la casilla se pinta
sola con el color de la banda (`rarezaDe()` en state.js, `.slot.filled.r-*` en index.html).
Los cinco peces en marcos del documento son una referencia de CONCEPTO, no cinco sprites a
pedir: el juego ya tiene sus diecinueve especies con su banda, y el marco lo pone el motor.

Generar un sprite dorado para decir « legendario » sería pintar en la imagen algo que el código
ya sabe, y condenarlo a desincronizarse el día que cambie la escalera.

---

## 5. Cómo trabajamos, imagen por imagen

Pedido de dirección: « paso a paso generando imagen por imagen, respetando el estilo ».

1. Genero UNA.
2. La muestro al tamaño real y sobre el fondo de la bolsa, que es donde se va a ver.
3. Se aprueba, o se dice qué cambiar y la repito.
4. Recién con el visto: entra a `public/assets/farm/`, se rearma el atlas
   (`python3 tools/build-atlas.py`), sube el `?v=` en `boot.js` y corre
   `node tools/test-carga-una-pasada.js` — que es el que se pone rojo si el sprite nuevo quedó
   fuera del atlas y haría bailar la barra de carga otra vez.

Nunca al revés: un lote de doce imágenes aprobadas de golpe es un lote de doce imágenes que
nadie miró de verdad.
