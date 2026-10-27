'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(root+'/public/game/save.js','utf8'),edge=stripTypeScriptTypes(fs.readFileSync(root+'/supabase/functions/guardar/index.ts','utf8')).replace(/^import .*createClient.*;\s*$/m,'');
const clone=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 let handle,rpcCalls=0,mode='ok';const admin={auth:{getUser:async()=>({data:{user:{id:'qa'}}})},rpc:async(name,p)=>{rpcCalls++;assert.equal(name,'p2p_operar');assert.equal(p.p_uid,'qa');return mode==='ok'?{data:{ok:true,data:{plata:3},updated_at:'v2'}}:{error:{code:'P0001',message:'conflicto: otra sesión'}};}};
 const sc={Response,Request,Date,Math,JSON,Number,Object,Array,Set,String,isFinite,createClient:()=>admin,Deno:{env:{get:()=>''},serve:f=>handle=f}};vm.createContext(sc);vm.runInContext(edge,sc);
 const body={cuenta:'qa',base:'v1',op:'a7270001-0000-4000-8000-000000000001',p2p:{accion:'comprar',id:1,price:5}};
 const call=b=>handle(new Request('https://qa.invalid/guardar',{method:'POST',headers:{Authorization:'Bearer qa'},body:JSON.stringify(b)}));
 assert.equal((await call(body)).status,200);assert.equal((await call({...body,cuenta:'otra'})).status,409);assert.equal((await call({...body,op:'inválido'})).status,400);assert.equal(rpcCalls,1);mode='conflict';assert.equal((await call(body)).status,409);
 const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':source.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
 const run=s=>vm.runInContext(s,c);c.crypto=require('crypto').webcrypto;for(const k of ['toast','log','refreshHud','syncSlots','refreshHotbar','refreshMarket','showSaving','showSaved'])c[k]=()=>{};c.isOpen=()=>false;
 let remote,version=1,requests=[],lost=true,failed=false;
 function reset(){c.estadoDeCero();c.G.plata=100;remote=clone(c.snapshot());requests=[];version=1;run("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_CONFLICTOS.clear();SAVE_BASES.set('qa','v1');");}
 const ops=new Set();
 c.qaSb={functions:{invoke:async(_,p)=>{
  if(!p.body.p2p){remote=clone(p.body.data);version++;return{data:{ok:true,updated_at:'v'+version}};}
  requests.push(p.body);if(failed)return{error:{context:{status:503}}};
  if(!ops.has(p.body.op)){ops.add(p.body.op);remote.plata-=10;remote.mkPend=[{kind:'res',item:'madera',qty:2,payload:null}];version++;if(lost){lost=false;return{error:{context:{status:503}}};}}
  return{data:{ok:true,data:clone(remote),updated_at:'v'+version}};
 }},auth:{getUser:async()=>({data:{user:{id:'qa'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{data:clone(remote),updated_at:'v'+version,name:'QA'}})})})})};
 reset();run('sb=qaSb');const p=c.marketComprar({id:1,price:10});await c.marketComprar({id:1,price:10});await p;await c.saveFarm(true);
 assert.equal(requests.length,2,'respuesta perdida reintenta, doble clic no crea otra operación');assert.equal(requests[0].op,requests[1].op);assert.equal(c.G.plata,90);assert.equal(c.G.res.madera,2);assert.equal(c.G.mkPend.length,0);assert.equal(remote.res.madera,2);
 reset();run('sb=qaSb');failed=true;await c.marketComprar({id:2,price:10});assert.equal(c.G.plata,100);assert.equal(c.G.res.madera||0,0);assert.equal(run("SAVE_CONFLICTOS.has('qa')"),true);assert.equal(c.mercadoPendiente('qa'),true);
 // Simula un commit cuya respuesta se perdió: al cargar vuelve saldo y entrega del servidor.
 remote.plata=90;remote.mkPend=[{kind:'res',item:'madera',qty:2,payload:null}];failed=false;assert.equal(await c.loadFarm(),true);assert.equal(c.G.plata,90);assert.equal(c.G.mkPend.length,1);assert.equal(c.mkPendCobrar(),1);await c.saveFarm(true);assert.equal(c.G.res.madera,2);assert.equal(c.mkPendCobrar(),0,'reclamar otra vez no duplica');
 console.log('OK: P2P autenticado con cuenta/base/recibo, conflicto, doble clic, respuesta perdida, sin débito especulativo y entrega recuperable una sola vez. SQL real cubierto por sql/test-p2p-atomico.sql.');
})().catch(e=>{console.error(e);process.exitCode=1;});
