'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),server=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');
const c={num:x=>Math.max(0,Number(x)||0)};vm.createContext(c);vm.runInContext(server.slice(server.indexOf('function visitaVista('),server.indexOf('function visitaOperacion('))+';this.vista=visitaVista',c);
const states=['growing','ready','withered','empty'],data={level:3,espacioV:3,expansiones:0,plotsOwned:4,plots:states.map(state=>({state,cropKey:'papa',readyAt:999999,growTotal:4000})),layoutPlots:Object.fromEntries(states.map((s,i)=>[i,{col:i+1,row:2}])),produccion:{nodos:{}},built:{}};
const view=c.vista({user_id:'otro',name:'Dueño',data}),before=JSON.stringify(data);assert(!JSON.stringify(view.parcelas).includes('readyAt'),'no se publica un reloj nuevo');assert(!JSON.stringify(view.parcelas).includes('growTotal'));
const dom=new JSDOM('<div id="titulo"></div><div id="estado"></div><button id="volver"></button><button id="semilla"></button><div id="mundo"></div><canvas id="lienzo"></canvas>',{runScripts:'outside-only'}),w=dom.window,draws=[],requests=[];
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({drawImage:(im,...p)=>draws.push({src:im.src,p})},{get:(t,k)=>t[k]||(()=>{})});
w.Image=class{constructor(){this.width=42;this.height=42;}set src(v){this._src=v;requests.push(v);const dims=v.includes('cropm_papa')?[148,96]:v.includes('cropg_papa')?[151,115]:v.includes('withered')?[87,99]:[42,42];[this.width,this.height]=dims;this.onload();}get src(){return this._src;}};
w.eval(fs.readFileSync(path.join(root,'public/game/config.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'public/game/visita-mapa.js'),'utf8'));
(async()=>{await w.eval('dibujar('+JSON.stringify(view)+')');
 const growing=draws.find(d=>d.src==='assets/farm/cropm_papa.png'),ready=draws.find(d=>d.src==='assets/farm/cropg_papa.png'),withered=draws.find(d=>d.src==='assets/farm/withered.png');
 for(const [draw,scale,dims]of [[growing,.96,[148,96]],[ready,1.02,[151,115]],[withered,.59,[87,99]]]){assert(draw,'cada estado tiene su imagen de campo');assert(Math.abs(draw.p[2]-42*scale)<1e-9);assert(Math.abs(draw.p[3]-42*scale*dims[1]/dims[0])<1e-9,'conserva proporción del lienzo');}
 assert.equal(draws.filter(d=>/\/(crop[gm]_papa|withered)\.png$/.test(d.src)).length,3,'empty no muestra planta');assert(!requests.includes('assets/farm/crop_papa.png'),'ready no utiliza el icono de inventario');assert.equal(w.G,undefined);assert.equal(JSON.stringify(data),before,'render de visita no cambia el guardado ni progreso');dom.window.close();console.log('OK: growing/intermedio, ready/maduro, withered/marchito y empty/vacío; escalas de Farm sin relojes nuevos ni cambios de progreso');
})().catch(e=>{console.error(e);process.exitCode=1;});
