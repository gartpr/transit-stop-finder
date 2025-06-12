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

export const getUserLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err)
    );
  });

// Add minutes to an HH:MM time string
export const addMinutesToTime = (timeStr, minutes) => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + minutes, 0);
  return date.toTimeString().split(' ')[0]; // Returns HH:MM:SS
};

// Convert HH:MM:SS to seconds since midnight
export const timeToSeconds = (timeStr) => {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
};

export function normalizeStopForMap(stop) {
  if (stop.location) return stop; // Already fine
  if (stop.lat && stop.lng) {
    return { ...stop, location: { lat: stop.lat, lng: stop.lng } };
  }
  return stop; // fallback
}

export function transitlandToGoogleStop(tlStop, originLocation) {
  // Calculate distance (in miles, like Google does)
  let distance = 0;
  if (originLocation && tlStop.lat && tlStop.lng) {
    const toRad = (x) => x * Math.PI / 180;
    const R = 3958.8; // miles
    const dLat = toRad(tlStop.lat - originLocation.lat);
    const dLng = toRad(tlStop.lng - originLocation.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(originLocation.lat)) *
        Math.cos(toRad(tlStop.lat)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;
  }

  const walkTime = distance ? calculateWalkingTime(distance) : undefined;

  return {
    id: tlStop.id || tlStop.stop_onestop_id || tlStop.stop_id,
    name: tlStop.name || tlStop.stop_name,
    type: 'bus',
    location: { lat: tlStop.lat, lng: tlStop.lng },
    address: tlStop.address || tlStop.stop_name || '',
    distance,
    walkTime,
    rating: undefined,
    priceLevel: undefined,
    source: 'transitland',
    ...tlStop,
  };
}

export function addMinutesToClock(startTime, minutes) {
  // startTime = 'HH:MM'
  let [h, m] = startTime.split(':').map(Number);
  let date = new Date(0, 0, 0, h, m + minutes);
  let hour = String(date.getHours()).padStart(2, '0');
  let min = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${min}`;
}
