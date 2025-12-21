import React, { useState, useEffect } from 'react';
import { getUpdateLog } from '../services/dashboardApi';

const UpdateLog = () => {
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch log data from API
  const fetchLogData = async () => {
    try {
      setError(null);
      const data = await getUpdateLog();
      setLogData(data);
    } catch (err) {
      console.error('Error fetching update log:', err);
      setError('Failed to load update log');
      // Keep previous data if available
    } finally {
      setLoading(false);
    }
  };

  // Initial load and setup refresh interval
  useEffect(() => {
    fetchLogData();
    
    // Set up 30-second refresh interval
    const interval = setInterval(fetchLogData, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading && logData.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #e5e7eb' }}>
        <h3 style={{ margin: 0, fontWeight: 500, fontSize: 20, marginBottom: 12 }}>Update Log</h3>
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
          Loading update log...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontWeight: 500, fontSize: 20 }}>
          Update Log
          {loading && (
            <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
              Refreshing...
            </span>
          )}
        </h3>
        <select style={{ borderRadius: 6, padding: '4px 12px', fontSize: 15 }}>
          <option>Timeframe: Live</option>
          <option>Today</option>
          <option>This Week</option>
        </select>
      </div>
      
      {error && (
        <div style={{ 
          background: '#fee', 
          color: '#c53030', 
          padding: 8, 
          borderRadius: 4, 
          marginBottom: 12,
          fontSize: 14
        }}>
          {error}
        </div>
      )}
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: 8, fontWeight: 600 }}>Timestamp</th>
            <th style={{ textAlign: 'left', padding: 8, fontWeight: 600 }}>Action</th>
            <th style={{ textAlign: 'left', padding: 8, fontWeight: 600 }}>Plate Number</th>
            <th style={{ textAlign: 'left', padding: 8, fontWeight: 600 }}>Image Fetch</th>
          </tr>
        </thead>
        <tbody>
          {logData.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                No update log data available
              </td>
            </tr>
          ) : (
            logData.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8 }}>{row.timestamp}</td>
                <td style={{ padding: 8 }}>{row.action}</td>
                <td style={{ padding: 8 }}>{row.plate}</td>
                <td style={{ padding: 8, color: '#999', fontStyle: 'italic' }}>No image</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ textAlign: 'right' }}>
        <a href="#" style={{ color: '#1976d2', fontWeight: 500, textDecoration: 'none' }}>View full log &rarr;</a>
      </div>
    </div>
  );
};

export default UpdateLog; 