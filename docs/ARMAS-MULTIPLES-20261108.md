# Varias copias de armas por forja y compra — 08/11/2026

Dirección autoriza forjar y comprar varias espadas iguales, conservar la durabilidad y mejoras de cada copia, probar y publicar. Se reutiliza el inventario de instancias independientes publicado para las entregas; sólo una pieza aporta daño y bonos al estar equipada.

## Comportamiento

- Herrería ofrece **Forjar otra** y conserva el acceso a Equipar y Reparar. Cada copia paga la receta, Plata y enfriamiento vigentes, con los mismos requisitos de desbloqueo y Combate.
- La operación `forja` confirma primero el guardado. El servidor verifica cuenta, base y operación, calcula costes de los veinte modelos, entrega XP de Artesanía una sola vez y genera una entrega con la ficha nueva. El arma anterior y sus mejoras/runas permanecen intactas. Los recibos y relojes aceptados no se pueden reiniciar con un snapshot.
- Recoger añade la primera pieza o una copia en bolsa. Si no cabe, permanece pendiente. La primera arma se autoequipa únicamente si no existía antes y no había otra equipada. Forjar otra no cambia el equipo elegido, incluso si estaba vacío.
- El comercio permite comprar armas aunque el comprador tenga ese modelo o entregas anteriores. El pago, recibo, destino y ficha completa se confirman con la transacción existente. Las armaduras conservan su regla previa.

## Base y despliegue

La función desplegada `p2p_operar` se contrastó íntegra con el cuerpo del repositorio antes de preparar el cambio. La migración cambia sólo la condición que rechazaba armas repetidas, con comprobación de la definición anterior y sin alterar tablas, filas ni permisos. Se preservan `SECURITY DEFINER`, `search_path` vacío y ejecución exclusiva del servidor. El nombre del archivo local coincide con la versión confirmada en el historial remoto.

## Validación

Pruebas del cliente y handler real: veinte modelos, cantidades/Plata/XP/enfriamiento, niveles, copia con mejoras y runas, espacio de bolsa, guardado/recarga, primera arma, equipo vacío, doble clic, respuestas perdidas y cambio de cuenta. PostgreSQL local ejecuta la definición previa, reproduce ambos rechazos y aplica la migración exacta: dos compras de espadas distintas conservan sus fichas y los cobros no se duplican. Se conservan bloqueos de armadura y permisos.

Chrome local verifica Forjar otra, descuento de 5 Madera y 10 Plata, entrega nueva con 80 usos, conservación de la espada +3 con 13 usos y recarga confirmada. Sin operaciones de prueba sobre cuentas reales ni cambios de probabilidades, precios, recetas, partidas, retiros, canje o sistemas pausados.
