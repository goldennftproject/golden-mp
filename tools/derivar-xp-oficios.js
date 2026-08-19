/* LA XP MIDE LA PRÁCTICA, NO LA ESPERA (18/8, dirección)
   "Que la experiencia esté ligada al tiempo que tarda algo en crecer es una inconsistencia muy
   abrupta." Cierto: tres clics en netherita pagan 1.440 y tres clics en una roca, 40. El mismo
   gesto, 36 veces más, solo porque el reloj es más largo.
   MODELO NUEVO: XP = por ACCIÓN COMPLETADA, escalada por el ESCALÓN del material (su tier), no
   por su reloj. La plata sigue midiendo el tiempo; la XP mide el oficio.
     node tools/derivar-xp-oficios.js                                                             */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={CD,ORE_DEF,ORE_ORDER,CROP_DEF,CROP_ORDER,FISH_CD,ANIMAL_DEF,ANIMAL_ORDER,RECIPE_DEF,RECIPE_ORDER,skillNeed,XP_BASE,XP_EXP};",ctx);
const X=ctx.X;

/* ---- LA REGLA ----
   XP = BASE × escalón. El escalón es la posición del material en SU escalera, no su reloj.
   BASE 10 para que los números sean legibles y el escalón vaya de 1 a 6 (minerales) o 1 a 13
   (cultivos), que es lo que el jugador percibe como "esto es más difícil". */
const BASE = 10;
const escalonMineral = { piedra:1, bronce:2, hierro:3, oro:4, diamante:5, netherita:6 };
const xpNodo = (tipo, key) => {
  if (tipo === "tree") return BASE;                       // la madera es un solo escalón
  return BASE * (escalonMineral[key] || 1);
};
const xpCultivo = (k) => BASE * (X.CROP_ORDER.indexOf(k) + 1);   // escalón 1..13
const xpPez = 15, xpAnimal = 20, xpPlato = 20;

LOG("XP POR ACCIÓN (base " + BASE + " × escalón del material)\n");
LOG("  acción                    reloj      XP hoy    XP nueva    lo que cambia");
const fila=(n,cd,hoy,nueva)=>LOG("  "+n.padEnd(24)+((cd<3600?(cd/60)+" min":(cd/3600)+" h")).padStart(7)+
  String(hoy).padStart(10)+String(nueva).padStart(11)+"    ×"+(nueva/hoy).toFixed(2));
fila("talar un árbol",X.CD.tree,30,xpNodo("tree"));
fila("picar una roca",X.CD.rock,40,xpNodo("rock","piedra"));
X.ORE_ORDER.filter(k=>k!=="piedra").forEach(k=>
  fila("picar "+k,X.ORE_DEF[k].cd,Math.round(X.ORE_DEF[k].cd/60),xpNodo("rock",k)));
LOG("");
["papa","cebolla","calabaza","maiz"].forEach(k=>{const c=X.CROP_DEF[k];
  fila("cosechar "+k,c.grow,c.xp,xpCultivo(k));});

/* ---- QUÉ RITMO SALE ----
   Con N nodos, un oficio produce N acciones por cada vuelta de reloj. La XP por hora ya no
   depende del reloj por el VALOR de la acción, pero sí por CUÁNTAS acciones caben. Eso es
   correcto: es el ritmo del juego, no una recompensa por esperar. */
LOG("\n\nXP POR HORA DE CADA OFICIO (con los nodos que se tienen en cada momento)\n");
LOG("  oficio        nodos   acciones/h   XP/h");
const filaH=(n,nodos,cd,xp)=>{const acc=nodos*3600/cd;LOG("  "+n.padEnd(14)+String(nodos).padStart(3)+
  String(acc.toFixed(1)).padStart(13)+String(Math.round(acc*xp)).padStart(7));};
filaH("Tala",3,X.CD.tree,xpNodo("tree")); filaH("Tala",6,X.CD.tree,xpNodo("tree"));
filaH("Minería",3,X.CD.rock,xpNodo("rock","piedra")); filaH("Minería",6,X.CD.rock,xpNodo("rock","piedra"));
{const c=X.CROP_DEF.papa; filaH("Cultivo",3,c.grow,xpCultivo("papa")); filaH("Cultivo",8,c.grow,xpCultivo("papa"));}
filaH("Pesca",1,X.FISH_CD||900,xpPez);

/* ---- LA CURVA QUE HACE FALTA ----
   Se resuelve al revés: fijamos EN HORAS cuándo debe llegar cada hito y buscamos la curva. */
LOG("\n\nLA CURVA DE NIVELES QUE ENCAJA CON ESA XP\n");
const META = [[2,0.5],[4,3],[6,10],[8,25],[10,50],[13,120],[17,300],[20,500]];  // nivel → horas de oficio
const XPH = 3*3600/X.CD.tree*xpNodo("tree");         // el oficio más lento: Tala con 3 nodos
LOG("  se calibra con el oficio más lento (Tala con 3 árboles = "+XPH+" XP/h)");
let mejor=null;
for(let b=2;b<=60;b+=1) for(let e=1.2;e<=3.2;e+=0.02){
  const ac=n=>{let a=0;for(let i=1;i<n;i++)a+=Math.round(b*Math.pow(i,e));return a;};
  let err=0; META.forEach(([n,h])=>{const hh=ac(n)/XPH; err+=Math.pow(Math.log(Math.max(hh,0.01)/h),2);});
  if(!mejor||err<mejor.err) mejor={b,e,err};
}
const ac=n=>{let a=0;for(let i=1;i<n;i++)a+=Math.round(mejor.b*Math.pow(i,mejor.e));return a;};
LOG("  XP_BASE "+mejor.b+"  ·  exponente "+mejor.e.toFixed(2)+"\n");
LOG("  nivel   XP acum.    horas de oficio   (meta)");
META.forEach(([n,h])=>LOG("   "+String(n).padStart(4)+String(ac(n)).padStart(11)+
  String((ac(n)/XPH).toFixed(1)).padStart(16)+" h"+String(h).padStart(9)+" h"));
LOG("\n  y el techo:");
[30,50,100,150].forEach(n=>{const h=ac(n)/XPH;
  LOG("   nivel "+String(n).padStart(3)+": "+String(ac(n)).padStart(12)+" XP = "+
    (h<24*365?(h/24).toFixed(0)+" días":(h/24/365).toFixed(1)+" años")+" de ese oficio sin parar");});
