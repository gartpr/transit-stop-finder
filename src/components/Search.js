import React from 'react';
import { 
  VStack, 
  HStack, 
  Input, 
  Button, 
  InputGroup,
  Icon
} from '@chakra-ui/react';
import { MapPin, Search } from 'lucide-react';

const TransitSearch = ({ 
  address, 
  setAddress, 
  onSearch, 
  onUseCurrentLocation, 
  loading 
}) => {
  return (
    <VStack gap={3} align="stretch">
      <HStack gap={3}>
        <InputGroup flex={1}>
          <Input
            placeholder="Enter an address or location..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            size="lg"
          />
        </InputGroup>
        <Button
          onClick={onSearch}
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
        onClick={onUseCurrentLocation}
        disabled={loading}
        size="sm"
      >
        <MapPin />
        Use my current location
      </Button>
    </VStack>
  );
};

export default TransitSearch;