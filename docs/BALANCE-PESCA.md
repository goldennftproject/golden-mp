# Balance de la pesca — medido, 31/8

today.docx trae dos encargos sin números: «Balancear el tablero de pesca» y «Balancear los %
con los que salen los peces». Antes de mover nada, esto es lo que hay HOY, medido del juego
(no de las tablas): si algo de acá abajo le parece mal a Suren, que señale la fila y se deriva
el arreglo. Mover números sin saber qué molesta es como afinar una guitarra sin escucharla.

## Los % de las bandas, por caña

| caña   | común | poco común | raro | épico | legendario | lances hasta raro / épico / legendario |
|--------|------:|-----------:|-----:|------:|-----------:|:---------------------------------------|
| junco  | 62,0  | 27,0       | 10,1 | 0,8   | 0,2        | 10 / 133 / 667                         |
| bambú  | 55,4  | 27,0       | 16,2 | 1,2   | 0,2        | 6 / 83 / 417                           |
| hierro | 46,6  | 27,0       | 24,2 | 1,8   | 0,4        | 4 / 56 / 278                           |
| oro    | 34,5  | 27,0       | 35,4 | 2,6   | 0,5        | 3 / 38 / 190                           |

La del Abuelo iguala a la de oro en bandas (+10 % al peso, sin peaje). Cada caña abre además
más ESPECIES dentro de cada banda (junco: 1 sola legendaria; oro: las 3), que es la regla de
Suren «según la caña tienes varias opciones de peces».

Dos piedades ya activas que suavizan estos números: el primer lance del día nunca es común, y
tras 80 lances sin épico el siguiente lo garantiza.

**Importante:** estos % no son estéticos — están derivados para que TODA caña pague 9–11 de
plata por lombriz (el invariante del capítulo 9, medido en test-pesca-v4-bolsillo con 160.000
lances). Subir el % de legendarios de una caña sin tocar otra pata rompe esa igualdad y una
caña pasa a imprimir plata.

## El tablero (los pedidos de pesca, hoy en el tablón del pueblo)

| escalón            | ventana  | pide                              | paga                          |
|--------------------|----------|-----------------------------------|-------------------------------|
| Pedido de marea    | 8 h      | 2–5 peces de banda baja, o 2–3 por peso mínimo (1 de cada 3) | máx(3,3 % de un día de granja, sueltos ×2) + 1 Escama |
| Encargo del Capitán| 1 semana | 2 bandas a la vez (volumen + gracia) | máx(1 día de granja, ×2) + 6 Escamas |
| Captura del mes    | 1 mes    | UN épico o legendario con nombre  | máx(3 días de granja, ×2) + 25 Escamas |
| Torneo (báscula)   | vie–dom  | peso, no cantidad (barra 1,00)    | 2 días de granja + 12 Escamas |

Regla dura vigente: solo se pide lo que el jugador YA puede pescar con su caña. El pago nunca
baja de ×2 sobre venderlos sueltos («los sueltos se venden, los raros se entregan»).
Escamas: ~139 al mes si se juega todo.

## Las preguntas para Suren (una frase cada una alcanza)

1. ¿Qué se siente mal de los %? ¿Salen demasiados comunes al principio, o los legendarios
   tardan demasiado (667 lances con junco)?
2. Del tablero: ¿los pedidos piden demasiados peces, pagan poco, o el ritmo de Escamas
   (~139/mes, caña del Abuelo = 120) va bien?
3. ¿La marea de peso (1 de cada 3 pedidos) aparece demasiado o demasiado poco?

Con cualquiera de esas respuestas, el ajuste se deriva del ancla y se mide antes de commitear.
