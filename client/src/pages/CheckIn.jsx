import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

export default function CheckIn() {
  const [masters, setMasters] = useState([]);
  const [masterId, setMasterId] = useState('');
  const [subs, setSubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();
  const scannerRef = useRef(null);
  const lastCodeRef = useRef({ code: '', time: 0 });
  const scannerDivId = 'tds-scanner';

  useEffect(() => { api.get('/master-events').then(r => setMasters(r.data)); }, []);
  useEffect(() => {
    if (masterId) api.get('/sub-events?masterEventId=' + masterId).then(r => setSubs(r.data));
    else setSubs([]);
    setEventId('');
  }, [masterId]);
  useEffect(() => { if (eventId) loadRecent(); }, [eventId]);
  useEffect(() => () => stopScanner(), []);
  useEffect(() => { stopScanner(); }, [eventId]);

  const loadRecent = () =>
    api.get('/checkins?eventId=' + eventId + '&limit=10').then(r => setRecent(r.data));

  const submitCode = async (code) => {
    if (!eventId || !code || busy) return;
    const now = Date.now();
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.time < 2000) return;
    lastCodeRef.current = { code, time: now };
    setBusy(true);
    try {
      const r = await api.post('/checkins/scan', { eventId, barcode: code, gateName: 'Main' });
      setResult({ ok: true, data: r.data });
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.error || 'Network error' });
    } finally { setBusy(false); }
    setBarcode('');
    inputRef.current?.focus();
    loadRecent();
  };

  const submitForm = (e) => { e.preventDefault(); submitCode(barcode.trim()); };

  const startScanner = async () => {
    if (!eventId) return;
    setScanning(true);
    await new Promise(r => setTimeout(r, 50));
    try {
      const html5 = new Html5Qrcode(scannerDivId, { verbose: false });
      scannerRef.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decoded) => submitCode(decoded.trim()),
        () => {}
      );
    } catch (e) {
      setScanning(false);
      scannerRef.current = null;
      setResult({ ok: false, msg: 'Camera unavailable: ' + (e.message || e) });
    }
  };

  const stopScanner = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try { if (s.isScanning) await s.stop(); } catch {}
      try { await s.clear(); } catch {}
    }
    setScanning(false);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Gate Check-in</h1>
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
          <form onSubmit={submitForm} className="mb-3 flex gap-2">
            <input ref={inputRef} autoFocus value={barcode} onChange={e => setBarcode(e.target.value)}
              placeholder="Scan with USB scanner or type barcode"
              className="border rounded px-3 py-3 text-lg flex-1" disabled={busy} />
            <button disabled={busy} className="bg-primary text-white px-6 rounded disabled:opacity-50">
              {busy ? '...' : 'Check-in'}
            </button>
          </form>
          <div className="mb-3">
            {!scanning ? (
              <button onClick={startScanner} className="bg-emerald-600 text-white px-4 py-2 rounded">
                📷 Use camera scanner
              </button>
            ) : (
              <button onClick={stopScanner} className="bg-red-600 text-white px-4 py-2 rounded">
                Stop camera
              </button>
            )}
          </div>
          {scanning && (
            <div className="mb-3 bg-black rounded overflow-hidden max-w-md">
              <div id={scannerDivId} style={{ width: '100%' }} />
            </div>
          )}
        </>
      )}

      {result && (
        <div className={`p-4 rounded border-2 mb-3 ${result.ok ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          {result.ok ? (
            <div>
              <div className="text-2xl font-bold text-green-700">✓ Valid</div>
              <div className="mt-2"><b>{result.data.guest.name}</b> — {result.data.guest.organization}</div>
              <div>Seat: {result.data.seat.block}-{result.data.seat.row}-{result.data.seat.seat}</div>
              <div className="text-xs text-gray-600">{new Date(result.data.time).toLocaleString()}</div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-red-700">✗ Failed</div>
              <div>{result.msg}</div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded">
        <h3 className="p-2 font-semibold border-b">Recent check-ins</h3>
        <table className="w-full text-sm">
          <tbody>
            {recent.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.fullName}</td>
                <td>{r.barcode}</td>
                <td>{r.block}-{r.row}-{r.seat}</td>
                <td className="text-xs text-gray-500">{new Date(r.scannedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
