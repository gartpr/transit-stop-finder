// src/services/overpassService.js
import { API_CONFIG } from '../config/apiKeys';

class OverpassService {
  async findNearbyTransit(location, radiusKm = API_CONFIG.DEFAULT_SEARCH_RADIUS / 1000) {
    try {
      const bbox = this.getBoundingBox(location, radiusKm);
      const query = `
        [out:json][timeout:25];
        (
          node["public_transport"~"stop_position|platform"]["highway"!="bus_stop"](${bbox});
          node["railway"~"station|halt|tram_stop"](${bbox});
          node["highway"="bus_stop"](${bbox});
        );
        out body;
      `;

      const response = await fetch(API_CONFIG.OVERPASS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.elements?.map(element => ({
        id: `osm_${element.id}`,
        name: element.tags?.name || 'Unnamed Stop',
        type: this.determineTransitType(element.tags),
        location: {
          lat: element.lat,
          lng: element.lon
        },
        address: element.tags?.['addr:full'] || element.tags?.name || 'Address not available',
        source: 'osm'
      })) || [];
      
    } catch (error) {
      console.warn('Overpass API error:', error);
      return [];
    }
  }

  getBoundingBox(center, radiusKm) {
    const lat = center.lat;
    const lng = center.lng;
    const latOffset = radiusKm / 111.32; // degrees latitude per km
    const lngOffset = radiusKm / (40075 * Math.cos(lat * Math.PI / 180) / 360);
    
    return `${lat - latOffset},${lng - lngOffset},${lat + latOffset},${lng + lngOffset}`;
  }

  determineTransitType(tags) {
    if (tags?.railway) return 'train';
    if (tags?.highway === 'bus_stop') return 'bus';
    if (tags?.public_transport) return 'transit';
    return 'transit';
  }
}

export default new OverpassService();