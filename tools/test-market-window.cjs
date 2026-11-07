'use strict';
// Offline semantic QA: the production HTML is parsed, but only market-window.js executes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const {JSDOM,VirtualConsole}=require(path.join(repo,'node_modules/jsdom'));
const source=fs.readFileSync(path.join(repo,'public/game/market-window.js'),'utf8');
const html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8');
const files=['window-frame-aligned.svg','plaque.svg','header-infill-aligned.svg','close.png'];
const report={suite:'market-window semantic QA',testedAt:new Date().toISOString(),source:'market-window.js',checks:[],passed:false};
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
function setup(options={}){
 const runtimeErrors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>runtimeErrors.push(error.message));
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://127.0.0.1:2598/?review=1',virtualConsole:vc});
 const w=dom.window,d=w.document,images=[],touches={game:0,auth:0,network:0},metrics={observerCallbacks:0};
 Object.defineProperty(w,'innerWidth',{value:options.width??1360,writable:true,configurable:true});
 d.documentElement.classList.toggle('visual-v2',options.visual!==false);
 d.documentElement.classList.remove('market-pieces-ready');
 for(const key of ['G','GF'])Object.defineProperty(w,key,{configurable:true,get(){touches.game++;throw Error('Unexpected game read: '+key);},set(){touches.game++;throw Error('Unexpected game write: '+key);}});
 for(const key of ['sb','UID','CARGA_OK'])Object.defineProperty(w,key,{configurable:true,get(){touches.auth++;throw Error('Unexpected account read: '+key);},set(){touches.auth++;throw Error('Unexpected account write: '+key);}});
 w.fetch=()=>{touches.network++;throw Error('Network forbidden in semantic QA');};
 for(const key of ['XMLHttpRequest','WebSocket','EventSource'])w[key]=class{constructor(){touches.network++;throw Error(key+' forbidden in semantic QA');}};
 w.localStorage.setItem('qa-semantic-sentinel','untouched');
 const NativeObserver=w.MutationObserver;
 w.MutationObserver=class extends NativeObserver{constructor(callback){super((records,observer)=>{metrics.observerCallbacks++;if(metrics.observerCallbacks>1000){runtimeErrors.push('MutationObserver did not settle');observer.disconnect();return;}callback(records,observer);});}};
 w.Image=class{constructor(){this.onload=null;this.onerror=null;this._src='';images.push(this);}set src(value){this._src=String(value);if(!options.manualImages)queueMicrotask(()=>this.complete(!options.failFile||!this._src.endsWith('/'+options.failFile)));}get src(){return this._src;}complete(success=true){if(this.done)return;this.done=true;(success?this.onload:this.onerror)?.(new w.Event(success?'load':'error'));}};
 const run=()=>{w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));};
 const clean=()=>{assert.deepEqual(touches,{game:0,auth:0,network:0},'must not read or write game/Auth or call network APIs');assert.equal(w.localStorage.getItem('qa-semantic-sentinel'),'untouched');assert.deepEqual(runtimeErrors,[],'no runtime or observer errors');};
 return{dom,w,d,images,touches,metrics,run,clean,close:()=>dom.window.close()};
}
function roulette(ctx){const root=ctx.d.createElement('div');root.id='ov-ruletas';root.className='ov';root.innerHTML='<section class="gf-window card"><header class="gf-header"><h3>Ruletas</h3><button class="close" aria-label="Cerrar ruletas" data-close="ov-ruletas">×</button></header></section>';return root;}
async function check(name,task){try{const details=await task();report.checks.push({name,passed:true,...details});}catch(error){report.checks.push({name,passed:false,error:error.message});throw error;}}
async function main(){
 await check('Close stays above the sticky title despite native inline z-index',async()=>{
  const css=fs.readFileSync(path.join(repo,'public/game/market-window.css'),'utf8');
  const dom=new JSDOM('<style>'+css+'</style>');
  try{const rules=Array.from(dom.window.document.styleSheets[0].cssRules).flatMap(rule=>rule.cssRules?Array.from(rule.cssRules):[rule]);
   const close=rules.find(rule=>rule.selectorText?.includes('#ov-ruletas .gf-header>.close')&&rule.style.getPropertyValue('z-index'));
   const heading=rules.find(rule=>rule.selectorText?.includes('>h3.wood-menu-heading')&&rule.style.getPropertyValue('z-index'));
   assert(close&&heading);assert.equal(close.style.getPropertyPriority('z-index'),'important','native inline z-index must not cover the close');
   assert(Number(close.style.getPropertyValue('z-index'))>Number(heading.style.getPropertyValue('z-index')),'close must receive pointer hits above the heading');
   return{nativeInlineZIndex:2,closeAboveHeading:true};
  }finally{dom.window.close();}
 });
 await check('Original headings, IDs, child nodes, controls and events survive',async()=>{
  const ctx=setup();try{const {w,d}=ctx;
   const ids=new Map([...d.querySelectorAll('[id]')].map(node=>[node.id,node]));
   assert.equal(ids.size,362,'audit expected exactly 362 original IDs');
   const profile=d.querySelector('#ov-perfil>.card>h3'),profileClose=d.querySelector('#ov-perfil .close');let headingClicks=0,childClicks=0,closeClicks=0;
   const em=d.createElement('em');em.textContent=' · ejemplo';em.addEventListener('click',()=>childClicks++);profile.append(em);profile.addEventListener('click',()=>headingClicks++);profileClose.addEventListener('click',()=>closeClicks++);
   const headings=[...d.querySelectorAll('.ov>.card>h3')].map(node=>({node,text:node.textContent,parent:node.parentElement,overlay:node.closest('.ov').id}));
   const closeNodes=[...d.querySelectorAll('.ov>.card>.close')].map(node=>({node,text:node.textContent,parent:node.parentElement,aria:node.getAttribute('aria-label')}));
   assert.equal(headings.length,47);ctx.run();await tick();
   for(const [id,node] of ids)assert.equal(d.getElementById(id),node,'original ID replaced: '+id);
   for(const entry of headings){assert.equal(entry.node.parentElement,entry.parent);assert.equal(entry.node.textContent,entry.text);const excluded=entry.overlay==='ov-market';assert.equal(entry.node.querySelectorAll(':scope>.wood-menu-title').length,excluded?0:1,'wrong title wrapper '+entry.overlay);assert.equal(entry.node.classList.contains('wood-menu-heading'),!excluded);assert.equal(entry.parent.classList.contains('wood-window'),!excluded);}
   for(const entry of closeNodes){assert.equal(entry.node.parentElement,entry.parent);assert.equal(entry.node.textContent,entry.text);assert.equal(entry.node.getAttribute('aria-label'),entry.aria);}
   em.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));profileClose.click();assert.equal(headingClicks,1);assert.equal(childClicks,1);assert.equal(closeClicks,1);assert.equal(em.parentElement.className,'wood-menu-title');
   for(let n=1;n<=3;n++){profile.textContent='Mi perfil actualizado '+n;await tick();assert.equal(profile.textContent,'Mi perfil actualizado '+n);assert.equal(profile.childNodes.length,1);assert.equal(profile.querySelectorAll('.wood-menu-title').length,1,'rerender must not nest wrappers');}
   profile.firstChild.textContent='Texto cambiado dentro del rótulo';await tick();assert.equal(profile.textContent,'Texto cambiado dentro del rótulo');assert.equal(profile.querySelectorAll('.wood-menu-title').length,1);
   assert(Object.isFrozen(w.GoldenMarketFrames));for(let n=0;n<3;n++)w.GoldenMarketFrames.refresh();await tick();assert.equal(profile.querySelectorAll('.wood-menu-title').length,1);
   const root=roulette(ctx),heading=root.querySelector('h3'),close=root.querySelector('button');let dynamicClose=0;close.addEventListener('click',()=>dynamicClose++);d.body.append(root);await tick();
   assert(root.querySelector('.card').classList.contains('wood-window'));assert.equal(root.querySelector('h3'),heading);assert.equal(heading.textContent,'Ruletas');assert.equal(heading.querySelectorAll('.wood-menu-title').length,1);assert.equal(root.querySelector('button'),close);close.click();assert.equal(dynamicClose,1);
   heading.textContent='Ruletas actualizadas';await tick();assert.equal(heading.querySelectorAll('.wood-menu-title').length,1);assert.equal(heading.textContent,'Ruletas actualizadas');
   const settled=ctx.metrics.observerCallbacks;await tick();await tick();assert.equal(ctx.metrics.observerCallbacks,settled,'no MutationObserver work without new mutations');
   assert(d.documentElement.classList.contains('market-pieces-ready'));assert.deepEqual(ctx.images.map(image=>image.src),files.map(file=>'assets/market-ui/'+file));ctx.clean();
   return{originalIds:ids.size,staticHeadings:47,decoratedStatic:46,excluded:['ov-market'],dynamicRulette:true,headingChildAndCloseEvents:true,repeatedTextRerenders:3,observerCallbacks:settled};
  }finally{ctx.close();}
 });
 await check('All four images must finish before the ready class is added',async()=>{
  const ctx=setup({manualImages:true});try{ctx.run();await tick();assert.equal(ctx.images.length,4);assert(!ctx.d.documentElement.classList.contains('market-pieces-ready'));ctx.images.slice(0,3).forEach(image=>image.complete());await tick();assert(!ctx.d.documentElement.classList.contains('market-pieces-ready'),'partial image success must keep fallback');ctx.images[3].complete();await tick();assert(ctx.d.documentElement.classList.contains('market-pieces-ready'));const count=ctx.images.length;ctx.w.dispatchEvent(new ctx.w.Event('resize'));ctx.d.documentElement.classList.add('qa-unrelated');await tick();assert.equal(ctx.images.length,count,'asset preload must not repeat');ctx.clean();return{requestedAssets:4,partialSuccessKeepsFallback:true};}finally{ctx.close();}
 });
 await check('An asset error keeps the fallback and does not retry automatically',async()=>{
  const ctx=setup({failFile:'header-infill-aligned.svg'});try{ctx.run();await tick();assert.equal(ctx.images.length,4);assert(!ctx.d.documentElement.classList.contains('market-pieces-ready'));ctx.w.dispatchEvent(new ctx.w.Event('resize'));ctx.d.documentElement.classList.add('qa-unrelated');await tick();assert.equal(ctx.images.length,4);assert(!ctx.d.documentElement.classList.contains('market-pieces-ready'));ctx.clean();return{failedAsset:'header-infill-aligned.svg',ready:false,automaticRetries:0};}finally{ctx.close();}
 });
 await check('Classic loads no art; enabling Renovado starts the four local preloads',async()=>{
  const ctx=setup({visual:false});try{ctx.run();await tick();assert.equal(ctx.images.length,0);assert(!ctx.d.documentElement.classList.contains('market-pieces-ready'));ctx.d.documentElement.classList.add('visual-v2');await tick();assert.equal(ctx.images.length,4);assert(ctx.d.documentElement.classList.contains('market-pieces-ready'));ctx.clean();return{classicRequests:0,renovadoRequests:4};}finally{ctx.close();}
 });
 await check('Mobile loads no art; resizing from 899 to 900px starts the preloads',async()=>{
  const ctx=setup({width:899});try{ctx.run();await tick();assert.equal(ctx.images.length,0);ctx.w.innerWidth=900;ctx.w.dispatchEvent(new ctx.w.Event('resize'));await tick();assert.equal(ctx.images.length,4);assert(ctx.d.documentElement.classList.contains('market-pieces-ready'));ctx.clean();return{mobileRequests:0,desktopRequests:4,boundaryWidth:900};}finally{ctx.close();}
 });
 await check('A pre-existing roulette and later replacement header are decorated',async()=>{
  const ctx=setup();try{const root=roulette(ctx);ctx.d.body.append(root);ctx.run();await tick();assert.equal(root.querySelectorAll('.wood-menu-title').length,1);root.querySelector('.gf-header').innerHTML='<h3>Ruletas · nuevo encabezado</h3><button class="close">×</button>';await tick();assert.equal(root.querySelectorAll('.wood-menu-title').length,1);assert.equal(root.querySelector('h3').textContent,'Ruletas · nuevo encabezado');assert.equal(root.querySelector('.close').getAttribute('aria-label'),'Cerrar ventana');const settled=ctx.metrics.observerCallbacks;await tick();await tick();assert.equal(ctx.metrics.observerCallbacks,settled);ctx.clean();return{initialAndReplacedDynamicHeading:true,missingCloseAriaLabelAdded:true,observerCallbacks:settled};}finally{ctx.close();}
 });
 report.passed=report.checks.every(check=>check.passed);
}
main().catch(error=>{report.error=error.message;process.exitCode=1;}).finally(()=>{if(process.env.GF_TEST_REPORT)fs.writeFileSync(process.env.GF_TEST_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));});
