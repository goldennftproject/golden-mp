-- Ejecutar con BEGIN / ROLLBACK después del cierre de las escrituras directas.
do $$ begin
 if has_table_privilege('authenticated','public.market','insert') or has_table_privilege('authenticated','public.market','delete') or has_any_column_privilege('authenticated','public.market','update') then raise exception 'Sigue abierta una escritura directa del mercado';end if;
 if not has_table_privilege('authenticated','public.market','select') then raise exception 'Se perdió la lectura del mercado';end if;
 if has_function_privilege('anon','public.p2p_operar(uuid,text,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.p2p_operar(uuid,text,uuid,jsonb)','execute') then raise exception 'RPC privilegiado accesible al cliente';end if;
 if not has_function_privilege('service_role','public.p2p_operar(uuid,text,uuid,jsonb)','execute') then raise exception 'Servidor sin acceso P2P';end if;
 if has_table_privilege('anon','golden_internal.p2p_receipts','select') or has_table_privilege('authenticated','golden_internal.p2p_receipts','insert') then raise exception 'Recibos privados expuestos';end if;
end $$;
