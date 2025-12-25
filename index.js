require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { loadCommands } = require("./handlers/commandHandler");
const { loadEvents } = require("./handlers/eventHandler");
const { initDb } = require("./database/sqlite");
const { startInactivityLoop } = require("./utils/inactivity");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
});

(async () => {
  await initDb();
  await initDb();
  await runMigrations();
  loadCommands(client);
  loadEvents(client);

  client.login(process.env.DISCORD_TOKEN);

  client.once("clientReady", () => {
    startInactivityLoop(client);
  });
})();

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);