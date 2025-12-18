const settings = require("../settings.json");
const {
  getClosingTicketsNeedingReminder,
  getClosingTicketsNeedingAutoClose,
  markReminded24h
} = require("../database/queries");
const { closeTicketFlow } = require("./ticketCloseFlow");

function hoursToMs(h) {
  return Math.floor(h * 60 * 60 * 1000);
}

function startInactivityLoop(client) {
  const everyMin = settings.tickets.inactivity.checkEveryMinutes ?? 5;
  const remindMs = hoursToMs(settings.tickets.inactivity.remindAfterHours ?? 24);
  const closeMs = hoursToMs(settings.tickets.inactivity.autoCloseAfterHours ?? 48);

  setInterval(async () => {
    try {
      const guildId = process.env.GUILD_ID;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const remindList = await getClosingTicketsNeedingReminder(guildId, remindMs);
      for (const t of remindList) {
        const ch = guild.channels.cache.get(t.channelId);
        if (!ch) {
          await markReminded24h(guildId, t.channelId);
          continue;
        }
        await ch.send(`<@${t.ownerId}> ⏰ Dit ticket staat op sluiten. Druk op **Definitief verwijderen** of reageer om het open te houden.`);
        await markReminded24h(guildId, t.channelId);
      }

      const closeList = await getClosingTicketsNeedingAutoClose(guildId, closeMs);
      for (const t of closeList) {
        const ch = guild.channels.cache.get(t.channelId);
        if (!ch) continue;
        await closeTicketFlow(client, ch, { reason: "Auto-close: 48 uur na close-aanvraag geen actie." });
      }
    } catch (e) {
      console.error("[ClosingLoop]", e);
    }
  }, everyMin * 60 * 1000);
}

module.exports = { startInactivityLoop };
