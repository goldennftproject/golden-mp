# Las leyes de Golden Farm

## Panel privado del equipo — 28/10/2026

Dirección pide un panel para gestionar la información del juego y confirma a Francisco como Administrador y Suren como Dev, identificados por los correos verificados de Auth. Acceso cerrado por UUID en tabla privada; ninguna autorización por nombre, metadata editable ni rol de Discord. Resumen, cuentas, depósitos, verificaciones e historial de acciones; pausa de nuevas recargas y notas de revisión sin mover fondos. No incorpora apertura de depósitos, retiros, edición de saldos, reseteos ni delegación. Listas paginadas, sin sondeo y con datos mínimos. Depósitos y retiros mantienen el estado cerrado. Ver PANEL-EQUIPO-20261028.txt.

## Depósitos USDT y separación de Golden — 28/10/2026

Dirección autoriza vincular una wallet propia por cuenta y preparar USDT BEP-20 de BNB Smart Chain a 1 USDT por 1 Golden, al receptor facilitado. Firma de un uso y cuenta/dominio, unicidad global de dirección, verificación de dos nodos, finalidad y 120 confirmaciones, recibo único y acreditación atómica. El Golden comprado sin gastar tiene un registro privado y se conserva para release, gastando primero el obtenido jugando; no se reclasifican saldos previos como comprados. Dirección desactiva Plata → Golden durante alfa, también en el servidor. Retiros siguen bloqueados. Los depósitos permanecen cerrados hasta la prueba controlada que el propietario debe firmar y pagar personalmente. No se envían fondos, no se reinician granjas ni se activa release. Ver USDT-ALFA-20261028.txt.

## Reparación de armas equipadas — 28/10/2026

Dirección comunica que un arma rota obliga a desequipar/equipar antes de reparar. La reparación ya admite durabilidad cero sin quitar el arma; se corrige la actualización que faltaba del HUD y los iconos tras reparar. Cambiar de pestaña en Herrería recompone también estado y disponibilidad con los recursos actuales. La prueba reproduce el refresco ausente y recorre el botón real de todas las armas rotas equipadas, conserva mejoras/runas/equipo y verifica costes únicos, bloqueo sin materiales y al 100%. No se ha reproducido un rechazo de la operación de reparación con materiales suficientes; no se afirma que ese rechazo tenga una causa demostrada. No cambian costes, durabilidad máxima ni guardado.

## Clasificación de granja para la alfa — 27/10/2026

Dirección pide ranking para posibles premios futuros de alfa. Granja pasa a ser la pestaña principal: nivel guardado y después XP productiva guardada, con cortes históricos y prestigio existentes; empates comparten puesto. Top 50 y posición propia fuera del top. Consulta autenticada de sólo lectura, RPC invoker accesible sólo al servicio y caché cliente de tres minutos por identidad. Se mantienen las comparaciones antiguas y las visitas VIP sin edición. No se activan premios, USDT ni reset; fecha de cierre, elegibilidad y reparto quedan por decidir. Ver RANKING-ALFA-20261027.txt.

## HUD de PC en una fila y logo Alpha — 27/10/2026

Dirección pide reunir la energía con los demás datos superiores. En PC se mantienen nivel de granja, energía, Plata, Golden, vida, combate y menú en una fila; la estamina visible se integra también, con su cuenta atrás en el tooltip. Los efectos temporales conservan una repisa separada que sigue siendo medible por el menú y las guías. Se reutilizan los mismos controles y callbacks, restaurando la ubicación previa fuera de PC. Los anchos compactos reducen barras accesorias, conservan nombres y valores y permiten desplazamiento horizontal si la ventana es muy estrecha. No cambian mecánicas ni guardado.

Dirección pide un logo ilustrado con etiqueta Alpha en la esquina superior izquierda y sustituir el título textual de la pantalla verde de precarga. Se añade golden-farm-alpha-v1.png con transparencia y se conserva el original generado. La pantalla de carga mantiene su progreso y mensajes.

## Visita visual y bono único de recolección — 27/10/2026

Dirección pide entrar visualmente en otra granja y recoger la semilla desde allí. Se usa una vista aislada con la proyección pública del guardado: nunca se sustituye G por los datos del dueño. Sólo la operación de semilla del visitante escribe mediante el servidor; se mantienen VIP, límite diario, recibos, CAS y logros. No se habilitan acciones de cultivo, edición ni inventario sobre la granja ajena. La visita no es multijugador en vivo. Dirección también pide que el bono de recolección no se apile: un nuevo consumo renueva su duración sin sumar potencia ni tiempo, y los duplicados históricos no suman porcentajes. Ver VISITAS-VISUALES-Y-BONO-20261027.txt.

## Compras visuales y disquete sin leyendas flotantes — 27/10/2026

Dirección pide accesos visibles y discretos al VIP y a las compras, con ilustraciones y beneficios breves. En PC se añade un acceso fijo a Tienda/VIP/Objetos/Mejoras/Packs; la tienda organiza las compras sin ejecutarlas al navegar. Las rutas abren las pestañas existentes, y Animales conserva el requisito de Establo. El VIP mantiene precio, duración, beneficios, confirmación y servicio autoritativo; no hay otra membresía ni nuevos cobros. Se usan cuatro ilustraciones WebP de 256 px con transparencia, sin cambiar el atlas del mundo. En combate los accesos se compactan en una fila.

El disquete conserva giro, confirmación y error; su explicación está en el tooltip y los resultados aparecen como mensajes locales del Registro y Chat. Se retiran los avisos flotantes, se agrupan confirmaciones consecutivas iguales y no se envía nada al chat de otros jugadores. Se preservan ACK, conflictos, cola, identidad, autoguardado y F5. USDT sigue desactivado. Ver TIENDA-VISUAL-Y-GUARDADO-20261027.txt y ARTE-TIENDA-20261027.txt.


## Revisión visual general de PC — 27/10/2026

Dirección pide revisar el conjunto de la interfaz. Las ventanas respetan el alto disponible, mantienen el cierre visible al desplazar y separan visualmente el fondo. El Cobertizo presenta primero las piezas, con nombre visible, y la capacidad en su propia columna. Los logros conservan reglas y registro en un desplegable; el catálogo de productores usa tarjetas legibles con precio, producción y acción. Se retira de PC el título obsoleto de herramientas en Equipo y el menú reserva el espacio del disquete. En combate, el muelle mide también los controles inferiores: el equipo se desplaza por dentro mientras los modos y el botón Equipo permanecen visibles. Se preservan identificadores, controladores, costes, progreso, arte y guardado. Ver AUDITORIA-VISUAL-PC-20261027.txt.

## Mostrar objetivos concretos y lectura del HUD — 27/10/2026

Dirección pide señalar lo que se toca, no una caja aproximada. Mostrar marca las celdas secas para plantar, las listas para cosechar y la silueta del edificio o recurso correspondiente. Se excluyen bloqueos, pausas, esperas y minerales distintos; la señal se retira al cambiar de objetivo o usar la parcela, y vence a los ocho segundos. Las copias visuales no modifican el sprite real ni reciben clics. Se conserva la cámara cancelable y el foco sobre controles de menú. El HUD distingue Energía con barra propia, Vida y Granja · Nv.; el máximo de nivel deja de parecer un recurso disponible. No cambian costes, acciones, progresión ni guardado.

## Escala del granero y lectura de divisas — 27/10/2026

Dirección pide un granero inicial comparable al resto de edificios y una interfaz que no dependa de explicaciones largas. Se encuadra sólo el dibujo opaco de cada sprite, conservando originales y atlas, con anchos visibles progresivos de 0,82/0,88/0,97/1,16 veces rw. Todas las etapas caben en las tres celdas reservadas; no cambia ancla, colisión, nivel de mejora ni progreso. La evolución visual sigue vinculada a la mejora de granja existente.

Plata y Golden llevan nombre e icono en el HUD y abren el Banco. Dos tarjetas muestran sus usos y destinos; la tasa aparece como ecuación visual y el formulario detalla entrega, recepción, saldo restante o faltante sin abreviar importes. Se conservan cotización autoritativa, caducidad de 60 segundos, confirmación y bloqueos. Los objetos muestran Golden → objeto → Plata, y la ruta alternativa de oficio queda desplegable. Se retira del texto del Mercado la referencia obsoleta a cobrar Golden directamente. No cambian precios, tasa, producción, requisitos, guardado ni USDT.

## Protección del periodo de lanzamiento — 27/10/2026

La fecha y fase de un lanzamiento ya iniciado no se pueden cambiar mediante la configuración normal, ni se puede borrar su fila. Esto evita extender el VIP o capturar restauraciones como compras de alfa. La restauración con derechos y sin fila de granja falla expresamente; recuperar esa fila permite reintentar sin perder derechos. Los contenedores de objetos guardados como null se interpretan como vacíos. Probado en transacciones revertidas, sin activar release ni modificar el progreso actual.

## Compras de alfa y VIP del lanzamiento — 27/10/2026

Dirección autoriza preparar toda la alfa y conservar las compras permanentes tras el reinicio futuro. Comprar VIP en alfa habilita un único periodo de 30 días desde el lanzamiento, sin acumular renovaciones. Un registro privado separado de farms captura las propiedades aceptadas en la misma transacción. Se conservan God Hand, infraestructura, pasivas mejoradas, Objetos de Granja y adornos comprados con Golden; no saldos ni consumibles. La consulta pertenece a la identidad autenticada y la restauración es idempotente, previa a cargar la granja en release. Alfa sigue activa y sin fecha de lanzamiento; no se ejecuta ningún reset ni se habilita USDT. El procedimiento futuro conserva Auth, registros y filas de granja. Ver docs/ALFA-COMPRAS-Y-LANZAMIENTO.txt.

## Conflicto falso tras operaciones económicas — 27/10/2026

Dirección pide encontrar y corregir el bloqueo de guardado. Se reproduce en producción: reclamar el premio diario entrega el bono pero el guardado siguiente responde 409 con una sola pestaña. La operación devolvía updated_at reconstruido como ISO terminado en Z; PostgreSQL lo devuelve con +00:00. La comparación exacta de versiones lo confundía con otra sesión. Se devuelve ahora el updated_at leído del resultado de la escritura, igual que el guardado normal, conservando CAS, recibos, autenticación, saldos y progreso. La prueba imita la representación de timestamptz de PostgreSQL y verifica guardado posterior y rechazo de una versión realmente antigua. No se normalizan ni relajan versiones desde el cliente y no se cambian F5 ni autoguardado. No se afirma que esta causa explique todos los fallos históricos de conexión o guardado.


## Preparación técnica de alfa — 26/10/2026

Dirección pide preparar la alfa abierta para medir infraestructura Free, conservando progreso y USDT desactivado. Se preparan salud HTTP, agregados acotados en logs de Render y copia local de diagnóstico solicitada por el jugador. Sin datos personales ni telemetría periódica en Supabase. SSE cuenta ventanas, no personas. Se valida el coste Golden al adquirir God Hand/pasivas, conservando compras previas. Pruebas de carga sólo contra un proceso local aislado; no equivalen a capacidad de producción. Acceso externo pendiente: dirección confirma SMTP integrado y elige conservar entrada por correo/enlace. No se cambia a invitado ni se contrata un proveedor; la entrega general a correos externos sigue sin resolver. No se cambia Auth, no se envían correos, no se anuncian eventos, no se reparten fondos y no se resetean cuentas.

## Silueta evolutiva del granero — 26/10/2026

Dirección rechaza la misma forma con adornos: pide pasar de una construcción pequeña y cutre a otra mayor y elaborada. Cuatro sprites nuevos según mejora de granja 0/1/2/3: cobertizo bajo, granero a dos aguas, granero con anexo lateral y granero con dos alas y cúpula de ventilación. Se conserva barn.png original. Lienzos transparentes 128×128, misma ancla inferior central, ancho/alto visible creciente; misma rw y contrato de ocupación/celdas/colisiones. Se sustituyen los adornos del granero por cambios de textura; el mercado conserva sus acabados. No hay cambios de precios, requisitos, capacidad ni XP. Carga inicial en atlas con cache v56 y respaldo por archivos sueltos.

## God Hand, mercado y cierre de pendientes — 26/10/2026

Dirección autoriza resolver los pendientes, excluye nuevas maderas de esta versión y mantiene USDT desactivado. Parámetros iniciales ajustables: God Hand recibe una mejora única de eficiencia por 50.000 Plata, requiere poseerla y reduce un 10% el total de su tarifa de trabajo, redondeado una vez. No reduce prestaciones anteriores, capacidad, producción ni energía. Mercado: mejora única por 50.000 Plata, 100 madera, 100 piedra y 5 hierro; reduce dos puntos la comisión de nuevas publicaciones (Free 8%, VIP 5%). Las filas anteriores conservan fee_pct y los cupos no cambian. Ambas compras usan libro protegido, recibo y CAS. La restricción de tasas admite 5/7/8/10; el trigger sigue fijando la tasa.

Construcción admite cantidades parciales por material con revisión y confirmación; valores enteros no negativos, stock y faltantes se validan antes de cualquier débito. Se conserva el modo anterior para llamadas internas sin cantidades. Acabados gráficos progresivos del granero y mercado según sus mejoras, sin nuevas celdas, colisiones ni recursos.

Ante conflicto, el disquete ofrece recuperar la versión aceptada del servidor sin F5, con confirmación y respaldo local separado obligatorio. La recuperación sólo lee: no mezcla cambios ni escribe en el servidor. Fallos de lectura, almacenamiento local o cambio de cuenta conservan el bloqueo y el estado local. Los demás guardados y F5 no cambian. La auditoría previa encontró 644 registros de guardado sin sospechas económicas y HTTP 1144×200, 4×401 y 9×409 en 24 h; no prueba la causa individual del vídeo ni ausencia de errores.

## Cierre funcional de la reunión — 26/10/2026

Dirección solicita terminar los pendientes. Tiendita: compra única inicial de 10 Golden, +1 publicación P2P/día UTC permanente; Free 2, VIP 11. Cancelar no devuelve cupo y las comisiones existentes siguen 10%/7%. Granja: tres mejoras secuenciales requieren niveles 5/10/15 y cuestan respectivamente madera/piedra/hierro 50/50/2, 150/150/5 y 300/300/10; bonos totales de XP productiva futura 2%/3%/5%, no acumulativos entre sí. Son parámetros iniciales de implementación, no cifras cerradas en el audio. No cambian tiempos, XP de oficio, capacidades ni recompensas ya adquiridas. Sólo cultivar/talar/minar; saldo de XP extra separado, persistido, limitado por servidor y consumido al prestigiar. Compras y débitos autoritativos con recibo/CAS. La propuesta del evento se prepara sin activarlo ni anunciar premios. Apariencia de edificios y tipos de madera siguen diferidos explícitamente en el audio; ajustes de demanda requieren datos reales.

## Mejora de pasivas por Plata — 26/10/2026

Continuación aprobada de la reunión de Sachi: cada pasiva de madera, piedra e hierro admite una mejora única de 50.000 Plata. El bono aditivo pasa de +0,10 a +0,15 unidades por recolección efectiva; no multiplica toda la producción. Conserva propiedad, herramientas, precios de adquisición y ruta del Pase. Compra validada por servidor con recibo, CAS y libro protegido; cantidades y logros conservan centésimas. No consume energía adicional ni modifica USDT.

## Cajas de suministros por Golden — 26/10/2026

Dirección aprueba «hazlo» a cajas de 1 Golden con máximo tres por día UTC para Free y VIP, sin energía. Premio único: 40% 40 madera, 35% 40 piedra, 15% 3 bronce, 8% 6 bronce, 2% 3 hierro. Las cantidades se ajustan al precio premium aprobado. Tabla visible y confirmación antes de cobrar. Sorteo criptográfico del servidor, saldo/cupo/recibo/entrega confirmados por CAS; reintentar conserva el premio. Materiales van a pendientes para no perderse por bolsa llena. No se cambian packs fijos ni se habilitan movimientos USDT.

## XP futura por energía — revisión de Sachi, 26/10/2026

Para las nuevas recolecciones, la contribución de Tala y Minería al nivel de granja usa factores 1,5 y 2 (15/20 XP por recurso básico), frente a los anteriores 15/20 (150/200 XP por recurso). La XP de los oficios no cambia. Cada partida conserva los factores históricos hasta los valores de oficio ya guardados; el corte se fija al migrar y queda protegido por el servidor. No se quita XP ni nivel, no se repite la migración y el prestigio descuenta el total ponderado correspondiente. El tiempo real de progresión requiere medición; no se promete duración ni dinero diario.

## Reunión completa de Sachi — 26/10/2026

Dirección autoriza revisar el audio completo y aplicar las sugerencias. Las cuentas nuevas empiezan con cero Golden; los saldos previos se conservan. Talar y minar cuestan una energía por recolección efectiva, nunca por golpe sin recompensa, y agotarse conserva las cargas restantes. Se confirma el detalle de materiales antes de aportarlos a una obra. Los objetos muestran cuenta atrás hasta el cobro. El comprador del sistema sólo compra cultivos; madera, minerales y procesados conservan el comercio entre jugadores. P2P: Free una publicación/día UTC y VIP diez, cancelar no restituye cupo. Las mejoras internas no se presentan como NFT tokenizado.

La discusión de premios, depósitos, comisiones de retiro, reinicio al lanzamiento y colaboraciones es preparación; no activa USDT ni autoriza borrar progreso actual. Las alternativas sin cifras cerradas se registran para balance y decisión posterior. El autoguardado de cinco segundos y una vez por periodo inactivo se conserva.

## Un guardado por periodo inactivo — 26/10/2026

Dirección precisa que tras el autoguardado de cinco segundos no se vuelva a guardar mientras continúe la inactividad. Una bandera se activa sólo tras confirmación del servidor y se libera al interactuar de nuevo. Los fallos pueden reintentarse; una interacción durante la petición no queda bloqueada por su respuesta posterior. Los relojes absolutos de nodos, cultivos y trabajos siguen avanzando sin escrituras periódicas. Sustituye la repetición cada cinco segundos durante una misma inactividad.

## Segunda pasada de presentación — 26/10/2026

Dirección aprueba todas las mejoras propuestas: Cobertizo distingue cupos/vales/objetos; Herrería destaca coste por unidad y faltantes; Mercado muestra totales junto a cantidad y acción; VIP resume ventajas y conserva comparación/condiciones desplegables; tutorial mantiene objetivos, rutas y contadores, con carteles breves y destino delineado. Sólo presentación: mismos precios, requisitos, callbacks, cupos y estados de guardado.

## Menús más intuitivos — 26/10/2026

Dirección solicita menos texto y mayor claridad sin alterar funciones. Se agrupan destinos por uso, con iconos y ayudas al pasar el cursor; Progreso, Habilidades y Premio diario mantienen sus paneles y atajos. Banco prioriza Plata → Golden y el canje; sus explicaciones quedan desplegables. Objetos de Granja prioriza tres cifras de cobro/energía/duración, conservando condiciones completas. Se corrige la explicación vieja de fabricar con energía, sin tocar reglas, permisos ni economía.

## Autoguardado por inactividad — 26/10/2026

Dirección precisa: «Cinco minutos sin interacción no [...] cinco, diez segundos sin interacción, que guarde». Se eligen cinco segundos desde la última interacción, con comprobación cada segundo y sólo con cambios pendientes. El tiempo de visita no cuenta como cambio. Un guardado confirmado separa los siguientes ciclos inactivos otros cinco segundos; un fallo se reintenta con un mínimo de cinco segundos entre intentos, sin fingir confirmación. Se preservan cola, conflictos, botón manual y eventos de ocultar pestaña/F5. Sustituye la frecuencia periódica de 20 segundos indicada en las decisiones anteriores.

## Persistencia de nodos compactos — 26/10/2026

El guardado real permitió reproducir una colisión de claves: tres árboles comparten tree:6,4 y seis vetas ore:7,8. Al sincronizar, los nodos ocultos sobrescribían los relojes recién usados. Se distinguen las claves que comparten celda por el índice estable del contrato y se migran sólo los nodos poseídos, conservando relojes y pausas. No se modifican filas de jugadores ni los tiempos de producción.

## Corrección del tamaño de la Zona Negra — 25/10/2026

El diseñador reporta que la zona se redujo. El bosque heredaba GF.ROWS_BASE de la granja compacta: 9 filas en lugar de las 15 históricas. Se restaura 32×15 celdas (1344×630 px a TILE=42), independiente de la granja y sus expansiones. No cambia la granja, cantidades de enemigos, recompensas ni progreso.

## Fabricación sin energía — 25/10/2026

Dirección: «Quita también el consumo de energía al fabricar, incluido de cinco en cinco». Fabricar herramientas, picos, materiales, armas, armaduras, cofres y objetos del altar cuesta cero energía. Se mantienen materiales, monedas, niveles, colas y VIP para lotes. Cocina y recolección no cambian. El servidor deja de acreditar fabricación nueva como energía gastada; conserva la actividad histórica validada. Esta instrucción sustituye la conservación del coste de fabricación indicada más abajo.

## Compras sin energía — 25/10/2026

Dirección aprueba «hazlo» a comprar en la tienda sin consumir energía, manteniendo el coste al fabricar. La revisión encontró que las compras ya estaban exentas: se comprueban con energía cero y se aclara en la pestaña Comprar. Fabricar, incluido el lote VIP de cinco, conserva su coste; no se reembolsa ni altera energía o progreso existente.

## Botón de guardado manual — 24/10/2026

Dirección aprueba «hazllo» a animación durante el guardado manual, ✓ verde sólo con confirmación del servidor y señal roja ante fallos. El botón conserva su icono, tooltip y posición. La animación respeta reducir movimiento.

Dirección precisa después: «aparece como un disket [...] abajo a la derecha». Se muestra sólo un icono de disquete en un botón circular en la esquina inferior derecha, con nombre accesible y tooltip Guardar ahora. La confirmación aparece encima; conserva la misma cola, autoguardado y F5. Sustituye la ubicación provisional junto a la energía.

Dirección: «Solo añade el botón guardar para hacerlo manualmente cuando uno quiera» y «Sí, hazlo, por favor». Se añade Guardar ahora al menú, usando la cola existente y confirmación remota. Se bloquean clics repetidos mientras espera y no se anuncia éxito ante fallos, conflictos o cambios de cuenta. El autoguardado de 20 segundos y los eventos de F5/salida quedan intactos por instrucción expresa del usuario.

## Restaurar materiales de expansión — 24/10/2026

El diseñador señaló «ahora las expansiones solo cobran plata y era plata y materiales». Dirección aprobó «si» a recuperar la receta histórica y conservar el +30% desde la tercera, sin recobrar obras ni expansiones existentes.

El reemplazo se introdujo en `5274341` al integrar capacidad productiva; la tabla histórica de materiales quedó disponible pero fuera del coste mostrado/cobrado. Se restaura desde la segunda expansión, manteniendo la primera en 20 Plata + 2 madera + 2 piedra. Se conserva la curva actual de Plata. Los materiales usan la tabla histórica, que ya incluye el aumento único del 30% desde la tercera: no se aplica dos veces. Ejemplos: segunda 35 Plata + 15 madera + 10 piedra; tercera 78 Plata + 38 madera + 25 piedra. Cliente y servidor contrastan las dieciséis recetas. Sólo se cobran al iniciar una obra nueva; entregas, obras iniciadas y progreso guardado se conservan. Esta decisión sustituye la aclaración del 23/10 de no reincorporar materiales al modelo productivo.

## Ajustes añadir y pico básico único — 23/10/2026

Dirección aprobó «si» a aplicar `añadir.docx` y unificar madera/piedra. Zona Negra manual disponible para Free y VIP, manteniendo requisitos normales de equipo, nivel y descanso. Sólo las nuevas excursiones de un clic requieren VIP; una iniciada conserva su resolución aunque venza la membresía. Cliente y guardado validan la restricción.

Desde la tercera expansión, cada coste actual de Plata/materiales se multiplica por 1,30, redondeando hacia arriba, sin acumulación entre expansiones. Las dos primeras y las obras ya pagadas no cambian. El modelo productivo actual sólo cobra Plata desde la tercera; no se añaden materiales que no existían. La tabla heredada de materiales recibe el mismo factor. No cambian tiempos, geometría ni recompensas.

El bono diario reduce un 15% el tiempo de lo sembrado durante una hora desde el reclamo confirmado. La siembra real se verificó en 180 → 153 segundos. El tope especial inicial está desactivado en esta versión; por compatibilidad, si se habilitara, también recibe la reducción después de aplicar el tope. No se confirmó una falla general del cálculo anterior ni se atribuye el reporte a esa rama inactiva. No acelera retroactivamente parcelas en curso. El paquete muestra el estado y tiempo restante, que antes no indicaba.

Sólo se ofrece el Pico de Piedra como básico. Los picos de madera existentes pasan uno por uno a piedra, incluido equipo, accesos rápidos y contenedores/tumba; la conversión no se repite al recargar. Los premios diarios de tres picos pasan a piedra. Los picos superiores, saldos y progreso no se borran.

## Logros del diseñador — 21/10/2026

Tras recibir `logros.docx` y la propuesta de incorporación, dirección aprobó «aplica esto» con la captura que confirma: contar plantar (no cosechar), unidades recolectadas de madera/piedra, metas acumulativas, cobro único validado por el servidor y una visita por granja y día.

Se muestran 25 metas en ocho categorías; premios totales 16.400 Plata, no repetibles. Papa 100/300/1000 → 100/400/2000; ciruela 100/250/1200 → 110/330/2200; zanahoria 100/250/1200 → 100/300/2200; cebolla 100/250/1200 → 150/300/2400; calabacín 100/250/1300 → 200/350/2600; madera 100/200/500 → 100/200/500; piedra 100/250/1000 → 100/250/800; visitas 10/50/100/500 → 10/50/150/500. Alcanzar una meta no consume el contador ni reinicia la siguiente.

Se mantienen los cobros antiguos como historial, sin volver a ofrecerlos. Las siembras históricas proceden sólo de estadísticas previamente guardadas en servidor; no se inventa recolección histórica en unidades ni visitas. La recolección nueva conserva décimas NFT. Los contadores se corroboran con las evidencias y energía del guardado aceptado: no constituyen una simulación autoritativa completa ni garantizan protección contra bots. El navegador no fija totales ni confirma premios. Cobros y visitas usan autenticación, recibos y CAS.

Las visitas requieren el VIP único; ver la granja registra el progreso, no hace falta recoger semillas. El límite de tres semillas diarias no limita el logro. Un destino cuenta una vez por día UTC; al cambiar el día puede contar otra vez. No hay auto-visitas. USDT sigue desactivado.

## Nodo a elección en cada expansión — 20/10/2026

Dirección aprobó «cada expansión dará terreno + un cupo productivo + un nodo básico gratuito a elección entre árbol, roca o parcela»: «Claro que permite elegir qué obtener» y «Bien, perfecto, así me gusta. Hazlo así a ver si le gusta al diseñador».

Cada obra terminada entrega un vale acumulable, no un nodo asignado automáticamente. Se elige en el Cobertizo y consume un vale; el nodo requiere cupo y emplazamiento disponible. Las vetas avanzadas no se incluyen. No cambia el tamaño, precio ni duración de la expansión.

Las partidas con capacidad productiva del sistema anterior reciben una sola vez los vales omitidos desde la segunda expansión (expansiones previas menos una), conservando el saldo no usado de la primera. La marca `produccion.valesV:2` hace la compensación idempotente y el servidor impide regresarla. Las partidas del sistema histórico que ya entregaba nodos automáticamente conservan esos nodos sin duplicar regalos.

## Actualización autorizada — VIP / Free (20/10/2026)

Dirección, tras entregar `vip y free.docx`: «Tú avanza con todo y luego ya vemos qué modificar. […] la estamina […] se refiere a la energía de la granja, no […] del combate».

Esta autorización incorpora la excepción VIP a los relojes de nodos: Free conserva 30/40 minutos; VIP usa un 90% del tiempo (27/36), también en cocina y obras de expansión. No se reescriben trabajos ya iniciados. La energía de granja es 50 Free / 100 VIP y se regenera en cuatro horas; la de combate no cambia.

Un solo VIP de 30 días, comprado por 10 Golden: fabricación en lotes, publicaciones P2P sin cupo diario, comisión 7% frente a 10% Free y Objetos de Granja repetibles. Free puede publicar una vez por día UTC y comprar un objeto activo. Las compras anteriores conservan producción y cobro al vencer VIP; el límite se aplica a nuevas compras. La comisión se captura al publicar; las publicaciones históricas conservan su 5%.

El pase queda desactivado sin borrar su historial. Recompensas diarias, ciclo de siete días y confirmación del servidor: cultivos 15% más rápidos por una hora; cinco semillas de papa; tres picos de madera; dos papas asadas; dos picos de piedra; cinco semillas de zanahoria; 50 Plata. El descuento de cultivo se fija al sembrar, no altera cultivos en curso.

Decisiones iniciales ajustables: UTC para cupos y premios; cancelar P2P no devuelve el cupo; visitas VIP como resumen de lectura, una semilla de papa por granja y máximo tres al día, sin sustraer recursos al dueño. No se cargan partidas ajenas como propias ni se exponen saldos.

Depósitos y retiros USDT continúan desactivados. La frecuencia futura solicitada es Free una vez por mes / VIP sin límite de frecuencia, nunca sin saldo ni reservas. Esta entrega no habilita pagos reales ni garantiza retorno monetario.

Dictadas por dirección. **No son preferencias ni recomendaciones: son leyes.** No se discuten,
no se optimizan y no se "mejoran" con buen criterio propio. Si una tarea choca con una de éstas,
la que cede es la tarea.

Hasta hoy vivían sueltas en comentarios de código y mensajes de commit, y eso ya falló una vez:
cambié el ritmo de los nodos por mi cuenta porque la ley no estaba escrita en ningún sitio donde
mirar antes de tocar. Este archivo existe para que eso no vuelva a pasar.

---

## Ley 1 — El progreso no se resetea

> *« El único motivo por el cual se debe resetear una partida es cuando se actualiza borrando
> caché. Si el jugador no borra caché, entonces no tiene por qué resetearse en la partida. »*

Consecuencias prácticas, todas aprendidas rompiéndolas:

- Ninguna migración puede correr en cada `hydrate` sin bandera de "ya migrado".
- Nada de lo que el jugador ya compró puede quedar cerrado por una regla nueva. Si mañana se
  pone un requisito, cierra la **compra**, nunca lo comprado.
- Un guardado viejo con datos que la regla de hoy no permitiría se **recorta**, no se borra.
- Y al revés: una constante que cambia no basta si esa constante ya dejó **estado escrito**.
  Fue exactamente el caso del enfriamiento de la Zona (`zonaCdHasta`).

### Aclaración de dirección — servidor autoritativo al cargar (16/10/2026)

> « Claro, hay que invalidar las cargas locales. O sea, tiene que sí o sí funcionar a través de lo que se muestra en el servidor. »

Esta instrucción sustituye la recuperación automática local anterior. Al abrir se valida la cuenta
contra Auth y se carga exclusivamente su fila remota. Si falta la fila, se confirma un inicio
limpio en el servidor; una copia local con más progreso no la reemplaza. Sin conexión se bloquea
la entrada, sin inventar una partida ni borrar la remota. Los respaldos quedan para diagnóstico,
no para restauración automática. El reseteo total de cuentas del 16/10 fue una operación explícita
y excepcional del usuario, no permiso para resetear cuentas en despliegues habituales.

## Ley 2 — El ritmo de los nodos

### Precisiones de dirección — 16/10/2026

> « Y el diseñador quiere que la granja mida 9 por 9. Así que hazlo y a ver qué tal. »

El inicio nuevo usa 9×9 celdas totales; el borde deja 7×7 interiores. Las dieciséis
expansiones se ajustan para encajar. Las partidas existentes conservan su geometría guardada
para no recortar objetos ni perder progreso.

### Actualización de dirección — 17/10/2026

> « Sí, haz la granja de 6x6 y desactiva la pesca por ahora, pero conserva todo para recuperarla más adelante. Revisa bien que entre todo y que las expansiones encajen. »

El inicio nuevo sustituye 9×9 por 6×6 totales, con 4×4 interiores (espacioV:4).
Las partidas existentes conservan su versión. La pesca queda pausada mediante bandera,
sin borrar catálogos, arte, equipo, peces ni progreso. Las dieciséis expansiones se conservan.

### Vuelta a las dimensiones anteriores — 17/10/2026

> « vuelve a las dimensiones anterior »
> Confirmado « si » a « volver al inicio de 9×9, manteniendo la pesca desactivada ».

Se restaura espacioV:3 (9×9) para partidas nuevas, con sus expansiones originales.
La pesca permanece pausada. Se mantiene compatibilidad con partidas 6×6 ya guardadas,
sin recolocar objetos, cambiar sus expansiones adquiridas ni resetear progreso.

> « Cuando digo genera plata, me refiero a que generan el signo de pesos, bueno, de dólar, golden, la moneda premium sería. »
> « Claro, corregilo y movelo a otro lugar. »

Esta interpretación fue sustituida por la instrucción posterior del mismo día:

> « Sí, hazlo así entonces. Cambia los objetos para que produzcan plata y agrega el banco con esa tasa inicial ajustable. Los depósitos y retiros de USDT los dejamos desactivados por ahora. »

Los Objetos de Granja producen Plata y se gestionan en su sección independiente. Reclamo cada
24 horas, acumulación máxima de un día, vida útil de 180 días y un punto de energía por cobro.
Banco interno: tasa inicial de 10.000 Plata por Golden, ajustable en el servidor. No es una
paridad garantizada con USD. No habilitar depósitos ni retiros USDT, ni convertir retroactivamente
la producción anterior de Golden. Los saldos y las cuentas existentes se conservan.

### Producción inicial unificada — 17/10/2026

> « deben tener el mismo porcentaje que seria 0.87diario segun mis cuenta ya eso lo modificamos mas adelante!!! pero ese deria el inicial de todos! »

Los siete objetos producen el 0,87 % diario del coste sobre la referencia inicial de
10.000 Plata/Golden: coste en Golden × 87 Plata/día, sin excepción para el Granero.
Equivale a unos 115 cobros diarios de recuperación nominal a esa referencia, no garantizada.
La producción no sigue automáticamente los cambios de tasa del Banco. Se conservan precios,
propiedad, saldos, fechas y condiciones de cobro. Sustituye el balance anterior de 105 días.

> *« Los árboles tienen que tener cuatro cargas a las dos horas, cada treinta minutos una carga,
> y la piedra cada cuarenta minutos, cuatro cargas, como estaba antes. A partir de ahí hacé el
> ancla para lo que se te antoje, pero eso es una ley. »*

Árbol: 1 carga cada **30 min**, tope 4. Roca y veta de piedra: 1 cada **40 min**, tope 4.

El ancla (20 plata por celda-hora) se acomoda a este reloj, nunca al revés. El motivo no es
aritmético: **el ritmo de talar y picar es lo que el jugador siente**, y eso no se toca para que
cierre una cuenta.

## Ley 3 — Lo cosmético es terciario

> *« Si no dan nada a nivel jugabilidad, a nivel que permitan al jugador conseguir algo en el
> juego, más allá del aprecio visual que puedan llegar a tener, no tiene sentido añadirle esas
> cosas al jugador en ningún lugar. Para que al jugador le interesen los cosméticos, primero le
> tiene que gustar el juego. Cuando el jugador se encariña con el juego, ahí es cuando de repente
> van a querer cosméticos. »*

Un título, un marco, un emote, un aura o una skin **no cuentan como contenido**. Un nivel que
sólo entrega cosmético sigue siendo un nivel vacío, y llamarlo lleno es taparse los ojos.

Lo que esta ley prohíbe:

- Rellenar un hueco de progresión con cosméticos y darlo por cerrado.
- Reportar "N niveles vacíos pasaron a M" contando los que se llenaron con adorno.
- Proponer cosmético como solución a un problema de recompensa.
- Gastar tiempo de desarrollo o de arte en adorno mientras haya algo jugable sin terminar.

Lo que **no** prohíbe: que el cosmético exista. El pase y los niveles ya tienen su plan escrito y
puede quedarse. Lo que no puede es contar como respuesta a "¿qué gana el jugador acá?".

El orden de prioridad, dicho por dirección: **jugable primero, todo lo demás después** — y lo
cosmético no es lo segundo, es lo tercero o más abajo.

## Ley 4 — El animal que no come no da

> *« Le da hambre cada 24h. Si tienes la comida se la das, sino triste. El animal no come y no
> da nada y sigue el CD de 24h. No come = \*\*\* »*

Dictada por dirección en Discord el 11/9 a las 17:55. Reemplaza el rinde con decimales del 8/9.

- Cada ciclo (24 h) el animal tiene hambre **una** vez. Una comida por ciclo; la segunda no se
  acepta.
- Si comió en el ciclo, al cumplirse da su unidad **entera**. Si no comió, da **nada**.
- El reloj de 24 h **no se detiene ni se reinicia** porque el animal no haya comido.
- No hay fracciones, ni « guardado », ni « rinde 0,5 »: o da, o no da. Lo que un guardado viejo
  llevaba guardado se redondeó a una unidad a favor del jugador, una sola vez (ley 1).

Lo custodia `tools/test-establo-hambre.js`.

---

## Ley 5 — Lo que no está en su PC, no existe

> *« Todo lo que hagas, e incluso lo que hagas en tu sandbox, y que yo lo apruebe como un
> cambio, lo pondrás para que yo pueda hacerle deploy. »*

Dictada por dirección el 15/9, después de perder una tarde entera: ocho commits —el portero del
mercado, el orden del pantano, el combate, el freeze de la pestaña, el muñeco de la Zona y la
vida por nivel— se quedaron en el contenedor de la nube. Golden hizo el deploy y Render publicó
los archivos de la noche anterior, sin una sola línea de lo de ese día. El diseñador probó el
juego y dijo, con razón, que no estaba implementado.

El repo vive en **dos copias**, y solo una se publica:

| | dónde | qué es |
|---|---|---|
| la mía | el contenedor de la nube | donde trabajo y corro la suite. Su `git` es un cuaderno: **no llega a ningún lado solo** |
| la suya | `C:\Users\pauli\Desktop\golden\golden-mp` | la que `deploy.bat` sube y Render publica |

- **Un cambio aprobado termina copiado a su PC, en el mismo turno.** Commitear en el contenedor
  no es entregar: es tomar nota. Si no se copió, para el juego no existe.
- Nunca se escribe encima a ciegas: él también toca su copia (el arte, sobre todo). Primero se
  lee su archivo, se compara con mi versión de antes del cambio, y solo si coinciden se pisa.
- `public/index.html` conserva **su** sello `GF_BUILD`: lo reescribe `deploy.bat` en cada deploy,
  y pisarlo llena el diff de ruido.
- Y después se comprueba: se vuelve a leer el archivo desde su disco y se busca dentro lo que
  acabo de agregar. Que el commit diga OK no es que haya llegado.
- Vale para todo lo aprobado, no solo para el código del juego: el SQL, la Edge Function, los
  documentos para el diseñador y las herramientas de medición van por el mismo camino.

El cómo está en `CLAUDE.md`, en la raíz del repo.

---

# La pregunta del MVP

*Esto NO es una ley: es una decisión con fecha de caducidad. Vive aquí porque es lo que arbitra
cada recorte mientras dure el MVP, y el sitio donde se miran las leyes tiene que ser el mismo
donde se mira esto. El día que se conteste, se borra.*

> **¿Alguien vuelve a jugar siete días seguidos?**

Dictada por dirección el 9/9. De las tres preguntas que un MVP podía contestar, es la única que
hoy vale algo: la de la economía con valor real no se puede probar sin token ni pasarela, y
« ¿es divertido? » es demasiado vago para decidir nada con ella. La retención es lo que mata a
los juegos de granja, es barata de medir y no necesita nada que todavía no exista.

## Cómo se usa para decidir

Medido con el simulador, a tres sesiones diarias el jugador llega al **nivel 10 a los 7,0 días**
(eran 8,7 hasta el 14/9: al bajar el techo a 25, el mismo mes de XP se reparte entre menos
niveles y cada uno rinde más). De ahí sale la regla práctica:

> **El MVP vive entre el nivel 1 y el 12. Todo lo que un jugador no ve en su primera semana no
> es parte de esta prueba.**

Delante de cualquier propuesta, la pregunta es una sola: *¿esto cambia si alguien vuelve el día
siete?* Si la respuesta es no, no entra en el MVP — y da igual lo terminado que esté, lo caro
que haya salido o las ganas que dé de enseñarlo.

Consecuencias que ya se siguen de esto, para no tener que rediscutirlas:

- **Los niveles 21 al 50 no son un problema del MVP.** Nadie llega. El techo se baja a donde de
  verdad se llega, y las 16 expansiones se re-reparten solas — no se quita ninguna (ley de
  dirección: las dieciséis no se tocan). Desde el 10/9 el techo es **un solo número**
  (`FARM_NIVEL_MAX`): expansiones, cola de XP, cofre, altar y la escalera de tareas cuelgan de
  él. Bajarlo no borra contenido: el mes de XP se reparte entre menos niveles, así que cada
  nivel es más gordo y cada uno entrega algo. **El 14/9 se bajó a 25**: la partida entera pasa de
  29,7 a 26,3 días, el cofre queda en 12/15/19 y el altar en el 17. Lo custodia
  `tools/test-techo-a-un-numero.js`.
- **Lo que suma superficie sin sumar bucle se ESCONDE, no se borra**: el pase, los logros, el
  álbum, la doma, el torneo, el asalto de clan, los títulos de la Lonja. Detrás de una bandera,
  vuelven el día que se quiera. Cada panel de más es algo que puede confundir y algo que puede
  romperse, y ninguno contesta la pregunta.
- **El « hueco de las 8 horas » NO existe, y conviene que quede escrito por qué.** Estuvo aquí
  media hora como « lo más urgente del proyecto », y era falso. El 8,2 h sale del simulador con
  perfil de **tres sesiones al día**: mide reloj de pared incluyendo la ausencia, no esfuerzo —
  o sea que dice « el jugador plantó y se fue a dormir », no « el juego lo frena ».
  Calculado sobre las tablas, con papa (3 min, 15 XP por ciclo) y las 3 parcelas de arranque:

  | nivel | XP | papas | si te quedás jugando |
  |---|---|---|---|
  | 3 | 90 | 6 | ~6 min |
  | 4 | 225 | 15 | **~15 min** |
  | 5 | 550 | 37 | ~40 min |
  | 6 | 1.250 | 84 | ~1 h 25 |

  Y el cupo de semillas tampoco frena: es `40 × parcelas` = **120 siembras al día** con tres.
  Un jugador de día 1 que se sienta veinte minutos llega al 4 y roza el 5.

  Lo que sí queda, y es otra pregunta: *puede* seguir jugando — ¿el juego le da un motivo? Eso no
  se contesta con una tabla, se ve en el playtest. Va ahí, no aquí.

  **La lección, que es lo que justifica el párrafo:** un número de simulador no significa nada sin
  saber qué perfil simula. Éste llegó a escribirse como ley antes de que nadie lo comprobara.
- **Si el mercado entre jugadores está abierto durante la prueba, el portero de guardado tiene
  que salir de modo sombra antes.** No por seguridad —eso puede esperar— sino porque un solo
  jugador duplicando envenena todos los números que la prueba iba a dar. O el P2P se apaga, o el
  portero sube. Abierto y en sombra a la vez, no.

---

## Cómo se usa este archivo

### Actividad para futuros retiros · 21/10/2026

El diseñador propuso «una condición de retiro podría ser haber gastado 2000 de estamina […] aparte de tener el vip». El usuario aprobó avanzar: «Claro, lo que dijo es que avancemos con las sugerencias que acabas de dar».
Se refiere exclusivamente a energía de granja: 2.000 puntos confirmados, alcanzados una sola vez y conservados aunque venza el VIP. VIP activo es un requisito independiente para una futura solicitud; no se descuenta progreso por retiro. No se acredita historial previo sin evidencia. El servidor conserva el contador y corrobora cambios de acciones y presupuesto energético al aceptar cada guardado. Son comprobaciones sobre snapshots, no un sistema antifraude completo ni una garantía frente a bots. Acciones no corroborables no suman. El canje interno no se bloquea. Depósitos y retiros USDT siguen desactivados.

Antes de tocar un reloj, una curva, una recompensa o una puerta: leerlo. Antes de proponerle algo
al diseñador: leerlo. Si una ley nueva se dicta en Discord o por voz, **se escribe acá el mismo
día**, con la cita textual — no parafraseada, porque la mitad del valor de una ley está en cómo
la dijo quien la dictó.

### Orientación para la alfa · 27/10/2026

El usuario autorizó completar los cinco puntos de revisión de jugabilidad: «Bien, todos esos puntos son válidos, así que avanza como puedas con cada uno hasta finalizar y que quede una mejor versión de la que es para la alfa».

- El objetivo ofrece «Mostrar»: abre el panel y pestaña pertinentes o señala el destino en el terreno. Nunca compra, construye ni desplaza al personaje por el jugador. Respeta edición, colocación y gestos de cámara.
- La guía debe proponer acciones realizables para Free o VIP y usar las recetas vigentes; los planos se identifican por su tipo exacto.
- Los edificios tienen nombres breves en PC. El Mercado mantiene a mano los cultivos disponibles y agrupa los futuros, suministros de emergencia y bolsas en secciones desplegables.
- Después del tutorial, la brújula recuerda planos, nodos de expansión pendientes y la siguiente mejora, con destino concreto. Elegir la especialidad sigue siendo decisión del jugador.
- Los bloqueos de producción, mejoras y compras muestran su causa real. El emplazamiento se comprueba con la misma función que utiliza la compra.
- Esta revisión no cambia costes, recompensas, energía, tiempos ni formato de guardado. Pesca, móvil, nuevas maderas y USDT conservan sus condiciones previas.

## Guardado interrumpido y mercado atómico — 27/10/2026

Dirección autoriza: «haz todas esas pruebas y corrige lo que encuentres, empezando por el guardado y el progreso. Avanza hasta dejarlo listo para la alfa».

- El guardado tiene espera acotada, cancela la conexión y el cuerpo de una respuesta colgada, conserva el mismo recibo al reintentar y sólo confirma un ACK con versión del servidor. La escritura directa histórica de farms ya estaba cerrada por RLS y se retira ese fallback del cliente.
- Una respuesta de la cuenta anterior no puede hidratar la actual ni reintentar con su sesión. La recuperación por rechazo protege el cambio de cuenta, guarda un respaldo antes de sustituir y no anuncia recuperación si falla lectura o almacenamiento.
- P2P confirma movimiento de market, saldo/inventario de farms y recibo en una transacción. No hay débito optimista. La entrega se conserva primero en pendientes del servidor y se recoge automáticamente si cabe; si se corta la conexión, puede reclamarse al volver. Las fichas viajan completas.
- Se conservan precios, comisiones y cuotas Free/VIP/tiendita. El servidor valida cuenta, base, stock y propiedad; la operación repetida no duplica. Se cierra la escritura directa de market después de publicar el nuevo cliente y comprobar guardar.
- Un snapshot ordinario sólo conserva o reclama entregas aceptadas. No puede crearlas, duplicarlas ni alterar cantidades o fichas; omitir el campo conserva las pendientes anteriores.
- Quedarse sin semillas ni Plata no debe dirigir a vender materiales al comprador de cultivos: se señalan logros cobrables, premios diarios útiles o comercio entre jugadores, cuya compra depende de terceros.
- Las pruebas de SQL sobre cuentas QA terminan en ROLLBACK. No se reinicia ninguna cuenta, no se activa release y USDT permanece desactivado.

## Textos e interfaz — 27/10/2026

Dirección pide español neutro o de España sin cambiar conceptos, y ninguna pista sobre las mariposas.
- Usar español neutro en cartas, mensajes y controles. Preservar historia y nombres de monedas, objetos, edificios y habilidades.
- Preferir Fabricar, Equipar, Recoger y Vincular correo. Distinguir Restablecer distribución de Reiniciar progreso.
- No mostrar explicaciones ni pistas sobre las mariposas; su funcionamiento permanece visual.
- Una revisión lingüística no autoriza cambios de mecánicas, economía, guardado ni cuentas.

## Siete mejoras de intuición y presentación — 27/10/2026

Dirección autoriza completar HUD, Mostrar, estados de edificios, compras, monedas, menús y feedback visual. XP de granja y energía se distinguen; Mostrar precisa el destino y retira marcas al cambiar su contexto. Los avisos de edificios se derivan de los datos existentes y diferencian cartas, producción, obra y subida de nivel. Las tarjetas ilustradas muestran ventajas y propiedad; Banco representa Entregas → Recibes conservando cotización, validaciones y confirmación. Ayudas secundarias desplegables, rutas conservadas y feedback por tipo de acción, sin anunciar un éxito antes de confirmarse. No cambian economía, energía, progresión ni guardado; USDT permanece desactivado y no se añaden pistas sobre mariposas. Ver INTUITIVO-VISUAL-PC-20261027.txt.

## Cierre de cuatro revisiones prealfa — 27/10/2026

Dirección autoriza revisar inicio, bloqueos, interfaz de PC y regreso al juego, y corregir los fallos encontrados. La guía de recuperación de Plata distingue parcelas listas de cultivos creciendo. Cocina muestra falta de energía o espacio antes de actuar y actualiza su disponibilidad al recuperar energía; no cambia el coste real. Mostrar selecciona la receta objetivo y recupera el control conectado después de reconstruir pestañas, sin ejecutar la compra o fabricación. El comercio se llama Comercio entre jugadores y la mejora +1 anuncio de venta al día, conservando 10 Golden y cupos existentes. Las pruebas se realizan con cuentas ficticias/locales y se preservan las cuentas reales, el guardado y USDT desactivado. Ver ALFA-CUATRO-REVISIONES-20261027.txt.
