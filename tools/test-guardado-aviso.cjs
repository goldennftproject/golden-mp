const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..'),dir=process.env.GF_ROUTINE_CANDIDATE;
const source=name=>fs.readFileSync(path.join(dir||path.join(repo,'public'),name),'utf8');
const save=dir&&fs.existsSync(path.join(dir,'save.js'))?source('save.js'):fs.readFileSync(path.join(repo,'public/game/save.js'),'utf8');
const {ctx:c}=require(path.join(repo,'tools/arrancar-el-juego.contexto')).arrancar(repo,{'game/main.js':'','game/save.js':save.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();'),'game/ui.js':source('game/ui.js')});
const {JSDOM}=require(path.join(repo,'node_modules/jsdom')),dom=new JSDOM(source('index.html'));
c.document=dom.window.document;const run=s=>vm.runInContext(s,c),timers=new Map();let next=0;
c.setTimeout=(fn,ms)=>{timers.set(++next,{fn,ms});return next;};c.clearTimeout=id=>timers.delete(id);c.placeSaveIndPc=()=>{};
const indicator=c.document.getElementById('saveind'),button=c.document.getElementById('gm-guardar'),text=()=>c.document.getElementById('gm-guardado').textContent;
const report={checkedAt:new Date().toISOString(),scope:'synthetic DOM and guard state only; no remote calls',checks:[]};
async function test(name,fn){await fn();report.checks.push({name,passed:true});}
(async()=>{
 run("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_CONFLICTOS.clear();SAVE_CONFIRMACIONES.clear();MERCADO_EN_CURSO=null;SAVE_EN_CURSO=null;");
 await test('Conflicto permanece visible, disquete informa error y no programa ocultación',()=>{
  run("SAVE_CONFLICTOS.add('qa')");c.showSaveError();assert(indicator.classList.contains('save-blocked'));assert.match(indicator.textContent,/Guardado detenido/);assert.equal(dom.window.getComputedStyle(indicator).display,'flex');assert.equal(timers.size,0);assert.equal(button.dataset.estado,'error');assert.match(button.title,/Conserva esta pestaña/);
 });
 await test('Una confirmación posterior elimina el aviso persistente sin alterar diseño ordinario',()=>{
  run("SAVE_CONFLICTOS.clear()");c.estadoGuardar('ok','Versión del servidor recuperada');assert(!indicator.classList.contains('save-blocked'));assert.equal(button.dataset.estado,'ok');assert.equal(dom.window.getComputedStyle(indicator).display,'none');
 });
 await test('ACK antiguo con snapshot aún pendiente no se anuncia como guardado manual completo',async()=>{
  c.guardadoTienePendiente=()=>true;c.saveFarm=async()=>run("SAVE_CONFIRMACIONES.set('qa',1)");await c.guardarAhora();assert.equal(button.dataset.estado,'error');assert(!/Guardado confirmado/.test(text()));assert(!button.disabled);
 });
 await test('Confirmación manual completa sigue disponible',async()=>{
  c.guardadoTienePendiente=()=>false;c.saveFarm=async()=>run("SAVE_CONFIRMACIONES.set('qa',2)");await c.guardarAhora();assert.equal(button.dataset.estado,'ok');assert.match(text(),/Guardado confirmado/);
 });
 await test('Conflicto pide consentimiento antes de sustituir la sesión; no atribuye causa a otras pestañas',async()=>{
  let question,restores=0;c.askConfirm=(message)=>{question=message;};c.recuperarGuardadoServidor=async()=>restores++;run("SAVE_CONFLICTOS.add('qa')");await c.guardarAhora();assert.equal(restores,0);assert.match(question,/cambios locales pendientes no se fusionan/);assert(!/Cierra otras sesiones/.test(question));
 });
 report.passed=true;
})().catch(e=>{report.error=e.stack;process.exitCode=1;}).finally(()=>{dom.window.close();if(process.env.GF_TEST_REPORT)fs.writeFileSync(process.env.GF_TEST_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));});
