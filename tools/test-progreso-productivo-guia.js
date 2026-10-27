const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const {ctx} = require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
const run = code => vm.runInContext(code,ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {}; ctx.refreshHud = () => {};
run('estadoDeCero(); G.skills.farming=0; G.skills.tala=0; G.skills.mining=0; G.level=1;');
run("addXp('tala',20)");
assert.ok(ctx.G.level > 1,'talar actualiza el nivel de granja en el mismo evento, sin esperar otra acción');
run('estadoDeCero(); G.tuto={done:true}; G.planos={}; G.obras={}; G.level=3; G.plata=20; G.res.madera=2; G.res.piedra=2;');
ctx.dailyState=()=>({claimable:false}); ctx.cartaAbueloPendiente=()=>false;
let guide = run('brujula()');
assert.match(guide.txt,/Puedes comprar la expansión 1/,'la brújula consulta la cartera, no G.res.plata');
assert.equal(guide.target,'market');
ctx.G.plata=0;
guide=run('brujula()');
assert.match(guide.txt,/20 de plata/);
assert.equal(guide.target,'market','si falta plata dirige al mercado, no a una roca');
ctx.G.res.madera=0;
guide=run('brujula()');
assert.equal(guide.target,'tree','prioriza el material que se puede recolectar antes de sugerir vender');
ctx.G.res.madera=2; ctx.G.res.piedra=0;
assert.equal(run('brujula()').target,'rock');
run('G.level=1;'); ctx.metaSemana=()=>null;
guide=run('brujula()');
assert.match(guide.txt,/tala/);
assert.doesNotMatch(guide.txt,/pesca/,'pescar no aporta XP productiva directamente');
console.log('OK: Tala sube la granja y la brújula reconoce plata, materiales y oficios productivos.');
// Todos los escalones de cada especialización, con la función real de otorgar XP.
// Es una prueba de elegibilidad y disparo, no una estimación de días de juego.
for (const oficio of ['tala','mining']) {
  for(let level=2;level<=25;level++) {
    run('estadoDeCero();');
    ctx.G.level=level-1;
    const weight=oficio==='tala'?1.5:2;
    const required=Math.ceil(run(`FARM_XP_LVLS[${level}]`)/weight);
    const reqSkill=run(`farmEspecialidadReq(${level})`);
    let skillXp=required;
    while(run(`skillInfo(${skillXp},'${oficio}').lvl`)<reqSkill) skillXp++;
    run(`addXp('${oficio}',${skillXp})`);
    assert.ok(ctx.G.level>=level,`${oficio}: transición al nivel ${level}`);
    const saved=JSON.parse(run('JSON.stringify(snapshot())'));
    ctx.qaRoundtrip=saved;
    const xp=run('farmXpProductiva()');
    run('estadoDeCero(); hydrate(qaRoundtrip);');
    assert.equal(run('farmXpProductiva()'),xp,'recargar conserva XP productiva');
  }
}
const logs=[],celebraciones=[];ctx.log=s=>logs.push(s);ctx.celebrate=s=>celebraciones.push(s);
run('estadoDeCero();');
const cooking8=run('COOK_LVLS[8]');
run(`G.skills.cooking=0; addCookXp(${cooking8});`);
assert.equal(run('cookLevel()'),8);
assert.ok(logs.some(s=>/Cocina subió/.test(s)));
assert.ok(logs.every(s=>!/vender platos por/.test(s)),'no anuncia una venta deshabilitada');
assert.ok(celebraciones.every(s=>!/Venta en \$Golden/.test(s.reward||'')),'tampoco la promete en la celebración');
console.log('OK: 48 transiciones productivas y recargas hasta nivel 25, sin prometer un plazo de progreso.');
