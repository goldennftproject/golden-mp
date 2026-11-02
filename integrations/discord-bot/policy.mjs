export const GUILD_ID = '1564640221063024763';
export const APP_ID = '1564641499654656091';
export const GAME_URL = 'https://goldenfarm.onrender.com';
export function permitted(interaction, administrative = false) {
  return interaction.guildId === GUILD_ID && (!administrative || interaction.memberPermissions?.has('ManageGuild') === true);
}
export function reportText(title, details) {
  return { title: title.slice(0, 100), description: details.slice(0, 3500), color: 0xd9a441 };
}
