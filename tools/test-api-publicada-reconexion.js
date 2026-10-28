'use strict';
// Solo cuentas QA existentes. El token se recibe en memoria, nunca se escribe.
// No obtiene credenciales del navegador ni crea cuentas, depósitos o retiros.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const QA=new Set(['d548f198-5cb6-4010-a4d1-aa882e8b6777','f66c8ebb-daeb-4473-bafc-49b88ba9ca84']);
async function probar({url,key,token,uid}){
 assert.equal(url,'https://ulspkdaljeuleqqdokfk.supabase.co');assert.ok(QA.has(uid),'Solo cuentas QA autorizadas');
 const headers={apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const account=await fetch(url+'/auth/v1/user',{headers,signal:AbortSignal.timeout(15000)});
 assert.equal(account.status,200);assert.equal((await account.json()).id,uid);
 const leer=async()=>{const r=await fetch(url+'/rest/v1/farms?user_id=eq.'+uid+'&select=name,data,updated_at',{headers,signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);const rows=await r.json();assert.equal(rows.length,1);return rows[0];};
 const antes=await leer(),body={jornada:1,name:antes.name,data:structuredClone(antes.data),op:randomUUID(),base:antes.updated_at};
 const abort=new AbortController(),r=await fetch(url+'/functions/v1/guardar',{method:'POST',headers,body:JSON.stringify(body),signal:abort.signal});
 assert.equal(r.status,200);abort.abort();await assert.rejects(()=>r.json(),{name:'AbortError'});
 const retry=await fetch(url+'/functions/v1/guardar',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 assert.equal(retry.status,200);const ack=await retry.json();assert.equal(ack.ok,true);assert.equal(ack.repetido,true);
 const despues=await leer();assert.equal(despues.updated_at,ack.updated_at);assert.equal(despues.data.plata,antes.data.plata);
 for(const k of ['res','seeds','plots','nodos'])assert.deepEqual(despues.data[k],antes.data[k],k+' debe conservarse');
 return{ok:true,entorno:'API publicada',respuestaPerdida:'AbortError después de cabeceras',reintentoMismoRecibo:true,versionUnica:true,saldoInventarioParcelasNodosConservados:true};
}
module.exports={probar};
