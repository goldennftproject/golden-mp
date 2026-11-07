'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const sourcePath=process.env.GF_ADAPTIVE_SCRIPT||path.join(repo,'public/game/adaptive-layout.js');
const source=fs.readFileSync(sourcePath,'utf8'),{chooseLayout}=require(sourcePath);
const {JSDOM}=require(path.join(repo,'node_modules/jsdom'));
test('shop fits nine measured free areas or scrolls internally before overlapping the reserved bottom',()=>{
 for(const [width,height,hudBottom,bottom] of [[1352,600,70,504],[1366,600,70,504],[1280,720,70,624],[900,600,60,504],[1352,500,70,404],[900,500,60,404],[1920,1080,80,984],[1352,360,70,264],[900,220,60,124]]){
  const layout=chooseLayout({width,height,hudBottom,bottom});
  assert(layout.width>=174,'labels stay legible at '+width+'x'+height);
  assert(layout.top>=hudBottom,'shop stays below the measured HUD');
  const expectedHeight=layout.mode==='compact'?layout.width*358/247+56:layout.width*419/247+88;
  assert(expectedHeight<=layout.maxHeight||layout.scroll,'available free height controls scroll');
  assert(layout.top+Math.min(expectedHeight,layout.maxHeight)<=bottom,'reserved bottom is never covered');
  if(height===1080)assert.equal(layout.mode,'normal');
  if(width===1352&&height===600){assert.equal(layout.mode,'fit');assert.equal(layout.width,196);}
  if(height===500)assert.equal(layout.mode,'compact');
  if(height<=360)assert.equal(layout.scroll,true);
 }
});
test('scoped observers settle, reframe only measured changes, and preserve user panel positions and state',async()=>{
 const dom=new JSDOM('<!doctype html><html class="visual-v2 concept-finish-ready"><head><style>#tuto.hidden{display:none}</style></head><body><div id="hudbar"></div><div id="hud-flot"></div><div id="tuto"></div><nav id="compras-accesos" style="left:23px"></nav><div id="logpanel" class="collapsed movida" style="left:9px;bottom:10px"></div><div id="hotwrap" class="movida"></div></body></html>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
 const rect=(x,y,width,height)=>({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height});
 w.innerWidth=1352;w.innerHeight=600;let flotHeight=0,tutoHeight=44,logX=9,frames=[],cameraCalls=0,referenceCalls=0;
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
 const resizes=[];w.ResizeObserver=class{constructor(fn){resizes.push(fn);}observe(){}};
 w.FARM={refreshReferenceFraming(){cameraCalls++;}};w.GoldenReferenceUI={update(){referenceCalls++;}};
 d.getElementById('hudbar').getBoundingClientRect=()=>rect(12,12,w.innerWidth-24,58);
 d.getElementById('hud-flot').getBoundingClientRect=()=>rect(0,70,0,flotHeight);
 d.getElementById('tuto').getBoundingClientRect=()=>rect(320,99,560,tutoHeight);
 d.getElementById('logpanel').getBoundingClientRect=()=>rect(logX,w.innerHeight-86,290,76);
 d.getElementById('hotwrap').getBoundingClientRect=()=>rect(490,w.innerHeight-76,560,66);
 const nav=d.getElementById('compras-accesos');nav.getBoundingClientRect=()=>{
  const width=Number.parseFloat(nav.style.getPropertyValue('--adaptive-shop-width'))||Math.max(174,Math.min(w.innerWidth*.15,210));
  const top=Number.parseFloat(nav.style.getPropertyValue('--adaptive-shop-top'))||130;
  return rect(16,top,width,Math.min(width*419/247+88,Number.parseFloat(nav.style.getPropertyValue('--adaptive-shop-height'))||Infinity));
 };
 const flush=async()=>{for(let i=0;i<12;i++){await new Promise(resolve=>setImmediate(resolve));if(!frames.length)return;const batch=frames.splice(0);batch.forEach(fn=>fn());}assert.fail('layout observers did not settle');};
 try{
  const originalLog=d.getElementById('logpanel').outerHTML,originalHotbar=d.getElementById('hotwrap').outerHTML;
  w.eval(source);await flush();assert(d.documentElement.classList.contains('adaptive-layout'));
  assert.equal(nav.style.getPropertyValue('--adaptive-shop-top'),'82px');assert.equal(nav.style.getPropertyValue('--adaptive-shop-width'),'196px');
  assert.equal(cameraCalls,1);assert.equal(referenceCalls,1);
  w.GoldenAdaptiveLayout.refresh();w.GoldenAdaptiveLayout.refresh();await flush();assert.equal(cameraCalls,1,'unchanged geometry never repaints camera');
  flotHeight=30;resizes.forEach(fn=>fn());await flush();assert.equal(nav.style.getPropertyValue('--adaptive-shop-top'),'112px');assert.equal(cameraCalls,2,'floating HUD changes the real free height');
  tutoHeight=80;resizes.forEach(fn=>fn());await flush();assert.equal(cameraCalls,3,'objective height matters even when shop width is unchanged');
  w.innerHeight=500;w.dispatchEvent(new w.Event('resize'));await flush();assert(nav.classList.contains('adaptive-shortcuts'));
  assert.equal(d.getElementById('logpanel').outerHTML,originalLog,'manual log position/state remains untouched');assert.equal(d.getElementById('hotwrap').outerHTML,originalHotbar,'manual hotbar remains untouched');
  w.innerHeight=600;flotHeight=0;logX=900;w.dispatchEvent(new w.Event('resize'));await flush();assert(!d.documentElement.classList.contains('adaptive-layout'),'a side lane without the log can return to its original presentation');
  logX=9;w.dispatchEvent(new w.Event('resize'));await flush();assert(d.documentElement.classList.contains('adaptive-layout'));
  const beforeClassic=cameraCalls;d.documentElement.classList.remove('visual-v2');await flush();assert(!d.documentElement.classList.contains('adaptive-layout'));assert.equal(cameraCalls,beforeClassic);
  d.documentElement.classList.add('visual-v2');await flush();assert.equal(cameraCalls,beforeClassic+1,'reactivating Renovado rechecks geometry');
  nav.classList.add('compras-combate');await flush();assert(!d.documentElement.classList.contains('adaptive-layout'));nav.classList.remove('compras-combate');await flush();
  w.innerWidth=320;w.dispatchEvent(new w.Event('resize'));await flush();assert(!d.documentElement.classList.contains('adaptive-layout'));
  for(const key of ['--adaptive-shop-top','--adaptive-shop-width','--adaptive-shop-height'])assert.equal(nav.style.getPropertyValue(key),'');
  assert.equal(nav.style.left,'23px','cleanup removes only module-owned properties');
 }finally{w.close();}
});
