# Incursión de prueba del tutorial

Dirección confirma el 4 de noviembre: «solo se pueda hacer incursión de un click siendo free solo para completar tutorial y ya está. Queda demás vip».

Una cuenta Sin VIP puede iniciar una única incursión de prueba a Zona Negra I mientras su tutorial esté en ese paso y no haya realizado incursiones. Al salir, avanza al siguiente objetivo. El resto de las incursiones automáticas requiere VIP, que conserva el máximo de tres al día UTC. El acceso manual a Zona Negra continúa disponible para ambos.

No se elimina ni renumera ningún paso ni se reinicia el tutorial. Se conservan las incursiones ya iniciadas, sus fechas y su resolución, aunque venza el VIP. No se cambian duración, botín, XP, desgaste, estamina de combate ni energía de granja.

## Validación y persistencia

- El cliente usa `incursionDisponiblePorTutorial(zona = "zn1")`; el botón sólo puede ofrecer la prueba en `zn1`.
- Guardar V9 contrasta el paso 25 ya aceptado en el servidor, ausencia de incursiones anteriores, contador inicial cero y el avance del tutorial con la primera salida.
- Antes de iniciar la prueba Sin VIP, la interfaz debe confirmar el guardado pendiente de ese paso; una conexión lenta no debe enviar la salida mientras el servidor todavía conserve el paso anterior.
- El servidor mantiene `incursionTutorialUsada` y nunca acepta borrarla enviando `false` u omitiéndola. Los historiales, las salidas ya aceptadas y un tutorial anteriormente superado también consumen la posibilidad de prueba. Retroceder el paso o borrar el contador local no la recupera.
- El cupo diario se calcula desde la fila aceptada. Cambiar `incDia` en el cliente no devuelve usos; la cuarta salida se rechaza. Conservar/reintentar la misma salida no la cuenta otra vez.
- El ACK normal y el de operación repetida devuelven la marca. El cliente la conserva en snapshot, carga y confirmación del guardado.

Estas comprobaciones son sobre guardados aceptados. No convierten el combate ni todo el tutorial en operaciones autoritativas ni certifican ausencia de trampas: el cálculo de combate y sus límites previos siguen en su arquitectura existente.

## Pruebas locales

Pruebas ejecutadas contra los archivos reales, con partidas ficticias en memoria, sin cuentas reales ni red:

- `test-incursiones-free-vip.js`: una prueba Sin VIP, rechazo de una segunda o fuera del paso, salto de paso en el mismo envío, marcas omitidas/false, reintento, recarga, historial, primera zona, requisitos de arma/desgaste/nivel, tres salidas VIP, cuarta rechazada también en servidor, cambio de día UTC, estamina agotada y conservación de salidas existentes.
- `test-incursion-nivel.js`: misma tabla de niveles que la entrada manual y tiempos sin cambios.
- `test-anadir-20261023.js`, `test-tutorial-progreso.js` y `test-brujula.js`: acceso manual, reglas ajenas a esta excepción y progreso de la guía conservados.
- `test-guardado-atomico.js`, `test-portero-reglas.js`, `test-protecciones-economia.js` y `test-tala-consumida-servidor.js`: guardado CAS/idempotencia, protecciones económicas y corrección anterior de madera.

Las nueve pruebas pasan. El despliegue y su comprobación pública corresponden al lote coordinado por la raíz; este documento no afirma que ya esté publicado.
