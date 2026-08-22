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
const acum=n=>{let a=0;for(let i=1;i<n;i++)a+=X.skillNeed(i,"farming");return a;};   // 18/8: la curva es por oficio

ok("la etiqueta y la puerta hablan de lo mismo: 'Cultivo' es la skill",
   X.SKILL_NAME.farming==="Cultivo");

// 1) manda la SKILL, no la granja
{
  G.level=50; G.skills.farming=0;                 // granja al máximo, skill a cero
  const abiertos=X.CROP_ORDER.filter(k=>ctx.cropUnlocked(k));
  ok("con la granja al 50 y la skill a 0 solo hay papa", abiertos.length===1&&abiertos[0]==="papa",
     abiertos.join(", "));
  const lvlMax=Math.max(...X.CROP_ORDER.map(k=>X.CROP_DEF[k].lvl));
  G.level=1; G.skills.farming=acum(lvlMax);
  ok("con la granja a 1 y la skill al tope, están los 13",
     X.CROP_ORDER.every(k=>ctx.cropUnlocked(k)));
}
// 2) LA ESCALERA EN DOS CARRILES (22/8, dirección): sesión + ausencia desde temprano
{
  const niveles=X.CROP_ORDER.map(k=>X.CROP_DEF[k].lvl);
  const escalones=[...new Set(niveles)].sort((a,b)=>a-b);
  ok("los 13 cultivos caen en 9 escalones (los tempranos van de a PARES)",
     escalones.length===9, escalones.join(","));
  /* cada escalón temprano (2-8) trae su par: un cultivo de SESIÓN y uno de AUSENCIA */
  for (const nv of [2,4,6,8]) {
    const par=X.CROP_ORDER.filter(k=>X.CROP_DEF[k].lvl===nv);
    const corto=par.some(k=>X.CROP_DEF[k].growH<1), largo=par.some(k=>X.CROP_DEF[k].growH>=3);
    ok("el nivel "+nv+" abre un par sesión+noche", par.length===2&&corto&&largo,
       par.map(k=>X.CROP_DEF[k].label+" ("+X.CROP_DEF[k].growH+"h)").join(" · "));
  }
  ok("la PRIMERA NOCHE existe: la calabaza (3 h) abre al nivel 2",
     X.CROP_DEF.calabaza.lvl===2 && X.CROP_DEF.calabaza.growH===3);
  /* la XP sigue la fórmula: 10 por escalón, en el orden (nivel, duración) */
  const orden=[...X.CROP_ORDER].sort((a,b)=>(X.CROP_DEF[a].lvl-X.CROP_DEF[b].lvl)||(X.CROP_DEF[a].growH-X.CROP_DEF[b].growH));
  ok("la XP se re-derivó del orden nuevo (10 por escalón)",
     orden.every((k,i)=>X.CROP_DEF[k].xp===10*(i+1)), orden.map(k=>X.CROP_DEF[k].xp).join(","));
}
/* 3) EL RITMO EN HORAS. La comparación con los costes viejos ya no vale: el 18/8 la XP pasó a
   medir gestos y no relojes, así que los números absolutos cambiaron a propósito. Lo que hay que
   garantizar es que la escalera de semillas siga siendo alcanzable y que suba de forma pareja. */
{
  const RIT = 3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp;   // Cultivo con 3 parcelas de papa
  const orden=[...X.CROP_ORDER].sort((a,b)=>(X.CROP_DEF[a].lvl-X.CROP_DEF[b].lvl)||(X.CROP_DEF[a].growH-X.CROP_DEF[b].growH));
  const hs = orden.map(k=>acum(X.CROP_DEF[k].lvl)/RIT);
  ok("la escalera de semillas solo sube (en su orden de niveles)", hs.every((v,i)=>i===0||v>=hs[i-1]));
  ok("el primer par nuevo (con su NOCTURNO) llega en menos de 1 h", hs[1]<1, hs[1].toFixed(2)+" h");
  ok("el último escalón (brócoli, nivel 16) queda entre 5 y 30 días de Cultivo", hs[12]/24>5 && hs[12]/24<30,
     (hs[12]/24).toFixed(1)+" días");
  /* El ratio solo se mide donde el número absoluto significa algo. Los primeros saltos son de
     0,35 h a 1,5 h: un ×4 sobre veinte minutos no es un muro, es un rato. */
  const saltos=hs.map((v,i)=>i<1||hs[i-1]<1?0:v/hs[i-1]);
  /* 22/8 (dos carriles): los escalones tardíos van de a dos niveles (8→10→12…), así que el
     salto sano sube apenas: ×3,5 en vez de ×3. Sigue sin ser un muro. */
  ok("a partir de la primera hora, ningún salto entre semillas pasa de ×3,5",
     saltos.every(r=>r<=3.5), "el mayor: ×"+Math.max(...saltos).toFixed(1));
}
// 4) Y LA CURVA DEJA DE SER UN MURO (era el hallazgo grave de la auditoría)
{
  const xpH=14*X.CROP_DEF.papa.xp*3600/X.CROP_DEF.papa.grow;   // ritmo de Cultivo con 14 parcelas
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
