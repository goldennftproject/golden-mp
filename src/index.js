// Servidor Golden MP: Colyseus (tiempo real) + Express (sirve el cliente).
const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WorldRoom } = require("./rooms/WorldRoom");

const PORT = Number(process.env.PORT) || 2567;

const app = express();

/* ===================== EL ARRANQUE PESA UN MEGA (24/8, dirección) =====================
   « Sigue tardando en entrar a la granja, algo se ha roto ahí en el inicio. »
   Y era verdad, aunque no se rompió de golpe: se fue rompiendo. El juego son 1.186 KB de
   JavaScript y el servidor los mandaba TAL CUAL, sin comprimir. Con gzip son 393: estábamos
   enviando tres veces lo necesario en cada carga. Mientras el código era chico daba igual;
   hoy state.js solo pesa 432 KB y el bulto se nota.
   Comprimir es una línea y no cambia nada del juego. Va ANTES del static, que es el que sirve
   los archivos: si va después, no lo toca. */
try { app.use(require("compression")()); }
catch (e) { console.warn("compression no está instalado: se sirve sin comprimir (npm i compression)"); }

/* ===================== EL SELLO SE CALCULA, NO SE ESCRIBE (24/8) =====================
   El cargador le pega ?b=GF_BUILD a cada .js, y desde que los servimos con "immutable" ese
   sello es lo ÚNICO que le avisa al navegador que hay código nuevo. Lo escribía un script en
   el deploy… y en el primer deploy después de endurecer la caché, el sello se quedó SIN
   COMMITEAR: el servidor siguió anunciando el número viejo. Con la caché blanda no pasaba
   nada; con la dura, el jugador se queda un año con el código de ayer.
   Un sello que hay que acordarse de actualizar es un sello roto. Este se DERIVA de los propios
   archivos: si cambia una coma en cualquiera de los doce, cambia el número. No hay forma de
   olvidárselo, porque nadie lo escribe.
   (El literal del html se deja como está: es el respaldo para abrir el juego sin servidor.) */
const JUEGO_DIR = path.join(__dirname, "..", "public", "game");
function selloDelCodigo() {
  const h = require("crypto").createHash("sha1");
  for (const f of fs.readdirSync(JUEGO_DIR).sort()) {
    if (!/\.js$/.test(f)) continue;
    const st = fs.statSync(path.join(JUEGO_DIR, f));
    h.update(f + ":" + st.size + ":" + Math.floor(st.mtimeMs) + ";");
  }
  return h.digest("hex").slice(0, 12);
}
let SELLO = "dev", INDEX_HTML = null;
function indexConSello() {
  const s = selloDelCodigo();
  if (INDEX_HTML && s === SELLO) return INDEX_HTML;   // se rearma solo si cambió el código
  SELLO = s;
  const crudo = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  INDEX_HTML = crudo.replace(/const GF_BUILD = "[^"]*";/, 'const GF_BUILD = "' + SELLO + '";');
  console.log("Sello del código: " + SELLO);
  return INDEX_HTML;
}
app.get(["/", "/index.html"], (req, res) => {
  res.set("Cache-Control", "no-cache");
  res.type("html").send(indexConSello());
});

// CORS: permite que el cliente alojado en Vercel (otro dominio) haga el
// matchmaking contra este servidor en Render.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Versión del deploy: en Render cambia el commit en cada deploy (no en reinicios).
const VERSION = process.env.RENDER_GIT_COMMIT || "dev";
app.get("/version", (req, res) => { res.set("Cache-Control", "no-store"); res.json({ v: VERSION }); });

// Canal de avisos en vivo (SSE): cada ventana del juego queda suscripta.
// Al deployar, el server viejo muere → el navegador se reconecta solo al nuevo →
// recibe la versión nueva AL INSTANTE y la ventana se actualiza. Push exacto, sin sondeos.
const sseClients = new Set();   // una entrada por ventana abierta del juego = jugadores en línea
function sseBroadcast() {
  const msg = `data: ${JSON.stringify({ v: VERSION, online: sseClients.size })}\n\n`;
  for (const r of sseClients) { try { r.write(msg); } catch (e) {} }
}
app.get("/events", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-store", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 3000\n\n");                              // si se corta, reintentar a los 3s
  sseClients.add(res);
  sseBroadcast();                                            // versión + conteo en vivo para TODAS las ventanas
  const ka = setInterval(() => { try { res.write(":ka\n\n"); } catch (e) {} }, 25000);   // latido anti-timeout
  req.on("close", () => { clearInterval(ka); sseClients.delete(res); sseBroadcast(); });
});

// Sirve el cliente estático (public/) — sirve para el deploy "todo en uno" en Render.
// no-cache en js/html/css: el navegador revalida con ETag en cada carga, así después
// de un deploy siempre baja el código nuevo (nunca reusa un .js viejo cacheado).
app.use(express.static(path.join(__dirname, "..", "public"), {
  etag: true,
  setHeaders: (res, filePath) => {
    /* 24/8 — el no-cache de los .js costaba una ida y vuelta POR ARCHIVO en cada carga, solo
       para que el server contestara "no cambió". Doce archivos, doce viajes de saludo antes de
       que corriera una línea del juego. Y era innecesario desde el día que el cargador les puso
       ?b=GF_BUILD: la dirección YA cambia en cada deploy, así que el navegador no puede reusar
       un archivo viejo aunque lo guarde para siempre. Con ?b= presente se cachea de verdad
       (immutable = ni siquiera pregunta); sin ?b=, se sigue revalidando como antes, que es la
       red de seguridad para cualquier .js que alguien pida a mano. */
    const conBuild = !!(res.req && res.req.query && res.req.query.b);
    if (/\.js$/.test(filePath) && conBuild) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    else if (/\.(js|html|css)$/.test(filePath)) res.setHeader("Cache-Control", "no-cache");
    else if (/\.(png|jpg|gif|webp)$/.test(filePath)) res.setHeader("Cache-Control", "public, max-age=86400");   // imágenes: 1 día de caché (alivia al server free)
  },
}));

const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });

// Registra la sala de la zona compartida
gameServer.define("world", WorldRoom);

gameServer.listen(PORT).then(() => {
  console.log("========================================");
  console.log(" Golden Farm · Zona compartida (POC)");
  console.log(" Cliente:  http://localhost:" + PORT);
  console.log(" WebSocket: ws://localhost:" + PORT);
  console.log(" Abrí la URL en DOS pestañas para verte a vos mismo dos veces moviéndote.");
  console.log("========================================");
}).catch((e) => {
  console.error("No se pudo iniciar el servidor:", e);
  process.exit(1);
});
