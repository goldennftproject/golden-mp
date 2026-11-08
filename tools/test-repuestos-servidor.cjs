'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const fixture=fs.readFileSync(path.join(root,'tools/test-guardado-atomico.js'),'utf8').split('(async()=>{')[0];
const {servidor,inicial,base}=new Function('require','__dirname',fixture+';return {servidor,inicial,base};')(require,path.join(root,'tools'));
const clone=x=>JSON.parse(JSON.stringify(x));
const prize={dur:80,custom:{origen:'ruleta',marcas:['a','b']}};
const active={dur:13,plus:3,sockets:{0:'fuego'},historico:{mantener:true}};
const arm={kind:'arm',item:'espada_madera',qty:1,payload:prize};
function row(extra={}){return {...clone(inicial),data:{...clone(inicial.data),weapons:{espada_madera:clone(active)},gear:{arma:'espada_madera',casco:'cuero',municion:true},res:{madera:22},mkPend:[clone(arm)],weaponSpares:{},weaponSparesOps:[],...clone(extra)}};}
const op='11111111-1111-4111-8111-111111111111',op2='22222222-2222-4222-8222-222222222222';
function request(baseVersion=base,id='r-one',operation=op){return {cuenta:'qa',base:baseVersion,op:operation,repuesto:{id}};}

test('reclama una copia exacta sin alterar el arma activa, y acepta dos premios idénticos con multiplicidad',async()=>{
  const old=row(),s=servidor(old),next=clone(old.data);
  next.mkPend=[];next.weaponSpares={'r-one':{key:'espada_madera',w:clone(prize)}};
  assert.equal((await s.call({base,data:next})).status,200);
  assert.deepEqual(s.row().data.weapons,old.data.weapons);assert.deepEqual(s.row().data.weaponSpares,next.weaponSpares);
  const two=row({mkPend:[arm,arm]}),ss=servidor(two),both=clone(two.data);
  both.mkPend=[];both.weaponSpares={'r-one':{key:'espada_madera',w:clone(prize)},'r-two':{key:'espada_madera',w:clone(prize)}};
  assert.equal((await ss.call({base,data:both})).status,200);assert.equal(Object.keys(ss.row().data.weaponSpares).length,2);
});

test('rechaza inventar, inflar, copiar dos veces o cambiar la ficha de una entrega',async()=>{
  const old=row();
  const entry={key:'espada_madera',w:clone(prize)};
  const forged=[
    {mkPend:[arm],weaponSpares:{'r-one':entry}},
    {mkPend:[],weaponSpares:{'r-one':entry,'r-two':entry}},
    {mkPend:[],weaponSpares:{'r-one':{...entry,w:{...prize,dur:999}}}},
    {mkPend:[],weaponSpares:{'r-one':{...entry,key:'espada_oro'}}},
    {mkPend:[],weaponSpares:{'r-one':{...entry,w:{dur:80}}}},
    {mkPend:[],weaponSpares:{['r-'+ 'x'.repeat(79)]:entry}},
    {mkPend:[],weaponSpares:{'r-one':{key:'constructor',w:clone(prize)}}},
    {mkPend:[],weaponSpares:{'r-one':{...entry,extra:true}}}
  ];
  for(const changes of forged){const s=servidor(old);assert.equal((await s.call({base,data:{...clone(old.data),...changes}})).status,409);assert.equal(s.writes(),0);}
  const qty=row({mkPend:[{...arm,qty:2}]}),s=servidor(qty);
  assert.equal((await s.call({base,data:{...clone(qty.data),mkPend:[],weaponSpares:{'r-one':entry}}})).status,409);
});

test('no modifica ni elimina copias aceptadas o sus recibos; omitir campos conserva ambos',async()=>{
  const old=row({weaponSpares:{'r-one':{key:'espada_madera',w:prize}},weaponSparesOps:[{op,id:'r-old'}]});
  for(const changes of [{weaponSpares:{}},{weaponSpares:null},{weaponSpares:[]},{weaponSpares:{'r-one':{key:'espada_madera',w:{dur:80}}}},{weaponSparesOps:[]},{weaponSparesOps:[{op,id:'r-other'}]}]){
    const s=servidor(old);assert.equal((await s.call({base,data:{...clone(old.data),...changes}})).status,409);assert.equal(s.writes(),0);
  }
  const s=servidor(old),next=clone(old.data);delete next.weaponSpares;delete next.weaponSparesOps;
  assert.equal((await s.call({base,data:next})).status,200);assert.deepEqual(s.row().data.weaponSpares,old.data.weaponSpares);assert.deepEqual(s.row().data.weaponSparesOps,old.data.weaponSparesOps);
});

test('un cliente anterior sin los campos no recibe defaults nuevos que cambien la huella tras perder un ACK',async()=>{
  const old=row();delete old.data.weaponSpares;delete old.data.weaponSparesOps;
  const s=servidor(old),body={base,op:'legacy-save-retry',data:clone(old.data)};
  const first=await s.call(body);assert.equal(first.status,200);const confirmed=clone(s.row());
  assert.equal(Object.hasOwn(confirmed.data,'weaponSpares'),false);assert.equal(Object.hasOwn(confirmed.data,'weaponSparesOps'),false);
  const retry=await s.call(body);assert.equal(retry.status,200);assert.equal((await retry.json()).repetido,true);assert.equal(s.writes(),1);assert.deepEqual(s.row(),confirmed);
});

test('la comparación conserva metadata y no depende del orden de claves JSON ni impide desgaste legítimo',async()=>{
  const old=row(),s=servidor(old),next=clone(old.data);next.weapons.espada_madera.dur--;
  next.mkPend=[];next.weaponSpares={'r-one':{w:{custom:{marcas:['a','b'],origen:'ruleta'},dur:80},key:'espada_madera'}};
  assert.equal((await s.call({base,data:next})).status,200);assert.equal(s.row().data.weapons.espada_madera.dur,12);
});

test('el cambio autoritativo conserva ambas fichas enteras, equipo ajeno y todo el resto del progreso',async()=>{
  const old=row({weaponSpares:{'r-one':{key:'espada_madera',w:prize}}}),s=servidor(old);
  const response=await s.call(request());assert.equal(response.status,200);const result=await response.json(),expected=clone(old.data);
  expected.weapons.espada_madera=clone(prize);expected.weaponSpares['r-one'].w=clone(active);expected.weaponSparesOps=[{op,id:'r-one'}];
  assert.deepEqual(result.data,expected);assert.deepEqual(s.row().data,expected);
  assert.equal((await s.call({base:result.updated_at,data:clone(result.data)})).status,200,'el siguiente guardado ordinario conserva el libro');
});

test('si falta el arma activa, retira sólo el repuesto elegido y lo equipa sin perder otras copias',async()=>{
  const old=row({weapons:{},gear:{arma:null,casco:'cuero'},weaponSpares:{'r-one':{key:'espada_madera',w:prize},'r-two':{key:'espada_madera',w:{dur:11}}}}),s=servidor(old);
  const response=await s.call(request());assert.equal(response.status,200);const result=await response.json();
  assert.deepEqual(result.data.weapons.espada_madera,prize);assert.equal(Object.hasOwn(result.data.weaponSpares,'r-one'),false);assert.deepEqual(result.data.weaponSpares['r-two'],old.data.weaponSpares['r-two']);assert.equal(result.data.gear.arma,'espada_madera');
});

test('reintenta la misma operación antes de CAS sin intercambiar dos veces, y rechaza reutilizarla para otro ID',async()=>{
  const old=row({weaponSpares:{'r-one':{key:'espada_madera',w:prize},'r-two':{key:'espada_madera',w:{dur:11}}}}),s=servidor(old);
  const response=await s.call(request());assert.equal(response.status,200);const data=clone(s.row().data),version=s.row().updated_at;
  const retry=await s.call(request());assert.equal(retry.status,200);assert.equal((await retry.json()).repetido,true);assert.equal(s.writes(),1);assert.deepEqual(s.row().data,data);
  assert.equal((await s.call(request(version,'r-two'))).status,400);assert.equal(s.writes(),1);
  const again=await s.call(request(version,'r-one',op2));assert.equal(again.status,200);assert.deepEqual(s.row().data.weapons.espada_madera,active);assert.equal(s.writes(),2);
});

test('rechaza cuenta/base/ID inválidos, ausencia, Zona y carreras sin escribir ni perder datos',async()=>{
  const old=row({weaponSpares:{'r-one':{key:'espada_madera',w:prize}}});
  for(const [body,status] of [[{...request(),cuenta:'otra'},409],[request('base-vieja'),409],[request(base,'r-missing'),400],[request(base,'constructor'),400],[{...request(),op:'mal'},400]]){
    const s=servidor(old);assert.equal((await s.call(body)).status,status);assert.equal(s.writes(),0);assert.deepEqual(s.row(),old);
  }
  const zona=row({zonaViaje:{t:1},weaponSpares:old.data.weaponSpares}),s=servidor(zona);assert.equal((await s.call(request())).status,400);assert.equal(s.writes(),0);
  const race=servidor(old);const responses=await Promise.all([race.call(request()),race.call(request(base,'r-one',op2))]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(race.writes(),1);
});

test('mantiene sólo los veinte recibos recientes y no acepta payload del pedido como fuente de equipo',async()=>{
  const receipts=Array.from({length:20},(_,i)=>({op:'old-'+i,id:'r-past'})),old=row({weaponSpares:{'r-one':{key:'espada_madera',w:prize}},weaponSparesOps:receipts}),s=servidor(old);
  const response=await s.call({...request(),repuesto:{id:'r-one',w:{dur:99999,plus:15}},data:{weapons:{espada_madera:{dur:99999}}}});assert.equal(response.status,200);
  assert.deepEqual(s.row().data.weapons.espada_madera,prize);assert.equal(s.row().data.weaponSparesOps.length,20);assert.deepEqual(s.row().data.weaponSparesOps.at(-1),{op,id:'r-one'});assert.equal(s.row().data.weaponSparesOps[0].op,'old-1');
});
