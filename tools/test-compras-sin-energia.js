'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
const run=s=>vm.runInContext(s,c),t=1800000000000;
c.nowMs=()=>t;
for(const k of ['celebrate','toast','log','saveFarm','refreshHud','refreshSeedShop','refreshHotbar','refreshForge','syncSlots','tutoEvent'])c[k]=()=>{};
c.isOpen=()=>false;
function inicio(energia=0){c.estadoDeCero();c.G.tuto={done:true};c.G.plata=10000;c.G.golden=100;c.G.energiaGranja={v:1,actual:energia,at:t};}
for(const energia of [0,50]){
 inicio(energia);const n=c.G.seeds.papa||0;c.buySeed('papa',3);assert.equal(c.G.seeds.papa,n+3);assert.equal(c.G.energiaGranja.actual,energia);
 inicio(energia);const h=c.G.tools.axe||0;c.comprarEmergencia('axe');assert.ok(c.G.tools.axe>h);assert.equal(c.G.energiaGranja.actual,energia);
 inicio(energia);const tipo=run('CONT_ORDER[0]'),antes=c.contsTengo(tipo);assert.equal(c.comprarCont(tipo),true);assert.equal(c.contsTengo(tipo),antes+1);assert.equal(c.G.energiaGranja.actual,energia);
 assert.equal(c.G.actividadAcciones.craft||0,0,'compras no acreditan actividad de fabricación');
}

for(const energia of [0,50]){
 inicio(energia);const antes=c.G.tools.axe||0;c.craftTool('axe');assert.equal(c.G.tools.axe,antes+1);assert.equal(c.G.energiaGranja.actual,energia);assert.equal(c.G.plata,9998);
 inicio(energia);c.G.produccion.vipHasta=t+86400000;const h=c.G.tools.axe||0;c.craftTool('axe',5);assert.equal(c.G.tools.axe,h+5);assert.equal(c.G.energiaGranja.actual,energia);assert.equal(c.G.plata,9990);assert.equal(c.G.actividadAcciones.craft||0,0);
 inicio(energia);c.G.res={madera:100,piedra:100};const n=c.pickCount('stone');c.craftPick('stone');assert.ok(c.pickCount('stone')>n);assert.equal(c.G.energiaGranja.actual,energia);
}
inicio(0);const antes=c.G.tools.axe||0;c.craftTool('axe',5);assert.equal(c.G.tools.axe||0,antes,'lotes siguen siendo VIP');
inicio(50);assert.equal(c.energiaGranjaPagar('plant'),true);assert.equal(c.G.energiaGranja.actual,49);
console.log('OK: compras y fabricación individual/VIP x5 sin energía; monedas, recetas, VIP y siembra preservados.');
