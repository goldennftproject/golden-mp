"use strict";

const fs = require("node:fs");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");

function compilarGuardar(fuente, rutaBellotas) {
  const importacionBellotas = /^import \{\s*([^}]+)\s*\} from ["']\.\/bellotas\.ts["'];\s*$/m;
  const bellotasImportadas = fuente.match(importacionBellotas);
  const js = stripTypeScriptTypes(fuente)
    .replace(/^import .*createClient.*;\s*$/m, "")
    .replace(importacionBellotas, "");
  const moduloBellotas = bellotasImportadas && stripTypeScriptTypes(fs.readFileSync(rutaBellotas, "utf8"))
    .replace(/^export (?=function )/gm, "");

  return ctx => {
    vm.createContext(ctx);
    if (bellotasImportadas) {
      const exportaciones = vm.runInContext(
        `(function(){\n${moduloBellotas}\nreturn {${bellotasImportadas[1]}};\n})()`,
        ctx, { filename: rutaBellotas },
      );
      Object.assign(ctx, exportaciones);
    }
    vm.runInContext(js, ctx);
  };
}

module.exports = { compilarGuardar };
