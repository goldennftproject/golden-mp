/* UNA CUENTA NUEVA ARRANCA CON LAS MANOS VACÍAS (18/8)
   Dirección: "en una cuenta que comienza, en la barra rápida aparece el hacha en opaco, la caña en
   opaco y el pico... mejor aparecer con la barra sin nada, el inventario en nada, y que al darle al
   baúl recién ahí me den el kit inicial y se pongan en la barra."
     node tools/test-arranque-limpio.js                                                           */
const fs=require("fs"),vm=require("vm");
function juego(){
  const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
  ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
  vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+"\n;this.KIT_INICIAL=KIT_INICIAL;",ctx);
  ctx.toast=()=>{};ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.saveFarm=()=>{};ctx.refreshHotbar=()=>{};
  ctx.sfx=()=>{};ctx.celebrate=()=>{};ctx.syncSlots=ctx.syncSlots||(()=>{});
  return ctx;
}
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) ANTES DEL BAÚL: todo vacío
{
  const g=juego();
  ok("el jugador nace sin kit reclamado", g.G.kitReclamado===false);
  g.ensureHotbarDefaults();
  ok("la barra rápida arranca VACÍA", !g.G.hotbar.some(Boolean),
     JSON.stringify(g.G.hotbar.filter(Boolean)));
  ok("la bolsa arranca VACÍA", g.canonicalStacks().length===0,
     g.canonicalStacks().map(d=>d.kind+":"+d.key).join(",") || "(vacía)");
  ok("no figura ningún pico en propiedad", Object.keys(g.G.picks.owned).length===0);
  ok("ni hacha ni caña", g.toolCount("axe")===0 && g.toolCount("rod")===0);
  ok("y hbInit NO se marca (si no, quedaría vacía para siempre)", !g.G.hbInit);
}
// 2) AL ABRIR EL BAÚL: llega el kit y la barra se llena
{
  const g=juego();
  g.ensureHotbarDefaults();                 // el jugador entra, mira, no hay nada
  const antes=g.G.hotbar.filter(Boolean).length;
  g.kitReclamar();
  ok("reclamar el kit llena la barra", g.G.hotbar.filter(Boolean).length>antes,
     antes+" → "+g.G.hotbar.filter(Boolean).length);
  ok("...con hacha, pico, caña y semilla",
     ["tool:axe","pick:stone","tool:rod","seed:papa"].every(k=>
       g.G.hotbar.some(h=>h&&h.kind+":"+h.key===k)),
     g.G.hotbar.filter(Boolean).map(h=>h.kind+":"+h.key).join(" · "));
  ok("y ahora sí hay herramientas de verdad (no opacas)",
     g.toolCount("axe")===g.KIT_INICIAL.axe && g.toolCount("rod")===g.KIT_INICIAL.rod,
     g.toolCount("axe")+" hachas · "+g.toolCount("rod")+" cañas");
  ok("el pico ya es tuyo", g.G.picks.owned.stone===true && g.pickCount("stone")===g.KIT_INICIAL.pico);
  ok("la bolsa ya no está vacía", g.canonicalStacks().length>0,
     g.canonicalStacks().length+" pilas");
}
// 3) NO SE PUEDE RECLAMAR DOS VECES
{
  const g=juego();
  g.kitReclamar();
  const hachas=g.toolCount("axe");
  ok("el kit no se puede reclamar dos veces", g.kitReclamar()===false && g.toolCount("axe")===hachas);
}
// 4) UN VETERANO QUE YA LO TENÍA NO SE QUEDA SIN BARRA
{
  const g=juego();
  g.G.kitReclamado=true; g.G.hbInit=false; g.G.hotbar=new Array(10).fill(null);
  g.ensureHotbarDefaults();
  ok("guardado viejo con el kit ya reclamado: recupera la barra", g.G.hotbar.some(Boolean));
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"la cuenta nueva arranca limpia y el baúl es lo que la llena"));
process.exit(fallos?1:0);
