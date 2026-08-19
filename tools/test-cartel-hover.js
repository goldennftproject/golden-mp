/* EL CARTEL DE ACCIÓN NO SALE VACÍO (18/8)
   Dirección: "cuando paso el cursor por debajo de las tres parcelas iniciales aparece el
   cuadradito con una leyenda vacía. Eso creo que ha quedado de antes, de cuando las parcelas
   estaban ubicadas ahí."
   No estaba de antes: las parcelas BLOQUEADAS de la fila siguiente seguían captando el cursor.
     node tools/test-cartel-hover.js                                                             */
const fs=require("fs");
const src=fs.readFileSync("public/game/farm.js","utf8");
let fallos=0;
const ok=(n,c,d)=>{if(!c)fallos++;console.log((c?"  ok   ":"  FALLA")+"  "+n+(d?"   "+d:""));};

// 1) una parcela bloqueada devuelve texto vacío (eso está bien: no es tuya)
ok("una parcela bloqueada no tiene texto de acción",
  /if \(o\.state === "locked"\) return "";/.test(src));

// 2) …y por eso NO puede ser el objetivo del cursor
ok("el cursor se salta las parcelas bloqueadas",
  /for \(const pl of this\.plots\) \{ if \(pl\.state === "locked"\) continue;/.test(src));

// 3) …ni el objetivo de la tecla E
ok("la tecla [E] también se las salta",
  /if \(o\.type === "plot" && o\.state === "locked"\) continue;/.test(src));

// 4) y la red de seguridad: sin texto, no hay cartel (cierra la clase entera)
ok("sin texto no se muestra el cartel (ratón)",
  /const txt = hit \? this\.promptText\(hit\) : "";\s*\n\s*if \(txt\) \{/.test(src));
ok("sin texto no se muestra el cartel (teclado)",
  /const t2 = o \? this\.promptText\(o\) : "";\s*\n\s*if \(t2\) \{/.test(src));

// 5) el respaldo de la laguna no puede pisar un objetivo válido
ok("la pesca solo se ofrece si no hay nada bajo el cursor",
  /else if \(!hit && this\.pondDist/.test(src));
ok("…y lo mismo con la tecla", /else if \(!o && this\.nearPond\(\)\)/.test(src));

/* 18/8 — MIENTRAS COLOCÁS, EL CARTEL EXPLICA. Un rectángulo rojo mudo es un bug de información:
   la dirección reportó "celdas bloqueadas fantasma" que en realidad eran la franja de la cerca. */
ok("mientras colocás, el cartel sigue vivo (antes se apagaba en modo edición)",
  /if \(this\.placing\) \{[\s\S]{0,400}el\.classList\.add\("show"\);/.test(src));
ok("…y dice POR QUÉ no entra, no solo que no entra",
  /el\.textContent = hu\.libre[\s\S]{0,200}hu\.motivo/.test(src));
ok("…y avisa de que el árbol ocupa dos celdas",
  /ocupa " \+ hu\.ancho \+ " celdas/.test(src));
ok("el motivo de la cerca ya no dice 'no se puede construir' a secas",
  /La cerca se reserva esta franja/.test(src));

console.log("\n"+(fallos?"FALLOS: "+fallos:"el cartel solo sale cuando hay algo que decir"));
process.exit(fallos?1:0);
