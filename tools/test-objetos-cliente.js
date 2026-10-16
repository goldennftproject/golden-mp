'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),fs=require('node:fs');
const repo=path.resolve(__dirname,'..'),{ctx}=require('./arrancar-el-juego.contexto').arrancar(repo),run=s=>vm.runInContext(s,ctx);
const source=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8');
const block=source.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0];
const edge={console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite};vm.createContext(edge);vm.runInContext(block.slice(block.indexOf('const VERSION')),edge);
ctx.crypto=require('node:crypto').webcrypto;
const avisos=[];ctx.toast=s=>avisos.push(s);ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.isOpen=()=>false;ctx.showSaving=()=>{};ctx.showSaved=()=>{};ctx.showSaveError=()=>{};
const mem=new Map();ctx.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
let cloud,at='2026-10-16T16:00:00.000Z',attempts=0,commits=0,lastOp,deny=false;
ctx.qaSb={functions:{invoke:async(name,{body})=>{
 assert.equal(name,'guardar');
 if(!body.artefacto){cloud=structuredClone(body.data);at=new Date(Date.parse(at)+1).toISOString();return {data:{ok:true,updated_at:at},error:null};}
 attempts++;
 if(deny)return {data:null,error:{context:{status:400,json:async()=>({error:'Operación rechazada'})}}};
 if(!lastOp){lastOp=body.op;const r=edge.artefactoOperacion(cloud,body.artefacto.accion,body.artefacto.id,Date.parse(at)+1,body.op);assert.equal(r.error,undefined);cloud=r.data;commits++;at=new Date(Date.parse(at)+1).toISOString();throw Error('Respuesta perdida tras confirmar');}
 assert.equal(body.op,lastOp,'reintento conserva el identificador');
 return {data:{ok:true,data:cloud,updated_at:at,cobro:0,repetido:true},error:null};
}}};
run("estadoDeCero();sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_BASES.set(UID,'2026-10-16T16:00:00.000Z');mercadoBloquearPantalla=()=>()=>{};copiaGuardar=()=>{};");
(async()=>{
 await ctx.SAVE_READY;await Promise.resolve();
 run("sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_CONFLICTOS.clear();");
 await ctx.artefactoSolicitar('comprar','cobre');
 assert.equal(attempts,2,JSON.stringify({avisos,at,cloud:!!cloud,ready:run('CARGA_OK'),confirm:run("SAVE_CONFIRMACIONES.get('qa')")}));assert.equal(commits,1);assert.equal(ctx.G.golden,10);assert.ok(ctx.G.artefactos.items.cobre);
 assert.equal(run("SAVE_BASES.get('qa')"),at);assert.equal(ctx.mercadoPendiente('qa'),false);
 const before=JSON.stringify(ctx.G.artefactos);deny=true;
 await ctx.artefactoSolicitar('comprar','plata');
 assert.equal(ctx.G.golden,10);assert.equal(JSON.stringify(ctx.G.artefactos),before);assert.equal(ctx.mercadoPendiente('qa'),false);
 assert.equal(run('MERCADO_EN_CURSO'),null);
 console.log('OK: cliente real sincroniza antes de comprar, recupera respuesta perdida con el mismo recibo, no duplica compras y preserva saldo ante rechazo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
