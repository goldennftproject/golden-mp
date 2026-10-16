'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.argv[2],out=process.argv[3];
if(!repo||!out)throw Error('Uso: node simular-economia-conjunta.cjs REPO SALIDA [--smoke] [--pase-visible]');
const smoke=process.argv.includes('--smoke'),visiblePass=process.argv.includes('--pase-visible');
const habitualOnly=process.argv.includes('--perfil-habitual');
const conObjetos=process.argv.includes('--objetos');
const casualOnly=process.argv.includes('--perfil-casual'),gestion=process.argv.includes('--gestion-materiales');
let objetoServidor;
if(conObjetos){
 const source=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8');
 const block=source.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0];
 const c={console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite};vm.createContext(c);vm.runInContext(block.slice(block.indexOf('const VERSION')),c);objetoServidor=c.artefactoOperacion;
}
const extended=process.argv.includes('--extendido'),shared=process.argv.includes('--compartido');
const sourceFiles=['public/game/config.js','public/game/state.js','public/game/farm.js','public/game/ui.js','supabase/functions/guardar/index.ts','supabase/migrations/20261015213503_economia_mercado_interno.sql','supabase/migrations/20261015220610_balance_personal_familias.sql'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hashesBefore=Object.fromEntries(sourceFiles.map(f=>[f,hash(path.join(repo,f))]));
const simulatorHash=hash(__filename);
const EPOCH=Date.UTC(2026,9,16),DAY=86400000;
const sql=fs.readFileSync(path.join(repo,'supabase/migrations/20261015213503_economia_mercado_interno.sql'),'utf8');
const catalogue={};for(const m of sql.matchAll(/\('([^']+)',([\d.]+),([\d.]+),(\d+)\)/g))catalogue[m[1]]={precio:+m[2],semilla:+m[3],demanda:+m[4]};
assert.equal(Object.keys(catalogue).length,25);
const profiles=[{name:'casual',visits:1,mode:'mixed'},{name:'habitual',visits:3,mode:'mixed'},{name:'intensivo',visits:6,mode:'mixed'},{name:'madera',visits:3,mode:'wood'},{name:'mineria',visits:3,mode:'mine'},{name:'VIP habitual',visits:3,mode:'mixed',vip:true}];
if(extended)profiles.push({name:'Ahorro VIP',visits:3,mode:'mixed',renew:true},{name:'VIP renovable',visits:3,mode:'mixed',vip:true,renew:true},{name:'Free capital equivalente',visits:3,mode:'mixed',capital:120});
const duration=smoke?3:extended?90:45,seeds=smoke||habitualOnly?[11]:[11,29,47];
const population=shared?(smoke?2:profiles.length):1;
const results=[];
function* simulate(profile,seed,stress,sharedMarket){
 const {ctx}=require(path.join(repo,'tools/arrancar-el-juego.contexto')).arrancar(repo);
 const run=s=>vm.runInContext(s,ctx);
 let clock=EPOCH,budget=0,rng=seed;
 class SimDate extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
 ctx.Date=SimDate;ctx.nowMs=()=>clock;ctx.Math=Object.create(Math);
 ctx.Math.random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};
 const X=run('({CROP_DEF,ORE_DEF,PICK_DEF,TOOL_CRAFT,MAT_DEF,BUILD_DEF,ANIMAL_DEF,ANIMAL_ORDER,RECIPE_DEF,MONSTER_DEF,ARM_DEF,CD,SELLABLE,FARM_XP_LVLS,NODO_CARGAS_MAX,GOLDEN_EN_PLATA,CANA_V4_DEF})');
 for(const key of Object.keys(ctx))if(/^refresh|^syncSlots$|^showSaved$|^showSaving$/.test(key)&&typeof ctx[key]==='function')ctx[key]=()=>{};
 const warnings={};ctx.toast=s=>{s=String(s);if(Object.keys(warnings).length<300||warnings[s])warnings[s]=(warnings[s]||0)+1;};ctx.log=()=>{};ctx.celebrate=()=>{};ctx.saveFarm=()=>{};ctx.isOpen=()=>false;ctx.reiniciarGranjaSuave=()=>{};
 run('estadoDeCero();G.tuto={done:true};G.firstSeeds=0;');
 if(visiblePass)ctx.GF.MVP_OCULTOS=ctx.GF.MVP_OCULTOS.filter(id=>id!=='ov-pass');
 const G=ctx.G;G.iniciado=clock;G.stats={};G.statsBase={};G.pedidos=null;G.pass=null;G.obras=G.obras||{};G.obraDep=G.obraDep||{};G.planos=G.planos||{};
 const vipPrice=run('PRODUCCION_VIP_PRECIO');
 G.golden=profile.capital?(20+vipPrice):(profile.vip?20+vipPrice:20);
 const opening={plata:G.plata,golden:G.golden};
 const ledger={},resources={},counts={},milestones=[],snapshots=[],market=sharedMarket||{},remainders={},nodeMap=new Map();let day=-1,quota={},goldValue=0;
 const metric=(key,n=1)=>counts[key]=(counts[key]||0)+n;
 function perform(tag,seconds,fn){
  if(budget<seconds)return false;budget-=seconds;metric('activeSeconds',seconds);
  const before={plata:G.plata,golden:G.golden,res:{...G.res}};
  const value=fn();const l=ledger[tag]||(ledger[tag]={plata:0,golden:0,calls:0});l.calls++;l.plata+=G.plata-before.plata;l.golden+=G.golden-before.golden;
  const r=resources[tag]||(resources[tag]={});for(const k of new Set([...Object.keys(before.res),...Object.keys(G.res)])){const delta=(G.res[k]||0)-(before.res[k]||0);if(delta)r[k]=(r[k]||0)+delta;}
  assert.ok(Number.isFinite(G.plata)&&G.plata>=-1e-8,'saldo plata: '+tag);assert.ok(G.golden>=0,'saldo Golden: '+tag);
  return value===undefined?true:value;
 }
 const sprite=()=>{const s={visible:true};for(const name of ['setAlpha','setVisible','clearTint','setText','setTexture'])s[name]=function(v){if(name==='setVisible')s.visible=v;return s;};return s;};
 const scene=Object.create(run('FarmScene').prototype);
 scene.textures={exists:()=>false};scene.objs=[];scene.plots=[];
 for(const name of ['barraGolpes','setObjTex','premioFx','setPlotGlow','coinBurst','showGrowing','refreshPlotLocks','refreshNodeLocks','syncAnimales','rebuildCollisions','pescaTirar','pescaLimpiar','pescaPanel','pescaCaptura','pescaTerminar'])scene[name]=()=>{};
 scene.expandirEnVivo=()=>{ctx.GF.aplicarTerreno(G.expansiones);return true;};
 scene.syncPlots=()=>{G.plots=scene.plots.map(o=>({state:o.state,cropKey:o.cropKey,readyAt:o.readyAt,growTotal:o.growTotal,witherAt:o.witherAt}));};
 scene.syncNodos=()=>{for(const o of scene.objs)G.nodos[ctx.produccionNodoKey(o.i)]={readyAt:o.readyAt,cdIni:o.cdIni,halfAt:o.halfAt};};
 ctx.farmScene=scene;ctx.FARM=scene;ctx.GF.scene='farm';ctx.GF.aplicarTerreno(0);
 function sceneSync(){
  while(scene.plots.length<G.plotsOwned){const i=scene.plots.length;scene.plots.push({type:'plot',i,state:'dry',readyAt:0,cx:0,by:0,spr:sprite(),emo:sprite(),timer:sprite()});}
  scene.objs=ctx.produccionItems().filter(o=>o.type!=='plot').map(item=>{if(!nodeMap.has(item.i)){const base=ctx.GF.WORLD_OBJECTS[item.i];nodeMap.set(item.i,{...base,...item,lockIdx:ctx.GF.COLLISIONS[item.i].lock,sprite:sprite(),cx:0,by:0,readyAt:0,...G.nodos[ctx.produccionNodoKey(item.i)]});}return nodeMap.get(item.i);});
 }
 function finish(kind,o,seed){scene.action={kind,o,seed};scene.finishAction();}
 function marketMeta(k){const family=k==='tablon'?'madera':k.startsWith('barra_')?k.slice(6):k;const factor=family===k?1:3,c=catalogue[family];if(!c)return null;const state=market[family]||(market[family]={v:0,at:clock});assert.ok(clock>=state.at,'mercado cronológico');state.v*=Math.exp(-(clock-state.at)/21600000);state.at=clock;return {precio:catalogue[k].precio,semilla:catalogue[k].semilla,demanda:c.demanda*population,familia:family,factor,volumen:state.v,resto:remainders[k]||0,piso:['bronce','hierro','oro','diamante','netherita'].includes(family)?.6:.5,at:clock,disponible:Math.floor((Math.max(c.demanda*4,Math.ceil(c.demanda*4*ctx.produccionCapacidad()/5))-(quota[family]||0))/factor)};}
 ctx.mercadoGlobalRecurso=marketMeta;
 function sale(k,q,currency='plata'){
  const m=marketMeta(k);if(!m)return false;q=Math.min(Math.floor(q),10000,m.disponible);if(q<=0)return false;
  if(currency==='golden'){
   const remaining=Math.max(5000,ctx.produccionCapacidad()*1000)-goldValue;
   let lo=0,hi=q;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(ctx.cotizarVenta(k,mid,clock).total<=remaining)lo=mid;else hi=mid-1;}q=lo;if(q<1)return false;
  }
  const quote=ctx.cotizarVenta(k,q,clock);if(quote.total<=0)return false;
  if(currency==='golden'&&(quote.total<500||goldValue+quote.total>Math.max(5000,ctx.produccionCapacidad()*1000)))return false;
  return perform('mercado_'+currency,5,()=>{assert.ok((G.res[k]||0)>=q,'stock vendido');G.res[k]-=q;if(currency==='plata')G.plata+=quote.total;else{G.golden+=Math.floor(quote.total/500);goldValue+=quote.total;metric('goldenValueSold',quote.total);}quota[m.familia]=(quota[m.familia]||0)+q*m.factor;assert.ok(goldValue<=Math.max(5000,ctx.produccionCapacidad()*1000),'cupo Golden');market[m.familia].v+=q*m.factor*stress;remainders[k]=quote.resto;metric('soldUnits',q);return true;});
 }
 const startingBudget=budget;budget=999;
 perform('kit_inicial',0,()=>ctx.kitReclamar());
 function buyVip(){return perform('VIP',0,()=>{const ok=ctx.produccionVipComprar();if(ok){metric('vipPurchases');milestones.push({day:(clock-EPOCH)/DAY,vip:true});}return ok;});}
 if(profile.vip)buyVip();
 function objeto(accion,id){return perform('objetos_'+accion,2,()=>{
  const r=objetoServidor(JSON.parse(JSON.stringify(ctx.snapshot())),accion,id,clock,'sim-'+minuteOp++);
  if(r.error)return false;
  G.plata=r.data.plata;G.golden=r.data.golden;G.artefactos=r.data.artefactos;G.energiaGranja=r.data.energiaGranja||G.energiaGranja;
  metric('objetos_'+accion);return true;
 });}
 let minuteOp=0;
 if(conObjetos)objeto('comprar','cobre');
 budget=startingBudget;
 function project(){return ['store','horno','cocina','establo','curtiduria'].find(k=>!G.built[k]&&(G.planos[k]||G.obras[k]));}
 function needStock(){
  const reserve={madera:profile.mode==='mixed'?12:8,piedra:6};
  const t=project();if(t)for(const [k,n]of Object.entries(X.BUILD_DEF[t].cost)){reserve[k]=Math.max(reserve[k]||0,n-(((G.obraDep||{})[t]||{})[k]||0));if(X.MAT_DEF[k])for(const [raw,qty]of Object.entries(X.MAT_DEF[k].cost))reserve[raw]=Math.max(reserve[raw]||0,qty*reserve[k]);}
  if(profile.mode==='mixed')for(const k of X.ANIMAL_ORDER)if(ctx.animalCant(k)>0){const a=X.ANIMAL_DEF[k];if(gestion&&(G.res[a.mat]||0)>=3)continue;const food=a.come.slice().sort((a,b)=>X.CROP_DEF[a].price-X.CROP_DEF[b].price)[0];reserve[food]=Math.max(reserve[food]||0,a.racion*ctx.animalCant(k));}
  if(G.built.cocina)reserve.papa=Math.max(reserve.papa||0,5);
  const ps=ctx.pedidosTodos().filter(x=>!x.p.hecho&&x.p.tipo==='res'&&x.p.n<=150);
  for(const {p}of ps)if((G.res[p.key]||0)>=p.n*.5)reserve[p.key]=Math.max(reserve[p.key]||0,p.n);
  return reserve;
 }
 function farming(){
  for(const o of scene.plots){if(ctx.produccionPausada(o))continue;if(o.state==='growing'&&clock>=o.readyAt)o.state='ready';if(o.state==='ready')perform('cosecha',3,()=>{finish('harvest',o);if(o.state==='dry')metric('harvests');else metric('harvestBlocked');});}
  const reserve=needStock(),interval=1440/profile.visits,within=((clock-EPOCH)/60000)%1440,left=12-(within%interval),gap=left>3?3:interval-(within%interval);
  for(const o of scene.plots){if(o.state!=='dry'||ctx.produccionPausada(o))continue;
   const food=Object.keys(reserve).find(k=>X.CROP_DEF[k]&&ctx.cropUnlocked(k)&&(G.res[k]||0)<reserve[k]&&(!scene.plots.some(p=>p.state==='growing'&&p.cropKey===k)));
   const affordable=Object.keys(X.CROP_DEF).filter(k=>ctx.cropUnlocked(k)&&((G.seeds[k]||0)>0||X.CROP_DEF[k].seedCost<=G.plata));
   let crop=food||affordable.filter(k=>X.CROP_DEF[k].grow/60<=gap).sort((a,b)=>X.CROP_DEF[b].grow-X.CROP_DEF[a].grow)[0]||affordable[0]||'papa';
   if(!ctx.energiaGranjaPuede('plant'))continue;
   if((G.seeds[crop]||0)<=0)perform('semillas',2,()=>ctx.buySeed(crop,1));
   if((G.seeds[crop]||0)>0&&ctx.puedeAccion('plant',{...o,seed:crop}).ok)perform('siembra',3,()=>{G.selSeed=crop;finish('plant',o,crop);if(o.state==='growing')metric('planted');else metric('plantBlocked');});
  }
 }
 function gather(){
  for(const o of scene.objs){if(ctx.produccionPausada(o))continue;const tree=o.type==='tree',kind=tree?'chop':'mine',key=tree?'madera':o.type==='rock'?'piedra':o.ore;
   let limit=12;
   while(budget>=3&&limit--){
    if(tree&&ctx.toolDur('axe')<=0&&G.plata>=2)perform('herramientas',2,()=>ctx.craftTool('axe',1));
    if(!tree&&!ctx.picoParaNodo(o)){const pick=Object.keys(X.PICK_DEF).find(k=>X.PICK_DEF[k].mineTier>=(o.type==='rock'?0:X.ORE_DEF[o.ore].tier));if(pick&&G.built.store&&ctx.canAfford({...X.PICK_DEF[pick].cost,plata:X.PICK_DEF[pick].plata}))perform('herramientas',2,()=>ctx.craftPick(pick));}
    if(!ctx.puedeAccion(kind,o).ok)break;
    const stock=G.res[key]||0;perform('recoleccion',3,()=>finish(kind,o));if((G.res[key]||0)>stock)metric('nodeCharges');
   }
  }
 }
 function building(){const t=project();if(!t)return;
  if(!G.obras[t])perform('obra_colocar',4,()=>ctx.obraColocar(t,0,0,true));
  if(G.obras[t]&&(!X.BUILD_DEF[t].lvl||G.level>=X.BUILD_DEF[t].lvl)){
   perform('obra_deposito',3,()=>ctx.obraDepositar(t));
   if(!ctx.obraFalta(t).length)perform('construccion',6,()=>{ctx.obraConstruir(t);milestones.push({day:(clock-EPOCH)/DAY,building:t});});
  }
  if(G.built.horno){perform('horno_cobro',2,()=>{ctx.checkHorno();ctx.hornoRecoger();});const r=needStock();for(const [k,n]of Object.entries(r))if(X.MAT_DEF[k]&&(G.res[k]||0)+ctx.hornoList().filter(x=>x.id===k).length<n&&ctx.canAfford(X.MAT_DEF[k].cost)&&ctx.hornoLibres()>0)perform('fundicion',3,()=>ctx.craftMat(k));}
 }
 function sideContent(){if(profile.mode!=='mixed')return;
  for(const k of X.ANIMAL_ORDER){for(let i=0;i<ctx.animalCant(k);i++){if(ctx.animalFaltaDe(k,i)<=0)perform('ganaderia_cobro',3,()=>metric('animalUnits',ctx.recogerUno(k,i,true)));if((!gestion||(G.res[X.ANIMAL_DEF[k].mat]||0)<3)&&ctx.animalHambriento(ctx.animalLista(k)[i])&&ctx.animalPuedeComer(k))perform('comida_animal',3,()=>ctx.alimentarUno(k,i,true));}
   if(G.built.establo&&ctx.animalesTotal()<2&&ctx.animalUnlocked(k)&&ctx.animalCant(k)===0&&G.plata>ctx.animalPrecio(k)+500&&X.ANIMAL_DEF[k].come.some(c=>ctx.cropUnlocked(c)))perform('compra_animal',5,()=>ctx.comprarAnimal(k));
  }
  if(G.built.cocina){perform('cocina_cobro',2,()=>{ctx.checkCooking();metric('cooked',ctx.cocinaRecoger());});if(ctx.cookFree()>0&&((G.dishes.papa_asada||0)<5)&&ctx.canCook('papa_asada'))perform('cocina_insumos',3,()=>ctx.cook('papa_asada'));}
  if(ctx.lombricarioAbierto()){perform('lombricario_cobro',2,()=>ctx.lombricarioReclamar());if(ctx.lombricarioLibres()>0&&(G.res.papa||0)>10)perform('compost',3,()=>ctx.lombricarioEchar('papa'));}
  if(budget>=25&&ctx.lancesHoy()<15&&ctx.ceboTengo('lombriz')&&G.plata>=2){const rod=ctx.pescaV4CanaMejor();if(rod&&ctx.canaRota(rod)&&G.plata>=ctx.canaReparaPlata(rod))perform('reparar_cana',3,()=>ctx.canaReparar(rod));if(ctx.pescaV4Cana())perform('pesca',20,()=>{if(ctx.pescaV4Abrir()){metric('fishingAttempts');if(ctx.Math.random()<.8){ctx.pescaV4Resolver();metric('fishCaught');}else ctx.pescaV4Cerrar();}});}
  for(const id of ctx.lonjaActivos())if(!ctx.lonjaFalta(id))perform('lonja',3,()=>ctx.lonjaEntregarEscalon(id));
  for(const k of Object.keys(G.fish))if(G.fish[k]>0)perform('pescado_venta',3,()=>ctx.pezVender(k,G.fish[k]));
 }
 function combat(){if(profile.mode!=='mixed'||budget<35||!G.built.store)return;
  if(G.weapons.espada_madera&&!ctx.armaEq()&&ctx.canAfford(X.ARM_DEF.espada_madera.repair))perform('reparar_arma',3,()=>ctx.repairWeapon('espada_madera'));
  if(!ctx.armaEq()&&G.plata>=10&&(G.res.madera||0)>=5)perform('arma',4,()=>ctx.craftWeapon('espada_madera'));
  if(G.weapons.espada_madera&&!G.gear.arma)G.gear.arma='espada_madera';
  const id=ctx.armaEq();if(!id)return;
  ctx.stamTick();if(G.hp<40){if((G.dishes.papa_asada||0)>0)perform('comida_heroe',3,()=>ctx.eatDish('papa_asada'));else return;}
  const m=X.MONSTER_DEF.rata;if(G.stam<ctx.stamCosto('rata'))return;
  // Aproximación declarada: duelo sin movimiento, un contraataque cada dos golpes.
  perform('combate',5,()=>{
   if(!ctx.stamGastar(ctx.stamCosto('rata')))return;let hp=m.hp,hits=0,blk=ctx.blkDeMob();
   while(hp>0&&hits<100&&ctx.armaEq()&&budget>=X.ARM_DEF[id].cd){budget-=X.ARM_DEF[id].cd;metric('activeSeconds',X.ARM_DEF[id].cd);const hit=ctx.rollWeaponHit({armor:ctx.mobArmor(m),defense:ctx.mobDefense(m),blk});ctx.addTries('sword',1);ctx.useWeapon(id);hp-=hit.dmg;hits++;ctx.tickBlock(blk,3000);if(hits%2===0)G.hp-=ctx.blockHit(ctx.normalRandom(0,m.dmg),0,ctx.heroDefensa(true),null).dmg;if(G.hp<=15)break;}
   metric('combatHits',hits);if(hp<=0){ctx.addCombatXp(m.xp);ctx.statAdd('matar','rata');ctx.passEvent('sword');const loot=ctx.rollLoot(m);for(const[k,n]of Object.entries(loot)){if(k==='plata')G.plata+=n;else ctx.tryAddRes(k,n);}metric('kills');}else metric('retreats');
  });
 }
 function progress(){
  perform('progreso',0,()=>ctx.recalcFarmLevel());
  const e=ctx.expansionSiguiente();if(e&&!ctx.expansionObra()&&G.level>=e.nivel&&ctx.canAfford(e.costo)&&G.plata>e.costo.plata+100)perform('expansion',5,()=>ctx.expansionComprar());
  if(ctx.produccionHayCupo()&&G.plata>250){let type='plot';if(profile.mode==='wood')type='tree';if(profile.mode==='mine')type=G.level>=3?'bronce':'rock';if(profile.mode==='mixed'&&ctx.produccionItems().filter(x=>x.type==='tree').length<2&&G.expansiones>=2)type='tree';perform('compra_nodo',4,()=>ctx.produccionComprar(type));}
 }
 for(let minute=0;minute<duration*1440;minute++){
  clock=EPOCH+minute*60000;const today=Math.floor(minute/1440);if(today!==day){day=today;quota={};goldValue=0;}
  const interval=1440/profile.visits,active=minute%interval<12;
  if(active){budget=60;perform('relojes',0,()=>{ctx.produccionVipTick();ctx.expansionObraTick();ctx.stamTick();ctx.granjaRegen();});sceneSync();
   if(conObjetos&&minute%interval===0)for(const id of Object.keys((G.artefactos||{}).items||{}))objeto('cobrar',id);
   gather();farming();building();
   if(minute%interval===0)for(let i=0;i<ctx.excavPorDia();i++)perform('excavacion',3,()=>ctx.excavCavar(i));
   sideContent();combat();
   for(const {p,i}of ctx.pedidosTodos())if(!p.hecho&&ctx.pedidoStock(p)>=p.n)perform('pedidos',4,()=>{if(ctx.pedidoEntregar(i))metric('orders');});
   const reserve=needStock();for(const k of X.SELLABLE){const q=Math.max(0,(G.res[k]||0)-(reserve[k]||0));sale(k,q,profile.renew&&G.golden<vipPrice&&G.plata>1000?'golden':'plata');}
   if(profile.renew&&!ctx.produccionVipActivo()&&G.golden>=vipPrice)buyVip();
   progress();
   if(!ctx.GF.esOcultoMvp('ov-pass'))for(let n=1;n<=ctx.passLvl();n++){const p=ctx.passInit();if(!p.claimF[n])perform('premio_pase',2,()=>ctx.passClaim(n,false));if(p.vip&&!p.claimV[n])perform('premio_pase',2,()=>ctx.passClaim(n,true));}
   assert.ok(ctx.produccionUsados()<=ctx.produccionCapacidad(),'capacidad activa');
   assert.ok(ctx.energiaGranjaTick()>=0&&G.energiaGranja.actual<=100,'energía en rango');
  }
  if([1,7,14,30,31,45,60,61,90,duration].includes((minute+1)/1440)){
   const total=k=>Object.values(ledger).reduce((s,l)=>s+l[k],opening[k]);assert.ok(Math.abs(total('plata')-G.plata)<1e-6,'cuadra ledger plata');assert.ok(Math.abs(total('golden')-G.golden)<1e-6,'cuadra ledger Golden');
   snapshots.push({day:(minute+1)/1440,plata:+G.plata.toFixed(2),golden:G.golden,level:G.level,expansions:G.expansiones,used:ctx.produccionUsados(),capacity:ctx.produccionCapacidad(),vip:ctx.produccionVipActivo(),skills:{...G.skills},buildings:Object.keys(G.built).filter(k=>G.built[k]),animals:ctx.animalesTotal(),stocks:{...G.res},seeds:{...G.seeds},energia:ctx.energiaGranjaTick(),dishes:{...G.dishes},passStars:(G.pass||{}).stars||0,counts:{...counts}});
  }
  yield;
 }
 return{profile,seed,stress,opening,snapshots,ledger,resources,milestones,counts,warnings,passHidden:ctx.GF.esOcultoMvp('ov-pass')};
}
function record(s){results.push(s);const last=s.snapshots.at(-1);console.log(JSON.stringify({profile:s.profile.name,stress:s.stress,seed:s.seed,plata:last.plata,golden:last.golden,level:last.level,vipPurchases:s.counts.vipPurchases||0}));}
if(shared){for(const seed of seeds){const pool={},members=(smoke?profiles.filter(p=>['habitual','Ahorro VIP'].includes(p.name)):profiles).map(p=>simulate(p,seed,1,pool));for(let minute=0;minute<duration*1440;minute++){const start=Math.floor(minute/1440)%members.length;for(let i=0;i<members.length;i++)assert.equal(members[(i+start)%members.length].next().done,false);}for(const member of members){const end=member.next();assert.ok(end.done);record(end.value);}}}
else for(const profile of casualOnly?[profiles[0]]:smoke||habitualOnly?[profiles[1]]:profiles)for(const stress of smoke||casualOnly?[1]:[1,5])for(const seed of seeds){const iterator=simulate(profile,seed,stress);let step;do{step=iterator.next();}while(!step.done);record(step.value);}
fs.mkdirSync(out,{recursive:true});const files=['public/game/config.js','public/game/state.js','public/game/farm.js','public/game/ui.js','supabase/migrations/20261015220610_balance_personal_familias.sql'];
const hashesAfter=Object.fromEntries(sourceFiles.map(f=>[f,hash(path.join(repo,f))]));assert.deepEqual(hashesAfter,hashesBefore,'fuentes sin cambios durante simulación');
fs.writeFileSync(path.join(out,'proveniencia.json'),JSON.stringify({simulatorHash,hashesBefore,hashesAfter,shared,extended,participants:shared?(smoke?2:profiles.length):1,rotation:'orden rotado cada día',policy:'ahorro VIP vende excedentes por Golden con saldo plata >1000 y Golden < precio VIP vigente; reserva real de insumos; renueva al expirar',notes:shared?'Mercado compartido local; participantes y semillas según opciones. No es un test remoto ni representa toda población posible.':'Mercado local de un participante por ejecución; perfiles, semillas y política según opciones. No es un test remoto ni un test de población.'},null,2));
fs.writeFileSync(path.join(out,'resultados.json'),JSON.stringify({date:new Date().toISOString(),duration,visiblePass,results,hashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,f))).digest('hex')])),limitations:['Pasos de un minuto; 12 minutos por visita; acción normal 3 s, pesca 20 s, panel 2–6 s (supuestos de conducta, no tiempos del motor).','Mercado local usa cotizarVenta real y cuotas/familias reconstruidas del contrato SQL; stress multiplica flujo de ventas, no es una población heterogénea real ni transacción remota.','Tutorial marcado terminado y starter acelerado apagado; kit real, cartera 3 plata/20 Golden. VIP empieza con el precio VIP vigente de saldo previo adicional y lo paga, no es un pago externo.','Combate aproximado: sólo ratas, defensa y daño reales, un contraataque cada dos golpes, sin movimiento/AI. Retirada con vida baja; sin rutas de bosses ni P2P.','No se liquida inventario animal/platos por precios sombra. Faltan transporte/depósitos/armadura avanzada y microgestión óptima. No se promete nivel 25 en un plazo ni rentabilidad real.']},null,2));
fs.writeFileSync(path.join(out,'opciones.json'),JSON.stringify({conObjetos,gestion,casualOnly,habitualOnly,smoke,extended,shared,nota:'Con objetos compra amuleto de cobre con 10 Golden iniciales y cobra en las visitas usando la lógica real del servidor; sin RPC remoto.'},null,2));
console.log('Guardado '+out+' · '+results.length+' escenarios');

