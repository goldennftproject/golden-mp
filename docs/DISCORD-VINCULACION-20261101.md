# Vincular Discord con Golden Farm

Autorización: «Y bueno, añade esa posibilidad entonces».

En Configuración → Discord, el jugador genera un código, usa `/vincular` en
el servidor Golden Farm, pega el código en la opción `codigo` y vuelve al juego.
Pulsa Comprobar vinculación, revisa el nombre y @usuario y confirma explícitamente.
El bot responde de forma privada. No se publican códigos, correos ni depósitos.

El método usa la identidad de la interacción del bot oficial, sin OAuth adicional,
permisos de mensajes, contraseñas ni cambios en el acceso por correo al juego.
Requiere correo verificado, caduca en 10 minutos y limita regeneración a 30 segundos.
El código tiene 128 bits aleatorios; sólo su SHA-256 se guarda. Crear otro invalida
el anterior. No reutiliza códigos confirmados ni reemplaza una vinculación existente.
Una cuenta de Discord por granja y una granja por Discord; índices únicos y bloqueos
serializan confirmaciones concurrentes. Un código presentado nunca enlaza por sí solo:
la confirmación final pertenece a la sesión verificada del juego.

Las tablas son privadas con RLS, sin permisos para anon/authenticated. El RPC es
SECURITY INVOKER, search_path vacío, exclusivo de service_role. La Edge Function
discord-link mantiene verify_jwt=true; valida Auth para usuarios y el bot oficial
con Discord para `/vincular`. Obtiene el perfil del miembro del servidor por la API,
no del nombre enviado por el cliente. El bot no tiene acceso directo a PostgreSQL.
Su token permanece cifrado con DPAPI local y sólo se usa en memoria; no va al cliente
ni a estas tablas. No se registra el token en logs.

Estado: el juego identifica si la cuenta tiene un depósito confirmado, sin mostrar
importe, wallet ni transacción en Discord. **No se asigna automáticamente el rol de
Fundador de la Alfa**: el bot carece de Gestionar roles y no se han ampliado permisos.
La vinculación no concede ventajas, cambia compras ni afecta al estudio económico.

Implementación del bot versionada en `integrations/discord-bot/`. El proceso activo
continúa en la carpeta `golden-discord-bot` del espacio de trabajo de esta conversación,
con el mismo token DPAPI. Depende de que ese PC y proceso estén encendidos. Render
sirve el juego y Supabase ejecuta la validación; este cambio no contrata hosting.

Validación: tests UI y Edge con mocks; SQL real en BEGIN/ROLLBACK (caducidad, doble
confirmación, unicidad, código no reemplazable, aislamiento de privilegios). Sin fixtures
residuales, 19 cuentas y 2 depósitos preservados en esa comprobación. Prueba con bot real:
comando registrado, identidad de bot y miembro verificadas; código ficticio rechazado.
La vinculación real de un jugador requiere su confirmación en ambas interfaces.

## Acceso y disponibilidad del bot — 03/11/2026

Se corrige el destino incompleto que abría sólo `/channels/<servidor>`: para una persona
que todavía no pertenece al servidor puede aparecer como lugar desconocido. Configuración
ofrece primero la invitación existente y permanente `https://discord.gg/fQZn9Bsvkd` y después
el canal concreto `https://discord.com/channels/1564640221063024763/1564640914687664189`
(#empieza-aquí). La API pública confirmó Golden Farm, canal correcto y ausencia de caducidad.
No se creó ni envió una nueva invitación. El canal permite ViewChannel y UseApplicationCommands
a @everyone, y `/vincular` está registrado con la opción `codigo`; no se cambiaron permisos.

El aviso «la aplicación no ha respondido» coincidió con ausencia del proceso local del bot.
El handler ya reconocía la interacción antes de consultar la red; se extrae en un módulo
probado que mantiene ese ACK privado y entrega un error explícito si falla la conexión.
No cambian la identidad, los códigos, la validación de servidor ni la confirmación final
en el juego. Cinco pruebas verifican ACK antes de red lenta, código inválido, límite,
rechazo y timeout, sin vincular cuentas reales ni enviar mensajes de prueba.

Se restauró el proceso conocido y su log confirmó READY el 03/11/2026 a las 18:40:51 UTC.
El launcher de Windows carga primero sus propios módulos cuando hereda un entorno de
PowerShell 7, conserva el token DPAPI en memoria, mantiene una sola instancia mediante
mutex y reintenta salidas no satisfactorias. Un acceso de inicio del usuario de Windows
apunta al mismo launcher en modo oculto; no contiene credenciales. Su target/argumentos
y el mutex retenido por el proceso activo se comprobaron. Sigue dependiendo de que el PC
y la sesión de Windows estén encendidos; no se contrató hosting ni se amplió acceso.

Las trazas locales registran READY/reconexión y no incluyen códigos, identificadores
de jugadores ni tokens. El arranque no publica mensajes; sólo mantiene los comandos
existentes y conecta el gateway.

Validación adicional: la consulta publicada detectó una lectura redundante de auth.users
que service_role no podía realizar. Se retiró esa lectura sin conceder privilegios: Auth
se verifica en la Edge Function. La suite SQL completa se repitió como service_role y pasó.
Ante la terminal sin salida, se cancelaron sus sesiones y se comprobó HEAD y ausencia
de index.lock; Git directo mediante execFile en el runtime Node completó la publicación.
