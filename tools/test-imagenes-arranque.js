"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { Duplex } = require("node:stream");
const express = require("express");
const { prepararImagenesArranque } = require("../src/imagenes-arranque");
const { archivos } = require("../src/variantes-webp.json");

const raiz = path.resolve(__dirname, "..");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

function servidor(proyecto, pares = archivos) {
  const app = express();
  app.use(prepararImagenesArranque(proyecto, pares));
  app.use(express.static(path.join(proyecto, "public"), { maxAge: 86_400_000 }));
  return http.createServer(app);
}

// Se prueban el parser de Node, Express y sendFile con un socket en memoria.
function pedir(server, ruta, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const partes = [];
    const socket = new Duplex({
      read() {},
      write(chunk, _, done) { partes.push(chunk); done(); },
    });
    socket.setTimeout = () => socket;
    socket.destroySoon = () => socket.end();
    const limite = setTimeout(() => socket.destroy(Error("La respuesta HTTP tardó demasiado")), 5000);
    socket.once("error", error => { clearTimeout(limite); reject(error); });
    socket.once("finish", () => {
      clearTimeout(limite);
      const total = Buffer.concat(partes);
      const fin = total.indexOf("\r\n\r\n");
      const [estado, ...lineas] = total.subarray(0, fin).toString().split("\r\n");
      const campos = Object.fromEntries(lineas.map(linea => {
        const pos = linea.indexOf(":");
        return [linea.slice(0, pos).toLowerCase(), linea.slice(pos + 1).trim()];
      }));
      resolve({ status: Number(estado.split(" ")[1]), campos, cuerpo: total.subarray(fin + 4) });
      socket.destroy();
    });
    server.emit("connection", socket);
    const campos = Object.entries(headers).map(([nombre, valor]) => nombre + ": " + valor + "\r\n").join("");
    socket.push(method + " " + ruta + " HTTP/1.1\r\nHost: qa.invalid\r\n" + campos + "Connection: close\r\n\r\n");
  });
}

function comprobar(adjunto, tipo, sha256) {
  assert.equal(adjunto.status, 200);
  assert.equal(adjunto.campos["content-type"], tipo);
  assert.match(adjunto.campos.vary, /\bAccept\b/i);
  assert.match(adjunto.campos["cache-control"], /max-age=86400/);
  assert.equal(hash(adjunto.cuerpo), sha256);
}

async function probarRespaldoModificado() {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "golden-imagenes-"));
  const publico = path.join(carpeta, "public");
  const assets = path.join(publico, "assets");
  const png = path.join(assets, "atlas.png"), webp = path.join(assets, "atlas.webp");
  const par = archivos[0];
  fs.mkdirSync(assets, { recursive: true });
  try {
    fs.copyFileSync(path.join(raiz, "public", par.png.ruta), png);
    fs.copyFileSync(path.join(raiz, "public", par.webp.ruta), webp);
    const app = servidor(carpeta, [par]);
    const ruta = "/" + par.png.ruta;
    const cabeceras = { Accept: "image/webp" };
    comprobar(await pedir(app, ruta, cabeceras), "image/webp", par.webp.sha256);

    const original = fs.readFileSync(png);
    const cambio = Buffer.from(original);
    cambio[cambio.length - 1] ^= 1;
    const fechas = fs.statSync(png);
    fs.writeFileSync(png, cambio);
    fs.utimesSync(png, fechas.atime, fechas.mtime);
    comprobar(await pedir(app, ruta, cabeceras), "image/png", hash(cambio));

    fs.writeFileSync(png, original);
    comprobar(await pedir(app, ruta, cabeceras), "image/webp", par.webp.sha256);
    fs.unlinkSync(webp);
    comprobar(await pedir(app, ruta, cabeceras), "image/png", par.png.sha256);
  } finally {
    for (const archivo of [png, webp]) if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
    for (const ruta of [assets, publico, carpeta]) fs.rmdirSync(ruta);
  }
}

(async () => {
  const app = servidor(raiz);
  const accept = { Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" };
  for (const par of archivos) {
    const ruta = "/" + par.png.ruta + "?v=qa";
    comprobar(await pedir(app, ruta, accept), "image/webp", par.webp.sha256);
    comprobar(await pedir(app, ruta, { Accept: "*/*" }), "image/png", par.png.sha256);
  }

  const par = archivos[0];
  const ruta = "/" + par.png.ruta + "?v=57";
  const original = await pedir(app, ruta, { Accept: "image/webp;q=0,image/*;q=1" });
  comprobar(original, "image/png", par.png.sha256);
  comprobar(await pedir(app, ruta, { Accept: "image/png,image/webp;q=0.8" }), "image/png", par.png.sha256);
  const condicionado = await pedir(app, ruta, { ...accept, "If-None-Match": original.campos.etag });
  comprobar(condicionado, "image/webp", par.webp.sha256);
  assert.notEqual(condicionado.campos.etag, original.campos.etag);
  const misma = await pedir(app, ruta, { ...accept, "If-None-Match": condicionado.campos.etag });
  assert.equal(misma.status, 304);
  assert.equal(misma.cuerpo.length, 0);
  assert.match(misma.campos.vary, /\bAccept\b/i);
  const mismoPng = await pedir(app, ruta, { "If-None-Match": original.campos.etag });
  assert.equal(mismoPng.status, 304);
  assert.equal(mismoPng.cuerpo.length, 0);
  assert.match(mismoPng.campos.vary, /\bAccept\b/i);

  const parcial = await pedir(app, ruta, { ...accept, Range: "bytes=0-11" });
  assert.equal(parcial.status, 206);
  assert.equal(parcial.campos["content-range"], "bytes 0-11/" + par.webp.bytes);
  assert.deepEqual(parcial.cuerpo, condicionado.cuerpo.subarray(0, 12));
  const head = await pedir(app, ruta, accept, "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.campos["content-length"], String(par.webp.bytes));
  assert.equal(head.cuerpo.length, 0);

  await probarRespaldoModificado();
  console.log("OK: cuatro WebP verificados, respaldo PNG, preferencias Accept, ETag/304, Range, HEAD y detección de cambios de arte.");
})().catch(error => { console.error(error); process.exitCode = 1; });
