import React, { useEffect, useState } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../AuthContext';

export default function Requests() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [masters, setMasters] = useState([]);
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState({ masterEventId:'', subEventId:'', status:'', priorityLevel:'' });
  const [showAdd, setShowAdd] = useState(false);
  const [g, setG] = useState({ masterEventId:'', subEventId:'', fullName:'', organization:'', position:'', phone:'', email:'', category:'Guest', priorityLevel:'Standard', requestedTickets:1, notes:'', protocolNote:'' });
  const [err, setErr] = useState('');

  const load = () => {
    const p = new URLSearchParams(filter).toString();
    api.get('/requests?' + p).then(r => setRows(r.data));
  };
  useEffect(() => { api.get('/master-events').then(r => setMasters(r.data)); }, []);
  useEffect(() => {
    if (filter.masterEventId) api.get('/sub-events?masterEventId=' + filter.masterEventId).then(r => setSubs(r.data));
    else setSubs([]);
  }, [filter.masterEventId]);
  useEffect(() => { load(); }, [filter]);

  const canAdd = ['Guest Data Entry','Event Manager','Admin'].includes(user.role);

  const [addSubs, setAddSubs] = useState([]);
  useEffect(() => {
    if (g.masterEventId) api.get('/sub-events?masterEventId=' + g.masterEventId).then(r => setAddSubs(r.data));
    else setAddSubs([]);
  }, [g.masterEventId]);

  const submit = async () => {
    setErr('');
    try {
      const { masterEventId, subEventId, requestedTickets, notes, priorityLevel, protocolNote, ...gd } = g;
      await api.post('/requests', {
        eventId: subEventId, masterEventId, subEventId,
        requestedTickets, notes, audienceCategory: g.category, priorityLevel, protocolNote,
        guestData: gd
      });
      setShowAdd(false); load();
    } catch (e) { setErr(e.response?.data?.error); }
  };

  return (
    <div>
      <div className="flex justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-xl font-bold">Guest Requests</h1>
        {canAdd && <button onClick={() => setShowAdd(true)} className="bg-primary text-white px-4 py-2 rounded">+ Add Request</button>}
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={filter.masterEventId} onChange={e => setFilter({ ...filter, masterEventId: e.target.value, subEventId:'' })} className="border rounded px-2 py-1 text-sm">
          <option value="">All master events</option>
          {masters.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
        </select>
        <select value={filter.subEventId} onChange={e => setFilter({ ...filter, subEventId: e.target.value })} className="border rounded px-2 py-1 text-sm">
          <option value="">All sub-events</option>
          {subs.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className="border rounded px-2 py-1 text-sm">
          <option value="">All status</option>
          <option>Pending</option><option>Approved</option><option>Partially Approved</option><option>Rejected</option>
        </select>
        <select value={filter.priorityLevel} onChange={e => setFilter({ ...filter, priorityLevel: e.target.value })} className="border rounded px-2 py-1 text-sm">
          <option value="">All priority</option>
          <option>VVIP</option><option>VIP</option><option>Standard</option>
        </select>
      </div>
      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr>
            <th className="p-2 text-start">Guest</th><th>Org</th><th>Master</th><th>Sub</th><th>Cat</th><th>Pri</th><th>Req</th><th>Appr</th><th>Status</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.fullName}</td>
                <td className="text-center text-xs">{r.organization}</td>
                <td className="text-center text-xs">{r.masterEventName || '-'}</td>
                <td className="text-center text-xs">{r.eventName}</td>
                <td className="text-center"><StatusBadge status={r.audienceCategory}/></td>
                <td className="text-center"><StatusBadge status={r.priorityLevel}/></td>
                <td className="text-center">{r.requestedTickets}</td>
                <td className="text-center">{r.approvedTickets}</td>
                <td className="text-center"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="9" className="p-4 text-center text-gray-500">No requests</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h2 className="font-bold mb-3">Add Guest Request</h2>
            <div className="space-y-2">
              <select className="border rounded px-3 py-2 w-full" value={g.masterEventId} onChange={e=>setG({...g,masterEventId:e.target.value, subEventId:''})}>
                <option value="">Select master event *</option>
                {masters.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
              </select>
              <select className="border rounded px-3 py-2 w-full" value={g.subEventId} onChange={e=>setG({...g,subEventId:e.target.value})}>
                <option value="">Select sub-event *</option>
                {addSubs.map(e => <option key={e.id} value={e.id}>{e.eventName}</option>)}
              </select>
              <input className="border rounded px-3 py-2 w-full" placeholder="Full name *" value={g.fullName} onChange={e=>setG({...g,fullName:e.target.value})} />
              <input className="border rounded px-3 py-2 w-full" placeholder="Organization *" value={g.organization} onChange={e=>setG({...g,organization:e.target.value})} />
              <input className="border rounded px-3 py-2 w-full" placeholder="Position" value={g.position} onChange={e=>setG({...g,position:e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-3 py-2" placeholder="Phone" value={g.phone} onChange={e=>setG({...g,phone:e.target.value})} />
                <input className="border rounded px-3 py-2" placeholder="Email" value={g.email} onChange={e=>setG({...g,email:e.target.value})} />
              </div>
              <select className="border rounded px-3 py-2 w-full" value={g.category} onChange={e=>setG({...g,category:e.target.value})}>
                {['VVIP','VIP','Guest','Sponsor','Partner','Federation','Media','Staff','Protocol'].map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="border rounded px-3 py-2 w-full" value={g.priorityLevel} onChange={e=>setG({...g,priorityLevel:e.target.value})}>
                {['VVIP','VIP','Standard'].map(p => <option key={p}>{p}</option>)}
              </select>
              <input type="number" min="1" className="border rounded px-3 py-2 w-full" placeholder="Requested tickets *" value={g.requestedTickets} onChange={e=>setG({...g,requestedTickets:parseInt(e.target.value)||0})} />
              <textarea className="border rounded px-3 py-2 w-full" placeholder="Notes" value={g.notes} onChange={e=>setG({...g,notes:e.target.value})} />
              <textarea className="border rounded px-3 py-2 w-full" placeholder="Protocol note (optional)" value={g.protocolNote} onChange={e=>setG({...g,protocolNote:e.target.value})} />
              {err && <div className="text-red-600 text-sm">{err}</div>}
              <div className="flex gap-2">
                <button onClick={submit} className="bg-primary text-white px-4 py-2 rounded">Save</button>
                <button onClick={() => setShowAdd(false)} className="border px-4 py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
