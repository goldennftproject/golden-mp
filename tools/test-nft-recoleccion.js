/* LOS TRES NFT DE RECOLECCIÓN: +0,1 POR GOLPE                               (21/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Crear al menos 3 NFT tipo los de SFL que den 0,1 wood, 0,1 stone, 0,1 iron… al minar, al
   talar… ponelos donde creas conveniente teniendo en cuenta el ancla y la fórmula. »
   Contratos:
     · sin NFT un golpe paga 1; con el NFT del material paga 1,1; los otros materiales, igual;
     · los SEIS puntos de farm.js donde un golpe paga pasan por bonoNft (si no, el NFT sería un
       cartel);
     · el precio se DERIVA del ancla: +2 plata/h por nodo × nodos máximos × NFT_MESES;
       el de la madera vale más que el del hierro porque hay más árboles que vetas;
     · comprar cobra $Golden, no repite, y el del Pase no se vende;
     · el Pase VIP lo entrega en el nivel 26 y lo escribe en el premio (sin tocar el $Golden del carril);
     · viaja en el guardado;
     · y el portero lo aguanta sin cambios: su MARGEN cubre el +10 %.
     node tools/test-nft-recoleccion.js                                                          */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const avisos = []; ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t)); ctx.window.celebrate = () => {};
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
const PORTERO = fs.readFileSync(path.join(RAIZ, "supabase/functions/guardar/index.ts"), "utf8");

console.log("\n1 · EL BONO: +0,1 solo con el NFT del material\n");
{
  G.nfts = {};
  ok("sin NFT, un golpe de hacha paga 1", g('bonoNft("madera", 1)') === 1);
  G.nfts = { hacha_abuelo: true };
  ok("con el Hacha del Abuelo paga 1,1", Math.abs(g('bonoNft("madera", 1)') - 1.1) < 1e-9, g('bonoNft("madera", 1)'));
  ok("y la piedra sigue pagando 1 (cada NFT es de SU material)", g('bonoNft("piedra", 1)') === 1);
  ok("el hierro también, hasta tener el Pico Viejo", g('bonoNft("hierro", 1)') === 1);
  G.nfts = { pico_viejo: true };
  ok("con el Pico de Hierro Viejo, el hierro paga 1,1", Math.abs(g('bonoNft("hierro", 1)') - 1.1) < 1e-9);
  ok("el bronce no (no hay NFT de bronce)", g('bonoNft("bronce", 1)') === 1);
}

console.log("\n2 · LOS SEIS GOLPES QUE PAGAN PASAN POR EL BONO\n");
{
  const sitios = (FARM.match(/tryAddRes\("madera", bonoNft\("madera", gr[F]?\)\)/g) || []).length
    + (FARM.match(/tryAddRes\("piedra", bonoNft\("piedra", gr[F]?\)\)/g) || []).length
    + (FARM.match(/tryAddRes\(o\.ore, bonoNft\(o\.ore, grVeta\)\)/g) || []).length;
  ok("madera ×2, piedra ×2, veta ×2", sitios === 6, sitios + " de 6");
  ok("y no quedó ninguno sin bono", !/tryAddRes\("(madera|piedra)", gr[F]?\)/.test(FARM) && !/tryAddRes\(o\.ore, grVeta\)/.test(FARM));
}

console.log("\n3 · EL PRECIO SALE DEL ANCLA\n");
{
  const pm = g('nftPrecioGolden("hacha_abuelo")'), pp = g('nftPrecioGolden("cincel_cantera")'), ph = g('nftPrecioGolden("pico_viejo")');
  const esperado = (res) => Math.max(10, Math.round(g("NFT_MESES") * 0.1 * g("ANCLA_PLATA_HORA") * g('nftNodosMax("' + res + '")') * 720 / g("GOLDEN_EN_PLATA")));
  ok("madera: NFT_MESES × 2 plata/h × nodos × 720 h ÷ Golden", pm === esperado("madera"), pm + " $G");
  ok("hierro: misma fórmula con SUS vetas", ph === esperado("hierro"), ph + " $G · vetas " + g('nftNodosMax("hierro")'));
  ok("hay más árboles que vetas, así que la madera vale más", pm > ph);
  ok("madera y piedra valen lo mismo (mismos nodos)", pm === pp);
  ok("los árboles máximos son 3 + las expansiones", g('nftNodosMax("madera")') === 3 + g("EXPANSION_MAX"));
}

console.log("\n4 · COMPRAR\n");
{
  G.nfts = {}; G.tuto = { done: true }; G.golden = 0; avisos.length = 0;
  ok("sin $Golden no se compra, y lo dice", g('comprarNft("hacha_abuelo")') === false && /falta \$Golden/.test(avisos.join(" ")), avisos.slice(-1)[0]);
  const precio = g('nftPrecioGolden("hacha_abuelo")');
  G.golden = precio + 5;
  ok("con $Golden se compra y cobra justo el precio", g('comprarNft("hacha_abuelo")') === true && G.golden === 5 && g('tengoNft("hacha_abuelo")'));
  G.golden = 1000;
  ok("no se compra dos veces", g('comprarNft("hacha_abuelo")') === false && G.golden === 1000);
  avisos.length = 0;
  ok("el del Pase no se vende en la tienda", g('comprarNft("cincel_cantera")') === false && /Pase VIP/.test(avisos.join(" ")) && G.golden === 1000, avisos.slice(-1)[0]);
}

console.log("\n5 · EL PASE VIP LO ENTREGA EN EL NIVEL 26\n");
{
  const r = g("PASS_VIP")[25];
  ok("el premio VIP del nivel 26 es el NFT", r && r.nft === "cincel_cantera", JSON.stringify(r));
  ok("y el texto del premio lo nombra con su bono", /Cincel de Cantera/.test(g("passRewardStr")(r)) && /\+0,1/.test(g("passRewardStr")(r)), g("passRewardStr")(r));
  G.nfts = {}; G.pass = null; const p = g("passInit()"); p.vip = true; p.stars = 26 * g("PASS_STARS_LVL");
  g("passClaim(26, true)");
  ok("reclamarlo lo da", g('tengoNft("cincel_cantera")'));
  ok("y desde entonces la piedra paga 1,1", Math.abs(g('bonoNft("piedra", 1)') - 1.1) < 1e-9);
  ok("y el $Golden del carril VIP no se tocó (candado del 18/8: 60 $G exactos)", g("PASS_VIP").reduce((t, r) => t + (r.golden || 0), 0) === 60);
  ok("el nivel 26 del Pase, nombrado en la tienda y en el aviso", /nivel 26/.test(fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8")));
}

console.log("\n6 · VIAJA EN EL GUARDADO\n");
{
  G.nfts = { pico_viejo: true };
  const snap = JSON.parse(JSON.stringify(g("snapshot()")));
  ok("snapshot lleva nfts", snap.nfts && snap.nfts.pico_viejo === true);
  G.nfts = {};
  g("hydrate")(snap);
  ok("hydrate lo recupera", g('tengoNft("pico_viejo")'));
}

console.log("\n7 · EL PORTERO LO AGUANTA SIN CAMBIOS\n");
{
  const m = /const MARGEN = ([\d.]+);/.exec(PORTERO);
  ok("el margen del portero cubre el +10 % del bono", m && parseFloat(m[1]) >= 1.1 + 0.05, "MARGEN = " + (m && m[1]));
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ los tres NFT pagan +0,1 por golpe, con precio del ancla y uno en el Pase\n");
process.exit(fallos ? 1 : 0);
