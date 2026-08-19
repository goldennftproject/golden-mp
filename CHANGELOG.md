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

### Estandarización de TODAS las ventanas (4/8)

Las ventanas viejas (Herrería, Tienda, Ranking) ya tenían el panel interior de madera y se veían
bien. Las nuevas mostraban la lista suelta sobre la madera de la tarjeta, y por eso se veían pobres
al lado de las otras. Se revisaron las 21 ventanas del juego y se les dio el mismo tratamiento.

**1. Panel interior de madera para toda lista de contenido.** Lo tenían la Tienda, la Herrería y el
Ranking; ahora también Granero, Cocina, Horno, Altar de Runas, Establo, Curtiduría, Altar de
Ofrendas, Incursión, Mercado de jugadores, Pase de Batalla, Cosméticos, Habilidades, Bolsa, Cofre y
Ajustes.

**2. Un solo encabezado de sección.** Cada panel se inventaba el suyo con estilos escritos a mano
(`margin-top:8px`, `margin-top:10px`, `font-size:15px`…). Ahora hay una clase `.secc` con el cartel
de madera del juego, centrada, y se aplicaron **17 encabezados** que estaban sueltos. Los del Cofre
y el Equipo, que ya tenían su propio estilo aparte, usan el mismo.

**3. Texto sobre madera: blanco con contorno oscuro, sin excepciones.** Varias notas y
descripciones usaban el gris de la interfaz clara, ilegible sobre marrón. En la primera pasada las
puse en crema amarillento, y el diseñador señaló que sobre ese fondo tampoco se leían — tenía razón:
el crema da 2,4 de contraste y el amarillo 3,0, ambos por debajo del mínimo de 4,5. La solución es
la que el juego ya usaba en los títulos y en el cartel del tutorial: **blanco con contorno oscuro**,
que sube a 17,7 contra el contorno. Se aplicó a los encabezados de sección, a los títulos de
Ajustes, y a las notas del Ranking, el Cofre diario, Habilidades y el Mercado.

**4. Recuadros de datos iguales.** La recompensa del Cofre diario usaba su propio color; ahora usa
el mismo crema con borde que las filas del resto del juego, y todas las filas comparten la misma
sombra suave.

**5. Texto secundario sobre los recuadros crema.** El diseñador marcó que el subtítulo del Ranking y
las descripciones de las filas también se leían lavadas. Eran el otro lado del mismo problema: el
gris claro `#8a7f66` da **3,2 de contraste** sobre el crema de las filas, por debajo del mínimo de
4,5. Pasaron a un marrón oscuro (**5,9 y 6,6**) que se lee bien y sigue siendo claramente secundario
al lado del título negro de la fila. Lo mismo con las etiquetas FREE y VIP del Pase, que eran verde
y dorado claritos, y con el aviso rojo del Cofre diario.

**Regla que queda para todo el juego**: sobre madera, blanco con contorno oscuro; sobre crema,
marrón oscuro. Nada de amarillos ni grises claros para texto.

**6. Nada escrito directamente sobre la madera (criterio del diseñador).** Varios paneles ponían
datos sueltos sobre el fondo de madera: el resumen del Granero, los materiales del Establo,
"Equipada: ninguna" y el bono de set de la Curtiduría, las tres líneas de explicación del Altar de
Runas, el poder de combate de la Incursión y los cosméticos ganados.

Mi primer intento fue hacerlos legibles con blanco y contorno. El diseñador propuso lo contrario —
**extender el recuadro claro que ya usan las filas** en vez de escribir sobre la madera — y es mejor:
resuelve la legibilidad por diseño en lugar de por truco, y deja un solo lenguaje visual en toda la
ventana. Se creó la clase `.info` (mismo crema, mismo borde y misma sombra que las filas) y se
aplicó a los **13 bloques** de datos sueltos que quedaban, agrupando las líneas que van juntas en un
solo recuadro en vez de una caja por renglón.

Con eso, el texto secundario es marrón oscuro **en todos lados**, porque ya nunca cae sobre madera.
Lo único que sigue sobre madera es lo que siempre estuvo pensado para eso: los títulos de ventana y
los carteles de sección, que llevan su contorno oscuro.

También se repasaron **todos los colores escritos a mano** que quedaban en los paneles:

| | Antes | Contraste | Ahora |
|---|---|---|---|
| Hito ★ del Pase | dorado claro | **1,03** | dorado oscuro (5,3) |
| "VIP activo" | dorado medio | 4,29 | dorado oscuro (5,3) |
| Bono de set y recompensa de nivel | oscuros sobre madera | ilegibles | ahora van dentro del recuadro |

Y una corrección de maquetado: en las filas, un texto largo podía meterse por debajo del botón.
Ahora corta y sigue en la línea de abajo.

**Vista previa sin deployar**: se agregó `public/vista-ventanas.html`. Se abre haciendo doble clic y
muestra las ventanas de ejemplo con el CSS real del juego, para revisar
el estilo sin tener que subir nada.

Verificado: las 21 ventanas quedaron con contenedor estandarizado, el CSS cierra balanceado
(425 llaves) y los chequeos automáticos siguen en verde.

### BUG GRAVE: la Cocina entraba en bucle y la partida no cargaba (4/8, reporte del diseñador)

"Puse a cocinar un asado y con el modo testeo ha cocinado muchísimos, y ahora intento entrar y no
carga, se bugeó total."

**La causa, y es mía.** Hace unos días hice que `statAdd()` recalculara el nivel de granja, para
arreglar que los niveles 11-50 con tareas de cocina o combate quedaran trabados. Sin darme cuenta
creé un círculo:

```
checkCooking()  →  statAdd("cocinar")  →  recalcFarmLevel()  →  refreshHud()  →  checkCooking()  →  …
```

Y como la olla terminada se sacaba de la lista **después** de entregar el plato, en cada vuelta la
misma olla volvía a entregar. Reproducido en frío: **3363 platos de Papa Asada en una sola llamada**,
hasta que revienta la pila con `RangeError: Maximum call stack size exceeded`.

Ese error explotaba dentro de `refreshHud()`, que en el arranque se llama **antes** de crear el
juego. Resultado: el juego nunca arrancaba y quedaba la pantalla de carga puesta. Exactamente lo
que reportó.

No era del modo testeo: el modo testeo solo lo hizo visible enseguida, porque con cocciones de 8
segundos el bucle salta al toque en vez de dentro de varios minutos.

**Arreglos**

1. **La olla se saca de la lista ANTES de entregar el plato.** Si algo vuelve a entrar, esa olla ya
   no está y no puede duplicar nada.
2. **Candado anti-reentrada en `checkCooking()`**: mientras está entregando, una segunda llamada se
   ignora.
3. **Candado anti-reentrada en `recalcFarmLevel()`**, que era el otro extremo del círculo. Subir de
   nivel refresca el HUD y el HUD vuelve a llamar ahí.
4. **Reparación de las partidas ya rotas**: al cargar, los platos se recortan a 999 por tipo y las
   ollas a 12. La partida del diseñador vuelve a abrir sin tocar nada.
5. **`refreshHud()` en el arranque va dentro de un try/catch**: pase lo que pase, el juego arranca.
   Un error del HUD ya no puede dejar la pantalla de carga trabada.

Verificado con las dos versiones del código: la vieja revienta a las 3362 vueltas; la nueva entrega
**un plato, una vez, y una sola vuelta de HUD**.

### El retraso seguía en plantar y cosechar (4/8, reporte del diseñador)

Cada acción tiene su propio número, y cuando aceleré el talado **solo bajé los de talar y picar**.
Plantar y cosechar quedaron en 0,30 s, casi cuatro veces más lento, y encima sin el destello
instantáneo. Por eso el diseñador seguía sintiendo retraso justo ahí.

| Acción | Candado antes | Ahora | Respuesta instantánea |
|---|---|---|---|
| Talar | 0,08 s | 0,08 s | ya la tenía |
| Picar | 0,08 s | 0,08 s | ya la tenía |
| Plantar | 0,30 s | **0,08 s** | **nueva** (polvillo de tierra) |
| Cosechar | 0,30 s | **0,08 s** | **nueva** (destello + polvillo) |

- El destello blanco ahora también funciona sobre el sprite del cultivo, no solo sobre nodos.
- El **clic guardado** se extendió a las parcelas: cosechar una fila seguida es lo más común, y los
  clics que caían durante el candado se perdían.

Cosechar 12 parcelas a 8 clics por segundo: **3,60 s → 1,50 s**. Ahora el límite es el dedo, no el
juego.

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
500.000 de plata, 5.000 $Golden, 99 de cada material y cultivo, 50 semillas de cada uno,
herramientas y picos al máximo, las 12 parcelas, todos los árboles y vetas desbloqueados y los 7
edificios construidos. **Se da una sola vez** (queda marcado en el guardado), así que recargar no
acumula.

**Arreglo (reporte del diseñador): la bolsa quedaba desbordada.** La primera versión daba 500 de
cada material y 200 de cada cultivo. Como cada montón es de 99, eso son 6 y 3 casillas por cosa:
**168 casillas en una bolsa de 50**. Lo que no entraba quedaba escondido, así que al tirar algo
aparecía el montón de atrás y parecía que el juego "seguía dando cosas" — en realidad ya las tenía y
no entraba nada nuevo, con lo cual no se podía probar ningún sistema que requiera recoger.

- El regalo ahora da **99 de cada cosa: una casilla por recurso**.
- La bolsa del modo testeo pasa de 50 a **150 casillas**. La ventana ya tiene scroll.
- **Destapa-bolsa automático**: al entrar, si la partida tiene más montones de los que entran, se
  recorta a 99 por recurso y avisa en el registro. Solo actúa si de verdad está desbordada, así que
  arregla las partidas que ya quedaron trabadas sin tocar las que están bien.

Resultado: 48 casillas ocupadas de 150, **102 libres**.

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

## Día 14 — Domingo 09/08 · Todos los edificios con el estilo del Altar

### Arte nuevo (PixelLab, grupo del Altar de Runas)
El diseñador pidió que todos los edificios compartieran el estilo del Altar. Se generaron
como estados del mismo objeto, así heredan paleta y trazo, todos **de frente** (nada de
vistas isométricas) y sin las columnas de runas que se colaban del Altar.

- **Reemplazados en el juego**: Granero, Herrería, Mercado, Cocina, Horno de Piedra y Altar de Runas.
- **Estrenan arte** (antes se dibujaban con el sprite de respaldo): **Establo**, **Curtiduría** y **Altar de Ofrendas**.
- **Sin tocar**: portal, dummy y cofre — el diseñador los quiere como están.
- La Cocina se rehízo dos veces: la primera salió de costado y se descartó.

### Ajustes de código que exigió el arte nuevo
- El resplandor de la fragua y el humo del Horno estaban clavados a medidas fijas de las
  texturas viejas (104 px y 90 px). Ahora se calculan **en proporción al sprite**, así el
  arte se puede cambiar sin que el fuego quede flotando al lado del edificio.
- Al Horno se le borró el humito **dibujado**: el humo del juego lo pone el código y se
  inclina con el viento; con los dos se veía doble.
- `store_off.png` quedó sin uso y se eliminó. `store_lit` (fragua encendida) ahora se deriva
  del arte nuevo, con los tonos de fuego levantados.
- `tools/build-atlas.py` aprendió a incorporar claves nuevas: Establo, Curtiduría y Ofrendas
  nunca habían entrado al atlas porque no existía su PNG.
- Atlas rearmado (365 sprites) y versiones subidas: atlas `?v=26` y cada edificio con su `?v`
  nuevo, para que nadie se coma el arte viejo del caché.

### Verde de la granja, menos fosforescente
El diseñador pidió un verde acorde a los edificios y las piedras: el pasto y sobre todo la
copa de los árboles tiraban a lima fluorescente y peleaban con la paleta cálida del arte nuevo.

- Los verdes se corrieron del amarillo-lima hacia un verde real, con tope de saturación y los
  tonos claros un poco más bajos. Marrones, grises y flores no se tocaron.
- Afecta: los 3 tiles de pasto, las matitas de decoración, el árbol y todos sus estados
  (a medio talar, tocón, hojas) y el brote.
- También los colores que estaban escritos en el código: el borde de pasto de la isla
  (`#7fbf5a` → `#83ac65`), el fondo sin isla, el damero de respaldo y el suelo de la plaza.
- Copia de los sprites originales en `assets/farm/_backup_verde_viejo/`.

**Bug encontrado de paso: el suelo de la granja nunca mostró su textura.** El dibujo de la
isla (mar, orilla, borde de pasto) se creaba con la misma profundidad que los tiles de pasto
pero *después*, así que los tapaba enteros: la granja se veía como un verde plano y liso, y
los tiles seamless (procedurales, del 31/7) no llegaban a verse desde que se agregó la isla. La isla pasó
a `-1002` y el pasto volvió a aparecer. Con la textura a la vista, los tiles se rehicieron
desde el original con el tono un poco más claro, y el borde de pasto de la isla se igualó
al del suelo para que no se note el salto. También se calmaron las matas de la laguna.

### Que los minerales se distingan
Las seis vetas se veían como la misma piedra marrón. El arte estaba bien: el problema era el
tamaño. Se dibujaban al **0.67 de la celda** desde un sprite de 92 px, o sea al 30%: las
pepitas quedaban de 2 px y se volvían ruido. Tres cambios, todos por código y todos apagables
desde el panel de balanceo (grupo "Minerales — que se distingan"):

- **Escala 0.67 → 0.90.** Con eso solo, las pepitas vuelven a leerse.
- **Tinte sobre la roca entera**, no sobre las pepitas: bronce parda cálida, hierro gris
  azulada, oro arenosa, diamante gris celeste. La masa es lo que se lee de lejos; el detalle no.
  Piedra común y netherita no se tocan, ya se distinguían solas.
- **Chispita en las vetas caras** (diamante, netherita, oro) cuando están **listas**. Durante
  el enfriamiento no brillan, así que además avisa que se pueden picar. Cada veta lleva su
  propio reloj, con el primer destello repartido al azar dentro del ciclo y el siguiente entre
  el 55% y el 145% del intervalo: la primera versión usaba un único temporizador para todas y
  destellaban sincronizadas, que era justo lo que no se quería.

El tinte convive con el gris de "bloqueado"; ese siempre gana. Como el destello blanco del
golpe hace `clearTint()`, el color del mineral se vuelve a poner al terminar.

Sigue pendiente el caso difícil: **piedra vs hierro** son la misma roca, una pelada y la otra
con motas. Eso pide siluetas distintas y arte nuevo, no código.

### Animales sueltos por la granja
Estaban encerrados en un patio cercado al lado de la laguna. Ahora andan por toda la granja,
como los del Establo de cualquier juego cozy.

- Se dejó de dibujar el parche de tierra y la cerca de madera; la zona de paseo es la granja entera.
- **Esquivan**: edificios, vetas, árboles, la laguna, la cerca del borde y **las parcelas** — un
  animal parado sobre los cultivos los tapa y encima confunde, porque parece que hay algo para
  cosechar ahí.
- Eligen su próximo destino **cerca de donde están** (2,6 celdas), no en cualquier punto del
  mapa: así deambulan en vez de cruzar la granja de punta a punta. Si el punto medio del camino
  está tapado, buscan otro, para no atravesar un edificio en línea recta.
- Aparecen **junto al Establo**, que es de donde salen.
- El clic sobre un animal se sigue evaluando último, después de vetas y parcelas: un animal
  parado delante de una veta no te roba el clic.
- El corral de antes queda a un interruptor de distancia: `GF.CORRAL_ON = 1` en config.js.

### Las chimeneas, en su lugar
El arte nuevo movió las chimeneas y el humo se quedó donde estaba: en la Cocina salía del
techo, en la Herrería del aire al costado, y el Horno directamente no humeaba.

- **Una sola función de humo** para los tres edificios. Antes la Cocina y la Herrería usaban
  una, y el Horno tenía la suya propia hecha con elipses dibujadas, mucho más floja y difícil
  de ver. Ahora los tres humean igual.
- La posición sale de **`GF.CHIMENEA`**, medida sobre el PNG y no a ojo: `dx` es el corrimiento
  respecto del centro del sprite y `dy` la altura de la boca desde el techo. Si mañana cambia
  el arte, se vuelven a medir esos dos números y listo.
- El humo ahora **se inclina con el viento**, igual que las copas de los árboles. Esa parte solo
  la tenía el Horno; ahora es de los tres.
- Se borró el humito **dibujado** de la Cocina y de la Herrería (ya se le había sacado al Horno):
  con el humo del juego encima se veía doble. De paso los sprites quedaron más cortos.
- La `store_lit` (fragua encendida) se rehizo desde el arte sin humo, y el resplandor de la
  fragua se remidió sobre el sprite nuevo.

### La costa terminada
La orilla eran **tres rectángulos redondeados de color plano**, uno encima del otro: pasto,
arena y agua, los tres con el borde duro y la misma curva perfecta. Se veía como un vector,
no como pixel art.

Ahora es una imagen, `assets/farm/isla.png`, que arma **`tools/build-isla.py`**:

- De adentro hacia afuera: borde de pasto oscuro con **matitas colgando sobre la arena**,
  arena seca con piedritas y conchillas, arena mojada, la **línea de espuma**, bajío claro,
  agua media y ya el mar (que lo sigue pintando el juego por debajo).
- Cada límite va con **dithering** de 2 px en vez de un corte limpio: es lo que lo hace leer
  como pixel art.
- El contorno **no es un óvalo perfecto**: se le suma ruido, así la orilla tiene entradas y
  salientes en vez de una curva de compás.
- El anillo de pasto de afuera de la cerca usa **el mismo tile** que el suelo del juego. Con un
  verde plano se veía la costura: un rectángulo texturado adentro y liso alrededor.
- Las olas animadas se corrieron mar adentro y se bajaron de opacidad: la espuma de la orilla
  ahora la trae la imagen, y las dos cosas juntas se pisaban.
- Pesa 83 KB y **no va al atlas** (mide 1190×854, no entra). Si el PNG no llega, el juego
  vuelve solo a los rectángulos de antes.

### Nubes menos opacas
Estaban al 0,55 de opacidad y tapaban medio edificio al pasar. Bajaron a **0,22**, y la sombra
que proyectan sobre el suelo de 0,10 a 0,06. Las dos quedaron en el panel de balanceo
(`fx.nubesAlfa` y `fx.nubesSombra`) para moverlas en caliente.

### Que no sean todos el mismo techo
El Granero, la Cocina, el Establo y la Curtiduría salieron los cuatro del Granero, así que
compartían el mismo tejado y de lejos parecían el mismo edificio. Se rehicieron tres con la
**forma** del techo distinta pero el **mismo tejado rojo**: el primer intento los diferenciaba
por material (paja, pizarra, musgo) y se descartó — la idea es que se distingan por silueta,
no por color.

- **Establo**: dos aguas empinado, frente abierto con portón y fardos.
- **Cocina**: bajo y ancho, chimenea a la izquierda. Sin humo dibujado, así que no hubo que
  borrárselo como a la anterior. La chimenea se movió: `GF.CHIMENEA.cocina` pasó de −0.232 a −0.314.
- **Curtiduría**: compacta, techo de una sola pendiente. Los bastidores de cuero ahora van
  pegados al frente en vez de sobresalir a los costados, que era lo que la hacía verse chica:
  el juego escala por ancho, y con los bastidores afuera el edificio quedaba enano. De 122 px
  de ancho bajó a 84.
- **Altar de Ofrendas**: era el último con el techo fuera de paleta (dorado). Ahora rojo, con
  la fachada tallada y el cuenco intactos.

El Granero queda como el único con el tejado a dos aguas clásico. La Herrería (tejuelas de
piedra), el Horno (cúpula) y el Mercado (toldo a rayas) ya se distinguían solos.

### Verificación del día
- `node --check` en los 13 JS y `tools/check-ui.js`: 20 ventanas OK, ninguna función referenciada que no exista.
- `build-atlas.py --check` sin faltantes. Atlas final: **365 sprites, `?v=26`**.
- Panel de balanceo levantado en Node: **804 entradas, ninguna rota** (se sumaron 4 de minerales y 2 de nubes).
- **Los animales, simulados aparte**: 4 bichos tomando 4000 decisiones sobre la geometría real de la
  granja. Ningún destino inválido y ninguna vez que se quedaran sin salida. Les queda caminable el
  56% del terreno y cada tramo son ~71 px, o sea 4,4 s de caminata.
- Composición de la granja renderizada aparte (isla + suelo + los nueve edificios) para revisar
  alturas y silueta: ningún edificio se pisa y los techos se distinguen entre sí.

---

## Día 15 — Lunes 10/08 · "Cosas nuevas por agregar" (doc del diseñador)

Llegó un documento con 24 puntos. Se atacan por fases, dejando lo visual para el final.

### Fase 1 — Los tres bugs

**El entrenamiento en el dummy era XP gratis.** Se podía dejar entrenando, seguir jugando
normal, volver a los dos segundos, cobrar, y repetir. Dos arreglos:

- **El primer minuto no cuenta** (`DUMMY_OFF_ESPERA_MS`). Antes empezaba a sumar en el
  instante del clic, así que clic → cobrar → clic → cobrar daba XP a puñados.
- **Mientras entrena, el juego queda tapado.** La ventana nueva usa una clase `.ov.bloquea`:
  las ventanas normales dejan pasar el clic al mundo a propósito, esta no. Y si recargás la
  página vuelve sola, así que tampoco se escapa por ahí. Un clic en cualquier lado corta el
  entrenamiento y cobra, como pedía el doc.

**El tutorial pedía construir la Cocina teniéndola.** El chequeo de "este paso ya está hecho"
solo corría al migrar un guardado viejo. Si construías algo ANTES de que el tutorial lo
pidiera, después te lo pedía igual y no había forma de cumplirlo. Se sacó a `tutoHecho()` y
ahora se consulta también cada vez que un paso pasa a ser el activo.

**El Horno "se construía solo".** No era un bug del tutorial: era el modo testeo, que daba
todos los edificios hechos.

### El modo testeo ya no regala nada
Tirando de ese hilo se decidió sacarle **todo el regalo**: daba 500.000 de plata, 5.000 de
$Golden, 99 de cada material y semilla, todas las herramientas y picos, la pestaña de Armas
abierta, los edificios construidos, las 12 parcelas y los nodos desbloqueados. Con eso puesto
no había forma de probar la progresión: no se sentía cuánto cuesta nada, el tutorial venía
medio hecho y el Horno aparecía solo.

Ahora **lo único que hace el testeo es comprimir los tiempos**: cultivos, enfriamientos de
árboles y vetas, cocina, animales, forja, incursiones, estamina y cupos diarios. El juego se
juega exactamente igual que en la versión final, pero sin esperar.

- Se borró `testeoRegalo()` y su llamada en main.js.
- La bolsa vuelve a 20 casillas (el testeo la inflaba a 150 para aguantar el regalo).
- Queda `testeoDestapar()`, que repara las bolsas desbordadas por el regalo viejo.
- **Verificado en Node**: con el testeo activo, plata, $Golden, materiales, parcelas, árboles y
  edificios quedan **exactamente como estaban**; y los tiempos sí bajan (papa 9 s, árbol y
  piedra 40 s, dummy 15 s).

**Verificado en Node** contra el estado real: cobrar al instante no paga; 5 minutos pagan 4 XP
(los 4 útiles); 20 horas topean en 480; y con la Cocina y el Horno ya construidos el tutorial
salta directo al paso siguiente.

### Auditoría completa del código
Se repartió el código en tres frentes (estado y guardado · escenas y rendimiento · interfaz) y
se verificó a mano cada hallazgo antes de tocarlo.

**Cuatro bugs críticos, los cuatro arreglados:**

- **Los cofres perdían todo del espacio 11 en adelante.** `save.js` recortaba a 10 items al
  cargar, pero un cofre crafteado con la granja alta tiene hasta 45 espacios y la ventana los
  llena. Llenabas, recargabas y desaparecía sin aviso. Ahora la capacidad se calcula con
  `G.chestCap` y los espacios ganados por nivel aparecen solos en los cofres viejos.
- **Curación infinita gratis.** `applyCombatHp()` regalaba la diferencia de vida cada vez que
  subía la vida MÁXIMA, y se llama al equipar: con una Runa Guardiana V, desequipar y volver a
  equipar daba +120 de vida, repetible sin límite. Anulaba el costo de la comida y el riesgo de
  la Zona Negra enteros. Ahora subir el máximo no cura; la única que cura es la subida de nivel
  de Combate, y eso lo hace `curarPorNivel()` a mano.
- **"Bolsa llena" 60 veces por segundo.** `tryPickup` corre en cada frame: pararse encima de un
  drop con la bolsa llena dejaba el cartel clavado para siempre y tapaba cualquier otro aviso.
  Ahora avisa una vez cada 2,5 s.
- **El título se acumulaba en el nombre.** El guardado trae `"[Veterano] Juan"` y eso volvía a
  `NICK`, así que cada sesión sumaba un prefijo: `[Veterano] [Veterano] [Veterano] Juan` en el
  ranking, el chat y el mercado. Al cargar se le sacan los prefijos.

**Rendimiento:**

- **El triple barrido de la granja.** `hitsSprite` se llamaba ~85 veces por frame desde tres
  lugares (timers, brillo del cursor y cartel de acción) y cada llamada alocaba un Rectangle y,
  si el cursor caía adentro, leía un píxel real del canvas con `getPixelAlpha`. Ahora el
  Rectangle se reusa y el resultado se cachea por frame: el trabajo pasa a ser una vez por
  sprite en vez de tres.
- **El atlas fuente quedaba vivo toda la sesión** después de desempaquetarse: 10,7 MB de RGBA
  de puro descarte. Se libera al terminar.
- Las **olas** se redibujaban 60 veces por segundo para un movimiento de ~1 Hz: pasan a 10 fps.
- Las **barras de vida** de los 25 mobs y la del granjero se reconstruían por frame: ahora solo
  cuando cambia la vida.
- **La plaza filtraba un socket y un listener global** si salías mientras la conexión estaba en
  vuelo — habitual con el server gratis, que arranca frío. Y mandaba 15 mensajes por segundo
  aunque estuvieras parado: ahora solo si algo cambió, con keepalive de 1 s.
- **Mover la laguna no invalidaba la grilla del pathfinding**: el A* seguía creyendo que el agua
  estaba en el lugar viejo.

**Interfaz:**

- **Escape cerraba la ventana de entrenamiento** y te devolvía al juego con el entrenamiento
  corriendo — el mismo exploit que la ventana venía a tapar, abierto el mismo día. Las ventanas
  `.bloquea` ya no se cierran con Escape, ni con un clic afuera, ni al entrar en modo edición.
- **La hotbar se reconstruía entera una vez por segundo** con sus 20 listeners, y se perdía el
  `:hover` en cada tick. Ahora solo si cambió.
- **El Altar era el único panel sin chequeo de costos**: todos los botones salían verdes.
- **La Cocina mentía con el tiempo** de cocción si tenías la Cocina nivel 2 (no aplicaba el
  descuento al mostrarlo), y el botón de **Incursión** ignoraba el cupo diario.
- **Contraste**: el "Nv." de Skills estaba en 2,6:1 y las etiquetas verdes en 3,3:1; los dos
  pasaron a ~5:1. Las filas bloqueadas estaban al 55% de opacidad, lo que dejaba **el Pase de
  Batalla entero ilegible** porque los 30 niveles arrancan bloqueados: ahora 82% + gris.

**Limpieza:** 10 funciones muertas borradas de state.js, 26 reglas de CSS sin uso, dos assets
que se pedían dos veces. Y aparecieron **emojis perdidos del archivo a nivel de bytes**, que
dejaban textos como "Desbloquear parcela (150 )" y, peor, 36 objetos de texto VACÍOS con tweens
infinitos girando sobre las parcelas listas. Se reemplazaron por chispas, monedas y gotas
dibujadas por código, que además no dependen de la fuente.

### Fase 2 — Los ajustes del documento

- **Los primeros 10 árboles y piedras** con enfriamiento corto, no 3. Era lo que trababa el
  final del tutorial: al cuarto árbol ya caías en el enfriamiento largo.
- **La Herrería dejó de ser gratis**: cuesta 5 madera + 2 piedra y se agregó como primer paso
  del tutorial. A las partidas que ya venían jugando se les respeta construida — nadie pierde
  un edificio que ya tenía.
- **Más de un animal por tipo.** `G.animals[k]` pasó de ser un bicho suelto a una LISTA, cada
  uno con su felicidad y su ciclo. Hasta 5 por tipo, y cada extra cuesta 50% más que el
  anterior (40 → 60 → 90 → 135 → 203 $Golden). Alimentar y recoger actúan sobre TODOS los del
  tipo de una sola vez: con 5 alpacas, cinco botones sueltos sería un castigo. Los guardados
  viejos se migran solos.
- **Resumen al volver de la Zona Negra + descanso.** Al entrar se saca una foto del estado y al
  volver se compara: sale un cuadro con cuántos monstruos mataste, la XP de Combate y todo lo
  que trajiste. Después el granjero descansa 3 minutos antes de poder volver a entrar. Sale
  también si te derrotan, aclarando que conservás lo que ya habías recogido.

**Un bug encontrado por el propio test**: `animalLista()` devolvía un array nuevo sin
guardarlo, así que el `push` de la compra caía en un array de descarte y **el animal comprado
se perdía en silencio**. Se detectó porque la prueba mostraba "alpacas: 0" después de comprar
tres. Corregido y vuelto a probar: 5 compradas, precios 40/60/90/135/203, y recoger todo de una
da 10 de fibra.

Los cuatro números nuevos quedaron en el panel de balanceo (808 entradas, ninguna rota).

### Fase 3 — La interfaz

- **Las misiones diarias salieron del Pase de Batalla.** Metidas ahí adentro pasaban
  desapercibidas, y son justamente lo que le da a alguien una razón para entrar hoy. Ahora
  tienen su ventana propia (`ov-misiones`, tecla **J**) y una casilla destacada en el menú, con
  contador **n/3** que pulsa mientras te quede alguna sin cumplir. El Pase queda como lo que
  tiene que ser: la lista de recompensas, con un atajo a las misiones.
- **Menú de MAPA** (tecla **N**): dónde estás y a dónde podés ir, con el estado de cada zona.
  La Zona Negra avisa cuánto falta del descanso. Queda armado para sumar los 3 mapas nuevos
  cuando se haga la Fase 5.
- **Ranking del Altar de Ofrendas**: top 10 con el porcentaje del pozo que le toca a cada uno y
  tu posición si estás más abajo. Se pide como mucho cada 60 s.
  **Para encenderlo hay que agregar una columna a la vista `leaderboard` de Supabase**:
  `(data->>'ofrendaPts')::numeric AS ofrenda_pts`. Hasta que esté, la ventana lo dice en vez de
  romperse.
- **Ítems de la bolsa rediseñados**, que era lo que no convencía al diseñador: el ícono flota
  sobre un degradé suave en vez de un fondo blanco plano, la cantidad pasó a ser una chapita
  oscura (antes era texto claro sobre sprites claros, se perdía: ahora 14,8:1 de contraste), y
  **cada familia tiene su color de borde** — recurso, semilla, pez, plato, herramienta — para
  reconocer una casilla sin leer el tooltip. Mismo criterio en la barra rápida.

### Los edificios salen del menú (10/8)
El menú tenía atajo directo a la **Tienda (O)**, la **Herrería (K)** y el **Granero (B)**, así
que se podía usar cualquiera de los tres sin acercarse ni construirlos. Se sacaron los tres
botones y sus teclas: ahora se entra clickeando el edificio en la granja, que es lo que le da
sentido a haberlo construido. El tutorial no se rompe — solo resalta el panel si ya está
abierto, y su flecha apunta al edificio, no al menú.

### Fase 4 — Tienda de adornos, parcelas y GOD HAND

Los tres van en la **misma pestaña "Adornos"** de la Tienda, como pedía el documento.

- **8 adornos** para decorar: valla, cantero de flores, farol, banco, espantapájaros, fuente de
  piedra, estatua dorada y cerezo en flor. No dan **ninguna** ventaja — son para que la granja
  se vea linda y para los eventos de "la más bonita" que vienen después. Se compran en la
  Tienda, quedan en una bolsa aparte y se colocan desde el modo edición, donde se arrastran
  como cualquier otra cosa. Tope de 40 puestos. Los seis primeros se pagan en plata y los dos
  caros en $Golden.
  **El arte va en la Fase 6**: por ahora cada uno se dibuja por código, con la paleta de los
  edificios, para poder probar el sistema entero (comprar, poner, guardar, levantar) sin
  depender de PixelLab.
- **Parcelas con plata o con $Golden**, a elección. El precio en $Golden se calcula desde el de
  plata con un cambio fijo, así se toca un solo número. Tiene un piso de 5 $Golden: sin él, la
  primera salía **1 $Golden**, o sea regalada.
- **GOD HAND**. Se compra una vez y queda para siempre. Mientras la tengas, al volver al juego
  las parcelas que quedaron **vacías** aparecen ya sembradas con la semilla que tenías elegida,
  gastando esas semillas — y el crecimiento **cuenta desde que te fuiste**, no desde que
  volvés. Para eso el guardado ahora anota la hora de la última sesión. No cosecha: eso sigue
  siendo del jugador. Solo saltea el paso aburrido.

**Probado en Node**: comprar, colocar y levantar adornos deja los contadores coherentes;
comprar parcelas con las dos monedas suma bien; y la GOD HAND, con 3 h de ausencia simuladas y
6 parcelas (4 vacías), sembró exactamente esas 4, descontó 4 semillas y les puso el reloj
corrido 3 horas.

12 números nuevos en el panel de balanceo (820 entradas, ninguna rota).

### Fase 5 (primera mitad) — La Zona Negra partida en mapas

Era **un solo bosque** con los 17 monstruos repartidos por profundidad: la rata al lado del
dragón. Ahora son **cuatro mapas encadenados**, cada uno con su familia de bichos, su piso y su
nivel de entrada:

| Mapa | Combate | Monstruos | Árboles |
|---|---|---|---|
| Pantano | 1 | rata, murciélago, larva | 28 |
| Cañón de Piedra | 10 | baba, araña, goblin, orco, lancero | 14 |
| Grietas de Fuego | 22 | esqueleto, golem, hombre lobo, guerrero, trol | 8 |
| Guarida del Dragón | 35 | guardia de orcos adelante · ogro, espectro, demonio · **el jefe al fondo** | 4 |

- Todo sale de **`ZONA_DEF`** en state.js: piso, densidad de árboles y qué bichos viven en cada
  uno. Agregar un mapa nuevo es agregar una entrada, no tocar `forest.js`.
- **Teleports**: se avanza por el portal del fondo a la derecha y se vuelve por el de la
  izquierda. Desde el primer mapa, la izquierda es la granja. El teleport avisa el nivel que
  pide y no te deja pasar si no lo tenés.
- **−40% de árboles**, como pedía el doc: de 46 fijos a la densidad de cada mapa. La guarida es
  roca y fuego, casi sin vegetación.
- **La guardia de orcos antes del jefe**: en la guarida los orcos, lanceros y guerreros están
  en la primera mitad del mapa y el dragón al 90% del fondo. Hay que abrirse paso.
- **Esencia oscura**, el recurso que **solo** sale acá abajo: no se compra, no se cultiva y no
  lo dan los animales. Cae más cuanto más hondo — medido sobre 1000 monstruos: 100 en el
  pantano, 217 en piedra, 418 en fuego, 763 en la guarida. El jefe suelta unas 6 de una.
- El **menú de mapa** ahora lista los cuatro, con cuál pide qué nivel y en cuáles ya estuviste.
- De paso: los textos de botín volvieron a decir el nombre del recurso. Usaban el emoji, que se
  había perdido del archivo, así que se leía "Venciste a Rata. Soltó: +3".

### Fase 5 (segunda mitad) — Clanes y asalto al Dragón

Las cuatro decisiones abiertas se resolvieron así, y el porqué importa más que el qué:

- **El asalto NO es en tiempo real.** El clan abre el asalto y el Dragón queda con una barra de
  vida **compartida**, guardada en Supabase. Cada miembro entra a la Guarida cuando puede y le
  pega; su daño se descuenta de esa barra. Motivo: el juego ya es asíncrono (granja offline,
  incursiones de un clic), un raid en vivo obligaría a montar salas de combate — hoy solo
  existen en la plaza —, y con pocos jugadores conectados a la vez **no se juntaría nunca**.
  Encima el server es el plan gratis de Render: no conviene sostener una sala de combate abierta.
- **Hacen falta 3 miembros**, no 5. Con 5, un clan chico no llega nunca y la Guarida queda
  muerta. Con 3 y 60.000 de vida compartida, son 20.000 cada uno.
- **El botín se reparte proporcional al daño, con un piso del 10%.** Sin proporción aparece el
  que se cuelga del trabajo ajeno; sin piso, el que recién empieza no vuelve más.
- **Tope de 10 por clan**, y se entra con un **código de 6 letras** en vez de invitaciones
  nominales: es lo más simple de compartir por Discord, que es donde está la comunidad.

Detalles de implementación que valen la pena:

- **Todo pasa por funciones de Postgres**, no por INSERT sueltos. Dos razones: si el cliente
  pudiera escribir el daño, cualquiera se anotaría el asalto entero desde la consola del
  navegador; y el descuento de vida tiene que ser **atómico**, o dos golpes simultáneos se
  pisan y uno se pierde. Las cuatro tablas quedan con RLS y solo lectura.
- **El daño se manda de a tandas cada 2 segundos**, no golpe por golpe: una llamada de red cada
  2 s por jugador es lo que aguanta el plan gratis.
- El Dragón del mapa **ya no muere solo**: su sprite no tiene vida propia, la barra que se ve es
  la del clan. Sin clan o sin asalto abierto, no le entra daño y el juego lo dice.
- Si el asalto ya está vencido al entrar, el Dragón no aparece y avisa que pases a cobrar.

El SQL está en **`sql/clanes_y_asaltos.sql`**, listo para pegar entero: cuatro tablas, seis
funciones, los permisos y un bloque de prueba al final.

Panel de balanceo: 832 entradas, ninguna rota.

### Fase 6 (primera parte) — El bestiario, por fin en el juego

Las 11 criaturas estaban generadas y animadas en PixelLab desde hace días, pero nunca habían
llegado al juego: `bestiario.json` estaba vacío y cada bicho se dibujaba con su ícono
provisorio. Hoy entraron las 176 imágenes.

- Le faltaba **la animación de ataque a la araña**, que era el único hueco real. Generada. La
  primera salió apuntando al sur y el juego usa sureste, así que se agregó esa dirección.
- **`tools/build-bestiario.py`**, nuevo, hace la integración completa. Tres decisiones que
  importan:
  - **Recorta a 4/6/6 repartiendo parejo.** PixelLab entrega 5 de idle y 7 de walk y ataque.
    Cortar los últimos dejaría la animación a mitad de camino y saltaría al reiniciar el ciclo;
    eligiendo cuadros repartidos a lo largo de toda la secuencia, el ciclo cierra.
  - **Recorta todos los cuadros con un marco COMÚN**, sacado de la unión de los 16. Si se
    recortara cada uno por su cuenta, el bicho bailaría entre cuadros: cada frame quedaría
    centrado distinto.
  - **Baja la resolución al doble del tamaño real de cada criatura.** Venían de hasta 180 px y
    el más grande se dibuja a 96.
- **Los 176 cuadros van al ATLAS**, no sueltos. Sueltos eran 176 pedidos extra al server
  gratis y 1,8 MB; en el atlas son **cero pedidos y 204 KB** (el atlas pasó de 453 a 657 KB,
  4096×1058). De paso desaparece el riesgo que tenía el arranque: si el manifiesto tardaba más
  de 1,8 s, los PNG no se pedían y los mobs quedaban estáticos toda la sesión. Ahora el arte ya
  viene en el atlas, así que llegue o no el manifiesto, las animaciones se crean igual.
- `boot.js` ya tenía cableadas las animaciones con esos nombres exactos: no hubo que tocar una
  línea de código del juego.

### Fase 6 (segunda parte) — Los 4 animales del Establo, definitivos

Eran los provisorios dibujados por código, y desde que andan sueltos por la granja se ven todo
el tiempo: eran lo que más cantaba. PixelLab devuelve 16 variantes de cada uno y se eligió una:
**alpaca** crema parada de perfil, **conejo** blanco sentado, **toro** marrón de cuernos cortos
y **jabalí** pardo con los colmillos claros. Los cuatro con la paleta cálida del resto, para
que no peleen con los edificios nuevos.

Van al atlas como todo lo demás (`?v=28`), y los provisorios quedaron respaldados en
`_backup_animales_provisorios/`.

Falta de la Fase 6: adornos, mazo, efectos por arma, íconos de materiales, las 20 piezas de
armadura y los cosméticos.

### Fase 6 (tercera parte) — Los 8 adornos de la Tienda, definitivos

Eran lo último que quedaba dibujado por código. Ahora los ocho tienen arte de PixelLab, con la
misma paleta cálida de los edificios: **valla** de tablones con pasto en la base, **cantero** de
flores amarillas en cajón de madera, **farol** de pueblo con luz cálida, **banco** de tablones
con respaldo, **espantapájaros** de sombrero de paja y brazos abiertos, **fuente** redonda de
piedra, **estatua** dorada sobre pedestal y **cerezo** en flor.

El alto en pantalla de cada uno lo fija `DECO_ALTO` (state.js) y el ancho sale solo, respetando
la proporción del sprite: así el farol no queda del porte de un árbol y la valla no tapa media
parcela. `dibujarAdorno` usa el sprite si está y, si falta, cae al dibujo por código de antes,
o sea que no hay forma de que esto rompa nada. Los arma `tools/build-adornos.py` y van al atlas
(`?v=29`, 549 sprites).

**Bug que salió de paso:** al colocar un adorno el cartel decía *"arrastralo a donde quieras"*,
pero no existía el código para agarrarlos — ni para moverlos ni para sacarlos. Una vez puesto un
adorno quedaba clavado ahí para siempre y ocupando uno de los 40 lugares. Ahora en modo edición
se arrastran como cualquier objeto (celda verde libre / roja ocupada, y si está ocupada vuelve a
su lugar) y con **clic derecho** vuelven a la bolsa. Los adornos se miran ANTES que el resto al
buscar qué agarraste, porque son chicos y suelen quedar encima de una parcela.

### Fase 6 (cuarta parte) — Materiales y mazo

Los últimos ítems de la bolsa que seguían saliendo con **emoji** en vez de ícono ya tienen arte:
**fibra** (ovillo crema), **pelaje** (piel blanca), **cuero** (rollo curtido en tono claro, para
que no se confunda con el tronco de madera), **colmillo**, **esencia rúnica** (cristal violeta con
la runa grabada) y **esencia oscura** (orbe negro con humo). Se sumaron a `RES_SPRITE`, que es lo
único que hacía falta: el resto de la interfaz ya los pedía.

Aparte, el tipo de arma **Mazo** usaba prestado el ícono del pico de piedra; ahora tiene el suyo.
Atlas `?v=30`, 556 sprites.

### Fase 6 (quinta parte) — Las 20 piezas de armadura de la Curtiduría

4 sets × 5 piezas (yelmo, pecho, pantalones, botas, guantes), con el estilo del granero que
aprobó el diseñador: chibi redondeado de libro de cuentos, colores cálidos saturados y contorno
grueso. Cada set se lee de un vistazo por su material:

- **Fibra** (alpaca, ligera): lana crema tejida con correas beige.
- **Piel** (conejo, vitalidad): forro de piel blanca sobre cuero gris.
- **Cuero** (toro, equilibrada): cuero marrón curtido con hebillas de bronce.
- **Colmillo** (jabalí, pesada): cuero oscuro, placas de hierro y colmillos de marfil.

La lista de la Curtiduría era **puro texto**: 20 renglones idénticos donde solo cambiaba el
nombre. Ahora cada fila lleva su casillero con el ícono, igual que la Herrería y la Cocina.

Estos 20 PNG NO van al atlas a propósito: el atlas es para lo que dibuja el juego en pantalla, y
estas piezas solo se ven en la ventana HTML de la Curtiduría, que carga los archivos directo.
Meterlos habría engordado el atlas —que baja TODO el mundo al entrar— para nada.

### Fase 6 (sexta parte) — La mascota: la gallina "Pinta"

Era uno de los coleccionables del cofre de login que existía **solo como texto**: lo ganabas, se
guardaba en la lista de cosméticos y no se veía en ninguna parte. Ahora es de verdad.

Una gallina moteada crema y marrón pasea sola por la granja, igual que los animales del Establo
pero más chica (la mitad de una celda) y más inquieta: se para a picotear y se va a otro lado
cada segundo y medio. No produce nada ni come: es puro lucirla.

Se prende y apaga desde una sección **Mascota** nueva en la ventana de Cosméticos, junto al
título, el color del nombre, el marco y el aura. Si no la tenés, la sección explica de dónde sale.
Atlas `?v=31`, 557 sprites.

### Fase 6 (séptima parte) — Los dos adornos del cofre de login

Los últimos coleccionables del cofre de 7 días que existían **solo como texto** ya son adornos
de verdad: caen en la bolsa al ganarlos y se colocan desde el modo edición.

- **Espantapájaros dorado**: versión brillante del espantapájaros común (48 px de alto).
- **Farolito de luciérnagas**: frasco de luciérnagas colgado de un poste (40 px). Es el único
  adorno animado: el resplandor titila por código (tween sobre un círculo de luz).

El código ya estaba preparado del 10/8 (DECO_ORDER, DECO_ALTO, COS_ADORNO, `dibujarAdorno` con
la animación del farolito): solo faltaba el arte. Se bajó con `descargar_adornos_cofre.ps1` a
`pixellab_adornos_cofre`, y `tools/build-adornos.py` ahora también procesa esa carpeta (recorte
del aire + guardado a 2x del alto en pantalla). Atlas `?v=32`, 559 sprites.

### Efectos por arma en el Bosque

Hasta ahora todo golpe se veía igual: la chispita blanca genérica. Ahora cada tipo de arma
pega distinto, todo dibujado por código (cero arte nuevo, cero peso):

- **Espada**: estela de tajo que barre desde el lado del héroe. Si fue crítico, naranja y
  más grande.
- **Hacha**: cuña de hachazo que baja en diagonal + 5 astillas que saltan del impacto.
- **Mazo**: onda aplastada que se expande por el piso, polvo que se levanta y una mini
  sacudida de cámara (90 ms). Al aturdir, 3 estrellitas orbitan la cabeza del mob los 2,1 s
  que dura.
- **Arco**: salpicadura roja al clavarse la flecha, y en cada tic del sangrado caen gotitas
  del cuerpo.

A puños o con daño de habilidad sigue la chispa de siempre. Sin cambios de balance: es
solo lectura visual de lo que ya pasaba.

### Las 3 skins que faltaban (cofre + nivel 50)

Los últimos cosméticos que existían solo como texto en la lista. Se prenden y apagan desde
tres secciones nuevas de la ventana de Cosméticos (Sombrero / Suelo / Granja), con el mismo
patrón Puesto/Guardado que el aura:

- **Sombrero de paja brillante** (cofre): el granjero lo lleva puesto en la granja, acompaña
  la cabeza y se da vuelta con él. Arte PixelLab (`skin_sombrero`, dorado con moño rojo);
  mientras el PNG no esté integrado hay un respaldo dibujado por código. "Brillante" = late
  suave en alfa.
- **Camino de pétalos** (cofre): al caminar vas dejando pétalos rosas (3 tonos, rotación al
  azar, uno cada ~14 px) que se desvanecen en ~3,5 s. Por código, cero arte.
- **Granja legendaria** (nivel 50, o si el texto está en tus cosméticos): la valla entera se
  tiñe de dorado y cada 0,7 s una chispa de oro aditiva flota y se apaga en algún punto de
  la granja. Se apaga al instante al guardarla.

El guardado viejo no se rompe: `cosEq` gana los tres campos con default apagado. La carga
tolera que `skin_sombrero.png` no exista todavía (el loader abandona al 2º intento).

### Íconos oficiales + el arte del sombrero, integrados

Bajados de PixelLab e integrados al atlas (`?v=33`, 560 sprites):

- **Espada de Madera** (`sword_wood` y su copia `arm_espada_madera`): dejó de ser la de
  hierro recoloreada — ahora es una espada de entrenamiento de madera clara con veta.
- **Pico de Hierro** (`pick_iron`): dejó de ser el de piedra con motas — cabeza de hierro
  biselada con mango de madera.
- **Sombrero de paja brillante** (`skin_sombrero`, 49×40): dorado con moño rojo. Reemplaza
  al respaldo por código de la skin.

### Feedback del diseñador por Discord (10/8, 21:33)

**1. "Compro los adornos pero no sé a dónde se van."** Iban a la bolsa, pero nada lo decía
con claridad. Ahora: la sección Adornos de la Tienda muestra **En bolsa: N · Puestos: N/tope**
y, si tenés algo sin poner, un botón **"✏️ Ponerlos ahora"** que cierra la Tienda y abre el
modo edición con el selector listo. El toast de compra también lo dice ("en tu bolsa"). Y el
God Hand comprado avisa: "Ya está trabajando — actúa solo cuando volvés al juego".

**2. "12 parcelas es muy poco, que compre la gente a placer — máximo 60."** Hecho:

- `PLOT_MAX = 60` (un solo número para tocar). La Tienda muestra x/60.
- Las primeras 12 siguen igual (la grilla de siempre, mismo precio duplicándose). De la 13
  a la 60, cada parcela nueva **nace en una celda libre** cerca del centro (misma regla que
  los adornos, esquivando laguna, edificios y lo ya puesto) y **se mueve desde el modo
  edición** como cualquier objeto. Su posición viaja en `layoutPlots`, el mismo mecanismo
  que ya guardaba las parcelas movidas — los guardados viejos no se enteran.
- **Precio después de la 12**: duplicar cada vez hacía la 60 imposible (2^54 × base). Ahora
  sube `PLOT_EXTRA_SUBA = 1.12` (+12%) por parcela: la 13 sale 14.336 de plata, la 30 unas
  98 mil, la 60 unos 2,6 millones (o su cambio en $Golden). Otro número único para el
  diseñador.
- Las recompensas que regalan parcela (la ficha del pase) también respetan el tope nuevo.

---

## Día 16 — Martes 11/08 · Los 19 puntos de fixs.docx

El diseñador mandó su lista de fixes probando la build en vivo. Estado: **todos resueltos**
salvo la parte de arte que espera descarga (mazos y God Hand).

### Bugs
- **#18 — Comprar parcela y F5 la borraba.** `save.js` seguía recortando `plotsOwned` a 12
  al cargar: comprabas la 13 y el refresh te la "devolvía". Ahora respeta `PLOT_MAX`.
- **#15 — La flecha del tutorial no seguía al edificio movido** en edición (pedía F5).
  Ahora `updateTutoArrow()` se rehace al soltar el edificio.

### Colocación (#14 y #17): nada se "tira" solo a la granja
- La parcela comprada (13+) ya **no aparece sola en una celda**: queda pendiente en la zona
  de edición, con un botón **"Poner parcela (N)"** en la barra.
- Adornos y parcelas se colocan con **"colocar con clic"**: apretás Poner, hacés clic en la
  celda que quieras (verde si entra), clic derecho cancela. Chau "primer hueco libre".

### Balance de la Zona Negra (#1, #2, #8)
- **Esencia oscura: SOLO la dan los mobs de nivel 10-12** (araña y goblin, en el Cañón de
  Piedra). Antes caía por zona, de cualquier bicho. El botín del asalto al dragón no cambia.
- **Drops más raros**: `DROP_CHANCE_MULT = 0.6` multiplica la chance de todos los materiales
  no garantizados (la plata por kill sigue fija). Un número único para el diseñador.
- **Los mobs ya no sueltan piezas de armadura**: la armadura sale solo de la Curtiduría.

### Interfaz y calidad de vida
- **#4** — Fuente y farol un 40% más grandes (42 y 56 px), sprites reprocesados a 2x.
- **#5** — Pase de batalla con botón **"🎁 RECLAMAR TODO (N)"**: junta lo pendiente de todos
  los niveles alcanzados (free y VIP) de un clic.
- **#7** — La armadura crafteada **ahora se ve**: el panel de Equipo lista tus sets de la
  Curtiduría con piezas, defensa, bono de set y botón Equipar.
- **#9** — El arma **equipada ya no ocupa lugar en la bolsa** (vive en el panel de Equipo).
- **#10** — **Menú fijo**: opción "📌 Menú fijo" en el propio menú; queda desplegado y no se
  cierra al elegir ni al hacer clic afuera. Sobrevive al F5.
- **#16** — Pescar **ya no regala buffs**: el pez raro/épico va a la bolsa y el buff sale de
  cocinarlo. La plata del común y el premio del legendario quedan (son botín).

### Animales (#11, #12, #13)
- **Estrellitas de celebración** al recoger materiales (8 estrellas doradas + el premio).
- **Alimentar sin abrir ventanas**: clic derecho sobre el animal en la granja lo alimenta
  (la función existía pero solo dentro del Establo y nadie la encontraba).
- **Las vallas colocadas frenan a los animales**: la celda de una valla ya no es transitable.

### GOD HAND 2.0 (#19) — el cropper NFT completo
- **Inventario propio**: 6 espacios × 50 semillas (300 en total). Ventana nueva (desde la
  Tienda → "✋ Cargar semillas") para cargar y vaciar espacios.
- **Ciclo completo**: mientras no estás hace SIEMBRA → COSECHA → RESIEMBRA en las parcelas
  que estaban vacías, consumiendo su propio inventario, y te entrega todo al volver (log +
  celebración). Si una siembra queda a medias, encontrás la parcela creciendo.
- **Tarifa**: 100 de plata la primera hora trabajada, +10% cada hora siguiente
  (`GODHAND_PLATA_HORA`, `GODHAND_SUBA_HORA`), tope 24 h por ausencia. Si la plata no
  alcanza, cobra hasta donde hay.
- **Arte NFT**: guantelete dorado bajando de una nube con rayos (a integrar con el resto).

### Segunda ronda del diseñador (misma tarde)
- **La armadura equipada ahora llena los CASILLEROS del área de equipo** (la veía solo en la
  lista de abajo). Yelmo→Casco, Pecho→Armadura, Botas→Botas, y **Guantes y Pantalones dejaron
  de ser "próximamente"**: son casilleros reales que llena el set de la Curtiduría. El gear
  viejo de loot conserva prioridad en su casillero si existe.
- **Edificios: quedan como están** (decisión final tras ida y vuelta). Los v3 generados
  duermen en `pixellab_edificios_v3` por si se retoman.

### Arte integrado (atlas `?v=35`, 561 sprites)
- **#6 — Mazos de verdad**: los `arm_mazo_*` eran un pico. Ahora son mazos de guerra, uno
  por rareza con la cabeza del material (madera, piedra, bronce, oro, diamante). El ícono
  genérico `mazo` (pestaña Combate) pasó a ser el de madera.
- **godhand.png**: el guantelete dorado bajando de la nube — se ve en la Tienda y donde el
  juego pinte la clave `godhand`.

---

## Día 17 — Miércoles 12/08 · El set de edificios "mercadillo" + el árbol nuevo

Sesión de dirección de arte mano a mano. Nació de un mercadillo suelto que gustó
("ni cute ni rústico") y terminó siendo el estilo de todo el pueblo, generado EN CADENA
como estados de un mismo objeto de PixelLab para mantener paleta y vista.

Reglas del set, dictadas en vivo: vista frontal con la leve caída top-down del juego ·
techos de madera al tono de las paredes (nada de colores de toldo) · sin césped ni
plataformas de base · **cada edificio se identifica por sus productos AFUERA**, como un
mercadillo · **ninguna forma de techo repetida**.

Integrado (atlas `?v=37`, 561 sprites):

- **Mercadillo** (el origen): toldo rayado rojo/blanco, balanza de bronce, cajones de
  verdura y pan.
- **Granero**: gambrel de madera (v2: sin el rojo del toldo, sin plataforma), portón con
  cajones y barriles.
- **Herrería**: techo de un agua con alero, fragua encendida, yunque y armas expuestas
  (conserva su chimenea: es su identidad).
- **Cocina**: techo curvo abombado, mesa con panes y tartas, sartenes colgando.
- **Establo**: bajo y alargado, carretilla con fardos, herraduras — sin chimenea.
- **Curtiduría**: techo a cuatro aguas, pieles en bastidores, barril de tinte — sin chimenea.
- **Ofrendas**: tras varias iteraciones (abierta → piedra → frontal), quedó la de paredes
  de tablones oscuros con el nicho iluminado: dos figuras doradas rezando y el cuenco.
- **Horno: NO se tocó** — el domo actual queda (decisión del 12/8).
- **El ÁRBOL del que sale esa madera** + su progresión completa de talado (corte leve,
  corte profundo, pelado con brotes, tocón con anillos), todos LIMPIOS: sin suelo ni
  hojas caídas — esas piezas se harán aparte para reutilizarse. `tree_stump_leaves`
  apunta al tocón limpio.

Los edificios v3 oscuros (estilo Curtiduría) y el set intermedio quedaron descartados;
sus PNG duermen en `pixellab_edificios_v3` y `pixellab_edificios_curtiduria`.

### Los edificios "EN OBRA" (misma tarde) — chau edificio gris

Un estado en construcción para cada edificio del set, bien desarmado (nivel aprobado con
la cocina de prueba): cimientos y parantes, ningún techo, materiales apilados y los
objetos típicos de cada uno esperando en el piso — el toldo del mercadillo enrollado, el
yunque sin colocar, las figuras doradas de Ofrendas en un cajón, el primer anillo del
domo del horno.

**Código**: el edificio sin construir ya no se dibuja gris semitransparente — muestra su
`build_*` a todo color; al pagar la receta salta al edificio terminado con lluvia de
estrellitas. Claves `build_*` en el atlas y con respaldo suelto en boot.js.

Después se sumó el **Altar de Runas en obra** (generado en SU grupo de estilo original):
la base circular a medias y los monolitos tumbados con las runas talladas pero APAGADAS —
se "encienden" recién al construirlo. Con esto **ningún edificio queda gris**: los 9 de
BUILD_DEF tienen su obra. El gris sobrevive solo en árboles/rocas bloqueados.

### Pulido en vivo (viendo el juego con todo puesto)

- **Sombras de edificios: FUERA.** Se probó acotarlas (2 celdas, pegadas al borde) y ni
  así — el arte nuevo apoya directo sobre el pasto. Solo el dummy conserva la suya.
- **Tamaños emparejados** (`config.js`): antes 1,6-3 celdas pensadas para el arte viejo;
  ahora granero/establo 2,5 · herrería/cocina 2,2 · horno/curtiduría/ofrendas/altar 2 ·
  mercadillo 1,8. La cocina (sprite alto) era la gigante del pueblo.
- **El pasto recoloreado al verde de las copas** (pedido: "césped color similar a los
  árboles"). Corrimiento HSV medido de la copa del árbol nuevo aplicado a `grass_a/b/c`
  y a `deco_pasto` (los yuyitos quedaban amarillos), más el color de fondo de respaldo
  `#328032`. grass `?v=5`, decos `?v=4`.

- **La cerca perimetral a la madera del set** (pedido: "que se parezca a la madera de los
  edificios"). Transferencia de paleta: cada píxel de `fence_*` pasó al tono de madera del
  granero con el brillo más parecido (24 tonos), conservando los contornos oscuros.
  fence `?v=3`, corner `?v=4`, y de paso se subieron las versiones sueltas de los árboles
  nuevos que seguían con número viejo.

### BLUEPRINTS: la construcción nueva (la feature grande del día)

Idea del usuario, implementada completa. Los edificios ya no aparecen grises en una
posición fija esperando que pagues la receta — ahora **no existen hasta que los levantás**:

1. **Al subir de nivel ganás el PLANO** del edificio que toca (`PLANO_NIVEL`: herrería 1,
   horno 3, cocina 5, establo 6, altar 7, curtiduría 8, ofrendas 10 — números del
   diseñador). Cae a la bolsa como ítem: pergamino envejecido con el dibujo técnico del
   edificio en tinta azul y sello de lacre (7 planos generados en PixelLab, arte aprobado).
2. **Clic en el plano → elegís dónde** (el "colocar con clic" de siempre; valida 3 celdas
   libres). Aparece la OBRA del edificio con un cartel flotante: `🔨 Madera 0/50 · Piedra 0/30`.
3. **Cada clic en la obra DEPOSITA** los materiales que tengas (el $Golden del Altar cuenta
   como material más). Los contadores bajan de a poco — se puede construir en cuotas.
4. **Al completar**: lluvia de estrellitas, celebración y la obra salta al edificio
   terminado. La posición elegida queda para siempre (y se puede mover en edición).

Detalles de compatibilidad: los guardados viejos reciben por `planosSync()` los planos de
todos los niveles ya pasados; los edificios ya construidos no se tocan; los ocultos no
colisionan ni reciben clics, y la flecha del tutorial no apunta a edificios sin colocar
(los textos de los pasos de construcción ahora mencionan el plano). El depósito respeta
el requisito de nivel de cada edificio.

### Árboles con retoño · vetas por nivel — el último gris fantasma, fuera

Tras varias iteraciones (enterradas tipo "huevo" → por mineral → hundidas → decisión
final), el modelo quedó así:

- **Árbol bloqueado = RETOÑO** silvestre (tallito con tres matitas, derivado del árbol
  nuevo, al 55% del ancho, a todo color). Se "cultiva" pagando la madera de siempre y
  **CRECE** hasta el árbol adulto (tween con rebote + hojitas que vuelan).
- **Vetas/piedras: TODAS a la vista y a todo color, sin fantasmas ni compra.** El freno
  es de NIVEL: al intentar picar una que no corresponde salta el aviso "🔒 necesitás
  granja nivel X (tenés Y)", también en el cartel de acercarse. Tabla `NIVEL_ROCAS =
  [1,3,5,8,12,16]` por orden de aparición (números del diseñador). Quien pagó
  desbloqueos con el sistema viejo los conserva.

El paso del tutorial "ampliá la granja" se cumple cultivando un árbol o usando una
segunda veta habilitada. Las versiones "hundidas" por mineral quedaron generadas en
PixelLab por si se retoman.

### La GUARDIA del tutorial — imposible romperse la cadena

Reporte del usuario: el jugador podía desviarse y fundirse los recursos que el objetivo
activo necesitaba (vender las papas y gastar la plata en otra cosa = cadena trabada).
Ahora hay una guardia central (`tutoGuardia`) que NO bloquea el juego — frena solo el
gasto que haría imposible el objetivo de ahora, con un aviso 🎯 que devuelve al camino:

- Paso "juntá X": ningún gasto puede bajarte de la meta (madera, piedra o plata).
- Paso "comprá semillas de papa": esa plata queda reservada.
- Paso "construí X": los materiales de la receta quedan reservados hasta terminar la obra.
- **Excepción clave**: comprar semillas NUNCA se bloquea por plata — son el motor del
  loop que genera la plata que el objetivo pide (sin esto, la guardia creaba el softlock
  que quería evitar).

Cubre: semillas, herramientas, picos, armas, adornos, parcelas, fundir barras, ampliar
bolsa y cultivar árboles. Verificada con simulación de 7 escenarios (todos correctos).

### El ACELERADOR del tutorial + auditoría anti-exploit

Pedido del usuario: que los objetivos se cumplan EN EL MOMENTO (nadie espera 9 minutos
una papa en su primer sesión), pero sin abrir agujeros de plata infinita.

**Acelerador quirúrgico** (`tutoBoost`, timers a ~1/8): solo corre el timer que el
objetivo ACTIVO necesita — papa rápida en los pasos del arranque (plantar → cosechar →
vender → comprar → replantar → juntar la plata del hacha), árboles rápidos en los pasos
de madera, rocas en los de piedra, horno en el de fundir. Todo lo demás, a tiempo real.

**Por qué no se puede exploitear** (auditoría de los 33 pasos):

1. Los pasos "juntá X" se COMPLETAN SOLOS al llegar a la meta → la ventana de aceleración
   se cierra sola, no se puede quedar a vivir en ella.
2. **El agujero real que apareció y se tapó**: vender el recurso del objetivo para quedar
   en 9/10 mantenía el boost vivo para siempre (talar rápido → vender → talar). Ahora la
   guardia también bloquea la VENTA (Mercado y P2P) del recurso pedido por debajo de la
   meta.
3. La papa acelerada rinde ~3 de plata y el cupo diario de semillas ya acota el volumen.
4. Los gates largos quedan SIN boost a propósito: son ritmo, no fricción — juntar 1.000
   para Armas, nivel 5 para la Cocina, matar 5 criaturas.

Con guardia + acelerador + candado de venta, la cadena fluye al ritmo del jugador y no
hay bucle de dinero infinito.

### EL EMBUDO (13/8) — primer playtest del usuario, tres arreglos

1. **Planos a su tiempo**: con TESTEO el nivel corre tanto que el plano del Horno caía
   junto al de la Herrería (dos pergaminos en la bolsa y confusión). Ahora, durante el
   tutorial cada plano cae **cuando su paso llega** (`PLANO_PASO`): Herrería en su paso,
   Horno al arrancar su cadena de materiales, Cocina y Altar ídem. Los que no están en
   el tutorial (Establo, Curtiduría, Ofrendas) esperan a que termine. Y el saneo
   retroactivo retira de la bolsa los que hubieran caído antes de tiempo.
2. **Acciones bloqueadas hasta que el tutorial las presenta** (`tutoDesbloqueado`):
   craftear herramientas, picos y armas están cerrados hasta su paso (y quedan abiertos
   para siempre después); adornos, parcelas extra y GOD HAND se abren al terminar el
   tutorial. Cada bloqueo avisa con 🎯 hacia dónde mirar. Nota de diseño: las
   herramientas NO podían bloquearse después de su paso porque las hachas se consumen y
   los pasos de madera las necesitan — por eso es "cerrado hasta su paso", no "solo
   durante su paso".
3. **"Coloqué el plano y salió el edificio terminado"**: era TESTEO — regala materiales
   al empezar, así que el primer clic en la obra depositó todo y la completó al
   instante. Con `TESTEO = 0` el jugador arranca vacío y la obra vive lo que tiene que
   vivir.

`TUTO_VER` subido a 6 (la cadena cambió de semántica): los progresos de prueba viejos
se resetean a un estado consistente. Flujo verificado con simulación de 4 momentos.

### TERRENO SILVESTRE — la última pieza diegética (13/8)

La parcela bloqueada era el último elemento gris del juego. Se probó un "terreno
silvestre" nuevo de PixelLab (`plot_wild`) pero en la grilla quedaba tupido y
repetitivo — decisión final: **el parche clásico** (`plot_blocked`: tierra con ramas,
piedritas y yuyos) **a todo color**, sin el tinte gris ni la transparencia. Al
desbloquearla, el **DESBROCE**: yuyos verdes y ramitas marrones salen volando con el
destello de siempre, y aparece la tierra arada. (`plot_wild` queda en el atlas `?v=44`
por si se retoma.) Se limpiaron además las cargas de las `rock_buried_*` descartadas
(evita 404s en cada arranque).

Con esto el inventario diegético queda COMPLETO: edificios en obra con materiales,
árboles en retoño que crecen, vetas a la vista con gate de nivel, y parcelas
silvestres que se desbrozan. Cero sprites fantasma en todo el juego.

### EMBUDO ESTRICTO — lista blanca por paso (13/8, 3ª vuelta del playtest)

El embudo anterior cerraba crafteos y compras, pero el LOOP BASE seguía abierto: durante
"colocá el plano" se podía plantar, cosechar acelerado, vender, talar y picar — grindeo
fuera de guion. Decisión final del usuario: **estricto TOTAL** — los 33 pasos tienen su
lista blanca (`TUTO_PERMISOS`): cada objetivo permite SOLO su acción más las
estrictamente necesarias para cumplirlo (craftear hachas cuando hay que talar porque se
consumen; el loop entero cuando el objetivo ES juntar plata; cocinar/comer en los pasos
de combate para sobrevivir; juntar materiales cuando la receta del paso los pide).
Cualquier otro intento: "🎯 Ahora toca: <objetivo>". Al terminar el tutorial, todo
libre. Gates en: interacciones de granja (plantar/talar/picar/pescar/portal/dummy),
vender, comprar semillas, craftear herramientas/picos/armas, fundir y cocinar.
Verificado con recorrido anti-softlock de los 34 casos (cada paso puede cumplirse a sí
mismo) + prueba de hermeticidad en build_store.

### La GUÍA completa dentro de las interfaces + el telón del reinicio (13/8)

El resaltado del botón exacto (`tutoHighlight`, clase `.tutohl`) existía pero solo corría
al cambiar de paso: si abrías la ventana después, o el panel se redibujaba, se perdía.
Ahora la cadena de guía no tiene puntas sueltas:

- **Mundo → menú → panel → botón**: la flecha apunta al edificio; si el objetivo vive en
  un panel sin edificio (Inventario, Pase), se resalta el botón ☰ Menú y la entrada del
  panel; al abrir el panel, el botón exacto brilla al instante (hook en `openOv`) y se
  re-aplica cada segundo aunque el panel se redibuje.
- **Pestañas** (playtest: "vendé papas" con la Tienda abierta en Comprar y nada brillaba):
  si el botón del objetivo vive en una pestaña oculta (`offsetParent === null`), brilla la
  PESTAÑA que lleva a él — Tienda (`shop-*` → `.shoptab`) y Herrería (`forge-pane-*` →
  `.forgetab`); al cambiar de pestaña el brillo salta al botón exacto.
- **2ª pasada — el brillo no se VEÍA**: el JS aplicaba `.tutohl` bien (verificado con
  simulación jsdom), pero la skin de madera de las pestañas trae
  `box-shadow:none !important` (el glow estándar ES un box-shadow) y
  `filter:brightness(.62)` en las inactivas: el CSS lo mataba. Las pestañas ahora tienen su
  propio resaltado: OUTLINE dorado pulsante (`@keyframes ttab`) + brillo pleno.
- **3ª pasada — el botón exacto tampoco se leía** (playtest: la pestaña Vender brilló, el
  botón Vender de la papa no): el anillo semitransparente de `tglow` se pierde sobre la
  madera del botón y la tarjeta crema. Todos los BOTONES marcados usan ahora el mismo
  outline pulsante fuerte que las pestañas (+ brightness 1.12) y la fila sube a outline
  3px naranja (#f5a623) para contrastar con el fondo claro.

### El modo COLOCAR pulido de punta a punta (13/8, pedido por audio)

- **Menú sin separaciones**: los botones del menú desplegable van pegados (gap 0).
- **El plano entra solo a la HOTBAR** al ganarlo (primer hueco libre) además de la bolsa:
  un clic en la barra y ya estás eligiendo dónde levantarlo. Al usarse sale de la barra;
  guardados viejos lo reciben retroactivamente (`planoAHotbar` en `darPlano`); el saneo
  del tutorial también lo limpia de la barra si el plano se retira.
- **La cámara se panea colocando y en edición**: colocar se resuelve al SOLTAR el clic
  (antes era al apretar): arrastre = paneo, clic quieto = colocar. Con nada agarrado, el
  arrastre en modo edición también panea, igual que en el juego normal.
- **Vista previa de celda**: mientras estás colocando, el cursor pinta la celda destino
  (verde libre / rojo ocupada; la obra pinta sus 3 celdas) — antes no había preview.
- **Botón ✕ Cancelar** en la barra de edición mientras hay algo "en la mano" (también
  clic derecho): el plano queda en la bolsa/barra y, si el colocado vino de la bolsa, se
  sale del modo edición solo — lo mismo al terminar de colocar. "Terminar edición" con
  algo en la mano lo suelta sin romper nada. La transición con telón queda SOLO para el
  momento de colocar obra/parcela (que reinicia la escena); entrar a edición no la tiene.
- **2ª pasada — chau pantalla oscura al colocar la OBRA**: el edificio ya vivía en la
  escena (invisible, esperando su plano), así que colocar el plano ahora lo "enciende" EN
  VIVO (`colocarObraEnVivo`): textura `build_*`, posición, letrero, colisiones y
  estrellitas — sin reiniciar la escena. El reinicio con telón queda solo de respaldo
  (`obraColocar(t,col,row,vivo)`) y para las parcelas, que sí reconstruyen la grilla.
- **Fix inmediato del playtest**: la obra en vivo salía OSCURA — el sprite oculto traía el
  gris de respaldo puesto desde el create (tintarNodo corre antes del cambio de textura).
  Ahora `colocarObraEnVivo` hace `clearTint().setAlpha(1)` tras poner `build_*`.

### Guía por FLECHAS + granja limpia + tutorial DESGLOSADO (13/8, por audio)

- **La guía en interfaces pasó de recuadros a FLECHA**: el brillo no se leía sobre la
  madera. Ahora es el mismo triángulo dorado del mundo (`#tuto-flecha-ui`, DOM fijo)
  rebotando sobre el botón/pestaña/entrada del menú — una sola por vez, con la cadena de
  siempre: menú → panel → pestaña → botón. Sigue al objetivo aunque la lista se scrollee
  o la ventana se arrastre (listener de scroll con rAF). El CSS de `.tutohl` se retiró.
- **Letrero de obra y timers solo con el cursor encima**: el cartel de materiales de la
  obra y el texto del timer de los cultivos aparecen solo al apuntarlos (la barrita de
  progreso queda siempre) — misma regla que ya tenían los timers de los nodos.
- **Tutorial v7 — construcción DESGLOSADA hasta la acción mínima** (pedido: "talar tanto,
  picar tanto, colocar, depositar"). Cada edificio del tutorial es ahora su cadena:
  juntá su madera (talando) → juntá su piedra (picando) → colocá el plano (la flecha baja
  hasta el plano en la BARRA rápida, campo `hot`) → depositá los materiales (clic encima).
  Herrería y Altar quedaron desglosados (el Horno y la Cocina ya lo estaban a medias);
  en el Altar el oro y los $Golden se juntan durante el depósito, que deja el loop
  abierto. Piezas nuevas: evento `place_<t>` al colocar la obra, `tutoHecho` reconoce
  obras ya colocadas, `tutoGuardia` reserva materiales también en los pasos `place_`,
  boost de árboles/rocas cubre los pasos nuevos, `PLANO_PASO` entrega cada plano al
  ARRANCAR la juntada de sus materiales. 43 pasos, 43 listas de permisos — verificado
  por script: sin softlocks, sin huérfanos, planos siempre antes de su `place_`.
- **v8 — el ORDEN lógico (playtest inmediato)**: pedía madera "para la Herrería" antes de
  que existiera obra alguna. Ahora cada edificio arranca COLOCANDO el plano (la obra queda
  a la vista con su cartel) y recién después pide juntar y depositar. Tres piezas que lo
  hacen posible: lo YA DEPOSITADO cuenta para los pasos de "juntá" (campo `dep` en
  `tutoTiene` — depositar temprano no traba nada), el plano cae JUSTO en su paso `place_`
  y durante el tutorial manda el paso y no el nivel de granja (con el embudo estricto no
  habría forma de subir de nivel para destrabar la Cocina), y el paso "replantá una papa"
  se retiró: era reiterativo y dejaba una papa plantada que nadie pedía cosechar. 42
  pasos, verificación por script ampliada: place < juntá < depósito en los 4 edificios.
- **v3 — SUB-OBJETIVOS dinámicos (playtest cocina)**: "juntá 20 de madera" con CERO
  hachas no llevaba a ningún lado. `tutoSub()` detecta si podés cumplir el paso activo y,
  si no, antepone la meta previa con guía completa (cartel + flecha del mundo + flechas
  de interfaz + permisos SOLO de esa cadena): sin hachas → "crafteá una en la Herrería";
  sin la plata del hacha → "vendé tu cosecha" o, sin nada que vender, el loop entero de
  la papa (con el boost de crecimiento, para que el desvío no se sienta eterno); pico
  gastado → "reparalo (pestaña Reparar)". Se recalcula solo: resuelto el faltante, vuelve
  el paso original (entra a la firma de tutoSync). Además `plotunlock` quedó permitido en
  los pasos de juntar plata — desbloquear tierras para plantar más es inversión, no
  exploit (el propio playtest lo hizo y estaba bien). Árbol verificado con 7 casos.
- **v4 — la CADENA de la plata eslabón por eslabón (playtest: "vendé cosecha" con cero
  papas en la bolsa)**: `tutoSubPlata()` guía al eslabón que SÍ se puede hacer, en orden:
  vendé lo cosechado → cosechá lo listo → "están creciendo" → plantá tus semillas →
  comprá semillas (la exención del guardia ya lo permitía) → vendé materiales (madera,
  piedra…). La usan los pasos "juntá plata" (silver/silverarm) y el desvío del hacha.
  Cada eslabón abre solo sus acciones y mueve cartel + flechas. 7 casos simulados más.
- **v5 — el plan con NÚMEROS (playtest: ciclo de a UNA semilla, "superfeo")**: la cadena
  de la plata ahora calcula la TANDA — "comprá 3 semillas de papa de UNA y plantalas
  todas — una tanda y alcanza": semillas útiles = lo que falta ÷ ganancia neta por papa
  (precio − semilla), tope en la plata disponible. También numera el resto: "vendé tus 4
  papas — con eso alcanza", "plantá tus 6 semillas", "cosechá tus 2 cultivos listos".
  6 escenarios económicos simulados, incluido el del playtest (3 de plata, meta 10).
- **Hotbar sin fantasmas (playtest)**: los consumibles agotados (semillas, recursos,
  peces, platos) salen SOLOS de la barra — la bolsita en 0 quedaba muerta ocupando
  lugar. Al recomprar semillas, `buySeed` la vuelve a poner en el primer hueco libre.
  Herramientas y picos conservan su lógica de siempre.

## Día 19 (cont.) — EL BOSQUE QUE RODEA AL CLARO · etapa 1: el anillo (16/8, idea de dirección)
- LA IDEA (director): que la granja deje de ser una isla en el mar y pase a ser un CLARO
  dentro de un bosque cerrado; y que al subir de nivel se limpie una porción del bosque, que
  se vacía de un clic y revela lo que escondía (un nodo de piedra, un árbol, parcelas).
  Es el sistema de expansión de Sunflower Land, pero vaciando bosque en vez de comprar islas.
- ETAPA 1 (esta): el ANILLO estático, para ver cómo se siente el encierro y medir el coste.
- POR QUÉ SALE BARATO — tres cosas del motor que ya estaban:
  1. La granja es NO_WALK: nadie camina, así que el bosque **no necesita colisiones**. Encierra
     por composición visual y por los límites de cámara. Eso borra la mitad del trabajo.
  2. El suelo ya se pinta en un `renderTexture`: el bosque usa lo mismo, así que son ~3.000
     árboles dibujados UNA vez y para el motor es una sola imagen — coste por frame CERO.
     (Como sprites vivos, el bucle del viento los recorrería 60 veces por segundo.)
  3. Revelar objetos en caliente ya está probado (excavaciones, paquete del día, cofres).
  Y no hace falta arte nuevo: es el `tree.png` de siempre, repetido con variación de escala
  y volteo. Se dibuja en lote (`beginDraw`/`batchDraw`) cuando el Phaser lo soporta.
- DETALLE QUE CASI SE ESCAPA: la textura del bosque va ENCIMA del suelo (para que las copas
  se metan en el claro), así que su pasto NO se pinta sobre el rectángulo del mundo — si no,
  taparía parcelas y caminos. Solo se rellena el anillo.
- El azar del bosque es una semilla FIJA: el bosque es idéntico en todas las partidas y entre
  recargas. El margen (300) es mayor que el límite de cámara (260), así que nunca se ve el borde.
- Todo tuneable desde config.js: `GF.BOSQUE` (1/0 para comparar con la isla), `BOSQUE_MARGEN`,
  `BOSQUE_PASO` (densidad), `BOSQUE_FILAS`, `BOSQUE_JITTER`, `BOSQUE_ESC_MIN/MAX`,
  `BOSQUE_COLCHON` (aire entre el claro y la primera fila) y `BOSQUE_DEPTH`.
- v2, las tres notas de arte del director:
  · **CLARO IRREGULAR**: el borde ya no es un rectángulo. Métrica mezcla de cuadrado y círculo
    más oleaje por ángulo (cuatro senos). El oleaje nunca baja de 1, así que el bosque no
    puede meterse en el rectángulo jugable por mucho que ondule. `GF.BOSQUE_ONDA` lo gradúa
    (0 = rectangular como antes).
  · **MASA en vez de arbolitos**: los árboles del interior se tiñen hacia `BOSQUE_TINTE`
    (verde oscuro). Como el contorno de la copa ya es oscuro, al teñir todo del mismo verde
    los bordes se funden entre sí y el interior deja de leerse como muchos sprites juntos.
    La primera fila queda intacta, con sus troncos de frente mirando al claro.
  · **SOMBRA HACIA ADENTRO**: el mismo tinte es un degradado según la profundidad, así que
    cuanto más adentro está el árbol, más oscuro — da el fondo en penumbra detrás de la
    primera línea. Una sola mecánica resuelve las dos notas.
- Con BOSQUE encendido ya NO se dibuja la isla (arena y mar): el claro está en tierra firme,
  y así no asoma la costa entre los troncos.
- PENDIENTE de decidir antes de la etapa 2: si el bosque entrega los nodos, el retoño en el
  baúl sobra. Propuesta: el nivel desbloquea el CLARO, limpiarlo revela lo que hay dentro, y
  el baúl vuelve a ser kit + paquete del día.

## Día 19 (cont.) — FIX: el césped seguía ofreciendo comprar parcelas (16/8, reportado en vivo)
- Al ocultar las parcelas bloqueadas quedó un fantasma: el sprite no se veía, pero el CLIC
  las seguía encontrando porque la detección de parcelas es por COORDENADAS (a diferencia de
  árboles y rocas, que usan `hitsSprite` y ese sí mira `visible`). Resultado: tocabas césped
  vacío alrededor de tus 3 celdas y saltaba "¿Gastar X de plata para desbloquear esta parcela?".
- Arreglado en los cuatro puntos: la detección del clic y el arrastre en modo edición saltean
  las parcelas bloqueadas, el letrero ya no las anuncia, y la compra desde el mundo se retiró
  (queda un toast informativo como red de seguridad: "Las parcelas llegan al baúl al subir de
  nivel"). `nearestInteract` ya las excluía.
- La compra de parcelas de la TIENDA se conserva (es un sumidero de plata y de $Golden) pero
  ahora el texto dice la verdad: **ADELANTA** una parcela de las que igual iban a llegar al
  baúl. `regalosSync` ya lo contempla — comprar no duplica, adelanta.

## Día 19 (cont.) — UN CULTIVO POR NIVEL, y el cupo que eso obligó a subir (16/8, dirección)
- PROBLEMA DETECTADO: el desbloqueo por nivel era lo ÚNICO de la tabla de cultivos sin regla
  — los tres nuevos se habían insertado sin mover los del diseñador y quedaban DOS cultivos
  en los niveles 1, 2 y 3. Y en el nivel 1 eso era una TRAMPA: el primer paso del tutorial
  pide "3 semillas de papa" y `buySeed` solo cuenta el evento si la semilla es papa, así que
  un jugador nuevo que comprara ciruela (2 de sus 3 platas) no avanzaba y sin ninguna pista.
- REGLA NUEVA: **un cultivo por nivel**. Papa 1 · Ciruela 2 · Cereza 3 · Remolacha 4 ·
  Zanahoria 5 · Cebolla 6 · Calabacín 7 · Repollo 8 · Calabaza 9, y los cuatro largos
  espaciados de a dos: Brócoli 11 · Girasol 13 · Trigo 15 · Maíz 18. Cada subida de nivel
  desbloquea algo nuevo para plantar — que sumado al nodo que ahora llega al baúl hace que
  subir de nivel siempre entregue dos cosas. El nivel 1 queda SOLO con papa: el tutorial ya
  no se puede romper.
- CONSECUENCIA QUE CAZÓ EL SIMULADOR (y que no era obvia): al espaciar los cultivos, el
  jugador pasa mucho más tiempo con los CORTOS, y un cupo POR SEMILLA los castiga — con papa
  de 3 minutos, 15 semillas por parcela se agotan en menos de una hora. Medido: con 15 el
  jugador activo terminaba el día en nivel 5, con 0 de plata y los nodos parados (el mismo
  apagón que arreglamos en la auditoría, entrando por otra puerta). **SEED_POR_PARCELA sube
  de 15 a 40**: con eso llega a nivel 9 con ~1.000 de plata y los 20 nodos girando. Son 240
  siembras diarias con 6 parcelas — el 8% de lo que automatizaría un bot, así que el cupo
  sigue haciendo su trabajo real sin decidir por un humano.
- Nota estructural para el diseñador: **un cupo por semilla rompe el ancla**. El ancla dice
  que todos los cultivos rinden 20/hora, pero el cupo dice "N siembras por día", y como la
  ganancia por siembra crece con la duración, bajo el cupo los cultivos largos rinden mucho
  más por día. Es coherente con el juego chill (empuja a los largos), pero conviene saberlo:
  es la única regla del juego que contradice el ancla a propósito.
- Verificado: tutorial cierra igual (18,1 h) y termina con 115 de plata en vez de 40.

## Día 19 (cont.) — LOS NODOS SON UN REGALO DEL NIVEL, y llegan al BAÚL (16/8, dirección)
- POR QUÉ: había DOS reglas para cosas iguales — los árboles se compraban con madera
  (2-4-8-16-32) mientras las rocas y parcelas se abrían solas por nivel. Y el pago creaba un
  círculo vicioso: necesitabas madera para tener más árboles, pero la madera sale de los
  árboles, y ahogaba justo cuando menos tenías. Medido: desbloquear los árboles 3 al 6
  costaba **60 maderas = 90 h de nodo**, MÁS que los tres edificios del tutorial juntos (50 h).
- AHORA: al subir de nivel, el nodo llega al BAÚL como premio y se coloca con un toque.
  Vale para las TRES cosas: Retoño, Roca y Parcela. Las tablas de siempre (NIVEL_ARBOLES,
  NIVEL_ROCAS, FARM_PARCELA) dejan de ser candados y pasan a ser el CALENDARIO de entrega.
- EL MUNDO ARRANCA LIMPIO: lo que todavía no es tuyo NO SE VE. Se fueron los retoños, las
  rocas bloqueadas y los parches de terreno silvestre. Al colocar un nodo aparece con saltito
  y chispas. Se nace con 2 árboles + 2 rocas + 3 parcelas, como antes.
- CÓDIGO: `nodosQueTocan(lvl)` (qué corresponde a cada nivel) · `regalosSync()` (pone al día
  la cola; es IDEMPOTENTE, así que sirve para un level-up, un salto de varios niveles o para
  migrar un guardado viejo) · `regaloReclamar(tipo)` (activa el siguiente libre) ·
  `refreshNodeLocks()` en la escena. `nodoBloqueado` ya no mira el nivel sino si la roca fue
  reclamada. Los árboles ya no cobran madera. G.regalos persiste en save.js.
- BAÚL: las fichas de premio se tocan una por una (mismo patrón de delegación del buzón).
  El kit de bienvenida mantiene la prioridad — primero el kit, después los nodos.
- VERIFICADO con el motor real: arranque sin premios pendientes, nivel 3 entrega 1 retoño,
  reclamarlo abre el 3er árbol sin costar madera, un salto a nivel 7 entrega los 7 que
  faltaban y al colocarlos la granja queda exactamente en la tabla (5 árboles, 4 rocas,
  6 parcelas). La regla de oro sigue cerrando: 120 de ingreso contra 32 de mantenimiento.

## Día 19 (cont.) — BUG: los cultivos nuevos no entraban en la bolsa + calabacín reanclado (16/8)
- BUG REAL (reportado por el director al probar): `ITEM_RES_ORDER` — la lista que define QUÉ
  ocupa casilla en la bolsa — no incluía ciruela, cereza ni remolacha. El comentario decía que
  sí, el array no. Efecto: lo cosechado entraba a `G.res` pero era INVISIBLE en el inventario
  y no contaba para el espacio. Arreglado.
- CALABACÍN REANCLADO (pedido de dirección): era el único de la tabla fuera del ancla —
  26,7 plata/h y 120 XP/h contra los 20 y 100 de sus vecinos. Ahora semilla 10 · venta 25 ·
  75 XP → 20 plata/h, 100 XP/h y relación venta/semilla 2,5 como el resto. Los 13 cultivos
  quedan en línea salvo la prima deliberada de los largos (girasol 24, trigo 30, maíz 40).
- LO DE LA MADERA — verificado con el motor real, NO hay bug: un jugador nivel 3 con el kit
  tala en 3 clics y la madera entra a la bolsa (`tryAddRes` OK, aparece en `canonicalStacks`).
  El tercer árbol tampoco está trabado: a nivel 3 el gate de NIVEL_ARBOLES ya lo abre y
  `tutoPermite`/`tutoGuardia` están desactivados (devuelven true). Lo que pasa es que **cuesta
  4 maderas** y el tutorial se las va comiendo en las obras (Herrería 5 + Horno 6 + Cocina 8 =
  19 maderas, a 1 h 30 por tala con 2 árboles). O sea: no falta madera por un fallo, falta
  porque el reloj de los árboles es el cuello de botella del tutorial — que es justo lo que
  mide el simulador (18,1 h, de las cuales 12 son esperando árboles).

## Día 19 (cont.) — CAZA DE EXPLOITS: el arbitraje del $Golden (16/8, pedido de dirección)
- `tools/auditoria-exploits.js` (nuevo): lee state.js y compara TODAS las vías de convertir
  valor en valor. Si dos caminos valoran lo mismo distinto, ahí hay arbitraje. Revisa el
  tipo de cambio del $Golden, la cocina contra la venta en crudo, las vías que esquivan el
  cupo de semillas, los cultivos fuera del ancla y los materiales del Horno.
- EXPLOIT GRAVE ENCONTRADO Y CERRADO — **arbitraje ×50 con el $Golden**: el Mercado vendía
  cultivos por $Golden a `precio/10` (10 plata de cultivo = 1 $Golden), mientras comprar
  parcelas valora el $Golden en `GOLDEN_EN_PLATA` = 500. O sea: vendías 50 de cultivo, te
  daban 5 $Golden y con eso comprabas una parcela que en plata costaba 1.282. El `/10`
  venía de cuando los precios eran chicos y nadie lo volvió a mirar. Ahora las dos puntas
  usan la MISMA constante (`marketUnit` y `sellItem` → `GOLDEN_EN_PLATA`): arbitraje ×1,0.
- De paso se cerraron los ×6 del kit de emergencia (hachas y picos) y quedó sin sentido
  económico comprar semillas de emergencia para esquivar el cupo: al tipo de cambio correcto,
  esas 25 semillas cuestan 2.500 de cultivo. Queda anotado como hallazgo menor.
- LO QUE NO ES EXPLOIT (medido): cocinar paga +25% sobre los ingredientes — es el premio por
  tener Cocina y está dentro de rango; los materiales del Horno no crean valor; el único
  cultivo por encima del ancla en la parte baja es el CALABACÍN (26,7/h contra 20), que viene
  de la tabla original del diseñador — conviene preguntarle si es intencional. La prima de
  los cultivos largos (girasol 24, trigo 30, maíz 40) sí es deliberada: paga la espera.

## Día 19 (cont.) — ESCALERA DE ENTRADA: 3-6-9-12-15 min (16/8 v2, charla con el diseñador)
- PEDIDO DEL DISEÑADOR: cultivos más cortos al principio "para tener interacción siempre",
  con nombres suyos (plum, cherry, beetroot) y uno de 1 minuto.
- EL PISO SON 3 MINUTOS, y es matemático, no una opinión: el ancla pide 20 plata/hora y con
  precios ENTEROS la ganancia mínima es 1, así que 1 ÷ 0,05 h = 20 → 3 minutos. Un cultivo
  de 1 minuto con esa misma ganancia rendiría 60 plata/hora, el TRIPLE que todo el resto:
  sería el único que alguien plantaría, justo lo contrario del juego chill que buscan los
  timers largos.
- HALLAZGO: la tabla del diseñador YA seguía esta regla sin estar escrita — la zanahoria son
  15 min, ganancia 5 y 25 XP, o sea 20 plata/h y 100 XP/h exactos. Extendiéndola hacia abajo,
  la escalera sale sola en progresión aritmética:
  · Papa 3 min · semilla 1 · venta 2 · 5 XP · nivel 1  (sigue siendo el cultivo del tutorial)
  · Ciruela 6 min · 2 · 4 · 10 XP · nivel 1   (plum)
  · Cereza 9 min · 2 · 5 · 15 XP · nivel 2    (cherry)
  · Remolacha 12 min · 3 · 7 · 20 XP · nivel 3   (beetroot)
  · Zanahoria 15 min · 3 · 8 · 25 XP  (sin tocar)
  v3 (el director: "papa y ciruela tienen el mismo precio"): el ancla la fija la GANANCIA, no
  la semilla — subiendo semilla y venta en la misma cantidad, el rendimiento por hora no se
  mueve. Así la semilla también escala (1 → 2 → 2 → 3 → 3) y cada escalón se siente como una
  inversión mayor. Verificado: las seis siguen en 20 plata/h y 100 XP/h exactos.
  Ganancia 1-2-3-4-5 · XP 5-10-15-20-25 · TODOS a 20 plata/h y 100 XP/h. Lo que crece no es
  el ritmo, es el tamaño de la transacción. La papa deja de ser el único cultivo por debajo
  del ancla (venía de 13,3/h) y la primera cosecha del tutorial baja a 2,7 minutos.
- Los niveles se insertan sin cascada: nivel 1 papa + ciruela · nivel 2 cereza + zanahoria ·
  nivel 3 remolacha + cebolla. El resto de la tabla queda intacto.
- ARTE — 12 PNG nuevos, y una LECCIÓN DE PIPELINE (el director cazó el error): la primera
  tanda se generó en un grupo NUEVO, copiando el estilo desde el PNG con `style_images`.
  Parecido pero no en familia. **El grupo correcto del juego es `f747c514`** (el del granero
  "cozy chibi cartoon farm barn"), y ahí cada cultivo tiene CUATRO estados con esta
  nomenclatura: `X planta` · `X media` · `X cosecha` · `Bolsa X`. Objetos de referencia
  para derivar en el futuro:
    · planta madura → `43074a7f` (la zanahoria: montículo bajo, encuadre correcto)
    · brote/media   → `7eb206ba` (genérico, sirve para CUALQUIER cultivo — no hace falta
                       generar uno por cultivo, se reusa y no gasta créditos)
    · bolsa         → `da254a05` (la del brócoli; se le pide cambiar SOLO el emblema)
    · cosecha       → cualquier ícono suelto del grupo
  Regla aprendida: derivar SIEMPRE con `create_object_state` desde un objeto del grupo, con
  un origen que ya tenga la FORMA correcta (pedirle plantas a un girasol devolvía girasoles).
- El rábano de la versión anterior y los PNG del grupo equivocado quedaron retirados.
- VERIFICADO: la cadena del tutorial CIERRA (18,1 h, sin trabas), el sim de 24 h no se mueve
  (+937 de plata, granja 9) y la auditoría da los 13 cultivos con su plata/hora. La prueba
  funcional cazó un bug antes de deployar: los tres nuevos no estaban en SELLABLE y no se
  podían vender.

## Día 19 (cont.) — LA PAPA BAJA A 4 min 30 y nace el RÁBANO (16/8, idea de dirección)
- IDEA DEL DIRECTOR (mejor que la mía): en vez de agregar un cultivo nuevo DEBAJO de la papa,
  correr la papa al escalón de entrada y que el rábano herede sus 9 minutos. Así el problema
  se arregla donde vive — la espera muerta del TUTORIAL — sin tocar una línea de la guía, y
  la papa conserva todo lo que tiene cosido encima (Papa Asada, semilla fiada, kit de
  emergencia, los 20 pasos).
- PAPA: 9 min → **4 min 30** · venta 3 → **2** · XP 9 → **5**. El precio baja a propósito: a
  4,5 min con venta 3 rendía 27 plata/hora y se volvía el mejor cultivo del juego; con 2
  mantiene sus 13,3/h de siempre. Mismo escalón de aprendiz, la mitad de espera.
- RÁBANO (nuevo, nivel 2): 9 min · semilla 1 · venta 4 · 12 XP → 20 plata/hora, exactamente
  el ancla. Es la primera graduación al terminar la guía. Escalera nueva: 4,5 → 9 → 15 → 30
  → 45 → 90 min…
- SIMULADOR NUEVO `tools/sim-tutorial.js`: en vez de copiar las tablas a mano (los sim-tuto
  viejos se desincronizaban a los dos días), CARGA state.js y usa los valores reales. Dice si
  la cadena se traba, cuánto tarda y con qué márgenes. Comparación con la papa vieja
  incluida (`PAPA_MIN=9 PAPA_PRECIO=3 node tools/sim-tutorial.js`).
- RESULTADO: **la cadena CIERRA**. Primera cosecha 8,7 min → **4,2 min**. Duración total del
  tutorial IDÉNTICA (18,2 h) porque la manda el reloj de árboles y rocas, no el cultivo:
  o sea que el cambio mejora la primera impresión sin alterar el ritmo general.
- EFECTO SECUNDARIO MEDIDO: el jugador termina el tutorial con 40 de plata en vez de 84. La
  razón es estructural y vale anotarla: **con un cupo POR SEMILLA, lo que importa es la
  ganancia por semilla, no por hora** — la papa pasó de 2 a 1 de ganancia por semilla. No
  traba nada (sobra plata para el hacha) y hasta empuja hacia los cultivos largos, que es lo
  que quiere el diseño chill; pero si se quisiera compensar, la perilla es SEED_POR_PARCELA.
- El sim de 24 h no se mueve (937 de plata, granja 9): el jugador de medio juego salta a
  cultivos largos enseguida, así que el cambio solo toca los primeros minutos.

## Día 19 (cont.) — RESPUESTA AL CLIC: el golpe se corta con el clic siguiente (16/8, dirección)
- SÍNTOMA (director, probando el deploy): "cuando le doy a un árbol pasa un tiempo entre el
  intermedio y el tronco cortado, me frena para talar rápido" — y lo mismo al plantar.
- El código está en 0,08 s por acción (ACT_DUR) y el impacto es instantáneo (ACT_IMPACTO = 0),
  así que lo que quedaba después del hachazo era SOLO animación… que igual bloqueaba el
  siguiente clic. Ahora, si volvés a tocar el MISMO objetivo, esa animación se corta y el
  golpe se cierra al instante: el juego responde a la velocidad de tus clics, no a la del
  reloj de la animación. Vale para talar, picar, plantar y cosechar (la pesca no se corta:
  su cast largo es a propósito). En talar/picar solo se corta DESPUÉS de que pegó el hachazo,
  para no comerse el destello.
- v3 — INSTANTÁNEO DE VERDAD (dirección: "la interacción y el cambio de sprites debe ser
  instantáneo en todo recurso, no debe haber delays"):
  · `ACT_DUR` de talar, picar, plantar, cosechar y regar pasa a **0** (la pesca conserva su cast).
  · BUG ENCONTRADO al hacerlo: `ACT_DUR[kind] || 1.2` convertía un 0 en **1,2 segundos** — el
    respaldo se comía justo el valor que queríamos. Ahora solo entra si la acción no existe.
  · El SPRITE INTERMEDIO (tajo del árbol, roca a medio romper) se aplica en el frame del clic,
    dentro de `startAction`, en vez de esperar al `update` siguiente.
  · Con duración 0 la acción se cierra en el mismo frame (`finishAction` desde `startAction`),
    sin el frame muerto de candado que quedaba.
  · Talar/picar/plantar/cosechar SALEN del panel de balanceo: no son una palanca de balance
    sino la sensación del juego, y un valor viejo en la nube los frenaba en cada arranque.
- v2 (mismo día, el director: "en los cultivos todavía se siente"): el corte ahora vale para
  CUALQUIER objetivo rápido, no solo el que estabas golpeando. Sembrar y cosechar se hace
  saltando de parcela en parcela — tocabas la de al lado y el clic quedaba esperando a que
  terminara la anterior. Con la granja sin caminar (NO_WALK), ese candado era todo el freno.
- CAUSA PROBABLE DE FONDO — y el arreglo estructural: la fila `balance` de Supabase pisa el
  código al arrancar, y ya nos costó días TRES veces (los timers de árbol en 1 s, y ahora
  "volvió a como estaba antes"). El código decía una cosa y el juego hacía otra, sin forma de
  verlo. Ahora `BAL.apply` compara cada override contra el valor del código, guarda el detalle
  en `window.BAL_PISADOS`, lo escribe en consola con console.table y — lo importante — lo
  AVISA DENTRO DEL JUEGO en el registro y con un toast: "⚙ N valores del panel están pisando
  al código: act.chop 0.08→0.3 …". Se limpian en balance.html → "Restaurar TODO".

## Día 19 (cont.) — LA PASADA DE ECONOMÍA: un ancla y nueve arreglos (16/8, dirección)
- DIAGNÓSTICO (tools/auditoria-economia.js, mide el código real): la economía no estaba
  diseñada sino ACUMULADA — cada número decidido en un momento distinto, sin una unidad de
  medida común. El tablón quedó FUERA de la pasada (aún sin aprobar por el diseñador).
- EL ANCLA, que ya existía sin estar escrita: **una parcela rinde ~20 plata/hora**. Los
  cultivos ya estaban balanceados entre sí (13 la papa, 40 el maíz, todos los demás en 20);
  lo que faltaba era medir el RESTO contra esa vara.
- LA REGLA DE ORO derivada: `parcelas × 20 ≥ árboles × 4 + rocas × 3`. Los cultivos son la
  única fuente de plata y los nodos el sumidero (herramientas). La escalera de nodos por
  nivel la cumple con margen en los 10 niveles.
- LOS NUEVE ARREGLOS (ninguno toca timers de cultivos ni de árbol/piedra):
  1. CUPO DE SEMILLAS por parcela: `15 × parcelas` (45 a 90) en vez de 18+2×nivel (20 a 38).
     El viejo duraba UNA hora de juego y apagaba el día entero. Ahora escala solo y solo
     muerde al hiperactivo de cultivos cortos. `SEED_POR_PARCELA` = la perilla a tunear.
  2. CAÑA sin oro: 1 madera (era 3 madera + 1 piedra + **8 oro** = 119 horas de nodo por
     pesca). El freno de la pesca pasa a ser la CARNADA de los montículos, como corresponde.
  3. CULTIVOS POR NIVEL DE GRANJA (`farmLevel()` → `G.level`): las dos curvas se comían la
     misma XP con varas incompatibles (granja 10 = 14.000 XP; el skill con esa XP iba en 5;
     el maíz pedía 111.525 = 8×). Los cuatro cultivos altos se corren a la banda de tareas:
     brócoli 8, girasol 10, trigo 12, maíz 15. El skill sobrevive para bonos (`farmSkillLevel`).
  4. PRECIO SOMBRA en PRICE: `horas del nodo × 20 + costo de la herramienta` → madera 36,
     piedra 46, bronce 210, hierro 300, oro 470, diamante 990, netherita 1240 (decía 3/6/12/
     15/30/80/200). Los materiales SIGUEN sin venderse: es la vara para valorarlos.
  5. COCINA: las recetas simples (nivel 1-3) ya no piden madera. CORRECCIÓN de la auditoría:
     cocinar NO destruía valor — `COOK_PRICE_AUTO` ya paga ingredientes ×1.25 y el campo
     `plata` de la tabla es legado. El riesgo real era el inverso: con el precio sombra, una
     receta barata con madera convertía la Cocina en la mejor salida de la madera justo
     cuando hace falta para construir.
  6. $GOLDEN con UN tipo de cambio: `GOLDEN_EN_PLATA = 500`. Antes convivían 900 (parcelas)
     y 3 (kit de emergencia): 300× de diferencia. El kit pasa a entregar LOTES — 1 $Golden =
     10 hachas / 10 picos / 5 semillas — y vuelve a ser un rescate de verdad.
  7. PICO DE PIEDRA sin madera (era 2 + 6 plata): la piedra costaba 18 contra 6 de la madera
     y una parcela financiaba 2,2 rocas; ahora 6 y 6,7 rocas.
  8. MINERALES con relojes escalonados: diamante 14 h → 18 h, netherita 14 h → 24 h. Oro,
     diamante y netherita compartían enfriamiento pero valían 30, 80 y 200.
  9. PARCELAS por plata con curva 1,45× en vez de 2× (la nº 12 baja de 12.800 a ~1.280): el
     camino de compra era decorativo porque el nivel las regala.
- VALIDADO: sintaxis + prueba funcional del motor real en Node (cupo, desbloqueos por nivel,
  crafteo de caña y pico, precios de cocina, lotes de emergencia, materiales no vendibles,
  tutorial entero de 20 pasos intacto) + sim de 24 h: el día pasa de morir en la hora 5 con
  neto 0 a cerrar con **+937 de plata, 56 cosechas y los 20 nodos girando las 24 horas**.

## Día 19 (cont.) — TABLÓN DE PEDIDOS v2 + VALES (16/8, dirección: "implementémoslo")
- Nace el motor de la visita diaria (investigación Hay Day/Sunflower Land/Stardew/
  Township/Pixels/Animal Crossing — doc en la carpeta del proyecto):
  · 3 PEDIDOS DIARIOS deterministas (fecha+apodo, FNV-1a como las excavaciones), firmados
    por vecinos con nombre y motivo ("Doña Rosa — para la sopa del domingo"). El pool
    pide SOLO lo producible hoy: cultivos desbloqueados (cortos en tanda, anclas de a 1),
    madera/piedra, minerales ya minados, pescado si hay caña, platos ya cocinados si hay
    Cocina. Tres tamaños de tanda (chica/media/grande) por pedido.
  · PAGAN plata (~1.5× mercado) + XP de farmeo (~valor/2) + VALES 🎟 — moneda NUEVA que
    solo sale del tablón. El PRIMER pedido cumplido del día paga vales ×2 (Nook Miles).
  · DESCARTE: el primero libre, el siguiente a los 30 min (Hay Day); el reemplazo nunca
    repite el producto descartado ni los otros dos.
  · TIENDA DE CANJE en el mismo tablón: fardo de 10 hachas (3v), 10 picos (3v), lata de
    6 lombrices (2v), sobre de 5 semillas del mejor cultivo (3v). REGLA DE ORO: NUNCA
    vende madera/piedra — los relojes del diseñador no se puentean con vales.
- MUEBLE en el mundo (580,148, junto al buzón): dos estados (papelitos clavados si hay
  pedidos pendientes, tabla pelada si no). Letrero con cuántos hay para entregar.
  CERRADO durante el tutorial (sin conflicto con el embudo ni la guardia).
- ARTE OFICIAL del grupo mercadillo (mismo día): tablón vacío derivado del buzón frontal
  (create_object_state, perspectiva heredada) y el lleno derivado del vacío — tabla ancha
  con techito y 3 notas con chinche. Trim a caja común entre estados (no salta al cambiar)
  y reteñido a la paleta del granero MEDIDO contra buzon.png (h .068/s .58/v .50; la
  fuente venía .063/.64/.57). El reteñido quedó como script reutilizable:
  tools/retint-rincon.py (madera 0.035<h<0.14, dorados v>0.85 protegidos, referencia
  configurable). boot.js carga tablon_pedidos(_full).png?v=1; el respaldo a código queda
  por si el PNG no llega.
- PANTALLA ov-pedidos con la gramática del rincón: notas de papel con chinche, remitente
  y sprite del producto, la cumplible brilla y tiembla al tocarla antes de entregar,
  sello "✓ ENTREGADO", ✕ para descartar con confirmación. Vista de canje al dorso.
  Clics 100% por DELEGACIÓN con data-attrs (la lección del buzón).
- Carta única del buzón al terminar el tutorial: "El pueblo colgó sus pedidos" → abre el
  tablón. Persistencia: G.vales + G.pedidos en save.js.
- VERIFICADO con el motor real en Node (vm + stubs): generación determinista, entrega
  (plata/vales/stock, doble del 1º, re-entrega bloqueada), descarte (2º bloqueado,
  reemplazo distinto), canje (cobra y bloquea sin saldo), candado del tutorial.

## Día 19 — Sábado 16/08 · Balance sin tocar timers: escalera de árboles + XP = minutos
- CONTEXTO (dirección): el diseñador sostiene los timers largos (juego chill, no demandante).
  Se balancea alrededor: cantidad de nodos y XP por acción, timers intactos.
- ESCALERA DE ÁRBOLES POR NIVEL: `NIVEL_ARBOLES = [1,1,3,4,6,8]` — espejo de NIVEL_ROCAS.
  El retoño N recién se puede pagar al nivel N (el pago en madera de siempre se mantiene:
  NODE_UNLOCK_COSTS). Anclada a los edificios: nivel 6 (Establo, 40 maderas) ya permite
  5 árboles. Letrero y toast avisan el nivel que falta, igual que las vetas.
- XP = MINUTOS DEL RELOJ (regla única, la que ya cumplían los cultivos: papa 9 min→9 XP,
  maíz 24 h→1440): tala 90 (era 4) · piedra 120 (era 5) · bronce 480 · hierro 720 ·
  oro/diamante/netherita 840 (eran 8-20). La XP fija venía de la era de cooldowns de 90 s;
  con los relojes del diseñador cada golpe es escaso y Minería tardaba ~80 días en llegar
  a nivel 5. Helper `nodoXpMin(cdSeg)` en state.js: si un timer cambia, la XP se corrige sola.
- SIM 30 DÍAS (tools/sim-30-dias-16-8.js, jugador chill de 3 visitas/día): granja 1→10 en
  4 días (curva front-loaded, después mandan las tareas 11-50) · Minería nivel 10 y Crafteo 7
  al día 30 (sanos) · la MADERA es la moneda de ritmo real: Cocina día 4, Curtiduría día 9,
  Establo día 13 — un edificio grande por semana, ritmo chill coherente. Nota para el
  diseñador: el plano del Establo cae al nivel 6 (día 3) pero se construye el día 13 —
  10 días mirando el plano; si molesta, la palanca es su costo de madera, no el timer.

## Día 18 (cont.) — AMBIENTE VIVO: viento, hojas, peces y día/noche (15/8, dirección 1+2+3+5)
- VIENTO: una onda que viaja por la granja — pasto y flores pivotean desde la base y se
  inclinan en secuencia (fase por posición), con ráfagas lentas; los árboles se mecen
  apenas (pausa mientras los golpeás). Cero assets nuevos, puro tween.
- HOJAS: cada 6-18 s una hojita se suelta de un árbol y baja meciéndose hasta
  desvanecerse (usa el presupuesto de partículas).
- PECES: chapoteo con ondas en la laguna — cada 5-11 s si PODÉS pescar (caña+lombriz,
  la laguna te invita), cada 16-30 s si no. Arquito plateado + onda expansiva.
- DÍA/NOCHE con la hora REAL del jugador: velo suave (noche azulada 21:30-05:30 al 38%,
  amanecer y atardecer con tinte cálido, día limpio) actualizado cada 20 s con
  transición de 3 s. Los FAROLES (farol y farolito de los adornos) se encienden solos
  de noche con halo cálido y latido de llama. Cada check-in se ve distinto.

## Día 18 (cont.) — EXCAVACIONES DIARIAS (15/8, idea Stardew elegida)
- 3 montículos de tierra removida por día (EXCAV_POR_DIA), en celdas libres al azar pero
  FIJAS durante el día (semilla FNV = fecha + apodo: recargar no los mueve). Al cambiar
  el día se renuevan solos (chequeo en el tick lento).
- Se cavan con un clic al acercarse, sin herramienta: puff de tierra + botín volando.
  Botín (v2, dirección): LOMBRICES siempre — 1 (70%) o 2 (30%). Tierra removida con
  gusanos = carnada de pesca: temático, y le da a la pesca su fuente diaria natural.
- Arte: monticulo.png del grupo mercadillo (tierra oscura con gusanitos asomando) +
  respaldo dibujado a código. Persiste en G.excav {dia, hechos}.

## Día 18 (cont.) — EL BAÚL: pantalla propia y entrega animada (15/8) — trío completo
- Tercera y última interfaz custom del rincón: ov-baul. Con el kit pendiente, el baúl
  grande abierto y rebosante late, con los 3 ítems flotando encima (hacha ×35, pico ×20,
  caña ×15, sprites reales). Se toca → tiembla in crescendo → kitReclamar y los ítems
  VUELAN a la bolsa en fila. Queda el baúl cerrado: "Todo tuyo. ¡A trabajar la granja!".
- Sin nada pendiente: baúl cerrado, "Nada esperando por hoy". El clic del mundo abre
  siempre esta pantalla (la racha vive en la del paquete).
- Trío terminado: buzón escénico + paquete del día + baúl — tres muebles, tres pantallas
  gráficas con la misma gramática (latido, toque directo, shake, pocas palabras).

## Día 18 (cont.) — Buzón: clics por delegación (15/8, fix)
- El "↩ volver" de la pila (y a veces otros botones) quedaba muerto: los onclick se
  re-enganchaban a cada nodo después de redibujar y el redibujo intermedio de buzonLeer
  los pisaba. Ahora TODOS los clics del buzón van por UN oyente delegado en el documento
  (pointerdown, fase captura) con data-attrs — sobrevive a cualquier redibujado.
- Botón "↩ Volver" real (estilo ghost) en la pila; acción de carta cierra y navega;
  "✓ Leída" y papeleras 🗑 por la misma vía.

## Día 18 (cont.) — BUZÓN ESCÉNICO: la interfaz custom (15/8, aprobada a prueba)
- La pantalla del buzón dejó de ser una lista con pestañas: ahora es una ESCENA.
  · El buzón grande arriba (con carta asomando si hay correo, cerrado si no).
  · Los sobres NUEVOS en abanico debajo, cerrados con lacre, remitente chiquito,
    el más nuevo latiendo. Se tocan (pointerdown + temblor corto) y se DESPLIEGAN
    como papel de carta con el texto y una sola acción tocable ("Ver la racha →").
  · "↩ guardar" manda la carta a la PILA de leídas: papelitos apilados en la esquina
    con contador — se toca y se despliega con fecha y papelera por carta.
  · Vacío: el buzón cerrado y "Sin correo por hoy". Pocas palabras, la imagen manda.
- Assets nuevos del grupo mercadillo: sobre_carta (lacre rojo) y papel_carta (pergamino
  envejecido, la v1 blanca se descartó). Reutiliza toda la lógica existente
  (buzonCartas / archivo 7 días / borrar por id) — solo cambió la piel.

## Día 18 (cont.) — La pantalla del paquete ES el claim diario (15/8, dirección)
- La interfaz vieja del cofre diario (ov-daily) se RETIRÓ. La pantalla del paquete es la
  única: paquete grande (cerrado latiendo si hay premio · abierto si ya se cobró) + la
  RACHA de 7 días dibujada como paquetitos (abiertos los cobrados, latiendo el de hoy,
  el 7º más grande). Pocas palabras: la imagen lo dice.
- Redirecciones: menú "Paquete del día" (tecla G), clic al baúl, carta del buzón — todo
  abre ov-paquete. refreshDaily queda inofensiva (guard) porque claimDaily la llamaba.

## Día 18 (cont.) — Pantalla propia del paquete del día (15/8) — plantilla del rincón
- Dirección: buzón, baúl y claim diario tendrán interfaces CUSTOM, gráficas y orgánicas.
  Técnica elegida: arte protagonista de PixelLab en grande (pixelated ×4-6, mismo asset
  del mundo) + overlay HTML alrededor. Primera implementada: EL PAQUETE.
- ov-paquete: el paquete grande cerrado + notita de papel ("¿Qué habrá hoy? Tirá del
  cordel…") + botón "Abrir el paquete" → claimDaily, el arte cambia al paquete ABIERTO
  (papel desplegado, brillo dorado, cordel suelto — estado nuevo del grupo mercadillo),
  la notita dice qué te tocó y el botón pasa a "¡A la bolsa!". Estrellas en el mundo al
  cerrar. El clic del paquete del mundo ahora abre esta pantalla.
- Pendiente con la misma receta: interfaz del BAÚL (baúl abierto grande + kit visible +
  botón Recoger) y del BUZÓN (buzón grande, cartas nuevas sobresaliendo, leídas a un lado).

## Día 18 (cont.) — Rincón del correo sin emojis: los sprites hablan solos (15/8)
- Fuera los emojis flotantes ✉️/🎁/✨: el buzón con la carta asomando y el baúl con la
  tapa abierta ya comunican su estado — para eso tienen dos sprites cada uno.
- El paquete del día ahora se apoya DE VERDAD al pie del poste del buzón (posición
  relativa al buzón, no coordenada suelta) y respira apenas, sin flotar.

## Día 18 (cont.) — EL PAQUETE DE LA MAÑANA (15/8, elegido por dirección)
- El claim diario dejó de ser un botón: cada día con premio pendiente aparece un PAQUETE
  de papel kraft atado con cordel al pie del buzón (ayer no estaba, hoy sí). Se levanta
  con un clic al llegar y se abre ahí mismo (claimDaily + estrellas + monedas). Respira
  suavecito y tiene un ✨ para leerse a la distancia.
- El BAÚL queda para el kit de bienvenida (tapa abierta + 🎁 solo mientras espera) y
  para MIRAR la racha (clic → ov-daily, ya sin reclamo dentro). La carta del buzón ahora
  dice "Te llegó tu paquete del día" con botón "Ver la racha".
- Arte del paquete generado en el grupo del mercadillo (paquete del dia), con respaldo
  dibujado a código si no carga. Rincón completo: buzón → paquete → baúl.

## Día 18 (cont.) — El BAÚL entrega: kit de bienvenida + claim diario orgánico (15/8)
- Se nace con las MANOS VACÍAS: el kit (35 hachas + 20 picos + 15 cañas) espera en el
  baúl junto al granero. Paso 0 nuevo del tutorial: "Abrí el baúl — tu kit te espera"
  (TUTO_VER 13; los guardados viejos ya lo recibieron: kitReclamado=true por defecto).
- Claim diario ORGÁNICO: con premio pendiente, el clic al baúl lo retira DIRECTO
  (claimDaily + estrellas + monedas), sin panel. Sin premio, el clic abre la racha para
  mirarla. El 🎁 late mientras haya algo que retirar (kit o premio del día).
- Todos los avisos de "no tenés herramienta" apuntan al baúl si el kit está sin retirar.

## Día 18 (cont.) — Buzón v2 frontal: mismo contexto que el granero (15/8)
- El buzón se regeneró FRONTAL con leve picado (derivado del baúl v2 para heredar la
  perspectiva): casita de madera sobre poste, techito que rima con el del granero.
  Dos estados a caja común (cerrado / puerta abierta con sobre y banderita alta).
- Reteñido exacto a la paleta de los edificios (0.068/0.62/0.47). Validado en escena:
  granero + buzón + baúl comparten perspectiva, luz y madera. Los isométricos v1 quedan
  en PixelLab sin borrar.

## Día 18 (cont.) — Baúl de premios v2: perspectiva del granero (15/8)
- Dirección: el arte debe CUAJAR junto al granero, no solo parecerse. El baúl se regeneró
  frontal con leve picado (la vista de los edificios) en el grupo del mercadillo, y se
  validó compuesto sobre el pasto del juego al lado del granero real.
- Dos estados con caja común: baul_premios (cerrado) / baul_premios_lleno (tapa abierta y
  resplandor dorado con sacos y monedas — se muestra cuando hay premio sin reclamar).
- Reteñido a la paleta de madera de los edificios (0.066/0.62/0.46 vs objetivo
  0.068/0.62/0.475), protegiendo el brillo dorado del interior. Los v1 isométricos quedan
  guardados en PixelLab por si se quieren comparar.

## Día 18 (cont.) — Cofre de premios físico junto al buzón (15/8, idea Stardew)
- El cofre diario deja de vivir solo en un menú: ahora es un COFRE grande en el mundo
  (chest_daily, junto al buzón, a la derecha del granero). Cuando hay premio sin
  reclamar, late suavemente y salta un 🎁; el clic abre el panel de la racha de siempre.
- Prompt contextual: "¡Abrir tu cofre de premios!" / "vuelve mañana". La carta del buzón
  ahora dice que el premio espera "en el cofre grande junto al buzón".
- Rincón del correo completo: buzón (noticias) + cofre (premios), los dos diegéticos.

## Día 18 (cont.) — Fix: acentos rotos en index.html (15/8)
- El stamp-build.ps1 leía index.html con codificación ANSI (default de PowerShell 5) y
  lo reescribía rompiendo acentos y símbolos ("ediciÃ³n", "âº"). Reparado con reversión
  quirúrgica del mojibake (290 secuencias, preservando las inserciones nuevas sanas) y
  el script ahora fuerza UTF-8 sin BOM en lectura y escritura ([System.IO.File]).

## Día 18 (cont.) — Buzón v2: pestañas Nuevos / Leídos + papelera (15/8)
- El buzón ahora tiene dos pestañas fijas (mismo estilo que la Herrería): NUEVOS con las
  cartas activas y LEÍDOS con el archivo de 7 días — una carta pasa a Leídos apenas se
  vio por primera vez (el archivado ocurre al abrir el buzón).
- Cada carta leída tiene su papelera 🗑 para borrarla a mano (buzonBorrar por id+día);
  las no borradas se descartan solas a los 7 días.

## Día 18 (cont.) — Buzón: archivo de cartas leídas (15/8)
- Las cartas ya no desaparecen al leerlas: toda carta que pasa por el buzón queda en la
  sección "Leídas" durante 7 días (releíble, atenuada, con fecha). Después se descarta
  sola (BUZON_ARCHIVO_DIAS · tope 40 cartas · persiste en G.buzonArchivo).
- Se archiva una vez por día por tipo (el aviso del cofre de hoy y el de mañana son
  cartas distintas). Con cartas nuevas + archivo, el buzón nunca se ve "vacío" de golpe.

## Día 18 (cont.) — EL BUZÓN (15/8, idea Stardew aprobada por dirección)
- Buzón físico en la granja (450,420, cerca del spawn): las noticias llegan como CARTAS
  y la banderita se levanta sola cuando hay algo. Arte de PixelLab (buzon.png /
  buzon_full.png, recortados a caja común) + respaldo dibujado a código si falta.
- Cartas v1: bienvenida del Capataz (única, botón Entendido), cofre diario listo
  (botón → ov-daily) y niveles del Pase sin reclamar (botón → ov-pass). Se arman al
  momento; solo persiste qué avisos únicos se leyeron (G.buzonLeidas).
- El cofre diario YA NO se abre solo como popup al entrar — lo anuncia el buzón.
- Sobre saltarín sobre el buzón cuando hay correo; prompt "Leer el correo (N cartas)".

## Día 18 (cont.) — TABLA DEFINITIVA: largos del diseñador + más nodos de arranque (15/8)
- Dirección, decisión final: la tabla que rige es la del diseñador SIN aceleración de
  comienzo — cultivos v3 (papa 9 min → maíz 24 h) y nodos largos desde el primer golpe
  (árbol 1 h 30 · piedra 2 h · bronce 8 h · hierro 12 h · oro/diamante/netherita 14 h).
- Compensación por cantidad, no por velocidad: se nace con 2 ÁRBOLES y 2 ROCAS de
  cantera abiertos (treesOpen/rocksOpen [0,1] · NIVEL_ROCAS[1]=1) + la veta de piedra =
  3 fuentes de piedra; ampliar sigue barato (2/4/8/16/32).
- Sim del tutorial final: Herrería 3,2 h · Horno 11,2 h · **Cocina ~16 h** — dos tardes
  con una noche en el medio, todo a UN solo ritmo, dentro y fuera del tutorial.

## Día 18 (cont.) — Sin arranque rápido: los largos del diseñador desde el 1er golpe (15/8)
- Dirección: "el timer tiene que ser uno siempre — el tutorial no puede sentirse un juego
  distinto al de afuera". Se eliminó (otra vez, ahora sobre la tabla del diseñador) el
  arranque rápido por nodo: árbol 1 h 30 y piedra 2 h DESDE el primer golpe, sin etapas.
- Sim del tutorial: Herrería 6,2 h · Horno 14,2 h · **Cocina ~19 h** (con las palancas ya
  aplicadas: desbloqueos 2/4/8, cantera desde nivel 2, obras 6+4 y 8+5).
- Nota: el "enganche en minutos" era la parte del doc 4/8 del diseñador pensada para el
  primer día; sin él, la primera madera de la Herrería tarda ~6 h en juntarse. Queda para
  conversarlo con el diseñador con estos números sobre la mesa.

## Día 18 (cont.) — Cache-busting de scripts en cada deploy (15/8)
- Playtest: tras un deploy, producción seguía con los timers viejos — el cargador de
  index.html pedía los .js SIN versión y el navegador servía su copia cacheada.
- Arreglo: sello GF_BUILD en el cargador (todos los scripts se piden con ?b=SELLO) y
  deploy.bat lo actualiza solo con fecha/hora en cada deploy. Nunca más "borrá caché".

## Día 18 (cont.) — Ameno SIN tocar los timers del diseñador (15/8, dirección)
- Decisión: los timers del diseñador quedan intactos; la experiencia se mejora con las
  palancas de alrededor. El "rendimiento por golpe" (más de 1 madera por tala) queda
  RESERVADO para ítems y la futura rama de skills (tala/minería/cosecha) — no se toca.
- Palancas aplicadas:
  · Desbloqueo de nodos al alcance: NODE_UNLOCK_COSTS [3,9,27,81,100] → [2,4,8,16,32]
    (ampliar en paralelo ES el juego cuando el reloj es largo).
  · Cantera más temprana: NIVEL_ROCAS [1,3,5,8,12,16] → [1,2,4,6,9,12].
  · Obras del tutorial a escala de los relojes: Horno 10+8 → 6+4 · Cocina 15+8 → 8+5
    (los textos de la guía toman los costos de BUILD_DEF solos).
- Sim con los timers del diseñador + palancas: Herrería 1,8 h · Horno 6,5 h ·
  **Cocina ~13 h** (una tarde + la noche + la mañana). Era 26 h. Madera sigue mandando.

## Día 18 (cont.) — EN PRUEBA: tabla COMPLETA del diseñador, nodos incluidos (15/8)
- Dirección pidió poner TODOS los timers del diseñador, no solo cultivos. Restaurado el
  doc "Enfriamiento de Árboles y Minerales" (4/8) tal cual: árbol 1 h 30 (3 primeras
  taladas a 3 min) · piedra 2 h (3 primeras a 4 min) · bronce 8 h · hierro 12 h ·
  oro/diamante 14 h — con el mecanismo de arranque rápido por nodo de vuelta (nodoCd).
- Sim del tutorial con la tabla completa del diseñador (tools/sim-tuto-disenador.js):
  Herrería a las 2 h · Horno a las 11,5 h · **Cocina a las 26 h** (2-3 días de visitas).
  La madera domina: ~20 h de esperas de árbol para 34 talas con 2 árboles.
- Build de PRUEBA para que el diseñador lo sienta en vivo. Para revertir: CD, CD_RAPIDO,
  ORE_DEF (cds) y growH de CROP_DEF.

## Día 18 (cont.) — EN PRUEBA: tiempos de cultivo de la tabla v3 del diseñador (15/8)
- Pedido de dirección: poner EN JUEGO los tiempos de crecimiento que propuso el diseñador
  (doc "Sistema de farmeo con 10 cultivos v3", 1/8) para que los pruebe en vivo:
  papa 9 min · zanahoria 15 · cebolla 30 · calabacín 45 · repollo 1,5 h · calabaza 3 h ·
  brócoli 6 h · girasol 10 h · trigo 16 h · maíz 24 h (vuelve el ancla nocturna).
- PRECIOS y XP siguen siendo los nuestros (semilla papa 1 / venta 3): con los precios v3
  (semilla 20) el arranque con 3 de plata no funciona. Nodos sin cambio (árbol 90 s,
  piedra 2 min). Es una build de PRUEBA: revertir growH si no convence.
- Sim del tutorial con estos tiempos: completo en ~57 min (antes ~49). El cambio grande
  no es el tuto sino el ritmo del día 1: la papa pasa de 45 s a 9 min por ciclo.

## Día 18 (cont.) — Auditoría del tutorial: exploits y softlocks (15/8, sim-tuto-v2)
- Simulación fiel al código de hoy (tools/sim-tuto-v2.js). Hallazgos y arreglos:
- **EXPLOIT cerrado — cupo infinito** (regla final de dirección): la exención de cupo
  durante el tutorial se ELIMINÓ por completo — el cupo de siempre (18+2×nivel) manda
  para todos los cultivos desde el minuto uno. Es posible porque el kit inicial ahora
  cubre los insumos del recorrido: ninguna misión depende de comprar de más (el tuto
  usa ~6 semillas). Sin excepciones = sin exploit. (También se quitó el cartel
  "SIN LÍMITE durante el tutorial" de la Tienda.)
- **TEDIO estructural corregido**: con kit 15/15 el tuto exigía craftear 21 hachas
  (126 plata) financiadas con ~170 ciclos de papa. El kit inicial ahora CUBRE los
  materiales del recorrido: 35 hachas + 20 picos (31 talas + 18 picadas medidas).
  El paso "Crafteá un Hacha" sigue enseñando el crafteo (6 plata).
- **SOFTLOCK cerrado — cero absoluto**: los materiales no se venden; un jugador con
  0 plata, sin semillas/cultivos/platos/siembras quedaba matemáticamente muerto.
  El Mercado ahora FÍA 1 semilla de papa por día en ese estado exacto (sb.caridad).
- Tiempo del recorrido completo (jugador activo): **~41 min**, dominado por los timers
  de nodo (34 talas × 90 s / 18 picadas × 2 min). Consumo real de semillas: ~10-15.
- Revisado sin hallazgos: depósito de obras (solo planos del tuto), venta del plato antes
  de comer (se recocina), guía apagada (los pasos avanzan por eventos igual).

## Día 18 (cont.) — Herrería: el scroll queda libre (15/8)
- Playtest: tras comprar un pico, la lista de la Herrería no dejaba subir el scroll más
  allá de la mitad. Causa: tutoHighlight corre cada segundo y en cada evento de scroll,
  y su scrollIntoView devolvía la lista a la fila guiada apenas el jugador se alejaba.
- Arreglo: la lista se acomoda UNA vez cuando cambia el destino de la guía; después el
  scroll es del jugador.

## Día 18 (cont.) — Regla única de timers: el RECURSO define el timer (15/8, dirección)
- Dirección: "todo lo extraíble de la granja va por UN sistema con el −50% general —
  nada modificado de forma particular". La anomalía que quedaba: la piedra salía a 2 min
  en cantera y a 1 h en la veta de piedra. Regla nueva: el timer es del RECURSO, no del
  nodo → veta de piedra = 2 min, igual que la cantera.
- Sistema completo (todo = valor de diseño ÷ 2, fijo, sin etapas ni excepciones):
  cultivos papa 45 s → maíz 12 h (escalera duplicando) · madera 90 s · piedra 2 min
  (cantera y veta) · bronce 4 h · hierro 6 h · oro/diamante/netherita 7 h.

## Día 18 (cont.) — Vetas de mineral al −50% (15/8)
- Playtest: "una roca minada me salió con ~1 h de enfriamiento" — era la VETA de piedra
  (fila de minerales), que tiene timer propio en ORE_DEF, distinto de la cantera (2 min).
  No era la nube: los overrides siguen vacíos.
- Esos timers eran los únicos sin el −50% del rebalance. Ahora: piedra 1 h · bronce 4 h ·
  hierro 6 h · oro/diamante/netherita 7 h (fijos, sin etapas). La escasez de minerales
  se mantiene: son el freno del Altar y los picos altos.

## Día 18 (cont.) — La escolta no señala nodos en enfriamiento (15/8)
- Playtest: una mariposa revoloteaba sobre una veta EN ENFRIAMIENTO. Causa doble:
  (1) la mariposa escolta del "jugador perdido" seguía al guiaTarget del objetivo, y
  updateTutoArrow elegía el primer árbol/roca/veta SIN mirar cooldown, nivel ni tier de
  pico; (2) entre reasignaciones (2,5 s) una mariposa podía quedar orbitando un nodo
  recién usado.
- (v2, pedido de dirección): tampoco se señalan los nodos A MEDIO talar/picar (golpes
  en curso — tree_cut1/2, veta half) — ni en la lista de maduros, ni como escolta, y si
  el jugador empieza a golpear el nodo orbitado, la mariposa lo suelta al instante.
  Las parcelas siguen igual: la seca se señala solo si tenés semillas; la lista, siempre.
- Arreglo: el objetivo del mundo solo señala nodos usables YA (sin cooldown, nivel ok,
  pico del tier); si todo está enfriándose, no señala ninguno — la madurez (>10 s
  disponible) ya los marca cuando vuelven. Y si el nodo orbitado entra en cooldown, la
  mariposa lo suelta en el acto.

## Día 18 (cont.) — Mariposas: flores y posada libre (15/8)
- Las mariposas conocen las FLORES del suelo (blancas y amarillas, también las del
  fallback dibujado): cuando no hay recurso que señalar, la mitad de sus paseos van
  derecho a una flor.
- Posada libre: al llegar a una flor se posa casi siempre; en cualquier otro punto del
  paseo, cada tanto. El espanto sigue igual (jugador cerca → levanta vuelo), y si
  mientras está posada aparece un recurso que señalar, despega sola a trabajar.

## Día 18 (cont.) — Sprites que encajan con sus intermedios (15/8)
- **Tocón**: el disco de corte ocupa el 64% de su lienzo y el tronco del árbol solo el
  23-30% del suyo — dibujado a 0.85 del ancho del árbol salía el DOBLE de gordo que el
  tronco. Medido y corregido: ahora va a 0.42 (mismo grosor que el tronco talado).
- **Obras**: cada `build_*.png` se estiraba al ancho de su propio lienzo, pero el
  diseñador las dibujó a la MISMA densidad de píxel que el edificio (lienzos de otro
  tamaño: horno 123 px vs 98, altar 119 vs 104…) → quedaban chicas o corridas. Ahora la
  obra se escala con el ancho del edificio TERMINADO (create + colocarObraEnVivo), así el
  andamiaje calza exacto sobre la silueta de lo que se va a construir.

## Día 18 (cont.) — Mariposas: posada real + espanto (15/8)
- La mariposa ya **no se posa "en el aire"**: solo aterriza SOBRE el sprite del recurso
  (elige un punto del follaje/roca/cultivo y planea hasta él). Sin recurso, no se posa.
- **Espanto**: si el jugador usa el recurso donde está posada (talar/picar/cosechar/plantar)
  o se le para al lado (<26 px), levanta vuelo al instante, más rápida por ~0,7 s,
  alejándose del jugador con la misma curva abierta de siempre.
- Fix producción: el panel de balance tenía guardados valores de PRUEBA del 4/8 en la nube
  (árbol y roca en 1 s + precios de cultivos viejos) que pisaban el código al arrancar.
  Se vació la fila de overrides: mandan los valores del código (árbol 90 s, roca 2 min).

## Día 18 (cont.) — Timer único por nodo (15/8, dirección)
- **Se eliminó el "arranque rápido por nodo"** (CD_RAPIDO): el jugador lo percibía como
  una aceleración inconsistente ("el árbol de la Cocina va más rápido que el mío").
  Decisión de dirección: **el timer es el mismo siempre**, sin etapas ni excepciones.
- Nuevos valores fijos: **árbol 90 s · roca 2 min** (punto medio del rebalance −50%).
  Las vetas conservan su CD propio de ORE_DEF (también fijo, sin atajos de primeras veces).
- Impacto medido (sim-guia): Cocina 45 min · Armas 1.7 h · Minería 2.6 h · Altar ~11 h.
  ⚠ Para el diseñador: sin el CD largo de 30/45 min, la madera/piedra fluye constante —
  los frenos de la economía quedan en la plata (cupo de semillas), los niveles y los costos.
  Si se quiere frenar materiales a la larga, el dial es CD.tree / CD.rock (un solo número).

## Día 18 — Viernes 14/08 · Fixes.docx del diseñador (6 puntos)

- **#1 Alimentar animales**: siempre se puede — el cultivo PREFERIDO da la felicidad
  entera (+15); sin él, aceptan CUALQUIER cultivo (+8, `FELIZ_COMIDA_GENERICA`). Antes la
  alpaca solo comía trigo (nivel alto) y se moría de hambre sin remedio. ("Comida>material"
  quedó anotado en TODO para confirmar si además quería alimentar con platos.)
- **#2 El Altar de Runas era un SOFTLOCK de manual**: su receta pide 20 de ORO, el oro
  pide Pico de Oro, y los picos se enseñaban DESPUÉS con el embudo cerrado. La cadena del
  Altar ahora va después de fundición/picos (TUTO_VER=9) y sus 4 pasos dejan el loop
  entero abierto (mat, craftpick, venta…). El botón "saltar tutorial" que sugería el doc
  se probó y se QUITÓ por decisión de dirección (14/8): el tutorial es obligatorio por
  diseño y el softlock ya está arreglado de fondo.
- **#3 "Solo deja comprar de a 1 semilla"**: era el sub-objetivo — al comprar UNA, el
  eslabón saltaba a "plantá" y bloqueaba el resto de la tanda. Los eslabones de plantar
  y de "están creciendo" ahora mantienen `buyseed` (y `plant`) permitidos.
- **#4 Outfit del granjero**: a TODO — falta definición de arte con el diseñador.
- **#5 La plaza**: botón visible "⬅ Volver a la GRANJA" (la M sola no la encontraba
  nadie), `GF.scene="plaza"` al entrar (el Mapa decía "estás en tu granja") y `irAZona`
  viaja desde la escena DONDE ESTÁS (antes usaba farmScene aunque estuvieras en la plaza).
- **#6 NFTs separados de los adornos**: pestaña **NFTs** propia en la Tienda con el GOD
  HAND (y nota del Mercado de jugadores); Adornos queda solo con parcelas y decoración.

### El TEDIO medido con simulación (14/8, dirección: "no aflojar el embudo — hacerlo eficiente")

La sugerencia del diseñador de "quitar restricciones" venía de un problema real: el
camino guiado era LENTO, no estrecho. Simulación económica con los números del código
(`sim-tedio.js`): "juntá 20 de madera" para la Cocina con 1 árbol y CD largo de 90 min
eran **3,5 HORAS**; la piedra del Altar, **7 horas**; las 1000 de plata de Armas, **~2-3
horas y 122 ciclos** de papa. Arreglos (el embudo NO se toca):

- **CD corto mientras el paso pide ese recurso** (`nodoCd`): el árbol/roca del objetivo
  nunca entra al enfriamiento largo durante su paso — 180/240 s que el boost deja en
  ~22/29 s. La Cocina pasa de 3,5 h a **~4 min** (medido en la simulación).
- **Cultivar árboles permitido en los pasos de madera** (`cultivar` en wood_st/wood/
  woodc/wood_al): invertir madera en el 2º/3º árbol paraleliza la juntada — es la misma
  lógica del `plotunlock` en los pasos de plata. Las rocas ya se abren solas por nivel.
- **Dos números quedan para el diseñador** (TODO, con la medición): `ARMAS_UNLOCK_PLATA`
  1000 (~100 min aun con 8 parcelas) y los 20 de ORO del Altar (cadena de picos de ~700
  plata). El tutorial no puede arreglarlos sin tocar balance.
- **El bucle de las hachas, resuelto por PLANIFICACIÓN (no por regalo)**: la primera idea
  fue que la herramienta no se gaste durante su paso; dirección la bajó — la economía
  tiene que seguir siendo real. En su lugar, el sub-objetivo de los pasos de madera
  calcula el paso ENTERO: hachas que faltan para TODA la meta (1 tala = 1 uso) → si la
  plata alcanza, "crafteá tus 17 hachas de UNA (170 de plata, botón ×5)" apuntando al
  lote; si no, la cadena de la plata con la META COMPLETA ("te faltan 17 hachas (170):
  comprá N semillas…") — una sola fase de plata en vez de rebotar de a 10 en 10 con
  talar → rota → papa → craftear. Verificado con 5 escenarios simulados.
- **2ª pasada — menos tandas y menos clics (dirección: "sigue tedioso")**: aun con la
  meta completa, la papa rinde 2 netos y el ciclo quedaba en ~20 tandas. Tres palancas de
  DINAMISMO (la economía no se toca): el plan elige el MEJOR cultivo desbloqueado por
  ganancia neta (cebolla 10 vs papa 2 → 4-5 tandas en vez de 20, con fallback si la plata
  no alcanza para su semilla); el boost de cultivo aplica a CUALQUIER cultivo (antes solo
  papa — la cebolla sugerida habría crecido 50 min reales); y el DESVÍO tiene boost propio
  más fuerte (`TUTO_BOOST_DESVIO` 0.04: papa ~22 s, cebolla ~2 min), prendido por la marca
  `plata:true` en todos los eslabones de la cadena. El eslabón de venta liquida el stock
  de mayor precio primero. 4 escenarios simulados (niveles de Cultivo, plata corta, stock
  mixto) — guía correcta en todos.
- **3ª pasada — los eslabones ya no estrangulan la tanda (playtest: "solo me deja plantar
  UNA")**: con el boost la papa está lista en ~22 s — plantabas la primera, el sub saltaba
  a "cosechá" (que solo permitía cosechar) y la tanda moría a mitad de plantada: bucle de
  a 1 otra vez. Ahora TODOS los eslabones de la cadena de la plata permiten el loop
  agrícola completo (plantar, cosechar, vender, comprar, desbloquear parcela) — el texto
  y la flecha guían el foco, los permisos no frenan la mano. Reproducido y verificado en
  simulación con el estado exacto del playtest (1 lista + 1 creciendo + semillas en bolsa).
- **4ª pasada — el planificador de PIEDRA (playtest: 5/15 piedras, pico muerto, BLOQUEADO)**:
  el paso de piedra solo ofrecía "reparalo", pero reparar cuesta 1 madera POR USO, la
  madera estaba reservada para la obra y el paso no permitía ni talar ni el loop de plata:
  softlock completo. Espejo del planificador de madera con un nivel más de cadena:
  faltan N piedras → N reparaciones → N maderas DE SOBRA (lo reservado para la obra no se
  toca — `tutoGuardia` regla 3 ahora también cubre los pasos "juntá" vía `st.dep`, y
  `repairPick` pasó a consultarla) → sin madera libre, talá (con boost y CD corto también
  en los nodos del DESVÍO) → sin hachas, su plan de plata. 6 escenarios simulados,
  incluido el estado exacto del playtest.
- **Colchón anti-cero-absoluto** (detectado en la simulación, no en juego): con nada
  plantado, sin semillas y sin cosecha, gastar la última plata te dejaba sin ninguna
  palanca económica. El guardia ahora reserva siempre el precio de una semilla de papa;
  comprar la semilla está exento — esa compra ES la salida.
- **El ADELANTO (idea de dirección, 14/8) — "la primera vez se aprende, las repeticiones
  se pagan"**: en vez de empujar al jugador a repetir 20 veces un loop que ya aprendió,
  al ENTRAR a un paso de "juntá madera/piedra" el tutorial calcula las herramientas que
  faltan para la meta completa y ACREDITA esa plata exacta (madera → hachas × precio;
  piedra → reparaciones × precio del hacha, descontando hachas y madera en mano), con su
  celebración. En los pasos tempranos el kit de arranque alcanza → adelanto 0: la
  progresión enseña primero y regala después, sola, sin casos especiales. Una vez por
  paso (`G.tuto.adel`, persiste en el guardado; idempotente ante F5 y migraciones — corre
  en `tutoSync`). Las cadenas de sub-objetivos quedan como red de seguridad si el jugador
  malgasta el adelanto. 7 casos verificados, incluido el del playtest (5/15 y pico muerto
  → +30 exactos).

### Tutorial v10 — el arranque al derecho y CERO pasos de plata (14/8, dirección)

- **Nacés con 3 de plata, no con semillas**: el 1er objetivo es COMPRAR las 3 semillas en
  el Mercado → plantá → cosechá → vendé. El ciclo completo en su orden natural, y el
  viejo paso 4 ("con esa plata comprá semillas") murió: era la misma lección repetida.
- **Los pasos "juntá plata" desaparecieron** (silver y silverarm): "la primera vez se
  aprende, las repeticiones se pagan". El Hacha de la lección llega con su adelanto (lo
  que falte para 10) y la forja de Armas también: adelanto de `ARMAS_UNLOCK_PLATA` + las
  herramientas para juntar sus 20 madera + 20 piedra, que ahora se juntan EN el paso
  (chop/mine/crafttool permitidos y con boost + CD corto — `unlockarm` entró al mapa de
  boost de árboles y rocas).
- La cadena queda en **40 pasos**. Verificación completa: hermética, sin huérfanos,
  planos a tiempo, place<juntá<depósito, y 5 escenarios nuevos de adelanto (crafttool
  parcial, unlockarm pelado/parcial, arranque sin adelanto). `TUTO_VER=10`.
### GIRO DE DISEÑO (14/8, dirección): los objetivos pasan a ser GUÍA OPCIONAL

Tras un día entero de tapar fugas del embudo (cada playtest encontraba una nueva), la
decisión de fondo: el sistema de objetivos NO restringe nada. El jugador lo sigue cuando
quiere o lo ignora y juega libre. Consecuencias, todas del mismo golpe:

- **`tutoPermite` y `tutoGuardia` siempre dicen que sí** (quedan como funciones porque
  hay ~15 llamadas repartidas; la tabla `TUTO_PERMISOS` se conserva como documentación
  y el cuerpo viejo del guardia queda guardado por si se quiere reactivar).
- **Los tiempos acelerados se retiran** (`tutoBoost` = 1 siempre, y el CD corto "mientras
  el paso lo pide" también): con la guía opcional serían explotables jugando "con el
  objetivo puesto". Quedan los pacings de diseño: `CD_RAPIDO` (primeras 10 por nodo) y
  las semillas rápidas del arranque.
- **Lo que SÍ queda**: la lista de 40 pasos con cartel + flechas + sub-objetivos como
  CONSEJO, el avance automático, las recompensas (`pr`) y los KITS del objetivo
  (herramientas/ingredientes al entrar a cada paso — ahora son catch-up, no desbloqueo).
  La excepción de nivel en plano/depósito durante el tutorial también queda (la guía
  cumple lo que promete).
- **Interruptor "Guía de objetivos: Sí/No"** en Configuración (localStorage): apaga
  cartel y flechas; los objetivos siguen avanzando y premiando en silencio.

### El ONBOARDING de 3 capas (14/8, aprobado por dirección)

1. **Primeros 10 minutos**: comprá → plantá → cosechá → vendé + la Herrería (plano →
   juntar 5+2 → depositar). Al reclamar ese capítulo, la lección del género: "💡 dejá una
   tanda plantada antes de salir — tus cultivos crecen aunque cierres el juego".
2. **Enseñanza por contacto**: los PLANOS caen por NIVEL puro, siempre (`planosSync`
   reescrito) — el jugador libre que sube a nivel 3 recibe su plano del Horno con
   celebración aunque ignore la guía; y si la guía va adelante del nivel, el plano cae
   igual por su paso `place_` (ambos caminos abiertos, sin saneo retroactivo).
### ECONOMÍA WEB3 aplicada de punta a punta (14/8, dirección: "producirlo y mostrarlo")

Principio: **cada plata regalada es emisión que termina en el P2P** — los premios pagan
INSUMOS (cosas que se usan) y la plata sale de vender lo producido. Aplicado a todo:

- **Capítulos**: de plata a insumos con identidad — 5 semillas (cosecha), 5 hachas
  (Herrería), 5 usos de pico (Horno), 2 Papas Asadas (Cocina), 20 flechas (Armas),
  10 lombrices + 5 carnes (Zona), 3 barras (Minería), 2 esencias rúnicas (Altar) y
  **1 FICHA DE PARCELA** (Maestría). El panel muestra la recompensa de cada uno.
- **Los 19 `pr` de plata por paso se eliminaron** — los capítulos son la capa de premio.
- **El cierre de la guía paga TIERRA**: +1 parcela (antes 100 de plata).
- **Pase FREE**: las 10 filas de plata → insumos equivalentes (madera, lombrices,
  barras, flechas, carne, bronce, esencia, platos, +1 ficha).
- **Pase VIP**: las 12 filas de plata → cosmético + insumos ricos + fichas; el $Golden
  del track queda (devolución parcial de los 250 quemados al comprarlo). Regla: el VIP
  jamás paga plata ni poder — con P2P, el pay-to-win destruye el mercado.
- **Quedan como grifos de plata**: vender (el central, del jugador), el 20% del cofre
  diario y los 10 del hacha-lección. Todos con tope o de una vez.

- **Se nace con 3 parcelas, no 2 (dirección)**: la primera misión planta 3 semillas y
  tiene que haber 3 celdas donde apuntar. La tabla `FARM_PARCELA` sigue igual (nivel 2
  "regalaba" la 3ª, que ahora ya viene de fábrica; la 4ª llega en nivel 4).

### Las MARIPOSAS GUÍA v3 (14/8, dirección) — el imán es la MADUREZ del recurso

- **Regla central nueva**: un recurso disponible hace **más de 10 segundos** está
  desatendido y atrae una mariposa (revolotea y a ratos se posa), jugando o no — la
  edad de disponibilidad se mide con el readyAt real de nodos y cosechas. **Prioridad**:
  primero lo relacionado con el objetivo actual (madera del paso → árboles; piedra →
  rocas; plantar/cosechar → parcelas), y a igual prioridad, lo más viejo primero (lo
  más olvidado llama más). Recursos frescos (<10 s) no reciben mariposa: si lo estás
  trabajando, no te persiguen.
- El detector de "perdido" (~8 s quieto) queda para lo extra: la escolta del objetivo
  cuando es un edificio/obra (guiaTarget) y la tierra seca como sugerencia final.
- Vuelo: curvas abiertas por tope de giro, posadas de 2-5 s con alas casi plegadas,
  despegue en curva, siempre al frente. El repertorio completo al servicio de señalar
  sin decir nada.

### Las MARIPOSAS GUÍA v2 (14/8) — solo señalan al jugador PERDIDO

- **Detector de "perdido"**: cualquier clic marca actividad (`ultimaAccion`); si pasan
  ~8 s sin tocar nada Y hay cosas por hacer, recién ahí las mariposas van a señalarlas
  (la 1ª al objetivo, las otras a accionables distintos). Mientras jugás: vuelo libre y
  su encanto original de posarse en la cosecha lista. Son mariposas, a fin de cuentas.
- **Nivel también cuenta**: la veta bloqueada por nivel de granja (`nodoBloqueado`) ya
  no se señala — revoloteaba una roca "necesitás nivel 3" (playtest).
- **Vuelo con inercia** (playtest: "giros bruscos"): el destino ATRAE a la mariposa
  (resorte + amortiguación + tope de velocidad) — para girar dibuja una curva, nunca
  invierte en seco; y los cambios de órbita (radio/ritmo/fase) se deslizan en vez de
  saltar. Siempre al frente (quedaba detrás del sprite del mercadillo).

### Las MARIPOSAS GUÍA (14/8, idea de dirección) — señalización viva, cero flechas

Tres iteraciones en una tarde: texto "mientras tanto" (muy explícito) → empujoncito de
polvillo (mejor) → LA buena, de dirección: las 3 mariposas que ya volaban de adorno son
ahora el sistema de señalización del mundo. **La 1ª acompaña al OBJETIVO del tutorial**
(revolotea en circulitos sobre el árbol/parcela/obra que el cartel pide — la flecha
triangular murió definitivamente). **Las otras 2 merodean cosas que el jugador SÍ puede
hacer ahora**, con detección de capacidad: sin hachas no van al árbol, sin usos de pico
no van a la roca (ni a vetas que su pico no puede), sin semillas no van a la tierra
seca. Cada mariposa reclama un destino DISTINTO (no se amontonan), se reasignan cada
2,5 s, y sin nada que señalar vuelan libres como siempre. Terminado el tutorial las
tres quedan de señaladoras de accionables — la guía se funde con el mundo. La flecha
DOM sigue viva solo dentro de interfaces y sobre la barra rápida.

### REBALANCE INTEGRAL con mandato de dirección (14/8) — física única y ritmo real

Dirección otorgó control total del balance con un criterio: "el juego marcha desde el
principio, sin ritmo ficticio". El MANIFIESTO completo (todo a validar por el diseñador):

| Qué | Antes | Ahora | Por qué |
|---|---|---|---|
| Papa | 9 min | **90 s** | tier 1 rápido DE BASE (estilo SFL) — jubila la aceleración |
| Zanahoria→Maíz | 25m→24h | **5m→24h** | escalera que duplica por tier; el maíz no cambia |
| Árbol CD | 3m×10 / 90m | **2m×15 / 60m** | la tala dominaba la sesión 1 (25 de 39 min) |
| Roca CD | 4m×10 / 120m | **3m×15 / 90m** | ídem |
| Hacha | 10 plata | **6** | baja el peaje por unidad; la venta sigue siendo EL grifo |
| Pico piedra | 3 mad + 10 | **2 mad + 6** | cada piedra costaba 3 maderas + plata (cadena medida) |
| Pico bronce/oro | 4+5+10 / 5br+35 | **3+4+8 / 3br+20** | la cadena del oro del Altar medía ~700 de plata |
| Caña | 15 oro | **8 oro** | proporción con el pico de oro nuevo |
| Cocina | 20 mad + 15 pie | **15 + 8** | la muralla del tutorial (23 h → 75 min, medido) |
| Altar | 60+40+20oro+30$G | **40+30+8oro+20$G** | proyecto de semana 1, no de mes |
| Establo/Curtid./Ofrendas | 50/45/80… | **40/35/60…** | misma proporción |
| Forja de Armas | 1000 + 20+20 | **300 + 15+10** | meta del día 2 (12.8 h, medido) |
| Aceleración del tutorial | 3 s por paso | **ELIMINADA** | una sola física; FIRST_GROW apagado |

Nota anti-inflación: el CUPO diario de semillas (intacto) hace que la velocidad de los
cultivos no cambie el ingreso máximo POR DÍA — solo cuán rápido se alcanza.

**−50% adicional (dirección, mismo día)**: todos los tiempos de espera a la mitad —
papa 45 s, zanahoria 2,5 min … maíz 12 h; árbol 1 min ×15 / 30 min; roca 1,5 min ×15 /
45 min; vetas también. ⚠ Único punto a validar: el maíz a 12 h pierde el ancla "de un
día completo" (plantá antes de dormir) — si el diseñador la quiere, es una línea.
Arco final medido: sesión 1 (hasta el Hacha) = **19 min** · Cocina = **42 min** · Armas
= **6,4 h** (esa misma noche o día 2) · Minería = **11 h** · Altar = **36 h** (día 2-3).

### REVERSIÓN DEL CAPATAZ (14/8, dirección: "al final no me gustó — flechitas y sin premios")

Se probó y no cuajó. Vuelve el sistema anterior, más simple y más honesto:

- **Fuera**: la burbuja del capataz, sus líneas y reacciones, el foco (mundo e interfaz),
  los kits del objetivo, las pagas de los capítulos, la parcela final de regalo, las
  manos vacías. **El tutorial NO da nada** — ni premios ni experiencia regalada: enseña.
- **Vuelve**: el cartel "Objetivo" con contador, la flechita triangular del mundo, la
  flecha DOM en interfaces, el set de arranque (15 hachas, 15 usos de pico, caña) y los
  accesos de la barra.
- **La cadena se recorta a LO BÁSICO de la granja: 19 pasos** (comprá→plantá→cosechá→
  vendé → Herrería → Horno + Hacha → Cocina + comer). Armas, Zona Negra, minería
  avanzada y Altar se aprenden jugando: sus planos caen por nivel y cada sistema se
  presenta solo. El panel Objetivos queda como lista de progreso (4 capítulos, sin
  botones de cobro). `TUTO_VER=12`.
- **Se queda**: las esperas de 3 s durante el tutorial (al completarlo, tiempos reales),
  el kit de emergencia en $Golden, la guía apagable, los sub-objetivos como consejo, y
  toda la economía web3 del Pase (esa no era del capataz).
- **v2 — el ESTACIONAMIENTO, cerrado (dirección lo encontró jugando: quedarse en "colocá
  el plano" comprando semillas y farmeando a 3 s = imprenta de plata)**: la aceleración
  es ahora POR PASO Y POR RECURSO (`tutoAcelerado(tipo)`) — árboles a 3 s SOLO en sus 3
  pasos de madera, rocas SOLO en sus 3 de piedra, la olla SOLO en "cociná tu primer
  plato". Los CULTIVOS no se aceleran nunca (las 3 del arranque ya crecen en 45 s por
  FIRST_GROW) y el horno va a tiempo real (ya no está en la cadena). Como cumplir el
  paso lo avanza solo, no hay dónde estacionarse; y vender lo acelerado es a pérdida
  (madera sale 3, el hacha 10). Verificado paso a paso: solo 7 de los 19 pasos aceleran
  algo, cada uno lo suyo, y al completar el tutorial todo queda a tiempo real.
- **El PICO habla el idioma del HACHA (dirección: "el diseñador pidió que las
  herramientas se gasten igual")**: mecánicamente YA era así — picos apilables, 1 pico =
  1 picada, craftear suma al stock (decisión del 31/7) — pero la presentación mentía:
  textos de "usos"/"durabilidad", displays "14/1", "¡Pico destruido!" y una función de
  REPARAR que encima era destructiva (reparar ponía el stock en 1: 15 picos → 1). Ahora:
  `repairPick` sellada ("los picos no se reparan — crafteá más"), logs "Quedan N picos",
  "Usaste tu último pico", y el kit de emergencia vende "Pico de Piedra · se suma a tu
  pila (como las hachas)". Un solo modelo mental para todas las herramientas.
- **v8 — SIMULACIÓN ESCRITA del tutorial completo (dirección pidió el recorrido paso a
  paso) → 4 trabas, 3 arregladas**: (1) el paso del Hacha con 9 de plata era un muro de
  9 min — ahora tiene su sub de plata (meta 10) con siembra acelerada; (2) el tope del
  125% acumulaba valor BRUTO y cortaba el plan en ~150 de 190 ganados — ahora acumula
  GANANCIA NETA (precio − semilla): verificado, 95 papas aceleradas llegan justo a 191 y
  el bucle sigue muerto en el 125% neto; (3) el SUB no aceleraba lo que él mismo pedía
  ("talá 30 árboles para los picos" en un paso de piedra = 90 min de muro) — ahora el
  recurso que el sub permite (chop/mine) también corre a 3 s. (4) El BALANCE del paso 16
  (10 piedras = cadena de ~400 de plata por el pico de 1 uso) quedó en TODO para el
  diseñador, junto con "guardá 1 papa para la receta del paso 18".
- **v7 (dirección hizo la cuenta: "que NO se pueda hacer mucho más de 200 — la robustez
  tiene que estar ahí")**: el agujero fino era GASTAR la plata en cosas que la proyección
  no cuenta (parcelas, adornos) — la proyección bajaba y se podía volver a plantar
  acelerado: bucle infinito. Cierre: **TOPE VITALICIO del plan al 125% de la meta**
  (`planAcelListo`, `PLAN_TOPE_FACTOR`) — por misión de plata, el valor total sembrado
  con aceleración no supera meta × 1.25, gastes en lo que gastes; el acumulado NO se
  resetea con la proyección, solo al cambiar de misión (paso+meta). Ataque simulado:
  farmear a 201, vaciar la plata en una parcela, reintentar → solo 3 siembras más y el
  bucle muere en 240/250. Cualquier mezcla de cultivos respeta el mismo tope (se cuenta
  por VALOR, no por semilla).
- **v6 (playtest: "¿por qué la cebolla sí me capea?")**: la exención "del plan" era
  demasiado fina — la cebolla cubre la proyección rapidísimo (16 por semilla) y el cupo
  volvía a aplicar a mitad de compra. Regla simple y FINAL de dirección: **tutorial
  activo = semillas sin cupo; tutorial terminado = cupo normal**. El cartel de la tienda
  lo dice ("Semillas SIN LÍMITE durante el tutorial"). La aceleración de siembras sigue
  acotada por la contabilidad del plan — sin cupo no significa sin control.
- **v5 (playtest: "el cupo de semillas me impide llegar a los 200")**: el cálculo lo
  confirmó — 200 de plata con papas son ~100 semillas y el cupo diario es ~24: la misión
  era imposible. Solución robusta (mejor que "sin límites en el tutorial"): la COMPRA DEL
  PLAN no gasta cupo, y se acota SOLA por la contabilidad — las semillas en bolsa entran
  a la proyección (cosecha futura), y como comprar baja plata y sube semillas, la
  proyección crece por la ganancia NETA: la exención se corta en las semillas EXACTAS
  que la meta necesita (verificado: meta 200 con 67 de plata → 67 papas justas y ni una
  más). Fuera del plan, el cupo diario manda igual que siempre. Imposible acaparar.
- **Y el plano en su MOMENTO (playtest: "me lo dan antes de vender las papas")**: durante
  el tutorial, los planos cuya misión está en la cadena llegan SOLO al aparecer su paso
  "colocá el plano" (`planosSync` v2) — ni el nivel los adelanta. Los planos fuera de la
  cadena (Altar, Establo…) y todo el post-tutorial siguen cayendo por nivel puro.
  Verificado: nivel 5 en el paso de cosechar = cero planos; paso 4 = la Herrería justa.
- **v4 (dirección: el desvío de plata también acelera, pero con CONTROL contable)**: si
  el sub-objetivo pide plata (ej. "te faltan 20 hachas — 200 de plata"), las siembras
  "DEL PLAN" corren a 3 s mientras la PROYECCIÓN no cubra la meta: proyección = plata en
  mano + cosecha en bolsa + lo que está creciendo (atesorar cuenta → no hay imprenta).
  Cubierta la meta: las siembras extra van a tiempo real con aviso al plantar, y suena
  el AVISO único "🎯 con lo plantado y tu bolsa ya cubrís los X — cosechá y vendé"
  (`plataProyectada`/`subPlataMeta`/`tutoAvisoCubierto`, chequeado por segundo en
  tutoSync). Contabilidad verificada con 3 escenarios.
- **v3 (playtest: "talé entre planos y el árbol quedó 2 min enfriándose")**: los
  enfriamientos YA CORRIENDO también se recortan — si el paso activo pide ese recurso,
  el update de la escena baja en vivo cualquier readyAt a ≤3 s (una tala hecha fuera de
  su paso dejaba el CD de 180 s cruzado en el paso siguiente). Y las 3 semillas del
  arranque pasan de 45 s a **3 s** (`FIRST_GROW_MS` — son solo 3, sin exploit).

### EL CAPATAZ + los PEDIDOS (14/8, dirección: "hagamos el cambio y probémoslo")

Onboarding rediseñado desde cero alrededor de una VOZ y un TABLÓN (v1 para testear):

- **El Capataz**: burbuja de diálogo (retrato placeholder 🧑‍🌾 — arte PixelLab si cuaja)
  que habla de a UNA línea, clic para cerrar, cola si se amontonan, y cada línea se dice
  una sola vez por partida (`G.capVisto`, persiste). Es el portavoz de todo: presenta
  cada capítulo con su línea propia (9 líneas con carácter — "¡Al fin llegás! La granja
  está dormida hace años…"), avisa cuando cae un plano ("te conseguí el plano — está en
  tu barra"), da la lección del género al terminar la Herrería ("dejá una tanda plantada
  — crece aunque cierres el juego") y se despide al final de la guía.
- **Los Objetivos ahora son PEDIDOS**: el panel pasa a "📋 Pedidos del Capataz", el
  cartel de arriba dice "Pedido", los botones "Cobrar"/"Cobrado" y la recompensa es "la
  paga". Mismo motor de fondo (capítulos, flechas, kits) — cambia la cara y el tono:
  alguien te PIDE cosas, no un sistema te ordena.
- Pendiente si cuaja: retrato real del capataz (PixelLab), tablón físico en el mapa,
  pedidos DIARIOS de bienes (unificar las misiones diarias al mismo sistema).
- **Fix del playtest ("apareció unos segundos y desapareció")**: la burbuja ya NO se
  cierra sola — una instrucción no puede evaporarse; cerrar es un clic. Y el cartel
  "Pedido" de arriba quedó clickeable: lo tocás y el capataz repite la línea del
  capítulo activo (las líneas una-sola-vez dejan de perderse para siempre).
- **v2 (dirección): burbuja ARRIBA + el FOCO** — la burbuja habla desde arriba, en el
  lugar del cartel Pedido (que se esconde mientras tanto: nunca dos textos compitiendo).
  Y la "vignette de foco" del diseño original: durante la guía, TODO se oscurece salvo
  el lugar donde hay que actuar — en el MUNDO, un círculo de luz suave sigue al objetivo
  de la flecha (RenderTexture con erase, 45% de sombra, se apaga en paneles/edición y al
  terminar la guía); en las INTERFACES, el botón apuntado queda iluminado y el resto del
  panel en penumbra (box-shadow gigante con agujero). Guía apagada = sin foco.
- **v3 (playtest)**: el círculo salía CORRIDO con zoom — la posición en pantalla sale de
  `cam.worldView`, no de `scroll` (difieren cuando hay zoom). Y decisión de dirección:
  en el MUNDO ya no hay flecha triangular — el círculo de luz es el ÚNICO señalador
  (la flecha DOM sigue viva dentro de interfaces y sobre la barra rápida).
- **v8 (dirección): TODA espera dura 3 SEGUNDOS durante el tutorial completo** — cultivos,
  árboles, minerales, horno y cocina (`TUTO_ESPERA_SEG`/`tutoAcelerado()` en nodoCd,
  plantado, fundido y cocción). El tutorial enseña el ciclo, no la paciencia; al
  completar la guía, los timers se normalizan solos. Supersede al v7 (20/25 s solo hasta
  el Hacha). ⚠ Anotado en TODO: vigilar el "estacionamiento" (no cumplir a propósito un
  paso tardío para farmear acelerado) — mitigable acotando capítulos si aparece.
- **v6 (dirección: "que se ASEGURE de que cumpla lo que pide")**: el capataz verificaba
  el EVENTO (una compra) y no la CANTIDAD — comprabas 1 semilla y ya te mandaba a
  plantar 3. Los cuatro pasos del arranque cuentan de a UNA unidad real: comprar dispara
  un evento POR SEMILLA (solo papa), vender POR PAPA, y los pasos piden 3/3/3/3
  (`TUTO_VER=11`). El diálogo queda: compro 1 → "¡Bien! 1/3" → compro 2 → "¡Eso! 2/3" →
  "¡Perfecto! Plantá tus 3 papas". Verificado con el recorrido completo simulado.
- **v5 (dirección: "que TODO el tutorial sea en diálogos")**: el cartel Pedido MURIÓ —
  el capataz es el único canal de guía. Su burbuja es PERSISTENTE (muestra siempre la
  instrucción del momento con el progreso: "Plantá tus 3 papas <b>2/3</b>") y REACCIONA
  en vivo a cada acción: gritos rotativos por unidad ("¡Bien!", "¡Eso!", "¡Muy bien!",
  "¡Así se hace!") y "¡Perfecto!" al presentar el paso siguiente. Las intros de capítulo
  pisan la instrucción al entrar (misma burbuja) y la primera acción las reemplaza. Clic
  en la burbuja la achica a la CARITA (chip) — la guía nunca desaparece, solo se hace
  chiquita; otro clic la reabre. Con la guía apagada o terminada, el capataz se calla.
- **v4 (dirección: "el foco debe estar sobre la cosa, inmóvil, más allá de la cámara")**:
  el foco pasó de pantalla a MUNDO — manto oscuro sobre toda la granja con el agujero
  anclado al objeto en coordenadas de mundo (máscara de geometría invertida,
  `invertAlpha`). La cámara mueve manto y agujero juntos: cero desfase con paneo, zoom o
  lerp, y encima más barato (nada se redibuja por frame, solo `setPosition`).
- **Se nace con las MANOS VACÍAS (dirección: "¿es necesario ese kit?")**: fuera el
  starter de 15 hachas + 15 usos de pico + caña — la barra llena contradecía el
  onboarding y desinflaba la lección de craftear. La hotbar nace vacía y cada
  herramienta la da el CAPATAZ cuando su pedido la necesita: 5 hachas en "juntá 5 de
  madera", el pico de piedra con 2 usos en su paso, 10 más para el Horno… y en el paso
  de pesca —fuera del tope del Hacha, es primer contacto— le presta su caña vieja con
  10 lanzamientos ("las nuevas se craftean en la Herrería"). Cada herramienta entra
  sola a la barra al recibirse (`herramientaAHotbar`). El walkthrough simulado da
  IDÉNTICO timing (45 min hasta el Hacha): los kits reemplazan al starter sin costo.

### Feedback del diseñador sobre el panel Objetivos (14/8, Discord) — 4 pedidos

- **"Está muy llamativa y las recompensas está bien"** — panel aprobado.
- **Tiempos y cupos REALES**: `GF.TESTEO = 0` — el diseñador testea con la economía real.
- **🆘 KIT DE EMERGENCIA en $Golden** (Tienda → Comprar): hacha (2 $G), uso de pico
  (2 $G) y semilla de papa (1 $G) — tope 5 diarias de cada una, contador visible, las
  semillas NO gastan el cupo diario. "Por si se quedan atascados" + utilidad diaria para
  el $Golden. Precios tuneables (`EMERG_GOLDEN`/`EMERG_MAX`) — a validar.
- **El tutorial TERMINA con el capítulo del Hacha** (~Cultivo 2, cuando abre la
  zanahoria): los kits del objetivo solo se entregan hasta el paso `crafttool`; de ahí en
  más, tiempos y economía normales — el rescate para atascados es el kit de emergencia.
- **Simulador de progresión** (`tools/sim-progresion.js`): 30 días × 3 perfiles con los
  números reales. Hallazgos para balance: todos convergen a nivel 12 el día 30 (falta
  techo para el hardcore), el pico hace que cada piedra cueste 3 maderas (la Cocina vale
  65 maderas efectivas), y el margen de cultivos escala geométrico (hardcore junta 105k).
  Palancas propuestas en el informe — decisión pendiente del diseñador.

- **Curva de niveles de granja ~2.5× más lenta en los primeros 10 (dirección: "la barra
  se llena de planos en 5 minutos")**: `FARM_XP_LVLS` 2-10 pasa a [25, 90, 225, 550,
  1250, 2750, 5500, 9000, 14000] — en papas: nivel 2 = 3, nivel 3 = 10, nivel 5 = ~62,
  nivel 7 = ~300 (menos con cultivos mejores, que dan mucha más XP). Del 11 en adelante
  la tabla original del diseñador sigue intacta, y la XP de los cultivos no se tocó (el
  nivel de Cultivo y las skills no cambian). Los planos ahora gotean al ritmo del juego.
- **Fix inmediato (playtest: "tenía el plano de la Herrería desde el segundo inicial")**:
  con planos por nivel puro y `PLANO_NIVEL.store = 1`, el plano caía en el segundo CERO.
  Subió a nivel 2, que se alcanza cosechando la segunda papa (9 XP c/u, el nivel pide 10)
  — llega en plena primera cosecha, justo antes de que la guía apunte a la Herrería. El
  camino guiado no depende de esto: el paso `place_store` lo entrega igual.
3. **Panel "🎯 Objetivos"** (menú): los 40 pasos agrupados en **9 CAPÍTULOS reclamables**
   (`TUTO_CAPS`): Tu primera cosecha (25) · La Herrería (50) · El Horno (50) · La Cocina
   (75) · Las Armas (75) · La Zona Negra (100) · Minería avanzada (100) · El Altar (150)
   · Maestría de la granja (200). Cada capítulo lista sus pasos con ✅/▶️/⬜, el premio se
   RECLAMA con botón (no cae solo — `G.capsClaim`, persiste), y el que juega libre lo
   cobra igual cuando le pasa por encima. Verificado por script: los 9 capítulos cubren
   los 40 pasos exactos, sin repetidos y en el orden de la cadena.

- **Vender platos también pasa por el embudo (playtest: vendió la Papa Asada en pleno
  "comé un plato" y quedó trabado)**: `sellDish` no consultaba `tutoPermite("sell")` —
  era la única venta sin embudo. Además el paso "eat" tiene red doble: permite recocinar
  y su kit repone los ingredientes SI no queda ningún plato en la bolsa (partidas ya
  trabadas se curan solas al entrar el fix).
- **El kit también repone los INGREDIENTES de la Papa Asada (playtest: "no tengo los
  ingredientes")**: al llegar a "cociná tu primer plato", las papas ya se vendieron y la
  madera se depositó en las obras — y la lección de ese paso es COCINAR, no volver a
  farmear migajas. El kit entrega lo que falte de la receta (1 papa + 1 madera, leído de
  `RECIPE_DEF`, descontando lo que haya en bolsa). El paso además abre buyseed/chop/
  crafttool como red por si se malgasta. Verificado: kit completo y kit parcial.
- **El cuarteto inicial se estrangulaba solo (playtest: compró 1 semilla, la plantó, la
  cosechó y quedó bloqueado en "cosechá tus 3")**: cada paso del arranque permitía solo
  su acción — el paso podía exigir 3 papas y a la vez impedir producirlas. Los 4 pasos
  del arranque permiten ahora el loop entero (las flechas guían el orden), y regla nueva
  en `tutoPermite`: COSECHAR lo propio jamás se bloquea — no genera plata por sí solo,
  la puerta guardada es vender.
- **El depósito de la obra también respetaba el nivel de granja (playtest: "la Cocina
  pide nivel 5")**: `obraDepositar` tenía el mismo candado que ya se había sacado de la
  entrega del plano. Misma regla en ambos: durante el tutorial manda el PASO, no el nivel
  (con el embudo estricto no hay forma de subir de nivel para destrabar); fuera del
  tutorial el candado sigue vigente.
- **ADELANTO v2 — el KIT entrega HERRAMIENTAS, no plata (dirección, tras quedar
  bloqueado en 5/15 piedras)**: el pico a 0 usos se DESTRUYE (`destroyPick`), NO se
  repara — toda la cadena de "reparalo (1 madera)" estaba construida sobre un supuesto
  falso, y un Pico de Piedra nuevo sale 3 madera + 10 plata por UN uso: sin plata,
  softlock. Ahora el kit del objetivo da lo concreto: pasos de madera → las hachas que
  falten; pasos de piedra → usos de pico (y si el pico murió, revive el de piedra);
  crafttool → plata (esa ES la lección); unlockarm → su plata + hachas + usos para los
  materiales. Marca nueva `G.tuto.adelv` — los guardados trabados en un paso ya "cobrado"
  con la cuenta vieja RECIBEN el kit al entrar el fix. El planificador de piedra se
  reescribió como red de seguridad real: craftear picos (apilables, botón ×5) → sin
  plata, su plan → sin madera libre, talar. Verificado con el estado exacto del bloqueo
  (pico destruido, 30 maderas con 20 reservadas, marca vieja cobrada → kit de 10 usos y
  a picar).
- **El adelanto de la piedra contaba madera RESERVADA como libre (playtest cocina)**: al
  entrar a "juntá 15 de piedra", el adelanto restaba las 20 maderas en bolsa creyendo que
  pagaban las reparaciones del pico — pero están reservadas para la obra (el guardia no
  deja gastarlas) — y daba 0; el sub-planificador, que SÍ resta la reserva, terminaba
  mandando al bucle de la papa que el jugador ya aprendió. Ahora ambos usan la misma
  cuenta (madera libre = bolsa − pendiente de la obra vía `st.dep`): el adelanto llega
  completo (+150 en el caso del playtest) y el bucle no aparece. Verificado con el par
  reservada/libre en simulación.
- **La Herrería "viajaba en el tiempo" al craftear (playtest)**: al encenderse la fragua,
  `updateForge` cambiaba la textura a `store_lit` — arte del SET VIEJO (97×99 del 9/8;
  el mercadillo es 110×118 del 12/8) — y al apagarse volvía. El swap se retiró: el fuego
  vivo por código (resplandor + palpitación) ya dice "encendida". Si algún día se genera
  el estado lit del set nuevo, reactivar el swap (nota en el código).

Y el "bloqueo momentáneo" al colocar un plano era el REINICIO de escena (reconstruye
~570 sprites de golpe): ahora pasa detrás de un telón de 160 ms con el fundido que ya
existía (`reiniciarGranjaSuave`), también al colocar parcelas — el mismo parpadeo se lee
como transición y no como congelamiento.

### El bug real del "salió construida" — cazado en la 2ª pasada

El usuario insistió (con razón): la obra de la Herrería mostraba el edificio TERMINADO
aunque el cartel de materiales decía 0/5. No era TESTEO: era **`updateForge()`**, que
corre en cada tick para prender/apagar la fragua y pisaba `build_store` con "store"
terminado. Ahora se frena mientras la herrería no esté construida. De paso cayeron dos
parientes: el **humo de la Herrería y de la Cocina** salía SIEMPRE (`() => true`) —
humeaban sobre la obra o sobre el pasto vacío. Ahora solo humean construidas.

### El mapa inicial ordenado por zonas + la CERCA PERIMETRAL intocable

El arranque queda zonificado con lógica de lectura: **parcelas + granero** al noroeste,
**bosquecito** (6 árboles) al noreste, **cantera** (6 rocas + minerales) al sureste,
**laguna** al suroeste, **mercadillo** al sur y **portal** en la esquina. Verificado por
script que ninguna zona pisa a otra.

**La cerca que rodea la granja es intocable**: el anillo del borde (2 filas arriba por
la cerca de frente, 1 celda en los otros lados) ya no admite que se coloque ni se
arrastre NADA encima — adornos, parcelas, obras de blueprint, edificios movidos,
árboles, piedras ni la laguna. Un solo helper (`GF.enCerca`) enchufado en los 4
validadores de colocación, así cualquier mecánica futura lo hereda gratis. (El corral
de animales viejo sigue deprecado y sin dibujarse: los animales andan sueltos.)

**Y la GENERACIÓN inicial reordenada a la grilla** (la captura del usuario mostró
árboles, minerales y el portal naciendo SOBRE la cerca): bosquecito NE en 3 filas
prolijas (6 árboles), cantera SE en bloque — fila de rocas arriba, minerales abajo en
orden de tier (piedra → bronce → oro / hierro → diamante → netherita) — y el portal
adentro de la esquina (antes nacía pisando el vértice de la cerca). Verificado por
script: nada pisa la cerca, nada se superpone.

### El "temblor leve" de toda la pantalla — arreglado

Reporte del usuario: todo parecía vibrar milímetros, sub-segundo, constante. Causa:
`roundPixels: true` + zoom fraccionario + cámara con suavizado — el redondeo a píxel
entero hacía que TODO saltara ±1px mientras la cámara se acomodaba sin llegar nunca a
quedarse quieta. Se apagó `roundPixels` (global y en el follow de granja, Bosque y
plaza): con `antialias: true` y el atlas desempaquetado en texturas sueltas no cumplía
ninguna función y solo generaba el temblor.

Atlas final del día: `?v=43`, 579 sprites.

---

## Pendientes conocidos
*(actualizado el 11/8)*

### Antes de publicar
- Deploy del 9/8 hecho: ya está todo en vivo.
- **`GF.TESTEO = 1` → 0** en config.js. Es lo único que queda antes de abrirlo al público: con
  esto en 1 los tiempos son de segundos y el juego regala materiales.

### Arte pendiente
- Las **11 criaturas del bestiario** y los **8 adornos** ya están integrados (10/8).
- ~~Efectos por arma~~ hechos por código (10/8). Animaciones de ataque propias por arma siguen
  pendientes (hoy todos usan el espadazo).
- **Cosméticos**: ~~skins~~ hechas (10/8): sombrero (con su PNG integrado), pétalos y granja
  legendaria funcionan. La **mascota** y las **decoraciones del cofre** (espantapájaros dorado
  y farolito) ya están (10/8).
- ~~Íconos de Espada de Madera y Pico de Hierro~~ integrados (10/8): arte propio de PixelLab.
- **No queda arte bloqueando nada.**

### En espera del diseñador
- Usos de tablones y barras, cerca premium, tabla de stats definitiva del bestiario.
- **Aprobación de los 12 edificios nuevos.** Si los aprueba: el **portal** hay que volver a
  animarlo (el generado es fijo y el del juego gira con 8 cuadros).

### Visual que quedó abierto
- El **Mercado** quedó chico comparado con el resto. (La Curtiduría, que tenía el mismo
  problema, se resolvió sola: el arte nuevo es angosto y ya no se achica al escalar.)
- **Árboles, piedras y parcelas** siguen siendo el set viejo: solo se les calmó el color, pero no
  comparten el estilo de los edificios nuevos.
- **Piedra vs hierro** siguen pareciéndose: son la misma roca, una pelada y la otra con motas.
  El tinte ayuda pero eso pide siluetas distintas, o sea arte nuevo.

### Opcionales ofrecidos
- Llevar el suelo nuevo y la costa a la plaza y a la Zona Negra.
- Kick por AFK en la plaza.
- Pulido tipo Sunflower Land: cursor de mano, resaltado al pasar el cursor.
- Simulación completa de balance económico de punta a punta.

### Pilares futuros
- Login por email multi-dispositivo, PvP/endgame de netherita, referidos, token $Golden, audio,
  granja distinta por nivel (quinta.docx).

---

## Día 22 — Lunes 17/08 · Se cae el panel de balanceo y se arregla el arranque

### Fuera todo el HTML que no es el juego
Decisión de dirección: **el único HTML que queda es `public/index.html`**, el que abre el juego.
Se borraron `public/balance.html`, `public/vista-ventanas.html` y `public/game/balance.js`.

El motivo no es orden, es que ese panel hacía daño: guardaba valores en una tabla de la nube que
**pisaban al código al arrancar**, y eso nos costó tres problemas seguidos que parecían bugs del
juego y no lo eran (timers fantasma, la respuesta al clic que "volvía sola" y, ahora, un arranque
trabado). A partir de acá **manda el código**: los números viven en `state.js` y `config.js`, y lo
que se ve es lo que está escrito.

También se sacó `await window.BAL_READY` de `main.js` y los comentarios que todavía mandaban a
editar cosas en `balance.html`.

### Por qué la barra de carga se plantaba a la mitad
Dos causas encadenadas, las dos reales:

1. **`index.html` seguía pidiendo `game/balance.js`**, que ya no existía. El cargador reintenta
   cada script 8 veces con espera creciente antes de rendirse: eran ~10 segundos de nada en cada
   entrada.
2. **18 sprites no estaban en el atlas** y se bajaban sueltos: los tablones, el buzón, el baúl de
   premios, el montículo, la isla y — el hallazgo grueso — las etapas de crecimiento
   `cropm_`/`cropg_` de ciruela, cereza y remolacha. El armador del atlas filtraba por el prefijo
   `crop_`, que **no** atrapa a `cropm_` ni a `cropg_`: cada cultivo nuevo entraba con su ícono
   pero sus dos etapas quedaban afuera. Esos 18 pedidos caían en la fase de reintentos de `boot.js`,
   y ahí la barra se dibuja justo a la mitad. No era el bosque ni el peso: era esperar.

**Arreglado:** `cropm_`/`cropg_` agregados a los prefijos del armador, los one-off agregados a mano,
atlas reconstruido (604 sprites, 790 KB) y `?v=46` para romper caché. Verificado por script:
**assetList pide 414 sprites y los 414 están en el atlas — cero pedidos sueltos.**

### Vigía de arranque (para no depender más de la consola)
Si algo falla mientras está la pantalla de carga, ahora **el error se escribe en la propia pantalla**,
en un recuadro legible. Y si a los 20 segundos seguimos ahí sin ningún error, el vigía cuenta en qué
paso quedó y a qué altura está la barra. Alcanza con una foto de la pantalla: se terminó el F12.

### El error real del arranque: un bloque de código pegado en el lugar equivocado
Con el vigía puesto, el juego lo dijo solo en pantalla: `W is not defined` → `FarmScene is not defined`.

Un edit anterior había pegado las 18 líneas de **la forma del claro del bosque al principio de
`farm.js`**, fuera de toda función. Ahí `W` (el ancho del mundo) no existe, así que el archivo
reventaba en la línea 7 y **nunca llegaba a declarar `FarmScene`**. De paso, dentro de
`dibujarBosque()` había quedado la versión vieja, que llamaba a `met()` sin tenerlo definido: o
sea que el bloque no solo estaba de más arriba, estaba **faltando abajo**. Movido a su lugar.

Queda un aprendizaje de método: `node --check` no lo agarraba porque **la sintaxis era válida** —
el error era de ejecución. Ahora la verificación corre cada archivo entero y comprueba que declare
su escena (`FarmScene`, `BootScene`, `ForestScene`, `PlazaScene`). Eso sí lo habría cazado.

### La forma del bosque queda rectangular
Dirección: *"la forma cuadrada creo que queda mejor que el resto, esta forma está bien"*.
`BOSQUE_REDONDEZ` y `BOSQUE_ONDA` a **0**. El claro rectangular acompaña a la grilla de celdas, que
también es rectangular, y por eso lee mejor que el óvalo. La irregularidad del borde la sigue dando
`BOSQUE_JITTER` (el desorden de cada árbol), que alcanza para que no parezca dibujado con regla.
Los parámetros quedan en el código por si algún día se quiere volver a probar: es cambiar un número.

### La granja se comprime: el mundo pasa de 23x15 a 17x12
Dirección, viendo la granja alejada: *"todo el corral, todos los edificios y todos los nodos deben
estar más comprimidos"*. Los números le daban la razón sin discusión: **345 celdas para 73 de
contenido (21%)**, con las filas 0, 1, 2, 6 y 14 **enteras vacías** y los 18 nodos exiliados en las
columnas 16 a 22, lejísimos del granero.

Mundo nuevo: **17x12 = 204 celdas, 36% ocupado, sin una sola fila muerta.** Todo el contenido vive
entre las columnas 1-15 y las filas 2-10:

- **Izquierda:** las 12 parcelas arriba (1-4 / 2-4), el Establo en el medio, la laguna abajo.
- **Centro:** el granero arriba con el tablón a su izquierda y el buzón + baúl a su derecha (como
  pidió dirección), y debajo la columna de oficios en bandas de dos filas — cocina y horno,
  mercado y altar, herrería y curtiduría.
- **Derecha:** los 6 árboles en tres pares, y debajo las 6 piedras y los 6 minerales.

Las posiciones se reescribieron **sin tocar el orden de `WORLD_OBJECTS`**: los layouts guardados de
los jugadores referencian los objetos por índice, así que reordenar la lista les movería la granja.

### El bosque ya no se sube a la cerca
Dirección: *"el corral pasa por encima de los árboles"*. Cierto, y la primera corrección fue
**equivocada**: subí `BOSQUE_COLCHON`, que no es la palanca — ese número solo agranda el radio de
referencia. El hueco real lo da `BOSQUE_AIRE`, porque el borde del claro cae en
`mitad del mundo + AIRE x radio`.

Medido: con `AIRE = 0,05` el árbol de la derecha se metía **32 px dentro** del mundo y el tronco de
la fila de arriba colgaba **15 px por debajo** del borde, justo encima de la cerca. Ahora `0,23`,
que es la cuenta para dejar una celda entera de césped teniendo en cuenta el ancho del sprite
(105 px) y que el punto de medición está al 72% de su alto — de ahí venía el error.

### tools/preview-granja.py — aprobar el layout sin deployar
Cada vez que se movía un edificio había que deployar y entrar a mirar. Ahora este script lee las
**mismas** posiciones que usa el juego (ejecuta `config.js` de verdad con node, no las reescribe) y
arma un PNG con los sprites reales, el césped, la cerca y el anillo de bosque. Fue lo que dejó al
descubierto lo del `AIRE`: en la primera pasada se veía el bosque pisando la cerca igual.

### El borde blanco era la orilla del mar
Dirección, sobre una captura: *"ese borde blanco quedó la orilla de mar"*. Exacto. `drawOlas()`
pintaba dos rectángulos redondeados blanquecinos —la espuma de la costa— y su objeto gráfico se
creaba dentro de un `if (GF.ISLA)` que seguía en `true`. O sea: cambiamos el mar por bosque, pero
**la espuma de la orilla sobrevivió al cambio** y quedó flotando sobre el césped como un contorno
fantasma en las esquinas.

Al abrir ese bloque apareció algo peor: **el bosque se dibujaba dentro de
`if (this.textures.exists("isla"))`**. El anillo entero colgaba de que cargara la textura del mar,
que ya no se usa para nada. Si ese PNG faltaba, no había bosque.

Los dos caminos quedaron separados: `if (GF.BOSQUE) → bosque` / `else if (GF.ISLA) → mar, costa y
olas`. `GF.ISLA` se deja en `true` a propósito: es el respaldo del interruptor `?sinbosque=1`, que
sin esto abriría el juego sobre un vacío liso. De paso, las nubes ahora cruzan el margen del bosque
(420) y no el de la isla (260), que las cortaba a media pantalla.

### El buzón tapaba el baúl
Al comprimir el mundo, el buzón quedó en la fila 3 y el baúl en la 2. En un juego con profundidad
por fila eso no es "un poco más abajo": es **delante**, así que el buzón se dibujaba encima del
baúl y lo tapaba. Los tres vuelven a la misma fila que el granero, en el orden de siempre:
granero (columnas 6-8), buzón (9), baúl (10).

Lección para el resto del layout: cuando se mueve algo, la fila no es solo posición vertical,
también es orden de dibujado. Dos objetos que se quieren "al lado" tienen que compartir fila.

### El bosque se ordenaba mal: por el techo del árbol en vez de por su base
Dirección: *"hay árboles que deben estar por detrás de los que están más cerca del corral, por
proximidad"*. Tenía razón, y el error era de una línea.

`dibujarBosque()` ordenaba con `lista.sort((a,b) => a[0] - b[0])`, donde `a[0]` es **py: el borde
de ARRIBA del sprite**. Pero cada árbol se dibuja con su propia escala (0,92 a 1,26), así que dos
árboles que arrancan a la misma altura **apoyan hasta 37 px distinto**. Como la fila del bosque
mide 18 px, el error valía hasta **2,1 filas**: un árbol grande del fondo se dibujaba antes que uno
chico de adelante y su tronco asomaba por delante del que estaba más cerca del corral.

Ahora ordena por `py + alto x escala`, o sea por **dónde apoya**, que es el mismo criterio con el
que el resto del juego ordena todo (`baseRow`, no el techo del sprite). De los 3.349 árboles del
anillo, prácticamente todos cambian de posición en la lista.

La vista previa (`tools/preview-granja.py`) replica el algoritmo del bosque, así que se corrigió
igual: si no, mostraría un bosque que el juego ya no dibuja.

### El bosque, medido en vez de discutido
Dirección: *"no hace falta poner tres árboles detrás de uno; con dos a los costados del que está
más adelantado ya cubrís"* y *"ten en cuenta que un árbol ocupe solo una celda"*.

Se hicieron dos herramientas para dejar de opinar a ojo: `tools/medir-bosque.py` (cuenta árboles y
% de fondo visible) y `tools/comparar-bosque.py` (renderiza el borde con distintas configuraciones).
Lo que salió:

- **Agujeros de fondo NO había.** Ni con un 80% menos de árboles. El anillo estaba masivamente
  sobredibujado: 3.349 árboles, la enorme mayoría tapados por completo.
- **Lo que molestaba era otra cosa:** por las rendijas entre troncos asomaba **la fila de atrás**.
  Medido en el sprite, el tronco tiene 23-27 px y las columnas van cada 25 px: deberían tocarse.
  El culpable era el **jitter horizontal de ±8 px**, que podía separar dos troncos hasta 41 px.
- **Incoherencia de escala encontrada de paso:** los árboles del BOSQUE medían 2,3 a 3,2 celdas de
  ancho, o sea **más grandes que los que se talan en la granja**, que miden 2. El fondo era más
  grande que el primer plano.
- **"Un árbol = una celda" se probó y no funciona.** La copa del sprite es ancha; a 42 px deja de
  leerse como árbol y hacen falta 300 para cerrar la masa, y aun así queda 1,8% de fondo a la
  vista. Separándolos salta a 19% y 37%. A **2 celdas** —el mismo tamaño que los de la granja—
  alcanzan 126 con 0,02%.

Cambios: `BOSQUE_TAM` (ancho en CELDAS, así no se puede volver a desincronizar del resto del
juego), `BOSQUE_TRABA` (filas alternas corridas media columna: el de atrás cae en el hueco de los
dos de adelante, que es la idea de dirección aplicada), y `BOSQUE_JITTER_X` / `_Y` separados.
`BOSQUE_PASO` a 0,65, elegido probando 0,90 / 0,75 / 0,65 / 0,55 sobre el borde real: a 0,90 queda
dentado y asoma el fondo, a 0,55 vuelve a ser una pared.

### El pasto ahora llega hasta el bosque
La franja entre la cerca y el primer árbol —que existe a propósito— estaba pintada con el verde
liso del fondo de la cámara, porque el mosaico de pasto cubría solo el mundo jugable. Se veía como
un anillo plano alrededor de la granja. Ahora el renderTexture del pasto se extiende hasta el
margen del bosque, en lote. Los tiles de más quedan tapados por los árboles y no cuestan nada.

### tools/editor-bosque.html — el banco de pruebas del bosque
Dirección: *"¿puedes generarme un HTML donde yo poner los árboles y mostrarte cómo debería quedar?"*.

Hecho, y con una condición que viene de la lección del panel de balanceo: **vive en `tools/`, no en
`public/`**. No se deploya, no habla con la nube y no puede escribir un solo valor del juego. Solo
lee y devuelve texto. La regla que quedó es clara: las herramientas que ESCRIBEN en el juego
terminan rompiéndolo; esta exporta números que se pasan a mano.

Es un archivo suelto que se abre con doble clic, sin servidor: el arte (árbol, césped y cerca) va
incrustado en base64, así que funciona desde cualquier carpeta. Y como va incrustado y no como
ruta externa, el lienzo no queda bloqueado y **puede medirse en vivo el % de fondo a la vista**
mientras se colocan los árboles.

Segunda versión, por dirección: *"dibuja la cuadrícula y centra el árbol en cada celda pegado al
borde de abajo"*. Se abandonó la colocación a mano libre: ahora hay **un árbol por CELDA**,
centrado horizontalmente y apoyado en la línea de abajo de su celda, con la cuadrícula dibujada
POR ENCIMA de los árboles para no perderla de vista. Es como razona el resto del juego —todo se
ancla a la grilla por su base—, así que lo que se compone ahí es trasladable tal cual, sin
traducir coordenadas sueltas a nada.

Qué hace: clic planta en la celda, arrastrar planta varias de una (pincel), clic derecho borra
—también arrastrando—, Ctrl+Z deshace, la rueda cambia el tamaño. Dibuja ordenando por FILA, igual
que el juego. Botones de *Llenar todo* y *Damero* para partir de algo en vez de un lienzo vacío.
El de copiar devuelve la lista de celdas, la ocupación y cuántos árboles hay por fila.

### Las tres leyes de colocación del bosque
Dirección, 17/8: además de la celda, *"que los árboles se puedan poner en la encrucijada entre
cuatro celdas"*. Y una aclaración importante que queda escrita en la propia herramienta:
**estas reglas son SOLO para dibujar el bosque. Dentro de la granja no rigen** — ahí cada objeto
se sigue anclando como siempre (leftCol + baseRow, un objeto por celda, sin encrucijadas).

    LEY 1 · CELDA        centrado en la celda, apoyado en su borde de abajo
                         x = (gx + 0,5) x 42        base = (gy + 1) x 42

    LEY 2 · ENCRUCIJADA  en el cruce de cuatro celdas, o sea en un vértice de la cuadrícula
                         x = gx x 42                base = gy x 42

    LEY 3 · MEDIA ARISTA a la mitad exacta de una arista VERTICAL de la celda: sobre la línea,
                         pero a media altura
                         x = gx x 42                base = (gy + 0,5) x 42

El patrón es limpio: ley 1 = *x a media celda + y entera* · ley 2 = *x entera + y entera* ·
ley 3 = *x entera + y a media celda*. Falta la cuarta combinación —*x a media + y a media*, que
sería el centro de la celda—: no está pedida, pero el sitio existe y se puede sumar cuando se
quiera. Con las tres, los anclajes caen en una rejilla de **media celda (21 px)**, que es la
resolución más fina posible sin salirse de la cuadrícula del juego.

Lo interesante es que las rejillas quedan **a media celda unas de otras**. Usadas
juntas dan exactamente el trabado que veníamos persiguiendo a mano con `BOSQUE_TRABA` y el jitter
—cada árbol de una rejilla cae en el hueco de la otra— pero expresado como una regla que se puede
dibujar y razonar, en vez de un número suelto que hay que adivinar. Si esta composición gusta, el
algoritmo del juego se puede reescribir directamente sobre las dos leyes y desaparecen `TRABA`,
`PASO` y `FILAS` como números mágicos.

El editor tiene las tres leyes como interruptores independientes (se pueden activar y desactivar
por separado, siempre con una encendida como mínimo), dibuja las anclas —punto verde para la
celda, aspa azul para la encrucijada, barrita rosa para la media arista— y el clic salta a la más
cercana entre las activas.

### La composición a mano resultó ser una regla — y el bosque se reescribe sobre ella
Dirección compuso el borde a mano en `tools/editor-bosque.html` y exportó 675 árboles. Al contar,
el patrón salió solo:

| ley           | puestos | posibles | ocupación |
|---------------|---------|----------|-----------|
| celda         | 260     | 260      | **100%**  |
| encrucijada   | 187     | 270      | 69%       |
| media arista  | 228     | 270      | 84%       |

O sea: puso **las tres leyes en todos sus anclajes** y después **abrió claros a mano** en dos de
ellas. Eso —y no la separación— es lo que impide que el bosque se lea como una retícula.

`dibujarBosque()` deja de generar con separaciones y pasa a recorrer los anclajes de las tres
leyes, con una densidad por ley (`GF.BOSQUE_DENSIDAD`) que reproduce ese raleo. Desaparecen como
sistema `BOSQUE_PASO`, `BOSQUE_FILAS` y `BOSQUE_TRABA`: cinco números que nadie sabía justificar,
sustituidos por tres reglas geométricas y dos porcentajes medidos.

**Nota de método, para no repetirlo.** Antes de tener el export intenté deducir la composición
midiendo píxeles de las capturas. Fue tiempo perdido y, peor, dio tres respuestas distintas para la
misma imagen según dónde recortara: 68%, 41% y 4% de cobertura de tronco. La conclusión no era
"medir mal", era que **la medición no servía para esa pregunta**. El export de un clic dio la
respuesta exacta en un segundo. Cuando existe el dato, no se estima.

### Por qué el bosque del juego no se veía como la composición a mano
Dirección: *"¿por qué no se ve como el que hice?"*. La respuesta estaba en su propio export, en
dos líneas fáciles de pasar por alto:

    "tamMin": 2,
    "tamMax": 2

**Todos sus árboles miden exactamente lo mismo.** El juego los variaba ±15% (`BOSQUE_ESC_VAR`).
Con variación, dos árboles del mismo anclaje apoyan a alturas distintas: la franja de troncos se
ensancha y se emborrona, y se pierde la línea limpia. Con todos iguales, los troncos de cada fila
quedan alineados al pixel.

`BOSQUE_ESC_VAR` pasa a **0**. La variedad que hace falta ya la da el volteo horizontal aleatorio y
—sobre todo— los claros del raleo. La variación de tamaño no aportaba riqueza, aportaba ruido.

Vale la pena anotar el patrón: las tres últimas diferencias entre lo compuesto y lo generado
—orden por la base, tamaño de 2 celdas, tamaño uniforme— **estaban todas en los datos**, y ninguna
se resolvió mirando la imagen. Se resolvieron leyendo el export.

### El raleo va hacia adentro, no en el frente
Dirección: *"sigue sin verse igual"*. Al volver al export y leerlo **banda por banda** —en vez de
como un total— apareció lo que faltaba:

- En las dos bandas pegadas al claro puso **todos** los árboles: 26 de 26 y 27 de 27.
  Los claros los abrió **atrás**. Mi raleo era parejo y agujereaba justo la primera línea,
  que es la única que se ve entera.
- Y su primera banda tiene **solo árboles de la ley de CELDA**, uno cada 42 px. La ley de
  encrucijada comparte base con la de celda, así que juntas dejan un árbol cada 21 px y la línea
  cierra del todo, como un muro corrido.

Dos reglas nuevas, las dos leídas del export: `BOSQUE_FRENTE_SOLIDO` (celdas de bosque sin ralear
junto al claro) y, dentro de esa franja, la ley de encrucijada se calla.

**Aviso sobre la métrica de "proporción de madera".** Se usó para comparar y ha fallado tres veces,
dando 68%, 41%, 4% y 100% sobre imágenes equivalentes, según qué fila tomara: dentro del bosque
cualquier fila da 100%, y la fila del frente depende de dónde se recorte. **No es de fiar y no
debe usarse para decidir.** Lo que vale es mirar el render.


### La regla, dicha en una frase por dirección
Después de varias rondas deduciendo el patrón del export, dirección lo dijo directamente:

> *"una fila de árboles cubriendo el centro inferior de cada celda, la siguiente fila ocupando la
> mitad de las líneas en vertical, y repetir con los dos siguientes, y así"*

Se **alternan dos leyes**, y la de encrucijada no entra:

    banda 1   CELDA          x = (col + 0,5) x 42     base = (fila + 1) x 42
    banda 2   MEDIA ARISTA   x =  col x 42            base = (fila + 0,5) x 42
    banda 3   CELDA          ...y así

Las bandas caen cada 21 px alternando, y cada una queda corrida media celda respecto de la
anterior: **ese es el entrelazado**, y sale solo de la geometría. La encrucijada sobraba porque
comparte base con la celda: juntas dejaban un árbol cada 21 px y la línea cerraba como un muro.

`GF.BOSQUE_LEYES = "cv"` y filas enteras. Con esto el bosque queda descrito por **una frase**.

### Lo que costó llegar, y por qué
Se dieron varias vueltas intentando deducir la regla midiendo píxeles y contando totales del
export. Dos aprendizajes que conviene no repetir:

1. **La métrica de "proporción de madera" no servía.** Dio 68%, 41%, 4% y 100% sobre imágenes
   equivalentes según qué fila tomara. Cuando una medición da resultados incompatibles para la
   misma pregunta, el problema no es afinarla: es que no mide lo que se cree.
2. **Los totales del export escondían la estructura.** Contar 260/187/228 llevó a "las tres leyes
   con raleo", que era una descripción estadísticamente parecida pero estructuralmente falsa. La
   estructura solo apareció al leerlo **banda por banda**, y quedó clara del todo cuando dirección
   la enunció. Ante un patrón, preguntar la intención ahorra más que medirla.

### Los cuatro lados del bosque, visibles de una vez
Dirección: *"hice el máximo de zoom out y no puedo arrastrar la cámara hacia arriba; creo que los
4 lados del bosque deben ser visibles porque lo que interesa es que la granja se pueda expandir"*.

Medido, y el problema era de criterio, no un fallo suelto: el zoom mínimo estaba calculado para
que **nunca se viera el borde del dibujo**, y el efecto secundario era que el anillo no entraba.
Con una pantalla de 1341x630 la vista al alejar medía 1522x715 sobre un anillo de 1522x1312:
**597 px de bosque fuera de cuadro**, arriba y abajo, alcanzables solo arrastrando.

Tres cambios:

- **El anillo pasa a tener margen por eje**, y es más ancho que alto: `BOSQUE_MARGEN_X = 1150` y
  `_Y = 460`. Total 3014x1424, relación 2,14:1 — la de una pantalla. Antes era casi cuadrado, que
  es justo la forma que no entra en un monitor.
- **El zoom mínimo pasa de "llenar" a "encajar"** (`max` → `min`): al alejar del todo entra el
  anillo entero, con la granja centrada y bosque a los cuatro lados.
- **El fondo de la cámara pasa a ser el verde medio de las copas** (0x2f5a28, muestreado del
  sprite): si en una pantalla muy panorámica sobra un poco, se lee como bosque lejano.

### El fondo del bosque se rompe; el frente no se toca
Al ver el anillo entero por primera vez apareció algo que de cerca no se notaba: con todos los
árboles idénticos y en retícula perfecta, **el interior se leía como papel pintado**.

La regla de dirección está pensada para el borde, que es lo que se ve de cerca. Así que el
desorden y el raleo se aplican **solo pasado `BOSQUE_FRENTE_SOLIDO`**: la primera línea queda
exactamente como la compuso, y el fondo se rompe con un 14% de claros y 6 px de desorden. Para
que el azar no baile entre una zona y otra, los números aleatorios se sacan **siempre**, se usen
o no.

### El mapa pasa a ser cuadrado: 1600 x 1600, granja al centro
Dirección: *"el mapa debe ser igual para alto y ancho, y la granja en el centro, 1600x1600"*.

Los márgenes se calculan solos desde `GF.MAPA`, porque la granja (714x504) **no** es cuadrada y
por tanto los márgenes tampoco pueden serlo: 443 px a los lados y 548 arriba y abajo. Lo que
queda igual es el total. Si algún día cambia el tamaño del mundo, la cuenta se rehace sola.

**Consecuencia medida, y cómo se resolvió.** Un mapa cuadrado en una pantalla panorámica no encaja:
para ver los 1600 de alto hay que alejar hasta que entren ~3.300 de ancho, así que sobran **1.770 px
a los lados** — más ancho que el propio mapa. Antes ahí se veía color liso.

Ahora se rellena con un **mosaico del propio bosque**, generado con las mismas leyes: una textura
de 336x336 (8x8 celdas) dibujada con envoltura —cada árbol se pinta también desplazado ±336, así
que el que cruza un borde reaparece por el otro— y estirada en un tileSprite por debajo de todo.
El resultado es que **el mapa cuadrado deja de tener un "afuera" visible**: se ve bosque que sigue.
Coste: una textura de 336x336 generada una sola vez.

La vista previa aprende a dibujarlo también: `EXTRA=700 python3 tools/preview-granja.py` renderiza
el mapa con 700 px de bosque alrededor, para comprobar que no asoma ningún borde.

### El mosaico del fondo salía en bandas — dos fallos, los dos míos
Dirección, sobre el juego ya deployado: *"no se ve como lo que me mostrás"*. Cierto: la mitad
derecha de la pantalla salía en **bandas horizontales de troncos repetidas**, con una costura
vertical dura contra el anillo. Dos causas:

1. **Orden de profundidad en la envoltura.** Para que el mosaico no tenga costura, cada árbol se
   dibuja también desplazado ±336. Yo ordenaba por la base del ORIGINAL y desplazaba al dibujar,
   así que la copia que envolvía desde abajo se pintaba tarde arriba y su tronco tapaba a los que
   iban delante. De ahí las bandas. Ahora las copias entran en la lista **como árboles propios,
   con su base ya desplazada**, y se ordena después.
   (Es exactamente el mismo error de ordenar por el sitio equivocado que ya había aparecido con
   `py` vs base y con el buzón. Tercera vez.)
2. **El mosaico no estaba alineado con la retícula del mundo**, así que arrancaba donde cayera el
   borde del tileSprite. Se corrige con `tilePositionX/Y` = la esquina del sprite en coordenadas
   de mundo, módulo 336. Como el mosaico mide 8 celdas justas, cualquier múltiplo de 42 encaja.

Comprobado antes de deployar reproduciendo el mosaico del juego en Python y **tileándolo 3x3**
para buscarle la costura: no la tiene.

### Los dos fallos que impedían mover la cámara
Dirección, con el navegador al 25%: *"es como si todo no tenga posición relativa, ahí yo no puedo
arrastrar la cámara hacia arriba"*. Dos fallos independientes, los dos míos, y los dos por asumir
en vez de comprobar cómo funciona Phaser.

**1. Mis límites de arrastre estaban mal.** Yo recortaba a mano el scroll suponiendo que
`scrollX/scrollY` es el borde visible de la cámara. **No lo es cuando el zoom no vale 1**: en
Phaser el área visible se CENTRA y mide `alto / zoom`. Mi fórmula y la suya divergen con el zoom,
y con el navegador al 25% los dos rangos **ni se solapaban**: mi código ponía un valor, el recorte
de Phaser lo corregía a otro, y la cámara quedaba clavada. Fuera los recortes manuales (había
cuatro, uno por cada sitio que panea): la cámara ya tiene `setBounds`, que recorta bien.

**2. El tope de alejado del jugador era un número fijo.** La rueda recortaba a `[0,6 … 2,2]`. Con
el navegador al 25% el zoom base sube a ~5,2, así que el 0,6 dejaba el mínimo alcanzable en ~3,1
y el tope duro de 2,2 lo pisaba: el jugador **nunca** podía llegar al 1,61 que hace entrar el
mapa. Ahora el rango sale de la cuenta (`zoomUserMin = zMin / zBase`), así que vale igual con el
navegador al 25%, al 100% o al 300%. Verificado en los cuatro casos: el mapa entra en todos.

Lección, y van varias del mismo tipo: **cuando mi cuenta y la de la librería dan cosas distintas,
la que sobra es la mía.** Phaser ya sabía recortar el scroll; yo dupliqué esa lógica mal.

### El corte de la laguna y el del césped
Dirección: *"el corte en la laguna y decoración del césped"*. Dos cosas distintas, las dos reales.

**La laguna estaba deformada.** Se estiraba a la caja de celdas sin mirar su proporción:
`pond.png` mide 107x93 (relación 1,15) y la caja 178x136 (1,31), o sea **un 14% de deformación
horizontal**. La forma redonda salía aplastada, y eso es lo que se leía como un corte. Ahora se
encaja DENTRO de la caja conservando su relación: 156x136, con 22 px de césped a los lados.

**Los adornos del césped se sembraban solo dentro del mundo.** `dx = 8 + azar * (W - 16)`, o sea
entre 0 y W. Pero el césped ahora llega hasta el bosque, así que la franja entre la cerca y los
árboles quedaba **pelada**, con un rectángulo perfecto marcando dónde se acaban las matitas y las
flores. Ahora se siembran con 3 celdas de desborde y la cantidad sube en proporción al área
(110 → 223) para que la densidad no baje. Van a profundidad -999,5, debajo del anillo, así que
los que caen bajo el bosque no se ven ni estorban.

**La vista previa no dibujaba los adornos**, así que no podía delatar este fallo — el "corte" era
invisible para la herramienta que existe justamente para verlo antes de deployar. Ahora los dibuja,
con el mismo azar y las mismas cuentas que el juego.

### Nota sobre el diagnóstico de este día
Ante *"¿qué ves mal?"* respondí analizando la INTERFAZ de una captura que resultó ser **un recorte**:
di por rotos unos cortes de HUD que eran del recorte, no del juego. Dirección se refería al mundo.
Antes de diagnosticar sobre una imagen hay que preguntar si es la ventana entera. (Lo que sí quedó
verificado de aquello, y sigue en pie como deuda: en todo `index.html` hay **una sola** `@media`,
y es para un modal — el HUD no tiene ninguna regla de adaptación al ancho.)

### La diferencia de color era el fondo de la cámara, y lo había puesto yo
Dirección: *"hay diferencia en el color"*. Medido:

    césped (media de grass_a)   rgb(50, 128, 50)
    fondo de la cámara          rgb(47,  90, 40)   ← 38 niveles más oscuro

Yo había elegido ese fondo muestreando **la copa de los árboles** y oscureciéndola un 18%,
pensando en "bosque lejano". Pero el fondo no se ve donde hay bosque: se ve por los **huecos**. Y
un hueco con 38 niveles de diferencia contra el césped canta como una mancha apagada.

Peor: el mosaico del bosque lo dibujaba sobre **lienzo transparente**, y tiene un 14% de claros
por el raleo. Cada claro dejaba ver ese verde oscuro, así que todo el bosque de más allá del mapa
salía moteado. Dentro del anillo esos mismos claros dejan ver el césped de verdad — o sea que el
mosaico no imitaba lo que imita.

Dos correcciones: el fondo de la cámara pasa a ser **el color medio del césped** (0x328032), y el
mosaico se dibuja **sobre baldosas de césped** en vez de sobre transparente. Así un hueco se lee
como suelo en los dos sitios.

Regla que sale de acá: **un color de relleno no se elige por lo que representa, sino por lo que
va a aparecer al lado.** El fondo estaba junto al césped, no junto a las copas.

### La laguna cortada estaba en el ARTE, no en el código
Dirección insistió tres veces con *"laguna cortada"*, y tenía razón las tres. Yo busqué la causa en
el código —proporción, atlas, profundidades, recortes— y no estaba ahí.

`pond.png` venía con la forma **tocando el borde izquierdo del lienzo**: 12 filas de orilla
seccionadas en plano, como si el PNG se hubiera recortado un poco corto. Ningún cambio de código
podía arreglarlo porque el corte estaba dentro del sprite. Se ve de un vistazo ampliándolo x5 sobre
césped, que es lo que había que hacer desde el principio en vez de teorizar.

`tools/arreglar-laguna.py` lo cierra sin inventar dibujo: ensancha el lienzo y **prolonga la curva
real del contorno**. Toma las filas sanas de arriba y abajo del corte, ajusta por mínimos cuadrados
la parábola que describe la orilla (`x = 0,0247·(y−40,5)² − 0,26`) y la continúa por dentro del
corte. Guarda `pond_original.png` como copia.

La primera versión metía una media elipse y salía **un nudo**: la elipse moría de golpe contra un
contorno que ya venía retrocediendo. Prolongar la curva que ya existe, en vez de superponerle una
forma inventada, es lo que hace que empalme sin escalón.

Atlas reconstruido (el sprite pasó de 107 a 108 px) y `?v=47`.

**Lección del día, la más cara.** Ante un fallo visual, mi reflejo fue buscarlo en el código: probé
proporción del sprite, integridad del atlas, orden de profundidades y recortes de cámara. El fallo
estaba en el PNG y se veía **abriendo el PNG**. Cuando algo "se ve cortado", lo primero es mirar el
arte a tamaño grande; el código es la segunda hipótesis, no la primera.

### La laguna cortada: cuatro hipótesis descartadas y un diagnóstico en pantalla
Dirección: *"de verdad ves la laguna entera?"*. No. Y peor: **había dicho que sí sin mirarla**,
que es exactamente el error por el que venía pidiendo disculpas todo el día. Ampliada x4, sigue
cortada.

Lo medido sobre su captura, que es lo único firme:

- El agua empieza en **x=313 exacto en el 94% de las filas**: una recta perfecta.
- El agua ocupa **126 px de ancho por 147 de alto**. El sprite es 108x93, o sea **siempre más
  ancho que alto**. Que salga más alto que ancho solo puede significar que le falta un trozo por
  el costado, y la cuenta da **exactamente una celda (42 px de mundo)**.

Hipótesis descartadas **con datos**, no por intuición:

1. *La proporción del sprite* — corregida, y no era.
2. *El arte* — el sprite tenía un corte real de 16% de su alto, se cerró prolongando la curva del
   contorno... y el corte del juego sigue siendo del 94%. No era (o no era solo eso).
3. *El atlas* — frames correctos, cero solapes, y el atlas **del servidor** ya sirve `pond` con
   108 px: el deploy llegó.
4. *El código* — `pondImg` solo se crea y se reposiciona; no hay `setCrop` ni máscara sobre ella.

Como llevo cuatro teorías erradas mirando imágenes, se acabó teorizar: se añade un diagnóstico
que se abre con **`?laguna=1`** en la URL y dibuja el recuadro donde el juego cree que está la
laguna (rojo), sus celdas (azul) y la grilla (amarillo), más su tamaño de textura y de dibujo.
Con eso se distingue de una vez entre "se dibuja entera y algo la tapa" y "se dibuja ya recortada".
No se enciende solo, y no necesita consola.

### La isla no debía estar en el atlas (y puede ser la causa de la laguna)
Buscando "cero pedidos sueltos" metí `isla` dentro del atlas. `boot.js` ya lo desaconsejaba en un
comentario que no leí: *"COSTA de la isla: imagen grande y aparte, NO va al atlas (mide 1190x854)"*.

Consecuencias: ella sola empujaba el lienzo del atlas a **4096x1934 = 7,9 millones de píxeles**
(unos 31 MB de textura RGBA en memoria) y reordenaba todo el empaquetado. Fuera del atlas queda en
**4096x1142** y 764 KB. Encima, con el bosque puesto la isla ni se dibuja: solo la usa el modo mar.

Por qué puede ser la causa del corte de la laguna: si el navegador reescala una textura tan grande,
el `drawImage(src, fr.x, fr.y, ...)` que desempaqueta cada frame lee de **coordenadas equivocadas**,
y cada sprite sale con un trozo de otro sitio. Encaja con lo observado: el recuadro del sprite tiene
el tamaño correcto (158x136 confirmado por el diagnóstico) pero su contenido está desplazado y
recortado. No está demostrado, pero es la primera hipótesis que explica el síntoma exacto.

### El corte de la laguna era el BOSQUE — lo encontró dirección, no yo
Después de cinco hipótesis mías erradas (proporción del sprite, el arte, el atlas, las
profundidades, la caché), dirección propuso la sexta: *"no será por los cambios que hicimos en el
bosque"*. Se probó con el interruptor que ya existía, `?sinbosque=1`, y **la laguna sale entera**.

La causa es memoria de textura. Con el bosque puesto la escena creaba:

| textura                    | tamaño      | memoria |
|----------------------------|-------------|---------|
| renderTexture del césped   | 1638 x 1680 | 10,5 MB |
| renderTexture del bosque   | 1600 x 1600 |  9,8 MB |
| atlas desempaquetado       | ~600 lienzos| ~18 MB  |
| **total**                  |             | **39 MB** |

Cuando eso se agota, las subidas de textura fallan en silencio y los sprites salen a medias: la
laguna se dibujaba con el tamaño correcto (el diagnóstico confirmó 158x136) pero con su contenido
recortado. Encaja con todo lo observado, incluido que mejorara al reducir el atlas.

Dos recortes, sin perder nada visible:

- **El césped no necesita cubrir el mapa.** Solo se ve la franja entre la cerca y el primer árbol;
  de ahí para afuera lo tapa el bosque, y donde el bosque tiene claros el fondo ya es del color del
  césped. De 1638x1680 a **1050x840**: de 10,5 a 3,4 MB.
- **El anillo dibujado se recorta a 7 celdas** (`BOSQUE_RT_CELDAS`). Más allá, el mosaico repite
  el mismo patrón con las mismas leyes y se ve idéntico, pero no cuesta memoria porque se repite.
  De 1600x1600 a **1302x1092**: de 9,8 a 5,4 MB.

**11,5 MB menos**, de 39 a 27.

**Lección, y es la más importante del día.** Llevaba cinco hipótesis mirando el síntoma (la laguna)
y ninguna miró el CONTEXTO (qué cambió al mismo tiempo). Dirección lo resolvió con una pregunta de
correlación: *¿no será por lo que acabamos de tocar?*. Y la prueba costó diez segundos porque el
interruptor ya existía. **Ante un fallo nuevo, lo primero es apagar lo último que se añadió.**

### El día y la noche solo pasaban dentro del corral
Dirección: *"dentro del corral es de un día y fuera del corral es otro horario, y se ve claro"*.
Exacto, y el motivo estaba a la vista en una línea:

    this.cielo = this.add.rectangle(0, 0, GF.WORLD_W, GF.WORLD_H, ...)

El velo de día/noche medía **solo el mundo jugable**, 714x504. Cubría el interior de la cerca y
nada más: el bosque, la franja de césped y el mosaico se quedaban en mediodía perpetuo mientras la
granja anochecía. Nunca se había notado porque hasta ayer fuera de la cerca solo había mar.

Ahora el velo mide 9000x9000 y va centrado en el mismo punto que el mosaico: **la hora es una sola
en toda la pantalla**, la cámara vaya donde vaya.

### Flores también fuera de la cerca
El desborde de adornos sube de 3 a 4 celdas —lo mismo que ahora cubre el césped— y la cantidad se
calcula por ÁREA (270 en total). Así la franja de fuera queda **igual de poblada** que la de
dentro, y la cerca deja de marcar dónde se acaban las florcitas.

Patrón que se repite en los tres fallos de hoy —el pasto, los adornos y ahora el velo—: **todos
estaban dimensionados al mundo jugable**, porque hasta ayer no había nada más allá de la cerca.
Al meter el bosque, todo lo que medía `WORLD_W x WORLD_H` se quedó corto a la vez. Si aparece otro
fallo de este estilo, ahí es donde hay que mirar primero.

### Las flores de fuera existían, pero el bosque se las comía
Dirección: *"falta ver si se puede poner por encima del césped, fuera del corral, las mismas flores
que hay dentro"*. Estaban puestas —el reparto ya llegaba a 4 celdas más allá de la cerca— pero no
se veían, y el motivo es de CAPAS, no de posición:

- los adornos van a profundidad **-999,5**
- el bosque se dibuja a **-999**, o sea **por encima**

Los que caían bajo los árboles no existían para el jugador. Y como el reparto era uniforme sobre
todo el rectángulo, la mayoría de los de fuera caían justo ahí: solo el césped visible mide 2,3
celdas más allá de la cerca, el resto es bosque.

La solución no es subirlos de capa —quedarían flotando encima de los troncos— sino **sembrarlos
solo donde se ven**. Se añade `dentroDelClaro(x, y)`, que usa la misma métrica que
`dibujarBosque()` y vive en un solo sitio para que no se puedan desincronizar. Los adornos ahora:

1. descartan cualquier posición que quede bajo el bosque,
2. estiman el área ÚTIL muestreando, y calculan la cantidad sobre ESA área.

Resultado: 173 adornos, **1 cada 3.263 px² dentro y fuera** — la misma densidad, y ninguno tirado.

Tercer fallo seguido con la misma raíz: algo pensado para un mundo que se acababa en la cerca.
Van el pasto, el velo de día/noche y ahora los adornos.

### De día mariposas, de noche luciérnagas
Dirección: *"cuando hay claridad, las mariposas revoloteando; cuando sea de noche, reemplazadas por
luciérnagas con cierto halo de luz alrededor, el mismo comportamiento. Y que no desaparezcan
bruscamente, sino con un fade out"*.

Decisión de implementación: **no son dos bichos, es uno con dos trajes**. Cada mariposa lleva ahora
un segundo dibujo —la luciérnaga— en la misma posición, y lo único que cambia con la hora es cuál
de los dos se ve. Así se conserva TODO el comportamiento que ya estaba: el merodeo, el posarse en
las flores, y la función de guía que señala lo accionable. Si fueran entidades separadas habría que
duplicar esa lógica y se desincronizarían.

- **El halo** son cuatro círculos concéntricos de alfa decreciente (0,055 → 0,30) más un cuerpo casi
  blanco. Graphics no hace degradados, pero apilados de fuera hacia dentro dan el resplandor.
- **Late, no brilla parejo**: la intensidad oscila con un seno, y cada luciérnaga lleva su propia
  fase para que no parpadeen todas a la vez.
- **El relevo es un fundido de 6 segundos** (`nocheMezcla`, de 0 a 1), enganchado al **mismo umbral
  que enciende los faroles**: todo lo nocturno pasa junto y no hay dos momentos distintos.
- Si entrás con el juego ya de noche, se aplica seco — el fundido es para la transición, no para
  la carga.

`FX_LUCIERNAGAS = 1` en config; a 0 las mariposas vuelan también de noche.

---

## 17/8 — La granja es CUADRADA: 15×15, y el anillo de 16 expansiones

Dirección: *"el ancho de la granja, incluyendo el corral, debe ser el mismo de largo que de ancho,
y el rectángulo que forma el bosque también, y el conjunto entero también, que es 1600"*.

La granja era 17×12. No cumplía ninguna de las tres condiciones.

### Por qué 15×15 y no 12×12 ni 16×16

Los dos números que propuso dirección no entran, y por la misma razón: **el contenido mide 15
celdas de ancho**, así que el interior necesita 15 columnas y el mundo 17 como mínimo... salvo que
se re-maquete. Se re-maquetó, y entonces la restricción que manda es otra: **el lado tiene que
partirse en 3 partes iguales**, porque el anillo de expansiones lleva 3 bloques por lado.

| granja | interior | ¿lado ÷ 3? | final | árboles que quedan |
|---|---|---|---|---|
| 12×12 | 10×9 | 4 | 20×20 | 6,75 |
| **15×15** | **13×12** | **5** | **25×25** | **4,25** |
| 16×16 | 14×13 | **no** | 24×24 | 4,75 |
| 17×17 | 15×14 | **no** | 25×25 | 4,25 |
| 18×18 | 16×15 | 6 | 24×24 | 4,75 |

15 y 18 son los únicos que se parten en 3. **15 gana porque la granja casi se triplica** (225 → 625)
contra el +78% de 18×18, y porque 18×18 devolvía 6 filas vacías al nivel 1 — justo lo que se sacó
ayer al comprimir el mundo.

### El anillo: 16 bloques IDÉNTICOS de 5×5

Dirección: *"un lateral, sin contar las esquinas, sea tres expansiones... las cuatro esquinas son
cuatro... entre todo serían dieciséis"*, y después *"cada expansión medirá cinco por cinco"*.

Ese segundo dato corrige la propuesta anterior, que tenía la banda en 4 y dejaba los bloques
desparejos (laterales 5×4, esquinas 4×4) sin ninguna necesidad. Con la banda en 5 sale la figura
que se explica sola:

> **El mapa entero es una grilla de 5×5 BLOQUES de 5×5 CELDAS.**
> El corral es el 3×3 del centro; las 16 expansiones son el marco.

Los 16 bloques valen exactamente lo mismo (25 celdas), así que no hay que explicarle a nadie por
qué una esquina rinde menos que un lateral. **Por qué no entra una expansión 17**: el bosque
quedaría en 4,25 celdas de árboles puros descontando el anillo de césped, y por debajo de eso deja
de leer como bosque.

`GF.EXPANSIONES` (los 16 bloques), `GF.mundoCon(compradas)` y `GF.celdaComprada(col,row,compradas)`
quedan escritos en config. **Todavía no los lee el juego** — esta entrega es solo la granja cuadrada.

**El origen se corre.** Al comprar por la izquierda o por arriba el claro pasa a tener columnas y
filas NEGATIVAS. Las coordenadas guardadas de los objetos no se tocan: se mueve el BORDE, no el
contenido, así que ningún layout guardado se rompe.

### El re-maquetado interior

El interior pasó de 15×9 (tumbado) a 13×12 (casi cuadrado): sobran 3 filas y faltan 2 columnas.

- **Las parcelas giran**: de 4×3 a 3×4. Son las mismas 12, pero libera la columna que el rincón del
  correo necesitaba, porque los árboles ahora empiezan en la columna 10 en vez de la 11.
- **Todo el bloque natural baja**: árboles a las columnas 10-13 filas 2/4/6 (el mismo ritmo de
  antes), cantera a las columnas 10 y 12 filas 8/10/12, y las vetas a las columnas 11 y 13 filas
  9/11/13, en orden de tier hacia abajo.
- **La laguna baja** a las filas 10-12 y el sitio de pesca la acompaña.
- **El establo baja a la fila 9.** Con la grilla de parcelas de pie su tejado las pisaba: mide 2,5
  celdas de alto y las tapaba dos filas más arriba de su base. Lo delató `checkLayout`, no el ojo.

### Verificado antes de subir

- `checkLayout` pasa de **6 avisos a 1**, y el que queda (*"barn se sale de la cerca"*) **ya estaba
  en git HEAD**: es el tejado del granero asomando sobre la cerca de arriba, que es como se ve
  desde siempre. Comprobado stasheando los cambios y volviendo a correrlo.
- Los seis archivos del juego se **ejecutan** con Phaser stubbeado, no solo `node --check` — que ya
  nos dejó pasar un bloque huérfano entero. `ui.js` falla por falta de DOM real, y falla igual en
  git HEAD.
- **Memoria de textura: 8,79 → 9,22 MB** (+0,43). El bug de la laguna cortada fue por llegar a 39 MB
  y que las texturas se subieran a medias, así que ahora se mide en cada cambio de tamaño.
  **Aviso para cuando lleguen las expansiones: al final (25×25) esto da 17,6 MB.** Sigue lejos de 39,
  pero es el doble de hoy y hay que volver a medirlo entonces.

---

## 17/8 — AUDITORÍA: la vara de los minerales no sigue el ancla

Dirección: *"siempre todo tiene que encajar con el ancla, la fórmula. Nada está armado en torno a
otra cosa. Tiene todo que ser parte de un puzzle, de la columna vertebral."*

Antes de montar la escalera diaria/semanal/mensual del tablón fui a verificar el ancla sobre el
código, porque el tablón valora cada pedido con `priceOf()` — o sea, con `PRICE`. Si la vara está
torcida, todo lo que cuelgue de ella sale torcido, y no se nota nunca **porque los materiales no
se venden**: no hay mercado que lo delate.

`state.js` ya declara la fórmula: **valor = horas del reloj × 20 + costo de la herramienta**.

| material | reloj | ancla (h × 20) | herramienta | fórmula | PRICE de hoy | desvío |
|---|---|---|---|---|---|---|
| madera | 1,5 h | 30 | 6 | 36 | 36 | **0%** |
| piedra | 2 h | 40 | 6 | 46 | 46 | **0%** |
| bronce | 8 h | 160 | 300 | 460 | 210 | −54% |
| hierro | 12 h | 240 | 348 | 588 | 300 | −49% |
| oro | 14 h | 280 | 1.508 | 1.788 | 470 | −74% |
| diamante | 18 h | 360 | 5.517 | 5.877 | 990 | −83% |
| netherita | 24 h | 480 | 6.157 | 6.637 | 1.240 | −81% |

Madera y piedra están clavadas en la fórmula. Los cinco minerales no.

### Lo que eso significa en la mesa

Los picos tienen `dur: 1` — **un pico por picada** — y cada pico se craftea con el mineral del tier
anterior, así que el costo se compone hacia arriba. Con los precios del propio juego:

| mineral | vale | el pico cuesta | neto por picada |
|---|---|---|---|
| bronce | 210 | 300 | **−90** |
| hierro | 300 | 348 | **−48** |
| oro | 470 | 758 | **−288** |
| diamante | 990 | 1.563 | **−573** |
| netherita | 1.240 | 1.270 | **−30** |

**Picar cualquier mineral por encima de la piedra da pérdida.** No es un desajuste de tabla: es que
toda la escalera de minería está por debajo del ancla, y el jugador que sube por ella se empobrece
respecto del que se queda talando.

### El arreglo que propongo

El ancla dice cuánto puede costar la herramienta por uso: `PRICE − 20 × horas`. O sea 50, 60, 190,
630 y 760. Los picos cuestan hoy entre 2,5 y 6 veces eso.

**Un solo número de diseño: todos los picos duran 5 picadas**, y la receta se deriva para que el
costo por uso sea exactamente el que el ancla permite (5 × 50, 5 × 60, 5 × 190…). Ventajas: no se
toca ningún precio, así que nada de lo que lee `priceOf()` se mueve; la escalera entera queda sobre
la fórmula de una sola vez; y el desgaste pasa a ser un sumidero de material recurrente, que es
justo lo que faltaba.

Lo que NO hay que hacer es dejar `dur: 1` y subir los precios a la columna "fórmula": el diamante
pasaría a valer 5.877 y cualquier pedido del tablón que lo pida se vuelve absurdo.

**Auditoría reproducible**: `node tools/auditar-precio-sombra.js`. Resuelve el costo de la
herramienta por iteración, porque es recursivo (el pico de oro se hace con bronce, que vale según
esta misma tabla).

### APLICADO — y el campo que había que arreglar primero

Al ir a subir la durabilidad apareció el verdadero fallo: **`dur` en `PICK_DEF` estaba muerto.**
El campo existía desde siempre, pero `craftPick` hacía `G.picks.dur[id] = pickCount(id) + 1` — un
1 fijo — y nadie leía `pd.dur`. O sea que poner `dur: 5` no habría hecho absolutamente nada, y el
arreglo del ancla habría sido un **no-op silencioso** anunciado como resuelto.

Arreglado en una línea (`+ (pd.dur || 1)`), y el toast ahora dice "+5" en vez de "+1".

Recetas derivadas (presupuesto = lo que el ancla permite por uso × 5 usos), pagadas **solo en
material** para que el desgaste sea además sumidero:

| pico | antes | ahora | usos | cuesta/picada | el ancla dice |
|---|---|---|---|---|---|
| Bronce | 3 madera + 4 piedra + 8 plata | **7 madera** | 5 | 50 | 50 |
| Hierro | 3 madera + 5 piedra + 10 plata | **2 madera + 5 piedra** | 5 | 60 | 60 |
| Oro | 3 madera + 3 bronce + 20 plata | **4 bronce + 3 madera** | 5 | 190 | 190 |
| Diamante | 3 oro + 3 madera + 45 plata | **6 oro + 4 madera + 4 piedra** | 5 | 630 | 630 |
| Netherita | 1 diamante + 5 madera + 100 plata | **3 diamante + 18 piedra** | 5 | 760 | 760 |

Los cinco minerales pasan de dar pérdida a rendir **exactamente 20 plata/hora**, igual que una
parcela y que un árbol. El de netherita salía 3,84 diamantes: redondear a 4 lo dejaba un 7% por
debajo, así que se parte en 3 diamantes + 18 piedra y da el presupuesto clavado.

El pico de piedra **no se toca**: ya estaba sobre el ancla (46 − 40 = 6 = su costo) y el tutorial
consume 11, así que moverlo cambiaba el arranque sin necesidad. Verificado: `sim-tutorial.js` sigue
cerrando en 18,1 h.

---

## 18/8 — Tres del reporte del diseñador

### 1. Los nodos se reiniciaban al volver de la Zona Negra (y con un F5)

Reportado como *"al regresar se reinician los nodos"*. Al mirarlo resultó ser bastante más que eso.

El enfriamiento de un nodo vivía **solo en el objeto de la escena** y nacía en 0. Los cultivos sí
se guardaban (`syncPlots` → `G.plots` → save), los nodos no tenían equivalente: el comentario del
save decía *"no world/cooldowns/buffs, que son de la sesión"*, y para relojes de 1 h 30 y 2 h eso
nunca pudo ser cierto.

Consecuencias reales, en orden de gravedad:

1. **Era barra libre.** Talás los seis árboles, cruzás el portal, volvés, y los seis están listos
   otra vez. Sin límite. Lo mismo con rocas y vetas.
2. Un **F5 hacía exactamente lo mismo** — ni siquiera hacía falta el portal.
3. Con eso **el ancla no significaba nada**: los 20 de plata por hora se sostienen en que las horas
   de reloj existan. Si se pueden saltar, el árbol y la roca son infinitos y todas las cuentas de
   la economía estaban de más.

Arreglado: `syncNodos()` guarda el enfriamiento en `G.nodos`, indexado por el índice del objeto —
que es estable porque `WORLD_OBJECTS` solo crece por el final. Se anotan **solo los nodos que están
enfriándose**, así el guardado no engorda con treinta entradas en cero. Se restaura al construir la
escena y se guarda en cada golpe y cuando un nodo vuelve a estar listo.

### 2. Se podía entrar a la Zona Negra sin arma

No había ninguna comprobación. El rótulo del propio portal decía *"Teletransportarte a la Zona
Negra **sin arma**"* — describía el problema y dejaba pasar igual.

Ahora se pide **arma equipada**, no solo tenerla en el cofre: llevarla puesta es la decisión. Si la
tenés pero sin equipar, el aviso lo dice; si no tenés ninguna, te manda a la Herrería. El rótulo
del portal también cambió, porque anunciar la carencia no es lo mismo que impedirla.

### 3. "La parcela gratis no la da la granja"

No es que no apareciera: **es que no se regalaba ninguna.**

El 14/8 se pasó a nacer con 3 parcelas (*"la primera misión planta 3 semillas y tiene que haber 3
celdas donde apuntar"*), pero `FARM_PARCELA` y sus textos siguieron escritos para cuando se nacía
con 2. Al nivel 2 el cartel anunciaba "3ª parcela GRATIS", `regalosSync` hacía la resta 3 − 3 = 0
y no encolaba nada. El jugador leía la promesa y no encontraba la parcela por ningún lado.

Corregida la escalera entera (`{2:4, 4:5, 6:6, 7:7, 12:8, 18:9, 25:10, 35:11, 45:12, 50:13}`) y
los diez textos de `FARM_UNLOCK` que la nombran.

**Verificado**: se recorren los 50 niveles comparando lo que promete el cartel contra lo que
`regalosSync` encola de verdad. Antes fallaba el nivel 2; ahora coinciden los diez. Al nivel 50 son
13 parcelas: la número 13 pasa a la zona de edición, como cualquiera por encima de la grilla de 12.

*Nota*: la clase de fallo de los puntos 1 y 3 es la misma — dos cambios correctos por separado que
nadie volvió a cruzar. Por eso las dos verificaciones nuevas comparan **lo que el juego dice** con
**lo que el juego hace**, en vez de comprobar cada lado por su cuenta.

---

## 18/8 — Los edificios cuelgan del ancla, y se cierra la trampa de Sunflower

Investigado el código abierto de Sunflower Land (no la wiki, que no sirve) para ver de qué se puede
aprender. Tres cosas que valen, y una que hay que desmentir.

### Lo que NO es cierto: cada edificio no es su propia economía

La hipótesis era que en Sunflower cada edificio es un sistema cerrado y se puede jugar
especializándose en uno. **Es falso como mecánica.** Ningún edificio tiene bucle cerrado: los
animales solo comen cultivos (la única comida que no sale del campo cuesta gemas, moneda premium),
la Bakery pide 20-40 huevos en 12 de sus 14 recetas, el Deli vive de la leche del Barn, y el mejor
fertilizante de cultivos exige huevos. La especialización real vive en el **árbol de habilidades**,
donde cada rama lleva penalización obligatoria: `Acre Farm` da +1 a cultivos avanzados y −0,5 a los
básicos; elegir dieta de gallinas encarece la de vacas y ovejas.

Y es deliberado — adamhannigan, en su discusión de balance de recursos:
> *"Taken too far it will favour extractors and steer players away from playing the game how it is
> intended. We respect strategies, but don't want people focussing on singular resources &
> extracting — we want them playing the entire game."*

### Sus costes de edificio tampoco están anclados

`buildings.ts` no tiene **ni un solo comentario**: es una tabla de números pelados. En cambio su
progresión de islas y ascensiones **sí** está parametrizada con fórmula (`coste = base × 1,4^(a−1)`).
O sea que ellos llegaron a la misma conclusión: lo que hay que formular es la curva de expansión.

### La trampa nº2, en la que caíamos de lleno

De su documento de utilidad de recursos, las cuatro que se prohíben a sí mismos: efecto bola de
nieve · **recursos para hacer más recursos** · desalineación inflacionaria · usos de una sola vez.

Comprobado sobre nuestro código: de los cinco materiales intermedios, **tres no los gastaba nadie**
— tablón de madera, bloques de piedra y barra de hierro eran madera y piedra convertidas en un
ítem sin salida. Ahora son el material de obra de los edificios de segundo nivel. Huérfanos: 0.

### Los edificios, derivados del ancla

Medido contra la granja que tenés cuando cada uno se abre, había un **factor 25** entre el más
barato y el más caro — y el más caro del juego estaba disponible desde el nivel 1.

| edificio | nivel | antes | ahora |
|---|---|---|---|
| Herrería | 1 | 0,4 días | 0,4 |
| Horno de Piedra | 3 | 0,5 | 0,5 |
| Cocina | 5 | 0,4 | 0,5 |
| Establo | 6 | 3,7 | **1,5** |
| Altar de Runas | 1 → **7** | **9,8** | **2,0** |
| Curtiduría | 8 | 3,8 | **2,5** |
| Altar de Ofrendas | 10 | 5,6 | **3,0** |

**Fuera el oro de las cuatro recetas.** Era más de la mitad de su coste, ataba el Establo del nivel
6 a un mineral que a ese nivel no rinde, y sobre todo **impedía que el oro llegara por expansión**:
lo dejaba inconstruible catorce niveles. Ahora ningún edificio pide oro y esa atadura desaparece.

**El Altar de Runas gana nivel 7.** Ser el edificio más caro del juego y estar disponible en el
minuto uno no era una decisión, era un número que nadie volvió a mirar.

Detalle que costó una iteración: el **reparto entre madera y piedra no da igual**. El valor lo fija
el ancla, pero con 2 árboles de 1 h 30 y 2 rocas de 2 h el tutorial dura lo que dure el recurso más
lento. Cargando hacia la madera se iba a 20,6 h; repartiendo 1,33 de madera por piedra los dos
relojes terminan a la vez. Queda en **19,2 h** (antes 18,1, el 6% que subió el valor de las recetas).

### El tablón deja de imprimir dinero

Pagaba plata a **1,5× el valor de lo que pedía**. Eso no es un sumidero: saca material y mete más
dinero del que valía, así que cuantos más pedidos cumplís más rico te hacés. Y montarle encima la
escalera semanal/mensual habría multiplicado el problema.

Ahora paga el valor **exacto** (1,0×) — el pedido es neutral en plata — y la ganancia se mueve a
**vales y XP**, que no vuelven a la producción. Los vales suben de 1-3 a 2-5 para compensar. Es el
mismo modelo que Sunflower usa con la moneda de su capítulo.

### Lo que sigue abierto

Los **precios de los minerales están entre 2 y 6 veces por debajo** de lo que cuesta sacarlos, y
arreglarlo necesita cantidades decimales, porque el suelo de "mínimo 1 unidad" no deja abaratar los
picos. Es la única pieza grande que queda del equilibrio.

---

## 18/8 — El tutorial se atascaba en el paso 0 (y el baúl no lo decía)

Reportado como *"compré las 3 papas y el tuto no lo detecta"*. La compra no tenía nada que ver.

**El tutorial seguía parado en el paso 0, el del baúl**, y `tutoEvent` descarta en silencio
cualquier evento que no sea el del paso activo. Comprar, plantar y cosechar no contaban nada, y no
se avisaba de nada: desde fuera parece que el juego ignora lo que hacés.

Por qué se quedaba parado ahí:

1. `kitReclamar()` arranca con `if (G.kitReclamado) return false`, y es el **único** sitio que
   dispara el evento `"kit"`.
2. Al cargar un guardado que no trae ese campo, `save.js` hace
   `G.kitReclamado = d.kitReclamado != null ? !!d.kitReclamado : true` — o sea, **lo da por
   reclamado**.
3. Resultado: el baúl no tiene nada que entregar, el evento no se dispara nunca, y el paso no se
   puede cumplir ni jugando perfecto.

`tutoAutoSkip()` habría arreglado esto solo — `tutoHecho` ya sabe que el paso del kit está hecho si
`G.kitReclamado` es true. Pero solo se llamaba **al migrar de versión**, así que a quien ya tenía la
versión actual no le corría nunca.

Arreglo: **se llama siempre al cargar.** Cualquier paso ya cumplido se salta, venga de donde venga
el desajuste. Cubre la clase entera, no solo este caso.

**Test que lo fija**: `node tools/test-tutorial-atasco.js`. Reproduce el guardado del diseñador y
comprueba además que no se rompe lo que funcionaba (partida nueva, veterano, guardado de versión
vieja). Con el arreglo, 6 en verde; revirtiéndolo, los dos primeros fallan.

### El baúl no se veía abierto con premios dentro

Dirección: *"cuando se recompensa en el baúl debe mostrarse abierto"*. La tapa abierta era **solo
del kit de bienvenida**, así que los premios de nivel —parcelas, árboles y rocas, que desde el 16/8
llegan justamente ahí— caían en un baúl que se veía cerrado. El jugador leía "te llegaron premios al
baúl" y no tenía ni un indicio en el mapa. Ahora la tapa se abre con cualquier cosa esperando.

Es la misma familia que el fallo de arriba y que el de la parcela de ayer: **dos cosas que tienen
que ir juntas y que nadie volvió a cruzar** después de cambiar una de las dos.

### Verificación reproducible

`tools/run-archivos.js` reemplaza al script suelto de ayer: ejecuta los cinco archivos con Phaser
stubbeado (no `node --check`, que ya nos dejó pasar un bloque huérfano entero) y comprueba la
sintaxis de `ui.js`, que necesita DOM real.

---

## 18/8 — La cerca abraza el contorno real (vista previa)

Dirección: *"las cercas también se expanden"*. O sea que la cerca no rodea un rectángulo: abraza
exactamente lo que compraste, con ángulos hacia dentro incluidos.

**Se puede hacer sin arte nuevo.** En vez de enumerar casos y dibujar esquinas, se **recorre el
perímetro celda a celda**: para cada celda tuya, si el vecino de arriba no es tuyo va cerca de
arriba; si el de la izquierda no es tuyo, cerca izquierda; y así. Cualquier forma sale sola —
cóncava, con entrantes, con un bloque suelto en diagonal. Los cuatro sprites que ya existen bastan.

`tools/preview-expansiones.py` lo dibuja con el arte real y cualquier combinación de bloques:

    BLOQUES="6,2,13,5,8" python3 tools/preview-expansiones.py

**Y el aire viaja con la cerca.** Primera versión: el bosque quedaba pegado al cercado. Dirección:
*"fijate la distancia que están cercados de los árboles — el cercado no puede pisar los árboles"*.
Hoy hay un anillo de césped de 2,3 celdas entre la cerca y el primer tronco, y ese aire tiene que
acompañar a la expansión. Generalizado a cualquier forma: **el bosque se retira de toda celda que
esté a menos de 2,3 celdas de algo tuyo**. En un rectángulo da exactamente el anillo de siempre; en
un contorno irregular lo sigue sin enumerar ni un caso, igual que la cerca.

Comprobado con 0, 2, 5 y los 16 bloques. La granja va de 225 a 625 celdas y el bosque retrocede
solo alrededor de los bloques comprados, que es lo que hace que la expansión se sienta.

Queda una decisión de dirección antes de escribirlo en el juego: **si el jugador elige qué bloque
comprar o el orden viene fijado.** Con la cerca por perímetro las dos opciones cuestan lo mismo.

### El orden: un recorrido del perímetro

Dirección: *"cada expansión va a ir de forma consecutiva una tras la otra. La expansión uno sería,
desde el lado izquierdo, la que está más arriba de todas, sin ser la esquina. Partiendo de la uno
irá hacia abajo hasta la esquina inferior izquierda, luego hacia la derecha, luego para arriba y
luego hacia la izquierda, cerrando todo el cuadrado."*

El índice del array **es** el orden de compra, así que no hace falta una tabla aparte:

| # | nivel | dónde | | # | nivel | dónde |
|---|---|---|---|---|---|---|
| 1-3 | 3, 5, 7 | laterales izquierda, bajando | | 9-11 | 23, 26, 30 | laterales derecha, subiendo |
| **4** | 9 | **esquina abajo-izquierda** | | **12** | 34 | **esquina arriba-derecha** |
| 5-7 | 11, 14, 17 | laterales de abajo | | 13-15 | 38, 42, 46 | laterales de arriba |
| **8** | 20 | **esquina abajo-derecha** | | **16** | 50 | **esquina arriba-izquierda** |

Con esto la granja crece **siempre de una pieza**, envolviendo el corral como una espiral. Se
comprueba en el arranque que los 16 bloques existen, que no hay repetidos, que hay 4 esquinas y —lo
que importa— que **cada bloque toca terreno que ya era tuyo**: nunca queda uno suelto en diagonal.

Ventaja que no es menor: con el orden fijo las formas posibles son 17, no 65.536. Se pueden dibujar
a mano los nodos de cada expansión y comprobar cada etapa una por una.

### La base del refactor: una sola fuente de verdad para el terreno

Todo el mapa —césped, bosque, cerca, adornos, cámara, por dónde se camina— preguntaba "¿qué forma
tiene la granja?" dando por sentado **un rectángulo que empieza en (0,0)**. Con las expansiones eso
deja de ser cierto. Ahora la pregunta se responde en un solo sitio (`config.js`) y el resto consulta.

Como el orden de compra es fijo, "lo que tenés" son **las N primeras del array**: no hace falta
guardar qué bloques, solo cuántos.

Dos conjuntos, no uno:

- **MÍAS** — las celdas que poseés. Manda la cerca y dónde se puede construir.
- **DESPEJADAS** — las mías más el aire de 2,3 celdas. Manda hasta dónde llega el césped y desde
  dónde empieza el bosque. Es lo que mantiene los troncos separados del cercado.

`GF.terreno(n)` los arma y los cachea por cantidad de expansiones. Encima: `GF.tuyo`,
`GF.despejado`, `GF.cajaTerreno`.

**`GF.enCerca` se reescribió con la regla que siempre se quiso decir**: una celda es cerca si es
tuya y tiene al lado algo que no lo es (arriba dos filas, porque el arte es la cerca más su sombra).
Antes era la fórmula del rectángulo. Ahora también acierta en las esquinas hacia dentro.

**La propiedad que hace que esto sea seguro de subir**: con 0 expansiones, la regla nueva da
*exactamente* lo mismo que la vieja, celda por celda. `tools/test-terreno.js` lo comprueba sobre las
289 celdas del mapa, y además que el interior útil sigue siendo 13×12, que nada del contenido pisa
la cerca, y que en las 17 etapas la cerca es siempre el borde real. Nueve comprobaciones en verde.

Falta pasar `farm.js` a consultar esto (césped, bosque, adornos, cerca, cámara y límites) — son 56
sitios y va en su propia tanda.

---

## 18/8 — `farm.js` deja de dar por sentado un rectángulo

La tanda gorda. Todo el mapa se dibujaba sobre "un rectángulo que empieza en (0,0)"; ahora consulta
el terreno. Lo que cambió, por partes:

**El origen puede ser negativo.** `GF.ORIG_X` / `GF.ORIG_Y` — al comprar por la izquierda o por
arriba el claro se extiende hacia allá. Las coordenadas guardadas de los objetos **no se tocan**:
siguen contando desde la esquina del corral original, que es lo que hace que ningún layout se rompa.
Phaser trabaja sin problema con coordenadas negativas. `GF.aplicarTerreno(n)` recalcula COLS, ROWS,
WORLD_W, WORLD_H y el origen, y se llama **lo primero** en `create()`.

**La cerca se recorre, no se enumera.** Eran cuatro bucles (fila 0, fila ROWS-1, columna 0, columna
COLS-1), que solo sabe describir un rectángulo. Ahora: para cada celda tuya, si el vecino de arriba
no es tuyo va cerca de arriba, etc. Cualquier forma sale sola, con los cuatro sprites que ya existen.

**El claro deja de ser una elipse.** `met`/`borde` con redondez y oleaje solo sabe describir una
forma convexa alrededor de un centro; los entrantes de las expansiones no los describe ninguna
elipse. Ahora se pregunta por la celda: si está despejada no va árbol. `dentroDelClaro` usa la misma
verdad, así que los adornos y el bosque ya no se pueden desincronizar — que era el fallo de ayer.

**El césped** dibuja el terreno más el aire, no el rectángulo. **Los adornos** se siembran anclados
al origen. **`GF.blockedAt`** pregunta por la celda en vez de comparar contra el borde del
rectángulo. **`margenBosque`** se calcula por diferencia contra `GF.MAPA`, así que el anillo encoge
solo a medida que el claro crece, sin ningún número a mano.

### Verificado

`tools/test-etapas.js` recorre las 17 etapas con la geometría del juego y comprueba en cada una:
la cerca tiene tramos y la banda de borde es coherente · nada del contenido pisa la cerca · la
cámara alcanza todo el césped · la memoria de textura no se dispara.

| etapa | granja | tramos de cerca | césped | bosque | total |
|---|---|---|---|---|---|
| 0 | 15×15 | 60 | 3,6 | 5,7 | **9,2 MB** |
| 8 | 25×20 | 90 | 6,2 | 8,7 | 14,9 MB |
| 16 | 25×25 | 100 | 7,3 | 9,8 | **17,1 MB** |

17,1 MB en la etapa final, contra los 39 que corrompieron la laguna. Con margen, y ahora medido en
cada etapa en vez de descubrirlo con un sprite roto.

Las 17 en verde, más `test-terreno.js` (9 comprobaciones) y `test-tutorial-atasco.js` (6).

**El único cambio visible con 0 expansiones**: las esquinas del claro quedan levemente redondeadas,
porque el aire de 2,3 celdas se mide en radio y no en rectángulo. El resto es idéntico.

---

## 18/8 — Las expansiones ya se pueden comprar

Cerrado el círculo: el motor estaba, faltaba la puerta.

**Dónde**: en la Tienda, pestaña de adornos, **arriba del todo**. Va primero porque es la compra
que cambia el mapa — sin terreno, comprar parcelas o adornos no lleva a ningún lado. Se muestra
**siempre**, también cuando todavía no llegaste al nivel, para que se vea qué viene y por qué vale
la pena subir.

Lo que enseña la ficha: qué número de expansión es, cuántas llevás de 16, si es lateral o esquina,
y el material que pide **con lo que tenés al lado en verde o rojo**, para que no haya que ir a
contar al cofre.

**Qué pasa al comprar**: se cobra el material, sube `G.expansiones`, salta la celebración y la
escena se reinicia con telón — porque la forma del mundo cambió y hay que rehacer césped, bosque,
cerca, adornos y límites de cámara. Se guarda antes de reiniciar.

`G.expansiones` es un solo número: como el orden de compra es fijo, no hace falta guardar qué
bloques. Se guarda y se carga con tope en 16.

### Verificado de punta a punta

`tools/test-expansiones.js` compra las 16 una por una, dándole **justo** lo que cuesta cada vez:

| # | nivel | granja | |
|---|---|---|---|
| 1 | 3 | 225 → 250 | +25 |
| 6 | 14 | 350 → 375 | +25 |
| 11 | 30 | 475 → 500 | +25 |
| 16 | 50 | 600 → 625 | +25 |

Ocho comprobaciones en verde: el nivel frena · el material frena · cada compra suma exactamente un
bloque de 5×5 · descuenta el material exacto · no se puede pasar del tope · con las 16 nada del
contenido pisa la cerca · el mundo termina en 25×25 · el origen se corrió a (−210, −210), que es la
prueba de que las coordenadas negativas funcionan.

### Lo que queda

Los **nodos de cada expansión**. Hoy el bloque llega vacío: es terreno donde poner lo que compres.
Con el orden fijo hay solo 17 formas posibles, así que se pueden dibujar a mano los árboles y rocas
de cada una y revisarlas de a una, en vez de confiar en una colocación automática.

---

## 18/8 — Los nodos se veían enteros antes de tiempo

Reporte del diseñador, con captura: *"crecen antes de la hora"*, y después *"lo mismo sucede con las
de piedra... tenés que cambiar la manera en la que los sprites van rotando. Tiene que depender eso
sí o sí del tiempo que tengan de enfriamiento."* Tenía razón en el diagnóstico y en el arreglo.

**El fallo.** El sprite cambiaba **por evento**: al cruzar la mitad del enfriamiento se ponía el
retoño, al llegar al final el nodo entero. Un evento solo ocurre si la escena está viva en ese
instante. Si se reconstruye —volver de la Zona Negra, un F5— el sprite **nace con la textura del
nodo entero** y ya no queda ningún umbral que cruzar: se queda entero, y sin poder usarse, hasta que
venza el reloj.

**Lo destapó el arreglo de ayer.** Antes los enfriamientos se reiniciaban al reconstruir la escena,
así que los nodos siempre estaban legítimamente enteros y esto no se podía ver. Al guardarlos, salió.

**El arreglo, tal cual lo pidió dirección**: la textura pasa a ser una **función del tiempo que le
falta**, no un evento.

| | 0 → 50% del enfriamiento | 50% → 100% | listo |
|---|---|---|---|
| árbol | `tree_stump_leaves` | `tree_half` | `tree` |
| roca | `node_stone_mined` | `node_stone_half` | `node_stone` |
| veta | `node_<mineral>_mined` | `node_<mineral>_half` | `node_<mineral>` |

`texNodo(o, t)` la calcula y `aplicarTexNodo` la pone **solo si cambió**. Se llama en el tick y
—esto es lo que faltaba— **también al construir la escena**, así que el sprite dice la verdad desde
el primer frame venga de donde venga. Los efectos (saltito y polvillo) se disparan con el cambio de
textura, no con el paso del tiempo, así que siguen viéndose una sola vez.

Los nodos a medio talar no se tocan: mientras hay golpes encima manda el golpe, no el reloj.

**Verificado**: `tools/test-sprites-nodo.js` recorre el enfriamiento completo de un árbol, una roca
y una veta de oro en 101 pasos y comprueba que recién usado no se ve entero, que a la mitad se ve
distinto, que al terminar vuelve al sprite entero y opaco, y que en todo el enfriamiento hay
exactamente 2 cambios de textura — ni parpadeo ni saltos. 13 comprobaciones en verde, más el caso
de un guardado viejo sin `cdIni`.

---

## 18/8 — Auditoría completa: bugs y anclaje

Dirección pidió revisar todo el código buscando bugs y comprobar que el balance quedara colgado de
la fórmula. Salieron cosas gordas, y una de ellas no tenía nada que ver con las expansiones.

### 1. CATASTRÓFICO (y anterior a todo esto): un parpadeo de red borraba la partida

`loadFarm()` devolvía `false` en dos casos que no son lo mismo: **"este jugador es nuevo"** y **"no
pude leer la nube"**. `main.js` los trataba igual: mostraba la puerta del apodo, el jugador escribía
un nombre, y eso disparaba un `saveFarm()` **con G en los valores por defecto**. La granja de la
nube quedaba pisada por una partida de nivel 1. Tres intentos de lectura fallidos —una mala conexión
al entrar— y la partida se perdía.

Arreglado con una bandera: hasta que un `hydrate()` no termine COMPLETO, `saveFarm` no escribe nada.
Y si la lectura falla, el jugador ve "No se pudo cargar tu granja · Reintentar" en vez de la puerta
del apodo. Es preferible perder una sesión antes que pisar la granja buena.

### 2. El orden de carga volvía mentirosas a tres funciones

`tutoMigrar`, `tutoSync` y `applyCombatHp` corrían **a mitad** de `hydrate()`, antes de que
existieran los datos que leen:

- `tutoMigrar` → `tutoAutoSkip` lee `kitReclamado`, `obras`, `obraDep`, `weapons`, `picks`,
  `treesOpen`… que se cargan hasta 70 líneas más abajo. **El arreglo del tutorial de esta mañana no
  llegaba a hacer nada ahí**: se autocuraba de rebote 400 ms después desde `FarmScene`.
- `applyCombatHp` suma la Runa Guardiana (hasta **+120 de vida máxima**) leyendo `gear` y `weapons`,
  que tampoco estaban. Y la línea siguiente **recortaba la vida contra ese máximo mal calculado**:
  cada F5 te comía vida máxima y vida de verdad.

Las tres se mudaron al final de `hydrate()`, con el estado completo delante.

### 3. Nueve clamps impedían usar el terreno comprado

`Phaser.Math.Clamp(col, 0, GF.COLS - 1)` en los nueve sitios de colocación y arrastre. Los dos
extremos son falsos ahora: el mínimo no es 0 (es `GF.C0`, que vale −5 desde la primera expansión) y
el tope no es `COLS-1` (`COLS` es el ANCHO, no el índice). **Era imposible mover nada a la franja
recién comprada**: el clamp lo pegaba contra el borde del corral viejo. Se compraba terreno y no se
podía amueblar, que es literalmente para lo que se compra.

### 4. El anillo de bosque seguía anclado a (0,0)

La colocación por árbol ya usaba el terreno, pero el rectángulo y el rango de generación no. Todo el
flanco izquierdo se quedaba **sin bosque dibujado**: césped pelado hasta el mosaico repetido. Y el
"no pintar sobre el mundo" protegía el rectángulo viejo, así que el suelo de bosque **tapaba las
florcitas del terreno nuevo**. Corregidos el rt, el rango, el suelo y las coordenadas de dibujo.

### 5. La Zona Negra crecía porque comprabas césped

`forest.js` hacía `this.H = GF.WORLD_H`, que era una constante y ahora la reescribe
`aplicarTerreno()`. Con 12 expansiones el mapa de combate pasaba de 630 a 1050 px de alto (+67%):
los bichos más dispersos y más camino que hacer, **por haber comprado terreno en la granja**. Ahora
tiene alto propio.

### 6. Otros

Cámara descentrada 210 px al entrar · chispas de la Granja Legendaria fuera de la cerca y ausentes
en el terreno nuevo · `GF.Nav` (pathfinding) con la grilla desde (0,0), dormido por `NO_WALK` pero
listo para romperse · respaldo de `spawnChest` en el centro equivocado.

### 7. La auditoría del ancla: 13 números fuera, ahora 5

`tools/auditar-ancla.js` recorre los **48 números** de la economía y mide el desvío contra la
fórmula. Hallazgo nuevo, que no había visto nadie:

**Los cinco cultivos largos estaban fuera de la fórmula en las DOS direcciones.**

| cultivo | plata/h | XP/h | | venta | XP |
|---|---|---|---|---|---|
| Calabaza | 20 ✓ | **90** | | — | 270 → **300** |
| Brócoli | 20 ✓ | **80** | | — | 480 → **600** |
| Girasol | **24** | **72** | | 420 → **380** | 720 → **1000** |
| Trigo | **30** | **67** | | 840 → **680** | 1080 → **1600** |
| Maíz | **40** | **60** | | 1680 → **1200** | 1440 → **2400** |

El maíz era el caso extremo: **el doble de plata por hora** que cualquier otra casilla y **60% de la
XP**. Quien llegaba al maíz duplicaba su plata y frenaba su progresión: el cultivo del final del
juego rompía el ancla por arriba y por abajo a la vez. Re-anclados bajando la venta (no subiendo la
semilla, que dejaría una relación absurda) y subiendo la XP.

**Quedan 5 desvíos, y son los mismos de siempre**: las cinco vetas de mineral, que dan pérdida
porque el pico cuesta más que lo que saca. Es la única pieza que necesita cantidades decimales.

### Bancos de pruebas

Seis, todos en verde: `test-terreno` · `test-etapas` · `test-expansiones` · `test-tutorial-atasco` ·
`test-sprites-nodo` · `test-coords-negativas` (nuevo: cubre lo que los otros no veían, porque
ninguno probaba con expansiones compradas). Más `auditar-ancla` y `auditar-precio-sombra`.

### Lo que faltaba de la auditoría

- **El enfriamiento de la Zona Negra se paga AL ENTRAR.** Se fijaba solo en `zonaSalir()`, que
  corre al salir caminando o al morir. Un F5 dentro siempre cae en la granja: el jugador farmeaba,
  recargaba en vez de salir, y volvía sin enfriamiento y sin resumen, con el viaje colgado en el
  guardado. Mismo patrón que los nodos: entrar y salir tienen que ir juntas.
- **Los buffs se guardan.** No estaban ni en el guardado ni en la carga: el buff del plato (5 min)
  y sobre todo **el del cofre diario (60 min)** se perdían en cada F5. El jugador pagaba materiales
  y cocinaba para nada. Se descartan al cargar los que ya caducaron mientras no estaba.
- **`chestCap` se recalcula si falta.** Si el campo no venía, la capacidad extra de cofre se perdía
  **para siempre** — no había ningún `regalosSync` equivalente. Ahora se deriva de los niveles.
- **La clave de los enfriamientos deja de ser el índice del array.** Era una mina justo debajo de lo
  siguiente que hay que hacer: agregar los nodos de cada expansión habría corrido todos los índices
  y el reloj de un árbol habría caído sobre una roca. Ahora la clave es la **celda original** del
  objeto, que no cambia aunque el array crezca. Verificado: 18 nodos, 18 claves, cero colisiones.
  `G.layout` sigue usando el índice (tiene guardados en producción), así que queda un aviso grande
  en `config.js`: **los objetos nuevos van SIEMPRE al final**.
- **`GF.BOSQUE_AIRE` marcada como muerta.** Quedó huérfana al dejar de ser una elipse el claro, y
  se llama casi igual que la viva (`GF.AIRE_BOSQUE`). Era una trampa para el próximo que quisiera
  ajustar el aire entre la cerca y los árboles.
- **`checkLayout` mide contra el origen del terreno**, no contra el rectángulo desde (0,0).

---

## 18/8 — LA MINERÍA VUELVE AL ANCLA · los 48 números cuelgan de la fórmula

Era el último desvío que quedaba, y el más viejo: **picar cualquier mineral daba pérdida** — bronce
−90, oro −288, diamante −573 por picada — porque el pico se craftea con el mineral de abajo y el
coste se compone hacia arriba. Toda la escalera de minería estaba por debajo del ancla, y no se veía
porque los materiales no se venden: no hay mercado que lo delate.

Se probaron dos vías y las dos se descartaron:

- **5 usos por pico** → rechazado por dirección: *"las herramientas tienen un uso, esa es una norma;
  la idea es balancear al ancla sin modificar cómo funcionan las cosas"*. Tenía razón: arreglaba el
  número cambiando la mecánica.
- **Cantidades decimales** → más profundo que el problema que arregla. Tocaba los 74 sitios donde se
  suma o resta un recurso, y obligaba a decidir qué ve el jugador en el inventario.

**La que cierra sin tocar nada: la picada rinde 2.**

| pico | receta | la picada da | rinde |
|---|---|---|---|
| Bronce | 3 madera + 3 piedra + 14 plata | 2 bronce | 20/h |
| Hierro | 3 madera + 5 piedra + 22 plata | 2 hierro | 20/h |
| Oro | 3 bronce + 30 plata | 2 oro | 20/h |
| Diamante | 3 oro + 5 madera + 30 plata | 2 diamante | 20/h |
| Netherita | 2 diamante + 20 plata | 2 netherita | 20/h |

Un uso por pico, cantidades enteras, la escalera intacta —cada pico sigue pidiendo el mineral de
abajo, que era lo que con enteros parecía imposible— y `(2 × precio − costo del pico) / horas = 20`
**exacto en los cinco tiers**. Los precios no se tocan, así que nada de lo que lee `priceOf()` se
mueve.

    node tools/auditar-ancla.js   →   los 48 números cuelgan del ancla

### Limpieza de la misma tanda

- **Se fueron las 31 líneas de la métrica elíptica del claro** (`RX`, `RY`, `met`, `borde`, `AMP`,
  `ONDA`, `BASE`, `colchon`). No las llamaba nadie desde que la forma la decide el terreno, y eran
  una trampa: el próximo que quisiera ajustar el aire entre la cerca y los árboles habría tocado
  `GF.BOSQUE_AIRE`, que está muerta. La viva es `GF.AIRE_BOSQUE`, en celdas.
- **La semana del HUD avanza.** `G.week` se dibujaba en pantalla y **no la incrementaba nadie**: el
  jugador veía "semana 1" para siempre. Ahora se deriva de cuándo empezó la partida — es un dato,
  no un contador que alguien se tiene que acordar de subir. Los guardados viejos migran su `week`.
- **Fuera cuatro campos zombis del guardado** (`toolsLost`, `testeoDado`, `capsClaim`, `week`): se
  pagaban en cada escritura a la nube y no los leía ninguna función viva. La carga los sigue
  aceptando, así que ningún guardado viejo se rompe.

---

## 18/8 — Cada expansión trae su árbol y su roca · y el tablón gana escalera

### Los 32 nodos se DERIVAN, no se escriben

Cada bloque trae 1 árbol y 1 roca. Antes llegaba pelado: terreno para poner lo que compres, que ya
sirve, pero la idea era que la expansión trajera algo vivo.

Las 32 posiciones **no están escritas a mano**: se piden las celdas del bloque que no son cerca *en
el momento en que se compra* y se eligen las dos más centradas. Si mañana cambia el tamaño del
bloque o el orden del recorrido, se recalculan solas y no hay 32 números que revisar.

Es seguro porque **la cerca solo retrocede**: una celda que es interior cuando comprás el bloque lo
sigue siendo para siempre — comprar más terreno nunca convierte interior en borde. El test lo
comprueba para los 32 nodos en **todas** las etapas posteriores, no solo en la suya.

Al terminar las 16: **22 árboles y 22 rocas** (6 del corral + 16 de cada uno).

**Bug que apareció al hacerlo**: `snap()` hacía `Math.max(0, ...)` sobre `leftCol`. Se escribió
cuando el mundo empezaba en la columna 0, y con las expansiones mandaba **a la columna 0 todo lo
que se colocara a la izquierda** — los nodos del flanco izquierdo aterrizaban todos apilados sobre
el corral. Quitado el recorte.

### El tablón: diaria, semanal y mensual

Dirección: *"podemos regularlo con las misiones del tablón, que sean misiones diarias, semanales,
mensuales"*. Cuánto pide cada escalón, medido contra lo que producís **ese día** — no números fijos,
así escala solo con la granja:

| | pide | paga |
|---|---|---|
| Diaria (3) | 10% de la producción del día | vales + XP |
| **Semanal** | un día entero de producción | vales, ×6 lo de una diaria |
| **Mensual** | tres días de producción | vales, ×18 |

En 30 días eso quema **10 días de producción: el 33%**. Sumado a las expansiones (20%) y a
edificios y herramientas (4%), se quema ~57% y al jugador le queda el 43%.

La regla que lo hace sumidero y no cambio con ganancia: **el extra se paga en vales**, que solo salen
del tablón y solo se gastan ahí. Verificado que los tres escalones pagan **exactamente 1,00 veces**
el valor de lo que piden en plata — neutral — y que toda la ganancia va en vales. El ×2 del primer
pedido del día queda solo para los diarios; el semanal y el mensual no se pueden descartar.

### Tests

Siete, todos en verde. Los de terreno y etapas tuvieron que aprender que los nodos de expansión
están legítimamente fuera del terreno hasta que se compran — eso lo comprueba `test-nodos-expansion`,
cada nodo en la etapa que le toca.

---

## 18/8 — El cartel de expansión, sobre el mapa

Dirección, con captura de Sunflower: *"cuando hay una zona que ya es expandible se pone esa
delimitación, marcando que ese lugar ya puede ser expandido, y le das al botón entregando los
recursos que pida"*.

**El diagnóstico primero**: la había metido en la Tienda, pestaña **Adornos**. La compra más grande
del juego, la que cambia el mapa, escondida donde se venden macetas. Dirección —que sabía que
existía porque la pedimos juntos— no la encontró siendo nivel 3 y teniéndola desbloqueada. Si no la
encuentra quien la diseñó, no la encuentra nadie.

Ahora el lote que te toca se marca **en el bosque**:

- **El suelo del bloque, insinuado** con un tinte y un borde. Se ve QUÉ terreno vas a ganar.
- **Estacas en todo el perímetro**, una por celda, con su sombrita. Marcan el lote sin taparlo.
- **Un cartel en el centro** con el coste y, al lado de cada material, **cuánto tenés**: verde si
  llega, rojo si falta. No hay que ir a contar al cofre.
- **Late suavemente cuando ya lo podés pagar.** Es la única animación: el cartel pide que lo toques
  solo cuando tocarlo sirve de algo.
- Si todavía no tenés el nivel, sale en gris con "Nivel N · terreno bloqueado". Se muestra igual,
  porque enseñar que el terreno se compra es la mitad del trabajo.

Al tocarlo, confirmación con el coste escrito, y al aceptar se cobra y la granja crece.

**Detalle de rendimiento**: el cartel se engancha al refresco del HUD (que corre varias veces por
segundo) pero lleva una FIRMA — bloque, nivel y cuánto tenés de lo que pide, recortado al tope. Solo
se rehacen los ~40 objetos si cambió algo que se VE.

El botón de la Tienda se queda donde está: sirve de respaldo y no molesta.

### El coste de las expansiones estaba mal, y la primera era la peor

Dirección preguntó si estaba balanceado. Medido contra la producción de HOY, la curva **tenía forma
de U**:

| | 1ª | 4ª | 7ª | 13ª | 16ª |
|---|---|---|---|---|---|
| antes | **6,0 días** | 2,0 | 1,8 | 3,7 | 6,3 |
| ahora | **1,5** | 2,4 | 3,3 | 5,2 | 6,0 |

O sea que **la primera expansión era de las más caras en tiempo real**, justo cuando el jugador
está aprendiendo y tiene 2 árboles y 2 rocas — y las del medio salían casi gratis.

Dos causas, las dos mías: la producción de referencia que usé suponía más granja de la que hay al
nivel 3, y después **las vetas pasaron a dar 2 por picada**, lo que abarató a la mitad todo lo que
se paga en mineral sin que yo volviera a mirar la tabla.

Re-derivados contra la producción real de cada nivel: **1,5 → 6,0 días, subiendo siempre**. Cada
recurso pide los días que le tocan de su propia producción; como se juntan en paralelo (talás y
picás a la vez), el total es esa cifra y ninguno es el cuello de botella.

`tools/auditar-costo-expansiones.js` lo vuelve a medir cuando haga falta — que era justo lo que
faltaba: los costes se derivaron una vez y nada avisaba cuando cambiaba algo debajo.

---

## 18/8 — AUDITORÍA COMPLETA: los exploits

Dirección: *"audita todo"*. Se auditaron los sistemas que nunca se habían medido — combate, armas,
Zona Negra, $Golden, vales, pase, pesca, excavaciones, adornos.

### Antes que nada: dos desbalances que reporté y NO existían

**La cocina no está rota.** Reporté que 8 recetas eran ruinosas comparando ingredientes contra
`r.plata`. **El juego no usa `r.plata`**: con `COOK_PRICE_AUTO = 1`, `dishPrice()` calcula
ingredientes × 1,25. Todo plato vende un 25% por encima de lo que costó, por construcción — está
hecho así para que no se rompa al cambiar los cultivos.

**Los animales tampoco.** Salían en pérdida brutal porque `fibra`, `pelaje`, `cuero` y `colmillo`
**no tienen precio sombra**: valían 0 y la cuenta era basura. No están desanclados, están sin medir.

Dos veces en un día un desbalance inventado por medir con la vara rota. La auditoría ahora comprueba
primero que el número que mira sea el que el juego usa de verdad.

### Los exploits reales, arreglados

**1. El tablón imprimía dinero: ×800.** Y era el sistema que toqué esa misma mañana. Los vales se
emitían por escalón del valor del pedido y se gastaban a precio fijo, y el sobre de semillas
entregaba el cultivo de mayor nivel — cuyo coste escala ×720 de la papa al maíz. Entregabas 3 papas
(6 de plata) y sacabas 3.600 en semillas.
Arreglo: **el vale pasa a valer algo** (`VALE_EN_PLATA = 40`) y las dos puntas usan la misma vara —
se emite `valor/40` y cada premio cuesta lo que entrega. Ningún pedido puede valer menos que un vale
(si el producto es barato se pide una tanda mayor, que además suena mejor). **×800 → ×2**, y ese ×2
es el bonus del primer pedido del día, que es a propósito. El spread interno de la tienda pasa de
×133 a ×2,2.

**2. La pesca no tenía ningún freno.** Sin enfriamiento, sin estamina, sin tope: 39 de plata por
clic con valor esperado 246 y un 3% de legendario que pagaba **15 $Golden = 7.500 de plata**. Once
horas de granja por clic, repetible. Ahora tiene **enfriamiento de 15 minutos** como cualquier nodo,
el común paga lo que dice el ancla para ese tiempo, y **el legendario paga en oro, no en $Golden**:
un pez no puede imprimir moneda premium.

**3. El pase VIP se autofinanciaba al 98%** — costaba 250 $Golden y devolvía 245. Coste neto real:
5 $G. Y **siete de los treinta niveles devolvían más de lo que cuesta comprarlos** (15 $G), así que
comprar niveles daba ganancia. Bajado a 60 $G de devolución (24%, parcial de verdad) y ningún nivel
suelto devuelve más que su precio.

**4. La Runa Dorada era un grifo sin techo**: +1 $Golden por muerte con probabilidad = suma de las
runas equipadas (54% con tres de rareza V) = 270 de plata esperadas por bicho, sin tope. Ahora tiene
**tope diario de 10 $Golden**. Sigue siendo la mejor runa; deja de escalar con las horas.

**5. Vender platos en $Golden: ×3,3.** `goldenP` era un número escrito a mano que no pasaba por
`GOLDEN_EN_PLATA`. Ahora se deriva del mismo valor que la venta en plata, igual que hacen `sellItem`
y `plotUnlockGolden` — los dos sitios que estaban bien.

**6. Las incursiones invertían el diseño.** `INC_RENDIMIENTO = 0.7` promete que jugar a mano rinde
más, pero el arma se gastaba **1 punto por muerte** en la incursión y **1 por golpe** peleando — y un
demonio son 12 golpes. Por punto de estamina el clic rendía 1,7× lo que rendía jugar. Ahora la
incursión gasta los mismos golpes que habría costado pelear: el desgaste en la Guarida pasa de 105 a
945. El 0,7 vuelve a ser lo único que separa las dos cosas.

**La causa común de casi todo lo del $Golden**: cantidades de moneda premium **escritas a mano** en
vez de derivarse. `tools/auditar-golden.js` comprueba ahora que todo grifo tenga techo o derive.

### La escalera de armas estaba invertida

Medido el **costo por punto de daño** (lo que cuesta reparar, dividido por los usos, dividido por el
daño medio) — si esa cifra sube al subir de tier, ese tramo es un impuesto:

| | madera | piedra | bronce | oro | diamante |
|---|---|---|---|---|---|
| antes | 0,45 | 0,26 | **1,56** | **1,55** | 0,50 |
| ahora | 0,45 | 0,51 | 0,52 | 0,52 | 0,50 |

El bronce y el oro salían **seis veces más caros por punto de daño** que la piedra. Consecuencia
concreta: **la Espada de Piedra era el arma óptima en las cuatro zonas**, incluida la Guarida a
nivel 35. Todo el tramo medio de la progresión empobrecía al que subía.

La causa era una sola línea: `ARM_MAT` **mezclaba materia prima con barras**. `barra_bronce` son 3
de bronce y `barra_oro` 3 de oro, mientras madera, piedra y diamante iban en crudo. Reparar saltaba
de 1,5 a 14 por uso mientras el daño subía de 6 a 9.

Arreglo, y de paso una distinción que faltaba: **forjar** un arma nueva pide material elaborado
(barras donde las hay), porque fabricar es fabricar; **reparar** pide materia prima, porque reponer
no es fabricar. Las barras no se quedan sin uso — siguen siendo lo que hace falta para el arma nueva.

`tools/auditar-armas.js` comprueba que ningún tramo sea impuesto (peor caso ×1,3, antes ×6,0), que
reparar use siempre la misma clase de material, y que cada arma pegue más que la anterior.

### Los nueve materiales sin precio, y el Pantano

**Nueve materiales no tenían precio sombra**, y eso no es un hueco de contabilidad: es que **nada
del juego puede valorarlos**. Dos veces en el día me dieron un desbalance inventado —los animales, y
de rebote las armaduras— porque valían 0 y las cuentas salían en pérdida brutal. Un material sin
precio convierte en mentira cualquier medición que lo toque.

Derivados con la regla de siempre, lo que cuesta obtenerlos:

| material | de dónde | precio |
|---|---|---|
| fibra | Alpaca · 12 h · da 2 · come trigo | 300 |
| pelaje | Conejo · 12 h · da 2 · come zanahoria | 122 |
| cuero | Toro · 16 h · da 2 · come trigo | 340 |
| colmillo | Jabalí · 20 h · da 1 · come calabaza | 440 |
| esencia rúnica | 30% de los bichos nv 8+ ≈ 3,3 muertes | 165 |
| esencia oscura | solo nv 10-12 y más rara | 330 |

Con eso los cuatro animales dan **exactamente 20 la hora**, y las armaduras pasan a ser medibles.

### El Pantano daba pérdida

Es la puerta de entrada al combate. Medido con el arma de su propio tier (Espada de Madera):
**4 de los 5 bichos dejaban menos de lo que costaba el desgaste**. La Baba −56 y la Araña −71 por
muerte. El primer contacto del jugador con la Zona Negra destruía valor, sin avisar.

Dos causas, no una:

- **Defensa.** Con def 2 la espada de madera hacía 2 de daño: la Baba pasaba de 9 golpes a 18 y la
  Araña a 23. Un bicho de entrada no puede estar blindado contra el arma de entrada.
- **Botín.** La plata no cubría ni el desgaste, mucho menos los 20/hora.

| | golpes antes | golpes ahora | neto antes | neto ahora |
|---|---|---|---|---|
| Larva | 11 | 6 | −7,4 | **+3,6** |
| Baba | 35 | 9 | −56,0 | **+1,8** |
| Araña | 45 | 12 | −70,8 | **+0,6** |

Los bichos de entrada van sin defensa —el freno es su vida, que se ve— y el botín se derivó para que
cada muerte cubra el arma **más** 20 por hora del tiempo que lleva.

---

## 18/8 — La Zona Negra entera, y la interfaz que entra en pantalla

### El combate estaba mucho peor de lo que decía la auditoría

Arreglar la escalera de armas destapó lo que había debajo. La auditoría había medido la Guarida a
17,7× el ancla, pero **midiendo con el arma óptima** — que era la Espada de Piedra en todas partes,
justo por el fallo de `ARM_MAT`. Al enderezar las armas y volver a medir **con el arma del tramo de
cada bicho**, el resultado fue el contrario:

| bicho | golpes | neto por muerte |
|---|---|---|
| Orco (nv 15) | 60 | −53 |
| Golem (nv 22) | 120 | −383 |
| Hombre Lobo (nv 27) | 130 | −558 |
| Ogro (nv 35) | 190 | −1.072 |
| **Demonio (nv 45)** | **250** | **−1.183** |

Doscientos cincuenta golpes son **ocho minutos de clic** para un solo demonio.

**La causa: la defensa había crecido por encima del daño de cualquier arma del juego.** El Demonio
tenía 24 de defensa y la espada de oro pega 14, así que el daño caía siempre al mínimo de 1. Once de
los diecisiete bichos estaban blindados contra el arma que les toca.

Y tardé dos vueltas en encontrar el resto: **`MOB_DEF_MULT = 1.5` multiplica la defensa DESPUÉS de
la tabla**, así que ninguna medición sobre `MONSTER_DEF` lo veía. Un `def: 4` era en realidad un 6.
Pasa a 1: la defensa ahora se deriva bicho por bicho y un multiplicador global encima la vuelve
indecidible. `MOB_DMG_MULT` se queda — lo que ellos te pegan es otro eje.

**Regla nueva**: la defensa es el 30% del daño del arma de su tramo (0 en los de entrada, donde el
freno es la vida, que se ve en la barra), así que el arma que te toca **siempre sirve**. Los golpes
bajan de 250 a 25 como máximo. Y el botín se derivó para que cada muerte cubra el desgaste del arma
más 20 por hora — recortando la PROBABILIDAD de los drops de mineral donde sobraban, no la cantidad:
así el drop se siente igual cuando cae, solo cae menos seguido.

Resultado: **los 17 bichos dentro de ±2 de plata del ancla**, contra un rango de −1.183 a +294.

*Nota de método*: mi primera auditoría de esto medía plata/HORA y marcaba en rojo a la rata. Era el
criterio: en algo que muere en 6 segundos, redondear la plata a un entero se vuelve 500/h. Se mide
el neto POR MUERTE, que es lo que el jugador ve.

### La interfaz entra en pantallas angostas

Estaba marcado desde el primer día y nunca se hizo. En todo `index.html` había **un solo `@media`**,
y era para un modal. La barra de arriba no envolvía, la hotbar pedía 540 px fijos (10 celdas de 46
más los huecos) y el cartel del capataz no tenía ancho máximo: en un móvil, o con el navegador al
125%, las tres cosas se salían o se pisaban.

Cuatro cortes, sin tocar nada del arte:

- **900 px** — tipografía y celdas un punto más chicas.
- **640 px** — la hotbar se lleva el ancho completo y las celdas se reparten con `flex`, así que las
  diez entran siempre sea cual sea el ancho. El cartel del tutorial baja al pie, donde no tapa.
- **420 px** — el título cede el sitio: los datos importan más que la marca.
- **alto ≤ 560 px** (portátiles al 125%, móvil apaisado) — lo que falta ahí es alto, no ancho.

Y `.hudbar` gana `flex-wrap`, que es lo que le faltaba para no desbordar nunca.

---

## 18/8 — LOS RELOJES: árbol 30 min, roca 40, y todo re-anclado detrás

Dirección puso el dedo en lo que ninguna simulación de la semana medía: *"solo te vas a quedar
haciendo patatas cada dos minutos porque el resto del tiempo no hay más nada"*.

**Medido: en la primera hora de juego, el 100% de las acciones eran plantar papa.** Cero de nodo,
porque el árbol tardaba 90 minutos y la roca 120 y ninguno llegaba a completarse. La relación entre
el reloj más rápido (papa, 3 min) y el más lento era **de 1 a 40**; Stardew y Sunflower se mueven
entre 1:4 y 1:12.

Un hallazgo de camino: **poner más árboles no arregla nada.** Los seis empiezan a la vez y vuelven
a la vez — a los 90 minutos hay seis acciones de golpe y antes, ninguna. Era mi idea de la víspera
y estaba mal.

### El ancla no era el obstáculo

Acortar los relojes la respeta sola: si el árbol tarda un tercio, la madera vale un tercio y sigue
rindiendo 20 la hora. Lo que cambia es el **tamaño de los números**, no la economía.

| | antes | ahora |
|---|---|---|
| árbol | 90 min | **30 min** |
| roca | 120 min | **40 min** |
| madera | 36 | 12 |
| piedra | 46 | 15 |
| hacha / pico | 6 / 6 | 2 / 2 |
| papa : árbol | 1:30 | **1:10** |

**Las vetas de mineral NO se tocan.** De 8 a 24 h es el ritmo diario —lo que se hace una vez al
día—, no el momento a momento, y dividirlas aplastaba la escalera de la minería.

### La cascada, entera

Todo lo que colgaba de los precios viejos se re-derivó, nada a mano: precios sombra · herramientas ·
las cinco recetas de pico · los siete edificios · las dieciséis expansiones · el botín y la defensa
de los diecisiete monstruos · la durabilidad y reparación de las veinte armas.

Dos resultados que salieron solos y que vale la pena anotar:

- **El pico cuesta exactamente lo que vale una veta.** Gastás una para sacar dos. No lo elegí: es
  lo que da el ancla con rendimiento 2.
- **La durabilidad de las armas** pasó a ser la palanca del equilibrio (las armas sí la tienen; las
  herramientas siguen con un uso, que es la norma). Con la madera a 12 y el bronce a 160, reparar
  se comía el margen de las armas de mineral. Derivada: 80 · 100 · 240 · 270 · 300. Y el arma
  óptima pasa a ser **el diamante**, que es lo que uno esperaría.

### El resultado

| | antes | ahora |
|---|---|---|
| acciones en la primera hora | 60 | 66 |
| de ellas, de nodo | **0** | **6** |
| tutorial completo | 19,2 h | **9,6 h** |

### Tres scripts míos tenían los relojes escritos a mano

`auditar-ancla`, `costear-edificios` y `auditar-precio-sombra` llevaban `5400` y `7200` metidos en
el código, así que al cambiar los relojes daban a los siete edificios un 55% por debajo y a los
cinco minerales un −100%. **El fallo era del auditor, no de lo auditado** — y es la tercera vez en
dos días que una vara con números copiados inventa un desbalance. Los tres leen del juego ahora.

Ocho bancos de pruebas y siete auditorías, todo limpio.
