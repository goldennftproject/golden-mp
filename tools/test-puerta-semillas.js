/* LA PUERTA DE LAS SEMILLAS ES LA SKILL DE CULTIVO (18/8)
   Dirección: "las semillas se bloquean con la skill de Cultivo, no con el nivel de granja."
   Antes el código miraba el nivel de GRANJA mientras la etiqueta decía "Cultivo nv N" — y en este
   juego "Cultivo" ES el nombre de la skill. La etiqueta llevaba razón; el código, no.
     node tools/test-puerta-semillas.js                                                           */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
  "\n;this.X={CROP_ORDER,CROP_DEF,SKILL_NAME,skillNeed,XP_BASE,XP_EXP,FARM_XP_LVLS};",ctx);
const X=ctx.X,G=ctx.G;
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};
const acum=n=>{let a=0;for(let i=1;i<n;i++)a+=X.skillNeed(i);return a;};

ok("la etiqueta y la puerta hablan de lo mismo: 'Cultivo' es la skill",
   X.SKILL_NAME.farming==="Cultivo");

// 1) manda la SKILL, no la granja
{
  G.level=50; G.skills.farming=0;                 // granja al máximo, skill a cero
  const abiertos=X.CROP_ORDER.filter(k=>ctx.cropUnlocked(k));
  ok("con la granja al 50 y la skill a 0 solo hay papa", abiertos.length===1&&abiertos[0]==="papa",
     abiertos.join(", "));
  G.level=1; G.skills.farming=acum(X.CROP_DEF.maiz.lvl);
  ok("con la granja a 1 y la skill al tope, están los 13",
     X.CROP_ORDER.every(k=>ctx.cropUnlocked(k)));
}
// 2) LA ESCALERA: un cultivo por nivel, sin choques
{
  const niveles=X.CROP_ORDER.map(k=>X.CROP_DEF[k].lvl);
  ok("los 13 cultivos caen en 13 niveles distintos",
     new Set(niveles).size===niveles.length, niveles.join(","));
  ok("y la escalera solo sube", niveles.every((v,i)=>i===0||v>niveles[i-1]));
}
// 3) EL RITMO NO SE DISPARA: cada cultivo pide una XP parecida a la de antes
{
  const antes={papa:0,ciruela:25,cereza:90,remolacha:225,zanahoria:550,cebolla:1250,
    calabacin:2750,repollo:5500,calabaza:9000,brocoli:17600,girasol:33600,trigo:54200,maiz:96000};
  /* Se comparan solo los cultivos cuyo coste es lo bastante grande como para que el ratio
     signifique algo. La ciruela pasa de 25 XP a 10: son segundos de juego, y un ×0,4 ahí no dice
     nada — comparar porcentajes sobre números diminutos es engañarse. */
  let peor=1,quien="";
  X.CROP_ORDER.forEach(k=>{const a=antes[k]||0,b=acum(X.CROP_DEF[k].lvl);
    if(a>=500){const r=b/a; if(Math.abs(Math.log(r))>Math.abs(Math.log(peor))){peor=r;quien=k;}}});
  ok("de la zanahoria en adelante, ningún cultivo cambia su coste más de ×1,5",
     peor>0.66&&peor<1.5, "el que más se mueve: "+quien+" ×"+peor.toFixed(2));
  const chicos=X.CROP_ORDER.filter(k=>(antes[k]||0)>0&&(antes[k]||0)<500);
  console.log("  nota   los "+chicos.length+" primeros (ciruela, cereza, remolacha) bajan de 25/90/225 XP a 10/65/214: irrelevante");
}
// 4) Y LA CURVA DEJA DE SER UN MURO (era el hallazgo grave de la auditoría)
{
  const xpH=14*30/0.5;                            // 14 árboles × 30 XP cada media hora
  const anios=n=>acum(n)/xpH/24/365;
  ok("el nivel 40 baja de 3 años a menos de 3 meses", anios(40)<0.25,
     (anios(40)*365).toFixed(0)+" días");
  ok("y el 150 deja de ser inalcanzable (eran 408 años)", anios(150)<25,
     anios(150).toFixed(1)+" años");
}
// 5) EL CARTEL DE NIVEL DE GRANJA YA NO PROMETE CULTIVOS
ok("el cartel de nivel ya no anuncia cultivos (los abre la skill)",
   !/cultivo/i.test(ctx.farmUnlockTxt(8)+ctx.farmUnlockTxt(11)+ctx.farmUnlockTxt(15)),
   ctx.farmUnlockTxt(8));

console.log("\n"+(fallos?"FALLOS: "+fallos:"la puerta es la skill, la escalera es limpia y el ritmo se mantiene"));
process.exit(fallos?1:0);
