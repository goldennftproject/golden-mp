'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const ui=fs.readFileSync('public/game/ui.js','utf8'),save=fs.readFileSync('public/game/save.js','utf8');
const dom=new JSDOM('<button class="curbtn active" data-cur="plata">Plata</button><span id="mkt-cur-note"></span><div id="mkt-list"></div>');
let clock=1800000000000,calls=0,fail=false,open=true;
const ctx={window:dom.window,document:dom.window.document,console,Date:{now:()=>clock},
 G:{res:{papa:3,ciruela:6,cereza:0}},SELLABLE:['papa','ciruela','cereza'],RES_LABEL:{papa:'Papa',ciruela:'Ciruela',cereza:'Cereza'},RES_EMOJI:{},
 marketCur:'plata',GOLDEN_EN_PLATA:500,CARGA_OK:true,SOLO_LOCAL:false,
 $:id=>dom.window.document.getElementById(id),isOpen:()=>open,tutoActivo:()=>null,
 totalVenta:(_r,q)=>q*2,precioVenta:()=>2,marketUnit:()=>2,fmt:String,fmtDec:String,itemIcon:()=>'',resSprite:r=>r,
 refreshSeedShop(){},refreshDeco(){},tutoHighlight(){},conTope:p=>p};
vm.createContext(ctx);
vm.runInContext(save.slice(0,save.indexOf('/* ================= EL LOGIN')),ctx);
vm.runInContext(ui.slice(ui.indexOf('var MARKET_VENTA_FOCO_PC'),ui.indexOf('// tienda de semillas:')),ctx);
const run=s=>vm.runInContext(s,ctx),el=id=>dom.window.document.getElementById(id);
const quote=()=>({ok:true,recursos:Object.fromEntries(ctx.SELLABLE.map(id=>[id,{volumen:0,disponible:id==='papa'?394:400}]))});
ctx.qaSb={functions:{invoke:async()=>{calls++;return fail?{error:{message:'offline'}}:{data:quote()};}}};
ctx.quote=quote;
run("UID='qa';MERCADO_GLOBAL=true;sb=qaSb;MERCADO_CACHE={...quote(),uid:UID,recibido:Date.now()};MERCADO_INTENTO=Date.now();");
(async()=>{
 ctx.refreshMarket();assert.equal(el('vb-papa').disabled,false);assert.equal(el('vb-ciruela').disabled,false);
 assert.equal(el('vb-cereza').textContent,'Sin stock');
 el('mq-ciruela').value='2';el('mq-ciruela').oninput();
 // Espera de red: el panel envejece y la respuesta falla, sin gastar stock ni saldos.
 clock+=61000;fail=true;ctx.marketVentasTick();await run('MERCADO_REFRESCANDO');
 assert.equal(el('vb-papa').disabled,true);assert.equal(el('vb-papa').textContent,'Cotizando…');
 assert.match(el('mv-papa').textContent,/Consultando comprador/);assert.equal(ctx.G.res.papa,3);
 el('mq-ciruela').focus();
 fail=false;clock+=31000;ctx.marketVentasTick();await run('MERCADO_REFRESCANDO');
 assert.equal(el('vb-papa').disabled,false,'se recupera sin cerrar ni reabrir');
 assert.equal(el('mq-ciruela').value,'2','recotizar conserva el lote elegido');
 assert.equal(dom.window.document.activeElement,el('mq-ciruela'),'recotizar conserva el foco de cantidad');
 const input=el('mq-ciruela');input.focus();ctx.marketVentasTick();
 assert.equal(el('mq-ciruela'),input,'tick no reemplaza los controles');assert.equal(dom.window.document.activeElement,input);
 const n=calls;for(let i=0;i<30;i++)ctx.marketVentasTick();assert.equal(calls,n,'no consulta por cada tick');
 run("SAVE_CONFLICTOS.add(UID)");ctx.marketVentasTick();assert.equal(el('vb-papa').disabled,true);
 assert.match(el('mv-papa').textContent,/guardado sincronizado/,'motivo visible, no sólo tooltip');
 run("SAVE_CONFLICTOS.delete(UID)");ctx.marketVentasTick();assert.equal(el('vb-papa').disabled,false);
 run("MERCADO_EN_CURSO=Promise.resolve()");ctx.marketVentasTick();assert.equal(el('vb-papa').textContent,'Confirmando…');
 run("MERCADO_EN_CURSO=null;MERCADO_CACHE.recursos.papa.disponible=0");ctx.refreshMarket();
 assert.equal(el('vb-papa').textContent,'Cupo agotado');assert.equal(el('vb-papa').disabled,true);
 run("MERCADO_CACHE.recursos.papa.disponible=394");ctx.refreshMarket();assert.equal(el('vb-papa').disabled,false,'nuevo cupo no conserva una cantidad cero que impida vender');
 open=false;clock+=61000;const prev=calls;ctx.marketVentasTick();assert.equal(calls,prev,'mercado cerrado no recotiza');
 console.log('OK: cotización vencida y fallo de red se recuperan, motivos visibles, lote y foco conservados, consultas limitadas, cupos y conflictos protegidos.');
})().catch(e=>{console.error(e);process.exitCode=1;});
