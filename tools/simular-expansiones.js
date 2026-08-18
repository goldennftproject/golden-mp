const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,window:null}; ctx.window=ctx;
ctx.GF={}; 
const src=fs.readFileSync("/sessions/amazing-admiring-mayer/mnt/golden/golden-mp/public/game/state.js","utf8");
// extraer solo las constantes que interesan, sin ejecutar todo el archivo
const XP_BASE=100, XP_EXP=2.7;
const need=l=>Math.round(XP_BASE*Math.pow(l,XP_EXP));
const CD={tree:5400,rock:7200};

// --- rendimiento por casilla ---
// nodo: XP = minutos del reloj; plata = 20/h (ancla verificada)
const XPH_NODO = 60;      // 90 XP / 1,5 h  y  120 XP / 2 h
const XPH_PARC = 100;     // regla del ancla
const PLATA_H  = 20;      // las tres iguales

// ASISTENCIA REALISTA: 3 sesiones al día repartidas en 14 h de vigilia.
// Un nodo con reloj CD solo se puede cosechar cuando pasó su reloj Y hay una sesión.
function cosechasDia(cdSeg, sesiones){
  const h = cdSeg/3600, vigilia = 14, hueco = vigilia/(sesiones-1);
  let n=0, ultimo=-99;
  for(let i=0;i<sesiones;i++){ const t=i*hueco; if(t-ultimo>=h){n++; ultimo=t;} }
  return n + 1; // + la primera de la mañana (el nodo cargó toda la noche)
}
const SES = 3;
const horasNodoDia = (cd)=> cosechasDia(cd,SES)*(cd/3600);
// parcela: tope de semillas 40/parcela/día con papa de 3 min = 2 h de reloj al día
const horasParcDia = 2;

function estado(lvl, tabla){
  let par=3, arb=2, roc=2;
  for(const e of tabla) if(lvl>=e.nivel){ par+=e.par||0; arb+=e.arb||0; roc+=e.roc||0; }
  return {par,arb,roc};
}
function xpDia(s){
  return s.par*XPH_PARC*horasParcDia
       + s.arb*XPH_NODO*horasNodoDia(CD.tree)
       + s.roc*XPH_NODO*horasNodoDia(CD.rock);
}
function plataDia(s){
  return (s.par*horasParcDia + s.arb*horasNodoDia(CD.tree) + s.roc*horasNodoDia(CD.rock))*PLATA_H;
}

function correr(nombre, tabla, hasta){
  console.log("\n===== "+nombre+" =====");
  console.log("nivel  regalo                       par arb roc  casillas  XP/dia  plata/dia  dias  (acum)");
  let acumDias=0, xpAcum=0;
  for(let l=1;l<=hasta;l++){
    const s=estado(l,tabla);
    const e=tabla.find(t=>t.nivel===l);
    const reg = e ? (e.exp?"EXPANSION  ":"           ")+["+"+(e.par||0)+"p","+"+(e.arb||0)+"a","+"+(e.roc||0)+"r"].filter(x=>!/\+0/.test(x)).join(" ") : "— (nivel vacio)";
    const xd=xpDia(s), pd=plataDia(s);
    const falta = l<hasta ? need(l+1)-need(l) : 0;
    const dias = falta/xd;
    acumDias+=dias;
    console.log(String(l).padStart(5)+"  "+reg.padEnd(28)+" "+String(s.par).padStart(3)+String(s.arb).padStart(4)+String(s.roc).padStart(4)+
      String(s.par+s.arb+s.roc).padStart(10)+String(Math.round(xd)).padStart(8)+String(Math.round(pd)).padStart(11)+
      "  "+dias.toFixed(1).padStart(5)+"  "+acumDias.toFixed(1).padStart(6));
  }
}

// ---- TABLA ACTUAL ----
const NIVEL_ARBOLES=[1,1,3,4,6,8], NIVEL_ROCAS=[1,1,4,6,9,12];
const FARM_PARCELA={2:3,4:4,6:5,7:6,12:7,18:8,25:9,35:10,45:11,50:12};
const actual=[];
for(let l=2;l<=20;l++){
  const arb=NIVEL_ARBOLES.filter(n=>n<=l).length-NIVEL_ARBOLES.filter(n=>n<=l-1).length;
  const roc=NIVEL_ROCAS.filter(n=>n<=l).length-NIVEL_ROCAS.filter(n=>n<=l-1).length;
  const pa=(x)=>{let p=3;for(const k in FARM_PARCELA) if(x>=+k)p=FARM_PARCELA[k];return p;};
  const par=pa(l)-pa(l-1);
  if(arb||roc||par) actual.push({nivel:l,par,arb,roc});
}
correr("HOY", actual, 20);

// ---- TABLA PROPUESTA ----
const EXP=[3,5,7,9,11,14,17,20];
const prop=[];
for(let l=2;l<=20;l++){
  if(EXP.includes(l)) prop.push({nivel:l,par:2,arb:1,roc:1,exp:true});
}
// intermedios: 1 casilla, rotando parcela / arbol / roca
const inter=[2,4,6,8,10,12,13,15,16,18,19];
inter.forEach((l,i)=>{ const k=i%3; prop.push({nivel:l,par:k===0?1:0,arb:k===1?1:0,roc:k===2?1:0}); });
prop.sort((a,b)=>a.nivel-b.nivel);
correr("PROPUESTA", prop, 20);

// ---- VARIANTE B: paquete mas chico (+1p +1a +1r) ----
const propB=[];
for(const l of EXP) propB.push({nivel:l,par:1,arb:1,roc:1,exp:true});
inter.forEach((l,i)=>{ const k=i%3; propB.push({nivel:l,par:k===0?1:0,arb:k===1?1:0,roc:k===2?1:0}); });
propB.sort((a,b)=>a.nivel-b.nivel);
correr("VARIANTE B  (+1p +1a +1r por expansion)", propB, 20);
