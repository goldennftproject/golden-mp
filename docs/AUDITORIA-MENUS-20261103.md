# Auditoría de menús después del cambio visual — 03/11/2026

Dirección pide revisar si el cambio visual desordenó los menús y confirmar el arreglo de Discord.

## Correcciones

- Mercado: el input de cantidad heredaba un mínimo de 34 px dentro de una caja de 24–26 px útiles. Se ajusta a su contenedor. El cierre y los signos −/+ usan una línea y tamaño que encajan; se conserva la flecha decorativa de la pestaña activa.
- Cobertizo: «Capacidad productiva» heredaba el marco y relleno de la cabecera principal. Los carteles de madera ahora se aplican sólo al título directo de la ventana; los subtítulos internos usan tinta y espaciado normal.
- Cocina: paneles, recetas, cola y textos se adaptan al pergamino. Selección, receta bloqueada, plato listo y plato en espera siguen diferenciados. Cancelar recupera el tamaño compacto de su botón y deja de recortar texto.
- Preparar el viaje: paneles y texto legibles, con selección verde. Las cinco pistas de la rejilla admiten reducirse y sus contadores quedan dentro de la celda. Desaparece la barra horizontal que cortaba la última columna. No se oculta el desbordamiento ni se cambia la capacidad.
- Tablón: se reserva espacio para las notas giradas y sus bordes. Se elimina una barra horizontal de dos píxeles, conservando la rotación y las acciones de las notas.

Sólo se modifican CSS de Renovado PC, versiones de carga y pruebas. No cambian nodos, eventos, recetas, compras, saldos, capacidad, energía, progreso o guardado. Clásico y las pantallas de menos de 900 px conservan sus estilos anteriores. Los sistemas pausados no se habilitan.

## Comprobación

Se recorren 32 ventanas activas en Chrome, con un juego local aislado y datos sintéticos abundantes, sin Auth ni guardado remoto. Los tamaños son 900×700, 1033×572, 1346×618 y 1672×948. Se mide el encaje de tarjetas y cierres; se revisan rejillas y controles, y se prueban los 32 cierres en pantalla baja. Se examinan además Cocina con platos listos/en curso/en espera y Viaje con bolsa equipada.

La revisión nativa detectó los recortes pequeños que no calcula JSDOM. Tras corregirlos, Viaje tiene 294 px de contenido y 294 px de desplazamiento horizontal; el Tablón, 320/320. No hay barra horizontal en ninguno. Cancelar tiene 42 px útiles y 42 px de contenido, sin recorte. Las tarjetas y cierres permanecen dentro del viewport. La flecha activa de Semillas sobresale deliberadamente y no es un recorte de texto.

Las pruebas de Mercado, menús secundarios, HUD, ilustraciones, Cocina, Equipo y navegación complementan la revisión. Dos expectativas antiguas se actualizan al comportamiento ya aprobado: existen 22 destinos distintos y VIP sin saldo ofrece Recargar Golden. No se modifica ese comportamiento para satisfacer los tests.

La inspección de paneles que requieren servidor cubre su estructura y estados locales disponibles, complementados con sus pruebas de renderer; no se inventan operaciones autenticadas ni se ejecutan compras, entregas o vinculaciones de jugadores.

## Discord

Verificado de nuevo durante esta auditoría: el proceso conocido del bot está activo, con una sola instancia, latidos READY y registro de errores vacío. La invitación permanente existente corresponde a Golden Farm y no caduca. Runtime del bot, comando y política coinciden con el repositorio. Pasan las pruebas de UI y manejo del comando. No se enviaron mensajes ni se vincularon jugadores durante esta comprobación. El bot sigue dependiendo del PC y la sesión de Windows.

## Evidencia local

`C:/Users/pauli/Documents/Codex/2026-09-17/en-mi-escritorio-de-la-pc/work/menu-audit/`

Contiene el servidor/fixture aislados, medidas de 128 combinaciones, revisión de desplazamientos internos, verificaciones finales de Mercado/Tablón/Viaje, resultados de los 32 cierres y capturas. Las animaciones de entrada se desactivan únicamente en el fixture para medir cajas asentadas. La revisión conserva las capturas previas y los resultados de diagnóstico; `targeted-final-checks.json` documenta las mediciones después de los últimos ajustes.
