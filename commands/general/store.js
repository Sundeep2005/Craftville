const { MessageFlags, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const settings = require("../../settings.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("store")
        .setDescription("Krijg de link van de webstore"),   

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Server Webstore")
            .setDescription(`Je kunt onze webstore bezoeken via de volgende link: [craftville.nl/store](${settings.server.serverStore})`)
            .setColor(settings.bot.embedColor)
            .setFooter({
                text: settings.bot.footerText || '',
                iconURL: settings.bot.footerIcon || undefined
            });

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}