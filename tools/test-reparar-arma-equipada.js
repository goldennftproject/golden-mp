const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),{ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root);
c.estadoDeCero();c.document=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8')).window.document;
const d=c.document;let hud=0,slots=0;
c.isOpen=id=>id==='ov-forge';c.refreshHud=()=>hud++;c.syncSlots=()=>slots++;c.forgeWork=()=>{};c.toast=()=>{};c.log=()=>{};
const defs=vm.runInContext('ARM_DEF',c);
for(const id of Object.keys(defs)){
 const def=defs[id];c.G.weapons={[id]:{dur:0,plus:2,runas:{fortuna:1}}};c.G.gear.arma=id;
 for(const [k,v] of Object.entries(def.repair)){if(k==='plata')c.G.plata=v*2;else c.G.res[k]=v*2;}
 c.refreshForge();const button=d.querySelector('[data-rarm="'+id+'"]');assert.ok(button&&!button.disabled,id+' rota equipada reparable');
 const before={...c.G.res},money=c.G.plata;hud=0;slots=0;button.click();
 assert.equal(c.G.weapons[id].dur,def.dur);assert.equal(c.G.gear.arma,id);assert.equal(c.armaEq(),id);
 assert.equal(c.G.weapons[id].plus,2);assert.deepEqual(c.G.weapons[id].runas,{fortuna:1});
 assert.ok(hud>0,'actualiza el arma activa sin reequipar');assert.ok(slots>0,'actualiza sus iconos');
 for(const [k,v] of Object.entries(def.repair))assert.equal(k==='plata'?c.G.plata:c.G.res[k],(k==='plata'?money:before[k])-v);
 assert.equal(d.querySelector('[data-rarm="'+id+'"]'),null,'no permite cobrar otra reparación al 100%');
 c.repairWeapon(id);assert.equal(c.G.weapons[id].dur,def.dur);
 c.G.weapons[id].dur=0;for(const k of Object.keys(def.repair)){if(k==='plata')c.G.plata=0;else c.G.res[k]=0;}
 c.refreshForge();assert.equal(d.querySelector('[data-rarm="'+id+'"]').disabled,true);c.repairWeapon(id);assert.equal(c.G.weapons[id].dur,0,'sin recursos no repara');
}
console.log('OK: todas las armas rotas equipadas se reparan desde el botón, conservan equipo/mejoras, cobran una vez y actualizan HUD e iconos; faltantes bloqueados.');
