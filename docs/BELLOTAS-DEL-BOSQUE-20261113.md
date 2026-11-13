# Bellotas del Bosque — 13 al 15 de noviembre de 2026

El propietario autorizó publicar el evento y anunciarlo en Noticias del juego, Discord y Telegram. La apertura es el viernes 13 a las 20:00 y el cierre el domingo 15 a las 20:00, hora de Uruguay y Argentina. La función de guardado y el registro de reclamos aplican el intervalo desde el 13 a las 23:00 UTC hasta el 15 a las 23:00 UTC.

En Misiones, las diarias y las seis extras abiertas dan una bellota por objetivo. Las cuatro extras VIP de granja dan dos. Cada extra se reclama una vez y el tutorial no suma bellotas. Se toma como referencia el primer guardado confirmado después de la apertura. Las diarias se renuevan a las 00:00 UTC y siguen pagando Plata al cerrar el evento.

El ranking registra únicamente reclamos confirmados y permanece provisional hasta revisar los puestos con premio. Los premios de los tres primeros lugares son USD 10, USD 5 y USD 5. Si hay empate, se suman los premios de los puestos ocupados por el grupo y se reparten en partes iguales entre sus integrantes. Si resulta una fracción de centavo, se confirma el redondeo cuando se adjudican los premios. La revisión usa el registro privado completo. La vista pública muestra hasta 50 puestos y el puesto propio.

La migración `20261113204302_bellotas_del_bosque.sql` se aplicó antes de desplegar `guardar` v59. El evento queda disponible desde el despliegue y se abre a la hora indicada por el servidor. La configuración `GF_BELLOTAS_20261113=0` permite deshabilitarlo conservando el registro de reclamos.

La validación local cubre el inicio y el cierre, reclamos repetidos, elegibilidad VIP, cambio de cuenta, permisos del registro, la interfaz de Misiones y el guardado normal. Se conservan las cuentas, las partidas, el historial, los sistemas desactivados y el estudio de sostenibilidad de USDT.
