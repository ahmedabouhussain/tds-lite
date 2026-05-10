const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'tds.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS master_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventName TEXT NOT NULL,
  hostOrganization TEXT NOT NULL,
  venue TEXT NOT NULL,
  sportCategory TEXT,
  eventLevel TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  calendarSource TEXT,
  operationalStatus TEXT DEFAULT 'Draft',
  timeClassificationOverride TEXT,
  timeClassificationOverrideReason TEXT,
  dateConfidence TEXT DEFAULT 'Exact',
  totalPlannedTickets INTEGER DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  archivedAt TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL, role TEXT NOT NULL,
  status TEXT DEFAULT 'active', createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventName TEXT NOT NULL, eventType TEXT, teamA TEXT, teamB TEXT,
  masterEventId INTEGER,
  subEventType TEXT,
  endTime TEXT,
  audienceCategory TEXT,
  ticketQuota INTEGER DEFAULT 0,
  date TEXT NOT NULL, startTime TEXT, venue TEXT NOT NULL,
  totalTickets INTEGER NOT NULL CHECK(totalTickets > 0),
  status TEXT DEFAULT 'Draft', createdAt TEXT NOT NULL,
  updatedAt TEXT,
  archivedAt TEXT,
  FOREIGN KEY(masterEventId) REFERENCES master_events(id)
);
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL, organization TEXT, position TEXT,
  phone TEXT, email TEXT, category TEXT, createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invitation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL,
  masterEventId INTEGER,
  subEventId INTEGER,
  guestId INTEGER NOT NULL,
  audienceCategory TEXT,
  priorityLevel TEXT DEFAULT 'Standard',
  requestedTickets INTEGER NOT NULL CHECK(requestedTickets > 0),
  approvedTickets INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  approverId INTEGER, decisionNote TEXT, decisionDate TEXT,
  notes TEXT, protocolNote TEXT, createdAt TEXT NOT NULL,
  FOREIGN KEY(eventId) REFERENCES events(id),
  FOREIGN KEY(guestId) REFERENCES guests(id)
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL,
  masterEventId INTEGER,
  subEventId INTEGER,
  ticketCode TEXT NOT NULL,
  barcode TEXT NOT NULL, block TEXT, row TEXT, seat TEXT,
  category TEXT, audienceCategory TEXT, status TEXT DEFAULT 'Available', createdAt TEXT NOT NULL,
  UNIQUE(eventId, barcode), UNIQUE(eventId, block, row, seat),
  FOREIGN KEY(eventId) REFERENCES events(id)
);
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL, ticketId INTEGER UNIQUE NOT NULL,
  guestId INTEGER NOT NULL, invitationRequestId INTEGER NOT NULL,
  assignedBy INTEGER, assignedAt TEXT NOT NULL,
  FOREIGN KEY(ticketId) REFERENCES tickets(id),
  FOREIGN KEY(guestId) REFERENCES guests(id)
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL, ticketId INTEGER NOT NULL,
  guestId INTEGER NOT NULL, gateName TEXT,
  scannedBy INTEGER, scannedAt TEXT NOT NULL, result TEXT,
  FOREIGN KEY(ticketId) REFERENCES tickets(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER, action TEXT NOT NULL,
  entityType TEXT, entityId INTEGER,
  oldValue TEXT, newValue TEXT, timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subevents_master ON events(masterEventId);
CREATE INDEX IF NOT EXISTS idx_requests_master ON invitation_requests(masterEventId, subEventId);
CREATE INDEX IF NOT EXISTS idx_tickets_master ON tickets(masterEventId, subEventId);
CREATE INDEX IF NOT EXISTS idx_master_dates ON master_events(startDate, endDate);
`;

function initDb() {
  db.exec(SCHEMA);
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) seed();
}

function seed() {
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync('Tds@2025', 10);

  const users = [
    ['Admin User', 'admin@tds.local', 'Admin'],
    ['Event Manager', 'manager@tds.local', 'Event Manager'],
    ['Guest Entry', 'entry@tds.local', 'Guest Data Entry'],
    ['Approver', 'approver@tds.local', 'Approver'],
    ['Ticket Officer', 'tickets@tds.local', 'Ticket Officer'],
    ['Gate Scanner', 'gate@tds.local', 'Gate Scanner'],
    ['Executive', 'exec@tds.local', 'Executive Viewer']
  ];
  const insUser = db.prepare('INSERT INTO users (name,email,passwordHash,role,createdAt) VALUES (?,?,?,?,?)');
  users.forEach(u => insUser.run(u[0], u[1], hash, u[2], now));

  // QOC 2026 Master Events
  const QOC2026 = [
    ['AFC Asian Cup for Men\'s National Teams', 'Qatar Volleyball Federation', 'NA', 'Volleyball', 'Asian', '2026-06-11', '2026-06-23', 'Exact'],
    ['World Olympic Day', 'Qatar Olympic Committee', 'NA', 'Olympic', 'Local', '2026-06-23', '2026-06-23', 'Exact'],
    ['FIBA World Cup 2027 Qualifiers - W3', 'Qatar Basketball Federation', 'Lusail Sports Hall', 'Basketball', 'International', '2026-06-29', '2026-07-07', 'Exact'],
    ['U17 World Volleyball Championship', 'Qatar Volleyball Federation', 'NA', 'Volleyball', 'Global', '2026-08-19', '2026-08-29', 'Exact'],
    ['FIBA World Cup 2027 Qualifiers - W4', 'Qatar Basketball Federation', 'Lusail Sports Hall', 'Basketball', 'International', '2026-08-24', '2026-09-01', 'Exact'],
    ['FIBA Asian U-18 Cup', 'Qatar Basketball Federation', 'Lusail Sports Hall', 'Basketball', 'Asian', '2026-09-05', '2026-09-11', 'Exact'],
    ['FISU World University Championship Weightlifting', 'Qatar Collegiate Sports Federation', 'Qatar Foundation', 'Weightlifting', 'Global', '2026-09-08', '2026-09-12', 'Exact'],
    ['QTerminals Qatar Classic Squash', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Squash', 'International', '2026-09-12', '2026-09-18', 'Exact'],
    ['Challenge League A Series Cricket', 'Qatar Cricket Association', 'Doha', 'Cricket', 'International', '2026-09-30', '2026-10-10', 'Exact'],
    ['PSA 4 Challenger Senior 3k Squash', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Squash', 'International', '2026-10-12', '2026-10-15', 'Exact'],
    ['Qatar Open Taekwondo Championship G1', 'Qatar Taekwondo, Judo and Karate Federation', 'Lusail Sports Arena', 'Taekwondo', 'International', '2026-10-16', '2026-10-19', 'Exact'],
    ['1st Qatar Junior International Series 2026', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Badminton', 'International', '2026-10-21', '2026-10-24', 'Exact'],
    ['1st Qatar Future Series 2026', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Badminton', 'International', '2026-10-27', '2026-10-31', 'Exact'],
    ['Youth Games', 'Qatar Olympic Committee', 'NA', 'Multi-Sport', 'Local', '2026-11-01', '2026-11-30', 'Approximate'],
    ['World Padel Championship', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Padel', 'Global', '2026-11-01', '2026-11-30', 'Approximate'],
    ['ISSF World Championship All Event Doha 2026', 'Qatar Shooting & Archery Association', 'Lusail Shooting Range', 'Shooting', 'Global', '2026-11-01', '2026-11-15', 'Exact'],
    ['PSA 5 Challenger Senior 3k Squash', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Squash', 'International', '2026-11-02', '2026-11-05', 'Exact'],
    ['3rd Qatar Asian Junior Tournament 14 Years Tennis', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Tennis', 'Asian', '2026-11-09', '2026-11-14', 'Exact'],
    ['2026 T100 Triathlon World Championship Final Qatar', 'Qatar Cycling & Triathlon Federation', 'Lusail', 'Triathlon', 'Global', '2026-11-11', '2026-11-13', 'Exact'],
    ['2nd Doha FIP Bronze Padel', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Padel', 'International', '2026-11-11', '2026-11-15', 'Exact'],
    ['4th Qatar Asian Junior Tournament 14 & U Tennis', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Tennis', 'Asian', '2026-11-16', '2026-11-21', 'Exact'],
    ['2nd Doha FIP Promises Padel', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Padel', 'International', '2026-11-18', '2026-11-22', 'Exact'],
    ['The 2026 Arab Golf Championship, 45th Edition for Men', 'Qatar Golf Federation', 'Doha Golf Club', 'Golf', 'Arab', '2026-11-19', '2026-11-22', 'Exact'],
    ['FIBA World Cup 2027 Qualifiers - W5', 'Qatar Basketball Federation', 'Lusail Sports Hall', 'Basketball', 'International', '2026-11-23', '2026-12-01', 'Exact'],
    ['3X3 World Tour - Doha', 'Qatar Basketball Federation', 'Al Gharafa Beach Playgrounds', 'Basketball', 'Global', '2026-12-03', '2026-12-05', 'Exact'],
    ['1st Qatar Men\'s ITF World Tennis Tour M15', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Tennis', 'International', '2026-12-07', '2026-12-13', 'Exact'],
    ['2nd Qatar Men\'s ITF World Tennis Tour M15', 'Qatar Tennis, Squash, Padel & Badminton Federation', 'Khalifa Intl Tennis & Squash Complex', 'Tennis', 'International', '2026-12-14', '2026-12-20', 'Exact'],
    ['Qatar International Cup 11th - Weightlifting', 'Qatar Weightlifting Federation', 'TBC', 'Weightlifting', 'International', '2026-12-21', '2026-12-30', 'Exact'],
    ['10th GCC Golf Championship', 'Qatar Golf Federation', 'Doha Golf Club', 'Golf', 'Gulf', '2026-12-24', '2026-12-27', 'Exact']
  ];

  const insMaster = db.prepare(`INSERT INTO master_events
    (eventName, hostOrganization, venue, sportCategory, eventLevel, startDate, endDate,
     dateConfidence, calendarSource, operationalStatus, totalPlannedTickets, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const masterIds = {};
  for (const m of QOC2026) {
    const r = insMaster.run(...m, 'QOC Sports Calendar 2026', 'Draft', 0, now, now);
    masterIds[m[0]] = r.lastInsertRowid;
  }

  // Sub-events for World Padel Championship
  const padelId = masterIds['World Padel Championship'];
  const insSub = db.prepare(`INSERT INTO events
    (eventName, masterEventId, subEventType, eventType, date, startTime, endTime, venue,
     audienceCategory, ticketQuota, totalTickets, status, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const padelSubs = [
    ['Opening Ceremony',         'Ceremony',            'VVIP',       100,  '2026-11-01', '18:00', '20:00'],
    ['VVIP Guest Allocation',    'VVIP Allocation',     'VVIP',       300,  '2026-11-01', '00:00', '23:59'],
    ['VIP Guest Allocation',     'VIP Allocation',      'VIP',        800,  '2026-11-01', '00:00', '23:59'],
    ['Sponsor Guest Allocation', 'Sponsor Allocation',  'Sponsor',    500,  '2026-11-01', '00:00', '23:59'],
    ['Federation Guest Allocation', 'Federation Allocation', 'Federation', 300, '2026-11-01', '00:00', '23:59'],
    ['Semi Finals',              'Match',               'VIP',        1000, '2026-11-27', '17:00', '21:00'],
    ['Final',                    'Final',               'VVIP',       1500, '2026-11-30', '19:00', '22:00']
  ];
  const padelSubIds = [];
  for (const [name, type, cat, quota, date, st, et] of padelSubs) {
    const r = insSub.run(name, padelId, type, type, date, st, et,
      'Khalifa Intl Tennis & Squash Complex', cat, quota, Math.max(quota, 1),
      'Draft', now, now);
    padelSubIds.push({ id: r.lastInsertRowid, name, cat, quota });
  }

  const total = padelSubs.reduce((s, x) => s + x[3], 0);
  db.prepare('UPDATE master_events SET totalPlannedTickets=?, operationalStatus=? WHERE id=?')
    .run(total, 'Open for Requests', padelId);

  // Guests
  const cats = ['VVIP','VIP','Guest','Sponsor','Partner','Federation','Media','Staff','Protocol'];
  const orgs = ['Ministry of Sports','Qatar Olympic Committee','QFA','Qatar Padel Assoc','Sponsor A','Sponsor B','EmbassyA','EmbassyB','MediaHouse','Federation HQ'];
  const insGuest = db.prepare('INSERT INTO guests (fullName,organization,position,phone,email,category,createdAt) VALUES (?,?,?,?,?,?,?)');
  const guestIds = [];
  for (let i = 1; i <= 20; i++) {
    const id = insGuest.run(
      `Guest ${i}`, orgs[i % orgs.length], 'Director',
      `+9745${String(10000000 + i).slice(-8)}`, `guest${i}@example.com`,
      cats[i % cats.length], now
    ).lastInsertRowid;
    guestIds.push({ id, category: cats[i % cats.length] });
  }

  // Sample requests on Padel sub-events
  const insReq = db.prepare(`INSERT INTO invitation_requests
    (eventId, masterEventId, subEventId, guestId, audienceCategory, priorityLevel,
     requestedTickets, approvedTickets, status, approverId, decisionNote, decisionDate, createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (let i = 0; i < 15; i++) {
    const sub = padelSubIds[i % padelSubIds.length];
    const guest = guestIds[i % guestIds.length];
    const priority = sub.cat === 'VVIP' ? 'VVIP' : sub.cat === 'VIP' ? 'VIP' : 'Standard';
    const req = 2 + (i % 3);
    let status = 'Pending', appr = 0, note = null, dDate = null, approverId = null;
    const m = i % 4;
    if (m === 0) { status = 'Approved'; appr = req; approverId = 4; dDate = now; note = 'Approved'; }
    else if (m === 1) { status = 'Partially Approved'; appr = Math.max(1, req - 1); approverId = 4; dDate = now; note = 'Partial'; }
    else if (m === 2) { status = 'Rejected'; approverId = 4; dDate = now; note = 'Capacity'; }
    insReq.run(sub.id, padelId, sub.id, guest.id, sub.cat, priority,
      req, appr, status, approverId, note, dDate, now);
  }

  // Tickets for Final + Semi Finals
  const insTicket = db.prepare(`INSERT INTO tickets
    (eventId, masterEventId, subEventId, ticketCode, barcode, block, row, seat,
     category, audienceCategory, status, createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const finalSub = padelSubIds.find(s => s.name === 'Final');
  const semiSub  = padelSubIds.find(s => s.name === 'Semi Finals');

  let counter = 100000;
  for (const sub of [finalSub, semiSub]) {
    let added = 0;
    outer: for (const block of ['A','B','C','D','E']) {
      for (let r = 1; r <= 5; r++) {
        for (let s = 1; s <= 4; s++) {
          counter++;
          insTicket.run(sub.id, padelId, sub.id,
            `TKT-${block}-${r}-${s}-${counter}`, `TDS-${counter}`,
            block, String(r), String(s), 'Standard', sub.cat, 'Available', now);
          added++;
          if (added >= 50) break outer;
        }
      }
    }
  }

  console.log('✓ Seed complete: 29 master events + Padel sub-events + sample data');
}

function resetDb() {
  db.exec(`
    DELETE FROM checkins; DELETE FROM ticket_assignments;
    DELETE FROM tickets; DELETE FROM invitation_requests;
    DELETE FROM guests; DELETE FROM events;
    DELETE FROM master_events;
    DELETE FROM audit_log; DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
  seed();
}

function audit(userId, action, entityType, entityId, oldValue, newValue) {
  db.prepare('INSERT INTO audit_log (userId,action,entityType,entityId,oldValue,newValue,timestamp) VALUES (?,?,?,?,?,?,?)').run(
    userId, action, entityType, entityId,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    new Date().toISOString()
  );
}

module.exports = { db, initDb, resetDb, audit };
