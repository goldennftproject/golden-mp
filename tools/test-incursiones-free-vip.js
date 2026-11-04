'use strict';
// Incursión de prueba única Sin VIP; VIP mantiene tres salidas al día UTC.
// Usa código real en memoria: no red, cuentas ni escrituras.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{ctx:c}=require('./arrancar-el-juego.contexto.js').arrancar(root);
const raw=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');
const rules=raw.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0],server={};
vm.createContext(server);vm.runInContext(rules.slice(rules.indexOf('const VERSION')),server);
const clone=d=>JSON.parse(JSON.stringify(d)),alerts=[];
const steps=vm.runInContext('TUTO_STEPS',c),step=steps.findIndex(s=>s.id==='incursion');
assert.equal(step,25,'el paso conservado coincide con el testigo del servidor');
let t,saves=0;
c.Date=class extends Date{constructor(...args){super(...(args.length?args:[t]));}static now(){return t;}};
c.nowMs=()=>t;c.toast=s=>alerts.push(String(s));c.log=()=>{};c.refreshHud=()=>{};c.saveFarm=()=>saves++;
c.isOpen=()=>false;c.mostrarResumenZona=()=>{};c.syncSlots=()=>{};c.celebrate=()=>{};
function fresh(vip=false,tutorial=true){
 t=Date.UTC(2026,10,4,12);c.estadoDeCero();c.G.produccion.vipHasta=vip?t+86400000:0;
 c.G.gear.arma='espada_bronce';c.G.weapons.espada_bronce={dur:10000};
 c.G.tuto={done:!tutorial,step:tutorial?step:steps.length,n:0,v:c.TUTO_VER};
 c.G.energiaGranja={v:1,actual:0,at:t};c.GF.scene='farm';alerts.length=0;saves=0;
 assert.equal(c.vipVigente(),vip);assert.equal(c.armaEq(),'espada_bronce');assert.ok(c.incPoder()>0);
}
const validate=(a,b)=>Array.from(server.protegerEconomia(a,b,t));
function reject(change,re){fresh();change();const energy=clone(c.G.energiaGranja),gold=c.G.golden;
 c.incSalir('zn1');assert.equal(c.G.incursion,null);assert.equal(c.incCupoHoy().n,0);
 assert.deepEqual(clone(c.G.energiaGranja),energy);assert.equal(c.G.golden,gold);assert.equal(saves,0);
 assert.ok(alerts.some(s=>re.test(s)),alerts.join(' | '));}
fresh();assert.equal(c.incursionDisponiblePorTutorial(),true);const pending=clone(c.snapshot());
c.incSalir('zn1');assert.equal(c.G.incursion.zona,'zn1');assert.equal(c.G.incursion.total,600000);
assert.equal(c.G.tuto.step,step+1);assert.equal(c.tutoActivo().id,'expandir');assert.equal(c.statGet('incursion'),1);
assert.equal(c.G.incursionTutorialUsada,true);assert.equal(c.incursionDisponiblePorTutorial(),false);
const first=clone(c.snapshot());assert.deepEqual(validate(pending,first),[]);assert.equal(first.incursionTutorialUsada,true);assert.ok(saves>0);
const replay=clone(first);assert.deepEqual(validate(first,replay),[]);assert.equal(replay.incDia.n,1);
const running=clone(c.G.incursion);c.incSalir('zn1');assert.deepEqual(clone(c.G.incursion),running);assert.equal(c.incCupoHoy().n,1);
t=c.G.incursion.endAt;c.incResolver();assert.equal(c.G.incursion,null);alerts.length=0;c.incSalir('zn1');
assert.equal(c.G.incursion,null);assert.ok(alerts.some(s=>/VIP/.test(s)));
const finished=clone(c.snapshot());assert.deepEqual(validate(first,finished),[]);
for(const flag of [false,undefined]){const forged=clone(finished);
 if(flag===undefined)delete forged.incursionTutorialUsada;else forged.incursionTutorialUsada=flag;
 forged.stats.incursion._=0;forged.tuto={step,n:0,done:false,v:c.TUTO_VER};
 assert.deepEqual(validate(finished,forged),[]);assert.equal(forged.incursionTutorialUsada,true);
 const another=clone(first);another.incursion.endAt=t+600000;
 assert.ok(validate(forged,another).some(s=>/prueba única/.test(s)));}
for(const alter of [d=>d.tuto.step--,d=>d.tuto.done=true,d=>d.stats={incursion:{_:1}}]){
 const other=clone(pending);alter(other);assert.ok(validate(other,clone(first)).some(s=>/prueba única/.test(s)));}
reject(()=>c.G.tuto.step--,/VIP/);reject(()=>c.G.tuto.done=true,/VIP/);
reject(()=>c.G.stats.incursion={_:1},/VIP/);reject(()=>c.G.incursionTutorialUsada=true,/VIP/);
reject(()=>c.G.gear.arma=null,/arma equipada/);reject(()=>c.G.weapons.espada_bronce.dur=5,/muy gastada/);
reject(()=>c.GF.scene='forest',/Estás en la Zona/);
fresh();assert.equal(c.incursionDisponiblePorTutorial('zn2'),false);c.incSalir('zn2');assert.equal(c.G.incursion,null);assert.equal(c.incCupoHoy().n,0);assert.ok(alerts.some(s=>/Zona Negra I/.test(s)));
fresh(true,false);c.incSalir('zn2');assert.equal(c.G.incursion,null);assert.equal(c.incCupoHoy().n,0);assert.ok(alerts.some(s=>/Combate 10/.test(s)));
fresh(true,false);const energy=clone(c.G.energiaGranja),gold=c.G.golden;let accepted=clone(c.snapshot());
for(let n=1;n<=3;n++){c.incSalir('zn1');assert.equal(c.G.incursion.zona,'zn1');assert.equal(c.incCupoHoy().n,n);
 const next=clone(c.snapshot());assert.deepEqual(validate(accepted,next),[]);assert.equal(next.incDia.n,n);
 t=c.G.incursion.endAt;c.incResolver();const done=clone(c.snapshot());assert.deepEqual(validate(next,done),[]);accepted=done;}
const beforeFourth=clone(c.snapshot());alerts.length=0;c.incSalir('zn1');assert.equal(c.G.incursion,null);assert.equal(c.incCupoHoy().n,3);
assert.deepEqual(clone(c.snapshot()),beforeFourth);assert.ok(alerts.some(s=>/3 incursiones de hoy/.test(s)));
const fourth=clone(accepted);fourth.incDia.n=0;fourth.incursion={zona:'zn1',endAt:t+600000,total:600000,poder:c.incPoder(),arma:c.armaEq()};
assert.ok(validate(accepted,fourth).some(s=>/3 incursiones/.test(s)));
const lower=clone(accepted);lower.incDia.n=0;assert.deepEqual(validate(accepted,lower),[]);assert.equal(lower.incDia.n,3);
assert.equal(c.G.golden,gold);assert.deepEqual(clone(c.G.energiaGranja),energy);
t=Date.UTC(2026,10,5,0);assert.equal(c.incCupoHoy().n,0);c.incSalir('zn1');const nextDay=clone(c.snapshot());
assert.deepEqual(validate(accepted,nextDay),[]);assert.equal(nextDay.incDia.n,1);
fresh();c.incSalir('zn1');t=c.G.incursion.endAt;c.G.stam=0;c.G.stamLastAt=t;c.G.stamFullAt=t+14400000;
const empty=c.incResolver();assert.equal(empty.kills,0);assert.equal(empty.xp,0);assert.equal(c.G.stam,0);
assert.deepEqual(Object.keys(empty.botin),[]);assert.equal(c.G.energiaGranja.actual,0);assert.match(empty.aviso,/estamina/);
fresh(true,false);c.incSalir('zn1');const existing=clone(c.snapshot());t+=86400001;const expired=clone(existing);
assert.deepEqual(validate(existing,expired),[]);assert.deepEqual(expired.incursion,existing.incursion);
const legacy=clone(pending);legacy.incursion=clone(first.incursion);const legacyDone=clone(legacy);legacyDone.incursion=null;
assert.deepEqual(validate(legacy,legacyDone),[]);assert.equal(legacyDone.incursionTutorialUsada,true);
fresh();c.hydrate(clone(first));assert.equal(c.G.tuto.step,step+1);assert.equal(c.G.incursionTutorialUsada,true);
assert.equal(c.incursionDisponiblePorTutorial(),false);
console.log('OK: prueba Free única, paso aceptado, marca permanente/replay/recarga, VIP tres/día UTC, cuarto rechazado en servidor y requisitos/estamina intactos.');
