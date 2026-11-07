/* Fit the existing desktop shop to the actual free height. Local presentation only. */
(function(root){
 'use strict';
 const clamp=(low,value,high)=>Math.max(low,Math.min(value,high));
 function chooseLayout(input){
  const {width,height,hudBottom,bottom}=input;
  const preferredWidth=height<=740?clamp(174,width*.15,210):clamp(190,width*.152,252);
  const preferredTop=height<=740?130:clamp(145,height*.187,182);
  // Includes native Ruletas content/padding (~69px), not only its 62px min-height.
  const fullRatio=419/247,fullExtras=88,compactRatio=358/247,compactExtras=56;
  if(preferredTop+preferredWidth*fullRatio+fullExtras<=bottom)
   return{mode:'normal',top:preferredTop,width:preferredWidth,maxHeight:bottom-preferredTop};
  const top=Math.max(8,Math.ceil(hudBottom+12)),available=Math.max(0,bottom-top);
  const fullWidth=Math.min(preferredWidth,(available-fullExtras)/fullRatio);
  if(fullWidth>=174)return{mode:'fit',top,width:Math.floor(fullWidth),maxHeight:available};
  const compactWidth=Math.min(preferredWidth,(available-compactExtras)/compactRatio);
  return{mode:'compact',top,width:Math.max(174,Math.floor(compactWidth)),maxHeight:available,scroll:compactWidth<174};
 }
 const doc=root.document;if(!doc){if(typeof module!=='undefined')module.exports={chooseLayout};return;}
 const nav=doc.getElementById('compras-accesos');if(!nav||root.GoldenAdaptiveLayout)return;
 let queued=false,lastGeometry='';
 function shown(el){if(!el||el.hidden)return false;const s=root.getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}
 function toggle(el,name,on){if(el.classList.contains(name)!==on)el.classList.toggle(name,on);}
 function set(name,value){if(nav.style.getPropertyValue(name)!==value)nav.style.setProperty(name,value);}
 function clear(){
  toggle(doc.documentElement,'adaptive-layout',false);toggle(nav,'adaptive-shortcuts',false);toggle(nav,'adaptive-scroll',false);
  for(const key of ['--adaptive-shop-top','--adaptive-shop-width','--adaptive-shop-height'])if(nav.style.getPropertyValue(key))nav.style.removeProperty(key);
 }
 function syncFraming(){
  // Floating buffs and the objective can change the free vertical area without changing
  // the shop width. Reframe only when those measured boxes really changed.
  const boxes=['hudbar','hud-flot','tuto','compras-accesos','hotwrap'].map(id=>{
   const el=doc.getElementById(id);if(!shown(el))return id+':hidden';
   const r=el.getBoundingClientRect();return id+':'+[r.left,r.top,r.right,r.bottom].map(n=>Math.round(n*4)/4).join(',');
  });
  const key=[root.innerWidth,root.innerHeight,...boxes].join('|');
  if(key===lastGeometry)return;lastGeometry=key;
  root.GoldenReferenceUI?.update?.();root.FARM?.refreshReferenceFraming?.();
 }
 function render(){
  queued=false;
  if(root.innerWidth<900||!doc.documentElement.classList.contains('visual-v2')||!doc.documentElement.classList.contains('concept-finish-ready')||nav.classList.contains('compras-combate')){clear();lastGeometry='';return;}
  const width=root.innerWidth,height=root.innerHeight,hud=doc.getElementById('hudbar'),flot=doc.getElementById('hud-flot');
  let hudBottom=shown(hud)?hud.getBoundingClientRect().bottom:0;
  if(shown(flot)){const r=flot.getBoundingClientRect();if(r.height)hudBottom=Math.max(hudBottom,r.bottom);}
  const laneRight=16+(height<=740?clamp(174,width*.15,210):clamp(190,width*.152,252));
  let bottom=height-10;
  for(const id of ['logpanel','hotwrap']){
   const el=doc.getElementById(id);if(!shown(el))continue;
   const r=el.getBoundingClientRect();
   if(r.height>0&&r.width>0&&r.left<laneRight+8&&r.right>8&&r.top>hudBottom)bottom=Math.min(bottom,r.top-10);
  }
  const layout=chooseLayout({width,height,hudBottom,bottom});
  if(layout.mode==='normal'){clear();syncFraming();return;}
  toggle(doc.documentElement,'adaptive-layout',true);toggle(nav,'adaptive-shortcuts',layout.mode==='compact');toggle(nav,'adaptive-scroll',!!layout.scroll);
  set('--adaptive-shop-top',layout.top+'px');set('--adaptive-shop-width',layout.width+'px');set('--adaptive-shop-height',layout.maxHeight+'px');
  syncFraming();
 }
 function schedule(){if(queued)return;queued=true;if(root.requestAnimationFrame)root.requestAnimationFrame(render);else Promise.resolve().then(render);}
 const observer=new root.MutationObserver(schedule);
 observer.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 for(const id of ['compras-accesos','hudbar','hud-flot','tuto','logpanel','hotwrap']){
  const el=doc.getElementById(id);if(el)observer.observe(el,{attributes:true,attributeFilter:['class','style']});
 }
 if(root.ResizeObserver){const sizes=new root.ResizeObserver(schedule);for(const id of ['compras-accesos','hudbar','hud-flot','tuto','logpanel','hotwrap']){const el=doc.getElementById(id);if(el)sizes.observe(el);}}
 root.addEventListener('resize',schedule);root.visualViewport?.addEventListener('resize',schedule);
 root.GoldenAdaptiveLayout=Object.freeze({refresh:schedule,chooseLayout});schedule();
})(typeof window==='undefined'?globalThis:window);
