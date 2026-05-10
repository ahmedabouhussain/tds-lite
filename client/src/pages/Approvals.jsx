import React, { useEffect, useState } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function Approvals() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  const load = () => api.get('/requests?status=Pending').then(r => setRows(r.data));
  useEffect(() => { load(); }, []);
  const decide = async (r, decision) => {
    setErr('');
    let approvedTickets = r.requestedTickets, note = '';
    if (decision === 'Partially Approved') {
      const v = prompt(`Approve how many of ${r.requestedTickets}?`);
      approvedTickets = parseInt(v); if (!approvedTickets) return;
    }
    if (decision === 'Rejected') {
      note = prompt('Reason for rejection (required):'); if (!note) return;
    }
    try {
      await api.post(`/requests/${r.id}/decision`, { decision, approvedTickets, note });
      load();
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
  };
  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Approval Queue</h1>
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-2">{err}</div>}
      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr>
            <th className="p-2 text-start">Guest</th><th>Org</th><th>Sub-Event</th><th>Pri</th><th>Req</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.fullName}</td>
                <td className="text-center text-xs">{r.organization}</td>
                <td className="text-center text-xs">{r.eventName}</td>
                <td className="text-center"><StatusBadge status={r.priorityLevel}/></td>
                <td className="text-center">{r.requestedTickets}</td>
                <td className="text-center"><StatusBadge status={r.status} /></td>
                <td className="text-center space-x-1">
                  <button onClick={() => decide(r,'Approved')} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Approve</button>
                  <button onClick={() => decide(r,'Partially Approved')} className="bg-amber-500 text-white px-2 py-1 rounded text-xs">Partial</button>
                  <button onClick={() => decide(r,'Rejected')} className="bg-red-600 text-white px-2 py-1 rounded text-xs">Reject</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7" className="p-4 text-center text-gray-500">No pending</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
