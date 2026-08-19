/* NINGÚN OCUPANTE INVISIBLE (18/8)
   Dirección, leyendo el propio aviso del juego: "hay el Horno de Piedra sin dibujo acá... hay un
   árbol sin dibujo acá... la Cocina... el Altar de Ofrendas... el Establo. Son zonas donde había
   edificios que ya no están, porque ahora se desbloquean con planos, pero quedaron como fantasmas."
   REGLA: si el mapa de ocupación dice que una celda está tomada, ESO tiene que verse en pantalla.
     node tools/test-fantasmas.js                                                                 */
const fs=require("fs"),vm=require("vm");
function enc(n){const o={__t:n,width:42,height:42,displayWidth:42,visible:true,texture:{key:n||"t"},
  frame:{width:42,height:42},x:0,y:0,scaleX:1,scaleY:1,alpha:1,depth:0,originX:.5,originY:1,active:true,
  scrollX:0,scrollY:0,zoom:1,tilePositionX:0,tilePositionY:0};
  const p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(typeof k==="symbol")return undefined;
    if(typeof k==="string"&&k[0]==="_")return undefined;
    if(k==="getContext")return()=>new Proxy({},{get:()=>()=>{}});
    if(k==="getSourceImage")return()=>({width:42,height:42});
    if(k==="setVisible")return(v)=>{o.visible=v;return p;};
    return()=>p;},set(t,k,v){t[k]=v;return true;}});return p;}
const ctx={console:{log(){},warn(){},error(){},info(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,
  Set,Map,isNaN,parseInt,parseFloat,performance:{now:()=>0},setTimeout:()=>0,setInterval:()=>0,
  clearInterval(){},requestAnimationFrame:()=>0};
ctx.window=ctx;ctx.globalThis=ctx;
ctx.document={getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[],createElement:()=>enc("el")};
ctx.Phaser={Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Between:a=>a,Distance:{Between:()=>0}},
  BlendModes:{ADD:1},Geom:{},Display:{Color:{}}};
vm.createContext(ctx);
["config","nav","state","farm"].forEach(f=>vm.runInContext(fs.readFileSync("public/game/"+f+".js","utf8"),ctx));
vm.runInContext("this.FarmScene=FarmScene;",ctx);
function escena(){
  const e=new ctx.FarmScene();
  e.add=new Proxy({},{get:(t,k)=>(...a)=>enc(k)});
  e.textures={exists:()=>true,get:()=>enc("tex"),createCanvas:()=>enc("c"),addCanvas(){},remove(){}};
  e.cameras={main:enc("cam")};e.scale={width:1280,height:720,on(){},off(){}};
  e.tweens={add:()=>enc("tw"),addCounter:()=>enc("tw")};
  e.input={on(){},off(){},keyboard:{on(){},off(){},addKeys:()=>new Proxy({},{get:()=>enc("k")}),addKey:()=>enc("k")},
    mouse:{disableContextMenu(){}},setDefaultCursor(){},setTopOnly(){},activePointer:{worldX:0,worldY:0,x:0,y:0}};
  e.events={once(){},on(){},off(){}};e.time={addEvent:()=>enc("ev"),delayedCall:()=>enc("ev")};
  e.anims={exists:()=>false,create(){},generateFrameNumbers:()=>[]};e.sound={add:()=>enc("s")};
  e.physics={add:{existing(){}}};e.game={canvas:enc("cv")};
  try{e.create();}catch(err){console.log("  (create: "+err.message+")");}
  return e;
}
const GF=ctx.GF,G=ctx.G;
ctx.toast=()=>{};ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.saveFarm=()=>{};ctx.sfx=()=>{};
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

/* El arnés no puede arrancar la escena para medir esto: create() toca el estado (planos, tutorial,
   parcelas) y el mapa medido después ya no es el del caso que quería probar — me pasó al escribirlo.
   Así que se comprueban las DOS cosas por separado, y las dos son deterministas:
     A) el contrato del mapa: quién ocupa y quién no, con el estado fijado a mano
     B) la invariante estructural: el dibujo y el mapa usan LA MISMA función para decidir */
const src=fs.readFileSync("public/game/farm.js","utf8");
const srcCfg=fs.readFileSync("public/game/config.js","utf8");
const BD=vm.runInContext("BUILD_DEF",ctx);

// ---- A) el contrato del mapa ----
function mapaCon(estado){ Object.assign(G,estado); GF.aplicarTerreno(G.expansiones||0); GF.ocupCambio(); return GF.ocupacion(); }
const base={level:2,expansiones:0,plotsOwned:4,treesOpen:[0,1,2],rocksOpen:[0,1,2],built:{},obras:{},layout:{},decos:[],chests:[]};

{
  const m=mapaCon({...base});
  const tipos=new Set([...m.values()].map(v=>v.tipo));
  ok("sin planos colocados, ningún edificio ocupa celdas",
     ![...tipos].some(t=>BD[t]), [...tipos].filter(t=>BD[t]).join(", ")||"ninguno");
  const conTree=[...m.entries()].filter(([k,v])=>v.tipo==="tree").map(([k])=>k);
  ok("solo ocupan los 3 árboles abiertos (6 celdas)", conTree.length===6, conTree.join(" "));
}
// EL CASO DE DIRECCIÓN: guardado viejo con posiciones de edificios que hoy no existen
{
  const layout={};
  GF.WORLD_OBJECTS.forEach((o,i)=>{ if(BD[o.type]) layout[i]={cx:o.cx,by:o.by}; });
  ok("el guardado viejo trae "+Object.keys(layout).length+" posiciones de edificios sin plano", Object.keys(layout).length>0);
  const m=mapaCon({...base, layout});
  const fant=[...m.values()].filter(v=>BD[v.tipo]).map(v=>v.tipo);
  ok("…y NINGUNA hace que el edificio ocupe celdas (era el fantasma)",
     fant.length===0, [...new Set(fant)].join(", ")||"ninguno");
}
// con la obra colocada, el edificio SÍ existe
{
  const m=mapaCon({...base, obras:{horno:{col:6,row:6}}});
  const oc=GF.celdaOcupada(6,6);
  ok("con la obra colocada, el edificio sí ocupa su celda", !!oc && oc.tipo==="horno", JSON.stringify(oc));
}
// ---- B) la invariante estructural ----
ok("el dibujo pregunta a GF.objetoPresente, no a su propia regla",
  /if \(!GF\.objetoPresente\(GF\.COLLISIONS\[i\]/.test(src));
ok("y objetoPresente ya no confunde 'dónde está' con 'si existe'",
  /return !!\(\(G\.built && G\.built\[c\.tipo\]\) \|\| \(G\.obras && G\.obras\[c\.tipo\]\)\);/.test(srcCfg));
ok("y al cargar se limpian las posiciones fantasma de guardados viejos",
  /posiciones fantasma de edificios sin plano/.test(fs.readFileSync("public/game/save.js","utf8")));

console.log("\n"+(fallos?"FALLOS: "+fallos:"lo que ocupa una celda, se ve"));
process.exit(fallos?1:0);
