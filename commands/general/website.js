const { MessageFlags, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const settings = require("../../settings.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("website")
        .setDescription("Krijg de website url"),   

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Craftville Website")
            .setDescription(`Bezoek onze website op: [www.craftville.nl](https://www.craftville.nl)`)
            .setColor(settings.bot.embedColor)
            .setFooter({
                text: settings.bot.footerText || '',
                iconURL: settings.bot.footerIcon || undefined
            });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}