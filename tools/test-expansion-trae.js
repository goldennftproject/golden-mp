/* EL CARTEL DE LA EXPANSIÓN DICE LO QUE TRAE (26/8, diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « la parcela 2 está bien, pero debe decir lo que trae: solo se puede leer árbol, roca. En ésta
     debería decir parcela, árbol, roca, oro, bronce… lo digo para que la gente calcule el costo
     y si vale la pena, y como aún no tenemos wiki pues toca hacer[lo así]. »

   El cartel decía « Trae árbol · roca · parcela », tres palabras escritas a mano, mientras SIETE
   de las dieciséis expansiones traen además una veta de bronce y una de oro. O sea que el dato
   que decide si vale la pena pagar —dos celdas productivas más, y de metal— no aparecía en
   ningún sitio. La única forma de enterarse era comprar, que es la peor.

   Y AL IR A ARREGLARLO APARECIÓ ALGO MÁS. La lista de expansiones con veta estaba escrita DOS
   VECES: en config.js, para ponerlas en el mundo, y en state.js (EXP_CON_VETA), para cobrarlas
   más caras. Dos copias de la misma decisión, en dos archivos, sin nada que las ate. Si alguien
   le agrega veta a la 18 en un lado, el otro sigue cobrando barato — o poniendo de más — y nadie
   se entera hasta que un jugador lo cuenta. Es la misma forma que las cañas invisibles y los
   fardos del tablón: dos listas donde debería haber una.

   LO QUE ESTE ARCHIVO VIGILA
     1 · el cartel nombra TODO lo que la expansión entrega, veta incluida
     2 · el mundo, el precio y el cartel leen LA MISMA lista — no tres copias que se parecen
     3 · el cartel no está escrito a mano en farm.js
     node tools/test-expansion-trae.js                                                            */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const GF = ctx.GF, MAX = g("EXPANSION_MAX");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL CARTEL NOMBRA TODO LO QUE LA EXPANSIÓN TRAE");
{
  const sinVeta = ctx.expansionTraeTxt(1), conVeta = ctx.expansionTraeTxt(3);
  ok("una expansión normal nombra sus tres cosas",
    /parcela/.test(sinVeta) && /árbol/.test(sinVeta) && /roca/.test(sinVeta), sinVeta);
  ok("y la 3, que trae vetas, las nombra también",
    /bronce/.test(conVeta) && /oro/.test(conVeta), conVeta);
  ok("las que NO traen veta no la prometen", !/bronce|oro/.test(sinVeta), sinVeta);
}

console.log("\nEL MUNDO Y EL CARTEL CUENTAN LO MISMO   (era el fallo de fondo: dos listas)");
{
  /* La comprobación que de verdad importa: se cuentan las vetas que el MUNDO pone en cada bloque
     y se contrastan con lo que el cartel promete. Si alguien toca una lista y no la otra, esto
     se pone rojo — que es exactamente lo que no pasaba antes. */
  const desajustes = [];
  for (let n = 1; n <= MAX; n++) {
    GF.aplicarTerreno(n);
    /* los datos van en el objeto, no en un `.data` — lo comprobé mirando uno de verdad en vez de
       suponer la forma, que es como este bloque salió rojo la primera vez. */
    const delBloque = (GF.WORLD_OBJECTS || []).filter(o => o.exp === n - 1);
    const mundo = {
      arbol:  delBloque.filter(o => o.type === "tree").length,
      roca:   delBloque.filter(o => o.type === "rock").length,
      bronce: delBloque.filter(o => o.type === "ore" && o.ore === "bronce").length,
      oro:    delBloque.filter(o => o.type === "ore" && o.ore === "oro").length,
    };
    const dice = ctx.expansionTrae(n).map(x => x.k);
    for (const k of ["arbol", "roca", "bronce", "oro"]) {
      const hayEnMundo = mundo[k] > 0, loDice = dice.indexOf(k) >= 0;
      if (hayEnMundo !== loDice)
        desajustes.push("exp " + n + ": el mundo pone " + mundo[k] + " " + k + " y el cartel " +
          (loDice ? "lo promete" : "NO lo nombra"));
    }
  }
  ok("en las " + MAX + " expansiones, el cartel y el mundo coinciden",
    !desajustes.length, desajustes.slice(0, 5).join("\n           "));
}

console.log("\nY EL PRECIO USA LA MISMA LISTA QUE EL MUNDO");
{
  const conVeta = [];
  for (let n = 1; n <= MAX; n++) if (ctx.expVetas(n)) conVeta.push(n);
  ok("las que pagan de más son las que traen veta", conVeta.length === 7, conVeta.join(", "));
  ok("y esa lista es la MISMA que usa el mundo (GF.EXP_CON_VETA)",
    JSON.stringify(conVeta) === JSON.stringify(GF.EXP_CON_VETA), JSON.stringify(GF.EXP_CON_VETA));
  /* la comprobación estructural: que no haya vuelto a aparecer una copia de la lista */
  const CFG = fs.readFileSync(path.join(RAIZ, "public/game/config.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const ST = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const copias = (CFG + ST).match(/\[\s*3\s*,\s*6\s*,\s*8\s*,\s*10\s*,\s*12\s*,\s*14\s*,\s*16\s*\]/g) || [];
  ok("la lista de expansiones con veta está escrita UNA sola vez", copias.length <= 1,
    copias.length + " copias — el fallo del 26/8 fue tenerla en config.js y en state.js");
}

console.log("\nEL CARTEL NO ESTÁ ESCRITO A MANO EN LA ESCENA");
{
  const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok("farm.js pide el texto a expansionTraeTxt()", /expansionTraeTxt\(/.test(FARM));
  /* que quede el respaldo por si la función no existe está BIEN; lo que no puede es ser la única
     fuente. Se comprueba que la llamada esté, no que la cadena no aparezca. */
  const suelto = FARM.match(/"Trae [^"]*"/g) || [];
  ok("y si queda una cadena suelta, es solo el respaldo", suelto.length <= 1, suelto.join(" · "));
}

console.log("\nSI MAÑANA UNA EXPANSIÓN NUEVA LLEVA VETA, EL CARTEL LO DIRÁ SOLO");
{
  /* la propiedad, probada de la única forma que vale: cambiando la lista y viendo si el resto
     se entera sin tocar una línea más. */
  const orig = GF.EXP_CON_VETA.slice();
  try {
    GF.EXP_CON_VETA.push(5);
    vm.runInContext("EXP_CON_VETA = GF.EXP_CON_VETA;", ctx);
    ok("al agregar la 5 a la lista, su cartel nombra las vetas",
      /bronce/.test(ctx.expansionTraeTxt(5)), ctx.expansionTraeTxt(5));
    ok("y su precio también la cuenta como más cara", ctx.expVetas(5) === true);
  } finally {
    GF.EXP_CON_VETA.length = 0; orig.forEach(x => GF.EXP_CON_VETA.push(x));
    vm.runInContext("EXP_CON_VETA = GF.EXP_CON_VETA;", ctx);
  }
  ok("y al quitarla, vuelve a su sitio", !/bronce/.test(ctx.expansionTraeTxt(5)));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el cartel todavía no dice lo que el jugador paga"
  : "  Todo en orden: el cartel dice lo que trae, y lo dice leyendo lo que el mundo pone.");
process.exit(fallos ? 1 : 0);
