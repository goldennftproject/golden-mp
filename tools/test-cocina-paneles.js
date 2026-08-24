/* LA COCINA EN DOS PANELES (24/8, referencia del diseñador: Sunflower Land)
   « Copiar la cocina del SFL: sin mucha letra, con más imágenes. »
   Antes era una lista de 20 filas con dos párrafos cada una — para elegir un plato había que
   leer. Contratos del rediseño:
     · DOS paneles: izquierda estado (ollas + recetario en grilla), derecha el detalle;
     · el recetario es una GRILLA DE ÍCONOS, no filas de texto, con el stock en la esquina y
       el nivel que pide si está cerrada;
     · el detalle muestra ingredientes TENÉS/PIDE y marca en rojo lo que falta;
     · elegir otra receta NO cambia el tamaño de la ventana (regla de la casa);
     · la ventana vieja sigue funcionando si el HTML no se actualizó (respaldo);
     · y no se perdió ninguna acción: cocinar, vender en plata y vender en $Golden.
     node tools/test-cocina-paneles.js                                                         */
const fs = require("fs");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
/* la ventana de lectura se corta en la función SIGUIENTE, no a tantos caracteres: cada vez que
   refreshCookingV2 crecía un comentario, el recorte fijo se comía el final y tres contratos
   fallaban sin que nadie hubiera roto nada (pasó el 24/8). */
const _ini = UI.indexOf("function refreshCookingV2");
const _fin = UI.indexOf("\nfunction ", _ini + 30);
const v2 = UI.slice(_ini, _fin > 0 ? _fin : _ini + 12000);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nDOS PANELES, COMO LA REFERENCIA");
{
  const win = HTML.slice(HTML.indexOf('id="ov-cocina"'), HTML.indexOf('id="ov-cocina"') + 1200);
  ok("la ventana tiene los dos lados", /ck-izq/.test(win) && /ck-der/.test(win));
  ok("izquierda: las ollas y el recetario", /id="ck-cola"/.test(win) && /id="ck-grid"/.test(win));
  ok("derecha: el detalle del plato", /id="ck-detalle"/.test(win));
  ok("y el nivel de Cocina en el título, no en un párrafo", /id="ck-nivel"/.test(win));
  ok("se fue el párrafo largo de antes",
    !/Los platos curan vida y dan buffs/.test(win), "sin muros de texto");
}

console.log("\nEL RECETARIO ES UNA GRILLA DE ÍCONOS");
{
  ok("cada receta se dibuja como ícono", /ckIcono\(r\)/.test(v2));
  ok("con el stock que tenés en la esquina", /class="n"/.test(v2));
  ok("y el nivel que pide si está cerrada", /class="lv"/.test(v2) && /locked/.test(v2));
  ok("la seleccionada se marca", /" sel"/.test(v2));
  ok("clic en un ícono cambia el detalle", /data-ckrec/.test(v2) && /ckElegir/.test(v2));
  const css = HTML.slice(HTML.indexOf(".ck-grid{"), HTML.indexOf(".ck-grid{") + 200);
  ok("y la grilla scrollea por dentro (la ventana no crece)", /overflow-y:auto/.test(css) && /max-height/.test(css));
}

console.log("\nEL DETALLE: NÚMEROS EN COLUMNA, Y LO QUE FALTA EN ROJO");
{
  ok("muestra TENÉS/PIDE de cada ingrediente", /"\/" \+ n/.test(v2));
  ok("y marca en rojo lo que no alcanza", /t < n \? " falta"/.test(v2));
  ok("con el tiempo real de cocción (Cocina nv2 incluida)", /cocinaFactor/.test(v2));
  ok("la XP, la curación y el precio", /r\.xp/.test(v2) && /r\.heal/.test(v2) && /vPlata/.test(v2));
  ok("y cuántos tenés ya cocinados", /tenés/.test(v2));
}

console.log("\nNO SE PERDIÓ NINGUNA ACCIÓN");
{
  ok("cocinar", /data-ckcook/.test(v2) && /cook\(b\.dataset\.ckcook\)/.test(v2));
  ok("vender en plata", /data-cksell=/.test(v2) && /sellDish\(b\.dataset\.cksell, false\)/.test(v2));
  ok("vender en $Golden (desde Cocina 8)", /data-cksellg/.test(v2) && /lvl >= 8/.test(v2));
  ok("y el botón dice POR QUÉ no se puede", /Faltan ingredientes/.test(v2) && /Ollas ocupadas/.test(v2) && /Cocina nivel/.test(v2));
}

console.log("\nLA FLECHA DEL TUTORIAL SIGUE TENIENDO DÓNDE POSARSE");
{
  /* 24/8: los pasos "cociná una Papa Asada" apuntan a [data-cook='<id>'], que en la lista vieja
     era el botón Cocinar. Acá ese botón solo existe para la receta señalada, así que la marca
     viaja: en el ícono mientras no está elegida, en el botón cuando ya lo está. Sin esto la
     flecha se apaga sin decir nada — y el jugador nuevo se queda mirando la ventana. */
  ok("el ícono lleva la marca mientras NO está elegido", /id === _ckSel \? "" : ' data-cook="' \+ id \+ '"'/.test(v2));
  ok("y el botón Cocinar la lleva cuando sí", /data-ckcook="' \+ _ckSel \+ '" data-cook="' \+ _ckSel \+ '"/.test(v2));
  const ST = fs.readFileSync("public/game/state.js", "utf8");
  ["papa_asada", "estofado"].forEach(id =>
    ok("el paso « " + id + " » del tutorial sigue apuntando ahí", ST.includes("[data-cook='" + id + "']")));
}

console.log("\nLA VENTANA NO CAMBIA DE TAMAÑO (regla de la casa)");
{
  const der = HTML.slice(HTML.indexOf(".ck-der{"), HTML.indexOf(".ck-der{") + 220);
  ok("el panel derecho tiene ancho fijo", /width:190px/.test(der) && /flex:0 0 190px/.test(der));
  ok("y alto mínimo, así que elegir otra receta no lo encoge", /min-height:\d+px/.test(der));
  const nm = HTML.slice(HTML.indexOf(".ck-der .nm{"), HTML.indexOf(".ck-der .nm{") + 160);
  ok("el nombre reserva su espacio aunque sea corto", /min-height/.test(nm));
}

console.log("\nY EL CAMINO VIEJO SIGUE AHÍ POR SI ACASO");
{
  ok("refreshCooking usa la vista nueva si el HTML la tiene", /const grid = \$\("ck-grid"\);\s*\n\s*if \(grid\) return refreshCookingV2\(\);/.test(UI));
  ok("y cae a la lista vieja si no", /const box = \$\("cook-list"\); if \(!box\) return;/.test(UI));
  ok("el reloj de las ollas se refresca solo", /_ckTick/.test(v2));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: se elige el plato mirando, no leyendo.\n");
process.exit(fallos ? 1 : 0);
