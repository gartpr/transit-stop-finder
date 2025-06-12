import React from 'react';
import { VStack, Heading, SimpleGrid, Box, Text } from '@chakra-ui/react';
import TransitStopCard from './StopCard';

const TransitStopsList = ({
  transitStops,
  selectedStop,
  reachableStops,
  showIsochrone,
  onStopClick,
  aiRecommendedStops = [],
}) => {
  const stopsToShow = showIsochrone
    ? [selectedStop, ...reachableStops].filter(Boolean)
    : transitStops;

  return (
    <VStack gap={4} align="stretch">
      {/* AI Recommendations Section */}
      {showIsochrone && aiRecommendedStops && aiRecommendedStops.length > 0 && (
        <Box mb={2} p={3} bg="purple.50" borderRadius="lg">
          <Text fontWeight="bold" color="purple.800" mb={1}>
            AI Recommendation
          </Text>
          <Text fontSize="sm" color="gray.700" mb={2}>
            Based on nearby parks, hospitals, and other features, these stops are recommended:
          </Text>
          <VStack align="stretch">
            {aiRecommendedStops.map(stop => (
              <Text key={stop.id} color="purple.700">
                {stop.name} (Arrives at {stop.arrivalTime})
              </Text>
            ))}
          </VStack>
        </Box>
      )}

      <Heading size="lg" color="gray.800">
        {showIsochrone
          ? `Reachable from ${selectedStop?.name} (${reachableStops.length + 1} stops)`
          : `Nearby Transit Stops (${transitStops.length} found)`}
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {stopsToShow.map((stop, i) => (
          <TransitStopCard
            key={
              (stop.source ? stop.source + '-' : '') +
              (stop.id || stop.stop_id || '') +
              '-' +
              (stop.location?.lat || stop.lat || '') +
              '-' +
              (stop.location?.lng || stop.lng || '') +
              '-' + i
            }
            stop={stop}
            isSelected={selectedStop?.id === stop.id}
            isReachable={showIsochrone && reachableStops.some(s => s.id === stop.id)}
            showIsochrone={showIsochrone}
            onStopClick={onStopClick}
          />
        ))}
      </SimpleGrid>
    </VStack>
  );
};

export default TransitStopsList;
