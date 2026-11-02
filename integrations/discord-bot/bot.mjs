import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { readFileSync } from 'node:fs';
import { GUILD_ID, APP_ID, GAME_URL, permitted, reportText } from './policy.mjs';

const GAME_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsc3BrZGFsamV1bGVxcWRva2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDk5NTMsImV4cCI6MjEwNDk4NTk1M30.HRtJ0kEX6kxAZl2uUhNur2czVmbwCl2jtEcM50p0EsA';

// The token is entered locally by the owner; never print or send it to chat.
let token = process.env.DISCORD_TOKEN;
if (!token && process.env.DISCORD_TOKEN_FILE) token = readFileSync(process.env.DISCORD_TOKEN_FILE, 'utf8').trim();
if (!token) throw new Error('Falta DISCORD_TOKEN o DISCORD_TOKEN_FILE.');
const client = new Client({ intents: [GatewayIntentBits.Guilds], allowedMentions: { parse: [] } });
const commands = [
  new SlashCommandBuilder().setName('ayuda').setDescription('Cómo jugar y utilizar este Discord'),
  new SlashCommandBuilder().setName('jugar').setDescription('Abrir Golden Farm'),
  new SlashCommandBuilder().setName('fallo').setDescription('Enviar un informe de un fallo'),
  new SlashCommandBuilder().setName('sugerencia').setDescription('Proponer una mejora'),
  new SlashCommandBuilder().setName('vincular').setDescription('Identificar tu Discord para vincularlo con tu granja').addStringOption(o=>o.setName('codigo').setDescription('Código generado en Configuración del juego').setRequired(true).setMinLength(35).setMaxLength(35)),
  new SlashCommandBuilder().setName('preparar-servidor').setDescription('Crear los canales que falten, sin borrar los existentes').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map(c => c.setDMPermission(false).toJSON());

async function prepare(guild) {
  await guild.channels.fetch();
  const existing = name => guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText);
  const names = ['empieza-aquí', 'anuncios', 'reportar-fallos', 'sugerencias'];
  const results = [];
  for (const name of names) {
    if (existing(name)) { results.push(`${name}: existente`); continue; }
    const readonly = ['empieza-aquí','anuncios'].includes(name);
    await guild.channels.create({ name, type: ChannelType.GuildText,
      topic: name === 'reportar-fallos' ? 'Usa /fallo. No compartas contraseñas, enlaces de acceso ni datos privados.' : name === 'sugerencias' ? 'Usa /sugerencia para proponer una mejora.' : 'Golden Farm · alfa',
      permissionOverwrites: readonly ? [
        { id: guild.id, deny: [PermissionFlagsBits.SendMessages] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ] : [], reason: 'Preparación autorizada de Golden Farm',
    });
    results.push(`${name}: creado`);
  }
  return results.join('\n');
}
const cooldowns = new Map();
client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand() && !i.isModalSubmit()) return;
  try {
    if (!permitted(i, i.commandName === 'preparar-servidor')) return await i.reply({ content: 'Esta acción no está disponible aquí o requiere Gestionar servidor.', flags: MessageFlags.Ephemeral });
    if (i.isChatInputCommand()) {
      if(i.commandName==='vincular'){
        await i.deferReply({flags:MessageFlags.Ephemeral});
        const code=i.options.getString('codigo',true).trim().toUpperCase();
        if(!/^GF-[A-F0-9]{32}$/.test(code))return await i.editReply('Código inválido. Genera uno en Configuración → Discord dentro del juego.');
        const previous=cooldowns.get('link:'+i.user.id)||0;
        if(Date.now()-previous<10000)return await i.editReply('Espera unos segundos antes de volver a comprobar.');
        cooldowns.set('link:'+i.user.id,Date.now());
        const result=await fetch('https://ulspkdaljeuleqqdokfk.supabase.co/functions/v1/discord-link',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+GAME_ANON_KEY,'x-discord-bot-token':token},
          body:JSON.stringify({action:'claim',code,discord_id:i.user.id}),signal:AbortSignal.timeout(15000)});
        const body=await result.json();
        return await i.editReply(result.ok&&body.ok?'Discord identificado. Vuelve a Configuración → Discord en Golden Farm, pulsa Comprobar vinculación y confirma que aparece tu perfil. Esto no cambia tu saldo ni tu progreso.':body.error||'No se pudo comprobar. Vuelve a intentarlo.');
      }
      if (i.commandName === 'preparar-servidor') {
        await i.deferReply({ flags: MessageFlags.Ephemeral });
        return await i.editReply(await prepare(i.guild));
      }
      if (i.commandName === 'jugar') return await i.reply({content:`🌾 **Golden Farm · Alfa para PC**\n${GAME_URL}\nEntra con el correo de tu granja y abre el enlace de acceso. Si ya jugabas, utiliza el mismo correo.`,flags:MessageFlags.Ephemeral});
      if (i.commandName === 'ayuda') {
        const canal = name => { const c=i.guild.channels.cache.find(c=>c.name===name);return c?`<#${c.id}>`:'#'+name; };
        return await i.reply({content:`🌾 **Golden Farm · ayuda rápida**\nRegistro e ingreso al juego abiertos de nuevo.\n🎮 ${GAME_URL}\n\n• Sigue el objetivo superior y pulsa **Mostrar** si no sabes dónde continuar.\n• Guarda con el disquete y espera **✓**. Si aparece **×**, no reinicies la cuenta ni borres los datos del navegador.\n• Evita jugar a la vez en varias pestañas; ante un conflicto, cierra la otra sesión antes de recuperar el guardado.\n\n🐛 **/fallo** → ${canal('reportar-fallos')}\n💡 **/sugerencia** → ${canal('sugerencias')}\n📌 Condiciones y reinicio de progreso: ${canal('anuncios')}\n\nRegistro e ingreso abiertos. Depósitos USDT en BNB Smart Chain desde el Banco. Retiros y canje Plata → Golden desactivados. No compartas enlaces de acceso ni credenciales.`,flags:MessageFlags.Ephemeral});
      }
      if (!['fallo','sugerencia'].includes(i.commandName)) return;
      const modal = new ModalBuilder().setCustomId(`golden:${i.commandName}`).setTitle(i.commandName === 'fallo' ? 'Reportar un fallo' : 'Proponer una mejora');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Resumen').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('detalle').setLabel('Pasos, resultado esperado y qué ocurrió').setStyle(TextInputStyle.Paragraph).setMaxLength(3500).setRequired(true)),
      );
      return await i.showModal(modal);
    }
    if (!['golden:fallo','golden:sugerencia'].includes(i.customId)) return;
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    const previous = cooldowns.get(i.user.id) || 0;
    if (Date.now() - previous < 60000) return await i.editReply('Espera un minuto antes de enviar otro informe.');
    cooldowns.set(i.user.id, Date.now());
    if (cooldowns.size > 5000) for (const [id,time] of cooldowns) if (Date.now()-time > 60000) cooldowns.delete(id);
    const name = i.customId === 'golden:fallo' ? 'reportar-fallos' : 'sugerencias';
    await i.guild.channels.fetch();
    const channel = i.guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText);
    if (!channel) return await i.editReply('El equipo todavía debe preparar el canal. Tu informe no se ha enviado.');
    const embed = reportText(i.fields.getTextInputValue('titulo'), i.fields.getTextInputValue('detalle'));
    embed.footer = { text: `Enviado por ${i.user.username}` };
    const message = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    await i.editReply(`Enviado: ${message.url}`);
  } catch {
    console.error('No se pudo completar una interacción. Revisa permisos y conexión.');
    const payload = { content: 'No se pudo completar la acción. Inténtalo de nuevo; no se ha confirmado el envío.', flags: MessageFlags.Ephemeral };
    try { if (i.deferred) await i.editReply({content:payload.content}); else if (!i.replied) await i.reply(payload); } catch {}
  }
});
client.once('clientReady', () => console.log('Golden Farm conectado. Vinculación por comando privado; sin lectura de mensajes generales ni acceso directo a la base de datos.'));
await new REST({ version: '10' }).setToken(token).put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands });
await client.login(token);
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { client.destroy(); process.exit(0); });
