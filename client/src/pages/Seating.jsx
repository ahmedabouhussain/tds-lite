import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Seating() {
  const [masters, setMasters] = useState([]);
  const [masterId, setMasterId] = useState('');
  const [subs, setSubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [tickets, setTickets] = useState([]);
  const [sel, setSel] = useState(null);

  useEffect(() => { api.get('/master-events').then(r => setMasters(r.data)); }, []);
  useEffect(() => {
    if (masterId) api.get('/sub-events?masterEventId=' + masterId).then(r => setSubs(r.data));
    else setSubs([]);
    setEventId('');
  }, [masterId]);
  useEffect(() => { eventId && api.get('/tickets?eventId=' + eventId).then(r => setTickets(r.data)); }, [eventId]);

  const color = (s) => ({
    Available:'bg-gray-200', Assigned:'bg-yellow-300', Sent:'bg-blue-300',
    Collected:'bg-blue-400', 'Checked-in':'bg-green-400', Cancelled:'bg-red-300'
  })[s] || 'bg-gray-200';

  const grouped = {};
  tickets.forEach(t => { (grouped[t.block] = grouped[t.block] || []).push(t); });

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Seating Map</h1>
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
      <div className="space-y-3">
        {Object.entries(grouped).map(([block, ts]) => (
          <div key={block} className="bg-white border rounded p-2">
            <h3 className="font-semibold">Block {block}</h3>
            <div className="flex flex-wrap gap-1 mt-2">
              {ts.map(t => (
                <button key={t.id} onClick={()=>setSel(t)} title={`${t.block}-${t.row}-${t.seat} (${t.status})`}
                  className={`w-10 h-8 text-[10px] rounded ${color(t.status)}`}>
                  {t.row}.{t.seat}
                </button>
              ))}
            </div>
          </div>
        ))}
        {tickets.length === 0 && <div className="text-center text-gray-500 py-8">Select a sub-event to view seating</div>}
      </div>
      {sel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setSel(null)}>
          <div className="bg-white rounded p-4 max-w-md w-full" onClick={e=>e.stopPropagation()}>
            <h2 className="font-bold">Ticket {sel.ticketCode}</h2>
            <div>Barcode: {sel.barcode}</div>
            <div>Seat: {sel.block}-{sel.row}-{sel.seat}</div>
            <div>Status: {sel.status}</div>
            <div>Guest: {sel.assignedGuest || '—'}</div>
            <button onClick={()=>setSel(null)} className="mt-2 bg-primary text-white px-4 py-2 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
