// src/components/IsochroneControls.js
import React from 'react';
import {
  Box,
  HStack,
  Text,
  Button,
  Badge,
  VStack
} from '@chakra-ui/react';

const IsochroneControls = ({
  selectedStop,
  isochroneTime,
  reachableStops,
  onClear
}) => {
  const readableTime = `${isochroneTime} min${isochroneTime === '1' ? '' : 's'}`;

  return (
    <Box bg="green.50" borderWidth={1} borderColor="green.200" borderRadius="xl" px={5} py={4}>
      <VStack align="start" spacing={3}>
        <Text fontSize="sm">
          Showing stops reachable from{' '}
          <Badge colorScheme="green" variant="solid" px={2} py={1} borderRadius="md">
            {selectedStop?.name || 'Selected Stop'}
          </Badge>{' '}
          within{' '}
          <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="md">
            {readableTime}
          </Badge>
        </Text>

        <HStack spacing={4} wrap="wrap">
          <Text fontSize="sm" color="gray.700">
            {reachableStops.length} reachable stops found.
          </Text>

          <Button colorScheme="green" variant="outline" size="sm" onClick={onClear}>
            Clear Isochrone
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default React.memo(IsochroneControls);
