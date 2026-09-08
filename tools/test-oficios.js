/* CADA ACCIÓN PAGA A SU OFICIO (18/8)
   Dirección: "Artesanía debería ser artesanía, el arte de craftear, no de talar. Talar es un
   oficio como picar o cultivar." · "Pescar tiene su propio skill, ¿por qué le da XP a cocinar?"
   REGLA: un oficio tiene recurso propio, reloj propio y acción repetida. Y cada acción paga a UNO.
     node tools/test-oficios.js                                                                   */
const fs=require("fs"),vm=require("vm");
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
  "\n;this.X={SKILL_DEFS,SKILL_NAME,ORE_ORDER,ANIMAL_ORDER,ANIMAL_DEF,MAT_ORDER,CROP_ORDER};",ctx);
const X=ctx.X,G=ctx.G;
const SRC=["config","state","farm","forest","ui"].map(f=>fs.readFileSync("public/game/"+f+".js","utf8")).join("");
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) LOS DOS OFICIOS QUE FALTABAN
ok("existe la skill de Tala", !!X.SKILL_NAME.tala, X.SKILL_NAME.tala);
ok("existe la skill de Ganadería", !!X.SKILL_NAME.ganaderia, X.SKILL_NAME.ganaderia);
ok("y el jugador nace con las dos en su hoja",
   "tala" in G.skills && "ganaderia" in G.skills);
ok("son 11 oficios en total", X.SKILL_DEFS.length===11, X.SKILL_DEFS.length+"");

// 2) TALAR YA NO ES ARTESANÍA
ok("talar paga a Tala", /addXp\("tala", xpDeNodo\("tree"\)\)/.test(SRC));
ok("…y ya no paga a Artesanía", !/addXp\("crafting", (nodoXpMin|xpDeNodo)/.test(SRC));

// 3) PESCAR YA NO PAGA A COCINA
/* la XP de pesca la paga ahora el panel de la v4 con pezXp(), que sube con la banda Y con el
   peso — un gigante paga el doble. XP_PEZ era la constante plana de la v2. */
/* y la parte negativa se mide DENTRO de donde se cobra una captura, no en todo el archivo:
   « addXp("cooking", r.xp) » existe en la Cocina, con su propia r que es una receta. Buscarlo
   en los cinco archivos juntos hace que el test hable de otra cosa y dé rojo por un homónimo. */
const RESOLVER = (SRC.split("function pescaV4Resolver")[1] || "").slice(0, 1500);
const CERRAR   = (SRC.split("function lanceSacar")[1] || "").slice(0, 3000);
ok("pescar paga a Pesca y a nadie más",
  /addXp\("fishing", *(r\.xp|pezXp\()/.test(SRC) &&
  !/addXp\("(cooking|farming|mining|ganaderia)"/.test(RESOLVER + CERRAR));

// 4) LOS ANIMALES SON GANADERÍA
/* 8/9 — esto medía una FORMA DE CÓDIGO: el batch `XP_ANIMAL * listos.length`. Cuando el 8/9 se
   partió el establo en « cada animal es uno, con su reloj y sus botones », la XP pasó a pagarse
   por animal dentro de recogerUno y el regex se quedó en rojo sin que nada estuviera mal.
   Un test que mide la forma del código se rompe con cada refactor y no protege nada; se mide el
   COMPORTAMIENTO, que es lo que la decisión dice de verdad. De paso cubre un caso que el regex
   nunca vio: que la XP se pague también cuando el rinde decimal no llega a una unidad entera. */
{
  /* los catálogos de este archivo viven en X (se exportan al final del runInContext), no como
     globales del contexto: ANIMAL_DEF suelto revienta con ReferenceError. */
  const k = X.ANIMAL_ORDER[0];
  const XP_ANIMAL = vm.runInContext("XP_ANIMAL", ctx);
  /* este archivo monta un contexto MÍNIMO a propósito (solo config + state), así que recogerAnimal
     se cae al llamar a la interfaz. Se tapan las justas y en el propio contexto: no se puede
     asignar `isOpen = ...` desde fuera porque son declaraciones del script, no propiedades. */
  vm.runInContext(
    "var isOpen = () => false, toast = () => {}, log = () => {}, celebrate = () => {}," +
    " refreshHud = () => {}, refreshInv = () => {}, refreshEstablo = () => {}," +
    " syncSlots = () => {}, refreshHotbar = () => {}, saveFarm = () => {}, sfx = () => {}," +
    " tutoEvent = () => {}, albumMirar = () => {};", ctx);
  G.animals = {}; G.skills = Object.assign({}, G.skills, { ganaderia: 0, farming: 0 });
  G.animals[k] = [{ desde: 0, feliz: 100, comidoAt: vm.runInContext("nowMs()", ctx), prodAt: 0 }];
  const gan0 = G.skills.ganaderia || 0, far0 = G.skills.farming || 0;
  vm.runInContext("recogerAnimal(" + JSON.stringify(k) + ")", ctx);
  ok("recoger de los animales paga a Ganadería",
    (G.skills.ganaderia || 0) - gan0 === XP_ANIMAL,
    "+" + ((G.skills.ganaderia || 0) - gan0) + " XP (esperado " + XP_ANIMAL + ")");
  ok("…y ya no a Cultivo", (G.skills.farming || 0) - far0 === 0);
}

// 5) EL TABLÓN PAGA A LA SKILL DE LO QUE ENTREGÁS
{
  const casos=[["res","madera","tala"],["res","piedra","mining"],["res","netherita","mining"],
    ["res","cuero","ganaderia"],["res","colmillo","ganaderia"],["res","tablon","crafting"],
    ["res","papa","farming"],["res","maiz","farming"],["fish","comun","fishing"],["dish","papa_asada","cooking"]];
  let mal=[];
  casos.forEach(([t,k,esp])=>{const r=ctx.skillDeEntrega({tipo:t,key:k}); if(r!==esp) mal.push(k+"→"+r+" (esperado "+esp+")");});
  ok("el tablón reparte a los 8 oficios correctos", mal.length===0, mal.join(" · ")||casos.length+" casos");
  ok("…y ya no manda todo a Cultivo", !/addXp\("farming", p\.xp\)/.test(SRC));
}

// 6) NINGÚN OFICIO SE QUEDA SIN FUENTE (la razón de ser del cambio)
{
  const fuentes={};
  (SRC.match(/addXp\("[a-z]+"/g)||[]).forEach(m=>{const k=m.slice(7,-1);fuentes[k]=(fuentes[k]||0)+1;});
  fuentes.sword=(fuentes.sword||0)+1;   // matar y el dummy usan addXp(variable): se cuentan aparte
  const sinFuente=X.SKILL_DEFS.map(([k])=>k).filter(k=>!fuentes[k]&&!["hacha","mazo","range"].includes(k));
  ok("todos los oficios tienen al menos una fuente de XP", sinFuente.length===0, sinFuente.join(", ")||"—");
  console.log("  nota   fuentes por oficio: "+X.SKILL_DEFS.map(([k,,n])=>n+" "+(fuentes[k]||0)).join(" · "));
}
console.log("\n"+(fallos?"FALLOS: "+fallos:"cada acción paga a su oficio"));
process.exit(fallos?1:0);
