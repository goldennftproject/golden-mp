/* COSTE DE LAS 16 EXPANSIONES, DERIVADO DEL ANCLA (17/8)
   Direccion: "la expansion no viene solo con el nivel; en Sunflower cada expansion tambien se
   hace con recursos", y "utilizar eso a favor del balance y de que todo quede bien con el ancla".

   NO se inventa un numero por expansion. Se elige cuantos DIAS DE GRANJA debe costar cada una
   (la unica perilla de diseno: de 4 a 12) y el script traduce esos dias a unidades de cada
   recurso usando la produccion REAL del jugador en ese momento. Si manana cambia un reloj o un
   precio, los costes se recalculan solos y el ancla se respeta sin rehacer cuentas a mano.
     node tools/costear-expansiones.js                                                        */
const SES=3;
function cos(cd){const h=cd/3600,q=14/(SES-1);let n=0,u=-99;for(let i=0;i<SES;i++){const t=i*q;if(t-u>=h){n++;u=t;}}return n+1;}
const CD={tree:5400,rock:7200}, ORE={bronce:28800,hierro:43200,oro:50400,diamante:64800};
const PRECIO={madera:4,piedra:6,bronce:12,hierro:15,oro:30,diamante:80};
const T=[[3,1,0,null],[5,0,1,null],[7,1,1,null],[9,1,0,"bronce"],[11,1,1,null],[14,0,1,"hierro"],
[17,1,1,null],[20,1,0,"oro"],[23,1,1,null],[26,1,1,null],[30,0,1,"diamante"],[34,1,1,null],
[38,1,1,"oro"],[42,0,1,"netherita"],[46,1,1,null],[50,1,1,"netherita"]];
const XP=(l)=>Math.round(100*Math.pow(l,2.7));
// la mezcla ahora carga la mano en los minerales, que son los que se apilan sin uso
const MEZ=i=> i<3 ?{madera:.5,piedra:.5}
        : i<6 ?{madera:.35,piedra:.35,bronce:.30}
        : i<9 ?{madera:.25,piedra:.25,bronce:.25,hierro:.25}
        : i<12?{madera:.20,piedra:.20,hierro:.30,oro:.30}
        :      {madera:.15,piedra:.15,oro:.35,diamante:.35};
function correr(base, tope, mostrar){
  const DIAS=T.map((_,i)=>base+(tope-base)*i/(T.length-1));
  let arb=6,roc=6,vet={bronce:1,hierro:1,oro:1,diamante:0},nivel=1,dias=0;
  const gas={},pro={},filas=[];
  T.forEach((t,i)=>{
    while(nivel<t[0]){
      const pd={madera:arb*cos(CD.tree),piedra:roc*cos(CD.rock),bronce:vet.bronce*cos(ORE.bronce),
        hierro:vet.hierro*cos(ORE.hierro),oro:vet.oro*cos(ORE.oro),diamante:vet.diamante*cos(ORE.diamante)};
      const d=(XP(nivel+1)-XP(nivel))/(12240+i*1800); dias+=d;
      for(const k in pd) pro[k]=(pro[k]||0)+pd[k]*d; nivel++;
    }
    const pd={madera:arb*cos(CD.tree),piedra:roc*cos(CD.rock),bronce:vet.bronce*cos(ORE.bronce),
      hierro:vet.hierro*cos(ORE.hierro),oro:vet.oro*cos(ORE.oro),diamante:vet.diamante*cos(ORE.diamante)};
    const m=MEZ(i),c={};
    for(const k in m){ if(!pd[k])continue; c[k]=Math.max(1,Math.round(pd[k]*DIAS[i]*m[k])); gas[k]=(gas[k]||0)+c[k]; }
    filas.push([i+1,t[0],DIAS[i],c,t[3]]);
    arb+=t[1];roc+=t[2]; if(t[3]&&vet[t[3]]!==undefined)vet[t[3]]++;
  });
  let vg=0,vp=0; for(const k in PRECIO){vg+=(gas[k]||0)*PRECIO[k];vp+=(pro[k]||0)*PRECIO[k];}
  if(mostrar){
    console.log("  #  nivel  dias-granja  coste");
    filas.forEach(f=>console.log(String(f[0]).padStart(3)+String(f[1]).padStart(6)+f[2].toFixed(1).padStart(11)+
      "   "+Object.keys(f[3]).map(k=>f[3][k]+" "+k).join(" + ")+(f[4]?"        [trae veta de "+f[4]+"]":"")));
    console.log("\nrecurso     producido  se va en expandir   %");
    ["madera","piedra","bronce","hierro","oro","diamante"].forEach(k=>{
      const p=Math.round(pro[k]||0),g=Math.round(gas[k]||0);
      console.log(k.padEnd(11)+String(p).padStart(9)+String(g).padStart(19)+(p?(100*g/p).toFixed(0):"—").padStart(5)+"%");});
  }
  return 100*vg/vp;
}
console.log("busqueda: que curva de dias-granja drena el 40%\n");
for(const [a,b] of [[1,4.5],[2,8],[3,10],[4,12],[5,14],[6,16]])
  console.log("  de "+a+" a "+b+" dias -> drena "+correr(a,b,false).toFixed(0)+"%");
console.log("\n\n===== LA ELEGIDA =====\n");
correr(4,12,true);
