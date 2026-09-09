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

## Cómo se usa este archivo

Antes de tocar un reloj, una curva, una recompensa o una puerta: leerlo. Antes de proponerle algo
al diseñador: leerlo. Si una ley nueva se dicta en Discord o por voz, **se escribe acá el mismo
día**, con la cita textual — no parafraseada, porque la mitad del valor de una ley está en cómo
la dijo quien la dictó.
