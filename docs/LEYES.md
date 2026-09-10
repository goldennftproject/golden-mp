# Las leyes de Golden Farm

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

## Ley 2 — El ritmo de los nodos

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

Medido con el simulador, a tres sesiones diarias el jugador llega al **nivel 10 a los 8,7 días**.
De ahí sale la regla práctica:

> **El MVP vive entre el nivel 1 y el 12. Todo lo que un jugador no ve en su primera semana no
> es parte de esta prueba.**

Delante de cualquier propuesta, la pregunta es una sola: *¿esto cambia si alguien vuelve el día
siete?* Si la respuesta es no, no entra en el MVP — y da igual lo terminado que esté, lo caro
que haya salido o las ganas que dé de enseñarlo.

Consecuencias que ya se siguen de esto, para no tener que rediscutirlas:

- **Los niveles 21 al 50 no son un problema del MVP.** Nadie llega. El techo se baja a donde de
  verdad se llega, y las 16 expansiones se re-reparten solas — no se quita ninguna (ley de
  dirección: las dieciséis no se tocan).
- **Lo que suma superficie sin sumar bucle se ESCONDE, no se borra**: el pase, los logros, el
  álbum, la doma, el torneo, el asalto de clan, los títulos de la Lonja. Detrás de una bandera,
  vuelven el día que se quiera. Cada panel de más es algo que puede confundir y algo que puede
  romperse, y ninguno contesta la pregunta.
- **El hueco de las 8 horas es lo más urgente del proyecto.** Del tutorial al nivel 3 hay 12
  minutos; del 3 al 4, **8,2 horas**. El jugador termina de aprender, siente que arrancó, y la
  próxima cosa que pasa está a ocho horas. En retención de día 1 ahí es donde se pierde a la
  mayoría.
- **Si el mercado entre jugadores está abierto durante la prueba, el portero de guardado tiene
  que salir de modo sombra antes.** No por seguridad —eso puede esperar— sino porque un solo
  jugador duplicando envenena todos los números que la prueba iba a dar. O el P2P se apaga, o el
  portero sube. Abierto y en sombra a la vez, no.

---

## Cómo se usa este archivo

Antes de tocar un reloj, una curva, una recompensa o una puerta: leerlo. Antes de proponerle algo
al diseñador: leerlo. Si una ley nueva se dicta en Discord o por voz, **se escribe acá el mismo
día**, con la cita textual — no parafraseada, porque la mitad del valor de una ley está en cómo
la dijo quien la dictó.
