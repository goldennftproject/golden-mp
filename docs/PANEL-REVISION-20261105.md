# Revisión de incidencias acreditadas — 5 de noviembre de 2026

La columna Revisión dependía únicamente de la marca administrativa `resolved`. Por ello un pago ya acreditado podía aparecer como Por revisar, aunque el botón de revisión ya lo excluía correctamente.

Dirección aprobó el cambio de etiqueta. `state === 'acreditado'` muestra No requiere revisión; para los demás estados se conservan Revisada o Por revisar según `resolved`. El texto no afirma que una persona haya revisado el caso. Las notas y la condición original del botón Marcar revisada permanecen intactas.

No cambia ninguna consulta, permiso, acceso, operación o contador del panel. No se escribe en registros ni se modifican depósitos, fondos o estados administrativos. La calculadora económica existente y el estudio de sostenibilidad no se alteran.

## Validación

`node tools/test-equipo-ui.js` comprueba acreditado, pendiente y error con las dos marcas de revisión: seis casos. Verifica etiquetas, botones, conservación y escape de notas, datos sin mutar y ausencia de consultas u operaciones adicionales al renderizar. Conserva además las comprobaciones de acceso denegado, paginación y respuesta tardía al cerrar sesión.

La revisión nativa de Chrome usa el renderer y estilos reales con filas ficticias, sin Auth ni conexión a la base de datos. Se verificaron las etiquetas acreditadas, pendiente y revisada; no hay desbordamiento de las celdas observadas. La muestra local no se publica con el juego.
