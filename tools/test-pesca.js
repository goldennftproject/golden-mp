/* LA PESCA, ANCLADA (18/8)
   Medido esta mañana: 184 plata/h, el 921% del ancla. Un tiro medio pagaba 61 y cuesta 15.
   Dos casos especiales se llevaban la mitad: el común pagaba plata SUELTA además de dejarte el
   pez, y el legendario imprimía 2 de ORO. Ahora los cuatro son lo mismo: un ingrediente.
     node tools/test-pesca.js                                                                     */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={FISH_VALOR,FISH_ORDER,FISH_CD,PRICE,TOOL_CRAFT,COOK_MARGEN,COOK_PRICE_AUTO};",ctx);
const X=ctx.X, SRC=fs.readFileSync("public/game/state.js","utf8");
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) LOS DOS CASOS ESPECIALES, FUERA
ok("el común ya no paga plata suelta además del pez", !/rar === "comun".*G\.plata \+=/.test(SRC));
ok("el legendario ya no imprime oro", !/tryAddRes\("oro", 2\)/.test(SRC));
ok("ni $Golden", !/rar === "legendario".*golden/i.test(SRC));

// 2) LA ESPERANZA CAE EN EL ANCLA
{
  const P={comun:.60,raro:.25,epico:.12,legendario:.03};
  const M=(X.COOK_PRICE_AUTO?(X.COOK_MARGEN||1.25):1);
  const h=(X.FISH_CD||900)/3600;
  const cana=Object.keys(X.TOOL_CRAFT.rod.cost||{}).reduce((a,k)=>a+(X.PRICE[k]||0)*X.TOOL_CRAFT.rod.cost[k],0)+(X.TOOL_CRAFT.rod.plata||0);
  const costo=3+cana;
  const esp=X.FISH_ORDER.reduce((a,k)=>a+P[k]*(X.FISH_VALOR[k]||0)*M,0);
  const porH=(esp-costo)/h;
  ok("el tiro medio paga lo que debe", Math.abs(esp-(20*h+costo))<2, esp.toFixed(1)+" · debe "+(20*h+costo).toFixed(1));
  ok("la pesca rinde 20 plata/h", Math.abs(porH-20)<3, porH.toFixed(1)+" plata/h ("+(porH/20*100).toFixed(0)+"%)");
}
// 3) LA ESCALERA DE RAREZA SIGUE SIENDO UNA ESCALERA
{
  const v=X.FISH_ORDER.map(k=>X.FISH_VALOR[k]);
  ok("cada rareza vale más que la anterior", v.every((x,i)=>i===0||x>v[i-1]), v.join(" < "));
  ok("y el legendario sigue siendo un premio gordo", v[3]/v[0]>=20, "×"+(v[3]/v[0]).toFixed(0)+" sobre el común");
}
/* 4) NADIE VUELVE A RECORTAR LAS RAREZAS (19/8).
   El 18/8 se probó a que la skill de Pesca cerrara las rarezas y hubo que deshacerlo al medirlo:
   un tiro cuesta 15 y el común vale 5, así que con solo comunes la laguna daba −40 plata/h y no
   llegaba al ancla hasta Pesca 10 — un oficio que solo se sube perdiendo plata. La cuenta de abajo
   deja el motivo por escrito: si alguien vuelve a poner la puerta, este test se pone rojo. */
{
  const P={comun:.60,raro:.25,epico:.12,legendario:.03};
  const M=(X.COOK_PRICE_AUTO?(X.COOK_MARGEN||1.25):1);
  const cana=Object.keys(X.TOOL_CRAFT.rod.cost||{}).reduce((a,k)=>a+(X.PRICE[k]||0)*X.TOOL_CRAFT.rod.cost[k],0)+(X.TOOL_CRAFT.rod.plata||0);
  const costo=3+cana;
  ok("el sorteo de la laguna no mira ninguna skill",
     !/pezUnlocked|nivelOficio\(\s*["']fishing/.test(SRC.split("function goFishing")[1].slice(0,2500)));
  ok("solo con comunes la laguna NO se paga sola (por eso no hay puerta)",
     X.FISH_VALOR.comun*M < costo, X.FISH_VALOR.comun*M+" contra "+costo+" de coste");
  ok("hace falta la cola (épico + legendario) para llegar al ancla",
     (P.epico*X.FISH_VALOR.epico+P.legendario*X.FISH_VALOR.legendario)*M > (20*(X.FISH_CD/3600)+costo)*0.4,
     "la cola es el "+Math.round((P.epico*X.FISH_VALOR.epico+P.legendario*X.FISH_VALOR.legendario)/
       Object.keys(P).reduce((a,k)=>a+P[k]*X.FISH_VALOR[k],0)*100)+"% del valor de la laguna");
}
// 5) NO SE TOCÓ EL RELOJ
ok("la caña sigue en 15 min", (X.FISH_CD||900)===900);
console.log("\n"+(fallos?"FALLOS: "+fallos:"la pesca cae en el ancla y la rareza sigue premiando"));
process.exit(fallos?1:0);
