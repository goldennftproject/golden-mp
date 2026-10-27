'use strict';
const assert=require('node:assert/strict'),path=require('path');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'),{'game/main.js':''});
(async()=>{await c.SAVE_READY;c.estadoDeCero();c.G.plata=0;c.G.res={};c.G.seeds={};c.G.plots=[];
 c.logroLista=()=>[];c.dailyState=()=>({claimable:false,day:1});let d=c.tutoSubPlata('',10);assert.equal(d.panel,'ov-logros');assert.ok(!d.txt.includes('vendé lo que'));
 c.G.res.madera=4;d=c.tutoSubPlata('',10);assert.equal(d.panel,'ov-p2p');assert.match(d.txt,/depende de otro jugador/);
 c.logroLista=()=>[{tiers:[{cobrable:true,key:'madera:0'}]}];d=c.tutoSubPlata('',10);assert.equal(d.panel,'ov-logros');assert.equal(d.ui,'[data-logro="madera:0"]');
 c.logroLista=()=>[];for(const day of [2,7]){c.dailyState=()=>({claimable:true,day});assert.equal(c.tutoSubPlata('',10).panel,'ov-paquete');}
 c.dailyState=()=>({claimable:true,day:1});assert.equal(c.tutoSubPlata('',10).panel,'ov-p2p','un bono de velocidad no se presenta como semillas o Plata');
 c.G.res.papa=3;assert.equal(c.tutoSubPlata('',10).ui,'#vb-papa','la cosecha vendible sigue siendo la primera salida');
 console.log('OK: sin capital señala logros, premio útil o comercio real; no promete vender materiales al comprador de cultivos.');
})().catch(e=>{console.error(e);process.exitCode=1;});
