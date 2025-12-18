const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { isStaff, buildStatusMessage } = require("../../utils/serverStatus");
const {
  upsertServerStatusPanel,
  getServerStatusPanel,
  setServerStatusMessage
} = require("../../database/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Server status embed")
    .addSubcommand(sc =>
      sc.setName("status")
        .setDescription("Plaats het status embed in een kanaal")
        .addChannelOption(o =>
          o.setName("kanaal")
            .setDescription("Kanaal waar het status embed moet komen")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName("message")
        .setDescription("Pas de mededeling aan in het status panel")
        .addStringOption(o =>
          o.setName("tekst")
            .setDescription("Nieuwe mededeling")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: "❌ Alleen staff kan dit gebruiken." });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "status") {
      const channel = interaction.options.getChannel("kanaal", true);

      const existing = await getServerStatusPanel(interaction.guildId);
      const statusMessage = existing?.statusMessage || "Craftville Hardcore SMP – Nu bezig!";

      const payload = await buildStatusMessage(statusMessage);
      const msg = await channel.send(payload);

      await upsertServerStatusPanel(interaction.guildId, channel.id, msg.id);

      return interaction.editReply({
        content: `✅ Status panel geplaatst in ${channel} (bericht: ${msg.url})`
      });
    }

    if (sub === "message") {
      const text = interaction.options.getString("tekst", true).slice(0, 1000);

      const existing = await getServerStatusPanel(interaction.guildId);
      if (!existing) {
        return interaction.editReply({
          content: "❌ Eerst `/server status` gebruiken om het panel te plaatsen."
        });
      }

      await setServerStatusMessage(interaction.guildId, text);

      return interaction.editReply({
        content: "✅ Mededeling bijgewerkt. (Wordt binnen de update-interval ververst.)"
      });
    }

    return interaction.editReply({ content: "❌ Onbekende subcommand." });
  }
};
