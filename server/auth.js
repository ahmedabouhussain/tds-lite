const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'tds-lite-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET, { expiresIn: '12h' });
}

function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No auth' });
    if (req.user.role === 'Admin' || allowed.includes(req.user.role)) return next();
    res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
}

module.exports = { signToken, authRequired, requireRole };
