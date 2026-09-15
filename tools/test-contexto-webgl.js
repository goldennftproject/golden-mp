/* LA PANTALLA CONGELADA AL VOLVER DE OTRA PESTAÑA                    (15/9, jugando)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Se queda pegado, freezz… puedo hacer click, se realiza la acción CON EL SONIDO pero no da
   vídeo… cuando duro mucho sin estar en la pantalla del juego se freezea ».

   Ese síntoma tiene un solo culpable posible: si los clics se procesan y suenan, el bucle del
   juego está vivo, así que lo que se murió es el contexto WebGL — Chrome se lo lleva a las
   pestañas que llevan rato en segundo plano. Sin nadie escuchando, el canvas queda congelado
   para siempre y solo lo arregla el F5.

   Esto no se puede probar sin un navegador de verdad (haría falta la extensión WEBGL_lose_context
   sobre un canvas real), así que lo que se custodia acá es lo que SÍ se puede leer en el código:
   que el oyente exista, que llame a preventDefault —sin eso el navegador no devuelve el contexto
   nunca— y, sobre todo, que GUARDE ANTES de recargar. Eso último es ley 1: la recarga automática
   es la que puede comerse una partida si se hace en el orden equivocado.
     node tools/test-contexto-webgl.js                                                          */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const MAIN = fs.readFileSync(path.join(RAIZ, "public/game/main.js"), "utf8");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · ALGUIEN ESCUCHA CUANDO EL NAVEGADOR SE LLEVA EL DIBUJO\n");
ok("hay un oyente de webglcontextlost sobre el canvas", /addEventListener\("webglcontextlost"/.test(MAIN));
ok("y llama a preventDefault (sin eso el contexto no vuelve nunca)",
  /webglcontextlost"[\s\S]{0,200}?preventDefault\(\)/.test(MAIN));
ok("y otro de webglcontextrestored, para volver en cuanto se pueda", /addEventListener\("webglcontextrestored"/.test(MAIN));
ok("el juego queda accesible para poder mirarle el contexto", /window\.GAME = new Phaser\.Game/.test(MAIN));
ok("y al volver a la pestaña se comprueba si el contexto está caído (por si el aviso se perdió)",
  /visibilitychange[\s\S]{0,400}?isContextLost\(\)/.test(MAIN));

console.log("\n2 · LEY 1: PRIMERO SE GUARDA, DESPUÉS SE RECARGA\n");
{
  const m = MAIN.match(/const volverAEntrar = \(\) => \{([\s\S]*?)\n  \};/);
  ok("(arnés) existe la función que vuelve a entrar", !!m);
  if (m) {
    const cuerpo = m[1];
    const iGuarda = cuerpo.indexOf("saveFarm"), iRecarga = cuerpo.indexOf("location.reload");
    ok("guarda la granja antes de recargar", iGuarda >= 0 && iRecarga > iGuarda,
      "guardado en " + iGuarda + ", recarga en " + iRecarga);
    ok("y le da tiempo al guardado de salir (la recarga no pisa la petición)", /setTimeout\([\s\S]{0,80}?location\.reload/.test(cuerpo));
  }
  const espera = (MAIN.match(/var CTX_RECARGA_MS = (\d+);/) || [])[1];
  ok("lo que se espera antes de recargar está en una constante y es menos de un segundo",
    espera && Number(espera) > 0 && Number(espera) <= 1000, espera + " ms");
  ok("y NO se recarga con la pestaña en segundo plano (volvería a pasar lo mismo al rato)",
    /document\.visibilityState === "visible"\) recargar\(\)/.test(MAIN));
}

console.log("\n3 · EL PULSO DEL BUCLE (el mismo síntoma por otro camino)\n");
{
  ok("se vigila que el contador de fotogramas se mueva", /loop\.frame !== ultimoFrame/.test(MAIN));
  ok("pero SOLO con la pestaña a la vista (escondida, estar parado es lo normal)",
    /document\.visibilityState !== "visible"\) \{ ultimoFrame = -1; return; \}/.test(MAIN));
  ok("primero se intenta despertarlo, que no interrumpe nada", /loop\.wake === "function"/.test(MAIN));
  ok("y solo si no despierta se guarda y se vuelve a entrar",
    /despertado[\s\S]{0,500}?rendirse\(/.test(MAIN));
  const muerto = (MAIN.match(/var LOOP_MUERTO_MS = (\d+);/) || [])[1];
  const mira = (MAIN.match(/var LOOP_MIRA_MS = (\d+);/) || [])[1];
  ok("los dos tiempos están en constantes y son de segundos", muerto && mira &&
    Number(muerto) >= 2000 && Number(muerto) <= 30000 && Number(mira) < Number(muerto),
    "muerto a los " + muerto + " ms, se mira cada " + mira + " ms");
}

console.log("\n4 · Y SI REVIENTA, SE SABE POR QUÉ\n");
{
  ok("se atrapan los errores sueltos del juego", /window\.addEventListener\("error"/.test(MAIN) &&
    /function atraparLosErrores/.test(MAIN));
  ok("y las promesas rotas, que no salen por window.onerror", /unhandledrejection/.test(MAIN));
  ok("se engancha al arrancar, antes de crear las escenas", /atraparLosErrores\(\);[\s\S]{0,200}?events\.once\("ready"/.test(MAIN));
  ok("un error suelto NO recarga la partida (solo se anota)",
    !/addEventListener\("error"[\s\S]{0,400}?location\.reload/.test(MAIN));
  ok("el que decide seguir siendo el pulso: rendirse se llama con un motivo",
    /rendirse\("el bucle del juego se detuvo"\)/.test(MAIN) && /rendirse\("contexto WebGL perdido"\)/.test(MAIN));
  ok("y el cartel enseña el nombre del error", /ctx-detalle/.test(MAIN) && /id="ctx-detalle"/.test(HTML));
  ok("se recuerdan unos pocos, no todos (una fuga de memoria por un bug sería el colmo)",
    /__gfErr\.length > ERR_RECUERDA/.test(MAIN));
}

console.log("\n5 · Y EL JUGADOR SE ENTERA DE QUÉ PASÓ\n");
ok("hay un cartel para el momento en que se recarga sola", /id="ctx-perdido"/.test(HTML));
ok("que arranca oculto (no se ve en una partida normal)", /id="ctx-perdido"[^>]*display:none/.test(HTML));
ok("y main.js lo enciende cuando pasa", /getElementById\("ctx-perdido"\)/.test(MAIN));
ok("el cartel dice que la partida quedó guardada, que es la duda de cualquiera", /ya quedó guardada/.test(HTML));

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
