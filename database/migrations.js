const { getDb } = require("./sqlite");

async function columnExists(db, table, column) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function ensureColumn(table, column, type) {
  const db = getDb();
  const exists = await columnExists(db, table, column);
  if (exists) return false;

  await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  return true;
}

async function runMigrations() {
  const db = getDb();

  await db.get("SELECT 1");

  const changes = [];

  if (await ensureColumn("tickets", "lastActivityBy", "TEXT")) changes.push("tickets.lastActivityBy");
  if (await ensureColumn("tickets", "lastActivityAt", "INTEGER")) changes.push("tickets.lastActivityAt");

  if (changes.length) {
    console.log("[DB] Migrations applied:", changes.join(", "));
  } else {
    console.log("[DB] No migrations needed.");
  }
}

module.exports = { runMigrations };