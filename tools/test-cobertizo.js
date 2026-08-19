/* EL COBERTIZO: lo que se COLOCA vive aparte de lo que se GASTA (18/8)
   Dirección: "la bolsa se llena de recursos farmeables y termina todo mezclado con las
   herramientas... hay que buscar un lugar donde almacenarlo, y adonde enviarlo cuando se recibe
   desde el baúl, para que no pase por la barra de acceso rápido y el inventario."
     node tools/test-cobertizo.js                                                                */
const fs=require("fs"),vm=require("vm");
function juego(){
  const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
  ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
  vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+"\n;this.DECO_ORDER=DECO_ORDER;this.DECO_DEF=DECO_DEF;",ctx);
  ctx.toast=()=>{};ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.saveFarm=()=>{};ctx.refreshHotbar=()=>{};
  ctx.sfx=()=>{};ctx.celebrate=()=>{};ctx.reiniciarGranjaSuave=()=>{};
  ctx.G.hotbar=new Array(10).fill(null);
  return ctx;
}
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) LA BOLSA YA NO MEZCLA
{
  const g=juego();
  g.G.regalos={tree:2,rock:1,plot:1};
  g.G.planos={store:true,horno:true};
  g.G.decoBolsa={}; if(g.DECO_ORDER[0]) g.G.decoBolsa[g.DECO_ORDER[0]]=3;
  g.G.tools.axe=5; g.G.res.madera=40; g.G.seeds.papa=6;   // cosas que SÍ se gastan
  const bolsa=g.canonicalStacks().map(d=>d.kind);
  ["regalo","plano","deco","chest"].forEach(k =>
    ok("la bolsa ya no lleva '"+k+"'", !bolsa.includes(k)));
  ok("...pero sigue llevando lo que se gasta (hachas, madera, semillas)",
     bolsa.includes("tool") && bolsa.includes("res") && bolsa.includes("seed"),
     bolsa.join(",").slice(0,70));
}
// 2) EL COBERTIZO LLEVA TODO LO COLOCABLE, Y NADA MÁS
{
  const g=juego();
  g.G.regalos={tree:2,rock:1,plot:1};
  g.G.planos={store:true};
  g.G.decoBolsa={}; if(g.DECO_ORDER[0]) g.G.decoBolsa[g.DECO_ORDER[0]]=3;
  g.G.chests=[{col:null,row:null},{col:5,row:5}];   // uno sin colocar, otro ya puesto
  const it=g.cobertizoItems();
  const cuenta=k=>it.filter(d=>d.kind===k).length;
  ok("4 regalos (2 retoños + 1 roca + 1 parcela)", cuenta("regalo")===4, cuenta("regalo")+"");
  ok("1 plano", cuenta("plano")===1);
  ok("3 adornos", cuenta("deco")===3, cuenta("deco")+"");
  ok("1 cofre (el ya colocado NO cuenta)", cuenta("chest")===1, cuenta("chest")+"");
  ok("y nada que se gaste", !it.some(d=>["res","seed","tool","pick","dish","fish"].includes(d.kind)));
  ok("el contador cuadra", g.cobertizoCuenta()===it.length, it.length+"");
}
// 3) EL BAÚL NO PASA POR LA BARRA RÁPIDA
{
  const g=juego();
  g.G.regalos={tree:1,rock:0,plot:0};
  g.regaloReclamar("tree");
  ok("reclamar NO deja nada en la barra rápida",
     !g.G.hotbar.some(h=>h&&h.kind==="regalo"));
  ok("...y la pieza está en el cobertizo",
     g.cobertizoItems().some(d=>d.kind==="regalo"&&d.key==="tree"));
}
// 4) COLOCAR LA SACA DEL COBERTIZO
{
  const g=juego();
  g.G.regalos={tree:1,rock:0,plot:0};
  const antes=g.cobertizoCuenta();
  g.regaloColocar("tree",6,6);
  ok("colocar vacía su hueco del cobertizo", g.cobertizoCuenta()===antes-1, antes+" → "+g.cobertizoCuenta());
}
// 5) LOS PLANOS TAMPOCO OCUPAN BARRA RÁPIDA
{
  const g=juego();
  g.G.hotbar=new Array(10).fill(null);
  g.planoAHotbar("store");
  ok("planoAHotbar ya no engancha nada", !g.G.hotbar.some(Boolean));
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"lo que se coloca vive en el cobertizo; la bolsa, solo lo que se gasta"));
process.exit(fallos?1:0);
