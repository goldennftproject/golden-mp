'use strict';
// Actual Farm renderer/editor with an isolated fixture; synthetic server ACK only.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let source=fs.readFileSync('tools/test-celdas-vs-sprites.js','utf8');
const end=source.indexOf('console.log("\\nLA ESCENA');assert(end>0);
source=source.slice(0,end).replace('require("./fixture-pesca-legado").activar(ctx);','');
const {ctx:c,esc,GF,G}=new Function('require','console',source+'\nreturn {ctx,esc,GF,G};')(require,{log(){},warn(){}});
const clock=1800000000000;c.nowMs=()=>clock;
c.setEditMode=on=>{GF.editMode=!!on;};c.syncPlacingUI=()=>{};c.toast=c.log=()=>{};
esc.popFx=esc.puffFx=()=>{};GF.scene='farm';
const reserved={tree:[86,87,88],rock:[89,90,91],bronce:[92,93,94]},prices={tree:[1,1.5,2],rock:[1,1.5,2],bronce:[2.5,3.5,5]};
for(const v of [1,2,3,4]){
 GF.configurarEspacio(v);assert.equal(GF.WORLD_OBJECTS.length,95);
 for(const[t,ids]of Object.entries(reserved))for(const i of ids){const o=GF.WORLD_OBJECTS[i];assert(o.premiumOnly);assert.equal(o.exp,999);assert.equal(o.type==='ore'?o.ore:o.type,t);}
}
GF.configurarEspacio(3);G.espacioV=3;G.expansiones=0;GF.aplicarTerreno(0);G.level=3;G.layout=G.layout||{};
G.produccion.premium={v:1,compras:Object.keys(reserved).flatMap(tipo=>reserved[tipo].map((_,n)=>({id:'10000000-0000-4000-8000-'+String(reserved[tipo][n]).padStart(12,'0'),tipo,coste:prices[tipo][n],desde:clock-1000,nodo:null})))};
vm.runInContext('PRODUCCION_PREMIUM_ACTIVA=true',c);esc.create();esc.popFx=esc.puffFx=()=>{};
const rights=G.produccion.premium.compras;
for(const ids of Object.values(reserved))for(const i of ids){const o=esc.objs.find(o=>o.i===i);assert(o.oculto&&!o.sprite.visible);assert(!GF.objetoPresente(GF.COLLISIONS[i]));}
assert.equal(c.produccionUsados(),5);assert.equal(c.produccionCapacidad(),5);
const fresh=JSON.stringify(G);assert(esc.iniciarColocacionPremium(rights[0].id));assert(esc._premiumPlacementBar);esc.cancelarColocar();assert(!esc._premiumPlacementBar);assert.equal(JSON.stringify(G),fresh,'cancel leaves the paid right and player state untouched');
G.level=2;assert.equal(esc.iniciarColocacionPremium(rights[6].id),false,'bronze placement keeps level3');G.level=3;
let pending=null,requests=0;
c.confirmarColocacionProduccionPremium=(id,cx,by)=>{requests++;return new Promise(resolve=>{pending={id,cx,by,resolve};});};
const freeSpot=()=>{for(let r=1;r<8;r++)for(let col=1;col<8;col++){const h=esc.huellaColocar(col,r);if(h.libre)return{col,row:r,h};}return null;};
(async()=>{
 for(const receipt of rights){
  assert(esc.iniciarColocacionPremium(receipt.id));
  const before=JSON.stringify(G),calls=requests;
  esc.colocarEn(-42,-42);esc.colocarEn(0,0);assert.equal(requests,calls,'outside/fence never reach the server callback');
  const spot=freeSpot();assert(spot,'starter9x9 has room for all nine rights alongside its buildings');
  esc.colocarEn((spot.col+.5)*42,(spot.row+.5)*42);assert(pending);assert(!esc._premiumPlacementBar,'compact placement bar is cleared before confirmation');assert.equal(JSON.stringify(G),before,'request/confirmation never grant optimistic ownership');
  const op=pending;pending=null;const i=reserved[receipt.tipo].find(i=>!G.produccion.nodos[i]);
  // This is a fixture's server result, not client purchasing/placement logic.
  receipt.nodo=i;G.produccion.nodos[i]=true;G.layout[i]={cx:op.cx,by:op.by};
  G.nodos[c.produccionNodoKey(i)]={cdIni:clock,readyAt:clock+60000,halfAt:clock+30000};
  op.resolve(true);await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));
  const live=esc.objs.find(o=>o.i===i);assert(!live.oculto&&live.sprite.visible);assert.equal(live.cx,op.cx);assert.equal(live.by,op.by);assert.equal(live.readyAt,clock+60000,'first charge still waits');
  assert(GF.premiumPosicionValida(i));assert(GF.objetoPresente(GF.COLLISIONS[i]));
  for(let col=spot.h.c0;col<spot.h.c0+spot.h.ancho;col++)assert.equal(GF.celdaOcupada(col,spot.row).i,i,'real footprint is occupied once');
  assert.equal(c.produccionUsados(),5,'premium never frees or consumes a regular slot');assert.equal(c.produccionCapacidad(),5);
 }
 assert.equal(c.produccionPremiumUsados(),9);
 const saved=JSON.parse(JSON.stringify(G));for(const key of Object.keys(G))delete G[key];Object.assign(G,saved);esc.create();esc.popFx=esc.puffFx=()=>{};
 for(const receipt of G.produccion.premium.compras){const live=esc.objs.find(o=>o.i===receipt.nodo);assert(!live.oculto&&live.sprite.visible,'placed rights survive JSON reload and scene reconstruction');assert.equal(live.readyAt,clock+60000);}
 const i=86,record=G.produccion.premium.compras.find(p=>p.nodo===i),layout=G.layout[i],type=record.tipo;
 for(const bad of [{cx:0,by:42},{cx:-42,by:84},{cx:42.5,by:84}]){G.layout[i]=bad;assert(!GF.premiumPosicionValida(i));esc.refreshNodeLocks();assert(esc.objs.find(o=>o.i===i).oculto,'invalid paid layout never appears in locked forest');}
 G.layout[i]=layout;record.tipo='rock';assert(!GF.premiumRegistro(i));esc.refreshNodeLocks();assert(esc.objs.find(o=>o.i===i).oculto,'a mismatched receipt cannot expose a reserved node');record.tipo=type;
 delete G.produccion.nodos[i];assert(!GF.premiumPosicionValida(i),'partial ownership is not a phantom occupied cell');G.produccion.nodos[i]=true;
 esc.refreshNodeLocks();assert(!esc.objs.find(o=>o.i===i).oculto);assert.equal(GF.WORLD_OBJECTS.length,95);
 assert.equal(G.expansiones,0);assert.equal(GF.COLS_BASE,9);assert.equal(GF.ROWS_BASE,9);
 console.log('OK: stable9 reserved indices across4 layouts; real starter9x9 fits3 trees/3 rocks/3 bronze with its buildings, no collision, optimistic writes or free regular slots; cancel/level/JSON reload/first charge and invalid forest guards.');
})().catch(e=>{console.error(e);process.exitCode=1;});
