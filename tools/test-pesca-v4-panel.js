/* PESCA v4 · EL PANEL DEL LANCE, EN UN NAVEGADOR DE VERDAD (27/8, tanda 1c)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La lógica del lance ya está medida por test-pesca-v4-lance.js con seis jugadores simulados.
   Esto mide lo OTRO: que la mano llegue al cerebro. Un minijuego de mantener y soltar no se
   puede probar con jsdom —no hay pointerdown real, no hay requestAnimationFrame de verdad, no
   hay reloj— y este proyecto ya perdió dos días por creer que sí (el clic de la Cocina, 26/8).

   LO QUE SE JUEGA DE VERDAD ACÁ
     · se elige una sombra con el ratón y el corcho cae
     · llega el pique y el botón cambia lo que dice
     · se clava con la barra espaciadora y ahí —y solo ahí— se cobra la lombriz
     · se pelea manteniendo y soltando, y el pez entra en la bolsa con su peso

   Si no hay Chromium, se salta en verde. Para instalarlo, una vez:
       npm i -D puppeteer && npx puppeteer browsers install chrome
     node tools/test-pesca-v4-panel.js                                                           */
const path = require("path"), { spawn } = require("child_process");
const RAIZ = path.join(__dirname, "..");

let puppeteer = null;
try { puppeteer = require("puppeteer"); } catch (e) {}
if (!puppeteer) {
  console.log("\n  (saltado: no hay puppeteer en este equipo — la lógica del lance sí está");
  console.log("   medida, en tools/test-pesca-v4-lance.js)\n");
  process.exit(0);
}

(async () => {
  let fallos = 0, srv = null, browser = null;
  const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
  try {
    const PORT = 8600 + Math.floor(Math.random() * 300);
    srv = spawn(process.execPath, [path.join(RAIZ, "src/index.js")],
      { cwd: RAIZ, env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: "ignore" });
    for (let i = 0; i < 40; i++) {
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
    const errores = [];
    pg.on("pageerror", e => errores.push(e.message));
    await pg.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 2800));
    await pg.evaluate(() => {
      const l = document.getElementById("loading"); if (l) l.style.display = "none";
      G.res.lombriz = 20; G.canas = { junco: 1 }; G.fish = {}; G.pescaV4 = null;
      G.skills = Object.assign({}, G.skills, { fishing: 0 });
      pescaV4Botones(); pescaV4Abrir();
    });
    await new Promise(r => setTimeout(r, 400));

    console.log("\nEL AGUA OFRECE SOMBRAS Y SE ELIGE UNA");
    {
      const n = await pg.evaluate(() => document.querySelectorAll("[data-p4s]").length);
      ok("hay entre una y tres sombras para elegir", n >= 1 && n <= 3, n + "");
      ok("el panel está a la vista", await pg.evaluate(() => document.getElementById("pesca4").classList.contains("show")));
      const pos = await pg.evaluate(() => { const e = document.querySelector("[data-p4s]"); const r = e.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
      const lombAntes = await pg.evaluate(() => G.res.lombriz);
      await pg.mouse.click(pos.x, pos.y);
      await new Promise(r => setTimeout(r, 200));
      ok("clicar una sombra tira el corcho", await pg.evaluate(() => P4.fase) === "espera");
      ok("y NO cobra la lombriz todavía", await pg.evaluate(() => G.res.lombriz) === lombAntes,
        "siguen " + lombAntes);
    }

    console.log("\nEL PIQUE, Y LA VENTANA PARA CLAVAR");
    {
      let llego = false;
      for (let i = 0; i < 70; i++) { await new Promise(r => setTimeout(r, 100));
        if (await pg.evaluate(() => P4.fase) === "pique") { llego = true; break; } }
      ok("el pez pica dentro de los " + (await pg.evaluate(() => PIQUE_ESPERA[1])) + " s", llego);
      ok("y el botón lo dice sin ambigüedad",
        (await pg.evaluate(() => document.getElementById("p4-btn").textContent)).indexOf("CLAV") >= 0,
        await pg.evaluate(() => document.getElementById("p4-btn").textContent));
      const antes = await pg.evaluate(() => G.res.lombriz);
      await pg.keyboard.down("Space");
      await new Promise(r => setTimeout(r, 250));
      ok("clavar con la barra empieza la pelea", await pg.evaluate(() => P4.fase) === "pelea");
      ok("y AHÍ se cobra la lombriz — nunca antes",
        await pg.evaluate(() => G.res.lombriz) === antes - 1, antes + " → " + (antes - 1));
    }

    console.log("\nLA PULSEADA, JUGADA DE VERDAD CON EL TECLADO");
    {
      let maxTens = 0, gano = false;
      for (let i = 0; i < 900; i++) {
        const st = await pg.evaluate(() => P4.L ? { tir: P4.L.tirando, av: P4.L.avisando, te: P4.L.tension, pr: P4.L.progreso } : null);
        if (!st) { gano = true; break; }
        maxTens = Math.max(maxTens, st.te);
        if (st.tir || st.av) await pg.keyboard.up("Space"); else await pg.keyboard.down("Space");
        await new Promise(r => setTimeout(r, 25));
      }
      await pg.keyboard.up("Space");
      await new Promise(r => setTimeout(r, 300));
      ok("soltando en el aviso y en el tirón, el pez se captura", gano);
      ok("y jugando bien la tensión ni se acerca al tope", maxTens < 60, Math.round(maxTens) + " % de 100");
      const st = await pg.evaluate(() => ({ peces: G.fish, xp: G.skills.fishing, fase: P4.fase }));
      const capturado = Object.keys(st.peces).filter(k => st.peces[k] > 0);
      ok("el pez entra en la bolsa", capturado.length > 0, capturado.join(", "));
      ok("y paga XP de pesca", st.xp > 0, st.xp + " XP");
      ok("el panel vuelve solo a ofrecer sombras", st.fase === "sombras");
    }

    console.log("\nY EL PANEL NO ROMPE NADA");
    {
      ok("la página no tiró ningún error", !errores.length, errores.slice(0, 3).join(" · "));
      /* el botón se atiende con pointerdown/pointerup, NO con click: el jugador arrastra el dedo
         mientras aguanta, y un click solo existe si apretar y soltar caen en el mismo elemento —
         que es justo el fallo que nos costó dos días con la rejilla de la Cocina el 26/8. */
      const UI = require("fs").readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
      const bloque = UI.slice(UI.indexOf("function pescaV4Botones"), UI.indexOf("function pescaV4Botones") + 1400);
      ok("el botón usa pointerdown, no click", /pointerdown/.test(bloque) && !/\.onclick\s*=/.test(bloque));
      ok("y el soltar se escucha en la VENTANA, para que soltar fuera del botón cuente igual",
        /window\.addEventListener\("pointerup"/.test(bloque));
    }
  } catch (e) {
    fallos++;
    console.log("\n  FALLA  el arnés no pudo correr: " + String(e.message).split("\n")[0]);
  } finally {
    if (browser) try { await browser.close(); } catch (e) {}
    if (srv) try { srv.kill("SIGKILL"); } catch (e) {}
  }
  console.log("");
  console.log(fallos ? "  " + fallos + " fallo(s) — el panel del lance todavía no responde como una caña"
                     : "  Todo en orden: se elige, se clava, se pelea y el pez entra en la bolsa.");
  process.exit(fallos ? 1 : 0);
})();
