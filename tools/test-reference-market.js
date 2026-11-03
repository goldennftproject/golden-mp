'use strict';
// El renderer de semillas real sigue siendo la única autoridad de precios, compras y bloqueos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('public/index.html'),ui=read('public/game/ui.js');
const renderer=ui.slice(ui.indexOf('function refreshSeedShop()'),ui.indexOf('/* ---- granja (nivel) ---- */'));
const dom=new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,doc=w.document,calls=[];
Object.assign(w,{innerWidth:1672,innerHeight:948,G:{plata:100,golden:0,seeds:{papa:4,ciruela:2}},GF:{PESCA_ACTIVA:false},CROP_ORDER:['papa','ciruela','calabaza'],
 CROP_DEF:{papa:{label:'Papa',seedCost:1,grow:180,lvl:1},ciruela:{label:'Ciruela',seedCost:5,grow:300,lvl:2},calabaza:{label:'Calabaza',seedCost:40,grow:600,lvl:5}},
 $:id=>doc.getElementById(id),seedBuysToday:()=>({count:4}),seedDailyMax:()=>120,cropUnlocked:k=>k!=='calabaza',fmt:String,fmtSecs:s=>s+' s',
 itemIcon:i=>'<img src="assets/farm/'+i.sprite+'.png" alt="">',coinIc:()=>'<img src="assets/farm/coin_plata.png" alt="">',
 refreshPacks(){},tutoHighlight(){},seedShopReponerFocoPc(){},seedShopGuardarFocoPc(){},buySeed:(key,n)=>calls.push({key,n}),
 FARM:{refreshReferenceFraming:()=>calls.push({framing:true})}
});
w.eval(renderer);w.refreshSeedShop();
const ov=doc.getElementById('ov-market'),card=ov.querySelector('.card'),box=doc.getElementById('seed-shop');
const heading=card.querySelector('h3'),originalHeading=heading.innerHTML,originalHeadingNodes=[...heading.childNodes],buyTab=ov.querySelector('[data-shop="buy"]');
const input=doc.getElementById('sq-papa'),buy=box.querySelector('[data-buy="papa"]');input.max='3';
const state=JSON.stringify(w.G),handler=buy.onclick;
let inputEvents=0,customClicks=0;input.addEventListener('input',()=>inputEvents++);buy.addEventListener('click',()=>customClicks++);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function computedMarketAt(width,height){
 const probe=new JSDOM(html),d=probe.window.document;
 const inputs=[...d.querySelectorAll('style')].map(e=>e.textContent);
 for(const link of d.querySelectorAll('link[rel="stylesheet"][href^="game/"]')){const file=link.getAttribute('href').split('?')[0];if(fs.existsSync(path.join(root,'public',file)))inputs.push(read('public/'+file));}
 d.querySelectorAll('style,link[rel="stylesheet"]').forEach(e=>e.remove());
 const matches=condition=>{if(/prefers-reduced-motion/.test(condition))return false;for(const m of condition.matchAll(/(min|max)-(width|height)\s*:\s*(\d+)px/g)){const v=m[2]==='width'?width:height;if(m[1]==='min'?v<+m[3]:v>+m[3])return false;}return true;};
 const flat=[];for(const input of inputs){const style=d.createElement('style');style.textContent=input;d.head.append(style);const walk=rules=>{for(const rule of rules)if(rule.type===4){if(matches(rule.conditionText))walk(rule.cssRules);}else flat.push(rule.cssText);};walk(style.sheet.cssRules);style.remove();}
 const applied=d.createElement('style');applied.textContent=flat.join('\n');d.head.append(applied);d.documentElement.classList.add('visual-v2');
 const target=d.getElementById('ov-market');target.innerHTML=ov.innerHTML;target.className=ov.className;
 const sampleSections=[];
 for(const [id,label,parent]of [['fixture-packs','Packs de materiales',target.querySelector('#packs-shop')],['fixture-kit','Kit de emergencia',target.querySelector('#seed-shop')],['semillas-bolsas','Bolsas y mochilas',target.querySelector('#seed-shop')]]){
  const section=d.createElement('details');section.id=id;section.className='ayuda-menu';section.innerHTML='<summary>'+label+'</summary><div class="mkt-row"><span>Contenido conservado</span><button type="button">Comprar</button></div>';parent.append(section);sampleSections.push(section);
 }
 const style=selector=>probe.window.getComputedStyle(target.querySelector(selector));
 const summaries=sampleSections.map(section=>{const s=style('#'+section.id+'>summary'),box=style('#'+section.id);return{minHeight:s.minHeight,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,lineHeight:s.lineHeight,containerPadding:box.paddingTop,marginTop:box.marginTop};});
 for(const section of sampleSections){const button=section.querySelector('button');section.querySelector('summary').click();assert(section.open,'Se puede desplegar '+section.id);assert.equal(section.querySelector('button'),button,'No cambia el control de '+section.id);assert.notEqual(style('#'+section.id+'>.mkt-row').display,'none','El contenido expandido sigue visible');}
 const future=style('#semillas-futuras>summary'),quantityInput=style('.ref-quantity>input');
 assert.equal(quantityInput.minHeight,'0px','El input no hereda los 34 px globales que recortaban la cantidad');assert.equal(quantityInput.height,'100%','La cantidad se adapta al alto compacto del control');
 const closeStyle=style('.close'),stepStyle=style('.ref-step'),quantityStyle=style('.ref-quantity');
 const closeInner=parseFloat(closeStyle.height)-parseFloat(closeStyle.borderTopWidth)-parseFloat(closeStyle.borderBottomWidth),stepInner=parseFloat(quantityStyle.height)-parseFloat(quantityStyle.borderTopWidth)-parseFloat(quantityStyle.borderBottomWidth);
 assert(parseFloat(closeStyle.lineHeight)<=closeInner,'La línea de cierre cabe entre sus bordes');assert(parseFloat(stepStyle.lineHeight)<=stepInner,'La línea de +/- cabe dentro del control compacto');assert.equal(closeStyle.display,'grid');assert.equal(stepStyle.display,'grid');
 const result={cardWidth:style('.card').width,cardOverflow:style('.card').overflow,cardBorderImage:style('.card').borderImage,titleHeight:style('.card>h3').height,titlePadding:style('.card>h3').paddingTop,paneOverflow:style('#shop-buy').overflow,footerDisplay:style('.ref-market-footer').display,footerShrink:style('.ref-market-footer').flexShrink,secondaryDisplay:style('.ref-market-secondary').display,quantity:style('.ref-quantity').display,rowHeight:style('.ref-seed-row').minHeight,buyBorderImage:style('.ref-seed-row>[data-buy]').borderImage,summaries,futureSummaryMinHeight:future.minHeight};probe.window.close();return result;
}
w.eval(read('public/game/visual-v2.js'));w.eval(read('public/game/reference-market.js'));
(async()=>{
 await tick();
 assert.equal(box.querySelector('[data-buy="papa"]'),buy,'No reemplaza el botón de compra');assert.equal(doc.getElementById('sq-papa'),input,'No reemplaza el input');assert.equal(buy.onclick,handler,'Listener original conservado');
 assert.equal(box.querySelectorAll('.ref-quantity').length,2,'Sólo cultivos disponibles tienen cantidad');
 assert.equal(ov.querySelectorAll('.card>.shoptabs .ref-market-tab-icon svg').length,2,'Semillas y Vender tienen iconos grandes propios');
 assert.equal(buyTab.textContent,'Semillas','VisualV2 y ReferenceMarket comparten la etiqueta renovada');
 assert.deepEqual([...ov.querySelectorAll('.card>.shoptabs>.shoptab')].map(b=>b.dataset.shop),['buy','sell'],'Las primarias no compiten con Adornos y Mejoras');
 assert.deepEqual([...ov.querySelectorAll('.ref-market-secondary>.shoptab')].map(b=>b.dataset.shop),['deco','nft'],'Las secundarias siguen en el pie visible');
 assert.deepEqual([...ov.querySelectorAll('.shoptab')].map(b=>b.dataset.shop),['buy','sell','deco','nft'],'Las cuatro rutas siguen disponibles');
 assert.equal(box.querySelector('[data-cultivo-bloqueado="calabaza"]').disabled,true,'No abre cultivos bloqueados');
 const row=input.closest('.mkt-row'),plus=row.querySelector('[aria-label^="Aumentar"]'),minus=row.querySelector('[aria-label^="Reducir"]');
 for(const [width,height]of [[1672,948],[1346,618],[1033,572],[900,572]]){const c=computedMarketAt(width,height);assert.equal(c.cardWidth,width>=1500?'460px':width>=1250?'410px':'370px','ancho acordado con cámara');assert.equal(c.titleHeight,height<=740?'40px':'44px','señal compacta, no cabecera gigante');assert(parseFloat(c.titlePadding)<=4,'sin espaciador grande sobre el título');assert.equal(c.cardOverflow,'hidden');assert.equal(c.paneOverflow,'auto','sólo desplaza artículos');assert.equal(c.footerDisplay,'flex');assert.equal(c.footerShrink,'0','las secundarias quedan fuera del scroll de artículos');assert.equal(c.secondaryDisplay,'flex');assert.equal(c.quantity,'grid');assert.equal(c.rowHeight,width>=1500?'98px':width>=1250?'92px':'86px');assert.equal(c.buyBorderImage,'none','sin pesado marco dorado en Comprar');assert(!c.cardBorderImage.includes('fill'),'marco exterior no rellena un segundo recuadro');for(const summary of c.summaries){assert.equal(summary.minHeight,'23px');assert.equal(summary.paddingTop,'3px');assert.equal(summary.paddingBottom,'3px');assert.equal(summary.lineHeight,'17px');assert.equal(summary.containerPadding,'0px');assert.equal(summary.marginTop,'3px');}assert.equal(c.futureSummaryMinHeight,'26px','desbloqueos mantienen un callout fino de 28 px con borde');}
 assert.equal(row.querySelector('.ref-price span').textContent,'1 Plata','Copia la previa verdadera');assert.equal(minus.disabled,true);
 assert.match(row.title,/crece en 180 s/,'La información secundaria se conserva en ayuda contextual');
 plus.click();await tick();assert.equal(input.value,'2');assert.equal(inputEvents,1);assert.equal(row.querySelector('.ref-price span').textContent,'2 Plata');assert.equal(calls.filter(c=>c.key).length,0,'Ajustar cantidad no compra');
 plus.click();await tick();assert.equal(input.value,'3');assert.equal(plus.disabled,true,'Respeta max real');plus.click();assert.equal(input.value,'3');assert.equal(inputEvents,2);
 minus.click();await tick();assert.equal(input.value,'2');buy.click();assert.equal(customClicks,1);assert.deepEqual(calls.filter(c=>c.key),[{key:'papa',n:2}]);
 input.disabled=true;await tick();assert(plus.disabled&&minus.disabled,'Input deshabilitado bloquea ambos controles');input.disabled=false;await tick();
 const price=doc.getElementById('st-papa');price.textContent='Cupo diario agotado';await tick();assert.equal(row.querySelector('.ref-price span').textContent,'Cupo diario agotado','El renderer conserva su mensaje de cupo');
 const disabled=box.querySelector('[data-buy="ciruela"]');disabled.disabled=true;await tick();assert.equal(disabled.disabled,true,'No habilita compras por decoración');
 assert.equal(JSON.stringify(w.G),state,'Sólo presentación y eventos, sin escritura de G');
 ov.classList.add('show');await tick();assert(calls.some(c=>c.framing),'Comunica ocupación al framing');
 const secondary=ov.querySelector('[data-shop="deco"]');let secondaryClicks=0;secondary.addEventListener('click',()=>secondaryClicks++);secondary.click();assert.equal(secondaryClicks,1,'Mover la sección secundaria conserva su identidad y eventos');
 const frameCount=calls.filter(c=>c.framing).length;w.GoldenReferenceMarket.update();w.GoldenReferenceMarket.update();await tick();assert.equal(calls.filter(c=>c.framing).length,frameCount,'No recentra al actualizar una cantidad');
 // Rehacer producción debe decorar filas nuevas y conservar sus nuevos handlers.
 w.refreshSeedShop();const newInput=doc.getElementById('sq-papa'),newBuy=box.querySelector('[data-buy="papa"]'),newHandler=newBuy.onclick;await tick();assert.equal(box.querySelectorAll('.ref-quantity').length,2);assert.equal(newBuy.onclick,newHandler);assert.equal(doc.getElementById('sq-papa'),newInput);
 assert.equal(buyTab.textContent,'Semillas');assert.equal(buyTab.querySelectorAll('.ref-market-tab-icon').length,1,'El observer de arte no elimina ni duplica el icono al recrear artículos');
 w.GoldenVisual.setEnabled(false);assert.equal(buyTab.textContent,'Comprar','VisualV2 devuelve Comprar antes del observer del Mercado');w.GoldenReferenceMarket.update();await tick();
 assert.equal(box.querySelector('.ref-quantity'),null);assert.equal(ov.querySelector('.ref-market-mark'),null);assert.equal(ov.querySelector('.ref-market-footer'),null);assert.equal(newBuy.textContent,'Comprar · 1 c/u');
 assert.equal(ov.querySelector('[data-shop="buy"]'),buyTab,'La reversión conserva la identidad y los listeners de la pestaña');assert.equal(buyTab.textContent,'Comprar','Mercado no sobrescribe Comprar con el nodo Semillas guardado');assert.equal(buyTab.querySelector('.ref-market-tab-icon'),null);
 assert.equal(heading.innerHTML,originalHeading,'Restaura el encabezado clásico exacto');assert.deepEqual([...heading.childNodes],originalHeadingNodes,'También conserva los nodos originales del encabezado');
 assert.deepEqual([...ov.querySelectorAll('.shoptab')].map(b=>b.dataset.shop),['buy','deco','nft','sell'],'Clásico devuelve el orden original');
 const classic=ov.innerHTML;w.GoldenVisual.setEnabled(true);await tick();w.GoldenVisual.setEnabled(false);await tick();assert.equal(ov.innerHTML,classic,'La reversión mantiene exactamente el markup clásico');
 assert.equal(buyTab.textContent,'Comprar','El orden automático de ambos observers también conserva Comprar');
 w.GoldenVisual.setEnabled(true);await tick();w.innerWidth=899;w.dispatchEvent(new w.Event('resize'));await tick();assert.equal(ov.innerHTML,classic,'Móvil mantiene la interfaz original');
 w.innerWidth=1672;w.dispatchEvent(new w.Event('resize'));await tick();assert.equal(box.querySelectorAll('.ref-quantity').length,2);assert.equal(JSON.stringify(w.G),state);
 // Después de quedar estable el observer no vuelve a escribir nodos o clases.
 let mutations=0;const observer=new w.MutationObserver(ms=>mutations+=ms.length);observer.observe(ov,{subtree:true,childList:true,attributes:true,characterData:true});w.GoldenReferenceMarket.update();await tick();assert.equal(mutations,0,'Actualizar una UI estable es idempotente');observer.disconnect();
 dom.window.close();console.log('OK: renderer/precios reales, botones e inputs preservados, +/- sin compras y con límites, cupos/bloqueos, refresh dinámico, framing único, reversión exacta, móvil y observer estable');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
