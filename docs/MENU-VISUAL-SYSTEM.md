# Componentes visuales de menús — 4 de noviembre de 2026

El usuario pide que los interiores respeten el mismo estilo renovado y que las acciones tengan una separación clara. El problema visible de Mejoras provenía de los marcos `badge_wood`/`badge_bg` heredados de `.forge-list`; los encabezados `.secc`/`.eqh` seguían usando el mismo tratamiento antiguo.

`public/game/menu-system.css` define el sistema de contenido de Renovado para PC, después de las hojas de referencia. No modifica el HUD, los renderers, controles, precios, reglas, estado de partida ni almacenamiento.

## Reglas para mantener el estilo

- Una ventana tiene un marco exterior ilustrado. Una lista dentro de esa ventana no añade otra tabla de madera.
- Filas y secciones de configuración usan pergamino claro, tinta marrón y un borde fino. Los títulos de sección se separan mediante una línea, sin repetir la cabecera de la ventana.
- Espaciado compartido: 4, 8, 12 y 16 píxeles. Los grupos de acciones usan al menos 8 píxeles entre controles; se ajustan a otra línea cuando hace falta.
- `.menu-actions` agrupa acciones explícitamente. No se cambia la geometría de todas las `.row` ni se infiere qué elementos son botones.
- Los títulos, párrafos, enlaces y botones de Configuración mantienen una separación de ocho píxeles. Los espacios reservados a estados siguen intactos.
- `.forge-row .fbtns` y `.objeto-acciones` comparten el espaciado. Mejoras y Adornos en el mercado lateral colocan las acciones debajo del texto para que las descripciones no queden estrechas.
- La acción primaria `.green` usa el marco verde incluso ante el selector genérico de madera de `reference-skin.css`. Deshabilitado, peligro, precio Golden, pestañas, cantidad y la compra ilustrada de semillas conservan sus reglas específicas.
- Una fila equipada/propia conserva un estado verde distinto; los colores VIP, Free y prioridades de misiones permanecen diferenciados.
- El contenedor de inventario se unifica. Las celdas conservan imágenes, selección, rareza, estado equipado y sus dimensiones.
- El catálogo de semillas ilustrado, sus controles de cantidad, el botón Cancelar compacto de las ollas y el HUD quedan fuera de estas reglas.
- Las categorías e identificadores del desplegable Menú utilizan los mismos colores; la opción fijada y las misiones destacadas conservan sus estados. El selector de moneda no conserva la antigua textura de pestaña de madera.

Los tokens `--menu-*` viven dentro de `.visual-v2` y de `min-width:900px`. Desactivar Renovado elimina todas estas reglas; móvil y Clásico conservan sus valores anteriores.

## Validación

`tools/test-menu-system.js` carga las hojas reales en su orden y verifica la desaparición de texturas interiores antiguas, secciones, separación, estados semánticos y reversibilidad. JSDOM no dibuja ni mide el layout: la revisión nativa debe comprobar Mejoras, Herrería, Granero, Configuración, Habilidades y bolsas en alturas de portátil, con acciones deshabilitadas y texto largo, hasta el último control.

Revisión nativa completada el 04/11/2026 con los renderers reales y datos ficticios locales: 33 menús a 1360×599 y 1024×700, sin desbordamiento horizontal ni superposición de botones en los estados revisados. Se comprobaron visualmente Mejoras, Herrería, Configuración, Semillas y Ranking; los últimos controles de Mejoras, Configuración y el desplegable del HUD siguieron accesibles al desplazarse. Se comparó la tabla antigua de Mejoras desactivando únicamente esta hoja. No se probaron todas las combinaciones posibles de inventario de los jugadores ni se utilizó ninguna cuenta real. La galería y sus controles QA no forman parte del juego publicado.
