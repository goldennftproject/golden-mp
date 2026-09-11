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
8,7 días, así que **el MVP vive entre el nivel 1 y el 12**. Delante de cualquier tarea, la
pregunta es: *¿esto cambia si alguien vuelve el día siete?* Si no, no entra. Está desarrollado
en `docs/LEYES.md`.

**El camino al MVP, en orden:**

- [x] ~~**1 · Tapar el hueco de las 8 horas.**~~ **NO EXISTÍA.** El 8,2 h era el simulador con
  perfil de tres sesiones diarias: mide que el jugador se fue a dormir, no que el juego lo
  frene. Calculado sobre las tablas, quien se queda jugando llega al nivel 4 en ~15 minutos y
  al 6 en ~1 h 25 (ver LEYES.md). Lo que queda es otra pregunta —*¿el juego le da un motivo
  para quedarse?*— y ésa va al playtest.
- [ ] **2 · Bajar el techo de granja.** Contado: 24 premios jugables sobre 23 niveles → techo
  honesto 24-25. **Queda a UN número:** `FARM_NIVEL_MAX` en state.js:1565. Todo lo que colgaba
  del 50 a mano ya cuelga del techo: las 16 expansiones (fórmula), la cola de XP (`FARM_XP_TECHO`
  es el mes, no cambia), el cofre y el altar nivel 2 (`nivelEscalado`), y las tareas del 11-50,
  que ahora son una escalera de 40 peldaños repartida entre el 11 y el techo (con 50 sale
  idéntica a la tabla vieja — identidad aritmética, comprobable leyendo). Lo que falta es
  **medir**: poner 25, correr `simular-partida.js 3 25` y la suite, mirar que el mes siga en ~30
  días y que ningún nivel se quede mudo. *La suite (141) y `test-techo-a-un-numero` pasaron en
  verde el 10/9; `simular-partida 3 50` sigue dando el mes en 29,7 días. Falta medir con 25.* Por la
  regla del MVP esto NO cambia el día siete (el 1-10 no se toca): es honestidad de la promesa,
  no retención.
- [x] **3 · Esconder tras bandera** — `GF.MVP = 1` en config.js. Desaparecen del menú y de toda
  puerta (atajos, buzón) Pase, Misiones del pase, Logros, Álbum, Clan, Cosméticos y
  Leaderboard; la doma no se dispara; el torneo no cuelga en la Lonja; los títulos no se
  anuncian como premio; el cartel de nivel no vende el cosmético. Esconder, no borrar: todo
  vuelve con `GF.MVP = 0`. *Suite en verde el 10/9: doma, Lonja y carta del tutorial se prueban con
  la bandera apagada, que es lo que custodian. Sin Chromium todavía.*
- [ ] **4 · Decidir el mercado P2P** durante la prueba. Si va abierto, el portero sube antes (ver
  LEYES.md: no es seguridad, es validez del experimento). **Es la siguiente decisión.**
- [ ] **5 · Que alguien lo juegue una semana** sin saber cómo está hecho. Ni Golden, ni Suren,
  ni yo.

---

## 🔴 Decisiones de dirección — fuera del MVP, para después

Están desarrolladas en el GDD §15.0, con sus números medidos. Aquí solo el titular:

- [ ] **Qué entregan los 26 niveles sin recompensa jugable.** La más grande de todas. De 49
  niveles de granja, 23 dan algo que el jugador pueda usar; los otros 26 dan el bono de venta
  (invisible) y adorno. El material para elegir ya existe: nodos sueltos, lugares de establo,
  huecos de nasa, semillas de escalón alto, vales, capacidad de bolsa o cofre.
- [ ] **Los seis oficios huérfanos** (Espada, Hacha, Mazo, Arco, Tala, Artesanía). O reciben algo
  que abrir, o se acepta que su nivel es un número de daño y se les da un techo honesto. Lo que
  no puede seguir es el 150 de reserva. *(Se probó atarles las armas y se midió que era un muro:
  85 ratas para la espada de piedra. Descartado y explicado en el código.)* **11/9:** las cuatro
  armas pasaron a subir por INTENTOS con la fórmula de Tibia del diseñador (`docs/SKILLS-TIBIA.md`,
  `test-skills-tibia.js`): arrancan en 10, cada golpe cuenta, matar no entrena. Eso les da un
  ritmo con sentido, pero NO les da nada que abrir — siguen sin contenido y el 150 sigue ahí.
- [ ] **La escalera de cañas, aplanada arriba.** Al subir la de Hierro a 1.500, la de Oro (2.000)
  queda a ×1,33. Lo que de verdad cobra la de oro es su barra (21 h de veta), no su plata — pero
  si el último escalón tiene que sentirse, hay que subirlo.
- [ ] **Recargar dentro de la Zona sigue esquivando la muerte.** Cerrarlo pide una política de
  desconexión, y matar a alguien por una caída de red sería perder progreso sin borrar caché:
  justo lo que la ley 1 prohíbe.

## 🟠 Tuyo (Golden) — fuera de mi alcance

- [ ] **Portero de guardado, PARTE 2**: aplicar `sql/portero-guardado.sql` y sacarlo de modo
  sombra (hoy anota, nunca rechaza). Ese día muere el botón 🧪 y entra la limpieza de la bitácora
  a 30 días.
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
