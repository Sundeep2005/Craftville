const path = require("node:path");
const fs = require("node:fs");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let db;

async function initDb(dbFilePath = path.join(process.cwd(), "data", "craftville.sqlite")) {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON;");

  const schemaPath = path.join(process.cwd(), "database", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(schemaSql);

  return db;
}

function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

module.exports = { initDb, getDb };
