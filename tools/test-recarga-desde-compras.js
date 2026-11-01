const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),{ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root);
const doc=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8')).window.document;c.document=doc;c.$=id=>doc.getElementById(id);c.isOpen=()=>false;c.refreshHud=()=>{};
const run=s=>vm.runInContext(s,c);let opened=[],walletCalls=0;c.closeAllOv=()=>{};c.openOv=id=>{opened.push(id);if(id==='ov-banco')c.renderUsdt();};c.usdtConsultar=()=>{run("USDT_ESTADO={uid:UID,deposits:true,address:null}");c.renderUsdt();};c.ethereum={request:()=>walletCalls++};
run("estadoDeCero();UID='qa';CARGA_OK=true;SOLO_LOCAL=false;G.golden=0");
c.refreshVip();let b=doc.querySelector('#vip-comprar');assert.equal(b.textContent,'Recargar Golden');assert.equal(b.disabled,false);b.click();assert.equal(opened.at(-1),'ov-banco');assert.equal(doc.activeElement.id,'usdt-amount');assert.equal(walletCalls,0,'navegar no conecta ni firma ni paga');assert.equal(c.G.golden,0);
run("USDT_ESTADO={uid:UID,deposits:true,address:'0x1111111111111111111111111111111111111111',destination:'0x4abb7580eac480203f4ce8890674a29519dd9139',history:[]};RECARGA_GOLDEN_SOLICITADA={faltan:10}");c.renderUsdt();assert.equal(doc.activeElement.id,'usdt-amount');assert.equal(doc.querySelector('#usdt-amount').value,'10');assert.equal(walletCalls,0);
c.refreshNft();for(const sel of ['#buy-godhand','[data-nft]','[data-infra="tienda"]']){b=doc.querySelector(sel);assert(b,sel);assert.equal(b.textContent,'Recargar Golden',sel);}
if(!doc.getElementById('packs-shop')){const div=doc.createElement('div');div.id='packs-shop';doc.body.appendChild(div);}c.refreshPacks();for(const sel of ['[data-pack]','#caja-comprar'])assert.equal(doc.querySelector(sel).textContent,'Recargar Golden');
c.refreshArtefactos();assert.equal(doc.querySelector('[data-artefacto-comprar]').textContent,'Recargar Golden');
run('G.golden=1000');c.refreshVip();assert.equal(doc.querySelector('#vip-comprar').textContent,'Activar VIP');assert.equal(doc.querySelector('#vip-comprar').disabled,false);
run('G.produccion.vipHasta=Date.now()+86400000;G.golden=0');c.refreshVip();assert.equal(doc.querySelector('#vip-comprar').disabled,true);
const test=doc.createElement('button');test.disabled=true;test.textContent='Bloqueado';c.ofrecerRecargaGolden(test,10,true);assert.equal(test.disabled,true);assert.equal(test.textContent,'Bloqueado');
console.log('OK: VIP, objetos, pasivas, God Hand, tienda y packs llevan a recarga; foco de recarga sin vinculación; saldo suficiente y otros bloqueos preservados; sin firma ni pago automático.');
