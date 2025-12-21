import React from 'react';

const DashboardLayout = ({ header, left, right }) => (
  <div style={{ padding: 32, background: '#fafbfc', minHeight: '100vh' }}>
    {header}
    <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
      <div style={{ flex: 1 }}>{left}</div>
      <div style={{ flex: 2 }}>{right}</div>
    </div>
  </div>
);

export default DashboardLayout; 