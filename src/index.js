// Servidor Golden MP: Colyseus (tiempo real) + Express (sirve el cliente).
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WorldRoom } = require("./rooms/WorldRoom");

const PORT = Number(process.env.PORT) || 2567;

const app = express();

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
    if (/\.(js|html|css)$/.test(filePath)) res.setHeader("Cache-Control", "no-cache");
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
