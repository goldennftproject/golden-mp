'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{createRequire}=require('node:module');
const repo=require('node:path').resolve(__dirname,'..');
const req=createRequire(repo+'/package.json'),{JSDOM}=req('jsdom');
const dom=new JSDOM('<div id="estado"></div><button id="volver"></button><button id="semilla"></button><canvas id="lienzo"></canvas>',{runScripts:'outside-only'}),w=dom.window;
const calls=[],contexts=new WeakMap();
w.HTMLCanvasElement.prototype.getContext=function(){if(!contexts.has(this))contexts.set(this,{drawImage:(image,...args)=>calls.push({canvas:this,image,args}),clearRect:()=>{},save:()=>{},restore:()=>{},fillRect:()=>{},createRadialGradient:()=>({addColorStop:()=>{}})});return contexts.get(this);};
let hidden=false;Object.defineProperty(w.document,'hidden',{get:()=>hidden});
const frames=new Map();let sequence=0;
w.requestAnimationFrame=fn=>{frames.set(++sequence,fn);return sequence;};
w.cancelAnimationFrame=id=>frames.delete(id);
const media={matches:false};w.matchMedia=()=>media;
const api=req(repo+'/public/game/world-lights.js');w.GoldenWorldLights=api;
let darkness=1;w.GoldenLighting={atmosphere:()=>({active:true,darkness})};
w.eval(fs.readFileSync(repo+'/public/game/visita-mapa.js','utf8'));
const image=tag=>({tag,width:110,height:118});
Object.assign(w,{cv:w.document.getElementById('lienzo'),items:[
 {key:'store',image:image('store'),x:100,y:100,w:110},
 {key:'cocina',image:image('cocina'),x:200,y:150,w:110},
 {key:'tree',image:image('tree'),x:200,y:200,w:110}
],fondo:{tag:'terrain'}});
w.ctx=w.cv.getContext('2d');
w.eval('globalThis.closeLights=pintarVisita(cv,ctx,items,fondo,0,0)');
const drawn=calls.filter(c=>c.canvas===w.cv).map(c=>c.image.tag||'glow');
assert.deepEqual(drawn,['terrain','store','cocina','glow','glow','tree'],'ventana tras cocina y delante del objeto que la ocluye; fragua privada no se inventa');
assert.equal(frames.size,1);
const advance=t=>{const entry=frames.entries().next().value;frames.delete(entry[0]);entry[1](t);};
calls.length=0;advance(20);const count=calls.length;advance(70);assert.equal(calls.length,count,'máximo diez repintados por segundo');
hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,0,'pestaña oculta no anima');
hidden=false;w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,1);
media.matches=true;calls.length=0;advance(100);const reducedCalls=calls.length;advance(500);assert.equal(calls.length,reducedCalls,'movimiento reducido mantiene fuentes estáticas entre actualizaciones de ambiente');
darkness=0;advance(1200);assert.equal(calls.filter(c=>c.canvas===w.cv&&c.image.tag===undefined).length,2,'en día sólo se conservaron los halos del primer frame nocturno');
w.closeLights();assert.equal(frames.size,0,'cierre cancela animation frame');
w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,0,'cierre elimina listener de visibilidad');
assert.equal(w.G,undefined);dom.window.close();
console.log('OK: ventanas públicas, sin fuegos privados; oclusión Y, throttling, día, reduced motion, ocultación y cierre sin G.');
