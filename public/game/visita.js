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
  const frame = document.createElement('iframe');
  frame.title = 'Visitando la granja de ' + granja.nombre;
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100000;background:#233d20';
  frame.src = 'visita.html';
  // El regreso debe existir incluso si falla la descarga del documento aislado.
  const carga = document.createElement('div'), mensaje = document.createElement('span'), volver = document.createElement('button');
  carga.style.cssText = 'position:fixed;z-index:100001;top:12px;left:12px;right:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:#704425;border:3px solid #c2924d;border-radius:8px;color:#fff5d4';
  mensaje.textContent = 'Viajando a la granja…'; mensaje.setAttribute('role','status');
  volver.textContent = '← Volver a mi granja'; volver.onclick = visitaCerrar;
  carga.append(mensaje,volver);
  const espera = setTimeout(() => { mensaje.textContent = 'La visita no responde. Puedes volver a tu granja e intentarlo de nuevo.'; },20000);

  let enCurso = false;
  const recibir = async event => {
    if (event.source !== frame.contentWindow || VISITA_ACTUAL !== frame) return;
    if (UID !== uid) { visitaCerrar(); return; }
    if (event.data?.tipo === 'visita-lista') { clearTimeout(espera); carga.remove(); frame.contentWindow.postMessage({tipo:'visita-datos',granja}, '*'); }
    if (event.data?.tipo === 'visita-salir') visitaCerrar();
    if (event.data?.tipo !== 'visita-semilla' || enCurso) return;
    enCurso = true;
    const respuesta = await economiaSolicitar({visita:{accion:'semillas',destino}});
    enCurso = false;
    if (VISITA_ACTUAL === frame && UID === uid) frame.contentWindow.postMessage({tipo:'visita-cobro',ok:!!respuesta?.ok}, '*');
  };
  window.addEventListener('message', recibir);
  const quitar = frame.remove.bind(frame);
  frame.remove = () => { clearTimeout(espera); carga.remove(); window.removeEventListener('message', recibir); quitar(); };
  closeOv('ov-visitas');
  VISITA_ACTUAL = frame;
  document.body.append(frame,carga);
  frame.focus();
}
