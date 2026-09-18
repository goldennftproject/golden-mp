/* EL BOTÓN DE DESCONECTAR                          (18/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « ¿Y cómo deslogueo entonces? Hace falta un botón de desconectar ».

   Hace falta desde que se entra con correo: hasta hoy « desconectarse » no quería decir nada,
   porque la cuenta anónima no era de nadie y salir de ella era igual que borrar el navegador.

   LO QUE ESTE ARCHIVO CUSTODIA NO ES EL BOTÓN, ES EL ORDEN:

   1 · Salir sin guardar pierde la sesión de juego. Guardar va PRIMERO y se espera.
   2 · Y hay que borrar nuestras propias marcas. Éste es el que se olvida y el que hace que el
       botón « no funcione »: el arranque revive la sesión con el refresh token que guardamos
       nosotros, así que si la marca queda, el jugador se desconecta y vuelve a entrar solo.

   (Queda además una negativa de dos líneas para la cuenta sin correo. No es una función para
   ese jugador —desde el 18/9 no existe, toda cuenta nace de un enlace de correo— sino un
   seguro por si algún día se apaga GF.SOLO_EMAIL: salir de una cuenta sin correo dejaría esa
   granja inalcanzable para siempre. No tiene UI ni explicación; simplemente no pasa.)
     node tools/test-cerrar-sesion.js                                                          */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const SAVE = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8");
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const cuerpo = (SAVE.match(/async function cerrarSesion\(\) \{([\s\S]*?)\n\}/) || [])[1] || "";

console.log("\n1 · EL SEGURO POR SI SE APAGA LA BANDERA   (no es UI, es una negativa)\n");
{
  ok("la función existe", !!cuerpo, cuerpo.length + " car.");
  ok("pregunta si la cuenta tiene correo", /cuentaEstado\(\)/.test(cuerpo) && /modo === "email"/.test(cuerpo));
  ok("y se NIEGA si no lo tiene", /if \(!tieneEmail\) return \{ error:/.test(cuerpo));
  ok("con un motivo que se puede leer, no un código", /no hay forma de volver a ella/.test(cuerpo));
  /* y la negativa va ANTES de tocar nada: si estuviera después del signOut, la sesión ya
     estaría cerrada cuando la función se da cuenta */
  const iNiega = cuerpo.indexOf("if (!tieneEmail)"), iSalir = cuerpo.indexOf("signOut");
  ok("la negativa va ANTES de cerrar nada", iNiega >= 0 && iSalir > iNiega, "niega en " + iNiega + ", cierra en " + iSalir);
}

console.log("\n2 · SE GUARDA PRIMERO, Y SE ESPERA\n");
{
  const iGuarda = cuerpo.indexOf("saveFarm"), iSalir = cuerpo.indexOf("signOut");
  ok("guarda antes de cerrar la sesión", iGuarda >= 0 && iSalir > iGuarda, "guarda en " + iGuarda + ", cierra en " + iSalir);
  ok("y ESPERA al guardado (un await, no un disparo al aire)", /await saveFarm\(true\)/.test(cuerpo));
  ok("con force, que es lo que fuerza la escritura aunque no toque por tiempo", /saveFarm\(true\)/.test(cuerpo));
}

console.log("\n3 · Y SE BORRAN NUESTRAS MARCAS, O EL JUGADOR VUELVE A ENTRAR SOLO\n");
{
  ok("se borra nuestra copia de la llave", /removeItem\(GF_CUENTA_KEY\)/.test(cuerpo));
  ok("y la copia local de la granja", /removeItem\(GF_COPIA_KEY\)/.test(cuerpo));
  /* el porqué de la primera: ese refresh token es justo lo que initSave usa para revivir */
  ok("(arnés) esa marca es la que el arranque usa para revivir la sesión",
    /marca\.refresh_token/.test(SAVE) && /refreshSession/.test(SAVE));
  /* y el porqué de la segunda: si queda, el arranque cree que hay una partida huérfana */
  ok("(arnés) y la copia local es la que dispara el cartel de « partida sin cuenta »",
    /function hayGranjaLocal/.test(SAVE));
  ok("queda anotado en la bitácora de sesión, con hora", /sesionLog\("sesión cerrada por el jugador"\)/.test(cuerpo));
}

console.log("\n4 · EL BOTÓN SOLO SE ENCIENDE CUANDO ES SEGURO\n");
{
  ok("existe en el panel de Cuenta", /id="cfg-salir"/.test(HTML));
  ok("y nace deshabilitado (nunca encendido por accidente)", /id="cfg-salir" disabled/.test(HTML));
  ok("se enciende con la cuenta atada a un correo, que desde el 18/9 son TODAS",
    /bS\.disabled = false; bS\.title/.test(UI));
  ok("y sin nube no se ofrece (no habría con qué guardar antes de salir)",
    /bS\.title = "Sin conexión con la nube"/.test(UI));
}

console.log("\n5 · Y EL JUGADOR SABE QUÉ VA A PASAR ANTES DE APRETAR\n");
{
  ok("hay confirmación, no se cierra de un clic", /askConfirm\([\s\S]{0,200}?Se va a guardar tu granja/.test(UI));
  ok("el aviso dice que se guarda primero", /Se va a guardar tu granja/.test(UI));
  ok("y que la granja NO se borra, que es el miedo de cualquiera", /Tu granja no se borra/.test(UI));
  ok("y NOMBRA el correo con el que se vuelve (contesta « ¿y ahora cómo entro? »)",
    /entrás con " \+ email/.test(UI));
  ok("el botón de confirmar es rojo: es una salida, no un trámite", /yesClass: "red"/.test(UI));
  ok("y después se recarga, para que el juego arranque limpio", /location\.reload\(\)/.test(UI));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
