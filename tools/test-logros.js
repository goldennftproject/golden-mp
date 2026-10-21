'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),file=path.join(__dirname,'test-guardado-atomico.js'),h={require:createRequire(file),__dirname,Response,Request,structuredClone,console};vm.createContext(h);
const fixture=fs.readFileSync(file,'utf8').split('const base=')[0].replace('const copia=structuredClone(fila)','const copia=structuredClone(filtros.user_id!=="qa"?opciones.destinos?.[filtros.user_id]:fila)');
vm.runInContext(fixture+';globalThis.factory=servidor',h);
const op=n=>String(n).padStart(8,'0')+'-1111-4111-8111-111111111111';
(async()=>{
 const t=Date.now(),base=new Date(t-1000).toISOString(),data={plata:3,golden:20,stats:{plantar:{papa:100}},logros:{'cosechar:0':true},produccion:{v:1,vipUnico:1,base:5,nodos:{},vipHasta:0},energiaGranja:{actual:50,at:t},res:{}},seed={user_id:'qa',updated_at:base,data};
 const s=h.factory(seed),server=s.ctx,table=vm.runInContext('LOGROS_TABLA',server);
 const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root);
 assert.equal(JSON.stringify(table),vm.runInContext('JSON.stringify(LOGROS_TABLA)',c));assert.equal(Object.values(table).flat().length,25);assert.equal(Object.values(table).flat().reduce((n,r)=>n+r[1],0),16400);assert.equal(c.GF.esOcultoMvp('ov-logros'),false);
 const body={cuenta:'qa',base,op:op(1),logro:{key:'papa:0'}};
 let r=await s.call(body);assert.equal(r.status,200);assert.equal(s.row().data.plata,103);assert.equal(s.row().data.logros['cosechar:0'],true);assert.equal((await s.call(body)).status,200);assert.equal(s.writes(),1);
 for(const key of ['papa:00','papa:01','papa:3','inventado:0','papa:1','visitas:0'])assert.equal((await s.call({...body,base:s.row().updated_at,op:op(2),logro:{key}})).status,400,key);
 assert.equal((await s.call(body,false)).status,401);assert.equal((await s.call({...body,cuenta:'otra'})).status,409);
 const race=h.factory(seed),rs=await Promise.all([race.call(body),race.call({...body,op:op(3)})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(race.row().data.plata,103);
 const a=structuredClone(data);a.stats={};a.plots=[{state:'dry'}];a.seeds={papa:5};a.tools={axe:3};
 const b=structuredClone(a);b.stats={plantar:{papa:1}};b.plots=[{state:'growing',cropKey:'papa',readyAt:t+60000}];b.seeds.papa=4;b.actividadAcciones={plant:1};b.energiaGranja.actual=49;b.logrosV2={v:1,progreso:{papa:1000},cobrados:{'papa:0':true}};
 const st=h.factory({...seed,data:a});r=await st.call({base,op:'guardar-logros',data:b});assert.equal(r.status,200,await r.clone().text());assert.equal(st.row().data.logrosV2.progreso.papa,1);assert.equal(st.row().data.logrosV2.cobrados['papa:0'],undefined);
 for(const bonus of [false,true]){
  server.qaA=structuredClone(a);server.qaA.nfts={hacha_abuelo:bonus};server.qaB=structuredClone(server.qaA);
  Object.assign(server.qaB,{logrosAcciones:{madera:bonus?1.1:1},stats:{talar:{_:1}},tools:{axe:2},actividadAcciones:{chop:1},energiaGranja:{actual:48,at:t}});
  vm.runInContext('actividadActualizar(qaA,qaB,Date.now())',server);assert.equal(server.qaB.logrosV2.progreso.madera,bonus?1.1:1);
 }
 let v=server.logroVisita({produccion:{vipHasta:t+2*86400000}},'other','qa',t,op(4));assert.equal(v.data.logrosV2.progreso.visitas,1);v=server.logroVisita(v.data,'other','qa',t,op(5));assert.equal(v.data.logrosV2.progreso.visitas,1);v=server.logroVisita(v.data,'other','qa',t+86400000,op(6));assert.equal(v.data.logrosV2.progreso.visitas,2);
 assert.ok(server.logroVisita({},'other','qa',t,op(4)).error);assert.ok(server.logroVisita({produccion:{vipHasta:t+1}},'qa','qa',t,op(4)).error);
 const id='22222222-2222-4222-8222-222222222222',vis=h.factory({...seed,data:{...data,produccion:{...data.produccion,vipHasta:t+86400000}}},{destinos:{[id]:{user_id:id,name:'Vecino',data:{plots:[]}}}}),vb={cuenta:'qa',base,op:op(7),visita:{accion:'ver',destino:id}};
 r=await vis.call(vb);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).granja.id,id);assert.equal(vis.row().data.logrosV2.progreso.visitas,1);assert.equal(vis.row().data.seeds,undefined);assert.equal((await vis.call(vb)).status,200);assert.equal(vis.writes(),1);
 c.estadoDeCero();c.G.logrosAcciones={madera:3};c.logrosRecibir({v:1,progreso:{papa:100},cobrados:{},registro:{madera:1}});assert.equal(c.G.logrosAcciones.madera,3);let pedido;c.economiaSolicitar=d=>{pedido=d;return Promise.resolve()};const saldo=c.G.plata;await c.logroCobrar('papa:0');assert.equal(pedido.logro.key,'papa:0');assert.equal(c.G.plata,saldo);
 console.log('OK: 25 metas, 16.400 Plata, evidencia, unidades NFT, visitas VIP únicas por día, historial, CAS y cobros idempotentes.');
})().catch(e=>{console.error(e);process.exitCode=1});
