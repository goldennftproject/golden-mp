'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.argv[2],out=process.argv[3],src=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8');
const block=src.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0],s={JSON,Math,Number,Object,Array,Set,String,Date,isFinite};vm.createContext(s);vm.runInContext(block.slice(block.indexOf('const VERSION')),s);
const prices=vm.runInContext('ARTEFACTOS_PRECIOS',s),base=1800000000000,rows=[];
for(const tasa of [8000,10000,12000,15000,20000])for(const [id,coste] of Object.entries(prices)){
 let d=s.artefactoOperacion({golden:coste,plata:0},'comprar',id,base,'buy').data,recupera=null,total=0;
 for(let day=1;day<=180;day++){
  const r=s.artefactoOperacion(d,'cobrar',id,base+day*86400000,'claim-'+day);assert.ok(!r.error,r.error);d=r.data;total+=r.cobro;
  const q=Math.floor(d.plata/tasa);
  if(q){const b=s.bancoOperacion(d,{accion:'canjear',golden:q,revision:'plata-golden:'+tasa},'bank-'+day,tasa);assert.ok(!b.error,b.error);d=b.data;}
  assert.ok(d.plata>=0&&d.golden>=0);
  if(recupera===null&&d.golden>=coste)recupera=day;
 }
 if(tasa===10000)assert.ok(recupera>=90&&recupera<=120,'referencia inicial '+id);
 assert.ok(d.plata<tasa);rows.push({id,costeGolden:coste,tasa,plataDiaria:s.objetoPlataDiaria(id),recuperacionDias:recupera,goldenFinal:d.golden,plataResidual:d.plata,plataTotal:+total.toFixed(1)});
}
const report={date:new Date().toISOString(),sourceHash:crypto.createHash('sha256').update(src).digest('hex'),escenarios:rows.length,modelo:'180 días, cobro puntual cada 24h, Banco entero a tasa constante por escenario. No incluye granja, VIP, compras nuevas, ausencias ni USDT. No predice una tasa futura.',results:rows};
fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({escenarios:rows.length,inicial:rows.filter(r=>r.tasa===10000).map(r=>({id:r.id,dias:r.recuperacionDias}))}));
