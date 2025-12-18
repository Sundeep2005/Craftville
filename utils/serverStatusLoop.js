const settings = require("../settings.json");
const { getAllServerStatusPanels, upsertServerStatusPanel } = require("../database/queries");
const { buildStatusMessage } = require("./serverStatus");

let interval = null;

async function tick(client) {
  const panels = await getAllServerStatusPanels();
  if (!Array.isArray(panels) || !panels.length) return;

  for (const p of panels) {
    try {
      const guild = client.guilds.cache.get(p.guildId);
      if (!guild) continue;

      const channel = await guild.channels.fetch(p.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      const payload = await buildStatusMessage(p.statusMessage);

      let msg = await channel.messages.fetch(p.messageId).catch(() => null);
      if (!msg) {
        msg = await channel.send(payload);
        await upsertServerStatusPanel(p.guildId, channel.id, msg.id);
        continue;
      }

      await msg.edit(payload);
    } catch (e) {
      console.error("[StatusLoop]", e);
    }
  }
}

function startServerStatusLoop(client) {
  const sec = Number(settings?.serverStatus?.updateIntervalSeconds ?? 60);
  const ms = Math.max(15, sec) * 1000;

  if (interval) clearInterval(interval);
  interval = setInterval(() => tick(client), ms);

  tick(client).catch(() => {});
}

module.exports = { startServerStatusLoop };
