'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),root=path.resolve(__dirname,'..'),dir=path.join(root,'supabase/functions/produccion-premium');
const read=f=>fs.readFileSync(f,'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
const worldCode=stripTypeScriptTypes(read(dir+'/world-contract.ts')).replace(/export const WORLD/,'var WORLD');
const rulesCode=stripTypeScriptTypes(read(dir+'/rules.ts')).replace(/^import .*;\s*$/mg,'').replace(/export /g,'');
const c=vm.createContext({console,Set,Number,Object,Array,String,Error});vm.runInContext(worldCode+'\n'+rulesCode,c);
const world=c.WORLD;
assert.deepEqual(plain(world),plain(require('./build-production-premium-contract').build()),'contrato Edge coincide con config real de las cuatro granjas');
const config=vm.createContext({GF:{},G:{},console:{log(){},warn(){}}});config.window=config;vm.runInContext(read(root+'/public/game/config.js'),config);
for(const v of [1,2,3,4])for(const exp of [0,1,3,16]){
 config.GF.configurarEspacio(v);config.GF.aplicarTerreno(exp);
 for(const i of [86,89,92])for(let col=-5;col<20;col++)for(let row=-5;row<20;row++){
  const o=world.versions[v].objects[i],lp={cx:(col+o.width/2)*42,by:(row+1)*42},d={espacioV:v,expansiones:exp};
  assert.equal(c.premiumPie(d,o,lp),config.GF.pieNodoValido(i,lp,exp),`pie v${v}/e${exp}/${i}/${col},${row}`);
 }
}
const id='11111111-1111-4111-8111-111111111111';
function data(){return {espacioV:3,expansiones:0,level:3,plata:3,golden:10,plotsOwned:3,treesOpen:[0],rocksOpen:[0],layout:{},res:{},produccion:{v:1,vipUnico:1,base:5,vipHasta:0,vipAplicado:false,nodos:{},pausas:{},vale:0,valesV:2,vipNodos:0,orden:[],premium:{v:1,compras:[{id,tipo:'tree',coste:1,desde:1,nodo:null}]}}};}
let d=data();
const find=(g,i=86)=>{const o=c.premiumMundo(g).objects[i];for(let row=1;row<7;row++)for(let col=1;col<7;col++){const lp={cx:(col+o.width/2)*42,by:(row+1)*42};if(c.premiumSitio(g,o,lp))return lp;}throw new Error('Sin lugar en fixture');};
let lp=find(d),det={accion:'colocar',id,...lp};
assert.equal(c.premiumColocacion(d,det).nodo,86);
assert.throws(()=>c.premiumColocacion(d,{...det,cx:0}),/espacio libre/);
assert.throws(()=>c.premiumColocacion(d,{...det,cx:lp.cx+.1}),/espacio libre/);
assert.throws(()=>c.premiumColocacion(d,{...det,cx:84,by:168}),/espacio libre/,'parcelas propias ocupan');
const cell={col:lp.cx/42-1,row:lp.by/42-1};
for(const bucket of ['decos','chests']){const g=structuredClone(d);g[bucket]=[{id:'valla',...cell}];assert.throws(()=>c.premiumColocacion(g,det),/espacio libre/);}
const bronze=data();bronze.level=1;bronze.produccion.premium.compras[0].tipo='bronce';assert.throws(()=>c.premiumColocacion(bronze,det),/desbloqueado/);
assert.equal(c.premiumDetalle({accion:'comprar',tipo:'bronce',precioEsperado:2.5}).tipo,'bronce','se puede comprar antes del nivel de colocación');
assert.throws(()=>c.premiumDetalle({accion:'comprar',tipo:'tree',precioEsperado:'1'}),/inválida/);
assert.deepEqual(plain(c.premiumDetalle({...det,nodo:3,key:'fake',tipo:'rock'})),det,'campos confiados del navegador se descartan');

const guardar=read(root+'/supabase/functions/guardar/index.ts');
const block=guardar.slice(guardar.indexOf('/* === REGLAS ==='),guardar.indexOf('/* === FIN REGLAS ==='));
const g=vm.createContext({console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite});vm.runInContext(block,g);
assert.deepEqual(plain(vm.runInContext('PREMIUM_WORLD',g)),plain(world),'guardar y Edge usan el mismo contrato');
lp=find(d);d.produccion.nodos[86]=true;d.produccion.premium.compras[0].nodo=86;d.layout[86]=lp;
let n=structuredClone(d);let errors=plain(g.protegerEconomia(d,n,Date.now()));assert.deepEqual(errors,[],'5/5 regulares y un premium con cupo propio guardan');
n=structuredClone(d);delete n.produccion.premium;assert.deepEqual(plain(g.protegerEconomia(d,n,Date.now())),[],'guardar viejo conserva libro');assert.deepEqual(n.produccion.premium,d.produccion.premium);
n=structuredClone(d);n.produccion.premium.compras.push({id:'22222222-2222-4222-8222-222222222222',tipo:'rock',nodo:89});n.produccion.nodos[89]=true;assert.ok(g.protegerEconomia(d,n,Date.now()).some(x=>/servidor|derecho/.test(x)));
n=structuredClone(d);n.layout[86]={cx:0,by:0};assert.ok(g.protegerEconomia(d,n,Date.now()).some(x=>/espacio libre/.test(x)));
n=structuredClone(d);n.produccion.nodos[86]=false;assert.ok(g.protegerEconomia(d,n,Date.now()).some(x=>/espacio libre/.test(x)));
const clockNow=1800000000000,clockKey=world.versions[3].objects[86].key,baseMs=1800000;
d.nodos={[clockKey]:{cdIni:clockNow,halfAt:clockNow+baseMs/2,readyAt:clockNow+baseMs}};d.nodoUsos={86:0};d.stats={talar:{_:0}};d.tools={axe:10};
for(const mode of ['all','key']){n=structuredClone(d);if(mode==='all')delete n.nodos;else delete n.nodos[clockKey];assert.deepEqual(plain(g.protegerEconomia(d,n,clockNow)),[]);assert.deepEqual(n.nodos[clockKey],d.nodos[clockKey],'cliente antiguo conserva reloj '+mode);}
for(const change of [{readyAt:0,cdIni:0},{readyAt:clockNow-1,cdIni:clockNow-baseMs},{readyAt:clockNow+baseMs,cdIni:clockNow+1000}]){n=structuredClone(d);Object.assign(n.nodos[clockKey],change);assert.ok(g.protegerEconomia(d,n,clockNow).some(x=>/reloj/.test(x)),'no resetea, adelanta o acelera reloj');}
n=structuredClone(d);n.espacioV=1;n.layout[86]={cx:462,by:420};assert.ok(g.protegerEconomia(d,n,clockNow).some(x=>/superficie/.test(x)),'no amplía el terreno cambiando de versión');
for(const remaining of [1,2,4]){
 const before=structuredClone(d);before.nodos[clockKey]={readyAt:clockNow-(remaining-1)*baseMs,cdIni:clockNow-remaining*baseMs,halfAt:clockNow-baseMs/2};
 n=structuredClone(before);n.nodoUsos[86]++;n.stats.talar._++;n.tools.axe--;n.res.madera=1;
 const ready=remaining===1?clockNow+baseMs:clockNow-(remaining-2)*baseMs;
 n.nodos[clockKey]={readyAt:ready,cdIni:ready-baseMs,halfAt:clockNow+baseMs/2};
 assert.deepEqual(plain(g.protegerEconomia(before,n,clockNow)),[],'cobra una carga y conserva el ciclo '+remaining);
}
const full=structuredClone(d);full.godHand=true;full.nodos[clockKey]={readyAt:clockNow-3*baseMs,cdIni:clockNow-4*baseMs,halfAt:clockNow-3.5*baseMs};
n=structuredClone(full);n.nodoUsos[86]+=4;n.stats.talar._+=4;n.tools.axe-=4;n.res.madera=4;n.nodos[clockKey]={readyAt:clockNow+baseMs,cdIni:clockNow,halfAt:clockNow+baseMs/2};assert.deepEqual(plain(g.protegerEconomia(full,n,clockNow)),[],'God Hand puede vaciar cuatro cargas legítimas');
const paused=structuredClone(d);paused.produccion.pausas['n:86']={at:clockNow-10000,estado:structuredClone(d.nodos[clockKey])};
n=structuredClone(paused);delete n.produccion.pausas['n:86'];for(const k of ['readyAt','cdIni','halfAt'])n.nodos[clockKey][k]+=10000;assert.deepEqual(plain(g.protegerEconomia(paused,n,clockNow)),[],'reanudar desplaza el ciclo sin generar cargas');
n=structuredClone(paused);delete n.produccion.pausas['n:86'];n.nodos[clockKey]={readyAt:0,cdIni:0,halfAt:0};assert.ok(g.protegerEconomia(paused,n,clockNow).some(x=>/reloj/.test(x)),'pausar y reanudar no renace lleno');
const view=plain(g.visitaVista({user_id:'qa',name:'QA',data:d}));assert.deepEqual(view.mapa.premiumNodos,['86']);assert.ok(!JSON.stringify(view).includes(id));assert.ok(!JSON.stringify(view).includes('coste'));

let handle,calls=[],rpcResponses=[],user={id:'qa',email_confirmed_at:'2026-01-01',is_anonymous:false};
const admin={auth:{getUser:async()=>({data:{user}})},rpc:async(name,args)=>{calls.push({name,args});return rpcResponses.shift()||{data:{ok:true,data:{golden:9},updated_at:'2026-11-03T00:00:00Z'}};}};
const edge=stripTypeScriptTypes(read(dir+'/index.ts')).replace(/^import .*;\s*$/mg,'');
const e=vm.createContext({Response,Request,Date,Math,JSON,Number,Object,Array,Set,String,Error,isFinite,createClient:()=>admin,Deno:{env:{get:()=>''},serve:f=>handle=f}});
vm.runInContext(worldCode+'\n'+rulesCode+'\n'+edge,e);
const req=(body={},auth=true,method='POST')=>handle(new Request('https://qa.invalid',{method,headers:auth?{Authorization:'Bearer qa'}:{},...(method==='POST'?{body:JSON.stringify({cuenta:'qa',base:'2026-11-03T00:00:00Z',op:id,produccionPremium:{accion:'comprar',tipo:'tree',precioEsperado:1},...body})}:{})}));
(async()=>{
 assert.equal((await req({},false)).status,401);assert.equal(calls.length,0);
 user={...user,is_anonymous:true};assert.equal((await req()).status,401);user={...user,is_anonymous:false};
 assert.equal((await req({cuenta:'other'})).status,409);assert.equal(calls.length,0);
 assert.equal((await req({op:'bad'})).status,400);assert.equal((await req({},true,'GET')).status,405);
 assert.equal((await req({p_uid:'other',p_colocacion:{nodo:0}})).status,200);
 assert.equal(calls[0].args.p_uid,'qa');assert.equal(calls[0].args.p_colocacion,null);
 rpcResponses=[{error:{code:'P0001',message:'conflicto: otra sesión guardó'}}];assert.equal((await req()).status,409);
 rpcResponses=[{error:{code:'P0001',message:'precio: cambió'}}];assert.equal((await req()).status,412);
 const pending=data();lp=find(pending);rpcResponses=[{data:{ok:true,data:pending,updated_at:'2026-11-03T00:00:00.000+00:00',repetido:false}},{data:{ok:true}}];
 assert.equal((await req({produccionPremium:{accion:'colocar',id,...lp}})).status,200);
 assert.equal(calls.at(-1).args.p_colocacion.nodo,86);
 const before=calls.length;rpcResponses=[{data:{ok:true,data:d,updated_at:'2026-11-03T01:00:00Z',repetido:true}}];assert.equal((await req({produccionPremium:{accion:'colocar',id,...lp}})).status,200);assert.equal(calls.length,before+1,'reintento colocado no invalida la geometría ni cobra');
 console.log('OK servidor premium: contrato95/4versiones,60.000piesparidad,ocupación,nivel al colocar,identidad/cuenta,Edge+SQLboundary,reintentos,mirrorforgery/cupospropios,legacysave y visitas sin datosprivados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
