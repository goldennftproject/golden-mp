'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {EventEmitter}=require('node:events');
const repo=process.argv[2]||path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(repo,'public/game/world-lights.js'),'utf8');
const properties=new Map();let writes=0;
const world={style:{setProperty(k,v){assert.equal(k,'--gf-day-sources');properties.set(k,v);writes++;},removeProperty(k){assert.equal(k,'--gf-day-sources');properties.delete(k);},getPropertyValue:k=>properties.get(k)||''},
 getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
const doc={getElementById:id=>id==='game'?world:null,createElement(name){assert.equal(name,'canvas');return makeCanvas();}};
function makeCanvas(){return {width:800,height:600,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),getContext:()=>({
 createRadialGradient:()=>({addColorStop(){}}),fillRect(){},clearRect(){},
})};}
const env={module:{exports:{}},console,Math,Number,Object,Array,Map,Set,WeakMap,Date,document:doc,
 matchMedia:()=>({matches:false}),GoldenVisual:{hasVariant:()=>true},GoldenLighting:{exclude:n=>n._gfReliefExcluded=true},Phaser:{BlendModes:{ADD:1}}};
env.window=env;env.globalThis=env;
Object.defineProperty(env,'G',{get(){throw new Error('atmosphere projection cannot read player state');}});
vm.runInNewContext(src,env,{filename:'world-lights.js'});
const api=env.module.exports;
assert.equal(typeof api.atmosphereLayers,'function');
const eq=(a,b,msg)=>assert(Math.abs(a-b)<.011,`${msg}: ${a} != ${b}`);
function centres(css){return [...css.matchAll(/\bat\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g)].map(m=>[Number(m[1]),Number(m[2])]);}
function camera(a,b,c,d,e,f,scrollX=0,scrollY=0){return {zoom:Math.hypot(a,b),zoomX:Math.hypot(a,b),zoomY:Math.hypot(c,d),scrollX,scrollY,matrix:{transformPoint(x,y,out={}){out.x=a*x+c*y+e;out.y=b*x+d*y+f;return out;}}};}
const pool={pos:{x:100,y:200,w:8,h:12},strength:1};
const before=JSON.stringify(pool);
assert.equal(api.atmosphereLayers([],null),'','no source uses existing uniform atmosphere');
assert.equal(api.atmosphereLayers([{...pool,strength:0}],null),'','unlit source does not warm the world');
let css=api.atmosphereLayers([pool],null), pts=centres(css);
assert.equal(pts.length,1,'one projected warm pool per source');eq(pts[0][0],100,'visit world x');eq(pts[0][1],200,'visit world y');
assert.equal((css.match(/linear-gradient\(/g)||[]).length,1,'uniform base remains exactly once');assert.match(css,/var\(--gf-day-color/);
assert.equal(JSON.stringify(pool),before,'projection cannot mutate its source');
console.log('OK: world/visit projection preserves one atmosphere base');

// The camera receives scroll-adjusted world coordinates, then its full affine transform.
const panZoom=camera(2,0,0,2,30,40,10,20);
css=api.atmosphereLayers([pool],panZoom,{x:.5,y:2,ox:7,oy:11});pts=centres(css);
eq(pts[0][0],112,'pan+zoom+CSS-scale x');eq(pts[0][1],811,'pan+zoom+CSS-scale y');
const rotated=camera(0,2,-2,0,400,100,10,20);
css=api.atmosphereLayers([pool],rotated);pts=centres(css);
eq(pts[0][0],40,'camera rotation x');eq(pts[0][1],280,'camera rotation y');
assert(!/NaN|Infinity|undefined/.test(css));
console.log('OK: affine pan, zoom, rotation and CSS viewport conversion');

const imgs=[],textures=new Map(),events=new EventEmitter();
function image(x,y,key){const n={x,y,key,active:true,visible:true,alpha:1,
 setPosition(x,y){this.x=x;this.y=y;return this;},setDisplaySize(w,h){this.w=w;this.h=h;return this;},
 setAlpha(a){this.alpha=a;return this;},setVisible(v){this.visible=v;return this;},setDepth(){return this;},setBlendMode(){return this;},setRotation(){return this;},destroy(){this.active=false;this.visible=false;}};imgs.push(n);return n;}
const sc={events,add:{image},game:{canvas:makeCanvas()},scale:{width:800,height:600},cameras:{main:camera(1,0,0,1,0,0)},
 textures:{exists:k=>textures.has(k),createCanvas(k,w,h){const cv=makeCanvas();cv.width=w;cv.height=h;const t={context:cv.getContext('2d'),refresh(){},getSourceImage:()=>cv};textures.set(k,t);return t;}}};
const winKey=['barn_evo_3','barn_evo_2','barn_evo_1','barn_evo_0','cocina'].find(k=>api.profiles(k,true).some(p=>p.kind==='window'));
assert(winKey);
const sp={x:200,y:300,width:128,height:128,displayWidth:128,displayHeight:128,originX:.5,originY:1,rotation:0,flipX:false,flipY:false,visible:true,active:true,alpha:1,depth:300,
 texture:{key:winKey},frame:{cutX:0,cutY:0,cutWidth:128,cutHeight:128}};
const state={objects:[{type:'barn',sprite:sp}],adornos:[],built:{barn:true},forgeLit:false,atmosphere:{active:true,darkness:1}};
const manager=api.create(sc);manager.sync(state,1000);
assert.match(world.style.getPropertyValue('--gf-day-sources'),/radial-gradient/,'night sync writes local warmth');
const old=world.style.getPropertyValue('--gf-day-sources'),oldWrites=writes;
manager.sync(state,1001);assert.equal(writes,oldWrites,'CSS source refresh is throttled');
sp.x+=40;manager.sync(state,1100);assert.notEqual(world.style.getPropertyValue('--gf-day-sources'),old,'moving source reprojects warmth');
state.atmosphere={active:false,darkness:0};manager.sync(state,1200);assert.equal(world.style.getPropertyValue('--gf-day-sources'),'','Original removes local warmth');
state.atmosphere={active:true,darkness:1};manager.sync(state,1300);assert.match(world.style.getPropertyValue('--gf-day-sources'),/radial-gradient/);
state.objects=[];manager.sync(state,1400);assert.equal(world.style.getPropertyValue('--gf-day-sources'),'','removed objects leave no old atmospheric pool');
state.objects=[{type:'barn',sprite:sp}];manager.sync(state,1500);assert.match(world.style.getPropertyValue('--gf-day-sources'),/radial-gradient/);
events.emit('shutdown');assert.equal(world.style.getPropertyValue('--gf-day-sources'),'','scene shutdown clears atmosphere override');
manager.destroy();assert.equal(world.style.getPropertyValue('--gf-day-sources'),'');
console.log('OK: runtime CSS throttling, source movement, Original, removal and shutdown cleanup');
