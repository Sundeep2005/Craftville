const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require("discord.js");

const settings = require("../settings.json");
const { errorEmbed, infoEmbed, baseEmbed } = require("../utils/embeds");
const { formatChannelName, isStaff } = require("../utils/tickets");
const { buildTranscript } = require("../utils/transcripts");
const { closeTicketFlow } = require("../utils/ticketCloseFlow");

const {
  createTicket,
  insertTicketAnswers,
  setClaimedBy,
  requestClose,
  cancelClose,
  getTicketByChannelId,
  setClosePanelMessageId,
  getOpenTicketByOwnerAndType,
} = require("../database/queries");

function styleToEnum(s) {
  return s === "PARAGRAPH" ? TextInputStyle.Paragraph : TextInputStyle.Short;
}

function disableRow(row) {
  const newRow = new ActionRowBuilder();
  for (const c of row.components) {
    const btn = ButtonBuilder.from(c).setDisabled(true);
    newRow.addComponents(btn);
  }
  return newRow;
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    const RR_MENU_ID = "rr_select_roles";
    const RR_MANAGED_ROLE_IDS = [
      "1363967171679490128",
      "1366742819045249044",
      "1410711251943817236",
      "1363967240910667947",
      "1381976315653001226",
      "1440775739300642876"
    ];

    if (interaction.isStringSelectMenu() && interaction.customId === RR_MENU_ID) {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "❌ Dit kan alleen in een server.", flags: MessageFlags.Ephemeral });
      }

      if (RR_MANAGED_ROLE_IDS.some(id => id === "ROLE_ID_HIER")) {
        return interaction.reply({
          content: "❌ RoleReaction is nog niet ingesteld: ROLE_ID_HIER staat nog in interactionCreate.js",
          flags: MessageFlags.Ephemeral
        });
      }

      const member = interaction.member;

      const selected = interaction.values.map(String);
      const selectedManaged = selected.filter(id => RR_MANAGED_ROLE_IDS.includes(id));
      const currentlyHas = RR_MANAGED_ROLE_IDS.filter(id => member.roles.cache.has(id));

      const toAdd = selectedManaged.filter(id => !member.roles.cache.has(id));
      const toRemove = currentlyHas.filter(id => !selectedManaged.includes(id));

      try {
        if (toRemove.length) await member.roles.remove(toRemove, "RoleSelect: deselected");
        if (toAdd.length) await member.roles.add(toAdd, "RoleSelect: selected");
      } catch (e) {
        console.error("[RoleReaction] role edit failed:", e);
        return interaction.reply({
          content: "❌ Ik kan je rollen niet aanpassen. Check **Manage Roles** + role hierarchy.",
          flags: MessageFlags.Ephemeral
        });
      }

      return interaction.reply({
        content: `✅ Rollen bijgewerkt! Toegevoegd: **${toAdd.length}** • Verwijderd: **${toRemove.length}**`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      const type = interaction.values[0];
      const catCfg = settings.tickets.categories?.[type];

      if (!catCfg) {
        return interaction.reply({
          embeds: [errorEmbed("Deze categorie is niet goed ingesteld.")],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (settings.tickets.oneTicketPerUser) {
        const existing = await getOpenTicketByOwnerAndType(interaction.guildId, interaction.user.id, type);
        if (existing) {
          return interaction.reply({
            embeds: [errorEmbed(`Je hebt al een open ticket: <#${existing.channelId}>`)],
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      if (type === "sollicitatie") {
        const roles = settings.tickets.applicationRoles || [];
        if (!roles.length) {
          return interaction.reply({
            embeds: [errorEmbed("Geen sollicitatie functies ingesteld in settings.json (tickets.applicationRoles).")],
            flags: MessageFlags.Ephemeral
          });
        }

        const questionsAll = settings.tickets.modalQuestions?.[type] || [];
        const questions = type === "sollicitatie"
          ? questionsAll.filter(q => q.id !== "functie")
          : questionsAll;

        const limited = type === "sollicitatie" ? questions.slice(0, 4) : questions.slice(0, 5);

        const modal = new ModalBuilder()
          .setCustomId("ticket_modal:sollicitatie")
          .setTitle("Sollicitatie Ticket");

        modal.addLabelComponents(
          new LabelBuilder()
            .setLabel("Voor welke functie solliciteer je?")
            .setStringSelectMenuComponent(
              new StringSelectMenuBuilder()
                .setCustomId("functie")
                .setPlaceholder("Kies een functie…")
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                  roles.map(r =>
                    new StringSelectMenuOptionBuilder()
                      .setLabel(r.label)
                      .setValue(r.value)
                      .setEmoji(r.emoji ?? undefined)
                  )
                )
            )
        );

        for (const q of limited) {
          const input = new TextInputBuilder()
            .setCustomId(q.id)
            .setStyle(styleToEnum(q.style))
            .setRequired(!!q.required)
            .setMaxLength(q.max ?? 1000);

          modal.addLabelComponents(
            new LabelBuilder()
              .setLabel(q.label)
              .setTextInputComponent(input)
          );
        }

        return interaction.showModal(modal);
      }

      const questions = settings.tickets.modalQuestions?.[type];
      if (!Array.isArray(questions) || questions.length === 0) {
        return interaction.reply({
          embeds: [errorEmbed("Deze categorie heeft geen modalQuestions ingesteld.")],
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal:${type}`)
        .setTitle(`${catCfg.label} Ticket`);

      const limited = questions.slice(0, 5);
      for (const q of limited) {
        const input = new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(q.label)
          .setStyle(styleToEnum(q.style))
          .setRequired(!!q.required)
          .setMaxLength(q.max ?? 1000);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
      }

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
      const parts = interaction.customId.split(":");
      const type = parts[1];
      const catCfg = settings.tickets.categories?.[type];

      if (!catCfg?.categoryId) {
        return interaction.reply({
          embeds: [errorEmbed("CategoryId voor deze ticket-type ontbreekt in settings.json")],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (settings.tickets.oneTicketPerUser) {
        const existing = await getOpenTicketByOwnerAndType(interaction.guildId, interaction.user.id, type);
        if (existing) {
          return interaction.reply({
            embeds: [errorEmbed(`Je hebt al een open ticket: <#${existing.channelId}>`)],
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      const placeholderChannelId = `pending-${interaction.id}`;
      const ticketId = await createTicket({
        guildId: interaction.guildId,
        ownerId: interaction.user.id,
        channelId: placeholderChannelId,
        type,
      });

      const channelName = formatChannelName(type, interaction.user.username, ticketId);

      const ch = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: catCfg.categoryId,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      if (catCfg?.staffRoleIds?.length) {
        for (const roleId of catCfg.staffRoleIds) {
          await ch.permissionOverwrites.create(roleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
        }

        const { getDb } = require("../database/sqlite");
        await getDb().run(`UPDATE tickets SET channelId = ? WHERE id = ?`, [ch.id, ticketId]);

        const questions = settings.tickets.modalQuestions?.[type] || [];
        const limited = type === "sollicitatie" ? questions.slice(0, 4) : questions.slice(0, 5);

        const answers = [];

        if (type === "sollicitatie") {
          const values = interaction.fields.getStringSelectValues("functie");
          const functieValue = values?.[0] ?? null;
          const functieLabel =
            (settings.tickets.applicationRoles || []).find(r => r.value === functieValue)?.label
            ?? functieValue
            ?? "Onbekend";

          answers.push({
            questionId: "functie",
            label: "Voor welke functie solliciteer je?",
            value: functieLabel,
          });
        }

        for (const q of limited) {
          answers.push({
            questionId: q.id,
            label: q.label,
            value: interaction.fields.getTextInputValue(q.id),
          });
        }

        await insertTicketAnswers(ticketId, answers);

        const e = baseEmbed()
          .setTitle(`🎫 ${catCfg.label} Ticket`)
          .setDescription(
            `Hey <@${interaction.user.id}>! Bedankt dat je contact opneemt met het Craftville Support Team!\n\n**Ingevulde antwoorden:**`
          )
          .addFields(
            answers.map((a) => ({
              name: a.label,
              value: a.value?.slice(0, 1024) || "-",
              inline: false,
            }))
          );

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_btn:claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ticket_btn:transcript").setLabel("Transcript").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("ticket_btn:close").setLabel("Close").setStyle(ButtonStyle.Danger),
        );

        await ch.send({ content: `<@${interaction.user.id}>`, embeds: [e], components: [buttons] });

        return interaction.reply({
          embeds: [infoEmbed("✅ Ticket aangemaakt", `Je ticket is aangemaakt: ${ch}`)],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.isButton()) {
        const customId = interaction.customId || "";
        if (!customId.startsWith("ticket_btn:")) return;

        const action = customId.split(":")[1];

        const ticket = await getTicketByChannelId(interaction.guildId, interaction.channelId);
        if (!ticket) {
          return interaction.reply({
            embeds: [errorEmbed("Dit kanaal is geen ticket.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "claim") {
          if (!isStaff(interaction.member)) {
            return interaction.reply({
              embeds: [errorEmbed("Alleen staff kan claimen.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          const catCfg = settings.tickets.categories?.[ticket.type];
          const staffRoleIds = catCfg?.staffRoleIds ?? [];
          if (!staffRoleIds.length) {
            return interaction.reply({
              embeds: [errorEmbed("Geen staffRoleIds gevonden voor deze ticket categorie.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          const alreadyClaimedBy = ticket.claimedBy;

          if (!alreadyClaimedBy) {
            await setClaimedBy(interaction.guildId, interaction.channelId, interaction.user.id);

            await lockToClaimers(interaction.channel, staffRoleIds, interaction.user.id);

            await interaction.channel.send({
              embeds: [infoEmbed("✅ Ticket geclaimd", `Geclaimd door <@${interaction.user.id}>.\nAndere staff kan niet meer typen tenzij ze ook op **Claim** drukken.`)],
            });

            return interaction.reply({
              embeds: [infoEmbed("✅ Gelukt", "Je hebt dit ticket geclaimd. Alleen claimers kunnen nu typen.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          await lockToClaimers(interaction.channel, staffRoleIds, interaction.user.id);

          return interaction.reply({
            embeds: [infoEmbed("✅ Toegevoegd", `Je bent toegevoegd als (co-)claimer. Je kunt nu typen in dit ticket.`)],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "transcript") {
          if (!isStaff(interaction.member)) {
            return interaction.reply({
              embeds: [errorEmbed("Alleen staff kan een transcript genereren.")],
              flags: MessageFlags.Ephemeral,
            });
          }
          const file = await buildTranscript(interaction.channel);
          return interaction.reply({
            embeds: [infoEmbed("📄 Transcript", "Transcript is gegenereerd.")],
            files: [file],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "close") {
          const isOwner = interaction.user.id === ticket.ownerId;
          if (!isStaff(interaction.member) && !isOwner) {
            return interaction.reply({
              embeds: [errorEmbed("Alleen staff of de ticket-maker kan Close starten.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          if (ticket.status !== "open") {
            return interaction.reply({
              embeds: [errorEmbed("Dit ticket is niet open.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          await requestClose(interaction.guildId, interaction.channelId, interaction.user.id);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("ticket_btn:confirm_delete")
              .setLabel("Definitief verwijderen")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("ticket_btn:cancel_close")
              .setLabel("Annuleren")
              .setStyle(ButtonStyle.Secondary)
          );

          const panelMsg = await interaction.channel.send({
            embeds: [
              infoEmbed(
                "⚠️ Sluiten aangevraagd",
                "Dit ticket staat op sluiten.\n\n✅ Reageer om het open te houden\n🗑️ Of druk op **Definitief verwijderen** om direct te sluiten"
              ),
            ],
            components: [row],
          });

          await setClosePanelMessageId(interaction.guildId, interaction.channelId, panelMsg.id);

          return interaction.reply({
            embeds: [infoEmbed("✅ Close flow gestart", "Close-aanvraag geplaatst.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "cancel_close") {
          const isOwner = interaction.user.id === ticket.ownerId;
          if (!isStaff(interaction.member) && !isOwner) {
            return interaction.reply({
              embeds: [errorEmbed("Alleen staff of de ticket-maker kan annuleren.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          if (ticket.status !== "closing") {
            return interaction.reply({
              embeds: [errorEmbed("Er is geen actieve close-aanvraag.")],
              flags: MessageFlags.Ephemeral,
            });
          }

          async function lockToClaimers(channel, staffRoleIds, claimerId) {
            for (const roleId of staffRoleIds) {
              await channel.permissionOverwrites.edit(roleId, {
                ViewChannel: true,
                ReadMessageHistory: true,
                SendMessages: false,
              }).catch(() => { });
            }

            await channel.permissionOverwrites.edit(claimerId, {
              ViewChannel: true,
              ReadMessageHistory: true,
              SendMessages: true,
            }).catch(() => { });
          }


          await cancelClose(interaction.guildId, interaction.channelId);

          if (interaction.message?.components?.length) {

            const disabled = disableRow(interaction.message.components[0]);
            await interaction.message.editReply({
              embeds: [infoEmbed("✅ Close geannuleerd", `Geannuleerd door <@${interaction.user.id}>.`)],
              components: [disabled],
            });
          }

          return interaction.reply({
            embeds: [infoEmbed("✅ Gelukt", "Close-aanvraag geannuleerd.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "confirm_delete") {
          if (ticket.status !== "closing") {
            return interaction.reply({
              embeds: [errorEmbed("Je kunt alleen definitief verwijderen nadat Close is aangevraagd (status: closing).")],
              flags: MessageFlags.Ephemeral,
            });
          }

          if (interaction.message?.components?.length) {
            const disabled = disableRow(interaction.message.components[0]);
            await interaction.message.editReply({
              embeds: [infoEmbed("🗑️ Definitief sluiten", `Gestart door <@${interaction.user.id}>.`)],
              components: [disabled],
            });
          }

          await interaction.reply({
            embeds: [infoEmbed("🔒 Sluiten…", "Ticket wordt definitief gesloten.")],
            flags: MessageFlags.Ephemeral,
          });

          await closeTicketFlow(client, interaction.channel, {
            reason: `Definitief gesloten door ${interaction.user.tag}`,
          });

          return;
        }
      }

      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;

        try {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          }

          await cmd.execute(interaction, client);
        } catch (e) {
          console.error(e);

          const msg = "Er ging iets mis bij het uitvoeren van dit command.";
          try {
            if (interaction.deferred || interaction.replied) {
              await interaction.editReply({ content: `❌ ${msg}` });
            } else {
              await interaction.reply({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral });
            }
          } catch { }
        }
      }
    }
  }
}
