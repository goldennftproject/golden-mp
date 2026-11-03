/* Lista informativa: nombres públicos, sin identificadores de cuenta. */
(function(){
  const boton=document.getElementById('jugadores-online'), panel=document.getElementById('lista-online'), lista=document.getElementById('lista-online-nombres');
  if(!boton||!panel||!lista)return;
  window.actualizarListaOnline=function(nombres){
    lista.replaceChildren();
    const textos=nombres===null?['Reconectando…']:nombres.length?nombres:['No hay jugadores conectados'];
    for(const nombre of textos){const li=document.createElement('li');li.textContent=String(nombre);lista.appendChild(li);}
  };
  function cerrar(){panel.hidden=true;boton.setAttribute('aria-expanded','false');}
  boton.addEventListener('click',()=>{panel.hidden=!panel.hidden;boton.setAttribute('aria-expanded',String(!panel.hidden));const r=boton.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(r.left,window.innerWidth-256))+'px';panel.style.top=(r.bottom+8)+'px';});
  document.addEventListener('click',e=>{if(!boton.contains(e.target)&&!panel.contains(e.target))cerrar();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){cerrar();boton.focus();}});
  window.actualizarListaOnline(null);
})();
