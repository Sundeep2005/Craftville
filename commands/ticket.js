const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const setup = require("./ticket/setup");
const add = require("./ticket/add");
const remove = require("./ticket/remove");
const rename = require("./ticket/rename");
const move = require("./ticket/move");

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
    .addSubcommand(sc =>
      sc.setName("rename")
        .setDescription("rename het huidige ticket kanaal")
        .addStringOption(o =>
          o.setName("naam")
            .setDescription("Nieuwe naam (zonder #)")
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName("move")
        .setDescription("Verplaats dit ticket naar een andere categorie")
        .addStringOption(o =>
          o.setName("categorie")
            .setDescription("Waarheen verplaatsen?")
            .setRequired(true)
            .addChoices(
              { name: "Support", value: "support" },
              { name: "Sollicitatie", value: "sollicitatie" },
              { name: "Bug", value: "bug" },
              { name: "Content", value: "content" },
              { name: "Refund", value: "refund" },
              { name: "Report", value: "report" }
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") return setup.execute(interaction, client);
    if (sub === "add") return add.execute(interaction, client);
    if (sub === "remove") return remove.execute(interaction, client);
    if (sub === "rename") return rename.execute(interaction, client);
    if (sub === "move") return move.execute(interaction, client);
  },
};
