'use strict';
// Renderers reales con saldos ficticios; no red, Auth, compras ni guardados reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),html=read('public/index.html');
const save=read('public/game/save.js').replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve(false);');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/save.js':save,'game/main.js':''});
c.sb=null;c.fetch=()=>{throw Error('Esta prueba no permite red');};
const prices=vm.runInContext('JSON.stringify({packs:PACKS_DEF,caja:CAJA_SUMINISTROS,emergencia:EMERG_GOLDEN,contenedores:CONT_DEF})',c);
let calls=[];c.abrirRecargaGolden=price=>calls.push({route:'recarga',price});
c.askConfirm=(message,callback,options)=>calls.push({route:'confirm',message,callback,options});
function selectors(text){const out=[];let depth=0,start=0,quote='';for(let i=0;i<text.length;i++){const ch=text[i];if(quote){if(ch===quote&&text[i-1]!=='\\')quote='';continue;}if(ch==='"'||ch==="'"){quote=ch;continue;}if(ch==='('||ch==='[')depth++;else if(ch===')'||ch===']')depth--;else if(ch===','&&!depth){out.push(text.slice(start,i));start=i+1;}}out.push(text.slice(start));return out;}
function fixture(width,height,active=true){
 const dom=new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'}),d=dom.window.document;d.documentElement.classList.toggle('visual-v2',active);
 const sheets=Array.from(d.querySelectorAll('style,link[rel="stylesheet"]')),source=sheets.map(n=>n.tagName==='STYLE'?n.textContent:read('public/'+n.getAttribute('href').split('?')[0]));sheets.forEach(n=>n.remove());
 const matches=q=>{for(const m of q.matchAll(/(min|max)-(width|height)\s*:\s*([\d.]+)px/g)){const actual=m[2]==='width'?width:height;if(m[1]==='min'?actual<+m[3]:actual>+m[3])return false;}return !/prefers-reduced-motion\s*:\s*reduce|pointer\s*:\s*coarse/.test(q);};
 function flatten(text){const s=d.createElement('style');s.textContent=text;d.head.append(s);const walk=rules=>Array.from(rules).flatMap(r=>r.type===4?(matches(r.conditionText||r.media.mediaText)?walk(r.cssRules):[]):r.type===1?selectors(r.selectorText).map(sel=>sel+'{'+r.style.cssText+'}'):[]);const out=walk(s.sheet.cssRules).join('\n');s.remove();return out;}
 const style=d.createElement('style');style.textContent=source.map(flatten).join('\n');d.head.append(style);
 // JSDOM no resuelve var() en varios shorthands. Resolver sólo los tokens reales
 // del tema antes de recorrer las mismas hojas, en el mismo orden.
 const computed=dom.window.getComputedStyle(d.documentElement),tokens={};for(const name of style.textContent.match(/--(?:menu|ref)-[a-z-]+/g)||[])tokens[name]=computed.getPropertyValue(name).trim();
 style.textContent=source.map(text=>flatten(text.replace(/var\((--(?:menu|ref)-[a-z-]+)\)/g,(all,name)=>tokens[name]||all))).join('\n');
 d.getElementById('ov-market').classList.add('reference-market');c.document=d;c.innerWidth=width;c.innerHeight=height;
 return{dom,d,css:e=>dom.window.getComputedStyle(typeof e==='string'?d.querySelector(e):e)};
}
function rgb(s){return s.match(/[\d.]+/g).slice(0,3).map(Number);}function lum(v){return rgb(v).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);}function contrast(a,b){const v=[lum(a),lum(b)].sort((a,b)=>a-b);return(v[1]+.05)/(v[0]+.05);}
let renderedCases=0;
for(const[width,height]of[[1360,599],[1024,700],[900,572]]){
 const f=fixture(width,height),{d,css}=f;
 for(const state of [{golden:0},{golden:1},{golden:250},{golden:0,used:true},{golden:250,used:true},{golden:0,owned:true}]){
  c.estadoDeCero();c.G.golden=state.golden;c.G.plata=100000;c.G.packs={compras:{},cajas:{dia:Math.floor(Date.now()/86400000),count:state.used?3:0}};
  if(state.owned)vm.runInContext('G.packs.compras.diario=packPeriodo("diario");G.packs.compras.semanal=packPeriodo("semanal")',c);
  // El renderer existente normaliza al primer uso la fecha de cuotas diarias.
  // Comparar después de esa inicialización real, antes de volver a dibujar/confirmar.
  c.refreshSeedShop();const before=JSON.stringify(c.G);calls=[];c.refreshSeedShop();
  const packs=d.querySelector('#packs-shop>details');assert(packs,'render real de packs');packs.open=true;
  for(const detail of d.querySelectorAll('#seed-shop details'))detail.open=true;
  const caja=d.getElementById('caja-comprar'),cajaRow=caja.closest('.mkt-row'),info=cajaRow.querySelector(':scope>.minfo');
  assert.equal(cajaRow.children.length,state.golden<1&&!state.used?3:2,'la nota real de saldo es un hermano del botón');
  const auxRows=Array.from(d.querySelectorAll('#seed-shop .ayuda-menu .mkt-row:not(.ref-seed-row)'));
  assert(auxRows.length>=20,'incluye packs, caja, emergencia, bolsas y cultivos futuros reales');
  assert.equal(d.querySelectorAll('[data-emerg]').length,3);assert.equal(d.querySelectorAll('[data-cont]').length,2);assert(d.querySelectorAll('#semillas-futuras [data-cultivo-bloqueado]').length>=10);
  for(const row of auxRows){
   const body=row.querySelector(':scope>.minfo'),button=row.querySelector(':scope>button');assert(body,'contenido de tarjeta');
   assert.equal(css(row).flexWrap,'wrap','la acción puede pasar a otra línea');
   assert(parseFloat(css(body).flexBasis)>=180,'la descripción reserva ancho legible');assert.match(css(body).minWidth,/min\(100%,\s*180px\)/);
   if(button){assert.equal(css(button).flexShrink,'0');assert.equal(css(button).maxWidth,'100%');assert.equal(css(button).width,'max-content');if(!button.hasAttribute('data-cultivo-bloqueado'))assert.equal(typeof button.onclick,'function','evento real preservado');}
  }
  for(const note of d.querySelectorAll('#packs-shop .motivo-accion')){
   assert.equal(css(note).flexBasis,'100%','el coste ocupa una línea propia');assert.equal(css(note).textAlign,'right');
   assert(contrast(css(note).color,css(note.closest('.mkt-row')).backgroundColor)>=4.5,'el coste no es crema sobre crema');
   assert(note.previousElementSibling?.matches('button'));assert.equal(note.dataset.recargaCoste,'1');assert.match(note.textContent,/Coste: .+ Golden · faltan /);
  }
  const handler=caja.onclick;assert.equal(typeof handler,'function');
  if(state.used){assert(caja.disabled);assert.equal(caja.textContent,'Límite de hoy');assert(!cajaRow.querySelector('.motivo-accion'),'no ofrecer recarga para sortear el límite');}
  else if(state.golden===0){assert(!caja.disabled);assert.equal(caja.textContent,'Recargar Golden');caja.onclick();assert.deepEqual(calls,[{route:'recarga',price:1}]);assert.equal(cajaRow.querySelector('small').textContent,'Coste: 1 Golden · faltan 1');}
  else{assert(!caja.disabled);assert.equal(caja.textContent,'Comprar · 1 Golden');caja.onclick();assert.equal(calls.length,1);assert.equal(calls[0].route,'confirm');assert.equal(calls[0].options.yes,'Comprar · 1 Golden');assert.equal(typeof calls[0].callback,'function');assert.match(calls[0].message,/Máximo tres cajas al día UTC/);}
  for(const id of ['diario','semanal']){const b=packs.querySelector('[data-pack="'+id+'"]'),cost=id==='diario'?1:10;assert.equal(typeof b.onclick,'function');if(state.owned){assert(b.disabled);assert.equal(b.textContent,'Comprado');assert(!b.nextElementSibling?.matches('.motivo-accion'));}else if(state.golden<cost){assert.equal(b.textContent,'Recargar Golden');assert.match(b.nextElementSibling.textContent,new RegExp('Coste: '+cost+' Golden'));}else assert.equal(b.textContent,cost+' Golden');}
  assert.equal(caja.onclick,handler,'CSS no reemplaza eventos');assert.equal(cajaRow.querySelector(':scope>.minfo'),info,'mismo contenido');assert.equal(JSON.stringify(c.G),before,'presentación y rutas de confirmación no cambian G');
  assert.equal(vm.runInContext('JSON.stringify({packs:PACKS_DEF,caja:CAJA_SUMINISTROS,emergencia:EMERG_GOLDEN,contenedores:CONT_DEF})',c),prices,'precios y premios originales intactos');renderedCases++;
 }
 f.dom.window.close();
}
console.log('OK: '+renderedCases+' casos reales de Mercado (Golden 0/1/250, límite y comprado), secciones abiertas, ancho de texto, recarga en línea propia, contraste, mismos controles/rutas y economía intacta. JSDOM no mide layout: completar con navegador.');
