'use strict';
// Real presence markup/CSS/script; synthetic DOM and rectangle model only. No players or network.
// JSDOM has no paint/layout: browser QA separately verifies visible stacking.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'public/game/presencia-ui.js'),'utf8');
function rule(selector){const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),m=html.match(new RegExp(escaped+'\\{[^}]+\\}'));assert(m,selector);return m[0];}
const buttonMarkup=html.match(/<button[^>]+id="jugadores-online"[^>]*>[\s\S]*?<\/button>/)?.[0];
const panelMarkup=html.match(/<section id="lista-online"[\s\S]*?<\/section>/)?.[0];
const shopRule=html.match(/#compras-accesos\{display:block;position:fixed;[^}]+\}/)?.[0];
assert(buttonMarkup&&panelMarkup&&shopRule,'real presence markup and PC shop styles');
const css=[rule('.hudbar'),rule('#lista-online'),rule('#lista-online[hidden]'),rule('#lista-online ul'),rule('#lista-online li'),rule('.ov'),shopRule].join('\n');
const dom=new JSDOM('<style>'+css+'</style><div class="hudbar" id="hudbar"><div class="brand">'+buttonMarkup+panelMarkup+'</div></div><nav id="compras-accesos">Tienda</nav><div class="ov"></div>',{runScripts:'outside-only'});
const w=dom.window,d=w.document,p=d.getElementById('lista-online'),button=d.getElementById('jugadores-online');
let networkCalls=0,checks=0,anchor={left:268,bottom:80};
w.fetch=()=>{networkCalls++;throw Error('Network forbidden in this test');};
w.EventSource=function(){networkCalls++;throw Error('No presence connection in a DOM test');};
w.innerWidth=300;w.innerHeight=220;d.getElementById('s-online').textContent='101';
button.getBoundingClientRect=()=>({...anchor});
p.getBoundingClientRect=()=>{
 const s=w.getComputedStyle(p),n=k=>parseFloat(s[k])||0;
 const box=n('width')+(s.boxSizing==='border-box'?0:n('paddingLeft')+n('paddingRight')+n('borderLeftWidth')+n('borderRightWidth'));
 const max=parseFloat(s.maxWidth);return{width:Math.min(box,Number.isFinite(max)?max:Infinity)};
};
w.eval(source);
const check=(name,fn)=>{fn();checks++;console.log('  ok   '+name);};
function inside(){
 const rect={left:parseFloat(p.style.left),top:parseFloat(p.style.top),width:p.getBoundingClientRect().width,maxHeight:parseFloat(p.style.maxHeight)};
 assert(rect.left>=8);assert(rect.left+rect.width<=w.innerWidth-8);
 assert(rect.top>=8);assert(rect.top+rect.maxHeight<=w.innerHeight-8);assert(rect.maxHeight<=w.innerHeight*.6);
 assert(rect.width<=320);return rect;
}
try{
 check('la lista existente sale del contexto del HUD y queda entre Tienda y ventanas',()=>{
  assert.equal(p.parentElement,d.body);assert.equal(p.closest('#hudbar'),null);
  assert.equal(d.querySelectorAll('#lista-online').length,1);
  const panelZ=Number(w.getComputedStyle(p).zIndex),shopZ=Number(w.getComputedStyle(d.getElementById('compras-accesos')).zIndex);
  const modalZ=Number(rule('.ov').match(/z-index:var\(--ov-frente,\s*(\d+)\)/)?.[1]);
  assert(Number.isFinite(panelZ)&&Number.isFinite(shopZ)&&Number.isFinite(modalZ));assert(panelZ>shopZ);assert(panelZ<modalZ);
  assert.equal(button.getAttribute('aria-controls'),'lista-online');assert.equal(button.getAttribute('aria-expanded'),'false');
 });
 check('101 nombres conservan texto seguro, ajuste de línea y desplazamiento interno',()=>{
  const names=['<img src=x onerror=alert(1)>',...Array.from({length:100},(_,i)=>'Nombre público '+i)];
  w.actualizarListaOnline(names);assert.equal(p.querySelectorAll('li').length,101);assert.equal(p.querySelector('img'),null);
  assert.equal(p.querySelector('li').textContent,names[0]);assert.equal(w.getComputedStyle(p).overflow,'auto');
  assert.equal(w.getComputedStyle(p.querySelector('li')).overflowWrap,'anywhere');assert.equal(w.getComputedStyle(p).boxSizing,'border-box');
 });
 check('abrir junto al borde respeta el margen con el ancho real de borde',()=>{
  button.click();assert.equal(p.hidden,false);assert.equal(button.getAttribute('aria-expanded'),'true');inside();
 });
 check('resize en 300, 900 y 1200 px y poca altura mantiene la lista dentro del viewport',()=>{
  for(const [width,height]of [[1200,768],[900,700],[300,160],[900,120]]){
   w.innerWidth=width;w.innerHeight=height;anchor={left:width-32,bottom:80};w.dispatchEvent(new w.Event('resize'));const rect=inside();
   if(width>=900)assert.equal(rect.width,320);
  }
 });
 check('actualizar nombres recoloca una lista abierta sin cambiar el contador de presencia',()=>{
  w.innerWidth=900;w.innerHeight=700;anchor={left:20,bottom:110};w.actualizarListaOnline(['Nombre nuevo']);
  const rect=inside();assert.equal(rect.left,20);assert.equal(rect.top,118);assert.equal(p.querySelectorAll('li').length,1);
  assert.equal(d.getElementById('s-online').textContent,'101');
 });
 check('clic interno conserva la lista; clic exterior la cierra y actualiza aria-expanded',()=>{
  p.querySelector('li').click();assert.equal(p.hidden,false);
  d.body.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(p.hidden,true);assert.equal(button.getAttribute('aria-expanded'),'false');
 });
 check('Escape cierra y devuelve el foco al botón; abrir otra vez usa la geometría actual',()=>{
  anchor={left:40,bottom:100};button.click();assert.equal(p.hidden,false);assert.equal(parseFloat(p.style.left),40);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(p.hidden,true);assert.equal(d.activeElement,button);
  assert.equal(button.getAttribute('aria-expanded'),'false');
 });
 check('vacío y reconexión permanecen legibles sin alterar conteo ni iniciar consultas',()=>{
  w.actualizarListaOnline([]);assert.match(p.textContent,/No hay jugadores conectados/);
  w.actualizarListaOnline(null);assert.match(p.textContent,/Reconectando/);
  assert.equal(d.getElementById('s-online').textContent,'101');assert.equal(networkCalls,0);
 });
 console.log('\n✓ '+checks+' contratos de ventana de presencia; nombres sintéticos y cero red.\n');
}finally{dom.window.close();}
