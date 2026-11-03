'use strict';
// Exercise the real transaction coordinator with an isolated server double.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/game/save.js'),'utf8');
const coordinator=source.slice(source.indexOf('async function economiaSolicitar('),source.indexOf('async function mercadoP2POperar('));
const op='11111111-1111-4111-8111-111111111111',base='2026-11-03T12:00:00.000Z';
function fixture(options={}){
 let pending=false,hydrated=0,restarts=0,refreshes=0,unlocked=0,calls=[];
 const messages=[],G={golden:20},row={golden:19,produccion:{premium:{v:1,compras:[]}}};
 const c={MERCADO_EN_CURSO:null,sb:{functions:{invoke:async(name,{body})=>{
   calls.push({name,body:structuredClone(body)});assert.equal(G.golden,20,'no optimistic Golden debit');
   if(options.failFirst&&calls.length===1)throw Error('lost response');
   if(options.conflict)return{error:{context:{status:409,json:async()=>({error:'version conflict'})}}};
   return{data:{ok:true,data:row,updated_at:base,cobro:0}};
 } }},UID:'qa',CARGA_OK:true,SOLO_LOCAL:false,SAVE_CONFLICTOS:new Set(),SAVE_CONFIRMACIONES:new Map(),SAVE_BASES:new Map(),G,
 window:{crypto:{randomUUID:()=>op},FARM:{scene:{isActive:()=>true}}},
 mercadoBloquearPantalla:()=>()=>unlocked++,saveFarm:()=>{if(!options.noSave){c.SAVE_CONFIRMACIONES.set('qa',1);c.SAVE_BASES.set('qa',base);}return Promise.resolve();},
 conTope:p=>p,mercadoMarcarPendiente:()=>{pending=true;},mercadoLimpiarPendiente:()=>{pending=false;},mercadoPendiente:()=>pending,
 hydrate:d=>{hydrated++;G.golden=d.golden;},snapshot:()=>G,copiaGuardar:()=>{},refreshHud:()=>{},
 isOpen:id=>id==='ov-cobertizo',refreshCobertizo:()=>refreshes++,usdtProgramarPendiente:()=>{},
 reiniciarGranjaSuave:()=>restarts++,toast:(...a)=>messages.push(a),fmtGolden:String,fmtPlata:String,
 console,JSON,Date,Math,Object,Promise};
 vm.createContext(c);vm.runInContext(coordinator,c);
 return{c,calls,messages,G,result:()=>({pending,hydrated,restarts,refreshes,unlocked})};
}
(async()=>{
 let f=fixture({failFirst:true});const purchase={accion:'comprar',tipo:'tree',precioEsperado:1};
 let r=await f.c.economiaSolicitar({produccionPremium:purchase});assert(r.ok);
 assert.equal(f.calls.length,2);assert(f.calls.every(x=>x.name==='produccion-premium'));
 assert.deepEqual(f.calls[0].body,f.calls[1].body,'transport retry keeps the same operation and expected price');
 assert.deepEqual(f.calls[0].body.produccionPremium,purchase);assert.equal(f.calls[0].body.op,op);assert.equal(f.calls[0].body.base,base);
 assert.equal(f.G.golden,19);assert.deepEqual(f.result(),{pending:false,hydrated:1,restarts:0,refreshes:1,unlocked:1});
 f=fixture();r=await f.c.economiaSolicitar({produccionPremium:{accion:'colocar',id:op,cx:352,by:384}});
 assert(r.ok);assert.equal(f.result().restarts,0,'placement caller reveals the node in place without an unnecessary scene restart');assert.equal(f.calls[0].body.produccionPremium.cx,352);
 f=fixture({conflict:true});await f.c.economiaSolicitar({produccionPremium:purchase});assert.equal(f.result().hydrated,0);assert.equal(f.G.golden,20);assert(f.c.SAVE_CONFLICTOS.has('qa'));
 f=fixture({noSave:true});await f.c.economiaSolicitar({produccionPremium:purchase});assert.equal(f.calls.length,0,'no purchase before a confirmed save');assert.equal(f.G.golden,20);
 f=fixture();f.c.SOLO_LOCAL=true;await f.c.economiaSolicitar({produccionPremium:purchase});assert.equal(f.calls.length,0,'local game cannot purchase');
 const live=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')).ctx;
 vm.runInContext('estadoDeCero()',live);
 const snap=JSON.parse(JSON.stringify(live.snapshot()));
 live.hydrate(snap);assert.equal(Object.hasOwn(live.snapshot().produccion,'premium'),false,'existing farms without premium rights keep the same save shape');
 const book={v:1,compras:[{id:op,tipo:'tree',coste:1,desde:Date.now(),nodo:null}]};
 snap.produccion.premium=book;live.hydrate(snap);
 assert.deepEqual(JSON.parse(JSON.stringify(live.snapshot().produccion.premium)),book,'real hydrate/snapshot round trip retains purchased rights');
 snap.produccion.premium={v:1,compras:[{...book.compras[0],coste:-1}]};live.hydrate(snap);
 assert.equal(live.produccionPremiumHistorial(),null,'malformed server response stays blocked instead of becoming an empty purchase history');
 console.log('OK: premium endpoint, one operation across retries, expected price, no optimistic debit, confirmed placement refresh, CAS failure and offline/pre-save blocks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
