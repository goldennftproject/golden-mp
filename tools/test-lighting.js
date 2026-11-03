const assert=require('node:assert/strict');
const {normals,eligible}=require('../public/game/lighting');
const w=13,h=13,source=new Uint8ClampedArray(w*h*4);
for(let y=2;y<11;y++)for(let x=2;x<11;x++){const p=(y*w+x)*4;source.set([130,160,95,255],p);}
const original=source.slice(),map=normals(source,w,h);
assert.deepEqual(source,original,'original RGBA intacto');assert.equal(map.length,source.length);
for(let p=0;p<map.length;p+=4){assert.equal(map[p+3],255);assert(map[p+2]>=128);}
const left=(6*w+3)*4,right=(6*w+9)*4;
assert(map[left]<128&&map[right]>128,'normales opuestas a ambos lados de la silueta');
assert(eligible({type:'Sprite',texture:{key:'hero_walk_0'}}));assert(eligible({type:'Image',texture:{key:'barn_evo_0'}}));
assert(!eligible({type:'Text',texture:{key:'test'}}));assert(!eligible({type:'Image',texture:{key:'animal_feed_marker'}}));assert(!eligible({type:'RenderTexture',texture:{key:'__rt'}}));
console.log('OK: normales, relieve, alpha opaco de datos, fuentes intactas y exclusiones de UI/terreno');
const events=require('node:events');
global.Phaser={WEBGL:2,Scenes:{Events:{ADDED_TO_SCENE:'add',SHUTDOWN:'shutdown'}},Renderer:{WebGL:{Pipelines:{LightPipeline:class{constructor(){this.name='GoldenRelief';}}}}}};
const api=require('../public/game/lighting');
const sprite={type:'Image',texture:{key:'tree'},pipeline:{name:'MultiPipeline'},setPipeline(name){this.pipeline={name};return this;},resetPipeline(){this.pipeline={name:'MultiPipeline'};}};
const scene={game:{renderer:{type:2,pipelines:{has:()=>false,add:()=>{}}}},children:{list:[sprite]},events:new events.EventEmitter()};
assert.equal(api.attach(scene),true);assert.equal(sprite.pipeline.name,'GoldenRelief');
api.setEnabled(false);assert.equal(sprite.pipeline.name,'MultiPipeline');
api.setEnabled(true);assert.equal(sprite.pipeline.name,'GoldenRelief');
scene.events.emit('shutdown');assert.equal(scene.events.listenerCount('add'),0);
assert.equal(api.attach({game:{renderer:{type:1}}}),false,'Canvas conserva aspecto sprite');
console.log('OK: escenas, preferencia reversible, limpieza al salir y fallback Canvas');
