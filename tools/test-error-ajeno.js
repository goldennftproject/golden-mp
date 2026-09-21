/* UN ERROR AJENO NO ES UN REINICIO                                         (22/9, dirección)
   Golden pegó el Registro: « La vez anterior el juego se detuvo y volvió a entrar solo. Motivo:
   error durante la partida · promesa: Cannot read properties of undefined (reading 'M_ID') ».
   Dos mentiras en una línea: el M_ID es de la billetera del navegador (contentscript.js), y el
   juego no se había reiniciado solo — la recarga fue normal. Contratos:
     · una promesa rechazada cuya pila viene de una extensión no se anota;
     · un error suelto se guarda SIN la marca de reinicio, y al volver se cuenta sin alarma;
     · el vigía (rendirse) guarda CON la marca, y ése sí abre el Registro con el « ⚠ »;
     · un error suelto no pisa un reinicio de verdad que todavía no se contó.
     node tools/test-error-ajeno.js                                                            */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const MAIN = fs.readFileSync(path.join(RAIZ, "public/game/main.js"), "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\nLECTURA\n");
ok("la promesa rechazada mira la pila y descarta extensiones", /unhandledrejection[\s\S]{0,900}-extension:\\\/\\\//.test(MAIN) && /contentscript\\\.js/.test(MAIN));
ok("el vigía guarda con la marca de reinicio", /guardarElError\(e, porque, true\)/.test(MAIN));
ok("el atrapador de errores sueltos guarda SIN marca", /guardarElError\(txt, "error durante la partida"\);/.test(MAIN));

console.log("\nEJECUCIÓN: guardarElError / contarElErrorDeAntes con un localStorage de mentira\n");
const store = {};
const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  console: { warn() {}, log() {} }, JSON, Date, document: { getElementById: () => null }, window: {} };
ctx.window = ctx;
const lineas = [];
ctx.log = (t, k) => lineas.push(k + ": " + t);
ctx.sesionLog = () => {};
const recorte = MAIN.slice(MAIN.indexOf("function guardarElError"), MAIN.indexOf("function atraparLosErrores"));
const llave = /const ERR_LLAVE = ([^;]+);/.exec(MAIN);
vm.createContext(ctx);
vm.runInContext("var ERR_LLAVE = " + (llave ? llave[1] : '"gf-err"') + ";\n" + recorte, ctx);

ctx.guardarElError("promesa: M_ID", "error durante la partida");
ctx.contarElErrorDeAntes();
ok("un error suelto se cuenta como aviso, no como reinicio", lineas.length === 1 && /^warn: En la partida anterior hubo un error, sin reinicio/.test(lineas[0]), lineas[0]);
ok("y no dice « volvió a entrar solo »", !/entrar solo/.test(lineas[0]));
lineas.length = 0;
ctx.guardarElError("el bucle del juego se detuvo", "el bucle del juego se detuvo", true);
ctx.guardarElError("promesa: otra", "error durante la partida");   // llega uno suelto después: no debe pisar
ctx.contarElErrorDeAntes();
ok("un reinicio de verdad se cuenta con el ⚠ (y el suelto posterior no lo pisó)", lineas.length === 1 && /^bad: ⚠ La vez anterior el juego se detuvo y volvió a entrar solo/.test(lineas[0]) && /bucle/.test(lineas[0]), lineas[0]);
ok("después de contarlo, la llave se borra", Object.keys(store).length === 0);

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ un error ajeno no es un reinicio, y un reinicio se cuenta como tal\n");
process.exit(fallos ? 1 : 0);
