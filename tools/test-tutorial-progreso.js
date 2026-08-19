/* EL DEPLOY NO PUEDE DEVOLVERTE AL PRINCIPIO DEL TUTORIAL (18/8)
   Dirección: "cuando haces deploy, si estás en una etapa del tutorial, el tutorial regresa como al
   principio. Debería mantener el progreso."
     node tools/test-tutorial-progreso.js                                                          */
const fs=require("fs"),vm=require("vm"),rd=f=>fs.readFileSync("public/game/"+f,"utf8");
function juego(){
  const ctx={console,document:{getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[]},
    localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    Phaser:{Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Between:a=>a}},
    setTimeout:()=>0,setInterval:()=>0,requestAnimationFrame:()=>0,fetch:()=>Promise.reject()};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  // los `const` de nivel superior no cuelgan del global en vm: se exponen a mano
  vm.runInContext(rd("config.js")+"\n"+rd("state.js")+"\n;this.TUTO_STEPS=TUTO_STEPS;",ctx);
  ctx.toast=()=>{};ctx.log=()=>{};ctx.refreshHud=()=>{};ctx.addXp=()=>{};ctx.sfx=()=>{};
  ctx.guardados=0; ctx.saveFarm=()=>{ctx.guardados++;};
  return ctx;
}
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) DEPLOY CON CAMBIO DE VERSIÓN: el paso guardado hace de suelo
const g=juego();
const total=g.TUTO_STEPS.length;
const medio=Math.floor(total/2);
g.G.tuto={step:medio,n:0,done:false,v:g.TUTO_VER-1};   // guardado de la versión anterior
g.tutoMigrar();
ok("versión nueva: no retrocede (estaba en "+medio+", quedó en "+g.G.tuto.step+")", g.G.tuto.step>=medio);
ok("y la marca de versión queda al día", g.G.tuto.v===g.TUTO_VER);

// 2) MISMA VERSIÓN (el caso normal de un deploy): no toca nada
const g2=juego();
g2.G.tuto={step:medio,n:1,done:false,v:g2.TUTO_VER};
g2.tutoMigrar();
ok("mismo TUTO_VER: el paso se respeta", g2.G.tuto.step>=medio);

// 3) EL TUTORIAL TERMINADO SIGUE TERMINADO
const g3=juego();
g3.G.tuto={step:total,n:0,done:true,v:g3.TUTO_VER-1};
g3.tutoMigrar();
ok("un tutorial terminado no se reabre", g3.G.tuto.done===true);

// 4) AVANZAR DE PASO GUARDA LA PARTIDA (la causa real)
const g4=juego();
g4.G.tuto={step:0,n:0,done:false,v:g4.TUTO_VER};
g4.guardados=0;
g4.tutoDone(g4.TUTO_STEPS[0]);
ok("avanzar de paso escribe el guardado", g4.guardados>0, "guardados="+g4.guardados);
ok("y el paso subió", g4.G.tuto.step>0||g4.G.tuto.done);

// 5) NUNCA SE SALE DEL RANGO
const g5=juego();
g5.G.tuto={step:999,n:0,done:false,v:g5.TUTO_VER-1};
g5.tutoMigrar();
ok("un paso fuera de rango se acota", g5.G.tuto.done||g5.G.tuto.step<total, "step="+g5.G.tuto.step);

console.log("\n"+(fallos?"FALLOS: "+fallos:"el progreso del tutorial sobrevive al deploy"));
process.exit(fallos?1:0);
