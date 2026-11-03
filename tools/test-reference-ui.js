'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require(path.join(__dirname,'../node_modules/jsdom'));
const source=fs.readFileSync(path.join(__dirname,'../public/game/reference-ui.js'),'utf8');
const dom=new JSDOM('<html class="visual-v2"><body><nav id="compras-accesos"></nav><div id="tuto"><span>Objetivo</span><b id="tuto-txt">Abre el baúl de bienvenida</b><button id="tuto-ir">Mostrar</button></div><div id="ov-market"><div class="card"></div></div></body></html>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.innerWidth=1346;w.G={golden:5,plata:3,level:1};const before=JSON.stringify(w.G);let framed=0,clicked=0;w.FARM={refreshReferenceFraming(){framed++;}};
const button=d.getElementById('tuto-ir'),text=d.getElementById('tuto-txt'),ov=d.getElementById('ov-market'),shop=d.getElementById('compras-accesos');button.onclick=()=>clicked++;
shop.getBoundingClientRect=()=>({right:230,width:210});ov.firstElementChild.getBoundingClientRect=()=>({left:900,width:430});
w.eval(source);const tick=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
(async()=>{
 await tick();assert(d.querySelector('.reference-objective-icon').src.endsWith('/objective-chest.png?v=4'));assert.equal(d.documentElement.style.getPropertyValue('--ref-center-x'),'791px');assert.equal(framed,1);
 ov.classList.add('show');await tick();assert.equal(d.documentElement.style.getPropertyValue('--ref-center-x'),'565px');assert.equal(framed,2);
 text.textContent='Planta tus primeras papas';await tick();assert(d.querySelector('.reference-objective-icon').src.endsWith('/objective-potato.png?v=4'));assert.equal(framed,2,'cambio de icono no recentra cámara');
 d.getElementById('tuto-ir').click();assert.equal(clicked,1);assert.strictEqual(d.getElementById('tuto-ir'),button);assert.strictEqual(d.getElementById('tuto-txt'),text);
 ov.firstElementChild.classList.add('movida');w.GoldenReferenceUI.update();await tick();assert.equal(d.documentElement.style.getPropertyValue('--ref-center-x'),'791px','panel movido no reserva espacio ficticio');
 d.documentElement.classList.remove('visual-v2');await tick();assert(!d.querySelector('.reference-objective-icon'));assert.equal(d.documentElement.style.getPropertyValue('--ref-safe-width'),'');assert.equal(text.textContent,'Planta tus primeras papas');
 d.documentElement.classList.add('visual-v2');w.innerWidth=850;w.dispatchEvent(new w.Event('resize'));await tick();assert(!d.querySelector('.reference-objective-icon'),'móvil no recibe decoración PC');assert.equal(JSON.stringify(w.G),before);
 dom.window.close();console.log('OK: iconos contextuales, espacio real, eventos/IDs/textos vivos y G intactos, paneles movidos, clásico y móvil');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
