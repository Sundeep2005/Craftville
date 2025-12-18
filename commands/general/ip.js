const { MessageFlags, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const settings = require("../../settings.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ip")
        .setDescription("Krijg het ip van de server"),   

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Server ipadres")
            .setDescription(`Het IP adres van de server is: \`${settings.server.serverIP}\` \nVersie: \`${settings.server.serverVersion}\``)
            .setColor(settings.bot.embedColor)
            .setFooter({
                text: settings.bot.footerText || '',
                iconURL: settings.bot.footerIcon || undefined
            });

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}