const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('public/index.html','utf8'),audio=fs.readFileSync('public/game/audio.js','utf8'),ui=fs.readFileSync('public/game/ui.js','utf8');
function create(saved='1'){
 const w=new JSDOM(html,{url:'https://goldenfarm.onrender.com',runScripts:'outside-only'}).window;w.localStorage.setItem('gf_sound',saved);
 let voices=0;const scheduled=[];w.setTimeout=fn=>scheduled.push(fn);
 w.AudioContext=class{constructor(){this.currentTime=0;this.state='running';this.destination={};}createOscillator(){voices++;return{type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return{connect(){}}},start(){},stop(){}};}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}};}};
 w.eval(audio);w.eval(ui.slice(0,ui.indexOf('function setTxt(')));w.syncSonidoBotones();w.document.getElementById('hud-sound').onclick=w.alternarSonido;w.document.getElementById('cfg-sound').onclick=w.alternarSonido;
 return{w,scheduled,voices:()=>voices};
}
let e=create(),w=e.w,hud=w.document.getElementById('hud-sound'),cfg=w.document.getElementById('cfg-sound');assert(hud.closest('#hudbar'));assert.equal(hud.getAttribute('aria-pressed'),'true');
w.sfx('coin');assert.equal(e.voices(),1);hud.click();assert.equal(w.sfxIsOn(),false);assert.equal(w.localStorage.getItem('gf_sound'),'0');assert.equal(cfg.textContent,'Sonido: Desactivado');assert(hud.classList.contains('sound-muted'));e.scheduled.forEach(f=>f());assert.equal(e.voices(),1,'silenciar también cancela notas diferidas');
e=create(w.localStorage.getItem('gf_sound'));w=e.w;hud=w.document.getElementById('hud-sound');cfg=w.document.getElementById('cfg-sound');assert.equal(w.sfxIsOn(),false);assert.equal(hud.title,'Activar sonido');assert.equal(hud.getAttribute('aria-pressed'),'false');cfg.click();assert.equal(w.sfxIsOn(),true);assert.equal(hud.title,'Silenciar sonido');assert.equal(hud.getAttribute('aria-pressed'),'true');assert.equal(w.localStorage.getItem('gf_sound'),'1');assert.equal(e.voices(),1,'al activar sólo suena confirmación de clic');
console.log('OK: botón en HUD, configuración sincronizada, preferencia tras recarga, estado accesible y sonidos diferidos silenciados.');
