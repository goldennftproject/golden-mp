const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('supabase/functions/guardar/index.ts','utf8'),c={};vm.createContext(c);vm.runInContext(src.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS ===')[0].replace(/^[\s\S]*?const VERSION/,'const VERSION'),c);
const run=s=>vm.runInContext(s,c);
run(`var t=Date.UTC(2026,9,28),p={plata:3,energiaGranja:{actual:50,at:t},plots:[{state:'dry'},{state:'dry'},{state:'dry'}],seeds:{papa:3},stats:{cosechar:{papa:0}},produccion:{vipHasta:0}},total=0,harvests=0,saleRemainder=0,seedCosts=0,saleTotal=0;
for(var session=0;session<4;session++){
 var at=t+session*4*3600000;
 for(var turn=0;turn<50;turn++){
  var now=at+Math.floor(turn/3)*180000,i=turn%3,q=JSON.parse(JSON.stringify(p));
  var energy=energiaServidor(p,now);q.energiaGranja={actual:energy-1,at:now};q.actividadAcciones={...(p.actividadAcciones||{})};
  if(q.plots[i].state==='dry'){
   if(!q.seeds.papa){q.seeds.papa++;q.plata--;seedCosts++;}
   q.plots[i]={state:'growing',cropKey:'papa',readyAt:now+180000};q.seeds.papa--;q.actividadAcciones.plant=(q.actividadAcciones.plant||0)+1;
  }else{q.plots[i]={state:'dry'};q.stats.cosechar.papa++;q.actividadAcciones.harvest=(q.actividadAcciones.harvest||0)+1;harvests++;var exact=1.2+saleRemainder,payment=Math.floor(exact+1e-9);saleRemainder=exact-payment;q.plata+=payment;saleTotal+=payment;}
  actividadActualizar(p,q,now);p=q;
 }
}`);
assert.equal(run('p.actividadGranja.jornada.energia'),200);assert.equal(run('p.actividadGranja.jornada.plata'),0);assert.equal(run('p.plata'),3+run('saleTotal-seedCosts'));
run("for(const m of JORNADA_MISIONES.filter(m=>['siembra','jornada'].includes(m.id))){const r=jornadaOperacion(p,m.id,'2026-10-28',t+13*3600000,'claim-'+m.id);if(r.error)throw Error(r.error);p=r.data;}");
assert.equal(run('p.actividadGranja.jornada.plata'),3500);
const finalBalance=run('p.plata');
run('var repeat=JSON.parse(JSON.stringify(p));actividadActualizar(p,repeat,t+13*3600000);');assert.equal(run('repeat.plata'),finalBalance,'idle/retry does not mint');
run('var forged=JSON.parse(JSON.stringify(p));forged.actividadGranja.jornada.plata=999999;forged.actividadGranja.bonoTotal=999999;actividadActualizar(p,forged,t+14*3600000);');assert.equal(run('forged.actividadGranja.bonoTotal'),3500,'browser cannot edit reward');
run('var tomorrow=JSON.parse(JSON.stringify(p));actividadActualizar(p,tomorrow,t+86400000);');assert.equal(run('tomorrow.actividadGranja.jornada.plata'),0);assert.equal(run('tomorrow.plata'),finalBalance,'no passive payment at reset');
run('var over=JSON.parse(JSON.stringify(p));jornadaAcreditar(p,over,{plant:1000},t+14*3600000);');assert.equal(run('over.plata'),finalBalance);
const game=require('./arrancar-el-juego.contexto').arrancar(require('node:path').resolve('.')).ctx;
vm.runInContext('G.plata=10;G.actividadGranja=null;actividadGranjaRecibir({v:1,energia:1,registro:{},bonoTotal:25},true);actividadGranjaRecibir({v:1,energia:1,registro:{},bonoTotal:25},true)',game);assert.equal(game.G.plata,35,'ACK only once');
vm.runInContext('actividadGranjaRecibir({v:1,energia:1,registro:{},bonoTotal:5000})',game);assert.equal(game.G.plata,35,'hydrate does not pay again');
console.log(JSON.stringify({ok:true,free:true,investment:0,plots:3,sessions:4,hoursBetweenSessions:4,sessionMinutes:48,productiveEnergy:200,bonusPlata:3500,harvests:run('harvests'),seedCosts:run('seedCosts'),conservativeSales:run('saleTotal'),netPlata:finalBalance-3,note:'Conservative tutorial crops. Seed costs covered by crop sales even at 20% margin floor; initial capital earned by first saved actions. Not a withdrawal or guaranteed USD income.'},null,2));

run('var legacy=JSON.parse(JSON.stringify(p));actividadActualizar(p,legacy,t+16*3600000,undefined,false);');assert.equal(run('legacy.plata'),finalBalance);
run("var growing={plata:10,energiaGranja:{actual:50,at:t},plots:[{state:'growing',cropKey:'papa',readyAt:t+180000}],seeds:{papa:3}};var fakePlant=JSON.parse(JSON.stringify(growing));fakePlant.plots[0].readyAt=t+360000;fakePlant.seeds.papa--;fakePlant.energiaGranja.actual--;fakePlant.actividadAcciones={plant:1};actividadActualizar(growing,fakePlant,t);");assert.equal(run('fakePlant.actividadGranja.jornada.plata'),0,'replanting unready crop cannot pay');
