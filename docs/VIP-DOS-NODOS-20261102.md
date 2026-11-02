# VIP: dos nodos a elegir, sin cambiar la capacidad

El usuario trasladó la aclaración del diseñador: «Mantener la capacidad actual y
añadir los dos [...] Nodos». Se conserva +25 % de capacidad (mínimo dos cupos),
precio de 10 Golden, duración de 30 días y resto de ventajas.

La primera activación da dos elecciones gratuitas, una sola vez por cuenta en la
partida. Se eligen en Cobertizo entre parcelas, árboles, rocas y minerales que ya
cumplan nivel, emplazamiento y capacidad. No desbloquean terrenos ni niveles.
Son propiedad del jugador: al vencer VIP se conserva lo adquirido; el exceso de
producción se pausa por la regla existente. Renovar no repite el regalo.

vipNodos guarda el saldo de elecciones (0–2); vipNodosV=1 marca la entrega. Snapshot
e hidratación los conservan, incluso después de gastar ambos. La migración reconoce
VIP anteriormente registrado al cargar, sin descontar Golden otra vez. Sin un VIP
registrado no entrega nada. La consulta inicial encontró cero VIP registrados:
Not tenía vipHasta=0, pass.vip=false y ningún entitlement vip; no se le modificó.

Los vales de expansión siguen separados y conservan sus tres elecciones básicas.
Se consumen primero para esas opciones; las elecciones VIP permiten cualquier tipo
desbloqueado. El servidor comprueba procedencia, saldo, consumo con una adquisición,
topes, pago del VIP, nivel, terreno y capacidad. Guardados de clientes anteriores
que omitan los campos conservan los saldos registrados, sin perderlos ni reponerlos.

La validación de compras agrupadas asigna el descuento máximo permitido a nodos
realmente adquiridos y elegibles, sin depender del orden de los clics. Nunca supera
la cantidad de vales y elecciones acreditadas. No se acreditan Plata ni Golden.

Pruebas: test-vip-nodos (primera compra, anterior, F5, renovación, expiración,
mineral desbloqueado, cliente viejo, consumo sin nodo y rechazo de regalo Free),
elección de expansión, guardado atómico, reglas del portero, menú VIP, beneficios
Free/VIP y registro de compras alfa. Las pruebas son locales/simuladas: no se compró
VIP ni se cambió el saldo o progreso de ninguna cuenta real. No cambia el estudio
económico ni se activan retiros ni canje Plata → Golden.
