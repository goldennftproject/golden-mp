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
- **Arranque rápido acotado al starter pack** (doc §3.1): las 3 semillas de papa con las que nace el jugador crecen en 45 s; de la 4ª en adelante (comprada o conseguida de otra forma) rige el tiempo normal del cultivo — 9 min en la papa. Antes el criterio era "hasta la primera cosecha", que según el orden dejaba semillas compradas creciendo rápido o starters lentas.
- **BUG del arranque rápido arreglado**: estaba clavado en 45 s aunque el cultivo estuviera configurado más rápido en el panel (una papa puesta en 10 s tardaba 45 s la primera vez). Ahora el tope nunca alarga: si el cultivo dura menos, manda el cultivo. Tope y cantidad de semillas de arranque editables en el panel (0 = sin excepción).
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

### Cocina: se cierra la "impresora de plata" (3/8, reporte del diseñador)
- **El problema**: la Papa Asada tenía precio FIJO de la planilla (5 plata) mientras la papa cruda valía 3 → cada papa cocinada regalaba +2 sin costo. Y al revés, con los precios del doc de farmeo (papa 21) el mismo plato se vendía a 5, o sea cocinar daba pérdida. Las dos planillas del diseñador (cultivos y cocina) estaban hechas con economías distintas.
- **Leña en las 14 recetas** (como ya regía antes): 1 madera las simples, 2 las medias, 3 las grandes. Cocinar ahora consume un recurso limitado por los enfriamientos de los árboles.
- **Precio de venta calculado sobre los ingredientes**: precio = valor de lo que lleva × 1,25 (+25% por cocinar), y encima la maestría del cocinero (hasta +50%). Así el margen es siempre razonable **sin importar qué precios les ponga el diseñador a los cultivos** — no se puede volver a romper.
- Todo editable en el panel: se puede volver a los precios fijos de la planilla (`Precio de venta de los platos = 0`) y ajustar el margen del cocinero.
- **Cocción en minutos y varias ollas** (decisión del diseñador, 3/8): los platos pasaron de segundos a **3 a 10 minutos** según la receta (Papa Asada 3 min … Banquete del Bosque 10 min), y la Cocina cocina **3 platos a la vez** en ollas paralelas, cada una con su barra y su tiempo restante. El botón Cocinar se bloquea solo cuando las 3 ollas están ocupadas. Cantidad de ollas y tiempo de cada receta editables en el panel; los guardados con una cocción en curso se migran solos.
- **BUG: la ventana de la Cocina salía vacía** (reportado por el diseñador). Al calcular el precio de los platos que llevan pescado se usaba una tabla de precios que no existía; el error cortaba el dibujado de TODA la lista de recetas. Se agregó la tabla de valor de los peces y, además, cada receta se dibuja de forma aislada: si una fallara, el resto de la lista sigue apareciendo. Actualizado también el texto de la ventana (minutos y ollas en paralelo).

### Guía de objetivos ampliada a 34 pasos (3/8)
- La cadena guiada dejó de ser solo el arranque: ahora **recorre TODO el juego** para que el jugador descubra cada sistema jugando, no leyendo.
- **Etapa 1 (1-10)** — el loop básico: plantar, cosechar, vender, comprar semillas, replantar, juntar los materiales del Horno, construirlo y craftear el Hacha.
- **Etapa 2 (11-25)** — los sistemas nuevos: materiales y construcción de la **Cocina**, cocinar y comer un plato (buff), juntar la plata para abrir la **forja de Armas**, forjar y equipar tu primera arma, cruzar el **portal a la Zona Negra**, vencer tu primera criatura y después 5 más, **pescar**, construir el **Altar de Runas** y mejorar un arma a +1.
- **Etapa 3 (26-34)** — lo que quedaba por descubrir: fundir una barra en el **Horno**, craftear un **Pico de Bronce** y minar un mineral, entrenar en el **dummy**, desbloquear otro árbol/piedra, craftear y colocar un **cofre depósito**, ampliar la **bolsa**, reclamar una recompensa del **Pase de Batalla** y **socketear una runa**.
- **Cada objetivo cumplido paga plata** (25 a 150 según dificultad; 1.210 en total + 100 al terminar), así avanzar la guía también financia el arranque.
- Los pasos siguen encadenados y con cantidades tomadas de las recetas reales; el cartel resalta el botón exacto en cada panel y la flecha apunta al edificio, nodo, mineral o portal correspondiente.
- Los guardados con progreso saltan solos los pasos ya cumplidos (se detecta por el estado real: edificios construidos, armas forjadas, runas puestas, etc.).

### Detallitos del diseñador (3/8)
1. **Auto-ataque sin spam**: re-clickear con el botón derecho sobre el MISMO objetivo ya no reinicia la cadencia; solo un objetivo nuevo golpea al instante.
2. **Recetas de la Cocina deslizables**: la lista ahora scrollea como la de la Herrería.
3. **Las 20 armas se distinguen a simple vista**: sprites propios por tipo y rareza (madera, piedra, bronce, oro, diamante) derivados del arte base con paletas de material — se ven en la Herrería, el equipo, la bolsa y en la mano al pelear.
4. **Pase de Batalla legible**: el texto del carril VIP pasó de dorado claro (ilegible sobre el panel) a dorado oscuro, y el Free a verde.
5. **Misión del tutorial que no avanzaba**: los guardados con la cadena vieja quedaban con los pasos corridos (mostraba un objetivo y contaba otro). Se agregó versión de cadena y migración: si el guardado es viejo se recalcula el paso, y quien ya construyó el Horno queda con el tutorial completado.
6. **Clic en un arma de la bolsa la tiraba a la basura**: ahora la EQUIPA (y al volver a clickearla, la guarda). Para tirarla sigue estando la papelera.
7. **Zona Negra**: el daño que te hace el mob aparece flotando en rojo sobre el granjero y se agregó su barra de vida arriba de la cabeza.
8. **Crafteo ×5 en todo**: picos, barras del Horno, flechas, materiales del Altar y runas suman el botón ×5 (ya lo tenían hacha y caña). El lote corta solo cuando se acaban los materiales.
9. **"Ya tenés los materiales" mentiroso**: era el mismo desfasaje del punto 5; con la migración el objetivo vuelve a decir la verdad.
10. **Misiones del Pase**: cada misión (diaria y semanal) muestra su recompensa en estrellas y avisa "CUMPLIDA (+N estrellas cobradas)". Verificado que la semanal acredita sus 40 estrellas.
11. **Menú**: la entrada "Mercado" pasó a llamarse **Tienda**, que es la ventana que abre (con sus pestañas Comprar / Vender).

## 2das mejoras — documentos del 4/8

### Fase 1 — Economía y ajustes rápidos (4/8)
- **Tabla oficial de cultivos (1-10)**: vuelve la escala del changelog (Papa 1/3 … Brócoli 90/210) y se suman los tres nuevos con el mismo criterio: Girasol 180/420, Trigo 360/840, Maíz 720/1.680. Tiempos 9 min → 24 h y XP por cosecha = minutos de crecimiento. Ganancia por hora pareja de 12-13 en los tiers bajos y creciente en los altos (15 → 40), como pide el documento. **Reemplaza la tabla del doc de farmeo v5** (papa 20/21), que el propio documento identifica como el problema.
- **Cupo diario de semillas que escala**: 18 + 2 × nivel de granja (20 en nivel 1, 38 en el 10, 58 en el 20) en vez del 30 fijo. Base y escalón editables.
- **Mobs más duros**: multiplicadores globales de daño (×1,3) y defensa (×1,5) sobre el bestiario, editables en el panel para seguir afinando.
- **La vida se regenera sola en la granja** (1 por segundo, editable) y NO en la Zona Negra, donde sigue dependiendo de la comida.
- **Granjero más lento en la Zona Negra** (75% de su velocidad normal, editable).
- **Talar y minar en 3 clics**: cada clic es un golpe con su animación y su feedback ("¡Golpe 2/3!"); al tercero cae el recurso. El árbol muestra sus cortes intermedios y la roca su estado dañado. Cantidad de golpes editable por separado para árboles y minerales.
- **Ranking con Top skill**: pestaña nueva que ordena por la skill más alta de cada jugador y muestra cuál es (por ejemplo "Minería 24").

### Fase 2 — Estamina de la Zona Negra (4/8)
- **Barra de estamina de combate**, aparte de la vida y **solo en la Zona Negra**: la granja se sigue jugando relajada. Aparece en el HUD (celeste) al entrar al bosque y desaparece al volver.
- **Máximo 100 a nivel 1 de Combate, +2 por nivel, tope 250** (nivel 40 = 178, tope a partir del 76).
- **Costo por criatura** según la tabla del doc: Rata/Murciélago/Larva 4 · Baba/Araña/Goblin/Orco/Lancero 6 · Esqueleto/Golem/Lobo/Guerrero 8 · Trol/Ogro 10 · Espectro/Demonio 12 · **Dragón 20**. Con la barra llena entran 25 ratas, 10 troles o 5 dragones. Se cobra una vez por criatura, al primer golpe.
- **Regeneración**: 1 punto cada 3 minutos (de 0 a 100 en ~5 h), también mientras estás desconectado.
- **La comida devuelve estamina** (nuevo uso para la Cocina): Guiso Campestre +20, Estofado de la Cosecha +25, Banquete del Bosque +40, y los clásicos +15/+30.
- **Recarga premium con tope**: clic en la barra → recarga completa por 5 $Golden, **máximo 3 por día**. Es conveniencia, no ventaja: sin el tope sería "pagá y farmeá infinito".
- Sin estamina el aviso explica cómo recuperarla y el combate simplemente no avanza (no te mata ni te expulsa).
- Todo editable en el panel: máximo, escalón por nivel, tope, ritmo de regeneración, precio y cupo de recargas, y el costo de cada una de las 18 criaturas por separado.

### Fase 3 — Niveles de granja 1 a 50 (4/8)
- **La granja llega a nivel 50** (antes 10). Del 1 al 10 se sube solo con XP de cosecha, como hasta ahora; **del 11 al 50 hace falta la XP Y cumplir las tareas del nivel**, que es lo que obliga a tocar todos los pilares del juego.
- **40 niveles con sus tareas**, tomadas del documento: plantar cultivos concretos, talar madera, minar bronce/hierro/oro/diamante/netherita, vencer criaturas específicas (de Ratas a Dragones), pescar y cocinar. Escalan por contenido a medida que subís.
- **Las tareas se cuentan desde que llegás al nivel**: lo que hiciste antes no arrastra, así cada nivel pide trabajo nuevo.
- **El Granero se rehízo**: muestra el nivel actual sobre 50, la barra de XP hacia el siguiente, la lista de tareas con su progreso individual (20/30 ✓) y cuál es la recompensa del próximo nivel.
- **Recompensas aplicadas**: parcelas 7ª a 12ª (niveles 12, 18, 25, 35, 45 y 50), capacidad extra de cofre (+10, +10, +15), edificios de nivel 2 (Horno 17, Cocina 21, Altar 27) y los cosméticos —títulos, decoraciones, marcos, emotes, skins y auras— que quedan registrados en la cuenta.
- Contadores de tareas guardados con la partida y XP de cada nivel editable en el panel de balanceo. El prestigio ahora pide nivel 50.

### Fase 4 — El Establo: animales y felicidad (4/8)
- **Edificio Establo** (50 madera + 30 piedra + 10 oro, se desbloquea a granja nivel 6) y **Curtiduría** (45 madera + 35 piedra + 15 oro, nivel 8) ya colocados en la granja, con su sombra y su receta como el resto de los edificios.
- **4 animales comprables con $Golden**: Alpaca 40 (Fibra), Conejo 40 (Pelaje), Toro 60 (Cuero) y Jabalí 100 (Colmillo). El $Golden solo abre la puerta: el material se GANA cuidándolos.
- **Alimentar y felicidad**: cada animal come su cultivo preferido (+15 de felicidad) y pierde 1,5 por hora si lo descuidás. La felicidad manda el rendimiento: al 100% produce el ciclo completo, al 0% la mitad.
- **Producción por ciclos**, también offline: Alpaca y Conejo 2 cada 12 h, Toro 2 cada 16 h, Jabalí 1 cada 20 h. En paralelo, los 4 sets completos salen en ~180 h, como calcula el documento.
- **Panel del Establo** con la barra de felicidad de cada animal, cuánto falta para su próxima producción, cuánto rendiría con su felicidad actual y los botones de alimentar y recoger.
- **Nuevo sink de cultivos**: la cosecha ahora sirve para vender, subir la granja Y alimentar animales.
- Precios, ciclos, cantidades y la mecánica de felicidad quedaron editables en el panel de balanceo.
- **Ubicación corregida** (aviso del 4/8): el Establo había quedado encima de las parcelas de cultivo. Ahora Establo y Curtiduría están en un hueco libre verificado, juntos y sin pisar parcelas, laguna, otros edificios ni la cerca. Se agregó además un chequeo automático de layout que avisa por consola si un objeto nuevo se superpone con algo.
- Arte de los dos edificios y de los materiales: pendiente (usan el respaldo visual hasta generarlo).

### Fase 5 — La Curtiduría y las 20 piezas de armadura (4/8)
- **Las 4 armaduras completas** con las recetas exactas del documento: Fibra (15 de defensa), Piel (18), Cuero (25) y Colmillo (38, la única que pide hierro). Cada set son 5 piezas — yelmo, pecho, pantalones, botas y guantes — con su costo y su defensa individual, verificados contra la planilla.
- **Piezas sueltas y set completo**: cada pieza suma su defensa; completar las 5 activa el bono de identidad, que ya funciona en las fórmulas del juego: Fibra +15% velocidad de ataque y evasión · Piel +2 HP/s y +12% de velocidad de farmeo · Cuero **+40 de vida máxima** y +8% de defensa · Colmillo +20% de defensa y +10% de daño con −5% de velocidad.
- **La defensa de la armadura entra en el combate real** (se suma a la fórmula de daño recibido, junto con las piezas viejas de loot) y el set de Cuero sube la vida máxima de verdad.
- **Panel de la Curtiduría** con los 4 sets, sus piezas, el costo de cada una, cuáles ya tenés, el bono del set y el botón para ponerte una armadura u otra.
- Todas las recetas y defensas quedaron editables en el panel de balanceo, pieza por pieza.

### Fase 6 — Cofre de login neutral de 7 días (4/8)
- **El cofre dejó de repartir progreso**. Antes daba semillas, minerales y plata (justo lo que el documento marca como prohibido). Ahora reparte solo cosas laterales: cosméticos **soulbound** (no vendibles) y consumibles de un uso.
- **El ciclo del doc**: día 1 decoración · día 2 Bendición del Granjero (+5% de velocidad de farmeo por 1 hora) · día 3 dos platos ya cocinados · día 4 emote o marco · día 5 carnada ×5 · día 6 cosmético sorpresa · **día 7 el coleccionable de la semana**.
- **Coleccionable rotativo**: 6 piezas exclusivas que van cambiando semana a semana (Espantapájaros dorado, Sombrero brillante, la gallina "Pinta", Farolito de luciérnagas, Camino de pétalos, título "Madrugador"). Como cambia y no vuelve, invita a entrar los 7 días sin regalar nada de poder.
- **Racha gentil** (recomendación del doc para un juego cozy): si faltás un día no perdés nada, seguís donde quedaste. Se quitó el castigo y el pago de esencia para recuperar la racha.
- Verificado que el cofre **no toca plata, $Golden, semillas ni recursos** (salvo la carnada, que es el consumible menor previsto) ni da estrellas del pase.

### Fase 7 — El Altar de Ofrendas (4/8)
- **Edificio nuevo** (80 piedra + 60 madera + 25 oro, granja nivel 10) donde se **queman** recursos para siempre a cambio de **Puntos de Ofrenda**. Ubicación verificada con el chequeo de layout: no pisa nada.
- **Tabla de puntos del documento**: Madera y Piedra 1 · Bronce 3 · Hierro 5 · Oro 10 · Diamante 30 · **Netherita 120** · y los cultivos de 1 (Papa) a 80 (Maíz). Todo editable en el panel.
- **Sumidero real**: lo entregado desaparece del juego (no vuelve al mercado), así que combate la inflación y le da otro destino al farmeo.
- **Regla sana, implementada tal cual**: el pozo del airdrop es FIJO y se reparte proporcionalmente (tus puntos ÷ puntos totales). Entregar más no crea más token, solo afina el reparto. Verificado con el ejemplo del documento: 50.000 puntos sobre 8.000.000 = 0,625% = 6.250 tokens.
- **Nada de promesas**: la ventana aclara que el airdrop es posible y discrecional, sin valor garantizado por recurso, y cada entrega pide confirmación porque es irreversible.

### Fase 8 — Incursiones (combate de un clic) + entrenamiento offline (4/8)
- **Las Incursiones del documento**, sin tocar el combate jugado: al usar el portal, el juego pregunta si entrás a pelear o mandás una incursión de un clic.
- **4 zonas con duración real**: Zona Negra I (10 min), II (20 min), III (30 min) y la Guarida (45 min). Corren como las ollas de la Cocina, también con el juego cerrado. **Al Dragón hay que ir en persona**: no se puede por incursión.
- **El resultado sale de los stats reales**: se calcula tu poder (arma + skill + mejora del Altar + buffs), cuántos golpes entran en el tiempo y la vida y defensa media de la zona; el botín usa las mismas tablas de loot del bestiario. Rinde el **70%** de lo que rendiría peleando a mano — el que juega, gana más.
- **Riesgo por poder**: si vas por debajo del recomendado volvés herido y con menos botín; si vas muy por debajo, la incursión fracasa. La ventana avisa antes con "estás listo / vas justo / te van a superar".
- **Cuesta lo mismo que pelear**: gasta durabilidad del arma y estamina, y si la estamina se acaba a mitad de camino, la incursión rinde proporcionalmente menos. Tope de 3 incursiones por día.
- **Entrenamiento offline del dummy** (detallito 9): podés dejar al granjero entrenando y al volver cobrás la XP del tiempo transcurrido (60 XP por hora, tope 8 h). Sigue existiendo el golpe directo con su recompensa y sus 4 h de descanso.
- Duraciones, poder recomendado, rendimiento, cupo diario y los valores del entrenamiento quedaron editables en el panel.

### Fase 9 — Granja de un clic, cámara tipo SFL e isla (4/8)
Los tres cambios son estructurales y quedaron detrás de **interruptores independientes** (`GF.NO_WALK`, `GF.CAM_PAN`, `GF.ISLA`), así se pueden apagar uno por uno si al diseñador no le convence alguno.

- **Granja sin caminar** (detallito 4): el granjero ya no aparece en la granja — todo se hace con un clic sobre la cosa que querés usar, sin esperar a que llegue. El cartel de interacción ahora describe **lo que hay bajo el cursor** y la tecla E actúa sobre eso mismo. El granjero sigue existiendo y se ve en la Zona Negra, que es donde importa moverse.
- **Cámara tipo SFL** (detallito 5): la cámara dejó de seguir al personaje y de hacer zoom con la rueda. Ahora la granja se **arrastra con el mouse** y la rueda la **desplaza**, con el zoom fijo.
- **La finca sobre el mar** (detallito 6): fondo de océano alrededor de la granja, con bajío más claro, orilla de arena, borde de pasto y **olas animadas** que respiran sobre la costa. Todo dibujado por código, sin arte nuevo.

### Fase 10 — Mercado entre jugadores (P2P) (4/8)
- **Pestaña nueva en el menú**: Comprar · Vender · Mis publicaciones. Se puede publicar casi todo lo que se tiene: cultivos, minerales, materiales de animales, semillas, platos, peces y **armas** (viajan con su durabilidad, su "+N" y sus runas).
- **Cómo funciona el cobro**: al publicar, el ítem sale de tu bolsa; cuando alguien te lo compra, la plata te espera en "Mis publicaciones" y la retirás cuando volvés. Si nadie lo compró, podés retirar la publicación y recuperás el ítem.
- **Comisión del 5% que se quema**: sumidero sano para la economía (editable en el panel, igual que el tope de 10 publicaciones activas por jugador).
- **Compra atómica**: la reserva se hace con una actualización condicional en la base, así dos jugadores no pueden llevarse lo mismo — al que llega segundo le avisa "se lo llevaron primero".
- **Seguridad**: se agregó `sql/market.sql` con la tabla y las reglas RLS de Supabase para que nadie pueda tocar publicaciones ajenas, publicar a nombre de otro ni cobrar ventas que no son suyas. **Hay que correr ese SQL en Supabase una vez** para que el mercado funcione.

### Enfriamientos chill de árboles y minerales (4/8, doc del diseñador)
- **Filosofía del documento aplicada**: enfriamientos LARGOS estilo Sunflower Land, pero con las primeras recolecciones de cada nodo en pocos minutos para el enganche — la misma idea de la primera papa.
- **Arranque rápido por nodo**: Árbol 3 min (las primeras 3) · Piedra 4 min (3) · Bronce 6 min (2) · Hierro 8 min (2) · Oro y Diamante 12 min (1) · Netherita 15 min (1). Se cuenta **por nodo**, así que cada árbol o veta nueva que desbloqueás estrena su propio arranque rápido.
- **Enfriamiento chill después**: Árbol 1 h 30 min · Piedra 2 h · Bronce 8 h · Hierro 12 h · **Oro, Diamante y Netherita 14 h**, que comparten tiempo a propósito para que la minería del endgame sea una sola expedición con propósito.
- **Reemplaza el "netherita cada 4 h"** del changelog viejo: ahora su rareza viene del combo pico + PvP + enfriamiento.
- **Etapa intermedia a la mitad del enfriamiento** también para rocas y minerales (antes solo el árbol): de un vistazo se ve cuánto falta.
- Los tiempos rápidos, cuántas veces duran y los enfriamientos largos quedaron editables en el panel. Se corrigió además que el Hierro no aparecía en la lista de minerales del panel de balanceo.

### Edificios nivel 2 con efecto real (4/8)
Los niveles de granja 17, 21 y 27 desbloqueaban "edificio nivel 2" pero no hacían nada. Ahora sí:

- **Horno nivel 2** (granja 17): funde las barras **40% más rápido**.
- **Cocina nivel 2** (granja 21): las cocciones tardan **30% menos** y suma **una olla** (de 3 a 4 platos a la vez).
- **Altar de Runas nivel 2** (granja 27): **+5 puntos de éxito** en cada intento de mejora de arma.
- Cada panel avisa cuando la mejora está activa, y los tres valores son editables en el panel de balanceo.

### Cosméticos visibles y atlas de sprites rearmado (4/8)
**Cosméticos que ya se lucen** (los que no necesitan arte nuevo):

- **Ventana de Cosméticos** en el menú, con vista previa de cómo te ven los demás.
- **Títulos** ganados en los niveles de granja (Granjero Experto, Veterano, Amo de la Granja, Leyenda de la Granja Dorada…), que aparecen delante del nombre en el ranking, el chat, la plaza y el mercado de jugadores.
- **Color de nombre** (oro, verde, celeste, violeta) y **marcos de perfil**, que se desbloquean con los niveles y el cofre.
- **Aura dorada** del granjero (nivel 30+): resplandor aditivo que late a sus pies, visible en la Zona Negra y en la plaza. Todo por código, sin arte.
- Lo elegido se guarda con la partida; el resto de los cosméticos ganados se listan en la misma ventana.

**Atlas de sprites rearmado**:

- El atlas era del 30 de julio y tenía 120 sprites: todo lo agregado desde entonces (cultivos nuevos, 14 platos, 20 armas por rareza, el Altar…) se bajaba como archivos sueltos, y por eso la pantalla de carga tardaba tanto en el server gratuito.
- Nuevo atlas con **329 sprites en un solo archivo de 386 KB** (con paleta optimizada: un tercio del peso sin diferencia visible). Pasa de decenas de pedidos al servidor a uno solo.

### Arreglo: no se podía salir del corral ni ver el mar (4/8)
- **Los límites de la cámara se pisaban**: el bloque de la isla los ampliaba, pero unas líneas más abajo el código los volvía a fijar al tamaño exacto de la granja. Por eso el arrastre se frenaba en la cerca y el mar quedaba fuera de alcance.
- **El zoom obligaba a que la granja llenara la pantalla**, así que no quedaba margen para desplazarse. En modo SFL ahora el zoom se calcula sobre la isla + su mar, dejando siempre margen para arrastrar en los dos ejes (probado en 1200×700, 1536×864, 1920×1080 y en pantalla de teléfono).
- El arrastre y la rueda ahora respetan esos límites nuevos en vez de los de la granja pelada.
- **Ctrl o Shift + rueda** acercan y alejan, por si querés ver la isla entera o trabajar de cerca. La rueda sola sigue desplazando.
- El mar se dibuja lo suficientemente grande como para tapar todo lo que la cámara pueda mostrar, sin bordes vacíos.
- **WASD y las flechas** ya no mueven al granjero invisible en la granja.

### Arreglo: la parcela regalada no aparecía hasta apretar F5 (4/8, reporte del diseñador)
- Al subir de nivel de granja (o al reclamar una ficha del Pase), la parcela se sumaba al guardado pero **el dibujo seguía en gris** hasta recargar la página.
- Ahora hay un único camino para abrir parcelas —comprada con plata o regalada— que actualiza el tablero en el acto, con **destello y chispas doradas** sobre la parcela nueva para que se note.
- Verificado: subir del nivel 1 al 10 abre las 6 parcelas al instante, y la ficha de parcela del Pase también.

### Arreglo: cuatro ventanas salían vacías (4/8, reporte del diseñador)
- La ventana de **Incursión** aparecía con el título y nada más. La causa: al escribir el código, cuatro funciones de dibujado nunca llegaron a guardarse en el archivo (se cortaron pasos por un error anterior). Afectaba a **Incursión, Altar de Ofrendas, Mercado de jugadores y Cosméticos** — todas las ventanas nuevas del último bloque.
- Las cuatro están escritas y funcionando.
- Se agregó un **chequeo automático** que recorre las 19 ventanas del juego y verifica que cada una tenga su función de dibujado y su contenedor en el HTML, más que no haya funciones referenciadas que no existan. Hoy da todo OK, y lo voy a correr antes de cada entrega para que no vuelva a pasar.

---

### Tanda de efectos: jugo, ambiente y UI (4/8)

Todo por código, sin arte nuevo, y cada efecto se apaga por separado desde el panel de balanceo
(categoría "Ambiente — efectos"). Hay un tope de partículas vivas a la vez para no castigar al móvil.

**El golpe se siente**

- El árbol o la piedra **se sacude hacia el lado contrario al hachazo** y vuelve con rebote, en cada
  uno de los 3 golpes. Antes solo cambiaba de imagen y los clics no se sentían como golpes.
- **Astillas de madera** (rectangulitos que giran y caen) o **esquirlas de piedra**, según el nodo.
- Mientras un nodo se sacude, el viento no lo toca: el golpe manda.

**Ambiente**

- **Nubes** que cruzan lento y proyectan una sombra suave desplazada sobre la granja.
- **Hojas volando** en el pico de cada ráfaga de viento: salen de las copas y cruzan la pantalla.
  Ahora la ráfaga se entiende, no solo se ve en el meneo de los árboles.
- **Mariposas** que revolotean y se posan sobre los cultivos listos; si cosechás ese cultivo, la
  mariposa se va sola a otro lado.
- **El humo del Horno se inclina con el viento** (usa la misma onda que mece los árboles).
- **Vapor de la Cocina** mientras hay ollas trabajando y **chispas violetas del Altar** cuando la
  mejora de nivel 2 está activa: los edificios cuentan su estado sin abrir la ventana.

**UI**

- **Fundido a negro** al entrar y salir de la Zona Negra y de la plaza, en vez del corte seco.
- **Las ventanas se abren con el mismo pop** que usa el crecimiento. Hay dos animaciones: una para
  la ventana centrada y otra para la que el jugador arrastró — si no, al abrirse una ventana movida
  saltaba de lugar.
- **Los números de plata y $Golden cuentan hacia arriba** en vez de saltar al valor final (solo si
  la diferencia se nota; para +1 no vale la pena).
- **El botón bloqueado se sacude** al apretarlo, en vez de no hacer nada.

Verificado: 782 entradas del panel de balanceo, 20 ventanas OK, sin funciones faltantes.

### Corral: los animales salen del Establo y caminan por la granja (4/8)

Hasta ahora los animales vivían **solo dentro de la ventana del Establo**: se compraban, se
alimentaban y se les cobraba el material desde una lista. No se veían en la granja porque no existe
el arte todavía.

**Se hicieron sprites provisorios sin PixelLab.** `tools/animales-provisorios.py` dibuja los cuatro
animales con pixel art escrito a mano en el propio script (un mapa de texto, una letra por píxel),
con la paleta cozy del juego y el contorno oscuro estándar. No son los definitivos y no pretenden
serlo: sirven para ver y probar la mecánica ahora. Cuando llegue el arte bueno se reemplazan los PNG
y **el código del juego no cambia**, porque usa las mismas claves `animal_<nombre>`.

**El corral**

- Va en un hueco **verificado libre** (columnas 5-8, filas 11-13): no pisa parcelas, ni la laguna,
  ni ningún edificio. Queda debajo del Establo y al lado de la laguna.
- Piso de tierra pisoteada y **cerca de madera dibujada por código** (postes con dos travesaños), en
  la paleta del juego.
- Solo aparecen los animales que el jugador **tiene**. Al comprar uno, aparece en el acto sin
  recargar.
- Caminan solos de un rincón a otro, se dan vuelta hacia donde van y cabecean al trotar.
- Cuando terminaron su ciclo, se les ve **el material flotando encima**.
- **Clic sobre el animal**: si produjo, se cobra ahí mismo con el premio volando; si todavía no,
  abre el Establo. El cartel bajo el cursor dice cuál de las dos cosas va a pasar y cuánto falta.

Atlas rehecho: 358 → 362 sprites, versión `?v=21`.

### MODO TESTEO: todo el juego en segundos (4/8)

Para que el diseñador pueda recorrer el juego entero sin esperar horas ni farmear, se agregó un
interruptor único en `config.js`:

```
GF.TESTEO = 1;    // 1 = tiempos de prueba · 0 = tiempos reales del diseñador
```

**Qué comprime**

| | Real | En testeo |
|---|---|---|
| Papa | 9 min | 9 s |
| Maíz (el cultivo más largo) | 24 h | 40 s |
| Árbol | 1 h 30 min | 40 s |
| Piedra | 2 h | 40 s |
| Veta de netherita | 14 h | 40 s |
| Guiso Campestre (Cocina) | 8 min | 8 s |
| Dummy de práctica | 4 h | 15 s |
| Ciclo de la alpaca (Establo) | 12 h | 40 s |
| Incursión Zona Negra I | 10 min | 1 min |
| 1 punto de estamina | 3 min | 2 s |

Además: sin cupo diario de semillas (999), sin tope de incursiones por día, 99 recargas de estamina
y el Pase de Batalla a 2 estrellas por nivel para poder ver los 30 niveles.

**Materiales de arranque.** La primera vez que se entra con el modo activo, la partida recibe
500.000 de plata, 5.000 $Golden, 500 de cada material, 200 de cada cultivo, 50 semillas de cada uno,
herramientas y picos al máximo, las 12 parcelas, todos los árboles y vetas desbloqueados y los 7
edificios construidos. **Se da una sola vez** (queda marcado en el guardado), así que recargar no
acumula.

**Lo importante: no toca la tabla del diseñador.** Los valores reales siguen guardados en Supabase.
El modo testeo solo cambia los números en memoria, y se aplica **únicamente en el juego** — nunca en
`balance.html`. Así el panel de balanceo sigue mostrando y guardando los valores reales, y no hay
forma de guardar sin querer los de prueba.

**Para la versión final**: poner `GF.TESTEO = 0` y deployar. Todo vuelve solo.

### Barrita de crecimiento en las parcelas, siempre visible (4/8, videos del diseñador)

Dos videos más de Sunflower Land, plantando y cosechando. Lo que muestran:

- **Cultivo creciendo**: no se ve la planta, se ve un brotecito, y encima una **barrita de progreso
  con el tiempo que falta escrito arriba** ("18m", "17m", "20h", "7d 13h"). Está **siempre a la
  vista**, sin pasar el cursor: con un campo de 40 parcelas se sabe de un vistazo cuál va primera.
- **Cultivo listo**: la barrita desaparece y lo que se ve es la planta entera. El contraste entre
  "barrita" y "planta" es lo que dice qué cosechar.

Nosotros teníamos el contador de la parcela **solo con el cursor encima**, igual que los árboles.
Con dos parcelas se aguanta; con doce, no.

**Qué se cambió**

- Las parcelas que están creciendo muestran ahora **barrita + tiempo restante, siempre**, sobre la
  parcela. Mismo estilo que el resto del juego: contorno oscuro, marco claro y relleno verde.
- Al estar lista, la barrita se va sola y queda la planta con su brillo dorado.
- Los árboles y las vetas **no** llevan barrita de enfriamiento: eso ya se había sacado a pedido del
  diseñador y se mantiene así.

**Un arreglo que salió de paso**: la barra necesita saber cuánto duraba el crecimiento total, y ese
dato se recalculaba mal al recargar la página (no tenía en cuenta el multiplicador de velocidad ni
el arranque rápido de las primeras semillas). Ahora se guarda con la partida. Eso también corrige un
bug viejo: tras un F5, el cambio a "media cosecha" saltaba en el momento equivocado.

Se puede apagar desde el panel ("Respuesta al clic" → barrita de crecimiento).

**Ajustes tras verlo en pantalla (4/8)**

- **Centrado**: la barrita se posicionaba con las coordenadas teóricas de la celda. Ahora se ancla al
  **sprite real de la tierra** (su centro y su borde de arriba), así queda centrada aunque la parcela
  se haya movido en el modo edición o el dibujo no llene la celda entera. Las coordenadas también se
  redondean a píxel entero, que en pixel art se nota.
- **Altura**: la barrita y el tiempo van **abajo de la planta**, apoyados sobre el borde inferior de
  la tierra pero por DENTRO de la celda (a 4 px del borde). Así no tapan el cultivo ni invaden la
  parcela de al lado, que era el problema con un campo lleno de parcelas. Queda un ajuste fino en el
  panel por si el arte de la tierra cambia.
- **Un solo estilo de barrita para todo el juego**: la de golpear árboles y vetas ahora usa el mismo
  dibujo que la de crecimiento (contorno oscuro + marco claro + relleno verde), en una sola función
  compartida. Antes eran dos dibujos distintos y se notaba.
- **Carteles de tiempo cortos**: el formato largo del juego ("58 min 52 s") no entra sobre una
  parcela de 42 px y los carteles de parcelas vecinas se pisaban entre sí, quedando ilegibles. Se
  agregó un formato corto solo para los carteles del mundo — "52s", "58m", "20h", "7d 12h" — igual
  que Sunflower Land: una sola unidad, y dos únicamente cuando hay días. El detalle fino ya lo
  cuenta la barrita. Los paneles y la Tienda siguen con el formato largo de siempre.

### El recurso que sale volando ahora SE VE (4/8)

El diseñador señaló que en el video de Sunflower Land, al talar el cactus, salen unos **troncos**
bien visibles, y que en nuestro juego el recurso salía muy chiquito. Revisando, era peor: **no salía
en absoluto**.

**La causa**: los iconos de recursos (`res_madera.png`, `res_piedra.png`, los cultivos, los peces,
las monedas) existían como archivos sueltos y se usaban solo en la interfaz HTML —la bolsa, la
tienda— pero **nunca se cargaban dentro del juego**. Así que el "premio" que sale volando dibujaba
el texto y el icono no, porque esa textura no existía para Phaser. Se veía un "+1" pelado.

**Qué se hizo**

- Se escribió `tools/build-atlas.py`, el armador del atlas, que hasta ahora no estaba en el
  repositorio (se hacía a mano cada vez). Documentado, con modo `--check` que solo informa.
- **Atlas rehecho: 329 → 358 sprites**, sumando los 15 iconos de recursos, los 10 de cultivos, los
  4 de peces y las 2 monedas. Pasó de 388 KB a 438 KB — 50 KB más por 29 sprites, y evita 29
  descargas sueltas. Versión subida a `?v=20`.
- El icono del premio ahora se dibuja a **tamaño fijo de 22 px** (era 18, +25% como pidió el
  diseñador) y el "+N" a 15 px. Los PNG originales vienen a ~106 px, así que antes dependía del
  tamaño del archivo; ahora es un número explícito y editable.
- Vale para todo lo que sale de una interacción: **talar, picar, minar y cosechar**.

Verificado recortando el atlas nuevo: la madera, la piedra, el oro, los cultivos y el granjero
salen enteros y con la transparencia intacta (la paleta optimizada necesita FASTOCTREE, que es el
único método de Pillow que no aplasta el canal alfa — con el método anterior el fondo se volvía
negro).

### Velocidad de talado al nivel de Sunflower Land (4/8, video del diseñador)

El diseñador mandó un video de Sunflower Land talando cactus. Lo medí **cuadro por cuadro** (30 fps)
para copiar el ritmo exacto en vez de estimarlo a ojo:

| Cuadro | Qué pasa |
|---|---|
| 18 | clic → el cactus se pone **blanco** un instante |
| 19 | aparece una **barrita de progreso** debajo del cactus |
| 22 | segundo destello (+133 ms) |
| 25 | tercer destello (+233 ms) |
| 26-27 | destellos + hojitas verdes saltando |
| 28 | **el cactus desaparece** (+333 ms) y el tronco sale volando en arco con su "+1.5" |
| 30 | cartel "Recovers in 1hr 20mins" |

Dos hallazgos que cambian el enfoque:

1. **De clic a recurso pasan 333 ms.** Nosotros estábamos en 1,26 s (y antes de ayer, en 2,7 s).
2. **El cactus NUNCA cambia de dibujo mientras lo talás.** No hay estados intermedios: solo late en
   blanco cada ~117 ms. Toda la sensación de "le estoy pegando" viene del destello, no del arte.

**Qué se cambió**

- **Cada golpe se bloquea 0,18 s** (antes 0,42 s). Clickeando seguido, un árbol cae en **540 ms** —
  el mismo ritmo que SFL, pero conservando los 3 golpes que pidió el diseñador.
- **Destello blanco** en cada golpe, 90 ms, exactamente como el del video. Se aplica al tronco y a
  la copa por separado (el árbol está partido en dos para el viento).
- **Barrita de progreso** bajo el nodo mientras lo golpeás, igual que SFL. Aparece con el primer
  golpe, se llena con cada uno y se va sola cuando el nodo cae o cuando se pierden los golpes.
- **El recurso sale volando en arco con su "+N"**, como el tronco del video, en vez del cartelito de
  aviso. Vale para madera, piedra, minerales y cosechas.
- Se sacaron los avisos de "¡Golpe 2/3!": el destello y la barra ya lo cuentan mejor.

Todo editable en el panel ("Respuesta al clic"): duración de cada acción, del destello, y si se
quiere la barrita y el premio volando.

**Segunda pasada: que ningún clic se pierda**

Primero probé con "mantener apretado para seguir golpeando", pero el diseñador corrigió: en
Sunflower Land se tala **a clics**, no manteniendo. Y tenía razón — mis propias mediciones lo
confirman: los destellos están cada **117 ms**, que es cadencia de dedo humano (~8 toques por
segundo), no un efecto continuo.

Eso cambia dónde está el problema. No es la duración de la acción: es que **los clics que llegaban
durante el candado se tiraban a la basura**. Tocabas rápido, y de cada tres toques contaba uno.

- El candado bajó a **0,08 s**.
- **El clic que llega durante el candado ya no se pierde**: se guarda uno y sale apenas se libera
  (ventana de 260 ms). Solo para el MISMO nodo, así que no es la cola vieja — aquella encolaba
  objetivos distintos y los marcaba con puntitos; esto es amortiguación de entrada, invisible.
- **Se quitó del todo el "mantener apretado para seguir golpeando"**: era una mecánica que el
  diseñador nunca pidió, y agregarla por nuestra cuenta cambiaba cómo se juega. Un clic = un golpe,
  siempre. Lo único que quedó es que el golpe no espera a que sueltes el botón (sale a los 110 ms si
  no estás arrastrando la vista), pero sale **una sola vez por pulsación**.

| Talando a clics (3 golpes) | |
|---|---|
| 6 clics/s (lento) | 333 ms |
| 8 clics/s (la cadencia del video) | **250 ms** |
| 10 clics/s (rápido) | 200 ms |
| 14 clics/s (machacando) | 160 ms |
| Sunflower Land, medido | 333 ms |
| Golden Farm antes de hoy | 2700 ms |

O sea: a la misma cadencia de dedo del video, nuestro árbol cae **más rápido** que el cactus de
Sunflower Land, y encima pasando por sus tres estados de talado.

### Se saca el retraso al interactuar (4/8, reporte del diseñador)

"Cuando le hago clic al árbol tarda unos milisegundos en reaccionar." Eran **tres causas sumadas**,
y ninguna era del server: todo pasaba en el propio código.

**1. El cambio de imagen esperaba a la mitad de la acción.** El árbol se agrietaba recién a los
450 ms del clic (la mitad de los 900 ms que duraba la acción). Ahora el impacto es configurable y
está en 0: el nodo se agrieta en el mismo frame.

**2. Las astillas y la sacudida salían AL FINAL.** Estaban enganchadas al cierre de la acción, o sea
a los 900 ms. Se movieron al momento del impacto: salen con el clic.

**3. Las acciones duraban casi un segundo.** Tenía sentido cuando el granjero se veía dar el hachazo;
sin granjero a la vista, esa duración no anima nada, solo es el candado entre un golpe y el
siguiente. Bajó de 0,9 s a 0,42 s (talar) y de 0,85 s a 0,40 s (picar).

Y una cuarta, más chica: la acción se resolvía **al soltar** el clic (para poder arrastrar la vista
sin talar sin querer). Ahora, si mantenés apretado sin mover, a los 170 ms sale igual — no hace
falta soltar.

| | Antes | Ahora |
|---|---|---|
| Clic → nodo agrietado | ~530 ms | ~96 ms |
| Clic → astillas y sacudida | ~980 ms | ~80 ms |
| Tumbar un árbol (3 golpes) | 2,70 s | 1,26 s |

Todo editable en el panel de balanceo, categoría "Respuesta al clic": la duración de cada acción,
en qué momento pega la herramienta y el tiempo del clic sostenido. Las duraciones se mudaron a
`config.js` para que el panel las alcance.

### Carga del juego: una sola pantalla y 12 segundos menos (4/8)

El diseñador reportó que al entrar por primera vez en el día se veía **primero la ventana del cofre
diario y después el juego**. Eran dos problemas distintos.

**1. La espera de 13 segundos que nadie pidió**

El cargador repite lo que no llegó, porque el server gratis de Render a veces corta pedidos sueltos.
Pero lo hacía **6 veces con esperas crecientes**, sin distinguir entre "no llegó" y "no existe".
Hoy faltan tres imágenes (Establo, Curtiduría y Altar de Ofrendas: el arte todavía no está hecho),
así que **cada carga del juego perdía ~12,9 segundos reintentando tres archivos inexistentes**.
Ahora se anota qué archivo falló de verdad y a la segunda se abandona: **1,1 segundos**.

Comprobado: de los 332 sprites que pide el juego, 329 salen del atlas en un solo archivo. Los
únicos tres sueltos son justo esos que faltan.

**2. Una sola pantalla de carga, y el juego aparece entero**

Antes había dos etapas: la pantalla HTML se iba en cuanto terminaba el login, y ahí el juego seguía
cargando sus imágenes con una barra propia de Phaser. En el medio se abría el cofre diario, encima
de una granja a medio armar.

- Ahora hay **una sola pantalla de carga**, con barra y texto de qué está haciendo ("Buscando tu
  cuenta…", "Aplicando ajustes…", "Cargando el arte…").
- **No se va hasta que la granja está dibujada de verdad**: la escena avisa cuando terminó.
- Las ventanas que se abren solas (hoy el cofre diario) **esperan a ese mismo momento**. Aparece
  todo junto, con un fundido suave.
- Red de seguridad de 25 s: si algo se trabara, la pantalla nunca queda pegada.

**3. Menos espera antes de empezar a bajar**

- El atlas (388 KB, lo más pesado) se empieza a bajar **desde la primera línea del HTML**, en
  paralelo con el login, en vez de esperar a que arranque Phaser.
- Conexión adelantada al CDN y a Supabase, para no pagar el saludo dos veces.
- El chequeo del manifiesto del bestiario baja de 4 s a 1,8 s de tope.

También se amplió el chequeo automático previo a la entrega: ahora también revisa `main.js`,
`boot.js`, `plaza.js` y `config.js`.

### Ajustes sobre la tanda de efectos (4/8, revisión del diseñador)

- **Fuera el aro de enfriamiento** de los nodos picados o talados. Volvió a quedar solo el contador
  de texto con el cursor encima.
- **Fuera las flechitas de "listo"** sobre los recursos: se superponían con la flecha del tutorial,
  que es la que tiene que llamar la atención.
- **El viento ahora dobla SOLO la copa.** Antes giraba el sprite entero y se veía que el tronco y la
  tierra se movían. Ahora cada árbol se dibuja en dos partes recortadas del mismo sprite —tronco
  abajo, copa arriba— y solo gira la copa, sobre el punto donde se une al tronco. La base queda
  totalmente quieta. Sigue sin necesitar arte nuevo.
  - El recorte se rehace solo si cambia la imagen del árbol (tocón, retoño, tajos).
  - Mientras el árbol da su saltito de crecimiento o está en enfriamiento, se dibuja entero.
  - El hachazo sacude la copa; el brillo del cursor sigue mostrando el árbol completo.
  - Dónde corta copa y tronco es editable en el panel ("Ambiente — viento" → parte que es copa,
    0.62 por defecto = el 62% de arriba).

### "Pop" de crecimiento: lo que termina de crecer rebota como un resorte (4/8)

Cuando algo pasa a su etapa final, se aplasta un instante y vuelve a su tamaño con rebote elástico
(`Elastic.easeOut`), hasta quedar quieto. Como el origen del sprite está abajo, se lee como si la
planta saltara desde la tierra. Sin arte nuevo.

- **Cultivo listo**: pop fuerte + polvillo verde. El brillo dorado de "cosechame" arranca **después**
  del rebote, porque los dos animan la escala y si no se pelean entre sí.
- **Árbol, roca o veta que sale del enfriamiento**: pop fuerte + polvillo (hojas verdes en el árbol,
  polvo gris en la piedra).
- **Pasos intermedios** con pop más chico (55%): el brote al plantar, la planta a media cosecha y el
  retoño del árbol a mitad del enfriamiento.
- No pasa al restaurar la partida: si entrás y el cultivo ya estaba listo, aparece quieto. El pop es
  solo para lo que crece **mientras mirás**.
- Un pop a medio andar se corta solo si el sprite cambia de textura, así no queda con la escala rara.
- Editable en el panel de balanceo (categoría "Ambiente — pop de crecimiento"): encendido/apagado,
  fuerza del rebote, cuánto tarda en quedar quieto y la fuerza de los pasos intermedios.

### Viento: los árboles y los cultivos se mecen (4/8)

Efecto ambiental hecho **solo con código, sin arte nuevo**. Los sprites tienen el origen abajo, así
que girarlos un grado inclina la copa y deja el tronco quieto — se lee como viento.

- **Solo los árboles crecidos se mecen.** Un tocón o un retoño en enfriamiento se queda quieto.
- **Cada árbol arranca en un punto distinto de la onda** (el desfase sale de su posición en el mapa),
  así que no se mueven todos al mismo tiempo.
- **Ráfagas**: cada 11 segundos pasa una que los inclina a todos un poco más durante ~3 segundos.
  En calma van a 1,3°; en la ráfaga llegan a ~2,9°.
- **Los cultivos listos también se mecen**, a un 55% de lo que se mece un árbol y un poco más rápido.
- Va en la granja **y** en la Zona Negra (46 árboles), con los mismos valores.
- El brillo de interacción acompaña la inclinación, así no se despega del árbol.
- Todo editable en el panel de balanceo (categoría "Ambiente — viento"): encendido/apagado, grados,
  duración del ciclo, cada cuánto pasa una ráfaga, cuánto la agranda y cuánto se mecen los cultivos.

### Se elimina la cola de acciones: un clic = un golpe (4/8)

La cola tenía sentido cuando el granjero caminaba: clickeabas varios nodos y él iba yendo de uno en
uno. Sin granjero no hace falta, así que se sacó por completo.

- **Un clic = un golpe.** Para tumbar un árbol hay que clickearlo las veces que haga falta (3 por
  defecto), y cada clic lo va dejando en su siguiente estado: tajo leve → tajo profundo → cae. Igual
  con piedras y minerales (entera → dañada → se rompe).
- **Ya no se puede encolar nada**: si hay un golpe en curso, el clic simplemente no cuenta.
- **Los golpes sueltos son gratis y se pierden.** Si dejás un árbol a medio talar y no volvés en
  **5 segundos**, se recupera solo y vuelve a estar entero — y **el hacha no se descuenta**. Lo mismo
  con piedras y vetas: picás una vez, se ve dañada, pasan 5 segundos y vuelve a estar entera sin
  gastar el pico.
- **La herramienta se gasta solo cuando el nodo cae del todo.** Antes de eso no se descuenta nada.
- El cartel bajo el cursor ahora dice en qué golpe vas: "Talar madera (2/3)".
- Los 5 segundos son editables en el panel de balanceo, junto a los golpes de tala y minería
  (763 entradas).

## Revisión completa del código en busca de bugs (4/08)

Auditoría de los ~10 archivos del juego con tres barridos automáticos (declaraciones repetidas,
panel de balanceo, ventanas/ids) más una revisión de lógica archivo por archivo. Se encontraron
y arreglaron **31 bugs**. Los más graves:

### Combate (forest.js) — el juego se rompía en serio
- **Dos relojes distintos mezclados**: parte del código usaba `Date.now()` y parte el reloj interno de
  Phaser. Consecuencias reales: el Espectro quedaba **intangible para siempre** tras su primera Fase
  espectral, el Dragón lo mismo tras el primer Parpadeo (jefe imposible de matar), el Caparazón del
  Golem quedaba activo de forma permanente, y el **aturdimiento y el sangrado no hacían absolutamente
  nada**. Además, el espadazo del clic izquierdo dejaba de salir después del primer golpe. Todo pasado
  a un solo reloj.

- **Con arco equipado, el clic izquierdo sobre un bicho no hacía nada** y encima no dejaba caminar.
- **Al volver del Bosque por segunda vez no aparecía la barra de vida** (ni el aura del cosmético):
  quedaban cacheadas apuntando a objetos ya destruidos.

- **Las babitas se acumulaban sin techo** (fuga de memoria): cada Baba muerta creaba 2 y nunca se
  borraban.

- **Los monstruos reaparecían con los buffs puestos**: el Orco y el Dragón volvían enfurecidos de forma
  permanente y ya no podían volver a enfurecerse.

- La estamina se cobraba antes de comprobar si el golpe podía siquiera conectar; con arco se perdían
  la flecha y la durabilidad aunque no hubiera estamina.

### Granja (farm.js)
- **La cola de acciones no se ejecutaba nunca**: clickeabas un segundo árbol mientras talabas, decía
  "En cola (1)"… y se descartaba solo. Ahora la cola funciona en la granja de un clic.

- **Arrastrar la vista empezando encima de un objeto lo talaba/minaba/abría**: la acción se disparaba
  al apretar. Ahora se resuelve al soltar, y solo si no hubo arrastre.

- El árbol saltaba a "casi talado" en el primer golpe y después retrocedía; ahora el estado dañado
  corresponde al golpe real.

- Si la bolsa se llenaba en el último golpe, la roca quedaba dibujada rota con 0 golpes.
- El brillo de interacción quedaba pegado para siempre sobre el último objeto trabajado (el granjero
  invisible se quedaba estacionado ahí) y su contador visible sin hover.

- Al volver del Bosque no volvía el humo del Horno.
- Cambiar de semilla durante la animación de plantar colaba la nueva sin verificar el nivel.
- WASD cancelaba la pesca aunque esas teclas ya no muevan nada.
- La tecla E no llegaba al portal ni al jabalí, solo a objetos y parcelas.
- El jabalí sumaba +1 al contador de semanas al aparecer (sin ninguna relación).

### Economía y datos (state.js)
- **Girasol, Trigo y Maíz eran invisibles**: se cosechaban pero no aparecían en la bolsa, no ocupaban
  casilla y **no se podían vender en ningún lado** — justo los tres cultivos de mayor valor. Lo mismo
  con fibra, pelaje, cuero, colmillo y esencia rúnica. Todos agregados a la bolsa y al mercado.

- **La plata de las incursiones se perdía**: entraba como recurso de bolsa en vez de a la billetera.
  El resumen decía "+40 plata" y el jugador no cobraba nada. Pasaba en toda incursión.

- El objetivo del tutorial "comprá semillas" se cumplía apretando el botón aunque no tuvieras plata.
- **Los niveles de granja 11-50 con tareas de solo combate/cocina quedaban trabados**: el nivel solo se
  revisaba al ganar XP de cultivo, minería o pesca.

- **El set de Fibra completo no hacía nada** y el de Piel solo la mitad: velocidad de ataque, evasión y
  regeneración estaban en la tabla pero no los leía nadie. Ya funcionan los tres.

- El bono de +1% de materiales por cofre colocado no se aplicaba al botín.
- Los contadores diarios usaban fecha UTC y otros fecha local: en Argentina las incursiones, las
  recargas de estamina y las misiones del pase se reseteaban a las 21:00. Todo pasado a fecha local.

- El Prestigio no reseteaba la XP de granja: volvía de 1 a 10 en el primer cultivo, duplicando
  cosméticos y ampliando el cofre en cada vuelta.

- El color de nombre Oro (exclusivo VIP) se habilitaba con cualquier cosmético de color.
- Bucle infinito latente en el sorteo de misiones diarias.

### Mercado entre jugadores — agujeros de duplicación
- **"Retirar" duplicaba ítems**: el borrado devolvía éxito aunque no borrara ninguna fila, así que el
  doble clic devolvía el ítem a la bolsa una y otra vez, infinitas veces. Ahora el retiro es atómico.

- **"Cobrar" pagaba varias veces la misma venta** por el mismo motivo. Ahora también es atómico.
- **Comprar con la bolsa llena hacía perder la plata y el ítem**; retirar con la bolsa llena
  **destruía el ítem**. Ahora existen *entregas pendientes*: nada se pierde, se reclama desde la
  ventana del Mercado cuando hacés lugar.

- **Comprar un arma que ya tenías pisaba la tuya** con todo su +N, durabilidad y runas. Ahora se avisa
  y no se permite.

- Cambiar de pestaña mientras cargaba mostraba publicaciones ajenas bajo "Mis publicaciones", con
  botones de Retirar y Cobrar funcionando.

- Dos compras rápidas seguidas dejaban la plata en negativo.

### Guardado
- **El arma equipada se perdía al cargar la partida**: la migración de ids corría antes de leer el
  equipo guardado, así que quedaba en un id inválido y el jugador aparecía sin arma, sin poder atacar
  ni mandar incursiones.

- El enfriamiento de forja de armas se salteaba recargando la página (ahora se guarda).
- Los edificios nuevos (Altar, Establo, Curtiduría, Ofrendas) faltaban en el objeto por defecto.

### Blindaje de las ventanas
- Todas las funciones de refresco de paneles quedaron envueltas: si una falla, se ve en la consola y
  el jugador recibe un aviso, pero **la ventana ya no queda vacía ni se lleva puesto el resto del
  juego** (era exactamente lo que pasó con la Cocina).

- El Pase de Batalla y el Altar de Runas ya no revientan con datos guardados de una temporada vieja.
- El Horno se agregó a la tabla de refresco automático.
- Las pestañas del Mercado P2P ya no comparten selector con las de la Tienda.

**Verificación**: 762 entradas del panel de balanceo funcionando, 20 ventanas OK, sin funciones
faltantes, y 18 pruebas automáticas de comportamiento sobre los arreglos (bolsa, mercado, tutorial,
niveles, sets de armadura, cofres, prestigio, incursiones) — todas en verde.

---

## Pendientes conocidos

### Lo único que falta es ARTE (nada de código)
- **11 criaturas del bestiario**: generadas en PixelLab, faltan bajar los frames e integrarlas (a la araña todavía le falta la animación de ataque).
- **3 edificios nuevos**: Establo, Curtiduría y Altar de Ofrendas.
- **4 animales del Establo** (alpaca, conejo, toro, jabalí) y sus materiales (fibra, pelaje, cuero, colmillo).
- **20 piezas de armadura** de la Curtiduría.
- **Cosméticos**: skins, decoraciones y la mascota.
- Mientras tanto todo eso ya funciona en el juego con el ícono de respaldo: no hay nada bloqueado.

### En espera del diseñador
- Usos de tablones y barras, cerca premium, tabla de stats definitiva del bestiario.

### Opcionales ofrecidos
- Íconos oficiales PixelLab para la Espada de Madera y el Pico de Hierro (hoy derivados).
- Replicar el suelo nuevo en la plaza y en la Zona Negra.
- Kick por AFK en la plaza.
- Pulido tipo Sunflower Land: cursor de mano, resaltado al pasar el cursor, vista inicial centrada en las parcelas.
- Simulación completa de balance económico de punta a punta.

### Pilares futuros
- Login por email multi-dispositivo, PvP/endgame de netherita, referidos, token $Golden, audio, granja distinta por nivel (quinta.docx).
