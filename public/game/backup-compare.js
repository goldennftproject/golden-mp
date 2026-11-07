/* Prioridad de revisión de copias. No restaura, no combina inventarios y no filtra la descarga. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&typeof root==='object')root.GFBackupCompare=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_DEPTH=40,MAX_NODES=60000;
  const ignoredRoot=new Set(['_saveOp','_economiaControl','visto','energiaGranja','stam','stamAcc','stamFullAt','stamLastAt','stamRec','hp','hpMax','actividadGranja','actividadAcciones','logrosV2','logrosAcciones','logros','recientes','hotSel','selSeed']);
  const skillNames={farming:'cultivo',tala:'tala',mining:'minería',crafting:'fabricación',cooking:'cocina',fishing:'pesca',ganaderia:'ganadería',range:'arco',sword:'espada',hacha:'hacha',mazo:'mazo'};
  const buildingNames={store:'Cobertizo',horno:'Horno',cocina:'Cocina',altar:'Altar',establo:'Establo',curtiduria:'Curtiduría',ofrendas:'Ofrendas',lombricario:'Lombricario',lonja:'Lonja'};
  const itemNames={madera:'Madera',piedra:'Piedra',bronce:'Bronce',hierro:'Hierro',oro:'Oro',diamante:'Diamante',netherita:'Netherita',papa:'Papa',pure_papa:'Puré',papa_asada:'Papa asada',estofado:'Estofado',calabaza:'Calabaza',girasol:'Girasol',ciruela:'Ciruela',cereza:'Cereza',flecha:'Flechas',barra_piedra:'Barra de piedra',barra_bronce:'Barra de bronce',barra_hierro:'Barra de hierro',barra_oro:'Barra de oro',axe:'Hacha',rod:'Caña'};
  const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const own=(o,k)=>plain(o)&&Object.prototype.hasOwnProperty.call(o,k);
  const owner=x=>typeof x==='string'?x.trim().toLowerCase():'';
  const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e12?x:null;
  const amount=x=>number(x)??0;
  const integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9?x:null;
  const marker=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
  const stamp=x=>marker(x)??0;
  const safeKey=k=>typeof k==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(k)&&!['__proto__','prototype','constructor'].includes(k);

  function canonical(value,path,depth,state,omitMoney){
    if(++state.nodes>MAX_NODES||depth>MAX_DEPTH)throw Error('comparison_limits');
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number'){if(!Number.isFinite(value))throw Error('invalid_number');return value;}
    if(value===undefined)return undefined;
    if(typeof value!=='object')throw Error('invalid_snapshot');
    if(state.seen.has(value))throw Error('circular_snapshot');state.seen.add(value);
    let result;
    if(Array.isArray(value))result=value.map(v=>canonical(v,path+'[]',depth+1,state,omitMoney)??null);
    else{
      result=Object.create(null);
      for(const key of Object.keys(value).sort()){
        if(path===''&&(ignoredRoot.has(key)||(omitMoney&&(key==='plata'||key==='golden'))))continue;
        if(path==='tuto'&&key==='registroManual')continue;
        if(['__proto__','prototype','constructor'].includes(key))throw Error('invalid_field');
        const child=canonical(value[key],path?path+'.'+key:key,depth+1,state,omitMoney);
        if(child!==undefined)result[key]=child;
      }
    }
    state.seen.delete(value);return result;
  }
  function signature(data,omitMoney=false){
    if(!plain(data))return '';
    return JSON.stringify(canonical(data,'',0,{nodes:0,seen:new Set()},omitMoney));
  }
  function stage(candidate,reference){
    if(!plain(candidate)||!plain(reference)||!plain(candidate.data)||!plain(reference.data))return 'No hay una partida de referencia válida.';
    const a=owner(candidate.owner),b=owner(reference.owner);
    if(!a||!b)return 'No se pudo identificar la cuenta de esta copia.';
    if(a!==b)return 'Esta copia pertenece a otra cuenta.';
    if(candidate.olderReset===true)return 'Esta copia es anterior a un reinicio.';
    const localReset=marker(candidate.reset)??marker(candidate.data.reinicio),currentReset=marker(reference.reset)??marker(reference.data.reinicio);
    if(marker(candidate.serverReset)&&(!localReset||candidate.serverReset>localReset))return 'Esta copia es anterior a un reinicio registrado.';
    if(localReset!==currentReset&&(localReset!==null||currentReset!==null))return 'Esta copia corresponde a otra etapa de la partida.';
    const started=marker(candidate.data.iniciado),currentStarted=marker(reference.data.iniciado);
    if(started===null||currentStarted===null)return 'No se pudo comprobar la etapa de esta copia.';
    if(started!==currentStarted)return 'Esta copia corresponde a otro inicio de partida.';
    if(integer(candidate.data.prestige??0)===null||integer(reference.data.prestige??0)===null)return 'La etapa de prestigio no es válida.';
    if((candidate.data.prestige??0)!==(reference.data.prestige??0))return 'Esta copia corresponde a otro prestigio.';
    return '';
  }
  function signal(field,label,copy,current,category){return{field,label,copy,current,delta:copy-current,category};}
  function progressChanges(a,b){
    const ahead=[],behind=[];
    const add=(field,label,left,right,category)=>{
      if(left===null||right===null||left===right)return;
      (left>right?ahead:behind).push(signal(field,label,left,right,category));
    };
    for(const key of Object.keys(skillNames))add('skills.'+key,'Experiencia de '+skillNames[key],number(a.skills?.[key]),number(b.skills?.[key]),'experience');
    for(const [field,label] of [['expansiones','Expansiones'],['plotsOwned','Parcelas'],['invRows','Filas del inventario']])add(field,label,integer(a[field]),integer(b[field]),'durable');
    for(const key of Object.keys(buildingNames))for(const [field,label]of [['built',buildingNames[key]],['edif2',buildingNames[key]+' mejorado']]){
      const left=a[field]?.[key]===true?1:0,right=b[field]?.[key]===true?1:0;
      add(field+'.'+key,label,left,right,'durable');
    }
    // Los pasos se han reordenado entre versiones: sólo la finalización en la misma versión es comparable.
    if(a.tuto?.v===b.tuto?.v&&integer(a.tuto?.v)!==null)add('tuto.done','Tutorial terminado',a.tuto?.done===true?1:0,b.tuto?.done===true?1:0,'durable');
    return{ahead,behind};
  }
  function quantityMap(raw){
    const result=Object.create(null);if(!plain(raw))return result;
    for(const key of Object.keys(raw))if(safeKey(key)&&number(raw[key])!==null)result[key]=raw[key];
    return result;
  }
  function withQueue(raw,jobs){
    const result=quantityMap(raw);if(!Array.isArray(jobs))return result;
    for(const job of jobs){
      if(!plain(job)||!safeKey(job.id))continue;
      const qty=own(job,'qty')?number(job.qty):1;if(qty===null)continue;
      const total=amount(result[job.id])+qty;if(total<=1e12)result[job.id]=total;
    }
    return result;
  }
  function inventoryChanges(a,b){
    const changes=[];
    const compare=(left,right,field,category,suffix='')=>{
      for(const key of [...new Set([...Object.keys(left),...Object.keys(right)])].sort()){
        const copy=amount(left[key]),current=amount(right[key]);if(copy===current)continue;
        const item=signal(field+'.'+key,(itemNames[key]||key)+suffix,copy,current,category);
        if(field==='seeds'&&copy>current){
          const oldPlants=number(a.stats?.plantar?.[key]),newPlants=number(b.stats?.plantar?.[key]);
          if(oldPlants!==null&&newPlants!==null&&newPlants-oldPlants>=copy-current){item.category='possible-use';item.label+=' (compatible con plantaciones posteriores)';}
        }
        changes.push(item);
      }
    };
    // Una producción terminada pasa de cola a bolsa; no contar ese movimiento como objeto perdido.
    compare(withQueue(a.res,a.horno),withQueue(b.res,b.horno),'res','quantity',' en bolsa o en horno');
    compare(withQueue(a.dishes,a.cooking),withQueue(b.dishes,b.cooking),'dishes','quantity',' en bolsa o en cocina');
    compare(quantityMap(a.seeds),quantityMap(b.seeds),'seeds','quantity',' · semillas');
    compare(quantityMap(a.fish),quantityMap(b.fish),'fish','quantity');
    compare(quantityMap(a.tools),quantityMap(b.tools),'tools','durability',' · durabilidad');
    compare(quantityMap(a.picks?.dur),quantityMap(b.picks?.dur),'picks.dur','durability',' · durabilidad del pico');
    const weaponDur=data=>{const out=Object.create(null);if(plain(data.weapons))for(const key of Object.keys(data.weapons))if(safeKey(key)&&number(data.weapons[key]?.dur)!==null)out[key]=data.weapons[key].dur;return out;};
    compare(weaponDur(a),weaponDur(b),'weapons','durability',' · durabilidad del arma');
    compare(quantityMap(a.armorDur),quantityMap(b.armorDur),'armorDur','durability',' · durabilidad');
    return changes;
  }
  function analyze(candidate,reference){
    const result={compatible:false,reason:'',changed:false,progressSignals:[],progressBehind:[],inventorySignals:[],summary:'No se pudo comparar esta copia.',score:0,signature:'',nonMonetaryChanged:false};
    try{
      result.signature=signature(candidate?.data);
      result.reason=stage(candidate,reference);if(result.reason){result.summary=result.reason;return result;}
      const a=candidate.data,b=reference.data,otherSignature=signature(b);
      result.compatible=true;result.changed=result.signature!==otherSignature;
      result.nonMonetaryChanged=signature(a,true)!==signature(b,true);
      const progress=progressChanges(a,b);result.progressSignals=progress.ahead;result.progressBehind=progress.behind;
      result.inventorySignals=inventoryChanges(a,b);
      const inventoryAhead=result.inventorySignals.filter(x=>x.delta>0&&x.category==='quantity');
      result.score=result.progressSignals.reduce((sum,x)=>sum+(x.category==='durable'?1000:100+Math.min(99,Math.log2(x.delta+1))),0)+Math.min(20,inventoryAhead.length)*2;
      if(result.progressSignals.length)result.summary=result.progressBehind.length?'Avances distintos para revisar.':'Más avance para revisar.';
      else if(inventoryAhead.length)result.summary='Objetos distintos para revisar; pueden haberse usado después.';
      else if(result.progressBehind.length)result.summary='La partida de referencia tiene más avance.';
      else if(!result.nonMonetaryChanged&&result.changed)result.summary='Sólo cambia el saldo; no demuestra más avance.';
      else if(result.nonMonetaryChanged)result.summary='Copia de contexto para revisar.';
      else result.summary='Sin diferencias de progreso visibles.';
      return result;
    }catch{
      result.compatible=false;result.reason='La copia supera los límites de comparación o tiene un formato no válido.';result.summary=result.reason;return result;
    }
  }
  function choose(candidates,reference){
    const output={keys:[],reasons:Object.create(null),message:'El paquete incluye todas las copias para revisar.',hasMoreProgress:false,evaluated:0};
    if(!Array.isArray(candidates))return output;
    const entries=[];let compatibleCount=0;
    for(const candidate of candidates){
      output.evaluated++;if(!plain(candidate)||typeof candidate.key!=='string'||!candidate.key)continue;
      const analysis=analyze(candidate,reference);
      if(analysis.compatible)compatibleCount++;
      if(analysis.compatible&&analysis.nonMonetaryChanged)entries.push({candidate,analysis});
    }
    // Esta deduplicación sólo decide la prioridad del informe; nunca elimina copias del paquete.
    const unique=new Map();
    for(const entry of entries){const triageSignature=signature(entry.candidate.data,true),prior=unique.get(triageSignature);if(!prior||stamp(entry.candidate.capturedAt)>stamp(prior.candidate.capturedAt))unique.set(triageSignature,entry);}
    const available=[...unique.values()],byPriority=(a,b)=>b.analysis.score-a.analysis.score||stamp(b.candidate.capturedAt)-stamp(a.candidate.capturedAt)||a.candidate.key.localeCompare(b.candidate.key);
    const positive=available.filter(e=>e.analysis.progressSignals.length).sort(byPriority);
    const inventory=available.filter(e=>e.analysis.inventorySignals.some(x=>x.delta>0&&x.category==='quantity')).sort(byPriority);
    const archive=available.filter(e=>['conflicto','rechazo','carga','aparcada'].includes(e.candidate.type)).sort((a,b)=>(stamp(a.candidate.capturedAt)||Number.MAX_SAFE_INTEGER)-(stamp(b.candidate.capturedAt)||Number.MAX_SAFE_INTEGER)||a.candidate.key.localeCompare(b.candidate.key));
    const first=positive[0]||inventory[0]||archive[0];
    const add=(entry,label)=>{if(entry&&!output.keys.includes(entry.candidate.key)){output.keys.push(entry.candidate.key);output.reasons[entry.candidate.key]=label;}};
    if(first){
      const label=first.analysis.progressSignals.length?'Prioridad: más avance para revisar':first.analysis.inventorySignals.some(x=>x.delta>0&&x.category==='quantity')?'Prioridad: objetos distintos para revisar':'Prioridad: copia histórica de contexto';
      add(first,label);
      const olderContext=archive.find(e=>e.candidate.key!==first.candidate.key&&(!stamp(first.candidate.capturedAt)||stamp(e.candidate.capturedAt)<=stamp(first.candidate.capturedAt)));
      const second=olderContext||positive.find(e=>e.candidate.key!==first.candidate.key)||inventory.find(e=>e.candidate.key!==first.candidate.key);
      add(second,second&&['conflicto','rechazo'].includes(second.candidate.type)?'Prioridad: contexto de un conflicto':'Prioridad: otra copia para contrastar');
    }
    output.hasMoreProgress=positive.length>0;
    output.message=output.hasMoreProgress?'Hay copias con más avance para revisar. El paquete incluye todas.':'No encontré una copia claramente más avanzada. El paquete incluye todas para revisar.';
    if(!output.evaluated)output.message='No hay copias locales para comparar.';
    else if(!compatibleCount)output.message='Las copias se conservan como evidencia; no se pudo comparar su cuenta o etapa.';
    return output;
  }
  return Object.freeze({analyze,choose,signature});
});
