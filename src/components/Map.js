// src/components/Map.js
import React, { forwardRef } from 'react';
import { Box, VStack, Text, Icon, Spinner } from '@chakra-ui/react';
import { MapPin } from 'lucide-react';

const TransitMap = forwardRef(({ markerLocation, isochroneLoading }, ref) => {
  return (
    <Box position="relative">
      <Box
        ref={ref}
        h="400px"
        bgGradient="to-br"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack gap={3} color="gray.500">
          <Icon as={MapPin} boxSize={6} opacity={0.5} />
          <Text fontWeight="medium">Interactive Map</Text>
          <Text fontSize="sm">Click on a stop to see reachable destinations</Text>
          {markerLocation && (
            <Box mt={3} textAlign="center">
              <Text fontSize="sm" fontWeight="medium" color="blue.600">
                Search Location:
              </Text>
              <Text fontSize="xs">{markerLocation.lat.toFixed(4)}, {markerLocation.lng.toFixed(4)}</Text>
            </Box>
          )}
        </VStack>
      </Box>

      {isochroneLoading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="whiteAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="lg"
          zIndex={10}
        >
          <VStack gap={3}>
            <Spinner size="xl" color="blue.600" thickness="4px" />
            <Text color="gray.700">Calculating reachable stops...</Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
});

TransitMap.displayName = 'TransitMap';

export default TransitMap;
