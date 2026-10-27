-- Sólo después de comprobar guardar y cliente publicados; SELECT y cuotas se conservan.
revoke insert,delete,update on public.market from anon,authenticated;
revoke update(sold_to,sold_at,paid) on public.market from anon,authenticated;
