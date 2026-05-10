import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Allocation() {
  const [masters, setMasters] = useState([]);
  const [masterId, setMasterId] = useState('');
  const [subs, setSubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [picking, setPicking] = useState(null);
  const [picked, setPicked] = useState([]);
  const [err, setErr] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => { api.get('/master-events').then(r => setMasters(r.data)); }, []);
  useEffect(() => {
    if (masterId) api.get('/sub-events?masterEventId=' + masterId).then(r => setSubs(r.data));
    else setSubs([]);
    setEventId('');
  }, [masterId]);
  const load = () => {
    if (!eventId) return;
    api.get('/requests?subEventId=' + eventId).then(r =>
      setRequests(r.data.filter(x => ['Approved','Partially Approved'].includes(x.status))));
    api.get('/tickets?eventId=' + eventId).then(r => setTickets(r.data.filter(x => x.status === 'Available')));
  };
  useEffect(() => { load(); }, [eventId]);

  const allocate = async () => {
    setErr('');
    try {
      await api.post('/assignments', { invitationRequestId: picking.id, ticketIds: picked });
      setPicking(null); setPicked([]); load();
    } catch (e) { setErr(e.response?.data?.error); }
  };

  const filteredReqs = priorityFilter ? requests.filter(r => r.priorityLevel === priorityFilter) : requests;

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Ticket Allocation</h1>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={masterId} onChange={e=>setMasterId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Select master event</option>
          {masters.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
        </select>
        <select value={eventId} onChange={e=>setEventId(e.target.value)} className="border rounded px-2 py-1" disabled={!masterId}>
          <option value="">Select sub-event</option>
          {subs.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
        </select>
        <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">All priority</option>
          <option>VVIP</option><option>VIP</option><option>Standard</option>
        </select>
      </div>
      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2 text-start">Guest</th><th>Org</th><th>Pri</th><th>Approved</th><th>Action</th></tr></thead>
          <tbody>
            {filteredReqs.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.fullName}</td>
                <td className="text-center text-xs">{r.organization}</td>
                <td className="text-center text-xs">{r.priorityLevel}</td>
                <td className="text-center">{r.approvedTickets}</td>
                <td className="text-center">
                  <button onClick={()=>{setPicking(r); setPicked([]);}} className="bg-primary text-white px-2 py-1 rounded text-xs">Allocate</button>
                </td>
              </tr>
            ))}
            {filteredReqs.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-500">No approved requests</td></tr>}
          </tbody>
        </table>
      </div>

      {picking && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h2 className="font-bold mb-2">Pick tickets for {picking.fullName} (max {picking.approvedTickets})</h2>
            <div className="grid grid-cols-4 gap-1 max-h-80 overflow-auto">
              {tickets.map(t => {
                const sel = picked.includes(t.id);
                return (
                  <button key={t.id}
                    onClick={() => {
                      if (sel) setPicked(picked.filter(x=>x!==t.id));
                      else if (picked.length < picking.approvedTickets) setPicked([...picked, t.id]);
                    }}
                    className={`text-xs p-1 border rounded ${sel?'bg-primary text-white':''}`}>
                    {t.block}-{t.row}-{t.seat}
                  </button>
                );
              })}
            </div>
            <div className="text-sm mt-2">Selected: {picked.length} / {picking.approvedTickets}</div>
            {err && <div className="text-red-600 text-sm">{err}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={allocate} disabled={picked.length===0} className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">Allocate</button>
              <button onClick={()=>{setPicking(null);setPicked([]);}} className="border px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
