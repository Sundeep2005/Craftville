const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const settings = require("../../settings.json");
const { parseShareId, fetchDiscohookShare } = require("../../utils/discohook");

function isStaff(member) {
  const staffRoleIds = settings?.roles?.staffRoleIds || [];
  return staffRoleIds.some((id) => member?.roles?.cache?.has(id));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Importeer een bericht vanuit een Discohook share link")
    .addChannelOption((opt) =>
      opt
        .setName("kanaal")
        .setDescription("Waar moet het bericht geplaatst worden?")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("sharelink")
        .setDescription("Discohook share link (https://discohook.app/?share=...) of share-id")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: "❌ Alleen staff kan dit commando gebruiken.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.options.getChannel("kanaal", true);
    const sharelink = interaction.options.getString("sharelink", true);

    const shareId = parseShareId(sharelink);
    if (!shareId) {
      return interaction.reply({
        content:
          "❌ Ongeldige Discohook share link.\nGebruik bijvoorbeeld: `https://discohook.app/?share=...`",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      content: "⏳ Bezig… Ik haal de embed op vanuit Discohook.",
      flags: MessageFlags.Ephemeral,
    });

    try {
      const payload = await fetchDiscohookShare(shareId);
      await channel.send(payload);

      return interaction.editReply({
        content: `✅ Geplaatst in ${channel}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      const status = e?.status ? ` (HTTP ${e.status})` : "";
      return interaction.editReply({
        content: `❌ Import mislukt${status}: ${e?.message || "Onbekende fout"}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};