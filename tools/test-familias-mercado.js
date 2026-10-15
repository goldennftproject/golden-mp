const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
const run=s=>vm.runInContext(s,ctx);
run("G.level=1;G.prestige=0;G.buffs=[];mercadoGlobalRecurso=res=>({demanda:100,volumen:100,at:1000,resto:0,factor:MAT_DEF[res]?3:1,piso:['bronce','hierro','oro','diamante','netherita','barra_bronce','barra_hierro','barra_oro'].includes(res)?.6:.5});");
for(const [raw,processed] of [['madera','tablon'],['piedra','barra_piedra'],['bronce','barra_bronce'],['hierro','barra_hierro'],['oro','barra_oro']]){
 for(const q of [1,5,10,100]){
  const a=run(`cotizarVenta('${raw}',${q*3},1000)`),b=run(`cotizarVenta('${processed}',${q},1000)`);
  assert.equal(a.total,b.total,processed+' no reinicia presión');assert.ok(Math.abs(a.resto-b.resto)<1e-8);
 }
}
run('mercadoGlobalRecurso=res=>({demanda:100,volumen:1e9,at:1000,resto:0,factor:1,piso:.6});');
assert.equal(run("cotizarVenta('bronce',100,1000).total"),9600,'piso conserva un margen sobre el pico valorado a precio base');
console.log('OK: procesados y materia prima equivalentes comparten curva, redondeo y margen mínimo de minería.');
