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
- FIN: (pendiente — se registra al completar todo el contenido de los documentos).

#### Fase 1 COMPLETA — Progresión temprana (2/8, ~19:10)
- **Curva de skills 1-150**: puntos para subir = 100 × Nivel^2,7 (verificada contra la tabla del doc: nivel 10 = 111.525 XP acumulada, nivel 40 = 21.831.905). Base y Exponente editables en el panel de balanceo.
- **Nivel de granja por XP** (front-loaded 10/35/90/220/500/1.100/2.400/5.200/11.000): sube solo cosechando; ya no se paga con recursos. Desbloqueos automáticos con aviso: parcelas 3/4/5/6 GRATIS en niveles 2/4/6/7, Horno a nivel 3, Cocina a nivel 5. El Granero muestra el progreso de XP y el próximo desbloqueo.
- **XP por cosecha proporcional al tiempo** del cultivo (Papa 2 … Brócoli 80), editable por cultivo en el panel.
- **Primera tanda en 45 segundos**: el jugador nuevo cierra el loop plantar→cosechar→vender en el primer minuto; desde la segunda siembra, tiempo real. Veteranos no afectados.
- **Costos early**: Horno 10 madera + 8 piedra · Cocina 20 madera + 15 piedra (los costos altos quedan para versiones mejoradas).
- **Herramientas de arranque**: el jugador nuevo nace con 15 usos de hacha, caña y pico.
- **Crafteo en lote**: botón ×5 en hacha y caña de la Herrería.
- Alcance: progresión temprana front-loaded, curva de skills 1-150, sistema de combate con 4 armas y skill por arma, 20 armas crafteables con buffs, Cocina completa (14 recetas + maestría), bestiario de 15 criaturas + jefe, barra de Combate global, Altar de Runas y Pase de Batalla.

#### Fase 2 COMPLETA — Sistema de combate y armas (2/8, ~19:45)
- **20 armas crafteables**: 4 tipos (Espada, Hacha, Mazo, Arco) × 5 rarezas (Madera, Piedra, Bronce, Oro, Diamante), cada una con daño mín-máx, durabilidad, costo en materiales + plata y enfriamiento de crafteo según el doc maestro.
- **Buff por tipo**: Espada = crítico ×2 (3→18%) · Hacha = perfora % de la defensa (20→70%) · Mazo = aturde y el mob pierde su próximo golpe (8→30%) · Arco = sangrado (1→6 daño/s por 3 s) + ataque a distancia.
- **Fórmula de daño del doc**: Daño = máx(1, tirada(mín-máx) + nivel de skill ÷ 2 − defensa efectiva del mob), cadencia 2 s.
- **Skill por arma**: cada tipo sube su propia skill (Espada, Hacha de combate, Mazo, Arco) con la curva 1-150; matar da la XP del bestiario al arma usada.
- **Mobs con defensa** (stats del doc): Rata 12/0 · Larva 22/1 · Orco 60/4 · Lancero 90/6 · Guerrero 115/8 · Trol 140/10, con XP nueva por kill.
- **Herrería · pestaña Armas renovada**: forjar las 20 armas agrupadas por tipo, equipar y reparar; todo editable en el panel de balanceo (daños, buffs, durabilidades, precios, mobs).
- **Dummy de práctica**: ahora entrena con CUALQUIER arma cuerpo a cuerpo equipada y da XP a la skill de esa arma.
- **Migración de guardados**: espadas/arcos viejos se convierten solos (Esp. Madera → Espada de Madera · Esp. de Hierro → Espada de Bronce · Arco → Arco de Madera) conservando equipado y hotbar.
- Arte pendiente (Fase 5 con los cultivos): sprites por rareza; mientras, cada tipo usa su sprite base.

---

## Pendientes conocidos
- En espera del diseñador: **tabla de daño de las armas** (para los tiers completos de espadas), usos de tablones/barras, cerca premium, tabla de stats del bestiario.
- Cuando el diseñador apruebe el doc de farmeo: implementar Girasol, Trigo y Maíz (arte PixelLab + tabla de cultivos) y el sistema de XP de farmeo por niveles.
- Opcional ofrecido: íconos oficiales PixelLab para Espada de Madera y Pico de Hierro (hoy derivados), replicar el suelo nuevo en plaza y Zona Negra, kick por AFK en la plaza.
- Pilares futuros: login por email multi-dispositivo, PvP/endgame de netherita, referidos, token $Golden, audio, granja distinta por nivel (quinta.docx).
