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
| §4 fórmula de ataque | Sustituida | TibiaWiki la marca desactualizada. El daño lo fija el segundo documento (abajo): la fórmula de TFS, con el skill entrando directo. |
| §5 pérdida al morir | No | Contradice la decisión del 28/7 (morir no quita nada) y roza la ley 1. |
| Shielding / Magic Level | No existen | Golden no tiene esos oficios. |
| « Tp = A·b^(S−c) − A » | Se ignora | Esa línea del doc omite el `/(b−1)` y no cuadra con sus propios ejemplos; el total se obtiene sumando los escalones. |

## Ley 1 — la migración

Un guardado viejo trae XP en las cuatro armas. Al cargar, **una sola vez** (`triesV` en el
guardado), la XP se convierte al nivel equivalente — el viejo nivel L pasa a ser el `10 + (L − 1)`,
con la misma fracción de barra — y de ahí en más el número son intentos. Nadie baja de nivel ni
pierde daño.

## Segundo documento — « Defensa de los mobs de Tibia » (misma tarde)

Complementa al primero con cómo el daño del jugador pasa por la defensa del mob, y cómo el mob
pega. Fuente: The Forgotten Server. Lo custodia `tools/test-defensa-mobs.js`; el código vive en
`state.js` (bloque « LA DEFENSA DE LOS MOBS ») y `forest.js`.

**Adoptado tal cual:**

- Cada mob tiene **defense** (la parada: puede anular el golpe entero, solo si le quedan cargas)
  y **armor** (reducción fija, siempre). Orden `Creature::blockHit`: parada → armadura → resto.
  Parada: `daño −= aleatorio[def/2, def]`. Armadura: si > 3, `−= aleatorio[armor/2, armor−1]`
  (−2 si armor es par); si 1..3, `−= 1`.
- **Cargas de bloqueo:** cada golpe físico recibido gasta una; vuelve 1 por segundo, tope 2. Las
  tiene cada bicho y el héroe.
- **Daño máximo del jugador:** `round(nivel/5 + ((skill/4 + 1)·(atk/3)·1,03) / factor)`, con
  nivel = la barra de Combate global, skill = el oficio del arma (arranca en 10), factor = 1,0
  (Golden no tiene modos: siempre ofensivo). Golpe real `normal_random(0, máx)`, centrado en la
  mitad; con arco contra un mob el mínimo es `ceil(nivel·0,2)`.
- **El mob pega** `normal_random(0, máx)` — el `dmg` de la tabla es ese máximo, literal — y pasa
  por la parada del héroe, `(skill/4 + 2,23)·defArma·0,15·factorDefensa` (0,5 si atacó hace
  menos de 2 s, 1,0 si no), y luego por la armadura (la suma de las piezas, escudo incluido).
- « Parado » y « Absorbido » se muestran sobre el bicho y sobre el héroe (doc §6).
- Las **habilidades** de los bichos (pisotón, llamarada, aliento, cola) no son físicas: no pasan
  por la parada y siguen por el camino de antes.

**Lo que el doc no fija y es de Golden (escrito en el código y medido):**

| Cosa | Regla | Por qué |
|---|---|---|
| Atk del arma | `min + max` de la tabla del compendio | Golden guarda min–max, Tibia un Atk. Con 8 la Espada de Madera a skill 10 pega máximo 10 y de media ~5, lo de ayer. |
| Def del arma | `0,8 · atk` | La proporción de las espadas de Tibia (24/21, 40/30). |
| Armor y defense de cada bicho | `6 % del HP`, mínimo 1, salvo que el bicho lo traiga escrito | Los números literales del doc (Rotworm 8) son de la escala de Tibia, cinco veces más grande: la Larva de 22 HP con armor 8 absorbía cada golpe. 6 % es la mediana de la tabla TFS. |
| Shielding | No existe | El skill de la parada es siempre el del arma; el escudo suma a la armadura. |

**Medido (golpes para matar, ayer → hoy):** rata 3,3 → 3,8 · orco 9,8 → 13 · trol 13 → 19 ·
demonio 8,6 → 6. **Lo que te pegan por golpe** baja mucho porque el doc reparte el golpe entre
0 y el máximo y después lo para tu defensa: rata 3 → 0,4 · orco 10 → 2,4 · trol 18 → 5 ·
demonio 35 → 3,7. Decisión del 11/9: se toma literal; el peligro de la Zona queda en las
habilidades, y `MOB_DMG_MULT` sigue siendo la perilla si el playtest pide más.

## Lo que esto NO resuelve

Las cuatro armas ahora suben con un ritmo que tiene sentido, pero **siguen sin abrir nada**
(`oficiosSinContenido()` sigue contando seis). El hueco de contenido es la decisión de dirección
que está en el TODO; esto solo cambia cómo sube el número, no qué gana el jugador con él.
