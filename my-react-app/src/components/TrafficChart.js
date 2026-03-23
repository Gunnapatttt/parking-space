import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { getPeakHoursRaw } from '../services/dashboardApi';

const TrafficChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const raw = await getPeakHoursRaw();
      setData(raw);
      setError(null);
    } catch (err) {
      setError('Failed to load traffic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000); // refresh every 10 min
    return () => clearInterval(interval);
  }, []);

  // Find peak hour for annotation
  const peak = data.reduce((best, d) => (d.count > (best?.count ?? -1) ? d : best), null);

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 2px 8px #e5e7eb', marginBottom: 20
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontWeight: 500, fontSize: 20 }}>Peak Hours - Hourly Traffic</h3>
        {peak && peak.count > 0 && (
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Peak: <strong style={{ color: '#2563eb' }}>{peak.hour}</strong> ({peak.count} cars)
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Loading...
        </div>
      ) : error ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={h => h.replace(':00', '')}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              allowDecimals={false}
              width={28}
              domain={[0, 50]}
            />
            <ReferenceLine
              y={45}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: '45', position: 'insideTopRight', fontSize: 11, fill: '#ef4444', dy: -4 }}
            />
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(value) => [`${value} cars`, 'Traffic']}
              labelFormatter={(label) => `Hour: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#2563eb' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TrafficChart;
