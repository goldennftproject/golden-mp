'use strict';
// Event-driven economy adapter. Real tables/functions; no Phaser navigation or combat simulation.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');
const server={};vm.createContext(server);vm.runInContext(source.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS ===')[0].replace(/^[\s\S]*?const VERSION/,'const VERSION'),server);
const confirm=vm.runInContext('actividadActualizar',server);
const demand={calabaza:25,brocoli:30,girasol:15,trigo:20,maiz:20};
function* progression(profile,{days=120,seed=11,pressure=1,noReward=false}={}){
 const c=require('./arrancar-el-juego.contexto').arrancar(root).ctx,clock={now:Date.UTC(2026,9,28)};
 c.Date=class extends Date{constructor(...a){super(...(a.length?a:[clock.now]));}static now(){return clock.now;}};
 const run=s=>vm.runInContext(s,c),G=run('G');
 run("estadoDeCero();for(const k of ['refreshHud','refreshForge','refreshBarn','refreshInv','refreshHotbar','syncSlots','saveFarm','log','toast','celebrate','passEvent','tutoEvent','oficiosSync'])globalThis[k]=()=>{};isOpen=()=>false;G.tuto={v:99,step:99};kitReclamar();");
 const T=run('({CROP_DEF,ORE_DEF,PICK_DEF,INFRA_GRANJA,XP_PLANTAR,CD,NODO_CARGAS_MAX,PLOT_MAX})');
 G.plots=Array.from({length:3},()=>({state:'dry'}));G.plotsOwned=3;G.energiaGranja={v:1,actual:50,at:clock.now};
 c.mercadoGlobalRecurso=k=>({...G.mercadoVentas?.[k],factor:1,demanda:demand[k]||100,piso:.5});
 const paid={golden:0};if(profile.object)paid.golden+=10;if(profile.vip){G.produccion.vipHasta=clock.now+30*86400000;paid.golden+=10;}
 let rng=seed;const rnd=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 const nodes=[{kind:'tree',readyAt:0,cdIni:0},{kind:'rock',readyAt:0,cdIni:0}],daily=[],milestones=[],salesUsed={},cash={reward:0,sales:0,seeds:0,tools:0,expansions:0,nodes:0,objects:0};
 let withheld=0,bagBlocks=0,seedBlocks=0,lastDay=-1,harvests=0,actions=0,toolBlocks=0;
 const record=()=>JSON.parse(JSON.stringify({plata:G.plata,energiaGranja:G.energiaGranja,produccion:G.produccion,plots:G.plots,seeds:G.seeds,stats:G.stats,skills:G.skills,tools:G.tools,picks:G.picks,res:G.res,actividadGranja:G.actividadGranja,actividadAcciones:G.actividadAcciones,logrosV2:G.logrosV2,logrosAcciones:G.logrosAcciones}));
 function productive(type,fn,previous){if(!c.energiaGranjaPuede(type))return false;const prev=previous||record();if(!fn())return false;const next=record();confirm(prev,next,clock.now,undefined,!noReward);const add=next.plata-G.plata;G.plata=next.plata;G.actividadGranja=next.actividadGranja;G.actividadAcciones=next.actividadAcciones;G.logrosV2=next.logrosV2;cash.reward+=add;actions++;return true;}
 function sell(){for(const k of Object.keys(T.CROP_DEF)){const n=G.res[k]||0;if(!n)continue;const quota=Math.max((demand[k]||100)*4,Math.ceil((demand[k]||100)*4*c.produccionCapacidad()/5));const q=Math.min(n,Math.max(0,quota-(salesUsed[k]||0)));if(!q){withheld+=n;continue;}const d=c.cotizarVenta(k,q,clock.now);G.res[k]-=q;G.plata+=d.total;cash.sales+=d.total;c.registrarVenta(k,q,d);if(pressure>1)G.mercadoVentas[k].volumen+=(pressure-1)*q;salesUsed[k]=(salesUsed[k]||0)+q;}}
 function pay(recipe){if(!c.canAfford(recipe))return false;c.payCost(recipe);return true;}
 function finishExpansion(){if(!G.expObra||G.expObra.hasta>clock.now)return;G.expansiones++;G.produccion.vale++;G.expObra=null;milestones.push({day:Math.floor((clock.now-Date.UTC(2026,9,28))/86400000)+1,level:G.level,expansions:G.expansiones});}
 function plan(){finishExpansion();const e=c.expansionSiguiente();const infra=T.INFRA_GRANJA[G.infraestructura?.granja||0];
  const desired={...(e?.costo||{})};delete desired.plata;
  // Upgrade after next expansion is funded; optional XP improvement uses its actual recipe.
  if(infra&&G.level>=infra.nivel)for(const [k,n]of Object.entries(infra.coste))desired[k]=(desired[k]||0)+n;
  return {e,infra,desired};}
 function invest(){const {e,infra}=plan();if(e&&!G.expObra&&G.level>=e.nivel&&c.canAfford(e.costo)){const old=G.plata;pay(e.costo);cash.expansions+=old-G.plata;G.expObra={i:e.i,n:e.n,desde:clock.now,hasta:clock.now+c.expansionObraMin(e.n)*60000};}
  if(infra&&G.level>=infra.nivel&&c.canAfford(infra.coste)){pay(infra.coste);G.infraestructura={...(G.infraestructura||{}),granja:(G.infraestructura?.granja||0)+1};}
  const cap=c.produccionCapacidad();
  while(G.plots.length+nodes.filter(n=>!n.pausedAt).length>cap){const pause=[...nodes].reverse().find(n=>!n.pausedAt);if(!pause)break;pause.pausedAt=clock.now;}
  const goals=plan().desired;
  // After VIP expiry, deliberately resume a needed paused node by pausing a stocked one.
  // This is a simulated player choice using the existing pause rules, not automatic game behaviour.
  if(profile.vip&&!c.vipVigente())for(const sleeping of nodes.filter(n=>n.pausedAt)){
   const key=n=>n.kind==='tree'?'madera':n.kind==='rock'?'piedra':n.kind;
   if((goals[key(sleeping)]||0)<=(G.res[key(sleeping)]||0))continue;
   const donor=nodes.find(n=>!n.pausedAt&&(G.res[key(n)]||0)>=(goals[key(n)]||0)+(['tree','rock'].includes(n.kind)?24:4));
   if(!donor)continue;donor.pausedAt=clock.now;const delta=clock.now-sleeping.pausedAt;
   if(sleeping.readyAt)sleeping.readyAt+=delta;if(sleeping.cdIni)sleeping.cdIni+=delta;delete sleeping.pausedAt;
  }
  let kind=Object.keys(T.ORE_DEF).find(k=>k!=='piedra'&&(goals[k]||0)>0&&!nodes.some(n=>n.kind===k)&&G.level>=({bronce:3,hierro:6,oro:9,diamante:13,netherita:17}[k]));
  let used=G.plots.length+nodes.filter(n=>!n.pausedAt).length;
  if(kind&&used>=cap){const candidates=nodes.filter(n=>!n.pausedAt&&['tree','rock'].includes(n.kind)&&nodes.filter(o=>!o.pausedAt&&o.kind===n.kind).length>1);const pause=candidates[0];if(pause){pause.pausedAt=clock.now;used--;}}
  if(used>=cap)return;
  if(!kind){if(G.plots.length<Math.min(8,3+Math.floor(G.expansiones/3))&&used+1<=cap)kind='plot';else kind=['tree','rock'].includes(profile.specialty)?profile.specialty:nodes.filter(n=>n.kind==='tree').length<=nodes.filter(n=>n.kind==='rock').length?'tree':'rock';}
  const price={plot:20,tree:30,rock:30,bronce:180,hierro:300,oro:500,diamante:900,netherita:1400}[kind],free=G.produccion.vale>0&&['plot','tree','rock'].includes(kind);
  if(!free&&G.plata<price)return;if(free)G.produccion.vale--;else {G.plata-=price;cash.nodes+=price;}
  if(kind==='plot'){G.plots.push({state:'dry'});G.plotsOwned++;}else{const cd=(kind==='tree'?T.CD.tree:kind==='rock'?T.CD.rock:T.ORE_DEF[kind].cd)*1000*c.vipTiempoMult();nodes.push({kind,readyAt:clock.now+cd,cdIni:clock.now});}
 }
 function cropChoice(remaining,nextVisit){const need=c.tareasDelNivel(G.level+1).find(t=>t[0]==='plantar'&&c.tareaProgreso(t)<t[2]&&c.cropUnlocked(t[1]));if(need)return need[1];
  const unlocked=Object.keys(T.CROP_DEF).filter(k=>c.cropUnlocked(k)&&G.plata>=T.CROP_DEF[k].seedCost);
  if(!unlocked.length)return 'papa';
  // Session crop maximises verified work per real minute; absence crop fits next visit.
  const target=remaining>=5*60000?Math.min(remaining,15*60000):nextVisit-clock.now;
  return unlocked.filter(k=>c.cultivoDuracion(k,1,false)<=target).sort((a,b)=>remaining>=5*60000?T.CROP_DEF[a].grow-T.CROP_DEF[b].grow:T.CROP_DEF[b].grow-T.CROP_DEF[a].grow)[0]||'papa';}
 function actCrops(end,nextVisit){for(const p of G.plots){if(p.state==='growing'&&p.readyAt<=clock.now){const k=p.cropKey;if(!c.roomForRes(k,1)){bagBlocks++;continue;}productive('harvest',()=>{if(!c.energiaGranjaAgregar(k,1,'harvest'))return false;p.state='dry';p.readyAt=0;p.cropKey=null;c.addXp('farming',T.CROP_DEF[k].xp);c.statAdd('cosechar',k,1);harvests++;return true;});}
   if(p.state==='dry'&&c.energiaGranjaPuede('plant')){const k=cropChoice(end-clock.now,nextVisit),crop=T.CROP_DEF[k];if(!(G.seeds[k]>0)){const b=c.seedBuysToday();if(b.count>=c.seedDailyMax()){seedBlocks++;continue;}if(G.plata<crop.seedCost)continue;G.plata-=crop.seedCost;cash.seeds+=crop.seedCost;G.seeds[k]=(G.seeds[k]||0)+1;b.count++;}
    productive('plant',()=>{if(!c.energiaGranjaPagar('plant'))return false;G.seeds[k]--;p.state='growing';p.cropKey=k;p.readyAt=clock.now+c.cultivoDuracion(k,1,false);c.addXp('farming',T.XP_PLANTAR);c.statAdd('plantar',k,1);return true;});}
  }}
 function actNodes(){const goal=plan().desired;
  for(const n of nodes.filter(n=>!n.pausedAt).sort((a,b)=>(goal[b.kind==='tree'?'madera':b.kind==='rock'?'piedra':b.kind]||0)-(goal[a.kind==='tree'?'madera':a.kind==='rock'?'piedra':a.kind]||0))){if(n.readyAt>clock.now)continue;const k=n.kind==='tree'?'madera':n.kind==='rock'?'piedra':n.kind;if(k!=='madera'&&!c.oreUnlocked(k))continue;
   const cd=(n.kind==='tree'?T.CD.tree:n.kind==='rock'?T.CD.rock:T.ORE_DEF[k].cd)*c.vipTiempoMult();const charges=['tree','rock'].includes(n.kind)?c.nodoCargas(n,cd):1;
   for(let charge=0;charge<charges;charge++){
    const taskNeed=c.tareasDelNivel(G.level+1).filter(t=>t[0]==='minar'&&t[1]===k).reduce((s,t)=>s+Math.max(0,t[2]-c.tareaProgreso(t)),0);
    const reserve=k==='madera'||k==='piedra'?24:4;
    if((G.res[k]||0)>=(goal[k]||0)+reserve+taskNeed)break;
    if(!c.energiaGranjaPuede(k==='madera'?'chop':'mine'))break;if(!c.roomForRes(k,1)){bagBlocks++;break;}
    const previous=record();
    const pick=k==='madera'?null:Object.keys(T.PICK_DEF).find(id=>id!=='wood'&&T.PICK_DEF[id].mineTier===(T.ORE_DEF[k]?.tier||0));
    if(k==='madera'&&!c.toolCount('axe')){const old=G.plata;c.craftTool('axe');cash.tools+=old-G.plata;}
    if(pick&&!c.pickCount(pick)){const old=G.plata;c.craftPick(pick);cash.tools+=old-G.plata;}
    if(k==='madera'?!c.toolCount('axe'):!c.pickCount(pick)){toolBlocks++;break;}
    if(!productive(k==='madera'?'chop':'mine',()=>{if(!c.energiaGranjaAgregar(k,1,k==='madera'?'chop':'mine'))return false;if(k==='madera'){G.tools.axe--;c.addXp('tala',c.xpDeNodo('tree'));c.statAdd('talar',null,1);}else{G.picks.dur[pick]--;c.addXp('mining',c.xpDeNodo(n.kind==='rock'?'rock':'ore',k));c.statAdd('minar',k,1);}return true;},previous))break;
    if(charge===charges-1){n.cdIni=clock.now;n.readyAt=clock.now+cd*1000;}else c.nodoGastarCarga(n,cd);
   }
  }
 }
 const start=clock.now,visits=profile.visits;
 for(let day=0;day<days;day++){
  for(const k of Object.keys(salesUsed))delete salesUsed[k];const before=JSON.parse(JSON.stringify(cash));
  if(profile.renew&&day>0&&day%30===0){G.produccion.vipHasta=start+(day+30)*86400000;paid.golden+=10;}
  // On expiry select a legal active layout, pausing surplus nodes/plots in this adapter.
  for(let visit=0;visit<visits;visit++){
   const at=start+day*86400000+visit*(profile.spacing||Math.floor(20/(visits-1||1)))*3600000;if(profile.miss&&rnd()<profile.miss)continue;
   const end=at+profile.minutes*60000,next=visit+1<visits?start+day*86400000+(visit+1)*(profile.spacing||Math.floor(20/(visits-1||1)))*3600000:start+(day+1)*86400000;
   if(profile.object&&day>0&&visit===0){clock.now=at;if(c.energiaGranjaPuede('harvest')){c.energiaGranjaPagar('harvest');const amount=c.artefactoDiario('cobre');G.plata+=amount;cash.objects+=amount;}}
   for(clock.now=at;clock.now<end;clock.now+=30000){finishExpansion();sell();invest();actNodes();actCrops(end,next);sell();assert.ok(G.plata>=-1e-8);assert.ok(c.energiaGranjaTick()>=-1e-8);}
  }
  yield {day:day+1,G,cash,profile,capacity:c.produccionCapacidad(),nextExpansion:c.expansionSiguiente(),priceOf:c.priceOf};
  const expected=3+(cash.p2pIn||0)-(cash.p2pOut||0)+cash.reward+cash.sales+cash.objects-cash.seeds-cash.tools-cash.expansions-cash.nodes;assert.ok(Math.abs(expected-G.plata)<1e-6,'cash conservation');assert.ok(cash.reward-before.reward<=5000,'daily cap');assert.ok(G.plots.length+nodes.filter(n=>!n.pausedAt).length<=c.produccionCapacidad(),'capacity');for(const amount of Object.values(G.res))assert.ok(amount>=0,'resource nonnegative');
  const delta={};for(const k of Object.keys(cash))delta[k]=Math.round((cash[k]-(before[k]||0))*100)/100;
  daily.push({day:day+1,level:G.level,expansions:G.expansiones||0,plata:Math.round(G.plata),xp:Math.round(c.farmXpProductiva()),infra:G.infraestructura?.granja||0,capacity:c.produccionCapacidad(),plots:G.plots.length,nodes:nodes.filter(n=>!n.pausedAt).length,pausedNodes:nodes.filter(n=>n.pausedAt).length,cashFlow:delta});
 }
 return {profile:profile.name,seed,days,pressure,noReward,goldenSpent:paid.golden,final:daily.at(-1),cash,harvests,actions,bagBlocks,toolBlocks,seedBlocks,resources:JSON.parse(JSON.stringify(G.res)),nodeLayout:nodes.map(n=>({kind:n.kind,paused:!!n.pausedAt})),skills:JSON.parse(JSON.stringify(G.skills)),unmetTasks:c.tareasDelNivel(G.level+1).filter(t=>c.tareaProgreso(t)<t[2]),milestones,daily};
}
function simulate(profile,options){const it=progression(profile,options);let step;do{step=it.next();}while(!step.done);return step.value;}
if(require.main===module){const out=process.argv[2]||'docs/balance/progresion-larga-20261028.json',days=+(process.env.SIM_DAYS||120);const profiles=[{name:'Free casual',visits:2,minutes:10},{name:'Free regular',visits:4,spacing:4,minutes:20},{name:'Free activo',visits:4,spacing:4,minutes:50},{name:'VIP regular',vip:true,renew:true,visits:4,spacing:4,minutes:20},{name:'VIP activo',vip:true,renew:true,visits:4,spacing:4,minutes:50},{name:'VIP vence dia 30',vip:true,visits:4,spacing:4,minutes:20},{name:'VIP y objeto inicial',vip:true,object:true,renew:true,visits:4,spacing:4,minutes:20},{name:'Free irregular',visits:4,spacing:4,minutes:20,miss:.25}];const results=profiles.map(p=>{const r=simulate(p,{days});console.log(JSON.stringify({completed:p.name,days,level:r.final.level,expansions:r.final.expansions,plata:r.final.plata}));return r;});fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify({modelVersion:4,sourceSha256:Object.fromEntries(['public/game/state.js','supabase/functions/guardar/index.ts'].map(f=>[f,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),model:'Core farm, event adapter using current client rules and server work ledger. No combat, cooking, animals, peer buyers or financial conversion. No graphical placement/navigation model.',results},null,2));console.log(JSON.stringify(results.map(({profile,final,cash,unmetTasks,bagBlocks,toolBlocks})=>({profile,final,cash,unmetTasks,bagBlocks,toolBlocks})),null,2));}
module.exports={simulate,progression};
