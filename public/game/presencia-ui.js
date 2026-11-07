/* Lista informativa: nombres públicos, sin identificadores de cuenta. */
(function(){
  const boton=document.getElementById('jugadores-online'), panel=document.getElementById('lista-online'), lista=document.getElementById('lista-online-nombres');
  if(!boton||!panel||!lista)return;
  document.body.appendChild(panel);
  function ubicar(){
    if(panel.hidden)return;
    const margen=8,r=boton.getBoundingClientRect();
    panel.style.maxWidth=Math.max(0,window.innerWidth-2*margen)+'px';
    const ancho=panel.getBoundingClientRect().width;
    panel.style.left=Math.max(margen,Math.min(r.left,window.innerWidth-ancho-margen))+'px';
    const top=Math.max(margen,Math.min(r.bottom+margen,window.innerHeight-margen-64));
    panel.style.top=top+'px';
    panel.style.maxHeight=Math.max(0,Math.min(window.innerHeight*.6,window.innerHeight-top-margen))+'px';
  }
  window.actualizarListaOnline=function(nombres){
    lista.replaceChildren();
    const textos=nombres===null?['Reconectando…']:nombres.length?nombres:['No hay jugadores conectados'];
    for(const nombre of textos){const li=document.createElement('li');li.textContent=String(nombre);lista.appendChild(li);}
    ubicar();
  };
  function cerrar(){panel.hidden=true;boton.setAttribute('aria-expanded','false');}
  boton.addEventListener('click',()=>{panel.hidden=!panel.hidden;boton.setAttribute('aria-expanded',String(!panel.hidden));ubicar();});
  document.addEventListener('click',e=>{if(!boton.contains(e.target)&&!panel.contains(e.target))cerrar();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){cerrar();boton.focus();}});
  window.addEventListener('resize',ubicar);
  window.actualizarListaOnline(null);
})();
