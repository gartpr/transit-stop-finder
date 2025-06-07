// src/utils/helpers.js
export const deduplicateStops = (stops) => {
  const unique = new Map();
  stops.forEach(stop => {
    const key = `${Math.round(stop.location.lat * 1000)}_${Math.round(stop.location.lng * 1000)}`;
    if (!unique.has(key) || stop.source === 'google') {
      unique.set(key, stop);
    }
  });
  return Array.from(unique.values());
};

export const calculateWalkingTime = (distanceMiles) => {
  // Average walking speed: 3 mph
  const walkingSpeedMph = 3;
  const timeHours = distanceMiles / walkingSpeedMph;
  return Math.ceil(timeHours * 60); // Convert to minutes and round up
};

export const formatDistance = (miles) => {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
};

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};