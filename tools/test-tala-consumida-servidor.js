'use strict';
// Real guardar rules and HTTP/CAS harness. No live Supabase, accounts or writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');
const ctx=vm.createContext({console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite});
vm.runInContext(source.slice(source.indexOf('const VERSION'),source.indexOf('/* === FIN REGLAS ===')),ctx);
const contract=vm.runInContext('PREMIUM_WORLD',ctx),now=Date.now(),since=now-10000,clone=structuredClone;
const id='11111111-1111-4111-8111-111111111111';
function base(i=0){
 const o=contract.versions[3].objects[i],d={espacioV:3,expansiones:0,level:3,plata:30,golden:10,plotsOwned:3,treesOpen:[0],rocksOpen:[0],res:{madera:0,piedra:0},tools:{axe:0},skills:{tala:0,crafting:0},stats:{talar:{_:0}},nodoUsos:{[i]:0},
  nodos:{[o.key]:{readyAt:since-1000,cdIni:since-1801000,halfAt:since-901000}},energiaGranja:{v:1,actual:50,at:since},built:{store:true},
  produccion:{v:1,vipUnico:1,base:5,vipHasta:0,vipAplicado:false,nodos:{},pausas:{},vale:0,valesV:2,orden:[]},
  actividadAcciones:{chop:0},actividadGranja:{v:1,energia:0,registro:{chop:0}},logrosAcciones:{madera:0},logrosV2:{v:1,progreso:{madera:0},registro:{madera:0},cobrados:{},ops:[]}};
 if(i>=86){d.produccion.premium={v:1,compras:[{id,tipo:'tree',coste:1,desde:since-100000,nodo:i}]};d.produccion.nodos[i]=true;d.layout={[i]:{cx:84,by:294}};}
 return d;
}
function chop(a,i=0,n=1){const b=clone(a),o=contract.versions[3].objects[i];b.plata-=2*n;b.skills.crafting+=5*n;b.skills.tala+=10*n;b.stats.talar._+=n;b.nodoUsos[i]+=n;b.energiaGranja.actual-=n;b.actividadAcciones.chop+=n;b.logrosAcciones.madera+=n;
 b.nodos=b.nodos||{};b.nodos[o.key]={cdIni:now,readyAt:now+1800000,halfAt:now+900000};b.obraDep={store:{madera:n}};return b;}
function update(a,b,time=now,start=since){const receipt={};ctx.actividadActualizar(a,b,time,receipt,true,start);return receipt;}
function zero(a,b,label,time=now,start=since){assert.equal(update(a,b,time,start).chop,0,label);assert.equal(b.logrosV2.progreso.madera,0,label+' achievements');}
for(const i of [0,86]){
 const a=base(i),b=chop(a,i);assert.equal(a.tools.axe,b.tools.axe);assert.equal(a.res.madera,b.res.madera);
 assert.equal(update(a,b).chop,1,'crafted axe + real chop + spent wood must count, node '+i);
 assert.equal(b.logrosV2.progreso.madera,1);assert.equal(b.actividadGranja.jornada.progreso.chop,1);
 const retry=clone(b);assert.equal(update(b,retry).chop,0);assert.equal(retry.logrosV2.progreso.madera,1,'same accepted state cannot double count');
}
const a=base(),key=contract.versions[3].objects[0].key;
for(const [label,change] of [
 ['mere counters',b=>{b.nodos=clone(a.nodos);}],['no XP',b=>{b.skills.tala=0;}],['no axes/craft',b=>{b.skills.crafting=0;}],['craft without paid cost',b=>{b.plata=a.plata;}],
 ['no energy',b=>{b.energiaGranja.actual=50;}],['nonexistent tree',b=>{b.nodoUsos={999:1};}],['unowned tree',b=>{b.nodoUsos={1:1};}],['clock reset',b=>{b.nodos[key].readyAt=0;}],
 ['impossible fast clock',b=>{b.nodos[key]={cdIni:now,readyAt:now+1000};}],['future ready clock',b=>{a.nodos[key].readyAt=now+100000;}]
]){const fresh=base(),b=chop(fresh);if(label==='future ready clock')fresh.nodos[key].readyAt=now+100000;else change(b);zero(fresh,b,label);}
for(const label of ['sale','deposit','craft only','transfer','animation click']){const fresh=base(),b=clone(fresh);b.actividadAcciones.chop=1;b.logrosAcciones.madera=1;
 if(label==='sale')b.plata+=10;if(label==='deposit')b.golden+=1;if(label==='craft only'){b.plata-=2;b.tools.axe=1;b.skills.crafting=5;}if(label==='transfer')b.res.madera=1;
 zero(fresh,b,label);}
const fakeFive=chop(base(),0,5);zero(base(),fakeFive,'one ready charge cannot support five uses');
for(const n of [1,4]){const virgin=base();delete virgin.nodos;const next=chop(virgin,0,n);assert.equal(update(virgin,next).chop,n,'owned virgin tree supports '+n+' charges');}
const virginFive=base();delete virginFive.nodos;zero(virginFive,chop(virginFive,0,5),'virgin tree cannot support five charges before its first cooldown');
const legacy=base();delete legacy.nodos;legacy.nodoUsos[0]=3;legacy.tools.axe=2;const legacyNext=clone(legacy);legacyNext.nodoUsos[0]++;legacyNext.tools.axe--;legacyNext.stats.talar._++;legacyNext.actividadAcciones.chop++;legacyNext.logrosAcciones.madera++;legacyNext.energiaGranja.actual--;assert.equal(update(legacy,legacyNext).chop,1,'legacy used tree without any clocks keeps the net-tool witness');
const fakeLegacy=chop(legacy);fakeLegacy.tools.axe=legacy.tools.axe;zero(legacy,fakeLegacy,'used tree with no clock cannot receive virgin stock through crafted axe proof');
for(const mode of ['paused','changed world','missing modern clock','malformed old clock']){
 const old=base();old.tools.axe=1;if(mode==='paused')old.produccion.pausas['n:0']={at:since-2000};
 if(mode==='malformed old clock')old.nodos[key]={readyAt:now+100000,cdIni:now+200000};
 const next=chop(old);next.tools.axe=0;next.res.madera=1;if(mode==='changed world')next.espacioV=2;if(mode==='missing modern clock')delete next.nodos;
 zero(old,next,mode+' cannot fall back to a weaker witness');if(mode==='missing modern clock')assert.deepEqual(next.nodos[key],old.nodos[key]);
}
for(const value of [[],null,7,'missing',{}]){
 const old=base(),next=clone(old);next.nodos=value;update(old,next);
 assert.deepEqual(JSON.parse(JSON.stringify(next)).nodos[key],old.nodos[key],'invalid/array/omitted clocks remain objects through JSON serialization');
 const following=chop(JSON.parse(JSON.stringify(next)));following.nodos[key]=clone(old.nodos[key]);following.res.madera=1;
 zero(next,following,'two-save erasure cannot open legacy fallback');
}
const beforeOrder=base();beforeOrder.res.papa=1;beforeOrder.pedidos={dia:'2026-11-03',lista:[{id:'pedido-aceptado',tipo:'res',key:'papa',n:1,plata:6,xp:5,vales:1,hecho:false}]};
const withOrder=chop(beforeOrder);withOrder.pedidos.lista[0].hecho=true;withOrder.res.papa=0;withOrder.plata+=6;
assert.equal(update(beforeOrder,withOrder).chop,1,'accepted unchanged order income can mask the axe crafting cost in the same save');
for(const field of ['dia','id','tipo','key','n','plata','xp','vales']){
 const next=chop(beforeOrder);next.pedidos.lista[0].hecho=true;next.res.papa=0;next.plata+=6;
 if(field==='dia')next.pedidos.dia='2026-11-04';else next.pedidos.lista[0][field]=typeof next.pedidos.lista[0][field]==='number'?999:'changed';
 zero(beforeOrder,next,'changed saved order '+field+' cannot prove paid crafting');
}
const noOrder=base(),invented=chop(noOrder);invented.pedidos=clone(withOrder.pedidos);invented.plata+=6;zero(noOrder,invented,'new client-only order cannot mask unpaid crafting');
const fullFree=base();fullFree.nodos[key]={readyAt:since-5400000,cdIni:since-7200000};
const tooEarly=chop(fullFree,0,5);zero(fullFree,tooEarly,'Free cannot invent fifth charge at 23 minutes',since+23*60000,since);
const noOwned=base();noOwned.tools.axe=1;noOwned.treesOpen=[];noOwned.produccion.nodos={};
const noOwnedNext=chop(noOwned);noOwnedNext.tools.axe=0;noOwnedNext.skills.crafting=0;noOwnedNext.plata=noOwned.plata;noOwnedNext.res.madera=1;
zero(noOwned,noOwnedNext,'no owned tree cannot open legacy fallback');

// HTTP save proof: same operation and competing old bases cannot credit twice.
const file=path.join(__dirname,'test-guardado-atomico.js'),h={require:createRequire(file),__dirname,Response,Request,structuredClone,console};vm.createContext(h);
vm.runInContext(fs.readFileSync(file,'utf8').split('const base=')[0]+';globalThis.factory=servidor',h);
(async()=>{
 const old=base(),next=chop(old),stamp=new Date(since).toISOString(),s=h.factory({user_id:'qa',name:'QA',updated_at:stamp,data:old});
 const body={cuenta:'qa',base:stamp,op:'tala-con-madera-consumida',jornada:1,data:next};
 let response=await s.call(body);assert.equal(response.status,200,await response.clone().text());assert.equal(s.row().data.logrosV2.progreso.madera,1);
 assert.equal((await s.call(body)).status,200);assert.equal(s.writes(),1);
 assert.equal((await s.call({...body,op:'otra-operacion'})).status,409);assert.equal(s.writes(),1);
 console.log('OK tala consumida: regular/premium netaxe0/netwood0, real clock+XP+craft/tool/energy evidence, false actions rejected, legacy fallback and HTTP CAS/idempotent save.');
})().catch(error=>{console.error(error);process.exitCode=1;});
