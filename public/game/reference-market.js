/* Mercado ilustrado opcional. Decora controles existentes; nunca calcula ni ejecuta compras. */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 const rowState=new Map();let mounted=false,scheduled=false,lastFraming='',tabOrder=null,titleMark=null,footer=null,titleNode=null,titleNodes=null;
 const active=()=>root.innerWidth>=900&&doc.documentElement.classList.contains('visual-v2');
 const overlay=()=>doc.getElementById('ov-market');
 function restore(row,state){
  if(state.wrapper.parentNode)state.wrapper.replaceWith(state.input);
  state.price.remove();
  state.button.replaceChildren(...state.buttonNodes);
  if(state.aria===null)state.button.removeAttribute('aria-label');else state.button.setAttribute('aria-label',state.aria);
  row.classList.remove('ref-seed-row');rowState.delete(row);
 }
 function mountRow(row,input,button){
  const state={input,button,buttonNodes:Array.from(button.childNodes),aria:button.getAttribute('aria-label')};
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
  const text=doc.createElement('span');price.append(coin,text);row.append(price);
  Object.assign(state,{wrapper,minus,plus,price,text});rowState.set(row,state);row.classList.add('ref-seed-row');
  button.replaceChildren(doc.createTextNode('Comprar'));button.setAttribute('aria-label','Comprar semillas de '+label);
  syncRow(state);
 }
 function syncRow(state){
  const row=state.input.closest('.mkt-row');if(!row)return;
  const total=row.querySelector('.compra-total');
  const text=(total?.textContent||'').replace(/^Total:\s*/,'').trim();
  if(state.text.textContent!==text)state.text.textContent=text;
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
 function update(){
  scheduled=false;const ov=overlay();if(!ov)return;
  const on=active();
  if(!on){
   for(const [row,state]of Array.from(rowState))restore(row,state);
   if(tabOrder){const parent=ov.querySelector('.shoptabs');if(parent)for(const tab of tabOrder)if(tab.parentElement===parent)parent.append(tab);tabOrder=null;}
   if(titleNode&&titleNodes)titleNode.replaceChildren(...titleNodes);titleNode=null;titleNodes=null;titleMark=null;footer?.remove();footer=null;if(ov.classList.contains('reference-market'))ov.classList.remove('reference-market');mounted=false;frame();return;
  }
  if(!ov.classList.contains('reference-market'))ov.classList.add('reference-market');
  if(!mounted){
   const heading=ov.querySelector('.card>h3');
   if(heading){titleNode=heading;titleNodes=Array.from(heading.childNodes);titleMark=doc.createElement('span');titleMark.className='ref-market-mark';titleMark.setAttribute('aria-hidden','true');titleMark.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3v24M9 28h14M4 9h24M6 9l-4 10h8L6 9zm20 0-4 10h8L26 9zM13 5h6"/><path d="M2 20q4 5 8 0M22 20q4 5 8 0"/></svg>';heading.replaceChildren(titleMark,doc.createTextNode('Mercado'));}
   const tabs=ov.querySelector('.shoptabs');
   if(tabs){tabOrder=Array.from(tabs.children);for(const key of ['buy','sell','deco','nft']){const tab=tabs.querySelector('[data-shop="'+key+'"]');if(tab)tabs.append(tab);}}
   const card=ov.querySelector('.card');
   if(card){footer=doc.createElement('div');footer.className='ref-market-footer';const coin=doc.createElement('img');coin.src='assets/farm/coin_plata.png?a=4';coin.alt='';coin.width=24;coin.height=24;const text=doc.createElement('span');text.textContent='Se compra con Plata';footer.append(coin,text);card.append(footer);}
   mounted=true;
  }
  for(const [row]of Array.from(rowState))if(!row.isConnected)rowState.delete(row);
  for(const input of ov.querySelectorAll('#seed-shop input[id^="sq-"]')){
   const row=input.closest('.mkt-row'),button=row?.querySelector('[data-buy]');if(!row||!button)continue;
   if(!rowState.has(row))mountRow(row,input,button);else syncRow(rowState.get(row));
  }
  const buying=ov.querySelector('[data-shop="buy"]')?.classList.contains('active');
  if(footer)footer.hidden=!buying;
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
