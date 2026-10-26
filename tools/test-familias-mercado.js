const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));const run=s=>vm.runInContext(s,ctx);
for(const res of ['madera','piedra','bronce','hierro','oro','diamante','netherita','tablon','barra_piedra','barra_bronce','barra_hierro','barra_oro']){
 assert.equal(ctx.esVendible(res),false);assert.equal(ctx.cotizarVenta(res,100).total,0);assert.equal(run('SELLABLE').includes(res),false);
}
assert.ok(ctx.cotizarVenta('papa',3).total>0);assert.ok(run('MARKET_KINDS.res'),'materiales conservan comercio P2P');
console.log('OK: materiales fuera del comprador del sistema; cultivos y comercio P2P conservados.');
