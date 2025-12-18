const fs = require("node:fs");
const path = require("node:path");

function loadEvents(client) {
  const eventsPath = path.join(process.cwd(), "events");
  for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
    const event = require(path.join(eventsPath, file));
    if (!event?.name || typeof event.execute !== "function") continue;

    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
  }
}

module.exports = { loadEvents };