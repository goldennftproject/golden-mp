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
  let enCurso = false;
  const recibir = async event => {
    if (event.source !== frame.contentWindow || VISITA_ACTUAL !== frame) return;
    if (UID !== uid) { visitaCerrar(); return; }
    if (event.data?.tipo === 'visita-lista') frame.contentWindow.postMessage({tipo:'visita-datos',granja}, '*');
    if (event.data?.tipo === 'visita-salir') visitaCerrar();
    if (event.data?.tipo !== 'visita-semilla' || enCurso) return;
    enCurso = true;
    const respuesta = await economiaSolicitar({visita:{accion:'semillas',destino}});
    enCurso = false;
    if (VISITA_ACTUAL === frame && UID === uid) frame.contentWindow.postMessage({tipo:'visita-cobro',ok:!!respuesta?.ok}, '*');
  };
  window.addEventListener('message', recibir);
  const quitar = frame.remove.bind(frame);
  frame.remove = () => { window.removeEventListener('message', recibir); quitar(); };
  closeOv('ov-visitas');
  VISITA_ACTUAL = frame;
  document.body.appendChild(frame);
  frame.focus();
}
