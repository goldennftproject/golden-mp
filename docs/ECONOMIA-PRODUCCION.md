# Economía integrada en la granja

No hay laboratorio ni otra partida. Esta entrega modifica Golden real.

## Capacidad y progresión

- Partida nueva: tres parcelas (se conserva el tutorial), un árbol y una roca; cinco cupos productivos compartidos. No se regalan los otros árboles, rocas o vetas al cargar.
- Cada expansión añade un cupo permanente, sin colocar árboles, rocas y vetas automáticamente. Conserva el terreno y la obra de 10 minutos por número de expansión. Primera expansión: 20 plata, dos maderas y dos piedras; las siguientes: 20 × 1,65 elevado a las expansiones ya compradas, redondeado.
- La primera incluye un nodo básico elegido desde Cobertizo. Las posteriores habilitan capacidad, pero los nodos se compran por separado.
- Cobertizo → Capacidad productiva permite comprar parcelas, árboles, rocas y vetas del terreno disponible y pausar/reactivar producción. Pausar no mueve el objeto ni libera su celda física: libera su cupo productivo. Cargas, semillas y tiempo restante se conservan. No hay crecimiento o regeneración durante la pausa, tampoco por recargar.
- Los nodos comprados esperan su primer ciclo; no se compran cuatro cargas instantáneas. Árbol 30 minutos, roca 40 minutos, máximo cuatro; las vetas conservan sus ciclos.
- El mundo ofrece emplazamientos finitos por tipo. Para comprar uno, su posición tiene que estar libre. Se puede mover luego con el editor habitual. No es todavía una generación ilimitada de nodos de cualquier especie.

## Partidas existentes

La migración añade capacidad suficiente para conservar lo adquirido, sin borrar recursos, nodos, parcelas ni posiciones. Esa capacidad heredada se guarda: no se vuelve a conceder en cada entrada. Las expansiones futuras añaden sólo un cupo. Los regalos y objetos ya obtenidos se mantienen, pero activar producción nueva respeta la capacidad.

## Mercado

El mercado del juego permite vender cultivos, madera, piedra, minerales y procesados de minería/tala, con cotización marginal por recurso y valor del lote visible. Las ventas deprimen ese recurso; la presión local decae con una constante de seis horas. En cultivos se mantiene el coste de semilla y un mínimo de margen; en materiales el piso es la mitad del precio base, no una garantía de rentabilidad del crafteo. Las tres unidades iniciales conservan su valor para el tutorial. Las fracciones pendientes se guardan para impedir ventajas por dividir lotes. Es presión de la propia granja, no oferta/demanda global entre cuentas.

## VIP único

Autorizado con el $Golden existente del juego, no con un pago externo. Hay un solo VIP: su compra de 30 días activa dos cupos extra y los beneficios VIP del pase existente. Compra con confirmación en Cobertizo o desde el pase; ambas entradas llaman a la misma operación y al mismo saldo. Precio inicial de balance: 100 $Golden. Constantes `PRODUCCION_VIP_PRECIO`, `PRODUCCION_VIP_DIAS`, `PRODUCCION_VIP_CUPOS`. No se cobra otra compra mientras está activo.

El vencimiento se procesa antes de actuar y al cargar: el excedente se pausa en el instante de vencimiento, no al regreso. Se prefieren las últimas producciones compradas/reactivadas. Los nodos y cultivos se conservan. Si ya había capacidad Free suficiente no se pausa nada. El acceso VIP del pase usa ese mismo vencimiento; los premios ya reclamados se conservan. Un pase VIP anterior al cambio recibe 30 días de VIP único sin cobrar, una sola vez, con bandera de migración. No se renueva ni cobra automáticamente. Es saldo del juego con la misma persistencia cliente del resto de Golden, no una autorización monetaria segura para futuros pagos reales.

## Validación

`node tools/test-capacidad-productiva.js`

`node tools/test-mercado-dinamico.js`

`node tools/arrancar-el-juego.js`

El arnés ejecuta código real con DOM/Phaser simulados; no sustituye la prueba visual ni una validación de persistencia contra el servidor de producción.

## Pendiente, no activado

Exportaciones con presupuesto compartido, demanda global y cualquier liquidación canjeable requieren integración y autoridad del servidor. No hay cobro externo, token, promesa de rendimiento o retiro real en esta entrega. No se usan saldos Golden existentes como obligación pagadera en USDT. No se ha modificado Supabase.
