/* LA REGLA Y EL MOTIVO NO PUEDEN SEPARARSE (18/8)
   celdaLibreAdorno decide si una celda admite algo; porQueNoEntra dice por qué no. Son dos
   funciones y ya se habían separado una vez: el motivo decía "ahí está la laguna" en celdas que
   en realidad eran colocables (la laguna es una elipse y el mensaje la medía como rectángulo).
   Una celda roja sin motivo, o un motivo sobre una celda buena, mandan al jugador a buscar un
   fantasma — que es exactamente lo que pasó. Este test barre 72 estados del mapa y exige:
     · si se rechaza, tiene que haber motivo
     · si no se rechaza, no puede haber motivo
     node tools/test-motivo-celda.js                                                              */
const fs=require("fs"),vm=require("vm");
function encadenable(nombre){
  const o={__tipo:nombre,width:42,height:42,displayWidth:42,x:0,y:0,scrollX:0,scrollY:0,zoom:1,
    tilePositionX:0,tilePositionY:0,visible:true,texture:{key:nombre||"t"},frame:{width:42,height:42},
    scaleX:1,scaleY:1,alpha:1,depth:0,originX:.5,originY:1,angle:0,active:true};
  const px=new Proxy(o,{get(t,k){ if(k in t)return t[k]; if(typeof k==="symbol")return undefined;
    if(typeof k==="string"&&k[0]==="_")return undefined;
    if(k==="getContext")return()=>new Proxy({},{get:()=>()=>{}});
    if(k==="getSourceImage")return()=>({width:42,height:42});
    return()=>px;},set(t,k,v){t[k]=v;return true;}});
  return px;
}
const ctx={console:{log(){},warn(){},error(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,
  Set,Map,isNaN,parseInt,parseFloat,performance:{now:()=>0},setTimeout:()=>0,setInterval:()=>0,
  clearInterval(){},requestAnimationFrame:()=>0};
ctx.window=ctx;ctx.globalThis=ctx;
ctx.document={getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[],createElement:()=>encadenable("el")};
ctx.Phaser={Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Between:a=>a,Distance:{Between:()=>0}},
  BlendModes:{ADD:1},Geom:{},Display:{Color:{}}};
vm.createContext(ctx);
["config","nav","state","farm"].forEach(f=>vm.runInContext(fs.readFileSync("public/game/"+f+".js","utf8"),ctx));
vm.runInContext("this.FarmScene=FarmScene;",ctx);
const esc=new ctx.FarmScene();
esc.add=new Proxy({},{get:(t,k)=>(...a)=>encadenable(k)});
esc.textures={exists:()=>true,get:()=>encadenable("tex"),createCanvas:()=>encadenable("c"),addCanvas(){},remove(){}};
esc.cameras={main:encadenable("cam")};esc.scale={width:1280,height:720,on(){},off(){}};
esc.tweens={add:()=>encadenable("tw")};esc.input={on(){},keyboard:{on(){},addKeys:()=>new Proxy({},{get:()=>encadenable("k")})},mouse:{disableContextMenu(){}},activePointer:{worldX:0,worldY:0}};
esc.events={once(){},on(){}};esc.time={addEvent:()=>encadenable("e")};esc.anims={exists:()=>false,create(){},generateFrameNumbers:()=>[]};
esc.objs=[];esc.plots=[];esc.plotGrounds=[];
const GF=ctx.GF,G=ctx.G,T=GF.TILE;
let mudas=[], casos=0;
for(let etapa=0;etapa<=2;etapa++)
 for(let ab=1;ab<=6;ab++)
  for(const obras of [{},{store:{col:6,row:6}}])
   for(const decos of [[],[{id:"valla",col:5,row:5}]]){
    Object.assign(G,{level:50,expansiones:etapa,plotsOwned:5,
      treesOpen:[...Array(Math.min(ab,6)).keys()],rocksOpen:[...Array(Math.min(ab,6)).keys()],
      built:{},obras,layout:{},decos,chests:[{col:9,row:9}]});
    GF.aplicarTerreno(etapa);
    const t=GF.terreno(etapa); casos++;
    for(let r=t.r0;r<t.r1;r++)for(let c=t.c0;c<t.c1;c++){
      const libre=esc.celdaLibreAdorno(c,r,-1);
      const por=esc.porQueNoEntra(c,r,-1);
      if(!libre && !por) mudas.push("etapa"+etapa+" ab"+ab+" celda "+c+","+r);
      if(libre && por)   mudas.push("INVERSO etapa"+etapa+" celda "+c+","+r+" dice: "+por);
    }
   }
console.log("estados probados:",casos);
if(mudas.length){
  console.log("  FALLA  la regla y el motivo no coinciden en "+mudas.length+" celdas");
  [...new Set(mudas)].slice(0,10).forEach(m=>console.log("     "+m));
  process.exit(1);
}
console.log("  ok     toda celda rechazada sabe decir por qué");
console.log("  ok     y ninguna celda buena se marca con un motivo falso");
console.log("\nla regla y el motivo dicen lo mismo en los 72 estados");
