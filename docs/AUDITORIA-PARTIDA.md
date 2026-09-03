# Auditoría de partida completa — del minuto 1 al último contenido (2/9)

Pedido de dirección: « audita como si jugaras una partida desde el principio hasta el último
contenido, y dime qué ves bien, qué ves mal, opinión ».

Método: se re-jugó la partida entera con `tools/jugada-completa.js` (previa modernización: el
simulador seguía jugando el juego de agosto — cocinaba sin recoger y pescaba por el camino de
la v3), se re-midió el ritmo con `tools/simular-partida.js`, y se corrieron los seis auditores
de economía. Sobre esos números, la opinión.

---

## El veredicto en una línea

Del día 1 a la semana 3 el juego está fino, medido y sin fallos jugables; el corazón económico
es sólido y raro de ver en un juego artesanal. Los dos agujeros reales están al fondo: **el
desierto de niveles 21→50** (media tabla de expansiones vive detrás de niveles que nadie va a
alcanzar con la curva actual) y **la economía del equipo de pesca** (nasas que pierden plata,
cañas a ×3-4 de su presupuesto).

---

## Lo que está BIEN (y por qué)

**1. La partida entera se juega sin romperse.** El simulador nace, reclama el kit, cultiva,
tala, pica, cava, pesca con el carrete, cocina, forja, cruza el portal, completa el TUTORIAL
ENTERO, entrega pedidos, compra expansiones, guarda y vuelve — **cero fallos**. Hace un mes
esto no pasaba; hoy es el estado normal del juego.

**2. El corazón económico está auditado y cierra.** `auditar-ancla`: los 57 números del juego
cuelgan del ancla (20 plata/celda-hora). `auditar-imprentas`: 0 hallazgos — vales con prima
25 %, goblin con techo, reventa cerrada, platos sin venta libre, $Golden con techo. El
invariante de la lombriz (9,3–10,6 por lombriz en toda ruta) re-medido con 160.000 lances.
Esto es lo que hace que cada feature nueva no rompa tres viejas.

**3. El arranque está bien peinado.** Nacer con 3 de plata y que el primer objetivo sea
COMPRAR semillas enseña la economía en el primer minuto. Papa de 3 minutos, montículos gratis
llenando la primera espera, mariposas guía, dos carriles de cultivo (sesión + ausencia) desde
el nivel 2. Nivel 3 a los 12 minutos, primera expansión el primer día: el ritmo de hitos de la
primera semana es denso como debe ser.

**4. El ritmo casual es sano.** 12 minutos de juego al día en 3 sesiones — el molde de
Sunflower Land. El jugador que entra poco no pierde en cultivos (elige el que dura su
ausencia). Un nivel por día la primera semana, luego uno cada 2-5 días con una expansión cada
2-4 niveles: hasta el nivel ~21 siempre hay un hito a la vista.

**5. La pesca es un oficio de verdad.** Carrete con dificultad por banda (el legendario se
siente en la mano: ×2,5 de velocidad, ×3 de nervio), 6 mareas de 4 h, torneo semanal, Lonja
con Escamas, lombricario, nasas, álbum y récords. Es el sistema más profundo del juego y el
que más se distingue de la competencia.

---

## Lo que está MAL (en orden de gravedad)

**1. El desierto 21→50 — el hallazgo gordo.** La simulación llega a nivel 21 en 63 días. Las
expansiones 9 a 16 piden niveles 24, 28, 31, 35, 39, 42, 46 y 50 — y la curva de XP es
exponencial (el escalón 49→50 pide 162.356 XP cuando el ritmo real es ~100 XP/h: son miles de
horas). **La mitad de la tabla de expansiones — con sus nodos de bronce/hierro/oro nuevos — vive
detrás de niveles que ningún jugador va a ver.** Esto no es opinión, es aritmética. O se
recorta la curva alta, o se agregan multiplicadores tardíos de XP, o se aceptan las expansiones
13-16 como contenido aspiracional de años (y entonces sobran ahí los premios que importan).

**2. Las nasas pierden plata — trampa objetiva.** `auditar-pesca-v4` (hallazgo conocido desde
su auditoría de origen, sigue abierto): el valor por ciclo de las tres nasas queda un **75-82 %
POR DEBAJO del ancla**. Invertir en nasas es hoy un mal negocio medible: el jugador que las
craftea pierde contra cualquier otra cosa que haga con esos materiales. O se abaratan sus
ciclos, o se sube su rendimiento, o se les da un rol no-económico claro (peces exclusivos).

**3. Las cañas cuestan ×1,4-×4,2 su presupuesto del documento.** Mismo auditor: la capa de
materiales de la pesca nunca se recalculó contra el presupuesto del doc (barras, cuero y fibra
tienen precios supuestos corridos hasta +1100 %). Como fricción de progresión puede ser
intencional — la caña se compra una vez — pero está sin decidir, y el propio documento dice que
las mezclas se recalculan solas contra el presupuesto.

**4. Los nodos pagan 25-33 % del ancla al jugador de 3 sesiones.** Cultivos rinden el 100 %
(elegís la duración), pero árboles/rocas con cargas de 30-40 min y tope 4 dejan dos tercios del
valor en la mesa para quien entra 3 veces al día. Decisión de diseño defendible (premia estar),
pero la tabla del simulador muestra la palanca: tope 8 = 54 % del ancla a cambio de más clics.
Vale la pena decidirlo con Suren en vez de heredarlo.

**5. Menores.** `G.fish` nace con claves fantasma de la era vieja (`comun/raro/epico/
legendario` en 0 junto a los peces reales) — cosmético, pero ensucia guardados y depuración.
El ranking del torneo espera el deploy de la BD (los 2 días de premio del podio vuelven ahí).
Las Escamas a ~280/mes tienen nerf anunciado por Suren pendiente de decisión.

---

## Lo que haría, en orden

1. **Sentar con Suren la curva 21→50** — es media tabla de expansiones muerta. Mi propuesta:
   recortar el exponente de XP por encima del nivel 20 para que la expansión 16 quede a ~6-8
   meses de juego casual (hoy queda a años), y mover los nodos de metal nuevos (11-16) un
   escalón antes si se quiere que alguien los vea este año.
2. **Decidir las nasas** — hoy son la única compra del juego que pierde plata contra el ancla.
3. **Recalcular las mezclas de las cañas contra su presupuesto** (el documento ya dice cómo).
4. **GDD a revisión 6** — cambió medio juego desde la revisión 5 y es la referencia de Suren.

---

*Nota de método: de los 13 «fallos» que reportó el simulador al arrancar la auditoría, los 13
eran del simulador (jugaba las reglas de agosto: cocinar sin recoger, pescar por la v3). Se
modernizó primero — un auditor que juega reglas viejas mide un juego que no existe — y con las
reglas de hoy la partida salió limpia. `auditar-vales` custodiaba la ley derogada del 18/8
(emisión = gasto, que ERA el agujero) y se actualizó a la ley del 31/8 (dos varas, prima 25 %).*
