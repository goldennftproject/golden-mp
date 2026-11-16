const feed = require("../public/news/index.json");

const inicio = Date.parse("2026-11-13T23:00:00Z");
const fin = Date.parse("2026-11-15T23:00:00Z");
const aviso = {
  id: "2026-11-13-bellotas-del-bosque-inicio",
  title: "Ya empezó Bellotas del Bosque",
  date: "2026-11-13",
  image: "/news/bellotas-del-bosque-20261113.webp",
  alt: "Bellota pixelada entre los árboles de Golden Farm. Evento del 13 al 15 de noviembre a las 20:00 de Uruguay y Argentina, con USD 20 en premios.",
  content: "Entrá en **Misiones → Bellotas del Bosque** para ver las misiones y el ranking. Guardá tu granja al entrar y completá y reclamá tus misiones para sumar bellotas.\n\nEl evento cierra el **domingo 15 de noviembre a las 20:00**, hora de Uruguay y Argentina. Hay **USD 20 en premios** para los tres primeros puestos. Si hay empate, se suman los premios de los puestos empatados y se reparten en partes iguales.",
};

const avisoCierre = {
  id: "2026-11-15-bellotas-del-bosque-cierre",
  title: "Bellotas del Bosque ya cerró",
  date: "2026-11-15",
  image: aviso.image,
  alt: "Bellota pixelada entre los árboles de Golden Farm.",
  content: "El evento terminó el **domingo 15 de noviembre a las 20:00**, hora de Uruguay y Argentina. Las misiones diarias siguen entregando Plata.\n\n¡Gracias por participar! El ranking provisional sigue disponible en **Misiones → Bellotas del Bosque**. Publicaremos los resultados y el reparto de los **USD 20 en premios** después de verificar las bellotas reclamadas.",
  discordUrl: "https://discord.com/channels/1564640221063024763/1564643673889841243/1571685042676174930",
};

const resultados = {
  id: "2026-11-15-bellotas-del-bosque-resultados",
  title: "Resultados de Bellotas del Bosque",
  date: "2026-11-15",
  image: "/news/bellotas-ranking-20261115.png",
  discordUrl: "https://discord.com/channels/1564640221063024763/1564643673889841243/1571687357860810835",
  alt: "Ranking final de Bellotas del Bosque. Not, kimeran y CobraReX ocupan los tres primeros puestos.",
  content: "🥇 **Not** · 24 bellotas · **USD 10**\n🥈 **kimeran** · 15 bellotas · **USD 5**\n🥉 **CobraReX** · 14 bellotas · **USD 5**\n\nParticiparon **12 granjas** y se reclamaron **109 bellotas**. ¡Felicitaciones a los ganadores y gracias a todos por participar!\n\nEl ranking completo está en **Misiones → Bellotas del Bosque**.",
};

function noticiasBellotas(ahora) {
  if (ahora < inicio) return feed;
  const nota = ahora < fin ? aviso : {
    ...aviso,
    title: "Bellotas del Bosque abrió el 13 de noviembre",
    content: "El evento se realizó del viernes 13 al domingo 15 de noviembre. Podés consultar el ranking provisional en **Misiones → Bellotas del Bosque**. Los premios se adjudican después de verificar los resultados.",
  };
  const avisos = ahora < fin ? [nota] : [resultados, avisoCierre, nota];
  return {...feed, items: [...avisos, ...feed.items]};
}

function servirNoticiasBellotas(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(noticiasBellotas(Date.now()));
}

module.exports = {noticiasBellotas, servirNoticiasBellotas};
