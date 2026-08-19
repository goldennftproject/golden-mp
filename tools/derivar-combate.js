/* DERIVA LA DEFENSA Y EL BOTÍN DE CADA MONSTRUO DESDE EL ANCLA (18/8)
   Reglas:
     · la defensa es el 30% del daño del arma de su tramo (0 en los de entrada, donde el freno es
       la vida, que se ve en la barra), así el arma que te toca SIEMPRE sirve;
     · cada muerte deja el desgaste del arma MÁS 20 por hora del tiempo que lleva matarlo;
     · si los materiales que suelta ya se pasan, se recorta su PROBABILIDAD y no la cantidad: el
       drop se siente igual cuando cae, solo cae menos seguido.
   Imprime el JSON para pegar. Correr después de tocar precios o relojes.
     node tools/derivar-combate.js                                                               */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON}; ctx.window=ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js","utf8"),ctx,{filename:"config.js"});
vm.runInNewContext(fs.readFileSync("public/game/state.js","utf8")+
  "\n;window.__X={MONSTER_DEF,ARM_DEF,ARM_RAREZAS,PRICE,ATTACK_MS};",ctx,{filename:"state.js"});
const X=ctx.__X,P=X.PRICE,ANCLA=20;
const armaDe=l=>l<=10?"madera":l<=20?"piedra":l<=30?"bronce":l<=45?"oro":"diamante";
const A={}; X.ARM_RAREZAS.forEach(r=>{const a=X.ARM_DEF["espada_"+r]; let rep=0;
  for(const k in a.repair) rep+=a.repair[k]*(P[k]||0); A[r]={dmg:(a.min+a.max)/2, g:rep/a.dur};});
const OUT={};
console.log("bicho            nv  def  golpes   objetivo   material   plata");
Object.keys(X.MONSTER_DEF).forEach(k=>{
  const m=X.MONSTER_DEF[k]; if(m.boss) return;
  const lvl=m.lvl||1, a=A[armaDe(lvl)];
  const def = lvl<=10 ? 0 : Math.round(a.dmg*0.3);
  const g=Math.ceil(m.hp/Math.max(1,a.dmg-def));
  const coste=g*a.g, seg=g*(X.ATTACK_MS/1000), objetivo=coste+ANCLA*seg/3600;
  let mat=0; const drops={};
  for(const res in m.loot||{}){ if(res==="plata") continue;
    const [x,y,pp]=m.loot[res]; drops[res]=[x,y,pp]; mat+=((x+y)/2)*pp*(P[res]||0); }
  if (mat > objetivo*0.8) { const esc=(objetivo*0.8)/mat;
    for(const res in drops) drops[res][2]=Math.max(0.02, Math.round(drops[res][2]*esc*100)/100); }
  let mat2=0; for(const res in drops){const [x,y,pp]=drops[res]; mat2+=((x+y)/2)*pp*(P[res]||0);}
  const plata=Math.max(1, Math.ceil(objetivo-mat2));
  OUT[k]={def, plata, drops};
  console.log("  "+m.label.padEnd(16)+String(lvl).padStart(3)+String(def).padStart(5)+String(g).padStart(8)+
    objetivo.toFixed(0).padStart(11)+mat2.toFixed(0).padStart(11)+String(plata).padStart(8));
});
console.log("\n"+JSON.stringify(OUT));
