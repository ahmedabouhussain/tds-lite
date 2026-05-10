import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Delivery() {
  const [masters, setMasters] = useState([]);
  const [masterId, setMasterId] = useState('');
  const [subs, setSubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => { api.get('/master-events').then(r => setMasters(r.data)); }, []);
  useEffect(() => {
    if (masterId) api.get('/sub-events?masterEventId=' + masterId).then(r => setSubs(r.data));
    else setSubs([]);
    setEventId('');
  }, [masterId]);
  const load = () => eventId && api.get('/assignments?eventId=' + eventId).then(r => setRows(r.data));
  useEffect(() => { load(); }, [eventId]);

  const mark = async (a, method) => {
    await api.post(`/assignments/${a.id}/deliver`, { method }); load();
  };
  const downloadPdf = (a) => {
    const token = localStorage.getItem('tds_token');
    fetch(`/api/assignments/${a.id}/pdf`, { headers: { Authorization:`Bearer ${token}` } })
      .then(r => r.blob()).then(b => {
        const url = URL.createObjectURL(b);
        const link = document.createElement('a'); link.href = url; link.download = `ticket-${a.ticketCode}.pdf`; link.click();
      });
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Delivery</h1>
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
      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2 text-start">Guest</th><th>Code</th><th>Seat</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.fullName}</td>
                <td className="text-center">{a.ticketCode}</td>
                <td className="text-center">{a.block}-{a.row}-{a.seat}</td>
                <td className="text-center space-x-1">
                  <button onClick={()=>mark(a,'sent')} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">Mark Sent</button>
                  <button onClick={()=>mark(a,'collected')} className="bg-teal-600 text-white px-2 py-1 rounded text-xs">Collected</button>
                  <button onClick={()=>downloadPdf(a)} className="bg-gray-700 text-white px-2 py-1 rounded text-xs">PDF</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-gray-500">No assigned tickets</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
