const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.use(authRequired);

router.get('/', (req, res) => {
  const { eventId, status, masterEventId, subEventId, priorityLevel, audienceCategory } = req.query;
  let q = `SELECT r.*, g.fullName, g.organization, g.category, e.eventName, me.eventName as masterEventName
           FROM invitation_requests r
           JOIN guests g ON g.id=r.guestId
           JOIN events e ON e.id=r.eventId
           LEFT JOIN master_events me ON me.id=r.masterEventId WHERE 1=1`;
  const params = [];
  if (eventId) { q += ' AND r.eventId=?'; params.push(eventId); }
  if (masterEventId) { q += ' AND r.masterEventId=?'; params.push(masterEventId); }
  if (subEventId) { q += ' AND r.subEventId=?'; params.push(subEventId); }
  if (priorityLevel) { q += ' AND r.priorityLevel=?'; params.push(priorityLevel); }
  if (audienceCategory) { q += ' AND r.audienceCategory=?'; params.push(audienceCategory); }
  if (status) { q += ' AND r.status=?'; params.push(status); }
  q += ' ORDER BY r.createdAt DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireRole('Guest Data Entry', 'Event Manager'), (req, res) => {
  const { eventId, masterEventId, subEventId, guestData, requestedTickets, notes,
          audienceCategory, priorityLevel, protocolNote } = req.body;
  const subId = subEventId || eventId;
  if (!subId || !requestedTickets || requestedTickets <= 0)
    return res.status(400).json({ error: 'subEventId and positive requestedTickets required' });
  if (!guestData || !guestData.fullName || !guestData.organization)
    return res.status(400).json({ error: 'guest fullName and organization required' });
  if (!guestData.phone && !guestData.email)
    return res.status(400).json({ error: 'phone or email required' });

  const sub = db.prepare('SELECT masterEventId, audienceCategory FROM events WHERE id=?').get(subId);
  if (!sub) return res.status(400).json({ error: 'Sub-event not found' });
  const finalMaster = masterEventId || sub.masterEventId;
  const finalCat = audienceCategory || sub.audienceCategory || 'Guest';
  const finalPriority = priorityLevel || (finalCat === 'VVIP' ? 'VVIP' : finalCat === 'VIP' ? 'VIP' : 'Standard');

  let guestId = guestData.id;
  if (!guestId) {
    const exist = db.prepare('SELECT id FROM guests WHERE (phone=? AND phone!="") OR (email=? AND email!="")').get(guestData.phone||'', guestData.email||'');
    if (exist) guestId = exist.id;
    else {
      guestId = db.prepare('INSERT INTO guests (fullName,organization,position,phone,email,category,createdAt) VALUES (?,?,?,?,?,?,?)')
        .run(guestData.fullName, guestData.organization, guestData.position||'', guestData.phone||'', guestData.email||'', guestData.category||finalCat, new Date().toISOString()).lastInsertRowid;
    }
  }
  const r = db.prepare(`INSERT INTO invitation_requests
    (eventId, masterEventId, subEventId, guestId, audienceCategory, priorityLevel,
     requestedTickets, notes, protocolNote, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    subId, finalMaster, subId, guestId, finalCat, finalPriority,
    requestedTickets, notes||'', protocolNote||'', new Date().toISOString());
  audit(req.user.id, 'create', 'invitation_request', r.lastInsertRowid, null, req.body);
  res.json({ id: r.lastInsertRowid });
});

router.put('/:id', requireRole('Guest Data Entry', 'Event Manager'), (req, res) => {
  const old = db.prepare('SELECT * FROM invitation_requests WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  if (old.status !== 'Pending') return res.status(400).json({ error: 'Only Pending requests can be edited' });
  const { requestedTickets, notes } = req.body;
  if (!requestedTickets || requestedTickets <= 0) return res.status(400).json({ error: 'Invalid tickets' });
  db.prepare('UPDATE invitation_requests SET requestedTickets=?, notes=? WHERE id=?').run(requestedTickets, notes||'', req.params.id);
  audit(req.user.id, 'update', 'invitation_request', req.params.id, old, req.body);
  res.json({ ok: true });
});

router.post('/:id/decision', requireRole('Approver'), (req, res) => {
  const old = db.prepare('SELECT * FROM invitation_requests WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const { decision, approvedTickets, note } = req.body;
  if (!['Approved','Partially Approved','Rejected'].includes(decision))
    return res.status(400).json({ error: 'Invalid decision' });
  if (decision === 'Rejected' && !note) return res.status(400).json({ error: 'Rejection requires note' });
  let appr = 0;
  if (decision === 'Approved') {
    appr = approvedTickets || old.requestedTickets;
    if (appr <= 0 || appr > old.requestedTickets) return res.status(400).json({ error: 'Invalid approved count' });
  } else if (decision === 'Partially Approved') {
    appr = approvedTickets;
    if (!appr || appr <= 0 || appr >= old.requestedTickets)
      return res.status(400).json({ error: 'Partial approval must be > 0 and < requested' });
  }
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(old.eventId);
  const usedApproved = db.prepare("SELECT COALESCE(SUM(approvedTickets),0) as s FROM invitation_requests WHERE eventId=? AND status IN ('Approved','Partially Approved') AND id!=?")
    .get(old.eventId, old.id).s;
  if (usedApproved + appr > ev.totalTickets)
    return res.status(400).json({ error: `Approval exceeds event capacity (${ev.totalTickets})` });

  db.prepare('UPDATE invitation_requests SET status=?, approvedTickets=?, approverId=?, decisionNote=?, decisionDate=? WHERE id=?')
    .run(decision, appr, req.user.id, note||'', new Date().toISOString(), req.params.id);
  audit(req.user.id, 'decision', 'invitation_request', req.params.id, old, { decision, appr, note });
  res.json({ ok: true });
});

module.exports = router;
