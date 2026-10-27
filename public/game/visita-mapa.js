/* Este documento tiene origen opaco (sandbox). No accede a la partida ni a sus API. */
const enviar=tipo=>parent.postMessage({tipo},'*');
const estado=document.getElementById('estado'),semilla=document.getElementById('semilla');
document.getElementById('volver').onclick=()=>enviar('visita-salir');
document.addEventListener('keydown',e=>{if(e.key==='Escape')enviar('visita-salir');});
semilla.onclick=()=>{semilla.disabled=true;estado.textContent='Recogiendo semilla…';enviar('visita-semilla');};
let recibida=false;
const imagenes=new Map();
function imagen(key){
 if(!/^[a-z0-9_]{1,50}$/.test(key))return Promise.resolve(null);
 if(!imagenes.has(key))imagenes.set(key,new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='assets/farm/'+key+'.png';}));
 return imagenes.get(key);
}
async function dibujar(g){
 const m=g.mapa;GF.configurarEspacio(m.espacioV);GF.aplicarTerreno(g.expansiones);
 const terreno=GF.terreno(g.expansiones),T=GF.TILE,pad=3;
 const canvas=document.getElementById('lienzo'),ctx=canvas.getContext('2d');
 canvas.width=(terreno.cols+pad*2)*T;canvas.height=(terreno.rows+pad*2)*T;
 const ox=(pad-terreno.c0)*T,oy=(pad-terreno.r0)*T;
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#234d24';ctx.fillRect(0,0,canvas.width,canvas.height);
 const grass=await imagen('grass_a');
 for(const k of terreno.mias){const [c,r]=k.split(',').map(Number),x=c*T+ox,y=r*T+oy;if(grass)ctx.drawImage(grass,x,y,T,T);else{ctx.fillStyle=(c+r)%2?'#39833b':'#3c873e';ctx.fillRect(x,y,T,T);}ctx.strokeStyle='#416b30';ctx.lineWidth=2;for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]])if(!terreno.mias.has((c+dc)+','+(r+dr))){ctx.beginPath();if(dc){const xx=x+(dc>0?T:0);ctx.moveTo(xx,y);ctx.lineTo(xx,y+T);}else{const yy=y+(dr>0?T:0);ctx.moveTo(x,yy);ctx.lineTo(x+T,yy);}ctx.stroke();}}
 const items=[];
 const edificios=['store','horno','cocina','altar','establo','curtiduria','ofrendas'];
 let tree=0,rock=0;
 for(const [i,o]of GF.WORLD_OBJECTS.entries()){
  const lock=o.type==='tree'?tree++:o.type==='rock'?rock++:-1;
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
  const x=lp?lp.cx:obra?(obra.col+.5)*T:o.cx,y=lp?lp.by:obra?(obra.row+1)*T:o.by;
  if(!GF.tuyo(Math.floor(x/T),Math.ceil(y/T)-1,g.expansiones))continue;
  const key=obra&&!m.built[o.type]?'build_'+o.type:o.type==='barn'?'barn_evo_'+m.granero:o.key;
  const w=o.w*(o.type==='tree'?.8:['rock','ore'].includes(o.type)?.67:o.type==='store'?.8:1);
  items.push({key,x,y,w});
 }
 const plot=await imagen('plot');
 for(let i=0;i<Math.min(m.plotsOwned,g.parcelas.length);i++){
  const p=m.layoutPlots[i]||GF.PLOTS_BASE[i];if(!p||!GF.tuyo(p.col,p.row,g.expansiones))continue;
  const x=p.col*T+ox,y=p.row*T+oy;
  if(plot)ctx.drawImage(plot,x,y,T,T);else{ctx.fillStyle='#724529';ctx.fillRect(x+2,y+2,T-4,T-4);}
  const crop=g.parcelas[i];if(crop.cultivo&&crop.estado!=='empty')items.push({key:(crop.estado==='growing'?'cropg_':crop.estado==='withered'?'cropm_':'crop_')+crop.cultivo,x:(p.col+.5)*T,y:(p.row+1)*T,w:T});
 }
 for(const d of m.decos||[]){const icon={valla:'🪵',flores:'🌷',farol:'🏮',banco:'🪑',espantapajaros:'🧑‍🌾',fuente:'⛲',estatua:'🏆',arbolito:'🌸',espantapajaros_oro:'🧑‍🌾',farolito:'🏮'}[d.id];if(icon)items.push({icon,x:(d.col+.5)*T,y:(d.row+1)*T,w:T});}
 const ocupadas=new Set(items.map(o=>Math.floor(o.x/T)+','+(Math.ceil(o.y/T)-1)));
 const libres=[...terreno.mias].filter(k=>!ocupadas.has(k));let an=0;
 for(const [k,n] of Object.entries(m.animales||{}))for(let i=0;i<n&&an<libres.length;i++,an++){const [c,r]=libres[(an*7)%libres.length].split(',').map(Number);items.push({key:'animal_'+k,x:(c+.5)*T,y:(r+1)*T,w:T*.85});}
 await Promise.all(items.map(async o=>{o.image=await imagen(o.key);}));
 items.sort((a,b)=>a.y-b.y);
 for(const o of items){if(o.icon){ctx.font='28px system-ui';ctx.textAlign='center';ctx.fillText(o.icon,o.x+ox,o.y+oy);continue;}if(!o.image)continue;const h=o.w*o.image.height/o.image.width;ctx.drawImage(o.image,o.x+ox-o.w/2,o.y+oy-h,o.w,h);}
 // Recompensa separada: no representa una semilla que se quite al propietario.
 const sitio=GF.PLOTS_BASE.find(p=>GF.tuyo(p.col,p.row,g.expansiones))||{col:1,row:1};
 semilla.style.left=((sitio.col+.5)*T+ox)+'px';semilla.style.top=((sitio.row+1)*T+oy)+'px';semilla.hidden=false;
 document.getElementById('titulo').textContent='Granja de '+g.nombre+' · Nivel '+g.nivel;
 estado.textContent='Una semilla por granja · máximo 3 al día UTC';
 document.getElementById('mundo').scrollLeft=Math.max(0,(canvas.width-innerWidth)/2);
}
window.addEventListener('message',async e=>{
 if(e.source!==parent)return;
 if(e.data?.tipo==='visita-datos'&&!recibida){recibida=true;try{await dibujar(e.data.granja);}catch{estado.textContent='No se pudo dibujar la granja. Vuelve e inténtalo de nuevo.';}}
 if(e.data?.tipo==='visita-cobro'){semilla.disabled=!!e.data.ok;semilla.textContent=e.data.ok?'✓ Semilla recogida':'🌱 Intentar recoger';estado.textContent=e.data.ok?'Semilla añadida a tu inventario.':'No se pudo recoger: comprueba tu VIP, el límite diario o la conexión.';}
});
enviar('visita-lista');
