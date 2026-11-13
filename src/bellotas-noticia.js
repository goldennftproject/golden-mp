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

function noticiasBellotas(ahora) {
  if (ahora < inicio) return feed;
  const nota = ahora < fin ? aviso : {
    ...aviso,
    title: "Bellotas del Bosque abrió el 13 de noviembre",
    content: "El evento se realizó del viernes 13 al domingo 15 de noviembre. Podés consultar el ranking provisional en **Misiones → Bellotas del Bosque**. Los premios se adjudican después de verificar los resultados.",
  };
  return {...feed, items: [nota, ...feed.items]};
}

function servirNoticiasBellotas(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(noticiasBellotas(Date.now()));
}

module.exports = {noticiasBellotas, servirNoticiasBellotas};
