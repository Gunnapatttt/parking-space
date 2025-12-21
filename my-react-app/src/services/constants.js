// API Configuration Constants
// Centralized base URL from environment variable
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://parking-space-availability-production.up.railway.app';

// API Endpoints
export const ENDPOINTS = {
  SPACE_AVAILABILITY: '/api/carCount', // Updated to match backend
  AVERAGE_DURATION: '/api/parking-avg', // Same endpoint, different params
  PEAK_HOURS: '/api/peakTime', // Updated to match backend
  UPDATE_LOG: '/api/updateLog'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to server',
  API_ERROR: 'Server error occurred',
  DATA_ERROR: 'Invalid data received'
};
