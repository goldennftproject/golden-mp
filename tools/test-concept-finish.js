'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const {JSDOM}=require(path.join(repo,'node_modules/jsdom'));
const source=fs.readFileSync(process.env.CONCEPT_FINISH_SCRIPT||path.join(repo,'public/game/concept-finish.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(width=1280,renewed=true){
 const dom=new JSDOM('<html><body><button>VIP</button></body></html>',{url:'https://goldenfarm.onrender.com/',runScripts:'outside-only'}),w=dom.window;
 w.innerWidth=width;if(renewed)w.document.documentElement.classList.add('visual-v2');
 const original=w.document.createElement.bind(w.document),images=[];
 w.document.createElement=function(tag){const el=original(tag);if(tag==='img')images.push(el);return el;};
 for(const key of ['G','sb','saveFarm'])Object.defineProperty(w,key,{get(){throw Error('Decorative atlas accessed '+key);}});
 w.fetch=()=>{throw Error('Unexpected API call');};w.eval(source);
 return {dom,w,images};
}
test('classic/mobile avoid the 3.1 MB atlas; desktop Renovado requests it once without waiting on boot',async()=>{
 const f=fixture(640,true);assert.equal(f.images.length,0);assert(!f.w.document.documentElement.classList.contains('concept-finish-ready'));
 f.w.innerWidth=1280;f.w.dispatchEvent(new f.w.Event('resize'));assert.equal(f.images.length,1);assert.match(f.images[0].src,/ui-concept-reference\.png\?v=1$/);
 f.w.dispatchEvent(new f.w.Event('resize'));f.w.document.documentElement.classList.add('other');await tick();assert.equal(f.images.length,1);f.dom.window.close();
 const c=fixture(1280,false);assert.equal(c.images.length,0);c.w.document.documentElement.classList.add('visual-v2');await tick();assert.equal(c.images.length,1);c.dom.window.close();
});
test('no original labels or controls are hidden until the exact atlas has loaded',async()=>{
 const f=fixture();assert.equal(f.images.length,1);assert(!f.w.document.documentElement.classList.contains('concept-finish-ready'));
 Object.defineProperties(f.images[0],{naturalWidth:{value:1672},naturalHeight:{value:941}});f.images[0].dispatchEvent(new f.w.Event('load'));
 assert(f.w.document.documentElement.classList.contains('concept-finish-ready'));await tick();assert.equal(f.images.length,1);assert.equal(f.w.document.querySelector('button').textContent,'VIP');f.dom.window.close();
});
test('network error or unexpected dimensions retain the fully functional original UI',()=>{
 for(const badSize of [false,true]){const f=fixture();if(badSize){Object.defineProperties(f.images[0],{naturalWidth:{value:1600},naturalHeight:{value:900}});f.images[0].dispatchEvent(new f.w.Event('load'));}else f.images[0].dispatchEvent(new f.w.Event('error'));
 assert(!f.w.document.documentElement.classList.contains('concept-finish-ready'));assert.equal(f.w.document.querySelector('button').textContent,'VIP');f.dom.window.close();}
});
