const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
const run=s=>vm.runInContext(s,ctx);
for(const id of ['junco','bambu','hierro','oro']) {
  run('estadoDeCero();');
  ctx.G.canasDur={[id]:0};
  const base=run(`canaReparaPlata('${id}')`);
  const material=run(`CANA_V4_DEF['${id}'].colaPlata+Object.entries(CANA_V4_DEF['${id}'].cost).reduce((v,[k,q])=>v+q*matValor(k),0)`);
  assert.equal(base,Math.ceil(material*run('CANA_REPARA_PCT')),'10% del coste material base');
  ctx.G.level=25;ctx.G.prestige=10;
  ctx.precioVenta=()=>1000000;
  assert.equal(run(`canaReparaPlata('${id}')`),base,'no sube por nivel, prestigio, buffs o cotización del comprador');
  ctx.G.canasDur[id]=25;
  assert.equal(run(`canaReparaPlata('${id}')`),Math.ceil(material*run('CANA_REPARA_PCT')/2));
  ctx.G.canasDur[id]=50;
  assert.equal(run(`canaReparaPlata('${id}')`),0);
}
console.log('OK: reparación estable, proporcional al desgaste y sin multiplicadores de venta.');
