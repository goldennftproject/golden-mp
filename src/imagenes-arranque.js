"use strict";

const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { archivos } = require("./variantes-webp.json");

function firmaArchivo(archivo) {
  const estado = fs.statSync(archivo, { bigint: true });
  return [estado.ino, estado.size, estado.mtimeNs, estado.ctimeNs].join(":");
}

function coincide(archivo, esperado) {
  const bytes = fs.readFileSync(archivo);
  return bytes.length === esperado.bytes && createHash("sha256").update(bytes).digest("hex") === esperado.sha256;
}

function varianteVigente(variante) {
  try {
    const firma = firmaArchivo(variante.png) + "/" + firmaArchivo(variante.webp);
    if (variante.firma !== firma) {
      variante.vigente = coincide(variante.png, variante.par.png) && coincide(variante.webp, variante.par.webp);
      variante.firma = firma;
    }
    return variante.vigente;
  } catch (_) {
    return false;
  }
}

function prepararImagenesArranque(raiz, pares = archivos) {
  const publico = path.resolve(raiz, "public");
  const variantes = new Map(pares.map(par => ["/" + par.png.ruta, {
    par,
    png: path.join(publico, par.png.ruta),
    webp: path.join(publico, par.webp.ruta),
  }]));

  return function imagenesArranque(req, res, next) {
    const variante = variantes.get(req.path);
    if (!variante || (req.method !== "GET" && req.method !== "HEAD")) return next();

    // La misma URL conserva representaciones separadas en la caché.
    res.vary("Accept");
    const indicaWebp = /(?:^|,)\s*image\/webp\s*(?:[;,]|$)/i.test(req.get("Accept") || "");
    if (!indicaWebp || req.accepts(["image/webp", "image/png"]) !== "image/webp" || !varianteVigente(variante)) {
      return next();
    }

    res.type("image/webp").set("ETag", '"sha256-' + variante.par.webp.sha256 + '"');
    return res.sendFile(variante.webp, { maxAge: 86_400_000, lastModified: false }, error => {
      if (!error || error.code === "ECONNABORTED" || error.syscall === "write") return;
      if (!res.headersSent && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
        res.removeHeader("Content-Type");
        res.removeHeader("ETag");
        return next();
      }
      next(error);
    });
  };
}

module.exports = { prepararImagenesArranque };
