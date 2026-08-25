**GOLDEN FARM**

Documento de Diseño de Juego

*Estado real del código · 24 de agosto de 2026 · revisión 4*

**Qué cambió desde la revisión 3 (22/8)**

*Cosas nuevas para jugar:* el MERCADER GOBLIN (un trueque anclado por día, aparece al terminar el tutorial), los LOGROS con premio (pestaña 🏆), el ÁLBUM DE LA GRANJA (la colección de primeras veces, pestaña 📖), la MISIÓN DE EVENTO del tablón (viernes a domingo, cartel violeta propio), la PESCA v2 con el sistema de Fishing Frenzy (burbujas, anzuelo a tiempo y zona de captura; un clic tira, cada tirada es un gusano), LA DOMA con su plato por especie y su oficio (« la rata no va a talar »), y LAS CARTAS DEL ABUELO — el lore del juego (docs/LORE.md) entregado de a una carta por nivel de granja, del 2 al 20.

*Cosas que cambiaron de fondo:* el DÍA cicla a las 00:00 UTC (21:00 en Argentina, el estándar web3) y la noche es azulada, no solo oscura; el HORNO pasó de enfriamiento a COLA de tres bocas, con tiempos atados al reloj del nodo que da su ingrediente; los PICOS se eligen solos al clicar el recurso (el de oro nunca se gasta en una roca); la ESTAMINA se recarga entera cada 4 horas por reloj real; las EXPANSIONES 3, 6, 8, 10, 12, 14 y 16 traen veta de bronce o de oro; y la COCINA se rediseñó en dos paneles con recetario de íconos (referencia del diseñador: Sunflower Land) — se elige el plato mirando, no leyendo.

*Reglas nuevas de la casa, que son las que evitan que esto se repita:* la **regla 9** (toda acción contesta algo: una acción muda es el peor fallo posible, porque el jugador no puede diagnosticarla desde dentro del juego) y la **regla 10** (un clic sobre una ventana se queda en la ventana). Cada una tiene su medidor: `auditar-silencios.js` y `test-clic-interfaz.js`.

**Entrar a la granja: 1.186 KB → 400 KB (24/8)**

Dirección: « sigue tardando en entrar a la granja, algo se ha roto ahí en el inicio ». No se rompió de golpe — se fue rompiendo, que es peor, porque así no lo cazó nadie. El juego son doce archivos de JavaScript y hoy pesan 1.186 KB entre todos; el arranque llevaba tres impuestos encima, ninguno de ellos del juego:

  - **El servidor los mandaba sin comprimir.** Con gzip son 400 KB: viajaba el triple de lo necesario, en cada carga, para todos.

  - **El cargador los pedía en fila**, cada uno esperando al anterior: doce idas y vueltas al servidor puestas una detrás de otra antes de que corriera la primera línea del juego. Eso no se arregla comprimiendo — son viajes, no bytes. Ahora el navegador se entera de los doce de una y los baja en paralelo; el orden de ejecución sigue siendo uno por vez, porque `config` define lo que `state` usa.

  - **Los `.js` iban con `no-cache`**, o sea una ida y vuelta por archivo en cada carga solo para que el servidor contestara « no cambió » — innecesario desde el día que el cargador les puso `?b=GF_BUILD`, que cambia en cada deploy y ya hace imposible reusar código viejo. Ahora se cachean de verdad: la segunda carga de un mismo build no pide nada.

Como el sello del build pasó a ser lo único que avisa que hay código nuevo, dejó de escribirse a mano: **lo calcula el servidor** a partir de los propios archivos del juego (tamaño y fecha de los doce `.js`) y lo inyecta en el `index.html` al servirlo. Un sello que hay que acordarse de actualizar es un sello roto: si cambia una coma en cualquier archivo, cambia el número, y nadie tiene que hacer nada. Lo fija `tools/test-arranque-peso.js`, que además **vigila el peso**: el bulto crece solo, un comentario por vez, y si algún día pasa de 460 KB comprimidos, la suite se pone roja antes de que lo note un jugador.

**El hallazgo del día: el deploy fallaba en silencio (24/8)**

Esto merece su propio apartado porque no es un detalle de infraestructura: es la razón por la que arreglar cosas no servía de nada. Al endurecer la caché apareció un síntoma raro —el sello nuevo no llegaba al servidor— y al perseguirlo salió el error de verdad, que hasta entonces se perdía entre el ruido del `deploy.bat`:

> `error: open("node_modules/.bin/download-msgpackr-prebuilds"): Function not implemented` · `fatal: updating files failed`

La carpeta `node_modules` estaba versionada —1.957 archivos— y trae **enlaces simbólicos** que Windows no puede escribir. Cuando git se los cruza, aborta el `git add -A` **entero**: no se prepara nada, el commit no se hace, y el `git push` sube solamente lo que ya estuviera commiteado de antes. Sin un solo mensaje que dijera « no subí nada ».

O sea que el deploy venía fallando así desde hacía quién sabe cuánto, y cualquier cambio hecho en la máquina de la dirección nunca llegaba al juego. El sello no era el problema: era el síntoma que por fin lo delató. Ahora `node_modules` no se versiona (Render instala las dependencias solo, desde `package.json` — comprobado, no supuesto), y el `deploy.bat` dejó de ser optimista: si el `git add` falla se planta y lo dice, si el push falla no finge que deployó, y al terminar avisa si quedó algo de `public/` o `src/` sin subir. `tools/test-sello-build.js` comprueba que el índice de git no vuelva a tener ni un archivo de `node_modules`.

La moraleja, que vale para todo el proyecto y no solo para el deploy: **una herramienta que falla sin decirlo es peor que una que no existe**, porque genera confianza donde no la hay. Es la regla 9 —ninguna acción termina en silencio— aplicada fuera del juego.

**Y el que de verdad colgaba el arranque: el LOGIN (24/8)**

Con el cartel ya diciendo el paso, el reporte siguiente fue exacto: « se colgó en LOGIN y no contestó en 45 s ». Y *login* es `getSession()`, que ni siquiera es una llamada de red — lee la sesión guardada en el navegador. Se colgaba porque supabase-js envuelve toda operación de autenticación en un **candado del navegador** (`navigator.locks`) para que dos pestañas no refresquen el token a la vez; si otra pestaña se quedó con el candado —dormida, colgada o cerrada de mala manera— la que abre después espera, y el candado no vence nunca. Con una sola pestaña no pasa jamás. Con el diseñador y el programador abriendo diez para probar, pasa todo el rato.

El arreglo tiene tres partes, y la tercera es la que importa a futuro:

  - **El candado pasa a ser de la página**, no del navegador: sigue serializando las operaciones de auth, que es para lo que sirve, pero nadie de afuera puede quedárselo.

  - **Cada paso del login tiene su tope de tiempo**, y si `getSession` no contesta hay una regla dura: si el navegador YA tiene una sesión guardada, se reintenta una vez y, si tampoco, **se falla a propósito**. Nunca se crea una cuenta anónima nueva encima de una granja que existe — eso dejaría al jugador mirando una granja vacía y el primer guardado la escribiría sobre la buena. Solo se crea cuenta si el navegador está virgen, donde no hay nada que pisar.

  - **La versión de la librería quedó clavada.** El juego la cargaba como `@2`, o sea « la última 2.x que haya hoy en el CDN »: la pieza que maneja el login y el guardado se actualizaba sola, de un día para el otro, sin que nadie tocara una línea. Eso es exactamente « algo se ha roto ahí en el inicio » sin culpable posible. Ahora se sube a mano, se prueba, y recién ahí se cambia el número.

Lo fija `tools/test-login-candado.js`, que corre el login de verdad contra un servidor de mentira colgado a propósito y comprueba, entre otras cosas, que en ese caso no aparezca ninguna cuenta nueva.

**Y lo más caro de todo: la puerta del apodo creaba granjas nuevas (24/8)**

Dirección, a la mañana siguiente: « ahora me reinicia el avance… empecé de cero y ahora me manda de cero 3 h después ». Este es el fallo más grave de la sesión y conviene tener la cadena entera escrita, porque cada eslabón parecía razonable por separado:

> el login no puede entrar → `initSave` devuelve *false* → `loadFarm` sale por su primera línea, « sin nube no hay nada que pisar », y **da el visto bueno para guardar** → el arranque no ve ningún fallo → abre **la puerta del apodo** → el jugador escribe su nombre → se crea una cuenta anónima **nueva** → granja vacía, y la vieja huérfana para siempre bajo el UID anterior.

Un problema de red de un minuto se comía tres horas de juego. Y el arreglo del login lo hizo *más* probable, porque agregó caminos nuevos por los que `initSave` devuelve *false* — un arreglo que empeora otra cosa es parte del trabajo, pero hay que decirlo.

La regla nueva, y es dura: **la puerta del apodo es solo para navegadores vírgenes.** Si hay una sesión guardada, este navegador ya tiene granja, y entonces no se pide apodo: se avisa que no se pudo entrar y no se toca nada. La comprobación está **tres veces** —en `loadFarm`, en el arranque y en el propio botón *Entrar*, que es el que consuma la pérdida— y eso es deliberado: es el único fallo del proyecto que no tiene vuelta atrás, así que no puede depender de una sola línea. El cartel, además, ahora se lo dice al jugador con todas las letras: *« tu granja sigue guardada en tu cuenta · NO empieces una partida nueva »*.

Lo fija `tools/test-no-perder-granja.js`, que cuenta las tres rejas y después corre la cadena completa contra un servidor colgado a propósito, comprobando que al final no aparezca ninguna cuenta nueva.

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
| Calabaza    | 2         | 40          | 180         | 100        | 60       | 20          | 30     |
| Cereza      | 4         | 2           | 9           | 5          | 3        | 20          | 40     |
| Girasol     | 4         | 180         | 600         | 380        | 200      | 20          | 50     |
| Remolacha   | 6         | 3           | 12          | 7          | 4        | 20          | 60     |
| Trigo       | 6         | 360         | 960         | 680        | 320      | 20          | 70     |
| Zanahoria   | 8         | 3           | 15          | 8          | 5        | 20          | 80     |
| Maíz        | 8         | 720         | 1440        | 1200       | 480      | 20          | 90     |
| Cebolla     | 10        | 6           | 30          | 16         | 10       | 20          | 100    |
| Calabacín   | 12        | 10          | 45          | 25         | 15       | 20          | 110    |
| Repollo     | 14        | 20          | 90          | 50         | 30       | 20          | 120    |
| Brócoli     | 16        | 90          | 360         | 210        | 120      | 20          | 130    |

*Lectura de diseño (22/8 — LA ESCALERA EN DOS CARRILES): la tabla vieja ordenaba por duración y el jugador de nivel 3-5 no tenía NINGÚN cultivo que aguantara su primera noche — la promesa del pilar 1 no existía justo la noche en que se decide si vuelve. Ahora cada escalón temprano abre un PAR: un cultivo de sesión y uno de ausencia — la calabaza (3 h) llega al nivel 2, dentro de la primera hora; el girasol (10 h) al 4; el maíz (24 h) al 8. La progresión tardía vende el MEDIO fino (30-90 min, las sesiones de sobremesa). La plata no se movió: todos rinden 20/h. La XP se re-derivó del orden nuevo (10 por escalón). El techo de Cultivo baja solo a 16.*

Consecuencia medida (simulador): la partida a granja 21 pasa de 49 a 63 días — el jugador con nocturnos hace menos gestos por día y sube más lento a cambio de comodidad. La plata por hora es la misma; si el ritmo se quiere de vuelta en ~50 días, la palanca es FARM_XP_LVLS (una pasada).

**4. Nodos: tala, minería y pesca**

**Relojes**

  - Árbol: 30 minutos.

  - Roca y veta de mineral: 40 minutos.

  - Laguna: 15 minutos entre lanzamientos.

  - Montículos de tierra: 3 por día, sin herramienta y sin enfriamiento. Dan lombriz, que es la carnada de la pesca.

**Cargas: el nodo pasado no se desperdicia (21/8)**

Un árbol o roca ya crecido acumula 1 carga por cada reloj propio extra que pase sin cosecharse, hasta llenarse con 4. Y el nodo VIRGEN — el que nunca se taló — nace lleno (22/8): el jugador nuevo ve la escalera completa en su primer talado, y cada expansión entrega su árbol y su roca cargados como bienvenida (4+4 recursos contra costes de 61-810: regalo, no economía). El estado virgen se consume una sola vez y el F5 no lo resucita. El árbol se llena a las 2 horas de pasado; la roca y la veta de piedra, a las 2 h 40. Y el ritmo (22/8, dictado clic a clic por dirección): los CORTES SUAVES pagan una carga cada uno (+1 madera, −1 hacha); el CORTE PROFUNDO no da ni consume nada; el TOCÓN paga la última. Árbol de 4 cargas: suave(+1) · suave(+1) · suave(+1) · profundo(nada) · tocón(+1) — cinco clics, cuatro maderas, cuatro hachas. De 2: suave(+1) · profundo · tocón(+1). El árbol normal de una carga conserva su tanda clásica de siempre: suave(nada) · profundo(nada) · tocón(+1). La roca y la veta de piedra, igual con su media rota. Las vetas de mineral (bronce en adelante) quedan APARTADAS de la mecánica por decisión de dirección (21/8): reloj simple, una picada y a dormir. Cada picada de mineral rinde 2 (el ancla del 18/8: con 1 picar daba pérdida, porque el pico cuesta más de lo que saca).

**La pesca v2: el sistema de Fishing Frenzy (22/8)**

La pesca dejó de ser una barra que se mira y pasó a ser el ÚNICO sistema de habilidad activa de la granja, copiado del Fishing Frenzy de Ronin por decisión de dirección — con una poda suya: sin carga de distancia, «con un clic simplemente tirás, porque cada tirada es un gusano». Tres fases: el TIRO (un clic, el corcho al agua), el PIQUE (a los 1,6-4,2 segundos aparecen burbujas y hay 1 segundo para clavar el anzuelo — antes o después, se pierde), y el CARRETE: el pez recorre una barra vertical y el jugador maneja la zona de captura (apretar sube, soltar baja); con el pez adentro el progreso llena, afuera drena. La zona CRECE con el nivel de Pesca (23 % de la barra al nivel 1, techo 40 %) y los peces raros nadan más rápido y cambian de rumbo más seguido, tal cual el original. La economía no se movió un milímetro: el gusano, el uso de caña, el reloj de 15 minutos, el sorteo 60/25/12/3 y la XP se cobran al RESOLVER la captura por la misma función auditada de siempre — un lance fallado cuesta tiempo, no plata, así el minijuego no toca el ancla. La rareza se sortea al armar el lance y el premio coincide con la pelea que diste.

**El pico se elige solo (24/8)**

Dirección: « que las herramientas sean únicas —piedra para piedra, oro para oro— y que no haya que señalar el pico a usar, sino que se ajuste con clic en el recurso ». Ahora cada nodo usa el pico MÁS BARATO que pueda con él y del que haya stock: picar una roca jamás gasta el pico de oro (que vale 280 de plata sombra), y clicar una veta de oro agarra el de oro sin equipar nada. Si no tenés ninguno que sirva, el aviso nombra el pico EXACTO que falta en vez de un genérico. Las dos puertas siguen existiendo y cada una dice lo suyo: primero la herramienta (que se craftea ahora) y después la skill (que se sube picando). El pico equipado deja de ser una decisión que se puede olvidar. Y el PICO DE ORO pasa a pedir plata: su presupuesto sigue siendo 280 —lo que el ancla permite para una picada de oro— pero repartido en 1 bronce + 6 piedra (250) y 30 de plata, así que la picada sigue rindiendo 20/h exacto.

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

Cada oficio con escalera tiene TECHO, y el techo se deriva de su contenido (22/8, dirección: « capear el crecimiento hasta el nivel donde hay contenido; más adelante se libera más »). Hoy: Cultivo 16 (el brócoli, tras la escalera en dos carriles del 22/8), Minería 11 (la netherita), Ganadería 19 (el lugar 20 del establo), Cocina 16 (el Banquete del Bosque, tras la re-sincronización del 22/8 — gemelo del de Cultivo). La XP nunca deja de acumularse por debajo: cuando se agregue contenido de nivel más alto, el techo sube solo y los veteranos suben en el acto lo que ya ganaron. Los oficios sin escalera (Tala, Pesca, Artesanía y las armas) y la barra de Combate no se capean. La granja tiene su propio techo de siempre: nivel 50.

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

**El álbum: la colección de primeras veces (23/8)**

Si los LOGROS premian volumen, el ÁLBUM premia VARIEDAD. La pestaña 📖 del menú tiene seis familias — cultivos, peces, platos, minerales, animales y bestiario, 62 láminas en total — y cada una se revela con la PRIMERA vez que conseguís esa cosa: hasta entonces es una silueta apagada con un « ? ? ? ». No paga plata: paga completismo, y empuja a probar el contenido que el jugador saltea (el cultivo que nunca planta, la receta que nunca cocina, el bicho que esquiva). No guarda ni un byte propio: se deriva de los contadores que ya existen y de lo que hay en la bolsa, así que no se puede perder con un guardado y las partidas viejas abren el álbum ya medio lleno. Si mañana se agrega un cultivo o un monstruo, su lámina aparece sola. A futuro, el MUSEO — hermano de la sala de trofeos — cuando los edificios tengan interior.

**Los logros: metas con premio, futura sala de trofeos**

La pestaña 🏆 del menú junta metas de toda la granja en tres tiers — bronce, plata y oro — más un puñado de únicos de las primeras horas (primera cosecha, primer plato, primer animal, tutorial). Los contadores son los que el juego ya llevaba (G.stats): la acción real mueve el logro, nada se cuenta aparte. El premio se cobra a mano en la pestaña y cuelga del ancla: bronce 5 de plata (15 minutos), plata 20 (1 hora), oro 80 (4 horas). El total repartible en toda una partida es ≈965 de plata sobre ~250.000: condimento, no fuente de ingreso. Las metas de bronce llegan en la primera sesión larga — su función es dar SIEMPRE un siguiente paso visible aunque el próximo nivel quede lejos. Decisión de dirección del 22/8: vive en el menú (no en el granero, porque abarca todo el juego), y cuando los edificios tengan interior pasa a ser la SALA DE TROFEOS — lo cobrado se conserva tal cual, la migración es solo visual.

**6. La granja y sus expansiones**

El mundo es una rejilla de celdas de 42 píxeles. La granja inicial es un claro de 15×15 celdas y crece en bloques de 5×5. Hay 16 expansiones y el techo son 60 parcelas.

La cerca es un anillo de UNA celda en los cuatro lados (regla de dirección, 20/8: « el corral solo ocupa los extremos de la grilla »). El interior útil de arranque es un 13×13 simétrico: 169 celdas, y 529 con las dieciséis expansiones. Los objetos apoyados en la primera fila (granero, buzón) se dibujan por delante de la cerca, como corresponde por altura.

Ni los niveles ni los costes de las expansiones están escritos a mano: se derivan de la granja que tenés cuando cada una se abre. Cada expansión trae 25 celdas, un árbol, una roca y una parcela ya arada.

Las expansiones son estrictamente SECUENCIALES: la única que existe — en el mapa y en la tienda — es la siguiente en el orden, y el requisito es doble: el nivel Y haber hecho las anteriores. El lote no se dibuja hasta tener el nivel; con el cursor encima aparece la chapa de EXPANDIR, que muestra el costo y, debajo, lo que trae: « árbol · roca · parcela » (las celdas no se anuncian: se ven al expandir).

| **#** | **Nivel** | **Coste**                                            |
| ------ | --------- | ---------------------------------------------------- |
| 1      | 3         | 6 Madera + 4 Piedra                                  |
| 2      | 5         | 22 Madera + 14 Piedra                                |
| 3      | 7         | 61 Madera + 40 Piedra                                |
| 4      | 9         | 86 Madera + 69 Piedra + 9 Bronce                     |
| 5      | 12        | 121 Madera + 97 Piedra + 12 Bronce                   |
| 6      | 15        | 161 Madera + 129 Piedra + 16 Bronce                  |
| 7      | 18        | 221 Madera + 177 Piedra + 11 Bronce + 7 Hierro       |
| 8      | 21        | 274 Madera + 219 Piedra + 14 Bronce + 9 Hierro       |
| 9      | 24        | 349 Madera + 279 Piedra + 17 Bronce + 12 Hierro      |
| 10     | 28        | 413 Madera + 331 Piedra + 14 Hierro + 12 Oro         |
| 11     | 31        | 504 Madera + 403 Piedra + 17 Hierro + 14 Oro         |
| 12     | 35        | 580 Madera + 464 Piedra + 19 Hierro + 17 Oro         |
| 13     | 39        | 685 Madera + 548 Piedra + 20 Oro + 15 Diamante       |
| 14     | 42        | 772 Madera + 618 Piedra + 22 Oro + 17 Diamante       |
| 15     | 46        | 892 Madera + 714 Piedra + 20 Diamante + 15 Netherita |
| 16     | 50        | 990 Madera + 792 Piedra + 22 Diamante + 17 Netherita |

*SIETE BLOQUES TRAEN VETA (24/8, dirección): la 3, la 6, la 8, la 10, la 12, la 14 y la 16 entregan, además de su parcela + árbol + roca, una VETA DE BRONCE y una DE ORO. Como dan 5 celdas productivas en vez de 3, se pagan: la fórmula cuenta las celdas acumuladas, así que el precio de las siguientes sube solo y el ancla no se mueve (una veta rinde 20 plata/hora igual que una parcela). Efecto de diseño buscado: la veta de oro pide Minería 7 y su pico, así que el que compra la expansión 3 se la encuentra ahí esperándolo — contenido que asoma antes de poderse tomar, con el aviso diciendo qué pico falta.*

*Las expansiones 1 y 2 están abaratadas a mano (0,7 y 2 horas de granja) por decisión de dirección del 20/8: « abaratar solo la 1 y la 2, hasta que el nivel mande ». De la 3 en adelante manda la curva derivada.*

**Las parcelas: tres caminos y un libro mayor**

Una parcela llega por tres caminos, y cada camino lleva su cuenta — ese libro mayor es lo que hace imposible el bug de « cada F5 me regala una parcela » (cerrado el 20/8):

- **De nacimiento**: 3.

- **Por expansión**: cada bloque entrega la suya YA PUESTA dentro. La entrega queda anotada en una bandera guardada con la partida (expParcelasDadas): una vez entregada no se vuelve a entregar nunca, la muevas a donde la muevas. Los guardados con parcelas fantasma del bug se limpian solos en la primera carga.

- **Compradas en la tienda, con PLATA**: la primera sale 200 (10 horas del ancla) y cada una un 10 % más que la anterior — el precio cuenta SOLO las compradas, así que las regaladas por expansión no lo tocan y el orden comprar/expandir no importa. El botón de compra en $Golden se retiró hasta que el token tenga valor. Las Fichas de parcela del pase también cuentan en el libro.

**Ocupación: una sola verdad**

*Cada celda sabe qué la ocupa, y esa es la ÚNICA autoridad. La usan el colocador de edificios, el sombreado que se ve al llevar algo en la mano, los mensajes de « aquí no entra » y el buscador de caminos. Cuando esta regla se ha duplicado, el resultado siempre ha sido el mismo: celdas bloqueadas sin nada visible encima. Es la clase de fallo que el jugador no puede diagnosticar y que le hace pensar que el juego está roto.*

**El Mercader Goblin: un trueque por día**

Cada día aparece un goblin junto al buzón (sprite ya existente, sin arte nuevo) con UNA oferta: pide una cantidad del recurso básico que MÁS tenés (madera o piedra) y entrega el otro a valor de mercado más un 10 % de propina. El valor del día ronda los 40-60 de plata — endulza, no imprime — y la oferta es determinística por fecha: el F5 no la re-sortea. « Hoy no » no quema el día: el goblin espera hasta que aceptes o hasta mañana. Cerrado el trato se va con su humito y vuelve al día siguiente con oferta nueva. El propósito es doble: darle salida al recurso que sobra (el que tala mucho consigue piedra y al revés) y sumar un motivo diario de visita con personaje, no con menú.

**La misión de evento: el cuarto escalón del tablón**

El tablón de pedidos tenía tres escalones — 3 diarios (10 % de la producción del día), el encargo de la semana (un día entero) y el gran encargo del mes (tres días). El 22/8 se sumó el cuarto: la MISIÓN DE EVENTO, que solo cuelga de viernes a domingo, arriba de todo y con cartel violeta propio (« 🎪 MISIÓN DE EVENTO · SOLO EL FINDE »). El tema rota por semana — la Gran Cosecha, la Fiebre de la Leña, el Día de la Cantera, el Torneo de Pesca, el Festín del Pueblo — y solo pide lo que el jugador ya produce; si el tema de la semana no le aplica, pasa al siguiente. Paga con la vara de toda la escalera (plata 1,0×, la ganancia en vales) y pide DOS días de producción, entre el semanal y el mensual, porque hay un finde entero para juntarlo. La ventana es real: el lunes desaparece, entregada o no — la escasez es lo que la hace evento, y el motivo para entrar el fin de semana. No se descarta ni se re-sortea.

**El Horno: una cola, no un castigo (24/8)**

Tres reportes de dirección salían del mismo sitio: los tablones aparecían en la bolsa sin esperar, su reloj era ridículo (6 segundos) y el botón ×5 no hacía nada. La causa era una sola — el Horno entregaba el material EN EL ACTO y ponía un enfriamiento para el clic siguiente: el reloj no era una fundición, era un castigo entre clics, y el ×5 moría chocando contra el enfriamiento que acababa de poner él mismo. Ahora el Horno funciona como las ollas de la Cocina: metés la pieza, ocupa uno de sus TRES lugares, y el material entra a la bolsa CUANDO TERMINA. La cola viaja en el guardado: se puede poner a fundir y cerrar el navegador. Con la bolsa llena la pieza espera al fuego en vez de perderse.

**Los tiempos del Horno, y por qué pueden pesar (24/8 v2)**

Dirección, sobre la primera tanda de tiempos: « esa parte de 3 en 3 me parece bien, pero yo le pondría más CD: puede ser simultáneo, pero debería durar mucho más que 2 minutos ». Antes de subirlos hay que decir qué son, porque es lo que decide cuánto pueden subir: **el reloj del Horno no es una palanca de economía**. La palanca es el mineral. Un tablón se come 3 maderas y un árbol repone 1 cada 30 minutos, así que juntar una hornada lleva HORAS contra los minutos que tarda el fuego: el Horno va detrás del nodo por un factor de diez y puede pesar mucho más sin frenar a nadie. Lo único que cambia es lo que se siente al mirarlo.

La regla, entonces, se ata a un reloj que el jugador ya conoce: **el reloj de su nodo, dividido por las tres bocas del Horno**. Árbol 30 min → tablón 10. Roca 40 min → bloque de piedra 13. Las vetas de metal son de horas (el oro, 14 h), así que ahí la regla se corta sola y sigue la escalera de siempre, un escalón por tier: bronce 20, hierro 25, oro 30. El Horno nivel 2 sigue recortando su 40 %, y aun así el más rápido queda en 6 minutos: el triple del piso que marcó dirección. Lo verifica `tools/test-horno-cola.js`, que además comprueba que el fuego nunca se acerque al reloj del nodo.

Y el botón del lote dice la verdad: contaba « ×5 » y encolaba 3, porque el Horno tiene tres bocas. Ahora cuenta los lugares libres y lo que alcanza con lo que tenés, y escribe ESE número. Un botón que promete cinco y hace tres no es un bug de la cola: es un botón que miente, y el jugador lo descubre después de apretarlo.

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

*QoL del 23/8: con el cupo llegando a 20 lugares, el establo tiene dos botones de tanda — ALIMENTAR TODO (salta a los que ya están en felicidad 100: no se desperdicia un solo cultivo) y RECOGER TODO (cobra la producción lista de todas las especies). Un clic, un resumen, un guardado. Los botones por especie siguen donde estaban.*

**9. Combate: la Zona Negra**

*La XP de combate está anclada por el diseñador (21/8): LA RATA DA 5. La tabla del doc maestro daba 100 y una sola rata regalaba el nivel 3; el bestiario entero se reescaló ÷20 conservando su forma (XP proporcional al peligro del bicho, con premio en jefes y élites).*

La Zona Negra es el único sitio del juego donde se consigue CARNE y piezas de armadura. Se entra por un portal y hace falta un arma equipada.

*LA ESTAMINA SE LLENA ENTERA CADA 4 HORAS (24/8, dirección). Antes goteaba un punto cada tres minutos, pero el goteo vivía en el tick del HUD: con la pestaña cerrada la barra se congelaba, al revés de lo que promete un juego de relojes. Ahora, en cuanto la barra baja del máximo arranca un reloj de 4 horas de tiempo REAL y al vencer la estamina queda entera — funciona con el navegador cerrado, se puede anunciar (« se llena en 1 h 20 », y la píldora lo dice al pasar el cursor) y es una sola regla en vez de un goteo invisible.*

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
| Pescado asado         | 1         | 1 pez común                                  | 30       | Precio de venta +10%      | 4       |
| Estofado de carne     | 1         | 1 Carne + 1 Papa + 1 Madera                  | 60       | Enfriamientos -15%        | 5       |
| Puré de Papa          | 2         | 3 Papa                                       | 13       | Regeneración +2%          | 4       |
| Crema de Calabaza     | 3         | 2 Calabaza + 1 Papa                          | 25       | Defensa +10%              | 7       |
| Aceite de Girasol     | 4         | 3 Girasol + 2 Madera                         | 18       | Suerte +10%               | 7       |
| Banquete del granjero | 5         | 2 Carne + 1 Calabaza + 1 Madera + 1 pez raro | toda     | Precio de venta +20%      | 7       |
| Pan de Trigo          | 6         | 3 Trigo + 2 Madera                           | 20       | XP de Cocina +10%         | 6       |
| Galletita de Cereza   | 4         | 2 Cereza + 1 Papa                            | 5        | Plato de DOMA: a la rata le encanta | 7 |
| Papilla de Remolacha  | 7         | 2 Remolacha + 1 Calabaza                     | 5        | Plato de DOMA: a la larva le encanta | 7 |
| Costillar Ahumado     | 10        | 2 Carne + 1 Maíz + 1 Madera                  | 5        | Plato de DOMA: a los orcos y al trol les encanta | 7 |
| Sopa de Zanahoria     | 8         | 2 Zanahoria + 1 Remolacha                    | 15       | Velocidad al andar +8%    | 4       |
| Tortilla de Maíz      | 9         | 2 Maíz + 1 Zanahoria + 2 Madera              | 27       | Daño +10%                 | 7       |
| Pan de Maíz y Trigo | 10 | 2 Trigo + 2 Maíz + 3 Madera | 34 | +20 de vida máxima · disipa maldiciones | 8 |
| Estofado de la Cosecha | 11 | 2 Calabaza + 1 Maíz + 1 Papa + 1 Zanahoria + 3 Madera | 37 | Daño +15% · limpia heridas | 9 |
| Calabacín Salteado    | 12        | 2 Calabacín + 1 Cebolla                      | 18       | Daño +6%                  | 5       |
| Guiso Campestre | 13 | 1 Papa + 1 Zanahoria + 1 Cebolla + 1 Remolacha + 3 Madera | 31 | XP de combate +12% · limpia heridas | 8 |
| Ensalada de Repollo   | 14        | 2 Repollo + 1 Zanahoria                      | 17       | Defensa +6%               | 5       |
| Salteado de Brócoli   | 16        | 2 Brócoli + 1 Calabacín + 2 Madera           | 23       | Velocidad de cultivo +10% | 6       |
| Banquete del Bosque | 16 | 1 Papa + 1 Zanahoria + 1 Repollo + 1 Brócoli + 1 Calabaza + 3 Madera | 40 | Daño, defensa y velocidad +20% | 10 |

*RE-SINCRONIZADA el 22/8 (auditoría integral): al pasar los cultivos a dos carriles, siete recetas quedaron pidiendo ingredientes de la escalera vieja — el Puré (Cocina 2, veinte minutos de oficio) pedía cebolla, que es Cultivo 10 (dos días y medio). Regla nueva, vigilada por test: ninguna receta pide un cultivo de nivel mayor que el suyo. El techo de la Cocina subió solo a 16 y la ciruela y la cereza quedan como frutas de venta hasta que haya arte de mermeladas.*

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
| Tiempo hasta granja nivel 21 (8 expansiones) | 63 días                   |
| Con las manos en el juego                    | 12,4 horas (0,8 %)        |
| Tiempo de reloj corriendo sin el jugador     | 99,2 %                    |
| Juego real al día                            | ≈ 12 minutos en 3 visitas |
| Valor producido                              | 248.270                   |
| Lo que el ancla permitía                     | 764.640                   |
| Porcentaje del ancla cobrado                 | 32,5 %                    |

*Re-medido el 22/8 (cargas + escalera en dos carriles): el porcentaje cobrado del ancla casi se duplicó respecto del original (17,6 % → 32,5 %), y los 63 días a nivel 21 (antes 49) son el precio de que los nocturnos existan desde temprano: menos gestos por día, más comodidad.*

La lectura correcta de ese 32,5 % no es « el juego está roto »: es que un idle avanza sin el jugador y eso es su naturaleza. El desglose, tras las cargas:

  - Cultivos: 65 de plata/h con 11 parcelas. El ancla pedía 220.

  - Árboles y rocas: 100 de plata/h con 22 nodos (antes de las cargas eran 9). Con el tope de 4 cargas, el jugador de tres visitas cobra 12 de las 48 recolecciones diarias del árbol: el 25 % de su potencial de guardia, contra el 6 % de antes.

  - Observación para el diseñador (22/8): con las cargas, la XP de Tala se adelanta a los demás oficios (Tala 26 · Cultivo 17 · Minería 11 al llegar a granja 21), porque cada carga paga su talado. La Tala no tiene escalera que se rompa, pero si algún día la tiene, revisar su ritmo de XP.

*El cultivo NO tenía ese problema, y esa era la asimetría: el jugador elige el cultivo que dura lo que dura su ausencia, pero no podía elegir la duración de un árbol. Las cargas del capítulo 4 son la respuesta (21/8): el árbol guarda hasta 4 relojes de producción, así que una ausencia de hasta 2 horas ya no pierde nada.*

**13. Lo que está abierto**

Capítulo honesto. Todo lo que sigue está medido o decidido, pero no implementado.

**13.1 La doma, para el tiempo offline**

RESUELTO el 22/8 — la doma v1 está en el juego. Se abre en GRANJA 10 (« no debe estar disponible al principio »): al vencer un monstruo con sprite de granja (rata, larva, orco, lancero, guerrero, trol), si llevás SU PLATO en la bolsa, hay una chance de que te siga a casa — un bicho a la vez, vive junto al establo. Come 1 CARNE por día (la carne por fin tiene gasto diario; panza de hasta 3 días) y con hambre se pone gris y no trabaja. Trabaja SOLO EN TU AUSENCIA: al cargar la partida recoge las cargas de árboles y rocas que maduraron entre tu última visita y ahora, deja siempre una carga esperándote, y SE QUEDA EL 30 % de comisión (el número del simulador: apertura en granja 10 ≈ 60 % del ancla contra el 32,5 % sin bicho). Minerales afuera, bolsa llena no pierde nada, el F5 no duplica (el turno drena el almacén de relojes igual que un talado). Queda para después: elegir a cuál domar, varios bichos, y que el arte de Suren les dé casita.

**La suerte de la doma: el repago (24/8)**

El diseñador propuso « que sea 1 de cada 100 puedes domar ». Antes de mover el número hay que ver lo que una doma YA cuesta, porque el precio son dos cosas y solo una se ve: la suerte y EL PLATO. Y los platos no se parecen — la Galletita de Cereza de la rata sale 12 de plata y el Costillar Ahumado del orco, 1.228. La escalera de platos ya separa los casos CIEN VECES. Un 1 % encima de eso dejaría al orco en 122.800 de plata: noventa y ocho días de su propio trabajo para comprar su propio trabajo. Ese número no protege la mecánica, la entierra.

La regla que sí se sostiene es el REPAGO —en cuántos días de su propio trabajo se paga el ayudante— y es una BANDA, no un punto: **piso de 2 días** (menos que eso es regalarlo) y **techo de 10** (más que eso, nadie lo doma y la mecánica no existe). La primera versión de la regla pedía cinco días parejos para todos y el propio medidor la corrigió: emparejar un ayudante de 18 de plata/día con uno de 1.247 obligaría a hacer la RATA más difícil que el ORCO, al revés de lo que cualquiera espera del juego.

| Bicho | Su plato | Suerte | Doma esperada | Se paga en |
|---|---|---|---|---|
| Rata (escarba lombrices) | Galletita de Cereza · 12 | 1 de cada 4 | 48 de plata | 2,7 días |
| Larva (abona cultivos) | Papilla de Remolacha · 114 | 1 de cada 4 | 456 de plata | sin precio de lista |
| Orco y los suyos (trabajan tus nodos) | Costillar Ahumado · 1.228 | 1 de cada 6 | 7.368 de plata | 5,9 días |

Los brazos pasaron de 1 de cada 4 a 1 de cada 6 porque a 4 se pagaban en 3,9 días: cerca del piso para lo que rinden. La cuenta entera se re-mide en `tools/auditar-doma.js` — si mañana un ayudante engorda, su suerte tiene que bajar en el mismo commit.

Y un arreglo que el diseñador encontró jugando (« la domé y tiene hambre · mi dios, pobrecita »): el bicho nacía con la panza en cero, o sea hambriento desde el primer segundo, con lo cual el premio llegaba pidiendo. Absurdo por partida doble, porque para domarlo le acababas de dar un plato. Ese plato ahora cuenta: entra a la granja con su primer día de trabajo ya pago.

**13.2 El hueco de Ganadería entre los niveles 4 y 8**

RESUELTO el 22/8: el cupo del establo crece un lugar por nivel de Ganadería (capítulo 8), así que ya no hay niveles mudos entre el Conejo (4) y el Toro (8) — ni en ningún otro tramo de la escalera. Queda como idea futura sumar un animal intermedio (gallina) cuando haya arte.

**13.3 Qué premia del nivel 20 al 150**

DECIDIDO el 22/8: el crecimiento se CAPEA donde termina el contenido (capítulo 5) en vez de prometer cien niveles vacíos. La escalera 20-150 pasa a ser el plan de liberación futura: cada vez que se agregue contenido (un cultivo nivel 25, un animal nuevo, la doma), el techo del oficio sube solo, y con él suben los veteranos que ya acumularon la XP. Ideas anotadas para esa escalera: maestrías de oficio, la doma como contenido de veterano, y el prestigio de granja (ya existe en el código, dormido tras el nivel 50).

**13.4 Las skins del pase**

Cinco skins del pase de batalla están definidas y no implementadas. No es bloqueante para el MVP: hoy no hay pasarela de pago.

**13.5 El estado vive en el cliente**

Este es el riesgo estructural serio y hay que mirarlo antes del token, no después. Hoy la partida se calcula en el navegador del jugador y se sube al guardado. Mientras la moneda no tenga valor real, el incentivo para manipularla es bajo. En cuanto lo tenga, deja de serlo.

El 21/8 se construyó el primer escalón: EL PORTERO DEL GUARDADO. Una Edge Function de Supabase (supabase/functions/guardar/) pasa a ser la única puerta de escritura a la granja: compara cada guardado con el anterior, anota el delta y las sospechas en una bitácora (farm_saves_log) usando los techos del ancla, y escribe con la fecha del servidor. Arranca en MODO SOMBRA — anota, nunca rechaza — hasta calibrar con jugadores reales. El 22/8 quedó EN PRODUCCIÓN: función deployada, bitácora anotando (vista `bitacora`, con nicks) y la puerta vieja sellada — en `farms` quedó una sola policy (leer lo propio); escribir, únicamente a través del portero, verificado contra pg_policies y con partidas reales guardando. Quedan los dos escalones siguientes: activar el rechazo tras calibrar la bitácora (ese día muere el botón 🧪 y se suma la limpieza de la bitácora a 30 días), y que todo lo que toque valor real se calcule solo en el servidor.

**13.6 La cuenta vive en el navegador**

RESUELTO el 22/8 (a falta de activar el proveedor en Supabase — docs/CUENTA-EMAIL.md): el login anónimo muere con el navegador, y la tabla de granjas juntó más de cien « Granjero » huérfanos solo en el testeo. Ahora Configuración → Cuenta permite GUARDAR la granja atándola a un email (enlace mágico, sin contraseñas) y entrar con ese email desde cualquier dispositivo. El que no vincula sigue anónimo, como siempre. Entrar con un email sin cuenta no fabrica granjas nuevas.

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

9.  Toda acción que el jugador dispara CONTESTA algo — un aviso, una línea del registro, un efecto o una ventana. Una acción que termina en silencio es el peor fallo posible: el jugador no puede diagnosticarla desde dentro del juego y concluye, con razón, que la mecánica está rota. Lo vigila tools/auditar-silencios.js, y solo se permite el silencio en guardas de catálogo (un id que no existe: bug de programación, no del jugador) que dejen rastro en la consola.

10. Un clic sobre una ventana se queda en la ventana. Phaser engancha el pointerdown en la página entera, no solo en el lienzo, así que sin puerta un botón de la interfaz también pega un golpe en la granja de atrás — y ese golpe repinta la interfaz, que puede rehacerse ENTRE el apretar y el soltar y comerse el clic (así se rompió la Cocina nueva: « no me deja seleccionar · le doy clic y clickea en la grama »). La puerta es `clicDeInterfaz()` en config.js, va PRIMERA en cada escena, y ninguna vista se repinta si su contenido no cambió (patrón de firma). Lo vigila tools/test-clic-interfaz.js.

**15. Cómo verificar lo que dice este documento**

El proyecto tiene 89 pruebas automáticas y 18 auditores (133 herramientas en total). No comprueban que el código compile: comprueban que el JUEGO cumpla las reglas de arriba. Los más útiles para el diseñador:

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
