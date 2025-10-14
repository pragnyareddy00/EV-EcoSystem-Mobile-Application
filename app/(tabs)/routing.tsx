import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { NavigationService } from '../../services/navigation';
import { NavigationState, Route, RouteStep } from '../../types/navigation';

type Coordinate = {
    latitude: number;
    longitude: number;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enhanced User Location Marker
const UserLocationMarker = ({
    coordinate,
    heading
}: {
    coordinate: Coordinate;
    heading?: number
}) => (
    <Marker
        coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        flat={true}
        tracksViewChanges={false}
        zIndex={20}
    >
        <View style={styles.userMarkerContainer}>
            <View style={styles.userMarkerArrow}>
                <Ionicons
                    name="navigate"
                    size={16}
                    color="#fff"
                    style={{
                        transform: heading !== undefined ? [{ rotate: `${heading}deg` }] : []
                    }}
                />
            </View>
            <View style={styles.userMarkerPulse} />
        </View>
    </Marker>
);

export default function RoutingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mapRef = useRef<MapView>(null);

    const station = {
        id: params.id as string,
        name: params.name as string,
        latitude: parseFloat(params.latitude as string),
        longitude: parseFloat(params.longitude as string),
        address: params.address as string,
        type: params.type as string,
        power: params.power as string,
        status: params.status as string,
    };

    const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
    const [routeData, setRouteData] = useState<Route | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
    const [navigation, setNavigation] = useState<NavigationState>({
        currentStep: 0,
        isNavigating: false,
        isPaused: false,
        currentLocation: { latitude: 0, longitude: 0 },
    });

    const [isLoading, setIsLoading] = useState(true);
    const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
    const [heading, setHeading] = useState<number>(0);
    const [smoothedHeading, setSmoothedHeading] = useState<number>(0);
    
    const lastCameraUpdate = useRef<number>(0);
    const CAMERA_UPDATE_INTERVAL = 2000;
    
    // FIX: Initialize moving arrow position immediately when route is calculated
    const [routeProgress, setRouteProgress] = useState<number>(0);
    const [movingArrowPosition, setMovingArrowPosition] = useState<Coordinate | null>(null);
    const [movingArrowHeading, setMovingArrowHeading] = useState<number>(0);
    
    // FIX: Store original start location
    const [startLocation, setStartLocation] = useState<Coordinate | null>(null);

    useEffect(() => {
        initializeNavigation();
        return () => {
            if (locationWatcher) {
                locationWatcher.remove();
            }
        };
    }, []);

    // FIX: Initialize moving arrow when route coordinates change
    useEffect(() => {
        if (routeCoordinates.length > 10 && userLocation) {
            console.log('Route coordinates loaded:', routeCoordinates.length);
            // Initialize moving arrow at a position ahead on the route
            const initialArrowIndex = Math.min(10, routeCoordinates.length - 1);
            const arrowPos = routeCoordinates[initialArrowIndex];
            const nextPos = routeCoordinates[Math.min(initialArrowIndex + 1, routeCoordinates.length - 1)];
            
            const bearing = calculateBearing(arrowPos, nextPos);
            setMovingArrowPosition(arrowPos);
            setMovingArrowHeading(bearing);
            
            console.log('Moving arrow initialized at:', arrowPos);
        }
    }, [routeCoordinates]);

    const initializeNavigation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location permission is required for navigation.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const currentLocation: Coordinate = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            // FIX: Save start location
            setStartLocation(currentLocation);
            setUserLocation(currentLocation);
            setNavigation(prev => ({
                ...prev,
                currentLocation,
                heading: location.coords.heading || 0,
            }));

            console.log('User location set:', currentLocation);
            console.log('Start location set:', currentLocation);
            await calculateRoute(currentLocation);
            startLocationWatching();

        } catch (error) {
            console.error('Navigation initialization error:', error);
            const defaultLocation: Coordinate = {
                latitude: 17.3850,
                longitude: 78.4867,
            };
            setStartLocation(defaultLocation);
            setUserLocation(defaultLocation);
            setNavigation(prev => ({ ...prev, currentLocation: defaultLocation }));
            await calculateRoute(defaultLocation);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateRoute = async (origin: Coordinate) => {
        try {
            setIsLoading(true);

            const originStr = `${origin.latitude},${origin.longitude}`;
            const destinationStr = `${station.latitude},${station.longitude}`;

            console.log('Calculating route from:', originStr, 'to:', destinationStr);

            const route = await NavigationService.getDirections(originStr, destinationStr);

            if (route) {
                setRouteData(route);
                const decodedPath = NavigationService.decodePolyline(route.overview_polyline.points);
                console.log('Route coordinates decoded:', decodedPath.length, 'points');
                setRouteCoordinates(decodedPath);

                if (mapRef.current && decodedPath.length > 0) {
                    setTimeout(() => {
                        mapRef.current?.fitToCoordinates(decodedPath, {
                            edgePadding: {
                                top: 120,
                                right: 80,
                                bottom: 400,
                                left: 80
                            },
                            animated: true,
                        });
                    }, 500);
                }
            } else {
                Alert.alert(
                    'Route Calculation Failed',
                    'Unable to calculate route. Please check your internet connection and try again.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (error) {
            console.error('Route calculation error:', error);
            Alert.alert(
                'Connection Error',
                'Failed to calculate route. Please check your connection.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const startLocationWatching = () => {
        Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                distanceInterval: 10,
                timeInterval: 2000,
            },
            (location) => {
                const newLocation: Coordinate = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };

                const newHeading = location.coords.heading !== null && location.coords.heading !== -1
                    ? location.coords.heading
                    : heading;

                const alpha = 0.15;
                let smoothed = smoothedHeading;
                
                let diff = newHeading - smoothedHeading;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                
                smoothed = smoothedHeading + alpha * diff;
                if (smoothed < 0) smoothed += 360;
                if (smoothed >= 360) smoothed -= 360;
                
                setSmoothedHeading(smoothed);
                setUserLocation(newLocation);
                setHeading(newHeading);

                if (navigation.isNavigating && !navigation.isPaused) {
                    setNavigation(prev => ({
                        ...prev,
                        currentLocation: newLocation,
                        heading: newHeading,
                    }));
                    updateCurrentStep(newLocation);

                    const now = Date.now();
                    if (now - lastCameraUpdate.current >= CAMERA_UPDATE_INTERVAL) {
                        lastCameraUpdate.current = now;
                        
                        if (mapRef.current) {
                            mapRef.current.animateCamera({
                                center: newLocation,
                                heading: smoothed,
                                pitch: 50,
                                zoom: 17,
                            }, { duration: 1500 });
                        }
                    }
                }
                
                // FIX: Update moving arrow even when not navigating
                if (routeCoordinates.length > 0) {
                    updateRouteProgress(newLocation);
                }
            }
        ).then(watcher => setLocationWatcher(watcher));
    };

    const updateCurrentStep = (currentLoc: Coordinate) => {
        if (!routeData?.legs[0]?.steps) return;

        const steps = routeData.legs[0].steps;
        let closestStep = navigation.currentStep;
        let minDistance = Infinity;

        for (let i = navigation.currentStep; i < steps.length; i++) {
            const step = steps[i];
            const stepLocation: Coordinate = {
                latitude: step.start_location.lat,
                longitude: step.start_location.lng,
            };

            const distance = NavigationService.calculateDistance(currentLoc, stepLocation);

            if (distance < minDistance && distance < 100) {
                minDistance = distance;
                closestStep = i;
            }
        }

        if (closestStep !== navigation.currentStep) {
            setNavigation(prev => ({ ...prev, currentStep: closestStep }));
        }
    };
    
    // FIX: Enhanced updateRouteProgress that works anytime
    const updateRouteProgress = (currentLoc: Coordinate) => {
        if (routeCoordinates.length < 2) return;
        
        let minDistance = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < routeCoordinates.length; i++) {
            const distance = NavigationService.calculateDistance(currentLoc, routeCoordinates[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }
        
        const progress = (closestIndex / routeCoordinates.length) * 100;
        setRouteProgress(progress);
        
        // Position arrow ahead of closest point (adjusted for better visibility)
        const lookAheadPoints = Math.min(20, routeCoordinates.length - closestIndex - 1);
        const arrowIndex = Math.min(closestIndex + lookAheadPoints, routeCoordinates.length - 2);
        
        if (arrowIndex >= 0 && arrowIndex < routeCoordinates.length - 1) {
            const arrowPos = routeCoordinates[arrowIndex];
            const nextPos = routeCoordinates[arrowIndex + 1];
            
            const bearing = calculateBearing(arrowPos, nextPos);
            
            setMovingArrowPosition(arrowPos);
            setMovingArrowHeading(bearing);
        }
    };
    
    const calculateBearing = (from: Coordinate, to: Coordinate): number => {
        const lat1 = from.latitude * Math.PI / 180;
        const lat2 = to.latitude * Math.PI / 180;
        const dLon = (to.longitude - from.longitude) * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    };

    const recenterOnUser = () => {
        if (mapRef.current && userLocation) {
            if (navigation.isNavigating) {
                mapRef.current.animateCamera({
                    center: userLocation,
                    heading: smoothedHeading,
                    pitch: 50,
                    zoom: 17,
                }, { duration: 1500 });
            } else {
                mapRef.current.animateToRegion({
                    ...userLocation,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 1000);
            }
        }
    };

    const startNavigation = () => {
        setNavigation(prev => ({ ...prev, isNavigating: true, isPaused: false }));
        lastCameraUpdate.current = Date.now();

        if (mapRef.current && userLocation) {
            mapRef.current.animateCamera({
                center: userLocation,
                heading: smoothedHeading,
                pitch: 50,
                zoom: 17,
            }, { duration: 1500 });
        }

        Alert.alert('Navigation Started', 'Follow the route to your charging station.');
    };

    const pauseNavigation = () => {
        setNavigation(prev => ({ ...prev, isPaused: !prev.isPaused }));
    };

    const stopNavigation = () => {
        setNavigation(prev => ({
            ...prev,
            isNavigating: false,
            isPaused: false,
            currentStep: 0,
        }));

        if (mapRef.current && routeCoordinates.length > 0) {
            mapRef.current.animateCamera({ pitch: 0 }, { duration: 500 });
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(routeCoordinates, {
                    edgePadding: { top: 120, right: 80, bottom: 400, left: 80 },
                    animated: true,
                });
            }, 500);
        }

        Alert.alert('Navigation Stopped', 'Navigation session ended.');
    };

    const recalculateRoute = async () => {
        if (userLocation) {
            await calculateRoute(userLocation);
            Alert.alert('Route Updated', 'The route has been recalculated.');
        }
    };

    const getCurrentStep = (): RouteStep | null => {
        return routeData?.legs[0]?.steps[navigation.currentStep] || null;
    };

    const getTravelInfo = () => {
        if (!routeData?.legs[0]) {
            return {
                distance: '-- km',
                duration: '-- mins',
                arrivalTime: '--:--'
            };
        }

        const leg = routeData.legs[0];
        const now = new Date();
        const arrivalTime = new Date(now.getTime() + leg.duration.value * 1000);

        return {
            distance: leg.distance.text,
            duration: leg.duration.text,
            arrivalTime: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
    };

    if (isLoading || !userLocation) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Calculating best route...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const travelInfo = getTravelInfo();
    const currentStep = getCurrentStep();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.stationAddress} numberOfLines={1}>
                        {station.address}
                    </Text>
                </View>

                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* Map Section */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={true}
                    showsTraffic={false}
                    showsScale={true}
                    rotateEnabled={true}
                    pitchEnabled={true}
                    mapPadding={{
                        top: 0,
                        right: 0,
                        bottom: 100,
                        left: 0
                    }}
                >
                    {/* Start Point Marker - Always visible */}
                    {startLocation && (
                        <Marker
                            coordinate={startLocation}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={false}
                            title="Start"
                            description="Your starting location"
                            zIndex={100}
                        >
                            <View style={styles.startPointMarker}>
                                <Ionicons name="location" size={20} color="#fff" />
                            </View>
                        </Marker>
                    )}

                    {/* User Location Marker (Current position) */}
                    {userLocation && <UserLocationMarker
                        coordinate={userLocation}
                        heading={navigation.isNavigating ? smoothedHeading : undefined}
                    />}
                    
                    {/* Moving Arrow Indicator - Always visible when route exists */}
                    {movingArrowPosition && routeCoordinates.length > 0 && (
                        <Marker
                            coordinate={movingArrowPosition}
                            anchor={{ x: 0.5, y: 0.5 }}
                            flat={true}
                            tracksViewChanges={false}
                            title="Direction"
                            description="Follow this route"
                            zIndex={50}
                        >
                            <View style={styles.movingArrowContainer}>
                                <Ionicons
                                    name="arrow-up"
                                    size={24}
                                    color={COLORS.primary}
                                    style={{
                                        transform: [{ rotate: `${movingArrowHeading}deg` }]
                                    }}
                                />
                            </View>
                        </Marker>
                    )}

                    {/* Destination Marker with Enhanced Pin */}
                    <Marker
                        coordinate={{
                            latitude: station.latitude,
                            longitude: station.longitude,
                        }}
                        title={station.name}
                        description={`${station.type} • ${station.power}kW • ${station.status}`}
                        anchor={{ x: 0.5, y: 1 }}
                        tracksViewChanges={false}
                        zIndex={10}
                    >
                        <View style={styles.destinationMarkerContainer}>
                            <View style={[
                                styles.stationMarker,
                                { backgroundColor: station.status === 'available' ? '#10b981' : '#ef4444' }
                            ]}>
                                <Ionicons name="flash" size={24} color="#fff" />
                            </View>
                            <View style={[
                                styles.markerPin,
                                { borderTopColor: station.status === 'available' ? '#10b981' : '#ef4444' }
                            ]} />
                        </View>
                    </Marker>

                    {/* Route Polyline */}
                    {routeCoordinates.length > 0 && (
                        <>
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="rgba(25, 103, 210, 0.2)"
                                strokeWidth={14}
                                lineCap="round"
                                lineJoin="round"
                                zIndex={1}
                            />
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="#1967D2"
                                strokeWidth={9}
                                lineCap="round"
                                lineJoin="round"
                                zIndex={2}
                            />
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="#4285F4"
                                strokeWidth={6}
                                lineCap="round"
                                lineJoin="round"
                                zIndex={3}
                            />
                        </>
                    )}
                </MapView>

                {/* Top Right Controls */}
                <View style={styles.topControls}>
                    <TouchableOpacity style={styles.mapControlButton} onPress={recenterOnUser}>
                        <Ionicons name="locate" size={20} color={COLORS.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.mapControlButton} onPress={recalculateRoute}>
                        <Ionicons name="refresh" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Bottom Travel Info Card */}
                <View style={styles.travelInfoCard}>
                    <View style={styles.travelInfoTop}>
                        <View style={styles.timeDistance}>
                            <Text style={styles.durationText}>{travelInfo.duration}</Text>
                            <Text style={styles.distanceText}>{travelInfo.distance}</Text>
                        </View>
                        <View style={styles.arrivalInfo}>
                            <Ionicons name="time-outline" size={16} color="#64748b" />
                            <Text style={styles.arrivalText}>Arrive at {travelInfo.arrivalTime}</Text>
                        </View>
                    </View>

                    {/* Navigation Control */}
                    <View style={styles.navigationControl}>
                        {!navigation.isNavigating ? (
                            <TouchableOpacity
                                style={styles.startButton}
                                onPress={startNavigation}
                                activeOpacity={0.8}
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
                                    onPress={pauseNavigation}
                                >
                                    <Ionicons
                                        name={navigation.isPaused ? "play" : "pause"}
                                        size={20}
                                        color="#fff"
                                    />
                                    <Text style={styles.navButtonText}>
                                        {navigation.isPaused ? "Resume" : "Pause"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.navButton, styles.stopButton]}
                                    onPress={stopNavigation}
                                >
                                    <Ionicons name="close" size={20} color="#fff" />
                                    <Text style={styles.navButtonText}>Stop</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Bottom Route Steps Sheet */}
            <View style={styles.bottomSheet}>
                <View style={styles.bottomSheetHandle}>
                    <View style={styles.dragHandle} />
                </View>

                <ScrollView
                    style={styles.stepsContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.stepsContent}
                >
                    {navigation.isNavigating && currentStep && (
                        <View style={styles.currentStep}>
                            <View style={styles.currentStepHeader}>
                                <Ionicons
                                    name={NavigationService.getManeuverIcon(currentStep.maneuver) as any}
                                    size={22}
                                    color={COLORS.primary}
                                />
                                <Text style={styles.currentStepTitle}>
                                    {NavigationService.formatInstructions(currentStep.html_instructions)}
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
                        {routeData?.legs[0]?.steps.map((step, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.stepItem,
                                    index === navigation.currentStep && styles.activeStepItem
                                ]}
                            >
                                <View style={styles.stepIndicator}>
                                    <View style={[
                                        styles.stepDot,
                                        index === navigation.currentStep && styles.activeStepDot
                                    ]}>
                                        <Ionicons
                                            name={NavigationService.getManeuverIcon(step.maneuver) as any}
                                            size={12}
                                            color="#fff"
                                        />
                                    </View>
                                    {index < routeData.legs[0].steps.length - 1 && (
                                        <View style={styles.stepLine} />
                                    )}
                                </View>

                                <View style={styles.stepContent}>
                                    <Text style={[
                                        styles.stepInstruction,
                                        index === navigation.currentStep && styles.activeStepInstruction
                                    ]}>
                                        {NavigationService.formatInstructions(step.html_instructions)}
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
            </View>
        </SafeAreaView>
    );
}

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
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    userMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 2,
    },
    userMarkerPulse: {
        position: 'absolute',
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
        zIndex: 1,
    },
    startPointMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    movingArrowContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
        elevation: 5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    destinationMarkerContainer: {
        alignItems: 'center',
    },
    markerPin: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 15,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#10b981',
        marginTop: -1,
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
    travelInfoCard: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
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
        justifyContent: 'space-between',
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
    stationMarker: {
        padding: 14,
        borderRadius: 28,
        borderWidth: 4,
        borderColor: '#fff',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    bottomSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.4,
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
    dragHandle: {
        width: 44,
        height: 5,
        backgroundColor: '#cbd5e1',
        borderRadius: 3,
    },
    stepsContainer: {
        flex: 1,
    },
    stepsContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
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
});