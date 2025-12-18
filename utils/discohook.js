const settings = require("../settings.json");

function parseShareId(input) {
  if (!input || typeof input !== "string") return null;

  if (/^[A-Za-z0-9_-]{3,}$/i.test(input) && !input.includes("http")) return input;

  try {
    const url = new URL(input);

    const share = url.searchParams.get("share");
    if (share) return share;

    return null;
  } catch {
    return null;
  }
}

function normalizeComponents(components) {
  if (!Array.isArray(components)) return undefined;

  return components
    .filter((row) => row && row.type === 1 && Array.isArray(row.components))
    .map((row) => ({
      ...row,
      components: row.components.map((c) => {
        const out = { ...c };

        if (out.type === 2) {
          if (typeof out.style === "string") out.style = parseInt(out.style, 10);
          if (out.custom_id && !out.url) out.disabled = true;
        } else {
          if (out.custom_id) out.disabled = true;
        }

        return out;
      }),
    }));
}

async function fetchDiscohookShare(shareId) {
  const url = `https://discohook.app/api/v1/share/${encodeURIComponent(shareId)}`;

  const ua =
    settings?.bot?.userAgent ||
    "CraftvilleBot (ShareLink Import)";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": ua,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Discohook API error: ${res.status}`);
    err.status = res.status;
    err.body = txt;
    throw err;
  }

  const json = await res.json();

  const messages = json?.data?.messages;
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error("Geen messages gevonden in deze share link.");
  }

  const msg = messages[0]?.data;
  if (!msg) throw new Error("Share link message data ontbreekt.");

  const payload = {};

  let content = msg.content || "";

  const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
  if (attachments.length) {
    const links = attachments.map((a) => `• ${a}`).join("\n");
    const extra = (content ? "\n\n" : "") + `**Bijlagen:**\n${links}`;
    content = (content + extra).slice(0, 2000);
  }

  if (content) payload.content = content;

  if (Array.isArray(msg.embeds) && msg.embeds.length) payload.embeds = msg.embeds;

  const comps = normalizeComponents(msg.components);
  if (comps && comps.length) payload.components = comps;

  payload.allowedMentions = { parse: [] };

  return payload;
}

module.exports = {
  parseShareId,
  fetchDiscohookShare,
};
