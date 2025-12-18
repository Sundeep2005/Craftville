const { MessageFlags, PermissionFlagsBits } = require("discord.js");
const settings = require("../../settings.json");
const { getTicketByChannelId } = require("../../database/queries");

function isStaff(member) {
  const staffRoleIds = settings?.roles?.staffRoleIds || [];
  return (
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    staffRoleIds.some(id => member.roles.cache.has(id))
  );
}

function toChannelName(input) {
  return String(input)
    .toLowerCase()
    .replace(/[#]/g, "")
    .replace(/[^a-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

module.exports = {
  name: "rename",
  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.editReply({ content: "❌ Alleen in een server.", flags: MessageFlags.Ephemeral });
    }

    const ticket = await getTicketByChannelId(interaction.guildId, interaction.channelId);
    if (!ticket) {
      return interaction.editReply({ content: "❌ Dit kanaal is geen ticket.", flags: MessageFlags.Ephemeral });
    }

    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: "❌ Alleen staff kan tickets renamen.", flags: MessageFlags.Ephemeral });
    }

    const raw = interaction.options.getString("naam", true);
    const newName = toChannelName(raw);

    if (!newName || newName.length < 2) {
      return interaction.editReply({ content: "❌ Ongeldige naam.", flags: MessageFlags.Ephemeral });
    }

    try {
      await interaction.channel.setName(newName, `Ticket rename by ${interaction.user.tag}`);
    } catch (e) {
      console.error("[TicketRename] error:", e);
      return interaction.editReply({
        content: "❌ Kon kanaalnaam niet wijzigen (permissions / rate limit).",
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.editReply({
      content: `✅ Ticket hernoemd naar **#${newName}**`,
      flags: MessageFlags.Ephemeral
    });
  }
};