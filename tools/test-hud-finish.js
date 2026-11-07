'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const {JSDOM}=require(path.join(repo,'node_modules/jsdom'));
const finish=fs.readFileSync(process.env.HUD_FINISH_CSS||path.join(repo,'public/game/hud-finish.css'),'utf8');
const html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8');
const base=fs.readFileSync(path.join(repo,'public/game/reference-hud.css'),'utf8');
function flatten(w,css,width){
 const style=w.document.createElement('style');style.textContent=css;w.document.head.append(style);
 function walk(rules){return Array.from(rules).flatMap(r=>{
  if(r.type!==4)return[r.cssText];
  const match=Array.from(r.conditionText.matchAll(/(min|max)-width\s*:\s*(\d+)px/g));
  return match.every(m=>m[1]==='min'?width>=+m[2]:width<=+m[2])?walk(r.cssRules):[];
 });}
 const result=walk(style.sheet.cssRules).join('\n');style.remove();return result;
}
for(const [width,height,logo,top]of [[900,48,56,12],[1000,48,56,12],[1280,58,75,12],[1672,66,94,14],[1920,66,94,14]]){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,d=w.document;d.querySelectorAll('style,link[rel=stylesheet]').forEach(n=>n.remove());d.documentElement.classList.add('visual-v2');
 const hud=d.getElementById('hudbar');hud.classList.add('reference-hud');const style=d.createElement('style');style.textContent=flatten(w,base+'\n'+finish,width);d.head.append(style);
 const cs=w.getComputedStyle(hud),ls=w.getComputedStyle(d.querySelector('#hudbar .gf-logo'));
 assert.equal(cs.height,height+'px','strip height at '+width);assert.equal(cs.minHeight,height+'px');assert.equal(cs.top,top+'px');assert.equal(cs.overflow,'visible');
 assert.equal(ls.height,logo+'px');assert(logo>height,'logo protrudes beyond the shallow board at '+width);assert.equal(ls.objectFit,'contain');
 assert.equal(d.querySelectorAll('#hudbar #menu-btn').length,1);assert.equal(d.querySelectorAll('#hudbar #jugadores-online').length,1);dom.window.close();
}
assert(!/display\s*:\s*none|\.pill\s*\{[^}]*font-size|transform\s*:\s*scale/i.test(finish),'does not hide data, globally shrink text or scale controls');
assert.equal((finish.match(/@media/g)||[]).length,3);assert(!/max-width\s*:\s*(?:640|899)px/.test(finish),'mobile/classic untouched');
console.log('OK HUD finish: reference strip66/logo94 at1672, adaptive48/56 and58/75, logo containment, original controls and no scaled/hidden data. Browser QA still required for text geometry.');
