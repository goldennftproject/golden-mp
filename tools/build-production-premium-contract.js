'use strict';
// Deriva geometría de la configuración real; no mantiene otra granja a mano.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function build(){
 const c={console:{log(){},warn(){}},GF:{},G:{}};c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'public/game/config.js'),'utf8'),c);
 const state=fs.readFileSync(path.join(root,'public/game/state.js'),'utf8');
 const build=vm.runInNewContext('('+state.match(/const BUILD_DEF = (\{[\s\S]*?\n\});/)[1]+')');
 const out={tile:c.GF.TILE,buildTypes:Object.keys(build),versions:{}};
 for(const v of [1,2,3,4]){
  c.GF.configurarEspacio(v);
  out.versions[v]={cols:c.GF.COLS_BASE,rows:c.GF.ROWS_BASE,
   expansions:c.GF.EXPANSIONES.map(e=>[e.c0,e.r0,e.c1,e.r1]),
   plots:c.GF.PLOTS_BASE.map(p=>[p.col,p.row]),
   objects:c.GF.WORLD_OBJECTS.map((o,i)=>{
    const key=o.type+':'+o.leftCol+','+o.baseRow;
    const duplicate=c.GF.WORLD_OBJECTS.some((b,j)=>i!==j&&b.type===o.type&&b.leftCol===o.leftCol&&b.baseRow===o.baseRow);
    return {i,type:o.type,...(o.ore?{ore:o.ore}:{}),...(o.premiumOnly?{premiumOnly:true}:{}),exp:o.exp??null,lock:c.GF.COLLISIONS[i]?.lock??null,col:o.leftCol,base:o.baseRow,width:Math.max(1,Math.ceil(o.wCells||1)),key:key+(duplicate?'#'+i:'')};
   })};
 }
 return out;
}
if(require.main===module)process.stdout.write(JSON.stringify(build()));
module.exports={build};
