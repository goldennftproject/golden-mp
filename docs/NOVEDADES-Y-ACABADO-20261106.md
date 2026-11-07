# Novedades visibles y acabado del concepto — 06/11/2026

Dirección pide que las funciones nuevas y las compras se descubran sin explorar el menú, y que el acabado respete los detalles del concepto aprobado. La revisión conserva controles, progreso, economía y sistemas pausados.

## Accesos y descubrimiento

- Ruletas permanece junto a la Tienda, antes de Misiones. Noticias tiene acceso propio con contador de publicaciones sin leer. Móvil dispone de accesos compactos visibles; la Zona Negra mantiene la Tienda reducida para no cubrir el combate.
- La marca «Nuevo» se retira únicamente cuando la ventana correspondiente está realmente abierta. `gf_features_seen_v1` es una preferencia local del navegador, sincronizada entre pestañas; no se escribe en la granja ni en Supabase.
- Noticias comparte la única descarga y el estado del lector existente mediante `GoldenNews.state()` y `golden:news-state`. No duplica consultas, no abre ventanas automáticamente y no marca artículos como leídos en segundo plano. Conserva el contador anterior si falla una actualización y distingue ese fallo de una carga confirmada.
- «3 giros gratis al día» describe la regla de la ruleta; no afirma que todavía queden intentos ni consulta cuotas periódicamente.

## Fuente visual exacta

Se reutiliza intacto el concepto `exec-59ab2fc2-e1a2-411a-90f6-fb0597f8bf77.png`, de 1672 × 941 y 3.104.223 bytes, como `public/assets/visual-v2/skin/ui-concept-reference.png`.

SHA-256: `742fdeefe60b742fab466ed12ece3e59ed932892e551de6a12686bd89da81dda`.

CSS muestra exclusivamente regiones de arte estático: cabecera, toldo y placa de Mercado, rótulo de Tienda, cuatro fichas y Misiones. Las máscaras vectoriales siguen sus siluetas y excluyen el bosque exterior. No se regenera ni modifica el raster. Es una descarga adicional compartida de aproximadamente 3,1 MB, almacenada en caché.

Los botones siguen siendo controles reales con foco, clic, hover y estado activo. VIP activo y el contador de Misiones permanecen visibles y dinámicos. Mercado conserva su único cierre funcional, pestañas, cantidades y compras. El HUD mantiene valores, barras, temporizadores y acciones del estado real; no muestra las cifras ficticias del concepto.

El acabado se activa de forma asíncrona sólo en Renovado de escritorio, desde 900 px, después de cargar y validar las dimensiones del atlas. Mientras carga o si falla, permanece la presentación original funcional. Clásico, móvil y Tienda compacta de combate conservan sus alternativas.

## Corrección y validación

La comprobación nativa detectó que la caja raíz invisible del menú recogido todavía podía interceptar clics. Se deshabilitan sus eventos de puntero mientras está recogido; al desplegar vuelve la interacción habitual.

Pasan doce de los catorce scripts revisados. Las fallas de `test-paneles-intuitivos.js` y `test-intuitivo-visual-pc.js` también se reproducen con las fuentes inmutables del commit anterior `b3bcdc15699c4f1a0b6272f586ef23e7668c2ebe`; no se atribuyen a esta revisión. Las pruebas nuevas verifican el contador compartido, lectura, preferencias, carga y errores, ausencia de sondeos, activación segura del atlas y conservación de controles y datos.

Las capturas y el recibo de publicación se conservan en `work/novedades-visibles-20261106/`. No se modifican cuentas, partidas, premios, probabilidades, precios, cuotas, guardado ni depósitos/retiros, y no se publican mensajes externos.
