/* Accesos visibles. Preferencias locales de descubrimiento; nunca saldos o partidas. */
(function(root){
 'use strict';
 const doc=root.document,nav=doc.getElementById('novedades-accesos');if(!nav||root.GoldenDiscovery)return;
 const storageKey='gf_features_seen_v1',features=[{id:'ruletas-v1',panel:'ov-ruletas'}];
 const originals=new WeakMap();let seen=readSeen(),queued=false;
 function readSeen(){try{const a=JSON.parse(root.localStorage.getItem(storageKey)||'[]');return new Set(Array.isArray(a)?a.filter(x=>typeof x==='string'&&/^[a-z0-9-]{1,80}$/.test(x)).slice(-100):[]);}catch{return new Set();}}
 function markSeen(id){if(seen.has(id))return;seen.add(id);try{root.localStorage.setItem(storageKey,JSON.stringify(Array.from(seen).slice(-100)));}catch{}}
 function badges(){
  for(const feature of features){
   if(doc.getElementById(feature.panel)?.classList.contains('show'))markSeen(feature.id);
   for(const button of doc.querySelectorAll('[data-novedad="'+feature.id+'"]')){
    if(!originals.has(button))originals.set(button,button.getAttribute('aria-label'));
    let badge=button.querySelector('.novedad-badge');if(!badge){badge=doc.createElement('span');badge.className='novedad-badge';badge.textContent='Nuevo';badge.setAttribute('aria-hidden','true');button.append(badge);}
    const fresh=!seen.has(feature.id);if(badge.hidden===fresh)badge.hidden=!fresh;
    const original=originals.get(button),name=button.dataset.novedadNombre||'Ruletas';
    const label=fresh?name+': nuevo':original;
    if(label===null){if(button.hasAttribute('aria-label'))button.removeAttribute('aria-label');}
    else if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
   }
  }
 }
 function news(){
  const button=doc.getElementById('noticias-acceso'),badge=doc.getElementById('noticias-contador');if(!button||!badge)return;
  const s=root.GoldenNews?.state?.()||{unread:0,loaded:false,failed:false};
  const count=Number.isSafeInteger(s.unread)&&s.unread>0?s.unread:0;
  badge.hidden=!count;badge.textContent=count?String(count):'';
  button.setAttribute('aria-label',count?'Noticias: '+count+' sin leer':'Noticias');
  button.title=s.failed?'Noticias: no se pudo actualizar. Abrir para comprobar la conexión.':!s.loaded?'Noticias: consultando publicaciones':'Leer noticias y actualizaciones del juego';
 }
 function visible(el){if(!el||el.hidden||el.classList.contains('hidden'))return false;const s=root.getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}
 function position(){
  const hud=doc.getElementById('hudbar'),gate=doc.getElementById('gate'),loading=doc.getElementById('loading');
  nav.hidden=!visible(hud)||visible(gate)||visible(loading);if(nav.hidden)return;
  const h=hud.getBoundingClientRect(),flot=doc.getElementById('hud-flot');
  let top=Math.max(8,h.bottom+8);if(visible(flot)){const f=flot.getBoundingClientRect();if(f.height>0)top=Math.max(top,f.bottom+8);}
  const n=nav.getBoundingClientRect(),tuto=doc.getElementById('tuto');
  if(visible(tuto)){const t=tuto.getBoundingClientRect();if(t.width>0&&t.right>n.left&&t.left<n.right&&t.bottom>=top&&t.top<top+n.height)top=t.bottom+8;}
  const value=Math.ceil(top)+'px';if(nav.style.top!==value)nav.style.top=value;
 }
 function refresh(){badges();news();position();}
 function schedule(){if(queued)return;queued=true;root.queueMicrotask(()=>{queued=false;refresh();});}
 const changed=new root.MutationObserver(schedule);
 for(const id of ['compras-accesos','gmenu','ov-tienda','ov-ruletas']){const el=doc.getElementById(id);if(el)changed.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
 const layout=new root.MutationObserver(schedule);
 layout.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 for(const id of ['gate','loading','tuto']){const el=doc.getElementById(id);if(el)layout.observe(el,{attributes:true,attributeFilter:['class','style']});}
 if(root.ResizeObserver){const sizes=new root.ResizeObserver(schedule);for(const id of ['hudbar','hud-flot','tuto']){const el=doc.getElementById(id);if(el)sizes.observe(el);}}
 root.addEventListener('resize',schedule);root.addEventListener('golden:news-state',news);
 root.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null){seen=readSeen();schedule();}});
 root.GoldenDiscovery=Object.freeze({refresh});refresh();
})(window);
