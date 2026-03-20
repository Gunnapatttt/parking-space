import React, { useState, useEffect, useCallback } from 'react';
import { getSpaceAvailability, getAverageDuration, getPeakHours } from '../services/dashboardApi';

// Constants for refresh intervals
const REFRESH_INTERVALS = {
  SPACE_AVAILABILITY: 10000,    // 10 seconds
  AVERAGE_DURATION: 600000,     // 10 minutes  
  PEAK_HOURS: 1800000          // 30 minutes
};

// Default values for offline detection (clearly fake values that never match real data)
const DEFAULT_VALUES = {
  'Car Parking': 'OFFLINE',
  'Average Parking Duration': 'OFFLINE',
  'Peak Hours': 'OFFLINE'
};

const DashboardSummary = () => {
  const [summaryData, setSummaryData] = useState([
    { label: 'Car Parking', value: 'Loading...', isDefault: false },
    { label: 'Average Parking Duration', value: 'Loading...', isDefault: false },
    { label: 'Peak Hours', value: 'Loading...', isDefault: false },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Helper function to update specific metric data
  const updateMetricData = useCallback((label, value, isDefault = false) => {
    setSummaryData(prev => prev.map(item => 
      item.label === label 
        ? { ...item, value: isDefault ? 'Offline' : value, isDefault }
        : item
    ));
  }, []);

  // Generic fetch function with error handling
  const fetchMetric = useCallback(async (label, fetchFunction) => {
    try {
      const data = await fetchFunction();
      const isDefault = data === DEFAULT_VALUES[label];
      updateMetricData(label, data, isDefault);
      
      // Update connection status based on car parking (most frequent)
      if (label === 'Car Parking') {
        setConnectionStatus(isDefault ? 'failed' : 'connected');
        setError(isDefault ? 'API connection failed' : null);
      }
    } catch (err) {
      console.error(`Error fetching ${label}:`, err);
      updateMetricData(label, 'Offline', true);
      
      if (label === 'Car Parking') {
        setConnectionStatus('failed');
        setError(`Failed to load ${label.toLowerCase()}`);
      }
    }
  }, [updateMetricData]);

  // Individual fetch functions
  const fetchSpaceAvailability = useCallback(() => 
    fetchMetric('Car Parking', getSpaceAvailability), [fetchMetric]);
  
  const fetchAverageDuration = useCallback(() => 
    fetchMetric('Average Parking Duration', getAverageDuration), [fetchMetric]);
  
  const fetchPeakHours = useCallback(() => 
    fetchMetric('Peak Hours', getPeakHours), [fetchMetric]);

  useEffect(() => {
    // Initial data fetch
    const initialFetch = async () => {
      setIsLoading(true);
      setConnectionStatus('connecting');
      
      await Promise.all([
        fetchSpaceAvailability(),
        fetchAverageDuration(), 
        fetchPeakHours()
      ]);
      
      setIsLoading(false);
    };

    initialFetch();

    // Set up intervals with different frequencies
    const intervals = [
      setInterval(fetchSpaceAvailability, REFRESH_INTERVALS.SPACE_AVAILABILITY),
      setInterval(fetchAverageDuration, REFRESH_INTERVALS.AVERAGE_DURATION),
      setInterval(fetchPeakHours, REFRESH_INTERVALS.PEAK_HOURS)
    ];

    // Cleanup function
    return () => intervals.forEach(clearInterval);
  }, [fetchSpaceAvailability, fetchAverageDuration, fetchPeakHours]);

  // Connection status styles
  const getStatusColor = (status) => {
    const colors = {
      connected: '#4CAF50',
      failed: '#f44336', 
      connecting: '#FF9800'
    };
    return colors[status] || colors.connecting;
  };

  const getStatusText = (status) => {
    const texts = {
      connected: 'Connected',
      failed: 'API Disconnected',
      connecting: 'Connecting...'
    };
    return texts[status] || texts.connecting;
  };

  // Card styles
  const getCardStyles = (item) => ({
    background: '#fff',
    borderRadius: 12,
    padding: '10px 32px',
    minWidth: 180,
    boxShadow: '0 2px 8px #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '120px',
    opacity: isLoading ? 0.7 : 1,
    transition: 'opacity 0.3s ease',
    border: item.isDefault ? '2px solid #f44336' : 'none'
  });

  const getValueColor = (item) => {
    if (item.isDefault || item.value === 'Offline') return '#f44336';
    if (item.value === 'Loading...') return '#999';
    return '#000';
  };

  return (
    <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
      {/* Connection Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: getStatusColor(connectionStatus)
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(connectionStatus)
        }} />
        {getStatusText(connectionStatus)}
      </div>
      
      {/* Dashboard Cards */}
      {summaryData.map((item) => (
        <div key={item.label} style={getCardStyles(item)}>
          <div style={{ 
            color: '#888', 
            fontSize: 16, 
            marginBottom: 8, 
            textAlign: 'center' 
          }}>
            {item.label}
          </div>
          <div style={{ 
            fontWeight: 700, 
            fontSize: 24,
            color: getValueColor(item),
            textAlign: 'center'
          }}>
            {item.value}
          </div>
          {isLoading && item.value === 'Loading...' && (
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid #f3f3f3', 
              borderTop: '2px solid #3498db', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginTop: '8px'
            }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardSummary; 