/* Encuadre HTML e icono contextual. Conserva controles, textos y estado del juego. */
(function(root){
 'use strict';const doc=root.document;if(!doc)return;let pending=false,icon=null;
 const active=()=>root.innerWidth>=900&&doc.documentElement.classList.contains('visual-v2');
 const visible=el=>!!el&&root.getComputedStyle(el).display!=='none'&&!el.hidden;
 function objectiveKey(text){const t=text.toLowerCase();if(/baúl|baul|bienvenida|premio/.test(t))return'chest';if(/papa|plant|siembr|cosech/.test(t))return'potato';if(/madera|árbol|arbol|tala/.test(t))return'wood';if(/piedra|minar|mina|bronce|hierro/.test(t))return'stone';if(/cocin|plato|comida/.test(t))return'cook';if(/mercado|vend|semilla/.test(t))return'market';return'build';}
 function render(){
  pending=false;const html=doc.documentElement,tuto=doc.getElementById('tuto'),text=doc.getElementById('tuto-txt');
  if(!active()){if(icon){icon.remove();icon=null;}for(const k of ['--ref-center-x','--ref-safe-width'])html.style.removeProperty(k);return;}
  let left=14,right=root.innerWidth-14;
  const shop=doc.getElementById('compras-accesos');if(visible(shop)){const r=shop.getBoundingClientRect();if(r.width&&r.right>0)left=Math.max(left,r.right+20);}
  const ov=doc.getElementById('ov-market'),card=ov?.querySelector(':scope>.card');
  if(ov?.classList.contains('show')&&visible(card)&&!card.classList.contains('movida')){const r=card.getBoundingClientRect();if(r.width&&r.left>left+230)right=Math.min(right,r.left-20);}
  const width=Math.max(230,right-left),center=left+width/2;
  let layoutChanged=false;
  for(const [k,v]of [['--ref-center-x',center+'px'],['--ref-safe-width',width+'px']])if(html.style.getPropertyValue(k)!==v){html.style.setProperty(k,v);layoutChanged=true;}
  if(layoutChanged)root.FARM?.refreshReferenceFraming?.();
  if(tuto&&text){if(!icon){icon=doc.createElement('img');icon.className='reference-objective-icon';icon.alt='';icon.setAttribute('aria-hidden','true');icon.width=48;icon.height=45;icon.addEventListener('error',()=>{icon.hidden=true;});tuto.prepend(icon);}const src='assets/visual-v2/skin/objective-'+objectiveKey(text.textContent||'')+'.png?v=4';if(icon.getAttribute('src')!==src){icon.hidden=false;icon.src=src;}}
 }
 function update(){if(pending)return;pending=true;if(root.requestAnimationFrame)root.requestAnimationFrame(render);else Promise.resolve().then(render);}
 const observer=new root.MutationObserver(update);observer.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 for(const id of ['tuto','ov-market']){const el=doc.getElementById(id);if(el)observer.observe(el,{attributes:true,attributeFilter:['class'],childList:true,subtree:true,characterData:true});}
 root.addEventListener('resize',update);if(root.ResizeObserver){const sizes=new root.ResizeObserver(update);for(const id of ['hudbar','compras-accesos','tuto']){const el=doc.getElementById(id);if(el)sizes.observe(el);}}
 root.GoldenReferenceUI={update,objectiveKey};update();
})(typeof window==='undefined'?globalThis:window);
