'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),worldSource=fs.readFileSync(path.join(root,'public/game/reference-world.js'),'utf8'),farmSource=fs.readFileSync(path.join(root,'public/game/farm.js'),'utf8');
let on=true;
const base={TILE:42,BOSQUE:true,BOSQUE_LEYES:'cv',BOSQUE_FILA_CADA:1,BOSQUE_ESC_VAR:0,BOSQUE_JITTER_FONDO:6,BOSQUE_DENSIDAD:Object.freeze({c:.86,v:.86}),
 BOSQUE_TAM:2,BOSQUE_RT_CELDAS:3,BOSQUE_FRENTE_SOLIDO:1.5,BOSQUE_DEPTH:-999,BOSQUE_JITTER_X:0,BOSQUE_JITTER_Y:0,
 COLS_BASE:9,ROWS_BASE:9,expOwned:0,ORIG_X:0,ORIG_Y:0,WORLD_W:378,WORLD_H:378,
 despejado:(c,r)=>c>=-2&&c<11&&r>=-2&&r<11};
const ctx={console:{log(){},warn(){}},performance:{now:()=>0},GF:base,G:{plata:3,plotsOwned:3,expansiones:0},Phaser:{Scene:class{}},module:{exports:{}},GoldenVisual:{isEnabled:()=>on}};ctx.window=ctx;
vm.createContext(ctx);vm.runInContext(worldSource,ctx);vm.runInContext(farmSource+'\nthis.FarmScene=FarmScene;',ctx);
const api=ctx.GoldenReferenceWorld,initial=JSON.stringify({GF:base,G:ctx.G});
Object.freeze(base);
{
 const f=api.forestStyle(base);assert.equal(Object.getPrototypeOf(f),base);assert.equal(f.BOSQUE_LEYES,'c');assert.equal(f.BOSQUE_FILA_CADA,1);assert.equal(f.BOSQUE_ESC_VAR,.14);assert.equal(f.BOSQUE_DENSIDAD.c,.86);assert.equal(f.BOSQUE_JITTER_X,3);assert.equal(f.BOSQUE_JITTER_Y,7);assert.equal(f.BOSQUE_JITTER_FONDO,9);assert.equal(f.TILE,42);
 assert.equal(base.BOSQUE_LEYES,'cv');assert.equal(base.BOSQUE_FILA_CADA,1);on=false;assert.equal(api.forestStyle(base),base,'classic is the exact original configuration');on=true;
 for(let c=-12;c<12;c++)for(let r=-12;r<12;r++)assert.equal(JSON.stringify(api.forestSample(c,r,'c')),JSON.stringify(api.forestSample(c+8,r-16,'c')),'RT and wrapped mosaic share anchor randomness');
}
function graphics(){return{destroyed:false,setDepth(v){this.depth=v;return this;},fillStyle(){return this;},fillCircle(){return this;},destroy(){this.destroyed=true;}};}
function scene(){
 const sc=new ctx.FarmScene(),textures=new Set(['tree','grass_a']),image=()=>({width:105,height:110});
 const noop=()=>{};const canvasContext={drawImage:noop,fillRect:noop,save:noop,restore:noop,translate:noop,scale:noop};
 sc.textures={exists:k=>textures.has(k),get:k=>({getSourceImage:()=>k==='tree'?image():{width:42,height:42}}),createCanvas:k=>{textures.add(k);return{getContext:()=>canvasContext,refresh:noop};},remove:k=>textures.delete(k)};
 const chain=()=>new Proxy({},{get:(o,k)=>k==='destroy'?noop:()=>chain()});
 sc.add={tileSprite:()=>chain(),renderTexture:()=>chain(),image:()=>chain()};sc.limiteVista=()=>({x1:-300,y1:-300,x2:680,y2:680});sc.margenBosque=()=>126;
 return sc;
}
{
 const sc=scene(),sample=api.forestSample,seen=[];api.forestSample=(c,r,l)=>{seen.push([c,r,l]);return sample(c,r,l);};
 sc.fondoBosque(105,110,.72,.88);assert.equal(seen.length,64,'one canonical 8x8 mosaic, one staggered tree family per row');assert(seen.every(([c,r,l])=>l==='c'));
 seen.length=0;sc.dibujarBosque();assert(seen.length>64);assert(seen.every(([c,r,l])=>l==='c')&&seen.some(([c,r])=>r%2===1)&&seen.some(([c,r])=>r%2===0),'near forest uses the same row cadence and law');
 on=false;seen.length=0;sc.textures.remove('bosque_mosaico');sc.fondoBosque(105,110,.8,.8);sc.dibujarBosque();assert.equal(seen.length,0,'classic never uses the new anchor sampler');on=true;api.forestSample=sample;
}
function obj(type,c,r,width=2,key=type){return{type,cx:(c+.5)*42,by:r*42,w:width*42,sprite:{active:true,visible:true,alpha:1,texture:{key}}};}
const sampleScene={objs:[obj('market',5,5),obj('barn',4,2,3),obj('tree',7,7),obj('store',1,4,2,'build_store')],plots:[{cx:63,by:147,state:'dry'},{cx:105,by:147,state:'growing'},{cx:147,by:147,state:'ready'}]};
{
 const p=api.planPaths(sampleScene,base);assert(p.paths.length>=1,'starter has a route from the market to a built building');
 for(const route of p.paths)for(const point of route){assert(p.owned.has(point.cell));assert(!p.blocked.has(point.cell),'paths never cross crops, resource/building footprints or fence cells');}
 for(const pad of p.pads)for(const point of pad){assert(p.owned.has(point.cell));assert(!p.protectedRects.some(r=>point.x+p.padRadius>r.left&&point.x-p.padRadius<r.right&&point.y+p.padRadius>r.top&&point.y-p.padRadius<r.bottom),'entrance wear never touches crop/object footprints');}
 assert(!p.paths.some(route=>route[route.length-1].x<100),'unfinished smithy never receives a route');
 const absent=api.planPaths({objs:[obj('store',4,4,2,'build_store')],plots:[]},base);assert.equal(absent.paths.length,0);
 const disconnected=api.planPaths({...sampleScene,objs:[obj('market',5,5),obj('barn',4,2,3),obj('tree',7,4),obj('store',1,4,2,'build_store')]},base);assert.equal(disconnected.paths.length,0,'a blocked approach is omitted rather than painting through crops/fence');
 assert(disconnected.pads.length>0,'safe short entrance wear does not invent a connected route');
}
{
 const counters={graphics:[],timers:[],events:[]},sc={...sampleScene,add:{graphics(){const g=graphics();counters.graphics.push(g);return g;}},time:{addEvent(e){const t={...e,remove(){this.removed=true;}};counters.timers.push(t);return t;}},events:{once(name,cb){counters.events.push({name,cb});}}};
 api.attach(sc);api.attach(sc);assert.equal(counters.timers.length,1);assert.equal(counters.events.length,1);assert.equal(counters.graphics.length,1);assert.equal(counters.graphics[0].depth,-999.4);
 api.refresh(sc);assert.equal(counters.graphics.length,1,'an unchanged idle farm does not repaint paths');
 const tree=sc.objs.find(o=>o.type==='tree');tree.sprite.texture.key='tree_stump';api.refresh(sc);assert.equal(counters.graphics.length,1,'resource animations/cooldowns do not repaint unchanged paths');tree.sprite.texture.key='tree';
 on=false;api.refresh(sc);assert(counters.graphics[0].destroyed);assert.equal(counters.graphics.length,1,'classic removes paths');
 on=true;api.refresh(sc);assert.equal(counters.graphics.length,2);counters.events[0].cb();assert(counters.timers[0].removed);assert(counters.graphics[1].destroyed);api.clear(sc);
}
assert.equal(JSON.stringify({GF:base,G:ctx.G}),initial,'visual policy, forest rendering and paths do not mutate config or progression');
console.log('OK: reversible forest style, identical periodic anchor sampling and row cadence, untouched Classic, paths confined to owned free cells, unfinished buildings excluded, idle signature and shutdown cleanup without G/GF mutation');
