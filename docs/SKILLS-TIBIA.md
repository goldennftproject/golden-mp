# Las armas suben por intentos — la fórmula de Tibia

*11/9. Fuente: el documento del diseñador « Fórmula de skills de Tibia ». Lo custodia
`tools/test-skills-tibia.js`; el código vive en `state.js` (bloque « LAS ARMAS SUBEN POR
INTENTOS ») y los golpes se cuentan en `forest.js`.*

## Lo que se adoptó, tal cual el documento

- **No hay XP de arma.** Cada golpe que das es un intento del arma que llevás, **acierte o no**:
  el cuerpo a cuerpo se cuenta al pegar (antes del esquive del bicho), el arco al soltar la flecha.
  **Matar no entrena el arma**: la XP del bicho va a la barra de Combate global y nada más.
- **Espada, Hacha, Mazo y Arco arrancan en 10.**
- **Intentos para pasar de x a x+1:** `A · b^(x − 10)`, con `A = 50` (Espada/Hacha/Mazo, el
  Fist/Club/Sword/Axe del doc) y `A = 25` (Arco, Distance); `b = 1,1`.
  10→11 = 50 golpes · 20→21 = 130 · 50→51 ≈ 2.263 · Arco 80→81 ≈ 19.700.
- **El dummy sigue siendo el « offline training » del doc**: 60 intentos por hora (uno por
  minuto), tope 8 h, como estaba.

## Decisiones tomadas con Golden (11/9)

| Punto del doc | Decisión | Por qué |
|---|---|---|
| Alcance | Solo las 4 armas | Cultivo, Tala, Minería, Pesca, Ganadería, Cocina y Artesanía siguen con su curva de XP y sus puertas. |
| Constante `b` | 1,1 para todo | Golden no tiene vocaciones. La fila « sin vocación » (b = 2) pedía 51.200 golpes del 20 al 21: un muro. |
| §4 fórmula de ataque | No | TibiaWiki la marca desactualizada. El daño sigue siendo tirada + nivel/2; el bono se calcula sobre `nivel − 9` para que el 10 pegue como pegaba el 1. |
| §5 pérdida al morir | No | Contradice la decisión del 28/7 (morir no quita nada) y roza la ley 1. |
| Shielding / Magic Level | No existen | Golden no tiene esos oficios. |
| « Tp = A·b^(S−c) − A » | Se ignora | Esa línea del doc omite el `/(b−1)` y no cuadra con sus propios ejemplos; el total se obtiene sumando los escalones. |

## Ley 1 — la migración

Un guardado viejo trae XP en las cuatro armas. Al cargar, **una sola vez** (`triesV` en el
guardado), la XP se convierte al nivel equivalente — el viejo nivel L pasa a ser el `10 + (L − 1)`,
con la misma fracción de barra — y de ahí en más el número son intentos. Nadie baja de nivel ni
pierde daño.

## Lo que esto NO resuelve

Las cuatro armas ahora suben con un ritmo que tiene sentido, pero **siguen sin abrir nada**
(`oficiosSinContenido()` sigue contando seis). El hueco de contenido es la decisión de dirección
que está en el TODO; esto solo cambia cómo sube el número, no qué gana el jugador con él.
