/* QUÉ GANA EL JUGADOR EN CADA NIVEL — SIN UN SOLO COSMÉTICO (18/8, dirección)
   "Los adornos no mejoran nada al usuario más que algo visual... en cada nivel tendría que ganar
   algo que realmente le mejore su experiencia en el juego."
   REGLA: cada nivel entrega una PALANCA DE COMODIDAD o ACCESO. Nada que multiplique la plata por
   hora (eso rompería el ancla de 20/h) y nada decorativo. Las quince palancas existen ya en el
   código y hoy están fijas: son quince recompensas sin dueño.
   REPARTO:  el Granero da ESPACIO y CONSTRUCCIÓN · cada oficio da LO SUYO.
     node tools/tabla-recompensas.js                                                              */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={FARM_NIVEL_MAX,FARM_EXPANSION,PLANO_NIVEL,BUILD_DEF,FARM_EDIF2,CROP_ORDER,CROP_DEF,skillNeed,CD,FISH_CD,INV_BASE,SEED_POR_PARCELA,COOK_SLOTS,STAM_RECARGAS_DIA,EXCAV_POR_DIA,PED_POR_DIA,RECIPE_ORDER,RECIPE_DEF,ZONA_ORDER,ZONA_DEF,ANIMAL_ORDER,ANIMAL_DEF,pescaZonaAlto};",ctx);
const X=ctx.X;

/* ---------- EL GRANERO: espacio y construcción ---------- */
const granero=[];
for(let n=2;n<=X.FARM_NIVEL_MAX;n++){
  const g=[];
  const ex=X.FARM_EXPANSION.indexOf(n); if(ex>=0) g.push("EXPANSIÓN "+(ex+1)+" · 25 celdas de terreno");
  for(const t in X.PLANO_NIVEL) if(X.PLANO_NIVEL[t]===n) g.push("plano de "+X.BUILD_DEF[t].label);
  if(X.FARM_EDIF2[n]) g.push(X.BUILD_DEF[X.FARM_EDIF2[n]].label+" nivel 2");
  granero.push({n,g});
}
// las palancas de ESPACIO se reparten por los huecos que quedan
const huecos=granero.filter(f=>!f.g.length).map(f=>f.n);
const PALANCAS_GRANERO=[
  ["+4 huecos de bolsa", 8],           // 20 → 52
  ["+10 de capacidad de cofre", 6],    // el cofre depósito crece
  ["+1 cofre depósito colocable", 4],
];
let ip=0, rest=PALANCAS_GRANERO.map(p=>p[1]);
huecos.forEach((niv,i)=>{
  while(ip<rest.length && rest[ip]<=0) ip++;
  if(ip>=rest.length) return;
  granero.find(f=>f.n===niv).g.push(PALANCAS_GRANERO[ip][0]); rest[ip]--;
  if(i%2===1) ip=(ip+1)%PALANCAS_GRANERO.length;
});

LOG("═══ EL GRANERO · espacio y construcción ═══\n");
LOG("  nivel   qué gana");
granero.forEach(f=>LOG("   "+String(f.n).padStart(4)+"    "+(f.g.join("  +  ")||"— (sin asignar)")));
const vacios=granero.filter(f=>!f.g.length).map(f=>f.n);
LOG("\n  niveles todavía sin nada: "+(vacios.length?vacios.join(", "):"ninguno")+"   ·   sin un solo cosmético");

/* ---------- LOS OFICIOS ---------- */
const acum=(n,sk)=>{let a=0;for(let i=1;i<n;i++)a+=X.skillNeed(i,sk);return a;};
const RIT={tala:3*3600/X.CD.tree*10, mining:3*3600/X.CD.rock*10,
           farming:3*3600/X.CROP_DEF.papa.grow*X.CROP_DEF.papa.xp,
           fishing:3600/(X.FISH_CD||900)*15, ganaderia:60, cooking:60};
const OFICIOS={
  farming:{nom:"Cultivo",prem:{}},
  tala:{nom:"Tala",prem:{}},
  mining:{nom:"Minería",prem:{}},
  fishing:{nom:"Pesca",prem:{}},
  ganaderia:{nom:"Ganadería",prem:{}},
  cooking:{nom:"Cocina",prem:{}},
};
// Cultivo: las 13 semillas + el cupo diario
X.CROP_ORDER.forEach(k=>{const c=X.CROP_DEF[k]; if(c.lvl>1)(OFICIOS.farming.prem[c.lvl]=OFICIOS.farming.prem[c.lvl]||[]).push("semilla de "+c.label);});
[4,8,11,14,18].forEach((n,i)=>(OFICIOS.farming.prem[n]=OFICIOS.farming.prem[n]||[]).push("+8 semillas por parcela y día ("+(X.SEED_POR_PARCELA+8*(i+1))+")"));
[3,6,9,13,16,19].forEach((n,i)=>(OFICIOS.farming.prem[n]=OFICIOS.farming.prem[n]||[]).push("parcela nº"+(4+i)));
/* 22/8 (auditoría integral): esta tabla listaba premios que el CÓDIGO no da — % de pez raro,
   cargas que crecían con la Tala, huecos de establo cada 5 niveles. Ahora solo lo real. */
// Tala
[5,8,11].forEach((n,i)=>(OFICIOS.tala.prem[n]=OFICIOS.tala.prem[n]||[]).push("árbol nº"+(4+i)));
// Minería
[5,8,11].forEach((n,i)=>(OFICIOS.mining.prem[n]=OFICIOS.mining.prem[n]||[]).push("roca/veta nº"+(4+i)));
// Pesca (v2, 22/8): CADA nivel agranda la zona de captura del carrete — se muestran los hitos
[5,10,15].forEach(n=>(OFICIOS.fishing.prem[n]=OFICIOS.fishing.prem[n]||[]).push("zona de captura al "+Math.round(X.pescaZonaAlto(n)*100)+"% de la barra (crece +1,2% por nivel)"));
// Ganadería: un lugar de establo POR NIVEL (22/8) + los animales
X.ANIMAL_ORDER.forEach((k,i)=>{const n=[1,4,8,13][i]; if(n>1)(OFICIOS.ganaderia.prem[n]=OFICIOS.ganaderia.prem[n]||[]).push("animal: "+X.ANIMAL_DEF[k].label);});
for(let n=2;n<=19;n++)(OFICIOS.ganaderia.prem[n]=OFICIOS.ganaderia.prem[n]||[]).push("+1 lugar de establo ("+(n+1)+")");
// Cocina
X.RECIPE_ORDER.forEach(k=>{const r=X.RECIPE_DEF[k]; if(r.lvl>1)(OFICIOS.cooking.prem[r.lvl]=OFICIOS.cooking.prem[r.lvl]||[]).push("receta: "+r.label);});
[4,8,12].forEach((n,i)=>(OFICIOS.cooking.prem[n]=OFICIOS.cooking.prem[n]||[]).push("olla nº"+(X.COOK_SLOTS+1+i)));

LOG("\n\n═══ LOS OFICIOS · cada uno mejora lo suyo ═══");
Object.keys(OFICIOS).forEach(sk=>{
  const o=OFICIOS[sk];
  LOG("\n  ── "+o.nom+" ──");
  LOG("   nivel   horas del oficio   qué gana");
  const nivs=Object.keys(o.prem).map(Number).sort((a,b)=>a-b);
  nivs.forEach(n=>{
    const h=RIT[sk]?acum(n,sk)/RIT[sk]:null;
    LOG("    "+String(n).padStart(4)+"   "+(h!=null?(h<48?h.toFixed(1)+" h":(h/24).toFixed(1)+" d"):"—").padStart(14)+
        "     "+o.prem[n].join("  +  "));});
  const tope=Math.max(...nivs), sin=[];
  for(let i=2;i<=tope;i++) if(!o.prem[i]) sin.push(i);
  LOG(sk==="fishing" ? "   niveles sin nada: ninguno — TODOS agrandan la zona de captura (+1,2%/nivel)"
      : "   niveles sin nada hasta el "+tope+": "+(sin.length?sin.join(", "):"ninguno"));
});
LOG("\n\nNi un adorno, ni un título, ni un marco. Todo lo de arriba quita fricción o abre contenido.");
LOG("Ninguna palanca multiplica la plata por hora: el ancla de 20/h queda intacta.");
