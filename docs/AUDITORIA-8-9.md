# Auditoría general de Golden Farm — 8 de septiembre

Encargo: *"audita todo el juego para encontrar bugs, y ver su balance"*.

Método: se corrieron las 185 herramientas de `tools/` y, en paralelo, tres agentes leyeron el
código de las zonas que ninguna herramienta mira. Casi todo lo que sigue está **verificado
ejecutando el código del juego**, no leyendo comentarios — y eso importa, porque el hallazgo
transversal de la jornada es que **once herramientas de medición mentían**, todas por lo mismo:
un supuesto escrito a mano que envejeció en silencio. Ninguna estaba en rojo.

Cuando un hallazgo se apoya solo en lectura, se dice.

---

## Ya arreglado esta noche (commit `d3ec652`)

**El muro de la netherita — y me corregía a mí.** Las tareas del nivel 11 al 50 pedían 125 de
netherita y 65 de diamante. En todo el mapa hay **un** nodo de cada uno, con relojes de 12 h y
9 h: 62,5 y 24,4 días mínimos con el jugador conectado las 24 horas. El "todo el contenido en un
mes" que reporté por la tarde era falso; lo verifiqué con el ritmo del árbol y la roca y nunca
miré cuántos nodos de netherita existen. Las cantidades se derivan ahora de lo que el mineral
puede dar. También se arreglaron dos tests en rojo, ambos regresiones mías de la misma noche.

---

## GRAVE — pérdida de progreso del jugador

Los tres primeros violan la regla de la casa: *"el único motivo por el cual se debe resetear una
partida es cuando se actualiza borrando caché"*.

**1. Cada recarga borra todas las cañas compradas.** `state.js:5893`, en `mudanzaPescaV4()`. La
línea `if (G.canas && ...) G.canas = { junco: 1 }` no tiene bandera de "ya migrado" y su único
`return` temprano nunca se cumple, así que corre en **cada** hydrate. Medido: `{junco, bambú,
hierro, oro}` → `{junco}` en un solo F5, sin un aviso. El jugador compra la Caña de Oro
(presupuesto 2.000) y la pierde al recargar. *Verificado ejecutando.*

**2. El F5 degrada el arma que llevás en la mochila.** `save.js:408`, `sanearCont` reconstruye
cada pila como `{kind, k, n}` y tira el `w` — durabilidad, +N y runas. Medido: una espada de
bronce `{dur:60, mas:2, runas:["fuego"]}` vuelve sin el +2 y sin las runas. Mismo efecto en los
peces, donde `w` es el peso en kg. *Verificado ejecutando.*

**3. Morir borra la ficha del arma que llevabas dentro del contenedor.** `state.js:4109`,
`tumbaCaer` hace `contAplanar(raiz).map(e => ({kind, k, n}))` sin copiar `e.w`. Lo que llevabas
*puesto* sí conserva sus datos; lo que llevabas *guardado*, no. El comentario de `state.js:3948`
afirma exactamente lo contrario. Arreglo: una palabra. *Verificado ejecutando.*

**4. El botín que no cabe en la bolsa se destruye en silencio al volver de la Zona.**
`state.js:4153`, `zonaSalir` llama `contDescargar(raiz, true)` —el `true` silencia el aviso— y
después `viajeSoltar()`, que ignora el `false` de `viajePoner` y pone `G.cont = null`. Medido:
con la bolsa llena volví con 17 esencias oscuras y salí con 0, sin un toast ni una línea de log.
Es el recurso más caro del juego. *Verificado ejecutando.*

**5. Recargar dentro de la Zona Negra saltea `zonaSalir` entero.** `state.js:4144`. `zonaSalir`
es el único sitio que cobra el enfriamiento y vuelca el contenedor: un F5 te devuelve a la granja
con el botín intacto, sin enfriamiento y sin haber muerto. Se puede recargar en cuanto la pelea
se pone fea. *Leído y rastreado; no reproducido con DOM real.*

**6. Duplicación de tu propia tumba.** `forest.js:115` y `356`. `GF.forestCuerpos` es global a la
sesión y no guarda a qué zona pertenece cada cuerpo, y `montarTumba()` empuja uno nuevo cada vez
que se crea la escena. Morís → entrás (aparece tu cuerpo) → salís sin recogerlo (la puerta está
abierta: `zonaCdLeft()` devuelve 0 mientras haya tumba viva) → volvés a entrar: **dos cuerpos
tuyos, cada uno con una copia completa del botín**. El mismo defecto hace que los cuerpos de
bichos se recojan en zonas distintas. *Leído; necesita el ciclo `create()` de Phaser.*

---

## GRAVE — economía

**7. El tablón compra minerales al 12,5 % de su valor.** `pedPool()` tasa con `ORE_DEF[k].price`
—`{bronce:12, hierro:15, oro:30, diamante:80, netherita:200}`— mientras el juego vende con
`PRICE` —`{160, 240, 280, 360, 480}`. Solo la piedra fue reatada; los otros cinco se quedaron.
Sobre 3.000 pedidos generados: **6 Hierro pagan 180 por 1.440 de valor**. Los cultivos, la madera
y la piedra están perfectos (ratio 1,000). Mismo fallo con los platos: `pedPool` usa la planilla
`r.plata` y la venta usa `dishPrice(r)` derivada — 5 cremas de calabaza pagan 160 por 1.265.
*Verificado ejecutando.*

**8. La Cocina es una imprenta del 25 % al 47 % sobre el ancla.** `dishPrice = dishValue × 1,25`,
y la venta multiplica otra vez por `cookPot` (hasta ×1,18). Cualquier cultivo que pase por la olla
vale entre 1,25 y 1,48 veces lo que vale crudo, **sin ocupar una celda**. Y la olla nunca se
satura: procesa entre 180 y 480 platos al día mientras la granja produce ~19 cultivos nocturnos.
Vender crudo es siempre el juego mal jugado. `auditar-ancla` sección 5c solo comprueba que el
plato no dé pérdida; nunca mira el techo. *Verificado ejecutando.*

**9. El Lombricario: el panel recomienda activamente la peor operación del juego.**
`lombricarioDa(k) = min(12, round(2 × price / 3))`. El tope de 12 rompe la ratio constante que el
comentario promete: la ciruela da una lombriz por 2,67 de plata y el maíz por **200** — 75 veces
peor. Y `lombricesPorDia()` estima el rinde con **el cultivo más caro desbloqueado**: elige maíz y
promete 40,5 lombrices al día, que solo se alcanzan quemando 7.200 de plata para obtener ~350.
*Verificado ejecutando.*

---

## MEDIO — la cuarentena de la Zona Negra tiene agujeros

**10. El panel de Equipo es un agujero en los dos sentidos.** `ui.js:2044` y `2061`. Dentro de la
Zona, el slot de arma recorre `G.weapons` —el stock de la **granja**—, así que podés equiparte a
mitad de cacería la espada que dejaste en casa. Y al revés: el slot de munición lee `G.res.flecha`,
la bolsa de la granja, de modo que con 200 flechas en el contenedor y 0 en casa el panel dice "No
tenés flechas" y **no deja equiparlas**. Peor: `porQueNoAtaca()` manda al jugador exactamente a
ese panel. *Verificado ejecutando.*

**11. Cargar tu única arma al contenedor te cierra la puerta.** `viajeCargar("arm", …)` → `mkSacar`
hace `G.gear.arma = null; delete G.weapons[key]`. El arma deja de existir para `armaEq()`, la
puerta contesta "Equipate un arma antes de entrar", y el arma está a la vista dentro del
contenedor, imposible de equipar. *Verificado ejecutando.*

**12. El set de la Curtiduría "cae" al morir pero no se pierde nunca.** `equipoCaido` solo hace
`G.armorEq = null`; `G.armor` no se toca. Medido: tras la caída y tras borrar el cuerpo,
`armorSetCompleto("fibra")` sigue en `true` y basta pulsar "Equipar". Pero el log te lo cuenta
como perdido y ocupa un hueco del cuerpo. *Verificado ejecutando.*

**13. Con el arma rota, el aviso te manda a arreglar lo que ya está bien.** `armaEq()` exige
`dur > 0`, así que al romperse devuelve null y `porQueNoAtaca()` contesta *"Equipate un arma — la
tenés en la bolsa"*, con el arma equipada y hablando de una bolsa que dentro de la Zona no existe.

**14. Los diez minutos de la tumba se esquivan quedándote dentro.** `recogerCuerpo` nunca vuelve
a preguntar `tumbaViva()`: solo comprueba distancia. El reloj solo se aplica al entrar.

---

## MEDIO — balance

**15. El valle del nivel 11.** Del 10 al 11 cuesta 700 XP; del 9 al 10, **5.000**. Ningún nivel
del 11 al 49 vuelve a costar lo que costó el 11. El jugador se atasca días en el tramo 6-10 y
después sube quince niveles en un fin de semana. Es consecuencia de aplanar la cola hoy sin tocar
los diez primeros, que eran decisión de dirección. *Verificado.*

**16. La escalera del establo no premia.** Los cuatro animales rinden exactamente 20 plata/h
(correcto contra el ancla), pero el precio sube por posición: alpaca 480, jabalí 1.920. La alpaca
es **estrictamente dominante** — mismo rinde, un cuarto del precio. Subir Ganadería entrega renta
más cara, no mejor. *Verificado ejecutando.*

**17. Premios sin escala.** El nivel 7 del pase gratis entrega 3 Pan de Trigo = **7.740 de
plata**, unos once días de producción de un jugador de esa altura; el nivel 2 entrega 5 semillas
de papa = 5. Los logros, en cambio, pagan **965 de plata en todo el juego**: 48 horas-celda por
coleccionar 500 cosechas, 500 talas, 500 minados y 500 muertes. *Verificado.*

**18. El portero de guardado no es la única puerta.** Si `functions.invoke("guardar")` falla, el
cliente cae a `sb.from("farms").upsert(...)` directo, y `sql/portero-guardado.sql` PARTE 2 —que
cerraría la puerta vieja— no está aplicada. Además el portero está en modo sombra (nunca rechaza)
y sus reglas no miran el caso que motivó el archivo: **un guardado que BAJA de nivel o de plata
pasa limpio**. *Leído.*

---

## Las herramientas que mienten

Este es el patrón de la jornada, y merece su propia lista.

| herramienta | qué cree | qué pasa de verdad |
|---|---|---|
| `auditar-costo-expansiones` | tabla `NIVEL_DIA` a mano del 20/8 | dice que la expansión 8 se abre el día 53; con la curva de hoy es el 12,7 — **×4,2** |
| `auditar-pesca-v4` §3 | siete netos escritos a mano | la función real da 8,89/9,00/8,94 por lombriz, **bajo el piso de 9,30** del invariante |
| `test-pesca-v4-nasas` | banda "entre 8,5 y 12" | el invariante del proyecto es 9,30-11,03; con la banda buena, las tres nasas están en rojo |
| `auditoria-dupes-f5` | `hydrate(snapshot())` sobre el `G` vivo | un F5 real recrea `G`; con este arnés, todo campo que el snapshot olvide "sobrevive" |
| `test-no-perder-granja` | regex sobre el texto de `save.js` | no ejecuta nada |
| `simular-partida` | modela cosechas y nodos | **no modela `FARM_TAREAS`** — es lo que dejó pasar el muro de la netherita |
| `auditar-todo` | leía `FARM_UNLOCK` | esa tabla no la lee el juego (arreglado hoy) |

Además, tres tablas que el juego ya no lee y siguen ahí: `FARM_UNLOCK`, `FARM_PARCELA` y
`ANIMAL_DEF[k].porCiclo`. Las dos primeras están marcadas; la tercera no.

---

## Comprobado y descartado

Para que no se vuelva a mirar: `nodosQueTocan` ignora su parámetro pero es correcto (todo se abre
en el nivel 1); `regalosSync` es idempotente (4 F5 no fabrican regalos); el horno y la cocina
sobreviven al F5 sin duplicar; comprar una expansión + 5 F5 no fabrica parcelas; el kit de
bienvenida, los montículos, el paquete diario y las nasas se entregan una sola vez; `chestCap`
converge; `G.peajeCana` no se guarda pero todos los mantenimientos son enteros.

---

## Qué haría, por orden

1. **Los cuatro de pérdida de progreso (1-4).** Son arreglos de una a tres líneas cada uno y
   violan la regla de la casa. La caña de oro que desaparece al recargar es lo peor que hay aquí.
2. **El tablón y los minerales (7).** Atar `pedPool` a `PRICE` y a `dishPrice` — una línea, y
   devuelve al tablón la mitad de su contenido.
3. **Los agujeros de la cuarentena (10-11).** Que los dos slots del panel de Equipo pregunten por
   el contenedor cuando `enZona()`. Es un solo cambio y cierra los dos.
4. **Arreglar las herramientas mentirosas** antes de creerle un número más a ninguna.
5. **La Cocina y el Lombricario (8-9)** son decisiones de diseño, no bugs: hay que decidir si la
   olla debe ser una imprenta del 25 % y si el Lombricario debe recomendar el peor trato.
