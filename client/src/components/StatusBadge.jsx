import React from 'react';
const COLORS = {
  Available: 'bg-gray-200 text-gray-700', Pending: 'bg-amber-100 text-amber-800',
  Approved: 'bg-green-100 text-green-800', 'Partially Approved': 'bg-green-50 text-green-700',
  Rejected: 'bg-red-100 text-red-700', Assigned: 'bg-blue-100 text-blue-800',
  Sent: 'bg-indigo-100 text-indigo-800', Collected: 'bg-teal-100 text-teal-800',
  'Checked-in': 'bg-emerald-100 text-emerald-800', Cancelled: 'bg-red-100 text-red-700',
  Draft: 'bg-gray-200 text-gray-700', 'Open for Requests': 'bg-blue-100 text-blue-800',
  'Approval Stage': 'bg-amber-100 text-amber-800', 'Ticket Allocation': 'bg-indigo-100 text-indigo-800',
  'Live Check-in': 'bg-emerald-100 text-emerald-800', Closed: 'bg-gray-300 text-gray-700',
  'Setup': 'bg-amber-50 text-amber-700', 'Archived': 'bg-gray-400 text-white',
  'Current': 'bg-emerald-100 text-emerald-800', 'Future': 'bg-blue-100 text-blue-800',
  'Ended': 'bg-gray-300 text-gray-700',
  'VVIP': 'bg-purple-100 text-purple-800', 'VIP': 'bg-indigo-100 text-indigo-800',
  'Federation': 'bg-cyan-100 text-cyan-800', 'Sponsor': 'bg-orange-100 text-orange-800',
  'Protocol': 'bg-pink-100 text-pink-800', 'Media': 'bg-teal-100 text-teal-800',
  'Partner': 'bg-yellow-100 text-yellow-800', 'Staff': 'bg-slate-100 text-slate-800',
  'Guest': 'bg-gray-100 text-gray-700'
};
export default function StatusBadge({ status }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}
