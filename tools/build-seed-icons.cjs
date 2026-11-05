'use strict';
// SVG de interfaz: saco común y la misma ilustración PNG del catálogo, sin redibujar el cultivo.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const crops=['papa','ciruela','cereza','remolacha','zanahoria','cebolla','calabacin','repollo','calabaza','brocoli','girasol','trigo','maiz'];
const target=path.join(root,'public/assets/visual-v2/ui/seeds');fs.mkdirSync(target,{recursive:true});
const manifest=[];
for(const key of crops){
 const source=fs.readFileSync(path.join(root,'public/assets/visual-v2/ui/crops',key+'.png'));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128" width="128" height="128">
 <defs><linearGradient id="cloth" x1="0" x2="1" y2=".8"><stop stop-color="#dcb16b"/><stop offset=".45" stop-color="#bd8544"/><stop offset="1" stop-color="#885025"/></linearGradient></defs>
 <path d="M48 30 37 16 39 9 49 7 59 12 66 7 82 8 89 16 78 31 78 39 88 48 101 70 108 94 104 111 94 119 34 119 23 111 20 95 28 71 39 49 50 39Z" fill="#58351e" stroke="#40291b" stroke-width="4" stroke-linejoin="round"/>
 <path d="m50 31-9-15 8-5 12 8 6-8 16 2-9 19v10l12 11 13 22 7 22-5 13-11 5H37l-10-8-2-12 8-23 11-20 11-12-2-10Z" fill="url(#cloth)"/>
 <path d="m45 50-9 25-5 20 3 12m55-54 9 25 3 18-4 13M49 16l6 12m17-14-6 15" fill="none" stroke="#f0c887" stroke-width="3" stroke-linecap="round"/>
 <path d="m56 39-8 12m23-12 10 14m-44 56 54 1" fill="none" stroke="#855027" stroke-width="3" stroke-linecap="round"/>
 <path d="M48 32q16-5 31 0l-1 8q-16-4-29 0Z" fill="#755025" stroke="#49301c" stroke-width="3"/>
 <path d="m49 33 28 2m-13 2-8 17m10-17 12 14" fill="none" stroke="#f1d28e" stroke-width="3" stroke-linecap="round"/>
 <ellipse cx="64" cy="82" rx="32" ry="28" fill="#e9ce96" stroke="#91612f" stroke-width="2"/>
 <image x="30" y="52" width="68" height="60" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${source.toString('base64')}"/>
 </svg>\n`;
 const file=path.join(target,key+'.svg');fs.writeFileSync(file,svg);
 manifest.push({key,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),svgSha256:crypto.createHash('sha256').update(svg).digest('hex')});
}
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(manifest,null,2)+'\n');
console.log('13 sacos SVG creados con las ilustraciones exactas del Mercado.');
