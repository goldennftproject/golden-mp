# Economía integrada en la granja

No hay laboratorio ni otra partida. Esta entrega modifica Golden real.

## Capacidad y progresión

- Partida nueva: tres parcelas (se conserva el tutorial), un árbol y una roca; cinco cupos productivos compartidos. No se regalan los otros árboles, rocas o vetas al cargar.
- Cada expansión añade un cupo permanente, sin colocar árboles, rocas y vetas automáticamente. Conserva el terreno y la obra de 10 minutos por número de expansión. Precio: `20 + 10*i + 5*i*i`, con `i` expansiones ya compradas; la primera pide además dos maderas y dos piedras. Las 16 cuestan 7.720 plata y la última 1.295, en vez de 92.837 y 36.584. No se devuelven ni cobran diferencias por terrenos ya comprados.
- La primera incluye un nodo básico elegido desde Cobertizo. Las posteriores habilitan capacidad, pero los nodos se compran por separado.
- Cobertizo → Capacidad productiva permite comprar parcelas, árboles, rocas y vetas del terreno disponible y pausar/reactivar producción. Pausar no mueve el objeto ni libera su celda física: libera su cupo productivo. Cargas, semillas y tiempo restante se conservan. No hay crecimiento o regeneración durante la pausa, tampoco por recargar.
- Los nodos comprados esperan su primer ciclo; no se compran cuatro cargas instantáneas. Árbol 30 minutos, roca 40 minutos, máximo cuatro; las vetas conservan sus ciclos.
- El mundo ofrece emplazamientos finitos por tipo. Para comprar uno, su posición tiene que estar libre. Se puede mover luego con el editor habitual. No es todavía una generación ilimitada de nodos de cualquier especie.

## Partidas existentes

La migración añade capacidad suficiente para conservar lo adquirido, sin borrar recursos, nodos, parcelas ni posiciones. Esa capacidad heredada se guarda: no se vuelve a conceder en cada entrada. Las expansiones futuras añaden sólo un cupo. Los regalos y objetos ya obtenidos se mantienen, pero activar producción nueva respeta la capacidad.

## Mercado

El mercado vende cultivos, madera, piedra, minerales y procesados. Los precios usan presión compartida por familia, con recuperación de seis horas. Un tablón equivale a tres maderas; cada barra, a tres minerales. Transformar no reinicia la presión ni el cupo. Cultivos: piso de semilla +20% del margen; madera y piedra: 50% del base; minerales: 60% para conservar margen sobre los picos valorados a precio base. No es una garantía de rentabilidad integral del crafteo.

La plata interna ya no tiene un presupuesto global que pueda agotar otra cuenta. Cada jugador tiene cuota diaria por familia: `ceil(demandaBase*4*capacidad/5)`, nunca menos de cuatro veces la demanda base. El volumen equivalente de los procesados consume la cuota de su materia prima. La curva global escala con las cuentas activas durante los últimos siete días, no con el número de solicitudes. Demanda base: 100 para cultivos cortos, madera y piedra; calabaza 25, brócoli 30, girasol 15, trigo/maíz 20 y minerales 30.

Golden tiene su propio límite personal de compra NPC, medido en plata equivalente: `max(5000, capacidad*1000)` por día UTC. Alcanzarlo no bloquea las ventas por plata para semillas. Las cuotas se renuevan por fecha sin cron. No hay una reserva en USDT detrás de estos números. Caché de cotización de 60 segundos, actualización al abrir y después de vender; lotes máximos de 10.000 unidades.

La Edge Function `mercado` verifica la sesión. Dos funciones SQL, ejecutables exclusivamente por `service_role`, consultan y liquidan; tablas privadas con RLS. La venta bloquea las filas correspondientes y actualiza inventario, saldo, presión, presupuesto y recibo en una sola transacción. Una UUID identifica el reintento: nunca cobra dos veces la misma venta. Sin conexión no hay ventas locales sustitutivas. $Golden sigue siendo moneda del juego: conversión entera de 500 plata por Golden, con el sobrante no convertido explícito en la interfaz.

El guardado se serializa y compara la versión leída antes de escribir; un conflicto no pisa la otra sesión ni restaura a ciegas. Durante la venta se bloquean acciones y autosaves. Si se pierde la confirmación se protege el guardado; al recargar se consulta la granja de la nube, aparcando el respaldo previo para que no reaparezca inventario ya vendido.

## VIP único

Hay un solo VIP, de 30 días por 100 $Golden existentes, sin pago externo. Beneficio: +25% de capacidad Free, redondeado hacia arriba y con mínimo de dos cupos, más el carril VIP del pase. Así no se diluye a sólo +9,5% en la granja final. Los nodos extra se compran aparte. Ambas entradas llaman a la misma compra; no se cobra otra mientras está activo. El pase devuelve hasta 60 Golden una sola vez por los niveles reclamados, no cada renovación. No se promete rendimiento ni que se autofinancie.

El vencimiento se procesa antes de actuar y al cargar: el excedente se pausa en el instante de vencimiento, no al regreso. Se prefieren las últimas producciones compradas/reactivadas. Los nodos y cultivos se conservan. Si ya había capacidad Free suficiente no se pausa nada. El acceso VIP del pase usa ese mismo vencimiento; los premios ya reclamados se conservan. Un pase VIP anterior al cambio recibe 30 días de VIP único sin cobrar, una sola vez, con bandera de migración. No se renueva ni cobra automáticamente. Es saldo del juego con la misma persistencia cliente del resto de Golden, no una autorización monetaria segura para futuros pagos reales.

## Validación

Reglas v5 del guardado: rechazan aumentos de Golden sin disminución de reservas propias o premio VIP válido, borrado de premios reclamados, VIP sin pago, vencimientos arbitrarios, alteración de la capacidad heredada, nodos inexistentes, exceso de producción activa y expansiones sin una obra guardada terminada. También comprueban la partida inicial. La migración de cuentas antiguas se deriva del mundo y su terreno; no confisca capacidad aceptada. Nuevas granjas con un respaldo huérfano avanzado requieren revisión de migración, no se acepta inventario inicial arbitrario. Ante una violación económica se responde 409: se bloquea el envío y se conserva el respaldo, sin hidratar a ciegas y borrar lo jugado.

La XP productiva de granja suma Cultivo +15×Tala +20×Minería: se normalizan las acciones básicas a unas 300 XP por hora de nodo. Las tareas mixtas siguen siendo una ruta, no una obligación para un minero/leñador cuyo oficio principal alcance el requisito mostrado. El prestigio conserva los oficios y guarda un offset de XP para no reutilizar la vuelta anterior. Este cambio no altera las curvas de los oficios ni los gathering. La derivación de XP 11–25 y los insumos del pase usan ahora cinco cupos iniciales y uno por expansión, no nueve y tres. Los primeros diez umbrales y el techo de 95.000 se mantienen. Los premios ya reclamados no se retiran.

`golden_economia.movimientos` registra variaciones de saldo aceptadas desde la instalación: origen NPC cuando está disponible, importe, fecha y UUID; el resto se etiqueta como snapshot cliente validado, no como producción probada. Historial privado sin acceso de clientes. Las tablas y RPC mantienen privilegios mínimos y JWT verificado.

Pruebas adicionales: `node tools/test-protecciones-economia.js`, `node tools/test-familias-mercado.js`, `supabase/tests/balance-personal.sql` (BEGIN/ROLLBACK). La prueba SQL comprueba ventas después de que otra cuenta agote su cuota, materias primas/procesados, Golden separado, idempotencia, trazabilidad y permisos. `mercado-compartido.sql` documenta el modelo anterior y no es la prueba vigente de cuotas personales.

`node tools/test-capacidad-productiva.js`

`node tools/test-mercado-dinamico.js`

`node tools/test-mercado-compartido.js`

`node tools/test-guardado-atomico.js`

`supabase/tests/mercado-compartido.sql` y `supabase/tests/market-guardado.sql`: ejecutar siempre dentro de BEGIN/ROLLBACK. Verifican lógica y permisos reales sin dejar cambios en las cuentas de prueba.

`node tools/arrancar-el-juego.js`

El arnés ejecuta código real con DOM/Phaser simulados; no sustituye la prueba visual ni una validación de persistencia contra el servidor de producción.

## Pendiente, no activado

Decisión del usuario: terminar economía interna; retiros desactivados. No hay cobro externo, token, promesa de rendimiento o retiro real en esta entrega. No se usan saldos Golden existentes como obligación pagadera en USDT. El comprador compartido no representa una reserva de dinero real.

Esto no convierte todo el juego en una economía autoritativa: producción, VIP y otras recompensas todavía parten de snapshots del cliente y controles heurísticos del portero; el mercado P2P conserva su flujo previo. No debe habilitarse dinero real sobre estas garantías. Supabase presenta avisos preexistentes sobre vistas de ranking con permisos del propietario, cuentas anónimas heredadas y protección de contraseñas filtradas desactivada; no se alteraron los rankings ni se expulsaron cuentas para resolverlos a ciegas. Referencias: [vistas y RLS](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
