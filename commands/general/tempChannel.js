const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const tempChannelsStore = require('../../utils/tempChannelStore');
const settings = require('../../settings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempchannel')
        .setDescription('Beheer je tempchannel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Connect)
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Hernoem je tempchannel')
                .addStringOption(option => option.setName('naam').setDescription('Nieuwe kanaalnaam').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('limit')
                .setDescription('Stel het limiet in van je tempchannel')
                .addIntegerOption(option => option.setName('aantal').setDescription('Max aantal leden (0 = geen limiet)').setRequired(true).setMinValue(0).setMaxValue(99))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Vergrendel je tempchannel voor anderen')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Maak je tempchannel weer open voor anderen')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Voeg een member toe aan je tempchannel')
                .addUserOption(option => option.setName('member').setDescription('member die je wilt toevoegen').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Verwijder een member uit je kanaal')
                .addUserOption(option => option.setName('member').setDescription('member die je wilt verwijderen').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const member = interaction.member;
        const guild = interaction.guild;

        const tempChannelId = await tempChannelsStore.findByOwner(member.id);
        if (!tempChannelId) {
            const embed = new EmbedBuilder()
                .setTitle('⛔ Geen tijdelijk kanaal')
                .setDescription('Je hebt geen tempchannel om te beheren.')
                .setColor(settings.bot.embedColor);
            return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const channel = guild.channels.cache.get(tempChannelId);
        if (!channel) {
            const embed = new EmbedBuilder()
                .setTitle('⛔ Kanaal niet gevonden')
                .setDescription('Je tempchannel is niet gevonden.')
                .setColor(settings.bot.embedColor);
            return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        switch (sub) {
            case 'rename': {
                const nieuweNaam = interaction.options.getString('naam');
                await channel.setName(nieuweNaam);
                const embed = new EmbedBuilder()
                    .setTitle('✏️ Kanaal hernoemd')
                    .setDescription(`Je kanaal is hernoemd naar **${nieuweNaam}**.`)
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            case 'limit': {
                const aantal = interaction.options.getInteger('aantal');
                await channel.setUserLimit(aantal);
                const embed = new EmbedBuilder()
                    .setTitle('🔢 Limiet ingesteld')
                    .setDescription(`Maximaal aantal leden ingesteld op **${aantal === 0 ? 'geen limiet' : aantal}**.`)
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            case 'lock': {
                await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
                const embed = new EmbedBuilder()
                    .setTitle('🔒 Kanaal vergrendeld')
                    .setDescription('Je kanaal is nu vergrendeld voor iedereen behalve jou en toegevoegde leden.')
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            case 'unlock': {
                await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: true });
                const embed = new EmbedBuilder()
                    .setTitle('🔓 Kanaal ontgrendeld')
                    .setDescription('Je kanaal is nu open voor iedereen.')
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            case 'add': {
                const user = interaction.options.getUser('member');
                await channel.permissionOverwrites.edit(user.id, { Connect: true });
                const embed = new EmbedBuilder()
                    .setTitle('➕ Lid toegevoegd')
                    .setDescription(`<@${user.id}> is toegevoegd aan je kanaal.`)
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            case 'remove': {
                const user = interaction.options.getUser('member');
                await channel.permissionOverwrites.edit(user.id, { Connect: false });
                const embed = new EmbedBuilder()
                    .setTitle('➖ Lid verwijderd')
                    .setDescription(`<@${user.id}> is verwijderd uit je kanaal.`)
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            default: {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Fout')
                    .setDescription('Onbekende subcommand.')
                    .setColor(settings.bot.embedColor);
                return interaction.editReply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};