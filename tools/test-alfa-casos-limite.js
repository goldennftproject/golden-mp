'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(root+'/public/game/save.js','utf8');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':source.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
const run=s=>vm.runInContext(s,c);c.URLSearchParams=URLSearchParams;
for(const k of ['toast','log','refreshHud','syncSlots','refreshInv','refreshHotbar','saveFarm'])c[k]=()=>{};c.isOpen=()=>false;
assert.match(c.mensajeEnlaceAcceso('#error=access_denied&error_code=otp_expired'),/caducado o ya se ha utilizado/);
assert.match(c.mensajeEnlaceAcceso('','?error_code=otp_expired'),/correo de tu granja/);
assert.equal(c.mensajeEnlaceAcceso('#access_token=no-se-lee&refresh_token=no-se-lee'),'');
assert.ok(!c.mensajeEnlaceAcceso('#error=otro&error_description=%3Cscript%3E').includes('script'));
// Bolsa realmente llena: cada tipo debe permanecer pendiente, sin entrega parcial.
for(const kind of ['res','seed','dish','fish','arm']){
 run('estadoDeCero();G.res.piedra=99*invSlots();');
 const key=kind==='res'?'madera':kind==='seed'?'papa':kind==='dish'?run('RECIPE_ORDER[0]'):kind==='fish'?run('FISH_ORDER[0]'):run('Object.keys(ARM_DEF)[0]');
 const payload=kind==='arm'?{dur:7,runa:'conservar'}:null;
 assert.equal(c.canonicalStacks().length,c.invSlots());
 c.G.mkPend=[{kind,item:key,qty:1,payload}];assert.equal(c.mkPendCobrar(),0,kind+' no entra');assert.equal(c.G.mkPend.length,1);assert.equal(c.mkTengo(kind,key),0);
 const saved=JSON.parse(JSON.stringify(c.snapshot()));c.estadoDeCero();c.hydrate(saved);assert.equal(c.G.mkPend.length,1,'sobrevive recarga');
 while(c.canonicalStacks().length>=c.invSlots())c.G.res.piedra-=99;assert.equal(c.mkPendCobrar(),1,kind+" huecos="+c.canonicalStacks().length+" capacidad="+c.invSlots());assert.equal(c.mkTengo(kind,key),1);assert.equal(c.G.mkPend.length,0);assert.equal(c.mkPendCobrar(),0,'no duplica');
 if(kind==='arm')assert.equal(c.G.weapons[key].dur,7);
}
run('estadoDeCero();G.res.piedra=99*(invSlots()-1);G.seeds.papa=1');assert.equal(c.mkPoner('seed','papa',1),true,'apilar no necesita hueco extra');assert.equal(c.G.seeds.papa,2);
assert.equal(c.mkPoner('desconocido','papa',1),false);
console.log('OK: enlaces caducados/reutilizados sin mensajes ajenos, bolsa llena en cinco familias, recarga, liberación de espacio, entrega única y durabilidad.');
