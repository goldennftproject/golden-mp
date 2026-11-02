import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUILD_ID,APP_ID} from './policy.mjs';
const token=process.env.DISCORD_TOKEN;
const headers={Authorization:'Bot '+token};
const commands=await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,{headers}).then(r=>r.json());
assert(commands.some(c=>c.name==='vincular'&&c.options?.[0]?.name==='codigo'));
const guild=await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`,{headers}).then(r=>r.json());
assert(guild.owner_id);
const source=readFileSync('C:/Users/pauli/Desktop/01_Proyectos/golden/golden-mp/public/game/save.js','utf8');
const anon=source.match(/const SB_KEY = "([^"]+)"/)[1];
const r=await fetch('https://ulspkdaljeuleqqdokfk.supabase.co/functions/v1/discord-link',{
 method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+anon,'x-discord-bot-token':token},
 body:JSON.stringify({action:'claim',code:'GF-'+('0'.repeat(32)),discord_id:guild.owner_id}),signal:AbortSignal.timeout(20000)
});
const b=await r.json();
assert.equal(r.status,409);assert.match(b.error,/Código inválido o caducado/);
console.log('OK: /vincular registrado, bot oficial autenticado, miembro verificado y código ficticio rechazado sin vincular ninguna cuenta.');
