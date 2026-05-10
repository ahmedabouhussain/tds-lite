const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.use(authRequired);

router.get('/', (req, res) => {
  const { masterEventId } = req.query;
  let sql = `SELECT e.*,
    (SELECT COUNT(*) FROM tickets WHERE eventId=e.id) as uploaded,
    (SELECT COUNT(*) FROM ticket_assignments WHERE eventId=e.id) as assigned,
    (SELECT COUNT(*) FROM checkins WHERE eventId=e.id) as checkedIn
    FROM events e WHERE archivedAt IS NULL`;
  const params = [];
  if (masterEventId) { sql += ' AND masterEventId=?'; params.push(masterEventId); }
  sql += ' ORDER BY date, startTime';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Sub-event not found' });
  res.json(e);
});

router.post('/', requireRole('Event Manager'), (req, res) => {
  const b = req.body;
  const errs = validateSub(b);
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });
  const master = db.prepare('SELECT * FROM master_events WHERE id=?').get(b.masterEventId);
  if (!master) return res.status(400).json({ error: 'Parent master event not found' });
  if (b.date < master.startDate || b.date > master.endDate) {
    if (req.user.role !== 'Admin' || !b.dateOverrideReason) {
      return res.status(400).json({ error: 'Date outside master event range. Admin override + reason required.' });
    }
  }
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO events
    (eventName, masterEventId, subEventType, eventType, date, startTime, endTime, venue,
     audienceCategory, ticketQuota, totalTickets, status, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.subEventName, b.masterEventId, b.subEventType || 'Other', b.subEventType || 'Other',
    b.date, b.startTime || null, b.endTime || null,
    b.venueOverride || master.venue, b.audienceCategory,
    b.ticketQuota || 0, Math.max(b.ticketQuota || 0, 1),
    b.status || 'Draft', now, now);
  audit(req.user.id, 'create', 'sub_event', r.lastInsertRowid, null, b);
  res.json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('Event Manager'), (req, res) => {
  const old = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const errs = validateSub(b);
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });
  db.prepare(`UPDATE events SET
    eventName=?, subEventType=?, date=?, startTime=?, endTime=?, venue=?,
    audienceCategory=?, ticketQuota=?, totalTickets=?, status=?, updatedAt=?
    WHERE id=?`).run(
    b.subEventName, b.subEventType, b.date, b.startTime, b.endTime,
    b.venueOverride || old.venue, b.audienceCategory,
    b.ticketQuota || 0, Math.max(b.ticketQuota || 0, 1),
    b.status, new Date().toISOString(), req.params.id);
  audit(req.user.id, 'update', 'sub_event', req.params.id, old, b);
  res.json({ ok: true });
});

router.post('/:id/archive', requireRole('Event Manager'), (req, res) => {
  db.prepare('UPDATE events SET archivedAt=?, status=? WHERE id=?')
    .run(new Date().toISOString(), 'Closed', req.params.id);
  audit(req.user.id, 'archive', 'sub_event', req.params.id, null, null);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('Event Manager'), (req, res) => {
  const id = req.params.id;
  const has = db.prepare('SELECT COUNT(*) c FROM tickets WHERE eventId=?').get(id).c
            + db.prepare('SELECT COUNT(*) c FROM invitation_requests WHERE eventId=?').get(id).c;
  if (has > 0) return res.status(400).json({ error: 'Sub-event has operational records. Archive instead.' });
  db.prepare('DELETE FROM events WHERE id=?').run(id);
  audit(req.user.id, 'delete', 'sub_event', id, null, null);
  res.json({ ok: true });
});

function validateSub(b) {
  const errs = [];
  if (!b.masterEventId) errs.push('Parent Master Event required');
  if (!b.subEventName) errs.push('Sub-Event Name required');
  if (!b.date) errs.push('Date required');
  if (!b.audienceCategory) errs.push('Audience Category required');
  if (b.ticketQuota != null && b.ticketQuota < 0) errs.push('Ticket Quota must be zero or positive');
  return errs;
}

module.exports = router;
