/* EL PORTERO DEL GUARDADO · la única puerta de escritura a `farms` (21/8)
   ====================================================================================
   AUTOCONTENIDO A PROPÓSITO: el editor del dashboard de Supabase no siempre empaqueta
   un segundo archivo (el primer deploy falló con "Module not found reglas.mjs"), así
   que las reglas viven acá adentro, entre los marcadores === REGLAS === abajo. El test
   de la suite (tools/test-portero-reglas.js) extrae ese bloque y lo ejecuta tal cual:
   lo que se prueba es EXACTAMENTE lo que se deploya. No mover los marcadores.

   Deploy: Dashboard → Edge Functions → "guardar" → pegar este único archivo → Deploy.
   Instrucciones completas: docs/PORTERO-GUARDADO.md.
   La fecha del guardado la pone EL SERVIDOR (el reloj del cliente no se toca ni se cree). */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* === REGLAS === (JavaScript puro — este bloque lo ejecuta también el test de la suite)
   MODO SOMBRA: el portero anota lo sospechoso en la bitácora pero NUNCA rechaza. El
   rechazo se activa cambiando MODO a "rechazo" y re-deployando, SOLO tras calibrar con
   la bitácora (que ningún jugador honesto dispare sospechas). Los techos salen del
   ancla del juego (20 plata/celda-hora) con margen ×3 y colchones: generosos a
   propósito — acá un falso positivo es peor que un tramposo sin cazar. */
const VERSION = 5;        // Golden conservado, VIP pagado y capacidad heredada inmutable
const MODO = "rechazo";   // 14/9: fuera de sombra en el proyecto nuevo (P2P abierto → el portero rechaza)

const ANCLA = 20;          // plata por celda-hora
const CELDAS_MAX = 169;    // celdas útiles con TODO expandido
const NODOS_MAX = 40;      // árboles + rocas con todo abierto (35 reales + colchón)
const TASA_NODO = 2;       // recursos/hora de un nodo; las cargas no suben la tasa, solo la guardan
const MARGEN = 3;          // multiplicador de gracia sobre el máximo físico

const num = (v) => (typeof v === "number" && isFinite(v)) ? v : 0;
const ARTEFACTOS_PRECIOS = {cobre:10,plata:25,jade:50,oro:100,granero:150,rubi:250,corona:500};
const ARTEFACTOS_DIAS = 180, ARTEFACTOS_PLATA_POR_GOLDEN_DIA = 87, ENERGIA_GRANJA_MS = 14400000;
const OBJETOS_PLATA_DESDE = 1792193400000;
// 0,87 % diario sobre 10.000 Plata/Golden, independiente de la tasa vigente del Banco.
function objetoModelo(id){return String(id).split(':')[0];}
function objetoPlataDiaria(id){return (ARTEFACTOS_PRECIOS[objetoModelo(id)]||0)*ARTEFACTOS_PLATA_POR_GOLDEN_DIA;}
function objetoInicioCobro(a){return a.moneda==='plata-v2' ? a.cobrado : Math.max(a.cobrado,OBJETOS_PLATA_DESDE);}
function objetoCobroListo(a,ahora){return !!a && (Math.min(ahora,a.desde+ARTEFACTOS_DIAS*86400000)-objetoInicioCobro(a)>=86400000 || ahora>=a.desde+ARTEFACTOS_DIAS*86400000);}
function mismoJSON(a,b) {
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length && keys.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&mismoJSON(a[k],b[k]));
}
function energiaServidor(d,ahora) {
  const e=d && d.energiaGranja,fin=num(d && d.produccion && d.produccion.vipHasta);
  if(!e || !Number.isFinite(e.actual) || !Number.isFinite(e.at))return fin>ahora?100:50;
  const at=e.at||ahora;let v=Math.max(0,e.actual);
  if(at<fin)v=Math.min(100,v+Math.max(0,Math.min(ahora,fin)-at)*100/ENERGIA_GRANJA_MS);
  if(ahora>=fin)v=Math.min(50,v+Math.max(0,ahora-Math.max(at,fin))*50/ENERGIA_GRANJA_MS);
  return Math.max(0,Math.min(fin>ahora?100:50,v));
}
const ACTIVIDAD_OBJETIVO=2000;
function picosUnificarEstado(d){
  if(!d||typeof d!=='object')return;
  const p=d.picks;if(p&&p.owned&&p.dur){
    const n=Math.max(0,Math.floor(Number(p.dur.wood)||0));
    if(n){p.dur.stone=Math.max(0,Number(p.dur.stone)||0)+n;p.owned.stone=true;}
    delete p.dur.wood;delete p.owned.wood;if(p.eq==='wood')p.eq='stone';
  }
  const visitar=(o,prof)=>{
    if(!o||typeof o!=='object'||prof>16)return;
    if(o.kind==='pick'){if(o.k==='wood')o.k='stone';if(o.key==='wood')o.key='stone';}
    for(const v of Object.values(o))if(v&&typeof v==='object')visitar(v,prof+1);
  };
  for(const k of ['cont','tumba','hotbar'])visitar(d[k],0);
}
const ACTIVIDAD_COSTOS={plant:1,harvest:1,chop:1,mine:1,animal:2,cook:1,auto:2};
function actividadLibro(d){
  const a=d?.actividadGranja;
  return {v:1,energia:Math.min(ACTIVIDAD_OBJETIVO,Math.max(0,Math.floor(num(a?.energia)))),registro:{...(a?.registro||{})},desde:num(a?.desde),cumplidaAt:num(a?.cumplidaAt)};
}
function actividadAcreditar(data,cantidad,ahora){
  const a=actividadLibro(data);a.desde=a.desde||ahora;a.energia=Math.min(ACTIVIDAD_OBJETIVO,a.energia+Math.max(0,Math.floor(cantidad)));
  if(a.energia>=ACTIVIDAD_OBJETIVO&&!a.cumplidaAt)a.cumplidaAt=ahora;data.actividadGranja=a;return a;
}
function actividadEstado(d,ahora){const a=actividadLibro(d);return {energia:a.energia,objetivo:ACTIVIDAD_OBJETIVO,cumplida:a.energia>=ACTIVIDAD_OBJETIVO,vip:num(d?.produccion?.vipHasta)>ahora,usdt:false};}
function actividadEvidencias(a,b,ahora){
  const suma=o=>Object.values(o||{}).reduce((s,v)=>s+Math.max(0,num(v)),0);
  const sube=(x,y)=>Object.keys(y||{}).reduce((s,k)=>s+Math.max(0,num(y[k])-num(x?.[k])),0);
  const baja=(x,y)=>sube(y,x);
  const stat=k=>sube(a.stats?.[k],b.stats?.[k]);
  const colas=(x,y,fin)=>{const ids=new Set((Array.isArray(x)?x:[]).filter(Boolean).map(c=>String(c.id||c.cultivo)+':'+c[fin]));return (Array.isArray(y)?y:[]).filter(c=>c&&num(c.total||c.n)>0&&num(c[fin])>ahora&&!ids.has(String(c.id||c.cultivo)+':'+c[fin])).length;};
  let siembras=0,cosechas=0;
  for(let i=0;i<Math.min(256,(b.plots||[]).length);i++){
    const p=a.plots?.[i],q=b.plots[i];if(!q)continue;
    const nueva=q.state==='growing'&&num(q.readyAt)>ahora&&(!p||p.state!=='growing'||q.cropKey!==p.cropKey||num(q.readyAt)>num(p.readyAt));
    if(nueva)siembras++;
    if(p&&['ready','growing'].includes(p.state)&&num(p.readyAt)<=ahora&&(q.state==='dry'||nueva))cosechas++;
  }
  const excavados=(b.excav?.hechos||[]).filter(i=>a.excav?.dia!==b.excav?.dia||!(a.excav?.hechos||[]).includes(i)).length;
  const inventarioNuevo=sube(a.tools,b.tools)+sube(a.picks?.dur,b.picks?.dur)+Object.keys(b.weapons||{}).filter(k=>JSON.stringify(a.weapons?.[k])!==JSON.stringify(b.weapons[k])).length+Object.keys(b.armor||{}).filter(k=>JSON.stringify(a.armor?.[k])!==JSON.stringify(b.armor[k])).length;
  const insumos=baja(a.res,b.res)+baja(a.fish,b.fish)+Math.max(0,num(a.plata)-num(b.plata));
  const derivados=Object.keys(b.res||{}).filter(k=>/^(runa_|polvo_|esencia_|flecha$|tablon$|bloque_|barra_|cuero$)/.test(k)).reduce((s,k)=>s+Math.max(0,num(b.res[k])-num(a.res?.[k])),0);
  let animales=0;
  for(const k of Object.keys(b.animals||{}))for(let i=0;i<(Array.isArray(b.animals[k])?b.animals[k]:[]).length;i++){
    const p=a.animals?.[k]?.[i],q=b.animals[k][i];
    if(p&&num(p.comidoAt)>0&&num(p.comidoAt)>=num(p.prodAt)&&Math.max(num(p.prodAt),num(p.comidoAt))+86400000<=ahora&&num(q.prodAt)>num(p.prodAt))animales++;
  }
  return {plant:Math.max(siembras,Math.min(stat('plantar'),baja(a.seeds,b.seeds))),harvest:Math.min(stat('cosechar'),cosechas),
    chop:Math.min(stat('talar'),Math.max(0,num(a.tools?.axe)-num(b.tools?.axe))),
    mine:Math.min(stat('minar'),baja(a.picks?.dur,b.picks?.dur))+Math.min(excavados,sube(a.seeds,b.seeds)+sube(a.res,b.res)),
    animal:animales,craft:insumos>0?inventarioNuevo+colas(a.horno,b.horno,'listoAt')+derivados:0,
    cook:insumos>0?colas(a.cooking,b.cooking,'endAt')+colas(a.lombricario,b.lombricario,'listaEn'):0,
    auto:Math.min(Math.max(0,suma((a.godHand?.inv||[]).map(s=>s?.n))-suma((b.godHand?.inv||[]).map(s=>s?.n))),sube(a.res,b.res))};
}
function actividadActualizar(prev,next,ahora,recibo){
  const a=actividadLibro(prev),pruebas=prev?actividadEvidencias(prev,next,ahora):{},pedidos=next.actividadAcciones||{};
  const e=prev?.energiaGranja,at=Math.min(ahora,num(e?.at)||ahora),fin=num(prev?.produccion?.vipHasta);
  const regen=(Math.max(0,Math.min(ahora,fin)-at)*100+Math.max(0,ahora-Math.max(at,fin))*50)/ENERGIA_GRANJA_MS;
  let presupuesto=e&&Number.isFinite(e.actual)?Math.max(0,e.actual+regen-num(next.energiaGranja?.actual)):0,credito=0;const acciones={};
  for(const k of Object.keys(ACTIVIDAD_COSTOS)){
    const anterior=Math.max(0,num(a.registro[k])),pedido=Number.isSafeInteger(pedidos[k])&&pedidos[k]>=0&&pedidos[k]<=1e9?Math.max(anterior,pedidos[k]):anterior;
    const n=Math.min(pedido-anterior,Math.max(0,Math.floor(num(pruebas[k]))),Math.floor((presupuesto+1e-6)/ACTIVIDAD_COSTOS[k]));
    credito+=n*ACTIVIDAD_COSTOS[k];presupuesto-=n*ACTIVIDAD_COSTOS[k];a.registro[k]=pedido;acciones[k]=n;
  }
  if(recibo)Object.assign(recibo,acciones);
  next.actividadGranja=a;next.actividadAcciones={...a.registro};logrosActualizar(prev,next,acciones);return actividadAcreditar(next,credito,ahora);
}
// Documento logros.docx aprobado el 21/10. Metas acumulativas, premios únicos.
const LOGROS_TABLA={papa:[[100,100],[300,400],[1000,2000]],ciruela:[[100,110],[250,330],[1200,2200]],zanahoria:[[100,100],[250,300],[1200,2200]],cebolla:[[100,150],[250,300],[1200,2400]],calabacin:[[100,200],[250,350],[1300,2600]],madera:[[100,100],[200,200],[500,500]],piedra:[[100,100],[250,250],[1000,800]],visitas:[[10,10],[50,50],[100,150],[500,500]]};
function logrosLibro(d){
  if(d?.logrosV2?.v===1)return JSON.parse(JSON.stringify(d.logrosV2));
  const progreso={}; // Sólo siembras históricas verificables; no inventar unidades de madera/piedra ni visitas.
  for(const k of ['papa','ciruela','zanahoria','cebolla','calabacin'])progreso[k]=Math.min(LOGROS_TABLA[k].at(-1)[0],Math.max(0,Math.floor(num(d?.stats?.plantar?.[k]))));
  return {v:1,progreso,cobrados:{},registro:{},visitas:{dia:'',ids:[]},ops:[]};
}
function pasivaBonoServidor(d,id){return d?.nfts?.[id] ? (d?.mejorasPasivas?.niveles?.[id]===2?0.15:0.1) : 0;}
function mejoraOperacion(prev,id,op){
  const data=JSON.parse(JSON.stringify(prev)),b=data.mejorasPasivas||{v:1,niveles:{},ops:[]};
  if(b.ops.some(x=>x.op===op))return {data,repetido:true};
  if(!['hacha_abuelo','cincel_cantera','pico_viejo'].includes(id))return {error:'Pasiva inválida'};
  if(!prev.nfts?.[id])return {error:'Primero necesitás tener esta pasiva'};
  if(b.niveles[id]===2)return {error:'Esta pasiva ya está mejorada'};
  if(!Number.isFinite(data.plata)||data.plata<50000)return {error:'Necesitás 50.000 Plata'};
  data.plata-=50000;b.niveles[id]=2;b.ops.push({op,id});data.mejorasPasivas=b;
  return {data};
}
function logrosActualizar(prev,next,acciones){
  const b=logrosLibro(prev),sumar=(k,n)=>b.progreso[k]=Math.min(LOGROS_TABLA[k].at(-1)[0],Math.round((num(b.progreso[k])+Math.max(0,n))*100)/100);
  let plantas=num(acciones.plant);
  for(const k of ['papa','ciruela','zanahoria','cebolla','calabacin']){
    const delta=Math.max(0,num(next.stats?.plantar?.[k])-num(prev?.stats?.plantar?.[k]));
    const semillas=Math.max(0,num(prev?.seeds?.[k])-num(next.seeds?.[k]));
    const parcelas=(Array.isArray(next.plots)?next.plots:[]).filter((p,i)=>p?.cropKey===k&&p.state==='growing'&&(prev?.plots?.[i]?.cropKey!==k||num(p.readyAt)>num(prev?.plots?.[i]?.readyAt))).length;
    const n=Math.min(plantas,delta,Math.max(semillas,parcelas));sumar(k,n);plantas-=n;
  }
  for(const k of ['madera','piedra']){
    const antes=num(b.registro[k]),pedido=Number.isFinite(next.logrosAcciones?.[k])&&next.logrosAcciones[k]>=0&&next.logrosAcciones[k]<=1e9?Math.max(antes,Math.round(next.logrosAcciones[k]*100)/100):antes;
    const actos=k==='madera'?num(acciones.chop):Math.min(num(acciones.mine),Math.max(0,num(next.stats?.minar?.piedra)-num(prev?.stats?.minar?.piedra)));
    const bono=pasivaBonoServidor(prev,k==='madera'?'hacha_abuelo':'cincel_cantera');
    sumar(k,Math.min(pedido-antes,actos*(1+bono)));b.registro[k]=pedido;
  }
  next.logrosV2=b;next.logrosAcciones={...b.registro};next.logros={...(prev?.logros||{})};
}
function logroOperacion(prev,key,op){
  const data=JSON.parse(JSON.stringify(prev)),b=logrosLibro(prev),m=/^([a-z]+):([0-3])$/.exec(String(key));
  const premio=m&&LOGROS_TABLA[m[1]]?.[Number(m[2])];if(!premio)return {error:'Logro inexistente'};
  if(b.cobrados[key])return {data,cobro:premio[1],repetido:true};
  if(num(b.progreso[m[1]])<premio[0])return {error:'La meta aún no está confirmada'};
  b.cobrados[key]=true;b.ops=[...(b.ops||[]),{op,key}].slice(-20);data.logrosV2=b;data.plata=num(data.plata)+premio[1];return {data,cobro:premio[1]};
}
function logroVisita(prev,destino,uid,ahora,op){
  const data=JSON.parse(JSON.stringify(prev)),b=logrosLibro(prev),dia=new Date(ahora).toISOString().slice(0,10);
  if((b.ops||[]).some(r=>r.op===op))return {data,cobro:0,repetido:true};
  if(num(data.produccion?.vipHasta)<=ahora||destino===uid)return {error:'Visita no autorizada'};
  if(b.visitas.dia!==dia)b.visitas={dia,ids:[]};
  if(num(b.progreso.visitas)<500&&!b.visitas.ids.includes(destino)){b.visitas.ids.push(destino);b.progreso.visitas=num(b.progreso.visitas)+1;}
  b.ops=[...(b.ops||[]),{op}].slice(-20);data.logrosV2=b;return {data,cobro:0};
}
function artefactoCalcular(a,id,ahora) {
  if(!a || !Object.prototype.hasOwnProperty.call(ARTEFACTOS_PRECIOS,objetoModelo(id)))return {cobro:0,resto:0,fin:ahora};
  const fin=Math.min(ahora,a.desde+ARTEFACTOS_DIAS*86400000);
  const desde=objetoInicioCobro(a);
  const bruto=Math.max(0,Math.min(86400000,fin-desde))*objetoPlataDiaria(id)/86400000+(a.moneda==='plata-v2' ? a.resto||0 : 0);
  const cobro=Math.floor((bruto+1e-9)*10)/10;
  return {cobro,resto:Math.max(0,bruto-cobro),fin};
}
const CAJA_SUMINISTROS={golden:1,max:3,premios:[{peso:4000,item:'madera',qty:40},{peso:3500,item:'piedra',qty:40},{peso:1500,item:'bronce',qty:3},{peso:800,item:'bronce',qty:6},{peso:200,item:'hierro',qty:3}]};
function cajaAzar(){
 const a=new Uint32Array(1),limite=Math.floor(4294967296/10000)*10000;
 do{crypto.getRandomValues(a);}while(a[0]>=limite);
 return a[0]%10000;
}
function cajaOperacion(old,ahora,op,azar){
 const data=JSON.parse(JSON.stringify(old)),libro=data.packs||{compras:{},ops:[]};
 const recibo=(libro.ops||[]).find(r=>r.op===op);
 if(recibo)return recibo.id==='caja'?{data,repetido:true,cobro:0,premio:recibo.premio}:{error:'Recibo reutilizado'};
 const dia=Math.floor(ahora/86400000),count=libro.cajas?.dia===dia?libro.cajas.count:0;
 if(count>=CAJA_SUMINISTROS.max)return {error:'Ya compraste las tres cajas de hoy (UTC)'};
 if(num(data.golden)<CAJA_SUMINISTROS.golden)return {error:'No alcanza el Golden'};
 if((data.mkPend||[]).length>100)return {error:'Recogé tus entregas pendientes antes de comprar'};
 let n=azar();if(!Number.isInteger(n)||n<0||n>=10000)return {error:'Sorteo no disponible; no se cobró'};
 let elegido;for(const p of CAJA_SUMINISTROS.premios){n-=p.peso;if(n<0){elegido=p;break;}}
 const premio={item:elegido.item,qty:elegido.qty};
 data.golden=Math.round((data.golden-CAJA_SUMINISTROS.golden)*1e6)/1e6;
 data.mkPend=[...(data.mkPend||[]),{kind:'res',...premio,payload:null}];
 libro.cajas={dia,count:count+1};libro.ops=[...(libro.ops||[]),{op,id:'caja',premio}].slice(-20);data.packs=libro;
 return {data,cobro:0,premio};
}
const PACKS_DEF={diario:{golden:1,res:{madera:20,piedra:20,bronce:2}},semanal:{golden:10,res:{madera:150,piedra:150,bronce:15,hierro:5}}};
function packOperacion(old,id,ahora,op,azar=cajaAzar){
 if(id==='caja')return cajaOperacion(old,ahora,op,azar);
 const d=Object.prototype.hasOwnProperty.call(PACKS_DEF,id)?PACKS_DEF[id]:null;if(!d)return {error:'Pack inválido'};
 const data=JSON.parse(JSON.stringify(old)),libro=data.packs||{compras:{},ops:[]};
 const recibo=(libro.ops||[]).find(r=>r.op===op);if(recibo)return recibo.id===id?{data,repetido:true,cobro:0}:{error:'Recibo reutilizado'};
 const periodo=id==='semanal'?Math.floor((ahora+3*86400000)/604800000):Math.floor(ahora/86400000);
 if(libro.compras?.[id]===periodo)return {error:'Ya compraste este pack durante el periodo UTC'};
 if(num(data.golden)<d.golden)return {error:'No alcanza el Golden'};
 if((data.mkPend||[]).length>100)return {error:'Recogé tus entregas pendientes antes de comprar'};
 data.golden=Math.round((data.golden-d.golden)*1e6)/1e6;
 data.mkPend=[...(data.mkPend||[]),...Object.entries(d.res).map(([item,qty])=>({kind:'res',item,qty,payload:null}))];
 libro.compras={...(libro.compras||{}),[id]:periodo};libro.ops=[...(libro.ops||[]),{op,id}].slice(-20);data.packs=libro;
 return {data,cobro:0};
}
function artefactoOperacion(prev,accion,id,ahora,op) {
  if(typeof id!=='string' || !/^[a-z]+(?::[a-zA-Z0-9._-]{1,100})?$/.test(id) || !Object.prototype.hasOwnProperty.call(ARTEFACTOS_PRECIOS,objetoModelo(id)) || !['comprar','cobrar'].includes(accion) || (accion==='comprar' && id.includes(':')))return {error:'Objeto u operación inválidos'};
  const data=JSON.parse(JSON.stringify(prev)), libro=data.artefactos || {v:1,items:{},ops:[]};
  const repetida=(libro.ops||[]).find(o=>o.op===op);
  if(repetida)return repetida.id===id && repetida.accion===accion ? {data,cobro:repetida.cobro,repetido:true} : {error:'Identificador reutilizado para otra operación'};
  const a=libro.items[id], t=artefactoCalcular(a,id,ahora);
  let cobro=0;
  if(accion==='comprar'){
    const vip=num(data.produccion && data.produccion.vipHasta)>ahora;
    const activos=Object.values(libro.items).filter(a=>ahora<a.desde+ARTEFACTOS_DIAS*86400000).length;
    if(!vip && activos>=1)return {error:'Free admite un Objeto de Granja activo. VIP permite más ejemplares.'};
    if(!vip && a && t.cobro>0)return {error:'Cobrá primero la producción pendiente del objeto vencido'};
    if(!Number.isFinite(data.golden)||data.golden<ARTEFACTOS_PRECIOS[id])return {error:'No alcanza el $Golden'};
    const destino=a && (ahora<a.desde+ARTEFACTOS_DIAS*86400000 || t.cobro>0) ? id+':'+op : id;
    if(destino!==id && libro.items[destino])return {error:'Este ejemplar ya fue comprado con ese recibo'};
    data.golden=Math.round((data.golden-ARTEFACTOS_PRECIOS[id])*1e6)/1e6;libro.items[destino]={desde:ahora,cobrado:ahora,resto:0,moneda:'plata-v2'};
  }else{
    if(!a || t.cobro<=0 || !objetoCobroListo(a,ahora))return {error:'La Plata se reclama cada 24 horas'};
    const energia=energiaServidor(data,ahora);
    if(energia<1)return {error:'Necesitás 1 punto de energía de granja para cobrar'};
    data.energiaGranja={v:1,actual:energia-1,at:ahora};
    actividadAcreditar(data,1,ahora); // Cobro de objeto validado íntegramente en servidor.
    cobro=t.cobro;data.plata=Math.round((num(data.plata)+cobro)*10)/10;
    libro.items[id]={...a,cobrado:t.fin,resto:t.resto,moneda:'plata-v2'};
  }
  libro.ops=[...(libro.ops||[]),{op,id,accion,cobro}].slice(-20);data.artefactos=libro;
  return {data,cobro};
}
function bancoOperacion(prev,p,op,tasa){
  const data=JSON.parse(JSON.stringify(prev)),libro=data.banco || {v:1,ops:[]};
  if(!p || p.accion!=='canjear' || !Number.isSafeInteger(p.golden) || p.golden<1 || p.golden>1000000)return {error:'Cantidad de Golden inválida'};
  const recibo=(libro.ops||[]).find(r=>r.op===op);
  if(recibo)return recibo.golden===p.golden && recibo.revision===p.revision ? {data,cobro:recibo.golden,repetido:true} : {error:'Recibo reutilizado para otro canje'};
  if(!Number.isSafeInteger(tasa)||tasa<1||tasa>1e9)return {error:'Banco temporalmente no disponible'};
  if(p.revision!=='plata-golden:'+tasa)return {error:'La tasa cambió. Actualizá la cotización y confirmá de nuevo.',tasaCambio:true};
  const plata=tasa*p.golden;
  if(!Number.isFinite(data.plata)||data.plata<plata)return {error:'No alcanza la Plata para este canje'};
  data.plata=Math.round((data.plata-plata)*10)/10;
  data.golden=Math.round((num(data.golden)+p.golden)*1e6)/1e6;
  libro.ops=[...(libro.ops||[]),{op,golden:p.golden,plata,tasa,revision:p.revision}].slice(-20);data.banco=libro;
  return {data,cobro:p.golden};
}
function diarioOperacion(prev,ahora,op){
  const data=JSON.parse(JSON.stringify(prev)),d=data.daily||{day:0,last:'',ops:[]};
  const recibo=(d.ops||[]).find(r=>r.op===op);if(recibo)return {data,cobro:recibo.day,repetido:true};
  const hoy=new Date(ahora).toISOString().slice(0,10);
  if(d.last===hoy)return {error:'Ya reclamaste la recompensa de hoy (UTC)'};
  const dia=d.day>=7||d.day<1?1:d.day+1;
  if(dia===1)data.buffCultivoHasta=ahora+3600000;
  if(dia===2||dia===6){data.seeds={...(data.seeds||{})};const k=dia===2?'papa':'zanahoria';data.seeds[k]=num(data.seeds[k])+5;}
  if(dia===3||dia===5){const k='stone';data.picks=data.picks||{};data.picks.owned={...(data.picks.owned||{}),[k]:true};data.picks.dur={...(data.picks.dur||{}),[k]:num(data.picks.dur&&data.picks.dur[k])+(dia===3?3:2)};if(!data.picks.eq)data.picks.eq=k;}
  if(dia===4)data.dishes={...(data.dishes||{}),papa_asada:num(data.dishes&&data.dishes.papa_asada)+2};
  if(dia===7)data.plata=num(data.plata)+50;
  data.daily={day:dia,last:hoy,ops:[...(d.ops||[]),{op,day:dia}].slice(-20)};
  return {data,cobro:dia};
}
function visitaVista(row){
  const d=row.data||{};
  return {id:row.user_id,nombre:String(row.name||'Granjero').slice(0,40),nivel:num(d.level),expansiones:num(d.expansiones),
    parcelas:(Array.isArray(d.plots)?d.plots:[]).slice(0,256).map(p=>({estado:['empty','growing','ready','withered'].includes(p?.state)?p.state:'empty',cultivo:String(p?.cropKey||'').slice(0,32)}))};
}
function visitaOperacion(prev,destino,uid,ahora,op){
  const data=JSON.parse(JSON.stringify(prev)),book=data.visitas||{};
  const recibo=(book.ops||[]).find(r=>r.op===op);if(recibo)return {data,cobro:1,repetido:true};
  if(num(data.produccion?.vipHasta)<=ahora)return {error:'Las visitas con semillas requieren VIP activo'};
  if(destino===uid)return {error:'Elegí otra granja'};
  const dia=new Date(ahora).toISOString().slice(0,10),ids=book.dia===dia?(book.ids||[]):[];
  if(ids.includes(destino))return {error:'Ya recogiste una semilla en esta granja hoy'};
  if(ids.length>=3)return {error:'Máximo tres semillas de visita por día UTC'};
  data.seeds={...(data.seeds||{}),papa:num(data.seeds?.papa)+1};
  data.visitas={dia,ids:[...ids,destino],ops:[...(book.ops||[]),{op}].slice(-20)};
  return {data,cobro:1};
}
const VIP_PRECIO = 10, VIP_MS = 30 * 86400000;
// Recetas históricas recuperadas; tercera en adelante ya incluye +30%, no volver a multiplicar.
const EXPANSION_MATERIALES=[{madera:2,piedra:2},{madera:15,piedra:10},{madera:38,piedra:25},{madera:38,piedra:32,bronce:4},{madera:49,piedra:39,bronce:6},{madera:59,piedra:47,bronce:7},{madera:76,piedra:62,bronce:4,hierro:3},{madera:89,piedra:72,bronce:4,hierro:3},{madera:108,piedra:88,bronce:6,hierro:4},{madera:124,piedra:99,hierro:4,oro:4},{madera:146,piedra:117,hierro:6,oro:4},{madera:167,piedra:134,hierro:6,oro:6},{madera:195,piedra:156,oro:6,diamante:4},{madera:219,piedra:176,oro:7,diamante:6},{madera:251,piedra:201,diamante:6,netherita:4},{madera:277,piedra:221,diamante:7,netherita:6}];
const VIP_REINTEGROS = {3:5,7:5,12:8,15:8,18:8,22:8,25:8,27:10};
const FARM_XP_CONTRATO = [0,0,25,90,225,550,1250,2750,5500,9000,14000,18200,22400,26900,31400,36200,41300,46400,51900,57400,63200,69300,75400,81800,88200,95000];
// Contrato posicional del mundo; test contrastado con config.js para no inventar nodos.
const NODOS_CONTRATO = [[0,'tree',0],[1,'tree',1],[2,'tree',2],[3,'rock',0],[4,'rock',1],[5,'piedra'],[6,'bronce'],[7,'oro'],[8,'diamante'],[9,'netherita'],[13,'tree',3],[14,'tree',4],[15,'rock',2],[16,'rock',3],[19,'hierro'],[24,'tree',5],[25,'rock',4],[26,'rock',5],
 [34,'tree',null,0],[35,'rock',null,0],[36,'tree',null,1],[37,'rock',null,1],[38,'tree',null,2],[39,'rock',null,2],[40,'bronce',null,2],[41,'oro',null,2],[42,'tree',null,3],[43,'rock',null,3],[44,'tree',null,4],[45,'rock',null,4],[46,'tree',null,5],[47,'rock',null,5],[48,'bronce',null,5],[49,'oro',null,5],[50,'tree',null,6],[51,'rock',null,6],[52,'tree',null,7],[53,'rock',null,7],[54,'bronce',null,7],[55,'oro',null,7],[56,'tree',null,8],[57,'rock',null,8],[58,'tree',null,9],[59,'rock',null,9],[60,'bronce',null,9],[61,'oro',null,9],[62,'tree',null,10],[63,'rock',null,10],[64,'bronce',null,10],[65,'tree',null,11],[66,'rock',null,11],[67,'bronce',null,11],[68,'oro',null,11],[69,'hierro',null,11],[70,'tree',null,12],[71,'rock',null,12],[72,'oro',null,12],[73,'tree',null,13],[74,'rock',null,13],[75,'bronce',null,13],[76,'oro',null,13],[77,'bronce',null,13],[78,'tree',null,14],[79,'rock',null,14],[80,'hierro',null,14],[81,'tree',null,15],[82,'rock',null,15],[83,'bronce',null,15],[84,'oro',null,15],[85,'oro',null,15]];
const NODO_COMPRA = {tree:[30,1],rock:[30,1],piedra:[0,1],bronce:[180,3],hierro:[300,6],oro:[500,9],diamante:[900,13],netherita:[1400,17]};
function nodosPoseidos(d) { return NODOS_CONTRATO.filter(([i,t,lock,exp]) => !!(d.produccion && d.produccion.nodos && d.produccion.nodos[i]) || (exp == null && lock != null && (t==='tree'||t==='rock') && (d[t==='tree'?'treesOpen':'rocksOpen']||[]).includes(lock))); }
function goldenCustodia(d) {
  let n = num(d && d.golden);
  if (!Number.isFinite(n) || n<0 || n>Number.MAX_SAFE_INTEGER/1e6 || Math.abs(n*1e6-Math.round(n*1e6))>0.001) return NaN;
  const sumar = (v, profundidad) => {
    if (!v || typeof v !== "object" || profundidad > 12) return;
    if (v.k === "golden") { if (!Number.isSafeInteger(v.n)||v.n<0) n=NaN; else n+=v.n; }
    if (Array.isArray(v)) v.forEach(x => sumar(x, profundidad + 1));
    else for (const k of ["items", "raiz"]) sumar(v[k], profundidad + 1);
  };
  sumar(d && d.cont,0); sumar(d && d.tumba,0);
  return n;
}
/* Invariantes deterministas: no dependen de los techos heurísticos por hora. */
function xpGranjaOficios(d){
 const s=d.skills||{},a=d.farmXpRitmo;
 const parte=(k,antes,despues)=>{const xp=Math.max(0,Number(s[k])||0);if(!a)return xp*antes;const corte=Math.max(0,Number(a[k])||0);return Math.min(xp,corte)*antes+Math.max(0,xp-corte)*despues;};
 return parte('tala',15,1.5)+parte('mining',20,2);
}
function protegerEconomia(prev, next, ahora) {
  picosUnificarEstado(next);
  const errores = [], antes = prev || {}, p = antes.produccion, n = next.produccion;
  const ritmo=next.farmXpRitmo,ancla=antes.farmXpRitmo||{v:1,tala:Math.max(0,num(antes.skills?.tala)),mining:Math.max(0,num(antes.skills?.mining))};
  if((ritmo||antes.farmXpRitmo)&&(!ritmo||!mismoJSON(ritmo,ancla)))errores.push('No se puede modificar el ancla de XP aceptada');

  if(next.incursion&&!mismoJSON(antes.incursion,next.incursion)&&num(antes.produccion?.vipHasta)<=ahora)errores.push('Las excursiones nuevas requieren VIP activo');
  if(!mismoJSON(antes.artefactos||null,next.artefactos||null))errores.push('Los objetos productores sólo se modifican en el servidor');
  if(!mismoJSON(antes.mejorasPasivas||null,next.mejorasPasivas||null))errores.push('Las mejoras de pasivas sólo se compran en el servidor');
  if(!mismoJSON(antes.packs||null,next.packs||null))errores.push('Los packs sólo se compran en el servidor');
  if(!mismoJSON(antes.banco||null,next.banco||null))errores.push('El Banco sólo se modifica en el servidor');
  if(!mismoJSON(antes.daily||{day:0,last:''},next.daily||{day:0,last:''}) || num(antes.buffCultivoHasta)!==num(next.buffCultivoHasta))errores.push('Las recompensas diarias sólo se reclaman en el servidor');
  if(!mismoJSON(antes.visitas||{},next.visitas||{}))errores.push('Las semillas de visitas sólo se reclaman en el servidor');
  const energia=next.energiaGranja;
  if(energia && (!Number.isFinite(energia.actual)||energia.actual<0||energia.actual>100||!Number.isFinite(energia.at)))errores.push('Energía de granja inválida');
  next.energiaGranja={v:1,actual:Math.min(energia ? Math.max(0,num(energia.actual)) : energiaServidor(antes,ahora),energiaServidor(antes,ahora)),at:ahora};
  let gastoVip = 0, reembolso = 0;
  if (!Number.isFinite(goldenCustodia(next))) errores.push("Golden inválido en saldo o contenedor");
  if (!prev && goldenCustodia(next) > 0) errores.push("Golden inicial no autorizado");
  if (!prev && (num(next.plata)>3 || Object.values(next.res||{}).some(v=>num(v)>0))) errores.push("Saldo o inventario inicial no autorizado");
  if (!prev && (!n || num(next.expansiones)!==0 || num(next.plotsOwned)>3 || Object.keys(n.nodos||{}).length || (next.treesOpen||[]).some(i=>i!==0) || (next.rocksOpen||[]).some(i=>i!==0))) errores.push("Capacidad inicial no autorizada");
  if (p && !n) errores.push("No se puede eliminar la capacidad registrada");
  if (n) {
    if (n.v!==1 || n.vipUnico!==1) errores.push("Versión de capacidad no autorizada");
    if(n.vale===undefined)n.vale=0; // Guardados mínimos anteriores: saldo ausente equivale a cero.
    if(!Number.isSafeInteger(n.vale)||n.vale<0||n.vale>16||(!p&&n.vale!==0)||(n.valesV!==undefined&&n.valesV!==2)||(p?.valesV===2&&n.valesV!==2))errores.push('Versión o saldo de vales no autorizado; recargá el juego');
    if (!prev && num(n.vipHasta) > 0) errores.push("La primera granja no puede crear un VIP gratuito");
    const legados = NODOS_CONTRATO.filter(([i,t,lock,exp])=>exp!=null ? exp<num(antes.expansiones) : t==='tree'||t==='rock' ? (antes[t==='tree'?'treesOpen':'rocksOpen']||[0]).includes(lock) : true).length;
    const base = p ? p.base : prev ? Math.max(5,(num(antes.plotsOwned)||3)+legados-num(antes.expansiones)) : 5;
    // La vieja migración puede entregar parcelas de expansiones pendientes, nunca miles de cupos.
    if (!Number.isSafeInteger(n.base) || (p || !prev ? n.base!==base : n.base<5 || n.base>base+num(antes.expansiones))) errores.push("Capacidad base no autorizada");
    const finAnterior = num(p && p.vipHasta), fin = num(n.vipHasta);
    if (fin !== finAnterior) {
      const migracion = (!p || p.vipUnico!==1) && antes.pass && antes.pass.vip;
      if ((!migracion && finAnterior > ahora) || Math.abs(fin - (ahora + VIP_MS)) > 300000) errores.push("Vencimiento VIP no autorizado");
      else if (!migracion) gastoVip = VIP_PRECIO;
    }
    if (n.vipAplicado && fin <= ahora) errores.push("VIP vencido no puede seguir aplicado");
    if (p) {
      const exp = num(antes.expansiones), expN = num(next.expansiones), obra = antes.expObra, obraN = next.expObra;
      let gasto = 0;
      if (!Number.isInteger(expN) || expN<exp || expN>16 || expN>exp+1 || (expN>exp && (!obra || obra.n!==expN || obra.hasta>ahora+1000))) errores.push("Expansión sin obra terminada");
      if (obraN && (!obra || obra.n!==obraN.n)) {
        if (obraN.n!==expN+1 || Math.abs(num(obraN.desde)-ahora)>300000 || num(obraN.hasta)-num(obraN.desde)<600000*obraN.n*(fin>ahora?0.9:1)-1000) errores.push("Obra no autorizada");
        const precio=20+10*expN+5*expN*expN+Math.round(.5*Math.pow(Math.max(0,expN-2),3));gasto += expN>=2?Math.ceil(precio*1.3):precio;
        const receta=EXPANSION_MATERIALES[expN],recibo={};
        actividadActualizar(antes,JSON.parse(JSON.stringify(next)),ahora,recibo);
        let minas=num(recibo.mine);
        if(!receta)errores.push('Receta de expansión inexistente');
        for(const [k,q] of Object.entries(receta||{})){
          let ingreso=0;
          if(k==='madera')ingreso=Math.min(Math.max(0,num(next.logrosAcciones?.madera)-num(antes.logrosV2?.registro?.madera)),num(recibo.chop)*(1+pasivaBonoServidor(antes,'hacha_abuelo')));
          else {const actos=Math.min(minas,Math.max(0,num(next.stats?.minar?.[k])-num(antes.stats?.minar?.[k])));minas-=actos;
            ingreso=k==='piedra'?Math.min(Math.max(0,num(next.logrosAcciones?.piedra)-num(antes.logrosV2?.registro?.piedra)),actos*(1+pasivaBonoServidor(antes,'cincel_cantera'))):actos*2;}
          if(num(antes.res?.[k])+ingreso-num(next.res?.[k])+1e-7<q)errores.push('Faltan materiales de la expansión: '+k);
        }
      } else if (obra && obraN && obraN.hasta!==obra.hasta) errores.push("No se puede adelantar una obra");
      const poseidos = nodosPoseidos(next), viejos = new Set(nodosPoseidos(antes).map(o=>o[0]));
      if (Object.keys(n.nodos||{}).some(k=>!NODOS_CONTRATO.some(o=>o[0]===+k))) errores.push("Nodo inexistente");
      const retro=n.valesV===2&&p.valesV!==2?Math.max(0,exp-1):0;
      const premio=expN>exp&&(n.valesV===2||expN===1)?1:0;
      const gratis = num(p.vale)+retro+premio-num(n.vale);
      if (!Number.isInteger(gratis)||gratis<0||gratis>16) errores.push("Vale de nodo no autorizado");
      const nuevos = poseidos.filter(o=>!viejos.has(o[0]));
      const plotNuevos = num(next.plotsOwned)-num(antes.plotsOwned);
      const fichas = Math.max(0,num(next.plotsFicha)-num(antes.plotsFicha));
      const fichasMax = [15,25,30].filter(k=>next.pass?.claimF?.[k]&&!antes.pass?.claimF?.[k]).length+(next.pass?.claimV?.[29]&&!antes.pass?.claimV?.[29]?1:0);
      if (fichas>fichasMax) errores.push("Ficha de parcela no autorizada");
      gasto += Math.max(0,plotNuevos-fichas)*20;
      for (const [i,t,lock,expNodo] of nuevos) {
        if (t==='piedra') errores.push("Ese emplazamiento heredado no se compra como nodo nuevo");
        if ((expNodo!=null && expNodo>=expN) || num(next.level)<NODO_COMPRA[t][1]) errores.push("Nodo sin desbloquear");
        gasto += NODO_COMPRA[t][0];
      }
      if (gratis) {
        const parcelas=Math.max(0,plotNuevos-fichas),basicos=nuevos.filter(o=>o[1]==='tree'||o[1]==='rock').length;
        if(gratis>parcelas+basicos)errores.push("Vale consumido sin nodo básico");
        const gratisParcelas=Math.min(gratis,parcelas);
        gasto-=gratisParcelas*20+Math.min(Math.max(0,gratis-gratisParcelas),basicos)*30;
      }
      const activos = poseidos.filter(o=>!n.pausas?.['n:'+o[0]]).length+Array.from({length:Math.min(1000,num(next.plotsOwned))},(_,i)=>i).filter(i=>!n.pausas?.['p:'+i]).length;
      if (activos>n.base+expN+(fin>ahora?Math.max(2,Math.ceil((n.base+expN)*.25)):0)) errores.push("Producción activa supera la capacidad");
      // Emisión simultánea legítima (pedidos, cosecha) puede financiar compras: el techo horario
      // sigue evaluándose aparte. No se usa gasto como prueba criptográfica de cada compra.
      if (gasto>num(antes.plata)-num(next.plata)+Math.max(0,ventaStockPermiso(antes,next))+2200) errores.push("Compras productivas sin fondos suficientes");
    }
  }
  for (const track of ["claimF","claimV"]) {
    const a = antes.pass && antes.pass[track] || {}, b = next.pass && next.pass[track] || {};
    if(Object.keys(b).some(k=>b[k]&&!a[k]))errores.push('El pase está desactivado; no admite nuevos premios');
    for (const k of Object.keys(a)) if (a[k] && !b[k]) errores.push("No se pueden volver a reclamar premios del pase");
    for (const k of Object.keys(b)) if (b[k] && !a[k] && (!Number.isInteger(+k)||+k<1||+k>30||+k>Math.min(30,Math.floor(num(next.pass.stars)/40)))) errores.push("Nivel del pase sin desbloquear");
    if (track === "claimV") for (const k of Object.keys(b)) if (b[k] && !a[k]) {
      const vip = n ? num(n.vipHasta) > ahora : p ? num(p.vipHasta) > ahora : !!(antes.pass && antes.pass.vip);
      if (!vip || !Number.isInteger(+k) || +k < 1 || +k > 30 || +k > Math.min(30,Math.floor(num(next.pass.stars)/40))) errores.push("Premio VIP no autorizado");
      else reembolso += VIP_REINTEGROS[k] || 0;
    }
  }
  const dia = new Date(ahora).toISOString().slice(0,10), control = antes._economiaControl || {};
  const estrellas = Math.max(0,num(next.pass && next.pass.stars)-num(antes.pass && antes.pass.stars));
  if(estrellas>0)errores.push('El pase está desactivado; no admite nuevas estrellas');
  const compradas = Math.max(0,Math.floor((goldenCustodia(antes)+reembolso-goldenCustodia(next)-gastoVip)/15))*40;
  const emitidas = (control.dia===dia?num(control.estrellas):0)+Math.max(0,estrellas-compradas);
  if (emitidas>138) errores.push("Estrellas del pase superiores al máximo diario y semanal combinado");
  next._economiaControl = {dia,estrellas:emitidas}; // nunca se cree el contador recibido del cliente
  if (prev && goldenCustodia(next) > goldenCustodia(prev) + reembolso - gastoVip + 1e-7) errores.push("Emisión Golden sin venta o recompensa autorizada");
  if (num(next.farmXpBase)<num(antes.farmXpBase)) errores.push("No se puede reutilizar XP anterior al prestigio");
  return errores;
}
// Catálogo del comprador del sistema. El test lo contrasta con priceOf del juego real.
const VENTA_SISTEMA = { papa:2,ciruela:4,cereza:5,remolacha:7,zanahoria:8,cebolla:16,calabacin:25,repollo:50,calabaza:100,brocoli:210,girasol:380,trigo:680,maiz:1200,
  madera:12,piedra:15,bronce:160,hierro:240,oro:280,diamante:360,netherita:480,tablon:36,barra_piedra:45,barra_bronce:480,barra_hierro:720,barra_oro:840 };
function ventaStockPermiso(prev, next) {
  if (!prev || !next) return 0;
  const obra=next.expObra,materiales=obra&&(!prev.expObra||obra.n!==prev.expObra.n)?EXPANSION_MATERIALES[num(next.expansiones)]||{}:{};
  let buff = 1;
  for (const b of (Array.isArray(prev.buffs) ? prev.buffs : [])) if (b && b.type === "yield") buff = Math.max(buff, Math.min(3, num(b.mult)));
  const mult = Math.min(10, (1 + .015 * Math.max(0, Math.min(25, num(prev.level)) - 1) + .015 * Math.max(0, Math.min(100, num(prev.prestige)))) * buff);
  let total = 0;
  for (const k of Object.keys(VENTA_SISTEMA)) {
    const antes = num(prev.res && prev.res[k]), despues = num(next.res && next.res[k]);
    // Sólo inventario que ya estaba aceptado: nunca se cree un "total vendido" del cliente.
    if (Number.isSafeInteger(antes) && Number.isSafeInteger(despues) && antes > despues && despues >= 0) total += Math.max(0,antes - despues-num(materiales[k])) * VENTA_SISTEMA[k] * mult;
  }
  return Math.ceil(total);
}

/* ── EL MERCADO ENTRE JUGADORES ───────────────────────────────────────────────────────
   (15/9) El portero no sabía que existe el mercado, y el mercado mueve BULTOS: un maíz
   vale 1.200 de plata y el techo de un guardado rápido es ~2.084. O sea que una venta
   modesta disparaba « plata imposible », el guardado se rechazaba y porteroRechazo()
   devolvía la granja al estado anterior — con el ítem ya entregado al comprador. Eso es
   perder progreso por jugar bien, que es justo lo que prohíbe la ley 1.

   La cuenta NO se le cree al cliente: sale de la tabla `market`, que el portero lee con
   la llave de servicio. Tres movimientos legítimos, tres permisos:
     · COBRAR una venta  → entra plata     (filas mías con paid = true)
     · COMPRAR algo      → entran recursos (filas con sold_to = yo)
     · RETIRAR lo mío    → vuelven recursos (filas mías libres que DESAPARECIERON desde
                            el guardado anterior: retirar borra la fila)
   Para que un permiso no se gaste dos veces, cada guardado aceptado deja anotado en
   `farms.mercado_ack` lo que ya contó. El permiso de hoy es la DIFERENCIA con eso.
   Se acredita el precio ENTERO (sin descontar la comisión): de más, nunca de menos.

   Lo que hace que esto no sea un agujero: el vendedor no puede tocar el `price` ni
   marcar como vendida una fila suya — lo impiden los permisos por columna y las dos
   políticas de sql/mercado-portero.sql. Sin esa migración esto sigue siendo seguro,
   solo más generoso. */
function resDePend(lista) {
  const r = {};
  for (const p of (Array.isArray(lista) ? lista : [])) {
    if (!p || p.kind !== "res" || !p.item) continue;
    r[p.item] = num(r[p.item]) + num(p.qty);
  }
  return r;
}
function mercadoPermiso(uid, filas, ack, prev, next) {
  const permiso = { plata: 0, res: {} };
  const nuevo = { ventas: 0, compras: {}, abiertas: {} };
  for (const f of (Array.isArray(filas) ? filas : [])) {
    if (!f) continue;
    const mia = f.seller === uid, qty = num(f.qty), esRes = f.kind === "res" && f.item;
    if (mia && f.paid) nuevo.ventas += f.fee_pct==null ? num(f.price) : Math.max(1,Math.round(num(f.price)*(1-num(f.fee_pct)/100)));
    if (f.sold_to === uid && !mia && esRes) nuevo.compras[f.item] = num(nuevo.compras[f.item]) + qty;
    if (mia && !f.sold_to && esRes) nuevo.abiertas[f.item] = num(nuevo.abiertas[f.item]) + qty;
  }
  /* sin anotación previa (primer guardado tras la migración) se permite todo lo que el
     mercado dice que pasó: de estrenar el sistema no puede salir un rechazo */
  const a = (ack && typeof ack === "object") ? ack : null;
  permiso.plata = Math.max(0, nuevo.ventas - num(a && a.ventas));
  /* lo que estaba en la bandeja de pendientes y ya no está: es una compra vieja que
     recién ahora entró en la bolsa (mkPend), y también tiene que tener permiso */
  const pendAntes = resDePend(prev && prev.mkPend), pendAhora = resDePend(next && next.mkPend);
  const claves = new Set([...Object.keys(nuevo.compras), ...Object.keys(nuevo.abiertas),
    ...Object.keys((a && a.compras) || {}), ...Object.keys((a && a.abiertas) || {}),
    ...Object.keys(pendAntes)]);
  for (const k of claves) {
    const compra = Math.max(0, num(nuevo.compras[k]) - num(a && a.compras && a.compras[k]));
    const retiro = a ? Math.max(0, num(a.abiertas && a.abiertas[k]) - num(nuevo.abiertas[k])) : num(nuevo.abiertas[k]);
    const reclamo = Math.max(0, num(pendAntes[k]) - num(pendAhora[k]));
    const total = compra + retiro + reclamo;
    if (total > 0) permiso.res[k] = total;
  }
  return { permiso, ack: nuevo };
}

function evaluarGuardado(prev, next, elapsedSeg, permiso) {
  const per = (permiso && typeof permiso === "object") ? permiso : { plata: 0, res: {} };
  const perRes = (k) => num(per.res && per.res[k]);
  const sospechas = [], delta = {};
  if (!next || typeof next !== "object") return { delta, sospechas: ["snapshot vacío o inválido"] };

  for (const k of ["plata", "golden", "level", "expansiones"]) {
    const v = next[k];
    if (v != null && (typeof v !== "number" || !isFinite(v) || v < 0)) sospechas.push("valor inválido en " + k + ": " + String(v));
  }
  for (const k in (next.res || {})) {
    const v = next.res[k];
    if (typeof v !== "number" || !isFinite(v) || v < 0) sospechas.push("recurso inválido " + k + ": " + String(v));
  }

  const p = prev && typeof prev === "object" ? prev : null;
  delta.plata = num(next.plata) - num(p && p.plata);
  delta.golden = num(next.golden) - num(p && p.golden);
  delta.level = num(next.level) - num(p && p.level);
  delta.expansiones = num(next.expansiones) - num(p && p.expansiones);
  const resPrev = (p && p.res) || {}, resNext = next.res || {};
  const claves = new Set([...Object.keys(resPrev), ...Object.keys(resNext)]);
  let anotadas = 0;
  for (const k of claves) {
    const d = num(resNext[k]) - num(resPrev[k]);
    if (d && anotadas < 60) { delta["res." + k] = d; anotadas++; }
  }
  for (const k of Object.keys(delta)) if (!delta[k]) delete delta[k];

  /* sin guardado anterior no hay contra qué medir: primera vez, pasa limpio */
  if (!p) return { delta, sospechas };

  /* REINICIO DE CUENTA (24/9, dirección: « botón reset cuenta para empezar como nuevo »).
     Un guardado marcado como reinicio (next.reinicio más nuevo que el anterior) y que de
     verdad está EN CERO pasa sin medir deltas: perderlo todo no es una trampa, y la única
     regla que lo frenaba —« las expansiones no pueden bajar »— existe contra el que sube y
     baja para cobrar, no contra el que se va a cero. Si el « reinicio » trae plata o terreno
     no es un reinicio, y se mide como cualquier otro. */
  if (num(next.reinicio) > num(p.reinicio) && esDeCero(next)) return { delta, sospechas: [] };

  if (elapsedSeg < 0) sospechas.push("el reloj fue hacia atrás (" + Math.round(elapsedSeg) + " s)");
  const horas = Math.max(30, elapsedSeg) / 3600;   // piso de 30 s: dos guardados pegados no dividen por cero

  /* plata: ni con TODA la granja expandida vendiendo sin parar se junta más que esto */
  const plataMax = CELDAS_MAX * ANCLA * horas * MARGEN + 2000 + num(per.plata) + ventaStockPermiso(p, next);
  if ((delta.plata || 0) > plataMax) sospechas.push("plata imposible: +" + Math.round(delta.plata) + " en " + fmtHoras(horas) + " (techo " + Math.round(plataMax) + ")");

  /* madera y piedra: nodos × su tasa. Las cargas GUARDAN producción, no la multiplican */
  for (const k of ["madera", "piedra"]) {
    const d = delta["res." + k] || 0;
    const max = NODOS_MAX * TASA_NODO * horas * MARGEN + 100 + perRes(k);
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas) + " (techo " + Math.round(max) + ")");
  }

  /* minerales: UNA veta por tipo, relojes de 8-24 h — por día caben pocos de cada uno */
  for (const k of ["bronce", "hierro", "oro", "diamante", "netherita"]) {
    const d = delta["res." + k] || 0;
    const max = 6 * (horas / 24) * MARGEN + 12 + perRes(k);
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas));
  }

  const xpYaAceptada = num(p.skills && p.skills.farming) + xpGranjaOficios(p) - num(p.farmXpBase);
  const nivelPorXpAceptada = Math.max(1,FARM_XP_CONTRATO.reduce((nv,xp,i)=>i<=25&&xp<=xpYaAceptada?i:nv,1));
  if ((delta.level || 0) > Math.ceil(horas * 8) + 4 && num(next.level)>nivelPorXpAceptada) sospechas.push("subida de nivel imposible: +" + delta.level + " en " + fmtHoras(horas));
  if ((delta.expansiones || 0) < 0) sospechas.push("las expansiones no pueden bajar (" + delta.expansiones + ")");
  if ((delta.expansiones || 0) > 4 && horas < 1) sospechas.push("+" + delta.expansiones + " expansiones en " + fmtHoras(horas));

  return { delta, sospechas };
}

function fmtHoras(h) { return h < 1 ? Math.round(h * 60) + " min" : (Math.round(h * 10) / 10) + " h"; }
/* lo que un jugador nuevo tiene: 3 de plata, 20 $Golden, nivel 1, sin terreno, sin nada */
function esDeCero(n) {
  if (num(n.plata) > 3 || num(n.golden) > 20 || num(n.level) > 1 || num(n.expansiones) > 0 || num(n.prestige) > 0) return false;
  for (const k in (n.res || {})) if (num(n.res[k]) > 0) return false;
  return true;
}
/* === FIN REGLAS === */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== 'POST') return json({error:'Método no permitido'},405);
  try {
    /* ¿quién sos? — el JWT de la sesión anónima del juego, verificado contra Auth */
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "sin sesión" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !u?.user) return json({ error: "sesión inválida" }, 401);
    const uid = u.user.id;

    const body = await req.json().catch(() => null);

    if(body?.banco && body.cuenta!==uid)return json({error:'La sesión cambió de cuenta'},409);
    let tasaBanco=10000;
    if(body?.banco){
      tasaBanco=Number(Deno.env.get('BANCO_PLATA_POR_GOLDEN') ?? 10000);
      if(!Number.isSafeInteger(tasaBanco)||tasaBanco<1||tasaBanco>1e9)return json({error:'Banco temporalmente no disponible'},503);
      if(body.banco.accion==='cotizar')return json({ok:true,tasa:tasaBanco,revision:'plata-golden:'+tasaBanco,usdt:false});
    }
    let granjaVisitada;
    if(body?.visita){
      if(body.cuenta!==uid)return json({error:'La sesión cambió de cuenta'},409);
      const {data:propia,error:ep}=await admin.from('farms').select('data').eq('user_id',uid).maybeSingle();
      if(ep)return json({error:'No se pudo comprobar el VIP'},503);
      if(num(propia?.data?.produccion?.vipHasta)<=Date.now())return json({error:'Las visitas requieren VIP activo'},403);
      if(body.visita.accion==='listar'){
        const {data:lista,error}=await admin.from('farms').select('user_id,name').neq('user_id',uid).order('user_id').limit(30);
        return error?json({error:'No se pudieron consultar las granjas'},503):json({ok:true,granjas:(lista||[]).map(r=>({id:r.user_id,nombre:String(r.name||'Granjero').slice(0,40)}))});
      }
      if(typeof body.visita.destino!=='string'||!/^[0-9a-f-]{36}$/i.test(body.visita.destino)||body.visita.destino===uid)return json({error:'Granja de destino inválida'},400);
      const {data:destino,error}=await admin.from('farms').select('user_id,name,data').eq('user_id',body.visita.destino).maybeSingle();
      if(error)return json({error:'No se pudo leer la visita'},503);
      if(!destino)return json({error:'La granja ya no está disponible'},404);
      granjaVisitada=visitaVista(destino);
      if(!['ver','semillas'].includes(body.visita.accion))return json({error:'Acción de visita inválida'},400);
    }
    // Cobros y canjes autoritativos: saldo, reloj, recibo y compare-and-swap en el servidor.
    if(body?.mejora || body?.pack || body?.artefacto || body?.banco || body?.diario || body?.visita || body?.logro){
      const a=body.artefacto;
      if(body.cuenta!==uid)return json({error:'La sesión cambió de cuenta; recargá antes de operar'},409);
      if(typeof body.op!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.op)||typeof body.base!=='string')return json({error:'Pedido inválido'},400);
      const {data:row,error:err}=await admin.from('farms').select('*').eq('user_id',uid).maybeSingle();
      if(err)return json({error:'No se pudo leer la granja'},503);
      if(!row)return json({error:'Primero sincronizá tu granja'},409);
      const ahora=Math.max(Date.now(),new Date(row.updated_at).getTime()+1);
      const r=body.mejora ? mejoraOperacion(row.data,body.mejora.id,body.op) : body.pack ? packOperacion(row.data,body.pack.id,ahora,body.op) : body.logro ? logroOperacion(row.data,body.logro.key,body.op) : body.visita ? (body.visita.accion==='ver'?logroVisita(row.data,body.visita.destino,uid,ahora,body.op):visitaOperacion(row.data,body.visita.destino,uid,ahora,body.op)) : body.diario ? (body.diario.accion==='reclamar'?diarioOperacion(row.data,ahora,body.op):{error:'Operación diaria inválida'}) : body.banco ? bancoOperacion(row.data,body.banco,body.op,tasaBanco) : artefactoOperacion(row.data,a.accion,a.id,ahora,body.op);
      if(r.repetido)return json({ok:true,data:row.data,updated_at:row.updated_at,cobro:r.cobro,premio:r.premio,repetido:true,granja:granjaVisitada});
      if(body.base!==row.updated_at)return json({error:'Otra sesión guardó; recargá antes de operar',conflicto:true},409);
      if(r.tasaCambio)return json({error:r.error,tasaCambio:true},412);
      if(r.error)return json({error:r.error},400);
      picosUnificarEstado(r.data);
      const fecha=new Date(ahora).toISOString();
      const {data:hecho,error:fallo}=await admin.from('farms').update({data:r.data,updated_at:fecha}).eq('user_id',uid).eq('updated_at',row.updated_at).select('updated_at').maybeSingle();
      if(fallo)return json({error:'No se pudo confirmar la operación'},503);
      if(!hecho)return json({error:'Otra sesión guardó primero',conflicto:true},409);
      return json({ok:true,data:r.data,updated_at:fecha,cobro:r.cobro,premio:r.premio,granja:granjaVisitada});
    }

    /* REINICIAR LA CUENTA (24/9, dirección: « debe literal borrar la cuenta y crearla como si
       fuera nuevo jugador »). Con { borrar: true } se BORRA la fila de la granja: el próximo
       guardado de este jugador es « primera vez », sin guardado anterior contra el que medir.
       La cuenta de Auth (el correo) no se toca: es el mismo jugador, con una granja nueva.
       Queda en la bitácora, como todo lo que pasa por acá. */
    if (body?.borrar === true) {
      await admin.from("farm_saves_log").insert({ user_id: uid, reglas_v: VERSION, elapsed_s: 0, delta: { borrar: true }, sospechas: [] });
      const { error: derr } = await admin.from("farms").delete().eq("user_id", uid);
      if (derr) return json({ error: derr.message }, 500);
      return json({ ok: true, borrado: true });
    }

    /* el paquete: el mismo { name, data } que antes iba directo a la tabla */
    const data = body?.data, name = String(body?.name || "Granjero").slice(0, 60);
    if (!data || typeof data !== "object") return json({ error: "snapshot inválido" }, 400);
    if (JSON.stringify(data).length > 700_000) return json({ error: "snapshot demasiado grande" }, 400);

    /* el guardado anterior y cuánto tiempo pasó — según EL SERVIDOR */
    const { data: prevRow, error: readError } = await admin.from("farms").select("*").eq("user_id", uid).maybeSingle();
    if (readError) return json({ error: "No se pudo leer la granja anterior. No se escribió nada." }, 503);
    // Una pestaña anterior al reinicio global no puede resucitar su progreso.
    if (Number(prevRow?.data?.reinicio || 0) > Number(data.reinicio || 0)) return json({ error: "La cuenta se reinició. Recargá para comenzar de cero.", conflicto: true }, 409);
    const op = body?.op;
    if (op != null && (typeof op !== "string" || !/^[a-zA-Z0-9._-]{8,100}$/.test(op))) return json({ error: "Identificador de operación inválido" }, 400);
    if (op && prevRow?.data?._saveOp === op) return json({ ok: true, repetido: true, updated_at: prevRow.updated_at, actividadGranja:prevRow.data.actividadGranja,logrosV2:prevRow.data.logrosV2 });
    if (Object.prototype.hasOwnProperty.call(body, "base") && body.base !== (prevRow?.updated_at ?? null)) return json({ error: "Otra sesión guardó una versión diferente", conflicto: true }, 409);
    const ahora = new Date(Math.max(Date.now(), prevRow?.updated_at ? new Date(prevRow.updated_at).getTime() + 1 : 0));
    const elapsedSeg = prevRow?.updated_at ? (ahora.getTime() - new Date(prevRow.updated_at).getTime()) / 1000 : 0;

    /* lo que el MERCADO dice que hizo este jugador (no lo que dice su navegador) */
    const { data: filas, error: marketError } = await admin.from("market")
      .select("seller,sold_to,kind,item,qty,price,paid,fee_pct")
      .or("seller.eq." + uid + ",sold_to.eq." + uid).limit(2000);
    if (marketError) return json({ error: "No se pudo validar el mercado. No se escribió nada." }, 503);
    const mercado = mercadoPermiso(uid, filas ?? [], prevRow?.mercado_ack ?? null, prevRow?.data ?? null, data);
    const protegidos = protegerEconomia(prevRow?.data ?? null, data, ahora.getTime());
    if (protegidos.length) {
      await admin.from("farm_saves_log").insert({user_id:uid,reglas_v:VERSION,elapsed_s:Math.round(elapsedSeg),delta:{economia_rechazada:true},sospechas:protegidos});
      return json({ error: "Guardado económico bloqueado; conservá el respaldo local y recargá para sincronizar.", economia:true, sospechas: protegidos }, 409);
    }

    /* las reglas miran, la bitácora recuerda */
    const { delta, sospechas } = evaluarGuardado(prevRow?.data ?? null, data, elapsedSeg, mercado.permiso);
    const permisoUsado = mercado.permiso.plata || Object.keys(mercado.permiso.res).length;
    await admin.from("farm_saves_log").insert({
      user_id: uid, reglas_v: VERSION, elapsed_s: Math.round(elapsedSeg),
      delta: permisoUsado ? { ...delta, mercado: mercado.permiso } : delta, sospechas,
    });

    /* modo rechazo (futuro, tras calibrar): un guardado con sospechas no entra */
    if (MODO === "rechazo" && sospechas.length) return json({ error: "guardado rechazado", sospechas }, 422);
    actividadActualizar(prevRow?.data??null,data,ahora.getTime()); // Sólo guardados aceptados; CAS evita duplicar crédito.

    /* el guardado ENTRA, y con él queda anotado lo del mercado que ya se contó: así el
       mismo permiso no se gasta dos veces. Si la columna todavía no existe (falta correr
       sql/mercado-portero.sql), se guarda igual sin ella — nunca al revés: que el jugador
       pierda la partida por una migración pendiente sería el mismo error de siempre. */
    const fila = { user_id: uid, name, data, updated_at: ahora.toISOString() };
    if (op) data._saveOp = op; else delete data._saveOp;
    const escribir = async (conAck: boolean) => {
      const valor = conAck ? { ...fila, mercado_ack: mercado.ack } : fila;
      if (prevRow) return await admin.from("farms").update(valor).eq("user_id", uid).eq("updated_at", prevRow.updated_at).select("updated_at").maybeSingle();
      return await admin.from("farms").insert(valor).select("updated_at").maybeSingle();
    };
    let escrito = await escribir(true);
    if (escrito.error && /mercado_ack/.test(escrito.error.message || "")) escrito = await escribir(false);
    if (escrito.error?.code === "23505" || (!escrito.error && !escrito.data)) return json({ error: "Otra sesión guardó antes. No se sobrescribió su granja.", conflicto: true }, 409);
    if (escrito.error) return json({ error: escrito.error.message }, 500);
    return json({ ok: true, sospechas: sospechas.length, updated_at: escrito.data.updated_at, actividadGranja:data.actividadGranja,logrosV2:data.logrosV2 });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
