// src/services/transitlandService.js

import { API_CONFIG } from '../config/apiKeys';

const BASE_URL = 'https://transit.land/api/v2/rest';

// 1. Find nearest stop by coordinates
export const findNearestStop = async (lat, lon) => {
  const url = `${BASE_URL}/stops?lon=${lon}&lat=${lat}&radius=20&apikey=${API_CONFIG.TRANSITLAND_API_KEY}`;
  console.log(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch nearest stop');
  const data = await response.json();
  return data.stops;
};

// 2. Get all routes serving that stop
export const getRoutesForStop = async (stopOnestopId) => {
  console.log("here")
  const url = `${BASE_URL}/routes?served_by_stop_onestop_id=${stopOnestopId}&apikey=${API_CONFIG.TRANSITLAND_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch routes for stop');
  const data = await response.json();
  return data.routes;
};

// 3. Get schedule pairs (trips from a stop within a time window)
// Change base URL for schedule stop pairs
export const getDepartures = async (stopOnestopId, timeFrom, timeTo) => {
  const url = `${BASE_URL}/stops/${stopOnestopId}/departures`
    + `?start_time=${timeFrom}&end_time=${timeTo}`
    + `&limit=100&apikey=${API_CONFIG.TRANSITLAND_API_KEY}`;
    

  console.log(url);

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch departures');

  const data = await res.json();
  return data.departures || []; // <--- fallback to empty array
};

// Helper for time difference in minutes
function timeDiffMinutes(t1, t2) {
  const [h1, m1, s1] = t1.split(":").map(Number);
  const [h2, m2, s2] = t2.split(":").map(Number);
  let min1 = h1 * 60 + m1 + (s1 || 0) / 60;
  let min2 = h2 * 60 + m2 + (s2 || 0) / 60;
  let diff = min2 - min1;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// Get departures from stop (returns full API result for access to trips, etc.)
export async function getStopDeparturesFull(stopId) {
  const url = `${BASE_URL}/stops/${stopId}/departures?relative_date=TODAY&next=3600&limit=1000&apikey=${API_CONFIG.TRANSITLAND_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch departures for ${stopId}`);
  const data = await res.json();
  return data.stops && data.stops.length > 0 ? data.stops[0].departures : [];
}

// Fetch trip with full stop_times
export async function fetchTripStopTimes(routeOnestopId, tripId, serviceDate) {
  const url = `${BASE_URL}/routes/${routeOnestopId}/trips/${tripId}?include_stops=true&service_date=${serviceDate}&apikey=${API_CONFIG.TRANSITLAND_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch trip stop times');
  const data = await res.json();
  return data.trips[0];
}

// Parse stop_times from API result
function parseStopTimes(tripJson) {
  return tripJson.stop_times
    .map(st => ({
      stop_sequence: st.stop_sequence,
      stop_onestop_id: st.stop?.onestop_id,
      stop_id: st.stop?.stop_id,
      stop_name: st.stop?.stop_name,
      lat: st.stop?.geometry?.coordinates?.[1],
      lng: st.stop?.geometry?.coordinates?.[0],
      arrival: st.arrival_time,
      departure: st.departure_time,
    }))
    .sort((a, b) => a.stop_sequence - b.stop_sequence);
}

/**
 * BFS-like traversal: what stops are reachable from this stop via a single trip within X minutes?
 * @param {string} originOnestopId - Transitland stop onestop_id
 * @param {string} gtfsStopId - GTFS stop_id (for matching sequence)
 * @param {string} stopName - Stop name (to ensure correct origin in the trip)
 * @param {number} maxMinutes - Max travel time in minutes
 * @returns {Promise<Array>} - Array of reachable stop objects, each with from_stop, to_stop, route, headsign, elapsed_minutes, and coordinates
 */
export async function exploreReachableStops(originOnestopId, gtfsStopId, stopName, maxMinutes = 30) {
  // 1. Get all departures from this stop in the next hour
  const departures = await getStopDeparturesFull(originOnestopId);
  const targetTrip = departures.find(d => d.trip && d.trip.route && d.trip.trip_headsign);
  if (!targetTrip) throw new Error('No valid trip found for this stop');

  const tripInfo = targetTrip.trip;
  const routeId = tripInfo.route.onestop_id;
  const tripHeadsign = tripInfo.trip_headsign;
  const serviceDate = targetTrip.service_date;

  // 2. Fetch all stop_times for this trip
  const tripJson = await fetchTripStopTimes(routeId, tripInfo.id, serviceDate);
  const stopList = parseStopTimes(tripJson);

  // 3. Find the origin index
  const originIdx = stopList.findIndex(s => s.stop_id === gtfsStopId && s.stop_name === stopName);
  if (originIdx === -1) throw new Error('Origin stop not found in trip');

  // 4. Calculate travel times
  const rideMinutes = [];
  for (let i = 1; i < stopList.length; i++) {
    rideMinutes.push(timeDiffMinutes(stopList[i - 1].departure, stopList[i].arrival));
  }
  rideMinutes.push(timeDiffMinutes(stopList[stopList.length - 1].departure, stopList[1].arrival)); // wrap

  // 5. Traverse stops
  let reachableStops = [];
  let i = originIdx;
  let totalMinutes = 0;
  let loops = 0;
  const maxLoops = 10;
  while (totalMinutes <= maxMinutes && loops < maxLoops) {
    const nextIdx = (i + 1) % stopList.length;
    if (nextIdx === 0) {
      i = nextIdx;
      loops++;
      continue;
    }
    const prev = stopList[i];
    const curr = stopList[nextIdx];

    const rideIdx = i % (stopList.length - 1);
    const rideTime = rideMinutes[rideIdx];
    totalMinutes += rideTime;

    if (totalMinutes > maxMinutes) break;

    reachableStops.push({
      from_stop: prev.stop_name,
      to_stop: curr.stop_name,
      route: tripInfo.route.route_short_name || tripInfo.route.route_long_name,
      headsign: tripHeadsign,
      elapsed_minutes: Math.floor(totalMinutes),
      id: curr.stop_onestop_id,
      stop_id: curr.stop_id,
      name: curr.stop_name,
      lat: curr.lat,
      lng: curr.lng,
      source: 'transitland'
    });

    i = nextIdx;
  }

  return reachableStops;
}
