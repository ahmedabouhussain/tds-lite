import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../AuthContext';
import { ChevronDown, ChevronRight, Archive, Trash2, Eye, Edit, Plus } from 'lucide-react';

const TABS = ['Current', 'Future', 'Ended'];

export default function MasterEvents() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Future');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ Current: 0, Future: 0, Ended: 0 });
  const [filters, setFilters] = useState({ q:'', host:'', sport:'', level:'', venue:'', status:'' });
  const [expanded, setExpanded] = useState({});
  const [subs, setSubs] = useState({});
  const [error, setError] = useState('');

  const canManage = ['Admin','Event Manager'].includes(user.role);

  const load = () => {
    const params = new URLSearchParams({ time: tab, ...Object.fromEntries(
      Object.entries(filters).filter(([_,v]) => v))
    }).toString();
    api.get('/master-events?' + params).then(r => setRows(r.data));
    api.get('/master-events/counts').then(r => setCounts(r.data));
  };
  useEffect(() => { load(); }, [tab, filters]);

  const toggleExpand = async (id) => {
    if (expanded[id]) {
      setExpanded({ ...expanded, [id]: false });
    } else {
      if (!subs[id]) {
        const r = await api.get('/sub-events?masterEventId=' + id);
        setSubs(s => ({ ...s, [id]: r.data }));
      }
      setExpanded({ ...expanded, [id]: true });
    }
  };

  const archiveMaster = async (id) => {
    if (!confirm('Archive this event? It will be hidden from active lists.')) return;
    await api.post(`/master-events/${id}/archive`);
    load();
  };

  const deleteMaster = async (id) => {
    if (!confirm('Delete permanently? This will fail if any operational records exist.')) return;
    try {
      await api.delete(`/master-events/${id}`);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Delete failed');
    }
  };

  const distinctValues = useMemo(() => {
    const get = (k) => [...new Set(rows.map(r => r[k]).filter(Boolean))];
    return { hosts: get('hostOrganization'), sports: get('sportCategory'),
             venues: get('venue'), levels: ['Local','Gulf','Arab','Asian','Global','International'] };
  }, [rows]);

  return (
    <div>
      <div className="flex justify-between flex-wrap gap-2 mb-3">
        <h1 className="text-xl font-bold">Master Events</h1>
        {canManage && (
          <Link to="/events/new" className="bg-primary text-white px-4 py-2 rounded inline-flex items-center gap-1">
            <Plus size={16} /> New Master Event
          </Link>
        )}
      </div>

      <div className="flex gap-1 mb-3 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-600'}`}>
            {t} Events <span className="ml-1 bg-gray-100 px-2 py-0.5 rounded text-xs">{counts[t] || 0}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
        <input placeholder="Search..." value={filters.q}
          onChange={e => setFilters({...filters, q:e.target.value})}
          className="border rounded px-2 py-1 text-sm col-span-2" />
        <select value={filters.host} onChange={e => setFilters({...filters, host:e.target.value})}
          className="border rounded px-2 py-1 text-sm">
          <option value="">All hosts</option>
          {distinctValues.hosts.map(h => <option key={h}>{h}</option>)}
        </select>
        <select value={filters.sport} onChange={e => setFilters({...filters, sport:e.target.value})}
          className="border rounded px-2 py-1 text-sm">
          <option value="">All sports</option>
          {distinctValues.sports.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.level} onChange={e => setFilters({...filters, level:e.target.value})}
          className="border rounded px-2 py-1 text-sm">
          <option value="">All levels</option>
          {distinctValues.levels.map(l => <option key={l}>{l}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({...filters, status:e.target.value})}
          className="border rounded px-2 py-1 text-sm">
          <option value="">All status</option>
          {['Draft','Setup','Open for Requests','Approval Stage','Ticket Allocation','Live Check-in','Closed'].map(s =>
            <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-2 text-sm">{error}</div>}

      <div className="hidden md:block bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2"></th>
              <th className="p-2 text-start">Event</th>
              <th>Host</th><th>Venue</th><th>Start</th><th>End</th>
              <th>Level</th><th>Status</th><th>Subs</th>
              <th>Quota</th><th>Up</th><th>Asn</th><th>In</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.id}>
                <tr className="border-t hover:bg-gray-50">
                  <td className="p-2">
                    <button onClick={() => toggleExpand(r.id)}>
                      {expanded[r.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>
                  </td>
                  <td className="p-2 font-medium">
                    <Link to={`/events/${r.id}`} className="text-primary hover:underline">{r.eventName}</Link>
                    {r.dateConfidence === 'Approximate' && <span className="ml-1 text-xs text-amber-600">~</span>}
                  </td>
                  <td className="text-xs text-center">{r.hostOrganization}</td>
                  <td className="text-xs text-center">{r.venue}</td>
                  <td className="text-xs text-center">{r.startDate}</td>
                  <td className="text-xs text-center">{r.endDate}</td>
                  <td className="text-center"><span className="text-xs">{r.eventLevel}</span></td>
                  <td className="text-center"><StatusBadge status={r.operationalStatus}/></td>
                  <td className="text-center">{r.subEventCount}</td>
                  <td className="text-center">{r.totalPlannedTickets}</td>
                  <td className="text-center">{r.totalUploadedTickets}</td>
                  <td className="text-center">{r.totalAssignedTickets}</td>
                  <td className="text-center">{r.totalCheckedInTickets}</td>
                  <td className="text-center whitespace-nowrap">
                    <Link to={`/events/${r.id}`} className="text-primary mx-1" title="View"><Eye size={14}/></Link>
                    {canManage && <>
                      <Link to={`/events/${r.id}/edit`} className="text-blue-600 mx-1" title="Edit"><Edit size={14}/></Link>
                      <Link to={`/events/${r.id}/sub-events/new`} className="text-emerald-600 mx-1 text-xs">+Sub</Link>
                      <button onClick={() => archiveMaster(r.id)} className="text-amber-600 mx-1" title="Archive"><Archive size={14}/></button>
                      <button onClick={() => deleteMaster(r.id)} className="text-red-600 mx-1" title="Delete"><Trash2 size={14}/></button>
                    </>}
                  </td>
                </tr>
                {expanded[r.id] && (
                  <tr className="bg-gray-50">
                    <td colSpan="14" className="p-3">
                      <h4 className="font-semibold text-xs mb-2">Sub-Events</h4>
                      {(subs[r.id] || []).length === 0
                        ? <div className="text-xs text-gray-500">No sub-events. {canManage && <Link to={`/events/${r.id}/sub-events/new`} className="text-primary">Add one</Link>}</div>
                        : <table className="w-full text-xs">
                            <thead><tr className="text-gray-600">
                              <th className="text-start">Name</th><th>Type</th><th>Date</th><th>Audience</th>
                              <th>Quota</th><th>Up</th><th>Asn</th><th>In</th><th>Status</th><th></th>
                            </tr></thead>
                            <tbody>
                              {subs[r.id].map(s => (
                                <tr key={s.id} className="border-t">
                                  <td>{s.eventName}</td>
                                  <td className="text-center">{s.subEventType}</td>
                                  <td className="text-center">{s.date}</td>
                                  <td className="text-center"><StatusBadge status={s.audienceCategory}/></td>
                                  <td className="text-center">{s.ticketQuota}</td>
                                  <td className="text-center">{s.uploaded}</td>
                                  <td className="text-center">{s.assigned}</td>
                                  <td className="text-center">{s.checkedIn}</td>
                                  <td className="text-center"><StatusBadge status={s.status}/></td>
                                  <td className="text-center">
                                    <Link to={`/events/${r.id}/sub-events/${s.id}/edit`} className="text-primary">Open</Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="14" className="p-4 text-center text-gray-500">No {tab.toLowerCase()} events</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {rows.map(r => (
          <div key={r.id} className="bg-white border rounded p-3">
            <div className="flex justify-between items-start">
              <Link to={`/events/${r.id}`} className="font-bold text-primary">{r.eventName}</Link>
              <StatusBadge status={r.operationalStatus}/>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {r.hostOrganization} · {r.venue}<br/>
              {r.startDate} → {r.endDate} · {r.eventLevel}
            </div>
            <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
              <div><span className="text-gray-500">Subs</span><div className="font-bold">{r.subEventCount}</div></div>
              <div><span className="text-gray-500">Up</span><div className="font-bold">{r.totalUploadedTickets}</div></div>
              <div><span className="text-gray-500">Asn</span><div className="font-bold">{r.totalAssignedTickets}</div></div>
              <div><span className="text-gray-500">In</span><div className="font-bold">{r.totalCheckedInTickets}</div></div>
            </div>
            <div className="mt-2 text-xs space-x-2">
              <Link to={`/events/${r.id}`} className="text-primary">View</Link>
              {canManage && <Link to={`/events/${r.id}/sub-events/new`} className="text-emerald-600">+Sub-Event</Link>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center text-gray-500 py-8">No {tab.toLowerCase()} events</div>}
      </div>
    </div>
  );
}
