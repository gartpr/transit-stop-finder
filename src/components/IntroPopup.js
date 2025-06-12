import React from 'react';
import { Box, Button, Text, Portal } from '@chakra-ui/react';

const overlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.35)",
  zIndex: 1400,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const IntroPopup = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <Portal>
      <Box style={overlayStyle}>
        <Box
          bg="white"
          borderRadius="xl"
          boxShadow="2xl"
          maxW="lg"
          w={{ base: "95vw", md: "36rem" }}
          p={8}
          position="relative"
        >
          <Text fontSize="2xl" fontWeight="bold" mb={4}>Welcome to Transit Finder</Text>
          <Text mb={4}>
            <b>Transit Finder</b> helps you visualize where you (or someone) can reach by public transit from a selected stop, at a chosen time.
          </Text>
          <Text mb={2}><b>How to use:</b></Text>
          <Box as="ul" pl={6} mb={2}>
            <li>Pick a location using search or your current location.</li>
            <li>Select a transit stop to see reachability and AI recommendations.</li>
            <li>Review stop info for AI hints, nearby points of interest, and arrival times.</li>
          </Box>
          <Text fontSize="sm" color="gray.500" mt={2}>
            <i>Arrival times are estimates based on schedules.</i>
          </Text>
          <Button mt={6} colorScheme="green" onClick={onClose}>Get Started</Button>
        </Box>
      </Box>
    </Portal>
  );
};

export default IntroPopup;
