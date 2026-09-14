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
- [ ] **La vida del héroe no sube nunca, y eso ata el combate.** `G.hpMax` es 100 desde el nivel
  1 hasta el techo. Medido el 14/9 (`tools/medir-combate.js`): con la armadura REAL de la primera
  semana (0-1 de defensa; las siete piezas del juego suman 8 y salen de drops de bichos de nivel
  15+) el combate del MVP está sano — la araña y el goblin matan en 3-5 golpes y te matan en
  29-34. Pero como la vida es fija, el daño de los bichos no puede escalar: se probó reescalarlos
  para que todos maten en ~18 golpes y la cuenta aplanaba el bestiario entero (la rata pegando 12
  y el trol 20). Mientras la vida no crezca con el nivel, subir el daño vuelve letales a los
  bichos tempranos. No es urgente para el MVP; es la restricción a levantar después.
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
- [ ] **Los seis oficios huérfanos** (Espada, Hacha, Mazo, Arco, Tala, Artesanía). O reciben algo
  que abrir, o se acepta que su nivel es un número de daño y se les da un techo honesto. Lo que
  no puede seguir es el 150 de reserva. *(Se probó atarles las armas y se midió que era un muro:
  85 ratas para la espada de piedra. Descartado y explicado en el código.)* **11/9:** las cuatro
  armas pasaron a subir por INTENTOS con la fórmula de Tibia del diseñador (`docs/SKILLS-TIBIA.md`,
  `test-skills-tibia.js`): arrancan en 10, cada golpe cuenta, matar no entrena. Eso les da un
  ritmo con sentido, pero NO les da nada que abrir — siguen sin contenido y el 150 sigue ahí.
  Misma tarde, segundo doc (`Defensa de los mobs de Tibia`): parada + armadura + cargas de
  bloqueo en cada bicho, daño del jugador con la fórmula de TFS, el mob pega normal(0, máx) y
  pasa por tu parada. **Corregido el 14/9:** se midió con la armadura REAL de la primera semana
  (0-1; las siete piezas suman 8 y caen de bichos de nivel 15+) y la Zona NO queda blanda — araña
  y goblin matan en 3-5 golpes y te matan en 29-34. `MOB_DMG_MULT` tampoco es la perilla: subirlo
  aplana el bestiario, porque la vida del héroe es 100 y no sube nunca. Medirlo con
  `tools/medir-combate.js` antes de tocar nada.
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

- [ ] **Mudanza a un proyecto nuevo de Supabase** (14/9, dirección: arrancamos de cero). Ocho pasos
  en `docs/MUDANZA-SUPABASE.md`: proyecto nuevo, login anónimo, `sql/instalar-proyecto-nuevo.sql`,
  función `guardar`, `node tools/cambiar-supabase.js <url> <anon>` + deploy, prueba, PARTE 2, rechazo.
  Y un backup apenas haya partidas: es lo que faltó esta semana.
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
  su comida más barata (fibra y cuero 1.160, colmillo 580, pelaje 488) en vez de 742 para los
  cuatro. El precio único venía del modelo de raciones del 9/9, que la ley dejó sin premisa: con
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
