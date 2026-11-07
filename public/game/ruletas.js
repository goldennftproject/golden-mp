/* La ruleta sólo anima un recibo confirmado. Sorteo, saldos y premios pertenecen al servidor. */
(function(){
 'use strict';
 const HTML="<section class=\"gf-window card\" aria-label=\"Ruletas de Golden Farm\">\n      <header class=\"gf-header\"><h3>Ruletas</h3><button type=\"button\" class=\"close\" data-close=\"ov-ruletas\" aria-label=\"Cerrar ruletas\">×</button></header>\n      <div class=\"gf-tabs\" role=\"tablist\" aria-label=\"Tipo de ruleta\">\n        <button id=\"gf-tab-golden\" type=\"button\" role=\"tab\" aria-selected=\"true\" aria-controls=\"gf-panel-golden\" class=\"gf-tab\">Golden</button>\n        <button id=\"gf-tab-objects\" type=\"button\" role=\"tab\" aria-selected=\"false\" aria-controls=\"gf-panel-objects\" class=\"gf-tab\">Objetos</button>\n      </div>\n      <div class=\"gf-wallet\"><span>Tu saldo</span><span><b data-golden-balance=\"\">100</b> Golden <span class=\"gf-wallet-divider\">·</span> <img src=\"assets/farm/coin_plata.png\" alt=\"\"> <b data-plata-balance=\"\">1.000</b> Plata</span></div><div class=\"gf-consulta\"><span data-r-estado=\"\" role=\"status\" aria-live=\"polite\">Consultando…</span><button type=\"button\" class=\"ghost sm\" data-r-actualizar=\"\">Actualizar</button></div>\n      <div id=\"gf-panel-golden\" role=\"tabpanel\" aria-labelledby=\"gf-tab-golden\" class=\"gf-panel\">\n        <div class=\"gf-main\">\n          <div class=\"gf-wheel-column\"><div class=\"gf-wheel-shell\"><div class=\"gf-pointer\" aria-hidden=\"true\"></div><div class=\"gf-wheel gf-golden-wheel\" role=\"img\" aria-label=\"Ruleta Golden. Probabilidad de jackpot 0,2 por ciento; sin premio 99,8 por ciento.\"><div class=\"gf-wheel-face gf-golden-face\"><span class=\"gf-wheel-inscription\">GOLDEN</span><span class=\"gf-small-inscription\">JACKPOT</span></div></div><div class=\"gf-hub\" aria-hidden=\"true\">G</div></div><span class=\"gf-wheel-caption\">Un ticket · una oportunidad</span></div>\n          <div class=\"gf-info\"><div class=\"gf-pot-label\">Bote acumulado</div><div class=\"gf-pot\"><span data-pot=\"\">—</span><small>Golden</small></div><div class=\"gf-chance\"><b data-r-probabilidad=\"\">Consultando probabilidades…</b></div><div class=\"gf-cost\" data-r-ticket=\"\">Ticket: —</div><button type=\"button\" class=\"gf-spin gf-spin-golden\" disabled=\"\">Consultar ruleta</button><span class=\"gf-block-reason\" data-golden-reason=\"\"></span></div>\n        </div>\n        <div class=\"gf-result\" data-golden-result=\"\" role=\"status\" aria-live=\"polite\"><span class=\"gf-result-title\">Jackpot Golden</span><span class=\"gf-result-detail\">Probabilidad fija por giro</span></div>\n        <details class=\"gf-rules\"><summary class=\"\">Reglas y probabilidades</summary><div class=\"gf-rule-content\"><p data-r-reparto=\"\"></p><p data-r-odds=\"\"></p><p data-r-siguiente=\"\"></p><p>Reserva: <b data-reserve=\"\">—</b> Golden.</p><p>Los giros anteriores no cambian el siguiente. El premio se paga completo.</p></div></details>\n      </div>\n      <div id=\"gf-panel-objects\" role=\"tabpanel\" aria-labelledby=\"gf-tab-objects\" class=\"gf-panel\" hidden=\"\">\n        <div class=\"gf-main\">\n          <div class=\"gf-wheel-column\"><div class=\"gf-wheel-shell\"><div class=\"gf-pointer\" aria-hidden=\"true\"></div><div class=\"gf-wheel gf-object-wheel\" role=\"img\" aria-label=\"Ruleta de objetos, con sectores proporcionales a las probabilidades de cada premio.\"><div class=\"gf-wheel-face gf-object-face\"></div></div><div class=\"gf-hub\" aria-hidden=\"true\">★</div></div><span class=\"gf-wheel-caption\">Todos los giros entregan un premio</span></div>\n          <div class=\"gf-info\"><div class=\"gf-pot-label\">Giros de hoy</div><div class=\"gf-count\"><span data-spin-count=\"\">—</span><small data-r-max=\"\">/ —</small></div><div class=\"gf-daily-slots\" aria-label=\"Tres giros gratis y dos pagados\"></div><div class=\"gf-cost\" data-object-cost=\"\">Consultando coste…</div><button type=\"button\" class=\"gf-spin gf-spin-objects\" disabled=\"\">Consultar ruleta</button><span class=\"gf-block-reason\" data-object-reason=\"\"></span></div>\n        </div>\n        <div class=\"gf-result\" data-object-result=\"\" role=\"status\" aria-live=\"polite\"><span class=\"gf-result-title\">Materiales, comida y equipo</span><span class=\"gf-result-detail\">El premio queda en Entregas pendientes</span></div>\n        <details class=\"gf-rules\" open=\"\"><summary class=\"\">Premios y probabilidades</summary><div class=\"gf-prizes\"></div></details>\n      <p class=\"gf-real-note\" data-r-reinicio=\"\"></p></div>\n      <div class=\"gf-entregas\"><button type=\"button\" class=\"ghost sm\" data-r-recoger=\"\" disabled=\"\">Entregas pendientes</button><span>Si falta espacio o ya tienes el arma, el premio se conserva.</span></div><footer class=\"gf-foot\">Monedas del juego. Retiros desactivados.</footer>\n    </section>";
 const fuentes={madera:'farm/res_madera.png',piedra:'farm/res_piedra.png',stone:'farm/pick_stone.png',papa:'visual-v2/ui/crops/papa.png',papa_asada:'farm/dish_papa_asada.png',flecha:'farm/res_flecha.png',espada_madera:'farm/arm_espada_madera.png',arco_piedra:'farm/arm_arco_piedra.png',espada_bronce:'farm/arm_espada_bronce.png',mazo_oro:'farm/arm_mazo_oro.png'};
 const colores=['#d9ab6b','#d1caad','#a6ba79','#e9c65c','#e8a96a','#e0d3a1','#c68c54','#9caf98','#b88953','#edc149'];
 let ov=null,modo='golden',estado=null,leyendo=false,girando=false,listo=false,mensaje='',aviso=false,firma='',disparador=null;
 const rotaciones={golden:0,objetos:0};
 const $=s=>ov.querySelector(s), $$=s=>Array.from(ov.querySelectorAll(s));
 const n=v=>Number.isFinite(Number(v))?Number(v):0;
 const fmt=v=>new Intl.NumberFormat('es-UY',{maximumFractionDigits:6}).format(n(v));
 const pct=(v,e)=>fmt(n(v)*100/e)+' %';
 function pendiente(){return typeof ruletasPendiente==='function'&&!!ruletasPendiente();}
 function saldo(k){return typeof G!=='undefined'?Math.max(0,n(G[k])):0;}
 function imagen(k){const im=document.createElement('img');im.src='assets/'+(fuentes[k]||'farm/coin_esencia.png');im.alt='';return im;}
 // A prize in the queue is not an inventory gain. Actual delivered gains use the normal bag flow.
 const avisados=new Set();let avisoPremioEl=null,avisoPremioTimer=null,avisoPremioPendiente=null,avisoPremioCuenta=null;
 const cuentaActual=()=>typeof UID!=='undefined'?String(UID||'local'):'local';
 function quitarAvisoPremio(){if(avisoPremioEl)avisoPremioEl.remove();clearTimeout(avisoPremioTimer);avisoPremioEl=null;avisoPremioPendiente=null;avisoPremioCuenta=null;if(typeof placeFlujoPc==='function')placeFlujoPc();}
 function avisarPremio(r,recuperado){
  if(recuperado||r?.cancelado||!r||typeof r.op!=='string'||!/^[a-f0-9-]{36}$/i.test(r.op))return;
  const p=r.premio||{},esGolden=r.modo==='golden'&&r.goldenWin===true;
  if(!esGolden&&r.modo!=='objetos')return;
  const cantidad=esGolden?n(r.payout):n(p.qty);if(cantidad<=0||!esGolden&&!fuentes[p.item])return;
  const scope=cuentaActual(),id=scope+':'+r.op;if(avisados.has(id))return;
  const cola=typeof G!=='undefined'&&Array.isArray(G.mkPend)?G.mkPend:[];
  const entrega=esGolden?null:cola.slice().reverse().find(x=>x&&x.kind===p.kind&&x.item===p.item&&n(x.qty)===cantidad);
  if(!esGolden&&!entrega)return;
  const caja=document.getElementById('flujo');if(!caja)return;
  avisados.add(id);while(avisados.size>100)avisados.delete(avisados.values().next().value);
  quitarAvisoPremio();avisoPremioPendiente=entrega;avisoPremioCuenta=scope;
  const el=avisoPremioEl=document.createElement('div'),numero=document.createElement('b'),nombre=document.createElement('span'),detalle=document.createElement('small');
  el.className='flch gf-premio-aviso'+(esGolden?' gf-premio-acreditado':'');el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  numero.textContent='+'+fmt(cantidad);nombre.className='fn';nombre.textContent=esGolden?'Golden':String(p.label||p.item);detalle.textContent=esGolden?'Acreditados':'Por recoger';
  el.append(imagen(esGolden?'golden':p.item),numero,nombre,detalle);caja.append(el);
  if(typeof placeFlujoPc==='function')placeFlujoPc();
  avisoPremioTimer=setTimeout(()=>{if(avisoPremioEl===el)quitarAvisoPremio();},6000);
 }
 function crear(){
  if(ov)return;ov=document.createElement('div');ov.id='ov-ruletas';ov.className='ov';ov.innerHTML=HTML;document.body.appendChild(ov);
  // Keep the existing claim control above the wheel, never below the ten-prize catalogue.
  $('.gf-consulta').after($('.gf-entregas'));
  $('[data-close]').onclick=()=>{if(typeof closeOv==='function')closeOv('ov-ruletas');else ov.classList.remove('show');if(disparador?.isConnected)disparador.focus();};
  $$('.gf-tab').forEach(b=>{b.onclick=()=>seleccionar(b.id==='gf-tab-golden'?'golden':'objetos');b.addEventListener('keydown',e=>{if(leyendo||girando)return;if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();seleccionar(e.key==='Home'?'golden':e.key==='End'?'objetos':modo==='golden'?'objetos':'golden');$('#gf-tab-'+(modo==='golden'?'golden':'objects')).focus();}});});
  $('.gf-spin-golden').onclick=()=>pedir('golden');$('.gf-spin-objects').onclick=()=>pedir('objetos');$('[data-r-actualizar]').onclick=consultar;
  $('[data-r-recoger]').onclick=async()=>{if(leyendo||girando||pendiente()||typeof mkPendCobrar!=='function')return;try{await mkPendCobrar();render();}catch(e){mensaje=e?.message||'No se pudo recoger';aviso=true;render();}};
  render();
 }
 function seleccionar(m){if(leyendo||girando)return;modo=m;render();}
 function disponible(m){
  if(!listo||!estado)return {ok:false,coste:0,razon:leyendo?'Consultando…':'Actualiza para consultar la ruleta'};
  if(pendiente())return {ok:false,coste:0,razon:'Comprueba el giro anterior antes de continuar'};
  if(estado.habilitado===false)return {ok:false,coste:0,razon:'Las ruletas no están disponibles por ahora'};
  if(estado.juegoAbierto===false)return {ok:false,coste:0,razon:'El juego está pausado'};
  const coste=m==='golden'?n(estado.config.golden.ticket):n(estado.precioPlata);
  if(m==='golden'&&!estado.financiado)return {ok:false,coste,razon:'Próximo bote en preparación'};
  if(m==='objetos'&&n(estado.usados)>=n(estado.config.objetos.max))return {ok:false,coste,razon:'Ya usaste los '+n(estado.config.objetos.max)+' giros de hoy (UTC)'};
  if(saldo(m==='golden'?'golden':'plata')<coste)return {ok:false,coste,razon:m==='golden'?'Golden insuficiente':'Plata insuficiente'};
  return {ok:true,coste,razon:''};
 }
 function dibujarPremios(){
  const lista=estado.config.objetos.premios,e=n(estado.config.golden.escala)||10000,nueva=JSON.stringify(lista)+'|'+e;
  if(nueva===firma)return;firma=nueva;$('.gf-object-face').replaceChildren();$('.gf-prizes').replaceChildren();
  let acumulado=0;const sectores=[];
  lista.forEach((p,i)=>{const inicio=acumulado,peso=n(p.weight);acumulado+=peso;sectores.push(colores[i%colores.length]+' '+inicio/e*360+'deg '+acumulado/e*360+'deg');
   if(peso/e>=.08){const a=(inicio+peso/2)/e*Math.PI*2,marca=document.createElement('span');marca.className='gf-wheel-item';marca.style.left=(50+34*Math.sin(a))+'%';marca.style.top=(50-34*Math.cos(a))+'%';marca.append(imagen(p.item),document.createTextNode('×'+n(p.qty)));$('.gf-object-face').append(marca);}
   const fila=document.createElement('div');fila.className='gf-prize';const nombre=document.createElement('span'),prob=document.createElement('b');nombre.textContent=n(p.qty)+' × '+String(p.label||p.item);prob.textContent=pct(peso,e);fila.append(imagen(p.item),nombre,prob);$('.gf-prizes').append(fila);
  });$('.gf-object-face').style.background='conic-gradient(from 0deg,'+sectores.join(',')+')';
 }
 function render(){
  if(!ov)return;
  if(avisoPremioEl&&(avisoPremioCuenta!==cuentaActual()||avisoPremioPendiente&&!(typeof G!=='undefined'&&Array.isArray(G.mkPend)&&G.mkPend.includes(avisoPremioPendiente))))quitarAvisoPremio();
  const ocupada=leyendo||girando;
  $('[data-golden-balance]').textContent=fmt(saldo('golden'));$('[data-plata-balance]').textContent=fmt(saldo('plata'));
  $$('.gf-tab').forEach(b=>{const activa=b.id===(modo==='golden'?'gf-tab-golden':'gf-tab-objects');b.disabled=ocupada;b.setAttribute('aria-selected',String(activa));b.tabIndex=activa?0:-1;});
  $('#gf-panel-golden').hidden=modo!=='golden';$('#gf-panel-objects').hidden=modo!=='objetos';
  const msg=$('[data-r-estado]');msg.textContent=mensaje||(girando?'Confirmando giro…':leyendo?'Consultando…':pendiente()?'Resultado pendiente de comprobar':'');msg.classList.toggle('gf-warning',aviso||pendiente());
  $('[data-r-actualizar]').textContent=pendiente()?'Comprobar giro':'Actualizar';$('[data-r-actualizar]').disabled=ocupada;
  const entregas=typeof mkPendCount==='function'?Math.max(0,n(mkPendCount())):0;
  $('[data-r-recoger]').textContent='Entregas pendientes ('+entregas+')';$('[data-r-recoger]').disabled=ocupada||pendiente()||!entregas;
  $('.gf-entregas').classList.toggle('gf-entregas-pendientes',entregas>0);
  $('.gf-entregas>span').textContent=entregas?'Por recoger: aún no están en tu bolsa. Pulsa Entregas pendientes para recibir lo que quepa.':'Los premios de objetos se recogen aquí. Si no caben, se conservan.';
  if(estado){
   const g=estado.config.golden,o=estado.config.objetos,e=n(g.escala)||10000,p=n(g.pesoJackpot);
   $('[data-pot]').textContent=fmt(estado.bote);$('[data-reserve]').textContent=fmt(estado.reserva);$('[data-r-probabilidad]').textContent=pct(p,e)+' de jackpot por giro';$('[data-r-ticket]').textContent='Ticket: '+fmt(g.ticket)+' Golden';
   $('[data-r-reparto]').textContent='Por ticket: '+fmt(g.aporteBote)+' Golden al bote y '+fmt(g.aporteReserva)+' a la reserva.';
   $('[data-r-odds]').textContent='Jackpot: '+pct(p,e)+'. Sin premio: '+pct(e-p,e)+'.';$('[data-r-siguiente]').textContent='El siguiente bote comienza con '+fmt(g.seed)+' Golden sólo si la reserva alcanza.';
   $('.gf-golden-wheel').setAttribute('aria-label','Ruleta Golden. Jackpot '+pct(p,e)+'; sin premio '+pct(e-p,e)+'.');$('.gf-golden-face').style.background='conic-gradient(from 0deg,#ffe185 0deg '+p/e*360+'deg,#a95d28 '+p/e*360+'deg 360deg)';
   $('[data-spin-count]').textContent=String(n(estado.usados));$('[data-r-max]').textContent='/ '+n(o.max);
   $('.gf-daily-slots').replaceChildren();for(let i=0;i<Math.min(10,n(o.max));i++){const usado=i<n(estado.usados),gratis=i<n(o.gratis),s=document.createElement('span');s.className='gf-slot'+(!gratis?' paid':'')+(usado?' used':'');s.textContent=usado?'✓':gratis?'G':fmt(o.precios[i-n(o.gratis)]);s.setAttribute('aria-label','Giro '+(i+1)+': '+(usado?'usado':gratis?'gratis':s.textContent+' Plata'));$('.gf-daily-slots').append(s);}
   $('[data-object-cost]').textContent=n(estado.usados)>=n(o.max)?'Límite diario alcanzado':n(estado.precioPlata)===0?n(estado.gratisRestantes)+' giros gratis disponibles':'Próximo giro: '+fmt(estado.precioPlata)+' Plata';
   $('[data-r-reinicio]').textContent=n(o.gratis)+' gratis + '+Math.max(0,n(o.max)-n(o.gratis))+' pagos al día · reinicio a las 00:00 UTC';dibujarPremios();
  }
  ['golden','objetos'].forEach(m=>{const d=disponible(m),b=$(m==='golden'?'.gf-spin-golden':'.gf-spin-objects');b.disabled=ocupada||!d.ok;b.textContent=girando&&modo===m?'Girando…':!listo?'Consultar ruleta':m==='golden'?'Girar · '+fmt(d.coste)+' Golden':n(estado.usados)>=n(estado.config.objetos.max)?'Límite diario alcanzado':d.coste===0?'Girar gratis':'Girar · '+fmt(d.coste)+' Plata';$(m==='golden'?'[data-golden-reason]':'[data-object-reason]').textContent=d.razon;});
 }
 function resultado(r,recuperado){
  if(!r||!['golden','objetos'].includes(r.modo))return;
  const box=$(r.modo==='golden'?'[data-golden-result]':'[data-object-result]'),titulo=document.createElement('span'),detalle=document.createElement('span'),p=r.premio||{};
  titulo.className='gf-result-title';detalle.className='gf-result-detail';box.classList.toggle('winner',r.modo==='objetos'||!!r.goldenWin);
  if(r.modo==='golden'){titulo.textContent=r.goldenWin?'¡Ganaste '+fmt(r.payout)+' Golden!':'Esta vez, sin premio';detalle.textContent=r.goldenWin?'Bote completo acreditado a tu saldo':'El bote creció '+fmt(estado.config.golden.aporteBote)+' Golden · probabilidad sin cambios';}
  else{titulo.append(imagen(p.item),document.createTextNode(fmt(p.qty)+' × '+String(p.label||p.item||'Premio')));detalle.textContent='Premio confirmado. Recoge las entregas con el botón de arriba.';}
  if(recuperado)detalle.textContent+=' · giro comprobado';box.replaceChildren(titulo,detalle);avisarPremio(r,recuperado);
 }
 async function consultar(){
  crear();if(leyendo||girando)return;leyendo=true;listo=false;mensaje='';aviso=false;render();
  try{if(typeof ruletasConsultar!=='function')throw new Error('Conecta para consultar las ruletas');const r=await ruletasConsultar();if(!r?.estado?.config)throw new Error('No se pudo consultar el estado de las ruletas');estado=r.estado;listo=true;if(r.cancelado||r.recibo?.cancelado){mensaje='Giro no realizado; no se cobró';}else if(r.recibo&&r.found!==false){resultado(r.recibo,true);mensaje='Giro confirmado; no se volvió a cobrar';}}
  catch(e){mensaje=e?.message||'No se pudo consultar. Comprueba la conexión y actualiza.';aviso=true;}
  finally{leyendo=false;render();}
 }
 function pedir(m){
  if(leyendo||girando||m!==modo)return;const d=disponible(m);if(!d.ok){mensaje=d.razon;aviso=true;render();return;}
  if(d.coste===0){ejecutar(m,d.coste);return;}
  if(typeof askConfirm!=='function'){mensaje='No está disponible la confirmación del giro';aviso=true;render();return;}
  const texto=m==='golden'?'Vas a gastar '+fmt(d.coste)+' Golden en un ticket. Jackpot: '+pct(estado.config.golden.pesoJackpot,estado.config.golden.escala)+'. Puedes obtener el bote completo o no recibir premio. ¿Confirmas?':'Vas a gastar '+fmt(d.coste)+' Plata en este giro. El premio es aleatorio y queda en Entregas pendientes. ¿Confirmas?';
  askConfirm(texto,()=>ejecutar(m,d.coste),{title:'Confirmar giro',yes:'Girar · '+fmt(d.coste)+(m==='golden'?' Golden':' Plata'),yesClass:'green',no:'Cancelar'});
 }
 async function ejecutar(m,coste){
  if(leyendo||girando||pendiente())return;modo=m;girando=true;mensaje='Confirmando giro…';aviso=false;render();
  try{
   const r=await ruletasGirar(m,coste);if(!r?.estado?.config)throw new Error('Resultado sin confirmar. Comprueba el giro antes de continuar.');estado=r.estado;listo=true;if(r.cancelado||r.recibo?.cancelado){mensaje='Giro no realizado; no se cobró';return;}if(!r.recibo||r.recibo.modo!==m)throw new Error('Resultado sin confirmar. Comprueba el giro antes de continuar.');mensaje='';render();
   const recibo=r.recibo,e=n(estado.config.golden.escala)||10000,roll=recibo.roll;
   if(Number.isInteger(roll)&&roll>=0&&roll<e){const w=$(m==='golden'?'.gf-golden-wheel':'.gf-object-wheel');await new Promise(resolve=>{
    const reducida=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;let timer,terminada=false;
    const fin=ev=>{if(ev.target===w&&ev.propertyName==='transform')terminar();};
    const terminar=()=>{if(terminada)return;terminada=true;clearTimeout(timer);w.removeEventListener('transitionend',fin);resolve();};
    const destino=(360-(roll+.5)/e*360)%360;rotaciones[m]+=360*5+((destino-rotaciones[m]%360+360)%360);w.addEventListener('transitionend',fin);w.style.transform='rotate('+rotaciones[m]+'deg)';timer=setTimeout(terminar,reducida?0:2300);
   });}
   resultado(recibo,!!r.repetido);mensaje=r.repetido?'Giro comprobado; no se volvió a cobrar':'';
  }catch(e){listo=false;mensaje=e?.message||'Resultado sin confirmar. Comprueba el giro antes de continuar.';aviso=true;}
  finally{girando=false;render();}
 }
 window.abrirRuletas=function(){crear();disparador=document.activeElement;if(typeof openOv==='function')openOv('ov-ruletas');else ov.classList.add('show');if(!girando&&!leyendo)consultar();else render();};
 window.refrescarRuletas=function(){if(ov)render();};
 // Montar antes de initUI permite compartir el arrastre, las capas y las salidas habituales.
 if(document.body)crear();
})();
