/* Tumbas compartidas: recibo durable y CAS. Desactivadas hasta integrar y aprobar el servidor. */
(function () {
  "use strict";
  if (typeof GF.GRAVES_SHARED_ENABLED !== "boolean") GF.GRAVES_SHARED_ENABLED = false;
  let cache = {uid: null, enabled: false, markers: [], ownGraveId: null}, sequence = 0;
  let activeUid = null;
  const recoveryScenes = new Set();
  const diagnostics = new Map(), diagnosticBuild = "calaveras-diag-20261108-1";
  const uuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const enrolled = () => typeof G !== "undefined" && G._graveProtocol === 1;
  const usesServer = () => GF.GRAVES_SHARED_ENABLED === true || enrolled();
  const deathUsesServer = () => enrolled() || (GF.GRAVES_SHARED_ENABLED === true && cache.uid === UID && cache.enabled);
  const journalKey = (uid, op) => "gf-calavera-recibo-" + SB_REF + "-" + uid + "-" + op;
  const readJSON = raw => { try { return JSON.parse(raw || "null"); } catch { return null; } };
  function diagnosticDate(value) {
    if (typeof value !== "string" || value.length > 50) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::?\d{2})?)$/.exec(value);
    if (!m) return null;
    const year = +m[1], month = +m[2], day = +m[3], hour = +m[4], minute = +m[5], second = +m[6];
    if (year < 1970 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) return null;
    if (m[8] !== "Z") { const zone = m[8].slice(1).replace(":", ""); if (+zone.slice(0, 2) > 23 || +(zone.slice(2) || "0") > 59) return null; }
    return value; // Se conserva el texto exacto y toda su precisión; esto no compara versiones.
  }
  function diagnosticOperation(p) {
    return p && typeof p === "object" ? {op: uuid(p.op) ? p.op : null,
      action: ["morir", "recoger"].includes(p.calavera?.action || "recoger") ? (p.calavera?.action || "recoger") : null,
      base: diagnosticDate(p.base)} : null;
  }
  function diagnosticFlags(uid, p, key, ordinaryPending) {
    return {keyEqualsBefore: typeof key === "string" && typeof p?.beforeKey === "string" ? key === p.beforeKey : null,
      keyEqualsLastSaved: typeof key === "string" && typeof lastSavedKey === "string" ? key === lastSavedKey : null,
      ordinaryPending: typeof ordinaryPending === "boolean" ? ordinaryPending : null,
      conflict: SAVE_CONFLICTOS.has(uid), sessionMatchesPending: UID === uid && (!p || p.cuenta === uid)};
  }
  function diagnosticStart(uid, p, r) {
    // Sólo metadatos permitidos. Nunca se retienen data, snapshot ni claves de estado en el informe.
    try { diagnostics.set(uid, {capturedAt: new Date().toISOString(), request: diagnosticOperation(p), updated_at: diagnosticDate(r?.updated_at),
      cancelado: typeof r?.cancelado === "boolean" ? r.cancelado : null,
      receipt: {action: ["morir", "recoger"].includes(r?.receipt?.action) ? r.receipt.action : null,
        op: uuid(r?.receipt?.op) ? r.receipt.op : null, cancelado: typeof r?.receipt?.cancelado === "boolean" ? r.receipt.cancelado : null,
        actorBaseBefore: diagnosticDate(r?.receipt?.actorBaseBefore), actorBaseAfter: diagnosticDate(r?.receipt?.actorBaseAfter)},
      liveBase: diagnosticDate(SAVE_BASES.get(uid)), flags: null, guard: "received"}); } catch {}
  }
  function diagnosticGuard(uid, guard, flags) {
    try { const d = diagnostics.get(uid); if (d) { d.guard = guard; if (flags) d.flags = flags; } } catch {}
  }
  function diagnosticScript() {
    try {
      const scripts = Array.from(document.scripts || []);
      if (document.currentScript && !scripts.includes(document.currentScript)) scripts.push(document.currentScript);
      for (const script of scripts.reverse()) {
        if (typeof script.src !== "string") continue;
        const url = new URL(script.src, typeof location !== "undefined" ? location.href : "https://goldenfarm.onrender.com/");
        if (url.pathname !== "/game/graves-api.js") continue;
        const raw = url.searchParams.get("b"), b = typeof raw === "string" && /^[a-zA-Z0-9._-]{1,80}$/.test(raw) ? raw : null;
        return {origin: ["https://goldenfarm.onrender.com", "https://golden-mp.onrender.com"].includes(url.origin) ? url.origin : null, path: url.pathname, b};
      }
    } catch {}
    return null;
  }
  function diagnosticReport() {
    let uid; try { uid = UID; } catch { uid = null; }
    let p = null, ordinaryPending = null, flags = null, base = null, lastACK = null;
    // No llamar snapKey() aquí: nombreLucido/cosElegido pueden normalizar cosméticos viejos.
    // Las igualdades exactas se capturan usando la única clave que el ACK ya calculaba.
    try { if (uid) { p = pending(uid); ordinaryPending = guardadoTienePendiente(uid); flags = diagnosticFlags(uid, p, null, ordinaryPending); base = diagnosticDate(SAVE_BASES.get(uid)); lastACK = diagnostics.get(uid) || null; } } catch {}
    const script = diagnosticScript();
    let nick = null, loadedBuild = script?.b || null;
    try { if (typeof NICK === "string" && NICK.trim() && NICK.trim() !== uid) nick = NICK.trim().slice(0, 80); } catch {}
    try { if (typeof GF_BUILD === "string" && /^[a-zA-Z0-9._-]{1,80}$/.test(GF_BUILD)) loadedBuild = GF_BUILD; } catch {}
    return JSON.parse(JSON.stringify({format: "goldenfarm-calaveras-diagnostico", version: 1, diagnosticBuild, exportedAt: new Date().toISOString(),
      loadedBuild, script, publicNick: nick, pending: diagnosticOperation(p), liveBase: base, flags, lastACK}));
  }
  function downloadDiagnostic() {
    let href = null, link = null;
    try {
      const blob = new Blob([JSON.stringify(diagnosticReport(), null, 2) + "\n"], {type: "application/json"});
      href = URL.createObjectURL(blob); link = document.createElement("a"); link.href = href;
      link.download = "goldenfarm-informe-para-Suren-" + Date.now() + ".json"; link.style.display = "none";
      document.body.appendChild(link); link.click(); return true;
    } catch { return false; }
    finally { try { if (link) link.remove(); if (href) { const revoke = () => { try { URL.revokeObjectURL(href); } catch {} }; if (typeof setTimeout === "function") setTimeout(revoke, 1000); else revoke(); } } catch {} }
  }
  function pending(uid = UID) {
    try {
      const p = readJSON(localStorage.getItem("gf-venta-pendiente-" + SB_REF + "-" + uid));
      if (p && p.cuenta === uid && p.calavera && uuid(p.op)) return p;
      const prefix = journalKey(uid, "");
      const found = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i); if (!key?.startsWith(prefix)) continue;
        const row = readJSON(localStorage.getItem(key));
        if (row?.cuenta === uid && row.calavera && uuid(row.op)) found.push(row);
      }
      found.sort((a, b) => a.createdAt - b.createdAt);
      return found[0] || null;
    } catch { return null; }
  }
  function hasPending(uid = UID) {
    if (pending(uid)) return true;
    try {
      const prefix = journalKey(uid, "");
      for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith(prefix)) return true;
      return false;
    } catch { return true; }
  }
  function busy() {
    let uid; try { uid = UID; } catch { return false; }
    return !!uid && (activeUid === uid || hasPending(uid) || [...recoveryScenes].some(scene => scene._graveRecoveryUid === uid));
  }
  function markPending(uid, p) {
    localStorage.setItem(journalKey(uid, p.op), JSON.stringify(p));
    mercadoMarcarPendiente(uid, p);
  }
  function clearPending(uid, p) {
    localStorage.removeItem(journalKey(uid, p.op));
    const active = readJSON(localStorage.getItem("gf-venta-pendiente-" + SB_REF + "-" + uid));
    if (active?.calavera && active.op === p.op && active.cuenta === uid) mercadoLimpiarPendiente(uid);
  }
  function session(allowPending = false) {
    if ((!usesServer() && !(allowPending && hasPending(UID))) || !sb || !UID || !CARGA_OK || SOLO_LOCAL) throw Error("Necesitas sesión y una partida sincronizada para confirmar esta operación.");
    return UID;
  }
  async function responseError(error, data) {
    let detail = data;
    if (error?.context && typeof error.context.json === "function") try { detail = await error.context.json(); } catch {}
    const e = Error(detail?.error || "Entrega incierta. Comprobá la misma recogida antes de repetir.");
    e.status = Number(error?.context?.status) || 0;
    return e;
  }
  async function invoke(body) {
    const {data, error} = await conTope(sb.functions.invoke("calaveras", {body}), 20000, "recibo de calavera");
    if (error || !data?.ok) throw await responseError(error, data);
    return data;
  }
  function backup(uid, p) {
    localStorage.setItem("gf-conflicto-respaldo-" + SB_REF + "-" + uid + "-" + Date.now(), JSON.stringify({cuenta: uid, data: snapshot(), base: SAVE_BASES.get(uid), pendiente: p}));
  }
  function acknowledge(uid, p, r) {
    diagnosticStart(uid, p, r);
    const action = p.calavera.action || "recoger";
    if (UID !== uid) { diagnosticGuard(uid, "account_changed"); throw Error("La cuenta cambió. El recibo queda en la cuenta que inició la recogida."); }
    if (!r?.ok || !r.data || typeof r.data !== "object" || Array.isArray(r.data) || typeof r.updated_at !== "string" || !Number.isFinite(Date.parse(r.updated_at))) { diagnosticGuard(uid, "invalid_response"); throw Error("La recogida no incluye un guardado confirmado."); }
    if (!uuid(r.receipt?.op) || r.receipt.op.toLowerCase() !== p.op.toLowerCase() || (r.receipt.action || "recoger") !== action ||
      (action === "recoger" && (!uuid(r.receipt.graveId) || r.receipt.graveId.toLowerCase() !== p.calavera.id.toLowerCase() || (!r.cancelado && r.receipt.revisionBefore !== p.calavera.revision))) ||
      (action === "morir" && r.receipt.graveId != null && !uuid(r.receipt.graveId)) ||
      (r.cancelado === true) !== (r.receipt.cancelado === true)) { diagnosticGuard(uid, "receipt_mismatch"); throw Error("El recibo no corresponde a esta operación. Se conserva la petición original."); }
    if (!r.cancelado && (Date.parse(r.receipt.actorBaseBefore) !== Date.parse(p.base) ||
      (!r.conflicto && Date.parse(r.receipt.actorBaseAfter) !== Date.parse(r.updated_at)))) { diagnosticGuard(uid, "receipt_version_mismatch"); throw Error("Las versiones del recibo no coinciden con esta recogida. Se conserva la petición original."); }
    if (Object.prototype.hasOwnProperty.call(r.data, "tumba")) invalidateOwn(r.data.tumba);
    const ordinaryPending = guardadoTienePendiente(uid);
    if (ordinaryPending) { diagnosticGuard(uid, "ordinary_save_pending"); throw Error("Hay un guardado sin confirmar. Se conserva el recibo de la calavera."); }
    const liveBase = SAVE_BASES.get(uid), liveKey = snapKey();
    try { diagnosticGuard(uid, "checked", diagnosticFlags(uid, p, liveKey, ordinaryPending)); } catch {}
    // Un UUID sellado como cancelado no cambió la partida. No hay un ACK económico que hidratar:
    // conservar íntegro el estado local, aunque el reloj o una acción legítima lo hayan avanzado.
    if (r.cancelado && liveBase === p.base && r.updated_at === p.base) {
      diagnosticGuard(uid, "cancelled_same_base");
      if (liveKey !== p.beforeKey) backup(uid, p);
      clearPending(uid, p);
      if (!hasPending(uid) && !mercadoPendiente(uid)) SAVE_CONFLICTOS.delete(uid);
      return;
    }
    // Una pestaña recién cargada puede tener YA el resultado actual: no volver a hidratarlo.
    if (liveBase === r.updated_at && liveKey === lastSavedKey) {
      diagnosticGuard(uid, "canonical_already_loaded");
      clearPending(uid, p); if (!hasPending(uid)) SAVE_CONFLICTOS.delete(uid); SAVE_OTRA = false;
      return;
    }
    if (r.conflicto === true) {
      diagnosticGuard(uid, "canonical_conflict");
      backup(uid, p); SAVE_CONFLICTOS.add(uid);
      throw Error("La recogida está registrada, pero otra operación cambió la versión de tu partida. Se conservó el recibo y tu avance local para revisar; no se reemplazó nada.");
    }
    if (r.cancelado && Date.parse(r.updated_at) !== Date.parse(p.base)) {
      diagnosticGuard(uid, "cancelled_remote_changed");
      backup(uid, p); SAVE_CONFLICTOS.add(uid);
      throw Error("La recogida se canceló, pero otra operación cambió la partida. Se conserva tu avance para revisar el guardado.");
    }
    // Nunca poner un ACK histórico por encima de progreso posterior, ni rebasar otra versión.
    if (liveBase !== p.base || liveKey !== p.beforeKey || Date.parse(r.updated_at) < Date.parse(p.base)) {
      diagnosticGuard(uid, "local_changed");
      backup(uid, p); SAVE_CONFLICTOS.add(uid);
      throw Error("La recogida tiene un recibo, pero tu partida cambió después. Se conserva todo para revisar el guardado; no se reemplazó tu avance.");
    }
    diagnosticGuard(uid, "applied");
    hydrate(r.data); SAVE_BASES.set(uid, r.updated_at); copiaGuardar(snapshot(), true); lastSavedKey = snapKey();
    clearPending(uid, p); if (!hasPending(uid)) SAVE_CONFLICTOS.delete(uid); SAVE_OTRA = false;
    if (typeof refreshHud === "function") refreshHud();
    if (typeof syncSlots === "function") syncSlots();
    if (typeof refreshMorral === "function") refreshMorral();
  }
  function pause(scene) {
    const uid = UID; let ours = false;
    if (scene?.scene && typeof scene.scene.isPaused === "function" && !scene.scene.isPaused() && typeof scene.scene.pause === "function") { scene.scene.pause(); ours = true; }
    return () => { if (ours && UID === uid && scene?.scene && typeof scene.scene.resume === "function" && scene.scene.isPaused()) scene.scene.resume(); };
  }
  function safeMarkers(data, uid) {
    if (!Array.isArray(data.markers) || data.markers.length > 100) throw Error("Lista de calaveras inválida.");
    const at = Date.parse(data.serverNow), offset = Number.isFinite(at) ? at - Date.now() : 0;
    const markers = data.markers.map(m => {
      const until = Date.parse(m.expiresAt);
      if (!uuid(m.id) || typeof m.nombre !== "string" || m.nombre.length > 80 || typeof m.zona !== "string" || !Number.isFinite(m.x) || !Number.isFinite(m.y) || !Number.isFinite(until) || !Number.isSafeInteger(m.revision) || m.revision < 0 || typeof m.isMine !== "boolean") throw Error("Cabecera de calavera inválida.");
      return {graveId: m.id, ownerName: m.nombre, zona: m.zona, x: m.x, y: m.y, until: until - offset, revision: m.revision, mia: m.isMine, sprite: null, drops: [], revisado: false};
    });
    return {uid, enabled: data.enabled === true, serverOffset: offset, ownGraveId: uuid(data.ownGraveId) ? data.ownGraveId : null, markers};
  }
  function removeMarkers(scene) {
    for (const c of (GF.forestCuerpos || []).slice()) if (c.graveId && c.zona === scene.zonaKey && typeof scene.retirarCuerpo === "function") scene.retirarCuerpo(c);
    GF.forestCuerpos = (GF.forestCuerpos || []).filter(c => !c.graveId);
  }
  function sceneAvailable(scene) {
    if (!scene) return false;
    if (!scene.sys || typeof scene.sys.isActive !== "function") return true;
    // El diálogo pausa Forest mientras llega la lectura. Paused sigue siendo esta escena;
    // sleeping/stopped/shutdown no pueden instalar respuestas ni iniciar un regreso.
    return scene.sys.isActive() || (typeof scene.sys.isPaused === "function" ? scene.sys.isPaused() :
      !!(scene.scene && typeof scene.scene.isPaused === "function" && scene.scene.isPaused()));
  }
  async function load(scene) {
    const uid = session(), generation = ++sequence;
    scene._graveRequestGeneration = generation;
    const zone = scene.zonaKey || "granja";
    let next;
    try {
      const data = await invoke({accion: "estado", cuenta: uid, zona: zone});
      if (UID !== uid || scene._graveRequestGeneration !== generation || generation !== sequence ||
        !sceneAvailable(scene)) return false;
      next = safeMarkers(data, uid);
    } catch (e) {
      // Una incorporación nueva necesita un estado vigente verificado. Un fallo viejo no puede
      // desactivar una lectura posterior ni una cuenta distinta; el protocolo 1 nunca vuelve a privado.
      if (UID === uid && scene._graveRequestGeneration === generation && generation === sequence && cache.uid === uid) cache.enabled = false;
      throw e;
    }
    cache = next;
    if (!next.enabled) return false;
    if (typeof scene.dibujarCuerpo === "function") {
      removeMarkers(scene);
      // No se mezclan espejos propios antiguos con cabeceras canónicas compartidas.
      for (const c of (GF.forestCuerpos || []).slice()) if (enrolled() && c.mia && !c.graveId && typeof scene.retirarCuerpo === "function") scene.retirarCuerpo(c);
      for (const c of next.markers) if (c.zona === zone && c.until > Date.now()) { scene.dibujarCuerpo(c); GF.forestCuerpos.push(c); }
    }
    return true;
  }
  function own() {
    const c = cache.uid === UID ? cache.markers.find(m => m.graveId === cache.ownGraveId && m.mia && m.until > Date.now()) : null;
    if (c) return {id: c.graveId, zona: c.zona, x: c.x, y: c.y, hasta: c.until, hasItems: true, mine: true};
    // Sólo las partidas aún no incorporadas al protocolo conservan su tumba privada histórica.
    const t = !enrolled() && !hasPending(UID) && typeof tumba === "function" ? tumba() : null;
    return t && !t.id && t.items.length && t.hasta > nowMs() ? {...t, mine: true, private: true} : null;
  }
  function invalidateOwn(grave) {
    if (cache.uid !== UID) return;
    const previous = cache.markers.find(m => m.mia && m.graveId === cache.ownGraveId);
    const valid = grave && uuid(grave.id) && Number.isSafeInteger(grave.revision) && grave.revision >= 1 &&
      typeof grave.zona === "string" && Number.isFinite(grave.x) && Number.isFinite(grave.y) && Number.isFinite(grave.hasta) &&
      Array.isArray(grave.items) && grave.items.length > 0 && grave.hasta - (cache.serverOffset || 0) > Date.now();
    if (!valid) {
      if (previous) previous.until = 0; // El reflejo dibujado comparte sólo esta cabecera; el próximo tick lo retira.
      cache.markers = cache.markers.filter(m => !m.mia); cache.ownGraveId = null; return;
    }
    const marker = previous && previous.graveId === grave.id ? previous : {sprite: null, drops: [], revisado: false};
    if (previous && previous !== marker) previous.until = 0;
    Object.assign(marker, {graveId: grave.id, ownerName: previous?.ownerName || (typeof NICK === "string" ? NICK.trim().slice(0, 80) : ""),
      zona: grave.zona, x: grave.x, y: grave.y, until: grave.hasta - (cache.serverOffset || 0), revision: grave.revision,
      mia: true});
    cache.markers = cache.markers.filter(m => !m.mia); cache.markers.push(marker); cache.ownGraveId = grave.id;
  }
  function hideRecovery(scene, resume = false) {
    if (scene?._graveRecovery) scene._graveRecovery.remove();
    if (scene?._graveRecoveryInert) scene._graveRecoveryInert.forEach(([el, inert]) => { el.inert = inert; });
    if (scene) scene._graveRecovery = null;
    if (scene) scene._graveRecoveryInert = null;
    if (resume && scene?._graveRecoveryResume) scene._graveRecoveryResume();
    if (scene) scene._graveRecoveryResume = null;
    if (scene) scene._graveRecoveryUid = null;
    recoveryScenes.delete(scene);
  }
  function showRecovery(scene, message) {
    if (!scene || !document.body) return;
    const heldResume = scene._graveRecoveryResume;
    hideRecovery(scene);
    scene._graveRecoveryResume = heldResume || pause(scene);
    const uid = UID, root = document.createElement("div");
    const isClaim = (pending(uid)?.calavera.action || (pending(uid) ? "recoger" : "morir")) === "recoger";
    root.setAttribute("role", "alertdialog"); root.setAttribute("aria-label", isClaim ? "Recogida pendiente" : "Regreso pendiente");
    root.setAttribute("aria-modal", "true");
    root.style.cssText = "position:fixed;inset:0;z-index:2147483640;display:grid;place-content:center;gap:12px;padding:24px;background:#161b25ed;color:#fff0ce;font:16px/1.4 system-ui;text-align:center";
    const title = document.createElement("strong"), text = document.createElement("span"), button = document.createElement("button");
    title.textContent = isClaim ? "Recogida pendiente" : "Regreso pendiente";
    text.textContent = message || "Tu progreso se conserva. Confirmá el regreso para continuar.";
    text.style.cssText = "max-width:400px";
    button.textContent = isClaim ? "Comprobar recogida" : hasPending(uid) ? "Comprobar regreso" : "Confirmar regreso";
    button.style.cssText = "padding:10px 18px;font:700 16px system-ui;cursor:pointer";
    root.appendChild(title); root.appendChild(text); root.appendChild(button);
    const diagnosticButton = document.createElement("button");
    diagnosticButton.textContent = "Descargar informe para Suren";
    diagnosticButton.style.cssText = "padding:8px 14px;font:14px system-ui;cursor:pointer";
    diagnosticButton.onclick = () => { if (UID === uid && scene._graveRecovery === root && !downloadDiagnostic()) diagnosticButton.textContent = "Reintentar descarga del informe"; };
    root.appendChild(diagnosticButton);
    scene._graveRecoveryInert = Array.from(document.body.children).map(el => [el, el.inert]);
    scene._graveRecoveryInert.forEach(([el]) => { el.inert = true; });
    document.body.appendChild(root);
    scene._graveRecovery = root;
    scene._graveRecoveryUid = uid;
    recoveryScenes.add(scene);
    if (typeof button.focus === "function") button.focus();
    button.onclick = async () => {
      if (button.disabled || scene._graveRecovery !== root || scene._graveRecoveryUid !== uid || !sceneAvailable(scene)) return;
      button.disabled = true;
      try {
        if (UID !== uid) throw Error("La cuenta cambió. Volvé a abrir la partida correcta.");
        if (hasPending(uid)) {
          const r = await reconcile(scene);
          if (!r) throw Error("El recibo necesita revisión; se conserva tu progreso.");
          if (r.cancelado) showRecovery(scene, "El regreso no se había confirmado. Podés confirmarlo ahora sin repetir ninguna recogida.");
        } else if (typeof scene.iniciarMuerteCompartida === "function") {
          // Una cuenta aún no incorporada necesita estado verificado. Si la lectura inicial
          // falló, este mismo botón la reintenta, sin crear ni repetir un UUID de muerte.
          if (!deathUsesServer()) await load(scene);
          if (UID !== uid || scene._graveRecovery !== root || !sceneAvailable(scene)) return;
          if (!deathUsesServer()) throw Error("No se pudo habilitar el regreso en el servidor. Tu progreso se conserva; volvé a intentar confirmarlo.");
          const r = await scene.iniciarMuerteCompartida(true);
          if (!r) throw Error("El regreso no se confirmó. Tu progreso se conserva; volvé a intentar confirmarlo.");
        }
        else throw Error("Volvé a abrir la Zona Negra para confirmar este regreso.");
      } catch (e) { if (UID === uid && scene._graveRecovery === root && sceneAvailable(scene)) showRecovery(scene, e.message); }
      finally { button.disabled = false; }
    };
  }
  function clear(scene) { scene._graveRequestGeneration = ++sequence; hideRecovery(scene); }
  function reset() { ++sequence; activeUid = null; diagnostics.clear(); for (const scene of [...recoveryScenes]) hideRecovery(scene); cache = {uid: null, enabled: false, markers: [], ownGraveId: null}; }
  async function perform(action, payload, scene) {
    const uid = session();
    if (MERCADO_EN_CURSO || hasPending(uid) || mercadoPendiente(uid) || SAVE_CONFLICTOS.has(uid)) throw Error("Hay otra operación pendiente. Comprobá su recibo o revisá el guardado antes de continuar.");
    ++sequence; // Ninguna cabecera solicitada antes de esta operación puede reinstalar un reflejo viejo.
    const resume = pause(scene), unlock = mercadoBloquearPantalla(action === "morir" ? "Confirmando la derrota y conservando tus pertenencias…" : "Confirmando la recogida en el servidor…");
    if (scene?.hero && typeof zonaGuardarPos === "function") zonaGuardarPos(scene.hero.x, scene.hero.y);
    const confirmed = SAVE_CONFIRMACIONES.get(uid) || 0, flush = saveFarm(true);
    activeUid = uid;
    let recoveryError = null;
    MERCADO_EN_CURSO = (async () => {
      let sent = false;
      try {
        await conTope(flush, 15000, "guardado previo a recoger");
        if (UID !== uid || SAVE_CONFLICTOS.has(uid) || guardadoTienePendiente(uid) || (SAVE_CONFIRMACIONES.get(uid) || 0) <= confirmed || !SAVE_BASES.get(uid)) throw Error("No se confirmó el guardado. No se recogió la calavera.");
        const beforeSnapshot = JSON.parse(JSON.stringify(snapshot()));
        const p = {cuenta: uid, op: window.crypto.randomUUID(), createdAt: Date.now(), base: SAVE_BASES.get(uid), beforeSnapshot, beforeKey: snapKey(beforeSnapshot), calavera: {action, ...payload}};
        markPending(uid, p); // Si el recibo no puede persistirse, no se envía la mutación.
        sent = true;
        const r = await invoke({accion: action, cuenta: uid, op: p.op, base: p.base, ...payload});
        acknowledge(uid, p, r);
        return r;
      } catch (e) {
        if (sent && pending(uid)) {
          // Incluso un rechazo se sella consultando el mismo UUID antes de liberar la operación.
          SAVE_CONFLICTOS.add(uid); recoveryError = e;
        }
        throw e;
      }
    })().finally(() => {
      MERCADO_EN_CURSO = null; if (activeUid === uid) activeUid = null; unlock();
      if (recoveryError && UID === uid && scene) { scene._graveRecoveryResume ||= resume; showRecovery(scene, recoveryError.message); }
      else resume();
    });
    const result = await MERCADO_EN_CURSO;
    if (action === "recoger" && UID === uid) try { await load(scene); } catch { if (typeof toast === "function") toast("Recogida confirmada. Actualizá la vista de calaveras cuando vuelva la conexión."); }
    return result;
  }
  async function claim(c, scene) {
    const uid = session();
    if (!cache.enabled || cache.uid !== uid || !c || !uuid(c.graveId) || !Number.isSafeInteger(c.revision) || c.revision < 1) throw Error("Actualizá las calaveras antes de recoger.");
    return perform("recoger", {id: c.graveId, revision: c.revision}, scene);
  }
  async function die(scene) {
    session();
    if (!deathUsesServer()) throw Error("La partida todavía conserva el protocolo privado de derrota.");
    if (!(G.hp <= 0)) throw Error("La derrota ya no está pendiente.");
    return perform("morir", {}, scene);
  }
  async function reconcile(scene) {
    const uid = session(true), p = pending(uid);
    if (!p) return null;
    if (MERCADO_EN_CURSO) throw Error("Espera a que termine la operación en curso.");
    const resume = pause(scene), unlock = mercadoBloquearPantalla("Comprobando el mismo recibo de calavera…");
    activeUid = uid;
    let recoveryError = null;
    MERCADO_EN_CURSO = (async () => {
      try {
        if (SAVE_EN_CURSO) await SAVE_EN_CURSO;
        if (UID !== uid) throw Error("La cuenta cambió.");
        backup(uid, p);
        const tipo = p.calavera.action || "recoger";
        const r = await invoke({accion: "comprobar", tipo, cuenta: uid, ...(tipo === "recoger" ? {id: p.calavera.id, revision: p.calavera.revision} : {}), op: p.op});
        acknowledge(uid, p, r); return r;
      } catch (e) { SAVE_CONFLICTOS.add(uid); recoveryError = e; throw e; }
    })().finally(() => {
      MERCADO_EN_CURSO = null; if (activeUid === uid) activeUid = null; unlock();
      if (recoveryError && UID === uid && scene) { scene._graveRecoveryResume ||= resume; showRecovery(scene, recoveryError.message); }
      else resume();
    });
    const result = await MERCADO_EN_CURSO;
    if ((p.calavera.action || "recoger") === "morir") {
      if (!result.cancelado && UID === uid) {
        if (scene && typeof scene.finalizarMuerteCompartida === "function") scene.finalizarMuerteCompartida(result);
        else {
          hideRecovery(scene, true);
          if (result.receipt?.viajeResumen && typeof mostrarResumenZona === "function") mostrarResumenZona(result.receipt.viajeResumen);
        }
      } else if (scene && result.cancelado) scene._graveDeathPending = false;
      return result;
    }
    hideRecovery(scene, true);
    if (UID === uid) try { await load(scene); } catch { if (typeof toast === "function") toast("Recibo confirmado. Actualizá la vista de calaveras cuando vuelva la conexión."); } return result;
  }
  window.GoldenGraves = {usesServer, deathUsesServer, enrolled, busy, enabled: () => usesServer() && cache.uid === UID && cache.enabled, pending, hasPending, load, clear, reset, claim, die, reconcile, own, invalidateOwn, showRecovery, hideRecovery, diagnosticReport, downloadDiagnostic};
})();
