# Nodos de producción con Golden — 03/11/2026

## Reglas aprobadas

- Se conserva la compra con Plata, los vales de expansión y las dos elecciones del VIP.
- La compra con Golden es independiente de las expansiones y no consume esos regalos.
- Cada nodo Golden incluye un cupo propio, reservado a ese nodo; no añade terreno ni cupos intercambiables para producción normal.
- Árbol y piedra: 1 / 1,5 / 2 Golden para primera, segunda y tercera compra de cada tipo.
- Bronce: 2,5 / 3,5 / 5 Golden.
- Tres compras por tipo y máximo histórico de 12 por cuenta. El catálogo inicial tiene tres tipos, por lo que permite nueve compras; el máximo general no añade un cuarto tipo.
- Puede adquirirse un derecho y dejarse en el Cobertizo. Para colocarlo hace falta una celda libre del terreno abierto; bronce conserva su desbloqueo de nivel 3.
- Las compras son permanentes y se conservan para el lanzamiento según lo acordado para las mejoras de alfa. En una granja reiniciada vuelven pendientes de colocar; no se restauran recursos ni XP por esta compra.

## Seguridad y presentación

Precios, historial y descuento se calculan en el servidor. El precio confirmado debe coincidir con el mostrado. Una operación repetida no vuelve a cobrar ni a colocar. Los nodos premium usan índices reservados, sin consumir emplazamientos de las expansiones ni alterar índices existentes. El servidor verifica terreno y ocupación; las visitas sólo muestran la colocación confirmada.

No cambia la tasa de recolección, energía por recurso, retiros, depósitos ni el estudio económico de sostenibilidad.

## Verificación y publicación

Pruebas completadas: cliente (precios, límites, cupos, cancelación y confirmación), coordinador de guardado/hidratación, renderer real (nueve nodos en 9×9), 60.000 comprobaciones de geometría en cuatro formatos, API y transacciones SQL reales en PostgreSQL aislado mediante PGlite. Auditoría independiente revalidó omisión/adelanto de relojes, consumo de cargas, falsificación de tamaño y conservación de compras al cambiar campaña. Se conservan las pruebas de autoguardado, recuperación, VIP, visitas y guardado atómico. No se ejecutaron compras de jugadores ni transferencias reales.

El cliente compatible se publica inicialmente con PRODUCCION_PREMIUM_ACTIVA=false. La revisión automática requiere autorización específica para sustituir guardar en producción; no activar la opción hasta desplegar y verificar guardar, el esquema privado y la función produccion-premium. El esquema tiene su propio interruptor cerrado inicialmente.
