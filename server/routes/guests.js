const router = require('express').Router();
const { db, audit } = require('../db');
const { authRequired, requireRole } = require('../auth');

router.use(authRequired);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM guests ORDER BY id DESC').all());
});

router.post('/', requireRole('Guest Data Entry', 'Event Manager'), (req, res) => {
  const { fullName, organization, position, phone, email, category } = req.body;
  if (!fullName || !organization) return res.status(400).json({ error: 'fullName and organization required' });
  if (!phone && !email) return res.status(400).json({ error: 'phone or email required' });
  const exists = phone || email
    ? db.prepare('SELECT * FROM guests WHERE (phone=? AND phone IS NOT NULL AND phone!="") OR (email=? AND email IS NOT NULL AND email!="")').get(phone||'', email||'')
    : null;
  if (exists) return res.json({ id: exists.id, existing: true });
  const r = db.prepare('INSERT INTO guests (fullName,organization,position,phone,email,category,createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(fullName, organization, position||'', phone||'', email||'', category||'Guest', new Date().toISOString());
  audit(req.user.id, 'create', 'guest', r.lastInsertRowid, null, req.body);
  res.json({ id: r.lastInsertRowid });
});

module.exports = router;
