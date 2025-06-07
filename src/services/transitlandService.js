// src/services/transitlandService.js
import { API_CONFIG } from '../config/apiKeys';

class TransitlandService {
  async findNearbyStops(location, radius = API_CONFIG.DEFAULT_SEARCH_RADIUS) {
    try {
      const url = `${API_CONFIG.TRANSITLAND_BASE_URL}/stops?lat=${location.lat}&lon=${location.lng}&radius=${radius}&limit=20`;
      
      const headers = {
        'Accept': 'application/json',
      };
      
      if (API_CONFIG.TRANSITLAND_API_KEY) {
        headers['Authorization'] = `Bearer ${API_CONFIG.TRANSITLAND_API_KEY}`;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Transitland API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.stops?.map(stop => ({
        id: stop.onestop_id,
        name: stop.stop_name,
        type: 'transit',
        location: {
          lat: stop.geometry.coordinates[1],
          lng: stop.geometry.coordinates[0]
        },
        address: stop.stop_name,
        routes: stop.route_stops?.map(rs => rs.route?.route_short_name).filter(Boolean) || [],
        source: 'transitland'
      })) || [];
      
    } catch (error) {
      console.warn('Transitland API error:', error);
      return [];
    }
  }

  async getStopDetails(stopId) {
    try {
      const url = `${API_CONFIG.TRANSITLAND_BASE_URL}/stops/${stopId}`;
      const headers = {
        'Accept': 'application/json',
      };
      
      if (API_CONFIG.TRANSITLAND_API_KEY) {
        headers['Authorization'] = `Bearer ${API_CONFIG.TRANSITLAND_API_KEY}`;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Transitland API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Transitland stop details error:', error);
      return null;
    }
  }
}

export default new TransitlandService();