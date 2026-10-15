# Economía experimental — primera prueba jugable

Abrir `http://127.0.0.1:2567/economia.html` con el servidor de Golden iniciado, o Configuración → Economía experimental en el juego habitual.

Esta es una partida local independiente, no una migración del juego principal. No usa la cuenta, los saldos, los guardados ni los servicios financieros del juego. Se guarda únicamente en la clave de navegador `golden-economy-lab-v1`. No ejecutar un despliegue para probarla localmente.

## Qué probar

1. Empezar Free con dos parcelas, un árbol y una roca: cuatro cupos compartidos. Comprar semillas, sembrar, cosechar y elegir entre venta y exportación.
2. Construir la Herrería o ahorrar para la primera expansión. Cada expansión añade un cupo; la primera incluye un nodo básico a elección. El resto se compra aparte.
3. Guardar nodos para especializar la producción. Se conservan cargas y cultivos, pero no producen guardados. Los nodos comprados empiezan sin cargas; sólo los iniciales traen cuatro.
4. Comparar ventas concentradas con diversificación. Cada unidad vendida reduce la prima de ese recurso; las otras mantienen su cotización. La prima se recupera con una constante de seis horas. Hay presupuesto diario y demanda limitada, no un mercado entre jugadores.
5. Activar el VIP ficticio de 30 días: dos cupos extra y exportación ponderada de 30 unidades diarias frente a 10 Free. Al vencer, los nodos extra pasan al cobertizo, sin borrarse ni seguir produciendo.
6. Comparar visitas avanzando el reloj desde Pruebas y VIP. Los ciclos siguen siendo árbol 30 minutos, roca 40 minutos y máximo cuatro cargas. Papa: tres minutos.

## Exportación sin dinero real

Plata, puntos y créditos ficticios son balances distintos. Papa, madera y piedra consumen una unidad de cupo; tablones y bloques consumen tres. Cada unidad de cupo entrega diez puntos. El fondo de liquidación es una simulación de 40.000 créditos con 10.000 puntos externos ficticios. Se liquida una vez al día. No hay token, paridad con USDT, wallet, cobro de VIP ni retiro.

Son parámetros iniciales de ensayo, no precios ni rendimientos prometidos. El reloj local se puede modificar y el almacenamiento se puede editar: este prototipo no es autoridad monetaria. La demanda compartida, presupuesto global, VIP pagado, liquidación cerrada por período, reserva real, controles antiabuso y operaciones atómicas requieren servidor antes de cualquier economía canjeable.

## Validación y mantenimiento

Ejecutar `node tools/test-economia.js`: motor, capacidad, pausas, vencimiento, mercado, exportación, idempotencia, assets y flujo de interfaz en jsdom. No equivale a una revisión visual en navegador.

Descargar copia desde Pruebas y VIP antes de reiniciar. Un guardado ilegible se conserva y bloquea acciones; no se reemplaza automáticamente. La partida no sincroniza entre computadoras. Navegadores con Web Locks coordinan las escrituras entre pestañas; para probar en navegadores sin esa API, usar una sola pestaña.

Pendiente de evaluación conjunta: ritmo real de progresión, especializaciones dominantes, costes y niveles, competitividad Free/VIP y si este ciclo merece integrarse a la granja principal. No modifica animales, combate, Plaza ni el diseño mobile.
