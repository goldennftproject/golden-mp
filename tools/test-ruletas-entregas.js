/* Entregas reales de la ruleta: pendientes, capacidad y guardado; sin red ni cuentas. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const save=fs.readFileSync(path.join(root,'public/game/save.js'),'utf8').replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();');
 const {ctx:c}=require(path.join(root,'tools/arrancar-el-juego.contexto')).arrancar(root,{'game/main.js':'','game/save.js':save});
 for(const k of ['toast','log','refreshHud','syncSlots','refreshInv','refreshP2P','refreshForge'])c[k]=()=>{};
 c.isOpen=()=>false;c.saveFarm=()=>Promise.resolve();c.estadoDeCero();
 return {c,run:s=>vm.runInContext(s,c)};
}
function fill(c){c.G.res={madera:35*99};c.G.seeds={};c.G.dishes={};c.G.fish={};c.G.weapons={};c.G.armor={};c.G.tools={};c.G.picks={owned:{},dur:{},eq:null};c.G.canas={};c.G.invRows=0;}
function serverRules(){const source=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');const body=source.slice(source.indexOf('const VERSION ='),source.indexOf('/* === FIN REGLAS ==='));assert(body,'Reglas desplegadas disponibles');const c={console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite};vm.createContext(c);vm.runInContext(body,c);return c;}

test('cinco picos stone suman cinco usos, preservan otras piezas y no crean recursos ficticios',()=>{
 const {c}=setup();c.G.picks={owned:{bronze:true},dur:{bronze:7},eq:'bronze'};const oldRes=clone(c.G.res);
 assert.equal(c.mkPoner('pick','stone',5,null),true);assert.equal(c.G.picks.dur.stone,5);assert.equal(c.G.picks.owned.stone,true);assert.equal(c.G.picks.dur.bronze,7);assert.equal(c.G.picks.eq,'bronze');assert.deepEqual(clone(c.G.res),oldRes);
 assert.equal(c.mkPoner('pick','stone',5,null),true);assert.equal(c.G.picks.dur.stone,10);
});

test('sin pico equipado, recoger uno habilita su selección real y la cantidad correcta',()=>{
 const {c}=setup();c.G.picks={owned:{},dur:{},eq:null};assert.equal(c.mkPoner('pick','stone',5,null),true);assert.equal(c.pickCount('stone'),5);assert(c.canonicalStacks().some(x=>x.kind==='pick'&&x.key==='stone'));c.equipPick('stone');assert.equal(c.G.picks.eq,'stone');assert.equal(c.equippedPick(),'stone');
});

test('no acepta tipo inexistente, cantidad fraccionaria, negativa ni fuera de enteros seguros',()=>{
 const {c}=setup();const before=clone(c.G);
 for(const [key,qty] of [['missing',5],['__proto__',5],['constructor',5],['stone',0],['stone',-1],['stone',.5],['stone',NaN],['stone',Infinity],['stone',Number.MAX_SAFE_INTEGER+1]])assert.equal(c.mkPoner('pick',key,qty,null),false,key+': '+qty);
 assert.deepEqual(clone(c.G),before);
});

test('si 98 más cinco superan el tope, conserva los cinco pendientes sin recortar ni tocar equipo',()=>{
 const {c}=setup();c.G.picks={owned:{stone:true,bronze:true},dur:{stone:98,bronze:3},eq:'bronze'};const picks=c.G.picks,owned=picks.owned,dur=picks.dur,before=clone(c.G);
 assert.equal(c.mkPoner('pick','stone',5,null),false);assert.deepEqual(clone(c.G),before);assert.equal(c.G.picks,picks);assert.equal(c.G.picks.owned,owned);assert.equal(c.G.picks.dur,dur);
 c.G.mkPend=[{kind:'pick',item:'stone',qty:5,payload:null}];assert.equal(c.mkPendCobrar(),0);assert.equal(c.G.mkPend.length,1);assert.equal(c.G.mkPend[0].qty,5);assert.equal(c.G.picks.dur.stone,98);
});

test('bolsa llena revierte owned, dur y eq completos; no deja una casilla o pico fantasma',()=>{
 const {c}=setup();fill(c);assert.equal(c.canonicalStacks().length,c.invSlots());const picks=c.G.picks,owned=picks.owned,dur=picks.dur,before=clone(c.G);
 assert.equal(c.mkPoner('pick','stone',5,null),false);assert.deepEqual(clone(c.G),before);assert.equal(c.G.picks,picks);assert.equal(c.G.picks.owned,owned);assert.equal(c.G.picks.dur,dur);assert.equal(c.canonicalStacks().length,c.invSlots());
});

test('rollback conserva también la ausencia previa de picks o de sus mapas',()=>{
 for(const shape of ['missing','null','empty','partial']){
  const {c}=setup();fill(c);if(shape==='missing')delete c.G.picks;else if(shape==='null')c.G.picks=null;else if(shape==='empty')c.G.picks={};else c.G.picks={owned:{},eq:null};
  const existed=Object.hasOwn(c.G,'picks'),old=c.G.picks,before=clone(c.G);assert.equal(c.mkPoner('pick','stone',5,null),false,shape);assert.deepEqual(clone(c.G),before,shape);assert.equal(Object.hasOwn(c.G,'picks'),existed,shape);assert.equal(c.G.picks,old,shape);
 }
});

test('arma duplicada mantiene su desgaste, mejoras y runas; el premio se entrega una vez tras liberar la pieza',()=>{
 const {c}=setup();const old={dur:13,plus:3,sockets:['fuego']};c.G.weapons.espada_madera=clone(old);c.G.mkPend=[{kind:'arm',item:'espada_madera',qty:1,payload:{dur:80}}];const pend=clone(c.G.mkPend);
 assert.equal(c.mkPendCobrar(),0);assert.deepEqual(clone(c.G.weapons.espada_madera),old);assert.deepEqual(clone(c.G.mkPend),pend);
 delete c.G.weapons.espada_madera;assert.equal(c.mkPendCobrar(),1);assert.equal(c.G.weapons.espada_madera.dur,80);assert.equal(c.G.mkPend.length,0);assert.equal(c.mkPendCobrar(),0);assert.equal(c.G.weapons.espada_madera.dur,80);
});

test('reclamar un premio real queda limpio en portero; inventar, aumentar o duplicar una entrega es rechazado',()=>{
 const {c}=setup(),s=serverRules();c.G.mkPend=[{kind:'pick',item:'stone',qty:5,payload:null},{kind:'arm',item:'espada_madera',qty:1,payload:{dur:80}},{kind:'res',item:'madera',qty:5,payload:null}];const prev=clone(c.snapshot());
 assert.equal(c.mkPendCobrar(),3);const next=clone(c.snapshot());assert.equal(next.mkPend.length,0);assert.equal(next.picks.dur.stone,5);assert.equal(next.weapons.espada_madera.dur,80);
 const errors=s.protegerEconomia(prev,clone(next),Date.now());assert.deepEqual(Array.from(errors),[]);
 for(const bad of [{kind:'pick',item:'stone',qty:500,payload:null},prev.mkPend[0],{kind:'arm',item:'espada_madera',qty:1,payload:{dur:9999}}]){
  const forged=clone(prev);forged.mkPend.push(clone(bad));assert(s.protegerEconomia(prev,forged,Date.now()).some(x=>/entregas pendientes/i.test(x)),'rechaza crear o alterar una entrega');
 }
});
