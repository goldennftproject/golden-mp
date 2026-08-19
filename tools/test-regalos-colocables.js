/* LOS REGALOS SE COLOCAN A MANO (18/8)
   Dirección: "cuando te llegan al baúl, en vez de plantarse automáticamente, que vayan al
   inventario y a la barra rápida, y que el jugador pueda seleccionarlas y plantarlas. Lo mismo
   con los árboles y las piedras. Excepto los nodos de una expansión, que ya aparecen puestos."
     node tools/test-regalos-colocables.js                                                       */
const fs=require("fs"),vm=require("vm");
function juego(){
  const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
  ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
  vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
    "\n;this.NIVEL_ARBOLES=NIVEL_ARBOLES;this.NIVEL_ROCAS=NIVEL_ROCAS;this.PLOT_MAX=PLOT_MAX;",ctx);
  ctx.toast=m=>{ctx.ultToast=m};ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.refreshHotbar=()=>{};
  ctx.saveFarm=()=>{};ctx.reiniciarGranjaSuave=()=>{ctx.reinicios=(ctx.reinicios||0)+1};
  ctx.G.hotbar=new Array(10).fill(null);
  return ctx;
}
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) RECLAMAR EN EL BAÚL NO COLOCA NADA: manda a la bolsa
{
  const g=juego(); g.G.regalos={tree:1,rock:0,plot:1};
  const arbAntes=(g.G.treesOpen||[]).length, parAntes=g.G.plotsOwned;
  g.regaloReclamar("tree");
  ok("reclamar un árbol NO lo planta", (g.G.treesOpen||[]).length===arbAntes);
  ok("...y aparece en la barra rápida",
    g.G.hotbar.some(h=>h&&h.kind==="regalo"&&h.key==="tree"));
  ok("sigue contando como pendiente hasta colocarlo", g.G.regalos.tree===1);
  g.regaloReclamar("plot");
  ok("la parcela tampoco se planta sola", g.G.plotsOwned===parAntes);
  ok("y también va a la barra", g.G.hotbar.some(h=>h&&h.kind==="regalo"&&h.key==="plot"));
}
// 2) COLOCAR SÍ LO PONE, EN LA CELDA ELEGIDA
{
  const g=juego(); g.G.regalos={tree:1,rock:1,plot:1};
  const GF=g.GF;
  const arbAntes=g.G.treesOpen.length;
  ok("colocar el árbol lo abre", g.regaloColocar("tree",6,6)===true && g.G.treesOpen.length===arbAntes+1);
  const idx=g.nodoIndicePorLock("tree", g.G.treesOpen[g.G.treesOpen.length-1]);
  const lay=g.G.layout&&g.G.layout[idx];
  ok("...y queda en la celda que se eligió", !!lay && lay.by===(6+1)*GF.TILE, lay?("cx="+lay.cx+" by="+lay.by):"sin layout");
  ok("el regalo se gasta", g.G.regalos.tree===0);
  const par=g.G.plotsOwned;
  ok("colocar la parcela la suma", g.regaloColocar("plot",7,7)===true && g.G.plotsOwned===par+1);
  ok("...y guarda su celda", g.G.layoutPlots && Object.values(g.G.layoutPlots).some(v=>v.col===7&&v.row===7));
  ok("colocar la roca la abre", g.regaloColocar("rock",8,8)===true);
}
// 3) NO SE PUEDE COLOCAR LO QUE NO TENÉS
{
  const g=juego(); g.G.regalos={tree:0,rock:0,plot:0};
  ok("sin regalos, colocar devuelve false y avisa",
    g.regaloColocar("tree",6,6)===false && !!g.ultToast, g.ultToast||"(sin aviso)");
}
// 4) LOS NODOS DE EXPANSIÓN NO PASAN POR LA BOLSA: nacen puestos
{
  const g=juego();
  const conExp=g.GF.WORLD_OBJECTS.filter(o=>o.exp!=null);
  ok("los nodos de expansión existen en el mapa desde el principio", conExp.length===16, conExp.length+"");
  ok("...y no cuentan como regalo pendiente", (g.G.regalos&&g.G.regalos.tree||0)===0);
  ok("nodoIndicePorLock ignora los de expansión",
    g.NIVEL_ARBOLES.every((_,i)=>{const k=g.nodoIndicePorLock("tree",i);return k>=0&&g.GF.WORLD_OBJECTS[k].exp==null;}));
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"los regalos se colocan a mano y las expansiones nacen puestas"));
process.exit(fallos?1:0);
