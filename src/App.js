import React from 'react';
import { Box } from '@chakra-ui/react';
import TransitFinder from './components/TransitFinder';

function App() {
  return (
    <Box minH="100vh" bgGradient="to-br" gradientFrom="blue.50" gradientTo="indigo.100">
      <TransitFinder />
    </Box>
  );
}

export default App;