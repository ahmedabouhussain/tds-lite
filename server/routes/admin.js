const router = require('express').Router();
const { resetDb, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.post('/reset', authRequired, requireRole('Admin'), (req, res) => {
  if (req.headers['x-confirm'] !== 'YES') return res.status(400).json({ error: 'Missing X-Confirm header' });
  resetDb();
  audit(req.user.id, 'reset_db', 'system', null, null, null);
  res.json({ ok: true, message: 'Database reset and reseeded' });
});

module.exports = router;
