'use strict';
// Observable-behaviour tests, independently written from the lighting implementation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const path = require('node:path');
const repo = process.argv[2] || path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(repo, 'public/game/world-lights.js'), 'utf8');
let renewed = true, reduced = false;
const document = {createElement(name) {
  assert.equal(name, 'canvas', 'no new DOM controls or game state');
  return canvas();
}};
function canvas() {
  return {width:128,height:128,getContext() {return {
    createRadialGradient() {return {addColorStop() {}};},
    clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
    createLinearGradient() {return {addColorStop() {}};},
  };}};
}
const sandbox = {module:{exports:{}},console, Math, Number, Date, Set, Map, WeakMap, Object, Array,
  document, matchMedia:()=>({get matches(){return reduced;}}),
  setTimeout(){throw new Error('no independent timers');},setInterval(){throw new Error('no independent timers');},
  GoldenVisual:{hasVariant:()=>renewed,isEnabled:()=>renewed},
  GoldenLighting:{exclude(node){node._gfReliefExcluded=true;}},
  Phaser:{BlendModes:{ADD:1,NORMAL:0},Scenes:{Events:{SHUTDOWN:'shutdown'}}},
};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
Object.defineProperty(sandbox,'G',{get(){throw new Error('visual helper cannot read player state');}});
vm.runInNewContext(source, sandbox, {filename:'world-lights.js'});
const api = sandbox.module.exports;
assert.equal(typeof api.create,'function');
assert.equal(typeof api.profiles,'function');
assert.equal(typeof api.anchor,'function');
function close(actual,expected,message) {assert(Math.abs(actual-expected)<1e-7,`${message}: ${actual} !== ${expected}`);}
function sprite(key='barn_evo_3') {
  return {x:200,y:300,width:128,height:128,displayWidth:128,displayHeight:128,
    originX:.5,originY:1,scaleX:1,scaleY:1,rotation:0,flipX:false,flipY:false,
    visible:true,active:true,alpha:1,depth:300,texture:{key,getSourceImage:()=>({width:128,height:128})},
    frame:{cutX:0,cutY:0,width:128,height:128,cutWidth:128,cutHeight:128,realWidth:128,realHeight:128,sourceSizeW:128,sourceSizeH:128,source:{width:128,height:128}},
  };
}
function node(x,y,key) {
  return {type:'Image',x,y,texture:{key},active:true,visible:true,alpha:1,rotation:0,depth:0,
    setPosition(x,y){this.x=x;this.y=y;return this;},
    setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;},
    setAlpha(a){this.alpha=a;return this;}, setVisible(v){this.visible=v;return this;},
    setDepth(d){this.depth=d;return this;},setBlendMode(v){this.blendMode=v;return this;},
    setOrigin(x,y=x){this.originX=x;this.originY=y;return this;},setRotation(v){this.rotation=v;return this;},
    setTint(v){this.tint=v;return this;},clearTint(){delete this.tint;return this;},
    setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;},
    setInteractive(){throw new Error('decorative light cannot capture input');},
    destroy(){this.active=false;this.visible=false;this.destroyed=true;},
  };
}
function scene() {
  const images=[], textures=new Map(), events=new EventEmitter();
  const ctx={images,textures,events,canvasAllocations:0,tweenAllocations:0,
    add:{image(x,y,key){const n=node(x,y,key);images.push(n);return n;}},
    tweens:{add(){ctx.tweenAllocations++;throw new Error('permanent light animation should not allocate tweens');},killTweensOf(){}},
    cameras:{main:{zoom:1,scrollX:0,scrollY:0}},
    textures:{exists:key=>textures.has(key),get:key=>textures.get(key),
      createCanvas(key,w,h){ctx.canvasAllocations++;const c=canvas();c.width=w;c.height=h;const texture={context:c.getContext('2d'),getContext:()=>c.getContext('2d'),getSourceImage:()=>c,refresh(){},canvas:c};textures.set(key,texture);return texture;},
      addCanvas(key,c){ctx.canvasAllocations++;const texture={getSourceImage:()=>c,refresh(){}};textures.set(key,texture);return texture;},
      remove(key){textures.delete(key);},
    },
  };
  return ctx;
}
const visibleLight = n=>n.active && n.visible!==false && n.alpha>0;
const activeImages = sc=>sc.images.filter(n=>n.active);
function state(objects=[], extra={}) {return {objects,adornos:[],built:{barn:true,store:true,horno:true,cocina:true},forgeLit:false,atmosphere:{active:true,darkness:1},...extra};}
const winKey=['barn_evo_3','barn_evo_2','barn_evo_1','barn_evo_0','cocina'].find(k=>api.profiles(k,true).some(p=>p.kind==='window'));
assert(winKey,'at least one approved building has a real window profile');
const winProfile=api.profiles(winKey,true).find(p=>p.kind==='window');
assert.equal(api.profiles('build_store',true).length,0,'construction has no finished-building light');
assert.equal(api.profiles('tree',true).length,0,'unlit tree has no made-up source');
console.log('OK: only approved luminous sources');

// The anchor transform must follow the rendered sprite, not a cached grid location.
const sp=sprite(); sp.x=100;sp.y=200;sp.displayWidth=256;sp.scaleX=2;
const p={...winProfile,x:.25,y:.5,w:.125,h:.25,sw:128,sh:128};
let a=api.anchor(sp,p); close(a.x,36,'scaled source x'); close(a.y,136,'source y');
sp.flipX=true;a=api.anchor(sp,p);close(a.x,164,'flipped x');sp.flipX=false;
sp.rotation=Math.PI/2;a=api.anchor(sp,p);close(a.x,164,'rotated x');close(a.y,136,'rotated y');
sp.rotation=0;sp.x+=400;sp.y+=200;a=api.anchor(sp,p);close(a.x,436,'moved x');close(a.y,336,'moved y');
sp.x=100;sp.y=200;sp.displayWidth=224;sp.displayHeight=112;sp.frame.cutX=8;sp.frame.cutY=16;sp.frame.cutWidth=112;sp.frame.cutHeight=112;
a=api.anchor(sp,p);close(a.x,36,'cropped-frame x');close(a.y,136,'cropped-frame y');close(a.w,32,'cropped-frame width');close(a.h,32,'cropped-frame height');
assert.equal(api.anchor(sp,{...p,x:.01}),null,'source outside trimmed frame has no floating light');
assert.equal(api.anchor({...sp,displayWidth:0},p),null,'zero-size hidden/invalid frame is harmless');
console.log('OK: world anchor follows move, scale, flip and rotation');

const fire={kind:'fire',x:.4,y:.6}, win={kind:'window',x:.25,y:.5};
const dayFire=api.appearance(fire,0,1000,false,true),nightFire=api.appearance(fire,1,1000,false,true);
assert(dayFire.core>0,'active fire remains visible by day');assert(nightFire.halo>dayFire.halo*4,'night halo is substantially stronger than day');
assert.notDeepEqual(api.appearance(fire,1,1000,false,true),api.appearance(fire,1,2100,false,true),'fire animates');
assert.deepEqual(api.appearance(fire,1,1000,true,true),api.appearance(fire,1,2100,true,true),'reduced motion has steady light');
assert.equal(api.appearance(win,0,1000,false,true).core,0,'day windows off');
assert.equal(api.appearance(win,1,1000,false,false).core,0,'inactive atmosphere windows off');
for(const d of [-5,NaN,0,.5,1,9])for(const t of [NaN,-1,0,1000]){
  const v=api.appearance(win,d,t);assert(Object.values(v).every(Number.isFinite),'malformed clock/darkness does not make invalid render values');
}
console.log('OK: day fire, stronger night halo, animation and reduced-motion');

const sc=scene(), lights=api.create(sc), building={type:winKey.startsWith('barn')?'barn':'cocina',sprite:sprite(winKey)};
const st=state([building]), original=JSON.stringify(st);
lights.sync(st,1000);
assert(activeImages(sc).some(visibleLight),'night window lights are visible');
assert(activeImages(sc).every(n=>n._gfReliefExcluded),'gradients excluded from relief shader');
const allocations=sc.canvasAllocations, imageCount=sc.images.length;
assert.equal(allocations,2,'two shared gradient textures per texture manager');
for(let i=0;i<1000;i++)lights.sync(st,1000+i*16);
assert.equal(sc.images.length,imageCount,'no image leak on repeated sync');
assert.equal(sc.canvasAllocations,allocations,'no gradient texture leak');
assert.equal(sc.tweenAllocations,0,'no repeated tween allocation');
assert.equal(JSON.stringify(st),original,'lights do not mutate source/state');
console.log('OK: night lights and stable allocations; game state unchanged');

const positions=activeImages(sc).map(n=>[n.x,n.y]);
building.sprite.x+=40;building.sprite.y+=80;lights.sync(st,18000);
activeImages(sc).forEach((n,i)=>{close(n.x,positions[i][0]+40,'light follows x immediately');close(n.y,positions[i][1]+80,'light follows y immediately');});
const cameraPositions=activeImages(sc).map(n=>[n.x,n.y]);
sc.cameras.main.zoom=2;sc.cameras.main.scrollX=200;sc.cameras.main.scrollY=100;lights.sync(st,18000);
activeImages(sc).forEach((n,i)=>{close(n.x,cameraPositions[i][0],'camera does not change world x');close(n.y,cameraPositions[i][1],'camera does not change world y');});
console.log('OK: source movement and camera stay separate');

st.atmosphere={active:true,darkness:0};lights.sync(st,20000);
assert(!activeImages(sc).some(visibleLight),'day windows have no halo or light core');
st.atmosphere={active:false,darkness:1};lights.sync(st,21000);
assert(!activeImages(sc).some(visibleLight),'Original/no atmosphere has no night windows');
st.atmosphere={active:true,darkness:1};lights.sync(st,22000);
assert(activeImages(sc).some(visibleLight),'reenabling night restores light without reloading');
building.sprite.visible=false;lights.sync(st,23000);assert(!activeImages(sc).some(visibleLight),'hidden source leaves no visible light');
building.sprite.visible=true;st.built[building.type]=false;lights.sync(st,24000);assert(!activeImages(sc).some(visibleLight),'unfinished building has no light');
st.built[building.type]=true;building.sprite.texture.key='build_'+building.type;lights.sync(st,25000);assert(!activeImages(sc).some(visibleLight),'construction texture cannot inherit old source');
building.sprite.texture.key=winKey;lights.sync(st,26000);assert(activeImages(sc).some(visibleLight));
st.objects=[];lights.sync(st,27000);assert(!activeImages(sc).some(visibleLight),'removed source leaves no old light');
console.log('OK: day, disabled, hidden, construction, restore and removal');

st.objects=[building];renewed=false;lights.sync(st,27000);
assert.equal(lights.size(),api.profiles(winKey,false).filter(p=>api.anchor(building.sprite,p)).length,'Classic uses only Classic measured sources');
renewed=true;lights.sync(st,27000);
assert.equal(lights.size(),api.profiles(winKey,true).filter(p=>api.anchor(building.sprite,p)).length,'return to Renewed replaces sources rather than accumulating old ones');
console.log('OK: changing visual style replaces the source geometry');

// Fire must reflect work activity, never simply the existence of a forge.
const forge={type:'store',sprite:sprite('store')};st.objects=[forge];st.atmosphere={active:true,darkness:0};st.forgeLit=false;lights.sync(st,28000);
assert(!activeImages(sc).some(visibleLight),'idle forge has no active flame');
st.forgeLit=true;lights.sync(st,28000);assert(activeImages(sc).some(visibleLight),'working forge has its measured flame');
const dayState={...st,atmosphere:{active:true,darkness:0}};lights.sync(dayState,28000);assert(activeImages(sc).some(visibleLight),'working forge retains day flame');
st.forgeLit=false;lights.sync(st,28000);assert(!activeImages(sc).some(visibleLight),'forge fire stops when work stops');
console.log('OK: forge work state controls its fire');
st.atmosphere={active:true,darkness:1};

// Lamp container identity must be stable while child coordinates remain local.
const child=sprite('deco_farolito');child.x=0;child.y=0;
const container={x:500,y:600,depth:600,alpha:1,active:true,visible:true,list:[child]};
st.objects=[];st.adornos=[{id:'farolito',g:container}];lights.sync(st,30000);
assert(activeImages(sc).some(visibleLight),'lamp container provides a source');
const lampCount=sc.images.length,lampPositions=activeImages(sc).map(n=>[n.x,n.y]);
for(let i=0;i<50;i++)lights.sync(st,30000+i*16);assert.equal(sc.images.length,lampCount,'lamp proxies do not cause duplicate light objects');
container.x+=60;container.y-=30;lights.sync(st,31000);
activeImages(sc).forEach((n,i)=>{close(n.x,lampPositions[i][0]+60,'lamp container follows x');close(n.y,lampPositions[i][1]-30,'lamp container follows y');});
container.visible=false;lights.sync(st,32000);assert(!activeImages(sc).some(visibleLight),'hidden lamp leaves no glow');
st.adornos=[];st.objects=[building];lights.sync(st,33000);
console.log('OK: lamp containers do not leak or leave lights behind');

sc.events.emit('shutdown');
assert(!activeImages(sc).some(visibleLight),'scene shutdown removes light objects');
assert.equal(lights.size(),0);assert.equal(sc.events.listenerCount('shutdown'),0,'shutdown detaches its cleanup listener');
const count=sc.images.length;lights.destroy();lights.destroy();assert.equal(sc.images.length,count,'destroy is idempotent');
const restarted=api.create(sc);st.objects=[building];restarted.sync(st,28000);assert(activeImages(sc).some(visibleLight),'same scene can be reattached after restart');restarted.destroy();
assert(!activeImages(sc).some(visibleLight));
assert.equal(sc.events.listenerCount('shutdown'),0,'manual destroy detaches listener');
console.log('OK: scene shutdown/restart and idempotent cleanup');
