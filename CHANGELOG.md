# Golden Farm — Changelog completo del desarrollo

Registro cronológico de todo lo hecho desde el inicio del proyecto (27 de julio de 2026) hasta hoy.

---

## Día 1 — Lunes 27/07 · Nacimiento del juego

### Concepto y primera versión jugable
- Se define la idea: juego de granja de farmeo minimalista donde los recursos son lo esencial para subir la granja de nivel 1 a 10. Un recurso endgame (netherita) difícil de farmear: se recoge cada 4h, herramientas con enfriamiento de 24h, y los niveles 8-9-10 requieren luchar PvP por él.
- Se descarta el formato "clicker": el juego será un escenario con un personaje que se mueve con clics del mouse hacia nodos de pesca, tala y minería.
- Primera versión construida como **un solo archivo HTML/JS con canvas** en `C:\Users\pauli\Desktop\golden`.

### Primeros sprites (PixelLab)
- Se genera el granjero "Golden Farmer" con animación de caminata (el usuario lo descarga manualmente; se corrigen frames con fallos donde se equipaba/desequipaba cosas en la mano).
- Ajustes visuales de la primera tanda: sprites +25%, granja y mercado +50%, laguna no caminable, sombras sincronizadas con cada objeto, árboles que al talarse dejan solo el tocón y piedras que quedan como restos un tiempo.
- Animaciones de talar, picar y pescar integradas; las acciones dejan de ser instantáneas (tienen duración con animación).
- Inventario rediseñado a modo de celdas (30 espacios mínimo).
- Se quitan las flores decorativas, troncos talados −10%, tiempos de acción igualados al de regar.

### Deploy a Vercel
- Guía paso a paso: instalación de Node, Vercel CLI, login por device-code y `vercel --prod`.
- Primera URL pública del juego; después se limpia la URL del proyecto.

### Supabase: cuentas y persistencia
- El usuario crea el proyecto de Supabase; se conecta el juego (URL + clave anónima).
- Se evalúa login con Google → descartado (Google Cloud exigía tarjeta y prepago de $30).
- Se monta **login por email (OTP)** con SMTP configurado en Supabase, más ventana de apodo: apodo único, irrepetible y no editable, que solo se pide la primera vez.
- Tabla `farms` + fila por usuario para el guardado del progreso.

### Documentos del diseñador
- Se reciben e implementan las primeras especificaciones: `primera.docx`, `segunda.docx`, `tercera.docx`, `cuarta.docx`, `quinta.docx` (5 árboles y 4 piedras en total, entre otros ajustes).

### Referencia visual: Sunflower Land
- El diseñador pide un estilo visual similar a SFL. Se investiga el tamaño de sprites y grilla de SFL y se comparan capturas (tamaño del personaje vs NPCs, celdas, etc.).
- Se adopta: mundo en grilla de celdas, cámara siguiendo al jugador, granja en medio del bosque (no isla).

---

## Día 2 — Martes 28/07 · Migración a Phaser + multiplayer

### Nueva tecnología: Phaser 3.80.1 + Colyseus
- El usuario revela que el juego es **multiplayer** con zona compartida futura → se decide migrar todo a Phaser (cliente) + Colyseus (servidor Node/Express) en vez de seguir con el HTML único.
- Repo **GitHub `golden-mp`** creado (subida por drag & drop) y **deploy en Render** → `golden-mp.onrender.com`.
- Se crea **`deploy.bat`**: script de un clic para commitear y desplegar (el usuario lo ejecuta siempre él mismo).
- Errores de arranque resueltos: `Buffer is not defined`, `Colyseus.Client is not a constructor` (bundles correctos), `Cannot find module express` (npm install).

### Reconstrucción del juego en Phaser
- Mundo en grilla de tiles (23×15 celdas de 42px), movimiento por clic, interacción por clic (no solo tecla E).
- Acciones con barra de progreso, pesca, granja con plots plantables.
- Menú unificado (se elimina botón duplicado), zoom de escena ajustado.
- **Chat global** (Supabase Realtime) en el mismo panel del registro, con pestañas.
- **Autosave inteligente**: solo guarda si el snapshot cambió (nada de guardar cada 20s en vano); guardado de cosechas/plantaciones incluido.
- **Banner de actualización**: aviso automático a las ventanas abiertas cuando hay deploy nuevo.
- **Leaderboard real** desde la vista SQL `leaderboard` (adiós ranking inventado), con RLS corregida.
- **Sistema de ítems unificado**: recursos, picos y herramientas como stacks; hotbar con selección por clic (no solo números); herramientas con durabilidad.
- Panel registro/chat reposicionable.

### Generación de arte (día intenso de PixelLab)
- Bolsas de semillas: varias iteraciones hasta la definitiva (bolsa llena, cordoncito, imagen de la verdura).
- Verduras en unidad y agrupadas; selección de los mejores modelos.
- Nodos de mena: piedra, bronce, oro, diamante y **netherita con lava**; variación de forma entre piedras de cada nodo; sus **restos picados**.
- 5 picos con la misma forma (la "forma 2" elegida) y paleta por tier.
- Plots de cultivo, laguna sin borde amarillo raro.
- Se agotó el crédito de PixelLab → **cambio de cuenta**: reconfiguración del conector MCP (torpe pero exitosa, con reinicio de la app incluido).

### Incidente: caída de Render
- El juego dejó de cargar (`ERR_HTTP2_SERVER_REFUSED_STREAM`, `ERR_CONNECTION_CLOSED` en todos los assets). Diagnóstico y arreglo del servido de estáticos; el juego volvió a la normalidad.

### Más documentos del diseñador
- `6th.docx`, `detalles_2.docx` y otros: portal al bosque interactivo (como los nodos), plots estirados al borde de la celda, **modo edición de la granja** con drag de plots y laguna (resaltado de celdas ocupadas y rojo cuando no cabe).

---

## Día 3 — Miércoles 29/07 · El estilo maestro y el arte definitivo

### Definición del estilo "cozy storybook"
- Tras probar varios estilos, se elige el recomendado para juego de granja: **cozy chibi cartoon** (paleta cálida, contornos suaves y gruesos, render de cuento).
- Regla de oro establecida: **todo se genera dentro del mismo grupo maestro de PixelLab** para mantener coherencia.
- Regenerados con el nuevo estilo: **granero** (3×3), **herrería** (edificio distinto, no clon del granero), **mercadillo**, **cerca** (horizontal, vertical vista desde arriba, esquina que conecta), **laguna** (tamaño reducido), **árbol**, **nodos de mena** (los 5 tiers), **bolsas de semillas** (7 cultivos), **plots**.

### Reemplazo masivo de emojis por sprites
- Íconos de inventario: recursos (madera, piedra, bronce, oro, diamante, netherita, trigo…), peces (común/raro), platos de cocina, monedas (plata y $Golden), cofre diario, espada, arco, flechas, caña.
- Reemplazo en **todos** los lugares: hotbar, rueda de semillas al plantar, forja, mercado, cocina, panel de equipo (con **siluetas** generadas por código en los slots vacíos, sin títulos).
- Peces nadando en la laguna con sprites reales, dirección corregida (nadaban "en Michael Jackson") y tamaños variados.

### Ciclo de cultivo completo
- **Brote recto** (el anterior estaba inclinado), **estado intermedio** mostrando la verdura formándose y **planta crecida** para los 7 cultivos.
- Tiempos de crecimiento +10s para apreciar las fases (de momento en segundos, para testeo).
- Varias pasadas de centrado y escala: centrado por masa de suelo, reducción ~25% y luego más, hasta quedar clavadas en el plot.
- **Contador de cosecha solo visible con el cursor encima** (como árboles y nodos).

### Plots y fondo
- Plot con textura de tierra suelta que combina con los montículos de las plantas.
- **Plot bloqueado**: misma tierra (no más pálida) + ramitas, piedras y maleza — parcela "sin trabajar". Además se muestran **opacados** y sin brillo de interacción.
- **Fondo damero de césped** (dos verdes alternados) + ~210 decoraciones deterministas, reemplazando el verde plano "feo".

### Nodos con 3 estados y minería visible
- Nodos "plantados en el suelo" (parche de tierra + matas de césped), estado **intermedio medio roto** y **restos** con el mismo suelo.
- La transición entero→dañado→restos ocurre **durante la picada** (mitad de la acción), no al regenerar; la regeneración salta directo restos→entero.
- Duración de picar/talar aumentada + cooldowns para que la transición se vea.
- La netherita costó 3 intentos: quedó **roca carbón-negra con grietas de lava brillante** en todos sus estados.
- Bug de instalación detectado por el usuario (restos de bronce viejos): causa raíz, carpetas de export con sufijos no deterministas y caché del puente de archivos → se estableció verificación visual obligatoria de cada imagen antes de instalar.

### Cocina, cofre depósito y dummy
- **Cocina** como edificio propio 3×3 (ventanilla de servir, toldo, ollas — regenerada porque la v1 parecía una herrería): recetas movidas del granero a su propia ventana; cocinar tarda 8s con barra de progreso; los platos van a la bolsa y curan/dan buffs; **humo por código solo mientras cocina**, bocanadas irregulares saliendo sobre la chimenea (posición afinada dos veces).
- **Cofre depósito**: se craftea en la herrería (20 madera + 10 piedra + 200 plata), máx. 50, 10 espacios cada uno, **+1% de materiales por cofre**; se coloca en la granja, se puede arrastrar en modo edición, ventana de depositar/sacar.
- **Dummy de práctica**: entrenar espada (usa durabilidad, cooldown 4h, +30 XP), dibujado +25% con sombra pequeña.
- Regla nueva del usuario: **nada de parche de tierra en generaciones nuevas** salvo pedido explícito (dummy y cofre regenerados solo con césped).

### Bulk de código de los documentos `detalles 2907.docx` + `detalless.docx`
- ~18 ítems implementados de una tanda (mejoras de balance, textos, comportamientos según especificación del diseñador).

### Otros ajustes del día
- Herrería con pestañas **Craftear / Reparar** (la ventana ya no se corta); mercadillo con **Comprar / Vender**.
- **Cerca sólida**: ya no se puede traspasar por los costados ni por arriba/abajo.
- Cerrar ventanas con clic afuera; multiventana.
- Laguna por defecto reubicada (cortaba la cerca).
- Limpieza del proyecto: todo lo sin uso movido a `_archivo_sin_uso/` (gitignorado); estructura de `public/` ordenada.

---

## Día 4 — Jueves 30/07 (madrugada) · Rediseño completo de la UI

### Interfaz movible universal
- **Toda la UI arrastrable** manteniendo clic sobre cualquier zona no interactiva (inventario, granero, hotbar, chat…), con contorno de rayitas mientras se arrastra y posición recordada.
- Eliminados los botoncitos ✥ de arrastre (ya innecesarios).
- Bloqueada la selección de texto en toda la UI (el cursor ya no cambia sobre letras).

### La piel de madera (set de 4 imágenes PixelLab)
- Se generó un set UI nuevo; el usuario prefirió el **set original de 4 imágenes** (`gf_panel_wood`, `gf_slot_wood`, `gf_buttons_wood`, `gf_badge_wood`) y con él se vistió todo:
  - Marcos de ventana en **9-slice** (esquinas sin deformar, sin puntas blancas sobresaliendo).
  - **Fondo interior continuo de tablones** — idea del usuario: recorte del panel grande de `gf_buttons_wood`, espejado 2×2 para que sea seamless (la v1 con parches repetidos fue rechazada). Sin hueco entre marco e interior.
  - Botones, slots, hotbar, píldoras del HUD y menú con la misma madera; scrollbar de madera.
  - Filas de listas en pergamino cálido (nada de blanco pelado).
- **Estándar tipográfico** fijado por el usuario: fuente **blanca** (con sombra) sobre madera/marrón y sobre TODOS los botones; fuente **negra** sobre fondos claros/pergamino.
- Emojis eliminados de todos los títulos de ventana.
- Corregido un bug donde una regla CSS vieja (fondo crema) pisaba la nueva piel — el usuario tenía razón y la captura era de la versión actual.

### Glow de interacción
- Brillo aditivo al pasar el cursor y al estar cerca de cualquier interactuable (árboles, nodos, edificios, cofres, dummy…), excluyendo plots bloqueados.

### Pestañas y tabla interior (última iteración)
- Ventanas tipo Tienda: **pestañas Comprar/Vender con el diseño de las píldoras de la barra superior** (badge_wood), y el contenido agrupado dentro de una **tabla interior** con marco de placa.
- Refinado tras feedback: fondo de la tabla interior **continuo** (tile seamless del interior de la placa, `badge_bg.png`), pestañas **pegadas al borde superior** de la tabla (borde inferior cortado, se funden con la placa) y botones en **9-slice** para que no se deformen. Aplicado también a Herrería, Leaderboard y botones de moneda.

### Granjero definitivo integrado (30/7)
- **Granjero Golden definitivo** (PixelLab, 120px, estilo cozy chibi) reemplaza al granjero anterior en Granja, Bosque y Plaza.
- Animaciones nuevas: quieto (4f), caminar (6f), talar/picar/plantar/cosechar (9f), **pescar con tirón de caña** (9f, venía mirando al suroeste y se espejó a sureste como el resto), **espadazo horizontal con estela de velocidad** (8f) y **disparo de arco** (8f, arco y flecha ya en mano — sin aparecer de la nada). Regar mantiene el arte anterior.
- Frames recortados por animación con caja común (alineación estable); claves `hero_*` para no chocar con el atlas viejo.
- Bosque: el ataque cuerpo a cuerpo reproduce el espadazo y el disparo la animación del arco (el arma dibujada queda como respaldo a puños). El dummy de práctica también usa el espadazo.

---

## Pendientes conocidos
- Vestir con madera: panel de registro/chat, toasts y prompts.
- Generaciones supervisadas restantes: portal al bosque, 7 íconos de skills, retoque de lingotes bronce/oro, fuego animado de la herrería (experimental).
- En espera del diseñador: lombrices (pesca), cerca premium, tabla de stats del bestiario, tiempos de cultivo reales.
- Bloque grande diferido: jabalí (granjero definitivo ✔ integrado 30/7; 6 monstruos del bosque ✔).
- Código: bolsa a 20 espacios (falta confirmar layout), fondo del Bosque en damero oscuro.
- Pilares futuros: login por email multi-dispositivo, PvP/endgame de netherita, referidos, token $Golden, audio.
