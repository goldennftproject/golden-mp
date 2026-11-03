/* Reference composition: decorative HUD additions only. Values and actions remain in ui.js. */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 const icons={
  farm:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M5 17L20 4l15 13v20H5z" fill="#aa432a" stroke="#3c2719" stroke-width="2"/><path d="M9 17v18m5-18v18m12-18v18m5-18v18" stroke="#773623"/><path d="M3 17L20 2l17 15-3 3L20 8 6 20z" fill="#d7b16b" stroke="#4c321e" stroke-width="2"/><path d="M7 20v16h26V20M10 17l10-9 10 9M20 10v8" fill="none" stroke="#ffebbe" stroke-width="2"/><path d="M14 22h12v14H14z" fill="#903d28" stroke="#ffebbe" stroke-width="2"/><path d="M15 24l10 10m0-10L15 34M20 22v14" fill="none" stroke="#e4c38e" stroke-width="1.5"/><path d="M17 13h6v5h-6z" fill="#52351f" stroke="#f7d995"/></svg>',
  energy:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M21 2L6 23h12l-3 15 19-23H22l5-13z" fill="#ffd04c" stroke="#563315" stroke-width="2" stroke-linejoin="round"/><path d="M21 6L11 20h9" fill="none" stroke="#fff0a6" stroke-width="2"/></svg>',
  heart:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="refhudHeart" x2="0" y2="1"><stop stop-color="#f87459"/><stop offset=".5" stop-color="#dc4432"/><stop offset="1" stop-color="#9d2c24"/></linearGradient></defs><path d="M20 35L4 19V9l6-5h7l3 4 3-4h7l6 5v10z" fill="url(#refhudHeart)" stroke="#4f251b" stroke-width="2"/><path d="M8 12V9l3-2h5" fill="none" stroke="#ffc39e" stroke-width="3"/></svg>',
  gold:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="refhudGold" x2="0" y2="1"><stop stop-color="#fff096"/><stop offset=".35" stop-color="#ffc740"/><stop offset=".72" stop-color="#d9931e"/><stop offset="1" stop-color="#a66417"/></linearGradient></defs><circle cx="20" cy="20" r="18" fill="#9b611a" stroke="#4a2e13" stroke-width="2"/><circle cx="20" cy="19" r="16" fill="url(#refhudGold)" stroke="#f8de6f" stroke-width="2"/><circle cx="20" cy="19" r="12" fill="#e7ab2d" stroke="#a56a15" stroke-width="1.5"/><path d="M20 9l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffdf6b" stroke="#aa6a14" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 13l2-3m4-3 3-1" stroke="#fff5ba" stroke-width="2" stroke-linecap="round"/></svg>',
  sword:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M13 27L29 5l8-2-1 8-20 20z" fill="#e4e5cf" stroke="#3d3429" stroke-width="2"/><path d="M14 25l13-15" fill="none" stroke="#fff9df" stroke-width="2"/><path d="M7 23l11 10-3 3L4 26z" fill="#e2ad45" stroke="#563a1e" stroke-width="2"/><path d="M9 29l4 4-6 6-4-4z" fill="#94602b" stroke="#422e20" stroke-width="2"/></svg>'
 };
 const managed=new Map(),logoOriginals=new Map();const logoSource='assets/visual-v2/skin/logo-stacked.png?v=4';let queued=false,logoFailed=false;
 function logos(active){
  for(const img of doc.querySelectorAll('.gf-logo')){
   if(!logoOriginals.has(img)){
    logoOriginals.set(img,img.getAttribute('src'));
    img.addEventListener('error',()=>{
     if(img.getAttribute('src')!==logoSource)return;
     logoFailed=true;for(const [node,src]of logoOriginals)if(node.getAttribute('src')!==src)node.setAttribute('src',src);
    });
   }
   const src=active&&!logoFailed?logoSource:logoOriginals.get(img);
   if(img.getAttribute('src')!==src)img.setAttribute('src',src);
  }
 }
 function addNode(node,kind,label,extraClass){
  if(!node)return;
  let entry=managed.get(node);
  if(!entry){
   const icon=doc.createElement('span');icon.className='refhud-icon'+(extraClass?' '+extraClass:'');icon.setAttribute('aria-hidden','true');icon.innerHTML=icons[kind];
   const text=label?doc.createElement('span'):null;
   if(text){text.className='refhud-label';text.textContent=label;}
   entry={icon,text};managed.set(node,entry);
  }
  if(entry.icon.parentNode!==node)node.append(entry.icon);
  if(entry.text&&entry.text.parentNode!==node)node.append(entry.text);
 }
 function add(id,kind,label){addNode(doc.getElementById(id),kind,label);}
 function refresh(){
  queued=false;const hud=doc.getElementById('hudbar');if(!hud)return;
  const active=root.innerWidth>=900&&doc.documentElement.classList.contains('visual-v2');
  hud.classList.toggle('reference-hud',active);
  logos(active);
  if(active){add('lvlpill','farm');add('energia-granja-pill','energy','Energía');add('hppill','heart');add('cbar','sword');add('stampill','sword','Estamina');addNode(doc.getElementById('s-golden')?.closest('.pill'),'gold',null,'refhud-gold-coin');}
  else for(const [node,entry]of managed){entry.icon.remove();if(entry.text)entry.text.remove();node.classList.remove('refhud-long');}
  for(const id of ['s-plata','s-golden']){const v=doc.getElementById(id);if(v)v.closest('.pill')?.classList.toggle('refhud-long',active&&v.textContent.trim().length>7);}
 }
 function schedule(){if(!queued){queued=true;root.queueMicrotask(refresh);}}
 const hud=doc.getElementById('hudbar');if(hud){const changes=new root.MutationObserver(schedule);changes.observe(hud,{childList:true,subtree:true});}
 const mode=new root.MutationObserver(schedule);mode.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 root.addEventListener('resize',refresh);root.GoldenReferenceHUD={refresh};refresh();
})(typeof window==='undefined'?globalThis:window);
