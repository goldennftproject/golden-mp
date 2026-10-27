'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const prefix=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
const {servidor,inicial,base}=new Function('require','__dirname',prefix+';return {servidor,inicial,base};')(require,__dirname);
(async()=>{
 const pending={kind:'res',item:'madera',qty:40,payload:null};let s=servidor(inicial);
 assert.equal((await s.call({base,data:{...inicial.data,mkPend:[pending]}})).status,409,'no fabrica un permiso de recursos para el siguiente guardado');assert.equal(s.writes(),0);
 const old={...inicial,data:{...inicial.data,mkPend:[pending],res:{madera:0}}};
 for(const forged of [[{...pending,qty:400}],[pending,pending],[{kind:'arm',item:'espada_oro',qty:1,payload:{dur:999}}]]){s=servidor(old);assert.equal((await s.call({base,data:{...old.data,mkPend:forged}})).status,409);assert.equal(s.writes(),0);}
 s=servidor(old);assert.equal((await s.call({base,data:{...old.data,mkPend:[],res:{madera:40}}})).status,200,'reclamar una entrega aceptada sigue funcionando');assert.equal(s.row().data.res.madera,40);
 s=servidor(old);const omitted={...old.data};delete omitted.mkPend;assert.equal((await s.call({base,data:omitted})).status,200);assert.equal(s.row().data.mkPend.length,1,'un cliente que omite el campo no borra entregas');
 s=servidor({...old,data:{...old.data,mkPend:[{...pending,qty:1000000}]}});const falso={...old.data,res:{madera:1000000}};delete falso.mkPend;assert.equal((await s.call({base,data:falso})).status,422,'omitir el campo no cobra la entrega mientras la conserva');assert.equal(s.writes(),0);
 const arm={kind:'arm',item:'espada_madera',qty:1,payload:{dur:27,plus:3}};s=servidor({...inicial,data:{...inicial.data,mkPend:[arm]}});assert.equal((await s.call({base,data:{...inicial.data,mkPend:[{payload:{plus:3,dur:27},qty:1,item:'espada_madera',kind:'arm'}]}})).status,200,'el orden de claves JSON no altera la ficha');
 console.log('OK: entregas no falsificables, cantidades/fichas protegidas, multiplicidad, reclamación legítima y compatibilidad con campo omitido.');
})().catch(e=>{console.error(e);process.exitCode=1;});
