/* DRAFT: pure trusted-server inventory plan; no auth, requests, storage or DB writes.
   Inputs must come from locked/CAS-verified farms/grave rows, never from a client body.
   Keep this transaction-planning helper separate from the commit/receipt operation. */
const capacities=Object.freeze(Object.assign(Object.create(null),{bag:8,backpack:20}));
const kinds=new Set(['res','seed','fish','dish','arm','armorset','gear','cont']);
const clone=v=>JSON.parse(JSON.stringify(v));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keyOK=k=>typeof k==='string'&&k.length>=1&&k.length<=100&&!['__proto__','constructor','prototype'].includes(k);
const canonical=v=>Array.isArray(v)?v.map(canonical):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const identity=e=>JSON.stringify(canonical(Object.fromEntries(Object.entries(e).filter(([k])=>k!=='n'))));
function leaf(e){
 if(!object(e)||!kinds.has(e.kind)||!keyOK(e.k)||!Number.isFinite(e.n)||e.n<=0||e.n>Number.MAX_SAFE_INTEGER)throw Error('Invalid canonical grave item');
 return e;
}
function container(v,depth=1){
 if(!object(v)||!capacities[v.c]||!Array.isArray(v.items)||depth>2||v.items.length>capacities[v.c])throw Error('Invalid canonical carried container');
 for(const e of v.items){if(object(e)&&capacities[e.c]&&Array.isArray(e.items))container(e,depth+1);else leaf(e);}
 return v;
}
function leaves(v,out=[]){for(const e of v.items){if(capacities[e?.c]&&Array.isArray(e.items))leaves(e,out);else out.push(e);}return out;}
function add(v,e,depth=1){
 // Weapons and armour sets are individual objects, even when type/metadata match.
 if(!['arm','armorset'].includes(e.kind)){
  const match=leaves(v).find(x=>identity(x)===identity(e));
  if(match){if(match.n+e.n>Number.MAX_SAFE_INTEGER)return false;match.n+=e.n;return true;}
 }
 if(v.items.length<capacities[v.c]){v.items.push(clone(e));return true;}
 if(depth<2)for(const nested of v.items)if(capacities[nested?.c]&&Array.isArray(nested.items)&&add(nested,e,depth+1))return true;
 return false;
}
function totals(entries){
 const result=new Map();
 for(const e of entries){const k=identity(e);result.set(k,(result.get(k)||0)+e.n);}
 return [...result.entries()].sort(([a],[b])=>a.localeCompare(b));
}
export function planSharedGraveClaim(canonicalCarried,canonicalItems){
 if(!Array.isArray(canonicalItems)||canonicalItems.length>256)throw Error('Invalid canonical grave contents');
 canonicalItems.forEach(leaf);
 if(canonicalCarried==null)return {cont:null,moved:[],remaining:clone(canonicalItems),reason:'missing_container'};
 container(canonicalCarried);
 const cont=clone(canonicalCarried),moved=[],remaining=[];
 for(const e of canonicalItems)(add(cont,e)?moved:remaining).push(clone(e));
 const before=totals([...leaves(canonicalCarried),...canonicalItems]);
 const after=totals([...leaves(cont),...remaining]);
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Inventory conservation failed');
 return {cont,moved,remaining,reason:remaining.length?'container_full':null};
}
