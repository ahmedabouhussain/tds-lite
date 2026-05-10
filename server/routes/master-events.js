const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.use(authRequired);

function classifyTime(startDate, endDate, override) {
  if (override) return override;
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return 'Future';
  if (today > endDate) return 'Ended';
  return 'Current';
}

function enrichMaster(m) {
  if (!m) return null;
  const subCount = db.prepare('SELECT COUNT(*) c FROM events WHERE masterEventId=? AND archivedAt IS NULL').get(m.id).c;
  const uploaded = db.prepare('SELECT COUNT(*) c FROM tickets WHERE masterEventId=?').get(m.id).c;
  const assigned = db.prepare('SELECT COUNT(*) c FROM ticket_assignments WHERE eventId IN (SELECT id FROM events WHERE masterEventId=?)').get(m.id).c;
  const checkedIn = db.prepare('SELECT COUNT(*) c FROM checkins WHERE eventId IN (SELECT id FROM events WHERE masterEventId=?)').get(m.id).c;
  return {
    ...m,
    timeClassification: classifyTime(m.startDate, m.endDate, m.timeClassificationOverride),
    subEventCount: subCount,
    totalUploadedTickets: uploaded,
    totalAssignedTickets: assigned,
    totalCheckedInTickets: checkedIn
  };
}

router.get('/', (req, res) => {
  const { time, host, sport, level, venue, status, q, includeArchived } = req.query;
  let sql = 'SELECT * FROM master_events WHERE 1=1';
  const params = [];
  if (!includeArchived) sql += ' AND archivedAt IS NULL';
  if (host) { sql += ' AND hostOrganization=?'; params.push(host); }
  if (sport) { sql += ' AND sportCategory=?'; params.push(sport); }
  if (level) { sql += ' AND eventLevel=?'; params.push(level); }
  if (venue) { sql += ' AND venue=?'; params.push(venue); }
  if (status) { sql += ' AND operationalStatus=?'; params.push(status); }
  if (q) { sql += ' AND (eventName LIKE ? OR hostOrganization LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY startDate ASC';

  let rows = db.prepare(sql).all(...params).map(enrichMaster);
  if (time) rows = rows.filter(r => r.timeClassification === time);
  res.json(rows);
});

router.get('/counts', (req, res) => {
  const all = db.prepare('SELECT * FROM master_events WHERE archivedAt IS NULL').all();
  const counts = { Current: 0, Future: 0, Ended: 0, Archived: 0 };
  for (const m of all) counts[classifyTime(m.startDate, m.endDate, m.timeClassificationOverride)]++;
  counts.Archived = db.prepare('SELECT COUNT(*) c FROM master_events WHERE archivedAt IS NOT NULL').get().c;
  res.json(counts);
});

router.get('/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM master_events WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Master event not found' });
  res.json(enrichMaster(m));
});

router.post('/', requireRole('Event Manager'), (req, res) => {
  const b = req.body;
  const errs = validateMaster(b);
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO master_events
    (eventName, hostOrganization, venue, sportCategory, eventLevel, startDate, endDate,
     dateConfidence, calendarSource, operationalStatus, totalPlannedTickets, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.eventName, b.hostOrganization, b.venue, b.sportCategory || '',
    b.eventLevel, b.startDate, b.endDate,
    b.dateConfidence || 'Exact', b.calendarSource || 'Manual',
    b.operationalStatus || 'Draft',
    b.totalPlannedTickets || 0, now, now);
  audit(req.user.id, 'create', 'master_event', r.lastInsertRowid, null, b);
  res.json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('Event Manager'), (req, res) => {
  const old = db.prepare('SELECT * FROM master_events WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const errs = validateMaster(b);
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  const hasActive = db.prepare(`SELECT COUNT(*) c FROM tickets WHERE masterEventId=?`).get(req.params.id).c > 0;
  if (hasActive && req.headers['x-confirm-change'] !== 'YES'
      && (old.startDate !== b.startDate || old.endDate !== b.endDate || old.venue !== b.venue)) {
    return res.status(409).json({
      error: 'Active ticketing records exist. Resend with X-Confirm-Change: YES to proceed.'
    });
  }

  db.prepare(`UPDATE master_events SET
    eventName=?, hostOrganization=?, venue=?, sportCategory=?, eventLevel=?,
    startDate=?, endDate=?, dateConfidence=?, operationalStatus=?,
    totalPlannedTickets=?, updatedAt=? WHERE id=?`).run(
    b.eventName, b.hostOrganization, b.venue, b.sportCategory || '',
    b.eventLevel, b.startDate, b.endDate, b.dateConfidence || 'Exact',
    b.operationalStatus, b.totalPlannedTickets || 0,
    new Date().toISOString(), req.params.id);
  audit(req.user.id, 'update', 'master_event', req.params.id, old, b);
  res.json({ ok: true });
});

router.post('/:id/override-classification', requireRole('Admin'), (req, res) => {
  const { classification, reason } = req.body;
  if (!['Current','Future','Ended'].includes(classification))
    return res.status(400).json({ error: 'Invalid classification' });
  if (!reason || reason.length < 10) return res.status(400).json({ error: 'Reason required (min 10 chars)' });
  const old = db.prepare('SELECT * FROM master_events WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE master_events SET timeClassificationOverride=?, timeClassificationOverrideReason=?, updatedAt=? WHERE id=?')
    .run(classification, reason, new Date().toISOString(), req.params.id);
  audit(req.user.id, 'override_classification', 'master_event', req.params.id, old, { classification, reason });
  res.json({ ok: true });
});

router.post('/:id/archive', requireRole('Event Manager'), (req, res) => {
  const old = db.prepare('SELECT * FROM master_events WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE master_events SET archivedAt=?, operationalStatus=? WHERE id=?')
    .run(new Date().toISOString(), 'Archived', req.params.id);
  audit(req.user.id, 'archive', 'master_event', req.params.id, old, null);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('Event Manager'), (req, res) => {
  const id = req.params.id;
  const blockers = {
    subEvents: db.prepare('SELECT COUNT(*) c FROM events WHERE masterEventId=?').get(id).c,
    requests: db.prepare('SELECT COUNT(*) c FROM invitation_requests WHERE masterEventId=?').get(id).c,
    tickets: db.prepare('SELECT COUNT(*) c FROM tickets WHERE masterEventId=?').get(id).c,
    checkins: db.prepare('SELECT COUNT(*) c FROM checkins WHERE eventId IN (SELECT id FROM events WHERE masterEventId=?)').get(id).c
  };
  const total = Object.values(blockers).reduce((a, b) => a + b, 0);
  if (total > 0) {
    return res.status(400).json({
      error: 'This event contains operational records and cannot be deleted. You may archive it instead.',
      blockers
    });
  }
  db.prepare('DELETE FROM master_events WHERE id=?').run(id);
  audit(req.user.id, 'delete', 'master_event', id, null, null);
  res.json({ ok: true });
});

router.get('/:id/report', (req, res) => {
  const m = db.prepare('SELECT * FROM master_events WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  const subs = db.prepare('SELECT * FROM events WHERE masterEventId=? ORDER BY date').all(req.params.id);
  const enriched = subs.map(s => ({
    ...s,
    uploaded: db.prepare('SELECT COUNT(*) c FROM tickets WHERE eventId=?').get(s.id).c,
    assigned: db.prepare('SELECT COUNT(*) c FROM ticket_assignments WHERE eventId=?').get(s.id).c,
    checkedIn: db.prepare('SELECT COUNT(*) c FROM checkins WHERE eventId=?').get(s.id).c,
    pendingReq: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE subEventId=? AND status='Pending'").get(s.id).c,
    approvedReq: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE subEventId=? AND status IN ('Approved','Partially Approved')").get(s.id).c,
    rejectedReq: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE subEventId=? AND status='Rejected'").get(s.id).c
  }));
  const byCategory = db.prepare(`
    SELECT audienceCategory, COUNT(*) as totalRequests,
      SUM(CASE WHEN status IN ('Approved','Partially Approved') THEN 1 ELSE 0 END) as approvedRequests
    FROM invitation_requests WHERE masterEventId=? GROUP BY audienceCategory`).all(req.params.id);
  const byPriority = db.prepare(`
    SELECT priorityLevel, COUNT(*) as totalRequests,
      SUM(CASE WHEN status IN ('Approved','Partially Approved') THEN 1 ELSE 0 END) as approvedRequests,
      SUM(approvedTickets) as approvedTickets
    FROM invitation_requests WHERE masterEventId=? GROUP BY priorityLevel`).all(req.params.id);
  res.json({ master: enrichMaster(m), subEvents: enriched, byCategory, byPriority });
});

function validateMaster(b) {
  const errs = [];
  if (!b.eventName) errs.push('Event Name required');
  if (!b.hostOrganization) errs.push('Host required');
  if (!b.venue) errs.push('Venue required');
  if (!b.startDate) errs.push('Start Date required');
  if (!b.endDate) errs.push('End Date required');
  if (b.startDate && b.endDate && b.endDate < b.startDate) errs.push('End Date cannot be before Start Date');
  if (!['Local','Gulf','Arab','Asian','Global','International'].includes(b.eventLevel)) errs.push('Event Level required');
  if (b.totalPlannedTickets != null && b.totalPlannedTickets < 0) errs.push('Total Planned Tickets must be zero or positive');
  return errs;
}

module.exports = router;
