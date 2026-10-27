'use strict';
const fs=require('node:fs');
let source=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
source+=`(async()=>{
 const data={...inicial.data,plata:100000,nfts:{hacha_abuelo:true,cincel_cantera:true,pico_viejo:true}};
 const p={cuenta:'qa',base,op:'55555555-5555-4555-8555-555555555555',mejora:{id:'hacha_abuelo'}};
 let s=servidor({...inicial,data});let r=await s.call(p);assert.equal(r.status,200);assert.equal(s.row().data.plata,50000);assert.equal(s.row().data.mejorasPasivas.niveles.hacha_abuelo,2);
 r=await s.call(p);assert.equal((await r.json()).repetido,true);assert.equal(s.writes(),1);
 assert.equal((await s.call({...p,op:'66666666-6666-4666-8666-666666666666',base:s.row().updated_at})).status,400);assert.equal(s.writes(),1);
 assert.equal((await s.call(p,false)).status,401);
 for(const id of ['cincel_cantera','pico_viejo']){s=servidor({...inicial,data});assert.equal((await s.call({...p,mejora:{id}})).status,200);assert.equal(s.row().data.mejorasPasivas.niveles[id],2);}
 for(const d of [{...data,nfts:{}},{...data,plata:49999}]){s=servidor({...inicial,data:d});assert.equal((await s.call(p)).status,400);assert.equal(s.writes(),0);}
 for(const id of ['__proto__','otra',null]){s=servidor({...inicial,data});assert.equal((await s.call({...p,mejora:{id}})).status,400);assert.equal(s.writes(),0);}
 s=servidor({...inicial,data});assert.equal((await s.call({base,data:{...data,mejorasPasivas:{v:1,niveles:{hacha_abuelo:2},ops:[]}}})).status,409);assert.equal(s.writes(),0,'no permite falsificar mejora por guardado');
 s=servidor({...inicial,data});const rs=await Promise.all([s.call(p),s.call({...p,op:'66666666-6666-4666-8666-666666666666',mejora:{id:'pico_viejo'}})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);
 const real=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')),c=real.ctx;
 c.G.nfts={hacha_abuelo:true,cincel_cantera:true,pico_viejo:true};c.G.mejorasPasivas={v:1,niveles:{hacha_abuelo:2},ops:[]};assert.equal(c.bonoNft('madera',1),1.15);assert.equal(c.bonoNft('madera',2),2.15);assert.equal(c.bonoNft('piedra',1),1.1);assert.equal(c.bonoNft('bronce',1),1);
 const snap=c.snapshot();c.G.mejorasPasivas=null;c.hydrate(snap);assert.equal(c.bonoNft('madera',1),1.15);c.hydrate({...snap,mejorasPasivas:null});assert.equal(c.bonoNft('madera',1),1.1);
 const d={...data,mejorasPasivas:{v:1,niveles:{hacha_abuelo:2},ops:[]}},n={...d,logrosAcciones:{madera:1.15},stats:{}};s=servidor({...inicial,data:d});s.ctx.qaPrev=d;s.ctx.qaNext=n;vm.runInContext('logrosActualizar(qaPrev,qaNext,{chop:1})',s.ctx);assert.equal(n.logrosV2.progreso.madera,1.15);
 console.log('OK: mejoras de pasivas, coste, propiedad, auth, CAS, replay, falsificación, bonos y persistencia de centésimas.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',source)(require,__dirname);
