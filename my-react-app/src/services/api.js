import { API_BASE_URL, ERROR_MESSAGES } from './constants';

/**
 * Base API request function with ngrok header support
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Additional fetch options
 * @returns {Promise} - API response
 */
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    // Try to parse as JSON, fallback to text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API Request Error:', error);
    
    // Handle different types of errors
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else if (error.message.includes('API Error')) {
      throw new Error(ERROR_MESSAGES.API_ERROR);
    } else {
      throw new Error(ERROR_MESSAGES.DATA_ERROR);
    }
  }
};

/**
 * Retry wrapper for API requests
 * @param {function} apiCall - API function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} - API response or error
 */
export const withRetry = async (apiCall, maxRetries = 2) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError;
};
