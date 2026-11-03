'use strict';
// Real CSS and the existing positioning/catalog handlers; no network or purchases.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8'),ui=fs.readFileSync(path.join(repo,'public/game/ui.js'),'utf8');
function selectors(text){
 const out=[];let depth=0,start=0,quote='';
 for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&depth===0){out.push(text.slice(start,i));start=i+1;}}
 out.push(text.slice(start));return out;
}
function realFunction(name){const start=ui.indexOf('function '+name+'('),end=ui.indexOf('\n}',start);assert(start>=0&&end>start,'existing UI function '+name);return ui.slice(start,end+2);}
const purchaseHandler=ui.split(/\r?\n/).find(line=>line.includes("document.addEventListener('click'")&&line.includes('[data-tienda]'));
assert(purchaseHandler,'existing delegated catalog handler');
function fixture(width,height){
 const dom=new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,doc=w.document;
 w.innerWidth=width;w.innerHeight=height;
 const sources=Array.from(doc.querySelectorAll('style,link[rel="stylesheet"]')).map(el=>el.tagName==='STYLE'?el.textContent:fs.readFileSync(path.join(repo,'public',el.getAttribute('href').split('?')[0]),'utf8'));
 doc.querySelectorAll('style,link[rel="stylesheet"]').forEach(el=>el.remove());
 const matches=condition=>{
  for(const m of condition.matchAll(/(min|max)-(width|height)\s*:\s*([\d.]+)px/g)){const actual=m[2]==='width'?width:height,n=Number(m[3]);if(m[1]==='min'?actual<n:actual>n)return false;}
  return !/prefers-reduced-motion\s*:\s*reduce|pointer\s*:\s*coarse/.test(condition);
 };
 function flatten(text){
  const probe=doc.createElement('style');probe.textContent=text;doc.head.append(probe);
  const walk=rules=>Array.from(rules).flatMap(rule=>rule.type===4?(matches(rule.conditionText||rule.media.mediaText)?walk(rule.cssRules):[]):rule.type===1?selectors(rule.selectorText).map(s=>s+'{'+rule.style.cssText+'}'):[rule.cssText]);
  const result=walk(probe.sheet.cssRules).join('\n');probe.remove();return result;
 }
 const style=doc.createElement('style');style.textContent=sources.map(flatten).join('\n');doc.head.append(style);
 const nav=doc.getElementById('compras-accesos'),main=nav.querySelector('[data-tienda="inicio"]'),mission=doc.getElementById('misiones-acceso'),icons=nav.querySelector('.compras-iconos');
 // Same children added by the existing visual decorator, without loading images.
 const img=doc.createElement('img'),label=doc.createElement('span');img.alt='';label.textContent='Misiones';mission.replaceChildren(img,label);
 let hudBottom=104;doc.getElementById('hudbar').getBoundingClientRect=()=>({height:88,bottom:hudBottom});doc.getElementById('hud-flot').getBoundingClientRect=()=>({height:0,bottom:0});
 const opened=[],ctx=vm.createContext({window:w,document:doc,GF:{scene:'farm'},G:{golden:12,produccion:{vipHasta:0}},$:id=>doc.getElementById(id),vipVigente:()=>false,PRODUCCION_VIP_PRECIO:20,closeAllOv(){},openOv:id=>opened.push(id),toast(){}});
 vm.runInContext(realFunction('ubicarComprasPc')+'\n'+realFunction('abrirCompra')+'\n'+purchaseHandler,ctx);
 const css=el=>w.getComputedStyle(el),snapshot=()=>[nav,main,icons,mission,img].map(el=>['display','width','minHeight','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','fontSize','top','gridTemplateColumns'].map(k=>css(el)[k]));
 return{dom,w,doc,nav,main,mission,img,icons,ctx,opened,css,snapshot,setHudBottom:value=>{hudBottom=value;}};
}
for(const[width,height]of[[1672,948],[1346,618],[1033,700],[900,700]]){
 const f=fixture(width,height),{doc,ctx,nav,main,mission,icons,css}=f,nodes=Array.from(nav.querySelectorAll('button')),state=JSON.stringify(ctx.G),missionAction=mission.getAttribute('onclick');
 ctx.ubicarComprasPc();const classicFarm=f.snapshot();
 ctx.GF.scene='forest';ctx.ubicarComprasPc();const classicForest=f.snapshot();
 assert.equal(css(nav).width,'280px');assert.equal(css(icons).display,'grid','Classic keeps its original shortcuts');
 doc.documentElement.classList.add('visual-v2');ctx.GF.scene='farm';ctx.ubicarComprasPc();const renewedFarm=f.snapshot();
 assert.equal(css(icons).display,'grid');assert.notEqual(css(nav).borderTopWidth,'0px');
 assert.notEqual(css(nav).top,nav.style.top,'the approved farm top still wins its important cascade');
 ctx.GF.scene='forest';ctx.ubicarComprasPc();
 assert(nav.classList.contains('compras-combate'));assert.equal(nav.style.top,'112px');assert.equal(css(nav).top,'112px','inline HUD-aware position wins in combat');
 assert.equal(css(nav).display,'grid');assert.equal(css(nav).width,'210px');assert.equal(css(nav).borderTopWidth,'0px');assert.equal(css(nav).paddingTop,'0px');assert.equal(css(icons).display,'none');
 for(const button of [main,mission]){assert.equal(css(button).display,'flex');assert.equal(css(button).minHeight,'36px');assert.equal(css(button).marginBottom,'0px');assert.equal(css(button).fontSize,'13px');assert(!button.disabled);assert.equal(button.tabIndex,0);}
 assert.equal(css(f.img).width,'19px');assert.equal(mission.getAttribute('onclick'),missionAction);assert.equal(missionAction,"openOv('ov-objetivos')");
 assert.deepEqual(Array.from(nav.querySelectorAll('button')),nodes,'same controls survive the combat layout');
 main.click();assert.deepEqual(f.opened,['ov-tienda'],'compact store opens the existing full catalog');
 f.setHudBottom(156);ctx.ubicarComprasPc();assert.equal(css(nav).top,'164px','compact buttons follow a taller HUD');
 f.setHudBottom(104);ctx.GF.scene='farm';ctx.ubicarComprasPc();assert.deepEqual(f.snapshot(),renewedFarm,'returning to the farm restores the approved illustrated panel');
 doc.documentElement.classList.remove('visual-v2');ctx.ubicarComprasPc();assert.deepEqual(f.snapshot(),classicFarm,'Classic farm is unchanged');
 ctx.GF.scene='forest';ctx.ubicarComprasPc();assert.deepEqual(f.snapshot(),classicForest,'Classic combat is unchanged');assert.equal(JSON.stringify(ctx.G),state,'presentation never changes player data');
 f.w.close();
}
const narrow=fixture(899,700);narrow.ctx.GF.scene='forest';narrow.ctx.ubicarComprasPc();const old=narrow.snapshot();narrow.doc.documentElement.classList.add('visual-v2');assert.deepEqual(narrow.snapshot(),old,'no compact redesign below900px');narrow.w.close();
console.log('OK: real farm/forest positioning and catalog route, compact visible Tienda/Misiones, same controls, HUD-aware top, exact farm/Classic restoration, <900px exclusion and unchanged G. Native QA measures actual boxes.');
