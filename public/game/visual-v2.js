/* Prueba visual local reversible. Conserva claves, medidas y RGBA originales en memoria.
   No añade campos a G, no compra, no guarda y no reinicia la escena. */
(function(root){
 'use strict';
 const PREF='gf_visual_v2', originals=new Map(), variants=new Map(), effectAnchors=new Map();
 let enabled=true,manager=null,ready=false;
 try{enabled=root.localStorage.getItem(PREF)!=='classic';}catch(_){}
 const pc=()=>root.innerWidth>=900;
 const isEnabled=()=>enabled&&pc();
 function copy(image){const cv=root.document.createElement('canvas');cv.width=image.width;cv.height=image.height;cv.getContext('2d').drawImage(image,0,0);return cv;}
 function repaint(){
  if(!manager||!ready)return;
  for(const [key,original]of originals){
   const t=manager.get(key),cv=t.getSourceImage(),image=isEnabled()?variants.get(key):original;
   if(!cv.getContext)continue;const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(image,0,0);
   t.refresh();if(root.GoldenLighting?.invalidate)root.GoldenLighting.invalidate(t);
  }
  const farm=root.FARM;if(farm?.sys?.isActive()){farm.acabadosEdificios?.();farm.updateForge?.();}
 }
 function prepare(scene){
  if(ready&&manager===scene.textures)return true;
  manager=scene.textures;
  const map=scene.cache.json.get('__visualv2map');
  if(!map?.frames||!manager.exists('__visualv2')){enabled=false;sync();return false;}
  const src=manager.get('__visualv2').getSourceImage();
  for(const [key,fr]of Object.entries(map.frames)){
   if(!manager.exists(key))continue;
   const texture=manager.get(key),old=texture.getSourceImage();
   // El atlas base usa CanvasTexture. Si cayó al respaldo Image, se conserva intacto.
   if(!old.getContext||!texture.refresh)continue;
   originals.set(key,copy(old));
   if(fr.anchors)effectAnchors.set(key,fr.anchors);
   const cv=root.document.createElement('canvas');cv.width=fr.w;cv.height=fr.h;cv.getContext('2d').drawImage(src,fr.x,fr.y,fr.w,fr.h,0,0,fr.w,fr.h);variants.set(key,cv);
  }
  ready=true;manager.remove('__visualv2');scene.cache.json.remove('__visualv2map');repaint();sync();return true;
 }
 const paths={
  vip:'<path d="M4 10l5 5 7-10 7 10 5-5-3 16H7z" fill="#e5ac32"/><path d="M8 22h16v4H8z" fill="#9d6225"/><path d="M14 17h4v4h-4z" fill="#b94a3f"/>',
  objetos:'<path d="M8 13h16l3 14H5z" fill="#bd8746"/><path d="M11 5h10l2 6H9z" fill="#f5d79b"/><path d="M11 13h10M16 12v16" fill="none"/><path d="M13 18h6v7h-6z" fill="#e8c365"/>',
  mejoras:'<path d="M3 15L15 5l12 10v14H3z" fill="#b8793d"/><path d="M11 19h8v10h-8z" fill="#5d3824"/><path d="M21 8l5-6 5 6h-3v10h-4V8z" fill="#80ab54"/>',
  suministros:'<path d="M4 11h24v18H4z" fill="#bd8746"/><path d="M4 17h24M11 11v18M22 11v18" fill="none"/><path d="M8 6h6v5H8z" fill="#87a957"/><path d="M18 4h7v7h-7z" fill="#c17b45"/>'
 };
 const oldImages=new WeakMap(), oldLabels=new WeakMap();
 function decorate(){
  const doc=root.document;if(!doc)return;
  const short=(node,label)=>{if(!node)return;if(!oldLabels.has(node))oldLabels.set(node,node.textContent);const value=isEnabled()?label:oldLabels.get(node);if(node.textContent!==value)node.textContent=value;node.title=oldLabels.get(node);};
  const quota=doc.querySelector('#seed-shop>.shophead');
  if(quota){const full=oldLabels.get(quota)||quota.textContent;short(quota,'Semillas · Cupo '+(full.match(/\d+\/\d+/)?.[0]||''));}
  short(doc.querySelector('#shop-buy>.info'),'Semillas con Plata · Sin coste de energía');
  short(doc.querySelector('#ov-market [data-shop="buy"]'),'Semillas');
  for(const img of doc.querySelectorAll('#compras-accesos [data-tienda] img')){
   if(!oldImages.has(img))oldImages.set(img,img.getAttribute('src'));
   const k=img.parentElement.dataset.tienda;
   img.src=isEnabled()&&paths[k]?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><g stroke="#4a2d1d" stroke-width="2" stroke-linejoin="round">'+paths[k]+'</g></svg>'):oldImages.get(img);
  }
  for(const img of doc.querySelectorAll('#seed-shop .mimg img')){
   const src=img.getAttribute('src')||'';if(!/seed_/.test(src)&&!oldImages.has(img))continue;
   if(!oldImages.has(img))oldImages.set(img,src);
   img.src=isEnabled()?oldImages.get(img).replace('/seed_','/crop_'):oldImages.get(img);
  }
 }
function reconcileMovedCards(){
 const doc=root.document;if(!doc)return;
 for(const card of doc.querySelectorAll('.ov.show>.card.movida')){
  // offsetWidth/Height no incluyen la escala temporal de ovpopm; getBoundingClientRect sí.
  // El drag universal guarda px del viewport. No convertir porcentajes o centros contextuales.
  if(!/^-?\d+(?:\.\d+)?px$/.test(card.style.left)||!/^(-?\d+(?:\.\d+)?)px$/.test(card.style.top))continue;
  const left=Math.max(4,Math.min(parseFloat(card.style.left),Math.max(4,root.innerWidth-card.offsetWidth-4)));
  const top=Math.max(4,Math.min(parseFloat(card.style.top),Math.max(4,root.innerHeight-card.offsetHeight-4)));
  const lx=left+'px',ty=top+'px';
  if(card.style.left!==lx)card.style.left=lx;
  if(card.style.top!==ty)card.style.top=ty;
  card.style.right='auto';card.style.bottom='auto';card.style.transform='none';
 }
}


 function sync(){root.document.documentElement.classList.toggle('visual-v2',isEnabled());decorate();const b=root.document.getElementById('cfg-visual-v2');if(b){b.textContent='Aspecto: '+(isEnabled()?'Renovado':'Clásico');b.setAttribute('aria-pressed',String(isEnabled()));}reconcileMovedCards();}
 function setEnabled(on){enabled=!!on;try{root.localStorage.setItem(PREF,enabled?'renewed':'classic');}catch(_){}repaint();sync();}
 let visitAtlas=null;
 async function visitImage(key,original){
  if(!isEnabled()||!['barn_evo_0','barn_evo_1','barn_evo_2','barn_evo_3','market','cocina','store','horno','establo','curtiduria'].includes(key))return original;
  try{
   if(!visitAtlas)visitAtlas=Promise.all([root.fetch('assets/visual-v2/atlas.json?v=2').then(r=>{if(!r.ok)throw Error('atlas');return r.json();}),new Promise((resolve,reject)=>{const i=new root.Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src='assets/visual-v2/atlas.png?v=2';})]);
   const [map,image]=await visitAtlas,fr=map.frames[key];if(!fr)return original;
   const cv=root.document.createElement('canvas');cv.width=fr.w;cv.height=fr.h;cv.getContext('2d').drawImage(image,fr.x,fr.y,fr.w,fr.h,0,0,fr.w,fr.h);return cv;
  }catch(_){return original;}
 }
 // Anclajes locales por arte: sólo lectura; nunca altera GF.CHIMENEA ni la partida.
 function effectAnchor(sprite,kind,fallback){
  const key=sprite?.texture?.key,p=effectAnchors.get(key)?.[kind];
  if(!isEnabled()||!variants.has(key)||!p||![p.x,p.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))return fallback;
  const w=sprite.displayWidth,h=sprite.displayHeight;
  if(!(w>0&&h>0))return fallback;
  const u=sprite.flipX?1-p.x:p.x,v=sprite.flipY?1-p.y:p.y;
  const x=(u-sprite.originX)*w,y=(v-sprite.originY)*h,r=sprite.rotation||0,c=Math.cos(r),s=Math.sin(r);
  return {x:sprite.x+x*c-y*s,y:sprite.y+x*s+y*c};
 }
 const api={effectAnchor,prepare,setEnabled,isEnabled,pc,visitImage,hasVariant:key=>isEnabled()&&variants.has(key)};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document){root.GoldenVisual=api;sync();const b=root.document.getElementById('cfg-visual-v2');if(b)b.addEventListener('click',()=>setEnabled(!enabled));const shop=root.document.getElementById('seed-shop');if(shop)new root.MutationObserver(decorate).observe(shop,{childList:true,subtree:true});const movedCardObserver=new root.MutationObserver(reconcileMovedCards);root.document.querySelectorAll('.ov').forEach(ov=>movedCardObserver.observe(ov,{attributes:true,attributeFilter:['class']}));let wide=pc();root.addEventListener('resize',()=>{if(pc()!==wide){wide=pc();repaint();sync();}});}
})(typeof window==='undefined'?globalThis:window);
