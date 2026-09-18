# Golden Farm — TO-DO

*Actualizado el 9 de septiembre de 2026. La versión anterior era del 11 de AGOSTO y estaba
podrida: la mitad de sus puntos los habían resuelto rebalances posteriores sin que nadie los
tachara, y otros hablaban de sistemas que ya no existen (la pesca v2, el pase con `usos` de caña,
el `GF.TESTEO` que lleva semanas en 0). Una lista que hay que leer con desconfianza no es una
lista: es ruido con formato. Esta empieza limpia.*

**Antes de tocar nada:** [`docs/LEYES.md`](docs/LEYES.md) — el progreso no se resetea, el ritmo
de los nodos no se toca, y lo cosmético no cuenta como contenido.

---

## 🎯 La pregunta del MVP (9/9, dirección)

> **¿Alguien vuelve a jugar siete días seguidos?**

Todo lo de abajo se ordena por eso. A tres sesiones diarias el jugador llega al nivel 10 a los
**7,0 días** (eran 8,7 hasta que el 14/9 bajó el techo a 25), así que **el MVP vive entre el
nivel 1 y el 12**. Delante de cualquier tarea, la
pregunta es: *¿esto cambia si alguien vuelve el día siete?* Si no, no entra. Está desarrollado
en `docs/LEYES.md`.

**El camino al MVP, en orden:**

- [x] ~~**1 · Tapar el hueco de las 8 horas.**~~ **NO EXISTÍA.** El 8,2 h era el simulador con
  perfil de tres sesiones diarias: mide que el jugador se fue a dormir, no que el juego lo
  frene. Calculado sobre las tablas, quien se queda jugando llega al nivel 4 en ~15 minutos y
  al 6 en ~1 h 25 (ver LEYES.md). Lo que queda es otra pregunta —*¿el juego le da un motivo
  para quedarse?*— y ésa va al playtest.
- [x] **2 · Bajar el techo de granja** — `FARM_NIVEL_MAX = 25` (14/9). Se cambió UN número y el
  resto se acomodó solo, que era el trabajo del 10/9: las 16 expansiones caen en
  3,4,5,6,7,9,10,11,13,15,16,18,20,21,23,25; el cofre pasa de 13/23/33 a **12/15/19**; el altar
  nivel 2, del 27 al **17**; las tareas siguen siendo los mismos 40 peldaños, ahora repartidos
  entre el 11 y el 25 (ninguno se pierde, ninguno se repite); la cola de XP sigue costando el mes
  (`FARM_XP_TECHO`, 95.000). *Medido: `simular-partida 3 25` da la partida entera en **26,3 días**
  (con 50 eran 29,7) y ningún nivel queda mudo. Suite 143/143 en verde.* Efecto secundario que sí
  toca el día siete: con menos escalones cada uno rinde más, así que el **nivel 10 llega a los 7,0
  días** (antes 8,7) — el jugador que aguanta la semana la termina con la granja más grande, no
  más chica. Los premios del pase se re-midieron contra el techo nuevo (el nivel 10 cae al 23 % del
  mes, el 21 al 79 %).
- [x] **3 · Esconder tras bandera** — `GF.MVP = 1` en config.js. Desaparecen del menú y de toda
  puerta (atajos, buzón) Pase, Misiones del pase, Logros, Álbum, Clan, Cosméticos y
  Leaderboard; la doma no se dispara; el torneo no cuelga en la Lonja; los títulos no se
  anuncian como premio; el cartel de nivel no vende el cosmético. Esconder, no borrar: todo
  vuelve con `GF.MVP = 0`. *Suite en verde el 10/9: doma, Lonja y carta del tutorial se prueban con
  la bandera apagada, que es lo que custodian. Sin Chromium todavía.*
- [x] ~~**4 · Decidir el mercado P2P**~~ **Abierto** (dirección, 14/9), y el portero subió antes:
  modo rechazo en el proyecto nuevo desde el 14/9.
- [x] ~~**El mercado contra el portero**~~ **arreglado en el código (15/9), FALTA UN SQL Y EL DEPLOY.**
  El P2P se abrió el 14/9 y el portero pasó a rechazo el mismo día: nunca habían corrido juntos.
  El techo de plata de un guardado rápido es ~2.084 y un maíz del mercado vale 1.200; cobrar dos
  ventas, comprar 300 de madera o retirar tu propia publicación se rechazaba, y `porteroRechazo()`
  devolvía la granja **con el ítem ya entregado**. Ley 1. Reglas v2: el portero lee `market` con
  la llave de servicio y levanta el techo por lo cobrado, lo comprado y lo retirado, anotando en
  `farms.mercado_ack` lo ya contado para que un permiso no se gaste dos veces. Nueve casos nuevos
  en `test-portero-reglas.js`, incluidos los tres «agujeros» de antes.
  → **De tu mano:** SQL Editor → `sql/mercado-portero.sql` → Run; después Edge Functions →
  `guardar` → pegar `supabase/functions/guardar/index.ts` → Deploy. Ese SQL además le pone llave
  al mercado (hoy el vendedor puede editar el `price` de su propia fila, y con el portero leyendo
  precios eso sería imprimir plata).
- [x] ~~El suelo del pantano~~ **queda como está** (dirección, 15/9: « déjalo como está, al menos
  por ahora »). Pantano ×0,63 · cañón de piedra ×1,00 · grietas ×0,83 · guarida ×0,71.
- [x] ~~El $Golden como sistema~~ **se queda** (dirección, 15/9: « me parece que no era eso a lo
  que se refería »). Lo que había que quitar era el nombre « Esencia » y el « se usa para pescar »,
  que ya está hecho. La moneda sigue: animales del establo, kit de emergencia, adornos y pase.
- [x] ~~La rotura de la armadura~~ **confirmada** (dirección, 15/9: « es cuando se gasta por
  completo la durabilidad… eso es lo correcto »). Solo se rompe lo que ya está en cero, con un
  10 % por muerte. Una pieza abandonada en cero aguanta unas diez muertes antes de irse.
- [ ] **La larva a 22 segundos** (15/9). Con el refuerzo de los bichos pasó de 12 a 22 s de pelea:
  es la más larga de las tres de entrada. Dirección la mira jugando — « ya veremos qué dice el
  diseñador si siguen muriendo muy pronto los bichos o no ». Se baja con `MOB_REFUERZO_LVL1`.
- [ ] **La rejilla de movimiento de Tibia, sin adoptar (14/9).** Del tercer documento
  (« Velocidad de movimiento ») se tomó el TERRENO y no la rejilla, y el motivo está medido: con
  el preset GOLDEN, del nivel 1 al 25 el paso va de 300 ms a 250 ms — **un solo breakpoint en toda
  la partida** — y el héroe quedaría más lento que hoy (3,33 celdas/s contra 4,17). La parte de
  « el nivel te hace más rápido » no tiene dónde pasar con 25 niveles. Si algún día el techo sube
  mucho, o hay botas y monturas que sumen speed, vale la pena volver a mirarlo: la curva y los
  breakpoints están descritos en `GF.SUELO` (config.js).
- [x] ~~**La vida del héroe se planta en 160 al Combate 10**~~ **resuelto el 15/9** (diseñador: « ¿agregamos
  vida por nivel? »). Ahora sube 7 por nivel de Combate y no se corta: 163 al 10, 233 al 20, 443 al
  50. La pendiente sale de los dos hitos viejos (60 de vida del nivel 1 al 10), y la recta va por
  encima de los escalones en todos los niveles, así que nadie perdió vida (ley 1). Lo custodia
  `tools/test-vida-por-nivel.js`.
  *El diagnóstico que llevó hasta acá, que vale conservar:* la vida subía en dos
  hitos (100 → +20 al Combate 5 → +40 al Combate 10) y del 11 en adelante **no sube nunca más**.
  O sea que el Combate alto no entrega nada: es el mismo problema que los seis oficios huérfanos,
  con otro nombre.
  *Medido el 14/9 con `tools/medir-combate.js` — y hizo falta medirlo tres veces, corrigiendo dos
  supuestos escritos a mano (una armadura que el jugador no tiene y una vida que sí crece).* Con
  los números de verdad, al día 7 (Combate 10, 160 de vida, armadura 1) la araña y el goblin se
  matan en 3-4 golpes y te matan en 46-53: **el combate está blando, no roto**. Subir el daño de
  los bichos no es la salida — se probó reescalarlos para que todos maten en ~18 golpes y la
  cuenta aplanaba el bestiario entero (la rata pegando 12 y el trol 20), justamente porque la
  vida se planta temprano. La salida es dar vida (o defensa) más allá del Combate 10, y eso es
  contenido, no una perilla. **No bloquea el MVP: se mira jugando la semana.**
- [x] ~~**¿La parada tiene techo?**~~ **contestado el 15/9**: « si la de madera no debería tener parada
  xD ». El primer escalón de cada tipo dejó de parar (se deriva de `ri === 0`, no del nombre del
  arma), y de la piedra para arriba la fórmula sigue igual. Medido: el jugador del día 1 pasó de
  3,7 a 2,8 ratas con la vida llena. Queda mirar JUGANDO si allá arriba la parada se vuelve
  demasiado generosa — con espada de oro y Espada 30 sube para todo el bestiario, no solo para la
  rata. Si se nota, las perillas están en el documento: `TIBIA_BLOCK_MAX`, la recuperación de las
  cargas y el 0,15 de `heroDefensa`.
- [ ] **La cuenta por email — para después del playtest** (dirección, 15/9: « esto lo pasamos
  para luego »). Hoy la cuenta es ANÓNIMA y vive en el localStorage del navegador: si alguien
  limpia la caché o cambia de máquina, pierde la granja. **El panel ya está escrito y en vivo**
  (Configuración → Cuenta): enlace mágico sin contraseñas, « Guardar mi cuenta » ata el email a
  la cuenta anónima actual —mismo `user_id`, la granja no se toca— y « Entrar con mi email » la
  trae a cualquier dispositivo con `shouldCreateUser: false`, así que un email sin cuenta no
  fabrica un Granjero nuevo. *Verificado el 15/9: el proveedor Email ya está ACTIVO en el
  proyecto nuevo y el portero no tiene nada atado a lo anónimo.* **18/9: el dashboard quedó
  completo** — proveedor Email activo, Site URL `https://golden-mp.onrender.com` y el redirect
  `https://golden-mp.onrender.com/**`. Dirección lo desaplazó (era « para después del playtest »)
  porque el diseñador no podía probar en incógnito sin perder su granja. **Lo que queda es la
  prueba, no la configuración:** vincular la granja de dirección desde Configuración → Cuenta y
  después entrar con ese mismo email desde OTRO navegador y ver que aparece la misma granja —
  si apareciera una granja vacía, el vínculo no se hizo y hay que mirarlo antes de contárselo a
  nadie. Y antes del lanzamiento, un SMTP propio: el de fábrica de Supabase son ~30 correos/hora
  (Authentication → SMTP Settings; Resend o Postmark). Entrar con Google es trabajo aparte
  (proyecto en Google Cloud, consentimiento, client ID) y no cambia lo que se busca, que es que
  la cuenta persista: el enlace mágico a una dirección de Gmail ya lo resuelve.
- [ ] **5 · Que alguien lo juegue una semana** sin saber cómo está hecho. Ni Golden, ni Suren,
  ni yo.

---

## 🔴 Decisiones de dirección — fuera del MVP, para después

Están desarrolladas en el GDD §15.0, con sus números medidos. Aquí solo el titular:

- [x] ~~**Qué entregan los 26 niveles sin recompensa jugable.**~~ **Resuelto el 14/9, y en buena
  parte se resolvió solo.** Con el techo en 50 eran 26 de 49 niveles con nada más que el bono.
  Bajarlo a 25 dejó la cuenta en 20 de 24 niveles entregando algo jugable y ninguno del todo mudo:
  solo cuatro (8, 14, 22 y 24) traían el bono invisible más un cosmético, que la ley 3 no cuenta
  como contenido y que en MVP está escondido. Dirección eligió taparlos con capacidad de cofre
  (+5), y NO se escribieron los cuatro números: se pregunta qué niveles quedaron callados, así que
  si el techo se vuelve a mover se recalculan solos. Lo custodia `tools/test-nivel-callado.js`,
  que además lo comprueba con techo 20, 30 y 50.
- [x] ~~**Los seis oficios huérfanos**~~ **CERRADO el 15/9.** Las cuatro respuestas del diseñador, implementadas.
  Cuatro respuestas, cada una con su trabajo:
  · **ARMAS: « que al día 7 estén en 30 ».** Hoy el día 7 cae en 20. **Re-medido el 15/9, y las dos
    cuentas anteriores estaban mal:**
      · el auto-ataque es cada **2 s** (`ATTACK_MS`), no cada segundo. Estar en Espada 30 pide
        2.867 golpes = 410 por día = **13,7 minutos de pelea PURA diaria**, contra los 16 min/día
        de manos en el juego que da el simulador con TODO incluido (cosechar, talar, minar,
        pescar). O sea que la curva de hoy da por sentado que pelear ES el juego.
      · y **subirle la vida a los bichos NO mueve esta aguja**, contra lo que anoté el 15/9 por la
        mañana: el intento se cuenta POR GOLPE (`addTries` en cada ataque, acierte o no) y el
        golpe sale cada 2 s pase lo que pase. Más vida = matás menos bichos en el mismo rato, no
        das más golpes. Lo que manda es el TIEMPO peleando, no cuántos bichos caen.
    La palanca sigue siendo la **A** del documento (hoy 50), y ahora se puede elegir por lo que se
    espera que el jugador pelee:
      3 min/día → A ≈ 11 · **5 min/día → A ≈ 18** · 8 min/día → A ≈ 29 · 14 min/día → A ≈ 51 (hoy)
    **[x] DECIDIDO el 15/9: A = 20** (y 10 en el Arco, conservando la proporción 2:1 del
    documento). Con eso Espada 30 cuesta 1.145 golpes y cae en el día 7 con unos 5,5 min de bosque
    diarios, un tercio de la sesión. La forma de la curva no se tocó, y el test sigue custodiando
    los ejemplos del documento alimentándole la A del documento. **Con esto la lista del diseñador
    queda cerrada.**
  · [x] **TALA: requisito para subir de nivel la granja en los últimos niveles** (15/9: « ejemplo
    para subir a nivel 30 que pida nivel 35 de tala… es un número de ejemplo, no tiene que ser así
    estrictamente »). Hecho. Del nivel **18** en adelante —que es `nivelEscalado(30)`, o sea el
    « nivel 30 » del ejemplo traducido a nuestro techo— la granja pide **Tala = nivel − 4**.
    Los números salen de la partida, no del ejemplo: medida la curva real con el simulador
    (granja 18 → Tala 19 · 20 → 20 · 22 → 21 · 25 → 24), el requisito queda **3 a 5 niveles por
    debajo** de lo que el jugador ya tiene. El que taló como cualquiera ni se entera; el que
    ignoró el bosque se frena. Y si frena, la barra de granja lo dice (« Tala 17/21 — te falta
    talar »): un requisito que para sin explicarse es un muro mudo. Lo custodia
    `test-nivel-callado.js` §1c, que comprueba la holgura contra la curva medida.
  · [x] **ARTESANÍA: escondida, no borrada** (15/9: « hazla intacta y la dejamos para la próxima
    actualización »). Sale del panel de oficios y nada más: la XP se sigue sumando con cada forja
    y cada reparación, el guardado la sigue llevando. `SKILLS_ESCONDIDOS` en state.js; el día que
    reciba contenido, se saca de esa lista y vuelve con todo lo acumulado.
  · [x] **COMBATE anclado a las armas** (15/9: « deja los que hay en el código 1/4/8 »). Hecho.
    `ARM_DEF[x].lvl` ya tenía la escalera escrita —madera 1 · piedra 4 · bronce 8 · oro 12 ·
    diamante 16— y **no la leía nadie**: era un campo muerto. Ahora la Herrería la exige. Ojo con
    la diferencia respecto de la puerta que se sacó el 9/9: aquella pedía el OFICIO DEL ARMA y se
    mordía la cola (para forjar la espada de piedra había que dar 85 ratas con una espada, y la
    que tenías era la de madera); ésta pide el NIVEL DE COMBATE, que sube matando con cualquier
    cosa. **Vigilar en el playtest:** la XP de combate es opcional, así que un jugador de pura
    granja se queda con la espada de madera — ahora por decisión, no por accidente.
> *Historia del punto, para no perderla: el 9/9 se probó atarles las armas y se midió que era un
> muro (85 ratas para la espada de piedra) — descartado y explicado en el código. El 11/9 pasaron
> a subir por INTENTOS con la fórmula de Tibia del diseñador (`docs/SKILLS-TIBIA.md`,
> `test-skills-tibia.js`): arrancan en 10, cada golpe cuenta, matar no entrena. El 15/9 el
> diseñador contestó las cuatro preguntas y quedó hecho todo salvo la A (arriba).*

- [ ] **EN STANDBY hasta la segunda parte** (dirección, 15/9): « la caña del abuelo espera a la
  segunda parte porque no hemos agregado las trampas ». Lo medido queda abajo para cuando se
  retome.
- [ ] **La escalera de cañas, aplanada arriba — pero NO se arregla con plata.** Al subir la de
  Hierro a 1.500, la de Oro (2.000) queda a ×1,33. Y la Caña del Abuelo tiene la tabla de bandas
  **copiada literal** de la de Oro, cinco cifras idénticas hasta el tercer decimal: el peldaño que
  pide 120 escamas y un legendario pesca la misma mezcla que una caña de Pesca 12. *Medido el
  14/9: el valor esperado por pez va 15,0 → 18,3 → 22,4 → 29,6 → 29,6.* **Se intentó darle cola
  propia (más raro/épico/legendario) y `test-pesca-v4-bolsillo` lo rechazó**: toda caña tiene que
  pagar entre 9 y 12 de plata por lombriz, y con la cola nueva pagaba 20,14. La escalera NO
  progresa en plata por lance — progresa en qué especies abre, en el peso y en los récords. Lo
  que le falta al Abuelo es IDENTIDAD (especies propias, un récord que solo él consiga), que es
  contenido de pesca y no un número. Revertido, con la medición escrita en el código.
- [x] ~~**Recargar dentro de la Zona sigue esquivando la muerte.**~~ **Cerrado el 14/9 sin tocar
  la ley 1.** No hacía falta una política de desconexión: el agujero era que la vida se guardaba
  solo AL ENTRAR a la Zona, así que el F5 te devolvía la barra llena del portal. Ahora viaja al
  guardado cada `ZONA_HP_GUARDA_S` (10 s) mientras te pegan, con throttle. El F5 pasa a ser lo
  mismo que salir caminando —que ya era legal—: volvés a la granja con la vida que te quedaba y
  el viaje se cierra solo. Al que se le corta el internet no le pasa nada que no le pasara antes;
  lo único que se pierde es la curación gratis. `tools/test-nivel-callado.js` §2 lo custodia,
  incluida la parte de la ley 1.

## 🟠 Tuyo (Golden) — fuera de mi alcance

- [x] ~~**Mudanza a un proyecto nuevo de Supabase**~~ **Hecha el 14/9**: los ocho pasos de
  `docs/MUDANZA-SUPABASE.md` están aplicados y verificados en vivo (proyecto `ulspkdaljeuleqqdokfk`,
  login anónimo, tablas, portero en rechazo, el juego apuntando ahí).
- [ ] **El backup de Supabase**, apenas haya partidas que valgan algo. Database → Backups, o
  `pg_dump` con la contraseña del paso 1, y guardarlo aparte. **Es lo único que nos faltó la
  semana del incidente**, así que es lo primero que no hay que volver a olvidar.
- [x] ~~**Site URL en Supabase**~~ **Hecho el 18/9.** Authentication → URL Configuration → Site URL
  `https://golden-mp.onrender.com` y, en Redirect URLs, `https://golden-mp.onrender.com/**`.
  Con eso la cuenta por email queda **configurada de punta a punta**; lo que falta es probarla
  (ver arriba).
- [x] ~~**Portero de guardado, PARTE 2**~~ **Hecho el 14/9** en el proyecto nuevo: PARTE 2 aplicada,
  `MODO = "rechazo"`, el botón 🧪 muerto y el cliente volviendo a la granja aceptada ante un 422.
  Queda la limpieza de la bitácora a 30 días (un `delete` mensual, o cuando moleste).
- [ ] **La cola de arte** (PixelLab): que el sprite del granjero, la herramienta y el arma cambien
  de verdad. Hoy los cosméticos se coleccionan pero no se ponen. Ojo con la ley 3: esto va
  DESPUÉS de lo jugable, no antes.
- [ ] **El torneo**: el ranking de servidor está construido; falta abrirlo.

## 🟡 Esperando a Suren

- [ ] **Outfit del granjero**: ¿outfit fijo nuevo o sistema de outfits? Arte cuando se defina.
- [ ] Aprobación de los **12 edificios nuevos** (si aprueba → re-animar el portal).
- [ ] Usos de **tablones y barras**, **cerca premium**, tabla definitiva de **stats del bestiario**.
- [ ] **Sala de trofeos**: cuando los edificios tengan interior, los logros de la pestaña 🏆 pasan
  a exhibirse ahí. Lo cobrado se conserva (`G.logros`), la migración es solo visual.

## 🟢 Vigilar en playtest — no bloquea

- [x] ~~Modo testeo~~ **Eliminado el 14/9** (dirección: « ya no habrá modo testeo »). Ni GF.TESTEO, ni
  tiempos comprimidos, ni botón 🧪. Probar cosas de nivel alto = editar `farms.data` en la base.

- [ ] **Ley 4 (11/9): el animal que no come no da.** Reemplazó el rinde con decimales del 8/9 que
  Suren leyó dos veces como « me tenía que dar 0,1 y no me dio nada ». Ahora es binario: comió →
  su unidad, no comió → nada, el reloj sigue. Mirar que el « con hambre / comió ✓ » del establo
  se entienda solo. La felicidad (`feliz`) sigue en el guardado pero ya no manda nada.
  **14/9 — el precio se re-ancló a la ley 4** (dirección): cada material vale 480 del ancla más
  su RACIÓN de la comida más barata (fibra y cuero 1.160, pelaje 640, colmillo 580) en vez de 742
  para los cuatro. *Misma tarde, por Discord:* cada animal come `racion` unidades y el conejo pasó
  a 20 zanahorias («ya luego vemos si 20 es poco o mucho»), porque comiendo una sola su día
  costaba 85 veces menos que el de la alpaca por el mismo rinde; ahora son 4,3 veces.
  Y **la armadura dejó de ser eterna**: reparar cuesta la mitad del material proporcional a lo
  que falte, y crear cuesta ×1,5 para que esa mitad sea la mitad de algo. **15/9, dirección
  afinó la mecánica:** el golpe gasta **las cinco piezas a la vez** (« -1 por golpe simultánea »,
  o sea que el set aguanta 100 golpes y no 500, que es lo que el 14/9 había hecho mal), y
  **morir se lleva el 5 % de la durabilidad total con riesgo de romper la pieza**: lo que está en
  cero tiene un 10 % de romperse y DESAPARECER en cada muerte. No choca con la ley 1 porque
  morir en la Zona ya podía costarte equipo desde el 8/9 (5 % por pieza en la tumba); y la
  rotura solo alcanza a lo que ya está gastado, nunca a una pieza sana. Era el pedido de dirección
  —« sino los animales tienen 1 solo uso y ya no tiene sentido »— y con esto el material del
  establo hace falta para siempre. Lo custodia `tools/test-armadura-y-raciones.js`. El precio único venía del modelo de raciones del 9/9, que la ley dejó sin premisa: con
  él, el conejo rendía +734 al día y el toro con maíz **perdía 458**. Ahora los cuatro caen
  exactamente en el ancla del día (+480). Se mide con `tools/medir-establo.js`.

- [ ] **Estacionamiento en el tutorial acelerado**: con las esperas en 3 s, alguien podría no
  cumplir a propósito un paso tardío y farmear acelerado. Mitigación si aparece: acelerar solo
  hasta cierto capítulo, o limitar los días con tutorial abierto.
- [ ] **Los kits**: entregan « lo que falte » al entrar a cada paso, así que vaciarse a propósito
  los infla. Es una vez por paso y chico. Si molesta: topear al costo de receta del paso.
- [ ] **Un medidor en rojo con motivo**: ninguno hoy. Si alguno aparece, mirarlo antes de subirle
  la línea base — la semana del 8 al 9/9 encontró **trece** medidores que mentían, todos por un
  supuesto escrito a mano que envejeció en silencio, y ninguno estaba en rojo.

## ⚪ Visual abierto (decisión del 11/8: queda así salvo pedido nuevo)

- [ ] El **Mercado** quedó chico al lado de los edificios nuevos.
- [ ] **Árboles, piedras y parcelas**: siguen siendo el set viejo con el color calmado.
- [ ] **Piedra vs hierro** se parecen — piden siluetas distintas.
- [ ] **Animaciones de ataque propias por arma** (hoy todos usan el espadazo).

## ⚫ Ofrecido y sin pedir

- [ ] Suelo nuevo y costa en la plaza y la Zona Negra.
- [ ] Kick por AFK en la plaza.
- [ ] Pulido tipo Sunflower Land: cursor de mano, resaltado al pasar.
