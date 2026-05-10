import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../AuthContext';

const Card = ({ label, value, color='text-primary' }) => (
  <div className="bg-white border rounded p-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
  </div>
);

export default function MasterEventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const canManage = ['Admin','Event Manager'].includes(user.role);

  useEffect(() => {
    api.get(`/master-events/${id}/report`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Error'));
  }, [id]);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!data) return <div>Loading...</div>;

  const m = data.master;
  const totals = data.subEvents.reduce((acc, s) => ({
    quota: acc.quota + (s.ticketQuota || 0),
    uploaded: acc.uploaded + s.uploaded,
    assigned: acc.assigned + s.assigned,
    checkedIn: acc.checkedIn + s.checkedIn
  }), { quota: 0, uploaded: 0, assigned: 0, checkedIn: 0 });
  const available = totals.uploaded - totals.assigned;
  const attendance = totals.assigned > 0 ? Math.round((totals.checkedIn / totals.assigned) * 100) : 0;
  const vvip = data.byPriority.find(p => p.priorityLevel === 'VVIP') || {};
  const vip = data.byPriority.find(p => p.priorityLevel === 'VIP') || {};

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded p-4">
        <div className="flex justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">{m.eventName}</h1>
            <div className="text-sm text-gray-600 mt-1">
              {m.hostOrganization} · {m.venue}<br/>
              {m.startDate} → {m.endDate} · {m.eventLevel} · {m.sportCategory}
            </div>
          </div>
          <div className="text-end space-y-1">
            <StatusBadge status={m.timeClassification}/>
            <div><StatusBadge status={m.operationalStatus}/></div>
          </div>
        </div>
        {canManage && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/events/${id}/edit`} className="bg-primary text-white px-3 py-1 rounded text-sm">Edit</Link>
            <Link to={`/events/${id}/sub-events/new`} className="bg-emerald-600 text-white px-3 py-1 rounded text-sm">+ Sub-Event</Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card label="Sub-Events" value={data.subEvents.length}/>
        <Card label="Ticket Quota" value={totals.quota}/>
        <Card label="Uploaded" value={totals.uploaded}/>
        <Card label="Assigned" value={totals.assigned} color="text-blue-600"/>
        <Card label="Available" value={available}/>
        <Card label="Checked-in" value={totals.checkedIn} color="text-emerald-600"/>
        <Card label="Attendance" value={attendance + '%'} color="text-emerald-600"/>
        <Card label="VVIP Assigned" value={vvip.approvedTickets || 0} color="text-purple-700"/>
        <Card label="VIP Assigned" value={vip.approvedTickets || 0} color="text-indigo-600"/>
      </div>

      <div className="bg-white border rounded">
        <h2 className="p-3 font-semibold border-b">Sub-Events</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="p-2 text-start">Name</th><th>Type</th><th>Date</th>
                <th>Audience</th><th>Quota</th><th>Up</th><th>Asn</th><th>In</th>
                <th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.subEvents.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.eventName}</td>
                  <td className="text-center text-xs">{s.subEventType}</td>
                  <td className="text-center text-xs">{s.date}</td>
                  <td className="text-center"><StatusBadge status={s.audienceCategory}/></td>
                  <td className="text-center">{s.ticketQuota}</td>
                  <td className="text-center">{s.uploaded}</td>
                  <td className="text-center">{s.assigned}</td>
                  <td className="text-center">{s.checkedIn}</td>
                  <td className="text-center"><StatusBadge status={s.status}/></td>
                  <td className="text-center text-xs space-x-1">
                    {canManage && <Link to={`/events/${id}/sub-events/${s.id}/edit`} className="text-primary">Edit</Link>}
                  </td>
                </tr>
              ))}
              {data.subEvents.length === 0 && (
                <tr><td colSpan="10" className="p-4 text-center text-gray-500">No sub-events yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.byCategory.length > 0 && (
        <div className="bg-white border rounded p-3">
          <h3 className="font-semibold mb-2">By Audience Category</h3>
          <table className="w-full text-sm">
            <thead><tr><th className="text-start">Category</th><th>Total Req</th><th>Approved</th></tr></thead>
            <tbody>
              {data.byCategory.map(c => (
                <tr key={c.audienceCategory} className="border-t">
                  <td className="p-1">{c.audienceCategory}</td>
                  <td className="text-center">{c.totalRequests}</td>
                  <td className="text-center">{c.approvedRequests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
