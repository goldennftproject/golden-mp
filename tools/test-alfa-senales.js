'use strict';
const assert=require('node:assert/strict'),path=require('path'),vm=require('vm');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'),{'game/main.js':''});
(async()=>{
 await c.SAVE_READY;c.innerWidth=1360;c.GF.uiOpen=false;c.GF.editMode=false;c.GF.CAM_PAN=true;c.guiaActiva=()=>({id:'brujula',brujula:true});c.tutoActivo=()=>null;
 const proto=vm.runInContext('FarmScene.prototype',c),marks=[];let pans=0,stops=0;
 const mark={setStrokeStyle(){return this;},setDepth(){return this;},destroy(){}};
 const scene={updateTutoArrow(){this.guiaTarget={x:1100,y:300,bottomY:380};},cancelarCamaraGuia(){},add:{rectangle(...a){marks.push(a);return mark;}},tweens:{add(){}},time:{delayedCall(){}},zonaSeguraCamaraGuia:()=>({left:0,right:800,top:70,bottom:530}),cameras:{main:{width:800,height:600,zoom:1,scrollX:0,scrollY:0,worldView:{x:0,y:0},midPoint:{x:400,y:300},pan(){pans++;},panEffect:{isRunning:true,stop(){stops++;}}}}};
 assert.equal(proto.mostrarDestinoGuia.call(scene),true);assert.equal(scene._tutoCamPending.manual,true);assert.equal(marks.length,1);
 scene.cameras.main.panEffect.isRunning=false;proto.tickCamaraGuia.call(scene,Date.now()+10000);assert.equal(pans,1,'la brújula sólo mueve cámara por petición explícita');
 scene.cameras.main.panEffect.isRunning=true;proto.cancelarCamaraGuia.call(scene,true);assert.equal(stops,1,'el gesto del jugador interrumpe la ayuda');
 const texts=[];const text=()=>({visible:true,setOrigin(){return this;},setDepth(){return this;},setText(s){this.text=s;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setVisible(v){this.visible=v;return this;}});
 const barn={type:'barn',sprite:{x:200,y:180,visible:true}},market={type:'market',sprite:{x:300,y:280,visible:true}},hidden={type:'store',oculto:true,sprite:{x:600,y:280,visible:false}};
 const sc={objs:[barn,market,hidden],add:{text(){const t=text();texts.push(t);return t;}}};c.G.built.barn=true;proto.rotulosEdificios.call(sc);assert.equal(texts.length,2);
 barn.sprite.x=450;proto.rotulosEdificios.call(sc);assert.equal(texts.length,2,'reutiliza rótulos');assert.equal(barn._rotulo.x,450,'sigue al edificio real');
 c.GF.editMode=true;proto.rotulosEdificios.call(sc);assert.equal(barn._rotulo.visible,false);c.GF.editMode=false;c.innerWidth=600;proto.rotulosEdificios.call(sc);assert.equal(barn._rotulo.visible,false);
 console.log('OK: mostrar destaca y localiza sin actuar, cámara cancelable, rótulos reutilizados, posición/ocultación y edición respetadas.');
})().catch(e=>{console.error(e);process.exitCode=1;});
