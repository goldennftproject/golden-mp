# Golden Farm — TO-DO

*Actualizado el 11/08/2026. El detalle histórico vive en los "Pendientes conocidos" del CHANGELOG.md — esta es la vista corta.*

## 🔴 Inmediato

- [ ] **Ojo con los KITS ahora que la guía es opcional (14/8)**: el kit entrega "lo que
  falte" al entrar a cada paso — un jugador astuto podría vaciarse a propósito (vender
  madera antes de llegar al paso de madera) para inflar el kit. Es una vez por paso y
  chico, pero si molesta: topear el kit al costo de receta del paso, o darlo fijo.

- [ ] **Deploy** (`deploy.bat`): atlas `?v=42` — set "mercadillo", árbol + talado, obras, pasto y cerca al tono, y la MECÁNICA DE BLUEPRINTS completa (plano al subir de nivel → colocar → depositar → construir). Listo para subir.
- [ ] **Reorganizar la escalera de objetivos nivel a nivel** (idea aprobada 12/8): ajustar XP y orden de TUTO_STEPS para que cada nivel desbloquee y haga probar su sistema justo a tiempo. `PLANO_NIVEL` ya marca el esqueleto.
- [ ] **Hojas caídas / suelo del talado** como piezas sueltas reutilizables (decisión 12/8: separadas del árbol).
- [x] ~~Set de edificios estilo mercadillo~~ integrado (12/8) — ver CHANGELOG Día 17.
- [x] ~~Mazos + God Hand~~ integrados (11/8).
- [ ] **`GF.TESTEO = 1` → 0** en `config.js` antes de abrir al público.

## 🟡 Esperando al diseñador

- [ ] **Outfit del granjero** (Fixes.docx 14/8 #4): pedir referencia/estilo — ¿outfit fijo nuevo o sistema de outfits como cosmético? Arte por PixelLab cuando se defina.
- [ ] **Alimentar animales** (Fixes.docx 14/8 #1 "Comida>material"): implementado como "preferido +15 / cualquier cultivo +8" — confirmar si era esto o alimentar con PLATOS cocinados.
- [ ] Que pruebe los 19 fixes de fixs.docx (todos implementados, ver CHANGELOG Día 16).
- [ ] Números tuneables por si quiere ajustar: `DROP_CHANCE_MULT` (0.6), `PLOT_MAX` (60), `PLOT_EXTRA_SUBA` (1.12), `GODHAND_PLATA_HORA` (100), `GODHAND_SUBA_HORA` (1.10).
- [ ] **BALANCE con tedio medido por simulación (14/8)** — dos números que ni el CD corto arregla:
  - `ARMAS_UNLOCK_PLATA` = **1000**: incluso con boost y 8 parcelas son ~100 min y 61 ciclos de papa dentro del tutorial. Sugerencia: 150–250, o que cuente plata GANADA acumulada en vez de plata en mano.
  - **Altar: 20 de ORO**: cada oro pide 1 uso de Pico de Oro (35 plata + 5 bronce c/u) y el bronce pide picos de bronce → cadena de ~700+ plata y decenas de crafteos. Sugerencia: bajar a 5-8 de oro o cambiar oro por bronce.
- [ ] Aprobación de los **12 edificios nuevos** (si aprueba → re-animar el portal).
- [ ] Usos de **tablones y barras**, **cerca premium**, tabla definitiva de **stats del bestiario**.
- [ ] "#3 Agregar vallas laterales" — pedir aclaración: ¿vallas de la cerca perimetral o poder comprar más vallas de adorno? (único punto ambiguo de fixs.docx)

## 🟢 Visual abierto (no bloquea nada — decisión del 11/8: queda TODO así, no tocar salvo pedido nuevo)

- [ ] El **Mercado** quedó chico comparado con los edificios nuevos.
- [ ] **Árboles, piedras y parcelas**: siguen siendo el set viejo con el color calmado.
- [ ] **Piedra vs hierro** se parecen — pide siluetas distintas (arte nuevo).
- [ ] **Animaciones de ataque propias por arma** (hoy todos usan el espadazo; el efecto visual ya diferencia).

## ⚪ Opcionales ofrecidos

- [ ] Suelo nuevo y costa en la plaza y la Zona Negra.
- [ ] Kick por AFK en la plaza.
- [ ] Pulido tipo Sunflower Land: cursor de mano, resaltado al pasar.
- [ ] Simulación completa del balance económico de punta a punta.

## 🔵 Pilares futuros

- [ ] **Granjas visitables** (idea aprobada el 11/8, sin fecha): V1 snapshot de la granja en Supabase + "modo visita" de solo lectura desde la plaza y el leaderboard · V2 me-gusta y cortesía diaria (regar) con tope · V3 presencia real con room de Colyseus por granja. Da sentido social a adornos, skins y las 60 parcelas.
- [ ] Login por email multi-dispositivo · PvP/endgame de netherita · referidos · token $Golden · audio · granja distinta por nivel (quinta.docx).

## ✅ Cerrado el 11/8 (fixs.docx, 19 puntos)

Bug F5-parcelas · colocar con clic (parcelas y adornos) · esencia oscura solo nv 10-12 · drops −40% · sin drops de armadura · fuente/farol +40% · Reclamar todo en el pase · armadura visible en Equipo · equipado fuera de la bolsa · menú fijo · estrellas al recoger · alimentar con clic derecho · vallas frenan animales · flecha del tutorial · peces sin buff al pescar · GOD HAND 2.0 (inventario 6×50, ciclo completo, tarifa por hora) · mazos y arte NFT generados.

## ✅ Cerrado el 10/8

Bestiario (11 criaturas) · 8 adornos + 2 del cofre · mascota Pinta · 3 skins · efectos por arma · íconos de espada y pico · parcelas 12→60 · Tienda con bolsa visible · God Hand aclarado.
