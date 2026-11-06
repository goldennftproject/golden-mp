'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const repo=process.argv[2]||path.resolve(__dirname,'..');
let time=0;
class Clock extends Date {static now(){return time;}}
const env={module:{exports:{}},console,Math,Number,Object,Array,Set,WeakSet,Uint8ClampedArray,Float32Array,Date:Clock};
env.globalThis=env;
vm.runInNewContext(fs.readFileSync(path.join(repo,'public/game/lighting.js'),'utf8'),env);
const api=env.module.exports, C=api.CYCLE_MS;
assert.equal(typeof api.atmosphere,'function');
time=.2*C;assert.equal(api.atmosphere().darkness,0);assert.equal(api.atmosphere().active,true);
time=.8*C;assert.equal(api.atmosphere().darkness,1);
api.setCycle(false,false);assert.equal(api.atmosphere().darkness,0);assert.equal(api.atmosphere().active,false);
api.setCycle(true,false);assert.equal(api.atmosphere().darkness,1);
api.setEnabled(false);assert.equal(api.atmosphere().darkness,0);assert.equal(api.atmosphere().active,false);
api.setEnabled(true);
for(let i=0;i<C;i+=997){const s=api.atmosphere(i);assert(Number.isFinite(s.darkness)&&s.darkness>=0&&s.darkness<=1);}
console.log('OK: atmosphere uses one clock and responds to day-fixed/Original');

let historicalReads=0;
const farmEnv={console,Math,Number,Date:Clock,JSON,Object,Array,String,Boolean,Set,Map,isFinite,parseInt,parseFloat,
 Phaser:{Scene:class {},BlendModes:{ADD:1,MULTIPLY:2}},
 GF:{ORIG_X:0,ORIG_Y:0,WORLD_W:500,WORLD_H:500},G:{res:{}},GoldenLighting:api,
 cieloDelMomento(){historicalReads++;return {alpha:.45,col:0x0a1030};},esDeNoche:()=>true,
};
farmEnv.window=farmEnv;farmEnv.globalThis=farmEnv;
vm.createContext(farmEnv);
vm.runInContext(fs.readFileSync(path.join(repo,'public/game/farm.js'),'utf8')+'\nthis.FarmSceneForTest=FarmScene;',farmEnv);
const proto=farmEnv.FarmSceneForTest.prototype;
function rect(x,y,w,h,color,fillAlpha){return {x,y,fillColor:color,fillAlpha,setDepth(){return this;},setBlendMode(){return this;}};}
function scene(){return {objs:[],_hojaAt:Infinity,_pezAt:Infinity,
 add:{rectangle:rect},tweens:{add(c){for(const k of ['fillAlpha','nocheMezcla'])if(k in c)c.targets[k]=c[k];}},
 createdLamps:0,cleanedLamps:0,crearFaroles(){this.createdLamps++;},limpiarFaroles(){this.cleanedLamps++;},
};}
const s=scene();
// The local hour says night throughout; only the visual clock should affect appearance.
time=.2*C;proto.tickAmbiente.call(s,.016,100);
assert.equal(s.cielo.fillAlpha,0,'no old dark veil by visual day');assert.equal(s.cieloTinte.fillAlpha,0,'no old multiply veil by visual day');assert.equal(s.nocheMezcla,0,'visual-day insects do not use real-world night');
time=.8*C;proto.tickAmbiente.call(s,.016,1200);
assert.equal(s.cielo.fillAlpha,0,'CSS night is not doubled by old dark veil');assert.equal(s.cieloTinte.fillAlpha,0,'CSS night is not doubled by old blue veil');assert.equal(s.nocheMezcla,1);
assert.equal(historicalReads,0,'active modern module never reads old sky clock');
api.setCycle(false,false);proto.tickAmbiente.call(s,.016,2300);assert.equal(s.cielo.fillAlpha,0);assert.equal(s.cieloTinte.fillAlpha,0);assert.equal(s.nocheMezcla,0,'day-fixed is truly visual day');
api.setCycle(true,false);api.setEnabled(false);proto.tickAmbiente.call(s,.016,3400);assert.equal(s.nocheMezcla,0,'Original is not still using hidden modern night');
api.setEnabled(true);proto.tickAmbiente.call(s,.016,4500);assert.equal(s.nocheMezcla,1,'return to cycle works without reload');
delete farmEnv.GoldenLighting;proto.tickAmbiente.call(s,.016,5600);
assert.equal(historicalReads,1,'missing lighting module retains historical fallback');assert(s.cielo.fillAlpha>0&&s.cieloTinte.fillAlpha>0);
console.log('OK: actual Farm tick uses visual day/night, no double tint, and preserves module-missing fallback');
