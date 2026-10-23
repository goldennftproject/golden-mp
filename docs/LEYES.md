# Las leyes de Golden Farm

## Ajustes añadir y pico básico único — 23/10/2026

Dirección aprobó «si» a aplicar `añadir.docx` y unificar madera/piedra. Zona Negra manual disponible para Free y VIP, manteniendo requisitos normales de equipo, nivel y descanso. Sólo las nuevas excursiones de un clic requieren VIP; una iniciada conserva su resolución aunque venza la membresía. Cliente y guardado validan la restricción.

Desde la tercera expansión, cada coste actual de Plata/materiales se multiplica por 1,30, redondeando hacia arriba, sin acumulación entre expansiones. Las dos primeras y las obras ya pagadas no cambian. El modelo productivo actual sólo cobra Plata desde la tercera; no se añaden materiales que no existían. La tabla heredada de materiales recibe el mismo factor. No cambian tiempos, geometría ni recompensas.

El bono diario reduce un 15% el tiempo de lo sembrado durante una hora desde el reclamo confirmado. La siembra real se verificó en 180 → 153 segundos. El tope especial inicial está desactivado en esta versión; por compatibilidad, si se habilitara, también recibe la reducción después de aplicar el tope. No se confirmó una falla general del cálculo anterior ni se atribuye el reporte a esa rama inactiva. No acelera retroactivamente parcelas en curso. El paquete muestra el estado y tiempo restante, que antes no indicaba.

Sólo se ofrece el Pico de Piedra como básico. Los picos de madera existentes pasan uno por uno a piedra, incluido equipo, accesos rápidos y contenedores/tumba; la conversión no se repite al recargar. Los premios diarios de tres picos pasan a piedra. Los picos superiores, saldos y progreso no se borran.

## Logros del diseñador — 21/10/2026

Tras recibir `logros.docx` y la propuesta de incorporación, dirección aprobó «aplica esto» con la captura que confirma: contar plantar (no cosechar), unidades recolectadas de madera/piedra, metas acumulativas, cobro único validado por el servidor y una visita por granja y día.

Se muestran 25 metas en ocho categorías; premios totales 16.400 Plata, no repetibles. Papa 100/300/1000 → 100/400/2000; ciruela 100/250/1200 → 110/330/2200; zanahoria 100/250/1200 → 100/300/2200; cebolla 100/250/1200 → 150/300/2400; calabacín 100/250/1300 → 200/350/2600; madera 100/200/500 → 100/200/500; piedra 100/250/1000 → 100/250/800; visitas 10/50/100/500 → 10/50/150/500. Alcanzar una meta no consume el contador ni reinicia la siguiente.

Se mantienen los cobros antiguos como historial, sin volver a ofrecerlos. Las siembras históricas proceden sólo de estadísticas previamente guardadas en servidor; no se inventa recolección histórica en unidades ni visitas. La recolección nueva conserva décimas NFT. Los contadores se corroboran con las evidencias y energía del guardado aceptado: no constituyen una simulación autoritativa completa ni garantizan protección contra bots. El navegador no fija totales ni confirma premios. Cobros y visitas usan autenticación, recibos y CAS.

Las visitas requieren el VIP único; ver la granja registra el progreso, no hace falta recoger semillas. El límite de tres semillas diarias no limita el logro. Un destino cuenta una vez por día UTC; al cambiar el día puede contar otra vez. No hay auto-visitas. USDT sigue desactivado.

## Nodo a elección en cada expansión — 20/10/2026

Dirección aprobó «cada expansión dará terreno + un cupo productivo + un nodo básico gratuito a elección entre árbol, roca o parcela»: «Claro que permite elegir qué obtener» y «Bien, perfecto, así me gusta. Hazlo así a ver si le gusta al diseñador».

Cada obra terminada entrega un vale acumulable, no un nodo asignado automáticamente. Se elige en el Cobertizo y consume un vale; el nodo requiere cupo y emplazamiento disponible. Las vetas avanzadas no se incluyen. No cambia el tamaño, precio ni duración de la expansión.

Las partidas con capacidad productiva del sistema anterior reciben una sola vez los vales omitidos desde la segunda expansión (expansiones previas menos una), conservando el saldo no usado de la primera. La marca `produccion.valesV:2` hace la compensación idempotente y el servidor impide regresarla. Las partidas del sistema histórico que ya entregaba nodos automáticamente conservan esos nodos sin duplicar regalos.

## Actualización autorizada — VIP / Free (20/10/2026)

Dirección, tras entregar `vip y free.docx`: «Tú avanza con todo y luego ya vemos qué modificar. […] la estamina […] se refiere a la energía de la granja, no […] del combate».

Esta autorización incorpora la excepción VIP a los relojes de nodos: Free conserva 30/40 minutos; VIP usa un 90% del tiempo (27/36), también en cocina y obras de expansión. No se reescriben trabajos ya iniciados. La energía de granja es 50 Free / 100 VIP y se regenera en cuatro horas; la de combate no cambia.

Un solo VIP de 30 días, comprado por 10 Golden: fabricación en lotes, publicaciones P2P sin cupo diario, comisión 7% frente a 10% Free y Objetos de Granja repetibles. Free puede publicar una vez por día UTC y comprar un objeto activo. Las compras anteriores conservan producción y cobro al vencer VIP; el límite se aplica a nuevas compras. La comisión se captura al publicar; las publicaciones históricas conservan su 5%.

El pase queda desactivado sin borrar su historial. Recompensas diarias, ciclo de siete días y confirmación del servidor: cultivos 15% más rápidos por una hora; cinco semillas de papa; tres picos de madera; dos papas asadas; dos picos de piedra; cinco semillas de zanahoria; 50 Plata. El descuento de cultivo se fija al sembrar, no altera cultivos en curso.

Decisiones iniciales ajustables: UTC para cupos y premios; cancelar P2P no devuelve el cupo; visitas VIP como resumen de lectura, una semilla de papa por granja y máximo tres al día, sin sustraer recursos al dueño. No se cargan partidas ajenas como propias ni se exponen saldos.

Depósitos y retiros USDT continúan desactivados. La frecuencia futura solicitada es Free una vez por mes / VIP sin límite de frecuencia, nunca sin saldo ni reservas. Esta entrega no habilita pagos reales ni garantiza retorno monetario.

Dictadas por dirección. **No son preferencias ni recomendaciones: son leyes.** No se discuten,
no se optimizan y no se "mejoran" con buen criterio propio. Si una tarea choca con una de éstas,
la que cede es la tarea.

Hasta hoy vivían sueltas en comentarios de código y mensajes de commit, y eso ya falló una vez:
cambié el ritmo de los nodos por mi cuenta porque la ley no estaba escrita en ningún sitio donde
mirar antes de tocar. Este archivo existe para que eso no vuelva a pasar.

---

## Ley 1 — El progreso no se resetea

> *« El único motivo por el cual se debe resetear una partida es cuando se actualiza borrando
> caché. Si el jugador no borra caché, entonces no tiene por qué resetearse en la partida. »*

Consecuencias prácticas, todas aprendidas rompiéndolas:

- Ninguna migración puede correr en cada `hydrate` sin bandera de "ya migrado".
- Nada de lo que el jugador ya compró puede quedar cerrado por una regla nueva. Si mañana se
  pone un requisito, cierra la **compra**, nunca lo comprado.
- Un guardado viejo con datos que la regla de hoy no permitiría se **recorta**, no se borra.
- Y al revés: una constante que cambia no basta si esa constante ya dejó **estado escrito**.
  Fue exactamente el caso del enfriamiento de la Zona (`zonaCdHasta`).

### Aclaración de dirección — servidor autoritativo al cargar (16/10/2026)

> « Claro, hay que invalidar las cargas locales. O sea, tiene que sí o sí funcionar a través de lo que se muestra en el servidor. »

Esta instrucción sustituye la recuperación automática local anterior. Al abrir se valida la cuenta
contra Auth y se carga exclusivamente su fila remota. Si falta la fila, se confirma un inicio
limpio en el servidor; una copia local con más progreso no la reemplaza. Sin conexión se bloquea
la entrada, sin inventar una partida ni borrar la remota. Los respaldos quedan para diagnóstico,
no para restauración automática. El reseteo total de cuentas del 16/10 fue una operación explícita
y excepcional del usuario, no permiso para resetear cuentas en despliegues habituales.

## Ley 2 — El ritmo de los nodos

### Precisiones de dirección — 16/10/2026

> « Y el diseñador quiere que la granja mida 9 por 9. Así que hazlo y a ver qué tal. »

El inicio nuevo usa 9×9 celdas totales; el borde deja 7×7 interiores. Las dieciséis
expansiones se ajustan para encajar. Las partidas existentes conservan su geometría guardada
para no recortar objetos ni perder progreso.

### Actualización de dirección — 17/10/2026

> « Sí, haz la granja de 6x6 y desactiva la pesca por ahora, pero conserva todo para recuperarla más adelante. Revisa bien que entre todo y que las expansiones encajen. »

El inicio nuevo sustituye 9×9 por 6×6 totales, con 4×4 interiores (espacioV:4).
Las partidas existentes conservan su versión. La pesca queda pausada mediante bandera,
sin borrar catálogos, arte, equipo, peces ni progreso. Las dieciséis expansiones se conservan.

### Vuelta a las dimensiones anteriores — 17/10/2026

> « vuelve a las dimensiones anterior »
> Confirmado « si » a « volver al inicio de 9×9, manteniendo la pesca desactivada ».

Se restaura espacioV:3 (9×9) para partidas nuevas, con sus expansiones originales.
La pesca permanece pausada. Se mantiene compatibilidad con partidas 6×6 ya guardadas,
sin recolocar objetos, cambiar sus expansiones adquiridas ni resetear progreso.

> « Cuando digo genera plata, me refiero a que generan el signo de pesos, bueno, de dólar, golden, la moneda premium sería. »
> « Claro, corregilo y movelo a otro lugar. »

Esta interpretación fue sustituida por la instrucción posterior del mismo día:

> « Sí, hazlo así entonces. Cambia los objetos para que produzcan plata y agrega el banco con esa tasa inicial ajustable. Los depósitos y retiros de USDT los dejamos desactivados por ahora. »

Los Objetos de Granja producen Plata y se gestionan en su sección independiente. Reclamo cada
24 horas, acumulación máxima de un día, vida útil de 180 días y un punto de energía por cobro.
Banco interno: tasa inicial de 10.000 Plata por Golden, ajustable en el servidor. No es una
paridad garantizada con USD. No habilitar depósitos ni retiros USDT, ni convertir retroactivamente
la producción anterior de Golden. Los saldos y las cuentas existentes se conservan.

### Producción inicial unificada — 17/10/2026

> « deben tener el mismo porcentaje que seria 0.87diario segun mis cuenta ya eso lo modificamos mas adelante!!! pero ese deria el inicial de todos! »

Los siete objetos producen el 0,87 % diario del coste sobre la referencia inicial de
10.000 Plata/Golden: coste en Golden × 87 Plata/día, sin excepción para el Granero.
Equivale a unos 115 cobros diarios de recuperación nominal a esa referencia, no garantizada.
La producción no sigue automáticamente los cambios de tasa del Banco. Se conservan precios,
propiedad, saldos, fechas y condiciones de cobro. Sustituye el balance anterior de 105 días.

> *« Los árboles tienen que tener cuatro cargas a las dos horas, cada treinta minutos una carga,
> y la piedra cada cuarenta minutos, cuatro cargas, como estaba antes. A partir de ahí hacé el
> ancla para lo que se te antoje, pero eso es una ley. »*

Árbol: 1 carga cada **30 min**, tope 4. Roca y veta de piedra: 1 cada **40 min**, tope 4.

El ancla (20 plata por celda-hora) se acomoda a este reloj, nunca al revés. El motivo no es
aritmético: **el ritmo de talar y picar es lo que el jugador siente**, y eso no se toca para que
cierre una cuenta.

## Ley 3 — Lo cosmético es terciario

> *« Si no dan nada a nivel jugabilidad, a nivel que permitan al jugador conseguir algo en el
> juego, más allá del aprecio visual que puedan llegar a tener, no tiene sentido añadirle esas
> cosas al jugador en ningún lugar. Para que al jugador le interesen los cosméticos, primero le
> tiene que gustar el juego. Cuando el jugador se encariña con el juego, ahí es cuando de repente
> van a querer cosméticos. »*

Un título, un marco, un emote, un aura o una skin **no cuentan como contenido**. Un nivel que
sólo entrega cosmético sigue siendo un nivel vacío, y llamarlo lleno es taparse los ojos.

Lo que esta ley prohíbe:

- Rellenar un hueco de progresión con cosméticos y darlo por cerrado.
- Reportar "N niveles vacíos pasaron a M" contando los que se llenaron con adorno.
- Proponer cosmético como solución a un problema de recompensa.
- Gastar tiempo de desarrollo o de arte en adorno mientras haya algo jugable sin terminar.

Lo que **no** prohíbe: que el cosmético exista. El pase y los niveles ya tienen su plan escrito y
puede quedarse. Lo que no puede es contar como respuesta a "¿qué gana el jugador acá?".

El orden de prioridad, dicho por dirección: **jugable primero, todo lo demás después** — y lo
cosmético no es lo segundo, es lo tercero o más abajo.

## Ley 4 — El animal que no come no da

> *« Le da hambre cada 24h. Si tienes la comida se la das, sino triste. El animal no come y no
> da nada y sigue el CD de 24h. No come = \*\*\* »*

Dictada por dirección en Discord el 11/9 a las 17:55. Reemplaza el rinde con decimales del 8/9.

- Cada ciclo (24 h) el animal tiene hambre **una** vez. Una comida por ciclo; la segunda no se
  acepta.
- Si comió en el ciclo, al cumplirse da su unidad **entera**. Si no comió, da **nada**.
- El reloj de 24 h **no se detiene ni se reinicia** porque el animal no haya comido.
- No hay fracciones, ni « guardado », ni « rinde 0,5 »: o da, o no da. Lo que un guardado viejo
  llevaba guardado se redondeó a una unidad a favor del jugador, una sola vez (ley 1).

Lo custodia `tools/test-establo-hambre.js`.

---

## Ley 5 — Lo que no está en su PC, no existe

> *« Todo lo que hagas, e incluso lo que hagas en tu sandbox, y que yo lo apruebe como un
> cambio, lo pondrás para que yo pueda hacerle deploy. »*

Dictada por dirección el 15/9, después de perder una tarde entera: ocho commits —el portero del
mercado, el orden del pantano, el combate, el freeze de la pestaña, el muñeco de la Zona y la
vida por nivel— se quedaron en el contenedor de la nube. Golden hizo el deploy y Render publicó
los archivos de la noche anterior, sin una sola línea de lo de ese día. El diseñador probó el
juego y dijo, con razón, que no estaba implementado.

El repo vive en **dos copias**, y solo una se publica:

| | dónde | qué es |
|---|---|---|
| la mía | el contenedor de la nube | donde trabajo y corro la suite. Su `git` es un cuaderno: **no llega a ningún lado solo** |
| la suya | `C:\Users\pauli\Desktop\golden\golden-mp` | la que `deploy.bat` sube y Render publica |

- **Un cambio aprobado termina copiado a su PC, en el mismo turno.** Commitear en el contenedor
  no es entregar: es tomar nota. Si no se copió, para el juego no existe.
- Nunca se escribe encima a ciegas: él también toca su copia (el arte, sobre todo). Primero se
  lee su archivo, se compara con mi versión de antes del cambio, y solo si coinciden se pisa.
- `public/index.html` conserva **su** sello `GF_BUILD`: lo reescribe `deploy.bat` en cada deploy,
  y pisarlo llena el diff de ruido.
- Y después se comprueba: se vuelve a leer el archivo desde su disco y se busca dentro lo que
  acabo de agregar. Que el commit diga OK no es que haya llegado.
- Vale para todo lo aprobado, no solo para el código del juego: el SQL, la Edge Function, los
  documentos para el diseñador y las herramientas de medición van por el mismo camino.

El cómo está en `CLAUDE.md`, en la raíz del repo.

---

# La pregunta del MVP

*Esto NO es una ley: es una decisión con fecha de caducidad. Vive aquí porque es lo que arbitra
cada recorte mientras dure el MVP, y el sitio donde se miran las leyes tiene que ser el mismo
donde se mira esto. El día que se conteste, se borra.*

> **¿Alguien vuelve a jugar siete días seguidos?**

Dictada por dirección el 9/9. De las tres preguntas que un MVP podía contestar, es la única que
hoy vale algo: la de la economía con valor real no se puede probar sin token ni pasarela, y
« ¿es divertido? » es demasiado vago para decidir nada con ella. La retención es lo que mata a
los juegos de granja, es barata de medir y no necesita nada que todavía no exista.

## Cómo se usa para decidir

Medido con el simulador, a tres sesiones diarias el jugador llega al **nivel 10 a los 7,0 días**
(eran 8,7 hasta el 14/9: al bajar el techo a 25, el mismo mes de XP se reparte entre menos
niveles y cada uno rinde más). De ahí sale la regla práctica:

> **El MVP vive entre el nivel 1 y el 12. Todo lo que un jugador no ve en su primera semana no
> es parte de esta prueba.**

Delante de cualquier propuesta, la pregunta es una sola: *¿esto cambia si alguien vuelve el día
siete?* Si la respuesta es no, no entra en el MVP — y da igual lo terminado que esté, lo caro
que haya salido o las ganas que dé de enseñarlo.

Consecuencias que ya se siguen de esto, para no tener que rediscutirlas:

- **Los niveles 21 al 50 no son un problema del MVP.** Nadie llega. El techo se baja a donde de
  verdad se llega, y las 16 expansiones se re-reparten solas — no se quita ninguna (ley de
  dirección: las dieciséis no se tocan). Desde el 10/9 el techo es **un solo número**
  (`FARM_NIVEL_MAX`): expansiones, cola de XP, cofre, altar y la escalera de tareas cuelgan de
  él. Bajarlo no borra contenido: el mes de XP se reparte entre menos niveles, así que cada
  nivel es más gordo y cada uno entrega algo. **El 14/9 se bajó a 25**: la partida entera pasa de
  29,7 a 26,3 días, el cofre queda en 12/15/19 y el altar en el 17. Lo custodia
  `tools/test-techo-a-un-numero.js`.
- **Lo que suma superficie sin sumar bucle se ESCONDE, no se borra**: el pase, los logros, el
  álbum, la doma, el torneo, el asalto de clan, los títulos de la Lonja. Detrás de una bandera,
  vuelven el día que se quiera. Cada panel de más es algo que puede confundir y algo que puede
  romperse, y ninguno contesta la pregunta.
- **El « hueco de las 8 horas » NO existe, y conviene que quede escrito por qué.** Estuvo aquí
  media hora como « lo más urgente del proyecto », y era falso. El 8,2 h sale del simulador con
  perfil de **tres sesiones al día**: mide reloj de pared incluyendo la ausencia, no esfuerzo —
  o sea que dice « el jugador plantó y se fue a dormir », no « el juego lo frena ».
  Calculado sobre las tablas, con papa (3 min, 15 XP por ciclo) y las 3 parcelas de arranque:

  | nivel | XP | papas | si te quedás jugando |
  |---|---|---|---|
  | 3 | 90 | 6 | ~6 min |
  | 4 | 225 | 15 | **~15 min** |
  | 5 | 550 | 37 | ~40 min |
  | 6 | 1.250 | 84 | ~1 h 25 |

  Y el cupo de semillas tampoco frena: es `40 × parcelas` = **120 siembras al día** con tres.
  Un jugador de día 1 que se sienta veinte minutos llega al 4 y roza el 5.

  Lo que sí queda, y es otra pregunta: *puede* seguir jugando — ¿el juego le da un motivo? Eso no
  se contesta con una tabla, se ve en el playtest. Va ahí, no aquí.

  **La lección, que es lo que justifica el párrafo:** un número de simulador no significa nada sin
  saber qué perfil simula. Éste llegó a escribirse como ley antes de que nadie lo comprobara.
- **Si el mercado entre jugadores está abierto durante la prueba, el portero de guardado tiene
  que salir de modo sombra antes.** No por seguridad —eso puede esperar— sino porque un solo
  jugador duplicando envenena todos los números que la prueba iba a dar. O el P2P se apaga, o el
  portero sube. Abierto y en sombra a la vez, no.

---

## Cómo se usa este archivo

### Actividad para futuros retiros · 21/10/2026

El diseñador propuso «una condición de retiro podría ser haber gastado 2000 de estamina […] aparte de tener el vip». El usuario aprobó avanzar: «Claro, lo que dijo es que avancemos con las sugerencias que acabas de dar».
Se refiere exclusivamente a energía de granja: 2.000 puntos confirmados, alcanzados una sola vez y conservados aunque venza el VIP. VIP activo es un requisito independiente para una futura solicitud; no se descuenta progreso por retiro. No se acredita historial previo sin evidencia. El servidor conserva el contador y corrobora cambios de acciones y presupuesto energético al aceptar cada guardado. Son comprobaciones sobre snapshots, no un sistema antifraude completo ni una garantía frente a bots. Acciones no corroborables no suman. El canje interno no se bloquea. Depósitos y retiros USDT siguen desactivados.

Antes de tocar un reloj, una curva, una recompensa o una puerta: leerlo. Antes de proponerle algo
al diseñador: leerlo. Si una ley nueva se dicta en Discord o por voz, **se escribe acá el mismo
día**, con la cita textual — no parafraseada, porque la mitad del valor de una ley está en cómo
la dijo quien la dictó.
