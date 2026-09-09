# Golden Farm — cómo quedó el juego después de la tanda del 9/9

Para Suren. Lo de abajo está **medido ejecutando el juego**, no leído. Donde no, se dice.

Cinco commits: `796bc97` · `1a1a105` · `eeea13d` · `d9c23ff` · `d34db6c`
(más `9b9d0b9` y `fbf41f6` de anoche, que son los del CD de la Zona).

---

## Lo primero: el CD de la Zona Negra ya está

Tenías razón y el fallo era mío. Bajé la constante a 0 y di el trabajo por hecho, pero el
enfriamiento **no vive solo en la constante**: `zonaCdHasta` es una **hora guardada**. Quien salió
de la Zona antes del despliegue arrastraba un timestamp futuro y el juego lo seguía respetando
aunque la regla que lo escribió ya no existiera. Por eso vos lo veías y yo no.

Arreglado recortando al cargar la partida, no poniéndolo a cero: si algún día el enfriamiento
vuelve a subir, la línea sigue siendo correcta sola.

---

## El estado de la partida, medido

Simulador, jugador de 3 sesiones al día, del minuto 1 al nivel 50:

| | antes | ahora |
|---|---|---|
| llegar al nivel 50 | 29,7 días | **29,7 días** |
| minutos de juego al día | 15 | 15 |
| lo que cobra contra el ancla | 22,7 % | 22,7 % |

El mes sigue en pie. Todo lo de esta tanda **redistribuye**, no infla.

---

## QUÉ ESTÁ BIEN

**El ritmo de niveles ya no se hunde en el 11.** Se pagaban 5.000 de XP por el nivel 10 y 700
por el 11 — el escalón más caro de la partida y, detrás, uno al 14 %. En tiempo real: 2,4 días
contra 0,3. El juego se ponía ocho veces más fácil de golpe, una sola vez, justo ahí.

Ahora los cuarenta niveles de la cola cuestan **las mismas horas de granja** (50 a 52 XP por
celda, antes iba de 33 a 84). No se escribe ninguno: se derivan de las celdas que tenés en ese
nivel, igual que las expansiones.

**El pase es una escalera.** El escalón 2 pagaba 10 de plata y el 7 pagaba 7.740 — más que los
otros veintinueve juntos. Ahora cada escalón paga una hora de la granja que tenés a esa altura:
300 en el 1, 1.140 en el 30, subiendo siempre. El carril entero cuesta lo mismo que antes
(17.800 contra 20.300): es el mismo dinero puesto en orden.

**La Caña de Hierro vuelve a tener hierro.** Se había quedado en `{cuero, tablón}` — una caña de
hierro sin una sola barra. No fue descuido: con los precios de hoy no entraba en su presupuesto,
porque el cuero pasó a valer 742 cuando los animales se fueron a 24 h. Se movió el presupuesto a
1.500, que es lo que la mezcla honesta cuesta. Y el nivel cuadra solo: la Curtiduría se levanta
al 8, que es el nivel de esta caña.

**26 niveles mudos pasaron a 3.** El plan cosmético estaba escrito y **no se entregaba nunca**.
La línea que lo repartía preguntaba « ¿el premio de este nivel nombra un Título, un Marco…? »
sobre un texto que se genera solo y jamás nombra un cosmético: la condición era imposible de
cumplir. Un `if` que nunca es cierto no da error, no deja log y no lo ve nadie.

---

## QUÉ ESTÁ MAL — y necesita que decidas vos

**1 · Los diez primeros niveles no dan ningún cosmético.** Los cosméticos empiezan en el 11.
O sea que los primeros **ocho días** —el tramo donde se decide si alguien se queda— no tienen ni
un título ni un marco. Es donde más falta hace y es donde no hay nada.

**2 · Tres niveles siguen mudos, y los tres por promesas viejas.**

| nivel | lo que la tabla prometía | por qué ya no es suyo |
|---|---|---|
| 6 | 6ª parcela GRATIS | las parcelas las trae la expansión desde el 18/8 |
| 8 | Cultivo Girasol | lo abre la skill de Cultivo, no el nivel de granja |
| 17 | Horno nivel 2 | lo abre Minería 6 |

**3 · Seis oficios no abren nada: Espada, Hacha, Mazo, Arco, Tala y Artesanía.** Suben de nivel y
no desbloquean absolutamente nada, así que su techo cae a 150 — un panel que promete ciento
cincuenta niveles con ciento cuarenta y ocho vacíos.

Probé atarles las veinte armas (4 tipos × 5 rarezas, que ya existen) con la escalera de las
cañas. **Lo medí y lo saqué**: Espada nivel 4 son 85 ratas, el 9 son 674 y el 14 son 2.120,
mientras el material de esas mismas armas se junta en días. El nivel no acompañaba al material,
lo tapaba. Y la XP de combate es opcional —la Zona no hay que pisarla—, así que un jugador de
granja se quedaba con la espada de madera sin entender por qué.

No lo dejé con otra escalera inventada porque cualquier número ahí es una adivinanza sobre un
ritmo que no sé medir. **La decisión es tuya:** o los cuatro de combate reciben algo que abrir
(una técnica, un pasivo, una ranura), o se acepta que su nivel es un número de daño y se les da
un techo honesto. Lo que no puede seguir es el 150.

**4 · Cuatro escalones del pase dan un objeto que no llega a su altura.** La cantidad se recorta
a lo que se lee de un vistazo (200 en pilas, 60 en semillas y platos) y cuando la unidad vale 2
o vale 2.580 no hay cantidad legible que dé el número. El arreglo es cambiar el **objeto**:

| nivel | da | paga | debería | |
|---|---|---|---|---|
| 2 | 60 semillas de Papa | 120 | 360 | se queda corto |
| 7 | 1 Pan de Trigo | 2.580 | 420 | se pasa ×6 |
| 14 | 60 Papas Asadas | 180 | 600 | corto |
| 18 | 200 Flechas | 400 | 780 | corto |

**5 · La escalera de cañas se aplanó arriba.** Al subir la de Hierro a 1.500, la de Oro (2.000)
queda a solo ×1,33. Al nivel 12 esos 500 no frenan a nadie. Lo que de verdad cobra la caña de oro
es su barra (21 h de veta), no su plata — pero si querés que el último escalón se sienta, hay que
subirlo. No lo toqué solo: subir el precio del premio final es algo que se **siente**.

---

## Dos medidores en rojo que NO son bugs nuevos

Los dos estaban rojos **antes** de esta tanda; lo verifiqué volviendo a los commits de ayer.

**`test-pesca-v4-nasas`** — « la laguna PICA cuando abre el Lombricario ». Espera un pico de
ingreso que hoy da 12,3 %. Es un choque entre lo que dice el documento y lo que dan los números
después del tope de 15 lombrices/día. Hay que decidir cuál manda.

**`auditar-silencios-del-raton`** — dice 6 silencios contra una base de 3. Los tres « nuevos » son
falsos positivos: dos son el `return` de un *pointerdown* (la acción se resuelve al **soltar**,
que es lo que permite arrastrar la cámara sin talar el árbol de abajo) y el tercero es Escape
cerrando ventanas, que sí contesta. El medidor envejeció con el código. **No le subí la línea
base** porque el propio auditor lo prohíbe y tiene razón: hay que mover esos filtros a la cabecera
del manejador, y eso es tocar el manejo de punteros de la granja — prefiero no hacerlo en la misma
tanda que todo lo de arriba.

---

## Lo que sigue sin arreglar y no es de esta tanda

- **Recargar dentro de la Zona sigue esquivando la muerte.** Cerrarlo pide una política de
  desconexión, y matar a alguien por una caída de red sería perder progreso sin borrar caché —
  justo lo que la ley de la casa prohíbe.
- **El arte:** que el sprite del granjero, la herramienta o el arma cambien de verdad. Un
  cosmético coleccionable es más que nada, que es lo que había, pero no es la skin puesta.
- **El portero de guardado** (PARTE 2 del SQL, salir de modo sombra).

---

## Una nota sobre cómo se hizo esto

Tres de las cinco cosas de esta tanda salieron de **medir una recomendación mía y descubrir que
era mala**:

- « que la cola de niveles arranque en 5.000 y decaiga » → el nivel 50 habría costado el **5 %**
  del tiempo del 11. Cambiaba un precipicio al principio por un derrumbe al final.
- « atar las armas a su oficio de combate » → un muro de 2.120 ratas.
- y escribí un `matValor()` que ya existía 4.000 líneas más abajo — escribir en vez de derivar,
  mientras arreglaba exactamente ese fallo.

El patrón de toda la semana es siempre el mismo: **un número escrito a mano que envejece en
silencio debajo de una economía que sí se deriva.** El tablón con los minerales, la caña con su
presupuesto, el pase con sus cantidades, la tabla de cosméticos que nadie leía. Ninguno estaba
en rojo. Por eso ahora casi todo se deriva y hay un test que lo custodia.
