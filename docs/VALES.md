# Los vales del tablón — qué valen y qué compran

*Para dirección y diseño · 26 de agosto de 2026 · medido, no estimado*

## En una línea

**Un vale son 40 de plata.** El tablón los paga con esa vara y la tienda de canje tiene que devolverlos con la misma. Si las dos puntas no usan la misma vara, aparece una ruta para multiplicar plata — ya pasó el 18/8 y llegó a ×800.

## Lo que preguntó dirección

> « esto no está balanceado, ¿cierto? con 1 vale pude obtener 40 semillas de cereza »

Sí había un desajuste, y era **el doble** — pero al revés de lo que parecía.

| premio | cobraba | entregaba | por vale |
| --- | --- | --- | --- |
| Fardo de 10 hachas | 1 vale (40) | 20 de plata | 20 ❌ |
| Fardo de 10 picos | 1 vale (40) | 20 de plata | 20 ❌ |
| Lata de 6 lombrices | 1 vale (40) | 18 de plata | 18 ❌ |
| **Sobre de semillas** | 2 vales (80) | 80 de plata | **40** ✅ |

El sobre era **el único premio bien tasado**. Los otros tres cobraban el doble de lo que valían, y al lado de tres malos negocios el único honesto parecía un chollo.

Vale la pena guardar el patrón, porque se repite: *lo que llama la atención suele ser lo único que está bien*. Un premio que te roba no lo reporta nadie — solo se nota el que parece regalado.

## Cómo quedó

| premio | cuesta | entrega | por vale |
| --- | --- | --- | --- |
| Fardo de **20** hachas | 1 vale | 40 de plata | 40 ✅ |
| Fardo de **20** picos | 1 vale | 40 de plata | 40 ✅ |
| Lata con **13** lombrices | 1 vale | 39 de plata | 39 ✅ |
| Sobre de semillas | 2 vales | 80 de plata | 40 ✅ |

**Las 40 semillas de cereza no cambian.** Cuestan 2 vales = 80 de plata, y 40 semillas de cereza valen 80 de plata. Estaba bien desde el principio.

### Por qué se habían torcido

El 18/8 se hizo el precio derivado *del contenido*, pero el contenido seguía escrito a mano (« 10 hachas »). Y el redondeo a vales tiene un piso de 1: cualquier fardo que valga menos de 60 de plata acaba costando un vale entero. El sobre se salvó porque ahí se derivaron **las dos puntas** — primero cuántas semillas entran, después qué cuesta esa cantidad.

Ahora todos los fardos se arman igual, y **la etiqueta se escribe sola** desde ese número. Antes decía « Fardo de 10 hachas » con el 10 a mano: habría mentido el día que cambiara el precio del hacha, sin que nadie se enterara.

## Cuánto entra por día

El tablón da **6 vales al día** con los tres pedidos diarios (el primero paga doble). Son 240 de plata en premios por día.

## Lo que queda por decidir

El sobre vale lo correcto **siempre**, pero su forma se descontrola según cuál sea tu mejor cultivo:

| mejor cultivo | te da | cuesta |
| --- | --- | --- |
| Papa (Cultivo 1) | 80 semillas | 2 vales |
| Cereza (Cultivo 4) | 40 semillas | 2 vales |
| Girasol (Cultivo 4) | **1 semilla** | 5 vales |
| Maíz (Cultivo 8) | **1 semilla** | **18 vales** |
| Brócoli (Cultivo 16) | 1 semilla | 2 vales |

Dos cosas chirrían aquí:

1. **A Cultivo 8 el premio es una semilla de maíz por 18 vales** — tres días de tablón por un solo objeto. El valor es correcto, pero no se siente como un premio.
2. **Cereza y girasol son las dos de Cultivo 4**, y cuál te toca lo decide el orden interno de una tabla: 40 semillas por 2 vales, o 1 por 5. Eso es azar, no diseño.

Tres formas de resolverlo, para que dirección elija:

- **Precio fijo de 2 vales.** El sobre elige el cultivo más alto del que 80 de plata compre al menos ~5 semillas, y baja un escalón si no llega. A Cultivo 8 daría 27 zanahorias en vez de 1 maíz. Precio estable y el premio siempre se siente premio.
- **Que el jugador elija el cultivo**, con el precio en vales de cada uno a la vista. Lo más honesto y lo que más decisión da; pide interfaz nueva.
- **Solo romper el empate** por una regla fija (el más caro de los que comparten nivel). Arregla el azar, no la forma.

---

*Vigilado por `tools/auditar-vales.js`: exige que todo premio entregue ~40 de plata por vale en los 20 niveles de Cultivo, que la emisión use la misma vara, y que ninguna etiqueta lleve una cantidad escrita a mano.*
