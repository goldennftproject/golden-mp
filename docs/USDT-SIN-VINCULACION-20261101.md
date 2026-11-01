# Recargas por importe exclusivo
- Banco: Preparar recarga -> copiar importe completo y direccion (QR solo direccion) -> enviar externamente -> Comprobar pago.
- No conexion a wallet, firmas, permisos de tokens ni transacciones disparadas desde el navegador.
- 1 USDT = 1 Golden; tambien se acredita la fraccion de identificacion. No es una comision adicional.
- Solicitudes de 1 a 10.000 Golden base, mas 0,000001 a 0,009999 USDT; seis decimales. Solo una solicitud activa por cuenta, reutilizada al reintentar.
- Cada importe queda reservado permanentemente, nunca se reasigna. Hasta 9.999 solicitudes historicas por importe base; agotado, se pide elegir otro importe.
- Plazo 30 minutos medido por fecha del bloque. Se puede confirmar despues del plazo si la transferencia se incluyo a tiempo.
- Fuera de plazo, importe distinto, segundo pago a la misma solicitud o transferencia no directa requieren revision del equipo. Nunca se debe enviar de nuevo para resolver una espera.
- Cualquier wallet emisora, pero solo USDT BEP20 BSC, destino y contrato fijos. Verificacion de transferencia directa, log, bloque canonico, 120 confirmaciones, finalidad y acuerdo de dos RPC.
- Busqueda bajo demanda (sin cron ni polling permanente), hasta tres tramos de 2.000 bloques finalizados por clic; puede requerir varios clics para historiales largos. Dos proveedores gratuitos de logs, PublicNode y dRPC, ya que los endpoints publicos oficiales BSC no permiten eth_getLogs. Si falla uno, el otro puede localizar candidatos; la acreditacion siempre exige los dos nodos BSC. El hash es alternativa si falla la busqueda.
- La busqueda solo localiza: la acreditacion siempre vuelve a verificar recibo y transaccion con los dos nodos BSC originales.
- RPC SQL privadas para service_role; Edge verifica JWT y cuenta. CAS, tx unica y bloqueo transaccional impiden dobles cobros. Ordenes ligadas a usuario.
- Golden pagado sin gastar conserva seis decimales y proteccion para la futura release; no se altera el estudio economico.
- Retiros y Plata a Golden siguen desactivados. No hay claves nuevas ni custodia de wallets de jugadores.
- Al migrar: cero wallets vinculadas y cero depositos existentes; no se borro progreso. Tablas y rutinas historicas se conservan, pero challenge/bind ya no estan expuestos por la Edge.
- Pruebas: test-usdt-edge.js, test-usdt-protocol.mjs, test-usdt-orders.mjs, test-usdt-orders-ui.js, test-recarga-desde-compras.js; SQL test-usdt-solicitudes.sql crea fixtures y revierte todo con ROLLBACK.
- Se ha confirmado un deposito real acreditado por el flujo normal. Esta auditoria no envia nuevas transferencias reales; usa simulacion integral y fixtures SQL revertidos. El cambio no elimina por si mismo la alerta reputacional de MetaMask.

Correccion 01/11: Pegar solicita el portapapeles solo al pulsar el boton, valida el hash y no acredita por si solo. El tick del canje pausado ya no reconstruye el formulario cada segundo. El Banco indica conflictos del guardado y ofrece Revisar guardado usando la recuperacion existente, con confirmacion y respaldo local. No omite CAS ni cambia saldos manualmente.

Feedback y recuperacion 01/11: la respuesta de comprobar pago queda junto al boton y se desplaza a la vista. Se distinguen otra operacion activa, sesion no cargada, conflicto y guardado previo sin ACK. Se prueban tanto la acreditacion cliente simulada como fallos previos al envio. Una recuperacion de un pago ya verificado usa usdt_credit_order con el recibo exacto, CAS y hash unico, en una transaccion que comprueba que ningun campo de progreso distinto de Golden cambia; nunca se edita el saldo a mano. En pruebas asincronas del cliente hay que desactivar el initSave de arranque para que la sesion ficticia no sea sustituida por el mock sin usuario.

## Auditoria completa y recibos duraderos
- Confirmar el pago (verify) ya no exige guardar una granja sin conflictos. Solo la posterior aplicacion del Golden necesita sincronizacion y CAS.
- usdt_prepare_order conserva TX, remitente, bloque, hash, log, tiempo y fecha de verificacion en la solicitud privada. Solo service_role puede registrar recibos; el cliente nunca aporta pruebas sin verificar.
- La Edge comprueba ambos nodos, importe, destino, contrato, plazo, 120 confirmaciones y finalidad antes de registrar. El recibo registrado es inmutable e idempotente.
- Despues se aplica por usdt_credit_order. Si falla el guardado, cambia la version o se pierde la respuesta, el recibo sigue presente.
- Al cargar la cuenta, abrir el Banco, recuperar el guardado o confirmar un guardado normal, se reanuda la aplicacion pendiente. No se monta un cron ni un sondeo permanente. Una pausa de depositos conserva los recibos y detiene el reintento automatico conocido.
- No hay acreditacion antes de verificar, ni doble credito al repetir el mismo TX. Un recibo ya verificado puede liquidarse sin volver a depender de proveedores RPC, manteniendo CAS, hash unico, saldo pagado de alfa y progreso.
- El jugador sigue iniciando la comprobacion del pago; si aun faltan confirmaciones o no se encuentra, recibe el estado y puede comprobar de nuevo. Una granja en conflicto sigue pidiendo su recuperacion segura; no se sobrescriben cambios locales sin confirmacion.
- test-usdt-full-flow.js conecta cliente real, Edge real y verificador real con cadena y repositorio simulados: creacion, busqueda con un proveedor caido, pago ausente, confirmaciones insuficientes, importe incorrecto, conflicto, guardado sin ACK, respuesta perdida tras verificar y tras acreditar, reentrada, RPC caidos despues de verificar e idempotencia. No es una transferencia real.
- sql/test-usdt-pagos-verificados.sql ejecuta las rutinas reales de PostgreSQL con fixtures y ROLLBACK: propiedad, importe y plazo, recibo persistente sin tocar granja, CAS fallido, recuperacion, credito unico, resto del progreso intacto y Golden pagado conservado. Fixtures de Auth terminan en cero.
