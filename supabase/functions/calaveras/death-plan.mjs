/* Trusted-server only: canonical defeated data in BEFORE death wear.
   CSPRNG chooses break/drop slots; SQL re-derives armour wear and all debits/items.
   A single confirmed deposit also heals/exits, so reload cannot apply wear twice. */
const clone=v=>JSON.parse(JSON.stringify(v));
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v||{},k);
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const capacities=Object.freeze(Object.assign(Object.create(null),{bag:8,backpack:20}));
const kinds=new Set(['res','seed','fish','dish','arm','armor','armorset','gear','cont','pick','tool','cana']);
const gearKeys=new Set(['botas_cuero','casco_cuero','pechera_cuero','escudo_madera','casco_hierro','escudo_hierro','pechera_hierro']);
const armorPieces=['yelmo','pecho','pantalones','botas','guantes'];
const armorSets=new Set(['fibra','piel','cuero','colmillo']);
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
 let armorEq=d.armorEq??null;
 const breakSlots=[],gastadas=[];
 if(armorSets.has(armorEq))for(const piece of armorPieces){
  const k='arm_'+armorEq+'_'+piece;if(!armor[k]||armorOff[k])continue;
  const before=Number.isFinite(armorDur[k])?Math.max(0,Math.min(100,armorDur[k])):100;
  if(before>0){armorDur[k]=Math.max(0,before-5);gastadas.push(piece);}
  else{const roll=roll100();if(!Number.isSafeInteger(roll)||roll<0||roll>=100)throw Error('Invalid secure armour roll');if(roll<10){delete armor[k];delete armorDur[k];breakSlots.push(piece);}}
 }
 const candidates=[];
 for(const slot of ['casco','armadura','botas','escudo'])if(gearKeys.has(gear[slot]))candidates.push({slot,kind:'gear',k:gear[slot]});
 if(typeof gear.arma==='string'&&own(weapons,gear.arma)&&object(weapons[gear.arma]))candidates.push({slot:'arma',kind:'arm',k:gear.arma});
 const pieces=armorSets.has(armorEq)?armorPieces.filter(p=>armor['arm_'+armorEq+'_'+p]&&!armorOff['arm_'+armorEq+'_'+p]):[];
 if(pieces.length)candidates.push({slot:'set',kind:'armorset',k:armorEq});
 const dropSlots=[],labels=[];
 for(const p of candidates){
  const roll=roll100();if(!Number.isSafeInteger(roll)||roll<0||roll>=100)throw Error('Invalid secure equipment roll');
  if(roll>=5)continue;
  dropSlots.push(p.slot);labels.push(p.k);
  if(p.kind==='gear'){gear[p.slot]=null;items.push({kind:'gear',k:p.k,n:1});}
  else if(p.kind==='arm'){const w=weapons[p.k];gear.arma=null;delete weapons[p.k];items.push({kind:'arm',k:p.k,n:1,w});}
  else{
   const dur={};for(const piece of pieces){const k='arm_'+p.k+'_'+piece;dur[piece]=Number.isFinite(armorDur[k])?Math.max(0,Math.min(100,armorDur[k])):100;delete armor[k];delete armorDur[k];}
   armorEq=null;items.push({kind:'armorset',k:p.k,n:1,piezas:pieces.slice(),dur});
  }
 }
 if(items.length>256)throw Error('Canonical death inventory exceeds supported bound');
 return {breakSlots,dropSlots,items,cont:null,gear,weapons,armor,armorDur,armorOff,armorEq,
  summary:{pilas:inside.length,piezas:dropSlots.length,cont:cont?.c??null,piezasLabel:labels,armadura:{gastadas,rotas:breakSlots.slice()}}};
}
