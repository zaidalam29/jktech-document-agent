/**
 * Validate username
 * @param {string} username 
 * @returns {string|null} Error message or null if valid
 */
export const validateUsername = (username) => {
  if (!username || username.trim() === '') {
    return 'Username is required';
  }
  
  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  
  if (username.length > 50) {
    return 'Username must be less than 50 characters';
  }
  
  // Alphanumeric with underscores
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username can only contain letters, numbers and underscores';
  }
  
  return null;
};

/**
 * Validate password
 * @param {string} password 
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return 'Password is required';
  }
  
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  
  if (password.length > 100) {
    return 'Password must be less than 100 characters';
  }
  
  return null;
};

/**
 * Validate email
 * @param {string} email 
 * @returns {string|null}
 */
export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
};

/**
 * Validate file
 * @param {File} file 
 * @param {number} maxSize - in bytes
 * @param {string[]} allowedTypes
 * @returns {string|null}
 */
export const validateFile = (file, maxSize = 10485760, allowedTypes = []) => {
  if (!file) return 'File is required';
  
  if (file.size > maxSize) {
    return `File size must be less than ${Math.round(maxSize / 1048576)}MB`;
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `File type must be: ${allowedTypes.join(', ')}`;
  }
  
  return null;
};