'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),candidate=path.join(root,'supabase/functions/guardar/index.ts'),{scenario}=require('./test-tala-guardado-en-vuelo.js');
const source=fs.readFileSync(candidate,'utf8'),ctx=vm.createContext({Date,Math,JSON,Number,Object,Array,Set,String,isFinite});
vm.runInContext(source.slice(source.indexOf('const VERSION'),source.indexOf('/* === FIN REGLAS ===')),ctx);
const T=Date.UTC(2026,10,5,12),D=1800000,key=vm.runInContext('PREMIUM_WORLD.versions[3].objects[0].key',ctx),clone=structuredClone;
function base(){return {espacioV:3,expansiones:0,level:3,plata:30,golden:0,plotsOwned:3,treesOpen:[0],rocksOpen:[0],res:{madera:0},tools:{axe:35},skills:{tala:0,crafting:0},stats:{talar:{_:0}},nodoUsos:{0:5},nodos:{[key]:{readyAt:T,cdIni:T-D}},energiaGranja:{v:1,actual:40,at:T},produccion:{v:1,vipUnico:1,base:5,vipHasta:0,vipAplicado:false,nodos:{},pausas:{},vale:0,valesV:2,orden:[]},actividadAcciones:{chop:0},actividadGranja:{v:1,energia:0,registro:{chop:0}},logrosAcciones:{madera:0},logrosV2:{v:1,progreso:{madera:0},registro:{madera:0},cobrados:{},ops:[]}};}
function next(a,n=1){const b=clone(a);b.nodoUsos[0]+=n;b.stats.talar._+=n;b.skills.tala+=10*n;b.tools.axe-=n;b.res.madera+=n;b.actividadAcciones.chop+=n;b.logrosAcciones.madera+=n;b.energiaGranja={v:1,actual:40-n,at:T+1000};b.nodos[key]={readyAt:T+1000+D,cdIni:T+1000};return b;}
(async()=>{
 process.env.GUARDAR_CANDIDATE=candidate;const matrix=[];
 for(const initialCharges of [1,2,3,4])for(const skew of [0,100,1000,2000])for(const delay of [50,500,1500]){
  const r=await scenario({stage:'server',delay,extra:0,queued:false,spendWood:false,skew,initialCharges,initialEnergy:40});matrix.push(r);
  if(skew-delay<=1000)assert.equal(r.pass,true,'legitimate snapshot within the existing 1s bound: '+JSON.stringify({initialCharges,skew,delay,accepted:r.accepted}));
 }
 const cases=[];
 function rejected(name,a,b,at=T+1000){const receipt={};ctx.actividadActualizar(a,b,at,receipt,true,T);assert.equal(receipt.chop,0,name);assert.equal(b.logrosV2.progreso.madera,0,name+' achievement');cases.push({name,credited:0});}
 // Existing future-clock check remains in place; the final-read window never produces initial charges.
 {const a=base();a.nodos[key]={readyAt:T+1500,cdIni:T+1500-D};rejected('not mature in server time, even within final-read 1s',a,next(a));}
 {const a=base();a.nodos[key]={readyAt:T+D,cdIni:T};rejected('future harvest thirty minutes early',a,next(a));}
 {const a=base();const b=next(a);b.nodos[key]={readyAt:T+1000+30*60000+D,cdIni:T+1000+30*60000};rejected('forged future last action',a,b);}
 {const a=base();a.nodos[key]={readyAt:T-3*D,cdIni:T-4*D};rejected('cannot invent fifth charge from four',a,next(a,5));}
 {const a=base();const b=next(a);b.nodos[key]={readyAt:T+2000,cdIni:T+1000};rejected('cannot shorten thirty-minute clock to one second',a,b);}
 {const a=base();const b=next(a);b.tools.axe=a.tools.axe;rejected('no axe consumed and no paid craft',a,b);}
 {const a=base();const b=next(a);b.skills.tala=a.skills.tala;rejected('no XP evidence',a,b);}
 // Once four charges are accepted, changing request counters or replaying the same clock cannot mint a fifth.
 const four=base();four.nodos[key]={readyAt:T-3*D,cdIni:T-4*D};const paid=next(four,4);
 assert.equal(ctx.protegerEconomia(four,paid,T+1000,T).length,0);const acceptedReceipt={};ctx.actividadActualizar(four,paid,T+1000,acceptedReceipt,true,T);assert.equal(acceptedReceipt.chop,4);
 const replay=clone(paid),repeatReceipt={};ctx.actividadActualizar(paid,replay,T+1001,repeatReceipt,true,T+1000);assert.equal(repeatReceipt.chop,0);assert.equal(replay.logrosV2.progreso.madera,4);
 const fifth=clone(paid);fifth.nodoUsos[0]++;fifth.stats.talar._++;fifth.skills.tala+=10;fifth.tools.axe--;fifth.res.madera++;fifth.actividadAcciones.chop++;fifth.logrosAcciones.madera++;fifth.energiaGranja={v:1,actual:35,at:T+1002};fifth.nodos[key]={cdIni:T+1002,readyAt:T+1002+D};
 const fifthReceipt={};ctx.actividadActualizar(paid,fifth,T+1002,fifthReceipt,true,T+1000);assert.equal(fifthReceipt.chop,0,'a new counter with no elapsed cooldown is not a new charge');assert.equal(fifth.logrosV2.progreso.madera,4);
 cases.push({name:'accepted four-charge state cannot replay or invent a fifth at the same clock',credited:0});
 // A stale zero-energy sample cannot reuse the time AFTER that sample to fund a later otherwise-real chop.
 const stale=clone(paid),later=T+D+1000;stale.nodoUsos[0]++;stale.stats.talar._++;stale.skills.tala+=10;stale.tools.axe--;stale.res.madera++;stale.actividadAcciones.chop++;stale.logrosAcciones.madera++;
 stale.energiaGranja={v:1,actual:0,at:T-4*3600000};stale.nodos[key]={cdIni:later,readyAt:later+D};
 assert.equal(ctx.actividadEvidencias(paid,stale,later,T+1000).chop,1,'the stale-energy fixture genuinely reaches the ready node with tools, XP and counters');
 const staleErrors=ctx.protegerEconomia(paid,stale,later,T+1000),staleReceipt={};
 if(!staleErrors.length){ctx.actividadActualizar(paid,stale,later,staleReceipt,true,T+1000);assert.equal(staleReceipt.chop,0,'the validated sample horizon does not pay for later time');assert.equal(stale.logrosV2.progreso.madera,4);}
 cases.push({name:'stale sample plus a fresh physical chop cannot reuse later regeneration',credited:0,blocked:staleErrors.length>0});
 const residual=matrix.filter(x=>!x.pass).map(({initialCharges,skew,delay,accepted})=>({initialCharges,clientAheadMs:skew,networkMs:delay,accepted}));
 const report={synthetic:true,noRepoOrDBWrites:true,total:matrix.length,passed:matrix.filter(x=>x.pass).length,securityPassed:cases.length,residual,security:cases,matrix};
 console.log(JSON.stringify({total:report.total,passed:report.passed,securityPassed:report.securityPassed,residual:residual.map(({initialCharges,clientAheadMs,networkMs})=>({initialCharges,clientAheadMs,networkMs}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
