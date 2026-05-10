const router = require('express').Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const { authRequired } = require('../auth');

router.use(authRequired);

function buildReport(eventId) {
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(eventId);
  if (!ev) return null;
  const tickets = db.prepare('SELECT COUNT(*) as c FROM tickets WHERE eventId=?').get(eventId).c;
  const available = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE eventId=? AND status='Available'").get(eventId).c;
  const assigned = db.prepare('SELECT COUNT(*) as c FROM ticket_assignments WHERE eventId=?').get(eventId).c;
  const delivered = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE eventId=? AND status IN ('Sent','Collected','Checked-in')").get(eventId).c;
  const checkedIn = db.prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId=?').get(eventId).c;
  const approved = db.prepare("SELECT COUNT(*) as c FROM invitation_requests WHERE eventId=? AND status IN ('Approved','Partially Approved')").get(eventId).c;
  const rejected = db.prepare("SELECT COUNT(*) as c FROM invitation_requests WHERE eventId=? AND status='Rejected'").get(eventId).c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM invitation_requests WHERE eventId=? AND status='Pending'").get(eventId).c;
  const noShow = db.prepare(`SELECT g.fullName, g.organization, t.block, t.row, t.seat
    FROM ticket_assignments ta JOIN tickets t ON t.id=ta.ticketId JOIN guests g ON g.id=ta.guestId
    WHERE ta.eventId=? AND t.status!='Checked-in'`).all(eventId);
  return { ev, tickets, available, assigned, delivered, checkedIn, approved, rejected, pending, noShow,
    attendancePct: assigned ? Math.round((checkedIn/assigned)*100) : 0 };
}

router.get('/event/:id', (req, res) => {
  const r = buildReport(req.params.id);
  if (!r) return res.status(404).json({ error: 'Event not found' });
  res.json(r);
});

router.get('/event/:id/excel', async (req, res) => {
  const r = buildReport(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');
  ws.addRow(['TDS Lite — Event Report']);
  ws.addRow(['Event', r.ev.eventName]); ws.addRow(['Date', r.ev.date]); ws.addRow(['Venue', r.ev.venue]);
  ws.addRow([]);
  ws.addRow(['Metric','Value']);
  [['Total tickets', r.tickets], ['Available', r.available], ['Assigned', r.assigned],
   ['Delivered', r.delivered], ['Checked-in', r.checkedIn], ['Attendance %', r.attendancePct + '%'],
   ['Approved guests', r.approved], ['Rejected', r.rejected], ['Pending', r.pending]].forEach(row => ws.addRow(row));
  ws.addRow([]);
  ws.addRow(['No-Show List']);
  ws.addRow(['Name','Organization','Block','Row','Seat']);
  r.noShow.forEach(n => ws.addRow([n.fullName, n.organization, n.block, n.row, n.seat]));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="report-${r.ev.id}.xlsx"`);
  await wb.xlsx.write(res); res.end();
});

router.get('/event/:id/pdf', (req, res) => {
  const r = buildReport(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${r.ev.id}.pdf"`);
  doc.pipe(res);
  doc.fontSize(20).text('TDS Lite — Event Report', { align: 'center' }).moveDown();
  doc.fontSize(14).text(`Event: ${r.ev.eventName}`);
  doc.text(`Date: ${r.ev.date}   Venue: ${r.ev.venue}`).moveDown();
  doc.text(`Total tickets: ${r.tickets}`);
  doc.text(`Available: ${r.available}    Assigned: ${r.assigned}`);
  doc.text(`Delivered: ${r.delivered}    Checked-in: ${r.checkedIn}`);
  doc.text(`Attendance: ${r.attendancePct}%`);
  doc.text(`Approved: ${r.approved}   Rejected: ${r.rejected}   Pending: ${r.pending}`).moveDown();
  doc.fontSize(16).text('No-Show List').moveDown(0.5);
  doc.fontSize(11);
  r.noShow.forEach(n => doc.text(`• ${n.fullName} — ${n.organization} (${n.block}/${n.row}/${n.seat})`));
  doc.end();
});

module.exports = router;
