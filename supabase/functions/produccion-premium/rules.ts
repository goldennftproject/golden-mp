import { WORLD } from './world-contract.ts';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function premiumDetalle(input: any): any {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Pedido de producción inválido');
 if(input.accion==='comprar'){
  if(!['tree','rock','bronce'].includes(input.tipo)||typeof input.precioEsperado!=='number'||!Number.isFinite(input.precioEsperado)||input.precioEsperado<=0)throw new Error('Compra de nodo inválida');
  return {accion:'comprar',tipo:input.tipo,precioEsperado:input.precioEsperado};
 }
 if(input.accion==='colocar'){
  if(typeof input.id!=='string'||!UUID.test(input.id)||!Number.isFinite(input.cx)||!Number.isFinite(input.by)||typeof input.cx!=='number'||typeof input.by!=='number'||Math.abs(input.cx)>5000||Math.abs(input.by)>5000)throw new Error('Colocación de nodo inválida');
  return {accion:'colocar',id:input.id,cx:input.cx,by:input.by};
 }
 throw new Error('Acción de producción inválida');
}

/* BEGIN PREMIUM GEOMETRY — el mismo bloque JS se inserta en guardar y se contrasta
   con config.js. No usa reloj, escena, DOM ni valores de geometría del navegador. */
export function premiumMundo(d: any): any {
 let v=d.espacioV;
 if(![1,2,3,4].includes(v))v=(d.expansiones||0)>0||(d.plotsOwned||3)>3||Object.keys(d.layout||{}).length||Object.keys(d.layoutPlots||{}).length||d.layoutPond||Object.keys(d.obras||{}).length||Object.values(d.built||{}).some(Boolean)||(d.decos||[]).length||(d.chests||[]).length||Object.keys(d.produccion?.nodos||{}).length||(d.treesOpen||[]).length>1||(d.rocksOpen||[]).length>1?1:2;
 return WORLD.versions[v];
}
export function premiumTipo(o: any): string {return o?.type==='ore'?o.ore:o?.type;}
export function premiumTerreno(d: any): Set<string> {
 const w=premiumMundo(d),m=new Set<string>();
 for(let c=0;c<w.cols;c++)for(let r=0;r<w.rows;r++)m.add(c+','+r);
 for(const [c0,r0,c1,r1] of w.expansions.slice(0,Math.max(0,Math.min(16,d.expansiones||0))))for(let c=c0;c<c1;c++)for(let r=r0;r<r1;r++)m.add(c+','+r);
 return m;
}
export function premiumPie(d: any,o: any,lp: any): boolean {
 if(!lp||!Number.isFinite(lp.cx)||!Number.isFinite(lp.by))return false;
 const T=WORLD.tile,col=lp.cx/T-o.width/2,row=lp.by/T-1,m=premiumTerreno(d);
 if(!Number.isInteger(col)||!Number.isInteger(row))return false;
 for(let c=col;c<col+o.width;c++)for(const [x,y] of [[c,row],[c-1,row],[c+1,row],[c,row-1],[c,row+1]])if(!m.has(x+','+y))return false;
 return true;
}
export function premiumRegistro(d: any,i: number): any {
 const o=premiumMundo(d).objects[i];
 return o?.premiumOnly&&(d.produccion?.premium?.compras||[]).find((x: any)=>x&&typeof x.id==='string'&&UUID.test(x.id)&&x.nodo===i&&x.tipo===premiumTipo(o));
}
export function premiumPresente(d: any,o: any): boolean {
 if(['altar','ofrendas','lombricario','lonja','boya','fish'].includes(o.type))return false;
 if(o.premiumOnly)return !!premiumRegistro(d,o.i)&&!!d.produccion?.nodos?.[o.i]&&premiumPie(d,o,d.layout?.[o.i]);
 if(['tree','rock','ore'].includes(o.type)&&d.produccion){
  if(d.produccion.nodos?.[o.i])return true;
  return o.exp===null&&o.lock!==null&&['tree','rock'].includes(o.type)&&(d[o.type==='tree'?'treesOpen':'rocksOpen']||[]).includes(o.lock);
 }
 if(o.exp!==null)return (d.expansiones||0)>o.exp;
 if(WORLD.buildTypes.includes(o.type))return !!(d.built?.[o.type]||d.obras?.[o.type]);
 if(['tree','rock'].includes(o.type))return (d[o.type==='tree'?'treesOpen':'rocksOpen']||[0]).includes(o.lock);
 return true;
}
export function premiumOcupacion(d: any,ignore=-1): Set<string> {
 const w=premiumMundo(d),m=new Set<string>(),T=WORLD.tile;
 const put=(c: number,r: number)=>m.add(c+','+r);
 if(d.espacioV===4)put(4,4);
 for(const o of w.objects){
  if(o.i===ignore||!premiumPresente(d,o))continue;
  const p=d.layout?.[o.i],ob=d.obras?.[o.type];
  const col=p?Math.round(p.cx/T-o.width/2):ob&&typeof ob.col==='number'?ob.col:o.col;
  const row=(p?Math.round(p.by/T):ob&&typeof ob.row==='number'?ob.row+1:o.base)-1;
  for(let j=0;j<o.width;j++)put(col+j,row);
 }
 for(let i=0;i<Math.min(60,d.plotsOwned||3);i++){
  const p=d.layoutPlots?.[i],b=w.plots[i];if(p)put(p.col,p.row);else if(b)put(b[0],b[1]);
 }
 for(const p of [...(d.decos||[]),...(d.chests||[])])if(p&&p.col!==undefined)put(p.col,p.row);
 return m;
}
export function premiumSitio(d: any,o: any,lp: any,ignore=-1): boolean {
 if(!premiumPie(d,o,lp))return false;
 const col=lp.cx/WORLD.tile-o.width/2,row=lp.by/WORLD.tile-1,ocup=premiumOcupacion(d,ignore);
 for(let c=col;c<col+o.width;c++)if(ocup.has(c+','+row))return false;
 return true;
}
/* END PREMIUM GEOMETRY */

export function premiumColocacion(d: any,detail: any): any {
 const compra=(d.produccion?.premium?.compras||[]).find((x: any)=>x?.id===detail.id);
 if(!compra)throw new Error('No tienes ese nodo Golden');
 if(compra.nodo!==null)throw new Error('Este nodo ya está colocado');
 if((d.level||1)<(compra.tipo==='bronce'?3:1))throw new Error('Todavía no has desbloqueado este nodo');
 const o=premiumMundo(d).objects.find((o: any)=>o.premiumOnly&&premiumTipo(o)===compra.tipo&&!d.produccion?.nodos?.[o.i]&&!(d.produccion?.premium?.compras||[]).some((x: any)=>x.nodo===o.i));
 if(!o)throw new Error('No quedan emplazamientos Golden de este tipo');
 if(!premiumSitio(d,o,detail))throw new Error('Elige espacio libre dentro de tu terreno, separado de la cerca');
 return {nodo:o.i,tipo:compra.tipo,key:o.key,cx:detail.cx,by:detail.by};
}
