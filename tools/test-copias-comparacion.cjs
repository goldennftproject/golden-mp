'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const workspaceModule=path.join(__dirname,'candidate/game/backup-compare.js');
const modulePath=process.env.GF_COMPARE_ENGINE||(fs.existsSync(workspaceModule)?workspaceModule:path.resolve(__dirname,'../public/game/backup-compare.js'));
const engine=require(modulePath),clone=x=>JSON.parse(JSON.stringify(x));
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',T=1800000000000;
const snapshot=(over={})=>({iniciado:T-86400000,prestige:0,level:4,plata:100,golden:0,skills:{farming:100,tala:40,cooking:30},built:{store:true,horno:true,cocina:false,establo:false},edif2:{},expansiones:1,plotsOwned:4,invRows:5,res:{madera:10,papa:3},dishes:{pure_papa:4},seeds:{papa:12},stats:{plantar:{papa:20}},tools:{axe:50},picks:{dur:{stone:25}},weapons:{espada_madera:{dur:60}},cooking:[],horno:[],tuto:{v:15,done:false,step:18},...over});
const reference=(data=snapshot(),over={})=>({owner:A,data,source:'server',confirmed:true,version:'qa-version',capturedAt:T,...over});
const candidate=(key,data=snapshot(),over={})=>({key,owner:A,data,type:'carga',capturedAt:T-1000,confirmed:false,reset:null,...over});
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const value of Object.values(x))freeze(value);}return x;};
const report={testedAt:new Date().toISOString(),modulePath,scope:'pure synthetic snapshots; no storage, credentials, DB, network or player mutations',checks:[]};
function test(name,fn){fn();report.checks.push({name,passed:true});}
try{
 test('Same owner/start with both reset markers absent can be compared for diagnosis',()=>{
  const result=engine.analyze(candidate('a'),reference());assert.equal(result.compatible,true);assert.equal(result.changed,false);assert.equal(result.score,0);
 });
 test('Another account is not compared or prioritized, and original evidence remains untouched',()=>{
  const rows=[candidate('other',snapshot({skills:{farming:10000}}),{owner:B})],before=JSON.stringify(rows);const result=engine.choose(rows,reference());assert.equal(result.evaluated,1);assert.deepEqual(result.keys,[]);assert.match(result.message,/cuenta o etapa/);assert.equal(JSON.stringify(rows),before);
 });
 test('Reset, account start, prestige and unknown stage are not treated as recoverable progress',()=>{
  for(const [c,r] of [
   [candidate('a',snapshot({reinicio:T-10000})),reference(snapshot({reinicio:T-1000}))],
   [candidate('a',snapshot({iniciado:T-172800000})),reference()],
   [candidate('a',snapshot({prestige:1})),reference()],
   [candidate('a',snapshot({iniciado:undefined})),reference()],
   [candidate('a'),reference(snapshot({reinicio:T-1000}))],
   [candidate('a',snapshot(),{olderReset:true}),reference()],
   [candidate('a',snapshot(),{serverReset:T-1000}),reference()]
  ]){assert.equal(engine.analyze(c,r).compatible,false);assert.deepEqual(engine.choose([c],r).keys,[]);}
 });
 test('Monotonic experience and durable buildings identify review priority without declaring restoration',()=>{
  const old=snapshot();old.skills.farming=170;old.built.establo=true;const c=candidate('progress',old),result=engine.analyze(c,reference());assert(result.progressSignals.some(x=>x.field==='skills.farming'&&x.delta===70));assert(result.progressSignals.some(x=>x.field==='built.establo'));const priority=engine.choose([c],reference());assert(priority.hasMoreProgress);assert.deepEqual(priority.keys,['progress']);assert.match(priority.reasons.progress,/revisar/);assert(!/restaurar|recuperada|perdido/.test(priority.message));
 });
 test('A mixed snapshot is reported as different advances, not a wholesale better save',()=>{
  const old=snapshot();old.skills.farming=90;old.built.establo=true;const result=engine.analyze(candidate('mixed',old),reference());assert.equal(result.progressSignals.length,1);assert(result.progressBehind.some(x=>x.field==='skills.farming'));assert.match(result.summary,/Avances distintos/);
 });
 test('More money alone is never a progress priority',()=>{
  const c=candidate('money',snapshot({plata:999999,golden:200})),result=engine.analyze(c,reference());assert(result.changed);assert(!result.nonMonetaryChanged);assert.equal(result.score,0);assert.deepEqual(result.progressSignals,[]);assert.deepEqual(engine.choose([c],reference()).keys,[]);assert.match(result.summary,/saldo/);
 });
 test('A completed cooking job moving into the bag is not counted as lost food',()=>{
  const old=snapshot({dishes:{pure_papa:4},cooking:[{id:'pure_papa',endAt:T-100,total:240000}]}),current=snapshot({dishes:{pure_papa:5},cooking:[]});const result=engine.analyze(candidate('cook',old),reference(current));assert(!result.inventorySignals.some(x=>x.field==='dishes.pure_papa'&&x.delta>0));assert.equal(engine.choose([candidate('cook',old)],reference(current)).hasMoreProgress,false);
 });
 test('A completed furnace job moving into resources is not counted twice',()=>{
  const old=snapshot({res:{barra_piedra:2},horno:[{id:'barra_piedra',listoAt:T-100,total:480000}]}),current=snapshot({res:{barra_piedra:3},horno:[]});const result=engine.analyze(candidate('furnace',old),reference(current));assert(!result.inventorySignals.some(x=>x.field==='res.barra_piedra'));assert.equal(result.score,0);
 });
 test('Seeds compatible with later planting are review context, not a refund or positive inventory score',()=>{
  const old=snapshot(),current=snapshot({seeds:{papa:8},stats:{plantar:{papa:24}}});const original=clone(old),result=engine.analyze(candidate('seeds',old),reference(current));const delta=result.inventorySignals.find(x=>x.field==='seeds.papa');assert.equal(delta.delta,4);assert.equal(delta.category,'possible-use');assert.equal(result.score,0);assert.deepEqual(old,original);assert.equal(engine.choose([candidate('seeds',old)],reference(current)).hasMoreProgress,false);
 });
 test('Item differences are uncertain review evidence and never an automatic restoration verdict',()=>{
  const old=snapshot({dishes:{pure_papa:8}}),result=engine.analyze(candidate('food',old),reference());assert(result.inventorySignals.some(x=>x.field==='dishes.pure_papa'&&x.delta===4));assert.match(result.summary,/pueden haberse usado/);assert.deepEqual(result.progressSignals,[]);assert.equal(engine.choose([candidate('food',old)],reference()).hasMoreProgress,false);
 });
 test('Normal durability wear is not more permanent progress',()=>{
  const old=snapshot({tools:{axe:80}}),result=engine.analyze(candidate('wear',old),reference());assert(result.inventorySignals.some(x=>x.field==='tools.axe'&&x.category==='durability'));assert.equal(result.score,0);assert.equal(engine.choose([candidate('wear',old)],reference()).hasMoreProgress,false);
 });
 test('Clock/HUD/server-book changes do not create artificial semantic copies',()=>{
  const a=snapshot({visto:T-1000,stam:40,hp:50,energiaGranja:{actual:30,at:T-1000},_saveOp:'first',actividadGranja:{x:1},logrosV2:{v:1}}),b=snapshot({visto:T,stam:50,hp:80,energiaGranja:{actual:40,at:T},_saveOp:'second',actividadGranja:{x:2},logrosV2:{v:2}});assert.equal(engine.signature(a),engine.signature(b));assert.equal(engine.analyze(candidate('clock',a),reference(b)).changed,false);
 });
 test('Actual production deadlines, inventory and building layouts remain part of semantic evidence',()=>{
  for(const key of ['cooking','horno','layout','res','built']){const a=snapshot(),b=snapshot();b[key]=key==='cooking'?[{id:'pure_papa',endAt:T}]:key==='horno'?[{id:'barra_piedra',listoAt:T}]:key==='layout'?{12:{col:1,row:2}}:key==='res'?{madera:11}: {...a.built,cocina:true};assert.notEqual(engine.signature(a),engine.signature(b),key);}
 });
 test('Priority ignores money differences when deduplicating the analytical report only',()=>{
  const a=snapshot({plata:100}),b=snapshot({plata:10000});a.skills.farming=150;b.skills.farming=150;const rows=freeze([candidate('older',a,{capturedAt:T-2000}),candidate('newer',b,{capturedAt:T-1000})]),before=JSON.stringify(rows);const result=engine.choose(rows,reference());assert.deepEqual(result.keys,['newer']);assert.equal(result.evaluated,2);assert.equal(rows.length,2);assert.equal(JSON.stringify(rows),before);
 });
 test('A useful progress snapshot beats a money-rich ancient copy; a distinct conflict supplies context',()=>{
  const advanced=snapshot();advanced.skills.farming=150;const old=snapshot({plata:999999});const conflict=snapshot({skills:{farming:80,tala:30,cooking:20},dishes:{pure_papa:2}});const rows=[candidate('cash',old,{capturedAt:T-100000}),candidate('advanced',advanced,{capturedAt:T-1000}),candidate('conflict',conflict,{type:'conflicto',capturedAt:T-10000})];const result=engine.choose(rows,reference());assert.deepEqual(result.keys,['advanced','conflict']);assert.match(result.reasons.conflict,/conflicto/);assert(!result.keys.includes('cash'));assert.equal(rows.length,3);
 });
 test('Unknown dates do not displace a dated historical context',()=>{
  const a=snapshot({skills:{farming:70}}),b=snapshot({skills:{farming:80}});const result=engine.choose([candidate('unknown',a,{capturedAt:null}),candidate('dated',b,{capturedAt:T-5000})],reference());assert.equal(result.keys[0],'dated');
 });
 test('No more than two priorities are returned without removing any raw evidence',()=>{
  const rows=Array.from({length:7},(_,i)=>{const s=snapshot();s.skills.farming=101+i;return candidate('c'+i,s,{capturedAt:T-i*1000});}),before=JSON.stringify(rows);const result=engine.choose(rows,reference());assert(result.keys.length<=2);assert.equal(result.evaluated,7);assert.equal(rows.length,7);assert.equal(JSON.stringify(rows),before);
 });
 test('Recommendation maps cannot inherit or mutate a prototype from a source key',()=>{
  const d=snapshot();d.skills.farming=150;const result=engine.choose([candidate('__proto__',d)],reference());assert.equal(Object.getPrototypeOf(result.reasons),null);assert.equal(typeof result.reasons.__proto__,'string');assert.equal({}.polluted,undefined);
 });
 test('Malformed, circular, nonfinite and overly deep trees are bounded and do not crash triage',()=>{
  let deep={};for(let i=0;i<45;i++)deep={nested:deep};const circ=snapshot();circ.loop=circ;const badProto=JSON.parse('{"__proto__":{"polluted":true}}');
  for(const d of [null,[],snapshot({x:Infinity}),snapshot({deep}),circ,snapshot({extra:badProto})]){const result=engine.analyze(candidate('bad',d),reference());assert.equal(result.compatible,false);assert.doesNotThrow(()=>engine.choose([candidate('bad',d)],reference()));}
 });
 test('Reference uncertainty does not falsely state that no historical progress exists',()=>{
  const r=reference();delete r.data.iniciado;const result=engine.choose([candidate('a')],r);assert.deepEqual(result.keys,[]);assert.match(result.message,/no se pudo comparar/);assert.equal(engine.choose([],reference()).evaluated,0);
 });
 report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}
if(process.env.GF_TEST_REPORT)fs.writeFileSync(process.env.GF_TEST_REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
