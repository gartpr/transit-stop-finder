//StopCard.js
import React from 'react';
import {
  Card,
  Box,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  Flex,
  Icon,
  Separator
} from '@chakra-ui/react';
import { Bus, Train, MapPin, Clock, Route } from 'lucide-react';
import { formatDistance } from '../utils/helpers';
import { getTransitColorScheme } from '../utils/mapHelpers';

const TransitStopCard = ({ 
  stop, 
  isSelected, 
  isReachable, 
  showIsochrone,
  onStopClick
}) => {
  const getIcon = () => {
    switch (stop.type) {
      case 'bus': return <Bus />;
      case 'train': return <Train />;
      default: return <MapPin />;
    }
  };

  const getColorScheme = () => {
    if (isSelected) return 'red';
    if (isReachable) return 'orange';
    return stop.type === 'bus' ? 'green' : stop.type === 'train' ? 'teal' : 'purple';
  };

  return (
    <Card.Root
      variant="outline"
      borderColor={isSelected ? "red.500" : isReachable ? "orange.500" : "gray.200"}
      borderWidth={isSelected || isReachable ? "2px" : "1px"}
      _hover={{ shadow: "lg", borderColor: "green.300" }}
      transition="all 0.2s"
      cursor="pointer"
      onClick={() => !showIsochrone && onStopClick(stop)}
    >
      <Card.Body p={5}>
        <Flex justify="space-between" mb={3}>
          <HStack gap={3} align="start">
            <Box
              p={2}
              borderRadius="lg"
              bg={`${getColorScheme()}.100`}
              color={`${getColorScheme()}.800`}
              borderWidth="1px"
              borderColor={`${getColorScheme()}.200`}
            >
              <Icon>{getIcon()}</Icon>
            </Box>
            <Box>
              <Text fontWeight="semibold" color="gray.800">
                {stop.name}
                {isSelected && <Badge ml={2} colorScheme="red" size="sm">Origin</Badge>}
              </Text>
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
            {stop.distance !== undefined && (
              <>
                <Text fontSize="lg" fontWeight="bold" color="green.600">
                  {formatDistance(stop.distance)}
                </Text>
                <HStack gap={1}>
                  <Icon size="sm" color="gray.500">
                    <Clock />
                  </Icon>
                  <Text fontSize="sm" color="gray.500">{stop.walkTime} min walk</Text>
                </HStack>
              </>
            )}
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
                    colorScheme="gray"
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

        {!showIsochrone && (
          <Box mt={4} pt={3} borderTopWidth="1px">
            <Button
              colorScheme="teal"
              variant="ghost"
              size="sm"
              width="full"
              onClick={(e) => {
                e.stopPropagation();
                onStopClick(stop);
              }}
            >
              <Icon size="sm">
                <Route />
              </Icon>
              Reachable Stops
            </Button>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
};

export default TransitStopCard;
