'use strict';
// Exercises the real FarmScene camera methods and the real wheel handler, without Auth/save.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.GF_TEST_FARM||path.join(__dirname,'../public/game/farm.js'),'utf8');
const sprite=(w,h,visible=true)=>({displayWidth:w,displayHeight:h,visible,active:true});
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-9,message||'camera coordinate is preserved');
function fixture(width=1672,height=948){
 let renewed=true,market=false;
 const marketWidth=width>=1500?460:width>=1250?410:370;
 const state={level:1,plotsOwned:3,expansiones:0,layout:{},energy:{value:50}};
 const before=JSON.stringify(state);
 const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top});
 const regions={'.hudbar':rect(12,10,width-12,88),'#tuto':rect(375,108,width-480,166),
  '#hotwrap':rect(width/2-340,height-98,width/2+340,height-10),'#compras-accesos':rect(18,180,246,660)};
 const doc={querySelector(sel){if(sel==='#game canvas')return{getBoundingClientRect:()=>rect(0,0,width,height)};
   if(sel==='#ov-market.show>.card:not(.movida)')return market?{getBoundingClientRect:()=>rect(width-marketWidth-18,150,width-18,height-120)}:null;
   return regions[sel]?{getBoundingClientRect:()=>regions[sel],classList:{contains:()=>false}}:null;}};
 const ctx={console,document:doc,window:{GoldenVisual:{isEnabled:()=>renewed}},G:state,
  GF:{TILE:42,CAM_PAN:true,BOSQUE:true,MAPA:1600,ORIG_X:0,ORIG_Y:0,WORLD_W:378,WORLD_H:378,espacioV:3,expOwned:0},
  Phaser:{Scene:class{},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}}};
 vm.createContext(ctx);vm.runInContext(source+'\nthis.FarmScene=FarmScene;',ctx);
 const c={width,height,x:0,y:0,zoom:1,scrollX:0,scrollY:0,centers:0,
  setZoom(z){this.zoom=z;return this;},
  setBounds(x,y,w,h){this.bounds={x,y,width:w,height:h};return this;},
  clampAxis(v,axis){const length=axis==='x'?this.width:this.height,display=length/this.zoom,b=this.bounds;const start=b[axis]+(display-length)/2,end=Math.max(start,start+(axis==='x'?b.width:b.height)-display);return Math.max(start,Math.min(v,end));},
  preRender(){this.scrollX=this.clampAxis(this.scrollX,'x');this.scrollY=this.clampAxis(this.scrollY,'y');this.center={x:this.scrollX+this.width/2,y:this.scrollY+this.height/2};return this;},
  centerOn(x,y){this.centers++;this.scrollX=x-this.width/2;this.scrollY=y-this.height/2;return this.preRender();}};
 c.setBounds(-595,-595,1568,1568);
 const sc=new ctx.FarmScene();sc.scale={width,height};sc.cameras={main:c};sc.game={canvas:{getBoundingClientRect:()=>rect(0,0,width,height)}};sc.zoomUser=1;sc.camLim=Object.freeze(sc.limiteVista());
 sc.objs=[{type:'barn',cx:164,by:115,sprite:sprite(105,104)},{type:'tree',cx:315,by:210,sprite:sprite(70,80)},
  {type:'rock',cx:324,by:265,sprite:sprite(50,50)},{cx:10000,by:10000,sprite:sprite(100,100),oculto:true},
  {cx:-10000,by:-10000,sprite:sprite(100,100,false)}];
 sc.plots=[{cx:84,by:165,state:'dry',ground:sprite(42,42),spr:sprite(28,28,false)},
  {cx:126,by:165,state:'growing',ground:sprite(42,42),spr:sprite(42,60)},
  {cx:9000,by:9000,state:'locked',ground:sprite(42,42),spr:sprite(42,42)}];
 sc.portal={cx:275,by:345,sprite:sprite(60,65)};
 sc.hero=Object.assign(sprite(30,45,false),{x:470,y:320});
 return{ctx,sc,c,state,before,regions,marketWidth,setRenewed:v=>renewed=v,setMarket:v=>market=v};
}
function projected(sc,p){const c=sc.cameras.main;return{x:c.width/2+(p.x-c.center.x)*c.zoom,y:c.height/2+(p.y-c.center.y)*c.zoom};}
function fits(sc){const b=sc.scale.height<=740&&!sc._referenceOverview?sc.referenceCoreBounds():sc.referenceContentBounds(sc._referenceOverview),safe=sc.zonaSeguraCamaraGuia();for(const p of [{x:b.left,y:b.top},{x:b.right,y:b.bottom}]){const v=projected(sc,p);assert(v.x>=safe.left-1&&v.x<=safe.right+1,'visible content fits horizontal safe area');assert(v.y>=safe.top-1&&v.y<=safe.bottom+1,'visible content fits vertical safe area');}}
let cases=0;
for(const[width,height]of[[1352,600],[1366,500],[900,500],[1280,720],[1672,941],[1920,1080]]){
 const f=fixture(width,height);
 // A taller built barn is a real content bound, rather than an invented zoom constant.
 f.sc.objs[0].sprite.displayHeight=195;
 f.sc.fitCamera();fits(f.sc);
 const originalBounds=JSON.stringify(f.sc.limiteVista());
 if(height<=600)assert(f.c.zoom<1.05,'short windows may zoom below the old minimum to keep content visible');
 f.setMarket(true);f.sc.refreshReferenceFraming();fits(f.sc);
 assert.equal(JSON.stringify(f.state),f.before,'automatic framing never mutates the farm');
 f.sc.setReferenceOverview(true);fits(f.sc);assert.equal(f.sc._referenceCameraManual,false);
 f.sc.setReferenceOverview(false);fits(f.sc);cases++;
 assert.equal(JSON.stringify(f.sc.limiteVista()),originalBounds,'camera bounds never expand the game terrain');
}
{
 const f=fixture(1352,600);f.sc.fitCamera();f.sc._referenceCameraManual=true;f.c.zoom=1.8;f.c.scrollX=123;f.c.scrollY=-37;const centers=f.c.centers;
 f.setMarket(true);f.sc.refreshReferenceFraming();assert.equal(f.c.zoom,1.8);assert.equal(f.c.scrollX,123);assert.equal(f.c.scrollY,-37);assert.equal(f.c.centers,centers);
 f.sc.scale.height=500;f.c.height=500;f.sc.refreshReferenceFraming();assert.equal(f.c.zoom,1.8,'resize preserves manual absolute zoom');assert.equal(f.c.centers,centers);
 const u=f.sc.zoomUser;f.sc.zoomUser=u*1.08;f.sc.fitCamera(true);assert(Math.abs(f.c.zoom-1.944)<1e-9,'explicit zoom remains available');cases++;
}
{
 const f=fixture(1352,500);f.sc.fitCamera();f.sc._referenceCameraManual=true;f.c.zoom=.6;
 f.c.scrollX=123;f.c.scrollY=-37;const centers=f.c.centers;
 // Phaser also clamps on render, not only in centerOn. A larger window must not shift
 // the chosen view when it becomes physically wider than the previous camera bounds.
 f.sc.scale.width=2200;f.c.width=2200;f.sc.refreshReferenceFraming();f.c.preRender();
 near(f.c.zoom,.6);near(f.c.scrollX,123);near(f.c.scrollY,-37);assert.equal(f.c.centers,centers);
 const stable={...f.c.bounds};f.sc.refreshReferenceFraming();f.c.preRender();
 for(const k of ['x','y','width','height'])near(f.c.bounds[k],stable[k],'repeated refreshes do not accumulate camera range');
 f.sc.stepReferenceZoom(1);f.sc.refreshReferenceFraming();f.c.preRender();
 near(f.c.scrollX,123);near(f.c.scrollY,-37);assert.equal(f.c.centers,centers,'manual zoom never recenters');
 assert.equal(JSON.stringify(f.state),f.before);cases++;
}
{
 const f=fixture();f.sc.fitCamera();f.setRenewed(false);f.sc.refreshReferenceFraming();
 const expected=Math.min(1672/(378+42*4),(948-160)/(378+42*2));assert(Math.abs(f.c.zoom-expected)<1e-9,'Classic formula is unchanged');
 const L=f.sc.limiteVista();assert.deepEqual(f.c.bounds,{x:L.x1,y:L.y1,width:L.x2-L.x1,height:L.y2-L.y1},'automatic Classic restores original camera limits');
 const short=fixture(1352,500);short.sc.fitCamera();
 assert(short.c.bounds.width>short.sc.camLim.x2-short.sc.camLim.x1,'short automatic view actually expands the camera viewport');
 const physical=short.sc.camLim;short.setRenewed(false);short.sc.refreshReferenceFraming();
 assert.deepEqual(short.c.bounds,{x:physical.x1,y:physical.y1,width:physical.x2-physical.x1,height:physical.y2-physical.y1},'leaving the short automatic view removes its temporary camera range');
 assert.equal(short.sc.camLim,physical,'the physical map bounds retain their identity');
 short.setRenewed(true);short.sc.refreshReferenceFraming();fits(short.sc);
 const mobile=fixture(800,600);mobile.sc.fitCamera();assert.equal(mobile.sc._referenceFramingActive,undefined,'mobile never enters this framing');cases++;
}
console.log('OK '+cases+' adaptive camera scenarios: true safe bounds at600/500px, Market reservation, overview, manual pan/zoom, Classic/mobile and no state writes.');
