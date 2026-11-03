const assert=require('node:assert/strict'),fs=require('node:fs');
const {cycleAt,CYCLE_MS}=require('../public/game/lighting');
const frames=[0,.4,.52,.6,.72,.86,.94,1];
for(const t of frames){const a=cycleAt(t*CYCLE_MS),b=cycleAt((t+1)*CYCLE_MS);for(let c=0;c<3;c++)assert(Math.abs(a.rgb[c]-b.rgb[c])<1e-9);const l=cycleAt(t*CYCLE_MS-1),r=cycleAt(t*CYCLE_MS+1);for(let c=0;c<3;c++)assert(Math.abs(l.rgb[c]-r.rgb[c])<.00001,'sin salto en limites');}
assert.equal(cycleAt(0).name,'Día');assert.equal(cycleAt(.56*CYCLE_MS).name,'Atardecer');assert.equal(cycleAt(.8*CYCLE_MS).name,'Noche');assert.equal(cycleAt(.95*CYCLE_MS).name,'Amanecer');
for(let t=0;t<CYCLE_MS;t+=997){const v=cycleAt(t);assert(v.phase>=0&&v.phase<1);assert(v.rgb.every(x=>Number.isFinite(x)&&x>=.62&&x<=1));}
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="game"><canvas></canvas></div><div id="hud">Plata 3</div><button id="cfg-relief"></button><button id="cfg-day-cycle"></button>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window;
let tick;w.setInterval=fn=>{tick=fn;};w.Date.now=()=>.8*CYCLE_MS;w.eval(fs.readFileSync('public/game/lighting.js','utf8'));
const game=w.document.getElementById('game'),button=w.document.getElementById('cfg-day-cycle');
assert.match(button.textContent,/Noche/);assert.equal(game.style.getPropertyValue('--gf-day-color'),'rgb(158,179,219)');
button.click();assert.match(button.textContent,/Día fijo/);assert.equal(game.style.getPropertyValue('--gf-day-opacity'),'0');assert.equal(w.localStorage.getItem('gf_day_cycle_v1'),'off');
button.click();assert.match(button.textContent,/Noche/);
w.GoldenLighting.setEnabled(false);assert.equal(game.style.getPropertyValue('--gf-day-opacity'),'0');assert(button.disabled);
w.GoldenLighting.setEnabled(true);assert(!button.disabled);assert.match(button.textContent,/Noche/);
w.Date.now=()=>0;tick();assert.match(button.textContent,/Día/);assert.equal(w.document.getElementById('hud').textContent,'Plata 3');
console.log('OK: ciclo periodico, transiciones continuas, noche legible, preferencia, Original, HUD y regreso tras inactividad');
