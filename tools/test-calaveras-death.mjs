import assert from 'node:assert/strict';
import {createRequire}from'node:module';
import {planSharedGraveDeath}from'../supabase/functions/calaveras/death-plan.mjs';
const require=createRequire(import.meta.url);
const {arrancar}=require('./arrancar-el-juego.contexto.js');
const repo=require('node:path').resolve(require('node:url').fileURLToPath(new URL('..',import.meta.url)));
const clone=x=>JSON.parse(JSON.stringify(x));
const fixture=()=>({hp:0,hpMax:140,zonaViaje:{t:1,pos:{zona:'pantano',x:100,y:100}},
 cont:{c:'backpack',items:[{kind:'res',k:'madera',n:5},{kind:'arm',k:'espada_bronce',n:1,w:{dur:17,plus:3,runas:{fuego:2}}},{c:'bag',items:[{kind:'res',k:'plata',n:9}]}]},
 gear:{casco:'casco_cuero',armadura:'pechera_hierro',botas:'botas_cuero',escudo:'escudo_hierro',arma:'espada_madera'},weapons:{espada_madera:{dur:33,plus:2,runas:{hielo:1}}},
 armorEq:'fibra',armor:{arm_fibra_yelmo:true,arm_fibra_pecho:true,arm_fibra_botas:true},armorDur:{arm_fibra_yelmo:0,arm_fibra_pecho:7,arm_fibra_botas:3},armorOff:{arm_fibra_botas:true}});
let cases=0;
for(const rolls of [[0,0,0,0,0,0,0],[99,99,99,99,99,99,99],[9,4,5,0,99,4,0],[10,5,4,99,0,5,4]]){
 const f=fixture(),before=clone(f);let i=0;const plan=planSharedGraveDeath(f,()=>rolls[i++]??99);
 assert.deepEqual(f,before);
 const {ctx}=arrancar(repo);Object.assign(ctx.G,clone(f));ctx.Math=Object.create(Math);let n=0;ctx.Math.random=()=>((rolls[n++]??99)/100);
 const wear=ctx.armorAlMorir();ctx.tumbaCaer('pantano',100,100);
 for(const k of ['gear','weapons','armor','armorDur','armorOff','armorEq'])assert.deepEqual(clone(plan[k]),clone(ctx.G[k]),'parity '+k);
 assert.deepEqual(clone(plan.items),clone(ctx.G.tumba.items));
 assert.deepEqual(plan.summary.armadura,clone(wear));
 assert.equal(plan.cont,null);cases++;
}
const max=fixture();max.cont={c:'backpack',items:Array.from({length:20},()=>({c:'bag',items:Array.from({length:8},(_,i)=>({kind:'res',k:'resource_'+i,n:1}))}))};max.armorDur.arm_fibra_yelmo=20;
assert.equal(planSharedGraveDeath(max,()=>0).items.length,187);
const secureDefault=planSharedGraveDeath(fixture());assert.ok(Array.isArray(secureDefault.breakSlots)&&Array.isArray(secureDefault.dropSlots));
assert.throws(()=>planSharedGraveDeath({...fixture(),hp:1},()=>0),/defeated/);
assert.throws(()=>planSharedGraveDeath({...fixture(),zonaViaje:null},()=>0),/journey/);
assert.throws(()=>planSharedGraveDeath(fixture(),()=>100),/roll/);
assert.throws(()=>planSharedGraveDeath({...fixture(),cont:{c:'__proto__',items:[]}},()=>0),/container/);
console.log(JSON.stringify({passed:true,parityFixtures:cases,maxPiles:187,canonicalInputsUnchanged:true,serverCSPRNGDefault:true,productionEffects:0}));
