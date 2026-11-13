/* Este documento tiene origen opaco (sandbox). No accede a la partida ni a sus API. */
const enviar=tipo=>parent.postMessage({tipo},'*');
const estado=document.getElementById('estado'),semilla=document.getElementById('semilla');
document.getElementById('volver').onclick=()=>enviar('visita-salir');
document.addEventListener('keydown',e=>{if(e.key==='Escape')enviar('visita-salir');});
semilla.onclick=()=>{semilla.disabled=true;estado.textContent='Recogiendo semilla…';enviar('visita-semilla');};
let recibida=false;
const imagenes=new Map();
let cerrarLucesVisita=()=>{};
function imagen(key){
 if(!/^[a-z0-9_]{1,50}$/.test(key))return Promise.resolve(null);
 if(!imagenes.has(key))imagenes.set(key,new Promise(resolve=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='assets/farm/'+key+'.png';}));
 return imagenes.get(key);
}
// Sólo imágenes y ventanas públicas: el snapshot no revela si el dueño está
// cocinando o usando la fragua. El terreno se conserva y las fuentes siguen el
// mismo orden por Y que sus edificios, sin iluminar a través de otros objetos.
function pintarVisita(canvas,ctx,items,fondo,ox,oy){
 const api=window.GoldenWorldLights,media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const luces=new Map(),mapa=document.getElementById('mapa');
 if(api)for(const o of items){
  if(!o.image)continue;
  const h=o.w*o.image.height/o.image.width;
  const sprite={x:o.x+ox,y:o.y+oy,displayWidth:o.w,displayHeight:h,originX:.5,originY:1};
  const fuentes=api.profiles(o.key,o.renewed===true).filter(p=>p.kind==='window').map(p=>({p,pos:api.anchor(sprite,p)})).filter(v=>v.pos);
  if(fuentes.length)luces.set(o,fuentes);
 }
 let halo,core;
 function textura(nucleo){
  const cv=document.createElement('canvas');cv.width=cv.height=64;
  const c=cv.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
  if(nucleo){g.addColorStop(0,'rgba(255,244,180,1)');g.addColorStop(.28,'rgba(255,204,92,.95)');g.addColorStop(.65,'rgba(255,151,48,.5)');}
  else{g.addColorStop(0,'rgba(255,205,112,.9)');g.addColorStop(.22,'rgba(255,185,80,.65)');g.addColorStop(.55,'rgba(255,167,62,.22)');}
  g.addColorStop(1,'rgba(255,157,55,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return cv;
 }
 if(luces.size){halo=textura(false);core=textura(true);}
 let raf=0,ultimo=-Infinity,oscuro=-1,muerto=false;
 function pintar(t){
  const at=window.GoldenLighting?.atmosphere?.()||{active:false,darkness:0};
  if(oscuro===0&&at.darkness===0)return;
  oscuro=at.darkness;
  const pools=[];
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(fondo,0,0);
  for(const o of items){
   if(o.icon&&!o.image){ctx.font='28px system-ui';ctx.textAlign='center';ctx.fillText(o.icon,o.x+ox,o.y+oy);continue;}
   if(!o.image)continue;
   const h=o.w*o.image.height/o.image.width;ctx.drawImage(o.image,o.x+ox-o.w/2,o.y+oy-h,o.w,h);
   for(const {p,pos}of luces.get(o)||[]){
    const a=api.appearance(p,at.darkness,t,!!media?.matches,at.active);
    const r=api.haloDiameter?.(pos,p,at.active?at.darkness:0)??Math.max(pos.w*6.5,pos.h*4.5);
    if(at.active&&at.darkness)pools.push({pos,strength:at.darkness,diameter:r});
    if(a.halo<=0&&a.core<=0)continue;
    ctx.save();ctx.globalCompositeOperation='lighter';
    if(a.halo>0){ctx.globalAlpha=a.halo;ctx.drawImage(halo,pos.x-r/2,pos.y-r*.83/2,r,r*.83);}
    if(a.core>0){ctx.globalAlpha=a.core;ctx.drawImage(core,pos.x-pos.w/2,pos.y-pos.h*a.stretch/2,pos.w,pos.h*a.stretch);}
    ctx.restore();
   }
  }
  const layers=api?.atmosphereLayers?.(pools);
  if(layers)mapa?.style.setProperty('--gf-day-sources',layers);else mapa?.style.removeProperty('--gf-day-sources');
 }
 function tick(t){
  raf=0;if(muerto||document.hidden)return;
  if(t-ultimo>=(media?.matches?1000:100)){ultimo=t;pintar(t);}
  raf=window.requestAnimationFrame(tick);
 }
 function visibilidad(){
  if(raf){window.cancelAnimationFrame(raf);raf=0;}
  if(!muerto&&!document.hidden){ultimo=-Infinity;oscuro=-1;if(window.requestAnimationFrame)raf=window.requestAnimationFrame(tick);else pintar(0);}
 }
 function cerrar(){
  muerto=true;if(raf)window.cancelAnimationFrame(raf);raf=0;
  document.removeEventListener('visibilitychange',visibilidad);window.removeEventListener('pagehide',cerrar);luces.clear();
  mapa?.style.removeProperty('--gf-day-sources');
 }
 pintar(0);
 if(luces.size&&window.requestAnimationFrame){document.addEventListener('visibilitychange',visibilidad);window.addEventListener('pagehide',cerrar,{once:true});visibilidad();}
 return cerrar;
}
async function dibujar(g){
 cerrarLucesVisita();
 if(window.GoldenVisual)GoldenVisual.setEnabled(g.aspectoRenovado===true);
 if(window.GoldenLighting){GoldenLighting.setEnabled(g.iluminacionSuave===true);GoldenLighting.setCycle(g.cicloVisual===true,false);}
 const m=g.mapa;GF.configurarEspacio(m.espacioV);GF.aplicarTerreno(g.expansiones);
 const terreno=GF.terreno(g.expansiones),T=GF.TILE,pad=3;
 const canvas=document.getElementById('lienzo'),ctx=canvas.getContext('2d');
 canvas.width=(terreno.cols+pad*2)*T;canvas.height=(terreno.rows+pad*2)*T;
 const ox=(pad-terreno.c0)*T,oy=(pad-terreno.r0)*T;
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#234d24';ctx.fillRect(0,0,canvas.width,canvas.height);
 let grass=await imagen('grass_a');
 if(grass&&window.GoldenVisual)grass=await GoldenVisual.visitImage('grass_a',grass);
 for(const k of terreno.mias){const [c,r]=k.split(',').map(Number),x=c*T+ox,y=r*T+oy;if(grass)ctx.drawImage(grass,x,y,T,T);else{ctx.fillStyle=(c+r)%2?'#39833b':'#3c873e';ctx.fillRect(x,y,T,T);}ctx.strokeStyle='#416b30';ctx.lineWidth=2;for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]])if(!terreno.mias.has((c+dc)+','+(r+dr))){ctx.beginPath();if(dc){const xx=x+(dc>0?T:0);ctx.moveTo(xx,y);ctx.lineTo(xx,y+T);}else{const yy=y+(dr>0?T:0);ctx.moveTo(x,yy);ctx.lineTo(x+T,yy);}ctx.stroke();}}
 const items=[];
 const edificios=['store','horno','cocina','altar','establo','curtiduria','ofrendas'];
 let tree=0,rock=0;
 for(const [i,o]of GF.WORLD_OBJECTS.entries()){
  const lock=o.type==='tree'?tree++:o.type==='rock'?rock++:-1;
  if(GF.esAltarOculto(o.type))continue;
  if(!GF.PESCA_ACTIVA&&['lombricario','lonja','boya','fish'].includes(o.type))continue;
  if(edificios.includes(o.type)&&!m.built[o.type]&&!m.obras[o.type])continue;
  if(['tree','rock','ore'].includes(o.type)){
   const owned=m.nodos.includes(String(i)) || (o.exp==null&&o.type==='tree'&&m.treesOpen.includes(lock)) || (o.exp==null&&o.type==='rock'&&m.rocksOpen.includes(lock));
   if(m.produccionVersion&&!owned)continue;
   if(!m.produccionVersion&&o.exp!=null&&g.expansiones<=o.exp)continue;
   if(!m.produccionVersion&&o.type==='tree'&&!m.treesOpen.includes(lock))continue;
   if(!m.produccionVersion&&o.type==='rock'&&!m.rocksOpen.includes(lock))continue;
  }
  const lp=m.layout[i],obra=m.obras[o.type];
  if(o.premiumOnly && (!(m.premiumNodos||[]).includes(String(i)) || !GF.pieNodoValido(i,lp,g.expansiones)))continue;
  const x=lp?lp.cx:obra?(obra.col+.5)*T:o.cx,y=lp?lp.by:obra?(obra.row+1)*T:o.by;
  if(!GF.tuyo(Math.floor(x/T),Math.ceil(y/T)-1,g.expansiones))continue;
  const key=obra&&!m.built[o.type]?'build_'+o.type:o.type==='barn'?'barn_evo_'+m.granero:o.key;
  const w=o.w*(o.type==='tree'?.8:['rock','ore'].includes(o.type)?.67:o.type==='store'?.8:1);
  items.push({key,x,y,w});
 }
 let plot=await imagen('plot');
 if(plot&&window.GoldenVisual)plot=await GoldenVisual.visitImage('plot',plot);
 for(let i=0;i<Math.min(m.plotsOwned,g.parcelas.length);i++){
  const p=m.layoutPlots[i]||GF.PLOTS_BASE[i];if(!p||!GF.tuyo(p.col,p.row,g.expansiones))continue;
  const x=p.col*T+ox,y=p.row*T+oy;
  if(plot)ctx.drawImage(plot,x,y,T,T);else{ctx.fillStyle='#724529';ctx.fillRect(x+2,y+2,T-4,T-4);}
  // La proyección pública sólo revela el estado, sin reloj ni porcentaje de crecimiento.
  const crop=g.parcelas[i],size=crop.estado==='growing'?.96:crop.estado==='ready'?1.02:crop.estado==='withered'?.59:0;
  if(crop.cultivo&&size)items.push({key:crop.estado==='withered'?'withered':(crop.estado==='growing'?'cropm_':'cropg_')+crop.cultivo,x:(p.col+.5)*T,y:(p.row+1)*T,w:T*size});
 }
 for(const d of m.decos||[]){const icon={valla:'🪵',flores:'🌷',farol:'🏮',banco:'🪑',espantapajaros:'🧑‍🌾',fuente:'⛲',estatua:'🏆',arbolito:'🌸',espantapajaros_oro:'🧑‍🌾',farolito:'🏮'}[d.id];if(icon)items.push({key:'deco_'+d.id,icon,x:(d.col+.5)*T,y:(d.row+1)*T,w:T});}
 const ocupadas=new Set(items.map(o=>Math.floor(o.x/T)+','+(Math.ceil(o.y/T)-1)));
 const libres=[...terreno.mias].filter(k=>!ocupadas.has(k));let an=0;
 for(const [k,n] of Object.entries(m.animales||{}))for(let i=0;i<n&&an<libres.length;i++,an++){const [c,r]=libres[(an*7)%libres.length].split(',').map(Number);items.push({key:'animal_'+k,x:(c+.5)*T,y:(r+1)*T,w:T*.85});}
 const iluminadas=new Map();
 await Promise.all(items.map(async o=>{
  o.image=await imagen(o.key);
  if(o.image&&window.GoldenVisual){
   const original=o.image;o.image=await GoldenVisual.visitImage(o.key,original);
   o.renewed=o.image!==original;
  }
  if(!o.image||g.iluminacionSuave!==true||!window.GoldenLighting)return;
  if(!iluminadas.has(o.key)){
   try{iluminadas.set(o.key,GoldenLighting.shadeImage(o.image,{key:o.key,renewed:o.renewed}));}
   catch(_){iluminadas.set(o.key,o.image);}
  }
  o.image=iluminadas.get(o.key);
 }));
 items.sort((a,b)=>a.y-b.y);
 const fondo=document.createElement('canvas');fondo.width=canvas.width;fondo.height=canvas.height;fondo.getContext('2d').drawImage(canvas,0,0);
 cerrarLucesVisita=pintarVisita(canvas,ctx,items,fondo,ox,oy);
 // Recompensa separada: no representa una semilla que se quite al propietario.
 const sitio=GF.PLOTS_BASE.find(p=>GF.tuyo(p.col,p.row,g.expansiones))||{col:1,row:1};
 semilla.style.left=((sitio.col+.5)*T+ox)+'px';semilla.style.top=((sitio.row+1)*T+oy)+'px';semilla.hidden=false;
 document.getElementById('titulo').textContent='Granja de '+g.nombre+' · Nivel '+g.nivel;
 semilla.disabled=g.semillaEstado==='recogida'||g.semillaEstado==='limite';
 semilla.textContent=g.semillaEstado==='recogida'?'✓ Semilla recogida':g.semillaEstado==='limite'?'Límite diario alcanzado':'🌱 Recoger semilla';
 estado.textContent=g.semillaEstado==='recogida'?'Ya has recogido la semilla de esta granja hoy.':g.semillaEstado==='limite'?'Ya has recogido las tres semillas de visita de hoy (UTC).':'Una semilla por granja · máximo 3 al día UTC';
 document.getElementById('mundo').scrollLeft=Math.max(0,(canvas.width-innerWidth)/2);
}
window.addEventListener('message',async e=>{
 if(e.source!==parent)return;
 if(e.data?.tipo==='visita-datos'&&!recibida){recibida=true;try{await dibujar(e.data.granja);}catch{estado.textContent='No se pudo dibujar la granja. Vuelve e inténtalo de nuevo.';}}
 if(e.data?.tipo==='visita-cobro'){semilla.disabled=!!e.data.ok;semilla.textContent=e.data.ok?'✓ Semilla recogida':'🌱 Intentar recoger';estado.textContent=e.data.ok?'Semilla añadida a tu inventario.':typeof e.data.mensaje==='string'?e.data.mensaje:'No se pudo recoger: comprueba tu VIP, el límite diario o la conexión.';}
});
enviar('visita-lista');
