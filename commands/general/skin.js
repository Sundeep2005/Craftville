const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const axios = require('axios');
const settings = require("../../settings.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skin')
    .setDescription('Bekijk de skin van een speler.')
    .addStringOption(option =>
      option.setName('speler')
        .setDescription('De speler waarvan je de skin wilt bekijken.')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.editReply({ content: 'Skin is aan het laden...', flags: MessageFlags.Ephemeral });

      const speler = interaction.options.getString('speler');
      const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${speler}`);

      if (!response.data || !response.data.id) {
        return interaction.editReply({ content: 'Gebruiker niet gevonden!', flags: MessageFlags.Ephemeral });
      }

      const uuid = response.data.id;

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Download skin')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://visage.surgeplay.com/skin/${uuid}`)
      );

      const embed = new EmbedBuilder()
        .setTitle(`Skin van ${speler}`)
        .setThumbnail(`https://visage.surgeplay.com/skin/${uuid}`)
        .setImage(`https://visage.surgeplay.com/full/${uuid}`)
        .setColor(settings.bot.embedColor)
        .setFooter({
          text: settings.bot.footerText || '',
          iconURL: settings.bot.footerIcon || ''
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed], components: [buttons], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      return interaction.editReply({ content: 'Er ging iets fout!', flags: MessageFlags.Ephemeral });
    }
  }
};