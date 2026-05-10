const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');

router.use(authRequired);

router.get('/', (req, res) => {
  const { eventId } = req.query;
  let q = `SELECT ta.*, t.ticketCode, t.barcode, t.block, t.row, t.seat, g.fullName, g.organization
           FROM ticket_assignments ta
           JOIN tickets t ON t.id=ta.ticketId
           JOIN guests g ON g.id=ta.guestId WHERE 1=1`;
  const params = [];
  if (eventId) { q += ' AND ta.eventId=?'; params.push(eventId); }
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireRole('Ticket Officer'), (req, res) => {
  const { invitationRequestId, ticketIds } = req.body;
  if (!invitationRequestId || !Array.isArray(ticketIds) || ticketIds.length === 0)
    return res.status(400).json({ error: 'invitationRequestId and ticketIds required' });

  const reqRow = db.prepare('SELECT * FROM invitation_requests WHERE id=?').get(invitationRequestId);
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });
  if (!['Approved','Partially Approved'].includes(reqRow.status))
    return res.status(400).json({ error: 'Cannot allocate: request not approved' });

  const already = db.prepare('SELECT COUNT(*) as c FROM ticket_assignments WHERE invitationRequestId=?').get(invitationRequestId).c;
  if (already + ticketIds.length > reqRow.approvedTickets)
    return res.status(400).json({ error: `Allocation exceeds approved count (${reqRow.approvedTickets})` });

  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(reqRow.eventId);
  const totalAssigned = db.prepare('SELECT COUNT(*) as c FROM ticket_assignments WHERE eventId=?').get(reqRow.eventId).c;
  if (totalAssigned + ticketIds.length > ev.totalTickets)
    return res.status(400).json({ error: 'Allocation exceeds event capacity' });

  const insA = db.prepare('INSERT INTO ticket_assignments (eventId,ticketId,guestId,invitationRequestId,assignedBy,assignedAt) VALUES (?,?,?,?,?,?)');
  const updT = db.prepare("UPDATE tickets SET status='Assigned' WHERE id=? AND status='Available' AND eventId=?");
  const tx = db.transaction(() => {
    for (const tid of ticketIds) {
      const upd = updT.run(tid, reqRow.eventId);
      if (upd.changes === 0) throw new Error(`Ticket ${tid} not available or wrong event`);
      insA.run(reqRow.eventId, tid, reqRow.guestId, invitationRequestId, req.user.id, new Date().toISOString());
    }
  });
  try { tx(); } catch (e) { return res.status(400).json({ error: e.message }); }
  audit(req.user.id, 'allocate', 'ticket', invitationRequestId, null, ticketIds);
  res.json({ ok: true, count: ticketIds.length });
});

router.post('/:id/deliver', requireRole('Ticket Officer'), (req, res) => {
  const { method } = req.body;
  const a = db.prepare('SELECT * FROM ticket_assignments WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  const newStatus = method === 'sent' ? 'Sent' : 'Collected';
  db.prepare('UPDATE tickets SET status=? WHERE id=?').run(newStatus, a.ticketId);
  audit(req.user.id, 'deliver', 'ticket', a.ticketId, null, { method });
  res.json({ ok: true });
});

router.get('/:id/pdf', requireRole('Ticket Officer', 'Event Manager', 'Admin'), async (req, res) => {
  const PDFDocument = require('pdfkit');
  const a = db.prepare(`SELECT ta.*, t.ticketCode, t.barcode, t.block, t.row, t.seat,
                               g.fullName, g.organization, e.eventName, e.date, e.venue
                        FROM ticket_assignments ta
                        JOIN tickets t ON t.id=ta.ticketId
                        JOIN guests g ON g.id=ta.guestId
                        JOIN events e ON e.id=ta.eventId
                        WHERE ta.id=?`).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });

  let code128Png, qrPng;
  try {
    code128Png = await bwipjs.toBuffer({
      bcid: 'code128', text: a.barcode, scale: 3, height: 14,
      includetext: true, textxalign: 'center'
    });
    qrPng = await QRCode.toBuffer(a.barcode, { width: 180, margin: 1, errorCorrectionLevel: 'M' });
  } catch (e) {
    return res.status(500).json({ error: 'Barcode generation failed: ' + e.message });
  }

  const doc = new PDFDocument({ size: 'A5', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${a.ticketCode}.pdf"`);
  doc.pipe(res);
  doc.fontSize(20).text('TDS Lite — Ticket', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Event: ${a.eventName}`);
  doc.text(`Date: ${a.date}    Venue: ${a.venue}`);
  doc.moveDown(0.3);
  doc.text(`Guest: ${a.fullName}`);
  doc.text(`Organization: ${a.organization}`);
  doc.text(`Ticket: ${a.ticketCode}`);
  doc.text(`Block: ${a.block}   Row: ${a.row}   Seat: ${a.seat}`);
  doc.moveDown(0.5);
  const yStart = doc.y;
  doc.image(code128Png, 30, yStart, { width: 250 });
  doc.image(qrPng, 300, yStart, { width: 90 });
  doc.end();
});

module.exports = router;
