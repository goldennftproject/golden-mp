<!-- Propuesta entregada por dirección el 25/8/2026 (Golden Farm - Pesca v3, rev 2).
     Se guarda acá para que viva con el proyecto y se pueda contrastar contra el código.
     Las OBSERVACIONES DE MEDICIÓN están al final, en un apartado aparte: no se toca el
     texto original. -->

GOLDEN FARM

PESCA v3 — La Laguna que se lee

Propuesta de diseño · revisión 2 · complemento del capítulo 4 (Nodos) · 25 de agosto de 2026

El pez no se sortea: se elige. Hoy la rareza se tira al armar el lance (60/25/12/3) y el jugador es espectador de su propia suerte. En v3 el agua es un mapa: hay señales visibles, cada carnada abre una familia distinta, cada caña dice qué aguanta, y la estrella se ve ANTES de tirar.

LAS DOS REGLAS QUE MANDAN SOBRE TODO ESTE DOCUMENTO

1 · La plata es plana. Ninguna especie ni ninguna estrella rinde por encima de 20 de plata por hora.

2 · La estrella no paga plata: paga XP. Es la única moneda que el ancla no gobierna.

Qué cambió desde la revisión 1

La revisión 1 tenía un sistema elegante y dos fallos de fondo. Van corregidos acá, y con ellos vienen tres cosas nuevas que la primera pasada no vio.

Los dos fallos que se arreglaron

La fórmula P(cobrar) = 1/multiplicador anclaba perfecto y rompía el incentivo. Si la esperanza es idéntica en todas las estrellas, lo racional es pescar siempre 1★: misma plata, cero riesgo, pelea más corta, menos desgaste de caña. El 5★ quedaba estrictamente peor. Ahora la plata es plana por especie y la estrella escala la XP, que es exactamente lo que la estrella mide — el GDD ya dice que la XP no mide relojes, mide PRÁCTICA, y una pelea de 5★ es más práctica.

Las señales en tiempo real peleaban contra las cargas acumuladas. Una señal vivía 3-8 minutos y las cargas se juntan durante horas: el jugador que volvía con 4 lances guardados encontraba solo lo que hubiera en ese instante. Un sistema premiaba la ausencia y el otro la presencia. Ahora las señales se generan AL LLEGAR, una por carga guardada: el agua te muestra lo que te guardó.

Lo que se agregó

La memoria de la laguna — el agua se acuerda de lo que le sacaste, y lo que escasea cambia quién vive ahí.

La escama del que se fue — cortar el hilo deja de ser un cero.

La estrella llega a la Cocina — el pez grande no hace el plato más fuerte: lo hace más largo.

Lo que se recortó, y por qué

La revisión 1 le agregaba a la pesca más superficie que Cultivo, Tala y Minería juntos, sobre un juego cuyo primer pilar dice que una visita útil dura entre uno y tres minutos. Eso era un juego de pesca adentro de un juego de granja. Ahora la propuesta viene partida en tres tandas (capítulo 14) y ninguna de ellas se lleva puesto el ritmo del juego.

La Lonja baja de cuatro escalones a uno. Ocho ventanas vencibles a la vez no son un juego relajado: son un trabajo.

El camarón deja de pescarse con caña para la cadena: sale de la nasa. La caña nunca se gasta fabricando sus propios insumos.

La tinta del calamar deja de apagar la barra (eso era un gotcha, no una habilidad) y pasa a apagar la ZONA.

1. Las señales: el agua no es un botón, es un mapa

La laguna deja de ser una superficie uniforme. El lance se dirige a una señal concreta, y la señal dice qué familia trae y cuántas estrellas — antes de tirar.


| Señal | Qué se ve | Familia que abre |
|---|---|---|
| 〰️  Rizos en la orilla | Ondas chiquitas contra la ribera | Orilla |
| 🫧  Burbujas gordas | Glup glup desde el fondo | Fondo |
| ✨  Destello plateado | Algo saltó y volvió | Superficie |
| 🐦  Pájaro en círculos | Alguien está comiendo ahí abajo | Coloso |
| 🖤  Mancha oscura | Sombra grande y quieta | Coloso |
| 🌫️  Mancha de tinta | Calamar cerca | Fondo · solo de noche o con niebla |

La corrección de la revisión 2: las señales se generan al llegar

La laguna acumula hasta 4 lances (5 con lluvia), igual que el árbol y la roca desde el 21/8. Y al llegar, el agua reparte una señal por cada carga guardada: cuatro cargas, cuatro señales puestas sobre la mesa.

Esto vale más que el arreglo del bug. Ver las cuatro señales JUNTAS convierte cada visita en una decisión de tanda —« con estos cuatro lances, ¿qué armo? »— en vez de cuatro decisiones sueltas. Y el jugador que entró tres horas tarde no encuentra un agua vacía: encuentra las tres horas que la laguna le estuvo guardando.

Las señales no vencen mientras tengas cargas. Se consumen al tirarles. Si te vas sin usarlas, quedan esperando — el F5 no las re-sortea, como la oferta del Mercader Goblin.

Regla 9 aplicada al agua: una señal que no dice qué trae es una señal muda. El jugador tiene que poder equivocarse a propósito, y para eso tiene que ver lo que está eligiendo.

2. Las carnadas: la carnada elige la familia, no la suerte

Ninguna carnada da porcentajes. Cada carnada habilita un conjunto de especies y deshabilita el resto — la misma lógica de dos llaves que la escalera de minerales.


| Carnada | De dónde sale | Coste real | Abre |
|---|---|---|---|
| 🪱  Lombriz | Montículo de tierra | 1 de los 3 montículos del día | Orilla |
| 🦗  Grillo | Montículo de tierra | 1 de los 3 montículos del día | Superficie |
| 🦐  Cebo de camarón | La nasa | Amarre calando 4 h | Pez espada |
| 🦑  Calamar | Se pesca de noche con señuelo | 1 lance nocturno | Tiburón martillo |
| 🐚  Señuelo de nácar | Artesanía · no se gasta | Una vez | Calamar |

El montículo ahora es una elección

Los tres montículos del día ya no dan lombriz automáticamente: al cavar, elegís lombriz o grillo. Cero sistemas nuevos, cero ítems nuevos, y de golpe la carnada de superficie tiene un precio real en vez de ser un regalo del árbol.

Es también lo que hace que el pez mariposa y el pez volador valgan el doble que la orilla en la tabla del capítulo 5: su cadena se come una lombriz que no cavaste.

La corrección de la revisión 2: el camarón sale de la nasa

En la revisión 1 el camarón se pescaba con caña, y eso rompía la vara del juego. La cuenta era esta: 1 lance para el camarón + 1 lance para el pez espada = la mitad de la sesión en un solo pez, y si fallabas el carrete perdías las dos cosas.

Choca de frente con « un lance fallado cuesta tiempo, no plata ». Ahora el cebo de camarón sale de la NASA, que trabaja mientras no estás. La trampa deja de ser contenido opcional y pasa a ser la fábrica de cebo de la cadena — un rol mucho más claro que el que tenía. El que quiere colosos, cala nasas. La caña nunca se gasta fabricando sus propios insumos.

La cadena, que es la inversión de tiempo

Nasa calando 4 h → cebo de camarón → palangre → PEZ ESPADA

Señuelo de nácar → noche → calamar ×2 → palangre → TIBURÓN MARTILLO

El tiburón martillo no es un drop raro: es una cadena de producción. El que no lo tiene no es porque tuvo mala suerte, sino porque le faltan pasos — que es una frustración legítima, diagnosticable y con solución, al revés de la otra.

3. Las cañas: la caña es un límite, no un porcentaje

Cada caña tiene resistencia en estrellas, escrita en la propia caña. Si el pez enganchado pesa más, el hilo se corta: se pierde la carnada y el lance, nunca plata.


| Caña | Aguanta | Pesca nivel | Coste | Usos |
|---|---|---|---|---|
| Caña de junco | 2★ | 1 | 2 de plata | 30 |
| Caña de roble | 3★ | 7 | 3 Tablón + 2 Madera | 30 |
| Caña de hierro | 4★ | 12 | 1 Barra de hierro + 4 Tablón | 25 |
| Caña del Abuelo | 5★ | 18 | Lonja + carta del lore | 20 |

La caña se elige sola (la decisión del 24/8, aplicada al agua)

La misma dirección que se tomó con los picos, sin cambiar una coma: clicás la señal y el juego agarra la caña más barata que aguante esa estrella y de la que tengas stock. La Caña del Abuelo jamás se gasta en una carpa de 1★.

Si no tenés ninguna que sirva, el aviso nombra la caña exacta que falta, no un genérico.

Las dos puertas siguen existiendo: primero la caña (que se craftea ahora) y después la skill (que se sube pescando).

4. Las estrellas: ★1 a ★5, y la plata plana

Las cinco estrellas son TALLA, no especie. El camarón llega a ★2 y no pasa de ahí; el tiburón martillo arranca en ★4. Un camarón de ★2 es pieza de coleccionista, y esa es la diferencia de fondo con el sistema viejo: no hay un « legendario » que farmear, hay nueve especies que dominar.

La corrección de la revisión 2: la estrella paga XP, no plata

La revisión 1 hacía que el precio escalara con la estrella y compensaba con una probabilidad de cobro inversa (P = 1/multiplicador). Anclaba perfecto y rompía el incentivo: con la esperanza igualada, lo racional era pescar siempre 1★ — misma plata, cero riesgo, pelea más corta, menos desgaste de caña. El 5★ quedaba estrictamente peor que el 1★. Era un sistema matemáticamente honesto y jugablemente suicida.

La corrección deja el ancla más firme que antes, porque ya no necesita gimnasia:


| ★ | Nombre | Precio | XP de Pesca | Qué representa |
|---|---|---|---|---|
| ★ | Menudo | = base | ×1 | El pique de todos los días |
| ★★ | Bueno | = base | ×2 | Ya es una pelea |
| ★★★ | Notable | = base | ×3,5 | Te obliga a mirar la barra |
| ★★★★ | Trofeo | = base | ×6 | Te puede cortar el hilo |
| ★★★★★ | Colosal | = base | ×10 | Se cuenta después |

El precio de un pez es el de su especie, y no se mueve. Un tiburón martillo de 4★ y uno de 5★ pagan lo mismo en el mercado: 20 de plata. Lo que cambia es que el de 5★ da el doble de XP de Pesca. La estrella no te hace más rico: te hace mejor pescador.

Esto es lo que permite meter cinco escalones de rareza sin tocar los 20 de plata por hora. El ancla mide plata por hora de laguna y esa cifra queda intacta pescando lo que pesques. Y el motivo para ir por el coloso es el correcto: XP, lámina del álbum y trofeo — las tres monedas que el GDD ya usa para el contenido que no debe imprimir plata.

Y ahí está la palanca, en un solo lugar

Si algún día dirección quiere premiar más el tiempo invertido, la cifra a mover es el multiplicador de XP, no el precio. Subir el 5★ de ×10 a ×14 hace la escalera de Pesca más generosa con el que se la juega, y no toca la economía ni un centavo. Una pasada, un lugar, y el simulador lo mide al día siguiente.

5. Las especies

Nueve especies, todas ancladas. El precio sale de la fórmula de siempre —valor = horas de reloj × 20— contando los minutos ACUMULADOS de la cadena activa que hace falta para poder tirarle a esa especie.

« Cadena activa » quiere decir lances y montículos: el tiempo de trampa no se cuenta, por la misma razón por la que el árbol y la roca de una expansión son « regalo, no economía » (decisión del 22/8). La trampa no es una celda productiva: es una herramienta que convierte ausencia en cebo.


| Especie | Familia | Carnada | Cadena | Precio | ★ | XP base | XP ★máx |
|---|---|---|---|---|---|---|---|
| 🐟  Pez común | Orilla | Lombriz | 15 min | 5,0 | 1-2 | 5 | 10 |
| 🦐  Camarón de río | Orilla | Lombriz | 15 min | 5,0 | 1-2 | 5 | 10 |
| 🐠  Carpa dorada | Orilla | Lombriz | 15 min | 5,0 | 1-3 | 5 | 17,5 |
| 🐍  Anguila | Fondo · noche | Lombriz | 15 min | 5,0 | 2-3 | 5 | 17,5 |
| 🦑  Calamar | Fondo · noche | Señuelo | 15 min | 5,0 | 2-4 | 5 | 30 |
| 🦋  Pez mariposa | Superficie | Grillo | 30 min | 10,0 | 1-3 | 10 | 35 |
| 🐡  Pez volador | Superficie | Grillo | 30 min | 10,0 | 2-4 | 10 | 60 |
| 🗡️  Pez espada | Coloso | 2 Cebo camarón | 45 min | 15,0 | 3-5 | 15 | 150 |
| 🔨  Tiburón martillo | Coloso | 2 Calamar | 60 min | 20,0 | 4-5 | 20 | 200 |

Lectura de diseño: los números de plata son chicos, y es a propósito

El tiburón martillo paga 20 de plata — una hora de granja. No es un premio gordo y no debe serlo. El GDD ya fijó esta postura con los logros (≈965 de plata repartibles en toda una partida de ~250.000): condimento, no impresora.

Donde sí pesa el martillo es en la otra columna: 200 de XP de Pesca, contra los 5 de una carpa. Eso es el 6 % de toda la escalera de Pesca en una sola pelea. Si algún día el martillo empieza a ser la mejor forma de hacer plata, el sistema está roto, no exitoso. Si empieza a ser la mejor forma de subir Pesca, está funcionando.

La regla del primer escalón, cumplida

El pez común con lombriz en la orilla y caña de junco está disponible en el minuto uno, sin nivel, sin receta y sin crafteo. Un oficio cuyo primer escalón esté cerrado es un oficio que el jugador nunca empieza.

6. Lo que hace que cada pez se sienta distinto

Cada familia cambia UNA sola regla del carrete que ya existe. No hay siete minijuegos: hay uno con siete variaciones, y cada variación se explica en una frase.


| Especie | La regla que cambia |
|---|---|
| Orilla | El carrete de siempre. Es el escalón que enseña el sistema. |
| 🦐  Camarón | No pelea. Mordisquea tres veces y hay que clavar en el tercero. |
| 🦋  Pez mariposa | Nada en onda lenta y perfectamente predecible. No se reacciona: se anticipa. |
| 🐡  Pez volador | Se va de la barra. Salta dos veces; en el aire apretar no hace nada y hay que dejar la zona esperando donde va a caer. Con viento salta tres veces. |
| 🦑  Calamar | Tira tinta sobre TU ZONA. Seguís viendo al calamar; lo que no ves es dónde quedó tu zona de captura. Dos veces por pelea. |
| 🗡️  Pez espada | Tres sprints explosivos con descansos largos. La pelea se gana en los huecos, no en las corridas. |
| 🔨  Tiburón martillo | La barra mide el doble, nunca se cansa, y te gasta la caña durante la pelea. Es la única pelea contra un reloj propio. |

La corrección de la revisión 2: la tinta va sobre la zona

En la revisión 1 la tinta apagaba la barra entera. Eso no mide habilidad: mide si tuviste suerte con dónde estaba el pez cuando se apagó — frustración disfrazada de dificultad, del tipo que la regla 9 detesta. Apagando la ZONA en cambio, el jugador ve todo lo que necesita para decidir y solo pierde de vista su propio control. Ahora sí mide algo real: memoria de lo que uno mismo estaba haciendo. Y es igual de espectacular en pantalla.

7. Las trampas: la trampa no te da el pez, te da la CITA

Toda trampa de todo juego de pesca tiene el mismo problema: si la trampa pesca sola, el minijuego sobra, y el jugador óptimo deja de jugar la parte divertida.

El palangre no saca el tiburón. Lo ENGANCHA. Volvés a las doce horas y hay una señal de 5★ esperándote, con el pez ya clavado. La pelea la das vos.

Eso convierte la ausencia en una cita, no en un ingreso pasivo. Toda la plata sigue pasando por el carrete y el ancla no se mueve.

7.1 Los estados y el amarre


| Estado | Boya | Qué significa |
|---|---|---|
| Guardada | — | Está en el cobertizo. Tiene usos restantes. |
| Calando | quieta | Corre su reloj. Falta. |
| Cabeceando | se mueve | Hay algo. Vení. |
| Soltada | de costado | Se venció la ventana. Perdiste el cebo. |

La trampa se cala en un amarre, que es una celda de la orilla como cualquier otra: así la ocupación la resuelve la regla que ya existe —cada celda sabe qué la ocupa, única autoridad— en vez de un contador nuevo que después se desincroniza.

Cuántos amarres: Pesca 3 → 1 · Pesca 7 → 2 · Pesca 12 → 3.

Tres amarres, como las tres bocas del Horno. No es pereza: el jugador ya aprendió que « tres cosas en paralelo » es la forma que tiene este juego de dejarte trabajar mientras no estás. Repetir la forma cuesta cero y se entiende sin tutorial.

7.2 Las tres trampas


| Trampa | Pesca | Coste | Usos | Cala | Ventana | Entrega |
|---|---|---|---|---|---|---|
| 🧺  Nasa de camarones | 3 | 4 Madera + 2 Piedra | 20 | 4 h | +4 h | 3-5 Cebo de camarón |
| 🕸️  Red de superficie | 7 | 6 Tablón + 2 Madera | 15 | 6 h | +6 h | 1 cita Superficie 2-3★ |
| ⚓  Palangre de fondo | 12 | 1 Barra hierro + 8 Tablón | 10 | 12 h | +12 h | 1 cita Coloso 4-5★ |

Todo sale de materiales que ya existen: cero ítems nuevos. Y ninguna cuesta plata, igual que el hacha y el pico: la trampa se paga con reloj de nodo, que es el pilar 1.

La nasa entrega producto, y por qué es la excepción

La nasa no da cita: da cebo de camarón, un ítem que solo sirve como carnada y no se puede vender. Dos razones, y la segunda es la que manda:

Obligar a pelear cinco camarones de 1★ no es contenido, es peaje. La materia prima tiene que fluir.

Si la nasa diera camarones vendibles tendríamos una máquina de plata pasiva: cuatro horas, cero atención, repetible. Es la forma de la impresora que se cerró el 21/8 con los platos apilables. Cortarlo con el tipo de ítem es más barato que balancearlo.

El palangre nunca sale vacío

Nunca. Doce horas que terminan en « no había nada » es un castigo sin causa, no diagnosticable, y el jugador no vuelve a cebar. Lo que varía no es *si* engancha, sino *qué*: 2 cebos de camarón → pez espada; 2 calamares → tiburón martillo. La misma regla de siempre — el cebo elige la especie, no la suerte.

El palangre no engancha lo que no podés pelear

Regla 3 de la casa, donde más duele: la estrella de la cita queda topeada por la mejor caña que tengas. Con caña de hierro (4★) el palangre engancha un martillo de 4★, nunca de 5. La alternativa es que el jugador espere doce horas, venga corriendo, y el hilo se corte en el primer segundo por una razón que existía antes de que cebara. Eso no parece un fallo: parece que el juego se burla.

7.3 Los casos borde


| Caso | Qué pasa | De dónde sale la regla |
|---|---|---|
| Levantar antes de tiempo | Devuelve trampa y cebo. Solo se pierde el calado. | El lance fallado: el error cuesta tiempo, no material |
| F5 durante la ventana | No la resucita ni la reinicia. Se consume una vez. | El nodo virgen del 22/8 |
| Bolsa llena al cobrar | El pez espera en la boya en vez de perderse. | El Horno del 24/8 |
| Se vence peleando | La ventana no vence durante la pelea. El reloj se congela al clavar. | Nueva, y no negociable |

El último es el único sin precedente y por eso va en negrita: perder un martillo de 5★ porque el timer venció en el segundo 40 de la pelea sería el peor momento del juego, y pasaría una vez cada mil — justo la frecuencia con la que uno se olvida de arreglarlo.

7.4 La lectura: tres capas y tres avisos

Al cargar la partida — « 🎣 El palangre cabecea. Te quedan 7 h 20 para cobrarlo. » Mismo gesto que el parte de la doma. El que entra dos minutos tiene que enterarse antes de decidir qué hace con esos dos minutos.

Desde la granja — el amarre está en el mapa: la boya cabeceando se ve con su `¡!` flotante. Nada de menús.

En la boya — con el cursor encima, la chapa dice especie, estrellas y tiempo restante.

Y los tres avisos de la ventana: se abre (la boya arranca a cabecear) · última llamada (al 10 % restante cabecea fuerte y en rojo, y el aviso interrumpe — el único momento del juego donde interrumpir está justificado) · se soltó (« El martillo se soltó. Perdiste los 2 calamares », con lo perdido nombrado).

Ese último es el que todos los juegos se saltean. Una trampa que se vacía en silencio entrena al jugador a no confiar en el sistema, y a partir de ahí no lo usa más. El aviso duele, y tiene que doler: es lo que hace que la próxima vez vuelva a tiempo.

7.5 Los números, y la comprobación del ancla

Un palangre entrega una cita cada 12 horas. El martillo paga 20 de plata y se cobra alrededor del 55 % de las veces (viene cansado: arranca con el 25 % del progreso lleno, que es la compensación por la espera).


|  | Plata/h añadida | % de una celda de granja |
|---|---|---|
| 🧺  Nasa | 0 — el cebo no es vendible | 0 % |
| 🕸️  Red | 1,7 | 8,5 % |
| ⚓  Palangre | 0,9 | 4,5 % |
| Los tres a la vez | 2,6 | 13 % |

Las trampas no son economía: son contenido. Están en el mismo orden de magnitud que los logros (≈965 de plata en toda una partida de 250.000). Un jugador que juegue las trampas perfecto durante un mes entero gana menos que teniendo una parcela más de brócoli.

Y eso es exactamente lo que queremos, porque significa que el palangre no compite con la caña: la alimenta. Nadie va a dejar de pescar para poner trampas. Las va a poner *para tener con qué pescar cuando vuelva.*

El 25 % de progreso inicial es la única palanca del sistema y está en un solo lugar: es lo que hace que doce horas de espera se sientan pagadas. Si mañana el palangre queda flojo o fuerte, no se toca el precio ni las estrellas ni la ventana. Se toca el cansancio.

8. La memoria de la laguna

Nuevo en la revisión 2, y es lo mejor de esta tanda.

La laguna lleva un contador por familia de lo que le sacaste. Si pescás camarones toda la semana, los camarones escasean — y los grandes se mudan ahí, porque se les fue la comida. Las señales de orilla bajan y las de coloso suben. Dejás de pescarlos una semana y el agua vuelve sola al equilibrio.


| Presión sobre una familia | Qué le pasa a sus señales | Qué le pasa a los colosos |
|---|---|---|
| Baja (descansada) | Abundantes | Raros |
| Media | Normales | Normales |
| Alta (semanas encima) | Escasas | Frecuentes |

Es un número por familia, guardado con la partida. No es un sistema: es un contador. Se recupera solo con el tiempo, como todo lo demás en este juego.

Empuja variedad sin una misión que te lo pida. El juego no te dice « pescá otra cosa »: el agua te lo hace notar.

Le da a la laguna algo que ningún otro nodo tiene: memoria. El árbol de hoy es idéntico al de hace un mes. La laguna, no.

Y cierra solo el bucle del coloso: para que aparezca el martillo hay que haber vaciado la orilla antes. La cadena de tiempo deja de ser una receta escrita y pasa a ser una consecuencia.

Lo que hay que vigilar: la presión no puede llegar nunca a cerrar una familia del todo, porque eso rompería la regla del primer escalón — el jugador que solo pesca en la orilla no puede quedarse sin orilla. El piso es « escasas », nunca « ninguna ».

9. La escama del que se fue

Nuevo en la revisión 2. Hoy, cortar el hilo te deja nada. Doce horas de palangre y un cero.

El pez que se escapa deja su escama. Sabés qué era y cuántas estrellas tenía, y la lámina del álbum lo marca como « visto, no cobrado »: la silueta se ilumina pero queda en gris. Tres escamas de una especie se cambian en la Lonja por un intento garantizado contra ella.

El fracaso deja de ser un cero y pasa a ser progreso lento. Es el arreglo más barato de toda la propuesta —un contador y un estado de lámina— y es el que más se va a sentir, porque actúa exactamente en el peor momento que puede tener un jugador en este sistema.

10. El clima: no cambia cuánto se pesca, cambia qué se pesca

La consigna fue « que afecte un poco ». La traducción de diseño es: ningún clima puede bajar el rendimiento por hora. Todos mueven el catálogo, ninguno mueve el ancla. Un día de mal tiempo tiene que ser un día distinto, no un día peor.

Rota por fecha UTC, determinístico, igual que la oferta del Mercader Goblin: el F5 no lo re-sortea.


| Clima | Qué hace |
|---|---|
| ☀️  Despejado | Base. Todas las familias a su ritmo normal. |
| 🌧️  Lluvia | Pican más rápido (el pique baja a 1,0-2,8 s) y la laguna guarda 5 cargas en vez de 4. |
| 💨  Viento | Superficie al doble. El pez volador salta tres veces. La zona de captura deriva sola. |
| 🌫️  Niebla | Las señales no se ven hasta acercarse — pero el Fondo sube: calamar de día, sin trasnochar. |
| 🌙  Noche | Ya existe (azulada). Calamar y anguila solo acá. Los colosos pican más seguido. |

La regla coprima (revisión 2)

El largo del ciclo de clima tiene que ser coprimo con 7. Si algún día alguien agrega un séptimo clima, el jugador que solo entra los sábados verá el mismo clima para siempre — y el que solo puede jugar los fines de semana queda excluido de media laguna sin que nadie se entere. Con cuatro estados no pasa porque 4 y 7 son coprimos, pero eso hoy es suerte, no diseño. Un test de dos líneas lo convierte en decisión.

El día de niebla es el mejor ejemplo de la regla general: es el único día en que se puede pescar calamar sin quedarse despierto. Eso es un motivo para entrar, no un impuesto por haber entrado el día equivocado.

11. La Lonja: un solo escalón

La revisión 1 le daba cuatro escalones propios al muelle. Sumados a los cuatro del tablón de pedidos, eso son ocho ventanas vencibles a la vez: no es un juego de granja relajado, es una lista de tareas — y choca de frente con el pilar 4.

La Lonja se queda con un solo escalón propio: el pedido de marea. Todo el resto se mete como TEMAS del tablón que ya existe — el Torneo de Pesca ya es uno de los cinco temas rotativos del fin de semana. Cero paneles nuevos, cero relojes nuevos.


| Escalón | Refresco | Ventana | Qué pide | Paga |
|---|---|---|---|---|
| 🌊  Pedido de marea ×3 | cada 6 h (00/06/12/18 UTC) | 6 h | 1-2 peces de una familia que ya pescás | 10 % del día de laguna, en 🐚 Escamas |
| 🎣  Temas del tablón | el tablón de siempre | la de cada escalón | Lo que pida el tema de la semana | La vara del tablón |

La regla dura, la misma de la misión de evento: la Lonja solo pide lo que el jugador ya puede pescar. Si no tenés la caña de 4★, el pedido de pez espada no aparece; pasa al siguiente. Un pedido imposible no frustra: enseña que el tablón miente, y a partir de ahí el jugador deja de leerlo.

Los vales: 🐚 Escamas

Compran lo que la plata no compra, para que el sistema tenga profundidad sin imprimir un solo silver:

Partes de caña (el paso previo a cada caña nueva).

La boya de corcho: +50 % de ventana en las trampas. No cambia un solo número de la economía y es exactamente lo que necesita el jugador con horarios raros — que la accesibilidad se compre con la moneda que no imprime plata es la forma limpia de resolverla.

El intento garantizado a cambio de 3 escamas de una especie.

El marco dorado del álbum, para la especie que tengas en ★máx.

12. La estrella llega a la Cocina

Nuevo en la revisión 2. Con nueve especies, el recetario que dice « 1 pez común » y « 1 pez raro » queda viejo y hay que re-sincronizarlo con la misma auditoría del 22/8. Pero ahí hay además una oportunidad:

La estrella no hace el plato más fuerte: lo hace más largo.

Un Pescado Asado de 1★ da +10 % al precio de venta durante sus 30 minutos de siempre. El mismo plato hecho con un pez de 5★ da el mismo +10 %, el triple de tiempo.

Respeta la regla del 21/8 de que los efectos de precio no se apilan — vale el mejor plato activo, y comer otro renueva la ventana.

No toca ningún tope de ningún efecto: el número del bono es idéntico.

Y le da al coloso una tercera razón de existir que no es plata ni colección: conveniencia.

Regla que hay que vigilar con test, igual que la de los cultivos: ninguna receta pide un pez de nivel de Pesca mayor que el nivel de Cocina de la propia receta.

13. La escalera de Pesca y el álbum

Pesca es hoy uno de los oficios sin escalera y por eso no tiene techo. Con este contenido lo merece, y el techo se deriva del contenido como en todos los demás: Pesca 20.


| Nivel | Qué se abre |
|---|---|
| 1 | Caña de junco · lombriz · familia Orilla — el primer escalón, abierto |
| 3 | Nasa de camarones · primer amarre |
| 5 | Grillo en el montículo · familia Superficie |
| 7 | Caña de roble (3★) · Red de superficie · segundo amarre |
| 9 | Señuelo de nácar · Calamar |
| 12 | Caña de hierro (4★) · Palangre de fondo · tercer amarre |
| 15 | Pez espada |
| 18 | Caña del Abuelo (5★) |
| 20 | Tiburón martillo · techo |

El ritmo de XP no cambia: sigue XP para el nivel N = 21 × ritmo × N^1,7, con el ritmo de Pesca que ya está en la tabla (68 al nivel 2, 3.420 al nivel 20). Como el techo pasa a existir, la XP acumulada por debajo se conserva.

Regla de salud, ampliada: el GDD ya pide que Cultivo, Tala y Minería queden cerca entre sí en la partida real. Con la v3, Pesca entra en ese grupo — y ahora más que antes, porque la estrella paga XP. Si Pesca se dispara, el jugador llega al palangre antes que a la caña de hierro y se encuentra citas que no puede pelear. El simulador tiene que empezar a mirar los cuatro.

El álbum, con estrellas

Cada lámina guarda tu estrella máxima en una fila de cinco. Deja de ser « lo tenés / no lo tenés » y pasa a ser « cuánto lo dominás ».

Cero bytes nuevos: se deriva de un contador de máximo por especie. No se puede perder con un guardado.

Las partidas viejas abren el álbum ya medio lleno.

La escama agrega el estado intermedio: « visto, no cobrado », la silueta iluminada en gris.

Completar las nueve especies en ★máx = Maestro de la Laguna, lámina propia.

Si los logros premian volumen y el álbum premia variedad, la fila de estrellas agrega el tercer eje: profundidad. Es el que hace que un jugador vuelva a pescar una carpa que ya tiene.

14. El plan de entrega: tres tandas, no un sistema de golpe

Este es el capítulo que la revisión 1 no tenía, y probablemente el más importante de todos. El historial del proyecto está lleno de cicatrices de cosas que entraron juntas y rompieron algo: el Horno, las parcelas fantasma, las siete recetas desincronizadas. Nada de esto tiene que entrar de una sola vez.

Tanda 1 — El agua se lee  ·  (capítulos 1, 2, 4, 5 parcial, 9)

Señales al llegar · lombriz y grillo en el montículo · las 5 estrellas con plata plana y XP escalada · cuatro especies (pez común, carpa dorada, pez mariposa, calamar) · la escama del que se fue.

Por qué esta primero: es la que cambia la sensación del sistema entero sin agregar un solo reloj nuevo. Si esto no divierte, nada de lo que sigue lo va a salvar — y nos enteramos con una semana de trabajo, no con dos meses.

Tanda 2 — El agua se acuerda  ·  (capítulos 3, 7 parcial, 8, 13)

Las cañas con límite en estrellas · la nasa sola (todavía sin red ni palangre) · la memoria de la laguna · la escalera de Pesca con su techo · el álbum con estrellas.

Por qué la nasa sola: es la que tiene el rol más claro (fábrica de cebo) y la que menos piezas nuevas pide. Si la gente no cala nasas, el palangre no se construye — nos ahorramos los cuatro estados, el arte de boya y los cuatro archivos de test de un sistema que nadie iba a usar.

Tanda 3 — Los colosos  ·  (capítulos 6, 7 completo, 10, 11, 12)

Las siete variaciones del carrete · red y palangre con sus citas · pez volador, anguila, pez espada y tiburón martillo · el clima · el pedido de marea · la estrella en la Cocina.

Por qué al final: es todo contenido que cuelga de las dos tandas anteriores. Ninguna pieza de acá tiene sentido si las señales no funcionan o si nadie subió Pesca hasta 12.

Y el criterio para pasar de una tanda a la siguiente no es que esté terminada: es que esté MEDIDA. El simulador tiene que decir qué le hizo cada tanda a la partida a granja 21 antes de que empiece la que sigue. La escalera de dos carriles del 22/8 movió la partida de 49 a 63 días y se supo el mismo día. Eso es lo que hay que repetir.

15. Lo que queda abierto

El pez cansado, ¿se muestra o no? El 25 % de progreso inicial del palangre se puede mostrar (la barra arranca cuarto llena y el jugador entiende que la espera valió) o esconder (arranca en cero pero avanza más rápido). Recomiendo mostrarlo: es la prueba visible de que las doce horas hicieron algo, y este juego tiene una regla sobre las cosas que pasan en silencio.

El pez único con nombre. Un 5★ irrepetible por granja, atado a las Cartas del Abuelo — « la Vieja del Fondo ». Encaja con el lore y con el álbum, pero pide decidir si se pesca una sola vez o si reaparece.

Arte. Nueve especies × cinco tallas no son 45 sprites: son 9 sprites con escala y un marco de estrellas. Conviene fijarlo por escrito antes de pedirle nada a Suren.

El techo de la presión. Cuánto puede caer una familia antes de tocar el piso de « escasas » es la única cifra de la memoria de la laguna que no está derivada de nada. Hay que sacarla del simulador, no del ojo.

Cómo verificar lo que dice este documento


| Herramienta | Qué comprueba |
|---|---|
| test-pesca-ancla.js | Que cada especie pague su precio plano y que la hora de laguna cierre en 20 de plata, pesques lo que pesques. |
| test-pesca-estrella.js | Que la estrella NO toque el precio en ninguna fila, y que sí escale la XP con los multiplicadores de la tabla. |
| test-pesca-senales.js | Que las señales se generen al llegar, una por carga, y que el F5 no las re-sortee. |
| test-pesca-carnada.js | Que ninguna especie pueda picar sin su carnada, y que el aviso nombre la que falta. |
| test-pesca-cana.js | Que la caña se elija sola, que sea la más barata que aguante, y que el corte de hilo no cobre plata (pero sí deje escama). |
| test-trampa-ventana.js | Que la cita venza de verdad, que el F5 no la resucite, que no venza durante la pelea y que la boya diga los cuatro estados. |
| test-trampa-cana.js | Que el palangre jamás enganche por encima de la mejor caña del jugador, y que nunca resuelva en vacío. |
| test-laguna-memoria.js | Que la presión se recupere sola y que ninguna familia baje del piso de « escasas ». |
| test-clima-coprimo.js | Que el largo del ciclo de clima sea coprimo con 7. |
| test-lonja-posible.js | Que la Lonja jamás pida una especie que el jugador no puede pescar hoy. |

Ninguna cifra de este documento está puesta a ojo. Si alguna no se puede explicar desde el ancla, es un error, no una decisión.

---

# OBSERVACIONES DE MEDICIÓN (25/8)

*El documento pide, al final, que ninguna cifra esté puesta a ojo. Se midieron todas contra el
código en ejecución. Esto es lo que salió — el texto de arriba queda intacto.*

## Lo que cierra

**El ancla, exacta en las nueve especies.** `precio = minutos de cadena ÷ 60 × 20` da 5,0 · 5,0 ·
5,0 · 5,0 · 5,0 · 10,0 · 10,0 · 15,0 · 20,0. Las nueve filas cierran sin redondeos ni excepciones.

**La escalera de XP por estrella es coherente consigo misma.** Cada « XP ★máx » de la tabla del
capítulo 5 es exactamente la XP base por el multiplicador de la estrella más alta de esa especie.

## Lo que NO cierra, y hay que decidir antes de escribir código

**1 · « El 6 % de toda la escalera de Pesca en una sola pelea » — medido, es el 0,74 %.**

La escalera completa hasta Pesca 20 pide **27.044 de XP acumulada**, no 3.420. El 3.420 es lo que
pide el ÚLTIMO nivel, no la suma. Los 200 de XP del tiburón martillo son el 0,74 % del total.

Esto importa porque el 6 % es el argumento central del capítulo 4: *« la estrella no te hace más
rico, te hace mejor pescador »*. Con 0,74 % la frase sigue siendo cierta pero mucho más floja —
harían falta unas 135 peleas de martillo para subir Pesca de 19 a 20.

Hay dos salidas y son decisiones de dirección, no de programación:

  - **Subir la XP de los colosos.** Para que el martillo valga el 6 % haría falta que diera ~1.600
    de XP, o sea multiplicadores mucho más altos que los de la tabla. El propio documento ya
    señala dónde está la palanca (« la cifra a mover es el multiplicador de XP »), así que el
    sistema aguanta el cambio sin tocar un centavo de la economía.
  - **Dejar los números y corregir la frase.** Los 200 de XP igual son 40 veces lo que da una
    carpa; el coloso sigue siendo la mejor forma de subir Pesca, solo que no salta niveles.

**2 · La XP de los colosos va 3,3 veces por encima del ritmo del oficio, y el propio documento
avisa del riesgo.**

El ritmo de Pesca está calibrado en el código como « una hora de laguna » = **60 de XP/hora**. El
martillo da 200 por una cadena de 60 minutos: 3,3 veces el ritmo. El capítulo 13 pide justamente
que Pesca no se dispare respecto de Cultivo, Tala y Minería, « porque el jugador llega al palangre
antes que a la caña de hierro y se encuentra citas que no puede pelear ». Con este multiplicador,
eso no es un riesgo: es el resultado esperado. Hay que medirlo en el simulador antes de la tanda 2,
que es donde entra la escalera.

**3 · Dos cosas distintas se llaman « camarón ».**

El capítulo 5 tiene un **Camarón de río** que se pesca con lombriz y se vende a 5. El capítulo 7
tiene un **Cebo de camarón** que sale de la nasa y NO se puede vender — y esa imposibilidad de
venderlo es justamente lo que evita la impresora de plata pasiva. Son dos ítems con el mismo
nombre en la bolsa del jugador, y el que confunda uno con otro va a creer que el juego le robó.
Conviene renombrar uno de los dos antes de que exista.

**4 · La lombriz se compra en la tienda a 3 de plata, y eso desarma un argumento del capítulo 2.**

El documento dice que el pez mariposa y el pez volador valen el doble « porque su cadena se come
una lombriz que no cavaste ». Pero hoy `WORM_PRICE = 3`: la lombriz se compra. Mientras se pueda
comprar, el coste real de esa cadena no son los tres montículos del día, son 3 de plata — y la
escasez que sostiene el argumento no existe. O el grillo también se vende (y entonces el coste se
empareja), o la lombriz sale de la tienda (y entonces hay que mirar qué le pasa al primer escalón,
que hoy depende de poder comprar carnada).

## Lo que conviene hacer primero

La tanda 1 del capítulo 14 es el orden correcto y no depende de ninguna de las cuatro
observaciones salvo la primera, que solo cambia una cifra. Las otras tres pegan en la tanda 2 y en
la 3, así que hay tiempo — pero conviene cerrarlas ahora, mientras el código todavía no las tiene
escritas en ningún lado.

---

# TANDA 1 · LO QUE YA ESTÁ EN EL CÓDIGO (25/8)

*Corregido el mismo día, a partir de una pregunta de dirección — « ¿en qué parte del documento
se dice que hay que preguntar si grillo o lombriz? ». Estaba en el capítulo 2, pero yo me había
salteado la escalera del capítulo 13: el grillo y la familia Superficie abren en PESCA 5. Sin
esa puerta, el juego le cobraba al jugador nuevo una pregunta por cada montículo para darle una
carnada que no tenía dónde usar, y le enseñaba señales que no podía pescar. Una elección de una
sola opción no es una elección: es un peaje.*

*El núcleo de lógica de la tanda 1, con su medidor: `tools/test-pesca-v3.js`. Falta la
interfaz — las señales todavía no se dibujan en el agua —, así que esto no se juega
todavía; pero cada regla de abajo ya está escrita y verificada.*

  - **Las cuatro especies**, con el precio DERIVADO de su cadena (`especiePrecio`): pez común
    5 · carpa dorada 5 · pez mariposa 10 · calamar 5. No hay tabla de precios que se pueda
    desfasar del ancla, porque no hay tabla: hay una fórmula.

  - **Las cinco estrellas**, con la plata plana y la XP escalada (`especieXp`).

  - **Las señales al llegar** (`pescaCargas`, `pescaSenales`): la laguna guarda hasta 4 lances y
    reparte una señal por cada uno. Viajan en el guardado y el F5 no las re-sortea.

  - **La carnada elige la familia** (`pescaPuedeSenal`), y el aviso nombra la que falta.

  - **El montículo es una elección**: lombriz o grillo — pero SOLO desde Pesca 5, que es donde
    el capítulo 13 abre la familia Superficie. Antes de eso cava lombriz directo y sin
    preguntar. El grillo existe como ítem de bolsa, con nombre y emoji propios — sin pedirle
    arte nueva a nadie.

  - **Y el agua respeta la escalera**: una señal solo puede ser de una familia ABIERTA. El
    jugador del minuto uno ve cuatro señales de orilla, no cuatro peces que no puede pescar.

  - **La escama del que se fue** (`pescaPerdido`): el hilo cortado deja escama y marca la lámina
    como « visto, no cobrado ».

## La corrección que salió de medir: la XP base es la cadena en minutos

La tabla del capítulo 5 traía la XP escrita a mano — 5 · 5 · 10 · 15 · 20. Medida contra la
escalera real del oficio, esos números dejaban **Pesca 20 a 451 días** para un jugador de orilla,
y a 1.352 si pescaba a estrella baja. Un techo decorativo: nadie lo alcanza.

La causa no era el tiburón martillo, que era el otro sospechoso. Era que la tabla entera iba a un
tercio del ritmo con el que el código calibra el oficio. Ese ritmo ya existe y está escrito:
« una hora de laguna » = 4 lances de 15 min × 15 de XP = **60 de XP/hora**.

De ahí sale la regla, que es la misma forma que la del precio y por eso no hay dos tablas que
desincronizar: **la XP base de una especie es su cadena en minutos.** Pez común 15 → 15. Mariposa
30 → 30. Y el pez espada y el tiburón martillo de la tanda 3 caen solos en 45 y 60, sin que nadie
los escriba. Medido después del cambio:

| Cómo juega | XP/día (3 visitas, laguna a tope) | Días hasta Pesca 20 |
|---|---|---|
| Solo orilla, estrellas bajas | 60 | 451 |
| Orilla a estrella máxima | 210 | 129 |
| Calamar a estrella máxima | 360 | 75 |
| Superficie a estrella máxima | 420 | 64 |

Y ahí se ve que el sistema hace lo que el documento quería: **la estrella es lo único que puede
hacer que Pesca corra por encima de su ritmo.** El que se conforma con la orilla tarda; el que se
la juega, llega. Con la tanda 3 y sus colosos, esos días bajan solos.

*Queda anotado para cuando entre la tanda 3: con esta regla el tiburón martillo daría 60 de XP
base y 600 a 5★ — el 2,2 % de la escalera en una sola pelea, no el 6 % que decía el documento ni
el 0,74 % que daban sus números. Si dirección quiere el 6 %, la palanca sigue siendo una sola y
está en un solo lugar.*
