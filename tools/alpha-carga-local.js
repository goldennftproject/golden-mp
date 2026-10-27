'use strict';
// Sólo loopback y un proceso propio: nunca genera carga contra Supabase o Render.
const http=require('http'),net=require('net'),path=require('path'),fs=require('fs'),{spawn}=require('child_process'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..'),out=process.argv[2];if(!out||process.argv.length>3)throw Error('Uso: node tools/alpha-carga-local.js resultado.json');
const espera=ms=>new Promise(r=>setTimeout(r,ms)),pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return Math.round(s[Math.ceil(s.length*p)-1]*100)/100;};
(async()=>{const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 let logs='';const child=spawn(process.execPath,['src/index.js'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',RENDER_GIT_COMMIT:'alpha-local-qa'},stdio:['ignore','pipe','pipe']});for(const pipe of [child.stdout,child.stderr])pipe.on('data',x=>{logs=(logs+x.toString()).slice(-16000);});
 const base='http://127.0.0.1:'+port,streams=[],result={alcance:'HTTP y SSE locales; no simula navegadores, guardados de Supabase ni capacidad del Free real',fases:[]};
 try{let ready=false;for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error('Servidor terminó: '+logs);try{const r=await fetch(base+'/healthz',{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await espera(100);}if(!ready)throw Error('No inició: '+logs);
 for(const conexiones of [10,25,50]){let fallos=0;const tiempos=[],sizes=[];
  await Promise.all(Array.from({length:conexiones},()=>new Promise((resolve,reject)=>{let hecho=false;const q=http.get(base+'/events',{headers:{'Accept-Encoding':'gzip'}},res=>{res.on('data',d=>{if(!hecho&&d.toString().includes('data: ')){hecho=true;resolve();}});res.on('error',e=>{if(!hecho)reject(e);});});q.on('error',reject);q.setTimeout(10000,()=>q.destroy(Error('SSE timeout')));streams.push(q);})));
  const paths=['/healthz','/version','/game/config.js?b=alpha-local','/assets/atlas.png'];
  await Promise.all(Array.from({length:conexiones},async()=>{for(const p of paths){const t=performance.now();try{const r=await fetch(base+p,{signal:AbortSignal.timeout(15000)}),buf=await r.arrayBuffer();sizes.push(buf.byteLength);if(!r.ok)fallos++;}catch{fallos++;}tiempos.push(performance.now()-t);}}));
  result.fases.push({ventanas_sse:conexiones,peticiones:tiempos.length,fallos,p50_ms:pct(tiempos,.5),p95_ms:pct(tiempos,.95),max_ms:Math.round(Math.max(...tiempos)),bytes_recibidos:sizes.reduce((a,b)=>a+b,0)});
  while(streams.length)streams.pop().destroy();await espera(150);
 }
 fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.fases.some(x=>x.fallos))process.exitCode=1;
 }finally{while(streams.length)streams.pop().destroy();child.kill();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
