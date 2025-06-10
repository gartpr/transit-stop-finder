import GoogleMapsService from '../services/googleMapsService';
import { calculateWalkingTime } from './helpers';

// Clear all markers from the map
export const clearMapMarkers = (markers, markersRef) => {
  if (markersRef.current?.length) {
    markersRef.current.forEach(marker => {
      try {
        marker.setMap(null);
      } catch (error) {
        console.error('Error clearing marker:', error);
      }
    });
    markersRef.current = [];
  }
};

// Get appropriate icon for a stop
export const getMarkerIcon = (stop, selectedStop, reachableStops, showIsochrone) => {
  const isSelected = selectedStop?.id === stop.id;
  const isReachable = reachableStops.some(s => s.id === stop.id);

  if (isSelected) return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
  if (showIsochrone && isReachable) return 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';

  const color = stop.type === 'bus' ? 'blue' : stop.type === 'train' ? 'green' : 'purple';
  return `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`;
};

// Get icon name for UI (lucide-react)
export const getTransitIcon = (type) => {
  if (type === 'bus') return 'Bus';
  if (type === 'train') return 'Train';
  return 'MapPin';
};

// Get Chakra color scheme for a given transit type
export const getTransitColorScheme = (type) => {
  return type === 'bus' ? 'blue' : type === 'train' ? 'green' : 'purple';
};

// Determine which stops are reachable from the selected stop
export const calculateIsochroneStops = (stops, selectedStop, isochroneTime) => {
  const avgSpeed = selectedStop.type === 'train' ? 40 : 25;

  return stops
    .filter(stop => stop.id !== selectedStop.id)
    .map(stop => {
      const distance = GoogleMapsService.calculateDistance(selectedStop.location, stop.location);
      const travelTime = (distance / 1000 / avgSpeed) * 60;
      const walkTime = calculateWalkingTime(distance);
      const totalTime = travelTime + walkTime;

      return {
        ...stop,
        distance,
        walkTime: Math.round(totalTime),
        isReachable: totalTime <= parseInt(isochroneTime)
      };
    })
    .filter(stop => stop.isReachable)
    .sort((a, b) => a.distance - b.distance);
};
