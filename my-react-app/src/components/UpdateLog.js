import React, { useState, useEffect } from 'react';
import { getUpdateLog, getCarImages } from '../services/dashboardApi';

// Modal that fetches and displays car + license plate images for a log entry
const ImageModal = ({ plate, rawTimestamp, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [carSrc, setCarSrc] = useState(null);
  const [lpSrc, setLpSrc] = useState(null);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(null); // src string when fullscreen is open

  useEffect(() => {
    let cancelled = false;
    getCarImages(plate, rawTimestamp)
      .then(({ carSrc, lpSrc }) => {
        if (!cancelled) {
          setCarSrc(carSrc);
          setLpSrc(lpSrc);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Failed to load images');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [plate, rawTimestamp]);

  return (
    <>
      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, cursor: 'zoom-out'
          }}
          onClick={() => setFullscreen(null)}
        >
          <img
            src={fullscreen}
            alt="Fullscreen"
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 4 }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setFullscreen(null)}
            style={{
              position: 'absolute', top: 16, right: 20,
              background: 'none', border: 'none', fontSize: 32,
              cursor: 'pointer', color: '#fff', lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#fff', borderRadius: 12, padding: 24,
            maxWidth: 720, width: '90%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>Images — {plate}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', fontSize: 22,
                cursor: 'pointer', color: '#666', lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
              Loading images...
            </div>
          )}

          {error && (
            <div style={{
              color: '#c53030', padding: 12,
              background: '#fff5f5', border: '1px solid #fed7d7',
              borderRadius: 6, fontSize: 14
            }}>
              {error}
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {carSrc && (
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Car Image</p>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={carSrc}
                      alt="Car"
                      style={{
                        maxWidth: 320, width: '100%',
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        cursor: 'zoom-in', display: 'block'
                      }}
                      onClick={() => setFullscreen(carSrc)}
                    />
                    <button
                      onClick={() => setFullscreen(carSrc)}
                      title="Fullscreen"
                      style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.55)', border: 'none',
                        borderRadius: 6, color: '#fff', fontSize: 16,
                        cursor: 'pointer', padding: '3px 7px', lineHeight: 1
                      }}
                    >
                      ⛶
                    </button>
                  </div>
                </div>
              )}
              {lpSrc && (
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>License Plate</p>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={lpSrc}
                      alt="License Plate"
                      style={{
                        maxWidth: 320, width: '100%',
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        cursor: 'zoom-in', display: 'block'
                      }}
                      onClick={() => setFullscreen(lpSrc)}
                    />
                    <button
                      onClick={() => setFullscreen(lpSrc)}
                      title="Fullscreen"
                      style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.55)', border: 'none',
                        borderRadius: 6, color: '#fff', fontSize: 16,
                        cursor: 'pointer', padding: '3px 7px', lineHeight: 1
                      }}
                    >
                      ⛶
                    </button>
                  </div>
                </div>
              )}
              {!carSrc && !lpSrc && (
                <p style={{ color: '#666', fontSize: 14 }}>No images available for this entry.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const UpdateLog = () => {
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { plate, rawTimestamp }
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'live' | 'offline'

  // Fetch log data from API
  const fetchLogData = async () => {
    try {
      setError(null);
      const data = await getUpdateLog();
      setLogData(data);
      setStatus('live');
    } catch (err) {
      console.error('Error fetching update log:', err);
      setError('Failed to load update log');
      setStatus('offline');
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
      {modal && (
        <ImageModal
          plate={modal.plate}
          rawTimestamp={modal.rawTimestamp}
          onClose={() => setModal(null)}
        />
      )}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontWeight: 500, fontSize: 20 }}>
          Update Log
          {loading && (
            <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
              Refreshing...
            </span>
          )}
        </h3>
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
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => setModal({ plate: row.plate, rawTimestamp: row.rawTimestamp })}
                    style={{
                      padding: '4px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      background: '#f9fafb',
                      color: '#374151'
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UpdateLog; 