const settings = require("../settings.json");
const { infoEmbed } = require("./embeds");
const { buildTranscript } = require("./transcripts");
const { closeTicket, getTicketByChannelId } = require("../database/queries");

async function safeDM(user, payload) {
  try {
    return await user.send(payload);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function closeTicketFlow(client, channel, { reason = "Ticket gesloten." } = {}) {
  const guild = channel.guild;

  const ticket = await getTicketByChannelId(guild.id, channel.id);
  if (!ticket || !["open", "closing"].includes(ticket.status)) return;

  let transcriptAttachment = null;
  try {
    transcriptAttachment = await buildTranscript(channel);
  } catch (e) {
    console.error("Transcript error:", e);
  }

  await closeTicket(guild.id, channel.id);

  try {
    const user = await client.users.fetch(ticket.ownerId);
    if (user) {
      const dmEmbed = infoEmbed("📄 Ticket transcript", `Je ticket is gesloten.\n**Reden:** ${reason}`);
      const dmPayload = transcriptAttachment
        ? { embeds: [dmEmbed], files: [transcriptAttachment] }
        : { embeds: [dmEmbed] };
      await safeDM(user, dmPayload);
    }
  } catch {}

  const logChannelId = settings.channels.logChannelId;
  const logCh = logChannelId ? guild.channels.cache.get(logChannelId) : null;
  if (logCh) {
    const logEmbed = infoEmbed(
      "🧾 Ticket gesloten",
      `**Type:** ${ticket.type}\n**Aangemaakt door:** <@${ticket.ownerId}>\n**Channel:** #${channel.name}\n**Reden:** ${reason}`
    );
    const logPayload = transcriptAttachment
      ? { embeds: [logEmbed], files: [transcriptAttachment] }
      : { embeds: [logEmbed] };
    await logCh.send(logPayload);
  }

  try {
    await channel.send({ embeds: [infoEmbed("🔒 Ticket gesloten", reason)] });
  } catch {}

  const closeCfg = settings?.tickets?.close || {};
  const shouldDelete = closeCfg.deleteChannel ?? true;
  const delaySeconds = closeCfg.deleteDelaySeconds ?? 5;

  if (shouldDelete) {
    await sleep(delaySeconds * 1000);
    try {
      await channel.delete(`Ticket closed: ${reason}`);
    } catch (e) {
      console.error("Channel delete failed:", e);
    }
  }
}

module.exports = { closeTicketFlow };
