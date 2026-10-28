import {project} from './project.js';
import {reservePlan,proportionalQuote} from './solvencia.mjs';
const $=id=>document.getElementById(id),label={admin:'Administrador',dev:'Dev'};
let client,uid=null,view='resumen',page=0,sequence=0,busy=false,sessionUid=null;
function message(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function clear(){sequence++;uid=null;$('content').replaceChildren();$('panel').hidden=true;$('updated').textContent='';$('identity').textContent='Sin acceso confirmado';}
async function session(){const {data,error}=await client.auth.getSession();if(error||!data?.session)throw Error('Inicia sesión en el juego con tu cuenta del equipo.');return data.session;}
async function request(body,who){const {data,error}=await client.functions.invoke('equipo',{body:{...body,cuenta:who}});if(error){let d;try{d=await error.context?.json();}catch{}const e=Error(d?.error||'No se pudo consultar el servidor');e.status=error.context?.status;throw e;}if(!data?.ok)throw Error('Respuesta sin confirmar');return data;}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text??'—');if(cls)e.className=cls;return e;}
const number=v=>Number(v||0).toLocaleString('es',{maximumFractionDigits:6});
const date=v=>v?new Date(v).toLocaleString('es'):'—';
function txLink(tx){if(!/^0x[0-9a-f]{64}$/.test(tx||''))return el('span','—');const a=el('a',tx.slice(0,12)+'…'+tx.slice(-8));a.href='https://bscscan.com/tx/'+tx;a.title=tx;a.target='_blank';a.rel='noopener noreferrer';return a;}
async function operate(body){if(busy)return;busy=true;const who=uid;try{await request(body,who);if(uid!==who)return;message(body.accion==='pausar'?'Recargas pausadas.':'Incidencia marcada como revisada; no se modificaron fondos.');await load();}catch(e){if(uid===who){message(e.message,true);if(e.status===401||e.status===403)clear();}}finally{busy=false;}}
function table(headers,rows,render){if(!rows.length)return el('div','No hay registros para esta consulta.','empty');const wrap=el('div',undefined,'table-wrap'),t=el('table'),head=el('tr'),body=el('tbody');for(const h of headers)head.append(el('th',h));t.append(el('thead'));t.firstChild.append(head);for(const r of rows){const tr=el('tr');for(const item of render(r)){const td=el('td');if(item instanceof Node)td.append(item);else td.textContent=String(item??'—');tr.append(td);}body.append(tr);}t.append(body);wrap.append(t);return wrap;}
function person(r){const d=el('div');d.append(el('strong',r.name||'Sin nombre'),el('span',r.user_id,'muted'));return d;}
function reserveCalculator(){
 const box=el('details',undefined,'reserve-calculator'),heading=el('summary','Simular cobertura de retiros · sin operaciones');box.append(heading,el('p','Escenario manual. No consulta saldos de la wallet, no guarda estos datos y no habilita retiros.'));
 const form=el('form'),fields={};
 for(const [key,title,value,min,max] of [['reserve','Reserva líquida hipotética USDT','0',0,100000000],['liability','Todos los Golden que habría que respaldar','',0,100000000],['committed','USDT ya comprometidos','0',0,100000000],['income','Ingreso real recurrente neto en 30 días','0',0,100000000],['players','Cuentas elegibles que solicitarían retiro','10',1,10000],['floor','Reserva que no se utilizaría','20',0,100000000],['gas','Coste hipotético por pago en USDT equivalente','0.02',0,100]]){
  const label=el('label',title),input=el('input');input.type='number';input.name=key;input.value=value;input.min=String(min);input.max=String(max);input.step=key==='players'?'1':'0.000001';input.required=true;label.append(input);form.append(label);fields[key]=input;
 }
 const button=el('button','Simular · no mueve fondos');button.type='submit';form.append(button);const result=el('div',undefined,'reserve-result');result.setAttribute('role','status');
 form.onsubmit=e=>{e.preventDefault();try{
  for(const input of Object.values(fields))if(input.value.trim()==='')throw Error('Completa todos los importes; incluye todos los Golden, no sólo los comprados.');
  const read=k=>Number(fields[k].value),players=read('players');if(!Number.isSafeInteger(players)||players<1||players>10000)throw Error('Número de cuentas inválido');
  const plan=reservePlan({reserve:read('reserve'),goldenLiability:read('liability'),committed:read('committed'),recurringNet30:read('income'),floor:read('floor'),gasBuffer:players*read('gas'),windowDays:30,seedDailyBudget:Math.max(0,read('reserve')-read('floor'))/180,verified:false});
  const quote=proportionalQuote({plan,poolPlata:players*150000,requestedPlata:150000});
  result.replaceChildren(el('strong','Retiros bloqueados · simulación sin saldo verificado'),el('p','Disponible tras respaldos y colchón: '+number(plan.available)+' USDT. Déficit de cobertura: '+number(plan.deficit)+' USDT.'),el('p','Presupuesto hipotético de 30 días: '+number(plan.budget)+' USDT. Por cuenta: '+number(quote.payout)+' USDT, frente a 15 USDT de referencia para 150.000 Plata.'));
 }catch(error){result.replaceChildren(el('p',error.message,'error'));}};
 box.append(form,result,el('p','Ejemplo conservador: 50% del ingreso recurrente y reserva inicial repartida en 180 días, limitado además por liquidez. Un depósito que aún respalda Golden no es ingreso libre. Gastar Golden obtenido jugando tampoco aporta USDT. Este presupuesto reduce el valor del canje; no garantiza 0,50 USDT diarios.','muted'));return box;
}
function summary(d){
 const wrap=el('div'),notice=el('section',undefined,'notice '+(d.deposits_enabled?'open':'closed')),copy=el('div');copy.append(el('h2',d.deposits_enabled?'Recargas abiertas':'Recargas cerradas'),el('p','Alfa · USDT BEP-20 en BNB Smart Chain · Retiros bloqueados.'));const pause=el('button','Pausar recargas','danger');pause.disabled=!d.deposits_enabled;pause.onclick=()=>{if(confirm('¿Pausar nuevas recargas? Los depósitos ya acreditados se conservan.'))operate({accion:'pausar'});};notice.append(copy,pause);wrap.append(notice);
 const cards=el('div',undefined,'metrics');for(const [key,title,detail] of [['cuentas','Cuentas con granja','Incluye cuentas de pruebas'],['wallets','Wallets vinculadas','Una por cuenta'],['depositos','Depósitos confirmados','Recibos únicos'],['usdt_confirmados','USDT acreditados','Compra 1 USDT → 1 Golden'],['golden_pagado_pendiente','Golden comprado sin gastar','Pendiente de conservar al lanzamiento'],['incidencias','Incidencias por revisar','Verificaciones registradas'],['compras_conservadas','Derechos de alfa registrados','VIP y compras permanentes'],['guardados_24h','Granjas guardadas en 24 h','No equivale a jugadores simultáneos']]){const c=el('article',undefined,'metric');c.append(el('div',title),el('b',number(d[key])),el('span',detail));cards.append(c);}wrap.append(cards,reserveCalculator());return wrap;
}
function render(d){
 $('panel').hidden=false;$('login-help').hidden=true;$('identity').textContent='Equipo · '+(label[d.role]||d.role);$('updated').textContent='Consultado: '+date(d.at);
 $('search-form').hidden=view==='resumen'||view==='auditoria';$('pagination').hidden=view==='resumen';
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 const rows=(d.rows||[]).slice(0,25);$('previous').disabled=page===0;$('next').disabled=(d.rows||[]).length<=25;$('page').textContent='Página '+(page+1);
 let content;
 if(view==='resumen')content=summary(d);
 else if(view==='cuentas')content=table(['Cuenta','Nivel','Plata','Golden','Comprado sin gastar','Wallet','VIP hasta','Derechos alfa','Último guardado'],rows,r=>[person(r),number(r.nivel),number(r.plata),number(r.golden),number(r.golden_pagado),r.wallet||'Sin vincular',Number(r.vip_hasta)>Date.now()?date(Number(r.vip_hasta)):'Sin VIP activo',number(r.compras_conservadas),date(r.updated_at)]);
 else if(view==='depositos')content=table(['Cuenta','USDT / Golden','Wallet emisora','Transacción','Bloque','Acreditado'],rows,r=>[person(r),number(r.golden),r.address,txLink(r.tx),r.block_number,date(r.created_at)]);
 else if(view==='incidencias'){
  content=el('div');content.append(el('p','Se muestran verificaciones admitidas desde la activación de este registro, hasta 50 transacciones por cuenta. Una comprobación pendiente no prueba que el pago haya llegado.','muted'));
  content.append(table(['Cuenta','Estado','Detalle','Transacción','Comprobaciones','Última consulta','Revisión'],rows,r=>{const review=el('div');review.append(el('span',r.resolved?'Revisada':'Por revisar','badge'));if(r.note)review.append(el('p',r.note));if(!r.resolved&&r.state!=='acreditado'){const b=el('button','Marcar revisada');b.onclick=()=>{const note=prompt('Nota de revisión (5–500 caracteres). Esto no acredita ni devuelve fondos.');if(note!==null)operate({accion:'resolver',target:r.user_id,tx:r.tx,version:r.updated_at,note});};review.append(b);}return[person(r),r.state,r.detail,txLink(r.tx),number(r.attempts),date(r.updated_at),review];}));
 }else content=table(['Fecha','Operador','Acción','Destino','Detalle'],rows,r=>[date(r.created_at),r.name||r.actor,r.action,r.target||'—',r.detail]);
 $('content').replaceChildren(content);
}
async function load(){
 const requestNo=++sequence,currentView=view,currentPage=page;message('Consultando…');$('refresh').disabled=true;
 try{const s=await session(),who=s.user.id;if(requestNo!==sequence)return;uid=who;sessionUid=who;const d=await request({accion:'consultar',vista:currentView,page:currentPage,buscar:$('search').value.trim()},who);if(requestNo!==sequence||uid!==who||view!==currentView||page!==currentPage)return;render(d);message('');}
 catch(e){if(requestNo!==sequence)return;clear();$('login-help').hidden=false;message(e.message,true);}
 finally{if(requestNo===sequence||uid===null)$('refresh').disabled=false;}
}
function init(){
 if(!window.supabase?.createClient){message('No se pudo cargar la conexión. Actualiza la página.',true);return;}
 client=window.supabase.createClient(project.url,project.key);
 $('refresh').onclick=load;$('search-form').onsubmit=e=>{e.preventDefault();page=0;load();};
 $('previous').onclick=()=>{if(page>0){page--;load();}};$('next').onclick=()=>{page++;load();};
 for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;page=0;$('search').value='';load();};
 client.auth.onAuthStateChange((event,s)=>{const next=s?.user?.id||null;if(sessionUid!==null&&next!==sessionUid){clear();sessionUid=next;queueMicrotask(load);}});
 load();
}
init();
