'use strict';const fs=require('node:fs');let source=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];source+=`(async()=>{
 const initial={...inicial,data:{...inicial.data,golden:1000,nfts:{},godHand:false}};
 for(const [id,price] of [['hacha_abuelo',109],['pico_viejo',29],['godHand',500]]){
  let s=servidor(initial),data=structuredClone(initial.data);if(id==='godHand')data.godHand=true;else data.nfts[id]=true;
  assert.equal((await s.call({base,data})).status,409,'no acepta propiedad premium sin pagar');assert.equal(s.writes(),0);
  data.golden-=price;s=servidor(initial);const r=await s.call({base,data});assert.equal(r.status,200,await r.clone().text());assert.equal(s.row().data.golden,1000-price);
  const real=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')).ctx;assert.equal(id==='godHand'?vm.runInContext('GODHAND_GOLDEN',real):real.nftPrecioGolden(id),price,'precio de servidor coincide con cliente');
 }
 let s=servidor(initial),data=structuredClone(initial.data);data.nfts={hacha_abuelo:true,pico_viejo:true};data.godHand=true;data.golden=1000-109-29-500;let r=await s.call({base,data});assert.equal(r.status,200,await r.clone().text());
 const own=s.row();r=await s.call({base:own.updated_at,data:{...own.data,nfts:{},godHand:false}});assert.equal(r.status,409,'no borra compras existentes');
 s=servidor(initial);data=structuredClone(initial.data);data.nfts.cincel_cantera=true;assert.equal((await s.call({base,data})).status,409,'Pase no se falsifica como compra');
 data=structuredClone(initial.data);data.nfts.__bad=true;assert.equal((await s.call({base,data})).status,409);
 console.log('OK: propiedad premium exige Golden, precio en paridad, compras combinadas, propiedad histórica y premio del Pase protegido.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;new Function('require','__dirname',source)(require,__dirname);
