// services/navigation.ts

import { Route } from '../types/navigation';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface DirectionsError {
  type: 'network' | 'api_key' | 'quota' | 'not_found' | 'unknown';
  message: string;
  retryable: boolean;
}

export class NavigationService {
  /**
   * Validate API key configuration
   */
  static validateApiKey(): boolean {
    return GOOGLE_MAPS_API_KEY.length > 0;
  }

  /**
   * Get user-friendly error message based on API response
   */
  static getDirectionsError(status: string, errorMessage?: string): DirectionsError {
    switch (status) {
      case 'REQUEST_DENIED':
        return {
          type: 'api_key',
          message: 'Google Maps API key is invalid or missing. Please check your configuration.',
          retryable: false
        };
      case 'OVER_QUERY_LIMIT':
        return {
          type: 'quota',
          message: 'Daily API quota exceeded. Please try again later.',
          retryable: true
        };
      case 'NOT_FOUND':
      case 'ZERO_RESULTS':
        return {
          type: 'not_found',
          message: 'No route found between the selected locations.',
          retryable: false
        };
      case 'UNKNOWN_ERROR':
        return {
          type: 'unknown',
          message: 'Unknown error occurred. Please try again.',
          retryable: true
        };
      default:
        return {
          type: 'api_key',
          message: errorMessage || 'Unable to calculate route. Please check your internet connection.',
          retryable: true
        };
    }
  }

  /**
   * Get directions from origin to destination using Google Directions API
   */
  static async getDirections(origin: string, destination: string): Promise<{ route: Route | null; error?: DirectionsError }> {
    try {
      // Validate API key first
      if (!this.validateApiKey()) {
        return {
          route: null,
          error: {
            type: 'api_key',
            message: 'Google Maps API key is not configured. Please contact support.',
            retryable: false
          }
        };
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        return { route: data.routes[0] };
      }

      const error = this.getDirectionsError(data.status, data.error_message);
      console.error('Directions API error:', data.status, data.error_message);
      return { route: null, error };
    } catch (error) {
      console.error('Error fetching directions:', error);
      return {
        route: null,
        error: {
          type: 'network',
          message: 'Network error. Please check your internet connection and try again.',
          retryable: true
        }
      };
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
   * Get directions with retry mechanism
   */
  static async getDirectionsWithRetry(
    origin: string,
    destination: string,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<{ route: Route | null; error?: DirectionsError }> {
    let lastError: DirectionsError | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.getDirections(origin, destination);
      
      if (result.route) {
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry if error is not retryable
      if (result.error && !result.error.retryable) {
        break;
      }
      
      // Don't delay on last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
    
    return { route: null, error: lastError };
  }

  /**
   * Validate coordinate values
   */
  static isValidCoordinate(coordinate: { latitude: number; longitude: number }): boolean {
    return (
      !isNaN(coordinate.latitude) &&
      !isNaN(coordinate.longitude) &&
      coordinate.latitude >= -90 &&
      coordinate.latitude <= 90 &&
      coordinate.longitude >= -180 &&
      coordinate.longitude <= 180
    );
  }

  /**
   * Optimize route coordinates by removing redundant points
   */
  static optimizeRouteCoordinates(
    coordinates: Array<{ latitude: number; longitude: number }>,
    tolerance: number = 10
  ): Array<{ latitude: number; longitude: number }> {
    if (coordinates.length <= 2) return coordinates;

    const optimized = [coordinates[0]];
    
    for (let i = 1; i < coordinates.length - 1; i++) {
      const current = coordinates[i];
      const last = optimized[optimized.length - 1];
      
      if (this.calculateDistance(current, last) >= tolerance) {
        optimized.push(current);
      }
    }
    
    // Always include the last point
    optimized.push(coordinates[coordinates.length - 1]);
    
    return optimized;
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

  /**
   * Get progress along route (0-100%)
   */
  static getRouteProgress(
    currentLocation: { latitude: number; longitude: number },
    routeCoordinates: Array<{ latitude: number; longitude: number }>
  ): number {
    if (routeCoordinates.length === 0) return 0;

    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < routeCoordinates.length; i++) {
      const distance = this.calculateDistance(currentLocation, routeCoordinates[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return Math.min(100, (closestIndex / (routeCoordinates.length - 1)) * 100);
  }
}