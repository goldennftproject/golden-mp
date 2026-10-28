// Pure dry-run arithmetic. No RPC, signing, token transfer, database writes or activation path.
const SCALE=1000000;
export function units(value,name='amount'){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*SCALE)))throw Error('Invalid '+name);
 return Math.round(value*SCALE);
}
export function reservePlan({reserve=0,goldenLiability=0,committed=0,gasBuffer=0,floor=0,windowDays=1,recurringNet30=0,seedDailyBudget=0,verified=false}={}){
 if(!Number.isInteger(windowDays)||windowDays<1||windowDays>30)throw Error('Invalid window');
 const assets=units(reserve),liabilities=units(goldenLiability)+units(committed),protectedAmount=liabilities+units(gasBuffer)+units(floor);
 if(!Number.isSafeInteger(protectedAmount))throw Error('Too large');
 const available=Math.max(0,assets-protectedAmount);
 // Example conservative policy for simulations, not a live exchange-rate configuration.
 const liquidityCap=BigInt(available)*BigInt(Math.min(3000,100*windowDays))/10000n;
 const recurringCap=BigInt(units(recurringNet30))*BigInt(windowDays)/60n+BigInt(units(seedDailyBudget))*BigInt(windowDays);
 const budget=Number(liquidityCap<recurringCap?liquidityCap:recurringCap);
 return {analysisOnly:true,withdrawalsEnabled:false,reserveVerified:verified,covered:assets>=protectedAmount,deficit:Math.max(0,protectedAmount-assets)/SCALE,protectedAmount:protectedAmount/SCALE,available:available/SCALE,budget:budget/SCALE,executable:false};
}
export function proportionalQuote({plan,poolPlata,requestedPlata,referenceRate=10000}={}){
 if(!plan?.analysisOnly||plan.withdrawalsEnabled!==false)throw Error('Dry-run plan required');
 for(const v of [poolPlata,requestedPlata,referenceRate])if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e14)throw Error('Invalid Plata');
 if(referenceRate<=0||requestedPlata>poolPlata)throw Error('Invalid quote');
 const budget=plan.covered?units(plan.budget):0;
 const pool=BigInt(units(poolPlata,'pool Plata')),request=BigInt(units(requestedPlata,'requested Plata')),rate=BigInt(units(referenceRate,'reference rate'));
 const reference=pool*BigInt(SCALE)/rate,allocation=BigInt(budget)<reference?BigInt(budget):reference;
 const payout=pool>0n?Number(request*allocation/pool):0;
 return {analysisOnly:true,executable:false,payout:payout/SCALE,referenceValue:requestedPlata/referenceRate,effectivePlataPerUsdt:allocation>0n&&pool>0n?Math.max(referenceRate,poolPlata/(Number(allocation)/SCALE)):null};
}
