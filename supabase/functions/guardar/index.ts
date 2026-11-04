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
const VERSION = 8;        // Tala: evidencia física aunque la madera se consuma antes del guardado.
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
  return {v:1,energia:Math.min(ACTIVIDAD_OBJETIVO,Math.max(0,Math.floor(num(a?.energia)))),registro:{...(a?.registro||{})},desde:num(a?.desde),cumplidaAt:num(a?.cumplidaAt),jornada:a?.jornada?JSON.parse(JSON.stringify(a.jornada)):null,bonoTotal:Math.max(0,num(a?.bonoTotal))};
}
function actividadAcreditar(data,cantidad,ahora){
  const a=actividadLibro(data);a.desde=a.desde||ahora;a.energia=Math.min(ACTIVIDAD_OBJETIVO,a.energia+Math.max(0,Math.floor(cantidad)));
  if(a.energia>=ACTIVIDAD_OBJETIVO&&!a.cumplidaAt)a.cumplidaAt=ahora;data.actividadGranja=a;return a;
}
function actividadEstado(d,ahora){const a=actividadLibro(d);return {energia:a.energia,objetivo:ACTIVIDAD_OBJETIVO,cumplida:a.energia>=ACTIVIDAD_OBJETIVO,vip:num(d?.produccion?.vipHasta)>ahora,usdt:false};}
// No depende de cuánto material queda en la bolsa. null conserva el testigo neto
// de clientes antiguos sin historia de nodos; cero significa que la historia no prueba tala.
function talaEvidenciaNodos(a,b,ahora,desdeServidor=0){
  const mundo=premiumMundo(a);
  if(mundo!==premiumMundo(b))return 0;
  const presente=(d,o)=>premiumPresente(d,o)||(!o.premiumOnly&&o.exp===null&&o.lock===0&&d.treesOpen===undefined);
  const arboles=mundo.objects.filter(o=>o.type==='tree'&&presente(a,o)&&presente(b,o)&&
    (o.premiumOnly||o.exp===null||num(a.expansiones)>o.exp));
  if(!arboles.length)return 0;
  if(!arboles.some(o=>a.nodos?.[o.key]!==undefined||a.nodoUsos?.[o.i]!==undefined||b.nodoUsos?.[o.i]!==undefined))return null;
  const inicio=desdeServidor>0&&desdeServidor<=ahora?desdeServidor:ahora,base=1800000;
  const comidaCd=(d,t)=>(Array.isArray(d.buffs)?d.buffs:[]).some(x=>x?.type==='cd'&&x.mult===.85&&num(x.until)>t);
  const comidaNueva=num(a.dishes?.estofado)>num(b.dishes?.estofado)&&comidaCd(b,inicio);
  const cicloNuevo=base*((num(a.produccion?.vipHasta)>inicio||num(b.produccion?.vipHasta)>inicio)?.9:1)*((comidaCd(a,inicio)||comidaNueva)?.85:1);
  const cargas=(r,t)=>!r?.readyAt?4:r.readyAt>t?0:Math.min(4,1+Math.max(0,Math.floor((t-r.readyAt)/(r.readyAt-r.cdIni))));
  let probadas=0;
  for(const o of arboles){
    const previo=a.nodoUsos?.[o.i]??0,actual=b.nodoUsos?.[o.i]??previo;
    if(!Number.isSafeInteger(previo)||previo<0||!Number.isSafeInteger(actual)||actual<=previo)continue;
    const n=actual-previo,r=a.nodos?.[o.key],q=b.nodos?.[o.key],virgen=previo===0&&(!r||r.readyAt===0);
    // Un árbol ya usado sin reloj no vuelve a nacer con cuatro cargas.
    if(!virgen&&(!r||!Number.isFinite(r.readyAt)||!Number.isFinite(r.cdIni)||r.readyAt<=r.cdIni||r.cdIni<=0)){
      if(!r&&!Object.keys(a.nodos||{}).length)return null;
      continue;
    }
    if(a.produccion?.pausas?.['n:'+o.i])continue;
    const pausa=b.produccion?.pausas?.['n:'+o.i];
    if(pausa&&(!Number.isFinite(pausa.at)||pausa.at<inicio||pausa.at>ahora))continue;
    const fin=pausa?pausa.at:ahora;
    if(!q||!Number.isFinite(q.readyAt)||!Number.isFinite(q.cdIni)||q.cdIni<=0||q.readyAt<=q.cdIni||q.cdIni>fin+1000)continue;
    const dur=q.readyAt-q.cdIni,antesDur=virgen?cicloNuevo:r.readyAt-r.cdIni;
    if(antesDur<base*.9*.85-1000||Math.min(Math.abs(dur-antesDur),Math.abs(dur-cicloNuevo),Math.abs(dur-base))>1000)continue;
    if(!virgen&&(q.readyAt<r.readyAt||(q.readyAt===r.readyAt&&q.cdIni===r.cdIni)))continue;
    const iniciales=virgen?4:cargas(r,inicio),restantes=cargas(q,fin);
    let primera;
    if(virgen||iniciales===4)primera=inicio+cicloNuevo;
    else if(!iniciales)primera=r.readyAt;
    else primera=Math.min(r.readyAt+iniciales*antesDur,inicio+cicloNuevo);
    const producidas=primera<=fin?1+Math.floor((fin-primera)/cicloNuevo):0;
    if(restantes>iniciales+producidas||n>iniciales+producidas-restantes)continue;
    if(!restantes&&q.cdIni<inicio-1000)continue;
    probadas+=n;
  }
  const stat=Math.max(0,num(b.stats?.talar?._)-num(a.stats?.talar?._));
  const xp=Math.floor(Math.max(0,num(b.skills?.tala)-num(a.skills?.tala))/10);
  let ingresosPedidos=0;
  for(const [periodo,campo] of [['dia','lista'],['semana','pedSemanal'],['mes','pedMensual'],['finde','pedEvento']]){
    const p=a.pedidos,q=b.pedidos;if(!p?.[periodo]||p[periodo]!==q?.[periodo])continue;
    const anteriores=campo==='lista'?(Array.isArray(p[campo])?p[campo]:[]):[p[campo]],actuales=campo==='lista'?(Array.isArray(q[campo])?q[campo]:[]):[q[campo]];
    anteriores.forEach((antes,i)=>{const despues=actuales[i];
      if(antes?.hecho!==false||despues?.hecho!==true||antes.tipo==='tutorial'||antes.tipoEncargo==='tutorial'||num(antes.n)<=0||num(antes.plata)<=0)return;
      if(mismoJSON({...antes,hecho:false},{...despues,hecho:false}))ingresosPedidos+=antes.plata;
    });
  }
  const fabricadas=Math.min(Math.floor(Math.max(0,num(b.skills?.crafting)-num(a.skills?.crafting))/5),Math.floor(Math.max(0,num(a.plata)+ingresosPedidos-num(b.plata))/2));
  const hachas=Math.max(0,num(a.tools?.axe)+fabricadas-num(b.tools?.axe));
  const e=a.energiaGranja,finVip=num(a.produccion?.vipHasta);
  if(!e||!Number.isFinite(e.actual)||!Number.isFinite(b.energiaGranja?.actual)||b.energiaGranja.actual<0)return 0;
  const regen=(desde,hasta)=>{const vip=Math.max(0,Math.min(hasta,finVip)-desde);return (vip*100+(Math.max(0,hasta-desde)-vip)*50)/ENERGIA_GRANJA_MS;};
  // La regeneración anterior al último guardado sólo puede llenar el depósito.
  // El intervalo posterior usa updated_at del servidor, nunca visto/at del cliente nuevo.
  const energiaInicio=Math.min(finVip>inicio?100:50,Math.max(0,e.actual)+regen(Math.min(inicio,Math.max(0,num(e.at)||inicio)),inicio));
  const energia=Math.floor(Math.max(0,energiaInicio+regen(inicio,ahora)-b.energiaGranja.actual)+1e-6);
  return Math.min(probadas,stat,xp,Math.floor(hachas),energia);
}
function actividadEvidencias(a,b,ahora,desdeServidor=0){
  const suma=o=>Object.values(o||{}).reduce((s,v)=>s+Math.max(0,num(v)),0);
  const sube=(x,y)=>Object.keys(y||{}).reduce((s,k)=>s+Math.max(0,num(y[k])-num(x?.[k])),0);
  const baja=(x,y)=>sube(y,x);
  const stat=k=>sube(a.stats?.[k],b.stats?.[k]);
  const colas=(x,y,fin)=>{const ids=new Set((Array.isArray(x)?x:[]).filter(Boolean).map(c=>String(c.id||c.cultivo)+':'+c[fin]));return (Array.isArray(y)?y:[]).filter(c=>c&&num(c.total||c.n)>0&&num(c[fin])>ahora&&!ids.has(String(c.id||c.cultivo)+':'+c[fin])).length;};
  let siembras=0,cosechas=0;
  for(let i=0;i<Math.min(256,(b.plots||[]).length);i++){
    const p=a.plots?.[i],q=b.plots[i];if(!q)continue;
    const nueva=q.state==='growing'&&num(q.readyAt)>ahora&&(!p||p.state==='dry'||(['ready','growing'].includes(p.state)&&num(p.readyAt)<=ahora));
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
  const tala=talaEvidenciaNodos(a,b,ahora,desdeServidor);
  return {plant:Math.min(siembras,baja(a.seeds,b.seeds)+Math.floor(Math.max(0,num(a.plata)-num(b.plata)))),harvest:Math.min(stat('cosechar'),cosechas),
    chop:tala===null?Math.min(stat('talar'),Math.max(Math.max(0,num(a.tools?.axe)-num(b.tools?.axe)),(num(b.skills?.crafting)-num(a.skills?.crafting)>=5?Math.max(0,num(b.res?.madera)-num(a.res?.madera)):0))):tala,
    mine:Math.min(stat('minar'),Math.max(baja(a.picks?.dur,b.picks?.dur),(num(b.skills?.crafting)-num(a.skills?.crafting)>=10?['piedra','bronce','hierro','oro','diamante','netherita'].reduce((s,k)=>s+Math.min(Math.max(0,num(b.stats?.minar?.[k])-num(a.stats?.minar?.[k])),Math.max(0,num(b.res?.[k])-num(a.res?.[k]))),0):0)))+Math.min(excavados,sube(a.seeds,b.seeds)+sube(a.res,b.res)),
    animal:animales,craft:insumos>0?inventarioNuevo+colas(a.horno,b.horno,'listoAt')+derivados:0,
    cook:insumos>0?colas(a.cooking,b.cooking,'endAt')+colas(a.lombricario,b.lombricario,'listaEn'):0,
    auto:Math.min(Math.max(0,suma((a.godHand?.inv||[]).map(s=>s?.n))-suma((b.godHand?.inv||[]).map(s=>s?.n))),sube(a.res,b.res))};
}
// Misiones diarias: las acciones sólo registran progreso. Cobro explícito y CAS.
const JORNADA_META=200;
const JORNADA_MISIONES=[
 {id:'siembra',tipo:'plant',meta:20,plata:500},
 {id:'cocina',tipo:'platos',meta:30,plata:500},
 {id:'madera',tipo:'chop',meta:10,plata:500},
 {id:'mineria',tipo:'mine',meta:10,plata:500},
 {id:'jornada',tipo:'energia',meta:200,plata:3000}
];
function jornadaLibro(prev,ahora){
 const dia=new Date(ahora).toISOString().slice(0,10),old=prev?.actividadGranja?.jornada;
 if(old?.dia===dia&&old.v===2){const j=JSON.parse(JSON.stringify(old));if(j.cobradas?.cosecha&&!j.cobradas.cocina)j.cobradas.cocina=j.cobradas.cosecha;return j;}
 // El dinero ya recibido hoy cuenta para el límite, pero no regala progreso retroactivo.
 return {v:2,dia,energia:0,plata:old?.dia===dia?Math.min(5000,Math.max(0,num(old.plata))):0,progreso:{},cobradas:{},ops:[]};
}
function jornadaAcreditar(prev,next,acciones,ahora){
 const j=jornadaLibro(prev,ahora);
 for(const k of ['plant','harvest','chop','mine','animal']){
  const n=Math.max(0,Math.floor(num(acciones[k])));
  j.progreso[k]=Math.min(200,Math.max(0,num(j.progreso[k]))+n);
  j.energia=Math.min(200,num(j.energia)+n*ACTIVIDAD_COSTOS[k]);
 }
 j.progreso.platos=Math.min(30,Math.max(0,num(j.progreso.platos))+Math.max(0,num(acciones.platos)));
 next.actividadGranja.jornada=j;
 next.actividadGranja.bonoTotal=Math.max(0,num(prev?.actividadGranja?.bonoTotal));
 return 0;
}
function jornadaOperacion(data,id,dia,ahora,op){
 const d=JSON.parse(JSON.stringify(data)),a=actividadLibro(d),j=jornadaLibro(d,ahora);
 const receipt=(j.ops||[]).find(x=>x.op===op);
 if(receipt)return receipt.id===id&&receipt.dia===dia?{repetido:true,cobro:receipt.cobro}:{error:'Recibo de misión usado para otra solicitud'};
 if(dia!==j.dia)return {error:'El día ha cambiado. Actualiza las misiones diarias'};
 const m=JORNADA_MISIONES.find(x=>x.id===id);if(!m)return {error:'Misión desconocida'};
 if(j.cobradas[id])return {error:'Ya has reclamado esta misión hoy'};
 const progreso=m.tipo==='energia'?num(j.energia):num(j.progreso[m.tipo]);
 if(progreso<m.meta)return {error:'Todavía no has completado esta misión'};
 const cobro=Math.min(m.plata,Math.max(0,5000-num(j.plata)));
 if(!cobro)return {error:'Ya has recibido el máximo diario de 5.000 Plata'};
 j.cobradas[id]=cobro;j.plata+=cobro;j.ops.push({op,id,dia,cobro});
 a.jornada=j;a.bonoTotal+=cobro;d.actividadGranja=a;d.plata=num(d.plata)+cobro;
 return {data:d,cobro};
}
// Sólo platos terminados y recogidos de una cola ya aceptada. No compras ni lombricario.
function platosTerminados(prev,next,ahora){
 if(!prev)return 0;
 const cola=Array.isArray(prev.cooking)?prev.cooking:[],actual=Array.isArray(next.cooking)?next.cooking:[];
 const key=c=>String(c.id)+':'+c.endAt,restantes=new Map();
 for(const c of actual)restantes.set(key(c),(restantes.get(key(c))||0)+1);
 const candidatos={};
 for(const c of cola){const k=key(c),n=restantes.get(k)||0;if(n){restantes.set(k,n-1);continue;}
  if(num(c.endAt)>0&&num(c.endAt)<=ahora)candidatos[c.id]=(candidatos[c.id]||0)+1;
 }
 return Object.keys(candidatos).reduce((s,k)=>s+Math.min(candidatos[k],Math.max(0,num(next.stats?.cocinar?.[k])-num(prev.stats?.cocinar?.[k])),Math.max(0,num(next.dishes?.[k])-num(prev.dishes?.[k]))),0);
}
function actividadActualizar(prev,next,ahora,recibo,premiar=true,desdeServidor=0){
  // Omitir un reloj moderno no convierte el siguiente guardado en un cliente legado.
  if(prev?.nodos)for(const o of premiumMundo(prev).objects){
    const r=prev.nodos[o.key],q=next.nodos?.[o.key];
    if(o.type!=='tree'||!r||!premiumPresente(prev,o))continue;
    const valido=q&&typeof q==='object'&&!Array.isArray(q)&&Number.isFinite(q.readyAt)&&Number.isFinite(q.cdIni)&&
      (r.readyAt>0?q.readyAt>=r.readyAt&&q.readyAt>q.cdIni:q.readyAt>=0&&q.cdIni>=0);
    if(valido)continue;
    if(!next.nodos||typeof next.nodos!=='object'||Array.isArray(next.nodos))next.nodos={};
    next.nodos[o.key]=JSON.parse(JSON.stringify(r));
  }
  const a=actividadLibro(prev),pruebas=prev?actividadEvidencias(prev,next,ahora,desdeServidor):{},pedidos=next.actividadAcciones||{};
  const e=prev?.energiaGranja,at=Math.min(ahora,num(e?.at)||ahora),fin=num(prev?.produccion?.vipHasta);
  const regen=(Math.max(0,Math.min(ahora,fin)-at)*100+Math.max(0,ahora-Math.max(at,fin))*50)/ENERGIA_GRANJA_MS;
  let presupuesto=e&&Number.isFinite(e.actual)?Math.max(0,e.actual+regen-num(next.energiaGranja?.actual)):0,credito=0;const acciones={};
  for(const k of Object.keys(ACTIVIDAD_COSTOS)){
    const anterior=Math.max(0,num(a.registro[k])),pedido=Number.isSafeInteger(pedidos[k])&&pedidos[k]>=0&&pedidos[k]<=1e9?Math.max(anterior,pedidos[k]):anterior;
    const n=Math.min(pedido-anterior,Math.max(0,Math.floor(num(pruebas[k]))),Math.floor((presupuesto+1e-6)/ACTIVIDAD_COSTOS[k]));
    credito+=n*ACTIVIDAD_COSTOS[k];presupuesto-=n*ACTIVIDAD_COSTOS[k];a.registro[k]=pedido;acciones[k]=n;
  }
  acciones.platos=platosTerminados(prev,next,ahora);
  if(recibo)Object.assign(recibo,acciones);
  next.actividadGranja=a;next.actividadAcciones={...a.registro};logrosActualizar(prev,next,acciones);actividadAcreditar(next,credito,ahora);if(premiar)jornadaAcreditar(prev,next,acciones,ahora);return next.actividadGranja;
}
// Documento logros.docx aprobado el 21/10. Metas acumulativas, premios únicos.
const LOGROS_TABLA={papa:[[100,100],[300,400],[1000,2000]],ciruela:[[100,110],[250,330],[1200,2200]],zanahoria:[[100,100],[250,300],[1200,2200]],cebolla:[[100,150],[250,300],[1200,2400]],calabacin:[[100,200],[250,350],[1300,2600]],madera:[[100,100],[200,200],[500,500]],piedra:[[100,100],[250,250],[1000,800]],visitas:[[10,10],[50,50],[100,150],[500,500]]};
function logrosLibro(d){
  if(d?.logrosV2?.v===1)return JSON.parse(JSON.stringify(d.logrosV2));
  const progreso={}; // Sólo siembras históricas verificables; no inventar unidades de madera/piedra ni visitas.
  for(const k of ['papa','ciruela','zanahoria','cebolla','calabacin'])progreso[k]=Math.min(LOGROS_TABLA[k].at(-1)[0],Math.max(0,Math.floor(num(d?.stats?.plantar?.[k]))));
  return {v:1,progreso,cobrados:{},registro:{},visitas:{dia:'',ids:[]},ops:[]};
}
const INFRA_GRANJA = [
 {nivel:5,bono:2,coste:{madera:50,piedra:50,hierro:2}},
 {nivel:10,bono:3,coste:{madera:150,piedra:150,hierro:5}},
 {nivel:15,bono:5,coste:{madera:300,piedra:300,hierro:10}}
];
const INFRA_OPCIONALES = {
 godhand:{plata:50000,res:{}},
 mercado:{plata:50000,res:{madera:100,piedra:100,hierro:5}}
};
const INFRA_TIENDA_GOLDEN = 10;
function infraOperacion(prev,id,op){
 const data=JSON.parse(JSON.stringify(prev)),b=data.infraestructura||{v:1,tienda:false,granja:0,ops:[]};
 if(b.ops.some(x=>x.op===op))return {data,repetido:true};
 if(id==='godhand'||id==='mercado'){
   if(b[id])return {error:'Esta mejora ya está comprada'};
   if(id==='godhand'&&!data.godHand)return {error:'Primero necesitás tener God Hand'};
   const d=INFRA_OPCIONALES[id];
   if(!Number.isFinite(data.plata)||data.plata<d.plata)return {error:'Necesitás '+d.plata+' Plata'};
   for(const [k,q] of Object.entries(d.res))if(num(data.res?.[k])<q)return {error:'Faltan materiales: '+k};
   data.plata-=d.plata;for(const [k,q] of Object.entries(d.res))data.res[k]-=q;b[id]=true;
 }else if(id==='tienda'){
   if(b.tienda)return {error:'La tiendita ya está comprada'};
   if(!Number.isFinite(data.golden)||data.golden<INFRA_TIENDA_GOLDEN)return {error:'Necesitás 10 Golden'};
   data.golden-=INFRA_TIENDA_GOLDEN;b.tienda=true;
 }else if(id==='granja'){
   const d=INFRA_GRANJA[b.granja];if(!d)return {error:'Granja mejorada al máximo'};
   if(num(data.level)<d.nivel)return {error:'Requiere granja nivel '+d.nivel};
   for(const [k,q] of Object.entries(d.coste))if(num(data.res?.[k])<q)return {error:'Faltan materiales: '+k};
   for(const [k,q] of Object.entries(d.coste))data.res[k]-=q;
   b.granja++;
 }else return {error:'Mejora inválida'};
 b.ops.push({op,id});data.infraestructura=b;return {data};
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
  // Proyección pública acotada: nunca entregar el guardado, monedas, inventario o recibos.
  const coord=v=>Number.isFinite(v)?Math.max(-8192,Math.min(8192,v)):0;
  const posiciones=(value,keys)=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([k,v])=>/^\d{1,3}$/.test(k)&&v&&typeof v==='object').slice(0,256).map(([k,v])=>[k,Object.fromEntries(keys.map(p=>[p,coord(v[p])]))]));
  const edificios=['store','horno','cocina','altar','establo','curtiduria','ofrendas'];
  const mapa={espacioV:[1,2,3,4].includes(d.espacioV)?d.espacioV:3,
    layout:posiciones(d.layout,['cx','by']),layoutPlots:posiciones(d.layoutPlots,['col','row']),
    plotsOwned:Math.max(0,Math.min(60,num(d.plotsOwned)||3)),
    built:Object.fromEntries(edificios.map(k=>[k,!!d.built?.[k]])),
    obras:Object.fromEntries(edificios.filter(k=>d.obras?.[k]).map(k=>[k,{col:coord(d.obras[k].col),row:coord(d.obras[k].row)}])),
    treesOpen:(Array.isArray(d.treesOpen)?d.treesOpen:[0]).filter(Number.isSafeInteger).slice(0,128),
    rocksOpen:(Array.isArray(d.rocksOpen)?d.rocksOpen:[0]).filter(Number.isSafeInteger).slice(0,128),
    nodos:Object.keys(d.produccion?.nodos||{}).filter(k=>/^\d{1,3}$/.test(k)&&d.produccion.nodos[k]).slice(0,256),
    premiumNodos:Object.keys(d.produccion?.nodos||{}).filter(k=>premiumRegistro(d,+k)&&premiumPresente(d,premiumMundo(d).objects[+k])).slice(0,9),
    produccionVersion:!!d.produccion,granero:Math.max(0,Math.min(3,num(d.infraestructura?.granja))),
    animales:Object.fromEntries(['alpaca','conejo','toro','jabali'].map(k=>[k,Math.min(100,Array.isArray(d.animals?.[k])?d.animals[k].length:d.animals?.[k]?1:0)])),
    decos:(Array.isArray(d.decos)?d.decos:[]).slice(0,200).filter(v=>v&&['valla','flores','farol','banco','espantapajaros','fuente','estatua','arbolito','espantapajaros_oro','farolito'].includes(v.id)).map(v=>({id:v.id,col:coord(v.col),row:coord(v.row)}))};
  return {id:row.user_id,nombre:String(row.name||'Granjero').slice(0,40),nivel:num(d.level),expansiones:num(d.expansiones),
    mapa,
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
for(let i=86;i<=94;i++)NODOS_CONTRATO.push([i,i<89?'tree':i<92?'rock':'bronce',null,999]);
const PREMIUM_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREMIUM_WORLD = {"tile":42,"buildTypes":["store","horno","cocina","altar","establo","curtiduria","ofrendas"],"versions":{"1":{"cols":15,"rows":15,"expansions":[[-5,0,0,5],[-5,5,0,10],[-5,10,0,15],[-5,15,0,20],[0,15,5,20],[5,15,10,20],[10,15,15,20],[15,15,20,20],[15,10,20,15],[15,5,20,10],[15,0,20,5],[15,-5,20,0],[10,-5,15,0],[5,-5,10,0],[0,-5,5,0],[-5,-5,0,0]],"plots":[[1,2],[2,2],[3,2],[1,3],[2,3],[3,3],[1,4],[2,4],[3,4],[1,5],[2,5],[3,5]],"objects":[{"i":0,"type":"tree","exp":null,"lock":0,"col":10,"base":2,"width":2,"key":"tree:10,2"},{"i":1,"type":"tree","exp":null,"lock":1,"col":12,"base":2,"width":2,"key":"tree:12,2"},{"i":2,"type":"tree","exp":null,"lock":2,"col":10,"base":4,"width":2,"key":"tree:10,4"},{"i":3,"type":"rock","exp":null,"lock":0,"col":10,"base":8,"width":1,"key":"rock:10,8"},{"i":4,"type":"rock","exp":null,"lock":1,"col":12,"base":8,"width":1,"key":"rock:12,8"},{"i":5,"type":"ore","ore":"piedra","exp":null,"lock":null,"col":11,"base":9,"width":1,"key":"ore:11,9"},{"i":6,"type":"ore","ore":"bronce","exp":null,"lock":null,"col":13,"base":9,"width":1,"key":"ore:13,9"},{"i":7,"type":"ore","ore":"oro","exp":null,"lock":null,"col":13,"base":11,"width":1,"key":"ore:13,11"},{"i":8,"type":"ore","ore":"diamante","exp":null,"lock":null,"col":11,"base":13,"width":1,"key":"ore:11,13"},{"i":9,"type":"ore","ore":"netherita","exp":null,"lock":null,"col":13,"base":13,"width":1,"key":"ore:13,13"},{"i":10,"type":"barn","exp":null,"lock":null,"col":5,"base":2,"width":3,"key":"barn:5,2"},{"i":11,"type":"market","exp":null,"lock":null,"col":5,"base":8,"width":2,"key":"market:5,8"},{"i":12,"type":"store","exp":null,"lock":null,"col":5,"base":10,"width":3,"key":"store:5,10"},{"i":13,"type":"tree","exp":null,"lock":3,"col":12,"base":4,"width":2,"key":"tree:12,4"},{"i":14,"type":"tree","exp":null,"lock":4,"col":10,"base":6,"width":2,"key":"tree:10,6"},{"i":15,"type":"rock","exp":null,"lock":2,"col":10,"base":10,"width":1,"key":"rock:10,10"},{"i":16,"type":"rock","exp":null,"lock":3,"col":12,"base":10,"width":1,"key":"rock:12,10"},{"i":17,"type":"cocina","exp":null,"lock":null,"col":5,"base":6,"width":2,"key":"cocina:5,6"},{"i":18,"type":"dummy","exp":null,"lock":null,"col":4,"base":4,"width":1,"key":"dummy:4,4"},{"i":19,"type":"ore","ore":"hierro","exp":null,"lock":null,"col":11,"base":11,"width":1,"key":"ore:11,11"},{"i":20,"type":"buzon","exp":null,"lock":null,"col":8,"base":2,"width":1,"key":"buzon:8,2"},{"i":21,"type":"cofre_diario","exp":null,"lock":null,"col":9,"base":2,"width":1,"key":"cofre_diario:9,2"},{"i":22,"type":"tablon_pedidos","exp":null,"lock":null,"col":4,"base":2,"width":1,"key":"tablon_pedidos:4,2"},{"i":23,"type":"horno","exp":null,"lock":null,"col":8,"base":6,"width":2,"key":"horno:8,6"},{"i":24,"type":"tree","exp":null,"lock":5,"col":12,"base":6,"width":2,"key":"tree:12,6"},{"i":25,"type":"rock","exp":null,"lock":4,"col":10,"base":12,"width":1,"key":"rock:10,12"},{"i":26,"type":"rock","exp":null,"lock":5,"col":12,"base":12,"width":1,"key":"rock:12,12"},{"i":27,"type":"altar","exp":null,"lock":null,"col":8,"base":8,"width":2,"key":"altar:8,8"},{"i":28,"type":"establo","exp":null,"lock":null,"col":1,"base":9,"width":3,"key":"establo:1,9"},{"i":29,"type":"curtiduria","exp":null,"lock":null,"col":8,"base":10,"width":2,"key":"curtiduria:8,10"},{"i":30,"type":"ofrendas","exp":null,"lock":null,"col":6,"base":4,"width":2,"key":"ofrendas:6,4"},{"i":31,"type":"lombricario","exp":null,"lock":null,"col":6,"base":11,"width":1,"key":"lombricario:6,11"},{"i":32,"type":"lonja","exp":null,"lock":null,"col":7,"base":11,"width":2,"key":"lonja:7,11"},{"i":33,"type":"boya","exp":null,"lock":null,"col":5,"base":13,"width":1,"key":"boya:5,13"},{"i":34,"type":"tree","exp":0,"lock":null,"col":-3,"base":3,"width":2,"key":"tree:-3,3"},{"i":35,"type":"rock","exp":0,"lock":null,"col":-4,"base":3,"width":1,"key":"rock:-4,3"},{"i":36,"type":"tree","exp":1,"lock":null,"col":-3,"base":8,"width":2,"key":"tree:-3,8"},{"i":37,"type":"rock","exp":1,"lock":null,"col":-4,"base":8,"width":1,"key":"rock:-4,8"},{"i":38,"type":"tree","exp":2,"lock":null,"col":-3,"base":13,"width":2,"key":"tree:-3,13"},{"i":39,"type":"rock","exp":2,"lock":null,"col":-4,"base":13,"width":1,"key":"rock:-4,13"},{"i":40,"type":"ore","ore":"bronce","exp":2,"lock":null,"col":-3,"base":12,"width":1,"key":"ore:-3,12"},{"i":41,"type":"ore","ore":"oro","exp":2,"lock":null,"col":-3,"base":14,"width":1,"key":"ore:-3,14"},{"i":42,"type":"tree","exp":3,"lock":null,"col":-3,"base":18,"width":2,"key":"tree:-3,18"},{"i":43,"type":"rock","exp":3,"lock":null,"col":-4,"base":18,"width":1,"key":"rock:-4,18"},{"i":44,"type":"tree","exp":4,"lock":null,"col":2,"base":18,"width":2,"key":"tree:2,18"},{"i":45,"type":"rock","exp":4,"lock":null,"col":1,"base":18,"width":1,"key":"rock:1,18"},{"i":46,"type":"tree","exp":5,"lock":null,"col":7,"base":18,"width":2,"key":"tree:7,18"},{"i":47,"type":"rock","exp":5,"lock":null,"col":6,"base":18,"width":1,"key":"rock:6,18"},{"i":48,"type":"ore","ore":"bronce","exp":5,"lock":null,"col":7,"base":17,"width":1,"key":"ore:7,17"},{"i":49,"type":"ore","ore":"oro","exp":5,"lock":null,"col":7,"base":19,"width":1,"key":"ore:7,19"},{"i":50,"type":"tree","exp":6,"lock":null,"col":12,"base":18,"width":2,"key":"tree:12,18"},{"i":51,"type":"rock","exp":6,"lock":null,"col":11,"base":18,"width":1,"key":"rock:11,18"},{"i":52,"type":"tree","exp":7,"lock":null,"col":17,"base":18,"width":2,"key":"tree:17,18"},{"i":53,"type":"rock","exp":7,"lock":null,"col":16,"base":18,"width":1,"key":"rock:16,18"},{"i":54,"type":"ore","ore":"bronce","exp":7,"lock":null,"col":17,"base":19,"width":1,"key":"ore:17,19"},{"i":55,"type":"ore","ore":"oro","exp":7,"lock":null,"col":15,"base":18,"width":1,"key":"ore:15,18"},{"i":56,"type":"tree","exp":8,"lock":null,"col":17,"base":13,"width":2,"key":"tree:17,13"},{"i":57,"type":"rock","exp":8,"lock":null,"col":16,"base":13,"width":1,"key":"rock:16,13"},{"i":58,"type":"tree","exp":9,"lock":null,"col":17,"base":8,"width":2,"key":"tree:17,8"},{"i":59,"type":"rock","exp":9,"lock":null,"col":16,"base":8,"width":1,"key":"rock:16,8"},{"i":60,"type":"ore","ore":"bronce","exp":9,"lock":null,"col":17,"base":9,"width":1,"key":"ore:17,9"},{"i":61,"type":"ore","ore":"oro","exp":9,"lock":null,"col":15,"base":8,"width":1,"key":"ore:15,8"},{"i":62,"type":"tree","exp":10,"lock":null,"col":17,"base":3,"width":2,"key":"tree:17,3"},{"i":63,"type":"rock","exp":10,"lock":null,"col":16,"base":3,"width":1,"key":"rock:16,3"},{"i":64,"type":"ore","ore":"bronce","exp":10,"lock":null,"col":17,"base":4,"width":1,"key":"ore:17,4"},{"i":65,"type":"tree","exp":11,"lock":null,"col":17,"base":-2,"width":2,"key":"tree:17,-2"},{"i":66,"type":"rock","exp":11,"lock":null,"col":16,"base":-2,"width":1,"key":"rock:16,-2"},{"i":67,"type":"ore","ore":"bronce","exp":11,"lock":null,"col":17,"base":-1,"width":1,"key":"ore:17,-1"},{"i":68,"type":"ore","ore":"oro","exp":11,"lock":null,"col":16,"base":-1,"width":1,"key":"ore:16,-1"},{"i":69,"type":"ore","ore":"hierro","exp":11,"lock":null,"col":17,"base":0,"width":1,"key":"ore:17,0"},{"i":70,"type":"tree","exp":12,"lock":null,"col":12,"base":-2,"width":2,"key":"tree:12,-2"},{"i":71,"type":"rock","exp":12,"lock":null,"col":11,"base":-2,"width":1,"key":"rock:11,-2"},{"i":72,"type":"ore","ore":"oro","exp":12,"lock":null,"col":12,"base":-1,"width":1,"key":"ore:12,-1"},{"i":73,"type":"tree","exp":13,"lock":null,"col":7,"base":-2,"width":2,"key":"tree:7,-2"},{"i":74,"type":"rock","exp":13,"lock":null,"col":6,"base":-2,"width":1,"key":"rock:6,-2"},{"i":75,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":7,"base":-1,"width":1,"key":"ore:7,-1"},{"i":76,"type":"ore","ore":"oro","exp":13,"lock":null,"col":6,"base":-1,"width":1,"key":"ore:6,-1"},{"i":77,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":7,"base":0,"width":1,"key":"ore:7,0"},{"i":78,"type":"tree","exp":14,"lock":null,"col":2,"base":-2,"width":2,"key":"tree:2,-2"},{"i":79,"type":"rock","exp":14,"lock":null,"col":1,"base":-2,"width":1,"key":"rock:1,-2"},{"i":80,"type":"ore","ore":"hierro","exp":14,"lock":null,"col":2,"base":-1,"width":1,"key":"ore:2,-1"},{"i":81,"type":"tree","exp":15,"lock":null,"col":-3,"base":-2,"width":2,"key":"tree:-3,-2"},{"i":82,"type":"rock","exp":15,"lock":null,"col":-4,"base":-2,"width":1,"key":"rock:-4,-2"},{"i":83,"type":"ore","ore":"bronce","exp":15,"lock":null,"col":-3,"base":-1,"width":1,"key":"ore:-3,-1"},{"i":84,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-4,"base":-1,"width":1,"key":"ore:-4,-1"},{"i":85,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-3,"base":0,"width":1,"key":"ore:-3,0"},{"i":86,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#86"},{"i":87,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#87"},{"i":88,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#88"},{"i":89,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#89"},{"i":90,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#90"},{"i":91,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#91"},{"i":92,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#92"},{"i":93,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#93"},{"i":94,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#94"}]},"2":{"cols":12,"rows":12,"expansions":[[-4,0,0,4],[-4,4,0,8],[-4,8,0,12],[-4,12,0,16],[0,12,4,16],[4,12,8,16],[8,12,12,16],[12,12,16,16],[12,8,16,12],[12,4,16,8],[12,0,16,4],[12,-4,16,0],[8,-4,12,0],[4,-4,8,0],[0,-4,4,0],[-4,-4,0,0]],"plots":[[1,3],[2,3],[3,3],[1,4],[2,4],[3,4],[1,5],[2,5],[3,5],[1,6],[2,6],[3,6]],"objects":[{"i":0,"type":"tree","exp":null,"lock":0,"col":9,"base":2,"width":2,"key":"tree:9,2"},{"i":1,"type":"tree","exp":null,"lock":1,"col":9,"base":4,"width":2,"key":"tree:9,4#1"},{"i":2,"type":"tree","exp":null,"lock":2,"col":9,"base":6,"width":2,"key":"tree:9,6#2"},{"i":3,"type":"rock","exp":null,"lock":0,"col":9,"base":7,"width":1,"key":"rock:9,7"},{"i":4,"type":"rock","exp":null,"lock":1,"col":10,"base":7,"width":1,"key":"rock:10,7"},{"i":5,"type":"ore","ore":"piedra","exp":null,"lock":null,"col":9,"base":8,"width":1,"key":"ore:9,8"},{"i":6,"type":"ore","ore":"bronce","exp":null,"lock":null,"col":10,"base":8,"width":1,"key":"ore:10,8"},{"i":7,"type":"ore","ore":"oro","exp":null,"lock":null,"col":10,"base":9,"width":1,"key":"ore:10,9"},{"i":8,"type":"ore","ore":"diamante","exp":null,"lock":null,"col":9,"base":10,"width":1,"key":"ore:9,10#8"},{"i":9,"type":"ore","ore":"netherita","exp":null,"lock":null,"col":10,"base":10,"width":1,"key":"ore:10,10"},{"i":10,"type":"barn","exp":null,"lock":null,"col":4,"base":2,"width":3,"key":"barn:4,2"},{"i":11,"type":"market","exp":null,"lock":null,"col":4,"base":6,"width":2,"key":"market:4,6"},{"i":12,"type":"store","exp":null,"lock":null,"col":4,"base":8,"width":3,"key":"store:4,8"},{"i":13,"type":"tree","exp":null,"lock":3,"col":9,"base":4,"width":2,"key":"tree:9,4#13"},{"i":14,"type":"tree","exp":null,"lock":4,"col":9,"base":6,"width":2,"key":"tree:9,6#14"},{"i":15,"type":"rock","exp":null,"lock":2,"col":9,"base":9,"width":1,"key":"rock:9,9"},{"i":16,"type":"rock","exp":null,"lock":3,"col":10,"base":9,"width":1,"key":"rock:10,9"},{"i":17,"type":"cocina","exp":null,"lock":null,"col":4,"base":6,"width":2,"key":"cocina:4,6"},{"i":18,"type":"dummy","exp":null,"lock":null,"col":4,"base":4,"width":1,"key":"dummy:4,4"},{"i":19,"type":"ore","ore":"hierro","exp":null,"lock":null,"col":9,"base":10,"width":1,"key":"ore:9,10#19"},{"i":20,"type":"buzon","exp":null,"lock":null,"col":7,"base":2,"width":1,"key":"buzon:7,2"},{"i":21,"type":"cofre_diario","exp":null,"lock":null,"col":8,"base":2,"width":1,"key":"cofre_diario:8,2"},{"i":22,"type":"tablon_pedidos","exp":null,"lock":null,"col":3,"base":2,"width":1,"key":"tablon_pedidos:3,2"},{"i":23,"type":"horno","exp":null,"lock":null,"col":7,"base":6,"width":2,"key":"horno:7,6"},{"i":24,"type":"tree","exp":null,"lock":5,"col":9,"base":8,"width":2,"key":"tree:9,8"},{"i":25,"type":"rock","exp":null,"lock":4,"col":9,"base":10,"width":1,"key":"rock:9,10"},{"i":26,"type":"rock","exp":null,"lock":5,"col":10,"base":10,"width":1,"key":"rock:10,10"},{"i":27,"type":"altar","exp":null,"lock":null,"col":7,"base":8,"width":2,"key":"altar:7,8"},{"i":28,"type":"establo","exp":null,"lock":null,"col":1,"base":8,"width":3,"key":"establo:1,8"},{"i":29,"type":"curtiduria","exp":null,"lock":null,"col":7,"base":8,"width":2,"key":"curtiduria:7,8"},{"i":30,"type":"ofrendas","exp":null,"lock":null,"col":5,"base":4,"width":2,"key":"ofrendas:5,4"},{"i":31,"type":"lombricario","exp":null,"lock":null,"col":5,"base":10,"width":1,"key":"lombricario:5,10"},{"i":32,"type":"lonja","exp":null,"lock":null,"col":6,"base":10,"width":2,"key":"lonja:6,10"},{"i":33,"type":"boya","exp":null,"lock":null,"col":5,"base":11,"width":1,"key":"boya:5,11"},{"i":34,"type":"tree","exp":0,"lock":null,"col":-3,"base":2,"width":2,"key":"tree:-3,2"},{"i":35,"type":"rock","exp":0,"lock":null,"col":-3,"base":3,"width":1,"key":"rock:-3,3"},{"i":36,"type":"tree","exp":1,"lock":null,"col":-3,"base":6,"width":2,"key":"tree:-3,6"},{"i":37,"type":"rock","exp":1,"lock":null,"col":-3,"base":7,"width":1,"key":"rock:-3,7"},{"i":38,"type":"tree","exp":2,"lock":null,"col":-3,"base":10,"width":2,"key":"tree:-3,10"},{"i":39,"type":"rock","exp":2,"lock":null,"col":-3,"base":11,"width":1,"key":"rock:-3,11"},{"i":40,"type":"ore","ore":"bronce","exp":2,"lock":null,"col":-2,"base":11,"width":1,"key":"ore:-2,11"},{"i":41,"type":"ore","ore":"oro","exp":2,"lock":null,"col":-3,"base":9,"width":1,"key":"ore:-3,9"},{"i":42,"type":"tree","exp":3,"lock":null,"col":-3,"base":14,"width":2,"key":"tree:-3,14"},{"i":43,"type":"rock","exp":3,"lock":null,"col":-3,"base":15,"width":1,"key":"rock:-3,15"},{"i":44,"type":"tree","exp":4,"lock":null,"col":1,"base":14,"width":2,"key":"tree:1,14"},{"i":45,"type":"rock","exp":4,"lock":null,"col":1,"base":15,"width":1,"key":"rock:1,15"},{"i":46,"type":"tree","exp":5,"lock":null,"col":5,"base":14,"width":2,"key":"tree:5,14"},{"i":47,"type":"rock","exp":5,"lock":null,"col":5,"base":15,"width":1,"key":"rock:5,15"},{"i":48,"type":"ore","ore":"bronce","exp":5,"lock":null,"col":6,"base":15,"width":1,"key":"ore:6,15"},{"i":49,"type":"ore","ore":"oro","exp":5,"lock":null,"col":4,"base":14,"width":1,"key":"ore:4,14"},{"i":50,"type":"tree","exp":6,"lock":null,"col":9,"base":14,"width":2,"key":"tree:9,14"},{"i":51,"type":"rock","exp":6,"lock":null,"col":9,"base":15,"width":1,"key":"rock:9,15"},{"i":52,"type":"tree","exp":7,"lock":null,"col":13,"base":14,"width":2,"key":"tree:13,14"},{"i":53,"type":"rock","exp":7,"lock":null,"col":13,"base":15,"width":1,"key":"rock:13,15"},{"i":54,"type":"ore","ore":"bronce","exp":7,"lock":null,"col":14,"base":15,"width":1,"key":"ore:14,15"},{"i":55,"type":"ore","ore":"oro","exp":7,"lock":null,"col":12,"base":14,"width":1,"key":"ore:12,14"},{"i":56,"type":"tree","exp":8,"lock":null,"col":13,"base":10,"width":2,"key":"tree:13,10"},{"i":57,"type":"rock","exp":8,"lock":null,"col":13,"base":11,"width":1,"key":"rock:13,11"},{"i":58,"type":"tree","exp":9,"lock":null,"col":13,"base":6,"width":2,"key":"tree:13,6"},{"i":59,"type":"rock","exp":9,"lock":null,"col":13,"base":7,"width":1,"key":"rock:13,7"},{"i":60,"type":"ore","ore":"bronce","exp":9,"lock":null,"col":14,"base":7,"width":1,"key":"ore:14,7"},{"i":61,"type":"ore","ore":"oro","exp":9,"lock":null,"col":12,"base":6,"width":1,"key":"ore:12,6"},{"i":62,"type":"tree","exp":10,"lock":null,"col":13,"base":2,"width":2,"key":"tree:13,2"},{"i":63,"type":"rock","exp":10,"lock":null,"col":13,"base":3,"width":1,"key":"rock:13,3"},{"i":64,"type":"ore","ore":"bronce","exp":10,"lock":null,"col":14,"base":3,"width":1,"key":"ore:14,3"},{"i":65,"type":"tree","exp":11,"lock":null,"col":13,"base":-2,"width":2,"key":"tree:13,-2"},{"i":66,"type":"rock","exp":11,"lock":null,"col":13,"base":-1,"width":1,"key":"rock:13,-1"},{"i":67,"type":"ore","ore":"bronce","exp":11,"lock":null,"col":14,"base":-1,"width":1,"key":"ore:14,-1"},{"i":68,"type":"ore","ore":"oro","exp":11,"lock":null,"col":13,"base":0,"width":1,"key":"ore:13,0"},{"i":69,"type":"ore","ore":"hierro","exp":11,"lock":null,"col":14,"base":0,"width":1,"key":"ore:14,0"},{"i":70,"type":"tree","exp":12,"lock":null,"col":9,"base":-2,"width":2,"key":"tree:9,-2"},{"i":71,"type":"rock","exp":12,"lock":null,"col":9,"base":-1,"width":1,"key":"rock:9,-1"},{"i":72,"type":"ore","ore":"oro","exp":12,"lock":null,"col":10,"base":-1,"width":1,"key":"ore:10,-1"},{"i":73,"type":"tree","exp":13,"lock":null,"col":5,"base":-2,"width":2,"key":"tree:5,-2"},{"i":74,"type":"rock","exp":13,"lock":null,"col":5,"base":-1,"width":1,"key":"rock:5,-1"},{"i":75,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":6,"base":-1,"width":1,"key":"ore:6,-1"},{"i":76,"type":"ore","ore":"oro","exp":13,"lock":null,"col":5,"base":0,"width":1,"key":"ore:5,0"},{"i":77,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":6,"base":0,"width":1,"key":"ore:6,0"},{"i":78,"type":"tree","exp":14,"lock":null,"col":1,"base":-2,"width":2,"key":"tree:1,-2"},{"i":79,"type":"rock","exp":14,"lock":null,"col":1,"base":-1,"width":1,"key":"rock:1,-1"},{"i":80,"type":"ore","ore":"hierro","exp":14,"lock":null,"col":2,"base":-1,"width":1,"key":"ore:2,-1"},{"i":81,"type":"tree","exp":15,"lock":null,"col":-3,"base":-2,"width":2,"key":"tree:-3,-2"},{"i":82,"type":"rock","exp":15,"lock":null,"col":-3,"base":-1,"width":1,"key":"rock:-3,-1"},{"i":83,"type":"ore","ore":"bronce","exp":15,"lock":null,"col":-2,"base":-1,"width":1,"key":"ore:-2,-1"},{"i":84,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-3,"base":0,"width":1,"key":"ore:-3,0"},{"i":85,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-2,"base":0,"width":1,"key":"ore:-2,0"},{"i":86,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#86"},{"i":87,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#87"},{"i":88,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#88"},{"i":89,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#89"},{"i":90,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#90"},{"i":91,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#91"},{"i":92,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#92"},{"i":93,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#93"},{"i":94,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#94"}]},"3":{"cols":9,"rows":9,"expansions":[[-4,0,0,3],[-4,3,0,6],[-4,6,0,9],[-4,9,0,13],[0,9,3,13],[3,9,6,13],[6,9,9,13],[9,9,13,13],[9,6,13,9],[9,3,13,6],[9,0,13,3],[9,-4,13,0],[6,-4,9,0],[3,-4,6,0],[0,-4,3,0],[-4,-4,0,0]],"plots":[[1,3],[2,3],[3,3],[1,4],[2,4],[3,4],[1,2],[6,4],[7,4],[5,5],[6,5],[5,6]],"objects":[{"i":0,"type":"tree","exp":null,"lock":0,"col":6,"base":4,"width":2,"key":"tree:6,4#0"},{"i":1,"type":"tree","exp":null,"lock":1,"col":6,"base":4,"width":2,"key":"tree:6,4#1"},{"i":2,"type":"tree","exp":null,"lock":2,"col":6,"base":6,"width":2,"key":"tree:6,6#2"},{"i":3,"type":"rock","exp":null,"lock":0,"col":7,"base":5,"width":1,"key":"rock:7,5"},{"i":4,"type":"rock","exp":null,"lock":1,"col":7,"base":7,"width":1,"key":"rock:7,7"},{"i":5,"type":"ore","ore":"piedra","exp":null,"lock":null,"col":7,"base":8,"width":1,"key":"ore:7,8#5"},{"i":6,"type":"ore","ore":"bronce","exp":null,"lock":null,"col":7,"base":8,"width":1,"key":"ore:7,8#6"},{"i":7,"type":"ore","ore":"oro","exp":null,"lock":null,"col":7,"base":8,"width":1,"key":"ore:7,8#7"},{"i":8,"type":"ore","ore":"diamante","exp":null,"lock":null,"col":7,"base":8,"width":1,"key":"ore:7,8#8"},{"i":9,"type":"ore","ore":"netherita","exp":null,"lock":null,"col":7,"base":8,"width":1,"key":"ore:7,8#9"},{"i":10,"type":"barn","exp":null,"lock":null,"col":3,"base":2,"width":3,"key":"barn:3,2"},{"i":11,"type":"market","exp":null,"lock":null,"col":4,"base":4,"width":2,"key":"market:4,4"},{"i":12,"type":"store","exp":null,"lock":null,"col":4,"base":8,"width":3,"key":"store:4,8"},{"i":13,"type":"tree","exp":null,"lock":3,"col":6,"base":4,"width":2,"key":"tree:6,4#13"},{"i":14,"type":"tree","exp":null,"lock":4,"col":6,"base":6,"width":2,"key":"tree:6,6#14"},{"i":15,"type":"rock","exp":null,"lock":2,"col":7,"base":8,"width":1,"key":"rock:7,8#15"},{"i":16,"type":"rock","exp":null,"lock":3,"col":7,"base":8,"width":1,"key":"rock:7,8#16"},{"i":17,"type":"cocina","exp":null,"lock":null,"col":4,"base":6,"width":2,"key":"cocina:4,6"},{"i":18,"type":"dummy","exp":null,"lock":null,"col":4,"base":5,"width":1,"key":"dummy:4,5"},{"i":19,"type":"ore","ore":"hierro","exp":null,"lock":null,"col":7,"base":8,"width":1,"key":"ore:7,8#19"},{"i":20,"type":"buzon","exp":null,"lock":null,"col":6,"base":2,"width":1,"key":"buzon:6,2"},{"i":21,"type":"cofre_diario","exp":null,"lock":null,"col":7,"base":2,"width":1,"key":"cofre_diario:7,2"},{"i":22,"type":"tablon_pedidos","exp":null,"lock":null,"col":2,"base":2,"width":1,"key":"tablon_pedidos:2,2"},{"i":23,"type":"horno","exp":null,"lock":null,"col":6,"base":6,"width":2,"key":"horno:6,6"},{"i":24,"type":"tree","exp":null,"lock":5,"col":6,"base":8,"width":2,"key":"tree:6,8"},{"i":25,"type":"rock","exp":null,"lock":4,"col":7,"base":8,"width":1,"key":"rock:7,8#25"},{"i":26,"type":"rock","exp":null,"lock":5,"col":7,"base":8,"width":1,"key":"rock:7,8#26"},{"i":27,"type":"altar","exp":null,"lock":null,"col":6,"base":8,"width":2,"key":"altar:6,8"},{"i":28,"type":"establo","exp":null,"lock":null,"col":1,"base":8,"width":3,"key":"establo:1,8"},{"i":29,"type":"curtiduria","exp":null,"lock":null,"col":6,"base":8,"width":2,"key":"curtiduria:6,8"},{"i":30,"type":"ofrendas","exp":null,"lock":null,"col":5,"base":4,"width":2,"key":"ofrendas:5,4"},{"i":31,"type":"lombricario","exp":null,"lock":null,"col":5,"base":7,"width":1,"key":"lombricario:5,7"},{"i":32,"type":"lonja","exp":null,"lock":null,"col":6,"base":7,"width":2,"key":"lonja:6,7"},{"i":33,"type":"boya","exp":null,"lock":null,"col":5,"base":8,"width":1,"key":"boya:5,8"},{"i":34,"type":"tree","exp":0,"lock":null,"col":-3,"base":2,"width":2,"key":"tree:-3,2"},{"i":35,"type":"rock","exp":0,"lock":null,"col":-1,"base":2,"width":1,"key":"rock:-1,2"},{"i":36,"type":"tree","exp":1,"lock":null,"col":-3,"base":5,"width":2,"key":"tree:-3,5"},{"i":37,"type":"rock","exp":1,"lock":null,"col":-3,"base":4,"width":1,"key":"rock:-3,4"},{"i":38,"type":"tree","exp":2,"lock":null,"col":-3,"base":8,"width":2,"key":"tree:-3,8"},{"i":39,"type":"rock","exp":2,"lock":null,"col":-3,"base":7,"width":1,"key":"rock:-3,7"},{"i":40,"type":"ore","ore":"bronce","exp":2,"lock":null,"col":-2,"base":7,"width":1,"key":"ore:-2,7"},{"i":41,"type":"ore","ore":"oro","exp":2,"lock":null,"col":-1,"base":8,"width":1,"key":"ore:-1,8"},{"i":42,"type":"tree","exp":3,"lock":null,"col":-3,"base":11,"width":2,"key":"tree:-3,11"},{"i":43,"type":"rock","exp":3,"lock":null,"col":-3,"base":12,"width":1,"key":"rock:-3,12"},{"i":44,"type":"tree","exp":4,"lock":null,"col":0,"base":11,"width":2,"key":"tree:0,11"},{"i":45,"type":"rock","exp":4,"lock":null,"col":1,"base":12,"width":1,"key":"rock:1,12"},{"i":46,"type":"tree","exp":5,"lock":null,"col":3,"base":11,"width":2,"key":"tree:3,11"},{"i":47,"type":"rock","exp":5,"lock":null,"col":4,"base":12,"width":1,"key":"rock:4,12"},{"i":48,"type":"ore","ore":"bronce","exp":5,"lock":null,"col":3,"base":12,"width":1,"key":"ore:3,12"},{"i":49,"type":"ore","ore":"oro","exp":5,"lock":null,"col":4,"base":10,"width":1,"key":"ore:4,10"},{"i":50,"type":"tree","exp":6,"lock":null,"col":6,"base":11,"width":2,"key":"tree:6,11"},{"i":51,"type":"rock","exp":6,"lock":null,"col":7,"base":12,"width":1,"key":"rock:7,12"},{"i":52,"type":"tree","exp":7,"lock":null,"col":10,"base":11,"width":2,"key":"tree:10,11"},{"i":53,"type":"rock","exp":7,"lock":null,"col":10,"base":12,"width":1,"key":"rock:10,12"},{"i":54,"type":"ore","ore":"bronce","exp":7,"lock":null,"col":11,"base":12,"width":1,"key":"ore:11,12"},{"i":55,"type":"ore","ore":"oro","exp":7,"lock":null,"col":9,"base":11,"width":1,"key":"ore:9,11"},{"i":56,"type":"tree","exp":8,"lock":null,"col":10,"base":8,"width":2,"key":"tree:10,8"},{"i":57,"type":"rock","exp":8,"lock":null,"col":9,"base":8,"width":1,"key":"rock:9,8"},{"i":58,"type":"tree","exp":9,"lock":null,"col":10,"base":5,"width":2,"key":"tree:10,5"},{"i":59,"type":"rock","exp":9,"lock":null,"col":9,"base":5,"width":1,"key":"rock:9,5"},{"i":60,"type":"ore","ore":"bronce","exp":9,"lock":null,"col":10,"base":6,"width":1,"key":"ore:10,6"},{"i":61,"type":"ore","ore":"oro","exp":9,"lock":null,"col":11,"base":6,"width":1,"key":"ore:11,6"},{"i":62,"type":"tree","exp":10,"lock":null,"col":10,"base":2,"width":2,"key":"tree:10,2"},{"i":63,"type":"rock","exp":10,"lock":null,"col":9,"base":2,"width":1,"key":"rock:9,2"},{"i":64,"type":"ore","ore":"bronce","exp":10,"lock":null,"col":10,"base":3,"width":1,"key":"ore:10,3"},{"i":65,"type":"tree","exp":11,"lock":null,"col":10,"base":-2,"width":2,"key":"tree:10,-2"},{"i":66,"type":"rock","exp":11,"lock":null,"col":10,"base":-1,"width":1,"key":"rock:10,-1"},{"i":67,"type":"ore","ore":"bronce","exp":11,"lock":null,"col":11,"base":-1,"width":1,"key":"ore:11,-1"},{"i":68,"type":"ore","ore":"oro","exp":11,"lock":null,"col":10,"base":0,"width":1,"key":"ore:10,0"},{"i":69,"type":"ore","ore":"hierro","exp":11,"lock":null,"col":11,"base":0,"width":1,"key":"ore:11,0"},{"i":70,"type":"tree","exp":12,"lock":null,"col":7,"base":-2,"width":2,"key":"tree:7,-2"},{"i":71,"type":"rock","exp":12,"lock":null,"col":7,"base":-1,"width":1,"key":"rock:7,-1"},{"i":72,"type":"ore","ore":"oro","exp":12,"lock":null,"col":7,"base":0,"width":1,"key":"ore:7,0"},{"i":73,"type":"tree","exp":13,"lock":null,"col":4,"base":-2,"width":2,"key":"tree:4,-2"},{"i":74,"type":"rock","exp":13,"lock":null,"col":4,"base":-1,"width":1,"key":"rock:4,-1"},{"i":75,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":4,"base":0,"width":1,"key":"ore:4,0"},{"i":76,"type":"ore","ore":"oro","exp":13,"lock":null,"col":5,"base":-1,"width":1,"key":"ore:5,-1"},{"i":77,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":5,"base":0,"width":1,"key":"ore:5,0"},{"i":78,"type":"tree","exp":14,"lock":null,"col":1,"base":-2,"width":2,"key":"tree:1,-2"},{"i":79,"type":"rock","exp":14,"lock":null,"col":1,"base":-1,"width":1,"key":"rock:1,-1"},{"i":80,"type":"ore","ore":"hierro","exp":14,"lock":null,"col":1,"base":0,"width":1,"key":"ore:1,0"},{"i":81,"type":"tree","exp":15,"lock":null,"col":-3,"base":-2,"width":2,"key":"tree:-3,-2"},{"i":82,"type":"rock","exp":15,"lock":null,"col":-3,"base":-1,"width":1,"key":"rock:-3,-1"},{"i":83,"type":"ore","ore":"bronce","exp":15,"lock":null,"col":-2,"base":-1,"width":1,"key":"ore:-2,-1"},{"i":84,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-3,"base":0,"width":1,"key":"ore:-3,0"},{"i":85,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-2,"base":0,"width":1,"key":"ore:-2,0"},{"i":86,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#86"},{"i":87,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#87"},{"i":88,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#88"},{"i":89,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#89"},{"i":90,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#90"},{"i":91,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#91"},{"i":92,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#92"},{"i":93,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#93"},{"i":94,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#94"}]},"4":{"cols":6,"rows":6,"expansions":[[-4,0,0,3],[-4,3,0,5],[-4,5,0,6],[-4,6,0,10],[0,6,3,10],[3,6,5,10],[5,6,6,10],[6,6,10,10],[6,5,10,6],[6,3,10,5],[6,0,10,3],[6,-4,10,0],[5,-4,6,0],[3,-4,5,0],[0,-4,3,0],[-4,-4,0,0]],"plots":[[1,4],[2,4],[3,4],[-2,1],[-1,1],[-2,2],[-1,2],[-2,3],[-1,3],[-2,4],[-1,4],[-2,5]],"objects":[{"i":0,"type":"tree","exp":null,"lock":0,"col":1,"base":3,"width":2,"key":"tree:1,3"},{"i":1,"type":"tree","exp":null,"lock":1,"col":-3,"base":2,"width":2,"key":"tree:-3,2#1"},{"i":2,"type":"tree","exp":null,"lock":2,"col":-1,"base":2,"width":2,"key":"tree:-1,2"},{"i":3,"type":"rock","exp":null,"lock":0,"col":3,"base":3,"width":1,"key":"rock:3,3"},{"i":4,"type":"rock","exp":null,"lock":1,"col":-3,"base":2,"width":1,"key":"rock:-3,2"},{"i":5,"type":"ore","ore":"piedra","exp":null,"lock":null,"col":-3,"base":2,"width":1,"key":"ore:-3,2"},{"i":6,"type":"ore","ore":"bronce","exp":null,"lock":null,"col":-2,"base":2,"width":1,"key":"ore:-2,2"},{"i":7,"type":"ore","ore":"oro","exp":null,"lock":null,"col":0,"base":2,"width":1,"key":"ore:0,2"},{"i":8,"type":"ore","ore":"diamante","exp":null,"lock":null,"col":-3,"base":3,"width":1,"key":"ore:-3,3"},{"i":9,"type":"ore","ore":"netherita","exp":null,"lock":null,"col":-2,"base":3,"width":1,"key":"ore:-2,3"},{"i":10,"type":"barn","exp":null,"lock":null,"col":1,"base":2,"width":3,"key":"barn:1,2"},{"i":11,"type":"market","exp":null,"lock":null,"col":1,"base":4,"width":2,"key":"market:1,4"},{"i":12,"type":"store","exp":null,"lock":null,"col":1,"base":2,"width":3,"key":"store:1,2"},{"i":13,"type":"tree","exp":null,"lock":3,"col":-3,"base":4,"width":2,"key":"tree:-3,4#13"},{"i":14,"type":"tree","exp":null,"lock":4,"col":-1,"base":4,"width":2,"key":"tree:-1,4"},{"i":15,"type":"rock","exp":null,"lock":2,"col":1,"base":2,"width":1,"key":"rock:1,2#15"},{"i":16,"type":"rock","exp":null,"lock":3,"col":1,"base":2,"width":1,"key":"rock:1,2#16"},{"i":17,"type":"cocina","exp":null,"lock":null,"col":1,"base":2,"width":2,"key":"cocina:1,2"},{"i":18,"type":"dummy","exp":null,"lock":null,"col":3,"base":4,"width":1,"key":"dummy:3,4"},{"i":19,"type":"ore","ore":"hierro","exp":null,"lock":null,"col":-1,"base":2,"width":1,"key":"ore:-1,2"},{"i":20,"type":"buzon","exp":null,"lock":null,"col":4,"base":3,"width":1,"key":"buzon:4,3"},{"i":21,"type":"cofre_diario","exp":null,"lock":null,"col":4,"base":2,"width":1,"key":"cofre_diario:4,2"},{"i":22,"type":"tablon_pedidos","exp":null,"lock":null,"col":4,"base":4,"width":1,"key":"tablon_pedidos:4,4"},{"i":23,"type":"horno","exp":null,"lock":null,"col":1,"base":2,"width":2,"key":"horno:1,2"},{"i":24,"type":"tree","exp":null,"lock":5,"col":-3,"base":6,"width":2,"key":"tree:-3,6"},{"i":25,"type":"rock","exp":null,"lock":4,"col":1,"base":2,"width":1,"key":"rock:1,2#25"},{"i":26,"type":"rock","exp":null,"lock":5,"col":1,"base":2,"width":1,"key":"rock:1,2#26"},{"i":27,"type":"altar","exp":null,"lock":null,"col":1,"base":2,"width":2,"key":"altar:1,2"},{"i":28,"type":"establo","exp":null,"lock":null,"col":1,"base":2,"width":3,"key":"establo:1,2"},{"i":29,"type":"curtiduria","exp":null,"lock":null,"col":1,"base":2,"width":2,"key":"curtiduria:1,2"},{"i":30,"type":"ofrendas","exp":null,"lock":null,"col":1,"base":2,"width":2,"key":"ofrendas:1,2"},{"i":31,"type":"lombricario","exp":null,"lock":null,"col":1,"base":2,"width":1,"key":"lombricario:1,2"},{"i":32,"type":"lonja","exp":null,"lock":null,"col":1,"base":2,"width":2,"key":"lonja:1,2"},{"i":33,"type":"boya","exp":null,"lock":null,"col":1,"base":2,"width":1,"key":"boya:1,2"},{"i":34,"type":"tree","exp":0,"lock":null,"col":-3,"base":2,"width":2,"key":"tree:-3,2#34"},{"i":35,"type":"rock","exp":0,"lock":null,"col":-1,"base":2,"width":1,"key":"rock:-1,2"},{"i":36,"type":"tree","exp":1,"lock":null,"col":-3,"base":4,"width":2,"key":"tree:-3,4#36"},{"i":37,"type":"rock","exp":1,"lock":null,"col":-1,"base":4,"width":1,"key":"rock:-1,4"},{"i":38,"type":"tree","exp":2,"lock":null,"col":-3,"base":5,"width":2,"key":"tree:-3,5"},{"i":39,"type":"rock","exp":2,"lock":null,"col":-3,"base":4,"width":1,"key":"rock:-3,4"},{"i":40,"type":"ore","ore":"bronce","exp":2,"lock":null,"col":-2,"base":4,"width":1,"key":"ore:-2,4"},{"i":41,"type":"ore","ore":"oro","exp":2,"lock":null,"col":-1,"base":5,"width":1,"key":"ore:-1,5"},{"i":42,"type":"tree","exp":3,"lock":null,"col":-3,"base":8,"width":2,"key":"tree:-3,8"},{"i":43,"type":"rock","exp":3,"lock":null,"col":-3,"base":9,"width":1,"key":"rock:-3,9"},{"i":44,"type":"tree","exp":4,"lock":null,"col":0,"base":8,"width":2,"key":"tree:0,8"},{"i":45,"type":"rock","exp":4,"lock":null,"col":1,"base":9,"width":1,"key":"rock:1,9"},{"i":46,"type":"tree","exp":5,"lock":null,"col":3,"base":8,"width":2,"key":"tree:3,8#46"},{"i":47,"type":"rock","exp":5,"lock":null,"col":3,"base":9,"width":1,"key":"rock:3,9"},{"i":48,"type":"ore","ore":"bronce","exp":5,"lock":null,"col":3,"base":7,"width":1,"key":"ore:3,7"},{"i":49,"type":"ore","ore":"oro","exp":5,"lock":null,"col":3,"base":8,"width":1,"key":"ore:3,8"},{"i":50,"type":"tree","exp":6,"lock":null,"col":3,"base":8,"width":2,"key":"tree:3,8#50"},{"i":51,"type":"rock","exp":6,"lock":null,"col":4,"base":9,"width":1,"key":"rock:4,9"},{"i":52,"type":"tree","exp":7,"lock":null,"col":7,"base":8,"width":2,"key":"tree:7,8"},{"i":53,"type":"rock","exp":7,"lock":null,"col":7,"base":9,"width":1,"key":"rock:7,9"},{"i":54,"type":"ore","ore":"bronce","exp":7,"lock":null,"col":8,"base":9,"width":1,"key":"ore:8,9"},{"i":55,"type":"ore","ore":"oro","exp":7,"lock":null,"col":6,"base":8,"width":1,"key":"ore:6,8"},{"i":56,"type":"tree","exp":8,"lock":null,"col":7,"base":7,"width":2,"key":"tree:7,7"},{"i":57,"type":"rock","exp":8,"lock":null,"col":5,"base":6,"width":1,"key":"rock:5,6"},{"i":58,"type":"tree","exp":9,"lock":null,"col":7,"base":5,"width":2,"key":"tree:7,5"},{"i":59,"type":"rock","exp":9,"lock":null,"col":6,"base":5,"width":1,"key":"rock:6,5"},{"i":60,"type":"ore","ore":"bronce","exp":9,"lock":null,"col":7,"base":5,"width":1,"key":"ore:7,5#60"},{"i":61,"type":"ore","ore":"oro","exp":9,"lock":null,"col":7,"base":5,"width":1,"key":"ore:7,5#61"},{"i":62,"type":"tree","exp":10,"lock":null,"col":7,"base":2,"width":2,"key":"tree:7,2"},{"i":63,"type":"rock","exp":10,"lock":null,"col":6,"base":2,"width":1,"key":"rock:6,2"},{"i":64,"type":"ore","ore":"bronce","exp":10,"lock":null,"col":7,"base":3,"width":1,"key":"ore:7,3"},{"i":65,"type":"tree","exp":11,"lock":null,"col":7,"base":-2,"width":2,"key":"tree:7,-2"},{"i":66,"type":"rock","exp":11,"lock":null,"col":7,"base":-1,"width":1,"key":"rock:7,-1"},{"i":67,"type":"ore","ore":"bronce","exp":11,"lock":null,"col":8,"base":-1,"width":1,"key":"ore:8,-1"},{"i":68,"type":"ore","ore":"oro","exp":11,"lock":null,"col":7,"base":0,"width":1,"key":"ore:7,0"},{"i":69,"type":"ore","ore":"hierro","exp":11,"lock":null,"col":8,"base":0,"width":1,"key":"ore:8,0"},{"i":70,"type":"tree","exp":12,"lock":null,"col":6,"base":-2,"width":2,"key":"tree:6,-2"},{"i":71,"type":"rock","exp":12,"lock":null,"col":6,"base":-1,"width":1,"key":"rock:6,-1"},{"i":72,"type":"ore","ore":"oro","exp":12,"lock":null,"col":5,"base":1,"width":1,"key":"ore:5,1"},{"i":73,"type":"tree","exp":13,"lock":null,"col":4,"base":-2,"width":2,"key":"tree:4,-2"},{"i":74,"type":"rock","exp":13,"lock":null,"col":4,"base":-1,"width":1,"key":"rock:4,-1"},{"i":75,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":4,"base":0,"width":1,"key":"ore:4,0"},{"i":76,"type":"ore","ore":"oro","exp":13,"lock":null,"col":4,"base":-2,"width":1,"key":"ore:4,-2#76"},{"i":77,"type":"ore","ore":"bronce","exp":13,"lock":null,"col":4,"base":-2,"width":1,"key":"ore:4,-2#77"},{"i":78,"type":"tree","exp":14,"lock":null,"col":1,"base":-2,"width":2,"key":"tree:1,-2"},{"i":79,"type":"rock","exp":14,"lock":null,"col":1,"base":-1,"width":1,"key":"rock:1,-1"},{"i":80,"type":"ore","ore":"hierro","exp":14,"lock":null,"col":1,"base":0,"width":1,"key":"ore:1,0"},{"i":81,"type":"tree","exp":15,"lock":null,"col":-3,"base":-2,"width":2,"key":"tree:-3,-2"},{"i":82,"type":"rock","exp":15,"lock":null,"col":-3,"base":-1,"width":1,"key":"rock:-3,-1"},{"i":83,"type":"ore","ore":"bronce","exp":15,"lock":null,"col":-2,"base":-1,"width":1,"key":"ore:-2,-1"},{"i":84,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-3,"base":0,"width":1,"key":"ore:-3,0"},{"i":85,"type":"ore","ore":"oro","exp":15,"lock":null,"col":-2,"base":0,"width":1,"key":"ore:-2,0"},{"i":86,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#86"},{"i":87,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#87"},{"i":88,"type":"tree","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":2,"key":"tree:0,1#88"},{"i":89,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#89"},{"i":90,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#90"},{"i":91,"type":"rock","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"rock:0,1#91"},{"i":92,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#92"},{"i":93,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#93"},{"i":94,"type":"ore","ore":"bronce","premiumOnly":true,"exp":999,"lock":null,"col":0,"base":1,"width":1,"key":"ore:0,1#94"}]}}};
/* BEGIN PREMIUM GEOMETRY — el mismo bloque JS se inserta en guardar y se contrasta
   con config.js. No usa reloj, escena, DOM ni valores de geometría del navegador. */
function premiumMundo(d     )      {
 let v=d.espacioV;
 if(![1,2,3,4].includes(v))v=(d.expansiones||0)>0||(d.plotsOwned||3)>3||Object.keys(d.layout||{}).length||Object.keys(d.layoutPlots||{}).length||d.layoutPond||Object.keys(d.obras||{}).length||Object.values(d.built||{}).some(Boolean)||(d.decos||[]).length||(d.chests||[]).length||Object.keys(d.produccion?.nodos||{}).length||(d.treesOpen||[]).length>1||(d.rocksOpen||[]).length>1?1:2;
 return PREMIUM_WORLD.versions[v];
}
function premiumTipo(o     )         {return o?.type==='ore'?o.ore:o?.type;}
function premiumTerreno(d     )              {
 const w=premiumMundo(d),m=new Set        ();
 for(let c=0;c<w.cols;c++)for(let r=0;r<w.rows;r++)m.add(c+','+r);
 for(const [c0,r0,c1,r1] of w.expansions.slice(0,Math.max(0,Math.min(16,d.expansiones||0))))for(let c=c0;c<c1;c++)for(let r=r0;r<r1;r++)m.add(c+','+r);
 return m;
}
function premiumPie(d     ,o     ,lp     )          {
 if(!lp||!Number.isFinite(lp.cx)||!Number.isFinite(lp.by))return false;
 const T=PREMIUM_WORLD.tile,col=lp.cx/T-o.width/2,row=lp.by/T-1,m=premiumTerreno(d);
 if(!Number.isInteger(col)||!Number.isInteger(row))return false;
 for(let c=col;c<col+o.width;c++)for(const [x,y] of [[c,row],[c-1,row],[c+1,row],[c,row-1],[c,row+1]])if(!m.has(x+','+y))return false;
 return true;
}
function premiumRegistro(d     ,i        )      {
 const o=premiumMundo(d).objects[i];
 return o?.premiumOnly&&(d.produccion?.premium?.compras||[]).find((x     )=>x&&typeof x.id==='string'&&PREMIUM_UUID.test(x.id)&&x.nodo===i&&x.tipo===premiumTipo(o));
}
function premiumPresente(d     ,o     )          {
 if(['altar','ofrendas','lombricario','lonja','boya','fish'].includes(o.type))return false;
 if(o.premiumOnly)return !!premiumRegistro(d,o.i)&&!!d.produccion?.nodos?.[o.i]&&premiumPie(d,o,d.layout?.[o.i]);
 if(['tree','rock','ore'].includes(o.type)&&d.produccion){
  if(d.produccion.nodos?.[o.i])return true;
  return o.exp===null&&o.lock!==null&&['tree','rock'].includes(o.type)&&(d[o.type==='tree'?'treesOpen':'rocksOpen']||[]).includes(o.lock);
 }
 if(o.exp!==null)return (d.expansiones||0)>o.exp;
 if(PREMIUM_WORLD.buildTypes.includes(o.type))return !!(d.built?.[o.type]||d.obras?.[o.type]);
 if(['tree','rock'].includes(o.type))return (d[o.type==='tree'?'treesOpen':'rocksOpen']||[0]).includes(o.lock);
 return true;
}
function premiumOcupacion(d     ,ignore=-1)              {
 const w=premiumMundo(d),m=new Set        (),T=PREMIUM_WORLD.tile;
 const put=(c        ,r        )=>m.add(c+','+r);
 if(d.espacioV===4)put(4,4);
 for(const o of w.objects){
  if(o.i===ignore||!premiumPresente(d,o))continue;
  const p=d.layout?.[o.i],ob=d.obras?.[o.type];
  const col=p?Math.round(p.cx/T-o.width/2):ob&&typeof ob.col==='number'?ob.col:o.col;
  const row=(p?Math.round(p.by/T):ob&&typeof ob.row==='number'?ob.row+1:o.base)-1;
  for(let j=0;j<o.width;j++)put(col+j,row);
 }
 for(let i=0;i<Math.min(60,d.plotsOwned||3);i++){
  const p=d.layoutPlots?.[i],b=w.plots[i];if(p)put(p.col,p.row);else if(b)put(b[0],b[1]);
 }
 for(const p of [...(d.decos||[]),...(d.chests||[])])if(p&&p.col!==undefined)put(p.col,p.row);
 return m;
}
function premiumSitio(d     ,o     ,lp     ,ignore=-1)          {
 if(!premiumPie(d,o,lp))return false;
 const col=lp.cx/PREMIUM_WORLD.tile-o.width/2,row=lp.by/PREMIUM_WORLD.tile-1,ocup=premiumOcupacion(d,ignore);
 for(let c=col;c<col+o.width;c++)if(ocup.has(c+','+row))return false;
 return true;
}
/* END PREMIUM GEOMETRY */
function nodosPoseidos(d) { return NODOS_CONTRATO.filter(([i,t,lock,exp]) => !!(d.produccion && d.produccion.nodos && d.produccion.nodos[i]) || (exp == null && lock != null && (t==='tree'||t==='rock') && (d[t==='tree'?'treesOpen':'rocksOpen']||[]).includes(lock))); }
function premiumReloj(antes,next,i,o,ahora,errores,desdeServidor=0){
 const key=o.key,b=antes.nodos?.[key];
 if(!b||!num(b.readyAt))return; // Todo soporte comprado nace con reloj SQL; compatibilidad de datos previos.
 const usos=num(next.nodoUsos?.[i])-num(antes.nodoUsos?.[i]);
 const bad=()=>errores.push('No se puede adelantar ni reiniciar el reloj de un nodo Golden');
 if(usos<0){bad();return;}
 next.nodos=next.nodos||{};
 if(next.nodos[key]===undefined){next.nodos[key]=JSON.parse(JSON.stringify(b));if(usos>0)bad();return;}
 const q=next.nodos[key];
 if(!q||!Number.isFinite(q.readyAt)||q.readyAt<=0||!Number.isFinite(q.cdIni)||q.cdIni<0||q.cdIni>=q.readyAt){bad();return;}
 if(q.halfAt===undefined)q.halfAt=b.halfAt||0;
 if(q.readyAt===b.readyAt&&q.cdIni===b.cdIni){if(usos>0)bad();return;}
 if(q.readyAt<b.readyAt){bad();return;}
 const oldDur=b.readyAt-b.cdIni,dur=q.readyAt-q.cdIni;
 const pausa=antes.produccion?.pausas?.['n:'+i],sigue=next.produccion?.pausas?.['n:'+i];
 // Reanudar desplaza el mismo reloj por el tiempo pausado. No genera cargas.
 const reanuda=pausa&&!sigue;
 if(reanuda&&usos===0){const delta=q.readyAt-b.readyAt;if(delta>=0&&delta<=Math.max(0,ahora-num(pausa.at))+5000&&Math.abs(dur-oldDur)<2)return;bad();return;}
 const stockAt=reanuda?Math.min(ahora,num(pausa.at)):ahora;
 if(sigue||b.readyAt>stockAt+1000){bad();return;}
 const base=o.type==='tree'?1800000:o.type==='rock'?2400000:14400000;
 const stat=o.type==='tree'?'talar':'minar',res=o.type==='tree'?'_':o.type==='rock'?'piedra':'bronce';
 const actos=num(next.stats?.[stat]?.[res])-num(antes.stats?.[stat]?.[res]);
 // La mascota de brazos puede drenar backlog sin nodoSumar. Conserva el largo
 // anterior y deja una carga, con comida y una entrega registrados en esta sesión.
 const mascota=antes.doma,ultimo=next.doma?.ultimo;
 const atendido=mascota?.bicho&&num(mascota.comidaHasta)>num(antes.visto)&&num(ultimo?.at)>num(antes.visto)&&num(ultimo?.at)<=ahora+5000&&o.type!=='ore'&&q.readyAt<=ahora&&Math.abs(dur-oldDur)<2&&num(ultimo?.[o.type==='tree'?'madera':'piedra'])>0;
 // VIP y la comida de -15% son los únicos multiplicadores del ciclo actual.
 // Los créditos generales de actividad/recursos siguen siendo comprobados abajo.
 if(!atendido&&(!(usos>0)||!(actos>=usos))){bad();return;}
 if(dur<base*.9*.85-1000||dur>base+1000||q.cdIni>ahora+5000){bad();return;}
 const cargas=(r,t)=>r.readyAt>t?0:o.type==='ore'?1:Math.min(4,1+Math.max(0,Math.floor((t-r.readyAt)/Math.max(1000,r.readyAt-r.cdIni))));
 const anteriores=cargas(b,stockAt),actuales=cargas(q,ahora);
 const ciclos=!pausa&&desdeServidor>0?Math.floor(Math.max(0,ahora-desdeServidor)/(base*.9*.85)):0;
 if(actuales>anteriores||usos>anteriores-actuales+ciclos){bad();return;}
}
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
function protegerEconomia(prev, next, ahora, desdeServidor=0) {
  picosUnificarEstado(next);
  const errores = [], antes = prev || {}, p = antes.produccion, n = next.produccion;
  // El libro privado se proyecta desde PostgreSQL. El cliente sólo mueve nodos que
  // ya posee; una pestaña antigua que omite el libro conserva los derechos existentes.
  if(p?.premium && n && n.premium===undefined)n.premium=JSON.parse(JSON.stringify(p.premium));
  if(!mismoJSON(p?.premium||{v:1,compras:[]},n?.premium||{v:1,compras:[]}))errores.push('Los nodos Golden sólo se compran y colocan en el servidor');
  if((p?.premium?.compras||[]).length&&[1,2,3,4].includes(antes.espacioV)){
    if(next.espacioV===undefined)next.espacioV=antes.espacioV;
    if(next.espacioV!==antes.espacioV)errores.push('No se puede cambiar la superficie registrada para los nodos Golden');
  }
  const premiumActivos=new Set();
  for(const compra of p?.premium?.compras||[]){
    if(compra.nodo===null)continue;
    const i=compra.nodo,o=premiumMundo(antes).objects[i];
    if(!o?.premiumOnly||!premiumRegistro(antes,i))continue;
    premiumActivos.add(i);
    if(n && n.nodos?.[i]===undefined){n.nodos=n.nodos||{};n.nodos[i]=true;}
    if(next.layout?.[i]===undefined && antes.layout?.[i]){next.layout=next.layout||{};next.layout[i]=JSON.parse(JSON.stringify(antes.layout[i]));}
    if(!n?.nodos?.[i]||!premiumSitio(next,o,next.layout?.[i],i))errores.push('El nodo Golden necesita espacio libre dentro de tu terreno');
    premiumReloj(antes,next,i,o,ahora,errores,desdeServidor);
  }
  for(const k of Object.keys(n?.nodos||{}))if(+k>=86&&+k<=94&&!premiumActivos.has(+k))errores.push('Nodo Golden sin derecho confirmado');
  // Las entregas nacen en compras/transacciones autoritativas. Un snapshot sólo puede
  // conservarlas o reclamarlas, nunca fabricar otra ni alterar su cantidad o ficha.
  const pendientes=Array.isArray(antes.mkPend)?antes.mkPend:[],usados=new Set();
  if(next.mkPend===undefined)next.mkPend=JSON.parse(JSON.stringify(pendientes));
  if(!Array.isArray(next.mkPend))errores.push('Entregas pendientes inválidas');
  else for(const entrega of next.mkPend){const i=pendientes.findIndex((p,i)=>!usados.has(i)&&mismoJSON(p,entrega));if(i<0){errores.push('Las entregas pendientes sólo se crean en el servidor');break;}usados.add(i);}
  const ritmo=next.farmXpRitmo,ancla=antes.farmXpRitmo||{v:1,tala:Math.max(0,num(antes.skills?.tala)),mining:Math.max(0,num(antes.skills?.mining))};
  if((ritmo||antes.farmXpRitmo)&&(!ritmo||!mismoJSON(ritmo,ancla)))errores.push('No se puede modificar el ancla de XP aceptada');

  const bonoInfra=(INFRA_GRANJA[(antes.infraestructura?.granja||0)-1]?.bono||0)/100;
  const ganadaInfra=Math.max(0,num(next.skills?.farming)-num(antes.skills?.farming))+1.5*Math.max(0,num(next.skills?.tala)-num(antes.skills?.tala))+2*Math.max(0,num(next.skills?.mining)-num(antes.skills?.mining));
  const extraAntes=num(antes.farmXpEdificios),extra=next.farmXpEdificios===undefined?extraAntes:next.farmXpEdificios;
  const prestigioInfra=next.prestige===num(antes.prestige)+1&&next.level===1;
  if(!Number.isFinite(extra)||(prestigioInfra?extra!==0:extra<extraAntes||extra>extraAntes+ganadaInfra*bonoInfra+1e-5))errores.push('XP extra de infraestructura inválida');
  next.farmXpEdificios=extra;
  if(next.incursion&&!mismoJSON(antes.incursion,next.incursion)&&num(antes.produccion?.vipHasta)<=ahora)errores.push('Las excursiones nuevas requieren VIP activo');
  if(!mismoJSON(antes.artefactos||null,next.artefactos||null))errores.push('Los objetos productores sólo se modifican en el servidor');
  if(!mismoJSON(antes.infraestructura||null,next.infraestructura||null))errores.push('La infraestructura sólo se mejora en el servidor');
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
    // Compatibilidad con pestañas anteriores: omitir los campos no borra ni repone el regalo.
    if(p?.vipNodosV===1){if(n.vipNodosV===undefined)n.vipNodosV=1;if(n.vipNodos===undefined)n.vipNodos=p.vipNodos;}
    const regaloVip=p?.vipNodosV!==1&&n.vipNodosV===1&&fin>0?2:0;
    const gratisVip=num(p?.vipNodos)+regaloVip-num(n.vipNodos);
    if((n.vipNodosV!==undefined&&n.vipNodosV!==1)||
      (n.vipNodosV===1&&(!Number.isSafeInteger(n.vipNodos)||n.vipNodos<0||n.vipNodos>2||fin<=0))||
      (n.vipNodosV!==1&&num(n.vipNodos)!==0)||!Number.isInteger(gratisVip)||gratisVip<0||gratisVip>2)
      errores.push('Regalo de nodos VIP no autorizado');
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
        actividadActualizar(antes,JSON.parse(JSON.stringify(next)),ahora,recibo,true,desdeServidor);
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
        if(i>=86){errores.push('Los nodos Golden sólo se colocan en el servidor');continue;}
        if (t==='piedra') errores.push("Ese emplazamiento heredado no se compra como nodo nuevo");
        if ((expNodo!=null && expNodo>=expN) || num(next.level)<NODO_COMPRA[t][1]) errores.push("Nodo sin desbloquear");
        gasto += NODO_COMPRA[t][0];
      }
      const canjes=[...Array.from({length:Math.min(1000,Math.max(0,plotNuevos-fichas))},()=>({precio:20,basico:true})),
        ...nuevos.map(o=>({precio:NODO_COMPRA[o[1]][0],basico:o[1]==='tree'||o[1]==='rock'}))].sort((a,b)=>b.precio-a.precio);
      for(let j=0;j<gratis;j++){const i=canjes.findIndex(c=>c.basico);if(i<0){errores.push('Vale consumido sin nodo básico');break;}gasto-=canjes.splice(i,1)[0].precio;}
      for(let j=0;j<gratisVip;j++){if(!canjes.length){errores.push('Regalo VIP consumido sin nodo');break;}gasto-=canjes.shift().precio;}
      const activos = poseidos.filter(o=>!premiumActivos.has(o[0])&&!n.pausas?.['n:'+o[0]]).length+Array.from({length:Math.min(1000,num(next.plotsOwned))},(_,i)=>i).filter(i=>!n.pausas?.['p:'+i]).length;
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
  // Compras premium del cliente histórico: exigir el coste al aceptar la propiedad.
  const preciosPasivas={hacha_abuelo:109,pico_viejo:29};let gastoPremium=0;
  for(const [id,precio] of Object.entries({estatua:60,arbolito:90})){
    const total=d=>num(d?.decoBolsa?.[id])+(Array.isArray(d?.decos)?d.decos.filter(x=>x.id===id).length:0),a=total(antes),b=total(next);
    if(!Number.isSafeInteger(b)||b<0||b>1000000||(next.decoBolsa?.[id]!==undefined&&(!Number.isSafeInteger(next.decoBolsa[id])||next.decoBolsa[id]<0)))errores.push('Cantidad de adornos inválida');
    gastoPremium+=Math.max(0,b-a)*precio;
  }
  if(antes.godHand&&!next.godHand)errores.push('No se puede borrar God Hand adquirida');
  if(!antes.godHand&&next.godHand)gastoPremium+=500;
  for(const k of new Set([...Object.keys(antes.nfts||{}),...Object.keys(next.nfts||{})])){
    const era=!!antes.nfts?.[k],es=!!next.nfts?.[k];if(era===es)continue;
    if(era){errores.push('No se puede borrar una pasiva adquirida');continue;}
    if(Object.prototype.hasOwnProperty.call(preciosPasivas,k))gastoPremium+=preciosPasivas[k];
    else if(k!=='cincel_cantera'||num(antes.pass?.stars)<26*40||antes.pass?.claimV?.[26]||!next.pass?.claimV?.[26]||num(next.produccion?.vipHasta)<=ahora)errores.push('Pasiva sin compra o premio del Pase validado');
  }
  const dia = new Date(ahora).toISOString().slice(0,10), control = antes._economiaControl || {};
  const estrellas = Math.max(0,num(next.pass && next.pass.stars)-num(antes.pass && antes.pass.stars));
  if(estrellas>0)errores.push('El pase está desactivado; no admite nuevas estrellas');
  const compradas = Math.max(0,Math.floor((goldenCustodia(antes)+reembolso-goldenCustodia(next)-gastoVip-gastoPremium)/15))*40;
  const emitidas = (control.dia===dia?num(control.estrellas):0)+Math.max(0,estrellas-compradas);
  if (emitidas>138) errores.push("Estrellas del pase superiores al máximo diario y semanal combinado");
  next._economiaControl = {dia,estrellas:emitidas}; // nunca se cree el contador recibido del cliente
  if (prev && goldenCustodia(next) > goldenCustodia(prev) + reembolso - gastoVip - gastoPremium + 1e-7) errores.push("Emisión Golden sin venta o recompensa autorizada");
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
    if (mia && f.paid) nuevo.ventas += f.fee_pct==null ? num(f.price) : Math.max(1,Math.floor((num(f.price)*(100-num(f.fee_pct))+50)/100));
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

  const xpYaAceptada = num(p.skills && p.skills.farming) + xpGranjaOficios(p) + num(p.farmXpEdificios) - num(p.farmXpBase);
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

    if(body?.ranking){
      if(body.cuenta!==uid)return json({error:'La sesión cambió de cuenta'},409);
      if(body.ranking.accion!=='granja')return json({error:'Clasificación inválida'},400);
      const {data,error}=await admin.rpc('ranking_granja_alfa',{p_uid:uid});
      return error?json({error:'No se pudo consultar la clasificación'},503):json(data);
    }

    if(body?.alfa){
      if(!['estado','restaurar'].includes(body.alfa.accion))return json({error:'Acción de alfa inválida'},400);
      const {data,error}=await admin.rpc('alfa_compras',{p_uid:uid,p_restaurar:body.alfa.accion==='restaurar'});
      return error||!data?.ok ? json({error:'No se pudo comprobar el registro de compras'},503) : json(data);
    }

    if(body?.banco && body.cuenta!==uid)return json({error:'La sesión cambió de cuenta'},409);
    let tasaBanco=10000;
    if(body?.banco){
      // Alfa: Golden sólo se adquiere mediante depósitos USDT verificados.
      if(body.banco.accion==='cotizar')return json({ok:true,canje:false,tasa:null,revision:'desactivado-alfa',usdt:false});
      return json({error:'El canje de Plata por Golden está desactivado durante la alfa'},403);
      /* Contrato conservado para una futura decisión de lanzamiento.
      tasaBanco=Number(Deno.env.get('BANCO_PLATA_POR_GOLDEN') ?? 10000);
      if(!Number.isSafeInteger(tasaBanco)||tasaBanco<1||tasaBanco>1e9)return json({error:'Banco temporalmente no disponible'},503);
      if(body.banco.accion==='cotizar')return json({ok:true,tasa:tasaBanco,revision:'plata-golden:'+tasaBanco,usdt:false});
      */
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
    // P2P: publicación, pago, entrega y recibo se confirman juntos en PostgreSQL.
    if(body?.p2p){
      if(body.cuenta!==uid)return json({error:'La sesión cambió de cuenta; recargá antes de operar'},409);
      if(typeof body.op!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.op)||typeof body.base!=='string'||!body.p2p||typeof body.p2p!=='object')return json({error:'Pedido P2P inválido'},400);
      const {data,error}=await admin.rpc('p2p_operar',{p_uid:uid,p_base:body.base,p_op:body.op,p_detalle:body.p2p});
      if(error){const conflicto=/conflicto:/i.test(error.message||'');return json({error:conflicto?'Otra sesión guardó; recuperá la versión del servidor':error.code==='P0001'?error.message:'No se pudo confirmar el movimiento del mercado',conflicto},conflicto?409:error.code==='P0001'||/^22/.test(error.code||'')?400:503);}
      return json(data);
    }
    // Cobros y canjes autoritativos: saldo, reloj, recibo y compare-and-swap en el servidor.
    if(body?.infra || body?.mejora || body?.pack || body?.artefacto || body?.banco || body?.diario || body?.visita || body?.logro || body?.mision){
      const a=body.artefacto;
      if(body.cuenta!==uid)return json({error:'La sesión cambió de cuenta; recargá antes de operar'},409);
      if(typeof body.op!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.op)||typeof body.base!=='string')return json({error:'Pedido inválido'},400);
      const {data:row,error:err}=await admin.from('farms').select('*').eq('user_id',uid).maybeSingle();
      if(err)return json({error:'No se pudo leer la granja'},503);
      if(!row)return json({error:'Primero sincronizá tu granja'},409);
      const ahora=Math.max(Date.now(),new Date(row.updated_at).getTime()+1);
      const r=body.mision ? jornadaOperacion(row.data,body.mision.id,body.mision.dia,ahora,body.op) : body.infra ? infraOperacion(row.data,body.infra.id,body.op) : body.mejora ? mejoraOperacion(row.data,body.mejora.id,body.op) : body.pack ? packOperacion(row.data,body.pack.id,ahora,body.op) : body.logro ? logroOperacion(row.data,body.logro.key,body.op) : body.visita ? (body.visita.accion==='ver'?logroVisita(row.data,body.visita.destino,uid,ahora,body.op):visitaOperacion(row.data,body.visita.destino,uid,ahora,body.op)) : body.diario ? (body.diario.accion==='reclamar'?diarioOperacion(row.data,ahora,body.op):{error:'Operación diaria inválida'}) : body.banco ? bancoOperacion(row.data,body.banco,body.op,tasaBanco) : artefactoOperacion(row.data,a.accion,a.id,ahora,body.op);
      if(r.repetido)return json({ok:true,data:row.data,updated_at:row.updated_at,cobro:r.cobro,premio:r.premio,repetido:true,granja:granjaVisitada});
      if(body.base!==row.updated_at)return json({error:'Otra sesión guardó; recargá antes de operar',conflicto:true},409);
      if(r.tasaCambio)return json({error:r.error,tasaCambio:true},412);
      if(r.error)return json({error:r.error},400);
      picosUnificarEstado(r.data);
      const fecha=new Date(ahora).toISOString();
      const {data:hecho,error:fallo}=await admin.from('farms').update({data:r.data,updated_at:fecha}).eq('user_id',uid).eq('updated_at',row.updated_at).select('updated_at').maybeSingle();
      if(fallo)return json({error:'No se pudo confirmar la operación'},503);
      if(!hecho)return json({error:'Otra sesión guardó primero',conflicto:true},409);
      // La versión debe ser la devuelta por PostgreSQL, no otra representación ISO del mismo instante.
      return json({ok:true,data:r.data,updated_at:hecho.updated_at,cobro:r.cobro,premio:r.premio,granja:granjaVisitada});
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
    const protegidos = protegerEconomia(prevRow?.data ?? null, data, ahora.getTime(), prevRow?.updated_at?new Date(prevRow.updated_at).getTime():0);
    if (protegidos.length) {
      await admin.from("farm_saves_log").insert({user_id:uid,reglas_v:VERSION,elapsed_s:Math.round(elapsedSeg),delta:{economia_rechazada:true},sospechas:protegidos});
      return json({ error: "Guardado económico bloqueado; conservá el respaldo local y recargá para sincronizar.", economia:true, sospechas: protegidos }, 409);
    }
    const mercado = mercadoPermiso(uid, filas ?? [], prevRow?.mercado_ack ?? null, prevRow?.data ?? null, data);

    /* las reglas miran, la bitácora recuerda */
    const { delta, sospechas } = evaluarGuardado(prevRow?.data ?? null, data, elapsedSeg, mercado.permiso);
    const permisoUsado = mercado.permiso.plata || Object.keys(mercado.permiso.res).length;
    await admin.from("farm_saves_log").insert({
      user_id: uid, reglas_v: VERSION, elapsed_s: Math.round(elapsedSeg),
      delta: permisoUsado ? { ...delta, mercado: mercado.permiso } : delta, sospechas,
    });

    /* modo rechazo (futuro, tras calibrar): un guardado con sospechas no entra */
    if (MODO === "rechazo" && sospechas.length) return json({ error: "guardado rechazado", sospechas }, 422);
    actividadActualizar(prevRow?.data??null,data,ahora.getTime(),undefined,body.jornada===1,prevRow?.updated_at?new Date(prevRow.updated_at).getTime():0); // Sólo guardados aceptados; CAS evita duplicar crédito.

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
