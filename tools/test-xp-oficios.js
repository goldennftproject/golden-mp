/* LA XP MIDE LA PRÁCTICA, NO LA ESPERA (18/8)
   Dirección: "que la experiencia esté ligada al tiempo que tarda algo en crecer es una
   inconsistencia muy abrupta". Lo era: tres clics en netherita pagaban 1.440 XP y tres clics en
   una roca, 40 — el mismo gesto, 36 veces más, solo porque el reloj era más largo.
   REGLA: XP por ACCIÓN, escalada por el ESCALÓN del material. Y como los oficios de ciclo corto
   acumulan más por hora, CADA OFICIO TIENE SU CURVA, calibrada para que el nivel N signifique las
   mismas HORAS DE ESE OFICIO en todos.
     node tools/test-xp-oficios.js                                                                */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={CD,ORE_DEF,ORE_ORDER,CROP_DEF,CROP_ORDER,FISH_CD,skillNeed,skillInfo,xpDeNodo,xpDeCultivo,XP_ACCION,XP_PEZ,XP_ANIMAL,ANIMAL_DEF};",ctx);
const X=ctx.X;
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};
const acum=(n,sk)=>{let a=0;for(let i=1;i<n;i++)a+=X.skillNeed(i,sk);return a;};

// 1) EL MISMO GESTO YA NO PAGA 36 VECES MÁS
{
  const roca=X.xpDeNodo("rock","piedra"), neth=X.xpDeNodo("ore","netherita");
  ok("picar netherita ya no paga 36× lo de una roca", neth/roca<=6, "×"+(neth/roca).toFixed(1));
  ok("…pero sigue pagando más (es un escalón más alto)", neth>roca, roca+" → "+neth);
  ok("talar y picar piedra pagan lo mismo (mismo gesto, primer escalón)",
     X.xpDeNodo("tree")===roca, X.xpDeNodo("tree")+" y "+roca);
  ok("la XP ya no sale del reloj", X.xpDeNodo("ore","oro")!==Math.round(X.ORE_DEF.oro.cd/60));
}
// 2) LOS CULTIVOS TAMBIÉN: por escalón, no por minutos
{
  const p=X.CROP_DEF.papa.xp, m=X.CROP_DEF.maiz.xp;
  ok("cosechar maíz ya no paga 480× lo de una papa", m/p<=15, "×"+(m/p).toFixed(1));
  ok("y la escalera de los 13 sube de uno en uno",
     X.CROP_ORDER.every((k,i)=>X.CROP_DEF[k].xp===X.XP_ACCION*(i+1)));
}
// 3) LA GARANTÍA: el nivel N son las mismas horas en cada oficio
{
  /* 19/8 — ESTE BLOQUE MENTÍA POR OMISIÓN. Comparaba cuatro oficios de once y decía "el nivel N
     son las mismas horas en todos". Ganadería no estaba, y era justo la que estaba mal: su ritmo
     estaba escrito a mano en 1 cuando lo real es 0,083, doce veces menos. Resultado: la Curtiduría
     pedía 1,9 días en vez de 3,8 h y el jabalí 47 días.
     Ahora entran los CINCO oficios con escalera y los ritmos salen de la misma cuenta que usa el
     juego (skillRitmo), no de una copia a mano. */
  const RIT={tala:3*3600/X.CD.tree*X.xpDeNodo("tree"),
             mining:3*3600/X.CD.rock*X.xpDeNodo("rock","piedra"),
             farming:3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp,
             fishing:3600/(X.FISH_CD||900)*X.XP_PEZ,
             ganaderia:3*X.XP_ANIMAL/X.ANIMAL_DEF.alpaca.cicloH};
  // y que el ritmo que usa la curva sea EXACTAMENTE ese, no uno parecido
  Object.keys(RIT).forEach(sk=>{
    const esperado=Math.round(RIT[sk]/RIT.tala*1000)/1000;
    ok("el ritmo de "+sk+" sale de su producción real",
       Math.abs(ctx.skillRitmo(sk)-esperado)<0.002, ctx.skillRitmo(sk)+" (cuenta: "+esperado+")");});
  let peor=0, quien="";
  [2,4,6,8,10,13,17,20].forEach(n=>{
    const hs=Object.keys(RIT).map(sk=>acum(n,sk)/RIT[sk]);
    const d=Math.max(...hs)/Math.min(...hs);
    if(d>peor){peor=d;quien="nivel "+n;}
  });
  ok("el nivel N son las mismas horas en los CINCO oficios con escalera",
     peor<1.05, "la mayor diferencia es "+((peor-1)*100).toFixed(1)+"% en "+quien);
}
// 4) Y NO SE ROMPIÓ LO QUE YA ESTABA
{
  ok("las semillas siguen abriéndose en 13 niveles distintos",
     new Set(X.CROP_ORDER.map(k=>X.CROP_DEF[k].lvl)).size===13);
  const RITf=3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp;
  const hMaiz=acum(X.CROP_DEF.maiz.lvl,"farming")/RITf/24;
  ok("el maíz sigue a una distancia razonable", hMaiz>1&&hMaiz<20, hMaiz.toFixed(1)+" días de Cultivo");
  ok("el techo del oficio sigue siendo alcanzable",
     acum(50,"tala")/(3*3600/X.CD.tree*X.xpDeNodo("tree"))/24 < 400,
     (acum(50,"tala")/(3*3600/X.CD.tree*X.xpDeNodo("tree"))/24).toFixed(0)+" días de Tala para el nivel 50");
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"la XP mide gestos, y un nivel significa lo mismo en todos los oficios"));
process.exit(fallos?1:0);
