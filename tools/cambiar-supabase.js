/* CAMBIAR EL PROYECTO DE SUPABASE (14/9 — mudanza)
   Reescribe la URL y la anon key del proyecto en los DOS sitios donde viven (save.js y el
   preconnect de index.html) y comprueba que la key sea del mismo proyecto que la URL.
     node tools/cambiar-supabase.js https://xxxx.supabase.co eyJ...            */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const [url, key] = process.argv.slice(2);
if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url || "")) { console.error("URL inválida: tiene que ser https://<ref>.supabase.co  (Project Settings → API → Project URL)"); process.exit(1); }
if (!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key || "")) { console.error("Anon key inválida (Project Settings → API → anon public)"); process.exit(1); }
const ref = url.match(/https:\/\/([^.]+)\./)[1];
let payload = {};
try { payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")); } catch (e) {}
if (payload.ref && payload.ref !== ref) { console.error("La key es del proyecto " + payload.ref + " y la URL del proyecto " + ref + ": no van juntas."); process.exit(1); }
if (payload.role && payload.role !== "anon") { console.error("Esa key es « " + payload.role + " », no « anon ». En el cliente va SOLO la anon public."); process.exit(1); }
const S = path.join(RAIZ, "public/game/save.js"), H = path.join(RAIZ, "public/index.html");
let s = fs.readFileSync(S, "utf8"), h = fs.readFileSync(H, "utf8");
const viejo = (s.match(/const SB_URL = "https:\/\/([^.]+)\.supabase\.co";/) || [])[1];
s = s.replace(/const SB_URL = "[^"]+";/, 'const SB_URL = "' + url + '";').replace(/const SB_KEY = "[^"]+";/, 'const SB_KEY = "' + key + '";');
h = h.replace(/<link rel="preconnect" href="https:\/\/[^"]+\.supabase\.co" crossorigin>/, '<link rel="preconnect" href="' + url + '" crossorigin>');
fs.writeFileSync(S, s); fs.writeFileSync(H, h);
console.log("Listo: " + (viejo || "?") + " → " + ref + "  (save.js + index.html). Ahora deploy.bat.");
