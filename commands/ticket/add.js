const { errorEmbed, infoEmbed } = require("../../utils/embeds");
const { isValidSnowflake } = require("../../utils/ids");
const { isStaff } = require("../../utils/tickets");
const { getTicketByChannelId } = require("../../database/queries");
const { MessageFlags } = require("discord.js");

module.exports = {
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed("Je hebt geen permissie (staff-only).")],
        flags: MessageFlags.Ephemeral
      });
    }

    const userId = interaction.options.getString("userid");
    if (!isValidSnowflake(userId)) {
      return interaction.reply({
        embeds: [errorEmbed("Ongeldig userId.")],
        flags: MessageFlags.Ephemeral
      });
    }

    const ticket = await getTicketByChannelId(interaction.guildId, interaction.channelId);
    if (!ticket || ticket.status !== "open") {
      return interaction.reply({
        embeds: [errorEmbed("Dit kanaal is geen open ticket.")],
        flags: MessageFlags.Ephemeral
      });
    }

    let user;
    try {
      user = await interaction.client.users.fetch(userId);
    } catch {
      return interaction.reply({
        embeds: [errorEmbed("Deze gebruiker bestaat niet of is niet bereikbaar.")],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.channel.permissionOverwrites.edit(user, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });

    return interaction.reply({
      embeds: [infoEmbed("✅ Toegevoegd", `<@${userId}> is toegevoegd aan dit ticket.`)],
      flags: MessageFlags.Ephemeral
    });
  }
};
