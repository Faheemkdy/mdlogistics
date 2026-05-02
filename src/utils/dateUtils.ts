import { format, parseISO } from 'date-fns';

/**
 * Standardizes date string to YYYY-MM-DD
 * This version is used for database operations and inputs
 */
export const getStandardDate = (date: Date | string = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use local time for standard pickers
  return d.toISOString().split('T')[0];
};

/**
 * Safely parses and formats date for display in reports
 * Prevents "day shift" bugs by normalizing to mid-day before formatting
 */
export const formatReportDate = (dateStr: string, formatPattern: string = 'dd MMMM yyyy') => {
  if (!dateStr) return 'N/A';
  try {
    // If it's just a date string like '2024-02-12', append T12:00:00 to keep it on the same day in local time
    const cleanDate = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr + 'T12:00:00');
    return format(cleanDate, formatPattern);
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateStr;
  }
};

/**
 * Standardizes timestamp for logs (HH:mm a)
 */
export const formatTime = (date: Date | string = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'hh:mm a');
};

/**
 * Gets a date range starting from N days ago until today
 */
export const getDateRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1)); // -6 for 7 days (including today)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};
