/* ¿LLEGAN LOS CLICS A SU DESTINO? — con un navegador de verdad (26/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   EL BUG QUE OBLIGÓ A ESCRIBIR ESTO, y por qué ninguna de las 118 herramientas lo vio.

   El diseñador reportó DOS VECES, con las mismas palabras, que no podía elegir una receta en la
   Cocina. Las dos veces lo diagnostiqué mal. La segunda le dije que « no podía reproducirlo »,
   y tenía razón él: mi reproducción usaba jsdom, y jsdom no hace hit-testing ni implementa la
   captura de puntero. O sea que mi medidor no podía ver el fallo NI EN PRINCIPIO.

   La causa, una vez con Chromium delante, aparece en tres líneas:

       mousedown  destino=IMG        ← la celda de la receta, correcto
       mouseup    destino=DIV.card   ← ¡la ventana!  (y bajo el cursor seguía estando el IMG)
       click      destino=DIV.card

   `makeHoldDrag` capturaba el puntero en el pointerdown, así que la ventana se quedaba con
   todos los eventos y el click nunca llegaba a la celda. Lo que salvaba a los botones era
   DRAG_EXCLUDE, una lista escrita a mano — y la Cocina de dos paneles estrenó un clicable que
   no es un botón. (El arreglo fue capturar recién al empezar el arrastre; ver ui.js.)

   LA REGLA QUE ESTE ARCHIVO VIGILA
       Un clic quieto sobre algo clicable tiene que llegar A ESO, no a la ventana que lo contiene.

   Y la vigila BARRIENDO, no con una lista: recorre los paneles, busca todo lo que tenga un
   manejador de clic y prueba cada uno. Una lista de « lo que hay que probar » se desactualiza
   igual que la lista que causó el bug.

   NO HACE FALTA PARA TRABAJAR: si no hay Chromium instalado, este archivo lo dice y sale en
   verde. Para instalarlo, una vez:   npx puppeteer browsers install chrome
     node tools/test-clic-navegador.js                                                           */
const path = require("path"), { spawn } = require("child_process");
const RAIZ = path.join(__dirname, "..");

let puppeteer = null;
try { puppeteer = require("puppeteer"); } catch (e) {}
if (!puppeteer) {
  console.log("\n  (saltado: no hay puppeteer en este equipo — `npm i -D puppeteer` y");
  console.log("   `npx puppeteer browsers install chrome` para que este archivo mida de verdad)\n");
  process.exit(0);
}

/* los paneles que se barren y cómo dejarlos listos. La partida se prepara desde adentro para no
   depender de ninguna nube: este archivo mide el ENRUTADO del clic, no la economía. */
const PANELES = ["ov-cocina", "ov-inv", "ov-shop", "ov-forge", "ov-objetivos", "ov-pedidos"];

(async () => {
  let fallos = 0, srv = null, browser = null;
  const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
  try {
    /* el servidor del juego, como proceso aparte: src/index.js escucha solo, no exporta la app */
    const PORT = 8790 + Math.floor(Math.random() * 200);
    srv = spawn(process.execPath, [path.join(RAIZ, "src/index.js")],
      { cwd: RAIZ, env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: "ignore" });
    for (let i = 0; i < 40; i++) {                      // esperar a que conteste, sin dormir de más
      await new Promise(r => setTimeout(r, 250));
      const vivo = await new Promise(res => {
        const rq = require("http").get("http://127.0.0.1:" + PORT + "/", r2 => { r2.resume(); res(true); });
        rq.on("error", () => res(false)); rq.setTimeout(400, () => { rq.destroy(); res(false); });
      });
      if (vivo) break;
    }

    browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"] });
    const pg = await browser.newPage();
    await pg.setViewport({ width: 1280, height: 800 });
    /* CADA BLOQUE ARRANCA DE UNA PÁGINA LIMPIA. La primera versión de este archivo compartía
       una sola carga entre las tres secciones y las dos últimas salían en rojo: el barrido dejaba
       ventanas movidas y listas repintadas, y el bloque siguiente medía sobre eso. Un medidor
       cuyos casos se contaminan entre sí no distingue un fallo del juego de un fallo suyo — y yo
       ya perdí hoy un rato persiguiendo un rojo que era mío. */
    const preparar = async () => {
      await pg.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "networkidle2", timeout: 45000 });
      await new Promise(r => setTimeout(r, 2600));
      await pg.evaluate(() => {
        /* sin WebGL la escena nunca llama a juegoListo, así que el telón no se levanta solo */
        const l = document.getElementById("loading"); if (l) l.style.display = "none";
        G.level = 9; G.plata = 5000;
        G.skills = Object.assign({}, G.skills, { cooking: 300, farming: 9000, fishing: 300, mining: 300 });
        G.built = Object.assign({}, G.built, { cocina: true, horno: true, store: true });
        G.dishes = { papa_asada: 2 }; G.res = Object.assign({}, G.res, { madera: 50, piedra: 50, papa: 5, carne: 3 });
        G.tuto = { done: false, n: 0, step: TUTO_STEPS.findIndex(s => s.id === "estofado") };
      });
    };
    /* dónde está AHORA el centro de algo: se remide justo antes de cada clic, porque el HUD
       repinta una vez por segundo y unas coordenadas de hace medio segundo ya son mentira. */
    const centro = (sel) => pg.evaluate((s) => {
      const c = document.querySelector(s); if (!c) return null;
      const r = c.getBoundingClientRect(); if (!r.width || !r.height) return null;
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, sel);
    await preparar();

    console.log("\nLA RECETA QUE EL DISEÑADOR NO PODÍA ELEGIR");
    {
      await pg.evaluate(() => { openOv("ov-cocina"); refreshCooking(); tutoSync(true); tutoHighlight(); });
      await new Promise(r => setTimeout(r, 500));
      const pos = await pg.evaluate(() => {
        const c = document.querySelector('[data-ckrec="estofado"]'); if (!c) return null;
        const r = c.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      ok("la celda del Estofado existe y está a la vista", !!pos);
      if (pos) {
        const antes = await pg.evaluate(() => _ckSel);
        await pg.mouse.click(pos.x, pos.y);
        await new Promise(r => setTimeout(r, 400));
        const desp = await pg.evaluate(() => _ckSel);
        ok("un clic de ratón la deja elegida", desp === "estofado", antes + " → " + desp);
      }
      /* y TODAS las demás, no solo la reportada: el fallo era de la rejilla entera */
      const todas = await pg.evaluate(async () => {
        const ids = [...document.querySelectorAll("[data-ckrec]")].map(e => e.dataset.ckrec);
        return { n: ids.length, ids };
      });
      let elegidas = 0;
      for (const id of todas.ids.slice(0, 8)) {
        const p2 = await pg.evaluate((k) => { const c = document.querySelector('[data-ckrec="' + k + '"]'); if (!c) return null;
          const r = c.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }, id);
        if (!p2) continue;
        await pg.mouse.click(p2.x, p2.y);
        await new Promise(r => setTimeout(r, 120));
        if (await pg.evaluate(() => _ckSel) === id) elegidas++;
      }
      ok("y las demás recetas de la rejilla también", elegidas === Math.min(8, todas.ids.length),
        elegidas + "/" + Math.min(8, todas.ids.length));
    }

    console.log("\nEL BARRIDO: ningún clicable puede quedar sordo, en NINGÚN panel");
    {
      await preparar();
      /* Se mide solo el ENRUTADO. Un escucha en fase de captura anota a quién le llegó el clic
         y lo detiene ahí mismo, así que ningún manejador de verdad corre: el barrido no compra,
         no vende y no cocina nada. Medir sin tocar. */
      await pg.evaluate(() => {
        window.__ultimo = null;
        document.addEventListener("click", (e) => {
          window.__ultimo = e.target;
          e.stopPropagation(); e.preventDefault();
        }, true);
      });
      let probados = 0; const sordos = [];
      for (const panel of PANELES) {
        const hay = await pg.evaluate((p) => { try { openOv(p); } catch (e) { return false; }
          return !!document.getElementById(p) && !document.getElementById(p).classList.contains("hidden"); }, panel);
        if (!hay) continue;
        await new Promise(r => setTimeout(r, 350));
        const puntos = await pg.evaluate((p) => {
          const cont = document.getElementById(p); if (!cont) return [];
          const out = [];
          cont.querySelectorAll("*").forEach(e => {
            if (!e.onclick) return;                       // solo lo que de verdad escucha
            if (e.disabled) return;
            const r = e.getBoundingClientRect();
            if (r.width < 6 || r.height < 6) return;      // invisible o colapsado
            if (e.offsetParent === null) return;          // en una pestaña oculta
            e.dataset.__barrido = "s" + out.length;
            out.push({ sel: '[data-__barrido="s' + out.length + '"]',
              que: e.tagName + (typeof e.className === "string" && e.className ? "." + e.className.split(" ")[0] : "") });
          });
          return out.slice(0, 14);
        }, panel);
        for (const marca of puntos) {
          const pt = Object.assign({ que: marca.que }, await centro(marca.sel) || {});
          if (pt.x == null) continue;                 // se fue de la vista mientras tanto: no es un sordo
          await pg.evaluate(() => { window.__ultimo = null; });
          await pg.mouse.click(pt.x, pt.y);
          await new Promise(r => setTimeout(r, 45));
          const llego = await pg.evaluate((P) => {
            const t = window.__ultimo; if (!t) return "NADIE";
            const e = document.elementFromPoint(P.x, P.y);
            /* CORRECTO = el clic llegó EXACTAMENTE a lo más profundo que hay bajo el cursor.
               Mi primera versión aceptaba también un ancestro ("t.contains(e)"), y con eso el
               barrido daba verde CON EL BUG PUESTO: la ventana es ancestro de todo lo que
               contiene, así que « se lo quedó la ventana » pasaba por bueno. El fallo que este
               archivo busca es, literalmente, « llegó al ancestro en vez de al destino ».
               Lo descubrí restaurando el bug — un test que nunca estuvo en rojo no es un test. */
            return (t === e) ? "OK" :
              (t.tagName + (typeof t.className === "string" && t.className ? "." + t.className.split(" ")[0] : ""));
          }, pt);
          probados++;
          if (llego !== "OK") sordos.push(panel + " · " + pt.que + " → el clic se lo quedó " + llego);
        }
      }
      ok("hay clicables que probar", probados >= 12, probados + " probados");
      ok("todos reciben su propio clic", !sordos.length, sordos.slice(0, 6).join("\n           "));
    }

    console.log("\nY ARRASTRAR LAS VENTANAS SIGUE FUNCIONANDO   (para eso existía la captura)");
    {
      await preparar();
      await pg.evaluate(() => { openOv("ov-cocina"); refreshCooking(); });
      await new Promise(r => setTimeout(r, 350));
      const c0 = await pg.evaluate(() => { const c = document.querySelector("#ov-cocina .card"); window.__card = c;
        const r = c.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top) + 12, left: Math.round(r.left), top: Math.round(r.top) }; });
      await pg.mouse.move(c0.x, c0.y); await pg.mouse.down();
      for (const d of [10, 50, 100]) { await pg.mouse.move(c0.x + d, c0.y + Math.round(d / 2)); await new Promise(r => setTimeout(r, 40)); }
      await pg.mouse.move(1270, 60); await new Promise(r => setTimeout(r, 60));   // soltar FUERA: esto solo va con captura
      await pg.mouse.up(); await new Promise(r => setTimeout(r, 300));
      const c1 = await pg.evaluate(() => { const r = window.__card.getBoundingClientRect();
        return { left: Math.round(r.left), top: Math.round(r.top), pegada: window.__card.classList.contains("uidrag") }; });
      ok("la ventana se mueve al arrastrarla", c1.left !== c0.left || c1.top !== c0.top, c0.left + "," + c0.top + " → " + c1.left + "," + c1.top);
      ok("y se suelta aunque el cursor termine fuera de ella", !c1.pegada);
    }
  } catch (e) {
    fallos++;
    console.log("\n  FALLA  el arnés de navegador no pudo correr: " + String(e.message).split("\n")[0]);
  } finally {
    if (browser) try { await browser.close(); } catch (e) {}
    if (srv) try { srv.kill("SIGKILL"); } catch (e) {}
  }

  console.log("");
  console.log(fallos
    ? "  " + fallos + " fallo(s) — hay clics que no llegan a donde el jugador los puso"
    : "  Todo en orden: cada clic llega a lo que el jugador tocó, y las ventanas siguen moviéndose.");
  process.exit(fallos ? 1 : 0);
})();
