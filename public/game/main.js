/* main: puerta de apodo -> arranca Phaser con las escenas Boot -> Farm <-> Plaza */
function startGame() {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    pixelArt: true,
    render: { antialias: false, roundPixels: true },
    backgroundColor: "#243318",
    scale: {
      mode: Phaser.Scale.RESIZE,          // el canvas llena la ventana (sin bandas)
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, FarmScene, PlazaScene],
  });
}

let entered = false;
function enterGame() {
  if (entered) return; entered = true;
  if (typeof initChat === "function") initChat(renderChatMsg);
  if (typeof startAutosave === "function") startAutosave();
  if (typeof refreshHud === "function") refreshHud();
  document.getElementById("gate").style.display = "none";
  startGame();
}

// al cargar: si ya tenés cuenta + granja guardada, entrás directo (sin pedir apodo otra vez)
(async function boot() {
  let returning = false;
  try { await window.SAVE_READY; returning = await loadFarm(); } catch (e) { console.warn(e); }
  if (returning && window.NICK) enterGame();
  // si no, el portón queda visible para que el jugador nuevo elija apodo
})();

// jugador nuevo: elige apodo y entra
document.getElementById("enter").addEventListener("click", async () => {
  window.NICK = document.getElementById("nick").value.trim() || "Granjero";
  try { await window.SAVE_READY; } catch (e) {}
  if (typeof saveFarm === "function") saveFarm();   // persiste el apodo enseguida
  enterGame();
});
document.getElementById("nick").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("enter").click();
});
