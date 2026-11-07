'use strict';
// Real overlay/drag/roulette handlers, isolated DOM and read-only synthetic data.
// Usage: node tools/test-market-window-functional.cjs [repo] [candidate-script]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {JSDOM,VirtualConsole}=require(path.join(repo,'node_modules/jsdom'));
const html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8');
const ui=fs.readFileSync(path.join(repo,'public/game/ui.js'),'utf8');
const config=fs.readFileSync(path.join(repo,'public/game/config.js'),'utf8');
const roulette=fs.readFileSync(path.join(repo,'public/game/ruletas.js'),'utf8');
const candidate=fs.readFileSync(process.argv[3]||path.join(repo,'public/game/market-window.js'),'utf8');
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,'Real handler boundaries changed: '+start);return source.slice(a,b);}
const overlays=between(ui,'function isOpen(id)','/* ---- HUD ---- */');
const drag=between(ui,'const DRAG_EXCLUDE =','// el aviso de interacción va SIEMPRE');
const quantity=between(ui,'function cuantoAtajo(q, max)','/* 8/9 (Suren) — LA VISTA');
const confirm=between(ui,'function cerrarConfirmacionLocal()','// qué se tiraría');
const bindClose=ui.split(/\r?\n/).find(line=>line.includes('document.querySelectorAll("[data-close]").forEach'));
assert(bindClose,'Real close binding missing');
const gateNames=['ALTAR_ACTIVO','esAltarOculto','MVP','PASE_ACTIVO','PESCA_ACTIVA','esPescaOculta','MVP_OCULTOS','esOcultoMvp'];
const gates=config.split(/\r?\n/).filter(line=>gateNames.some(name=>line.startsWith('GF.'+name+' ='))).join('\n');
assert.equal(gates.split('\n').length,gateNames.length);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const report={suite:'Shared Mercado frame functional regression',scenarios:[],passed:false};
async function scenario(width,renovado){
 const runtimeErrors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>runtimeErrors.push(e.message));
 const dom=new JSDOM(html,{url:'https://goldenfarm.invalid/',runScripts:'outside-only',virtualConsole:vc}),w=dom.window,d=w.document;
 Object.defineProperty(w,'innerWidth',{value:width,writable:true});Object.defineProperty(w,'innerHeight',{value:700,writable:true});
 d.documentElement.classList.toggle('visual-v2',renovado);w.GF={};w.eval(gates);
 const originalFlags=JSON.stringify(w.GF),queries=[],images=[];
 w.G={golden:1,plata:0,mkPend:[]};const gameBefore=JSON.stringify(w.G);
 w.fetch=()=>{throw Error('Remote fetch forbidden');};for(const key of ['XMLHttpRequest','WebSocket','EventSource'])w[key]=class{constructor(){throw Error(key+' forbidden');}};
 for(const key of ['sb','UID'])Object.defineProperty(w,key,{configurable:true,get(){throw Error('Account access forbidden: '+key);}});
 w.localStorage.setItem('qa-sentinel','preserve');w.toast=()=>{};w.tutoHighlight=()=>{};
 w.Image=class{set src(v){images.push(v);queueMicrotask(()=>this.onload?.());}};
 w.qaRefresh=[];
 w.eval('function $(id){return document.getElementById(id)}\n'+overlays+'\nObject.keys(OV_REFRESH).forEach(id=>{OV_REFRESH[id]=()=>window.qaRefresh.push(id)});');
 w.eval(drag);w.eval(quantity);w.eval(confirm);w.eval(bindClose);
 const allOriginal=[...d.querySelectorAll('[id]')].map(node=>({id:node.id,node}));
 const controls=[...d.querySelectorAll('.ov input,.ov button,.ov select,.ov textarea')].map(node=>({node,parent:node.parentElement,disabled:node.disabled}));
 w.eval(candidate);d.dispatchEvent(new w.Event('DOMContentLoaded'));await tick();await tick();
 const staticOverlays=[...d.querySelectorAll('.ov[id]')];assert.equal(staticOverlays.length,47);
 const opened=[],paused=[],closedByX=[],closedOperational=[];
 for(const ov of staticOverlays){
  w.openOv(ov.id);const blocked=w.GF.esAltarOculto(ov.id)||w.GF.esPescaOculta(ov.id)||w.GF.esOcultoMvp(ov.id);
  if(blocked){assert(!ov.classList.contains('show'),'Paused gate bypassed '+ov.id);paused.push(ov.id);continue;}
  assert(ov.classList.contains('show'),'Cannot open '+ov.id);opened.push(ov.id);
  const focusable=ov.querySelector('input:not(:disabled),select:not(:disabled),button:not(:disabled)');focusable?.focus();
  const x=ov.querySelector('[data-close]');if(x){x.click();closedByX.push(ov.id);}else{w.closeOv(ov.id);closedOperational.push(ov.id);}
  assert(!ov.classList.contains('show'),'Cannot close '+ov.id);assert(!ov.contains(d.activeElement),'Hidden input retains focus '+ov.id);
 }
 for(const item of allOriginal)assert.equal(d.getElementById(item.id),item.node,'ID replaced '+item.id);
 for(const item of controls){assert.equal(item.node.parentElement,item.parent,'Control reparented');assert.equal(item.node.disabled,item.disabled,'Control disabled state changed');}
 // The production close-all path must preserve training and release ordinary panels.
 w.openOv('ov-perfil');w.openOv('ov-inv');w.openOv('ov-entrenando');assert.equal(d.activeElement.id,'entr-fin');
 w.closeAllOv();assert(!d.getElementById('ov-perfil').classList.contains('show'));assert(!d.getElementById('ov-inv').classList.contains('show'));assert(d.getElementById('ov-entrenando').classList.contains('show'));w.closeOv('ov-entrenando');
 // Drag begins from the new inner plaque; stationary clicks must not steal capture.
 const card=d.querySelector('#ov-perfil>.card'),plaque=card.querySelector('.wood-menu-title');let captures=0;
 card.getBoundingClientRect=()=>({x:100,y:100,left:100,top:100,right:500,bottom:400,width:400,height:300});
 Object.defineProperty(card,'offsetWidth',{value:400});Object.defineProperty(card,'offsetHeight',{value:300});card.setPointerCapture=()=>captures++;
 w.makeHoldDrag(card);const pointer=(target,type,x,y)=>target.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
 pointer(plaque,'pointerdown',110,110);pointer(card,'pointerup',110,110);assert.equal(captures,0,'Stationary title click captured pointer');
 pointer(plaque,'pointerdown',110,110);pointer(card,'pointermove',140,150);pointer(card,'pointerup',140,150);
 assert.equal(captures,1);assert.equal(card.style.left,'130px');assert.equal(card.style.top,'140px');assert(card.classList.contains('movida'));
 // Live quantity and confirmation handlers can rerender titles after decoration.
 let accepted=0;w.pedirCuanto(37,'¿Cuántas maderas?',null,n=>accepted=n);await tick();
 assert.equal(d.querySelector('#cu-title .wood-menu-title').textContent,'¿Cuántas maderas?');
 if(width>640)assert.equal(d.activeElement.id,'cu-num');d.getElementById('cu-num').value='12';d.getElementById('cu-ok').click();assert.equal(accepted,12);assert(!d.getElementById('ov-cuanto').classList.contains('show'));
 let confirmed=0;w.askConfirm('Sólo una prueba local',()=>confirmed++,{title:'Confirmación de ejemplo'});await tick();
 assert.equal(d.querySelector('#cf-title .wood-menu-title').textContent,'Confirmación de ejemplo');d.getElementById('cf-no').click();assert.equal(confirmed,0);assert(!d.getElementById('ov-confirm').classList.contains('show'));
 // Create the actual roulette after the decorator: keep tabs, close and return focus.
 const state={habilitado:true,juegoAbierto:true,config:{golden:{ticket:1,seed:10,aporteBote:.8,aporteReserva:.2,pesoJackpot:20,escala:10000},objetos:{gratis:3,max:5,precios:[100,200],premios:[]}},bote:10,reserva:0,financiado:true,usados:0,gratisRestantes:3,precioPlata:0};
 w.matchMedia=()=>({matches:true});w.ruletasPendiente=()=>false;w.mkPendCount=()=>0;
 w.ruletasConsultar=async()=>{queries.push('local-read');return{estado:state,found:false}};
 w.ruletasGirar=()=>{throw Error('No spins in frame test')};w.mkPendCobrar=()=>{throw Error('No claims in frame test')};
 w.eval(roulette);await tick();let entry=d.getElementById('ruletas-acceso');entry.focus();w.abrirRuletas();await tick();await tick();
 const root=d.getElementById('ov-ruletas'),title=root.querySelector('h3');assert(root.classList.contains('show'));assert.equal(title.querySelectorAll('.wood-menu-title').length,1);
 d.getElementById('gf-tab-objects').click();assert(!d.getElementById('gf-panel-objects').hidden);assert(d.getElementById('gf-panel-golden').hidden);
 d.getElementById('gf-tab-objects').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert(!d.getElementById('gf-panel-golden').hidden);
 root.querySelector('[data-close]').click();assert(!root.classList.contains('show'));assert.equal(d.activeElement,entry);
 assert.equal(queries.length,1);assert.equal(JSON.stringify(w.G),gameBefore);assert.equal(JSON.stringify(w.GF),originalFlags);assert.equal(w.localStorage.getItem('qa-sentinel'),'preserve');assert.deepEqual(runtimeErrors,[]);
 if(width<900||!renovado)assert.equal(images.length,0);else assert.equal(images.length,4);
 const result={width,renovado,static:staticOverlays.length,opened:opened.length,paused:paused.length,closedByX:closedByX.length,operationalNoX:closedOperational,rouletteTabsAndFocus:true,dragFromPlaque:true,quantityAndConfirmation:true,originalControls:controls.length,originalIds:allOriginal.length,accountOrRemoteActions:0};
 await tick();await tick();dom.window.close();return result;
}
(async()=>{for(const [width,on]of[[1360,true],[1360,false],[640,true]])report.scenarios.push(await scenario(width,on));report.passed=true;console.log(JSON.stringify(report,null,2));})().catch(error=>{console.error(error);process.exitCode=1;});
