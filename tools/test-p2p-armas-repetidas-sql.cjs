'use strict';
// PostgreSQL local real (PGlite). Ejecuta p2p_operar íntegra, no un RPC simulado.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),sql=fs.readFileSync(path.join(root,'sql/p2p-atomico.sql'),'utf8');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const op=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const seller=uid(1),seller2=uid(2),buyer=uid(3),key='espada_madera',armor='arm_fibra_yelmo';
const old={dur:13,plus:9,sockets:[null,{t:'guardiana',r:5}],extra:{owner:'buyer',nested:[1,2]}};
const first={dur:27,plus:3,sockets:{1:{t:'fuego',r:2}},extra:{identidad:'primera',nested:[{a:true}]}};
const second={dur:61,plus:7,sockets:[{t:'roja',r:4},null,{t:'guardiana',r:1}],extra:{identidad:'segunda'}};
const previous={kind:'arm',item:key,qty:1,payload:{dur:4,plus:1,sockets:{1:'antigua'},extra:{pending:true}}};
const clone=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create schema golden_internal;
   create table auth.users(id uuid primary key);
   create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
   create table public.farms(user_id uuid primary key references auth.users(id),name text,data jsonb not null,updated_at timestamptz not null,mercado_ack jsonb);
   create table public.market(id bigint generated always as identity primary key,seller uuid references auth.users(id),seller_name text,kind text,item text,name text,qty integer,price integer,payload jsonb,sold_to uuid,sold_at timestamptz,paid boolean not null default false,fee_pct numeric default 5);
   select set_config('request.jwt.claim.role','service_role',false);
   insert into auth.users values('${seller}'),('${seller2}'),('${buyer}');`);
  await db.exec(sql);
  const fresh=(w,plata=0)=>({plata,golden:0,weapons:{[key]:w},gear:{arma:key},mkPend:[],armor:{},armorDur:{},armorOff:{}});
  const b=fresh(old,100);b.mkPend=[clone(previous)];b.weaponSpares={'r-previa':{key,w:{dur:5,plus:2,custom:'reserva previa'}}};
  for(const [id,data] of [[seller,fresh(first)],[seller2,fresh(second)],[buyer,b]])await db.query('insert into farms values($1,$2,$3,$4,null)',[id,'QA',JSON.stringify(data),'2026-11-08T00:00:00Z']);
  const row=async id=>(await db.query("select data,to_jsonb(updated_at)#>>'{}' as base from farms where user_id=$1",[id])).rows[0];
  const call=async(id,n,detail,base)=>(await db.query('select public.p2p_operar($1,$2,$3,$4) as r',[id,base,op(n),JSON.stringify(detail)])).rows[0].r;
  const publish=async(id,n,price)=>call(id,n,{accion:'publicar',kind:'arm',item:key,qty:1,price},(await row(id)).base);
  const a=await publish(seller,1,20),c=await publish(seller2,2,30);
  for(const [r,w] of [[a,first],[c,second]]){assert.equal(Object.hasOwn(r.data.weapons,key),false);assert.equal(r.data.gear.arma,null);const listing=(await db.query('select payload from market where id=$1',[r.listing])).rows[0];assert.deepEqual(listing.payload,w);}
  const detail1={accion:'comprar',id:a.listing,price:20},detail2={accion:'comprar',id:c.listing,price:30};
  const buyerBase=(await row(buyer)).base;
  // Contraprueba: el guard anterior efectivamente rechaza tanto arma propia como pendiente.
  const newGuard="if m.kind='armor' and (coalesce(d->'armor','{}')?m.item or exists(select 1 from jsonb_array_elements(pend) p where p->>'kind'='armor' and p->>'item'=m.item))";
  const oldGuard="if m.kind in('arm','armor') and (coalesce(d->case when m.kind='arm' then 'weapons' else 'armor' end,'{}')?m.item or exists(select 1 from jsonb_array_elements(pend) p where p->>'kind'=m.kind and p->>'item'=m.item))";
  assert(sql.includes(newGuard),'encuentra el guard corregido exacto');
  const baselineSql=process.env.P2P_BASELINE_SQL?fs.readFileSync(process.env.P2P_BASELINE_SQL,'utf8'):sql.replace(newGuard,oldGuard);
  await db.exec(baselineSql);
  const functionDef=async()=>(await db.query("select pg_get_functiondef('public.p2p_operar(uuid,text,uuid,jsonb)'::regprocedure) as def")).rows[0].def;
  const beforeDef=await functionDef();assert.equal(beforeDef.split(oldGuard).length,2,'la definición basal contiene el guard antiguo exactamente una vez');
  await assert.rejects(call(buyer,3,detail1,buyerBase),/Ya tenés esa pieza/);
  assert.deepEqual((await row(buyer)).data,b);assert.equal((await db.query('select sold_to from market where id=$1',[a.listing])).rows[0].sold_to,null);
  // Retirar sólo la propia no basta con el guard anterior: la pendiente también lo bloqueaba.
  await db.query("update farms set data=jsonb_set(data,'{weapons}','{}') where user_id=$1",[buyer]);
  await assert.rejects(call(buyer,3,detail1,buyerBase),/Ya tenés esa pieza/);
  await db.query('update farms set data=$1 where user_id=$2',[JSON.stringify(b),buyer]);
  await db.exec(process.env.P2P_MIGRATION_SQL?fs.readFileSync(process.env.P2P_MIGRATION_SQL,'utf8'):sql);
  assert.equal(await functionDef(),beforeDef.replace(oldGuard,newGuard),'la función sólo cambia su guard de duplicados; no se reemplazan otras reglas');
  const bought1=await call(buyer,3,detail1,buyerBase);assert.equal(bought1.data.plata,80);assert.deepEqual(bought1.data.mkPend,[previous,{kind:'arm',item:key,qty:1,payload:first}]);
  const retry1=await call(buyer,3,detail1,buyerBase);assert.equal(retry1.repetido,true);assert.equal(retry1.data.plata,80);assert.equal(retry1.data.mkPend.length,2);
  await assert.rejects(call(buyer,3,detail2,bought1.updated_at),/Recibo P2P usado para otra operación/);
  await assert.rejects(call(buyer,4,detail2,buyerBase),/conflicto:/);
  const bought2=await call(buyer,4,detail2,(await row(buyer)).base);assert.equal(bought2.data.plata,50);assert.equal(bought2.data.mkPend.length,3);assert.deepEqual(bought2.data.mkPend[2],{kind:'arm',item:key,qty:1,payload:second});
  assert.deepEqual(bought2.data.weapons,{[key]:old});assert.deepEqual(bought2.data.gear,b.gear);assert.deepEqual(bought2.data.weaponSpares,b.weaponSpares);
  const retry2=await call(buyer,4,detail2,bought1.updated_at);assert.equal(retry2.repetido,true);assert.equal(retry2.data.plata,50);assert.equal(retry2.data.mkPend.length,3);
  await assert.rejects(call(buyer,5,detail1,(await row(buyer)).base),/La publicación ya no está disponible/);
  assert.equal((await row(buyer)).data.plata,50);
  // Dos vendedores cobran exactamente una vez, con la comisión existente intacta.
  for(const [id,n,listing,expected] of [[seller,6,a.listing,19],[seller2,7,c.listing,29]]){const base=(await row(id)).base,detail={accion:'cobrar',id:listing};const cash=await call(id,n,detail,base);assert.equal(cash.data.plata,expected);assert.equal((await call(id,n,detail,base)).repetido,true);assert.equal((await row(id)).data.plata,expected);await assert.rejects(call(id,n+20,detail,(await row(id)).base),/Esa venta no se puede cobrar/);}
  // Armadura mantiene el bloqueo, por propiedad o entrega previa.
  await db.query("update farms set data=jsonb_set(jsonb_set(data,'{armor}',$1),'{armorDur}',$2) where user_id=$3",[JSON.stringify({[armor]:true}),JSON.stringify({[armor]:41}),seller]);
  const armorListing=await call(seller,8,{accion:'publicar',kind:'armor',item:armor,qty:1,price:5},(await row(seller)).base);
  const armorBuy={accion:'comprar',id:armorListing.listing,price:5};
  for(const pending of [false,true]){const before=(await row(buyer)).data;before.armor=pending?{}:{[armor]:true};if(pending)before.mkPend.push({kind:'armor',item:armor,qty:1,payload:{dur:30}});await db.query('update farms set data=$1 where user_id=$2',[JSON.stringify(before),buyer]);await assert.rejects(call(buyer,pending?10:9,armorBuy,(await row(buyer)).base),/Ya tenés esa pieza/);assert.deepEqual((await row(buyer)).data,before);}
  assert.equal((await db.query('select sold_to from market where id=$1',[armorListing.listing])).rows[0].sold_to,null);
  assert.equal((await db.query('select count(*)::int as n from golden_internal.p2p_receipts where user_id=$1',[buyer])).rows[0].n,2);
  const acl=(await db.query("select has_function_privilege('authenticated','public.p2p_operar(uuid,text,uuid,jsonb)','execute') as authed,has_function_privilege('anon','public.p2p_operar(uuid,text,uuid,jsonb)','execute') as anon,has_function_privilege('service_role','public.p2p_operar(uuid,text,uuid,jsonb)','execute') as service,has_table_privilege('authenticated','golden_internal.p2p_receipts','insert') as receipts")).rows[0];assert.deepEqual(acl,{authed:false,anon:false,service:true,receipts:false});
  console.log('OK SQL real/PGlite: guard anterior reproduce ambos rechazos; dos compras de la misma espada con propiedad y pendiente previas; fichas exactas, arma y reserva antiguas intactas; cobros/recibos/reintentos/CAS sin duplicar; armadura bloqueada y ACL conservadas.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
