'use strict';
// Independent cross-layer checks: real state/UI/snapshot/hydrate, synthetic farms only.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.GF_REPO||path.resolve(__dirname,'..');
const {JSDOM}=require(path.join(root,'node_modules/jsdom'));
const {arrancar}=require(path.join(root,'tools/arrancar-el-juego.contexto'));
let checks=0;
function fixture(){
 const {ctx:c}=arrancar(root,{'game/main.js':''});
 const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost/'}),doc=dom.window.document;
 c.document=doc;c.farmScene=null;c.nowMs=()=>1800000000000;
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const effects={saves:0,toasts:[]};
 for(const n of ['refreshHud','log','sfx'])c[n]=()=>{};
 c.toast=t=>effects.toasts.push(t);c.saveFarm=()=>{effects.saves++;};
 c.estadoDeCero();c.GF.aplicarTerreno(0);c.G.level=3;c.G.plata=500;c.G.tuto={step:4,n:1,done:false,v:15};
 c.G.firstCropDone=true;c.G.kitReclamado=true;c.G.res.papa=3;c.G.plotsOwned=3;
 c.G.plots=Array.from({length:3},()=>({state:'dry',cropKey:null,readyAt:0}));
 c.refreshCobertizo=()=>c.refreshProduccionGranja();
 return{c,doc,dom,effects,close:()=>dom.window.close(),run:s=>vm.runInContext(s,c)};
}
function check(name,fn){const f=fixture();try{fn(f);checks++;console.log('  ok   '+name);}finally{f.close();}}
function core(c){return JSON.stringify({step:c.G.tuto.step,n:c.G.tuto.n,done:c.G.tuto.done,v:c.G.tuto.v,plata:c.G.plata,golden:c.G.golden,res:c.G.res});}
function activate(f){const st=f.c.tutoPracticaPausa();assert(st&&st.practicaPausa);return st;}

check('los índices publicados y el contrato de incursión permanecen estables',f=>{
 const ids=JSON.parse(f.run('JSON.stringify(TUTO_STEPS.map(s=>s.id))'));
 assert.equal(ids.length,32);assert.equal(ids[4],'sell');assert.equal(ids[25],'incursion');assert.equal(ids[31],'pedido');
 assert.equal(f.c.TUTO_VER,15);
});
check('mostrar la guía y el Cobertizo no pausa, compra, guarda ni modifica el tutorial',f=>{
 const before=JSON.stringify(f.c.G),st=activate(f);assert.equal(st.id,'produccion_pausar');
 f.c.refreshProduccionGranja();f.c.tutoRefresh();f.c.mostrarObjetivo();
 assert(f.doc.querySelector(st.ui),'el destino existe en el renderer real');
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,0);
});
check('pausa y reactivación son gestos reales y conservan paso, contador y recursos',f=>{
 const st=activate(f),before=core(f.c),used=f.c.produccionUsados();
 assert(f.c.produccionAlternar(st.clave));assert.equal(f.c.produccionUsados(),used-1);
 assert.equal(f.c.tutoActivo().id,'produccion_reactivar');assert.equal(core(f.c),before);
 assert(f.c.produccionAlternar(st.clave));assert.equal(f.c.produccionUsados(),used);
 assert.equal(f.c.tutoActivo().id,'sell');assert.equal(core(f.c),before);
 assert.equal(f.c.G.tuto.pausaPractica.fase,'hecho');
});
check('la marca y la pausa sobreviven snapshot y hydrate sin reiniciar el recorrido',f=>{
 const st=activate(f);assert(f.c.produccionAlternar(st.clave));
 const saved=JSON.parse(JSON.stringify(f.c.snapshot()));
 assert.equal(saved.tuto.pausaPractica.clave,st.clave);
 f.c.estadoDeCero();f.c.hydrate(saved);
 assert.equal(f.c.G.tuto.step,4);assert.equal(f.c.G.tuto.n,1);assert.equal(f.c.G.tuto.done,false);
 assert.equal(f.c.tutoActivo().id,'produccion_reactivar');assert.equal(f.c.G.tuto.pausaPractica.clave,st.clave);
 assert(f.c.G.produccion.pausas[st.clave]);
 assert(f.c.produccionAlternar(st.clave));assert.equal(f.c.G.tuto.pausaPractica.fase,'hecho');
});
check('vender durante la mini lección sigue contando para el paso original',f=>{
 activate(f);f.c.tutoEvent('sell');assert.equal(f.c.G.tuto.n,2);assert.equal(f.c.G.tuto.step,4);
});
check('sin una parcela vacía no interrumpe vender ni pausa un cultivo',f=>{
 f.c.G.plots.forEach(p=>Object.assign(p,{state:'growing',cropKey:'papa',readyAt:f.c.nowMs()+90000}));
 assert.equal(f.c.tutoPracticaPausa(),null);assert.equal(f.c.tutoActivo().id,'sell');
 f.c.tutoEvent('sell');assert.equal(f.c.G.tuto.n,2);assert.deepEqual(Object.keys(f.c.G.produccion.pausas),[]);
});
check('reactivar sin cupo sigue bloqueado y no completa la práctica',f=>{
 const st=activate(f);assert(f.c.produccionAlternar(st.clave));
 f.c.G.produccion.base=f.c.produccionUsados();
 const before=JSON.stringify(f.c.G);assert.equal(f.c.produccionAlternar(st.clave),false);
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.c.G.tuto.pausaPractica.fase,'reactivar');
 assert.match(f.c.tutoActivo().txt,/cupo|paus/i);
});
check('las cuentas con tutorial terminado conservan cada dato sin reabrirlo',f=>{
 f.c.G.tuto={step:32,n:0,done:true,v:15,registroManual:'open'};
 const before=JSON.stringify(f.c.G.tuto);assert.equal(f.c.tutoPracticaPausa(),null);assert.equal(f.c.tutoActivo(),null);
 f.c.refreshProduccionGranja();f.c.tutoMigrar();assert.equal(JSON.stringify(f.c.G.tuto),before);
});
check('Conseguir bronce abre la ayuda y la fuente real sin gastar ni cambiar producciones',f=>{
 f.c.G.tuto.done=true;f.c.G.expansiones=3;f.c.G.level=20;f.c.G.res.bronce=0;f.c.GF.aplicarTerreno(3);
 const before=JSON.stringify(f.c.G);f.c.refreshExpandir();
 const link=f.doc.getElementById('exd-conseguir-bronce');assert(link,'la expansión con bronce faltante ofrece ayuda');link.click();
 assert(f.doc.getElementById('ov-cobertizo').classList.contains('show'));
 assert(f.doc.getElementById('prod-ayuda-bronce').open);assert(f.doc.getElementById('prod-comprar').open);
 assert.equal(f.doc.activeElement,f.doc.querySelector('#prod-ayuda-bronce>summary'));
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,0);
});
check('Ver qué pausar sólo abre la gestión, que conserva las pausas y prioriza vacías entre activas',f=>{
 f.c.G.tuto.done=true;f.c.G.plots[0]={state:'growing',cropKey:'papa',readyAt:f.c.nowMs()+90000};
 const used=f.c.produccionUsados();f.c.G.produccion.base=used;
 const before=JSON.stringify(f.c.G);f.c.refreshProduccionGranja();
 const link=f.doc.getElementById('prod-bronce-liberar');assert(link);link.click();
 const management=f.doc.getElementById('prod-gestion');assert(management.open);
 assert.equal(f.doc.activeElement,management.querySelector('summary'));
 assert.equal(management.querySelector('[data-prod-pause]').dataset.prodPause,'p:1');
 assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,0);
});
console.log('\n✓ '+checks+' contratos de integración de guía, producción y guardado.\n');
