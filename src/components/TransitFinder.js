import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Input, 
  Button, 
  Alert, 
  Grid, 
  Badge, 
  Icon, 
  Flex, 
  Spinner,
  Card,
  InputGroup,
  IconButton,
  Separator
} from '@chakra-ui/react';
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
    initializeGoogleMaps();
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
        return Bus;
      case 'train':
        return Train;
      default:
        return MapPin;
    }
  };

  const getTransitColorScheme = (type) => {
    switch (type) {
      case 'bus':
        return 'blue';
      case 'train':
        return 'green';
      default:
        return 'purple';
    }
  };

  return (
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
            <VStack gap={3} align="stretch">
              <HStack gap={3}>
                <InputGroup flex={1}>
                  <Input
                    placeholder="Enter an address or location..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                    size="lg"
                  />
                </InputGroup>
                <Button
                  onClick={handleAddressSearch}
                  loading={loading}
                  colorPalette="blue"
                  size="lg"
                >
                  <Search />
                  Search
                </Button>
              </HStack>
              
              <Button
                variant="ghost"
                colorPalette="blue"
                onClick={handleUseCurrentLocation}
                disabled={loading}
                size="sm"
              >
                <MapPin />
                Use my current location
              </Button>
            </VStack>

            {/* Map */}
            <Box
              ref={mapRef}
              h="400px"
              bgGradient="to-br"
              gradientFrom="gray.100"
              gradientTo="gray.200"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="gray.200"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <VStack gap={3} color="gray.500">
                <Icon size="xl" opacity={0.5}>
                  <MapPin />
                </Icon>
                <Text fontWeight="medium">Interactive Map</Text>
                <Text fontSize="sm">Google Maps integration ready</Text>
                {markerLocation && (
                  <Box mt={3} color="blue.600" textAlign="center">
                    <Text fontSize="sm" fontWeight="medium">Search Location:</Text>
                    <Text fontSize="xs">{markerLocation.lat.toFixed(4)}, {markerLocation.lng.toFixed(4)}</Text>
                  </Box>
                )}
              </VStack>
            </Box>

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
              <VStack gap={4} align="stretch">
                <Heading size="lg" color="gray.800">
                  Nearby Transit Stops ({transitStops.length} found)
                </Heading>
                
                <Grid columns={{ base: 1, md: 2 }} gap={4}>
                  {transitStops.map((stop) => (
                    <Card.Root
                      key={stop.id}
                      variant="outline"
                      _hover={{ shadow: "lg", borderColor: "blue.200" }}
                      transition="all 0.2s"
                    >
                      <Card.Body p={5}>
                        <Flex justify="space-between" mb={3}>
                          <HStack gap={3} align="start">
                            <Box
                              p={2}
                              borderRadius="lg"
                              bg={`${getTransitColorScheme(stop.type)}.100`}
                              color={`${getTransitColorScheme(stop.type)}.800`}
                              borderWidth="1px"
                              borderColor={`${getTransitColorScheme(stop.type)}.200`}
                            >
                              <Icon>
                                {getTransitIcon(stop.type) === Bus ? <Bus /> : 
                                 getTransitIcon(stop.type) === Train ? <Train /> : <MapPin />}
                              </Icon>
                            </Box>
                            <Box>
                              <Text fontWeight="semibold" color="gray.800">{stop.name}</Text>
                              <Text fontSize="sm" color="gray.600">{stop.address}</Text>
                              {stop.rating && (
                                <HStack gap={1} mt={1}>
                                  <Text color="yellow.600" fontSize="sm">★</Text>
                                  <Text color="yellow.600" fontSize="sm">{stop.rating.toFixed(1)}</Text>
                                </HStack>
                              )}
                            </Box>
                          </HStack>
                          <VStack align="end" gap={0}>
                            <Text fontSize="lg" fontWeight="bold" color="blue.600">
                              {formatDistance(stop.distance)}
                            </Text>
                            <HStack gap={1}>
                              <Icon size="sm" color="gray.500">
                                <Clock />
                              </Icon>
                              <Text fontSize="sm" color="gray.500">{stop.walkTime} min walk</Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.400" textTransform="capitalize" mt={1}>
                              {stop.source}
                            </Text>
                          </VStack>
                        </Flex>
                        
                        {stop.routes && stop.routes.length > 0 && (
                          <>
                            <Separator my={3} />
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb={2}>Available Routes:</Text>
                              <Flex wrap="wrap" gap={2}>
                                {stop.routes.map((route, index) => (
                                  <Badge
                                    key={index}
                                    variant="subtle"
                                    colorPalette="gray"
                                    borderRadius="full"
                                    px={2}
                                    py={1}
                                    fontSize="xs"
                                  >
                                    {route}
                                  </Badge>
                                ))}
                              </Flex>
                            </Box>
                          </>
                        )}
                        
                        <Box mt={4} pt={3} borderTopWidth="1px">
                          <Button
                            colorPalette="blue"
                            variant="ghost"
                            size="sm"
                            width="full"
                          >
                            Get Directions
                          </Button>
                        </Box>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </Grid>
              </VStack>
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
  );
};

export default TransitFinder;