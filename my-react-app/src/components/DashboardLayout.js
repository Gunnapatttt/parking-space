import React from 'react';

const DashboardLayout = ({ header, left, right }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, padding: 32, background: '#fafbfc', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    {header}
    <div style={{ display: 'flex', gap: 32, marginTop: 24, flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>{left}</div>
      <div style={{ flex: 2, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>{right}</div>
    </div>
  </div>
);

export default DashboardLayout; 