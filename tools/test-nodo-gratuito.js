'use strict';
// Independent behavior checks against the real renderer and production engine.
// Synthetic state only: no network, Auth, live players, SQL or repo writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const {JSDOM}=require(root+'/node_modules/jsdom');
const {arrancar}=require(root+'/tools/arrancar-el-juego.contexto');
const BASIC=['plot','tree','rock'],ADVANCED=['bronce','hierro','oro','diamante','netherita'];
function fixture({vale=1,vip=0,level=9}={}){
 const {ctx:c}=arrancar(root,{'game/main.js':''});
 const dom=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8'),{url:'http://localhost/'}),doc=dom.window.document;
 c.document=doc;const effects={saves:0,toasts:[],logs:[]};
 c.nowMs=()=>1800000000000;c.saveFarm=()=>{effects.saves++;};c.toast=s=>effects.toasts.push(s);c.log=s=>effects.logs.push(s);c.refreshHud=()=>{};
 c.estadoDeCero();c.G.level=level;c.G.expansiones=1;c.G.plata=1000;c.G.golden=10;c.G.planos={};c.G.tuto={done:true};
 Object.assign(c.G.produccion,{vale,valesV:2,vipHasta:vip?c.nowMs()+30*86400000:0,vipAplicado:vip>0,vipNodos:vip,vipNodosV:1});
 c.refreshCobertizo=()=>c.refreshProduccionGranja();
 const run=s=>vm.runInContext(s,c);
 const render=()=>c.refreshProduccionGranja();
 const button=key=>doc.querySelector('[data-prod-buy="'+key+'"]');
 const sectionKeys=id=>[...doc.querySelectorAll('#'+id+' [data-prod-buy]')].map(b=>b.dataset.prodBuy);
 return{c,dom,doc,effects,run,render,button,sectionKeys,close:()=>dom.window.close()};
}
function within(options,fn){const f=fixture(options);try{fn(f);}finally{f.close();}}
function sorted(a){return [...a].sort();}

test('expansion voucher offers exactly three basic choices and advanced purchases are separate',()=>within({},f=>{
 f.render();assert.deepEqual(sorted(f.sectionKeys('prod-elegir')),sorted(BASIC));
 assert.deepEqual(sorted(f.sectionKeys('prod-comprar')),sorted(ADVANCED));
 assert.equal(f.doc.querySelector('#prod-elegir [data-prod-buy="oro"]'),null);
 assert.match(f.doc.querySelector('#prod-elegir>summary').textContent,/gratuit|vale/i);
 assert.match(f.doc.querySelector('#prod-comprar>summary').textContent,/Plata|compr/i);
}));

test('each node type has one action with one matching explanation id',()=>within({},f=>{
 f.render();
 const keys=[...f.doc.querySelectorAll('#prod-granja [data-prod-buy]')].map(b=>b.dataset.prodBuy);
 assert.deepEqual(sorted(keys),sorted([...BASIC,...ADVANCED]));
 assert.equal(new Set(keys).size,keys.length);
 for(const b of f.doc.querySelectorAll('#prod-granja [aria-describedby]')){
  for(const id of b.getAttribute('aria-describedby').trim().split(/\s+/))assert.equal(f.doc.querySelectorAll('[id="'+id+'"]').length,1,id);
 }
}));

test('real paid-gold button spends Plata and retains the expansion voucher',()=>within({},f=>{
 f.render();const gold=f.doc.querySelector('#prod-comprar [data-prod-buy="oro"]');assert(gold&&!gold.disabled);
 const before=f.c.G.plata;gold.click();
 assert.equal(f.c.G.plata,before-500);assert.equal(f.c.G.produccion.vale,1);
 assert(f.c.produccionItems().some(x=>x.type==='ore'&&f.c.GF.WORLD_OBJECTS[x.i].ore==='oro'));
}));

test('real free-basic button spends exactly one voucher without charging Plata',()=>within({},f=>{
 f.render();const before=f.c.G.plata,plots=f.c.G.plotsOwned;
 f.doc.querySelector('#prod-elegir [data-prod-buy="plot"]').click();
 assert.equal(f.c.G.produccion.vale,0);assert.equal(f.c.G.plata,before);assert.equal(f.c.G.plotsOwned,plots+1);
 assert(!f.c.brujula()?.txt.includes('vale'));
}));

test('without a voucher or VIP reward all ordinary choices belong to the Plata catalogue',()=>within({vale:0},f=>{
 f.render();assert.deepEqual(f.sectionKeys('prod-elegir'),[]);assert.deepEqual(f.sectionKeys('prod-vip-elegir'),[]);
 assert.deepEqual(sorted(f.sectionKeys('prod-comprar')),sorted([...BASIC,...ADVANCED]));
}));

test('VIP-only gift choices are separated from Plata and consume one VIP reward',()=>within({vale:0,vip:2},f=>{
 f.render();assert.deepEqual(sorted(f.sectionKeys('prod-vip-elegir')),sorted([...BASIC,...ADVANCED]));
 assert.deepEqual(f.sectionKeys('prod-comprar'),[]);assert.deepEqual(f.sectionKeys('prod-elegir'),[]);
 const before=f.c.G.plata;f.doc.querySelector('#prod-vip-elegir [data-prod-buy="oro"]').click();
 assert.equal(f.c.G.produccion.vipNodos,1);assert.equal(f.c.G.produccion.vale,0);assert.equal(f.c.G.plata,before);
}));

test('with both rewards basic choices spend vouchers before VIP rewards',()=>within({vale:2,vip:2},f=>{
 f.render();assert.deepEqual(sorted(f.sectionKeys('prod-elegir')),sorted(BASIC));
 assert.deepEqual(sorted(f.sectionKeys('prod-vip-elegir')),sorted(ADVANCED));assert.deepEqual(f.sectionKeys('prod-comprar'),[]);
 const before=f.c.G.plata;f.doc.querySelector('#prod-elegir [data-prod-buy="plot"]').click();
 assert.equal(f.c.G.produccion.vale,1);assert.equal(f.c.G.produccion.vipNodos,2);assert.equal(f.c.G.plata,before);
}));

test('with both rewards an advanced choice spends VIP reward and preserves the basic voucher',()=>within({vip:2},f=>{
 f.render();const before=f.c.G.plata;f.doc.querySelector('#prod-vip-elegir [data-prod-buy="oro"]').click();
 assert.equal(f.c.G.produccion.vipNodos,1);assert.equal(f.c.G.produccion.vale,1);assert.equal(f.c.G.plata,before);
}));

test('free-choice guidance names all three eligible types and targets that section',()=>within({},f=>{
 const g=f.c.brujula();assert.equal(g.panel,'ov-cobertizo');assert.equal(g.ui,'#prod-elegir>summary');
 const text=g.txt+' '+(g.beneficio||'');assert.match(text,/parcela/i);assert.match(text,/árbol/i);assert.match(text,/roca|piedra/i);
}));

test('full capacity targets production management rather than an unusable free-choice action',()=>within({},f=>{
 assert.equal(f.c.produccionComprar('oro'),true);assert.equal(f.c.produccionHayCupo(),false);f.render();
 const before=JSON.stringify(f.c.G),saves=f.effects.saves;
 const g=f.c.brujula();assert.equal(g.panel,'ov-cobertizo');assert.equal(g.ui,'#prod-gestion>summary');
 assert.match(g.txt,/cupo|capacidad/i);assert.match(g.txt+' '+(g.beneficio||''),/pausa|libera/i);
 assert.equal(f.doc.querySelector(g.ui)!==null,true);assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,saves);
 for(const k of BASIC)assert.equal(f.button(k).disabled,true);
}));

test('pausing an existing gold node lets the player redeem the basic voucher without losing gold',()=>within({},f=>{
 f.c.produccionComprar('oro');
 const gold=f.c.produccionItems().find(x=>x.type==='ore'&&f.c.GF.WORLD_OBJECTS[x.i].ore==='oro');assert(gold);
 f.render();const before=f.c.G.plata;
 f.doc.querySelector('[data-prod-pause="n:'+gold.i+'"]').click();
 assert.equal(f.c.produccionPausada(gold),true);assert.equal(f.c.G.produccion.nodos[gold.i],true);assert.equal(f.c.produccionHayCupo(),true);
 assert.equal(f.c.brujula().ui,'#prod-elegir>summary');f.render();f.button('plot').click();
 assert.equal(f.c.G.produccion.vale,0);assert.equal(f.c.G.plata,before);assert.equal(f.c.G.produccion.nodos[gold.i],true);
 assert.equal(f.c.produccionPausada(gold),true);
}));

test('lack of a basic emplacement is described without auto-purchasing or losing the voucher',()=>within({},f=>{
 f.c.G.plotsOwned=f.run('PLOT_MAX');f.c.G.produccion.base=100;f.c.produccionEmplazamiento=()=>-1;
 assert.equal(f.c.produccionHayCupo(),true);f.render();const before=JSON.stringify(f.c.G),saves=f.effects.saves;
 const g=f.c.brujula();assert.match(g.txt+' '+(g.beneficio||''),/espacio|emplazamiento|terreno|expan/i);
 assert.equal(g.ui,'#prod-elegir>summary');
 for(const k of BASIC)assert.equal(f.button(k).disabled,true);
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,saves);assert.equal(f.c.G.produccion.vale,1);
}));

test('blocked tree and rock emplacements do not hide an available free plot',()=>within({},f=>{
 f.c.produccionEmplazamiento=()=>-1;f.render();
 assert.equal(f.button('tree').disabled,true);assert.equal(f.button('rock').disabled,true);assert.equal(f.button('plot').disabled,false);
 assert.equal(f.c.brujula().ui,'#prod-elegir>summary');
 const before=f.c.G.plata;f.button('plot').click();assert.equal(f.c.G.produccion.vale,0);assert.equal(f.c.G.plata,before);
}));

test('rendering and reading guidance do not mutate the canonical save or submit a save',()=>within({vip:2},f=>{
 const before=JSON.stringify(f.c.G),saves=f.effects.saves;
 f.render();f.c.brujula();f.render();f.c.brujula();
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,saves);
}));

test('gold level gate remains independent from the free voucher',()=>within({level:8},f=>{
 f.render();assert.equal(f.button('oro').disabled,true);const before=JSON.stringify(f.c.G);f.button('oro').click();
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.c.G.produccion.vale,1);
}));

test('open sections and focused actions survive rerender by identity',()=>within({},f=>{
 f.render();const paid=f.doc.getElementById('prod-comprar');assert(paid);paid.open=true;
 f.button('oro').focus();f.render();assert.equal(f.doc.getElementById('prod-comprar').open,true);
 assert.equal(f.doc.activeElement.dataset.prodBuy,'oro');
}));

test('stale free-choice click cannot silently charge Plata after the last voucher disappears',()=>within({},f=>{
 f.render();const old=f.doc.querySelector('#prod-elegir [data-prod-buy="plot"]');assert(old);
 f.c.G.produccion.vale=0;const before=JSON.stringify(f.c.G),saves=f.effects.saves;old.click();
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,saves);
}));

test('stale VIP gift click cannot silently become a paid purchase',()=>within({vale:0,vip:2},f=>{
 f.render();const old=f.doc.querySelector('#prod-vip-elegir [data-prod-buy="oro"]');assert(old);
 f.c.G.produccion.vipNodos=0;const before=JSON.stringify(f.c.G),saves=f.effects.saves;old.click();
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,saves);
}));

test('stale paid basic-node click does not unexpectedly consume a newly received voucher',()=>within({vale:0},f=>{
 f.render();const old=f.doc.querySelector('#prod-comprar [data-prod-buy="plot"]');assert(old);
 f.c.G.produccion.vale=1;const before=JSON.stringify(f.c.G),saves=f.effects.saves;old.click();
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,saves);
}));

test('gold use requirements are visible while the existing purchase gate stays unchanged',()=>within({},f=>{
 f.c.G.skills.mining=0;f.c.G.picks={owned:{stone:true},dur:{stone:1},eq:'stone'};f.render();
 const gold=f.doc.querySelector('#prod-comprar [data-prod-buy="oro"]');assert(gold&&!gold.disabled);
 const row=gold.closest('.eleccion-nodo');assert(row);
 assert.match(row.textContent,/Minería\s*(?:(?:nivel|niv\.)\s*)?7/i);assert.match(row.textContent,/Pico de Oro/i);
}));

test('redeeming the last voucher moves focus to a section summary rather than a newly paid choice',()=>within({},f=>{
 f.c.G.expansiones=2;f.render();
 const old=f.doc.querySelector('#prod-elegir [data-prod-buy="plot"]');assert(old&&!old.disabled);
 const before=f.c.G.plata,plots=f.c.G.plotsOwned,saves=f.effects.saves;old.focus();old.click();
 assert.equal(f.c.G.produccion.vale,0);assert.equal(f.c.G.plata,before);assert.equal(f.c.G.plotsOwned,plots+1);assert.equal(f.effects.saves,saves+1);
 const nextPaid=f.doc.querySelector('#prod-comprar [data-prod-buy="plot"]');assert(nextPaid&&!nextPaid.disabled,'a paid successor exists and remains usable, so focus handling is exercised');
 assert.notEqual(f.doc.activeElement,nextPaid);assert.equal(f.doc.activeElement.tagName,'SUMMARY');
 assert.notEqual(f.doc.activeElement.getAttribute('data-prod-source'),'plata');
 assert.equal(f.doc.activeElement.hasAttribute('data-prod-buy'),false);
}));

test('redeeming one of two vouchers retains focus on the same still-free choice after real rerender',()=>within({vale:2},f=>{
 f.c.G.expansiones=2;f.render();
 const old=f.doc.querySelector('#prod-elegir [data-prod-buy="plot"]');assert(old&&!old.disabled);
 const before=f.c.G.plata,plots=f.c.G.plotsOwned,saves=f.effects.saves;old.focus();old.click();
 assert.equal(f.c.G.produccion.vale,1);assert.equal(f.c.G.plata,before);assert.equal(f.c.G.plotsOwned,plots+1);assert.equal(f.effects.saves,saves+1);
 const remaining=f.doc.querySelector('#prod-elegir [data-prod-buy="plot"]');assert(remaining&&!remaining.disabled);
 assert.notEqual(remaining,old,'the renderer did rebuild the action');assert.equal(f.doc.activeElement,remaining);
 assert.equal(remaining.getAttribute('data-prod-source'),'vale');
}));

test('spending the last VIP reward never focuses its new paid successor',()=>within({vale:0,vip:1},f=>{
 f.render();const old=f.doc.querySelector('#prod-vip-elegir [data-prod-buy="plot"]');assert(old&&!old.disabled);
 const before=f.c.G.plata,saves=f.effects.saves;old.focus();old.click();
 assert.equal(f.c.G.produccion.vipNodos,0);assert.equal(f.c.G.plata,before);assert.equal(f.effects.saves,saves+1);
 const paid=f.doc.querySelector('#prod-comprar [data-prod-buy="plot"]');assert(paid&&!paid.disabled);
 assert.notEqual(f.doc.activeElement,paid);assert.equal(f.doc.activeElement.tagName,'SUMMARY');
 assert.equal(f.doc.activeElement.hasAttribute('data-prod-buy'),false);
}));
