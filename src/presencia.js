// Indicador informativo de presencia declarada por el cliente, no una autorización
// ni una métrica válida para premios, economía o seguridad.
function jugadorPresencia(valor) {
  return typeof valor === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
    ? valor.toLowerCase() : null;
}
function contarJugadores(clientes) {
  return new Set(Array.from(clientes, c => c.jugador).filter(Boolean)).size;
}
function nombrePresencia(valor) {
  return typeof valor === 'string' ? valor.normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 24) || 'Granjero' : 'Granjero';
}
function listarJugadores(clientes) {
  const unicos = new Map();
  for (const c of clientes) if (c.jugador) unicos.set(c.jugador, nombrePresencia(c.nombre));
  return Array.from(unicos.values()).sort((a,b)=>a.localeCompare(b,'es'));
}
module.exports = {jugadorPresencia, contarJugadores, nombrePresencia, listarJugadores};
