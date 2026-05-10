const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.use(authRequired);

router.get('/', (req, res) => {
  const { eventId, limit } = req.query;
  let q = `SELECT c.*, t.barcode, t.block, t.row, t.seat, g.fullName, g.organization
           FROM checkins c JOIN tickets t ON t.id=c.ticketId JOIN guests g ON g.id=c.guestId WHERE 1=1`;
  const params = [];
  if (eventId) { q += ' AND c.eventId=?'; params.push(eventId); }
  q += ' ORDER BY c.scannedAt DESC';
  if (limit) { q += ' LIMIT ?'; params.push(parseInt(limit)); }
  res.json(db.prepare(q).all(...params));
});

router.post('/scan', requireRole('Gate Scanner', 'Event Manager'), (req, res) => {
  const { eventId, barcode, gateName } = req.body;
  if (!eventId || !barcode) return res.status(400).json({ error: 'eventId and barcode required' });
  const ticket = db.prepare('SELECT * FROM tickets WHERE barcode=?').get(barcode.trim());
  if (!ticket) return res.status(404).json({ error: 'Ticket not found', result: 'not_found' });
  if (ticket.eventId !== parseInt(eventId)) return res.status(400).json({ error: 'Ticket belongs to another event', result: 'wrong_event' });
  if (ticket.status === 'Cancelled') return res.status(400).json({ error: 'Ticket is cancelled', result: 'cancelled' });
  if (ticket.status === 'Available') return res.status(400).json({ error: 'Ticket not assigned', result: 'not_assigned' });
  if (ticket.status === 'Checked-in') return res.status(400).json({ error: 'Already checked-in', result: 'duplicate' });

  const assign = db.prepare('SELECT * FROM ticket_assignments WHERE ticketId=?').get(ticket.id);
  if (!assign) return res.status(400).json({ error: 'No assignment record', result: 'not_assigned' });
  const guest = db.prepare('SELECT * FROM guests WHERE id=?').get(assign.guestId);

  db.prepare("UPDATE tickets SET status='Checked-in' WHERE id=?").run(ticket.id);
  db.prepare('INSERT INTO checkins (eventId,ticketId,guestId,gateName,scannedBy,scannedAt,result) VALUES (?,?,?,?,?,?,?)')
    .run(eventId, ticket.id, assign.guestId, gateName||'Main', req.user.id, new Date().toISOString(), 'Valid');
  audit(req.user.id, 'checkin', 'ticket', ticket.id, null, { barcode, gateName });
  res.json({
    result: 'valid',
    guest: { name: guest.fullName, organization: guest.organization },
    seat: { block: ticket.block, row: ticket.row, seat: ticket.seat },
    time: new Date().toISOString()
  });
});

module.exports = router;
