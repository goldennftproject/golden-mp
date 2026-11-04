'use strict';
// Cascada real de los componentes de contenido; sin ejecutar el juego ni acceder a cuentas.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(repo,'public/index.html'),'utf8');
function splitSelectors(text){
 const out=[];let depth=0,start=0,quote='';
 for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&depth===0){out.push(text.slice(start,i));start=i+1;}}
 out.push(text.slice(start));return out;
}
function fixture(width,height,renovado,withSystem=true){
 const dom=new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,d=w.document;
 d.documentElement.classList.toggle('visual-v2',renovado);
 const sheets=Array.from(d.querySelectorAll('style,link[rel="stylesheet"]'));
 const links=sheets.filter(n=>n.tagName==='LINK').map(n=>n.getAttribute('href').split('?')[0]);
 assert(links.includes('game/menu-system.css'),'el sistema debe cargarse desde el juego real');
 assert(links.indexOf('game/menu-system.css')>links.indexOf('game/reference-market.css'),'la hoja debe completar la cascada de referencia');
 const source=sheets.filter(n=>withSystem||!n.getAttribute('href')?.startsWith('game/menu-system.css')).map(n=>n.tagName==='STYLE'?n.textContent:fs.readFileSync(path.join(repo,'public',n.getAttribute('href').split('?')[0]),'utf8'));
 sheets.forEach(n=>n.remove());
 function matchesMedia(text){
  for(const m of text.matchAll(/(min|max)-(width|height)\s*:\s*([\d.]+)px/g)){const actual=m[2]==='width'?width:height,n=Number(m[3]);if(m[1]==='min'?actual<n:actual>n)return false;}
  return !/prefers-reduced-motion\s*:\s*reduce|pointer\s*:\s*coarse/.test(text);
 }
 function flatten(text){
  const probe=d.createElement('style');probe.textContent=text;d.head.append(probe);
  const walk=rules=>Array.from(rules).flatMap(r=>r.type===4?(matchesMedia(r.conditionText||r.media.mediaText)?walk(r.cssRules):[]):r.type===1?splitSelectors(r.selectorText).map(s=>s+'{'+r.style.cssText+'}'):[]);
  const flat=walk(probe.sheet.cssRules).join('\n');probe.remove();return flat;
 }
 const cssText=source.map(flatten).join('\n'),style=d.createElement('style');style.textContent=cssText;d.head.append(style);
 // JSDOM no resuelve var() en shorthands. Se sustituyen los tokens del tema por sus
 // valores efectivos en la raíz, leídos de las hojas reales, antes de calcular la cascada.
 const root=w.getComputedStyle(d.documentElement),tokens={};
 for(const name of cssText.match(/--(?:menu|ref)-[a-z-]+/g)||[])tokens[name]=root.getPropertyValue(name).trim();
 // Resolver antes de reparsear conserva también !important: cssstyle pierde esa
 // prioridad al serializar un color que todavía contiene var().
 style.textContent=source.map(text=>flatten(text.replace(/var\((--(?:menu|ref)-[a-z-]+)\)/g,(all,name)=>tokens[name]||all))).join('\n');
 d.getElementById('ov-market').classList.add('reference-market');
 const row=(extra='')=>'<div class="forge-row '+extra+'"><div class="fic"><img alt=""></div><div class="finfo"><div class="fnm">Mejora</div><div class="fds">Descripción extensa de la mejora</div><div class="fds vip">VIP</div><div class="fds free">Free</div></div><div class="fbtns"><button class="green">Mejorar</button><button class="gold" disabled>Faltan recursos</button><span class="fds">Explicación de la acción</span></div></div>';
 d.getElementById('nft-shop').innerHTML='<div class="secc">Mejoras permanentes</div>'+row()+row('eq');
 d.getElementById('forge-craft').innerHTML=row();
 d.getElementById('barn-body').innerHTML=row();
 d.getElementById('sk-grid').innerHTML='<div class="skrow"><span class="ic">A</span><div class="body">Habilidad</div></div>';
 d.getElementById('lb-list').innerHTML='<div class="lbrow">Otra granja</div><div class="lbrow me">Tu granja</div>';
 d.getElementById('inv-slots').innerHTML='<div class="slot filled r-raro"><img alt=""><b class="cnt">9</b></div><div class="slot filled eq"><img alt=""></div>';
 const loose=d.createElement('div');loose.className='menu-test-loose';loose.innerHTML=row()+row();d.querySelector('#ov-config>.card').append(loose);
 const currency=d.querySelector('.curbtn'),inactive=d.createElement('button');inactive.className='curbtn';inactive.textContent='Otra moneda';currency.parentElement.append(inactive);
 const seed=d.createElement('div');seed.className='mkt-row ref-seed-row';seed.innerHTML='<div class="mimg"><img alt=""></div><div class="minfo"><b class="mnm">Papa</b></div><div class="ref-quantity"><button class="ref-step">−</button><input type="number" value="1"><button class="ref-step">+</button></div><button data-buy="papa" class="green">Comprar</button>';d.getElementById('seed-shop').append(seed);
 const pot=d.createElement('div');pot.className='ck-olla enfila';pot.innerHTML='<button data-ckcancel="1">Cancelar</button>';d.getElementById('ck-cola').append(pot);
 d.getElementById('objetos-productores').innerHTML='<article class="objeto-card"><div class="objeto-datos">Objeto de Granja</div><div class="objeto-acciones"><button class="green">Comprar</button><button class="ghost">Ver detalles</button></div></article>';
 d.getElementById('cf-yes').className='green';
 const neutral=d.createElement('button');neutral.className='green';neutral.disabled=true;neutral.id='menu-test-green-disabled';neutral.textContent='No disponible';d.querySelector('#ov-confirm>.card').append(neutral);
 const danger=d.createElement('button');danger.className='red';danger.id='menu-test-red';danger.textContent='Eliminar';d.querySelector('#ov-confirm>.card').append(danger);
 const css=selector=>w.getComputedStyle(typeof selector==='string'?d.querySelector(selector):selector);
 return{dom,w,d,css,tokens,style};
}
const surfaces=['#nft-shop','#forge-craft','#barn-body','#sk-grid','#inv-slots','#cob-slots','#cofre-slots','#ov-config .cfgsec'];
const probes=[...surfaces,'#nft-shop .secc','#ov-equip .eqh','#forge-craft .forge-row','#forge-craft .fic','#forge-craft .fbtns','.menu-test-loose .forge-row','#ov-config .menu-actions','.curbtn','#gmenu .menu-seccion','#gmenu .menu-icon','#inv-slots .r-raro','#inv-slots .eq','#seed-shop .ref-seed-row','#seed-shop .ref-step','#ov-cocina [data-ckcancel]','#hudbar'];
const props=['backgroundImage','backgroundColor','borderImage','borderTopWidth','borderTopColor','borderRadius','padding','marginBottom','gap','display','width','height','minHeight','color','textShadow','boxShadow'];
function snapshot(f){return probes.map(s=>[s,...props.map(k=>f.css(s)[k])]);}
function color(value){const n=value.match(/[\d.]+/g);assert(n,'color computable: '+value);return n.slice(0,3).map(Number);}
function lum(rgb){return rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const l=[lum(color(a)),lum(color(b))].sort((x,y)=>x-y);return(l[1]+.05)/(l[0]+.05);}
for(const[width,height]of[[1672,948],[1346,618],[1024,700],[900,700]]){
 const f=fixture(width,height,true),old=fixture(width,height,true,false),{css,d}=f;
 assert.match(old.css('#nft-shop').backgroundImage,/badge_bg/,'la prueba reproduce la tabla vieja de Mejoras');
 for(const s of surfaces){assert.equal(css(s).backgroundImage,'none',s+' conserva la textura antigua');assert.equal(css(s).borderImage,'none',s+' conserva el marco antiguo');}
 for(const s of ['#nft-shop .secc','#ov-equip .eqh']){assert.equal(css(s).backgroundImage,'none');assert.equal(css(s).borderImage,'none');assert(['none','rgba(0, 0, 0, 0)'].includes(css(s).textShadow));assert.notEqual(css(s).color,'rgb(255, 255, 255)',s+' usa tinta sobre pergamino; tokens='+JSON.stringify(f.tokens));}
 for(const s of ['#forge-craft .fbtns','#ov-config .menu-actions','#objetos-productores .objeto-acciones'])assert(parseFloat(css(s).gap)>=8,s+' necesita separación entre acciones');
 assert.equal(css('#ov-config .menu-actions').flexWrap,'wrap');
 assert.equal(css('#objetos-productores .objeto-acciones').flexWrap,'wrap');
 assert(parseFloat(css('#cfg-discord-invite').marginTop)>=8,'la invitación no se pega a los botones');
 assert.equal(css('#cfg-discord-invite').display,'inline-block');
 assert(parseFloat(css('#cfg-discord-status').marginTop)>=8,'el estado conserva separación');
 assert(parseFloat(css('#ov-config .cfgsec>h4').marginBottom)>=8,'el título deja respirar al contenido');
 assert(parseFloat(css('.menu-test-loose .forge-row').marginBottom)>=8,'las filas fuera de listas no deben pegarse');
 assert.equal(css('#forge-craft .forge-row').marginBottom,'0px','la lista proporciona su propio gap');
 assert.notEqual(css('#nft-shop .forge-row.eq').backgroundColor,css('#nft-shop .forge-row:not(.eq)').backgroundColor,'propiedad/equipo sigue visible');
 assert.notEqual(css('.lbrow.me').backgroundColor,css('.lbrow:not(.me)').backgroundColor,'la fila propia mantiene un estado distinto');
 assert.notEqual(css('.fds.vip').color,css('.fds.free').color,'VIP y Free siguen diferenciados');
 assert.equal(css('#nft-shop>.forge-row>.fbtns').flexBasis,'100%','las acciones de Mejoras no estrechan la descripción');
 assert.equal(css('.curbtn').backgroundImage,'none');assert.equal(css('.curbtn').borderImage,'none');
 assert.notEqual(css('.curbtn.active').backgroundColor,css('.curbtn:not(.active)').backgroundColor,'moneda activa diferenciada');
 assert(contrast(css('#forge-craft .fds').color,css('#forge-craft .forge-row').backgroundColor)>=4.5,'texto secundario legible');
 assert(contrast(css('.curbtn.active').color,css('.curbtn.active').backgroundColor)>=4.5,'selector activo legible');
 // JSDOM calcula mal la prioridad de la cadena :not() genérica. La captura nativa
 // reproduce el marrón anterior. Se compara sólo la especificidad de estos dos
 // selectores reales; no se implementa otro motor de cascada.
 const rules=Array.from(f.style.sheet.cssRules);
 const wood=rules.find(r=>r.selectorText==='.visual-v2 .card button:not(.ghost):not(.red):not(.gold):not(.shoptab):not(.ref-step):not(:disabled)');
 const green=rules.find(r=>r.selectorText==='.visual-v2 .ov>.card button.green:not(.ghost):not(.red):not(.gold):not(.shoptab):not(.ref-step):not(:disabled)');
 assert(wood&&green,'existen los dos selectores que causaron la regresión');
 // Ambos tienen un tipo button, cero ID y sólo clases/:disabled como argumentos
 // simples de :not(). Ese :not no añade peso, sus argumentos sí.
 const classWeight=s=>(s.match(/\.[\w-]+|:disabled/g)||[]).length;
 assert.equal(classWeight(wood.selectorText),8);
 assert(classWeight(green.selectorText)>classWeight(wood.selectorText),'la acción primaria gana al marco genérico');
 for(const s of ['#cfg-discord-create','#cf-yes','#forge-craft button.green']){
  const primary=css(s).backgroundColor,[r,g,b]=color(primary);assert(g>r&&g>b,'la acción primaria es verde: '+s);
  assert(contrast(css(s).color,primary)>=4.5,'acción primaria legible: '+s);
 }
 for(const s of ['#menu-test-green-disabled','#menu-test-red','#nft-shop button.gold'])for(const p of ['backgroundColor','borderImage','color','textShadow','boxShadow'])assert.equal(css(s)[p],old.css(s)[p],s+' conserva su estado semántico '+p);
 assert.notEqual(css('#menu-test-green-disabled').backgroundColor,css('#cf-yes').backgroundColor,'disabled no recibe el verde activo');
 for(const s of ['#inv-slots .r-raro','#inv-slots .eq','#seed-shop .ref-seed-row','#seed-shop .ref-step','#ov-cocina [data-ckcancel]','#hudbar'])for(const p of props)assert.equal(css(s)[p],old.css(s)[p],s+' no debe cambiar '+p);
 assert.equal(css('#ov-cocina [data-ckcancel]').minHeight,'22px','se conserva Cancelar compacto');
 f.w.close();old.w.close();
}
for(const[width,height,on]of[[1346,618,false],[899,700,true],[640,800,true]]){
 const f=fixture(width,height,on),old=fixture(width,height,on,false);assert.deepEqual(snapshot(f),snapshot(old),'Clásico/móvil deben conservar exactamente sus estilos: '+width+' '+on);f.w.close();old.w.close();
}
console.log('OK: tablas interiores y secciones antiguas reproducidas/corregidas, acciones separadas, selección y colores semánticos, celdas y controles especializados intactos, Clásico/móvil iguales; 4 tamaños PC. JSDOM no valida píxeles ni medidas reales: requiere revisión nativa.');
