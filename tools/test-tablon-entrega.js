/* ¿Se pueden entregar los CINCO encargos (3 diarios + semanal + mensual)?
   Reproduce el camino completo: el id que la UI escribe en el HTML -> pedidoEntregar. */
const fs=require("fs"),vm=require("vm"),p=f=>fs.readFileSync("public/game/"+f,"utf8");
const ctx={console,window:{},document:{getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[]},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},Phaser:{Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Between:(a,b)=>a}},
  setTimeout:()=>0,setInterval:()=>0,requestAnimationFrame:()=>0,fetch:()=>Promise.reject()};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(p("config.js")+"\n"+p("state.js")+"\n;this.__TUTO_STEPS=TUTO_STEPS;this.__TUTO_VER=TUTO_VER;",ctx);
const g=ctx;
g.toast=m=>{últ=m};let últ="";
g.log=()=>{};g.refreshHud=()=>{};g.saveFarm=()=>{};g.addXp=()=>{};g.isOpen=()=>false;g.sfx=()=>{};
g.G.tuto={done:true}; g.G.plata=0; g.G.vales=0;
const est=g.pedidosEstado();
const ids=[0,1,2,"S","M"];
let fallos=0;
for(const i of ids){
  const p2 = i==="S"?est.pedSemanal : i==="M"?est.pedMensual : est.lista[i];
  if(!p2){console.log("  -- id",i,"no existe (¿aún no toca?)");continue;}
  // darle exactamente lo que pide
  if(p2.tipo==="res") g.G.res[p2.key]=p2.n; else if(p2.tipo==="fish")(g.G.fish=g.G.fish||{})[p2.key]=p2.n; else (g.G.dishes=g.G.dishes||{})[p2.key]=p2.n;
  últ="";
  const plataAntes=g.G.plata, valesAntes=g.G.vales;
  const ok=g.pedidoEntregar(i);
  const cobro=g.G.plata-plataAntes, vv=g.G.vales-valesAntes;
  console.log((ok?"  OK  ":"  MAL ")+"id "+JSON.stringify(i)+"  "+p2.n+"x"+p2.key+
    "  -> +"+cobro+" plata, +"+vv+" vales"+(últ?"   toast: "+últ:"   (SIN AVISO)"));
  if(!ok)fallos++;
  if(ok&&cobro<=0)fallos++;
}
// y que un clic sin recursos avise en vez de callarse
g.G.res={};const e2=g.pedidosEstado();e2.lista[0].hecho=false;últ="";
const r=g.pedidoEntregar(0);
console.log((!r&&últ?"  OK  ":"  MAL ")+"sin recursos avisa: "+(últ||"(SIN AVISO)"));
if(!últ)fallos++;

console.log("\nEL PRIMER ENCARGO DEL TUTORIAL NO PIDE GRINDEO");
{
  const paso=g.__TUTO_STEPS.findIndex(s=>s.id==="pedido");
  g.G.tuto={step:paso,n:0,done:false,v:g.__TUTO_VER};
  g.G.pedidos=null; g.G.res={}; g.G.fish={}; g.G.dishes={}; g.G.stats={};
  g.G.plata=0; g.G.vales=0; últ="";
  const todos=g.pedidosTodos(), primero=todos[0], diarios=g.pedidosEstado().lista;
  const aparece=todos.length===1&&primero&&primero.i==="T"&&primero.escalon==="tutorial"&&
    primero.p.tipo==="tutorial"&&g.pedidoStock(primero.p)===primero.p.n;
  console.log((aparece?"  OK  ":"  MAL ")+"la nota guiada aparece sola y se puede entregar sin inventario");
  if(!aparece)fallos++;
  const plata0=g.G.plata,vales0=g.G.vales,dobles0=(g.G.pedidos.dobles||0);
  const entrega=g.pedidoEntregar("T");
  const sinPremio=g.G.plata===plata0&&g.G.vales===vales0;
  const diarioConservado=diarios.length===3&&(g.G.pedidos.dobles||0)===dobles0;
  console.log((entrega&&g.G.tuto.done?"  OK  ":"  MAL ")+"entregarla completa el tutorial");
  console.log((sinPremio?"  OK  ":"  MAL ")+"la práctica no emite plata ni vales");
  console.log((diarioConservado?"  OK  ":"  MAL ")+"los tres diarios y su primer ×2 siguen intactos");
  if(!entrega||!g.G.tuto.done||!sinPremio||!diarioConservado)fallos++;
}
console.log(fallos?"\nFALLOS: "+fallos:"\nTodos los encargos se entregan y todo clic contesta.");
process.exit(fallos?1:0);
