import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Reports() {
  const [masters, setMasters] = useState([]);
  const [masterId, setMasterId] = useState('');
  const [subs, setSubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [r, setR] = useState(null);

  useEffect(() => { api.get('/master-events').then(x => setMasters(x.data)); }, []);
  useEffect(() => {
    if (masterId) api.get('/sub-events?masterEventId=' + masterId).then(x => setSubs(x.data));
    else setSubs([]);
    setEventId('');
  }, [masterId]);
  useEffect(() => { eventId && api.get('/reports/event/' + eventId).then(x => setR(x.data)); }, [eventId]);

  const dl = (fmt) => {
    const token = localStorage.getItem('tds_token');
    fetch(`/api/reports/event/${eventId}/${fmt}`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.blob()).then(b => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = url; a.download = `report-${eventId}.${fmt==='excel'?'xlsx':'pdf'}`; a.click();
      });
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Reports</h1>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={masterId} onChange={e=>setMasterId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Select master event</option>
          {masters.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
        </select>
        <select value={eventId} onChange={e=>setEventId(e.target.value)} className="border rounded px-2 py-1" disabled={!masterId}>
          <option value="">Select sub-event</option>
          {subs.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
        </select>
      </div>
      {r && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-bold mb-2">{r.ev.eventName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>Total: {r.tickets}</div><div>Available: {r.available}</div>
            <div>Assigned: {r.assigned}</div><div>Delivered: {r.delivered}</div>
            <div>Checked-in: {r.checkedIn}</div><div>Attendance: {r.attendancePct}%</div>
            <div>Approved: {r.approved}</div><div>Rejected: {r.rejected}</div><div>Pending: {r.pending}</div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={()=>dl('excel')} className="bg-green-700 text-white px-4 py-2 rounded">Export Excel</button>
            <button onClick={()=>dl('pdf')} className="bg-red-700 text-white px-4 py-2 rounded">Export PDF</button>
          </div>
          <h3 className="font-semibold mt-4 mb-2">No-show list</h3>
          <ul className="text-sm space-y-1">
            {r.noShow.map((n,i) => <li key={i}>• {n.fullName} — {n.organization} ({n.block}-{n.row}-{n.seat})</li>)}
            {r.noShow.length === 0 && <li className="text-gray-500">No no-shows</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
