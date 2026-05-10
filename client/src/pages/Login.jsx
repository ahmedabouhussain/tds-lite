import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const DEMO = [
  ['admin@tds.local','Admin'], ['manager@tds.local','Event Manager'],
  ['entry@tds.local','Guest Data Entry'], ['approver@tds.local','Approver'],
  ['tickets@tds.local','Ticket Officer'], ['gate@tds.local','Gate Scanner'],
  ['exec@tds.local','Executive Viewer']
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('Tds@2025');
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await login(email, password); nav('/'); }
    catch (e2) { setErr(e2.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border p-6">
        <h1 className="text-xl font-bold text-primary mb-1">TDS Lite</h1>
        <p className="text-sm text-gray-600 mb-4">نظام توزيع الدعوات والتذاكر</p>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="email@tds.local" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2" />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2" />
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-2 rounded disabled:opacity-50">
            {loading ? '...' : 'Login'}
          </button>
        </form>
        <div className="mt-5 text-xs bg-gray-50 border rounded p-3">
          <div className="font-semibold mb-1">Demo accounts (password: Tds@2025)</div>
          {DEMO.map(([e,r]) => (
            <button key={e} onClick={() => setEmail(e)} className="block hover:underline text-primary">{r}: {e}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
