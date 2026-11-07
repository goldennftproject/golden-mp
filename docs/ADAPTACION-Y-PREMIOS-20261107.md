# Adaptación de pantalla y premios visibles — 07/11/2026

Dirección autoriza terminar las pruebas y publicar la adaptación a pantallas bajas y el aviso de premios de Ruletas. Se conserva el arte aprobado, los controles reales y el flujo de cobro existente.

## Distribución y cámara

`adaptive-layout.js` mide ancho y alto útiles, HUD, efectos, guía, Tienda, Registro y barra inferior. Renovado de escritorio desde 900 px mantiene la composición completa cuando cabe. Si falta altura, sube la columna bajo el HUD y ajusta su ancho con un mínimo de 174 px. En ventanas más bajas, Ruletas y Misiones comparten una fila de controles de 48 px. En alturas extremas, sólo la columna tiene desplazamiento interno.

El módulo respeta las posiciones y el estado de los paneles. Observa cambios concretos y compara geometrías antes de volver a encuadrar; no hace sondeos ni mide todo el documento por fotograma. Se limpia al pasar a móvil, Clásico o la Tienda compacta de combate.

La cámara usa el espacio real disponible sin imponer el antiguo zoom mínimo que recortaba la granja en ventanas bajas. Al alejar, Phaser podía impedir el centrado porque su viewport superaba el ancho de sus límites. Se amplía únicamente el límite temporal de cámara necesario para la vista; `camLim`, terreno, celdas y partidas permanecen. El ajuste conserva el zoom y desplazamiento elegidos por el jugador, deriva los límites desde cero para no acumularlos y restaura los originales al volver automáticamente a Clásico.

## Premios de la ruleta

Los objetos ya se entregaban primero en `G.mkPend`. La captura de un jugador no demuestra por sí sola que un premio se perdiera: esta revisión aclara dónde recogerlo, sin cambiar la entrega del servidor ni acreditar objetos automáticamente.

El botón existente de Entregas pendientes aparece arriba, antes de la rueda y el catálogo, con una explicación de los objetos que aún no están en la bolsa. Un recibo nuevo confirmado muestra a la izquierda el icono, cantidad y nombre: «+5 Madera · Por recoger». Un jackpot Golden confirmado indica «Acreditados» porque ya pertenece al saldo.

Recibos repetidos, recuperados o cancelados no repiten el aviso. La identidad del recibo y la cuenta limitan las notificaciones. Un cobro parcial de otro objeto no borra el aviso de un premio que continúa bloqueado; cambiar de cuenta limpia el anterior. Tras recoger, el flujo habitual de bolsa muestra únicamente el aumento realmente recibido. Bolsa llena y armas duplicadas conservan sus pendientes.

El aviso aparece inmediatamente y se mantiene seis segundos, sobre Tienda y debajo de las ventanas en PC, sin interceptar clics. Las animaciones habituales de materiales se conservan.

## Validación

Pasan 19 scripts: adaptación, cámara, premios, encuadre anterior, controles de cámara, Mercado, HUD, concepto, descubrimiento, noticias, ruletas, entregas, flujo de bolsa y capas, y carga. Las pruebas nuevas cubren nueve geometrías y observadores acotados, nueve escenarios de cámara con el clamp real de Phaser y ocho casos de confirmación/cobro de premios. La prueba de cámara anterior ahora comprueba encuadre real, sustituyendo el antiguo tamaño mínimo fijo de celdas; el fixture del flujo incluye la ubicación de navegador que necesita la configuración actual.

La comprobación nativa de Chrome usa una cuenta ficticia, Auth y guardados remotos desactivados, y giros gratuitos simulados. Verifica 1352×500, 900×600, 1920×1080 y 390×780, además de la ventana normal de 1360×599, Mercado con scroll, Clásico/Renovado, aviso visible y cobro de cinco maderas una sola vez. El tamaño emulado de Chrome queda restablecido. Sin errores JavaScript en esta prueba.

No se modifican costes, probabilidades, cuotas, reglas de cobro, partidas, cuentas, depósitos, retiros ni sistemas pausados. Capturas y recibos de verificación se conservan en `work/adaptacion-publicacion-20261107/` del espacio de trabajo de Codex.
