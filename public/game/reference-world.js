/* Presentación del entorno. Sólo lee el mundo actual: no compra, coloca, bloquea ni guarda. */
(function(root){
 'use strict';
 const scenes=new WeakMap(), frameContacts=new WeakMap();
 const BUILDINGS=new Set(['barn','market','store','horno','cocina','establo','curtiduria']);
 const CONTACT_STYLE={
  barn:{growth:1,stone:.82},market:{growth:.57,stone:.34},store:{growth:.71,stone:.85},
  horno:{growth:.57,stone:.91},cocina:{growth:.82,stone:.57},establo:{growth:.84,stone:.31},
  curtiduria:{growth:.72,stone:.51},
 };
 const LEAF_COLORS=[0x294b1a,0x345b1b,0x3d701d,0x4f861f,0x5e9227,0x6b9a2b];
 const LEAF_ROSETTE=[
  '...34...',
  '..3453..',
  '.234442.',
  '23433231',
  '12332211',
  '.122210.',
  '..0110..',
  '...00...',
 ];
 const GRASS_COLORS=[0x29491b,0x365a1c,0x46701e,0x557e23,0x69912a,0x789e34];
 const WORN_COLORS=[0x688037,0x7c8443,0x94874c,0xa98e56];
 const STONE_COLORS=[0x464f2a,0x5d613a,0x75724c,0x8e865d,0x9c9469];
 const PATH_EARTH=[0x8b693d,0xa17a49,0xb38c54,0xc39d64];
 const PATH_EDGE=[0x64752f,0x7d8040,0x93864a];
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
  const T=base.TILE||42,owned=ownedCells(base),fence=new Set(),protectedRects=[],key=(c,r)=>c+','+r;
  // La cerca y cualquier celda ajena quedan fuera; el sendero no reclama terreno nuevo.
  for(const s of owned){const[c,r]=s.split(',').map(Number);if([[1,0],[-1,0],[0,1],[0,-1]].some(([dc,dr])=>!owned.has(key(c+dc,r+dr))))fence.add(s);}
  const blocked=new Set(fence);
  for(const o of scene.objs||[])if(visible(o)&&Number.isFinite(o.cx)&&Number.isFinite(o.by)){
   const width=Math.max(T,Number(o.w)||T),c0=Math.floor((o.cx-width/2+.1)/T),c1=Math.ceil((o.cx+width/2-.1)/T),r=Math.floor((o.by-1)/T);
   for(let c=c0;c<c1;c++)blocked.add(key(c,r));
   const visualWidth=Math.max(T*.45,Number(o.w)||T);
   protectedRects.push({owner:o,left:o.cx-visualWidth/2,right:o.cx+visualWidth/2,top:r*T,bottom:(r+1)*T});
  }
  for(const p of scene.plots||[])if(p.state!=='locked'&&!p.oculto&&Number.isFinite(p.cx)&&Number.isFinite(p.by)){
   blocked.add(key(Math.floor(p.cx/T),Math.floor(p.by/T)));
   protectedRects.push({left:p.cx-T/2,right:p.cx+T/2,top:p.by-T/2,bottom:p.by+T/2});
  }
  const pond=pondBounds(scene.pondImg);
  const fixedObstacles=pond?[pond]:[];
  for(const a of scene.adornos||[])if(Number.isFinite(a.cx)&&Number.isFinite(a.by))
   fixedObstacles.push({left:a.cx-T/2,right:a.cx+T/2,top:a.by-T,bottom:a.by});
  for(const box of fixedObstacles){
   protectedRects.push(box);
   for(let c=Math.floor(box.left/T);c*T<box.right;c++)
    for(let r=Math.floor(box.top/T);r*T<box.bottom;r++)blocked.add(key(c,r));
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
  const pads=[],entries=[],padRadius=T*.17;
  const safePad=(x,y)=>{
   for(const dx of[-padRadius,0,padRadius])for(const dy of[-padRadius,0,padRadius]){
    const cell=key(Math.floor((x+dx)/T),Math.floor((y+dy)/T));
    if(!owned.has(cell)||fence.has(cell))return false;
   }
   return !protectedRects.some(r=>x+padRadius>r.left&&x-padRadius<r.right&&y+padRadius>r.top&&y-padRadius<r.bottom);
  };
  for(const o of buildings){
   const points=[];
   for(let i=0;i<=5;i++){const x=o.cx,y=o.by+T*(.20+.34*i/5);if(!safePad(x,y))break;points.push({x,y,cell:key(Math.floor(x/T),Math.floor(y/T))});}
   if(points.length>1){
    pads.push(points);
    entries.push({building:o.type,points,entrance:entrance(o)});
   }
  }
  const market=buildings.find(o=>o.type==='market'),start=market&&entrance(market),paths=[];
  if(!start)return{paths,pads,entries,padRadius,protectedRects,owned,blocked,fence,T};
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
  return{paths,pads,entries,padRadius,protectedRects,owned,blocked,fence,T};
 }
 function terrainNoise(x,y){
  let n=Math.imul(x,374761393)^Math.imul(y,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
 }
 function trailSurface(plan){
  const {paths,entries,T,owned,blocked,fence,protectedRects}=plan;
  const edges=new Map(),joins=new Map(),traffic=new Map(),coverage=new Map(),step=3;
  const cellKey=(x,y)=>Math.floor(x/T)+','+Math.floor(y/T);
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const edgeKey=(a,b)=>[a.cell,b.cell].sort().join('/');
  // El tránsito compartido ensancha el tronco y las ramas secundarias quedan finas.
  for(const route of paths){
   for(const p of route)traffic.set(p.cell,(traffic.get(p.cell)||0)+1);
   for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],key=edgeKey(a,b);
    if(!edges.has(key)){
     edges.set(key,[a,b]);
     for(const [from,to] of [[a,b],[b,a]]){
      if(!joins.has(from.cell))joins.set(from.cell,[]);
      joins.get(from.cell).push(to);
     }
    }
   }
  }
  const width=p=>T*(.128+Math.min(.105,(traffic.get(p.cell)||1)*.024));
  function stamp(p,radius,outer=.24){
   const wobble=Math.sin(p.x*.064+p.y*.082)*2.7+Math.sin(p.y*.19-p.x*.12)*.9;
   radius*=1+Math.sin(p.x*.1-p.y*.079)*.11;
   const x=p.x+wobble,y=p.y-wobble*.66;
   const limit=radius*(1+outer);
   const c0=Math.floor((x-limit)/step),c1=Math.floor((x+limit)/step);
   const r0=Math.floor((y-limit)/step),r1=Math.floor((y+limit)/step);
   for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const dx=c*step+step*.5-x,dy=r*step+step*.5-y;
    const distance=Math.hypot(dx,dy)/radius;
    if(distance>1+outer)continue;
    const value=Math.min(1,(1+outer-distance)/(outer+.37));
    const key=c+','+r;
    if((coverage.get(key)||0)<value)coverage.set(key,value);
   }
  }
  function line(a,b,from,to){
   const count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/2.5));
   for(let i=0;i<=count;i++){
    const t=i/count;
    stamp(lerp(a,b,t),from+(to-from)*t);
   }
  }
  const trim=(p,n)=>{
   const connections=joins.get(p.cell);
   if(connections?.length!==2)return p;
   const [a,b]=connections;
   return a.x===b.x||a.y===b.y?p:lerp(p,n,.31);
  };
  for(const [a,b] of edges.values())line(trim(a,b),trim(b,a),width(a),width(b));
  for(const [a,b] of edges.values())for(const [p,n] of [[a,b],[b,a]]){
   const branches=joins.get(p.cell);
   if(branches?.length!==2||branches[0]!==n)continue;
   const start=trim(p,branches[0]),end=trim(p,branches[1]);
   if(start===p)continue;
   for(let i=0;i<=14;i++){
    const t=i/14;
    stamp(lerp(lerp(start,p,t),lerp(p,end,t),t),width(p));
   }
  }
  for(const {building,points,entrance} of entries){
   const first=points[0],last=points.at(-1),market=building==='market';
   const radius=T*(market?.32:.157);
   line(first,last,radius,T*(market?.244:.128));
   if(!joins.has(entrance))continue;
   const [col,row]=entrance.split(',').map(Number);
   const end={x:(col+.5)*T,y:(row+.5)*T,cell:entrance};
   // Un ramal de entrada sólo llega a la ruta cuando la línea conserva suelo libre.
   const length=Math.hypot(end.x-last.x,end.y-last.y);
   const count=Math.max(1,Math.ceil(length/(T*.15)));
   let open=length<T*1.05;
   for(let i=0;i<=count&&open;i++){
    const p=lerp(last,end,i/count),key=cellKey(p.x,p.y);
    open=owned.has(key)&&!blocked.has(key);
   }
   if(open)line(last,end,T*(market?.244:.128),width(end));
  }
  const marks=[];
  for(const [key,strength] of coverage){
   const [c,r]=key.split(',').map(Number);
   const left=c*step,top=r*step,right=left+step,bottom=top+step;
   const cells=[cellKey(left,top),cellKey(right-.01,top),cellKey(left,bottom-.01),cellKey(right-.01,bottom-.01)];
   if(cells.some(cell=>!owned.has(cell)||fence.has(cell)))continue;
   if(protectedRects.some(o=>left<o.right&&right>o.left&&top<o.bottom&&bottom>o.top))continue;
   const tone=terrainNoise(c,r),grain=terrainNoise(Math.floor(c/3),Math.floor(r/3));
   const edge=strength<.48;
   if(strength<.10||edge&&tone>strength+.36)continue;
   const palette=edge?PATH_EDGE:PATH_EARTH;
   const color=palette[Math.floor((grain*.39+tone*.61)*palette.length)];
   const alpha=edge?.14+strength*.43:.36+strength*.36;
   const inset=edge&&tone>.58?1:0;
   marks.push({left:left+inset,top,width:step-inset,height:step,color,alpha});
   if(strength>.68&&tone>.982)
    marks.push({left:left+1,top:top+1,width:2,height:1,color:0x876a44,alpha:.54});
  }
  return marks;
 }
 function finishedContact(o){
  return visible(o)&&Object.hasOwn(CONTACT_STYLE,o.type)&&!o.locked&&!String(o.sprite.texture?.key||'').startsWith('build_')
   &&(o.sprite.alpha==null||o.sprite.alpha>.7);
 }
 function frameContact(s){
  const f=s.frame||{},w=f.cutWidth||s.width,h=f.cutHeight||s.height;
  const fallback={left:.10,right:.90,bottom:.97,columns:null};
  const source=s.texture?.getSourceImage?.();
  if(!source||!root.document?.createElement||!(w>0&&h>0))return fallback;
  let cache=frameContacts.get(source);
  if(!cache){cache=new Map();frameContacts.set(source,cache);}
  const sx=f.cutX||0,sy=f.cutY||0,key=[sx,sy,w,h,root.GoldenVisual?.hasVariant?.(s.texture?.key)].join(':');
  if(cache.has(key))return cache.get(key);
  let result=fallback;
  try{
   const canvas=root.document.createElement('canvas');
   canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(source,sx,sy,w,h,0,0,w,h);
   const {data}=ctx.getImageData(0,0,w,h),columns=new Uint16Array(w);
   let top=h,bottom=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>155){
    columns[x]=y+1;top=Math.min(top,y);bottom=y+1;
   }
   const footBand=Math.max(3,(bottom-top)*.24);
   const left=columns.findIndex(y=>y>bottom-footBand),right=columns.findLastIndex(y=>y>bottom-footBand)+1;
   if(bottom>0&&left>=0&&left<right)result={left:left/w,right:right/w,bottom:bottom/h,columns,h};
  }catch(_){/* La silueta aproximada cubre texturas que no se pueden leer. */}
  cache.set(key,result);return result;
 }
 function worldContact(o){
  const s=o.sprite,w=s.displayWidth,h=s.displayHeight;
  if(!(Number.isFinite(w)&&w>0&&Number.isFinite(h)&&h>0))return null;
  const f=frameContact(s);
  const x=(s.x??o.cx)-(s.originX??.5)*w,y=(s.y??o.by)-(s.originY??1)*h;
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const left=x+(s.flipX?1-f.right:f.left)*w,right=x+(s.flipX?1-f.left:f.right)*w;
  const bottom=y+f.bottom*h;
  function at(px){
   if(!f.columns)return bottom;
   const u=(px-x)/w,i=Math.min(f.columns.length-1,Math.max(0,Math.floor((s.flipX?1-u:u)*f.columns.length)));
   const foot=f.columns[i]/f.h;
   return foot>f.bottom-.20?y+foot*h:bottom;
  }
  return{left,right,bottom,at};
 }
 function pondBounds(pond){
  if(!pond||pond.visible===false||pond.active===false||!(pond.displayWidth>0&&pond.displayHeight>0))return null;
  const left=pond.x-pond.displayWidth*(pond.originX??.5),top=pond.y-pond.displayHeight*(pond.originY??.5);
  return{left,right:left+pond.displayWidth,top,bottom:top+pond.displayHeight};
 }
 function paintLeaves(paint,x,y,side,scale,rosettes){
  for(const [out,up,size,shade] of rosettes){
   const w=Math.round(8*size*scale),height=Math.round(8*size*scale);
   const left=x+Math.round(side*out*scale)-Math.floor(w/2),top=y+Math.round(up*scale)-height;
   for(let row=0;row<height;row++){
    const art=LEAF_ROSETTE[Math.floor(row*8/height)];
    for(let col=0;col<w;){
     const sample=i=>art[side===1?7-Math.floor(i*8/w):Math.floor(i*8/w)];
     const value=sample(col);
     let end=col+1;
     while(end<w&&sample(end)===value)end++;
     if(value!=='.')paint(LEAF_COLORS[Math.max(0,Number(value)+shade)],1,left+col,top+row,end-col,1);
     col=end;
    }
   }
  }
 }
 function shadeFooting(foot,center,entry,ground,random){
  const left=Math.ceil(foot.left),right=Math.floor(foot.right);
  // Cada tramo toma el pie de la pared y se dispersa en el pasto que ya existe.
  for(let x=left-9;x<right+9;x+=2){
   const wallX=Math.min(right-1,Math.max(left,x));
   const y=Math.round(foot.at(wallX));
   const distance=Math.abs(x-center),outside=Math.abs(x-wallX);
   const wear=Math.max(0,1-distance/entry);
   const wave=Math.sin((x-left)*.19)*2+Math.cos((x-left)*.47);
   const spread=Math.max(1,Math.round(11+wave-outside*.85+wear*8));
   for(let dy=-3;dy<spread;dy+=2){
    const fade=1-Math.max(0,dy)/spread,tone=random();
    if(dy>1&&tone<.56*(1-fade))continue;
    const step=dy<0?0:Math.min(5,Math.floor(tone*6));
    const color=wear>.20&&dy>=0
     ?WORN_COLORS[Math.min(3,Math.floor(tone*3.5+wear*.75))]
     :GRASS_COLORS[step];
    const strength=(dy<0?.68:.46+tone*.23)*fade*(1-outside*.052);
    ground(color,strength,x,y+dy,2,dy===spread-1?1:2);
   }
  }
  // Los laterales giran hacia atrás a la altura de la base, debajo de la silueta.
  for(const side of [-1,1]){
   const edge=side<0?left:right-1,base=Math.round(foot.at(edge));
   const span=side<0?18:23;
   for(let back=2;back<=span;back+=2){
    const fade=1-back/(span+4),curve=Math.round(Math.sin(back/span*1.8)*4);
    const thickness=4+Math.round(fade*9+Math.sin(back*.48)*2);
    for(let out=-3;out<thickness;out+=2){
     const tone=random();
     if(out>3&&tone<(out/thickness)*.39)continue;
     const color=GRASS_COLORS[out<0?0:1+Math.floor(tone*5)];
     const x=edge+side*(out+curve)-(side<0?1:0);
     ground(color,fade*(.47+tone*.23),x,base-back,2,2);
    }
   }
  }
 }
 function wearAtDoor(foot,center,entry,owner,plan,ground,random){
  const y=Math.round(foot.at(center));
  const pad=plan.pads.find(points=>Math.abs(points[0].x-owner.cx)<.01
   && Math.abs(points[0].y-owner.by-plan.T*.20)<.01)?.[0];
  const run=Math.min(28,Math.max(16,Math.round((pad?.y??y+15)-y+5)));
  for(let dy=0;dy<run;dy+=2){
   const t=dy/run,x=Math.round(center+((pad?.x??center)-center)*t);
   const span=Math.max(4,Math.round(entry*(.72-.46*t)));
   for(let dx=-span;dx<span;dx+=2){
    const tone=random(),edge=Math.abs(dx)/span;
    if(tone<.14+edge*.37+t*.12)continue;
    const color=WORN_COLORS[Math.floor(tone*WORN_COLORS.length)];
    ground(color,(.64-.31*t)*(1-edge*.38),x+dx,y+dy,2,2);
   }
  }
 }
 function stoneChip(paint,x,y,width,random){
  const step=width>6?2:1,offset=Math.floor(random()*2);
  paint(STONE_COLORS[0],.75,x,y+1,width,2);
  paint(STONE_COLORS[1],.93,x+offset,y,width-1,2);
  paint(STONE_COLORS[2],.91,x+step,y,width-step-1,1);
  paint(STONE_COLORS[3+Number(random()>.72)],.84,x+step+1,y-1,Math.max(1,width-step-4),1);
  if(width>6)paint(LEAF_COLORS[2],.88,x+width-3,y+1,2,2);
 }
 function growAlongWall(foot,center,entry,style,ground,leaves,random){
  const left=Math.ceil(foot.left),right=Math.floor(foot.right);
  for(let x=left-2;x<right+2;){
   const direction=x<center?-1:1;
   const distance=Math.abs(x-center);
   const door=Math.max(0,1-distance/entry);
   const localX=Math.min(right-1,Math.max(left,x));
   const baseY=Math.round(foot.at(localX));
   const y=baseY+1+Math.floor(random()*3);
   const pocket=.55+.45*Math.sin((x-left)*.18+style.growth*7);
   const stone=random()<style.stone*(door>.30?.35:.47);
   const height=Math.round((2+pocket*5+random()*4)*style.growth*(1-door*.62));
   const leafHeight=Math.max(2,Math.min(height,distance<10?4:10));
   const mossWidth=4+Math.floor(random()*6);
   const rootY=Math.min(y,baseY+1);
   ground(LEAF_COLORS[0],.47,x-2,y+1,mossWidth+3,2);
   leaves(LEAF_COLORS[0],.74,x,rootY-2,mossWidth,2);
   leaves(LEAF_COLORS[2],.79,x+1,rootY-1,mossWidth-1,2);
   if(stone)stoneChip(leaves,x-1,y+2,5+Math.floor(random()*6),random);
   const blade=LEAF_COLORS[2+Math.floor(random()*2)];
   leaves(blade,.96,x+1,y-leafHeight+1,2,leafHeight);
   leaves(blade,.94,x+1+direction,y-leafHeight,1,2);
   if(door<.48&&random()<pocket*.76){
    const bend=2+Math.floor(random()*2);
    leaves(LEAF_COLORS[3],.91,x+direction*bend,y-Math.max(1,leafHeight-2),1,Math.max(2,leafHeight-1));
   }
   if(door<.42&&random()<style.growth*pocket*.64)
    paintLeaves(leaves,x+4,y+3,direction,.48+random()*.43,[[0,0,1,-1]]);
   if(door<.6&&random()>.41)
    leaves(LEAF_COLORS[5],.90,x+4,y-1,2,1);
   x+=4+Math.floor(random()*6);
  }
 }
 function planBuildingContact(scene,base,plan=planPaths(scene,base)){
  const {T,owned,fence,protectedRects}=plan,contacts=[];
  const safe=(owner,left,top,width,height)=>{
   const right=left+width,bottom=top+height;
   for(let c=Math.floor(left/T);c*T<right;c++)for(let r=Math.floor(top/T);r*T<bottom;r++){
    const cell=c+','+r;if(!owned.has(cell)||fence.has(cell))return false;
   }
   return !protectedRects.some(box=>box.owner!==owner&&left<box.right&&right>box.left&&top<box.bottom&&bottom>box.top);
  };
  for(const owner of scene.objs||[])if(finishedContact(owner)){
   const foot=worldContact(owner);if(!foot)continue;
   const width=foot.right-foot.left;
   if(width<12)continue;
   const depth=(Number.isFinite(owner.sprite.depth)?owner.sprite.depth:owner.by)+.02;
   const ground=[],foliage=[];
   const painter=rects=>(color,alpha,left,top,width,height)=>{
    if(safe(owner,left,top,width,height))rects.push({left,top,width,height,color,alpha});
   };
   const groundPaint=painter(ground),leafPaint=painter(foliage);
   const style=CONTACT_STYLE[owner.type];
   let seed=5381;
   for(const letter of owner.type)seed=(Math.imul(seed,33)^letter.charCodeAt(0))|0;
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
   const midpoint=(foot.left+foot.right)*.5;
   const center=Math.round(Math.min(foot.right-width*.25,Math.max(foot.left+width*.25,owner.cx??midpoint)));
   const entry=Math.min(22,Math.max(10,Math.round(width*.19)));
   shadeFooting(foot,center,entry,groundPaint,random);
   wearAtDoor(foot,center,entry,owner,plan,groundPaint,random);
   growAlongWall(foot,center,entry,style,groundPaint,leafPaint,random);
   if(ground.length||foliage.length)contacts.push({owner,depth,ground,foliage});
  }
  return contacts;
 }
 function contactSignature(o){
  if(!Object.hasOwn(CONTACT_STYLE,o.type))return '';
  if(!finishedContact(o))return 'work';
  const s=o.sprite,f=s.frame||{},key=s.texture?.key;
  return [key,root.GoldenVisual?.hasVariant?.(key),s.x,s.y,s.depth,s.displayWidth,s.displayHeight,s.originX,s.originY,
   s.flipX,f.cutX,f.cutY,f.cutWidth,f.cutHeight].join(':');
 }
 function signature(scene,base){
  const pond=pondBounds(scene.pondImg);
  return [enabled()?1:0,base.editMode?1:0,base.expOwned||0,base.COLS_BASE,base.ROWS_BASE,
   ...(scene.objs||[]).map(o=>[o.type,o.cx,o.by,o.w,visible(o)?1:0,BUILDINGS.has(o.type)&&String(o.sprite?.texture?.key||'').startsWith('build_')?'work':'ready',contactSignature(o)].join(':')),
   ...(scene.plots||[]).filter(p=>p.state!=='locked'&&!p.oculto).map(p=>[p.cx,p.by].join(':')),
   ...(scene.adornos||[]).map(a=>[a.cx,a.by].join(':')),pond&&Object.values(pond).join(':')].join('|');
 }
 function paintRects(graphics,rects){
  for(const {left,top,width,height,color,alpha} of rects)graphics.fillStyle(color,alpha).fillRect(left,top,width,height);
 }
 function clearGraphics(state){
  for(const g of state.graphics)g.destroy();
  state.graphics.length=0;
 }
 function refresh(scene){
  const state=scenes.get(scene),base=root.GF;if(!state||!base)return false;
  const sig=signature(scene,base);if(state.signature===sig)return true;state.signature=sig;
  clearGraphics(state);
  if(!enabled()||base.editMode)return true;
  const plan=planPaths(scene,base),contacts=planBuildingContact(scene,base,plan);
  const trails=trailSurface(plan),forest=root.GoldenForestEdge;
  const forestMarks=forest?.plan(plan,{...scene.forestEdgeOptions,trailMarks:trails})||[];
  if(!trails.length&&!contacts.length&&!forestMarks.length)return true;
  const addGraphics=depth=>{
   const g=scene.add.graphics().setDepth(depth);
   state.graphics.push(g);return g;
  };
  const g=addGraphics(-999.4);
  if(forestMarks.length)forest.draw(g,forestMarks);
  paintRects(g,trails);
  for(const {depth,ground,foliage} of contacts){
   paintRects(g,ground);
   if(foliage.length)paintRects(addGraphics(depth),foliage);
  }
  return true;
 }
 function clear(scene){const state=scenes.get(scene);if(!state)return;if(state.timer?.remove)state.timer.remove();clearGraphics(state);scenes.delete(scene);}
 function attach(scene){
  if(scenes.has(scene)){refresh(scene);return;}
  const state={signature:null,graphics:[],timer:null};scenes.set(scene,state);
  // Obras y distribución pueden cambiar sin reiniciar Farm. Sólo cambia una firma gráfica.
  if(scene.time?.addEvent)state.timer=scene.time.addEvent({delay:800,loop:true,callback:()=>refresh(scene)});
  scene.events?.once?.('shutdown',()=>clear(scene));refresh(scene);
 }
 const api={forestStyle,forestSample,planPaths,trailSurface,planBuildingContact,attach,refresh,clear};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.GoldenReferenceWorld=api;
})(typeof window==='undefined'?globalThis:window);
