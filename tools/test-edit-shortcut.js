'use strict';
// Independent tests of real initUI, the existing setEditMode and its real DOM controls.
// Synthetic context only: no network, Auth, player data or repo writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const {JSDOM}=require(root+'/node_modules/jsdom');
const html=fs.readFileSync(root+'/public/index.html','utf8');
const replace=Object.fromEntries(['main','lighting','visual-v2','reference-hud','reference-market','reference-ui','reference-camera-ui'].map(k=>['game/'+k+'.js','']));
function fixture(){
 const {ctx:c}=require(root+'/tools/arrancar-el-juego.contexto').arrancar(root,replace);
 const dom=new JSDOM(html,{url:'http://localhost/'}),w=dom.window,doc=w.document;
 c.document=doc;c.localStorage=w.localStorage;c.innerWidth=1346;c.innerHeight=800;
 c.addEventListener=w.addEventListener.bind(w);c.removeEventListener=w.removeEventListener.bind(w);c.dispatchEvent=w.dispatchEvent.bind(w);
 c.AbortController=AbortController;c.fetch=async()=>({ok:true,text:async()=>'<html><body>Visita ficticia</body></html>'});
 w.HTMLElement.prototype.scrollIntoView=function(){};
 c.refreshHud=()=>{if(c.syncEdicionAcceso)c.syncEdicionAcceso();};c.tutoSync=()=>{};
 const effects={saves:0,tutorial:[],grid:[],toasts:[]};
 c.saveFarm=()=>{effects.saves++;};c.toast=s=>effects.toasts.push(s);c.log=()=>{};c.tutoEvent=s=>effects.tutorial.push(s);
 c.GF.scene='farm';c.GF.editMode=false;c.G.editVisto=false;
 const scene={gridG:{setVisible:on=>effects.grid.push(on)},sys:{isActive:()=>true},placing:null,placingAuto:false};
 c.farmScene=c.FARM=scene;
 c.initUI();
 const button=doc.getElementById('editar-granja'),wrapper=doc.getElementById('edicion-acceso');assert(button,'new hammer button exists');assert(wrapper,'new wrapper exists');
 return{c,w,doc,dom,scene,button,wrapper,effects,run:code=>vm.runInContext(code,c),close:()=>dom.window.close()};
}
function within(fn){const f=fixture();try{fn(f);}finally{f.close();}}
function visible(f){return !f.wrapper.hidden&&!f.button.disabled;}

test('native accessible hammer is visible on the owner desktop farm',()=>within(f=>{
 assert.equal(visible(f),true);assert.equal(f.button.type,'button');assert.equal(f.button.getAttribute('aria-controls'),'editbar');assert.equal(f.button.getAttribute('aria-pressed'),'false');assert.match(f.button.getAttribute('aria-label'),/editar|mover/i);assert(f.button.querySelector('svg'));assert.match(f.button.textContent,/Editar/i);assert.equal(f.doc.querySelectorAll('#editar-granja').length,1);
}));

test('click enters and exits the existing edit mode with its original tutorial and save behavior',()=>within(f=>{
 const setter=f.c.setEditMode,calls=[];f.c.setEditMode=on=>{calls.push(on);return setter(on);};
 f.button.click();assert.equal(f.c.GF.editMode,true);assert.equal(f.button.getAttribute('aria-pressed'),'true');assert.match(f.button.textContent,/Listo|Finalizar/i);assert(f.doc.getElementById('editbar').classList.contains('show'));assert.match(f.doc.getElementById('cfg-edit').textContent,/Finalizar/i);assert.equal(f.c.G.editVisto,true);assert.deepEqual(f.effects.tutorial,['editar']);assert.equal(f.effects.saves,1);assert.equal(f.effects.grid.at(-1),true);
 f.button.click();assert.equal(f.c.GF.editMode,false);assert.equal(f.button.getAttribute('aria-pressed'),'false');assert.match(f.button.textContent,/Editar/i);assert(!f.doc.getElementById('editbar').classList.contains('show'));assert.equal(f.effects.grid.at(-1),false);assert.deepEqual(calls,[true,false]);assert.equal(f.effects.saves,1,'leaving preserves the existing save policy');
}));

test('configuration and the existing Finish button keep the hammer state in sync',()=>within(f=>{
 f.doc.getElementById('cfg-edit').click();assert.equal(f.button.getAttribute('aria-pressed'),'true');assert.match(f.button.textContent,/Listo|Finalizar/i);
 f.doc.getElementById('edit-done').click();assert.equal(f.button.getAttribute('aria-pressed'),'false');assert.match(f.button.textContent,/Editar/i);
}));

test('external placement entry through setEditMode updates the shortcut immediately',()=>within(f=>{
 f.c.setEditMode(true);assert.equal(f.button.getAttribute('aria-pressed'),'true');assert.match(f.button.getAttribute('aria-label'),/finalizar|salir/i);
 f.c.setEditMode(false);assert.equal(f.button.getAttribute('aria-pressed'),'false');
}));

test('leaving by hammer cancels the object in hand through the existing exit path',()=>within(f=>{
 f.c.setEditMode(true);const stored=JSON.stringify(f.c.G.layout);let highlight;
 f.scene.placing={tipo:'plot'};f.scene.placingAuto=true;f.scene.editHl={setVisible:on=>{highlight=on;}};
 f.button.click();assert.equal(f.scene.placing,null);assert.equal(f.scene.placingAuto,false);assert.equal(highlight,false);assert.equal(JSON.stringify(f.c.G.layout),stored);
}));

test('entry closes ordinary overlays through the existing setEditMode behavior',()=>within(f=>{
 f.doc.getElementById('ov-config').classList.add('show');f.c.GF.uiOpen=true;
 f.button.click();assert.equal(f.c.GF.editMode,true);assert.equal(f.doc.querySelectorAll('.ov.show:not(.bloquea)').length,0);
}));

test('forest and narrow viewports hide and disable the new shortcut without entering edit mode',()=>within(f=>{
 for(const state of [{width:1346,scene:'forest'},{width:899,scene:'farm'},{width:640,scene:'farm'}]){
  f.c.innerWidth=state.width;f.c.GF.scene=state.scene;f.c.syncEdicionAcceso();assert.equal(visible(f),false);
  f.button.click();assert.equal(f.c.GF.editMode,false);
 }
 f.c.innerWidth=900;f.c.GF.scene='farm';f.c.syncEdicionAcceso();assert.equal(visible(f),true);
}));

test('a stale direct handler is guarded if the player has changed to the forest',()=>within(f=>{
 f.c.GF.scene='forest';const before=JSON.stringify(f.c.G);f.button.onclick({preventDefault(){},stopPropagation(){}});assert.equal(f.c.GF.editMode,false);assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,0);
}));

test('availability fails safely while the setter is unavailable',()=>within(f=>{
 const original=f.c.setEditMode;f.c.setEditMode=undefined;assert.equal(f.c.edicionAccesoDisponible(),false);f.c.syncEdicionAcceso();assert.equal(visible(f),false);f.button.click();assert.equal(f.effects.saves,0);
 f.c.setEditMode=original;f.c.syncEdicionAcceso();assert.equal(visible(f),true);
}));

test('visiting another farm hides the parent shortcut and returning restores it immediately',()=>within(f=>{
 assert.equal(typeof f.c.visitaAbrir,'function');f.c.vipVigente=()=>true;f.run('UID="qa-edit-shortcut";');
 f.c.visitaAbrir({id:'other',nombre:'Granja ficticia',mapa:{}});assert.equal(visible(f),false);assert.equal(f.c.edicionAccesoDisponible(),false);
 f.button.click();assert.equal(f.c.GF.editMode,false);assert.equal(f.effects.saves,0);
 f.c.visitaCerrar();assert.equal(visible(f),true);
}));

test('repeated presentation sync does not change the game or invoke save or tutorial actions',()=>within(f=>{
 const before=JSON.stringify(f.c.G);for(let i=0;i<25;i++)f.c.syncEdicionAcceso();assert.equal(JSON.stringify(f.c.G),before);assert.equal(f.effects.saves,0);assert.deepEqual(f.effects.tutorial,[]);
}));

test('the hammer is placed on the right between save and camera controls with clear gaps',()=>{
 const dom=new JSDOM(html),doc=dom.window.document,rules=[];
 function walk(list){for(const rule of list){if(rule.selectorText)rules.push(rule);else if(rule.cssRules)walk(rule.cssRules);}}
 for(const style of doc.querySelectorAll('style'))if(style.sheet)walk(style.sheet.cssRules);
 const declaration=(selector,name)=>{let v='';for(const rule of rules)if(rule.selectorText===selector&&rule.style.getPropertyValue(name))v=rule.style.getPropertyValue(name);return v;};
 assert.equal(declaration('#edicion-acceso','right'),'16px');assert.equal(declaration('#editar-granja','width'),'44px');assert.equal(declaration('#editar-granja','height'),'44px');
 const bottom=parseFloat(declaration('#edicion-acceso','bottom')),saveBottom=parseFloat(declaration('#guardado-manual','bottom'));
 assert(bottom>=saveBottom+44+8,'separation from the save icon');assert(bottom+44<=126-8,'separation from the existing camera controls');
 dom.window.close();
});

test('blocking training overlay keeps its modality even if the shortcut handler is called directly',()=>within(f=>{
 const overlay=f.doc.getElementById('ov-entrenando');overlay.classList.add('show');f.c.syncEdicionAcceso();
 assert.equal(f.c.edicionAccesoDisponible(),false);assert.equal(visible(f),false);
 f.button.onclick({preventDefault(){},stopPropagation(){}});assert.equal(f.c.GF.editMode,false);assert(overlay.classList.contains('show'));assert.equal(f.effects.saves,0);
}));
