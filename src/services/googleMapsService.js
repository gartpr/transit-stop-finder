// src/services/googleMapsService.js
import { API_CONFIG } from '../config/apiKeys';

class GoogleMapsService {
  constructor() {
    this.map = null;
    this.placesService = null;
    this.geocoder = null;
    this.isLoaded = false;
  }

  // Load Google Maps script
  async loadGoogleMaps() {
    if (this.isLoaded || window.google) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Initialize map
  initializeMap(mapElement, options = {}) {
    const defaultOptions = {
      center: { lat: 37.7749, lng: -122.4194 },
      zoom: 15,
      styles: [
        {
          featureType: 'transit',
          elementType: 'all',
          stylers: [{ visibility: 'on' }]
        }
      ]
    };

    this.map = new window.google.maps.Map(mapElement, { ...defaultOptions, ...options });
    this.placesService = new window.google.maps.places.PlacesService(this.map);
    this.geocoder = new window.google.maps.Geocoder();
    
    return this.map;
  }

  // Geocode address
  async geocodeAddress(address) {
    return new Promise((resolve, reject) => {
      if (!this.geocoder) {
        reject(new Error('Geocoder not initialized'));
        return;
      }

      this.geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          };
          resolve({ location, result: results[0] });
        } else {
          reject(new Error('Address not found'));
        }
      });
    });
  }

  // Find nearby transit stops
  async findNearbyTransit(location, radius = API_CONFIG.DEFAULT_SEARCH_RADIUS) {
    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        reject(new Error('Places service not initialized'));
        return;
      }

      const request = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        types: ['transit_station', 'bus_station', 'subway_station']
      };

      this.placesService.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const stops = results.map(place => ({
            id: place.place_id,
            name: place.name,
            type: this.determineTransitType(place.types),
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            address: place.vicinity || 'Address not available',
            rating: place.rating,
            priceLevel: place.price_level,
            source: 'google'
          }));
          resolve(stops);
        } else {
          reject(new Error('Places search failed'));
        }
      });
    });
  }

  // Determine transit type from Google Places types
  determineTransitType(types) {
    if (types.includes('subway_station')) return 'train';
    if (types.includes('bus_station')) return 'bus';
    if (types.includes('transit_station')) return 'transit';
    return 'transit';
  }

  // Calculate distance between two points
  calculateDistance(pos1, pos2) {
    if (window.google && window.google.maps) {
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(pos1.lat, pos1.lng),
        new window.google.maps.LatLng(pos2.lat, pos2.lng)
      );
      return Math.round(distance / 1609.34 * 100) / 100; // Convert to miles
    }
    return 0;
  }

  // Create marker
  createMarker(position, options = {}) {
    return new window.google.maps.Marker({
      position,
      map: this.map,
      ...options
    });
  }

  // Fit map to show all markers
  fitBounds(locations) {
    if (!this.map || locations.length === 0) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    locations.forEach(location => bounds.extend(location));
    this.map.fitBounds(bounds);
  }
}

export default new GoogleMapsService();