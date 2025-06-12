import React from 'react';
import {
  Drawer,
  Box,
  VStack,
  Text,
  Button,
  Alert,
  Icon,
  ButtonGroup,
  Input,
} from '@chakra-ui/react';
import { Route } from 'lucide-react';

const IsochroneDrawer = ({
  isOpen,
  onClose,
  selectedStop,
  isochroneTime,
  setIsochroneTime,
  onCalculate,
  loading,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
}) => {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(e) => onClose(e.open)} placement="end" size="md">
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
              {/* Date and time pickers */}
              <Box>
                <Text fontWeight="semibold" mb={1}>Date</Text>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  maxW="200px"
                />
                <Text fontWeight="semibold" mb={1} mt={4}>Start Time</Text>
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  maxW="150px"
                />
              </Box>

              {/* Time selector using buttons */}
              <Box>
                <Text fontWeight="semibold" mb={3}>Travel Time Limit</Text>
                <ButtonGroup isAttached variant="outline" colorScheme="green" flexWrap="wrap">
                  {['15', '30', '45', '60', '90', '120', '180', '240'].map((time) => (
                    <Button
                      key={time}
                      onClick={() => setIsochroneTime(time)}
                      variant={isochroneTime === time ? 'solid' : 'outline'}
                      colorScheme="green"
                      flex="1 1 40%"
                      m={1}
                    >
                      {time} min
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              {/* Info alert */}
              <Alert.Root status="info" borderRadius="lg">
                <Alert.Indicator />
                <Box>
                  <Alert.Title>How it works</Alert.Title>
                  <Text fontSize="sm" mt={2}>
                    This feature shows all transit stops you can reach within the selected time limit,
                    including walking and waiting time estimates. The displayed arrival time for each stop
                    is calculated by adding the travel time to your selected start time.
                  </Text>
                </Box>
              </Alert.Root>

              {/* Submit button */}
              <Button
                colorPalette="green"
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
