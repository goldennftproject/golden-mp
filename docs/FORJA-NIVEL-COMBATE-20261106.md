# Nivel de Combate visible al forjar — 06/11/2026

Dirección pide mostrar el nivel de Combate de cada arma y bloquear Forjar cuando el jugador no lo alcanza; autoriza probar y publicar.

La Herrería muestra «Para forjar: Combate Nv. N» en las veinte armas y en la espada de entrada con la sección cerrada. Si falta nivel, añade el nivel actual y desactiva Forjar, con el motivo también en su descripción. Lee `ARM_DEF[id].lvl` y `combatInfo().lvl`, los mismos datos que valida `craftWeapon`.

Se conserva la escala madera 1, piedra 4, bronce 8, oro 12 y diamante 16. Materiales, Plata y enfriamiento siguen bloqueando la fabricación cuando corresponde. Las armas ya obtenidas conservan Equipar y Reparar sin una nueva restricción de nivel. No cambia el estado ni el guardado.

Validación: `node tools/test-forja-nivel-combate.js`, `node tools/test-forja-foco-teclado.js`, `node tools/test-espada-entrada.js` y comprobación de sintaxis de `ui.js`. Revisión de navegador con granja sintética aislada, sin inicializar Auth ni guardado remoto: los veinte requisitos presentes; en Combate 1 sólo madera habilitada y en Combate 4 también piedra; sin errores de aplicación ni desbordamiento de filas.

La publicación se acredita por `/healthz` y comparación del JavaScript servido con el archivo del commit, aplicando la eliminación de comentarios que realiza el servidor. Recibo local en `work/forge-combat-level-20261106/publication-receipt.json` del espacio de trabajo de Codex.
