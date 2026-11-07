'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const {JSDOM}=require(require.resolve('jsdom',{paths:[repo]}));
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const source=()=>read('public/game/novedades.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
async function fixture(options={}){
 const html=read('public/index.html'),dom=new JSDOM(html,{url:'https://goldenfarm.onrender.com/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const errors=[],frames=[],observers=[],news={unread:2,loaded:true,failed:false,...options.news};
 w.innerWidth=options.width||1000;w.innerHeight=700;w.GF={scene:'farm'};
 for(const k of ['G','sb','saveFarm'])Object.defineProperty(w,k,{get(){throw Error('Discovery touched '+k);},set(){throw Error('Discovery changed '+k);}});
 w.fetch=()=>{throw Error('Discovery started a network request');};
 w.GoldenNews={state:()=>({...news})};
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 w.ResizeObserver=class{constructor(fn){this.fn=fn;observers.push(this);}observe(node){(this.nodes||(this.nodes=[])).push(node);}disconnect(){}};
 w.addEventListener('error',e=>errors.push(e.message));
 const setRect=(id,rect)=>{const node=d.getElementById(id);if(!node)return;const value={x:rect.left||0,y:rect.top||0,left:0,top:0,width:100,height:40,...rect};value.right=value.left+value.width;value.bottom=value.top+value.height;node.getBoundingClientRect=()=>({...value,toJSON:()=>value});node.getClientRects=()=>[value];Object.defineProperty(node,'offsetWidth',{configurable:true,get:()=>value.width});Object.defineProperty(node,'offsetHeight',{configurable:true,get:()=>value.height});node.style.display='';node.classList.remove('hidden');node.hidden=false;};
 setRect('hudbar',{left:0,top:0,width:w.innerWidth,height:70});setRect('hud-flot',{left:600,top:70,width:380,height:26});
 setRect('tuto',{left:300,top:78,width:250,height:48});setRect('novedades-accesos',{left:w.innerWidth-196,top:100,width:180,height:52});
 d.getElementById('hudbar').classList.remove('hidden');d.getElementById('hudbar').style.display='flex';
 for(const id of ['gate','loading']){const el=d.getElementById(id);el.hidden=options.ready!==false;el.style.display=options.ready===false?'block':'none';}
 if(!d.getElementById('ov-ruletas')){const ov=d.createElement('div');ov.id='ov-ruletas';ov.className='ov';d.body.append(ov);}
 if(options.stored!==undefined)w.localStorage.setItem('gf_features_seen_v1',typeof options.stored==='string'?options.stored:JSON.stringify(options.stored));
 const style=d.createElement('style');style.textContent=read('public/game/novedades.css');d.head.append(style);
 w.eval(source());
 const settle=async()=>{for(let n=0;n<15;n++){await tick();if(!frames.length)break;const queue=frames.splice(0);for(const fn of queue)fn(performance.now());}assert.equal(frames.length,0,'DOM updates settle without an animation-frame repaint loop');assert.deepEqual(errors,[]);};
 const sendNews=next=>{Object.assign(news,next);w.dispatchEvent(new w.CustomEvent('golden:news-state',{detail:{...news}}));};
 const storage=ids=>{if(ids===null)w.localStorage.removeItem('gf_features_seen_v1');else w.localStorage.setItem('gf_features_seen_v1',JSON.stringify(ids));w.dispatchEvent(new w.StorageEvent('storage',{key:'gf_features_seen_v1',newValue:ids===null?null:JSON.stringify(ids)}));};
 await settle();return{dom,w,d,html,errors,frames,observers,settle,sendNews,storage,setRect,close:()=>w.close()};
}
test('permanent Ruletas and Noticias accesses are wired once outside the collapsed menu',async()=>{
 const f=await fixture();try{
  assert.equal((f.html.match(/"game\/novedades\.js"/g)||[]).length,1);
  const r=f.d.getElementById('ruletas-acceso'),m=f.d.getElementById('misiones-acceso'),mobile=f.d.getElementById('ruletas-acceso-movil'),news=f.d.getElementById('noticias-acceso');
  assert(r&&m&&mobile&&news);assert(r.closest('#compras-accesos'));assert(r.compareDocumentPosition(m)&f.w.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(r.dataset.tienda,'ruletas');assert.equal(mobile.dataset.tienda,'ruletas');assert.equal(news.dataset.panel,'ov-noticias');
  assert(!news.closest('#gmenu'));assert(!mobile.closest('#gmenu'));assert.equal(f.d.querySelectorAll('.ov.show').length,0,'discovery never opens a panel automatically');
  assert.equal(f.w.localStorage.getItem('gf_features_seen_v1'),null,'initial rendering never marks a new feature viewed');
 }finally{f.close();}
});
test('Noticias uses the shared unread state and live changes without its own fetch or save access',async()=>{
 const f=await fixture();try{const badge=f.d.getElementById('noticias-contador'),button=f.d.getElementById('noticias-acceso');
  assert.equal(badge.hidden,false);assert.match(badge.textContent,/2/);assert.match(button.getAttribute('aria-label'),/2/);
  f.sendNews({unread:1});await f.settle();assert.match(badge.textContent,/1/);assert.match(button.getAttribute('aria-label'),/1/);
  f.sendNews({unread:0});await f.settle();assert.equal(badge.hidden,true);assert(!/0.*sin leer/.test(button.getAttribute('aria-label')||''));
 }finally{f.close();}
});
test('loading or failed news does not advertise a confirmed empty inbox',async()=>{
 const f=await fixture({news:{unread:0,loaded:false,failed:false}});try{const badge=f.d.getElementById('noticias-contador'),button=f.d.getElementById('noticias-acceso');
  assert(badge.hidden);assert.match(button.title+' '+button.getAttribute('aria-label'),/carg|consult/i);
  f.sendNews({unread:0,loaded:false,failed:true});await f.settle();assert(badge.hidden);assert.match(button.title+' '+button.getAttribute('aria-label'),/error|fall|conex|cargar|no se/i);
 }finally{f.close();}
});
test('Nuevo stays after an attempted click and disappears from all clones only after the real window opens',async()=>{
 const f=await fixture();try{
  const targets=Array.from(f.d.querySelectorAll('[data-novedad="ruletas-v1"]'));assert(targets.length>=2);for(const node of targets)assert(node.querySelector('.novedad-badge'));
  f.d.getElementById('ruletas-acceso').click();await f.settle();assert.equal(f.w.localStorage.getItem('gf_features_seen_v1'),null);
  f.d.getElementById('ov-ruletas').classList.add('show');await f.settle();assert(JSON.parse(f.w.localStorage.getItem('gf_features_seen_v1')).includes('ruletas-v1'));
  for(const node of targets)assert(!node.querySelector('.novedad-badge')||node.querySelector('.novedad-badge').hidden);
  f.d.getElementById('ov-ruletas').classList.remove('show');await f.settle();for(const node of targets)assert(!node.querySelector('.novedad-badge')||node.querySelector('.novedad-badge').hidden);
 }finally{f.close();}
});
test('remembered feature views and other-tab storage update every visible clone',async()=>{
 const f=await fixture({stored:['ruletas-v1']});try{const count=()=>Array.from(f.d.querySelectorAll('[data-novedad="ruletas-v1"] .novedad-badge')).filter(n=>!n.hidden).length;
  assert.equal(count(),0);f.storage([]);await f.settle();assert(count()>=2);f.storage(['ruletas-v1']);await f.settle();assert.equal(count(),0);
 }finally{f.close();}
});
test('invalid or unavailable feature storage never breaks rendering or opens an interface',async()=>{
 for(const stored of ['{invalid',{},[null,17,'__proto__']]){const f=await fixture({stored});try{assert(f.d.getElementById('ruletas-acceso').querySelector('.novedad-badge'));assert.equal(f.d.querySelectorAll('.ov.show').length,0);}finally{f.close();}}
 const f=await fixture();try{const original=f.w.Storage.prototype.setItem;f.w.Storage.prototype.setItem=()=>{throw Error('quota');};f.d.getElementById('ov-ruletas').classList.add('show');await f.settle();assert(!f.d.getElementById('ruletas-acceso').querySelector('.novedad-badge')||f.d.getElementById('ruletas-acceso').querySelector('.novedad-badge').hidden);f.w.Storage.prototype.setItem=original;}finally{f.close();}
});
test('a dynamically rebuilt Tienda entry receives one marker and does not start a repaint loop',async()=>{
 const f=await fixture();try{const target=f.d.createElement('button');target.dataset.novedad='ruletas-v1';target.textContent='Ruletas';f.d.getElementById('tienda-catalogo').append(target);await f.settle();assert.equal(target.querySelectorAll('.novedad-badge').length,1);
  target.append(f.d.createTextNode(' '));await f.settle();assert.equal(target.querySelectorAll('.novedad-badge').length,1);
  f.d.getElementById('ov-ruletas').classList.add('show');await f.settle();assert(!target.querySelector('.novedad-badge')||target.querySelector('.novedad-badge').hidden);
 }finally{f.close();}
});
test('the visible Noticias row is measured below HUD/effects and moves below an overlapping tutorial',async()=>{
 const f=await fixture();try{const nav=f.d.getElementById('novedades-accesos');assert(parseFloat(nav.style.top)>=96,'below the measured HUD/effects');
  f.setRect('tuto',{left:800,top:78,width:200,height:90});f.w.dispatchEvent(new f.w.Event('resize'));await f.settle();assert(parseFloat(nav.style.top)>=168,'moves below tutorial when their horizontal regions overlap');
  const observed=f.observers.flatMap(o=>o.nodes||[]).map(n=>n.id);for(const id of ['hudbar','hud-flot','tuto'])assert(observed.includes(id),'ResizeObserver measures '+id);
 }finally{f.close();}
});
test('the access row stays behind login/loading and appears when the game surface becomes ready',async()=>{
 const f=await fixture({ready:false});try{const nav=f.d.getElementById('novedades-accesos');assert.equal(nav.hidden,true);
  f.d.getElementById('gate').style.display='none';await f.settle();assert.equal(nav.hidden,true,'loading still blocks discovery');
  f.d.getElementById('loading').style.display='none';await f.settle();assert.equal(nav.hidden,false);assert(parseFloat(nav.style.top)>=96);
  assert.equal(f.w.localStorage.getItem('gf_features_seen_v1'),null,'becoming ready never claims a feature view');
 }finally{f.close();}
});
test('real Noticias and Discovery share load, read and failure events without duplicate downloads',async()=>{
 const f=await fixture({news:{unread:0,loaded:false,failed:false}});try{
  const calls=[],feed=read('public/news/index.json'),articleCount=JSON.parse(feed).items.length;let offline=false;
  f.w.fetch=async(url,options)=>{calls.push({url,options});if(offline)throw Error('offline');return{ok:true,text:async()=>feed};};
  delete f.w.GoldenNews;f.w.eval(read('public/game/news.js'));await f.settle();
  const badge=f.d.getElementById('noticias-contador'),menuBadge=f.d.getElementById('gm-news-badge');
  assert.equal(calls.length,1,'only the news module downloads the shared public feed');assert.equal(calls[0].url,'/news/index.json');
  assert.equal(f.w.GoldenNews.state().unread,articleCount);assert.equal(badge.textContent,String(articleCount));assert.match(menuBadge.textContent,new RegExp('^'+articleCount+' '));
  f.w.GoldenDiscovery.refresh();f.w.GoldenDiscovery.refresh();await f.settle();assert.equal(calls.length,1,'discovery rendering does not query the feed');
  f.d.getElementById('ov-noticias').classList.add('show');await f.w.GoldenNews.open();await f.settle();
  assert.equal(f.w.GoldenNews.state().unread,articleCount-1);assert.equal(badge.textContent,String(articleCount-1));assert.match(menuBadge.textContent,new RegExp('^'+(articleCount-1)+' '));
  for(let i=1;i<articleCount;i++){f.d.querySelectorAll('.news-entry')[i].click();await f.settle();}assert.equal(badge.hidden,true);assert.equal(menuBadge.hidden,true);
  offline=true;await f.w.GoldenNews.refresh();await f.settle();assert.equal(f.w.GoldenNews.state().failed,true);
  assert.match(f.d.getElementById('noticias-acceso').title,/no se pudo|conex/i);assert.equal(badge.hidden,true);
 }finally{f.close();}
});
test('the real delegated Noticias access survives its pointer sequence and outside world clicks still close the reader',async()=>{
 const f=await fixture();try{
  f.w.$=id=>f.d.getElementById(id);f.w.refrescarGuiaTrasCerrarOv=()=>{};f.w.syncRecientesMenuPc=()=>{};
  Object.assign(f.w.GF,{esAltarOculto:()=>false,esPescaOculta:()=>false,esOcultoMvp:()=>false});
  const ui=read('public/game/ui.js'),overlayStart=ui.indexOf('/* ---- overlays ---- */'),overlayEnd=ui.indexOf('function cerrarCuerpoPanelPc');
  assert(overlayStart>=0&&overlayEnd>overlayStart);f.w.eval(ui.slice(overlayStart,overlayEnd));
  const clickStart=ui.indexOf('  document.addEventListener("click", (ev) => {',ui.indexOf('// multiventana:'));
  const clickEnd=ui.indexOf('\n  document.querySelectorAll(".gmi[data-panel]")',clickStart);
  assert(clickStart>=0&&clickEnd>clickStart);f.w.eval(ui.slice(clickStart,clickEnd));
  const outsideComment=ui.indexOf('// el menú se pliega solo al clickear fuera de él'),outsideStart=ui.lastIndexOf('  document.addEventListener("pointerdown", (e) => {',outsideComment),outsideEnd=ui.indexOf('\n  // clic derecho en el juego',outsideStart);
  assert(outsideStart>=0&&outsideEnd>outsideStart);f.w.eval('const sincronizarGuiaMenu=()=>{};\n'+ui.slice(outsideStart,outsideEnd));
  f.w.fetch=async()=>({ok:true,text:async()=>read('public/news/index.json')});delete f.w.GoldenNews;f.w.eval(read('public/game/news.js'));await f.settle();
  const button=f.d.getElementById('noticias-acceso'),reader=f.d.getElementById('ov-noticias'),icon=button.querySelector('svg')||button;
  icon.dispatchEvent(new f.w.Event('pointerdown',{bubbles:true}));button.click();await f.settle();assert(reader.classList.contains('show'),'the real data-panel click opens Noticias');
  icon.dispatchEvent(new f.w.Event('pointerdown',{bubbles:true}));assert(reader.classList.contains('show'),'the visible navigation belongs to the UI, not an outside-world close');
  button.click();await f.settle();assert(reader.classList.contains('show'),'the complete repeated click remains visible');
  f.d.getElementById('game').dispatchEvent(new f.w.Event('pointerdown',{bubbles:true}));await f.settle();assert(!reader.classList.contains('show'),'normal outside-world close is preserved');
 }finally{f.close();}
});
