/* Pure synthetic regression: the current portal, deployed-helper sources and
   original+hotfix SQL must agree on every legitimate carried-item family.
   No network, player data, persistent database or production writes.
   PGLITE_MODULE can point to an existing @electric-sql/pglite installation. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire}from'node:module';
import {fileURLToPath,pathToFileURL}from'node:url';

const require=createRequire(import.meta.url),repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const{PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const{arrancar}=require(path.join(repo,'tools/arrancar-el-juego.contexto.js'));
const{planSharedGraveClaim}=await import(pathToFileURL(path.join(repo,'supabase/functions/calaveras/claim-plan.mjs')));
const{planSharedGraveDeath}=await import(pathToFileURL(path.join(repo,'supabase/functions/calaveras/death-plan.mjs')));
const clone=value=>JSON.parse(JSON.stringify(value));
const knownKinds=['res','seed','fish','dish','arm','armor','armorset','gear','cont','pick','tool','cana'];
const allItems=[
 {kind:'res',k:'carne',n:1},
 {kind:'pick',k:'gold',n:3},
 {kind:'dish',k:'papa_asada',n:2},
 {kind:'tool',k:'axe',n:2},
 {kind:'cana',k:'junco',n:1},
 {kind:'armor',k:'arm_fibra_yelmo',n:1,w:{dur:14}},
 {kind:'seed',k:'papa',n:2},
 {kind:'fish',k:'trucha',n:1,w:1.75},
 {kind:'arm',k:'espada_bronce',n:1,w:{dur:17,mas:2,runas:['fuego']}},
 {kind:'armorset',k:'fibra',n:1,piezas:['pecho'],dur:{pecho:7}},
 {kind:'gear',k:'casco_cuero',n:1},
 {kind:'cont',k:'bag',n:1},
];
const data={hp:0,hpMax:100,zonaViaje:{t:Date.now(),pos:{zona:'pantano',x:100,y:100}},
 cont:{c:'backpack',items:[...clone(allItems),{c:'bag',items:[{kind:'tool',k:'rod',n:1},{kind:'pick',k:'stone',n:2}]}]},
 gear:{},weapons:{},armor:{},armorDur:{},armorOff:{},armorEq:null};
const checks=[],db=new PGlite();
try{
 const{ctx}=arrancar(repo);
 ctx.G.cont={c:'backpack',items:[]};ctx.G.tools={axe:2};ctx.G.picks={owned:{gold:true},dur:{gold:3},eq:'gold'};ctx.G.canas={junco:true};ctx.G.armor={arm_fibra_yelmo:true};
 for(const[kind,k,n]of[['pick','gold',3],['tool','axe',2],['cana','junco',1],['armor','arm_fibra_yelmo',1]]){
  assert.equal(ctx.viajeTengo(kind,k),n);assert.equal(ctx.viajeCargar(kind,k,n),n);
  assert.ok(ctx.G.cont.items.some(e=>e.kind===kind&&e.k===k&&e.n===n));
 }
 assert.equal(ctx.viajeTengo('deco','bogus'),0);checks.push('real portal loads the four previously omitted families');

 const state=fs.readFileSync(path.join(repo,'public/game/state.js'),'utf8');
 const travel=state.slice(state.indexOf('function viajeTengo('),state.indexOf('function viajeSacar('));
 const portalKinds=new Set([...vm.runInContext('Object.keys(MARKET_KINDS)',ctx),...[...travel.matchAll(/kind === "([a-z]+)"/g)].map(m=>m[1]),'gear','armorset']);
 assert.deepEqual([...portalKinds].sort(),knownKinds.slice().sort());checks.push('contract derives from the actual market/travel/equipment family union');

 await db.exec("CREATE ROLE service_role BYPASSRLS;CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.role()RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;GRANT USAGE ON SCHEMA auth,public TO service_role,anon,authenticated;GRANT EXECUTE ON FUNCTION auth.role()TO service_role,anon,authenticated;CREATE TABLE public.farms(user_id uuid PRIMARY KEY REFERENCES auth.users(id),name text,data jsonb,updated_at timestamptz NOT NULL DEFAULT clock_timestamp());GRANT SELECT,INSERT,UPDATE ON public.farms TO service_role;");
 const migrations=path.join(repo,'supabase/migrations');
 await db.exec(fs.readFileSync(path.join(migrations,'20261108215902_calaveras_compartidas.sql'),'utf8'));
 await assert.rejects(()=>db.query("SELECT golden_internal.grave_death_plan($1,'[]','[]')",[JSON.stringify(data)]),/Objeto de botín inválido/);
 checks.push('original immutable SQL migration reproduces the reported carried-item failure');

 const hotfixes=fs.readdirSync(migrations).filter(name=>name.startsWith('20261108233031_')&&name.endsWith('.sql'));
 assert.equal(hotfixes.length,1,'expected exactly one recorded carried-family hotfix migration');
 const hotfixSQL=fs.readFileSync(path.join(migrations,hotfixes[0]),'utf8');
 const sqlKindMatch=hotfixSQL.match(/e->>'kind' not in\(([^)]+)\)/);assert.ok(sqlKindMatch,'hotfix validator family list');
 const sqlKinds=sqlKindMatch[1].split(',').map(kind=>kind.trim().replaceAll("'",''));
 assert.deepEqual(sqlKinds.slice().sort(),[...portalKinds].sort());
 await db.exec(hotfixSQL);checks.push('real hotfix migration covers exactly the legitimate portal family union');

 const before=clone(data),planned=planSharedGraveDeath(data,()=>99);
 const sql=(await db.query("SELECT golden_internal.grave_death_plan($1,'[]','[]')p",[JSON.stringify(data)])).rows[0].p;
 assert.deepEqual(planned.items,sql.items);assert.deepEqual(data,before);assert.deepEqual(sql.items.slice(0,allItems.length),allItems);
 checks.push('current SQL and JS death planners preserve every family and full metadata');

 const receiver={c:'backpack',items:[{kind:'pick',k:'gold',n:4},{kind:'tool',k:'axe',n:7}]};
 const claim=planSharedGraveClaim(receiver,sql.items);
 assert.equal(claim.cont.items.find(e=>e.kind==='pick'&&e.k==='gold').n,7);
 assert.equal(claim.cont.items.find(e=>e.kind==='tool'&&e.k==='axe').n,9);
 assert.equal(receiver.items[0].n,4);assert.equal(claim.remaining.length,0);
 assert.deepEqual(claim.cont.items.find(e=>e.kind==='arm').w,allItems.find(e=>e.kind==='arm').w);
 assert.deepEqual(claim.cont.items.find(e=>e.kind==='armor').w,{dur:14});
 checks.push('current claim keeps exact pick/tool usage units and equipment payloads');

 await db.query('SELECT golden_internal.grave_container_items($1)',[JSON.stringify(claim.cont)]);
 const totals=(await db.query('SELECT golden_internal.grave_totals($1)before,golden_internal.grave_totals($2)after',[JSON.stringify([...receiver.items,...sql.items]),JSON.stringify(claim.cont.items)])).rows[0];
 assert.deepEqual(totals.before,totals.after);checks.push('SQL container validation and exact conservation succeed after pickup');

 for(const kind of['banana','deco','regalo','chest','plano','spare']){
  assert.throws(()=>planSharedGraveClaim({c:'bag',items:[]},[{kind,k:'bogus',n:1}]),/Invalid canonical grave item/);
  assert.throws(()=>planSharedGraveDeath({...data,cont:{c:'bag',items:[{kind,k:'bogus',n:1}]}},()=>99),/Invalid canonical carried item/);
  await assert.rejects(()=>db.query('SELECT golden_internal.grave_items_valid($1)',[JSON.stringify([{kind,k:'bogus',n:1}])]),/Objeto de botín inválido/);
 }
 checks.push('unsupported kinds remain rejected by every current planner');
 for(const leaf of[{kind:'pick',k:'gold',n:-1},{kind:'tool',k:'axe',n:0},{kind:'cana',k:'__proto__',n:1}]){
  await assert.rejects(()=>db.query('SELECT golden_internal.grave_items_valid($1)',[JSON.stringify([leaf])]),/inválid/);
 }
 checks.push('quantity and prototype-key guards remain unchanged');
 for(const role of['anon','authenticated']){
  assert.equal((await db.query('SELECT has_function_privilege($1,$2,\'EXECUTE\')ok',[role,'golden_internal.grave_items_valid(jsonb)'])).rows[0].ok,false);
 }
 checks.push('hotfix preserves private validator function permissions');
 console.log(JSON.stringify({passed:true,checks,knownKinds,syntheticDataOnly:true,productionWrites:0}));
}finally{await db.close();}
