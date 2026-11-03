/* Presentación del entorno. Sólo lee el mundo actual: no compra, coloca, bloquea ni guarda. */
(function(root){
 'use strict';
 const scenes=new WeakMap(), BUILDINGS=new Set(['barn','market','store','horno','cocina','establo','curtiduria']);
 const enabled=()=>!!root.GoldenVisual?.isEnabled();
 function forestStyle(base){
  if(!enabled())return base;
  const values={_referenceForest:true,BOSQUE_LEYES:'c',BOSQUE_FILA_CADA:1,
   BOSQUE_DENSIDAD:{c:.86},BOSQUE_ESC_VAR:.14,BOSQUE_JITTER_X:3,BOSQUE_JITTER_Y:7,BOSQUE_JITTER_FONDO:9};
  return Object.create(base,Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value,enumerable:true}])));
 }
 function forestSample(col,row,law){
  const mod=n=>((n%8)+8)%8;
  let seed=(Math.imul(mod(col)+1,374761393)^Math.imul(mod(row)+1,668265263)^Math.imul(String(law).charCodeAt(0)||99,1442695041))>>>0;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return{scale:next(),flip:next()<.45,rx:next(),ry:next(),rd:next()};
 }
 function ownedCells(base){
  const cached=base._terrenoCache?.[base.expOwned||0]?.mias;
  if(cached&&typeof cached.has==='function')return new Set(cached);
  const cells=new Set(),cols=base.COLS_BASE||Math.round(base.WORLD_W/base.TILE),rows=base.ROWS_BASE||Math.round(base.WORLD_H/base.TILE);
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++)cells.add(c+','+r);
  for(const e of (base.EXPANSIONES||[]).slice(0,base.expOwned||0))for(let c=e.c0;c<e.c1;c++)for(let r=e.r0;r<e.r1;r++)cells.add(c+','+r);
  return cells;
 }
 const visible=o=>o&&!o.oculto&&o.sprite&&o.sprite.visible!==false&&o.sprite.active!==false;
 function planPaths(scene,base){
  const T=base.TILE||42,owned=ownedCells(base),blocked=new Set(),protectedRects=[],key=(c,r)=>c+','+r;
  // La cerca y cualquier celda ajena quedan fuera; el sendero no reclama terreno nuevo.
  for(const s of owned){const[c,r]=s.split(',').map(Number);if([[1,0],[-1,0],[0,1],[0,-1]].some(([dc,dr])=>!owned.has(key(c+dc,r+dr))))blocked.add(s);}
  for(const o of scene.objs||[])if(visible(o)&&Number.isFinite(o.cx)&&Number.isFinite(o.by)){
   const width=Math.max(T,Number(o.w)||T),c0=Math.floor((o.cx-width/2+.1)/T),c1=Math.ceil((o.cx+width/2-.1)/T),r=Math.floor((o.by-1)/T);
   for(let c=c0;c<c1;c++)blocked.add(key(c,r));
   const visualWidth=Math.max(T*.45,Number(o.w)||T);
   protectedRects.push({left:o.cx-visualWidth/2,right:o.cx+visualWidth/2,top:r*T,bottom:(r+1)*T});
  }
  for(const p of scene.plots||[])if(p.state!=='locked'&&!p.oculto&&Number.isFinite(p.cx)&&Number.isFinite(p.by)){
   blocked.add(key(Math.floor(p.cx/T),Math.floor(p.by/T)));
   protectedRects.push({left:p.cx-T/2,right:p.cx+T/2,top:p.by-T/2,bottom:p.by+T/2});
  }
  const walk=s=>owned.has(s)&&!blocked.has(s);
  const entrance=o=>{
   const col=Math.floor(o.cx/T),row=Math.floor((o.by+T*.22)/T),choices=[];
   for(let dr=-1;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)if(walk(key(col+dc,row+dr)))choices.push({c:col+dc,r:row+dr,d:Math.abs(dc)+Math.abs(dr)+(dr<0?1:0)});
   choices.sort((a,b)=>a.d-b.d||a.r-b.r||a.c-b.c);return choices[0]&&key(choices[0].c,choices[0].r);
  };
  const buildings=(scene.objs||[]).filter(o=>visible(o)&&BUILDINGS.has(o.type)&&!String(o.sprite.texture?.key||'').startsWith('build_')&&(o.sprite.alpha==null||o.sprite.alpha>.7));
  // Desgaste corto de las entradas, no una ruta prometida. Se comprueba el disco completo
  // frente a cultivos/objetos y terreno: puede caber aunque una celda esté parcialmente ocupada.
  const pads=[],padRadius=T*.17;
  const safePad=(x,y)=>{
   for(const dx of[-padRadius,0,padRadius])for(const dy of[-padRadius,0,padRadius])if(!owned.has(key(Math.floor((x+dx)/T),Math.floor((y+dy)/T))))return false;
   return !protectedRects.some(r=>x+padRadius>r.left&&x-padRadius<r.right&&y+padRadius>r.top&&y-padRadius<r.bottom);
  };
  for(const o of buildings){
   const points=[];
   for(let i=0;i<=5;i++){const x=o.cx,y=o.by+T*(.20+.34*i/5);if(!safePad(x,y))break;points.push({x,y,cell:key(Math.floor(x/T),Math.floor(y/T))});}
   if(points.length>1)pads.push(points);
  }
  const market=buildings.find(o=>o.type==='market'),start=market&&entrance(market),paths=[];
  if(!start)return{paths,pads,padRadius,protectedRects,owned,blocked,T};
  const queue=[start],parents=new Map([[start,null]]);
  for(let i=0;i<queue.length;i++){
   const[c,r]=queue[i].split(',').map(Number);
   for(const[dc,dr]of[[1,0],[0,1],[-1,0],[0,-1]]){const next=key(c+dc,r+dr);if(walk(next)&&!parents.has(next)){parents.set(next,queue[i]);queue.push(next);}}
  }
  for(const o of buildings)if(o!==market){
   const end=entrance(o);if(!end||!parents.has(end))continue;
   const cells=[];for(let s=end;s!=null;s=parents.get(s))cells.push(s);cells.reverse();
   if(cells.length<2)continue;
   paths.push(cells.map(s=>{const[c,r]=s.split(',').map(Number);return{x:(c+.5)*T,y:(r+.5)*T,cell:s};}));
  }
  return{paths,pads,padRadius,protectedRects,owned,blocked,T};
 }
 function signature(scene,base){
  return [enabled()?1:0,base.editMode?1:0,base.expOwned||0,base.COLS_BASE,base.ROWS_BASE,
   ...(scene.objs||[]).map(o=>[o.type,o.cx,o.by,o.w,visible(o)?1:0,BUILDINGS.has(o.type)&&String(o.sprite?.texture?.key||'').startsWith('build_')?'work':'ready'].join(':')),
   ...(scene.plots||[]).filter(p=>p.state!=='locked').map(p=>[p.cx,p.by].join(':'))].join('|');
 }
 function refresh(scene){
  const state=scenes.get(scene),base=root.GF;if(!state||!base)return false;
  const sig=signature(scene,base);if(state.signature===sig)return true;state.signature=sig;
  if(state.graphics){state.graphics.destroy();state.graphics=null;}
  if(!enabled()||base.editMode)return true;
  const plan=planPaths(scene,base);if(!plan.paths.length&&!plan.pads.length)return true;
  const g=state.graphics=scene.add.graphics().setDepth(-999.4),painted=new Set();
  for(const points of [...plan.pads,...plan.paths])for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],edge=[a.x.toFixed(2)+','+a.y.toFixed(2),b.x.toFixed(2)+','+b.y.toFixed(2)].sort().join('/');if(painted.has(edge))continue;painted.add(edge);
   const length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(length/4));
   for(let n=0;n<=steps;n++){
    const t=n/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    const wave=Math.sin(x*.13+y*.17)*1.1,r=plan.T*.082+(Math.sin(x*.31+y*.23)+1)*.45;
    g.fillStyle(0xd4b574,.15).fillCircle(x+wave,y-wave,r+1.4);
    g.fillStyle(0xb49355,.35).fillCircle(x+wave,y-wave,r);
   }
  }
  return true;
 }
 function clear(scene){const state=scenes.get(scene);if(!state)return;if(state.timer?.remove)state.timer.remove();if(state.graphics)state.graphics.destroy();scenes.delete(scene);}
 function attach(scene){
  if(scenes.has(scene)){refresh(scene);return;}
  const state={signature:null,graphics:null,timer:null};scenes.set(scene,state);
  // Obras y distribución pueden cambiar sin reiniciar Farm. Sólo cambia una firma gráfica.
  if(scene.time?.addEvent)state.timer=scene.time.addEvent({delay:800,loop:true,callback:()=>refresh(scene)});
  scene.events?.once?.('shutdown',()=>clear(scene));refresh(scene);
 }
 const api={forestStyle,forestSample,planPaths,attach,refresh,clear};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.GoldenReferenceWorld=api;
})(typeof window==='undefined'?globalThis:window);
