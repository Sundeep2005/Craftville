const settings = require("../settings.json");

function isStaff(member) {
  const staffRoleIds = settings.roles.staffRoleIds || [];
  return staffRoleIds.some((id) => member.roles.cache.has(id));
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