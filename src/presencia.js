// Indicador informativo de presencia declarada por el cliente, no una autorización
// ni una métrica válida para premios, economía o seguridad.
function jugadorPresencia(valor) {
  return typeof valor === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
    ? valor.toLowerCase() : null;
}
function contarJugadores(clientes) {
  return new Set(Array.from(clientes, c => c.jugador).filter(Boolean)).size;
}
module.exports = {jugadorPresencia, contarJugadores};
