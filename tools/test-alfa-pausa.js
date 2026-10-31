const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),express=require('express'),{JSDOM}=require('jsdom');
const {pausaRegistro}=require('../src/alpha-access');
(async()=>{
 const app=express();app.use(pausaRegistro);app.use((_,r)=>r.send('siguiente'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{for(const path of ['/','/index.html','/%69ndex.html']){const r=await fetch(base+path);const h=await r.text();assert(h.includes('La alfa se ha pospuesto'));assert(!h.includes('__REGISTRO_CONFIG__'));assert(!h.includes('phaser'));assert(!h.includes('game/main.js'));assert.equal(r.headers.get('cache-control'),'no-store');}assert.equal(await(await fetch(base+'/equipo/')).text(),'siguiente');}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 const html=fs.readFileSync('public/registro-pausa.html','utf8'),source=fs.readFileSync('public/registro-pausa.js','utf8');
 for(const confirmed of [false,true]){
  const dom=new JSDOM(html.replace('__REGISTRO_CONFIG__','{}'),{url:'https://goldenfarm.onrender.com/'}),w=dom.window;let calls=[],signedOut=0;
  w.GOLDEN_REGISTRO={url:'qa',key:'public'};w.supabase={createClient:(url,key,opts)=>{assert.equal(opts.auth.persistSession,false);return{auth:{getSession:async()=>({data:{session:confirmed?{}:null}}),getUser:async()=>({data:{user:{}},error:null}),signOut:async opts=>{assert.equal(opts.scope,'local');signedOut++;},signInWithOtp:async args=>{calls.push(args);return{error:null};}}};}};
  vm.runInContext(source,vm.createContext({window:w,document:w.document,location:w.location,history:w.history,console}));await new Promise(r=>setImmediate(r));
  if(confirmed){assert.equal(signedOut,1);assert(w.document.getElementById('estado').textContent.includes('acceso al juego sigue cerrado'));}
  w.document.getElementById('nick').value='QA';w.document.getElementById('email').value='qa@example.invalid';w.document.getElementById('registro').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);assert.equal(calls[0].options.shouldCreateUser,true);assert.equal(calls[0].options.emailRedirectTo,'https://goldenfarm.onrender.com/');assert(!w.document.querySelector('[data-login]'));
 }
 console.log('OK: registro abierto sin cargar juego, correo confirmable sin entrar, sesiones de confirmacion no persistentes y rutas antiguas cubiertas.');
})().catch(e=>{console.error(e);process.exitCode=1;});
