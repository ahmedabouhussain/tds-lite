const router = require('express').Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');
const bwipjs = require('bwip-js');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authRequired);

router.get('/', (req, res) => {
  const { eventId } = req.query;
  let q = 'SELECT t.*, g.fullName as assignedGuest FROM tickets t LEFT JOIN ticket_assignments ta ON ta.ticketId=t.id LEFT JOIN guests g ON g.id=ta.guestId WHERE 1=1';
  const params = [];
  if (eventId) { q += ' AND t.eventId=?'; params.push(eventId); }
  q += ' ORDER BY t.block, CAST(t.row AS INTEGER), CAST(t.seat AS INTEGER)';
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireRole('Ticket Officer', 'Event Manager'), (req, res) => {
  const { eventId, ticketCode, barcode, block, row, seat, category } = req.body;
  if (!eventId || !ticketCode || !barcode || !block || !row || !seat)
    return res.status(400).json({ error: 'All ticket fields required' });
  if (!/^[\x20-\x7E]+$/.test(barcode)) return res.status(400).json({ error: 'Barcode must be ASCII printable' });
  const sub = db.prepare('SELECT masterEventId, audienceCategory FROM events WHERE id=?').get(eventId);
  if (!sub) return res.status(400).json({ error: 'Sub-event not found' });
  try {
    const r = db.prepare(`INSERT INTO tickets
      (eventId, masterEventId, subEventId, ticketCode, barcode, block, row, seat,
       category, audienceCategory, status, createdAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      eventId, sub.masterEventId, eventId, ticketCode, barcode, block, row, seat,
      category||'Standard', sub.audienceCategory || 'Guest', 'Available', new Date().toISOString());
    audit(req.user.id, 'create', 'ticket', r.lastInsertRowid, null, req.body);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Duplicate barcode or seat in this event' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/upload-csv', requireRole('Ticket Officer', 'Event Manager'), upload.single('file'), (req, res) => {
  const eventId = parseInt(req.body.eventId);
  if (!eventId || !req.file) return res.status(400).json({ error: 'eventId and file required' });
  const sub = db.prepare('SELECT masterEventId, audienceCategory FROM events WHERE id=?').get(eventId);
  if (!sub) return res.status(400).json({ error: 'Sub-event not found' });
  let rows;
  try {
    rows = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) { return res.status(400).json({ error: 'CSV parse error: ' + e.message }); }

  const results = { imported: 0, skipped: 0, errors: [] };
  const ins = db.prepare(`INSERT INTO tickets
    (eventId, masterEventId, subEventId, ticketCode, barcode, block, row, seat,
     category, audienceCategory, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const tx = db.transaction((rows) => {
    for (const [i, r] of rows.entries()) {
      if (!r.ticketCode || !r.barcode || !r.block || !r.row || !r.seat) {
        results.errors.push({ line: i+2, error: 'Missing required fields' }); results.skipped++; continue;
      }
      if (!/^[\x20-\x7E]+$/.test(r.barcode)) {
        results.errors.push({ line: i+2, error: 'Barcode must be ASCII' }); results.skipped++; continue;
      }
      try {
        ins.run(eventId, sub.masterEventId, eventId, r.ticketCode, r.barcode, r.block, r.row, r.seat,
          r.category||'Standard', sub.audienceCategory || 'Guest', 'Available', new Date().toISOString());
        results.imported++;
      } catch (e) {
        results.errors.push({ line: i+2, error: e.message.includes('UNIQUE') ? 'Duplicate barcode/seat' : e.message });
        results.skipped++;
      }
    }
  });
  tx(rows);
  audit(req.user.id, 'csv_import', 'ticket', eventId, null, results);
  res.json(results);
});

router.get('/:id/barcode.png', async (req, res) => {
  const t = db.prepare('SELECT barcode FROM tickets WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).end();
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128', text: t.barcode, scale: 2, height: 10,
      includetext: true, textxalign: 'center'
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(png);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
