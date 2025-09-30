import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { mockStations, Station } from '../../constants/stations';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, isLoading } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region | null>(null);
  const [visibleStations, setVisibleStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapHeight] = useState(new Animated.Value(0.7)); // 70% initially
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [socModalVisible, setSocModalVisible] = useState(false);
  const [currentSoC, setCurrentSoC] = useState(85); // Default 85%
  const [tempSoC, setTempSoC] = useState('85');
  const [nearestStations, setNearestStations] = useState<Station[]>([]);

  useEffect(() => {
    if (!isLoading && userProfile && !userProfile.vehicle) {
      router.replace('/(tabs)/addVehicle');
    }
  }, [userProfile, isLoading]);

  const requestLocation = async () => {
    setPermissionError(false);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError(true);
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    const initialRegion = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
    setRegion(initialRegion);
    updateVisibleStations(initialRegion);
    findNearestStations(currentLocation.coords);
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const findNearestStations = (coords: { latitude: number, longitude: number }) => {
    const stationsWithDistance = mockStations.map(station => ({
      ...station,
      distance: calculateDistance(coords.latitude, coords.longitude, station.latitude, station.longitude)
    }));
    
    const nearest = stationsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    
    setNearestStations(nearest);
  };

  const updateVisibleStations = (currentRegion: Region) => {
    if (!currentRegion) return;
    const visible = mockStations.filter(station =>
      station.latitude > currentRegion.latitude - currentRegion.latitudeDelta / 2 &&
      station.latitude < currentRegion.latitude + currentRegion.latitudeDelta / 2 &&
      station.longitude > currentRegion.longitude - currentRegion.longitudeDelta / 2 &&
      station.longitude < currentRegion.longitude + currentRegion.longitudeDelta / 2
    );
    setVisibleStations(visible);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredStations([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filtered = mockStations.filter(station =>
      station.name.toLowerCase().includes(query.toLowerCase()) ||
      station.address?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredStations(filtered);
  };

  const navigateToStation = (station: Station) => {
    if (mapRef.current) {
      const newRegion = {
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
      setSearchQuery('');
      setFilteredStations([]);
      setIsSearching(false);
    }
  };

  const toggleMapSize = () => {
    const newHeight = isMapExpanded ? 0.4 : 0.7;
    Animated.timing(mapHeight, {
      toValue: newHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsMapExpanded(!isMapExpanded);
  };

  const updateSoC = () => {
    const newSoC = parseInt(tempSoC);
    if (!isNaN(newSoC) && newSoC >= 0 && newSoC <= 100) {
      setCurrentSoC(newSoC);
      setSocModalVisible(false);
    } else {
      Alert.alert('Invalid SoC', 'Please enter a value between 0 and 100');
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'findCharger':
        if (nearestStations.length > 0) {
          navigateToStation(nearestStations[0]);
        }
        break;
      case 'routePlan':
        router.push('/(tabs)/routing');
        break;
      case 'emergency':
        Alert.alert(
          'Emergency SOS',
          'This will contact emergency services and nearby assistance. Continue?',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Call SOS', onPress: () => { Alert.alert('SOS Activated', 'Emergency services have been notified.'); }}]
        );
        break;
      case 'batterySwap':
        const swapStations = mockStations.filter(station => station.type === 'swap' || station.services?.includes('battery_swap'));
        if (swapStations.length > 0) {
          navigateToStation(swapStations[0]);
        } else {
          Alert.alert('No Swap Stations', 'No battery swap stations found nearby');
        }
        break;
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    updateVisibleStations(newRegion);
  };

  const getSoCColor = () => {
    if (currentSoC > 50) return COLORS.success || '#4CAF50';
    if (currentSoC > 20) return COLORS.warning || '#FF9800';
    return COLORS.error || '#f44336';
  };

  const getSoCStatus = () => {
    if (currentSoC > 80) return 'Excellent';
    if (currentSoC > 50) return 'Good';
    if (currentSoC > 20) return 'Low';
    return 'Critical';
  };

  if (permissionError) {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={60} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>Location permission is required to display the map.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocation}>
          <Text style={styles.retryText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading || !userProfile || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your EV dashboard...</Text>
      </View>
    );
  }

  if (!userProfile.vehicle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Setting up your profile...</Text>
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
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {visibleStations.map(station => (
            <Marker
              key={station.id}
              coordinate={{ latitude: station.latitude, longitude: station.longitude }}
              title={station.name}
              description={`${station.type} • ${station.power}kW`}
              identifier={station.id.toString()}
              onPress={() => {
                Alert.alert(
                  station.name,
                  `Type: ${station.type}\nPower: ${station.power}kW\nStatus: ${station.status}`,
                  [{ text: 'Cancel', style: 'cancel' }, { text: 'Navigate', onPress: () => navigateToStation(station) }]
                );
              }}
            >
              <View style={[
                styles.markerContainer,
                { backgroundColor: station.status === 'available' ? COLORS.success || '#4CAF50' : COLORS.error || '#f44336' }
              ]}>
                <Ionicons
                  name={(station.type === 'fast' ? 'flash' : station.type === 'swap' ? 'battery-charging' : 'plug') as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={COLORS.white}
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Floating Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search EV stations..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor={COLORS.textSecondary}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          {isSearching && (
            <View style={styles.searchResults}>
               {filteredStations.length > 0 ? (
                 filteredStations.slice(0, 5).map(station => (
                  <TouchableOpacity
                    key={station.id}
                    style={styles.searchResultItem}
                    onPress={() => navigateToStation(station)}
                  >
                    <View style={styles.searchResultLeft}>
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultName}>{station.name}</Text>
                        <Text style={styles.searchResultAddress} numberOfLines={1}>
                          {station.address || `${station.power}kW • ${station.type}`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ))
               ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No stations found.</Text>
                </View>
               )}
            </View>
          )}
        </View>

        {/* SoC Indicator */}
        <TouchableOpacity
          style={styles.socContainer}
          onPress={() => setSocModalVisible(true)}
        >
          <View style={styles.socHeader}>
            <Ionicons name="battery-charging" size={16} color={getSoCColor()} />
            <Text style={styles.socLabel}>SoC</Text>
          </View>
          <Text style={[styles.socValue, { color: getSoCColor() }]}>{currentSoC}%</Text>
          <Text style={styles.socStatus}>{getSoCStatus()}</Text>
        </TouchableOpacity>

        {/* Map Toggle Button */}
        <TouchableOpacity style={styles.mapToggle} onPress={toggleMapSize}>
          <Ionicons
            name={isMapExpanded ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Content Section */}
      <Animated.View style={[styles.bottomContainer, {
          flex: mapHeight.interpolate({
            inputRange: [0.4, 0.7],
            outputRange: [0.6, 0.3]
          })
      }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Welcome Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Hello, {userProfile.username}! ⚡</Text>
              <Text style={styles.carText}>
                {userProfile.vehicle.make} {userProfile.vehicle.model}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person-circle" size={32} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('findCharger')}
              >
                <View style={[styles.actionIcon, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="flash" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.actionLabel}>Find Charger</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('routePlan')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#2196F3' }]}>
                  <Ionicons name="navigate" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.actionLabel}>Route Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('batterySwap')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="swap-horizontal" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.actionLabel}>Battery Swap</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('emergency')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f44336' }]}>
                  <Ionicons name="warning" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.actionLabel}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nearest Stations */}
          <View style={styles.nearestStations}>
            <Text style={styles.sectionTitle}>Nearest Stations</Text>
            {nearestStations.slice(0, 3).map(station => (
              <TouchableOpacity
                key={station.id}
                style={styles.stationCard}
                onPress={() => navigateToStation(station)}
              >
                <View style={styles.stationLeft}>
                  <View style={[
                    styles.stationStatusDot,
                    { backgroundColor: station.status === 'available' ? '#4CAF50' : '#f44336' }
                  ]} />
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <Text style={styles.stationDetails}>
                      {station.power}kW • {station.type} • {station.distance?.toFixed(1)}km
                    </Text>
                  </View>
                </View>
                <View style={styles.stationRight}>
                  <Text style={styles.stationStatus}>{station.status}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Energy Insights */}
          <View style={styles.energyInsights}>
            <Text style={styles.sectionTitle}>Energy Insights</Text>
            <View style={styles.insightCard}>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Estimated Range</Text>
                <Text style={styles.insightValue}>{Math.round(currentSoC * 4.2)}km</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Nearest Charger</Text>
                <Text style={styles.insightValue}>
                  {nearestStations[0]?.distance?.toFixed(1)}km
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Charging Needed</Text>
                <Text style={[
                  styles.insightValue,
                  { color: currentSoC > 30 ? '#4CAF50' : '#f44336' }
                ]}>
                  {currentSoC > 30 ? 'Not Required' : 'Soon'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* SoC Modal */}
      <Modal
        visible={socModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update State of Charge</Text>
              <TouchableOpacity onPress={() => setSocModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.socInputContainer}>
              <TextInput
                style={styles.socInput}
                value={tempSoC}
                onChangeText={setTempSoC}
                keyboardType="numeric"
                placeholder="Enter SoC (0-100)"
                maxLength={3}
              />
              <Text style={styles.socUnit}>%</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSocModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={updateSoC}
              >
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomContainer: {
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Search Components
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  searchBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
  },
  searchResults: {
    backgroundColor: 'white',
    marginTop: 5,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  searchResultName: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchResultAddress: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noResults: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  noResultsText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },

  // SoC Components
  socContainer: {
    position: 'absolute',
    top: 130,
    right: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  socHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  socLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  socValue: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  socStatus: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Map Toggle
  mapToggle: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: 'white',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  welcomeText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  carText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },

  // Quick Actions
  quickActions: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Nearest Stations
  nearestStations: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  stationCard: {
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stationStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stationDetails: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stationRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationStatus: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
    textTransform: 'capitalize',
  },

  // Energy Insights
  energyInsights: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  insightCard: {
    backgroundColor: 'white',
    padding: SPACING.lg,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  insightLabel: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: FONTS.sizes.base,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // Marker Styles
  markerContainer: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.white,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // Error States
  errorText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    elevation: 2,
  },
  retryText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 300,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  socInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  socInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    textAlign: 'center',
  },
  socUnit: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
  },
});

