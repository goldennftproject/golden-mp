'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')),run=s=>vm.runInContext(s,ctx),clone=x=>JSON.parse(JSON.stringify(x));
let clock=1800000000000;ctx.nowMs=()=>clock;
for(const k of Object.keys(ctx))if(/^refresh/.test(k)&&typeof ctx[k]==='function')ctx[k]=()=>{};
ctx.saveFarm=()=>{};ctx.toast=()=>{};ctx.log=()=>{};ctx.isOpen=()=>false;ctx.celebrate=()=>{};ctx.reiniciarGranjaSuave=()=>{};
function reset(){ctx.estadoDeCero();ctx.GF.scene='farm';}
(async()=>{
 reset();const legacy={...clone(ctx.snapshot()),canasDur:{junco:25},canasDurV:undefined};ctx.hydrate(legacy);assert.equal(ctx.canaAguante('junco'),75);assert.equal(legacy.canasDur.junco,25);ctx.hydrate(legacy);assert.equal(ctx.canaAguante('junco'),75);
 reset();ctx.G.picks.eq='iron';ctx.G.picks.owned.iron=true;ctx.G.picks.dur.iron=7;ctx.G.picks.dur.stone=0;ctx.G.vales=100;const bundle=ctx.valeFardoN('picos');ctx.valesCanjear('picos');assert.equal(ctx.G.picks.dur.iron,7);assert.equal(ctx.G.picks.dur.stone,bundle,'canje no regala hierro por tenerlo equipado');
 reset();ctx.G.built.cocina=true;ctx.G.skills.cooking=1e9;ctx.G.res.papa=100;
 const recipes=run('RECIPE_DEF'),fishDef=run('PEZ_DEF'),[id,r]=Object.entries(recipes).find(([k,r])=>r.fish&&Object.keys(r.fish).length);
 for(const [k,n]of Object.entries(r.res||{}))ctx.G.res[k]=n*10;
 for(const [k,n]of Object.entries(r.fish)){const species=fishDef[k]?k:ctx.pecesDeBanda(k)[0];assert.ok(species);ctx.G.fish[species+'@'+fishDef[species].peso[0]]=n*10;}
 const beforeFish=Object.fromEntries(Object.entries(clone(ctx.G.fish)).filter(([,n])=>n>0));ctx.cook('papa_asada');ctx.cook(id);assert.equal(ctx.cookList().length,2);
 assert.notDeepEqual(clone(ctx.G.fish),beforeFish);ctx.hydrate(clone(ctx.snapshot()));assert.equal(ctx.cocinaCancelar(1),true);assert.deepEqual(clone(ctx.G.fish),beforeFish,'cancelar devuelve exactamente los mismos peces y pesos');
 ctx.cook(id);const beforeFull=JSON.stringify([ctx.G.res,ctx.G.fish,ctx.G.cooking]);run('INV_BASE=1');assert.equal(ctx.cocinaCancelar(1),false);assert.equal(JSON.stringify([ctx.G.res,ctx.G.fish,ctx.G.cooking]),beforeFull,'bolsa llena no pierde ingredientes ni adelanta cola');run('INV_BASE=35');
 reset();ctx.G.armor={arm_fibra_yelmo:true,arm_fibra_pecho:true};ctx.G.armorDur={arm_fibra_yelmo:42,arm_fibra_pecho:31};ctx.G.armorEq='fibra';ctx.G.armorOff={arm_fibra_pecho:true};
 const fallen=ctx.equipoCaido(()=>0).find(e=>e.kind==='armorset');assert.ok(fallen);assert.deepEqual(Array.from(fallen.piezas),['yelmo']);assert.equal(ctx.G.armor.arm_fibra_pecho,true,'lo guardado no cae como si estuviera equipado');assert.equal(fallen.dur.yelmo,42);
 ctx.G.tumba={hasta:clock+60000,items:[fallen],zona:'pantano',x:1,y:1};ctx.G.cont={c:'backpack',items:[]};assert.equal(ctx.tumbaRecoger(),1);ctx.hydrate(clone(ctx.snapshot()));assert.equal(ctx.G.cont.items[0].dur.yelmo,42,'el desgaste viaja de tumba a contenedor y sobrevive F5');assert.deepEqual(Array.from(ctx.G.cont.items[0].piezas),['yelmo']);ctx.contDescargar(ctx.G.cont,true);assert.equal(ctx.armorDur('fibra','yelmo'),42,'recuperar tumba no repara gratis');
 reset();ctx.G.armor={arm_fibra_yelmo:true};ctx.G.armorDur={arm_fibra_yelmo:41};ctx.G.armorOff={arm_fibra_yelmo:true};let listing,published=0;
 ctx.mkMine=async()=>[];ctx.mkPublish=async row=>{listing={...row,id:'qa',seller:'otro'};published++;return listing;};
 await Promise.all([ctx.marketPublicar('armor','arm_fibra_yelmo',1,30),ctx.marketPublicar('armor','arm_fibra_yelmo',1,30)]);assert.equal(published,1);assert.equal(listing.payload.dur,41);assert.equal(ctx.G.armor.arm_fibra_yelmo,undefined);
 ctx.G.plata=100;let buys=0;ctx.mkBuy=async()=>{buys++;await Promise.resolve();return listing;};
 await Promise.all([ctx.marketComprar(listing),ctx.marketComprar(listing)]);assert.equal(buys,1);assert.equal(ctx.G.plata,70);assert.equal(ctx.armorDur('fibra','yelmo'),41);
 assert.equal(ctx.mkSacar('armor','arm_fibra_yelmo',1),true);run('INV_BASE=0');ctx.mkEntregar('armor','arm_fibra_yelmo',1,{dur:41});assert.equal(ctx.G.mkPend.length,1);assert.equal(ctx.G.armor.arm_fibra_yelmo,undefined);run('INV_BASE=35');assert.equal(ctx.mkPendCobrar(),1);assert.equal(ctx.armorDur('fibra','yelmo'),41);
 ctx.mkPublish=async()=>null;await ctx.marketPublicar('armor','arm_fibra_yelmo',1,20);assert.equal(ctx.armorDur('fibra','yelmo'),41,'fallo de publicación devuelve desgaste original');
 console.log('OK: migración sin mutar respaldos, picos de piedra con hierro equipado, cancelación con pesos/F5/bolsa llena, tumba sin reparar gratis, publicar/comprar doble clic y entregas pendientes conservan armadura.');
})().catch(e=>{console.error(e);process.exitCode=1;});
