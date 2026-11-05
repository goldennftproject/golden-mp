'use strict';
// Independent behavioral tests: no source extraction, network, accounts or writes to the repo.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const {createRequire}=require('node:module');
const repo=path.resolve(__dirname,'..');
const repoRequire=createRequire(path.join(repo,'package.json'));
const {JSDOM}=repoRequire('jsdom');
const source=fs.readFileSync(path.join(repo,'public/game/visual-v2.js'),'utf8');
const keys=['papa','ciruela','cereza','remolacha','zanahoria','cebolla','calabacin','repollo','calabaza','brocoli','girasol','trigo','maiz'];
const crop=k=>'assets/visual-v2/ui/crops/'+k+'.png?v=5';
const seed=k=>'assets/visual-v2/ui/seeds/'+k+'.svg?v=1';
const classic=(family,k)=>'assets/farm/'+family+'_'+k+'.png?a=7';
const fallbackHandler="this.outerHTML='<span class=\"fallback\">?</span>'";
const tick=async()=>{for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));};

function fixture(html='',width=1200){
 const dom=new JSDOM('<!doctype html><body><button id="cfg-visual-v2"></button>'+html+'</body>',{url:'http://localhost/',runScripts:'outside-only'});
 const w=dom.window;w.innerWidth=width;
 w.G={golden:12,plata:7,res:{calabaza:3},seeds:{calabaza:5},selSeed:'calabaza',hot:[{kind:'seed',key:'calabaza'}]};
 const before=JSON.stringify(w.G);w.eval(source);
 return {dom,w,doc:w.document,before,close:()=>dom.window.close()};
}
function image(doc,family,key,host=doc.body){
 const img=doc.createElement('img');img.setAttribute('src',classic(family,key));img.setAttribute('onerror',fallbackHandler);host.append(img);return img;
}

test('13 crops share the product identity in inventory, hotbar, costs, wheel, trade and both market tabs',async()=>{
 const html='<div id="inv"></div><div id="hotbar"></div><div id="costs"></div><div id="wheel"></div><div id="trade"></div><div id="seed-shop"></div><div id="sell-shop"></div>';
 const f=fixture(html),all=[];
 try{
  for(const k of keys){
   for(const id of ['inv','hotbar','costs','trade','sell-shop'])all.push([image(f.doc,'crop',k,f.doc.getElementById(id)),crop(k)]);
   for(const id of ['inv','hotbar','wheel'])all.push([image(f.doc,'seed',k,f.doc.getElementById(id)),seed(k)]);
   const mimg=f.doc.createElement('span');mimg.className='mimg';f.doc.getElementById('seed-shop').append(mimg);all.push([image(f.doc,'seed',k,mimg),crop(k)]);
  }
  await tick();for(const [img,expected]of all)assert.equal(img.getAttribute('src'),expected);
  assert.equal(JSON.stringify(f.w.G),f.before,'visual updates preserve the complete synthetic save');
 }finally{f.close();}
});

test('classic/mobile restores exact sources, inline errors and the same DOM nodes/listeners',async()=>{
 const f=fixture('<div id="inv"></div><div id="seed-shop"><span class="mimg"></span></div>'),all=[];
 try{
  for(const k of keys)for(const family of ['crop','seed'])all.push(image(f.doc,family,k));
  const m=image(f.doc,'seed','calabaza',f.doc.querySelector('.mimg'));all.push(m);
  const originals=all.map(x=>x.getAttribute('src'));let clicks=0;all[0].addEventListener('click',()=>clicks++);
  await tick();f.w.GoldenVisual.setEnabled(false);await tick();
  all.forEach((img,i)=>{assert.equal(img.getAttribute('src'),originals[i]);assert.equal(img.getAttribute('onerror'),fallbackHandler);assert(img.isConnected);});
  f.w.GoldenVisual.setEnabled(true);await tick();assert.equal(m.getAttribute('src'),crop('calabaza'));
  f.w.innerWidth=640;f.w.dispatchEvent(new f.w.Event('resize'));await tick();
  all.forEach((img,i)=>assert.equal(img.getAttribute('src'),originals[i]));
  f.w.innerWidth=1200;f.w.dispatchEvent(new f.w.Event('resize'));await tick();assert.equal(all[0].getAttribute('src'),crop('papa'));
  all[0].click();assert.equal(clicks,1);assert.equal(JSON.stringify(f.w.G),f.before);
 }finally{f.close();}
});

test('subtree insertion and late src assignment decorate without rebuilding nodes',async()=>{
 const f=fixture();
 try{
  const container=f.doc.createElement('section');container.innerHTML='<div><img src="assets/farm/crop_cereza.png?a=7"></div><img src="assets/farm/seed_maiz.png?a=7">';f.doc.body.append(container);
  const late=f.doc.createElement('img');f.doc.body.append(late);await tick();late.setAttribute('src',classic('crop','girasol'));await tick();
  assert.equal(container.querySelector('img').getAttribute('src'),crop('cereza'));assert.equal(container.lastElementChild.getAttribute('src'),seed('maiz'));assert.equal(late.getAttribute('src'),crop('girasol'));
 }finally{f.close();}
});

test('a reused img can change crop key and switch between seed and crop',async()=>{
 const f=fixture();
 try{
  const img=image(f.doc,'crop','papa');await tick();
  for(const [family,key]of [['crop','calabaza'],['seed','calabaza'],['seed','ciruela'],['crop','ciruela']]){
   img.setAttribute('src',classic(family,key));await tick();assert.equal(img.getAttribute('src'),family==='seed'?seed(key):crop(key));
  }
  f.w.GoldenVisual.setEnabled(false);await tick();assert.equal(img.getAttribute('src'),classic('crop','ciruela'));
 }finally{f.close();}
});

test('a reused img can become a noncrop without being forced back to its previous crop',async()=>{
 const f=fixture();
 try{
  const img=image(f.doc,'seed','papa');await tick();
  img.setAttribute('src','assets/farm/res_madera.png?a=7');await tick();
  assert.equal(img.getAttribute('src'),'assets/farm/res_madera.png?a=7');
  f.w.GoldenVisual.setEnabled(false);await tick();assert.equal(img.getAttribute('src'),'assets/farm/res_madera.png?a=7');
 }finally{f.close();}
});

test('moving a seed img out of market restores the seed-bag distinction',async()=>{
 const f=fixture('<div id="seed-shop"><span class="mimg"></span></div><div id="inv"></div>');
 try{
  const img=image(f.doc,'seed','papa',f.doc.querySelector('.mimg'));await tick();assert.equal(img.getAttribute('src'),crop('papa'));
  f.doc.getElementById('inv').append(img);await tick();assert.equal(img.getAttribute('src'),seed('papa'));
 }finally{f.close();}
});

test('crop and seed failures are independent and restore matching originals before original error policy',async()=>{
 const f=fixture();
 try{
  const a=image(f.doc,'crop','calabaza'),b=image(f.doc,'seed','calabaza');await tick();
  a.dispatchEvent(new f.w.Event('error'));await tick();assert.equal(a.getAttribute('src'),classic('crop','calabaza'));assert.equal(a.getAttribute('onerror'),fallbackHandler);assert(a.isConnected);assert.equal(b.getAttribute('src'),seed('calabaza'));
  b.dispatchEvent(new f.w.Event('error'));await tick();assert.equal(b.getAttribute('src'),classic('seed','calabaza'));assert.equal(b.getAttribute('onerror'),fallbackHandler);
  const a2=image(f.doc,'crop','calabaza'),b2=image(f.doc,'seed','calabaza');await tick();assert.equal(a2.getAttribute('src'),classic('crop','calabaza'));assert.equal(b2.getAttribute('src'),classic('seed','calabaza'));
  f.w.GoldenVisual.setEnabled(false);await tick();f.w.GoldenVisual.setEnabled(true);await tick();assert.equal(a.getAttribute('src'),classic('crop','calabaza'));
 }finally{f.close();}
});

test('images without an original inline error keep it absent after classic restoration',async()=>{
 const f=fixture('<img id="bare" src="assets/farm/crop_brocoli.png?a=7">');
 try{const img=f.doc.getElementById('bare');assert.equal(img.getAttribute('onerror'),null);f.w.GoldenVisual.setEnabled(false);await tick();assert.equal(img.getAttribute('onerror'),null);}finally{f.close();}
});

test('unknown species, unrelated names and external origins are not restyled',async()=>{
 const sources=['assets/farm/crop_rabano.png','assets/farm/res_crop_papa.png','assets/farm/crop_papa.png.evil','https://unrelated.example/assets/farm/crop_papa.png'];
 const f=fixture();
 try{const imgs=sources.map(src=>{const i=f.doc.createElement('img');i.setAttribute('src',src);f.doc.body.append(i);return i;});await tick();imgs.forEach((img,i)=>assert.equal(img.getAttribute('src'),sources[i]));}finally{f.close();}
});

test('same-origin absolute and query-bearing classic URLs restore exactly',async()=>{
 const f=fixture(),url='http://localhost/assets/farm/seed_trigo.png?a=7&case=exact';
 try{const img=f.doc.createElement('img');img.setAttribute('src',url);f.doc.body.append(img);await tick();assert.equal(img.getAttribute('src'),seed('trigo'));f.w.GoldenVisual.setEnabled(false);await tick();assert.equal(img.getAttribute('src'),url);}finally{f.close();}
});

test('a reused img preserves the new renderer inline error policy',async()=>{
 const f=fixture(),newHandler="this.setAttribute('data-new-error','1')";
 try{const img=image(f.doc,'crop','papa');await tick();img.setAttribute('src',classic('crop','maiz'));img.setAttribute('onerror',newHandler);await tick();f.w.GoldenVisual.setEnabled(false);await tick();assert.equal(img.getAttribute('onerror'),newHandler);}finally{f.close();}
});

test('property-assigned error handler does not run before renewed fallback and is restored afterward',async()=>{
 const dom=new JSDOM('<!doctype html><body><img id="x" src="assets/farm/crop_papa.png?a=7"></body>',{url:'http://localhost/',runScripts:'outside-only'}),w=dom.window;w.innerWidth=1200;const img=w.document.getElementById('x');let called=0;const oldError=()=>{called++;};img.onerror=oldError;
 try{w.eval(source);img.dispatchEvent(new w.Event('error'));await tick();assert.equal(called,0,'new-image error is handled before original fallback policy');assert.equal(img.getAttribute('src'),classic('crop','papa'));w.GoldenVisual.setEnabled(false);await tick();assert.equal(img.onerror,oldError);}finally{dom.window.close();}
});

// La etiqueta de la semilla contiene el mismo PNG, sin una segunda versión dibujada.
test('13 seed SVG labels embed the exact market PNG and contain no active or external content',()=>{
 for(const key of keys){
  const svg=fs.readFileSync(path.join(repo,'public/assets/visual-v2/ui/seeds',key+'.svg'),'utf8');
  const dom=new JSDOM(svg,{contentType:'image/svg+xml'}),doc=dom.window.document;
  assert.equal(doc.documentElement.getAttribute('viewBox'),'0 0 128 128');
  assert.equal(doc.querySelectorAll('script,foreignObject').length,0);
  const images=[...doc.querySelectorAll('image')];assert.equal(images.length,1);
  const href=images[0].getAttribute('xlink:href');assert(href.startsWith('data:image/png;base64,'));
  assert.deepEqual(Buffer.from(href.split(',')[1],'base64'),fs.readFileSync(path.join(repo,'public/assets/visual-v2/ui/crops',key+'.png')));
  assert(![...doc.querySelectorAll('*')].some(el=>[...el.attributes].some(attr=>/^on/i.test(attr.name))));
  dom.window.close();
 }
});
