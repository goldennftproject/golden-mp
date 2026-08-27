# Pesca v4 — auditoría de las cifras contra el código

*Para dirección y diseño · 27 de agosto de 2026 · medido con `tools/auditar-pesca-v4.js`*

## El veredicto en tres líneas

**El diseño se sostiene. La capa de materiales no.**

El invariante de la lombriz, las tablas de rareza, la vara de La Lonja y la regla de la carnada cierran contra el ancla. Lo que no cierra son los **precios de los materiales**, y arrastra consigo las cuatro cañas y las tres nasas. El propio documento lo anticipó en su §7 — el aviso era correcto y el desvío es mayor de lo que sugería.

| | |
| --- | --- |
| ✅ Cierra | el invariante de la lombriz · las tablas de rareza · la vara de La Lonja · la carnada como grifo |
| ✗ No cierra | los precios de material · las recetas de cañas · las recetas y el ancla de las nasas |
| ⚠ A revisar | el factor de peso (silencioso, y por eso peligroso) |

---

## 1 · GRAVE · Los materiales están mal tasados

| material | el doc supone | el código dice | desvío |
| --- | --- | --- | --- |
| Madera | 10 | 12 | +20 % |
| Tablón | 35 | 36 | +3 % ✅ |
| Barra de oro | 280 | 840 | +200 % |
| Barra de hierro | 130 | 720 | +454 % |
| Cuero | 55 | 340 | +518 % |
| **Fibra** | 25 | **300** | **+1.100 %** |

Comprobé de qué lado está el error, porque no se puede dar por supuesto que el código tenga razón. **La tiene, y está derivada:**

```
fibra  = (20 × 12 h de ciclo + trigo 360, la comida más barata) / 2 por ciclo = 300
cuero  = (20 × 16 h de ciclo + trigo 360)                       / 2 por ciclo = 340
```

Y ahí está el hallazgo que importa más que el número: **en Golden Farm la fibra y el cuero no son materiales de arranque.** Son productos de Alpaca y de Toro, con ciclos de doce y dieciséis horas, que exigen Establo, trigo y Curtiduría. Valen veinticinco veces la madera.

El documento los usa como si fueran el equivalente de la lana de Stardew — baratos, tempranos, de primer escalón. En esta economía son de mitad de partida. Eso no invalida el diseño, pero **cambia qué caña puede pedir qué**: la Caña de Bambú, pensada como el segundo escalón, hoy arrastraría la Ganadería entera detrás.

## 2 · GRAVE · Las recetas no entran en su presupuesto

| caña | presupuesto | cuesta de verdad | factor |
| --- | --- | --- | --- |
| Junco | 30 | 41 | ×1,4 |
| Bambú | 400 | 1.548 | **×3,9** |
| Hierro | 1.000 | 4.221 | **×4,2** |
| Oro | 2.000 | 5.960 | **×3,0** |

Las nasas no traen presupuesto declarado, pero cuestan 348, 1.152 y 2.408 — la de mimbre, que el documento quiere **regalar en el tutorial**, sale más cara que una expansión temprana.

### Mezclas que sí entran

El presupuesto es el número que no se toca; la mezcla se recalcula. Con los precios reales:

| caña | presupuesto | mezcla propuesta |
| --- | --- | --- |
| Junco | 30 | 2 Madera + 6 de plata |
| Bambú | 400 | 1 Fibra + 100 de plata |
| Hierro | 1.000 | 1 Tablón + 1 Barra de hierro + 244 de plata |
| Oro | 2.000 | 2 Barra de oro + 320 de plata |

Son las mezclas mínimas que cuadran. **No las recomiendo tal cual**, y por una razón de diseño que el propio documento defiende en su §7: *« materiales y no plata pelada, porque si la caña de oro costara 2.000 de plata a secas, mejorar la pesca sería ahorrar »*. Con los precios reales, la cola de plata se come entre el 16 % y el 25 % del presupuesto y las mezclas quedan de una o dos piezas — justo lo contrario de la intención.

**La salida limpia es subir los presupuestos**, no exprimir las mezclas. Si el segundo escalón de la pesca ha de pedir Fibra —que es una decisión razonable: ata la pesca a la Ganadería, igual que la caña de oro ata la Curtiduría—, entonces su presupuesto no puede ser 400: una sola Fibra ya son 300. Eso es una decisión de dirección, no un cálculo.

## 3 · GRAVE · El ancla de las nasas se calculó con los materiales equivocados

El documento define, correctamente, `ancla del ciclo = 2 h × 20 + coste de la nasa ÷ ciclos de vida`. Pero el coste que metió en esa fórmula era el de la tabla equivocada:

| nasa | ancla del doc | ancla con los costes reales | valor/ciclo que entrega |
| --- | --- | --- | --- |
| Mimbre | 48,00 | 179,20 | 45,15 |
| Reforzada | 57,50 | 328,00 | 58,57 |
| Hierro | 79,60 | 330,12 | 79,28 |

Las tres entregan entre un **75 % y un 82 % por debajo** de lo que costaría amortizarlas. Con estas recetas, poner una nasa es perder plata.

Para que las anclas del documento se sostengan, las mezclas tienen que costar:

- Nasa de mimbre → ≈ **20** de plata (hoy: 348)
- Nasa reforzada → ≈ **70** (hoy: 1.152)
- Nasa de hierro → ≈ **329** (hoy: 2.408)

O sea: la de mimbre es *2 Madera*, no *4 Madera + 1 Fibra*. Otra vez la Fibra.

## 4 · AVISO · El factor de peso cobra un 21 % de menos, en silencio

Este es el más sutil y el que más me preocupa, porque nadie lo notaría.

El documento pide dos cosas que juntas no cuadran:

- **§4:** *« el precio de venta es el precio base × (peso ÷ peso medio de la especie) »*
- **§4:** *« con la curva cargada hacia abajo para que los grandes sean raros de verdad »*

Si el peso se sortea con la curva cargada hacia abajo, la **media** de los sorteos queda por debajo del **punto medio** del rango. Con una curva cuadrática típica:

| especie | rango | punto medio | media real |
| --- | --- | --- | --- |
| Merluza | 0,4 – 1,8 | 1,10 | 0,87 (−21 %) |
| Atún | 2 – 9 | 5,50 | 4,33 (−21 %) |
| Pez espada | 20 – 90 | 55,00 | 43,33 (−21 %) |

Si el divisor es el punto medio, **cada pez paga un 21 % menos de lo que dice su tabla** y toda la pesca cobra de menos sin que se vea en ningún sitio. El documento promete que *« el promedio da exactamente 1,00, así que el peso no mueve un milímetro el ancla »* — y esa promesa solo se cumple si el divisor es la media de la curva, no el punto medio.

**Arreglo:** el divisor tiene que ser la media de la distribución que se use. Es una línea, pero hay que escribirla a propósito y clavarla con un test, porque es exactamente la clase de error que sobrevive años.

## 5 · Lo que sí cierra, y conviene decirlo

**El invariante de la lombriz.** Las siete rutas pagan entre 9,29 y 11,34 por lombriz: dispersión del 22 %, tal como promete. Las nasas pagan menos que la caña, que es la relación correcta — la ruta pasiva paga tu ausencia, la activa paga tus manos. Es la mejor idea del documento: mientras toda la laguna se pague en la misma unidad, no puede haber una ruta rota.

**Las tablas de rareza.** Las cuatro suman 100 %. La banda poco común no se mueve nunca. Lo que suben las bandas altas sale exactamente de la común — comprobado caña por caña. Y el 0,9 % de épico+legendario de la caña de junco es exacto.

**La vara de La Lonja.** Los tres escalones caen a menos de un 1 % de la vara del tablón que ya existe. La Lonja no es un grifo nuevo: es el mismo con otra llave.

**La carnada como única palanca.** La tabla de lombrices por día sigue la regla « producción ÷ 100 » con el margen esperado.

---

## Qué haría antes de escribir código

1. **Decidir los presupuestos con la tabla real delante.** Es lo único que bloquea de verdad: con Fibra a 300 y Cuero a 340, la escalera de cañas hay que repensarla, no recalcularla. Media hora de dirección.
2. **Decidir si la pesca depende de la Ganadería.** Pedir Fibra en el segundo escalón lo decide de hecho. Puede ser deliberado y bueno — pero que sea deliberado.
3. **Escribir el divisor del peso como la media de la curva**, y un test que compruebe que el precio esperado de mil capturas da el precio base.
4. **Recalcular las tres nasas** contra su ancla, con los costes reales.

Lo demás del documento —el lance de un botón, el progreso que no retrocede, el peso y los récords, las tres mareas, los títulos— no toca la economía y se puede construir tal como está escrito.

---

*Reproducible con `node tools/auditar-pesca-v4.js`. La auditoría informa y no bloquea la suite: no es un test del juego, es un dictamen sobre un documento.*
