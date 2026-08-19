# Cómo montarlo en Internet (gratis)

El servidor Colyseus necesita un proceso Node con WebSockets → va en **Render (gratis)**.
El cliente puede ir en **tu Vercel** (o dejar que Render lo sirva también).

Tenés dos caminos. El **A** es el más simple (un solo deploy). El **B** usa tu página de Vercel, como pediste.

---

## PARTE 1 — Servidor Colyseus en Render (gratis) · común a A y B

Render despliega desde un repositorio Git. No necesitás la consola de git: se puede
subir por la web de GitHub.

1. **Cuenta de GitHub** (gratis): entrá a https://github.com y creá una cuenta.
2. **Nuevo repositorio**: botón **New** → nombre `golden-mp` → **Public** → Create.
3. **Subí los archivos**: en el repo, **Add file → Upload files**, y arrastrá el contenido
   de la carpeta `golden-mp` (los archivos `package.json`, `README.md`, y las carpetas
   `src/` y `public/`). **NO subas** `node_modules`. Commit.
4. **Cuenta de Render** (gratis, sin tarjeta): entrá a https://render.com y registrate
   (podés entrar con la cuenta de GitHub).
5. **New → Web Service**. Elegí el repo `golden-mp` (o pegá su URL pública).
6. Configuración:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
7. **Create Web Service**. Esperá a que termine el deploy (unos minutos).
8. Te queda una URL tipo **`https://golden-mp-xxxx.onrender.com`**. Esa es tu servidor.
   (Guardala; el WebSocket es la misma URL con `wss://`.)

> Nota del plan free: el servidor se **duerme tras 15 min sin uso** y tarda ~1 min en
> despertar en la primera visita. Para un POC está perfecto.

---

## CAMINO A — Todo en uno (lo más simple)

Render ya sirve el juego. **No hace falta tocar nada más.**
Abrí `https://golden-mp-xxxx.onrender.com` en dos pestañas → listo, multijugador online.

---

## CAMINO B — Cliente en tu Vercel + server en Render (lo que pediste)

1. Editá `public/index.html` y poné la URL de tu server de Render en la línea de config:
   ```html
   <script>window.GOLDEN_SERVER = "wss://golden-mp-xxxx.onrender.com";</script>
   ```
2. Deployá **solo la carpeta `public/`** a Vercel. Con el CLI que ya usás:
   ```bash
   cd public
   vercel --prod
   ```
   (o apuntá tu proyecto de Vercel existente a esa carpeta).
3. Abrí tu página de Vercel (`goldenfarm.vercel.app`): el cliente se conecta al server de
   Render por WebSocket. El CORS ya está habilitado en el server, así que funciona
   aunque el cliente esté en otro dominio.

> Si cambiás la URL del server, volvé a editar `window.GOLDEN_SERVER` y redeployá el cliente.

---

## Probar que anda

Abrí la URL final en **dos pestañas** (o dos dispositivos), poné apodos distintos y movéte
con WASD/flechas. Deberías ver a los dos personajes moverse en vivo.

Si la primera conexión tarda, es el server de Render despertando (plan free). Recargá al minuto.
