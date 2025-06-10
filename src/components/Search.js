// src/components/Search.js
import React from 'react';
import {
  VStack,
  HStack,
  Input,
  Button,
  InputGroup
} from '@chakra-ui/react';
import { MapPin, Search } from 'lucide-react';

const TransitSearch = ({ address, setAddress, onSearch, onUseCurrentLocation, loading }) => {
  return (
    <VStack gap={3} align="stretch">
      <HStack gap={3}>
        <InputGroup flex={1}>
          <Input
            placeholder="Enter an address or location..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            size="lg"
            borderColor="gray.300"
            _hover={{ borderColor: 'green.400' }}
            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #22c55e' }}
          />
        </InputGroup>
        <Button
          onClick={onSearch}
          isLoading={loading}
          colorScheme="green"
          size="lg"
          leftIcon={<Search size={18} />}
        >
          Search
        </Button>
      </HStack>

      <Button
        variant="ghost"
        colorScheme="green"
        onClick={onUseCurrentLocation}
        isDisabled={loading}
        size="sm"
      >
        <MapPin/>
        Use my current location
      </Button>
    </VStack>
  );
};

export default TransitSearch;
