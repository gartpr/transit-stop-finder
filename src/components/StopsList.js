import React from 'react';
import { VStack, Heading, Grid } from '@chakra-ui/react';
import TransitStopCard from './StopCard';

const TransitStopsList = ({ 
  transitStops, 
  selectedStop, 
  reachableStops, 
  showIsochrone,
  onStopClick,
  onGetDirections 
}) => {
  const stopsToShow = showIsochrone 
    ? [selectedStop, ...reachableStops].filter(Boolean)
    : transitStops;

  return (
    <VStack gap={4} align="stretch">
      <Heading size="lg" color="gray.800">
        {showIsochrone 
          ? `Reachable from ${selectedStop?.name} (${reachableStops.length + 1} stops)`
          : `Nearby Transit Stops (${transitStops.length} found)`}
      </Heading>
      
      <Grid columns={{ base: 1, md: 2 }} gap={4}>
        {stopsToShow.map((stop) => (
          <TransitStopCard
            key={stop.id}
            stop={stop}
            isSelected={selectedStop?.id === stop.id}
            isReachable={showIsochrone && reachableStops.some(s => s.id === stop.id)}
            showIsochrone={showIsochrone}
            onStopClick={onStopClick}
            onGetDirections={onGetDirections}
          />
        ))}
      </Grid>
    </VStack>
  );
};

export default TransitStopsList;