'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('../node_modules/jsdom');
const source=fs.readFileSync(path.join(__dirname,'../public/game/reference-camera-ui.js'),'utf8');
const dom=new JSDOM('<!doctype html><html class="visual-v2"><body><div class="ov" id="ov-market"></div></body></html>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,doc=w.document;
Object.defineProperty(doc,'readyState',{configurable:true,get:()=> 'complete'});w.innerWidth=1346;w.innerHeight=618;
let on=true,active=true,intervals=0,clears=0;const callbacks=[],calls=[];
w.setInterval=f=>{callbacks.push(f);return ++intervals;};w.clearInterval=()=>clears++;
w.G={level:1,plata:3,energy:{value:50}};const before=JSON.stringify(w.G);
w.GoldenVisual={isEnabled:()=>on};w.FARM={sys:{isActive:()=>active},_referenceOverview:false,_referenceCameraManual:false,
 setReferenceOverview(v){calls.push(['overview',v]);this._referenceOverview=v;this._referenceCameraManual=false;},stepReferenceZoom(v){calls.push(['zoom',v]);this._referenceCameraManual=true;}};
w.eval(source);
const bar=()=>doc.getElementById('reference-camera-controls'),fit=()=>doc.getElementById('reference-camera-overview');
assert.equal(bar().getAttribute('role'),'group');assert.equal(bar().querySelectorAll('button').length,3);assert(!bar().hidden);
fit().click();assert.deepEqual(calls.pop(),['overview',true]);assert.equal(fit().getAttribute('aria-pressed'),'true');
fit().click();assert.deepEqual(calls.pop(),['overview',false]);assert.equal(fit().getAttribute('aria-pressed'),'false');
doc.getElementById('reference-camera-plus').click();assert.deepEqual(calls.pop(),['zoom',1]);doc.getElementById('reference-camera-minus').click();assert.deepEqual(calls.pop(),['zoom',-1]);
w.FARM._referenceOverview=true;w.FARM._referenceCameraManual=true;w.GoldenReferenceCameraUI.sync();fit().click();assert.deepEqual(calls.pop(),['overview',true],'frame button restores overview after manual zoom/pan');
on=false;w.GoldenReferenceCameraUI.sync();assert(bar().hidden,'classic hides the controls');on=true;w.innerWidth=800;w.dispatchEvent(new w.Event('resize'));assert(bar().hidden,'mobile has no new controls');
w.innerWidth=1346;active=false;callbacks[0]();assert(bar().hidden,'other game scenes have no farm camera controls');active=true;callbacks[0]();assert(!bar().hidden);
(async()=>{
 const modal=doc.getElementById('ov-market');modal.classList.add('show');await Promise.resolve();assert(bar().hidden,'modal panels have priority');modal.classList.remove('show');await Promise.resolve();assert(!bar().hidden);
 w.dispatchEvent(new w.Event('pagehide'));assert.equal(bar(),null);assert.equal(clears,1);w.dispatchEvent(new w.Event('pageshow'));assert(bar());assert.equal(intervals,2,'navigation-cache restoration creates only one timer');
 assert.equal(JSON.stringify(w.G),before,'all controls leave progression untouched');w.GoldenReferenceCameraUI.destroy();assert.equal(clears,2);assert.equal(bar(),null);w.close();console.log('OK: frame/zoom controls, manual-view reset, Classic/mobile/other-scene/modal visibility, navigation cleanup and G unchanged');
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
