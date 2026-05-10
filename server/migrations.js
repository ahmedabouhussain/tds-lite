const { db } = require('./db');

function columnExists(table, col) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === col);
}

function ensureColumn(table, col, ddl) {
  if (!columnExists(table, col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
  }
}

function runMigrations() {
  ensureColumn('events', 'masterEventId', 'INTEGER');
  ensureColumn('events', 'subEventType', 'TEXT');
  ensureColumn('events', 'endTime', 'TEXT');
  ensureColumn('events', 'audienceCategory', 'TEXT');
  ensureColumn('events', 'ticketQuota', 'INTEGER DEFAULT 0');
  ensureColumn('events', 'updatedAt', 'TEXT');
  ensureColumn('events', 'archivedAt', 'TEXT');
  ensureColumn('invitation_requests', 'masterEventId', 'INTEGER');
  ensureColumn('invitation_requests', 'subEventId', 'INTEGER');
  ensureColumn('invitation_requests', 'audienceCategory', 'TEXT');
  ensureColumn('invitation_requests', 'priorityLevel', 'TEXT DEFAULT "Standard"');
  ensureColumn('invitation_requests', 'protocolNote', 'TEXT');
  ensureColumn('tickets', 'masterEventId', 'INTEGER');
  ensureColumn('tickets', 'subEventId', 'INTEGER');
  ensureColumn('tickets', 'audienceCategory', 'TEXT');
}

module.exports = { runMigrations };
