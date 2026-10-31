const fs=require('fs'),path=require('path');
const access=require('./alpha-access.json');
function pausaRegistro(req,res,next){
 if(access.gameOpen||!['GET','HEAD'].includes(req.method))return next();
 let p;try{p=decodeURIComponent(req.path).replace(/\/+/g,'/');}catch{return res.sendStatus(400);}
 if(p!=='/'&&p!=='/index.html')return next();
 const source=fs.readFileSync(path.join(__dirname,'../public/game/save.js'),'utf8');
 const url=source.match(/const SB_URL = "([^"]+)"/)[1],key=source.match(/const SB_KEY = "([^"]+)"/)[1];
 const html=fs.readFileSync(path.join(__dirname,'../public/registro-pausa.html'),'utf8').replace('__REGISTRO_CONFIG__',JSON.stringify({url,key}));
 res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');return res.type('html').send(html);
}
module.exports={pausaRegistro};
