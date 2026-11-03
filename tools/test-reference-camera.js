'use strict';
// Exercises the real FarmScene camera methods and the real wheel handler, without Auth/save.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../public/game/farm.js'),'utf8');
const sprite=(w,h,visible=true)=>({displayWidth:w,displayHeight:h,visible,active:true});
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
  setZoom(z){this.zoom=z;return this;},centerOn(x,y){this.centers++;this.center={x,y};this.scrollX=x-width/2;this.scrollY=y-height/2;return this;}};
 const sc=new ctx.FarmScene();sc.scale={width,height};sc.cameras={main:c};sc.game={canvas:{getBoundingClientRect:()=>rect(0,0,width,height)}};sc.zoomUser=1;
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
for(const[width,height]of[[1672,948],[1346,618],[1033,700]]){
 const f=fixture(width,height);f.sc.fitCamera();fits(f.sc);assert(f.c.zoom>0&&Number.isFinite(f.c.zoom));
 const b=f.sc.referenceContentBounds();assert(b.bottom>=f.ctx.GF.ORIG_Y+f.ctx.GF.WORLD_H+42*.12,'starter includes the south fence and rim above the hotbar');assert(b.right>=378+42*.12&&b.left<=-42*.12,'starter includes the full owned footprint');
 if(height<=740){assert(f.c.zoom*42>=44&&f.c.zoom*42<=48,'short desktop prioritizes readable 44–48 px tiles');f.sc.setReferenceOverview(true);fits(f.sc);assert.equal(f.sc._referenceCameraManual,false);assert(f.c.zoom<1.14,'overview can zoom out to fit the whole farm');f.sc.setReferenceOverview(false);fits(f.sc);}
 const a=f.sc.zonaSeguraCamaraGuia();assert(a.left>=258,'shop column is reserved');
 f.setMarket(true);f.sc.refreshReferenceFraming();fits(f.sc);assert(f.sc.zonaSeguraCamaraGuia().right<=width-f.marketWidth-30,'market column is reserved');
 assert.equal(JSON.stringify(f.state),f.before,'framing never writes the game state');
}
{
 const f=fixture();f.sc.hero.visible=true;const b=f.sc.referenceContentBounds();assert(b.right>485,'visible farmer is part of the frame');
 f.sc.fitCamera();fits(f.sc);
 f.sc.hero.visible=false;assert(f.sc.referenceContentBounds().right<400,'hidden farmer never expands the crop');
 f.ctx.GF.ORIG_X=-126;f.ctx.GF.ORIG_Y=-84;f.ctx.GF.WORLD_W=714;f.ctx.GF.WORLD_H=672;f.ctx.GF.expOwned=3;
 f.sc.objs.push({cx:-90,by:-30,sprite:sprite(80,96)},{cx:540,by:550,sprite:sprite(70,78)});
 f.sc.fitCamera();fits(f.sc);assert(f.sc.referenceContentBounds().bottom<588,'expanded farms retain content framing instead of forcing every terrain edge');assert.equal(JSON.stringify(f.state),f.before,'expanded frame does not change progress');
 f.sc.setReferenceOverview(true);fits(f.sc);assert(f.sc.referenceContentBounds(true).bottom>=588+42*.12,'explicit overview includes all expanded terrain');f.sc.setReferenceOverview(false);
}
{
 const f=fixture();f.sc.fitCamera();f.sc._referenceCameraManual=true;f.c.zoom=2;f.c.scrollX=123;f.c.scrollY=-37;const calls=f.c.centers;
 f.setMarket(true);f.sc.refreshReferenceFraming();assert.equal(f.c.zoom,2);assert.equal(f.c.scrollX,123);assert.equal(f.c.scrollY,-37);assert.equal(f.c.centers,calls,'opening market never recenters a chosen view');
 const u=f.sc.zoomUser;f.sc.zoomUser=u*1.08;f.sc.fitCamera(true);assert(Math.abs(f.c.zoom-2.16)<1e-9,'explicit wheel zoom still works');assert.equal(f.c.scrollX,123);
 f.setRenewed(false);f.sc.refreshReferenceFraming();assert(Math.abs(f.c.zoom-2.16)<1e-9,'classic keeps a manually chosen absolute zoom');assert.equal(f.c.scrollX,123);assert.equal(f.c.scrollY,-37);
 f.setRenewed(true);f.sc.refreshReferenceFraming();assert(Math.abs(f.c.zoom-2.16)<1e-9,'return to renewed keeps that manual zoom');assert.equal(f.c.centers,calls);
 f.sc.stepReferenceZoom(1);assert(Math.abs(f.c.zoom-2.4192)<1e-9,'zoom button applies the intended step');assert.equal(f.c.scrollX,123);assert.equal(f.c.centers,calls,'zoom buttons do not recenter a manual view');
 f.sc.stepReferenceZoom(-1);assert(Math.abs(f.c.zoom-2.16)<1e-9);assert.equal(JSON.stringify(f.state),f.before);
}
{
 const f=fixture();f.sc.fitCamera();f.setRenewed(false);f.sc.refreshReferenceFraming();
 const expected=Math.min(1672/(378+42*4),(948-160)/(378+42*2));assert(Math.abs(f.c.zoom-expected)<1e-9,'classic uses the original zoom formula');assert.equal(f.c.center.x,189);assert.equal(f.c.center.y,189);
 const mobile=fixture(800,600);mobile.sc.fitCamera();assert.equal(mobile.sc._referenceFramingActive,undefined,'mobile never enters renewed framing');
}
{
 const f=fixture();const match=source.match(/this\.input\.on\("wheel",\s*(\(ptr, over, dx, dy\) => \{[\s\S]*?\n    \})\);/);assert(match,'real wheel handler found');
 f.ctx.clicDeInterfaz=p=>p.ui===true;f.ctx.PhaseDummy=0;vm.runInContext('this.wheel='+match[1],f.ctx);
 f.sc.cancelarCamaraGuia=()=>{};f.sc.fitCamera=()=>{throw Error('UI wheel must never zoom');};
 f.ctx.wheel.call(f.sc,{ui:true,event:{ctrlKey:true}},[],0,100);assert.equal(f.sc._referenceCameraManual,undefined);
 f.ctx.GF.uiOpen=true;f.ctx.wheel.call(f.sc,{event:{ctrlKey:false}},[],0,100);assert.equal(f.c.scrollY,0);
 assert.equal(JSON.stringify(f.state),f.before);
}
console.log('OK: reference framing fits real visible content and avatar, reserves DOM columns, handles expanded farms, preserves manual pan/zoom, restores classic/mobile and ignores UI wheel without data changes');
