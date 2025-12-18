const { EmbedBuilder } = require("discord.js");
const settings = require("../settings.json");

function baseEmbed() {
  const e = new EmbedBuilder().setColor(settings.bot.embedColor || "#FFA500");
  if (settings.bot.footerText) {
    e.setFooter({
      text: settings.bot.footerText,
      iconURL: settings.bot.footerIcon || undefined
    });
  }
  return e;
}

function infoEmbed(title, description) {
  return baseEmbed().setTitle(title).setDescription(description);
}

function errorEmbed(description) {
  return baseEmbed().setTitle("❌ Error").setDescription(description);
}

module.exports = { baseEmbed, infoEmbed, errorEmbed };