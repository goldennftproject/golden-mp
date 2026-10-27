'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const s=fs.readFileSync(path.resolve(__dirname,'../public/game/save.js'),'utf8'),start=s.indexOf('async function fetchSupabase('),end=s.indexOf('\n}',start)+2;
const timers=new Set();const c={AbortController,Response,fetch:null,setTimeout:f=>{timers.add(f);return f;},clearTimeout:f=>timers.delete(f)};vm.createContext(c);vm.runInContext(s.slice(start,end),c);
(async()=>{
 let aborted=0;c.fetch=(_,o)=>new Promise((_,reject)=>o.signal.addEventListener('abort',()=>{aborted++;reject(Error('abort'));}));
 const p=c.fetchSupabase('https://qa.invalid/guardar').catch(e=>e.message);[...timers][0]();assert.equal(await p,'abort');assert.equal(aborted,1);assert.equal(timers.size,0,'limpia el timeout tras abortar');
 // También se corta un cuerpo colgado después de recibir los encabezados.
 c.fetch=async(_,o)=>new Response(new ReadableStream({start(stream){o.signal.addEventListener('abort',()=>stream.error(Error('body abort')));}}));
 const body=c.fetchSupabase('https://qa.invalid/guardar').catch(e=>e.message);await Promise.resolve();[...timers][0]();assert.equal(await body,'body abort');assert.equal(timers.size,0);
 for(const status of [200,404,204]){c.fetch=async()=>new Response(status===204?null:'{"ok":true}',{status,headers:{'Content-Type':'application/json'}});const r=await c.fetchSupabase('https://qa.invalid');assert.equal(r.status,status);assert.equal(await r.text(),status===204?'':'{"ok":true}');assert.equal(timers.size,0);}
 const external=new AbortController();external.abort();c.fetch=async(_,o)=>{assert.equal(o.signal.aborted,true);throw Error('external abort');};assert.equal(await c.fetchSupabase('qa',{signal:external.signal}).catch(e=>e.message),'external abort');assert.equal(timers.size,0);
 assert.ok(s.includes('global:{fetch:fetchSupabase}'));
 console.log('OK: transporte y cuerpo se abortan, señales externas respetadas, estado/JSON/204 conservados y temporizadores limpiados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
