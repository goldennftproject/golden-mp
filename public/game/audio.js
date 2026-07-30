/* Golden Farm · SFX procedurales con WebAudio — sin archivos externos (detalles: pilar de audio, versión básica) */
(function () {
  let ctx = null, on = true;
  try { on = localStorage.getItem("gf_sound") !== "0"; } catch (e) {}
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function env(g, t0, a, d, v) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }
  function tone(freq, type, a, d, v, slide) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + a + d);
    env(g, c.currentTime, a, d, v);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + a + d + 0.05);
  }
  function noise(d, v, fLow, fHigh) {
    const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = (fLow + fHigh) / 2; f.Q.value = 0.9;
    const g = c.createGain(); env(g, c.currentTime, 0.005, d, v);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  const S = {
    chop()    { noise(0.09, 0.45, 300, 900); tone(120, "square", 0.005, 0.08, 0.22, 60); },          // hachazo seco
    mine()    { tone(1700, "triangle", 0.002, 0.07, 0.18, 900); noise(0.05, 0.3, 2000, 5000); },      // clink de pico
    cast()    { tone(520, "sine", 0.01, 0.2, 0.14, 170); },                                           // lanzar la caña
    splash()  { noise(0.24, 0.28, 600, 2200); },                                                      // agua
    plant()   { tone(300, "sine", 0.01, 0.09, 0.18, 430); },                                          // plantar
    harvest() { tone(520, "triangle", 0.005, 0.1, 0.22, 800); },                                      // cosechar
    coin()    { tone(988, "square", 0.002, 0.09, 0.13); setTimeout(() => tone(1319, "square", 0.002, 0.12, 0.13), 60); },
    click()   { tone(700, "square", 0.001, 0.035, 0.1, 500); },                                       // abrir ventana
    eat()     { tone(260, "sine", 0.012, 0.12, 0.18, 170); },                                         // comer plato
    level()   { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.005, 0.16, 0.18), i * 90)); },
    hit()     { noise(0.07, 0.35, 150, 600); },                                                       // golpe
    trash()   { noise(0.12, 0.26, 200, 800); },                                                       // tirar a la papelera
  };
  window.sfx = function (name) { if (!on) return; try { if (S[name]) S[name](); } catch (e) {} };
  window.sfxOn = function (v) { on = !!v; try { localStorage.setItem("gf_sound", on ? "1" : "0"); } catch (e) {} };
  window.sfxIsOn = function () { return on; };
})();
