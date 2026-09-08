/* ARRASTRAR, Y DECIR CUÁNTAS                              (8/9, Suren, en vivo)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dos pedidos de la misma tarde que son la misma pieza:
     « esto está genial, debería permitir arrastrarlo todo y al ponerlo preguntar cuántas quieres
       montar »
     « debe dejarme mover o arrastrar objetos, especialmente la comida a la barra rápida para
       usarla con números »

   Tres decisiones que este archivo custodia, porque son las que se pierden al refactorizar:

   1 · CON UNA SOLA NO SE PREGUNTA. Un diálogo cuya única respuesta posible es « 1 » no es una
       pregunta, es un trámite; y quien carga cinco cosas lo pagaría cinco veces.
   2 · EL VALOR POR DEFECTO ES TODO. En la puerta la intención normal es « me llevo mis flechas »,
       no « me llevo una flecha ». Equivocarse hacia arriba se deshace con un clic.
   3 · LA BARRA RÁPIDA APUNTA, NO MUEVE. Guarda familia+clave, no el objeto; por eso apuntar a
       algo del contenedor no saca nada de ningún lado, y al apretar la tecla la comida sale por
       la puerta única (llevoGastar) del sitio correcto según dónde estés parado.
     node tools/test-arrastrar-y-cuantas.js                                                    */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const $ = (id) => ctx.document.getElementById(id);
const preparar = () => {
  ctx.GF.scene = "farm";
  G.conts = { backpack: 1, bag: 1 }; G.cont = null;
  G.res = { flecha: 40, carne: 3 }; G.dishes = { papa_asada: 5 }; G.seeds = { papa: 2 };
  G.invRows = 6; G.slots = []; G.hotbar = new Array(10).fill(null);
  avisos.length = 0;
  ctx.viajeElegir("backpack");
};

console.log("\n« ¿CUÁNTAS? » SOLO CUANDO HAY MÁS DE UNA");
{
  preparar();
  let r = null;
  ctx.pedirCuanto(1, "t", "s", (n) => r = n);
  ok("con una sola NO abre nada y pasa esa", r === 1);
  r = null;
  ctx.pedirCuanto(40, "¿Cuántas?", "flechas", (n) => r = n);
  ok("con varias sí pregunta, y todavía no pasó nada", r === null);
  ok("y arranca proponiendo TODO — es la intención normal al salir de viaje",
    +$("cu-num").value === 40, $("cu-num").value);
  $("cu-num").value = "12"; $("cu-num").oninput();
  ok("el número y la barra van juntos", +$("cu-rango").value === 12, $("cu-rango").value);
  $("cu-rango").value = "30"; $("cu-rango").oninput();
  ok("y en el otro sentido también", +$("cu-num").value === 30);
  /* los atajos NO se prueban pinchando el botón: el DOM de pruebas devuelve [] en todo
     querySelectorAll, así que un clic simulado mediría el arnés y no el juego. Lo que importa es
     la DECISIÓN —cuánto significa cada atajo— y por eso vive en una función pura. */
  ok("« todo » es todo", ctx.cuantoAtajo("todo", 40) === 40);
  ok("« mitad » es la mitad, redondeando hacia arriba", ctx.cuantoAtajo("mitad", 40) === 20 && ctx.cuantoAtajo("mitad", 9) === 5);
  ok("« 1 » es uno", ctx.cuantoAtajo("1", 40) === 1);
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("y los tres botones existen en el diálogo",
    ["1", "mitad", "todo"].every(q => HTML.indexOf('data-cu="' + q + '"') > 0));
  $("cu-num").value = "7"; $("cu-num").oninput();
  $("cu-ok").onclick();
  ok("aceptar entrega la cifra elegida", r === 7, String(r));
  /* cancelar no puede hacer nada: es la operación que nadie prueba */
  r = null;
  ctx.pedirCuanto(9, "t", "s", (n) => r = n);
  $("cu-no").onclick();
  ok("cancelar no pasa nada de nada", r === null);
}

console.log("\nLA PUERTA SE ARRASTRA — y el gesto no puede inventar movimientos");
{
  preparar();
  ctx.refreshViaje();
  const h = $("viaje-cuerpo").innerHTML;
  ok("las dos columnas son destino", /data-vzona="granja"/.test(h) && /data-vzona="cont"/.test(h));
  ok("y las casillas se pueden agarrar", (h.match(/draggable="true"/g) || []).length >= 1);
  ok("el pie enseña el gesto nuevo, sin esconder el atajo", /Arrastrá de una columna a la otra/.test(h) && /shift/.test(h));

  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  /* soltar en la columna de la que salió es « me arrepentí a mitad de gesto », no un error:
     se ignora en silencio. Si esto se rompe, arrastrar mal MUEVE cosas y el jugador no entiende. */
  ok("soltar en la columna de origen no hace nada",
    /if \(\(origen === "sube" && destino !== "cont"\) \|\| \(origen === "baja" && destino !== "granja"\)\) return;/.test(UI));
  ok("subir y bajar son la MISMA función con distinto sentido — no dos copias",
    /const mover = \(dir, kind, key, todo\)/.test(UI) && (UI.match(/const mover = \(dir/g) || []).length === 1);
}

console.log("\nY MOVER DE VERDAD SIGUE SIN DUPLICAR NI EVAPORAR");
{
  preparar();
  const raiz = ctx.contLlevado();
  const antes = Math.floor(G.res.flecha);
  ctx.viajeCargar("res", "flecha", 12);
  ok("lo que sube al contenedor baja de la granja",
    ctx.contContar(raiz, "res", "flecha") === 12 && Math.floor(G.res.flecha) === antes - 12,
    "granja " + G.res.flecha + " · llevás " + ctx.contContar(raiz, "res", "flecha"));
  ctx.viajeBajar("res", "flecha", 12);
  ok("y al revés vuelve entero", Math.floor(G.res.flecha) === antes && ctx.contContar(raiz, "res", "flecha") === 0);
}

console.log("\nLA COMIDA A LA BARRA RÁPIDA, DENTRO DE LA ZONA");
{
  preparar();
  ctx.viajeCargar("dish", "papa_asada", 2);
  ctx.GF.scene = "forest";
  avisos.length = 0;
  ctx.dndDrop("cont:dish|papa_asada", "hot", 0);
  ok("arrastrar a la barra deja el hueco apuntando al plato",
    G.hotbar[0] && G.hotbar[0].kind === "dish" && G.hotbar[0].key === "papa_asada", JSON.stringify(G.hotbar[0]));
  ok("y dice qué tecla apretar — un atajo que no se anuncia no existe",
    avisos.some(a => /apretá 1/.test(a)), avisos.join(" · "));
  /* apuntar NO mueve: si sacara el plato del contenedor, la barra sería un tercer inventario */
  ok("apuntar no saca nada del contenedor", ctx.contContar(ctx.contLlevado(), "dish", "papa_asada") === 2);
  ok("ni de la granja", G.dishes.papa_asada === 3, "granja " + G.dishes.papa_asada);

  /* y la cuenta que enseña la barra es la del CONTENEDOR: decir « 3 » cuando llevás 2 hace que
     el jugador apriete la tecla en mitad de una pelea y no pase nada */
  ok("la barra cuenta lo que llevás, no lo que dejaste", ctx.llevoTengo("dish", "papa_asada") === 2);
  ok("y lo que no llevás sale opaco", ctx.hotItemExists({ kind: "seed", key: "papa" }) === false);

  /* y la tecla come del contenedor */
  G.hp = 10; G.hpMax = 100; G.comerHasta = 0;
  ctx.hotSelect(0);
  ok("apretar la tecla cura y gasta del contenedor",
    G.hp > 10 && ctx.contContar(ctx.contLlevado(), "dish", "papa_asada") === 1,
    "vida " + G.hp + " · quedan " + ctx.contContar(ctx.contLlevado(), "dish", "papa_asada"));
  ok("y la despensa de la granja sigue intacta", G.dishes.papa_asada === 3);
}

console.log("\nY CRUZAR EL PORTAL NO LE BORRA LA BARRA AL JUGADOR");
{
  /* la barra se autolimpia de consumibles agotados. Dentro de la Zona casi nada de la granja
     « existe », así que esa limpieza la habría vaciado entera al cruzar — y al volver el jugador
     se encontraba la barra en blanco sin haber tocado nada. */
  preparar();
  G.hotbar[0] = { kind: "seed", key: "papa" };
  G.hotbar[1] = { kind: "dish", key: "papa_asada" };
  ctx.GF.scene = "forest";
  ctx.refreshHotbar(true);
  ok("lo que no llevás sigue en su hueco, solo que apagado",
    G.hotbar[0] && G.hotbar[0].key === "papa", JSON.stringify(G.hotbar.filter(Boolean)));
  ctx.GF.scene = "farm";
  ctx.refreshHotbar(true);
  ok("y al volver a la granja está tal cual la dejaste", G.hotbar[0] && G.hotbar[0].key === "papa");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: se arrastra, pregunta cuántas, y la barra apunta sin mover.\n");
process.exit(fallos ? 1 : 0);
