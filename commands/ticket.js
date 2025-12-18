const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const setup = require("./ticket/setup");
const add = require("./ticket/add");
const remove = require("./ticket/remove");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket systeem")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Stel het ticketselectiemenu in")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Kanaal waar het ticketmenu geplaatst wordt")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Voeg een member toe aan dit ticket (op userID)")
        .addStringOption((opt) =>
          opt.setName("userid").setDescription("User ID").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Verwijder een member uit dit ticket (op userID)")
        .addStringOption((opt) =>
          opt.setName("userid").setDescription("User ID").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") return setup.execute(interaction, client);
    if (sub === "add") return add.execute(interaction, client);
    if (sub === "remove") return remove.execute(interaction, client);
  },
};
