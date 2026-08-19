/* ¿EN QUÉ CELDAS DEL CORRAL NO SE PUEDE COLOCAR NADA? (18/8)
   Dirección: "en esa celda no se puede colocar una parcela. En algunas celdas dentro del corral no
   se pueden poner cosas. Hay que revisar cada una, incluidas las que tenga la granja al expandir."
   Replica celdaLibreAdorno() sin Phaser y dice el MOTIVO de cada rechazo.
     node tools/auditar-celdas.js [etapa]                                                          */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
// state.js hace falta para que exista BUILD_DEF: sin él, objetoPresente cae en "ante la duda,
// presente" y los 7 edificios sin plano se cuentan como si estuvieran puestos
vm.runInContext(fs.readFileSync("public/game/state.js","utf8"),ctx);
Object.assign(ctx.G,{plotsOwned:+(process.env.PARCELAS||3),treesOpen:[0,1,2],rocksOpen:[0,1,2],
  built:{},obras:{},layout:{},expansiones:+(process.env.EXPANSIONES||0)});
const GF=ctx.GF,T=GF.TILE;

// el motivo por el que una celda rechaza una parcela (mismo orden que celdaLibreAdorno)
function motivo(col,row){
  if (GF.enCerca(col,row)) return "cerca";
  if (GF.parcelaEn(col,row)) return "parcela";
  const x=(col+0.5)*T, y=(row+0.9)*T, pad=6;
  const c=Math.floor(x/T), r=Math.floor(y/T);
  if (!GF.tuyo(c,r)) return "fuera del terreno";
  if (!GF.tuyo(c-1,r) && (x-c*T)<18) return "borde O";
  if (!GF.tuyo(c+1,r) && ((c+1)*T-x)<18) return "borde E";
  if (!GF.tuyo(c,r-1) && (y-r*T)<T*0.72) return "borde N";
  if (!GF.tuyo(c,r+1) && ((r+1)*T-y)<16) return "borde S";
  const p=GF.POND,px=p.col*T,py=p.row*T,pw=p.cols*T,ph=p.rows*T;
  const ex=px+pw/2,ey=py+ph/2,dxp=(x-ex)/(pw/2+pad),dyp=(y-ey)/(ph/2+pad);
  if (dxp*dxp+dyp*dyp<1) return "estanque";
  /* 18/8: la REJILLA primero. Antes esto medía con las cajas de píxeles de blockedAt y encima
     usaba o.baseRow como fila ocupada cuando la buena es baseRow−1: los árboles no salían nunca. */
  const q=GF.celdaObjeto(col,row); if(q) return "choca:"+q;
  for (const c2 of GF.COLLISIONS)
    if (x>c2.cx-c2.hw-pad && x<c2.cx+c2.hw+pad && y>c2.by-c2.dep-pad && y<c2.by+pad && GF.objetoPresente(c2))
      return "choca:"+(c2.tipo||"objeto");
  return null;
}

const soloEtapa = process.argv[2]!=null ? +process.argv[2] : null;
let totalMuertas=0;
for (let n=0;n<=GF.EXPANSIONES.length;n++){
  if (soloEtapa!=null && n!==soloEtapa) continue;
  GF.aplicarTerreno(n);
  const t=GF.terreno(n);
  const rechazo={}, mapa=[]; let libres=0, celdas=0;
  for (let r=t.r0;r<t.r1;r++){
    let fila="";
    for (let c=t.c0;c<t.c1;c++){
      if (!GF.tuyo(c,r)){ fila+=" "; continue; }
      celdas++;
      const m=motivo(c,r);
      if (!m){ libres++; fila+="."; }
      else { rechazo[m]=(rechazo[m]||0)+1;
             fila += m==="cerca"?"#": m.startsWith("borde")?"b": m==="estanque"?"~": m==="parcela"?"P":"X"; }
    }
    mapa.push(fila);
  }
  const clave=Object.keys(rechazo).filter(k=>k!=="cerca"&&!k.startsWith("borde")&&k!=="estanque"&&k!=="parcela");
  LOG("\n=== etapa "+n+"  ("+celdas+" celdas propias, "+libres+" colocables) ===");
  if (soloEtapa!=null) mapa.forEach(f=>LOG("   "+f));
  LOG("   "+Object.entries(rechazo).map(([k,v])=>k+"="+v).join("  "));
  clave.forEach(k=>{ totalMuertas+=rechazo[k]; });
}
LOG("\nleyenda: . colocable   # cerca   b borde   ~ estanque   P parcela tuya   X objeto del mundo");
LOG("celdas bloqueadas por un OBJETO (sospechosas): "+totalMuertas);
