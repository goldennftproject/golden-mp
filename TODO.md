# Golden Farm — TO-DO

*Actualizado el 9 de septiembre de 2026. La versión anterior era del 11 de AGOSTO y estaba
podrida: la mitad de sus puntos los habían resuelto rebalances posteriores sin que nadie los
tachara, y otros hablaban de sistemas que ya no existen (la pesca v2, el pase con `usos` de caña,
el `GF.TESTEO` que lleva semanas en 0). Una lista que hay que leer con desconfianza no es una
lista: es ruido con formato. Esta empieza limpia.*

**Antes de tocar nada:** [`docs/LEYES.md`](docs/LEYES.md) — el progreso no se resetea, el ritmo
de los nodos no se toca, y lo cosmético no cuenta como contenido.

---

## 🔴 Decisiones de dirección — nada avanza sin esto

Están desarrolladas en el GDD §15.0, con sus números medidos. Aquí solo el titular:

- [ ] **Qué entregan los 26 niveles sin recompensa jugable.** La más grande de todas. De 49
  niveles de granja, 23 dan algo que el jugador pueda usar; los otros 26 dan el bono de venta
  (invisible) y adorno. El material para elegir ya existe: nodos sueltos, lugares de establo,
  huecos de nasa, semillas de escalón alto, vales, capacidad de bolsa o cofre.
- [ ] **Los seis oficios huérfanos** (Espada, Hacha, Mazo, Arco, Tala, Artesanía). O reciben algo
  que abrir, o se acepta que su nivel es un número de daño y se les da un techo honesto. Lo que
  no puede seguir es el 150 de reserva. *(Se probó atarles las armas y se midió que era un muro:
  85 ratas para la espada de piedra. Descartado y explicado en el código.)*
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
