/* QUÉ SE GANA EN CADA NIVEL DE GRANJA — para el diseñador (18/8)
   Todo sale del juego: si mañana cambia una tabla, esto cambia solo.
     node tools/tabla-niveles.js                                                                  */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+"\n;this.farmUnlockTxt=farmUnlockTxt;this.X={FARM_XP_LVLS,FARM_UNLOCK,FARM_PARCELA,FARM_EXPANSION,FARM_COFRE,FARM_EDIF2,FARM_NIVEL_MAX,NIVEL_ARBOLES,NIVEL_ROCAS,CROP_DEF,CROP_ORDER,BUILD_DEF,PLANO_NIVEL,EXPANSION_COSTO,PRICE,MAT_DEF};",ctx);
const X=ctx.X;
const parcelasEn=n=>{let p=3;for(const k in X.FARM_PARCELA)if(n>=+k)p=X.FARM_PARCELA[k];return p;};
const arbEn=n=>X.NIVEL_ARBOLES.filter(v=>v<=n).length;
const rocEn=n=>X.NIVEL_ROCAS.filter(v=>v<=n).length;
const cultivoEn=n=>X.CROP_ORDER.filter(k=>X.CROP_DEF[k].lvl===n).map(k=>X.CROP_DEF[k].label);
const planoEn=n=>Object.keys(X.PLANO_NIVEL||{}).filter(t=>X.PLANO_NIVEL[t]===n).map(t=>X.BUILD_DEF[t].label);
const valorMat=k=>{ if(X.PRICE[k]!=null)return X.PRICE[k];
  const m=(X.MAT_DEF||{})[k]; if(!m)return 0;
  return Object.keys(m.cost||{}).reduce((a,j)=>a+valorMat(j)*m.cost[j],0); };

const filas=[];
for(let n=1;n<=X.FARM_NIVEL_MAX;n++){
  const exps=X.FARM_EXPANSION.filter(v=>v<=n).length;
  /* 18/8: las celdas las reparte SOLO la expansión (3 cada una) sobre las 9 de arranque.
     El nivel de granja ya no da parcelas ni nodos. */
  filas.push({ n, xp:X.FARM_XP_LVLS[n]||0,
    celdas: 9 + 3*exps,
    gana: n===1 ? "granja de arranque: 3 parcelas, 3 árboles, 3 rocas" : ctx.farmUnlockTxt(n) });
}
const md=["# Qué se gana en cada nivel de granja","",
  "Generado de las tablas del juego (`tools/tabla-niveles.js`). Si cambia un número, esta tabla cambia sola.","",
  "**Celdas** = 9 de arranque (3 parcelas, 3 árboles, 3 rocas) + 3 por cada expansión comprada.",
  "Cada celda rinde **20 plata/hora** (el ancla), así que la columna de celdas *es* la curva de ingresos.","",
  "| Nivel | XP de granja | Celdas | Qué gana |","|---:|---:|---:|---|"];
LOG("QUÉ SE GANA EN CADA NIVEL DE GRANJA\n");
LOG("nivel        XP   celdas   qué gana");
filas.forEach(f=>{
  if(!f.gana) return;
  LOG(String(f.n).padStart(4)+String(f.xp.toLocaleString("es")).padStart(11)+String(f.celdas).padStart(8)+"   "+f.gana);
  md.push("| "+f.n+" | "+f.xp.toLocaleString("es")+" | "+f.celdas+" | "+f.gana+" |");
});
const sinNada=filas.filter(f=>!f.gana).map(f=>f.n);
if(sinNada.length){ LOG("\nNIVELES QUE NO DAN NADA: "+sinNada.join(", "));
  md.push("", "**Niveles que no entregan nada:** "+sinNada.join(", ")+"."); }
LOG("\nceldas = parcelas + árboles + rocas + las parcelas de las expansiones · cada celda = 20 plata/h");
fs.writeFileSync("../niveles-de-granja.md", md.join("\n")+"\n");
LOG("\nescrito: niveles-de-granja.md");
