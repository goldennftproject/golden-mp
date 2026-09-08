/* EL MORRAL DE CAZA — la hunting bag                      (8/9, dirección, modelo de Tibia)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Nos vamos a crear unas hunting bag — esa hunting bag es la que vamos a perder, no lo que
   carguemos en el inventario ». Y después: « investigalo en Google ». Se investigó antes de
   escribir una línea: en Tibia designás una mochila como contenedor de botín y lo que sacás
   del CADÁVER va ahí, no al bolso general. Eso es exactamente lo que hace este morral.

   La mitad del trabajo ya estaba hecha desde el 31/8 —el bicho muerto deja un cuerpo con
   brillo que hay que revisar y saquear a mano—, así que la hunting bag entera cabe en cambiar
   el destino del botín. Este archivo custodia esa decisión y las tres reglas que la sostienen:
   cupo chico (la tensión), lo que no entra se queda en el cuerpo (nada se evapora), y se vacía
   sola al volver a la granja (es la mochila del campo, no una tarea).
     node tools/test-morral.js                                                                */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const CUPO = g("MORRAL_CUPO");

console.log("\nEL MORRAL TIENE CUPO, Y ESE CUPO ES LA MECÁNICA");
{
  G.morral = [];
  ok("nace vacío", ctx.morralVacio() && ctx.morralPilas() === 0);
  ok("cabe " + CUPO + " pilas — chico a propósito", CUPO >= 4 && CUPO <= 12, String(CUPO));
  for (let i = 0; i < CUPO; i++) ctx.morralMeter("res", "mat" + i, 1);
  ok("se llena con " + CUPO + " cosas distintas", ctx.morralLleno() && ctx.morralPilas() === CUPO);
  ok("y la siguiente NO entra — ese rebote es la decisión « ¿vuelvo o sigo? »",
    ctx.morralMeter("res", "otra_cosa", 1) === false);
  ok("pero apilar en algo que YA está sigue entrando: no gasta hueco nuevo",
    ctx.morralMeter("res", "mat0", 5) === true && ctx.morral()[0].n === 6);
}

console.log("\nLO QUE NO ENTRA SE QUEDA EN EL CUERPO — nada se evapora");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("el botín del cuerpo va al MORRAL, no a la bolsa", /const ok = morralMeter\(d\.kind \|\| "res", d\.k, d\.n\)/.test(FOREST));
  ok("y lo que rebota vuelve a la lista del cuerpo", /if \(!ok\) quedan\.push\(d\)/.test(FOREST));
  ok("con su aviso, que dice el porqué y el cupo", /Morral lleno \(" \+ MORRAL_CUPO \+ "\)/.test(FOREST));
  ok("la plata también entra al morral — si fuera a la billetera sería imposible de perder",
    !/else if \(d\.k === "plata"\) \{ G\.plata \+= d\.n/.test(FOREST));
}

console.log("\nSE VACÍA SOLO AL VOLVER A LA GRANJA");
{
  G.morral = []; G.res.carne = 0; G.plata = 0; G.invRows = 6;
  ctx.morralMeter("res", "carne", 3);
  ctx.morralMeter("res", "plata", 50);
  const r = ctx.morralDescargar(true);
  ok("lo del morral pasa a la bolsa", Math.floor(G.res.carne) === 3, "carne " + G.res.carne);
  ok("y la plata a la billetera", G.plata === 50, "plata " + G.plata);
  ok("el morral queda vacío", ctx.morralVacio(), JSON.stringify(G.morral));
  ok("descargarlo vacío no rompe nada", ctx.morralDescargar(true).movidas === 0);

  /* si la bolsa está llena, lo que no entra SE QUEDA en el morral — no se borra */
  G.morral = []; G.invRows = 0; G.res = {};
  const ITEM = g("ITEM_RES_ORDER");
  for (let i = 0; i < ctx.invSlots() + 5 && i < ITEM.length; i++) G.res[ITEM[i]] = 99;   // bolsa a tope
  ctx.morralMeter("res", ITEM[ITEM.length - 1], 1);
  const antes = ctx.morralPilas();
  ctx.morralDescargar(true);
  ok("con la bolsa llena, lo que no entra sigue en el morral", ctx.morralPilas() === antes, ctx.morralPilas() + " pila(s)");
}

console.log("\nY SOBREVIVE AL F5 — un refresco no es morir");
{
  G.morral = [{ kind: "res", k: "colmillo", n: 4 }, { kind: "res", k: "plata", n: 120 }];
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  ok("el snapshot lo lleva", Array.isArray(snap.morral) && snap.morral.length === 2);
  G.morral = undefined;
  ctx.hydrate(snap);
  ok("y vuelve igual", ctx.morralPilas() === 2 && ctx.morral()[0].n === 4, JSON.stringify(G.morral));
  ctx.hydrate(Object.assign({}, snap, { morral: [{ k: null, n: 0 }, "basura"] }));
  ok("un guardado corrupto lo deja vacío en vez de romperlo", ctx.morralPilas() === 0);
}

console.log("\nLA VUELTA A LA GRANJA LO DESCARGA — sin tarea extra para el jugador");
{
  const ST = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("zonaSalir lo vuelca antes de calcular la ganancia del viaje",
    /const morralIba = morralPilas\(\);\s*\n\s*if \(morralIba\) morralDescargar\(true\);/.test(ST));
  ok("y el resumen del viaje sabe cuántas pilas traía", /morral: morralIba,/.test(ST));
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("el panel solo se ve DENTRO de la zona", /GF\.scene === "forest"/.test(UI) && /function refreshMorral/.test(UI));
}

console.log("\nY SI TE MATAN: EL MORRAL CAE, PERO TU CUERPO ESPERA " + g("TUMBA_MIN") + " MINUTOS");
{
  /* « si te matan se te cae la bag, pero tu cuerpo queda en el piso por 10 minutos donde puedes
     recoger todo ». El equilibrio entero está ahí: la muerte por fin cuesta —hasta hoy no
     costaba NADA— pero es recuperable. Castigo con salida. */
  G.morral = []; G.tumba = null;
  ctx.morralMeter("res", "colmillo", 3);
  ctx.morralMeter("res", "plata", 80);
  const cayeron = ctx.tumbaCaer("guarida", 100, 200);
  ok("al morir, el morral entero cae al cuerpo", cayeron === 2 && ctx.morralVacio(), cayeron + " pila(s)");
  ok("y la tumba queda viva, con su reloj", !!ctx.tumbaViva() && ctx.tumbaQueda() > 0,
    Math.ceil(ctx.tumbaQueda() / 60000) + " min");
  ok("recuerda en qué zona moriste", ctx.tumba().zona === "guarida");

  /* recuperarla devuelve al MORRAL, no a la bolsa: seguís en la zona */
  const n = ctx.tumbaRecoger();
  ok("volver a buscarla devuelve todo al morral", n === 2 && ctx.morralPilas() === 2);
  ok("y la tumba desaparece del estado — nada de tumbas fantasma", ctx.tumbaViva() === null && ctx.tumba() === null);

  /* el reloj es de verdad: una tumba vencida ya no se puede cobrar */
  G.morral = []; ctx.morralMeter("res", "cuero", 1);
  ctx.tumbaCaer("guarida", 0, 0);
  G.tumba.hasta = Date.now() - 1;
  ok("una tumba vencida no se puede recuperar", ctx.tumbaViva() === null && ctx.tumbaRecoger() === 0);

  /* morir con el morral vacío no crea tumba: un cuerpo sin nada sería una promesa vacía */
  G.morral = []; G.tumba = null;
  ok("morir sin nada en el morral no deja cuerpo", ctx.tumbaCaer("guarida", 0, 0) === 0 && !ctx.tumba());
}

console.log("\nEL ORDEN QUE HACE QUE LA MECÁNICA NO SE DÉ VUELTA");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  /* zonaSalir descarga el morral a la bolsa. Si la muerte llamara a zonaSalir ANTES de tirar el
     morral, morirse sería la forma más cómoda de cobrar el botín — lo contrario de la idea. */
  const iCae = FOREST.indexOf("tumbaCaer(this.zonaKey");
  const iSale = FOREST.indexOf("mostrarResumenZona(zonaSalir(true))");
  ok("la tumba se queda con el morral ANTES de que zonaSalir lo descargue", iCae > 0 && iSale > iCae,
    "caer@" + iCae + " · salir@" + iSale);
  ok("y la muerte avisa cuántas cosas se cayeron y cuánto dura el cuerpo",
    /Se te cayó el morral con " \+ cayeron \+ " cosa\(s\)/.test(FOREST) && /TUMBA_MIN \+\n?\s*" minutos en la zona/.test(FOREST.replace(/\s+/g, " ")) || /tu cuerpo queda/.test(FOREST));
  ok("morir de nuevo pisa el cuerpo anterior, y SE DICE", /pisó al cuerpo anterior, que se perdió/.test(FOREST));
  ok("al entrar a la zona se monta tu cuerpo si sigue a tiempo", /this\.montarTumba\(\);/.test(FOREST));
  ok("y si venció mientras no estabas, se limpia y se avisa", /Tu cuerpo se deshizo/.test(FOREST));
}

console.log("\nEL MUELLE DE COMBATE: EQUIPO Y MODO DE PELEA A LA DERECHA");
{
  /* « que se active la parte de equipo a mano derecha, y que tenga el botón de perseguir a mob
     o el de parado ». Lo que este test protege no es el CSS sino la decisión: el muelle LEE de
     G.gear y abre el panel real — no es una segunda copia de las ranuras con su propia lógica
     de equipar, que es como se terminan teniendo dos pantallas que se contradicen. */
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");

  ok("el muelle existe y solo se ve en la Zona Negra",
    /function refreshCombate/.test(UI) && /GF\.scene === "forest"[\s\S]{0,120}caja\.style\.display = "none"/.test(UI));
  ok("lee el equipo de G.gear — no guarda una copia", /const gr = G\.gear \|\| \{\}/.test(UI));
  ok("y tocarlo abre el panel de Equipo de verdad", /openOv\("ov-equip"\)/.test(UI));
  /* lo que importa: que el MUELLE no escriba en G.gear. Equipar tiene sus sitios (la bolsa, la
     Herrería, el panel) y este no es uno — si lo fuera, sería una cuarta puerta que mantener. */
  const cuerpoMuelle = UI.slice(UI.indexOf("function refreshCombate"), UI.indexOf("function refreshMorral"));
  ok("el muelle NO escribe el equipo — solo lo muestra", !/G\.gear\s*(\.\w+)?\s*=/.test(cuerpoMuelle));
  ok("los dos modos están, y el activo se distingue", /data-modo="perseguir"/.test(UI) && /data-modo="parado"/.test(UI) && /\.cb-m\.on\{/.test(HTML));

  /* la mecánica del modo, que es lo que de verdad cambia el juego */
  G.modoPelea = "perseguir";
  ok("por defecto se persigue", ctx.modoPelea() === "perseguir");
  ctx.modoPeleaSet("parado");
  ok("y se puede quedar parado", ctx.modoPelea() === "parado");
  ctx.modoPeleaSet("cualquier_cosa");
  ok("un modo inventado no lo rompe", ctx.modoPelea() === "parado");
  /* el freno tiene que estar DENTRO de autoChase (el caminar) y NO en autoAtacar: « parado »
     significa pelear sin moverse, no dejar de pelear. Se comprueba por posición, que es lo
     único que distingue « está en la función correcta » de « está en el archivo ». */
  const iChase = FOREST.indexOf("autoChase(t) {");
  const iFreno = FOREST.indexOf('modoPelea() === "parado"');
  const iFinChase = FOREST.indexOf("\n  }", iChase);
  ok("« parado » frena el caminar, y el freno vive DENTRO de autoChase",
    iChase > 0 && iFreno > iChase && iFreno < iFinChase, "chase@" + iChase + " freno@" + iFreno);
  ok("y no toca el auto-ataque: seguís peleando parado",
    !/autoAtacar[\s\S]{0,300}modoPelea/.test(FOREST));

  /* es preferencia, no estado del viaje: tiene que sobrevivir */
  G.modoPelea = "parado";
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  G.modoPelea = undefined; ctx.hydrate(snap);
  ok("el modo sobrevive al F5 — no se re-elige en cada entrada", ctx.modoPelea() === "parado");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el botín viaja en el morral, y morir te lo tira sin quitártelo del todo.\n");
process.exit(fallos ? 1 : 0);
