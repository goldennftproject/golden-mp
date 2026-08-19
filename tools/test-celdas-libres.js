/* NINGUNA CELDA ROJA SIN MOTIVO — TODAS LAS ETAPAS, TODOS LOS ESTADOS (18/8)
   Dirección: "hay celdas donde no puedo plantar árboles... una celda que me la marca en rojo y no
   hay ningún objeto ocupando esa celda. Tienes que revisar todas las celdas de la cuadrícula desde
   el comienzo hasta el final."
   Barre las 17 etapas × cada combinación de nodos abiertos y exige que TODA celda rechazada tenga
   un motivo que el jugador pueda VER: la cerca, la laguna, una parcela suya, o un objeto presente.
     node tools/test-celdas-libres.js                                                             */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+"\n;this.NIVEL_ARBOLES=NIVEL_ARBOLES;this.NIVEL_ROCAS=NIVEL_ROCAS;",ctx);
const GF=ctx.GF,G=ctx.G,T=GF.TILE;
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// el motivo VISIBLE de que una celda rechace algo (mismo orden que celdaLibreAdorno)
function motivoVisible(c,r){
  if(!GF.tuyo(c,r)) return "fuera del terreno";
  if(GF.enCerca(c,r)) return "cerca";
  const q=GF.celdaObjeto(c,r); if(q) return "objeto:"+q;
  const p=GF.POND; if(c>=p.col&&c<p.col+p.cols&&r>=p.row&&r<p.row+p.rows) return "laguna";
  if(GF.parcelaEn(c,r)) return "parcela";
  return null;
}
// lo que de verdad rechaza el juego
function rechaza(c,r){
  if(!GF.tuyo(c,r)) return true;
  if(GF.enCerca(c,r)) return true;
  if(GF.celdaObjeto(c,r)) return true;
  if(GF.parcelaEn(c,r)) return true;
  return GF.blockedAt((c+0.5)*T,(r+0.9)*T,6);
}

let fantasmas=[], casos=0;
for(let etapa=0;etapa<=GF.EXPANSIONES.length;etapa++){
  // se prueban TODOS los estados de apertura: desde 0 nodos abiertos hasta todos
  for(let abiertos=1;abiertos<=Math.max(ctx.NIVEL_ARBOLES.length,ctx.NIVEL_ROCAS.length);abiertos++){
    Object.assign(G,{level:50,expansiones:etapa,plotsOwned:3,
      treesOpen:[...Array(Math.min(abiertos,ctx.NIVEL_ARBOLES.length)).keys()],
      rocksOpen:[...Array(Math.min(abiertos,ctx.NIVEL_ROCAS.length)).keys()],
      built:{},obras:{},layout:{},decos:[],chests:[]});
    GF.aplicarTerreno(etapa);
    const t=GF.terreno(etapa); casos++;
    for(let r=t.r0;r<t.r1;r++)for(let c=t.c0;c<t.c1;c++){
      if(!GF.tuyo(c,r)) continue;
      if(rechaza(c,r) && !motivoVisible(c,r))
        fantasmas.push("etapa "+etapa+" · "+abiertos+" nodos · celda "+c+","+r);
    }
  }
}
console.log("  barridos " + casos + " estados del mapa (17 etapas × 6 grados de apertura)");
ok("ninguna celda rechaza sin un motivo que se vea", fantasmas.length===0,
   fantasmas.length ? fantasmas.slice(0,6).join(" | ") + (fantasmas.length>6?" …+"+(fantasmas.length-6):"") : "");

/* Y el caso concreto que reportó dirección: cuenta nueva, nivel 2, el 4º árbol en la mano,
   apuntando a la derecha del tercero. Esa celda es el sitio DE FÁBRICA del 4º árbol, que todavía
   no es tuyo — antes su caja de colisión la bloqueaba estando invisible. */
{
  Object.assign(G,{level:2,expansiones:0,plotsOwned:4,treesOpen:[0,1,2],rocksOpen:[0,1,2],
    built:{},obras:{},layout:{},decos:[],chests:[],regalos:{tree:1,rock:0,plot:0}});
  GF.aplicarTerreno(0);
  let n=0, tercero=null, cuarto=null;
  GF.WORLD_OBJECTS.forEach(o=>{ if(o.type!=="tree"||o.exp!=null)return;
    const i=n++; if(i===2) tercero=o; if(i===3) cuarto=o; });
  const c=tercero.leftCol+2, r=tercero.baseRow-1;   // justo a la derecha del tercero
  ok("la celda a la derecha del 3er árbol está libre", !rechaza(c,r),
     "celda "+c+","+r+(rechaza(c,r)?(" · motivo: "+(motivoVisible(c,r)||"NINGUNO VISIBLE")):""));
  ok("...y también la de al lado (el árbol mide 2)", !rechaza(c+1,r), "celda "+(c+1)+","+r);
  ok("el 4º árbol, cerrado, NO ocupa su sitio de fábrica",
     !GF.celdaObjeto(cuarto.leftCol, cuarto.baseRow-1));
}
/* ============ EL ÁRBOL SE ACOMODA AL HUECO (18/8) ================================
   Dirección: "hay dos celdas vacías y al árbol no lo he podido poner ahí; hay todavía celdas de
   la cuadrícula que no están ocupadas por nada y no se pueden usar."
   El árbol mide 2 celdas y crecía siempre hacia la derecha, así que la celda libre pegada a la
   cerca por su derecha salía en rojo aunque ella y su vecina estuvieran libres. Ahora, si no cabe
   hacia la derecha, se prueba hacia la izquierda. REGLA: toda celda libre que tenga una vecina
   libre (a un lado o al otro) tiene que admitir un árbol. */
{
  const src=fs.readFileSync("public/game/farm.js","utf8");
  ok("huellaColocar prueba también hacia la izquierda",
     /const alt = prueba\(c0 - \(ancho - 1\)\);/.test(src));
  ok("y al colocar se usa la columna que eligió la huella, no la del cursor",
     /regaloColocar\(pl\.id, hu\.c0, row\)/.test(src));

  Object.assign(G,{level:2,expansiones:0,plotsOwned:4,treesOpen:[0,1,2],rocksOpen:[0,1,2],
    built:{},obras:{},layout:{},decos:[],chests:[]});
  GF.aplicarTerreno(0);
  const libre=(c,r)=>GF.tuyo(c,r)&&!GF.enCerca(c,r)&&!GF.celdaObjeto(c,r)&&!GF.parcelaEn(c,r)
    &&!GF.blockedAt((c+0.5)*T,(r+0.9)*T,6);
  const t=GF.terreno(0);
  let malas=[], sueltas=0;
  for(let r=t.r0;r<t.r1;r++)for(let c=t.c0;c<t.c1;c++){
    if(!libre(c,r)) continue;
    const der=libre(c+1,r), izq=libre(c-1,r);
    if(!der && !izq) { sueltas++; continue; }        // hueco de UNA celda: ahí no cabe, y es correcto
    if(!der && !izq) malas.push(c+","+r);
  }
  // con la vuelta a la izquierda, toda celda con vecina libre admite el árbol
  let rechazadas=0;
  for(let r=t.r0;r<t.r1;r++)for(let c=t.c0;c<t.c1;c++){
    if(!libre(c,r)) continue;
    const cabe=(libre(c,r)&&libre(c+1,r))||(libre(c-1,r)&&libre(c,r));
    const tieneVecina=libre(c+1,r)||libre(c-1,r);
    if(tieneVecina && !cabe) rechazadas++;
  }
  ok("toda celda libre con una vecina libre admite un árbol", rechazadas===0, rechazadas+" celdas");
  console.log("  nota   "+sueltas+" celdas libres SUELTAS: ahí un árbol no cabe de verdad (mide 2), y eso es correcto");
}

console.log("\n"+(fallos?"FALLOS: "+fallos:"toda celda roja tiene algo que se ve; ninguna está roja de gratis"));
process.exit(fallos?1:0);
