/* Puente real + saveFarm real, con red/almacenamiento simulados; nunca usa cuentas reales. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=fs.existsSync(path.join(__dirname,'../public/game/ruletas-api.js'))?path.resolve(__dirname,'..'):'C:/Users/pauli/Desktop/01_Proyectos/golden/golden-mp';
const api=fs.readFileSync(path.join(repo,'public/game/ruletas-api.js'),'utf8'),save=fs.readFileSync(process.env.GF_SAVE_CANDIDATE||path.join(repo,'public/game/save.js'),'utf8');
const saveFunctions=save.slice(save.indexOf('function guardadoTienePendiente('),save.indexOf('/* ============ EL PORTERO DIJO QUE NO'));
const helperNames=['mercadoPendiente','mercadoMarcarPendiente','mercadoLimpiarPendiente'];
const helpers=helperNames.map(name=>save.split(/\r?\n/).find(l=>l.startsWith('function '+name+'('))).join('\n');
assert(saveFunctions.includes('async function saveFarmReal'));assert(helpers.includes('localStorage.setItem'));
const plain=x=>JSON.parse(JSON.stringify(x)),tick=()=>new Promise(r=>setImmediate(r));
const initial={golden:100,plata:1000,res:{madera:17},buffs:[],mkPend:[],level:8};
const BASE='2026-11-07T03:00:00.000001+00:00',PRE='2026-11-07T03:00:00.000002+00:00',ACK='2026-11-07T03:00:00.123456+00:00';
function respuesta(extra={}){return {ok:true,data:{...plain(initial),golden:99},updated_at:ACK,estado:{habilitado:true,config:{}},recibo:{op:'00000000-0000-4000-8000-000000000002',modo:'golden',roll:5000,goldenWin:false,payout:0},found:true,...extra};}
function montar(opts={}){
 const storage=opts.storage||new Map(),invokes=[],saves=[],hydrated=[],backups=[],locks=[],unlocks=[],warnings=[];let serial=0;
 const context={console:{log(){},warn(...x){warnings.push(x);},error(){}},JSON,Date,Math,Promise,Map,Set,Error,Number,
  UID:'a',SB_REF:'qa-project',CARGA_OK:true,SOLO_LOCAL:false,SAVE_BASES:new Map([['a',BASE]]),SAVE_CONFIRMACIONES:new Map([['a',0]]),SAVE_CONFLICTOS:new Set(),SAVE_PENDIENTES:new Map(),SAVE_EN_CURSO:null,SAVE_OTRA:false,MERCADO_EN_CURSO:null,
  G:plain(initial),lastSavedKey:JSON.stringify(initial),USDT_OCUPADO:false,USDT_REINTENTO_AT:0,
  window:{crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`}},
  localStorage:{getItem(k){if(opts.readFail)throw Error('storage unreadable');return storage.get(k)||null;},setItem(k,v){if(opts.writeFail)throw Error('storage full');storage.set(k,v);},removeItem(k){storage.delete(k);}},
  conTope:p=>p,sleepMs:async()=>{},
  mercadoBloquearPantalla:m=>{locks.push(m);return()=>unlocks.push(m);},
  hydrate:d=>{hydrated.push(plain(d));context.G=plain(d);},snapshot:()=>plain(context.G),snapKey:()=>JSON.stringify(context.G),copiaGuardar:d=>backups.push(plain(d)),
  refreshHud(){},syncSlots(){},refrescarRuletas(){},buffCdConfirmar(){},actividadGranjaRecibir(){},logrosRecibir(){},usdtProgramarPendiente(){},isOpen:()=>false,avisarSinNube(){},
  alfaInvocarGuardado:async b=>{saves.push(plain(b));return opts.save?opts.save(b):{data:{ok:true,updated_at:PRE},error:null};},
  sb:{functions:{invoke:async(name,{body})=>{invokes.push({name,body:plain(body)});return opts.invoke?opts.invoke(body):{data:respuesta(),error:null};}}}
 };
 vm.createContext(context);vm.runInContext(helpers+'\n'+saveFunctions+'\n'+api,context);
 return {ctx:context,storage,invokes,saves,hydrated,backups,locks,unlocks,warnings};
}
function pending(t,uid='a'){const raw=t.storage.get('gf-venta-pendiente-qa-project-'+uid);return raw?JSON.parse(raw):null;}
function guardarPendiente(t,uid='a',modo='golden',precioEsperado=1){const p={cuenta:uid,base:PRE,op:'11111111-1111-4111-8111-111111111111',ruleta:{modo,precioEsperado}};t.storage.set('gf-venta-pendiente-qa-project-'+uid,JSON.stringify(p));return p;}
test('sesión, modo y quote inválidos se rechazan antes de guardar o enviar',async()=>{
 for(const config of [{CARGA_OK:false},{SOLO_LOCAL:true},{UID:null},{sb:null}]){const t=montar();Object.assign(t.ctx,config);await assert.rejects(t.ctx.ruletasGirar('golden',1),/conexión/);assert.equal(t.invokes.length,0);assert.equal(t.saves.length,0);}
 for(const [modo,precio] of [['otra',1],['objetos',999],['golden',NaN],['golden',-1]]){const t=montar();await assert.rejects(t.ctx.ruletasGirar(modo,precio),/Coste/);assert.equal(t.invokes.length,0);assert.equal(t.saves.length,0);}
});
test('giro usa identidad, UUID, coste aceptado y base exacta del preguardado; sin mutación local antes del recibo',async()=>{
 let release;const t=montar({invoke:()=>new Promise(r=>release=r)}),p=t.ctx.ruletasGirar('golden',1);await tick();
 assert.equal(t.saves.length,1);assert.equal(t.saves[0].base,BASE);assert.equal(t.saves[0].jornada,1);assert.equal(t.invokes.length,1);
 assert.deepEqual(t.invokes[0],{name:'ruletas',body:{accion:'girar',cuenta:'a',base:PRE,op:pending(t).op,modo:'golden',precioEsperado:1}});
 assert.equal(t.ctx.G.golden,100);assert.equal(t.hydrated.length,0);assert.equal(t.ctx.ruletasPendiente(),true);
 release({data:respuesta(),error:null});await p;assert.equal(t.ctx.G.golden,99);assert.equal(t.hydrated.length,1);assert.equal(t.ctx.SAVE_BASES.get('a'),ACK);assert.equal(pending(t),null);assert.equal(t.ctx.ruletasPendiente(),false);assert.equal(t.unlocks.length,1);
});
test('guardado previo sin ACK no permite girar ni crear un recibo',async()=>{
 const t=montar({save:async()=>({data:{ok:false},error:null})});await assert.rejects(t.ctx.ruletasGirar('objetos',0),/No se confirmó/);assert.equal(t.invokes.length,0);assert.equal(t.saves.length,2);assert.equal(pending(t),null);assert.equal(t.ctx.G.plata,1000);assert.equal(t.unlocks.length,1);
});
test('doble petición durante un giro no envía otro cobro ni sorteo',async()=>{
 let release;const t=montar({invoke:()=>new Promise(r=>release=r)}),p=t.ctx.ruletasGirar('objetos',100);
 await assert.rejects(t.ctx.ruletasGirar('objetos',100),/operación en curso/);await tick();assert.equal(t.invokes.length,1);assert.equal(t.saves.length,1);release({data:respuesta({recibo:{modo:'objetos',roll:6000,premio:{item:'stone',kind:'pick',qty:5}}}),error:null});await p;assert.equal(t.invokes.length,1);
});
test('respuesta perdida conserva op durable, bloquea guardados y nuevo giro; luego sólo comprueba ese mismo UUID',async()=>{
 let fail=true;const t=montar({invoke:async body=>{if(fail)throw Error('respuesta perdida');return {data:respuesta({repetido:true}),error:null};}});
 await assert.rejects(t.ctx.ruletasGirar('golden',1),/respuesta perdida/);const p=pending(t);assert(p?.op);assert(t.ctx.SAVE_CONFLICTOS.has('a'));assert.equal(t.hydrated.length,0);assert.equal(t.ctx.G.golden,100);
 const ns=t.saves.length;await t.ctx.saveFarm(true);assert.equal(t.saves.length,ns);await assert.rejects(t.ctx.ruletasGirar('golden',1),/resultado pendiente/);assert.equal(t.invokes.length,1);
 fail=false;const r=await t.ctx.ruletasConsultar();assert(r.recibo);assert.equal(t.invokes.length,2);assert.deepEqual(t.invokes[1].body,{accion:'comprobar',cuenta:'a',op:p.op,modo:'golden',precioEsperado:1});assert.equal(t.invokes.filter(x=>x.body.accion==='girar').length,1);assert.equal(pending(t),null);assert.equal(t.ctx.G.golden,99);assert(!t.ctx.SAVE_CONFLICTOS.has('a'));assert(t.storage.has(Array.from(t.storage.keys()).find(k=>k.startsWith('gf-conflicto-respaldo-'))));
});
test('recibo perdido sobrevive una sesión JS nueva y se reconcilia sin volver a girar',async()=>{
 const first=montar({invoke:async()=>{throw Error('timeout');}});await assert.rejects(first.ctx.ruletasGirar('objetos',0));const op=pending(first).op;
 const fresh=montar({storage:first.storage,invoke:async()=>({data:respuesta({recibo:{op,modo:'objetos',roll:8000,premio:{kind:'dish',item:'papa_asada',qty:5}}}),error:null})});assert.equal(fresh.ctx.ruletasPendiente(),true);await fresh.ctx.ruletasConsultar();assert.equal(fresh.invokes.length,1);assert.equal(fresh.invokes[0].body.accion,'comprobar');assert.equal(fresh.invokes[0].body.op,op);assert.equal(pending(fresh),null);assert.equal(fresh.hydrated.length,1);
});
test('estado sin pendiente no muta granja; cancelación sellada sí sincroniza y permite otro giro',async()=>{
 const t=montar({invoke:async()=>({data:respuesta(),error:null})});await t.ctx.ruletasConsultar();assert.deepEqual(t.invokes[0].body,{accion:'estado',cuenta:'a'});assert.equal(t.hydrated.length,0);assert.equal(t.saves.length,0);assert.equal(t.ctx.G.golden,100);
 const c=montar({invoke:async()=>({data:respuesta({data:plain(initial),found:true,cancelado:true,recibo:{cancelado:true,modo:'golden',premio:null}}),error:null})});guardarPendiente(c);c.ctx.SAVE_CONFLICTOS.add('a');const r=await c.ctx.ruletasConsultar();assert.equal(r.cancelado,true);assert.equal(c.invokes[0].body.accion,'comprobar');assert.equal(c.ctx.G.golden,100);assert.equal(pending(c),null);assert.equal(c.ctx.ruletasPendiente(),false);assert.equal(c.ctx.SAVE_BASES.get('a'),ACK);
});
test('cambio de cuenta durante ACK no hidrata ni limpia la operación de ninguna otra cuenta',async()=>{
 let release;const t=montar({invoke:()=>new Promise(r=>release=r)}),p=t.ctx.ruletasGirar('golden',1);await tick();const original=pending(t);guardarPendiente(t,'b','objetos',0);t.ctx.UID='b';t.ctx.G={golden:7,plata:33};release({data:respuesta(),error:null});await assert.rejects(p,/cuenta cambió/);assert.equal(t.hydrated.length,0);assert.equal(t.ctx.G.golden,7);assert.equal(pending(t,'a').op,original.op);assert(pending(t,'b'));assert(t.ctx.SAVE_CONFLICTOS.has('a'));assert(!t.ctx.SAVE_CONFLICTOS.has('b'));assert.equal(t.unlocks.length,1);
});
test('cambio de cuenta durante consulta no presenta estado ni hidrata en la nueva cuenta',async()=>{
 let release;const t=montar({invoke:()=>new Promise(r=>release=r)}),p=t.ctx.ruletasConsultar();await tick();t.ctx.UID='b';release({data:respuesta(),error:null});await assert.rejects(p,/cuenta cambió/);assert.equal(t.hydrated.length,0);assert.equal(t.ctx.SAVE_BASES.get('a'),BASE);
});
test('almacenamiento fallido impide el envío; pendiente ajeno o conflicto previo tampoco se pisan',async()=>{
 const t=montar({writeFail:true});await assert.rejects(t.ctx.ruletasGirar('golden',1),/storage full/);assert.equal(t.invokes.length,0);assert.equal(t.hydrated.length,0);assert.equal(t.ctx.G.golden,100);assert.equal(t.unlocks.length,1);
 const other=montar();other.storage.set('gf-venta-pendiente-qa-project-a',JSON.stringify({cuenta:'a',p2p:{accion:'comprar'},op:'p2p'}));await assert.rejects(other.ctx.ruletasGirar('golden',1),/resultado pendiente/);assert.equal(pending(other).op,'p2p');assert.equal(other.invokes.length,0);
 const conflict=montar();conflict.ctx.SAVE_CONFLICTOS.add('a');await assert.rejects(conflict.ctx.ruletasGirar('golden',1),/resultado pendiente/);assert.equal(conflict.invokes.length,0);
});
test('el siguiente saveFarm real usa updated_at completo del ACK, incluidos sus microsegundos',async()=>{
 const t=montar();await t.ctx.ruletasGirar('golden',1);t.ctx.G.res.madera++;await t.ctx.saveFarm(true);assert.equal(t.saves.length,2);assert.equal(t.saves[1].base,ACK);assert.equal(t.saves[1].data.golden,99);assert.equal(t.saves[1].data.res.madera,18);assert.equal(t.ctx.SAVE_CONFIRMACIONES.get('a'),2);
});
test('respuesta de éxito incompleta no altera G ni borra el identificador durable',async()=>{
 const t=montar({invoke:async()=>({data:{ok:true,estado:{},recibo:{}},error:null})});await assert.rejects(t.ctx.ruletasGirar('golden',1),/guardado confirmado/);assert.equal(t.hydrated.length,0);assert.equal(t.ctx.G.golden,100);assert(pending(t));assert(t.ctx.SAVE_CONFLICTOS.has('a'));
});
test('rechazo definitivo no cobra; conflicto409 conserva el bloqueo para revisar el guardado',async()=>{
 for(const status of [400,409,503]){const t=montar({invoke:async()=>({data:null,error:{context:{status,json:async()=>({error:'rechazo controlado'})}}})});await assert.rejects(t.ctx.ruletasGirar('golden',1),/rechazo controlado/);assert.equal(t.ctx.G.golden,100);assert.equal(t.hydrated.length,0);assert.equal(!!pending(t),status===503);assert.equal(t.ctx.SAVE_CONFLICTOS.has('a'),status!==400);}
});
