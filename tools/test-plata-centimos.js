/* LA PLATA SE ENSEÑA CON SUS CÉNTIMOS                     (8/9, Suren, en vivo)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « necesitamos agregar decimales a la plata, porque algunos peces se venden en 0.6-0.5 y cuando
   la suma suma +1, y no es castigo sino premio ».

   El diagnóstico estaba al revés, y por eso este archivo existe: la plata YA tenía decimales
   desde la Pesca v4 —pezVender redondea al décimo— y el juego los sumaba bien. Quien mentía era
   el CONTADOR: fmt() hace Math.floor, así que vender una merluza de 0,5 no movía el número, la
   segunda lo movía a 1, y el jugador veía aparecer un entero de la nada. No se regalaba nada: se
   estaba escondiendo el primer medio pez. Confundir « el número no se ve » con « el juego me
   regala plata » cuesta caro, porque la solución obvia a lo segundo —tocar la moneda— es un
   refactor enorme que no habría arreglado lo primero.

   Lo que este test protege, entonces, son dos cosas distintas:
     1. que la plata SIGA siendo exacta (no se inventa ni se pierde al vender barato)
     2. que se VEA — en el HUD y en el chip del margen, que son los dos sitios donde el jugador
        se entera de que cobró
     node tools/test-plata-centimos.js                                                         */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nHAY PECES QUE VALEN MENOS DE UNA PLATA — de ahí sale todo");
{
  const bajo = Object.keys(ctx.PEZ_DEF)
    .map(k => [k, ctx.pezPrecio(k, ctx.PEZ_DEF[k].peso[0])])
    .filter(x => x[1] > 0 && x[1] < 1);
  ok("existen, y son los que nombró Suren", bajo.length >= 2,
    bajo.slice(0, 4).map(x => x[0] + " " + x[1]).join(" · "));
}

console.log("\nEL CONTADOR YA NO ESCONDE LOS CÉNTIMOS");
{
  ok("medio pez se lee como medio pez", ctx.fmtPlata(0.5) === "0.5");
  ok("y 0,6 también", ctx.fmtPlata(0.6) === "0.6");
  ok("un entero sigue siendo un entero, sin « .0 » de adorno", ctx.fmtPlata(2) === "2" && ctx.fmtPlata(0) === "0");
  /* la coma flotante escupe 25.450000000000003 al multiplicar por el bono de venta: eso ya se
     arregló el 20/8 para el Mercado y no puede volver por la puerta de atrás */
  ok("y la basura de la coma flotante no se cuela", ctx.fmtPlata(25.450000000000003) === "25.5",
    ctx.fmtPlata(25.450000000000003));
  ok("los miles siguen abreviados: nadie quiere leer 1234.5", ctx.fmtPlata(1234.5) === "1.2k");
  /* fmt() NO se toca: lo usan los recursos, que son enteros. Meterles decimales sería ruido */
  ok("fmt() sigue siendo entero — los recursos no tienen céntimos", ctx.fmt(2.7) === "2");
}

console.log("\nY LA PLATA SIGUE SIENDO EXACTA: no se inventa ni se pierde");
{
  G.plata = 0; G.fish = {}; G.res = {};
  const id = Object.keys(ctx.PEZ_DEF).find(k => ctx.pezPrecio(k, ctx.PEZ_DEF[k].peso[0]) < 1);
  const kg = ctx.PEZ_DEF[id].peso[0], precio = ctx.pezPrecio(id, kg);
  ctx.pezGuardar(id, kg);
  const clave = Object.keys(G.fish)[0];
  const cobro = ctx.pezVender(clave, 1);
  ok("vender uno paga su precio exacto, no un entero redondeado",
    cobro === precio && G.plata === precio, cobro + " (precio " + precio + ")");
  /* el caso que reportó Suren, medido: dos medios peces son UNO, ni más ni menos */
  ctx.pezGuardar(id, kg);
  ctx.pezVender(Object.keys(G.fish)[0], 1);
  ok("dos medios peces suman exactamente lo suyo — el « +1 » no era un regalo",
    Math.abs(G.plata - precio * 2) < 1e-9, G.plata + " (esperado " + precio * 2 + ")");
  ok("y el HUD lo enseña entero cuando llega a serlo", ctx.fmtPlata(G.plata) === String(precio * 2));
}

console.log("\nEL MARGEN CANTA EL COBRO CHICO — antes se lo comía y luego mentía");
{
  G.plata = 0; G.fish = {}; G.res = {};
  const id = Object.keys(ctx.PEZ_DEF).find(k => ctx.pezPrecio(k, ctx.PEZ_DEF[k].peso[0]) < 1);
  const kg = ctx.PEZ_DEF[id].peso[0], precio = ctx.pezPrecio(id, kg);
  ctx.pezGuardar(id, kg);
  ctx.flujoOlvidar(); ctx.flujoCambios();          // primera foto
  ctx.pezVender(Object.keys(G.fish)[0], 1);
  const cambios = ctx.flujoCambios();
  const chip = cambios.find(c => c.kind === "moneda" && c.key === "plata");
  ok("vender por menos de 1 SÍ produce chip", !!chip, JSON.stringify(cambios));
  ok("y dice la cifra de verdad, no cero ni uno", chip && Math.abs(chip.d - precio) < 1e-9, chip && chip.d);
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("y un solo sitio decide cómo se imprime cada familia",
    /function flujoNum\(kind, d, key\) \{ return esMoneda\(kind, key\) \? fmtPlata\(d\) : fmt\(d\); \}/.test(UI));
  /* 8/9 (Suren): « la plata ya no es una moneda sino una caja ». Dentro de la Zona la plata viaja
     como pila del contenedor (kind "res"), no como billetera, y el margen la trataba de recurso:
     sin sprite, caía al 📦. Las monedas se reconocen por la CLAVE, no por la familia. */
  ok("y la plata es moneda venga por donde venga (billetera o contenedor)",
    ctx.esMoneda("moneda", "plata") && ctx.esMoneda("res", "plata") && ctx.esMoneda("res", "golden"));
  ok("pero un recurso de verdad no se disfraza de moneda", !ctx.esMoneda("res", "madera"));
  ok("el HUD usa el mismo formateador que el chip", /setNum\("s-plata", G\.plata, fmtPlata\)/.test(UI));
}

console.log("\nY LO QUE NO TIENE CÉNTIMOS SIGUE SIN TENERLOS");
{
  /* si mañana alguien « arregla » esto poniéndole decimales a todo, el inventario se llena de
     « 3.0 Madera » y el número deja de leerse de un vistazo, que es para lo que está. */
  G.res = { madera: 7 };
  ok("los recursos se siguen viendo enteros", ctx.fmt(G.res.madera) === "7");
  const foto = ctx.bolsaFoto();
  ok("y la foto de la bolsa guarda la plata al décimo, no al entero",
    Object.prototype.hasOwnProperty.call(foto, "moneda:plata"));
  G.plata = 3.7;
  ok("el décimo sobrevive a la foto", ctx.bolsaFoto()["moneda:plata"] === 3.7, String(ctx.bolsaFoto()["moneda:plata"]));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la plata era exacta, y ahora además se ve.\n");
process.exit(fallos ? 1 : 0);
