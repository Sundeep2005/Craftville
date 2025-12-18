const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const settings = require("../settings.json");
const { status } = require("minecraft-server-util");

function isStaff(member) {
  const staffRoleIds = settings?.roles?.staffRoleIds || [];
  return staffRoleIds.some((id) => member?.roles?.cache?.has(id));
}

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(settings?.bot?.embedColor || "#FFA500")
    .setFooter({
      text: settings?.bot?.footerText || "Craftville",
      iconURL: settings?.bot?.footerIcon || null
    })
    .setTimestamp();
}

function buildButtons() {
  const row = new ActionRowBuilder();
  const web = settings?.serverStatus?.websiteUrl;
  const store = settings?.serverStatus?.storeUrl;

  if (web) row.addComponents(new ButtonBuilder().setLabel("Website").setStyle(ButtonStyle.Link).setURL(web));
  if (store) row.addComponents(new ButtonBuilder().setLabel("Store").setStyle(ButtonStyle.Link).setURL(store));

  return row.components.length ? [row] : [];
}

async function pingServer() {
  const host = settings?.serverStatus?.host || "play.craftville.nl";
  const port = Number(settings?.serverStatus?.port ?? 25565);

  try {
    const res = await status(host, port, { timeout: 5000 });

    const online = true;
    const playersOnline = res?.players?.online ?? 0;
    const playersMax = res?.players?.max ?? 0;
    const version = res?.version?.name_clean || res?.version?.name || "Onbekend";
    const motd =
      (Array.isArray(res?.motd?.clean) ? res.motd.clean.join("\n") : res?.motd?.clean) ||
      (Array.isArray(res?.motd?.raw) ? res.motd.raw.join("\n") : res?.motd?.raw) ||
      "";

    const favicon = res?.favicon || null;

    return { online, playersOnline, playersMax, version, motd, favicon };
  } catch {
    return { online: false, playersOnline: 0, playersMax: 0, version: "—", motd: "", favicon: null };
  }
}

function faviconToAttachment(faviconDataUri) {
  if (!faviconDataUri || typeof faviconDataUri !== "string") return null;
  const m = faviconDataUri.match(/^data:image\/png;base64,(.+)$/);
  if (!m) return null;

  const buf = Buffer.from(m[1], "base64");
  return new AttachmentBuilder(buf, { name: "server-icon.png" });
}

async function buildStatusMessage(panelMessageText) {
  const title = settings?.serverStatus?.title || "Craftville SMP";
  const data = await pingServer();

  const embed = baseEmbed()
    .setAuthor({ name: title })
    .addFields(
      { name: "STATUS", value: data.online ? "🟢 Online" : "🔴 Offline", inline: true },
      { name: "SPELERS", value: `${data.playersOnline}/${data.playersMax}`, inline: true },
      { name: "VERSIE", value: settings.server.serverVersion, inline: true },
      { name: "MEDEDELINGEN", value:  `\`\`\`${panelMessageText}\`\`\`` || "—", inline: false }
    );

  if (data.motd) {
    embed.addFields({ name: "MOTD", value: data.motd.slice(0, 1024), inline: false });
  }

  const files = [];
  const att = faviconToAttachment(data.favicon);
  if (att) {
    files.push(att);
    embed.setThumbnail("attachment://server-icon.png");
  } else if (settings?.bot?.footerIcon) {
    embed.setThumbnail(settings.bot.footerIcon);
  }

  return {
    embeds: [embed],
    components: buildButtons(),
    files
  };
}

module.exports = { isStaff, buildStatusMessage };