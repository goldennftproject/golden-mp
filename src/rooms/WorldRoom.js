// Sala compartida: sincroniza la posición y estado de cada jugador.
// El servidor mantiene el estado autoritativo de POSICIONES (no de economía todavía).
const { Room } = require("colyseus");
const { Schema, MapSchema, defineTypes } = require("@colyseus/schema");

// --- Esquema de un jugador ---
class Player extends Schema {}
defineTypes(Player, {
  x: "number",
  y: "number",
  dir: "string",     // "east" | "west"
  moving: "boolean",
  name: "string",
});

// --- Estado de la sala ---
class WorldState extends Schema {}
defineTypes(WorldState, {
  players: { map: Player },
});

class WorldRoom extends Room {
  onCreate(options) {
    this.maxClients = 50;
    this.setState(new WorldState());

    // El cliente manda su posición; el server la refleja a todos.
    this.onMessage("move", (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !data) return;
      if (typeof data.x === "number") p.x = data.x;
      if (typeof data.y === "number") p.y = data.y;
      if (data.dir === "east" || data.dir === "west") p.dir = data.dir;
      p.moving = !!data.moving;
    });

    console.log("[WorldRoom] creada:", this.roomId);
  }

  onJoin(client, options) {
    const p = new Player();
    // Punto de aparición en la plaza compartida
    p.x = 480 + Math.floor((this.clients.length % 5) * 34);
    p.y = 320;
    p.dir = "east";
    p.moving = false;
    p.name = (options && options.name ? String(options.name) : "Granjero").slice(0, 14);
    this.state.players.set(client.sessionId, p);
    console.log(`[WorldRoom] +${p.name} (${client.sessionId}) · ${this.clients.length} online`);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    console.log(`[WorldRoom] -${client.sessionId} · ${this.clients.length} online`);
  }
}

module.exports = { WorldRoom };
