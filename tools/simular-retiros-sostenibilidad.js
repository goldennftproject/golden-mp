'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
async function simulate({name,n=50,days=180,reserve=0,funding='external',objectCost=0,stopIncome=Infinity,withdrawShare=1,interval=30,safe=false,freeWithdraw=false,dailyPlata=5000,reinvestFraction=0}){
 const {reservePlan,proportionalQuote,units}=await import('../public/equipo/solvencia.mjs');
 let cash=units(reserve),external=0,payout=0,gas=0,firstBreach=null,requested=0,backlog=0;const floor=units(20),fee=units(.02),daily=[],incomeEvents=[];
 const people=Array.from({length:n},()=>({silver:0,paid:0,vipUntil:0}));
 function deposit(p,amount,day){const u=units(amount);cash+=u;external+=u;p.paid+=u;}
 function spend(p,amount,day,recurring=true){const u=units(amount);assert.ok(p.paid>=u);p.paid-=u;incomeEvents.push({day,amount:u,recurring});}
 for(const p of people){if(!freeWithdraw){deposit(p,15,0);spend(p,10,0);p.vipUntil=30;}if(objectCost){deposit(p,objectCost,0);spend(p,objectCost,0,false);}}
 for(let day=1;day<=days;day++){
  for(const p of people){
   if(day>1&&(day-1)%30===0&&!freeWithdraw){
    if(funding==='external'&&day<stopIncome){deposit(p,10,day);spend(p,10,day);p.vipUntil=day+29;}
    else if(funding==='earned'&&p.silver>=100000){p.silver-=100000;p.vipUntil=day+29;}
   }
   p.silver+=dailyPlata*(1-reinvestFraction)+(day<=180?objectCost*87:0);
  }
  const liability=people.reduce((s,p)=>s+p.paid,0),eligible=people.filter(p=>(freeWithdraw||p.vipUntil>=day)&&day>=10&&day%interval===0);
  const requests=eligible.map(p=>{const keep=funding==='earned'&&!freeWithdraw?100000:0;return {p,plata:Math.max(0,p.silver-keep)*withdrawShare};}).filter(r=>r.plata>0);
  const pool=requests.reduce((s,r)=>s+r.plata,0);requested+=units(pool/10000);
  if(safe&&pool){
   // Only recurring VIP purchases from real external funds enter the recurring-income input.
   const recurring=funding==='external'?incomeEvents.filter(e=>e.recurring&&e.day>=day-30).reduce((s,e)=>s+e.amount,0)/1e6:0;
   const beforePayout=cash;const plan=reservePlan({reserve:cash/1e6,goldenLiability:liability/1e6,gasBuffer:requests.length*.02,floor:20,windowDays:Math.min(30,interval),recurringNet30:recurring,seedDailyBudget:Math.max(0,reserve-20)/180,verified:true});
   for(const r of requests){const q=proportionalQuote({plan,poolPlata:pool,requestedPlata:r.plata});const paid=units(q.payout);if(!paid)continue;
    cash-=paid+fee;payout+=paid;gas+=fee;
    // Analytical variable-price scenario: only the submitted Plata is consumed, no future USD debt is minted.
    r.p.silver-=r.plata;
   }
   if(beforePayout>=liability+floor)assert.ok(cash>=liability+floor,'funded plan preserves Golden and floor');else assert.equal(cash,beforePayout,'already unfunded case cannot pay');
  }else if(!safe){for(const r of requests){const paid=units(r.plata/10000);cash-=paid+fee;payout+=paid;gas+=fee;r.p.silver-=r.plata;}}
  if(firstBreach===null&&cash<liability+floor)firstBreach=day;
  backlog=people.reduce((s,p)=>s+Math.max(0,p.silver)/10000,0);
  assert.equal(cash,units(reserve)+external-payout-gas,'cash conservation; no fiat from Plata/P2P');
  daily.push({day,cash:cash/1e6,goldenLiability:liability/1e6,headroom:(cash-liability-floor)/1e6,payout:payout/1e6,potentialReferenceValue:backlog});
 }
 return {name,n,days,mode:safe?'variable budget / analytical only':'fixed reference / unprotected counterfactual',reserveAssumed:reserve,funding,objectCost,withdrawShare,interval,firstBreachDay:firstBreach,final:daily.at(-1),externalDeposits:external/1e6,paidUsdtHypothetical:payout/1e6,gasCostHypothetical:gas/1e6,additionalCapitalForFloor:Math.max(0,-Math.min(...daily.map(d=>d.headroom))),daily};
}
if(require.main===module)(async()=>{const initialReserve=Number(process.env.SIM_RESERVE||0);const configs=[];for(const n of [10,50,100])for(const funding of ['external','earned'])configs.push({name:`${n} VIP, renovación ${funding}`,n,funding});
 configs.push(...[0,1000,10000].map(reserve=>({name:'50 VIP, capital hipotético '+reserve,n:50,reserve})),{name:'50 VIP, solicitud conjunta cada 90 días',n:50,interval:90},{name:'50 VIP, solicitudes diarias',n:50,interval:1},{name:'100 Free retirables sin VIP (contrafactual)',n:100,freeWithdraw:true,interval:1},{name:'50 VIP, cae ingreso real después del día 30',n:50,stopIncome:31},{name:'50 VIP, retiran mitad del saldo; resto se conserva',n:50,withdrawShare:.5},{name:'50 VIP, gastan permanentemente mitad de la Plata',n:50,reinvestFraction:.5},{name:'50 VIP con producción neta simulada de 6.208 Plata',n:50,dailyPlata:6208},{name:'10 VIP y objeto de 500',n:10,objectCost:500},{name:'50 VIP, presupuesto respaldado',n:50,safe:true},{name:'100 Free, presupuesto respaldado sin ingresos',n:100,safe:true,freeWithdraw:true,interval:30});
 const results=[];for(const c of configs){const r=await simulate({...c,reserve:c.reserve??initialReserve});results.push(r);console.log(JSON.stringify({scenario:r.name,breach:r.firstBreachDay,finalCash:r.final.cash,shortfall:r.additionalCapitalForFloor,payout:r.paidUsdtHypothetical}));}
 const out=process.argv[2]||require('node:path').join(require('node:os').homedir(),'.golden-farm-audits','retiros-sostenibilidad.json');fs.mkdirSync(require('node:path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({analysisOnly:true,withdrawalsEnabled:false,reserveAssumedNotVerified:initialReserve,gasAssumptionUsdtPerTransfer:.02,notes:'No real deposits, wallets or transfers. Fixed cases may go negative deliberately to expose funding gaps. Variable-budget cases are not a promise of 0.50/day. Paid Golden float is protected; internal earned renewal creates no new USDT.',results},null,2)+'\n');})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={simulate};
