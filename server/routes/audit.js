const router = require('express').Router();
const { db } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.get('/', authRequired, requireRole('Admin','Event Manager','Executive Viewer'), (req, res) => {
  res.json(db.prepare('SELECT a.*, u.name as userName FROM audit_log a LEFT JOIN users u ON u.id=a.userId ORDER BY a.timestamp DESC LIMIT 200').all());
});

module.exports = router;
