'use strict';
// Lee el CSS/JS reales; no copia las reglas que verifica. Sin navegador, red, Auth o partidas.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
// En el repo: node tools/test-visual-windows.js. Fuera: node test-visual-windows.js <repo>.
const REPO=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {JSDOM}=require(path.join(REPO,'node_modules/jsdom'));
const html=fs.readFileSync(path.join(REPO,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(REPO,'public/game/visual-v2.css'),'utf8');
const js=fs.readFileSync(path.join(REPO,'public/game/visual-v2.js'),'utf8');
const dom=new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,doc=w.document;
w.innerWidth=1200;w.innerHeight=800;
const outcomes=[];
function check(name,fn){try{fn();outcomes.push({name,ok:true});}catch(e){outcomes.push({name,ok:false,error:e.message});}}
function mediaMatches(condition){
 for(const match of condition.matchAll(/(min|max)-(width|height)\s*:\s*([\d.]+)px/g)){
  const actual=match[2]==='width'?1200:800,n=Number(match[3]);
  if(match[1]==='min'?actual<n:actual>n)return false;
 }
 if(/prefers-reduced-motion\s*:\s*reduce/.test(condition))return false;
 return true;
}
// JSDOM no evalúa media queries. CSSOM parsea las hojas reales y se conservan,
// en el mismo orden, sólo las reglas aplicables a 1200x800, desenvolviendo @media.
function splitSelectors(text){
 const out=[];let depth=0,start=0,quote='';
 for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&depth===0){out.push(text.slice(start,i));start=i+1;}}
 out.push(text.slice(start));return out;
}
function flattenRealCss(text){
 const probe=doc.createElement('style');probe.textContent=text;doc.head.append(probe);
 const walk=rules=>Array.from(rules).flatMap(rule=>{
  if(rule.type===4)return mediaMatches(rule.conditionText||rule.media.mediaText)?walk(rule.cssRules):[];
  // JSDOM aplica erróneamente a toda una lista la especificidad del selector más fuerte.
  // Separarla es una transformación semánticamente equivalente; declaraciones/orden son reales.
  if(rule.type===1)return splitSelectors(rule.selectorText).map(selector=>selector+'{'+rule.style.cssText+'}');
  return[rule.cssText];
 });
 const flat=walk(probe.sheet.cssRules).join('\n');probe.remove();return flat;
}
const baseStyles=Array.from(doc.querySelectorAll('style')).map(s=>s.textContent);
doc.querySelectorAll('style,link[rel="stylesheet"]').forEach(n=>n.remove());
const normalized=baseStyles.map(flattenRealCss).concat(flattenRealCss(css)).join('\n');
const style=doc.createElement('style');style.textContent=normalized;doc.head.append(style);
const confirmCard=doc.querySelector('#ov-confirm>.card');
const ghost=doc.getElementById('cf-no'),red=doc.getElementById('cf-yes');
ghost.textContent='Cancelar';red.className='red';red.textContent='Tirar';
const gold=doc.createElement('button');gold.className='gold';gold.textContent='Mejorar';confirmCard.append(gold);
const disabled=doc.createElement('button');disabled.className='ghost';disabled.disabled=true;disabled.textContent='No disponible';confirmCard.append(disabled);
const disabledRed=doc.getElementById('cfg-salir');disabledRed.disabled=true;
const disabledGold=doc.createElement('button');disabledGold.className='gold';disabledGold.disabled=true;disabledGold.textContent='No disponible';confirmCard.append(disabledGold);
const ranking=doc.getElementById('lb-list');ranking.innerHTML='<div class="lbrow"><span class="nm">Otra granja</span></div><div class="lbrow me"><span class="nm">Tu granja</span></div>';
w.G={level:8,golden:12,seeds:{papa:1}};const stateBefore=JSON.stringify(w.G);
w.eval(js);
function rgb(value){
 const m=value.match(/^rgba?\(([^)]+)\)$/);if(m)return m[1].split(/[ ,/]+/).filter(Boolean).slice(0,3).map(Number);
 const hex=value.replace('#','');if(/^[0-9a-f]{6}$/i.test(hex))return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
 if(/^[0-9a-f]{3}$/i.test(hex))return hex.split('').map(x=>parseInt(x+x,16));
 throw Error('Color no resuelto por JSDOM: '+value);
}
function luminance(v){return rgb(v).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const l=[luminance(a),luminance(b)].sort((x,y)=>x-y);return(l[1]+.05)/(l[0]+.05);}
function backgrounds(el){
 const c=w.getComputedStyle(el),image=c.backgroundImage;
 const stops=image&&image!=='none'?image.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi):null;
 if(stops?.length)return stops;
 if(c.backgroundColor!=='rgba(0, 0, 0, 0)'&&c.backgroundColor!=='transparent')return[c.backgroundColor];
 if(el.parentElement)return backgrounds(el.parentElement);
 throw Error('No hay fondo sólido computable');
}
function readable(el,label){const color=w.getComputedStyle(el).color;for(const bg of backgrounds(el)){const n=contrast(color,bg);assert(n>=4.5,label+' contraste '+n.toFixed(2)+' con '+color+' / '+bg);}}
check('Renovado activa la clase a 1200 px',()=>assert(doc.documentElement.classList.contains('visual-v2')));
check('Ghost conserva texto legible sobre fondo claro',()=>readable(ghost,'ghost'));
check('Ghost deshabilitado sigue siendo legible',()=>readable(disabled,'disabled ghost'));
check('Destructivo deshabilitado sigue siendo legible',()=>readable(disabledRed,'disabled red'));
check('Golden deshabilitado sigue siendo legible',()=>readable(disabledGold,'disabled gold'));
check('Configuración: encabezado legible',()=>readable(doc.querySelector('#ov-config .cfgsec h4'),'cfg h4'));
check('Configuración: párrafo legible',()=>readable(doc.querySelector('#ov-config .cfgsec p'),'cfg p'));
check('Botón destructivo mantiene fondo rojo y contraste',()=>{const stops=backgrounds(red);for(const s of stops){const [r,g,b]=rgb(s);assert(r>g*1.5&&r>b*1.5,'destructivo no tiene fondo rojo: '+s);}readable(red,'red');});
check('Botón Golden mantiene fondo dorado y texto legible',()=>{for(const s of backgrounds(gold)){const [r,g,b]=rgb(s);assert(r>g&&g>b*1.5,'gold no tiene fondo dorado: '+s);}readable(gold,'gold');});
check('Ranking distingue la fila propia sin texto ilegible',()=>{const other=ranking.querySelector('.lbrow:not(.me)'),me=ranking.querySelector('.me');assert.notEqual(w.getComputedStyle(other).backgroundColor,w.getComputedStyle(me).backgroundColor);assert.notEqual(w.getComputedStyle(other).borderTopColor,w.getComputedStyle(me).borderTopColor);readable(me.querySelector('.nm'),'ranking me');});
check('Mercado dock usa coordenadas de viewport',()=>assert(['fixed','absolute'].includes(w.getComputedStyle(doc.querySelector('#ov-market>.card')).position)));
const marketOv=doc.getElementById('ov-market'),marketCard=marketOv.querySelector('.card');
Object.defineProperty(marketCard,'offsetWidth',{configurable:true,get:()=>doc.documentElement.classList.contains('visual-v2')?470:520});
Object.defineProperty(marketCard,'offsetHeight',{configurable:true,get:()=>doc.documentElement.classList.contains('visual-v2')?640:550});
marketOv.classList.add('show');marketCard.classList.add('movida');marketCard.style.left='1100px';marketCard.style.top='700px';marketCard.style.transform='none';
const fixed=doc.querySelector('#ov-vip>.card');const fixedBefore=fixed.style.cssText;
w.GoldenVisual.setEnabled(false);
check('Alternar Clásico reencaja la tarjeta movida sin reiniciar',()=>{assert.equal(marketCard.style.left,'676px');assert.equal(marketCard.style.top,'246px');assert.equal(JSON.stringify(w.G),stateBefore);});
w.innerWidth=1033;w.innerHeight=700;w.GoldenVisual.setEnabled(true);
check('Alternar Renovado conserva el drag y reencaja nuevo tamaño',()=>{assert.equal(marketCard.style.left,'559px');assert.equal(marketCard.style.top,'56px');assert.equal(marketCard.style.transform,'none');});
check('No se fuerzan coordenadas de tarjetas nunca arrastradas',()=>assert.equal(fixed.style.cssText,fixedBefore));
const invOv=doc.getElementById('ov-inv'),inv=invOv.querySelector('.card');
Object.defineProperty(inv,'offsetWidth',{configurable:true,get:()=>432});Object.defineProperty(inv,'offsetHeight',{configurable:true,get:()=>500});
inv.classList.add('movida');inv.style.left='1190px';inv.style.top='790px';inv.style.transform='none';
w.GoldenVisual.setEnabled(false);
check('Una tarjeta oculta no recibe dimensiones ficticias',()=>{assert.equal(inv.style.left,'1190px');assert.equal(inv.style.top,'790px');});
invOv.classList.add('show');
(async()=>{
 await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));
 check('Abrir una tarjeta que estaba oculta aplica el clamp pendiente',()=>{assert.equal(inv.style.left,'597px');assert.equal(inv.style.top,'196px');});
 check('Cambios visuales conservan el estado de juego',()=>assert.equal(JSON.stringify(w.G),stateBefore));
 console.log(JSON.stringify({viewportCss:'1200x800',checks:outcomes,limitations:['JSDOM no pinta ni calcula layout: sólo se desenvuelven @media reales para el viewport indicado.','JSDOM calcula mal la especificidad en listas de selectores: se separan en reglas individuales equivalentes, sin modificar declaraciones.','Las medidas de tarjetas arrastradas usan stubs; animaciones, hit-testing y coordenadas reales necesitan navegador.','No se verifican efectos de mix-blend-mode ni gradientes renderizados: el contraste compara sus stops de color reales.']},null,2));
 const failed=outcomes.filter(x=>!x.ok).length;
 w.close();if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
