'use strict';
// Agregados en memoria, sin rutas completas, IP, cuentas ni escrituras de base de datos.
const LIMITES=[10,50,100,250,500,1000,2500,5000,15000,60000,Infinity];
function grupo(ruta){if(ruta==='/events')return 'sse';if(ruta==='/healthz')return 'salud';if(ruta==='/version')return 'version';if(ruta==='/'||ruta==='/index.html')return 'entrada';if(ruta.startsWith('/game/'))return 'codigo';if(ruta.startsWith('/assets/'))return 'arte';return 'otros';}
function crearMetricasAlfa({version='dev',ahora=Date.now,escribir=x=>console.log(x)}={}){
 const inicio=ahora();let desde=inicio,ventanas=0,pico=0,cpu=process.cpuUsage();
 const vacio=()=>({peticiones:0,errores4xx:0,errores5xx:0,rutas:{},latencias:LIMITES.map(()=>0)});let datos=vacio();
 function registrar(ruta,status,ms){const k=grupo(String(ruta||''));datos.peticiones++;datos.rutas[k]=(datos.rutas[k]||0)+1;if(status>=400&&status<500)datos.errores4xx++;if(status>=500)datos.errores5xx++;if(k!=='sse'){const n=Math.max(0,Number(ms)||0),i=LIMITES.findIndex(x=>n<=x);datos.latencias[i<0?LIMITES.length-1:i]++;}}
 function percentil(p){const total=datos.latencias.reduce((a,b)=>a+b,0);if(!total)return null;let n=0;for(let i=0;i<LIMITES.length;i++){n+=datos.latencias[i];if(n>=Math.ceil(total*p))return Number.isFinite(LIMITES[i])?LIMITES[i]:null;}return LIMITES.at(-1);}
 function resumen(){const fin=ahora(),mem=process.memoryUsage(),uso=process.cpuUsage(cpu);return {tipo:'alpha_metricas',version,t:new Date(fin).toISOString(),intervalo_s:Math.max(0,(fin-desde)/1000),uptime_s:Math.max(0,(fin-inicio)/1000),ventanas_sse:ventanas,pico_ventanas_sse:pico,...datos,rutas:{...datos.rutas},latencias:[...datos.latencias],p50_ms_hasta:percentil(.5),p95_ms_hasta:percentil(.95),rss_mb:Math.round(mem.rss/1048576),heap_mb:Math.round(mem.heapUsed/1048576),cpu_porcentaje:Math.round((uso.user+uso.system)/Math.max(1,(fin-desde)*1000)*1000)/10};}
 function emitir(){if(!datos.peticiones&&!ventanas)return null;const r=resumen();escribir(JSON.stringify(r));datos=vacio();desde=ahora();cpu=process.cpuUsage();return r;}
 function middleware(req,res,next){const t=ahora();res.once('finish',()=>registrar(req.path,res.statusCode,ahora()-t));next();}
 function conexiones(n){ventanas=Math.max(0,Math.floor(Number(n)||0));pico=Math.max(pico,ventanas);}
 return {registrar,resumen,emitir,middleware,conexiones};
}
module.exports={crearMetricasAlfa,grupo,LIMITES};
