# Golden Farm · Zona compartida (POC multijugador)

Prueba de concepto de la **zona compartida** en tiempo real, con la misma tecnología que Sunflower Land:

- **Cliente:** Phaser 3 (mundo, movimiento libre con diagonal, cámara que sigue al jugador).
- **Servidor:** Colyseus (salas en tiempo real por WebSocket) + Express (sirve el cliente).
- **Identidad:** por ahora, un apodo simple (después se enchufa tu login de Supabase).

> Nota: la **economía todavía NO está acá** (minado, $Golden, etc.), a propósito. Esto es solo el cimiento del mundo compartido: verte moverte junto a otros jugadores en vivo. La granja privada y la economía autoritativa vienen después.

---

## Cómo correrlo (en tu máquina, no en la nube)

Necesitás **Node.js 18+** instalado. En una terminal, dentro de esta carpeta:

```bash
npm install
npm start
```

Vas a ver:

```
 Cliente:  http://localhost:2567
```

Abrí **http://localhost:2567** en el navegador. Poné un apodo y entrá.
Para ver el multijugador funcionando, **abrí la misma URL en otra pestaña** (o en otra ventana / otra compu de tu red) con otro apodo: vas a ver a los dos personajes moverse en vivo, cada uno controlado por su pestaña.

Controles: **WASD** o **flechas** (permite diagonal).

---

## Cómo está armado

```
golden-mp/
  package.json          → dependencias y scripts
  src/
    index.js            → servidor: Colyseus + Express
    rooms/WorldRoom.js   → la sala compartida (sincroniza posiciones)
  public/               → el cliente (lo sirve el servidor)
    index.html          → carga Phaser + Colyseus (desde CDN) y game.js
    game.js             → escena Phaser, movimiento, render de otros jugadores
    assets/             → sprites del granjero (los de Golden Farm)
```

El **servidor** mantiene el estado autoritativo de las **posiciones** de todos los jugadores. Cada cliente:
1. controla su propio personaje (movimiento libre),
2. le manda su posición al servidor ~15 veces por segundo,
3. y el servidor la refleja a todos los demás, que la interpolan para que se vea suave.

---

## Deploy (cuando quieras subirlo)

El servidor necesita un **proceso Node persistente con WebSockets** — no sirve Vercel static.
Opciones fáciles: **Railway**, **Render**, **Fly.io** o **Colyseus Cloud**.
En cualquiera de ellas: subís este repo, corren `npm install` y `npm start`, y exponen el puerto (usan `process.env.PORT`, que ya está contemplado).

---

## Próximos pasos sugeridos

1. **Granja privada** como escena aparte (instancia por jugador), y una puerta/portal entre tu granja y la plaza compartida.
2. **Login real**: reemplazar el apodo por tu sesión de Supabase (pasás el token al entrar a la sala).
3. **Economía autoritativa** en el servidor (minar/vender/craftear/$Golden) — el paso clave para el token/NFT.
4. **Mapas en Tiled** para diseñar la plaza y las zonas grandes visualmente.
5. Portar la lógica y el arte que ya tenés en `golden-game.html`.

---

## Si algo falla al correrlo

Este POC se armó en un entorno donde no se pudo instalar ni ejecutar Node/Phaser (el registro de npm y los CDNs estaban bloqueados), así que **no se pudo probar en vivo del lado de quien lo armó**. Si al correr `npm start` ves algún error, copiámelo tal cual (y la versión que instaló de `colyseus`) y lo ajusto enseguida.
