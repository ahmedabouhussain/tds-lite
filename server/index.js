const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const { runMigrations } = require('./migrations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limit on scan endpoint to prevent barcode brute-forcing
const scanLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true });
app.use('/api/checkins/scan', scanLimiter);

// Init database (creates tables and seeds if empty)
initDb();
runMigrations();

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/master-events', require('./routes/master-events'));
app.use('/api/sub-events', require('./routes/sub-events'));
app.use('/api/events', require('./routes/events'));
app.use('/api/guests', require('./routes/guests'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve built client
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`TDS Lite running on http://0.0.0.0:${PORT}`));
