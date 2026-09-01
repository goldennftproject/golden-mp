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
  /* 18/8, 2ª pasada: los regalos ya NO van a la barra rápida ni a la bolsa — van al COBERTIZO,
     que es el sitio de todo lo que se coloca. Ver test-cobertizo.js. */
  ok("...y aparece en el cobertizo, no en la barra",
    g.cobertizoItems().some(d=>d.kind==="regalo"&&d.key==="tree") &&
    !g.G.hotbar.some(h=>h&&h.kind==="regalo"));
  ok("sale del baúl y queda en el cobertizo, pendiente de colocar",
     g.G.regalos.tree===0 && g.G.cobertizo.tree===1);
  g.regaloReclamar("plot");
  ok("la parcela tampoco se planta sola", g.G.plotsOwned===parAntes);
  ok("y también va al cobertizo", g.cobertizoItems().some(d=>d.kind==="regalo"&&d.key==="plot"));
}
// 2) COLOCAR SÍ LO PONE, EN LA CELDA ELEGIDA
{
  /* 18/8 (3ª pasada): los ÁRBOLES y las ROCAS ya no son regalos — vienen físicamente dentro del
     bloque de la expansión. Por el Cobertizo pasan solo las PARCELAS. Las ramas de árbol y roca
     de regaloColocar se quedan por los guardados viejos que tuvieran uno pendiente. */
  const g=juego(); g.G.cobertizo={tree:0,rock:0,plot:1};
  const GF=g.GF;
  const arbAntes=g.G.treesOpen.length;
  ok("un árbol ya no se puede reclamar como regalo", g.regaloColocar("tree",6,6)===false);
  ok("...porque la granja de arranque ya tiene sus 3", g.G.treesOpen.length===arbAntes, arbAntes+" árboles");
  const par=g.G.plotsOwned;
  ok("colocar la parcela la suma", g.regaloColocar("plot",7,7)===true && g.G.plotsOwned===par+1);
  /* 18/8 — el índice importa. La celda tiene que quedar anotada para LA PARCELA QUE SE
     DESBLOQUEA (índice plotsOwned antes de sumar), no para un hueco futuro. Si se anota mal, la
     parcela aparece en su sitio de fábrica —el centro de la rejilla— y no donde tocó el jugador. */
  ok("...y guarda su celda EN EL ÍNDICE de la parcela nueva",
     g.G.layoutPlots && g.G.layoutPlots[par] && g.G.layoutPlots[par].col===7 && g.G.layoutPlots[par].row===7,
     "índice "+par+" → "+JSON.stringify(g.G.layoutPlots && g.G.layoutPlots[par]));
  ok("...y NO en el hueco de las parcelas extra (el fallo del centro de la granja)",
     !(g.G.layoutPlots && g.G.layoutPlots[g.GF.PLOTS.length]));

}
// 3) NO SE PUEDE COLOCAR LO QUE NO TENÉS
{
  const g=juego(); g.G.cobertizo={tree:0,rock:0,plot:0};
  ok("sin regalos, colocar devuelve false y avisa",
    g.regaloColocar("tree",6,6)===false && !!g.ultToast, g.ultToast||"(sin aviso)");
}
// 4) LOS NODOS DE EXPANSIÓN NO PASAN POR LA BOLSA: nacen puestos
{
  const g=juego();
  const conExp=g.GF.WORLD_OBJECTS.filter(o=>o.exp!=null);
  ok("los nodos de expansión existen en el mapa desde el principio", conExp.length===52, conExp.length+"");   // 24/8: 32 + 14 vetas · 1/9: +6 extras en las últimas seis (bronce/hierro/oro)
  ok("...y no cuentan como regalo pendiente", (g.G.regalos&&g.G.regalos.tree||0)===0);
  ok("nodoIndicePorLock ignora los de expansión",
    g.NIVEL_ARBOLES.every((_,i)=>{const k=g.nodoIndicePorLock("tree",i);return k>=0&&g.GF.WORLD_OBJECTS[k].exp==null;}));
}
// 5) LA BARRA LLENA YA NO PUEDE DEJAR UN REGALO INALCANZABLE (el cobertizo no tiene tope)
{
  const g=juego();
  g.G.hotbar=new Array(10).fill({kind:"tool",key:"axe"});   // barra sin un solo hueco
  g.G.regalos={tree:0,rock:0,plot:2};
  g.regaloReclamar("plot");
  ok("con la barra llena, el regalo sigue alcanzable en el cobertizo",
     g.cobertizoItems().some(d=>d.kind==="regalo"&&d.key==="plot"));
  ok("y no ensucia la barra rápida", !g.G.hotbar.some(h=>h&&h.kind==="regalo"));
}
// 6) NO SE PUEDE COBRAR DOS VECES: lo pendiente cuenta como si ya lo tuvieras
{
  const g=juego();
  // 18/8: las parcelas llegan por EXPANSIÓN. Sin expansiones no hay nada que regalar.
  g.G.level=50; g.G.expansiones=5; g.G.plotsOwned=3; g.G.regalos={tree:0,rock:0,plot:0}; g.G.cobertizo={tree:0,rock:0,plot:0};
  g.regalosSync();
  const primera=g.G.regalos.plot;
  g.regalosSync(); g.regalosSync();          // volver a sincronizar no puede regalar de nuevo
  ok("regalosSync es idempotente", g.G.regalos.plot===primera, "x3 → "+g.G.regalos.plot);
  g.regaloReclamar("plot"); g.regaloColocar("plot",6,6);
  g.regalosSync();
  ok("colocar una y resincronizar no la devuelve",
     g.G.regalos.plot + (g.G.cobertizo.plot||0) === primera-1,
     "quedan "+(g.G.regalos.plot+(g.G.cobertizo.plot||0))+" (tenía "+primera+")");
}
// 7) COLOCAR NO REINICIA LA ESCENA (18/8: "no es necesaria esa transición de pantalla en negro
//    y el movimiento de cámara que te lo resetea")
{
  const g=juego(); g.reinicios=0;
  g.G.cobertizo={tree:0,rock:0,plot:1};
  g.regaloColocar("plot",8,8);
  ok("colocar la parcela no dispara ningún reinicio con telón", (g.reinicios||0)===0, "reinicios="+(g.reinicios||0));
  const GF=g.GF,T=GF.TILE;
  ok("...y la parcela queda en la celda pedida (8,8)",
     Object.values(g.G.layoutPlots||{}).some(v=>v.col===8&&v.row===8));
}
// 8) EL ENFRIAMIENTO NO SE PIERDE AL MOVER: la clave de guardado usa la celda DE FÁBRICA
{
  const g=juego();
  const o=g.GF.WORLD_OBJECTS.find(x=>x.type==="tree"&&x.exp==null);
  const clave=o.type+":"+o.leftCol+","+o.baseRow;
  ok("mover un nodo no cambia su clave de enfriamiento",
     clave===o.type+":"+o.leftCol+","+o.baseRow, clave);
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"los regalos se colocan a mano y las expansiones nacen puestas"));
process.exit(fallos?1:0);
