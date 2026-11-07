/* Pruebas de la interfaz con recibos ficticios. Sin conexión ni cuentas reales. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const local=path.join(__dirname,'ruletas.js'),script=fs.readFileSync(fs.existsSync(local)?local:path.join(__dirname,'../public/game/ruletas.js'),'utf8');
const premios=[['madera','res',5,3000,'Madera'],['piedra','res',5,2500,'Piedra'],['stone','pick',5,1500,'Pico de piedra'],['papa','res',5,1200,'Papa'],['papa_asada','dish',5,800,'Papa asada'],['flecha','res',20,500,'Flechas'],['espada_madera','arm',1,300,'Espada de madera'],['arco_piedra','arm',1,150,'Arco de piedra'],['espada_bronce','arm',1,40,'Espada de bronce'],['mazo_oro','arm',1,10,'Mazo de oro']].map(([item,kind,qty,weight,label])=>({item,kind,qty,weight,label}));
function estado(usados=0){return {habilitado:true,juegoAbierto:true,config:{golden:{ticket:1,seed:10,aporteBote:.8,aporteReserva:.2,pesoJackpot:20,escala:10000},objetos:{gratis:3,max:5,precios:[100,200],premios}},bote:10,reserva:0,financiado:true,dia:20763,usados,gratisRestantes:Math.max(0,3-usados),pagosRestantes:Math.max(0,5-Math.max(3,usados)),precioPlata:usados<3?0:usados===3?100:200,reiniciaAt:1794096000000};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function montar(opts={}){
 const dom=new JSDOM('<!doctype html><button id="entrada">Ruletas</button>',{url:'https://goldenfarm.test',runScripts:'outside-only'}),w=dom.window,d=w.document,timers=new Map(),calls=[],confirmaciones=[],errors=[];
 let current=estado(opts.usados||0),pending=false,id=0,queries=0,entregas=0;
 if(opts.status)current={...current,...opts.status};
 w.G={golden:100,plata:1000,...opts.saldos};w.matchMedia=()=>({matches:!!opts.reduced});
 w.setTimeout=fn=>{timers.set(++id,fn);return id;};w.clearTimeout=i=>timers.delete(i);w.setInterval=()=>{throw new Error('No debe haber sondeos');};
 w.openOv=id=>d.getElementById(id).classList.add('show');w.closeOv=id=>d.getElementById(id).classList.remove('show');
 w.askConfirm=(texto,fn,config)=>confirmaciones.push({texto,fn,config});w.mkPendCount=()=>entregas;w.mkPendCobrar=()=>{entregas=0;};w.ruletasPendiente=()=>pending;
 w.ruletasConsultar=async()=>{queries++;return opts.consultar?opts.consultar():{ok:true,estado:current,recibo:null,found:false};};
 w.ruletasGirar=async(modo,coste)=>{
  calls.push({modo,coste});if(opts.girar)return opts.girar(modo,coste);
  if(modo==='objetos'){const usados=current.usados+1;w.G.plata-=coste;current={...estado(usados),bote:current.bote,reserva:current.reserva};entregas++;return {ok:true,estado:current,recibo:{modo,roll:9995,segmentIndex:9,premio:premios[9],coste}};}
  w.G.golden-=coste;current={...current,bote:current.bote+.8,reserva:current.reserva+.2};return {ok:true,estado:current,recibo:{modo,roll:5000,segmentIndex:1,goldenWin:false,payout:0,coste}};
 };
 w.addEventListener('error',e=>errors.push(e.message));w.eval(script);
 const $=s=>d.querySelector(s);
 function fin(modo){const ev=new w.Event('transitionend');ev.propertyName='transform';$(modo==='golden'?'.gf-golden-wheel':'.gf-object-wheel').dispatchEvent(ev);}
 async function abrir(){w.abrirRuletas();await tick();}
 async function girar(modo){$(modo==='golden'?'.gf-spin-golden':'.gf-spin-objects').click();if(confirmaciones.length)confirmaciones.shift().fn();await tick();fin(modo);await tick();}
 return {w,d,$,timers,calls,confirmaciones,errors,fin,abrir,girar,setPending:v=>pending=v,get queries(){return queries;},close:()=>w.close()};
}
test('monta una ventana habitual, consulta sin sortear ni cobrar, renderiza catálogo y no contiene controles de demo',async()=>{
 const t=montar();assert.equal(t.d.querySelectorAll('#ov-ruletas').length,1);assert(t.$('#ov-ruletas>.card'));await t.abrir();assert.equal(t.queries,1);assert.equal(t.calls.length,0);assert.equal(t.$('[data-pot]').textContent,'10');assert.equal(t.$('.gf-prizes').children.length,10);assert.equal(t.$('[data-r-saldo-falso]'),null);assert(!/gf-example|gf-restart|Math\.random|saldos ficticios|escena preparada/i.test(script));assert.deepEqual(t.errors,[]);t.close();
});
test('cada giro pagado exige confirmación y pasa al servidor el coste exacto aceptado',async()=>{
 const t=montar();await t.abrir();t.$('.gf-spin-golden').click();assert.equal(t.calls.length,0);assert.equal(t.confirmaciones.length,1);assert.match(t.confirmaciones[0].texto,/1 Golden/);assert.match(t.confirmaciones[0].texto,/0,2 %/);t.confirmaciones.shift().fn();await tick();assert.deepEqual(t.calls,[{modo:'golden',coste:1}]);t.fin('golden');await tick();assert.equal(t.$('[data-golden-balance]').textContent,'99');assert.match(t.$('[data-golden-result]').textContent,/sin premio/);assert.equal(t.timers.size,0);t.close();
});
test('tres giros gratis, dos precios crecientes, límite de cinco y premio con cantidad correcta',async()=>{
 const t=montar();await t.abrir();t.$('#gf-tab-objects').click();for(let i=0;i<5;i++){await t.girar('objetos');assert.equal(t.$('[data-spin-count]').textContent,String(i+1));assert.match(t.$('[data-object-result]').textContent,/1 × Mazo de oro/);assert.equal(t.timers.size,0);}
 assert.deepEqual(t.calls.map(c=>c.coste),[0,0,0,100,200]);assert.equal(t.$('[data-plata-balance]').textContent,'700');assert(t.$('.gf-spin-objects').disabled);t.$('.gf-spin-objects').click();assert.equal(t.calls.length,5);assert.match(t.$('[data-object-reason]').textContent,/5 giros/);t.close();
});
test('doble clic y reapertura durante petición o animación no generan otra operación ni otra consulta',async()=>{
 let resolve;const t=montar({girar:()=>new Promise(r=>resolve=r)});await t.abrir();t.$('#gf-tab-objects').click();t.$('.gf-spin-objects').click();t.$('.gf-spin-objects').click();assert.equal(t.calls.length,1);assert(t.$('#gf-tab-golden').disabled);t.$('[data-close]').click();t.w.abrirRuletas();assert.equal(t.queries,1);assert(!t.$('[data-object-result]').textContent.includes('Mazo'));
 resolve({estado:estado(1),recibo:{modo:'objetos',roll:9995,premio:premios[9]}});await tick();t.$('.gf-spin-objects').click();assert.equal(t.calls.length,1);t.fin('objetos');await tick();assert.equal(t.timers.size,0);assert.match(t.$('[data-object-result]').textContent,/Mazo de oro/);assert(!t.$('.gf-spin-objects').disabled);t.close();
});
test('si falla la entrega, bloquea nuevos giros y comprueba el recibo sin reenviar el cobro',async()=>{
 let first=true;const receipt={modo:'objetos',roll:9995,premio:premios[9]};const t=montar({consultar:async()=>first?{estado:estado(),found:false}:{estado:estado(1),found:true,recibo:receipt},girar:async()=>{t.setPending(true);first=false;throw new Error('Resultado sin confirmar');}});
 await t.abrir();t.$('#gf-tab-objects').click();t.$('.gf-spin-objects').click();await tick();assert.equal(t.calls.length,1);assert(t.$('.gf-spin-objects').disabled);assert.equal(t.$('[data-r-actualizar]').textContent,'Comprobar giro');t.$('[data-r-actualizar]').click();await tick();assert.equal(t.calls.length,1);assert.equal(t.queries,2);assert.match(t.$('[data-object-result]').textContent,/giro comprobado/);assert(t.$('.gf-spin-objects').disabled);t.close();
});
test('falta de Plata explica el coste sin afirmar que ya se agotaron los cinco giros',async()=>{
 const t=montar({usados:3,saldos:{plata:50}});await t.abrir();t.$('#gf-tab-objects').click();assert(t.$('.gf-spin-objects').disabled);assert.match(t.$('[data-object-reason]').textContent,/Plata insuficiente/);assert.equal(t.$('[data-object-cost]').textContent,'Próximo giro: 100 Plata');assert.equal(t.calls.length,0);t.close();
});
test('el premio temprano se presenta completo y deja el siguiente bote en preparación',async()=>{
 const t=montar({girar:async()=>{t.w.G.golden=109.8;return {estado:{...estado(),bote:0,reserva:.2,financiado:false},recibo:{modo:'golden',roll:10,goldenWin:true,payout:10.8,premio:{kind:'golden',item:'golden',qty:10.8}}};}});await t.abrir();await t.girar('golden');assert.match(t.$('[data-golden-result]').textContent,/10,8 Golden/);assert.equal(t.$('[data-golden-balance]').textContent,'109,8');assert.equal(t.$('[data-pot]').textContent,'0');assert(t.$('.gf-spin-golden').disabled);assert.match(t.$('[data-golden-reason]').textContent,/Próximo bote en preparación/);t.close();
});
test('estado pausado, consulta fallida y texto de catálogo no habilitan cobros ni inyectan HTML',async()=>{
 const t=montar({status:{habilitado:false}});await t.abrir();assert(t.$('.gf-spin-golden').disabled);assert.match(t.$('[data-golden-reason]').textContent,/no están disponibles/);t.close();
 const fail=montar({consultar:async()=>{throw new Error('Sin conexión');}});await fail.abrir();assert(fail.$('.gf-spin-golden').disabled);assert.match(fail.$('[data-r-estado]').textContent,/Sin conexión/);fail.close();
 const e=estado();e.config.objetos.premios=[{...premios[0],label:'<img src=x onerror=alert(1)>'}];const safe=montar({consultar:async()=>({estado:e})});await safe.abrir();assert.equal(safe.d.querySelectorAll('[onerror]').length,0);assert.match(safe.$('.gf-prizes').textContent,/<img src=x/);safe.close();
});
test('movimiento reducido usa el fin breve sin un temporizador persistente',async()=>{
 const t=montar({reduced:true});await t.abrir();t.$('#gf-tab-objects').click();t.$('.gf-spin-objects').click();await tick();assert.equal(t.timers.size,1);const fn=t.timers.values().next().value;fn();await tick();assert.equal(t.timers.size,0);assert(!t.$('.gf-spin-objects').disabled);assert.deepEqual(t.errors,[]);t.close();
});
test('una cancelación comprobada no muestra premio, derrota ni animación',async()=>{
 const base=estado(),cancelado={modo:'objetos',cancelado:true,premio:null};const t=montar({consultar:async()=>({estado:base,found:true,cancelado:true,recibo:cancelado})});await t.abrir();assert.equal(t.$('[data-r-estado]').textContent,'Giro no realizado; no se cobró');assert(!t.$('[data-object-result]').textContent.includes('0 ×'));assert.equal(t.calls.length,0);assert.equal(t.timers.size,0);t.close();
 const spin=montar({girar:async()=>({estado:base,cancelado:true,recibo:cancelado})});await spin.abrir();spin.$('#gf-tab-objects').click();spin.$('.gf-spin-objects').click();await tick();assert.equal(spin.$('[data-r-estado]').textContent,'Giro no realizado; no se cobró');assert.equal(spin.timers.size,0);assert(!spin.$('[data-object-result]').textContent.includes('0 ×'));assert(!spin.$('.gf-spin-objects').disabled);spin.close();
});
