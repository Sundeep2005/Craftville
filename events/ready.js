const { Events } = require("discord.js");
const { startServerStatusLoop } = require("../utils/serverStatusLoop");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    startServerStatusLoop(client);
  }
};
