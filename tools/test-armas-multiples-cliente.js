/* Copias de armas: ruta real de forja/compra y entrega; sin red ni cuentas reales. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const staged=path.resolve(__dirname,'../public/game');
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const save=fs.readFileSync(path.join(staged,'save.js'),'utf8').replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();');
 const {ctx:c}=require(path.join(root,'tools/arrancar-el-juego.contexto')).arrancar(root,{'game/main.js':'','game/state.js':fs.readFileSync(path.join(staged,'state.js'),'utf8'),'game/ui.js':fs.readFileSync(path.join(staged,'ui.js'),'utf8'),'game/save.js':save});
 const run=s=>vm.runInContext(s,c);
 const events=[];
 for(const k of ['toast','log','refreshHud','syncSlots','refreshInv','refreshP2P','refreshForge','refreshSkills','forgeWork','oficiosSync','celebrate','passEvent','tutoEvent'])c[k]=(...args)=>events.push([k,...args]);
 c.isOpen=()=>false;c.estadoDeCero();
 c.crypto=require('node:crypto').webcrypto;
 c.G.tools={};c.G.picks={owned:{},dur:{},eq:null};c.G.canas={junco:1};c.G.conts={};c.G.armor={};c.G.seeds={};c.G.dishes={};c.G.fish={};c.G.weaponSpares={};c.G.armasUnlocked=true;c.G.weapons={};c.G.armCd={};c.G.gear.arma=null;c.G.res={madera:30};c.G.plata=50;c.G.invRows=0;c.G.tuto={done:true,step:99};
 c.saveFarm=async()=>{run("SAVE_CONFIRMACIONES.set(UID,(SAVE_CONFIRMACIONES.get(UID)||0)+1);SAVE_BASES.set(UID,'2026-11-08T00:00:00.001Z')");};
 let invoke;
 c.testSb={functions:{invoke:(name,req)=>invoke(name,req)}};
 run("sb=testSb;UID='qa-forja';CARGA_OK=true;SOLO_LOCAL=false;SAVE_BASES.set(UID,'2026-11-08T00:00:00.000Z')");
 return {c,run,events,setInvoke:fn=>{invoke=fn;}};
}
function confirmed(c,body){
 const id=body.forja.id,w=vm.runInContext('ARM_DEF['+JSON.stringify(id)+']',c),d=clone(c.snapshot());
 for(const [k,n]of Object.entries(w.cost))d.res[k]-=n;
 d.plata-=w.plata;d.skills.crafting+=10+w.ri*4;d.armCd[id]=Date.now()+w.cd*1000;
 d.mkPend=[...(d.mkPend||[]),{kind:'arm',item:id,qty:1,payload:{dur:w.dur}}];d.forjaOps=[{op:body.op,id}];
 return {data:{ok:true,data:d,updated_at:'2026-11-08T00:00:00.002Z'},error:null};
}

test('forjar otra espera al servidor, conserva la ficha actual y recibe una copia nueva completa',async()=>{
 const {c,run,events,setInvoke}=setup(),id='espada_madera',old={dur:9,plus:4,sockets:['fuego'],marca:{a:1}};
 c.G.weapons[id]=clone(old);c.G.gear.arma=id;
 let release,body;setInvoke((name,req)=>{assert.equal(name,'guardar');body=clone(req.body);return new Promise(resolve=>{release=()=>resolve(confirmed(c,body));});});
 const before=clone(c.snapshot()),promise=c.craftWeapon(id);
 for(let n=0;n<8&&!release;n++)await Promise.resolve();
 assert(release,'envía una operación confirmable');assert.deepEqual(body.forja,{id});assert.equal(typeof body.op,'string');
 assert.equal(c.G.plata,before.plata);assert.deepEqual(clone(c.G.res),before.res);assert.deepEqual(clone(c.G.weapons[id]),old);assert.equal(Object.keys(c.G.weaponSpares).length,0);
 release();await promise;
 assert.deepEqual(clone(c.G.weapons[id]),old);assert.equal(c.G.gear.arma,id);
 const copies=Object.values(c.G.weaponSpares);assert.equal(copies.length,1);assert.deepEqual(clone(copies[0]),{key:id,w:{dur:vm.runInContext('ARM_DEF.espada_madera.dur',c)}});
 assert.equal(c.G.skills.crafting,before.skills.crafting+10);assert.equal(c.G.res.madera,before.res.madera-5);assert.equal(c.G.plata,before.plata-vm.runInContext('ARM_DEF.espada_madera.plata',c));
 assert.equal(events.filter(x=>x[0]==='passEvent'&&x[1]==='crafting').length,1);assert.equal(events.filter(x=>x[0]==='tutoEvent'&&x[1]==='craftarm').length,1);
 assert.equal(c.snapshot().forjaOps.length,1);c.G.weapons[id].dur=1;assert(copies[0].w.dur>1,'desgaste independiente');
 const saved=clone(c.snapshot());c.hydrate(saved);assert.deepEqual(clone(c.G.weaponSpares),saved.weaponSpares);assert.deepEqual(clone(c.G.forjaOps),saved.forjaOps);
 assert.equal(run('SAVE_CONFLICTOS.has(UID)'),false);
});

test('primera forja conserva el autoequipado tras la entrega confirmada',async()=>{
 const {c,setInvoke}=setup();setInvoke((name,req)=>Promise.resolve(confirmed(c,req.body)));
 await c.craftWeapon('espada_madera');assert.equal(c.G.gear.arma,'espada_madera');assert(c.G.weapons.espada_madera);assert.equal(Object.keys(c.G.weaponSpares).length,0);
});

test('la subida de Fabricación se anuncia sin volver a sumar la XP confirmada',async()=>{
 const {c,run,events,setInvoke}=setup();c.G.skills.crafting=run("skillNeed(1,'crafting')-5");const xp=c.G.skills.crafting;
 setInvoke((name,req)=>Promise.resolve(confirmed(c,req.body)));await c.craftWeapon('espada_madera');
 assert.equal(c.G.skills.crafting,xp+10);assert.equal(run("skillInfo(G.skills.crafting,'crafting').lvl"),2);
 assert.equal(events.filter(x=>x[0]==='celebrate'&&x[1].sub===run('SKILL_NAME.crafting')).length,1);
 assert.equal(events.filter(x=>x[0]==='oficiosSync'&&x[1]===false).length,1);
});

test('cambiar de cuenta durante la respuesta no aplica el arma ni sus eventos a la nueva sesión',async()=>{
 const {c,run,events,setInvoke}=setup();let release;
 setInvoke((name,req)=>{const result=confirmed(c,req.body);return new Promise(resolve=>{release=()=>resolve(result);});});
 const before=clone(c.snapshot()),promise=c.craftWeapon('espada_madera');for(let n=0;n<8&&!release;n++)await Promise.resolve();assert(release);
 run("UID='otra-cuenta'");release();await promise;
 assert.deepEqual(clone(c.G.weapons),before.weapons);assert.deepEqual(clone(c.G.res),before.res);assert.equal(c.G.skills.crafting,before.skills.crafting);assert.equal(events.filter(x=>['forgeWork','passEvent','tutoEvent'].includes(x[0])).length,0);
});

test('bolsa llena conserva el arma forjada pendiente y la recoge una sola vez al hacer espacio',async()=>{
 const {c,setInvoke}=setup(),old={dur:3,plus:2,sockets:['guardiana']};c.G.weapons.espada_madera=clone(old);c.G.gear.arma='espada_madera';c.G.res={madera:34*99};
 assert.equal(c.canonicalStacks().length,c.invSlots());setInvoke((name,req)=>Promise.resolve(confirmed(c,req.body)));
 await c.craftWeapon('espada_madera');assert.deepEqual(clone(c.G.weapons.espada_madera),old);assert.equal(Object.keys(c.G.weaponSpares).length,0);assert.equal(c.G.mkPend.length,1);
 c.G.res.madera=33*99;assert.equal(c.mkPendCobrar(),1);assert.equal(Object.keys(c.G.weaponSpares).length,1);assert.equal(c.G.mkPend.length,0);assert.equal(c.mkPendCobrar(),0);
});

test('rechazo de servidor no descuenta materiales, no añade arma ni anuncia fabricación',async()=>{
 const {c,events,setInvoke}=setup();setInvoke(()=>Promise.resolve({data:null,error:{context:{status:422,json:async()=>({error:'La forja se enfría'})}}}));
 const before=clone(c.snapshot());await c.craftWeapon('espada_madera');
 assert.deepEqual(clone(c.G.res),before.res);assert.equal(c.G.skills.crafting,before.skills.crafting);assert.deepEqual(clone(c.G.weapons),before.weapons);assert.equal(c.G.mkPend.length,0);
 assert.equal(events.filter(x=>['forgeWork','passEvent','tutoEvent'].includes(x[0])).length,0);
});

test('comprar la misma arma recoge la ficha completa como copia y conserva la usada',async()=>{
 const {c,setInvoke}=setup(),old={dur:7,plus:1,sockets:['fuego']},bought={dur:23,plus:5,sockets:['guardiana','rayo'],marca:{origen:'p2p'}};
 c.G.weapons.espada_madera=clone(old);c.G.gear.arma='espada_madera';
 setInvoke((name,req)=>{assert.equal(req.body.p2p.accion,'comprar');const d=clone(c.snapshot());d.plata-=10;d.mkPend=[{kind:'arm',item:'espada_madera',qty:1,payload:clone(bought)}];return Promise.resolve({data:{ok:true,data:d,updated_at:'2026-11-08T00:00:00.002Z'},error:null});});
 await c.mercadoP2POperar({accion:'comprar',id:'qa-listing'});assert.deepEqual(clone(c.G.weapons.espada_madera),old);assert.deepEqual(clone(Object.values(c.G.weaponSpares)[0]),{key:'espada_madera',w:bought});assert.equal(c.G.plata,40);
});

test('simulación local también permite varias copias, cobra cada una y respeta el enfriamiento',()=>{
 const {c,run}=setup();run('sb=null');c.G.weapons.espada_madera={dur:2,plus:3};c.G.gear.arma='espada_madera';
 const initial=c.G.res.madera;c.craftWeapon('espada_madera');assert.equal(Object.keys(c.G.weaponSpares).length,1);assert.equal(c.G.res.madera,initial-5);assert.deepEqual(clone(c.G.weapons.espada_madera),{dur:2,plus:3});
 c.craftWeapon('espada_madera');assert.equal(Object.keys(c.G.weaponSpares).length,1);assert.equal(c.G.res.madera,initial-5);
 c.G.armCd.espada_madera=0;c.craftWeapon('espada_madera');assert.equal(Object.keys(c.G.weaponSpares).length,2);assert.equal(c.G.res.madera,initial-10);
});

test('el foco de teclado vuelve después de la confirmación asíncrona de forja',async()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><div id="ov-forge"><button class="forgetab active" data-forge="armas">Armas</button><div id="forge-pane-armas"><button data-carm="espada_madera">Forjar</button></div></div>',{pretendToBeVisual:true});
 const ui=fs.readFileSync(path.join(staged,'ui.js'),'utf8'),start=ui.indexOf('var FORGE_FOCO_PC'),end=ui.indexOf('function faltaReceta',start);
 const c={window:dom.window,document:dom.window.document,Array,Object,String,console,$:id=>dom.window.document.getElementById(id)};vm.createContext(c);vm.runInContext(ui.slice(start,end),c);
 const pane=c.$('forge-pane-armas'),card=c.$('ov-forge');pane.querySelector('button').focus();
 let release;const promise=c.forgeAccionConFocoPc({detail:0},['[data-carm="espada_madera"]'],async()=>{await new Promise(resolve=>{release=resolve;});pane.innerHTML='<button data-carm="espada_madera">Forjar otra</button>';c.forgeReponerFocoPc(card);});
 assert.equal(vm.runInContext('FORGE_FOCO_EN_ACCION',c),true);release();await promise;
 assert.equal(dom.window.document.activeElement,pane.querySelector('button'));assert.equal(vm.runInContext('FORGE_FOCO_EN_ACCION',c),false);dom.window.close();
});
