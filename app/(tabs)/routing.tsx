// ============================================================================
// ROUTING SCREEN - VIEW
// ============================================================================
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

// --- UPDATED IMPORT: Pointing to the new hooks file ---
import {
    appReducer,
    CONFIG,
    Coordinate,
    GeoUtils,
    initialState,
    StationData,
    useLocationTracking,
    useRouteCalculation
} from '../../hooks/useRouting'; // Changed from './routing.logic'

// ============================================================================
// MARKER COMPONENTS
// ============================================================================

const UserLocationMarker = React.memo(
    ({ coordinate, isNavigating, heading }: { coordinate: Coordinate; isNavigating: boolean; heading: number }) => {
        if (isNavigating) {
            return (
                <Marker
                    coordinate={coordinate}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat={true}
                    zIndex={400}
                    identifier="user-navigation"
                    title="Your Location"
                >
                    <View style={styles.navigationMarker}>
                        <Ionicons
                            name="navigate"
                            size={24}
                            color="#3B82F6"
                            style={{ transform: [{ rotate: `${heading}deg` }] }}
                        />
                    </View>
                </Marker>
            );
        }

        return (
            <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={400} identifier="user-simple" title="Your Location">
                <View style={styles.simpleMarker} />
            </Marker>
        );
    },
    (prev, next) =>
        prev.coordinate.latitude === next.coordinate.latitude &&
        prev.coordinate.longitude === next.coordinate.longitude &&
        prev.isNavigating === next.isNavigating &&
        Math.abs(prev.heading - next.heading) < 5
);

const SimpleStartMarker = React.memo(({ coordinate }: { coordinate: Coordinate }) => (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={300} identifier="start" title="Start Point">
        <View style={styles.startMarker} />
    </Marker>
));

const SimpleDestinationMarker = React.memo(({ coordinate, name }: { coordinate: Coordinate; name: string }) => (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={500} identifier="destination" title={name}>
        <View style={styles.destinationMarker}>
            <Ionicons name="flash" size={18} color="#fff" />
        </View>
    </Marker>
));

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RoutingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mapRef = useRef<MapView>(null);
    const lastCameraUpdateRef = useRef<number>(0);
    const sheetHeightAnim = useRef(new Animated.Value(CONFIG.BOTTOM_SHEET.DEFAULT)).current;

    const [state, dispatch] = useReducer(appReducer, initialState);
    
    // --- ADDED: Get userProfile and updateVehicleState from AuthContext ---
    const { userProfile, updateVehicleState } = useAuth();
    // --- END ---

    // Parse station data
    const station: StationData | null = useMemo(() => {
        if (!params.id) return null;

        const latitude = parseFloat((params.latitude as string) || '0');
        const longitude = parseFloat((params.longitude as string) || '0');

        if (!GeoUtils.isValid({ latitude, longitude })) {
            return null;
        }

        return {
            id: params.id as string,
            name: (params.name as string) || 'Unknown Station',
            latitude,
            longitude,
            address: (params.address as string) || '',
            type: (params.type as string) || 'Unknown',
            power: (params.power as string) || '0',
            status: (params.status as string) || 'unknown',
        };
    }, [params]);

    // Custom hooks
    const { requestPermission, getCurrentLocation, startWatching, stopWatching } = useLocationTracking(
        dispatch,
        state.navigation.isActive,
        state.route.coordinates,
        // --- ADDED: Pass userProfile and updateVehicleState to the hook ---
        userProfile,
        updateVehicleState
        // --- END ---
    );

    const { calculateRoute } = useRouteCalculation(dispatch, station);

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    useEffect(() => {
        const initNavigation = async () => {
            const isEnabled = await Location.hasServicesEnabledAsync();
            if (!isEnabled) {
                Alert.alert('Location Services Disabled', 'Enable location services to use navigation.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
                return;
            }

            const hasPermission = await requestPermission();
            if (!hasPermission) return;

            const currentLoc = await getCurrentLocation();

            if (currentLoc) {
                dispatch({
                    type: 'LOCATION_UPDATE',
                    payload: {
                        startLocation: currentLoc,
                        userLocation: currentLoc,
                    },
                });

                dispatch({
                    type: 'ROUTE_UPDATE',
                    payload: { isLoading: false },
                });

                if (mapRef.current) {
                    mapRef.current.animateToRegion(
                        {
                            ...currentLoc,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        },
                        500
                    );
                }

                await calculateRoute(currentLoc);
                await startWatching();
            } else {
                dispatch({
                    type: 'ROUTE_UPDATE',
                    payload: { isLoading: false, error: 'Unable to get your location' },
                });
            }
        };

        initNavigation();

        return () => {
            stopWatching();
        };
    }, []); // Empty dependency array ensures this runs once

    // ============================================================================
    // SMOOTH HEADING UPDATE
    // ============================================================================

    useEffect(() => {
        if (state.location.heading !== state.location.smoothedHeading) {
            const smoothed = GeoUtils.smoothHeading(state.location.smoothedHeading, state.location.heading);
            dispatch({
                type: 'LOCATION_UPDATE',
                payload: { smoothedHeading: smoothed },
            });
        }
    }, [state.location.heading]); // --- FIX: Removed state.location.smoothedHeading ---

    // ============================================================================
    // CAMERA UPDATES DURING NAVIGATION
    // ============================================================================

    useEffect(() => {
        if (!state.navigation.isActive || state.navigation.isPaused || !state.location.userLocation) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - lastCameraUpdateRef.current;

        if (timeSinceLastUpdate >= CONFIG.MAP.MIN_CAMERA_UPDATE_INTERVAL) {
            lastCameraUpdateRef.current = now;

            mapRef.current?.animateCamera(
                {
                    center: state.location.userLocation,
                    heading: state.location.smoothedHeading,
                    pitch: CONFIG.MAP.NAVIGATION_PITCH,
                    zoom: CONFIG.MAP.NAVIGATION_ZOOM,
                },
                { duration: CONFIG.MAP.CAMERA_ANIMATION_DURATION }
            );
        }
    }, [state.location.userLocation, state.navigation.isActive, state.navigation.isPaused, state.location.smoothedHeading]); // Added smoothedHeading

    // ============================================================================
    // FIT MAP TO ROUTE
    // ============================================================================

    useEffect(() => {
        if (state.route.coordinates.length > 0 && state.location.startLocation && station) {
            setTimeout(() => {
                const coords: Coordinate[] = [
                    state.location.startLocation as Coordinate,
                     ...state.route.coordinates,
                    { latitude: station.latitude, longitude: station.longitude }
                ];
                
                mapRef.current?.fitToCoordinates(coords, {
                    edgePadding: CONFIG.MAP.PADDING,
                    animated: true,
                });
            }, 800);
        }
    }, [state.route.coordinates.length, state.location.startLocation, station]); // Added dependencies

    // ============================================================================
    // NAVIGATION CONTROLS
    // ============================================================================

    const recenterOnUser = useCallback(() => {
        if (!state.location.userLocation) return;

        if (state.navigation.isActive) {
            mapRef.current?.animateCamera(
                {
                    center: state.location.userLocation,
                    heading: state.location.smoothedHeading,
                    pitch: CONFIG.MAP.NAVIGATION_PITCH,
                    zoom: CONFIG.MAP.NAVIGATION_ZOOM,
                },
                { duration: CONFIG.MAP.CAMERA_ANIMATION_DURATION }
            );
        } else {
            mapRef.current?.animateToRegion(
                {
                    ...state.location.userLocation,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                },
                1000
            );
        }
    }, [state.location.userLocation, state.location.smoothedHeading, state.navigation.isActive]);

    const startNavigation = useCallback(() => {
        dispatch({ type: 'START_NAVIGATION' });
        lastCameraUpdateRef.current = Date.now();

        if (state.location.userLocation) {
            mapRef.current?.animateCamera(
                {
                    center: state.location.userLocation,
                    heading: state.location.smoothedHeading,
                    pitch: CONFIG.MAP.NAVIGATION_PITCH,
                    zoom: CONFIG.MAP.NAVIGATION_ZOOM,
                },
                { duration: CONFIG.MAP.CAMERA_ANIMATION_DURATION }
            );
        }
    }, [state.location.userLocation, state.location.smoothedHeading]);

    const togglePause = useCallback(() => {
        dispatch({ type: 'TOGGLE_PAUSE' });
    }, [dispatch]);

    const stopNavigation = useCallback(() => {
        dispatch({ type: 'STOP_NAVIGATION' });

        if (state.route.coordinates.length > 0 && state.location.startLocation && station) {
            mapRef.current?.animateCamera({ pitch: 0 }, { duration: 500 });
            setTimeout(() => {
                const coords: Coordinate[] = [
                    state.location.startLocation as Coordinate,
                    ...state.route.coordinates,
                    { latitude: station.latitude, longitude: station.longitude }
                ];
                mapRef.current?.fitToCoordinates(coords, {
                    edgePadding: CONFIG.MAP.PADDING,
                    animated: true,
                });
            }, 500);
        }
    }, [state.route.coordinates, state.location.startLocation, station, dispatch]);

    const toggleBottomSheet = useCallback(() => {
        const target = state.ui.isSheetExpanded ? CONFIG.BOTTOM_SHEET.DEFAULT : CONFIG.BOTTOM_SHEET.MAX;

        dispatch({
            type: 'UI_UPDATE',
            payload: { isSheetExpanded: !state.ui.isSheetExpanded },
        });

        Animated.spring(sheetHeightAnim, {
            toValue: target,
            useNativeDriver: false,
            tension: CONFIG.ANIMATION.SPRING_TENSION,
            friction: CONFIG.ANIMATION.SPRING_FRICTION,
        }).start();
    }, [state.ui.isSheetExpanded, sheetHeightAnim, dispatch]);

    // ============================================================================
    // MEMOIZED VALUES
    // ============================================================================

    const travelInfo = useMemo(() => {
        if (!state.route.data?.legs[0]) {
            return { distance: '-- km', duration: '-- mins', arrivalTime: '--:--' };
        }

        const leg = state.route.data.legs[0];
        const arrival = new Date(Date.now() + leg.duration.value * 1000);

        return {
            distance: leg.distance.text,
            duration: leg.duration.text,
            arrivalTime: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
    }, [state.route.data]);

    const currentStep = useMemo(
        () => state.route.data?.legs[0]?.steps[state.navigation.currentStep] || null,
        [state.route.data, state.navigation.currentStep]
    );

    // ============================================================================
    // RENDER
    // ============================================================================

    if (state.route.isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>{state.route.isRetrying ? 'Retrying...' : 'Calculating route...'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!station) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.loadingText}>No station selected</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => router.push('/(tabs)/home')}
                        accessible={true}
                        accessibilityLabel="Go back to home"
                        accessibilityRole="button"
                    >
                        <Text style={styles.retryButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        accessible={true}
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.stationName} numberOfLines={1}>
                            {station.name}
                        </Text>
                        <Text style={styles.stationAddress} numberOfLines={1}>
                            {station.address}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => router.push('/(tabs)/sos')}
                        accessible={true}
                        accessibilityLabel="Emergency SOS"
                        accessibilityRole="button"
                    >
                        <Ionicons name="warning" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Error Banner */}
                {state.route.error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="warning-outline" size={16} color="#dc2626" />
                        <Text style={styles.errorBannerText}>{state.route.error}</Text>
                        <TouchableOpacity
                            onPress={() => dispatch({ type: 'RESET_ERROR' })}
                            accessible={true}
                            accessibilityLabel="Dismiss error"
                            accessibilityRole="button"
                        >
                            <Ionicons name="close" size={16} color="#dc2626" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Off Route Warning */}
                {state.navigation.offRoute && state.navigation.isActive && (
                    <View style={styles.offRouteWarning}>
                        <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                        <Text style={styles.offRouteText}>You are off route. Recalculating...</Text>
                    </View>
                )}

                {/* Map */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: state.location.userLocation?.latitude || 17.3850,
                            longitude: state.location.userLocation?.longitude || 78.4867,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        showsCompass={true}
                        rotateEnabled={true}
                        pitchEnabled={true}
                    >
                        {/* Start marker - only show when not navigating */}
                        {state.location.startLocation &&
                            GeoUtils.isValid(state.location.startLocation) &&
                            !state.navigation.isActive && <SimpleStartMarker coordinate={state.location.startLocation} />}

                        {/* User location marker */}
                        {state.location.userLocation && GeoUtils.isValid(state.location.userLocation) && (
                            <UserLocationMarker
                                coordinate={state.location.userLocation}
                                isNavigating={state.navigation.isActive && !state.navigation.isPaused}
                                heading={state.location.smoothedHeading}
                            />
                        )}

                        {/* Destination marker */}
                        {station && (
                            <SimpleDestinationMarker
                                coordinate={{ latitude: station.latitude, longitude: station.longitude }}
                                name={station.name}
                            />
                        )}

                        {/* Route polyline */}
                        {state.route.coordinates.length > 0 && (
                            <Polyline
                                coordinates={state.route.coordinates}
                                strokeColor="#3B82F6"
                                strokeWidth={8}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}
                    </MapView>

                    {/* Map Controls */}
                    <View style={styles.topControls}>
                        <TouchableOpacity
                            style={styles.mapControlButton}
                            onPress={recenterOnUser}
                            accessible={true}
                            accessibilityLabel="Recenter map on your location"
                            accessibilityRole="button"
                        >
                            <Ionicons name="locate" size={20} color={COLORS.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.mapControlButton}
                            onPress={() => state.location.userLocation && calculateRoute(state.location.userLocation)}
                            accessible={true}
                            accessibilityLabel="Recalculate route"
                            accessibilityRole="button"
                        >
                            <Ionicons name="refresh" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Sheet */}
                <Animated.View style={[styles.bottomSheet, { height: sheetHeightAnim }]}>
                    <View style={styles.bottomSheetHandle}>
                        <TouchableOpacity
                            onPress={toggleBottomSheet}
                            style={styles.dragHandleContainer}
                            accessible={true}
                            accessibilityLabel={state.ui.isSheetExpanded ? 'Collapse route details' : 'Expand route details'}
                            accessibilityRole="button"
                        >
                            <View style={styles.dragHandle} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.travelInfoSection}>
                        <View style={styles.travelInfoTop}>
                            <View style={styles.timeDistance}>
                                <Text style={styles.durationText} accessible={true} accessibilityLabel={`Duration ${travelInfo.duration}`}>
                                    {travelInfo.duration}
                                </Text>
                                <Text style={styles.distanceText} accessible={true} accessibilityLabel={`Distance ${travelInfo.distance}`}>
                                    {travelInfo.distance}
                                </Text>
                            </View>
                            <View style={styles.arrivalInfo}>
                                <Ionicons name="time-outline" size={16} color="#64748b" />
                                <Text style={styles.arrivalText} accessible={true} accessibilityLabel={`Arrive at ${travelInfo.arrivalTime}`}>
                                    Arrive at {travelInfo.arrivalTime}
                                </Text>
                            </View>
                        </View>

                        {/* Navigation Controls */}
                        <View style={styles.navigationControl}>
                            {!state.navigation.isActive ? (
                                <TouchableOpacity
                                    style={styles.startButton}
                                    onPress={startNavigation}
                                    accessible={true}
                                    accessibilityLabel="Start navigation"
                                    accessibilityRole="button"
                                >
                                    <View style={styles.buttonContent}>
                                        <Ionicons name="navigate" size={22} color="#fff" />
                                        <Text style={styles.startButtonText}>Start Navigation</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.navButtonsRow}>
                                    <TouchableOpacity
                                        style={[styles.navButton, styles.pauseButton]}
                                        onPress={togglePause}
                                        accessible={true}
                                        accessibilityLabel={state.navigation.isPaused ? 'Resume navigation' : 'Pause navigation'}
                                        accessibilityRole="button"
                                    >
                                        <Ionicons name={state.navigation.isPaused ? 'play' : 'pause'} size={20} color="#fff" />
                                        <Text style={styles.navButtonText}>{state.navigation.isPaused ? 'Resume' : 'Pause'}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.navButton, styles.stopButton]}
                                        onPress={stopNavigation}
                                        accessible={true}
                                        accessibilityLabel="Stop navigation"
                                        accessibilityRole="button"
                                    >
                                        <Ionicons name="close" size={20} color="#fff" />
                                        <Text style={styles.navButtonText}>Stop</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Route Steps */}
                    <ScrollView
                        style={styles.stepsContainer}
                        contentContainerStyle={styles.stepsContent}
                        showsVerticalScrollIndicator={true}
                        accessible={true}
                        accessibilityLabel="Route steps list"
                    >
                        {state.navigation.isActive && currentStep && (
                            <View style={styles.currentStep}>
                                <View style={styles.currentStepHeader}>
                                    <Ionicons name="navigate" size={22} color={COLORS.primary} />
                                    <Text style={styles.currentStepTitle}>
                                        {currentStep.html_instructions?.replace(/<[^>]*>/g, '') || 'Continue on route'}
                                    </Text>
                                </View>
                                <View style={styles.currentStepInfo}>
                                    <Text style={styles.currentStepDistance}>{currentStep.distance.text}</Text>
                                    <Text style={styles.currentStepDuration}>{currentStep.duration.text}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.allSteps}>
                            <Text style={styles.sectionTitle}>ROUTE STEPS</Text>
                            {state.route.data?.legs[0]?.steps.map((step, index) => (
                                <View
                                    key={`step-${index}`}
                                    style={[styles.stepItem, index === state.navigation.currentStep && styles.activeStepItem]}
                                    accessible={true}
                                    accessibilityLabel={`Step ${index + 1}: ${step.html_instructions?.replace(/<[^>]*>/g, '')}`}
                                >
                                    <View style={styles.stepIndicator}>
                                        <View
                                            style={[
                                                styles.stepDot,
                                                index === state.navigation.currentStep && styles.activeStepDot,
                                            ]}
                                        >
                                            <Ionicons name="navigate" size={12} color="#fff" />
                                        </View>
                                        {index < state.route.data!.legs[0].steps.length - 1 && <View style={styles.stepLine} />}
                                    </View>

                                    <View style={styles.stepContent}>
                                        <Text
                                            style={[
                                                styles.stepInstruction,
                                                index === state.navigation.currentStep && styles.activeStepInstruction,
                                            ]}
                                        >
                                            {step.html_instructions?.replace(/<[^>]*>/g, '') || 'Continue'}
                                        </Text>
                                        <View style={styles.stepMeta}>
                                            <Text style={styles.stepDistance}>{step.distance.text}</Text>
                                            <Text style={styles.stepDuration}>{step.duration.text}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </Animated.View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    backButton: {
        padding: 8,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    stationName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
    },
    stationAddress: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
        textAlign: 'center',
    },
    menuButton: {
        padding: 8,
    },
    errorBanner: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#fecaca',
    },
    errorBannerText: {
        flex: 1,
        marginHorizontal: 8,
        fontSize: 13,
        color: '#dc2626',
        fontWeight: '500',
    },
    offRouteWarning: {
        backgroundColor: '#fffbeb',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
    },
    offRouteText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#f59e0b',
        fontWeight: '600',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    navigationMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    simpleMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#3B82F6',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 8,
    },
    startMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10b981',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 8,
    },
    destinationMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ef4444',
        borderWidth: 4,
        borderColor: '#fff',
        elevation: 12,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topControls: {
        position: 'absolute',
        top: 16,
        right: 16,
        gap: 12,
    },
    mapControlButton: {
        backgroundColor: '#fff',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    bottomSheetHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 8,
        width: '100%',
    },
    dragHandle: {
        width: 50,
        height: 5,
        backgroundColor: '#cbd5e1',
        borderRadius: 3,
    },
    travelInfoSection: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    travelInfoTop: {
        marginBottom: 16,
    },
    timeDistance: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    durationText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    distanceText: {
        fontSize: 18,
        color: '#64748b',
        fontWeight: '600',
    },
    arrivalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrivalText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
        marginLeft: 6,
    },
    navigationControl: {
        marginTop: 8,
    },
    startButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 18,
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    navButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    navButton: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        flexDirection: 'row',
        gap: 6,
    },
    pauseButton: {
        backgroundColor: '#f59e0b',
        shadowColor: '#f59e0b',
    },
    stopButton: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
    },
    navButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    stepsContainer: {
        flex: 1,
    },
    stepsContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    currentStep: {
        backgroundColor: '#f0f9ff',
        padding: 18,
        borderRadius: 14,
        marginBottom: 20,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    currentStepHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    currentStepTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
        marginLeft: 12,
        lineHeight: 22,
    },
    currentStepInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 34,
    },
    currentStepDistance: {
        fontSize: 15,
        color: COLORS.primary,
        fontWeight: '700',
    },
    currentStepDuration: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '600',
    },
    allSteps: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 18,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    stepItem: {
        flexDirection: 'row',
        marginBottom: 18,
    },
    activeStepItem: {
        backgroundColor: '#f8fafc',
        marginHorizontal: -12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    stepIndicator: {
        alignItems: 'center',
        marginRight: 14,
        width: 26,
    },
    stepDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    activeStepDot: {
        backgroundColor: COLORS.primary,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    stepLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#e2e8f0',
        marginTop: 2,
    },
    stepContent: {
        flex: 1,
        paddingBottom: 4,
    },
    stepInstruction: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 21,
        marginBottom: 6,
        fontWeight: '500',
    },
    activeStepInstruction: {
        color: '#0f172a',
        fontWeight: '700',
    },
    stepMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepDistance: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },
    stepDuration: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});