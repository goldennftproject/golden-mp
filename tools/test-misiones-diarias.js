const fs=require('fs'),path=require('path');
let source=fs.readFileSync(path.resolve(__dirname,'test-guardado-atomico.js'),'utf8').split('(async()=>{')[0];
source+=`(async()=>{
 const day=new Date().toISOString().slice(0,10),now=Date.now();
 const earned={...inicial,data:{...inicial.data,actividadGranja:{v:1,energia:200,bonoTotal:0,jornada:{v:2,dia:day,energia:200,plata:0,progreso:{plant:20,harvest:20,chop:10,mine:10},cobradas:{},ops:[]}}}};
 const request={cuenta:'qa',base,op:'33333333-3333-4333-8333-333333333333',mision:{id:'siembra',dia:day}};
 let s=servidor(earned),r=await s.call(request);assert.equal(r.status,200);assert.equal(s.row().data.plata,510);
 r=await s.call(request);assert.equal((await r.json()).repetido,true);assert.equal(s.writes(),1);
 assert.equal((await s.call({...request,base:s.row().updated_at,op:'44444444-4444-4444-8444-444444444444'})).status,400);
 assert.equal((await s.call({...request,cuenta:'otra'})).status,409);assert.equal((await s.call(request,false)).status,401);
 for(const [id,qty] of [['cosecha',500],['madera',500],['mineria',500],['jornada',3000]]){const before=s.row().data.plata;r=await s.call({...request,base:s.row().updated_at,op:require('crypto').randomUUID(),mision:{id,dia:day}});assert.equal(r.status,200);assert.equal(s.row().data.plata,before+qty);}
 assert.equal(s.row().data.actividadGranja.jornada.plata,5000);
 s=servidor(earned);const race=await Promise.all([s.call(request),s.call({...request,op:'44444444-4444-4444-8444-444444444444'})]);assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);assert.equal(s.writes(),1);
 for(const mision of [{id:'inventada',dia:day},{id:'siembra',dia:'2000-01-01'}]){s=servidor(earned);assert.equal((await s.call({...request,mision})).status,400);assert.equal(s.writes(),0);}
 s=servidor({...earned,data:{...earned.data,actividadGranja:{...earned.data.actividadGranja,jornada:{...earned.data.actividadGranja.jornada,progreso:{}}}}});assert.equal((await s.call(request)).status,400);
 s=servidor({...earned,data:{...earned.data,actividadGranja:{...earned.data.actividadGranja,jornada:{...earned.data.actividadGranja.jornada,plata:4900}}}});assert.equal((await s.call(request)).status,200);assert.equal(s.row().data.plata,110);assert.equal(s.row().data.actividadGranja.jornada.plata,5000);
 s=servidor({...earned,data:{...earned.data,actividadGranja:{...earned.data.actividadGranja,jornada:{...earned.data.actividadGranja.jornada,dia:'2000-01-01'}}}});assert.equal((await s.call(request)).status,400,'no cobra progreso de ayer');
 console.log('OK: reclamar manual, auth, pruebas de progreso, recibos, doble clic, CAS, limite diario y cambio de dia.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',source)(require,__dirname);
