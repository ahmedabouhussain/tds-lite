import React from 'react';
export default function AccessDenied() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
      <p>You don't have permission for this page.</p>
    </div>
  );
}
