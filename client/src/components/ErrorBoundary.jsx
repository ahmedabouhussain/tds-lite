import React from 'react';
export default class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return (
      <div className="p-8 max-w-xl mx-auto bg-red-50 border border-red-200 rounded mt-12">
        <h2 className="text-lg font-bold text-red-700">Something went wrong</h2>
        <pre className="text-xs mt-2 text-red-900">{String(this.state.err)}</pre>
        <button onClick={() => location.reload()} className="mt-3 bg-primary text-white px-4 py-2 rounded">Reload</button>
      </div>
    );
    return this.props.children;
  }
}
