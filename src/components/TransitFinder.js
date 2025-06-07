// src/components/TransitFinder.js
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Bus, Train, Clock, AlertCircle, Loader2 } from 'lucide-react';
import GoogleMapsService from '../services/googleMapsService';
import TransitlandService from '../services/transitlandService';
import OverpassService from '../services/overpassService';
import { 
  deduplicateStops, 
  calculateWalkingTime, 
  formatDistance, 
  getUserLocation 
} from '../utils/helpers';
import { API_CONFIG, validateApiKeys } from '../config/apiKeys';

const TransitFinder = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [markerLocation, setMarkerLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [transitStops, setTransitStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiWarnings, setApiWarnings] = useState([]);
  const mapRef = useRef(null);
  const [markers, setMarkers] = useState([]);

  // Initialize services and validate API keys
  useEffect(() => {
    const warnings = validateApiKeys();
    setApiWarnings(warnings);
    
    // In your real app, this would check for the actual API key
    // if (API_CONFIG.GOOGLE_MAPS_API_KEY) {
      initializeGoogleMaps();
    // }
  }, []);

  const initializeGoogleMaps = async () => {
    try {
      await GoogleMapsService.loadGoogleMaps();
      
      if (mapRef.current) {
        const map = GoogleMapsService.initializeMap(mapRef.current);
        
        // Add click listener
        map.addListener('click', (event) => {
          const location = {
            lat: event.latLng?.lat() || 35.2828,
            lng: event.latLng?.lng() || -120.6596
          };
          handleMapClick(location);
        });

        // Get user location
        try {
          const location = await getUserLocation();
          setUserLocation(location);
          map.setCenter(location);
          
          // Add user location marker
          GoogleMapsService.createMarker(location, {
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24" height="24">
                  <circle cx="12" cy="12" r="8" stroke="white" stroke-width="2"/>
                </svg>
              `),
              scaledSize: { width: 24, height: 24 }
            }
          });
        } catch (error) {
          console.warn('Could not get user location:', error);
        }
      }
    } catch (error) {
      setError('Failed to initialize Google Maps. Please check your API key.');
    }
  };

  const handleAddressSearch = async () => {
    if (!address.trim()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const { location } = await GoogleMapsService.geocodeAddress(address);
      setMarkerLocation(location);
      
      if (GoogleMapsService.map) {
        GoogleMapsService.map.setCenter(location);
        GoogleMapsService.map.setZoom(16);
      }
      
      await findNearbyTransit(location);
    } catch (err) {
      setError('Unable to find address. Please try a different search.');
      setLoading(false);
    }
  };

  const handleMapClick = async (location) => {
    setMarkerLocation(location);
    await findNearbyTransit(location);
  };

  const handleUseCurrentLocation = async () => {
    if (userLocation) {
      await handleMapClick(userLocation);
    } else {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        await handleMapClick(location);
      } catch (error) {
        setError('Could not access your location. Please enable location services.');
      }
    }
  };

  const findNearbyTransit = async (location) => {
    setLoading(true);
    setError('');
    clearMarkers();

    try {
      // Fetch from multiple sources in parallel
      const [googleStops, transitlandStops, osmStops] = await Promise.allSettled([
        GoogleMapsService.findNearbyTransit(location),
        TransitlandService.findNearbyStops(location),
        OverpassService.findNearbyTransit(location)
      ]);

      // Combine results
      const allStops = [
        ...(googleStops.status === 'fulfilled' ? googleStops.value : []),
        ...(transitlandStops.status === 'fulfilled' ? transitlandStops.value : []),
        ...(osmStops.status === 'fulfilled' ? osmStops.value : [])
      ];

      // Process results
      const uniqueStops = deduplicateStops(allStops);
      const stopsWithDistance = uniqueStops
        .map(stop => ({
          ...stop,
          distance: GoogleMapsService.calculateDistance(location, stop.location),
          walkTime: calculateWalkingTime(GoogleMapsService.calculateDistance(location, stop.location))
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, API_CONFIG.MAX_RESULTS);

      setTransitStops(stopsWithDistance);
      addMarkersToMap(stopsWithDistance, location);
      
    } catch (err) {
      console.error('Error finding transit:', err);
      setError('Unable to find nearby transit stops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  };

  const addMarkersToMap = (stops, searchLocation) => {
    if (!GoogleMapsService.map) return;

    const newMarkers = [];

    // Add search location marker
    const searchMarker = GoogleMapsService.createMarker(searchLocation, {
      title: 'Search Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="32" height="32">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `),
        scaledSize: { width: 32, height: 32 }
      }
    });
    newMarkers.push(searchMarker);

    // Add transit stop markers
    stops.slice(0, 5).forEach((stop) => {
      const color = stop.type === 'bus' ? 'blue' : stop.type === 'train' ? 'green' : 'purple';
      const marker = GoogleMapsService.createMarker(stop.location, {
        title: stop.name,
        icon: {
          url: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
        }
      });

      // Mock info window functionality
      marker.addListener('click', () => {
        console.log(`Clicked on ${stop.name}`);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      GoogleMapsService.fitBounds(newMarkers.map(m => m.getPosition?.() || searchLocation));
    }
  };

  const getTransitIcon = (type) => {
    switch (type) {
      case 'bus':
        return <Bus className="w-4 h-4" />;
      case 'train':
        return <Train className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getTransitColor = (type) => {
    switch (type) {
      case 'bus':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'train':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Navigation className="w-8 h-8" />
              Public Transit Finder
            </h1>
            <p className="mt-2 opacity-90">Find the closest bus stops, train stations, and transit options near you</p>
          </div>

          <div className="p-6">
            {/* API Warnings */}
            {apiWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">Setup Required</h3>
                    <ul className="text-yellow-700 text-sm space-y-1">
                      {apiWarnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                    <p className="text-yellow-700 text-sm mt-2">
                      Currently running in demo mode with simulated API responses.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Section */}
            <div className="mb-6">
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Enter an address or location..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleAddressSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
              
              <button
                onClick={handleUseCurrentLocation}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Use my current location
              </button>
            </div>

            {/* Map */}
            <div className="mb-6">
              <div 
                ref={mapRef}
                className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border flex items-center justify-center"
                style={{ minHeight: '400px' }}
              >
                <div className="text-center text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Interactive Map</p>
                  <p className="text-sm">Google Maps integration ready</p>
                  {markerLocation && (
                    <div className="mt-3 text-blue-600">
                      <p className="text-sm font-medium">Search Location:</p>
                      <p className="text-xs">{markerLocation.lat.toFixed(4)}, {markerLocation.lng.toFixed(4)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Finding nearby transit stops...</p>
                <div className="mt-2 text-sm text-gray-500">
                  Searching Google Places, Transitland, and OpenStreetMap...
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {transitStops.length > 0 && !loading && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Nearby Transit Stops ({transitStops.length} found)
                </h2>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {transitStops.map((stop) => (
                    <div
                      key={stop.id}
                      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border ${getTransitColor(stop.type)}`}>
                            {getTransitIcon(stop.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{stop.name}</h3>
                            <p className="text-sm text-gray-600">{stop.address}</p>
                            {stop.rating && (
                              <p className="text-sm text-yellow-600 flex items-center gap-1 mt-1">
                                <span>★</span> 
                                <span>{stop.rating.toFixed(1)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{formatDistance(stop.distance)}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-3 h-3" />
                            {stop.walkTime} min walk
                          </div>
                          <p className="text-xs text-gray-400 capitalize mt-1">{stop.source}</p>
                        </div>
                      </div>
                      
                      {stop.routes && stop.routes.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600 mb-2">Available Routes:</p>
                          <div className="flex flex-wrap gap-2">
                            {stop.routes.map((route, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                              >
                                {route}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t">
                        <button className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                          Get Directions
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {transitStops.length === 0 && !loading && !error && (
              <div className="text-center py-12 text-gray-500">
                <Navigation className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">Ready to Find Transit</h3>
                <p className="text-sm">Search for an address or use your current location to find nearby transit stops.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitFinder;