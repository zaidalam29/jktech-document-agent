// Alternative date parsing function
const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Try different date formats
  const formats = [
    // ISO format with timezone
    dateString => new Date(dateString),
    // Remove timezone and parse
    dateString => {
      const withoutTimezone = dateString.split('+')[0].split('.')[0];
      return new Date(withoutTimezone);
    },
    // Custom format: 2026-01-27 02:05:16.934017+05:30
    dateString => {
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [_, year, month, day, hour, minute, second] = match;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      }
      return null;
    }
  ];
  
  for (const format of formats) {
    try {
      const date = format(dateString);
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      // Try next format
    }
  }
  
  return null;
};