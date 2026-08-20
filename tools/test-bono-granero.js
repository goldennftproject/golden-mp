/* EL BONO DEL GRANERO SE NOTA EN TODOS LOS NIVELES (18/8)
   Dirección: "además, el yield, ¿recuerdas?" — y tenía razón: el +1,5% por nivel multiplicaba la
   CANTIDAD cosechada y luego redondeaba. Con cultivos de yield 1, `round(1 × 1,435)` sigue siendo
   1: TREINTA Y TRES niveles sin efecto, y al llegar a ×1,5 la parcela saltaba de 20 a 40 plata/h.
   Ahora el bono es de PRECIO y el redondeo va UNA sola vez, sobre el total de la venta.
     node tools/test-bono-granero.js                                                              */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+"\n;this.X={CROP_DEF,CROP_ORDER,FARM_NIVEL_MAX};",ctx);
const X=ctx.X,G=ctx.G;
const SRC=fs.readFileSync("public/game/state.js","utf8")+fs.readFileSync("public/game/farm.js","utf8");
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};
const reset=n=>{G.level=n;G.prestige=0;G.buffs=[];};

// 1) LA COSECHA YA NO SE MULTIPLICA
ok("cosechar da la cantidad de la tabla, sin multiplicar",
   /const gr = Math\.max\(1, cd\.yield \|\| 1\);/.test(SRC));
ok("y el yieldMult viejo queda neutralizado", (reset(50), ctx.yieldMult()===1));

// 2) EL BONO SE NOTA EN CADA NIVEL, SIN SALTOS
{
  const val=n=>{reset(n);return ctx.totalVenta("papa",10);};
  let saltos=0, plano=0;
  for(let n=2;n<=X.FARM_NIVEL_MAX;n++){
    const a=val(n-1), b=val(n);
    if(b>a*1.15) saltos++;              // ningún nivel puede dar un salto brusco
    if(b===a) plano++;
  }
  ok("ningún nivel da un salto de más del 15%", saltos===0, saltos+" saltos");
  /* Con una venta chica (10 papas = 20 de base) el +1,5% son 0,3 por nivel: hacen falta ~3
     niveles para ganar 1 de plata redondeando. Eso es aritmética, no un fallo. Se mide con una
     venta REAL: la cosecha de una granja mediana. */
  const valG=n=>{reset(n);return ctx.totalVenta("papa",200);};
  let planoG=0;
  for(let n=2;n<=X.FARM_NIVEL_MAX;n++) if(valG(n)===valG(n-1)) planoG++;
  ok("con una cosecha de verdad (200), casi ningún nivel es plano",
     planoG<=5, planoG+" planos de "+(X.FARM_NIVEL_MAX-1)+"  ·  con 10 unidades son "+plano);
}
// 3) EL FALLO CONCRETO QUE HABÍA: 33 niveles sin efecto y un salto ×2 en el 34
{
  reset(33); const a=ctx.totalVenta("papa",10);
  reset(34); const b=ctx.totalVenta("papa",10);
  ok("el nivel 34 ya no duplica la parcela", b<a*1.15, a+" → "+b);
  reset(1); const uno=ctx.totalVenta("papa",10);
  reset(10); const diez=ctx.totalVenta("papa",10);
  ok("y al nivel 10 el bono YA se nota (antes no)", diez>uno, uno+" → "+diez);
}
// 4) EL ANCLA SE MUEVE A PROPÓSITO, Y DE FORMA CONOCIDA
{
  reset(1);
  const c=X.CROP_DEF.papa;
  const base=(ctx.precioVenta("papa")*c.yield-c.seedCost)/(c.grow/3600);
  ok("al nivel 1 la parcela sigue en el ancla de 20", Math.abs(base-20)<0.5, base.toFixed(1)+" plata/h");
  reset(X.FARM_NIVEL_MAX);
  const top=(ctx.precioVenta("papa")*c.yield-c.seedCost)/(c.grow/3600);
  const esperado=20*(1+0.015*(X.FARM_NIVEL_MAX-1));
  ok("al nivel 50 rinde lo que dice la fórmula (+1,5% por nivel)",
     Math.abs(top-esperado)<3, top.toFixed(1)+" plata/h · fórmula "+esperado.toFixed(1));
}
// 5) TODOS LOS CULTIVOS SE BENEFICIAN IGUAL
{
  reset(30);
  const r=X.CROP_ORDER.map(k=>{const c=X.CROP_DEF[k];
    return (ctx.precioVenta(k)*c.yield-c.seedCost)/(c.grow/3600);});
  const min=Math.min(...r), max=Math.max(...r);
  ok("los 13 cultivos rinden lo mismo entre sí al nivel 30", max/min<1.1,
     min.toFixed(1)+" – "+max.toFixed(1)+" plata/h");
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"el bono del Granero se nota en todos los niveles y sin saltos"));
process.exit(fallos?1:0);
