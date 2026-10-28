'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx=require('./arrancar-el-juego.contexto').arrancar(root).ctx,run=s=>vm.runInContext(s,ctx);
run('estadoDeCero();');
const rows=[];
for(let i=0;i<16;i++){
 run(`G.expansiones=${i};G.level=50;G.expObra=null;G.plata=1e9;`);
 const e=JSON.parse(run('JSON.stringify(expansionSiguiente())'));
 rows.push({expansion:e.n,level:e.nivel,plata:e.costo.plata,materials:Object.fromEntries(Object.entries(e.costo).filter(([k])=>k!=='plata')),minutes:run(`expansionObraMin(${i+1})`)});
 run(`G.level=${e.nivel-1};`);assert.equal(run('expansionComprar()'),false,'money cannot bypass level');
 run('G.level=50;for(const k of Object.keys(G.res))G.res[k]=0;');assert.equal(run('expansionComprar()'),false,'money cannot replace materials');
}
const serverSource=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8'),server={};vm.createContext(server);vm.runInContext(serverSource.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS ===')[0].replace(/^[\s\S]*?const VERSION/,'const VERSION'),server);
const sourceRun=s=>vm.runInContext(s,server);
for(const vip of [false,true]){
 sourceRun(`var at=Date.UTC(2026,9,28),d={energiaGranja:{actual:${vip?100:50},at},produccion:{vipHasta:${vip?'at+86400000':'0'}}},available=0;for(var visit=0;visit<6;visit++){var now=at+visit*4*3600000;available+=energiaServidor(d,now);d.energiaGranja={actual:0,at:now};}`);
 assert.equal(sourceRun('available'),vip?600:300);
}
const totalPlata=rows.reduce((n,e)=>n+e.plata,0),materials={};for(const e of rows)for(const [k,n]of Object.entries(e.materials))materials[k]=(materials[k]||0)+n;
const output={scope:'Static audit of actual expansion gates/costs and energy; not a full progression simulation',dailyWorkReward:5000,productiveEnergyTarget:200,freeEnergyAtSixFourHourlyVisits:300,vipEnergyAtSixFourHourlyVisits:600,totalExpansionPlata:totalPlata,daysOfFullRewardForPlataOnly:Math.ceil(totalPlata/5000),totalExpansionMaterials:materials,rows,findings:['All 16 expansion level gates still reject unlimited Plata.','All 16 expansion recipes still reject absent materials.','Both Free and VIP can reach the common daily reward cap; VIP retains energy/capacity advantages.','Plata alone is now a weak expansion gate; do not present this as a month-long economic simulation.']};
const target=path.join(root,'docs/balance/incentivo-free-20261028.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({...output,rows:undefined},null,2));
