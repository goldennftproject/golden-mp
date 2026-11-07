# Pausar, reactivar y conseguir bronce — 07/11/2026

Dirección autoriza agregar la práctica al tutorial y la ayuda para conseguir bronce, conservar el progreso, probar y publicar.

Tras la primera cosecha, cuando el paso guardado es vender las papas y hay una parcela vacía activa, la guía propone abrir Cobertizo y pausarla. El siguiente gesto es reactivar esa misma parcela. Los controles existentes realizan ambas acciones; la guía sólo navega. Una nota dentro de la gestión explica la pausa y el cupo liberado. Si vuelve a plantar antes de practicar, puede seguir sin pausar un cultivo. Las ventas y demás acciones continúan contando en el recorrido original.

La práctica se conserva en `tuto.pausaPractica`, que ya viaja dentro del objeto de tutorial completo de snapshot/hydrate. No se insertan índices en `TUTO_STEPS`, no se cambia `TUTO_VER=15` y el contrato de incursión sigue en el paso 25. Las cuentas con tutorial terminado no lo reabren. La práctica no concede recompensas ni reinicia pasos, contadores, partidas o tiempos. Una reactivación fallida por falta de cupo no completa la lección.

La expansión ofrece **Conseguir bronce** cuando falta ese material. Abre Cobertizo, la ayuda y el grupo de la fuente actual del nodo, manteniendo los regalos VIP separados de las compras con Plata. La ayuda distingue una veta activa, una pausada y una pendiente de activar. Explica capacidad y terreno por separado, dirige a la gestión manual y coloca primero las parcelas vacías entre las producciones activas. Mantiene las pausadas al inicio.

La información usa las reglas vigentes: Granja 3 para activar la veta; 180 Plata si la fuente actual es compra; primer ciclo según el tiempo efectivo de la cuenta; Minería 3 y Pico de Bronce para picarla. La receta del pico se lee de su definición y no necesita bronce. No cambian precios, capacidad, requisitos, fuente de regalos ni reglas de producción.

Validación con partidas sintéticas: 12 contratos de práctica, 9 de ayuda y 10 de integración con renderer, motor, snapshot e hidratación reales; incluyen acciones fuera de orden, recarga durante pausa, cupo ocupado, fuente VIP, navegación y foco, ausencia de compras/pausas automáticas y tutoriales completados intactos. Regresiones de tutorial, flechas, vales, producción pausada, Cobertizo y VIP. Se comprueba también el recorrido en Chrome con Auth, guardado remoto y multijugador desactivados sólo en el servidor local de prueba.

El arnés antiguo de `test-capacidad-productiva` carga cinco módulos de presentación que requieren APIs DOM que su navegador simulado no ofrece; se verifica idéntico fallo con la base y se prueba el motor de capacidad aislando esos módulos en memoria. `test-tuto-cierre` ya falla en la base por `location` ausente. No se modifica ninguno de esos arneses; las pruebas nuevas ejecutan persistencia y progreso reales en un contexto compatible.

No hay migración, consultas ni escrituras administrativas a Supabase, compensaciones, reinicios, cambios de infraestructura, activación de sistemas pausados o modificaciones del estudio USDT. La renovación visual de edificios sigue apartada. Evidencias y comprobación de publicación en `work/tutorial-bronce-20261107/` del espacio de trabajo de Codex.
