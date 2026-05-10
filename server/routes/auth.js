const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db, audit } = require('../db');
const { signToken, authRequired } = require('../auth');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const u = db.prepare('SELECT * FROM users WHERE email=? AND status=?').get(email, 'active');
  if (!u || !bcrypt.compareSync(password, u.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  audit(u.id, 'login', 'user', u.id, null, null);
  res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

router.get('/me', authRequired, (req, res) => res.json({ user: req.user }));
module.exports = router;
