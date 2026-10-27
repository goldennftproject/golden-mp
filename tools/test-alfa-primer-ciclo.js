'use strict';
const assert=require('node:assert/strict'),path=require('path'),vm=require('vm');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'),{'game/main.js':''});
(async()=>{
 await c.SAVE_READY;const logs=[];for(const k of ['refreshHud','refreshInv','refreshHotbar','refreshMarket','refreshSeedShop','refreshForge','syncSlots','saveFarm','celebrate','tutoRefresh','tutoCheck','syncCobertizo'])c[k]=()=>{};
 c.isOpen=()=>false;c.log=x=>logs.push(x);c.toast=x=>logs.push(x);c.estadoDeCero();c.tutoMigrar();assert.equal(c.tutoActivo().id,'kit');
 assert.equal(c.kitReclamar(),true);assert.equal(c.tutoActivo().id,'buyseed');assert.ok(!logs.some(s=>/pescar|caña|🎣/.test(s)),'no se anuncia una actividad pausada');
 c.buySeed('papa',3);assert.equal(c.tutoActivo().id,'plant');assert.equal(c.G.plata,0);assert.equal(c.G.seeds.papa,3);
 let clock=Date.now();c.nowMs=()=>clock;
 const plots=Array.from({length:3},(_,i)=>({type:'plot',i,state:'dry',cx:i*42,by:84,spr:{setVisible(){}},emo:{setVisible(){}},timer:{setVisible(){}}}));
 const sc={plots,showGrowing(){},setPlotGlow(){},coinBurst(){},premioFx(){},syncPlots(){c.G.plots=plots.map(({state,cropKey,readyAt,witherAt,growTotal})=>({state,cropKey,readyAt,witherAt,growTotal}));}};
 const finish=vm.runInContext('FarmScene.prototype.finishAction',c);
 for(const o of plots){sc.action={kind:'plant',o};finish.call(sc);}
 assert.equal(c.tutoActivo().id,'harvest');assert.equal(c.G.seeds.papa,0);
 clock=Math.max(...plots.map(p=>p.readyAt))+1;
 for(const o of plots){o.state='ready';sc.action={kind:'harvest',o};finish.call(sc);}
 assert.equal(c.tutoActivo().id,'sell');assert.equal(c.G.res.papa,3);
 vm.runInContext("marketCur='plata';MERCADO_GLOBAL=false",c);c.mercadoGlobalActivo=()=>false;c.$('mq-papa').value=3;c.sellItem('papa');
 assert.equal(c.G.res.papa,0);assert.ok(c.G.plata>3,'el ciclo permite volver a sembrar');assert.equal(c.tutoActivo().id,'place_store');assert.ok(c.G.planos.store);
 const snap=JSON.parse(JSON.stringify(c.snapshot())),step=c.G.tuto.step;c.hydrate(snap);assert.equal(c.G.tuto.step,step,'recargar conserva el siguiente paso');
 console.log('OK: kit → compra → tres siembras → reloj → tres cosechas → venta → plano de Herrería; reglas reales locales y continuidad al hidratar. Sin servidor ni cuentas reales.');
})().catch(e=>{console.error(e);process.exitCode=1;});
