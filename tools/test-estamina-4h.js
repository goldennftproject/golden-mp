/* Contrato 16/10: regeneración CONTINUA, de vacía a llena en 4 h, también offline. */
const assert=require('node:assert/strict'),path=require('node:path');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
let clock=1800000000000;ctx.nowMs=()=>clock;ctx.refreshHud=()=>{};ctx.toast=()=>{};ctx.log=()=>{};ctx.saveFarm=()=>{};
const H=3600000,clone=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' ≈ '+b);
ctx.estadoDeCero();ctx.stamTick();const max=ctx.stamMax();assert.equal(ctx.G.stam,max);
assert.ok(ctx.stamGastar(max));assert.equal(ctx.stamFullEn(),4*H);
for(let i=1;i<=3;i++){clock+=H;ctx.stamTick();near(ctx.G.stam,max*i/4);}
clock+=H;ctx.stamTick();assert.equal(ctx.G.stam,max);assert.equal(ctx.stamFullEn(),0);
ctx.stamGastar(max/2);const until=ctx.G.stamFullAt;ctx.stamTick();assert.equal(ctx.G.stamFullAt,until,'mismo instante no duplica regeneración');
const snap=clone(ctx.snapshot());clock+=H;ctx.hydrate(snap);ctx.stamTick();near(ctx.G.stam,max*.75);
const snapshot2=clone(ctx.snapshot());ctx.hydrate(snapshot2);ctx.stamTick();near(ctx.G.stam,max*.75,'recargar no duplica');
ctx.stamGastar(max/4);near(ctx.G.stam,max/2);assert.equal(ctx.stamFullEn(),2*H);
clock+=10*H;ctx.stamTick();assert.equal(ctx.G.stam,max,'no supera máximo');
ctx.hydrate({...snapshot2,stam:0,stamLastAt:undefined,stamFullAt:clock+2*H});ctx.stamTick();near(ctx.G.stam,max/2);
console.log('OK: estamina continua 4h, gasto incremental, offline, F5 idempotente y migración del reloj anterior.');
