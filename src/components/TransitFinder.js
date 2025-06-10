import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Alert,
  Icon,
  Spinner,
  Card
} from '@chakra-ui/react';
import { Navigation, AlertCircle, MapPin } from 'lucide-react';

// Components
import TransitSearch from './Search';
import TransitMap from './Map';
import TransitStopsList from './StopsList';
import IsochroneControls from './IsochroneControls';
import IsochroneDrawer from './IsochroneDrawer';

// Services
import GoogleMapsService from '../services/googleMapsService';

// Utils
import { 
  calculateWalkingTime, 
  getUserLocation 
} from '../utils/helpers';
import { 
  clearMapMarkers, 
  getMarkerIcon, 
  calculateIsochroneStops 
} from '../utils/mapHelpers';
import { API_CONFIG, validateApiKeys } from '../config/apiKeys';

const TransitFinder = () => {
  // State
  const [userLocation, setUserLocation] = useState(null);
  const [markerLocation, setMarkerLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [transitStops, setTransitStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiWarnings, setApiWarnings] = useState([]);
  
  // Isochrone state
  const [selectedStop, setSelectedStop] = useState(null);
  const [isochroneTime, setIsochroneTime] = useState('30');
  const [reachableStops, setReachableStops] = useState([]);
  const [isochroneLoading, setIsochroneLoading] = useState(false);
  const [showIsochrone, setShowIsochrone] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userLocationMarkerRef = useRef(null);

  // Initialize
  useEffect(() => {
    const warnings = validateApiKeys();
    setApiWarnings(warnings);
    initializeGoogleMaps();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      clearMapMarkers([], markersRef);
      if (userLocationMarkerRef.current?.setMap) {
        userLocationMarkerRef.current.setMap(null);
      }
    };
  }, []);

  const initializeGoogleMaps = async () => {
    try {
      await GoogleMapsService.loadGoogleMaps();
      
      if (mapRef.current) {
        const map = GoogleMapsService.initializeMap(mapRef.current);
        
        map.addListener('click', (event) => {
          const location = {
            lat: event.latLng?.lat() || 35.2828,
            lng: event.latLng?.lng() || -120.6596
          };
          handleMapClick(location);
        });

        try {
          const location = await getUserLocation();
          setUserLocation(location);
          map.setCenter(location);
          
          const userMarker = GoogleMapsService.createMarker(location, {
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
          
          userLocationMarkerRef.current = userMarker;
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
    
    clearMapMarkers([], markersRef);
    setShowIsochrone(false);
    setSelectedStop(null);
    setReachableStops([]);

    try {
      // Only use Google Maps API
      const googleStops = await GoogleMapsService.findNearbyTransit(location);
      
      const stopsWithDistance = googleStops
        .map(stop => ({
          ...stop,
          distance: GoogleMapsService.calculateDistance(location, stop.location),
          walkTime: calculateWalkingTime(GoogleMapsService.calculateDistance(location, stop.location))
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, API_CONFIG.MAX_RESULTS);

      setTransitStops(stopsWithDistance);
      
      setTimeout(() => {
        addMarkersToMap(stopsWithDistance, location);
      }, 100);
      
    } catch (err) {
      console.error('Error finding transit:', err);
      setError('Unable to find nearby transit stops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addMarkersToMap = (stops, searchLocation) => {
    if (!GoogleMapsService.map) return;

    console.log('Adding markers for', stops.length, 'stops');
    clearMapMarkers([], markersRef);

    const newMarkers = [];

    if (!showIsochrone && searchLocation) {
      try {
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
        if (searchMarker) {
          newMarkers.push(searchMarker);
        }
      } catch (error) {
        console.error('Error creating search marker:', error);
      }
    }

    stops.forEach((stop) => {
      const isSelected = selectedStop?.id === stop.id;
      const isReachable = reachableStops.some(s => s.id === stop.id);
      
      if (showIsochrone && !isSelected && !isReachable) {
        return;
      }
      
      const iconUrl = getMarkerIcon(stop, selectedStop, reachableStops, showIsochrone);

      try {
        const marker = GoogleMapsService.createMarker(stop.location, {
          title: stop.name,
          icon: iconUrl
        });

        if (marker) {
          marker.addListener('click', () => {
            handleStopClick(stop);
          });

          newMarkers.push(marker);
        }
      } catch (error) {
        console.error('Error creating marker:', error);
      }
    });

    console.log('Created', newMarkers.length, 'markers');
    markersRef.current = newMarkers;

    if (newMarkers.length > 0 && !showIsochrone) {
      try {
        GoogleMapsService.fitBounds(newMarkers.map(m => m.getPosition?.() || searchLocation));
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  };

  const handleStopClick = (stop) => {
    console.log('Stop clicked:', stop.name);
    setSelectedStop(stop);
    setIsDrawerOpen(true);
  };

  const calculateIsochrone = async () => {
    if (!selectedStop) return;
    
    console.log('Calculating isochrone for:', selectedStop.name, 'Time:', isochroneTime);
    
    setIsochroneLoading(true);
    setShowIsochrone(true);
    setIsDrawerOpen(false);

    setTimeout(async () => {
      try {
        const averageSpeed = selectedStop.type === 'train' ? 40 : 25;
        const maxDistance = (averageSpeed * parseInt(isochroneTime)) / 60;
        
        console.log('Max distance:', maxDistance, 'km');
        
        // Search for more stops in a wider radius using Google Maps
        const nearbyStops = await GoogleMapsService.findNearbyTransit(
          selectedStop.location, 
          maxDistance * 1000 // Convert km to meters
        );
        
        // If no additional stops found, use existing stops
        const stopsToAnalyze = nearbyStops.length > 0 ? nearbyStops : transitStops;
        
        // Calculate reachable stops
        const reachable = calculateIsochroneStops(stopsToAnalyze, selectedStop, isochroneTime);
        
        console.log('Reachable stops:', reachable.length);
        setReachableStops(reachable);
        
        const stopsToShow = [selectedStop, ...reachable];
        
        requestAnimationFrame(() => {
          clearMapMarkers([], markersRef);
          
          setTimeout(() => {
            addMarkersToMap(stopsToShow, selectedStop.location);
            
            if (GoogleMapsService.map) {
              GoogleMapsService.map.setCenter(selectedStop.location);
              GoogleMapsService.map.setZoom(13);
            }
          }, 100);
        });
        
      } catch (error) {
        console.error('Error calculating isochrone:', error);
        setError('Unable to calculate reachable stops. Please try again.');
        setShowIsochrone(false);
      } finally {
        setIsochroneLoading(false);
      }
    }, 100);
  };

  const clearIsochrone = () => {
    setShowIsochrone(false);
    setSelectedStop(null);
    setReachableStops([]);
    
    setTimeout(() => {
      if (markerLocation) {
        addMarkersToMap(transitStops, markerLocation);
      }
    }, 100);
  };

  const handleGetDirections = (stop) => {
    // Implement get directions functionality
    console.log('Get directions for:', stop.name);
  };

  return (
    <>
      <Container maxW="6xl" p={4}>
        <Card.Root bg="white" shadow="xl" borderRadius="2xl" overflow="hidden">
          {/* Header */}
          <Box bgGradient="to-r" gradientFrom="blue.600" gradientTo="indigo.600" p={6} color="white">
            <HStack gap={3} mb={2}>
              <Icon>
                <Navigation />
              </Icon>
              <Heading size="xl">Public Transit Finder</Heading>
            </HStack>
            <Text opacity={0.9}>Find the closest bus stops, train stations, and transit options near you</Text>
          </Box>

          <Card.Body p={6}>
            <VStack gap={6} align="stretch">
              {/* API Warnings */}
              {apiWarnings.length > 0 && (
                <Alert.Root status="warning" borderRadius="lg">
                  <Alert.Indicator />
                  <Box>
                    <Alert.Title mb={2}>Setup Required</Alert.Title>
                    <VStack align="start" gap={1}>
                      {apiWarnings.map((warning, index) => (
                        <Text key={index} fontSize="sm">• {warning}</Text>
                      ))}
                    </VStack>
                    <Text fontSize="sm" mt={2}>
                      Currently running in demo mode with simulated API responses.
                    </Text>
                  </Box>
                </Alert.Root>
              )}

              {/* Search Section */}
              <TransitSearch
                address={address}
                setAddress={setAddress}
                onSearch={handleAddressSearch}
                onUseCurrentLocation={handleUseCurrentLocation}
                loading={loading}
              />

              {/* Isochrone Controls */}
              {showIsochrone && (
                <IsochroneControls
                  selectedStop={selectedStop}
                  isochroneTime={isochroneTime}
                  reachableStops={reachableStops}
                  onClear={clearIsochrone}
                />
              )}

              {/* Map */}
              <TransitMap
                ref={mapRef}
                markerLocation={markerLocation}
                isochroneLoading={isochroneLoading}
                showIsochrone={showIsochrone}
              />

              {/* Map Legend */}
              {showIsochrone && (
                <HStack gap={4} justify="center" fontSize="sm">
                  <HStack gap={1}>
                    <Box w={3} h={3} borderRadius="full" bg="red.500" />
                    <Text>Selected Stop</Text>
                  </HStack>
                  <HStack gap={1}>
                    <Box w={3} h={3} borderRadius="full" bg="orange.500" />
                    <Text>Reachable Stops</Text>
                  </HStack>
                </HStack>
              )}

              {/* Loading State */}
              {loading && (
                <VStack py={8} gap={4}>
                  <Spinner size="xl" color="blue.600" borderWidth="4px" />
                  <Text color="gray.600">Finding nearby transit stops...</Text>
                  <Text fontSize="sm" color="gray.500">
                    Searching Google Places, Transitland, and OpenStreetMap...
                  </Text>
                </VStack>
              )}

              {/* Error State */}
              {error && (
                <Alert.Root status="error" borderRadius="lg">
                  <Alert.Indicator />
                  <Text>{error}</Text>
                </Alert.Root>
              )}

              {/* Results */}
              {transitStops.length > 0 && !loading && (
                <TransitStopsList
                  transitStops={transitStops}
                  selectedStop={selectedStop}
                  reachableStops={reachableStops}
                  showIsochrone={showIsochrone}
                  onStopClick={handleStopClick}
                  onGetDirections={handleGetDirections}
                />
              )}

              {/* Empty State */}
              {transitStops.length === 0 && !loading && !error && (
                <VStack py={12} gap={4} color="gray.500">
                  <Icon size="2xl" opacity={0.3}>
                    <Navigation />
                  </Icon>
                  <VStack gap={2}>
                    <Text fontSize="lg" fontWeight="medium">Ready to Find Transit</Text>
                    <Text fontSize="sm">Search for an address or use your current location to find nearby transit stops.</Text>
                  </VStack>
                </VStack>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>

      {/* Isochrone Settings Drawer */}
      {isDrawerOpen && (
        <IsochroneDrawer
          isOpen={isDrawerOpen}
          onClose={(open) => setIsDrawerOpen(open)}
          selectedStop={selectedStop}
          isochroneTime={isochroneTime}
          setIsochroneTime={setIsochroneTime}
          onCalculate={calculateIsochrone}
          loading={isochroneLoading}
        />
      )}
    </>
  );
};

export default TransitFinder;