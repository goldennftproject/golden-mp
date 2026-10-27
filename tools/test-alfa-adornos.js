const fs=require('fs');let src=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
src+=`(async()=>{
 let s=servidor({...inicial,data:{...inicial.data,golden:100,decoBolsa:{},decos:[]}});
 let next={...s.row().data,decoBolsa:{estatua:1}};
 assert.equal((await s.call({base,data:next})).status,409,'no se conserva un adorno premium sin cobrarlo');
 next.golden=40;assert.equal((await s.call({base,data:next})).status,200,'precio normal aceptado');
 s=servidor({...inicial,data:{...inicial.data,golden:100,decoBolsa:{estatua:1},decos:[]}});
 next={...s.row().data,decoBolsa:{estatua:0},decos:[{id:'estatua',col:1,row:1}]};
 assert.equal((await s.call({base,data:next})).status,200,'colocar no cobra otra compra');
 s=servidor({...inicial,data:{...inicial.data,golden:100,decoBolsa:{},decos:[]}});
 assert.equal((await s.call({base,data:{...s.row().data,decoBolsa:{estatua:'1'}}})).status,409,'cantidades de texto no fabrican derechos');
 console.log('OK: adornos premium se pagan, moverlos no vuelve a cobrar y texto no evade el portero.');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',src)(require,__dirname);
