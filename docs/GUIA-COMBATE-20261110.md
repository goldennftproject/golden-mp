# Guía breve de combate — 10/11/2026

El propietario solicita una explicación corta con imágenes al entrar por primera vez y una respuesta a Nachito. La respuesta del bot quedó verificada en https://discord.com/channels/1564640221063024763/1564643679266672740/1569776807518015619.

La tarjeta enseña tres controles existentes: clic derecho en un monstruo para fijar y activar el ataque automático; Perseguir o Parado para elegir el movimiento; clic derecho en el suelo vacío para cancelar. Reutiliza rata_idle_0.png y wood-shortcuts.svg, sin modificar arte. No bloquea el resto de la pantalla ni pausa la escena, y no roba el foco al aparecer. El botón «? Combate» permite volver a verla.

La marca de vista se conserva en este navegador por proyecto y cuenta verificada; no altera el guardado de la granja ni lee tokens. Sin almacenamiento disponible se recuerda en memoria; sin cuenta verificada no se crea una marca persistente compartida. Se desmonta al abandonar la escena. Los botones consumen sus clics y teclas de activación para no atacar detrás; al cerrar, las teclas de movimiento y E vuelven al juego.

Pruebas JSDOM: primera entrada/reentrada y reapertura manual, cuentas independientes y callback anterior, limpieza de escena anterior, almacenamiento bloqueado, identidad ausente, foco y teclado, sin cambios de estado ni llamadas de red. No se usó navegador para la vista previa; el PNG de revisión es una ilustración por Pillow de la tarjeta HTML/CSS.
