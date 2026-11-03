const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<button id="cfg-visual-v2"></button><div id="compras-accesos"><button data-tienda="vip"><img src="old.webp"></button></div><div id="ov-market"><button data-shop="buy">Comprar</button><div id="shop-buy"><div class="info">Información original</div></div></div><div id="seed-shop"><div class="shophead">Cupo diario: 3/120 semillas · reglas completas</div><div class="mimg"><img src="assets/farm/seed_papa.png"></div></div>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window;
class Canvas{
 constructor(){this.width=2;this.height=2;this.pixels=new Uint8Array(16);}
 getContext(){return{drawImage:(im)=>{this.pixels=im.pixels.slice();},clearRect:()=>this.pixels.fill(0)}}
}
const create=w.document.createElement.bind(w.document);w.document.createElement=name=>name==='canvas'?new Canvas():create(name);
w.innerWidth=1200;w.G={golden:12,level:8,plotsOwned:4};const state=JSON.stringify(w.G);
let invalidations=0,refresh=0;w.GoldenLighting={invalidate:()=>invalidations++};
w.eval(fs.readFileSync('public/game/visual-v2.js','utf8'));
const old=new Canvas(),atlas=new Canvas();old.pixels.fill(17);atlas.pixels.fill(99);
const original=old.pixels.slice(),texture={getSourceImage:()=>old,refresh:()=>refresh++},textures={exists:k=>['market','__visualv2'].includes(k),get:k=>k==='market'?texture:{getSourceImage:()=>atlas},remove:()=>{}};
const scene={textures,cache:{json:{get:()=>({frames:{market:{x:0,y:0,w:2,h:2}}}),remove:()=>{}}}};
assert(w.GoldenVisual.prepare(scene));assert.deepEqual(old.pixels,atlas.pixels);assert(w.GoldenVisual.hasVariant('market'));
assert.equal(w.document.querySelector('[data-shop]').textContent,'Semillas');
assert.equal(w.document.querySelector('#seed-shop>.shophead').textContent,'Semillas · Cupo 3/120');
w.GoldenVisual.setEnabled(false);assert.deepEqual(old.pixels,original,'retorno RGBA exacto');assert(!w.document.documentElement.classList.contains('visual-v2'));assert.equal(w.document.querySelector('[data-shop]').textContent,'Comprar');assert.equal(w.document.querySelector('#compras-accesos img').getAttribute('src'),'old.webp');
w.GoldenVisual.setEnabled(true);assert.deepEqual(old.pixels,atlas.pixels);assert.equal(JSON.stringify(w.G),state,'partida intacta');assert(invalidations>=3&&refresh>=3);
w.innerWidth=640;w.dispatchEvent(new w.Event('resize'));assert.deepEqual(old.pixels,original,'móvil conserva clásico');assert(!w.GoldenVisual.isEnabled());
w.innerWidth=1200;w.dispatchEvent(new w.Event('resize'));assert.deepEqual(old.pixels,atlas.pixels);
console.log('OK: atlas opcional, restauracion RGBA exacta, iconos y etiquetas reversibles, normales invalidadas, sin cambios en G y móvil clásico');
w.close();
