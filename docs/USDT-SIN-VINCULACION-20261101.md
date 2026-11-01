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
- La primera transferencia real sigue pendiente de envio por un jugador; no se ha movido dinero durante las pruebas. El cambio no elimina por si mismo la alerta reputacional de MetaMask.

Correccion 01/11: Pegar solicita el portapapeles solo al pulsar el boton, valida el hash y no acredita por si solo. El tick del canje pausado ya no reconstruye el formulario cada segundo. El Banco indica conflictos del guardado y ofrece Revisar guardado usando la recuperacion existente, con confirmacion y respaldo local. No omite CAS ni cambia saldos manualmente.
