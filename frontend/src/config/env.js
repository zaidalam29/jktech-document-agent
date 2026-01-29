// Get environment variables safely
const getEnv = (key, defaultValue = '') => {
  try {
    return import.meta.env[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

// API Configuration
const API_BASE = getEnv('VITE_API_URL', 'http://localhost:8000/api/v1');
const IS_DEVELOPMENT = getEnv('VITE_ENV', 'development') === 'development';

const env = {
  // Complete API URLs
  API_URL: API_BASE,
  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    REGISTER: `${API_BASE}/auth/signup`,
    LOGOUT: `${API_BASE}/auth/logout`,
    USER_DETAILS: `${API_BASE}/auth/me`,
  },
  
  // Environment
  ENV: getEnv('VITE_ENV', 'development'),
  IS_DEVELOPMENT,
  
  // App Info
  APP_NAME: getEnv('VITE_APP_NAME', 'Document QA System'),
  APP_VERSION: getEnv('VITE_APP_VERSION', '1.0.0'),
  
  // Features
  FEATURE_REGISTRATION: getEnv('VITE_FEATURE_REGISTRATION', 'true') === 'true',
  FEATURE_FILE_UPLOAD: getEnv('VITE_FEATURE_FILE_UPLOAD', 'true') === 'true',
  
  // Limits
  MAX_UPLOAD_SIZE: parseInt(getEnv('VITE_MAX_UPLOAD_SIZE', '10485760')),
  SESSION_TIMEOUT: parseInt(getEnv('VITE_SESSION_TIMEOUT', '1800000')),
  PAGE_SIZE: parseInt(getEnv('VITE_PAGE_SIZE', '10')),
  LOG_LEVEL: getEnv('VITE_LOG_LEVEL', 'debug'),
  
  // Monitoring
  SENTRY_DSN: getEnv('VITE_SENTRY_DSN', ''),
  GOOGLE_ANALYTICS_ID: getEnv('VITE_GOOGLE_ANALYTICS_ID', ''),
};

// Log in development
if (env.IS_DEVELOPMENT) {
  console.log('📦 Environment Config:', {
    API_URL: env.API_URL,
    AUTH_URLS: env.AUTH,
    ENV: env.ENV,
  });
}

export default env;