import { apiRequest, withRetry } from './api';
import { ENDPOINTS } from './constants';

// Default values for fallback when API fails (clearly fake values)
const DEFAULT_VALUES = {
  SPACE_AVAILABILITY: 'OFFLINE',
  AVERAGE_DURATION: 'OFFLINE',
  PEAK_HOURS: 'OFFLINE'
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Current date
 */
const getCurrentDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
  const year = today.getFullYear();
  return `${year}-${month}-${day}`; // Returns YYYY-MM-DD
};

/**
 * Get date range for current year in YYYY-MM-DD format
 * @returns {object} - Start and end dates for current year
 */
const getCurrentYearRange = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  return {
    startDate: `${currentYear}-01-01`, // YYYY-MM-DD format
    endDate: `${currentYear}-12-31`    // YYYY-MM-DD format
  };
};

/**
 * Fetch space availability data for today
 * @returns {Promise<string>} - Space availability (e.g., "12/50")
 */
export const getSpaceAvailability = async () => {
  try {
    const currentDate = getCurrentDate();
    const endpoint = `${ENDPOINTS.SPACE_AVAILABILITY}?targetCarCountDate=${currentDate}`;
    const data = await withRetry(() => apiRequest(endpoint));
    
    // Debug: Log the actual response to understand the format
    console.log('=== SPACE AVAILABILITY RAW DATA ===');
    console.log('Type:', typeof data);
    console.log('Raw Response:', data);
    console.log('JSON String:', JSON.stringify(data, null, 2));
    console.log('=====================================');
    
    // Handle the actual API response format
    if (typeof data === 'object' && data !== null) {
      // Backend returns: {"status":"success","car_count":0,"avg_s..."}
      if (data.status === 'success' && data.car_count !== undefined) {
        // Show occupied spaces / total spaces (not available/total)
        const totalSpaces = 45;
        const occupiedSpaces = data.car_count;
        return `${occupiedSpaces}/${totalSpaces}`;
      } else if (data.available !== undefined && data.total !== undefined) {
        return `${data.available}/${data.total}`;
      } else if (data.count !== undefined) {
        return `${data.count}/45`;
      } else if (data.carCount !== undefined) {
        return `${data.carCount}/45`;
      } else {
        // Return the car_count if available
        return data.car_count !== undefined ? `${data.car_count}/45` : JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(data);
        if (parsed.status === 'success' && parsed.car_count !== undefined) {
          const totalSpaces = 45;
          const occupiedSpaces = parsed.car_count;
          return `${occupiedSpaces}/${totalSpaces}`;
        }
        return data;
      } catch {
        return data;
      }
    } else if (typeof data === 'number') {
      return `${data}/45`;
    }
    
    // If we can't parse it, return the raw data as string
    return String(data);
  } catch (error) {
    console.error('Error fetching space availability:', error);
    return DEFAULT_VALUES.SPACE_AVAILABILITY;
  }
};

/**
 * Format seconds into "X hr Y min" string
 */
const formatSeconds = (seconds) => {
  if (seconds === null || seconds === undefined) return 'No data';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
};

/**
 * Fetch average parking duration — returns today's and last week same day's average
 * @returns {Promise<{today: string, lastWeek: string}>}
 */
export const getAverageDuration = async () => {
  const offline = { today: DEFAULT_VALUES.AVERAGE_DURATION, lastWeek: DEFAULT_VALUES.AVERAGE_DURATION };
  try {
    const { startDate, endDate } = getCurrentYearRange();
    const endpoint = `${ENDPOINTS.AVERAGE_DURATION}?startDate=${startDate}&endDate=${endDate}`;
    const data = await withRetry(() => apiRequest(endpoint));

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (parsed && parsed.status === 'success') {
      return {
        today: formatSeconds(parsed.today?.avg_seconds),
        lastWeek: formatSeconds(parsed.last_week_same_day?.avg_seconds),
      };
    }
    return offline;
  } catch (error) {
    console.error('Error fetching average duration:', error);
    return offline;
  }
};

/**
 * Fetch peak hours data
 * @returns {Promise<string>} - Peak hours (e.g., "9:32 AM - 11:14 AM")
 */
/**
 * Fetch raw hourly counts for charting
 * @returns {Promise<Array>} - Array of { hour, count } for all 24 hours
 */
export const getPeakHoursRaw = async () => {
  const currentDate = getCurrentDate();
  const endpoint = `${ENDPOINTS.PEAK_HOURS}?peakTimeTargetDate=${currentDate}`;
  const data = await withRetry(() => apiRequest(endpoint));
  const raw = (typeof data === 'object' ? data : JSON.parse(data));
  if (raw.status === 'success' && Array.isArray(raw.hourly_counts)) {
    // Ensure all 24 hours are present, fill missing with 0
    const map = {};
    raw.hourly_counts.forEach(item => { map[item.hour] = item.count; });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      count: map[h] || 0,
    }));
  }
  return [];
};

export const getPeakHours = async () => {
  try {
    const currentDate = getCurrentDate();
    const endpoint = `${ENDPOINTS.PEAK_HOURS}?peakTimeTargetDate=${currentDate}`;
    const data = await withRetry(() => apiRequest(endpoint));
    
    // Debug: Log the actual response to understand the format
    console.log('=== PEAK HOURS RAW DATA ===');
    console.log('Type:', typeof data);
    console.log('Raw Response:', data);
    console.log('JSON String:', JSON.stringify(data, null, 2));
    console.log('===========================');
    
    // Handle the actual API response format
    if (typeof data === 'object' && data !== null) {
      // Backend returns: {"status":"success","peakTimeDate":"04-08-2025","hourly_counts":[...]}
      if (data.status === 'success' && data.hourly_counts) {
        // Find the hour with the highest count
        let peakHour = 0;
        let maxCount = 0;
        
        data.hourly_counts.forEach(item => {
          if (item.count > maxCount) {
            maxCount = item.count;
            peakHour = item.hour;
          }
        });
        
        // If maxCount is 0, there's no parking activity
        if (maxCount === 0) {
          return "No data";
        }
        
        // Format hour to readable time in 24hr format (e.g., 9 -> "09:00")
        const formatHour = (hour) => `${String(hour % 24).padStart(2, '0')}:00`;
        
        // Return peak hour range (assuming 1-hour window)
        const startTime = formatHour(peakHour);
        const endTime = formatHour(peakHour + 1);
        return `${startTime} - ${endTime}`;
      } else if (data.start && data.end) {
        return `${data.start} - ${data.end}`;
      } else {
        return JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(data);
        if (parsed.status === 'success' && parsed.hourly_counts) {
          // Same logic as above for parsed JSON
          let peakHour = 0;
          let maxCount = 0;
          
          parsed.hourly_counts.forEach(item => {
            if (item.count > maxCount) {
              maxCount = item.count;
              peakHour = item.hour;
            }
          });
          
          // If maxCount is 0, there's no parking activity
          if (maxCount === 0) {
            return "No data";
          }
          
          const formatHour = (hour) => `${String(hour % 24).padStart(2, '0')}:00`;
          
          const startTime = formatHour(peakHour);
          const endTime = formatHour(peakHour + 1);
          return `${startTime} - ${endTime}`;
        }
        return data;
      } catch {
        return data;
      }
    }
    
    // If we can't parse it, return the raw data as string
    return String(data);
  } catch (error) {
    console.error('Error fetching peak hours:', error);
    return DEFAULT_VALUES.PEAK_HOURS;
  }
};

/**
 * Fetch all dashboard summary data at once
 * @returns {Promise<Array>} - Array of dashboard summary objects
 */
export const getDashboardSummary = async () => {
  try {
    // Fetch all data in parallel for better performance
    const [spaceAvailability, averageDuration, peakHours] = await Promise.all([
      getSpaceAvailability(),
      getAverageDuration(),
      getPeakHours()
    ]);

    return [
      { label: 'Car Parking', value: spaceAvailability },
      { label: 'Average Parking Duration', value: averageDuration },
      { label: 'Peak Hours', value: peakHours }
    ];
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    // Return default values if all requests fail
    return [
      { label: 'Car Parking', value: DEFAULT_VALUES.SPACE_AVAILABILITY },
      { label: 'Average Parking Duration', value: DEFAULT_VALUES.AVERAGE_DURATION },
      { label: 'Peak Hours', value: DEFAULT_VALUES.PEAK_HOURS }
    ];
  }
};

/**
 * Convert ISO timestamp to display format
 * @param {string} isoTimestamp - ISO format timestamp
 * @returns {string} - Formatted timestamp (DD/M/YYYY, HH:MM:SS)
 */
const formatTimestamp = (isoTimestamp) => {
  try {
    const date = new Date(isoTimestamp);
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return isoTimestamp; // Return original if formatting fails
  }
};

/**
 * Transform API log entry to frontend format
 * @param {Object} apiEntry - API log entry format
 * @returns {Object} - Frontend format
 */
const transformLogEntry = (apiEntry) => {
  return {
    timestamp: formatTimestamp(apiEntry.car_Timestamp),
    rawTimestamp: apiEntry.car_Timestamp,
    action: apiEntry.car_status === 'entry' ? 'Entry' : 
            apiEntry.car_status === 'exit' ? 'Exit' : 
            apiEntry.car_status, // Capitalize first letter
    plate: apiEntry.license_plate_num,
    image: apiEntry.car_img_path || apiEntry.lp_img_path || null
  };
};

/**
 * Fetch car and license plate images for a specific log entry
 * @param {string} licensePlate - The license plate number
 * @param {string} rawTimestamp - The raw timestamp from the DB (e.g. "2026-03-20 20:39:15")
 * @returns {Promise<{carSrc: string, lpSrc: string|null}>} - Base64 data URLs
 */
export const getCarImages = async (licensePlate, rawTimestamp) => {
  const endpoint = `${ENDPOINTS.IMAGES_BY_INFO}?license_plate_num=${encodeURIComponent(licensePlate)}&timestamp=${encodeURIComponent(rawTimestamp)}`;
  const data = await apiRequest(endpoint);
  if (data.status !== 'success') {
    throw new Error(data.reason || 'Failed to fetch images');
  }
  return {
    carSrc: `data:${data.car.contentType};base64,${data.car.base64}`,
    lpSrc: data.license_plate
      ? `data:${data.license_plate.contentType};base64,${data.license_plate.base64}`
      : null,
  };
};

/**
 * Fetch filtered records by date range and/or license plate
 * @param {Object} filters - { start, end, plate } — all optional
 *   start/end: "YYYY-MM-DD HH:mm:ss"
 *   plate: string (partial or full match handled by backend)
 * @returns {Promise<Array>} - Array of transformed log entries
 */
export const getFilteredRecords = async ({ start, end, plate } = {}) => {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end)   params.set('end', end);
  if (plate) params.set('license_plate_num', plate);

  const endpoint = `${ENDPOINTS.RECORDS_FILTER}?${params.toString()}`;
  const data = await apiRequest(endpoint);

  if (data.status !== 'success') {
    throw new Error(data.reason || 'Filter request failed');
  }

  const records = Array.isArray(data.records) ? data.records : [];
  return records.map(entry => ({
    timestamp: formatTimestamp(entry.timestamp),
    rawTimestamp: entry.timestamp,
    action: entry.status === 'entry' ? 'Entry' : entry.status === 'exit' ? 'Exit' : entry.status,
    plate: entry.license_plate_num,
    image: null,
  }));
};

/**
 * Fetch all records for a specific license plate number
 * @param {string} plate - License plate number
 * @returns {Promise<Array>} - Array of transformed log entries
 */
export const getRecordsByPlate = async (plate) => {
  const endpoint = `${ENDPOINTS.RECORDS_BY_PLATE}?license_plate_num=${encodeURIComponent(plate)}`;
  const data = await apiRequest(endpoint);

  if (data.status !== 'success') {
    throw new Error(data.reason || 'Plate search failed');
  }

  const records = Array.isArray(data.records) ? data.records : [];
  return records.map(entry => ({
    timestamp: formatTimestamp(entry.timestamp),
    rawTimestamp: entry.timestamp,
    action: entry.status === 'entry' ? 'Entry' : entry.status === 'exit' ? 'Exit' : entry.status,
    plate: entry.license_plate_num,
    image: null,
  }));
};

/**
 * Fetch update log data
 * @returns {Promise<Array>} - Array of log entries
 */
export const getUpdateLog = async () => {
  try {
    const data = await withRetry(() => apiRequest(ENDPOINTS.UPDATE_LOG));
    
    // Debug: Log the actual response to understand the format
    console.log('=== UPDATE LOG RAW DATA ===');
    console.log('Type:', typeof data);
    console.log('Raw Response:', data);
    console.log('JSON String:', JSON.stringify(data, null, 2));
    console.log('===============================');
    
    // Handle different response formats
    let rawLogs = [];
    
    if (Array.isArray(data)) {
      rawLogs = data;
    } else if (typeof data === 'object' && data !== null) {
      // Check for common wrapped formats
      if (data.status === 'success' && Array.isArray(data.logs)) {
        rawLogs = data.logs;
      } else if (Array.isArray(data.data)) {
        rawLogs = data.data;
      } else if (Array.isArray(data.result)) {
        rawLogs = data.result;
      } else if (Array.isArray(data.updateLog)) {
        rawLogs = data.updateLog;
      } else if (data.status === 'success' && data.logs === null) {
        // No logs available
        return [];
      } else {
        console.warn('Unexpected update log format:', data);
        return [];
      }
    } else if (typeof data === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          rawLogs = parsed;
        } else if (parsed.status === 'success' && Array.isArray(parsed.logs)) {
          rawLogs = parsed.logs;
        } else {
          console.warn('Unexpected string format:', parsed);
          return [];
        }
      } catch {
        console.warn('Failed to parse string data:', data);
        return [];
      }
    } else {
      console.warn('Unexpected data type:', typeof data, data);
      return [];
    }
    
    // Transform API format to frontend format
    const transformedLogs = rawLogs.map(transformLogEntry);
    
    console.log('=== TRANSFORMED LOGS ===');
    console.log('Transformed:', transformedLogs);
    console.log('========================');
    
    return transformedLogs;
  } catch (error) {
    console.error('Error fetching update log:', error);
    // Return empty array on error
    return [];
  }
};
