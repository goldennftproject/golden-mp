# Cambios del diseñador del 16 de octubre

Implementación sobre el juego real a partir de `nuevos detalles.docx` y las decisiones confirmadas en el chat. No se creó otra página del juego. Se mantienen un único VIP, los tiempos de árboles y rocas y los retiros desactivados.

## Cambios

1. Las piezas de Curtiduría nuevas llegan a la bolsa. Se equipan y desequipan individualmente, o como set desde Equipo. Las piezas guardadas no defienden ni se gastan. Al cambiar equipo con la bolsa llena, se conserva el equipo anterior si no cabe. Las armaduras heredadas siguen equipadas como antes.
2. El mercado de jugadores admite piezas de armadura y transporta su durabilidad. Comprar, retirar y reclamar una entrega pendiente no las repara. No se permite sobrescribir una pieza igual ya poseída. La recuperación desde la tumba también conserva piezas y desgaste a través del contenedor y F5.
3. La Lonja permite elegir una caña concreta o el modo automático. La elección se guarda. Si la elegida se rompe, no se cambia silenciosamente a otra con peaje distinto.
4. El refresco de parcelas crea todos los objetos que falten en la escena, aunque el terreno ya hubiera añadido sus posiciones antes de comprar. Recupera su estado guardado y no necesita F5.
5. Reparar una caña completamente gastada cuesta el 50% del valor base de sus materiales, en plata, sin incluir la parte de compra en plata. Es proporcional al desgaste e independiente del nivel y del precio dinámico. Por autorización expresa del usuario, su vida útil aumenta de 50 a 150 lances. La migración conserva el porcentaje de desgaste, se ejecuta una sola vez y no modifica el respaldo de entrada. Las rotas siguen rotas. La caña del Abuelo conserva su regla previa sin desgaste.
6. Cada nasa nueva cuesta los materiales previos más 100 plata y tarda cuatro horas. La fabricación y el calado son una sola operación en el juego actual: no se cobra otra vez al recoger. Las nasas ya colocadas conservan su fecha de finalización. No se aumentaron los premios.
7. El resumen de regreso de la Zona Negra muestra la durabilidad gastada o perdida, además de XP, monedas y recursos. Las incursiones de un clic muestran el mismo cuadro y permiten consultar el último resultado. Si la actividad no desgastó armadura, no se inventa daño: se informa el resultado real.
8. Los platos que esperan turno pueden cancelarse y devuelven sus ingredientes; la cola se adelanta sin huecos. Los peces se devuelven con sus pesos originales. Si no caben los ingredientes, no cambia la cola ni se pierde nada. Una receta antigua con pescado que no haya registrado sus ingredientes no puede cancelarse de forma segura: debe terminar su ciclo. Las nuevas sí registran el detalle necesario.
9. El botón de recoger conserva su nodo entre ticks y recoge todos los platos listos con un clic. No depende de que se haya ejecutado antes el siguiente tick del HUD. Los clics repetidos no duplican platos.
10. La estamina regenera continuamente, incluso desconectado: de vacía a llena en cuatro horas. Recuperar una barra parcialmente gastada tarda proporcionalmente menos. Se migra el tiempo transcurrido del reloj anterior. Los vales entregan siempre picos de piedra: se corrigió que antes acreditaban los usos al pico que estuviera equipado, incluido el de hierro.

## Efecto económico medido

Con 150 usos y reparación al 50%, el rendimiento teórico medio de las cañas por lance, descontando peaje y reparación pero sin lances extra ni fallos del minijuego, sigue positivo: junco 9,22; bambú 8,69; hierro 3,72; oro 3,17 plata. No es una promesa de ganancias: son valores medios de las tablas.

El cargo de 100 de las nasas tiene un efecto fuerte. Sus valores medios de recompensa permanecen en 203,55; 279; 389,74. Sus costes totales, valorando los materiales a precio base más el cargo, pasan a 268; 343; 454. Por tanto, a esa valoración, el margen esperado por ciclo es negativo (aproximadamente -64 plata); no equivale a perder ese importe directamente de la cartera y depende del coste de oportunidad real de los materiales. Se conserva el cambio solicitado sin subir premios para ocultarlo. Es un punto de balance que debe observarse en partidas reales.

Las dos simulaciones de regresión de 45 días (perfil habitual, presiones 1 y 5, semilla 11) completaron el progreso sin saldos negativos ni exceso de capacidad. No incluyen una estrategia de uso de nasas ni todas las cañas: no sustituyen las mediciones específicas de pesca ni una población real.

## Validación y límites

Cierre automatizado: 244/244 pruebas aprobadas con hash de fuentes, HTML y herramientas idéntico antes y después (`cc9aff0e308b39e93d32d16bb569ab0acd10499e68e545f989f6415bd52da244`). Además se repitieron 10.000 operaciones encadenadas con 2.871 recargas y 96 casos de relojes pausados con 18 recargas alrededor del vencimiento VIP. No son partidas de jugadores ni pruebas de red reales.

Pruebas nuevas: `tools/test-detalles-disenador-20261016.js` y `tools/test-intercambio-cocina-disenador.js`. Ejecutan motor real y DOM simulado; cubren migraciones, selección, cola, un clic, peces con peso, bolsa llena, doble clic de mercado, fracaso de publicación, pendientes y tumba con recarga. Las pruebas históricas se actualizaron únicamente donde el contrato solicitado cambió (estamina, nasas, reparación y equipar expresamente lo recién fabricado).

Supabase: se inspeccionaron en modo lectura el esquema, las restricciones y las políticas del mercado existente. RLS está activa y `kind`/`payload` ya admiten el formato nuevo; no fue necesaria una migración ni se relajaron permisos. Las pruebas de compra/venta simulan la respuesta de la base y no certifican concurrencia remota. El P2P mantiene su arquitectura previa, no se lo convierte aquí en una economía totalmente autoritativa.

Se comprobó el arranque visual local y la ausencia de errores de consola durante esa comprobación. No se declara una partida visual exhaustiva ni una prueba autenticada de todos los flujos con dos cuentas. La batería final y sus hashes se conservan en el workspace bajo `outputs/disenador-2026-10-16/`.

Para esta tanda quedan tres pruebas con jugadores/cuentas aisladas: una partida PC completa; mercado y guardado con dos cuentas/pestañas y reconexiones; y experiencia de balance, especialmente nasas, cañas y regeneración. No usar estas pruebas como garantía para habilitar dinero real.
