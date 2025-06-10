import React from 'react';
import {
  Drawer,
  Box,
  VStack,
  Text,
  Button,
  Alert,
  RadioGroup,
  Icon
} from '@chakra-ui/react';
import { Route } from 'lucide-react';

const IsochroneDrawer = ({ 
  isOpen, 
  onClose, 
  selectedStop, 
  isochroneTime, 
  setIsochroneTime,
  onCalculate,
  loading 
}) => {
  return (
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(e) => onClose(e.open)} 
      placement="end" 
      size="md"
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              <VStack align="start" gap={1}>
                <Text>Transit Reachability</Text>
                <Text fontSize="sm" fontWeight="normal" color="gray.600">
                  From: {selectedStop?.name}
                </Text>
              </VStack>
            </Drawer.Title>
            <Drawer.CloseTrigger />
          </Drawer.Header>
          <Drawer.Body>
            <VStack gap={6} align="stretch">
              <Box>
                <Text fontWeight="semibold" mb={3}>Travel Time Limit</Text>
                <RadioGroup.Root value={isochroneTime} onValueChange={(details) => {
                  console.log('Time selected:', details.value);
                  setIsochroneTime(details.value);
                }}>
                  <VStack align="stretch" gap={2}>
                    <RadioGroup.Item value="15">
                      <RadioGroup.ItemControl />
                      <RadioGroup.ItemText>15 minutes</RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="30">
                      <RadioGroup.ItemControl />
                      <RadioGroup.ItemText>30 minutes</RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="45">
                      <RadioGroup.ItemControl />
                      <RadioGroup.ItemText>45 minutes</RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="60">
                      <RadioGroup.ItemControl />
                      <RadioGroup.ItemText>60 minutes</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  </VStack>
                </RadioGroup.Root>
              </Box>

              <Alert.Root status="info" borderRadius="lg">
                <Alert.Indicator />
                <Box>
                  <Alert.Title>How it works</Alert.Title>
                  <Text fontSize="sm" mt={2}>
                    This feature shows all transit stops you can reach within the selected time limit, 
                    including walking and waiting time estimates.
                  </Text>
                </Box>
              </Alert.Root>

              <Button
                colorPalette="blue"
                size="lg"
                onClick={onCalculate}
                loading={loading}
              >
                <Icon size="sm">
                  <Route />
                </Icon>
                Calculate Reachable Stops
              </Button>
            </VStack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};

export default IsochroneDrawer;