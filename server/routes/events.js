const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.use(authRequired);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM ticket_assignments WHERE eventId=e.id) as assignedCount,
      (SELECT COUNT(*) FROM checkins WHERE eventId=e.id) as checkedInCount
    FROM events e WHERE archivedAt IS NULL ORDER BY e.date DESC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Event not found' });
  res.json(e);
});

module.exports = router;
