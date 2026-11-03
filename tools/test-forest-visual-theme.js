'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../public/game/forest.js'),'utf8');
const state={level:7,plata:50,zona:{x:90,y:315},forestDrops:[{k:'madera',n:1}]},before=JSON.stringify(state);
let enabled=false,fail=false;
function canvas(){const ctx={drawImage(){if(fail)throw Error('sin imagen');},getImageData(x,y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=40;data[i+1]=100;data[i+2]=35;data[i+3]=255;}return{data};},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)};},putImageData(d){ctx.pixels=d.data;},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){}};return{ctx,getContext:()=>ctx};}
const c={Phaser:{Scene:class{}},window:{GoldenVisual:{isEnabled:()=>enabled}},document:{createElement:()=>canvas()},GF:{TILE:42},G:state,console:{warn(){}}};
vm.createContext(c);vm.runInContext(source+'\nthis.ForestScene=ForestScene;',c);
const scene=new c.ForestScene(),textures=new Map(),destroyed=[];
scene.W=32*42;scene.H=15*42;
scene.textures={exists:k=>k==='grass_a'||textures.has(k),get:()=>({getSourceImage:()=>({width:42,height:42})}),createCanvas(k,w,h){assert(!textures.has(k),'no se conserva caché anterior');const cv=canvas();cv.refresh=()=>{};textures.set(k,cv);return cv;},remove(k){textures.delete(k);}};
let ops=[];
const graphics=()=>{const g={setDepth(){return g;},fillStyle(...a){ops.push(['fillStyle',...a]);return g;},fillRect(...a){ops.push(['fillRect',...a]);return g;},lineStyle(...a){ops.push(['lineStyle',...a]);return g;},strokeRect(...a){ops.push(['strokeRect',...a]);return g;},destroy(){destroyed.push('graphics');}};return g;};
scene.add={graphics,tileSprite(x,y,w,h,key){assert.equal(w,scene.W);assert.equal(h,scene.H);assert(textures.has(key));const s={setOrigin(v){assert.equal(v,0);return s;},setDepth(){return s;},destroy(){destroyed.push('tiles');}};return s;}};
const zones={pantano:[0x2f4a20,0x2a431c],piedra:[0x3b3a33,0x35342e],fuego:[0x4a2a20,0x42251c],guarida:[0x2a2030,0x241b2a]};
for(const [zone,palette]of Object.entries(zones)){
 scene.zonaKey=zone;scene.Z={piso:palette,mata:0x223a16,hierba:0x3a5527};enabled=true;ops=[];
 assert(scene.refreshVisualTheme());assert.equal(scene._forestFloorRenewed,true);assert.equal(textures.size,1);
 const pixels=[...textures.values()][0].ctx.pixels;
 const sums=[0,0,0];for(let p=0;p<pixels.length;p+=4){for(let i=0;i<3;i++)sums[i]+=pixels[p+i];assert.equal(pixels[p+3],255);}
 const avg=sums.map(s=>s/(pixels.length/4));const expected=[0,1,2].map(i=>(((palette[0]>>((2-i)*8))&255)+((palette[1]>>((2-i)*8))&255))/2);
 expected.forEach((v,i)=>assert(Math.abs(avg[i]-v)<.2,'cada zona conserva su pigmento medio'));
 if(zone==='fuego')assert(avg[0]>avg[1]&&avg[1]>avg[2],'fuego usa tierra cálida, no pigmento verde');
 enabled=false;ops=[];assert(scene.refreshVisualTheme());assert.equal(scene._forestFloorRenewed,false);assert.equal(textures.size,0,'Clásico libera tile derivado');
 assert.deepEqual(ops.slice(0,8),[['fillStyle',palette[0],1],['fillRect',0,0,42,42],['fillStyle',palette[1],1],['fillRect',42,0,42,42],['fillStyle',palette[0],1],['fillRect',84,0,42,42],['fillStyle',palette[1],1],['fillRect',126,0,42,42]]);
 assert.deepEqual(ops.at(-1),['strokeRect',0,0,scene.W,scene.H]);
 assert.equal(JSON.stringify(state),before,'alternar el suelo no cambia progreso ni posición');
}
enabled=true;fail=true;assert(scene.refreshVisualTheme());assert.equal(scene._forestFloorRenewed,false,'fallo de textura conserva suelo clásico');assert.equal(textures.size,0);
scene.clearVisualFloor();scene.clearVisualFloor();assert.equal(textures.size,0,'limpieza repetida y apagado sin fugas');assert.equal(JSON.stringify(state),before);assert(destroyed.includes('tiles'));
console.log('OK: cuatro biomas conservan paleta y geometría, Clásico restaura damero, alternancia y apagado liberan texturas, fallback sin cambios de progreso');
