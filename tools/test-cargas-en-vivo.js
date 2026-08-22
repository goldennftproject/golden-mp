/* LAS CARGAS CON EL PIPELINE DE CLIC COMPLETO (22/8 — el test que faltaba)
   El árbol infinito del vivo no lo cazó ningún test porque todos llamaban a finishAction()
   directo: el bug vivía en el TICK de nodos del update(), que al ver el reloj vencido hacía
   readyAt = 0 (regla del 18/8) — y desde el virgen-lleno, readyAt 0 significa 4 cargas de
   nuevo: madera infinita, clic tras clic. Este test ejecuta el clic COMO EL JUEGO:
   pointerdown → frames de update() (con el tick de nodos corriendo) → pointerup, y verifica
   el ritmo dictado por dirección: suave(+1) · suave(+1) · suave(+1) · profundo(nada) ·
   tocón(+1), y que el árbol CAE.
     node tools/test-cargas-en-vivo.js                                                          */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const REAL0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a){ a.length? super(...a): super(REAL0+desfase); } static now(){ return REAL0+desfase; } }
function enc(n,args){ const o={__t:n,width:42,height:42,displayWidth:42,visible:true,texture:{key:n||"t"},frame:{width:42,height:42,name:""},x:0,y:0,scaleX:1,scaleY:1,alpha:1,depth:0,angle:0,originX:.5,originY:1,active:true,classList:{add(){},remove(){},toggle(){},contains:()=>false}};
 if(args&&typeof args[0]==="number"){o.x=args[0];o.y=args[1];}
 const p=new Proxy(o,{get(t,k){ if(k in t)return t[k]; if(typeof k==="symbol")return undefined; if(typeof k==="string"&&k[0]==="_")return undefined;
  if(k==="getContext")return ()=>new Proxy({},{get:()=>()=>{}}); if(k==="getSourceImage")return ()=>({width:42,height:42});
  if(k==="setVisible")return v=>{o.visible=v;return p;}; if(k==="getBounds")return ()=>({x:o.x-21,y:o.y-42,width:42,height:42}); return ()=>p; },
  set(t,k,v){t[k]=v;return true;}}); return p; }
const dom = new JSDOM("<html><body></body></html>");
const oyentes = {};
const ctx={console:{log(){},warn(){},error(){},info(){}},Math,Date:FakeDate,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,isFinite,parseInt,parseFloat,
 performance:{now:()=>0},setTimeout:(f)=>{try{f()}catch(e){}return 0},setInterval:()=>0,clearInterval(){},clearTimeout(){},requestAnimationFrame:()=>0,
 document: dom.window.document, Image: dom.window.Image };
ctx.window=ctx;ctx.globalThis=ctx;ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};
ctx.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
ctx.Phaser={Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Between:a=>a,Distance:{Between:()=>0}},BlendModes:{ADD:1},Geom:{Rectangle:class{}},Display:{Color:{}}};
ctx.Phaser.Geom.Rectangle.Contains=(b,x,y)=>x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height;
vm.createContext(ctx);
["config","nav","state","save","ui","farm"].forEach(f=>vm.runInContext(fs.readFileSync("public/game/"+f+".js","utf8"),ctx));
vm.runInContext("this.FarmScene = FarmScene;",ctx);
ctx.toast=()=>{}; ctx.log=()=>{};
["isOpen","refreshInv","syncSlots","refreshHud","saveFarm","celebrate","sfx","tutoRefresh","tutoCheck","refreshSeedShop","refreshHotbar","tutoSync","syncCobertizo","refreshMarket","alimentarAnimal"].forEach(f=>{if(!ctx[f])ctx[f]=()=>{}});
const G=ctx.G,GF=ctx.GF,CD=vm.runInContext("CD",ctx);
G.tuto={done:true};G.tools={axe:50};G.picks={eq:"wood",owned:{wood:true},dur:{wood:500}};
GF.aplicarTerreno(0);GF.ocupCambio();
const esc=new ctx.FarmScene();
esc.add=new Proxy({},{get:(t,k)=>(...a)=>enc(k,a)});
esc.textures={exists:()=>true,get:()=>enc("tex"),createCanvas:()=>enc("c"),addCanvas(){},remove(){},getPixelAlpha:()=>255};
esc.make={graphics:()=>enc("g")};
esc.cameras={main:enc("cam")};esc.scale={width:1280,height:720,on(){},off(){}};
esc.tweens={add:(c)=>{if(c&&c.onComplete){try{c.onComplete()}catch(e){}}return enc("tw")},addCounter:()=>enc("tw"),killTweensOf(){}};
esc.input={on(ev,fn){(oyentes[ev]=oyentes[ev]||[]).push(fn);},off(){},keyboard:{on(){},off(){},addKeys:()=>new Proxy({},{get:()=>enc("k")}),addKey:()=>enc("k")},mouse:{disableContextMenu(){}},setDefaultCursor(){},setTopOnly(){},activePointer:{worldX:0,worldY:0,x:0,y:0,event:{clientX:300,clientY:300},isDown:false,rightButtonDown:()=>false}};
esc.events={once(){},on(){},off(){}};esc.time={addEvent:()=>enc("ev"),delayedCall:(ms,fn)=>{try{fn&&fn()}catch(e){}return enc("ev")}};
esc.anims={exists:()=>false,create(){},generateFrameNumbers:()=>[]};esc.sound={add:()=>enc("s")};esc.physics={add:{existing(){}}};esc.game={canvas:enc("cv")};
esc.create();
const arbol=esc.objs.find(o=>o.type==="tree"&&!o.locked);
/* UN CLIC FÍSICO COMPLETO: pointerdown → frames de update → pointerup, sobre el árbol */
function clicFisico(){
  const pt={worldX:arbol.cx, worldY:arbol.by-4, x:arbol.cx, y:arbol.by-4, isDown:true,
    rightButtonDown:()=>false, rightButtonReleased:()=>false, event:{button:0,buttons:1,clientX:300,clientY:300}};
  (oyentes.pointerdown||[]).forEach(f=>{try{f(pt)}catch(e){console.log("(down err)",e.message)}});
  for(let f=0;f<8;f++){ desfase+=50; try{ esc.update(FakeDate.now(), 50); }catch(e){} }   // 400 ms apretado
  pt.isDown=false;
  (oyentes.pointerup||[]).forEach(f=>{try{f(pt)}catch(e){console.log("(up err)",e.message)}});
  for(let f=0;f<12;f++){ desfase+=50; try{ esc.update(FakeDate.now(), 50); }catch(e){} }  // 600 ms hasta el próximo clic
}

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL ÁRBOL VIRGEN, CLIC A CLIC POR EL PIPELINE REAL");
{
  ok("(escenario) arranca virgen y lleno", !arbol.readyAt && ctx.nodoCargas(arbol, CD.tree) === 4);
  const patron = [];
  for (let i = 0; i < 12 && (arbol.readyAt || 0) <= FakeDate.now(); i++) {
    const antes = G.res.madera || 0; clicFisico(); patron.push((G.res.madera || 0) - antes);
  }
  ok("el ritmo dictado: suave+1 · suave+1 · suave+1 · profundo mudo · tocón+1",
    patron.join("") === "11101", patron.join(""));
  ok("4 maderas en total, ni una más (el tick del update ya no lo rellena)",
    patron.reduce((a, b) => a + b, 0) === 4);
  ok("y el árbol CAYÓ: reloj corriendo a futuro", (arbol.readyAt || 0) > FakeDate.now());
}

console.log("\nY EL CICLO SIGUIENTE, TAMBIÉN POR EL PIPELINE REAL");
{
  desfase += (CD.tree * 1000) + 31 * 60000;   // crece y se pasa 31 min: 2 cargas
  for (let f = 0; f < 4; f++) { desfase += 50; try { esc.update(FakeDate.now(), 50); } catch (e) {} }
  ok("(escenario) pasado un reloj extra: 2 cargas — y el tick NO se las comió",
    ctx.nodoCargas(arbol, CD.tree) === 2, ctx.nodoCargas(arbol, CD.tree) + "");
  const patron = [];
  for (let i = 0; i < 8 && (arbol.readyAt || 0) <= FakeDate.now(); i++) {
    const antes = G.res.madera || 0; clicFisico(); patron.push((G.res.madera || 0) - antes);
  }
  ok("con 2 cargas: suave+1 · profundo mudo · tocón+1", patron.join("") === "101", patron.join(""));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el ritmo del clic aguanta con el juego entero corriendo.\n");
process.exit(fallos ? 1 : 0);
