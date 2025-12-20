const settings = require("../settings.json");
const { PermissionFlagsBits } = require("discord.js");

function isStaff(member) {
  if (!member) return false;

  const staffRoleIds = settings?.roles?.staffRoleIds || [];
  const developerIds = settings?.developerIds || [];

  if (developerIds.includes(member.id)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;

  return staffRoleIds.some(id => member.roles?.cache?.has(id));
}

function sanitizeChannelPart(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "user";
}

function formatChannelName(type, username, ticketId) {
  const tpl = settings.tickets.channelNameFormat || "{type}-{username}";
  return tpl
    .replace("{type}", sanitizeChannelPart(type))
    .replace("{username}", sanitizeChannelPart(username));
  }

module.exports = { isStaff, sanitizeChannelPart, formatChannelName };