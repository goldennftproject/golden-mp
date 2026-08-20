/* LA VISTA NO SE RESETEA AL REINICIAR LA ESCENA (18/8)
   Dirección: "el movimiento de cámara que te lo resetea también".
   El reinicio con telón queda solo para comprar terreno (cambia la FORMA del mundo). Lo que sí se
   arregla es que al volver no te plante en el centro con el zoom por defecto.
     node tools/test-camara-reinicio.js                                                          */
const fs=require("fs"),vm=require("vm");
function juego(zoomUser,scrollX,scrollY){
  const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
  ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=(f)=>{f&&f();return 0};ctx.document={getElementById:()=>null};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
  vm.runInContext(fs.readFileSync("public/game/state.js","utf8"),ctx);
  ctx.toast=()=>{};ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.saveFarm=()=>{};
  ctx.canAfford=()=>true;ctx.payCost=()=>{};ctx.sfx=()=>{};ctx.celebrate=()=>{};
  /* 20/8 — LA FORMA IMPORTA, Y AQUÍ ESTUVO EL FALLO MÁS CARO DEL DÍA.
     farm.js hace `window.FARM = this`: FARM ES LA ESCENA. Este arnés montaba `FARM = {scene:{…}}`,
     copiando la suposición equivocada que tenía el código, y por eso daba verde mientras en la
     partida real TODA expansión caía al telón negro: en el navegador, `window.FARM.scene` es el
     ScenePlugin de Phaser —que tiene restart() pero no expandirEnVivo— así que el dibujado en
     caliente no se ejecutó nunca desde que se escribió.
     Ahora se monta como lo monta el juego: la escena arriba, y el ScenePlugin colgando de .scene,
     que es lo único que restart() necesita. */
  ctx.FARM = { zoomUser, cameras: { main: { scrollX, scrollY, zoom: 2.1 } },
    scene: { restart() { ctx.RESTARTS = (ctx.RESTARTS || 0) + 1; } } };
  ctx.RESTARTS=0;
  return ctx;
}
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) reinicio normal: vuelve EXACTAMENTE a donde estabas
{
  const g=juego(1.6,120,340);
  g.reiniciarGranjaSuave();
  const c=g.GF._camTras;
  ok("guarda el scroll exacto", c && c.scrollX===120 && c.scrollY===340, JSON.stringify(c));
  ok("guarda el zoom DEL JUGADOR, no el absoluto", c && c.zoomUser===1.6,
     "zoomUser="+(c&&c.zoomUser)+" (el absoluto 2.1 no sirve: el base cambia con la pantalla)");
  ok("no pide mirar a ningún sitio", c && !c.mirar);
}
// 2) COMPRAR TERRENO: si la escena sabe crecer en vivo, NO hay telón
{
  const g=juego(1.3,0,0);
  g.G.level=99; g.G.expansiones=0;
  let bloqueVisto=null;
  g.FARM.expandirEnVivo=(b)=>{bloqueVisto=b;return true;};
  const e=g.expansionSiguiente();
  ok("la expansión se compra", g.expansionComprar()===true);
  ok("NO reinicia la escena (crece en vivo)", g.RESTARTS===0, "restarts="+g.RESTARTS);
  ok("y le pasa el bloque comprado, para que la cámara viaje hasta él",
     bloqueVisto===e.bloque);
}
// 3) SI CRECER EN VIVO FALLA, el telón sigue de respaldo y encima mirando el bloque nuevo
{
  const g=juego(1.3,0,0);
  g.G.level=99; g.G.expansiones=0;
  g.FARM.expandirEnVivo=()=>false;   // simula que algo salió mal
  const e=g.expansionSiguiente();
  g.expansionComprar();
  ok("cae al reinicio con telón", g.RESTARTS===1, "restarts="+g.RESTARTS);
  const c=g.GF._camTras, b=e.bloque, T=g.GF.TILE;
  ok("y al volver mira el bloque recién comprado",
     c && c.mirar && c.mirar.x===(b.c0+b.c1)/2*T && c.mirar.y===(b.r0+b.r1)/2*T);
  ok("...conservando el zoom del jugador", c && c.zoomUser===1.3);
}
// 4) las 16 expansiones apuntan a un sitio distinto cada una
{
  const g=juego(1,0,0); g.G.level=99; g.G.expansiones=0;
  g.FARM.expandirEnVivo=()=>false;   // por la vía del telón, que es la que guarda _camTras
  const vistos=new Set();
  for(let i=0;i<16;i++){ g.expansionComprar(); const c=g.GF._camTras; if(c&&c.mirar) vistos.add(c.mirar.x+","+c.mirar.y); }
  ok("las 16 miran a 16 sitios distintos", vistos.size===16, vistos.size+"/16");
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"la vista se conserva y la expansión te enseña el terreno nuevo"));
process.exit(fallos?1:0);
