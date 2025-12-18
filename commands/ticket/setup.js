const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  MessageFlags
} = require("discord.js");
const settings = require("../../settings.json");
const { infoEmbed, errorEmbed } = require("../../utils/embeds");


module.exports = {
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
      return interaction.reply({
        embeds: [errorEmbed("Kies een geldig tekstkanaal.")],
        flags: MessageFlags.Ephemeral
      });
    }

    if (channel.type === ChannelType.DM) {
      return interaction.reply({
        embeds: [errorEmbed("Je kunt geen DM-kanaal gebruiken.")],
        flags: MessageFlags.Ephemeral
      });
    }

    const categories = settings.tickets?.categories || {};
    const options = Object.entries(categories).map(([key, cfg]) => ({
      label: cfg.label ?? key,
      value: key,
      emoji: cfg.emoji || undefined,
    }));

    if (options.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed("Geen ticket categorieën gevonden in settings.json")],
        flags: MessageFlags.Ephemeral
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Kies een ticket categorie…")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    const embed = infoEmbed(
      "🎫 Craftville Tickets",
      "Heb je hulp nodig, wil je solliciteren, ben je content creator, heb je een bug gevonden, wil je een refund aanvragen of een speler rapporteren? Gebruik het onderstaande keuzemenu om eenvoudig een ticket aan te maken voor één van de volgende opties:\n\n **Ticketopties:**\n- Support (Algemene vragen of hulp)\n- Sollicitatie (Wordt onderdeel van het Craftville team)\n- Content Creator (Wordt een geverifieerde content creator bij Craftville)\n- Bug (Meld een gevonden bug)\n- Refunds (Vraag je geld terug op een gekochte product in de store)\n- Report: (rapporteer een speler die regels verbreekt)\n\nZodra een een ticket hebt aangemaakt, vragen we je het formulier zo goed en duidelijk mogelijk in te vullen, zodat we je zo snel mogelijk kunnen helpen!\n\n🔔 *Let op: ons staffteam verwerkt meerdere tickets tegelijk. We vragen je geduldig te wachten op een reactie en vermijd het taggen van staffleden.*"
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      embeds: [infoEmbed("✅ Setup geplaatst", `Ticket menu geplaatst in ${channel}.`)],
        flags: MessageFlags.Ephemeral
    });
  },
};