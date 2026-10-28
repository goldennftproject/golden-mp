/* Visita aislada: el iframe recibe una proyección pública, nunca G ni el guardado. */
let VISITA_ACTUAL = null;
function visitaCerrar() {
  if (VISITA_ACTUAL) VISITA_ACTUAL.remove();
  VISITA_ACTUAL = null;
}
function visitaAbrir(granja) {
  if (!granja || !granja.mapa || !vipVigente()) { toast('No se pudo cargar el mapa de esta granja.'); return; }
  visitaCerrar();
  const uid = UID, destino = granja.id;
  const visitas = typeof G !== 'undefined' ? G.visitas : null;
  const dia = new Date().toISOString().slice(0,10), ids = visitas?.dia === dia && Array.isArray(visitas.ids) ? visitas.ids : [];
  const vista = {...granja,semillaEstado:ids.includes(destino)?'recogida':ids.length>=3?'limite':'disponible'};
  const frame = document.createElement('iframe');
  frame.title = 'Visitando la granja de ' + granja.nombre;
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100000;background:#233d20';
  const descarga = new AbortController();
  // El regreso debe existir incluso si falla la descarga del documento aislado.
  const carga = document.createElement('div'), mensaje = document.createElement('span'), volver = document.createElement('button');
  carga.style.cssText = 'position:fixed;z-index:100001;top:12px;left:12px;right:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:#704425;border:3px solid #c2924d;border-radius:8px;color:#fff5d4';
  mensaje.textContent = 'Viajando a la granja…'; mensaje.setAttribute('role','status');
  volver.textContent = '← Volver a mi granja'; volver.onclick = visitaCerrar;
  carga.append(mensaje,volver);
  const espera = setTimeout(() => { descarga.abort(); mensaje.textContent = 'La visita no responde. Puedes volver a tu granja e intentarlo de nuevo.'; },20000);

  let enCurso = false;
  const recibir = async event => {
    if (event.source !== frame.contentWindow || VISITA_ACTUAL !== frame) return;
    if (UID !== uid) { visitaCerrar(); return; }
    if (event.data?.tipo === 'visita-lista') { clearTimeout(espera); carga.remove(); frame.contentWindow.postMessage({tipo:'visita-datos',granja:vista}, '*'); }
    if (event.data?.tipo === 'visita-salir') visitaCerrar();
    if (event.data?.tipo !== 'visita-semilla' || enCurso) return;
    if (typeof bolsaCabeCantidad === 'function' && !bolsaCabeCantidad('seed','papa',1)) {
      frame.contentWindow.postMessage({tipo:'visita-cobro',ok:false,mensaje:'Libera espacio en tu bolsa y vuelve a recoger la semilla. Sigue disponible.'},'*');
      return;
    }
    enCurso = true;
    const respuesta = await economiaSolicitar({visita:{accion:'semillas',destino}});
    enCurso = false;
    if (VISITA_ACTUAL === frame && UID === uid) frame.contentWindow.postMessage({tipo:'visita-cobro',ok:!!respuesta?.ok}, '*');
  };
  window.addEventListener('message', recibir);
  const quitar = frame.remove.bind(frame);
  frame.remove = () => { descarga.abort(); clearTimeout(espera); carga.remove(); window.removeEventListener('message', recibir); quitar(); };
  closeOv('ov-visitas');
  VISITA_ACTUAL = frame;
  document.body.append(frame,carga);
  frame.focus();
  // Descarga pública desde la página principal; srcdoc conserva el origen opaco
  // del sandbox y evita dejar la navegación del marco detenida en about:blank.
  fetch('visita.html',{credentials:'omit',signal:descarga.signal})
    .then(r => { if(!r.ok)throw new Error('documento no disponible');return r.text(); })
    .then(html => { if(VISITA_ACTUAL===frame&&UID===uid)frame.srcdoc=html; })
    .catch(() => { if(VISITA_ACTUAL===frame)mensaje.textContent='No se pudo cargar la visita. Vuelve a tu granja e inténtalo de nuevo.'; });
}
