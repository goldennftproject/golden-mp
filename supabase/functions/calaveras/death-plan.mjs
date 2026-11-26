/* Trusted-server only: canonical defeated data in BEFORE death wear.
   CSPRNG chooses break/drop slots; SQL re-derives armour wear and all debits/items.
   A single confirmed deposit also heals/exits, so reload cannot apply wear twice. */
const clone=v=>JSON.parse(JSON.stringify(v));
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v||{},k);
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const capacities=Object.freeze(Object.assign(Object.create(null),{bag:8,backpack:20}));
const kinds=new Set(['res','seed','fish','dish','arm','armor','armorset','gear','cont','pick','tool','cana']);
const gearKeys={
 casco:['casco_cuero','casco_hierro'],
 armadura:['pechera_cuero','pechera_hierro'],
 botas:['botas_cuero'],
 escudo:['escudo_madera','escudo_hierro']
};
const armorPieces=['yelmo','pecho','pantalones','botas','guantes'];
const armorSets=['vegetal','fibra','piel','cuero','colmillo'];
const lootSlotForPiece={yelmo:'casco',pecho:'armadura',botas:'botas'};
const armorKey=(set,piece)=>'arm_'+set+'_'+piece;
const armorDurability=(dur,key)=>Number.isFinite(dur[key])?Math.max(0,Math.min(100,dur[key])):100;
function randomInt100(){
 const crypto=globalThis.crypto;if(!crypto?.getRandomValues)throw Error('Secure random source unavailable');
 const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=4294967200);return a[0]%100;
}
function flatten(c,depth=1){
 if(c==null)return[];
 if(!object(c)||!capacities[c.c]||!Array.isArray(c.items)||c.items.length>capacities[c.c]||depth>2)throw Error('Invalid canonical container');
 const out=[];
 for(const e of c.items){
  if(object(e)&&capacities[e.c]&&Array.isArray(e.items))out.push(...flatten(e,depth+1));
  else{if(!object(e)||!kinds.has(e.kind)||typeof e.k!=='string'||!Number.isFinite(e.n)||e.n<=0)throw Error('Invalid canonical carried item');out.push(clone(e));}
 }
 return out;
}
export function planSharedGraveDeath(canonicalData,roll100=randomInt100){
 const d=canonicalData;
 if(!object(d)||!Number.isFinite(d.hp)||d.hp>0||!Number.isFinite(d.hpMax)||d.hpMax<=0)throw Error('Death requires a canonical defeated player');
 const pos=d.zonaViaje?.pos;
 if(!object(pos)||typeof pos.zona!=='string'||!/^[a-z_]{1,32}$/.test(pos.zona)||!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||pos.x<0||pos.x>1344||pos.y<0||pos.y>630)throw Error('Death requires an accepted journey position');
 const cont=d.cont==null?null:d.cont,inside=flatten(cont),items=clone(inside);
 if(cont){
  for(const e of cont.items)if(object(e)&&capacities[e.c]&&Array.isArray(e.items))items.push({kind:'cont',k:e.c,n:1});
  items.push({kind:'cont',k:cont.c,n:1});
 }
 const gear=clone(object(d.gear)?d.gear:{}),weapons=clone(object(d.weapons)?d.weapons:{});
 const armor=clone(object(d.armor)?d.armor:{}),armorDur=clone(object(d.armorDur)?d.armorDur:{}),armorOff=clone(object(d.armorOff)?d.armorOff:{});
 const legacySet=typeof d.armorEq==='string';
 let armorEq=object(d.armorEq)?clone(d.armorEq):d.armorEq??null;
 const active={},shadowed={};
 for(const piece of armorPieces){
  const set=legacySet?armorEq:armorEq?.[piece];
  if(!armorSets.includes(set)||(set==='vegetal'&&piece!=='pecho'))continue;
  const k=armorKey(set,piece);if(!armor[k]||armorOff[k])continue;
  const slot=lootSlotForPiece[piece];
  if(legacySet&&slot&&gearKeys[slot].includes(gear[slot]))shadowed[slot]=piece;
  else active[piece]=set;
 }
 const coveredByCraft={...active};
 const breakSlots=[],gastadas=[];
 for(const piece of armorPieces){
  const set=active[piece];if(!set)continue;
  const k=armorKey(set,piece),before=armorDurability(armorDur,k);
  if(before>0){armorDur[k]=Math.max(0,before-5);gastadas.push(piece);}
  else{
   const roll=roll100();if(!Number.isSafeInteger(roll)||roll<0||roll>=100)throw Error('Invalid secure armour roll');
   if(roll<10){
    delete armor[k];delete armorDur[k];delete armorOff[k];delete active[piece];
    if(object(armorEq))delete armorEq[piece];
    breakSlots.push(piece);
   }
  }
 }
 const candidates=[];
 const pieceForLootSlot={casco:'yelmo',armadura:'pecho',botas:'botas'};
 for(const [slot,keys] of Object.entries(gearKeys)){
  if(keys.includes(gear[slot])&&!coveredByCraft[pieceForLootSlot[slot]]){
   candidates.push({slot,kind:'gear',k:gear[slot]});
  }
 }
 if(typeof gear.arma==='string'&&own(weapons,gear.arma)&&object(weapons[gear.arma]))candidates.push({slot:'arma',kind:'arm',k:gear.arma});
 for(const set of armorSets){
  const pieces=armorPieces.filter(piece=>active[piece]===set);
  if(pieces.length)candidates.push({slot:legacySet?'set':'set:'+set,kind:'armorset',k:set,pieces});
 }
 const dropSlots=[],labels=[];
 for(const p of candidates){
  const roll=roll100();if(!Number.isSafeInteger(roll)||roll<0||roll>=100)throw Error('Invalid secure equipment roll');
  if(roll>=5)continue;
  dropSlots.push(p.slot);labels.push(p.k);
  if(p.kind==='gear'){
   gear[p.slot]=null;items.push({kind:'gear',k:p.k,n:1});
   // Keep previously shadowed armour in the bag when its legacy occupant falls.
   if(shadowed[p.slot]&&!object(armorEq))armorEq={...active};
  }
  else if(p.kind==='arm'){const w=weapons[p.k];gear.arma=null;delete weapons[p.k];items.push({kind:'arm',k:p.k,n:1,w});}
  else{
   const dur={};
   for(const piece of p.pieces){
    const k=armorKey(p.k,piece);dur[piece]=armorDurability(armorDur,k);
    delete armor[k];delete armorDur[k];delete armorOff[k];
    if(object(armorEq))delete armorEq[piece];
   }
   if(legacySet)armorEq=null;
   items.push({kind:'armorset',k:p.k,n:1,piezas:p.pieces,dur});
  }
 }
 if(items.length>256)throw Error('Canonical death inventory exceeds supported bound');
 return {breakSlots,dropSlots,items,cont:null,gear,weapons,armor,armorDur,armorOff,armorEq,
  summary:{pilas:inside.length,piezas:dropSlots.length,cont:cont?.c??null,piezasLabel:labels,armadura:{gastadas,rotas:breakSlots.slice()}}};
}
