**GOLDEN FARM**

Documento de Diseño de Juego

*Estado real del código · 22 de agosto de 2026 · revisión 3*

*Novedades de esta revisión: las CARGAS de los nodos (el árbol guarda hasta 4 talados; la partida cobra el doble del ancla), la picada de mineral a rendimiento 2, la expansión 3 sin muro y los edificios tardíos abaratados, el establo que crece un lugar por nivel de Ganadería, el techo de oficios derivado del contenido, y el PORTERO del guardado en producción (bitácora + puerta vieja sellada).*

Para el equipo de diseño

*Todas las cifras de este documento están extraídas del código en ejecución,*

*no transcritas a mano. Ninguna es una aspiración: todas son lo que el juego hace hoy.*

**Índice**

> **1.** Qué es Golden Farm
> 
> **2.** El ancla: 20 de plata por hora
> 
> **3.** Cultivos
> 
> **4.** Nodos: tala, minería y pesca
> 
> **5.** Oficios y experiencia
> 
> **6.** La granja y sus expansiones
> 
> **7.** Edificios
> 
> **8.** Ganadería
> 
> **9.** Combate: la Zona Negra
> 
> **10.** Cocina
> 
> **11.** Tutorial
> 
> **12.** La partida medida
> 
> **13.** Lo que está abierto
> 
> **14.** Reglas de la casa
> 
> **15.** Cómo verificar lo que dice este documento

**1. Qué es Golden Farm**

Golden Farm es un juego de granja por navegador, en pixel art y vista cenital, construido sobre Phaser 3. El jugador hereda un claro cercado, tres parcelas de tierra y un baúl con herramientas, y a partir de ahí decide en qué convierte su terreno.

No es un juego de reflejos ni de sesiones largas. Es un juego de RELOJES: se planta, se cierra la pestaña, se vuelve. Está medido para que una visita útil dure entre uno y tres minutos, y para que entrar tres veces al día sea una forma legítima de jugarlo — no una versión pobre de jugarlo bien.

**1.1 Los cuatro pilares**

  - El tiempo es el recurso, no la habilidad. Nada se gana pulsando más rápido. Todo se gana eligiendo qué reloj poner a correr antes de irte.

  - Cada número cuelga de una fórmula. No hay cifras puestas a ojo: hay un ancla y todo lo demás se deriva de ella. Si un número no se puede explicar desde el ancla, es un error, no una decisión.

  - La granja es tuya y se nota. Todo lo que hay dentro de la cerca se puede mover. Los edificios llegan como planos y los coloca el jugador donde quiere.

  - Entrar poco no te castiga. Los cultivos rinden lo mismo por hora sea cual sea su duración, así que el jugador elige el cultivo que dura lo que dura su ausencia y no pierde nada.

**1.2 El bucle**

Comprar semilla → plantar → esperar el reloj → cosechar → vender → comprar mejor semilla. Ese es el bucle base, y se aprende entero en los cinco primeros pasos del tutorial.

Alrededor de ese eje hay cinco oficios más que se alimentan del mismo tiempo muerto: la Tala y la Minería (nodos con enfriamiento largo), la Pesca (la laguna), la Ganadería (animales que producen mientras no estás) y la Cocina (que convierte lo que sacaste en comida con efectos). El combate en la Zona Negra es la única fuente de carne y de piezas de armadura.

**2. El ancla: 20 de plata por hora**

Esta es la decisión de diseño más importante del proyecto y conviene que el diseñador la tenga presente antes de tocar cualquier tabla.

> *Una celda productiva de la granja rinde 20 de plata por hora. Todo lo demás se deriva de eso.*

De ahí sale el precio sombra, que es la regla que fija cuánto puede valer cualquier cosa del juego:

**valor = horas de reloj × 20 + coste de la herramienta**

Consecuencias prácticas, y todas están aplicadas en el código:

  - Los trece cultivos rinden EXACTAMENTE 20 de plata por hora, del primero al último. La papa de 3 minutos y el maíz de 24 horas pagan lo mismo por hora.

  - Lo que cambia con el nivel no es la rentabilidad por hora: es cuánto tiempo podés dejar corriendo sin volver, y cuánta XP te da.

  - Un árbol de 30 minutos y una roca de 40 minutos pagan lo mismo por hora que una parcela, menos el coste del hacha o el pico.

  - Un edificio, una expansión o un animal cuestan lo que la granja produce en el tiempo que se tarda razonablemente en pagarlo.

**2.1 El bono del Granero**

El nivel de granja da +1,5 % al PRECIO DE VENTA por nivel (acumulativo, sin redondear). Al nivel 50 el multiplicador es ×1,735, o sea que el ancla real pasa de 20 a 34,7 de plata por hora.

Esto fue un cambio deliberado del 18/8 y es importante no revertirlo por error: antes el bono multiplicaba la CANTIDAD cosechada, y como todos los cultivos dan 1 unidad, redondear(1 × 1,435) seguía siendo 1. El bono era invisible durante treinta y tres niveles y en el treinta y cuatro saltaba a 2 de golpe — la parcela pasaba de 20 a 40 de plata por hora de un tirón. Como bono de precio se nota desde el primer nivel y no tiene escalones.

Efecto secundario que hay que conocer: los precios por unidad llevan decimales (2,44 · 6,3 · 25,45). El redondeo se aplica UNA sola vez, al total de la venta. Redondear por unidad reintroduce el fallo anterior.

**3. Cultivos**

Trece cultivos, todos anclados. La columna « plata/h » es la prueba de que la tabla es coherente: tiene que ser 20 en todas las filas.

| **Cultivo** | **Nivel** | **Semilla** | **Minutos** | **Precio** | **Gana** | **Plata/h** | **XP** |
| ----------- | --------- | ----------- | ----------- | ---------- | -------- | ----------- | ------ |
| Papa        | 1         | 1           | 3           | 2          | 1        | 20          | 10     |
| Ciruela     | 2         | 2           | 6           | 4          | 2        | 20          | 20     |
| Cereza      | 3         | 2           | 9           | 5          | 3        | 20          | 30     |
| Remolacha   | 4         | 3           | 12          | 7          | 4        | 20          | 40     |
| Zanahoria   | 5         | 3           | 15          | 8          | 5        | 20          | 50     |
| Cebolla     | 6         | 6           | 30          | 16         | 10       | 20          | 60     |
| Calabacín   | 7         | 10          | 45          | 25         | 15       | 20          | 70     |
| Repollo     | 9         | 20          | 90          | 50         | 30       | 20          | 80     |
| Calabaza    | 10        | 40          | 180         | 100        | 60       | 20          | 90     |
| Brócoli     | 12        | 90          | 360         | 210        | 120      | 20          | 100    |
| Girasol     | 15        | 180         | 600         | 380        | 200      | 20          | 110    |
| Trigo       | 17        | 360         | 960         | 680        | 320      | 20          | 120    |
| Maíz        | 20        | 720         | 1440        | 1200       | 480      | 20          | 130    |

*Lectura de diseño: la escalera no vende « más dinero », vende AUTONOMÍA. La papa obliga a volver en 3 minutos; el maíz aguanta una noche entera. Lo que el jugador compra al subir de nivel es el derecho a desaparecer más tiempo.*

La XP sí crece con el escalón (de 10 a 130 por cosecha), y ahí está el incentivo real para pasar a cultivos largos: no dan más plata por hora, dan más XP por hora si estás lejos.

**4. Nodos: tala, minería y pesca**

**Relojes**

  - Árbol: 30 minutos.

  - Roca y veta de mineral: 40 minutos.

  - Laguna: 15 minutos entre lanzamientos.

  - Montículos de tierra: 3 por día, sin herramienta y sin enfriamiento. Dan lombriz, que es la carnada de la pesca.

**Cargas: el nodo pasado no se desperdicia (21/8)**

Un árbol o roca ya crecido acumula 1 carga por cada reloj propio extra que pase sin cosecharse, hasta llenarse con 4. El árbol se llena a las 2 horas de pasado; la roca y la veta de piedra, a las 2 h 40. Y la escalera de golpes se ESTIRA con las cargas: con 1 carga el ciclo es el clásico (entero → primer corte → corte profundo → tocón con su madera); con N cargas, el sprite del primer corte se repite N veces, y cada repetición cobra 1 madera, 1 uso de hacha y su XP — el cierre es siempre el clásico, con la madera final en el tocón. Un árbol lleno son 6 golpes y 4 maderas en una sola secuencia continua; se VE que das cuatro hachazos y cada madera paga su hacha, nada cae de golpe. El que tala cada 30 minutos cobra 1 en 3 golpes, exactamente como antes; el que entra tres veces al día cobra, golpe a golpe, lo que el nodo le guardó. Las vetas de mineral (bronce en adelante) quedan APARTADAS de la mecánica por decisión de dirección (21/8): reloj simple, una picada y a dormir. Cada picada de mineral rinde 2 (el ancla del 18/8: con 1 picar daba pérdida, porque el pico cuesta más de lo que saca).

**La escalera de minerales**

Cada mineral necesita DOS llaves a la vez: un pico de su categoría (que se compra y se gasta) y un nivel de Minería (que se gana practicando). Las dos, y cada una dice lo suyo cuando falta.

| **Mineral** | **Categoría** | **Nivel de Minería** | **Precio** |
| ----------- | ------------- | -------------------- | ---------- |
| Piedra      | 0             | 1                    | 15         |
| Bronce      | 1             | 3                    | 160        |
| Hierro      | 2             | 5                    | 240        |
| Oro         | 3             | 7                    | 280        |
| Diamante    | 4             | 9                    | 360        |
| Netherita   | 5             | 11                   | 480        |

**La regla del primer escalón**

Toda escalera del juego empieza ABIERTA en el nivel 1. La semilla de papa, la piedra, el pez común, la alpaca y la Espada de Madera están disponibles desde el primer minuto. Un oficio cuyo primer escalón esté cerrado es un oficio que el jugador nunca empieza.

**5. Oficios y experiencia**

Hay once oficios y cada acción da XP al SUYO. Talar sube Tala; pescar sube Pesca. Esto suena obvio y no lo era: hasta el 18/8 pescar daba experiencia de Cocina.

Cada oficio con escalera tiene TECHO, y el techo se deriva de su contenido (22/8, dirección: « capear el crecimiento hasta el nivel donde hay contenido; más adelante se libera más »). Hoy: Cultivo 20 (el maíz), Minería 11 (la netherita), Ganadería 19 (el lugar 20 del establo), Cocina 10 (el Banquete del Bosque). La XP nunca deja de acumularse por debajo: cuando se agregue contenido de nivel más alto, el techo sube solo y los veteranos suben en el acto lo que ya ganaron. Los oficios sin escalera (Tala, Pesca, Artesanía y las armas) y la barra de Combate no se capean. La granja tiene su propio techo de siempre: nivel 50.

La XP no mide relojes, mide PRÁCTICA. Un oficio con acciones lentas no puede pedir la misma cantidad que uno con acciones rápidas, así que cada oficio tiene su propio ritmo derivado de la duración real de su acción. La fórmula es la misma para todos:

**XP para el nivel N = 21 × ritmo del oficio × N^1.7**

| **Oficio**      | **Nivel 2** | **Nivel 5** | **Nivel 10** | **Nivel 20** |
| --------------- | ----------- | ----------- | ------------ | ------------ |
| Cultivo         | 682         | 3239        | 10525        | 34196        |
| Minería         | 51          | 243         | 789          | 2565         |
| Tala            | 68          | 324         | 1052         | 3420         |
| Pesca           | 68          | 324         | 1052         | 3420         |
| Ganadería       | 5,66        | 27          | 87           | 284          |
| Cocina          | 68          | 324         | 1052         | 3420         |
| Artesanía       | 68          | 324         | 1052         | 3420         |
| Espada          | 68          | 324         | 1052         | 3420         |
| Hacha (combate) | 68          | 324         | 1052         | 3420         |
| Mazo            | 68          | 324         | 1052         | 3420         |
| Arco            | 68          | 324         | 1052         | 3420         |

*Regla de salud para el diseñador: los tres oficios de recolección (Cultivo, Tala, Minería) tienen que quedar CERCA entre sí en la partida real. Si uno se dispara, su escalera se abre sola mientras las otras dos se quedan atrás y el jugador percibe el juego como desequilibrado sin saber por qué.*

**6. La granja y sus expansiones**

El mundo es una rejilla de celdas de 42 píxeles. La granja inicial es un claro de 15×15 celdas y crece en bloques de 5×5. Hay 16 expansiones y el techo son 60 parcelas.

La cerca es un anillo de UNA celda en los cuatro lados (regla de dirección, 20/8: « el corral solo ocupa los extremos de la grilla »). El interior útil de arranque es un 13×13 simétrico: 169 celdas, y 529 con las dieciséis expansiones. Los objetos apoyados en la primera fila (granero, buzón) se dibujan por delante de la cerca, como corresponde por altura.

Ni los niveles ni los costes de las expansiones están escritos a mano: se derivan de la granja que tenés cuando cada una se abre. Cada expansión trae 25 celdas, un árbol, una roca y una parcela ya arada.

Las expansiones son estrictamente SECUENCIALES: la única que existe — en el mapa y en la tienda — es la siguiente en el orden, y el requisito es doble: el nivel Y haber hecho las anteriores. El lote no se dibuja hasta tener el nivel; con el cursor encima aparece la chapa de EXPANDIR, que muestra el costo y, debajo, lo que trae: « árbol · roca · parcela » (las celdas no se anuncian: se ven al expandir).

| **#** | **Nivel** | **Coste**                                            |
| ------ | --------- | ---------------------------------------------------- |
| 1 | 3 | 6 Madera + 4 Piedra |
| 2 | 5 | 22 Madera + 14 Piedra |
| 3 | 7 | 61 Madera + 40 Piedra |
| 4      | 9         | 77 Madera + 62 Piedra + 8 Bronce                     |
| 5      | 12        | 110 Madera + 88 Piedra + 11 Bronce                   |
| 6      | 15        | 149 Madera + 119 Piedra + 15 Bronce                  |
| 7      | 18        | 193 Madera + 154 Piedra + 10 Bronce + 6 Hierro       |
| 8      | 21        | 242 Madera + 193 Piedra + 12 Bronce + 8 Hierro       |
| 9      | 24        | 295 Madera + 236 Piedra + 15 Bronce + 10 Hierro      |
| 10     | 28        | 354 Madera + 283 Piedra + 12 Hierro + 10 Oro         |
| 11     | 31        | 418 Madera + 334 Piedra + 14 Hierro + 12 Oro         |
| 12     | 35        | 487 Madera + 389 Piedra + 16 Hierro + 14 Oro         |
| 13     | 39        | 560 Madera + 448 Piedra + 16 Oro + 12 Diamante       |
| 14     | 42        | 639 Madera + 511 Piedra + 18 Oro + 14 Diamante       |
| 15     | 46        | 722 Madera + 578 Piedra + 16 Diamante + 12 Netherita |
| 16     | 50        | 810 Madera + 648 Piedra + 18 Diamante + 14 Netherita |

*Las expansiones 1 y 2 están abaratadas a mano (0,7 y 2 horas de granja) por decisión de dirección del 20/8: « abaratar solo la 1 y la 2, hasta que el nivel mande ». De la 3 en adelante manda la curva derivada.*

**Las parcelas: tres caminos y un libro mayor**

Una parcela llega por tres caminos, y cada camino lleva su cuenta — ese libro mayor es lo que hace imposible el bug de « cada F5 me regala una parcela » (cerrado el 20/8):

- **De nacimiento**: 3.

- **Por expansión**: cada bloque entrega la suya YA PUESTA dentro. La entrega queda anotada en una bandera guardada con la partida (expParcelasDadas): una vez entregada no se vuelve a entregar nunca, la muevas a donde la muevas. Los guardados con parcelas fantasma del bug se limpian solos en la primera carga.

- **Compradas en la tienda, con PLATA**: la primera sale 200 (10 horas del ancla) y cada una un 10 % más que la anterior — el precio cuenta SOLO las compradas, así que las regaladas por expansión no lo tocan y el orden comprar/expandir no importa. El botón de compra en $Golden se retiró hasta que el token tenga valor. Las Fichas de parcela del pase también cuentan en el libro.

**Ocupación: una sola verdad**

*Cada celda sabe qué la ocupa, y esa es la ÚNICA autoridad. La usan el colocador de edificios, el sombreado que se ve al llevar algo en la mano, los mensajes de « aquí no entra » y el buscador de caminos. Cuando esta regla se ha duplicado, el resultado siempre ha sido el mismo: celdas bloqueadas sin nada visible encima. Es la clase de fallo que el jugador no puede diagnosticar y que le hace pensar que el juego está roto.*

**7. Edificios**

Ningún edificio viene puesto. Todos llegan como PLANO, el plano se guarda en el Cobertizo y el jugador elige dónde va. Al colocarlo aparece la obra, y la obra se termina depositando materiales.

| **Edificio**      | **Coste**                                                      | **Se abre con**   |
| ----------------- | -------------------------------------------------------------- | ----------------- |
| Herrería          | 2 Piedra + 8 Madera                                            | granja nivel 2    |
| Horno de Piedra   | 4 Piedra + 11 Madera                                           | Minería nivel 3   |
| Cocina            | 6 Piedra + 14 Madera                                           | Cultivo nivel 3   |
| Altar de Runas    | 10 Bloques de piedra + 13 Tablón de madera                     | granja nivel 7    |
| Establo           | 7 Bloques de piedra + 9 Tablón de madera                       | Cultivo nivel 5   |
| Curtiduría        | 14 Bloques de piedra + 17 Tablón de madera                     | Ganadería nivel 4 |
| Altar de Ofrendas | 1 Barra de hierro + 14 Bloques de piedra + 14 Tablón de madera | granja nivel 10   |

**La regla anti-circular**

Un edificio que ABRE un oficio no puede exigir ese oficio para conseguirse. Un edificio que PROCESA lo que produce otro oficio se abre con el oficio que lo alimenta. Por eso la Cocina se abre con Cultivo (que es lo que va a cocinar) y no con Cocina, y el Horno con Minería.

**8. Ganadería**

Los animales se compran con plata, ocupan sitio y producen material cada ciclo mientras el jugador no está. Es el sistema que más se parece a una renta pasiva, y por eso es el que más cuidado necesita.

| **Animal** | **Nivel** | **Precio** | **Material** | **Come**            | **Bruto/h** | **Ciclo (h)** |
| ---------- | --------- | ---------- | ------------ | ------------------- | ----------- | ------------- |
| Alpaca     | 1         | 480        | Fibra        | Trigo               | 25          | 12            |
| Conejo     | 4         | 960        | Pelaje       | Zanahoria o Repollo | 20,3        | 12            |
| Toro       | 8         | 1440       | Cuero        | Trigo o Maíz        | 21,3        | 16            |
| Jabalí     | 12        | 1920       | Colmillo     | Calabaza o Maíz     | 22          | 20            |

  - Cada animal se paga solo en 24 horas de producción.

  - Rinde alrededor de 25 de plata por hora en bruto, del que hay que descontar la comida.

  - La felicidad baja 1,5 por hora si se descuida, y alimentarlo SIEMPRE tiene que salir a cuenta frente a no hacerlo. La felicidad que da cada comida es proporcional al precio del cultivo, así que no hay un cultivo « tonto » con el que alimentar.

  - Tope de 5 animales por especie — y un CUPO TOTAL del establo que se deriva del oficio (22/8): 2 lugares al arrancar, +1 por cada nivel de Ganadería, hasta el techo de 20. Así cada nivel del oficio entrega algo tangible y los huecos de la escalera (2-3, 5-7, 9-11) quedaron curados. Los guardados con más animales que cupo no pierden nada: su cupo es lo que ya tienen, y la compra espera a que el nivel lo alcance.

**9. Combate: la Zona Negra**

*La XP de combate está anclada por el diseñador (21/8): LA RATA DA 5. La tabla del doc maestro daba 100 y una sola rata regalaba el nivel 3; el bestiario entero se reescaló ÷20 conservando su forma (XP proporcional al peligro del bicho, con premio en jefes y élites).*

La Zona Negra es el único sitio del juego donde se consigue CARNE y piezas de armadura. Se entra por un portal y hace falta un arma equipada.

| **Zona**           | **Nivel** | **Qué es**                                                                 |
| ------------------ | --------- | -------------------------------------------------------------------------- |
| Pantano            | 1         | Agua estancada y bichos chicos. Por acá se empieza.                        |
| Cañón de Piedra    | 10        | Roca pelada y cosas que sí pegan. Traé algo mejor que la espada de madera. |
| Grietas de Fuego   | 22        | El suelo está caliente. Acá abajo se saca lo que vale de verdad.           |
| Guarida del Dragón | 35        | Antes del jefe hay una guardia de orcos. El dragón NO se hace solo.        |

La escalera de armas empieza con la Espada de Madera (5 Madera + 10 de plata), que está FUERA del peaje de la sección de Armas de la Herrería. Es la aplicación de la regla del primer escalón al combate: el jugador puede entrar al Pantano su primer día.

La defensa de cada monstruo es el 30 % del daño del arma de su tramo, así que nunca lo supera y el arma que te toca siempre sirve. El botín está derivado para que cada muerte cubra el desgaste del arma MÁS 20 de plata por la hora que lleva.

Morir cuesta la mitad de la vida y tres minutos de espera. No se pierde el botín.

**10. Cocina**

La Cocina convierte lo recolectado en platos que curan y dan un efecto temporal. Es el sumidero que le da sentido al pescado y a la carne.

| **Plato**             | **Nivel** | **Ingredientes**                             | **Cura** | **Efecto**                | **Min** |
| --------------------- | --------- | -------------------------------------------- | -------- | ------------------------- | ------- |
| Papa Asada            | 1         | 1 Papa                                       | 10       | Velocidad de cultivo +5%  | 3       |
| Puré de Papa          | 2         | 2 Papa + 1 Cebolla                           | 13       | Regeneración +2%          | 4       |
| Sopa de Zanahoria     | 2         | 2 Zanahoria + 1 Cebolla                      | 15       | Velocidad al andar +8%    | 4       |
| Ensalada de Repollo   | 3         | 2 Repollo + 1 Zanahoria                      | 17       | Defensa +6%               | 5       |
| Calabacín Salteado    | 3         | 2 Calabacín + 1 Cebolla                      | 18       | Daño +6%                  | 5       |
| Pan de Trigo          | 4         | 3 Trigo + 2 Madera                           | 20       | XP de Cocina +10%         | 6       |
| Salteado de Brócoli   | 5         | 2 Brócoli + 1 Calabacín + 2 Madera           | 23       | Velocidad de cultivo +10% | 6       |
| Crema de Calabaza     | 5         | 2 Calabaza + 1 Cebolla + 2 Madera            | 25       | Defensa +10%              | 7       |
| Tortilla de Maíz      | 6         | 2 Maíz + 1 Cebolla + 2 Madera                | 27       | Daño +10%                 | 7       |
| Aceite de Girasol     | 6         | 3 Girasol + 2 Madera                         | 18       | Suerte +10%               | 7       |
| Guiso Campestre | 7 | 1 Papa + 1 Zanahoria + 1 Repollo + 1 Cebolla + 3 Madera | 31 | XP de combate +12% · limpia heridas | 8 |
| Pan de Maíz y Trigo | 8 | 2 Trigo + 2 Maíz + 3 Madera | 34 | +20 de vida máxima · disipa maldiciones | 8 |
| Estofado de la Cosecha | 9 | 2 Calabaza + 1 Maíz + 1 Papa + 1 Zanahoria + 3 Madera | 37 | Daño +15% · limpia heridas | 9 |
| Banquete del Bosque | 10 | 1 Papa + 1 Zanahoria + 1 Repollo + 1 Brócoli + 1 Calabaza + 3 Madera | 40 | Daño, defensa y velocidad +20% | 10 |
| Pescado asado         | 1         | 1 pez común                                  | 30       | Precio de venta +10%      | 4       |
| Estofado de carne     | 1         | 1 Carne + 1 Papa + 1 Madera                  | 60       | Enfriamientos -15%        | 5       |
| Banquete del granjero | 6         | 2 Carne + 1 Calabaza + 1 Madera + 1 pez raro | toda     | Precio de venta +20%      | 7       |

*Cada fuente de comida tiene su receta de nivel 1: la huerta la Papa Asada, la laguna el Pescado Asado y la caza el Estofado de carne. Sin eso, el jugador mata bichos, trae carne y no puede hacer nada con ella durante días — que es exactamente lo que pasaba hasta el 19/8.*

*Los efectos de PRECIO DE VENTA y de ENFRIAMIENTOS no se apilan: vale el mejor plato activo, y comer otro solo renueva la ventana. Antes componían — 30 platos ponían el mercado a ×41,7: una impresora de plata con costo lineal y ganancia exponencial, cerrada el 21/8. Los efectos aditivos (velocidad de cultivo, defensa) conservan sus topes de siempre.*

**11. Tutorial**

El tutorial son 29 pasos repartidos en 8 capítulos. Cada paso abre las acciones que su objetivo necesita Y el bucle completo de la plata (plantar, cosechar, comprar semilla, vender): quedarse sin herramientas nunca encierra — el hacha cuesta 2 de plata y la plata siempre se puede producir. Los cuatro pasos de « juntá material » habían perdido esa red y encerraban al que llegaba sin hachas; se cerró el 21/8. El paso de la espada declara su costo completo (5 de madera + 10 de plata).

| **Capítulo**          | **Pasos** | **Identificadores de cada paso**                       |
| --------------------- | --------- | ------------------------------------------------------ |
| Tu primera cosecha    | 5         | kit, buyseed, plant, harvest, sell                     |
| La Herrería           | 4         | place_store, wood_st, stone_st, build_store        |
| El Horno de Piedra    | 4         | place_horno, wood, stone, build_horno                |
| Tu primera espada     | 2         | craftarm, equiparm                                     |
| La Cocina             | 6         | place_cocina, woodc, stonec, build_cocina, cook, eat |
| La Zona Negra         | 3         | portal, hunt, estofado                                 |
| La granja crece       | 2         | expandir, editar                                       |
| La laguna y el tablón | 3         | excavar, fish, pedido                                  |

**El tablón y el final**

El último paso pide entregar un encargo en el tablón, y el tablón abre exactamente cuando ese paso está activo. Antes decía « abre al terminar el tutorial »: un candado circular por el que NINGÚN jugador podía terminar el tutorial (lo encontró la jugada completa; cerrado el 21/8). Y el tutorial tiene UN solo cierre — « ¡GRANJA LISTA! » — también cuando los últimos pasos se dan por hechos solos al cargar la partida: antes ese camino terminaba mudo y los objetivos desaparecían sin explicación.

**Se puede jugar en paralelo, y el juego se da cuenta**

Mientras crecen las papas, el jugador se va a talar, a picar, a cavar montículos o a pescar. Cuando la cadena llega a esos pasos, tienen que darse por hechos solos. Hay tres maneras de cumplir un paso y las tres están vivas: por recurso (mira la bolsa), por evento (la acción avisa) y por estado (un detector comprueba si ya está hecho).

*Un paso que reaparece después de haberlo cumplido es de lo que más desconcierta a un jugador nuevo: le dice que el juego no lo estaba mirando.*

**Decisiones descartadas, para que no se reintenten**

  - Una segunda línea en el cartel con sugerencias de qué hacer mientras esperás. Descartada: no queda bien.

  - Una línea que rotaba entre el objetivo con cuenta atrás y las cosas que se podían hacer. Descartada: poner la espera en palabras la vuelve la protagonista, y nombrar los segundos que faltan hace la espera más pesada, no más liviana.

  - Lo que sí quedó: que el MUNDO señale. Las mariposas revolotean sobre lo que está listo y desatendido, priorizando el objetivo actual.

**El pity del tutorial**

La carne cae por azar, y eso el jugador tiene que aprenderlo. Pero en el paso de caza del tutorial hay una red: si no ha caído antes, al 4.º bicho cae seguro. Solo en ese paso.

**12. La partida medida**

Estas cifras salen del simulador (tools/simular-partida.js), no de una estimación. El perfil es el de un jugador que entra tres veces al día.

| **Qué se midió**                             | **Resultado**             |
| -------------------------------------------- | ------------------------- |
| Tiempo hasta granja nivel 21 (8 expansiones) | 49,3 días                 |
| Con las manos en el juego                    | 9,6 horas (0,8 %)         |
| Tiempo de reloj corriendo sin el jugador     | 99,2 %                    |
| Juego real al día                            | ≈ 12 minutos en 3 visitas |
| Valor producido                              | 204.727                   |
| Lo que el ancla permitía                     | 591.840                   |
| Porcentaje del ancla cobrado                 | 34,6 %                    |

*Re-medido el 22/8 con las cargas de los nodos en el juego: el porcentaje cobrado del ancla se DUPLICÓ (17,6 % → 34,6 %) sin tocar un reloj — el nodo guarda lo que producía y se tiraba.*

La lectura correcta de ese 34,6 % no es « el juego está roto »: es que un idle avanza sin el jugador y eso es su naturaleza. El desglose, tras las cargas:

  - Cultivos: 79 de plata/h con 11 parcelas. El ancla pedía 220.

  - Árboles y rocas: 94 de plata/h con 22 nodos (antes de las cargas eran 9). Con el tope de 4 cargas, el jugador de tres visitas cobra 12 de las 48 recolecciones diarias del árbol: el 25 % de su potencial de guardia, contra el 6 % de antes.

  - Observación para el diseñador (22/8): con las cargas, la XP de Tala se adelanta a los demás oficios (Tala 26 · Cultivo 17 · Minería 11 al llegar a granja 21), porque cada carga paga su talado. La Tala no tiene escalera que se rompa, pero si algún día la tiene, revisar su ritmo de XP.

*El cultivo NO tenía ese problema, y esa era la asimetría: el jugador elige el cultivo que dura lo que dura su ausencia, pero no podía elegir la duración de un árbol. Las cargas del capítulo 4 son la respuesta (21/8): el árbol guarda hasta 4 relojes de producción, así que una ausencia de hasta 2 horas ya no pierde nada.*

**13. Lo que está abierto**

Capítulo honesto. Todo lo que sigue está medido o decidido, pero no implementado.

**13.1 La doma, para el tiempo offline**

El problema medido es el del capítulo anterior: los nodos cobran una fracción de su ancla porque nadie está para recogerlos. Las CARGAS (capítulo 4) ya cubren el primer tramo: el nodo guarda hasta 4 relojes (2 h el árbol, 2 h 40 la roca). Lo que sigue abierto es el tramo largo — la noche, el fin de semana — y para eso la solución aprobada es DOMAR MONSTRUOS que atiendan la granja mientras el jugador está desconectado. No debe estar disponible al principio: tener algo así en el arranque rompe la curva.

**13.2 El hueco de Ganadería entre los niveles 4 y 8**

RESUELTO el 22/8: el cupo del establo crece un lugar por nivel de Ganadería (capítulo 8), así que ya no hay niveles mudos entre el Conejo (4) y el Toro (8) — ni en ningún otro tramo de la escalera. Queda como idea futura sumar un animal intermedio (gallina) cuando haya arte.

**13.3 Qué premia del nivel 20 al 150**

DECIDIDO el 22/8: el crecimiento se CAPEA donde termina el contenido (capítulo 5) en vez de prometer cien niveles vacíos. La escalera 20-150 pasa a ser el plan de liberación futura: cada vez que se agregue contenido (un cultivo nivel 25, un animal nuevo, la doma), el techo del oficio sube solo, y con él suben los veteranos que ya acumularon la XP. Ideas anotadas para esa escalera: maestrías de oficio, la doma como contenido de veterano, y el prestigio de granja (ya existe en el código, dormido tras el nivel 50).

**13.4 Las skins del pase**

Cinco skins del pase de batalla están definidas y no implementadas. No es bloqueante para el MVP: hoy no hay pasarela de pago.

**13.5 El estado vive en el cliente**

Este es el riesgo estructural serio y hay que mirarlo antes del token, no después. Hoy la partida se calcula en el navegador del jugador y se sube al guardado. Mientras la moneda no tenga valor real, el incentivo para manipularla es bajo. En cuanto lo tenga, deja de serlo.

El 21/8 se construyó el primer escalón: EL PORTERO DEL GUARDADO. Una Edge Function de Supabase (supabase/functions/guardar/) pasa a ser la única puerta de escritura a la granja: compara cada guardado con el anterior, anota el delta y las sospechas en una bitácora (farm_saves_log) usando los techos del ancla, y escribe con la fecha del servidor. Arranca en MODO SOMBRA — anota, nunca rechaza — hasta calibrar con jugadores reales. El 22/8 quedó EN PRODUCCIÓN: función deployada, bitácora anotando (vista `bitacora`, con nicks) y la puerta vieja sellada — en `farms` quedó una sola policy (leer lo propio); escribir, únicamente a través del portero, verificado contra pg_policies y con partidas reales guardando. Quedan los dos escalones siguientes: activar el rechazo tras calibrar la bitácora (ese día muere el botón 🧪 y se suma la limpieza de la bitácora a 30 días), y que todo lo que toque valor real se calcule solo en el servidor.

**14. Reglas de la casa**

Normas de diseño que vienen de decisiones de dirección y que conviene no reabrir sin motivo.

1.  Toda herramienta tiene un uso. Si algo está en el juego y no sirve para nada, sobra.

2.  Toda escalera empieza abierta en el nivel 1.

3.  Toda razón por la que una acción puede fallar se comprueba ANTES de empezarla. Si una comprobación solo existe al final, el jugador paga el gesto y la espera para recibir un « no », y eso no parece un fallo: parece que el juego se burla.

4.  Un edificio que abre un oficio no puede exigir ese oficio.

5.  El cartel y la flecha tienen que mandar al mismo sitio, y ese sitio tiene que ser donde está la cosa.

6.  Lo que ocupa una celda se ve, y lo que se ve ocupa su celda.

7.  El redondeo va una sola vez, al final. Nunca por unidad.

8.  Ningún número se escribe a mano si se puede derivar del ancla.

**15. Cómo verificar lo que dice este documento**

El proyecto tiene 59 pruebas automáticas y 16 auditores (99 herramientas en total). No comprueban que el código compile: comprueban que el JUEGO cumpla las reglas de arriba. Los más útiles para el diseñador:

| **Herramienta**                 | **Qué contesta**                                            |
| ------------------------------- | ----------------------------------------------------------- |
| tools/auditar-ancla.js          | ¿Cada cosa que se extrae rinde lo que dice el ancla?        |
| tools/auditar-precio-sombra.js  | ¿Cada precio se explica desde la fórmula?                   |
| tools/simular-partida.js        | ¿Cuánto tarda una partida real y cuánto tiempo está muerta? |
| tools/medir-tiempo-muerto.js    | ¿Cuánto dura una visita y cuánto se espera entre visitas?   |
| tools/auditar-avisos.js         | ¿Alguna acción te deja empezar para negártela después?      |
| tools/test-celdas-vs-sprites.js | ¿Hay alguna celda ocupada sin nada visible encima?          |
| tools/test-tutorial-desvio.js   | Si el jugador se adelanta, ¿el tutorial se entera?          |
| tools/test-herramientas.js      | ¿Cada herramienta se enseña y tiene camino de vuelta?       |
| tools/jugada-completa.js | UNA PARTIDA entera simulada, del minuto 1 al final, con reloj trucado |
| tools/auditoria-dupes-f5.js | ¿El guardar-y-volver es un espejo, o fabrica y devuelve cosas? |
| tools/test-parcelas-f5.js | El libro mayor de parcelas: nada se regala dos veces ni se recorta de más |
| tools/test-buffs-apilados.js | La impresora de plata de los platos, apagada y vigilada |

*Si una cifra de este documento y el juego no coinciden, manda el juego — y entonces hay un auditor que debería haberlo cazado y no lo hizo.*
