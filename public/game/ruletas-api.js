/* Ruletas: una petición durable; ante incertidumbre se consulta o cancela el mismo UUID. */
function ruletasOperacionPendiente(uid=UID){
 try{const raw=localStorage.getItem('gf-venta-pendiente-'+SB_REF+'-'+uid);if(!raw)return null;const p=JSON.parse(raw);return p?.cuenta===uid&&p?.ruleta&&typeof p.op==='string'?p:null;}catch{return null;}
}
function ruletasTieneReciboPendiente(uid=UID){return !!ruletasOperacionPendiente(uid);}
function ruletasPendiente(){return !!UID&&(ruletasTieneReciboPendiente(UID)||SAVE_CONFLICTOS.has(UID));}
function ruletasRequiereSesion(){
 if(!sb||!UID||!CARGA_OK||SOLO_LOCAL)throw Error('Necesitas conexión y una partida sincronizada para usar las ruletas.');
}
function ruletasAplicarConfirmacion(uid,r){
 if(UID!==uid)throw Error('La cuenta cambió. El recibo permanece en la cuenta que inició el giro.');
 if(!r?.ok||!r.data||typeof r.updated_at!=='string'||!r.updated_at)throw Error('Resultado sin guardado confirmado. Comprueba el mismo giro.');
 hydrate(r.data);SAVE_BASES.set(uid,r.updated_at);copiaGuardar(snapshot());lastSavedKey=snapKey();
 mercadoLimpiarPendiente(uid);SAVE_CONFLICTOS.delete(uid);SAVE_OTRA=false;
 refreshHud();if(typeof syncSlots==='function')syncSlots();
}
async function ruletasRespuestaError(error,data){
 let detalle=data;const status=Number(error?.context?.status)||0;
 if(error?.context&&typeof error.context.json==='function')try{detalle=await error.context.json();}catch{}
 const e=Error(detalle?.error||'No se pudo confirmar el giro. Usa Comprobar giro antes de continuar.');e.status=status;return e;
}
async function ruletasConsultar(){
 ruletasRequiereSesion();if(MERCADO_EN_CURSO)throw Error('Espera a que termine la operación en curso.');
 const uid=UID,p=ruletasOperacionPendiente(uid);
 if(!p){
  const {data,error}=await conTope(sb.functions.invoke('ruletas',{body:{accion:'estado',cuenta:uid}}),15000,'estado de ruletas');
  if(UID!==uid)throw Error('La cuenta cambió. Vuelve a abrir las ruletas.');
  if(error||!data?.ok)throw await ruletasRespuestaError(error,data);return data;
 }
 // El servidor serializa comprobar/girar: ausencia se sella como cancelación permanente.
 const desbloquear=mercadoBloquearPantalla('Comprobando el recibo del giro…');
 MERCADO_EN_CURSO=(async()=>{
  try{
   if(SAVE_EN_CURSO)await SAVE_EN_CURSO;
   if(UID!==uid)throw Error('La cuenta cambió.');
   localStorage.setItem('gf-conflicto-respaldo-'+SB_REF+'-'+uid+'-'+Date.now(),JSON.stringify({cuenta:uid,data:snapshot(),base:SAVE_BASES.get(uid),pendiente:p}));
   const body={accion:'comprobar',cuenta:uid,op:p.op,modo:p.ruleta.modo,precioEsperado:p.ruleta.precioEsperado};
   const {data,error}=await conTope(sb.functions.invoke('ruletas',{body}),20000,'recibo de ruleta');
   if(error||!data?.ok)throw await ruletasRespuestaError(error,data);
   ruletasAplicarConfirmacion(uid,data);return data;
  }catch(e){SAVE_CONFLICTOS.add(uid);throw e;}
 })().finally(()=>{MERCADO_EN_CURSO=null;desbloquear();});
 return MERCADO_EN_CURSO;
}
async function ruletasGirar(modo,precioEsperado){
 ruletasRequiereSesion();
 if(!['golden','objetos'].includes(modo)||!Number.isFinite(precioEsperado)||!(modo==='golden'?[1]:[0,100,200]).includes(precioEsperado))throw Error('Coste de giro inválido. Actualiza las ruletas.');
 if(MERCADO_EN_CURSO)throw Error('Hay otra operación en curso.');
 if(mercadoPendiente(UID)||SAVE_CONFLICTOS.has(UID))throw Error('Hay un resultado pendiente. Comprueba el giro o revisa el guardado antes de continuar.');
 const uid=UID,desbloquear=mercadoBloquearPantalla('Confirmando el giro en el servidor…');
 const confirmadas=SAVE_CONFIRMACIONES.get(uid)||0,flush=saveFarm(true);
 MERCADO_EN_CURSO=(async()=>{
  let enviado=false;
  try{
   await conTope(flush,15000,'guardado previo al giro');
   if(UID!==uid||SAVE_CONFLICTOS.has(uid)||(typeof guardadoTienePendiente==='function'&&guardadoTienePendiente(uid))||(SAVE_CONFIRMACIONES.get(uid)||0)<=confirmadas||!SAVE_BASES.get(uid))throw Error('No se confirmó el guardado. No se giró ni se cobró.');
   const p={cuenta:uid,base:SAVE_BASES.get(uid),op:window.crypto.randomUUID(),ruleta:{modo,precioEsperado}};
   mercadoMarcarPendiente(uid,p);
   const body={accion:'girar',cuenta:uid,base:p.base,op:p.op,modo,precioEsperado};
   enviado=true;
   const {data,error}=await conTope(sb.functions.invoke('ruletas',{body}),20000,'giro confirmado');
   if(error||!data?.ok){
    const e=await ruletasRespuestaError(error,data);
    // Un rechazo definitivo devuelve sin mutaciones; un timeout/503 conserva el recibo.
    if(e.status>=400&&e.status<500){mercadoLimpiarPendiente(uid);if(e.status===409)SAVE_CONFLICTOS.add(uid);enviado=false;}
    throw e;
   }
   ruletasAplicarConfirmacion(uid,data);return data;
  }catch(e){if(enviado&&mercadoPendiente(uid))SAVE_CONFLICTOS.add(uid);throw e;}
 })().finally(()=>{MERCADO_EN_CURSO=null;desbloquear();if(typeof refrescarRuletas==='function')refrescarRuletas();});
 return MERCADO_EN_CURSO;
}
