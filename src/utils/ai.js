// src/utils/ai.js

import GoogleMapsService from '../services/googleMapsService';

export async function getLocationContext(
  stop,
  placeTypes = ['park', 'hospital', 'school', 'shopping_mall', 'police', 'transit_station'],
  radius = 500
) {
  const results = {};
  if (!stop || !stop.location) return results;

  for (const type of placeTypes) {
    try {
      // Give Google API a tiny break to prevent rate limiting (optional)
      await new Promise(r => setTimeout(r, 50));
      const places = await GoogleMapsService.findNearbyPlaces(stop.location, type, radius);
      results[type] = (places || []).length;
    } catch {
      results[type] = 0;
    }
  }
  return results;
}

export async function recommendLikelyStopsWithContext(stops) {
  // For debugging: print all stops' names and locations
  stops.forEach(s =>
    console.log(`Stop: ${s.name} - ${JSON.stringify(s.location)}`)
  );

  // 1. Get context for each stop individually
  const enrichedStops = await Promise.all(
    stops.map(async stop => {
      const context = await getLocationContext(stop);
      // Print results for visibility
      console.log(`Context for ${stop.name}:`, context);
      return { ...stop, locationContext: context };
    })
  );

  // 2. Score as before
  const maxTime = Math.max(...enrichedStops.map(s => s.elapsed_minutes || s.walkTime || 0));
  enrichedStops.forEach(stop => {
    const ctx = stop.locationContext || {};
    stop.aiScore =
      (ctx.park || 0) * 2.0 +
      (ctx.hospital || 0) * 1.5 +
      (ctx.police || 0) * 1.2 +
      (ctx.school || 0) * 0.8 +
      (ctx.shopping_mall || 0) * 0.5 +
      ((stop.elapsed_minutes || stop.walkTime || 0) / (maxTime || 1)) * 0.5 +
      Math.random() * 0.05;
  });

  enrichedStops.sort((a, b) => b.aiScore - a.aiScore);
  const top = enrichedStops.slice(0, 3).map(s => ({ ...s, aiRecommended: true }));

  return top;
}
