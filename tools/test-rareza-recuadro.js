/* EL RECUADRO DE RAREZA — UNA SOLA ESCALERA PARA TODO         (2/9, dirección, captura de Tibia)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Cuando un ítem tiene una rareza en particular, sale recuadro coloreado… y esto se puede
   hacer mediante el código, no hace falta hacerlo en el sprite ». Tenía razón en las dos: es
   código, y la escalera ya existía — son las seis bandas de la pesca (PEZ_BANDA). Lo que
   faltaba era que el resto del juego la usara: armas, picos, cañas y materiales llevaban su
   rareza en la cabeza del diseñador y en ningún sitio del código.

   Este archivo custodia que la escalera sea UNA: que rarezaDe() derive del material, que la
   bolsa pinte la casilla con ella, y que lo común no se pinte (si todo brilla, no brilla nada).
     node tools/test-rareza-recuadro.js                                                       */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA ESCALERA ES LA QUE YA HABÍA (las bandas de la pesca)");
{
  const B = g("PEZ_BANDA"), M = g("RAREZA_MAT");
  ok("los seis escalones tienen nombre y color", Object.keys(B).length === 6 && Object.keys(B).every(k => B[k].label && B[k].color));
  ok("y toda rareza derivada cae en uno de ellos", Object.values(M).every(v => !!B[v]), Object.values(M).join(" · "));
}

console.log("\nCADA FAMILIA SACA SU RAREZA DEL MATERIAL");
{
  const r = (k, v) => ctx.rarezaDe(k, v);
  ok("el arma de madera es común y la de diamante legendaria",
    r("arm", "hacha_madera") === "comun" && r("arm", "espada_diamante") === "legendario");
  ok("los picos suben igual — piedra común, netherita mítica",
    r("pick", "stone") === "comun" && r("pick", "netherite") === "mitico");
  ok("las cañas también — junco común, la del Abuelo legendaria",
    r("cana", "junco") === "comun" && r("cana", "abuelo") === "legendario");
  ok("los materiales y las barras, por su metal", r("res", "netherita") === "mitico" && r("res", "barra_oro") === "epico");
  ok("el pez lo saca de SU banda, con peso en la clave (2/9)", r("fish", "merluza@2.35") === "comun");
  ok("y el fósil de la v2 sigue siendo su propia banda", r("fish", "legendario") === "legendario");
  ok("lo que no tiene rareza contesta null (una semilla no es épica)", r("seed", "papa") === null);
  /* la escalera tiene que ser MONÓTONA en cada familia: si el orden del juego sube, la rareza
     no puede bajar — es la comprobación que atrapa un material agregado en el sitio equivocado */
  const B = Object.keys(g("PEZ_BANDA"));
  const sube = (orden, kind) => orden.map(k => B.indexOf(ctx.rarezaDe(kind, k))).every((v, i, a) => i === 0 || v >= a[i - 1]);
  ok("los picos no bajan de rareza al subir de escalón", sube(g("PICK_ORDER"), "pick"), g("PICK_ORDER").join(" → "));
  ok("las cañas tampoco", sube(g("CANA_V4_ORDER"), "cana"), g("CANA_V4_ORDER").join(" → "));
  ok("ni las armas", sube(g("ARM_RAREZAS").map(m => "espada_" + m), "arm"), g("ARM_RAREZAS").join(" → "));
}

console.log("\nY LA BOLSA LO PINTA — SIN TOCAR UN SOLO SPRITE");
{
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("la casilla pide su rareza a la escalera única", /rarezaDe\(d\.kind, d\.key\)/.test(UI));
  ok("y lo COMÚN no lleva recuadro", /rar !== "comun"/.test(UI));
  const tiers = ["poco_comun", "raro", "epico", "legendario", "mitico"];
  ok("las cinco rarezas visibles tienen su estilo", tiers.every(t => HTML.includes(".slot.filled.r-" + t)),
    tiers.filter(t => !HTML.includes(".slot.filled.r-" + t)).join(", "));
  ok("con tres clases, para ganarle al degradé y al tema de madera sin depender del orden",
    !/\n  \.slot\.r-/.test(HTML));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la rareza se ve en la casilla, y sale de una sola escalera.\n");
process.exit(fallos ? 1 : 0);
