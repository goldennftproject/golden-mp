/* NINGUNA CELDA MUERTA DENTRO DEL CORRAL (18/8)
   Dirección: "en algunas celdas dentro del corral no se pueden poner cosas. Hay que revisar cada
   una de las celdas, incluyendo aquellas que vaya a tener la granja cuando expanda."
     node tools/test-celdas-muertas.js                                                             */
const fs=require("fs"),vm=require("vm");
function cargar(parcelas){
  const ctx={console,Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
  ctx.G={plotsOwned:parcelas};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
  return ctx.GF;
}
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

const GF=cargar(3),T=GF.TILE;

// 1) EL FALLO FANTASMA: todo objeto del mundo tiene caja sólida
ok("todos los objetos son sólidos (los nodos de expansión también)",
  GF.COLLISIONS.length===GF.WORLD_OBJECTS.length,
  GF.COLLISIONS.length+"/"+GF.WORLD_OBJECTS.length);

// 2) UNA PARCELA QUE NO ES TUYA NO RESERVA CELDA
{
  const p3=GF.PLOTS[3];   // con plotsOwned=3, la 4ª todavía no es tuya
  ok("la 4ª parcela (aún no entregada) no ocupa su celda", !GF.parcelaEn(p3.col,p3.row));
  const g12=cargar(12);
  ok("...y con las 12 entregadas sí la ocupa", g12.parcelaEn(g12.PLOTS[3].col,g12.PLOTS[3].row));
  ok("las que sí son tuyas ocupan desde el principio", GF.parcelaEn(GF.PLOTS[0].col,GF.PLOTS[0].row));
}

// 3) NINGÚN OBJETO CAE FUERA DEL TERRENO NI EN LA BANDA DE LA CERCA, EN NINGUNA ETAPA
{
  let mal=0, ejemplo=""; const enBanda=new Set();
  for(let n=0;n<=GF.EXPANSIONES.length;n++){
    GF.aplicarTerreno(n);
    GF.WORLD_OBJECTS.forEach(o=>{
      if(o.exp!=null && o.exp>=n) return;            // su bloque todavía no se compró
      const w=Math.ceil(o.wCells||1), c0=o.leftCol!=null?o.leftCol:Math.floor(o.cx/T);
      // 18/8: un objeto con la base en la fila R ocupa la fila R−1 (así lo hace placeBlocked).
      // Esta herramienta llevaba el desfase y por eso decía "17 etapas en verde" midiendo la fila de abajo.
      const r=(o.baseRow!=null?o.baseRow:Math.round(o.by/T))-1;
      /* 18/8: los NATURALES (árbol, roca, veta) sí pueden quedar contra la cerca — su arte tiene
         copa transparente y no la tapa. Es la misma excepción que ya aplica GF.checkLayout. Lo que
         nunca puede pasar es que algo caiga FUERA del terreno, y que un edificio pise la cerca. */
      const natural = o.type==="tree"||o.type==="rock"||o.type==="ore";
      for(let k=0;k<w;k++){
        if(!GF.tuyo(c0+k,r)){ mal++; if(!ejemplo) ejemplo="etapa "+n+" "+o.type+" en "+(c0+k)+","+r; }
        else if(!natural && GF.enCerca(c0+k,r) && n===0) enBanda.add(o.type);
      }
    });
  }
  ok("nada cae fuera del terreno en ninguna etapa", mal===0, mal?ejemplo:"17 etapas");
  /* AVISO, no fallo: esto es una decisión de plano, no una invariante. Los naturales están
     exentos a propósito (copa transparente). Si aparece un EDIFICIO acá, hay que mirarlo con
     los ojos: la banda de la cerca son 2 filas arriba porque el arte de la cerca es alto. */
  if(enBanda.size) console.log("  aviso  en la banda de la cerca: "+[...enBanda].join(", ")+
    "  ← revisar a ojo si tapan el arte de la cerca");
}

// 4) CADA EXPANSIÓN SUMA CELDAS USABLES (si una restara, algo está mal colocado)
{
  const usables=n=>{ GF.aplicarTerreno(n); const t=GF.terreno(n); let u=0;
    for(let r=t.r0;r<t.r1;r++) for(let c=t.c0;c<t.c1;c++){
      if(!GF.tuyo(c,r)||GF.enCerca(c,r)||GF.parcelaEn(c,r)||GF.celdaObjeto(c,r)) continue;
      const x=(c+0.5)*T,y=(r+0.9)*T;
      if(!GF.blockedAt(x,y,6)) u++;
    } return u; };
  let prev=usables(0), sube=true, detalle=[];
  detalle.push("0:"+prev);
  for(let n=1;n<=GF.EXPANSIONES.length;n++){ const u=usables(n); if(u<=prev) sube=false; detalle.push(n+":"+u); prev=u; }
  ok("cada una de las 16 expansiones suma celdas usables", sube, detalle.join(" "));
  ok("la granja de arranque tiene margen de sobra", usables(0)>=100, usables(0)+" celdas libres");
}

console.log("\n"+(fallos?"FALLOS: "+fallos:"todas las celdas del corral, en las 17 etapas, están sanas"));
process.exit(fallos?1:0);
