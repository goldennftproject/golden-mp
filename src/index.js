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

// Sirve el cliente estático (public/) — sirve para el deploy "todo en uno" en Render.
app.use(express.static(path.join(__dirname, "..", "public")));

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
