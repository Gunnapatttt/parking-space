import React, { useState, useEffect } from 'react';

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e5e7eb', paddingBottom: 12 }}>
      <h1 style={{ fontWeight: 700, fontSize: 32, margin: 0 }}>Parking Space Report</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <span style={{ fontSize: 18, color: '#555' }}>{formattedTime}</span>
        <span style={{ fontWeight: 700, fontSize: 28 }}>HM-building</span>
      </div>
    </div>
  );
};

export default Header; 