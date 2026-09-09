**GOLDEN FARM**

Documento de Diseño de Juego

*Estado real del código · 9 de septiembre de 2026 · revisión 6*

> **Las tres leyes están en `docs/LEYES.md` y este documento se les somete.** El progreso no se
> resetea, el ritmo de los nodos no se toca, y lo cosmético no cuenta como contenido. Si algo de
> lo que sigue choca con una de ellas, el que está mal es este documento.
>
> **Y todas las tablas de aquí salen de `tools/gdd-cifras.js`**, que las imprime EJECUTANDO el
> juego. Hasta la revisión 5 se copiaban a mano leyendo el código, que es exactamente el fallo
> que llevamos dos semanas persiguiendo en otros sitios: un número escrito a mano envejece en
> silencio. Si una cifra de aquí no coincide con esa herramienta, manda la herramienta.

**Qué cambió desde la revisión 5 (26/8)**

*Cosas nuevas para jugar:* la **PESCA v4** entera, que jubila a la v3 — diecinueve especies con
peso real en kilos, cañas que se compran una vez y cobran peaje por lance, nasas que trabajan
solas, la Lonja con sus Escamas y títulos, y el Torneo con ranking de servidor (§4.1); **LA ZONA
NEGRA CON CONTENEDORES**, que convierte una excursión en una decisión — se carga una bolsa antes
de entrar, dentro solo existe lo que llevás, y al morir cae todo y queda tu cuerpo diez minutos
(§9); y **EL MERCADER GOBLIN**, que ya no obliga a aceptar el trato para irse.

*Cosas que cambiaron de fondo:* **todo el contenido cabe en un mes** — las dieciséis expansiones,
la curva de niveles y las tareas del 11 al 50 se re-derivaron a la vez, y la partida al nivel 50
pasó de 372 días a **29,7** (§14); los **ANIMALES son de 24 horas y dan +1 de material**, estilo
Sunflower, con decimales cuando están mal alimentados (§8); **los platos salieron de la economía
de plata** — se comen o se comercian entre jugadores, no se venden al mercado (§10); **el
Lombricario tiene tope de 15 lombrices al día**; y **el enfriamiento de la Zona desapareció**.

*Lo que se derivó y antes estaba escrito a mano:* la **cola de niveles del 11 al 50** (cada nivel
cuesta las mismas horas de granja que el anterior, §5), los **premios del pase** (cada escalón
paga una hora de la granja que tenés a esa altura, §12.1) y las **mezclas de las cañas** contra
su presupuesto con los precios reales.

*La ley nueva, y lo que corrige:* **lo cosmético es terciario** (ley 3). Un título, un marco o un
aura no cuentan como contenido, y un nivel que sólo entrega adorno sigue siendo un nivel vacío.
Se dictó al descubrir que este documento iba a contar 26 niveles como resueltos porque les
llegaba un cosmético. La cuenta honesta está en §14.1: **de 49 niveles, 23 entregan algo jugable**.

*Cómo se verifica ahora:* la suite pasó de 153 a **193 herramientas** (139 pruebas, 24 auditores,
30 medidores y simuladores), y estrena `tools/gdd-cifras.js`, que es la que sostiene la promesa
del subtítulo de este documento.

---

**Qué cambió en la revisión 5 (26/8), para el que venga de la 4**

*Cosas nuevas para jugar:* la **PESCA v3** — nueve especies con su familia, su hora y su clima, cañas que se gastan, peleas con etapas y trampas que trabajan solas mientras no estás (§4.1); **EL CAMINO A LA GUARIDA**, que por primera vez contesta « ¿a qué estoy jugando? » poniendo en fila las diez cartas del Abuelo y el asalto de clan como final; **LA META DE LA SEMANA**, que contesta « ¿qué hago hoy? »; y **EL FLUJO DE LA BOLSA**, los « +1 Piedra · −1 Pico » del margen izquierdo (§13.1).

*Cosas que cambiaron de fondo:* el cartel de la **EXPANSIÓN** dice ahora todo lo que trae, vetas de bronce y oro incluidas — antes se comía justo el dato que decide la compra (§6.1); la **COCINA COCINA DE A UNO** — las tres ollas dejan de ser fuegos en paralelo y pasan a ser una fila (§10); el **TABLÓN** pasa a tener capítulo propio y sus fardos ya pagan lo que un vale vale, que antes era la mitad (§12); las **CARTAS DEL ABUELO** llegan desde el nivel 2 en vez de esperar al final del tutorial; y el juego **no vuelve a pedir el apodo** ni pierde la granja cuando la base de datos está caída — se juega con la copia local y se sube sola al volver.

*Reglas nuevas de la casa:* la **regla 10 crece** — un clic sobre una ventana no solo se queda en la ventana: tiene que llegar a lo que el jugador tocó DENTRO de ella. Y una lección que atraviesa toda la semana y ya tiene nombre propio: **derivar a medias es peor que no derivar**. Un número sacado de una fórmula da confianza; si al lado queda una lista escrita a mano, la confianza es la del número y el fallo es el de la lista. Pasó cuatro veces en cinco días — las cañas invisibles, el Estofado imposible, los clics sordos y los fardos del tablón — y las cuatro tienen la misma forma.

*Cómo se verifica ahora:* la suite pasó de 129 a **154 herramientas**, y estrena algo que no tenía: un arnés con **navegador de verdad** (`test-clic-navegador.js`). Hizo falta porque el resto corre sobre jsdom, que no hace hit-testing ni captura de puntero — o sea que había una familia entera de fallos que las 118 herramientas anteriores no podían ver ni en principio.

**Entrar a la granja: 1.186 KB → 238 KB (24/8, corregido el 26/8)**

Dirección: « sigue tardando en entrar a la granja, algo se ha roto ahí en el inicio ». No se rompió de golpe — se fue rompiendo, que es peor, porque así no lo cazó nadie. El juego son doce archivos de JavaScript y hoy pesan 1.186 KB entre todos; el arranque llevaba tres impuestos encima, ninguno de ellos del juego:

  - **El servidor los mandaba sin comprimir.** Con gzip son 400 KB: viajaba el triple de lo necesario, en cada carga, para todos.

  - **El cargador los pedía en fila**, cada uno esperando al anterior: doce idas y vueltas al servidor puestas una detrás de otra antes de que corriera la primera línea del juego. Eso no se arregla comprimiendo — son viajes, no bytes. Ahora el navegador se entera de los doce de una y los baja en paralelo; el orden de ejecución sigue siendo uno por vez, porque `config` define lo que `state` usa.

  - **Los `.js` iban con `no-cache`**, o sea una ida y vuelta por archivo en cada carga solo para que el servidor contestara « no cambió » — innecesario desde el día que el cargador les puso `?b=GF_BUILD`, que cambia en cada deploy y ya hace imposible reusar código viejo. Ahora se cachean de verdad: la segunda carga de un mismo build no pide nada.

Como el sello del build pasó a ser lo único que avisa que hay código nuevo, dejó de escribirse a mano: **lo calcula el servidor** a partir de los propios archivos del juego (tamaño y fecha de los doce `.js`) y lo inyecta en el `index.html` al servirlo. Un sello que hay que acordarse de actualizar es un sello roto: si cambia una coma en cualquier archivo, cambia el número, y nadie tiene que hacer nada. Lo fija `tools/test-arranque-peso.js`, que además **vigila el peso**: el bulto crece solo, un comentario por vez, y si pasa del tope la suite se pone roja antes de que lo note un jugador.

*Corrección del 26/8:* desde el 25/8 el servidor **quita los comentarios** de los `.js` antes de mandarlos, pero el medidor seguía pesando los archivos de disco. Llevaba contando 222 KB que ningún jugador baja nunca. Lo que viaja de verdad hoy son **238 KB comprimidos**, no 460, y el tope bajó de 460 a 300 — aplicar la marca vieja a la vara nueva habría dejado pasar el doble del juego en silencio. Cuando se arregla una vara hay que reajustar la marca, o el arreglo se convierte en permiso.

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
> **12.** El tablón del pueblo y los vales
> 
> **13.** La interfaz que informa
> 
> **14.** La partida medida
> 
> **15.** Lo que está abierto
> 
> **16.** Reglas de la casa
> 
> **17.** Cómo verificar lo que dice este documento

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

*(La lectura del 22/8 decía que esto llevaba la partida a granja 21 de 49 a 63 días. Esa cifra ya no vale: el 8-9/9 se re-derivaron a la vez la curva de niveles, el coste de las expansiones y las tareas, y hoy el nivel 50 entero está a 29,7 días. Las cifras vivas están en §14.)*

**4. Nodos: tala, minería y pesca**

**Relojes**

  - Árbol: 30 minutos.

  - Roca y veta de mineral: 40 minutos.

  - Laguna: sin reloj propio. Lo que la limita es la CARNADA (ver §4.1).

  - Montículos de tierra y Lombricario: la lombriz es la carnada de la pesca y **el techo de toda la laguna**. Desde el 9/9 hay un tope duro de **15 lombrices al día** (decisión de dirección), y el Lombricario rechaza la tanda entera si no cabe, en vez de recortarla en silencio.

**Cargas: el nodo pasado no se desperdicia (21/8)**

Un árbol o roca ya crecido acumula 1 carga por cada reloj propio extra que pase sin cosecharse, hasta llenarse con 4. Y el nodo VIRGEN — el que nunca se taló — nace lleno (22/8): el jugador nuevo ve la escalera completa en su primer talado, y cada expansión entrega su árbol y su roca cargados como bienvenida (4+4 recursos contra costes de 61-810: regalo, no economía). El estado virgen se consume una sola vez y el F5 no lo resucita. El árbol se llena a las 2 horas de pasado; la roca y la veta de piedra, a las 2 h 40. Y el ritmo (22/8, dictado clic a clic por dirección): los CORTES SUAVES pagan una carga cada uno (+1 madera, −1 hacha); el CORTE PROFUNDO no da ni consume nada; el TOCÓN paga la última. Árbol de 4 cargas: suave(+1) · suave(+1) · suave(+1) · profundo(nada) · tocón(+1) — cinco clics, cuatro maderas, cuatro hachas. De 2: suave(+1) · profundo · tocón(+1). El árbol normal de una carga conserva su tanda clásica de siempre: suave(nada) · profundo(nada) · tocón(+1). La roca y la veta de piedra, igual con su media rota. Las vetas de mineral (bronce en adelante) quedan APARTADAS de la mecánica por decisión de dirección (21/8): reloj simple, una picada y a dormir. Cada picada de mineral rinde 2 (el ancla del 18/8: con 1 picar daba pérdida, porque el pico cuesta más de lo que saca).

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

**4.1 Pesca v4: el peso manda y la lombriz es el techo (1-9/9)**

La v4 jubila a la v3 entera. Lo que cambia no es el minijuego —tirar, esperar el pique, carretear— sino **de qué está hecho un pez** y **qué limita la laguna**.

**El peso, no la rareza.** Cada captura sale con sus kilos, sorteados dentro del rango de su especie, y el peso es lo que la hace valer: un raro enorme puede pagar más que un legendario mínimo, y en la bolsa cada pez ocupa su propia pila con su kg. Diecinueve especies. Eso es lo que hace que valga la pena mirar lo que sacaste en vez de leer una etiqueta de color.

**La lombriz es el invariante que sostiene todo.** Ésta es la decisión central del capítulo y conviene tenerla escrita como se tiene el ancla:

> *Toda ruta de la laguna paga entre 9 y 11,5 de plata por lombriz.*

Cañas, nasas, cebos, noche o día: todas las rutas pagan casi lo mismo por carnada. Con eso, **la carnada es la única palanca de la laguna** — subir el tope de lombrices sube la pesca de forma predecible, y ninguna ruta se puede romper por su cuenta. Se re-mide en `tools/test-pesca-v4-bolsillo.js`, que juega 160.000 lances de verdad en vez de creerle a la fórmula.

**Las cañas: una puerta y un peaje.** No tienen usos. Una durabilidad es un número inventado —lo único que el ancla exige es el cociente precio ÷ usos— y encima obliga a recomprar a mitad de sesión. La caña se compra **una vez** (la puerta: abre su escalón de peces) y cada lance cobra su **mantenimiento en plata**, entero y a la vista.

| Caña | Nivel | Presupuesto | Se paga con | Peaje por lance | Neto por lombriz |
| --- | --- | --- | --- | --- | --- |
| Caña de Junco | 1 | 30 | 2 Madera + 5 de plata | 1 | 9,30 |
| Caña de Bambú | 4 | 400 | 20 Madera + 3 Tablón + 40 de plata | 3 | 9,85 |
| Caña de Hierro | 8 | 1.500 | 1 Cuero + 1 Barra de hierro + 3 Tablón + 40 | 6 | 10,35 |
| Caña de Oro | 12 | 2.000 | 1 Cuero + 1 Barra de oro + 6 Tablón + 200 | 11 | 10,56 |
| Caña del Abuelo | 18 | — | 120 Escamas de la Lonja | 0 | rompe el ancla a propósito |

*Regla de Suren que gobierna esta tabla: **las dos de arriba piden CUERO**, así que mejorar la pesca obliga a criar. Si la caña de oro costara plata pelada, mejorar la pesca sería ahorrar. Y de la caña de junco a la de oro se mejora un 13 %, no un 107 %: ninguna caña puede correr más rápido que la carnada, que es el seguro contra la sobreproducción.*

*El 9/9 la Caña de Hierro recuperó su barra de hierro. Se había quedado sin ella porque no cabía en un presupuesto de 1.000 escrito cuando el cuero valía 55; hoy vale 742, porque un cuero es un día entero de Toro. Se movió el presupuesto a 1.500 — un presupuesto es una vara, no una ley física.*

**Las nasas: el carril que trabaja solo.** Se calan y dan pescado o cebo pasadas sus 2 horas. Pagan MENOS que la caña (la mejor nasa 9,00 contra la peor caña 9,30) y eso es deliberado: si la pasiva le ganara a las manos, nadie tocaría el minijuego.

| Nasa | Nivel | Coste |
| --- | --- | --- |
| Nasa de mimbre | 1 | 9 Madera + 4 Piedra |
| Nasa reforzada | 6 | 3 Tablón + 9 Piedra |
| Nasa de hierro | 12 | 9 Tablón + 2 Piedra |

**La Lonja, las Escamas y el Torneo.** La Lonja es el tablón de la pesca: pide especies concretas y paga en **Escamas**, la moneda que compra lo que la plata no —la Caña del Abuelo, los títulos, la Boya—. Y el Torneo tiene ranking de servidor con cobro por puesto. Las Escamas se emiten sólo ahí, que es lo que impide que la pesca se convierta en una segunda economía paralela.

**5. Oficios y experiencia**

Hay once oficios y cada acción da XP al SUYO. Talar sube Tala; pescar sube Pesca. Esto suena obvio y no lo era: hasta el 18/8 pescar daba experiencia de Cocina.

Cada oficio con escalera tiene TECHO, y el techo se deriva de su contenido (22/8, dirección: « capear el crecimiento hasta el nivel donde hay contenido; más adelante se libera más »). Nadie escribe el número: es el nivel de lo último que el oficio abre, así que cuando entre contenido nuevo el techo sube solo y los veteranos cobran en el acto la XP que ya tenían guardada.

| Oficio | Techo | Escalones | Lo último que abre |
| --- | --- | --- | --- |
| Cultivo | 16 | 15 | Brócoli |
| Pesca | 20 | 22 | Título: Señor de la Laguna |
| Ganadería | 19 | 23 | el lugar 20 del establo |
| Cocina | 16 | 21 | Banquete del Bosque |
| Minería | 11 | 8 | Netherita |
| **Tala · Artesanía · Espada · Hacha · Mazo · Arco** | **150** | **0** | **— nada —** |

**Los seis oficios huérfanos: un hueco de contenido, no un descuido.** Esos seis suben de nivel y no desbloquean absolutamente nada, así que caen al 150 de reserva — un panel que le promete al jugador ciento cincuenta niveles con ciento cuarenta y ocho vacíos. `oficiosSinContenido()` los cuenta en cada ejecución del auditor justamente para que el hueco esté a la vista y no escondido detrás de un número por defecto.

*El 9/9 se probó cerrarlo atándole a Espada, Hacha, Mazo y Arco las veinte armas que ya existen (cuatro tipos × cinco rarezas) con la escalera de las cañas. Se midió y se descartó: Espada nivel 4 son 85 ratas, el 9 son 674 y el 14 son 2.120, mientras el material de esas mismas armas se junta en días. El nivel no acompañaba al material — lo tapaba —, y la XP de combate es opcional, así que un jugador de granja se quedaba con la espada de madera sin entender por qué. Tampoco se dejaron listadas « de adorno »: un panel que anuncia « nivel 4: Espada de Piedra » cuando se forja al 1 miente, y mentir en el catálogo es peor que el hueco. **Decisión pendiente de dirección:** o los cuatro oficios de combate reciben algo que abrir, o se acepta que su nivel es un número de daño y se les da un techo honesto.*

La granja tiene su propio techo de siempre: nivel 50.

**La curva de granja: los diez primeros a mano, la cola derivada (9/9)**

Los niveles 1 al 10 son la decisión que dirección afinó midiendo en papas el 14/8 y **no se tocan**. Del 11 al 50 la cola se DERIVA, y lo que se iguala no es la XP sino el TIEMPO: cada nivel cuesta las mismas horas-celda que el anterior, o sea que su escalón es proporcional a las celdas productivas que tenés a esa altura.

| Nivel | XP acumulada | Escalón | Celdas | XP por celda |
| --- | --- | --- | --- | --- |
| 5 | 550 | 325 | 15 | 21,7 |
| 10 | 14.000 | 5.000 | 21 | 238,1 |
| 11 | 15.100 | 1.100 | 21 | 52,4 |
| 20 | 27.400 | 1.500 | 30 | 50,0 |
| 30 | 45.700 | 2.000 | 39 | 51,3 |
| 40 | 68.100 | 2.400 | 48 | 50,0 |
| 50 | 94.600 | 2.900 | 57 | 50,9 |

*Por qué importa la última columna: antes iba de 33 (nivel 11) a 84 (nivel 50) — dos niveles y medio de diferencia en cuánto tarda cada uno, escondidos en una tabla que parecía suave. Ahora los cuarenta cuestan lo mismo.*

*Y el escalón del 10 al 11 sigue siendo un escalón (5.000 → 1.100), a la vista y sin disimular. No se puede quitar con aritmética: quedan 81.000 de XP para cuarenta niveles, así que ninguno puede costar 5.000 sin robarle a los demás. Lo alto que es lo deciden los diez primeros niveles, que son de dirección.*

*El techo cede ante el mes, no al revés. Cambiar la forma de la cola cambia el reloj aunque la XP total no se mueva —adelantar puntos los cobra cuando la granja produce poco—, así que se re-midió: 100.000 daban 31,3 días, 95.000 dan 30,0. El objetivo es 95.000 y el techo real que sale de los redondeos es 94.600. El número que manda es el mes.*

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

| **#** | **Nivel** | **Coste**                                            | **¿veta?** |
| ------ | --------- | ---------------------------------------------------- | ---------- |
| 1      | 3         | 6 Madera + 4 Piedra                                  |            |
| 2      | 5         | 15 Madera + 10 Piedra                                |            |
| 3      | 7         | 29 Madera + 19 Piedra                                | bronce + oro |
| 4      | 9         | 29 Madera + 24 Piedra + 3 Bronce                     |            |
| 5      | 12        | 37 Madera + 30 Piedra + 4 Bronce                     |            |
| 6      | 15        | 45 Madera + 36 Piedra + 5 Bronce                     | bronce + oro |
| 7      | 18        | 58 Madera + 47 Piedra + 3 Bronce + 2 Hierro          |            |
| 8      | 21        | 68 Madera + 55 Piedra + 3 Bronce + 2 Hierro          | bronce + oro |
| 9      | 24        | 83 Madera + 67 Piedra + 4 Bronce + 3 Hierro          |            |
| 10     | 28        | 95 Madera + 76 Piedra + 3 Hierro + 3 Oro             | bronce + oro |
| 11     | 31        | 112 Madera + 90 Piedra + 4 Hierro + 3 Oro            |            |
| 12     | 35        | 128 Madera + 103 Piedra + 4 Hierro + 4 Oro           | bronce + oro |
| 13     | 39        | 150 Madera + 120 Piedra + 4 Oro + 3 Diamante         |            |
| 14     | 42        | 168 Madera + 135 Piedra + 5 Oro + 4 Diamante         | bronce + oro |
| 15     | 46        | 193 Madera + 154 Piedra + 4 Diamante + 3 Netherita   |            |
| 16     | 50        | 213 Madera + 170 Piedra + 5 Diamante + 4 Netherita   | bronce + oro |

*ABARATADAS EL 8/9 PARA QUE EL MES SE CUMPLA. Con la tabla anterior las dieciséis costaban 252.525 de plata equivalente — **65 días** de producción del jugador de tres sesiones, y eso calculado con la granja ya terminada. Ninguna curva de XP arregla eso: el muro no era el nivel, era el material. Lo que se movió son las HORAS de granja que vale una expansión (de 2 a 6, antes de 2 a 30), que nunca fueron el ancla sino una elección de dirección. El ancla no se tocó: una celda sigue rindiendo 20 de plata por hora.*

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

**6.1 Qué trae cada expansión (26/8)**

Cada expansión entrega **parcela + árbol + roca**. Y siete de las dieciséis —la **3, 6, 8, 10, 12, 14 y 16**— traen además una **veta de bronce** y una **de oro**: cinco celdas productivas en vez de tres, y por eso su precio es mayor (la fórmula cuenta las celdas acumuladas, así que la escalera entera se re-deriva sola).

El diseñador lo pidió así: « debe decir lo que trae… lo digo para que la gente calcule el costo y si vale la pena, y como aún no tenemos wiki pues toca hacer[lo así] ». El cartel del mundo decía « Trae árbol · roca · parcela » con las tres palabras escritas a mano, y se comía justamente el dato que decide la compra. Ahora el texto se **deriva** de la misma lista que pone las vetas en el terreno y que las cobra en el precio, y las expansiones con veta se pintan en dorado para que se distingan sin leer.

Al arreglarlo apareció el fallo de fondo: esa lista estaba escrita **dos veces**, en `config.js` para poner las vetas en el terreno y en `state.js` para cobrarlas más caras. Dos copias de la misma decisión, en dos archivos, sin nada que las ate: quien le agregara veta a la 18 en un lado dejaba al otro cobrando barato, en silencio. Ahora vive una sola vez (`GF.EXP_CON_VETA`) y `tools/test-expansion-trae.js` comprueba, bloque por bloque, que lo que el cartel promete es exactamente lo que el mundo pone.

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

**24 HORAS Y +1 DE MATERIAL (9/9, dirección: « quiero que sean como en SFL »).** Los cuatro animales comparten reloj y rinde: un ciclo de 24 horas y **una unidad** de su material. Ni ciclos distintos ni cantidades distintas — lo que separa a un jabalí de una alpaca es el nivel al que se abre y lo que come, no una tabla de rendimientos que nadie puede tener en la cabeza.

| **Animal** | **Nivel** | **Cuesta el 1.º** | **Material** | **Vale** | **Ciclo** | **Por ciclo** | **Come**            |
| ---------- | --------- | ----------------- | ------------ | -------- | --------- | ------------- | ------------------- |
| Alpaca     | 1         | 480               | Fibra        | 742      | 24 h      | 1             | Trigo               |
| Conejo     | 4         | 960               | Pelaje       | 742      | 24 h      | 1             | Zanahoria o Repollo |
| Toro       | 8         | 1.440             | Cuero        | 742      | 24 h      | 1             | Trigo o Maíz        |
| Jabalí     | 12        | 1.920             | Colmillo     | 742      | 24 h      | 1             | Calabaza o Maíz     |

  - **Cada animal comprado encarece al siguiente de su especie un 50 %.** El precio de la tabla es el del primero.

  - **Los cuatro materiales valen 742 de plata**, y no es un número a ojo: es lo que el ancla dice que vale un día entero de animal más su ración (`24 × (20 + coste de la ración por hora)`). Dirección lo eligió explícitamente frente a la alternativa — *« subir el precio de los materiales »* — cuando el ciclo pasó a 24 h. Consecuencia que hay que tener presente: **un cuero es un día de Toro**, y por eso la Caña de Hierro tuvo que subir su presupuesto (§4.1).

  - **Los cuatro materiales NO se venden.** Salen del establo y entran a la Curtiduría, a las cañas y a las armaduras. Si se pudieran vender, el establo sería una imprenta de plata con reloj de pared.

  - **Si están mal alimentados, el material lleva decimales.** Suren lo reportó: *« dice que dará 0,5 de fibra y me da 1 »*. Ahora un animal a media felicidad rinde 0,5-0,6 y lo que sobra se guarda: el registro dice « produjo 0,5 + 0,5 que llevaba guardado = 1 », que es la única forma de que el jugador entienda por qué su animal rinde menos.

  - **Una ración cuesta 240 de plata y da 33 de felicidad** — o sea que llenar la barra son tres raciones. Dirección lo fijó midiendo con la zanahoria: *« la zanahoria es muy económica; en 16 h obtengo 64 »*, y de ahí salió la ración de 30 zanahorias. La felicidad que da cada comida es proporcional al precio del cultivo, así que no hay un cultivo « tonto » con el que alimentar.

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

**9.1 El contenedor: la Zona en cuarentena (1-9/9)**

Éste es el cambio que convierte una excursión en una DECISIÓN, y la regla que lo gobierna la dictó dirección en una frase: *« una vez en zona negra lo único que se puede ver es lo que tenemos en esa bag o backpack »*.

**Se carga antes de entrar.** En la puerta del portal el jugador elige un contenedor y mete lo que se lleva: flechas, platos, un arma de repuesto. Hay dos, y las mochilas admiten bolsas dentro:

| Contenedor | Huecos | Cuesta |
| --- | --- | --- |
| Bolsa | 8 | 20 de plata |
| Mochila | 20 (y le caben bolsas que suman los suyos) | 200 de plata |

**Dentro, la granja no existe.** Todas las preguntas sobre lo que tenés se le hacen al contenedor: el panel de Equipo, la barra rápida, el contador de flechas, la lista de armas. No es un detalle de interfaz — es lo que hace que llevar poco duela y llevar mucho sea arriesgado. Cerrar esa cuarentena costó **diez fugas** en dos tandas, y las dos últimas estaban en el sitio donde el jugador va cuando algo no funciona: el panel de Equipo dejaba equiparte la espada que habías dejado en casa y NO dejaba equipar la de repuesto que sí habías cargado.

**Morir cuesta de verdad.** Cae el contenedor entero y un 5 % por cada pieza de armadura puesta, y queda **tu cuerpo diez minutos** en el sitio donde caíste, con todo dentro. Volver a por él es la segunda mitad de la mecánica. El cuerpo es UNO —vive en `G.tumba`, y lo que se dibuja es su reflejo, no una copia con vida propia— y cada cuerpo y cada montón de botín sabe **a qué mapa pertenece**: lo que dejaste en el pantano no aparece en la guarida.

**Y no se pierde nada en silencio.** Al volver a la granja, lo que no cabe en la bolsa se queda en el contenedor en vez de evaporarse. Es la ley 1 aplicada al detalle más pequeño: el jugador solo pierde lo que el juego le dijo que iba a perder.

**Sin enfriamiento (9/9).** Se entra a la Zona cuando se quiera. Dirección: *« ya se puede entrar sin problemas cada vez que uno quiera »*. Y el enfriamiento no bastaba con bajarlo a cero: era una HORA GUARDADA en la partida, así que hubo que recortar también las que los jugadores ya tenían escritas — cambiar una regla no borra el estado que esa regla dejó.

**10. Cocina**

La Cocina convierte lo recolectado en platos que curan y dan un efecto temporal. Es el sumidero que le da sentido al pescado y a la carne.

**9/9 · LOS PLATOS SALIERON DE LA ECONOMÍA DE PLATA.** Dirección: *« los platos son solo para curarse en zona negra; no se venden a menos que se les vendan a los players por plata… la cocina no es una imprenta »*. Ya no hay botón de venta ni en la Cocina ni en la tienda. Un plato se **come** (curación y buff) o se **comercia entre jugadores**; el único canal contra el juego es el tablón, que está acotado a un pedido al día.

Esto cierra sola la que era la mayor imprenta abierta del juego: `dishPrice = valor de los ingredientes × 1,25`, multiplicado otra vez por la maestría de Cocina — o sea que cualquier cultivo que pasara por la olla valía entre 1,25 y 1,48 veces lo que vale crudo, **sin ocupar una celda**, y la olla nunca se saturaba. Vender crudo era siempre el juego mal jugado. La decisión de dirección lo resolvió sin tocar un solo número: si el plato no se vende, la prima no existe.

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

**26/8 · la Cocina cocina DE A UNO.** Dirección: « no se cocina en simultáneo todos a la vez… se cocina solo el primero, al terminar el 2do, y sigue la secuencia ». Las tres ollas dejan de ser tres fuegos en paralelo y pasan a ser una FILA: la primera está al fuego y las otras esperan turno. El reloj que muestra cada una es siempre « cuánto falta para tener ESTE plato en la mano », no cuánto dura su receta — con la fila las dos cosas dejan de coincidir.

Esto revierte la decisión del 3/8 (« se pueden cocinar varios a la vez »), y baja el rendimiento de la Cocina a un tercio. No afecta a la economía: los platos no son un motor de plata — los de nivel alto valen menos que sus ingredientes, o sea que se cocinan para comerlos (curación y buffs), no para venderlos. Lo que sí cambia es el valor del perk de la **Cocina nivel 2**: « +1 olla » ya no es +1 fuego sino +1 sitio en la fila. Dirección lo dejó así a propósito — sirve para encolar un plato distinto antes de irse—, pero el rótulo se corrigió a « +1 sitio en la fila »: un perk que se anuncia mejor de lo que es se paga con un jugador que se siente estafado.

Cómo está resuelto, porque de eso depende que aguante: no hay estado « cocinando / esperando » ni turno que haya que hacer avanzar. Cada plato guarda su HORA DE FIN, calculada al encolarlo desde la del último de la fila. La fila entera son tres relojes puestos en hora — y un reloj no se olvida de correr. Por eso volver de tres horas es idéntico a haber estado mirando: `checkCooking` recoge todo lo vencido, en orden, en una sola pasada. Lo fija `tools/test-cocina-fila.js`.

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

**11.1 Después del tutorial: el camino y la semana**

El tutorial enseña a jugar. Lo que no hacía —y es lo que separa un juego de una colección de sistemas— era contestar las dos preguntas que el jugador se hace apenas lo termina:

- **« ¿A qué estoy jugando? »** → **el camino a la Guarida.** Los diez hitos son las diez cartas del Abuelo (docs/LORE.md, capítulo 6) y el final es bajar a la Guarida con un clan. No es contenido nuevo: es la lista que ya existía, puesta en fila y con una marca de por dónde va. El camino se deriva de `CARTAS_ABUELO`, así que si mañana se escribe una carta más, el camino crece solo. Los hitos se marcan por NIVEL alcanzado, no por carta leída: el que juega y no abre el buzón igual avanzó, y castigarlo sería castigar a la mayoría. El último hito nunca se alcanza en solitario, y el panel lo dice con todas las letras — es lo que convierte el clan de una función del menú en el final de una historia.
- **« ¿Qué hago hoy? »** → **la meta de esta semana.** Con nombre, barra, cuánto falta y cuánto queda de plazo.

Lo segundo es la lección más barata del proyecto: **el pedido semanal ya existía**, escondido como una línea entre seis dentro del tablón. No hizo falta un sistema nuevo; hizo falta darle una cara. Lo que funciona y nadie ve vale lo mismo que lo que no existe, y sale mucho más barato de arreglar.

Las tres capas viven en la misma pestaña, en este orden: LA SEMANA (lo de hoy), EL CAMINO (lo de siempre) y LA GUÍA (los 29 pasos del tutorial, que bajan al final a propósito: sirven la primera hora y después estorban arriba de lo que el jugador viene a mirar). El botón del menú lleva el marcador de la semana, porque un panel que no se anuncia es un panel que nadie abre. Lo fija `tools/test-el-camino.js`.

**12. El tablón del pueblo y los vales**

El tablón es el sitio donde el pueblo le pide cosas al jugador. Abre al terminar el tutorial y es la razón principal para entrar cada día: los encargos caducan.

**Qué hay colgado en cualquier momento**

| encargo | cada cuánto | ejemplo medido (granja 9) |
| --- | --- | --- |
| Tres pedidos **diarios** | se renuevan a las 00:00 UTC | Piedra ×5 → 75 plata · 2 vales · Papa ×20 → 40 plata · 1 vale |
| Un pedido **semanal** | cierra el domingo | Pescado ×80 → 400 plata · 6 vales |
| Un pedido **mensual** | el encargo largo | Pescado ×240 → 1.200 plata · 18 vales |
| Un **tema de fin de semana** | viernes a domingo | La Gran Cosecha · Fiebre de la Leña · El Día de la Cantera · El Torneo de Pesca · El Festín del Pueblo |

Cada pedido tiene un remitente del pueblo (Doña Rosa, Tomás el panadero, Ramón el pescador…), paga **plata + vales + XP**, y la XP va **a la skill de lo que entregás** — llevar piedra sube Minería, no Cultivo. Un pedido que no te sirve se puede **descartar** y el vecino cuelga otro.

Dos incentivos deliberados: **el primer pedido del día paga los vales ×2**, y el pedido semanal es lo que el juego usa como « meta de la semana » en el panel de objetivos (ver §11.1). El semanal y el mensual no llevan el ×2 porque ya pagan de más.

**8/9 · el tablón compraba minerales al 12,5 % de su valor.** Tasaba con una tabla vieja —bronce 12, hierro 15, oro 30— mientras el juego VENDE con la de verdad —160, 240, 280—. Seis Hierro pagaban 180 por 1.440 de valor. Los cultivos, la madera y la piedra estaban perfectos, y por el mismo motivo por el que los otros estaban rotos: ésos sí preguntaban el precio en vez de copiarlo. La regla que custodia el arreglo cabe en una frase: **el tablón no inventa precios, los pregunta.**

**12.1 El pase de batalla: cada escalón paga una hora de tu granja (9/9)**

Treinta escalones, carril gratuito y carril VIP. Lo que cambió el 9/9 no es el contenido sino **quién decide las cantidades**.

Los escalones pagaban 10 de plata en el 2, 7.740 en el 7 y 15 en el 14: ×774 entre el más flojo y el más rico, y **sin ningún orden** — el escalón 7 pagaba más que los otros veintinueve juntos. La causa no eran los números: la tabla fijaba CANTIDADES a mano (« 3 Pan de Trigo ») en una economía donde los precios se derivan. Tres panes eran baratos el día que se escribió esa fila; hoy un pan cuesta 2.580.

Ahora **la tabla dice QUÉ y el código dice CUÁNTO**: cada escalón paga UNA HORA de la granja que el jugador tiene a esa altura, la misma vara de las expansiones. Y « esa altura » no se estima — se deriva del reloj de la propia curva de niveles, porque el tiempo de un nivel es su XP dividida por las celdas que la producen.

| Escalón del pase | Granja a esa altura | Celdas | Lo que paga |
| --- | --- | --- | --- |
| 1 | 6 | 15 | 300 |
| 10 | 13 | 24 | 480 |
| 20 | 31 | 42 | 840 |
| 30 | 50 | 57 | 1.140 |

El carril entero cuesta 17.814 de plata sombra contra los ~20.300 de antes: **redistribuye, no infla.** El $Golden queda fuera de la derivación a propósito — la auditoría del 18/8 lo dejó clavado en 60 de devolución para que el VIP no se autofinanciara, y derivarlo reabriría ese agujero por la puerta de atrás.

*Lo que queda abierto, dicho en voz alta: cuatro escalones (el 2, el 7, el 14 y el 18) dan un objeto cuya unidad vale 2 o vale 2.580, y no hay cantidad legible que dé su altura. La cantidad se recorta a lo que se lee de un vistazo —200 en pilas, 60 en semillas y platos— y `paseDesviados()` los enumera en vez de taparlos con un recorte silencioso. El arreglo es cambiar el OBJETO, y eso lo decide el diseñador.*

**El vale, y por qué tiene un precio**

Un vale son **20 de plata** al gastarlo (`VALE_EN_PLATA`) y se emite uno por cada **160 de plata** entregada (`VALE_EMISION`): una prima del 12,5 % sobre lo que el pedido paga en plata. Dirección fijó esa prima el 2/9 — *« las misiones no son tan complicadas »*. El tablón los emite con esa vara y la tienda de canje tiene que devolverlos con la misma.

Que las dos puntas usen la misma vara no es elegancia, es lo único que cierra las fugas. El 18/8 no la usaban y había una ruta que multiplicaba plata por **×800**: se emitían vales por escalones del valor del pedido y se gastaban a precio fijo, así que entregando tres papas se compraban semillas de maíz. Persiguiendo casos de uno en uno eso no se arregla; atando emisión y gasto al mismo número, se cierra solo.

**Lo que se puede canjear**

| premio | cuesta | entrega |
| --- | --- | --- |
| Fardo de 20 hachas | 1 vale | 40 de plata en hachas |
| Fardo de 20 picos | 1 vale | 40 de plata en picos |
| Lata con 13 lombrices | 1 vale | 39 de plata en carnada |
| Sobre de semillas (tu mejor cultivo) | 2 vales | 80 de plata en semillas |

La regla: **lo que la plata no compra, los vales sí.** Nunca madera ni piedra — eso se trabaja.

**26/8 · tres de los cuatro premios cobraban el doble.** Dirección preguntó por el sobre de semillas (« con 1 vale pude obtener 40 semillas de cereza »). Medido, el resultado fue el contrario del sospechado:

| premio | cuesta | entregaba | por vale |
| --- | --- | --- | --- |
| Fardo de 10 hachas | 1 vale (40) | 20 de plata | 20 |
| Fardo de 10 picos | 1 vale (40) | 20 de plata | 20 |
| Lata de 6 lombrices | 1 vale (40) | 18 de plata | 18 |
| Sobre de semillas | 2 vales (80) | 80 de plata | **40** ✓ |

El sobre no era el exploit: era el único premio bien tasado, y al lado de tres malos negocios parecía un chollo. La causa: el 18/8 se derivó el PRECIO de un contenido escrito a mano (« 10 hachas »), y `valesDe` tiene un piso de un vale, así que todo fardo que valga menos de 60 de plata redondea a un vale entero. El sobre se salvó porque ahí se derivaron LAS DOS PUNTAS.

Ahora todos los fardos se arman igual: `valeFardoN(id)` elige cuántas unidades llenan un vale, y de ahí salen el precio, la entrega **y la etiqueta** — que antes decía « 10 hachas » con un número a mano y habría mentido el día que cambiara el precio del hacha. Hoy dice « Fardo de 20 hachas ». Lo vigila `tools/auditar-vales.js`, que exige que todo premio entregue ~40 de plata por vale en TODOS los niveles de Cultivo.

**Lo que queda abierto: la FORMA del sobre.** Su valor es correcto en todos los niveles, pero su tamaño oscila de 80 semillas a 1, y su precio de 2 a 18 vales, según cuál sea tu mejor cultivo. A Cultivo 8 el premio es *una* semilla de maíz por 18 vales (tres días de tablón). Y en los empates de nivel —cereza y girasol son las dos de Cultivo 4— cuál te toca lo decide el orden de las claves del objeto: 40 semillas por 2 vales, o 1 por 5. Pendiente de decisión de dirección.

**13. La interfaz que informa**

Tres reglas de la casa gobiernan la interfaz: una acción siempre contesta (regla 9), un clic sobre una ventana se queda en la ventana Y llega a lo que el jugador tocó dentro de ella (regla 10), y ninguna vista se repinta si su contenido no cambió (patrón de firma). Lo que sigue son las piezas que las cumplen.

**13.1 El flujo de la bolsa**

Dirección, 26/8: « en Sunflower, cuando algo se te mete al inventario o consumís algo, te aparece en un costado de la pantalla: +1 piedra, −1 pico ». En el margen izquierdo, un chip por objeto que entra o sale, incluidas las monedas (vender cuenta las dos mitades). Los repetidos se agrupan: talar un árbol son cuatro cargas y sale un solo chip que marca +1 → +2 → +3 → +4, no cuatro apilados. Se apagan a los 2,6 s y no pueden robar un clic.

Lo interesante no es el chip: es de dónde sale. La vía obvia era poner un aviso en cada sitio que toca el inventario —más de doscientos— y esa vía tiene un final conocido en este proyecto: el que se olvide uno queda mudo para siempre (las cañas invisibles del 25/8, el Estofado del 26/8). Así que el flujo **no se avisa, se deduce**: se le saca una foto a la bolsa y se restan las dos fotos. Lo que sale de esa resta es, por definición, todo lo que entró y salió — y sigue funcionando con cualquier objeto que se agregue mañana sin tocar una línea. `tools/test-flujo-bolsa.js` lo comprueba inventando un recurso que el flujo no conoce.

De paso se partió en dos la lista de « qué hay en la bolsa », que estaba escrita DENTRO de canonicalStacks: ahora `bolsaCuentas()` es la lista y hay dos vistas, casillas de 99 para la rejilla y cantidades para el flujo. Repetir esa lista es exactamente lo que produjo el bug de las cañas.

**14. La partida medida**

Estas cifras salen del simulador (tools/simular-partida.js), no de una estimación. El perfil es el de un jugador que entra tres veces al día.

**TODO EL CONTENIDO EN UN MES (8-9/9).** Dirección: *« todo el contenido tiene que ser posible ir desbloqueándolo con mucho un mes »*. Antes de esa orden, el nivel 50 estaba a **372 días** del jugador de tres sesiones. Hoy:

| **Qué se midió** (3 sesiones/día, hasta granja 50) | **Resultado**             |
| -------------------------------------------- | ------------------------- |
| Tiempo hasta granja nivel 50 (16 expansiones, 57 celdas) | **29,7 días**  |
| Con las manos en el juego                    | 7,2 horas (1,0 %)         |
| Tiempo de reloj corriendo sin el jugador     | 99,0 %                    |
| Juego real al día                            | ≈ 15 minutos en 3 visitas |
| Valor producido                              | 106.755                   |
| Lo que el ancla permitía                     | 470.880                   |
| Porcentaje del ancla cobrado                 | 22,7 %                    |

*Hicieron falta TRES palancas a la vez y conviene que quede escrito, porque yo mismo creí que bastaba con una: la curva de XP, las horas que cuesta una expansión (que estaban en 65 días de producción para las dieciséis) y las TAREAS del 11 al 50, que sumaban 68 días solo en minar. Mover una sola no habría movido el resultado.*

*Y una corrección que se pagó publicando un número falso: el « todo en un mes » se reportó como hecho antes de comprobar que en todo el mapa hay UN nodo de netherita con reloj de 12 horas, y las tareas pedían 125. Eran 62,5 días mínimos con el jugador conectado las veinticuatro horas. Las cantidades se derivan ahora de lo que el mineral puede dar de verdad.*

La lectura correcta de ese 22,7 % no es « el juego está roto »: es que un idle avanza sin el jugador y eso es su naturaleza. El desglose:

  - Cultivos: 52 de plata/h con 19 parcelas. El ancla pedía 380.

  - Árboles y rocas: 98 de plata/h con 38 nodos. Con el tope de 4 cargas, el jugador de tres visitas cobra 12 de las 48 recolecciones diarias del árbol: el 25 % de su potencial de guardia.

  - El otro perfil, para tenerlo a mano: **1 sesión/día tarda 37 días en llegar al 20** y eso la curva no lo arregla — toca el juego tres minutos y cobra una cosecha y cuatro cargas por nodo. Es una decisión aparte, si se quiere tomar.

**14.1 Qué entrega cada nivel de granja (ley 3)**

De los 49 niveles, **23 entregan algo jugable** — una expansión, un plano, un edificio de nivel 2, capacidad de cofre o vales del tablón. Los otros **26** entregan el bono de venta (+1,5 %, unas 3 de plata por hora, invisible) y un cosmético.

Los 26: 6, 8, 11, 14, 16, 17, 19, 20, 22, 25, 26, 29, 30, 32, 34, 36, 37, 38, 40, 41, 43, 44, 45, 47, 48 y 49.

*Esta cuenta es la ley 3 aplicada a este documento, y nació de un error mío: el 9/9 iba a escribir aquí que « 26 niveles mudos pasaron a 3 » porque el plan cosmético por fin se entregaba. Dirección lo paró en el acto — para que a alguien le importe un adorno, primero le tiene que gustar el juego. Un cosmético no cierra un hueco de progresión; sólo lo tapa. **Qué se entrega en esos 26 niveles es la decisión de contenido más grande que este documento tiene abierta.***

*(El hallazgo técnico de aquel día sí vale y queda: el plan cosmético llevaba semanas sin repartir nada porque la línea que lo entregaba preguntaba por un texto que jamás nombra un cosmético. Un `if` que nunca es cierto no da error, no deja log y no lo ve nadie.)*

*El cultivo NO tenía ese problema, y esa era la asimetría: el jugador elige el cultivo que dura lo que dura su ausencia, pero no podía elegir la duración de un árbol. Las cargas del capítulo 4 son la respuesta (21/8): el árbol guarda hasta 4 relojes de producción, así que una ausencia de hasta 2 horas ya no pierde nada.*

**15. Lo que está abierto**

Capítulo honesto. Todo lo que sigue está medido o decidido, pero no implementado.

**15.0 Lo que la revisión 6 deja sobre la mesa**

Las cinco decisiones abiertas, ordenadas por lo que pesan:

1. **Qué entrega los 26 niveles sin recompensa jugable** (§14.1). Es la más grande. El material para elegir ya existe: nodos sueltos, lugares de establo, huecos de nasa, semillas de escalón alto, vales, capacidad de bolsa o cofre.
2. **Los seis oficios huérfanos** (§5): o reciben algo que abrir, o se acepta que su nivel es un número de daño y se les da un techo honesto.
3. **Los cuatro escalones del pase** cuyo objeto no da su altura (§12.1). Se arregla cambiando el objeto, no la cantidad.
4. **La escalera de cañas se aplanó arriba** (§4.1): al subir la de Hierro a 1.500, la de Oro (2.000) queda a ×1,33. Lo que de verdad cobra la de oro es su barra, no su plata — pero si el último escalón tiene que sentirse, hay que subirlo.
5. **Recargar dentro de la Zona sigue esquivando la muerte.** Cerrarlo pide una política de desconexión, y matar a alguien por una caída de red sería perder progreso sin borrar caché: justo lo que la ley 1 prohíbe. Decisión de dirección.

**15.1 La doma, para el tiempo offline**

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

**15.2 El hueco de Ganadería entre los niveles 4 y 8**

RESUELTO el 22/8: el cupo del establo crece un lugar por nivel de Ganadería (capítulo 8), así que ya no hay niveles mudos entre el Conejo (4) y el Toro (8) — ni en ningún otro tramo de la escalera. Queda como idea futura sumar un animal intermedio (gallina) cuando haya arte.

**15.3 Qué premia del nivel 20 al 150**

DECIDIDO el 22/8: el crecimiento se CAPEA donde termina el contenido (capítulo 5) en vez de prometer cien niveles vacíos. La escalera 20-150 pasa a ser el plan de liberación futura: cada vez que se agregue contenido (un cultivo nivel 25, un animal nuevo, la doma), el techo del oficio sube solo, y con él suben los veteranos que ya acumularon la XP. Ideas anotadas para esa escalera: maestrías de oficio, la doma como contenido de veterano, y el prestigio de granja (ya existe en el código, dormido tras el nivel 50).

**15.4 Las skins del pase**

Cinco skins del pase de batalla están definidas y no implementadas. No es bloqueante para el MVP: hoy no hay pasarela de pago.

**15.5 El estado vive en el cliente**

Este es el riesgo estructural serio y hay que mirarlo antes del token, no después. Hoy la partida se calcula en el navegador del jugador y se sube al guardado. Mientras la moneda no tenga valor real, el incentivo para manipularla es bajo. En cuanto lo tenga, deja de serlo.

El 21/8 se construyó el primer escalón: EL PORTERO DEL GUARDADO. Una Edge Function de Supabase (supabase/functions/guardar/) pasa a ser la única puerta de escritura a la granja: compara cada guardado con el anterior, anota el delta y las sospechas en una bitácora (farm_saves_log) usando los techos del ancla, y escribe con la fecha del servidor. Arranca en MODO SOMBRA — anota, nunca rechaza — hasta calibrar con jugadores reales. El 22/8 quedó EN PRODUCCIÓN: función deployada, bitácora anotando (vista `bitacora`, con nicks) y la puerta vieja sellada — en `farms` quedó una sola policy (leer lo propio); escribir, únicamente a través del portero, verificado contra pg_policies y con partidas reales guardando. Quedan los dos escalones siguientes: activar el rechazo tras calibrar la bitácora (ese día muere el botón 🧪 y se suma la limpieza de la bitácora a 30 días), y que todo lo que toque valor real se calcule solo en el servidor.

**15.6 La cuenta vive en el navegador**

RESUELTO el 22/8 (a falta de activar el proveedor en Supabase — docs/CUENTA-EMAIL.md): el login anónimo muere con el navegador, y la tabla de granjas juntó más de cien « Granjero » huérfanos solo en el testeo. Ahora Configuración → Cuenta permite GUARDAR la granja atándola a un email (enlace mágico, sin contraseñas) y entrar con ese email desde cualquier dispositivo. El que no vincula sigue anónimo, como siempre. Entrar con un email sin cuenta no fabrica granjas nuevas.

**16. Reglas de la casa**

> **Las tres LEYES viven en `docs/LEYES.md`, no aquí.** Una ley no se discute, no se optimiza y no
> se « mejora » con buen criterio propio; si una tarea choca con una, la que cede es la tarea.
> Hasta el 9/9 estaban sueltas en comentarios de código, y eso ya falló una vez — se cambió el
> ritmo de los nodos porque no había dónde mirar antes de tocar. En resumen:
>
> **Ley 1 · El progreso no se resetea.** Sólo borrando caché. Ninguna migración corre dos veces,
> nada de lo ya comprado se cierra por una regla nueva, y un guardado viejo se recorta, no se
> borra. Y una constante que cambia no basta si esa constante ya dejó estado escrito.
>
> **Ley 2 · El ritmo de los nodos no se toca.** Árbol 30 min, roca y veta de piedra 40, tope 4.
> El ancla se acomoda a este reloj, nunca al revés: el ritmo de talar y picar es lo que el
> jugador SIENTE.
>
> **Ley 3 · Lo cosmético es terciario.** Un título, un marco, un emote o una skin no cuentan como
> contenido. Un nivel que sólo entrega adorno sigue siendo un nivel vacío. Para que a alguien le
> importe un cosmético, primero le tiene que gustar el juego.

Y debajo de las leyes, las normas de diseño que vienen de decisiones de dirección y que conviene no reabrir sin motivo.

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

    **26/8 · la otra mitad de la misma regla: un clic sobre una ventana también tiene que llegar a lo que el jugador tocó DENTRO de ella.** El arrastre universal de ventanas (`makeHoldDrag`) capturaba el puntero al APRETAR, así que el navegador le entregaba a la ventana el `mouseup` y el `click` sin importar lo que hubiera debajo: el manejador del elemento tocado nunca corría. Los botones se salvaban por `DRAG_EXCLUDE`, una lista escrita a mano de lo que sí se puede tocar — y la Cocina de dos paneles estrenó un clicable que no es un botón. El arreglo no fue agregarlo a la lista, sino capturar el puntero recién cuando el arrastre empieza de verdad, pasado el umbral de 5 px que la función ya medía. Un clic quieto no captura nada. Lo vigila `tools/test-clic-navegador.js`.

**17. Cómo verificar lo que dice este documento**

El proyecto tiene **139 pruebas automáticas y 24 auditores**, más 30 medidores, simuladores y generadores: **193 herramientas** en `tools/`.

**La primera de todas, para este documento:** `tools/gdd-cifras.js` imprime EJECUTANDO el juego todas las tablas que estas páginas afirman — el ancla, los cultivos, los minerales, los techos de oficio, la curva de granja, las expansiones, la ganadería, las cañas, el pase y la cuenta de niveles con recompensa jugable. Existe porque hasta la revisión 5 las tablas se copiaban a mano leyendo el código, y un número copiado a mano envejece en silencio: es literalmente el fallo que este proyecto lleva dos semanas persiguiendo en el tablón, en las cañas, en el pase y en la tabla de cosméticos. Un documento que se llama « estado real del código » y no se puede re-ejecutar es una promesa sin respaldo.

Una de ellas, `tools/test-clic-navegador.js`, corre en un **Chromium de verdad** (puppeteer). Existe porque el 26/8 el diseñador reportó dos veces que no podía elegir una receta en la Cocina y las dos veces se diagnosticó mal: el arnés de pruebas es jsdom, y jsdom no hace hit-testing ni implementa la captura de puntero, así que NO PODÍA ver el fallo ni en principio. Si no hay Chromium instalado el archivo lo dice y se salta; para instalarlo, una vez: `npx puppeteer browsers install chrome`. No comprueban que el código compile: comprueban que el JUEGO cumpla las reglas de arriba. Los más útiles para el diseñador:

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
