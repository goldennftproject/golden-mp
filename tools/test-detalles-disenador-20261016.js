'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),{ctx}=require('./arrancar-el-juego.contexto').arrancar(repo),run=s=>vm.runInContext(s,ctx);
let clock=1800000000000;ctx.nowMs=()=>clock;ctx.saveFarm=()=>{};ctx.toast=()=>{};ctx.log=()=>{};ctx.celebrate=()=>{};ctx.refreshHud=()=>{};ctx.isOpen=()=>false;ctx.reiniciarGranjaSuave=()=>{};
const clone=x=>JSON.parse(JSON.stringify(x));
function reset(){ctx.estadoDeCero();ctx.GF.scene='farm';ctx.GF.aplicarTerreno(0);ctx.farmScene=null;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);
reset();const mx=ctx.stamMax();ctx.G.stam=0;ctx.stamTick();clock+=3600000;ctx.stamTick();near(ctx.G.stam,mx/4);
const snap=clone(ctx.snapshot());clock+=3600000;ctx.hydrate(snap);ctx.stamTick();near(ctx.G.stam,mx/2);
assert.ok(ctx.stamGastar(10));near(ctx.G.stam,mx/2-10);clock+=2*3600000;ctx.stamTick();near(ctx.G.stam,mx-10);
clock+=4*3600000;ctx.stamTick();assert.equal(ctx.G.stam,mx);
// Migración del reloj viejo: no se pierde el tiempo ya transcurrido.
reset();ctx.hydrate({...clone(ctx.snapshot()),stam:0,stamLastAt:undefined,stamFullAt:clock+2*3600000});ctx.stamTick();near(ctx.G.stam,ctx.stamMax()/2);
const dom=new JSDOM(fs.readFileSync(path.join(repo,'public/index.html'),'utf8'),{url:'http://localhost/'});ctx.document=dom.window.document;
reset();ctx.G.canas={junco:1,oro:1};ctx.refreshLonja();const select=dom.window.document.getElementById('lonja-cana');select.value='junco';select.dispatchEvent(new dom.window.Event('change'));
assert.equal(ctx.pescaV4Cana(),'junco');const rodSnap=clone(ctx.snapshot());ctx.hydrate(rodSnap);assert.equal(ctx.G.canaElegida,'junco');ctx.G.canasDur={junco:0};assert.equal(ctx.pescaV4Cana(),null,'no cambia en silencio a la caña cara');
for(const id of ['junco','bambu','hierro','oro']){ctx.G.canasDur={[id]:0};const material=run(`Object.entries(CANA_V4_DEF['${id}'].cost).reduce((s,[k,n])=>s+n*matValor(k),0)`);assert.equal(ctx.canaReparaPlata(id),Math.ceil(material*.5));ctx.G.canasDur[id]=run('CANA_USOS')/2;assert.equal(ctx.canaReparaPlata(id),Math.ceil(material*.25));}
reset();ctx.hydrate({...clone(ctx.snapshot()),canasDur:{junco:25,bambu:0},canasDurV:undefined});assert.equal(ctx.canaAguante('junco'),75);assert.equal(ctx.canaAguante('bambu'),0);ctx.hydrate(clone(ctx.snapshot()));assert.equal(ctx.canaAguante('junco'),75,'migración sólo una vez');
reset();ctx.G.res={papa:20};ctx.G.built.cocina=true;ctx.cook('papa_asada');ctx.cook('papa_asada');ctx.cook('papa_asada');assert.equal(ctx.cookList().length,3);
assert.equal(ctx.cocinaCancelar(0),false);const after=ctx.G.res.papa,end=ctx.cookList()[2].endAt,duration=ctx.cookList()[1].total;assert.equal(ctx.cocinaCancelar(1),true);assert.ok(ctx.G.res.papa>after);assert.equal(ctx.cookList()[1].endAt,end-duration);
clock=ctx.cookList()[1].endAt+1;ctx.checkCooking();ctx.refreshCooking();const button=dom.window.document.getElementById('ck-recoger');assert.ok(button);ctx.refreshCooking();assert.equal(dom.window.document.getElementById('ck-recoger'),button,'tick conserva el botón');button.click();assert.equal(ctx.G.dishes.papa_asada,2);assert.equal(ctx.cookList().length,0);button.click();assert.equal(ctx.G.dishes.papa_asada,2,'clic viejo no duplica platos');
reset();ctx.G.built.curtiduria=true;ctx.G.res={fibra:100};ctx.G.plata=10000;ctx.craftArmor('fibra','yelmo');const key=ctx.armorKey('fibra','yelmo');assert.equal(ctx.armorActiva('fibra','yelmo'),false);assert.ok(ctx.bolsaCuentas().some(x=>x.kind==='armor'&&x.key===key));
assert.equal(ctx.armorAlternarPieza(key),true);assert.ok(ctx.armorDefensa()>0);ctx.armorGastar(7);assert.equal(ctx.armorDur('fibra','yelmo'),93);assert.equal(ctx.armorAlternarPieza(key),true);assert.equal(ctx.armorDefensa(),0);ctx.armorGastar(8);assert.equal(ctx.armorDur('fibra','yelmo'),93);
assert.equal(ctx.mkSacar('armor',key,1),true);assert.equal(ctx.mkPoner('armor',key,1,{dur:93}),true);assert.equal(ctx.armorDur('fibra','yelmo'),93);assert.equal(ctx.mkPoner('armor',key,1,{dur:100}),false);assert.equal(ctx.mkPoner('armor','inventada',1,{dur:100}),false);ctx.hydrate(clone(ctx.snapshot()));assert.equal(ctx.armorDur('fibra','yelmo'),93);
reset();ctx.G.plata=1000;ctx.G.res={madera:100,piedra:100,lombriz:100};assert.equal(ctx.nasaCalar('mimbre'),true);assert.equal(ctx.G.plata,900);assert.equal(ctx.G.nasas[0].listaEn-clock,4*3600000);const nasaSnap=clone(ctx.snapshot());ctx.hydrate(nasaSnap);assert.equal(ctx.G.nasas[0].listaEn,nasaSnap.nasas[0].listaEn);
reset();ctx.G.weapons={espada_madera:{dur:80}};ctx.G.gear.arma='espada_madera';ctx.zonaEntrar();ctx.G.weapons.espada_madera.dur=73;const summary=ctx.zonaSalir(false);assert.equal(summary.desgaste[0].gasto,7);ctx.mostrarResumenZona(summary);assert.match(dom.window.document.getElementById('zr-body').textContent,/−7/);
const scene=Object.create(run('FarmScene').prototype);scene.plots=[0,1,2].map(i=>({i,type:'plot',state:'dry'}));scene.crearParcela=i=>({i,type:'plot',state:i<ctx.G.plotsOwned?'dry':'locked'});scene.pintarSueloParcela=()=>{};scene.plotUnlockFx=()=>{};scene.syncPlots=()=>{};scene.moverParcela=()=>{};scene.celdaLibreParcela=()=>({col:1,row:1});ctx.G.plotsOwned=4;scene.refreshPlotLocks();assert.equal(scene.plots.length,ctx.GF.PLOTS.length);assert.notEqual(scene.plots[3].state,'locked');
console.log('OK: estamina continua y migración, caña elegible persistente, reparación 50%, cocina cancelable y clic estable, armadura en bolsa/transferencia con desgaste, nasas 4h+100, resumen y parcelas inmediatas.');
