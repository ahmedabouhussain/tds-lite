import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const LEVELS = ['Local','Gulf','Arab','Asian','Global','International'];
const STATUSES = ['Draft','Setup','Open for Requests','Approval Stage','Ticket Allocation','Live Check-in','Closed'];

export default function MasterEventForm() {
  const { id } = useParams(); const nav = useNavigate();
  const [f, setF] = useState({
    eventName:'', hostOrganization:'', venue:'', sportCategory:'',
    eventLevel:'Local', startDate:'', endDate:'', dateConfidence:'Exact',
    operationalStatus:'Draft', totalPlannedTickets:0
  });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);

  useEffect(() => { if (id) api.get(`/master-events/${id}`).then(r => setF(r.data)); }, [id]);
  const upd = (k,v) => setF(s => ({...s, [k]: v}));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const config = confirmChange ? { headers: { 'X-Confirm-Change':'YES' } } : {};
      if (id) await api.put(`/master-events/${id}`, f, config);
      else await api.post('/master-events', f);
      nav('/events');
    } catch (e2) {
      const msg = e2.response?.data?.error || 'Error';
      if (msg.includes('Active ticketing records')) setConfirmChange(true);
      setErr(msg);
    } finally { setBusy(false); }
  };

  const valid = f.eventName && f.hostOrganization && f.venue && f.startDate && f.endDate
                && f.endDate >= f.startDate && f.eventLevel && f.totalPlannedTickets >= 0;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-3">{id ? 'Edit' : 'Create'} Master Event</h1>
      <form onSubmit={submit} className="bg-white border rounded p-4 space-y-3">
        <input className="border rounded px-3 py-2 w-full" placeholder="Event Name *"
          value={f.eventName} onChange={e=>upd('eventName',e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Host Organization *"
            value={f.hostOrganization} onChange={e=>upd('hostOrganization',e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Venue *"
            value={f.venue} onChange={e=>upd('venue',e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Sport Category"
            value={f.sportCategory} onChange={e=>upd('sportCategory',e.target.value)} />
          <select className="border rounded px-3 py-2"
            value={f.eventLevel} onChange={e=>upd('eventLevel',e.target.value)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <input type="date" className="border rounded px-3 py-2"
            value={f.startDate} onChange={e=>upd('startDate',e.target.value)} />
          <input type="date" className="border rounded px-3 py-2"
            value={f.endDate} onChange={e=>upd('endDate',e.target.value)} />
          <select className="border rounded px-3 py-2"
            value={f.dateConfidence} onChange={e=>upd('dateConfidence',e.target.value)}>
            <option>Exact</option><option>Approximate</option>
          </select>
          <input type="number" min="0" className="border rounded px-3 py-2"
            placeholder="Total Planned Tickets" value={f.totalPlannedTickets}
            onChange={e=>upd('totalPlannedTickets',parseInt(e.target.value)||0)} />
          <select className="border rounded px-3 py-2 col-span-2"
            value={f.operationalStatus} onChange={e=>upd('operationalStatus',e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {confirmChange && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 p-2 rounded text-sm">
            ⚠ Active ticketing records exist. Saving will proceed.
          </div>
        )}
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={!valid || busy}
          className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">
          {busy ? '...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
