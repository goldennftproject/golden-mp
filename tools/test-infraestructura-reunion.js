'use strict';
const fs=require('node:fs');
let src=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
src+=`(async()=>{
 const data={...inicial.data,golden:30,plata:100,level:15,prestige:0,skills:{farming:0,tala:0,mining:0},farmXpRitmo:{v:1,tala:0,mining:0},res:{madera:1000,piedra:1000,hierro:100}};
 const p={cuenta:'qa',base,op:'77777777-7777-4777-8777-777777777777',infra:{id:'tienda'}};
 let s=servidor({...inicial,data}),r=await s.call(p);assert.equal(r.status,200);assert.equal(s.row().data.golden,20);assert.equal(s.row().data.infraestructura.tienda,true);assert.equal((await(await s.call(p)).json()).repetido,true);assert.equal(s.writes(),1);
 assert.equal((await s.call({...p,base:s.row().updated_at,op:'88888888-8888-4888-8888-888888888888'})).status,400);assert.equal((await s.call(p,false)).status,401);
 s=servidor({...inicial,data});const rs=await Promise.all([s.call(p),s.call({...p,infra:{id:'granja'},op:'88888888-8888-4888-8888-888888888888'})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);
 for(const changes of [{golden:9},{golden:NaN}]){s=servidor({...inicial,data:{...data,...changes}});assert.equal((await s.call(p)).status,400);assert.equal(s.writes(),0);}
 s=servidor({...inicial,data});
 for(let i=1;i<=3;i++){r=await s.call({...p,base:s.row().updated_at,op:i+'7777777-7777-4777-8777-777777777777',infra:{id:'granja'}});assert.equal(r.status,200);assert.equal(s.row().data.infraestructura.granja,i);}
 assert.equal(s.row().data.res.madera,500);assert.equal(s.row().data.res.piedra,500);assert.equal(s.row().data.res.hierro,83);assert.equal(s.row().data.golden,30);assert.equal(s.row().data.plata,100);
 r=await s.call({...p,base:s.row().updated_at,infra:{id:'granja'}});assert.equal(r.status,400);assert.equal(s.writes(),3);
 for(const changes of [{level:4},{res:{madera:49,piedra:50,hierro:2}},{res:{madera:50,piedra:50,hierro:1}}]){s=servidor({...inicial,data:{...data,...changes}});assert.equal((await s.call({...p,infra:{id:'granja'}})).status,400);assert.equal(s.writes(),0);}
 s=servidor({...inicial,data});assert.equal((await s.call({...p,infra:{id:'__proto__'}})).status,400);assert.equal(s.writes(),0);
 assert.equal((await s.call({base,data:{...data,infraestructura:{v:1,tienda:true,granja:3,ops:[]}}})).status,409);assert.equal(s.writes(),0);
 const upgraded={...data,infraestructura:{v:1,tienda:true,granja:1,ops:[]},farmXpEdificios:0};s=servidor({...inicial,data:upgraded});
 let next={...upgraded,skills:{farming:100,tala:10,mining:10},farmXpEdificios:2.7};r=await s.call({base,data:next});assert.equal(r.status,200,await r.clone().text());assert.equal(s.row().data.farmXpEdificios,2.7);
 assert.equal((await s.call({base:s.row().updated_at,data:{...s.row().data,farmXpEdificios:200}})).status,409);
 r=await s.call({base:s.row().updated_at,data:{...s.row().data,skills:{farming:0,tala:10,mining:10},farmXpBase:35,prestige:1,level:1,farmXpEdificios:0}});assert.equal(r.status,200,await r.clone().text());
 const real=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')),c=real.ctx;c.recalcFarmLevel=()=>{};c.G.skills={farming:0,tala:0,mining:0};c.G.farmXpRitmo={v:1,tala:0,mining:0};c.G.infraestructura={v:1,tienda:true,granja:1,ops:[]};c.G.farmXpEdificios=0;c.G.farmXpBase=0;
 c.addXp('farming',100);c.addXp('tala',10);c.addXp('mining',10);assert.equal(c.G.farmXpEdificios,2.7);assert.equal(c.farmXpProductiva(),137.7);
 assert.equal(c.infraCupoP2P(),2);c.G.produccion.vipHasta=Date.now()+86400000;assert.equal(c.infraCupoP2P(),11);c.G.produccion.vipHasta=0;assert.equal(c.infraCupoP2P(),2);
 const snap=c.snapshot();c.G.infraestructura=null;c.G.farmXpEdificios=0;c.hydrate(snap);assert.equal(c.G.infraestructura.granja,1);assert.equal(c.G.farmXpEdificios,2.7);c.hydrate({...snap,infraestructura:null,farmXpEdificios:0});assert.equal(c.infraBono(),0);
 c.G.level=c.FARM_NIVEL_MAX||25;c.G.infraestructura={granja:3};c.G.farmXpEdificios=50;c.prestige();assert.equal(c.G.farmXpEdificios,0);assert.equal(c.farmXpProductiva(),0);
 // Tabla y precio compartidos; el cliente no elige costes ni bono del servidor.
 assert.equal(vm.runInContext('JSON.stringify(INFRA_GRANJA)',s.ctx),vm.runInContext('JSON.stringify(INFRA_GRANJA)',c));
 console.log('OK infraestructura: compra única, costes, niveles, CAS, replay, auth, cupos Free/VIP, XP futura, protección y F5/prestigio.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',src)(require,__dirname);
