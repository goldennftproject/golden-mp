'use strict';const fs=require('node:fs');let src=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
src+=`(async()=>{
 const data={...inicial.data,golden:500,plata:100000,godHand:true,res:{madera:200,piedra:200,hierro:10},infraestructura:{v:1,tienda:true,granja:3,ops:[]}};
 const p={cuenta:'qa',base,op:'99999999-9999-4999-8999-999999999999',infra:{id:'godhand'}};
 for(const id of ['godhand','mercado']){
  let s=servidor({...inicial,data}),r=await s.call({...p,infra:{id}});assert.equal(r.status,200);assert.equal(s.row().data.plata,50000);assert.equal(s.row().data.golden,500);assert.equal(s.row().data.infraestructura[id],true);assert.equal(s.row().data.infraestructura.tienda,true);assert.equal(s.row().data.infraestructura.granja,3);
  assert.equal(s.row().data.res.madera,id==='mercado'?100:200);assert.equal(s.row().data.res.hierro,id==='mercado'?5:10);
  assert.equal((await(await s.call({...p,infra:{id}})).json()).repetido,true);assert.equal(s.writes(),1);
  assert.equal((await s.call({...p,base:s.row().updated_at,op:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',infra:{id}})).status,400);assert.equal(s.writes(),1);
  s=servidor({...inicial,data});assert.equal((await s.call({...p,infra:{id}},false)).status,401);assert.equal((await s.call({...p,cuenta:'otra',infra:{id}})).status,409);
  for(const d of [{...data,plata:49999},...(id==='godhand'?[{...data,godHand:false}]:[{...data,res:{madera:100,piedra:100,hierro:4}}])]){s=servidor({...inicial,data:d});assert.equal((await s.call({...p,infra:{id}})).status,400);assert.equal(s.writes(),0);}
 }
 let s=servidor({...inicial,data});const rs=await Promise.all([s.call(p),s.call({...p,op:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',infra:{id:'mercado'}})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);
 assert.equal((await s.call({base:s.row().updated_at,data:{...s.row().data,infraestructura:{...s.row().data.infraestructura,mercado:true,godhand:true}}})).status,409);
 const c=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')).ctx;c.G.infraestructura=null;
 let costos=[];for(let h=1;h<=24;h++)costos.push(c.godHandCostoHoras(h));assert.equal(costos[0],100);
 c.G.infraestructura={godhand:true,mercado:true};for(let h=1;h<=24;h++)assert.equal(c.godHandCostoHoras(h),Math.round(costos[h-1]*.9));
 c.G.produccion.vipHasta=0;assert.equal(c.marketFee(),8);c.G.produccion.vipHasta=Date.now()+86400000;assert.equal(c.marketFee(),5);assert.equal(c.marketFee({fee_pct:10}),10);assert.equal(c.marketFee({fee_pct:7}),7);assert.equal(c.marketFee({fee_pct:null}),5);
 const snap=c.snapshot();c.G.infraestructura=null;c.hydrate(snap);assert.ok(c.G.infraestructura.godhand&&c.G.infraestructura.mercado);
 assert.equal(vm.runInContext('JSON.stringify(INFRA_OPCIONALES)',s.ctx),vm.runInContext('JSON.stringify(INFRA_OPCIONALES)',c));
 // Cobro en el camino real de trabajo automático: mismo rendimiento y energía, menor tarifa.
 c.celebrate=()=>{};const sim=mejorada=>{c.G.godHand=true;c.G.infraestructura=mejorada?{godhand:true}:null;c.G.ghInv=[{key:'papa',n:10},null,null,null,null,null];c.G.plots=Array.from({length:3},()=>({state:'dry'}));c.G.plotsOwned=3;c.G.plata=1000;c.G.res.papa=0;c.G.energiaGranja={v:1,actual:100,at:Date.now()};vm.runInContext('CROP_DEF.papa.grow=3600',c);c.cdMult=()=>1;c.cultivoTiempoMult=()=>1;c.godHandSembrar(3600000);return {plata:c.G.plata,papa:c.G.res.papa,semillas:c.godHandTotal(),energia:c.G.energiaGranja.actual};};
 const normal=sim(false),mejorada=sim(true);assert.ok(normal.papa>0);assert.equal(mejorada.papa,normal.papa);assert.equal(mejorada.semillas,normal.semillas);assert.equal(mejorada.energia,normal.energia);assert.equal(mejorada.plata-normal.plata,10);
 console.log('OK: mejoras God Hand/mercado, compra y materiales atómicos, CAS/replay/auth, histórico, persistencia y descuento real sin cambiar producción.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',src)(require,__dirname);
