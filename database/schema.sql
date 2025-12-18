PRAGMA foreign_keys = ON;
-- Tickets table scheme
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guildId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  channelId TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  claimedBy TEXT,
  createdAt INTEGER NOT NULL,
  lastActivityAt INTEGER NOT NULL,
  reminded24h INTEGER NOT NULL DEFAULT 0,
  closedAt INTEGER,
  closeRequestedAt INTEGER,
  closeRequestedBy TEXT,
  closePanelMessageId TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_owner_status
ON tickets(ownerId, status);

CREATE INDEX IF NOT EXISTS idx_tickets_channel
ON tickets(channelId);

CREATE INDEX IF NOT EXISTS idx_tickets_status_activity
ON tickets(status, lastActivityAt);

CREATE TABLE IF NOT EXISTS ticket_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticketId INTEGER NOT NULL,
  questionId TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY(ticketId) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_answers_ticket
ON ticket_answers(ticketId);

CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_ticket_question
ON ticket_answers(ticketId, questionId);

-- Server status scheme
CREATE TABLE IF NOT EXISTS server_status_panels (
  guildId TEXT PRIMARY KEY,
  channelId TEXT NOT NULL,
  messageId TEXT NOT NULL,
  statusMessage TEXT NOT NULL DEFAULT 'Craftville Hardcore SMP – Nu bezig!'
);