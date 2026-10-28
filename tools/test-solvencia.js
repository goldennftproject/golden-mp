'use strict';
const assert=require('node:assert/strict');
(async()=>{const {reservePlan,proportionalQuote}=await import('../public/equipo/solvencia.mjs');
for(const bad of [-1,NaN,Infinity,'100',null])assert.throws(()=>reservePlan({reserve:bad}));
assert.throws(()=>reservePlan({windowDays:31}));
for(const verified of [false,true]){const p=reservePlan({reserve:100,goldenLiability:70,floor:20,gasBuffer:2,windowDays:30,recurringNet30:100,seedDailyBudget:1,verified});assert.equal(p.withdrawalsEnabled,false);assert.equal(p.executable,false);assert.equal(p.available,8);assert.ok(p.budget<=8);}
assert.equal(reservePlan({reserve:100,goldenLiability:100,floor:20,recurringNet30:100}).budget,0,'deposits backing Golden are not spendable revenue');
const plan=reservePlan({reserve:100,committed:30,goldenLiability:40,floor:20,gasBuffer:2,windowDays:30,recurringNet30:1000});assert.equal(plan.available,8);
const p=reservePlan({reserve:1000,floor:20,windowDays:30,recurringNet30:1000});
for(const count of [1,3,10,100,1000]){const each=5000,poolPlata=count*each;let total=0;for(let i=0;i<count;i++){const q=proportionalQuote({plan:p,poolPlata,requestedPlata:each});assert.equal(q.executable,false);assert.ok(q.payout<=.5);total+=Math.round(q.payout*1e6);}assert.ok(total<=Math.round(p.budget*1e6),'no over-allocation by rounding');}
const unfunded=reservePlan({reserve:0,recurringNet30:0});assert.equal(proportionalQuote({plan:unfunded,poolPlata:5000,requestedPlata:5000}).payout,0);
assert.throws(()=>proportionalQuote({plan:p,poolPlata:1,requestedPlata:2}));
console.log('OK solvencia: no activación, importes válidos, Golden/compromisos/gas protegidos, presupuestos y reparto entero sin sobreasignación.');})().catch(e=>{console.error(e);process.exitCode=1;});
