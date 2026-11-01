# Referidos
Cada cuenta existente y nueva tiene un codigo unico permanente, generado en el servidor.
En Configuracion > Invitar amigos se consulta y copia el enlace oficial.
El parametro ref se conserva hasta 30 dias en este navegador y viaja en el alta por correo.
Un trigger de Auth fija el invitador al crear la cuenta: los cambios posteriores de metadatos no lo modifican.
Codigos invalidos no bloquean el registro. Las cuentas existentes no reciben invitador retroactivamente.
El contador propio solo incluye invitados con correo confirmado. No revela correos ni identificadores de los invitados.
Sin recompensas, comisiones, credito Golden ni cambios de economia.
Tabla privada con RLS, sin permisos directos anon/authenticated. RPC my_referral solo para usuario autenticado y deriva la identidad de auth.uid().
Pruebas: test-referidos.js, test-alfa-pausa.js, test-hud-fila-pc.js; transaccion SQL con cuatro cuentas ficticias, revertida con ROLLBACK, verifico codigo, vinculo, correo sin confirmar, codigo invalido, cambio de metadatos sin reatribucion y permisos.
Limitacion: impide autorreferir la misma cuenta; no identifica por si solo a una persona con varias cuentas. No usar estos contadores como elegibilidad de premios sin controles adicionales.
