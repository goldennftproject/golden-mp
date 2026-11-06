/* Mercado ilustrado opcional. Decora controles existentes; nunca calcula ni ejecuta compras. */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 const rowState=new Map(),tabNodes=new Map();let mounted=false,scheduled=false,lastFraming='',tabOrder=null,titleMark=null,footer=null,currencyLine=null,titleNode=null,titleNodes=null;
 const active=()=>root.innerWidth>=900&&doc.documentElement.classList.contains('visual-v2');
 const overlay=()=>doc.getElementById('ov-market');
 function restore(row,state){
  if(state.wrapper.parentNode)state.wrapper.replaceWith(state.input);
  state.price.remove();
  state.button.replaceChildren(...state.buttonNodes);
  if(state.aria===null)state.button.removeAttribute('aria-label');else state.button.setAttribute('aria-label',state.aria);
  if(state.title===null)row.removeAttribute('title');else row.setAttribute('title',state.title);
  row.classList.remove('ref-seed-row');rowState.delete(row);
 }
 function mountRow(row,input,button){
  const state={input,button,buttonNodes:Array.from(button.childNodes),aria:button.getAttribute('aria-label'),title:row.getAttribute('title')};
  const wrapper=doc.createElement('div');wrapper.className='ref-quantity';wrapper.setAttribute('role','group');
  const label=(input.getAttribute('aria-label')||'Cantidad de semillas').replace(/^Cantidad de semillas de /,'');
  wrapper.setAttribute('aria-label','Cantidad de '+label);
  const minus=doc.createElement('button'),plus=doc.createElement('button');
  minus.type=plus.type='button';minus.className=plus.className='ref-step';minus.textContent='−';plus.textContent='+';
  minus.setAttribute('aria-label','Reducir cantidad de '+label);plus.setAttribute('aria-label','Aumentar cantidad de '+label);
  for(const control of [minus,plus])control.addEventListener('keydown',event=>event.stopPropagation());
  const step=(direction,event)=>{
   event.preventDefault();event.stopPropagation();
   if(input.disabled||input.readOnly)return;
   const previous=input.value;
   try{direction>0?input.stepUp():input.stepDown();}catch(_){return;}
   if(input.value!==previous){input.dispatchEvent(new root.Event('input',{bubbles:true}));input.dispatchEvent(new root.Event('change',{bubbles:true}));}
   syncRow(state);
  };
  minus.addEventListener('click',event=>step(-1,event));plus.addEventListener('click',event=>step(1,event));
  input.replaceWith(wrapper);wrapper.append(minus,input,plus);
  const price=doc.createElement('div');price.className='ref-price';price.setAttribute('aria-hidden','true');
  const coin=doc.createElement('img');coin.src='assets/farm/coin_plata.png?a=4';coin.alt='';coin.width=24;coin.height=24;
  const text=doc.createElement('span'),amount=doc.createElement('div');amount.className='ref-price-amount';amount.append(coin,text);
  const growth=doc.createElement('span'),growthText=doc.createElement('span');growth.className='ref-grow-time';growth.hidden=true;
  growth.innerHTML='<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 5v5l3 2"/></svg>';
  growth.append(growthText);price.append(amount,growth);row.append(price);
  Object.assign(state,{wrapper,minus,plus,price,text,growth,growthText});rowState.set(row,state);row.classList.add('ref-seed-row');
  button.replaceChildren(doc.createTextNode('Comprar'));button.setAttribute('aria-label','Comprar semillas de '+label);
  syncRow(state);
 }
 function syncRow(state){
  const row=state.input.closest('.mkt-row');if(!row)return;
  const total=row.querySelector('.compra-total');
  const text=(total?.textContent||'').replace(/^Total:\s*/,'').trim();
  if(state.text.textContent!==text)state.text.textContent=text;
  const duration=row.querySelector('.seed-grow-time')?.textContent?.trim()||'';
  if(state.growthText.textContent!==duration){state.growthText.textContent=duration;state.growth.title='Tiempo base hasta la cosecha: '+duration;}
  if(state.growth.hidden===!!duration)state.growth.hidden=!duration;
  const details=row.querySelector('.mds:not(.compra-total)')?.textContent?.trim();
  if(details&&row.getAttribute('title')!==details)row.setAttribute('title',details);
  const number=Number(state.input.value),minimum=Number(state.input.min||1),maximum=state.input.max===''?Infinity:Number(state.input.max);
  const minusDisabled=state.input.disabled||state.input.readOnly||(Number.isFinite(number)&&number<=minimum);
  const plusDisabled=state.input.disabled||state.input.readOnly||(Number.isFinite(maximum)&&Number.isFinite(number)&&number>=maximum);
  if(state.minus.disabled!==minusDisabled)state.minus.disabled=minusDisabled;
  if(state.plus.disabled!==plusDisabled)state.plus.disabled=plusDisabled;
 }
 function frame(){
  const ov=overlay();if(!ov)return;
  const signature=[active(),ov.classList.contains('show'),root.innerWidth,root.innerHeight,!!ov.querySelector('.card.movida')].join(':');
  if(signature===lastFraming)return;lastFraming=signature;
  root.FARM?.refreshReferenceFraming?.();
 }
 function decorateTab(tab,key){
  if(tabNodes.has(tab))return;
  tabNodes.set(tab,Array.from(tab.childNodes));
  const icon=doc.createElement('span'),label=doc.createElement('span');icon.className='ref-market-tab-icon';icon.setAttribute('aria-hidden','true');label.className='ref-market-tab-label';label.textContent=tab.textContent;
  icon.innerHTML=key==='buy'
   ? '<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="#e8eaa4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28V16"/><path d="M16 18C5 19 2 12 3 5c8-1 14 3 13 13Z" fill="#b6c65d"/><path d="M16 18C15 7 23 3 30 4c1 7-5 14-14 14Z" fill="#e3e79a"/><path d="M16 18 7 9m9 9 10-9"/></svg>'
   : '<svg viewBox="0 0 32 32" width="28" height="28" stroke="#9f5f16" stroke-width="1.6" stroke-linejoin="round"><path d="M4 18h15v8c0 5-15 5-15 0z" fill="#df9e27"/><ellipse cx="11.5" cy="18" rx="7.5" ry="3.5" fill="#f8d66b"/><path d="M17 7h12v12c0 5-12 5-12 0z" fill="#e5a536"/><ellipse cx="23" cy="7" rx="6" ry="3" fill="#ffe18b"/><path d="M4 23c4 4 11 4 15 0m-2-10c3 3 9 3 12 0m-12 5c3 3 9 3 12 0" fill="none"/></svg>';
  tab.replaceChildren(icon,label);
 }
 function update(){
  scheduled=false;const ov=overlay();if(!ov)return;
  const on=active();
  if(!on){
   for(const [row,state]of Array.from(rowState))restore(row,state);
   for(const [tab,nodes]of tabNodes)if(tab.querySelector('.ref-market-tab-icon'))tab.replaceChildren(...nodes);tabNodes.clear();
   if(tabOrder){const parent=ov.querySelector('.shoptabs');if(parent)for(const tab of tabOrder)if(tab.isConnected)parent.append(tab);tabOrder=null;}
   if(titleNode&&titleNodes)titleNode.replaceChildren(...titleNodes);titleNode=null;titleNodes=null;titleMark=null;footer?.remove();footer=null;currencyLine=null;if(ov.classList.contains('reference-market'))ov.classList.remove('reference-market');mounted=false;frame();return;
  }
  if(!ov.classList.contains('reference-market'))ov.classList.add('reference-market');
  if(!mounted){
   const heading=ov.querySelector('.card>h3');
   if(heading){titleNode=heading;titleNodes=Array.from(heading.childNodes);titleMark=doc.createElement('span');titleMark.className='ref-market-mark';titleMark.setAttribute('aria-hidden','true');titleMark.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3v24M9 28h14M4 9h24M6 9l-4 10h8L6 9zm20 0-4 10h8L26 9zM13 5h6"/><path d="M2 20q4 5 8 0M22 20q4 5 8 0"/></svg>';heading.replaceChildren(titleMark,doc.createTextNode('Mercado'));}
   const tabs=ov.querySelector('.shoptabs');
   if(tabs)tabOrder=Array.from(tabs.children);
   const card=ov.querySelector('.card');
   if(card){
    footer=doc.createElement('div');footer.className='ref-market-footer';
    const secondary=doc.createElement('nav');secondary.className='ref-market-secondary';secondary.setAttribute('aria-label','Otras secciones del Mercado');
    currencyLine=doc.createElement('div');currencyLine.className='ref-market-currency';const coin=doc.createElement('img');coin.src='assets/farm/coin_plata.png?a=4';coin.alt='';coin.width=22;coin.height=22;const text=doc.createElement('span');text.textContent='Se compra con Plata';currencyLine.append(coin,text);footer.append(secondary,currencyLine);card.append(footer);
    if(tabs)for(const key of ['buy','sell','deco','nft']){const tab=ov.querySelector('[data-shop="'+key+'"]');if(!tab)continue;if(key==='buy'||key==='sell'){tabs.append(tab);decorateTab(tab,key);}else secondary.append(tab);}
   }
   mounted=true;
  }
  for(const [row]of Array.from(rowState))if(!row.isConnected)rowState.delete(row);
  for(const input of ov.querySelectorAll('#seed-shop input[id^="sq-"]')){
   const row=input.closest('.mkt-row'),button=row?.querySelector('[data-buy]');if(!row||!button)continue;
   if(!rowState.has(row))mountRow(row,input,button);else syncRow(rowState.get(row));
  }
  const buying=ov.querySelector('[data-shop="buy"]')?.classList.contains('active');
  if(currencyLine)currencyLine.hidden=!buying;
  frame();
 }
 function schedule(){if(scheduled)return;scheduled=true;root.queueMicrotask?root.queueMicrotask(update):Promise.resolve().then(update);}
 const ov=overlay();
 if(ov)new root.MutationObserver(schedule).observe(ov,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','max','min','readonly']});
 new root.MutationObserver(schedule).observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 root.addEventListener('resize',schedule);
 const api={update};root.GoldenReferenceMarket=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
 update();
})(typeof window==='undefined'?globalThis:window);
