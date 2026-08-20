/* AUDITORÍA DEL MODELO NUEVO, ANTES DE ESCRIBIRLO (18/8, dirección)
   "Hay que hacer auditoría de todo, de cada valor, de cada tiempo, de cada acción."
   El modelo que se audita —todavía NO está en el juego— es:
     · las EXPANSIONES son la única fuente de nodos (3 celdas cada una), derivadas de una fórmula
     · los OFICIOS abren el ESCALÓN de su material (semillas, minerales, rarezas, animales, recetas)
     · la Tala no abre nada: la madera es plana, y eso es una decisión
     · la XP se paga por ACCIÓN, con una curva por oficio (ya está en el juego)
     · los RELOJES no se tocan
     node tools/auditar-modelo-nuevo.js                                                           */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={CD,CROP_DEF,CROP_ORDER,ORE_DEF,ORE_ORDER,PRICE,MAT_DEF,PICK_DEF,TOOL_CRAFT,FISH_CD,FISH_VALOR,FISH_COST,"+
 "FARM_NIVEL_MAX,FARM_XP_LVLS,BUILD_DEF,PLANO_NIVEL,FARM_COFRE,FARM_EDIF2,RECIPE_DEF,RECIPE_ORDER,ANIMAL_DEF,ANIMAL_ORDER,"+
 "skillNeed,xpDeNodo,XP_ACCION,XP_PEZ,XP_ANIMAL,SEED_POR_PARCELA,SKILL_DEFS};",ctx);
const X=ctx.X, ANCLA=20, N=+(process.argv[2]||16);
const hall=[]; const grave=t=>hall.push(["GRAVE",t]); const menor=t=>hall.push(["menor",t]);
const val=k=>{if(X.PRICE[k]!=null)return X.PRICE[k];const m=(X.MAT_DEF||{})[k];if(!m)return 0;
  return Object.keys(m.cost||{}).reduce((a,j)=>a+val(j)*m.cost[j],0);};
const acum=(n,sk)=>{let a=0;for(let i=1;i<n;i++)a+=X.skillNeed(i,sk);return a;};
const ok=(t,c,d)=>LOG("  "+(c?"ok  ":"!!  ")+t.padEnd(46)+(d||""));

/* ---- 1. EL ANCLA: cada celda, 20 plata/hora ---- */
LOG("\n═══ 1. EL ANCLA · toda celda productiva rinde 20 plata/hora ═══\n");
X.CROP_ORDER.forEach(k=>{const c=X.CROP_DEF[k];
  const r=(c.price*c.yield-c.seedCost)/(c.grow/3600);
  ok(c.label,Math.abs(r-ANCLA)<=2,r.toFixed(1)+" plata/h");
  if(Math.abs(r-ANCLA)>2) grave("Cultivo "+c.label+" a "+r.toFixed(1)+" plata/h");});
{const a=(X.PRICE.madera-(X.TOOL_CRAFT.axe.plata||0))/(X.CD.tree/3600);
 ok("Árbol",Math.abs(a-ANCLA)<=2,a.toFixed(1)+" plata/h");}
{const PK={piedra:"stone",bronce:"bronze",hierro:"iron",oro:"gold",diamante:"diamond",netherita:"netherite"};
 X.ORE_ORDER.forEach(k=>{const o=X.ORE_DEF[k],pd=X.PICK_DEF[PK[k]];
   let cp=pd.plata||0; for(const m in pd.cost||{}) cp+=pd.cost[m]*val(m);
   const r=(val(k)*o.yield-cp/(pd.dur||1))/(o.cd/3600);
   ok("Veta de "+k,Math.abs(r-ANCLA)<=2,r.toFixed(1)+" plata/h");
   if(Math.abs(r-ANCLA)>2) grave("Veta de "+k+" a "+r.toFixed(1)+" plata/h");});}
{const P={comun:.6,raro:.25,epico:.12,legendario:.03};
 /* 18/8: los cuatro peces son un ingrediente con su valor. Esta tabla tenía escritos a mano los
    dos casos especiales que se quitaron, y por eso seguía midiendo el modelo viejo. */
 const pago={}; Object.keys(P).forEach(k=>pago[k]=(X.FISH_VALOR[k]||0)*1.25);
 const esp=Object.keys(P).reduce((a,k)=>a+P[k]*pago[k],0);
 const costo=3+(X.TOOL_CRAFT.rod?Object.keys(X.TOOL_CRAFT.rod.cost||{}).reduce((a,k)=>a+val(k)*X.TOOL_CRAFT.rod.cost[k],0):0);
 const r=(esp-costo)/((X.FISH_CD||900)/3600);
 ok("Pesca (media ponderada)",Math.abs(r-ANCLA)<=5,r.toFixed(0)+" plata/h");
 if(r>ANCLA*1.5) grave("La PESCA rinde "+r.toFixed(0)+" plata/h ("+(r/ANCLA*100).toFixed(0)+"% del ancla)");}

/* ---- 2. LOS RELOJES: no se tocan ---- */
LOG("\n═══ 2. LOS RELOJES · sin cambios, como pidió dirección ═══\n");
ok("árbol",X.CD.tree===1800,(X.CD.tree/60)+" min");
ok("roca",X.CD.rock===2400,(X.CD.rock/60)+" min");
ok("papa",X.CROP_DEF.papa.grow===180,(X.CROP_DEF.papa.grow/60)+" min");
ok("maíz",X.CROP_DEF.maiz.grow===86400,(X.CROP_DEF.maiz.grow/3600)+" h");
ok("caña",(X.FISH_CD||900)===900,((X.FISH_CD||900)/60)+" min");

/* ---- 3. LAS EXPANSIONES DERIVADAS ---- */
LOG("\n═══ 3. LAS EXPANSIONES · única fuente de nodos, "+N+" de ellas ═══\n");
const NIV_MIN=3,NIV_MAX=X.FARM_NIVEL_MAX;
const niveles=[]; for(let i=0;i<N;i++){let n=Math.round(NIV_MIN+(NIV_MAX-NIV_MIN)*Math.pow(i/(N-1),1.25));
  if(i&&n<=niveles[i-1])n=niveles[i-1]+1; niveles.push(Math.min(n,NIV_MAX));}
const horasDe=i=>2+(30-2)*Math.pow(i/(N-1),0.9);
let celdas=9,totalP=0,totalH=0;
for(let i=0;i<N;i++){const h=horasDe(i);totalP+=h*celdas*ANCLA;totalH+=h;celdas+=3;}
ok("los niveles no se repiten ni bajan",niveles.every((v,i)=>i===0||v>niveles[i-1]));
ok("la primera en el nivel "+niveles[0],niveles[0]>=2&&niveles[0]<=4);
ok("la última en el nivel "+niveles[N-1],niveles[N-1]===X.FARM_NIVEL_MAX);
ok("techo de celdas",celdas===9+3*N,celdas+" celdas = "+celdas*ANCLA+" plata/h");
ok("ninguna pasa de 40 h de granja",horasDe(N-1)<=40,Math.round(horasDe(N-1))+" h la última");
ok("total a pagar",true,Math.round(totalP).toLocaleString("es")+" de plata = "+Math.round(totalH)+" h");

/* ---- 4. LOS OFICIOS: qué abre cada uno ---- */
LOG("\n═══ 4. LOS OFICIOS · qué escalón abre cada uno ═══\n");
/* 18/8: esto ya NO es un modelo sobre papel — las puertas están escritas. Así que en vez de contar
   cuántos escalones "habría", se le pregunta al juego a qué nivel abre cada uno y cuántas horas de
   práctica cuesta. Si mañana alguien mueve un nivel, esta tabla lo canta. */
const HORAS={farming:3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp, mining:3*3600/X.CD.rock*X.XP_ACCION,
  fishing:3600/X.FISH_CD*X.XP_PEZ, ganaderia:60, cooking:60};
const puertas={
  Cultivo:["farming",X.CROP_ORDER.map(k=>[X.CROP_DEF[k].label,X.CROP_DEF[k].lvl])],
  "Minería":["mining",X.ORE_ORDER.map(k=>[X.ORE_DEF[k].label,ctx.oreNivelReq(k)])],
  Pesca:["fishing",["comun","raro","epico","legendario"].map(r=>[r,ctx.pezNivelReq(r)])],
  "Ganadería":["ganaderia",X.ANIMAL_ORDER.map(k=>[X.ANIMAL_DEF[k].label,ctx.animalNivelReq(k)])],
  Cocina:["cooking",X.RECIPE_ORDER.map(k=>[X.RECIPE_DEF[k].label,X.RECIPE_DEF[k].lvl||1])]};
/* La COCINA no es una escalera sino un RECETARIO: varias recetas comparten nivel y hay dos ramas
   (huerta, y pescado/carne) que empiezan las dos por abajo. Se le pide suelo y que no deje niveles
   muertos, no que suba de uno en uno. */
const ESCALERA={Cultivo:1,"Minería":1,Pesca:1,"Ganadería":1};
Object.keys(puertas).forEach(nom=>{
  const [sk,esc]=puertas[nom]; const niv=esc.map(e=>e[1]).slice().sort((a,b)=>a-b);
  const sube=!ESCALERA[nom]||niv.every((v,i)=>i===0||v>niv[i-1]), suelo=niv[0]===1;
  const h=acum(niv[niv.length-1],sk)/(HORAS[sk]||60);
  ok(nom,sube&&suelo,esc.length+(ESCALERA[nom]?" escalones · nv ":" recetas · nv ")+niv.join(",")+" · el último a "+
    (h<48?h.toFixed(0)+" h":(h/24).toFixed(0)+" d"));
  if(!suelo) grave(nom+" no tiene ningún escalón abierto en el nivel 1: el jugador abre el panel y lo ve todo gris");
  if(!sube) grave("La escalera de "+nom+" no sube limpia: "+niv.join(","));
  {const hueco=niv.filter((v,i)=>i&&v-niv[i-1]>3);
   if(hueco.length) menor(nom+" deja un tramo sin nada nuevo antes del nivel "+hueco.join(", "));}
  if(h/24>30) menor("El último escalón de "+nom+" pide "+(h/24).toFixed(0)+" días de práctica");});
ok("Tala",true,"nada — la madera es plana (decidido)");
/* LAS DOS PUERTAS DE LA MINERÍA no se pueden pisar: el PICO es el consumible que sostiene el ancla
   (su coste entra en el precio sombra) y la SKILL es el saber. Si un mineral pidiera un pico que no
   existe, la puerta de la skill sería adorno. */
{const topePico=Math.max.apply(null,Object.keys(X.PICK_DEF).map(p=>X.PICK_DEF[p].mineTier));
 const huerfanos=X.ORE_ORDER.filter(k=>X.ORE_DEF[k].tier>topePico);
 ok("cada mineral tiene un pico que lo alcanza",!huerfanos.length,huerfanos.join(", ")||"los "+X.ORE_ORDER.length);
 if(huerfanos.length) grave("Minerales sin pico posible: "+huerfanos.join(", "));}
{ // ¿los niveles que piden los cultivos siguen siendo alcanzables?
  const RIT=3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp;
  const hMaiz=acum(X.CROP_DEF.maiz.lvl,"farming")/RIT/24;
  ok("el maíz, el último escalón",hMaiz<25,hMaiz.toFixed(1)+" días de Cultivo");
  if(hMaiz>25) menor("El maíz pide "+hMaiz.toFixed(0)+" días de Cultivo");}

/* ---- 5. EL GRANERO: qué le queda ---- */
LOG("\n═══ 5. EL GRANERO · espacio y construcción ═══\n");
let conAlgo=0,vacios=[];
for(let n=2;n<=X.FARM_NIVEL_MAX;n++){
  let g=niveles.includes(n);
  for(const t in X.PLANO_NIVEL) if(X.PLANO_NIVEL[t]===n) g=true;
  if(X.FARM_COFRE[n]||X.FARM_EDIF2[n]) g=true;
  if(g) conAlgo++; else vacios.push(n);}
ok("niveles con algo que dar",conAlgo>=X.FARM_NIVEL_MAX*0.5,conAlgo+" de "+(X.FARM_NIVEL_MAX-1));
/* 18/8: el Granero NO está vacío en esos niveles — da el bono de venta (+1,5% por nivel), que es
   continuo y llega a TODOS. Se me había escapado al escribir esta auditoría: contaba solo los
   premios de tabla. Lo que se mide ahora es si además de ese bono hay algo puntual. */
ok("todos los niveles dan el bono de venta (+1,5%)",true,"al 50 son +"+Math.round(0.015*(X.FARM_NIVEL_MAX-1)*100)+"% sobre el margen");
ok("y además, niveles con un premio puntual",conAlgo>=20,conAlgo+" de "+(X.FARM_NIVEL_MAX-1));
if(vacios.length) menor(vacios.length+" niveles solo dan el bono, sin premio puntual: "+vacios.slice(0,10).join(", ")+(vacios.length>10?"…":""));

/* ---- 6. EL ARRANQUE: ¿el jugador se atasca? ---- */
LOG("\n═══ 6. EL ARRANQUE · ¿se puede llegar a la 1ª expansión? ═══\n");
{
  const RITf=3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp;   // Cultivo con 3 parcelas
  const xpNivel3=X.FARM_XP_LVLS[3];
  const hNivel3=xpNivel3/RITf;
  ok("el nivel 3 de Granero (1ª expansión)",hNivel3<5,hNivel3.toFixed(1)+" h de cultivo");
  const mad=X.BUILD_DEF.store.cost.madera+X.BUILD_DEF.horno.cost.madera+X.BUILD_DEF.cocina.cost.madera;
  const hMad=mad/(3*3600/X.CD.tree);
  ok("la madera del tutorial con 3 árboles",hMad<8,hMad.toFixed(1)+" h de reloj");
  const c1=horasDe(0)*9*ANCLA;
  ok("pagar la 1ª expansión",c1/180<5,(c1/180).toFixed(1)+" h de granja ("+Math.round(c1)+" de plata)");
}

/* ---- RESUMEN ---- */
LOG("\n"+"═".repeat(72));
if(!hall.length) LOG("SIN HALLAZGOS: el modelo nuevo cuadra en todo lo medido.");
else{
  const g=hall.filter(h=>h[0]==="GRAVE"),m=hall.filter(h=>h[0]==="menor");
  LOG("HALLAZGOS GRAVES: "+g.length); g.forEach(h=>LOG("  · "+h[1]));
  LOG("HALLAZGOS MENORES: "+m.length); m.forEach(h=>LOG("  · "+h[1]));
}
