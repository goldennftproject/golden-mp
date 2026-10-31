// La antigua dirección sigue atendiendo enlaces, pero sólo el dominio oficial sirve el juego.
const OFFICIAL_ORIGIN = 'https://goldenfarm.onrender.com';
function redirigirDominioAntiguo(req,res,next){
 if(String(req.hostname||'').toLowerCase()!=='golden-mp.onrender.com'||!['GET','HEAD'].includes(req.method))return next();
 // Conservar ruta y query de acceso. Sin fragmento en Location: el navegador conserva el original.
 res.set('Cache-Control','no-store');
 return res.redirect(308,OFFICIAL_ORIGIN+req.originalUrl);
}
module.exports={redirigirDominioAntiguo,OFFICIAL_ORIGIN};
