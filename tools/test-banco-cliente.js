'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const repo=path.resolve(__dirname,'..'),save=fs.readFileSync(path.join(repo,'public/game/save.js'),'utf8');
const {ctx,elementos}=require('./arrancar-el-juego.contexto').arrancar(repo,{'game/main.js':'','game/save.js':save.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')}),run=s=>vm.runInContext(s,ctx);
ctx.crypto=require('node:crypto').webcrypto;ctx.toast=()=>{};ctx.refreshHud=()=>{};ctx.isOpen=()=>false;ctx.log=()=>{};ctx.showSaving=()=>{};ctx.showSaved=()=>{};
const memory=new Map();ctx.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let cloud,at='2026-10-16T22:00:00.000Z',attempts=0,commits=0,firstOp;
const source=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8'),rules=source.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0];
const server={Number,Math,JSON,Object,Array,Set,String,Date,isFinite};vm.createContext(server);vm.runInContext(rules.slice(rules.indexOf('const VERSION')),server);
ctx.qaSb={functions:{invoke:async(name,{body})=>{
 assert.equal(name,'guardar');
 if(body.banco?.accion==='cotizar')return {data:{ok:true,tasa:10000,revision:'plata-golden:10000',usdt:false}};
 if(!body.banco){cloud=structuredClone(body.data);at=new Date(Date.parse(at)+1).toISOString();return {data:{ok:true,updated_at:at}};}
 attempts++;if(!firstOp){firstOp=body.op;const r=server.bancoOperacion(cloud,body.banco,body.op,10000);assert.ok(!r.error);cloud=r.data;commits++;at=new Date(Date.parse(at)+1).toISOString();throw Error('respuesta perdida');}
 assert.equal(body.op,firstOp);return {data:{ok:true,data:cloud,updated_at:at,cobro:1,repetido:true}};
}}};
run("estadoDeCero();sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;G.plata=25000;SAVE_BASES.set(UID,'2026-10-16T22:00:00.000Z');mercadoBloquearPantalla=()=>()=>{};copiaGuardar=()=>{};");
const watchdog=setTimeout(()=>{console.error('Prueba incompleta');process.exit(1);},5000);
(async()=>{
 await ctx.SAVE_READY;await ctx.bancoCotizar();assert.equal(ctx.bancoCotizacionValida(),true);
 ctx.refreshBanco(false);elementos['banco-cantidad'].value='1';ctx.bancoActualizarPrevia();assert.equal(elementos['banco-canjear'].disabled,false);
 elementos['banco-cantidad'].value='3';ctx.bancoActualizarPrevia();assert.equal(elementos['banco-canjear'].disabled,true);
 await ctx.bancoSolicitar(1,'plata-golden:10000');assert.equal(attempts,2);assert.equal(commits,1);assert.equal(ctx.G.plata,15000);assert.equal(ctx.G.golden,21);assert.equal(ctx.mercadoPendiente('qa'),false);
 const snap=JSON.parse(JSON.stringify(ctx.snapshot()));ctx.hydrate(snap);assert.equal(ctx.G.banco.ops.length,1,'F5 conserva libro protegido');
 run('BANCO_COTIZACION.recibido=Date.now()-60001');ctx.bancoActualizarPrevia();assert.equal(elementos['banco-canjear'].disabled,true,'no ofrece una tasa vencida');
 assert.equal(run("typeof OV_REFRESH['ov-banco']"),'function');
 const html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8');assert.ok(html.includes('data-panel="ov-banco"'));assert.ok(html.includes('Depósitos USDT · desactivados'));assert.ok(!html.includes('data-cur="golden"'));
 console.log('OK: Banco cliente cotiza, muestra coste y saldo, bloquea insuficiente/vencido, guarda antes del canje y recupera respuesta perdida sin duplicar.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
