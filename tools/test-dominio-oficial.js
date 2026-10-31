const assert=require('node:assert/strict'),express=require('express');
const {redirigirDominioAntiguo}=require('../src/canonical-host');
(async()=>{const app=express();app.get('/healthz',(_,r)=>r.json({ok:true}));app.use(redirigirDominioAntiguo);app.use((_,r)=>r.send('juego'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const request=(path,host,method='GET')=>new Promise((resolve,reject)=>{const req=require('http').request(base+path,{method,headers:{Host:host}},res=>{res.resume();resolve({status:res.statusCode,headers:{get:k=>res.headers[k]??null}});});req.on('error',reject);req.end();});
 try{
 for(const path of ['/','/index.html','/equipo/','/visita.html','/?code=qa%2Bcode&next=%2Fequipo%2F','//otro-dominio.invalid/']){
 const r=await request(path,'golden-mp.onrender.com');assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://goldenfarm.onrender.com'+path);assert.equal(r.headers.get('cache-control'),'no-store');
 }
 for(const host of ['goldenfarm.onrender.com','localhost:2567']){const r=await request('/',host);assert.equal(r.status,200);assert.equal(r.headers.get('location'),null);}
 assert.equal((await request('/healthz','golden-mp.onrender.com')).status,200);
 assert.equal((await request('/','golden-mp.onrender.com','HEAD')).status,308);
 console.log('OK: un dominio de juego, rutas y query de acceso preservadas, sin bucle ni cambio de salud/local.');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
