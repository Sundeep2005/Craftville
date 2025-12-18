const { MessageFlags, PermissionFlagsBits } = require("discord.js");
const settings = require("../../settings.json");
const { getTicketByChannelId } = require("../../database/queries");
const { getDb } = require("../../database/sqlite");

function isStaff(member) {
  const staffRoleIds = settings?.roles?.staffRoleIds || [];
  return (
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    staffRoleIds.some(id => member.roles.cache.has(id))
  );
}

module.exports = {
  name: "move",
  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.editReply({ content: "❌ Alleen in een server.", flags: MessageFlags.Ephemeral });
    }

    const ticket = await getTicketByChannelId(interaction.guildId, interaction.channelId);
    if (!ticket) {
      return interaction.editReply({ content: "❌ Dit kanaal is geen ticket.", flags: MessageFlags.Ephemeral });
    }

    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: "❌ Alleen staff kan tickets verplaatsen.", flags: MessageFlags.Ephemeral });
    }

    const type = interaction.options.getString("categorie", true);
    const catCfg = settings?.tickets?.categories?.[type];

    if (!catCfg?.categoryId) {
      return interaction.editReply({
        content: "❌ Die categorie is niet goed ingesteld in settings.json (tickets.categories).",
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await interaction.channel.setParent(catCfg.categoryId, { lockPermissions: false });
    } catch (e) {
      console.error("[TicketMove] error:", e);
      return interaction.reply({
        content: "❌ Kon ticket niet verplaatsen (permissions / categoryId fout).",
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      const db = getDb?.();
      if (db) {
        await db.run(
          `UPDATE tickets SET type = ? WHERE guildId = ? AND channelId = ?`,
          [type, interaction.guildId, interaction.channelId]
        );
      }
    } catch (e) {
      console.log("[TicketMove] DB update skipped/failed:", e?.message);
    }

    return interaction.editReply({
      content: `✅ Ticket verplaatst naar categorie **${catCfg.label || type}**`,
      flags: MessageFlags.Ephemeral
    });
  }
};