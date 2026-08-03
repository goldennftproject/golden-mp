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

### detalles viernes (31/7)
- **Desbloqueo de parcelas con confirmación**: recuadro con el costo, Aceptar (verde) y Cancelar (rojo) — se reusó el cartel de la papelera, ahora configurable.
- **Pesca**: barra de progreso sobre el granjero durante toda la pesca; cuesta SOLO 1 lombriz (ya no pide esencia).
- **Combate**: el auto-ataque cada 2s es SOLO con clic derecho (el izquierdo acerca y fija); se puede caminar y atacar a la vez — el golpe ya no bloquea el movimiento y la animación de ataque manda mientras dura.
- **Árboles**: talar dura 3 golpes (3 vueltas de la animación, con los cortes intermedios en cada tercio); a la mitad del enfriamiento el tocón pasa al árbol a medio crecer (sprout).
- **Herrería**: pestaña ARMAS separada (espada, arco y flechas ya no se mezclan con picos/materiales); craftear barras tiene enfriamiento de 6s con contador en el botón.
- **Cocina**: todas las recetas piden madera (estofado y banquete sumaron 1 de madera; el pescado asado ya la pedía).

### Herramientas modelo SFL (31/7, charla con el diseñador)
- **Las herramientas se tiran y se ROMPEN** (ya no se reparan): hacha y caña al llegar a 0 de durabilidad se destruyen y desaparecen de la bolsa.
- **SFL puro: 1 uso por herramienta** — un hacha = una talada, una caña = una pesca, un pico = una picada.
- **Costos baratos en la Herrería**: Hacha = 5 plata · Caña = 1 madera + 5 plata · Picos: Piedra 1 madera + 10 plata, Bronce +1 piedra + 15, Oro +1 bronce + 25, Diamante +1 oro + 40, Netherita +1 diamante + 80 (cada tier usa el material del tier anterior, como en SFL). Si se rompe el pico equipado, se auto-equipa otro que tengas.
- Las partidas guardadas viejas se ajustan solas (la durabilidad se recorta al máximo nuevo).
- **Las ARMAS conservan la reparación** (espada y arco), como acordó el diseñador.
- La pestaña Reparar quedó solo para armas; los picos se ven con su durabilidad en Craftear.

### detalles viernes (1) — 31/7
- **Herramientas APILABLES**: hacha, caña y picos son contadores (1 uso cada una, apilan hasta 99). Craftear suma al stock, usar consume 1. La bolsa y la hotbar muestran la cantidad. Migración automática de partidas viejas (durabilidad vieja → 1 herramienta).
- **Economía**: solo cultivos y lo farmeado en la Zona Negra (carne) se venden por plata. Minerales, madera, flechas, armas y comidas ya no se venden.
- **Combate**: el clic izquierdo SOLO acerca y fija (sin ataque de llegada); atacar es solo clic derecho o E/espacio (auto cada 2s). Los mobs atacan cada 2 segundos (antes 1.2s). La vida SOLO se regenera con comida (sin regen pasiva).
- **Bolsa**: fondo blanco en los slots con objetos (también hotbar), para el testeo visual del diseñador.
- **Pesca**: efecto de CATCH al terminar — splash en la boya y el pez salta en arco girando hasta la mano del granjero, con destello.
- **HORNO DE PIEDRA** (edificio nuevo, PixelLab): ahí se funden TODOS los lingotes/barras (se movieron de la Herrería), con su enfriamiento. Ubicado entre la laguna y el mercado.
- **EDIFICIOS EN CONSTRUCCIÓN**: en partidas nuevas la Herrería, el Horno y la Cocina arrancan en sombra (difuminados). Clic → receta de construcción con confirmación: Herrería = 15 madera + 10 piedra · Horno = 12 piedra + 8 madera + 5 papas · Cocina = 10 piedra + 10 madera + 5 papas + 3 oro. Las partidas existentes los conservan construidos.

### Pulido de UI (31/7, tarde)
- **Aviso de interacción** ("Mercado · [E]"): reposicionado por JS siempre 34px por encima de la hotbar (esté donde esté), y con el mismo formato que las píldoras del HUD (13px, peso 700).
- **Tipografía estándar del juego**: blanco con contorno oscuro de 1px en pills del HUD, títulos de ventanas y aviso de interacción (como los contadores del mundo). El "Listo" del dummy volvió a texto simple.
- **Pestañas fundidas, versión final**: la activa termina exacto en el borde del panel y unas piezas nuevas de esquinero (`tabjoin_l/r`, fabricadas píxel a píxel) hacen que el dorado vertical DOBLE y salga como dorado horizontal — un solo borde continuo, sin cruces. En las pestañas pegadas a la esquina del panel, la madera sigue derecha y empalma con el marco (`tabweld_l/r`).
- **Leyendas (tooltips)** en todos los iconitos chicos de recursos/monedas/peces (costos, "Mina:", recetas).
- **Herramienta rota desaparece al instante** también en bolsa/equipo/herrería abiertas (antes quedaba el ícono fantasma hasta reabrir).

### detalles viernes (2) — 31/7
- **Costos nuevos**: Hacha 10 plata · Caña 3 madera + 1 piedra + 15 ORO (recurso, literal del doc) · Picos: Piedra 3 madera+10p, Bronce 4 madera+5 piedra+10p (confirmado por Discord), HIERRO (nuevo) 3 madera+5 piedra+10p, Oro 3 madera+5 bronce+35p, Diamante 3 oro+3 madera+45p, Netherita 1 diamante+5 madera+100p. Cada pico mina solo hasta su tier (hierro pasó a tier 2).
- **Pico de Hierro**: tier nuevo con sprite derivado del de piedra (cabeza plateada fría).
- **Espada de Madera**: 5 madera · daño 4+skill/2 · durabilidad 40 · repara con 2 madera. Sprite derivado de la de hierro (hoja de madera). Entrena en el dummy y gasta durabilidad al pegar.
- **Sin arma equipada NO se ataca** (puños eliminados); el arco sigue exigiendo flechas equipadas.
- **Pestaña Armas de la Herrería BLOQUEADA** hasta pagar una vez 20 madera + 20 piedra + 1000 plata.
- **Todos los recursos dan 1** (talar, picar piedra y minerales).
- **Inicio nuevo**: bolsa con SOLO 3 semillas de papa, 2 parcelas, y la Herrería como único edificio construido (gratis). Horno = 100 madera + 100 piedra · Cocina = 100 madera + 10 de cada verdura.
- **Árboles y piedras con desbloqueo**: 6 y 6, nace 1 de cada activo y el resto difuminado. Costos 3/9/27/81/100 (madera p/ árboles, piedra p/ piedras). Tras pedido del diseñador: se desbloquea CUALQUIERA, sin orden (el precio depende de cuántos ya abriste). Guardado por lista con migración.
- **Combate**: el mob frena al borde de tu celda (no la pisa) y si queda encima retrocede.
- **La carne ya no se vende** (fuera de la tienda). **El cinturón de herramientas** salió del panel de Equipo. **La azada se retiró del juego** (sin uso hasta que exista arar) con limpieza automática de partidas guardadas.
- **Portal NEGRO girando**: vórtice recoloreado a negro por inundación desde el centro (las enredaderas del arco intactas) y los 8 frames regenerados con rotación elíptica de TODA la boca — nada queda estático ni se derrama sobre las piedras.
- **Agua del lago con movimiento**: ondas elípticas que se expanden y destellos que titilan (por código).
- **Humo del Horno de Piedra** por código (volutas grises desde la chimenea, solo construido).

### Tabla de precios del diseñador (31/7, noche)
- Cultivos según la tabla oficial (Ganancia = Tiempo × Riesgo × Nivel): niveles 1-7 · compra 1/3/6/12/20/40/90 · venta 3/8/16/32/50/100/210 · rinde 1.
- Tiempos **a escala de testeo**: 1h de la tabla = 1 min de juego (`GROW_SCALE = 1/60`; para lanzar en real, ponerlo en 1). Marchitado proporcional: mitad del tiempo de cultivo.

### Suelo nuevo de la granja (31/7, noche)
- **Chau damero**: 3 tiles de pasto seamless de 42px (procedurales, paleta exacta del juego) mezclados con semilla fija en una RenderTexture. Primera versión salió con "reja" negra por tiles de 32px en celdas de 42 — corregido.
- **Decoración PixelLab**: margaritas, flores amarillas, mata de pasto y piedritas (~110 esparcidas con semilla fija, tamaños variados, espejado aleatorio). Con respaldo procedural si falta el arte.


### Panel de balanceo (31/7, noche)
- **`/balance.html`**: página pública (temporal) donde el diseñador edita TODAS las variables del juego, categorizadas y en español: cultivos (horas, compra, venta, rinde, nivel), escala de tiempo, herramientas, picos, armas (costos, daño base, durabilidad, reparación), monstruos (vida, daño, XP, velocidad), minerales y enfriamientos, materiales del Horno, recetas de Cocina, edificios y desbloqueos.
- Lee las definiciones REALES del código (siempre sincronizada), marca en amarillo lo que difiere del valor por defecto, y guarda solo las diferencias en Supabase (tabla `balance`).
- El juego aplica los ajustes al arrancar (los jugadores los toman al recargar). Si no hay red o tabla, arranca con los valores del código.
- Para que funcione hay que crear la tabla una vez en Supabase (SQL provisto).


### Combate en la Zona Negra, versión final (1/8, Discord)
- **Clic izquierdo**: caminar; y si cliqueás un bicho que tenés a rango de espada, un **espadazo suelto** — sin fijarlo, sin recuadro rojo, sin auto-ataque, y sin frenar la caminata (usa la animación caminar+espadazo). Misma cadencia que el auto (no se puede spamear). Sin arma equipada, muestra el mismo aviso que el derecho.
- **Clic derecho / E**: fija al mob (recuadro rojo) y auto-ataca cada 2 s. El recuadro rojo es EXCLUSIVO del derecho.

### Panel de balanceo: correcciones (2/8)
- **BUG del Mercado**: la venta de cultivos usaba una copia vieja de precios interna e ignoraba lo editado en el panel (solo la compra de semilla se reflejaba). Ahora el Mercado lee en vivo la misma tabla del panel.
- **FUERA la "velocidad de testeo"**: el tiempo que se escribe en el panel es el tiempo real del juego, sin compresiones ocultas (el bug de "pongo 9 min y son 9 segundos"). Los defaults de cultivos pasan a ser los reales de la tabla.
- Tiempos del panel en casilleros humanos (horas / min / seg) y cada variable con su unidad y tipo al lado.

### Pedidos del diseñador (2/8, Discord)
- **Jabalí eliminado** de la granja (sistema apagado con una línea, reactivable; el arte queda).
- **Cultivos sin pudrirse**: marchitado desactivado — la cosecha lista espera para siempre. Las parcelas ya marchitas en partidas guardadas se recuperan como LISTAS (si se sabe el cultivo) o quedan libres.
- **Azada retirada del juego** (sin uso hasta que exista arar); limpieza automática de hotbar/bolsa guardadas.

### Formato de tiempo ESTÁNDAR en todo el juego (2/8)
- Una única función (`fmtSecs`) para TODOS los timers visibles: "45 s", "9 min", "1 h 30 min", "1 d".
- Aplicado a: Tienda ("crece en 9 min"), avisos de interacción ("Vuelve en 1 min 20 s"), contadores flotantes de nodos y cultivos, dummy (cartel/aviso/toast), botón de enfriamiento del Horno, "restantes" de la Cocina y descripciones de recetas.

### Documento de diseño: sistema de farmeo con 10 cultivos (1-2/8)
- `Sistema_de_farmeo_10_cultivos.docx` (5 iteraciones con el diseñador): 10 cultivos (suma Girasol, Trigo y Maíz), tiempos 9 min → 24 h, precios con ganancia por hora PAREJA y margen creciente con tope (se evaluaron 15%, 10% y 12% y escenarios con 2 y 4 parcelas iniciales), y tablas de XP (nivel 2 a las ~37 h). Pendiente de aprobación final; Girasol/Trigo/Maíz necesitarán arte.


### IMPLEMENTACIÓN DE LOS DOCUMENTOS MAESTROS — cronómetro
- Documentos recibidos: "Compendio de Planillas y Datos" + "Documento de Diseño Completo" (v1.0 del diseñador).
- **INICIO de la implementación: domingo 2/8/2026, 18:39** (hora de recepción de los documentos).
- FIN: domingo 2/8/2026, 20:14 — **tiempo total: ~1 h 35 min** (detalle al final de la sección).

#### Fase 1 COMPLETA — Progresión temprana (2/8, ~18:55)
- **Curva de skills 1-150**: puntos para subir = 100 × Nivel^2,7 (verificada contra la tabla del doc: nivel 10 = 111.525 XP acumulada, nivel 40 = 21.831.905). Base y Exponente editables en el panel de balanceo.
- **Nivel de granja por XP** (front-loaded 10/35/90/220/500/1.100/2.400/5.200/11.000): sube solo cosechando; ya no se paga con recursos. Desbloqueos automáticos con aviso: parcelas 3/4/5/6 GRATIS en niveles 2/4/6/7, Horno a nivel 3, Cocina a nivel 5. El Granero muestra el progreso de XP y el próximo desbloqueo.
- **XP por cosecha proporcional al tiempo** del cultivo (Papa 2 … Brócoli 80), editable por cultivo en el panel.
- **Primera tanda en 45 segundos**: el jugador nuevo cierra el loop plantar→cosechar→vender en el primer minuto; desde la segunda siembra, tiempo real. Veteranos no afectados.
- **Costos early**: Horno 10 madera + 8 piedra · Cocina 20 madera + 15 piedra (los costos altos quedan para versiones mejoradas).
- **Herramientas de arranque**: el jugador nuevo nace con 15 usos de hacha, caña y pico.
- **Crafteo en lote**: botón ×5 en hacha y caña de la Herrería.
- Alcance: progresión temprana front-loaded, curva de skills 1-150, sistema de combate con 4 armas y skill por arma, 20 armas crafteables con buffs, Cocina completa (14 recetas + maestría), bestiario de 15 criaturas + jefe, barra de Combate global, Altar de Runas y Pase de Batalla.

#### Fase 2 COMPLETA — Sistema de combate y armas (2/8, ~19:05)
- **20 armas crafteables**: 4 tipos (Espada, Hacha, Mazo, Arco) × 5 rarezas (Madera, Piedra, Bronce, Oro, Diamante), cada una con daño mín-máx, durabilidad, costo en materiales + plata y enfriamiento de crafteo según el doc maestro.
- **Buff por tipo**: Espada = crítico ×2 (3→18%) · Hacha = perfora % de la defensa (20→70%) · Mazo = aturde y el mob pierde su próximo golpe (8→30%) · Arco = sangrado (1→6 daño/s por 3 s) + ataque a distancia.
- **Fórmula de daño del doc**: Daño = máx(1, tirada(mín-máx) + nivel de skill ÷ 2 − defensa efectiva del mob), cadencia 2 s.
- **Skill por arma**: cada tipo sube su propia skill (Espada, Hacha de combate, Mazo, Arco) con la curva 1-150; matar da la XP del bestiario al arma usada.
- **Mobs con defensa** (stats del doc): Rata 12/0 · Larva 22/1 · Orco 60/4 · Lancero 90/6 · Guerrero 115/8 · Trol 140/10, con XP nueva por kill.
- **Herrería · pestaña Armas renovada**: forjar las 20 armas agrupadas por tipo, equipar y reparar; todo editable en el panel de balanceo (daños, buffs, durabilidades, precios, mobs).
- **Dummy de práctica**: ahora entrena con CUALQUIER arma cuerpo a cuerpo equipada y da XP a la skill de esa arma.
- **Migración de guardados**: espadas/arcos viejos se convierten solos (Esp. Madera → Espada de Madera · Esp. de Hierro → Espada de Bronce · Arco → Arco de Madera) conservando equipado y hotbar.
- Arte pendiente (Fase 5 con los cultivos): sprites por rareza; mientras, cada tipo usa su sprite base.

#### Fase 3 COMPLETA — Barra de Combate global (2/8, ~19:15)
- **Nivel de Combate GLOBAL**: suma la XP de TODOS los kills sin importar el arma (además de la skill del arma usada). Misma curva 1-150 (100 × N^2,7): la primera Rata ya sube a nivel 2.
- **Barra en el HUD**: insignia con el nivel + etiqueta "Combate" + relleno dorado con animación suave + "XP actual / necesaria". Pulso de brillo mientras hay mobs peleándote.
- **Feedback por kill**: "+XP" flotante dorado sobre el mob al matarlo.
- **Multi-nivel en un kill**: un Trol que sube varios niveles muestra UN solo cartel ("¡Combate nivel 12! (+2)").
- **Hitos de vida**: nivel 5 = +20 de vida máxima · nivel 10 = +40 más (100 → 160). Editables en el panel de balanceo. Los demás desbloqueos de la tabla (zonas, tier de mobs, slot de comida) quedan para cuando existan esos sistemas.
- Guardado migrado (los veteranos arrancan la barra en nivel 1) y gancho listo para la celebración de la Fase 5.
- (El crafteo de las 20 armas previsto para esta fase ya se adelantó en la Fase 2.)

#### Fase 4 COMPLETA — Sistema de Cocina (2/8, ~19:25)
- **Las 14 recetas del doc** (Papa Asada → Banquete del Bosque) con ingredientes, curación 10-40, cocción 6-20 s, XP 8-70 y venta 5-180 plata, exactas a la planilla. Las 3 recetas clásicas (pescado/carne) se conservan al final con nivel y precio de venta.
- **Niveles de Cocina 1-10** con la tabla acumulada del doc (30/80/160/300/520/850/1.300/1.900/2.700): cada nivel desbloquea sus recetas con aviso; el panel de la Cocina muestra nivel, barra de XP y qué falta.
- **Maestría**: Potencia = 1 + 2% por nivel sobre la receta (tope +50%). Escala el buff Y el precio de venta (verificado contra la tabla Mercado del doc: Sopa a nivel 10 = 16 plata, potencia ×1,16).
- **Venta de platos** desde la Cocina: todos por plata; los de nivel 8+ también por $Golden (se desbloquea con Cocina nivel 8, como pide el doc).
- **10 buffs de comida funcionando**: vel. de farmeo (acorta plantar/cosechar), regeneración HP/s, vel. de movimiento (granja, bosque y plaza), defensa (reduce daño recibido), daño (multiplica el golpe), XP de cocina, suerte en drops, XP de combate (skill + barra global), vida máxima temporal, y el Banquete (+20% daño/def/vel juntos). Duración estándar 5 min, editable.
- **Panel de balanceo**: cada receta editable (ingredientes, curación, XP, nivel, cocción, venta, valor del buff, $Golden) + duración global de los buffs.
- Las recetas con Trigo/Maíz/Girasol quedan visibles pero no cocinables hasta que la Fase 6 agregue esos cultivos. Arte de los platos pendiente (por ahora ícono genérico).

#### Fase 5 COMPLETA — Celebración de subida de nivel (2/8, ~19:35)
- **Cartel central** al subir CUALQUIER nivel: "¡NIVEL X!" con pop (escala 0 → 1,15 → 1, back-out), nombre de la skill debajo y la recompensa desbloqueada; se va solo a los ~2 s desvaneciéndose hacia arriba, sin bloquear el juego.
- **Brillo y partículas**: halo dorado radial que pulsa detrás del cartel, ráfaga de ~26 chispas doradas que vuelan y caen, y barrido de luz diagonal sobre el texto. Tipografía del estándar del juego (blanca con contorno oscuro).
- **Jerarquía del doc**: Micro (los "+XP" flotantes que ya existían) · Media (cartel normal) · GRANDE con fogonazo de pantalla, confeti de colores y fanfarria doble para: niveles de Granja (siempre regalan algo), hitos de Combate (5 y múltiplos de 10) y Cocina maestra (nivel 10).
- **Cola de eventos**: si suben varios niveles seguidos, los carteles salen uno tras otro sin pisarse; un salto multinivel se resume en un solo cartel ("¡NIVEL 4! (+2)").
- Conectado a TODAS las fuentes: skills 1-150, nivel de Granja (con su desbloqueo como recompensa), barra de Combate global (con la vida extra de los hitos) y niveles de Cocina (con la receta nueva).

#### Fase 6 COMPLETA — Girasol, Trigo y Maíz + tabla de 10 cultivos (2/8, ~19:50, incl. arte en PixelLab)
- **3 cultivos nuevos**: Girasol (10 h · granja Nv 8), Trigo (16 h · Nv 9) y Maíz (24 h · Nv 10), con arte PixelLab nuevo: planta completa, planta a medio crecer, ícono de cosecha y bolsa de semillas de cada uno, generados como ESTADOS del granero (el objeto raíz del que sale todo el arte del juego) para heredar el estilo exacto; las 3 bolsas derivadas de la bolsa de semillas original cambiando solo el dibujo. Descarga con `descargar_cultivos.ps1` ANTES de deployar.
- **Tabla de 10 cultivos del doc de farmeo (v5) aplicada COMPLETA**: escalera de tiempos 9 min (Papa) → 24 h (Maíz), precios con margen tope del 12% y ganancia pareja de ~6 plata/hora (Papa 20→21, Zanahoria 40→42 … Maíz 1.200→1.344), y XP por cosecha = minutos de crecimiento (Papa 9 … Maíz 1.440). Todo editable en vivo en el panel de balanceo si el diseñador quiere retocar.
- **Ritmo de granja verificado** con la curva front-loaded del doc maestro: nivel 2 en minutos, nivel 5 en ~2 h de parcela activa, nivel 10 en ~92 h con las 2 parcelas iniciales (≈ las "2-3 semanas" del doc).
- Con Trigo, Maíz y Girasol vivos, **se activan las 5 recetas de Cocina que estaban bloqueadas** (Pan de Trigo, Tortilla de Maíz, Aceite de Girasol, Pan de Maíz y Trigo, Estofado de la Cosecha).
- La Tienda, la rueda de semillas, el Mercado, el inventario y el panel de balanceo toman los 3 cultivos solos (todo sale de la tabla).

#### Fase 7 COMPLETA — Bestiario ampliado: 15 criaturas + jefe (2/8, ~19:57)
- **11 criaturas nuevas** con los stats exactos de la planilla: Murciélago, Baba (+Babitas al dividirse), Araña, Goblin, Esqueleto Arquero, Golem de Piedra, Hombre Lobo, Ogro, Espectro, Demonio Menor y el jefe **Dragón de las Cavernas** (900 de vida / 28 def / 42 daño / 14.000 XP). Se reparten por profundidad en la Zona Negra: entrada fácil → jefe al fondo (reaparece a los 3 min).
- **Habilidades del doc, todas**: Vuelo evasivo (esquiva 25% cuerpo a cuerpo) · División · Telaraña venenosa · Corte sucio (40% sangrado) · Enfurecer · Flecha maldita a distancia (-25% def) · Caparazón +60% def y Pisotón en área · Aullido (-25% daño) · Regeneración 2%/s · Embestida telegrafiada (×2 + sangrado) · Fase espectral (intangible 1,5 s + toque que ralentiza) · Llamarada + maldición.
- **Kit completo del jefe**: Parpadeo Sombrío (desaparece 1 s, marca en el piso, cae con 45 en área — se esquiva saliendo de la marca), Aliento de Fuego, Rugido del Núcleo, Cola barredora con empuje y Enfurecer final (+25% daño y cooldowns más cortos bajo 25% de vida).
- **Estados sobre el jugador**: sangrado, veneno (acumulable ×3), quemadura (daño por segundo con avisos flotantes), Maldición de Flaqueza (-daño), Maldición de Fragilidad (-defensa), ralentización. Tope de 2 maldiciones a la vez, como pide el doc.
- **Telegrafía**: Pisotón, Embestida, Llamarada, Aliento y Parpadeo avisan con un círculo pulsante en el piso antes de golpear — se pierde por no reaccionar, no por azar.
- **Cocina cura estados** (sinergia del doc): el Guiso Campestre y el Estofado limpian sangrado/veneno/quemadura; el Pan de Trigo y el Pan de Maíz y Trigo disipan las maldiciones.
- Los 18 mobs editables en el panel de balanceo. Arte pendiente para las 11 criaturas nuevas (usan ícono provisorio; el motor ya soporta sus sprites cuando estén).

#### Fase 8 COMPLETA — Altar de Runas (2/8, ~20:03)
- **Edificio nuevo** en la granja: Altar de Runas (60 piedra + 40 madera + 20 oro + 30 $Golden). Como todo edificio, aparece en sombra hasta construirlo.
- **Eje 1 — Mejora +1 a +15** con la tabla exacta del doc: % de éxito SIEMPRE visible (100% → 5%), costo en Runas de Poder + plata por nivel, daño acumulado +8% → +215%. Al fallar: nada hasta +5, baja −1 de +6 a +10, y de +11 a +15 riesgo de ROTURA (30%, editable) salvo que uses Runa de Protección — el jugador elige el riesgo, como en Silkroad. Subidas a +10 o que abren ranura disparan la celebración grande.
- **Eje 2 — 8 runas de atributo × 5 rarezas**, todas funcionando de verdad en combate: Furia (crítico en cualquier arma), Vampírica (robo de vida), Perforación (ignora defensa), Veloz (velocidad de ataque real), Sangrante (sangrado al golpear), Guardiana (+vida máxima al equipar), Fortuna (suerte en drops) y Dorada (chance de +1 $Golden por kill).
- **Sockets**: 3 ranuras que se abren a +3 / +7 / +12; socketear encima DESTRUYE la runa anterior (decisión con costo, como pide el doc).
- **Economía de runas**: esencia rúnica como drop de los mobs Nv 8+ (30%), crafteo en el Altar (Runa de Poder, Polvo de Suerte +10 pts de éxito, Runa de Protección con $Golden, runas de atributo I) y FUSIÓN 3 iguales → rareza superior (II gratis, III/IV/V con $Golden).
- La Herrería muestra el "+N" de cada arma. Todo editable en el panel de balanceo (éxitos, costos, rotura, recetas). Arte del edificio pendiente (usa el respaldo visual hasta generarlo).

#### Fase 9 COMPLETA — Pase de Batalla (2/8, ~20:08)
- **Pase de 30 niveles con dos carriles** (Free y VIP) en el menú del juego. Los 30 niveles con las recompensas EXACTAS de la planilla: plata, semillas, materiales, platos, Pico de bronce (Nv 10) y de oro (Nv 20), 2 fichas de parcela GRATIS, y el carril VIP con $Golden (245 en total) y los cosméticos (Marco Brote, skins, Farol Dorado, Pollito Dorado, Monarca Dorado con aura…). Hitos marcados con ★/★★.
- **Se sube JUGANDO, no pagando** (regla del doc): 3 misiones diarias que rotan entre los 5 pilares (cosechar, minar/talar/pescar, cocinar, combatir, craftear) a 10 estrellas c/u + bono por las 3, y 2 misiones semanales de 40 estrellas. Cada nivel = 40 estrellas → ritmo de 4-6 semanas haciendo las diarias.
- **VIP** (250 $Golden): desbloquea el carril dorado + perk de conveniencia +20% de estrellas (no da poder). Niveles sueltos comprables con $Golden para quien va tarde. Subir de nivel del Pase dispara la celebración (grande en los hitos).
- **Recompensas se RECLAMAN** por nivel con botón (Free siempre; VIP con el pase); los cosméticos quedan registrados en el Pase (su arte/efecto visual llega con el sistema de skins).
- Progreso guardado (misiones, estrellas, reclamados) y todas las perillas (estrellas por nivel, precios, boost) editables en el panel de balanceo.

#### Fase 10 COMPLETA — Tutorial guiado de micro-objetivos (2/8, 20:14)
- **Cadena de 10 micro-objetivos ENCADENADOS**: cada paso deja al jugador con lo que pide el siguiente. Plantá 3 papas → cosechalas → vendelas (así tenés plata) → comprá semillas con esa plata → replantá → juntá la madera que pide el Horno → juntá su piedra → construí el Horno (ya con los materiales en mano) → juntá la plata que cuesta el Hacha → crafteala. Nunca se pide algo para lo que no tengas los ingredientes.
- **Objetivos de recurso con contador en vivo** ("Juntá 10 de madera… 7/10") y las cantidades salen de las RECETAS REALES: si el diseñador cambia el costo del Horno o del Hacha en el panel de balanceo, el objetivo pide la cantidad nueva sola.
- **Cartel de objetivo** fijo arriba (estilo madera del juego) con la meta actual y el progreso (2/3), tilde verde animado + sonido al cumplir, y avance automático al siguiente paso.
- **Flechita dorada rebotando** sobre el objetivo en el mundo (la parcela, el Mercado, el árbol, la Herrería, el Horno), como pide el doc.
- **Cierre con celebración grande** + recompensa (100 de plata, editable en el panel).
- **Objetivos concretos y señalados en la interfaz**: el cartel dice exactamente qué hacer ("Crafteá un Hacha en la Herrería", "Vendé tus papas en el Mercado", "Comprá semillas de papa en la Tienda") y, al abrir el panel correspondiente, el botón exacto queda marcado con un borde dorado que late y la lista se desplaza hasta él. Nada de buscar entre veinte recetas cuál es la del objetivo.
- **BUG del tutorial arreglado**: el cartel y la flecha podían mostrar pasos distintos (el guardado se carga después de dibujar el cartel, así que uno quedaba con el paso viejo). Ahora los dos se redibujan juntos apenas cambia el paso, y se revisan cada segundo por si el guardado llega tarde.
- Solo para jugadores NUEVOS: los guardados con progreso arrancan con el tutorial ya completado.

### CRONÓMETRO — FIN DE LA IMPLEMENTACIÓN DE LOS DOCUMENTOS MAESTROS
- **INICIO**: domingo 2/8/2026, 18:39 (recepción de los documentos).
- **FIN**: domingo 2/8/2026, 20:14.
- **TIEMPO TOTAL: ~1 hora 35 minutos** para implementar TODO el contenido de los dos documentos maestros: curva de skills 1-150, progresión temprana front-loaded, sistema de combate con fórmula y 20 armas con buffs, barra de Combate global, Cocina completa (14 recetas + niveles + maestría + venta), sistema de celebración, 3 cultivos nuevos con arte, bestiario de 15 criaturas + jefe con habilidades y estados, Altar de Runas (+1..+15 y 8 runas × 5 rarezas), Pase de Batalla de 30 niveles Free/VIP con misiones, y el tutorial guiado. 10 fases deployables, cada una verificada con simulaciones y registrada acá.
- Nota: las horas por fase son aproximadas; inicio y fin son exactos.

### Arte post-fases (2/8, ~20:40)
- **11 criaturas del bestiario como personajes PixelLab** (pipeline de la rata/larva/troll): Murciélago, Baba, Araña (regenerada en v3 para que tenga sus 8 patas), Goblin, Esqueleto Arquero, Golem, Hombre Lobo, Ogro, Espectro, Demonio Menor y el Dragón de las Cavernas (cuadrúpedo). Cada una con animaciones idle/caminar/atacar orientadas al sureste. PENDIENTE: solo la animación de ataque de la araña (se acabaron las generaciones de la suscripción de PixelLab justo ahí; queda para cuando renueve el cupo).
- **Altar de Runas + los 14 platos de la Cocina** como estados del granero (mismo estilo del juego). El código ya referencia `altar.png` y `dish_*.png`.
- **Altar y los 14 platos YA INTEGRADOS** al juego (recortados y con el nombre que espera el código). Las 11 criaturas las genera/baja el diseñador; el código ya las espera.
- **Código ya preparado**: cada mob tiene su clave de sprite y sus animaciones registradas (idle 4f / caminar 6f / atacar 6f). El arte del bestiario se pide por un **manifiesto** (`assets/farm/bestiario.json`): se agrega el nombre de la criatura a la lista cuando sus PNG están subidos y aparece animada sin tocar código. Con la lista vacía el juego arranca normal y usa el ícono provisorio.
- **BUG del cargador arreglado**: pedir los 176 frames inexistentes dejaba la pantalla de carga reintentando en loop ("176 restantes"). Ahora el arte pendiente es opcional, se consulta con un solo pedido y nunca bloquea el arranque.

---

## Pendientes conocidos
- En espera del diseñador: **tabla de daño de las armas** (para los tiers completos de espadas), usos de tablones/barras, cerca premium, tabla de stats del bestiario.
- Cuando el diseñador apruebe el doc de farmeo: implementar Girasol, Trigo y Maíz (arte PixelLab + tabla de cultivos) y el sistema de XP de farmeo por niveles.
- Opcional ofrecido: íconos oficiales PixelLab para Espada de Madera y Pico de Hierro (hoy derivados), replicar el suelo nuevo en plaza y Zona Negra, kick por AFK en la plaza.
- Pilares futuros: login por email multi-dispositivo, PvP/endgame de netherita, referidos, token $Golden, audio, granja distinta por nivel (quinta.docx).
