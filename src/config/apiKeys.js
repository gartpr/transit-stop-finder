//apiKeys.js
export const API_CONFIG = {
  GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  
  // Default search radius in meters
  DEFAULT_SEARCH_RADIUS: 2000,
  
  // Maximum number of results to return
  MAX_RESULTS: 10
};

// Validate API keys
export const validateApiKeys = () => {
  const warnings = [];
  
  if (!API_CONFIG.GOOGLE_MAPS_API_KEY) {
    warnings.push('Google Maps API key is missing. Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file');
  }
  
  return warnings;
};
