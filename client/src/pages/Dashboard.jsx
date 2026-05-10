import React, { useEffect, useState } from 'react';
import api from '../api';

const Card = ({ label, value, color='text-primary' }) => (
  <div className="bg-white border rounded p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(e => setErr(e.response?.data?.error || 'Error'));
  }, []);
  if (err) return <div className="text-red-600">{err}</div>;
  if (!data) return <div>Loading...</div>;
  const s = data.stats;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card label="Current events" value={s.currentMasterEvents}/>
        <Card label="Future events" value={s.futureMasterEvents}/>
        <Card label="Ended events" value={s.endedMasterEvents}/>
        <Card label="Total sub-events" value={s.totalSubEvents}/>
        <Card label="Pending approvals" value={s.pendingApprovals} color="text-amber-600"/>
        <Card label="VVIP requests" value={s.totalVVIPRequests} color="text-purple-700"/>
        <Card label="VIP requests" value={s.totalVIPRequests} color="text-indigo-600"/>
        <Card label="Uploaded tickets" value={s.uploadedTickets}/>
        <Card label="Assigned" value={s.assignedTickets} color="text-blue-600"/>
        <Card label="Checked-in" value={s.checkedInTickets} color="text-emerald-600"/>
        <Card label="Attendance" value={s.attendancePct + '%'} color="text-emerald-600"/>
      </div>
      <div className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        <ul className="text-sm space-y-1">
          {data.recent.map(r => (
            <li key={r.id} className="border-b py-1 flex justify-between">
              <span>{r.action} · {r.entityType} #{r.entityId}</span>
              <span className="text-gray-500">{new Date(r.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
