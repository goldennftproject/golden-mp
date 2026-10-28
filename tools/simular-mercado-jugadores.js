'use strict';
const {progression,simulate}=require('./simular-progresion-larga'),assert=require('node:assert/strict'),fs=require('node:fs');
function marketScenario({name,days=60,size=6,buyers=true,shockDay=Infinity,seed=11,concentrated=false}){
 let state=seed,id=0;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),listings=[],daily=[],agents=[];let totalFees=0,gross=0,trades=0,cancels=0,posted=0;
 for(let i=0;i<size;i++){const profile={name:'sim-'+i,visits:4,spacing:4,minutes:20,vip:i%3===0,renew:true,specialty:concentrated?'tree':i%2?'tree':'rock'};const it=progression(profile,{days,seed:seed+i});agents.push({id:i,it,frame:it.next().value,quote:{},quota:0});}
 for(let day=1;day<=days;day++){
  let feesToday=0,tradesToday=0;
  for(const a of agents)a.quota=0;
  // Seller claims are a distinct next-day action. Never treat unsettled proceeds as wallet cash.
  for(const l of listings.filter(l=>l.sold&&!l.claimed&&l.soldDay<day)){const a=agents[l.seller],net=Math.max(1,Math.floor((l.price*(100-l.fee)+50)/100));a.frame.G.plata+=net;a.frame.cash.p2pIn=(a.frame.cash.p2pIn||0)+net;l.claimed=true;const fee=l.price-net;totalFees+=fee;feesToday+=fee;}
  for(const l of listings.filter(l=>!l.sold&&!l.cancelled&&day-l.day>=3)){agents[l.seller].frame.G.res[l.item]+=l.qty;l.cancelled=true;cancels++;const a=agents[l.seller];a.quote[l.item]=(a.quote[l.item]||1)*.85;}
  // Agent choices, not an automatic price-setting rule in the game.
  for(const a of agents){const {G,nextExpansion:e}=a.frame,quota=(a.frame.profile.vip?10:1)+(G.infraestructura?.tienda?1:0);const reserve=e?.costo||{};
   for(const item of ['madera','piedra','bronce','hierro','oro','diamante','netherita']){
    const surplus=Math.floor((G.res[item]||0)-(reserve[item]||0)-4);if(surplus<4||a.quota>=quota)continue;
    const qty=Math.min(20,surplus),wealth=Math.max(1,Math.min(5,agents.reduce((s,x)=>s+x.frame.G.plata,0)/size/10000));
    const unit=Math.max(1,a.frame.priceOf(item)*(a.quote[item]||1)*wealth),price=Math.max(1,Math.round(unit*qty)),fee=(a.frame.profile.vip?7:10)-(G.infraestructura?.mercado?2:0);
    G.res[item]-=qty;listings.push({id:++id,seller:a.id,item,qty,price,fee,day,sold:false,cancelled:false});a.quota++;posted++;
   }
  }
  if(buyers&&day<shockDay)for(const a of [...agents].sort(()=>rand()-.5)){
   const needs=a.frame.nextExpansion?.costo||{},G=a.frame.G;
   for(const item of Object.keys(needs).filter(k=>k!=='plata')){
    if((G.res[item]||0)>=needs[item])continue;
    const offers=listings.filter(l=>!l.sold&&!l.cancelled&&l.seller!==a.id&&l.item===item).sort((x,y)=>x.price/x.qty-y.price/y.qty);
    const l=offers[0];if(!l||l.price>G.plata*.25||rand()<.1)continue;
    // Whole-lot purchase at the published price. Own purchases are excluded by construction.
    assert.notEqual(a.id,l.seller);G.plata-=l.price;a.frame.cash.p2pOut=(a.frame.cash.p2pOut||0)+l.price;G.res[l.item]=(G.res[l.item]||0)+l.qty;l.sold=true;l.buyer=a.id;l.soldDay=day;gross+=l.price;trades++;tradesToday++;
   }
  }
  const unsettled=listings.filter(l=>l.sold&&!l.claimed).reduce((s,l)=>s+l.price,0),wallets=agents.reduce((s,a)=>s+a.frame.G.plata,0);
  const farmNet=agents.reduce((s,a)=>{const c=a.frame.cash;return s+3+c.reward+c.sales+c.objects-c.seeds-c.tools-c.expansions-c.nodes;},0);
  assert.ok(Math.abs(wallets+unsettled+totalFees-farmNet)<1e-6,'P2P money conservation including escrow and fees');
  for(const a of agents){assert.ok(a.frame.G.plata>=0);for(const v of Object.values(a.frame.G.res))assert.ok(v>=0,'no borrowed/imaginary inventory');}
  daily.push({day,trades:tradesToday,grossPlata:gross,burnedPlata:totalFees,usdtFromMarketFees:0,open:listings.filter(l=>!l.sold&&!l.cancelled).length,unsettledPlata:unsettled,accountsPlata:Math.round(wallets)});
  for(const a of agents){const result=a.it.next();if(!result.done)a.frame=result.value;else a.result=result.value;}
 }
 return {name,days,size,seed,posted,trades,grossPlata:gross,feeBurnPlata:totalFees,usdtFromMarketFees:0,cancellations:cancels,sellThrough:posted?trades/posted:0,final:daily.at(-1),daily,accounts:agents.map(a=>({id:a.id,level:a.result.final.level,expansions:a.result.final.expansions,plata:a.result.final.plata}))};
}
if(require.main===module){const scenarios=[{name:'Compradores y vendedores',days:90},{name:'Sin compradores',buyers:false,days:60},{name:'Caída de compradores desde día 31',shockDay:31,days:90},{name:'Todos producen madera',concentrated:true,days:60}];const results=scenarios.map(s=>{const r=marketScenario(s);console.log(JSON.stringify({scenario:r.name,trades:r.trades,sellThrough:r.sellThrough,feesPlata:r.feeBurnPlata,feesUsdt:r.usdtFromMarketFees}));return r;});fs.writeFileSync('docs/balance/mercado-jugadores-20261028.json',JSON.stringify({model:'Real farm agents, finite inventory and money; hypothetical demand/price strategies. Native RPC tests separately validate atomicity. Not a real market forecast.',results},null,2)+'\n');}
module.exports={marketScenario};
