-- ============================================================
-- Golden Farm · El portero aprende qué es el mercado          (15/9)
-- Pegá TODO esto en Supabase → SQL Editor → Run. Se puede correr dos veces.
--
-- POR QUÉ. El portero del guardado (Edge Function "guardar") tiene un techo de
-- plata por hora: con dos guardados pegados son ~2.084. Un maíz del mercado vale
-- 1.200 y un cuero 1.160, así que cobrar una venta modesta disparaba
-- « plata imposible », el guardado se rechazaba y el juego volvía a la granja
-- anterior CON EL ÍTEM YA ENTREGADO al comprador. Perder progreso por jugar bien
-- es justo lo que prohíbe la ley 1.
--
-- QUÉ HACE ESTO. Dos cosas, y las dos hacen falta:
--   1) `farms.mercado_ack` — el cuaderno donde el portero anota qué movimientos del
--      mercado ya contó, para no contar el mismo dos veces.
--   2) Cierra el mercado con llave: hoy el vendedor puede editar SU PROPIA fila
--      (la política de UPDATE lo deja) y eso, con el portero leyendo el precio,
--      sería imprimir plata. Después de esto el cliente solo puede tocar tres
--      columnas —sold_to, sold_at, paid— y nadie puede vender-se a sí mismo.
-- ============================================================

-- 1 · EL CUADERNO DEL PORTERO ---------------------------------------------
alter table public.farms add column if not exists mercado_ack jsonb;

-- 2 · EL PRECIO NO SE TOCA ------------------------------------------------
-- Ni el precio, ni la cantidad, ni el ítem: lo único que un jugador cambia de una
-- publicación es reservarla (comprar) o marcarla cobrada.
revoke update on public.market from authenticated;
grant  update (sold_to, sold_at, paid) on public.market to authenticated;

-- 3 · COMPRAR Y COBRAR, CADA UNO CON SU PUERTA ----------------------------
drop policy if exists market_update on public.market;   -- la vieja hacía las dos cosas

-- comprar: una publicación libre que NO sea tuya, y queda reservada a tu nombre
drop policy if exists market_comprar on public.market;
create policy market_comprar on public.market
  for update to authenticated
  using  (sold_to is null and seller <> auth.uid())
  with check (sold_to = auth.uid() and paid = false);

-- cobrar: una venta tuya que YA compró alguien y que todavía no cobraste
drop policy if exists market_cobrar on public.market;
create policy market_cobrar on public.market
  for update to authenticated
  using  (seller = auth.uid() and sold_to is not null and paid = false)
  with check (seller = auth.uid() and paid = true);

-- Con estas dos, el vendedor NO puede marcar como vendida una fila suya (la primera
-- lo excluye, la segunda exige que ya esté vendida), así que no hay auto-venta.

-- 4 · COMPROBACIÓN (opcional, para ver que quedó) -------------------------
-- select column_name from information_schema.columns
--   where table_name = 'farms' and column_name = 'mercado_ack';
-- select policyname from pg_policies where tablename = 'market' order by policyname;
