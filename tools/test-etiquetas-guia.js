'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'https://golden.test/'}),doc=dom.window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});
const run=s=>vm.runInContext(s,c),fixed=Date.parse('2026-11-05T12:00:00Z');
let effects=0,opened=[],scrolled=[],worldShown=0,selected=[];
dom.window.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this.id||this.getAttribute('data-cook'));};
(async()=>{
 await c.SAVE_READY;c.document=doc;c.innerWidth=1360;c.nowMs=()=>fixed;
 c.isOpen=id=>!!doc.getElementById(id)?.classList.contains('show');c.placeTuto=()=>{};c.placeToast=()=>{};
 for(const name of ['cook','cookCollect','obraDepositar','obraColocar','saveFarm','economiaSolicitar','logroCobrar','jornadaReclamar'])c[name]=()=>{effects++;};
 c.fetch=()=>{effects++;throw new Error('Mostrar no debe consultar la red');};
 c.openOv=id=>{opened.push(id);doc.getElementById(id)?.classList.add('show');if(id==='ov-cocina')c.refreshCooking();};
 c.closeOv=id=>doc.getElementById(id)?.classList.remove('show');
 const choose=c.ckElegir;c.ckElegir=id=>{selected.push(id);return choose(id);};
 c.farmScene={nodoGuiaEnEspera:()=>false,mostrarDestinoGuia:()=>{worldShown++;return true;}};
 const button=doc.getElementById('tuto-ir');
 function base(id){
  c.estadoDeCero();c.GF.scene='farm';c.GF.editMode=false;c.GF.uiOpen=false;
  c.G.tuto={step:run('tutoIdx('+JSON.stringify(id)+')'),done:false,n:0,v:15};
  c.G.level=10;c.G.skills.cooking=0;c.G.res={papa:3,carne:2,madera:50,piedra:50};c.G.dishes={};c.G.cooking=[];
  c.G.built={store:true,horno:true,cocina:true};c.G.obras={store:{col:5,row:5},horno:{col:7,row:5},cocina:{col:9,row:5}};
  c.G.obraDep={};c.G.planos={store:1,horno:1,cocina:1};c.G.seeds={papa:1};
  c.farmScene.nodoGuiaEnEspera=()=>false;opened=[];scrolled=[];selected=[];worldShown=0;effects=0;
  doc.querySelectorAll('.ov.show').forEach(el=>el.classList.remove('show'));
 }
 function refresh(expected,label){
  const before=JSON.stringify(c.G);c.tutoRefresh();
  assert.equal(button.textContent,expected,label);assert.equal(button.hidden,false,label+' · visible');
  assert.equal(button.onclick,c.mostrarObjetivo,label+' · conserva el callback');
  assert.ok(button.getAttribute('aria-label').startsWith(expected),label+' · nombre accesible coincide con la acción');
  assert.equal(JSON.stringify(c.G),before,label+' · refrescar no cambia la partida');assert.equal(effects,0,label+' · sin operaciones');
 }
 function show(label){const before=JSON.stringify(c.G);button.onclick();assert.equal(JSON.stringify(c.G),before,label+' · mostrar no cambia la partida');assert.equal(effects,0,label+' · no fabrica/cocina/cobra/guarda');}

 for(const [id,type,label]of [['build_store','store','Ver Herrería'],['build_horno','horno','Ver Horno'],['build_cocina','cocina','Ver Cocina']]){
  base(id);c.G.built[type]=false;c.G.obraDep[type]={madera:1};refresh(label,id+' · obra parcial');show(id);
  assert.equal(worldShown,1,'la construcción sigue señalándose en el mundo');assert.deepEqual(opened,[],'no abre otro panel ni deposita materiales');
 }

 base('cook');c.G.res.papa=0;refresh('Ver receta','Cocina sin ingrediente');show('Cocina sin ingrediente');
 assert.deepEqual(opened,['ov-cocina']);assert.deepEqual(selected,['papa_asada'],'elige la receta que la guía ya declaraba');
 assert.ok(doc.querySelector('[data-cook="papa_asada"]')?.disabled,'mantiene el impedimento real por falta de papa');
 assert.ok(scrolled.includes('papa_asada'),'sitúa el control de la receta, sin pulsarlo');

 base('cook');c.G.cooking=[{id:'papa_asada',endAt:fixed+180000,total:180000,listo:false}];c.refreshCooking();
 refresh('Ver olla','Papa Asada en curso');show('Papa Asada en curso');
 assert.deepEqual(selected,[],'no selecciona ni encola otra receta al mostrar la olla');assert.ok(scrolled.includes('ck-cola'),'el destino real es la cola');
 base('cook');c.G.cooking=[{id:'papa_asada',endAt:fixed-1,total:180000,listo:true}];c.refreshCooking();
 refresh('Ver plato listo','Papa Asada lista');show('Papa Asada lista');
 assert.ok(scrolled.includes('ck-recoger'),'señala el botón de recoger');assert.equal(doc.activeElement.id,'ck-recoger','foco en el control existente, sin recoger');

 base('wood_st');c.G.built.store=false;c.G.res.madera=0;c.G.plots=[{state:'dry'}];c.farmScene.nodoGuiaEnEspera=()=>true;
 refresh('Mostrar parcelas','árbol agotado con semilla para plantar');assert.equal(c.guiaDestinoActual().target,'plot');show('desvío a parcelas');assert.equal(worldShown,1);
 c.G.plots=[{state:'growing',cropKey:'papa',readyAt:fixed+60000}];c.G.seeds={};c.G.res.papa=0;refresh('Ver cultivos','desvío a cultivos creciendo');

 base('cook');c.GF.scene='forest';refresh('Ver mapa','fuera de la granja');show('fuera de la granja');assert.deepEqual(opened,['ov-mapa'],'el texto refleja el callback existente de viaje');
 c.GF.scene='farm';
 const fallback=[
  [{target:'plot',guiaPlot:'dry'},'Mostrar parcelas'],[{target:'plot',guiaPlot:'growing'},'Ver cultivos'],
  [{panel:'ov-cobertizo',ui:'[data-plano="store"]',target:'store'},'Mostrar acción'],
  [{target:'market',panel:'ov-market',ui:'#vb-papa'},'Mostrar acción'],[{target:'tree'},'Mostrar destino'],[{panel:'ov-inv'},'Abrir menú'],
  [{target:'store',panel:'ov-forge',ui:'[data-ctool="axe"]'},'Ver Herrería'],[{target:'horno',panel:'ov-horno'},'Ver Horno']
 ];
 for(const [dest,label]of fallback)assert.equal(c.guiaEtiquetaMostrar(dest),label,'fallback/subdestino '+JSON.stringify(dest));
 // El destino combinado manda: el nombre de un edificio del paso base no pisa el subobjetivo.
 const actual=c.guiaActiva,sub=c.tutoSub;c.guiaActiva=()=>({id:'build_store',target:'store',txt:'Obra de la Herrería',n:1});
 c.tutoSub=()=>({txt:'Vende papas',target:'market',panel:'ov-market',ui:'#vb-papa'});refresh('Mostrar acción','subdestino Mercado sobre paso de obra');
 c.guiaActiva=actual;c.tutoSub=sub;
 dom.window.close();
 console.log('OK: etiquetas contextuales y aria-label del callback real; obras parciales, receta faltante, olla, plato listo, destino combinado, parcelas en espera, mapa y fallbacks; sin cocinar/construir/cobrar/guardar al mostrar.');
})().catch(e=>{dom.window.close();console.error(e);process.exitCode=1;});
