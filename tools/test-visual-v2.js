'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../public/game/visual-v2.js'),'utf8');
class Canvas{
 constructor(){this.width=2;this.height=2;this.pixels=new Uint8Array(16);}
 getContext(){return{drawImage:im=>{this.pixels=im.pixels.slice();},clearRect:()=>this.pixels.fill(0)}}
}
function fixture(width=1200){
 const dom=new JSDOM('<button id="cfg-visual-v2"></button><div id="compras-accesos"><button data-tienda="vip"><img src="old.webp"></button><button id="misiones-acceso">📋 Misiones</button></div><div id="ov-tienda"></div><div id="ov-vip"></div><div id="ov-market"><button data-shop="buy">Comprar</button><div id="shop-buy"><div class="info">Información original</div></div></div><div id="seed-shop"><div class="shophead">Cupo diario: 3/120 semillas · reglas completas</div><div class="mimg"><img src="assets/farm/seed_papa.png"></div></div>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window;
 const create=w.document.createElement.bind(w.document);w.document.createElement=name=>name==='canvas'?new Canvas():create(name);
 w.innerWidth=width;w.G={golden:12,level:8,plotsOwned:4};const state=JSON.stringify(w.G);
 let invalidations=0,refresh=0;w.GoldenLighting={invalidate:()=>invalidations++};
 const old=new Canvas(),tree=new Canvas(),atlas=new Canvas();old.pixels.fill(17);tree.pixels.fill(19);atlas.pixels.fill(99);
 const original=old.pixels.slice(),originalTree=tree.pixels.slice(),texture={getSourceImage:()=>old,refresh:()=>refresh++},treeTexture={getSourceImage:()=>tree,refresh:()=>refresh++};
 const scene={textures:{exists:k=>['market','tree','__visualv2'].includes(k),get:k=>k==='market'?texture:k==='tree'?treeTexture:{getSourceImage:()=>atlas},remove:()=>{}},cache:{json:{get:()=>({version:3,frames:{market:{x:0,y:0,w:2,h:2},tree:{x:0,y:0,w:2,h:2},malformed:{x:-1,y:0,w:2,h:2}}}),remove:()=>{}}}};
 w.eval(source);
 return{dom,w,state,old,tree,atlas,original,originalTree,scene,metrics:()=>({invalidations,refresh})};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const f=fixture(),{w,old,tree,atlas,original,originalTree,scene}=f;
 const missions=w.document.getElementById('misiones-acceso');let clicks=0;missions.addEventListener('click',()=>clicks++);
 assert(w.GoldenVisual.prepare(scene));assert.deepEqual(old.pixels,atlas.pixels);assert(w.GoldenVisual.hasVariant('market'));assert(w.GoldenVisual.hasVariant('tree'),'las claves del manifiesto nuevo se instalan sin allowlist');
 assert.equal(w.document.querySelector('[data-shop]').textContent,'Semillas');
 assert.equal(w.document.querySelector('#seed-shop>.shophead').textContent,'Semillas · Cupo 3/120');
 assert.equal(w.document.querySelector('#compras-accesos img').getAttribute('src'),'assets/visual-v2/ui/vip.png?v=3');
 assert.equal(missions.querySelector('img').getAttribute('src'),'assets/visual-v2/ui/misiones.png?v=3');
 assert.equal(missions.textContent,'Misiones');missions.click();assert.equal(clicks,1,'el mismo botón conserva su listener');
 const market=await w.GoldenVisual.visitImage('market',null),newTree=await w.GoldenVisual.visitImage('tree',null);
 assert.deepEqual(market.pixels,atlas.pixels);assert.deepEqual(newTree.pixels,atlas.pixels,'visitas aceptan recursos nuevos');
 w.document.getElementById('ov-tienda').innerHTML='<div class="tienda-arte"><img src="assets/ui/shop-objetos-v1.webp"></div>';
 w.document.getElementById('ov-vip').innerHTML='<div class="vip-ilustracion"><img src="assets/ui/shop-vip-v1.webp"></div>';
 await tick();assert.equal(w.document.querySelector('#ov-tienda img').getAttribute('src'),'assets/visual-v2/ui/objetos.png?v=3');assert.equal(w.document.querySelector('#ov-vip img').getAttribute('src'),'assets/visual-v2/ui/vip.png?v=3');
 w.GoldenVisual.setEnabled(false);assert.deepEqual(old.pixels,original,'retorno RGBA exacto');assert.deepEqual(tree.pixels,originalTree,'árbol clásico exacto');assert(!w.document.documentElement.classList.contains('visual-v2'));assert.equal(w.document.querySelector('[data-shop]').textContent,'Comprar');assert.equal(w.document.querySelector('#compras-accesos img').getAttribute('src'),'old.webp');assert.equal(w.document.querySelector('#ov-vip img').getAttribute('src'),'assets/ui/shop-vip-v1.webp');assert.equal(missions.textContent,'📋 Misiones');missions.click();assert.equal(clicks,2);
 w.GoldenVisual.setEnabled(true);assert.deepEqual(old.pixels,atlas.pixels);assert.equal(JSON.stringify(w.G),f.state,'partida intacta');assert(f.metrics().invalidations>=6&&f.metrics().refresh>=6);
 const broken=w.document.querySelector('#compras-accesos img');broken.dispatchEvent(new w.Event('error'));assert.equal(broken.getAttribute('src'),'old.webp','si falta un icono se conserva el clásico');
 w.innerWidth=640;w.dispatchEvent(new w.Event('resize'));assert.deepEqual(old.pixels,original,'móvil conserva clásico');assert(!w.GoldenVisual.isEnabled());assert.equal(missions.textContent,'📋 Misiones');
 w.innerWidth=1200;w.dispatchEvent(new w.Event('resize'));assert.deepEqual(old.pixels,atlas.pixels);
 await tick();f.dom.window.close();

 // Un arranque estrecho conserva su escena: la ampliación descarga e instala el atlas después.
 const delayed=fixture(640),d=delayed.w;let requests=0,resolveMap;
 delayed.scene.cache.json.get=()=>null;delayed.scene.textures.exists=k=>['market','tree'].includes(k);
 d.fetch=()=>{requests++;return new Promise(resolve=>{resolveMap=()=>resolve({ok:true,json:async()=>({frames:{tree:{x:0,y:0,w:2,h:2},market:{x:9,y:0,w:2,h:2}}})});});};
 d.Image=class extends Canvas{constructor(){super();this.pixels.fill(99);}set src(v){this.onload();}};
 assert.equal(d.GoldenVisual.prepare(delayed.scene),false);assert.equal(requests,0,'no descarga opcional en móvil');
 d.innerWidth=1200;d.dispatchEvent(new d.Event('resize'));assert.equal(requests,1);
 // Si se elige clásico durante la descarga no reaparece el arte nuevo al finalizarla.
 d.GoldenVisual.setEnabled(false);resolveMap();await tick();await tick();assert.deepEqual(delayed.tree.pixels,delayed.originalTree);assert.equal(JSON.stringify(d.G),delayed.state);
 d.GoldenVisual.setEnabled(true);assert.deepEqual(delayed.tree.pixels,delayed.atlas.pixels);assert(!d.GoldenVisual.hasVariant('market'),'frame fuera del atlas no sustituye originales');assert.equal(requests,1,'ensanches y cambio de tema no duplican descargas');
 const originalVisit={classic:true};assert.equal(await d.GoldenVisual.visitImage('unknown',originalVisit),originalVisit);assert.equal(await d.GoldenVisual.visitImage('market',originalVisit),originalVisit);assert.equal(await d.GoldenVisual.visitImage('__proto__',originalVisit),originalVisit);
 await tick();delayed.dom.window.close();

 // El mosaico de una Farm detenida no debe perder su textura mientras otro frame la usa.
 // Se invalida justo antes del siguiente create, tanto hacia Renovado como hacia Clásico.
 const deferred=fixture(),v=deferred.w,present=new Set(['market','tree','__visualv2','bosque_mosaico']),removed=[];let destroyed=0;
 deferred.scene.textures.exists=k=>present.has(k);deferred.scene.textures.remove=k=>{present.delete(k);removed.push(k);};
 const farm={textures:deferred.scene.textures,sys:{isActive:()=>false},mosaicoTS:{destroy:()=>destroyed++}};v.FARM=farm;
 assert(v.GoldenVisual.prepare(deferred.scene));assert(present.has('bosque_mosaico'),'el cambio en Bosque no destruye una textura que aún puede estar en uso');
 assert(v.GoldenVisual.prepareFarm(farm));assert(!present.has('bosque_mosaico'));assert.equal(destroyed,1);assert.equal(farm.mosaicoTS,null);assert.equal(v.GoldenVisual.prepareFarm(farm),false,'la invalidación diferida es de una sola vez');
 present.add('bosque_mosaico');v.GoldenVisual.setEnabled(false);assert(present.has('bosque_mosaico'));assert.deepEqual(deferred.tree.pixels,deferred.originalTree);assert(v.GoldenVisual.prepareFarm(farm));assert(!present.has('bosque_mosaico'),'volver en Clásico tampoco reutiliza un mosaico renovado');
 farm.sys.isActive=()=>true;farm.refreshVisualTheme=()=>true;v.GoldenVisual.setEnabled(true);assert.equal(v.GoldenVisual.prepareFarm(farm),false,'la reconstrucción inmediata no repite invalidación al volver');assert.equal(JSON.stringify(v.G),deferred.state);
 await tick();deferred.dom.window.close();
 console.log('OK: manifiesto v3 genérico, visitas, retorno RGBA exacto, ilustraciones/misiones reversibles, G intacto, carga al ensanchar y mosaico diferido al volver del Bosque en ambos aspectos');
})().catch(e=>{console.error(e);process.exitCode=1;});
