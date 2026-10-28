const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx:c,elementos}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
let calls=0;c.toast=()=>{};c.economiaSolicitar=()=>{calls++;};c.G.plata=1000000;const before=c.G.plata;
c.bancoSolicitar(1,'plata-golden:10000');c.bancoActualizarPrevia();
assert.equal(calls,0);assert.equal(c.G.plata,before);assert.equal(elementos['banco-canjear'].disabled,true);
console.log('OK Banco cliente alfa: no ofrece ni solicita canjes.');
