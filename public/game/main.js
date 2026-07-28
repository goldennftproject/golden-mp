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

document.getElementById("enter").addEventListener("click", () => {
  const v = document.getElementById("nick").value.trim();
  window.NICK = v || "Granjero";
  document.getElementById("gate").style.display = "none";
  startGame();
});
document.getElementById("nick").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("enter").click();
});
