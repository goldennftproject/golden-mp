// La interacción se reconoce antes de validar o consultar la red. Nunca registra códigos/usuarios.
export async function handleLinkCommand(interaction,{claim,cooldowns,ephemeral,now=Date.now}) {
  await interaction.deferReply({flags:ephemeral});
  const code=interaction.options.getString('codigo',true).trim().toUpperCase();
  if(!/^GF-[A-F0-9]{32}$/.test(code))return interaction.editReply('Código inválido. Genera uno en Configuración → Discord dentro del juego.');
  const key='link:'+interaction.user.id,previous=cooldowns.get(key)||0;
  if(now()-previous<10000)return interaction.editReply('Espera unos segundos antes de volver a comprobar.');
  cooldowns.set(key,now());
  try {
    const result=await claim(code,interaction.user.id);
    return await interaction.editReply(result.ok&&result.body?.ok
      ? 'Discord identificado. Vuelve a Configuración → Discord en Golden Farm, pulsa Comprobar vinculación y confirma que aparece tu perfil. Esto no cambia tu saldo ni tu progreso.'
      : result.body?.error||'No se pudo comprobar. Vuelve a intentarlo.');
  } catch {
    return interaction.editReply('Discord recibió el comando, pero no se pudo conectar con el juego. Vuelve a intentarlo; tu cuenta no se ha vinculado.');
  }
}
