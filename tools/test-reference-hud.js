'use strict';
// The real HUD nodes, original ui.js-rendered values and original actions survive the visual layer.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),source=fs.readFileSync(path.join(root,'public/game/reference-hud.js'),'utf8'),css=fs.readFileSync(path.join(root,'public/game/reference-hud.css'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window,d=w.document;
w.innerWidth=1672;w.innerHeight=948;
const hud=d.getElementById('hudbar'),ids=new Map([...hud.querySelectorAll('[id]')].map(e=>[e.id,e]));
const original=hud.innerHTML,state={level:3,plata:153,golden:12,hp:100,energy:37};w.G=state;const before=JSON.stringify(state);
const originalLogos=new Map([...d.querySelectorAll('.gf-logo')].map(img=>[img,{src:img.getAttribute('src'),alt:img.alt,width:img.getAttribute('width'),height:img.getAttribute('height')}]));
let energyClicks=0,farmClicks=0,menuClicks=0;
d.getElementById('energia-granja-pill').onclick=()=>energyClicks++;
d.getElementById('lvlpill').onclick=()=>farmClicks++;
d.getElementById('menu-btn').onclick=()=>menuClicks++;
const actions=[d.getElementById('energia-granja-pill').onclick,d.getElementById('lvlpill').onclick,d.getElementById('menu-btn').onclick];
d.documentElement.classList.add('visual-v2');w.eval(source);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function computedHudAt(width){
 const probe=new JSDOM(html),doc=probe.window.document;
 const inputs=[...doc.querySelectorAll('style')].map(el=>el.textContent).concat(fs.readFileSync(path.join(root,'public/game/visual-v2.css'),'utf8'),css);
 doc.querySelectorAll('style,link[rel="stylesheet"]').forEach(el=>el.remove());
 const matches=condition=>{if(/prefers-reduced-motion/.test(condition))return false;for(const m of condition.matchAll(/(min|max)-width\s*:\s*(\d+)px/g)){if(m[1]==='min'?width<+m[2]:width>+m[2])return false;}return true;};
 const flat=[];for(const input of inputs){const style=doc.createElement('style');style.textContent=input;doc.head.append(style);const walk=rules=>{for(const r of rules)if(r.type===4){if(matches(r.conditionText))walk(r.cssRules);}else flat.push(r.cssText);};walk(style.sheet.cssRules);style.remove();}
 const applied=doc.createElement('style');applied.textContent=flat.join('\n');doc.head.append(applied);doc.documentElement.classList.add('visual-v2');doc.getElementById('hudbar').classList.add('reference-hud');
 const get=id=>probe.window.getComputedStyle(doc.getElementById(id));
 const result={levelMargin:get('lvlpill').marginLeft,soundMargin:get('hud-sound').marginLeft,farmBar:probe.window.getComputedStyle(doc.querySelector('#lvlpill .cbarw')).display,combatBar:probe.window.getComputedStyle(doc.querySelector('#cbar .cbarw')).display,energyBar:probe.window.getComputedStyle(doc.querySelector('#energia-granja-pill .cbarw')).display,healthBar:probe.window.getComputedStyle(doc.querySelector('#hppill .hpbarw')).display,goldenWheat:probe.window.getComputedStyle(doc.querySelector('.divisa-hud:has(#s-golden) .ric')).visibility,xpSize:get('lvl-txt').fontSize,minHeight:get('hudbar').minHeight};probe.window.close();return result;
}
(async()=>{
 assert(hud.classList.contains('reference-hud'),'PC Renovado enables the reference layout');
 assert.equal(hud.querySelectorAll('.refhud-icon').length,6,'six clear decorative identifiers including Golden coin');
 for(const [img,old]of originalLogos){assert.equal(img.getAttribute('src'),'assets/visual-v2/skin/logo-stacked.png?v=4','HUD and preload share the reference logo');assert.equal(img.alt,old.alt);assert.equal(img.getAttribute('width'),old.width);assert.equal(img.getAttribute('height'),old.height);}
 for(const [id,node]of ids)assert.equal(d.getElementById(id),node,'original ID/node '+id);
 assert.equal(hud.querySelectorAll('.refhud-icon:not([aria-hidden="true"])').length,0,'icons do not pollute accessible labels');
 assert.equal(d.querySelector('#energia-granja-pill .refhud-label').textContent,'Energía');
 assert.equal(d.querySelector('#stampill .refhud-label').textContent,'Estamina');
 assert(d.querySelector('.divisa-hud:has(#s-golden) .refhud-gold-coin svg'),'Golden uses a gold star coin in Renovado');assert.equal(d.querySelector('.divisa-hud:has(#s-golden) .ric').getAttribute('src'),'assets/farm/coin_esencia.png?a=4','classic currency image stays untouched');
 for(let i=0;i<3;i++)w.GoldenReferenceHUD.refresh();assert.equal(hud.querySelectorAll('.refhud-icon').length,6,'no duplicates');
 d.getElementById('energia-granja-pill').click();d.getElementById('lvlpill').click();d.getElementById('menu-btn').click();assert.deepEqual([energyClicks,farmClicks,menuClicks],[1,1,1]);
 assert.equal(JSON.stringify(w.G),before,'no game-state writes');
 const eta=d.getElementById('energia-granja-eta');eta.hidden=false;eta.textContent='+1 04:36';d.getElementById('lvl-txt').textContent='420/600';d.getElementById('c-xp').textContent='4/21';d.getElementById('s-plata').textContent='123456789';await tick();
 assert.equal(eta.textContent,'+1 04:36','timer belongs to the existing renderer');assert(!eta.hidden);assert.equal(d.getElementById('lvl-txt').textContent,'420/600');assert.equal(d.getElementById('c-xp').textContent,'4/21');assert(d.getElementById('s-plata').closest('.pill').classList.contains('refhud-long'));
 const added=d.createElement('span');added.textContent='Tick';hud.append(added);await tick();added.remove();await tick();assert.equal(hud.querySelectorAll('.refhud-icon').length,6);
 d.documentElement.classList.remove('visual-v2');await tick();assert(!hud.classList.contains('reference-hud'));assert.equal(hud.querySelectorAll('.refhud-icon,.refhud-label').length,0);assert.equal(hud.querySelectorAll('.refhud-long').length,0);
 for(const [img,old]of originalLogos)assert.equal(img.getAttribute('src'),old.src,'Clásico restores each original logo URL');
 const expected=d.createElement('div');expected.innerHTML=original;expected.querySelector('#energia-granja-eta').hidden=false;expected.querySelector('#energia-granja-eta').textContent='+1 04:36';expected.querySelector('#lvl-txt').textContent='420/600';expected.querySelector('#c-xp').textContent='4/21';expected.querySelector('#s-plata').textContent='123456789';assert.equal(hud.innerHTML,expected.innerHTML,'Clásico restores exact original markup with live values');
 assert.equal(d.getElementById('energia-granja-pill').onclick,actions[0]);assert.equal(d.getElementById('lvlpill').onclick,actions[1]);assert.equal(d.getElementById('menu-btn').onclick,actions[2]);
 d.documentElement.classList.add('visual-v2');w.innerWidth=899;w.dispatchEvent(new w.Event('resize'));assert(!hud.classList.contains('reference-hud'));assert.equal(hud.querySelectorAll('.refhud-icon').length,0,'mobile stays unchanged');
 for(const width of [900,1346,1672]){w.innerWidth=width;w.dispatchEvent(new w.Event('resize'));assert(hud.classList.contains('reference-hud'));assert.equal(hud.querySelectorAll('.refhud-icon').length,6);}
 for(const width of [900,1346,1672]){const c=computedHudAt(width);assert.equal(c.levelMargin,'auto','left half of the centered data group at '+width);assert.equal(c.soundMargin,'auto','right half of the centered data group at '+width);assert.equal(c.farmBar,'block');assert.equal(c.combatBar,'none','combat keeps numbers, not an empty second meter');assert.equal(c.energyBar,'none','energy uses number and real countdown like the reference');assert.equal(c.healthBar,'none','life keeps the real number beside its heart');assert.equal(c.goldenWheat,'hidden','wheat icon is replaced visually, not deleted');assert.equal(c.minHeight,width>=1500?'74px':width>=1100?'66px':'56px','compact strip follows the reference aspect');if(width>=1500)assert.equal(c.xpSize,'13px','wide-screen XP remains legible');}
 d.querySelector('.gf-logo').dispatchEvent(new w.Event('error'));for(const [img,old]of originalLogos)assert.equal(img.getAttribute('src'),old.src,'a failed reference image restores the known logo in HUD and preload');w.GoldenReferenceHUD.refresh();for(const [img,old]of originalLogos)assert.equal(img.getAttribute('src'),old.src,'failed logo is not requested repeatedly');
 assert.match(css,/#lvlpill \.cbarw[^}]*display:block!important/,'farm XP bar explicitly returns');assert.match(css,/#energia-granja-eta\[hidden\]\{display:none!important/,'full-energy state does not invent a countdown');assert.match(css,/skin\/wood-frame-concept\.png/,'HUD consumes the reference-matched wood frame');
 assert.equal(JSON.stringify(w.G),before);dom.window.close();console.log('OK: reference HUD preserves original nodes/actions/live XP and energy timers, accessible labels, G, exact Clásico markup, desktop breakpoints and mobile fallback');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
