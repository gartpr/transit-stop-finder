import { Loader } from '@googlemaps/js-api-loader';
import { API_CONFIG } from '../config/apiKeys';

const loader = new Loader({
  apiKey: API_CONFIG.GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['places', 'geometry']
});

class GoogleMapsService {
  constructor() {
    this.map = null;
    this.placesService = null;
    this.geocoder = null;
  }

  loadGoogleMaps = () => {
    return loader.load().then(() => {
      if (!window.google?.maps?.Map) {
        throw new Error('Google Maps API failed to load.');
      }
    });
  };

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

  determineTransitType(types) {
    if (types.includes('subway_station')) return 'train';
    if (types.includes('bus_station')) return 'bus';
    if (types.includes('transit_station')) return 'transit';
    return 'transit';
  }

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

  createMarker = (position, options = {}) => {
    if (!this.map) return null;

    if (window.google.maps.marker?.AdvancedMarkerElement) {
      const markerOptions = {
        map: this.map,
        position: position,
        title: options.title || ''
      };

      if (options.icon) {
        const img = document.createElement('img');
        img.src = options.icon.url || options.icon;
        if (options.icon.scaledSize) {
          img.width = options.icon.scaledSize.width;
          img.height = options.icon.scaledSize.height;
        }
        markerOptions.content = img;
      }

      return new window.google.maps.marker.AdvancedMarkerElement(markerOptions);
    } else {
      return new window.google.maps.Marker({
        position: position,
        map: this.map,
        title: options.title || '',
        icon: options.icon || undefined
      });
    }
  };

  fitBounds(locations) {
    if (!this.map || locations.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    locations.forEach(location => bounds.extend(location));
    this.map.fitBounds(bounds);
  }
}

export default new GoogleMapsService();
