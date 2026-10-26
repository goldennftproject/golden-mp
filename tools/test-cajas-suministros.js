const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),{ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root);
const text=fs.readFileSync(root+'/supabase/functions/guardar/index.ts','utf8'),block=text.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0],s={};vm.createContext(s);vm.runInContext(block.slice(block.indexOf('const VERSION')),s);
const t=Date.UTC(2026,9,26,12),old={golden:10,energiaGranja:{actual:0,at:t},packs:{compras:{diario:1},ops:[]},mkPend:[]};
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(CAJA_SUMINISTROS)',c)),JSON.parse(vm.runInContext('JSON.stringify(CAJA_SUMINISTROS)',s)));
const bins={};for(let i=0;i<10000;i++){
 const r=s.packOperacion(old,'caja',t,'a',()=>i);assert.equal(r.data.golden,9);assert.equal(r.data.energiaGranja.actual,0);assert.equal(r.data.mkPend.length,1);assert.equal(r.data.mkPend[0].qty,r.premio.qty);const k=r.premio.item+':'+r.premio.qty;bins[k]=(bins[k]||0)+1;
}
assert.deepEqual(bins,{'madera:40':4000,'piedra:40':3500,'bronce:3':1500,'bronce:6':800,'hierro:3':200});assert.equal(old.golden,10);assert.equal(old.mkPend.length,0,'propuestas no mutan fila leída');
let draws=0,r=s.packOperacion(old,'caja',t,'a',()=>{draws++;return 9999;});const first=r.data;
r=s.packOperacion(first,'caja',t+86400000,'a',()=>{throw Error('no repetir sorteo');});assert.ok(r.repetido);assert.equal(r.premio.item,'hierro');assert.equal(r.data.golden,9);assert.equal(draws,1);
assert.ok(s.packOperacion(first,'diario',t,'a').error,'recibo no cambia de compra');
let d=first;for(const op of ['b','c'])d=s.packOperacion(d,'caja',t,op,()=>0).data;
assert.ok(s.packOperacion(d,'caja',t,'d',()=>{throw Error('no sortear sin cupo');}).error);assert.equal(d.golden,7);assert.equal(d.packs.cajas.count,3);
assert.ok(s.packOperacion({...d,produccion:{vipHasta:t+86400000}},'caja',t,'v',()=>0).error,'VIP no elude tope');assert.equal(s.packOperacion(d,'caja',t+86400000,'dia-nuevo',()=>0).data.packs.cajas.count,1);
assert.ok(s.packOperacion({golden:0},'caja',t,'x',()=>{throw Error('sin saldo no sortear');}).error);assert.ok(s.packOperacion({...old,mkPend:Array(101).fill({})},'caja',t,'x',()=>0).error);
for(const n of [-1,10000,NaN,.1])assert.ok(s.packOperacion(old,'caja',t,'x',()=>n).error);
c.hydrate(JSON.parse(JSON.stringify(d)));assert.equal(c.cajasUsadas(t),3);assert.equal(c.cajasUsadas(t+86400000),0);const snap=c.snapshot();c.hydrate(JSON.parse(JSON.stringify(snap)));assert.equal(c.cajasUsadas(t),3);
c.document=new (require('jsdom').JSDOM)(fs.readFileSync(root+'/public/index.html','utf8')).window.document;let confirm,called=0;c.nowMs=()=>t;c.askConfirm=(txt,fn)=>{confirm={txt,fn};};c.economiaSolicitar=x=>{called++;assert.equal(x.pack.id,'caja');};c.G.golden=10;c.G.packs=null;
c.refreshSeedShop();c.document.getElementById('caja-comprar').click();assert.equal(called,0);assert.match(confirm.txt,/1 Golden/);assert.match(confirm.txt,/40%/);confirm.fn();assert.equal(called,1);
c.G.packs=d.packs;c.refreshPacks();assert.equal(c.document.getElementById('caja-comprar').disabled,true);assert.match(c.document.getElementById('packs-shop').textContent,/3\/3/);
// Rechazo de cola de uint32 para un sorteo sin sesgo modular.
const values=[4294967295,9999];s.crypto={getRandomValues:a=>{a[0]=values.shift();return a;}};assert.equal(s.cajaAzar(),9999);assert.equal(values.length,0);
console.log('OK: distribución exhaustiva, paridad, saldo, cupo Free/VIP UTC, recibos sin resorteo, pendientes, F5, confirmación y azar sin sesgo.');
