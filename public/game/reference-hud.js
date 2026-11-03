/* Reference composition: decorative HUD additions only. Values and actions remain in ui.js. */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 const icons={
  farm:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M5 17L20 4l15 13v19H5z" fill="#ad4b2d" stroke="#3c2719" stroke-width="2"/><path d="M3 17L20 2l17 15-3 3L20 8 6 20z" fill="#e3bb67" stroke="#4c321e" stroke-width="2"/><path d="M15 22h10v14H15z" fill="#624023" stroke="#f6dca2" stroke-width="2"/><path d="M18 14h4v5h-4z" fill="#ffde70"/></svg>',
  energy:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M21 2L6 23h12l-3 15 19-23H22l5-13z" fill="#ffd04c" stroke="#563315" stroke-width="2" stroke-linejoin="round"/><path d="M21 6L11 20h9" fill="none" stroke="#fff0a6" stroke-width="2"/></svg>',
  heart:'<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 35L4 19V9l6-5h7l3 4 3-4h7l6 5v10z" fill="#d54b37" stroke="#4f251b" stroke-width="2"/><path d="M8 12V9l3-2h5" fill="none" stroke="#ffaf83" stroke-width="3"/></svg>',
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
 function add(id,kind,label){
  const node=doc.getElementById(id);if(!node)return;
  let entry=managed.get(node);
  if(!entry){
   const icon=doc.createElement('span');icon.className='refhud-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=icons[kind];
   const text=label?doc.createElement('span'):null;
   if(text){text.className='refhud-label';text.textContent=label;}
   entry={icon,text};managed.set(node,entry);
  }
  if(entry.icon.parentNode!==node)node.append(entry.icon);
  if(entry.text&&entry.text.parentNode!==node)node.append(entry.text);
 }
 function refresh(){
  queued=false;const hud=doc.getElementById('hudbar');if(!hud)return;
  const active=root.innerWidth>=900&&doc.documentElement.classList.contains('visual-v2');
  hud.classList.toggle('reference-hud',active);
  logos(active);
  if(active){add('lvlpill','farm');add('energia-granja-pill','energy','Energía');add('hppill','heart');add('cbar','sword');add('stampill','sword','Estamina');}
  else for(const [node,entry]of managed){entry.icon.remove();if(entry.text)entry.text.remove();node.classList.remove('refhud-long');}
  for(const id of ['s-plata','s-golden']){const v=doc.getElementById(id);if(v)v.closest('.pill')?.classList.toggle('refhud-long',active&&v.textContent.trim().length>7);}
 }
 function schedule(){if(!queued){queued=true;root.queueMicrotask(refresh);}}
 const hud=doc.getElementById('hudbar');if(hud){const changes=new root.MutationObserver(schedule);changes.observe(hud,{childList:true,subtree:true});}
 const mode=new root.MutationObserver(schedule);mode.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 root.addEventListener('resize',refresh);root.GoldenReferenceHUD={refresh};refresh();
})(typeof window==='undefined'?globalThis:window);
