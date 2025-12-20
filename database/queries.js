const { getDb } = require("./sqlite");

async function getTicketByChannelId(guildId, channelId) {
  const db = getDb();
  return db.get(
    `SELECT * FROM tickets WHERE guildId = ? AND channelId = ? LIMIT 1`,
    [guildId, channelId]
  );
}

async function getOpenTicketByOwner(guildId, ownerId) {
  const db = getDb();
  return db.get(
    `SELECT * FROM tickets
     WHERE guildId = ? AND ownerId = ? AND type = ? AND status IN ('open','closing')
     LIMIT 1`,
    [guildId, ownerId]
  );
}

async function createTicket({ guildId, ownerId, channelId, type }) {
  const db = getDb();
  const now = Date.now();
  const res = await db.run(
    `INSERT INTO tickets (guildId, ownerId, channelId, type, status, createdAt, lastActivityAt)
     VALUES (?, ?, ?, ?, 'open', ?, ?)`,
    [guildId, ownerId, channelId, type, now, now]
  );
  return res.lastID;
}

async function updateLastActivity(guildId, channelId, userId = null) {
  const db = getDb();
  const now = Date.now();

  await db.run(
    `UPDATE tickets
     SET lastActivityAt = ?,
         lastActivityBy = COALESCE(?, lastActivityBy)
     WHERE guildId = ? AND channelId = ? AND status IN ('open','closing')`,
    [now, userId, guildId, channelId]
  );
}

async function insertTicketAnswers(ticketId, answers) {
  const db = getDb();
  const stmt = await db.prepare(
    `INSERT INTO ticket_answers (ticketId, questionId, label, value)
     VALUES (?, ?, ?, ?)`
  );
  try {
    for (const a of answers) {
      await stmt.run([ticketId, a.questionId, a.label, a.value]);
    }
  } finally {
    await stmt.finalize();
  }
}

async function setClaimedBy(guildId, channelId, userId) {
  const db = getDb();
  await db.run(
    `UPDATE tickets
     SET claimedBy = ?
     WHERE guildId = ? AND channelId = ? AND status IN ('open','closing')`,
    [userId, guildId, channelId]
  );
}

async function requestClose(guildId, channelId, userId) {
  const db = getDb();
  await db.run(
    `UPDATE tickets
     SET status = 'closing',
         closeRequestedAt = ?,
         closeRequestedBy = ?,
         reminded24h = 0
     WHERE guildId = ? AND channelId = ? AND status = 'open'`,
    [Date.now(), userId, guildId, channelId]
  );
}

async function cancelClose(guildId, channelId) {
  const db = getDb();
  await db.run(
    `UPDATE tickets
     SET status = 'open',
         closeRequestedAt = NULL,
         closeRequestedBy = NULL,
         closePanelMessageId = NULL,
         reminded24h = 0
     WHERE guildId = ? AND channelId = ? AND status = 'closing'`,
    [guildId, channelId]
  );
}

async function setClosePanelMessageId(guildId, channelId, messageId) {
  const db = getDb();
  await db.run(
    `UPDATE tickets SET closePanelMessageId = ?
     WHERE guildId = ? AND channelId = ?`,
    [messageId, guildId, channelId]
  );
}

async function closeTicket(guildId, channelId) {
  const db = getDb();
  await db.run(
    `UPDATE tickets
     SET status = 'closed',
         closedAt = ?
     WHERE guildId = ? AND channelId = ? AND status IN ('open','closing')`,
    [Date.now(), guildId, channelId]
  );
}

async function getOpenTicketByOwnerAndType(guildId, ownerId, type) {
  const db = getDb();
  return db.get(
    `SELECT * FROM tickets
     WHERE guildId = ? AND ownerId = ? AND type = ? AND status IN ('open','closing')
     LIMIT 1`,
    [guildId, ownerId, type]
  );
}

async function getClosingTicketsNeedingReminder(hours) {
  const db = getDb();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  return db.all(
    `SELECT * FROM tickets
     WHERE status = 'closing'
       AND closeRequestedAt IS NOT NULL
       AND closeRequestedAt <= ?
       AND reminded24h = 0`,
    [cutoff]
  );
}

async function getClosingTicketsNeedingAutoClose(hours) {
  const db = getDb();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  return db.all(
    `SELECT * FROM tickets
     WHERE status = 'closing'
       AND closeRequestedAt IS NOT NULL
       AND closeRequestedAt <= ?`,
    [cutoff]
  );
}

async function upsertServerStatusPanel(guildId, channelId, messageId) {
  const db = getDb();
  await db.run(
    `INSERT INTO server_status_panels (guildId, channelId, messageId)
     VALUES (?, ?, ?)
     ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, messageId = excluded.messageId`,
    [guildId, channelId, messageId]
  );
}

async function getServerStatusPanel(guildId) {
  const db = getDb();
  return db.get(`SELECT * FROM server_status_panels WHERE guildId = ?`, [guildId]);
}

async function getAllServerStatusPanels() {
  const db = getDb();
  return db.all(`SELECT * FROM server_status_panels`);
}

async function setServerStatusMessage(guildId, text) {
  const db = getDb();
  await db.run(
    `UPDATE server_status_panels SET statusMessage = ? WHERE guildId = ?`,
    [text, guildId]
  );
}

async function markClosingTicketReminded(ticketId) {
  const db = getDb();
  await db.run(`UPDATE tickets SET reminded24h = 1 WHERE id = ?`, [ticketId]);
}

module.exports = {
  getTicketByChannelId,
  getOpenTicketByOwner,
  createTicket,
  insertTicketAnswers,
  setClaimedBy,
  requestClose,
  cancelClose,
  setClosePanelMessageId,
  closeTicket,
  getOpenTicketByOwnerAndType,
  getClosingTicketsNeedingReminder,
  getClosingTicketsNeedingAutoClose,
  markClosingTicketReminded,
  upsertServerStatusPanel,
  getServerStatusPanel,
  getAllServerStatusPanels,
  setServerStatusMessage,
};