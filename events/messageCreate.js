const { Events, EmbedBuilder } = require("discord.js");
const settings = require("../settings.json");

const {
  getTicketByChannelId,
  updateLastActivity,
  cancelClose
} = require("../database/queries");

function infoEmbed(title, description) {
  const e = new EmbedBuilder()
    .setColor(settings?.bot?.embedColor || "#FFA500")
    .setTitle(title)
    .setDescription(description || "");

  if (settings?.bot?.footerText) {
    e.setFooter({
      text: settings.bot.footerText,
      iconURL: settings?.bot?.footerIcon || null
    });
  }

  return e;
}

function baseEmbed() {
  const e = new EmbedBuilder().setColor(settings?.bot?.embedColor || "#FFA500");
  if (settings?.bot?.footerText) {
    e.setFooter({ text: settings.bot.footerText, iconURL: settings?.bot?.footerIcon || null });
  }
  return e;
}

function emojiToReactArg(input) {
  if (!input) return null;
  const m = String(input).match(/^<a?:\w+:(\d+)>$/);
  if (m) return m[1];
  return String(input);
}

function renderTemplate(str, vars) {
  return String(str || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

async function handleSuggestion(message) {
  if (!settings?.suggestions?.enabled) return;

  const chanId = settings.suggestions.channelId;
  if (!chanId || message.channelId !== chanId) return;

  const up = emojiToReactArg(settings.suggestions.reactionUp || "👍");
  const down = emojiToReactArg(settings.suggestions.reactionDown || "👎");

  if (up) await message.react(up).catch(() => {});
  if (down) await message.react(down).catch(() => {});

  if (!message.hasThread) {
    const tcfg = settings?.suggestions?.thread || {};
    const nameTemplate = tcfg.nameTemplate || "💡 Suggestie van {user}";
    const threadName = renderTemplate(nameTemplate, {
      user: message.author.username,
      id: message.id
    }).slice(0, 100);

    const thread = await message.startThread({
      name: threadName,
      autoArchiveDuration: tcfg.autoArchiveDuration ?? 1440,
      reason: "Suggestie discussie thread"
    });

    const ecfg = settings?.suggestions?.threadEmbed || {};
    const embed = baseEmbed()
      .setTitle(ecfg.title || "💬 Discussie")
      .setDescription(
        renderTemplate(
          ecfg.description ||
            "Gebruik deze thread om te reageren.\n\n🔗 Origineel bericht:\n{link}",
          { link: message.url }
        ).slice(0, 4096)
      );

    const infoMsg = await thread.send({ embeds: [embed] });
    await infoMsg.pin().catch(() => {});
  }
}

async function handleTicketActivity(message) {
  const ticket = await getTicketByChannelId(message.guild.id, message.channel.id);
  if (!ticket) return;

  if (ticket.status === "open" || ticket.status === "closing") {
    await updateLastActivity(message.guild.id, message.channel.id);
  }

  if (ticket.status === "closing") {
    await cancelClose(message.guild.id, message.channel.id);
    await message.channel.send({
      embeds: [infoEmbed("✅ Sluiten geannuleerd", "Er is activiteit gedetecteerd, dus het ticket blijft open.")]
    }).catch(() => {});
  }
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (!message.guild) return;
      if (message.author?.bot) return;

      await handleSuggestion(message);
      await handleTicketActivity(message);

    } catch (e) {
      console.error("[MessageCreate] Error:", e);
    }
  }
};
