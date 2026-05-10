import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const TYPES = ['Match','Session','Ceremony','Final','Hospitality',
  'VVIP Allocation','VIP Allocation','Sponsor Allocation','Federation Allocation',
  'Media Allocation','Protocol Allocation','Other'];
const CATEGORIES = ['VVIP','VIP','Guest','Sponsor','Partner','Federation','Media','Staff','Protocol'];
const STATUSES = ['Draft','Open for Requests','Approval Stage','Ticket Allocation','Live Check-in','Closed'];

export default function SubEventForm() {
  const { masterId, id } = useParams();
  const nav = useNavigate();
  const [master, setMaster] = useState(null);
  const [f, setF] = useState({
    masterEventId: masterId, subEventName:'', subEventType:'Match',
    date:'', startTime:'', endTime:'', venueOverride:'',
    audienceCategory:'Guest', ticketQuota:0, status:'Draft', dateOverrideReason:''
  });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/master-events/${masterId}`).then(r => setMaster(r.data));
    if (id) api.get(`/sub-events/${id}`).then(r => setF({
      ...r.data, subEventName: r.data.eventName, masterEventId: r.data.masterEventId
    }));
  }, [masterId, id]);

  const upd = (k,v) => setF(s => ({...s, [k]: v}));
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (id) await api.put(`/sub-events/${id}`, f);
      else await api.post('/sub-events', f);
      nav(`/events/${masterId}`);
    } catch (e2) { setErr(e2.response?.data?.error || 'Error'); }
    finally { setBusy(false); }
  };

  const dateOutsideRange = master && f.date && (f.date < master.startDate || f.date > master.endDate);
  const valid = f.subEventName && f.date && f.audienceCategory && f.ticketQuota >= 0
                && (!dateOutsideRange || f.dateOverrideReason);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-3">{id ? 'Edit' : 'Create'} Sub-Event</h1>
      {master && <div className="text-sm text-gray-600 mb-3">
        Parent: <b>{master.eventName}</b> ({master.startDate} → {master.endDate})
      </div>}
      <form onSubmit={submit} className="bg-white border rounded p-4 space-y-3">
        <input className="border rounded px-3 py-2 w-full" placeholder="Sub-Event Name *"
          value={f.subEventName} onChange={e=>upd('subEventName',e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select className="border rounded px-3 py-2"
            value={f.subEventType} onChange={e=>upd('subEventType',e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="border rounded px-3 py-2"
            value={f.audienceCategory} onChange={e=>upd('audienceCategory',e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" className="border rounded px-3 py-2"
            value={f.date} onChange={e=>upd('date',e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Venue Override (optional)"
            value={f.venueOverride} onChange={e=>upd('venueOverride',e.target.value)} />
          <input type="time" className="border rounded px-3 py-2"
            value={f.startTime} onChange={e=>upd('startTime',e.target.value)} />
          <input type="time" className="border rounded px-3 py-2"
            value={f.endTime} onChange={e=>upd('endTime',e.target.value)} />
          <input type="number" min="0" className="border rounded px-3 py-2"
            placeholder="Ticket Quota" value={f.ticketQuota}
            onChange={e=>upd('ticketQuota',parseInt(e.target.value)||0)} />
          <select className="border rounded px-3 py-2"
            value={f.status} onChange={e=>upd('status',e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {dateOutsideRange && (
          <div className="bg-amber-50 border border-amber-300 p-2 rounded">
            <div className="text-sm text-amber-800 mb-1">⚠ Date outside parent event range. Admin override + reason required.</div>
            <input className="border rounded px-3 py-2 w-full" placeholder="Reason for override"
              value={f.dateOverrideReason} onChange={e=>upd('dateOverrideReason',e.target.value)} />
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
