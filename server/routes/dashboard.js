const router = require('express').Router();
const { db } = require('../db');
const { authRequired } = require('../auth');

router.use(authRequired);

function classify(m) {
  if (m.timeClassificationOverride) return m.timeClassificationOverride;
  const today = new Date().toISOString().slice(0, 10);
  if (today < m.startDate) return 'Future';
  if (today > m.endDate) return 'Ended';
  return 'Current';
}

router.get('/', (req, res) => {
  const masters = db.prepare('SELECT * FROM master_events WHERE archivedAt IS NULL').all();
  const buckets = { Current: 0, Future: 0, Ended: 0 };
  for (const m of masters) buckets[classify(m)]++;

  const stats = {
    currentMasterEvents: buckets.Current,
    futureMasterEvents: buckets.Future,
    endedMasterEvents: buckets.Ended,
    totalSubEvents: db.prepare('SELECT COUNT(*) c FROM events WHERE archivedAt IS NULL').get().c,
    totalVVIPRequests: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE priorityLevel='VVIP'").get().c,
    totalVIPRequests: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE priorityLevel='VIP'").get().c,
    pendingApprovals: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE status='Pending'").get().c,
    approvedRequests: db.prepare("SELECT COUNT(*) c FROM invitation_requests WHERE status IN ('Approved','Partially Approved')").get().c,
    uploadedTickets: db.prepare('SELECT COUNT(*) c FROM tickets').get().c,
    assignedTickets: db.prepare('SELECT COUNT(*) c FROM ticket_assignments').get().c,
    checkedInTickets: db.prepare('SELECT COUNT(*) c FROM checkins').get().c
  };
  stats.attendancePct = stats.assignedTickets > 0
    ? Math.round((stats.checkedInTickets / stats.assignedTickets) * 100) : 0;
  const recent = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10').all();
  res.json({ stats, recent });
});

module.exports = router;
