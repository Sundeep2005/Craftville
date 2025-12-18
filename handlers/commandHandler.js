const fs = require("node:fs");
const path = require("node:path");

function loadCommands(client) {
  client.commands = new Map();

  const base = path.join(process.cwd(), "commands");
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".js")) {
        const cmd = require(full);
        if (!cmd?.data?.name || typeof cmd.execute !== "function") continue;
        client.commands.set(cmd.data.name, cmd);
      }
    }
  };

  walk(base);
}

module.exports = { loadCommands };