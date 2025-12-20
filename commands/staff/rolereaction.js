const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const settings = require("../../settings.json");

const RR_MENU_ID = "rr_select_roles";
const RR_ROLES = settings?.roleReaction?.roles || [];

function isStaff(member) {
  const staffRoleIds = settings?.roles?.staffRoleIds || [];
  const developer = settings?.developerIds || [];

  if (developer.includes(member.id)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return staffRoleIds.some(id => member.roles.cache.has(id));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolereaction")
    .setDescription("Role select systeem")
    .addSubcommand(sc =>
      sc.setName("embed")
        .setDescription("Plaats de rollen embed met selection menu")
        .addChannelOption(o =>
          o.setName("kanaal")
            .setDescription("Kanaal waar de embed moet komen")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: "❌ Alleen staff kan dit commando gebruiken." });
    }

    const placeholders = RR_ROLES.filter(r => !r.roleId || r.roleId === "ROLE_ID_HIER");
    if (placeholders.length) {
      return interaction.editReply({
        content: "❌ Vul eerst alle ROLE_ID_HIER waardes in `commands/rolereaction.js` in."
      });
    }

    const channel = interaction.options.getChannel("kanaal", true);

    const embed = new EmbedBuilder()
      .setColor(settings?.bot?.embedColor)
      .setImage('https://i.imgur.com/cnIxWrA.png')
      .setTitle("🎭 Rollen Selecteren")
      .setDescription(
        "Kies je interesses en ontvang relevante meldingen!" +
        " Selecteer één of meerdere rollen in het menu hieronder."
      );

    if (settings?.bot?.footerText) {
      embed.setFooter({
        text: settings.bot.footerText,
        iconURL: settings?.bot?.footerIcon || null
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(RR_MENU_ID)
      .setPlaceholder("Kies je rollen…")
      .setMinValues(0)
      .setMaxValues(Math.min(RR_ROLES.length, 10))
      .addOptions(
        RR_ROLES.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.label)
            .setValue(r.roleId)
            .setDescription((r.description || "").slice(0, 100))
            .setEmoji(r.emoji || undefined)
        )
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const msg = await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply({
      content: `✅ Rollen menu geplaatst in ${channel} (bericht: ${msg.url})`
    });
  }
};
