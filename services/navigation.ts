// services/navigation.ts

import { Route } from '../types/navigation';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''; // Replace with your actual API key

export class NavigationService {
  /**
   * Get directions from origin to destination using Google Directions API
   */
  static async getDirections(origin: string, destination: string): Promise<Route | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        return data.routes[0];
      }

      console.error('Directions API error:', data.status, data.error_message);
      return null;
    } catch (error) {
      console.error('Error fetching directions:', error);
      return null;
    }
  }

  /**
   * Decode Google's encoded polyline format into coordinates
   */
  static decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  /**
   * Get appropriate icon name for turn maneuvers
   */
  static getManeuverIcon(maneuver?: string): string {
    const maneuverMap: { [key: string]: string } = {
      'turn-left': 'arrow-back',
      'turn-right': 'arrow-forward',
      'turn-slight-left': 'arrow-back',
      'turn-slight-right': 'arrow-forward',
      'turn-sharp-left': 'arrow-back',
      'turn-sharp-right': 'arrow-forward',
      'uturn-left': 'return-down-back',
      'uturn-right': 'return-down-forward',
      'ramp-left': 'trending-up',
      'ramp-right': 'trending-up',
      'merge': 'git-merge',
      'fork-left': 'git-branch',
      'fork-right': 'git-branch',
      'ferry': 'boat',
      'ferry-train': 'train',
      'roundabout-left': 'reload',
      'roundabout-right': 'reload',
      'straight': 'arrow-up',
      'keep-left': 'arrow-back',
      'keep-right': 'arrow-forward',
    };

    return maneuverMap[maneuver || ''] || 'arrow-forward';
  }

  /**
   * Strip HTML tags and decode entities from instruction text
   */
  static formatInstructions(htmlInstructions: string): string {
    // Remove HTML tags
    let text = htmlInstructions.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    return text.trim();
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  static calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.latitude * Math.PI) / 180;
    const φ2 = (loc2.latitude * Math.PI) / 180;
    const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate bearing/heading from one point to another
   * Returns bearing in degrees (0-360)
   */
  static calculateBearing(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number }
  ): number {
    const startLat = (start.latitude * Math.PI) / 180;
    const startLng = (start.longitude * Math.PI) / 180;
    const endLat = (end.latitude * Math.PI) / 180;
    const endLng = (end.longitude * Math.PI) / 180;

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  /**
   * Check if current location is near a target point
   */
  static isNearPoint(
    currentLocation: { latitude: number; longitude: number },
    targetLocation: { latitude: number; longitude: number },
    thresholdMeters: number = 50
  ): boolean {
    const distance = this.calculateDistance(currentLocation, targetLocation);
    return distance <= thresholdMeters;
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} sec`;
    }
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} min`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get ETA (Estimated Time of Arrival)
   */
  static getETA(durationSeconds: number): Date {
    const now = new Date();
    return new Date(now.getTime() + durationSeconds * 1000);
  }

  /**
   * Check if user is off route
   */
  static isOffRoute(
    currentLocation: { latitude: number; longitude: number },
    routeCoordinates: Array<{ latitude: number; longitude: number }>,
    thresholdMeters: number = 100
  ): boolean {
    if (routeCoordinates.length === 0) return false;

    // Find minimum distance to any point on the route
    let minDistance = Infinity;
    for (const point of routeCoordinates) {
      const distance = this.calculateDistance(currentLocation, point);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance > thresholdMeters;
  }
}