'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=require('./arrancar-el-juego.contexto').arrancar(process.cwd()).ctx;
const text=fs.readFileSync('supabase/functions/guardar/index.ts','utf8'),s={Math,Number,Object,Array,Set,Date,isFinite,JSON};vm.createContext(s);vm.runInContext(text.slice(text.indexOf('const VERSION ='),text.indexOf('/* === FIN REGLAS === */')),s);
assert.equal(c.marketNet(250,7),233);assert.equal(c.marketNet(550,7),512);assert.equal(c.marketNet(1,10),1);
for(const fee of [5,7,8,10])for(let price=1;price<=10000;price++){
 const native=Number((BigInt(price)*BigInt(100-fee)+50n)/100n)||1;assert.equal(c.marketNet(price,fee),native);
}
s.rows=[{seller:'a',kind:'res',item:'madera',qty:1,price:250,fee_pct:7,paid:true}];const actual=vm.runInContext("mercadoPermiso('a',rows,null,{},{}).ack",s);assert.equal(actual.ventas,233);
assert.ok(fs.readFileSync('public/game/ui.js','utf8').includes('marketNet(r.price, marketFee(r))'));
console.log('OK comisión P2P: 40.000 precios/tasas coinciden con redondeo decimal positivo; UI y guardado alineados, sin cambiar porcentajes.');
