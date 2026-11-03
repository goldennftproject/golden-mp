const assert=require('node:assert/strict'),fs=require('node:fs'),{createRequire}=require('node:module');
const repo=require('node:path').resolve(__dirname,'..'), req=createRequire(repo+'/package.json'),{JSDOM}=req('jsdom');
const source=process.argv[2]||repo+'/public/game/visual-v2.js';
const dom=new JSDOM('<button id="cfg-visual-v2"></button><div id="seed-shop"></div>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window;
class Canvas{constructor(){this.width=2;this.height=2;this.pixels=new Uint8Array(16);}getContext(){return{drawImage:im=>{this.pixels=im.pixels.slice();},clearRect:()=>this.pixels.fill(0)}}}
const create=w.document.createElement.bind(w.document);w.document.createElement=name=>name==='canvas'?new Canvas():create(name);w.innerWidth=1200;
const src=new Canvas(),old=new Canvas(),texture={getSourceImage:()=>old,refresh:()=>{}};
const map={frames:{market:{x:0,y:0,w:2,h:2,anchors:{smoke:{x:.25,y:.125},forge:{x:.60,y:.75},invalid:{x:1.1,y:.5}}}}};
const scene={textures:{exists:key=>['market','__visualv2'].includes(key),get:key=>key==='market'?texture:{getSourceImage:()=>src},remove:()=>{}},cache:{json:{get:()=>map,remove:()=>{}}}};
w.eval(fs.readFileSync(source,'utf8'));assert(w.GoldenVisual.prepare(scene));assert.equal(typeof w.GoldenVisual.effectAnchor,'function');
const api=w.GoldenVisual,sprite={texture:{key:'market'},x:200,y:300,originX:.5,originY:1,displayWidth:100,displayHeight:80,rotation:0,flipX:false,flipY:false};
const fallback={x:3,y:4},point=(kind='smoke')=>api.effectAnchor(sprite,kind,fallback),eq=(p,x,y)=>{assert(Math.abs(p.x-x)<1e-9,'x esperado '+x+', recibido '+p.x);assert(Math.abs(p.y-y)<1e-9,'y esperado '+y+', recibido '+p.y);};
eq(point(),175,230); // origin inferior-central: boca arriba y a la izquierda
sprite.displayWidth=200;sprite.displayHeight=160;eq(point(),150,160); // escala sin modificar metadatos
sprite.displayWidth=100;sprite.displayHeight=80;sprite.originX=0;sprite.originY=0;eq(point(),225,310); // origen superior-izquierdo
sprite.originX=.5;sprite.originY=1;sprite.flipX=true;eq(point(),225,230);sprite.flipX=false;sprite.flipY=true;eq(point(),175,290);sprite.flipY=false;
sprite.rotation=Math.PI/2;eq(point(),270,275);sprite.rotation=0;eq(point('forge'),210,280);
assert.equal(point('missing'),fallback);assert.equal(point('invalid'),fallback);
sprite.texture.key='build_market';assert.equal(point(),fallback,'obra sin variante usa fallback');sprite.texture.key='market';
api.setEnabled(false);assert.equal(point(),fallback,'clásico conserva fórmula histórica');api.setEnabled(true);eq(point(),175,230);
sprite.displayWidth=0;assert.equal(point(),fallback,'medidas inválidas no crean NaN');
assert.equal(map.frames.market.anchors.smoke.x,.25,'el metadato no se muta');
console.log('OK: anclajes reales por variante; origen, escala, flip X/Y, rotación y fallback Clásico/obra/datos inválidos');
// Entregar callbacks pendientes antes del teardown del documento.
Promise.resolve().then(()=>dom.window.close());
