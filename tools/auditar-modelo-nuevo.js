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
 const pago={comun:Math.max(1,Math.round(20*(X.FISH_CD||900)/3600)),raro:(X.FISH_VALOR.raro||0)*1.25,
   epico:(X.FISH_VALOR.epico||0)*1.25,legendario:2*X.PRICE.oro};
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
const abre={Cultivo:X.CROP_ORDER.length,"Minería":X.ORE_ORDER.length,Pesca:4,
  "Ganadería":X.ANIMAL_ORDER.length,Cocina:X.RECIPE_ORDER.length,Tala:0};
Object.keys(abre).forEach(k=>{
  ok(k,abre[k]>0||k==="Tala",abre[k]?abre[k]+" escalones":"nada — la madera es plana (decidido)");});
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
ok("niveles vacíos",vacios.length===0,vacios.length?vacios.length+": "+vacios.slice(0,14).join(", ")+(vacios.length>14?"…":""):"ninguno");
if(vacios.length) menor(vacios.length+" niveles del Granero sin nada que dar");

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
