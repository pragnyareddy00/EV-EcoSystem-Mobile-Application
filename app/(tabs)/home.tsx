import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { Station } from '../../constants/stations';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Utility functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return '#10b981';
    case 'busy': return '#f59e0b';
    default: return '#ef4444';
  }
};

const getStatusBackgroundColor = (status: string) => {
  switch (status) {
    case 'available': return '#dcfce7';
    case 'busy': return '#fef3c7';
    default: return '#fee2e2';
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'available': return '#059669';
    case 'busy': return '#d97706';
    default: return '#dc2626';
  }
};

const getStationIconName = (type: string) => {
  const typeLower = type?.toLowerCase() || '';
  if (typeLower.includes('fast') || typeLower.includes('dc')) return 'flash';
  if (typeLower.includes('swap')) return 'repeat';
  if (typeLower.includes('tesla')) return 'car-sport';
  return 'battery-charging';
};

// Debounce hook for performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Station Detail Sheet Component
interface StationDetailSheetProps {
  station: Station | null;
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (station: Station) => void;
}

const StationDetailSheet = React.memo(({ station, isVisible, onClose, onNavigate }: StationDetailSheetProps) => {
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isVisible && station) {
      Animated.spring(slideAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnimation, {
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible, station]);

  if (!station) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity 
          style={styles.sheetBackdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnimation }] }
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />

          {/* Station Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={[
                styles.sheetStationIcon,
                { backgroundColor: getStatusBackgroundColor(station.status) }
              ]}>
                <Ionicons 
                  name={getStationIconName(station.type) as any}
                  size={24} 
                  color={getStatusColor(station.status)} 
                />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetStationName} numberOfLines={1}>
                  {station.name}
                </Text>
                <View style={[
                  styles.sheetStatusBadge,
                  { backgroundColor: getStatusBackgroundColor(station.status) }
                ]}>
                  <View style={[
                    styles.sheetStatusDot,
                    { backgroundColor: getStatusColor(station.status) }
                  ]} />
                  <Text style={[
                    styles.sheetStatusText,
                    { color: getStatusColor(station.status) }
                  ]}>
                    {station.status}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseButton}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Station Details */}
          <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {/* Address */}
            <View style={styles.sheetDetailItem}>
              <Ionicons name="location-outline" size={18} color="#64748b" />
              <Text style={styles.sheetDetailText}>{station.address}</Text>
            </View>

            {/* Power & Type */}
            <View style={styles.sheetDetailRow}>
              <View style={styles.sheetDetailItem}>
                <Ionicons name="flash-outline" size={18} color="#64748b" />
                <Text style={styles.sheetDetailText}>{station.power}kW</Text>
              </View>
              <View style={styles.sheetDetailItem}>
                <Ionicons name="hardware-chip-outline" size={18} color="#64748b" />
                <Text style={styles.sheetDetailText}>{station.type}</Text>
              </View>
            </View>

            {/* Distance */}
            {station.distance !== undefined && (
              <View style={styles.sheetDetailItem}>
                <Ionicons name="navigate-outline" size={18} color="#64748b" />
                <Text style={styles.sheetDetailText}>
                  {station.distance.toFixed(1)} km away
                </Text>
              </View>
            )}

            {/* Services */}
            {station.services && station.services.length > 0 && (
              <View style={styles.sheetServicesContainer}>
                <Text style={styles.sheetServicesTitle}>Available Services</Text>
                <View style={styles.sheetServices}>
                  {station.services.map((service, index) => (
                    <View key={index} style={styles.sheetServiceTag}>
                      <Text style={styles.sheetServiceText}>{service}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Navigation Button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[
                styles.sheetNavigateButton,
                station.status !== 'available' && styles.sheetNavigateButtonDisabled
              ]}
              onPress={() => {
                onNavigate(station);
                onClose();
              }}
              disabled={station.status === 'offline'}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.sheetNavigateText}>
                {station.status === 'offline' ? 'Station Offline' : 'Start Navigation'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, isLoading } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [visibleStations, setVisibleStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapHeight] = useState(new Animated.Value(0.60));
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [socModalVisible, setSocModalVisible] = useState(false);
  const [currentSoC, setCurrentSoC] = useState(85);
  const [tempSoC, setTempSoC] = useState('85');
  const [nearestStations, setNearestStations] = useState<Station[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isStationSheetVisible, setIsStationSheetVisible] = useState(false);

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!isLoading && userProfile && !userProfile.vehicle) {
      router.replace('/(tabs)/addVehicle');
    }
  }, [userProfile, isLoading]);

  // Enhanced location request with better error handling
  const requestLocation = useCallback(async () => {
    try {
      setPermissionError(false);
      setLocationLoading(true);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError(true);
        setLocationLoading(false);
        return;
      }

      // Get current location with timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const currentLocation = await locationPromise;
      
      if (!currentLocation) {
        throw new Error('Unable to get location');
      }

      const initialRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      
      setRegion(initialRegion);
      setLocationLoading(false);
    } catch (error) {
      console.error('Location error:', error);
      setPermissionError(true);
      setLocationLoading(false);
      
      // Fallback to default region if location fails
      setRegion({
        latitude: 37.7749, // Default to San Francisco
        longitude: -122.4194,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, []);

  // Enhanced stations loading with caching and error handling
  const loadStations = useCallback(async () => {
    try {
      console.log('🔄 Loading stations from Firestore...');
      
      const stationsSnapshot = await getDocs(collection(db, 'stations'));
      const stationsData = stationsSnapshot.docs
        .map(doc => {
          try {
            const data = doc.data();
            const id = doc.id;
            
            // Enhanced validation
            if (!data || typeof data !== 'object') {
              console.warn('❌ Invalid station data format:', doc.id);
              return null;
            }

            const rawLat = data.latitude;
            const rawLon = data.longitude;
            const rawName = data.name;
            const rawAddress = data.address;
            const rawPower = data.power;
            const rawStatus = data.status;
            const rawType = data.type;
            const rawServices = data.services;
            const rawIsAvailable = data.isAvailable;
            const rawConnectorType = data.connectorType;
            const rawPrice = data.price;
            const rawRating = data.rating;
            
            // Check if coordinates exist and are valid
            if (rawLat === undefined || rawLon === undefined || 
                rawLat === null || rawLon === null) {
              console.warn('❌ Station missing coordinates:', doc.id);
              return null;
            }

            // Parse coordinates with enhanced validation
            const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
            const lon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);

            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
              console.warn('❌ Station has invalid coordinates:', doc.id, lat, lon);
              return null;
            }

            // Enhanced status determination
            const status = rawStatus || 
                         (rawIsAvailable !== undefined ? (rawIsAvailable ? 'available' : 'unavailable') : 'unknown');
            
            const type = rawType || rawConnectorType || 'standard';

            return {
              id: id,
              name: rawName?.trim() || 'Unknown Station',
              address: rawAddress?.trim() || 'Address not available',
              latitude: lat,
              longitude: lon,
              power: parseInt(rawPower, 10) || 0,
              status: status,
              type: type,
              services: Array.isArray(rawServices) ? rawServices : [],
              isAvailable: rawIsAvailable || false,
              connectorType: rawConnectorType || 'Unknown',
              city: data.city || '',
              state: data.state || '',
              distance: 0 // Will be calculated later
            } as Station;

          } catch (error) {
            console.error('❌ Error processing station:', doc.id, error);
            return null;
          }
        })
        .filter((station): station is Station => station !== null);

      console.log(`✅ Loaded ${stationsData.length} valid stations out of ${stationsSnapshot.docs.length}`);
      
      if (stationsData.length === 0) {
        console.warn('⚠️ No valid stations found in database');
      }

      setStations(stationsData);
      return stationsData;
    } catch (error) {
      console.error('❌ Error loading stations:', error);
      Alert.alert(
        'Connection Error', 
        'Unable to load charging stations. Please check your connection and try again.',
        [{ text: 'Retry', onPress: loadStations }]
      );
      setStations([]);
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    requestLocation();
    loadStations();
  }, []);

  // Enhanced search with debouncing
  useEffect(() => {
    if (debouncedSearchQuery.trim() === '') {
      setFilteredStations([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filtered = stations.filter(station =>
      station.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      station.address.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      station.type.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
    setFilteredStations(filtered);
  }, [debouncedSearchQuery, stations]);

  // Enhanced region and stations updates
  useEffect(() => {
    if (region && stations.length > 0) {
      const stationsWithDistance = findNearestStations({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      updateVisibleStations(region);
      setNearestStations(stationsWithDistance.slice(0, 5));
    }
  }, [region, stations]);

  // Enhanced distance calculation with validation
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return Infinity;
    }

    try {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    } catch (error) {
      console.error('Distance calculation error:', error);
      return Infinity;
    }
  }, []);

  const findNearestStations = useCallback((coords: { latitude: number, longitude: number }) => {
    return stations
      .map(station => ({
        ...station,
        distance: calculateDistance(coords.latitude, coords.longitude, station.latitude, station.longitude)
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [stations, calculateDistance]);

  const updateVisibleStations = useCallback((currentRegion: Region) => {
    if (!currentRegion) return;
    
    const visible = stations.filter(station => {
      const latDiff = Math.abs(station.latitude - currentRegion.latitude);
      const lonDiff = Math.abs(station.longitude - currentRegion.longitude);
      
      return latDiff < currentRegion.latitudeDelta / 2 && 
             lonDiff < currentRegion.longitudeDelta / 2;
    });
    
    setVisibleStations(visible);
  }, [stations]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Show station detail sheet
  const showStationSheet = useCallback((station: Station) => {
    if (!station || !station.id) {
      Alert.alert('Error', 'Invalid station data');
      return;
    }

    setSelectedStation(station);
    setIsStationSheetVisible(true);
  }, []);

  // Close station detail sheet
  const closeStationSheet = useCallback(() => {
    setIsStationSheetVisible(false);
    setTimeout(() => setSelectedStation(null), 300); // Delay clearing to allow animation
  }, []);

  // Enhanced station navigation with validation
  const navigateToStation = useCallback((station: Station) => {
    if (!station || !station.id) {
      Alert.alert('Error', 'Invalid station data');
      return;
    }

    if (
      typeof station.latitude !== 'number' ||
      typeof station.longitude !== 'number' ||
      isNaN(station.latitude) || isNaN(station.longitude) ||
      station.latitude < -90 || station.latitude > 90 ||
      station.longitude < -180 || station.longitude > 180
    ) {
      Alert.alert('Error', 'This station has invalid location data and cannot be used for navigation.');
      return;
    }

    router.push({
      pathname: '/(tabs)/routing',
      params: {
        id: station.id,
        name: station.name,
        latitude: station.latitude.toString(),
        longitude: station.longitude.toString(),
        address: station.address,
        type: station.type,
        power: station.power?.toString() || '0',
        status: station.status,
        distance: station.distance?.toFixed(1) || '0',
      }
    });
  }, [router]);

  const toggleMapSize = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newHeight = isMapExpanded ? 0.35 : 0.60;
    Animated.timing(mapHeight, {
      toValue: newHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsAnimating(false));
    setIsMapExpanded(!isMapExpanded);
  };

  // Enhanced SoC update with validation
  const updateSoC = () => {
    const newSoC = parseInt(tempSoC);
    if (!isNaN(newSoC) && newSoC >= 0 && newSoC <= 100) {
      setCurrentSoC(newSoC);
      setSocModalVisible(false);
      
      // Show confirmation
      Alert.alert('Success', `Battery level updated to ${newSoC}%`);
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid battery percentage between 0 and 100.');
    }
  };

  // Enhanced quick actions
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'findCharger':
        if (nearestStations.length > 0) {
          navigateToStation(nearestStations[0]);
        } else {
          Alert.alert('No Stations', 'No charging stations found nearby. Please try again later.');
        }
        break;
      case 'routePlan':
        router.push('/(tabs)/routing');
        break;
      case 'emergency':
        Alert.alert(
          'Emergency SOS',
          'This will contact emergency services and share your location with nearby assistance. Are you sure you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Call SOS', 
              style: 'destructive',
              onPress: () => {
                // In a real app, this would trigger emergency protocols
                Alert.alert('SOS Activated', 'Emergency services have been notified and help is on the way.');
              }
            }
          ]
        );
        break;
      case 'batterySwap':
        const swapStations = stations.filter(station => 
          station.type === 'swap' || station.services?.includes('battery_swap')
        );
        if (swapStations.length > 0) {
          const nearestSwap = findNearestStations({
            latitude: region?.latitude || 0,
            longitude: region?.longitude || 0
          }).find(station => swapStations.some(s => s.id === station.id));
          
          if (nearestSwap) {
            navigateToStation(nearestSwap);
          } else {
            navigateToStation(swapStations[0]);
          }
        } else {
          Alert.alert(
            'No Swap Stations', 
            'No battery swap stations found nearby. Try searching for fast charging stations instead.',
            [{ text: 'Find Fast Chargers', onPress: () => handleQuickAction('findCharger') }]
          );
        }
        break;
    }
  }, [nearestStations, stations, region, navigateToStation, router]);

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    updateVisibleStations(newRegion);
  }, [updateVisibleStations]);

  // Enhanced SoC color and status
  const getSoCColor = useCallback(() => {
    if (currentSoC > 60) return '#10b981'; // Green
    if (currentSoC > 30) return '#f59e0b'; // Amber
    if (currentSoC > 15) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }, [currentSoC]);

  const getSoCStatus = useCallback(() => {
    if (currentSoC > 80) return 'Excellent';
    if (currentSoC > 60) return 'Good';
    if (currentSoC > 30) return 'Moderate';
    if (currentSoC > 15) return 'Low';
    return 'Critical';
  }, [currentSoC]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([requestLocation(), loadStations()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [requestLocation, loadStations]);

  // Enhanced permission error handling
  if (permissionError && !region) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="location-outline" size={64} color="#94a3b8" />
        </View>
        <Text style={styles.errorTitle}>Location Access Required</Text>
        <Text style={styles.errorText}>
          To provide the best EV experience, we need access to your location to show nearby charging stations and plan your routes efficiently.
        </Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={requestLocation}>
            <Ionicons name="location" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.retryText}>Enable Location</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setRegion({
              latitude: 37.7749,
              longitude: -122.4194,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            })}
          >
            <Text style={styles.secondaryButtonText}>Use Default Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading || locationLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your EV dashboard...</Text>
      </View>
    );
  }

  if (!userProfile?.vehicle) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="car-outline" size={64} color="#94a3b8" />
        </View>
        <Text style={styles.errorTitle}>Vehicle Required</Text>
        <Text style={styles.errorText}>
          Please add your vehicle information to personalize your charging experience.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => router.push('/(tabs)/addVehicle')}
        >
          <Ionicons name="add" size={18} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.retryText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Section */}
      <Animated.View style={[styles.mapContainer, { flex: mapHeight }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region || undefined}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={true}
          toolbarEnabled={false}
        >
          {visibleStations.map(station => {
            if (typeof station.latitude !== 'number' || typeof station.longitude !== 'number' ||
                isNaN(station.latitude) || isNaN(station.longitude)) {
              return null;
            }

            return (
              <Marker
                key={station.id}
                coordinate={{
                  latitude: station.latitude,
                  longitude: station.longitude
                }}
                title={station.name}
                description={`${station.type} • ${station.power}kW • ${station.status}`}
                onPress={() => showStationSheet(station)}
              >
                <View style={[
                  styles.markerContainer,
                  { backgroundColor: getStatusColor(station.status) }
                ]}>
                  <Ionicons
                    name={getStationIconName(station.type) as any}
                    size={16}
                    color="#ffffff"
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Enhanced Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stations by name, address, or type..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#94a3b8"
              clearButtonMode="while-editing"
            />
          </View>
          
          {isSearching && (
            <View style={styles.searchResults}>
              {(
                filteredStations.length > 0 ? (
                  filteredStations.slice(0, 5).map(station => (
                    <TouchableOpacity
                      key={station.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        showStationSheet(station);
                        setIsSearching(false);
                        setSearchQuery('');
                      }}
                    >
                      <View style={styles.searchResultLeft}>
                        <View style={[
                          styles.searchResultIcon, 
                          { backgroundColor: getStatusBackgroundColor(station.status) }
                        ]}>
                          <Ionicons 
                            name={getStationIconName(station.type) as any}
                            size={14} 
                            color={getStatusColor(station.status)} 
                          />
                        </View>
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{station.name}</Text>
                          <Text style={styles.searchResultAddress} numberOfLines={1}>
                            {station.address}
                          </Text>
                          <Text style={styles.searchResultMeta}>
                            {station.power}kW • {station.type} • {station.distance?.toFixed(1)}km
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#64748b" />
                    </TouchableOpacity>
                  ))
                ) : debouncedSearchQuery.trim() !== '' ? (
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={32} color="#cbd5e1" />
                    <Text style={styles.noResultsText}>No stations found</Text>
                    <Text style={styles.noResultsSubtext}>
                      Try different search terms or check your spelling
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          )}
        </View>

        {/* Enhanced SoC Indicator */}
        <TouchableOpacity
          style={styles.socContainer}
          onPress={() => setSocModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.socCard, { borderLeftColor: getSoCColor() }]}>
            <View style={styles.socTop}>
              <Ionicons name="battery-charging" size={16} color={getSoCColor()} />
              <Text style={[styles.socValue, { color: getSoCColor() }]}>{currentSoC}%</Text>
            </View>
            <Text style={styles.socRange}>
              ~{Math.round(currentSoC * ((userProfile.vehicle.realWorldRangeKm / 100) || 4.2))}km
            </Text>
            <Text style={styles.socStatus}>{getSoCStatus()}</Text>
          </View>
        </TouchableOpacity>

        {/* Enhanced Map Toggle */}
        <TouchableOpacity 
          style={styles.mapToggle} 
          onPress={toggleMapSize} 
          activeOpacity={0.7}
          disabled={isAnimating}
        >
          <Ionicons
            name={isMapExpanded ? 'chevron-down' : 'chevron-up'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Location Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshLocationButton}
          onPress={requestLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Content Section */}
      <Animated.View style={[styles.bottomContainer, {
          flex: mapHeight.interpolate({
            inputRange: [0.35, 0.60],
            outputRange: [0.65, 0.40]
          })
      }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Enhanced Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>
                Hello, {userProfile.username || 'Driver'}! 👋
              </Text>
              <View style={styles.carInfo}>
                <Ionicons name="car-sport" size={12} color="#64748b" />
                <Text style={styles.carText}>
                  {userProfile.vehicle.batteryCapacityKWh || 'Unknown'} kWh
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.profileAvatar}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Enhanced Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              {[
                { key: 'findCharger', label: 'Find Charger', icon: 'flash', color: '#10b981' },
                { key: 'routePlan', label: 'Route Plan', icon: 'navigate', color: '#3b82f6' },
                { key: 'batterySwap', label: 'Battery Swap', icon: 'repeat', color: '#8b5cf6' },
                { key: 'emergency', label: 'Emergency', icon: 'warning', color: '#ef4444' },
              ].map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={styles.actionButton}
                  onPress={() => {
                    // Route immediately to SOS screen for emergency quick access
                    if (action.key === 'emergency') {
                      router.push('/(tabs)/sos');
                      return;
                    }

                    handleQuickAction(action.key);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon as any} size={20} color="#fff" />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Enhanced Stations List */}
          <View style={styles.nearestStations}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Nearby Stations</Text>
                <Text style={styles.sectionSubtitle}>
                  {stations.length > 0 ? `${stations.length} stations available` : 'Loading stations...'}
                </Text>
              </View>
              <TouchableOpacity onPress={loadStations}>
                <Ionicons name="refresh" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {stations.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading stations...</Text>
              </View>
            ) : nearestStations.length > 0 ? (
              nearestStations.slice(0, 3).map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[
                    styles.stationCard,
                    { borderLeftColor: getStatusColor(station.status) }
                  ]}
                  onPress={() => showStationSheet(station)}
                  activeOpacity={0.7}
                >
                  <View style={styles.stationLeft}>
                    <View style={[
                      styles.stationIconContainer,
                      { backgroundColor: getStatusBackgroundColor(station.status) }
                    ]}>
                      <Ionicons 
                        name={getStationIconName(station.type) as any}
                        size={20} 
                        color={getStatusColor(station.status)} 
                      />
                    </View>
                    <View style={styles.stationInfo}>
                      <Text style={styles.stationName}>{station.name}</Text>
                      <Text style={styles.stationAddress} numberOfLines={1}>
                        {station.address}
                      </Text>
                      <View style={styles.stationTags}>
                        <Text style={styles.stationTag}>{station.power}kW</Text>
                        <Text style={styles.stationTag}>{station.type}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.stationRight}>
                    <Text style={styles.stationDistance}>
                      {station.distance?.toFixed(1)} km
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBackgroundColor(station.status) }
                    ]}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(station.status) }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        { color: getStatusTextColor(station.status) }
                      ]}>
                        {station.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stationArrow}>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noStationsContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
                <Text style={styles.noStationsText}>No stations found nearby</Text>
                <Text style={styles.noStationsSubtext}>
                  Try moving to a different location or check back later
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>

      {/* Enhanced SoC Modal */}
      <Modal
        visible={socModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Battery Level</Text>
                <Text style={styles.modalSubtitle}>
                  Current: {currentSoC}% • {getSoCStatus()}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSocModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.socInputWrapper}>
              <View style={styles.socInputContainer}>
                <TextInput
                  style={styles.socInput}
                  value={tempSoC}
                  onChangeText={setTempSoC}
                  keyboardType="numeric"
                  placeholder="85"
                  maxLength={3}
                  placeholderTextColor="#cbd5e1"
                  selectTextOnFocus
                />
                <Text style={styles.socUnit}>%</Text>
              </View>
              <Text style={styles.socInputHint}>Enter value between 0-100</Text>
            </View>

            <View style={styles.quickSocButtons}>
              {[25, 50, 75, 100].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickSocButton,
                    parseInt(tempSoC) === value && styles.quickSocButtonActive
                  ]}
                  onPress={() => setTempSoC(value.toString())}
                >
                  <Text style={[
                    styles.quickSocText,
                    parseInt(tempSoC) === value && styles.quickSocTextActive
                  ]}>
                    {value}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTempSoC(currentSoC.toString());
                  setSocModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={updateSoC}
              >
                <Ionicons name="checkmark" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Station Detail Sheet */}
      <StationDetailSheet
        station={selectedStation}
        isVisible={isStationSheetVisible}
        onClose={closeStationSheet}
        onNavigate={navigateToStation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapContainer: {
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomContainer: {
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  
  // Error States
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  
  // Enhanced Search
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  searchResults: {
    backgroundColor: '#fff',
    marginTop: 6,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    maxHeight: 280,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultText: {
    marginLeft: 10,
    flex: 1,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  searchResultMeta: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  noResultsSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },

  // Enhanced SoC
  socContainer: {
    position: 'absolute',
    top: 120,
    right: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  socCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    borderLeftWidth: 3,
  },
  socTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  socValue: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  socRange: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  socStatus: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Map Toggle
  mapToggle: {
    position: 'absolute',
    bottom: 20,
    right: 12,
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  // Refresh Location Button
  refreshLocationButton: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Enhanced Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  profileButton: {
    padding: 2,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },

  // Enhanced Quick Actions
  quickActions: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48.5%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },

  // Enhanced Stations
  nearestStations: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  stationCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  stationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stationTag: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  stationRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  stationDistance: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  stationArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStationsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noStationsText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  noStationsSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 16,
  },

  // Marker Styles
  markerContainer: {
    padding: 7,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // Enhanced Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  modalClose: {
    padding: 2,
  },
  socInputWrapper: {
    marginBottom: 16,
  },
  socInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  socInput: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    minWidth: 100,
  },
  socUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 6,
  },
  socInputHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  quickSocButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 6,
  },
  quickSocButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  quickSocButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickSocText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  quickSocTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Station Detail Sheet Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.75,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetStationIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetStationName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  sheetStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sheetStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sheetStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sheetContent: {
    flex: 1,
  },
  sheetDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetDetailText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  sheetServicesContainer: {
    paddingVertical: 16,
  },
  sheetServicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  sheetServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetServiceTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetServiceText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  sheetFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sheetNavigateButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    gap: 8,
  },
  sheetNavigateButtonDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
    shadowOpacity: 0,
  },
  sheetNavigateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});