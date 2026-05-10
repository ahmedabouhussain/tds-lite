import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Tickets() {
  const [masters, setMasters] = useState([]);
  const [masterId, setMasterId] = useState('');
  const [subs, setSubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('manual');
  const [m, setM] = useState({ ticketCode:'', barcode:'', block:'', row:'', seat:'', category:'Standard' });
  const [file, setFile] = useState(null); const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/master-events').then(r => setMasters(r.data)); }, []);
  useEffect(() => {
    if (masterId) api.get('/sub-events?masterEventId=' + masterId).then(r => setSubs(r.data));
    else setSubs([]);
    setEventId('');
  }, [masterId]);
  useEffect(() => { if (eventId) api.get('/tickets?eventId=' + eventId).then(r => setTickets(r.data)); }, [eventId]);

  const submitManual = async () => {
    setErr('');
    try {
      await api.post('/tickets', { ...m, eventId });
      setM({ ticketCode:'', barcode:'', block:'', row:'', seat:'', category:'Standard' });
      api.get('/tickets?eventId=' + eventId).then(r => setTickets(r.data));
    } catch (e) { setErr(e.response?.data?.error); }
  };
  const submitCsv = async () => {
    if (!file || !eventId) return;
    const fd = new FormData(); fd.append('file', file); fd.append('eventId', eventId);
    setErr('');
    try {
      const r = await api.post('/tickets/upload-csv', fd, { headers: { 'Content-Type':'multipart/form-data' } });
      setResult(r.data);
      api.get('/tickets?eventId=' + eventId).then(r => setTickets(r.data));
    } catch (e) { setErr(e.response?.data?.error); }
  };
  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Tickets</h1>
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
      {eventId && (
        <>
          <div className="flex gap-2 mb-2">
            <button onClick={()=>setTab('manual')} className={`px-3 py-1 rounded ${tab==='manual'?'bg-primary text-white':'border'}`}>Manual</button>
            <button onClick={()=>setTab('csv')} className={`px-3 py-1 rounded ${tab==='csv'?'bg-primary text-white':'border'}`}>CSV Upload</button>
          </div>
          {tab === 'manual' && (
            <div className="bg-white border rounded p-3 space-y-2 mb-3">
              {['ticketCode','barcode','block','row','seat','category'].map(k => (
                <input key={k} placeholder={k} value={m[k]} onChange={e=>setM({...m,[k]:e.target.value})} className="border rounded px-3 py-2 w-full" />
              ))}
              <button onClick={submitManual} className="bg-primary text-white px-4 py-2 rounded">Add ticket</button>
              {err && <div className="text-red-600 text-sm">{err}</div>}
            </div>
          )}
          {tab === 'csv' && (
            <div className="bg-white border rounded p-3 mb-3">
              <p className="text-xs text-gray-600 mb-2">Required columns: ticketCode, barcode, block, row, seat, category</p>
              <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} />
              <button onClick={submitCsv} disabled={!file} className="bg-primary text-white px-4 py-2 rounded ml-2 disabled:opacity-50">Upload</button>
              {result && <div className="mt-2 text-sm">
                <div className="text-green-700">Imported: {result.imported}</div>
                <div className="text-red-700">Skipped: {result.skipped}</div>
                {result.errors?.length > 0 && <ul className="text-xs mt-1">{result.errors.slice(0,10).map((e,i)=><li key={i}>Line {e.line}: {e.error}</li>)}</ul>}
              </div>}
              {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
            </div>
          )}
          <div className="bg-white border rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100"><tr><th>Code</th><th>Barcode</th><th>Block</th><th>Row</th><th>Seat</th><th>Status</th><th>Guest</th></tr></thead>
              <tbody>
                {tickets.slice(0,200).map(t => (
                  <tr key={t.id} className="border-t text-center">
                    <td>{t.ticketCode}</td><td>{t.barcode}</td><td>{t.block}</td><td>{t.row}</td><td>{t.seat}</td>
                    <td>{t.status}</td><td>{t.assignedGuest || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
