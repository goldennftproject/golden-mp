/* Entrenar ahora debe entregar los 30 golpes anunciados, además de aplicar su descanso.
   Ejecuta los métodos reales de FarmScene sobre una escena sin motor, sin red ni guardados.
   Combate global y habilidad del arma conservan sus fuentes y valores diferentes.
     node tools/test-dummy-entrenamiento.js */
const path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const RAIZ=path.join(__dirname,'..');
const {ctx}=require('./arrancar-el-juego.contexto.js').arrancar(RAIZ);
const G=ctx.G,proto=vm.runInContext('FarmScene.prototype',ctx),events=[],checks=[];
for(const name of ['toast','log','refreshHud','saveFarm','tutoEvent','celebrate','sfx','refreshSkills','passEvent','oficiosSync'])ctx[name]=(...args)=>events.push({name,args});
ctx.isOpen=()=>false;
const scene={hero:{x:0},actScale:1,anims:{exists:()=>false},textures:{exists:()=>false},tweens:{add(){}},time:{delayedCall:(_ms,fn)=>fn()}};
scene.trainDummy=o=>proto.trainDummy.call(scene,o);
const dummy={type:'dummy',cx:50,by:50,sprite:{setAngle(){}}};
function check(label,fn){fn();checks.push(label);console.log('  ok   '+label);}
function initial(id,dur=40){events.length=0;G.skills.sword=74;G.skills.hacha=0;G.skills.mazo=0;G.skills.range=0;G.combatXp=207;G.dummyUsedAt=0;G.dummyTrain=null;G.weapons={[id]:{dur,plus:3,sockets:[{t:'roja',r:1}]}};G.gear.arma=id;}
for(const[id,sk]of[['espada_madera','sword'],['hacha_madera','hacha'],['mazo_madera','mazo']]){
 const label=vm.runInContext('SKILL_NAME['+JSON.stringify(sk)+']',ctx);
 check(id+': acredita 30 golpes, conserva equipo y Combate, y respeta el descanso',()=>{
  initial(id);const before=G.skills[sk];assert.equal(proto.promptText.call(scene,dummy),'Entrenar '+label+' (+30 golpes)');
  let dialog;ctx.askConfirm=text=>{dialog=text;};proto.interactWith.call(scene,dummy);
  assert(dialog.includes('+30 golpes del arma equipada'));assert(dialog.includes('Entrenar mejora la habilidad del arma; Combate sube al derrotar enemigos.'));assert(!dialog.includes('XP'));
  proto.trainDummy.call(scene,dummy);
  assert.equal(G.skills[sk],before+30);assert.equal(G.combatXp,207);assert.equal(G.weapons[id].dur,38);assert.equal(G.weapons[id].plus,3);assert.equal(G.weapons[id].sockets[0].t,'roja');assert.equal(G.gear.arma,id);assert(G.dummyUsedAt>0);
  assert(events.some(e=>e.name==='toast'&&e.args[0]==='+30 golpes de '+label));assert(events.some(e=>e.name==='log'&&e.args[0].includes('+30 golpes de '+label)));assert.equal(events.filter(e=>e.name==='saveFarm').length,1);
  const after=JSON.stringify({s:G.skills[sk],w:G.weapons[id],d:G.dummyUsedAt,c:G.combatXp});proto.trainDummy.call(scene,dummy);assert.equal(JSON.stringify({s:G.skills[sk],w:G.weapons[id],d:G.dummyUsedAt,c:G.combatXp}),after);
  assert(proto.promptText.call(scene,dummy).startsWith('El muñeco descansa'));proto.interactWith.call(scene,dummy);
  assert(dialog.includes('acumulas golpes del arma'));assert(dialog.includes('Combate sube al derrotar enemigos.'));assert(!dialog.includes('XP'));
 });
}
check('la última durabilidad sirve para entrenar y conserva la ficha completa',()=>{initial('espada_madera',1);proto.trainDummy.call(scene,dummy);assert.equal(G.skills.sword,104);assert.equal(G.weapons.espada_madera.dur,0);assert.equal(G.weapons.espada_madera.plus,3);assert.equal(G.weapons.espada_madera.sockets[0].t,'roja');});
check('sin arma, con arco o con arma rota no hay premio, desgaste ni descanso',()=>{for(const[id,dur]of[['espada_madera',0],['arco_madera',40],['espada_madera',40]]){initial(id,dur);if(id==='espada_madera'&&dur===40)G.gear.arma=null;const snapshot=JSON.stringify({skills:G.skills,weapons:G.weapons});proto.trainDummy.call(scene,dummy);assert.equal(JSON.stringify({skills:G.skills,weapons:G.weapons}),snapshot);assert.equal(G.dummyUsedAt,0);}});
check('tras las cuatro horas existentes vuelve a conceder el premio',()=>{initial('espada_madera');G.dummyUsedAt=ctx.nowMs()-ctx.DUMMY_CD_MS;proto.trainDummy.call(scene,dummy);assert.equal(G.skills.sword,104);assert.equal(G.weapons.espada_madera.dur,38);});
check('el entrenamiento prolongado conserva primer minuto, 60 golpes/hora y tope de ocho horas',()=>{
 initial('espada_madera');G.dummyTrain={desde:ctx.nowMs()-30000,arma:'espada_madera'};assert.equal(ctx.dummyCobrar(),null);assert.equal(G.skills.sword,74);
 G.dummyTrain={desde:ctx.nowMs()-61*60000,arma:'espada_madera'};assert.equal(proto.promptText.call(scene,dummy),'Entrenando… clic para cobrar los golpes acumulados');assert.equal(ctx.dummyCobrar(),60);assert.equal(G.skills.sword,134);assert.equal(G.combatXp,207);
 G.dummyTrain={desde:ctx.nowMs()-12*3600000,arma:'espada_madera'};assert.equal(ctx.dummyCobrar(),480);assert.equal(G.skills.sword,614);assert.equal(G.combatXp,207);assert.equal(G.weapons.espada_madera.dur,40);
});
console.log('OK Muñeco de entrenamiento: '+checks.length+' comprobaciones, sin red ni escrituras de partida.');
