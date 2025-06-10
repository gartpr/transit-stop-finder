import GoogleMapsService from '../services/googleMapsService';
import { calculateWalkingTime } from './helpers';

// Map-related helper functions
export const clearMapMarkers = (markers, markersRef) => {
  console.log('Clearing', markersRef.current.length, 'markers');
  if (markersRef.current && markersRef.current.length > 0) {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        try {
          marker.setMap(null);
        } catch (error) {
          console.error('Error clearing marker:', error);
        }
      }
    });
    markersRef.current = [];
  }
};

export const getMarkerIcon = (stop, selectedStop, reachableStops, showIsochrone) => {
  const isSelected = selectedStop?.id === stop.id;
  const isReachable = reachableStops.some(s => s.id === stop.id);
  
  if (isSelected) {
    return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
  } else if (showIsochrone && isReachable) {
    return 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
  } else {
    const color = stop.type === 'bus' ? 'blue' : stop.type === 'train' ? 'green' : 'purple';
    return `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`;
  }
};

export const getTransitIcon = (type) => {
  switch (type) {
    case 'bus':
      return 'Bus';
    case 'train':
      return 'Train';
    default:
      return 'MapPin';
  }
};

export const getTransitColorScheme = (type) => {
  switch (type) {
    case 'bus':
      return 'blue';
    case 'train':
      return 'green';
    default:
      return 'purple';
  }
};

export const calculateIsochroneStops = (stops, selectedStop, isochroneTime) => {
  const averageSpeed = selectedStop.type === 'train' ? 40 : 25;
  
  return stops
    .filter(stop => stop.id !== selectedStop.id)
    .map(stop => {
      const distance = GoogleMapsService.calculateDistance(selectedStop.location, stop.location);
      const travelTime = (distance / 1000) / averageSpeed * 60;
      const walkTime = calculateWalkingTime(distance);
      const totalTime = travelTime + walkTime;
      
      return {
        ...stop,
        distance: distance,
        walkTime: Math.round(totalTime),
        isReachable: totalTime <= parseInt(isochroneTime)
      };
    })
    .filter(stop => stop.isReachable)
    .sort((a, b) => a.distance - b.distance);
};