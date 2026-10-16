'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),save=fs.readFileSync(path.join(root,'public/game/save.js'),'utf8');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':save.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')}),run=s=>vm.runInContext(s,ctx);
const mem=new Map();let writes=0,reads=0,logout=0;
ctx.console=console;
// El arnés general desactiva timers; aquí los reintentos de lectura deben resolver.
ctx.setTimeout=(f,ms)=>[1200,2400,3600].includes(ms)?setImmediate(f):0;
let stage='inicio';const watchdog=setTimeout(()=>{console.error('Prueba incompleta: '+stage);process.exit(1);},5000);
function setup({row=null,authError=null,network=false,readError=false,id='qa',writeError=false}={}){
 run('estadoDeCero();UID="qa";CARGA_OK=false;CARGA_FALLO=false;SOLO_LOCAL=false;CUENTA_PREVIA=true;PUERTA_EMAIL=false;window.NICK="Viejo";');
 writes=reads=logout=0;
 ctx.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
 ctx.saveFarm=async()=>{writes++;if(!writeError)run('SAVE_CONFIRMACIONES.set(UID,(SAVE_CONFIRMACIONES.get(UID)||0)+1)');};ctx.log=()=>{};ctx.toast=()=>{};
 ctx.sbFixture={auth:{getUser:async()=>{if(network)throw Error('offline');return{data:{user:authError?null:{id}},error:authError};},signOut:async()=>{logout++;}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return{data:row,error:readError?{message:'offline'}:null};}})})})};run('sb=sbFixture');
 // Misma cuenta y mucho más progreso local: nunca debe ganar a la nube.
 const backup={uid:'qa',nivel:25,plata:99999,data:{level:25,plata:99999}};
 mem.set(run('GF_COPIA_KEY'),JSON.stringify(backup));
}
(async()=>{
 stage='ready';await ctx.SAVE_READY;await new Promise(setImmediate);
 stage='nube existente';
 setup({row:{data:{level:2,plata:8},name:'[Veterano] Nube',updated_at:'2026-10-16T18:00:00Z'}});
 assert.equal(await ctx.loadFarm(),true);assert.equal(ctx.G.level,2);assert.equal(ctx.G.plata,8);assert.equal(ctx.NICK,'Nube');assert.equal(writes,0);
 setup();assert.equal(await ctx.loadFarm(),false);assert.equal(ctx.G.level,1);assert.equal(ctx.G.plata,3);assert.equal(writes,1);assert.equal(run('CUENTA_PREVIA'),false);
 assert.equal(run('CARGA_OK'),true);
 setup({writeError:true});await ctx.loadFarm();assert.equal(run('CARGA_OK'),false);assert.equal(run('CARGA_FALLO'),true);
 setup();const c=JSON.parse(mem.get(run('GF_COPIA_KEY')));c.uid=null;mem.set(run('GF_COPIA_KEY'),JSON.stringify(c));
 await ctx.loadFarm();assert.equal(ctx.G.level,1);assert.equal(ctx.G.plata,3);
 setup({authError:{status:403,code:'user_not_found'}});assert.equal(await ctx.loadFarm(),false);assert.equal(run('UID'),null);assert.equal(run('PUERTA_EMAIL'),true);assert.equal(run('CARGA_OK'),false);assert.equal(reads,0);assert.equal(writes,0);assert.equal(logout,1);
 setup({network:true});await ctx.loadFarm();assert.equal(run('CARGA_FALLO'),true);assert.equal(run('CARGA_OK'),false);assert.equal(run('SOLO_LOCAL'),false);assert.equal(writes,0);assert.equal(ctx.G.level,1);
 setup({authError:{status:503}});await ctx.loadFarm();assert.equal(run('UID'),'qa');assert.equal(logout,0);assert.equal(run('CARGA_FALLO'),true);
 setup({readError:true});await ctx.loadFarm();assert.equal(reads,3);assert.equal(writes,0);assert.equal(run('CARGA_OK'),false);assert.equal(ctx.G.level,1);
 setup({id:'otra'});await ctx.loadFarm();assert.equal(reads,0);assert.equal(writes,0);assert.equal(run('CARGA_FALLO'),true);
 setup();run('UID=null;PUERTA_EMAIL=true;');await ctx.loadFarm();assert.equal(run('CARGA_FALLO'),false);assert.equal(run('CARGA_OK'),false);assert.equal(writes,0);assert.equal(ctx.G.level,1);
 setup();const ref=run('SB_REF');mem.set('sb-'+ref+'-auth-token','viejo');mem.set('gf-cuenta-'+ref,'viejo');mem.set('otro-proyecto','conservar');
 ctx.prepararEpocaServidor();assert.equal(mem.has('sb-'+ref+'-auth-token'),false);assert.equal(ctx.copiaLeer(),null);assert.equal(mem.get('otro-proyecto'),'conservar');
 mem.set('sb-'+ref+'-auth-token','nuevo');ctx.prepararEpocaServidor();assert.equal(mem.get('sb-'+ref+'-auth-token'),'nuevo','época se aplica una vez, no cierra cada login');
 console.log('OK: manda nube, copia ajena/huérfana no resucita, cuenta eliminada va a acceso, red bloquea sin borrar, época aislada/idempotente');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
