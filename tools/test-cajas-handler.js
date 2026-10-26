const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');let source=fs.readFileSync(root+'/tools/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
source=source.replace('const ctx={Response,Request,','const ctx={crypto:require("node:crypto").webcrypto,Response,Request,');
source+=`(async()=>{
 const p={cuenta:'qa',base,op:'33333333-3333-4333-8333-333333333333',pack:{id:'caja'},premio:{item:'golden',qty:999999},azar:0};
 let s=servidor(inicial),r=await s.call(p);assert.equal(r.status,200);const first=await r.json();assert.ok(first.premio);assert.equal(s.row().data.golden,19);assert.equal(s.row().data.mkPend.length,1);assert.notEqual(first.premio.item,'golden','ignora premio propuesto por navegador');
 r=await s.call(p);assert.equal(r.status,200);const again=await r.json();assert.equal(again.repetido,true);assert.deepEqual(again.premio,first.premio);assert.equal(s.writes(),1,'respuesta perdida no vuelve a cobrar ni sortear');
 assert.equal((await s.call({...p,cuenta:'otra'})).status,409);assert.equal((await s.call(p,false)).status,401);
 s=servidor(inicial);const rs=await Promise.all([s.call(p),s.call({...p,op:'44444444-4444-4444-8444-444444444444'})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);const win=await rs.find(r=>r.status===200).json();assert.deepEqual(win.premio,s.row().data.packs.ops[0].premio);assert.equal(s.row().data.packs.cajas.count,1);
 s=servidor({...inicial,data:{...inicial.data,golden:0}});assert.equal((await s.call(p)).status,400);assert.equal(s.writes(),0);
 s=servidor(inicial,{readError:true});assert.equal((await s.call(p)).status,503);assert.equal(s.writes(),0);
 console.log('OK: handler real de cajas con auth, premio criptográfico, saldo, CAS concurrente, recibo y errores sin escrituras.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',source)(require,__dirname);
