# Vale gratuito y compras avanzadas — 05/11/2026

El propietario autoriza «Y bueno arréglalo entonces, fíjea eso» tras comprobar el reporte de Memo: la guía conducía a una sección titulada Elegir nodo gratuito, que también contenía el botón de comprar Oro. En la reproducción local, el clic real compraba oro por 500 Plata y conservaba el vale; la brújula seguía recordando su canje pendiente.

## Corrección

- `prod-elegir` contiene únicamente los tres canjes del vale: parcela, árbol y roca. Cada vale permite elegir un nodo.
- `prod-vip-elegir` contiene las elecciones incluidas del VIP y `prod-comprar` las compras con Plata. Cada tipo se muestra una sola vez, con la fuente real de la operación existente. Se conserva la prioridad: vale básico, regalo VIP, Plata.
- Una opción antigua se invalida si cambia su fuente antes de pulsarla; no puede pasar silenciosamente de regalo a compra. Al agotar un regalo, el foco pasa al título de sección, sin saltar a un botón de pago. Si sigue habiendo vales, conserva el foco en la misma opción gratuita.
- Las vetas muestran el nivel de Minería y el pico necesario para usarlas. Es información previa: no se añaden requisitos de compra nuevos.
- La brújula nombra las tres elecciones. Si falta cupo dirige a Gestionar producción activa y pausada; si no quedan emplazamientos básicos y ya se alcanzó el máximo de parcelas, explica que debe liberar espacio o expandir. El botón de guía sólo señala, nunca pausa ni compra.
- Los desplegables mantienen su apertura por identificador; el cierre de un apartado gratuito no abre otro de pago por posición.

## Preservación

No se cambian operaciones del servidor, precios, requisitos, cantidades, tiempos, fuentes de los regalos, guardado ni partidas. El oro y el vale de Memo se conservan; no hay compensación, pausa automática ni modificación de su cuenta. No hay consultas adicionales a Supabase, migración ni activación de sistemas pausados. El estudio económico permanece apartado.

## Verificación

`node tools/test-nodo-gratuito.js` ejecuta 23 casos independientes con el renderer, botones y motor reales en un contexto sintético: separación, clic pagado, canje gratuito, VIP simultáneo, prioridades, cupo, emplazamiento, pausa y conservación del oro, render sin mutaciones ni guardados, ARIA, foco y clics antiguos.

Se ejecutan además las pruebas de expansión/vales, VIP, capacidad productiva, orientación de alfa, nodos Golden, progreso de tutorial, etiquetas de guía y componentes de menús. Se ajustan dos expectativas antiguas al destino nuevo de la guía y a la sección VIP separada. La prueba de capacidad aísla las decoraciones del navegador que su DOM mínimo no implementa; conserva el motor y la comprobación posterior de botones en JSDOM.

`test-paneles-intuitivos.js` contiene expectativas anteriores al lote: cuenta también el resumen anidado de nodos Golden y espera ocho filas VIP cuando ya son nueve. Esa discrepancia se comprueba también con las fuentes del commit previo; se registra sin modificar esa prueba ni la interfaz ajena al lote.

Diagnóstico, reproducción anterior, revisión independiente, comparación con la base y recibo de publicación: `work/tutorial-free-node-20261105/` en el workspace de Codex. No se han enviado mensajes a Discord con este lote.
