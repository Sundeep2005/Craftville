const { Events, EmbedBuilder } = require('discord.js');
const settings = require('../settings.json');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const welcomeChannelId = settings.channels.welcomeChannelId;
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(settings.bot.embedColor || '#F5A623')
        .setTitle('👋 WELKOM OP **CRAFTVILLE**')
        .setDescription(
          `Hey **${member.displayName}**, welkom in de **Craftville** discord server,\nlees <#793127164043067413>!\n\n` +
          '• Java — `play.craftville.nl`\n' +
          '• Bedrock — `pe.craftville.nl:19132`'       
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: settings.bot.footerText,
          iconURL: settings.bot.footerIcon
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

    } catch (err) {
      console.error('[guildMemberAdd] Fout:', err);
    }
  }
};
