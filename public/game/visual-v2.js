/* Prueba visual local reversible. Conserva claves, medidas y RGBA originales en memoria.
   No añade campos a G, no compra, no guarda y no reinicia la escena. */
(function(root){
 'use strict';
 const PREF='gf_visual_v2', originals=new Map(), variants=new Map(), effectAnchors=new Map();
 const ATLAS_VERSION=5, UI_VERSION=4, CONCEPT_UI_VERSION=5, UI_KEYS=new Set(['vip','objetos','mejoras','suministros']);
 const CROP_UI_KEYS=new Set(['papa','ciruela','cereza','remolacha','zanahoria','cebolla','calabacin','repollo','calabaza','brocoli','girasol','trigo','maiz']);
 const RELIC_ART={cobre:'gallinero',plata:'huerto',jade:'establo',oro:'tractor',granero:'granero',rubi:'molino',corona:'invernadero'};
 let enabled=true,manager=null,ready=false,loading=null,assetAtlas=null,compositesDirty=false;
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
  const forest=manager.game?.scene?.keys?.forest;if(forest?.sys?.isActive())forest.refreshVisualTheme?.();
  const needsComposites=variants.has('tree')||variants.has('grass_a');
  if(needsComposites)compositesDirty=true;
  const farm=root.FARM;if(farm?.sys?.isActive()){
   farm.acabadosEdificios?.();farm.updateForge?.();
   // Suelo, bosque cercano/lejos y copas son imágenes derivadas de los mismos originales.
   if(needsComposites&&farm.refreshVisualTheme?.()===true)compositesDirty=false;
  }
 }
 function prepareFarm(scene){
  // Al cambiar de aspecto en Bosque, Farm está detenida. Su mosaico global sigue en caché:
  // se invalida al crear Farm, cuando sus objetos anteriores ya no se están renderizando.
  if(!compositesDirty||manager!==scene.textures)return false;
  if(scene.mosaicoTS){scene.mosaicoTS.destroy();scene.mosaicoTS=null;}
  if(manager.exists('bosque_mosaico'))manager.remove('bosque_mosaico');
  compositesDirty=false;return true;
 }
 function validFrame(fr,src){return fr&&['x','y','w','h'].every(k=>Number.isInteger(fr[k]))&&fr.x>=0&&fr.y>=0&&fr.w>0&&fr.h>0&&fr.x+fr.w<=src.width&&fr.y+fr.h<=src.height;}
 function install(map,src){
  if(!map?.frames||!manager)return false;
  for(const [key,fr]of Object.entries(map.frames)){
   if(!manager.exists(key)||!validFrame(fr,src))continue;
   const texture=manager.get(key),old=texture.getSourceImage();
   // El atlas base usa CanvasTexture. Si cayó al respaldo Image, se conserva intacto.
   if(!old.getContext||!texture.refresh||old.width!==fr.w||old.height!==fr.h)continue;
   originals.set(key,copy(old));
   if(fr.anchors)effectAnchors.set(key,fr.anchors);
   const cv=root.document.createElement('canvas');cv.width=fr.w;cv.height=fr.h;cv.getContext('2d').drawImage(src,fr.x,fr.y,fr.w,fr.h,0,0,fr.w,fr.h);variants.set(key,cv);
  }
  ready=true;repaint();sync();return true;
 }
 function getAtlas(){
  if(!assetAtlas)assetAtlas=Promise.all([
   root.fetch('assets/visual-v2/atlas.json?v='+ATLAS_VERSION).then(r=>{if(!r.ok)throw Error('atlas');return r.json();}),
   new Promise((resolve,reject)=>{const i=new root.Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src='assets/visual-v2/atlas.png?v='+ATLAS_VERSION;})
  ]).catch(e=>{assetAtlas=null;throw e;});
  return assetAtlas;
 }
 function ensure(){
  if(ready||!manager||!isEnabled())return loading;
  if(!loading){const target=manager;loading=getAtlas().then(([map,src])=>{if(manager===target&&!ready)install(map,src);}).catch(()=>{}).finally(()=>{loading=null;});}
  return loading;
 }
 function prepare(scene){
  if(manager!==scene.textures){manager=scene.textures;ready=false;originals.clear();variants.clear();effectAnchors.clear();}
  if(ready)return true;
  const map=scene.cache.json.get('__visualv2map');
  if(map?.frames&&manager.exists('__visualv2')){
   const installed=install(map,manager.get('__visualv2').getSourceImage());
   manager.remove('__visualv2');scene.cache.json.remove('__visualv2map');return installed;
  }
  // Arrancar en pantalla pequeña no descarga el atlas; ensanchar a PC lo carga sin reiniciar.
  ensure();return false;
 }
 const oldImages=new WeakMap(), oldLabels=new WeakMap(), failedUi=new Set(), missionNodes=new WeakMap(), missionDecorated=new WeakSet(), relicCards=new WeakMap(), failedRelics=new Set(), cropImages=new WeakMap(), failedCrops=new Set();
 const uiSource=key=>'assets/visual-v2/ui/'+key+((UI_KEYS.has(key)||key==='misiones')?'-concept':'')+'.png?v='+((UI_KEYS.has(key)||key==='misiones')?CONCEPT_UI_VERSION:UI_VERSION);
 const cropSource=key=>'assets/visual-v2/ui/crops/'+key+'.png?v='+CONCEPT_UI_VERSION;
 function replaceUiImage(img,key){
  if(!oldImages.has(img)){
   oldImages.set(img,img.getAttribute('src'));
   img.addEventListener('error',()=>{if(img.getAttribute('src')===uiSource(key)){failedUi.add(key);img.setAttribute('src',oldImages.get(img));}});
  }
  const src=isEnabled()&&!failedUi.has(key)?uiSource(key):oldImages.get(img);
  if(img.getAttribute('src')!==src)img.setAttribute('src',src);
 }
 function decorate(){
  const doc=root.document;if(!doc)return;
  const short=(node,label)=>{if(!node)return;if(!oldLabels.has(node))oldLabels.set(node,node.textContent);const value=isEnabled()?label:oldLabels.get(node);if(node.textContent!==value)node.textContent=value;node.title=oldLabels.get(node);};
  const quota=doc.querySelector('#seed-shop>.shophead');
  if(quota){const full=oldLabels.get(quota)||quota.textContent;short(quota,'Semillas · Cupo '+(full.match(/\d+\/\d+/)?.[0]||''));}
  short(doc.querySelector('#shop-buy>.info'),'Semillas con Plata · Sin coste de energía');
  short(doc.querySelector('#ov-market [data-shop="buy"]'),'Semillas');
  for(const img of doc.querySelectorAll('#compras-accesos [data-tienda] img,#ov-tienda .tienda-arte img,#ov-vip .vip-ilustracion img')){
   const original=oldImages.get(img)||img.getAttribute('src')||'';
   const k=img.closest('[data-tienda]')?.dataset.tienda||original.match(/shop-(vip|objetos|mejoras|suministros)-v\d+\./)?.[1];
   if(UI_KEYS.has(k))replaceUiImage(img,k);
  }
  const mission=doc.getElementById('misiones-acceso');
  if(mission){
   if(!missionNodes.has(mission))missionNodes.set(mission,Array.from(mission.childNodes));
   if(isEnabled()&&!missionDecorated.has(mission)){
    const icon=doc.createElement('img'),label=doc.createElement('span');icon.src=uiSource('misiones');icon.alt='';icon.width=26;icon.height=26;icon.setAttribute('aria-hidden','true');icon.addEventListener('error',()=>{icon.hidden=true;});label.textContent='Misiones';
    const counter=mission.querySelector('#misiones-contador');
    mission.replaceChildren(icon,label,...(counter?[counter]:[]));missionDecorated.add(mission);
   }else if(!isEnabled()&&missionDecorated.has(mission)){mission.replaceChildren(...missionNodes.get(mission));missionDecorated.delete(mission);}
  }
  for(const card of doc.querySelectorAll('#ov-reliquias .objeto-card')){
   const source=card.querySelector('[data-artefacto-comprar],[data-artefacto-cobrar],[data-artefacto-pendiente]'),id=source&&(source.dataset.artefactoComprar||source.dataset.artefactoCobrar||source.dataset.artefactoPendiente),model=String(id||'').split(':')[0],key=Object.prototype.hasOwnProperty.call(RELIC_ART,model)?RELIC_ART[model]:null;
   let image=relicCards.get(card);
   if(isEnabled()&&key&&!failedRelics.has(key)){
    if(!image){
     image=doc.createElement('img');image.className='reliquia-arte';image.alt='';image.width=112;image.height=112;image.loading='lazy';image.decoding='async';image.setAttribute('aria-hidden','true');image.src='assets/visual-v2/ui/reliquias/'+key+'.png?v='+UI_VERSION;
     image.addEventListener('error',()=>{failedRelics.add(key);image.remove();card.classList.remove('reliquia-renovada');});relicCards.set(card,image);
    }
    if(image.parentElement!==card)card.prepend(image);card.classList.add('reliquia-renovada');
   }else{if(image?.parentElement===card)image.remove();card.classList.remove('reliquia-renovada');}
  }
  for(const img of doc.querySelectorAll('#seed-shop .mimg img')){
   let state=cropImages.get(img);
   if(!state){const original=img.getAttribute('src')||'',key=original.match(/\/(?:seed_|crop_)([a-z]+)\.png(?:\?|$)/)?.[1];if(!CROP_UI_KEYS.has(key))continue;
    state={original,key,fallback:original.replace('/seed_','/crop_')};cropImages.set(img,state);
    img.addEventListener('error',()=>{if(img.getAttribute('src')===cropSource(state.key)){failedCrops.add(state.key);img.setAttribute('src',state.fallback);}});
   }
   const next=isEnabled()?(failedCrops.has(state.key)?state.fallback:cropSource(state.key)):state.original;
   if(img.getAttribute('src')!==next)img.setAttribute('src',next);
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
 function setEnabled(on){enabled=!!on;try{root.localStorage.setItem(PREF,enabled?'renewed':'classic');}catch(_){}repaint();sync();ensure();}
 async function visitImage(key,original){
  if(!isEnabled())return original;
  if(variants.has(key))return copy(variants.get(key));
  try{
   const [map,image]=await getAtlas(),fr=Object.prototype.hasOwnProperty.call(map.frames||{},key)?map.frames[key]:null;if(!isEnabled()||!validFrame(fr,image))return original;
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
 const api={effectAnchor,prepare,prepareFarm,setEnabled,isEnabled,pc,visitImage,hasVariant:key=>isEnabled()&&variants.has(key)};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document){root.GoldenVisual=api;sync();const b=root.document.getElementById('cfg-visual-v2');if(b)b.addEventListener('click',()=>setEnabled(!enabled));const artObserver=new root.MutationObserver(decorate);root.document.querySelectorAll('#seed-shop,#ov-tienda,#ov-vip,#ov-reliquias').forEach(el=>artObserver.observe(el,{childList:true,subtree:true}));const movedCardObserver=new root.MutationObserver(reconcileMovedCards);root.document.querySelectorAll('.ov').forEach(ov=>movedCardObserver.observe(ov,{attributes:true,attributeFilter:['class']}));let wide=pc();root.addEventListener('resize',()=>{if(pc()!==wide){wide=pc();repaint();sync();ensure();}});}
})(typeof window==='undefined'?globalThis:window);
