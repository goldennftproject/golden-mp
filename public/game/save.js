/* Golden Farm · persistencia por cuenta (login anónimo de Supabase) */
const SB_URL = "https://eusxpsmqczmczgyhndtd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3hwc21xY3ptY3pneWhuZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzU2OTMsImV4cCI6MjEwMDc1MTY5M30.ko-XxFFjf_YnBsnBvrSCOsMLTQ285G51r-UPLYZIDJ8";

let sb = null, UID = null, saveTimer = null, lastSavedKey = null;

async function initSave() {
  try {
    if (!window.supabase || !window.supabase.createClient) return false;
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) { console.warn("Login anónimo falló (¿está habilitado en Supabase?):", error.message); return false; }
      session = data.session;
    }
    UID = session.user.id;
    return true;
  } catch (e) { console.warn("initSave error:", e); return false; }
}

// campos de progreso que guardamos (no world/cooldowns/buffs, que son de la sesión)
function snapshot() {
  return { plata: G.plata, golden: G.golden, level: G.level, prestige: G.prestige, week: G.week,
    res: G.res, picks: G.picks, skills: G.skills, fish: G.fish, plots: G.plots, seeds: G.seeds, selSeed: G.selSeed,
    tools: G.tools, invRows: G.invRows, slots: G.slots, hotbar: G.hotbar, hotSel: G.hotSel, hbInit: G.hbInit, layout: G.layout,
    daily: G.daily };
}
// "huella" del estado guardable (incluye el apodo); si no cambia, no hay nada que guardar
function snapKey() { return JSON.stringify({ n: (window.NICK || "Granjero"), d: snapshot() }); }

function hydrate(d) {
  if (!d) return;
  ["plata", "golden", "level", "prestige", "week"].forEach(k => { if (typeof d[k] === "number") G[k] = d[k]; });
  if (d.res) G.res = Object.assign({}, G.res, d.res);
  if (d.skills) G.skills = Object.assign({}, G.skills, d.skills);
  if (d.fish) G.fish = Object.assign({}, G.fish, d.fish);
  if (Array.isArray(d.plots)) G.plots = d.plots;
  if (d.seeds) G.seeds = Object.assign({}, G.seeds, d.seeds);
  if (d.selSeed && CROP_DEF[d.selSeed]) G.selSeed = d.selSeed;
  if (d.tools) G.tools = Object.assign({}, G.tools, d.tools);
  if (typeof d.invRows === "number") G.invRows = Math.max(0, Math.min(INV_MAX_ROWS, d.invRows));
  if (Array.isArray(d.slots)) G.slots = d.slots;
  if (Array.isArray(d.hotbar)) G.hotbar = d.hotbar.slice(0, 10);
  if (typeof d.hotSel === "number") G.hotSel = Math.max(0, Math.min(9, d.hotSel));
  if (typeof d.hbInit === "boolean") G.hbInit = d.hbInit;
  if (d.layout && typeof d.layout === "object") G.layout = d.layout;
  if (d.daily && typeof d.daily === "object") G.daily = { day: d.daily.day || 0, last: d.daily.last || "" };
  if (d.picks && d.picks.owned && d.picks.dur) G.picks = d.picks;
}

async function loadFarm() {
  if (!sb || !UID) return false;
  try {
    const { data, error } = await sb.from("farms").select("data,name").eq("user_id", UID).maybeSingle();
    if (error) { console.warn("loadFarm:", error.message); return false; }
    if (data) {
      if (data.data) hydrate(data.data);
      if (data.name && !window.NICK) window.NICK = data.name;  // si no tipeaste apodo, usá el guardado
      lastSavedKey = snapKey();   // referencia: lo que acabás de cargar ya está guardado
      return true;
    }
    // primera vez: crear la fila
    await saveFarm();
    return false;
  } catch (e) { console.warn("loadFarm error:", e); return false; }
}

// force=true guarda siempre; sin force, solo si el progreso cambió desde el último guardado
async function saveFarm(force) {
  if (!sb || !UID) return;
  const key = snapKey();
  if (!force && key === lastSavedKey) return;   // nada que guardar: ni siquiera muestra el indicador
  if (typeof showSaving === "function") showSaving();
  try {
    await sb.from("farms").upsert({ user_id: UID, name: (window.NICK || "Granjero"), data: snapshot(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    lastSavedKey = key;   // recién ahora quedó persistido
    if (typeof showSaved === "function") showSaved();
  } catch (e) { /* silencioso: no actualizamos lastSavedKey, reintenta en el próximo ciclo */ }
}

// ---- ranking real (lee la vista pública "leaderboard") ----
async function fetchLeaderboard() {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("leaderboard")
      .select("user_id,name,plata,skills,level,prestige")
      .limit(200);
    if (error) { console.warn("leaderboard:", error.message); return null; }
    return data || [];
  } catch (e) { console.warn("leaderboard err:", e); return null; }
}

// ---- chat global (Supabase Realtime broadcast) ----
let chatChannel = null;
function initChat(onMsg) {
  if (!sb || chatChannel) return;
  chatChannel = sb.channel("global-chat", { config: { broadcast: { self: true } } });
  chatChannel.on("broadcast", { event: "msg" }, ({ payload }) => { try { onMsg(payload); } catch (e) {} });
  chatChannel.subscribe();
}
function sendChat(text) {
  if (!chatChannel || !text) return;
  chatChannel.send({ type: "broadcast", event: "msg", payload: { name: (window.NICK || "Granjero"), text: String(text).slice(0, 140), t: Date.now() } });
}

function startAutosave() {
  if (saveTimer) return;
  saveTimer = setInterval(() => { saveFarm(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveFarm(); });
  window.addEventListener("beforeunload", () => { saveFarm(); });
}

// arranca la sesión en segundo plano; main.js espera esta promesa
window.SAVE_READY = initSave();
