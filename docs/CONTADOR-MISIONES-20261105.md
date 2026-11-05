# Contador de recompensas diarias — 5 de noviembre de 2026

El acceso visible a Misiones abría la lista de objetivos diarios, pero no indicaba si había premios listos para reclamar. Dirección autorizó implementar, probar y publicar un contador discreto tras revisar esa propuesta.

El botón conserva su icono, nombre, posición y acción. Un indicador pequeño muestra el número de misiones diarias confirmadas, completas, sin cobrar y con premio disponible. No se muestra un cero. El nombre accesible y el tooltip explican la cantidad.

`syncJornadaBadge()` usa `jornadaEstado()` y las definiciones actuales de las cinco misiones. El latido del HUD y la actualización de actividad confirmada mantienen la cifra al día. El reinicio de día UTC y la compatibilidad del antiguo premio de cosecha siguen las reglas existentes. Las acciones locales sin confirmar no aumentan el contador.

No se realizan consultas adicionales, escrituras, cobros automáticos ni cambios de reglas, importes o saldos. Logros y las misiones del Pase conservan sus propios contadores. El decorador de Renovado mueve el mismo nodo y lo restaura al volver a Clásico; no sustituye el botón ni su controlador.

## Validación

- `node tools/test-contador-misiones.js`: cero, uno y cinco premios, objetivos parciales, reclamados, límite diario, premio parcial, ACK, acciones locales no confirmadas, compatibilidad y medianoche UTC; sin red, guardados o mutación de partida. Alternancia de aspecto conserva nodo y listener.
- Regresión: `test-misiones-diarias-ui.js`, `test-visual-v2.js` y `test-compras-visuales-pc.js`.
- Revisión nativa en Chrome de los controles reales con datos ficticios, sin Auth ni guardado: contador de dos premios de 18 × 18 px, sin desbordamiento; aspecto Clásico conserva el contador y el estado sin premios no renderiza el indicador.

La vista de prueba local y sus controles no se publican con el juego. No se usan cuentas reales para reclamar recompensas durante la comprobación.
