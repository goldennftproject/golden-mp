/* Shared Mercado art, native headings and controls. No account or gameplay state. */
(function(){
 'use strict';
 const watched=new WeakSet(),roots=new WeakSet(),overlays=new WeakSet(),fitKeys=new WeakMap(),fitQueue=new Set();let requested=false,fitPending=false;
 function fitHeading(heading){
  if(innerWidth<900||!document.documentElement.classList.contains('visual-v2')||!document.documentElement.classList.contains('market-pieces-ready')||!heading.closest('.ov')?.classList.contains('show'))return;
  const card=heading.closest('.card'),rect=heading.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const key=card.clientWidth+'|'+devicePixelRatio+'|'+heading.textContent;if(fitKeys.get(heading)===key)return;
  fitKeys.set(heading,key);
  let size=25;heading.style.setProperty('--market-title-font',size+'px');
  while(size>18&&heading.getBoundingClientRect().height>76.2){size--;heading.style.setProperty('--market-title-font',size+'px');}
 }
 function scheduleFit(heading){
  fitQueue.add(heading);if(fitPending)return;fitPending=true;
  const run=()=>{fitPending=false;const pending=Array.from(fitQueue);fitQueue.clear();pending.forEach(fitHeading);};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else Promise.resolve().then(run);
 }
 const shown=new MutationObserver(records=>{for(const record of records)record.target.querySelectorAll(':scope>.card>h3,:scope>.card>.gf-header>h3').forEach(scheduleFit);});
 const resized=typeof ResizeObserver==='function'?new ResizeObserver(records=>{for(const record of records)record.target.querySelectorAll(':scope>h3,:scope>.gf-header>h3').forEach(scheduleFit);}):null;
 function label(heading){
  const old=heading.querySelector(':scope>.wood-menu-title');if(old&&heading.childNodes.length===1)return;
  const span=document.createElement('span');span.className='wood-menu-title';
  for(const node of Array.from(heading.childNodes)){
   if(node===old){while(old.firstChild)span.append(old.firstChild);old.remove();}else span.append(node);
  }
  heading.append(span);
 }
 function register(heading){
  const overlay=heading.closest('.ov'),card=heading.closest('.card');
  if(!overlay||!card||overlay.id==='ov-market'||heading.querySelector('button'))return;
  card.classList.add('wood-window');heading.classList.add('wood-menu-heading');label(heading);
  const close=card.querySelector('.close');if(close&&!close.hasAttribute('aria-label'))close.setAttribute('aria-label','Cerrar ventana');
  if(!watched.has(heading)){watched.add(heading);new MutationObserver(()=>{label(heading);scheduleFit(heading);}).observe(heading,{childList:true});resized?.observe(card);}
  if(!overlays.has(overlay)){overlays.add(overlay);shown.observe(overlay,{attributes:true,attributeFilter:['class']});}
  scheduleFit(heading);
 }
 function dynamic(root){
  root.querySelectorAll(':scope>.card>.gf-header>h3').forEach(register);
  if(!roots.has(root)){roots.add(root);new MutationObserver(()=>dynamic(root)).observe(root,{childList:true,subtree:true});}
 }
 function refresh(){
  document.querySelectorAll('.ov>.card>h3').forEach(register);
  const roulette=document.getElementById('ov-ruletas');if(roulette)dynamic(roulette);
 }
 function loadPieces(){
  if(requested||innerWidth<900||!document.documentElement.classList.contains('visual-v2'))return;
  requested=true;
  Promise.all(['window-frame-aligned.svg','plaque.svg','header-infill-aligned.svg','close.png'].map(file=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=resolve;image.onerror=reject;image.src='assets/market-ui/'+file;
  }))).then(()=>{document.documentElement.classList.add('market-pieces-ready');refresh();}).catch(()=>{});
 }
 function start(){
  refresh();loadPieces();
  new MutationObserver(loadPieces).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',loadPieces);
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.id==='ov-ruletas')dynamic(node);}).observe(document.body,{childList:true});
  window.GoldenMarketFrames=Object.freeze({refresh});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
