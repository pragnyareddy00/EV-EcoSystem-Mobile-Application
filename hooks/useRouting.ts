import * as Location from 'expo-location';
import React, { useCallback, useRef } from 'react';
import { Alert, Dimensions } from 'react-native';
import { DirectionsError, NavigationService } from '../services/navigation';
import { Route } from '../types/navigation';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export type Coordinate = {
    latitude: number;
    longitude: number;
};

export type StationData = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    type: string;
    power: string;
    status: string;
};

export type LocationState = {
    userLocation: Coordinate | null;
    startLocation: Coordinate | null;
    heading: number;
    smoothedHeading: number;
    lastUpdate: number;
};

export type RouteState = {
    data: Route | null;
    coordinates: Coordinate[];
    error: string | null;
    isLoading: boolean;
    isRetrying: boolean;
};

export type NavigationState = {
    isActive: boolean;
    isPaused: boolean;
    currentStep: number;
    distanceToNextStep: number;
    offRoute: boolean;
};

export type UIState = {
    bottomSheetHeight: number;
    isSheetExpanded: boolean;
    showError: boolean;
};

export type AppState = {
    location: LocationState;
    route: RouteState;
    navigation: NavigationState;
    ui: UIState;
};

export type Action =
    | { type: 'LOCATION_UPDATE'; payload: Partial<LocationState> }
    | { type: 'ROUTE_UPDATE'; payload: Partial<RouteState> }
    | { type: 'NAVIGATION_UPDATE'; payload: Partial<NavigationState> }
    | { type: 'UI_UPDATE'; payload: Partial<UIState> }
    | { type: 'START_NAVIGATION' }
    | { type: 'STOP_NAVIGATION' }
    | { type: 'TOGGLE_PAUSE' }
    | { type: 'RESET_ERROR' };

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CONFIG = {
    MAP: {
        PADDING: { top: 120, right: 80, bottom: 300, left: 80 },
        CAMERA_ANIMATION_DURATION: 1500,
        MIN_CAMERA_UPDATE_INTERVAL: 3000,
        NAVIGATION_ZOOM: 17,
        NAVIGATION_PITCH: 50,
        DEFAULT_ZOOM: 15,
    },
    LOCATION: {
        UPDATE_INTERVAL: 1000,
        DISTANCE_INTERVAL: 5,
        SIGNIFICANT_MOVEMENT_THRESHOLD: 50, // meters
        HEADING_CHANGE_THRESHOLD: 15, // degrees
        OFF_ROUTE_THRESHOLD: 100, // meters
    },
    ROUTE: {
        OPTIMIZATION_TOLERANCE: 15,
        LOOK_AHEAD_DISTANCE: 25,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
    },
    BOTTOM_SHEET: {
        MIN: 180,
        DEFAULT: 240,
        MAX: SCREEN_HEIGHT * 0.7,
    },
    ANIMATION: {
        SPRING_TENSION: 100,
        SPRING_FRICTION: 8,
        HEADING_SMOOTHING: 0.15,
    },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const GeoUtils = {
    isValid: (coord: Coordinate | null): coord is Coordinate => {
        return (
            coord !== null &&
            coord.latitude >= -90 &&
            coord.latitude <= 90 &&
            coord.longitude >= -180 &&
            coord.longitude <= 180 &&
            !isNaN(coord.latitude) &&
            !isNaN(coord.longitude)
        );
    },

    distance: (coord1: Coordinate, coord2: Coordinate): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (coord1.latitude * Math.PI) / 180;
        const φ2 = (coord2.latitude * Math.PI) / 180;
        const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
        const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    },

    bearing: (from: Coordinate, to: Coordinate): number => {
        const lat1 = (from.latitude * Math.PI) / 180;
        const lat2 = (to.latitude * Math.PI) / 180;
        const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        const bearing = (Math.atan2(y, x) * 180) / Math.PI;
        return (bearing + 360) % 360;
    },

    smoothHeading: (current: number, target: number, alpha: number = CONFIG.ANIMATION.HEADING_SMOOTHING): number => {
        let diff = target - current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        let smoothed = current + alpha * diff;
        if (smoothed < 0) smoothed += 360;
        if (smoothed >= 360) smoothed -= 360;

        return smoothed;
    },

    isOffRoute: (currentLocation: Coordinate, routeCoordinates: Coordinate[]): boolean => {
        if (routeCoordinates.length === 0) return false;

        let minDistance = Infinity;
        for (const point of routeCoordinates) {
            const distance = GeoUtils.distance(currentLocation, point);
            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        return minDistance > CONFIG.LOCATION.OFF_ROUTE_THRESHOLD;
    },
};

// ============================================================================
// STATE REDUCER
// ============================================================================

export const initialState: AppState = {
    location: {
        userLocation: null,
        startLocation: null,
        heading: 0,
        smoothedHeading: 0,
        lastUpdate: 0,
    },
    route: {
        data: null,
        coordinates: [],
        error: null,
        isLoading: true,
        isRetrying: false,
    },
    navigation: {
        isActive: false,
        isPaused: false,
        currentStep: 0,
        distanceToNextStep: 0,
        offRoute: false,
    },
    ui: {
        bottomSheetHeight: CONFIG.BOTTOM_SHEET.DEFAULT,
        isSheetExpanded: false,
        showError: false,
    },
};

export function appReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'LOCATION_UPDATE':
            return {
                ...state,
                location: { ...state.location, ...action.payload },
            };

        case 'ROUTE_UPDATE':
            return {
                ...state,
                route: { ...state.route, ...action.payload },
            };

        case 'NAVIGATION_UPDATE':
            return {
                ...state,
                navigation: { ...state.navigation, ...action.payload },
            };

        case 'UI_UPDATE':
            return {
                ...state,
                ui: { ...state.ui, ...action.payload },
            };

        case 'START_NAVIGATION':
            return {
                ...state,
                navigation: { ...state.navigation, isActive: true, isPaused: false },
            };

        case 'STOP_NAVIGATION':
            return {
                ...state,
                navigation: {
                    isActive: false,
                    isPaused: false,
                    currentStep: 0,
                    distanceToNextStep: 0,
                    offRoute: false,
                },
            };

        case 'TOGGLE_PAUSE':
            return {
                ...state,
                navigation: { ...state.navigation, isPaused: !state.navigation.isPaused },
            };

        case 'RESET_ERROR':
            return {
                ...state,
                route: { ...state.route, error: null },
                ui: { ...state.ui, showError: false },
            };

        default:
            return state;
    }
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

export const useLocationTracking = (
  dispatch: React.Dispatch<Action>,
  isNavigating: boolean,
  routeCoordinates: Coordinate[],
  userProfile: any, // Using 'any' to avoid circular dependency issues if UserProfile is imported
  updateVehicleState: (newState: Partial<any['vehicleState']>) => Promise<void>
) => {
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const permissionRequested = useRef(false);
  const lastLocationRef = useRef<Coordinate | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permissionRequested.current) return true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      permissionRequested.current = true;

      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'Enable location access to use navigation.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings',
            onPress: () => Location.requestForegroundPermissionsAsync(),
          },
        ]);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<Coordinate | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coord: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      return GeoUtils.isValid(coord) ? coord : null;
    } catch (error) {
      console.error('Location error:', error);

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch {
        return null;
      }
    }
  }, []);

  const startWatching = useCallback(async () => {
    try {
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: CONFIG.LOCATION.DISTANCE_INTERVAL,
          timeInterval: CONFIG.LOCATION.UPDATE_INTERVAL,
        },
        (location) => {
          const newLocation: Coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          if (!GeoUtils.isValid(newLocation)) return;

          const newHeading = location.coords.heading ?? 0;

          dispatch({
            type: 'LOCATION_UPDATE',
            payload: {
              userLocation: newLocation,
              heading: newHeading,
              lastUpdate: Date.now(),
            },
          });

          // Check if off route during navigation
          if (isNavigating && routeCoordinates.length > 0) {
            const offRoute = GeoUtils.isOffRoute(newLocation, routeCoordinates);
            dispatch({
              type: 'NAVIGATION_UPDATE',
              payload: { offRoute },
            });
          }

          // --- SOC Depletion Logic ---
          if (isNavigating && lastLocationRef.current && userProfile?.vehicle && userProfile?.vehicleState) {
            const distanceTraveledMeters = GeoUtils.distance(lastLocationRef.current, newLocation);
            
            // Only update if moved a significant distance (e.g., > 10 meters)
            if (distanceTraveledMeters > 10) {
              const distanceTraveledKm = distanceTraveledMeters / 1000;
              const { realWorldRangeKm } = userProfile.vehicle;
              const { currentSOC } = userProfile.vehicleState;

              if (realWorldRangeKm > 0) {
                const percentDepleted = (distanceTraveledKm / realWorldRangeKm) * 100;
                const newSOC = Math.max(0, currentSOC - percentDepleted);
                
                // Update Firestore (this function is debounced by default in AuthContext if needed)
                updateVehicleState({ currentSOC: newSOC });
              }
              
              // Update last location for next calculation
              lastLocationRef.current = newLocation;
            }
          } else if (isNavigating && !lastLocationRef.current) {
            // Set initial location on first watch update during navigation
            lastLocationRef.current = newLocation;
          } else if (!isNavigating) {
            // Clear last location if navigation stops
            lastLocationRef.current = null;
          }
          // --- END SOC Depletion Logic ---
        }
      );

      watcherRef.current = watcher;
    } catch (error) {
      console.error('Location watching error:', error);
      dispatch({
        type: 'ROUTE_UPDATE',
        payload: { error: 'Location tracking failed' },
      });
    }
  }, [dispatch, isNavigating, routeCoordinates, userProfile, updateVehicleState]);

  const stopWatching = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  return { requestPermission, getCurrentLocation, startWatching, stopWatching };
};

export const useRouteCalculation = (dispatch: React.Dispatch<Action>, station: StationData | null) => {
  const calculateRoute = useCallback(
    async (origin: Coordinate, retryCount = 0) => {
      if (!station || !GeoUtils.isValid(origin)) {
        dispatch({
          type: 'ROUTE_UPDATE',
          payload: { error: 'Invalid location data', isLoading: false },
        });
        return;
      }

      dispatch({
        type: 'ROUTE_UPDATE',
        payload: { isLoading: true, error: null, isRetrying: retryCount > 0 },
      });

      try {
        const originStr = `${origin.latitude},${origin.longitude}`;
        const destStr = `${station.latitude},${station.longitude}`;

        const result = await NavigationService.getDirectionsWithRetry(
          originStr,
          destStr,
          CONFIG.ROUTE.RETRY_ATTEMPTS,
          CONFIG.ROUTE.RETRY_DELAY
        );

        if (result.route) {
          const rawPath = NavigationService.decodePolyline(result.route.overview_polyline.points);
          const optimizedPath = NavigationService.optimizeRouteCoordinates(
            rawPath,
            CONFIG.ROUTE.OPTIMIZATION_TOLERANCE
          );

          dispatch({
            type: 'ROUTE_UPDATE',
            payload: {
              data: result.route,
              coordinates: optimizedPath,
              isLoading: false,
              isRetrying: false,
            },
          });
        } else if (result.error) {
          handleRouteError(result.error, retryCount, origin);
        }
      } catch (error) {
        console.error('Route calculation error:', error);
        dispatch({
          type: 'ROUTE_UPDATE',
          payload: { error: 'Failed to calculate route', isLoading: false, isRetrying: false },
        });
      }
    },
    [station, dispatch]
  );

  const handleRouteError = useCallback(
    (error: DirectionsError, retryCount: number, origin: Coordinate) => {
      dispatch({
        type: 'ROUTE_UPDATE',
        payload: { error: error.message },
      });

      if (error.retryable && retryCount < 2) {
        setTimeout(() => {
          calculateRoute(origin, retryCount + 1);
        }, CONFIG.ROUTE.RETRY_DELAY * 2);
      }
    },
    [calculateRoute, dispatch]
  );

  return { calculateRoute };
};