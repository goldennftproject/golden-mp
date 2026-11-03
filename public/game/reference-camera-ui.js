/* Controles de encuadre locales de PC. No escriben progreso ni preferencias de la partida. */
(function(root){
 'use strict';
 let bar=null,overview=null,zoomIn=null,zoomOut=null,timer=null,observer=null;
 const doc=root.document;
 if(!doc)return;
 const scene=()=>{
  const farm=root.FARM;
  return root.GoldenVisual?.isEnabled()&&root.innerWidth>=900&&farm?.sys?.isActive()&&typeof farm.setReferenceOverview==='function'?farm:null;
 };
 function sync(){
  if(!bar)return;
  const farm=scene(),modal=!!doc.querySelector('.ov.show');
  bar.hidden=!farm||modal;
  if(!farm)return;
  const full=!!farm._referenceOverview&&!farm._referenceCameraManual;
  overview.title=full?'Volver a la vista cercana':'Ver toda la granja';
  overview.setAttribute('aria-label',overview.title);overview.setAttribute('aria-pressed',String(full));
 }
 function init(){
  if(bar)return;
  bar=doc.createElement('div');bar.id='reference-camera-controls';bar.setAttribute('role','group');bar.setAttribute('aria-label','Cámara de la granja');
  const button=(id,title,html,action)=>{
   const b=doc.createElement('button');b.id=id;b.type='button';b.title=title;b.setAttribute('aria-label',title);b.innerHTML=html;
   b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const farm=scene();if(farm)action(farm);sync();});bar.append(b);return b;
  };
  overview=button('reference-camera-overview','Ver toda la granja','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M7 12h10M12 7v10"/></svg>',farm=>farm.setReferenceOverview(!(farm._referenceOverview&&!farm._referenceCameraManual)));
  zoomIn=button('reference-camera-plus','Acercar la vista','<span aria-hidden="true">+</span>',farm=>farm.stepReferenceZoom(1));
  zoomOut=button('reference-camera-minus','Alejar la vista','<span aria-hidden="true">−</span>',farm=>farm.stepReferenceZoom(-1));
  doc.body.append(bar);
  if(root.MutationObserver){observer=new root.MutationObserver(sync);observer.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});doc.querySelectorAll('.ov').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));}
  root.addEventListener?.('resize',sync);
  timer=root.setInterval(sync,500);sync();
 }
 function destroy(){
  if(timer!=null)root.clearInterval(timer);timer=null;observer?.disconnect();observer=null;root.removeEventListener?.('resize',sync);
  bar?.remove();bar=overview=zoomIn=zoomOut=null;
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
 // pagehide/pageshow incluyen la caché de navegación: volver restaura una sola barra y reloj.
 root.addEventListener?.('pagehide',destroy);root.addEventListener?.('pageshow',init);
 root.GoldenReferenceCameraUI={sync,destroy};
})(typeof window==='undefined'?globalThis:window);
