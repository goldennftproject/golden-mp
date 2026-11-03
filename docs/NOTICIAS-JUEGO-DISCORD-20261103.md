# Noticias compartidas entre juego y Discord — 03/11/2026

Dirección aprueba dos noticias con sus imágenes después de revisar la vista previa completa y pide un apartado de Noticias dentro del juego.

## Fuente compartida

`public/news/index.json` contiene título, fecha, texto completo, imagen, descripción y enlace al mensaje confirmado de Discord. Las imágenes son los mismos bytes JPEG aprobados; no se publica información de cuentas. No se consulta Discord desde el navegador ni se incluye la credencial del bot en el cliente.

El publicador local de esta tanda (`golden-discord-bot/publish-approved-news-20261103.mjs`, en el espacio de trabajo de Codex) comprueba que el feed y el lote aprobado tengan texto e imagen idénticos antes de enviar. Mantiene recibos por mensaje, nonce fijo y reconciliación de entregas ambiguas. Un nuevo lote de Discord requiere mostrar su vista previa y recibir autorización del usuario.

## Publicaciones confirmadas

- Renovación visual: https://discord.com/channels/1564640221063024763/1564643673889841243/1567313982996357201
- Nodos con Golden: https://discord.com/channels/1564640221063024763/1564643673889841243/1567314000516227193

Ambas verificadas por lectura posterior del mensaje y comparación SHA-256 de sus imágenes. Sin menciones masivas ni cambios de permisos del bot.

## Lector dentro del juego

Acceso: Menú → Noticias, dentro del grupo Comunidad. Lista de publicaciones, lectura con imagen ampliable y marca local de noticias nuevas. Sin apertura automática, consultas a Supabase ni escrituras de progreso. Los mismos textos y precios que Discord. Carga estática desde Render.

Verificación: test-news cubre contenido seguro (sin HTML activo), enlaces e imágenes admitidos, lectura/badge, foco, zoom/Escape, permisos de teclado del modal, caché tras fallo y reintento, integración del menú y aislamiento de G/guardado/DB. Pasan también las regresiones de menú y autoguardado. QA nativa en Chrome a 900×700, 1033×572, 1346×760 y 1672×948, tanto Clásico como Renovado: ocho casos sin desbordes, imagen y fecha correctas, cierre accesible. Seleccionar texto no mueve la ventana. Capturas y recibos bajo work/discord-news-20261103 en el espacio de trabajo de Codex.
