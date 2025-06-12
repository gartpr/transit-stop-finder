// src/App.js
import React from 'react';
import { Box } from '@chakra-ui/react';
import TransitFinder from './components/TransitFinder';

function App() {
  return (
    <Box minH="100vh">
      <TransitFinder />
    </Box>
  );
}

export default App;