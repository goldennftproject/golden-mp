'use strict';
// Motor y renderer reales, con partidas sintéticas: no Auth, red ni guardados reales.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),{arrancar}=require('./arrancar-el-juego.contexto');
function fixture({vip=0}={}){
 const{ctx:c}=arrancar(root,{'game/main.js':''});
 const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost/'}),doc=dom.window.document;
 c.document=doc;c.nowMs=()=>1800000000000;c.estadoDeCero();c.GF.aplicarTerreno(0);c.farmScene=null;
 c.G.level=3;c.G.plata=1000;c.G.tuto={done:true};c.G.expansiones=0;
 Object.assign(c.G.produccion,{vale:1,valesV:2,vipHasta:vip?c.nowMs()+86400000:0,vipAplicado:vip>0,vipNodos:vip,vipNodosV:1});
 let saves=0;const opened=[];c.saveFarm=()=>saves++;c.log=c.toast=c.refreshHud=()=>{};
 c.refreshCobertizo=()=>c.refreshProduccionGranja();
 c.openOv=id=>{opened.push(id);doc.getElementById(id).classList.add('show');if(id==='ov-cobertizo')c.refreshProduccionGranja();};
 c.closeOv=id=>doc.getElementById(id).classList.remove('show');
 doc.defaultView.HTMLElement.prototype.scrollIntoView=function(){};
 return{c,doc,dom,opened,saveCount:()=>saves,render:()=>c.refreshProduccionGranja(),snapshot:()=>JSON.stringify(c.G),run:s=>vm.runInContext(s,c),close:()=>dom.window.close()};
}
function within(opts,fn){const f=fixture(opts);try{fn(f);}finally{f.close();}}
function expansionBronce(f,n=4){f.c.expansionSiguiente=()=>({n,nivel:3,bloque:{c0:0,c1:3,r0:0,r1:3},costo:{plata:10,bronce:4}});f.c.expansionObra=()=>null;f.c.expansionTrae=()=>[];}
test('el requisito faltante ofrece ayuda y abre Cobertizo sin comprar ni guardar',()=>within({},f=>{
 expansionBronce(f);f.c.refreshExpandir();const before=f.snapshot(),saves=f.saveCount(),b=f.doc.getElementById('exd-conseguir-bronce');
 assert(b);b.click();assert.deepEqual(f.opened,['ov-cobertizo']);assert(f.doc.getElementById('prod-ayuda-bronce').open);
 assert(f.doc.getElementById('prod-comprar').open);assert.equal(f.doc.activeElement,f.doc.querySelector('#prod-ayuda-bronce>summary'));
 assert.equal(f.snapshot(),before);assert.equal(f.saveCount(),saves);
 f.c.G.res.bronce=4;f.c.refreshExpandir();assert.equal(f.doc.getElementById('exd-conseguir-bronce'),null);
}));
test('la ayuda explica compra, primer ciclo, minería y receta real sin bronce',()=>within({},f=>{
 f.render();const text=f.doc.getElementById('prod-ayuda-bronce').textContent;
 assert.match(text,/granja nivel 3/);assert.match(text,/180 Plata/);assert.match(text,/vale básico no incluye/);
 assert(text.includes(f.c.fmtDur(f.run('ORE_DEF.bronce.cd')*1000*f.c.vipTiempoMult())));
 assert.match(text,/Minería nivel 3/);assert.match(text,/Pico de Bronce/);assert.match(text,/3 madera \+ 2 piedra \+ 14 Plata/);
 assert.match(text,/No necesitas bronce/);
}));
test('capacidad llena lleva a gestión y ofrece parcelas vacías primero sin pausarlas',()=>within({},f=>{
 f.c.G.plots[0]={state:'growing',cropKey:'papa',readyAt:f.c.nowMs()+60000};f.render();
 assert.equal(f.c.produccionHayCupo(),false);const before=f.snapshot(),saves=f.saveCount();
 const b=f.doc.getElementById('prod-bronce-liberar');assert(b);b.click();
 const gestion=f.doc.getElementById('prod-gestion');assert(gestion.open);assert.equal(f.doc.activeElement,gestion.querySelector('summary'));
 assert.equal(gestion.querySelector('[data-prod-pause]').dataset.prodPause,'p:1');
 assert.match(f.doc.getElementById('prod-ayuda-bronce').textContent,/No libera terreno/);
 assert.equal(f.snapshot(),before);assert.equal(f.saveCount(),saves);
}));
test('el enlace al bronce respeta regalo VIP y no lo convierte en compra',()=>within({vip:1},f=>{
 const before=f.snapshot();f.c.abrirAyudaBronce();assert(f.doc.getElementById('prod-vip-elegir').open);
 assert.match(f.doc.getElementById('prod-ayuda-bronce').textContent,/incluido del VIP/);
 f.doc.getElementById('prod-bronce-ver-veta').click();const b=f.doc.querySelector('[data-prod-buy="bronce"]');
 assert.equal(b.dataset.prodSource,'vip');assert.equal(f.doc.activeElement,b);assert.equal(f.snapshot(),before);
}));
test('si el bronce está bloqueado enfoca su motivo y conserva foco al refrescar',()=>within({},f=>{
 f.render();f.doc.getElementById('prod-bronce-ver-veta').click();
 assert.equal(f.doc.activeElement.id,'prod-motivo-bronce');f.render();assert.equal(f.doc.activeElement.id,'prod-motivo-bronce');
}));
test('veta poseída dirige a la producción existente y no sugiere comprar otra',()=>within({},f=>{
 const i=f.c.produccionEmplazamiento('bronce');assert(i>=0);f.c.G.produccion.nodos[i]=true;
 const before=f.snapshot();f.render();assert.match(f.doc.getElementById('prod-ayuda-bronce').textContent,/Ya tienes una veta/);
 assert.equal(f.doc.getElementById('prod-bronce-ver-veta'),null);assert.equal(f.doc.getElementById('prod-bronce-liberar'),null);assert.equal(f.snapshot(),before);
 assert(f.c.produccionAlternar('n:'+i));f.render();assert.match(f.doc.getElementById('prod-ayuda-bronce').textContent,/está pausada/);
 f.doc.getElementById('prod-bronce-pausada').click();assert.equal(f.doc.activeElement.tagName,'SUMMARY','sin cupo no enfoca Reactivar bloqueado');
 assert(f.c.produccionAlternar('p:0'));f.render();f.doc.getElementById('prod-bronce-pausada').click();assert.equal(f.doc.activeElement.dataset.prodPause,'n:'+i);
 assert(f.c.produccionPausada({type:'ore',i}),'el acceso no reactiva automáticamente');
}));
test('emplazamiento tapado explica edición además de expansión sin prometer que pausar lo resuelve',()=>within({},f=>{
 f.c.GF.celdaOcupada=()=>true;assert.equal(f.c.produccionEmplazamiento('bronce'),-1);f.render();
 const text=f.doc.getElementById('prod-ayuda-bronce').textContent;assert.match(text,/despejarlo en modo edición/);assert.match(text,/Pausar no crea espacio físico/);
 assert(f.doc.querySelector('[data-prod-buy="bronce"]').disabled);
}));
test('conserva desplegado y foco de ayuda tras refrescar sin modificar el guardado',()=>within({},f=>{
 f.c.abrirAyudaBronce();const before=f.snapshot(),saves=f.saveCount();f.render();
 assert(f.doc.getElementById('prod-ayuda-bronce').open);assert.equal(f.doc.activeElement,f.doc.querySelector('#prod-ayuda-bronce>summary'));
 assert.equal(f.snapshot(),before);assert.equal(f.saveCount(),saves);
}));
test('la práctica contextual se explica dentro del Cobertizo sin mover el tutorial',()=>within({},f=>{
 f.c.G.tuto={step:f.run('TUTO_STEPS.findIndex(s=>s.id==="sell")'),n:1,done:false,v:15};
 const before=f.snapshot();f.render();assert.match(f.doc.getElementById('prod-practica-pausa').textContent,/pausa la Parcela/);
 assert.equal(f.snapshot(),before);const guia=f.c.tutoPracticaPausa();assert(guia&&guia.clave);
 f.doc.querySelector('[data-prod-pause="'+guia.clave+'"]').click();
 assert.match(f.doc.getElementById('prod-practica-pausa').textContent,/reactiva/);
 assert.equal(f.c.G.tuto.step,f.run('TUTO_STEPS.findIndex(s=>s.id==="sell")'));assert.equal(f.c.G.tuto.n,1);
}));
