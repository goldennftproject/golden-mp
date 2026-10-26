'use strict';
const fs=require('fs');
let sceneTest=fs.readFileSync('tools/test-cargas-en-vivo.js','utf8').split('/* UN CLIC FÍSICO')[0];
sceneTest=sceneTest.replace('G.tuto={done:true};G.tools={axe:50};G.picks={eq:"wood",owned:{wood:true},dur:{wood:500}};',`G.tuto={done:true};G.tools={axe:50};G.picks={eq:'gold',owned:{gold:true},dur:{gold:50}};
GF.configurarEspacio(3);G.espacioV=3;G.expansiones=2;G.produccion.nodos[6]=true;
G.nodos={'tree:6,4':{readyAt:FakeDate.now()-4*CD.tree*1000,cdIni:FakeDate.now()-5*CD.tree*1000},'ore:7,8':{readyAt:FakeDate.now()-1000,cdIni:FakeDate.now()-14401000}};
ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));`);
sceneTest+=`
const assert=require('node:assert/strict');ctx.celebrate=()=>{};ctx.refreshHud=()=>{};
for(const i of [0,6]){
 const node=esc.objs.find(o=>o.i===i);assert.ok(node);G.energiaGranja={v:1,actual:50,at:FakeDate.now()};
 const tipo=i===0?'chop':'mine';for(let hit=0;hit<6;hit++){esc.action={kind:tipo,o:node};esc.finishAction();if(node.readyAt>FakeDate.now())break;}
 assert.ok(node.readyAt>FakeDate.now(),'nodo agotado de verdad '+i);
 const key=ctx.produccionNodoKey(i),ready=node.readyAt,saved=JSON.parse(JSON.stringify(ctx.snapshot()));
 assert.equal(saved.nodos[key].readyAt,ready,'snapshot contiene el reloj usado, no el oculto');
 for(let reload=0;reload<3;reload++){ctx.hydrate(JSON.parse(JSON.stringify(saved)));esc.create();const restored=esc.objs.find(o=>o.i===i);assert.equal(restored.readyAt,ready);assert.equal(restored.cdIni,node.cdIni);assert.equal(esc.texNodo(restored,FakeDate.now()).key,i===0?'tree_stump_leaves':'node_bronze_mined');}
}
const keys=Object.keys(G.nodos);assert.ok(keys.includes(ctx.produccionNodoKey(0)));assert.ok(keys.includes(ctx.produccionNodoKey(6)));assert.ok(!keys.includes(ctx.produccionNodoKey(1)),'árbol oculto no sobrescribe ni duplica reloj');
console.log('OK: relojes heredados, tala y bronce reales, snapshot, triple F5 y texturas; nodos ocultos aislados.');
`;
new Function('require',sceneTest)(require);
