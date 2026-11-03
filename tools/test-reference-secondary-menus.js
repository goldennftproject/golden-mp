'use strict';
// Real stylesheet cascade at desktop breakpoints; no game code, network or player state.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8');
function splitSelectors(text){
 const out=[];let depth=0,start=0,quote='';
 for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&depth===0){out.push(text.slice(start,i));start=i+1;}}
 out.push(text.slice(start));return out;
}
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
  const walk=rules=>Array.from(rules).flatMap(rule=>rule.type===4?(matches(rule.conditionText||rule.media.mediaText)?walk(rule.cssRules):[]):rule.type===1?splitSelectors(rule.selectorText).map(s=>s+'{'+rule.style.cssText+'}'):[rule.cssText]);
  const result=walk(probe.sheet.cssRules).join('\n');probe.remove();return result;
 }
 const style=doc.createElement('style');style.textContent=sources.map(flatten).join('\n');doc.head.append(style);
 // Representative markup uses the exact classes emitted by the existing renderers.
 doc.getElementById('prod-granja').innerHTML='<h3>Capacidad productiva · 5/5</h3>';
 doc.getElementById('ck-cola').innerHTML='<div class="ck-olla"><span class="t">Libre</span></div><div class="ck-olla llena"><span class="t">00:20</span></div><div class="ck-olla listo"><span class="t">Recoger</span></div><div class="ck-olla enfila"><span class="turno">2</span><span class="t">En espera</span><button class="ghost sm" data-ckcancel="1">Cancelar</button></div>';
 doc.getElementById('ck-grid').innerHTML='<div class="ck-rec"><span class="n">3</span></div><div class="ck-rec sel"><span class="n">1</span></div><div class="ck-rec locked"><img alt=""><span class="lv">Nv. 5</span><span class="n">0</span></div>';
 doc.getElementById('ck-detalle').innerHTML='<div class="nm">Papa asada</div><div class="ck-fila"><span>Ingrediente</span><b>1/1</b></div><div class="ck-fila falta"><span>Ingrediente</span><b>0/2</b></div><div class="ck-efecto">Recupera vida</div><div class="ck-vacio">Elige una receta</div><div class="acc"><button class="green" disabled>Faltan ingredientes</button></div>';
 doc.getElementById('viaje-cuerpo').innerHTML='<div class="vj-conts"><div class="vj-cont"><span class="em">A</span><div><b>Bolsa</b><span class="d">8 espacios</span></div></div><div class="vj-cont on"><span class="em">B</span><div><b>Mochila</b><span class="d">20 espacios</span></div></div><div class="vj-cont no"><span class="em">C</span><div><b>Carreta</b><span class="d">No tienes</span></div></div></div><div class="vj-cols"><div class="vj-col"><h4>En la granja (se queda)</h4><div class="vj-lista"><div class="vj-s vacia"></div></div></div><div class="vj-col recibe"><h4>Contenedor</h4></div></div><div class="vj-pie"><div class="vj-aviso">Arrastra de una columna a otra <b>Se puede perder</b></div><button class="ghost">Volver</button></div>';
 const travelList=doc.querySelector('#ov-viaje .vj-lista');
 travelList.innerHTML=Array.from({length:5},()=>'<div class="vj-s"><span class="n">99</span></div>').join('');
 doc.getElementById('pd-lista').innerHTML='<div class="pd-nota lista" style="transform:rotate(-1deg)">Pedido A</div><div class="pd-nota" style="transform:rotate(1deg)">Pedido B</div>';
 return{dom,w,doc,css:el=>w.getComputedStyle(typeof el==='string'?doc.querySelector(el):el)};
}
function rgba(value){const n=value.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return[n[0],n[1],n[2],n.length===4?n[3]:1];}
function setMode(f,on){
 f.doc.documentElement.classList.toggle('visual-v2',on);
}
function luminance(rgb){return rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);}
function background(f,el){if(!el)return[255,255,255];const c=rgba(f.css(el).backgroundColor),under=background(f,el.parentElement);return c.slice(0,3).map((v,i)=>v*c[3]+under[i]*(1-c[3]));}
// Capture one child declaration before walking ancestors: jsdom 30's inheritance
// resolution can otherwise change a later text-shadow read of the same child.
function readable(f,selector){const el=f.doc.querySelector(selector),style=f.css(el),color=style.color,shadow=style.textShadow,a=luminance(rgba(color).slice(0,3)),b=luminance(background(f,el)),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(contrast>=4.5,selector+' fallback-color contrast '+contrast.toFixed(2));assert(shadow==='none'||/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(shadow),selector+' still has the wood text outline: '+shadow);}
const probes=['#prod-granja h3','#ov-cocina .ck-tit','#ov-cocina .ck-tit b','#ov-cocina .ck-der .nm','#ov-cocina .ck-fila','#ov-cocina .ck-fila b','#ov-cocina .ck-fila.falta b','#ov-cocina .ck-efecto','#ov-cocina .ck-vacio','#ov-cocina .ck-olla .t','#ov-cocina .ck-olla .turno','#ov-cocina .ck-rec .n','#ov-cocina .ck-rec.locked .lv','#ov-cocina .ck-rec.locked .n','#ov-cocina .acc button:disabled','#ov-viaje .vj-cont b','#ov-viaje .vj-cont .d','#ov-viaje .vj-cont.on b','#ov-viaje .vj-cont.no b','#ov-viaje .vj-cont.no .d','#ov-viaje .vj-col h4','#ov-viaje .vj-col.recibe h4','#ov-viaje .vj-aviso','#ov-viaje .vj-aviso b'];
const snapshot=f=>[...probes.map(selector=>[selector,...['color','backgroundColor','borderTopWidth','paddingTop','fontSize','textShadow','opacity'].map(k=>f.css(selector)[k])]),['#pd-lista',...['paddingTop','paddingRight','paddingBottom','paddingLeft','boxSizing','overflowX','overflowY'].map(k=>f.css('#pd-lista')[k])]];
for(const[width,height]of[[1672,948],[1346,618],[1024,700],[1033,700],[900,700]]){
 const f=fixture(width,height),{doc,css}=f,before=snapshot(f);
 const nodes=probes.map(s=>doc.querySelector(s));
 const travelSlots=Array.from(doc.querySelectorAll('#ov-viaje .vj-s'));
 const boardNotes=Array.from(doc.querySelectorAll('#pd-lista .pd-nota')),rotations=boardNotes.map(note=>css(note).transform);
 setMode(f,true);
 assert.equal(css('#ov-cobertizo>.card>h3').borderTopWidth,'8px','main window keeps the wood frame');
 for(const k of ['borderTopWidth','paddingTop','paddingRight','paddingBottom','paddingLeft'])assert.equal(css('#prod-granja h3')[k],'0px','nested heading '+k);
 assert.equal(css('#prod-granja h3').fontSize,'15px');assert.equal(css('#prod-granja h3').borderImage,'none');
 for(const s of probes)readable(f,s);
 assert.notEqual(css('.ck-rec.sel').backgroundColor,css('.ck-rec:not(.sel):not(.locked)').backgroundColor,'selected recipe remains distinct');
 assert.equal(css('.ck-rec.locked').opacity,'1','unavailable recipe labels remain opaque');assert.equal(css('.ck-rec.locked img').opacity,'0.55','only unavailable art is muted');
 assert.notEqual(css('.ck-olla.listo').borderTopColor,css('.ck-olla:not(.listo)').borderTopColor,'ready pot still differs');
 assert.equal(css('.vj-cont.no').opacity,'1');assert.equal(css('.vj-cont.no').cursor,'default');assert.notEqual(css('.vj-cont.on').borderTopColor,css('.vj-cont:not(.on):not(.no)').borderTopColor);
 assert.equal(css('.ck-der').width,'190px');assert.equal(css('.ck-der').minHeight,'322px');assert.equal(css('.ck-rec').height,'50px');assert.equal(css('.ck-grid').maxHeight,'236px');assert.equal(css('.vj-cols').display,'flex');
 assert.match(css('#ov-viaje .vj-lista').gridTemplateColumns,/^repeat\(5,\s*minmax\(0(?:px)?,\s*1fr\)\)$/,'five tracks can shrink below intrinsic item width');assert.equal(css('#ov-viaje .vj-s').minWidth,'0px');assert.deepEqual(Array.from(doc.querySelectorAll('#ov-viaje .vj-s')),travelSlots,'shrinking tracks keeps the same travel slots');
 assert.equal(travelSlots.length,5);for(const badge of doc.querySelectorAll('#ov-viaje .vj-s .n')){assert.equal(css(badge).right,'2px','quantity stays inside every column');assert.equal(css(badge).bottom,'1px','quantity stays above the slot baseline');assert.equal(badge.textContent,'99');}
 for(const[k,v]of Object.entries({boxSizing:'border-box',paddingTop:'4px',paddingRight:'6px',paddingBottom:'4px',paddingLeft:'6px',overflow:'auto'}))assert.equal(css('#pd-lista')[k],v,'board leaves room for the rotated paper: '+k);
 assert.deepEqual(Array.from(doc.querySelectorAll('#pd-lista .pd-nota')),boardNotes);assert.deepEqual(boardNotes.map(note=>css(note).transform),rotations,'board keeps the original paper rotations');
 const editor=doc.getElementById('editbar');editor.classList.add('show');const normalEditor=Array.from(editor.children).map(el=>css(el).display);editor.classList.add('premium-placement');
 for(const el of editor.children)assert.equal(css(el).display,el.id==='edit-cancelar'?'inline-flex':'none','premium placement exposes only Cancel');
 assert.equal(css('#edit-cancelar').minHeight,'30px');assert.equal(css('#edit-cancelar').borderTopWidth,'2px');editor.classList.remove('premium-placement');assert.deepEqual(Array.from(editor.children).map(el=>css(el).display),normalEditor,'regular editor controls return unchanged');
 assert.equal(css('.ck-olla [data-ckcancel]').minHeight,'22px');assert.equal(css('.ck-olla [data-ckcancel]').paddingLeft,'0px');assert.equal(css('.ck-olla [data-ckcancel]').fontSize,'9px','compact pot button keeps its original typography');
 probes.forEach((s,i)=>assert.equal(doc.querySelector(s),nodes[i],'CSS keeps the existing control node'));
 setMode(f,false);assert.deepEqual(snapshot(f),before,'Classic restores its exact style values');
 f.w.close();
}
const narrow=fixture(899,700),original=snapshot(narrow);setMode(narrow,true);assert.deepEqual(snapshot(narrow),original,'desktop theme does not apply below 900px');narrow.w.close();
console.log('OK: direct headings, readable Cocina/Viaje states, five shrinking tracks and internal badges, padded rotated orders at 5 desktop sizes, existing nodes, exact Classic restoration and <900px exclusion. Native QA still covers texture pixels and measured overflow.');
