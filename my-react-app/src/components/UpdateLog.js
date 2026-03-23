import React, { useState, useEffect, useRef } from 'react';
import { getUpdateLog, getCarImages, getFilteredRecords, getRecordsByPlate } from '../services/dashboardApi';

// Modal that shows all records with infinite scroll (loads 10 older entries as user scrolls)
const AllLogsModal = ({ onClose, onViewImage }) => {
  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  const PAGE = 20;

  const pad = n => String(n).padStart(2, '0');
  const toTs = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const loadMore = async (beforeTs) => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const end = beforeTs ? new Date(beforeTs.replace(' ', 'T')) : new Date();
      if (beforeTs) end.setSeconds(end.getSeconds() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 90);
      const data = await getFilteredRecords({ start: toTs(start), end: toTs(end) });
      const sorted = [...data].sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
      const page = sorted.slice(0, PAGE);
      setEntries(prev => beforeTs ? [...prev, ...page] : page);
      const newCursor = page.length > 0 ? page[page.length - 1].rawTimestamp : null;
      const newHasMore = sorted.length > PAGE;
      cursorRef.current = newCursor;
      hasMoreRef.current = newHasMore;
      setCursor(newCursor);
      setHasMore(newHasMore);
    } catch (e) {
      // silent fail
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => { loadMore(null); }, []);

  // IntersectionObserver watches the sentinel div at the bottom of the list
  // Fires whenever the sentinel becomes visible — triggers next page load
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore(cursorRef.current);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 820, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>All Records</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1, boxShadow: '0 1px 0 #e5e7eb' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Action</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Plate Number</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600 }}>Image</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px' }}>{row.timestamp}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, minWidth: 52, textAlign: 'center',
                      background: ['entrance','entry'].includes((row.action || '').toLowerCase()) ? '#dcfce7' : '#fee2e2',
                      color: ['entrance','entry'].includes((row.action || '').toLowerCase()) ? '#16a34a' : '#dc2626'
                    }}>{row.action || '—'}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{row.plate}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onViewImage({ plate: row.plate, rawTimestamp: row.rawTimestamp })}
                      style={{ padding: '4px 12px', fontSize: 13, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb', color: '#374151' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Sentinel — observed by IntersectionObserver to trigger next load */}
          <div ref={sentinelRef} style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            {loadingMore ? 'Loading more...' : !hasMore ? (entries.length === 0 ? 'No records found' : 'All records loaded') : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal that shows all filter results in an infinite-scroll list
const FilterResultsModal = ({ results, onClose, onViewImage }) => {
  const PAGE = 20;
  const [visible, setVisible] = useState(results.slice(0, PAGE));
  const [hasMore, setHasMore] = useState(results.length > PAGE);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const visibleRef = useRef(visible);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const loadMore = () => {
      const current = visibleRef.current;
      if (current.length >= results.length) { setHasMore(false); return; }
      const next = results.slice(0, current.length + PAGE);
      setVisible(next);
      if (next.length >= results.length) setHasMore(false);
    };
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observerRef.current.observe(sentinel);
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [results]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '90%', maxWidth: 800,
        height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', flexShrink: 0
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            Filter Results — {results.length} record{results.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              color: '#6b7280', lineHeight: 1, padding: '0 4px'
            }}
          >×</button>
        </div>
        {/* Scrollable table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px 0' }}>
          {results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No results found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Plate</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Image</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: '8px 14px', color: '#374151' }}>{row.timestamp || '—'}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: '#111' }}>{row.plate || '—'}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, minWidth: 52, textAlign: 'center',
                        background: ['entrance','entry'].includes((row.action || '').toLowerCase()) ? '#dcfce7' : '#fee2e2',
                        color: ['entrance','entry'].includes((row.action || '').toLowerCase()) ? '#16a34a' : '#dc2626'
                      }}>
                        {row.action || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <button
                        onClick={() => onViewImage({ plate: row.plate, rawTimestamp: row.rawTimestamp })}
                        style={{ padding: '3px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 5, background: '#f9fafb', color: '#374151' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div ref={sentinelRef} style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            {hasMore ? 'Loading more...' : (results.length > 0 ? 'All results loaded' : '')}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal that fetches and displays car + license plate images for a log entry
const ImageModal = ({ plate, rawTimestamp, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [carSrc, setCarSrc] = useState(null);
  const [lpSrc, setLpSrc] = useState(null);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(null); // { src, isLp }

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
            src={fullscreen.src}
            alt="Fullscreen"
            style={{
              width: fullscreen.isLp ? '50vw' : '95vw',
              height: fullscreen.isLp ? '50vh' : '95vh',
              objectFit: 'contain', borderRadius: 4
            }}
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
          zIndex: 1400
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
                      onClick={() => setFullscreen({ src: carSrc, isLp: false })}
                    />
                    <button
                      onClick={() => setFullscreen({ src: carSrc, isLp: false })}
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
                  <div style={{ position: 'relative', display: 'inline-block', width: 320 }}>
                    <img
                      src={lpSrc}
                      alt="License Plate"
                      style={{
                        maxWidth: 320, width: '100%', minWidth: 280,
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        cursor: 'zoom-in', display: 'block',
                        imageRendering: 'auto'
                      }}
                      onClick={() => setFullscreen({ src: lpSrc, isLp: true })}
                    />
                    <button
                      onClick={() => setFullscreen({ src: lpSrc, isLp: true })}
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
  const [modal, setModal] = useState(null);
  const [status, setStatus] = useState('connecting');

  // Returns "YYYY-MM-DD" for today
  const todayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Filter state — default: today 00:00 → 23:59
  const [filterStartDate, setFilterStartDate] = useState(() => todayStr());
  const [filterStartHour, setFilterStartHour] = useState('00');
  const [filterStartMin,  setFilterStartMin]  = useState('00');
  const [filterEndDate,   setFilterEndDate]   = useState(() => todayStr());
  const [filterEndHour,   setFilterEndHour]   = useState('23');
  const [filterEndMin,    setFilterEndMin]    = useState('59');
  const [filterPlate, setFilterPlate] = useState('');
  const [filterMode, setFilterMode] = useState('datetime'); // 'datetime' | 'plate'
  const [isFiltered, setIsFiltered] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [showFilterResults, setShowFilterResults] = useState(false);
  const [filterResults, setFilterResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Combine date + hour + minute into "YYYY-MM-DD HH:mm:ss"
  const toApiDateTime = (date, h, m) => date ? `${date} ${h}:${m}:00` : '';

  const pad = n => String(n).padStart(2, '0');
  const toTs = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  // Fetch the most recent PAGE_SIZE entries (used on initial load + auto-refresh)
  const fetchLatest = async () => {
    try {
      setError(null);
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const data = await getFilteredRecords({
        start: toTs(start),
        end:   toTs(now),
      });
      const sorted = [...data].sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
      setLogData(sorted.slice(0, PAGE_SIZE));
      setStatus('live');
    } catch (err) {
      console.error('Error fetching update log:', err);
      setError('Failed to load update log');
      setStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = async () => {
    const trimmedPlate = filterPlate.trim();
    if (filterMode === 'plate' && !trimmedPlate) return;
    if (filterMode === 'datetime' && !filterStartDate && !filterEndDate) return;
    setShowFilterModal(false);
    try {
      setLoading(true);
      setError(null);
      const data = filterMode === 'plate'
        ? await getRecordsByPlate(trimmedPlate)
        : await getFilteredRecords({
            start: toApiDateTime(filterStartDate, filterStartHour, filterStartMin),
            end:   toApiDateTime(filterEndDate,   filterEndHour,   filterEndMin),
          });
      const sorted = [...data].sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
      setFilterResults(sorted);
      setShowFilterResults(true);
      setIsFiltered(true);
    } catch (err) {
      setError('Filter failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setFilterStartDate(todayStr());
    setFilterStartHour('00');
    setFilterStartMin('00');
    setFilterEndDate(todayStr());
    setFilterEndHour('23');
    setFilterEndMin('59');
    setFilterPlate('');
    setFilterMode('datetime');
    setIsFiltered(false);
    setFilterResults([]);
    setShowFilterResults(false);
  };

  // Initial load
  useEffect(() => {
    fetchLatest();
  }, []);

  // Auto-refresh every 10s — paused while a filter is active
  useEffect(() => {
    if (isFiltered) return;
    const interval = setInterval(fetchLatest, 10000);
    return () => clearInterval(interval);
  }, [isFiltered]);

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
      {showAllModal && (
        <AllLogsModal
          onClose={() => setShowAllModal(false)}
          onViewImage={(m) => setModal(m)}
        />
      )}
      {showFilterResults && (
        <FilterResultsModal
          results={filterResults}
          onClose={() => { setShowFilterResults(false); clearFilter(); }}
          onViewImage={(m) => setModal(m)}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1500
          }}
          onClick={() => setShowFilterModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 28,
              width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: 17 }}>Filter Records</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}
              >
                ✕
              </button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 18 }}>
              {[['datetime', 'Date & Time'], ['plate', 'Plate Search']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: filterMode === mode ? '#2563eb' : '#6b7280',
                    borderBottom: filterMode === mode ? '2px solid #2563eb' : '2px solid transparent',
                    marginBottom: -2,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {filterMode === 'datetime' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>START DATE / TIME</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={e => setFilterStartDate(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7, boxSizing: 'border-box' }}
                    />
                    <select value={filterStartHour} onChange={e => setFilterStartHour(e.target.value)}
                      style={{ padding: '7px 6px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7 }}>
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ fontWeight: 600 }}>:</span>
                    <select value={filterStartMin} onChange={e => setFilterStartMin(e.target.value)}
                      style={{ padding: '7px 6px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7 }}>
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>END DATE / TIME</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={e => setFilterEndDate(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7, boxSizing: 'border-box' }}
                    />
                    <select value={filterEndHour} onChange={e => setFilterEndHour(e.target.value)}
                      style={{ padding: '7px 6px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7 }}>
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ fontWeight: 600 }}>:</span>
                    <select value={filterEndMin} onChange={e => setFilterEndMin(e.target.value)}
                      style={{ padding: '7px 6px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7 }}>
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>PLATE NUMBER</label>
                <input
                  type="text"
                  placeholder="e.g. กข1234"
                  value={filterPlate}
                  onChange={e => setFilterPlate(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilter()}
                  style={{ padding: '7px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 7, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button
                onClick={applyFilter}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 600,
                  border: 'none', borderRadius: 7, background: '#2563eb', color: '#fff', cursor: 'pointer'
                }}
              >
                Search
              </button>
              {isFiltered && (
                <button
                  onClick={() => { setShowFilterModal(false); clearFilter(); }}
                  style={{
                    padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                    border: '1px solid #d1d5db', borderRadius: 7, background: '#fff', color: '#374151'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontWeight: 500, fontSize: 20 }}>
          Update Log
          {loading && (
            <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>Refreshing...</span>
          )}
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowFilterModal(true)}
            style={{
              padding: '5px 14px', fontSize: 13, cursor: 'pointer',
              border: '1px solid #d1d5db', borderRadius: 6,
              background: '#f9fafb', color: '#374151',
              display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            ⚙ Filter
          </button>
        </div>
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
            <th style={{ textAlign: 'center', padding: 8, fontWeight: 600 }}>Image</th>
          </tr>
        </thead>
        <tbody>
          {logData.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                No Data Available
              </td>
            </tr>
          ) : (
            logData.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8 }}>{row.timestamp}</td>
                <td style={{ padding: 8 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, minWidth: 52, textAlign: 'center',
                    background: ['entrance','entry'].includes((row.action || '').toLowerCase()) ? '#dcfce7' : '#fee2e2',
                    color: ['entrance','entry'].includes((row.action || '').toLowerCase()) ? '#16a34a' : '#dc2626'
                  }}>{row.action || '—'}</span>
                </td>
                <td style={{ padding: 8 }}>{row.plate}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>
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

      {/* See All button */}
      <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 4 }}>
        <button
          onClick={() => setShowAllModal(true)}
          style={{ padding: '6px 20px', fontSize: 13, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb', color: '#374151' }}
        >
          See All
        </button>
      </div>
    </div>
  );
};

export default UpdateLog; 
