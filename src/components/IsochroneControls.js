import React from 'react';
import { Card, VStack, HStack, Text, Box, IconButton, Badge } from '@chakra-ui/react';
import { X } from 'lucide-react';

const IsochroneControls = ({ 
  selectedStop, 
  isochroneTime, 
  reachableStops, 
  onClear 
}) => {
  return (
    <Card.Root variant="subtle" bg="blue.50">
      <Card.Body p={4}>
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontWeight="bold" color="blue.800">
                Showing stops reachable from: {selectedStop?.name}
              </Text>
              <Text fontSize="sm" color="blue.700">
                Within {isochroneTime} minutes by transit
              </Text>
            </VStack>
            <IconButton
              onClick={onClear}
              variant="ghost"
              colorPalette="blue"
              size="sm"
            >
              <X />
            </IconButton>
          </HStack>
          {reachableStops.length > 0 && (
            <Text fontSize="sm" color="blue.700">
              Found {reachableStops.length} reachable stops
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};

export default IsochroneControls;