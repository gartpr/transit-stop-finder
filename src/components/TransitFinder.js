// src/components/TransitFinder.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Card,
  Flex
} from '@chakra-ui/react';
import { Navigation, AlertCircle, MapPin, TreePine, Bus } from 'lucide-react';

// Components
import TransitSearch from './Search';
import TransitMap from './Map';
import TransitStopsList from './StopsList';
import IsochroneControls from './IsochroneControls';
import IsochroneDrawer from './IsochroneDrawer';
import IntroPopup from './IntroPopup';

// Services
import GoogleMapsService from '../services/googleMapsService';

// Utils
import {
  calculateWalkingTime,
  getUserLocation,
  addMinutesToTime,
  timeToSeconds,
  normalizeStopForMap,
  transitlandToGoogleStop,
  addMinutesToClock
} from '../utils/helpers';
import {
  clearMapMarkers,
  getMarkerIcon,
  calculateIsochroneStops
} from '../utils/mapHelpers';
import {
  findNearestStop,
  getDepartures,
  exploreReachableStops
} from '../services/transitlandService';
import { API_CONFIG, validateApiKeys } from '../config/apiKeys';
import { recommendLikelyStopsWithContext } from '../utils/ai';

const TransitFinder = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [markerLocation, setMarkerLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [transitStops, setTransitStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiWarnings, setApiWarnings] = useState([]);
  const [mapInitialized, setMapInitialized] = useState(false);

  const [selectedStop, setSelectedStop] = useState(null);
  const [isochroneTime, setIsochroneTime] = useState('30');
  const [reachableStops, setReachableStops] = useState([]);
  const [isochroneLoading, setIsochroneLoading] = useState(false);
  const [showIsochrone, setShowIsochrone] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hoveredStopId, setHoveredStopId] = useState(null); //new
  const [aiRecommendedStops, setAiRecommendedStops] = useState([]);

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userLocationMarkerRef = useRef(null);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [startTime, setStartTime] = useState('08:00'); // Default morning

  // Show the intro popup only once per session
  const [showIntro, setShowIntro] = useState(() => {
    return !window.sessionStorage.getItem('transit_finder_intro_shown');
  });

  useEffect(() => {
    const warnings = validateApiKeys();
    setApiWarnings(warnings);
    if (!mapInitialized) initializeGoogleMaps();
  }, [mapInitialized]);

  useEffect(() => {
    if (showIsochrone && selectedStop) {
      addMarkersToMap([selectedStop, ...reachableStops], selectedStop.location);
    } else {
      addMarkersToMap(transitStops, markerLocation);
    }
  }, [showIsochrone, selectedStop, reachableStops, transitStops, markerLocation]);

  useEffect(() => () => {
    clearMapMarkers([], markersRef);
    userLocationMarkerRef.current?.setMap?.(null);
  }, []);

  useEffect(() => {
    if (!showIntro) {
      window.sessionStorage.setItem('transit_finder_intro_shown', 'yes');
    }
  }, [showIntro]);


  const initializeGoogleMaps = async () => {
    try {
      await GoogleMapsService.loadGoogleMaps();
      if (mapRef.current && !GoogleMapsService.map) {
        const map = GoogleMapsService.initializeMap(mapRef.current);
        setMapInitialized(true);
        setError('');
        map.addListener('click', (e) => handleMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() }));

        try {
          const location = await getUserLocation();
          setUserLocation(location);
          map.setCenter(location);

          const marker = GoogleMapsService.createMarker(location, {
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4ade80" width="24" height="24"><circle cx="12" cy="12" r="8" stroke="white" stroke-width="2"/></svg>'),
              scaledSize: { width: 24, height: 24 }
            }
          });

          userLocationMarkerRef.current = marker;
        } catch (err) {
          console.warn('Location unavailable:', err);
        }
      }
    } catch (err) {
      console.error('Map error:', err);
      setError(err.message.includes('API key') ? 'Check your Google Maps API key.' : 'Map failed to load. Refresh the page.');
    }
  };

  const handleMapClick = async (location) => {
    setMarkerLocation(location);
    await findNearbyTransit(location);
  };

  const handleUseCurrentLocation = async () => {
    const location = userLocation || await getUserLocation().catch(() => null);
    if (location) await handleMapClick(location);
    else setError('Enable location services to use this feature.');
  };

  const handleAddressSearch = async () => {
    if (!address.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { location } = await GoogleMapsService.geocodeAddress(address);
      setMarkerLocation(location);
      GoogleMapsService.map?.setCenter(location);
      GoogleMapsService.map?.setZoom(16);
      await findNearbyTransit(location);
    } catch {
      setError('Unable to find address. Try a different search.');
    } finally {
      setLoading(false);
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
      const stops = await GoogleMapsService.findNearbyTransit(location);
      const enrichedStops = stops.map(s => ({
        ...s,
        distance: GoogleMapsService.calculateDistance(location, s.location),
      })).map(s => ({
        ...s,
        walkTime: calculateWalkingTime(s.distance)
      })).sort((a, b) => a.distance - b.distance).slice(0, API_CONFIG.MAX_RESULTS);

      if (enrichedStops.length === 0) {
        setError('No transit stops found near this location.');
        setTransitStops([]);
        return;
      }

      setTransitStops(enrichedStops);
      addMarkersToMap(enrichedStops, location);
    } catch (err) {
      console.error(err);
      setError('Could not find transit stops nearby.');
    } finally {
      setLoading(false);
    }
  };

  const addMarkersToMap = (stops, centerLocation) => {
    if (!GoogleMapsService.map) return;
    clearMapMarkers([], markersRef);
    const markers = [];

    stops.forEach(stop => {
      const id = stop.id;
      const isOrigin = selectedStop && id === selectedStop.id;

      let iconUrl;

      if (showIsochrone) {
        iconUrl = isOrigin
          ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
          : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
      } else {
        iconUrl = getMarkerIcon(stop, selectedStop, [], false);
      }

      const marker = GoogleMapsService.createMarker(stop.location, {
        title: stop.name,
        icon: {
          url: iconUrl,
          scaledSize: { width: 32, height: 32 }
        }
      });

      if (marker) {
        marker.addListener('click', () => handleStopClick(stop));
        markers.push(marker);
      }
    });

    markersRef.current = markers;
    if (markers.length && !showIsochrone) {
      GoogleMapsService.fitBounds(markers.map(m => m.getPosition?.() || centerLocation));
    }
  };

  const handleStopClick = async (stop) => {
    setSelectedStop(stop);
    setIsDrawerOpen(true);
  };

  const calculateIsochrone = async () => {
    if (!selectedStop) return;
    setIsochroneLoading(true);
    setShowIsochrone(true);
    setIsDrawerOpen(false);

    try {
      const avgSpeed = selectedStop.type === 'train' ? 40 : 25;
      const maxDist = (avgSpeed * parseInt(isochroneTime)) / 60;
      const nearby = await GoogleMapsService.findNearbyTransit(selectedStop.location, maxDist * 1000);
      const toAnalyze = nearby.length ? nearby : transitStops;
      const reachable = calculateIsochroneStops(toAnalyze, selectedStop, isochroneTime);
      setReachableStops(reachable);
      addMarkersToMap([selectedStop, ...reachableStops], selectedStop.location, hoveredStopId);
      GoogleMapsService.map?.setCenter(selectedStop.location);
      GoogleMapsService.map?.setZoom(13);
    } catch (err) {
      console.error('Isochrone error:', err);
      setError('Failed to calculate reachable stops.');
      setShowIsochrone(false);
    } finally {
      setIsochroneLoading(false);
    }
  };

  const clearIsochrone = () => {
    setShowIsochrone(false);
    setSelectedStop(null);
    setReachableStops([]);
    if (markerLocation) addMarkersToMap(transitStops, markerLocation);
  };

  const handleTransitlandReachability = async (selectedStop, isochroneMinutes = 30) => {
    setIsochroneLoading(true);
    setShowIsochrone(true);
    setError('');

    try {
      // 1. Find nearest Transitland stop (get onestop_id, gtfs_id, name)
      const nearestStops = await findNearestStop(selectedStop.location.lat, selectedStop.location.lng);
      if (!nearestStops.length) throw new Error('No matching Transitland stop found.');
      const stop = nearestStops[0];

      // 2. Call new network-based reachability function
      const reachable = await exploreReachableStops(
        stop.onestop_id,
        stop.stop_id,
        stop.stop_name,
        isochroneMinutes
      );

      const mappedReachable = reachable.map(stop => {
        // Use stop.elapsed_minutes or .walkTime or similar field as travel time
        const travelMinutes = stop.elapsed_minutes || stop.walkTime || 0;
        const arrivalTime = addMinutesToClock(startTime, travelMinutes);
        return {
          ...transitlandToGoogleStop(stop, selectedStop.location),
          arrivalTime,
        };
      });
      // Run the AI, then flag the recommended stops in your full list
      // In TransitFinder.js, after getting your mappedReachable array:
      const aiRecommended = await recommendLikelyStopsWithContext(mappedReachable);

      // Make a Set of recommended IDs for fast lookup
      const aiRecommendedSet = new Set(aiRecommended.map(ai =>
        ai.id || (ai.name + '-' + (ai.location?.lat ?? '') + '-' + (ai.location?.lng ?? ''))
      ));

      // Merge back into your stops:
      const stopsWithAI = mappedReachable.map(stop => {
        const thisStopId = stop.id || (stop.name + '-' + (stop.location?.lat ?? '') + '-' + (stop.location?.lng ?? ''));
        const aiStop = aiRecommended.find(ai =>
          (ai.id && ai.id === stop.id) ||
          (!ai.id && ai.name === stop.name && ai.location?.lat === stop.location?.lat && ai.location?.lng === stop.location?.lng)
        );
        return {
          ...stop,
          aiRecommended: aiRecommendedSet.has(thisStopId),
          aiScore: aiStop ? aiStop.aiScore : 0,
          locationContext: aiStop ? aiStop.locationContext : stop.locationContext,
        };
      });

      console.log('AI recommended stops:');
      aiRecommended.forEach(s => console.log(s.name, s.id, s.location));

      setReachableStops(stopsWithAI);
      setAiRecommendedStops(aiRecommended); // You can pass this as a prop to StopsList if desired

      addMarkersToMap([selectedStop, ...mappedReachable], selectedStop.location, hoveredStopId);
      // Add markers to map using reachable (use .lat, .lng, .name, etc)
      // ... map logic as before, just ensure id/lat/lng/name are present ...
    } catch (err) {
      console.error('Transitland reachability error:', err);
      setError('Failed to calculate reachable stops.');
      setShowIsochrone(false);
    } finally {
      setIsochroneLoading(false);
    }
  };


  return (
    <>
    <IntroPopup isOpen={showIntro} onClose={() => setShowIntro(false)} />
    <Box minH="100vh" bg="gray.50">
      <Box bg="green.600" color="white" shadow="md">
        <Container maxW="6xl" py={4}>
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon boxSize={8}><Bus /></Icon>
              <VStack align="start" spacing={0}>
                <Heading size="lg" fontWeight="bold">Transit Finder</Heading>
                <Text fontSize="sm" opacity={0.9}>Discover transit reachability</Text>
              </VStack>
            </HStack>
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="medium">AI4SAR</Text>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="6xl" p={4}>
        <Card.Root bg="white" shadow="xl" borderRadius="2xl" overflow="hidden">
          <Card.Body p={6}>
            <VStack gap={6} align="stretch">
              {apiWarnings.length > 0 && !mapInitialized && (
                <Alert.Root status="warning" borderRadius="lg">
                  <Alert.Indicator />
                  <Box>
                    <Alert.Title mb={2}>Setup Required</Alert.Title>
                    <VStack align="start" gap={1}>
                      {apiWarnings.map((w, i) => <Text key={i} fontSize="sm">• {w}</Text>)}
                    </VStack>
                    <Text fontSize="sm" mt={2}>
                      Currently running in demo mode with simulated API responses.
                    </Text>
                  </Box>
                </Alert.Root>
              )}

              <TransitSearch
                address={address}
                setAddress={setAddress}
                onSearch={handleAddressSearch}
                onUseCurrentLocation={handleUseCurrentLocation}
                loading={loading}
              />

              {showIsochrone && (
                <IsochroneControls
                  selectedStop={selectedStop}
                  isochroneTime={isochroneTime}
                  reachableStops={reachableStops}
                  onClear={clearIsochrone}
                />
              )}

              <TransitMap
                ref={mapRef}
                markerLocation={markerLocation}
                isochroneLoading={isochroneLoading}
                showIsochrone={showIsochrone}
              />

              {showIsochrone && (
                <HStack gap={4} justify="center" fontSize="sm">
                  <HStack gap={1}><Box w={3} h={3} borderRadius="full" bg="red.500" /><Text>Selected Stop</Text></HStack>
                  <HStack gap={1}><Box w={3} h={3} borderRadius="full" bg="orange.500" /><Text>Reachable Stops</Text></HStack>
                </HStack>
              )}

              {loading && (
                <VStack py={8} gap={4}>
                  <Spinner size="xl" color="green.600" borderWidth="4px" />
                  <Text color="gray.600">Finding nearby transit stops...</Text>
                  <Text fontSize="sm" color="gray.500">Searching Google Places for nearby transit stops...</Text>
                </VStack>
              )}

              {error && (
                <Alert.Root status="error" borderRadius="lg">
                  <Alert.Indicator />
                  <Text>{error}</Text>
                </Alert.Root>
              )}

              {transitStops.length > 0 && !loading && (
                <TransitStopsList
                  transitStops={transitStops}
                  selectedStop={selectedStop}
                  reachableStops={reachableStops}
                  showIsochrone={showIsochrone}
                  onStopClick={handleStopClick}
                  onStopHover={setHoveredStopId}
                />
              )}

              {transitStops.length === 0 && !loading && !error && (
                <VStack py={12} gap={4} color="gray.500">
                  <Icon size="2xl" opacity={0.3}><Navigation /></Icon>
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

      {isDrawerOpen && (
        <IsochroneDrawer
          isOpen={isDrawerOpen}
          onClose={(open) => setIsDrawerOpen(open)}
          selectedStop={selectedStop}
          isochroneTime={isochroneTime}
          setIsochroneTime={setIsochroneTime}
          onCalculate={() => handleTransitlandReachability(selectedStop, parseInt(isochroneTime))}
          loading={isochroneLoading}
          startDate={startDate}
          setStartDate={setStartDate}
          startTime={startTime}
          setStartTime={setStartTime}
        />
      )}
    </Box>
    </>
  );
};

export default TransitFinder;
